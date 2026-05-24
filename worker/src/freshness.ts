/**
 * Per-endpoint data-freshness SLA registry.
 *
 * Each premium endpoint declares a freshness commitment: how stale
 * underlying data is allowed to be before the response is no-charge.
 * If the data backing a response was captured longer ago than the SLA
 * permits, the bearer is not charged the credit for that call. The
 * receipt records `no_charge_reason: "stale_data"` and the response
 * carries a `stale: true` flag so the agent knows to retry later.
 *
 * `null` means "no freshness SLA applies." Two cases produce null:
 *   - Historical / immutable data (e.g. dated series queries): the
 *     answer for 2026-04-15 is the same forever.
 *   - Pure-compute endpoints (e.g. routing, cost projection): the
 *     answer is computed from current pricing, no captured-at concept.
 *
 * The registry keys MUST match the exact endpoint path used in
 * route dispatch. Templated paths (e.g. /api/premium/providers/{name})
 * are matched by the helper below.
 */

export interface FreshnessSLA {
  maxAgeSeconds: number;
}

const NULL_SLA = null;

export const ENDPOINT_FRESHNESS: Record<string, FreshnessSLA | null> = {
  // Routing engine: pure compute over current pricing.
  '/api/premium/routing': NULL_SLA,
  // Cost projection: pure compute.
  '/api/premium/cost/projection': NULL_SLA,
  // Compare models: pure aggregation over current pricing/benchmarks.
  '/api/premium/compare/models': { maxAgeSeconds: 24 * 60 * 60 },
  // Provider deep-dive: live status + cataloged data, ~24h freshness.
  '/api/premium/providers': { maxAgeSeconds: 24 * 60 * 60 },
  // Enriched agents directory: ~24h.
  '/api/premium/agents/directory': { maxAgeSeconds: 24 * 60 * 60 },
  // News search: news refreshes every 10 min, give ourselves headroom.
  '/api/premium/news/search': { maxAgeSeconds: 30 * 60 },
  // What's new morning brief: rolls forward as news + status arrive, 1h.
  '/api/premium/whats-new': { maxAgeSeconds: 60 * 60 },
  // Macro digest: synthesis over BLS + FRED daily snapshots. 24h matches
  // the cadence of underlying data (BLS daily 05:00 UTC, FRED 05:30 UTC).
  '/api/premium/macro/digest': { maxAgeSeconds: 24 * 60 * 60 },
  // Policy timeline: pure compute over an editorial registry that updates
  // on redeploy. No staleness signal applies; classified as historical
  // immutable (the relative-to-now math runs at request time).
  '/api/premium/policy/timeline': NULL_SLA,
  // Economy series history: per-request live fetch with 6h KV cache.
  // 6h matches the cache TTL so the staleness check never fires false
  // positives during normal operation.
  '/api/premium/economy/series': { maxAgeSeconds: 6 * 60 * 60 },
  // Packages momentum: synthesis over the daily /api/packages/pypi
  // snapshot. 24h matches the cron cadence.
  '/api/premium/packages/pypi/momentum': { maxAgeSeconds: 24 * 60 * 60 },
  // Research velocity: joins the daily 365-day baseline (04:00 UTC)
  // with a fresh 30-day fetch cached 24h. SLA matches the longer of
  // the two windows.
  '/api/premium/research/velocity': { maxAgeSeconds: 24 * 60 * 60 },
  // arXiv milestones: rebuilt offline from a Qwen extraction round on
  // the last 30 days of preprints. Refresh cadence is weekly. 7-day SLA
  // so a delayed refresh (e.g. server outage on the dev rig) triggers
  // no-charge rather than serving stale data silently.
  '/api/premium/research/milestones': { maxAgeSeconds: 7 * 24 * 60 * 60 },
  // arXiv emerging keywords: same offline pipeline, weekly refresh.
  '/api/premium/research/emerging-keywords': { maxAgeSeconds: 7 * 24 * 60 * 60 },
  // arXiv topic search: weekly index rebuild.
  '/api/premium/research/topic-search': { maxAgeSeconds: 7 * 24 * 60 * 60 },
  // arXiv lab productivity: weekly rebuild, top labs by paper count over
  // rolling 30/90/365-day windows. Same upload cadence as the other arXiv
  // research rollups; 7-day SLA mirrors the rest of the family.
  '/api/premium/research/lab-productivity': { maxAgeSeconds: 7 * 24 * 60 * 60 },
  // Funding exposure: hand-curated registry, refreshed on redeploy when new
  // entries land. 7-day SLA so a stale snapshot triggers no-charge.
  '/api/premium/funding/exposure': { maxAgeSeconds: 7 * 24 * 60 * 60 },
  // Recession watch: synthesis over BLS + FRED daily snapshots. 24h
  // matches the cron cadence of underlying data.
  '/api/premium/economy/recession-watch': { maxAgeSeconds: 24 * 60 * 60 },
  // Model-deprecations timeline: pure compute over a hand-curated registry
  // that updates on redeploy. No staleness signal applies; the relative-to-
  // now math runs at request time. Same shape as policy/timeline.
  '/api/premium/model-deprecations/timeline': NULL_SLA,
  // Historical series queries: immutable.
  '/api/premium/history/pricing/series': NULL_SLA,
  '/api/premium/history/benchmarks/series': NULL_SLA,
  '/api/premium/history/status/uptime': NULL_SLA,
  '/api/premium/history/news/full': NULL_SLA,
  '/api/premium/history/news/source-health': NULL_SLA,
  '/api/premium/security/cve/range': NULL_SLA,
  '/api/premium/security/kev/full': { maxAgeSeconds: 36 * 60 * 60 },
  '/api/premium/security/kev/series': NULL_SLA,
  '/api/premium/security/epss/series': { maxAgeSeconds: 36 * 60 * 60 },
  '/api/premium/security/epss/top': { maxAgeSeconds: 36 * 60 * 60 },
  '/api/premium/climate/power/hourly': { maxAgeSeconds: 7 * 24 * 60 * 60 },
  '/api/premium/health/fda/aggregate': { maxAgeSeconds: 24 * 60 * 60 },
  '/api/premium/clean/cve': NULL_SLA,
  '/api/premium/clean/kev': { maxAgeSeconds: 36 * 60 * 60 },
  '/api/premium/clean/epss': { maxAgeSeconds: 36 * 60 * 60 },
  '/api/premium/clean/power/daily': { maxAgeSeconds: 7 * 24 * 60 * 60 },
  '/api/premium/clean/eia/series': { maxAgeSeconds: 24 * 60 * 60 },
  '/api/premium/clean/fda': { maxAgeSeconds: 24 * 60 * 60 },
  '/api/premium/history/news/clusters/full': NULL_SLA,
  '/api/premium/history/news/verified': NULL_SLA,
  '/api/premium/mcp/registry/series': NULL_SLA,
  '/api/premium/openrouter/series': NULL_SLA,
  '/api/premium/x402-registry/series': NULL_SLA,
  '/api/premium/hf/velocity': NULL_SLA,
  '/api/premium/probe/series': NULL_SLA,
  '/api/gpu/pricing/series': NULL_SLA,
  // Watch registration: pure write, no capture concept.
  '/api/premium/watches': NULL_SLA,
};

/**
 * Resolve the SLA for a path that may be templated. Path-prefix matches
 * are accepted (e.g. /api/premium/providers/anthropic resolves via
 * /api/premium/providers).
 */
export function resolveSLA(path: string): FreshnessSLA | null {
  if (path in ENDPOINT_FRESHNESS) return ENDPOINT_FRESHNESS[path];
  // Try path-prefix match for templated paths
  const segments = path.split('/').filter(Boolean);
  while (segments.length > 0) {
    segments.pop();
    const prefix = '/' + segments.join('/');
    if (prefix in ENDPOINT_FRESHNESS) return ENDPOINT_FRESHNESS[prefix];
  }
  return NULL_SLA;
}

export interface StalenessCheck {
  stale: boolean;
  ageSeconds: number | null;
  slaSeconds: number | null;
  capturedAt: string | null;
  applies: boolean;          // false when SLA is null (immutable / compute-only)
}

/**
 * Check whether a response is stale relative to its endpoint's SLA.
 *
 * `capturedAt` should be the ISO 8601 timestamp the underlying data was
 * captured (e.g. snapshot.capturedAt for GPU pricing, summary.computed_at
 * for probe latest, etc). Pass null when the response has no capture
 * concept; the helper will mark the check as not-applicable and the
 * caller should treat that as "fresh" for billing.
 */
export function checkStaleness(
  endpoint: string,
  capturedAt: string | null,
  now: Date = new Date(),
): StalenessCheck {
  const sla = resolveSLA(endpoint);
  if (!sla) {
    return {
      stale: false,
      ageSeconds: null,
      slaSeconds: null,
      capturedAt,
      applies: false,
    };
  }
  if (!capturedAt) {
    // SLA applies but the handler didn't surface a captured_at. Be
    // conservative: treat as fresh (don't punish billing for missing
    // metadata) but the receipt will still record the SLA so verifiers
    // can see we ran the check.
    return {
      stale: false,
      ageSeconds: null,
      slaSeconds: sla.maxAgeSeconds,
      capturedAt: null,
      applies: true,
    };
  }
  const captured = Date.parse(capturedAt);
  if (!Number.isFinite(captured)) {
    return {
      stale: false,
      ageSeconds: null,
      slaSeconds: sla.maxAgeSeconds,
      capturedAt,
      applies: true,
    };
  }
  const ageSeconds = Math.max(0, Math.floor((now.getTime() - captured) / 1000));
  return {
    stale: ageSeconds > sla.maxAgeSeconds,
    ageSeconds,
    slaSeconds: sla.maxAgeSeconds,
    capturedAt,
    applies: true,
  };
}

/**
 * Convenience for the public meta endpoint and the AFTA manifesto.
 * Returns the registry as a serializable object with each entry's
 * SLA in human-friendly form.
 */
export function describeSLAs(): Array<{ endpoint: string; max_age_seconds: number | null; reason: string }> {
  const reasons: Record<string, string> = {
    '/api/premium/routing': 'computed live from current pricing',
    '/api/premium/cost/projection': 'computed live from current pricing',
    '/api/premium/compare/models': 'live aggregation over current pricing/benchmarks',
    '/api/premium/providers': 'live aggregation, ~24h freshness on cataloged data',
    '/api/premium/agents/directory': 'cataloged data, refreshed ~24h',
    '/api/premium/news/search': 'news refreshes every 10 min',
    '/api/premium/whats-new': 'aggregates last 1-7 days of news + status',
    '/api/premium/macro/digest': 'synthesis over BLS + FRED daily snapshots',
    '/api/premium/policy/timeline': 'compute over editorial registry, no staleness signal',
    '/api/premium/economy/series': 'per-request live fetch with 6h KV cache',
    '/api/premium/packages/pypi/momentum': 'synthesis over the daily PyPI trending snapshot',
    '/api/premium/research/velocity': 'baseline + fresh 30-day OpenAlex fetch with 24h cache',
    '/api/premium/research/lab-productivity': 'offline Qwen extraction rolled up into 30/90/365-day lab counts; uploaded weekly',
    '/api/premium/economy/recession-watch': 'synthesis over BLS + FRED daily snapshots',
    '/api/premium/history/pricing/series': 'historical immutable',
    '/api/premium/history/benchmarks/series': 'historical immutable',
    '/api/premium/history/status/uptime': 'historical immutable',
    '/api/premium/history/news/full': 'historical immutable',
    '/api/premium/history/news/source-health': 'historical immutable',
    '/api/premium/security/cve/range': 'historical immutable',
    '/api/premium/security/kev/full': 'CISA KEV catalog refreshed daily at 06:30 UTC; SLA matches the 36h cron headroom',
    '/api/premium/security/kev/series': 'historical immutable',
    '/api/premium/security/epss/series': 'EPSS scores update daily at FIRST.org; SLA matches the 36h cache headroom',
    '/api/premium/security/epss/top': 'EPSS scores update daily at FIRST.org; SLA matches the 36h cache headroom',
    '/api/premium/climate/power/hourly': 'NASA POWER lazy-proxy with 7-day KV cache; SLA matches cache TTL',
    '/api/premium/health/fda/aggregate': 'OpenFDA lazy-proxy with 24h KV cache; SLA matches cache TTL',
    '/api/premium/clean/cve': 'LLM-ready transform of immutable CVE Record',
    '/api/premium/clean/kev': 'LLM-ready transform of CISA KEV catalog entry; SLA tracks the 36h KEV cron headroom',
    '/api/premium/clean/epss': 'LLM-ready transform of EPSS score; SLA tracks the 36h EPSS cache headroom',
    '/api/premium/clean/power/daily': 'LLM-ready transform of NASA POWER point query; SLA tracks the 7d KV cache TTL',
    '/api/premium/clean/eia/series': 'LLM-ready transform of EIA series; SLA tracks the 24h cache TTL',
    '/api/premium/clean/fda': 'LLM-ready transform of OpenFDA query results; SLA tracks the 24h cache TTL',
    '/api/premium/history/news/clusters/full': 'historical immutable',
    '/api/premium/history/news/verified': 'historical immutable',
    '/api/premium/mcp/registry/series': 'historical immutable',
    '/api/premium/openrouter/series': 'historical immutable; daily OpenRouter catalog snapshots captured by TF, cannot be backfilled',
    '/api/premium/x402-registry/series': 'historical immutable; daily x402 publisher-registry snapshots captured by TF, cannot be backfilled',
    '/api/premium/hf/velocity': 'historical immutable; daily HF top-30 snapshots captured by TF, day-over-day velocity cannot be backfilled',
    '/api/premium/probe/series': 'historical immutable',
    '/api/gpu/pricing/series': 'historical immutable',
    '/api/premium/watches': 'registration write, no capture concept',
  };
  return Object.entries(ENDPOINT_FRESHNESS).map(([endpoint, sla]) => ({
    endpoint,
    max_age_seconds: sla?.maxAgeSeconds ?? null,
    reason: reasons[endpoint] ?? '',
  }));
}
