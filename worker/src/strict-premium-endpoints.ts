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
  // Route Verdict (2026-05-28). Signed model-routing decision fusing
  // pricing + contamination-discounted benchmarks + real usage + measured
  // latency probes + live incident-triage operational state + deprecation
  // flags. Param-required (?task= or ?model=), so strict-premium gates
  // anonymous crawlers to a clean 402 rather than a free-trial 200 on the
  // premium verdict. Free taste lives at /api/preview/route-verdict.
  '/api/premium/route-verdict',
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
  // Param-required: the handler does nothing without ?vendor=. Without
  // strict-premium it gets a free-trial slot then a 400, which catalog
  // validators (x402-surface-check) read as a broken paid route. Curated
  // premium-only security dataset, fits the moat pattern.
  '/api/premium/cve/kev-exploitation-timeline',
  // Param-required: the handler does nothing without ?package=. Without
  // strict-premium it gets a free-trial slot then a 400, which catalog
  // validators read as a broken paid route. Curated premium-only
  // cross-source security dataset (GHSA advisory affected-package
  // corroborated vs authoritative OSV + deterministic KEV/EPSS/SSVC
  // enrichment by verbatim-verified CVE id); fits the moat pattern.
  '/api/premium/security/corroborated',
  // Culled-from-advertising routes that still run as handlers (commit
  // 4082fe0, 2026-05-14). Off-thesis under the Gemini 3 audit but kept
  // live so any pre-cull callers don't break. They all require query
  // params and would otherwise return 400 under the free-trial pool;
  // strict-premium makes them emit a clean 402 instead so any scanner
  // probing the URL directly (Tate Lyman / x402-surface-check@0.2.3
  // followup on solana-foundation/pay-skills #68, 2026-05-14) reads
  // them as paid-route-shaped rather than broken.
  '/api/premium/clean/eia/series',
  '/api/premium/clean/power/daily',
  '/api/premium/climate/power/hourly',
  '/api/premium/health/fda/aggregate',
  // Wave 2 Bazaar pilots (2026-05-24). Promoted from premium-with-trial to
  // strict-premium so CDP's Bazaar crawler + x402scan see the canonical 402
  // challenge on anonymous probes rather than a free-trial 200. Each path
  // also gets a BazaarPilotConfig in worker/src/bazaar-pilots.ts. Selection
  // is "stable flat-schema GET, premium-shaped, no required params" so the
  // strict-premium tradeoff (no free-trial preview) is not a UX loss for
  // human evaluators (who can use the equivalent free siblings where they
  // exist) but is a discovery win for paying agents.
  '/api/premium/agents/directory',
  '/api/premium/research/velocity',
  '/api/premium/research/authors',
  '/api/premium/research/citation-velocity',
  '/api/premium/research/milestones',
  '/api/premium/research/emerging-keywords',
  '/api/premium/economy/recession-watch',
  '/api/premium/policy/timeline',
  '/api/premium/apis-guru/ai-feed',
  // Wave 3 Bazaar pilot (2026-05-24). Model-deprecations timeline:
  // derived-metrics view (urgency_band, days_until_sunset, migration_chain)
  // over the curated registry. Optional query params with sensible defaults,
  // so anonymous crawlers see a clean 402 challenge instead of a partial 200.
  '/api/premium/model-deprecations/timeline',
  // Wave 4 Bazaar pilot (2026-05-24). Inference-provider arbitrage view
  // over the hand-curated matrix: cross-provider price spreads, value
  // scores per provider, top arbitrage opportunities. Same anonymous-
  // crawler hygiene rationale as Wave 3.
  '/api/premium/inference-providers/arbitrage',
  // Wave 5 Bazaar pilot (2026-05-24). AI safety incidents exposure: per-
  // vendor exposure rollups over the daily-refreshed AVID snapshot.
  // Same anonymous-crawler hygiene rationale as previous waves.
  '/api/premium/ai-safety/incidents/exposure',
  // Wave 6 Bazaar pilot (2026-05-24). AI-package security radar: per-
  // package risk scoring over the daily OSV snapshot of the curated AI
  // package lists. Same anonymous-crawler hygiene rationale.
  '/api/premium/ai-safety/packages/security/radar',
  // Wave 7 Bazaar pilot (2026-05-24). Package release velocity: per-
  // package release counts + bump classification + breaking-change radar
  // over the 6-hourly PyPI/npm snapshot. Same hygiene rationale.
  '/api/premium/packages/releases/velocity',
  // Wave 8 Bazaar pilot (2026-05-24). AI velocity: first AFTA federation
  // cross-call. Pulls TerminalFeed's HF + GitHub trending leaderboards,
  // filters to AI-relevant, derives traction scoring + cross-pollination.
  '/api/premium/ai-velocity',
  // Wave 9 Bazaar pilot (2026-05-24). AI crypto pulse: second federation
  // cross-call. Joins TerminalFeed crypto-movers + funding-rates for the
  // AI-thesis token cohort. Setup classification + squeeze/chase signal.
  '/api/premium/ai-crypto-pulse',
  // Wave 10 Bazaar pilot (2026-05-24). Coding-harness weekly deltas:
  // third federation cross-call. Compares daily TerminalFeed harness
  // snapshots to surface score+rank deltas, entered/exited, leader churn.
  '/api/premium/coding-harnesses/weekly-deltas',
  // Wave 11 Bazaar pilot (2026-05-24). News action cards: first Haiku-
  // derived premium endpoint. Per-article structured action cards over
  // the daily news feed.
  '/api/premium/news/action-cards',
  // Wave 12 Bazaar pilot (2026-05-24). Status incident triage: second
  // Haiku-derived endpoint. Per-incident triage with impact +
  // recommended_action classification. Same anonymous-crawler hygiene.
  '/api/premium/status/incidents/triage',
  // ai-cves Wave 13 (2026-05-24). First TF endpoint built on DP CC's
  // Qwen-on-5090 security-xsource extraction pipeline. AI-stack CVE
  // intelligence: 99.8% sourced from GHSA (CC BY 4.0). ai-stack-cves
  // is the flagship (filter + categorize); exploited-in-wild is the
  // live-threat subset; cve lookup is param-required so it MUST be
  // strict-premium per the param-required rule (anonymous probes would
  // otherwise see 400 missing_params instead of 402).
  '/api/premium/ai-cves/ai-stack-cves',
  '/api/premium/ai-cves/exploited-in-wild',
  '/api/premium/ai-cves/cve',
  // Wave 15 (2026-05-26). AgentMail messages/batch-get pattern translated.
  // Comma-separated ids param required (?ids=CVE-A,CVE-B,...), capped at
  // 10 ids per call, 1 credit flat. Param-required so strict-premium gates
  // anonymous crawlers to a clean 402 challenge instead of 400 missing_ids.
  '/api/premium/ai-cves/batch',
  // Wave 16 (2026-05-26). AgentMail scoped+flat duplication pattern
  // translated. Five distinct paths (one per top frontier+cloud provider)
  // backed by the same Wave 12 Haiku triage snapshot, pre-scoped by the
  // path segment. Five Bazaar catalog rows so agents can discover/subscribe
  // to a specific provider's incident stream without re-deriving the
  // filter on every call. Strict-premium for anonymous-crawler hygiene
  // (same rationale as the Wave 12 parent).
  '/api/premium/status/openai/incidents/triage',
  '/api/premium/status/anthropic/incidents/triage',
  '/api/premium/status/google/incidents/triage',
  '/api/premium/status/aws/incidents/triage',
  '/api/premium/status/azure/incidents/triage',
  // Wave 17 (2026-05-26). SEC filings AI-extraction (Phase 3f.3). Three
  // premium endpoints over the DP CC Qwen-extracted AI bellwether
  // cohort. ai-flagged is the flagship (full cohort with optional
  // filters); by-form is param-required form-type rollup; ai-disclosures
  // is param-required single-filing lookup. All strict-premium so
  // anonymous crawlers see clean 402 not partial 200 / 400 missing_params.
  '/api/premium/sec/filings/ai-flagged',
  '/api/premium/sec/filings/by-form',
  '/api/premium/sec/filings/ai-disclosures',
  // Wave 18 (2026-05-26). Pro-tier whats-new. Layers Haiku 4.5 analyst
  // synthesis with per-field cited basis IDs on top of base whats-new.
  // 10 credits ($0.05) vs base at 1 credit ($0.005). Parallel.ai-style
  // tier ladder pattern.
  '/api/premium/whats-new/pro',
  // Audit H-5 (2026-05-26): decision-verified premium news endpoints
  // are param-required (cluster_id+date for lookup; q for search) but
  // weren't on the strict list. Anonymous crawler probes were burning
  // free-trial slots then 400'ing on missing params, same pay-skills
  // #68 pattern that strict-premium was created to fix.
  '/api/premium/news/decision-verified',
  '/api/premium/news/decision-verified/search',
];

/**
 * Prefix-match strict-premium paths. Used for endpoints with a slug
 * parameter (e.g. /api/premium/providers/{name}).
 */
export const STRICT_PREMIUM_PREFIXES: ReadonlyArray<string> = [
  '/api/premium/providers/',
  // Wave 14 Bazaar path-param pilots (2026-05-25). All are LLM-ready
  // single-record lookups (CVE / KEV / EPSS / OpenRouter model /
  // cross-database verified). Strict-premium gate is required because
  // anonymous Bazaar crawler probes hit the free-trial pool and the
  // handler returns 200 with the data instead of a 402 challenge, so
  // CDP never observes the settlement that would catalog the endpoint.
  // Matches the BazaarPilotConfig templates in worker/src/bazaar-pilots.ts
  // (Wave 14 block).
  '/api/premium/clean/cve/',
  '/api/premium/clean/kev/',
  '/api/premium/clean/epss/',
  '/api/premium/clean/openrouter/',
  '/api/premium/security/verified/',
  // Wave 19 Bazaar path-param pilot (2026-05-27). Per-ticker AI-company
  // intelligence envelope. Ticker is a required path segment that must
  // match the AI bellwether cohort, so anonymous Bazaar crawler probes
  // would otherwise hit the free-trial pool, miss the 402, and CDP
  // would never observe the settlement that catalogs the endpoint.
  '/api/premium/ai-companies/',
  // x402 settlement index (2026-05-27). Settlement ID is a required path
  // segment; anonymous Bazaar crawler probes would otherwise hit the
  // free-trial pool, miss the 402, and CDP would never observe the
  // settlement that catalogs the endpoint.
  '/api/premium/x402-index/',
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
