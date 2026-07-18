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
  commitPayment,
  getLifetimeStats,
  backfillLifetimeFromRollups,
  logRevenue,
  getTokenUsage,
  validateAndCharge,
  screenWalletOFAC,
  checkAndMarkFirstPayment,
  markWalletSeen,
  WELCOME_BONUS_CREDITS_VALUE,
  validateOnly,
  commitInternal,
  isValidSenderWallet,
  createQuote,
  getBalance,
  buildHeaderExtensions,
  previewSiblingFor,
  builderCodeExtension,
  requirePayment,
  paymentRequiredResponse,
  normalizeBazaarExtensionsForCDP,
} from './payments';
import type { PaymentResult } from './payments';
import type { Env } from './types';
import { PaymentClaim } from './payment-claim';

interface MockKV {
  get: (key: string, type?: string) => Promise<unknown>;
  put: (key: string, value: string) => Promise<void>;
  delete: (key: string) => Promise<void>;
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
    delete: async (key: string) => {
      store.delete(key);
    },
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

describe('requirePayment Solana x402 rail (CDP)', () => {
  // Reuse the RFC 8032 Ed25519 test vector so authHeaders() signs cleanly.
  const SOL_SECRET_B64 = Buffer.from(
    '9d61b19deffd5a60ba844af492ec2cc44449c5697b326919703bac031cae7f60' +
      'd75a980182b10ab7d54bfed3c964073a0ee172f3daa62325af021a68f707511a',
    'hex',
  ).toString('base64');
  const SOL_API_KEY_ID =
    'organizations/00000000-0000-0000-0000-000000000000/apiKeys/11111111-1111-1111-1111-111111111111';
  const BUYER = '7xKXtg2CW87d97TXJSDpbD5jBkheTqA83TZRuJosgAsU'; // base58 buyer pubkey
  const SOL_SIG =
    '5VERv8NMvzbJMEkV8xnrLkEaWRtSz9CosKDYjCJjBRnbJLgp8uirBgmQpjKhoR4tjF3ZpRzrFmBV6UjKdiSZkQUW';
  const RECEIVE_WALLET = 'B8uYDm3snMCAUwt6NWTV3u7akcmd1AWzCXKQ1dDKWcFJ';

  function solHeader(): string {
    return btoa(
      JSON.stringify({
        x402Version: 2,
        payload: { transaction: btoa('serialized-solana-tx-bytes') },
      }),
    );
  }

  function solEnv(over: Partial<Record<string, unknown>> = {}): Env {
    return {
      ...makeEnv(),
      SOLANA_PAYMENT_WALLET: RECEIVE_WALLET,
      SOLANA_PAYMENT_ENABLED: 'true',
      CHAINALYSIS_API_KEY: 'test-chainalysis',
      CDP_API_KEY_ID: SOL_API_KEY_ID,
      CDP_API_KEY_SECRET: SOL_SECRET_B64,
      ...over,
    } as Env;
  }

  function solRequest(): Request {
    return new Request('https://tensorfeed.ai/api/premium/test-endpoint', {
      headers: { 'X-PAYMENT': solHeader() },
    });
  }

  // Route CDP verify/settle and Chainalysis by URL.
  function installRoutedFetch(
    opts: { verify?: unknown; settle?: unknown; chainalysis?: unknown; chainalysisStatus?: number } = {},
  ): void {
    global.fetch = vi.fn(async (input: RequestInfo | URL) => {
      const url =
        typeof input === 'string'
          ? input
          : input instanceof URL
            ? input.toString()
            : (input as Request).url;
      if (url.includes('/x402/verify')) {
        return new Response(JSON.stringify(opts.verify ?? { isValid: true, payer: BUYER }), {
          status: 200,
        });
      }
      if (url.includes('/x402/settle')) {
        return new Response(
          JSON.stringify(
            opts.settle ?? {
              success: true,
              transaction: SOL_SIG,
              payer: BUYER,
              network: 'solana:5eykt4UsFv8P8NJdTREpY1vzqKqZKvdp',
            },
          ),
          { status: 200 },
        );
      }
      if (url.includes('chainalysis.com')) {
        return new Response(JSON.stringify(opts.chainalysis ?? { identifications: [] }), {
          status: opts.chainalysisStatus ?? 200,
        });
      }
      return new Response('{}', { status: 200 });
    }) as unknown as typeof fetch;
  }

  const realFetch = global.fetch;
  afterEach(() => {
    global.fetch = realFetch;
    vi.restoreAllMocks();
  });

  it('mints a credits token for a valid Solana payment, keyed on the settle signature', async () => {
    installRoutedFetch();
    const env = solEnv();
    const result = await requirePayment(solRequest(), env, 1);

    expect(result.paid).toBe(true);
    if (!result.paid) return;
    expect(result.token).toMatch(/^tf_live_/);
    expect(result.payerWallet).toBe(BUYER);

    // dedup keyed on the Solana settle signature, NOT an EVM nonce
    const dedup = (await (env.TENSORFEED_CACHE as unknown as MockKV).get(
      `pay:x402mint:sol:${SOL_SIG}`,
    )) as { token: string } | null;
    expect(dedup?.token).toBe(result.token);

    // credits sourced from requirements.amount (Solana has no authorization.value)
    const rec = (await (env.TENSORFEED_CACHE as unknown as MockKV).get(
      `pay:credits:${result.token}`,
    )) as { balance: number } | null;
    expect(rec).not.toBeNull();
    expect(rec!.balance).toBeGreaterThanOrEqual(1);
  });

  it('sends resource + canonical bazaar extension to CDP on a Solana pilot settle (so the SOL rail catalogs)', async () => {
    // CDP v2 cataloging needs BOTH paymentPayload.resource AND a well-formed
    // paymentPayload.extensions.bazaar. The EVM requirements carry the pilot
    // extension; the Solana requirements did NOT, so the SOL rail could never
    // be discovered in Bazaar. This drives that fix. Uses a real pilot path
    // (whats-new) so pilotExtensions is non-empty.
    installRoutedFetch();
    const env = solEnv();
    const req = new Request('https://tensorfeed.ai/api/premium/whats-new', {
      headers: { 'X-PAYMENT': solHeader() },
    });
    const result = await requirePayment(req, env, 1);
    expect(result.paid).toBe(true);

    const calls = (global.fetch as unknown as { mock: { calls: unknown[][] } }).mock.calls;
    const settleCall = calls.find(([input]) => {
      const u = typeof input === 'string' ? input : (input as Request).url;
      return u.includes('/x402/settle');
    });
    expect(settleCall).toBeTruthy();
    const body = JSON.parse((settleCall![1] as { body: string }).body);

    // Catalog key: the resource object must reach CDP.
    expect(body.paymentPayload?.resource?.url).toBeTruthy();
    // Discovery payload: the echoed bazaar extension CDP reads at settle time.
    const payExt = body.paymentPayload?.extensions?.bazaar as
      | { info: { input: Record<string, unknown> }; schema: Record<string, unknown> }
      | undefined;
    expect(payExt).toBeDefined();
    // And it must be the shape CDP's draft-07 Ajv accepts: no derived
    // queryFields, and no $schema pin (a 2020-12 $schema makes CDP's compile
    // throw -> rejected / "invalid discovery configuration").
    expect(payExt!.info.input).not.toHaveProperty('queryFields');
    expect(payExt!.schema).not.toHaveProperty('$schema');
  });

  it('accepts the payment on the x402 v2 PAYMENT-SIGNATURE header (not just X-PAYMENT)', async () => {
    // The current @x402/fetch v2 buyer sends the signed payload on the v2
    // transport header PAYMENT-SIGNATURE, not the legacy X-PAYMENT. The server
    // must read either or it cannot be paid by a spec-current v2 agent.
    installRoutedFetch();
    const env = solEnv();
    const req = new Request('https://tensorfeed.ai/api/premium/test-endpoint', {
      headers: { 'PAYMENT-SIGNATURE': solHeader() },
    });
    const result = await requirePayment(req, env, 1);
    expect(result.paid).toBe(true);
    if (!result.paid) return;
    expect(result.token).toMatch(/^tf_live_/);
    expect(result.payerWallet).toBe(BUYER);
  });

  it('replaying the same Solana payment returns the original token and does not mint twice', async () => {
    installRoutedFetch();
    const env = solEnv();
    const first = await requirePayment(solRequest(), env, 1);
    expect(first.paid).toBe(true);
    if (!first.paid) return;

    const second = await requirePayment(solRequest(), env, 1);
    expect(second.paid).toBe(true);
    if (!second.paid) return;

    // same settle signature -> same dedup key -> original token, no re-mint
    expect(second.token).toBe(first.token);
    const dedup = (await (env.TENSORFEED_CACHE as unknown as MockKV).get(
      `pay:x402mint:sol:${SOL_SIG}`,
    )) as { token: string } | null;
    expect(dedup?.token).toBe(first.token);
  });

  it('refuses a sanctioned Solana payer with 403 and does not crash on the missing authorization', async () => {
    installRoutedFetch({
      chainalysis: { identifications: [{ category: 'sanctions', name: 'OFAC SDN' }] },
    });
    const env = solEnv();
    const result = await requirePayment(solRequest(), env, 1);

    expect(result.paid).toBe(false);
    if (result.paid) return;
    expect(result.response?.status).toBe(403);
  });

  it('rejects a Solana payment as invalid_payload when the rail is dark (flag off)', async () => {
    installRoutedFetch();
    const env = solEnv({ SOLANA_PAYMENT_ENABLED: 'false' });
    const result = await requirePayment(solRequest(), env, 1);

    expect(result.paid).toBe(false);
    if (result.paid) return;
    expect(result.response?.status).toBe(400);
  });

  // ── PaymentClaim DO wiring (exactly-once gate over the CDP path) ──

  // A mock DurableObjectNamespace backed by the REAL PaymentClaim class, so the
  // claim/commit/release state machine under test is production code, not a stub.
  function makeClaimNamespace(): DurableObjectNamespace {
    const instances = new Map<string, PaymentClaim>();
    return {
      idFromName: (name: string) => ({ toString: () => name, name }) as unknown as DurableObjectId,
      get: (id: { name: string }) => {
        let inst = instances.get(id.name);
        if (!inst) {
          const data = new Map<string, unknown>();
          const state = {
            storage: {
              get: async (k: string) => data.get(k),
              put: async (k: string | Record<string, unknown>, v?: unknown) => {
                if (typeof k === 'string') data.set(k, v);
                else for (const [kk, vv] of Object.entries(k)) data.set(kk, vv);
              },
              delete: async (k: string) => data.delete(k),
            },
          } as unknown as DurableObjectState;
          inst = new PaymentClaim(state, {} as Env);
          instances.set(id.name, inst);
        }
        return { fetch: (req: Request) => inst!.fetch(req) } as unknown as DurableObjectStub;
      },
    } as unknown as DurableObjectNamespace;
  }

  async function sha256HexTest(s: string): Promise<string> {
    const buf = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(s));
    return Array.from(new Uint8Array(buf))
      .map((b) => b.toString(16).padStart(2, '0'))
      .join('');
  }

  function settleCallCount(): number {
    const f = global.fetch as unknown as { mock?: { calls: Array<[RequestInfo | URL]> } };
    if (!f.mock) return 0;
    return f.mock.calls.filter(([input]) => {
      const u =
        typeof input === 'string'
          ? input
          : input instanceof URL
            ? input.toString()
            : (input as Request).url;
      return u.includes('/x402/settle');
    }).length;
  }

  it('claims atomically: the DO commits on mint and a replay short-circuits before settle', async () => {
    installRoutedFetch();
    const env = solEnv({ PAYMENT_CLAIM: makeClaimNamespace(), PAYMENT_CLAIM_ENABLED: 'true' });

    const first = await requirePayment(solRequest(), env, 1);
    expect(first.paid).toBe(true);
    if (!first.paid) return;
    expect(settleCallCount()).toBe(1);

    const second = await requirePayment(solRequest(), env, 1);
    expect(second.paid).toBe(true);
    if (!second.paid) return;
    // Same token, and settle was NOT called again: the DO 'done' gate fired
    // before settle, proving the claim wraps the mint exactly-once.
    expect(second.token).toBe(first.token);
    expect(settleCallCount()).toBe(1);
  });

  it('returns 409 when the DO reports the payment is already in flight', async () => {
    installRoutedFetch();
    const ns = makeClaimNamespace();
    const env = solEnv({ PAYMENT_CLAIM: ns, PAYMENT_CLAIM_ENABLED: 'true' });

    // Pre-seed a fresh pending claim at the idemKey requirePayment will derive.
    const idemKey = await sha256HexTest(solHeader());
    const stub = ns.get(ns.idFromName(idemKey));
    await stub.fetch(
      new Request('https://payment-claim/claim', {
        method: 'POST',
        body: JSON.stringify({ idemKey, nowMs: Date.now() }),
      }),
    );

    const result = await requirePayment(solRequest(), env, 1);
    expect(result.paid).toBe(false);
    if (result.paid) return;
    expect(result.response?.status).toBe(409);
    expect(settleCallCount()).toBe(0);
  });
});

describe('paymentRequiredResponse Solana advertisement', () => {
  const RECEIVE_WALLET = 'B8uYDm3snMCAUwt6NWTV3u7akcmd1AWzCXKQ1dDKWcFJ';
  function req(): Request {
    return new Request('https://tensorfeed.ai/api/premium/x');
  }

  it('advertises a Solana accepts entry when the rail is enabled', async () => {
    const env = {
      ...makeEnv(),
      SOLANA_PAYMENT_ENABLED: 'true',
      SOLANA_PAYMENT_WALLET: RECEIVE_WALLET,
    } as Env;
    const resp = paymentRequiredResponse(env, 1, 1, req());
    const body = (await resp.json()) as {
      accepts: Array<{ network: string; payTo: string; asset: string; extra?: { feePayer?: string } }>;
    };
    expect(body.accepts.length).toBe(2);
    const sol = body.accepts.find((a) => a.network.startsWith('solana'));
    expect(sol).toBeTruthy();
    expect(sol!.payTo).toBe(RECEIVE_WALLET);
    expect(sol!.extra?.feePayer).toBe('GVJJ7rdGiXr5xaYbRwRbjfaJL7fmwRygFi1H6aGqDveb');
  });

  it('omits Solana from the 402 when the rail is dark', async () => {
    const resp = paymentRequiredResponse(makeEnv(), 1, 1, req());
    const body = (await resp.json()) as { accepts: unknown[] };
    expect(body.accepts.length).toBe(1);
  });
});

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

// ── Payer-wallet rollup extension (Agent Usage Meter, Task 4) ────────
//
// logPremiumUsage gains an optional payerWallet param. When present it
// accumulates a per-wallet paid total (top_payers, keyed by lowercased
// wallet) and counts distinct payers per endpoint, without changing any
// behavior on the UA-only call path used by every existing call site.

// The daily rollup lives at pay:rollup:{date}. The makeKV mock parses the
// JSON on put, so a direct get returns the object. Mirrors the direct-KV
// reads the other tests in this file already use.
interface RollupPayer {
  calls: number;
  credits_charged: number;
  first_seen: string;
  last_seen: string;
  wallet_raw?: string;
  rail?: 'evm' | 'svm';
}
interface RollupForTest {
  by_endpoint: Record<
    string,
    { calls: number; credits_charged: number; distinct_payers?: number }
  >;
  top_payers?: Record<string, RollupPayer>;
  rails?: Partial<Record<'evm' | 'svm', { calls: number; credits_charged: number }>>;
}

async function readRollupFromKv(env: Env, date: string): Promise<RollupForTest> {
  const r = (await env.TENSORFEED_CACHE.get(`pay:rollup:${date}`, 'json')) as RollupForTest | null;
  return r ?? { by_endpoint: {}, top_payers: {} };
}

describe('logPremiumUsage (payer-wallet rollup)', () => {
  it('accumulates top_payers and distinct payers per endpoint when a wallet is passed', async () => {
    const env = makeEnv();
    await logPremiumUsage(env, '/api/premium/x', 'axios/1', 1, 'tok', '0xWALLET_A');
    await logPremiumUsage(env, '/api/premium/x', 'axios/1', 1, 'tok', '0xWALLET_A');
    await logPremiumUsage(env, '/api/premium/x', 'curl/8', 2, 'tok', '0xWALLET_B');

    const rollup = await readRollupFromKv(env, new Date().toISOString().slice(0, 10));
    expect(rollup.top_payers).toBeDefined();
    if (!rollup.top_payers) return;
    expect(rollup.top_payers['0xwallet_a'].calls).toBe(2);
    expect(rollup.top_payers['0xwallet_a'].credits_charged).toBe(2);
    expect(rollup.top_payers['0xwallet_b'].credits_charged).toBe(2);
    expect(rollup.by_endpoint['/api/premium/x'].distinct_payers).toBe(2);
  });

  it('is unchanged when no wallet is passed (UA-only, backward compatible)', async () => {
    const env = makeEnv();
    await logPremiumUsage(env, '/api/premium/y', 'axios/1', 1, 'tok');
    const rollup = await readRollupFromKv(env, new Date().toISOString().slice(0, 10));
    expect(rollup.by_endpoint['/api/premium/y'].calls).toBe(1);
    expect(Object.keys(rollup.top_payers || {})).toHaveLength(0);
  });

  // Pilot-settle contract (Task 5 Step 4). A bazaar-pilot premium 200 that
  // settled a fresh on-chain payment threads the authorizer address from
  // requirePayment (PaymentResult.payerWallet) into logPremiumUsage as the
  // sixth argument, so the KV paid rollup attributes the credits under the
  // stable BAZAAR_PILOTS template key, not just to Analytics Engine. This
  // mirrors how every pilot handler now calls the logger on a paid settle.
  it('attributes a pilot settle to its payer under the template key', async () => {
    const env = makeEnv();
    const template = '/api/premium/research/emerging-keywords';
    await logPremiumUsage(env, template, 'agent/1', 1, 'tf_live_x', '0xPILOT_PAYER');

    const rollup = await readRollupFromKv(env, new Date().toISOString().slice(0, 10));
    expect(rollup.by_endpoint[template].calls).toBe(1);
    expect(rollup.by_endpoint[template].distinct_payers).toBe(1);
    expect(rollup.top_payers?.['0xpilot_payer'].credits_charged).toBe(1);
  });

  // Base58 is case-sensitive, so the lowercase top_payers key (kept for
  // dedupe stability) is lossy for Solana payers. The record must retain
  // the original form for on-chain lookup, and tag the rail so the daily
  // rollup can answer Base-vs-Solana questions without wallet-format
  // heuristics. Found 2026-07-02 tracing the week's Solana payers.
  it('preserves base58 case and tags the rail per payer, with per-rail rollup counters', async () => {
    const env = makeEnv();
    const SOL = 'TeStKWyNre9PW8XbLfvuBm9f6EnTBYqS5GXTzciCnHw';
    const EVM = '0xAbCd000000000000000000000000000000000001';
    await logPremiumUsage(env, '/api/premium/x', 'agent/1', 1, 'tok', SOL);
    await logPremiumUsage(env, '/api/premium/x', 'agent/1', 5, 'tok', SOL);
    await logPremiumUsage(env, '/api/premium/x', 'node', 1, 'tok', EVM);

    const rollup = await readRollupFromKv(env, new Date().toISOString().slice(0, 10));
    const sol = rollup.top_payers?.[SOL.toLowerCase()];
    expect(sol).toBeDefined();
    expect(sol?.wallet_raw).toBe(SOL);
    expect(sol?.rail).toBe('svm');
    expect(sol?.calls).toBe(2);

    const evm = rollup.top_payers?.[EVM.toLowerCase()];
    expect(evm?.wallet_raw).toBe(EVM);
    expect(evm?.rail).toBe('evm');

    expect(rollup.rails?.svm?.calls).toBe(2);
    expect(rollup.rails?.svm?.credits_charged).toBe(6);
    expect(rollup.rails?.evm?.calls).toBe(1);
    expect(rollup.rails?.evm?.credits_charged).toBe(1);
  });

  it('leaves rails absent on the UA-only path (no wallet, no rail attribution)', async () => {
    const env = makeEnv();
    await logPremiumUsage(env, '/api/premium/y', 'axios/1', 1, 'tok');
    const rollup = await readRollupFromKv(env, new Date().toISOString().slice(0, 10));
    expect(rollup.rails).toBeUndefined();
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

describe('validateOnly (federated AFTA: atomic-reserve)', () => {
  it('atomically debits the balance and returns a reservation_id', async () => {
    const env = makeEnv();
    seedCredits(env, 50);
    const r = await validateOnly(env, { token: FIXTURE, cost: 1 });
    expect(r.ok).toBe(true);
    if (r.ok) {
      // Balance is decremented atomically (post-2026-05-05 race fix)
      expect(r.credits_remaining).toBe(49);
      expect(r.sufficient).toBe(true);
      expect(typeof r.reservation_id).toBe('string');
      expect(r.reservation_id.length).toBeGreaterThan(0);
    }
    // Second validate sees the already-debited balance, so it debits
    // again. Two validates against a 50-credit token at cost=1 leave 48.
    const r2 = await validateOnly(env, { token: FIXTURE, cost: 1 });
    if (r2.ok) expect(r2.credits_remaining).toBe(48);
  });

  it('returns insufficient_credits when balance < cost', async () => {
    const env = makeEnv();
    seedCredits(env, 0);
    const r = await validateOnly(env, { token: FIXTURE, cost: 1 });
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.reason).toBe('insufficient_credits');
  });

  it('rejects malformed tokens', async () => {
    const env = makeEnv();
    const r = await validateOnly(env, { token: 'wrong_prefix', cost: 1 });
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.reason).toBe('invalid_token');
  });

  it('rejects negative cost', async () => {
    const env = makeEnv();
    seedCredits(env, 50);
    const r = await validateOnly(env, { token: FIXTURE, cost: -1 });
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.reason).toBe('invalid_token');
  });

  it('rejects unknown tokens', async () => {
    const env = makeEnv();
    const r = await validateOnly(env, { token: FIXTURE, cost: 1 });
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.reason).toBe('invalid_token');
  });
});

describe('commitInternal (federated AFTA: atomic commit OR no-charge)', () => {
  it('debits balance on the charge path', async () => {
    const env = makeEnv();
    seedCredits(env, 50);
    const r = await commitInternal(env, {
      token: FIXTURE,
      cost: 1,
      endpoint: '/api/premium/test',
      noChargeReason: null,
    });
    expect(r.ok).toBe(true);
    if (r.ok) {
      expect(r.credits_charged).toBe(1);
      expect(r.balance_after).toBe(49);
      expect(r.no_charge_reason).toBeNull();
    }
  });

  it('does not debit on the no-charge path and logs the event', async () => {
    const env = makeEnv();
    seedCredits(env, 50);
    const r = await commitInternal(env, {
      token: FIXTURE,
      cost: 1,
      endpoint: '/api/premium/quotes/series',
      noChargeReason: 'stale_data',
    });
    expect(r.ok).toBe(true);
    if (r.ok) {
      expect(r.credits_charged).toBe(0);
      expect(r.balance_after).toBe(50);
      expect(r.no_charge_reason).toBe('stale_data');
    }
    // Read the credits record directly to confirm the balance KV write
    // didn't actually fire on the no-charge legacy path.
    const stored = (await env.TENSORFEED_CACHE.get(`pay:credits:${FIXTURE}`, 'json')) as { balance: number } | null;
    expect(stored?.balance).toBe(50);
  });

  it('clamps overdraft to zero on the charge path (race defense)', async () => {
    const env = makeEnv();
    seedCredits(env, 0);
    const r = await commitInternal(env, {
      token: FIXTURE,
      cost: 1,
      endpoint: '/api/premium/test',
      noChargeReason: null,
    });
    expect(r.ok).toBe(true);
    if (r.ok) expect(r.balance_after).toBe(0);
  });

  it('rejects malformed tokens', async () => {
    const env = makeEnv();
    const r = await commitInternal(env, {
      token: 'bad',
      cost: 1,
      endpoint: '/api/premium/test',
      noChargeReason: null,
    });
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.reason).toBe('invalid_token');
  });

  it('returns invalid_token on charge path when token record is missing', async () => {
    const env = makeEnv();
    const r = await commitInternal(env, {
      token: FIXTURE,
      cost: 1,
      endpoint: '/api/premium/test',
      noChargeReason: null,
    });
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.reason).toBe('invalid_token');
  });

  it('honors no-charge logging even when token record is missing (defensive)', async () => {
    const env = makeEnv();
    const r = await commitInternal(env, {
      token: FIXTURE,
      cost: 1,
      endpoint: '/api/premium/test',
      noChargeReason: '5xx',
    });
    expect(r.ok).toBe(true);
    if (r.ok) {
      expect(r.credits_charged).toBe(0);
      expect(r.balance_after).toBe(0);
      expect(r.no_charge_reason).toBe('5xx');
    }
  });
});

// ── Federation race protection (reservation flow) ───────────────────
//
// Reproduces the attack vector identified in the 2026-05-05 Gemini
// audit. Pre-fix: parallel validate calls all observed sufficient
// balance, parallel handlers all served, parallel commits stacked
// charges past the actual balance. Fix: validateOnly atomically
// decrements and returns a reservation_id; commitInternal consumes
// the reservation, restoring credits on no-charge.

describe('reservation flow (validateOnly + commitInternal with reservation_id)', () => {
  it('charge path: validateOnly debits, commitInternal finalizes without double-debit', async () => {
    const env = makeEnv();
    seedCredits(env, 50);
    const v = await validateOnly(env, { token: FIXTURE, cost: 5 });
    expect(v.ok).toBe(true);
    if (!v.ok) return;
    expect(v.credits_remaining).toBe(45); // already debited

    const c = await commitInternal(env, {
      token: FIXTURE,
      cost: 5,
      endpoint: '/api/premium/test',
      noChargeReason: null,
      reservationId: v.reservation_id,
    });
    expect(c.ok).toBe(true);
    if (!c.ok) return;
    expect(c.credits_charged).toBe(5);
    expect(c.balance_after).toBe(45); // unchanged: validate already debited
  });

  it('no-charge path: validateOnly debits, commitInternal restores the reserved credits', async () => {
    const env = makeEnv();
    seedCredits(env, 50);
    const v = await validateOnly(env, { token: FIXTURE, cost: 5 });
    expect(v.ok).toBe(true);
    if (!v.ok) return;
    expect(v.credits_remaining).toBe(45);

    const c = await commitInternal(env, {
      token: FIXTURE,
      cost: 5,
      endpoint: '/api/premium/test',
      noChargeReason: 'stale_data',
      reservationId: v.reservation_id,
    });
    expect(c.ok).toBe(true);
    if (!c.ok) return;
    expect(c.credits_charged).toBe(0);
    expect(c.balance_after).toBe(50); // restored to pre-validate level
    expect(c.no_charge_reason).toBe('stale_data');
  });

  it('parallel-attack scenario: serialized validates correctly bottleneck on balance', async () => {
    const env = makeEnv();
    seedCredits(env, 100);
    // Simulate 3 parallel validate calls of cost 50 each. Pre-fix this
    // would all return sufficient=true. Post-fix only the first two
    // succeed (50+50=100), the third is rejected for insufficient
    // credits because the balance was already drawn down.
    const r1 = await validateOnly(env, { token: FIXTURE, cost: 50 });
    const r2 = await validateOnly(env, { token: FIXTURE, cost: 50 });
    const r3 = await validateOnly(env, { token: FIXTURE, cost: 50 });
    expect(r1.ok).toBe(true);
    expect(r2.ok).toBe(true);
    expect(r3.ok).toBe(false);
    if (!r3.ok) expect(r3.reason).toBe('insufficient_credits');
  });

  it('rejects commit if reservation_id was never issued', async () => {
    const env = makeEnv();
    seedCredits(env, 50);
    const c = await commitInternal(env, {
      token: FIXTURE,
      cost: 5,
      endpoint: '/api/premium/test',
      noChargeReason: null,
      reservationId: 'tf-deadbeef0000',
    });
    expect(c.ok).toBe(false);
    if (!c.ok) expect(c.reason).toBe('reservation_not_found');
  });

  it('rejects commit if reservation_id was already consumed (no double-commit)', async () => {
    const env = makeEnv();
    seedCredits(env, 50);
    const v = await validateOnly(env, { token: FIXTURE, cost: 5 });
    if (!v.ok) return;
    const first = await commitInternal(env, {
      token: FIXTURE,
      cost: 5,
      endpoint: '/api/premium/test',
      noChargeReason: null,
      reservationId: v.reservation_id,
    });
    expect(first.ok).toBe(true);
    const second = await commitInternal(env, {
      token: FIXTURE,
      cost: 5,
      endpoint: '/api/premium/test',
      noChargeReason: null,
      reservationId: v.reservation_id,
    });
    expect(second.ok).toBe(false);
    if (!second.ok) expect(second.reason).toBe('reservation_not_found');
  });

  it('rejects commit if reservation token or cost does not match (defense against forged ids)', async () => {
    const env = makeEnv();
    seedCredits(env, 50);
    const v = await validateOnly(env, { token: FIXTURE, cost: 5 });
    if (!v.ok) return;
    // Caller tries to commit a different cost than was reserved
    const c = await commitInternal(env, {
      token: FIXTURE,
      cost: 999,
      endpoint: '/api/premium/test',
      noChargeReason: null,
      reservationId: v.reservation_id,
    });
    expect(c.ok).toBe(false);
    if (!c.ok) expect(c.reason).toBe('reservation_mismatch');
  });
});

// ── Tx-Sniper protection (sender_wallet binding) ────────────────────
//
// Reproduces the attack vector identified in the 2026-05-05 audit:
// without a sender_wallet binding on the quote, anyone observing a
// public Base mempool tx hash can race /api/payment/confirm and steal
// the legitimate payer's credits. These tests cover the primitives
// that close that hole: the address validator, the createQuote API
// that now requires sender_wallet, and the persisted quote record.

describe('isValidSenderWallet', () => {
  it('accepts a canonical lowercase 0x-prefixed 40-char hex address', () => {
    expect(isValidSenderWallet('0xabcdef0123456789abcdef0123456789abcdef01')).toBe(true);
  });

  it('accepts mixed-case hex (case-insensitive)', () => {
    expect(isValidSenderWallet('0xAbCdEf0123456789AbCdEf0123456789aBcDeF01')).toBe(true);
  });

  it('rejects addresses missing the 0x prefix', () => {
    expect(isValidSenderWallet('abcdef0123456789abcdef0123456789abcdef01')).toBe(false);
  });

  it('rejects addresses with the wrong length (39 or 41 chars)', () => {
    expect(isValidSenderWallet('0xabcdef0123456789abcdef0123456789abcdef0')).toBe(false);
    expect(isValidSenderWallet('0xabcdef0123456789abcdef0123456789abcdef011')).toBe(false);
  });

  it('rejects addresses with non-hex chars', () => {
    expect(isValidSenderWallet('0xabcdefg123456789abcdef0123456789abcdef01')).toBe(false);
  });

  it('rejects undefined, null, numbers, and empty strings', () => {
    expect(isValidSenderWallet(undefined)).toBe(false);
    expect(isValidSenderWallet(null)).toBe(false);
    expect(isValidSenderWallet(123)).toBe(false);
    expect(isValidSenderWallet('')).toBe(false);
  });

  it('tolerates surrounding whitespace (the production trim path normalizes before storage)', () => {
    expect(isValidSenderWallet('  0xabcdef0123456789abcdef0123456789abcdef01  ')).toBe(true);
  });
});

describe('createQuote (sender_wallet binding)', () => {
  it('persists sender_wallet (lowercased) on the QuoteRecord', async () => {
    const env = makeEnv();
    const sender = '0xAbCdEf0123456789AbCdEf0123456789aBcDeF01';
    const { nonce, quote } = await createQuote(env, 1.0, sender.toLowerCase());
    const stored = (await env.TENSORFEED_CACHE.get(`pay:quote:${nonce}`, 'json')) as {
      amount_usd: number;
      sender_wallet: string;
    } | null;
    expect(stored).not.toBeNull();
    if (!stored) return;
    expect(stored.sender_wallet).toBe(sender.toLowerCase());
    expect(stored.amount_usd).toBe(1.0);
    expect(quote.sender_wallet).toBe(sender.toLowerCase());
  });

  it('issues distinct nonces for back-to-back quotes from the same wallet', async () => {
    const env = makeEnv();
    const sender = '0x1111111111111111111111111111111111111111';
    const a = await createQuote(env, 1.0, sender);
    const b = await createQuote(env, 1.0, sender);
    expect(a.nonce).not.toBe(b.nonce);
  });

  it('returns an expires_at within ~30 minutes of now', async () => {
    const env = makeEnv();
    const sender = '0x2222222222222222222222222222222222222222';
    const before = Date.now();
    const { quote } = await createQuote(env, 1.0, sender);
    const ttl = quote.expires_at - before;
    expect(ttl).toBeGreaterThan(29 * 60 * 1000);
    expect(ttl).toBeLessThan(31 * 60 * 1000);
  });

  it('preserves whatever case the caller passes (boundary layer is responsible for normalization)', async () => {
    // createQuote() trims+lowercases as a defensive belt-and-suspenders
    // step. Boundary validation at /api/payment/buy-credits is the
    // primary gate. This test pins the defensive behavior.
    const env = makeEnv();
    const sender = '0xABCDEF0123456789ABCDEF0123456789ABCDEF01';
    const { quote } = await createQuote(env, 1.0, sender);
    expect(quote.sender_wallet).toBe(sender.toLowerCase());
  });

  it('persists amount_base_units (10^6 USDC base units) for strict-integer match in confirm', async () => {
    // Closes the 2026-05-05 multi-LLM-flagged float-tolerance window
    // where an attacker could quote $200 then send $199.99 on-chain
    // (abs diff ~0.00999... < 0.01 in IEEE 754) and still receive the
    // tier-1 credit count. confirmPayment now compares the integer
    // base units strictly, and createQuote must persist them.
    const env = makeEnv();
    const sender = '0x3333333333333333333333333333333333333333';

    const { quote: q1 } = await createQuote(env, 5.0, sender);
    expect(q1.amount_base_units).toBe(5_000_000);

    const { quote: q2 } = await createQuote(env, 199.99, sender);
    expect(q2.amount_base_units).toBe(199_990_000);

    const { quote: q3 } = await createQuote(env, 1.0, sender);
    expect(q3.amount_base_units).toBe(1_000_000);

    // High end: 10000 USDC = 10^10 base units, well below 2^53 so the
    // integer is representable exactly in JS Number.
    const { quote: q4 } = await createQuote(env, 10000, sender);
    expect(q4.amount_base_units).toBe(10_000_000_000);
    expect(Number.isSafeInteger(q4.amount_base_units!)).toBe(true);
  });
});

describe('lifetime traction counter', () => {
  it('logPremiumUsage bumps pay:stats:lifetime', async () => {
    const env = makeEnv();
    await logPremiumUsage(env, '/api/premium/whats-new', 'agent/1', 1, 'tf_live_x');
    await logPremiumUsage(env, '/api/premium/routing', 'agent/2', 2);
    const s = await getLifetimeStats(env);
    expect(s.premium_calls).toBe(2);
    expect(s.total_credits_charged).toBe(3);
    expect(s.first_at).toBeTruthy();
    expect(s.last_at).toBeTruthy();
    expect(new Date(s.last_at!).getTime()).toBeGreaterThanOrEqual(
      new Date(s.first_at!).getTime(),
    );
  });

  it('getLifetimeStats returns a zeroed default when unset', async () => {
    const env = makeEnv();
    const s = await getLifetimeStats(env);
    expect(s).toEqual({
      premium_calls: 0,
      total_credits_charged: 0,
      usd_received: 0,
      paid_settlements: 0,
      first_at: null,
      last_at: null,
    });
  });

  it('getLifetimeStats coalesces a stored value lacking the new fields to 0', async () => {
    // Simulate a counter persisted before usd_received / paid_settlements
    // existed: the stored JSON has only the original four fields.
    const env = makeEnv({
      'pay:stats:lifetime': {
        premium_calls: 12,
        total_credits_charged: 12,
        first_at: '2026-05-01T00:00:00.000Z',
        last_at: '2026-05-20T00:00:00.000Z',
      },
    });
    const s = await getLifetimeStats(env);
    expect(s.premium_calls).toBe(12);
    expect(s.usd_received).toBe(0);
    expect(s.paid_settlements).toBe(0);
  });

  it('logRevenue bumps usd_received and paid_settlements in the lifetime counter', async () => {
    const env = makeEnv();
    await logRevenue(env, 5.5, 'agent/1');
    await logRevenue(env, 4.25, 'agent/2');
    const s = await getLifetimeStats(env);
    expect(s.usd_received).toBe(9.75);
    expect(s.paid_settlements).toBe(2);
    // logRevenue is the real-money path and must not touch the served-call
    // counters; those belong to logPremiumUsage.
    expect(s.premium_calls).toBe(0);
    expect(s.total_credits_charged).toBe(0);
  });

  it('backfill populates usd_received and paid_settlements from rollup total_usd and tx_count', async () => {
    const env = makeEnv({
      'pay:rollup:2026-05-15': {
        date: '2026-05-15',
        call_count: 4,
        total_credits_charged: 6,
        total_usd: 10.5,
        tx_count: 2,
      },
      'pay:rollup:2026-05-16': {
        date: '2026-05-16',
        call_count: 3,
        total_credits_charged: 5,
        total_usd: 4.5,
        tx_count: 1,
      },
    });
    const a = await backfillLifetimeFromRollups(env);
    expect(a.usd_received).toBe(15);
    expect(a.paid_settlements).toBe(3);
    // Served-call sums remain correct alongside the new revenue sums.
    expect(a.premium_calls).toBe(7);
    expect(a.total_credits_charged).toBe(11);
    const s = await getLifetimeStats(env);
    expect(s.usd_received).toBe(15);
    expect(s.paid_settlements).toBe(3);
  });

  it('backfill sums persisted dated rollups and is idempotent', async () => {
    const env = makeEnv({
      'pay:rollup:2026-05-15': { date: '2026-05-15', call_count: 4, total_credits_charged: 6 },
      'pay:rollup:2026-05-16': { date: '2026-05-16', call_count: 3, total_credits_charged: 5 },
      'pay:credits:tf_live_z': { balance: 1 }, // unrelated key must be ignored
    });
    const a = await backfillLifetimeFromRollups(env);
    expect(a.premium_calls).toBe(7);
    expect(a.total_credits_charged).toBe(11);
    expect(a.first_at).toBe('2026-05-15T00:00:00.000Z');
    expect(a.last_at).toBe('2026-05-16T23:59:59.999Z');
    // Idempotent: a re-run recomputes the same numbers, never doubles.
    const b = await backfillLifetimeFromRollups(env);
    expect(b).toEqual(a);
    const s = await getLifetimeStats(env);
    expect(s.premium_calls).toBe(7);
  });

  it('backfill ignores non-rollup keys even if list does not filter', async () => {
    const env = makeEnv({
      'pay:rollup:2026-05-16': { date: '2026-05-16', call_count: 2, total_credits_charged: 2 },
      'pay:stats:lifetime': {
        premium_calls: 999,
        total_credits_charged: 999,
        first_at: null,
        last_at: null,
      },
      'agent-activity': [{ bot: 'x' }],
    });
    const a = await backfillLifetimeFromRollups(env);
    expect(a.premium_calls).toBe(2);
    expect(a.total_credits_charged).toBe(2);
  });
});

describe('commit-outcome bridge (usage log accuracy)', () => {
  const trialQuota = {
    allowed: true,
    used: 1,
    remaining: 99,
    limit: 100,
    resetSeconds: 3600,
    resetAt: '2026-07-19T00:00:00Z',
  };

  it('skips the paid rollup for free-trial calls', async () => {
    const env = makeEnv();
    const payment: PaymentResult = { paid: true, cost: 1, freeTrial: trialQuota };
    const pending = logPremiumUsage(env, '/api/premium/news/search', 'axios/1.14.0', 1, undefined, undefined, payment);
    const commit = await commitPayment(env, payment, '/api/premium/news/search', null);
    await pending;
    expect(commit.creditsCharged).toBe(0);
    const s = await getLifetimeStats(env);
    expect(s.premium_calls).toBe(0);
    expect(s.total_credits_charged).toBe(0);
    const rollup = await (env.TENSORFEED_CACHE as unknown as MockKV).get('pay:rollup:' + new Date().toISOString().slice(0, 10));
    expect(rollup).toBeNull();
    // The no-charge rollup still owns the event.
    const noCharge = (await (env.TENSORFEED_CACHE as unknown as MockKV).get(
      'pay:no-charge:' + new Date().toISOString().slice(0, 10),
    )) as { count: number; by_reason: Record<string, number> } | null;
    expect(noCharge?.count).toBe(1);
    expect(noCharge?.by_reason.free_trial).toBe(1);
  });

  it('skips the paid rollup on an AFTA no-charge commit (stale_data)', async () => {
    const env = makeEnv();
    seedCredits(env, 47);
    const payment: PaymentResult = { paid: true, token: FIXTURE, cost: 1, currentBalance: 47 };
    const pending = logPremiumUsage(env, '/api/premium/whats-new', 'agent/1', 1, FIXTURE, undefined, payment);
    await commitPayment(env, payment, '/api/premium/whats-new', 'stale_data');
    await pending;
    const s = await getLifetimeStats(env);
    expect(s.premium_calls).toBe(0);
    const usage = await getTokenUsage(env, FIXTURE);
    expect(usage?.total_calls).toBe(0);
  });

  it('logs the actual debit for a charged call', async () => {
    const env = makeEnv();
    seedCredits(env, 47);
    const payment: PaymentResult = { paid: true, token: FIXTURE, cost: 2, currentBalance: 47 };
    const pending = logPremiumUsage(env, '/api/premium/history/pricing/series', 'agent/1', 2, FIXTURE, undefined, payment);
    const commit = await commitPayment(env, payment, '/api/premium/history/pricing/series', null);
    await pending;
    expect(commit.creditsCharged).toBe(2);
    const s = await getLifetimeStats(env);
    expect(s.premium_calls).toBe(1);
    expect(s.total_credits_charged).toBe(2);
    const usage = await getTokenUsage(env, FIXTURE);
    expect(usage?.total_calls).toBe(1);
    expect(usage?.total_credits_spent).toBe(2);
  });

  it('falls back to the nominal cost when no commit ever arrives', async () => {
    // Legacy routes (e.g. /api/premium/routing) never call commitPayment;
    // the fallback timer must preserve their pre-bridge logging behavior.
    vi.useFakeTimers();
    try {
      const env = makeEnv();
      const payment: PaymentResult = { paid: true, token: FIXTURE, cost: 1, currentBalance: 47 };
      const pending = logPremiumUsage(env, '/api/premium/routing', 'agent/1', 1, FIXTURE, undefined, payment);
      await vi.advanceTimersByTimeAsync(10_000);
      await pending;
      const s = await getLifetimeStats(env);
      expect(s.premium_calls).toBe(1);
      expect(s.total_credits_charged).toBe(1);
    } finally {
      vi.useRealTimers();
    }
  });
});

describe('getBalance', () => {
  it('returns balance and a credits_remaining alias (same value)', async () => {
    const env = makeEnv();
    seedCredits(env, 25);
    const r = await getBalance(env, FIXTURE);
    expect(r.ok).toBe(true);
    if (r.ok) {
      expect(r.balance).toBe(25);
      expect(r.credits_remaining).toBe(25);
    }
  });
  it('rejects an unknown token', async () => {
    const env = makeEnv();
    const r = await getBalance(env, 'tf_live_unknownunknownunknownunknownunknownunknownunknownunkn00');
    expect(r.ok).toBe(false);
  });
});

describe('buildHeaderExtensions (402 header schema, audit + x402scan)', () => {
  const fullExt = {
    bazaar: {
      info: {
        input: { type: 'http', method: 'GET', queryParams: { task: 'code' }, queryFields: { task: { type: 'string' } } },
        output: { type: 'json', example: { ok: true, verdict: { model: 'x', why: 'long explanation '.repeat(30) } } },
      },
      schema: { $schema: 'https://json-schema.org/draft/2020-12/schema', type: 'object', properties: { task: { type: 'string', description: 'a'.repeat(300) } } },
      routeTemplate: '/api/premium/providers/:name',
    },
  };
  it('keeps only bazaar.info.input (plus routeTemplate), drops the heavy output + schema', () => {
    const h = buildHeaderExtensions(fullExt) as { bazaar: { info: { input: unknown; output?: unknown }; schema?: unknown; routeTemplate?: unknown } };
    expect(h.bazaar.info.input).toEqual(fullExt.bazaar.info.input);
    expect(h.bazaar.info.output).toBeUndefined();
    expect(h.bazaar.schema).toBeUndefined();
    expect(h.bazaar.routeTemplate).toBe('/api/premium/providers/:name');
  });
  it('returns {} for non-pilot (empty) extensions', () => {
    expect(buildHeaderExtensions({})).toEqual({});
  });
  it('returns {} when there is no bazaar.info.input', () => {
    expect(buildHeaderExtensions({ bazaar: { info: {} } })).toEqual({});
  });
  it('falls back to {} when the input is too large for the header cap (no overflow)', () => {
    const big = { bazaar: { info: { input: { type: 'http', blob: 'x'.repeat(9000) } } } };
    expect(buildHeaderExtensions(big)).toEqual({});
  });
  it('the input-only block stays well under the cap', () => {
    expect(btoa(JSON.stringify(buildHeaderExtensions(fullExt))).length).toBeLessThan(5000);
  });
});

// The 402 challenge advertises a free preview sibling when one exists, so an
// agent that just bounced off the paywall is told where the free taste lives.
describe('previewSiblingFor', () => {
  it('maps paid endpoints to their free preview', () => {
    expect(previewSiblingFor('/api/premium/whats-new')).toBe('/api/preview/whats-new');
    expect(previewSiblingFor('/api/premium/policy/timeline')).toBe('/api/preview/policy/timeline');
    expect(previewSiblingFor('/api/premium/ai-cves/ai-stack-cves')).toBe('/api/preview/ai-cves/ai-stack-cves');
    expect(previewSiblingFor('/api/premium/model-deprecations/timeline')).toBe('/api/preview/model-deprecations/timeline');
    expect(previewSiblingFor('/api/premium/ai-crypto-pulse')).toBe('/api/preview/ai-crypto-pulse');
    // research/authors points at its existing free top-25 sibling, not a new preview route.
    expect(previewSiblingFor('/api/premium/research/authors')).toBe('/api/research/authors');
    // the 10-credit pro tier points at its own dedicated free taste.
    expect(previewSiblingFor('/api/premium/whats-new/pro')).toBe('/api/preview/whats-new/pro');
    // inference arbitrage taste shows the spread magnitude, not which provider wins.
    expect(previewSiblingFor('/api/premium/inference-providers/arbitrage')).toBe('/api/preview/inference-providers/arbitrage');
  });
  it('returns undefined for endpoints with no preview sibling', () => {
    expect(previewSiblingFor('/api/premium/security/kev/full')).toBeUndefined();
  });
});

// Base builder-code (ERC-8021) attribution. Gated behind env.BUILDER_CODE_APP:
// when unset, the 402 declares NO builder-code extension (today's behavior
// byte-for-byte). When set to a valid code, the seller app code `a` rides in
// the 402 extensions so the CDP facilitator can stamp the settlement suffix.
describe('builderCodeExtension', () => {
  it('declares nothing when the app code is unset', () => {
    expect(builderCodeExtension(undefined)).toEqual({});
    expect(builderCodeExtension('')).toEqual({});
  });

  it('declares nothing for a code that violates the ^[a-z0-9_]{1,32}$ pattern', () => {
    expect(builderCodeExtension('Bad Code!')).toEqual({});
    expect(builderCodeExtension('UPPER')).toEqual({});
    expect(builderCodeExtension('a'.repeat(33))).toEqual({});
  });

  it('emits the builder-code block with app code a and the schema for a valid code', () => {
    const ext = builderCodeExtension('bc_oeob8et3') as Record<string, { info: { a: string }; schema: { properties: { a: { pattern: string } } } }>;
    expect(Object.keys(ext)).toEqual(['builder-code']);
    expect(ext['builder-code'].info).toEqual({ a: 'bc_oeob8et3' });
    expect(ext['builder-code'].schema.properties.a.pattern).toBe('^[a-z0-9_]{1,32}$');
  });

  it('the builder-code block survives header compaction, with and without bazaar', () => {
    const withBazaar = { ...builderCodeExtension('bc_oeob8et3'), bazaar: { info: { input: { type: 'http' } } } };
    const h1 = buildHeaderExtensions(withBazaar) as Record<string, unknown>;
    expect(h1['builder-code']).toBeDefined();
    expect(h1.bazaar).toBeDefined();
    const h2 = buildHeaderExtensions(builderCodeExtension('bc_oeob8et3')) as Record<string, unknown>;
    expect(h2['builder-code']).toBeDefined();
  });
});

describe('normalizeBazaarExtensionsForCDP: emits the CDP-cataloged canonical bazaar shape', () => {
  // Ground truth from 120 live CDP-cataloged records (2026-06-29): the bazaar
  // extension CDP indexes carries a simple info.input / info.output plus a
  // top-level bazaar.schema that KEEPS $schema (104 of 120). ZERO cataloged
  // records carry a derived info.input.queryFields or info.output.schema. A
  // malformed extension is rejected by CDP (EXTENSION-RESPONSES e30=) and the
  // resource is never cataloged, which is why every TF settle since the
  // 2026-05-25 normalize shim stopped cataloging. The static pilot config is
  // already canonical, so normalize must pass it through verbatim.
  const RESOURCE = 'https://tensorfeed.ai/api/premium/whats-new';
  const canonical = () => ({
    bazaar: {
      info: {
        input: { type: 'http', method: 'GET', queryParams: { days: 1, news_limit: 10 } },
        output: { type: 'json', example: { ok: true, summary: { incidents: 2 } } },
      },
      schema: {
        $schema: 'https://json-schema.org/draft/2020-12/schema',
        type: 'object',
        properties: { input: { type: 'object' }, output: { type: 'object' } },
        required: ['input'],
      },
    },
  });

  it('strips bazaar.schema.$schema (CDP draft-07 Ajv cannot resolve the 2020-12 meta-schema ref)', () => {
    // Reproduced offline 2026-06-29 against CDP's exact validator
    // (new Ajv({strict:false}).compile(schema)(info), draft-07): with a pinned
    // $schema=".../draft/2020-12/schema" the compile THROWS and CDP returns
    // rejected / "invalid discovery configuration"; with $schema stripped the
    // schema compiles and info validates. Cataloged peers (deepnets) only show
    // $schema because CDP re-injects it into the stored record.
    const out = normalizeBazaarExtensionsForCDP(canonical(), RESOURCE) as Record<string, any>;
    expect(out.bazaar.schema).not.toHaveProperty('$schema');
  });

  it('does not inject info.input.queryFields (0 of 120 cataloged peers carry it)', () => {
    const out = normalizeBazaarExtensionsForCDP(canonical(), RESOURCE) as Record<string, any>;
    expect(out.bazaar.info.input).not.toHaveProperty('queryFields');
  });

  it('does not inject info.output.schema (0 of 120 cataloged peers carry it)', () => {
    const out = normalizeBazaarExtensionsForCDP(canonical(), RESOURCE) as Record<string, any>;
    expect(out.bazaar.info.output).not.toHaveProperty('schema');
  });

  it('does not add a discoverable field (CDP treats it as a failed-discovery signal)', () => {
    const out = normalizeBazaarExtensionsForCDP(canonical(), RESOURCE) as Record<string, any>;
    expect(out.bazaar.info.input).not.toHaveProperty('discoverable');
  });

  it('strips only $schema, leaving info and the rest of schema verbatim', () => {
    const out = normalizeBazaarExtensionsForCDP(canonical(), RESOURCE) as Record<string, any>;
    expect(out.bazaar.info).toEqual(canonical().bazaar.info);
    const { $schema, ...schemaRest } = canonical().bazaar.schema as Record<string, unknown>;
    expect(out.bazaar.schema).toEqual(schemaRest);
  });

  it('returns a clone, not the same reference (no shared static-config mutation)', () => {
    const input = canonical();
    const out = normalizeBazaarExtensionsForCDP(input, RESOURCE);
    expect(out).not.toBe(input);
  });

  it('passes empty extensions through unchanged for non-pilot paths', () => {
    expect(normalizeBazaarExtensionsForCDP({}, RESOURCE)).toEqual({});
  });
});

