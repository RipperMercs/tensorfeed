/**
 * CreditLedger Durable Object.
 *
 * Per-token DO instance that owns the canonical credit balance and the
 * daily-spend counter. Cloudflare serializes access to a single DO
 * instance, so all read-modify-write operations on these counters are
 * race-safe by construction. Replaces the KV last-write-wins shape that
 * was the root cause of audit findings H-1 (bearer credit-debit TOCTOU)
 * and H-2 (daily spend-cap parallel bypass) from the 2026-05-26 premium
 * backend audit. See tensorfeed-work/tier2-races/DESIGN.md.
 *
 * **Phase 2 status (this file):** scaffold only. The class is registered
 * as a DO binding in wrangler.toml, exported from index.ts so Cloudflare
 * can instantiate it, and unit-tested in isolation. NO production call
 * sites wire through this yet. The legacy KV-only debit + spend-cap
 * paths in payments.ts are still authoritative until Phase 3.
 *
 * Migration model:
 * - Lazy initialization from KV snapshot on first DO touch per token.
 *   The DO reads `pay:credits:{token}` once and seeds its storage; from
 *   then on, the DO is source of truth.
 * - Every state change is mirrored back to KV (eventually consistent)
 *   so the public read endpoints (`/api/payment/balance` and friends)
 *   continue to serve current data without paying the DO read cost.
 * - Tokens never touched by the DO continue to live in KV-only mode
 *   per the legacy code path until Phase 3 cuts the new path in.
 *
 * Test pattern: the public methods accept the token as an arg and
 * touch `this.state.storage` directly. A mock state harness covers
 * all the race-affected operations without requiring miniflare.
 */

import type { Env } from './types';

// ─── Internal storage shape ─────────────────────────────────────────

/** Daily spend counter. Resets when `date` changes. */
interface DailySpend {
  date: string;       // YYYY-MM-DD
  amount: number;     // credits spent today
}

interface CreditLedgerState {
  balance: number;
  /** When the DO was first initialized from KV (or freshly created). */
  initialized_at: string;
  /** Per-day spend tracking. Reset semantics handled per-call. */
  daily_spend: DailySpend | null;
  /** Per-token daily spend cap. null = unlimited. Mirrors CreditsRecord.daily_cap. */
  daily_cap: number | null;
}

// ─── Public result shapes ───────────────────────────────────────────

export interface DebitResult {
  ok: boolean;
  balance: number;
  reason?: 'insufficient_credits' | 'cap_exceeded' | 'not_initialized';
}

export interface MintResult {
  ok: true;
  balance: number;
  credits_added: number;
}

export interface BalanceResult {
  ok: true;
  balance: number;
  daily_spent: number;
  daily_cap: number | null;
}

// ─── The Durable Object class ──────────────────────────────────────

export class CreditLedger {
  state: DurableObjectState;
  env: Env;

  constructor(state: DurableObjectState, env: Env) {
    this.state = state;
    this.env = env;
  }

  /**
   * Lazy initialization from KV. Reads `pay:credits:{token}` once per
   * token-instance and seeds the DO storage. After the first touch,
   * the DO is source of truth; the KV mirror is for read-side caching
   * on the public balance endpoint. Idempotent on re-call.
   */
  async ensureInitialized(token: string): Promise<void> {
    const initialized = await this.state.storage.get<string>('initialized_at');
    if (initialized) return;

    // Read the KV snapshot for this token. If it exists, seed state;
    // if not, create an empty zero-balance state so subsequent ops
    // have a coherent starting point.
    const raw = await this.env.TENSORFEED_CACHE.get(`pay:credits:${token}`, 'json');
    const seed: CreditLedgerState = {
      balance: 0,
      initialized_at: new Date().toISOString(),
      daily_spend: null,
      daily_cap: null,
    };
    if (raw && typeof raw === 'object' && raw !== null) {
      const rec = raw as { balance?: unknown; daily_cap?: unknown };
      if (typeof rec.balance === 'number' && Number.isFinite(rec.balance) && rec.balance >= 0) {
        seed.balance = rec.balance;
      }
      if (typeof rec.daily_cap === 'number' && Number.isFinite(rec.daily_cap) && rec.daily_cap >= 0) {
        seed.daily_cap = rec.daily_cap;
      }
    }
    await this.state.storage.put({
      balance: seed.balance,
      initialized_at: seed.initialized_at,
      daily_spend: seed.daily_spend,
      daily_cap: seed.daily_cap,
    });
  }

  /**
   * Read-only balance + spend state. Used by the public read paths.
   */
  async balance(token: string, today: string): Promise<BalanceResult> {
    await this.ensureInitialized(token);
    const balance = (await this.state.storage.get<number>('balance')) ?? 0;
    const stored = await this.state.storage.get<DailySpend>('daily_spend');
    const daily_spent = stored && stored.date === today ? stored.amount : 0;
    const daily_cap = (await this.state.storage.get<number | null>('daily_cap')) ?? null;
    return { ok: true, balance, daily_spent, daily_cap };
  }

  /**
   * Add credits to the balance. Used by the mint path (welcome bonus,
   * settle confirmation). Single-threaded inside the DO, so race-safe.
   */
  async mint(token: string, amount: number): Promise<MintResult> {
    if (!Number.isFinite(amount) || amount <= 0) {
      throw new Error('mint amount must be positive');
    }
    await this.ensureInitialized(token);
    const balance = (await this.state.storage.get<number>('balance')) ?? 0;
    const next = balance + amount;
    await this.state.storage.put('balance', next);
    return { ok: true, balance: next, credits_added: amount };
  }

  /**
   * Debit credits with optional daily-spend-cap enforcement. All checks
   * and writes serialized inside the DO. Closes the H-1 + H-2 races.
   *
   * `today` is the YYYY-MM-DD bucket the caller wants to track against.
   * Pass the same date for parallel calls; the DO's serialization is
   * what makes them safe.
   *
   * Cap semantics: if daily_cap is null, no cap is enforced. If set,
   * (daily_spent + amount) must be <= cap or the call returns
   * { ok:false, reason:'cap_exceeded' } without debiting.
   */
  async debit(token: string, amount: number, today: string): Promise<DebitResult> {
    if (!Number.isFinite(amount) || amount <= 0) {
      throw new Error('debit amount must be positive');
    }
    await this.ensureInitialized(token);

    const balance = (await this.state.storage.get<number>('balance')) ?? 0;
    const daily_cap = (await this.state.storage.get<number | null>('daily_cap')) ?? null;
    const stored = await this.state.storage.get<DailySpend>('daily_spend');
    const daily_spent = stored && stored.date === today ? stored.amount : 0;

    if (balance < amount) {
      return { ok: false, balance, reason: 'insufficient_credits' };
    }
    if (daily_cap !== null && daily_spent + amount > daily_cap) {
      return { ok: false, balance, reason: 'cap_exceeded' };
    }

    const nextBalance = balance - amount;
    const nextSpend: DailySpend = { date: today, amount: daily_spent + amount };
    await this.state.storage.put({
      balance: nextBalance,
      daily_spend: nextSpend,
    });
    // Auto-mirror after a successful debit so the legacy KV reader paths
    // (the public /api/payment/balance endpoint + the upstream
    // checkSpendCap pre-flight) see fresh data. Adds ~10ms to the
    // commit hot path; tolerable trade-off for keeping both readers
    // correct without a separate ctx.waitUntil from the caller (which
    // commitPayment does not have access to). KV is eventually
    // consistent but the DO is source of truth.
    await this.mirrorToKV(token);
    return { ok: true, balance: nextBalance };
  }

  /**
   * Set the daily cap (operator-controlled per-token preference).
   * Pass null to clear the cap.
   */
  async setDailyCap(token: string, cap: number | null): Promise<void> {
    if (cap !== null && (!Number.isFinite(cap) || cap < 0)) {
      throw new Error('daily_cap must be null or a non-negative number');
    }
    await this.ensureInitialized(token);
    await this.state.storage.put('daily_cap', cap);
  }

  /**
   * Mirror current state to KV so the public balance endpoint
   * (`/api/payment/balance` read path) and the legacy `checkSpendCap`
   * reader continue to serve fresh data without paying DO read cost
   * on every request. Eventually consistent; the DO is source of
   * truth.
   *
   * Writes TWO KV keys when daily_spend is non-null:
   *   - `pay:credits:{token}` (balance + daily_cap, merged with existing
   *     fields so we preserve `created`, `agent_ua`, `total_purchased`)
   *   - `pay:spend:{token}:{date}` (daily_spent for the current bucket)
   *
   * The legacy `checkSpendCap` reader hits the spend key on every
   * pre-flight; without the mirror, post-Phase-3 deploys would see a
   * stale spend counter and let over-cap requests through pre-flight
   * (the DO would still reject at commit time, but that wastes a
   * handler invocation). The mirror keeps both readers correct.
   */
  async mirrorToKV(token: string): Promise<void> {
    const balance = (await this.state.storage.get<number>('balance')) ?? 0;
    const daily_cap = (await this.state.storage.get<number | null>('daily_cap')) ?? null;
    const daily_spend = await this.state.storage.get<DailySpend>('daily_spend');
    // Read existing CreditsRecord so we preserve fields we don't own
    // (created, last_used, agent_ua, total_purchased, etc).
    const existing = (await this.env.TENSORFEED_CACHE.get(`pay:credits:${token}`, 'json')) as
      | Record<string, unknown>
      | null;
    const merged: Record<string, unknown> = existing ? { ...existing } : {};
    merged.balance = balance;
    if (daily_cap !== null) merged.daily_cap = daily_cap;
    merged.last_used = new Date().toISOString();
    const writes: Promise<void>[] = [
      this.env.TENSORFEED_CACHE.put(`pay:credits:${token}`, JSON.stringify(merged)),
    ];
    if (daily_spend) {
      // Mirror the daily spend counter to the legacy KV key so the
      // best-effort `checkSpendCap` upstream reader sees fresh data.
      // 48h TTL matches the legacy `pay:spend:{token}:{date}` shape.
      writes.push(
        this.env.TENSORFEED_CACHE.put(
          `pay:spend:${token}:${daily_spend.date}`,
          JSON.stringify({ daily_spent: daily_spend.amount }),
          { expirationTtl: 48 * 60 * 60 },
        ),
      );
    }
    await Promise.all(writes);
  }

  // ─── HTTP fetch router (production entry point) ──────────────────

  /**
   * Production callers reach the DO via `stub.fetch(request)`. The
   * router below translates HTTP routes to the public methods above.
   * In tests we call the methods directly; this router is exercised
   * only when the binding is live.
   */
  async fetch(request: Request): Promise<Response> {
    const url = new URL(request.url);
    if (request.method !== 'POST' && request.method !== 'GET') {
      return new Response(JSON.stringify({ ok: false, error: 'method_not_allowed' }), {
        status: 405,
        headers: { 'content-type': 'application/json' },
      });
    }
    let body: Record<string, unknown> = {};
    if (request.method === 'POST') {
      try {
        body = (await request.json()) as Record<string, unknown>;
      } catch {
        return new Response(JSON.stringify({ ok: false, error: 'invalid_json' }), {
          status: 400,
          headers: { 'content-type': 'application/json' },
        });
      }
    }
    const token = typeof body.token === 'string' ? body.token : '';
    const amount = typeof body.amount === 'number' ? body.amount : NaN;
    const today = typeof body.today === 'string' ? body.today : '';

    try {
      if (url.pathname === '/debit' && request.method === 'POST') {
        const r = await this.debit(token, amount, today);
        return jsonOK(r);
      }
      if (url.pathname === '/mint' && request.method === 'POST') {
        const r = await this.mint(token, amount);
        return jsonOK(r);
      }
      if (url.pathname === '/balance' && request.method === 'POST') {
        const r = await this.balance(token, today);
        return jsonOK(r);
      }
      if (url.pathname === '/set-daily-cap' && request.method === 'POST') {
        const cap = body.daily_cap;
        await this.setDailyCap(token, cap === null ? null : typeof cap === 'number' ? cap : NaN);
        return jsonOK({ ok: true });
      }
      if (url.pathname === '/mirror-to-kv' && request.method === 'POST') {
        await this.mirrorToKV(token);
        return jsonOK({ ok: true });
      }
    } catch (err) {
      return new Response(
        JSON.stringify({ ok: false, error: 'internal', detail: String(err).slice(0, 200) }),
        { status: 500, headers: { 'content-type': 'application/json' } },
      );
    }
    return new Response(JSON.stringify({ ok: false, error: 'not_found' }), {
      status: 404,
      headers: { 'content-type': 'application/json' },
    });
  }
}

function jsonOK(payload: unknown): Response {
  return new Response(JSON.stringify(payload), {
    status: 200,
    headers: { 'content-type': 'application/json' },
  });
}

// ─── Helper for callers ──────────────────────────────────────────────

/**
 * Get the DO stub for a token. Per-token instance: idFromName(token)
 * deterministically maps each token to a single DO instance regardless
 * of which Cloudflare PoP issued the request, so all reads + writes
 * for a token serialize. NOT YET CALLED FROM PRODUCTION (Phase 2
 * scaffold only); call sites move over in Phase 3.
 */
export function getCreditLedger(env: Env, token: string): DurableObjectStub | null {
  // The binding is optional in the Env type so node-env test fixtures
  // don't need to stub a DurableObjectNamespace; in production deploy
  // it is always present per wrangler.toml. A null return here is
  // therefore a misconfig signal, not a runtime expectation. Phase 3
  // callers will fail closed (fall back to legacy KV path) on null.
  if (!env.CREDIT_LEDGER) return null;
  const id = env.CREDIT_LEDGER.idFromName(token);
  return env.CREDIT_LEDGER.get(id);
}
