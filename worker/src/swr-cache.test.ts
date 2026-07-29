/**
 * Stale-while-revalidate behavior of cachedKVGet on the hot status path.
 *
 * Root cause being fixed: request-health showed heavy-tailed 6-20s responses
 * and deadline 504s on /api/status, /api/status/summary, /api/breaking,
 * /api/news, and the feeds. The handlers are trivial; the only cross-region
 * I/O is the KV read that runs synchronously on every Cache API miss or
 * expiry. The fix serves a stale cached entry immediately and refreshes KV
 * in the background (ctx.waitUntil), and bounds the cold-miss KV read so a
 * hung KV operation cannot ride the request into the 20s deadline 504.
 */
import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { makeEnv, call } from './test-harness';
import { installFakeCache, type InstalledCache } from './edge-cache-test-helpers';

const SERVICES_CACHE_URL = 'https://tensorfeed-kv-cache.internal/__kv_cache/services';
const CACHED_AT_HEADER = 'X-TF-Cached-At';

let fake: InstalledCache;
let ipCounter = 0;
const nextIp = () => `203.0.113.${(ipCounter++ % 200) + 10}`;

beforeEach(() => {
  fake = installFakeCache();
});
afterEach(() => {
  fake.uninstall();
});

async function ageCachedEntry(url: string, ageMs: number): Promise<void> {
  const req = new Request(url);
  const entry = await fake.cache.match(req);
  if (!entry) throw new Error(`no cache entry at ${url} to age`);
  const body = await entry.text();
  const headers = new Headers(entry.headers);
  headers.set(CACHED_AT_HEADER, String(Date.now() - ageMs));
  await fake.cache.put(req, new Response(body, { headers }));
}

describe('cachedKVGet stale-while-revalidate (/api/status)', () => {
  it('serves a fresh cache entry without re-reading KV', async () => {
    const env = await makeEnv();
    await env.TENSORFEED_STATUS.put('services', JSON.stringify([{ name: 'A' }]));
    const r1 = await call(env, '/api/status', { ip: nextIp(), settle: true });
    expect(r1.status).toBe(200);
    expect((r1.json?.services as Array<{ name: string }>)[0]?.name).toBe('A');

    // KV changes; the cached entry is still inside its logical TTL, so the
    // cached value keeps being served.
    await env.TENSORFEED_STATUS.put('services', JSON.stringify([{ name: 'B' }]));
    const r2 = await call(env, '/api/status', { ip: nextIp(), settle: true });
    expect((r2.json?.services as Array<{ name: string }>)[0]?.name).toBe('A');
  });

  it('serves a stale entry immediately and refreshes from KV in the background', async () => {
    const env = await makeEnv();
    await env.TENSORFEED_STATUS.put('services', JSON.stringify([{ name: 'A' }]));
    await call(env, '/api/status', { ip: nextIp(), settle: true });

    await env.TENSORFEED_STATUS.put('services', JSON.stringify([{ name: 'B' }]));
    // Age the entry past the 120s logical TTL for /api/status.
    await ageCachedEntry(SERVICES_CACHE_URL, 10 * 60 * 1000);

    // Stale hit: the OLD value is served on this request (no inline KV wait),
    // and settle() flushes the background revalidation.
    const stale = await call(env, '/api/status', { ip: nextIp(), settle: true });
    expect(stale.status).toBe(200);
    expect((stale.json?.services as Array<{ name: string }>)[0]?.name).toBe('A');

    // The background refresh has rewritten the cache: next request sees B.
    const fresh = await call(env, '/api/status', { ip: nextIp(), settle: true });
    expect((fresh.json?.services as Array<{ name: string }>)[0]?.name).toBe('B');
  });

  it('refuses to stale-serve a non-operational status and returns the fresh value', async () => {
    const env = await makeEnv();
    // Provider is down; the cached entry records that.
    await env.TENSORFEED_STATUS.put('services', JSON.stringify([{ name: 'Claude API', status: 'down' }]));
    const first = await call(env, '/api/status', { ip: nextIp(), settle: true });
    expect((first.json?.services as Array<{ status: string }>)[0]?.status).toBe('down');

    // Provider recovers in KV, and the cached entry ages past the 30s incident TTL.
    await env.TENSORFEED_STATUS.put('services', JSON.stringify([{ name: 'Claude API', status: 'operational' }]));
    await ageCachedEntry(SERVICES_CACHE_URL, 45 * 1000);

    // Under plain SWR this request would serve the stale "down". The incident
    // policy declines to stale-serve, so the recovery lands on THIS request.
    const recovered = await call(env, '/api/status', { ip: nextIp(), settle: true });
    expect(recovered.status).toBe(200);
    expect((recovered.json?.services as Array<{ status: string }>)[0]?.status).toBe('operational');
  });

  it('still stale-serves an all-operational status (the cheap direction to be wrong)', async () => {
    const env = await makeEnv();
    await env.TENSORFEED_STATUS.put('services', JSON.stringify([{ name: 'Claude API', status: 'operational' }]));
    await call(env, '/api/status', { ip: nextIp(), settle: true });

    await env.TENSORFEED_STATUS.put('services', JSON.stringify([{ name: 'Claude API', status: 'down' }]));
    // Past the 120s operational TTL but the payload is all-clear, so SWR applies.
    await ageCachedEntry(SERVICES_CACHE_URL, 10 * 60 * 1000);

    const stale = await call(env, '/api/status', { ip: nextIp(), settle: true });
    expect((stale.json?.services as Array<{ status: string }>)[0]?.status).toBe('operational');
    const fresh = await call(env, '/api/status', { ip: nextIp(), settle: true });
    expect((fresh.json?.services as Array<{ status: string }>)[0]?.status).toBe('down');
  });

  it('holds a non-operational entry fresh for the full 30s incident TTL', async () => {
    const env = await makeEnv();
    await env.TENSORFEED_STATUS.put('services', JSON.stringify([{ name: 'Claude API', status: 'down' }]));
    await call(env, '/api/status', { ip: nextIp(), settle: true });

    await env.TENSORFEED_STATUS.put('services', JSON.stringify([{ name: 'Claude API', status: 'operational' }]));
    // Inside 30s: still fresh, no KV re-read, cached value served.
    await ageCachedEntry(SERVICES_CACHE_URL, 10 * 1000);
    const held = await call(env, '/api/status', { ip: nextIp(), settle: true });
    expect((held.json?.services as Array<{ status: string }>)[0]?.status).toBe('down');
  });

  // These two live in separate `it` blocks on purpose: the fake Cache API entry
  // is keyed by KV key name alone, so a second makeEnv() inside one test would
  // hit the first env's cached payload instead of its own KV.
  it('tightens response max-age during an incident', async () => {
    const env = await makeEnv();
    await env.TENSORFEED_STATUS.put('services', JSON.stringify([{ name: 'Claude API', status: 'down' }]));
    const incident = await call(env, '/api/status', { ip: nextIp(), settle: true });
    expect(incident.headers.get('Cache-Control')).toBe('public, max-age=30');
  });

  it('leaves response max-age relaxed when all clear', async () => {
    const env = await makeEnv();
    await env.TENSORFEED_STATUS.put('services', JSON.stringify([{ name: 'Claude API', status: 'operational' }]));
    const ok = await call(env, '/api/status', { ip: nextIp(), settle: true });
    expect(ok.headers.get('Cache-Control')).toBe('public, max-age=120');
  });

  it('treats unknown as all-clear so unreadable status pages do not pin the fast cadence', async () => {
    const env = await makeEnv();
    // status.x.ai is Cloudflare-gated and sits at 'unknown' indefinitely.
    await env.TENSORFEED_STATUS.put('services', JSON.stringify([{ name: 'xAI API', status: 'unknown' }]));
    const res = await call(env, '/api/status', { ip: nextIp(), settle: true });
    expect(res.headers.get('Cache-Control')).toBe('public, max-age=120');
  });

  it('falls back to the stale value when the forced KV re-read times out', async () => {
    const env = await makeEnv();
    await env.TENSORFEED_STATUS.put('services', JSON.stringify([{ name: 'Claude API', status: 'down' }]));
    await call(env, '/api/status', { ip: nextIp(), settle: true });
    await ageCachedEntry(SERVICES_CACHE_URL, 45 * 1000);

    // The policy refuses to stale-serve, so it falls through to an inline KV
    // read. That read now hangs. Declining to stale-serve must never blank the
    // response: the stale value is the fallback.
    env.TENSORFEED_STATUS.get = (() => new Promise(() => undefined)) as typeof env.TENSORFEED_STATUS.get;
    env.KV_READ_TIMEOUT_MS = '100';
    env.REQUEST_DEADLINE_MS = '2000';

    const res = await call(env, '/api/status', { ip: nextIp() });
    expect(res.status).toBe(200);
    expect((res.json?.services as Array<{ status: string }>)[0]?.status).toBe('down');
  });

  it('bounds a hung KV read on a cold miss instead of riding to the deadline 504', async () => {
    const env = await makeEnv();
    // Cold cache + a KV namespace whose read never resolves.
    env.TENSORFEED_STATUS.get = (() => new Promise(() => undefined)) as typeof env.TENSORFEED_STATUS.get;
    env.KV_READ_TIMEOUT_MS = '100';
    // Keep the request deadline tight so a regression fails fast as a 504
    // rather than hanging the test for 20 seconds.
    env.REQUEST_DEADLINE_MS = '2000';

    const res = await call(env, '/api/status', { ip: nextIp() });
    expect(res.status).toBe(200);
    expect(res.json?.services).toEqual([]);
  });
});
