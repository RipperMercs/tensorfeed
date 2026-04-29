/**
 * Pure-logic tests for the per-token usage helpers.
 *
 * Covers logPremiumUsage's per-token write path and getTokenUsage's
 * aggregation. The site-wide rollup behavior is exercised indirectly by
 * existing integration; here we focus on what the /account dashboard
 * relies on.
 */

import { describe, it, expect, afterEach, vi } from 'vitest';
import {
  logPremiumUsage,
  getTokenUsage,
  validateAndCharge,
  screenWalletOFAC,
  checkAndMarkFirstPayment,
  markWalletSeen,
  WELCOME_BONUS_CREDITS_VALUE,
} from './payments';
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

// ── validateAndCharge (cross-Worker helper) ─────────────────────────

describe('validateAndCharge', () => {
  it('decrements credits and returns the new balance on success', async () => {
    const env = makeEnv();
    seedCredits(env, 50);
    const r = await validateAndCharge(env, { token: FIXTURE, cost: 1, endpoint: 'tf:/api/pro/macro' });
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    expect(r.credits_remaining).toBe(49);
    // A second call should see the new balance
    const r2 = await validateAndCharge(env, { token: FIXTURE, cost: 5 });
    expect(r2.ok).toBe(true);
    if (!r2.ok) return;
    expect(r2.credits_remaining).toBe(44);
  });

  it('returns invalid_token for a malformed token', async () => {
    const env = makeEnv();
    const r = await validateAndCharge(env, { token: 'sk-not-a-tf-token', cost: 1 });
    expect(r.ok).toBe(false);
    if (r.ok) return;
    expect(r.reason).toBe('invalid_token');
  });

  it('returns invalid_token when token is unknown', async () => {
    const env = makeEnv();
    const r = await validateAndCharge(env, { token: FIXTURE, cost: 1 });
    expect(r.ok).toBe(false);
    if (r.ok) return;
    expect(r.reason).toBe('invalid_token');
  });

  it('returns insufficient_credits and does NOT decrement when balance < cost', async () => {
    const env = makeEnv();
    seedCredits(env, 2);
    const r = await validateAndCharge(env, { token: FIXTURE, cost: 5 });
    expect(r.ok).toBe(false);
    if (r.ok) return;
    expect(r.reason).toBe('insufficient_credits');
    // Balance must remain 2 (atomic-charge property)
    const usage = await getTokenUsage(env, FIXTURE);
    expect(usage?.token_balance).toBe(2);
  });

  it('rejects negative or NaN cost values', async () => {
    const env = makeEnv();
    seedCredits(env, 50);
    const neg = await validateAndCharge(env, { token: FIXTURE, cost: -1 });
    expect(neg.ok).toBe(false);
    const nan = await validateAndCharge(env, { token: FIXTURE, cost: NaN });
    expect(nan.ok).toBe(false);
  });

  it('handles zero-cost calls (validate-only, no charge)', async () => {
    const env = makeEnv();
    seedCredits(env, 50);
    const r = await validateAndCharge(env, { token: FIXTURE, cost: 0 });
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    expect(r.credits_remaining).toBe(50);
  });
});

// ── screenWalletOFAC (Chainalysis sanctions screen) ─────────────────

describe('screenWalletOFAC', () => {
  const realFetch = globalThis.fetch;
  afterEach(() => {
    globalThis.fetch = realFetch;
  });

  function envWithKey(key?: string): Env {
    const e = makeEnv();
    if (key !== undefined) (e as Env & { CHAINALYSIS_API_KEY?: string }).CHAINALYSIS_API_KEY = key;
    return e;
  }

  it('fails closed when CHAINALYSIS_API_KEY is unset (misconfig protects users)', async () => {
    const r = await screenWalletOFAC('0x549c82e6bfc54bdae9a2073744cbc2af5d1fc6d1', envWithKey());
    expect(r.sanctioned).toBe(true);
    expect(r.error).toBe('screening_not_configured');
  });

  it('treats an empty identifications array as clean', async () => {
    globalThis.fetch = vi.fn(async () =>
      new Response(JSON.stringify({ identifications: [] }), { status: 200 }),
    ) as typeof fetch;
    const r = await screenWalletOFAC('0xabc', envWithKey('test_key'));
    expect(r.sanctioned).toBe(false);
    expect(r.error).toBeNull();
  });

  it('returns sanctioned=true when Chainalysis returns identifications', async () => {
    globalThis.fetch = vi.fn(async () =>
      new Response(
        JSON.stringify({
          identifications: [{ category: 'sanctions', name: 'OFAC SDN', description: 'test' }],
        }),
        { status: 200 },
      ),
    ) as typeof fetch;
    const r = await screenWalletOFAC('0xdeadbeef', envWithKey('test_key'));
    expect(r.sanctioned).toBe(true);
    expect(Array.isArray(r.identifications)).toBe(true);
    expect(r.identifications?.length).toBe(1);
  });

  it('treats 404 from Chainalysis as clean (address not in sanctions DB)', async () => {
    globalThis.fetch = vi.fn(async () => new Response('not found', { status: 404 })) as typeof fetch;
    const r = await screenWalletOFAC('0xabc', envWithKey('test_key'));
    expect(r.sanctioned).toBe(false);
    expect(r.error).toBeNull();
  });

  it('fails open with a logged error on transient 5xx (availability over strictness)', async () => {
    globalThis.fetch = vi.fn(async () => new Response('upstream', { status: 503 })) as typeof fetch;
    const r = await screenWalletOFAC('0xabc', envWithKey('test_key'));
    expect(r.sanctioned).toBe(false);
    expect(r.error).toBe('chainalysis_status_503');
  });

  it('fails open when fetch throws (network unreachable)', async () => {
    globalThis.fetch = vi.fn(async () => {
      throw new Error('ECONNREFUSED');
    }) as typeof fetch;
    const r = await screenWalletOFAC('0xabc', envWithKey('test_key'));
    expect(r.sanctioned).toBe(false);
    expect(r.error?.startsWith('chainalysis_unreachable')).toBe(true);
  });

  it('rejects empty / non-string addresses', async () => {
    const r = await screenWalletOFAC('', envWithKey('test_key'));
    expect(r.error).toBe('invalid_address');
    expect(r.sanctioned).toBe(false);
  });
});

// ── Welcome bonus (first-payment-from-new-wallet) ────────────────────

describe('welcome bonus', () => {
  const WALLET_A = '0xAbCdEf0123456789abcdef0123456789ABCDEF01';
  const WALLET_B = '0x1111111111111111111111111111111111111111';

  it('grants 50 bonus credits to a brand-new wallet', async () => {
    const env = makeEnv();
    const r = await checkAndMarkFirstPayment(env, WALLET_A);
    expect(r.isFirstPayment).toBe(true);
    expect(r.bonusCredits).toBe(WELCOME_BONUS_CREDITS_VALUE);
    expect(WELCOME_BONUS_CREDITS_VALUE).toBe(50);
  });

  it('does not grant a bonus to a wallet already marked as seen', async () => {
    const env = makeEnv();
    await markWalletSeen(env, WALLET_A);
    const r = await checkAndMarkFirstPayment(env, WALLET_A);
    expect(r.isFirstPayment).toBe(false);
    expect(r.bonusCredits).toBe(0);
  });

  it('treats the wallet address case-insensitively (mixed-case write, lowercase read both find the marker)', async () => {
    const env = makeEnv();
    await markWalletSeen(env, WALLET_A);
    const r1 = await checkAndMarkFirstPayment(env, WALLET_A.toLowerCase());
    const r2 = await checkAndMarkFirstPayment(env, WALLET_A.toUpperCase());
    expect(r1.isFirstPayment).toBe(false);
    expect(r2.isFirstPayment).toBe(false);
  });

  it('isolates bonus eligibility per wallet (marking A does not affect B)', async () => {
    const env = makeEnv();
    await markWalletSeen(env, WALLET_A);
    const r = await checkAndMarkFirstPayment(env, WALLET_B);
    expect(r.isFirstPayment).toBe(true);
    expect(r.bonusCredits).toBe(WELCOME_BONUS_CREDITS_VALUE);
  });

  it('returns no bonus when sender wallet is undefined (defensive: x402 verify path with missing sender)', async () => {
    const env = makeEnv();
    const r = await checkAndMarkFirstPayment(env, undefined);
    expect(r.isFirstPayment).toBe(false);
    expect(r.bonusCredits).toBe(0);
  });
});
