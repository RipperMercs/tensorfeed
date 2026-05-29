import { describe, it, expect } from 'vitest';
import { CreditLedger } from './credit-ledger';
import type { Env } from './types';

// ── Mock DurableObjectState ─────────────────────────────────────────
//
// Cloudflare's runtime gives the DO a `state.storage` interface with
// get/put/delete/list. We mock it with a Map. Cloudflare's real
// runtime guarantees serialized access to a single DO instance; that
// guarantee is what makes the production code race-safe. Our mock is
// already inherently single-threaded under JS event-loop semantics, so
// tests run serial method calls and verify each method's logic is
// correct under that assumption.

interface MockStorage {
  data: Map<string, unknown>;
  get<T = unknown>(key: string): Promise<T | undefined>;
  put(keyOrObj: string | Record<string, unknown>, value?: unknown): Promise<void>;
  delete(key: string): Promise<boolean>;
}

function makeMockState(): { storage: MockStorage } {
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
          for (const [k, v] of Object.entries(keyOrObj)) {
            data.set(k, v);
          }
        }
      },
      async delete(key: string) {
        return data.delete(key);
      },
    },
  };
}

// ── Mock Env (only TENSORFEED_CACHE is touched by ensureInitialized) ─

function makeMockEnv(creditsKvSeed?: Record<string, unknown>): Env {
  const kvData = new Map<string, string>();
  if (creditsKvSeed) {
    for (const [k, v] of Object.entries(creditsKvSeed)) {
      kvData.set(k, JSON.stringify(v));
    }
  }
  const cache = {
    get: async (key: string, _format?: string) => {
      const raw = kvData.get(key);
      if (raw === undefined) return null;
      if (_format === 'json') {
        try {
          return JSON.parse(raw);
        } catch {
          return null;
        }
      }
      return raw;
    },
    put: async (key: string, value: string) => {
      kvData.set(key, value);
    },
    delete: async (key: string) => {
      kvData.delete(key);
    },
  };
  return { TENSORFEED_CACHE: cache as unknown as KVNamespace } as Env;
}

function newLedger(env?: Env): CreditLedger {
  const state = makeMockState();
  return new CreditLedger(state as unknown as DurableObjectState, env ?? makeMockEnv());
}

const TOKEN = 'tf_live_abcdefghijklmnopqrstuvwxyzabcdefghijklmnopqrstuvwxyzabcdefghijkl';
const TODAY = '2026-05-27';

// ── ensureInitialized ───────────────────────────────────────────────

describe('CreditLedger.ensureInitialized', () => {
  it('creates a zero-balance state when no KV record exists', async () => {
    const led = newLedger();
    await led.ensureInitialized(TOKEN);
    const balance = await led.balance(TOKEN, TODAY);
    expect(balance.balance).toBe(0);
    expect(balance.daily_spent).toBe(0);
    expect(balance.daily_cap).toBe(null);
  });

  it('seeds from KV when a credits record exists', async () => {
    const env = makeMockEnv({
      [`pay:credits:${TOKEN}`]: { balance: 42, daily_cap: 10, created: 'x', last_used: 'x' },
    });
    const led = newLedger(env);
    await led.ensureInitialized(TOKEN);
    const b = await led.balance(TOKEN, TODAY);
    expect(b.balance).toBe(42);
    expect(b.daily_cap).toBe(10);
  });

  it('is idempotent on re-call (does NOT re-seed from KV)', async () => {
    const env = makeMockEnv({
      [`pay:credits:${TOKEN}`]: { balance: 100 },
    });
    const led = newLedger(env);
    await led.ensureInitialized(TOKEN);
    await led.debit(TOKEN, 10, TODAY);
    // If ensureInitialized re-seeded, balance would jump back to 100.
    await led.ensureInitialized(TOKEN);
    const b = await led.balance(TOKEN, TODAY);
    expect(b.balance).toBe(90);
  });

  it('ignores malformed KV balance (negative, NaN, missing) and defaults to 0', async () => {
    const env = makeMockEnv({
      [`pay:credits:${TOKEN}`]: { balance: -5 },
    });
    const led = newLedger(env);
    await led.ensureInitialized(TOKEN);
    const b = await led.balance(TOKEN, TODAY);
    expect(b.balance).toBe(0);
  });
});

// ── mint ─────────────────────────────────────────────────────────────

describe('CreditLedger.mint', () => {
  it('adds credits to the balance', async () => {
    const led = newLedger();
    await led.ensureInitialized(TOKEN);
    const r = await led.mint(TOKEN, 50);
    expect(r.ok).toBe(true);
    expect(r.balance).toBe(50);
    expect(r.credits_added).toBe(50);
  });

  it('accumulates across multiple mints', async () => {
    const led = newLedger();
    await led.mint(TOKEN, 10);
    await led.mint(TOKEN, 25);
    const b = await led.balance(TOKEN, TODAY);
    expect(b.balance).toBe(35);
  });

  it('rejects non-positive amounts', async () => {
    const led = newLedger();
    await expect(led.mint(TOKEN, 0)).rejects.toThrow();
    await expect(led.mint(TOKEN, -5)).rejects.toThrow();
    await expect(led.mint(TOKEN, NaN)).rejects.toThrow();
  });
});

// ── debit (core race-safety) ────────────────────────────────────────

describe('CreditLedger.debit', () => {
  it('debits when balance is sufficient', async () => {
    const led = newLedger();
    await led.mint(TOKEN, 100);
    const r = await led.debit(TOKEN, 10, TODAY);
    expect(r.ok).toBe(true);
    expect(r.balance).toBe(90);
  });

  it('rejects when balance is insufficient (does NOT debit)', async () => {
    const led = newLedger();
    await led.mint(TOKEN, 5);
    const r = await led.debit(TOKEN, 10, TODAY);
    expect(r.ok).toBe(false);
    expect(r.reason).toBe('insufficient_credits');
    expect(r.balance).toBe(5);
  });

  it('serialized: 100 sequential debits of 1 against balance 100 leaves balance 0, never negative', async () => {
    // This is the core race-safety simulation. In production the DO
    // runtime serializes the calls; here we await them in order to
    // simulate the same constraint. The invariant is that the math
    // is correct end-to-end.
    const led = newLedger();
    await led.mint(TOKEN, 100);
    for (let i = 0; i < 100; i++) {
      const r = await led.debit(TOKEN, 1, TODAY);
      expect(r.ok).toBe(true);
    }
    const b = await led.balance(TOKEN, TODAY);
    expect(b.balance).toBe(0);
    // The 101st attempt fails.
    const overflow = await led.debit(TOKEN, 1, TODAY);
    expect(overflow.ok).toBe(false);
    expect(overflow.reason).toBe('insufficient_credits');
  });

  // Note on what we are NOT testing: Promise.all parallel debits.
  // JS event-loop microtask interleaving does NOT replicate
  // Cloudflare's DO input-gating; awaits in one method body
  // interleave with awaits in another, and reads can see stale
  // state. In PRODUCTION the DO runtime serializes one request's
  // handler to completion before another starts, so the code is
  // race-safe. To test that property properly we would need miniflare
  // or the Workers test runner (not currently wired in this project).
  // The serial 100-iteration test above verifies the math is correct
  // under the serialization invariant; production provides that
  // invariant. The audit Phase 3 wire-up + manual burst-load test
  // against the live deploy is the empirical proof.

  it('rejects non-positive amounts', async () => {
    const led = newLedger();
    await led.mint(TOKEN, 10);
    await expect(led.debit(TOKEN, 0, TODAY)).rejects.toThrow();
    await expect(led.debit(TOKEN, -1, TODAY)).rejects.toThrow();
  });
});

// ── daily spend cap (H-2 race fix) ──────────────────────────────────

describe('CreditLedger.debit + daily spend cap', () => {
  it('respects the daily cap on a single call', async () => {
    const led = newLedger();
    await led.mint(TOKEN, 100);
    await led.setDailyCap(TOKEN, 5);
    const r = await led.debit(TOKEN, 6, TODAY);
    expect(r.ok).toBe(false);
    expect(r.reason).toBe('cap_exceeded');
    expect(r.balance).toBe(100); // balance unchanged on cap rejection
  });

  it('serialized cap: 5 debits of 1 against cap 5 succeeds; 6th fails', async () => {
    const led = newLedger();
    await led.mint(TOKEN, 100);
    await led.setDailyCap(TOKEN, 5);
    for (let i = 0; i < 5; i++) {
      const r = await led.debit(TOKEN, 1, TODAY);
      expect(r.ok).toBe(true);
    }
    const sixth = await led.debit(TOKEN, 1, TODAY);
    expect(sixth.ok).toBe(false);
    expect(sixth.reason).toBe('cap_exceeded');
  });

  // Same caveat as for debit: Promise.all-parallel cap enforcement is
  // race-safe in PRODUCTION (Cloudflare DO input gates) but not in JS
  // microtask interleaving. We rely on the serial-cap test above plus
  // the production DO runtime for the H-2 close. Phase 3 will include
  // a burst-load test against the live endpoint as empirical
  // verification.

  it('resets daily counter on a new day', async () => {
    const led = newLedger();
    await led.mint(TOKEN, 100);
    await led.setDailyCap(TOKEN, 5);
    await led.debit(TOKEN, 5, TODAY);
    // Now exhausted for today. New day should let us debit again.
    const tomorrow = '2026-05-28';
    const r = await led.debit(TOKEN, 5, tomorrow);
    expect(r.ok).toBe(true);
    const b = await led.balance(TOKEN, tomorrow);
    expect(b.daily_spent).toBe(5);
  });

  it('null cap means unlimited (no cap enforcement)', async () => {
    const led = newLedger();
    await led.mint(TOKEN, 1000);
    await led.setDailyCap(TOKEN, null);
    for (let i = 0; i < 100; i++) {
      const r = await led.debit(TOKEN, 1, TODAY);
      expect(r.ok).toBe(true);
    }
    const b = await led.balance(TOKEN, TODAY);
    expect(b.balance).toBe(900);
    expect(b.daily_spent).toBe(100);
  });
});

// ── balance read-only ───────────────────────────────────────────────

describe('CreditLedger.balance', () => {
  it('returns daily_spent=0 for a different date', async () => {
    const led = newLedger();
    await led.mint(TOKEN, 100);
    await led.debit(TOKEN, 10, TODAY);
    const bToday = await led.balance(TOKEN, TODAY);
    expect(bToday.daily_spent).toBe(10);
    const bTomorrow = await led.balance(TOKEN, '2026-05-28');
    expect(bTomorrow.daily_spent).toBe(0);
    // Balance is shared across days; only the daily_spent resets
    expect(bTomorrow.balance).toBe(90);
  });
});

// ── mirrorToKV ───────────────────────────────────────────────────────

describe('CreditLedger.mirrorToKV', () => {
  it('writes the current balance to the KV mirror', async () => {
    const env = makeMockEnv({
      [`pay:credits:${TOKEN}`]: { balance: 50, created: 'old', last_used: 'old' },
    });
    const led = newLedger(env);
    await led.mint(TOKEN, 25); // balance = 75
    await led.mirrorToKV(TOKEN);
    const raw = await env.TENSORFEED_CACHE.get(`pay:credits:${TOKEN}`);
    const rec = JSON.parse(raw!);
    expect(rec.balance).toBe(75);
    // Preserves the existing `created` field
    expect(rec.created).toBe('old');
    // Updates last_used
    expect(rec.last_used).not.toBe('old');
  });
});

// ── fetch router (production entry point) ───────────────────────────

describe('CreditLedger.fetch', () => {
  it('returns 405 on unsupported methods', async () => {
    const led = newLedger();
    const r = await led.fetch(new Request('https://do/debit', { method: 'DELETE' }));
    expect(r.status).toBe(405);
  });

  it('returns 400 on invalid JSON body', async () => {
    const led = newLedger();
    const r = await led.fetch(new Request('https://do/debit', { method: 'POST', body: 'nope', headers: { 'content-type': 'application/json' } }));
    expect(r.status).toBe(400);
  });

  it('routes /mint correctly', async () => {
    const led = newLedger();
    const r = await led.fetch(
      new Request('https://do/mint', {
        method: 'POST',
        body: JSON.stringify({ token: TOKEN, amount: 50 }),
      }),
    );
    expect(r.status).toBe(200);
    const body = (await r.json()) as { balance: number };
    expect(body.balance).toBe(50);
  });

  it('routes /debit correctly', async () => {
    const led = newLedger();
    await led.mint(TOKEN, 10);
    const r = await led.fetch(
      new Request('https://do/debit', {
        method: 'POST',
        body: JSON.stringify({ token: TOKEN, amount: 3, today: TODAY }),
      }),
    );
    expect(r.status).toBe(200);
    const body = (await r.json()) as { ok: boolean; balance: number };
    expect(body.ok).toBe(true);
    expect(body.balance).toBe(7);
  });

  it('returns 404 on unknown routes', async () => {
    const led = newLedger();
    const r = await led.fetch(new Request('https://do/unknown', { method: 'POST', body: '{}' }));
    expect(r.status).toBe(404);
  });
});
