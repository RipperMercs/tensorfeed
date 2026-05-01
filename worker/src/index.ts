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
import { computeProviderDeepDive } from './provider-deepdive';
import { compareModels } from './compare-models';
import { computeWhatsNew } from './whats-new';
import { computeRouting, checkRoutingPreviewRateLimit, hoursUntilUTCRollover, RoutingTask } from './routing';
import {
  captureRegistrySnapshot,
  getLatestSummary as getMcpRegistryLatest,
  getSeries as getMcpRegistrySeries,
  resolveRange as resolveMcpRegistryRange,
  MAX_RANGE_DAYS as MCP_REG_MAX_RANGE_DAYS,
  DEFAULT_RANGE_DAYS as MCP_REG_DEFAULT_RANGE_DAYS,
} from './mcp-registry';
import {
  runProbeCycle,
  rollupYesterday as rollupProbeYesterday,
  getLatestSummary as getProbeLatest,
  getProviderSeries,
  resolveRange as resolveProbeRange,
  PROBE_MAX_RANGE_DAYS,
  PROBE_DEFAULT_RANGE_DAYS,
} from './probe';
import {
  refreshCurrent as refreshGpuPricing,
  getCurrent as getGpuPricingCurrent,
  captureDailySnapshot as captureGpuDaily,
  pickCheapest as pickCheapestGpu,
  resolveRange as resolveGpuRange,
  getSeries as getGpuSeries,
  isCanonicalGPU,
  CanonicalGPU,
  GPU_MAX_RANGE_DAYS,
  GPU_DEFAULT_RANGE_DAYS,
} from './gpu-pricing';
import {
  requirePayment,
  commitPayment,
  getNoChargeRollup,
  listNoChargeDates,
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
  validateOnly,
  commitInternal,
} from './payments';
import {
  signReceipt,
  hashRequest,
  hashResponse,
  tokenShort,
  generateReceiptId,
  receiptStatus,
  verifyReceiptSignature,
  ReceiptCore,
  NoChargeReason,
} from './receipts';
import { checkStaleness, resolveSLA, describeSLAs } from './freshness';
import { recordPollRun, checkNewsStaleness, alertStaleNews, sendDailySummary, getAlertsStatus } from './alerts';
import { maybeSimulatedErrorResponse, applySimulatedLatency } from './chaos';
import {
  applyRateLimitHeaders,
  checkIPRateLimit,
  getClientIP,
  isRateLimitExempt,
  rateLimitedResponse,
} from './rate-limit';
import { sanitizeArticleForAgents } from './sanitize';

/**
 * CORS posture for the public API.
 *
 * Wildcard `Access-Control-Allow-Origin: *` is intentional. Free
 * endpoints are public read-only data and have no auth. Premium
 * endpoints require an `Authorization: Bearer` header that the agent
 * holds in its own runtime, not in browser cookies, and we never set
 * `Access-Control-Allow-Credentials: true`. So even a malicious origin
 * loaded in a victim's browser cannot make an authenticated cross-
 * origin request on the user's behalf because there is no ambient
 * credential to ride.
 *
 * `Access-Control-Allow-Headers` admits the headers an agent may send
 * (Authorization for credits, X-Payment-Tx for x402 fallback, the
 * chaos-engineering and internal-auth headers). `Expose-Headers`
 * surfaces the response headers that an agent in a browser context
 * needs to read (rate-limit info, premium token issuance metadata).
 */
const CORS_HEADERS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
  'Access-Control-Allow-Headers':
    'Content-Type, Authorization, X-Payment-Tx, X-TensorFeed-Simulate-Error, X-TensorFeed-Simulate-Latency, X-Internal-Auth',
  'Access-Control-Expose-Headers':
    'RateLimit-Limit, RateLimit-Remaining, RateLimit-Reset, X-RateLimit-Limit, X-RateLimit-Remaining, X-RateLimit-Reset, Retry-After, X-Payment-Token, X-Payment-Token-Balance, X-Payment-Token-Note, X-TensorFeed-Simulated, X-TensorFeed-Simulated-Latency-Ms',
  'Access-Control-Max-Age': '86400',
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

// Admin-route auth. Returns true only if env.ADMIN_KEY is configured
// (non-empty) AND the supplied key matches it in constant time. Returns
// false if the secret is unset (so admin routes default-deny when the
// secret has not been provisioned yet, rather than silently accepting
// anything).
function isAuthorizedAdmin(env: Env, supplied: string | null): boolean {
  if (!env.ADMIN_KEY || env.ADMIN_KEY.length === 0) return false;
  if (!supplied) return false;
  return constantTimeEqual(supplied, env.ADMIN_KEY);
}

// OFAC comprehensively-sanctioned country list (ISO 3166-1 alpha-2).
// Wallet-level Chainalysis screening on /api/payment/confirm catches the
// rest. Russia is sectorally sanctioned, not comprehensive, so we do not
// include it here; only specific occupied regions are comprehensive, and
// Cloudflare's country code is the country alone.
const OFAC_BLOCKED_COUNTRIES = ['CU', 'IR', 'KP', 'SY'];

function isOFACBlockedCountry(countryCode: string | null | undefined): boolean {
  if (!countryCode || typeof countryCode !== 'string') return false;
  return OFAC_BLOCKED_COUNTRIES.indexOf(countryCode.toUpperCase()) !== -1;
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
 * Wraps a successful premium endpoint result with billing metadata,
 * commits the deferred-debit (or skips per AFTA no-charge guarantees),
 * and attaches an Ed25519-signed receipt the agent can verify against
 * /.well-known/tensorfeed-receipt-key.json.
 *
 * AFTA contract:
 *   - Stale data (capturedAt past the endpoint's freshness SLA) -> no charge.
 *   - Receipt is structurally non-forgeable; agents store it and audit later.
 *
 * The handler should pass `request` so the receipt records request hash
 * + endpoint, and optionally `capturedAt` (ISO 8601) so staleness can be
 * checked. If `capturedAt` is null and the endpoint has an SLA, we treat
 * the response as fresh (don't punish billing for missing metadata).
 */
async function premiumResponse(
  result: object,
  payment: import('./payments').PaymentResult,
  creditsRequested: number,
  request: Request,
  env: Env,
): Promise<Response> {
  const url = new URL(request.url);
  const endpoint = url.pathname;

  // Extract captured_at from the result if the handler surfaced one.
  // Convention: result.capturedAt OR result.captured_at OR result.snapshot.capturedAt.
  const r = result as Record<string, unknown>;
  const candidateCapturedAt =
    (typeof r.capturedAt === 'string' && r.capturedAt) ||
    (typeof r.captured_at === 'string' && r.captured_at) ||
    (typeof r.snapshot === 'object' &&
      r.snapshot !== null &&
      typeof (r.snapshot as Record<string, unknown>).capturedAt === 'string' &&
      (r.snapshot as Record<string, string>).capturedAt) ||
    null;

  // AFTA staleness check
  const staleness = checkStaleness(endpoint, candidateCapturedAt);
  let noChargeReason: NoChargeReason = null;
  if (staleness.applies && staleness.stale) {
    noChargeReason = 'stale_data';
  }

  // Commit the deferred debit. Returns the actual creditsCharged and
  // the post-commit balance. On a no-charge path, creditsCharged is 0
  // and the event is logged for /api/payment/no-charge-stats.
  const commit = await commitPayment(env, payment, endpoint, noChargeReason);

  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    'Access-Control-Allow-Origin': '*',
    'Cache-Control': 'no-store',
  };
  if (payment.token) headers['X-Payment-Token-Balance'] = String(commit.balanceAfter);
  if (payment.newToken && payment.token) {
    headers['X-Payment-Token'] = payment.token;
    headers['X-Payment-Token-Note'] = 'Save this token; use Authorization: Bearer <token> for future calls.';
  }

  // Build the body. If staleness triggered no-charge, surface a stale
  // marker so the agent can decide to retry rather than trust the data.
  const bodyResult: Record<string, unknown> = { ...(result as Record<string, unknown>) };
  if (commit.noChargeReason === 'stale_data') {
    bodyResult.stale = true;
    bodyResult.stale_age_seconds = staleness.ageSeconds;
    bodyResult.stale_sla_seconds = staleness.slaSeconds;
  }

  const billing: Record<string, unknown> = {
    credits_charged: commit.creditsCharged,
    credits_remaining: commit.balanceAfter,
  };
  if (commit.noChargeReason !== null) {
    billing.no_charge_reason = commit.noChargeReason;
    billing.afta_doc = 'https://tensorfeed.ai/agent-fair-trade';
  }
  if (payment.newToken) {
    billing.new_token_issued = true;
    billing.token = payment.token;
  }

  // Receipt: build core, sign with Ed25519, embed in response.
  const requestHash = await hashRequest(request.method, url);
  const responseHash = await hashResponse(bodyResult);
  const core: ReceiptCore = {
    v: 1,
    id: generateReceiptId(),
    endpoint,
    method: request.method,
    token_short: tokenShort(payment.token || ''),
    credits_charged: commit.creditsCharged,
    credits_remaining: commit.balanceAfter,
    request_hash: requestHash,
    response_hash: responseHash,
    captured_at: candidateCapturedAt || null,
    server_time: new Date().toISOString(),
    no_charge_reason: commit.noChargeReason,
    freshness_sla_seconds: staleness.slaSeconds,
  };
  const signed = await signReceipt(env, core);
  const responseBody: Record<string, unknown> = {
    ...bodyResult,
    billing,
  };
  if (signed) {
    responseBody.receipt = signed;
    headers['X-TensorFeed-Receipt-Id'] = signed.id;
  } else {
    responseBody.receipt_status = 'pending_key_bootstrap';
  }

  return new Response(JSON.stringify(responseBody), { status: 200, headers });
}

/**
 * AFTA schema-validation-failure response. Used after requirePayment has
 * already validated the bearer token but the handler detects malformed
 * input. Returns HTTP 400 with the error details, logs the no-charge
 * event to pay:no-charge:{date}, and includes a signed receipt with
 * no_charge_reason: "schema_validation_failure" so the agent has
 * cryptographic proof that the failure was free.
 *
 * Without this helper, validation 400s would still avoid the debit
 * (deferred-debit means commitPayment never runs), but they would
 * not be visible on the public no-charge ledger and would not carry
 * a receipt. Both gaps mattered for the AFTA promise to be agent-
 * verifiable, which is why this helper exists.
 */
async function premiumValidationFailure(
  errorBody: Record<string, unknown>,
  payment: import('./payments').PaymentResult,
  request: Request,
  env: Env,
): Promise<Response> {
  const url = new URL(request.url);
  const endpoint = url.pathname;

  // Log the no-charge event and ensure no debit. commitPayment with
  // schema_validation_failure as the reason writes to the ledger and
  // does not touch the credit balance.
  const commit = await commitPayment(env, payment, endpoint, 'schema_validation_failure');

  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    'Access-Control-Allow-Origin': '*',
    'Cache-Control': 'no-store',
  };
  if (payment.token) headers['X-Payment-Token-Balance'] = String(commit.balanceAfter);
  if (payment.newToken && payment.token) {
    headers['X-Payment-Token'] = payment.token;
    headers['X-Payment-Token-Note'] = 'Save this token; use Authorization: Bearer <token> for future calls.';
  }

  const billing: Record<string, unknown> = {
    credits_charged: 0,
    credits_remaining: commit.balanceAfter,
    no_charge_reason: 'schema_validation_failure',
    afta_doc: 'https://tensorfeed.ai/agent-fair-trade',
  };
  if (payment.newToken) {
    billing.new_token_issued = true;
    billing.token = payment.token;
  }

  const bodyResult: Record<string, unknown> = { ok: false, ...errorBody };

  // Receipt: same shape as premiumResponse, but credits_charged is 0,
  // captured_at is null (handler bailed before computing), and
  // no_charge_reason is fixed.
  const requestHash = await hashRequest(request.method, url);
  const responseHash = await hashResponse(bodyResult);
  const core: ReceiptCore = {
    v: 1,
    id: generateReceiptId(),
    endpoint,
    method: request.method,
    token_short: tokenShort(payment.token || ''),
    credits_charged: 0,
    credits_remaining: commit.balanceAfter,
    request_hash: requestHash,
    response_hash: responseHash,
    captured_at: null,
    server_time: new Date().toISOString(),
    no_charge_reason: 'schema_validation_failure',
    freshness_sla_seconds: null,
  };
  const signed = await signReceipt(env, core);
  const responseBody: Record<string, unknown> = {
    ...bodyResult,
    billing,
  };
  if (signed) {
    responseBody.receipt = signed;
    headers['X-TensorFeed-Receipt-Id'] = signed.id;
  } else {
    responseBody.receipt_status = 'pending_key_bootstrap';
  }

  return new Response(JSON.stringify(responseBody), { status: 400, headers });
}

// ─────────────────────────────────────────────────────────────────────

export default {
  async fetch(request: Request, env: Env, ctx: ExecutionContext): Promise<Response> {
    const url = new URL(request.url);
    const path = url.pathname;

    if (request.method === 'OPTIONS') {
      return new Response(null, { headers: CORS_HEADERS });
    }

    // Chaos engineering: short-circuit if the caller is testing failure modes.
    // Runs before activity tracking, route dispatch, and requirePayment so a
    // simulated error or timeout does not consume credits or skew analytics.
    const simulatedError = maybeSimulatedErrorResponse(request);
    if (simulatedError) return simulatedError;
    await applySimulatedLatency(request);

    // App-level IP rate limit (free public API only). Premium endpoints
    // are gated by per-token credits + circuit breaker; admin/internal
    // endpoints are server-to-server and exempt. Non-API paths get
    // limited too so a misbehaving agent hammering /feed.xml gets paced.
    let rateInfo: ReturnType<typeof checkIPRateLimit> | null = null;
    if (!isRateLimitExempt(path)) {
      const ip = getClientIP(request);
      rateInfo = checkIPRateLimit(ip);
      if (!rateInfo.allowed) {
        return rateLimitedResponse(rateInfo);
      }
    }

    const response = await this._handleRoute(request, env, ctx, url, path);
    return rateInfo ? applyRateLimitHeaders(response, rateInfo) : response;
  },

  async _handleRoute(
    request: Request,
    env: Env,
    ctx: ExecutionContext,
    url: URL,
    path: string,
  ): Promise<Response> {
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

      // Strip prompt-injection tokens, control chars, and zero-width
      // chars from feed-author-controlled fields before serving to
      // agents. Source URL, provider, dates, and categories pass
      // through untouched. See worker/src/sanitize.ts for the rules.
      const sanitized = articles.slice(0, limit).map(sanitizeArticleForAgents);

      return jsonResponse({
        ok: true,
        source: 'tensorfeed.ai',
        updated: new Date().toISOString(),
        count: sanitized.length,
        articles: sanitized,
        sanitization: 'enabled',
      });
    }

    // RSS feed (cached 300s). Served at both /feed.xml and /api/feed.xml.
    if (path === '/feed.xml' || path === '/api/feed.xml' || path === '/api/feed/all.xml' || path === '/feed/all.xml') {
      const articles = await cachedKVGet(request, env.TENSORFEED_NEWS, 'articles', 300) as Article[] | null;
      const safe = (articles || []).map(sanitizeArticleForAgents);
      return xmlResponse(articlesToRSS(safe, 'TensorFeed.ai', 'https://tensorfeed.ai/feed.xml'));
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
      const filtered = articles
        .filter(a => a.categories.some(c => filterCats.some(fc => c.toLowerCase().includes(fc.toLowerCase()))))
        .map(sanitizeArticleForAgents);

      return xmlResponse(articlesToRSS(filtered, `TensorFeed.ai - ${category}`, `https://tensorfeed.ai${path}`));
    }

    // JSON Feed (cached 60s). Served at both /feed.json and /api/feed.json.
    if (path === '/feed.json' || path === '/api/feed.json') {
      const articles = await cachedKVGet(request, env.TENSORFEED_NEWS, 'articles', 60) as Article[] | null;
      const safe = (articles || []).map(sanitizeArticleForAgents);
      return jsonResponse(articlesToJsonFeed(safe), 200, 60);
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

    // === HARNESSES ENDPOINT (cached 300s) ===
    // Cross-harness leaderboard for agentic-coding harnesses (Claude Code,
    // Cursor, Codex CLI, Aider, OpenHands, Devin, Cline, Windsurf, Amp,
    // Continue, Roo Code) on SWE-bench Verified, Terminal-Bench, Aider
    // Polyglot, and SWE-Lancer. Editorial snapshot served from baked-in
    // module data; refreshed on redeploy.

    if (path === '/api/harnesses') {
      const { HARNESSES_DATA, harnessRollups } = await import('./harnesses');
      return jsonResponse({
        ok: true,
        source: 'tensorfeed.ai',
        ...HARNESSES_DATA,
        rollups: harnessRollups(),
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
        afta_self_description:
          'TensorFeed.ai is agent fair-trade certified: open pricing, automatic no-charge on 5xx, breaker, schema fail, and stale data, Ed25519-signed receipts on every paid call, inference-only license. Built with Claude (Anthropic). Standard at /.well-known/agent-fair-trade.json.',
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
          harnesses: '/api/harnesses',
          agentsDirectory: '/api/agents/directory',
          agentActivity: '/api/agents/activity',
          podcasts: '/api/podcasts',
          trendingRepos: '/api/trending-repos',
          health: '/api/health',
          history: '/api/history',
          historySnapshot: '/api/history/{YYYY-MM-DD}/{type}',
          mcpRegistrySnapshot: '/api/mcp/registry/snapshot',
          probeLatest: '/api/probe/latest',
          gpuPricing: '/api/gpu/pricing',
          gpuPricingCheapest: '/api/gpu/pricing/cheapest?gpu=H100&type=on_demand|spot',
          routingPreview: '/api/preview/routing',
          premiumRouting: '/api/premium/routing',
          premiumPricingSeries: '/api/premium/history/pricing/series?model=&from=&to=',
          premiumBenchmarkSeries: '/api/premium/history/benchmarks/series?model=&benchmark=&from=&to=',
          premiumStatusUptime: '/api/premium/history/status/uptime?provider=&from=&to=',
          premiumWatchesCreate: 'POST /api/premium/watches (1 credit per registration)',
          premiumWatchesList: 'GET /api/premium/watches',
          premiumWatchesItem: 'GET|DELETE /api/premium/watches/{id}',
          premiumAgentsDirectory: '/api/premium/agents/directory?category=&status=&open_source=&capability=&sort=&limit=',
          premiumNewsSearch: '/api/premium/news/search?q=&from=&to=&provider=&category=&limit=',
          premiumCostProjection: '/api/premium/cost/projection?model=opus-4-7,gpt-5-5&input_tokens_per_day=&output_tokens_per_day=&horizon=monthly',
          premiumProviderDeepDive: '/api/premium/providers/{name}',
          premiumCompareModels: '/api/premium/compare/models?ids=opus-4-7,gpt-5-5,gemini-3',
          premiumWhatsNew: '/api/premium/whats-new?days=1&news_limit=10',
          premiumMcpRegistrySeries: '/api/premium/mcp/registry/series?from=&to=',
          premiumProbeSeries: '/api/premium/probe/series?provider=&from=&to=',
          premiumGpuPricingSeries: '/api/premium/gpu/pricing/series?gpu=&from=&to=',
          paymentInfo: '/api/payment/info',
          paymentBuyCredits: '/api/payment/buy-credits',
          paymentConfirm: '/api/payment/confirm',
          paymentBalance: '/api/payment/balance',
          paymentUsage: '/api/payment/usage',
          paymentHistory: '/api/payment/history',
          paymentNoChargeStats: '/api/payment/no-charge-stats',
          receiptVerify: '/api/receipt/verify',
        },
        admin: {
          usage: '/api/admin/usage?date=YYYY-MM-DD&key=<ADMIN_KEY>',
          usageDates: '/api/admin/usage/dates?key=<ADMIN_KEY>',
          burnToken: '/api/admin/burn-token?token=tf_live_...&key=<ADMIN_KEY>',
          refresh: '/api/refresh?key=<ADMIN_KEY>[&task=history]',
        },
        chaos_engineering: {
          description: 'Free, no-auth headers for testing agent fallback logic against simulated failures. No credits charged for simulated errors.',
          headers: {
            simulate_error: 'X-TensorFeed-Simulate-Error: <400-599> (returns the requested status code immediately)',
            simulate_latency: 'X-TensorFeed-Simulate-Latency: <ms> (sleeps before normal response, capped at 10000ms)',
          },
          response_marker: 'X-TensorFeed-Simulated: true',
        },
        circuit_breaker: {
          description: 'Premium endpoints return 429 infinite_loop_detected if a single bearer token issues more than 20 identical requests in 60 seconds. No credits are charged when the breaker is tripped.',
          threshold: 20,
          window_seconds: 60,
          cooldown_seconds: 120,
        },
        rate_limit: {
          description: 'Free public endpoints are limited to 120 requests per minute per IP. Premium bearer tokens are exempt. Every response includes RateLimit-Limit, RateLimit-Remaining, and RateLimit-Reset headers so well-behaved agents can back off programmatically.',
          per_ip_per_minute: 120,
          headers: ['RateLimit-Limit', 'RateLimit-Remaining', 'RateLimit-Reset', 'Retry-After'],
          exempt_paths: ['/api/premium/*', '/api/payment/*', '/api/internal/*', '/api/admin/*', '/api/refresh'],
          doc: 'https://tensorfeed.ai/developers/agent-payments#rate-limits',
        },
        prompt_injection_sanitization: {
          description: 'Aggregated text on the agent-facing endpoints is scrubbed at read time. Strips ASCII control chars, bidi/zero-width spoofing, and neutralizes role-confusion tokens (<|im_start|>, [INST], "system:" line prefixes, "ignore previous instructions"). Title/snippet are length-capped.',
          enabled_on: ['/api/news', '/api/agents/news', '/feed.xml', '/feed.json', '/feed/*.xml'],
          doc: 'https://tensorfeed.ai/developers/agent-payments#prompt-injection-sanitization',
        },
        agent_fair_trade: {
          description: 'Agent Fair-Trade Agreement (AFTA): code-enforced no-charge guarantees, Ed25519-signed receipts on every paid call, public on-chain payment rail (USDC on Base). Combined: every dollar that flows through TensorFeed has two independent attestations (the Base RPC tx record, immutable and public, and our signed receipt, verifiable and non-forgeable).',
          no_charge_guarantees: ['5xx', 'circuit_breaker', 'schema_validation_failure', 'stale_data'],
          receipts: receiptStatus(env),
          freshness_slas: describeSLAs(),
          standard_manifest: '/.well-known/agent-fair-trade.json',
          public_record: '/api/payment/no-charge-stats',
          doc: 'https://tensorfeed.ai/agent-fair-trade',
          network: {
            description: 'TensorFeed and TerminalFeed share a single bearer-token + credit ledger. A token minted on either site works on both. Each site signs receipts with its own keypair.',
            established: '2026-04-30',
            host_ledger: 'tensorfeed.ai',
            sister_sites: [
              {
                site: 'tensorfeed.ai',
                manifest: 'https://tensorfeed.ai/.well-known/agent-fair-trade.json',
                manifesto: 'https://tensorfeed.ai/agent-fair-trade',
                receipt_key: 'https://tensorfeed.ai/.well-known/tensorfeed-receipt-key.json',
              },
              {
                site: 'terminalfeed.io',
                manifest: 'https://terminalfeed.io/.well-known/agent-fair-trade.json',
                manifesto: 'https://terminalfeed.io/agent-fair-trade',
                receipt_key: 'https://terminalfeed.io/.well-known/terminalfeed-receipt-key.json',
              },
            ],
          },
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

    // === MCP REGISTRY TELEMETRY (free) ===
    // Today's summary + 1-day deltas of the official MCP server registry.
    // First request after deploy may bootstrap a live capture if the cron
    // has not yet run, so it never returns empty. Daily refresh via the
    // 30 9 * * * cron.

    if (path === '/api/mcp/registry/snapshot') {
      const summary = await getMcpRegistryLatest(env);
      if (!summary) {
        return jsonResponse({ ok: false, error: 'registry_unavailable' }, 503);
      }
      return jsonResponse({ ok: true, summary }, 200, 600);
    }

    // === ACTIVE LLM PROBE: LATEST SUMMARY (free) ===
    // Last 24h of measured ttfb / total / status per provider, refreshed
    // every 15 min by the probe cron. Returns 503 with explanatory body
    // if no provider keys are configured (cron has nothing to probe).

    if (path === '/api/probe/latest') {
      const summary = await getProbeLatest(env);
      if (!summary) {
        return jsonResponse({
          ok: false,
          error: 'no_probe_data',
          hint: 'Set at least one PROBE_<PROVIDER>_KEY Worker secret to start collecting data',
        }, 503);
      }
      return jsonResponse({ ok: true, summary }, 200, 60);
    }

    // === GPU PRICING: CURRENT SNAPSHOT (free) ===
    // Aggregated GPU rental prices across cloud GPU marketplaces (Vast.ai
    // public + RunPod GraphQL when key is configured). Refreshed every 4
    // hours by the gpu-pricing cron. Cold-start bootstrap kicks a refresh
    // so the endpoint never returns null.

    if (path === '/api/gpu/pricing') {
      const snapshot = await getGpuPricingCurrent(env);
      if (!snapshot) {
        return jsonResponse({
          ok: false,
          error: 'no_pricing_data',
          hint: 'Phase 1 sources are Vast.ai (public) and RunPod (requires RUNPOD_API_KEY secret). If both are unreachable, this endpoint returns 503.',
        }, 503);
      }
      return jsonResponse({ ok: true, snapshot }, 200, 600);
    }

    // === GPU PRICING: CHEAPEST RIGHT NOW (free) ===
    // /api/gpu/pricing/cheapest?gpu=H100&type=on_demand|spot
    // Returns the top 3 cheapest current offers for one canonical GPU.
    // Designed as the agent-friendly entry point: an agent picking a GPU
    // does not need the full snapshot, just "where do I rent this right
    // now and for how much."

    if (path === '/api/gpu/pricing/cheapest') {
      const gpuParam = url.searchParams.get('gpu')?.trim();
      const typeParam = (url.searchParams.get('type')?.trim() || 'on_demand') as 'on_demand' | 'spot';

      if (!gpuParam) {
        return jsonResponse({
          ok: false,
          error: 'gpu_required',
          hint: 'Pass ?gpu=<canonical> (e.g. H100, H200, A100-80GB, RTX-4090). Full taxonomy at /api/meta.',
        }, 400);
      }
      if (!isCanonicalGPU(gpuParam)) {
        return jsonResponse({
          ok: false,
          error: 'invalid_gpu',
          hint: `Pass a canonical GPU key. Known: H200, H100, B200, A100-80GB, A100-40GB, L40S, L40, L4, RTX-6000-Ada, A6000, A5000, A4000, RTX-4090, RTX-3090, V100, MI300X, MI250.`,
        }, 400);
      }
      if (typeParam !== 'on_demand' && typeParam !== 'spot') {
        return jsonResponse({
          ok: false,
          error: 'invalid_type',
          hint: 'Pass ?type=on_demand or ?type=spot (default: on_demand)',
        }, 400);
      }

      const snapshot = await getGpuPricingCurrent(env);
      if (!snapshot) {
        return jsonResponse({ ok: false, error: 'no_pricing_data' }, 503);
      }
      const result = pickCheapestGpu(snapshot, gpuParam as CanonicalGPU, typeParam);
      return jsonResponse(result, 200, 300);
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
      // Geo-IP block for comprehensively sanctioned jurisdictions. Refuse
      // to even quote a credit purchase. Wallet-level screening on
      // /api/payment/confirm catches anything that slips past via VPN.
      const country = (request as unknown as { cf?: { country?: string } }).cf?.country;
      if (isOFACBlockedCountry(country)) {
        return jsonResponse(
          {
            ok: false,
            error: 'jurisdiction_blocked',
            message: 'TensorFeed cannot accept Premium API credit purchases from this jurisdiction due to applicable sanctions law.',
            country,
            reference: 'https://tensorfeed.ai/terms#premium',
          },
          403,
        );
      }
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
          // Sanctions block -> 403, screening misconfig -> 503,
          // anything else (verification failed, replay, expired quote) -> 400.
          const status = result.status ?? 400;
          return jsonResponse(result, status);
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

    // === AFTA: NO-CHARGE STATS (free, public) ===
    // Daily aggregate of every call we did NOT charge for, with per-reason
    // and per-endpoint breakdown plus the most-recent 200 events. This is
    // the published, auditable proof of the Agent Fair-Trade Agreement
    // no-charge guarantees. /api/payment/no-charge-stats?date=YYYY-MM-DD
    // for a specific day; default is today. /api/payment/no-charge-stats/dates
    // returns the index of dates with rollup data.

    if (path === '/api/payment/no-charge-stats/dates') {
      const dates = await listNoChargeDates(env);
      return jsonResponse({ ok: true, dates }, 200, 60);
    }

    if (path === '/api/payment/no-charge-stats') {
      const dateParam = url.searchParams.get('date');
      const rollup = await getNoChargeRollup(env, dateParam || undefined);
      if (!rollup) {
        return jsonResponse(
          {
            ok: true,
            date: dateParam || new Date().toISOString().slice(0, 10),
            count: 0,
            credits_skipped: 0,
            by_reason: {},
            by_endpoint: {},
            events: [],
            note: 'No no-charge events recorded for this date. Either no events have triggered the AFTA guarantees, or the date is in the future.',
          },
          200,
          60,
        );
      }
      return jsonResponse({ ok: true, ...rollup }, 200, 60);
    }

    // === AFTA: RECEIPT VERIFY (free, public) ===
    // Verify a signed receipt against our published Ed25519 public key.
    // Agents can also verify offline by fetching /.well-known/tensorfeed-receipt-key.json
    // and running the canonical-JSON signature check themselves; this endpoint
    // is a convenience for SDKs and a discoverability surface.
    //
    // POST body: { receipt: <signed receipt> }
    // Returns: { ok: true, valid: bool, key_id, message? }

    if (path === '/api/receipt/verify' && request.method === 'POST') {
      try {
        const body = (await request.json()) as { receipt?: unknown };
        const r = body.receipt as Record<string, unknown> | undefined;
        if (!r || typeof r !== 'object') {
          return jsonResponse({ ok: false, error: 'receipt_required' }, 400);
        }
        // Fetch our own public JWK to verify against. The key file is
        // a static asset at /.well-known/tensorfeed-receipt-key.json,
        // served by Cloudflare Pages on the same zone.
        const keyRes = await fetch('https://tensorfeed.ai/.well-known/tensorfeed-receipt-key.json', {
          headers: { Accept: 'application/json' },
          signal: AbortSignal.timeout(5000),
        });
        if (!keyRes.ok) {
          return jsonResponse({ ok: false, error: 'public_key_unavailable' }, 503);
        }
        const publicJwk = await keyRes.json() as { kty?: string; crv?: string; x?: string; kid?: string };
        if (publicJwk.kty !== 'OKP' || publicJwk.crv !== 'Ed25519' || !publicJwk.x) {
          return jsonResponse({ ok: false, error: 'public_key_malformed' }, 503);
        }
        const valid = await verifyReceiptSignature(
          r as unknown as import('./receipts').SignedReceipt,
          publicJwk as unknown as { kty: 'OKP'; crv: 'Ed25519'; x: string; kid?: string },
        );
        return jsonResponse({
          ok: true,
          valid,
          key_id: publicJwk.kid || null,
          algorithm: 'EdDSA / Ed25519',
          canonical_form: 'tensorfeed-canonical-json-v1',
        });
      } catch {
        return jsonResponse({ ok: false, error: 'invalid_request_body' }, 400);
      }
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
      return await premiumResponse(result, payment, 1, request, env);
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
      return await premiumResponse(result, payment, 1, request, env);
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
      return await premiumResponse(result, payment, 1, request, env);
    }

    // === PAID PREMIUM: MCP REGISTRY TIME SERIES (Tier 1, 1 credit) ===
    // Multi-day series of MCP server registry growth and churn. The
    // registry is open data, but agents that want a 30/90-day trend
    // would otherwise have to capture it themselves daily for months.
    // We do that capture once on 30 9 * * *. 90-day max range.

    if (path === '/api/premium/mcp/registry/series') {
      const payment = await requirePayment(request, env, 1);
      if (!payment.paid) return payment.response!;

      const range = resolveMcpRegistryRange(url.searchParams.get('from'), url.searchParams.get('to'));
      if (!range.ok) {
        return jsonResponse(
          {
            ok: false,
            error: range.error,
            limits: {
              max_range_days: MCP_REG_MAX_RANGE_DAYS,
              default_range_days: MCP_REG_DEFAULT_RANGE_DAYS,
            },
          },
          400,
        );
      }

      const result = await getMcpRegistrySeries(env, range.from!, range.to!);
      ctx.waitUntil(
        logPremiumUsage(env, '/api/premium/mcp/registry/series', request.headers.get('User-Agent') || 'unknown', 1, payment.token),
      );
      return await premiumResponse(result, payment, 1, request, env);
    }

    // === PAID PREMIUM: LLM PROBE TIME SERIES (Tier 1, 1 credit) ===
    // Per-day SLA series for one provider: count, ok_pct, ttfb p50/p95/p99,
    // total p50/p95/p99, incident-hour count. The data is unique because
    // we measure it ourselves; no public source publishes 30/90-day SLA
    // history per LLM provider. 90-day max range, default 30 days back.

    if (path === '/api/premium/probe/series') {
      const payment = await requirePayment(request, env, 1);
      if (!payment.paid) return payment.response!;

      const provider = url.searchParams.get('provider')?.trim();
      if (!provider) {
        return jsonResponse({
          ok: false,
          error: 'provider_required',
          hint: 'Pass ?provider=<name> (anthropic, openai, google, mistral, cohere)',
        }, 400);
      }
      const range = resolveProbeRange(url.searchParams.get('from'), url.searchParams.get('to'));
      if (!range.ok) {
        return jsonResponse(
          {
            ok: false,
            error: range.error,
            limits: {
              max_range_days: PROBE_MAX_RANGE_DAYS,
              default_range_days: PROBE_DEFAULT_RANGE_DAYS,
            },
          },
          400,
        );
      }

      const result = await getProviderSeries(env, provider, range.from!, range.to!);
      ctx.waitUntil(
        logPremiumUsage(env, '/api/premium/probe/series', request.headers.get('User-Agent') || 'unknown', 1, payment.token),
      );
      return await premiumResponse(result, payment, 1, request, env);
    }

    // === PAID PREMIUM: GPU PRICING TIME SERIES (Tier 1, 1 credit) ===
    // /api/premium/gpu/pricing/series?gpu=H100&from=&to=
    // Daily cheapest on-demand and spot for one canonical GPU across all
    // tracked providers, plus pct change start-to-end. Range capped at
    // 90 days. Snapshot is captured daily; cannot be backfilled, so the
    // historical series compounds with time. The data is unique because
    // we aggregate across multiple marketplaces day after day; no other
    // source publishes a longitudinal price series joined this way.

    if (path === '/api/premium/gpu/pricing/series') {
      const payment = await requirePayment(request, env, 1);
      if (!payment.paid) return payment.response!;

      const gpuParam = url.searchParams.get('gpu')?.trim();
      if (!gpuParam) {
        return await premiumValidationFailure(
          { error: 'gpu_required', hint: 'Pass ?gpu=<canonical> (e.g. H100, A100-80GB)' },
          payment, request, env,
        );
      }
      if (!isCanonicalGPU(gpuParam)) {
        return await premiumValidationFailure({ error: 'invalid_gpu' }, payment, request, env);
      }
      const range = resolveGpuRange(url.searchParams.get('from'), url.searchParams.get('to'));
      if (!range.ok) {
        return await premiumValidationFailure(
          {
            error: range.error,
            limits: {
              max_range_days: GPU_MAX_RANGE_DAYS,
              default_range_days: GPU_DEFAULT_RANGE_DAYS,
            },
          },
          payment, request, env,
        );
      }

      const result = await getGpuSeries(env, gpuParam as CanonicalGPU, range.from!, range.to!);
      ctx.waitUntil(
        logPremiumUsage(env, '/api/premium/gpu/pricing/series', request.headers.get('User-Agent') || 'unknown', 1, payment.token),
      );
      return await premiumResponse(result, payment, 1, request, env);
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
      return await premiumResponse(result, payment, 1, request, env);
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
        return await premiumValidationFailure(
          result as unknown as Record<string, unknown>,
          payment, request, env,
        );
      }
      ctx.waitUntil(
        logPremiumUsage(env, '/api/premium/compare/models', request.headers.get('User-Agent') || 'unknown', 1, payment.token),
      );
      return await premiumResponse(result, payment, 1, request, env);
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
      return await premiumResponse(result, payment, 1, request, env);
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
        return await premiumValidationFailure(
          result as unknown as Record<string, unknown>,
          payment, request, env,
        );
      }
      ctx.waitUntil(
        logPremiumUsage(env, '/api/premium/cost/projection', request.headers.get('User-Agent') || 'unknown', 1, payment.token),
      );
      return await premiumResponse(result, payment, 1, request, env);
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
        return await premiumValidationFailure(
          result as unknown as Record<string, unknown>,
          payment, request, env,
        );
      }
      ctx.waitUntil(
        logPremiumUsage(env, '/api/premium/news/search', request.headers.get('User-Agent') || 'unknown', 1, payment.token),
      );
      return await premiumResponse(result, payment, 1, request, env);
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
      return await premiumResponse(result, payment, 1, request, env);
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
      return await premiumResponse(result, payment, 1, request, env);
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

    // === INTERNAL: federated AFTA validate + commit (split flow) ===
    // Sister sites that want to honor their own AFTA no-charge guarantees
    // call /validate up front (read-only check), run their handler, then
    // call /commit either to debit on success or to log a no-charge event.
    // Both authenticated by SHARED_INTERNAL_SECRET. NOT in /api/meta or
    // any agent-facing surface.
    //
    // Why split: the legacy validate-and-charge above is atomic and good
    // for callers without no-charge logic. Sister sites need the deferred
    // model so a 5xx, breaker trip, schema fail, or stale data on their
    // side does not result in a debit. The split lets them gate their
    // commit on the outcome of their own handler.
    //
    // Body shapes:
    //   POST /api/internal/validate
    //     { token, cost }
    //     -> { ok: true, credits_remaining, sufficient }
    //     -> { ok: false, reason: "invalid_token" | "insufficient_credits" }
    //
    //   POST /api/internal/commit
    //     { token, cost, endpoint, no_charge_reason?: "5xx"|"circuit_breaker"|"schema_validation_failure"|"stale_data" }
    //     -> { ok: true, credits_charged, balance_after, no_charge_reason }
    //     -> { ok: false, reason: "invalid_token" }
    // No-charge events log to pay:no-charge:{date} with the sister-site
    // endpoint string, so the AFTA public ledger reflects the network.

    if (path === '/api/internal/validate') {
      if (request.method !== 'POST') {
        return jsonResponse({ error: 'method_not_allowed' }, 405, 0);
      }
      const auth = request.headers.get('X-Internal-Auth') ?? '';
      const secret = env.SHARED_INTERNAL_SECRET ?? '';
      if (!secret || !constantTimeEqual(auth, secret)) {
        return jsonResponse({ error: 'unauthorized' }, 401, 0);
      }
      let body: { token?: unknown; cost?: unknown };
      try {
        body = await request.json();
      } catch {
        return jsonResponse({ error: 'bad_json' }, 400, 0);
      }
      const token = typeof body?.token === 'string' ? body.token : '';
      const costRaw = typeof body?.cost === 'number' ? body.cost : NaN;
      if (!token || !Number.isFinite(costRaw) || costRaw < 0) {
        return jsonResponse({ error: 'bad_request' }, 400, 0);
      }
      const result = await validateOnly(env, { token, cost: Math.floor(costRaw) });
      return jsonResponse(result, 200, 0);
    }

    if (path === '/api/internal/commit') {
      if (request.method !== 'POST') {
        return jsonResponse({ error: 'method_not_allowed' }, 405, 0);
      }
      const auth = request.headers.get('X-Internal-Auth') ?? '';
      const secret = env.SHARED_INTERNAL_SECRET ?? '';
      if (!secret || !constantTimeEqual(auth, secret)) {
        return jsonResponse({ error: 'unauthorized' }, 401, 0);
      }
      let body: { token?: unknown; cost?: unknown; endpoint?: unknown; no_charge_reason?: unknown };
      try {
        body = await request.json();
      } catch {
        return jsonResponse({ error: 'bad_json' }, 400, 0);
      }
      const token = typeof body?.token === 'string' ? body.token : '';
      const costRaw = typeof body?.cost === 'number' ? body.cost : NaN;
      const endpoint = typeof body?.endpoint === 'string' ? body.endpoint : '';
      const reasonRaw = typeof body?.no_charge_reason === 'string' ? body.no_charge_reason : null;
      const validReasons: Array<NonNullable<NoChargeReason>> = ['5xx', 'circuit_breaker', 'schema_validation_failure', 'stale_data'];
      const noChargeReason: NoChargeReason =
        reasonRaw && (validReasons as string[]).includes(reasonRaw)
          ? (reasonRaw as NonNullable<NoChargeReason>)
          : null;
      if (!token || !endpoint || !Number.isFinite(costRaw) || costRaw < 0) {
        return jsonResponse({ error: 'bad_request' }, 400, 0);
      }
      const cost = Math.floor(costRaw);
      const result = await commitInternal(env, { token, cost, endpoint, noChargeReason });

      // Fire-and-forget usage logging so the sister-site call appears
      // in the daily revenue + per-token usage history. Mirrors the
      // legacy validate-and-charge behavior. Only log on actual debit
      // (no-charge events are tracked separately in the AFTA ledger).
      if (result.ok && result.credits_charged > 0) {
        ctx.waitUntil(
          logPremiumUsage(
            env,
            endpoint,
            request.headers.get('User-Agent') || 'sister-site',
            cost,
            token,
          ),
        );
      }
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
    // Auth: ?key=<ADMIN_KEY> where ADMIN_KEY is a Worker secret set via
    // `wrangler secret put ADMIN_KEY`. Constant-time compare via
    // isAuthorizedAdmin(). Default-denies if ADMIN_KEY is unset.
    // This replaces the earlier ?key=<ENVIRONMENT> pattern, which was
    // unsafe once the repo went public (ENVIRONMENT="production" lives
    // in wrangler.toml).

    if (path === '/api/admin/usage' && isAuthorizedAdmin(env, url.searchParams.get('key'))) {
      const date = url.searchParams.get('date') || new Date().toISOString().slice(0, 10);
      const rollup = await getRollup(env, date);
      if (!rollup) {
        return jsonResponse({ ok: false, error: 'no_data_for_date', date }, 404);
      }
      return jsonResponse({ ok: true, ...rollup }, 200, 0);
    }

    if (path === '/api/admin/usage/dates' && isAuthorizedAdmin(env, url.searchParams.get('key'))) {
      const dates = await listRollupDates(env);
      return jsonResponse({ ok: true, count: dates.length, dates }, 200, 0);
    }

    if (path === '/api/admin/burn-token' && isAuthorizedAdmin(env, url.searchParams.get('key'))) {
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

    if (path === '/api/refresh' && isAuthorizedAdmin(env, url.searchParams.get('key'))) {
      const task = url.searchParams.get('task');
      if (task === 'history') {
        const result = await captureHistory(env);
        return jsonResponse({ message: 'History snapshot captured', ...result });
      }
      if (task === 'mcp-registry') {
        const result = await captureRegistrySnapshot(env);
        return jsonResponse({ message: 'MCP registry snapshot captured', ...result });
      }
      if (task === 'probe') {
        const result = await runProbeCycle(env);
        return jsonResponse({ message: 'Probe cycle ran', ...result });
      }
      if (task === 'probe-rollup') {
        const result = await rollupProbeYesterday(env);
        return jsonResponse({ message: 'Probe daily rollup ran', ...result });
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
    // Auth pattern when re-enabled: isAuthorizedAdmin(env, url.searchParams.get('key'))
    // if (path === '/api/tweet' && isAuthorizedAdmin(env, url.searchParams.get('key'))) {
    //   await postTopStories(env);
    //   return jsonResponse({ ok: true, message: 'Posted top stories to X' });
    // }

    return jsonResponse({ error: 'Not found', endpoints: ['/api/health', '/api/news', '/api/status', '/api/models', '/api/benchmarks', '/api/harnesses', '/api/podcasts', '/api/trending-repos', '/api/feed.xml', '/api/feed.json', '/api/meta'] }, 404);
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
    } else if (cron === '30 9 * * *') {
      // Daily 9:30 AM UTC: capture MCP server registry telemetry. Compounds
      // into a multi-month time series of registry growth, churn, and
      // status transitions. Backs /api/mcp/registry/snapshot (free) and
      // /api/premium/mcp/registry/series (1 credit).
      await run('captureMCPRegistry', () => captureRegistrySnapshot(env));
    } else if (cron === '*/15 * * * *') {
      // Every 15 min: probe each LLM provider with a configured key,
      // measure latency + status, write the latest 24h summary.
      // Per-provider daily budget cap prevents runaway spend.
      await run('runProbeCycle', () => runProbeCycle(env));
    } else if (cron === '5 0 * * *') {
      // Daily 00:05 UTC: roll yesterday's per-provider buffer into a
      // dated daily aggregate for premium time-series queries.
      await run('rollupProbeYesterday', () => rollupProbeYesterday(env));
    } else if (cron === '15 */4 * * *') {
      // Every 4 hours at :15: refresh GPU pricing across configured
      // marketplaces (Vast.ai public + RunPod when key is set).
      // Powers /api/gpu/pricing and /api/gpu/pricing/cheapest.
      await run('refreshGpuPricing', () => refreshGpuPricing(env));
    } else if (cron === '45 0 * * *') {
      // Daily 00:45 UTC: capture a daily GPU pricing snapshot for the
      // historical series. Compounds into the moat that backs
      // /api/premium/gpu/pricing/series.
      await run('captureGpuDaily', () => captureGpuDaily(env));
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
