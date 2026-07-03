import { Env } from './types';
import { BENCHMARK_ATTRIBUTION, PRICING_ATTRIBUTION, BenchmarkAttribution, PricingAttribution } from './catalog';
import { resolveModelKey } from './model-key-resolve';

/**
 * Premium side-by-side model comparison.
 *
 * Given 2-5 model identifiers, returns a normalized comparison block
 * for each model: pricing (input, output, blended), benchmark scores
 * across all keys present on any compared model, provider-level live
 * status, recent news count + top mentions filtered to articles that
 * reference the model name.
 *
 * Comparison views are agent-shaped: instead of stitching /api/models
 * + /api/benchmarks + /api/status + /api/news per candidate, an agent
 * pays 1 credit and gets a ready-to-rank block with all benchmarks
 * normalized to a single union of keys (so a model missing a benchmark
 * gets `null`, never an undefined that breaks downstream code).
 */

const MIN_MODELS = 2;
const MAX_MODELS = 5;

// === Source shapes ===

interface ModelPricing {
  id: string;
  name: string;
  inputPrice: number;
  outputPrice: number;
  contextWindow?: number;
  capabilities?: string[];
  tier?: string;
  released?: string;
  openSource?: boolean;
}

interface ProviderPricing {
  id: string;
  name: string;
  url?: string;
  models: ModelPricing[];
}

interface PricingPayload {
  lastUpdated?: string;
  providers: ProviderPricing[];
}

interface BenchmarkModelEntry {
  model: string;
  provider: string;
  scores: Record<string, number>;
}

interface BenchmarksPayload {
  lastUpdated?: string;
  models: BenchmarkModelEntry[];
}

interface ServiceStatus {
  name: string;
  provider: string;
  status: 'operational' | 'degraded' | 'down' | 'unknown';
  lastChecked?: string;
}

interface Article {
  title: string;
  url: string;
  source: string;
  sourceDomain: string;
  publishedAt: string;
}

// === Output ===

export interface CompareModelEntry {
  matched: true;
  id: string;
  name: string;
  provider: string;
  tier: string | null;
  context_window: number | null;
  released: string | null;
  capabilities: string[];
  open_source: boolean;
  pricing: { input: number; output: number; blended: number };
  benchmarks: Record<string, number | null>;
  status: ServiceStatus['status'] | 'unknown';
  recent_news_count: number;
  recent_news: { title: string; url: string; source: string; published_at: string }[];
}

export interface UnmatchedCompareEntry {
  matched: false;
  query: string;
  reason: 'model_not_found';
}

export type CompareEntry = CompareModelEntry | UnmatchedCompareEntry;

export interface CompareModelsResult {
  ok: true;
  benchmark_keys: string[];
  models: CompareEntry[];
  rankings: {
    cheapest_blended: { name: string; blended: number }[];
    most_context: { name: string; context_window: number }[];
    by_benchmark: Record<string, { name: string; score: number }[]>;
  };
  attribution: {
    pricing: PricingAttribution;
    benchmarks: BenchmarkAttribution;
  };
  data_freshness: {
    pricing: string | null;
    benchmarks: string | null;
    status: string | null;
  };
}

export interface CompareModelsError {
  ok: false;
  error: string;
  reason?: string;
}

// === Helpers ===

function round4(n: number): number {
  return parseFloat(n.toFixed(4));
}

// Exact id/name match first, then unambiguous short forms (opus-4-8,
// "GPT-5.5"). Shared with cost/projection; see model-key-resolve.ts.
function findPricing(
  pricing: PricingPayload | null,
  key: string,
): { provider: ProviderPricing; model: ModelPricing } | null {
  return resolveModelKey<ModelPricing, ProviderPricing>(pricing?.providers ?? null, key);
}

function findStatus(
  services: ServiceStatus[],
  providerName: string,
): ServiceStatus | null {
  const k = providerName.toLowerCase();
  return (
    services.find(s => {
      const sp = (s.provider || '').toLowerCase();
      const sn = (s.name || '').toLowerCase();
      return sp === k || sn === k || sp.includes(k) || k.includes(sp);
    }) ?? null
  );
}

function newsForModel(articles: Article[], modelName: string, providerName: string): Article[] {
  const m = modelName.toLowerCase();
  const p = providerName.toLowerCase();
  return articles.filter(a => {
    const title = (a.title || '').toLowerCase();
    const src = (a.source || '').toLowerCase();
    const dom = (a.sourceDomain || '').toLowerCase();
    return title.includes(m) || (src.includes(p) && title.includes(m.split(' ')[0]));
  });
}

// === Top-level entry ===

export interface CompareModelsOptions {
  modelKeys: string[];
}

export async function compareModels(
  env: Env,
  options: CompareModelsOptions,
): Promise<CompareModelsResult | CompareModelsError> {
  const keys = (options.modelKeys ?? []).map(k => k.trim()).filter(k => k.length > 0);
  if (keys.length < MIN_MODELS) {
    return { ok: false, error: 'min_two_models_required' };
  }
  if (keys.length > MAX_MODELS) {
    return { ok: false, error: `max_${MAX_MODELS}_models_per_compare` };
  }
  // De-duplicate while preserving order
  const seen = new Set<string>();
  const dedup: string[] = [];
  for (const k of keys) {
    const lower = k.toLowerCase();
    if (!seen.has(lower)) {
      seen.add(lower);
      dedup.push(k);
    }
  }

  const [pricingRaw, benchmarksRaw, servicesRaw, articlesRaw] = await Promise.all([
    env.TENSORFEED_CACHE.get('models', 'json') as Promise<PricingPayload | null>,
    env.TENSORFEED_CACHE.get('benchmarks', 'json') as Promise<BenchmarksPayload | null>,
    env.TENSORFEED_STATUS.get('services', 'json') as Promise<ServiceStatus[] | null>,
    env.TENSORFEED_NEWS.get('articles', 'json') as Promise<Article[] | null>,
  ]);

  const services: ServiceStatus[] = servicesRaw ?? [];
  const articles: Article[] = articlesRaw ?? [];

  // Index benchmarks by lowercased model name
  const benchByName = new Map<string, BenchmarkModelEntry>();
  for (const m of benchmarksRaw?.models ?? []) {
    benchByName.set(m.model.toLowerCase(), m);
  }

  const entries: CompareEntry[] = [];
  for (const key of dedup) {
    const found = findPricing(pricingRaw, key);
    if (!found) {
      entries.push({ matched: false, query: key, reason: 'model_not_found' });
      continue;
    }
    const m = found.model;
    const provider = found.provider;
    const bench = benchByName.get(m.name.toLowerCase());
    const status = findStatus(services, provider.name);
    const matchedNews = newsForModel(articles, m.name, provider.name);
    entries.push({
      matched: true,
      id: m.id,
      name: m.name,
      provider: provider.name,
      tier: m.tier ?? null,
      context_window: m.contextWindow ?? null,
      released: m.released ?? null,
      capabilities: m.capabilities ?? [],
      open_source: m.openSource === true,
      pricing: {
        input: m.inputPrice,
        output: m.outputPrice,
        blended: round4((m.inputPrice + m.outputPrice) / 2),
      },
      benchmarks: bench?.scores ?? {},
      status: status?.status ?? 'unknown',
      recent_news_count: matchedNews.length,
      recent_news: matchedNews.slice(0, 3).map(a => ({
        title: a.title,
        url: a.url,
        source: a.source,
        published_at: a.publishedAt,
      })),
    });
  }

  // Build the union set of benchmark keys across matched models, then
  // normalize each model's benchmarks to fill missing keys with null
  const benchmarkKeys = new Set<string>();
  for (const e of entries) {
    if (e.matched) {
      for (const k of Object.keys(e.benchmarks)) benchmarkKeys.add(k);
    }
  }
  const benchmarkKeysList = Array.from(benchmarkKeys).sort();

  for (const e of entries) {
    if (!e.matched) continue;
    const filled: Record<string, number | null> = {};
    for (const k of benchmarkKeysList) {
      const v = e.benchmarks[k];
      filled[k] = typeof v === 'number' && Number.isFinite(v) ? v : null;
    }
    e.benchmarks = filled;
  }

  // Build rankings across matched models only
  const matched = entries.filter((e): e is CompareModelEntry => e.matched);

  // No-charge guard (audit 2026-05-31 #17): if the pricing KV was missing
  // (pricingRaw null) or none of the requested ids resolved to a tracked
  // model, every entry is unmatched and the comparison has zero usable
  // data. Returning ok:false routes the handler to premiumValidationFailure
  // (the no-charge path), mirroring the cost-projection and federal-momentum
  // siblings, so an agent is never billed for an empty comparison.
  if (matched.length === 0) {
    return { ok: false, error: 'no_models_matched', reason: 'no_models_matched' };
  }

  const cheapest_blended = matched
    .slice()
    .sort((a, b) => a.pricing.blended - b.pricing.blended)
    .map(e => ({ name: e.name, blended: e.pricing.blended }));

  const most_context = matched
    .filter(e => typeof e.context_window === 'number')
    .slice()
    .sort((a, b) => (b.context_window ?? 0) - (a.context_window ?? 0))
    .map(e => ({ name: e.name, context_window: e.context_window as number }));

  const by_benchmark: Record<string, { name: string; score: number }[]> = {};
  for (const k of benchmarkKeysList) {
    const ranked = matched
      .filter(e => typeof e.benchmarks[k] === 'number')
      .sort((a, b) => (b.benchmarks[k] as number) - (a.benchmarks[k] as number))
      .map(e => ({ name: e.name, score: e.benchmarks[k] as number }));
    if (ranked.length > 0) by_benchmark[k] = ranked;
  }

  return {
    ok: true,
    benchmark_keys: benchmarkKeysList,
    models: entries,
    rankings: {
      cheapest_blended,
      most_context,
      by_benchmark,
    },
    attribution: {
      pricing: PRICING_ATTRIBUTION,
      benchmarks: BENCHMARK_ATTRIBUTION,
    },
    data_freshness: {
      pricing: pricingRaw?.lastUpdated ?? null,
      benchmarks: benchmarksRaw?.lastUpdated ?? null,
      status: services[0]?.lastChecked ?? null,
    },
  };
}
