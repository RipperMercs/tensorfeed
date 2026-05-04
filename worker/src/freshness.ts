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
  // Historical series queries: immutable.
  '/api/premium/history/pricing/series': NULL_SLA,
  '/api/premium/history/benchmarks/series': NULL_SLA,
  '/api/premium/history/status/uptime': NULL_SLA,
  '/api/premium/mcp/registry/series': NULL_SLA,
  '/api/premium/probe/series': NULL_SLA,
  '/api/premium/gpu/pricing/series': NULL_SLA,
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
    '/api/premium/history/pricing/series': 'historical immutable',
    '/api/premium/history/benchmarks/series': 'historical immutable',
    '/api/premium/history/status/uptime': 'historical immutable',
    '/api/premium/mcp/registry/series': 'historical immutable',
    '/api/premium/probe/series': 'historical immutable',
    '/api/premium/gpu/pricing/series': 'historical immutable',
    '/api/premium/watches': 'registration write, no capture concept',
  };
  return Object.entries(ENDPOINT_FRESHNESS).map(([endpoint, sla]) => ({
    endpoint,
    max_age_seconds: sla?.maxAgeSeconds ?? null,
    reason: reasons[endpoint] ?? '',
  }));
}
