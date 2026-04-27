/**
 * Pure-logic tests for the per-token usage helpers.
 *
 * Covers logPremiumUsage's per-token write path and getTokenUsage's
 * aggregation. The site-wide rollup behavior is exercised indirectly by
 * existing integration; here we focus on what the /account dashboard
 * relies on.
 */

import { describe, it, expect } from 'vitest';
import { logPremiumUsage, getTokenUsage } from './payments';
import type { Env } from './types';

interface MockKV {
  get: (key: string, type?: string) => Promise<unknown>;
  put: (key: string, value: string) => Promise<void>;
  delete: () => Promise<void>;
  list: () => Promise<{ keys: { name: string }[] }>;
}

function makeKV(initial: Record<string, unknown> = {}): MockKV {
  const store = new Map<string, unknown>(Object.entries(initial));
  return {
    get: async (key: string) => store.get(key) ?? null,
    put: async (key: string, value: string) => {
      try {
        store.set(key, JSON.parse(value));
      } catch {
        store.set(key, value);
      }
    },
    delete: async () => undefined,
    list: async () => ({
      keys: Array.from(store.keys()).map(name => ({ name })),
    }),
  };
}

function makeEnv(seed: Record<string, unknown> = {}): Env {
  return {
    TENSORFEED_NEWS: makeKV() as unknown as KVNamespace,
    TENSORFEED_STATUS: makeKV() as unknown as KVNamespace,
    TENSORFEED_CACHE: makeKV(seed) as unknown as KVNamespace,
    ENVIRONMENT: 'test',
    SITE_URL: 'https://tensorfeed.ai',
    INDEXNOW_KEY: '',
    X_API_KEY: '',
    X_API_SECRET: '',
    X_ACCESS_TOKEN: '',
    X_ACCESS_SECRET: '',
    GITHUB_TOKEN: '',
    RESEND_API_KEY: '',
    ALERT_EMAIL_TO: '',
    ALERT_EMAIL_FROM: '',
    PAYMENT_WALLET: '0x0',
    PAYMENT_ENABLED: 'true',
  };
}

const FIXTURE = 'tf_live_aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa';

function seedCredits(env: Env, balance: number): void {
  // direct write via the same KV reference our helpers read
  // (makeKV preserves the singleton so both writes hit the same store)
  return void (env.TENSORFEED_CACHE as unknown as MockKV).put(
    `pay:credits:${FIXTURE}`,
    JSON.stringify({
      balance,
      created: '2026-04-27T00:00:00Z',
      last_used: '2026-04-27T00:00:00Z',
      agent_ua: 'pytest',
      total_purchased: 50,
    }),
  );
}

describe('logPremiumUsage (per-token path)', () => {
  it('aggregates calls per endpoint when a token is provided', async () => {
    const env = makeEnv();
    seedCredits(env, 47);

    await logPremiumUsage(env, '/api/premium/routing', 'pytest', 1, FIXTURE);
    await logPremiumUsage(env, '/api/premium/routing', 'pytest', 1, FIXTURE);
    await logPremiumUsage(env, '/api/premium/agents/directory', 'pytest', 1, FIXTURE);

    const summary = await getTokenUsage(env, FIXTURE);
    expect(summary).not.toBeNull();
    if (!summary) return;
    expect(summary.total_calls).toBe(3);
    expect(summary.total_credits_spent).toBe(3);
    expect(summary.by_endpoint['/api/premium/routing'].calls).toBe(2);
    expect(summary.by_endpoint['/api/premium/agents/directory'].calls).toBe(1);
    expect(summary.token_balance).toBe(47);
  });

  it('does not write per-token usage when no token is given (anon x402)', async () => {
    const env = makeEnv();
    seedCredits(env, 50);
    await logPremiumUsage(env, '/api/premium/routing', 'anon', 1);
    const summary = await getTokenUsage(env, FIXTURE);
    expect(summary?.total_calls).toBe(0);
  });

  it('caps the ring buffer at 100 entries', async () => {
    const env = makeEnv();
    seedCredits(env, 100);
    for (let i = 0; i < 150; i++) {
      await logPremiumUsage(env, '/api/premium/routing', 'pytest', 1, FIXTURE);
    }
    const summary = await getTokenUsage(env, FIXTURE);
    expect(summary?.total_calls).toBe(100);
    expect(summary?.recent.length).toBe(25); // recent capped
  });
});

describe('getTokenUsage', () => {
  it('returns null for unknown tokens', async () => {
    const env = makeEnv();
    expect(await getTokenUsage(env, FIXTURE)).toBeNull();
  });

  it('rejects malformed token prefix', async () => {
    const env = makeEnv();
    expect(await getTokenUsage(env, 'sk-bad-12345')).toBeNull();
  });

  it('returns zero usage for a known token with no calls yet', async () => {
    const env = makeEnv();
    seedCredits(env, 50);
    const summary = await getTokenUsage(env, FIXTURE);
    expect(summary).not.toBeNull();
    if (!summary) return;
    expect(summary.total_calls).toBe(0);
    expect(summary.total_credits_spent).toBe(0);
    expect(summary.recent).toHaveLength(0);
  });
});
