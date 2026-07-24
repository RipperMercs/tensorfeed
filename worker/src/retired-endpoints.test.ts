/**
 * Retired-endpoint and not-found response contract.
 *
 * Context (2026-07-24): /api/premium/ai-crypto-pulse was removed weeks earlier
 * for an upstream redistribution restriction, but live agent traffic was still
 * polling it and receiving a bare `{"error":"Not found"}` 404. That is a
 * retention leak, not a cosmetic one: an agent has no way to tell "this moved"
 * from "this is permanently gone", so it keeps burning calls or drops the
 * publisher entirely. These tests lock in the two fixes.
 *
 * Narrowing note: the harness types `res.json` as `Record<string, unknown> |
 * null`, so assertions use optional chaining (`res.json?.x`) to match the
 * pattern in index.integration.test.ts and stay clean under `tsc --noEmit`.
 */

import { describe, it, expect } from 'vitest';
import { makeEnv, call } from './test-harness';

let seq = 0;
function uniqueIp(): string {
  seq += 1;
  // 198.51.100.0/24 is TEST-NET-2 (RFC 5737), safe for synthetic IPs.
  return `198.51.100.${(seq % 250) + 1}`;
}

describe('retired endpoints return 410 Gone, not 404', () => {
  it('answers a retired premium endpoint with 410 and a migration path', async () => {
    const env = await makeEnv();
    const res = await call(env, '/api/premium/ai-crypto-pulse', { ip: uniqueIp() });

    // 410 is the load-bearing assertion: it tells a well-behaved agent to stop
    // polling, which a 404 (possibly transient) does not.
    expect(res.status).toBe(410);
    expect(res.json).not.toBeNull();
    expect(res.json?.error).toBe('endpoint_retired');
    expect(res.json?.permanent).toBe(true);
    expect(res.json?.stop_polling).toBe(true);

    // The agent must be able to self-heal without a human reading a changelog.
    expect(Array.isArray(res.json?.alternatives)).toBe(true);
    expect((res.json?.alternatives as string[]).length).toBeGreaterThan(0);
    expect(res.json?.reason).toBeTruthy();
    expect(res.json?.retired_on).toBe('2026-07-21');
    expect(res.json?.catalog).toBe('/api/meta');
  });

  it('does not charge or issue a payment challenge for a retired endpoint', async () => {
    const env = await makeEnv();
    const res = await call(env, '/api/premium/ai-crypto-pulse', { ip: uniqueIp() });

    // A retired path must never look billable. 402 here would invite an agent
    // to pay for something that cannot be served, which the AFTA no-charge
    // guarantees exist to prevent.
    expect(res.status).not.toBe(402);
    expect(res.status).toBe(410);
  });
});

describe('generic 404 hands agents the real catalog', () => {
  it('points at /api/meta rather than a short hand-kept endpoint list', async () => {
    const env = await makeEnv();
    const res = await call(env, '/api/definitely-not-a-real-endpoint', { ip: uniqueIp() });

    expect(res.status).toBe(404);
    expect(res.json).not.toBeNull();
    expect(res.json?.error).toBe('not_found');
    // The catalog pointers are the whole point: TensorFeed serves 350+
    // endpoints, so enumerating a fraction of them in the 404 body is worse
    // than linking the machine-readable index.
    expect(res.json?.catalog).toBe('/api/meta');
    expect(res.json?.premium_catalog).toBe('/api/meta/premium');
    expect(String(res.json?.llms_txt)).toContain('llms.txt');
    expect(Array.isArray(res.json?.popular_endpoints)).toBe(true);
  });

  it('echoes the requested path so an agent can log what it got wrong', async () => {
    const env = await makeEnv();
    const res = await call(env, '/api/nope', { ip: uniqueIp() });

    expect(res.status).toBe(404);
    expect(res.json?.resource).toBe('/api/nope');
  });
});
