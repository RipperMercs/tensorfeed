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
  // Route verdict: unlike routing (pure compute), the verdict fuses LIVE
  // operational signals (measured latency probes refreshed every 15 min,
  // incident triage, status). 30-min SLA keys to that operational layer,
  // so a stale live signal triggers a no-charge. The daily quality and
  // price snapshots do not gate billing.
  '/api/premium/route-verdict': { maxAgeSeconds: 30 * 60 },
  // TFII breakdown reflects the daily snapshot; stale beyond 48h yields no-charge.
  '/api/premium/model-intelligence': { maxAgeSeconds: 48 * 60 * 60 },
  // Model price-performance frontier: Pareto set over the same daily TFII
  // snapshot joined to pricing. captured_at is the snapshot as_of, so the 48h
  // SLA mirrors model-intelligence; a stale snapshot triggers a no-charge.
  '/api/premium/models/frontier': { maxAgeSeconds: 48 * 60 * 60 },
  // History is immutable past data; no freshness SLA (handler no-charges empty ranges).
  '/api/premium/model-intelligence/history': NULL_SLA,
  // Provider reliability verdict: ranks providers over the measured probe
  // layer (15-min probe cron). 30-min SLA matches that operational layer, so a
  // stale probe summary triggers a no-charge, same posture as route-verdict.
  '/api/premium/provider-reliability-verdict': { maxAgeSeconds: 30 * 60 },
  // Dependency concentration verdict: fuses the reliability ranking (probe
  // layer) with live status. captured_at is the probe summary computed_at, so
  // a 30-min SLA matches the reliability verdict; a stale probe layer no-charges.
  '/api/premium/resilience/concentration-verdict': { maxAgeSeconds: 30 * 60 },
  // x402 settlement verdict: ruling over the x402 settlement index. 10-min SLA
  // matches the x402-index family (5-min indexer cron advances last_run_at on
  // every block-processing tick, even in a quiet period), so a stale captured_at
  // means a real indexer outage and triggers a no-charge.
  '/api/premium/x402-settlement-verdict': { maxAgeSeconds: 10 * 60 },
  // x402 publisher verdict: single-publisher trust ruling over the same x402
  // settlement index (verified directory blob + the publisher's 30-day receipts).
  // 10-min SLA matches the settlement verdict and the x402-index family: the
  // 5-min indexer cron advances captured_at on every tick, so a stale captured_at
  // means a real indexer outage and triggers a no-charge.
  '/api/premium/x402-publisher-verdict': { maxAgeSeconds: 10 * 60 },
  // Stack Safety Verdict: derived over the ingested AI-CVE batch (DP CC
  // pipeline cadence) joined to CISA KEV. 10-day SLA matches the ai-cves
  // batch SLA, so a stale CVE batch triggers a no-charge.
  '/api/premium/stack-safety-verdict': { maxAgeSeconds: 10 * 24 * 60 * 60 },
  // Benchmark trust verdict: pure compute over the editorial benchmark
  // registry plus the daily benchmark scores. No staleness signal applies
  // (the registry updates on redeploy), same shape as model-deprecations.
  '/api/premium/benchmark-trust-verdict': NULL_SLA,
  // Failover verdict: fuses the same live operational signals as route-
  // verdict (incident triage + status + measured latency). 30-min SLA on
  // the operational layer; a stale live signal no-charges.
  '/api/premium/failover-verdict': { maxAgeSeconds: 30 * 60 },
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
  // Recent window: sub-daily variant of whats-new over the same news +
  // status feeds (pricing diff omitted). 1h SLA mirrors whats-new so a
  // stalled news/status cron no-charges this 1-credit endpoint too.
  '/api/premium/recent': { maxAgeSeconds: 60 * 60 },
  // Pro tier: same base data as whats-new plus Haiku-derived analyst
  // synthesis. Synthesis is cached at 6h (per the design doc); the
  // synthesis layer is the staler boundary, so SLA = 6h.
  '/api/premium/whats-new/pro': { maxAgeSeconds: 6 * 60 * 60 },
  // Macro digest: synthesis over BLS + FRED daily snapshots. 24h matches
  // the cadence of underlying data (BLS daily 05:00 UTC, FRED 05:30 UTC).
  // Policy timeline: pure compute over an editorial registry that updates
  // on redeploy. No staleness signal applies; classified as historical
  // immutable (the relative-to-now math runs at request time).
  '/api/premium/policy/timeline': NULL_SLA,
  // Economy series history: per-request live fetch with 6h KV cache.
  // 6h matches the cache TTL so the staleness check never fires false
  // positives during normal operation.
  // Packages momentum: synthesis over the daily /api/packages/pypi
  // snapshot. 24h matches the cron cadence.
  '/api/premium/packages/pypi/momentum': { maxAgeSeconds: 24 * 60 * 60 },
  // Research velocity: joins the daily 365-day baseline (04:00 UTC)
  // with a fresh 30-day fetch cached 24h. SLA matches the longer of
  // the two windows.
  '/api/premium/research/velocity': { maxAgeSeconds: 24 * 60 * 60 },
  // Top AI authors: daily OpenAlex top-100 snapshot (openalex-authors cron,
  // 04:00 UTC). 36h SLA = daily cadence + headroom for one missed run, so a
  // stalled OpenAlex pull (the documented egress-throttle failure mode) yields
  // a no-charge rather than billing for stale author rankings.
  '/api/premium/research/authors': { maxAgeSeconds: 36 * 60 * 60 },
  // Citation velocity: daily OpenAlex snapshot + Semantic Scholar enrichment.
  // Same daily cadence; 36h SLA with one-run headroom matches authors.
  '/api/premium/research/citation-velocity': { maxAgeSeconds: 36 * 60 * 60 },
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
  // Federal AI spending momentum: derived over the daily USAspending.gov
  // snapshot. 36h SLA = daily cron cadence + headroom for one missed run,
  // so a stale snapshot (a real ingest outage) triggers a no-charge.
  '/api/premium/funding/federal/momentum': { maxAgeSeconds: 36 * 60 * 60 },
  // Federal AI procurement demand: derived over the daily 16:23 UTC
  // ai-procurement:snapshot (USAspending.gov keyword-filtered AI awards).
  // 36h SLA mirrors the momentum sibling: daily cron cadence plus headroom
  // for one missed run, so a stale snapshot (a real ingest outage) triggers
  // a no-charge.
  '/api/premium/procurement/ai-contracts/demand': { maxAgeSeconds: 36 * 60 * 60 },
  // Federal AI opportunities deadlines: derived over the daily 01:37 UTC
  // ai-opportunities:snapshot (SAM.gov AI solicitations). 36h SLA mirrors the
  // procurement sibling: daily cron cadence plus headroom for one missed run,
  // so a stale snapshot (a real ingest outage) triggers a no-charge.
  '/api/premium/procurement/ai-opportunities/deadlines': { maxAgeSeconds: 36 * 60 * 60 },
  // Federal AI policy: derived over the daily 01:47 UTC federal-ai-policy:snapshot
  // (Federal Register AI documents + GovInfo AI bills). 36h SLA mirrors the
  // procurement siblings: daily cron cadence plus headroom for one missed run,
  // so a stale snapshot (a real ingest outage) triggers a no-charge.
  '/api/premium/federal-ai-policy': { maxAgeSeconds: 36 * 60 * 60 },
  // AI datacenter buildout: pure aggregate over a hand-curated registry that
  // updates on redeploy. No staleness signal applies (capturedAt is the
  // registry last-updated date); same shape as the funding/exposure registry
  // but with no maxAge SLA because the figures are editorial, not a snapshot.
  '/api/premium/ai-datacenters/buildout': NULL_SLA,
  // AI capex cycle verdict: signed ranking over the hand-curated capital-cycles
  // registry plus the curated AI_CURRENT annual-capex constant, both editorial
  // and updated on redeploy. captured_at is the registry last-updated date, but
  // no wall-clock staleness signal applies (the figures are editorial, not a
  // cron snapshot); same shape as the ai-datacenters buildout aggregate.
  '/api/premium/ai-capex-cycle-verdict': NULL_SLA,
  // Recession watch: synthesis over BLS + FRED daily snapshots. 24h
  // matches the cron cadence of underlying data.
  // Model-deprecations timeline: pure compute over a hand-curated registry
  // that updates on redeploy. No staleness signal applies; the relative-to-
  // now math runs at request time. Same shape as policy/timeline.
  '/api/premium/model-deprecations/timeline': NULL_SLA,
  // Stack drift verdict: compute over the curated changelog and deprecation
  // registry plus the release snapshot, scoped to the caller's stack. The two
  // headline sources are curated-immutable; no wall-clock staleness applies.
  '/api/premium/stack-drift-verdict': NULL_SLA,
  // Model migration verdict: compute over the curated deprecation registry plus
  // pricing and the intelligence snapshot for the deltas. The migration target
  // is curated-immutable; no wall-clock staleness applies (same as the timeline).
  '/api/premium/model-migration-verdict': NULL_SLA,
  // Inference-provider arbitrage: pure compute over the hand-curated
  // inference-providers matrix. Updates on redeploy; no staleness signal.
  '/api/premium/inference-providers/arbitrage': NULL_SLA,
  // Inference cost verdict: pure compute over the same hand-curated inference-
  // providers matrix. Updates on redeploy; no wall-clock staleness signal.
  '/api/premium/inference/cost-verdict': NULL_SLA,
  // AI safety incidents exposure: derived over the AVID snapshot. 36h SLA
  // matches the daily 03:00 UTC AVID refresh cadence with headroom for
  // a single missed run.
  '/api/premium/ai-safety/incidents/exposure': { maxAgeSeconds: 36 * 60 * 60 },
  // AI-package security radar: derived over the daily 05:45 UTC OSV
  // snapshot. 36h SLA matches the cron cadence with one-run headroom.
  '/api/premium/ai-safety/packages/security/radar': { maxAgeSeconds: 36 * 60 * 60 },
  // Package safety verdict: fuses the daily OSV snapshot (05:45 UTC) and the
  // daily IOC feed (07:15 UTC) with the 6-hourly GHSA firehose. captured_at is
  // the oldest contributing snapshot (the honest staleness floor), so a 36h SLA
  // (daily cadence + one-run headroom) keys billing to the daily feeds; a
  // stalled OSV or IOC pipeline triggers a no-charge.
  '/api/premium/security/package-verdict': { maxAgeSeconds: 36 * 60 * 60 },
  // AI-package release velocity: derived over the 6-hourly registry
  // snapshot. 9h SLA = cron cadence + 50% headroom for a missed run.
  '/api/premium/packages/releases/velocity': { maxAgeSeconds: 9 * 60 * 60 },
  // AI velocity (TerminalFeed federation cross-call): lazy-refreshed
  // every 30 min on cold cache. 2h SLA covers the snapshot TTL + 4x
  // headroom for upstream hiccups (last-known-good fallback).
  '/api/premium/ai-velocity': { maxAgeSeconds: 2 * 60 * 60 },
  // AI crypto pulse (TerminalFeed federation cross-call): lazy-refreshed
  // every 5 min on cold cache. 30-min SLA caps billable staleness so the
  // backup-TTL last-known-good doesn't burn agent credits during outages.
  '/api/premium/ai-crypto-pulse': { maxAgeSeconds: 30 * 60 },
  // Coding-harness weekly deltas: derived over daily-snapshotted TerminalFeed
  // harness leaderboard. 36h SLA = daily cron cadence + headroom for one
  // missed run.
  '/api/premium/coding-harnesses/weekly-deltas': { maxAgeSeconds: 36 * 60 * 60 },
  // News action cards: Haiku-derived. Daily 08:00 UTC cron + per-article
  // 7-day KV cache. 36h SLA covers a single missed run.
  '/api/premium/news/action-cards': { maxAgeSeconds: 36 * 60 * 60 },
  // Incident triage: Haiku-derived. Every-2h cron + per-incident 24h KV
  // cache. 6h SLA covers ~3 missed runs.
  '/api/premium/status/incidents/triage': { maxAgeSeconds: 6 * 60 * 60 },
  // ai-cves trio: DP CC's Qwen-on-5090 extraction pipeline POSTs batches
  // on a daily/weekly cadence. 10-day SLA = weekly cadence + 50% headroom
  // for a single missed run. Tighter SLA waits for cadence confirmation
  // from DP CC; once daily is confirmed sustainable, drop to 36h.
  '/api/premium/ai-cves/ai-stack-cves': { maxAgeSeconds: 10 * 24 * 60 * 60 },
  '/api/premium/ai-cves/exploited-in-wild': { maxAgeSeconds: 10 * 24 * 60 * 60 },
  // CVE lookup: index spans the 90-day batch retention window. Each entry
  // is the most-recent batch that saw the CVE, so freshness is roughly the
  // batch ingest rate; same 10-day SLA as the bulk endpoints.
  '/api/premium/ai-cves/cve': { maxAgeSeconds: 10 * 24 * 60 * 60 },
  // AI Crawler Access Map: rolling daily crawl refreshes ~1/7 of the seed
  // universe per run, so the oldest domain in a full snapshot is up to 7
  // days old by design (dataCapturedAt is that honest floor). 8-day SLA = the
  // 7-day rolling window + 1 day headroom for a single missed cron run, so a
  // stalled crawl triggers a no-charge.
  '/api/premium/ai-crawler-access/full': { maxAgeSeconds: 8 * 24 * 60 * 60 },
  '/api/premium/ai-crawler-access/changes': { maxAgeSeconds: 8 * 24 * 60 * 60 },
  // Agent-Ready Web Map full dataset is derived from the same rolling crawl
  // snapshot, so it inherits the 8-day SLA (7-day window + 1 day headroom).
  '/api/premium/agent-ready/full': { maxAgeSeconds: 8 * 24 * 60 * 60 },
  // HF leaderboard movers diffs the latest captured snapshot against an earlier
  // one; captured_at is the latest snapshot date (daily 04:45 UTC cron), so 36h
  // equals the one-day cadence plus headroom for a single missed run.
  '/api/premium/hf-leaderboard/movers': { maxAgeSeconds: 36 * 60 * 60 },
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
  // SSVC Decision Verdict: derived from the CISA Vulnrichment record, which is
  // immutable for a given CVE scoring and cached 7 days. Like clean/cve, no
  // wall-clock staleness applies; dataCapturedAt is CISA's scoring timestamp,
  // surfaced for the receipt only. The v1.1 KEV/EPSS overlay will flag a stale
  // Exploitation score separately.
  '/api/premium/security/ssvc-verdict': NULL_SLA,
  '/api/premium/clean/cve': NULL_SLA,
  '/api/premium/clean/kev': { maxAgeSeconds: 36 * 60 * 60 },
  '/api/premium/clean/epss': { maxAgeSeconds: 36 * 60 * 60 },
  // GHSA AI firehose: cron refreshes every 6h, so 9h SLA = cadence plus
  // 50% headroom for one missed run. The handler passes dataCapturedAt =
  // snapshot.generated_at (the last successful refresh write), so a
  // stalled cron stops billing once the snapshot ages past 9h.
  '/api/premium/security/ghsa/ai-feed': { maxAgeSeconds: 9 * 60 * 60 },
  // APIs.guru AI watch: daily cron, so 36h SLA = cadence plus one-run
  // headroom. Same generated_at capture-time contract as the GHSA feed.
  '/api/premium/apis-guru/ai-feed': { maxAgeSeconds: 36 * 60 * 60 },
  '/api/premium/history/news/clusters/full': NULL_SLA,
  '/api/premium/history/news/verified': NULL_SLA,
  '/api/premium/mcp/registry/series': NULL_SLA,
  '/api/premium/openrouter/series': NULL_SLA,
  '/api/premium/x402-registry/series': NULL_SLA,
  '/api/premium/hf/velocity': NULL_SLA,
  // Substrate changelog history: a forward-only, append-only log of model
  // lifecycle and spec-version events. Each dated entry is immutable once
  // written, so no wall-clock staleness applies; the handler no-charges
  // empty ranges. The free /recent sibling surfaces captured_at for health.
  '/api/premium/substrate-changelog/history': NULL_SLA,
  // Export-controls AI history: an immutable, forward-only log of Federal
  // Register export-control actions. Each published event never changes once
  // recorded, so no wall-clock staleness no-charge applies; the handler's
  // empty_result no-charge covers the cold (pre-first-cron) and empty-filter cases.
  '/api/premium/export-controls/ai/history': NULL_SLA,
  '/api/premium/probe/series': NULL_SLA,
  '/api/gpu/pricing/series': NULL_SLA,
  // Watch registration: pure write, no capture concept.
  '/api/premium/watches': NULL_SLA,
  // AI-companies per-ticker envelope: composes SEC filings (6h cron),
  // news (10-min refresh), funding (in-Worker static). The 6h SEC
  // cadence is the loose boundary, so 9h SLA = cadence + 50% headroom
  // for a single missed run. Resolves under the /api/premium/ai-companies
  // prefix so concrete /api/premium/ai-companies/NVDA paths match via
  // resolveSLA's path-prefix walk.
  '/api/premium/ai-companies': { maxAgeSeconds: 9 * 60 * 60 },
  // Guidance-delta: a filed 10-K / 10-Q is immutable, so per-accession data
  // never goes stale by wall clock (NULL_SLA). Freshness is INPUT-KEYED and
  // handled in the route: in ?ticker=&form= mode it checks EDGAR for a newer
  // same-form filing and no-charges (stale_data) when the served delta is
  // superseded. No time-based SLA applies.
  '/api/premium/sec/filings/guidance-delta': NULL_SLA,
  // x402 settlement index. Indexer cron every 5 min, 30-block reorg safety.
  // Total time from settlement to indexed = ~6 min. SLA = 10 min headroom.
  '/api/premium/x402-index': { maxAgeSeconds: 10 * 60 },
  '/api/x402-index': { maxAgeSeconds: 10 * 60 },
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
    '/api/premium/route-verdict': 'fuses live latency probes + incident triage + status; charges only when the operational layer is fresh (within 30 min)',
    '/api/premium/provider-reliability-verdict': 'ranks providers by measured availability and tail consistency from the TensorFeed probes; charges only when the probe layer is fresh (within 30 min)',
    '/api/premium/resilience/concentration-verdict':
      'rules on single-point-of-failure exposure across a caller-supplied AI-provider set, fusing the reliability ranking with live status; charges only when the probe layer is fresh (within 30 min) and at least one listed provider is tracked',
    '/api/premium/x402-settlement-verdict': 'rules on Base x402 USDC settlement momentum, concentration, and the leading publisher over the TensorFeed settlement index; charges only when the index is fresh (within 10 min)',
    '/api/premium/stack-safety-verdict': 'GO/HOLD/BLOCK deploy gate over the ingested AI-CVE batch joined to CISA KEV; charges only when the CVE batch is fresh (within 10 days)',
    '/api/premium/benchmark-trust-verdict': 'pure compute over the editorial benchmark registry plus daily benchmark scores; no staleness signal applies',
    '/api/premium/failover-verdict': 'confirms the degraded provider against live incident triage then ranks operational alternatives; charges only when the operational layer is fresh (within 30 min)',
    '/api/premium/cost/projection': 'computed live from current pricing',
    '/api/premium/compare/models': 'live aggregation over current pricing/benchmarks',
    '/api/premium/providers': 'live aggregation, ~24h freshness on cataloged data',
    '/api/premium/agents/directory': 'cataloged data, refreshed ~24h',
    '/api/premium/news/search': 'news refreshes every 10 min',
    '/api/premium/whats-new': 'aggregates last 1-7 days of news + status',
    '/api/premium/policy/timeline': 'compute over editorial registry, no staleness signal',
    '/api/premium/packages/pypi/momentum': 'synthesis over the daily PyPI trending snapshot',
    '/api/premium/research/velocity': 'baseline + fresh 30-day OpenAlex fetch with 24h cache',
    '/api/premium/research/authors': 'daily OpenAlex top-100 AI authors snapshot; charges only when fresh (within 36h of the daily cron)',
    '/api/premium/research/citation-velocity': 'daily OpenAlex citation-velocity snapshot with Semantic Scholar enrichment; charges only when fresh (within 36h of the daily cron)',
    '/api/premium/research/lab-productivity': 'offline Qwen extraction rolled up into 30/90/365-day lab counts; uploaded weekly',
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
    '/api/premium/security/ssvc-verdict':
      'CISA SSVC Coordinator decision computed from the Vulnrichment record (immutable per scoring, 7-day cache); no wall-clock staleness applies',
    '/api/premium/clean/cve': 'LLM-ready transform of immutable CVE Record',
    '/api/premium/clean/kev': 'LLM-ready transform of CISA KEV catalog entry; SLA tracks the 36h KEV cron headroom',
    '/api/premium/clean/epss': 'LLM-ready transform of EPSS score; SLA tracks the 36h EPSS cache headroom',
    '/api/premium/security/ghsa/ai-feed': 'GHSA AI-relevant advisory firehose refreshed every 6h; charges only when fresh (within 9h of the last successful refresh)',
    '/api/premium/security/package-verdict':
      'GO/REVIEW/BLOCK pre-install ruling fusing the known-malicious IOC list, the OSV advisory snapshot, the GHSA AI firehose, and release cadence; charges only when the daily feeds are fresh (within 36h) and the package is in coverage',
    '/api/premium/apis-guru/ai-feed': 'APIs.guru AI-API watch refreshed daily; charges only when fresh (within 36h of the last successful refresh)',
    '/api/premium/history/news/clusters/full': 'historical immutable',
    '/api/premium/history/news/verified': 'historical immutable',
    '/api/premium/mcp/registry/series': 'historical immutable',
    '/api/premium/openrouter/series': 'historical immutable; daily OpenRouter catalog snapshots captured by TF, cannot be backfilled',
    '/api/premium/x402-registry/series': 'historical immutable; daily x402 publisher-registry snapshots captured by TF, cannot be backfilled',
    '/api/premium/hf/velocity': 'historical immutable; daily HF top-30 snapshots captured by TF, day-over-day velocity cannot be backfilled',
    '/api/premium/probe/series': 'historical immutable',
    '/api/gpu/pricing/series': 'historical immutable',
    '/api/premium/watches': 'registration write, no capture concept',
    '/api/premium/sec/filings/guidance-delta':
      'periodic filings are immutable once filed (no wall-clock staleness); freshness is input-keyed, the endpoint no-charges when a newer same-form filing has superseded the served delta',
  };
  return Object.entries(ENDPOINT_FRESHNESS).map(([endpoint, sla]) => ({
    endpoint,
    max_age_seconds: sla?.maxAgeSeconds ?? null,
    reason: reasons[endpoint] ?? '',
  }));
}
