import { Env, Article } from './types';
import { pollRSSFeeds, RSSPollResult } from './rss';
import { pollStatusPages } from './status';
import { updateDailyData, updateCatalog } from './catalog';
import { trackAgentActivity, getAgentActivity, trackBotHitDirect } from './activity';
import { postTopStories } from './twitter';
import { pollPodcastFeeds } from './podcasts';
import { pollTrendingRepos } from './trending';
import { captureAllSnapshots, getSnapshotSummary, restoreFromSnapshot, getLatestSnapshot } from './snapshots';
import { captureHistory, listHistory, readHistory } from './history';
import {
  resolveRange,
  getPricingSeries,
  getBenchmarkSeries,
  getStatusUptime,
  compareHistory,
  MAX_RANGE_DAYS,
  DEFAULT_RANGE_DAYS,
} from './history-series';
import {
  createWatch,
  getWatch,
  listWatchesForToken,
  deleteWatch,
  runPriceWatchCycle,
  runDigestWatchCycle,
} from './watches';
import {
  getEnrichedDirectory,
  EnrichedOptions,
  SortKey,
} from './agents-enriched';
import { searchNews, NewsSearchOptions } from './news-search';
import { computeCostProjection, CostProjectionOptions } from './cost-projection';
import { computeForecast, ForecastOptions, PriceField } from './forecast';
import { computeProviderDeepDive } from './provider-deepdive';
import { compareModels } from './compare-models';
import { computeWhatsNew } from './whats-new';
import { computeRouting, checkRoutingPreviewRateLimit, hoursUntilUTCRollover, RoutingTask } from './routing';
import {
  requirePayment,
  getPaymentInfo,
  createQuote,
  confirmPayment,
  getBalance,
  logPremiumUsage,
  getRollup,
  listRollupDates,
  getTokenUsage,
  getPaymentHistory,
  validateAndCharge,
} from './payments';
import { recordPollRun, checkNewsStaleness, alertStaleNews, sendDailySummary, getAlertsStatus } from './alerts';

const CORS_HEADERS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type',
};

function jsonResponse(data: unknown, status = 200, maxAge = 60): Response {
  return new Response(JSON.stringify(data), {
    status,
    headers: { ...CORS_HEADERS, 'Content-Type': 'application/json', 'Cache-Control': `public, max-age=${maxAge}` },
  });
}

function xmlResponse(xml: string): Response {
  return new Response(xml, {
    headers: { ...CORS_HEADERS, 'Content-Type': 'application/rss+xml; charset=utf-8', 'Cache-Control': 'public, max-age=300' },
  });
}

/**
 * String compare that is best-effort constant-time so a wrong-secret
 * attempt cannot be distinguished from a right-length-wrong-bytes
 * attempt by timing alone. JS optimizers can still introduce
 * variability; acceptable for v1 per the cross-Worker validate-and-
 * charge spec (April 2026).
 */
function constantTimeEqual(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i++) {
    diff |= a.charCodeAt(i) ^ b.charCodeAt(i);
  }
  return diff === 0;
}

function escapeXml(str: string): string {
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
}

function articlesToRSS(articles: Article[], title: string, feedUrl: string): string {
  const items = articles.map(a => `    <item>
      <title>${escapeXml(a.title)}</title>
      <link>${escapeXml(a.url)}</link>
      <description>${escapeXml(a.snippet)}</description>
      <pubDate>${new Date(a.publishedAt).toUTCString()}</pubDate>
      <guid isPermaLink="true">${escapeXml(a.url)}</guid>
      <source url="https://${escapeXml(a.sourceDomain)}">${escapeXml(a.source)}</source>
${a.categories.map(c => `      <category>${escapeXml(c)}</category>`).join('\n')}
    </item>`).join('\n');

  return `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0" xmlns:atom="http://www.w3.org/2005/Atom">
  <channel>
    <title>${escapeXml(title)}</title>
    <link>https://tensorfeed.ai</link>
    <description>AI news, model tracking, and real-time AI ecosystem data for humans and agents.</description>
    <language>en-us</language>
    <lastBuildDate>${new Date().toUTCString()}</lastBuildDate>
    <atom:link href="${escapeXml(feedUrl)}" rel="self" type="application/rss+xml"/>
    <ttl>10</ttl>
${items}
  </channel>
</rss>`;
}

function articlesToJsonFeed(articles: Article[]): object {
  return {
    version: 'https://jsonfeed.org/version/1.1',
    title: 'TensorFeed.ai',
    home_page_url: 'https://tensorfeed.ai',
    feed_url: 'https://tensorfeed.ai/feed.json',
    description: 'AI news, model tracking, and real-time AI ecosystem data for humans and agents.',
    items: articles.map(a => ({
      id: a.url,
      url: a.url,
      title: a.title,
      content_text: a.snippet,
      date_published: a.publishedAt,
      authors: [{ name: a.source }],
      tags: a.categories,
    })),
  };
}

// ── Cache API helper (free, unlimited reads) ────────────────────────

async function cacheGet(request: Request): Promise<Response | undefined> {
  const cache = caches.default;
  const cached = await cache.match(request);
  return cached;
}

async function cachePut(request: Request, response: Response, ttlSeconds: number): Promise<void> {
  const cache = caches.default;
  const cloned = new Response(response.body, response);
  cloned.headers.set('Cache-Control', `public, max-age=${ttlSeconds}`);
  await cache.put(request, cloned);
}

/**
 * Try Cache API first, then KV, then cache the KV result.
 * Dramatically reduces KV read operations.
 */
async function cachedKVGet(
  request: Request,
  kvNamespace: KVNamespace,
  key: string,
  cacheTTL: number
): Promise<unknown> {
  // Build a synthetic cache URL for this KV key
  const cacheUrl = new URL(request.url);
  cacheUrl.pathname = `/__kv_cache/${key}`;
  const cacheRequest = new Request(cacheUrl.toString());

  // Try Cache API first (free, unlimited)
  try {
    const cached = await cacheGet(cacheRequest);
    if (cached) {
      return cached.json();
    }
  } catch (cacheErr) {
    console.warn(`Cache API read failed for key "${key}":`, cacheErr);
  }

  // Cache miss: read from KV
  let data: unknown;
  try {
    data = await kvNamespace.get(key, 'json');
  } catch (kvErr) {
    console.error(`KV read failed for key "${key}":`, kvErr);
    return undefined;
  }

  // Store in Cache API for next time
  if (data) {
    try {
      const resp = new Response(JSON.stringify(data), {
        headers: { 'Content-Type': 'application/json', 'Cache-Control': `public, max-age=${cacheTTL}` },
      });
      await cachePut(cacheRequest, resp, cacheTTL);
    } catch (putErr) {
      console.warn(`Cache API write failed for key "${key}":`, putErr);
    }
  }

  return data;
}

/**
 * Wraps a successful premium endpoint result with billing metadata and
 * the X-Payment-* response headers used by both credits and x402 flows.
 */
function premiumResponse(
  result: object,
  payment: { tokenRemaining?: number; token?: string; newToken?: boolean },
  creditsCharged: number,
): Response {
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    'Access-Control-Allow-Origin': '*',
    'Cache-Control': 'no-store',
  };
  if (payment.token) headers['X-Payment-Token-Balance'] = String(payment.tokenRemaining ?? 0);
  if (payment.newToken && payment.token) {
    headers['X-Payment-Token'] = payment.token;
    headers['X-Payment-Token-Note'] = 'Save this token; use Authorization: Bearer <token> for future calls.';
  }

  return new Response(
    JSON.stringify({
      ...result,
      billing: {
        credits_charged: creditsCharged,
        credits_remaining: payment.tokenRemaining,
        ...(payment.newToken ? { new_token_issued: true, token: payment.token } : {}),
      },
    }),
    { status: 200, headers },
  );
}

// ─────────────────────────────────────────────────────────────────────

export default {
  async fetch(request: Request, env: Env, ctx: ExecutionContext): Promise<Response> {
    const url = new URL(request.url);
    const path = url.pathname;

    if (request.method === 'OPTIONS') {
      return new Response(null, { headers: CORS_HEADERS });
    }

    // Track agent/bot activity (non-blocking, batched in memory)
    ctx.waitUntil(trackAgentActivity(request, env, path));

    // Agent activity endpoint (reads from memory cache, minimal KV)
    if (path === '/api/agents/activity') {
      const activity = await getAgentActivity(env);
      return jsonResponse(activity, 200, 10);
    }

    // Health check (1 KV read, cached 60s)
    if (path === '/api/ping') {
      return jsonResponse({ ok: true, deployed: 'auto', timestamp: new Date().toISOString() });
    }

    if (path === '/api/health') {
      const [newsMeta, lastCron, modelsData, benchmarksData, agentsUpdated, trendingRepos, podcasts, incidents, dailyLog] = await Promise.all([
        cachedKVGet(request, env.TENSORFEED_NEWS, 'meta', 60),
        cachedKVGet(request, env.TENSORFEED_CACHE, 'last-cron-run', 30),
        cachedKVGet(request, env.TENSORFEED_CACHE, 'models', 120) as Promise<{ lastUpdated?: string; providers?: { models: unknown[] }[] } | null>,
        cachedKVGet(request, env.TENSORFEED_CACHE, 'benchmarks', 120) as Promise<{ lastUpdated?: string; models?: unknown[] } | null>,
        cachedKVGet(request, env.TENSORFEED_CACHE, 'agents-updated', 120) as Promise<{ lastChecked?: string; lastManualUpdate?: string; agentCount?: number } | null>,
        cachedKVGet(request, env.TENSORFEED_CACHE, 'trending-repos', 120) as Promise<unknown[] | null>,
        cachedKVGet(request, env.TENSORFEED_CACHE, 'podcasts', 120) as Promise<unknown[] | null>,
        cachedKVGet(request, env.TENSORFEED_STATUS, 'incidents', 120) as Promise<unknown[] | null>,
        cachedKVGet(request, env.TENSORFEED_CACHE, 'daily-update-log', 60),
      ]);

      const modelCount = modelsData?.providers?.reduce((n: number, p: { models: unknown[] }) => n + p.models.length, 0) ?? 0;

      // Agents staleness warning: flag if last manual update is older than 30 days
      let agentsStale = false;
      if (agentsUpdated?.lastManualUpdate) {
        const lastUpdate = new Date(agentsUpdated.lastManualUpdate);
        const daysSince = (Date.now() - lastUpdate.getTime()) / (1000 * 60 * 60 * 24);
        agentsStale = daysSince > 30;
      }

      return jsonResponse({
        ok: true,
        timestamp: new Date().toISOString(),
        news: newsMeta || { totalArticles: 0, lastUpdated: 'never' },
        models: { lastUpdated: modelsData?.lastUpdated || 'never', count: modelCount },
        benchmarks: { lastUpdated: benchmarksData?.lastUpdated || 'never', count: benchmarksData?.models?.length ?? 0 },
        agents: {
          lastManualUpdate: agentsUpdated?.lastManualUpdate || 'never',
          lastChecked: agentsUpdated?.lastChecked || 'never',
          count: agentsUpdated?.agentCount ?? 0,
          stale: agentsStale,
          ...(agentsStale ? { warning: 'Agents directory has not been manually updated in over 30 days' } : {}),
        },
        trending: { lastUpdated: (trendingRepos as unknown[])?.length ? 'active' : 'never', count: (trendingRepos as unknown[])?.length ?? 0 },
        podcasts: { lastUpdated: (podcasts as unknown[])?.length ? 'active' : 'never', count: (podcasts as unknown[])?.length ?? 0 },
        incidents: { count: (incidents as unknown[])?.length ?? 0 },
        lastDailyUpdate: dailyLog || null,
        lastCronRun: lastCron || null,
      });
    }

    // === NEWS ENDPOINTS (cached 60s via Cache API) ===

    if (path === '/api/news' || path === '/api/agents/news' || path === '/api/agents/news.json') {
      const category = url.searchParams.get('category');
      const parsedLimit = parseInt(url.searchParams.get('limit') || '50', 10);
      const limit = Math.min(Number.isNaN(parsedLimit) ? 50 : parsedLimit, 200);

      let articles = await cachedKVGet(request, env.TENSORFEED_NEWS, 'articles', 60) as Article[] | null;
      if (!articles) articles = [];

      if (category && category !== 'All') {
        articles = articles.filter(a =>
          a.categories.some(c => c.toLowerCase().includes(category.toLowerCase()))
        );
      }

      return jsonResponse({
        ok: true,
        source: 'tensorfeed.ai',
        updated: new Date().toISOString(),
        count: Math.min(articles.length, limit),
        articles: articles.slice(0, limit),
      });
    }

    // RSS feed (cached 300s). Served at both /feed.xml and /api/feed.xml.
    if (path === '/feed.xml' || path === '/api/feed.xml' || path === '/api/feed/all.xml' || path === '/feed/all.xml') {
      const articles = await cachedKVGet(request, env.TENSORFEED_NEWS, 'articles', 300) as Article[] | null;
      return xmlResponse(articlesToRSS(articles || [], 'TensorFeed.ai', 'https://tensorfeed.ai/feed.xml'));
    }

    // Category RSS feeds. Served at both /feed/<cat>.xml and /api/feed/<cat>.xml.
    if ((path.startsWith('/feed/') || path.startsWith('/api/feed/')) && path.endsWith('.xml')) {
      const category = path.replace(/^\/(api\/)?feed\//, '').replace('.xml', '');
      const articles = await cachedKVGet(request, env.TENSORFEED_NEWS, 'articles', 300) as Article[] | null;
      if (!articles) return xmlResponse(articlesToRSS([], `TensorFeed.ai - ${category}`, `https://tensorfeed.ai${path}`));

      const categoryMap: Record<string, string[]> = {
        research: ['Research'],
        tools: ['Tools & Dev'],
        opensource: ['Open Source'],
        hardware: ['Hardware/Chips'],
        policy: ['Policy & Safety'],
        community: ['Community'],
      };

      const filterCats = categoryMap[category.toLowerCase()] || [category];
      const filtered = articles.filter(a =>
        a.categories.some(c => filterCats.some(fc => c.toLowerCase().includes(fc.toLowerCase())))
      );

      return xmlResponse(articlesToRSS(filtered, `TensorFeed.ai - ${category}`, `https://tensorfeed.ai${path}`));
    }

    // JSON Feed (cached 60s). Served at both /feed.json and /api/feed.json.
    if (path === '/feed.json' || path === '/api/feed.json') {
      const articles = await cachedKVGet(request, env.TENSORFEED_NEWS, 'articles', 60) as Article[] | null;
      return jsonResponse(articlesToJsonFeed(articles || []), 200, 60);
    }

    // === STATUS ENDPOINTS (cached 120s) ===

    if (path === '/api/status' || path === '/api/agents/status' || path === '/api/agents/status.json') {
      const services = await cachedKVGet(request, env.TENSORFEED_STATUS, 'services', 120);
      return jsonResponse({
        ok: true,
        source: 'tensorfeed.ai',
        checked: new Date().toISOString(),
        services: services || [],
      }, 200, 120);
    }

    // === INCIDENTS ENDPOINT (cached 120s) ===

    if (path === '/api/incidents') {
      const incidents = await cachedKVGet(request, env.TENSORFEED_STATUS, 'incidents', 120);
      return jsonResponse({
        ok: true,
        source: 'tensorfeed.ai',
        incidents: incidents || [],
      }, 200, 120);
    }

    if (path === '/api/status/summary') {
      const summary = await cachedKVGet(request, env.TENSORFEED_STATUS, 'summary', 120);
      return jsonResponse({
        ok: true,
        source: 'tensorfeed.ai',
        services: summary || [],
      }, 200, 120);
    }

    // === PRICING ENDPOINT (cached 300s) ===

    if (path === '/api/agents/pricing' || path === '/api/pricing' || path === '/api/agents/pricing.json') {
      const cached = await cachedKVGet(request, env.TENSORFEED_CACHE, 'pricing', 300);
      return jsonResponse({
        ok: true,
        source: 'tensorfeed.ai',
        updated: new Date().toISOString(),
        providers: cached || [],
      }, 200, 300);
    }

    // === MODELS ENDPOINT (cached 300s) ===

    if (path === '/api/models') {
      // Try new 'models' key first, fall back to legacy 'pricing' key
      let cached = await cachedKVGet(request, env.TENSORFEED_CACHE, 'models', 300);
      if (!cached) cached = await cachedKVGet(request, env.TENSORFEED_CACHE, 'pricing', 300);
      return jsonResponse({
        ok: true,
        source: 'tensorfeed.ai',
        ...(cached as Record<string, unknown> || {}),
      }, 200, 300);
    }

    // === BENCHMARKS ENDPOINT (cached 300s) ===

    if (path === '/api/benchmarks') {
      const cached = await cachedKVGet(request, env.TENSORFEED_CACHE, 'benchmarks', 300);
      return jsonResponse({
        ok: true,
        source: 'tensorfeed.ai',
        ...(cached as Record<string, unknown> || {}),
      }, 200, 300);
    }

    // === AGENTS DIRECTORY ENDPOINT (cached 300s) ===

    if (path === '/api/agents/directory') {
      const cached = await cachedKVGet(request, env.TENSORFEED_CACHE, 'agents-directory', 300);
      return jsonResponse({
        ok: true,
        source: 'tensorfeed.ai',
        ...(cached as Record<string, unknown> || {}),
      }, 200, 300);
    }

    // === PODCASTS ENDPOINT (cached 300s) ===

    if (path === '/api/podcasts') {
      const parsedPodLimit = parseInt(url.searchParams.get('limit') || '50', 10);
      const limit = Math.min(Number.isNaN(parsedPodLimit) ? 50 : parsedPodLimit, 100);
      const episodes = await cachedKVGet(request, env.TENSORFEED_CACHE, 'podcasts', 300) as unknown[] | null;
      return jsonResponse({
        ok: true,
        source: 'tensorfeed.ai',
        updated: new Date().toISOString(),
        count: Math.min((episodes || []).length, limit),
        episodes: (episodes || []).slice(0, limit),
      }, 200, 300);
    }

    // === TRENDING REPOS ENDPOINT (cached 300s) ===

    if (path === '/api/trending-repos') {
      const parsedRepoLimit = parseInt(url.searchParams.get('limit') || '20', 10);
      const limit = Math.min(Number.isNaN(parsedRepoLimit) ? 20 : parsedRepoLimit, 50);
      const repos = await cachedKVGet(request, env.TENSORFEED_CACHE, 'trending-repos', 300) as unknown[] | null;
      return jsonResponse({
        ok: true,
        source: 'tensorfeed.ai',
        updated: new Date().toISOString(),
        count: Math.min((repos || []).length, limit),
        repos: (repos || []).slice(0, limit),
      }, 200, 300);
    }

    // === META ENDPOINT (cached 60s) ===

    if (path === '/api/meta') {
      const newsMeta = await cachedKVGet(request, env.TENSORFEED_NEWS, 'meta', 60);
      return jsonResponse({
        ok: true,
        site: 'tensorfeed.ai',
        description: 'AI news, model tracking, and real-time AI ecosystem data.',
        feeds: {
          rss: '/api/feed.xml',
          json: '/api/feed.json',
          research: '/api/feed/research.xml',
          tools: '/api/feed/tools.xml',
        },
        api: {
          news: '/api/agents/news',
          status: '/api/agents/status',
          pricing: '/api/agents/pricing',
          models: '/api/models',
          benchmarks: '/api/benchmarks',
          agentsDirectory: '/api/agents/directory',
          agentActivity: '/api/agents/activity',
          podcasts: '/api/podcasts',
          trendingRepos: '/api/trending-repos',
          health: '/api/health',
          history: '/api/history',
          historySnapshot: '/api/history/{YYYY-MM-DD}/{type}',
          routingPreview: '/api/preview/routing',
          premiumRouting: '/api/premium/routing',
          premiumPricingSeries: '/api/premium/history/pricing/series?model=&from=&to=',
          premiumBenchmarkSeries: '/api/premium/history/benchmarks/series?model=&benchmark=&from=&to=',
          premiumStatusUptime: '/api/premium/history/status/uptime?provider=&from=&to=',
          premiumHistoryCompare: '/api/premium/history/compare?from=&to=&type=pricing|benchmarks',
          premiumWatchesCreate: 'POST /api/premium/watches (1 credit per registration)',
          premiumWatchesList: 'GET /api/premium/watches',
          premiumWatchesItem: 'GET|DELETE /api/premium/watches/{id}',
          premiumAgentsDirectory: '/api/premium/agents/directory?category=&status=&open_source=&capability=&sort=&limit=',
          premiumNewsSearch: '/api/premium/news/search?q=&from=&to=&provider=&category=&limit=',
          premiumCostProjection: '/api/premium/cost/projection?model=opus-4-7,gpt-5-5&input_tokens_per_day=&output_tokens_per_day=&horizon=monthly',
          premiumForecast: '/api/premium/forecast?target=price|benchmark&model=&field=inputPrice|outputPrice|blended&benchmark=&lookback=30&horizon=7',
          premiumProviderDeepDive: '/api/premium/providers/{name}',
          premiumCompareModels: '/api/premium/compare/models?ids=opus-4-7,gpt-5-5,gemini-3',
          premiumWhatsNew: '/api/premium/whats-new?days=1&news_limit=10',
          paymentInfo: '/api/payment/info',
          paymentBuyCredits: '/api/payment/buy-credits',
          paymentConfirm: '/api/payment/confirm',
          paymentBalance: '/api/payment/balance',
          paymentUsage: '/api/payment/usage',
          paymentHistory: '/api/payment/history',
        },
        admin: {
          usage: '/api/admin/usage?date=YYYY-MM-DD&key=<env>',
          usageDates: '/api/admin/usage/dates?key=<env>',
        },
        news: newsMeta,
      }, 200, 60);
    }

    // === CRON DEBUG LOG ===

    if (path === '/api/cron-status') {
      const [cronLog, lastCron, newsMeta] = await Promise.all([
        cachedKVGet(request, env.TENSORFEED_CACHE, 'CRON_LOG', 30),
        cachedKVGet(request, env.TENSORFEED_CACHE, 'last-cron-run', 30),
        cachedKVGet(request, env.TENSORFEED_NEWS, 'meta', 30),
      ]);
      return jsonResponse({
        ok: true,
        now: new Date().toISOString(),
        lastCronRun: lastCron || null,
        newsMeta: newsMeta || null,
        cronLog: cronLog || null,
      }, 200, 30);
    }

    if (path === '/api/snapshots') {
      const summary = await getSnapshotSummary(env);
      return jsonResponse({ ok: true, now: new Date().toISOString(), snapshots: summary }, 200, 60);
    }

    // === HISTORICAL SNAPSHOTS (Phase 0 of agent payments) ===

    if (path === '/api/history') {
      const list = await listHistory(env);
      return jsonResponse({ ok: true, ...list }, 200, 3600);
    }

    const historyMatch = path.match(/^\/api\/history\/(\d{4}-\d{2}-\d{2})\/([a-z-]+)$/);
    if (historyMatch) {
      const [, date, type] = historyMatch;
      const snapshot = await readHistory(env, date, type);
      if (!snapshot) {
        return jsonResponse({ ok: false, error: 'not_found', date, type }, 404);
      }
      return jsonResponse({ ok: true, ...snapshot }, 200, 86400);
    }

    // === ROUTING PREVIEW (free, rate-limited; Phase 1 of agent payments) ===
    // Tier 2 routing engine, exposed as a free preview while the paid
    // /api/premium/routing path is built. Returns top 1 model only with
    // no score breakdown. 5 calls/day per IP.

    if (path === '/api/preview/routing') {
      const ip = request.headers.get('CF-Connecting-IP') || request.headers.get('x-forwarded-for') || 'anonymous';
      const limit = await checkRoutingPreviewRateLimit(env, ip, 5);
      if (!limit.allowed) {
        return jsonResponse(
          {
            ok: false,
            error: 'rate_limit_exceeded',
            limit: limit.limit,
            remaining: 0,
            reset_in_hours: hoursUntilUTCRollover(),
            premium_endpoint: '/api/premium/routing',
            message:
              'Free preview limited to 5 calls/day per IP. The paid /api/premium/routing endpoint (top 5 models, full score detail, no rate limit) ships in Phase 1 of agent payments.',
          },
          429,
        );
      }

      const taskParam = url.searchParams.get('task');
      const task: RoutingTask | undefined =
        taskParam === 'code' || taskParam === 'reasoning' || taskParam === 'creative' || taskParam === 'general'
          ? taskParam
          : undefined;
      const budget = parseFloat(url.searchParams.get('budget') ?? '');
      const minQuality = parseFloat(url.searchParams.get('min_quality') ?? '');

      const result = await computeRouting(env, {
        task,
        budget: Number.isFinite(budget) ? budget : undefined,
        minQuality: Number.isFinite(minQuality) ? minQuality : undefined,
        topN: 1,
      });

      const top = result.recommendations[0];
      return jsonResponse(
        {
          ok: true,
          preview: true,
          task: result.task,
          computed_at: result.computed_at,
          rate_limit: { limit: limit.limit, remaining: limit.remaining, scope: 'per IP per UTC day' },
          recommendation: top
            ? {
                model: top.model.name,
                provider: top.model.provider,
              }
            : null,
          upgrade: {
            message:
              'The premium endpoint returns the top 5 models with full score breakdown, pricing, status, and component-level detail. No rate limit. Ships in Phase 1 of agent payments.',
            premium_endpoint: '/api/premium/routing',
            preview_limits: { top_n: 1, includes_score_breakdown: false, includes_pricing: false, rate_limit_per_ip_per_day: 5 },
          },
        },
        200,
        0, // do not Cache-API the response; rate limiting is per-IP
      );
    }

    // === PAYMENT ENDPOINTS (Phase 1 of agent payments) ===

    if (path === '/api/payment/info') {
      const info = await getPaymentInfo(env);
      return jsonResponse(info, 200, 60);
    }

    if (path === '/api/payment/buy-credits' && request.method === 'POST') {
      try {
        const body = await request.json() as { amount_usd?: number };
        const amountUsd = typeof body.amount_usd === 'number' ? body.amount_usd : NaN;
        if (!Number.isFinite(amountUsd) || amountUsd < 0.5 || amountUsd > 10000) {
          return jsonResponse(
            { ok: false, error: 'invalid_amount', message: 'amount_usd must be a number between 0.5 and 10000.' },
            400,
          );
        }
        const { nonce, quote, wallet } = await createQuote(env, amountUsd);
        return jsonResponse({
          ok: true,
          wallet,
          memo: nonce,
          amount_usd: quote.amount_usd,
          credits: quote.credits,
          currency: 'USDC',
          network: 'base',
          expires_at: new Date(quote.expires_at).toISOString(),
          ttl_seconds: Math.round((quote.expires_at - Date.now()) / 1000),
          next_step: `Send ${quote.amount_usd} USDC on Base to ${wallet}, then POST /api/payment/confirm with { tx_hash, nonce: "${nonce}" }`,
        });
      } catch {
        return jsonResponse({ ok: false, error: 'invalid_request_body' }, 400);
      }
    }

    if (path === '/api/payment/confirm' && request.method === 'POST') {
      try {
        const body = await request.json() as { tx_hash?: string; nonce?: string };
        const txHash = (body.tx_hash || '').trim();
        const nonce = body.nonce ? String(body.nonce).trim() : undefined;
        if (!txHash) {
          return jsonResponse({ ok: false, error: 'tx_hash_required' }, 400);
        }
        const result = await confirmPayment(env, txHash, request, nonce);
        if (!result.ok) {
          return jsonResponse(result, 400);
        }
        return jsonResponse(result);
      } catch {
        return jsonResponse({ ok: false, error: 'invalid_request_body' }, 400);
      }
    }

    if (path === '/api/payment/balance') {
      const authHeader = request.headers.get('Authorization');
      const token = authHeader?.startsWith('Bearer ') ? authHeader.slice(7).trim() : '';
      if (!token) {
        return jsonResponse(
          { ok: false, error: 'token_required', message: 'Send the bearer token via Authorization: Bearer <token>' },
          401,
        );
      }
      const result = await getBalance(env, token);
      if (!result.ok) {
        return jsonResponse(result, 404);
      }
      return jsonResponse(result, 200, 0);
    }

    if (path === '/api/payment/usage') {
      const authHeader = request.headers.get('Authorization');
      const token = authHeader?.startsWith('Bearer ') ? authHeader.slice(7).trim() : '';
      if (!token) {
        return jsonResponse(
          { ok: false, error: 'token_required', message: 'Send the bearer token via Authorization: Bearer <token>' },
          401,
        );
      }
      const result = await getTokenUsage(env, token);
      if (!result) {
        return jsonResponse({ ok: false, error: 'token_not_found' }, 404);
      }
      return jsonResponse(result, 200, 0);
    }

    // Per-token payment history. Audit log of credit purchases scoped
    // to the requesting bearer: which on-chain txs added how many
    // credits and when. Free, no credit cost. Backwards-compatible
    // with tokens minted before this ledger existed (returns empty
    // purchases array). Paired with /api/payment/usage which logs the
    // spend side; together they cover the full token lifecycle.

    if (path === '/api/payment/history') {
      const authHeader = request.headers.get('Authorization');
      const token = authHeader?.startsWith('Bearer ') ? authHeader.slice(7).trim() : '';
      if (!token) {
        return jsonResponse(
          { ok: false, error: 'token_required', message: 'Send the bearer token via Authorization: Bearer <token>' },
          401,
        );
      }
      const result = await getPaymentHistory(env, token);
      if (!result) {
        return jsonResponse({ ok: false, error: 'token_not_found' }, 404);
      }
      return jsonResponse(result, 200, 0);
    }

    // === PAID PREMIUM ENDPOINT: ROUTING (Tier 2, requires credits) ===

    if (path === '/api/premium/routing') {
      const payment = await requirePayment(request, env, 2);
      if (!payment.paid) {
        return payment.response!;
      }

      const taskParam = url.searchParams.get('task');
      const task: RoutingTask | undefined =
        taskParam === 'code' || taskParam === 'reasoning' || taskParam === 'creative' || taskParam === 'general'
          ? taskParam
          : undefined;
      const budget = parseFloat(url.searchParams.get('budget') ?? '');
      const minQuality = parseFloat(url.searchParams.get('min_quality') ?? '');
      const topNRaw = parseInt(url.searchParams.get('top_n') ?? '5', 10);
      const topN = Number.isFinite(topNRaw) ? Math.max(1, Math.min(topNRaw, 10)) : 5;

      const wq = parseFloat(url.searchParams.get('w_quality') ?? '');
      const wa = parseFloat(url.searchParams.get('w_availability') ?? '');
      const wc = parseFloat(url.searchParams.get('w_cost') ?? '');
      const wl = parseFloat(url.searchParams.get('w_latency') ?? '');
      const customWeights =
        Number.isFinite(wq) || Number.isFinite(wa) || Number.isFinite(wc) || Number.isFinite(wl)
          ? {
              ...(Number.isFinite(wq) ? { quality: wq } : {}),
              ...(Number.isFinite(wa) ? { availability: wa } : {}),
              ...(Number.isFinite(wc) ? { cost: wc } : {}),
              ...(Number.isFinite(wl) ? { latency: wl } : {}),
            }
          : undefined;

      const result = await computeRouting(env, {
        task,
        budget: Number.isFinite(budget) ? budget : undefined,
        minQuality: Number.isFinite(minQuality) ? minQuality : undefined,
        weights: customWeights,
        topN,
      });

      // Fire-and-forget usage logging so the response isn't blocked
      ctx.waitUntil(
        logPremiumUsage(env, '/api/premium/routing', request.headers.get('User-Agent') || 'unknown', 1, payment.token),
      );

      const headers: Record<string, string> = {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*',
        'Cache-Control': 'no-store',
      };
      if (payment.token) headers['X-Payment-Token-Balance'] = String(payment.tokenRemaining ?? 0);
      if (payment.newToken && payment.token) {
        headers['X-Payment-Token'] = payment.token;
        headers['X-Payment-Token-Note'] = 'Save this token; use Authorization: Bearer <token> for future calls.';
      }

      return new Response(
        JSON.stringify({
          ...result,
          billing: {
            credits_charged: 1,
            credits_remaining: payment.tokenRemaining,
            ...(payment.newToken ? { new_token_issued: true, token: payment.token } : {}),
          },
        }),
        { status: 200, headers },
      );
    }

    // === PAID PREMIUM ENDPOINTS: HISTORY SERIES (Tier 1, 1 credit each) ===
    // Derived/aggregated views over the daily history:* snapshots captured
    // by Phase 0. Single-date snapshots stay free at /api/history; these
    // pay endpoints add deltas, ranges, uptime rollups, and date diffs.

    if (path === '/api/premium/history/pricing/series') {
      const payment = await requirePayment(request, env, 1);
      if (!payment.paid) return payment.response!;

      const model = url.searchParams.get('model')?.trim();
      if (!model) {
        return jsonResponse(
          { ok: false, error: 'model_required', hint: 'Pass ?model=<id-or-name>' },
          400,
        );
      }
      const range = resolveRange(url.searchParams.get('from'), url.searchParams.get('to'));
      if (!range.ok) {
        return jsonResponse(
          {
            ok: false,
            error: range.error,
            limits: { max_range_days: MAX_RANGE_DAYS, default_range_days: DEFAULT_RANGE_DAYS },
          },
          400,
        );
      }

      const result = await getPricingSeries(env, model, range.from, range.to);
      ctx.waitUntil(
        logPremiumUsage(env, '/api/premium/history/pricing/series', request.headers.get('User-Agent') || 'unknown', 1, payment.token),
      );
      return premiumResponse(result, payment, 1);
    }

    if (path === '/api/premium/history/benchmarks/series') {
      const payment = await requirePayment(request, env, 1);
      if (!payment.paid) return payment.response!;

      const model = url.searchParams.get('model')?.trim();
      const benchmark = url.searchParams.get('benchmark')?.trim();
      if (!model || !benchmark) {
        return jsonResponse(
          {
            ok: false,
            error: 'model_and_benchmark_required',
            hint: 'Pass ?model=<name>&benchmark=<key> (e.g. swe_bench, mmlu_pro, gpqa_diamond, math, human_eval)',
          },
          400,
        );
      }
      const range = resolveRange(url.searchParams.get('from'), url.searchParams.get('to'));
      if (!range.ok) {
        return jsonResponse(
          {
            ok: false,
            error: range.error,
            limits: { max_range_days: MAX_RANGE_DAYS, default_range_days: DEFAULT_RANGE_DAYS },
          },
          400,
        );
      }

      const result = await getBenchmarkSeries(env, model, benchmark, range.from, range.to);
      ctx.waitUntil(
        logPremiumUsage(env, '/api/premium/history/benchmarks/series', request.headers.get('User-Agent') || 'unknown', 1, payment.token),
      );
      return premiumResponse(result, payment, 1);
    }

    if (path === '/api/premium/history/status/uptime') {
      const payment = await requirePayment(request, env, 1);
      if (!payment.paid) return payment.response!;

      const provider = url.searchParams.get('provider')?.trim();
      if (!provider) {
        return jsonResponse(
          { ok: false, error: 'provider_required', hint: 'Pass ?provider=<name>' },
          400,
        );
      }
      const range = resolveRange(url.searchParams.get('from'), url.searchParams.get('to'));
      if (!range.ok) {
        return jsonResponse(
          {
            ok: false,
            error: range.error,
            limits: { max_range_days: MAX_RANGE_DAYS, default_range_days: DEFAULT_RANGE_DAYS },
          },
          400,
        );
      }

      const result = await getStatusUptime(env, provider, range.from, range.to);
      ctx.waitUntil(
        logPremiumUsage(env, '/api/premium/history/status/uptime', request.headers.get('User-Agent') || 'unknown', 1, payment.token),
      );
      return premiumResponse(result, payment, 1);
    }

    if (path === '/api/premium/history/compare') {
      const payment = await requirePayment(request, env, 1);
      if (!payment.paid) return payment.response!;

      const fromDate = url.searchParams.get('from')?.trim();
      const toDate = url.searchParams.get('to')?.trim();
      const typeParam = url.searchParams.get('type')?.trim() ?? 'pricing';
      if (!fromDate || !toDate) {
        return jsonResponse(
          { ok: false, error: 'from_and_to_required', hint: 'Pass ?from=YYYY-MM-DD&to=YYYY-MM-DD&type=pricing|benchmarks' },
          400,
        );
      }
      if (typeParam !== 'pricing' && typeParam !== 'benchmarks') {
        return jsonResponse(
          { ok: false, error: 'invalid_type', hint: 'type must be pricing or benchmarks' },
          400,
        );
      }
      if (!/^\d{4}-\d{2}-\d{2}$/.test(fromDate) || !/^\d{4}-\d{2}-\d{2}$/.test(toDate)) {
        return jsonResponse({ ok: false, error: 'invalid_date_format' }, 400);
      }

      const result = await compareHistory(env, fromDate, toDate, typeParam);
      ctx.waitUntil(
        logPremiumUsage(env, '/api/premium/history/compare', request.headers.get('User-Agent') || 'unknown', 1, payment.token),
      );
      return premiumResponse(result, payment, 1);
    }

    // === PAID PREMIUM: FORECAST (Tier 1, 1 credit) ===
    // Conservative statistical forecast (linear least-squares with a
    // 95% prediction interval) over the last 7-90 days of price or
    // benchmark history, projected forward 1-30 days. Includes
    // confidence score so agents can ignore low-signal forecasts.

    if (path === '/api/premium/forecast') {
      const payment = await requirePayment(request, env, 1);
      if (!payment.paid) return payment.response!;

      const targetParam = url.searchParams.get('target') ?? 'price';
      const target: 'price' | 'benchmark' =
        targetParam === 'price' || targetParam === 'benchmark' ? targetParam : 'price';
      const fieldParam = url.searchParams.get('field');
      const field: PriceField | undefined =
        fieldParam === 'inputPrice' || fieldParam === 'outputPrice' || fieldParam === 'blended'
          ? fieldParam
          : undefined;
      const lookback = parseInt(url.searchParams.get('lookback') ?? '', 10);
      const horizon = parseInt(url.searchParams.get('horizon') ?? '', 10);

      const opts: ForecastOptions = {
        target,
        model: url.searchParams.get('model')?.trim() ?? '',
        ...(field ? { field } : {}),
        ...(url.searchParams.get('benchmark') ? { benchmark: url.searchParams.get('benchmark')! } : {}),
        ...(Number.isFinite(lookback) ? { lookback } : {}),
        ...(Number.isFinite(horizon) ? { horizon } : {}),
      };

      const result = await computeForecast(env, opts);
      if (!result.ok) {
        return jsonResponse(result, 400);
      }
      ctx.waitUntil(
        logPremiumUsage(env, '/api/premium/forecast', request.headers.get('User-Agent') || 'unknown', 1, payment.token),
      );
      return premiumResponse(result, payment, 1);
    }

    // === PAID PREMIUM: WHATS-NEW SUMMARY (Tier 1, 1 credit) ===
    // Agent morning brief: pricing changes, new/removed models, status
    // incidents, and top news headlines from the last 1-7 days. Pure
    // aggregation over existing data (history snapshots + incidents +
    // articles) but the join + delta is the value.

    if (path === '/api/premium/whats-new') {
      const payment = await requirePayment(request, env, 1);
      if (!payment.paid) return payment.response!;

      const daysParam = parseInt(url.searchParams.get('days') ?? '', 10);
      const newsLimitParam = parseInt(url.searchParams.get('news_limit') ?? '', 10);
      const result = await computeWhatsNew(env, {
        ...(Number.isFinite(daysParam) ? { days: daysParam } : {}),
        ...(Number.isFinite(newsLimitParam) ? { newsLimit: newsLimitParam } : {}),
      });
      if (!result.ok) {
        return jsonResponse(result, 400);
      }
      ctx.waitUntil(
        logPremiumUsage(env, '/api/premium/whats-new', request.headers.get('User-Agent') || 'unknown', 1, payment.token),
      );
      return premiumResponse(result, payment, 1);
    }

    // === PAID PREMIUM: COMPARE MODELS (Tier 1, 1 credit) ===
    // /api/premium/compare/models?ids=opus-4-7,gpt-5-5,gemini-3
    // Returns a normalized side-by-side comparison block per model
    // (pricing, benchmarks union-filled with null for missing scores,
    // provider status, recent news) plus rankings by cheapest blended,
    // most context, and per-benchmark leaderboard. 2-5 models per call.

    if (path === '/api/premium/compare/models') {
      const payment = await requirePayment(request, env, 1);
      if (!payment.paid) return payment.response!;

      const idsParam = url.searchParams.get('ids') || url.searchParams.get('models') || '';
      const modelKeys = idsParam.split(',').map(s => s.trim()).filter(s => s.length > 0);
      const result = await compareModels(env, { modelKeys });
      if (!result.ok) {
        return jsonResponse(result, 400);
      }
      ctx.waitUntil(
        logPremiumUsage(env, '/api/premium/compare/models', request.headers.get('User-Agent') || 'unknown', 1, payment.token),
      );
      return premiumResponse(result, payment, 1);
    }

    // === PAID PREMIUM: PROVIDER DEEP-DIVE (Tier 1, 1 credit) ===
    // /api/premium/providers/{name} returns one paid response that
    // joins live status, all models with pricing + tier, all benchmark
    // scores, recent news, and agent traffic. Aggregation IS the value;
    // agents pay 1 credit instead of stitching 4-5 free endpoints.

    const providerMatch = path.match(/^\/api\/premium\/providers\/([a-zA-Z0-9_\- ]+)$/);
    if (providerMatch) {
      const payment = await requirePayment(request, env, 1);
      if (!payment.paid) return payment.response!;
      const providerKey = decodeURIComponent(providerMatch[1]);
      const result = await computeProviderDeepDive(env, providerKey);
      if (!result.ok) {
        return jsonResponse(result, 404);
      }
      ctx.waitUntil(
        logPremiumUsage(env, '/api/premium/providers', request.headers.get('User-Agent') || 'unknown', 1, payment.token),
      );
      return premiumResponse(result, payment, 1);
    }

    // === PAID PREMIUM: COST PROJECTION (Tier 1, 1 credit) ===
    // Project total cost of a token-usage workload across 1-10 models
    // and four time horizons. Pure compute on live /models pricing,
    // but agents pay 1 credit for the canonical abstraction so they
    // don't have to maintain pricing tables in their own code.

    if (path === '/api/premium/cost/projection') {
      const payment = await requirePayment(request, env, 1);
      if (!payment.paid) return payment.response!;

      const modelsParam = url.searchParams.get('model') || url.searchParams.get('models');
      const models = (modelsParam ?? '')
        .split(',')
        .map(m => m.trim())
        .filter(m => m.length > 0);
      const inputTokensPerDay = parseFloat(url.searchParams.get('input_tokens_per_day') ?? '');
      const outputTokensPerDay = parseFloat(url.searchParams.get('output_tokens_per_day') ?? '');
      const horizonParam = url.searchParams.get('horizon');
      const primaryHorizon: CostProjectionOptions['primaryHorizon'] =
        horizonParam === 'daily' || horizonParam === 'weekly' ||
        horizonParam === 'monthly' || horizonParam === 'yearly'
          ? horizonParam
          : undefined;

      const result = await computeCostProjection(env, {
        models,
        inputTokensPerDay,
        outputTokensPerDay,
        ...(primaryHorizon ? { primaryHorizon } : {}),
      });
      if (!result.ok) {
        return jsonResponse(result, 400);
      }
      ctx.waitUntil(
        logPremiumUsage(env, '/api/premium/cost/projection', request.headers.get('User-Agent') || 'unknown', 1, payment.token),
      );
      return premiumResponse(result, payment, 1);
    }

    // === PAID PREMIUM: NEWS SEARCH (Tier 1, 1 credit) ===
    // Full-text search over the article corpus with date range, provider,
    // and category filters. Relevance scoring blends term hits in title
    // (weight 3) and snippet (weight 1) plus a recency boost.

    if (path === '/api/premium/news/search') {
      const payment = await requirePayment(request, env, 1);
      if (!payment.paid) return payment.response!;

      const limitParam = parseInt(url.searchParams.get('limit') ?? '25', 10);
      const limit = Number.isFinite(limitParam) ? Math.max(1, Math.min(limitParam, 100)) : 25;

      const opts: NewsSearchOptions = {
        ...(url.searchParams.get('q') ? { q: url.searchParams.get('q')! } : {}),
        ...(url.searchParams.get('from') ? { from: url.searchParams.get('from')! } : {}),
        ...(url.searchParams.get('to') ? { to: url.searchParams.get('to')! } : {}),
        ...(url.searchParams.get('provider') ? { provider: url.searchParams.get('provider')! } : {}),
        ...(url.searchParams.get('category') ? { category: url.searchParams.get('category')! } : {}),
        limit,
      };

      const result = await searchNews(env, opts);
      if (!result.ok) {
        return jsonResponse(result, 400);
      }
      ctx.waitUntil(
        logPremiumUsage(env, '/api/premium/news/search', request.headers.get('User-Agent') || 'unknown', 1, payment.token),
      );
      return premiumResponse(result, payment, 1);
    }

    // === PAID PREMIUM: ENRICHED AGENTS DIRECTORY (Tier 1, 1 credit) ===
    // Static directory joined with live status, recent news count,
    // recent news (top 3), agent traffic, flagship pricing, and a
    // trending_score. Server-side sort + filter so agents pull a
    // ranked list in one call.

    if (path === '/api/premium/agents/directory') {
      const payment = await requirePayment(request, env, 1);
      if (!payment.paid) return payment.response!;

      const sortParam = url.searchParams.get('sort');
      const validSorts: SortKey[] = ['trending', 'alphabetical', 'status', 'price_low', 'price_high', 'news_count'];
      const sort: SortKey | undefined =
        sortParam && (validSorts as string[]).includes(sortParam) ? (sortParam as SortKey) : undefined;

      const statusParam = url.searchParams.get('status');
      const validStatus: ('operational' | 'degraded' | 'down' | 'unknown')[] = ['operational', 'degraded', 'down', 'unknown'];
      const status =
        statusParam && (validStatus as string[]).includes(statusParam)
          ? (statusParam as 'operational' | 'degraded' | 'down' | 'unknown')
          : undefined;

      const openSourceParam = url.searchParams.get('open_source');
      const openSource =
        openSourceParam === 'true' ? true : openSourceParam === 'false' ? false : undefined;

      const limitParam = parseInt(url.searchParams.get('limit') ?? '50', 10);
      const limit = Number.isFinite(limitParam) ? Math.max(1, Math.min(limitParam, 100)) : 50;

      const opts: EnrichedOptions = {
        ...(url.searchParams.get('category') ? { category: url.searchParams.get('category')! } : {}),
        ...(status ? { status } : {}),
        ...(typeof openSource === 'boolean' ? { open_source: openSource } : {}),
        ...(url.searchParams.get('capability') ? { capability: url.searchParams.get('capability')! } : {}),
        ...(sort ? { sort } : {}),
        limit,
      };

      const result = await getEnrichedDirectory(env, opts);
      ctx.waitUntil(
        logPremiumUsage(env, '/api/premium/agents/directory', request.headers.get('User-Agent') || 'unknown', 1, payment.token),
      );
      return premiumResponse(result, payment, 1);
    }

    // === PAID PREMIUM: WATCHES (webhook alerts) ===
    // Registration costs 1 credit. Read/list/delete are free for the
    // bearer token that owns the watch (no charge, but token required).

    if (path === '/api/premium/watches' && request.method === 'POST') {
      const payment = await requirePayment(request, env, 1);
      if (!payment.paid) return payment.response!;
      if (!payment.token) {
        return jsonResponse(
          { ok: false, error: 'token_required', message: 'Watch creation requires a bearer token (use /api/payment/buy-credits).' },
          401,
        );
      }
      let body: { spec?: unknown; callback_url?: string; secret?: string; fire_cap?: number };
      try {
        body = await request.json();
      } catch {
        return jsonResponse({ ok: false, error: 'invalid_json' }, 400);
      }
      if (typeof body.callback_url !== 'string') {
        return jsonResponse({ ok: false, error: 'callback_url_required' }, 400);
      }
      const result = await createWatch(env, payment.token, {
        spec: body.spec as never,
        callback_url: body.callback_url,
        ...(typeof body.secret === 'string' ? { secret: body.secret } : {}),
        ...(typeof body.fire_cap === 'number' ? { fire_cap: body.fire_cap } : {}),
      });
      if (!result.ok) {
        return jsonResponse(result, 400);
      }
      ctx.waitUntil(
        logPremiumUsage(env, '/api/premium/watches', request.headers.get('User-Agent') || 'unknown', 1, payment.token),
      );
      return premiumResponse(result, payment, 1);
    }

    if (path === '/api/premium/watches' && request.method === 'GET') {
      // Listing requires a bearer token but no credits.
      const authHeader = request.headers.get('Authorization');
      const token = authHeader?.startsWith('Bearer ') ? authHeader.slice(7).trim() : '';
      if (!token || !token.startsWith('tf_live_')) {
        return jsonResponse({ ok: false, error: 'token_required' }, 401);
      }
      const watches = await listWatchesForToken(env, token);
      return jsonResponse({ ok: true, count: watches.length, watches }, 200, 0);
    }

    const watchMatch = path.match(/^\/api\/premium\/watches\/(wat_[a-f0-9]{24})$/);
    if (watchMatch) {
      const id = watchMatch[1];
      const authHeader = request.headers.get('Authorization');
      const token = authHeader?.startsWith('Bearer ') ? authHeader.slice(7).trim() : '';
      if (!token || !token.startsWith('tf_live_')) {
        return jsonResponse({ ok: false, error: 'token_required' }, 401);
      }
      if (request.method === 'GET') {
        const watch = await getWatch(env, id);
        if (!watch) return jsonResponse({ ok: false, error: 'watch_not_found' }, 404);
        if (watch.token !== token) return jsonResponse({ ok: false, error: 'forbidden' }, 403);
        return jsonResponse({ ok: true, watch }, 200, 0);
      }
      if (request.method === 'DELETE') {
        const result = await deleteWatch(env, id, token);
        if (!result.ok) {
          return jsonResponse(
            result,
            result.error === 'watch_not_found' ? 404 : result.error === 'forbidden' ? 403 : 400,
          );
        }
        return jsonResponse({ ok: true }, 200, 0);
      }
    }

    // === INTERNAL: cross-Worker validate-and-charge ===
    // Server-to-server only. Sister-site Workers (TerminalFeed, future
    // sister sites) call this to validate bearer tokens and decrement
    // credits over HTTP. Authenticated by X-Internal-Auth header
    // against SHARED_INTERNAL_SECRET. NOT advertised in /api/meta,
    // /llms.txt, /api/payment/info, or any agent-facing surface.

    if (path === '/api/internal/validate-and-charge') {
      if (request.method !== 'POST') {
        return jsonResponse({ error: 'method_not_allowed' }, 405, 0);
      }
      // Auth check happens BEFORE any body parsing so a 401 response
      // does not leak the existence of the endpoint, the expected body
      // shape, or any credit state. Constant-time string comparison so
      // wrong-secret attempts cannot be distinguished by timing in the
      // same way a `===` would expose.
      const auth = request.headers.get('X-Internal-Auth') ?? '';
      const secret = env.SHARED_INTERNAL_SECRET ?? '';
      if (!secret || !constantTimeEqual(auth, secret)) {
        return jsonResponse({ error: 'unauthorized' }, 401, 0);
      }
      let body: { token?: unknown; cost?: unknown; endpoint?: unknown };
      try {
        body = await request.json();
      } catch {
        return jsonResponse({ error: 'bad_json' }, 400, 0);
      }
      const token = typeof body?.token === 'string' ? body.token : '';
      const costRaw = typeof body?.cost === 'number' ? body.cost : NaN;
      const endpoint = typeof body?.endpoint === 'string' ? body.endpoint : '';
      if (!token || !Number.isFinite(costRaw) || costRaw < 0) {
        return jsonResponse({ error: 'bad_request' }, 400, 0);
      }
      const cost = Math.floor(costRaw);
      const result = await validateAndCharge(env, {
        token,
        cost,
        endpoint: endpoint || 'tf:internal',
      });
      // Fire-and-forget usage logging so the sister-site call sees the
      // same daily rollup and per-token usage history that in-process
      // calls produce. Only log when the charge succeeded.
      if (result.ok) {
        ctx.waitUntil(
          logPremiumUsage(
            env,
            endpoint || 'tf:internal',
            request.headers.get('User-Agent') || 'sister-site',
            cost,
            token,
          ),
        );
      }
      // Always 200 on this endpoint (per spec) so the caller can read
      // the body cleanly regardless of outcome. Not cached.
      return jsonResponse(result, 200, 0);
    }

    // === INTERNAL: bot-hit ingest from Pages Functions middleware ===
    // The Pages middleware at functions/_middleware.ts detects bot
    // user agents on every static-route request (/originals/*, /for-ai-agents,
    // /api-reference/*, etc) and forwards the {bot, path} pair here so the
    // hit lands in the same in-memory buffer as Worker-route hits. This
    // closes the coverage gap where SEO routes were invisible to /agent-traffic.
    // Auth: dedicated PAGES_TRACK_SECRET (separate from SHARED_INTERNAL_SECRET
    // which is shared with sister-site Workers, so its rotation cadence is
    // independent of cross-site coordination).

    if (path === '/api/internal/track-bot') {
      if (request.method !== 'POST') {
        return jsonResponse({ error: 'method_not_allowed' }, 405, 0);
      }
      const auth = request.headers.get('X-Internal-Auth') ?? '';
      const secret = env.PAGES_TRACK_SECRET ?? '';
      if (!secret || !constantTimeEqual(auth, secret)) {
        return jsonResponse({ error: 'unauthorized' }, 401, 0);
      }
      let body: { bot?: unknown; path?: unknown };
      try {
        body = await request.json();
      } catch {
        return jsonResponse({ error: 'bad_json' }, 400, 0);
      }
      const bot = typeof body?.bot === 'string' ? body.bot : '';
      const hitPath = typeof body?.path === 'string' ? body.path : '';
      if (!bot || !hitPath) {
        return jsonResponse({ error: 'bad_request' }, 400, 0);
      }
      ctx.waitUntil(trackBotHitDirect(env, bot, hitPath));
      return jsonResponse({ ok: true }, 200, 0);
    }

    // === ADMIN: usage and revenue rollup (auth-gated) ===
    // Same key pattern as /api/refresh: ?key=<ENVIRONMENT>. At MVP scale
    // this is sufficient; if/when revenue is real, swap to a dedicated
    // ADMIN_KEY secret.

    if (path === '/api/admin/usage' && url.searchParams.get('key') === env.ENVIRONMENT) {
      const date = url.searchParams.get('date') || new Date().toISOString().slice(0, 10);
      const rollup = await getRollup(env, date);
      if (!rollup) {
        return jsonResponse({ ok: false, error: 'no_data_for_date', date }, 404);
      }
      return jsonResponse({ ok: true, ...rollup }, 200, 0);
    }

    if (path === '/api/admin/usage/dates' && url.searchParams.get('key') === env.ENVIRONMENT) {
      const dates = await listRollupDates(env);
      return jsonResponse({ ok: true, count: dates.length, dates }, 200, 0);
    }

    if (path === '/api/admin/burn-token' && url.searchParams.get('key') === env.ENVIRONMENT) {
      const token = url.searchParams.get('token');
      if (!token || !token.startsWith('tf_live_')) {
        return jsonResponse({ ok: false, error: 'missing_or_invalid_token_param' }, 400);
      }
      const credKey = `pay:credits:${token}`;
      const before = await env.TENSORFEED_CACHE.get(credKey, 'json') as { balance?: number } | null;
      await env.TENSORFEED_CACHE.delete(credKey);
      return jsonResponse({
        ok: true,
        burned: token.slice(0, 16) + '...',
        previous_balance: before?.balance ?? 0,
        message: 'Token credits record deleted. Any further premium call with this token will be rejected.',
      }, 200, 0);
    }

    if (path === '/api/alerts-status') {
      const status = await getAlertsStatus(env);
      return jsonResponse({ ok: true, now: new Date().toISOString(), ...status }, 200, 60);
    }

    // === FORCE REFRESH (protected) ===

    if (path === '/api/refresh' && url.searchParams.get('key') === env.ENVIRONMENT) {
      const task = url.searchParams.get('task');
      if (task === 'history') {
        const result = await captureHistory(env);
        return jsonResponse({ ok: true, message: 'History snapshot captured', ...result });
      }
      await Promise.all([pollRSSFeeds(env), pollStatusPages(env), updateCatalog(env), pollPodcastFeeds(env), pollTrendingRepos(env)]);

      return jsonResponse({ ok: true, message: 'Refreshed all feeds, status, and catalog' });
    }

    // === NEWSLETTER SIGNUP ===

    if (path === '/api/newsletter' && request.method === 'POST') {
      try {
        const body = await request.json() as { email?: string };
        const email = body.email?.trim().toLowerCase();
        if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(email)) {
          return jsonResponse({ error: 'Invalid email address' }, 400);
        }

        // Store in KV (batched: one key with all emails)
        const existing = await env.TENSORFEED_CACHE.get('newsletter-subscribers', 'json') as string[] | null;
        const subscribers = existing || [];

        if (subscribers.includes(email)) {
          return jsonResponse({ ok: true, message: 'Already subscribed' });
        }

        subscribers.push(email);
        try {
          await env.TENSORFEED_CACHE.put('newsletter-subscribers', JSON.stringify(subscribers));
        } catch (kvErr) {
          console.error('Newsletter KV write failed:', kvErr);
          return jsonResponse({ error: 'Server error, please try again' }, 500);
        }

        return jsonResponse({ ok: true, message: 'Subscribed successfully' });
      } catch {
        return jsonResponse({ error: 'Invalid request body' }, 400);
      }
    }

    // === ALERT SUBSCRIPTION ===

    if (path === '/api/alerts/subscribe' && request.method === 'POST') {
      try {
        const body = await request.json() as { email?: string; services?: string[]; frequency?: string };
        const email = body.email?.trim().toLowerCase();
        if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(email)) {
          return jsonResponse({ error: 'Invalid email address' }, 400);
        }

        const subscriber = {
          email,
          services: body.services || [],
          frequency: body.frequency === 'digest' ? 'digest' : 'instant',
          subscribedAt: new Date().toISOString(),
        };

        const existing = await env.TENSORFEED_CACHE.get('alert-subscribers', 'json') as { email: string }[] | null;
        const subscribers = existing || [];

        // Check for duplicate
        if (subscribers.some(s => s.email === email)) {
          return jsonResponse({ ok: true, message: 'Already subscribed' });
        }

        subscribers.push(subscriber);
        try {
          await env.TENSORFEED_CACHE.put('alert-subscribers', JSON.stringify(subscribers));
        } catch (kvErr) {
          console.error('Alert subscription KV write failed:', kvErr);
          return jsonResponse({ error: 'Server error, please try again' }, 500);
        }

        return jsonResponse({ ok: true, message: 'Subscribed to alerts' });
      } catch {
        return jsonResponse({ error: 'Invalid request body' }, 400);
      }
    }

    // Manual tweet trigger (protected)
    // DISABLED 2026-04-04: X account flagged as spam from 5x/day posting.
    // When re-enabling, limit to 1-2 posts/day max. See wrangler.toml for schedule notes.
    // if (path === '/api/tweet' && url.searchParams.get('key') === env.ENVIRONMENT) {
    //   await postTopStories(env);
    //   return jsonResponse({ ok: true, message: 'Posted top stories to X' });
    // }

    return jsonResponse({ error: 'Not found', endpoints: ['/api/health', '/api/news', '/api/status', '/api/models', '/api/benchmarks', '/api/podcasts', '/api/trending-repos', '/api/feed.xml', '/api/feed.json', '/api/meta'] }, 404);
  },

  async scheduled(event: ScheduledEvent, env: Env): Promise<void> {
    const cron = event.cron;
    const startedAt = new Date().toISOString();
    const start = Date.now();

    try {
      await this._runScheduled(cron, startedAt, start, env);
    } catch (err) {
      console.error(`Top-level scheduled() crash for cron "${cron}":`, err);
    }
  },

  async _runScheduled(cron: string, startedAt: string, start: number, env: Env): Promise<void> {

    const actions: Array<{
      name: string;
      status: 'ok' | 'error';
      error?: string;
      details?: unknown;
    }> = [];
    let rssResult: RSSPollResult | null = null;

    async function run<T>(name: string, fn: () => Promise<T>): Promise<T | null> {
      try {
        const result = await fn();
        actions.push({ name, status: 'ok', details: result ?? undefined });
        return result;
      } catch (err) {
        const msg = err instanceof Error ? `${err.message}\n${err.stack ?? ''}` : String(err);
        console.error(`Cron action '${name}' failed:`, msg);
        actions.push({ name, status: 'error', error: msg });
        return null;
      }
    }

    if (cron === '*/10 * * * *') {
      rssResult = await run('pollRSSFeeds', () => pollRSSFeeds(env));
    } else if (cron === '*/5 * * * *') {
      await run('pollStatusPages', () => pollStatusPages(env));
    } else if (cron === '0 * * * *') {
      // Hourly: refresh RSS + status + rolling snapshot
      rssResult = await run('pollRSSFeeds', () => pollRSSFeeds(env));
      await run('pollStatusPages', () => pollStatusPages(env));
      await run('captureAllSnapshots', () => captureAllSnapshots(env));
    } else if (cron === '0 */2 * * *') {
      // Every 2 hours: podcast feeds (10 sources, weekly release cadence)
      await run('pollPodcastFeeds', () => pollPodcastFeeds(env));
    } else if (cron === '0 7 * * *') {
      // Daily (7 AM UTC): update models, benchmarks, agents staleness
      await run('updateDailyData', () => updateDailyData(env));
      // Phase 0 of agent payments: capture daily historical snapshot of
      // pricing, models, benchmarks, status, agent activity. Runs after
      // updateDailyData so the snapshot reflects freshly-updated data.
      await run('captureHistory', () => captureHistory(env));
      // Premium webhook watches: fire price-change webhooks based on the
      // diff between the last seen pricing and the freshly-updated payload.
      await run('runPriceWatchCycle', () => runPriceWatchCycle(env));
      // Digest webhooks: fire scheduled summaries (daily / weekly) for
      // any digest watch whose cadence has elapsed.
      await run('runDigestWatchCycle', () => runDigestWatchCycle(env));
    // X/Twitter: 1 post/day, re-enabled 2026-04-12 after spam flag on 2026-04-04.
    // Hold at 1/day until 2026-05-04; do not increase cadence without 30 clean days.
    } else if (cron === '30 14 * * *') {
      await run('postTopStories', () => postTopStories(env));
    } else if (cron === '30 8 * * *') {
      // Daily 8:30 AM UTC: refresh trending AI repos + send daily summary email
      await run('pollTrendingRepos', () => pollTrendingRepos(env));
      await run('sendDailySummary', () => sendDailySummary(env));
    }

    // Record RSS poll history for the daily summary digest
    if (rssResult) {
      await run('recordPollRun', () => recordPollRun(env, cron, rssResult!));
    }

    // Watchdog: if news is stale past threshold, try to restore from the
    // latest snapshot and send a throttled alert email. This runs after
    // every cron tick so transient failures get caught quickly.
    const staleness = await run('checkNewsStaleness', () => checkNewsStaleness(env));
    if (staleness?.stale) {
      const latestSnap = await run('getLatestSnapshot', () => getLatestSnapshot(env, 'news'));
      let restored = false;
      if (latestSnap) {
        const result = await run('restoreFromSnapshot', () => restoreFromSnapshot(env, 'news'));
        restored = result === true;
      }
      await run('alertStaleNews', () =>
        alertStaleNews(env, {
          ageMinutes: staleness.ageMinutes,
          lastUpdated: staleness.lastUpdated,
          restored,
          snapshotTimestamp: latestSnap?.timestamp ?? null,
        }),
      );
    }

    const durationMs = Date.now() - start;
    const hadError = actions.some(a => a.status === 'error');

    // Track last cron execution for debugging
    try {
      await env.TENSORFEED_CACHE.put('last-cron-run', JSON.stringify({
        cron,
        timestamp: new Date().toISOString(),
      }));
    } catch (err) {
      console.error('last-cron-run put failed:', err);
    }

    // Single-write cron log (overwrites, not appends)
    try {
      await env.TENSORFEED_CACHE.put(
        'CRON_LOG',
        JSON.stringify({
          cron,
          startedAt,
          finishedAt: new Date().toISOString(),
          durationMs,
          ok: !hadError,
          actions,
          rss: rssResult
            ? {
                articlesTotal: rssResult.articlesTotal,
                sourcesPolled: rssResult.sourcesPolled,
                sourcesSucceeded: rssResult.sourcesSucceeded,
                sources: rssResult.sourceResults,
              }
            : null,
        }),
      );
    } catch (err) {
      console.error('CRON_LOG put failed:', err);
    }
  },
};
