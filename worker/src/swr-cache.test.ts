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
