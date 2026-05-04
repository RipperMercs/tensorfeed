/**
 * Per-token circuit breaker for premium endpoints.
 *
 * Two layers of protection, both keyed off a non-secret token prefix:
 *
 *   1. Identical-request breaker (TUPLE_THRESHOLD): trips when one
 *      bearer token issues more than TUPLE_THRESHOLD requests with
 *      the SAME path + sorted query inside WINDOW_MS. Catches naive
 *      while(true) loops.
 *
 *   2. Burn-rate breaker (BURN_RATE_THRESHOLD): trips when one bearer
 *      token issues more than BURN_RATE_THRESHOLD requests inside
 *      WINDOW_MS regardless of path/query. Catches loops that vary
 *      the URL on each call (e.g. appending a random nonce param) and
 *      would otherwise sail past the identical-request layer.
 *
 * Identical = same path + sorted query string. Body is excluded
 * because every premium endpoint is GET; if a future POST endpoint
 * needs body-aware fingerprinting, hash it into the tuple key.
 *
 * State lives in two isolate-local Maps. Cloudflare typically pins a
 * given client to the same isolate, so repeated requests from one
 * agent will hit the same counters. A loop that gets distributed
 * across isolates (rare in practice for steady traffic from one
 * source) will leak through, but the worst-case still gives the
 * agent a soft slowdown rather than the hard stop a single isolate
 * would enforce. We accept this tradeoff to avoid burning KV budget
 * on a defense-in-depth check.
 *
 * To keep the Maps bounded, we GC entries whose timestamps have all
 * fallen out of the window when each Map grows past MAX_TRACKED_KEYS.
 */

const WINDOW_MS = 60_000;
const TUPLE_THRESHOLD = 20;          // 21st identical request in 60s trips the per-tuple breaker
const BURN_RATE_THRESHOLD = 100;     // 101st request from one token in 60s trips the burn-rate breaker
const TUPLE_COOLDOWN_SECONDS = 120;
const BURN_RATE_COOLDOWN_SECONDS = 300;
const MAX_TRACKED_KEYS = 5000;

interface BreakerState {
  // Sliding window of request timestamps for this key. Old entries are
  // evicted on every check.
  timestamps: number[];
  // Once tripped, refuse all matching requests until this timestamp.
  cooldownUntil?: number;
}

const tupleTracker = new Map<string, BreakerState>();
const burnRateTracker = new Map<string, BreakerState>();

export type TripKind = 'identical_request' | 'burn_rate';

export interface CircuitBreakerCheck {
  tripped: boolean;
  trip_kind: TripKind | null;
  count: number;                      // count for whichever layer is most-loaded
  cooldown_seconds?: number;
  retry_after_unix_ms?: number;
}

/**
 * Check both circuit breaker layers for the (token, path, query) tuple.
 * Always records the current call against both trackers so subsequent
 * calls accumulate; trips fire on the request that crosses either
 * threshold. The burn-rate layer is checked first because it's the
 * broader signal; if both trip on the same request, burn-rate wins
 * since it implies wider misbehavior.
 *
 * `tokenShort` is a non-secret prefix used purely as the lookup key
 * so we never persist the full bearer token in memory. The caller
 * should pass `token.slice(0, 16)` or similar.
 */
export function checkCircuitBreaker(
  tokenShort: string,
  path: string,
  query: string,
  now: number = Date.now(),
): CircuitBreakerCheck {
  const tupleKey = `${tokenShort}|${path}|${query}`;
  const burnKey = tokenShort;
  const windowStart = now - WINDOW_MS;

  // ── Burn-rate layer (per-token aggregate) ──────────────────────────
  const burnExisting = burnRateTracker.get(burnKey);
  if (burnExisting?.cooldownUntil && burnExisting.cooldownUntil > now) {
    return {
      tripped: true,
      trip_kind: 'burn_rate',
      count: burnExisting.timestamps.length,
      cooldown_seconds: Math.ceil((burnExisting.cooldownUntil - now) / 1000),
      retry_after_unix_ms: burnExisting.cooldownUntil,
    };
  }
  const burnRecent = (burnExisting?.timestamps ?? []).filter((t) => t >= windowStart);
  burnRecent.push(now);
  if (burnRecent.length > BURN_RATE_THRESHOLD) {
    const cooldownUntil = now + BURN_RATE_COOLDOWN_SECONDS * 1000;
    burnRateTracker.set(burnKey, { timestamps: burnRecent, cooldownUntil });
    maybeGarbageCollect(now);
    return {
      tripped: true,
      trip_kind: 'burn_rate',
      count: burnRecent.length,
      cooldown_seconds: BURN_RATE_COOLDOWN_SECONDS,
      retry_after_unix_ms: cooldownUntil,
    };
  }
  burnRateTracker.set(burnKey, { timestamps: burnRecent });

  // ── Identical-request layer (per (token, path, query) tuple) ───────
  const tupleExisting = tupleTracker.get(tupleKey);
  if (tupleExisting?.cooldownUntil && tupleExisting.cooldownUntil > now) {
    return {
      tripped: true,
      trip_kind: 'identical_request',
      count: tupleExisting.timestamps.length,
      cooldown_seconds: Math.ceil((tupleExisting.cooldownUntil - now) / 1000),
      retry_after_unix_ms: tupleExisting.cooldownUntil,
    };
  }
  const tupleRecent = (tupleExisting?.timestamps ?? []).filter((t) => t >= windowStart);
  tupleRecent.push(now);
  if (tupleRecent.length > TUPLE_THRESHOLD) {
    const cooldownUntil = now + TUPLE_COOLDOWN_SECONDS * 1000;
    tupleTracker.set(tupleKey, { timestamps: tupleRecent, cooldownUntil });
    maybeGarbageCollect(now);
    return {
      tripped: true,
      trip_kind: 'identical_request',
      count: tupleRecent.length,
      cooldown_seconds: TUPLE_COOLDOWN_SECONDS,
      retry_after_unix_ms: cooldownUntil,
    };
  }
  tupleTracker.set(tupleKey, { timestamps: tupleRecent });
  maybeGarbageCollect(now);

  // Surface the more-loaded counter so the caller can include a useful
  // count in observability metrics even when nothing trips.
  const surfacedCount = Math.max(tupleRecent.length, burnRecent.length);
  return { tripped: false, trip_kind: null, count: surfacedCount };
}

function maybeGarbageCollect(now: number): void {
  if (tupleTracker.size > MAX_TRACKED_KEYS) gcMap(tupleTracker, now);
  if (burnRateTracker.size > MAX_TRACKED_KEYS) gcMap(burnRateTracker, now);
}

function gcMap(map: Map<string, BreakerState>, now: number): void {
  const windowStart = now - WINDOW_MS;
  for (const [k, v] of map) {
    const stillCoolingDown = v.cooldownUntil && v.cooldownUntil > now;
    const hasRecent = v.timestamps.some((t) => t >= windowStart);
    if (!stillCoolingDown && !hasRecent) {
      map.delete(k);
    }
  }
}

export function _resetCircuitBreakerForTests(): void {
  tupleTracker.clear();
  burnRateTracker.clear();
}

export const CIRCUIT_BREAKER_LIMITS = {
  WINDOW_MS,
  // Legacy alias kept for any external caller that read THRESHOLD;
  // points at the per-tuple threshold which was the only one before
  // the burn-rate layer existed.
  THRESHOLD: TUPLE_THRESHOLD,
  TUPLE_THRESHOLD,
  BURN_RATE_THRESHOLD,
  // Legacy alias for the per-tuple cooldown.
  COOLDOWN_SECONDS: TUPLE_COOLDOWN_SECONDS,
  TUPLE_COOLDOWN_SECONDS,
  BURN_RATE_COOLDOWN_SECONDS,
  MAX_TRACKED_KEYS,
};
