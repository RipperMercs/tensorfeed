/**
 * Premium model price-performance frontier.
 *
 * Places every priced model on a capability-versus-price plane and returns the
 * Pareto-optimal set (the frontier) plus every dominated model, where a model
 * is dominated when some other model is at least as capable AND no more
 * expensive (strictly better on at least one axis). A dominated model is, by
 * definition, never the rational choice: a cheaper and at-least-as-capable
 * option exists.
 *
 * Capability axis: the TensorFeed Intelligence Index (TFII) subscore for the
 * requested task (general is the headline). It is already contamination and
 * saturation discounted, so a benchmark-gamed model does not float to the top.
 * Price axis: blended (input plus output, divided by two) USD per 1M tokens.
 *
 * Distinct from /api/premium/routing (top-N for a task) and
 * /api/premium/model-intelligence (per-model score): this is the set-level
 * structure, the answer to "which models can I rule out entirely."
 */

import { TASKS, normalizeId, type IntelligenceSnapshot } from './model-intelligence';

export type FrontierTask = 'code' | 'reasoning' | 'creative' | 'general';

export function parseTask(raw: string | null): FrontierTask {
  if (raw === null) return 'general';
  const t = raw.trim().toLowerCase();
  return (TASKS as readonly string[]).includes(t) ? (t as FrontierTask) : 'general';
}

// Minimal structural view of the pricing payload (KV key 'models'); we only
// need id, name, and the two prices to place a model on the price axis.
export interface PricingModelLite {
  id: string;
  name: string;
  inputPrice: number;
  outputPrice: number;
}
export interface PricingDataLite {
  providers: Array<{ name?: string; models: PricingModelLite[] }>;
}

export interface FrontierModel {
  model_id: string;
  name: string;
  provider: string;
  capability: number;
  blended_price: number;
  input_price: number;
  output_price: number;
  low_coverage: boolean;
}

export interface DominatedModel extends FrontierModel {
  dominated_by: { model_id: string; name: string; capability: number; blended_price: number };
}

export interface FrontierResult {
  ok: true;
  verdict_kind: 'price_performance_frontier';
  task: FrontierTask;
  capability_metric: string;
  price_metric: 'blended USD per 1M tokens';
  frontier: FrontierModel[];
  dominated: DominatedModel[];
  counts: { intelligence_models: number; priced: number; frontier: number; dominated: number; unpriced_skipped: number };
  as_of: string;
  methodology_version: string;
  recommendation: string;
  notes: string[];
  sources: Array<{ name: string; url: string; license: string }>;
}

export interface FrontierEmpty {
  ok: false;
  error: 'insufficient_data';
  hint: string;
  priced_models: number;
}

const SOURCES = [
  {
    name: 'TensorFeed Intelligence Index (TFII)',
    url: 'https://tensorfeed.ai/api/premium/model-intelligence',
    license: 'TensorFeed editorial scoring over public benchmark results; contamination and saturation discounted.',
  },
  {
    name: 'TensorFeed model pricing',
    url: 'https://tensorfeed.ai/api/models',
    license: 'Editorial compilation of public provider pricing; per-provider terms apply.',
  },
];

function round2(n: number): number {
  return Math.round(n * 100) / 100;
}

export function buildModelFrontier(
  intelligence: IntelligenceSnapshot,
  pricing: PricingDataLite,
  task: FrontierTask,
): FrontierResult | FrontierEmpty {
  // Price lookup keyed by normalized id and normalized name.
  const priceMap = new Map<string, { input: number; output: number; blended: number }>();
  for (const provider of pricing.providers ?? []) {
    for (const m of provider.models ?? []) {
      const blended = (m.inputPrice + m.outputPrice) / 2;
      const entry = { input: m.inputPrice, output: m.outputPrice, blended };
      priceMap.set(normalizeId(m.id), entry);
      priceMap.set(normalizeId(m.name), entry);
    }
  }

  const intelligenceModels = intelligence.models ?? [];
  let unpriced = 0;
  const nodes: FrontierModel[] = [];
  for (const im of intelligenceModels) {
    const price = priceMap.get(normalizeId(im.model_id)) ?? priceMap.get(normalizeId(im.name));
    if (!price) {
      unpriced++;
      continue;
    }
    nodes.push({
      model_id: im.model_id,
      name: im.name,
      provider: im.provider,
      capability: im.subscores[task],
      blended_price: round2(price.blended),
      input_price: price.input,
      output_price: price.output,
      low_coverage: im.trust.low_coverage,
    });
  }

  if (nodes.length < 2) {
    return {
      ok: false,
      error: 'insufficient_data',
      hint: 'A price-performance frontier needs at least two priced, scored models. The intelligence snapshot or the pricing catalog has not populated enough overlapping models yet. Retry after the next daily refresh.',
      priced_models: nodes.length,
    };
  }

  // Pareto: M is dominated if some N is at least as capable AND no more
  // expensive, and strictly better on at least one axis.
  const frontier: FrontierModel[] = [];
  const dominated: DominatedModel[] = [];
  for (const m of nodes) {
    let bestDominator: FrontierModel | null = null;
    for (const n of nodes) {
      if (n === m) continue;
      const atLeastAsGood = n.capability >= m.capability && n.blended_price <= m.blended_price;
      const strictlyBetter = n.capability > m.capability || n.blended_price < m.blended_price;
      if (atLeastAsGood && strictlyBetter) {
        // Prefer the strongest dominator: highest capability, then cheapest.
        if (!bestDominator || n.capability > bestDominator.capability || (n.capability === bestDominator.capability && n.blended_price < bestDominator.blended_price)) {
          bestDominator = n;
        }
      }
    }
    if (bestDominator) {
      dominated.push({
        ...m,
        dominated_by: {
          model_id: bestDominator.model_id,
          name: bestDominator.name,
          capability: bestDominator.capability,
          blended_price: bestDominator.blended_price,
        },
      });
    } else {
      frontier.push(m);
    }
  }

  frontier.sort((a, b) => b.capability - a.capability || a.blended_price - b.blended_price);
  dominated.sort((a, b) => b.capability - a.capability || a.blended_price - b.blended_price);

  const cheapestFrontier = [...frontier].sort((a, b) => a.blended_price - b.blended_price)[0];
  const topFrontier = frontier[0];
  let recommendation = `Of ${nodes.length} priced models for the ${task} task, ${frontier.length} sit on the price-performance frontier and ${dominated.length} are dominated (a cheaper, at-least-as-capable model exists, so they are never the rational pick).`;
  if (topFrontier && cheapestFrontier) {
    recommendation += ` ${topFrontier.name} leads on capability (${topFrontier.capability}); ${cheapestFrontier.name} is the cheapest non-dominated option at $${cheapestFrontier.blended_price} per 1M blended.`;
  }

  return {
    ok: true,
    verdict_kind: 'price_performance_frontier',
    task,
    capability_metric: task === 'general' ? 'TFII headline (0-100)' : `TFII ${task} subscore (0-100)`,
    price_metric: 'blended USD per 1M tokens',
    frontier,
    dominated,
    counts: {
      intelligence_models: intelligenceModels.length,
      priced: nodes.length,
      frontier: frontier.length,
      dominated: dominated.length,
      unpriced_skipped: unpriced,
    },
    as_of: intelligence.as_of,
    methodology_version: intelligence.methodology_version,
    recommendation,
    notes: [
      'Capability is the TFII subscore, already contamination and saturation discounted.',
      'Models flagged low_coverage scored on too few benchmarks; treat their capability as provisional.',
    ],
    sources: SOURCES,
  };
}
