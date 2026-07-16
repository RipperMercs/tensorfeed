/**
 * Retention flywheel activation (2026-07-15).
 *
 * The whats-new delta cursor (free `?since=<cursor>` unchanged-poll) shipped
 * 2026-07-06 (base) and 2026-07-07 (pro) and is live, but it was invisible
 * before payment: nothing in the 402 challenge told a returning agent the free
 * poll exists, so an agent only discovered it after paying once and noticing
 * the `poll` continuation in the response. This pins the advertisement: the
 * unpaid 402 for a cursor-enabled endpoint carries a `returning` hint naming
 * the `since` param, and endpoints without the mechanic do not.
 *
 * No billing behavior changes here; the cursor money-path is unchanged.
 */
import { describe, it, expect } from 'vitest';
import { pollHintFor } from './payments';
import { makeEnv, call } from './test-harness';

let seq = 0;
function uniqueIp(): string {
  seq += 1;
  return `198.51.100.${(seq % 250) + 1}`;
}

describe('pollHintFor', () => {
  it('returns the since poll hint for the whats-new base and pro paths', () => {
    expect(pollHintFor('/api/premium/whats-new')?.param).toBe('since');
    expect(pollHintFor('/api/premium/whats-new/pro')?.param).toBe('since');
  });

  it('carries a non-empty benefit and how string', () => {
    const hint = pollHintFor('/api/premium/whats-new');
    expect(hint).toBeDefined();
    expect((hint?.benefit ?? '').length).toBeGreaterThan(0);
    expect((hint?.how ?? '').length).toBeGreaterThan(0);
  });

  it('returns undefined for an endpoint without the cursor mechanic', () => {
    expect(pollHintFor('/api/premium/route-verdict')).toBeUndefined();
    expect(pollHintFor('/api/premium/whats-new-not-a-real-path')).toBeUndefined();
  });
});

describe('retention flywheel is advertised on the unpaid 402', () => {
  it('whats-new 402 body carries the since poll hint', async () => {
    const env = await makeEnv();
    const res = await call(env, '/api/premium/whats-new', { ip: uniqueIp() });
    expect(res.status).toBe(402);
    const r = res.json?.returning as Record<string, unknown> | undefined;
    expect(r).toBeDefined();
    expect(r?.param).toBe('since');
    expect(typeof r?.benefit).toBe('string');
  });

  it('whats-new/pro 402 body carries the since poll hint', async () => {
    const env = await makeEnv();
    const res = await call(env, '/api/premium/whats-new/pro', { ip: uniqueIp() });
    expect(res.status).toBe(402);
    expect((res.json?.returning as Record<string, unknown> | undefined)?.param).toBe('since');
  });

  it('an endpoint without the cursor mechanic has no returning hint on its 402', async () => {
    const env = await makeEnv();
    const res = await call(env, '/api/premium/route-verdict', { ip: uniqueIp() });
    expect(res.status).toBe(402);
    expect(res.json?.returning ?? null).toBeNull();
  });
});
