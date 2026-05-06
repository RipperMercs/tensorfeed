import { Env } from './types';
import { getAgentActivity } from './activity';
import { BENCHMARK_ATTRIBUTION, PRICING_ATTRIBUTION } from './catalog';
import { NEWS_ATTRIBUTION } from './news-search';

/**
 * Premium provider deep-dive.
 *
 * One paid call returns everything an agent (or a human evaluating a
 * provider) would otherwise stitch together from 4-5 free endpoints:
 *
 *   - Live status + status_page_url + components from /api/status
 *   - All models from /api/models, sorted by tier (flagship first)
 *   - All benchmark scores for those models from /api/benchmarks
 *   - Recent news mentions for the provider from /api/news
 *   - Agent traffic attribution from the in-process activity buffer
 *
 * The aggregation IS the value. Everything here exists in free
 * endpoints; agents pay 1 credit because doing this client-side is 4
 * round-trips and a non-trivial join.
 */

interface ServiceStatus {
  name: string;
  provider: string;
  status: 'operational' | 'degraded' | 'down' | 'unknown';
  statusPageUrl?: string;
  components?: { name: string; status: string }[];
  lastChecked?: string;
}

interface ModelPricing {
  id: string;
  name: string;
  inputPrice: number;
  outputPrice: number;
  contextWindow?: number;
  capabilities?: string[];
  tier?: 'flagship' | 'mid' | 'budget' | string;
  released?: string;
  openSource?: boolean;
  license?: string;
}

interface ProviderPricing {
  id: string;
  name: string;
  url?: string;
  logo?: string;
  models: ModelPricing[];
}

interface PricingPayload {
  lastUpdated?: string;
  providers: ProviderPricing[];
}

interface BenchmarkModelEntry {
  model: string;
  provider: string;
  released?: string;
  scores: Record<string, number>;
}

interface BenchmarksPayload {
  lastUpdated?: string;
  models: BenchmarkModelEntry[];
}

interface Article {
  id: string;
  title: string;
  url: string;
  source: string;
  sourceDomain: string;
  snippet: string;
  categories: string[];
  publishedAt: string;
}

interface AgentActivityRecent {
  bot: string;
  endpoint: string;
  timestamp: string;
}

interface AgentActivityPayload {
  today_count: number;
  last_updated: string;
  recent: AgentActivityRecent[];
}

const PROVIDER_TO_BOT_PATTERNS: Record<string, string[]> = {
  anthropic: ['ClaudeBot', 'anthropic-ai'],
  openai: ['GPTBot', 'ChatGPT-User', 'OAI-SearchBot'],
  perplexity: ['PerplexityBot'],
  google: ['Google-Extended', 'Googlebot'],
  microsoft: ['Bingbot'],
  apple: ['Applebot'],
  cohere: ['cohere-ai'],
  bytedance: ['Bytespider'],
  amazon: ['Amazonbot'],
};

function botsForProvider(provider: string): string[] {
  const k = provider.toLowerCase();
  for (const [key, bots] of Object.entries(PROVIDER_TO_BOT_PATTERNS)) {
    if (k.includes(key)) return bots;
  }
  return [];
}

function tierOrder(tier?: string): number {
  if (tier === 'flagship') return 0;
  if (tier === 'mid') return 1;
  if (tier === 'budget') return 2;
  return 3;
}

function round4(n: number): number {
  return parseFloat(n.toFixed(4));
}

// === Public types ===

export interface ProviderDeepDiveModelEntry {
  id: string;
  name: string;
  tier: string | null;
  pricing: { input: number; output: number; blended: number };
  context_window: number | null;
  released: string | null;
  capabilities: string[];
  open_source: boolean;
  license: string | null;
  benchmark_scores: Record<string, number>;
}

export interface CompositeAttribution {
  pricing: import('./catalog').PricingAttribution;
  benchmarks: import('./catalog').BenchmarkAttribution;
  news: import('./news-search').NewsAttribution;
}

export interface ProviderDeepDiveResult {
  ok: true;
  provider: {
    id: string;
    name: string;
    url: string | null;
    logo: string | null;
  };
  status: {
    state: ServiceStatus['status'] | 'unknown';
    last_checked: string | null;
    status_page_url: string | null;
    components: { name: string; status: string }[];
  };
  models: ProviderDeepDiveModelEntry[];
  recent_news: { title: string; url: string; source: string; published_at: string; snippet: string }[];
  recent_news_count: number;
  agent_traffic_24h: number;
  attribution: CompositeAttribution;
  data_freshness: {
    pricing: string | null;
    benchmarks: string | null;
    status: string | null;
    news: string | null;
    activity: string | null;
  };
  notes: string[];
}

export interface ProviderDeepDiveError {
  ok: false;
  error: string;
  reason?: string;
  available_providers?: string[];
}

// === Top-level entry ===

export async function computeProviderDeepDive(
  env: Env,
  providerKey: string,
): Promise<ProviderDeepDiveResult | ProviderDeepDiveError> {
  if (!providerKey || typeof providerKey !== 'string' || !providerKey.trim()) {
    return { ok: false, error: 'provider_required' };
  }
  const k = providerKey.trim().toLowerCase();

  const [pricingRaw, benchmarksRaw, servicesRaw, articlesRaw] = await Promise.all([
    env.TENSORFEED_CACHE.get('models', 'json') as Promise<PricingPayload | null>,
    env.TENSORFEED_CACHE.get('benchmarks', 'json') as Promise<BenchmarksPayload | null>,
    env.TENSORFEED_STATUS.get('services', 'json') as Promise<ServiceStatus[] | null>,
    env.TENSORFEED_NEWS.get('articles', 'json') as Promise<Article[] | null>,
  ]);
  const activity = await getAgentActivity(env).catch(() => null);

  const pricing: PricingPayload = pricingRaw ?? { providers: [] };

  // Match provider by id or name (case-insensitive). If multiple match,
  // prefer exact id match.
  const exactById = pricing.providers.find(p => p.id.toLowerCase() === k);
  const exactByName = pricing.providers.find(p => p.name.toLowerCase() === k);
  const fuzzyByName = pricing.providers.find(
    p => p.name.toLowerCase().includes(k) || k.includes(p.name.toLowerCase()),
  );
  const provider = exactById ?? exactByName ?? fuzzyByName;

  if (!provider) {
    return {
      ok: false,
      error: 'provider_not_found',
      reason: `No provider matched "${providerKey}". Try one of the available providers.`,
      available_providers: pricing.providers.map(p => p.name),
    };
  }

  // Status: match by provider name on the services payload
  const services: ServiceStatus[] = servicesRaw ?? [];
  const lower = provider.name.toLowerCase();
  const service = services.find(s => {
    const sp = (s.provider || '').toLowerCase();
    const sn = (s.name || '').toLowerCase();
    return sp === lower || sn === lower || sp.includes(lower) || lower.includes(sp);
  });

  // Benchmarks: index by lowercased model name
  const benchmarksByModel = new Map<string, BenchmarkModelEntry>();
  for (const m of benchmarksRaw?.models ?? []) {
    benchmarksByModel.set(m.model.toLowerCase(), m);
  }

  // Models: sort by tier (flagship first), then by released desc
  const models: ProviderDeepDiveModelEntry[] = provider.models
    .slice()
    .sort((a, b) => {
      const t = tierOrder(a.tier) - tierOrder(b.tier);
      if (t !== 0) return t;
      const ra = (a.released ?? '').toString();
      const rb = (b.released ?? '').toString();
      return rb.localeCompare(ra);
    })
    .map(m => {
      const bench = benchmarksByModel.get(m.name.toLowerCase());
      return {
        id: m.id,
        name: m.name,
        tier: m.tier ?? null,
        pricing: {
          input: m.inputPrice,
          output: m.outputPrice,
          blended: round4((m.inputPrice + m.outputPrice) / 2),
        },
        context_window: m.contextWindow ?? null,
        released: m.released ?? null,
        capabilities: m.capabilities ?? [],
        open_source: m.openSource === true,
        license: m.license ?? null,
        benchmark_scores: bench?.scores ?? {},
      };
    });

  // News: filter articles whose source/sourceDomain/title mentions the provider
  const articles: Article[] = articlesRaw ?? [];
  const matchedArticles = articles.filter(a => {
    const src = (a.source || '').toLowerCase();
    const dom = (a.sourceDomain || '').toLowerCase();
    const title = (a.title || '').toLowerCase();
    return src.includes(lower) || dom.includes(lower) || title.includes(lower);
  });

  // Agent traffic: count hits matching this provider's known bot signatures
  const bots = botsForProvider(provider.name).map(b => b.toLowerCase());
  let traffic = 0;
  if (bots.length > 0 && activity) {
    const recent = (activity as AgentActivityPayload).recent ?? [];
    for (const hit of recent) {
      const bot = (hit.bot || '').toLowerCase();
      if (bots.some(b => bot.includes(b))) traffic += 1;
    }
  }

  const notes: string[] = [];
  if (!service) notes.push('No status entry matched this provider; live status reported as unknown.');
  if (models.every(m => Object.keys(m.benchmark_scores).length === 0)) {
    notes.push('No benchmark coverage for this provider yet.');
  }

  return {
    ok: true,
    provider: {
      id: provider.id,
      name: provider.name,
      url: provider.url ?? null,
      logo: provider.logo ?? null,
    },
    status: {
      state: service?.status ?? 'unknown',
      last_checked: service?.lastChecked ?? null,
      status_page_url: service?.statusPageUrl ?? null,
      components: (service?.components ?? []).slice(0, 8),
    },
    models,
    recent_news: matchedArticles.slice(0, 8).map(a => ({
      title: a.title,
      url: a.url,
      source: a.source,
      published_at: a.publishedAt,
      snippet: a.snippet,
    })),
    recent_news_count: matchedArticles.length,
    agent_traffic_24h: traffic,
    attribution: {
      pricing: PRICING_ATTRIBUTION,
      benchmarks: BENCHMARK_ATTRIBUTION,
      news: NEWS_ATTRIBUTION,
    },
    data_freshness: {
      pricing: pricingRaw?.lastUpdated ?? null,
      benchmarks: benchmarksRaw?.lastUpdated ?? null,
      status: services[0]?.lastChecked ?? null,
      news: articles[0]?.publishedAt ?? null,
      activity: (activity as AgentActivityPayload | null)?.last_updated ?? null,
    },
    notes,
  };
}
