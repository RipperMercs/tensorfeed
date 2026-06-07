/**
 * Premium AI-capex cycle verdict.
 *
 * One signed ruling: where today's AI infrastructure buildout ranks against a
 * curated set of historical technology capital buildouts on a single
 * cross-era-comparable axis, peak annual capex as a percent of national GDP.
 * It names the nearest and farthest historical analog, surfaces equities-led
 * cycles (null capex share, e.g. radio-1929) separately as sentiment outliers
 * rather than ranking them, and explicitly lists the post-bust dimensions that
 * cannot be scored while a cycle is still in progress. It deliberately does NOT
 * call "bubble" or "not a bubble"; the honesty about what cannot yet be known
 * is the product, and keeps this an editorial derivation rather than a data
 * resale. Free sibling registry at /api/capital-cycles.
 */

import type { CapitalCycleEntry, CurrentAiCycle } from './capital-cycles';

export type CapexCycleVerdictKind = 'MODERATE' | 'ELEVATED' | 'EXTREME' | 'UNPRECEDENTED';

const NOT_YET_MEASURABLE = [
  'overbuild_ratio',
  'peak_to_trough_drawdown_pct',
  'boom_to_bust_years',
  'survival_rate_pct',
] as const;

export interface RankingEntry {
  id: string;
  name: string;
  peak_capex_pct_gdp: number;
  is_current: boolean;
}

export interface AnalogRef {
  cycle_id: string;
  name: string;
  peak_capex_pct_gdp: number;
  distance: number;
  note: string;
}

export interface SentimentOutlier {
  cycle_id: string;
  name: string;
  peak_to_trough_drawdown_pct: number | null;
  note: string;
}

export interface CapexCycleVerdictResult {
  ok: true;
  verdict_kind: 'capex_cycle_analog';
  verdict: CapexCycleVerdictKind;
  ranked_dimension: 'peak_capex_pct_gdp';
  current_cycle: CurrentAiCycle;
  current_rank: number;
  total_ranked: number;
  exceeds_all_priors: boolean;
  ranking: RankingEntry[];
  closest_analog: AnalogRef | null;
  diverges_from: AnalogRef | null;
  sentiment_outliers: SentimentOutlier[];
  not_yet_measurable: string[];
  caveats: string[];
  confidence: 'high' | 'medium' | 'low';
  interpretation: string;
  captured_at: string;
  sources: Array<{ name: string; url: string; license: string }>;
}

export interface CapexCycleVerdictEmpty {
  ok: false;
  error: 'inputs_unavailable';
  hint: string;
}

const SOURCES = [
  {
    name: 'TensorFeed editorial capital-cycles registry',
    url: 'https://tensorfeed.ai/api/capital-cycles',
    license: 'TensorFeed editorial derivation over public-domain and CC-BY primary sources; per-row sources in the free registry.',
  },
  {
    name: 'TensorFeed AI datacenter buildout registry',
    url: 'https://tensorfeed.ai/api/ai-datacenters',
    license: 'TensorFeed editorial registry of disclosed AI datacenter capex and power.',
  },
];

function assignBand(rank: number, total: number): CapexCycleVerdictKind {
  if (rank === 1) return 'UNPRECEDENTED';
  if (rank <= Math.ceil(total / 3)) return 'EXTREME';
  if (rank <= Math.ceil((total * 2) / 3)) return 'ELEVATED';
  return 'MODERATE';
}

export function buildCapexCycleVerdict(
  cycles: CapitalCycleEntry[],
  current: CurrentAiCycle | null,
  registryReviewedAt: string,
  now: Date,
): CapexCycleVerdictResult | CapexCycleVerdictEmpty {
  if (!current || current.peak_capex_pct_gdp === null) {
    return {
      ok: false,
      error: 'inputs_unavailable',
      hint: 'No rankable AI capex-to-GDP signal is available. The registry inputs are bundled and static, so this is an unexpected cold state; retry shortly.',
    };
  }

  const curVal = current.peak_capex_pct_gdp;
  const rankable = cycles.filter(
    (c): c is CapitalCycleEntry & { peak_capex_pct_gdp: number } => c.peak_capex_pct_gdp !== null,
  );

  const ranking: RankingEntry[] = [
    ...rankable.map((c) => ({ id: c.id, name: c.name, peak_capex_pct_gdp: c.peak_capex_pct_gdp, is_current: false })),
    { id: current.id, name: current.name, peak_capex_pct_gdp: curVal, is_current: true },
  ].sort((a, b) => b.peak_capex_pct_gdp - a.peak_capex_pct_gdp);

  const higher = rankable.filter((c) => c.peak_capex_pct_gdp > curVal).length;
  const current_rank = higher + 1;
  const total_ranked = rankable.length + 1;
  const exceeds_all_priors = higher === 0;
  const verdict = assignBand(current_rank, total_ranked);

  const withDist: AnalogRef[] = rankable.map((c) => ({
    cycle_id: c.id,
    name: c.name,
    peak_capex_pct_gdp: c.peak_capex_pct_gdp,
    distance: Math.round(Math.abs(c.peak_capex_pct_gdp - curVal) * 1000) / 1000,
    note: c.analogy_note,
  }));
  const byDist = [...withDist].sort((a, b) => a.distance - b.distance);
  const closest_analog = byDist[0] ?? null;
  const farthest = byDist.length > 0 ? byDist[byDist.length - 1] : null;
  const diverges_from = farthest && closest_analog && farthest.cycle_id !== closest_analog.cycle_id ? farthest : null;

  const sentiment_outliers: SentimentOutlier[] = cycles
    .filter((c) => c.peak_capex_pct_gdp === null)
    .map((c) => ({
      cycle_id: c.id,
      name: c.name,
      peak_to_trough_drawdown_pct: c.peak_to_trough_drawdown_pct,
      note: c.analogy_note,
    }));

  const caveats = [
    `The AI capex-to-GDP figure is a point estimate near ${curVal} percent (US AI capex over US GDP); estimates range from about ${current.capex_range_low_pct} percent on a global-GDP denominator to about ${current.capex_range_high_pct} percent on the broadest hyperscaler guidance.`,
    'The AI numerator is disclosed annual capex and is a lower bound; it excludes AI labs, neoclouds, and sovereign buildouts.',
    'The AI figure is a current run-rate, not a realized peak, because the cycle is in progress.',
    'The GDP denominator is a curated estimate updated on redeploy, not a live fetch.',
    'Overbuild ratio, drawdown, boom-to-bust duration, and survival rate cannot be computed for an in-progress cycle and are excluded from the ranking.',
    sentiment_outliers.length > 0
      ? `Equities-led cycles with no capex buildout (${sentiment_outliers.map((o) => o.name).join(', ')}) are excluded from the capex ranking and shown separately; they are best compared on drawdown and valuation.`
      : '',
  ].filter((s) => s.length > 0);

  const bandPhrase: Record<CapexCycleVerdictKind, string> = {
    UNPRECEDENTED: 'exceeds every prior buildout we track',
    EXTREME: 'ranks near the top of the historical set',
    ELEVATED: 'is comparable to the larger historical buildouts',
    MODERATE: 'sits within the lower range of the historical set',
  };
  const interpretation = `On capex as a share of GDP, the AI buildout ${bandPhrase[verdict]} (rank ${current_rank} of ${total_ranked})${
    closest_analog ? `, closest to the ${closest_analog.name}` : ''
  }. The post-bust dimensions that decide whether a buildout was a bubble cannot be scored while the cycle is in progress.`;

  const capturedCandidates = [registryReviewedAt + 'T00:00:00Z', current.captured_at].filter(Boolean);
  const captured_at =
    capturedCandidates.sort((a, b) => (Date.parse(b) || 0) - (Date.parse(a) || 0))[0] ?? now.toISOString();

  return {
    ok: true,
    verdict_kind: 'capex_cycle_analog',
    verdict,
    ranked_dimension: 'peak_capex_pct_gdp',
    current_cycle: current,
    current_rank,
    total_ranked,
    exceeds_all_priors,
    ranking,
    closest_analog,
    diverges_from,
    sentiment_outliers,
    not_yet_measurable: NOT_YET_MEASURABLE.slice(),
    caveats,
    confidence: 'medium',
    interpretation,
    captured_at,
    sources: SOURCES,
  };
}
