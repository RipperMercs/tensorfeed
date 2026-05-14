/**
 * Strict-premium endpoints.
 *
 * The 30% slice of the premium catalog that does NOT honor the per-IP
 * free-trial bypass implemented in rate-limit.ts
 * (FREE_TRIAL_LIMIT_PER_DAY = 100). Calls to these paths from a
 * client without a valid Bearer token or X-PAYMENT header fall
 * straight through to the canonical x402 challenge.
 *
 * Rationale: historical time-series with full windows, heavy
 * multi-source aggregations, and curated premium-only datasets are
 * TensorFeed's moat. Each has a clearly premium-shaped use case
 * (bulk-export, derived analytics) where "try before buy" provides
 * no signal an agent could not already get from the free-7-day-capped
 * siblings (pricing_series_free, benchmark_series_free, etc).
 *
 * Adding a new path here is a deliberate decision. The 70/30
 * weighting is intentional during the demand-discovery phase; see
 * the project_premium_lock_strategy memory.
 *
 * NOTE: the per-call PRICE is unchanged by this module. Strict-premium
 * endpoints stay at their existing 1-credit ($0.02) tier. The
 * structural change here is only "the free trial does not apply." A
 * separate future commit may reprice these into a higher tier; that
 * decision is intentionally NOT bundled with this gate so the demand
 * signals from each change are readable independently.
 */

/**
 * Exact-match strict-premium paths.
 */
export const STRICT_PREMIUM_PATHS: ReadonlyArray<string> = [
  '/api/premium/history/pricing/series',
  '/api/premium/history/benchmarks/series',
  '/api/premium/history/status/uptime',
  '/api/premium/status/leaderboard',
  '/api/premium/probe/series',
  '/api/premium/funding/exposure',
  '/api/premium/packages/pypi/momentum',
  // Re-added 2026-05-14 for CDP debugging. Ethan Oroshiba (x402 team)
  // on GitHub #2207 needs the endpoint to return 402 to anonymous GET
  // so he can inspect our bazaar metadata. Roll back to plain trial
  // after debugging concludes.
  '/api/premium/whats-new',
];

/**
 * Prefix-match strict-premium paths. Used for endpoints with a slug
 * parameter (e.g. /api/premium/providers/{name}).
 */
export const STRICT_PREMIUM_PREFIXES: ReadonlyArray<string> = [
  '/api/premium/providers/',
];

/**
 * True if the request path is on the strict-premium list. Used by
 * requirePayment() in payments.ts to bypass the free-trial pool.
 */
export function isStrictPremiumPath(path: string): boolean {
  if (STRICT_PREMIUM_PATHS.includes(path)) return true;
  for (const prefix of STRICT_PREMIUM_PREFIXES) {
    if (path.startsWith(prefix)) return true;
  }
  return false;
}
