import { Env } from './types';
import { NEWS_ATTRIBUTION, NewsAttribution } from './news-search';

/**
 * Premium "what's new" digest summary.
 *
 * The endpoint an AI agent calls when it boots up. One paid call returns
 * a curated 24-hour-window briefing across pricing changes, status
 * incidents, news headlines, and new model launches. Replaces the loop
 * of "GET news, GET status, GET models, diff against yesterday's
 * snapshot, surface the deltas" that agents would otherwise write
 * themselves.
 *
 * Window: rolling 24 hours back from now, with an optional `?days=N`
 * override (1-7) for agents that want a longer brief.
 *
 * Pricing: 1 credit. Pure aggregation over the same data the free
 * endpoints expose, but the join + delta computation is the value.
 */

const MIN_WINDOW_DAYS = 1;
const MAX_WINDOW_DAYS = 7;
const DEFAULT_WINDOW_DAYS = 1;

const DEFAULT_NEWS_LIMIT = 10;
const MAX_NEWS_LIMIT = 25;

// === KV shapes (mirrors of routing.ts / catalog.ts internal types) ===

interface ModelPricing {
  id: string;
  name: string;
  inputPrice: number;
  outputPrice: number;
  contextWindow?: number;
  tier?: string;
}

interface ProviderPricing {
  id: string;
  name: string;
  models: ModelPricing[];
}

interface PricingPayload {
  lastUpdated?: string;
  providers: ProviderPricing[];
}

interface ServiceStatus {
  name: string;
  provider: string;
  status: 'operational' | 'degraded' | 'down' | 'unknown';
  lastChecked?: string;
}

interface IncidentEntry {
  id: string;
  service: string;
  provider: string;
  severity: string;
  title: string;
  startedAt: string;
  resolvedAt: string | null;
  durationMinutes: number | null;
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

interface HistorySnapshot<T = unknown> {
  date: string;
  type: string;
  capturedAt: string;
  data: T;
}

// === Public types ===

export interface PriceChangeEntry {
  model: string;
  provider: string;
  field: 'inputPrice' | 'outputPrice';
  from: number;
  to: number;
  delta_pct: number | null;
}

export interface NewModelEntry {
  model: string;
  provider: string;
  input_per_1m: number;
  output_per_1m: number;
  tier: string | null;
}

export interface RemovedModelEntry {
  model: string;
  provider: string;
}

export interface IncidentSummary {
  service: string;
  provider: string;
  severity: string;
  title: string;
  started_at: string;
  resolved_at: string | null;
  duration_minutes: number | null;
}

export interface NewsHeadline {
  title: string;
  url: string;
  source: string;
  source_domain: string;
  published_at: string;
  snippet: string;
  categories: string[];
}

export interface WhatsNewResult {
  ok: true;
  window: { from: string; to: string; days: number; minutes?: number };
  computed_at: string;
  summary: {
    total_pricing_changes: number;
    new_models: number;
    removed_models: number;
    incidents: number;
    news_articles: number;
  };
  pricing: {
    changes: PriceChangeEntry[];
    new_models: NewModelEntry[];
    removed_models: RemovedModelEntry[];
  };
  status: {
    incidents: IncidentSummary[];
    currently_operational: number;
    currently_degraded: number;
    currently_down: number;
    currently_unknown: number;
  };
  news: NewsHeadline[];
  news_attribution: NewsAttribution;
  data_freshness: {
    pricing: string | null;
    status: string | null;
    incidents_count: number;
    news_total_corpus: number;
  };
  notes: string[];
}

export interface WhatsNewError {
  ok: false;
  error: string;
}

// === Helpers ===

function round4(n: number): number {
  return parseFloat(n.toFixed(4));
}

function pctDelta(from: number, to: number): number | null {
  if (from === 0) return null;
  return round4(((to - from) / from) * 100);
}

function todayUTC(): string {
  return new Date().toISOString().slice(0, 10);
}

function addDays(dateStr: string, n: number): string {
  const d = new Date(`${dateStr}T00:00:00Z`);
  d.setUTCDate(d.getUTCDate() + n);
  return d.toISOString().slice(0, 10);
}

function isWithinWindow(iso: string, fromMs: number, toMs: number): boolean {
  const t = new Date(iso).getTime();
  if (Number.isNaN(t)) return false;
  return t >= fromMs && t <= toMs;
}

function flattenPricing(p: PricingPayload | null): Map<string, { providerName: string; model: ModelPricing }> {
  const out = new Map<string, { providerName: string; model: ModelPricing }>();
  if (!p?.providers) return out;
  for (const prov of p.providers) {
    for (const m of prov.models) {
      out.set(m.name.toLowerCase(), { providerName: prov.name, model: m });
    }
  }
  return out;
}

// === Top-level entry ===

export interface WhatsNewOptions {
  /** Window length in days (1-7, default 1). Mutually exclusive with `minutes`. */
  days?: number;
  /**
   * Sub-daily window in minutes (5-1440). When set, overrides `days` and
   * switches the composer to "recent" mode: pricing diff is skipped because
   * history snapshots are only daily-resolution, so sub-daily pricing
   * changes are not knowable. News and status events filter to the window
   * as normal. Used by the `/api/premium/recent` endpoint for agents that
   * boot frequently and want a "what happened in the last hour" delta.
   */
  minutes?: number;
  /** Max news headlines to include (1-25, default 10). */
  newsLimit?: number;
}

export async function computeWhatsNew(
  env: Env,
  options: WhatsNewOptions = {},
): Promise<WhatsNewResult | WhatsNewError> {
  // Sub-daily mode: `minutes` set, override the days-based window.
  // Pricing diff is unavailable for sub-daily windows because history
  // snapshots are daily-resolution; the response notes this in `notes`.
  const subDaily = typeof options.minutes === 'number' && options.minutes >= 5 && options.minutes <= 1440;
  const windowMinutes = subDaily
    ? Math.max(5, Math.min(options.minutes!, 1440))
    : null;
  const days = subDaily
    ? 1   // not used for window math when subDaily; placeholder for window.days output
    : Math.max(
        MIN_WINDOW_DAYS,
        Math.min(options.days ?? DEFAULT_WINDOW_DAYS, MAX_WINDOW_DAYS),
      );
  const newsLimit = Math.max(1, Math.min(options.newsLimit ?? DEFAULT_NEWS_LIMIT, MAX_NEWS_LIMIT));

  const today = todayUTC();
  const windowStartDate = addDays(today, -days);
  const nowMs = Date.now();
  const windowStartMs = subDaily
    ? nowMs - windowMinutes! * 60 * 1000
    : nowMs - days * 24 * 60 * 60 * 1000;

  // In sub-daily mode skip the pricing history reads entirely; they're
  // daily-resolution and would yield a stale "what changed today" view
  // that doesn't match the requested window. Saves 2 KV reads per call.
  const [pricingRaw, fromSnap, toSnap, servicesRaw, incidentsRaw, articlesRaw] = await Promise.all([
    subDaily
      ? Promise.resolve(null as PricingPayload | null)
      : env.TENSORFEED_CACHE.get('models', 'json') as Promise<PricingPayload | null>,
    subDaily
      ? Promise.resolve(null as HistorySnapshot<PricingPayload> | null)
      : env.TENSORFEED_CACHE.get(`history:${windowStartDate}:models`, 'json') as Promise<HistorySnapshot<PricingPayload> | null>,
    subDaily
      ? Promise.resolve(null as HistorySnapshot<PricingPayload> | null)
      : env.TENSORFEED_CACHE.get(`history:${today}:models`, 'json') as Promise<HistorySnapshot<PricingPayload> | null>,
    env.TENSORFEED_STATUS.get('services', 'json') as Promise<ServiceStatus[] | null>,
    env.TENSORFEED_STATUS.get('incidents', 'json') as Promise<IncidentEntry[] | null>,
    env.TENSORFEED_NEWS.get('articles', 'json') as Promise<Article[] | null>,
  ]);

  // Pricing diff: prefer dated history snapshots, fall back to live `models` if today's not captured
  const before = fromSnap?.data ?? null;
  const after = toSnap?.data ?? pricingRaw ?? null;
  const beforeMap = flattenPricing(before);
  const afterMap = flattenPricing(after);

  const changes: PriceChangeEntry[] = [];
  const newModels: NewModelEntry[] = [];
  const removedModels: RemovedModelEntry[] = [];

  for (const [key, post] of afterMap) {
    const pre = beforeMap.get(key);
    if (!pre) {
      newModels.push({
        model: post.model.name,
        provider: post.providerName,
        input_per_1m: post.model.inputPrice,
        output_per_1m: post.model.outputPrice,
        tier: post.model.tier ?? null,
      });
      continue;
    }
    if (pre.model.inputPrice !== post.model.inputPrice) {
      changes.push({
        model: post.model.name,
        provider: post.providerName,
        field: 'inputPrice',
        from: pre.model.inputPrice,
        to: post.model.inputPrice,
        delta_pct: pctDelta(pre.model.inputPrice, post.model.inputPrice),
      });
    }
    if (pre.model.outputPrice !== post.model.outputPrice) {
      changes.push({
        model: post.model.name,
        provider: post.providerName,
        field: 'outputPrice',
        from: pre.model.outputPrice,
        to: post.model.outputPrice,
        delta_pct: pctDelta(pre.model.outputPrice, post.model.outputPrice),
      });
    }
  }
  for (const [key, pre] of beforeMap) {
    if (!afterMap.has(key)) {
      removedModels.push({ model: pre.model.name, provider: pre.providerName });
    }
  }

  // Status: incidents that started or resolved within the window
  const incidents = (incidentsRaw ?? []).filter(i => {
    if (isWithinWindow(i.startedAt, windowStartMs, nowMs)) return true;
    if (i.resolvedAt && isWithinWindow(i.resolvedAt, windowStartMs, nowMs)) return true;
    return false;
  });

  const services = servicesRaw ?? [];
  let opCount = 0;
  let degCount = 0;
  let downCount = 0;
  let unkCount = 0;
  for (const s of services) {
    if (s.status === 'operational') opCount += 1;
    else if (s.status === 'degraded') degCount += 1;
    else if (s.status === 'down') downCount += 1;
    else unkCount += 1;
  }

  // News: articles published in the window, newest first, capped at newsLimit
  const articles = articlesRaw ?? [];
  const matchedNews = articles
    .filter(a => isWithinWindow(a.publishedAt, windowStartMs, nowMs))
    .sort((a, b) => new Date(b.publishedAt).getTime() - new Date(a.publishedAt).getTime())
    .slice(0, newsLimit)
    .map(a => ({
      title: a.title,
      url: a.url,
      source: a.source,
      source_domain: a.sourceDomain,
      published_at: a.publishedAt,
      snippet: a.snippet,
      categories: a.categories,
    }));

  const notes: string[] = [];
  if (subDaily) {
    notes.push(`Sub-daily window (${windowMinutes} minutes). Pricing diff is omitted because history snapshots are daily-resolution. For pricing changes, request a window of 1 day or more.`);
  } else if (!fromSnap) {
    notes.push(`No pricing snapshot for ${windowStartDate}; pricing diff may be incomplete. Snapshots accumulate daily, full deltas available after a few days of operation.`);
  }
  if (!subDaily && changes.length === 0 && newModels.length === 0 && removedModels.length === 0) {
    notes.push('No pricing changes in the window. This is the steady state most days.');
  }
  if (incidents.length === 0) {
    notes.push('No new incidents in the window. Provider stability is the norm.');
  }

  return {
    ok: true,
    window: {
      from: new Date(windowStartMs).toISOString(),
      to: new Date(nowMs).toISOString(),
      days,
      ...(subDaily ? { minutes: windowMinutes! } : {}),
    },
    computed_at: new Date().toISOString(),
    summary: {
      total_pricing_changes: changes.length,
      new_models: newModels.length,
      removed_models: removedModels.length,
      incidents: incidents.length,
      news_articles: matchedNews.length,
    },
    pricing: {
      changes,
      new_models: newModels,
      removed_models: removedModels,
    },
    status: {
      incidents: incidents.map(i => ({
        service: i.service,
        provider: i.provider,
        severity: i.severity,
        title: i.title,
        started_at: i.startedAt,
        resolved_at: i.resolvedAt,
        duration_minutes: i.durationMinutes,
      })),
      currently_operational: opCount,
      currently_degraded: degCount,
      currently_down: downCount,
      currently_unknown: unkCount,
    },
    news: matchedNews,
    news_attribution: NEWS_ATTRIBUTION,
    data_freshness: {
      pricing: pricingRaw?.lastUpdated ?? null,
      status: services[0]?.lastChecked ?? null,
      incidents_count: (incidentsRaw ?? []).length,
      news_total_corpus: articles.length,
    },
    notes,
  };
}
