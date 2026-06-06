/**
 * Premium inference cost verdict.
 *
 * For one open-weight model and a monthly token volume: the cheapest inference
 * host to serve it, the projected monthly spend on each host, and the savings
 * versus the caller's current host. Derives from the curated inference-provider
 * price matrix (the same matrix behind /api/inference-providers/cheapest and
 * /api/premium/inference-providers/arbitrage).
 *
 * Scope honesty: this ranks by COST, with provider throughput (outputTPS) as a
 * secondary signal, because the matrix carries price and throughput but not
 * measured reliability. The frontier-provider reliability probes (Anthropic,
 * OpenAI, and so on) cover a DISJOINT set of providers from the inference hosts
 * (Together, Groq, DeepInfra, and so on), so a reliability-adjusted ranking is
 * a v2 follow-up that waits on inference-host reliability measurement.
 *
 * Pricing unit: matrix prices are USD per 1,000,000 tokens, input and output
 * priced separately. With only monthly_tokens, cost uses the blended (50/50)
 * rate; pass input_tokens and output_tokens for an exact split.
 */

import type { ModelMatrix, ProviderOffer } from './inference-providers';

export interface CostVerdictQuery {
  model: string;
  monthly_tokens: number | null;
  input_tokens: number | null;
  output_tokens: number | null;
  current_provider: string | null;
}

function normalize(s: string): string {
  return s.toLowerCase().replace(/[^a-z0-9]/g, '');
}

function round4(n: number): number {
  return Math.round(n * 10000) / 10000;
}

function round1(n: number): number {
  return Math.round(n * 10) / 10;
}

export interface CostRankRow {
  provider: string;
  monthly_cost_usd: number;
  input_price_per_1m: number;
  output_price_per_1m: number;
  blended_price_per_1m: number;
  output_tps: number | null;
  context_window: number;
  url: string;
}

export interface InferenceCostVerdictResult {
  ok: true;
  verdict_kind: 'inference_cost';
  model: string;
  model_id: string;
  family: string;
  assumptions: {
    monthly_input_tokens: number;
    monthly_output_tokens: number;
    blended_5050_split: boolean;
    pricing_unit: 'USD per 1,000,000 tokens';
  };
  cheapest: CostRankRow;
  ranked: CostRankRow[];
  current: { provider: string; monthly_cost_usd: number } | null;
  savings: { vs_current_usd: number; vs_current_pct: number } | null;
  fastest: { provider: string; output_tps: number } | null;
  throughput_note: string | null;
  recommendation: string;
  matrix_last_updated: string;
  reliability_note: string;
  sources: Array<{ name: string; url: string; license: string }>;
}

export interface InferenceCostVerdictEmpty {
  ok: false;
  error: 'model_not_in_matrix';
  model: string;
  hint: string;
  available_models: string[];
}

const SOURCES = [
  {
    name: 'TensorFeed inference-provider price matrix',
    url: 'https://tensorfeed.ai/api/inference-providers/cheapest',
    license: 'Editorial compilation of public provider pricing pages; per-provider terms apply.',
  },
];

const RELIABILITY_NOTE =
  'Ranked by cost with throughput (outputTPS) as the secondary signal. Inference-host reliability is not yet measured by TensorFeed, so it is not factored in; a reliability-adjusted ranking is a planned v2.';

function offerMonthlyCost(o: ProviderOffer, q: CostVerdictQuery): number {
  if (q.input_tokens != null && q.output_tokens != null) {
    return (q.input_tokens / 1_000_000) * o.inputPrice + (q.output_tokens / 1_000_000) * o.outputPrice;
  }
  const total = q.monthly_tokens ?? 0;
  return (total / 1_000_000) * o.blendedPrice;
}

export function buildInferenceCostVerdict(
  matrix: ModelMatrix[],
  query: CostVerdictQuery,
  lastUpdated: string,
): InferenceCostVerdictResult | InferenceCostVerdictEmpty {
  const q = normalize(query.model);
  let entry = matrix.find((m) => normalize(m.modelId) === q || normalize(m.modelName) === q);
  if (!entry) entry = matrix.find((m) => normalize(m.modelId).includes(q) || normalize(m.modelName).includes(q));

  if (!entry || entry.offers.length === 0) {
    return {
      ok: false,
      error: 'model_not_in_matrix',
      model: query.model,
      hint: 'This model is not in the TensorFeed inference-provider matrix (curated open-weight models served across multiple hosts). See available_models, or use /api/premium/cost/projection for first-party frontier-model pricing.',
      available_models: matrix.map((m) => m.modelId),
    };
  }

  const usingSplit = query.input_tokens != null && query.output_tokens != null;
  const monthly_input_tokens = usingSplit ? (query.input_tokens as number) : Math.round((query.monthly_tokens ?? 0) / 2);
  const monthly_output_tokens = usingSplit ? (query.output_tokens as number) : Math.round((query.monthly_tokens ?? 0) / 2);

  const ranked: CostRankRow[] = entry.offers
    .map((o) => ({
      provider: o.provider,
      monthly_cost_usd: round4(offerMonthlyCost(o, query)),
      input_price_per_1m: o.inputPrice,
      output_price_per_1m: o.outputPrice,
      blended_price_per_1m: o.blendedPrice,
      output_tps: o.outputTPS,
      context_window: o.contextWindow,
      url: o.url,
    }))
    .sort((a, b) => a.monthly_cost_usd - b.monthly_cost_usd);

  const cheapest = ranked[0];

  // Fastest by throughput, where throughput is known.
  let fastest: { provider: string; output_tps: number } | null = null;
  for (const o of entry.offers) {
    if (o.outputTPS == null) continue;
    if (!fastest || o.outputTPS > fastest.output_tps) fastest = { provider: o.provider, output_tps: o.outputTPS };
  }

  // Current provider cost + savings, if the caller named one that hosts this model.
  let current: { provider: string; monthly_cost_usd: number } | null = null;
  let savings: { vs_current_usd: number; vs_current_pct: number } | null = null;
  if (query.current_provider) {
    const cn = normalize(query.current_provider);
    const match = ranked.find((r) => normalize(r.provider) === cn || normalize(r.provider).includes(cn) || cn.includes(normalize(r.provider)));
    if (match) {
      current = { provider: match.provider, monthly_cost_usd: match.monthly_cost_usd };
      const diff = round4(match.monthly_cost_usd - cheapest.monthly_cost_usd);
      const pct = match.monthly_cost_usd > 0 ? round1((diff / match.monthly_cost_usd) * 100) : 0;
      savings = { vs_current_usd: diff, vs_current_pct: pct };
    }
  }

  // Throughput caveat: is the cheapest host meaningfully slower than the fastest.
  let throughput_note: string | null = null;
  if (fastest && cheapest.output_tps != null && fastest.provider !== cheapest.provider && fastest.output_tps > 0) {
    const slowerPct = round1((1 - cheapest.output_tps / fastest.output_tps) * 100);
    if (slowerPct >= 20) {
      throughput_note = `The cheapest host (${cheapest.provider}, ${cheapest.output_tps} tok/s) is about ${slowerPct} percent slower than the fastest host (${fastest.provider}, ${fastest.output_tps} tok/s). Weigh latency against cost for hot-path traffic.`;
    }
  }

  let recommendation = `For ${entry.modelName} at the stated volume, ${cheapest.provider} is the cheapest host at $${cheapest.monthly_cost_usd} per month.`;
  if (savings && current) {
    if (savings.vs_current_usd > 0) {
      recommendation += ` Switching from ${current.provider} saves $${savings.vs_current_usd} per month (${savings.vs_current_pct} percent).`;
    } else {
      recommendation += ` You are already on the cheapest host (${current.provider}).`;
    }
  }
  if (throughput_note) recommendation += ' Note the throughput tradeoff.';

  return {
    ok: true,
    verdict_kind: 'inference_cost',
    model: entry.modelName,
    model_id: entry.modelId,
    family: entry.family,
    assumptions: {
      monthly_input_tokens,
      monthly_output_tokens,
      blended_5050_split: !usingSplit,
      pricing_unit: 'USD per 1,000,000 tokens',
    },
    cheapest,
    ranked,
    current,
    savings,
    fastest,
    throughput_note,
    recommendation,
    matrix_last_updated: lastUpdated,
    reliability_note: RELIABILITY_NOTE,
    sources: SOURCES,
  };
}
