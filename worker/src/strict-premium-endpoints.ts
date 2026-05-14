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
  // Bazaar pilot endpoints. Each path here also lives in BAZAAR_PILOTS in
  // worker/src/bazaar-pilots.ts so the 402 response carries the bazaar
  // extension. Strict-premium status is required because CDP's Bazaar
  // crawler (and x402scan's) probe anonymously and must see a 402, not
  // the free-trial 200. Wave 1 added /routing + /compare/models +
  // /cost/projection (2026-05-14), the highest-leverage "decision-ready"
  // endpoints per Kimi K2.6's external analysis. Trade is loss of
  // free-trial UX on these three; gain is x402scan/Bazaar registration
  // for the agent-discovery path. Per project_premium_lock_strategy 70/30
  // framework this puts the ratio at ~30% strict, the boundary.
  '/api/premium/whats-new',
  '/api/premium/routing',
  '/api/premium/compare/models',
  '/api/premium/cost/projection',
  // Parameter-required historical + security routes. Without strict-premium
  // designation, anonymous probes from x402-surface-check (pay-skills) and
  // similar tools were granted a free-trial slot, then immediately rejected
  // with 400 missing_params, since these handlers require ?date=, ?from=&to=,
  // or ?cve_id= to do anything. Catalog validators read the 400 as a broken
  // paid route. Reported by Tate Lyman on solana-foundation/pay-skills #68
  // (2026-05-14) via x402-surface-check@0.2.2 against the live manifest.
  // Strict-premium gate fixes this for all anonymous crawlers, not just
  // surface-check: any tool probing without payment now sees the canonical
  // x402 402 challenge. These endpoints fit the moat pattern anyway (full-
  // window historical ranges and curated security datasets).
  '/api/premium/history/news/full',
  '/api/premium/history/news/source-health',
  '/api/premium/history/news/clusters/full',
  '/api/premium/history/news/verified',
  '/api/premium/security/cve/range',
  '/api/premium/security/kev/series',
  '/api/premium/security/epss/series',
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
