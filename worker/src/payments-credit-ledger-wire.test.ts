import { describe, it, expect } from 'vitest';
import { commitPayment } from './payments';
import type { Env } from './types';
import type { PaymentResult } from './payments';

// ── Mock infrastructure ─────────────────────────────────────────────
//
// Tests the wire-up between commitPayment and the CreditLedger DO
// (Phase 3 of the Tier 2 audit response, 2026-05-26). The DO's internal
// semantics are covered in credit-ledger.test.ts; this file verifies
// the BRANCHING in commitPayment: flag controls which path runs, DO
// success returns DO state, DO failure falls back to legacy KV.

interface KVState {
  data: Map<string, string>;
}

function makeKV(initial: Record<string, unknown> = {}): { kv: KVNamespace; state: KVState } {
  const data = new Map<string, string>();
  for (const [k, v] of Object.entries(initial)) data.set(k, JSON.stringify(v));
  const state: KVState = { data };
  const kv = {
    get: async (key: string, format?: string) => {
      const raw = data.get(key);
      if (raw === undefined) return null;
      if (format === 'json') {
        try {
          return JSON.parse(raw);
        } catch {
          return null;
        }
      }
      return raw;
    },
    put: async (key: string, value: string, _opts?: unknown) => {
      data.set(key, value);
    },
    delete: async (key: string) => {
      data.delete(key);
    },
    list: async () => ({ keys: [...data.keys()].map((name) => ({ name })) }),
  } as unknown as KVNamespace;
  return { kv, state };
}

type DoMockResponse =
  | { kind: 'http'; status: number; body: unknown }
  | { kind: 'throws' };

interface FakeDOStubState {
  fetchCalls: { url: string; method: string; body: unknown }[];
  nextResponse: DoMockResponse | null;
}

interface FakeDONamespace {
  state: FakeDOStubState;
  ns: DurableObjectNamespace;
}

function makeFakeDONamespace(initial?: Partial<FakeDOStubState>): FakeDONamespace {
  const state: FakeDOStubState = {
    fetchCalls: [],
    nextResponse: null,
    ...initial,
  };
  const stub = {
    async fetch(request: Request): Promise<Response> {
      const url = new URL(request.url);
      const body = await request.clone().json().catch(() => null);
      state.fetchCalls.push({ url: url.pathname, method: request.method, body });
      if (state.nextResponse === null) {
        return new Response(JSON.stringify({ ok: false, error: 'no_response_configured' }), {
          status: 500,
          headers: { 'content-type': 'application/json' },
        });
      }
      if (state.nextResponse.kind === 'throws') {
        throw new Error('mock DO fetch threw');
      }
      return new Response(JSON.stringify(state.nextResponse.body), {
        status: state.nextResponse.status,
        headers: { 'content-type': 'application/json' },
      });
    },
  };
  const ns = {
    idFromName: (_name: string) => ({} as DurableObjectId),
    get: (_id: DurableObjectId) => stub as unknown as DurableObjectStub,
    // Other DurableObjectNamespace methods unused by our path; cast at the call site.
  } as unknown as DurableObjectNamespace;
  return { state, ns };
}

function makeEnv(opts: {
  flag?: 'true' | 'false' | undefined;
  ledger?: DurableObjectNamespace;
  kv?: KVNamespace;
}): Env {
  const { kv } = opts.kv ? { kv: opts.kv } : makeKV();
  return {
    TENSORFEED_NEWS: makeKV().kv,
    TENSORFEED_STATUS: makeKV().kv,
    TENSORFEED_CACHE: kv,
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
    ...(opts.ledger ? { CREDIT_LEDGER: opts.ledger } : {}),
    ...(opts.flag !== undefined ? { CREDIT_LEDGER_ENABLED: opts.flag } : {}),
  } as Env;
}

const TOKEN = 'tf_live_bbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb';

function paid(cost: number, balance = 100): PaymentResult {
  return {
    paid: true,
    token: TOKEN,
    cost,
    currentBalance: balance,
  } as PaymentResult;
}

function seedCredits(env: Env, balance: number): void {
  (env.TENSORFEED_CACHE as unknown as { put: (k: string, v: string) => Promise<void> }).put(
    `pay:credits:${TOKEN}`,
    JSON.stringify({
      balance,
      created: '2026-05-01T00:00:00Z',
      last_used: '2026-05-01T00:00:00Z',
      agent_ua: 'test',
      total_purchased: 100,
    }),
  );
}

// ── Flag-off: DO must NOT be called ─────────────────────────────────

describe('commitPayment + CreditLedger wire (flag off)', () => {
  it('does NOT call the DO when CREDIT_LEDGER_ENABLED is unset, even if binding is present', async () => {
    const fake = makeFakeDONamespace();
    const env = makeEnv({ ledger: fake.ns });
    seedCredits(env, 50);
    const r = await commitPayment(env, paid(5), '/api/premium/test', null);
    expect(r.creditsCharged).toBe(5);
    expect(r.balanceAfter).toBe(45); // legacy KV math
    expect(fake.state.fetchCalls.length).toBe(0); // DO never touched
  });

  it("does NOT call the DO when CREDIT_LEDGER_ENABLED is 'false'", async () => {
    const fake = makeFakeDONamespace();
    const env = makeEnv({ flag: 'false', ledger: fake.ns });
    seedCredits(env, 50);
    const r = await commitPayment(env, paid(5), '/api/premium/test', null);
    expect(r.creditsCharged).toBe(5);
    expect(fake.state.fetchCalls.length).toBe(0);
  });

  it('does NOT call the DO when binding is absent (CREDIT_LEDGER undefined)', async () => {
    const fake = makeFakeDONamespace();
    const env = makeEnv({ flag: 'true' }); // flag on but no binding
    seedCredits(env, 50);
    const r = await commitPayment(env, paid(5), '/api/premium/test', null);
    expect(r.creditsCharged).toBe(5);
    expect(fake.state.fetchCalls.length).toBe(0);
  });
});

// ── Flag-on + DO success ────────────────────────────────────────────

describe('commitPayment + CreditLedger wire (flag on, DO success)', () => {
  it('routes through DO when flag is true + binding present; returns DO balance', async () => {
    const fake = makeFakeDONamespace({
      nextResponse: { kind: 'http', status: 200, body: { ok: true, balance: 90 } },
    });
    const env = makeEnv({ flag: 'true', ledger: fake.ns });
    seedCredits(env, 100); // legacy KV says 100; DO says debit succeeded with balance 90
    const r = await commitPayment(env, paid(10), '/api/premium/test', null);
    expect(r.creditsCharged).toBe(10);
    expect(r.balanceAfter).toBe(90); // DO state, NOT the legacy KV calculation
    expect(fake.state.fetchCalls.length).toBe(1);
    expect(fake.state.fetchCalls[0].url).toBe('/debit');
    expect(fake.state.fetchCalls[0].method).toBe('POST');
    const body = fake.state.fetchCalls[0].body as Record<string, unknown>;
    expect(body.token).toBe(TOKEN);
    expect(body.amount).toBe(10);
    expect(typeof body.today).toBe('string');
  });

  it('does NOT debit legacy KV when DO succeeds (legacy balance unchanged)', async () => {
    const fake = makeFakeDONamespace({
      nextResponse: { kind: 'http', status: 200, body: { ok: true, balance: 90 } },
    });
    const { kv, state: kvState } = makeKV();
    const env = makeEnv({ flag: 'true', ledger: fake.ns, kv });
    seedCredits(env, 100);
    await commitPayment(env, paid(10), '/api/premium/test', null);
    const recRaw = kvState.data.get(`pay:credits:${TOKEN}`);
    const rec = JSON.parse(recRaw!);
    // Legacy KV balance unchanged because DO path returned early (DO
    // will mirror back asynchronously via its own mirrorToKV; in this
    // unit test the mock DO doesn't mirror, so KV stays at the seeded
    // value).
    expect(rec.balance).toBe(100);
  });
});

// ── Flag-on + DO returns ok:false ───────────────────────────────────

describe('commitPayment + CreditLedger wire (flag on, DO rejects)', () => {
  it('logs no-charge on insufficient_credits and returns balanceAfter from DO', async () => {
    const fake = makeFakeDONamespace({
      nextResponse: { kind: 'http', status: 200, body: { ok: false, balance: 3, reason: 'insufficient_credits' } },
    });
    const env = makeEnv({ flag: 'true', ledger: fake.ns });
    seedCredits(env, 100);
    const r = await commitPayment(env, paid(10), '/api/premium/test', null);
    expect(r.creditsCharged).toBe(0);
    expect(r.balanceAfter).toBe(3);
    expect(r.noChargeReason).toBe('stale_data');
  });

  it('logs no-charge on cap_exceeded and returns balanceAfter from DO', async () => {
    const fake = makeFakeDONamespace({
      nextResponse: { kind: 'http', status: 200, body: { ok: false, balance: 100, reason: 'cap_exceeded' } },
    });
    const env = makeEnv({ flag: 'true', ledger: fake.ns });
    seedCredits(env, 100);
    const r = await commitPayment(env, paid(10), '/api/premium/test', null);
    expect(r.creditsCharged).toBe(0);
    expect(r.balanceAfter).toBe(100);
    expect(r.noChargeReason).toBe('stale_data');
  });
});

// ── Flag-on + DO error → fallback to legacy ─────────────────────────

describe('commitPayment + CreditLedger wire (flag on, DO error)', () => {
  it('falls back to legacy KV when DO returns non-2xx', async () => {
    const fake = makeFakeDONamespace({
      nextResponse: { kind: 'http', status: 500, body: { ok: false, error: 'internal' } },
    });
    const env = makeEnv({ flag: 'true', ledger: fake.ns });
    seedCredits(env, 100);
    const r = await commitPayment(env, paid(10), '/api/premium/test', null);
    // Legacy KV debit ran (the fallback path)
    expect(r.creditsCharged).toBe(10);
    expect(r.balanceAfter).toBe(90);
  });

  it('falls back to legacy KV when DO fetch throws', async () => {
    const fake = makeFakeDONamespace({
      nextResponse: { kind: 'throws' },
    });
    const env = makeEnv({ flag: 'true', ledger: fake.ns });
    seedCredits(env, 100);
    const r = await commitPayment(env, paid(10), '/api/premium/test', null);
    expect(r.creditsCharged).toBe(10);
    expect(r.balanceAfter).toBe(90);
  });
});

// ── Cost-zero edge case ─────────────────────────────────────────────

describe('commitPayment + CreditLedger wire (cost = 0)', () => {
  it('skips DO entirely when cost is 0 (legacy no-op path)', async () => {
    const fake = makeFakeDONamespace({
      nextResponse: { kind: 'http', status: 200, body: { ok: true, balance: 50 } },
    });
    const env = makeEnv({ flag: 'true', ledger: fake.ns });
    seedCredits(env, 50);
    const r = await commitPayment(env, paid(0), '/api/premium/test', null);
    expect(fake.state.fetchCalls.length).toBe(0); // DO not called for 0-cost
    expect(r.creditsCharged).toBe(0);
    expect(r.balanceAfter).toBe(50);
  });
});
