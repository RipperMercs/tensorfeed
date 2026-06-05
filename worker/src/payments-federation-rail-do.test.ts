import { describe, it, expect } from 'vitest';
import { validateAndCharge, validateOnly, commitInternal } from './payments';
import { CreditLedger } from './credit-ledger';
import type { Env } from './types';
import type { NoChargeReason } from './receipts';

// ── Federation rail through the CreditLedger DO (Part A) ────────────────
//
// These tests verify the wire-up between the three federation internal-rail
// helpers (validateAndCharge, validateOnly, commitInternal) and the per-token
// CreditLedger DO. The DO's own debit/mint semantics are covered in
// credit-ledger.test.ts; here we prove the BRANCHING in payments.ts:
//   - flag on + binding present routes mutations through the DO (race-safe),
//   - the DO mirrors balances back to the SAME KV (the public read source),
//   - DO error / non-2xx falls back to the legacy KV path with KV ending
//     correct,
//   - reserve/refund nets and invalid-token / reservation semantics survive.
//
// The DO mock is NOT a canned-response stub: it routes stub.fetch() into a
// REAL CreditLedger instance over a Map-backed mock storage, so it enforces
// real balance math (insufficient_credits when drained) and mirrors to KV.
// To replicate Cloudflare's per-instance input-gating, fetch() runs behind a
// single-slot async queue so concurrent Promise.all calls serialize. That
// serialization is what makes the race test deterministic: exactly
// floor(B/C) reserves/charges succeed and the balance never goes negative.

// ── Shared KV mock (one store backs both the payments env and the DO) ──

interface MockStore {
  data: Map<string, string>;
}

function makeKV(): { kv: KVNamespace; store: MockStore } {
  const data = new Map<string, string>();
  const store: MockStore = { data };
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
  return { kv, store };
}

// ── DurableObjectState mock (Map-backed storage, single instance) ──────

function makeMockState(): DurableObjectState {
  const data = new Map<string, unknown>();
  return {
    storage: {
      data,
      async get<T>(key: string) {
        return data.get(key) as T | undefined;
      },
      async put(keyOrObj: string | Record<string, unknown>, value?: unknown) {
        if (typeof keyOrObj === 'string') {
          data.set(keyOrObj, value);
        } else {
          for (const [k, v] of Object.entries(keyOrObj)) data.set(k, v);
        }
      },
      async delete(key: string) {
        return data.delete(key);
      },
    },
  } as unknown as DurableObjectState;
}

// ── A DO namespace that routes to a REAL CreditLedger, with a one-slot
//    serialization gate to replicate DO input-gating. ───────────────────

type DoFailMode = 'none' | 'non2xx' | 'throws';

interface FakeLedgerNamespace {
  ns: DurableObjectNamespace;
  fetchCalls: { url: string; method: string; body: unknown }[];
  setFailMode: (m: DoFailMode) => void;
}

function makeLedgerNamespace(sharedKv: KVNamespace): FakeLedgerNamespace {
  // One CreditLedger instance per token name, so idFromName(token) maps to a
  // stable instance like production. Each instance shares the same KV mirror.
  const instances = new Map<string, CreditLedger>();
  const ledgerEnv = { TENSORFEED_CACHE: sharedKv } as Env;
  const fetchCalls: { url: string; method: string; body: unknown }[] = [];
  let failMode: DoFailMode = 'none';

  // Single-slot async gate: each stub.fetch awaits the previous one, so even
  // a Promise.all burst executes the ledger's read-modify-write serially,
  // matching Cloudflare's per-DO input gating.
  let gate: Promise<void> = Promise.resolve();
  function serialize<T>(fn: () => Promise<T>): Promise<T> {
    const run = gate.then(fn, fn);
    gate = run.then(
      () => undefined,
      () => undefined,
    );
    return run;
  }

  const ns = {
    idFromName: (name: string) => ({ name } as unknown as DurableObjectId),
    get: (id: DurableObjectId) => {
      const name = (id as unknown as { name: string }).name;
      let led = instances.get(name);
      if (!led) {
        led = new CreditLedger(makeMockState(), ledgerEnv);
        instances.set(name, led);
      }
      const ledger = led;
      return {
        async fetch(request: Request): Promise<Response> {
          const url = new URL(request.url);
          const body = await request.clone().json().catch(() => null);
          fetchCalls.push({ url: url.pathname, method: request.method, body });
          if (failMode === 'throws') {
            throw new Error('mock DO fetch threw');
          }
          if (failMode === 'non2xx') {
            return new Response(JSON.stringify({ ok: false, error: 'internal' }), {
              status: 500,
              headers: { 'content-type': 'application/json' },
            });
          }
          return serialize(() => ledger.fetch(request));
        },
      } as unknown as DurableObjectStub;
    },
  } as unknown as DurableObjectNamespace;

  return { ns, fetchCalls, setFailMode: (m) => (failMode = m) };
}

// ── Env builder ────────────────────────────────────────────────────────

function makeEnv(opts: {
  kv: KVNamespace;
  flag?: 'true' | 'false' | undefined;
  ledger?: DurableObjectNamespace;
}): Env {
  return {
    TENSORFEED_NEWS: makeKV().kv,
    TENSORFEED_STATUS: makeKV().kv,
    TENSORFEED_CACHE: opts.kv,
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

const TOKEN = 'tf_live_aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa';

function seedCredits(store: MockStore, balance: number): void {
  store.data.set(
    `pay:credits:${TOKEN}`,
    JSON.stringify({
      balance,
      created: '2026-05-01T00:00:00Z',
      last_used: '2026-05-01T00:00:00Z',
      agent_ua: 'test',
      total_purchased: 1000,
    }),
  );
}

function kvBalance(store: MockStore): number {
  const raw = store.data.get(`pay:credits:${TOKEN}`);
  if (raw === undefined) return NaN;
  return (JSON.parse(raw) as { balance: number }).balance;
}

// Build a flag-on, DO-backed environment over a single shared KV store.
function setupDO(balance: number): {
  env: Env;
  store: MockStore;
  ledger: FakeLedgerNamespace;
} {
  const { kv, store } = makeKV();
  seedCredits(store, balance);
  const ledger = makeLedgerNamespace(kv);
  const env = makeEnv({ kv, flag: 'true', ledger: ledger.ns });
  return { env, store, ledger };
}

// ── RACE: parallel reserves/charges cannot over-spend ──────────────────

describe('federation rail DO: race-safety (validateOnly)', () => {
  it('N parallel validateOnly against B with cost C (N*C > B): exactly floor(B/C) succeed, balance never negative', async () => {
    const B = 100;
    const C = 7;
    const N = 30; // N*C = 210 > 100
    const { env, store } = setupDO(B);

    const results = await Promise.all(
      Array.from({ length: N }, () => validateOnly(env, { token: TOKEN, cost: C })),
    );
    const ok = results.filter((r) => r.ok);
    const rejected = results.filter((r) => !r.ok);

    expect(ok.length).toBe(Math.floor(B / C)); // 14
    expect(rejected.length).toBe(N - Math.floor(B / C));
    for (const r of rejected) {
      expect(r.ok).toBe(false);
      if (!r.ok) expect(r.reason).toBe('insufficient_credits');
    }
    // KV mirror is the public read source: must be the exact remainder,
    // never negative.
    const remaining = B - Math.floor(B / C) * C; // 100 - 98 = 2
    expect(kvBalance(store)).toBe(remaining);
    expect(kvBalance(store)).toBeGreaterThanOrEqual(0);
  });

  it('N parallel validateAndCharge against B with cost C: exactly floor(B/C) succeed, KV ends at the remainder', async () => {
    const B = 50;
    const C = 5;
    const N = 20; // N*C = 100 > 50
    const { env, store } = setupDO(B);

    const results = await Promise.all(
      Array.from({ length: N }, () => validateAndCharge(env, { token: TOKEN, cost: C })),
    );
    const ok = results.filter((r) => r.ok);
    expect(ok.length).toBe(Math.floor(B / C)); // 10
    for (const r of results.filter((x) => !x.ok)) {
      if (!r.ok) expect(r.reason).toBe('insufficient_credits');
    }
    expect(kvBalance(store)).toBe(B - Math.floor(B / C) * C); // 0
    expect(kvBalance(store)).toBeGreaterThanOrEqual(0);
  });
});

// ── REFUND NETS ────────────────────────────────────────────────────────

describe('federation rail DO: reserve/refund nets', () => {
  it('validateOnly(C) then commitInternal no-charge restores the balance exactly (DO mint refund)', async () => {
    const { env, store } = setupDO(100);
    const C = 30;
    const v = await validateOnly(env, { token: TOKEN, cost: C });
    expect(v.ok).toBe(true);
    if (!v.ok) return;
    expect(kvBalance(store)).toBe(70); // DO debited + mirrored

    const c = await commitInternal(env, {
      token: TOKEN,
      cost: C,
      endpoint: '/api/premium/x',
      noChargeReason: 'upstream_5xx' as NonNullable<NoChargeReason>,
      reservationId: v.reservation_id,
    });
    expect(c.ok).toBe(true);
    if (!c.ok) return;
    expect(c.credits_charged).toBe(0);
    expect(c.balance_after).toBe(100); // refunded back to pre-reserve
    expect(kvBalance(store)).toBe(100); // KV mirror restored exactly
  });

  it('validateOnly(C) then commitInternal CHARGE leaves the balance debited by C (no double-debit, no refund)', async () => {
    const { env, store } = setupDO(100);
    const C = 30;
    const v = await validateOnly(env, { token: TOKEN, cost: C });
    expect(v.ok).toBe(true);
    if (!v.ok) return;
    expect(kvBalance(store)).toBe(70);

    const c = await commitInternal(env, {
      token: TOKEN,
      cost: C,
      endpoint: '/api/premium/x',
      noChargeReason: null,
      reservationId: v.reservation_id,
    });
    expect(c.ok).toBe(true);
    if (!c.ok) return;
    expect(c.credits_charged).toBe(C);
    expect(c.balance_after).toBe(70); // no second debit
    expect(kvBalance(store)).toBe(70);
  });

  it('legacy no-reservation charge debits exactly C via the DO and mirrors to KV', async () => {
    const { env, store } = setupDO(40);
    const c = await commitInternal(env, {
      token: TOKEN,
      cost: 10,
      endpoint: '/api/premium/x',
      noChargeReason: null,
    });
    expect(c.ok).toBe(true);
    if (!c.ok) return;
    expect(c.credits_charged).toBe(10);
    expect(c.balance_after).toBe(30);
    expect(kvBalance(store)).toBe(30);
  });
});

// ── FALLBACK: DO error -> legacy KV path, KV ends correct ──────────────

describe('federation rail DO: fallback to legacy KV on DO error', () => {
  it('validateAndCharge falls back to KV debit when the DO returns non-2xx', async () => {
    const { env, store, ledger } = setupDO(50);
    ledger.setFailMode('non2xx');
    const r = await validateAndCharge(env, { token: TOKEN, cost: 10 });
    expect(r.ok).toBe(true);
    if (r.ok) expect(r.credits_remaining).toBe(40);
    expect(kvBalance(store)).toBe(40); // legacy KV debit ran
  });

  it('validateAndCharge falls back to KV debit when the DO throws', async () => {
    const { env, store, ledger } = setupDO(50);
    ledger.setFailMode('throws');
    const r = await validateAndCharge(env, { token: TOKEN, cost: 10 });
    expect(r.ok).toBe(true);
    if (r.ok) expect(r.credits_remaining).toBe(40);
    expect(kvBalance(store)).toBe(40);
  });

  it('validateOnly + commitInternal no-charge net to zero on the legacy KV path when the DO errors', async () => {
    const { env, store, ledger } = setupDO(100);
    ledger.setFailMode('non2xx');
    const v = await validateOnly(env, { token: TOKEN, cost: 25 });
    expect(v.ok).toBe(true);
    if (!v.ok) return;
    expect(kvBalance(store)).toBe(75); // KV reserve debit

    const c = await commitInternal(env, {
      token: TOKEN,
      cost: 25,
      endpoint: '/api/premium/x',
      noChargeReason: 'schema_fail' as NonNullable<NoChargeReason>,
      reservationId: v.reservation_id,
    });
    expect(c.ok).toBe(true);
    if (!c.ok) return;
    expect(c.balance_after).toBe(100); // KV refund restored
    expect(kvBalance(store)).toBe(100);
  });

  it('legacy no-reservation charge falls back to KV debit when the DO errors', async () => {
    const { env, store, ledger } = setupDO(40);
    ledger.setFailMode('throws');
    const c = await commitInternal(env, {
      token: TOKEN,
      cost: 10,
      endpoint: '/api/premium/x',
      noChargeReason: null,
    });
    expect(c.ok).toBe(true);
    if (!c.ok) return;
    expect(c.credits_charged).toBe(10);
    expect(c.balance_after).toBe(30);
    expect(kvBalance(store)).toBe(30);
  });
});

// ── SEMANTICS preserved ────────────────────────────────────────────────

describe('federation rail DO: semantics preserved', () => {
  it('missing token -> invalid_token (DO never touched)', async () => {
    const { kv, store } = makeKV();
    // no credits seeded for TOKEN
    void store;
    const ledger = makeLedgerNamespace(kv);
    const env = makeEnv({ kv, flag: 'true', ledger: ledger.ns });

    const vac = await validateAndCharge(env, { token: TOKEN, cost: 5 });
    expect(vac.ok).toBe(false);
    if (!vac.ok) expect(vac.reason).toBe('invalid_token');

    const vo = await validateOnly(env, { token: TOKEN, cost: 5 });
    expect(vo.ok).toBe(false);
    if (!vo.ok) expect(vo.reason).toBe('invalid_token');

    expect(ledger.fetchCalls.length).toBe(0); // pre-check short-circuits
  });

  it('reservation_not_found for an unknown reservation id', async () => {
    const { env } = setupDO(100);
    const c = await commitInternal(env, {
      token: TOKEN,
      cost: 5,
      endpoint: '/api/premium/x',
      noChargeReason: null,
      reservationId: 'does-not-exist',
    });
    expect(c.ok).toBe(false);
    if (!c.ok) expect(c.reason).toBe('reservation_not_found');
  });

  it('reservation_mismatch when token or cost does not match the reservation', async () => {
    const { env } = setupDO(100);
    const v = await validateOnly(env, { token: TOKEN, cost: 20 });
    expect(v.ok).toBe(true);
    if (!v.ok) return;
    const c = await commitInternal(env, {
      token: TOKEN,
      cost: 21, // mismatch
      endpoint: '/api/premium/x',
      noChargeReason: null,
      reservationId: v.reservation_id,
    });
    expect(c.ok).toBe(false);
    if (!c.ok) expect(c.reason).toBe('reservation_mismatch');
  });

  it('legacy charge DO-reject (insufficient) -> no-charge stale_data', async () => {
    // Seed a balance the DO will reject against: DO sees 5, charge wants 10.
    const { env, store } = setupDO(5);
    const c = await commitInternal(env, {
      token: TOKEN,
      cost: 10,
      endpoint: '/api/premium/x',
      noChargeReason: null,
    });
    expect(c.ok).toBe(true);
    if (!c.ok) return;
    expect(c.credits_charged).toBe(0);
    expect(c.no_charge_reason).toBe('stale_data');
    expect(c.balance_after).toBe(5); // DO balance unchanged on reject
    expect(kvBalance(store)).toBe(5); // KV untouched
  });

  it('a consumed reservation cannot be committed twice (second commit -> reservation_not_found)', async () => {
    const { env } = setupDO(100);
    const v = await validateOnly(env, { token: TOKEN, cost: 15 });
    expect(v.ok).toBe(true);
    if (!v.ok) return;

    const first = await commitInternal(env, {
      token: TOKEN,
      cost: 15,
      endpoint: '/api/premium/x',
      noChargeReason: null,
      reservationId: v.reservation_id,
    });
    expect(first.ok).toBe(true);

    const second = await commitInternal(env, {
      token: TOKEN,
      cost: 15,
      endpoint: '/api/premium/x',
      noChargeReason: null,
      reservationId: v.reservation_id,
    });
    expect(second.ok).toBe(false);
    if (!second.ok) expect(second.reason).toBe('reservation_not_found');
  });
});

// ── Flag-off: DO untouched, exactly today's KV behavior ────────────────

describe('federation rail DO: flag-off preserves legacy KV behavior', () => {
  it('does NOT call the DO when the flag is off, even with a binding present', async () => {
    const { kv, store } = makeKV();
    seedCredits(store, 50);
    const ledger = makeLedgerNamespace(kv);
    const env = makeEnv({ kv, flag: 'false', ledger: ledger.ns });

    const r = await validateAndCharge(env, { token: TOKEN, cost: 10 });
    expect(r.ok).toBe(true);
    if (r.ok) expect(r.credits_remaining).toBe(40);
    expect(kvBalance(store)).toBe(40);
    expect(ledger.fetchCalls.length).toBe(0);
  });
});
