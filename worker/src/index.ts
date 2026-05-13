import { Env, Article, ServiceStatus } from './types';
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
  readNewsDaily,
  readSourceHealth,
  listNewsDailyDates,
  listSourceHealthDates,
  summarizeSourceHealth,
  isISODate,
  enumerateDates,
} from './news-history';
import {
  fetchCVE,
  captureRecentCVEs,
  readRecentCVEs,
  readCVEsByDate,
  listCVEDates,
  CVE_ATTRIBUTION,
} from './security-cve';
import {
  captureKEV,
  readKEVCurrent,
  readKEVByCVE,
  readKEVAddedOnDate,
  listKEVAddedDates,
  readKEVMeta,
  summarizeKEVForFreeTier,
  KEV_ATTRIBUTION,
} from './security-kev';
import {
  fetchEPSSCurrent,
  fetchEPSSSeries,
  fetchEPSSTop,
  EPSS_ATTRIBUTION,
} from './security-epss';
import {
  fetchOSVById,
  fetchOSVForPackage,
  parseOsvPackageQuery,
  OSV_ATTRIBUTION,
  OSV_SUPPORTED_ECOSYSTEMS,
} from './security-osv';
import {
  fetchVulnrichment,
  VULNRICHMENT_ATTRIBUTION,
} from './security-vulnrichment';
import {
  parseEdgarSearchQuery,
  searchEdgar,
  fetchEdgarSubmissions,
  EDGAR_ATTRIBUTION,
} from './finance-sec-edgar';
import { handleMcpHttpRequest, MCP_TOOLS_COUNT } from './mcp-http';
import {
  parsePowerQuery,
  fetchPowerPoint,
  POWER_PARAMETER_CATALOG,
  POWER_ATTRIBUTION,
} from './climate-nasa-power';
import {
  parseEarthquakeQuery,
  fetchUSGSEarthquakes,
  USGS_VALID_MAGNITUDES,
  USGS_VALID_PERIODS,
} from './climate-usgs-earthquakes';
import {
  parseNWSAlertsQuery,
  fetchNWSAlerts,
  NWS_VALID_SEVERITIES,
  NWS_VALID_URGENCIES,
  NWS_VALID_STATUSES,
} from './climate-nws-alerts';
import {
  parseFDAQuery,
  parseFDAAggregateQuery,
  fetchFDAQuery,
  fetchFDAAggregate,
  isFDACategory,
  FDA_CATEGORIES,
  FDA_ATTRIBUTION,
} from './health-fda';
import {
  parseEIAQuery,
  fetchEIASeries,
  EIA_ROUTES,
  EIA_ATTRIBUTION,
} from './economy-eia';
import {
  transformCveRecord,
  transformKevEntry,
  transformEpssScore,
  transformNasaPowerPoint,
  transformEiaSeries,
  transformFdaQueryResults,
  attachCompressionStats,
  measureSourceBytes,
  composeVerifiedCve,
  transformOpenRouterModel,
  LLM_READY_CLEANING_VERSION,
} from './llm-ready';
import {
  runDailyClustering,
  readClustersForDate,
  listClusterDates,
} from './news-clustering';
import {
  resolveRange,
  resolveFreeRange,
  getPricingSeries,
  getBenchmarkSeries,
  getStatusUptime,
  MAX_RANGE_DAYS,
  DEFAULT_RANGE_DAYS,
  FREE_MAX_RANGE_DAYS,
  FREE_DEFAULT_RANGE_DAYS,
} from './history-series';
import { computeLeaderboard, resolveLastNDays } from './status-leaderboard';
import { generateUptimeBadge, resolveProviderSlug } from './badges';
import { getProviderUptimeSeries } from './status-history';
import {
  createWatch,
  createFreeWatch,
  deleteFreeWatch,
  deleteWatch,
  FREE_FIRE_CAP,
  FREE_PER_IP_WATCH_CAP,
  FREE_WATCH_TTL_SECONDS,
  getFreeWatch,
  getWatch,
  listFreeWatchesForIP,
  listWatchesForToken,
  runPriceWatchCycle,
  runDigestWatchCycle,
  runLeaderboardWatchCycle,
  runMacroIndicatorWatchCycle,
} from './watches';
import {
  getEnrichedDirectory,
  EnrichedOptions,
  SortKey,
} from './agents-enriched';
import { searchNews, NewsSearchOptions } from './news-search';
import {
  NFL_TEAMS,
  SUPPORTED_LEAGUES,
  getNFLTeam,
  pollNFLNews,
  readNFLNews,
  SPORTS_NEWS_ATTRIBUTION,
} from './sports-nfl';
import {
  captureNFLverseDaily,
  readPlayers as readNFLPlayers,
  readPlayer as readNFLPlayer,
  readSchedule as readNFLSchedule,
} from './sports-nfl-data';
import {
  captureSECTickersDaily,
  readSECTickers,
  readSECTicker,
} from './sec-tickers';
import {
  refreshNpmTrending,
  readNpmTrending,
  isValidCategory as isValidNpmCategory,
} from './npm-ai-packages';
import {
  refreshOpenAlexAIInstitutions,
  readAIInstitutions,
} from './openalex-research';
import {
  refreshBLSIndicators,
  readIndicators as readBLSIndicators,
  isValidCategory as isValidBLSCategory,
} from './bls-indicators';
import {
  MLB_TEAMS,
  getMLBTeam,
  pollMLBNews,
  readMLBNews,
} from './sports-mlb';
import { readPolicyRegistry } from './ai-policy-registry';
import { readFundingRegistry } from './ai-funding-registry';
import { computeFundingExposure } from './premium-funding-exposure';
import { captureLeaderboard as captureHfLeaderboard, readLatest as readHfLeaderboardLatest } from './hf-leaderboard';
import {
  refreshPyPITrending,
  readPyPITrending,
  isValidCategory as isValidPyPICategory,
} from './pypi-ai-packages';
import {
  refreshFREDIndicators,
  readIndicators as readFREDIndicators,
  isValidCategory as isValidFREDCategory,
} from './fred-indicators';
import { computeMacroDigest } from './premium-macro-digest';
import { computePolicyTimeline, parseTimelineParams } from './premium-policy-timeline';
import {
  getEconomySeriesHistory,
  isValidSource as isValidEconomySource,
} from './premium-economy-history';
import { computePackagesMomentum } from './premium-packages-momentum';
import { computeResearchVelocity } from './premium-research-velocity';
import {
  computeMilestones as computeArxivMilestones,
  computeEmergingKeywords as computeArxivEmergingKeywords,
  computeTopicSearch as computeArxivTopicSearch,
  loadTopicSearchTaxonomies as loadArxivTaxonomies,
  validateTopicSearchInput as validateArxivTopicSearchInput,
  computeLabProductivity as computeArxivLabProductivity,
  validateLabProductivityInput as validateArxivLabProductivityInput,
} from './premium-research-arxiv';
import { refreshX402Registry, getLatestX402Registry } from './x402-registry';
import { getKillSwitchState, setKillSwitch, getKillSwitchAuditLog } from './kill-switch';
import { computeRecessionWatch } from './premium-recession-watch';
import { refreshVrData, readVrFeed, readVrOriginals } from './vr-aggregator';
import { AFTA_ADOPTERS } from './afta-adopters';
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
  captureDailyPapers,
  getLatestSnapshot as getPapersLatest,
} from './papers';
import {
  captureArxivSnapshot,
  getLatestSnapshot as getArxivLatest,
} from './arxiv';
import {
  captureHFSnapshot,
  getLatestSnapshot as getHFLatest,
} from './hf-trending';
import {
  captureHotIssues,
  getLatestSnapshot as getHotIssuesLatest,
} from './hot-issues';
import {
  captureAgentOpportunities,
  getLatestSnapshot as getAgentOpportunitiesLatest,
  checkAndSendOpportunityAlerts,
} from './agent-opportunities';
import {
  captureRedditSnapshot,
  getLatestSnapshot as getRedditLatest,
} from './reddit-trending';
import {
  captureORSnapshot,
  getLatestSnapshot as getORLatest,
} from './openrouter-catalog';
import {
  captureHFDailyPapers,
  getLatestSnapshot as getHFDailyPapersLatest,
} from './hf-daily-papers';
import {
  buildTodayBrief,
  resolveSections as resolveTodaySections,
  resolveLimit as resolveTodayLimit,
} from './today-brief';
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
  isValidSenderWallet,
  confirmPayment,
  getBalance,
  logPremiumUsage,
  getRollup,
  listRollupDates,
  getTokenUsage,
  getPaymentHistory,
  getSpendCapStatus,
  setSpendCap,
  revokeOwnToken,
  getAnomalyEvents,
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
  validateAgentNonce,
  RECEIPT_VERSION_CURRENT,
  ReceiptCore,
  NoChargeReason,
} from './receipts';
import { checkStaleness, resolveSLA, describeSLAs } from './freshness';
import { recordPollRun, checkNewsStaleness, alertStaleNews, sendDailySummary, getAlertsStatus } from './alerts';
import {
  maybeSimulatedErrorResponse,
  applySimulatedLatency,
  noteSimulatedResponse,
  maybeFlushChaos,
  getChaosStats,
} from './chaos';
import {
  applyRateLimitHeaders,
  checkAdminIPRateLimit,
  checkIPRateLimit,
  checkMcpIPRateLimit,
  checkNoChargeAbuse,
  FREE_TRIAL_DEFAULTS,
  getClientIP,
  isRateLimitExempt,
  peekFreeTrialQuota,
  rateLimitedResponse,
} from './rate-limit';
import { maybeHandleHoneypot } from './honeypot';
import { handleIocExport } from './iocs';
import { backupKvToR2, listRecentBackups, readManifest } from './backup';
import { buildSuggestedNextCalls } from './suggested-next';
import { listWantlist, submitWantlistItem, WANTLIST_DEFAULTS } from './wantlist';
import { getAiSupplyChainIocs, refreshAiSupplyChainIocs } from './ai-supply-chain-iocs';
import {
  DECISION_VERIFIED_ATTRIBUTION,
  lookupVerifiedCluster,
  parseLookupQuery,
  parseSearchQuery,
  searchVerifiedClusters,
} from './decision-verified';
import { getActivitySnapshot } from './mcp-activity';
import { handleAftaBadge } from './afta-badge';
import { runX402StatusCheck, getStatusSnapshot } from './x402-status';
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
 * (Authorization for credits, X-PAYMENT for the canonical Coinbase x402 V2
 * exact scheme, X-Payment-Tx + X-Payment-Quote for the legacy TF fallback,
 * the chaos-engineering and internal-auth headers). `Expose-Headers` surfaces
 * the response headers that an agent in a browser context needs to read
 * (rate-limit info, premium token issuance metadata, the canonical
 * PAYMENT-RESPONSE settlement receipt).
 */
const CORS_HEADERS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
  'Access-Control-Allow-Headers':
    'Content-Type, Authorization, X-PAYMENT, X-Payment-Tx, X-Payment-Quote, X-TensorFeed-Simulate-Error, X-TensorFeed-Simulate-Latency, X-Internal-Auth',
  'Access-Control-Expose-Headers':
    'RateLimit-Limit, RateLimit-Remaining, RateLimit-Reset, X-RateLimit-Limit, X-RateLimit-Remaining, X-RateLimit-Reset, Retry-After, X-Payment-Token, X-Payment-Token-Balance, X-Payment-Token-Note, PAYMENT-RESPONSE, X-TensorFeed-Simulated, X-TensorFeed-Simulated-Latency-Ms',
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
  if (payment.paymentResponseHeader) headers['PAYMENT-RESPONSE'] = payment.paymentResponseHeader;

  // Compression headers: every premium /clean/* response carries
  // compression_stats at the top level (via the LlmReadyEnvelope spread).
  // Surface the two numbers agents care about (tokens saved + reduction
  // percentage) to response headers so an HTTP client can log savings
  // without parsing the JSON body. Cheap, non-breaking, and applies
  // uniformly to all 8 clean endpoints. Only set when the body actually
  // carries compression_stats; non-clean premium responses skip both.
  const compressionStats = r.compression_stats as
    | { reduction_pct?: number | null; approx_tokens_saved?: number | null }
    | null
    | undefined;
  if (compressionStats && typeof compressionStats === 'object') {
    if (typeof compressionStats.approx_tokens_saved === 'number') {
      headers['X-Tensorfeed-Tokens-Saved'] = String(compressionStats.approx_tokens_saved);
    }
    if (typeof compressionStats.reduction_pct === 'number') {
      headers['X-Tensorfeed-Reduction-Pct'] = String(compressionStats.reduction_pct);
    }
  }

  // Build the body. If staleness triggered no-charge, surface a stale
  // marker so the agent can decide to retry rather than trust the data.
  const bodyResult: Record<string, unknown> = { ...(result as Record<string, unknown>) };
  if (commit.noChargeReason === 'stale_data') {
    bodyResult.stale = true;
    bodyResult.stale_age_seconds = staleness.ageSeconds;
    bodyResult.stale_sla_seconds = staleness.slaSeconds;
  }
  // Cross-sell hints: per-endpoint static map of suggested next TF
  // endpoints, with inherited query params where applicable. Surfaced
  // in the body BEFORE receipt signing so an agent can audit "what
  // TF recommended at the time of this call". Capped at 3 to avoid
  // burying the real response. Defined in worker/src/suggested-next.ts.
  const suggestedNext = buildSuggestedNextCalls(request);
  if (suggestedNext.length > 0) {
    bodyResult.suggested_next_calls = suggestedNext;
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
  // Surface free-trial state when the call was granted under the
  // 100-call/IP/24h trial. Lets agents budget without an extra round
  // trip to /api/free-tier/status. Mirrors the X-RateLimit-* header
  // pattern for parity with rate-limited responses.
  if (payment.freeTrial) {
    billing.tier = 'free_trial';
    billing.free_trial_used_today = payment.freeTrial.used;
    billing.free_trial_remaining = payment.freeTrial.remaining;
    billing.free_trial_limit = payment.freeTrial.limit;
    billing.free_trial_resets_at = payment.freeTrial.resetAt;
    billing.upgrade_when_ready = '/api/payment/buy-credits';
    headers['X-TF-Free-Trial'] = '1';
    headers['X-TF-Free-Trial-Used'] = String(payment.freeTrial.used);
    headers['X-TF-Free-Trial-Remaining'] = String(payment.freeTrial.remaining);
    headers['X-TF-Free-Trial-Limit'] = String(payment.freeTrial.limit);
    headers['X-TF-Free-Trial-Resets-At'] = payment.freeTrial.resetAt;
  }

  // Receipt: build core, sign with Ed25519, embed in response.
  // X-Agent-Nonce (optional): if the agent supplies a valid nonce, it
  // is echoed verbatim into the signed payload so the agent has
  // cryptographic proof the receipt was made for ITS request rather
  // than a server-cached prior call.
  const agentNonce = validateAgentNonce(request.headers.get('X-Agent-Nonce'));
  const requestHash = await hashRequest(request.method, url);
  const responseHash = await hashResponse(bodyResult);
  const core: ReceiptCore = {
    v: RECEIPT_VERSION_CURRENT,
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
    agent_nonce: agentNonce,
  };
  const signed = await signReceipt(env, core);
  const responseBody: Record<string, unknown> = {
    ...bodyResult,
    billing,
  };
  if (signed) {
    responseBody.receipt = signed;
    headers['X-TensorFeed-Receipt-Id'] = signed.id;
    if (agentNonce) headers['X-Agent-Nonce-Echo'] = agentNonce;
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
  noChargeReason: NoChargeReason = 'schema_validation_failure',
): Promise<Response> {
  const url = new URL(request.url);
  const endpoint = url.pathname;

  // Asymmetric resource exhaustion guard (post-2026-05-05 audit fix):
  // attackers with a valid bearer token could spam endpoints with
  // intentionally-invalid bodies to force the worker to perform
  // expensive Ed25519 signing per request, with zero credit cost
  // because schema_validation_failure is a no-charge event. The
  // per-token abuse limiter caps no-charge events at
  // NO_CHARGE_LIMIT_PER_MIN per minute. Past the cap we short-circuit
  // with a cheap 429 (no signReceipt) so the attacker burns their own
  // bandwidth without burning ours.
  const abuse = payment.token ? checkNoChargeAbuse(payment.token) : { abusive: false, count: 0, limit: 0, resetSeconds: 60 };
  if (abuse.abusive) {
    return new Response(
      JSON.stringify({
        ok: false,
        error: 'no_charge_abuse',
        message:
          'This bearer token has exceeded the no-charge event limit for the current minute. Receipt signing is throttled to prevent asymmetric resource exhaustion. Honest agents should never reach this limit; persistent triggering will result in token revocation.',
        limit: abuse.limit,
        count: abuse.count,
        reset_seconds: abuse.resetSeconds,
        doc: '/agent-fair-trade#abuse',
      }),
      {
        status: 429,
        headers: {
          'Content-Type': 'application/json',
          'Retry-After': String(abuse.resetSeconds),
          'Cache-Control': 'no-store',
        },
      },
    );
  }

  // Log the no-charge event and ensure no debit. commitPayment writes
  // the chosen reason to the ledger and does not touch the credit
  // balance regardless of category. Default is schema_validation_failure
  // (the original use case); upstream_failure is used when the handler
  // detected an upstream API failure that shouldn't be billed to the
  // agent. Both share the no-charge-abuse limiter.
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
  if (payment.paymentResponseHeader) headers['PAYMENT-RESPONSE'] = payment.paymentResponseHeader;

  const billing: Record<string, unknown> = {
    credits_charged: 0,
    credits_remaining: commit.balanceAfter,
    no_charge_reason: noChargeReason,
    afta_doc: 'https://tensorfeed.ai/agent-fair-trade',
  };
  if (payment.newToken) {
    billing.new_token_issued = true;
    billing.token = payment.token;
  }

  const bodyResult: Record<string, unknown> = { ok: false, ...errorBody };

  // Receipt: same shape as premiumResponse, but credits_charged is 0,
  // captured_at is null (handler bailed before computing), and
  // no_charge_reason is fixed. X-Agent-Nonce still folds in so the
  // agent can prove this no-charge receipt was for ITS request.
  const agentNonce = validateAgentNonce(request.headers.get('X-Agent-Nonce'));
  const requestHash = await hashRequest(request.method, url);
  const responseHash = await hashResponse(bodyResult);
  const core: ReceiptCore = {
    v: RECEIPT_VERSION_CURRENT,
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
    no_charge_reason: noChargeReason,
    freshness_sla_seconds: null,
    agent_nonce: agentNonce,
  };
  const signed = await signReceipt(env, core);
  const responseBody: Record<string, unknown> = {
    ...bodyResult,
    billing,
  };
  if (signed) {
    responseBody.receipt = signed;
    headers['X-TensorFeed-Receipt-Id'] = signed.id;
    if (agentNonce) headers['X-Agent-Nonce-Echo'] = agentNonce;
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

    // Honeypot trap. Runs before everything else so the request body, KV
    // hits, and analytics are not consumed by obvious scanners. Returns
    // an indistinguishable 404 and logs the probe to KV + Logpush for
    // forensic export via /api/security/iocs.json.
    const trapResponse = maybeHandleHoneypot(request, env, ctx);
    if (trapResponse) return trapResponse;

    // Chaos engineering: short-circuit if the caller is testing failure modes.
    // Runs before activity tracking, route dispatch, and requirePayment so a
    // simulated error or timeout does not consume credits or skew analytics.
    const simulatedError = maybeSimulatedErrorResponse(request);
    if (simulatedError) {
      // Track the simulated response so /api/chaos/stats can expose
      // it as an adoption metric and downstream analytics can subtract
      // synthetic traffic from real 5xx rates.
      noteSimulatedResponse(simulatedError.status);
      ctx.waitUntil(maybeFlushChaos(env));
      return simulatedError;
    }
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

    // Chaos engineering counter. Free, public, edge-cached. Lets agent
    // devs see their own simulated-error traffic and lets external
    // analytics (e.g. traffic-tracker) subtract synthetic responses
    // from real 5xx rates so dashboards aren't dominated by chaos
    // tests. Counter is per-UTC-day, increments only on responses
    // generated by the chaos layer (X-TensorFeed-Simulate-Error header).
    if (path === '/api/chaos/stats') {
      const stats = await getChaosStats(env);
      return jsonResponse(
        {
          ok: true,
          source: 'tensorfeed.ai',
          window: 'today_utc',
          date: stats.date,
          total: stats.total,
          by_status: stats.by_status,
          updated: new Date().toISOString(),
          note: 'Counter resets at 00:00 UTC. Increments only on responses generated by the chaos engineering layer (X-TensorFeed-Simulate-Error header). Treat these as synthetic, not real outages.',
        },
        200,
        30,
      );
    }

    // Health check (1 KV read, cached 60s)
    if (path === '/api/ping') {
      return jsonResponse({ ok: true, deployed: 'auto', timestamp: new Date().toISOString() });
    }

    // === MCP (HTTP transport) ===
    // Hosted Streamable HTTP MCP endpoint per the 2024-11-05 spec.
    // Companion to the stdio @tensorfeed/mcp-server published on npm;
    // this is the canonical server-hosted endpoint that fits the
    // `type: "http"` MCP-server pattern Anthropic's vertical agent
    // repos and other MCP marketplaces standardize on. POST a JSON-RPC
    // 2.0 envelope; GET returns minimal discovery info.
    //
    // Tighter per-IP cap on /api/mcp on top of the general 120/min cap
    // already applied above. JSON-RPC POST is heavier per-call than
    // typical REST GETs (envelope parse + tool dispatch + sometimes
    // upstream fetch), so the MCP surface gets a 60/min/IP cap. Both
    // limiters apply; a misbehaving agent hits the MCP cap first.
    if (path === '/api/mcp') {
      const mcpIp = getClientIP(request);
      const mcpRate = checkMcpIPRateLimit(mcpIp);
      if (!mcpRate.allowed) {
        return rateLimitedResponse(mcpRate);
      }
      const mcpResp = await handleMcpHttpRequest(request, env);
      return applyRateLimitHeaders(mcpResp, mcpRate);
    }

    if (path === '/api/security/iocs.json' || path === '/api/security/iocs') {
      return handleIocExport(env);
    }

    // === AI-AGENT WANTLIST ===
    // Free demand-signal collector. Agents (or their human operators)
    // post what data they wish TF served. Aggregated patterns inform
    // pipeline priorities. Per worker/src/wantlist.ts.
    if (path === '/api/wantlist' && request.method === 'POST') {
      let body: unknown;
      try {
        body = await request.json();
      } catch {
        return jsonResponse({ ok: false, error: 'bad_json', hint: 'POST a JSON body' }, 400, 0);
      }
      const ip = getClientIP(request);
      const out = await submitWantlistItem(env, ip, body as Record<string, unknown>);
      const status = out.ok ? 201 : ((out as { error: string }).error === 'rate_limit_exceeded' ? 429 : 400);
      return jsonResponse(out, status, 0);
    }
    if (path === '/api/wantlist' && (request.method === 'GET' || request.method === 'HEAD')) {
      const recentParam = url.searchParams.get('recent');
      const recentLimit = recentParam ? parseInt(recentParam, 10) : 25;
      const snapshot = await listWantlist(env, Number.isFinite(recentLimit) ? recentLimit : 25);
      return jsonResponse({ ok: true, ...snapshot }, 200, 60);
    }

    // === FREE WATCHES (per-IP webhook subscriptions) ===
    // Same storage and same delivery cron as paid /api/premium/watches.
    // Owner key is "ip:<addr>" so the existing per-token KV index
    // naturally namespaces. Caps are tighter: 5 watches per IP, 25
    // fires per watch, 30-day TTL. Same IP for management; IP rotation
    // = lose access (recreate is the workaround). The agent-side
    // webhook handler IS a reason for TF to live in their codebase
    // forever; this is the stickiness move.
    if (path === '/api/watches/free' && request.method === 'POST') {
      const ip = getClientIP(request);
      let body: { spec?: unknown; callback_url?: string; secret?: string; fire_cap?: number };
      try {
        body = await request.json();
      } catch {
        return jsonResponse({ ok: false, error: 'invalid_json' }, 400, 0);
      }
      if (typeof body.callback_url !== 'string') {
        return jsonResponse({ ok: false, error: 'callback_url_required' }, 400, 0);
      }
      const result = await createFreeWatch(env, ip, {
        spec: body.spec as never,
        callback_url: body.callback_url,
        ...(typeof body.secret === 'string' ? { secret: body.secret } : {}),
        ...(typeof body.fire_cap === 'number' ? { fire_cap: body.fire_cap } : {}),
      });
      if (!result.ok) {
        const status = result.error === 'free_per_ip_watch_cap_reached' ? 429 : 400;
        return jsonResponse(result, status, 0);
      }
      return jsonResponse(
        {
          ok: true,
          watch: result.watch,
          tier: 'free',
          caps: {
            per_ip: FREE_PER_IP_WATCH_CAP,
            fires_per_watch: FREE_FIRE_CAP,
            ttl_seconds: FREE_WATCH_TTL_SECONDS,
          },
          management_note: 'GET and DELETE on this watch require the same IP. Rotation loses access; just recreate.',
          upgrade_when_ready: '/api/payment/buy-credits',
        },
        201,
        0,
      );
    }

    if (path === '/api/watches/free' && (request.method === 'GET' || request.method === 'HEAD')) {
      const ip = getClientIP(request);
      const watches = await listFreeWatchesForIP(env, ip);
      return jsonResponse(
        {
          ok: true,
          ip,
          count: watches.length,
          watches,
          caps: {
            per_ip: FREE_PER_IP_WATCH_CAP,
            fires_per_watch: FREE_FIRE_CAP,
            ttl_seconds: FREE_WATCH_TTL_SECONDS,
          },
        },
        200,
        0,
      );
    }

    const freeWatchMatch = path.match(/^\/api\/watches\/free\/(wat_[a-f0-9]{24})$/);
    if (freeWatchMatch) {
      const id = freeWatchMatch[1]!;
      const ip = getClientIP(request);
      if (request.method === 'GET') {
        const watch = await getFreeWatch(env, id, ip);
        if (!watch) return jsonResponse({ ok: false, error: 'watch_not_found_or_forbidden' }, 404, 0);
        return jsonResponse({ ok: true, watch }, 200, 0);
      }
      if (request.method === 'DELETE') {
        const result = await deleteFreeWatch(env, id, ip);
        if (!result.ok) {
          const status = result.error === 'watch_not_found' ? 404 : 403;
          return jsonResponse(result, status, 0);
        }
        return jsonResponse({ ok: true, deleted: id }, 200, 0);
      }
      return jsonResponse({ ok: false, error: 'method_not_allowed' }, 405, 0);
    }

    // Free, no-auth self-service endpoint so an agent can check its
    // current premium-trial quota without burning a slot. Returns the
    // 24h rolling counter for the caller's IP. Cheap (single in-memory
    // map peek). Does NOT increment the counter.
    if (path === '/api/free-tier/status') {
      const ip = getClientIP(request);
      const peek = peekFreeTrialQuota(ip);
      return jsonResponse(
        {
          ok: true,
          ip,
          free_trial: {
            calls_per_ip_per_day: peek.limit,
            window: '24h rolling per IP',
            auth_required: false,
            used_today: peek.used,
            remaining: peek.remaining,
            resets_at: peek.resetAt,
            retry_in_seconds_when_exhausted: peek.resetSeconds,
            note: 'Each IP gets 100 free premium API calls per 24-hour window. No authentication, no signup, no wallet required. Excess returns canonical x402 V2 challenge with the same trial state surfaced.',
            applies_to: '/api/premium/* (every premium endpoint)',
            upgrade_when_ready: '/api/payment/buy-credits',
          },
        },
        200,
        60,
      );
    }

    // Public AI/MCP/LLM supply-chain IOC feed. Free tier. Daily cron
    // refresh; KV-cached snapshot. Served as-is with a cache hint.
    // Posture: republish public advisories with attribution, never
    // detect or attribute. See worker/src/ai-supply-chain-iocs.ts.
    if (
      path === '/api/security/ai-supply-chain-iocs.json' ||
      path === '/api/security/ai-supply-chain-iocs'
    ) {
      const snapshot = await getAiSupplyChainIocs(env);
      if (!snapshot) {
        return jsonResponse(
          {
            ok: false,
            error: 'no_snapshot_yet',
            message:
              'The AI supply-chain IOC feed has not been refreshed yet. Retry after the next 07:15 UTC cron run.',
          },
          503,
          0,
        );
      }
      return jsonResponse({ ok: true, ...snapshot }, 200, 60 * 60);
    }

    // Public MCP activity dashboard data. Two signal sources:
    //  - npm downloads (primary; covers the dominant stdio install path)
    //  - Hosted /api/mcp tool-call counters from KV (secondary)
    // Cached at the edge for 5 minutes; npm fetches inside are cached 1 hr.
    // AFTA Certified badge — SVG renderer. Publishers embed
    //   <img src="https://tensorfeed.ai/api/afta/badge?domain=X" />
    // and the badge reflects their live AFTA score. Errors gracefully.
    if (path === '/api/afta/badge' || path === '/api/afta/badge.svg') {
      return handleAftaBadge(request, env, url);
    }

    // x402 publisher status snapshot. Hourly cron monitors every known
    // x402 publisher's /.well-known/x402.json. Returns current state +
    // 24h/7d uptime + recent series for the public /x402/health dashboard.
    if (path === '/api/x402/status' || path === '/api/x402/health') {
      try {
        const snapshot = await getStatusSnapshot(env);
        return new Response(JSON.stringify(snapshot), {
          status: 200,
          headers: {
            'content-type': 'application/json; charset=utf-8',
            'cache-control': 'public, max-age=120, s-maxage=120',
            'access-control-allow-origin': '*',
          },
        });
      } catch (e) {
        return jsonResponse({ ok: false, error: e instanceof Error ? e.message : String(e) }, 500);
      }
    }

    if (path === '/api/mcp/activity' || path === '/api/mcp/activity.json') {
      try {
        const snapshot = await getActivitySnapshot(env);
        return new Response(JSON.stringify(snapshot), {
          status: 200,
          headers: {
            'content-type': 'application/json; charset=utf-8',
            'cache-control': 'public, max-age=300, s-maxage=300',
            'access-control-allow-origin': '*',
          },
        });
      } catch (e) {
        return jsonResponse({ ok: false, error: e instanceof Error ? e.message : String(e) }, 500);
      }
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

    // === VR / AR / XR endpoints (supportive site: vr.org) ===
    // vr.org runs no payment rail of its own. TensorFeed pulls vr.org's
    // existing free public APIs on a cron and re-exposes the data through
    // these TF-side endpoints. vr.org is credited as the upstream publisher
    // of all content; article links resolve back to vr.org.

    if (path === '/api/vr/news') {
      const limitParam = parseInt(url.searchParams.get('limit') || '50', 10);
      const limit = Math.min(Number.isFinite(limitParam) ? limitParam : 50, 200);
      const category = url.searchParams.get('category');

      const cache = await readVrFeed(env);
      if (!cache) {
        return jsonResponse({
          ok: false,
          error: 'vr_data_not_yet_aggregated',
          message: 'VR feed not yet pulled. Refreshes hourly via cron.',
          upstream_source: 'https://vr.org',
        }, 503, 30);
      }

      let articles = cache.articles;
      if (category) {
        const c = category.toLowerCase();
        articles = articles.filter(a =>
          a.category.toLowerCase() === c || a.tags.some(t => t.toLowerCase() === c)
        );
      }

      return jsonResponse({
        ok: true,
        source: 'tensorfeed.ai',
        upstream_source: cache.upstream_source,
        upstream_endpoint: cache.upstream_endpoint,
        upstream_lastUpdated: cache.upstream_lastUpdated,
        captured_at: cache.capturedAt,
        attribution: cache.attribution,
        count: Math.min(articles.length, limit),
        total: articles.length,
        articles: articles.slice(0, limit),
      }, 200, 60);
    }

    if (path === '/api/vr/originals') {
      const limitParam = parseInt(url.searchParams.get('limit') || '50', 10);
      const limit = Math.min(Number.isFinite(limitParam) ? limitParam : 50, 200);

      const cache = await readVrOriginals(env);
      if (!cache) {
        return jsonResponse({
          ok: false,
          error: 'vr_data_not_yet_aggregated',
          message: 'VR.org Originals not yet pulled. Refreshes hourly via cron.',
          upstream_source: 'https://vr.org',
        }, 503, 30);
      }

      return jsonResponse({
        ok: true,
        source: 'tensorfeed.ai',
        upstream_source: cache.upstream_source,
        upstream_endpoint: cache.upstream_endpoint,
        captured_at: cache.capturedAt,
        attribution: cache.attribution,
        count: Math.min(cache.articles.length, limit),
        total: cache.articles.length,
        articles: cache.articles.slice(0, limit),
      }, 200, 60);
    }

    // === AFTA Adopter Directory (machine-readable) ===
    // Agent-facing JSON listing of known AFTA adopters. Informational, not
    // authoritative. Each adopter's own /.well-known/agent-fair-trade.json
    // is the source of truth (per AFTA GOVERNANCE.md). Anyone can run a
    // competing directory.

    if (path === '/api/afta/adopters') {
      return jsonResponse({
        ok: true,
        source: 'tensorfeed.ai',
        view_type: 'directory',
        authoritative: false,
        note: "TensorFeed's view of the AFTA adopter network. Not authoritative. Each adopter's own /.well-known/agent-fair-trade.json manifest is the source of truth. Per AFTA GOVERNANCE.md, adoption is the certification; removal from this list does not revoke status, inclusion does not confer it.",
        standard_home: 'https://afta.dev',
        standard_repo: 'https://github.com/RipperMercs/afta',
        governance: 'https://github.com/RipperMercs/afta/blob/main/GOVERNANCE.md',
        schema: 'https://tensorfeed.ai/.well-known/agent-fair-trade-schema.json',
        human_directory: 'https://tensorfeed.ai/afta-network',
        submission_pr: 'https://github.com/RipperMercs/tensorfeed/blob/main/src/lib/afta-adopters.ts',
        run_your_own: 'Multiple non-authoritative directories are welcomed. Lift this JSON, render it elsewhere, host your own list. The MIT license guarantees the right; the no-central-registry principle guarantees the freedom.',
        count: AFTA_ADOPTERS.length,
        adopters: AFTA_ADOPTERS,
        generated_at: new Date().toISOString(),
      }, 200, 300);
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

    // === ATTENTION INDEX ENDPOINT (cached 300s) ===
    // Derived per-provider attention score from the existing news + trending
    // + activity caches. Computed on demand. No new ingestion, no new KV
    // writes. Cached 300s in the Cache API layer to bound recompute cost.

    if (path === '/api/attention') {
      const cacheKey = new Request(`https://tensorfeed.ai/__cache/attention/v1`);
      const cache = caches.default;
      const hit = await cache.match(cacheKey);
      if (hit) return hit;

      const [articles, trending, activityHits] = await Promise.all([
        env.TENSORFEED_NEWS.get('articles', 'json') as Promise<unknown[] | null>,
        env.TENSORFEED_CACHE.get('trending-repos', 'json') as Promise<unknown[] | null>,
        env.TENSORFEED_CACHE.get('agent-activity', 'json') as Promise<{ endpoint?: string }[] | null>,
      ]);

      const { computeAttention } = await import('./attention');
      const result = computeAttention(
        (articles || []) as Parameters<typeof computeAttention>[0],
        (trending || []) as Parameters<typeof computeAttention>[1],
        activityHits ? { recent: activityHits } : null,
      );

      const body = JSON.stringify({
        ok: true,
        source: 'tensorfeed.ai',
        ...result,
      });
      const response = new Response(body, {
        status: 200,
        headers: {
          'content-type': 'application/json',
          'access-control-allow-origin': '*',
          'cache-control': 'public, max-age=300',
        },
      });
      ctx.waitUntil(cache.put(cacheKey, response.clone()));
      return response;
    }

    // === ATTENTION HISTORY: list of dates (free) ===

    if (path === '/api/attention/history') {
      const { listAttentionDates } = await import('./attention-history');
      const dates = await listAttentionDates(env);
      return jsonResponse({
        ok: true,
        source: 'tensorfeed.ai',
        count: dates.length,
        dates,
      }, 200, 60);
    }

    // === ATTENTION HISTORY: single-date snapshot (free) ===

    {
      const m = path.match(/^\/api\/attention\/history\/(\d{4}-\d{2}-\d{2})$/);
      if (m) {
        const { readAttentionSnapshot } = await import('./attention-history');
        const snap = await readAttentionSnapshot(env, m[1]);
        if (!snap) {
          return jsonResponse({ ok: false, error: 'snapshot_not_found', date: m[1] }, 404);
        }
        return jsonResponse({
          ok: true,
          source: 'tensorfeed.ai',
          ...snap,
        }, 200, 600);
      }
    }

    // === FUNDING ROUNDS TRACKER (cached 600s) ===

    if (path === '/api/funding') {
      const { FUNDING_ROUNDS, FUNDING_LAST_UPDATED } = await import('./funding');
      const categoryFilter = url.searchParams.get('category');
      const stageFilter = url.searchParams.get('stage');
      let rounds = FUNDING_ROUNDS;
      if (categoryFilter) rounds = rounds.filter(r => r.category === categoryFilter);
      if (stageFilter) rounds = rounds.filter(r => r.stage === stageFilter);
      return jsonResponse({ ok: true, source: 'tensorfeed.ai', lastUpdated: FUNDING_LAST_UPDATED, count: rounds.length, rounds }, 200, 600);
    }

    // === OSS TOOLS REGISTRY (cached 600s) ===

    if (path === '/api/oss-tools') {
      const { OSS_TOOLS, OSS_TOOLS_LAST_UPDATED } = await import('./oss-tools');
      const categoryFilter = url.searchParams.get('category');
      let tools = OSS_TOOLS;
      if (categoryFilter) tools = tools.filter(t => t.category === categoryFilter);
      return jsonResponse({ ok: true, source: 'tensorfeed.ai', lastUpdated: OSS_TOOLS_LAST_UPDATED, count: tools.length, tools }, 200, 600);
    }

    // === AI POLICY TRACKER (cached 600s) ===

    if (path === '/api/ai-policy') {
      const { POLICY_ITEMS, POLICY_LAST_UPDATED } = await import('./ai-policy');
      const statusFilter = url.searchParams.get('status');
      const jurisdictionFilter = url.searchParams.get('jurisdiction');
      let items = POLICY_ITEMS;
      if (statusFilter) items = items.filter(i => i.status === statusFilter);
      if (jurisdictionFilter) items = items.filter(i => i.jurisdiction.toLowerCase().includes(jurisdictionFilter.toLowerCase()));
      return jsonResponse({ ok: true, source: 'tensorfeed.ai', lastUpdated: POLICY_LAST_UPDATED, count: items.length, items }, 200, 600);
    }

    // === AI CONFERENCES (cached 600s) ===

    // === MODEL DEPRECATIONS (cached 600s) ===
    //
    // Provider-by-provider lifecycle calendar of model retirements and
    // deprecation announcements. Curated from each provider's own
    // notice page. Free tier; agents reading the AI ecosystem can pull
    // this directly to know which models will stop accepting traffic
    // and when, plus the recommended replacement.
    if (path === '/api/model-deprecations') {
      const { MODEL_DEPRECATIONS, MODEL_DEPRECATIONS_LAST_UPDATED } = await import('./model-deprecations');
      const provider = url.searchParams.get('provider');
      const status = url.searchParams.get('status');
      let entries = MODEL_DEPRECATIONS;
      if (provider) entries = entries.filter(d => d.provider.toLowerCase() === provider.toLowerCase());
      if (status) entries = entries.filter(d => d.status === status);
      // Sort by most recent activity first (sunset > deprecation > announce date).
      entries = [...entries].sort((a, b) => {
        const aDate = a.sunsetDate || a.deprecationDate || a.announcedDate || '';
        const bDate = b.sunsetDate || b.deprecationDate || b.announcedDate || '';
        return bDate.localeCompare(aDate);
      });
      return jsonResponse({ ok: true, source: 'tensorfeed.ai', lastUpdated: MODEL_DEPRECATIONS_LAST_UPDATED, count: entries.length, deprecations: entries }, 200, 600);
    }

    if (path === '/api/conferences') {
      const { CONFERENCES, CONFERENCES_LAST_UPDATED } = await import('./conferences');
      const categoryFilter = url.searchParams.get('category');
      const upcomingOnly = url.searchParams.get('upcoming') === 'true';
      let conferences = CONFERENCES;
      if (categoryFilter) conferences = conferences.filter(c => c.category === categoryFilter);
      if (upcomingOnly) {
        const today = new Date().toISOString().slice(0, 10);
        conferences = conferences.filter(c => c.endDate >= today);
      }
      conferences = [...conferences].sort((a, b) => a.startDate.localeCompare(b.startDate));
      return jsonResponse({ ok: true, source: 'tensorfeed.ai', lastUpdated: CONFERENCES_LAST_UPDATED, count: conferences.length, conferences }, 200, 600);
    }

    // === COMPUTE PROVIDERS (cached 600s) ===

    if (path === '/api/compute-providers') {
      const { COMPUTE_PROVIDERS, COMPUTE_PROVIDERS_LAST_UPDATED } = await import('./compute-providers');
      const typeFilter = url.searchParams.get('type');
      let providers = COMPUTE_PROVIDERS;
      if (typeFilter) providers = providers.filter(p => p.type === typeFilter);
      return jsonResponse({ ok: true, source: 'tensorfeed.ai', lastUpdated: COMPUTE_PROVIDERS_LAST_UPDATED, count: providers.length, providers }, 200, 600);
    }

    // === VOICE LEADERBOARDS (cached 1800s) ===

    if (path === '/api/voice-leaderboards') {
      const { VOICE_LEADERBOARDS } = await import('./voice-leaderboards');
      return jsonResponse({
        ok: true,
        source: 'tensorfeed.ai',
        ...VOICE_LEADERBOARDS,
      }, 200, 1800);
    }

    // === AI MARKETPLACES (cached 600s) ===

    if (path === '/api/marketplaces') {
      const { MARKETPLACE_CATALOG, MARKETPLACES_LAST_UPDATED } = await import('./marketplaces');
      const categoryFilter = url.searchParams.get('category');
      let marketplaces = MARKETPLACE_CATALOG;
      if (categoryFilter) {
        marketplaces = marketplaces.filter(m => m.category === categoryFilter);
      }
      return jsonResponse({
        ok: true,
        source: 'tensorfeed.ai',
        lastUpdated: MARKETPLACES_LAST_UPDATED,
        count: marketplaces.length,
        marketplaces,
      }, 200, 600);
    }

    // === PUBLIC LEADERBOARDS AGGREGATOR (cached 600s) ===

    if (path === '/api/public-leaderboards') {
      const { PUBLIC_LEADERBOARDS, PUBLIC_LEADERBOARDS_LAST_UPDATED } = await import('./public-leaderboards');
      const domainFilter = url.searchParams.get('domain');
      let leaderboards = PUBLIC_LEADERBOARDS;
      if (domainFilter) {
        leaderboards = leaderboards.filter(l => l.domain === domainFilter);
      }
      return jsonResponse({
        ok: true,
        source: 'tensorfeed.ai',
        lastUpdated: PUBLIC_LEADERBOARDS_LAST_UPDATED,
        count: leaderboards.length,
        leaderboards,
      }, 200, 600);
    }

    // === FINE-TUNING PROVIDER CATALOG (cached 600s) ===

    if (path === '/api/fine-tuning') {
      const { FINE_TUNING_PROVIDERS, FINE_TUNING_LAST_UPDATED } = await import('./fine-tuning');
      const typeFilter = url.searchParams.get('type');
      const methodFilter = url.searchParams.get('method');
      let providers = FINE_TUNING_PROVIDERS;
      if (typeFilter) {
        providers = providers.filter(p => p.type === typeFilter);
      }
      if (methodFilter) {
        providers = providers.filter(p => p.methods.includes(methodFilter as 'lora'));
      }
      return jsonResponse({
        ok: true,
        source: 'tensorfeed.ai',
        lastUpdated: FINE_TUNING_LAST_UPDATED,
        count: providers.length,
        providers,
      }, 200, 600);
    }

    // === SPECIALIZED MODELS CATALOG (cached 600s) ===

    if (path === '/api/specialized-models') {
      const { SPECIALIZED_MODELS, SPECIALIZED_MODELS_LAST_UPDATED } = await import('./specialized-models');
      const domainFilter = url.searchParams.get('domain');
      const openOnly = url.searchParams.get('open_weights') === 'true';
      let models = SPECIALIZED_MODELS;
      if (domainFilter) {
        models = models.filter(m => m.domain === domainFilter);
      }
      if (openOnly) {
        models = models.filter(m => m.openWeights);
      }
      return jsonResponse({
        ok: true,
        source: 'tensorfeed.ai',
        lastUpdated: SPECIALIZED_MODELS_LAST_UPDATED,
        count: models.length,
        models,
      }, 200, 600);
    }

    // === MODEL CARDS / SAFETY AGGREGATOR (cached 600s) ===

    if (path === '/api/model-cards') {
      const { MODEL_CARDS, SAFETY_DOCS, MODEL_CARDS_LAST_UPDATED } = await import('./model-cards');
      const labFilter = url.searchParams.get('lab');
      let cards = MODEL_CARDS;
      if (labFilter) {
        cards = cards.filter(c => c.lab.toLowerCase() === labFilter.toLowerCase());
      }
      return jsonResponse({
        ok: true,
        source: 'tensorfeed.ai',
        lastUpdated: MODEL_CARDS_LAST_UPDATED,
        modelCount: cards.length,
        modelCards: cards,
        crossModelSafetyDocs: SAFETY_DOCS,
      }, 200, 600);
    }

    // === TRAINING DATASETS REGISTRY (cached 600s) ===

    if (path === '/api/training-datasets') {
      const { TRAINING_DATASETS, TRAINING_DATASETS_LAST_UPDATED } = await import('./training-datasets');
      const stageFilter = url.searchParams.get('stage');
      let datasets = TRAINING_DATASETS;
      if (stageFilter) {
        datasets = datasets.filter(d => d.stage === stageFilter);
      }
      return jsonResponse({
        ok: true,
        source: 'tensorfeed.ai',
        lastUpdated: TRAINING_DATASETS_LAST_UPDATED,
        count: datasets.length,
        datasets,
      }, 200, 600);
    }

    // === x402 ADOPTERS TRACKER (cached 600s) ===
    // Curated catalog of publishers, SDKs, gateways, and reference impls
    // that speak the x402 HTTP-payment protocol.

    if (path === '/api/x402-adopters') {
      const { X402_ADOPTERS, X402_ADOPTERS_LAST_UPDATED } = await import('./x402-adopters');
      const categoryFilter = url.searchParams.get('category');
      const statusFilter = url.searchParams.get('status');
      let adopters = X402_ADOPTERS;
      if (categoryFilter) adopters = adopters.filter(a => a.category === categoryFilter);
      if (statusFilter) adopters = adopters.filter(a => a.status === statusFilter);
      return jsonResponse({
        ok: true,
        source: 'tensorfeed.ai',
        spec_url: 'https://x402.org',
        lastUpdated: X402_ADOPTERS_LAST_UPDATED,
        count: adopters.length,
        adopters,
      }, 200, 600);
    }


    // === AI LAWSUITS CATALOG (cached 600s) ===
    // Active and notable disputes involving frontier AI labs, training-
    // data providers, deployment platforms, and regulators. Editorial
    // disclaimer in the source module: NOT legal advice.

    if (path === '/api/ai-lawsuits') {
      const { AI_LAWSUITS_CATALOG, AI_LAWSUITS_LAST_UPDATED } = await import('./ai-lawsuits');
      const statusFilter = url.searchParams.get('status');
      const claimFilter = url.searchParams.get('claim');
      const jurisdictionFilter = url.searchParams.get('jurisdiction');
      let lawsuits = AI_LAWSUITS_CATALOG;
      if (statusFilter) lawsuits = lawsuits.filter(l => l.status === statusFilter);
      if (claimFilter) lawsuits = lawsuits.filter(l => l.claims.includes(claimFilter as never));
      if (jurisdictionFilter) {
        const j = jurisdictionFilter.toLowerCase();
        lawsuits = lawsuits.filter(l => l.jurisdiction.toLowerCase().includes(j));
      }
      return jsonResponse({
        ok: true,
        source: 'tensorfeed.ai',
        disclaimer: 'Editorial summary based on public court filings and news coverage. Not legal advice. Verify against cited sources before acting.',
        lastUpdated: AI_LAWSUITS_LAST_UPDATED,
        count: lawsuits.length,
        lawsuits,
      }, 200, 600);
    }

    // === EMBODIED AI REGISTRY (cached 600s) ===
    // VLA foundation models, humanoid platforms, robot training datasets,
    // and physics simulators. Optional ?category= filter narrows the slice.

    if (path === '/api/embodied-ai') {
      const { EMBODIED_AI_CATALOG, EMBODIED_AI_LAST_UPDATED } = await import('./embodied-ai');
      const categoryFilter = url.searchParams.get('category');
      let entries = EMBODIED_AI_CATALOG;
      if (categoryFilter) {
        entries = entries.filter(e => e.category === categoryFilter);
      }
      return jsonResponse({
        ok: true,
        source: 'tensorfeed.ai',
        lastUpdated: EMBODIED_AI_LAST_UPDATED,
        count: entries.length,
        entries,
      }, 200, 600);
    }

    // === AGENT APIS REGISTRY (cached 600s) ===

    if (path === '/api/agent-apis') {
      const { AGENT_API_CATALOG, AGENT_APIS_LAST_UPDATED } = await import('./agent-apis');
      const categoryFilter = url.searchParams.get('category');
      const hasMcpFilter = url.searchParams.get('has_mcp') === 'true';
      let apis = AGENT_API_CATALOG;
      if (categoryFilter) {
        apis = apis.filter(a => a.category === categoryFilter);
      }
      if (hasMcpFilter) {
        apis = apis.filter(a => a.hasMCP);
      }
      return jsonResponse({
        ok: true,
        source: 'tensorfeed.ai',
        lastUpdated: AGENT_APIS_LAST_UPDATED,
        count: apis.length,
        apis,
      }, 200, 600);
    }

    // === AGENT PROVISIONING SUPPORT (cached 600s) ===
    //
    // Tracks who has shipped support for the Cloudflare-Stripe agent
    // provisioning protocol (April 30, 2026). Filters: ?status=live|pending|unknown
    // and ?category=hosting|database|auth|observability|background-jobs|
    // ai-infrastructure|cdn-edge|email.

    if (path === '/api/agent-provisioning') {
      const { PROVISIONING_CATALOG, PROVISIONING_LAST_UPDATED, provisioningSummary } = await import('./agent-provisioning');
      const statusFilter = url.searchParams.get('status');
      const categoryFilter = url.searchParams.get('category');
      let entries = PROVISIONING_CATALOG;
      if (statusFilter) {
        entries = entries.filter(p => p.status === statusFilter);
      }
      if (categoryFilter) {
        entries = entries.filter(p => p.category === categoryFilter);
      }
      return jsonResponse({
        ok: true,
        source: 'tensorfeed.ai',
        protocol: 'cloudflare-stripe-agent-provisioning',
        protocol_launched: '2026-04-30',
        lastUpdated: PROVISIONING_LAST_UPDATED,
        summary: provisioningSummary(),
        count: entries.length,
        providers: entries,
      }, 200, 600);
    }

    // === TRAINING RUNS / COMPUTE ECONOMICS (cached 600s) ===

    if (path === '/api/training-runs') {
      const { TRAINING_RUNS, TRAINING_RUNS_LAST_UPDATED } = await import('./training-runs');
      const publisherFilter = url.searchParams.get('publisher');
      const openOnly = url.searchParams.get('open_weights') === 'true';
      let runs = TRAINING_RUNS;
      if (publisherFilter) {
        runs = runs.filter(r => r.publisher.toLowerCase() === publisherFilter.toLowerCase());
      }
      if (openOnly) {
        runs = runs.filter(r => r.openWeights);
      }
      return jsonResponse({
        ok: true,
        source: 'tensorfeed.ai',
        lastUpdated: TRAINING_RUNS_LAST_UPDATED,
        count: runs.length,
        runs,
      }, 200, 600);
    }

    // === OPEN-WEIGHTS DEPLOYMENT REGISTRY (cached 600s) ===

    if (path === '/api/open-weights') {
      const { OPEN_WEIGHTS_CATALOG, OPEN_WEIGHTS_LAST_UPDATED } = await import('./open-weights');
      const familyFilter = url.searchParams.get('family');
      let models = OPEN_WEIGHTS_CATALOG;
      if (familyFilter) {
        models = models.filter(m => m.family.toLowerCase() === familyFilter.toLowerCase());
      }
      return jsonResponse({
        ok: true,
        source: 'tensorfeed.ai',
        lastUpdated: OPEN_WEIGHTS_LAST_UPDATED,
        count: models.length,
        models,
      }, 200, 600);
    }

    // === AI HARDWARE SPEC CATALOG (cached 600s) ===

    if (path === '/api/ai-hardware') {
      const { AI_HARDWARE_CATALOG, AI_HARDWARE_LAST_UPDATED } = await import('./ai-hardware');
      const manufacturerFilter = url.searchParams.get('manufacturer');
      let hardware = AI_HARDWARE_CATALOG;
      if (manufacturerFilter) {
        hardware = hardware.filter(h => h.manufacturer.toLowerCase() === manufacturerFilter.toLowerCase());
      }
      return jsonResponse({
        ok: true,
        source: 'tensorfeed.ai',
        lastUpdated: AI_HARDWARE_LAST_UPDATED,
        count: hardware.length,
        hardware,
      }, 200, 600);
    }

    // === MCP SERVER CATALOG (cached 600s) ===

    if (path === '/api/mcp-servers') {
      const { MCP_SERVER_CATALOG, MCP_SERVERS_LAST_UPDATED } = await import('./mcp-servers');
      const capabilityFilter = url.searchParams.get('capability');
      const firstPartyFilter = url.searchParams.get('first_party');
      let servers = MCP_SERVER_CATALOG;
      if (capabilityFilter) {
        servers = servers.filter(s => s.capabilities.includes(capabilityFilter as 'filesystem'));
      }
      if (firstPartyFilter === 'true') {
        servers = servers.filter(s => s.firstParty);
      }
      return jsonResponse({
        ok: true,
        source: 'tensorfeed.ai',
        lastUpdated: MCP_SERVERS_LAST_UPDATED,
        count: servers.length,
        servers,
      }, 200, 600);
    }

    // === USAGE RANKINGS (cached 1800s) ===
    // Real production-traffic rankings sourced from OpenRouter. Editorial
    // snapshot for now; weekly refresh routine pulls upstream.

    if (path === '/api/usage-rankings') {
      const { USAGE_RANKINGS, USAGE_RANKINGS_LAST_UPDATED, USAGE_RANKINGS_SOURCE, USAGE_RANKINGS_WINDOW } = await import('./usage-rankings');
      return jsonResponse({
        ok: true,
        source: 'tensorfeed.ai',
        upstream: USAGE_RANKINGS_SOURCE,
        window: USAGE_RANKINGS_WINDOW,
        lastUpdated: USAGE_RANKINGS_LAST_UPDATED,
        count: USAGE_RANKINGS.length,
        rankings: USAGE_RANKINGS,
      }, 200, 1800);
    }

    // === FRAMEWORKS CATALOG (cached 600s) ===

    if (path === '/api/frameworks') {
      const { FRAMEWORK_CATALOG, FRAMEWORKS_LAST_UPDATED } = await import('./frameworks');
      const langFilter = url.searchParams.get('language');
      const categoryFilter = url.searchParams.get('category');
      let frameworks = FRAMEWORK_CATALOG;
      if (langFilter) {
        frameworks = frameworks.filter(f => f.languages.includes(langFilter as 'python' | 'typescript' | 'javascript' | 'multi'));
      }
      if (categoryFilter) {
        frameworks = frameworks.filter(f => f.category === categoryFilter);
      }
      return jsonResponse({
        ok: true,
        source: 'tensorfeed.ai',
        lastUpdated: FRAMEWORKS_LAST_UPDATED,
        count: frameworks.length,
        frameworks,
      }, 200, 600);
    }

    // === BENCHMARK REGISTRY (cached 600s) ===

    if (path === '/api/benchmark-registry') {
      const { BENCHMARK_REGISTRY, BENCHMARK_REGISTRY_LAST_UPDATED } = await import('./benchmark-registry');
      const categoryFilter = url.searchParams.get('category');
      const statusFilter = url.searchParams.get('status');
      let benchmarks = BENCHMARK_REGISTRY;
      if (categoryFilter) {
        benchmarks = benchmarks.filter(b => b.category === categoryFilter);
      }
      if (statusFilter) {
        benchmarks = benchmarks.filter(b => b.status === statusFilter);
      }
      return jsonResponse({
        ok: true,
        source: 'tensorfeed.ai',
        lastUpdated: BENCHMARK_REGISTRY_LAST_UPDATED,
        count: benchmarks.length,
        benchmarks,
      }, 200, 600);
    }

    // === MULTIMODAL CATALOG (cached 600s) ===
    // Image / video / TTS / STT model catalog with modality-native pricing
    // (per image, per second of video, per 1k chars, per minute of audio).

    if (path === '/api/multimodal') {
      const { MULTIMODAL_CATALOG, MULTIMODAL_LAST_UPDATED } = await import('./multimodal');
      const modalityFilter = url.searchParams.get('modality');
      let models = MULTIMODAL_CATALOG;
      if (modalityFilter && ['image', 'video', 'tts', 'stt'].includes(modalityFilter)) {
        models = models.filter(m => m.modality === modalityFilter);
      }
      return jsonResponse({
        ok: true,
        source: 'tensorfeed.ai',
        lastUpdated: MULTIMODAL_LAST_UPDATED,
        count: models.length,
        models,
      }, 200, 600);
    }

    // === VECTOR DB CATALOG (cached 600s) ===
    // Hosted vector databases and self-hostable engines with pricing,
    // tier limits, hybrid search support, and operational details.

    if (path === '/api/vector-dbs') {
      const { VECTOR_DB_CATALOG, VECTOR_DBS_LAST_UPDATED } = await import('./vector-dbs');
      const typeFilter = url.searchParams.get('type');
      const ossOnly = url.searchParams.get('open_source') === 'true';
      let dbs = VECTOR_DB_CATALOG;
      if (typeFilter && ['managed', 'oss', 'hybrid'].includes(typeFilter)) {
        dbs = dbs.filter(d => d.type === typeFilter);
      }
      if (ossOnly) {
        dbs = dbs.filter(d => d.openSource);
      }
      return jsonResponse({
        ok: true,
        source: 'tensorfeed.ai',
        lastUpdated: VECTOR_DBS_LAST_UPDATED,
        count: dbs.length,
        databases: dbs,
      }, 200, 600);
    }

    // === EMBEDDING & RERANKER CATALOG (cached 600s) ===
    // Curated list of production-ready embedding and reranker models with
    // pricing, dimensions, max input tokens, hosted vs open-source status.
    // Editorial data; refreshed on redeploy.

    if (path === '/api/embeddings') {
      const { EMBEDDING_CATALOG, EMBEDDINGS_LAST_UPDATED } = await import('./embeddings');
      const typeFilter = url.searchParams.get('type');
      let models = EMBEDDING_CATALOG;
      if (typeFilter === 'embedding' || typeFilter === 'reranker') {
        models = models.filter(m => m.type === typeFilter);
      }
      return jsonResponse({
        ok: true,
        source: 'tensorfeed.ai',
        lastUpdated: EMBEDDINGS_LAST_UPDATED,
        count: models.length,
        models,
      }, 200, 600);
    }

    // === INFERENCE PROVIDER PRICING MATRIX (cached 600s) ===
    // Same open-weight model x multiple hosted inference providers.
    // Agents picking the cheapest path for Llama 4 / DeepSeek V4 etc.
    // call /api/inference-providers/cheapest?model=... and skip the matrix.

    if (path === '/api/inference-providers') {
      const { INFERENCE_MATRIX, INFERENCE_LAST_UPDATED, TRACKED_PROVIDERS } = await import('./inference-providers');
      const familyFilter = url.searchParams.get('family');
      let models = INFERENCE_MATRIX;
      if (familyFilter) {
        models = models.filter(m => m.family.toLowerCase() === familyFilter.toLowerCase());
      }
      return jsonResponse({
        ok: true,
        source: 'tensorfeed.ai',
        lastUpdated: INFERENCE_LAST_UPDATED,
        tracked_providers: TRACKED_PROVIDERS,
        count: models.length,
        models,
      }, 200, 600);
    }

    if (path === '/api/inference-providers/cheapest') {
      const modelId = url.searchParams.get('model')?.trim();
      const sortBy = (url.searchParams.get('sort') || 'blended') as 'blended' | 'input' | 'output' | 'tps_desc';
      if (!modelId) {
        return jsonResponse({
          ok: false,
          error: 'model_required',
          hint: 'Pass ?model=<canonical> (e.g. llama-4-scout, deepseek-v4-pro). Full list at /api/inference-providers.',
        }, 400);
      }
      const { cheapestForModel } = await import('./inference-providers');
      const result = cheapestForModel(modelId, sortBy);
      if (!result) {
        return jsonResponse({
          ok: false,
          error: 'model_not_found',
          hint: 'Model id not in the matrix. List models at /api/inference-providers.',
        }, 404);
      }
      return jsonResponse({
        ok: true,
        source: 'tensorfeed.ai',
        ...result,
      }, 200, 600);
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

    // === AGENT OPPORTUNITIES (daily GitHub scan) ===
    // Daily snapshot of new GitHub repos that are submission/distribution
    // opportunities for TF: Anthropic/OpenAI/Microsoft/MCP-org repos created
    // recently, plus broader keyword sweeps for MCP servers, x402 projects,
    // agent skill catalogs. Powers automated discovery of new vertical
    // marketplaces (the pattern that drove the financial-services + life-
    // sciences + skills + knowledge-work-plugins submissions in 24h).
    // Refreshed daily at 13:30 UTC. Free, no auth.
    if (path === '/api/agents/opportunities') {
      const snapshot = await getAgentOpportunitiesLatest(env);
      if (!snapshot) {
        return jsonResponse({
          ok: false,
          error: 'no_snapshot_yet',
          hint: 'The daily 13:30 UTC scan has not yet produced a snapshot. Use /api/refresh?key=...&task=opportunities for an admin-triggered initial capture.',
        }, 503);
      }
      return jsonResponse({ ok: true, ...snapshot }, 200, 300);
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
          attention: '/api/attention',
          attentionHistory: '/api/attention/history',
          attentionHistorySnapshot: '/api/attention/history/{YYYY-MM-DD}',
          embeddings: '/api/embeddings?type=embedding|reranker',
          multimodal: '/api/multimodal?modality=image|video|tts|stt',
          vectorDbs: '/api/vector-dbs?type=managed|oss|hybrid&open_source=true',
          usageRankings: '/api/usage-rankings',
          frameworks: '/api/frameworks?language=python|typescript&category=agent-orchestration|rag|multi-agent|sdk|workflow|voice-agent|browser-agent',
          benchmarkRegistry: '/api/benchmark-registry?category=knowledge|math|code|multimodal|agents|long-context&status=active|saturated',
          openWeights: '/api/open-weights?family=Meta|DeepSeek|Mistral|Alibaba|Google|Microsoft',
          aiHardware: '/api/ai-hardware?manufacturer=NVIDIA|AMD|Google|AWS|Apple|Cerebras|Groq',
          mcpServers: '/api/mcp-servers?capability=filesystem|web-search|browser|github|slack|database&first_party=true',
          trainingDatasets: '/api/training-datasets?stage=pretraining|instruction-tuning|dpo|rlhf|multimodal',
          embodiedAi: '/api/embodied-ai?category=foundation_model|humanoid|dataset|simulator',
          aiLawsuits: '/api/ai-lawsuits?status=active|settled|dismissed|judgment|consolidated&claim=copyright-infringement|dmca-violation|antitrust|...&jurisdiction=US|UK|EU',
          x402Adopters: '/api/x402-adopters?category=publisher|sdk|gateway|reference|spec&status=live|beta|reference-impl|announced|sdk|gateway|spec',
          agentApis: '/api/agent-apis?category=search|web-scraping|weather|finance|maps|email|sms|payments|code-execution|ocr&has_mcp=true',
          agentProvisioning: '/api/agent-provisioning?status=live|pending|unknown&category=hosting|database|auth|observability|background-jobs|ai-infrastructure|cdn-edge|email',
          trainingRuns: '/api/training-runs?publisher=OpenAI|Anthropic|Meta|Google|DeepSeek&open_weights=true',
          fineTuning: '/api/fine-tuning?type=first-party|hosted&method=lora|qlora|full|dpo|rlhf',
          specializedModels: '/api/specialized-models?domain=code|medical|legal|finance|music|3d|retrieval|science&open_weights=true',
          modelCards: '/api/model-cards?lab=Anthropic|OpenAI|Google|Meta|DeepSeek',
          voiceLeaderboards: '/api/voice-leaderboards',
          marketplaces: '/api/marketplaces?category=gpts|agents|skills|models|spaces|mcp|workflows|plugins',
          publicLeaderboards: '/api/public-leaderboards?domain=general|code|math|reasoning|multimodal|agent|safety|voice|image|video|long-context|open-models',
          funding: '/api/funding?category=frontier-lab|inference|agent|coding|infra|enterprise|creative|voice|video|data&stage=seed|series-a|series-b|series-c|series-d|series-e|growth',
          ossTools: '/api/oss-tools?category=runtime|inference-server|fine-tuning|ui|eval|training|observability|edge',
          aiPolicy: '/api/ai-policy?status=active|pending|proposed|stalled&jurisdiction=EU|US|UK|China|Korea',
          conferences: '/api/conferences?category=research|industry|developer|community&upcoming=true',
          modelDeprecations: '/api/model-deprecations?provider=OpenAI|Anthropic|Google|Cohere|...&status=announced|deprecated|sunsetted',
          computeProviders: '/api/compute-providers?type=gpu-cloud|hyperscaler|ai-serverless|marketplace|specialized',
          inferenceProviders: '/api/inference-providers?family=Meta|DeepSeek|Mistral|Alibaba',
          inferenceProvidersCheapest: '/api/inference-providers/cheapest?model=<id>&sort=blended|input|output|tps_desc',
          agentsDirectory: '/api/agents/directory',
          agentsOpportunities: '/api/agents/opportunities (free; daily-refreshed scan of new GitHub repos that represent submission/distribution opportunities for TF: anthropics/openai/microsoft/modelcontextprotocol orgs + MCP/x402/skills keyword sweeps. Scored by signal_weight * recency + log10(stars). 13:30 UTC cron)',
          agentActivity: '/api/agents/activity',
          chaosStats: '/api/chaos/stats',
          podcasts: '/api/podcasts',
          trendingRepos: '/api/trending-repos',
          health: '/api/health',
          history: '/api/history',
          historySnapshot: '/api/history/{YYYY-MM-DD}/{type}',
          historyPricingSeries: '/api/history/pricing/series?model=&days=1-7 (free, 7-day cap)',
          historyBenchmarksSeries: '/api/history/benchmarks/series?model=&benchmark=&days=1-7 (free, 7-day cap)',
          historyStatusUptime: '/api/history/status/uptime?provider=&days=1-7 (free, 7-day cap)',
          historyNews: '/api/history/news?date=&limit=1-25 (free, capped at 25 articles per day; full daily snapshot at /api/premium/history/news/full)',
          historyNewsSources: '/api/history/news/sources?date= (free; per-source RSS poll reliability rollup for one UTC day)',
          historyNewsDates: '/api/history/news/dates (free; ordered list of UTC dates with a daily news snapshot)',
          historyNewsSourcesDates: '/api/history/news/sources/dates (free; ordered list of UTC dates with a source-health rollup)',
          historyNewsClusters: '/api/history/news/clusters?date=&min_sources=1-50 (free; story-level corroboration clusters for a UTC date with embedding-based grouping. Top 25 returned with optional source-count filter)',
          historyNewsClustersDates: '/api/history/news/clusters/dates (free; ordered list of UTC dates with cluster data)',
          securityCVEById: '/api/security/cve/{CVE-id} (free; lazy-fetch a single CVE Record v5.2 from MITRE, 7-day cache. License: MITRE CVE Terms of Use, commercial redistribution permitted)',
          securityCVERecent: '/api/security/cve/recent?limit=1-100 (free; ring buffer of CVE IDs added in cvelistV5 commits over the last ~24h)',
          securityCVEByDate: '/api/security/cve/by-date/{YYYY-MM-DD} (free; CVE IDs added in cvelistV5 commits on one UTC day)',
          securityCVEDates: '/api/security/cve/dates (free; ordered list of UTC dates with CVE-by-date data)',
          securityKEV: '/api/security/kev?limit=1-50 (free; CISA Known Exploited Vulnerabilities, 50 most-recent. Full catalog at /api/premium/security/kev/full. License: US Gov public domain)',
          securityKEVById: '/api/security/kev/{CVE-id} (free; single KEV entry by CVE ID, or 404 if the CVE is not in the catalog)',
          securityKEVAdded: '/api/security/kev/added/{YYYY-MM-DD} (free; KEV entries with dateAdded on one UTC day)',
          securityKEVDates: '/api/security/kev/dates (free; ordered list of UTC dates with KEV-added data)',
          securityEPSSById: '/api/security/epss/{CVE-id} (free; current EPSS exploitation-likelihood score for a CVE, lazy-fetched from FIRST.org with 24h cache. License: free for any use per FIRST.org policy)',
          securityEPSSTop: '/api/security/epss/top?limit=1-50 (free; top-N CVEs by current EPSS score)',
          securityOSVById: '/api/security/osv/{advisory-id} (free; lookup OSV.dev advisory by GHSA / CVE / PYSEC / RUSTSEC / etc id, lazy-fetched and cached 24h. License: Apache-2.0; attribution preserved on every response)',
          securityOSVPackage: '/api/security/osv/package?ecosystem=&name=&version= (free; OSV.dev advisories affecting one package version. Ecosystems: PyPI, npm, Go, crates.io, Maven, NuGet, RubyGems, Packagist, Hex, Pub, Hackage, Linux, etc)',
          securityOSVEcosystems: '/api/security/osv/ecosystems (free; supported OSV ecosystem identifiers)',
          securityVulnrichment: '/api/security/vulnrichment/{CVE-id} (free; CISA Vulnrichment enrichment for one CVE - CWE mappings, CVSS, exploitation evidence, KEV cross-refs - lazy-fetched from cisagov/vulnrichment, cached 7d. License: US Gov public domain. Pair with /api/security/cve/{id} for the MITRE record)',
          securityAiSupplyChainIocs: '/api/security/ai-supply-chain-iocs.json (free; daily-refreshed feed of publicly-disclosed malicious npm + PyPI packages relevant to AI / MCP / LLM operators. Each entry cites its primary source (GHSA). Posture: republish + cite; TF does not detect, attribute, or actively scan. License: GitHub ToS + TF attribution; primary source authority always wins)',
          freeTrialStatus: `/api/free-tier/status (free; self-service quota check. Returns the caller IP\'s current premium-trial state: used today, remaining today, resets_at. Each IP gets ${FREE_TRIAL_DEFAULTS.LIMIT_PER_DAY} free premium API calls per 24h rolling window, no auth required, applied to every /api/premium/* endpoint. Excess returns canonical x402 V2 challenge)`,
          wantlistGet: `/api/wantlist (free, GET; aggregated AI-agent wantlist. Returns the most-recent ${WANTLIST_DEFAULTS.INDEX_CAP}-item rolling window of submissions, top topics by count, and request-type breakdown. Items expire after ${WANTLIST_DEFAULTS.ITEM_TTL_SECONDS / 86400}d. Pass ?recent=N to control how many items are hydrated, capped at 100)`,
          wantlistPost: `/api/wantlist (free, POST; submit what data you wish TF served. JSON body: { topic, request_type, description, contact_optional }. request_type one of: ${WANTLIST_DEFAULTS.REQUEST_TYPE_VALUES.join(', ')}. Rate-limited to ${WANTLIST_DEFAULTS.RL_PER_IP_PER_DAY} submissions per IP per 24h. Anonymous by default. Patterns inform pipeline priorities)`,
          freeWatchesCreate: `/api/watches/free (free, POST; register a webhook subscription to a watch spec without paying credits. Body: { spec, callback_url, secret?, fire_cap? }. ${FREE_PER_IP_WATCH_CAP} watches per IP, ${FREE_FIRE_CAP} fires per watch, ${FREE_WATCH_TTL_SECONDS / 86400}-day TTL. Same delivery infrastructure as paid /api/premium/watches: HMAC-signed POST to callback_url when the spec fires. Spec types: price, status, digest, leaderboard_rank, macro_indicator (see /api/premium/watches docs for shapes))`,
          freeWatchesList: `/api/watches/free (free, GET; list watches for the caller IP)`,
          freeWatchesItem: `/api/watches/free/{id} (free, GET|DELETE; manage a watch from the same IP that created it)`,
          premiumDecisionVerified: '/api/premium/news/decision-verified?cluster_id=&date= (1 credit; structured verification scores for a single corroboration cluster: verification_tier (single|limited|moderately-corroborated|broadly-verified|widely-reported), source_diversity_score, time_span_hours, per-source breakdown, AFTA-signed receipt over the source set. Pair with /api/history/news/clusters?date= to discover cluster_ids)',
          premiumDecisionVerifiedSearch: '/api/premium/news/decision-verified/search?q=&since=&until=&min_sources=1-50&limit=1-100 (1 credit; search recent days for clusters whose hero title matches q (substring + token-overlap), filtered by min_sources, sorted by match score then source count. Default lookback 30 days; max 90)',
          secEdgarSearch: '/api/sec/edgar/search?q=&forms=10-K,10-Q,8-K&from=YYYY-MM-DD&to=YYYY-MM-DD&limit=1-50&page=1-100 (free; SEC EDGAR full-text search across the entire filings corpus since 1990s. License: US Gov public domain. Pair with /api/sec/company-tickers for ticker-to-CIK lookup)',
          secEdgarSubmissions: '/api/sec/edgar/submissions/{cik} (free; recent filings + entity metadata for one CIK. Accepts numeric CIK in any zero-padding form, or CIK0000320193 prefixed form)',
          climatePowerDaily: '/api/climate/power/daily?latitude=&longitude=&parameters=&start=YYYYMMDD&end=YYYYMMDD&community=AG|RE|SB (free; NASA POWER daily meteorological + solar data for one point. License: open access US Gov public domain. Range capped at 365 days)',
          climatePowerParameters: '/api/climate/power/parameters (free; curated NASA POWER parameter catalog with units and longnames)',
          climateEarthquakes: '/api/climate/earthquakes?magnitude=significant|4.5|2.5|1.0|all&period=hour|day|week|month&limit=1-500 (free; USGS Earthquake Hazards Program pre-built summary feeds. License: US Gov public domain. Returns flattened earthquake list with id, magnitude, place, time, depth, lat/lon, tsunami flag, USGS detail URL. Cache TTL scales with feed window)',
          climateWeatherAlerts: '/api/climate/weather-alerts?area=US-state-code&event=NWS-event-name&severity=Extreme|Severe|Moderate|Minor|Unknown&urgency=Immediate|Expected|Future|Past|Unknown&status=actual|exercise|system|test|draft&limit=1-500 (free; NWS Active Weather Alerts. US-only coverage. License: US Gov public domain. Returns flattened alerts list with id, event, severity, urgency, headline, description, areaDesc, sent/effective/expires/ends, sender_name, web URL. 60s cache TTL since active-alert state changes minute by minute)',
          mcpHttp: '/api/mcp (free; hosted MCP Streamable HTTP transport, JSON-RPC 2.0 over POST. Compatible with Anthropic Claude Code, vertical agent repos, claude.ai connectors, and other MCP-compliant clients. GET returns discovery info; POST expects JSON-RPC envelope. ~12 tools in V1: news, status, models, MITRE CVE, CISA KEV, EPSS, OSV.dev, SEC EDGAR search + submissions + ticker lookup, EIA series)',
          healthFDADrugEvents: '/api/health/fda/drug/events?search=&limit=1-100&skip=&sort= (free; FDA Adverse Event Reporting System (FAERS), 10M+ records. License: CC0)',
          healthFDADrugLabels: '/api/health/fda/drug/labels?search=&limit=1-100&skip=&sort= (free; structured drug labels in SPL format)',
          healthFDADrugRecalls: '/api/health/fda/drug/recalls?search=&limit=1-100&skip=&sort= (free; FDA drug enforcement reports / recalls)',
          healthFDAFoodRecalls: '/api/health/fda/food/recalls?search=&limit=1-100&skip=&sort= (free; FDA food enforcement reports / recalls)',
          healthFDADeviceEvents: '/api/health/fda/device/events?search=&limit=1-100&skip=&sort= (free; FDA MAUDE device adverse events)',
          healthFDACategories: '/api/health/fda/categories (free; directory of supported openFDA categories with descriptions)',
          economyEIASeries: '/api/economy/eia/series?route=&frequency=&start=&end=&length=1-5000&data=value (free; EIA Open Data series. Routes: petroleum/pri/spt, petroleum/pri/gnd, natural-gas/pri/sum, electricity/retail-sales, electricity/electric-power-operational-data, total-energy. License: US Gov public domain)',
          economyEIACategories: '/api/economy/eia/categories (free; curated EIA route catalog with descriptions and example filters)',
          statusLeaderboard: '/api/status/leaderboard?days=1-7 (free, 7-day cap; cross-provider uptime ranking, minute-resolution counters)',
          uptimeBadge: '/api/badge/uptime/{slug} (free SVG; embeddable shields.io-style uptime badge for any monitored provider; 7-day rolling)',
          uptimeSeries: '/api/uptime/series?provider={slug}&days=1-7 (free, 7-day cap; daily uptime breakdown for a single provider)',
          mcpRegistrySnapshot: '/api/mcp/registry/snapshot',
          x402RegistrySnapshot: '/api/x402-registry/snapshot (free; live index of x402-compatible publishers, crawled daily from each domain\'s /.well-known/x402 manifest. Each entry carries status, x402 version, publisher metadata, paid + free endpoint counts, payment wallet, accepts summary, and an AFTA federation flag. Inclusion is not an endorsement; agents must verify wallets on-chain.)',
          papersAiTrending: '/api/papers/ai-trending',
          papersArxivRecent: '/api/papers/arxiv-recent',
          hfTrending: '/api/hf/trending',
          hfLeaderboard: '/api/hf-leaderboard/latest?limit=50&min_average= (free; daily snapshot of the Hugging Face Open LLM Leaderboard v2: rank, model_id, params_b, precision, license, base_model, type, average, IFEval/BBH/MATH-Lvl-5/GPQA/MUSR/MMLU-PRO scores. Captured at 04:45 UTC from the open-llm-leaderboard/contents dataset, CC-BY-SA.)',
          issuesHot: '/api/issues/hot',
          redditTrending: '/api/reddit/trending',
          openrouterModels: '/api/openrouter/models',
          papersHFDaily: '/api/papers/hf-daily',
          today: '/api/today (composite morning brief, optional ?sections=news,papers,hf,community,inference,status&limit=1-10)',
          probeLatest: '/api/probe/latest',
          gpuPricing: '/api/gpu/pricing',
          gpuPricingCheapest: '/api/gpu/pricing/cheapest?gpu=H100&type=on_demand|spot',
          sports: '/api/sports (league directory; nfl live, nba/mlb/nhl planned)',
          sportsNflTeams: '/api/sports/nfl/teams?conference=AFC|NFC&division=East|North|South|West',
          sportsNflTeamItem: '/api/sports/nfl/teams/{id} (e.g. sf, kc, nyj)',
          sportsNflNews: '/api/sports/nfl/news?limit=&team= (RSS-aggregated, 200-char snippet + link)',
          sportsMlbTeams: '/api/sports/mlb/teams?league=AL|NL&division=East|Central|West',
          sportsMlbTeamItem: '/api/sports/mlb/teams/{id} (e.g. nyy, lad, sf)',
          sportsMlbNews: '/api/sports/mlb/news?limit=&team= (RSS-aggregated, 200-char snippet + link)',
          sportsNflPlayers: '/api/sports/nfl/players?team=&position=&status=&q=&limit= (nflverse CC-BY-4.0)',
          sportsNflPlayerItem: '/api/sports/nfl/players/{gsis_id} (e.g. 00-0036971)',
          sportsNflSchedule: '/api/sports/nfl/schedule?season=&week=&team=&limit= (nflverse CC-BY-4.0)',
          secCompanyTickers: '/api/sec/company-tickers?q=&ticker=&limit= (US SEC EDGAR public-domain ticker -> CIK -> company-name mapping; ~10k entries)',
          secCompanyTickerItem: '/api/sec/company-tickers/{ticker_or_cik} (e.g. AAPL, 320193, 0000320193, CIK0000320193)',
          npmAITrending: '/api/packages/npm/ai-trending?category=llm-sdk|agent-framework|rag|inference|evals|tooling|mcp&limit= (curated, weekly downloads via api.npmjs.org)',
          pypiAITrending: '/api/packages/pypi/ai-trending?category=llm-sdk|agent-framework|rag|inference|evals|observability|tooling|mcp&limit= (curated, monthly downloads via pypistats.org / Linehaul / PyPI BigQuery public dataset)',
          researchInstitutionsAI: '/api/research/institutions/ai?country=&type=&limit= (OpenAlex CC0; top institutions by AI-tagged publications, last 365 days)',
          economyBLSIndicators: '/api/economy/bls/indicators?category=inflation|employment|wages|labor-force|jolts (US Bureau of Labor Statistics, public domain; CPI, unemployment, payrolls, JOLTS, etc., 24-month history with MoM delta)',
          economyFREDIndicators: '/api/economy/fred/indicators?category=rates|gdp|money|housing|fx|commodities (Federal Reserve Economic Data, public domain; fed funds, 10Y/2Y treasuries + spread, GDP, M2, mortgage rate, USD index, oil; native frequency per series)',
          policyAIRegistry: '/api/policy/ai/registry?jurisdiction=US-Federal|US-State|EU|UK|China|International&type=executive-order|statute|regulation|guidance|declaration|agency-action&status=active|phased|pending|rescinded|vetoed|proposed&scope=transparency|safety|high-risk|deepfakes|export-controls|...',
          fundingPortfolio: '/api/funding/portfolio?silicon_dependency=nvidia|tpu|trainium|mi400|maia|mixed&type=private-equity|public-equity|compute-commitment|capacity-partnership&from=&to=&since=&until= (free; hand-curated AI capital-commitment registry tagged with recipient silicon dependency. Sources: SEC filings, hyperscaler press releases, reputable trade reporting. Each entry carries source_urls. Returns summary aggregates by silicon dependency, type, and investor.)',
          premiumFundingExposure: '/api/premium/funding/exposure (1 credit; derived metrics over the free /api/funding/portfolio: silicon-vendor concentration shares, per-investor circular-loop classification (fully-circular / partial-loop / agnostic) using investor->silicon mapping for Nvidia/Google/Amazon/Microsoft/AMD, top recipients by inbound capital, co-investor pairs that both hold stakes in the same recipient.)',
          routingPreview: '/api/preview/routing',
          premiumRouting: '/api/premium/routing',
          premiumPricingSeries: '/api/premium/history/pricing/series?model=&from=&to=',
          premiumBenchmarkSeries: '/api/premium/history/benchmarks/series?model=&benchmark=&from=&to=',
          premiumStatusUptime: '/api/premium/history/status/uptime?provider=&from=&to=',
          premiumNewsHistoryFull: '/api/premium/history/news/full?date= or ?from=&to= (1 credit; full untruncated daily news snapshots, single-date or range up to 30 days)',
          premiumNewsSourceHealth: '/api/premium/history/news/source-health?from=&to= (1 credit; per-source RSS reliability series up to 90 days)',
          premiumSecurityCVERange: '/api/premium/security/cve/range?from=&to= (1 credit; CVE IDs added across a UTC date range, max 30 days)',
          premiumSecurityKEVFull: '/api/premium/security/kev/full (1 credit; full untruncated CISA KEV catalog ~1500+ entries)',
          premiumSecurityKEVSeries: '/api/premium/security/kev/series?from=&to= (1 credit; daily KEV catalog additions across a date range, max 90 days)',
          premiumSecurityEPSSSeries: '/api/premium/security/epss/series?cve_id= (1 credit; full historical EPSS time-series for one CVE)',
          premiumSecurityEPSSTop: '/api/premium/security/epss/top?date=&limit=1-100 (1 credit; top-N highest-EPSS CVEs as of any UTC date)',
          premiumClimatePowerHourly: '/api/premium/climate/power/hourly?latitude=&longitude=&parameters=&start=YYYYMMDD&end=YYYYMMDD&community=AG|RE|SB (1 credit; NASA POWER hourly-resolution meteorological + solar data for one point; range capped at 30 days)',
          premiumHealthFDAAggregate: '/api/premium/health/fda/aggregate?category=&count_by=&search=&limit=1-1000 (1 credit; histogram-by-field across openFDA records, e.g. top drugs by adverse event count)',
          premiumCleanCVE: '/api/premium/clean/cve/{CVE-id} (1 credit; LLM-ready CVE record: ~80% token reduction vs raw MITRE v5.2, with derived severity_band, deduped CWEs, flat affected_products, top references)',
          premiumCleanKEV: '/api/premium/clean/kev/{CVE-id} (1 credit; LLM-ready KEV entry with normalized ransomware_use enum and extracted notes_urls)',
          premiumCleanEPSS: '/api/premium/clean/epss/{CVE-id}?series=true|false (1 credit; LLM-ready EPSS score with derived risk_band; optional series=true returns first/min/max summary instead of full series)',
          premiumCleanPowerDaily: '/api/premium/clean/power/daily?latitude=&longitude=&parameters=&start=YYYYMMDD&end=YYYYMMDD&community=AG|RE|SB (1 credit; NASA POWER pivoted into date-keyed rows with -999 fill values normalized to null and ISO-8601 dates)',
          premiumCleanEIASeries: '/api/premium/clean/eia/series?route=&frequency=&start=&end=&length=1-5000 (1 credit; EIA series flattened to numeric points with MoM and YoY delta percentages computed against valid observations)',
          premiumCleanFDA: '/api/premium/clean/fda/{category}?search=&limit=1-100&skip=&sort= (1 credit; LLM-ready OpenFDA query results. Per-category flat schema for drug/events, drug/labels, drug/recalls, food/recalls, device/events)',
          premiumSecurityVerifiedCVE: '/api/premium/security/verified/{CVE-id} (1 credit; cross-database CVE verification: composes MITRE CVE + CISA KEV + FIRST.org EPSS + OSV.dev + CISA Vulnrichment into one fact card with confirmed_by array and corroboration_count. The single-call anti-hallucination lookup for security agents)',
          premiumCleanOpenRouter: '/api/premium/clean/openrouter/{model_id} (1 credit; one model from the daily 367-entry OpenRouter catalog as an LLM-ready fact card. Pricing normalized to USD per million tokens with derived blended_5_to_1 mix. Capability flags (tools/vision/structured_outputs/reasoning) extracted from supported_parameters + modality. Compression headline: ~270KB catalog -> ~500B card)',
          premiumHistoryNewsClustersFull: '/api/premium/history/news/clusters/full?date= or ?from=&to= (1 credit; full untruncated cross-source story clusters, single-date or 30-day range)',
          premiumHistoryNewsVerified: '/api/premium/history/news/verified?date= or ?from=&to=&min_sources=2-50 (1 credit; the verified feed - story clusters with N+ independent sources corroborating; default min_sources=4)',
          premiumStatusLeaderboard: '/api/premium/status/leaderboard?from=&to= (1 credit; full date range, includes incident_count + mttr_minutes per provider)',
          premiumWatchesCreate: 'POST /api/premium/watches (1 credit per registration)',
          premiumWatchesList: 'GET /api/premium/watches',
          premiumWatchesItem: 'GET|DELETE /api/premium/watches/{id}',
          premiumAgentsDirectory: '/api/premium/agents/directory?category=&status=&open_source=&capability=&sort=&limit=',
          premiumNewsSearch: '/api/premium/news/search?q=&from=&to=&provider=&category=&limit=',
          vrNews: '/api/vr/news?category=&limit= (free; sourced from vr.org)',
          vrOriginals: '/api/vr/originals?limit= (free; VR.org Original editorial)',
          aftaAdopters: '/api/afta/adopters (free; machine-readable AFTA adopter directory; not authoritative)',
          premiumCostProjection: '/api/premium/cost/projection?model=opus-4-7,gpt-5-5&input_tokens_per_day=&output_tokens_per_day=&horizon=monthly',
          premiumProviderDeepDive: '/api/premium/providers/{name}',
          premiumCompareModels: '/api/premium/compare/models?ids=opus-4-7,gpt-5-5,gemini-3',
          premiumWhatsNew: '/api/premium/whats-new?days=1&news_limit=10',
          premiumMacroDigest: '/api/premium/macro/digest (1 credit; BLS + FRED joined morning brief with yield-curve, inflation, employment regime classification + headlines)',
          premiumPolicyTimeline: '/api/premium/policy/timeline?days_back=&days_forward=&jurisdiction= (1 credit; forward + backward calendar over the AI policy registry with relative-to-now classification, next-3-milestones, days-until-effective per entry)',
          premiumEconomySeriesHistory: '/api/premium/economy/series/{bls|fred}/{series_id} (1 credit; full upstream history with YoY paired series, 3-month and 12-month moving averages, min/max, trend direction. Free /api/economy/* caps at 24 or 90 obs; this is the full archive plus compute.)',
          premiumPackagesPyPIMomentum: '/api/premium/packages/pypi/momentum (1 credit; momentum + velocity ratio per AI/ML PyPI package over the free trending snapshot, with direction classification, notable-movers, by-category counts. npm momentum follows once rolling snapshot history accumulates.)',
          premiumResearchVelocity: '/api/premium/research/velocity (1 credit; per-institution velocity over the OpenAlex 365-day baseline + fresh 30-day window, with direction classification, notable-movers, by-country and by-type breakdowns)',
          premiumResearchMilestones: '/api/premium/research/milestones (1 credit; last 30 days of arXiv preprints flagged is_milestone_candidate by an offline Qwen 3.6 27B per-paper extraction pass. Each paper carries structured reasoning stating the named benchmark + quantified delta, model release, or novel architecture justification. Conservative; false positives are worse than false negatives.)',
          premiumResearchEmergingKeywords: '/api/premium/research/emerging-keywords (1 credit; top-50 multi-word keyphrases across recent arXiv abstracts ranked by recent-vs-baseline lift, last 30d frequency over prior 90d, smoothed. Each entry carries 2-5 example arxiv_ids.)',
          premiumResearchTopicSearch: '/api/premium/research/topic-search?subfield_tag=&methodology_bucket=&since=&until=&milestone_only=&limit=&offset= (1 credit; structured search over the arXiv preprint corpus using TF derived taxonomy. Filters arXiv by subfield + methodology, dimensions arXiv\'s native search has no concept of.)',
          premiumResearchLabProductivity: '/api/premium/research/lab-productivity?window=&affiliation_type=&limit= (1 credit; top labs by paper count over 30d/90d/365d windows, derived from TF normalized affiliations on the offline Qwen extraction. Filter by window (30d|90d|365d, default returns all three) and affiliation_type (industry|academia|government|nonprofit|mixed). arXiv has no native concept of normalized lab attribution.)',
          premiumRecessionWatch: '/api/premium/economy/recession-watch (1 credit; composite recession-risk signal across yield-curve inversion + Sahm rule, with red/yellow/green classification per signal and a composite verdict)',
          premiumMcpRegistrySeries: '/api/premium/mcp/registry/series?from=&to=',
          premiumProbeSeries: '/api/premium/probe/series?provider=&from=&to=',
          gpuPricingSeries: '/api/gpu/pricing/series?gpu=&from=&to= (moved from premium 2026-05-06)',
          premiumAttentionSeries: '/api/premium/attention/series?provider=&from=&to=',
          paymentInfo: '/api/payment/info',
          paymentPacks: '/api/payment/packs',
          aftaCertifyCheck: '/api/afta-certify/check?domain=',
          dataLicensing: '/api/data-licensing',
          professionalServices: '/api/services',
          mcpProTier: '/api/mcp/pro-tier',
          paymentBuyCredits: '/api/payment/buy-credits',
          paymentConfirm: '/api/payment/confirm',
          paymentBalance: '/api/payment/balance',
          paymentUsage: '/api/payment/usage',
          paymentHistory: '/api/payment/history',
          paymentSpendCap: '/api/payment/spend-cap (GET reads, POST sets)',
          paymentRevoke: 'POST /api/payment/revoke',
          paymentNoChargeStats: '/api/payment/no-charge-stats',
          receiptVerify: '/api/receipt/verify',
        },
        admin: {
          usage: '/api/admin/usage?date=YYYY-MM-DD&key=<ADMIN_KEY>',
          usageDates: '/api/admin/usage/dates?key=<ADMIN_KEY>',
          burnToken: '/api/admin/burn-token?token=tf_live_...&key=<ADMIN_KEY>',
          anomalies: '/api/admin/anomalies?key=<ADMIN_KEY>&severity=warning|critical',
          killSwitch: '/api/admin/kill-switch?key=<ADMIN_KEY> (GET = status + audit; POST&action=on|off to flip the runtime KV-flag side. Env-secret side via wrangler secret put KILL_SWITCH_KV_WRITES.)',
          refresh: '/api/refresh?key=<ADMIN_KEY>[&task=history|mcp-registry|papers|arxiv|hf|hf-leaderboard|hot-issues|reddit|openrouter|hf-daily-papers|probe|probe-rollup|fred|bls|npm-ai|pypi-ai|openalex|nflverse|sports-news|opportunities|ai-supply-chain-iocs]',
        },
        chaos_engineering: {
          description: 'Free, no-auth headers for testing agent fallback logic against simulated failures. No credits charged for simulated errors.',
          headers: {
            simulate_error: 'X-TensorFeed-Simulate-Error: <400-599> (returns the requested status code immediately)',
            simulate_latency: 'X-TensorFeed-Simulate-Latency: <ms> (sleeps before normal response, capped at 10000ms)',
          },
          response_marker: 'X-TensorFeed-Simulated: true',
          stats_endpoint: '/api/chaos/stats (free, public, edge-cached 30s; per-UTC-day count of simulated responses by status code, lets dashboards subtract synthetic from real 5xx)',
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
          no_charge_guarantees: ['5xx', 'circuit_breaker', 'schema_validation_failure', 'upstream_failure', 'stale_data'],
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
          supportive_sites: {
            description: 'Sites that contribute upstream data to the network without running an AFTA-compliant API of their own. TensorFeed pulls from their public endpoints and re-exposes the data through TF-side AFTA-compliant endpoints; payments and credits flow through TF\'s host ledger.',
            sites: [
              {
                site: 'vr.org',
                role: 'data_partner',
                vertical: 'VR / AR / XR news + original editorial',
                contributes_to: [
                  '/api/vr/news',
                  '/api/vr/originals',
                ],
                upstream_endpoints: [
                  'https://vr.org/api/feed',
                  'https://vr.org/api/articles',
                ],
                refresh_cadence: 'TF pulls hourly via cron; vr.org refreshes every 15 min upstream',
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

    // === FREE NEWS HISTORY (single-day lookup, capped at 25 articles) ===
    // Single-date archive of the deduped article array as of the most
    // recent hourly RSS poll for that UTC day. Free tier surfaces a
    // 25-article slice to drive agent discovery; the premium endpoint
    // returns the full untruncated snapshot and supports date ranges.

    if (path === '/api/history/news') {
      const date = url.searchParams.get('date') ?? new Date().toISOString().slice(0, 10);
      if (!isISODate(date)) {
        return jsonResponse(
          { ok: false, error: 'invalid_date', hint: 'date must be YYYY-MM-DD' },
          400,
        );
      }
      const snapshot = await readNewsDaily(env, date);
      if (!snapshot) {
        return jsonResponse(
          {
            ok: false,
            error: 'not_found',
            date,
            hint: 'Daily snapshots accumulate going forward from 2026-05-08. Older dates may be unavailable.',
          },
          404,
        );
      }
      const requested = parseInt(url.searchParams.get('limit') ?? '25', 10);
      const limit = Math.max(1, Math.min(Number.isFinite(requested) ? requested : 25, 25));
      return jsonResponse(
        {
          ok: true,
          tier: 'free',
          date: snapshot.date,
          captured_at: snapshot.captured_at,
          articles_count: snapshot.articles_count,
          articles_returned: Math.min(snapshot.articles_count, limit),
          articles: snapshot.articles.slice(0, limit),
          premium: {
            endpoint: '/api/premium/history/news/full',
            credits_per_call: 1,
            note: 'Premium returns the full untruncated daily snapshot and supports date ranges (?from=&to=, max 30 days).',
          },
        },
        200,
        86400,
      );
    }

    // === FREE SOURCE HEALTH (single-day per-source reliability) ===

    if (path === '/api/history/news/sources') {
      const date = url.searchParams.get('date') ?? new Date().toISOString().slice(0, 10);
      if (!isISODate(date)) {
        return jsonResponse(
          { ok: false, error: 'invalid_date', hint: 'date must be YYYY-MM-DD' },
          400,
        );
      }
      const day = await readSourceHealth(env, date);
      if (!day) {
        return jsonResponse(
          {
            ok: false,
            error: 'not_found',
            date,
            hint: 'Source health rollups accumulate going forward from 2026-05-08.',
          },
          404,
        );
      }
      return jsonResponse(
        {
          ok: true,
          tier: 'free',
          date: day.date,
          updated_at: day.updated_at,
          total_polls: day.total_polls,
          sources_count: Object.keys(day.sources).length,
          sources: summarizeSourceHealth(day),
          premium: {
            endpoint: '/api/premium/history/news/source-health',
            credits_per_call: 1,
            note: 'Premium returns the same shape as a multi-day series (?from=&to=, max 90 days) for reliability trending.',
          },
        },
        200,
        3600,
      );
    }

    // === FREE HISTORY SERIES (7-day teaser) ===
    // Free time-series view over the daily history:* snapshots so agents
    // discover that TensorFeed has the data without paying first. The full
    // 90-day window stays behind /api/premium/history/{...}/series.

    if (path === '/api/history/pricing/series') {
      const model = url.searchParams.get('model')?.trim();
      if (!model) {
        return jsonResponse(
          {
            ok: false,
            error: 'model_required',
            hint: 'Pass ?model=<id-or-name>. Example: ?model=claude-sonnet-4&days=7',
          },
          400,
        );
      }
      const range = resolveFreeRange(
        url.searchParams.get('days'),
        url.searchParams.get('from'),
        url.searchParams.get('to'),
      );
      if (!range.ok) {
        return jsonResponse(
          {
            ok: false,
            error: range.error,
            limits: {
              max_range_days: FREE_MAX_RANGE_DAYS,
              default_range_days: FREE_DEFAULT_RANGE_DAYS,
            },
            premium: {
              endpoint: '/api/premium/history/pricing/series',
              max_range_days: MAX_RANGE_DAYS,
              docs: 'https://tensorfeed.ai/developers/agent-payments',
            },
          },
          400,
        );
      }
      const result = await getPricingSeries(env, model, range.from, range.to);
      return jsonResponse(
        {
          ...result,
          tier: 'free',
          premium: {
            endpoint: '/api/premium/history/pricing/series',
            max_range_days: MAX_RANGE_DAYS,
            credits_per_call: 1,
            note: 'Premium tier extends the window from 7 to 90 days and supports arbitrary from/to ranges.',
          },
        },
        200,
        3600,
      );
    }

    if (path === '/api/history/benchmarks/series') {
      const model = url.searchParams.get('model')?.trim();
      const benchmark = url.searchParams.get('benchmark')?.trim();
      if (!model || !benchmark) {
        return jsonResponse(
          {
            ok: false,
            error: 'model_and_benchmark_required',
            hint:
              'Pass ?model=<name>&benchmark=<key>. Example: ?model=claude-sonnet-4&benchmark=swe_bench&days=7',
          },
          400,
        );
      }
      const range = resolveFreeRange(
        url.searchParams.get('days'),
        url.searchParams.get('from'),
        url.searchParams.get('to'),
      );
      if (!range.ok) {
        return jsonResponse(
          {
            ok: false,
            error: range.error,
            limits: {
              max_range_days: FREE_MAX_RANGE_DAYS,
              default_range_days: FREE_DEFAULT_RANGE_DAYS,
            },
            premium: {
              endpoint: '/api/premium/history/benchmarks/series',
              max_range_days: MAX_RANGE_DAYS,
              docs: 'https://tensorfeed.ai/developers/agent-payments',
            },
          },
          400,
        );
      }
      const result = await getBenchmarkSeries(env, model, benchmark, range.from, range.to);
      return jsonResponse(
        {
          ...result,
          tier: 'free',
          premium: {
            endpoint: '/api/premium/history/benchmarks/series',
            max_range_days: MAX_RANGE_DAYS,
            credits_per_call: 1,
            note: 'Premium tier extends the window from 7 to 90 days and supports arbitrary from/to ranges.',
          },
        },
        200,
        3600,
      );
    }

    if (path === '/api/history/status/uptime') {
      const provider = url.searchParams.get('provider')?.trim();
      if (!provider) {
        return jsonResponse(
          {
            ok: false,
            error: 'provider_required',
            hint: 'Pass ?provider=<name>. Example: ?provider=anthropic&days=7',
          },
          400,
        );
      }
      const range = resolveFreeRange(
        url.searchParams.get('days'),
        url.searchParams.get('from'),
        url.searchParams.get('to'),
      );
      if (!range.ok) {
        return jsonResponse(
          {
            ok: false,
            error: range.error,
            limits: {
              max_range_days: FREE_MAX_RANGE_DAYS,
              default_range_days: FREE_DEFAULT_RANGE_DAYS,
            },
            premium: {
              endpoint: '/api/premium/history/status/uptime',
              max_range_days: MAX_RANGE_DAYS,
              docs: 'https://tensorfeed.ai/developers/agent-payments',
            },
          },
          400,
        );
      }
      const result = await getStatusUptime(env, provider, range.from, range.to);
      return jsonResponse(
        {
          ...result,
          tier: 'free',
          premium: {
            endpoint: '/api/premium/history/status/uptime',
            max_range_days: MAX_RANGE_DAYS,
            credits_per_call: 1,
            note: 'Premium tier extends the window from 7 to 90 days and supports arbitrary from/to ranges.',
          },
        },
        200,
        3600,
      );
    }

    // === STATUS LEADERBOARD (free, 7-day cap) ===
    // Cross-provider uptime ranking computed from minute-resolution counters
    // (every poll cycle increments per-provider counters, ~720 samples per
    // provider per day at our 2-min cadence). Returns providers ranked by
    // uptime % DESC with downtime_minutes derived from poll counts.
    // Premium tier extends the window to 90 days and adds incident_count
    // plus mttr_minutes per provider.
    if (path === '/api/status/leaderboard') {
      const daysRaw = url.searchParams.get('days');
      const daysParsed = daysRaw ? parseInt(daysRaw, 10) : FREE_DEFAULT_RANGE_DAYS;
      if (Number.isNaN(daysParsed) || daysParsed < 1) {
        return jsonResponse(
          {
            ok: false,
            error: 'invalid_days',
            hint: `Pass ?days=1..${FREE_MAX_RANGE_DAYS}. Default ${FREE_DEFAULT_RANGE_DAYS}.`,
          },
          400,
        );
      }
      const days = Math.min(daysParsed, FREE_MAX_RANGE_DAYS);
      const { from, to } = resolveLastNDays(days);
      const result = await computeLeaderboard(env, from, to);
      return jsonResponse(
        {
          ...result,
          tier: 'free',
          premium: {
            endpoint: '/api/premium/status/leaderboard',
            max_range_days: MAX_RANGE_DAYS,
            credits_per_call: 1,
            note: 'Premium extends the window from 7 to 90 days and adds incident_count + mttr_minutes (mean time to recover) per provider.',
          },
        },
        200,
        // 5-minute cache: leaderboard is stable on short timescales but we
        // want it to reflect new poll cycles within a freshness window users
        // would consider "live."
        300,
      );
    }

    // === PER-PROVIDER UPTIME SERIES (free, 7-day cap) ===
    // Daily breakdown of operational/degraded/down/unknown polls for one
    // provider across a date range. Computed from the same minute-resolution
    // counters that power the cross-provider leaderboard, but sliced
    // single-provider-style for charting on /uptime/{slug} pages and
    // direct API consumption.
    if (path === '/api/uptime/series') {
      const slug = url.searchParams.get('provider')?.trim();
      if (!slug) {
        return jsonResponse(
          {
            ok: false,
            error: 'provider_required',
            hint: 'Pass ?provider=<slug>. Example: ?provider=claude&days=7',
          },
          400,
        );
      }
      const provider = resolveProviderSlug(slug);
      if (!provider) {
        return jsonResponse(
          {
            ok: false,
            error: 'unknown_provider',
            hint: 'See /badges for the list of valid slugs.',
          },
          404,
        );
      }
      const daysRaw = url.searchParams.get('days');
      const daysParsed = daysRaw ? parseInt(daysRaw, 10) : FREE_DEFAULT_RANGE_DAYS;
      if (Number.isNaN(daysParsed) || daysParsed < 1) {
        return jsonResponse(
          {
            ok: false,
            error: 'invalid_days',
            hint: `Pass ?days=1..${FREE_MAX_RANGE_DAYS}. Default ${FREE_DEFAULT_RANGE_DAYS}.`,
          },
          400,
        );
      }
      const days = Math.min(daysParsed, FREE_MAX_RANGE_DAYS);
      const { from, to } = resolveLastNDays(days);
      const result = await getProviderUptimeSeries(env, provider, from, to);
      return jsonResponse(
        {
          ...result,
          tier: 'free',
          premium: {
            endpoint: '/api/premium/status/leaderboard',
            note:
              'Premium leaderboard returns the same per-provider summary aggregated across all 20 providers, with up to 90-day windows + incident_count and mttr_minutes per provider.',
            credits_per_call: 1,
          },
        },
        200,
        300,
      );
    }

    // === UPTIME BADGES (free, embeddable) ===
    // SVG uptime badges per monitored provider. Free, edge-cached, designed
    // to be embedded in third-party READMEs/docs as a permanent backlink and
    // agent-discovery surface. Slugs map to STATUS_PAGES names with common
    // search-term aliases (claude, openai, gemini, bedrock, azure, etc).
    // Optional ?label= overrides the left-side label text.
    //
    //   <img src="https://tensorfeed.ai/api/badge/uptime/claude" alt="Claude uptime"/>
    //
    // 7-day uptime % from the leaderboard counters, with shields.io-style
    // color thresholds (green >=99.9%, lighter green >=99%, yellow >=95%,
    // orange >=90%, red below). Cached 5 min at the edge to match the
    // leaderboard's natural data freshness.
    if (path.startsWith('/api/badge/uptime/')) {
      const slug = path.slice('/api/badge/uptime/'.length).replace(/\.svg$/, '');
      if (!slug) {
        return jsonResponse({ ok: false, error: 'provider_required' }, 400);
      }
      if (!resolveProviderSlug(slug)) {
        return jsonResponse(
          {
            ok: false,
            error: 'unknown_provider',
            hint: 'See /api/status for the list of monitored providers, or /badges for documented slugs.',
          },
          404,
        );
      }
      const customLabel = url.searchParams.get('label') ?? undefined;
      const badge = await generateUptimeBadge(env, slug, customLabel);
      if (!badge) {
        return jsonResponse({ ok: false, error: 'badge_unavailable' }, 503);
      }
      const ifNoneMatch = request.headers.get('If-None-Match');
      if (ifNoneMatch && ifNoneMatch === badge.etag) {
        return new Response(null, { status: 304 });
      }
      return new Response(badge.svg, {
        status: badge.status,
        headers: {
          'Content-Type': 'image/svg+xml; charset=utf-8',
          'Cache-Control': 'public, max-age=300, s-maxage=300',
          'CDN-Cache-Control': 'public, max-age=300',
          ETag: badge.etag,
          'Access-Control-Allow-Origin': '*',
        },
      });
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

    // === x402 PUBLISHER REGISTRY (free) ===
    // Live index of x402-compatible publishers, crawled daily from each
    // domain's /.well-known/x402 manifest. Free, no auth. Powers the
    // /x402-registry web view.
    if (path === '/api/x402-registry/snapshot') {
      const snapshot = await getLatestX402Registry(env);
      if (!snapshot) {
        return jsonResponse({ ok: false, error: 'registry_not_yet_populated', hint: 'Daily crawl runs at 02:15 UTC; check back after the next cycle.' }, 503);
      }
      return jsonResponse({ ok: true, ...snapshot }, 200, 1800);
    }

    // === SPORTS / NFL (free) ===
    // V1: league directory, 32-team factual catalog, RSS-aggregated news.
    // Players, schedule, stats, and injuries land in V2 from nflverse-data
    // (CC-BY-4.0). News follows the same fair-use pattern as the AI news
    // layer: title + 200-char snippet + mandatory link to the source.

    if (path === '/api/sports' || path === '/api/sports/leagues') {
      return jsonResponse(
        { ok: true, leagues: SUPPORTED_LEAGUES },
        200,
        3600,
      );
    }

    if (path === '/api/sports/nfl/teams') {
      const conference = url.searchParams.get('conference')?.toUpperCase();
      const division = url.searchParams.get('division');
      let teams = NFL_TEAMS;
      if (conference === 'AFC' || conference === 'NFC') {
        teams = teams.filter(t => t.conference === conference);
      }
      if (division) {
        const divNorm = division.charAt(0).toUpperCase() + division.slice(1).toLowerCase();
        teams = teams.filter(t => t.division === divNorm);
      }
      return jsonResponse(
        { ok: true, count: teams.length, teams },
        200,
        86400,
      );
    }

    {
      const teamMatch = path.match(/^\/api\/sports\/nfl\/teams\/([^/]+)$/);
      if (teamMatch) {
        const team = getNFLTeam(decodeURIComponent(teamMatch[1]));
        if (!team) {
          return jsonResponse(
            {
              ok: false,
              error: 'team_not_found',
              hint: 'Use /api/sports/nfl/teams to list valid IDs (lowercase abbreviation, e.g. "sf", "kc", "nyj").',
            },
            404,
          );
        }
        return jsonResponse({ ok: true, team }, 200, 86400);
      }
    }

    // === SPORTS / MLB (free, V1) ===
    // 30-team factual catalog plus hourly RSS news. Mirrors the NFL V1
    // pattern. Lahman + Retrosheet integration (V2) is on the roadmap.

    if (path === '/api/sports/mlb/teams') {
      const league = url.searchParams.get('league')?.toUpperCase();
      const division = url.searchParams.get('division');
      let teams = MLB_TEAMS;
      if (league === 'AL' || league === 'NL') {
        teams = teams.filter(t => t.league === league);
      }
      if (division) {
        const divNorm = division.charAt(0).toUpperCase() + division.slice(1).toLowerCase();
        teams = teams.filter(t => t.division === divNorm);
      }
      return jsonResponse({ ok: true, count: teams.length, teams }, 200, 86400);
    }

    {
      const teamMatch = path.match(/^\/api\/sports\/mlb\/teams\/([^/]+)$/);
      if (teamMatch) {
        const team = getMLBTeam(decodeURIComponent(teamMatch[1]));
        if (!team) {
          return jsonResponse({
            ok: false,
            error: 'team_not_found',
            hint: 'Use /api/sports/mlb/teams to list valid IDs (lowercase abbreviation, e.g. "sf", "nyy", "lad").',
          }, 404);
        }
        return jsonResponse({ ok: true, team }, 200, 86400);
      }
    }

    if (path === '/api/sports/mlb/news') {
      const limit = parseInt(url.searchParams.get('limit') || '25', 10);
      const teamParam = url.searchParams.get('team') || undefined;
      const result = await readMLBNews(env, {
        limit: Number.isFinite(limit) ? limit : 25,
        team: teamParam,
      });
      return jsonResponse(result, 200, 600);
    }

    if (path === '/api/sports/nfl/news') {
      const limit = parseInt(url.searchParams.get('limit') || '25', 10);
      const teamParam = url.searchParams.get('team') || undefined;
      const result = await readNFLNews(env, {
        limit: Number.isFinite(limit) ? limit : 25,
        team: teamParam,
      });
      return jsonResponse(result, 200, 600);
    }

    // === SPORTS / NFL: nflverse-derived endpoints (free, V2) ===
    // Players + schedule sourced from nflverse-data (CC-BY-4.0). Daily
    // ingest at 06:00 UTC parses CSV releases, downsamples, and writes
    // to KV. Attribution shipped on every response shape.

    if (path === '/api/sports/nfl/players') {
      const limit = parseInt(url.searchParams.get('limit') || '100', 10);
      const result = await readNFLPlayers(env, {
        team: url.searchParams.get('team') || undefined,
        position: url.searchParams.get('position') || undefined,
        status: url.searchParams.get('status') || undefined,
        q: url.searchParams.get('q') || undefined,
        limit: Number.isFinite(limit) ? limit : 100,
      });
      return jsonResponse(result, 200, 3600);
    }

    {
      const playerMatch = path.match(/^\/api\/sports\/nfl\/players\/([^/]+)$/);
      if (playerMatch) {
        const result = await readNFLPlayer(env, decodeURIComponent(playerMatch[1]));
        if (!result.ok) {
          return jsonResponse(
            {
              ok: false,
              error: result.error,
              hint:
                'Pass the gsis_id (NFL player identifier, e.g. 00-0036971). Use /api/sports/nfl/players?q=mahomes to search by name.',
            },
            404,
          );
        }
        return jsonResponse(result, 200, 3600);
      }
    }

    // === SEC COMPANY TICKERS (free) ===
    // Public-domain ticker -> CIK -> company-name mapping from
    // data.sec.gov/files/company_tickers.json. ~10k entries covering all
    // SEC-registered publicly-traded companies. Daily refresh at 04:15 UTC.
    // Powers grounding lookups for finance agents (ticker -> CIK before
    // hitting EDGAR filings or XBRL fundamentals).

    if (path === '/api/sec/company-tickers') {
      const limit = parseInt(url.searchParams.get('limit') || '100', 10);
      const result = await readSECTickers(env, {
        q: url.searchParams.get('q') || undefined,
        ticker: url.searchParams.get('ticker') || undefined,
        limit: Number.isFinite(limit) ? limit : 100,
      });
      return jsonResponse(result, 200, 3600);
    }

    {
      const tickerMatch = path.match(/^\/api\/sec\/company-tickers\/([^/]+)$/);
      if (tickerMatch) {
        const result = await readSECTicker(env, decodeURIComponent(tickerMatch[1]));
        if (!result.ok) {
          return jsonResponse(
            {
              ok: false,
              error: result.error,
              hint:
                'Pass a ticker symbol (e.g. AAPL) or CIK in any form (320193, 0000320193, CIK0000320193). Use /api/sec/company-tickers?q=apple to search by company name.',
            },
            404,
          );
        }
        return jsonResponse(result, 200, 3600);
      }
    }

    // === NPM AI/ML PACKAGE TRENDING (free) ===
    // Daily snapshot of weekly downloads for a curated list of AI-relevant
    // npm packages, ranked globally and per-category. Source: documented
    // public npm downloads API (api.npmjs.org/downloads). Refresh runs at
    // 03:30 UTC; /api/packages/npm/ai-trending serves the snapshot.

    // === AI POLICY REGISTRY (free) ===
    // Editorial catalog of significant AI policy actions: executive
    // orders, statutes, regulations, guidance, declarations across
    // US Federal, US State, EU, UK, China, International. Underlying
    // government publications are public-record / public-domain
    // depending on jurisdiction. The catalog itself is TF editorial.
    // Refreshed on redeploy (low cadence, hand-curated).

    if (path === '/api/policy/ai/registry') {
      const result = readPolicyRegistry({
        jurisdiction: url.searchParams.get('jurisdiction') ?? undefined,
        type: url.searchParams.get('type') ?? undefined,
        status: url.searchParams.get('status') ?? undefined,
        scope: url.searchParams.get('scope') ?? undefined,
      });
      return jsonResponse(result, 200, 3600);
    }

    // === AI FUNDING PORTFOLIO REGISTRY (free) ===
    // Hand-curated catalog of disclosed AI capital commitments: equity
    // stakes, compute purchase commitments, capacity partnerships. Each
    // entry tagged with the recipient's primary silicon dependency so
    // an agent can analyze the customer-investor loop. Editorial; updated
    // on redeploy as new commitments hit the public record.

    if (path === '/api/funding/portfolio') {
      const result = readFundingRegistry({
        silicon_dependency: url.searchParams.get('silicon_dependency') ?? undefined,
        type: url.searchParams.get('type') ?? undefined,
        from: url.searchParams.get('from') ?? undefined,
        to: url.searchParams.get('to') ?? undefined,
        since: url.searchParams.get('since') ?? undefined,
        until: url.searchParams.get('until') ?? undefined,
      });
      return jsonResponse(result, 200, 3600);
    }

    // === FRED MACRO INDICATORS (free) ===
    // Federal Reserve Economic Data: rates (DFF, DGS10, DGS2, T10Y2Y),
    // GDP (GDP, GDPC1), money (M2SL), housing (MORTGAGE30US), FX
    // (DTWEXBGS), commodities (DCOILWTICO). Public-domain data.
    // Requires FRED_API_KEY Worker secret (free at fred.stlouisfed.org).
    // Daily refresh at 05:30 UTC.

    if (path === '/api/economy/fred/indicators') {
      const categoryParam = url.searchParams.get('category');
      if (categoryParam && !isValidFREDCategory(categoryParam)) {
        return jsonResponse({
          ok: false,
          error: 'invalid_category',
          valid: ['rates', 'gdp', 'money', 'housing', 'fx', 'commodities'],
        }, 400);
      }
      const validCategory = categoryParam && isValidFREDCategory(categoryParam) ? categoryParam : undefined;
      const result = await readFREDIndicators(env, { category: validCategory });
      if (!result) {
        return jsonResponse({
          ok: false,
          error: 'no_snapshot_yet',
          hint: 'FRED_API_KEY may not be configured (free registration at fred.stlouisfed.org/docs/api/api_key.html), or the daily refresh has not yet run since deploy. Refresh runs at 05:30 UTC.',
        }, 503);
      }
      return jsonResponse(result, 200, 1800);
    }

    // === BLS ECONOMIC INDICATORS (free) ===
    // Curated set of high-signal US BLS series (CPI, core CPI, PPI,
    // unemployment, payrolls, hourly earnings, weekly hours, labor
    // force participation, JOLTS openings + hires). Public domain US
    // government data. Daily refresh at 05:00 UTC, last 24 months
    // per series, MoM delta computed. Source citation in attribution.

    if (path === '/api/economy/bls/indicators') {
      const categoryParam = url.searchParams.get('category');
      if (categoryParam && !isValidBLSCategory(categoryParam)) {
        return jsonResponse({
          ok: false,
          error: 'invalid_category',
          valid: ['inflation', 'employment', 'wages', 'labor-force', 'jolts'],
        }, 400);
      }
      const validCategory = categoryParam && isValidBLSCategory(categoryParam) ? categoryParam : undefined;
      const result = await readBLSIndicators(env, { category: validCategory });
      if (!result) {
        return jsonResponse({
          ok: false,
          error: 'no_snapshot_yet',
          hint: 'Daily refresh runs at 05:00 UTC. After deploy, the first snapshot lands within 24 hours.',
        }, 503);
      }
      return jsonResponse(result, 200, 1800);
    }

    // === OPENALEX AI RESEARCH INSTITUTIONS (free) ===
    // Top academic + industrial institutions ranked by AI-tagged
    // publications over the last 365 days. Source: OpenAlex (CC0
    // public domain). Two API calls per cron tick (group_by works,
    // then enrich top-N institutions). Refresh runs at 04:00 UTC.

    if (path === '/api/research/institutions/ai') {
      const limitParam = url.searchParams.get('limit');
      const limit = limitParam ? parseInt(limitParam, 10) : undefined;
      const result = await readAIInstitutions(env, {
        country: url.searchParams.get('country') || undefined,
        type: url.searchParams.get('type') || undefined,
        limit: Number.isFinite(limit as number) ? limit : undefined,
      });
      if (!result) {
        return jsonResponse({
          ok: false,
          error: 'no_snapshot_yet',
          hint: 'Daily refresh runs at 04:00 UTC. After deploy, the first snapshot lands within 24 hours.',
        }, 503);
      }
      return jsonResponse(result, 200, 1800);
    }

    // === PYPI AI/ML PACKAGE TRENDING (free) ===
    // Sister to the npm endpoint. Curated AI-relevant PyPI packages
    // ranked by last-month downloads. Source: pypistats.org JSON API,
    // which serves aggregates derived from the public PyPI BigQuery
    // dataset (Linehaul project, PSF). Refresh runs at 03:45 UTC.

    if (path === '/api/packages/pypi/ai-trending') {
      const categoryParam = url.searchParams.get('category');
      const limitParam = url.searchParams.get('limit');
      const limit = limitParam ? parseInt(limitParam, 10) : undefined;

      if (categoryParam && !isValidPyPICategory(categoryParam)) {
        return jsonResponse({
          ok: false,
          error: 'invalid_category',
          valid: ['llm-sdk', 'agent-framework', 'rag', 'inference', 'evals', 'observability', 'tooling', 'mcp'],
        }, 400);
      }
      const validCategory = categoryParam && isValidPyPICategory(categoryParam) ? categoryParam : undefined;

      const result = await readPyPITrending(env, {
        category: validCategory,
        limit: Number.isFinite(limit as number) ? limit : undefined,
      });
      if (!result) {
        return jsonResponse({
          ok: false,
          error: 'no_snapshot_yet',
          hint: 'Daily refresh runs at 03:45 UTC. After deploy, the first snapshot may take up to 24 hours.',
        }, 503);
      }
      return jsonResponse(result, 200, 1800);
    }

    if (path === '/api/packages/npm/ai-trending') {
      const categoryParam = url.searchParams.get('category');
      const limitParam = url.searchParams.get('limit');
      const limit = limitParam ? parseInt(limitParam, 10) : undefined;

      if (categoryParam && !isValidNpmCategory(categoryParam)) {
        return jsonResponse({
          ok: false,
          error: 'invalid_category',
          valid: ['llm-sdk', 'agent-framework', 'rag', 'inference', 'evals', 'tooling', 'mcp'],
        }, 400);
      }
      const validCategory = categoryParam && isValidNpmCategory(categoryParam) ? categoryParam : undefined;

      const result = await readNpmTrending(env, {
        category: validCategory,
        limit: Number.isFinite(limit as number) ? limit : undefined,
      });
      if (!result) {
        return jsonResponse({
          ok: false,
          error: 'no_snapshot_yet',
          hint: 'Daily refresh runs at 03:30 UTC. After deploy, the first snapshot may take up to 24 hours unless triggered via the admin refresh hook.',
        }, 503);
      }
      return jsonResponse(result, 200, 1800);
    }

    if (path === '/api/sports/nfl/schedule') {
      const seasonParam = url.searchParams.get('season');
      const weekParam = url.searchParams.get('week');
      const limit = parseInt(url.searchParams.get('limit') || '100', 10);
      const season = seasonParam ? parseInt(seasonParam, 10) : undefined;
      const week = weekParam ? parseInt(weekParam, 10) : undefined;
      const result = await readNFLSchedule(env, {
        season: Number.isFinite(season as number) ? season : undefined,
        week: Number.isFinite(week as number) ? week : undefined,
        team: url.searchParams.get('team') || undefined,
        limit: Number.isFinite(limit) ? limit : 100,
      });
      return jsonResponse(result, 200, 3600);
    }

    // === AI PAPERS, TRENDING (free) ===
    // Daily curated AI/ML papers from Semantic Scholar, ranked by citation
    // count. Captured by the 11:00 UTC cron. First request after deploy
    // bootstraps a live capture so it never returns empty.

    if (path === '/api/papers/ai-trending') {
      const snapshot = await getPapersLatest(env);
      if (!snapshot) {
        return jsonResponse({ ok: false, error: 'papers_unavailable' }, 503);
      }
      return jsonResponse({ ok: true, snapshot }, 200, 600);
    }

    // === ARXIV RECENT SUBMISSIONS (free) ===
    // Most recent submissions in cs.AI / cs.LG / cs.CL / cs.CV from the
    // arXiv Atom API, parsed and deduped. Captured daily at 11:30 UTC.
    // First request bootstraps a live capture so it never returns empty.

    if (path === '/api/papers/arxiv-recent') {
      const snapshot = await getArxivLatest(env);
      if (!snapshot) {
        return jsonResponse({ ok: false, error: 'arxiv_unavailable' }, 503);
      }
      return jsonResponse({ ok: true, snapshot }, 200, 600);
    }

    // === HUGGING FACE TRENDING (free) ===
    // Top 30 most-downloaded models and datasets on Hugging Face, captured
    // once per day at 12:00 UTC. Day-over-day deltas (computed against the
    // dated keys) become a true "trending" signal. First request bootstraps
    // a live capture so it never returns empty.

    if (path === '/api/hf/trending') {
      const snapshot = await getHFLatest(env);
      if (!snapshot) {
        return jsonResponse({ ok: false, error: 'hf_unavailable' }, 503);
      }
      return jsonResponse({ ok: true, snapshot }, 200, 600);
    }

    // === HF OPEN LLM LEADERBOARD (free) ===
    // Daily snapshot of the Hugging Face Open LLM Leaderboard v2 captured
    // at 04:45 UTC from the open-llm-leaderboard/contents dataset (CC-BY-SA).
    // Six v2 tasks: IFEval, BBH, MATH Lvl 5, GPQA, MUSR, MMLU-PRO. Each entry
    // carries rank, model_id, params_b, precision, license, base_model, type,
    // average, and per-task scores. Query: ?limit=N (default 50, max 500)
    // &min_average=X. Multi-day rank + score history compounds for the
    // premium series endpoints (post-Phase 2).

    if (path === '/api/hf-leaderboard/latest') {
      const limitParam = url.searchParams.get('limit');
      const minAvgParam = url.searchParams.get('min_average');
      const limit = limitParam ? parseInt(limitParam, 10) : undefined;
      const minAvg = minAvgParam ? parseFloat(minAvgParam) : undefined;
      const result = await readHfLeaderboardLatest(env, {
        limit: Number.isFinite(limit as number) ? limit : undefined,
        min_average: Number.isFinite(minAvg as number) ? minAvg : undefined,
      });
      if (!result.ok) {
        return jsonResponse(result, 503);
      }
      return jsonResponse(result, 200, 1800);
    }

    // === GITHUB HOT AI ISSUES (free) ===
    // Daily snapshot of currently-active GitHub issues across AI-relevant
    // topics, ranked by comment count. Captured by the 12:30 UTC cron.
    // Cold-start bootstrap mirrors the other data feeds.

    if (path === '/api/issues/hot') {
      const snapshot = await getHotIssuesLatest(env);
      if (!snapshot) {
        return jsonResponse({ ok: false, error: 'hot_issues_unavailable' }, 503);
      }
      return jsonResponse({ ok: true, snapshot }, 200, 600);
    }

    // === REDDIT AI COMMUNITY HOT THREADS (free) ===
    // Daily snapshot of currently-hot threads in 7 AI-relevant subreddits
    // (LocalLLaMA, MachineLearning, ClaudeAI, OpenAI, singularity,
    // artificial, AI_Agents). Companion to /api/issues/hot on the
    // community-discussion side. Captured by the 13:00 UTC cron.

    if (path === '/api/reddit/trending') {
      const snapshot = await getRedditLatest(env);
      if (!snapshot) {
        return jsonResponse({ ok: false, error: 'reddit_unavailable' }, 503);
      }
      return jsonResponse({ ok: true, snapshot }, 200, 600);
    }

    // === OPENROUTER CROSS-PROVIDER MODEL CATALOG (free) ===
    // Daily snapshot of every model OpenRouter routes to (200+),
    // normalized with comparable per-token pricing, context window,
    // modality, and provider metadata. Pairs with /api/models (the
    // curated frontier-lab catalog) by adding the long tail of OSS
    // models on cloud inference. Captured by the 14:00 UTC cron.

    if (path === '/api/openrouter/models') {
      const snapshot = await getORLatest(env);
      if (!snapshot) {
        return jsonResponse({ ok: false, error: 'openrouter_unavailable' }, 503);
      }
      return jsonResponse({ ok: true, snapshot }, 200, 600);
    }

    // === HF DAILY PAPERS (free) ===
    // Editor-curated daily set of AI papers from huggingface.co/papers
    // with HF community upvotes + discussion counts. Different signal
    // from /api/papers/arxiv-recent (firehose) and /api/papers/ai-trending
    // (citation-ranked all-time). Captured by the 14:15 UTC cron.

    if (path === '/api/papers/hf-daily') {
      const snapshot = await getHFDailyPapersLatest(env);
      if (!snapshot) {
        return jsonResponse({ ok: false, error: 'hf_daily_papers_unavailable' }, 503);
      }
      return jsonResponse({ ok: true, snapshot }, 200, 600);
    }

    // === COMPOSITE: AI ECOSYSTEM TODAY (free) ===
    // One request fans out across every daily snapshot we have and
    // returns a single structured "AI ecosystem today" brief. Useful
    // for agents that want a fast snapshot without orchestrating 9
    // separate calls. Optional ?sections=news,papers,hf,community,
    // inference,status filter and ?limit=N (1-10, default 3). Edge
    // cached so a thousand agents calling this per minute hit the
    // worker once.

    if (path === '/api/today') {
      const sections = resolveTodaySections(url.searchParams.get('sections') ?? undefined);
      const limit = resolveTodayLimit(url.searchParams.get('limit') ?? undefined);

      const wantNews = sections.includes('news');
      const wantPapers = sections.includes('papers');
      const wantHf = sections.includes('hf');
      const wantCommunity = sections.includes('community');
      const wantInference = sections.includes('inference');
      const wantStatus = sections.includes('status');

      const safe = async <T>(p: Promise<T> | null): Promise<T | null> => {
        if (!p) return null;
        try { return await p; } catch (err) {
          console.error('today-brief subfetch failed:', err);
          return null;
        }
      };

      const [
        news, papersAITrending, papersArxivRecent, papersHFDaily,
        hfTrending, hotIssues, redditTrending, openrouter, status,
      ] = await Promise.all([
        wantNews ? safe(cachedKVGet(request, env.TENSORFEED_NEWS, 'articles', 60) as Promise<Article[] | null>) : Promise.resolve(null),
        wantPapers ? safe(getPapersLatest(env)) : Promise.resolve(null),
        wantPapers ? safe(getArxivLatest(env)) : Promise.resolve(null),
        wantPapers ? safe(getHFDailyPapersLatest(env)) : Promise.resolve(null),
        wantHf ? safe(getHFLatest(env)) : Promise.resolve(null),
        wantCommunity ? safe(getHotIssuesLatest(env)) : Promise.resolve(null),
        wantCommunity ? safe(getRedditLatest(env)) : Promise.resolve(null),
        wantInference ? safe(getORLatest(env)) : Promise.resolve(null),
        wantStatus ? safe(cachedKVGet(request, env.TENSORFEED_STATUS, 'services', 120) as Promise<ServiceStatus[] | null>) : Promise.resolve(null),
      ]);

      const brief = buildTodayBrief(
        {
          news: news ?? null,
          papersAITrending: papersAITrending ?? null,
          papersArxivRecent: papersArxivRecent ?? null,
          papersHFDaily: papersHFDaily ?? null,
          hfTrending: hfTrending ?? null,
          hotIssues: hotIssues ?? null,
          redditTrending: redditTrending ?? null,
          openrouter: openrouter ?? null,
          status: status ?? null,
        },
        { sections, limit_per_section: limit },
      );
      return jsonResponse(brief, 200, 300);
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
          hint: 'Sources are RunPod (requires RUNPOD_API_KEY secret) plus a Lambda Labs public-pricing snapshot. If both are unavailable, this endpoint returns 503.',
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

    // Curated marketing bundles. Credits are fully fungible across all
    // premium endpoints; packs just suggest USD amounts and highlight
    // endpoint groupings to reduce decision friction for agent operators.
    // Backed by worker/src/payment-packs.ts.
    if (path === '/api/payment/packs') {
      const { paymentPacksPayload } = await import('./payment-packs');
      return jsonResponse(paymentPacksPayload(), 200, 600);
    }

    // Institutional data licensing catalog. Bulk-data products for
    // buyers that don't fit the per-call agent model (hedge funds, AI
    // research firms, training-data buyers, news aggregators).
    // Read-only; fulfillment is manual via contact@tensorfeed.ai for v1.
    if (path === '/api/data-licensing') {
      const { dataLicensingPayload } = await import('./data-licensing');
      return jsonResponse(dataLicensingPayload(), 200, 600);
    }

    // Professional services catalog. Paid engagements for x402, AFTA,
    // and agent-payments implementation work. Read-only catalog;
    // intake via contact@tensorfeed.ai for v1.
    if (path === '/api/services') {
      const { servicesPayload } = await import('./professional-services');
      return jsonResponse(servicesPayload(), 200, 600);
    }

    // MCP Pro Tier offering — monthly subscription for unlimited
    // premium-endpoint calls via the TensorFeed MCP server. Catalog
    // surface; manual fulfillment via contact@tensorfeed.ai for v1.
    if (path === '/api/mcp/pro-tier') {
      const { mcpProTierPayload } = await import('./mcp-pro-tier');
      return jsonResponse(mcpProTierPayload(), 200, 600);
    }

    // AFTA Certification self-check. Publishers hit this to see if their
    // public surfaces (manifest, agent-fair-trade.json, receipt key) meet
    // the AFTA bar before applying for paid certification. Read-only;
    // returns a deterministic scorecard. See worker/src/afta-certify.ts.
    if (path === '/api/afta-certify/check' && request.method === 'GET') {
      const domain = url.searchParams.get('domain');
      if (!domain) {
        return jsonResponse(
          {
            ok: false,
            error: 'missing_domain',
            message: 'Provide ?domain=example.com to check a publisher.',
            example: '/api/afta-certify/check?domain=tensorfeed.ai',
          },
          400,
        );
      }
      const { certifyDomain } = await import('./afta-certify');
      const result = await certifyDomain(domain);
      // Don't cache certification checks — publishers may re-run after
      // shipping fixes and need fresh state.
      return jsonResponse(result, result.ok ? 200 : 400, 0);
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
        const body = await request.json() as { amount_usd?: number; sender_wallet?: string };
        const amountUsd = typeof body.amount_usd === 'number' ? body.amount_usd : NaN;
        if (!Number.isFinite(amountUsd) || amountUsd < 0.5 || amountUsd > 10000) {
          return jsonResponse(
            { ok: false, error: 'invalid_amount', message: 'amount_usd must be a number between 0.5 and 10000.' },
            400,
          );
        }
        // AFTA Tx-Sniper protection: every quote is bound to the EOA
        // that will sign the on-chain USDC transfer. /api/payment/confirm
        // refuses to mint credits unless the on-chain `from` matches.
        // sender_wallet is REQUIRED (no legacy unbound flow).
        if (!isValidSenderWallet(body.sender_wallet)) {
          return jsonResponse(
            {
              ok: false,
              error: 'invalid_sender_wallet',
              message:
                'sender_wallet is required and must be a 0x-prefixed 40-char EVM address. The on-chain USDC transfer must be signed by this wallet, or /api/payment/confirm will reject the tx with sender_mismatch.',
              doc: '/developers/agent-payments#sender-wallet',
            },
            400,
          );
        }
        const senderWallet = body.sender_wallet.trim().toLowerCase();
        const { nonce, quote, wallet } = await createQuote(env, amountUsd, senderWallet);
        return jsonResponse({
          ok: true,
          wallet,
          sender_wallet: senderWallet,
          memo: nonce,
          amount_usd: quote.amount_usd,
          credits: quote.credits,
          currency: 'USDC',
          network: 'base',
          expires_at: new Date(quote.expires_at).toISOString(),
          ttl_seconds: Math.round((quote.expires_at - Date.now()) / 1000),
          next_step: `Send ${quote.amount_usd} USDC on Base from ${senderWallet} to ${wallet}, then POST /api/payment/confirm with { tx_hash, nonce: "${nonce}" }`,
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

    // === SELF-SERVICE: PER-TOKEN DAILY SPEND CAP ===
    // GET reads the current cap + today's spend + remaining + reset_at.
    // POST sets a new cap. Body: { daily_cap: number | null }. Send null
    // or 0 to clear. Authenticated by the token itself; no credit cost.

    if (path === '/api/payment/spend-cap') {
      const authHeader = request.headers.get('Authorization');
      const token = authHeader?.startsWith('Bearer ') ? authHeader.slice(7).trim() : '';
      if (!token) {
        return jsonResponse(
          { ok: false, error: 'token_required', message: 'Send the bearer token via Authorization: Bearer <token>' },
          401,
        );
      }
      if (request.method === 'GET') {
        const result = await getSpendCapStatus(env, token);
        if (!result.ok) return jsonResponse(result, 404);
        return jsonResponse(result, 200, 0);
      }
      if (request.method === 'POST') {
        let body: { daily_cap?: unknown };
        try {
          body = (await request.json()) as { daily_cap?: unknown };
        } catch {
          return jsonResponse({ ok: false, error: 'invalid_request_body' }, 400);
        }
        const result = await setSpendCap(env, token, body.daily_cap ?? null);
        if (!result.ok) {
          const status = result.error === 'token_not_found' ? 404 : 400;
          return jsonResponse(result, status);
        }
        return jsonResponse(result, 200, 0);
      }
      return jsonResponse({ ok: false, error: 'method_not_allowed' }, 405);
    }

    // === SELF-SERVICE: TOKEN REVOCATION ===
    // POST burns the caller's own bearer token immediately. Use this if
    // a token is suspected to be leaked. Mirrors /api/admin/burn-token
    // but authenticated by the token itself rather than an admin key.

    if (path === '/api/payment/revoke') {
      if (request.method !== 'POST') {
        return jsonResponse({ ok: false, error: 'method_not_allowed' }, 405);
      }
      const authHeader = request.headers.get('Authorization');
      const token = authHeader?.startsWith('Bearer ') ? authHeader.slice(7).trim() : '';
      if (!token) {
        return jsonResponse(
          { ok: false, error: 'token_required', message: 'Send the bearer token via Authorization: Bearer <token>' },
          401,
        );
      }
      const result = await revokeOwnToken(env, token);
      if (!result.ok) {
        const status = result.error === 'token_not_found' ? 404 : 400;
        return jsonResponse(result, status);
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
      if (payment.paymentResponseHeader) headers['PAYMENT-RESPONSE'] = payment.paymentResponseHeader;

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

    // === PAID PREMIUM: NEWS HISTORY FULL (Tier 1, 1 credit) ===
    // Untruncated daily news archive. Single-date mode returns the full
    // article list for one date; range mode returns one entry per UTC day
    // in the [from,to] window with up to 200 articles per day.

    if (path === '/api/premium/history/news/full') {
      const payment = await requirePayment(request, env, 1);
      if (!payment.paid) return payment.response!;

      const date = url.searchParams.get('date');
      const fromParam = url.searchParams.get('from');
      const toParam = url.searchParams.get('to');

      if (date) {
        if (!isISODate(date)) {
          return jsonResponse(
            { ok: false, error: 'invalid_date', hint: 'date must be YYYY-MM-DD' },
            400,
          );
        }
        const snapshot = await readNewsDaily(env, date);
        if (!snapshot) {
          return jsonResponse({ ok: false, error: 'not_found', date }, 404);
        }
        ctx.waitUntil(
          logPremiumUsage(env, '/api/premium/history/news/full', request.headers.get('User-Agent') || 'unknown', 1, payment.token),
        );
        return await premiumResponse(
          { ok: true, mode: 'single', ...snapshot },
          payment,
          1,
          request,
          env,
        );
      }

      if (!fromParam || !toParam) {
        return jsonResponse(
          {
            ok: false,
            error: 'missing_params',
            hint: 'pass ?date=YYYY-MM-DD for a single day or ?from=YYYY-MM-DD&to=YYYY-MM-DD for a range',
          },
          400,
        );
      }
      if (!isISODate(fromParam) || !isISODate(toParam)) {
        return jsonResponse(
          { ok: false, error: 'invalid_date_range', hint: 'from and to must both be YYYY-MM-DD' },
          400,
        );
      }
      const fromMs = Date.parse(fromParam + 'T00:00:00Z');
      const toMs = Date.parse(toParam + 'T00:00:00Z');
      if (!(toMs >= fromMs)) {
        return jsonResponse(
          { ok: false, error: 'invalid_date_range', hint: 'to must be on or after from' },
          400,
        );
      }
      const dayCount = Math.floor((toMs - fromMs) / 86400_000) + 1;
      const NEWS_FULL_MAX_DAYS = 30;
      if (dayCount > NEWS_FULL_MAX_DAYS) {
        return jsonResponse(
          {
            ok: false,
            error: 'range_too_large',
            hint: `range must be at most ${NEWS_FULL_MAX_DAYS} days`,
            limits: { max_range_days: NEWS_FULL_MAX_DAYS },
          },
          400,
        );
      }

      const dates = enumerateDates(fromParam, toParam);
      const days = await Promise.all(
        dates.map(async (d) => {
          const snap = await readNewsDaily(env, d);
          return snap
            ? { date: d, articles_count: snap.articles_count, captured_at: snap.captured_at, articles: snap.articles }
            : { date: d, missing: true };
        }),
      );
      const totalArticles = days.reduce(
        (sum, day) => sum + ('articles_count' in day ? (day.articles_count ?? 0) : 0),
        0,
      );
      ctx.waitUntil(
        logPremiumUsage(env, '/api/premium/history/news/full', request.headers.get('User-Agent') || 'unknown', 1, payment.token),
      );
      return await premiumResponse(
        {
          ok: true,
          mode: 'range',
          from: fromParam,
          to: toParam,
          days_returned: days.length,
          articles_total: totalArticles,
          days,
        },
        payment,
        1,
        request,
        env,
      );
    }

    // === PAID PREMIUM: DECISION-VERIFIED NEWS (Tier 1, 1 credit) ===
    // Per defensible-pipelines spec: agents fact-checking a fast-moving
    // claim get back STRUCTURED VERIFICATION SCORES on top of the
    // existing news clusters. The unique value-add over the free
    // /api/history/news/clusters: verification tier, source-diversity
    // score, time-span analysis, AFTA-signed receipt over the source
    // set. Two query modes:
    //   ?cluster_id=&date=        verify a known cluster (cheap, 2 KV reads)
    //   /search?q=&since=&...     search recent dates for matching clusters
    if (path === '/api/premium/news/decision-verified') {
      const payment = await requirePayment(request, env, 1);
      if (!payment.paid) return payment.response!;

      const parsed = parseLookupQuery(url);
      if (!parsed.ok) {
        return await premiumValidationFailure(parsed as unknown as Record<string, unknown>, payment, request, env);
      }
      const result = await lookupVerifiedCluster(env, parsed.query.date, parsed.query.cluster_id);
      if (!result) {
        return await premiumValidationFailure(
          {
            ok: false,
            error: 'cluster_not_found',
            hint: 'no cluster with that cluster_id on the requested date. List clusters via /api/history/news/clusters?date=',
          },
          payment,
          request,
          env,
        );
      }
      ctx.waitUntil(
        logPremiumUsage(
          env,
          '/api/premium/news/decision-verified',
          request.headers.get('User-Agent') || 'unknown',
          1,
          payment.token,
        ),
      );
      return await premiumResponse(
        { ok: true, mode: 'cluster_lookup', ...result, attribution: DECISION_VERIFIED_ATTRIBUTION },
        payment,
        1,
        request,
        env,
      );
    }

    if (path === '/api/premium/news/decision-verified/search') {
      const payment = await requirePayment(request, env, 1);
      if (!payment.paid) return payment.response!;

      const parsed = parseSearchQuery(url);
      if (!parsed.ok) {
        return await premiumValidationFailure(parsed as unknown as Record<string, unknown>, payment, request, env);
      }
      const result = await searchVerifiedClusters(env, parsed.query);
      ctx.waitUntil(
        logPremiumUsage(
          env,
          '/api/premium/news/decision-verified/search',
          request.headers.get('User-Agent') || 'unknown',
          1,
          payment.token,
        ),
      );
      return await premiumResponse(
        { ok: true, mode: 'search', ...result, attribution: DECISION_VERIFIED_ATTRIBUTION },
        payment,
        1,
        request,
        env,
      );
    }

    // === PAID PREMIUM: NEWS CLUSTERS FULL (Tier 1, 1 credit) ===
    // Untruncated cluster set per UTC date (free tier caps at 25 per
    // day). Single-date mode returns the full cluster array; range
    // mode returns one entry per UTC day in the [from,to] window with
    // up to 30 days. The verification product's primary surface for
    // agents that want to enumerate all corroborated stories without
    // the discoverability cap.

    if (path === '/api/premium/history/news/clusters/full') {
      const payment = await requirePayment(request, env, 1);
      if (!payment.paid) return payment.response!;

      const date = url.searchParams.get('date');
      const fromParam = url.searchParams.get('from');
      const toParam = url.searchParams.get('to');

      if (date) {
        if (!isISODate(date)) {
          return jsonResponse({ ok: false, error: 'invalid_date', hint: 'date must be YYYY-MM-DD' }, 400);
        }
        const clusters = await readClustersForDate(env, date);
        ctx.waitUntil(
          logPremiumUsage(
            env,
            '/api/premium/history/news/clusters/full',
            request.headers.get('User-Agent') || 'unknown',
            1,
            payment.token,
          ),
        );
        return await premiumResponse(
          { ok: true, mode: 'single', date, count: clusters.length, clusters },
          payment,
          1,
          request,
          env,
        );
      }

      if (!fromParam || !toParam) {
        return jsonResponse(
          {
            ok: false,
            error: 'missing_params',
            hint: 'pass ?date=YYYY-MM-DD or ?from=YYYY-MM-DD&to=YYYY-MM-DD',
          },
          400,
        );
      }
      if (!isISODate(fromParam) || !isISODate(toParam)) {
        return jsonResponse({ ok: false, error: 'invalid_date_range' }, 400);
      }
      const fromMs = Date.parse(fromParam + 'T00:00:00Z');
      const toMs = Date.parse(toParam + 'T00:00:00Z');
      if (!(toMs >= fromMs)) {
        return jsonResponse({ ok: false, error: 'invalid_date_range', hint: 'to must be on or after from' }, 400);
      }
      const dayCount = Math.floor((toMs - fromMs) / 86400_000) + 1;
      if (dayCount > 30) {
        return jsonResponse(
          { ok: false, error: 'range_too_large', hint: 'range must be at most 30 days', limits: { max_range_days: 30 } },
          400,
        );
      }
      const dates = enumerateDates(fromParam, toParam);
      const days = await Promise.all(
        dates.map(async (d) => ({
          date: d,
          clusters: await readClustersForDate(env, d),
        })),
      );
      const total_clusters = days.reduce((sum, day) => sum + day.clusters.length, 0);
      ctx.waitUntil(
        logPremiumUsage(
          env,
          '/api/premium/history/news/clusters/full',
          request.headers.get('User-Agent') || 'unknown',
          1,
          payment.token,
        ),
      );
      return await premiumResponse(
        {
          ok: true,
          mode: 'range',
          from: fromParam,
          to: toParam,
          days_returned: days.length,
          total_clusters,
          days,
        },
        payment,
        1,
        request,
        env,
      );
    }

    // === PAID PREMIUM: VERIFIED FEED (Tier 1, 1 credit) ===
    // Story-level feed filtered to clusters with N+ independent sources
    // corroborating. The agent's "do not act on a single source" gate.
    // Default min_sources=4 (corroboration_band="broad"); agents can
    // tune lower if they want limited corroboration too.

    if (path === '/api/premium/history/news/verified') {
      const payment = await requirePayment(request, env, 1);
      if (!payment.paid) return payment.response!;

      const date = url.searchParams.get('date');
      const fromParam = url.searchParams.get('from');
      const toParam = url.searchParams.get('to');
      const minRaw = parseInt(url.searchParams.get('min_sources') ?? '4', 10);
      const min_sources = Math.max(2, Math.min(Number.isFinite(minRaw) ? minRaw : 4, 50));

      const filter = (clusters: { source_count: number }[]) =>
        clusters.filter((c) => c.source_count >= min_sources);

      if (date) {
        if (!isISODate(date)) {
          return jsonResponse({ ok: false, error: 'invalid_date' }, 400);
        }
        const all = await readClustersForDate(env, date);
        const verified = filter(all);
        ctx.waitUntil(
          logPremiumUsage(
            env,
            '/api/premium/history/news/verified',
            request.headers.get('User-Agent') || 'unknown',
            1,
            payment.token,
          ),
        );
        return await premiumResponse(
          {
            ok: true,
            mode: 'single',
            date,
            min_sources,
            total_clusters_for_day: all.length,
            verified_count: verified.length,
            clusters: verified,
          },
          payment,
          1,
          request,
          env,
        );
      }

      if (!fromParam || !toParam) {
        return jsonResponse(
          {
            ok: false,
            error: 'missing_params',
            hint: 'pass ?date=YYYY-MM-DD or ?from=YYYY-MM-DD&to=YYYY-MM-DD with optional ?min_sources=2-50 (default 4)',
          },
          400,
        );
      }
      if (!isISODate(fromParam) || !isISODate(toParam)) {
        return jsonResponse({ ok: false, error: 'invalid_date_range' }, 400);
      }
      const fromMs = Date.parse(fromParam + 'T00:00:00Z');
      const toMs = Date.parse(toParam + 'T00:00:00Z');
      if (!(toMs >= fromMs)) {
        return jsonResponse({ ok: false, error: 'invalid_date_range' }, 400);
      }
      const dayCount = Math.floor((toMs - fromMs) / 86400_000) + 1;
      if (dayCount > 30) {
        return jsonResponse(
          { ok: false, error: 'range_too_large', hint: 'range must be at most 30 days', limits: { max_range_days: 30 } },
          400,
        );
      }
      const dates = enumerateDates(fromParam, toParam);
      const days = await Promise.all(
        dates.map(async (d) => {
          const all = await readClustersForDate(env, d);
          return {
            date: d,
            total_clusters_for_day: all.length,
            verified_count: filter(all).length,
            clusters: filter(all),
          };
        }),
      );
      const total_verified = days.reduce((sum, day) => sum + day.verified_count, 0);
      ctx.waitUntil(
        logPremiumUsage(
          env,
          '/api/premium/history/news/verified',
          request.headers.get('User-Agent') || 'unknown',
          1,
          payment.token,
        ),
      );
      return await premiumResponse(
        {
          ok: true,
          mode: 'range',
          from: fromParam,
          to: toParam,
          min_sources,
          days_returned: days.length,
          total_verified,
          days,
        },
        payment,
        1,
        request,
        env,
      );
    }

    // === PAID PREMIUM: NEWS SOURCE-HEALTH SERIES (Tier 1, 1 credit) ===
    // Multi-day series of per-source poll counters and reliability scores,
    // up to 90 days. Companion to /api/history/news/sources for trending.

    if (path === '/api/premium/history/news/source-health') {
      const payment = await requirePayment(request, env, 1);
      if (!payment.paid) return payment.response!;

      const fromParam = url.searchParams.get('from');
      const toParam = url.searchParams.get('to');
      if (!fromParam || !toParam) {
        return jsonResponse(
          { ok: false, error: 'missing_params', hint: 'pass ?from=YYYY-MM-DD&to=YYYY-MM-DD' },
          400,
        );
      }
      if (!isISODate(fromParam) || !isISODate(toParam)) {
        return jsonResponse(
          { ok: false, error: 'invalid_date_range', hint: 'from and to must both be YYYY-MM-DD' },
          400,
        );
      }
      const fromMs = Date.parse(fromParam + 'T00:00:00Z');
      const toMs = Date.parse(toParam + 'T00:00:00Z');
      if (!(toMs >= fromMs)) {
        return jsonResponse(
          { ok: false, error: 'invalid_date_range', hint: 'to must be on or after from' },
          400,
        );
      }
      const dayCount = Math.floor((toMs - fromMs) / 86400_000) + 1;
      const SOURCE_HEALTH_MAX_DAYS = 90;
      if (dayCount > SOURCE_HEALTH_MAX_DAYS) {
        return jsonResponse(
          {
            ok: false,
            error: 'range_too_large',
            hint: `range must be at most ${SOURCE_HEALTH_MAX_DAYS} days`,
            limits: { max_range_days: SOURCE_HEALTH_MAX_DAYS },
          },
          400,
        );
      }

      const dates = enumerateDates(fromParam, toParam);
      const days = await Promise.all(
        dates.map(async (d) => {
          const day = await readSourceHealth(env, d);
          return day
            ? {
                date: d,
                total_polls: day.total_polls,
                updated_at: day.updated_at,
                sources: summarizeSourceHealth(day),
              }
            : { date: d, missing: true };
        }),
      );
      ctx.waitUntil(
        logPremiumUsage(env, '/api/premium/history/news/source-health', request.headers.get('User-Agent') || 'unknown', 1, payment.token),
      );
      return await premiumResponse(
        {
          ok: true,
          from: fromParam,
          to: toParam,
          days_returned: days.length,
          days,
        },
        payment,
        1,
        request,
        env,
      );
    }

    // === PAID PREMIUM: OpenFDA AGGREGATE (Tier 1, 1 credit) ===
    // Histogram-by-field across openFDA's millions of records. Uses
    // openFDA's `count` parameter to return bucket counts in one call
    // instead of N follow-up queries. Useful for "top N drugs by
    // adverse event count" or "top reactions for one drug" without
    // pagination through hundreds of thousands of individual records.

    if (path === '/api/premium/health/fda/aggregate') {
      const payment = await requirePayment(request, env, 1);
      if (!payment.paid) return payment.response!;

      const parsed = parseFDAAggregateQuery(url);
      if (!parsed.ok) {
        return jsonResponse({ ok: false, error: parsed.error, hint: parsed.hint }, 400);
      }
      const result = await fetchFDAAggregate(env, parsed.query);
      if (!result.ok) {
        return jsonResponse(
          { ok: false, error: result.error, attribution: result.attribution },
          result.http_status === 429 ? 503 : 502,
        );
      }
      ctx.waitUntil(
        logPremiumUsage(
          env,
          '/api/premium/health/fda/aggregate',
          request.headers.get('User-Agent') || 'unknown',
          1,
          payment.token,
        ),
      );
      return await premiumResponse(
        {
          ok: true,
          source: result.source,
          fetched_at: result.fetched_at,
          query: result.query,
          data: result.data,
          attribution: result.attribution,
        },
        payment,
        1,
        request,
        env,
      );
    }

    // === PAID PREMIUM: LLM-READY CLEAN ENDPOINTS (Tier 1, 1 credit) ===
    // The deep moat. Free /api/security/cve/{id} et al return raw upstream
    // formats; these endpoints return the same data flattened, schema-
    // normalized, and pre-extracted into dense token-efficient payloads.
    // Agents pay because their context-window-tax savings exceed the
    // $0.02 cost: a typical CVE record drops from ~3KB nested JSON to
    // ~500 bytes flat JSON, an 80%+ token reduction with zero
    // information loss for agent decision-making. License postures are
    // inherited from the upstream (MITRE CVE Terms of Use, US Gov public
    // domain, FIRST.org free-for-any-use). Output is versioned via
    // schema_version + cleaning_version so agents can pin to a stable
    // shape even as we iterate the transformer.

    const cleanCveMatch = path.match(/^\/api\/premium\/clean\/cve\/(CVE-\d{4}-\d{4,7})$/i);
    if (cleanCveMatch) {
      const payment = await requirePayment(request, env, 1);
      if (!payment.paid) return payment.response!;

      const raw = await fetchCVE(env, cleanCveMatch[1]);
      if (!raw.ok) {
        const status = raw.error === 'cve_not_found' ? 404 : raw.error === 'invalid_cve_id' ? 400 : 502;
        return jsonResponse(
          { ok: false, error: raw.error, cve_id: raw.cveId, attribution: raw.attribution },
          status,
        );
      }
      const clean = attachCompressionStats(
        transformCveRecord(raw.record),
        measureSourceBytes(raw.record),
      );
      ctx.waitUntil(
        logPremiumUsage(
          env,
          '/api/premium/clean/cve',
          request.headers.get('User-Agent') || 'unknown',
          1,
          payment.token,
        ),
      );
      return await premiumResponse(
        {
          ok: true,
          source_format: 'mitre_cve_v5_2',
          target_format: 'tensorfeed_llm_ready_v1',
          source_payload: raw.source,
          ...clean,
          attribution: raw.attribution,
        },
        payment,
        1,
        request,
        env,
      );
    }

    const cleanKevMatch = path.match(/^\/api\/premium\/clean\/kev\/(CVE-\d{4}-\d{4,7})$/i);
    if (cleanKevMatch) {
      const payment = await requirePayment(request, env, 1);
      if (!payment.paid) return payment.response!;

      const entry = await readKEVByCVE(env, cleanKevMatch[1]);
      if (!entry) {
        return jsonResponse(
          {
            ok: false,
            error: 'not_in_kev',
            cve_id: cleanKevMatch[1].toUpperCase(),
            hint: 'CVE may exist in MITRE CVE List but not be on the CISA KEV catalog.',
            attribution: KEV_ATTRIBUTION,
          },
          404,
        );
      }
      const clean = attachCompressionStats(
        transformKevEntry(entry),
        measureSourceBytes(entry),
      );
      ctx.waitUntil(
        logPremiumUsage(
          env,
          '/api/premium/clean/kev',
          request.headers.get('User-Agent') || 'unknown',
          1,
          payment.token,
        ),
      );
      return await premiumResponse(
        {
          ok: true,
          source_format: 'cisa_kev_v1',
          target_format: 'tensorfeed_llm_ready_v1',
          ...clean,
          attribution: KEV_ATTRIBUTION,
        },
        payment,
        1,
        request,
        env,
      );
    }

    const cleanEpssMatch = path.match(/^\/api\/premium\/clean\/epss\/(CVE-\d{4}-\d{4,7})$/i);
    if (cleanEpssMatch) {
      const payment = await requirePayment(request, env, 1);
      if (!payment.paid) return payment.response!;

      const wantSeries = url.searchParams.get('series') === 'true';
      const raw = wantSeries
        ? await fetchEPSSSeries(env, cleanEpssMatch[1])
        : await fetchEPSSCurrent(env, cleanEpssMatch[1]);
      if (!raw.ok) {
        const status = raw.error === 'cve_not_in_epss' ? 404 : raw.error === 'invalid_cve_id' ? 400 : 502;
        return jsonResponse(
          { ok: false, error: raw.error, cve_id: raw.cve_id, attribution: raw.attribution },
          status,
        );
      }
      const clean = attachCompressionStats(
        transformEpssScore(raw.data),
        measureSourceBytes(raw.data),
      );
      ctx.waitUntil(
        logPremiumUsage(
          env,
          '/api/premium/clean/epss',
          request.headers.get('User-Agent') || 'unknown',
          1,
          payment.token,
        ),
      );
      return await premiumResponse(
        {
          ok: true,
          source_format: 'first_org_epss_v1',
          target_format: 'tensorfeed_llm_ready_v1',
          source_payload: raw.source,
          included_series: wantSeries,
          ...clean,
          attribution: raw.attribution,
        },
        payment,
        1,
        request,
        env,
      );
    }

    // === PAID PREMIUM: VERIFIED CVE (Tier 1, 1 credit) ===
    // Cross-database CVE corroboration in a single call. Composes up to
    // five independent security databases (MITRE CVE List, CISA KEV,
    // FIRST.org EPSS, OSV.dev, CISA Vulnrichment) into one fact card
    // with a `confirmed_by` array and `corroboration_count`. Sources
    // that don't have the CVE just don't appear in confirmed_by; the
    // call still succeeds with whatever sources do have it.
    //
    // The agent's pitch: instead of fanning out 5 API calls and parsing
    // 5 different response formats to confirm a CVE is real and to
    // gather severity + exploitation + ecosystem signals, hit one
    // endpoint for one credit. The hallucination-reduction story is
    // direct: corroboration_count is auditable per call.

    const verifiedCveMatch = path.match(/^\/api\/premium\/security\/verified\/(CVE-\d{4}-\d{4,7})$/i);
    if (verifiedCveMatch) {
      const payment = await requirePayment(request, env, 1);
      if (!payment.paid) return payment.response!;

      const cveId = verifiedCveMatch[1].toUpperCase();
      const [mitre, kev, epss, osv, vuln] = await Promise.all([
        fetchCVE(env, cveId).catch(() => null),
        readKEVByCVE(env, cveId).catch(() => null),
        fetchEPSSCurrent(env, cveId).catch(() => null),
        fetchOSVById(env, cveId).catch(() => null),
        fetchVulnrichment(env, cveId).catch(() => null),
      ]);

      const mitreRecord = mitre && mitre.ok ? mitre.record : null;
      const kevEntry = kev ?? null;
      const epssCurrent = epss && epss.ok ? epss.data : null;
      const osvRecord = osv && osv.ok ? osv.data : null;
      const vulnRecord = vuln && vuln.ok ? vuln.record : null;

      const confirmedCount =
        Number(Boolean(mitreRecord)) +
        Number(Boolean(kevEntry)) +
        Number(Boolean(epssCurrent)) +
        Number(Boolean(osvRecord)) +
        Number(Boolean(vulnRecord));

      if (confirmedCount === 0) {
        return jsonResponse(
          {
            ok: false,
            error: 'cve_not_found_in_any_source',
            cve_id: cveId,
            checked: ['MITRE', 'KEV', 'EPSS', 'OSV', 'Vulnrichment'],
            hint: 'No corroboration found across the 5 security databases. CVE id may be invalid, very recent (not yet propagated), or reserved/disputed.',
          },
          404,
        );
      }

      const sourcePayloadBytes =
        (mitreRecord ? measureSourceBytes(mitreRecord) : 0) +
        (kevEntry ? measureSourceBytes(kevEntry) : 0) +
        (epssCurrent ? measureSourceBytes(epssCurrent) : 0) +
        (osvRecord ? measureSourceBytes(osvRecord) : 0) +
        (vulnRecord ? measureSourceBytes(vulnRecord) : 0);

      const composed = composeVerifiedCve({
        cveId,
        mitreRecord,
        kevEntry,
        epssCurrent,
        osvRecord,
        vulnrichmentRecord: vulnRecord,
      });
      const cleaned = attachCompressionStats(composed, sourcePayloadBytes);

      ctx.waitUntil(
        logPremiumUsage(
          env,
          '/api/premium/security/verified',
          request.headers.get('User-Agent') || 'unknown',
          1,
          payment.token,
        ),
      );

      return await premiumResponse(
        {
          ok: true,
          source_format: 'mitre_cve_v5_2 + cisa_kev_v1 + first_epss_v3 + osv_v1 + cisa_vulnrichment_v1',
          target_format: 'tensorfeed_llm_ready_v1',
          ...cleaned,
          attributions: [
            mitre?.attribution,
            { source: 'CISA Known Exploited Vulnerabilities', source_url: 'https://www.cisa.gov/known-exploited-vulnerabilities-catalog', license: 'US Government Public Domain (17 USC 105)', redistribution: 'commercial-permitted' },
            epss?.attribution,
            osv?.attribution,
            vuln?.attribution,
          ].filter(Boolean),
        },
        payment,
        1,
        request,
        env,
      );
    }

    // === PAID PREMIUM: LLM-READY OpenRouter Model (Tier 1, 1 credit) ===
    // Pulls one model from the daily 367-entry OpenRouter catalog
    // snapshot and returns an LLM-ready fact card. The compression
    // headline this enables is the most dramatic in the suite: agents
    // searching for one model would otherwise ingest the full ~270KB
    // catalog to locate it (OpenRouter's /v1/models has no per-id filter).
    // This delivers one ~500-byte card. Pricing is normalized to USD
    // per million tokens (the universal agent convention) with a
    // blended_5_to_1 mix derived for typical agent workloads.
    // Capability flags (tools, vision, structured_outputs, reasoning)
    // are extracted from supported_parameters + modality so agents can
    // boolean-filter without parsing the parameter array.

    const cleanORMatch = path.match(/^\/api\/premium\/clean\/openrouter\/(.+)$/);
    if (cleanORMatch) {
      const payment = await requirePayment(request, env, 1);
      if (!payment.paid) return payment.response!;

      const modelIdRaw = decodeURIComponent(cleanORMatch[1]);
      if (!/^[A-Za-z0-9~_./@:-]{1,200}$/.test(modelIdRaw)) {
        return jsonResponse(
          {
            ok: false,
            error: 'invalid_model_id',
            hint: 'Model id must match the OpenRouter catalog id format (e.g. anthropic/claude-3.5-sonnet).',
          },
          400,
        );
      }

      const snapshot = await getORLatest(env);
      if (!snapshot) {
        return jsonResponse(
          {
            ok: false,
            error: 'catalog_unavailable',
            hint: 'OpenRouter daily snapshot has not been captured yet. The 14:00 UTC cron populates it.',
          },
          503,
        );
      }

      const model = snapshot.models.find((m) => m.id === modelIdRaw);
      if (!model) {
        return jsonResponse(
          {
            ok: false,
            error: 'model_not_in_catalog',
            requested_id: modelIdRaw,
            catalog_size: snapshot.total_models,
            captured_at: snapshot.capturedAt,
            hint: 'Model id not present in the most recent OpenRouter catalog snapshot. List catalog at /api/openrouter/models.',
          },
          404,
        );
      }

      const fullCatalogBytes = measureSourceBytes(snapshot.models);
      const cleaned = attachCompressionStats(transformOpenRouterModel(model), fullCatalogBytes);

      ctx.waitUntil(
        logPremiumUsage(
          env,
          '/api/premium/clean/openrouter',
          request.headers.get('User-Agent') || 'unknown',
          1,
          payment.token,
        ),
      );

      return await premiumResponse(
        {
          ok: true,
          source_format: 'openrouter_v1_models',
          target_format: 'tensorfeed_llm_ready_v1',
          ...cleaned,
          catalog_meta: {
            captured_at: snapshot.capturedAt,
            total_models_in_catalog: snapshot.total_models,
          },
          attribution: {
            source: 'OpenRouter Model Catalog',
            source_url: 'https://openrouter.ai/api/v1/models',
            license: 'Public catalog data; pricing and capabilities owned by OpenRouter and the underlying inference providers',
            redistribution: 'attribution-included',
          },
        },
        payment,
        1,
        request,
        env,
      );
    }

    // === PAID PREMIUM: LLM-READY OpenFDA (Tier 1, 1 credit) ===
    // Same OpenFDA query as the free /api/health/fda/{category}, but
    // with each result row transformed into a flat, dense, agent-friendly
    // shape per category. Five category-specific transformers handle
    // the per-domain field hierarchy:
    //   drug/events   FAERS adverse events flattened with patient demo,
    //                 drugs, reactions, outcomes, seriousness flags
    //   drug/labels   SPL labels with brand/generic/manufacturer
    //                 pulled out and section text joined for context
    //   drug/recalls  enforcement reports with classification + reason
    //   food/recalls  same shape as drug/recalls
    //   device/events MAUDE events with primary device + outcomes
    //                 + truncated narrative

    const cleanFdaMatch = path.match(/^\/api\/premium\/clean\/fda\/(.+)$/);
    if (cleanFdaMatch && isFDACategory(cleanFdaMatch[1])) {
      const payment = await requirePayment(request, env, 1);
      if (!payment.paid) return payment.response!;

      const category = cleanFdaMatch[1];
      const parsed = parseFDAQuery(category, url);
      if (!parsed.ok) {
        return jsonResponse({ ok: false, error: parsed.error, hint: parsed.hint }, 400);
      }
      const result = await fetchFDAQuery(env, parsed.query);
      if (!result.ok) {
        return jsonResponse(
          { ok: false, error: result.error, attribution: result.attribution },
          result.http_status === 429 ? 503 : 502,
        );
      }
      const cleanRaw = transformFdaQueryResults(category, result.data);
      if (!cleanRaw) {
        return jsonResponse({ ok: false, error: 'transformer_unavailable' }, 500);
      }
      const clean = attachCompressionStats(cleanRaw, measureSourceBytes(result.data));
      ctx.waitUntil(
        logPremiumUsage(
          env,
          '/api/premium/clean/fda',
          request.headers.get('User-Agent') || 'unknown',
          1,
          payment.token,
        ),
      );
      return await premiumResponse(
        {
          ok: true,
          source_format: 'openfda_v1',
          target_format: 'tensorfeed_llm_ready_v1',
          source_payload: result.source,
          query: result.query,
          ...clean,
          attribution: result.attribution,
        },
        payment,
        1,
        request,
        env,
      );
    }

    // === PAID PREMIUM: LLM-READY NASA POWER (Tier 1, 1 credit) ===
    // Same NASA POWER data as the free /api/climate/power/daily but
    // pivoted from parameter-keyed dicts into date-keyed rows
    // (`[{date, T2M, PRECTOTCORR}, ...]`). NASA's `-999` fill value
    // becomes null. Date strings normalized to ISO 8601. Token-efficient
    // for any agent doing series analysis or RAG over historical climate
    // and solar data.

    if (path === '/api/premium/clean/power/daily') {
      const payment = await requirePayment(request, env, 1);
      if (!payment.paid) return payment.response!;

      const parsed = parsePowerQuery(url, 'daily', { community: 'AG', maxRangeDays: 365 });
      if (!parsed.ok) {
        return jsonResponse({ ok: false, error: parsed.error, hint: parsed.hint }, 400);
      }
      const result = await fetchPowerPoint(env, parsed.query);
      if (!result.ok) {
        return jsonResponse(
          { ok: false, error: result.error, attribution: result.attribution },
          result.http_status === 429 ? 503 : 502,
        );
      }
      const clean = attachCompressionStats(
        transformNasaPowerPoint(result.data),
        measureSourceBytes(result.data),
      );
      ctx.waitUntil(
        logPremiumUsage(
          env,
          '/api/premium/clean/power/daily',
          request.headers.get('User-Agent') || 'unknown',
          1,
          payment.token,
        ),
      );
      return await premiumResponse(
        {
          ok: true,
          source_format: 'nasa_power_geojson_v1',
          target_format: 'tensorfeed_llm_ready_v1',
          source_payload: result.source,
          query: result.query,
          ...clean,
          attribution: result.attribution,
        },
        payment,
        1,
        request,
        env,
      );
    }

    // === PAID PREMIUM: LLM-READY EIA (Tier 1, 1 credit) ===
    // Same EIA Open Data series as free /api/economy/eia/series but
    // with sorted-ascending numeric points, extracted primary_units, and
    // derived MoM and YoY delta percentages computed against valid
    // observations (missing points skipped on both sides). The deltas
    // are the agent's whole reason for asking; we save them the
    // arithmetic + the parsing.

    if (path === '/api/premium/clean/eia/series') {
      const payment = await requirePayment(request, env, 1);
      if (!payment.paid) return payment.response!;

      const parsed = parseEIAQuery(url);
      if (!parsed.ok) {
        return jsonResponse({ ok: false, error: parsed.error, hint: parsed.hint }, 400);
      }
      const result = await fetchEIASeries(env, parsed.query);
      if (!result.ok) {
        return jsonResponse(
          { ok: false, error: result.error, attribution: result.attribution },
          result.http_status === 429 ? 503 : result.http_status === 503 ? 503 : 502,
        );
      }
      const clean = attachCompressionStats(
        transformEiaSeries(result.data),
        measureSourceBytes(result.data),
      );
      ctx.waitUntil(
        logPremiumUsage(
          env,
          '/api/premium/clean/eia/series',
          request.headers.get('User-Agent') || 'unknown',
          1,
          payment.token,
        ),
      );
      return await premiumResponse(
        {
          ok: true,
          source_format: 'eia_v2_envelope',
          target_format: 'tensorfeed_llm_ready_v1',
          source_payload: result.source,
          query: result.query,
          ...clean,
          attribution: result.attribution,
        },
        payment,
        1,
        request,
        env,
      );
    }

    // === PAID PREMIUM: NASA POWER HOURLY (Tier 1, 1 credit) ===
    // Hourly-resolution meteorological and solar data for one point.
    // Same NASA POWER source as the free /api/climate/power/daily, but
    // hourly bins produce ~24x the payload, so range is capped at 30
    // days. License: NASA POWER open access, US Government public
    // domain.

    if (path === '/api/premium/climate/power/hourly') {
      const payment = await requirePayment(request, env, 1);
      if (!payment.paid) return payment.response!;

      const parsed = parsePowerQuery(url, 'hourly', { community: 'AG', maxRangeDays: 30 });
      if (!parsed.ok) {
        return jsonResponse({ ok: false, error: parsed.error, hint: parsed.hint }, 400);
      }
      const result = await fetchPowerPoint(env, parsed.query);
      if (!result.ok) {
        return jsonResponse(
          {
            ok: false,
            error: result.error,
            attribution: result.attribution,
          },
          result.http_status === 429 ? 503 : 502,
        );
      }
      ctx.waitUntil(
        logPremiumUsage(
          env,
          '/api/premium/climate/power/hourly',
          request.headers.get('User-Agent') || 'unknown',
          1,
          payment.token,
        ),
      );
      return await premiumResponse(
        {
          ok: true,
          source: result.source,
          fetched_at: result.fetched_at,
          query: result.query,
          data: result.data,
          attribution: result.attribution,
        },
        payment,
        1,
        request,
        env,
      );
    }

    // === PAID PREMIUM: EPSS SERIES (Tier 1, 1 credit) ===
    // Full historical time-series of EPSS scores for one CVE, sourced
    // from FIRST.org's `?cve={id}&scope=time-series` endpoint. The
    // series compounds with time as EPSS publishes daily. License:
    // FIRST.org free-for-any-use policy.

    if (path === '/api/premium/security/epss/series') {
      const payment = await requirePayment(request, env, 1);
      if (!payment.paid) return payment.response!;

      const cveIdParam = url.searchParams.get('cve_id') ?? url.searchParams.get('cve');
      if (!cveIdParam) {
        return jsonResponse(
          { ok: false, error: 'cve_id_required', hint: 'pass ?cve_id=CVE-YYYY-NNNNN' },
          400,
        );
      }
      const result = await fetchEPSSSeries(env, cveIdParam);
      if (!result.ok) {
        const status = result.error === 'cve_not_in_epss' ? 404 : result.error === 'invalid_cve_id' ? 400 : 502;
        return jsonResponse(
          { ok: false, error: result.error, cve_id: result.cve_id, attribution: result.attribution },
          status,
        );
      }
      ctx.waitUntil(
        logPremiumUsage(
          env,
          '/api/premium/security/epss/series',
          request.headers.get('User-Agent') || 'unknown',
          1,
          payment.token,
        ),
      );
      return await premiumResponse(
        {
          ok: true,
          cve_id: result.cve_id,
          fetched_at: result.fetched_at,
          source: result.source,
          score: result.data,
          attribution: result.attribution,
        },
        payment,
        1,
        request,
        env,
      );
    }

    // === PAID PREMIUM: EPSS TOP (Tier 1, 1 credit) ===
    // Top-N highest-EPSS CVEs, optionally as of any historical UTC date.
    // Free /api/security/epss/top serves the current snapshot only;
    // this endpoint adds the historical-date filter.

    if (path === '/api/premium/security/epss/top') {
      const payment = await requirePayment(request, env, 1);
      if (!payment.paid) return payment.response!;

      const dateParam = url.searchParams.get('date');
      if (dateParam && !isISODate(dateParam)) {
        return jsonResponse(
          { ok: false, error: 'invalid_date', hint: 'date must be YYYY-MM-DD' },
          400,
        );
      }
      const requested = parseInt(url.searchParams.get('limit') ?? '50', 10);
      const limit = Math.max(1, Math.min(Number.isFinite(requested) ? requested : 50, 100));

      const result = await fetchEPSSTop(env, limit, dateParam);
      if (!result.ok) {
        return jsonResponse(
          { ok: false, error: result.error ?? 'first_api_unavailable', attribution: result.attribution },
          502,
        );
      }
      ctx.waitUntil(
        logPremiumUsage(
          env,
          '/api/premium/security/epss/top',
          request.headers.get('User-Agent') || 'unknown',
          1,
          payment.token,
        ),
      );
      return await premiumResponse(
        {
          ok: true,
          date: dateParam,
          fetched_at: result.fetched_at,
          source: result.source,
          count: result.count,
          top: result.data,
          attribution: result.attribution,
        },
        payment,
        1,
        request,
        env,
      );
    }

    // === PAID PREMIUM: KEV FULL CATALOG (Tier 1, 1 credit) ===
    // Full untruncated CISA KEV catalog. Free tier returns top-50; this
    // endpoint returns the complete current catalog (~1500 entries).
    // Same data, no truncation. Pure public-domain redistribution.

    if (path === '/api/premium/security/kev/full') {
      const payment = await requirePayment(request, env, 1);
      if (!payment.paid) return payment.response!;
      const catalog = await readKEVCurrent(env);
      if (!catalog) {
        return jsonResponse(
          { ok: false, error: 'not_yet_captured' },
          503,
          60,
        );
      }
      ctx.waitUntil(
        logPremiumUsage(
          env,
          '/api/premium/security/kev/full',
          request.headers.get('User-Agent') || 'unknown',
          1,
          payment.token,
        ),
      );
      return await premiumResponse(
        {
          ok: true,
          catalog_version: catalog.catalogVersion,
          date_released: catalog.dateReleased,
          total_entries: catalog.count ?? catalog.vulnerabilities.length,
          vulnerabilities: catalog.vulnerabilities,
          attribution: KEV_ATTRIBUTION,
        },
        payment,
        1,
        request,
        env,
      );
    }

    // === PAID PREMIUM: KEV ADDED SERIES (Tier 1, 1 credit) ===
    // Multi-day series of CISA KEV catalog additions across a UTC date
    // range, capped at 90 days. Each day returns the full set of entries
    // whose dateAdded fell on that day. Useful for trending exploitation
    // velocity, building anomaly detectors, or pulling weekly digests.

    if (path === '/api/premium/security/kev/series') {
      const payment = await requirePayment(request, env, 1);
      if (!payment.paid) return payment.response!;

      const fromParam = url.searchParams.get('from');
      const toParam = url.searchParams.get('to');
      if (!fromParam || !toParam) {
        return jsonResponse(
          { ok: false, error: 'missing_params', hint: 'pass ?from=YYYY-MM-DD&to=YYYY-MM-DD' },
          400,
        );
      }
      if (!isISODate(fromParam) || !isISODate(toParam)) {
        return jsonResponse(
          { ok: false, error: 'invalid_date_range', hint: 'from and to must both be YYYY-MM-DD' },
          400,
        );
      }
      const fromMs = Date.parse(fromParam + 'T00:00:00Z');
      const toMs = Date.parse(toParam + 'T00:00:00Z');
      if (!(toMs >= fromMs)) {
        return jsonResponse(
          { ok: false, error: 'invalid_date_range', hint: 'to must be on or after from' },
          400,
        );
      }
      const dayCount = Math.floor((toMs - fromMs) / 86400_000) + 1;
      const KEV_SERIES_MAX_DAYS = 90;
      if (dayCount > KEV_SERIES_MAX_DAYS) {
        return jsonResponse(
          {
            ok: false,
            error: 'range_too_large',
            hint: `range must be at most ${KEV_SERIES_MAX_DAYS} days`,
            limits: { max_range_days: KEV_SERIES_MAX_DAYS },
          },
          400,
        );
      }

      const dates = enumerateDates(fromParam, toParam);
      const days = await Promise.all(
        dates.map(async (d) => {
          const entries = await readKEVAddedOnDate(env, d);
          return { date: d, count: entries.length, entries };
        }),
      );
      const totalAdded = days.reduce((sum, day) => sum + day.count, 0);
      ctx.waitUntil(
        logPremiumUsage(
          env,
          '/api/premium/security/kev/series',
          request.headers.get('User-Agent') || 'unknown',
          1,
          payment.token,
        ),
      );
      return await premiumResponse(
        {
          ok: true,
          from: fromParam,
          to: toParam,
          days_returned: days.length,
          total_added_in_range: totalAdded,
          days,
          attribution: KEV_ATTRIBUTION,
        },
        payment,
        1,
        request,
        env,
      );
    }

    // === PAID PREMIUM: CVE RANGE (Tier 1, 1 credit) ===
    // Multi-day CVE-ID list across a UTC date range, up to 30 days. Each
    // day returns the full CVE-ID set indexed by the daily cron. Agents
    // hit /api/security/cve/{id} for the per-CVE record after.

    if (path === '/api/premium/security/cve/range') {
      const payment = await requirePayment(request, env, 1);
      if (!payment.paid) return payment.response!;

      const fromParam = url.searchParams.get('from');
      const toParam = url.searchParams.get('to');
      if (!fromParam || !toParam) {
        return jsonResponse(
          { ok: false, error: 'missing_params', hint: 'pass ?from=YYYY-MM-DD&to=YYYY-MM-DD' },
          400,
        );
      }
      if (!isISODate(fromParam) || !isISODate(toParam)) {
        return jsonResponse(
          { ok: false, error: 'invalid_date_range', hint: 'from and to must both be YYYY-MM-DD' },
          400,
        );
      }
      const fromMs = Date.parse(fromParam + 'T00:00:00Z');
      const toMs = Date.parse(toParam + 'T00:00:00Z');
      if (!(toMs >= fromMs)) {
        return jsonResponse(
          { ok: false, error: 'invalid_date_range', hint: 'to must be on or after from' },
          400,
        );
      }
      const dayCount = Math.floor((toMs - fromMs) / 86400_000) + 1;
      const CVE_RANGE_MAX_DAYS = 30;
      if (dayCount > CVE_RANGE_MAX_DAYS) {
        return jsonResponse(
          {
            ok: false,
            error: 'range_too_large',
            hint: `range must be at most ${CVE_RANGE_MAX_DAYS} days`,
            limits: { max_range_days: CVE_RANGE_MAX_DAYS },
          },
          400,
        );
      }

      const dates = enumerateDates(fromParam, toParam);
      const days = await Promise.all(
        dates.map(async (d) => {
          const ids = await readCVEsByDate(env, d);
          return { date: d, count: ids.length, cve_ids: ids };
        }),
      );
      const totalCves = days.reduce((sum, day) => sum + day.count, 0);
      ctx.waitUntil(
        logPremiumUsage(
          env,
          '/api/premium/security/cve/range',
          request.headers.get('User-Agent') || 'unknown',
          1,
          payment.token,
        ),
      );
      return await premiumResponse(
        {
          ok: true,
          from: fromParam,
          to: toParam,
          days_returned: days.length,
          cves_total: totalCves,
          days,
          attribution: CVE_ATTRIBUTION,
        },
        payment,
        1,
        request,
        env,
      );
    }

    // === FREE: NEWS HISTORY INDEX (list of available dates) ===

    if (path === '/api/history/news/dates') {
      const dates = await listNewsDailyDates(env);
      return jsonResponse(
        { ok: true, tier: 'free', count: dates.length, dates },
        200,
        3600,
      );
    }

    if (path === '/api/history/news/sources/dates') {
      const dates = await listSourceHealthDates(env);
      return jsonResponse(
        { ok: true, tier: 'free', count: dates.length, dates },
        200,
        3600,
      );
    }

    // === FREE: NEWS CLUSTERS (Phase B verification preview) ===
    // Story-level corroboration view for one UTC date. Each cluster
    // includes the contributing article IDs, distinct source count,
    // a corroboration_band tag (single / limited / broad), and a hero
    // article (earliest publishedAt). Computed by the 07:30 UTC daily
    // cron via embedding-based clustering. Free tier returns top 25
    // clusters with optional ?min_sources= filter; premium endpoints
    // and the verified feed land in Phase B.2.

    if (path === '/api/history/news/clusters') {
      const date = url.searchParams.get('date') ?? new Date().toISOString().slice(0, 10);
      if (!isISODate(date)) {
        return jsonResponse(
          { ok: false, error: 'invalid_date', hint: 'date must be YYYY-MM-DD' },
          400,
        );
      }
      const minSourcesRaw = parseInt(url.searchParams.get('min_sources') ?? '1', 10);
      const min_sources = Math.max(1, Math.min(Number.isFinite(minSourcesRaw) ? minSourcesRaw : 1, 50));
      const all = await readClustersForDate(env, date);
      const filtered = all.filter((c) => c.source_count >= min_sources);
      const capped = filtered.slice(0, 25);
      return jsonResponse(
        {
          ok: true,
          tier: 'free',
          date,
          total_clusters: all.length,
          filtered_count: filtered.length,
          returned: capped.length,
          min_sources,
          clusters: capped,
        },
        200,
        3600,
      );
    }

    if (path === '/api/history/news/clusters/dates') {
      const dates = await listClusterDates(env);
      return jsonResponse(
        { ok: true, tier: 'free', count: dates.length, dates },
        200,
        3600,
      );
    }

    // === SECURITY: MITRE CVE LIST ===
    // Single-CVE lookup is lazy-fetched from MITRE's free single-CVE
    // endpoint and cached in KV for 7 days. The "recent" ring + dated
    // index are populated by a daily cron that walks cvelistV5 commit
    // history. Premium /range is a paid date-range query over the index.

    const cveByIdMatch = path.match(/^\/api\/security\/cve\/(CVE-\d{4}-\d{4,7})$/i);
    if (cveByIdMatch) {
      const result = await fetchCVE(env, cveByIdMatch[1]);
      const status = result.ok ? 200 : result.error === 'cve_not_found' ? 404 : result.error === 'invalid_cve_id' ? 400 : 502;
      const cacheSec = result.ok ? 3600 : 60;
      return jsonResponse(
        {
          ok: result.ok,
          cve_id: result.cveId,
          source: result.source,
          fetched_at: result.fetched_at,
          record: result.record,
          attribution: result.attribution,
          ...(result.error ? { error: result.error } : {}),
        },
        status,
        cacheSec,
      );
    }

    if (path === '/api/security/cve/recent') {
      const requested = parseInt(url.searchParams.get('limit') ?? '50', 10);
      const limit = Math.max(1, Math.min(Number.isFinite(requested) ? requested : 50, 100));
      const out = await readRecentCVEs(env, limit);
      return jsonResponse(
        {
          ok: true,
          tier: 'free',
          count: out.ids.length,
          cve_ids: out.ids,
          last_capture: out.meta,
          attribution: CVE_ATTRIBUTION,
          premium: {
            endpoint: '/api/premium/security/cve/range',
            credits_per_call: 1,
            note: 'Premium /range returns CVE IDs across a date range up to 30 days.',
          },
        },
        200,
        300,
      );
    }

    if (path === '/api/security/cve/dates') {
      const dates = await listCVEDates(env);
      return jsonResponse(
        { ok: true, tier: 'free', count: dates.length, dates, attribution: CVE_ATTRIBUTION },
        200,
        3600,
      );
    }

    const cveByDateMatch = path.match(/^\/api\/security\/cve\/by-date\/(\d{4}-\d{2}-\d{2})$/);
    if (cveByDateMatch) {
      const date = cveByDateMatch[1];
      const ids = await readCVEsByDate(env, date);
      return jsonResponse(
        {
          ok: true,
          tier: 'free',
          date,
          count: ids.length,
          cve_ids: ids,
          attribution: CVE_ATTRIBUTION,
        },
        200,
        86400,
      );
    }

    // === SECURITY: CISA KEV (Known Exploited Vulnerabilities) ===
    // Daily cron writes the full catalog to kev:current and harvests
    // entries with dateAdded == today into kev:added:{date}. License is
    // US Government public domain so commercial redistribution is
    // explicitly permitted; attribution block on every response.

    if (path === '/api/security/kev') {
      const catalog = await readKEVCurrent(env);
      const meta = await readKEVMeta(env);
      if (!catalog) {
        return jsonResponse(
          {
            ok: false,
            error: 'not_yet_captured',
            hint: 'KEV catalog will be captured on the next daily cron run.',
          },
          503,
          60,
        );
      }
      const requested = parseInt(url.searchParams.get('limit') ?? '50', 10);
      const limit = Math.max(1, Math.min(Number.isFinite(requested) ? requested : 50, 50));
      const view = summarizeKEVForFreeTier(catalog, limit);
      return jsonResponse(
        {
          ok: true,
          tier: 'free',
          ...view,
          last_capture: meta,
          attribution: KEV_ATTRIBUTION,
          premium: {
            full_catalog: '/api/premium/security/kev/full',
            added_series: '/api/premium/security/kev/series?from=&to=',
            credits_per_call: 1,
            note: 'Free tier returns 50 most-recent entries. Premium /full returns the full untruncated catalog; premium /series returns daily added-entries across a date range up to 90 days.',
          },
        },
        200,
        1800,
      );
    }

    const kevByIdMatch = path.match(/^\/api\/security\/kev\/(CVE-\d{4}-\d{4,7})$/i);
    if (kevByIdMatch) {
      const entry = await readKEVByCVE(env, kevByIdMatch[1]);
      if (!entry) {
        return jsonResponse(
          {
            ok: false,
            error: 'not_in_kev',
            cve_id: kevByIdMatch[1].toUpperCase(),
            hint: 'CVE may exist in MITRE CVE List but not be on the CISA KEV catalog. Try /api/security/cve/{id} for the underlying record.',
            attribution: KEV_ATTRIBUTION,
          },
          404,
          300,
        );
      }
      return jsonResponse(
        {
          ok: true,
          tier: 'free',
          cve_id: entry.cveID,
          entry,
          attribution: KEV_ATTRIBUTION,
        },
        200,
        3600,
      );
    }

    const kevAddedMatch = path.match(/^\/api\/security\/kev\/added\/(\d{4}-\d{2}-\d{2})$/);
    if (kevAddedMatch) {
      const date = kevAddedMatch[1];
      const entries = await readKEVAddedOnDate(env, date);
      return jsonResponse(
        {
          ok: true,
          tier: 'free',
          date,
          count: entries.length,
          entries,
          attribution: KEV_ATTRIBUTION,
        },
        200,
        86400,
      );
    }

    if (path === '/api/security/kev/dates') {
      const dates = await listKEVAddedDates(env);
      return jsonResponse(
        { ok: true, tier: 'free', count: dates.length, dates, attribution: KEV_ATTRIBUTION },
        200,
        3600,
      );
    }

    // === SECURITY: EPSS (Exploit Prediction Scoring System) ===
    // Pure lazy-proxy to FIRST.org's EPSS API with KV caching. License is
    // FIRST.org's free-for-any-use policy; commercial redistribution
    // explicitly permitted. EPSS scores update daily; cache TTLs match
    // (24h for single-CVE current and series, 6h for top-N current,
    // 7d for top-N historical since the past is immutable).

    const epssByIdMatch = path.match(/^\/api\/security\/epss\/(CVE-\d{4}-\d{4,7})$/i);
    if (epssByIdMatch) {
      const result = await fetchEPSSCurrent(env, epssByIdMatch[1]);
      const status = result.ok
        ? 200
        : result.error === 'cve_not_in_epss'
          ? 404
          : result.error === 'invalid_cve_id'
            ? 400
            : 502;
      return jsonResponse(
        {
          ok: result.ok,
          tier: 'free',
          cve_id: result.cve_id,
          source: result.source,
          fetched_at: result.fetched_at,
          score: result.data,
          attribution: result.attribution,
          ...(result.error ? { error: result.error } : {}),
          ...(result.ok
            ? {
                premium: {
                  series_endpoint: '/api/premium/security/epss/series',
                  credits_per_call: 1,
                  note: 'Premium /series returns the full historical time-series of EPSS scores for one CVE.',
                },
              }
            : {}),
        },
        status,
        result.ok ? 3600 : 60,
      );
    }

    // === FINANCE: SEC EDGAR (full-text search + submissions) ===
    // Two complementary endpoints proxying SEC EDGAR. License: US
    // Government public domain (17 USC 105). Commercial redistribution
    // explicitly permitted. SEC fair-access policy requires a contact-
    // identifying User-Agent on every upstream call; we send TF's
    // contact info inside the worker. Search results cache 1h (queries
    // are computationally heavy on SEC's side and highly cacheable);
    // submissions cache 6h (recent filings update intra-day).

    if (path === '/api/sec/edgar/search') {
      const parsed = parseEdgarSearchQuery(url);
      if (!parsed.ok) {
        return jsonResponse({ ok: false, error: parsed.error, hint: parsed.hint }, 400);
      }
      const result = await searchEdgar(env, parsed.query);
      const status = result.ok
        ? 200
        : result.http_status === 429
          ? 503
          : 502;
      return jsonResponse(
        {
          ok: result.ok,
          tier: 'free',
          source: result.source,
          fetched_at: result.fetched_at,
          query: result.query,
          data: result.data,
          attribution: result.attribution,
          ...(result.error ? { error: result.error } : {}),
        },
        status,
        result.ok ? 1800 : 60,
      );
    }

    const edgarSubMatch = path.match(/^\/api\/sec\/edgar\/submissions\/(.+)$/);
    if (edgarSubMatch) {
      const result = await fetchEdgarSubmissions(env, edgarSubMatch[1]);
      const status = result.ok
        ? 200
        : result.error === 'cik_not_found'
          ? 404
          : result.error === 'invalid_cik'
            ? 400
            : 502;
      return jsonResponse(
        {
          ok: result.ok,
          tier: 'free',
          cik: result.cik,
          source: result.source,
          fetched_at: result.fetched_at,
          data: result.data,
          attribution: result.attribution,
          ...(result.error ? { error: result.error } : {}),
        },
        status,
        result.ok ? 3600 : 60,
      );
    }

    // === SECURITY: CISA Vulnrichment ===
    // CISA's authorized-data-publisher enrichment layer on top of MITRE
    // CVE Records. Adds CWE mappings, CVSS v3.1 scoring (where MITRE
    // has none), exploitation evidence, KEV cross-references, and
    // additional vendor-specific advisory references. Lazy-fetched from
    // the cisagov/vulnrichment GitHub repo (develop branch); cached 7d.
    // License: US Government public domain (17 USC 105). Pair with
    // /api/security/cve/{id} (MITRE record) for the most complete view.

    const vulnrichmentMatch = path.match(/^\/api\/security\/vulnrichment\/(CVE-\d{4}-\d{4,7})$/i);
    if (vulnrichmentMatch) {
      const result = await fetchVulnrichment(env, vulnrichmentMatch[1]);
      const status = result.ok
        ? 200
        : result.error === 'cve_not_in_vulnrichment'
          ? 404
          : result.error === 'invalid_cve_id'
            ? 400
            : 502;
      return jsonResponse(
        {
          ok: result.ok,
          tier: 'free',
          cve_id: result.cveId,
          source: result.source,
          fetched_at: result.fetched_at,
          record: result.record,
          attribution: result.attribution,
          ...(result.error ? { error: result.error } : {}),
          ...(result.ok
            ? {
                hint: 'Pair with /api/security/cve/{id} for the MITRE record. Vulnrichment provides CISA enrichment (CWE, CVSS, exploitation evidence) under containers.adp[].',
              }
            : {}),
        },
        status,
        result.ok ? 3600 : 60,
      );
    }

    // === SECURITY: OSV.dev (Open Source Vulnerabilities) ===
    // Lazy-proxy with KV cache to OSV.dev's hosted advisory database.
    // License: Apache License 2.0; commercial redistribution permitted
    // with attribution. Two query modes: by advisory ID (GHSA / CVE /
    // PYSEC / RUSTSEC / etc) or by package descriptor (ecosystem +
    // name + optional version).

    const osvByIdMatch = path.match(/^\/api\/security\/osv\/([A-Z][A-Z0-9-]{2,80})$/i);
    if (osvByIdMatch && osvByIdMatch[1] !== 'package' && osvByIdMatch[1] !== 'ecosystems') {
      const result = await fetchOSVById(env, osvByIdMatch[1]);
      const status = result.ok
        ? 200
        : result.error === 'osv_not_found'
          ? 404
          : result.error === 'invalid_osv_id'
            ? 400
            : 502;
      return jsonResponse(
        {
          ok: result.ok,
          tier: 'free',
          id: result.id,
          source: result.source,
          fetched_at: result.fetched_at,
          advisory: result.data,
          attribution: result.attribution,
          ...(result.error ? { error: result.error } : {}),
        },
        status,
        result.ok ? 3600 : 60,
      );
    }

    if (path === '/api/security/osv/package') {
      const parsed = parseOsvPackageQuery(url);
      if (!parsed.ok) {
        return jsonResponse({ ok: false, error: parsed.error, hint: parsed.hint }, 400);
      }
      const result = await fetchOSVForPackage(env, parsed.query);
      return jsonResponse(
        {
          ok: result.ok,
          tier: 'free',
          source: result.source,
          fetched_at: result.fetched_at,
          query: result.query,
          vulns_count: result.vulns_count,
          data: result.data,
          attribution: result.attribution,
          ...(result.error ? { error: result.error } : {}),
        },
        result.ok ? 200 : 502,
        result.ok ? 1800 : 60,
      );
    }

    if (path === '/api/security/osv/ecosystems') {
      return jsonResponse(
        {
          ok: true,
          tier: 'free',
          count: OSV_SUPPORTED_ECOSYSTEMS.length,
          ecosystems: OSV_SUPPORTED_ECOSYSTEMS,
          attribution: OSV_ATTRIBUTION,
        },
        200,
        86400,
      );
    }

    if (path === '/api/security/epss/top') {
      const requested = parseInt(url.searchParams.get('limit') ?? '20', 10);
      const limit = Math.max(1, Math.min(Number.isFinite(requested) ? requested : 20, 50));
      const result = await fetchEPSSTop(env, limit, null);
      return jsonResponse(
        {
          ok: result.ok,
          tier: 'free',
          source: result.source,
          fetched_at: result.fetched_at,
          count: result.count,
          top: result.data,
          attribution: result.attribution,
          ...(result.error ? { error: result.error } : {}),
          premium: {
            historical_top: '/api/premium/security/epss/top?date=&limit=',
            credits_per_call: 1,
            note: 'Premium /top supports any historical UTC date and returns the top-N as of that date.',
          },
        },
        result.ok ? 200 : 502,
        result.ok ? 1800 : 60,
      );
    }

    // === CLIMATE: NASA POWER (meteorological + solar) ===
    // Pure lazy-proxy to NASA Langley's POWER API with KV caching. License
    // is open-access US Government work, public domain via 17 USC 105.
    // NASA enforces 30 req/min per IP; we are calling from Cloudflare's
    // shared IP space so caching is load-bearing. Cache TTL 7 days.

    if (path === '/api/climate/power/parameters') {
      return jsonResponse(
        {
          ok: true,
          tier: 'free',
          count: POWER_PARAMETER_CATALOG.length,
          parameters: POWER_PARAMETER_CATALOG,
          attribution: POWER_ATTRIBUTION,
          note: 'Curated subset of the most-requested NASA POWER parameters. NASA exposes 100+; pass any documented parameter code to /api/climate/power/daily even if not in this list.',
        },
        200,
        86400,
      );
    }

    // === CLIMATE: USGS Earthquakes (free) ===
    // Lazy-proxy to USGS pre-built GeoJSON summary feeds, refreshed every
    // minute upstream. License: US Government public domain (17 USC §105).
    // Each unique (magnitude, period) tuple is cached in KV; TTL scales
    // with the feed window (60s for the hour feeds, 900s for the month
    // feeds). Returns a flattened earthquake list rather than raw GeoJSON
    // so most agents can read it without geometry-processing knowledge.

    // === CLIMATE: NWS Active Weather Alerts (free) ===
    // Lazy-proxy to NWS active alerts endpoint, refreshed in real time
    // upstream. License: US Government public domain (17 USC §105).
    // Coverage is US states, territories, and marine zones — NWS is
    // US-only. Each unique filter combo is cached in KV with a 60s TTL
    // since active-alerts state changes minute by minute.

    if (path === '/api/climate/weather-alerts') {
      const parsed = parseNWSAlertsQuery(url);
      if (!parsed.ok || !parsed.query) {
        return jsonResponse({ ok: false, error: parsed.error, hint: parsed.hint }, 400);
      }
      const result = await fetchNWSAlerts(env, parsed.query);
      const status = result.ok
        ? 200
        : result.http_status === 429
          ? 503
          : 502;
      return jsonResponse(
        {
          ok: result.ok,
          tier: 'free',
          source: result.source,
          fetched_at: result.fetched_at,
          query: result.query,
          ...(result.feed_metadata ? { feed_metadata: result.feed_metadata } : {}),
          ...(result.alerts ? { count: result.alerts.length, alerts: result.alerts } : {}),
          attribution: result.attribution,
          ...(result.error ? { error: result.error } : {}),
          allowed: {
            severities: NWS_VALID_SEVERITIES,
            urgencies: NWS_VALID_URGENCIES,
            statuses: NWS_VALID_STATUSES,
          },
        },
        status,
        result.ok ? 60 : 60,
      );
    }

    if (path === '/api/climate/earthquakes') {
      const parsed = parseEarthquakeQuery(url);
      if (!parsed.ok || !parsed.query) {
        return jsonResponse({ ok: false, error: parsed.error, hint: parsed.hint }, 400);
      }
      const result = await fetchUSGSEarthquakes(env, parsed.query);
      const status = result.ok
        ? 200
        : result.http_status === 429
          ? 503
          : 502;
      return jsonResponse(
        {
          ok: result.ok,
          tier: 'free',
          source: result.source,
          fetched_at: result.fetched_at,
          query: result.query,
          ...(result.feed_metadata ? { feed_metadata: result.feed_metadata } : {}),
          ...(result.earthquakes
            ? { count: result.earthquakes.length, earthquakes: result.earthquakes }
            : {}),
          attribution: result.attribution,
          ...(result.error ? { error: result.error } : {}),
          allowed: {
            magnitudes: USGS_VALID_MAGNITUDES,
            periods: USGS_VALID_PERIODS,
          },
        },
        status,
        result.ok ? 60 : 60,
      );
    }

    // === ECONOMY: EIA (US Energy Information Administration) ===
    // Lazy-proxy with KV caching to a curated route allowlist on the EIA
    // v2 API. License: US Government public domain (17 USC 105). Requires
    // a free EIA_API_KEY worker secret; degrades gracefully to 503 if
    // the secret is unset (mirrors FRED treatment).

    if (path === '/api/economy/eia/categories') {
      return jsonResponse(
        {
          ok: true,
          tier: 'free',
          count: Object.keys(EIA_ROUTES).length,
          routes: Object.entries(EIA_ROUTES).map(([key, cfg]) => ({
            route: key,
            description: cfg.description,
            default_frequency: cfg.default_frequency,
            example_filters: cfg.example_filters,
            tf_endpoint: `/api/economy/eia/series?route=${encodeURIComponent(key)}`,
          })),
          attribution: EIA_ATTRIBUTION,
        },
        200,
        86400,
      );
    }

    if (path === '/api/economy/eia/series') {
      const parsed = parseEIAQuery(url);
      if (!parsed.ok) {
        return jsonResponse({ ok: false, error: parsed.error, hint: parsed.hint }, 400);
      }
      const result = await fetchEIASeries(env, parsed.query);
      const status = result.ok
        ? 200
        : result.http_status === 429
          ? 503
          : result.http_status === 503
            ? 503
            : 502;
      return jsonResponse(
        {
          ok: result.ok,
          tier: 'free',
          source: result.source,
          fetched_at: result.fetched_at,
          query: result.query,
          data: result.data,
          attribution: result.attribution,
          ...(result.error ? { error: result.error } : {}),
          ...(result.error === 'eia_key_unset'
            ? {
                hint: 'EIA_API_KEY worker secret is not set. Operator must register a free key at https://www.eia.gov/opendata/register.php and run `wrangler secret put EIA_API_KEY`.',
              }
            : {}),
        },
        status,
        result.ok ? 3600 : 60,
      );
    }

    // === HEALTH: OpenFDA (drugs, devices, food) ===
    // Lazy-proxy with KV caching. License: CC0 1.0 Universal Dedication
    // (FDA waived all copyright); commercial redistribution explicitly
    // permitted with no attribution requirement. Five category sub-paths
    // exposed: drug/events, drug/labels, drug/recalls, food/recalls,
    // device/events.

    if (path === '/api/health/fda/categories') {
      return jsonResponse(
        {
          ok: true,
          tier: 'free',
          count: Object.keys(FDA_CATEGORIES).length,
          categories: Object.entries(FDA_CATEGORIES).map(([key, cfg]) => ({
            category: key,
            upstream_path: cfg.upstream,
            description: cfg.description,
            tf_endpoint: `/api/health/fda/${key}`,
          })),
          attribution: FDA_ATTRIBUTION,
        },
        200,
        86400,
      );
    }

    const fdaMatch = path.match(/^\/api\/health\/fda\/(.+)$/);
    if (fdaMatch && isFDACategory(fdaMatch[1])) {
      const category = fdaMatch[1];
      const parsed = parseFDAQuery(category, url);
      if (!parsed.ok) {
        return jsonResponse({ ok: false, error: parsed.error, hint: parsed.hint }, 400);
      }
      const result = await fetchFDAQuery(env, parsed.query);
      const status = result.ok
        ? 200
        : result.http_status === 429
          ? 503
          : 502;
      return jsonResponse(
        {
          ok: result.ok,
          tier: 'free',
          source: result.source,
          fetched_at: result.fetched_at,
          query: result.query,
          data: result.data,
          attribution: result.attribution,
          ...(result.error ? { error: result.error } : {}),
          premium: {
            aggregate_endpoint: '/api/premium/health/fda/aggregate?category=&count_by=',
            credits_per_call: 1,
            note: 'Premium /aggregate exposes openFDA\'s `count` parameter for histogram-by-field across millions of records in a single call (e.g. top 20 drugs with adverse events, top reactions for one drug).',
          },
        },
        status,
        result.ok ? 3600 : 60,
      );
    }

    if (path === '/api/climate/power/daily') {
      const parsed = parsePowerQuery(url, 'daily', { community: 'AG', maxRangeDays: 365 });
      if (!parsed.ok) {
        return jsonResponse({ ok: false, error: parsed.error, hint: parsed.hint }, 400);
      }
      const result = await fetchPowerPoint(env, parsed.query);
      const status = result.ok
        ? 200
        : result.http_status === 429
          ? 503
          : 502;
      return jsonResponse(
        {
          ok: result.ok,
          tier: 'free',
          source: result.source,
          fetched_at: result.fetched_at,
          query: result.query,
          data: result.data,
          attribution: result.attribution,
          ...(result.error ? { error: result.error } : {}),
          premium: {
            hourly_endpoint: '/api/premium/climate/power/hourly',
            credits_per_call: 1,
            note: 'Premium /hourly returns 1-hour-resolution data for the same parameters. Range capped at 30 days due to upstream payload size.',
          },
        },
        status,
        result.ok ? 86400 : 60,
      );
    }

    // === PAID PREMIUM: STATUS LEADERBOARD (Tier 1, 1 credit) ===
    // Same minute-resolution counter source as the free leaderboard, but
    // extends the window to the full 90-day retention horizon and includes
    // incident_count and mttr_minutes (mean time to recover from resolved
    // incidents) per provider. Aimed at SRE/ops teams comparing AI vendor
    // reliability for procurement, vendor negotiations, or post-incident
    // reviews. The data series compounds with time and cannot be backfilled,
    // so it's part of the data moat behind the free endpoint.

    if (path === '/api/premium/status/leaderboard') {
      const payment = await requirePayment(request, env, 1);
      if (!payment.paid) return payment.response!;

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

      const result = await computeLeaderboard(env, range.from, range.to, {
        includeIncidents: true,
      });
      ctx.waitUntil(
        logPremiumUsage(
          env,
          '/api/premium/status/leaderboard',
          request.headers.get('User-Agent') || 'unknown',
          1,
          payment.token,
        ),
      );
      return await premiumResponse(result, payment, 1, request, env);
    }

    // === PAID PREMIUM: ATTENTION INDEX TIME SERIES (Tier 1, 1 credit) ===
    // Per-provider daily attention score over the requested range, with
    // first/last/delta/min/max/avg summary. Backed by the daily snapshot
    // captured on 0 7 * * *. The historical series compounds with time and
    // cannot be backfilled, so it is the moat behind the free /api/attention.
    // 90-day max range, default 30 days back.

    if (path === '/api/premium/attention/series') {
      const payment = await requirePayment(request, env, 1);
      if (!payment.paid) return payment.response!;

      const provider = url.searchParams.get('provider')?.trim();
      if (!provider) {
        return jsonResponse(
          { ok: false, error: 'provider_required', hint: 'Pass ?provider=<id> (e.g. anthropic, openai, google, meta, mistral, cohere, deepseek, xai, perplexity, nvidia, huggingface, cursor)' },
          400,
        );
      }
      const {
        resolveRange: resolveAttentionRange,
        getAttentionSeries,
        MAX_RANGE_DAYS: ATT_MAX,
        DEFAULT_RANGE_DAYS: ATT_DEFAULT,
      } = await import('./attention-history');
      const range = resolveAttentionRange(url.searchParams.get('from'), url.searchParams.get('to'));
      if (!range.ok) {
        return jsonResponse(
          {
            ok: false,
            error: range.error,
            limits: { max_range_days: ATT_MAX, default_range_days: ATT_DEFAULT },
          },
          400,
        );
      }

      const result = await getAttentionSeries(env, provider, range.from, range.to);
      ctx.waitUntil(
        logPremiumUsage(env, '/api/premium/attention/series', request.headers.get('User-Agent') || 'unknown', 1, payment.token),
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

    // === FREE: GPU PRICING TIME SERIES ===
    // /api/gpu/pricing/series?gpu=H100&from=&to=
    // Daily cheapest on-demand and spot for one canonical GPU across all
    // tracked providers, plus pct change start-to-end. Range capped at
    // 90 days. Snapshot is captured daily; cannot be backfilled, so the
    // historical series compounds with time.
    //
    // Moved from /api/premium on 2026-05-06: factual price data is low
    // legal optics on free, and after removing Vast.ai (ToS) only RunPod
    // remains, which doesn't justify a paid gate by itself.

    if (path === '/api/gpu/pricing/series') {
      const gpuParam = url.searchParams.get('gpu')?.trim();
      if (!gpuParam) {
        return jsonResponse({
          error: 'gpu_required',
          hint: 'Pass ?gpu=<canonical> (e.g. H100, A100-80GB)',
        }, 400);
      }
      if (!isCanonicalGPU(gpuParam)) {
        return jsonResponse({ error: 'invalid_gpu' }, 400);
      }
      const range = resolveGpuRange(url.searchParams.get('from'), url.searchParams.get('to'));
      if (!range.ok) {
        return jsonResponse({
          error: range.error,
          limits: {
            max_range_days: GPU_MAX_RANGE_DAYS,
            default_range_days: GPU_DEFAULT_RANGE_DAYS,
          },
        }, 400);
      }

      const result = await getGpuSeries(env, gpuParam as CanonicalGPU, range.from!, range.to!);
      return jsonResponse(result);
    }

    // === PAID PREMIUM: MACRO DIGEST (Tier 1, 1 credit) ===
    // /api/premium/macro/digest
    // First derived-premium endpoint on the May 2026 free-data foundation.
    // Joins BLS + FRED snapshots into a single agent-shaped morning brief:
    // rates section (with yield-curve regime classification), inflation
    // section (with regime classification), employment section (with
    // regime classification), growth + money, FX + commodities, and a
    // 2-3 sentence overall brief. Underlying data is public domain;
    // the gate is on the synthesis (YoY computation, regime
    // classifiers, templated narratives), not on the raw data.

    if (path === '/api/premium/macro/digest') {
      const payment = await requirePayment(request, env, 1);
      if (!payment.paid) return payment.response!;

      const result = await computeMacroDigest(env);
      if (!result.ok) {
        // Route empty-snapshot errors through the no-charge path so
        // agents are not billed for a "data not ready yet" response.
        // Mirrors the pattern in the other six derived-premium handlers.
        return await premiumValidationFailure(
          { error: result.error, ...(result.hint ? { hint: result.hint } : {}) },
          payment, request, env,
        );
      }
      ctx.waitUntil(
        logPremiumUsage(env, '/api/premium/macro/digest', request.headers.get('User-Agent') || 'unknown', 1, payment.token),
      );
      return await premiumResponse(result, payment, 1, request, env);
    }

    // === PAID PREMIUM: AI POLICY TIMELINE (Tier 1, 1 credit) ===
    // /api/premium/policy/timeline
    // Forward + backward calendar over the free /api/policy/ai/registry
    // catalog. Adds temporal layer: relative-to-now classification,
    // days-until-effective per entry, windowed view (default 12 months
    // total), and a next-3-milestones extraction. Pure compute on
    // editorial registry; raw catalog remains free.

    // === PAID PREMIUM: RECESSION WATCH (Tier 1, 1 credit) ===
    // /api/premium/economy/recession-watch
    // Composite recession-risk signal across yield-curve inversion
    // (FRED T10Y2Y) and the Sahm rule (current 3-month unemployment
    // moving avg vs trailing-12-month low). Per-signal red/yellow/
    // green classification with editorial explanation, plus a
    // composite signal and brief synthesis.

    if (path === '/api/premium/economy/recession-watch') {
      const payment = await requirePayment(request, env, 1);
      if (!payment.paid) return payment.response!;

      const result = await computeRecessionWatch(env);
      if (!result.ok) {
        return await premiumValidationFailure(
          { error: result.error, ...(result.hint ? { hint: result.hint } : {}) },
          payment, request, env,
        );
      }

      ctx.waitUntil(
        logPremiumUsage(env, '/api/premium/economy/recession-watch', request.headers.get('User-Agent') || 'unknown', 1, payment.token),
      );
      return await premiumResponse(result, payment, 1, request, env);
    }

    // === PAID PREMIUM: AI RESEARCH VELOCITY (Tier 1, 1 credit) ===
    // /api/premium/research/velocity
    // Adds a velocity layer over the free /api/research/institutions/ai
    // 365-day baseline. Joins it with a fresh OpenAlex 30-day group_by
    // (cached 24h after first fetch) to compute per-institution
    // velocity_ratio = (annualized 30d output) / 365d baseline.
    // Direction classification, notable-movers, by-country and by-type
    // breakdowns. One upstream API call per cache miss.

    if (path === '/api/premium/research/velocity') {
      const payment = await requirePayment(request, env, 1);
      if (!payment.paid) return payment.response!;

      const result = await computeResearchVelocity(env);
      if (!result.ok) {
        // research/velocity has no input schema; all non-ok cases are
        // upstream failures (OpenAlex 429, network timeout, etc).
        // Categorize accordingly so the AFTA receipt's no_charge_reason
        // is accurate; agents can distinguish "I sent bad input" from
        // "their upstream is down" from one signed receipt field.
        return await premiumValidationFailure(
          { error: result.error, ...(result.hint ? { hint: result.hint } : {}) },
          payment, request, env, 'upstream_failure',
        );
      }

      ctx.waitUntil(
        logPremiumUsage(env, '/api/premium/research/velocity', request.headers.get('User-Agent') || 'unknown', 1, payment.token),
      );
      return await premiumResponse(result, payment, 1, request, env);
    }

    // === PAID PREMIUM: FUNDING EXPOSURE (Tier 1, 1 credit) ===
    // /api/premium/funding/exposure
    // Derived metrics over the free /api/funding/portfolio registry:
    // silicon concentration shares, per-investor circular exposure with
    // loop classification, top recipients by inbound capital, co-investor
    // pairs (investors that both hold stakes in the same recipient).

    if (path === '/api/premium/funding/exposure') {
      const payment = await requirePayment(request, env, 1);
      if (!payment.paid) return payment.response!;

      const result = computeFundingExposure();
      if (!result.ok) {
        return await premiumValidationFailure(
          { error: result.error, ...(result.hint ? { hint: result.hint } : {}) },
          payment, request, env, 'upstream_failure',
        );
      }

      ctx.waitUntil(
        logPremiumUsage(env, '/api/premium/funding/exposure', request.headers.get('User-Agent') || 'unknown', 1, payment.token),
      );
      return await premiumResponse({ ...result, capturedAt: result.capturedAt }, payment, 1, request, env);
    }

    // === PAID PREMIUM: ARXIV MILESTONE DETECTOR (Tier 1, 1 credit) ===
    // /api/premium/research/milestones
    // Returns the last 30 days of arXiv preprints flagged is_milestone_candidate
    // by our offline Qwen 3.6 27B per-paper extraction pass. Each paper carries
    // a structured reasoning field stating WHY it cleared the bar (named
    // benchmark + quantified delta, major model release, or novel architecture).
    // Conservative by design: false positives are worse than false negatives.

    if (path === '/api/premium/research/milestones') {
      const payment = await requirePayment(request, env, 1);
      if (!payment.paid) return payment.response!;

      const result = await computeArxivMilestones(env);
      if (!result.ok) {
        return await premiumValidationFailure(
          { error: result.error, ...(result.hint ? { hint: result.hint } : {}) },
          payment, request, env, 'upstream_failure',
        );
      }

      ctx.waitUntil(
        logPremiumUsage(env, '/api/premium/research/milestones', request.headers.get('User-Agent') || 'unknown', 1, payment.token),
      );
      return await premiumResponse({ ...result, capturedAt: result.capturedAt }, payment, 1, request, env);
    }

    // === PAID PREMIUM: ARXIV EMERGING KEYWORDS (Tier 1, 1 credit) ===
    // /api/premium/research/emerging-keywords
    // Top-50 multi-word keyphrases across recent arXiv abstracts ranked by
    // recent-vs-baseline lift (last 30d frequency / prior 90d frequency,
    // smoothed). Each entry carries 2-5 example arxiv_ids so the agent can
    // dive in. Updated weekly from the offline Qwen extraction.

    if (path === '/api/premium/research/emerging-keywords') {
      const payment = await requirePayment(request, env, 1);
      if (!payment.paid) return payment.response!;

      const result = await computeArxivEmergingKeywords(env);
      if (!result.ok) {
        return await premiumValidationFailure(
          { error: result.error, ...(result.hint ? { hint: result.hint } : {}) },
          payment, request, env, 'upstream_failure',
        );
      }

      ctx.waitUntil(
        logPremiumUsage(env, '/api/premium/research/emerging-keywords', request.headers.get('User-Agent') || 'unknown', 1, payment.token),
      );
      return await premiumResponse({ ...result, capturedAt: result.capturedAt }, payment, 1, request, env);
    }

    // === PAID PREMIUM: ARXIV TOPIC SEARCH (Tier 1, 1 credit) ===
    // /api/premium/research/topic-search
    // Structured search over the arXiv preprint corpus using the TF derived
    // taxonomy. Filters: subfield_tag, methodology_bucket, since, until,
    // milestone_only. Returns up to 100 papers per call, sorted by date desc.
    // arXiv's native search has no concept of methodology bucket or our
    // subfield taxonomy, so this is the gate.

    if (path === '/api/premium/research/topic-search') {
      const payment = await requirePayment(request, env, 1);
      if (!payment.paid) return payment.response!;

      const taxonomies = await loadArxivTaxonomies(env);
      const subfieldList = taxonomies?.subfields ?? null;
      const methodList = taxonomies?.methodologies ?? null;

      const limitParam = url.searchParams.get('limit');
      const offsetParam = url.searchParams.get('offset');
      const milestoneOnlyParam = url.searchParams.get('milestone_only');
      const limit = limitParam != null ? parseInt(limitParam, 10) : undefined;
      const offset = offsetParam != null ? parseInt(offsetParam, 10) : undefined;
      const input = {
        subfield_tag: url.searchParams.get('subfield_tag') ?? undefined,
        methodology_bucket: url.searchParams.get('methodology_bucket') ?? undefined,
        since: url.searchParams.get('since') ?? undefined,
        until: url.searchParams.get('until') ?? undefined,
        milestone_only: milestoneOnlyParam === '1' || milestoneOnlyParam === 'true',
        limit: Number.isFinite(limit as number) ? limit : undefined,
        offset: Number.isFinite(offset as number) ? offset : undefined,
      };

      const validation = validateArxivTopicSearchInput(input, subfieldList, methodList);
      if (validation) {
        return await premiumValidationFailure(
          { error: validation.error, ...(validation.hint ? { hint: validation.hint } : {}), ...(validation.valid ? { valid: validation.valid } : {}) },
          payment, request, env,
        );
      }

      const result = await computeArxivTopicSearch(env, input);
      if (!result.ok) {
        return await premiumValidationFailure(
          { error: result.error, ...(result.hint ? { hint: result.hint } : {}) },
          payment, request, env, 'upstream_failure',
        );
      }

      ctx.waitUntil(
        logPremiumUsage(env, '/api/premium/research/topic-search', request.headers.get('User-Agent') || 'unknown', 1, payment.token),
      );
      return await premiumResponse({ ...result, capturedAt: result.capturedAt }, payment, 1, request, env);
    }

    // === PAID PREMIUM: ARXIV LAB PRODUCTIVITY (Tier 1, 1 credit) ===
    // /api/premium/research/lab-productivity
    // Top labs by paper count over rolling 30/90/365-day windows from the
    // offline Qwen extraction. Filterable by window and affiliation_type
    // (industry / academia / government / nonprofit / mixed / unknown).
    // arXiv has no native concept of normalized lab attribution; this lives
    // entirely on TF derivations from the abstract header.

    if (path === '/api/premium/research/lab-productivity') {
      const payment = await requirePayment(request, env, 1);
      if (!payment.paid) return payment.response!;

      const limitParam = url.searchParams.get('limit');
      const limit = limitParam != null ? parseInt(limitParam, 10) : undefined;
      const input = {
        window: url.searchParams.get('window') ?? undefined,
        affiliation_type: url.searchParams.get('affiliation_type') ?? undefined,
        limit: Number.isFinite(limit as number) ? limit : undefined,
      };

      const validation = validateArxivLabProductivityInput(input);
      if (validation) {
        return await premiumValidationFailure(
          { error: validation.error, ...(validation.hint ? { hint: validation.hint } : {}), ...(validation.valid ? { valid: validation.valid } : {}) },
          payment, request, env,
        );
      }

      const result = await computeArxivLabProductivity(env, input);
      if (!result.ok) {
        return await premiumValidationFailure(
          { error: result.error, ...(result.hint ? { hint: result.hint } : {}) },
          payment, request, env, 'upstream_failure',
        );
      }

      ctx.waitUntil(
        logPremiumUsage(env, '/api/premium/research/lab-productivity', request.headers.get('User-Agent') || 'unknown', 1, payment.token),
      );
      return await premiumResponse({ ...result, capturedAt: result.capturedAt }, payment, 1, request, env);
    }

    // === PAID PREMIUM: PYPI PACKAGES MOMENTUM (Tier 1, 1 credit) ===
    // /api/premium/packages/pypi/momentum
    // Adds a momentum layer over the free /api/packages/pypi/ai-trending:
    // momentum_ratio per package (last_week vs weekly avg over last_month),
    // velocity_ratio (today annualized vs last_week pace), direction
    // classification (accelerating / steady / decelerating /
    // insufficient_data), notable-movers extraction, by-category counts.
    // npm momentum is deferred until snapshot history accumulates
    // (npm's downloads endpoint only returns last_week per call).

    if (path === '/api/premium/packages/pypi/momentum') {
      const payment = await requirePayment(request, env, 1);
      if (!payment.paid) return payment.response!;

      const result = await computePackagesMomentum(env);
      if (!result.ok) {
        // packages/pypi/momentum has no input schema; all non-ok cases
        // are upstream failures (pypistats 429, snapshot KV miss, etc).
        return await premiumValidationFailure(
          { error: result.error, ...(result.hint ? { hint: result.hint } : {}) },
          payment, request, env, 'upstream_failure',
        );
      }

      ctx.waitUntil(
        logPremiumUsage(env, '/api/premium/packages/pypi/momentum', request.headers.get('User-Agent') || 'unknown', 1, payment.token),
      );
      return await premiumResponse(result, payment, 1, request, env);
    }

    // === PAID PREMIUM: ECONOMY SERIES FULL HISTORY (Tier 1, 1 credit) ===
    // /api/premium/economy/series/{source}/{series_id}
    // Full upstream history for any BLS or FRED series, normalized
    // into a canonical observation shape with TF-computed YoY series,
    // 3-month and 12-month moving averages, min/max identification,
    // and 3-observation trend direction. Free-tier /api/economy/* caps
    // at 24 (BLS) or 90 (FRED) observations; this is the full archive
    // plus compute. KV-cached at 6h to amortize upstream calls.

    {
      const seriesMatch = path.match(/^\/api\/premium\/economy\/series\/([^/]+)\/([^/]+)$/);
      if (seriesMatch) {
        const sourceParam = decodeURIComponent(seriesMatch[1]).toLowerCase();
        const seriesIdParam = decodeURIComponent(seriesMatch[2]);

        const payment = await requirePayment(request, env, 1);
        if (!payment.paid) return payment.response!;

        if (!isValidEconomySource(sourceParam)) {
          return await premiumValidationFailure(
            { error: 'invalid_source', valid: ['bls', 'fred'] },
            payment, request, env,
          );
        }

        const result = await getEconomySeriesHistory(env, sourceParam, seriesIdParam);
        if (!result.ok) {
          // Validation-class errors get the no-charge schema_validation_failure path;
          // upstream-fetch failures use the same path because the agent did not get
          // the data and should not be billed for it.
          return await premiumValidationFailure(
            { error: result.error, ...(result.hint ? { hint: result.hint } : {}) },
            payment, request, env,
          );
        }

        ctx.waitUntil(
          logPremiumUsage(env, '/api/premium/economy/series', request.headers.get('User-Agent') || 'unknown', 1, payment.token),
        );
        return await premiumResponse(result, payment, 1, request, env);
      }
    }

    if (path === '/api/premium/policy/timeline') {
      const payment = await requirePayment(request, env, 1);
      if (!payment.paid) return payment.response!;

      const parsed = parseTimelineParams(url.searchParams);
      if (parsed.error) {
        return await premiumValidationFailure(
          {
            error: parsed.error,
            limits: { max_days_back: 365 * 5, max_days_forward: 365 * 5 },
          },
          payment, request, env,
        );
      }

      const result = computePolicyTimeline({
        daysBack: parsed.daysBack,
        daysForward: parsed.daysForward,
        jurisdiction: parsed.jurisdiction,
      });

      if (!result.ok) {
        return await premiumValidationFailure(
          { error: result.error, ...(result.hint ? { hint: result.hint } : {}) },
          payment, request, env,
        );
      }

      ctx.waitUntil(
        logPremiumUsage(env, '/api/premium/policy/timeline', request.headers.get('User-Agent') || 'unknown', 1, payment.token),
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

    // === PAID PREMIUM: VR / AR / XR NEWS SEARCH (Tier 3, 3 credits) ===
    // Searchable archive over vr.org's RSS aggregator + VR.org Originals,
    // pulled to TF KV every hour. Tier 3 (3 credits) because the index is
    // niche and value-dense for agents covering the spatial computing beat.
    // 90-min freshness SLA covers the hourly cron with headroom; if vr.org
    // is lagging, the call goes no-charge automatically.

    // /api/premium/vr/news/search was deprecated 2026-05-03 (premium quality
    // audit). Niche audience and the only Tier-3 endpoint at 3 credits.
    // Underlying searchVrNews() helper remains in vr-aggregator.ts in case
    // we want to re-expose it as free later. Free /api/vr/news and
    // /api/vr/originals continue to serve VR data.

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
      let body: { token?: unknown; cost?: unknown; endpoint?: unknown; no_charge_reason?: unknown; reservation_id?: unknown };
      try {
        body = await request.json();
      } catch {
        return jsonResponse({ error: 'bad_json' }, 400, 0);
      }
      const token = typeof body?.token === 'string' ? body.token : '';
      const costRaw = typeof body?.cost === 'number' ? body.cost : NaN;
      const endpoint = typeof body?.endpoint === 'string' ? body.endpoint : '';
      const reasonRaw = typeof body?.no_charge_reason === 'string' ? body.no_charge_reason : null;
      const reservationId = typeof body?.reservation_id === 'string' && body.reservation_id ? body.reservation_id : undefined;
      const validReasons: Array<NonNullable<NoChargeReason>> = ['5xx', 'circuit_breaker', 'schema_validation_failure', 'stale_data'];
      const noChargeReason: NoChargeReason =
        reasonRaw && (validReasons as string[]).includes(reasonRaw)
          ? (reasonRaw as NonNullable<NoChargeReason>)
          : null;
      if (!token || !endpoint || !Number.isFinite(costRaw) || costRaw < 0) {
        return jsonResponse({ error: 'bad_request' }, 400, 0);
      }
      const cost = Math.floor(costRaw);
      const result = await commitInternal(env, { token, cost, endpoint, noChargeReason, reservationId });

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
    //
    // Hardening pre-check: any /api/admin/* request first goes through
    // a tight per-IP rate limiter (5/min/IP), then a 401 if the key is
    // missing or wrong. The rate limiter counts ALL admin requests,
    // including bad-key ones, so a runaway loop or a brute-force probe
    // saturates the limiter rather than the worker's request budget.
    // The 401 (vs. 404) gives clearer telemetry for separating typo'd
    // paths from auth failures on real admin paths.
    if (path.startsWith('/api/admin/')) {
      const adminIp = getClientIP(request);
      const adminRate = checkAdminIPRateLimit(adminIp);
      if (!adminRate.allowed) {
        return rateLimitedResponse(adminRate);
      }
      if (!isAuthorizedAdmin(env, url.searchParams.get('key'))) {
        return jsonResponse(
          {
            ok: false,
            error: 'unauthorized',
            message: 'admin endpoint requires a valid ?key= param',
          },
          401,
          0,
        );
      }
    }

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

    // Admin: anomaly event log. Read-only view of the most recent 200
    // detected per-token spend anomalies (rolling 7-day hourly buffer
    // + median baseline + multiplier threshold + credit floor). Each
    // event records a 16-char token prefix, the hour, severity
    // (warning|critical), the observed multiplier, and the baseline
    // median that was exceeded. Use this to spot leaked tokens whose
    // burn rate is well above their own historical pace, even when
    // pacing under the circuit breaker.

    // /api/admin/kill-switch
    //   GET ?key=<ADMIN_KEY>                         status + audit log
    //   POST ?key=<ADMIN_KEY>&action=on|off          flip the KV-flag side
    // The env-secret side (KILL_SWITCH_KV_WRITES) is independently controlled
    // via `wrangler secret put` and OR-combined with this flag.
    if (path === '/api/admin/kill-switch' && isAuthorizedAdmin(env, url.searchParams.get('key'))) {
      if (request.method === 'POST') {
        const action = url.searchParams.get('action');
        if (action !== 'on' && action !== 'off') {
          return jsonResponse({ ok: false, error: 'invalid_action', valid: ['on', 'off'] }, 400);
        }
        const actor = url.searchParams.get('actor') || 'admin endpoint';
        const newState = await setKillSwitch(env, action === 'on', actor);
        return jsonResponse({ ok: true, action, state: newState }, 200, 0);
      }
      const state = await getKillSwitchState(env);
      const audit = await getKillSwitchAuditLog(env);
      return jsonResponse({
        ok: true,
        state,
        audit_recent: audit.slice(-10).reverse(),
        env_secret_set: !!env.KILL_SWITCH_KV_WRITES,
        hint: state.active
          ? 'Kill switch ACTIVE. Non-critical KV writes are no-ops. Critical writes (pay:credits, pay:tx, pay:quote) still fire.'
          : 'Kill switch inactive. All writes operate normally.',
      }, 200, 0);
    }

    // /api/admin/backup/run  POST&key=<ADMIN_KEY>  Trigger an ad-hoc KV backup to R2
    // /api/admin/backup/list GET &key=<ADMIN_KEY>  List recent backup dates + object sizes
    // /api/admin/backup/manifest GET &key=&date=YYYY-MM-DD  Read a manifest by date
    if (path === '/api/admin/backup/run' && isAuthorizedAdmin(env, url.searchParams.get('key'))) {
      if (request.method !== 'POST') {
        return jsonResponse({ ok: false, error: 'POST_required' }, 405);
      }
      try {
        const manifest = await backupKvToR2(env, 'admin', env.ENVIRONMENT || 'unknown');
        return jsonResponse({ ok: true, manifest }, 200, 0);
      } catch (e) {
        return jsonResponse({ ok: false, error: e instanceof Error ? e.message : String(e) }, 500);
      }
    }

    if (path === '/api/admin/backup/list' && isAuthorizedAdmin(env, url.searchParams.get('key'))) {
      try {
        const limit = Math.min(90, Math.max(1, parseInt(url.searchParams.get('limit') || '30', 10) || 30));
        const recent = await listRecentBackups(env, limit);
        return jsonResponse({ ok: true, count: recent.length, backups: recent }, 200, 0);
      } catch (e) {
        return jsonResponse({ ok: false, error: e instanceof Error ? e.message : String(e) }, 500);
      }
    }

    if (path === '/api/admin/backup/manifest' && isAuthorizedAdmin(env, url.searchParams.get('key'))) {
      const date = url.searchParams.get('date');
      if (!date || !/^\d{4}-\d{2}-\d{2}$/.test(date)) {
        return jsonResponse({ ok: false, error: 'date_param_required_YYYY-MM-DD' }, 400);
      }
      try {
        const manifest = await readManifest(env, date);
        if (!manifest) return jsonResponse({ ok: false, error: 'manifest_not_found', date }, 404);
        return jsonResponse({ ok: true, manifest }, 200, 0);
      } catch (e) {
        return jsonResponse({ ok: false, error: e instanceof Error ? e.message : String(e) }, 500);
      }
    }

    if (path === '/api/admin/anomalies' && isAuthorizedAdmin(env, url.searchParams.get('key'))) {
      const events = await getAnomalyEvents(env);
      const severityFilter = url.searchParams.get('severity');
      const filtered = severityFilter
        ? events.filter(e => e.severity === severityFilter)
        : events;
      // Newest first for human reading.
      const sorted = [...filtered].sort((a, b) => b.detected_at.localeCompare(a.detected_at));
      return jsonResponse({
        ok: true,
        count: sorted.length,
        events: sorted,
        filters: { severity: severityFilter },
      }, 200, 0);
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
      if (task === 'opportunities') {
        const result = await captureAgentOpportunities(env);
        let alertResult = null;
        if (result.ok && url.searchParams.get('with_alerts') === 'true') {
          const snap = await getAgentOpportunitiesLatest(env);
          if (snap) alertResult = await checkAndSendOpportunityAlerts(env, snap);
        }
        return jsonResponse({
          message: 'Agent opportunities scan ran',
          ...result,
          ...(alertResult ? { alerts: alertResult } : {}),
        });
      }
      if (task === 'mcp-registry') {
        const result = await captureRegistrySnapshot(env);
        return jsonResponse({ message: 'MCP registry snapshot captured', ...result });
      }
      if (task === 'papers') {
        const result = await captureDailyPapers(env);
        return jsonResponse({ message: 'AI papers snapshot captured', ...result });
      }
      if (task === 'arxiv') {
        const result = await captureArxivSnapshot(env);
        return jsonResponse({ message: 'arXiv snapshot captured', ...result });
      }
      if (task === 'hf') {
        const result = await captureHFSnapshot(env);
        return jsonResponse({ message: 'HF trending snapshot captured', ...result });
      }
      if (task === 'hot-issues') {
        const result = await captureHotIssues(env);
        return jsonResponse({ message: 'Hot issues snapshot captured', ...result });
      }
      if (task === 'reddit') {
        const result = await captureRedditSnapshot(env);
        return jsonResponse({ message: 'Reddit snapshot captured', ...result });
      }
      if (task === 'openrouter') {
        const result = await captureORSnapshot(env);
        return jsonResponse({ message: 'OpenRouter catalog snapshot captured', ...result });
      }
      if (task === 'hf-daily-papers') {
        const result = await captureHFDailyPapers(env);
        return jsonResponse({ message: 'HF daily papers snapshot captured', ...result });
      }
      if (task === 'probe') {
        const result = await runProbeCycle(env);
        return jsonResponse({ message: 'Probe cycle ran', ...result });
      }
      if (task === 'probe-rollup') {
        const result = await rollupProbeYesterday(env);
        return jsonResponse({ message: 'Probe daily rollup ran', ...result });
      }
      if (task === 'fred') {
        const result = await refreshFREDIndicators(env);
        return jsonResponse({ message: 'FRED indicators refreshed', ...result });
      }
      if (task === 'bls') {
        const result = await refreshBLSIndicators(env);
        return jsonResponse({ message: 'BLS indicators refreshed', ...result });
      }
      if (task === 'npm-ai') {
        const result = await refreshNpmTrending(env);
        return jsonResponse({ message: 'npm AI trending refreshed', ...result });
      }
      if (task === 'pypi-ai') {
        const result = await refreshPyPITrending(env);
        return jsonResponse({ message: 'PyPI AI trending refreshed', ...result });
      }
      if (task === 'openalex') {
        const result = await refreshOpenAlexAIInstitutions(env);
        return jsonResponse({ message: 'OpenAlex AI institutions refreshed', ...result });
      }
      if (task === 'hf-leaderboard') {
        const result = await captureHfLeaderboard(env);
        return jsonResponse({ message: 'HF Open LLM Leaderboard captured', ...result });
      }
      if (task === 'nflverse') {
        const result = await captureNFLverseDaily(env);
        return jsonResponse({ message: 'nflverse players + schedule captured', ...result });
      }
      if (task === 'sec-tickers') {
        const result = await captureSECTickersDaily(env);
        return jsonResponse({ message: 'SEC company tickers captured', ...result });
      }
      if (task === 'sports-news') {
        const [nfl, mlb] = await Promise.all([pollNFLNews(env), pollMLBNews(env)]);
        return jsonResponse({ message: 'Sports news polled', nfl, mlb });
      }
      if (task === 'ai-supply-chain-iocs') {
        try {
          const snap = await refreshAiSupplyChainIocs(env);
          return jsonResponse({
            message: 'AI supply-chain IOC feed refreshed',
            total: snap.total,
            generated_at: snap.generated_at,
          });
        } catch (err) {
          const msg = err instanceof Error ? err.message : String(err);
          const stack = err instanceof Error ? (err.stack ?? '') : '';
          console.error('refreshAiSupplyChainIocs threw:', msg, stack);
          return jsonResponse(
            { ok: false, error: 'refresh_failed', message: msg, stack: stack.split('\n').slice(0, 6) },
            500,
            0,
          );
        }
      }
      if (task === 'cluster') {
        const dateParam = url.searchParams.get('date');
        const dateOverride = dateParam && /^\d{4}-\d{2}-\d{2}$/.test(dateParam) ? dateParam : undefined;
        const thresholdParam = url.searchParams.get('threshold');
        const parsedThreshold = thresholdParam ? Number(thresholdParam) : NaN;
        const thresholdOverride =
          Number.isFinite(parsedThreshold) && parsedThreshold > 0 && parsedThreshold < 1
            ? parsedThreshold
            : undefined;
        const result = await runDailyClustering(env, new Date(), dateOverride, thresholdOverride);
        return jsonResponse({
          message: 'News clustering pass ran',
          ...result,
          ...(thresholdOverride !== undefined ? { threshold_override: thresholdOverride } : {}),
        });
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
      // Premium leaderboard rank-change watches. Computed from the same
      // counter data we already accumulate; firing every 10 min is fast
      // enough for SRE-level alerting without overshooting the actual
      // cadence at which the 7-day leaderboard meaningfully shifts.
      await run('runLeaderboardWatchCycle', () => runLeaderboardWatchCycle(env));
    } else if (cron === '*/2 * * * *') {
      // Status polling cadence is the public promise behind every
      // /is-X-down page and the homepage alert bar ("polled every
      // 2 minutes"). Six providers × ~3 KV writes × 720 runs/day
      // = ~13k writes/day, well under the 100k/day free-tier cap.
      await run('pollStatusPages', () => pollStatusPages(env));
    } else if (cron === '0 * * * *') {
      // Hourly: refresh RSS + status + rolling snapshot
      rssResult = await run('pollRSSFeeds', () => pollRSSFeeds(env));
      await run('pollStatusPages', () => pollStatusPages(env));
      await run('captureAllSnapshots', () => captureAllSnapshots(env));
      // Pull VR/AR/XR data from vr.org (supportive site in the network).
      // vr.org refreshes every 15 min; hourly downstream is plenty.
      await run('refreshVrData', () => refreshVrData(env));
      // NFL news aggregation. Hourly during all seasons; sources publish
      // year-round (free agency, draft, training camp, regular season).
      await run('pollNFLNews', () => pollNFLNews(env));
      // MLB news aggregation. Same hourly cadence; sources publish
      // year-round (offseason moves, spring training, regular season,
      // playoffs).
      await run('pollMLBNews', () => pollMLBNews(env));
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
      // Daily AI Attention Index snapshot. Compounds into a multi-month
      // series of per-provider attention. Backs /api/attention/history
      // (free) and /api/premium/attention/series (1 credit).
      const { captureAttentionSnapshot } = await import('./attention-history');
      await run('captureAttentionSnapshot', () => captureAttentionSnapshot(env));
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
    } else if (cron === '0 11 * * *') {
      // Daily 11:00 AM UTC: capture top AI/ML papers from Semantic Scholar.
      // Five fan-out queries with throttling, dedup by paperId, rank by
      // citation count. Daily snapshot keyed under papers:daily:{date}
      // compounds into a future premium time series.
      await run('captureDailyPapers', () => captureDailyPapers(env));
    } else if (cron === '30 11 * * *') {
      // Daily 11:30 AM UTC: capture recent arXiv submissions in
      // cs.AI/cs.LG/cs.CL/cs.CV. Single Atom API call, parsed and deduped
      // by arxivId. Daily snapshot keyed under arxiv:daily:{date}.
      await run('captureArxivSnapshot', () => captureArxivSnapshot(env));
    } else if (cron === '0 12 * * *') {
      // Daily 12:00 UTC: capture top 30 most-downloaded models + datasets
      // on Hugging Face. Daily snapshot keyed under hf:daily:{date} so we
      // can compute day-over-day download deltas as a true trending signal.
      await run('captureHFSnapshot', () => captureHFSnapshot(env));
    } else if (cron === '30 12 * * *') {
      // Daily 12:30 UTC: capture currently-hot GitHub issues across
      // AI topics (llm, ai-agents, large-language-models, machine-learning,
      // transformer). 5 fan-out search queries throttled, deduped by
      // url, top 30 by comment count. Daily snapshot keyed under
      // issues:daily:{date}. Backs free /api/issues/hot.
      await run('captureHotIssues', () => captureHotIssues(env));
    } else if (cron === '0 13 * * *') {
      // Daily 13:00 UTC: capture currently-hot threads in 7
      // AI-relevant subreddits (LocalLLaMA, MachineLearning, ClaudeAI,
      // OpenAI, singularity, artificial, AI_Agents). 7 fan-out fetches
      // throttled, deduped by post id, top 30 by score. Daily snapshot
      // keyed under reddit:daily:{date}. Backs free /api/reddit/trending.
      await run('captureRedditSnapshot', () => captureRedditSnapshot(env));
    } else if (cron === '30 13 * * *') {
      // Daily 13:30 UTC: scan GitHub for new submission/distribution
      // opportunities for TensorFeed. Seven fan-out queries on the
      // anthropics, openai, microsoft, modelcontextprotocol orgs plus
      // mcp/x402/agent-skill keyword sweeps. Throttled, deduped by
      // full_name, scored by signal_weight * recency + log10(stars).
      // Daily snapshot keyed under opps:daily:{date}. Backs free
      // /api/agents/opportunities. After capture, diff against
      // yesterday's snapshot and email evan@tensorfeed.ai if any new
      // alert-worthy repos showed up (high-value-signal orgs always,
      // keyword sweeps gated at 100+ stars).
      await run('captureAgentOpportunities', async () => {
        const result = await captureAgentOpportunities(env);
        if (result.ok) {
          const snap = await getAgentOpportunitiesLatest(env);
          if (snap) {
            await checkAndSendOpportunityAlerts(env, snap);
          }
        }
        return result;
      });
    } else if (cron === '0 14 * * *') {
      // Daily 14:00 UTC: capture the OpenRouter cross-provider model
      // catalog (200+ models normalized across 50+ inference providers
      // with per-token pricing, context window, modality, and provider
      // metadata). Single API call, no auth. Daily snapshot keyed
      // under or:daily:{date}. Backs free /api/openrouter/models.
      await run('captureORSnapshot', () => captureORSnapshot(env));
    } else if (cron === '15 14 * * *') {
      // Daily 14:15 UTC: capture HF Daily Papers (editor-curated set of
      // AI papers worth reading + community upvotes/comments). Single
      // API call to huggingface.co/api/daily_papers. Daily snapshot
      // keyed under hf-papers:daily:{date}. Backs free
      // /api/papers/hf-daily.
      await run('captureHFDailyPapers', () => captureHFDailyPapers(env));
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
      // historical series. Compounds into the data behind
      // /api/gpu/pricing/series (free).
      await run('captureGpuDaily', () => captureGpuDaily(env));
    } else if (cron === '0 6 * * *') {
      // Daily 06:00 UTC: ingest nflverse-data CSV releases (players,
      // schedule). CC-BY-4.0 source, attribution shipped on every
      // response. Powers /api/sports/nfl/players and
      // /api/sports/nfl/schedule.
      await run('captureNFLverseDaily', () => captureNFLverseDaily(env));
    } else if (cron === '15 4 * * *') {
      // Daily 04:15 UTC: refresh SEC company tickers (single ~1 MB JSON
      // file from data.sec.gov). Public-domain US Government work; no
      // API key required. Powers /api/sec/company-tickers as the grounding
      // lookup for finance agents (ticker -> CIK before hitting EDGAR
      // filings or XBRL fundamentals). Slot chosen between OpenAlex
      // (04:00) and BLS (05:00).
      await run('captureSECTickersDaily', () => captureSECTickersDaily(env));
    } else if (cron === '30 7 * * *') {
      // Daily 07:30 UTC: news-history Phase B clustering pass
      // (worker/src/news-clustering.ts). Reads yesterday's news daily
      // snapshot, embeds article titles + snippets via Workers AI
      // (@cf/baai/bge-base-en-v1.5), runs single-link cosine clustering
      // at threshold 0.82, and persists per-cluster source corroboration
      // counts. Foundation for the verified-feed product. Slot picked
      // to fire 30 min after the 07:00 hourly RSS poll has completed.
      await run('runDailyClustering', () => runDailyClustering(env));
    } else if (cron === '30 4 * * *') {
      // Daily 04:30 UTC: walk the cvelistV5 GitHub repo's commit history
      // for the last 36h, harvest added/modified CVE-* file paths,
      // populate cve:recent ring + cve:by-date:{date} index. Lazy-fetch
      // single records via /api/security/cve/{id} on demand. License:
      // MITRE CVE Terms of Use, commercial redistribution permitted.
      // Powers /api/security/cve/recent, /api/security/cve/by-date,
      // /api/security/cve/dates, and premium /api/premium/security/cve/range.
      await run('captureRecentCVEs', () => captureRecentCVEs(env));
    } else if (cron === '45 4 * * *') {
      // Daily 04:45 UTC: capture Hugging Face Open LLM Leaderboard v2.
      // Paginates the open-llm-leaderboard/contents dataset via the
      // public datasets-server.huggingface.co API. Normalizes field
      // names (HF uses emoji-prefixed column names that occasionally
      // drift), validates >=50 models + per-task coverage before commit
      // so a one-off upstream schema shift never corrupts the dated
      // history. Writes hf-leaderboard:latest + hf-leaderboard:date:{date}
      // + updates hf-leaderboard:dates index. Powers free
      // /api/hf-leaderboard/latest and future premium series endpoints.
      await run('captureHfLeaderboard', async () => {
        const r = await captureHfLeaderboard(env);
        if (!r.ok) {
          console.error(`hf-leaderboard capture failed: ${r.reason}`);
          return;
        }
        console.log(`hf-leaderboard captured ${r.total_models} models for ${r.capturedAt}`);
      });
    } else if (cron === '30 6 * * *') {
      // Daily 06:30 UTC: refresh the CISA KEV catalog (single ~3 MB JSON
      // from cisa.gov). License: US Government public domain. Writes the
      // full catalog to kev:current, harvests entries with dateAdded ==
      // today into kev:added:{date}, updates the index. Powers
      // /api/security/kev, /api/security/kev/{cve_id},
      // /api/security/kev/added/{date}, /api/security/kev/dates, and
      // premium /api/premium/security/kev/full + /series.
      await run('captureKEV', () => captureKEV(env));
    } else if (cron === '30 3 * * *') {
      // Daily 03:30 UTC: refresh weekly download counts for the
      // curated AI/ML npm package list. One bulk call to api.npmjs.org
      // for unscoped names plus per-package calls for scoped names.
      // Powers /api/packages/npm/ai-trending.
      await run('refreshNpmTrending', () => refreshNpmTrending(env));
    } else if (cron === '45 3 * * *') {
      // Daily 03:45 UTC: refresh monthly download counts for the
      // curated AI/ML PyPI package list via pypistats.org. Sequential
      // per-package calls; small infrastructure upstream so we are
      // deliberately polite. Powers /api/packages/pypi/ai-trending.
      await run('refreshPyPITrending', () => refreshPyPITrending(env));
    } else if (cron === '0 4 * * *') {
      // Daily 04:00 UTC: refresh top AI research institutions
      // (OpenAlex CC0). Two API calls per tick: group_by works on the
      // AI concept (C154945302), then enrich the top 100 institutions.
      // Powers /api/research/institutions/ai.
      await run('refreshOpenAlexAIInstitutions', () => refreshOpenAlexAIInstitutions(env));
    } else if (cron === '0 5 * * *') {
      // Daily 05:00 UTC: refresh BLS economic indicators (10 series via
      // public V1 GET endpoint). Public domain. Sequential to stay
      // polite within api.bls.gov's per-IP envelope; on partial failure
      // we retain prior snapshot values for missing series so the
      // catalog never goes blank from a single bad fetch.
      await run('refreshBLSIndicators', () => refreshBLSIndicators(env));
    } else if (cron === '30 5 * * *') {
      // Daily 05:30 UTC: refresh FRED macro indicators. Public-domain
      // data behind a free-registration API key; skips gracefully when
      // FRED_API_KEY is unset. Same partial-failure pattern as BLS.
      await run('refreshFREDIndicators', () => refreshFREDIndicators(env));
      // After both BLS (05:00) and FRED (05:30) snapshots are fresh,
      // run the macro indicator watch cycle. Diffs current snapshots
      // against the stored baseline, fires matching watches, persists
      // new baseline. Cheap when no watches registered.
      await run('runMacroIndicatorWatchCycle', () => runMacroIndicatorWatchCycle(env));
    } else if (cron === '15 2 * * *') {
      // Daily 02:15 UTC: crawl the x402 publisher seed list and refresh
      // the registry snapshot. Politeness-paced (800ms between fetches);
      // tiny seed list at MVP.
      await run('refreshX402Registry', () => refreshX402Registry(env));
    } else if (cron === '15 6 * * *') {
      // Daily 06:15 UTC: KV → R2 backup. Layer 1 of the disaster
      // recovery plan. Walks every configured KV namespace, gzips,
      // uploads to r2://tensorfeed-backups/{date}/. No-ops if the
      // BACKUPS_R2 binding is missing (e.g. in dev environments
      // where the bucket has not been provisioned).
      await run('backupKvToR2', async () => {
        if (!env.BACKUPS_R2) return { skipped: 'BACKUPS_R2_binding_missing' };
        return backupKvToR2(env, 'cron', env.ENVIRONMENT || 'unknown');
      });
    } else if (cron === '15 */6 * * *') {
      // Every 6h at :15 UTC: refresh the AI/MCP/LLM supply-chain IOC
      // feed (worker/src/ai-supply-chain-iocs.ts). Authenticated GHSA
      // pull, AI-keyword filter, single KV snapshot at
      // /api/security/ai-supply-chain-iocs.json. Bumped from daily on
      // 2026-05-13 in response to the expanded npm worm. Republish +
      // cite posture; no active scanning, no attribution.
      await run('refreshAiSupplyChainIocs', () => refreshAiSupplyChainIocs(env));
    } else if (cron === '27 * * * *') {
      // Hourly :27 UTC: probe every known x402 publisher's manifest
      // and record latency + validity. Rolls up to 24h + 7d uptime
      // stats served on /x402/health.
      await run('runX402StatusCheck', () => runX402StatusCheck(env, env.SITE_URL || 'https://tensorfeed.ai'));
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
