import { Env } from './types';

/**
 * Real-time model routing recommendation engine.
 *
 * Synthesizes live pricing, benchmarks, and status data into a single
 * composite score per model. Agents pass a task type (code, reasoning,
 * creative, general) plus optional budget, min-quality, and weight overrides;
 * the engine returns a ranked list of recommended models.
 *
 * This is v1 of Tier 2 routing in the agent payments plan. Currently
 * exposed only as a free preview endpoint (top-1 result, rate-limited).
 * The paid `/api/premium/routing` (top-5 with full detail, no rate limit)
 * ships in Phase 1 alongside the payment middleware.
 *
 * Design notes:
 *  - Quality is computed per task by weighting the relevant benchmarks
 *    (e.g., code task weights HumanEval and SWE-bench higher).
 *  - Cost is normalized blended ($/1M input + output) / 2 across the
 *    candidate set after filters are applied.
 *  - Availability is provider-level, not model-level. Better than nothing
 *    until model-level latency probes land in a later phase.
 *  - Latency is a fixed placeholder (0.5) for v1. Phase 2 adds live probes.
 *  - Models without benchmark coverage are excluded; we cannot recommend
 *    what we cannot score.
 */

export type RoutingTask = 'code' | 'reasoning' | 'creative' | 'general';

const TASKS: RoutingTask[] = ['code', 'reasoning', 'creative', 'general'];

interface ModelPricing {
  id: string;
  name: string;
  inputPrice: number;
  outputPrice: number;
  contextWindow: number;
  capabilities?: string[];
  tier?: string;
  openSource?: boolean;
}

interface ProviderPricing {
  id: string;
  name: string;
  models: ModelPricing[];
}

interface PricingData {
  lastUpdated?: string;
  providers: ProviderPricing[];
}

interface BenchmarkModelEntry {
  model: string;
  provider: string;
  scores: Record<string, number>;
}

interface BenchmarksData {
  lastUpdated?: string;
  models: BenchmarkModelEntry[];
}

interface ServiceStatus {
  name: string;
  provider: string;
  status: 'operational' | 'degraded' | 'down' | 'unknown';
  lastChecked?: string;
}

const TASK_BENCHMARK_WEIGHTS: Record<RoutingTask, Record<string, number>> = {
  code: { human_eval: 0.4, swe_bench: 0.4, mmlu_pro: 0.2 },
  reasoning: { gpqa_diamond: 0.4, math: 0.4, mmlu_pro: 0.2 },
  creative: { mmlu_pro: 0.5, human_eval: 0.25, math: 0.25 },
  general: { mmlu_pro: 0.25, human_eval: 0.25, gpqa_diamond: 0.15, math: 0.15, swe_bench: 0.2 },
};

const DEFAULT_WEIGHTS = {
  quality: 0.4,
  availability: 0.3,
  cost: 0.2,
  latency: 0.1,
};

type WeightSet = typeof DEFAULT_WEIGHTS;

const STATUS_TO_SCORE: Record<string, number> = {
  operational: 1.0,
  degraded: 0.5,
  down: 0.0,
  unknown: 0.7,
};

const LATENCY_PLACEHOLDER = 0.5;

export interface RoutingOptions {
  task?: RoutingTask;
  budget?: number;          // max blended $/1M tokens (input + output average)
  minQuality?: number;      // [0, 1]
  weights?: Partial<WeightSet>;
  topN?: number;            // default 5, max 10
}

export interface RoutingRecommendation {
  rank: number;
  model: {
    id: string;
    name: string;
    provider: string;
    contextWindow: number;
    capabilities: string[];
    openSource: boolean;
  };
  pricing: {
    input: number;
    output: number;
    currency: 'USD';
    unit: 'per 1M tokens';
  };
  status: ServiceStatus['status'];
  composite_score: number;
  components: {
    quality: number;
    availability: number;
    cost: number;
    latency: number;
  };
}

export interface RoutingResult {
  ok: true;
  task: RoutingTask;
  computed_at: string;
  weights: WeightSet;
  filters_applied: { budget?: number; min_quality?: number };
  data_freshness: {
    pricing: string | null;
    benchmarks: string | null;
    status: string | null;
  };
  recommendations: RoutingRecommendation[];
  notes: string[];
}

function clampWeights(custom?: Partial<WeightSet>): WeightSet {
  if (!custom) return { ...DEFAULT_WEIGHTS };
  const merged = { ...DEFAULT_WEIGHTS, ...custom };
  // Drop any negative/NaN values back to defaults
  for (const k of Object.keys(merged) as (keyof WeightSet)[]) {
    if (!Number.isFinite(merged[k]) || merged[k] < 0) merged[k] = DEFAULT_WEIGHTS[k];
  }
  const sum = merged.quality + merged.availability + merged.cost + merged.latency;
  if (sum <= 0) return { ...DEFAULT_WEIGHTS };
  return {
    quality: merged.quality / sum,
    availability: merged.availability / sum,
    cost: merged.cost / sum,
    latency: merged.latency / sum,
  };
}

function computeQualityForTask(task: RoutingTask, scores: Record<string, number>): number {
  const weights = TASK_BENCHMARK_WEIGHTS[task];
  let total = 0;
  let weightApplied = 0;
  for (const [bench, w] of Object.entries(weights)) {
    const score = scores[bench];
    if (typeof score === 'number' && score > 0) {
      total += (score / 100) * w;
      weightApplied += w;
    }
  }
  if (weightApplied === 0) return 0;
  // Renormalize when some benchmarks are missing so quality stays in [0, 1]
  return total / weightApplied;
}

function statusForProvider(
  providerName: string,
  services: ServiceStatus[],
): { status: ServiceStatus['status']; score: number } {
  const lower = providerName.toLowerCase();
  const match = services.find(s => {
    const sp = (s.provider || '').toLowerCase();
    return sp.includes(lower) || lower.includes(sp);
  });
  if (match) {
    return { status: match.status, score: STATUS_TO_SCORE[match.status] ?? 0.7 };
  }
  return { status: 'unknown', score: STATUS_TO_SCORE.unknown };
}

function round4(n: number): number {
  return parseFloat(n.toFixed(4));
}

export async function computeRouting(
  env: Env,
  options: RoutingOptions = {},
): Promise<RoutingResult> {
  const task: RoutingTask =
    options.task && TASKS.includes(options.task) ? options.task : 'general';
  const weights = clampWeights(options.weights);
  const topN = Math.max(1, Math.min(options.topN ?? 5, 10));
  const budget = typeof options.budget === 'number' && Number.isFinite(options.budget) ? options.budget : undefined;
  const minQuality =
    typeof options.minQuality === 'number' && Number.isFinite(options.minQuality)
      ? Math.max(0, Math.min(options.minQuality, 1))
      : undefined;

  const [pricingRaw, benchmarksRaw, servicesRaw] = await Promise.all([
    env.TENSORFEED_CACHE.get('models', 'json') as Promise<PricingData | null>,
    env.TENSORFEED_CACHE.get('benchmarks', 'json') as Promise<BenchmarksData | null>,
    env.TENSORFEED_STATUS.get('services', 'json') as Promise<ServiceStatus[] | null>,
  ]);

  const pricing: PricingData = pricingRaw || { providers: [] };
  const benchmarks: BenchmarksData = benchmarksRaw || { models: [] };
  const services: ServiceStatus[] = servicesRaw || [];

  const benchmarkByName = new Map<string, BenchmarkModelEntry>();
  for (const b of benchmarks.models) {
    benchmarkByName.set(b.model.toLowerCase(), b);
  }

  interface Candidate {
    id: string;
    name: string;
    providerId: string;
    providerName: string;
    contextWindow: number;
    capabilities: string[];
    openSource: boolean;
    inputPrice: number;
    outputPrice: number;
    blendedPrice: number;
    quality: number;
    statusValue: ServiceStatus['status'];
    availability: number;
  }

  const candidates: Candidate[] = [];

  for (const provider of pricing.providers) {
    const providerStatus = statusForProvider(provider.name, services);

    for (const model of provider.models) {
      const bench = benchmarkByName.get(model.name.toLowerCase());
      if (!bench) continue;
      const quality = computeQualityForTask(task, bench.scores);
      if (quality === 0) continue;

      const blendedPrice = (model.inputPrice + model.outputPrice) / 2;

      candidates.push({
        id: model.id,
        name: model.name,
        providerId: provider.id,
        providerName: provider.name,
        contextWindow: model.contextWindow,
        capabilities: model.capabilities ?? [],
        openSource: model.openSource ?? false,
        inputPrice: model.inputPrice,
        outputPrice: model.outputPrice,
        blendedPrice,
        quality,
        statusValue: providerStatus.status,
        availability: providerStatus.score,
      });
    }
  }

  let filtered = candidates;
  if (typeof budget === 'number') {
    filtered = filtered.filter(c => c.blendedPrice <= budget);
  }
  if (typeof minQuality === 'number') {
    filtered = filtered.filter(c => c.quality >= minQuality);
  }

  const baseFreshness = {
    pricing: pricing.lastUpdated ?? null,
    benchmarks: benchmarks.lastUpdated ?? null,
    status: services[0]?.lastChecked ?? null,
  };
  const baseFilters: { budget?: number; min_quality?: number } = {
    ...(typeof budget === 'number' ? { budget } : {}),
    ...(typeof minQuality === 'number' ? { min_quality: minQuality } : {}),
  };
  const baseNotes: string[] = [
    'latency is a placeholder (0.5); live API health probes land in a later phase.',
    'models without benchmark coverage are excluded.',
    'provider-level status is applied to all of that provider\'s models; model-level health is not yet tracked.',
  ];

  if (filtered.length === 0) {
    return {
      ok: true,
      task,
      computed_at: new Date().toISOString(),
      weights,
      filters_applied: baseFilters,
      data_freshness: baseFreshness,
      recommendations: [],
      notes: ['no models match the provided filters.', ...baseNotes],
    };
  }

  const minPrice = Math.min(...filtered.map(c => c.blendedPrice));
  const maxPrice = Math.max(...filtered.map(c => c.blendedPrice));
  const priceRange = maxPrice - minPrice;

  const scored = filtered.map(c => {
    const cost = priceRange === 0 ? 1.0 : 1 - (c.blendedPrice - minPrice) / priceRange;
    const latency = LATENCY_PLACEHOLDER;
    const composite =
      weights.quality * c.quality +
      weights.availability * c.availability +
      weights.cost * cost +
      weights.latency * latency;
    return { c, cost, latency, composite };
  });

  scored.sort((a, b) => b.composite - a.composite);

  const recommendations: RoutingRecommendation[] = scored.slice(0, topN).map((s, i) => ({
    rank: i + 1,
    model: {
      id: s.c.id,
      name: s.c.name,
      provider: s.c.providerId,
      contextWindow: s.c.contextWindow,
      capabilities: s.c.capabilities,
      openSource: s.c.openSource,
    },
    pricing: {
      input: s.c.inputPrice,
      output: s.c.outputPrice,
      currency: 'USD',
      unit: 'per 1M tokens',
    },
    status: s.c.statusValue,
    composite_score: round4(s.composite),
    components: {
      quality: round4(s.c.quality),
      availability: round4(s.c.availability),
      cost: round4(s.cost),
      latency: round4(s.latency),
    },
  }));

  return {
    ok: true,
    task,
    computed_at: new Date().toISOString(),
    weights,
    filters_applied: baseFilters,
    data_freshness: baseFreshness,
    recommendations,
    notes: baseNotes,
  };
}

/**
 * IP-based daily rate limit for the free preview endpoint.
 * Returns { allowed, remaining }. Writes to KV only when allowing the call,
 * keeping the op cost at 1 read + (0 or 1) writes per request.
 */
export async function checkRoutingPreviewRateLimit(
  env: Env,
  ip: string,
  max = 5,
): Promise<{ allowed: boolean; remaining: number; limit: number }> {
  const date = new Date().toISOString().slice(0, 10);
  const key = `rate:routing-preview:${date}:${ip}`;
  const current = (await env.TENSORFEED_CACHE.get(key, 'json')) as { count: number } | null;
  const count = current?.count ?? 0;
  if (count >= max) return { allowed: false, remaining: 0, limit: max };
  await env.TENSORFEED_CACHE.put(
    key,
    JSON.stringify({ count: count + 1 }),
    { expirationTtl: 60 * 60 * 48 }, // 2 days, auto-cleanup
  );
  return { allowed: true, remaining: max - count - 1, limit: max };
}

/**
 * Hours until the next UTC day boundary (used for rate-limit reset hints).
 */
export function hoursUntilUTCRollover(): number {
  const now = new Date();
  const tomorrow = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate() + 1));
  return Math.ceil((tomorrow.getTime() - now.getTime()) / (1000 * 60 * 60));
}
