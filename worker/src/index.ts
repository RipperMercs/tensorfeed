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
import { cdpListDiscoveryResources } from './cdp-facilitator';
import { bazaarPilotPaths, pilotCatalogStatus } from './bazaar-pilots';
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
import { computeCveKevTimeline } from './premium-cve-kev-timeline';
import { computeSecurityXsource } from './premium-security-xsource';
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
  captureEpochSnapshot,
  getLatestEpochSnapshot,
} from './ai-training-compute';
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
  getLifetimeStats,
  backfillLifetimeFromRollups,
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
import { isStrictPremiumPath } from './strict-premium-endpoints';
import { maybeHandleHoneypot } from './honeypot';
import { handleIocExport } from './iocs';
import { backupKvToR2, listRecentBackups, readManifest } from './backup';
import { buildSuggestedNextCalls } from './suggested-next';
import { deleteWantlistItem, listWantlist, listWantlistForAdmin, submitWantlistItem, WANTLIST_DEFAULTS } from './wantlist';
import { getAiSupplyChainIocs, refreshAiSupplyChainIocs } from './ai-supply-chain-iocs';
import { getGhsaAiFeed, refreshGhsaAiFeed } from './ghsa-ai-feed';
import { getOpenAlexAIAuthors, refreshOpenAlexAIAuthors } from './openalex-authors';
import { getOpenAlexAICitationVelocity, refreshOpenAlexAICitationVelocity } from './openalex-citation-velocity';
import { getApisGuruAIWatch, refreshApisGuruAIWatch } from './apis-guru-ai-watch';
import { rebuildAllReputationCards } from './agent-reputation-rebuild';
import {
  ALL_METRICS,
  ALL_WINDOWS,
  deleteBanRecord,
  deletePendingClaim,
  getBanRecord,
  getLeaderboard,
  getOperatorClaim,
  getPendingClaim,
  getReputationCardByToken,
  getReputationCardByWallet,
  listAdminActions,
  listBans,
  listPendingClaims,
  putBanRecord,
  putOperatorClaim,
  recordAdminAction,
  type LeaderboardWindow,
  type RankableMetric,
} from './agent-reputation-store';
import { handleClaimApplication } from './agent-claim-handler';
import {
  listGigs,
  getGig,
  reserveNonce,
  putGig,
  setGigStatus,
  putSubmission,
  getSubmission,
  listSubmissions,
  setSubmissionDecision,
} from './jobs-store';
import { sendJobsMorningDigest } from './jobs-digest';
import {
  toPublicGig,
  validateGigSubmission,
  validateSignedAt,
  assembleGigRecord,
  buildCloseMessage,
} from './jobs';
import {
  validateDeliverable,
  assembleSubmissionRecord,
  buildSubmissionMessage,
} from './jobs-submissions';
import {
  ingestAcceptedSubmission,
  listIngest,
  deleteIngest,
  projectModelPricingFeed,
} from './jobs-ingest';
import {
  getORSeries,
  resolveRange as resolveORRange,
  MAX_RANGE_DAYS as OR_MAX_RANGE_DAYS,
  DEFAULT_RANGE_DAYS as OR_DEFAULT_RANGE_DAYS,
} from './or-series';
import {
  getX402RegSeries,
  resolveRange as resolveX402RegRange,
  MAX_RANGE_DAYS as X402REG_MAX_RANGE_DAYS,
  DEFAULT_RANGE_DAYS as X402REG_DEFAULT_RANGE_DAYS,
} from './x402-reg-series';
import {
  getHFVelocitySeries,
  resolveRange as resolveHFVelRange,
  MAX_RANGE_DAYS as HFVEL_MAX_RANGE_DAYS,
  DEFAULT_RANGE_DAYS as HFVEL_DEFAULT_RANGE_DAYS,
} from './hf-velocity-series';
import {
  verifyPosterSignature,
  screenPoster,
  screenAddress,
  verifyAddressSignature,
} from './jobs-gate';
import {
  aggregateServiceAreaDistribution,
  aggregateSkillDistribution,
  searchDirectory,
} from './agent-directory';
// Verify-hireable charge module (worker/src/agent-directory-charge.ts)
// is dormant in v0. The routes that consume it are removed below; the
// module + 19 tests stay so it can be revived in a future commit if
// directory traction warrants a rev tier.
import {
  BADGE_CSP,
  renderBadgeSvg,
  renderUnknownBadgeSvg,
} from './agent-reputation-badge';
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
import { PRODUCTS as GEAR_PRODUCTS } from '../../src/data/gear/products';
import { GEAR_CATEGORIES } from '../../src/data/gear/categories';

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
    'RateLimit-Limit, RateLimit-Remaining, RateLimit-Reset, X-RateLimit-Limit, X-RateLimit-Remaining, X-RateLimit-Reset, Retry-After, X-Payment-Token, X-Payment-Token-Balance, X-Payment-Token-Note, PAYMENT-RESPONSE, X-TensorFeed-Simulated, X-TensorFeed-Simulated-Latency-Ms, X-TF-Free-Trial, X-TF-Free-Trial-Used, X-TF-Free-Trial-Remaining, X-TF-Free-Trial-Limit, X-TF-Free-Trial-Resets-At',
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
  // Synthetic cache key URL. Pinned to a constant origin + no search
  // params so every caller of cachedKVGet(..., key, ...) hits the same
  // Cache API entry regardless of the inbound request's host or query
  // string. Without this, /api/news?category=X and /api/news?category=Y
  // fragmented the same `articles` KV value into per-querystring entries
  // and the hit rate collapsed to ~10%.
  const cacheUrl = new URL(`https://tensorfeed-kv-cache.internal/__kv_cache/${encodeURIComponent(key)}`);
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
  } else if (!isStrictPremiumPath(endpoint)) {
    // Paid path (bearer / x402) on a trial-eligible endpoint: peek the
    // IP's free-trial pool and surface the four state headers WITHOUT
    // the `X-TF-Free-Trial: 1` marker. Marker presence means "this call
    // consumed a free slot"; the state headers alone mean "your IP has
    // a free-trial pool with this much left, fwiw." Lets an agent
    // fleet-manage across paid and free quotas without an extra round
    // trip to /api/free-tier/status, and makes the free quota
    // discoverable to paying agents who never saw the 402.
    const peek = peekFreeTrialQuota(getClientIP(request));
    headers['X-TF-Free-Trial-Used'] = String(peek.used);
    headers['X-TF-Free-Trial-Remaining'] = String(peek.remaining);
    headers['X-TF-Free-Trial-Limit'] = String(peek.limit);
    headers['X-TF-Free-Trial-Resets-At'] = peek.resetAt;
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
  status: number = 400,
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

  return new Response(JSON.stringify(responseBody), { status, headers });
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
    // B-F3: single outer guard around the entire route dispatch. A
    // handler throw must not escape as a Cloudflare HTML 500
    // (unparseable for agents) and must still honor the AFTA 5xx
    // no-charge guarantee. Deferred-debit already means no credit was
    // charged on a throw; the catch adds a structured JSON 500 (all
    // paths) plus the 5xx no-charge ledger entry + signed receipt
    // (premium paths). The catch NEVER debits.
    try {
    // Track agent/bot activity (non-blocking, batched in memory)
    ctx.waitUntil(trackAgentActivity(request, env, path));

    // Agent activity endpoint (reads from memory cache, minimal KV)
    if (path === '/api/agents/activity') {
      const activity = await getAgentActivity(env);
      return jsonResponse(activity, 200, 10);
    }

    // Public traction headline. Reads ONLY the single O(1) lifetime
    // counter (pay:stats:lifetime), never the dated rollups, so it is
    // KV-budget-safe. Counts successful, credit-debited premium calls
    // only: not requests, not free endpoints, not crawler traffic, so
    // it cannot be inflated the way the raw bot counter could. Each
    // such call also returns a signed AFTA receipt whenever the receipt
    // key is provisioned; the headline states that only when true so it
    // never overclaims. Edge-cached 60s.
    if (path === '/api/stats') {
      const s = await getLifetimeStats(env);
      const receiptsActive =
        typeof env.RECEIPT_PRIVATE_KEY_JWK === 'string' &&
        env.RECEIPT_PRIVATE_KEY_JWK.length > 0;
      const headline = receiptsActive
        ? `${s.premium_calls} verifiable paid agent API calls served, each returning a signed AFTA receipt`
        : `${s.premium_calls} paid premium API calls served`;
      return jsonResponse(
        {
          ok: true,
          premium_calls_served: s.premium_calls,
          each_call_returns_signed_afta_receipt: receiptsActive,
          total_credits_charged: s.total_credits_charged,
          first_at: s.first_at,
          last_at: s.last_at,
          headline,
          note: 'Successful credit-debited premium API calls only. Excludes free endpoints and crawler/bot traffic. AFTA receipts are not stored server-side (zero custody); receipt issuance is deterministic in receipt-key presence, surfaced here as each_call_returns_signed_afta_receipt.',
          generated_at: new Date().toISOString(),
        },
        200,
        60,
      );
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
      // Reject obviously oversized bodies before parse. parseSubmission
      // already caps individual fields, but a 100MB payload would still
      // burn CPU just reaching the parser. 10KB is comfortably above
      // any honest submission (largest field is description, capped at
      // 500 chars).
      const contentLength = parseInt(request.headers.get('content-length') ?? '0', 10);
      if (Number.isFinite(contentLength) && contentLength > 10_000) {
        return jsonResponse({ ok: false, error: 'body_too_large', hint: 'Wantlist body must be under 10 KB.' }, 413, 0);
      }
      let body: unknown;
      try {
        body = await request.json();
      } catch {
        return jsonResponse({ ok: false, error: 'bad_json', hint: 'POST a JSON body' }, 400, 0);
      }
      const ip = getClientIP(request);
      const out = await submitWantlistItem(env, ip, body as Record<string, unknown>);
      // Fire-and-forget email notification when a successful submission
      // produced one. ctx.waitUntil keeps the worker alive until the
      // Resend POST resolves without blocking the response to the agent.
      // notify_promise is also stripped from the response body so we
      // don't serialize a Promise object back to the caller.
      let responseBody: unknown = out;
      if (out.ok && out.notify_promise) {
        ctx.waitUntil(out.notify_promise);
        const { notify_promise, ...rest } = out;
        responseBody = rest;
      }
      const status = out.ok ? 201 : ((out as { error: string }).error === 'rate_limit_exceeded' ? 429 : 400);
      return jsonResponse(responseBody, status, 0);
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
      // Reject oversized bodies before parse. The largest legitimate
      // submission is a callback_url + spec + small secret, well
      // under 4 KB. 10 KB cap matches the wantlist endpoint.
      const wcLen = parseInt(request.headers.get('content-length') ?? '0', 10);
      if (Number.isFinite(wcLen) && wcLen > 10_000) {
        return jsonResponse({ ok: false, error: 'body_too_large', hint: 'Watch creation body must be under 10 KB.' }, 413, 0);
      }
      let body: { spec?: unknown; callback_url?: string; secret?: string; fire_cap?: number };
      try {
        body = await request.json();
      } catch {
        return jsonResponse({ ok: false, error: 'invalid_json' }, 400, 0);
      }
      if (typeof body.callback_url !== 'string') {
        return jsonResponse({ ok: false, error: 'callback_url_required' }, 400, 0);
      }
      const callerSuppliedSecret = typeof body.secret === 'string' && body.secret.length > 0;
      const result = await createFreeWatch(env, ip, {
        spec: body.spec as never,
        callback_url: body.callback_url,
        ...(callerSuppliedSecret ? { secret: body.secret as string } : {}),
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
          // When the caller did not provide a secret, surface the auto-
          // generated one so they can verify the X-TensorFeed-Signature
          // HMAC on inbound webhook deliveries. Storage already has it;
          // exposing it in the response is the only way the agent can
          // pick it up.
          ...(callerSuppliedSecret
            ? {}
            : {
                generated_secret: result.watch.secret,
                secret_note: 'Auto-generated. Store this; it will not be returned again. Use it to verify the X-TensorFeed-Signature header (HMAC-SHA256) on inbound webhook POSTs.',
              }),
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

    // === Gear catalog (agent-readable view of /gear) ===
    // Companion data feed to https://tensorfeed.ai/gear (the human page).
    // Affiliate plumbing (amazon-tag rewrite, the affiliate flag, secondary
    // CTAs that earn commissions) is stripped so agents see a clean vendor
    // URL and never get routed through a commissioned link.
    if (path === '/api/gear' || path === '/api/agents/gear' || path === '/api/agents/gear.json') {
      const categoryFilter = url.searchParams.get('category');

      let products: typeof GEAR_PRODUCTS = GEAR_PRODUCTS;
      if (categoryFilter) {
        products = products.filter(p => p.category === categoryFilter);
      }

      const agentProducts = products.map(p => {
        // Prefer the secondary direct CTA url when the primary is an affiliate
        // link. Falls back to the primary url's host (without affiliate tag)
        // when no secondary exists.
        const directUrl =
          p.secondaryCta && p.secondaryCta.kind === 'direct'
            ? p.secondaryCta.url
            : p.cta.kind === 'direct'
              ? p.cta.url
              : p.cta.url;
        return {
          id: p.id,
          name: p.name,
          brand: p.brand,
          category: p.category,
          blurb: p.blurb,
          specs: p.specs,
          aiUse: p.aiUse,
          price: p.price,
          priceNote: p.priceNote,
          vendorUrl: directUrl,
          tags: p.tags,
          badges: p.badges ?? [],
          pin: p.pin ?? null,
          image: p.image ?? null,
          addedAt: p.addedAt,
          reviewedAt: p.reviewedAt,
        };
      });

      const counts: Record<string, number> = {};
      for (const p of GEAR_PRODUCTS) {
        counts[p.category] = (counts[p.category] ?? 0) + 1;
      }

      const categories = GEAR_CATEGORIES.map(c => ({
        id: c.id,
        name: c.name,
        hue: c.hue,
        count: counts[c.id] ?? 0,
      }));

      return jsonResponse({
        ok: true,
        name: 'TensorFeed AI Gear',
        description:
          'Curated, human-reviewed catalog of AI-relevant consumer hardware. Companion to https://tensorfeed.ai/gear with affiliate plumbing stripped.',
        canonical: 'https://tensorfeed.ai/gear',
        license: 'CC-BY-4.0',
        attribution: 'TensorFeed.ai',
        updated: new Date().toISOString(),
        count: agentProducts.length,
        counts,
        categories,
        products: agentProducts,
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

    // === AGENT REPUTATION BUREAU (v0 read surfaces) ===
    // Public reputation cards keyed by wallet OR token prefix. Cards are
    // rebuilt daily at 04:50 UTC; reads are direct KV gets cached at the
    // edge for 60s. Per the bureau spec, returning a 404 (not a synthetic
    // empty card) on miss is the contract so consumers can distinguish
    // "unknown agent" from "agent with no activity".
    // === AGENT OPERATOR CLAIM FLOW ===
    // Members sign an EIP-191 message binding a wallet to a display name
    // (plus optional directory fields per agent-directory v0 spec).
    // Worker: parse + verify ECDSA via viem; check 10-min replay window;
    // check nonce-replay (per-nonce TTL'd marker in KV); screen wallet
    // via Chainalysis (fail-closed on outage); Llama Guard pre-flight
    // on display_name + expanded_description; brand-allowlist check;
    // route to live or pending-review queue. See agent-claim-handler.ts
    // for the full decision tree.
    // === AGENT REP BUREAU: ADMIN MODERATION ENDPOINTS ===
    // ADMIN_KEY-gated. Inherit the existing admin pre-check (path
    // startsWith /api/admin/, rate-limited + 401 on bad key earlier in
    // this handler). These cover the bureau Week 3 step 15 deliverable:
    // ban / unban / claim-review approve / claim-review reject, plus
    // a pending list + admin audit log read for the daily admin sweep.
    // Hardening pre-check (hoisted): EVERY /api/admin/* request goes
    // through a tight per-IP rate limiter (5/min/IP), then a 401 if the
    // key is missing or wrong, BEFORE any specific admin handler runs.
    // The limiter counts ALL admin requests, including bad-key ones, so
    // a runaway loop or brute-force probe saturates the limiter rather
    // than the worker request budget. The 401 (vs 404) gives clear
    // telemetry separating typo'd paths from auth failures. This block
    // must stay above the first admin handler so all admin routes,
    // including the early agents/jobs ones, uniformly inherit it.
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

    // One-time / idempotent: seed the lifetime traction counter from the
    // persisted dated rollups so /api/stats launches at the true
    // historical number instead of zero. Inherits the hoisted /api/admin
    // rate-limit + ADMIN_KEY pre-check. Safe to re-run (recomputes from
    // the authoritative rollups and overwrites). Not per-request.
    if (
      path === '/api/admin/stats/backfill' &&
      request.method === 'GET' &&
      isAuthorizedAdmin(env, url.searchParams.get('key'))
    ) {
      const backfilled = await backfillLifetimeFromRollups(env);
      return jsonResponse({ ok: true, backfilled }, 200, 0);
    }

    if (path === '/api/admin/agents/claim/pending' && isAuthorizedAdmin(env, url.searchParams.get('key'))) {
      const limit = Math.min(Math.max(1, parseInt(url.searchParams.get('limit') ?? '100', 10) || 100), 500);
      const pending = await listPendingClaims(env, limit);
      return jsonResponse({ ok: true, total: pending.length, claims: pending }, 200, 0);
    }
    // Admin: read the CDP Bazaar catalog (the surface ampersend and other
    // Bazaar-aware marketplaces ingest from). Inherits the global
    // /api/admin rate-limit + ADMIN_KEY pre-check. Read-only: it only
    // GETs CDP's /discovery/resources, which authHeaders() already scopes
    // to the allowed /platform/v2/x402 path, so it does not broaden the
    // CDP key blast radius. tf_pilots reports, per registered pilot path,
    // whether that endpoint is actually cataloged yet (catalog fires
    // ~10 min after each endpoint's first successful CDP settle).
    if (
      path === '/api/admin/bazaar/discovery' &&
      request.method === 'GET' &&
      isAuthorizedAdmin(env, url.searchParams.get('key'))
    ) {
      const dLimit = Math.min(
        Math.max(1, parseInt(url.searchParams.get('limit') ?? '100', 10) || 100),
        1000,
      );
      const dOffset = Math.max(
        0,
        parseInt(url.searchParams.get('offset') ?? '0', 10) || 0,
      );
      const rawType = url.searchParams.get('type');
      const dType =
        rawType && /^[a-z0-9-]{1,40}$/i.test(rawType) ? rawType : undefined;
      try {
        const cdp = await cdpListDiscoveryResources(env, {
          type: dType,
          limit: dLimit,
          offset: dOffset,
        });
        return jsonResponse(
          {
            ok: true,
            tf_pilots: pilotCatalogStatus(cdp.items),
            registered_pilot_paths: bazaarPilotPaths(),
            cdp: {
              x402Version: cdp.x402Version,
              pagination: cdp.pagination,
              items: cdp.items,
            },
          },
          200,
          0,
        );
      } catch (err) {
        return jsonResponse(
          {
            ok: false,
            error: 'cdp_discovery_failed',
            message: err instanceof Error ? err.message : 'unknown error',
          },
          502,
          0,
        );
      }
    }
    // Admin: remove a listing for a TOS violation. Inherits the global
    // /api/admin rate-limit + ADMIN_KEY pre-check. Audit-logged. Removed
    // listings are never re-served on any free or paid surface.
    if (
      path === '/api/admin/jobs/remove' &&
      request.method === 'POST' &&
      isAuthorizedAdmin(env, url.searchParams.get('key'))
    ) {
      let rbody: { id?: unknown; reason?: unknown; evidence_url?: unknown } =
        {};
      try {
        rbody = (await request.json()) as typeof rbody;
      } catch {
        return jsonResponse({ ok: false, error: 'invalid_json' }, 400);
      }
      const id = typeof rbody.id === 'string' ? rbody.id.trim() : '';
      const reason =
        typeof rbody.reason === 'string' ? rbody.reason.trim() : '';
      if (!id || id.length > 80) {
        return jsonResponse({ ok: false, error: 'invalid_id' }, 400);
      }
      if (!reason || reason.length > 200) {
        return jsonResponse({ ok: false, error: 'invalid_reason' }, 400);
      }
      const evidence_url =
        typeof rbody.evidence_url === 'string' &&
        /^https?:\/\/[^\s<>"]+$/.test(rbody.evidence_url)
          ? rbody.evidence_url
          : null;
      if (!(await setGigStatus(env, id, 'removed', reason))) {
        return jsonResponse({ ok: false, error: 'not_found' }, 404);
      }
      const now = new Date().toISOString();
      await recordAdminAction(env, {
        at: now,
        action: 'jobs_remove',
        target: id,
        reason,
        evidence_url,
        admin_id: 'admin:manual',
      });
      return jsonResponse({ ok: true, removed: id, at: now }, 200, 0);
    }
    // Admin: retract an ingested submission's rows from the public
    // /api/feeds/model-pricing feed. Mirrors jobs/remove: inherits the
    // hoisted /api/admin rate-limit + ADMIN_KEY pre-check, audit-logged,
    // fail-closed under the KV kill switch. The accept decision record
    // is untouched; this only unpublishes the rows.
    if (
      path === '/api/admin/jobs/ingest/remove' &&
      request.method === 'POST' &&
      isAuthorizedAdmin(env, url.searchParams.get('key'))
    ) {
      let ib: { submission_id?: unknown; reason?: unknown } = {};
      try {
        ib = (await request.json()) as typeof ib;
      } catch {
        return jsonResponse({ ok: false, error: 'invalid_json' }, 400);
      }
      const subId =
        typeof ib.submission_id === 'string' ? ib.submission_id.trim() : '';
      const ireason = typeof ib.reason === 'string' ? ib.reason.trim() : '';
      if (!subId || subId.length > 80) {
        return jsonResponse({ ok: false, error: 'invalid_submission_id' }, 400);
      }
      if (!ireason || ireason.length > 200) {
        return jsonResponse({ ok: false, error: 'invalid_reason' }, 400);
      }
      const outcome = await deleteIngest(env, subId);
      if (outcome === 'write_blocked') {
        return jsonResponse(
          {
            ok: false,
            error: 'write_unavailable',
            message: 'Feed store is temporarily read-only (kill switch). Retry.',
          },
          503,
        );
      }
      if (outcome === 'not_found') {
        return jsonResponse({ ok: false, error: 'not_found' }, 404);
      }
      const inow = new Date().toISOString();
      await recordAdminAction(env, {
        at: inow,
        action: 'jobs_ingest_remove',
        target: subId,
        reason: ireason,
        evidence_url: null,
        admin_id: 'admin:manual',
      });
      return jsonResponse({ ok: true, removed: subId, at: inow }, 200, 0);
    }
    // Admin: review pending deliverable submissions (the TF-as-buyer
    // verification surface). Inherits the global /api/admin rate-limit +
    // ADMIN_KEY pre-check. Read-only. Returns full records so the
    // operator can see every row and source_url to verify out-of-band.
    if (
      path === '/api/admin/jobs/submissions' &&
      request.method === 'GET' &&
      isAuthorizedAdmin(env, url.searchParams.get('key'))
    ) {
      const SUB_STATUSES = ['pending', 'accepted', 'rejected'] as const;
      const sp = url.searchParams.get('status');
      if (sp && !(SUB_STATUSES as readonly string[]).includes(sp)) {
        return jsonResponse(
          { ok: false, error: 'invalid_status', allowed: SUB_STATUSES },
          400,
        );
      }
      const gig = url.searchParams.get('gig') || undefined;
      const limParam = parseInt(url.searchParams.get('limit') ?? '200', 10);
      const limit = Number.isFinite(limParam)
        ? Math.max(1, Math.min(500, limParam))
        : 200;
      const subs = await listSubmissions(env, {
        limit,
        gig_id: gig,
        status: (sp as (typeof SUB_STATUSES)[number]) || undefined,
      });
      return jsonResponse(
        { ok: true, count: subs.length, submissions: subs },
        200,
        0,
      );
    }
    // Admin: accept or reject a submission. M2: an ACCEPT records the
    // decision AND auto-ingests the validated rows into the
    // provenance-tagged model-pricing feed, fail-closed (feed write
    // first, decision second). Still per-action explicit: a human admin
    // explicitly accepts each submission, the accept IS the gate. PAYOUT
    // remains fully manual and is never an autonomous Worker action.
    // Reject ingests nothing. Audit-logged via recordAdminAction.
    if (
      path === '/api/admin/jobs/submissions/decide' &&
      request.method === 'POST' &&
      isAuthorizedAdmin(env, url.searchParams.get('key'))
    ) {
      let dbody: { id?: unknown; decision?: unknown; note?: unknown } = {};
      try {
        dbody = (await request.json()) as typeof dbody;
      } catch {
        return jsonResponse({ ok: false, error: 'invalid_json' }, 400);
      }
      const sid = typeof dbody.id === 'string' ? dbody.id.trim() : '';
      const decision =
        typeof dbody.decision === 'string' ? dbody.decision.trim() : '';
      const note = typeof dbody.note === 'string' ? dbody.note.trim() : '';
      if (!sid || sid.length > 80) {
        return jsonResponse({ ok: false, error: 'invalid_id' }, 400);
      }
      if (decision !== 'accept' && decision !== 'reject') {
        return jsonResponse(
          { ok: false, error: 'invalid_decision', allowed: ['accept', 'reject'] },
          400,
        );
      }
      if (!note || note.length > 200) {
        return jsonResponse({ ok: false, error: 'invalid_note' }, 400);
      }
      const existing = await getSubmission(env, sid);
      if (!existing) {
        return jsonResponse({ ok: false, error: 'not_found' }, 404);
      }
      if (existing.status !== 'pending') {
        return jsonResponse(
          { ok: false, error: 'already_decided', status: existing.status },
          409,
        );
      }
      const status = decision === 'accept' ? 'accepted' : 'rejected';
      const nowSec = Math.floor(Date.now() / 1000);
      // Fail-closed M2 ingest: publish the validated rows into the feed
      // BEFORE recording the decision. A blocked feed write leaves the
      // submission pending and retryable, so the feed and the decision
      // can never disagree. Idempotent (keyed by submission id), so a
      // retry after a partial decide converges. Reject ingests nothing.
      if (status === 'accepted') {
        if (!(await ingestAcceptedSubmission(env, existing, nowSec))) {
          return jsonResponse(
            {
              ok: false,
              error: 'ingest_unavailable',
              message: 'Feed store is temporarily read-only. The submission is unchanged and the accept can be retried.',
            },
            503,
          );
        }
      }
      if (!(await setSubmissionDecision(env, sid, status, note, nowSec))) {
        return jsonResponse(
          {
            ok: false,
            error: 'write_unavailable',
            message: 'Decision store is temporarily read-only or the submission changed. Retry.',
          },
          503,
        );
      }
      const decidedAt = new Date().toISOString();
      await recordAdminAction(env, {
        at: decidedAt,
        action: 'jobs_submission_decide',
        target: sid,
        reason: decision + ': ' + note,
        evidence_url: null,
        admin_id: 'admin:manual',
      });
      return jsonResponse(
        {
          ok: true,
          id: sid,
          status,
          at: decidedAt,
          note:
            status === 'accepted'
              ? 'Decision recorded and rows ingested into /api/feeds/model-pricing. Payout remains manual and is not performed by this endpoint.'
              : 'Decision recorded. Nothing ingested. Payout is not performed by this endpoint.',
        },
        200,
        0,
      );
    }
    if (path === '/api/admin/agents/admin-log' && isAuthorizedAdmin(env, url.searchParams.get('key'))) {
      const date = url.searchParams.get('date') ?? new Date().toISOString().slice(0, 10);
      if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) {
        return jsonResponse({ ok: false, error: 'invalid_date' }, 400);
      }
      const entries = await listAdminActions(env, date);
      return jsonResponse({ ok: true, date, total: entries.length, entries }, 200, 0);
    }
    if (path === '/api/admin/agents/ban' && request.method === 'POST' && isAuthorizedAdmin(env, url.searchParams.get('key'))) {
      let body: { target?: unknown; reason?: unknown; evidence_url?: unknown } = {};
      try {
        body = (await request.json()) as typeof body;
      } catch {
        return jsonResponse({ ok: false, error: 'invalid_json' }, 400);
      }
      const target = typeof body.target === 'string' ? body.target.trim() : '';
      const reason = typeof body.reason === 'string' ? body.reason.trim() : '';
      if (!target || target.length < 4 || target.length > 64) {
        return jsonResponse({ ok: false, error: 'invalid_target' }, 400);
      }
      if (!reason || reason.length > 200) {
        return jsonResponse({ ok: false, error: 'invalid_reason' }, 400);
      }
      const evidence_url =
        typeof body.evidence_url === 'string' && /^https?:\/\/[^\s<>"]+$/.test(body.evidence_url)
          ? body.evidence_url
          : null;
      const now = new Date().toISOString();
      await putBanRecord(env, {
        target,
        reason,
        evidence_url,
        banned_at: now,
        banned_by_admin: 'admin:manual',
      });
      await recordAdminAction(env, {
        at: now,
        action: 'ban',
        target: target.toLowerCase(),
        reason,
        evidence_url,
        admin_id: 'admin:manual',
      });
      return jsonResponse({ ok: true, banned: target, at: now }, 200, 0);
    }
    if (path.startsWith('/api/admin/agents/ban/') && request.method === 'DELETE' && isAuthorizedAdmin(env, url.searchParams.get('key'))) {
      const target = path.slice('/api/admin/agents/ban/'.length);
      if (!target) return jsonResponse({ ok: false, error: 'invalid_target' }, 400);
      const existing = await getBanRecord(env, target);
      if (!existing) return jsonResponse({ ok: false, error: 'not_banned' }, 404);
      await deleteBanRecord(env, target);
      const now = new Date().toISOString();
      await recordAdminAction(env, {
        at: now,
        action: 'unban',
        target: target.toLowerCase(),
        reason: url.searchParams.get('reason') ?? 'admin lifted ban',
        evidence_url: null,
        admin_id: 'admin:manual',
      });
      return jsonResponse({ ok: true, unbanned: target, at: now }, 200, 0);
    }
    if (path.startsWith('/api/admin/agents/claim/review/') && request.method === 'POST' && isAuthorizedAdmin(env, url.searchParams.get('key'))) {
      const wallet = path.slice('/api/admin/agents/claim/review/'.length);
      if (!wallet || !/^0x[0-9a-fA-F]{40}$/.test(wallet)) {
        return jsonResponse({ ok: false, error: 'invalid_wallet' }, 400);
      }
      const pending = await getPendingClaim(env, wallet);
      if (!pending) return jsonResponse({ ok: false, error: 'no_pending_claim' }, 404);
      let body: { action?: unknown; reason?: unknown; expected_nonce?: unknown } = {};
      try {
        body = (await request.json()) as typeof body;
      } catch {
        return jsonResponse({ ok: false, error: 'invalid_json' }, 400);
      }
      // Optional concurrency guard: admin can pass the nonce of the pending
      // claim they actually reviewed. If a new pending claim landed between
      // review and approve, the nonces won't match and we reject with
      // claim_changed_since_review — protecting the admin from approving a
      // different claim than the one they saw.
      if (typeof body.expected_nonce === 'string' && body.expected_nonce !== pending.nonce) {
        return jsonResponse(
          { ok: false, error: 'claim_changed_since_review', current_nonce: pending.nonce },
          409,
        );
      }
      const action = body.action;
      const reason = typeof body.reason === 'string' ? body.reason.trim().slice(0, 200) : '';
      const now = new Date().toISOString();
      if (action === 'approve') {
        // Move pending → active
        await putOperatorClaim(env, { ...pending, verified: true });
        await deletePendingClaim(env, wallet);
        await recordAdminAction(env, {
          at: now,
          action: 'claim_approve',
          target: wallet.toLowerCase(),
          reason: reason || 'admin approved pending claim',
          evidence_url: null,
          admin_id: 'admin:manual',
        });
        return jsonResponse({ ok: true, approved: wallet, at: now }, 200, 0);
      }
      if (action === 'reject') {
        await deletePendingClaim(env, wallet);
        await recordAdminAction(env, {
          at: now,
          action: 'claim_reject',
          target: wallet.toLowerCase(),
          reason: reason || 'admin rejected pending claim',
          evidence_url: null,
          admin_id: 'admin:manual',
        });
        return jsonResponse({ ok: true, rejected: wallet, at: now }, 200, 0);
      }
      if (action === 'reject_and_ban') {
        await deletePendingClaim(env, wallet);
        await putBanRecord(env, {
          target: wallet,
          reason: reason || 'admin rejected claim and banned',
          evidence_url: null,
          banned_at: now,
          banned_by_admin: 'admin:manual',
        });
        await recordAdminAction(env, {
          at: now,
          action: 'claim_reject_and_ban',
          target: wallet.toLowerCase(),
          reason: reason || 'admin rejected claim and banned',
          evidence_url: null,
          admin_id: 'admin:manual',
        });
        return jsonResponse({ ok: true, rejected_and_banned: wallet, at: now }, 200, 0);
      }
      return jsonResponse(
        { ok: false, error: 'invalid_action', allowed: ['approve', 'reject', 'reject_and_ban'] },
        400,
      );
    }

    if (path === '/api/agents/claim' && request.method === 'POST') {
      let body: unknown;
      try {
        body = await request.json();
      } catch {
        return jsonResponse({ ok: false, error: 'invalid_json' }, 400);
      }
      const outcome = await handleClaimApplication(env, body as any);
      const httpStatus =
        outcome.status === 'approved' || outcome.status === 'queued'
          ? 200
          : outcome.status === 'bad_request'
            ? 400
            : outcome.status === 'rejected'
              ? 401
              : outcome.status === 'banned'
                ? 403
                : 503;
      return jsonResponse(outcome, httpStatus);
    }
    if (path.startsWith('/api/agents/claim/') && request.method === 'GET') {
      const wallet = path.slice('/api/agents/claim/'.length);
      if (!wallet || !/^0x[0-9a-fA-F]{40}$/.test(wallet)) {
        return jsonResponse({ ok: false, error: 'invalid_wallet' }, 400);
      }
      const claim = await getOperatorClaim(env, wallet);
      if (!claim) return jsonResponse({ ok: false, error: 'not_found' }, 404);
      // Strip the signature + message from public reads; they're stored
      // verbatim for audit but the public read returns the structured
      // form only. Anyone re-verifying can use the bureau card + signed
      // message via a separate audit endpoint (not in v0).
      const { signature: _sig, message: _msg, ...publicClaim } = claim;
      return jsonResponse({ ok: true, claim: publicClaim }, 200, 60);
    }

    // === AGENT SELF-DIRECTORY (v0) ===
    // Search across operator-claimed wallets that have set directory
    // fields (available_for_hire, skills_tags, etc) in their claim.
    // Verified-hireable members sort to the top. Free tier capped at
    // 25 results; full results on the premium endpoint.
    if (path === '/api/agents/directory/search') {
      const limitParam = parseInt(url.searchParams.get('limit') ?? '25', 10);
      const limit = Number.isFinite(limitParam) ? Math.max(1, Math.min(25, limitParam)) : 25;
      const filters = {
        skill: url.searchParams.get('skill') ?? undefined,
        service_area: url.searchParams.get('service_area') ?? undefined,
        language: url.searchParams.get('language') ?? undefined,
        available:
          url.searchParams.get('available') === 'true'
            ? true
            : url.searchParams.get('available') === 'false'
              ? false
              : undefined,
        max_rate:
          url.searchParams.get('max_rate') && Number.isFinite(Number(url.searchParams.get('max_rate')))
            ? Number(url.searchParams.get('max_rate'))
            : undefined,
        min_experience:
          url.searchParams.get('min_experience') &&
          Number.isFinite(Number(url.searchParams.get('min_experience')))
            ? Number(url.searchParams.get('min_experience'))
            : undefined,
        verified: url.searchParams.get('verified') === 'true' ? true : undefined,
      };
      const r = await searchDirectory(env, filters, limit);
      return jsonResponse(
        {
          ok: true,
          ...r,
          attribution:
            'TensorFeed Agent Self-Directory. Operators self-describe; TF publishes the listing. Buyers and operators transact off-platform; TF takes no fee from those transactions. Verified-hireable badge ($5 USDC/30 days) signals an active premium subscription, not a third-party endorsement.',
        },
        200,
        60,
      );
    }

    // (Verify-hireable charge routes removed 2026-05-13: directory is
    // free-for-all in v0; rev tier deferred until traction signals
    // demand for it. The agent-directory-charge.ts module + tests stay
    // dormant for an easy revival path.)

    if (path === '/api/agents/directory/skills') {
      const dist = await aggregateSkillDistribution(env);
      return jsonResponse({ ok: true, total_skills: dist.length, distribution: dist }, 200, 300);
    }

    if (path === '/api/agents/directory/categories') {
      const dist = await aggregateServiceAreaDistribution(env);
      return jsonResponse({ ok: true, total_areas: dist.length, distribution: dist }, 200, 300);
    }

    if (path.startsWith('/api/agents/reputation/by-token/')) {
      const prefix = path.slice('/api/agents/reputation/by-token/'.length);
      if (!prefix || !/^tf_live_[0-9a-fA-F]+$/.test(prefix) || prefix.length < 9 || prefix.length > 16) {
        return jsonResponse({ ok: false, error: 'invalid_token_prefix' }, 400);
      }
      const card = await getReputationCardByToken(env, prefix);
      if (!card) return jsonResponse({ ok: false, error: 'not_found' }, 404);
      return jsonResponse(card, 200, 60);
    }
    if (path.startsWith('/api/agents/reputation/')) {
      const wallet = path.slice('/api/agents/reputation/'.length);
      if (!wallet || !/^0x[0-9a-fA-F]{40}$/.test(wallet)) {
        return jsonResponse({ ok: false, error: 'invalid_wallet' }, 400);
      }
      const card = await getReputationCardByWallet(env, wallet);
      if (!card) return jsonResponse({ ok: false, error: 'not_found' }, 404);
      return jsonResponse(card, 200, 60);
    }

    // Embeddable SVG reputation badge. 200x40, ~2 KB. Two paths:
    //   /api/agents/badge/by-token/{prefix}.svg
    //   /api/agents/badge/{wallet}.svg
    // Both emit a minimal "no record yet" SVG for unknown identities
    // instead of a 404 so an operator's embed stays visually intact.
    // The renderer is XSS-hardened (allowlist + escape on every
    // user-derived field); response headers add a strict CSP, image
    // content-type, 1h edge cache, and CORS for cross-origin embeds.
    if (path.startsWith('/api/agents/badge/by-token/') && path.endsWith('.svg')) {
      const prefix = path.slice('/api/agents/badge/by-token/'.length, -'.svg'.length);
      if (!prefix || !/^tf_live_[0-9a-fA-F]+$/.test(prefix) || prefix.length < 9 || prefix.length > 16) {
        return jsonResponse({ ok: false, error: 'invalid_token_prefix' }, 400);
      }
      const card = await getReputationCardByToken(env, prefix);
      const svg = card ? renderBadgeSvg(card) : renderUnknownBadgeSvg(prefix);
      return new Response(svg, {
        status: 200,
        headers: {
          'Content-Type': 'image/svg+xml; charset=utf-8',
          'Cache-Control': 'public, max-age=3600, s-maxage=3600',
          'CDN-Cache-Control': 'public, max-age=3600',
          'Content-Security-Policy': BADGE_CSP,
          'Access-Control-Allow-Origin': '*',
        },
      });
    }
    if (path.startsWith('/api/agents/badge/') && path.endsWith('.svg')) {
      const wallet = path.slice('/api/agents/badge/'.length, -'.svg'.length);
      if (!wallet || !/^0x[0-9a-fA-F]{40}$/.test(wallet)) {
        return jsonResponse({ ok: false, error: 'invalid_wallet' }, 400);
      }
      const card = await getReputationCardByWallet(env, wallet);
      const svg = card
        ? renderBadgeSvg(card)
        : renderUnknownBadgeSvg(`${wallet.slice(0, 6)}…${wallet.slice(-4)}`);
      return new Response(svg, {
        status: 200,
        headers: {
          'Content-Type': 'image/svg+xml; charset=utf-8',
          'Cache-Control': 'public, max-age=3600, s-maxage=3600',
          'CDN-Cache-Control': 'public, max-age=3600',
          'Content-Security-Policy': BADGE_CSP,
          'Access-Control-Allow-Origin': '*',
        },
      });
    }

    // Public list of every banned wallet or token-prefix. Transparency
    // over hiding: the bureau publishes who got banned and why so any
    // disputed call can be audited from outside. No auth required.
    if (path === '/api/agents/bans') {
      const bans = await listBans(env);
      return jsonResponse(
        {
          ok: true,
          total: bans.length,
          attribution:
            'TensorFeed.ai Agent Reputation Bureau. Bans are admin-set, publicly listed for transparency. Sanctioned wallets (Chainalysis OFAC oracle) are auto-banned; other bans are operator gaming, brand-impersonation claim attempts, or terms-of-service violations.',
          bans: bans.map((b) => ({
            target: b.target,
            reason: b.reason,
            evidence_url: b.evidence_url,
            banned_at: b.banned_at,
          })),
        },
        200,
        60,
      );
    }

    // Public leaderboard. Free tier capped at 25 entries; the
    // untruncated cohort lives on the premium /api/premium/agents/leaderboard/full
    // endpoint (1 credit). Window='all' is the only meaningful window
    // in v0 since metrics are cumulative; the parameter is accepted +
    // validated so the public contract is forward-compatible.
    if (path === '/api/agents/leaderboard') {
      const metricParam = (url.searchParams.get('metric') ?? 'composite') as RankableMetric;
      const windowParam = (url.searchParams.get('window') ?? 'all') as LeaderboardWindow;
      const limitParam = parseInt(url.searchParams.get('limit') ?? '25', 10);
      if (!ALL_METRICS.includes(metricParam)) {
        return jsonResponse(
          { ok: false, error: 'invalid_metric', allowed: ALL_METRICS },
          400,
        );
      }
      if (!ALL_WINDOWS.includes(windowParam)) {
        return jsonResponse(
          { ok: false, error: 'invalid_window', allowed: ALL_WINDOWS },
          400,
        );
      }
      const limit = Number.isFinite(limitParam) ? Math.max(1, Math.min(25, limitParam)) : 25;
      const ids = await getLeaderboard(env, metricParam, windowParam);
      const total = ids.length;
      const slice = ids.slice(0, limit);
      const cards = await Promise.all(
        slice.map(async (id) => {
          const isWallet = id.startsWith('0x');
          const card = isWallet
            ? await getReputationCardByWallet(env, id)
            : await getReputationCardByToken(env, id);
          return { id, card };
        }),
      );
      return jsonResponse(
        {
          ok: true,
          metric: metricParam,
          window: windowParam,
          total,
          limit,
          attribution:
            'TensorFeed.ai Agent Reputation Bureau. Free tier capped at 25 entries; untruncated cohort on /api/premium/agents/leaderboard/full (1 credit).',
          results: cards,
        },
        200,
        60,
      );
    }

    // === TENSORFEED JOBS: create a listing (the money line) ===
    // Tier 3 (5 credits, ~$0.10). Charge ordering is proven from the
    // payment code: the bearer path uses AFTA deferred-debit, so a
    // credit is debited ONLY by premiumResponse -> commitPayment on
    // success. Every gate failure returns premiumValidationFailure:
    // HTTP 400, no debit, a signed no-charge receipt, and built-in
    // no-charge abuse capping. So a rejected post is never charged on
    // the credits path. The per-call x402 path is pre-paid on-chain by
    // the agent and mints credits regardless (existing system behavior,
    // not something this handler can or should change).
    if (path === '/api/jobs' && request.method === 'POST') {
      // Writes are restricted to the prepaid credits/bearer flow. The
      // per-call x402 path settles USDC on-chain INSIDE requirePayment
      // before any jobs gate runs, so a rejected post over that path
      // would still move real money. Requiring a bearer token (AFTA
      // deferred-debit, debited only by premiumResponse on full success)
      // is what makes "a rejected post is never charged" actually true.
      const jobsAuth = request.headers.get('Authorization');
      if (
        !jobsAuth ||
        !jobsAuth.startsWith('Bearer ') ||
        !jobsAuth.slice(7).trim().startsWith('tf_live_')
      ) {
        return jsonResponse(
          {
            ok: false,
            error: 'bearer_required',
            message:
              'Posting a listing requires a prepaid TensorFeed credits token. Buy credits at /api/payment/buy-credits and retry with Authorization: Bearer tf_live_<token>. The per-call x402 settle path is not accepted for writes, so a rejected post is never charged.',
            doc: '/developers/agent-payments',
          },
          402,
          0,
        );
      }
      const payment = await requirePayment(request, env, 3);
      if (!payment.paid) return payment.response!;

      // A listing is a write, not a data trial. The free-trial quota
      // covers discovery reads only. Never let it fund persistent
      // listings or the paid-to-post anti-spam economic is bypassable.
      if (payment.freeTrial) {
        return premiumValidationFailure(
          {
            ok: false,
            error: 'payment_required',
            message:
              'Posting requires a paid credit. The free trial covers discovery reads only, not writes.',
          },
          payment,
          request,
          env,
        );
      }

      let body: Record<string, unknown>;
      try {
        const parsed = await request.json();
        if (typeof parsed !== 'object' || parsed === null || Array.isArray(parsed)) {
          throw new Error('not_object');
        }
        body = parsed as Record<string, unknown>;
      } catch {
        return premiumValidationFailure(
          { ok: false, error: 'invalid_json' },
          payment,
          request,
          env,
        );
      }

      const v = validateGigSubmission(body);
      if (!v.ok) {
        return premiumValidationFailure(
          { ok: false, error: 'validation_failed', detail: v.error },
          payment,
          request,
          env,
        );
      }
      const sub = v.value;

      const nowSec = Math.floor(Date.now() / 1000);
      const skew = validateSignedAt(nowSec, sub.signed_at);
      if (!skew.ok) {
        return premiumValidationFailure(
          { ok: false, error: 'replay_window', detail: skew.error },
          payment,
          request,
          env,
        );
      }

      // Signature BEFORE the nonce burn: only the wallet owner can burn
      // its own nonce, so a bad-signature request cannot grief a
      // victim's future nonce.
      if (!(await verifyPosterSignature(sub))) {
        return premiumValidationFailure(
          { ok: false, error: 'bad_signature' },
          payment,
          request,
          env,
        );
      }

      // Nonce burn BETWEEN signature and OFAC, mirroring the audited
      // claim flow: a replay is rejected before a Chainalysis call is
      // spent. Single-use: a transient downstream failure means the
      // agent re-signs with a fresh nonce and retries.
      if (!(await reserveNonce(env, sub.nonce))) {
        return premiumValidationFailure(
          { ok: false, error: 'nonce_replayed_or_writes_disabled' },
          payment,
          request,
          env,
        );
      }

      const screen = await screenPoster(sub, env);
      if (!screen.ok) {
        return premiumValidationFailure(
          { ok: false, error: screen.reason, detail: screen.detail },
          payment,
          request,
          env,
        );
      }

      // All gates passed. Persist, then charge via premiumResponse,
      // which runs commitPayment, the only place a credit is debited.
      const id = 'gig_' + crypto.randomUUID();
      const rec = assembleGigRecord(sub, nowSec, id);
      if (!(await putGig(env, rec))) {
        return premiumValidationFailure(
          {
            ok: false,
            error: 'storage_unavailable',
            message:
              'Listing store is temporarily read-only. No credit was charged.',
          },
          payment,
          request,
          env,
        );
      }

      return await premiumResponse(
        { ok: true, id, job: toPublicGig(rec, nowSec) },
        payment,
        5,
        request,
        env,
      );
    }

    // Close a listing. The original poster signs buildCloseMessage; the
    // recovered address must equal the listing's stored poster_addr, so
    // only the poster can close their own gig. No payment. Nonce burned
    // after signature verify to prevent close-replay.
    if (
      path.startsWith('/api/jobs/') &&
      path.endsWith('/close') &&
      request.method === 'POST'
    ) {
      const id = path.slice('/api/jobs/'.length, -'/close'.length);
      if (!id || id.includes('/')) {
        return jsonResponse({ ok: false, error: 'not_found' }, 404, 0);
      }
      let cbody: { nonce?: unknown; signed_at?: unknown; signature?: unknown } =
        {};
      try {
        cbody = (await request.json()) as typeof cbody;
      } catch {
        return jsonResponse({ ok: false, error: 'invalid_json' }, 400, 0);
      }
      const nonce = typeof cbody.nonce === 'string' ? cbody.nonce.trim() : '';
      const signature =
        typeof cbody.signature === 'string' ? cbody.signature.trim() : '';
      const signedAt = cbody.signed_at;
      if (!nonce || nonce.length > 128 || !signature) {
        return jsonResponse(
          { ok: false, error: 'invalid_close_request' },
          400,
          0,
        );
      }
      if (typeof signedAt !== 'number' || !Number.isInteger(signedAt)) {
        return jsonResponse({ ok: false, error: 'signed_at_invalid' }, 400, 0);
      }
      const nowSec = Math.floor(Date.now() / 1000);
      const rec = await getGig(env, id);
      const pub = rec ? toPublicGig(rec, nowSec) : null;
      if (!rec || !pub || pub.status === 'removed') {
        return jsonResponse({ ok: false, error: 'not_found' }, 404, 0);
      }
      if (pub.status !== 'active') {
        return jsonResponse(
          { ok: false, error: 'not_active', status: pub.status },
          409,
          0,
        );
      }
      const skew = validateSignedAt(nowSec, signedAt);
      if (!skew.ok) {
        return jsonResponse(
          { ok: false, error: 'replay_window', detail: skew.error },
          400,
          0,
        );
      }
      const okSig = await verifyAddressSignature(
        rec.poster_addr,
        buildCloseMessage({ id, nonce, signed_at: signedAt }),
        signature,
      );
      if (!okSig) {
        return jsonResponse({ ok: false, error: 'bad_signature' }, 401, 0);
      }
      if (!(await reserveNonce(env, nonce))) {
        return jsonResponse(
          { ok: false, error: 'nonce_replayed_or_writes_disabled' },
          409,
          0,
        );
      }
      if (!(await setGigStatus(env, id, 'filled'))) {
        return jsonResponse({ ok: false, error: 'not_found' }, 404, 0);
      }
      const updated = await getGig(env, id);
      return jsonResponse(
        { ok: true, job: updated ? toPublicGig(updated, nowSec) : null },
        200,
        0,
      );
    }

    // Submit a deliverable against a TF-funded gig (M1 of the
    // cold-start data flywheel). Bearer-only and 1 credit, mirroring
    // the poster path's anti-spam economic: a rejected submission is
    // never charged (premiumValidationFailure, no debit) and the credit
    // is committed only by premiumResponse on full success. The
    // submitter signs a canonical deliverable (EIP-191), is OFAC
    // screened fail-closed, and is nonce-replay guarded, exactly like
    // the poster gate.
    //
    // SSRF: source_url values are validated and STORED, never fetched
    // here. Verification fetches happen out-of-band on the operator
    // side. Do not add a Worker fetch of any submitter-supplied URL.
    if (
      path.startsWith('/api/jobs/') &&
      path.endsWith('/submit') &&
      request.method === 'POST'
    ) {
      const gigId = path.slice('/api/jobs/'.length, -'/submit'.length);
      if (!gigId || gigId.includes('/')) {
        return jsonResponse({ ok: false, error: 'not_found' }, 404, 0);
      }

      const subAuth = request.headers.get('Authorization');
      if (
        !subAuth ||
        !subAuth.startsWith('Bearer ') ||
        !subAuth.slice(7).trim().startsWith('tf_live_')
      ) {
        return jsonResponse(
          {
            ok: false,
            error: 'bearer_required',
            message:
              'Submitting a deliverable requires a prepaid TensorFeed credits token. Buy credits at /api/payment/buy-credits and retry with Authorization: Bearer tf_live_<token>. The per-call x402 settle path is not accepted for writes, so a rejected submission is never charged.',
            doc: '/developers/agent-payments',
          },
          402,
          0,
        );
      }
      const payment = await requirePayment(request, env, 1);
      if (!payment.paid) return payment.response!;
      if (payment.freeTrial) {
        return premiumValidationFailure(
          {
            ok: false,
            error: 'payment_required',
            message:
              'Submitting a deliverable requires a paid credit. The free trial covers discovery reads only, not writes.',
          },
          payment,
          request,
          env,
        );
      }

      let sbody: Record<string, unknown>;
      try {
        const parsed = await request.json();
        if (
          typeof parsed !== 'object' ||
          parsed === null ||
          Array.isArray(parsed)
        ) {
          throw new Error('not_object');
        }
        sbody = parsed as Record<string, unknown>;
      } catch {
        return premiumValidationFailure(
          { ok: false, error: 'invalid_json' },
          payment,
          request,
          env,
        );
      }

      const dv = validateDeliverable(sbody);
      if (!dv.ok) {
        return premiumValidationFailure(
          { ok: false, error: 'validation_failed', detail: dv.error },
          payment,
          request,
          env,
        );
      }
      const sub = dv.value;

      // The signed gig_id must match the path so a deliverable signed
      // for one gig cannot be charged against another.
      if (sub.gig_id !== gigId) {
        return premiumValidationFailure(
          { ok: false, error: 'gig_id_mismatch' },
          payment,
          request,
          env,
        );
      }

      // Fail fast (and cheaply, before any signature or Chainalysis
      // work) if the gig is not an open listing.
      const nowSec = Math.floor(Date.now() / 1000);
      const gigRec = await getGig(env, gigId);
      const gigPub = gigRec ? toPublicGig(gigRec, nowSec) : null;
      if (!gigPub || gigPub.status !== 'active') {
        return premiumValidationFailure(
          { ok: false, error: 'gig_not_open' },
          payment,
          request,
          env,
        );
      }

      const sskew = validateSignedAt(nowSec, sub.signed_at);
      if (!sskew.ok) {
        return premiumValidationFailure(
          { ok: false, error: 'replay_window', detail: sskew.error },
          payment,
          request,
          env,
        );
      }

      // Signature BEFORE the nonce burn: only the wallet owner can burn
      // its own nonce, so a bad-signature request cannot grief a
      // victim's future nonce. The message is derived here, never
      // accepted from the caller.
      const okSubSig = await verifyAddressSignature(
        sub.submitter_addr,
        buildSubmissionMessage(sub),
        sub.signature,
      );
      if (!okSubSig) {
        return premiumValidationFailure(
          { ok: false, error: 'bad_signature' },
          payment,
          request,
          env,
        );
      }

      if (!(await reserveNonce(env, sub.nonce))) {
        return premiumValidationFailure(
          { ok: false, error: 'nonce_replayed_or_writes_disabled' },
          payment,
          request,
          env,
        );
      }

      const sscreen = await screenAddress(sub.submitter_addr, env);
      if (!sscreen.ok) {
        return premiumValidationFailure(
          { ok: false, error: sscreen.reason, detail: sscreen.detail },
          payment,
          request,
          env,
        );
      }

      const subId = 'sub_' + crypto.randomUUID();
      const subRec = assembleSubmissionRecord(sub, nowSec, subId);
      if (!(await putSubmission(env, subRec))) {
        return premiumValidationFailure(
          {
            ok: false,
            error: 'storage_unavailable',
            message:
              'Submission store is temporarily read-only. No credit was charged.',
          },
          payment,
          request,
          env,
        );
      }

      return await premiumResponse(
        {
          ok: true,
          submission_id: subId,
          gig_id: gigId,
          status: 'pending',
          rows_received: subRec.rows.length,
          note: 'Stored for out-of-band verification. Acceptance, payout, and ingest are manual and decided by TensorFeed as the buyer.',
        },
        payment,
        1,
        request,
        env,
      );
    }

    // === TENSORFEED JOBS: M2 ingest feed (no money path) ===
    // Free. Agent-sourced model-pricing observations published by the
    // cold-start gig flywheel: each row was submitted with a primary
    // source_url, validated at intake, and accepted by a human admin
    // before landing here. Provenance-distinct from TF's canonical
    // pricing dataset by design. No Worker SSRF: source_url is served,
    // never fetched here. Behind the normal edge cache, short maxAge.
    if (path === '/api/feeds/model-pricing' && request.method === 'GET') {
      const lp = parseInt(url.searchParams.get('limit') ?? '200', 10);
      const limit = Number.isFinite(lp)
        ? Math.max(1, Math.min(1000, lp))
        : 200;
      const model = url.searchParams.get('model') || undefined;
      const vendor = url.searchParams.get('vendor') || undefined;
      const records = await listIngest(env);
      const feed = projectModelPricingFeed(records, { limit, model, vendor });
      return jsonResponse(
        {
          ok: true,
          source: 'tensorfeed.ai',
          feed: 'agent-sourced-model-pricing',
          generated_at: new Date().toISOString(),
          _meta: {
            description:
              'Model pricing observations sourced via the TensorFeed cold-start gig flywheel. Each observation was submitted by an agent with a primary-source source_url, validated at intake, and accepted by a human reviewer. Use source_url as the authority.',
            provenance_fields: [
              'submission_id',
              'gig_id',
              'submitter_addr',
              'accepted_at',
              'source_url',
            ],
            canonical_note:
              'Community and agent sourced. Intentionally separate from the curated TensorFeed pricing catalog.',
            license:
              'Observations cite their primary source; primary source authority always wins. Attribution to tensorfeed.ai appreciated.',
          },
          summary: feed.summary,
          latest: feed.latest,
          observations: feed.observations,
        },
        200,
        60,
      );
    }

    // === TENSORFEED JOBS: read endpoints (no money path) ===
    // Free, capped at 25 active listings, newest first. The full and
    // filtered cohort is the premium endpoint. Listings are third-party
    // content. TensorFeed is a listing and discovery service and is
    // never a party to any transaction (see ToS). No auth, short cache.
    if (path === '/api/jobs' && request.method === 'GET') {
      const nowSec = Math.floor(Date.now() / 1000);
      const limParam = parseInt(url.searchParams.get('limit') ?? '25', 10);
      const limit = Number.isFinite(limParam)
        ? Math.max(1, Math.min(25, limParam))
        : 25;
      const category = url.searchParams.get('category') || undefined;
      const q = url.searchParams.get('q') || undefined;
      const gigs = await listGigs(env, { now: nowSec, limit, category, q });
      return jsonResponse(
        {
          ok: true,
          count: gigs.length,
          capped_at: 25,
          attribution:
            'TensorFeed Jobs. Free tier returns up to 25 active listings, newest first. Full and filtered cohort on /api/premium/jobs (1 credit). Listings are third-party content; TensorFeed is a listing and discovery service, not a party to any transaction.',
          jobs: gigs.map((g) => toPublicGig(g, nowSec)),
        },
        200,
        30,
      );
    }

    // Single listing by id. 404 on unknown or removed: removed content
    // is never served. Single-segment id only, so this never shadows a
    // future /api/jobs/{id}/close subpath.
    if (path.startsWith('/api/jobs/') && request.method === 'GET') {
      const id = path.slice('/api/jobs/'.length);
      if (id && !id.includes('/')) {
        const nowSec = Math.floor(Date.now() / 1000);
        const rec = await getGig(env, id);
        const pub = rec ? toPublicGig(rec, nowSec) : null;
        if (!pub || pub.status === 'removed') {
          return jsonResponse({ ok: false, error: 'not_found' }, 404, 30);
        }
        return jsonResponse({ ok: true, job: pub }, 200, 30);
      }
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
          premiumModelDeprecationsTimeline: '/api/premium/model-deprecations/timeline?within_days=&provider= (1 credit, AFTA-signed; window-centered timeline over the model deprecation registry. Each entry enriched with urgency_band (within_7d / within_30d / within_60d / within_90d / within_180d / within_365d / past / future / no_date), days_until_sunset and days_since_sunset, and a resolved migration_chain hop sequence to the first still-active replacement. Summary breakdowns by_provider and by_urgency_band. within_days null returns the full registry; clamped to [7, 730].)',
          computeProviders: '/api/compute-providers?type=gpu-cloud|hyperscaler|ai-serverless|marketplace|specialized',
          inferenceProviders: '/api/inference-providers?family=Meta|DeepSeek|Mistral|Alibaba|Microsoft',
          inferenceProvidersCheapest: '/api/inference-providers/cheapest?model=<id>&sort=blended|input|output|tps_desc',
          premiumInferenceArbitrage: '/api/premium/inference-providers/arbitrage?family=&min_savings_pct= (1 credit, AFTA-signed; cross-provider arbitrage analytics over the inference-providers matrix. Per-model: cheapest_paid, most_expensive_paid, spread_usd, savings_pct, median_paid_blended, fastest_tps, cheapest_with_tps, free_tier_offers. Plus provider_rollup (cheapest_count, top_tps_count, value_score) and top_arbitrage models sorted by savings_pct desc. Default min_savings_pct=20; clamp [0,100].)',
          aiSafetyIncidentsAvid: '/api/ai-safety/incidents/avid?limit=&developer=&risk_domain= (free, capped at 50; raw normalized AVID snapshot. Source: avidml/avid-db, MIT. Refreshed daily 03:00 UTC.)',
          aiSafetyPackagesSecurity: '/api/ai-safety/packages/security?package=&ecosystem=&category= (free; per-package vulnerability history over the curated AI/ML PyPI + npm package lists. Sourced from OSV.dev (GHSA + PyPA + RustSec + Maven + npm + others). Refreshed daily 05:45 UTC.)',
          packagesReleases: '/api/packages/releases?ecosystem=&category=&package=&within_days= (free; latest version + last 10 release timestamps for every curated AI/ML PyPI + npm package. Sourced from pypi.org + registry.npmjs.org public JSON. Refreshed every 6h.)',
          aiVelocity: '/api/ai-velocity?limit= (free, capped at 30; first AFTA federation cross-call. Filters TerminalFeed.io HF + GitHub trending leaderboards to AI-relevant entries.)',
          aiCryptoPulse: '/api/ai-crypto-pulse (free; second AFTA federation cross-call. Pulls TerminalFeed crypto-movers + funding-rates, filters to AI-thesis token cohort (TAO, FET, RNDR, AKT, WLD, ARKM, IO, OCEAN, GRT, VIRTUAL, AI16Z, NMR, AGIX, TURBO).)',
          codingHarnessesLatest: '/api/coding-harnesses/latest (free; third AFTA federation cross-call. Latest snapshot of TerminalFeed coding-harness leaderboard (SWE-bench Verified, Terminal-Bench, Aider Polyglot, etc). Refreshed daily 05:25 UTC.)',
          newsActionCards: '/api/news/action-cards?limit= (free, capped at 25; Haiku-derived structured agent action cards over the news feed. Per article: action_summary, migration_recommendation, affected_capability, cost_impact, security_impact, urgency. Daily 08:00 UTC refresh.)',
          statusIncidentsTriage: '/api/status/incidents/triage?limit= (free, capped at 25; Haiku-triaged AI provider status incidents. Per card: triage_summary, impact_classification (informational/minor/major/critical), affected_capabilities, recommended_action (no_action/monitor/retry_later/failover_now/escalate). Refreshed every 2h.)',
          premiumStatusIncidentsTriage: '/api/premium/status/incidents/triage?provider=&impact=&recommended_action=&capability=&ongoing_only= (1 credit, AFTA-signed; full incident cohort + provider substring + impact/action exact filters + capability membership filter + ongoing_only flag. Sort priority: impact > recommended_action > started_at. Summary rollups by_provider, by_impact, by_recommended_action, by_capability, cards_with_failover_action.)',
          premiumNewsActionCards: '/api/premium/news/action-cards?capability=&urgency=&min_cost_impact=&min_security_impact=&query= (1 credit, AFTA-signed; full cohort + capability/urgency exact filters + impact "at-or-above" threshold filters + title/source substring search. Sort priority: urgency > security_impact > cost_impact > published. Summary rollups by_capability, by_urgency, by_cost_impact, by_security_impact, cards_with_migration_recommendation.)',
          codingHarnessesDates: '/api/coding-harnesses/dates (free; ordered date index of captured TerminalFeed harness snapshots for delta queries.)',
          premiumCodingHarnessesWeeklyDeltas: '/api/premium/coding-harnesses/weekly-deltas?days_back=&harness=&benchmark=&model=&min_abs_delta= (1 credit, AFTA-signed; compares current TerminalFeed harness snapshot to a prior snapshot (default 7d back, clamp [1, 90]). Per-(benchmark, harness, model) score + rank deltas, biggest_gainers, biggest_regressions, entered/exited combinations, per-benchmark leader_cards with leader_changed flag.)',
          premiumAiCryptoPulse: '/api/premium/ai-crypto-pulse?token=&setup=&min_abs_change_pct= (1 credit, AFTA-signed; joins AI-token price moves with venue-weighted funding-rate skew. Per-token setup classification: squeeze_up / chase_up / squeeze_down / chase_down / coiled / neutral. Notable movers (squeezes_up, squeezes_down, coiled, top_gainers, top_losers), summary (by_setup, breadth_pct_positive, median_change_24h_pct).)',
          premiumAiVelocity: '/api/premium/ai-velocity?pipeline=&language=&min_traction=&cross_only= (1 credit, AFTA-signed; AI-velocity ranking + cross-pollination over the TerminalFeed-sourced HF + GitHub trending snapshot. Per-entry traction_score (HF: likes*3 + log10(downloads+1)*10; GH: log10(stars+1)*30), on_both flag, cross_pollinated array of normalized-name matches, summary rollups hf_by_pipeline + github_by_language.)',
          premiumPackagesReleasesVelocity: '/api/premium/packages/releases/velocity?ecosystem=&category=&package=&min_releases_7d= (1 credit, AFTA-signed; per-package release velocity (releases_24h/7d/30d), latest bump_kind (major/minor/patch/prerelease/sideways/unknown), is_breaking_recent flag (major bump within 30d). Notable movers: recent_major_bumps, most_releases_7d, fastest_cadence_30d. Pre-1.0 minor bumps count as major per semver convention.)',
          premiumAiSafetyPackagesSecurityRadar: '/api/premium/ai-safety/packages/security/radar?ecosystem=&category=&package=&min_risk_score= (1 credit, AFTA-signed; per-package risk_score (0-100) over the OSV snapshot. Risk_band classification (calm/watch/hot/critical), notable_movers (top-5 by_critical_30d, by_risk_score, new_in_last_7d), summary rollups by_band + by_ecosystem.)',
          premiumAiSafetyIncidentsExposure: '/api/premium/ai-safety/incidents/exposure?vendor=&risk_domain=&within_days= (1 credit, AFTA-signed; exposure rollups over the AVID snapshot. Per-developer + per-deployer incident counts with recency-weighted exposure_score (1.0 last 30d, 0.5 days 31-90, 0.25 older), risk_domain + sep_view distributions, top affected artifacts. Optional substring filters and within_days window [7, 730]. AIID coverage queued via the 100MB weekly R2 snapshot path.)',
          agentsDirectory: '/api/agents/directory',
          agentsOpportunities: '/api/agents/opportunities (free; daily-refreshed scan of new GitHub repos that represent submission/distribution opportunities for TF: anthropics/openai/microsoft/modelcontextprotocol orgs + MCP/x402/skills keyword sweeps. Scored by signal_weight * recency + log10(stars). 13:30 UTC cron)',
          agentsReputationByWallet: '/api/agents/reputation/{wallet} (free; v0 Agent Reputation Bureau. Returns a ReputationCard with metrics, ranks, trust grade, flags, and operator-claim status. Cards rebuilt daily at 04:50 UTC from TF telemetry. 404 on unknown wallet. Premium time series at /api/premium/agents/reputation/series.)',
          agentsReputationByToken: '/api/agents/reputation/by-token/{prefix} (free; same shape as the by-wallet card, indexed by tf_live_ token prefix for agents who have not signed an operator claim yet)',
          agentsLeaderboard: '/api/agents/leaderboard?metric=reliability|spend|activity|streak|composite&window=24h|7d|30d|all&limit=1-25 (free, cohort capped at 25; full cohort on /api/premium/agents/leaderboard/full at 1 credit)',
          agentsBans: '/api/agents/bans (free; transparency list of every banned wallet or token-prefix with reason + evidence_url; auto-bans for Chainalysis OFAC hits)',
          agentsBadgeByWallet: '/api/agents/badge/{wallet}.svg (free; embeddable 200x40 SVG reputation badge with composite rank, trust grade letter, reliability %. XSS-hardened, CSP-locked, 1h edge cache)',
          agentsBadgeByToken: '/api/agents/badge/by-token/{prefix}.svg (free; same shape, indexed by tf_live_ token prefix)',
          agentsClaim: 'POST /api/agents/claim with { message, signature } (free; EIP-191 signed claim binding a wallet to a display name + optional directory fields. Chainalysis-screened, Llama Guard pre-flighted, brand-allowlist gated. Returns approved | queued | banned | rejected | retry_later.)',
          agentsClaimRead: 'GET /api/agents/claim/{wallet} (free; read the verified operator claim record for a wallet)',
          agentsDirectorySearch: 'GET /api/agents/directory/search?skill=&service_area=&language=&available=true|false&max_rate=&min_experience=&verified=true&limit=1-25 (free; agent self-directory search. Verified-hireable members sort first. Operators self-describe; TF publishes the listing. Off-platform transactions only — TF is publisher, not facilitator.)',
          agentsDirectorySkills: 'GET /api/agents/directory/skills (free; tally of skill tags across the active directory cohort, sorted by count desc)',
          agentsDirectoryCategories: 'GET /api/agents/directory/categories (free; tally of service_area tags across the active directory cohort)',
          premiumAgentsLeaderboardFull: '/api/premium/agents/leaderboard/full?metric=&window= (1 credit, AFTA-signed; untruncated reputation leaderboard with full cards for every ranked agent. Free /api/agents/leaderboard caps at 25.)',
          jobsBrowse:
            '/api/jobs (free; up to 25 active agent-work listings, newest first; ?limit=1-25&category=&q=. Listings are third-party content; TensorFeed is a listing and discovery service and never a party to any transaction)',
          jobsById: '/api/jobs/{id} (free; single listing; 404 on unknown or removed)',
          jobsPremium:
            '/api/premium/jobs (1 credit, AFTA-signed; full and filtered cohort ?category=&q=&status=active|filled|closed|expired; removed listings are never served)',
          jobsPost:
            'POST /api/jobs (tier 3, 5 credits about $0.10; requires a prepaid credits bearer token, the per-call x402 path is not accepted for writes; body is a free-text listing plus an EIP-191 signature, nonce, and signed_at; gated by schema allowlist, signed_at window, signature recovery to the poster wallet, single-use nonce, and Chainalysis OFAC fail-closed; settlement for the work is peer-to-peer off-platform; a rejected post is never charged and returns a signed no-charge receipt)',
          jobsClose:
            'POST /api/jobs/{id}/close (the original poster signs an EIP-191 close message, action-pinned and nonce single-use, no payment, marks the listing filled)',
          agentActivity: '/api/agents/activity',
          stats: '/api/stats (free; lifetime count of successful credit-debited premium API calls served, each returning a signed AFTA receipt when the receipt key is provisioned. Excludes free and crawler traffic. Edge-cached 60s.)',
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
          premiumSecurityGhsaAiFeed: '/api/premium/security/ghsa/ai-feed (1 credit; broader companion to the free supply-chain IOC feed. All GHSA advisory types (reviewed/unreviewed/malware) across all ecosystems (npm, pip, RubyGems, Maven, Go, Composer, NuGet, Rust, etc.), filtered to the same AI keyword list. Adds derived severity_band, age_days, ai_relevance.confidence per entry plus by_severity / by_ecosystem / by_type aggregates. Refresh every 6h. Posture: republish + derive + cite; primary source authority always wins.)',
          feedModelPricing: '/api/feeds/model-pricing (free; agent-sourced model pricing observations published by the cold-start gig flywheel. Each row was submitted with a primary-source source_url, validated at intake, and accepted by a human reviewer. Returns observations (newest accepted first), latest-per-(model,vendor), and a summary. Optional ?model=&vendor=&limit=. Provenance-distinct from the curated TF pricing catalog; source_url is the authority)',
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
          aiTrainingCompute: '/api/ai/training-compute (free; daily snapshot of the Epoch AI Models dataset: per-model training compute in FLOP, parameters, training dataset size, training compute cost in 2023 USD, training power draw, frontier flag, org, domain, country, accessibility, primary-source link. Fills the AI training-compute gap; complements /api/models. License: Epoch AI CC-BY-4.0, attribution in payload. Daily snapshots compound for a future premium compute-trend series.)',
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
          premiumCleanCVE: '/api/premium/clean/cve/{CVE-id} (1 credit; LLM-ready CVE record: ~80% token reduction vs raw MITRE v5.2, with derived severity_band, deduped CWEs, flat affected_products, top references)',
          premiumCleanKEV: '/api/premium/clean/kev/{CVE-id} (1 credit; LLM-ready KEV entry with normalized ransomware_use enum and extracted notes_urls)',
          premiumCleanEPSS: '/api/premium/clean/epss/{CVE-id}?series=true|false (1 credit; LLM-ready EPSS score with derived risk_band; optional series=true returns first/min/max summary instead of full series)',
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
          premiumPolicyTimeline: '/api/premium/policy/timeline?days_back=&days_forward=&jurisdiction= (1 credit; forward + backward calendar over the AI policy registry with relative-to-now classification, next-3-milestones, days-until-effective per entry)',
          premiumEconomySeriesHistory: '/api/premium/economy/series/{bls|fred}/{series_id} (1 credit; full upstream history with YoY paired series, 3-month and 12-month moving averages, min/max, trend direction. Free /api/economy/* caps at 24 or 90 obs; this is the full archive plus compute.)',
          premiumPackagesPyPIMomentum: '/api/premium/packages/pypi/momentum (1 credit; momentum + velocity ratio per AI/ML PyPI package over the free trending snapshot, with direction classification, notable-movers, by-category counts. npm momentum follows once rolling snapshot history accumulates.)',
          premiumResearchVelocity: '/api/premium/research/velocity (1 credit; per-institution velocity over the OpenAlex 365-day baseline + fresh 30-day window, with direction classification, notable-movers, by-country and by-type breakdowns)',
          premiumResearchAuthors: '/api/premium/research/authors (1 credit; top 100 AI authors ranked by AI publication volume in the trailing 365 days. Enriched with h_index, i10_index, cited_by_count, primary affiliation (institution + country), ORCID, derived ai_share_pct (AI works as share of total). OpenAlex CC0. Daily refresh.)',
          premiumResearchCitationVelocity: '/api/premium/research/citation-velocity (1 credit; top 100 recent AI papers ranked by share of total citations gained in the most recent calendar year. Papers published in the last 2 years with 3+ citations. Returns title, year, total + latest-year citations, share, DOI, venue, first 3 authors, primary affiliation. OpenAlex CC0. Daily refresh.)',
          premiumApisGuruAiFeed: '/api/premium/apis-guru/ai-feed (1 credit; AI-relevant entries from the APIs.guru public directory of 2400+ OpenAPI specs, filtered via curated keyword match on provider + title + description. Per-entry first_seen_at against our daily snapshot history so agents can diff "what new AI APIs appeared in the last 7 days." Includes by_provider counts + a separate newly_added_last_7d array. CC-BY-SA 4.0; primary source links preserved.)',
          premiumResearchMilestones: '/api/premium/research/milestones (1 credit; last 30 days of arXiv preprints flagged is_milestone_candidate by an offline Qwen 3.6 27B per-paper extraction pass. Each paper carries structured reasoning stating the named benchmark + quantified delta, model release, or novel architecture justification. Conservative; false positives are worse than false negatives.)',
          premiumCveKevExploitationTimeline: '/api/premium/cve/kev-exploitation-timeline?vendor= (1 credit, strict-premium; per-vendor exploited-in-the-wild history from the cve-kev-2026 dataset. One vendor per call: NVD disclosure date, days to CISA KEV listing, vendor patch status, ransomware association, severity distribution, mean and fastest KEV-add lag. Offline per-CVE extraction + deterministic per-vendor rollup. v1 capped slice, expandable. NVD + CISA KEV US public domain.)',
          premiumSecurityCorroborated: '/api/premium/security/corroborated?package= (1 credit, strict-premium; the full corroborated GHSA advisory set for one package in one call. Per advisory: the deterministic affected-package vs authoritative-OSV verdict (never-false-confirm), plus KEV/EPSS/SSVC/OSV enrichment joined ONLY by a verbatim-verified CVE id, plus verbatim version/severity context, each in an explicit provenance bucket. We corroborate the package and enrich by verified CVE id; we do NOT verify the advisory exploitation/severity claims. Quarantined records never served. Offline extraction + deterministic corroboration + verbatim-CVE guard.)',
          premiumResearchEmergingKeywords: '/api/premium/research/emerging-keywords (1 credit; top-50 multi-word keyphrases across recent arXiv abstracts ranked by recent-vs-baseline lift, last 30d frequency over prior 90d, smoothed. Each entry carries 2-5 example arxiv_ids.)',
          premiumResearchTopicSearch: '/api/premium/research/topic-search?subfield_tag=&methodology_bucket=&since=&until=&milestone_only=&limit=&offset= (1 credit; structured search over the arXiv preprint corpus using TF derived taxonomy. Filters arXiv by subfield + methodology, dimensions arXiv\'s native search has no concept of.)',
          premiumResearchLabProductivity: '/api/premium/research/lab-productivity?window=&affiliation_type=&limit= (1 credit; top labs by paper count over 30d/90d/365d windows, derived from TF normalized affiliations on the offline Qwen extraction. Filter by window (30d|90d|365d, default returns all three) and affiliation_type (industry|academia|government|nonprofit|mixed). arXiv has no native concept of normalized lab attribution.)',
          premiumRecessionWatch: '/api/premium/economy/recession-watch (1 credit; composite recession-risk signal across yield-curve inversion + Sahm rule, with red/yellow/green classification per signal and a composite verdict)',
          premiumProbeSeries: '/api/premium/probe/series?provider=&from=&to=',
          premiumOpenRouterSeries: '/api/premium/openrouter/series?from=&to= (1 credit; daily OpenRouter cross-provider catalog drift over a 90-day window: model count, cheapest paid input/output USD-per-million floor, free-tier count, namespace breadth, plus day-over-day model add/remove churn and per-model price-change counts. OpenRouter serves only current state, so this history is TensorFeed-captured and cannot be backfilled. Default 30 days, max 90.)',
          premiumX402RegistrySeries: '/api/premium/x402-registry/series?from=&to= (1 credit; daily x402 publisher-registry drift over a 90-day window: reachable vs erroring publishers, federation count, network breadth, paid and free endpoint totals, agent-fair-trade declarations, plus day-over-day domains added/removed, status flips, and payment-wallet changes. A registry is current-state only, so this history is TensorFeed-captured and cannot be backfilled. Default 30 days, max 90.)',
          premiumHFVelocity: '/api/premium/hf/velocity?from=&to= (1 credit; daily Hugging Face download-velocity over a 90-day window: per-day top models and datasets by download delta and top Spaces by likes delta among the daily top-30, top-set entered/exited churn, plus window gainers (last minus first captured day). HF exposes only cumulative totals and a live top list, so this velocity is TensorFeed-computed and cannot be backfilled. Default 30 days, max 90.)',
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
          statsBackfill: '/api/admin/stats/backfill?key=<ADMIN_KEY> (GET; one-time/idempotent seed of the /api/stats lifetime counter from the persisted daily rollups)',
          usageDates: '/api/admin/usage/dates?key=<ADMIN_KEY>',
          burnToken: '/api/admin/burn-token?token=tf_live_...&key=<ADMIN_KEY>',
          anomalies: '/api/admin/anomalies?key=<ADMIN_KEY>&severity=warning|critical',
          killSwitch: '/api/admin/kill-switch?key=<ADMIN_KEY> (GET = status + audit; POST&action=on|off to flip the runtime KV-flag side. Env-secret side via wrangler secret put KILL_SWITCH_KV_WRITES.)',
          refresh: '/api/refresh?key=<ADMIN_KEY>[&task=history|mcp-registry|papers|arxiv|hf|hf-leaderboard|hot-issues|reddit|openrouter|hf-daily-papers|probe|probe-rollup|fred|bls|npm-ai|pypi-ai|openalex|openalex-authors|openalex-citation-velocity|apis-guru-ai|nflverse|sports-news|opportunities|ai-supply-chain-iocs|ghsa-ai-feed|agent-reputation|epoch]',
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

    // === AI TRAINING COMPUTE (free) ===
    // Daily snapshot of the Epoch AI "AI Models" dataset: per-model
    // training compute (FLOP), parameters, dataset size, compute cost,
    // power draw, frontier flag. Fills the AI-data-library gap "AI
    // training compute / FLOPs" and complements /api/models. CC-BY-4.0;
    // Epoch attribution is in the payload (license-required). Daily
    // cron refresh via /api/refresh?task=epoch; lazy capture-on-miss.
    if (path === '/api/ai/training-compute') {
      const snapshot = await getLatestEpochSnapshot(env);
      if (!snapshot) {
        return jsonResponse({ ok: false, error: 'epoch_unavailable' }, 503);
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

    // === PAID PREMIUM: AGENT REPUTATION BUREAU (1 credit) ===
    // Untruncated leaderboard with full reputation cards for every
    // ranked agent. Free /api/agents/leaderboard caps at 25; this
    // returns the full cohort for ops dashboards + cross-marketplace
    // routing decisions. AFTA-signed receipt on every response.
    if (path === '/api/premium/agents/leaderboard/full') {
      const payment = await requirePayment(request, env, 1);
      if (!payment.paid) return payment.response!;

      const metricParam = (url.searchParams.get('metric') ?? 'composite') as RankableMetric;
      const windowParam = (url.searchParams.get('window') ?? 'all') as LeaderboardWindow;
      if (!ALL_METRICS.includes(metricParam)) {
        return jsonResponse(
          { ok: false, error: 'invalid_metric', allowed: ALL_METRICS },
          400,
        );
      }
      if (!ALL_WINDOWS.includes(windowParam)) {
        return jsonResponse(
          { ok: false, error: 'invalid_window', allowed: ALL_WINDOWS },
          400,
        );
      }
      const ids = await getLeaderboard(env, metricParam, windowParam);
      const cards = await Promise.all(
        ids.map(async (id) => {
          const isWallet = id.startsWith('0x');
          const card = isWallet
            ? await getReputationCardByWallet(env, id)
            : await getReputationCardByToken(env, id);
          return { id, card };
        }),
      );
      ctx.waitUntil(
        logPremiumUsage(
          env,
          '/api/premium/agents/leaderboard/full',
          request.headers.get('User-Agent') || 'unknown',
          1,
          payment.token,
        ),
      );
      return await premiumResponse(
        {
          ok: true,
          metric: metricParam,
          window: windowParam,
          total: ids.length,
          results: cards,
        },
        payment,
        1,
        request,
        env,
      );
    }

    // TensorFeed Jobs: premium read. Untruncated + filtered cohort.
    // 1 credit, AFTA-signed, reusing the exact audited premium wrapper.
    // 'removed' is deliberately NOT an allowed status filter: removed
    // listings were taken down for a TOS violation and must not be
    // re-served on any public or paid surface. Admin visibility only.
    if (path === '/api/premium/jobs') {
      const payment = await requirePayment(request, env, 1);
      if (!payment.paid) return payment.response!;

      const PUBLIC_STATUSES = ['active', 'filled', 'closed', 'expired'] as const;
      const statusParam = url.searchParams.get('status') ?? 'active';
      if (!(PUBLIC_STATUSES as readonly string[]).includes(statusParam)) {
        return jsonResponse(
          { ok: false, error: 'invalid_status', allowed: PUBLIC_STATUSES },
          400,
        );
      }
      const nowSec = Math.floor(Date.now() / 1000);
      const limParam = parseInt(url.searchParams.get('limit') ?? '200', 10);
      const limit = Number.isFinite(limParam)
        ? Math.max(1, Math.min(500, limParam))
        : 200;
      const category = url.searchParams.get('category') || undefined;
      const q = url.searchParams.get('q') || undefined;
      const gigs = await listGigs(env, {
        now: nowSec,
        limit,
        status: statusParam as (typeof PUBLIC_STATUSES)[number],
        category,
        q,
      });
      ctx.waitUntil(
        logPremiumUsage(
          env,
          '/api/premium/jobs',
          request.headers.get('User-Agent') || 'unknown',
          1,
          payment.token,
        ),
      );
      return await premiumResponse(
        {
          ok: true,
          status: statusParam,
          category: category ?? null,
          q: q ?? null,
          count: gigs.length,
          jobs: gigs.map((g) => toPublicGig(g, nowSec)),
        },
        payment,
        1,
        request,
        env,
      );
    }

    if (path === '/api/premium/history/pricing/series') {
      // Strict-premium tier 2 ($0.04): full-window historical time-series,
      // no per-IP trial. See worker/src/strict-premium-endpoints.ts.
      const payment = await requirePayment(request, env, 2);
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
        logPremiumUsage(env, '/api/premium/history/pricing/series', request.headers.get('User-Agent') || 'unknown', 2, payment.token),
      );
      return await premiumResponse(result, payment, 2, request, env);
    }

    if (path === '/api/premium/history/benchmarks/series') {
      // Strict-premium tier 2 ($0.04): full-window historical time-series.
      const payment = await requirePayment(request, env, 2);
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
        logPremiumUsage(env, '/api/premium/history/benchmarks/series', request.headers.get('User-Agent') || 'unknown', 2, payment.token),
      );
      return await premiumResponse(result, payment, 2, request, env);
    }

    if (path === '/api/premium/history/status/uptime') {
      // Strict-premium tier 2 ($0.04): full-window historical time-series.
      const payment = await requirePayment(request, env, 2);
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
        logPremiumUsage(env, '/api/premium/history/status/uptime', request.headers.get('User-Agent') || 'unknown', 2, payment.token),
      );
      return await premiumResponse(result, payment, 2, request, env);
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
        if (raw.error === 'cve_not_found' || raw.error === 'invalid_cve_id') {
          // Client/validation no-charge: route through the AFTA ledger +
          // signed receipt + no-charge abuse cap (B-F4).
          return await premiumValidationFailure(
            { ok: false, error: raw.error, cve_id: raw.cveId, attribution: raw.attribution },
            payment,
            request,
            env,
          );
        }
        // Upstream MITRE failure: a 5xx-class no-charge, NOT a client
        // validation failure. Keep the 502 + raw shape (deferred-debit
        // already means no charge). The uniform signed 5xx no-charge
        // receipt for this class is B-F3, not B-F4; do not mislabel it
        // as schema_validation_failure or downgrade it to 400.
        return jsonResponse(
          { ok: false, error: raw.error, cve_id: raw.cveId, attribution: raw.attribution },
          502,
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
        return await premiumValidationFailure(
          {
            ok: false,
            error: 'not_in_kev',
            cve_id: cleanKevMatch[1].toUpperCase(),
            hint: 'CVE may exist in MITRE CVE List but not be on the CISA KEV catalog.',
            attribution: KEV_ATTRIBUTION,
          },
          payment,
          request,
          env,
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
      // Strict-premium tier 3 ($0.06): heavy cross-provider aggregation,
      // incident_count + MTTR computed per provider.
      const payment = await requirePayment(request, env, 3);
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
          3,
          payment.token,
        ),
      );
      return await premiumResponse(result, payment, 3, request, env);
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

    // === PAID PREMIUM: OPENROUTER CATALOG DRIFT SERIES (Tier 1, 1 credit) ===
    // Daily cross-provider OpenRouter catalog series over or:daily. The
    // capture runs on the 14:00 UTC cron; OpenRouter serves only current
    // state, so this history cannot be backfilled. Non-strict (from/to
    // optional, default 30 days) like the MCP registry series. 90-day max.
    if (path === '/api/premium/openrouter/series') {
      const payment = await requirePayment(request, env, 1);
      if (!payment.paid) return payment.response!;

      const range = resolveORRange(url.searchParams.get('from'), url.searchParams.get('to'));
      if (!range.ok) {
        return jsonResponse(
          {
            ok: false,
            error: range.error,
            limits: {
              max_range_days: OR_MAX_RANGE_DAYS,
              default_range_days: OR_DEFAULT_RANGE_DAYS,
            },
          },
          400,
        );
      }

      const result = await getORSeries(env, range.from!, range.to!);
      ctx.waitUntil(
        logPremiumUsage(env, '/api/premium/openrouter/series', request.headers.get('User-Agent') || 'unknown', 1, payment.token),
      );
      return await premiumResponse(result, payment, 1, request, env);
    }

    // === PAID PREMIUM: X402 PUBLISHER REGISTRY DRIFT SERIES (Tier 1, 1 credit) ===
    // Daily x402 publisher-registry series over x402-reg:daily. The
    // crawl runs on the daily registry cron; a registry is current-state
    // only, so this history cannot be backfilled. Non-strict (from/to
    // optional, default 30 days) like the other series. 90-day max.
    if (path === '/api/premium/x402-registry/series') {
      const payment = await requirePayment(request, env, 1);
      if (!payment.paid) return payment.response!;

      const range = resolveX402RegRange(url.searchParams.get('from'), url.searchParams.get('to'));
      if (!range.ok) {
        return jsonResponse(
          {
            ok: false,
            error: range.error,
            limits: {
              max_range_days: X402REG_MAX_RANGE_DAYS,
              default_range_days: X402REG_DEFAULT_RANGE_DAYS,
            },
          },
          400,
        );
      }

      const result = await getX402RegSeries(env, range.from!, range.to!);
      ctx.waitUntil(
        logPremiumUsage(env, '/api/premium/x402-registry/series', request.headers.get('User-Agent') || 'unknown', 1, payment.token),
      );
      return await premiumResponse(result, payment, 1, request, env);
    }

    // === PAID PREMIUM: HUGGING FACE DOWNLOAD-VELOCITY SERIES (Tier 1, 1 credit) ===
    // Day-over-day download velocity over hf:daily. The capture runs on
    // the 12:00 UTC cron; HF exposes only cumulative totals and a live
    // top list, so this velocity cannot be backfilled. Non-strict
    // (from/to optional, default 30 days) like the other series. 90-day max.
    if (path === '/api/premium/hf/velocity') {
      const payment = await requirePayment(request, env, 1);
      if (!payment.paid) return payment.response!;

      const range = resolveHFVelRange(url.searchParams.get('from'), url.searchParams.get('to'));
      if (!range.ok) {
        return jsonResponse(
          {
            ok: false,
            error: range.error,
            limits: {
              max_range_days: HFVEL_MAX_RANGE_DAYS,
              default_range_days: HFVEL_DEFAULT_RANGE_DAYS,
            },
          },
          400,
        );
      }

      const result = await getHFVelocitySeries(env, range.from!, range.to!);
      ctx.waitUntil(
        logPremiumUsage(env, '/api/premium/hf/velocity', request.headers.get('User-Agent') || 'unknown', 1, payment.token),
      );
      return await premiumResponse(result, payment, 1, request, env);
    }

    // === PAID PREMIUM: LLM PROBE TIME SERIES (Tier 1, 1 credit) ===
    // Per-day SLA series for one provider: count, ok_pct, ttfb p50/p95/p99,
    // total p50/p95/p99, incident-hour count. The data is unique because
    // we measure it ourselves; no public source publishes 30/90-day SLA
    // history per LLM provider. 90-day max range, default 30 days back.

    if (path === '/api/premium/probe/series') {
      // Strict-premium tier 3 ($0.06): TF-measured latency series unique
      // to TF (we record it ourselves), 90-day window.
      const payment = await requirePayment(request, env, 3);
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
        logPremiumUsage(env, '/api/premium/probe/series', request.headers.get('User-Agent') || 'unknown', 3, payment.token),
      );
      return await premiumResponse(result, payment, 3, request, env);
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
      // Strict-premium tier 3 ($0.06): derived metrics over the free
      // funding/portfolio registry. Silicon-concentration + circular-
      // exposure + co-investor pairs computed server-side.
      const payment = await requirePayment(request, env, 3);
      if (!payment.paid) return payment.response!;

      const result = computeFundingExposure();
      if (!result.ok) {
        return await premiumValidationFailure(
          { error: result.error, ...(result.hint ? { hint: result.hint } : {}) },
          payment, request, env, 'upstream_failure',
        );
      }

      ctx.waitUntil(
        logPremiumUsage(env, '/api/premium/funding/exposure', request.headers.get('User-Agent') || 'unknown', 3, payment.token),
      );
      return await premiumResponse({ ...result, capturedAt: result.capturedAt }, payment, 3, request, env);
    }

    // === PAID PREMIUM: CVE KEV EXPLOITATION TIMELINE (Tier 1, 1 credit) ===
    // /api/premium/cve/kev-exploitation-timeline?vendor=<name>
    // Per-vendor exploited-in-the-wild history from the bundled
    // cve-kev-2026 dataset: NVD disclosure date, days to CISA KEV
    // listing, patch status, ransomware association, rolled up so an
    // agent gets a vendor's whole KEV timeline in one call. Strict-
    // premium (param-required); v1 is a capped slice, not full KEV.

    if (path === '/api/premium/cve/kev-exploitation-timeline') {
      const payment = await requirePayment(request, env, 1);
      if (!payment.paid) return payment.response!;

      const result = computeCveKevTimeline(url.searchParams.get('vendor'));
      if (!result.ok) {
        // missing_vendor / vendor_not_found are caller-input problems,
        // so the AFTA receipt no_charge_reason is schema_validation_failure
        // (the agent's input did not validate, not "our upstream is down").
        return await premiumValidationFailure(
          {
            error: result.error,
            ...(result.hint ? { hint: result.hint } : {}),
            ...(result.available_vendor_sample
              ? { available_vendor_sample: result.available_vendor_sample }
              : {}),
          },
          payment, request, env, 'schema_validation_failure',
        );
      }

      ctx.waitUntil(
        logPremiumUsage(env, '/api/premium/cve/kev-exploitation-timeline', request.headers.get('User-Agent') || 'unknown', 1, payment.token),
      );
      return await premiumResponse(result, payment, 1, request, env);
    }

    // === PAID PREMIUM: SECURITY CROSS-SOURCE CORROBORATED (Tier 1, 1 credit) ===
    // /api/premium/security/corroborated?package=<name>
    // One package's full corroborated GHSA advisory set in one call.
    // Per advisory: the deterministic affected-package vs authoritative-
    // OSV verdict (never-false-confirm), KEV/EPSS/SSVC/OSV enrichment
    // joined ONLY by a verbatim-verified CVE id, and verbatim version/
    // severity context, each in an explicit provenance bucket. We
    // corroborate the package and enrich by verified CVE id; we do NOT
    // verify the advisory exploitation/severity claims. Quarantined
    // (extraction_suspect) records are never in the dataset. Strict-
    // premium (param-required); bundled offline, zero KV at request time.

    if (path === '/api/premium/security/corroborated') {
      const payment = await requirePayment(request, env, 1);
      if (!payment.paid) return payment.response!;

      const result = computeSecurityXsource(url.searchParams.get('package'));
      if (!result.ok) {
        // missing_package / package_not_found are caller-input problems,
        // so the AFTA receipt no_charge_reason is schema_validation_failure
        // (the agent's input did not validate, not "our upstream is down").
        return await premiumValidationFailure(
          {
            error: result.error,
            ...(result.hint ? { hint: result.hint } : {}),
            ...(result.available_package_sample
              ? { available_package_sample: result.available_package_sample }
              : {}),
          },
          payment, request, env, 'schema_validation_failure',
        );
      }

      ctx.waitUntil(
        logPremiumUsage(env, '/api/premium/security/corroborated', request.headers.get('User-Agent') || 'unknown', 1, payment.token),
      );
      return await premiumResponse(result, payment, 1, request, env);
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

    // === INCIDENT TRIAGE (free, cached 300s) ===
    // /api/status/incidents/triage?limit=
    // Haiku-derived structured agent triage cards over AI provider
    // status incidents. Each card answers "is this affecting my
    // workload, how severe, what should I do." Free tier capped at 25.
    // Refreshed every 2 hours at :15 UTC.

    if (path === '/api/status/incidents/triage') {
      const { getIncidentTriageSnapshot } = await import('./incident-triage-generator');
      const snap = await getIncidentTriageSnapshot(env);
      if (!snap) {
        return jsonResponse({
          ok: false,
          error: 'snapshot_not_ready',
          hint: 'Incident triage refreshes every 2 hours at :15 UTC. After deploy + first cron tick, this endpoint populates within 2 hours.',
        }, 503, 0);
      }
      const limit = (() => {
        const n = parseInt(url.searchParams.get('limit') ?? '', 10);
        return Number.isFinite(n) && n > 0 ? Math.min(n, 25) : 25;
      })();
      return jsonResponse({
        ok: true,
        source: snap.source,
        model: snap.model,
        capturedAt: snap.capturedAt,
        incidents_considered: snap.incidents_considered,
        incidents_succeeded: snap.incidents_succeeded,
        ongoing_count: snap.ongoing_count,
        resolved_count: snap.resolved_count,
        cards_total: snap.cards.length,
        cards: snap.cards.slice(0, limit),
        attribution: {
          source: 'TensorFeed.ai status polling + Claude Haiku 4.5 (Anthropic). Each card cites the originating incident_id.',
          license: 'Derivative agent-facing summary over public provider status pages. Conservative classifications for agent decision support.',
          notes: 'Free tier capped at 25 cards. Premium endpoint at /api/premium/status/incidents/triage returns the full cohort with provider + impact + action + capability + ongoing_only filters.',
        },
      }, 200, 300);
    }

    // === PAID PREMIUM: INCIDENT TRIAGE (Tier 1, 1 credit) ===
    // /api/premium/status/incidents/triage?provider=&impact=&recommended_action=&capability=&ongoing_only=
    // Full Haiku-triaged incident cohort with filters and rollups.
    // Sort priority: impact desc > recommended_action desc > started_at desc.

    if (path === '/api/premium/status/incidents/triage') {
      const payment = await requirePayment(request, env, 1);
      if (!payment.paid) return payment.response!;

      const { getIncidentTriageSnapshot } = await import('./incident-triage-generator');
      const snap = await getIncidentTriageSnapshot(env);
      if (!snap) {
        return await premiumValidationFailure(
          { error: 'snapshot_not_ready', hint: 'Incident triage refreshes every 2 hours at :15 UTC. Retry after the next cron tick.' },
          payment, request, env, 'upstream_failure',
        );
      }

      const { buildTriageResponse, parseProvider, parseImpact, parseRecommendedAction, parseCapability, parseOngoingOnly } = await import('./premium-incident-triage');
      const result = buildTriageResponse(snap, {
        provider: parseProvider(url.searchParams.get('provider')),
        impact: parseImpact(url.searchParams.get('impact')),
        recommended_action: parseRecommendedAction(url.searchParams.get('recommended_action')),
        capability: parseCapability(url.searchParams.get('capability')),
        ongoing_only: parseOngoingOnly(url.searchParams.get('ongoing_only')),
      });

      ctx.waitUntil(
        logPremiumUsage(env, '/api/premium/status/incidents/triage', request.headers.get('User-Agent') || 'unknown', 1, payment.token),
      );
      return await premiumResponse(result, payment, 1, request, env);
    }

    // === NEWS ACTION CARDS (free, cached 600s) ===
    // /api/news/action-cards?limit=
    // Haiku-derived structured agent action cards over the day's news
    // feed. Each card answers "what should an AI agent or operator DO
    // in response to this article?" with affected_capability, cost_impact,
    // security_impact, urgency, and an optional migration_recommendation.
    // Free tier capped at 25 cards. Refreshed daily at 08:00 UTC.

    if (path === '/api/news/action-cards') {
      const { getActionCardsSnapshot } = await import('./action-cards-generator');
      const snap = await getActionCardsSnapshot(env);
      if (!snap) {
        return jsonResponse({
          ok: false,
          error: 'snapshot_not_ready',
          hint: 'News action cards refresh daily at 08:00 UTC. After deploy + first cron tick, this endpoint populates within 24 hours.',
        }, 503, 0);
      }
      const limit = (() => {
        const n = parseInt(url.searchParams.get('limit') ?? '', 10);
        return Number.isFinite(n) && n > 0 ? Math.min(n, 25) : 25;
      })();
      return jsonResponse({
        ok: true,
        source: snap.source,
        model: snap.model,
        capturedAt: snap.capturedAt,
        articles_considered: snap.articles_considered,
        articles_succeeded: snap.articles_succeeded,
        cards_total: snap.cards.length,
        cards: snap.cards.slice(0, limit),
        attribution: {
          source: 'TensorFeed.ai news + Claude Haiku 4.5 (Anthropic). Each card cites the underlying article via article_url.',
          license: 'Derivative agent-facing summary. Underlying articles remain the property of their publishers; we link back via article_url and never republish the full article body.',
          notes: 'Free tier capped at 25 cards. Premium endpoint at /api/premium/news/action-cards returns the full cohort with capability + urgency + impact-threshold + query filters and editorial sort.',
        },
      }, 200, 600);
    }

    // === PAID PREMIUM: NEWS ACTION CARDS (Tier 1, 1 credit) ===
    // /api/premium/news/action-cards?capability=&urgency=&min_cost_impact=&min_security_impact=&query=
    // Full Haiku-derived action-card cohort with filters and rollups.
    // Sort priority: urgency desc > security_impact desc > cost_impact desc > published desc.

    if (path === '/api/premium/news/action-cards') {
      const payment = await requirePayment(request, env, 1);
      if (!payment.paid) return payment.response!;

      const { getActionCardsSnapshot } = await import('./action-cards-generator');
      const snap = await getActionCardsSnapshot(env);
      if (!snap) {
        return await premiumValidationFailure(
          { error: 'snapshot_not_ready', hint: 'News action cards refresh daily at 08:00 UTC. Retry after the next cron tick.' },
          payment, request, env, 'upstream_failure',
        );
      }

      const { buildCardsResponse, parseCapability, parseImpact, parseUrgency, parseQuery } = await import('./premium-news-action-cards');
      const result = buildCardsResponse(snap, {
        capability: parseCapability(url.searchParams.get('capability')),
        min_cost_impact: parseImpact(url.searchParams.get('min_cost_impact')),
        min_security_impact: parseImpact(url.searchParams.get('min_security_impact')),
        urgency: parseUrgency(url.searchParams.get('urgency')),
        query: parseQuery(url.searchParams.get('query')),
      });

      ctx.waitUntil(
        logPremiumUsage(env, '/api/premium/news/action-cards', request.headers.get('User-Agent') || 'unknown', 1, payment.token),
      );
      return await premiumResponse(result, payment, 1, request, env);
    }

    // === CODING HARNESSES LATEST (free, cached 600s) ===
    // /api/coding-harnesses/latest
    // Third AFTA federation cross-call. Returns the most recent snapshot
    // of TerminalFeed's coding-harness leaderboard (SWE-bench Verified,
    // Terminal-Bench, Aider Polyglot, SWE-Lancer, etc). Refreshed daily
    // at 05:25 UTC. Premium derivative at
    // /api/premium/coding-harnesses/weekly-deltas computes deltas vs a
    // prior-week snapshot.

    if (path === '/api/coding-harnesses/latest') {
      const { getHarnessSnapshot } = await import('./terminalfeed-harnesses-fetcher');
      const snap = await getHarnessSnapshot(env);
      if (!snap) {
        return jsonResponse({
          ok: false,
          error: 'snapshot_not_ready',
          hint: 'Coding-harness snapshot refreshes daily at 05:25 UTC. After deploy + first cron tick, this endpoint populates within 24 hours.',
        }, 503, 0);
      }
      return jsonResponse({
        ok: true,
        source: snap.source,
        capturedAt: snap.capturedAt,
        upstream_generated_at: snap.upstream_generated_at,
        benchmark_count: snap.benchmark_count,
        total_results: snap.total_results,
        benchmarks: snap.benchmarks,
        attribution: {
          source: 'TerminalFeed.io (AFTA federation sister site). Upstream: agentic-coding harness benchmark publishers via per-result source_url.',
          license: 'Federation cross-call to TerminalFeed free endpoint. Underlying benchmark scores carry their own per-source terms.',
          notes: 'Premium derivative at /api/premium/coding-harnesses/weekly-deltas computes score and rank deltas vs a prior-week snapshot.',
        },
      }, 200, 600);
    }

    // === CODING HARNESSES DATES INDEX (free, cached 600s) ===
    // /api/coding-harnesses/dates returns the ordered list of dates with
    // a captured TerminalFeed snapshot. Useful for an agent that wants
    // to know what historical points are available for delta queries.

    if (path === '/api/coding-harnesses/dates') {
      const { getHarnessDatesIndex } = await import('./terminalfeed-harnesses-fetcher');
      const dates = await getHarnessDatesIndex(env);
      return jsonResponse({
        ok: true,
        source: 'tensorfeed.ai (snapshot index)',
        count: dates.length,
        dates,
      }, 200, 600);
    }

    // === PAID PREMIUM: CODING HARNESSES WEEKLY DELTAS (Tier 1, 1 credit) ===
    // /api/premium/coding-harnesses/weekly-deltas?days_back=&harness=&benchmark=&model=&min_abs_delta=
    // Compares the current TerminalFeed harness snapshot to a prior
    // snapshot (default 7 days back, clamp [1, 90]). Returns delta rows
    // per (benchmark, harness, model), notable_movers (biggest_gainers,
    // biggest_regressions, entered, exited), per-benchmark leader cards
    // (canonical "who's #1 now vs then"), and summary rollups.

    if (path === '/api/premium/coding-harnesses/weekly-deltas') {
      const payment = await requirePayment(request, env, 1);
      if (!payment.paid) return payment.response!;

      const { getHarnessSnapshot, findPriorSnapshot } = await import('./terminalfeed-harnesses-fetcher');
      const current = await getHarnessSnapshot(env);
      if (!current) {
        return await premiumValidationFailure(
          { error: 'snapshot_not_ready', hint: 'Coding-harness snapshot refreshes daily at 05:25 UTC. Retry after the next cron tick.' },
          payment, request, env, 'upstream_failure',
        );
      }

      const { buildDeltasResponse, parseDaysBack, parseHarness, parseBenchmark, parseModelFilter, parseMinAbsDelta } = await import('./premium-harness-deltas');
      const days_back = parseDaysBack(url.searchParams.get('days_back'));
      const prior = await findPriorSnapshot(env, current, days_back);
      if (!prior) {
        return await premiumValidationFailure(
          {
            error: 'no_prior_snapshot',
            hint: `No snapshot found at-or-before ${days_back} days back. The index needs to accumulate before deltas can be computed (~${days_back} days after first deploy).`,
          },
          payment, request, env, 'upstream_failure',
        );
      }

      const result = buildDeltasResponse(current, prior, {
        days_back,
        harness: parseHarness(url.searchParams.get('harness')),
        benchmark: parseBenchmark(url.searchParams.get('benchmark')),
        model: parseModelFilter(url.searchParams.get('model')),
        min_abs_delta: parseMinAbsDelta(url.searchParams.get('min_abs_delta')),
      });

      ctx.waitUntil(
        logPremiumUsage(env, '/api/premium/coding-harnesses/weekly-deltas', request.headers.get('User-Agent') || 'unknown', 1, payment.token),
      );
      return await premiumResponse(result, payment, 1, request, env);
    }

    // === AI CRYPTO PULSE (free, cached 300s) ===
    // /api/ai-crypto-pulse
    // Second AFTA federation cross-call: TF pulls TerminalFeed's
    // /api/crypto-movers + /api/funding-rates, filters to the curated
    // AI-thesis token cohort (TAO, FET, RNDR, AKT, WLD, ARKM, etc.),
    // returns the raw cohort. Premium derivative at
    // /api/premium/ai-crypto-pulse joins price moves with funding-rate
    // skew for squeeze/chase classification.

    if (path === '/api/ai-crypto-pulse') {
      const { getOrRefreshCryptoSnapshot } = await import('./terminalfeed-crypto-fetcher');
      const snap = await getOrRefreshCryptoSnapshot(env);
      if (!snap) {
        return jsonResponse({
          ok: false,
          error: 'upstream_unreachable',
          hint: 'TerminalFeed.io did not respond and we have no cached snapshot. Retry in a few minutes.',
        }, 503, 0);
      }
      return jsonResponse({
        ok: true,
        source: snap.source,
        capturedAt: snap.capturedAt,
        upstream_endpoints: snap.upstream_endpoints,
        cohort: {
          movers_seen: snap.movers_cohort_size,
          funding_seen: snap.funding_cohort_size,
          failed_venues: snap.failed_venues,
        },
        movers: snap.movers,
        funding: snap.funding,
        attribution: {
          source: 'TerminalFeed.io (AFTA federation sister site). Upstream crypto data via TerminalFeed.',
          license: 'Federation cross-call to TerminalFeed free endpoints; upstream market data carries the upstream provider\'s own terms.',
          notes: 'Cohort filtered to TF-curated AI-thesis tokens. Premium derivative at /api/premium/ai-crypto-pulse joins price + funding for squeeze/chase classification.',
        },
      }, 200, 300);
    }

    // === PAID PREMIUM: AI CRYPTO PULSE (Tier 1, 1 credit) ===
    // /api/premium/ai-crypto-pulse?token=&setup=&min_abs_change_pct=
    // Joins the price-mover signal with the funding-rate signal over the
    // AI-thesis token cohort. Per-token setup classification:
    // squeeze_up (rising + negative funding = shorts trapped),
    // chase_up (rising + positive funding = leverage on long side),
    // squeeze_down, chase_down, coiled, neutral. The squeeze
    // classifications are the contrarian alpha agents pay for.

    if (path === '/api/premium/ai-crypto-pulse') {
      const payment = await requirePayment(request, env, 1);
      if (!payment.paid) return payment.response!;

      const { getOrRefreshCryptoSnapshot } = await import('./terminalfeed-crypto-fetcher');
      const snap = await getOrRefreshCryptoSnapshot(env);
      if (!snap) {
        return await premiumValidationFailure(
          { error: 'upstream_unreachable', hint: 'TerminalFeed.io did not respond and no cached snapshot is available. Retry in a few minutes.' },
          payment, request, env, 'upstream_failure',
        );
      }

      const { buildPulse, parseToken, parseSetup, parseMinAbsChangePct } = await import('./premium-ai-crypto-pulse');
      const result = buildPulse(snap, {
        token: parseToken(url.searchParams.get('token')),
        setup: parseSetup(url.searchParams.get('setup')),
        min_abs_change_pct: parseMinAbsChangePct(url.searchParams.get('min_abs_change_pct')),
      });

      ctx.waitUntil(
        logPremiumUsage(env, '/api/premium/ai-crypto-pulse', request.headers.get('User-Agent') || 'unknown', 1, payment.token),
      );
      return await premiumResponse(result, payment, 1, request, env);
    }

    // === AI VELOCITY (free, cached 600s) ===
    // /api/ai-velocity
    // First AFTA federation cross-call: TF pulls TerminalFeed's two
    // trending leaderboards (HF + GitHub), filters each to AI-relevant
    // entries, and returns the capped cohort. Lazy refresh on the
    // TerminalFeed fetch (30-min TTL on the snapshot). Premium derivative
    // at /api/premium/ai-velocity adds traction scoring, cross-
    // pollination, and rollups.

    if (path === '/api/ai-velocity') {
      const { getOrRefreshVelocitySnapshot } = await import('./terminalfeed-ai-velocity-fetcher');
      const snap = await getOrRefreshVelocitySnapshot(env);
      if (!snap) {
        return jsonResponse({
          ok: false,
          error: 'upstream_unreachable',
          hint: 'TerminalFeed.io did not respond and we have no cached snapshot. Retry in a few minutes.',
        }, 503, 0);
      }
      const limit = (() => {
        const n = parseInt(url.searchParams.get('limit') ?? '', 10);
        return Number.isFinite(n) && n > 0 ? Math.min(n, 30) : 15;
      })();
      return jsonResponse({
        ok: true,
        source: snap.source,
        capturedAt: snap.capturedAt,
        upstream_endpoints: snap.upstream_endpoints,
        hf: snap.hf.slice(0, limit),
        github: snap.github.slice(0, limit),
        attribution: {
          source: 'TerminalFeed.io (AFTA federation sister site)',
          license: 'Federation cross-call to TerminalFeed free endpoints; underlying HF + GitHub data carry their own terms.',
          notes: 'Capped at 15 per surface by default (max 30). Premium derivative at /api/premium/ai-velocity returns the full cohort + traction scoring + cross-pollination.',
        },
      }, 200, 600);
    }

    // === PAID PREMIUM: AI VELOCITY (Tier 1, 1 credit) ===
    // /api/premium/ai-velocity?pipeline=&language=&min_traction=&cross_only=
    // Derived ranking + cross-pollination over the TerminalFeed-sourced
    // HF + GitHub snapshot. Cohort intersection ("on both") is the
    // strongest signal: a model with both HF likes/downloads AND GitHub
    // stars is a higher-confidence agent investment than one only on
    // one surface.

    if (path === '/api/premium/ai-velocity') {
      const payment = await requirePayment(request, env, 1);
      if (!payment.paid) return payment.response!;

      const { getOrRefreshVelocitySnapshot } = await import('./terminalfeed-ai-velocity-fetcher');
      const snap = await getOrRefreshVelocitySnapshot(env);
      if (!snap) {
        return await premiumValidationFailure(
          { error: 'upstream_unreachable', hint: 'TerminalFeed.io did not respond and no cached snapshot is available. Retry in a few minutes.' },
          payment, request, env, 'upstream_failure',
        );
      }

      const { buildVelocity, parsePipeline, parseLanguage, parseMinTraction, parseCrossOnly } = await import('./premium-ai-velocity');
      const result = buildVelocity(snap, {
        pipeline: parsePipeline(url.searchParams.get('pipeline')),
        language: parseLanguage(url.searchParams.get('language')),
        min_traction: parseMinTraction(url.searchParams.get('min_traction')),
        cross_only: parseCrossOnly(url.searchParams.get('cross_only')),
      });

      ctx.waitUntil(
        logPremiumUsage(env, '/api/premium/ai-velocity', request.headers.get('User-Agent') || 'unknown', 1, payment.token),
      );
      return await premiumResponse(result, payment, 1, request, env);
    }

    // === AI PACKAGE RELEASES (free, cached 600s) ===
    // /api/packages/releases?ecosystem=&category=&package=&within_days=
    // Recent normalized release records for the curated AI/ML PyPI + npm
    // package list. Each record carries latest version + last 10 versions
    // with publish timestamps. Refreshed every 6h. Pairs with the existing
    // /api/packages/{pypi,npm}/ai-trending (downloads-ranked) and the
    // security snapshot at /api/ai-safety/packages/security.

    if (path === '/api/packages/releases') {
      const { getPackageReleasesSnapshot } = await import('./ai-package-releases-fetcher');
      const snap = await getPackageReleasesSnapshot(env);
      if (!snap) {
        return jsonResponse({
          ok: false,
          error: 'snapshot_not_ready',
          hint: 'Package-releases snapshot refreshes every 6 hours. After deploy + first cron tick, this endpoint populates within 6 hours.',
        }, 503, 0);
      }
      const ecosystem = url.searchParams.get('ecosystem');
      const pkg = url.searchParams.get('package')?.toLowerCase().trim() || null;
      const category = url.searchParams.get('category')?.toLowerCase().trim() || null;
      const withinDaysParam = parseInt(url.searchParams.get('within_days') ?? '', 10);
      const within_days = Number.isFinite(withinDaysParam) && withinDaysParam > 0 ? Math.min(withinDaysParam, 90) : null;

      let records = snap.records;
      if (ecosystem === 'PyPI' || ecosystem === 'npm') {
        records = records.filter((r) => r.ecosystem === ecosystem);
      }
      if (pkg) records = records.filter((r) => r.package.toLowerCase().includes(pkg));
      if (category) records = records.filter((r) => r.category.toLowerCase().includes(category));
      if (within_days !== null) {
        const cutoff = Date.now() - within_days * 24 * 60 * 60 * 1000;
        records = records.filter((r) => {
          const t = new Date(r.latest_published_at).getTime();
          return Number.isFinite(t) && t >= cutoff;
        });
      }

      return jsonResponse({
        ok: true,
        source: snap.source,
        source_license: snap.source_license,
        capturedAt: snap.capturedAt,
        package_count: records.length,
        records,
        attribution: {
          source: 'PyPI and npm registry JSON endpoints (public)',
          license: 'Registry metadata is public; per-package licenses vary. Source homepage included on every record for verification.',
          notes: 'Refreshed every 6 hours. Premium derivative at /api/premium/packages/releases/velocity adds bump classification (major/minor/patch/prerelease) and breaking-change radar.',
        },
      }, 200, 600);
    }

    // === PAID PREMIUM: PACKAGE RELEASES VELOCITY (Tier 1, 1 credit) ===
    // /api/premium/packages/releases/velocity?ecosystem=&category=&package=&min_releases_7d=
    // Derived velocity rollups + breaking-change radar over the package
    // releases snapshot. Per-package: releases_24h/7d/30d, latest_bump_kind,
    // is_breaking_recent. Notable movers across the cohort.

    if (path === '/api/premium/packages/releases/velocity') {
      const payment = await requirePayment(request, env, 1);
      if (!payment.paid) return payment.response!;

      const { getPackageReleasesSnapshot } = await import('./ai-package-releases-fetcher');
      const snap = await getPackageReleasesSnapshot(env);
      if (!snap) {
        return await premiumValidationFailure(
          { error: 'snapshot_not_ready', hint: 'Package-releases snapshot refreshes every 6 hours. Retry after the next cron tick.' },
          payment, request, env, 'upstream_failure',
        );
      }

      const { buildVelocity, parseEcosystem, parseCategory, parsePackage, parseMinReleases7d } = await import('./premium-package-releases-velocity');
      const result = buildVelocity(snap, {
        ecosystem: parseEcosystem(url.searchParams.get('ecosystem')),
        category: parseCategory(url.searchParams.get('category')),
        package: parsePackage(url.searchParams.get('package')),
        min_releases_7d: parseMinReleases7d(url.searchParams.get('min_releases_7d')),
      }, new Date());

      ctx.waitUntil(
        logPremiumUsage(env, '/api/premium/packages/releases/velocity', request.headers.get('User-Agent') || 'unknown', 1, payment.token),
      );
      return await premiumResponse(result, payment, 1, request, env);
    }

    // === AI PACKAGE SECURITY (free, cached 600s) ===
    // /api/ai-safety/packages/security?package=&ecosystem=&category=
    // Per-package vulnerability history over the curated AI/ML PyPI + npm
    // package list. Pulled daily from OSV.dev (Apache-2.0 schema; upstream
    // GHSA + PyPA + RustSec + etc records carry their own terms). Each
    // package record includes count breakdowns and the full advisory list.

    if (path === '/api/ai-safety/packages/security') {
      const { getAiPackageSecuritySnapshot } = await import('./ai-package-security-fetcher');
      const snap = await getAiPackageSecuritySnapshot(env);
      if (!snap) {
        return jsonResponse({
          ok: false,
          error: 'snapshot_not_ready',
          hint: 'AI-package security snapshot refreshes daily at 05:45 UTC. After deploy + first cron tick, this endpoint populates within 24 hours.',
        }, 503, 0);
      }
      const ecosystem = url.searchParams.get('ecosystem');
      const pkg = url.searchParams.get('package')?.toLowerCase().trim() || null;
      const category = url.searchParams.get('category')?.toLowerCase().trim() || null;

      let records = snap.records;
      if (ecosystem === 'PyPI' || ecosystem === 'npm') {
        records = records.filter((r) => r.ecosystem === ecosystem);
      }
      if (pkg) {
        records = records.filter((r) => r.package.toLowerCase().includes(pkg));
      }
      if (category) {
        records = records.filter((r) => r.category.toLowerCase().includes(category));
      }

      return jsonResponse({
        ok: true,
        source: snap.source,
        source_license: snap.source_license,
        capturedAt: snap.capturedAt,
        package_count: records.length,
        records,
        attribution: {
          source: 'OSV.dev (aggregator of GHSA, PyPA, RustSec, Go vulndb, Maven, npm and others)',
          license: 'Apache-2.0 for the OSV schema. Upstream advisories carry their own per-source terms (GHSA CC-BY-4.0, PyPA public domain, etc).',
          notes: 'Daily refresh at 05:45 UTC. Premium derivative at /api/premium/ai-safety/packages/security/radar adds risk_score per package, risk_band classification, and notable_movers across the cohort.',
        },
      }, 200, 600);
    }

    // === PAID PREMIUM: AI PACKAGE SECURITY RADAR (Tier 1, 1 credit) ===
    // /api/premium/ai-safety/packages/security/radar?ecosystem=&category=&package=&min_risk_score=
    // Derived risk scoring + breaking-change radar over the daily OSV
    // snapshot. Per-package risk_score (0-100) from a weighted sum of
    // critical/high counts in 30d + 90d windows, open_count clamp, and
    // a 7d freshness bonus. Bands: calm <10, watch 10-25, hot 25-50,
    // critical 50+. Plus notable_movers (top-5 by_critical_30d, by_risk_score,
    // new_in_last_7d) and by_band/by_ecosystem rollups.

    if (path === '/api/premium/ai-safety/packages/security/radar') {
      const payment = await requirePayment(request, env, 1);
      if (!payment.paid) return payment.response!;

      const { getAiPackageSecuritySnapshot } = await import('./ai-package-security-fetcher');
      const snap = await getAiPackageSecuritySnapshot(env);
      if (!snap) {
        return await premiumValidationFailure(
          { error: 'snapshot_not_ready', hint: 'AI-package security snapshot refreshes daily at 05:45 UTC. Retry after the next cron tick.' },
          payment, request, env, 'upstream_failure',
        );
      }

      const { buildRadar, parseEcosystem, parseCategory, parsePackage, parseMinRiskScore } = await import('./premium-ai-package-security');
      const result = buildRadar(snap, {
        ecosystem: parseEcosystem(url.searchParams.get('ecosystem')),
        category: parseCategory(url.searchParams.get('category')),
        min_risk_score: parseMinRiskScore(url.searchParams.get('min_risk_score')),
        package: parsePackage(url.searchParams.get('package')),
      }, new Date());

      ctx.waitUntil(
        logPremiumUsage(env, '/api/premium/ai-safety/packages/security/radar', request.headers.get('User-Agent') || 'unknown', 1, payment.token),
      );
      return await premiumResponse(result, payment, 1, request, env);
    }

    // === AI SAFETY INCIDENTS: AVID (free, cached 600s) ===
    // /api/ai-safety/incidents/avid?limit=&developer=&risk_domain=
    // Raw normalized snapshot of recent AVID (AI Vulnerability Database)
    // reports from avidml/avid-db. Refreshed daily at 03:00 UTC. License:
    // MIT. AIID coverage is queued; their GraphQL is origin-gated to
    // browsers and the 100MB weekly R2 snapshot path is a follow-up.

    if (path === '/api/ai-safety/incidents/avid') {
      const { getAvidSnapshot } = await import('./avid-fetcher');
      const snap = await getAvidSnapshot(env);
      if (!snap) {
        return jsonResponse({
          ok: false,
          error: 'snapshot_not_ready',
          hint: 'AVID snapshot refreshes daily at 03:00 UTC. After deploy + first cron tick, this endpoint populates within 24 hours.',
        }, 503, 0);
      }
      const limitParam = parseInt(url.searchParams.get('limit') ?? '', 10);
      const limit = Number.isFinite(limitParam) && limitParam > 0 ? Math.min(limitParam, 50) : 25;
      const developer = url.searchParams.get('developer')?.toLowerCase().trim() || null;
      const riskDomain = url.searchParams.get('risk_domain')?.toLowerCase().trim() || null;

      let entries = snap.entries;
      if (developer) {
        entries = entries.filter((e) => e.developers.some((d) => d.toLowerCase().includes(developer)));
      }
      if (riskDomain) {
        entries = entries.filter((e) => e.risk_domains.some((r) => r.toLowerCase().includes(riskDomain)));
      }
      entries = entries.slice(0, limit);

      return jsonResponse({
        ok: true,
        source: snap.source,
        source_license: snap.source_license,
        capturedAt: snap.capturedAt,
        total_in_snapshot: snap.entries_count,
        returned_count: entries.length,
        entries,
        attribution: {
          source: 'AVID (AI Vulnerability Database) - github.com/avidml/avid-db',
          license: 'MIT. Redistribution permitted with attribution.',
          notes: 'TensorFeed mirrors the ~50 most-recent reports. Derived per-vendor and per-risk-domain exposure on /api/premium/ai-safety/incidents/exposure.',
        },
      }, 200, 600);
    }

    // === PAID PREMIUM: AI SAFETY INCIDENTS EXPOSURE (Tier 1, 1 credit) ===
    // /api/premium/ai-safety/incidents/exposure?vendor=&risk_domain=&within_days=
    // Derived exposure rollups over the AVID snapshot: per-developer +
    // per-deployer incident counts with recency-weighted exposure_score
    // (1.0 last 30d, 0.5 days 31-90, 0.25 older), risk_domain + sep_view
    // distributions, top affected artifacts (model names). Optional
    // vendor + risk_domain substring filters and within_days window
    // (clamp [7, 730]).

    if (path === '/api/premium/ai-safety/incidents/exposure') {
      const payment = await requirePayment(request, env, 1);
      if (!payment.paid) return payment.response!;

      const { getAvidSnapshot } = await import('./avid-fetcher');
      const snap = await getAvidSnapshot(env);
      if (!snap) {
        return await premiumValidationFailure(
          {
            error: 'snapshot_not_ready',
            hint: 'AVID snapshot refreshes daily at 03:00 UTC. Retry after the next cron tick.',
          },
          payment, request, env, 'upstream_failure',
        );
      }

      const { buildExposure, parseVendor, parseRiskDomain, parseWithinDays } = await import('./premium-ai-incidents-exposure');
      const result = buildExposure(snap, {
        vendor: parseVendor(url.searchParams.get('vendor')),
        risk_domain: parseRiskDomain(url.searchParams.get('risk_domain')),
        within_days: parseWithinDays(url.searchParams.get('within_days')),
      }, new Date());

      ctx.waitUntil(
        logPremiumUsage(env, '/api/premium/ai-safety/incidents/exposure', request.headers.get('User-Agent') || 'unknown', 1, payment.token),
      );
      return await premiumResponse(result, payment, 1, request, env);
    }

    // === PAID PREMIUM: INFERENCE-PROVIDER ARBITRAGE (Tier 1, 1 credit) ===
    // /api/premium/inference-providers/arbitrage?family=&min_savings_pct=
    // Derived-metrics arbitrage view over the curated inference-providers
    // matrix. Per-model: cheapest_paid, most_expensive_paid, spread_usd,
    // savings_pct, median_paid_blended, fastest_tps, cheapest_with_tps,
    // free_tier_offers (rate-limited prototyping providers like GitHub
    // Models). Plus provider_rollup with value_score and top_arbitrage
    // models sorted by savings_pct desc. Free /api/inference-providers
    // returns the raw matrix; this is the agent-decision-ready derivative.

    if (path === '/api/premium/inference-providers/arbitrage') {
      const payment = await requirePayment(request, env, 1);
      if (!payment.paid) return payment.response!;

      const { buildArbitrage, parseFamily, parseMinSavingsPct } = await import('./premium-inference-arbitrage');
      const { INFERENCE_LAST_UPDATED } = await import('./inference-providers');
      const result = buildArbitrage(
        {
          family: parseFamily(url.searchParams.get('family')),
          min_savings_pct: parseMinSavingsPct(url.searchParams.get('min_savings_pct')),
        },
        new Date(),
        undefined,
        INFERENCE_LAST_UPDATED,
      );

      ctx.waitUntil(
        logPremiumUsage(env, '/api/premium/inference-providers/arbitrage', request.headers.get('User-Agent') || 'unknown', 1, payment.token),
      );
      return await premiumResponse(result, payment, 1, request, env);
    }

    // === PAID PREMIUM: MODEL DEPRECATION TIMELINE (Tier 1, 1 credit) ===
    // /api/premium/model-deprecations/timeline?within_days=&provider=
    // Derived-metrics timeline over the hand-curated model deprecation
    // registry. Window centered on now (past N days + future N days) by
    // default returns the full registry. Each entry enriched with
    // urgency_band classification, days_until_sunset / days_since_sunset,
    // and a resolved migration_chain showing the recommended hop sequence
    // to a still-active model. Summary breakdowns by_provider and
    // by_urgency_band. Free /api/model-deprecations returns the raw
    // registry; this endpoint is the agent-decision-ready derivative.

    if (path === '/api/premium/model-deprecations/timeline') {
      const payment = await requirePayment(request, env, 1);
      if (!payment.paid) return payment.response!;

      const { buildTimeline, parseWithinDays, parseProvider } = await import('./premium-model-deprecations');
      const result = buildTimeline(
        {
          within_days: parseWithinDays(url.searchParams.get('within_days')),
          provider: parseProvider(url.searchParams.get('provider')),
        },
        new Date(),
      );

      ctx.waitUntil(
        logPremiumUsage(env, '/api/premium/model-deprecations/timeline', request.headers.get('User-Agent') || 'unknown', 1, payment.token),
      );
      return await premiumResponse(result, payment, 1, request, env);
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
      // Strict-premium tier 3 ($0.06): rolling npm/PyPI momentum metrics
      // over the trending snapshot, computed server-side.
      const payment = await requirePayment(request, env, 3);
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
        logPremiumUsage(env, '/api/premium/packages/pypi/momentum', request.headers.get('User-Agent') || 'unknown', 3, payment.token),
      );
      return await premiumResponse(result, payment, 3, request, env);
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
        return await premiumValidationFailure(
          result as unknown as Record<string, unknown>,
          payment,
          request,
          env,
        );
      }
      ctx.waitUntil(
        logPremiumUsage(env, '/api/premium/whats-new', request.headers.get('User-Agent') || 'unknown', 1, payment.token),
      );
      return await premiumResponse(result, payment, 1, request, env);
    }

    // === PAID PREMIUM: RECENT WINDOW (Tier 1, 1 credit) ===
    // /api/premium/recent?minutes=N (5-1440, default 60). Sub-daily variant of
    // /whats-new for agents that boot frequently and want a "what happened in
    // the last hour" delta. Pricing diff is omitted because history snapshots
    // are daily-resolution; news + status incidents filter to the window as
    // normal. Composer is shared with /whats-new; this endpoint just parses
    // minutes instead of days. Useful as an agent re-orientation call after
    // long idle periods or between scheduled jobs.

    if (path === '/api/premium/recent') {
      const payment = await requirePayment(request, env, 1);
      if (!payment.paid) return payment.response!;

      const minutesRaw = parseInt(url.searchParams.get('minutes') ?? '', 10);
      const minutes = Number.isFinite(minutesRaw) ? minutesRaw : 60;
      if (minutes < 5 || minutes > 1440) {
        return await premiumValidationFailure(
          {
            ok: false,
            error: 'invalid_minutes',
            hint: 'minutes must be between 5 and 1440 (24 hours). For windows >1 day, use /api/premium/whats-new?days=N.',
          },
          payment,
          request,
          env,
        );
      }
      const newsLimitParam = parseInt(url.searchParams.get('news_limit') ?? '', 10);
      const result = await computeWhatsNew(env, {
        minutes,
        ...(Number.isFinite(newsLimitParam) ? { newsLimit: newsLimitParam } : {}),
      });
      if (!result.ok) {
        return await premiumValidationFailure(
          result as unknown as Record<string, unknown>,
          payment,
          request,
          env,
        );
      }
      ctx.waitUntil(
        logPremiumUsage(env, '/api/premium/recent', request.headers.get('User-Agent') || 'unknown', 1, payment.token),
      );
      return await premiumResponse(result, payment, 1, request, env);
    }

    // === PAID PREMIUM: GHSA AI FIREHOSE (Tier 1, 1 credit) ===
    // /api/premium/security/ghsa/ai-feed — broader companion to the
    // free /api/security/ai-supply-chain-iocs.json. Covers all GHSA
    // types (reviewed, unreviewed, malware) across all ecosystems
    // (npm, pip, RubyGems, Maven, Go, Composer, NuGet, Rust, etc.),
    // filtered to the same AI keyword list. Adds derived severity_band,
    // age_days, ai_relevance.confidence, by_severity / by_ecosystem /
    // by_type aggregates. See worker/src/ghsa-ai-feed.ts. Refresh runs
    // alongside the IOC feed on the existing 6-hourly cron.

    if (path === '/api/premium/security/ghsa/ai-feed') {
      const payment = await requirePayment(request, env, 1);
      if (!payment.paid) return payment.response!;

      const snapshot = await getGhsaAiFeed(env);
      if (!snapshot) {
        return jsonResponse(
          {
            ok: false,
            error: 'no_snapshot_yet',
            hint: 'The GHSA AI feed has not yet been refreshed. Cron runs every 6 hours; retry shortly. Absence of snapshot is not the same as no advisories.',
          },
          503,
          60,
        );
      }
      ctx.waitUntil(
        logPremiumUsage(env, '/api/premium/security/ghsa/ai-feed', request.headers.get('User-Agent') || 'unknown', 1, payment.token),
      );
      return await premiumResponse({ ok: true, ...snapshot }, payment, 1, request, env);
    }

    // === PAID PREMIUM: OPENALEX AI AUTHORS (Tier 1, 1 credit) ===
    // /api/premium/research/authors — top 100 AI authors by AI publication
    // volume in the trailing 365 days, enriched with h_index, cited_by_count,
    // primary affiliation, ORCID, and derived ai_share_pct (AI works as a
    // share of total works). Companion to /api/premium/research/velocity
    // (institution-level) and /api/premium/research/lab-productivity
    // (Qwen-extracted arXiv affiliations). Daily refresh.

    if (path === '/api/premium/research/authors') {
      const payment = await requirePayment(request, env, 1);
      if (!payment.paid) return payment.response!;

      const snapshot = await getOpenAlexAIAuthors(env);
      if (!snapshot) {
        return jsonResponse(
          {
            ok: false,
            error: 'no_snapshot_yet',
            hint: 'OpenAlex authors snapshot has not yet been refreshed. Cron runs daily; retry shortly.',
          },
          503,
          60,
        );
      }
      ctx.waitUntil(
        logPremiumUsage(env, '/api/premium/research/authors', request.headers.get('User-Agent') || 'unknown', 1, payment.token),
      );
      return await premiumResponse({ ok: true, ...snapshot }, payment, 1, request, env);
    }

    // === PAID PREMIUM: OPENALEX AI CITATION VELOCITY (Tier 1, 1 credit) ===
    // /api/premium/research/citation-velocity — top 100 recent AI papers ranked
    // by the share of their total citations that arrived in the most recent
    // calendar year. Filters to papers published in the last 2 years so the
    // ranking reflects current attention not historical staples. Includes
    // title, venue, DOI, first 3 authors, primary affiliation. Daily refresh.

    if (path === '/api/premium/research/citation-velocity') {
      const payment = await requirePayment(request, env, 1);
      if (!payment.paid) return payment.response!;

      const snapshot = await getOpenAlexAICitationVelocity(env);
      if (!snapshot) {
        return jsonResponse(
          {
            ok: false,
            error: 'no_snapshot_yet',
            hint: 'OpenAlex citation-velocity snapshot has not yet been refreshed. Cron runs daily; retry shortly.',
          },
          503,
          60,
        );
      }
      ctx.waitUntil(
        logPremiumUsage(env, '/api/premium/research/citation-velocity', request.headers.get('User-Agent') || 'unknown', 1, payment.token),
      );
      return await premiumResponse({ ok: true, ...snapshot }, payment, 1, request, env);
    }

    // === PAID PREMIUM: APIs.GURU AI WATCH (Tier 1, 1 credit) ===
    // /api/premium/apis-guru/ai-feed — AI-relevant entries from the
    // APIs.guru public API directory (2400+ entries, CC-BY-SA 4.0).
    // Filtered with the shared AI keyword list + API-specific extensions
    // (model provider domains, service categories, generic tokens). Each
    // entry includes first_seen_at against our snapshot history so agents
    // can answer "what new AI APIs appeared in the last 7 days," a diff
    // APIs.guru's static list doesn't expose. Daily refresh.

    if (path === '/api/premium/apis-guru/ai-feed') {
      const payment = await requirePayment(request, env, 1);
      if (!payment.paid) return payment.response!;

      const snapshot = await getApisGuruAIWatch(env);
      if (!snapshot) {
        return jsonResponse(
          {
            ok: false,
            error: 'no_snapshot_yet',
            hint: 'APIs.guru AI watch has not yet been refreshed. Cron runs daily; retry shortly.',
          },
          503,
          60,
        );
      }
      ctx.waitUntil(
        logPremiumUsage(env, '/api/premium/apis-guru/ai-feed', request.headers.get('User-Agent') || 'unknown', 1, payment.token),
      );
      return await premiumResponse({ ok: true, ...snapshot }, payment, 1, request, env);
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

    // === PAID PREMIUM: PROVIDER DEEP-DIVE (Tier 3, 3 credits = $0.06) ===
    // /api/premium/providers/{name} returns one paid response that
    // joins live status, all models with pricing + tier, all benchmark
    // scores, recent news, and agent traffic. Aggregation IS the value;
    // agents pay one call here instead of stitching 4-5 free endpoints.
    // Strict-premium tier 3: no per-IP trial, see strict-premium-endpoints.ts.

    const providerMatch = path.match(/^\/api\/premium\/providers\/([a-zA-Z0-9_\- ]+)$/);
    if (providerMatch) {
      const payment = await requirePayment(request, env, 3);
      if (!payment.paid) return payment.response!;
      const providerKey = decodeURIComponent(providerMatch[1]);
      const result = await computeProviderDeepDive(env, providerKey);
      if (!result.ok) {
        return jsonResponse(result, 404);
      }
      ctx.waitUntil(
        logPremiumUsage(env, '/api/premium/providers', request.headers.get('User-Agent') || 'unknown', 3, payment.token),
      );
      return await premiumResponse(result, payment, 3, request, env);
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
    // (The /api/admin/* per-IP rate-limit + 401 pre-check was hoisted
    // above the first admin handler so every admin route inherits it,
    // including the early ones. See the block immediately before the
    // /api/admin/agents/claim/pending handler.)

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

    // === ADMIN: wantlist moderation (auth-gated, inherits the
    // admin pre-check rate limit + 401-on-bad-key behavior) ===
    // GET /api/admin/wantlist/recent  full items including IPs +
    //   contact_optional, in case there's something to follow up on
    //   beyond what the per-submission email surfaced.
    // DELETE /api/admin/wantlist/{id}  remove a specific submission
    //   (spam, off-thesis, accidental duplicate, etc).
    if (path === '/api/admin/wantlist/recent' && isAuthorizedAdmin(env, url.searchParams.get('key'))) {
      const limitParam = url.searchParams.get('limit');
      const limit = limitParam ? parseInt(limitParam, 10) : 100;
      const snap = await listWantlistForAdmin(env, Number.isFinite(limit) ? limit : 100);
      return jsonResponse({ ok: true, ...snap }, 200, 0);
    }
    const adminWantlistDelete = path.match(/^\/api\/admin\/wantlist\/([^/]+)$/);
    if (adminWantlistDelete && request.method === 'DELETE' && isAuthorizedAdmin(env, url.searchParams.get('key'))) {
      const id = adminWantlistDelete[1]!;
      const result = await deleteWantlistItem(env, id);
      const status = result.ok ? 200 : (result.error === 'not_found' ? 404 : 400);
      return jsonResponse(result, status, 0);
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
      if (task === 'epoch') {
        const result = await captureEpochSnapshot(env);
        return jsonResponse({ message: 'Epoch AI training-compute snapshot captured', ...result });
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
      if (task === 'openalex-authors') {
        const result = await refreshOpenAlexAIAuthors(env);
        return jsonResponse({ message: 'OpenAlex AI authors refreshed', ...result });
      }
      if (task === 'openalex-citation-velocity') {
        const result = await refreshOpenAlexAICitationVelocity(env);
        return jsonResponse({ message: 'OpenAlex AI citation-velocity refreshed', ...result });
      }
      if (task === 'apis-guru-ai') {
        try {
          const snap = await refreshApisGuruAIWatch(env);
          return jsonResponse({
            message: 'APIs.guru AI watch refreshed',
            total: snap.total,
            newly_added_last_7d: snap.newly_added_last_7d.length,
            generated_at: snap.generated_at,
          });
        } catch (err) {
          const msg = err instanceof Error ? err.message : String(err);
          console.error('refreshApisGuruAIWatch threw:', msg);
          return jsonResponse(
            { ok: false, error: 'refresh_failed', message: msg },
            500,
            0,
          );
        }
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
      if (task === 'ghsa-ai-feed') {
        try {
          const snap = await refreshGhsaAiFeed(env);
          return jsonResponse({
            message: 'GHSA AI firehose refreshed',
            total: snap.total,
            by_severity: snap.by_severity,
            by_type: snap.by_type,
            generated_at: snap.generated_at,
          });
        } catch (err) {
          const msg = err instanceof Error ? err.message : String(err);
          const stack = err instanceof Error ? (err.stack ?? '') : '';
          console.error('refreshGhsaAiFeed threw:', msg, stack);
          return jsonResponse(
            { ok: false, error: 'refresh_failed', message: msg, stack: stack.split('\n').slice(0, 6) },
            500,
            0,
          );
        }
      }
      if (task === 'agent-reputation') {
        try {
          const now = new Date();
          const result = await rebuildAllReputationCards(env, {
            today: now.toISOString().slice(0, 10),
            generated_at: now.toISOString(),
            version: 'v0.1',
          });
          return jsonResponse({
            message: 'Agent reputation cards rebuilt',
            ...result,
          });
        } catch (err) {
          const msg = err instanceof Error ? err.message : String(err);
          const stack = err instanceof Error ? (err.stack ?? '') : '';
          console.error('rebuildAllReputationCards threw:', msg, stack);
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

    } catch (err) {
      // Deferred-debit already guarantees no credit was charged on a
      // throw (commitPayment never ran). Re-derive the bearer token from
      // the Authorization header so NO handler needs to expose its
      // payment object. For a premium path, record the AFTA 5xx
      // no-charge event + signed receipt (HTTP 500) via the audited
      // helper. Always return parseable JSON, never a Cloudflare HTML
      // error page. This path NEVER debits (commitPayment with a
      // non-null reason logs only).
      try {
        console.error(
          'worker_unhandled_error',
          path,
          err instanceof Error ? err.stack || err.message : String(err),
        );
      } catch {}
      const authH = request.headers.get('Authorization');
      const tok =
        authH && authH.startsWith('Bearer ') ? authH.slice(7).trim() : '';
      if (path.startsWith('/api/premium/') && tok.startsWith('tf_live_')) {
        try {
          const recovered = {
            paid: true,
            token: tok,
            cost: 0,
          } as import('./payments').PaymentResult;
          return await premiumValidationFailure(
            {
              ok: false,
              error: 'internal_error',
              message:
                'The request failed inside the handler. No credit was charged for this call.',
            },
            recovered,
            request,
            env,
            '5xx',
            500,
          );
        } catch (e2) {
          try {
            console.error(
              'worker_5xx_nocharge_failed',
              path,
              e2 instanceof Error ? e2.message : String(e2),
            );
          } catch {}
        }
      }
      return jsonResponse(
        {
          ok: false,
          error: 'internal_error',
          message:
            'The request failed unexpectedly. If this was a premium call, no credit was charged.',
        },
        500,
      );
    }
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
    } else if (cron === '0 15 * * *') {
      // Daily 15:00 UTC (08:00 America/Los_Angeles during PDT, 07:00
      // during PST: the accepted seasonal drift). Email evan@tensorfeed.ai
      // a digest of agent-work gig listings posted to the public jobs
      // board in the last 24 hours. No email on a zero-activity day; the
      // cron-status log is the heartbeat. Read-only over jobs:gig:* KV
      // plus one Resend send, mirrors the sendDailySummary discipline.
      await run('sendJobsMorningDigest', () => sendJobsMorningDigest(env));
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
      // Same 14:00 UTC slot: Epoch AI training-compute catalog (same
      // class of daily external model-data snapshot). Co-located here
      // deliberately to reuse this already-registered cron trigger and
      // avoid a duplicate wrangler.toml trigger. Makes the "daily
      // snapshot" claim in /api/meta + llms.txt true.
      await run('captureEpochSnapshot', () => captureEpochSnapshot(env));
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
    } else if (cron === '50 4 * * *') {
      // Daily 04:50 UTC: rebuild the agent reputation bureau cards from
      // pay:credits / pay:tx / pay:usage / pay:no-charge telemetry.
      // Writes per-agent cards (wallet + token-prefix indexes), five
      // leaderboards, a daily rollup, and updates the dates index + meta.
      // Spec asked for 04:30 but that slot is held by the CVE list cron;
      // 04:50 keeps the bureau in the same early-UTC quiet zone, 5 min
      // after the HF leaderboard cron finishes.
      await run('rebuildAgentReputation', async () => {
        const now = new Date();
        return rebuildAllReputationCards(env, {
          today: now.toISOString().slice(0, 10),
          generated_at: now.toISOString(),
          version: 'v0.1',
        });
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
    } else if (cron === '15 */2 * * *') {
      // Every 2h at :15 UTC: Haiku-triage open + recent-resolved status
      // incidents. Per-incident cache means most calls hit cache. Powers
      // free /api/status/incidents/triage + premium variant.
      const { refreshIncidentTriage } = await import('./incident-triage-generator');
      await run('refreshIncidentTriage', () => refreshIncidentTriage(env));
    } else if (cron === '0 8 * * *') {
      // Daily 08:00 UTC: generate Haiku-derived news action cards over the
      // day's top ~50 articles. Per-article cache means re-runs don't burn
      // tokens. Powers free /api/news/action-cards + premium
      // /api/premium/news/action-cards.
      const { refreshActionCards } = await import('./action-cards-generator');
      await run('refreshActionCards', () => refreshActionCards(env));
    } else if (cron === '25 5 * * *') {
      // Daily 05:25 UTC: snapshot TerminalFeed's coding-harness leaderboard
      // to KV for weekly-delta computation. Federation cross-call.
      const { refreshHarnessSnapshot } = await import('./terminalfeed-harnesses-fetcher');
      await run('refreshHarnessSnapshot', () => refreshHarnessSnapshot(env));
    } else if (cron === '35 */6 * * *') {
      // Every 6h at :35 UTC: refresh the AI-package release-velocity snapshot.
      // Polls PyPI + npm JSON for every curated AI package, captures latest
      // version + last 10 release timestamps. Powers free /api/packages/releases
      // and premium /api/premium/packages/releases/velocity.
      const { refreshPackageReleasesSnapshot } = await import('./ai-package-releases-fetcher');
      await run('refreshPackageReleasesSnapshot', () => refreshPackageReleasesSnapshot(env));
    } else if (cron === '45 5 * * *') {
      // Daily 05:45 UTC: refresh the AI-package security snapshot from OSV.
      // Queries each package in CURATED_PYPI_PACKAGES + CURATED_PACKAGES (npm)
      // and writes ai-pkg-sec:current. Powers free
      // /api/ai-safety/packages/security and premium
      // /api/premium/ai-safety/packages/security/radar.
      const { refreshAiPackageSecuritySnapshot } = await import('./ai-package-security-fetcher');
      await run('refreshAiPackageSecuritySnapshot', () => refreshAiPackageSecuritySnapshot(env));
    } else if (cron === '0 3 * * *') {
      // Daily 03:00 UTC: refresh the AVID snapshot from avidml/avid-db.
      // Pulls the 50 most-recent reports from the current-year directory,
      // normalizes, writes avid:current + avid:daily:{date} + bump
      // avid:index. Powers free /api/ai-safety/incidents/avid and premium
      // /api/premium/ai-safety/incidents/exposure.
      const { refreshAvidSnapshot } = await import('./avid-fetcher');
      await run('refreshAvidSnapshot', () => refreshAvidSnapshot(env));
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
      // Companion authors + citation-velocity refreshes on the same daily
      // tick. Authors leaderboard ranks top 100 AI authors by AI publication
      // volume (same 365d window); citation-velocity ranks top 100 recent
      // AI papers by share of citations gained in the latest year. Both run
      // here so a single Worker invocation covers the full OpenAlex surface.
      // OpenAlex polite-pool quota easily absorbs three calls per day.
      await run('refreshOpenAlexAIAuthors', () => refreshOpenAlexAIAuthors(env));
      await run('refreshOpenAlexAICitationVelocity', () => refreshOpenAlexAICitationVelocity(env));
      // APIs.guru AI watch: filter the 2400-entry directory to AI-relevant
      // APIs, preserve first_seen_at from the prior snapshot. Single fetch,
      // single KV write. Runs on the same daily tick to consolidate
      // discovery-surface refreshes in one Worker invocation.
      await run('refreshApisGuruAIWatch', () => refreshApisGuruAIWatch(env));
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
      // Every 6h at :15 UTC: refresh both GHSA-backed AI security feeds.
      //  1. The narrow malware-only IOC feed at /api/security/ai-supply-chain-iocs.json
      //     (worker/src/ai-supply-chain-iocs.ts). Defensive signal, free.
      //  2. The broader GHSA AI firehose at /api/premium/security/ghsa/ai-feed
      //     (worker/src/ghsa-ai-feed.ts). All advisory types, all ecosystems,
      //     same AI keyword filter, premium endpoint.
      // Both share the GITHUB_TOKEN auth path and the AI_RELEVANCE_KEYWORDS
      // list. Two GHSA fetches per 6h is well within the 5000 req/hr quota.
      // Republish + cite posture for both; no active scanning, no attribution.
      await run('refreshAiSupplyChainIocs', () => refreshAiSupplyChainIocs(env));
      await run('refreshGhsaAiFeed', () => refreshGhsaAiFeed(env));
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
