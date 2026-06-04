/**
 * Machine-readable premium catalog (the "what can I buy" surface).
 *
 * Served free at GET /api/meta/premium. One free call lets an agent
 * enumerate every PAYABLE TensorFeed endpoint with its credit cost, its
 * query parameters, what it returns, its free sibling (if any), and the
 * strict-premium flag. This is the conversion precondition: an agent
 * decides what to buy here before spending a single credit.
 *
 * SOURCES OF TRUTH (this file is COMPILED from them, never the reverse):
 *  - worker/src/index.ts premium handlers. The CREDIT COST is the tier
 *    argument to that handler's requirePayment(request, env, tier) call
 *    mapped through TIER_COSTS in payments.ts ({1:1, 2:1, 3:5, 4:10}), so
 *    the `credits` field below is the REAL charged amount, not the tier.
 *    The params come from the handler's url.searchParams.get(...) reads
 *    (a read with a default is optional; a read the handler 400s without
 *    is required). The path is the handler's `path === '...'` (or, for
 *    slug endpoints, the regex prefix rendered as a {param} template).
 *  - worker/src/strict-premium-endpoints.ts isStrictPremiumPath(): the
 *    `strict_premium` flag below mirrors it exactly.
 *  - the /api/meta premium* description strings: the `returns` one-liners
 *    and the free_sibling links are distilled from them.
 *
 * DRIFT GUARD: premium-catalog.test.ts reads index.ts as text and asserts
 * every premium handler path is present here (so adding a handler without
 * a catalog row FAILS the suite), that every row maps to a real handler
 * (no phantom rows), and that each row's strict_premium matches
 * isStrictPremiumPath. Keep this file honest by fixing the catalog, never
 * by weakening that test.
 *
 * Every premium response settles in USDC on Base via x402 and returns an
 * Ed25519-signed AFTA receipt, so `signed` is true on every entry.
 */

import { isStrictPremiumPath } from './strict-premium-endpoints';

export interface PremiumEndpoint {
  /** The request path. Slug endpoints use a {param} template (e.g. {ticker}). */
  path: string;
  /** Real credit cost charged on a successful paid call (1 credit = $0.02). */
  credits: number;
  /** True if the path bypasses the per-IP free-trial pool (clean 402 to anonymous callers). */
  strict_premium: boolean;
  /** Query (or path-template) parameters the handler reads. required = the handler does nothing without it. */
  params: { name: string; required: boolean }[];
  /** One-line summary of what a paid call returns. */
  returns: string;
  /** A free endpoint that returns a capped or raw taste of the same data, or null. */
  free_sibling: string | null;
  /** Every premium response carries an Ed25519-signed AFTA receipt. */
  signed: true;
  /** Grouping bucket for catalog navigation. */
  category: string;
}

/**
 * ONE entry per PAYABLE premium endpoint. Exact-match handlers use their
 * literal path; slug handlers use a {param} template. The free
 * management routes GET /api/premium/watches and
 * GET|DELETE /api/premium/watches/{id} are intentionally absent: they
 * require a bearer token but charge zero credits, so they are not part of
 * the buyable catalog (documented exclusion mirrored in the drift test).
 */
export const PREMIUM_CATALOG: PremiumEndpoint[] = [
  // === HISTORY ===
  {
    path: '/api/premium/history/pricing/series',
    credits: 1,
    strict_premium: true,
    params: [
      { name: 'model', required: false },
      { name: 'from', required: false },
      { name: 'to', required: false },
    ],
    returns: 'Full model-pricing time series across a date range (free sibling caps at 7 days).',
    free_sibling: '/api/history/pricing/series',
    signed: true,
    category: 'history',
  },
  {
    path: '/api/premium/history/benchmarks/series',
    credits: 1,
    strict_premium: true,
    params: [
      { name: 'model', required: false },
      { name: 'benchmark', required: false },
      { name: 'from', required: false },
      { name: 'to', required: false },
    ],
    returns: 'Full benchmark-score time series across a date range (free sibling caps at 7 days).',
    free_sibling: '/api/history/benchmarks/series',
    signed: true,
    category: 'history',
  },
  {
    path: '/api/premium/history/status/uptime',
    credits: 1,
    strict_premium: true,
    params: [
      { name: 'provider', required: false },
      { name: 'from', required: false },
      { name: 'to', required: false },
    ],
    returns: 'Full provider-uptime time series across a date range (free sibling caps at 7 days).',
    free_sibling: '/api/history/status/uptime',
    signed: true,
    category: 'history',
  },
  {
    path: '/api/premium/history/news/full',
    credits: 1,
    strict_premium: true,
    params: [
      { name: 'date', required: false },
      { name: 'from', required: false },
      { name: 'to', required: false },
    ],
    returns: 'Full untruncated daily news snapshots, single-date or range up to 30 days.',
    free_sibling: '/api/history/news',
    signed: true,
    category: 'history',
  },
  {
    path: '/api/premium/history/news/source-health',
    credits: 1,
    strict_premium: true,
    params: [
      { name: 'from', required: false },
      { name: 'to', required: false },
    ],
    returns: 'Per-source RSS reliability series up to 90 days.',
    free_sibling: '/api/history/news/sources',
    signed: true,
    category: 'history',
  },
  {
    path: '/api/premium/history/news/clusters/full',
    credits: 1,
    strict_premium: true,
    params: [
      { name: 'date', required: false },
      { name: 'from', required: false },
      { name: 'to', required: false },
    ],
    returns: 'Full untruncated cross-source story clusters, single-date or 30-day range.',
    free_sibling: '/api/history/news/clusters',
    signed: true,
    category: 'history',
  },
  {
    path: '/api/premium/history/news/verified',
    credits: 1,
    strict_premium: true,
    params: [
      { name: 'date', required: false },
      { name: 'from', required: false },
      { name: 'to', required: false },
      { name: 'min_sources', required: false },
    ],
    returns: 'The verified feed: story clusters with N or more independent corroborating sources (default 4).',
    free_sibling: '/api/history/news/clusters',
    signed: true,
    category: 'history',
  },

  // === VERDICT ===
  {
    path: '/api/premium/routing',
    credits: 1,
    strict_premium: true,
    params: [
      { name: 'task', required: false },
      { name: 'budget', required: false },
      { name: 'min_quality', required: false },
      { name: 'top_n', required: false },
      { name: 'w_quality', required: false },
      { name: 'w_availability', required: false },
      { name: 'w_cost', required: false },
      { name: 'w_latency', required: false },
    ],
    returns: 'Top-N ranked models with full score breakdown, pricing, status, and component detail.',
    free_sibling: '/api/preview/routing',
    signed: true,
    category: 'verdict',
  },
  {
    path: '/api/premium/route-verdict',
    credits: 1,
    strict_premium: true,
    params: [
      { name: 'task', required: false },
      { name: 'model', required: false },
      { name: 'max_latency_p95_ms', required: false },
      { name: 'require_operational', required: false },
      { name: 'exclude_deprecated', required: false },
    ],
    returns: 'Single best model to use now plus runners-up, fusing pricing, capability, usage, latency, and live incident state.',
    free_sibling: '/api/preview/route-verdict',
    signed: true,
    category: 'verdict',
  },
  {
    path: '/api/premium/provider-reliability-verdict',
    credits: 1,
    strict_premium: true,
    params: [],
    returns: 'Dependability ranking of probed frontier providers fusing availability and tail consistency.',
    free_sibling: '/api/preview/provider-reliability-verdict',
    signed: true,
    category: 'verdict',
  },
  {
    path: '/api/premium/x402-settlement-verdict',
    credits: 1,
    strict_premium: true,
    params: [{ name: 'window', required: false }],
    returns: 'Ruling on the Base x402 USDC settlement market: momentum, concentration (HHI), and leading publisher.',
    free_sibling: '/api/preview/x402-settlement-verdict',
    signed: true,
    category: 'verdict',
  },
  {
    path: '/api/premium/stack-safety-verdict',
    credits: 1,
    strict_premium: true,
    params: [{ name: 'packages', required: true }],
    returns: 'GO/HOLD/BLOCK deploy gate per AI-stack package, fusing the AI-CVE batch and CISA KEV.',
    free_sibling: '/api/preview/stack-safety-verdict',
    signed: true,
    category: 'verdict',
  },
  {
    path: '/api/premium/benchmark-trust-verdict',
    credits: 1,
    strict_premium: true,
    params: [
      { name: 'benchmark', required: false },
      { name: 'category', required: false },
    ],
    returns: 'Trust band plus 0-100 score per benchmark, flagging saturation and contamination with a down-weight recommendation.',
    free_sibling: '/api/preview/benchmark-trust-verdict',
    signed: true,
    category: 'verdict',
  },
  {
    path: '/api/premium/failover-verdict',
    credits: 1,
    strict_premium: true,
    params: [
      { name: 'from', required: true },
      { name: 'task', required: false },
    ],
    returns: 'Best operational failover target when a provider degrades, with incident reason and ranked alternatives.',
    free_sibling: '/api/preview/failover-verdict',
    signed: true,
    category: 'verdict',
  },

  // === INTELLIGENCE ===
  {
    path: '/api/premium/model-intelligence',
    credits: 1,
    strict_premium: true,
    params: [{ name: 'model', required: false }],
    returns: 'Full per-model TFII breakdown over the latest daily snapshot: headline score, per-task subscores, and the trust block; ?model= narrows to one model.',
    free_sibling: '/api/intelligence',
    signed: true,
    category: 'intelligence',
  },
  {
    path: '/api/premium/model-intelligence/history',
    credits: 1,
    strict_premium: true,
    params: [
      { name: 'model', required: true },
      { name: 'from', required: false },
      { name: 'to', required: false },
    ],
    returns: 'A single model TFII time series across the dated snapshots within the requested window.',
    free_sibling: '/api/intelligence',
    signed: true,
    category: 'intelligence',
  },
  {
    path: '/api/premium/substrate-changelog/history',
    credits: 1,
    strict_premium: true,
    params: [{ name: 'from', required: true }, { name: 'to', required: true }, { name: 'event_type', required: false }],
    returns: 'Full forward-only changelog of model lifecycle events (added, removed, repriced, deprecated), agent-protocol spec versions, and agent-framework releases across a date range, filterable by event type.',
    free_sibling: '/api/substrate-changelog/recent',
    signed: true,
    category: 'intelligence',
  },

  // === SECURITY ===
  {
    path: '/api/premium/security/cve/range',
    credits: 1,
    strict_premium: true,
    params: [
      { name: 'from', required: true },
      { name: 'to', required: true },
    ],
    returns: 'CVE IDs added across a UTC date range, max 30 days.',
    free_sibling: '/api/security/cve/by-date/{YYYY-MM-DD}',
    signed: true,
    category: 'security',
  },
  {
    path: '/api/premium/security/kev/full',
    credits: 1,
    strict_premium: true,
    params: [],
    returns: 'Full untruncated CISA KEV catalog (~1500+ entries).',
    free_sibling: '/api/security/kev',
    signed: true,
    category: 'security',
  },
  {
    path: '/api/premium/security/kev/series',
    credits: 1,
    strict_premium: true,
    params: [
      { name: 'from', required: true },
      { name: 'to', required: true },
    ],
    returns: 'Daily KEV catalog additions across a date range, max 90 days.',
    free_sibling: '/api/security/kev/added/{YYYY-MM-DD}',
    signed: true,
    category: 'security',
  },
  {
    path: '/api/premium/security/epss/series',
    credits: 1,
    strict_premium: true,
    params: [{ name: 'cve_id', required: true }],
    returns: 'Full historical EPSS exploitation-likelihood time series for one CVE.',
    free_sibling: '/api/security/epss/{CVE-id}',
    signed: true,
    category: 'security',
  },
  {
    path: '/api/premium/security/epss/top',
    credits: 1,
    strict_premium: true,
    params: [
      { name: 'date', required: false },
      { name: 'limit', required: false },
    ],
    returns: 'Top-N highest-EPSS CVEs as of any UTC date.',
    free_sibling: '/api/security/epss/top',
    signed: true,
    category: 'security',
  },
  {
    path: '/api/premium/security/corroborated',
    credits: 1,
    strict_premium: true,
    params: [{ name: 'package', required: true }],
    returns: 'Full corroborated GHSA advisory set for one package, enriched by verbatim-verified CVE id with explicit provenance.',
    free_sibling: '/api/security/osv/package',
    signed: true,
    category: 'security',
  },
  {
    path: '/api/premium/security/ghsa/ai-feed',
    credits: 1,
    strict_premium: true,
    params: [],
    returns: 'All GHSA advisory types across all ecosystems filtered to AI keywords, with derived severity, age, and relevance.',
    free_sibling: '/api/security/ai-supply-chain-iocs.json',
    signed: true,
    category: 'security',
  },
  {
    path: '/api/premium/cve/kev-exploitation-timeline',
    credits: 1,
    strict_premium: true,
    params: [{ name: 'vendor', required: true }],
    returns: 'Per-vendor exploited-in-the-wild history: disclosure-to-KEV lag, patch status, ransomware association, severity mix.',
    free_sibling: null,
    signed: true,
    category: 'security',
  },
  {
    path: '/api/premium/clean/cve/{cve_id}',
    credits: 1,
    strict_premium: true,
    params: [{ name: 'cve_id', required: true }],
    returns: 'LLM-ready CVE record: ~80% token reduction vs raw MITRE v5.2, derived severity_band, flat affected_products.',
    free_sibling: '/api/security/cve/{CVE-id}',
    signed: true,
    category: 'security',
  },
  {
    path: '/api/premium/clean/kev/{cve_id}',
    credits: 1,
    strict_premium: true,
    params: [{ name: 'cve_id', required: true }],
    returns: 'LLM-ready KEV entry with normalized ransomware_use enum and extracted notes_urls.',
    free_sibling: '/api/security/kev/{CVE-id}',
    signed: true,
    category: 'security',
  },
  {
    path: '/api/premium/clean/epss/{cve_id}',
    credits: 1,
    strict_premium: true,
    params: [
      { name: 'cve_id', required: true },
      { name: 'series', required: false },
    ],
    returns: 'LLM-ready EPSS score with derived risk_band; optional series=true returns first/min/max summary.',
    free_sibling: '/api/security/epss/{CVE-id}',
    signed: true,
    category: 'security',
  },
  {
    path: '/api/premium/security/verified/{cve_id}',
    credits: 1,
    strict_premium: true,
    params: [{ name: 'cve_id', required: true }],
    returns: 'Cross-database CVE fact card composing MITRE, KEV, EPSS, OSV, and Vulnrichment with a confirmed_by array.',
    free_sibling: '/api/security/cve/{CVE-id}',
    signed: true,
    category: 'security',
  },
  {
    path: '/api/premium/security/ssvc-verdict',
    credits: 1,
    strict_premium: true,
    params: [{ name: 'cve', required: true }],
    returns:
      'The CISA SSVC Coordinator decision (Act, Attend, Track, or Track*) for one CVE, computed from the recorded decision points and returned as the full low/medium/high Mission and Well-being envelope with a per-level reasoning trace, plus a KEV cross-check that flags and recomputes the decision when the recorded Exploitation understates a CVE now on the CISA KEV catalog.',
    free_sibling: '/api/preview/security/ssvc-verdict',
    signed: true,
    category: 'security',
  },

  // === SEC ===
  {
    path: '/api/premium/sec/filings/ai-flagged',
    credits: 1,
    strict_premium: true,
    params: [
      { name: 'ticker', required: false },
      { name: 'form', required: false },
      { name: 'limit', required: false },
    ],
    returns: 'Full AI-bellwether cohort of Qwen-extracted AI-flagged SEC filings with optional filters.',
    free_sibling: '/api/sec/filings/recent',
    signed: true,
    category: 'sec',
  },
  {
    path: '/api/premium/sec/filings/by-form',
    credits: 1,
    strict_premium: true,
    params: [{ name: 'form', required: true }],
    returns: 'Form-type rollup of AI-flagged SEC filings across the bellwether cohort.',
    free_sibling: '/api/sec/filings/recent',
    signed: true,
    category: 'sec',
  },
  {
    path: '/api/premium/sec/filings/ai-disclosures',
    credits: 1,
    strict_premium: true,
    params: [{ name: 'accession', required: true }],
    returns: 'Single-filing AI-disclosure extraction for one accession.',
    free_sibling: '/api/sec/filings/recent',
    signed: true,
    category: 'sec',
  },
  {
    path: '/api/premium/sec/filings/guidance-delta',
    credits: 1,
    strict_premium: true,
    params: [
      { name: 'accession', required: false },
      { name: 'ticker', required: false },
      { name: 'form', required: false },
    ],
    returns: 'Did this 10-K/10-Q materially change guidance vs the prior same-form filing, with the exact changed sentences quoted.',
    free_sibling: '/api/preview/sec/filings/guidance-delta',
    signed: true,
    category: 'sec',
  },

  // === RESEARCH ===
  {
    path: '/api/premium/research/velocity',
    credits: 1,
    strict_premium: true,
    params: [],
    returns: 'Per-institution AI research velocity over the OpenAlex 365-day baseline plus a fresh 30-day window.',
    free_sibling: '/api/research/institutions/ai',
    signed: true,
    category: 'research',
  },
  {
    path: '/api/premium/research/authors',
    credits: 1,
    strict_premium: true,
    params: [],
    returns: 'Top 100 AI authors by 365-day publication volume, enriched with h_index, citations, affiliation, ORCID.',
    free_sibling: null,
    signed: true,
    category: 'research',
  },
  {
    path: '/api/premium/research/citation-velocity',
    credits: 1,
    strict_premium: true,
    params: [],
    returns: 'Top 100 recent AI papers ranked by share of total citations gained in the most recent year.',
    free_sibling: null,
    signed: true,
    category: 'research',
  },
  {
    path: '/api/premium/research/milestones',
    credits: 1,
    strict_premium: true,
    params: [],
    returns: 'Last 30 days of arXiv preprints flagged as milestone candidates by offline Qwen extraction, with structured reasoning.',
    free_sibling: '/api/papers/arxiv-recent',
    signed: true,
    category: 'research',
  },
  {
    path: '/api/premium/research/emerging-keywords',
    credits: 1,
    strict_premium: true,
    params: [],
    returns: 'Top-50 multi-word arXiv keyphrases ranked by recent-vs-baseline lift, with example arxiv_ids.',
    free_sibling: '/api/papers/arxiv-recent',
    signed: true,
    category: 'research',
  },
  {
    path: '/api/premium/research/topic-search',
    credits: 1,
    strict_premium: true,
    params: [
      { name: 'subfield_tag', required: false },
      { name: 'methodology_bucket', required: false },
      { name: 'since', required: false },
      { name: 'until', required: false },
      { name: 'milestone_only', required: false },
      { name: 'limit', required: false },
      { name: 'offset', required: false },
    ],
    returns: 'Structured arXiv search over the TF derived taxonomy (subfield + methodology dimensions arXiv lacks).',
    free_sibling: '/api/papers/arxiv-recent',
    signed: true,
    category: 'research',
  },
  {
    path: '/api/premium/research/lab-productivity',
    credits: 1,
    strict_premium: true,
    params: [
      { name: 'window', required: false },
      { name: 'affiliation_type', required: false },
      { name: 'limit', required: false },
    ],
    returns: 'Top labs by paper count over 30d/90d/365d windows from TF normalized affiliations.',
    free_sibling: '/api/papers/arxiv-recent',
    signed: true,
    category: 'research',
  },

  // === FUNDING ===
  {
    path: '/api/premium/funding/exposure',
    credits: 5,
    strict_premium: true,
    params: [],
    returns: 'Silicon-vendor concentration shares, circular-loop classification, top recipients, and co-investor pairs.',
    free_sibling: '/api/funding/portfolio',
    signed: true,
    category: 'funding',
  },
  {
    path: '/api/premium/funding/federal/momentum',
    credits: 1,
    strict_premium: false,
    params: [],
    returns: 'Signed leadership and concentration ruling over the federal AI-spending snapshot, with the cohort leader and top-2 share.',
    free_sibling: '/api/funding/federal/summary',
    signed: true,
    category: 'funding',
  },
  {
    path: '/api/premium/procurement/ai-contracts/demand',
    credits: 1,
    strict_premium: true,
    params: [],
    returns: 'Signed federal AI procurement demand read: agency concentration (top-agency share and HHI), emerging contractors winning AI work beyond the known vendor cohort, and the top buying agencies.',
    free_sibling: '/api/procurement/ai-contracts',
    signed: true,
    category: 'funding',
  },
  {
    path: '/api/premium/procurement/ai-opportunities/deadlines',
    credits: 1,
    strict_premium: true,
    params: [],
    returns: 'Full ranked pipeline of open federal AI contract opportunities (SAM.gov) sorted by response deadline, each with days remaining, set-aside type, buying agency, and the direct solicitation link.',
    free_sibling: '/api/procurement/ai-opportunities',
    signed: true,
    category: 'funding',
  },

  // === COMPUTE ===
  {
    path: '/api/premium/ai-datacenters/buildout',
    credits: 1,
    strict_premium: true,
    params: [],
    returns: 'Aggregate of the AI datacenter buildout: disclosed power (MW) and capex totals by operator, region, and status, plus the forward commissioning calendar of sites coming online.',
    free_sibling: '/api/ai-datacenters',
    signed: true,
    category: 'compute',
  },

  // === STATUS ===
  {
    path: '/api/premium/status/leaderboard',
    credits: 5,
    strict_premium: true,
    params: [
      { name: 'from', required: false },
      { name: 'to', required: false },
    ],
    returns: 'Full date-range cross-provider uptime ranking including incident_count and mttr_minutes per provider.',
    free_sibling: '/api/status/leaderboard',
    signed: true,
    category: 'status',
  },
  {
    path: '/api/premium/status/incidents/triage',
    credits: 1,
    strict_premium: true,
    params: [
      { name: 'provider', required: false },
      { name: 'impact', required: false },
      { name: 'recommended_action', required: false },
      { name: 'capability', required: false },
      { name: 'ongoing_only', required: false },
    ],
    returns: 'Full incident cohort with provider/impact/action/capability filters and rollups, Haiku-triaged.',
    free_sibling: '/api/status/incidents/triage',
    signed: true,
    category: 'status',
  },
  {
    path: '/api/premium/status/{provider}/incidents/triage',
    credits: 1,
    strict_premium: true,
    params: [{ name: 'provider', required: true }],
    returns: 'Per-provider Haiku-triaged incident stream pre-scoped by the path segment (openai/anthropic/google/aws/azure).',
    free_sibling: '/api/status/incidents/triage',
    signed: true,
    category: 'status',
  },
  {
    path: '/api/premium/probe/series',
    credits: 5,
    strict_premium: true,
    params: [
      { name: 'provider', required: false },
      { name: 'from', required: false },
      { name: 'to', required: false },
    ],
    returns: 'Measured latency-probe time series for a provider across a date range.',
    free_sibling: '/api/probe/latest',
    signed: true,
    category: 'status',
  },

  // === X402 ===
  {
    path: '/api/premium/x402-index/publisher/{domain}',
    credits: 1,
    strict_premium: true,
    params: [
      { name: 'domain', required: true },
      { name: 'from', required: false },
      { name: 'to', required: false },
    ],
    returns: 'Per-publisher x402 USDC settlement receipt feed for one domain across an inclusive date range, with rollups.',
    free_sibling: '/api/x402-index/publishers',
    signed: true,
    category: 'x402',
  },
  {
    path: '/api/premium/x402-index/series',
    credits: 1,
    strict_premium: true,
    params: [
      { name: 'metric', required: false },
      { name: 'granularity', required: false },
      { name: 'from', required: false },
      { name: 'to', required: false },
      { name: 'domain', required: false },
    ],
    returns: 'Time series of ecosystem or per-publisher x402 settlement volume / count across a date range.',
    free_sibling: '/api/x402-index/summary',
    signed: true,
    category: 'x402',
  },
  {
    path: '/api/premium/x402-registry/series',
    credits: 1,
    strict_premium: true,
    params: [
      { name: 'from', required: false },
      { name: 'to', required: false },
    ],
    returns: 'Daily x402 publisher-registry drift over a 90-day window: reachability, federation count, endpoint totals, churn.',
    free_sibling: '/api/x402-registry/snapshot',
    signed: true,
    category: 'x402',
  },
  {
    path: '/api/premium/x402-publisher-verdict',
    credits: 1,
    strict_premium: true,
    params: [{ name: 'domain', required: true }],
    returns: 'Signed trust verdict on a single x402 publisher: whether its Base payTo is actively settling, its 30-day settlement momentum, and a shared-wallet risk flag, with the settlement evidence.',
    free_sibling: '/api/preview/x402-publisher-verdict',
    signed: true,
    category: 'x402',
  },

  // === MCP ===
  {
    path: '/api/premium/mcp/registry/series',
    credits: 1,
    strict_premium: true,
    params: [
      { name: 'from', required: false },
      { name: 'to', required: false },
    ],
    returns: 'Daily MCP-registry drift time series across a date range.',
    free_sibling: '/api/mcp/registry/snapshot',
    signed: true,
    category: 'mcp',
  },

  // === PACKAGES ===
  {
    path: '/api/premium/packages/releases/velocity',
    credits: 1,
    strict_premium: true,
    params: [
      { name: 'ecosystem', required: false },
      { name: 'category', required: false },
      { name: 'package', required: false },
      { name: 'min_releases_7d', required: false },
    ],
    returns: 'Per-package release velocity, latest bump_kind, breaking-change radar, and notable movers.',
    free_sibling: '/api/packages/releases',
    signed: true,
    category: 'packages',
  },
  {
    path: '/api/premium/packages/pypi/momentum',
    credits: 5,
    strict_premium: true,
    params: [],
    returns: 'Momentum and velocity ratio per AI/ML PyPI package with direction classification and notable movers.',
    free_sibling: '/api/packages/pypi/ai-trending',
    signed: true,
    category: 'packages',
  },

  // === MISC ===
  {
    path: '/api/premium/agents/leaderboard/full',
    credits: 1,
    strict_premium: true,
    params: [
      { name: 'metric', required: false },
      { name: 'window', required: false },
    ],
    returns: 'Untruncated reputation leaderboard with full cards for every ranked agent (free sibling caps at 25).',
    free_sibling: '/api/agents/leaderboard',
    signed: true,
    category: 'misc',
  },
  {
    path: '/api/premium/agents/directory',
    credits: 1,
    strict_premium: true,
    params: [
      { name: 'category', required: false },
      { name: 'status', required: false },
      { name: 'open_source', required: false },
      { name: 'capability', required: false },
      { name: 'sort', required: false },
      { name: 'limit', required: false },
    ],
    returns: 'Full filterable agent-ecosystem directory cohort.',
    free_sibling: '/api/agents/directory',
    signed: true,
    category: 'misc',
  },
  {
    path: '/api/premium/jobs',
    credits: 1,
    strict_premium: true,
    params: [
      { name: 'category', required: false },
      { name: 'q', required: false },
      { name: 'status', required: false },
    ],
    returns: 'Full and filtered agent-work listing cohort; removed listings are never served.',
    free_sibling: '/api/jobs',
    signed: true,
    category: 'misc',
  },
  {
    path: '/api/premium/news/decision-verified',
    credits: 1,
    strict_premium: true,
    params: [
      { name: 'cluster_id', required: true },
      { name: 'date', required: false },
    ],
    returns: 'Structured verification scores for one corroboration cluster: tier, source diversity, time span, per-source breakdown.',
    free_sibling: '/api/history/news/clusters',
    signed: true,
    category: 'misc',
  },
  {
    path: '/api/premium/news/decision-verified/search',
    credits: 1,
    strict_premium: true,
    params: [
      { name: 'q', required: true },
      { name: 'since', required: false },
      { name: 'until', required: false },
      { name: 'min_sources', required: false },
      { name: 'limit', required: false },
    ],
    returns: 'Search recent days for clusters whose hero title matches a query, ranked by match score then source count.',
    free_sibling: '/api/history/news/clusters',
    signed: true,
    category: 'misc',
  },
  {
    path: '/api/premium/news/action-cards',
    credits: 1,
    strict_premium: true,
    params: [
      { name: 'capability', required: false },
      { name: 'urgency', required: false },
      { name: 'min_cost_impact', required: false },
      { name: 'min_security_impact', required: false },
      { name: 'query', required: false },
    ],
    returns: 'Full Haiku-derived agent action-card cohort with capability/urgency/impact filters and rollups.',
    free_sibling: '/api/news/action-cards',
    signed: true,
    category: 'misc',
  },
  {
    path: '/api/premium/news/search',
    credits: 1,
    strict_premium: false,
    params: [
      { name: 'q', required: false },
      { name: 'from', required: false },
      { name: 'to', required: false },
      { name: 'provider', required: false },
      { name: 'category', required: false },
      { name: 'limit', required: false },
    ],
    returns: 'Full-text search over the historical news corpus with date, provider, and category filters.',
    free_sibling: '/api/history/news',
    signed: true,
    category: 'misc',
  },
  {
    path: '/api/premium/attention/series',
    credits: 1,
    strict_premium: true,
    params: [
      { name: 'provider', required: false },
      { name: 'from', required: false },
      { name: 'to', required: false },
    ],
    returns: 'Daily attention-index time series for a provider across a date range.',
    free_sibling: '/api/attention/history',
    signed: true,
    category: 'misc',
  },
  {
    path: '/api/premium/openrouter/series',
    credits: 1,
    strict_premium: true,
    params: [
      { name: 'from', required: false },
      { name: 'to', required: false },
    ],
    returns: 'Daily OpenRouter cross-provider catalog drift over a 90-day window with price-change and churn counts.',
    free_sibling: '/api/openrouter/models',
    signed: true,
    category: 'misc',
  },
  {
    path: '/api/premium/hf/velocity',
    credits: 1,
    strict_premium: true,
    params: [
      { name: 'from', required: false },
      { name: 'to', required: false },
    ],
    returns: 'Daily Hugging Face download-velocity over a 90-day window with entered/exited churn and window gainers.',
    free_sibling: '/api/hf/trending',
    signed: true,
    category: 'misc',
  },
  {
    path: '/api/premium/ai-cves/ai-stack-cves',
    credits: 1,
    strict_premium: true,
    params: [
      { name: 'category', required: false },
      { name: 'severity', required: false },
      { name: 'limit', required: false },
    ],
    returns: 'AI-stack CVE intelligence (filter + categorize) over the Qwen security-xsource extraction, 99.8% GHSA-sourced.',
    free_sibling: '/api/security/ai-supply-chain-iocs.json',
    signed: true,
    category: 'misc',
  },
  {
    path: '/api/premium/ai-cves/exploited-in-wild',
    credits: 1,
    strict_premium: true,
    params: [{ name: 'limit', required: false }],
    returns: 'The live-threat subset of AI-stack CVEs known exploited in the wild.',
    free_sibling: '/api/security/kev',
    signed: true,
    category: 'misc',
  },
  {
    path: '/api/premium/ai-cves/cve',
    credits: 1,
    strict_premium: true,
    params: [{ name: 'cve_id', required: true }],
    returns: 'Single AI-stack CVE record lookup from the extraction pipeline.',
    free_sibling: '/api/security/cve/{CVE-id}',
    signed: true,
    category: 'misc',
  },
  {
    path: '/api/premium/ai-cves/batch',
    credits: 1,
    strict_premium: true,
    params: [{ name: 'ids', required: true }],
    returns: 'Batch lookup of up to 10 AI-stack CVE records by comma-separated ids.',
    free_sibling: '/api/security/cve/{CVE-id}',
    signed: true,
    category: 'misc',
  },
  {
    path: '/api/premium/ai-companies/{ticker}',
    credits: 1,
    strict_premium: true,
    params: [{ name: 'ticker', required: true }],
    returns: 'Per-ticker AI intelligence envelope: latest filings, news, funding, and cohort metadata in one round trip.',
    free_sibling: '/api/sec/filings/recent',
    signed: true,
    category: 'misc',
  },
  {
    path: '/api/premium/ai-crawler-access/full',
    credits: 1,
    strict_premium: false,
    params: [],
    returns: 'Every tracked domain with per-bot robots.txt verdicts, llms.txt and ai.txt flags, plus sector rollups.',
    free_sibling: '/api/ai-crawler-access/summary.json',
    signed: true,
    category: 'misc',
  },
  {
    path: '/api/premium/ai-crawler-access/changes',
    credits: 1,
    strict_premium: true,
    params: [
      { name: 'from', required: true },
      { name: 'to', required: true },
      { name: 'domain', required: false },
    ],
    returns: 'Historical flip log of robots.txt access changes (allowed to blocked, or new llms.txt) across a date range.',
    free_sibling: '/api/ai-crawler-access/site',
    signed: true,
    category: 'misc',
  },
  {
    path: '/api/premium/agent-ready/full',
    credits: 1,
    strict_premium: false,
    params: [],
    returns: 'Full per-domain agent-readiness dataset: a transparent 0-100 score, tier, and which agent surfaces (x402, agent.json, openapi, llms.txt, crawlable, ai.txt) each domain exposes.',
    free_sibling: '/api/agent-ready/summary.json',
    signed: true,
    category: 'misc',
  },
  {
    path: '/api/premium/hf-leaderboard/movers',
    credits: 1,
    strict_premium: true,
    params: [{ name: 'window', required: false }],
    returns:
      'Period-over-period movers on the Open LLM Leaderboard v2: rank climbers and fallers, average and per-benchmark score deltas, models entered and exited, new per-benchmark leaders, and license changes, diffed across TensorFeed dated snapshots.',
    free_sibling: '/api/hf-leaderboard/latest',
    signed: true,
    category: 'research',
  },
  {
    path: '/api/premium/coding-harnesses/weekly-deltas',
    credits: 1,
    strict_premium: true,
    params: [
      { name: 'days_back', required: false },
      { name: 'harness', required: false },
      { name: 'benchmark', required: false },
      { name: 'model', required: false },
      { name: 'min_abs_delta', required: false },
    ],
    returns: 'Score and rank deltas vs a prior coding-harness snapshot, gainers/regressions, entered/exited, leader churn.',
    free_sibling: '/api/coding-harnesses/latest',
    signed: true,
    category: 'misc',
  },
  {
    path: '/api/premium/ai-crypto-pulse',
    credits: 1,
    strict_premium: true,
    params: [
      { name: 'token', required: false },
      { name: 'setup', required: false },
      { name: 'min_abs_change_pct', required: false },
    ],
    returns: 'AI-token price moves joined with venue-weighted funding-rate skew, with per-token setup classification.',
    free_sibling: '/api/ai-crypto-pulse',
    signed: true,
    category: 'misc',
  },
  {
    path: '/api/premium/ai-velocity',
    credits: 1,
    strict_premium: true,
    params: [
      { name: 'pipeline', required: false },
      { name: 'language', required: false },
      { name: 'min_traction', required: false },
      { name: 'cross_only', required: false },
    ],
    returns: 'AI-velocity ranking plus cross-pollination over the federated HF and GitHub trending snapshot.',
    free_sibling: '/api/ai-velocity',
    signed: true,
    category: 'misc',
  },
  {
    path: '/api/premium/ai-safety/packages/security/radar',
    credits: 1,
    strict_premium: true,
    params: [
      { name: 'ecosystem', required: false },
      { name: 'category', required: false },
      { name: 'package', required: false },
      { name: 'min_risk_score', required: false },
    ],
    returns: 'Per-package risk_score (0-100) over the OSV snapshot with risk_band, notable movers, and rollups.',
    free_sibling: '/api/ai-safety/packages/security',
    signed: true,
    category: 'misc',
  },
  {
    path: '/api/premium/ai-safety/incidents/exposure',
    credits: 1,
    strict_premium: true,
    params: [
      { name: 'vendor', required: false },
      { name: 'risk_domain', required: false },
      { name: 'within_days', required: false },
    ],
    returns: 'Per-developer and per-deployer incident exposure rollups over the AVID snapshot with recency-weighted scores.',
    free_sibling: '/api/ai-safety/incidents/avid',
    signed: true,
    category: 'misc',
  },
  {
    path: '/api/premium/inference-providers/arbitrage',
    credits: 1,
    strict_premium: true,
    params: [
      { name: 'family', required: false },
      { name: 'min_savings_pct', required: false },
    ],
    returns: 'Cross-provider arbitrage analytics over the inference-providers matrix: spreads, value scores, top opportunities.',
    free_sibling: '/api/inference-providers/cheapest',
    signed: true,
    category: 'misc',
  },
  {
    path: '/api/premium/model-deprecations/timeline',
    credits: 1,
    strict_premium: true,
    params: [
      { name: 'within_days', required: false },
      { name: 'provider', required: false },
    ],
    returns: 'Window-centered model-deprecation timeline with urgency_band, days_until_sunset, and a resolved migration_chain.',
    free_sibling: '/api/model-deprecations',
    signed: true,
    category: 'misc',
  },
  {
    path: '/api/premium/apis-guru/ai-feed',
    credits: 1,
    strict_premium: true,
    params: [],
    returns: 'AI-relevant entries from the APIs.guru directory with first_seen diffing and a newly-added-last-7d array.',
    free_sibling: null,
    signed: true,
    category: 'misc',
  },
  {
    path: '/api/premium/policy/timeline',
    credits: 1,
    strict_premium: true,
    params: [
      { name: 'days_back', required: false },
      { name: 'days_forward', required: false },
      { name: 'jurisdiction', required: false },
    ],
    returns: 'Forward and backward calendar over the AI policy registry with next-3-milestones and days-until-effective.',
    free_sibling: '/api/policy/ai/registry',
    signed: true,
    category: 'misc',
  },
  {
    path: '/api/premium/whats-new',
    credits: 1,
    strict_premium: true,
    params: [
      { name: 'days', required: false },
      { name: 'news_limit', required: false },
    ],
    returns: 'Morning brief over the last 24h of news, models, status, and ecosystem deltas.',
    free_sibling: '/api/today',
    signed: true,
    category: 'misc',
  },
  {
    path: '/api/premium/whats-new/pro',
    credits: 10,
    strict_premium: true,
    params: [
      { name: 'days', required: false },
      { name: 'news_limit', required: false },
    ],
    returns: 'Pro morning brief: base payload plus a Haiku analyst summary, cited key takeaways, and recommended actions.',
    free_sibling: '/api/today',
    signed: true,
    category: 'misc',
  },
  {
    path: '/api/premium/recent',
    credits: 1,
    strict_premium: true,
    params: [{ name: 'limit', required: false }],
    returns: 'Sub-hourly recent-changes feed, the higher-cadence sibling of the whats-new brief.',
    free_sibling: '/api/today',
    signed: true,
    category: 'misc',
  },
  {
    path: '/api/premium/compare/models',
    credits: 1,
    strict_premium: true,
    params: [{ name: 'ids', required: true }],
    returns: 'Side-by-side comparison of multiple models by id across pricing, capability, and status.',
    free_sibling: '/api/models',
    signed: true,
    category: 'misc',
  },
  {
    path: '/api/premium/cost/projection',
    credits: 1,
    strict_premium: true,
    params: [
      { name: 'model', required: true },
      { name: 'input_tokens_per_day', required: false },
      { name: 'output_tokens_per_day', required: false },
      { name: 'horizon', required: false },
    ],
    returns: 'Projected spend per model over a horizon given daily token volumes.',
    free_sibling: '/api/models',
    signed: true,
    category: 'misc',
  },
  {
    path: '/api/premium/providers/{name}',
    credits: 5,
    strict_premium: true,
    params: [{ name: 'name', required: true }],
    returns: 'One paid provider deep-dive envelope composing pricing, status, and capability for a single provider.',
    free_sibling: '/api/status',
    signed: true,
    category: 'misc',
  },
  {
    path: '/api/premium/watches',
    credits: 1,
    strict_premium: false,
    params: [{ name: 'spec', required: true }],
    returns: 'Register a webhook watch (POST); HMAC-signed callback fires when the spec condition triggers. 1 credit per registration.',
    free_sibling: '/api/watches/free',
    signed: true,
    category: 'misc',
  },
];

/**
 * Build the served catalog: the entries sorted by category then path,
 * with a count, the min/max credit cost, per-category counts, a short
 * note, and the attribution line. Pure function over PREMIUM_CATALOG so
 * the handler stays a one-liner and the unit test can assert the shape.
 */
export function buildPremiumCatalog(): {
  ok: true;
  count: number;
  credit_range: { min: number; max: number };
  categories: Record<string, number>;
  endpoints: PremiumEndpoint[];
  note: string;
  attribution: string;
} {
  const endpoints = [...PREMIUM_CATALOG].sort((a, b) => {
    if (a.category !== b.category) return a.category < b.category ? -1 : 1;
    return a.path < b.path ? -1 : a.path > b.path ? 1 : 0;
  });

  const credits = endpoints.map((e) => e.credits);
  const categories: Record<string, number> = {};
  for (const e of endpoints) {
    categories[e.category] = (categories[e.category] ?? 0) + 1;
  }

  return {
    ok: true,
    count: endpoints.length,
    credit_range: { min: Math.min(...credits), max: Math.max(...credits) },
    categories,
    endpoints,
    note: 'All premium endpoints settle in USDC on Base via x402 and return an Ed25519-signed AFTA receipt; free callers get a 50-credit welcome bonus on first payment.',
    attribution: 'TensorFeed.ai premium catalog. 1 credit = $0.02. See /developers/agent-payments for the payment flow.',
  };
}
