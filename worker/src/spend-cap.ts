import { Env } from './types';

/**
 * Per-token daily credit-spend cap (defense-in-depth).
 *
 * The circuit breaker (worker/src/circuit-breaker.ts) limits *request rate*
 * per token: 20 identical reqs/min and 100 varied reqs/min. That stops
 * naive runaway loops, but a leaked token attached to a clever agent
 * spread across many isolates can still drain a 1000-credit balance in
 * minutes if pacing stays under the burn-rate threshold.
 *
 * This module adds a second axis of protection: a per-token daily
 * credit-spend ceiling that is OPTIONAL. Tokens without a cap behave
 * exactly as before (no cap = unlimited daily spend, bounded only by
 * balance). Tokens with a cap can spend at most `daily_cap` credits per
 * UTC day regardless of how big the balance is.
 *
 * Designed to be self-service: token owners set their own cap via
 * `/api/payment/spend-cap`. Useful when you mint a token for a flaky new
 * agent and want a blast-radius limit.
 *
 * KV layout (TENSORFEED_CACHE):
 *   pay:credits:{token}  -> CreditsRecord, gains optional `daily_cap?: number | null`
 *   pay:spend:{token}:{YYYY-MM-DD}  -> { credits: number } (TTL 48h)
 *
 * The 48h TTL covers the UTC boundary plus a generous grace period so a
 * cron / restart cannot accidentally clear a still-relevant counter.
 *
 * Race condition: read-inc-write on the daily counter is not atomic in
 * Workers KV. Two simultaneous calls can each read N, both write N+cost,
 * leaving the counter undercounted by `cost`. Acceptable: the cap is a
 * soft limit to bound damage, not an exact accountant. Worst case across
 * a multi-isolate burst is roughly `isolates * cost` credits over the
 * cap, which is the same order of magnitude as the rate limiter's
 * cross-isolate slack. Same tradeoff posture as `circuit-breaker.ts`.
 */

const SPEND_TTL_SECONDS = 48 * 60 * 60; // 48h

export interface DailySpendRecord {
  credits: number;
}

export const dailySpentKey = (token: string, date: string): string =>
  `pay:spend:${token}:${date}`;

export const todayUTC = (): string => new Date().toISOString().slice(0, 10);

export async function getDailySpent(env: Env, token: string, date?: string): Promise<number> {
  const key = dailySpentKey(token, date ?? todayUTC());
  const record = (await env.TENSORFEED_CACHE.get(key, 'json')) as DailySpendRecord | null;
  return record?.credits ?? 0;
}

export async function incrementDailySpent(
  env: Env,
  token: string,
  credits: number,
  date?: string,
): Promise<number> {
  if (credits <= 0) return getDailySpent(env, token, date);
  const d = date ?? todayUTC();
  const key = dailySpentKey(token, d);
  const existing = (await env.TENSORFEED_CACHE.get(key, 'json')) as DailySpendRecord | null;
  const next = (existing?.credits ?? 0) + credits;
  await env.TENSORFEED_CACHE.put(
    key,
    JSON.stringify({ credits: next } satisfies DailySpendRecord),
    { expirationTtl: SPEND_TTL_SECONDS },
  );
  return next;
}

export interface SpendCapCheck {
  allowed: boolean;
  daily_spent: number;
  daily_cap: number | null;
  remaining: number | null;
  would_exceed_by: number;
  reset_at: string; // next UTC midnight
}

export function nextUTCMidnight(now: Date = new Date()): string {
  const next = new Date(Date.UTC(
    now.getUTCFullYear(),
    now.getUTCMonth(),
    now.getUTCDate() + 1,
    0, 0, 0, 0,
  ));
  return next.toISOString();
}

/**
 * Check whether the caller's pending charge would exceed the daily cap.
 * Pure computation given inputs; no KV writes.
 *
 * - cap=null/undefined: always allowed (no cap configured).
 * - cap<=0: edge case treated as "no cap" so a misconfig does not
 *   permanently lock out the token. Setting a 0 cap is meaningless.
 */
export function evaluateSpendCap(
  cap: number | null | undefined,
  dailySpent: number,
  pendingCost: number,
  now: Date = new Date(),
): SpendCapCheck {
  const dailyCap = typeof cap === 'number' && cap > 0 ? cap : null;
  if (dailyCap === null) {
    return {
      allowed: true,
      daily_spent: dailySpent,
      daily_cap: null,
      remaining: null,
      would_exceed_by: 0,
      reset_at: nextUTCMidnight(now),
    };
  }
  const projected = dailySpent + Math.max(0, pendingCost);
  const allowed = projected <= dailyCap;
  return {
    allowed,
    daily_spent: dailySpent,
    daily_cap: dailyCap,
    remaining: Math.max(0, dailyCap - dailySpent),
    would_exceed_by: allowed ? 0 : projected - dailyCap,
    reset_at: nextUTCMidnight(now),
  };
}

/**
 * High-level check used by requirePayment. Reads today's spend from KV
 * and runs evaluateSpendCap against the supplied cap + pending cost.
 */
export async function checkSpendCap(
  env: Env,
  token: string,
  cap: number | null | undefined,
  pendingCost: number,
): Promise<SpendCapCheck> {
  if (typeof cap !== 'number' || cap <= 0) {
    return evaluateSpendCap(cap, 0, pendingCost);
  }
  const dailySpent = await getDailySpent(env, token);
  return evaluateSpendCap(cap, dailySpent, pendingCost);
}

const VALID_CAP_RANGE = { min: 1, max: 1_000_000 };

export interface SpendCapValidation {
  ok: boolean;
  error?: string;
  value?: number | null;
}

/**
 * Validate a user-supplied cap value. Accepts a positive integer in
 * the range [1, 1_000_000], or null / explicit 0 to clear the cap.
 */
export function validateSpendCap(input: unknown): SpendCapValidation {
  if (input === null) return { ok: true, value: null };
  if (input === 0) return { ok: true, value: null }; // 0 means "clear"
  if (typeof input !== 'number' || !Number.isFinite(input)) {
    return { ok: false, error: 'cap_must_be_number_or_null' };
  }
  if (!Number.isInteger(input)) {
    return { ok: false, error: 'cap_must_be_integer' };
  }
  if (input < VALID_CAP_RANGE.min || input > VALID_CAP_RANGE.max) {
    return { ok: false, error: `cap_out_of_range_${VALID_CAP_RANGE.min}_to_${VALID_CAP_RANGE.max}` };
  }
  return { ok: true, value: input };
}

export const SPEND_CAP_LIMITS = VALID_CAP_RANGE;
