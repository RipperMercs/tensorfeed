/**
 * Premium Provider Reliability Verdict.
 *
 * One signed ruling for an AI agent operator: of the frontier providers
 * TensorFeed actively probes, which is the most dependable to build on
 * right now, and which is the riskiest. It is the decision layer over the
 * same measured-probe data the free /api/probe/latest endpoint serves,
 * but instead of raw per-provider aggregates it returns a ranking and a
 * verdict the agent can act on without running the analysis itself.
 *
 * The thesis: an autonomous agent feels the TAIL of the latency
 * distribution (the bad request a retry loop hits), not the median, so
 * the score rewards tail consistency (a tight p95 over p50 spread)
 * alongside raw availability, rather than crowning whoever wins the median.
 *
 * Why an agent pays: the answer fuses TensorFeed's own measured latency
 * and availability probes (data nobody else publishes systematically)
 * into a single dependability ranking with an AFTA-signed receipt, so the
 * operational read is attestable. Free sibling: /api/probe/latest (raw
 * per-provider aggregates). Premium: /api/premium/provider-reliability-verdict
 * (the ranking, the most-dependable and riskiest picks, signed receipt).
 * Free preview: /api/preview/provider-reliability-verdict (picks only).
 *
 * Freshness: capturedAt is the probe summary computed_at. The 30-minute
 * SLA in freshness.ts means a stale probe layer triggers a no-charge, so
 * an agent only pays when the operational read is current.
 */

import type { Env } from './types';
import { safePut } from './kill-switch';
import { getLatestSummary, type LatestSummary } from './probe';

// Composite weighting: availability and tail consistency each carry half.
// Availability is the obvious dependability axis; tail consistency
// (p50 over p95) is the one an agent retry loop actually feels, and it is
// the axis a median-only ranking misses.
const AVAILABILITY_WEIGHT = 0.5;
const CONSISTENCY_WEIGHT = 0.5;

export interface ReliabilityRankEntry {
  rank: number;
  provider: string;
  ok_pct: number;
  total_p50_ms: number | null;
  total_p95_ms: number | null;
  total_p99_ms: number | null;
  spread_ratio: number | null; // p95 over p50; lower is a tighter, more predictable tail
  reliability_score: number;
  measured: boolean;
  note: string;
}

export interface ReliabilityVerdictResult {
  ok: true;
  capturedAt: string | null;
  window_label: string | null;
  verdict: { most_dependable: string | null; riskiest: string | null };
  ranking: ReliabilityRankEntry[];
  coverage: { providers_ranked: number; fully_measured: number; availability_only: number };
  claim: string;
  notes: string[];
  attribution: { sources: string[]; license: string };
}

function round4(n: number): number {
  return parseFloat(n.toFixed(4));
}
function round2(n: number): number {
  return parseFloat(n.toFixed(2));
}
function pctText(n: number): number {
  return Math.round(n * 1000) / 10; // 0.99 -> 99
}

export function buildReliabilityVerdict(summary: LatestSummary | null, _now: Date): ReliabilityVerdictResult {
  const attribution = {
    sources: ['TensorFeed measured latency and availability probes (/api/probe/latest)'],
    license:
      'The underlying probe measurements are TensorFeed-measured. The reliability ranking and the dependability verdict are TensorFeed editorial work over its own measurements, not a provider SLA guarantee.',
  };
  const claim =
    'TensorFeed ranks frontier AI providers by measured operational reliability, fusing its own availability and tail-latency probes into a single dependability verdict with an AFTA-signed receipt. It is a ranking over measured signals from the TensorFeed probe vantage, not a provider SLA guarantee.';

  if (!summary || !Array.isArray(summary.providers) || summary.providers.length === 0) {
    return {
      ok: true,
      capturedAt: summary?.computed_at ?? null,
      window_label: summary?.window_label ?? null,
      verdict: { most_dependable: null, riskiest: null },
      ranking: [],
      coverage: { providers_ranked: 0, fully_measured: 0, availability_only: 0 },
      claim,
      notes: ['No probe data available in this window; no reliability ranking could be computed.'],
      attribution,
    };
  }

  interface Scratch {
    provider: string;
    ok_pct: number;
    p50: number | null;
    p95: number | null;
    p99: number | null;
    spread: number | null;
    measured: boolean;
    score: number;
  }

  const scratch: Scratch[] = [];
  for (const a of summary.providers) {
    if (!a || a.count === 0) continue; // no probes this window: nothing measured to rank
    const p50 = a.total?.p50 ?? null;
    const p95 = a.total?.p95 ?? null;
    const p99 = a.total?.p99 ?? null;
    const okPct = typeof a.ok_pct === 'number' ? a.ok_pct : 0;
    const measured = typeof p50 === 'number' && typeof p95 === 'number' && p50 > 0 && p95 > 0;
    const consistency = measured ? (p50 as number) / (p95 as number) : null; // 0 to 1, 1 means no tail blowup
    const spread = measured ? round2((p95 as number) / (p50 as number)) : null;
    const score = measured
      ? AVAILABILITY_WEIGHT * okPct + CONSISTENCY_WEIGHT * (consistency as number)
      : okPct; // availability-only when latency was not measured this window
    scratch.push({ provider: a.provider, ok_pct: okPct, p50, p95, p99, spread, measured, score });
  }

  scratch.sort((x, y) => {
    if (y.score !== x.score) return y.score - x.score;
    if (y.ok_pct !== x.ok_pct) return y.ok_pct - x.ok_pct;
    const xp = x.p95 ?? Infinity;
    const yp = y.p95 ?? Infinity;
    if (xp !== yp) return xp - yp;
    return x.provider.localeCompare(y.provider);
  });

  const ranking: ReliabilityRankEntry[] = scratch.map((s, i) => ({
    rank: i + 1,
    provider: s.provider,
    ok_pct: round4(s.ok_pct),
    total_p50_ms: s.p50,
    total_p95_ms: s.p95,
    total_p99_ms: s.p99,
    spread_ratio: s.spread,
    reliability_score: round4(s.score),
    measured: s.measured,
    note: s.measured
      ? `measured availability ${pctText(s.ok_pct)} percent, p50 ${s.p50} ms, p95 ${s.p95} ms, p95 over p50 spread ${s.spread}x`
      : `availability only (no measured latency this window): availability ${pctText(s.ok_pct)} percent`,
  }));

  const fullyMeasured = ranking.filter((r) => r.measured).length;
  const availabilityOnly = ranking.length - fullyMeasured;

  const notes: string[] = [
    'Reliability score weights availability and tail consistency (p50 over p95) equally; the verdict rewards a predictable tail, not the fastest median.',
    'Latency is the TensorFeed probe-vantage end-to-end measurement, not the calling agent geographic region.',
    'This is a ranking over measured signals, not a provider SLA guarantee.',
  ];
  if (availabilityOnly > 0) {
    notes.push(`${availabilityOnly} provider(s) had no measured latency this window and were scored on availability only.`);
  }

  return {
    ok: true,
    capturedAt: summary.computed_at ?? null,
    window_label: summary.window_label ?? null,
    verdict: {
      most_dependable: ranking[0]?.provider ?? null,
      riskiest: ranking.length >= 2 ? ranking[ranking.length - 1].provider : null,
    },
    ranking,
    coverage: { providers_ranked: ranking.length, fully_measured: fullyMeasured, availability_only: availabilityOnly },
    claim,
    notes,
    attribution,
  };
}

export async function computeReliabilityVerdict(env: Env): Promise<ReliabilityVerdictResult> {
  const summary = await getLatestSummary(env);
  return buildReliabilityVerdict(summary, new Date());
}

/**
 * IP-based daily rate limit for the free /api/preview/provider-reliability-verdict
 * preview. Mirrors checkRouteVerdictPreviewRateLimit with a distinct KV key so the
 * two previews do not share a budget. 1 read plus (0 or 1) writes per call; the
 * write is skipped under the kill switch.
 */
export async function checkReliabilityVerdictPreviewRateLimit(
  env: Env,
  ip: string,
  max = 10,
): Promise<{ allowed: boolean; remaining: number; limit: number }> {
  const date = new Date().toISOString().slice(0, 10);
  const key = `rate:reliability-verdict-preview:${date}:${ip}`;
  const current = (await env.TENSORFEED_CACHE.get(key, 'json')) as { count: number } | null;
  const count = current?.count ?? 0;
  if (count >= max) return { allowed: false, remaining: 0, limit: max };
  await safePut(env, env.TENSORFEED_CACHE, key, JSON.stringify({ count: count + 1 }), { expirationTtl: 60 * 60 * 48 });
  return { allowed: true, remaining: max - count - 1, limit: max };
}
