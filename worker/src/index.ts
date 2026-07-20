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
import { cdpGetSupported, cdpListDiscoveryResources } from './cdp-facilitator';
import { bazaarPilotPaths, pilotCatalogStatus, pilotTemplatePath } from './bazaar-pilots';
import { deriveUsageEvent, recordUsageEvent, buildUsageReport, isInternalTraffic, recordRequestHealth, queryRequestHealth } from './usage-meter';
import { handleSignalRoute } from './signal-routes';
import { resolveDeadlineMs, isDeadlineExempt, raceDeadline, buildDeadlineResponse } from './deadline';
import { cachedFetch } from './edge-cache';
import aiInfraProjects from '../../data/ai-infrastructure-projects.json';
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
  fetchFDAQuery,
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
  attachCompressionStats,
  measureSourceBytes,
  composeVerifiedCve,
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
import { computePolicyTimeline, parseTimelineParams, previewPolicyTimeline, checkPolicyTimelinePreviewRateLimit } from './premium-policy-timeline';
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
import { getKillSwitchState, setKillSwitch, getKillSwitchAuditLog, safePut } from './kill-switch';
import { refreshVrData, readVrFeed, readVrOriginals } from './vr-aggregator';
import { AFTA_ADOPTERS } from './afta-adopters';
import { computeCostProjection, CostProjectionOptions } from './cost-projection';
import { computeProviderDeepDive } from './provider-deepdive';
import { compareModels } from './compare-models';
import {
  computeWhatsNew,
  previewWhatsNew,
  checkWhatsNewPreviewRateLimit,
  checkWhatsNewProPreviewRateLimit,
  decodeWhatsNewCursor,
  encodeWhatsNewCursor,
  computeWhatsNewDelta,
  buildWhatsNewContinuation,
  WHATS_NEW_NEXT_CHECK_HINT,
} from './whats-new';
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
import { checkStaleness, resolveSLA, describeSLAs, responseFreshnessBlock } from './freshness';
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
import { checkPremiumInput, premiumInputErrorBody, premiumBodyErrorBody } from './premium-input-guard';
import { buildPremiumCatalog } from './premium-catalog';
import { handlePremium } from './premium-handler';
import { buildOfficialSurfaces } from './official-surfaces';
import { maybeHandleHoneypot } from './honeypot';
import { handleIocExport } from './iocs';
import { backupKvToR2, backupNamespaceChunk, getBackupHealth, listRecentBackups, readManifest } from './backup';
import { buildSuggestedNextCalls } from './suggested-next';
import {
  DELTA_CURSOR_VERSION,
  decodeDeltaCursor,
  encodeDeltaCursor,
  gateDeltaCursor,
  buildDeltaContinuation,
} from './delta-cursor';
import { deleteWantlistItem, listWantlist, listWantlistForAdmin, submitWantlistItem, WANTLIST_DEFAULTS } from './wantlist';
import { getAiSupplyChainIocs, refreshAiSupplyChainIocs } from './ai-supply-chain-iocs';
import { getGhsaAiFeed, refreshGhsaAiFeed } from './ghsa-ai-feed';
import { getOpenAlexAIAuthors, refreshOpenAlexAIAuthors } from './openalex-authors';
import { getOpenAlexAICitationVelocity, refreshOpenAlexAICitationVelocity, filterVelocityPapers } from './openalex-citation-velocity';
import { getOpenReviewAcceptances, refreshOpenReviewAcceptances } from './openreview';
import { getAclProceedings, refreshAclProceedings } from './acl-anthology';
import { getResearchBlogs, refreshResearchBlogs } from './research-blogs';
import { enrichVelocityWithS2 } from './semantic-scholar';
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
    'Content-Type, Authorization, X-PAYMENT, PAYMENT-SIGNATURE, X-Payment-Tx, X-Payment-Quote, X-TensorFeed-Simulate-Error, X-TensorFeed-Simulate-Latency, X-Internal-Auth',
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

// Admin-class key extraction. Prefers Authorization: Bearer <key> header
// (which does NOT appear in Cloudflare access logs, browser history, ops
// screenshots, or error reports) over the ?key=<key> query string (which
// does, and was audit H-3 / 2026-05-26). Both forms accepted for
// backward compatibility; the query string is the older shape callers
// may still be using. If both are present, the header wins. Returns
// null when neither is present so downstream checks fail closed.
function extractAdminKey(request: Request, url: URL): string | null {
  const auth = request.headers.get('Authorization');
  if (auth) {
    const m = auth.match(/^Bearer\s+(.+)$/);
    if (m && m[1].length > 0) return m[1].trim();
  }
  // Fallback: ?key= query param (the documented /api/refresh?key= form and
  // the older ingest path). A prior edit made this line recurse into
  // extractAdminKey, which infinite-loops and crashes whenever no
  // Authorization header is present. Read the query param as intended.
  const k = url.searchParams.get('key');
  return k && k.length > 0 ? k : null;
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

// Privilege-separated ingest auth for /api/admin/*/ingest POST surfaces
// (ai-cves and sec-filings-extraction). INGEST_KEY-exclusive: a leaked
// ADMIN_KEY (telemetry, dashboards, refresh scripts) cannot inject papers
// or filings into production KV. The ADMIN_KEY transition fallback was
// removed 2026-05-26 (audit L-6) after INGEST_KEY was confirmed
// provisioned in production. Default-deny if INGEST_KEY is unset.
function isAuthorizedIngest(env: Env, supplied: string | null): boolean {
  if (!env.INGEST_KEY || env.INGEST_KEY.length === 0) return false;
  if (!supplied) return false;
  return constantTimeEqual(supplied, env.INGEST_KEY);
}

// Least-privilege auth for POST /api/admin/recon-email. Authorizes ONLY
// that path (sending plain-text email via Resend). Falls back to nothing
// if unset; the handler also accepts ADMIN_KEY directly.
function isAuthorizedReconEmail(env: Env, supplied: string | null): boolean {
  if (!env.RECON_EMAIL_KEY || env.RECON_EMAIL_KEY.length === 0) return false;
  if (!supplied) return false;
  return constantTimeEqual(supplied, env.RECON_EMAIL_KEY);
}

// Hoisted /api/admin/* pre-check accepts ANY admin-class key so the rate
// limit + 401 boundary is uniform. Per-route narrower checks (e.g.
// isAuthorizedIngest at the ai-cves ingest handler, the recon-email
// auth at its handler) enforce which specific key class is allowed for
// each path.
function isAuthorizedAnyAdmin(env: Env, supplied: string | null): boolean {
  return (
    isAuthorizedAdmin(env, supplied) ||
    isAuthorizedIngest(env, supplied) ||
    isAuthorizedReconEmail(env, supplied)
  );
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

// Epoch-ms write time of a cachedKVGet entry. The entry's logical freshness
// is judged against this header (per-caller cacheTTL), NOT against the
// Cache API max-age, which is set to the hard ceiling below so a stale entry
// stays retrievable for stale-while-revalidate serving.
const KV_CACHE_AT_HEADER = 'X-TF-Cached-At';
// Hard ceiling on how long a stale entry stays servable while background
// refreshes keep failing. Steady-state staleness is bounded by one request
// interval past the logical TTL, not by this.
const KV_CACHE_HARD_TTL_SECONDS = 21_600;
const DEFAULT_KV_READ_TIMEOUT_MS = 10_000;

function resolveKvReadTimeoutMs(raw: string | undefined): number {
  const n = raw === undefined ? NaN : parseInt(raw, 10);
  return Number.isFinite(n) && n > 0 ? n : DEFAULT_KV_READ_TIMEOUT_MS;
}

/**
 * Try Cache API first, then KV, then cache the KV result.
 * Dramatically reduces KV read operations.
 *
 * When `swrCtx` is passed, the read runs in stale-while-revalidate mode:
 * an entry past its logical TTL is served immediately while a background
 * KV refresh (ctx.waitUntil) rewrites it, and the cold-miss inline KV read
 * is bounded by KV_READ_TIMEOUT_MS. Request-health showed the synchronous
 * KV read on the hot paths (/api/status, /api/breaking, /api/news, feeds)
 * carrying a heavy latency tail (6-20s, occasionally hanging into the 20s
 * deadline 504); SWR takes KV off those request paths entirely except on a
 * true cold miss. Without `swrCtx` the behavior is the pre-SWR inline read.
 */
async function cachedKVGet(
  request: Request,
  kvNamespace: KVNamespace,
  key: string,
  cacheTTL: number,
  swrCtx?: ExecutionContext,
  env?: { KV_READ_TIMEOUT_MS?: string }
): Promise<unknown> {
  // Synthetic cache key URL. Pinned to a constant origin + no search
  // params so every caller of cachedKVGet(..., key, ...) hits the same
  // Cache API entry regardless of the inbound request's host or query
  // string. Without this, /api/news?category=X and /api/news?category=Y
  // fragmented the same `articles` KV value into per-querystring entries
  // and the hit rate collapsed to ~10%.
  const cacheUrl = new URL(`https://tensorfeed-kv-cache.internal/__kv_cache/${encodeURIComponent(key)}`);
  const cacheRequest = new Request(cacheUrl.toString());

  // KV read + cache rewrite, shared by the inline and background paths.
  // Entries are written with the hard max-age plus the cached-at header;
  // every reader judges freshness against the header, so the longer
  // retention never extends what callers observe as fresh. A KV value that
  // is affirmatively gone deletes the entry so removals (e.g. a cleared
  // breaking alert) converge instead of being stale-served for hours.
  const readKvAndRecache = async (): Promise<unknown> => {
    const data = await kvNamespace.get(key, 'json');
    try {
      if (data) {
        const resp = new Response(JSON.stringify(data), {
          headers: { 'Content-Type': 'application/json', [KV_CACHE_AT_HEADER]: String(Date.now()) },
        });
        await cachePut(cacheRequest, resp, KV_CACHE_HARD_TTL_SECONDS);
      } else {
        await caches.default.delete(cacheRequest);
      }
    } catch (putErr) {
      console.warn(`Cache API write failed for key "${key}":`, putErr);
    }
    return data;
  };

  // Try Cache API first (free, unlimited)
  try {
    const cached = await cacheGet(cacheRequest);
    if (cached) {
      const atRaw = cached.headers.get(KV_CACHE_AT_HEADER);
      const cachedAt = atRaw === null ? NaN : parseInt(atRaw, 10);
      // Entries without the header predate it and are bounded by their own
      // short max-age, so they count as fresh.
      const ageMs = Number.isFinite(cachedAt) ? Date.now() - cachedAt : 0;
      if (ageMs <= cacheTTL * 1000) {
        return cached.json();
      }
      if (swrCtx) {
        // Stale-while-revalidate: serve the stale copy now, refresh KV off
        // the request path.
        swrCtx.waitUntil(readKvAndRecache().catch(() => undefined));
        return cached.json();
      }
      // Stale without a ctx: fall through to the inline KV read below.
    }
  } catch (cacheErr) {
    console.warn(`Cache API read failed for key "${key}":`, cacheErr);
  }

  // Cache miss (or stale entry without SWR): read from KV inline.
  if (swrCtx) {
    // Bound the inline read so a hung KV operation cannot ride the request
    // into the deadline 504. The read itself continues via waitUntil, so a
    // late result still warms the cache for the next request.
    const timeoutMs = resolveKvReadTimeoutMs(env?.KV_READ_TIMEOUT_MS);
    const read = readKvAndRecache();
    swrCtx.waitUntil(read.catch(() => undefined));
    const TIMED_OUT = Symbol('kv-read-timeout');
    const winner = await Promise.race([
      read.catch((kvErr) => {
        console.error(`KV read failed for key "${key}":`, kvErr);
        return undefined;
      }),
      new Promise<typeof TIMED_OUT>((resolve) => setTimeout(() => resolve(TIMED_OUT), timeoutMs)),
    ]);
    if (winner === TIMED_OUT) {
      console.warn(`KV read for key "${key}" exceeded ${timeoutMs}ms; serving empty (cache warms when the read lands)`);
      return undefined;
    }
    return winner;
  }

  try {
    return await readKvAndRecache();
  } catch (kvErr) {
    console.error(`KV read failed for key "${key}":`, kvErr);
    return undefined;
  }
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
  forcedNoChargeReason: NoChargeReason = null,
  dataCapturedAt: string | null = null,
): Promise<Response> {
  const url = new URL(request.url);
  const endpoint = url.pathname;

  // Extract the DATA-CAPTURE time the AFTA staleness no-charge bills against.
  // This MUST be when the underlying data was captured, NEVER build time.
  // Precedence (audit HIGH 2/3, 2026-05-28): an explicit dataCapturedAt arg
  // wins; then the real-data side fields the federation and snapshot endpoints
  // emit (snapshot_captured_at, current_captured_at) are preferred OVER a
  // top-level capturedAt, because several handlers historically set capturedAt
  // to new Date() (build time) while stashing the true age in the side field,
  // which silently defeated every stale no-charge. Only those side fields and
  // the explicit arg take priority; otherwise fall back to capturedAt,
  // captured_at, snapshot.capturedAt. If you add a derived premium endpoint,
  // set capturedAt to the upstream data time or pass dataCapturedAt; do not
  // pass new Date().
  const r = result as Record<string, unknown>;
  const candidateCapturedAt =
    (typeof dataCapturedAt === 'string' && dataCapturedAt) ||
    (typeof r.snapshot_captured_at === 'string' && r.snapshot_captured_at) ||
    (typeof r.current_captured_at === 'string' && r.current_captured_at) ||
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
  // Handler-driven no-charge. Used when staleness is not wall-clock
  // (e.g. the guidance-delta endpoint's input-keyed supersession: the
  // served delta is behind a newer same-form filing). Takes precedence
  // over the SLA check; the handler has already decided this call is free.
  if (forcedNoChargeReason !== null) {
    noChargeReason = forcedNoChargeReason;
  }

  // Commit the deferred debit. Returns the actual creditsCharged and
  // the post-commit balance. On a no-charge path, creditsCharged is 0
  // and the event is logged for /api/payment/no-charge-stats.
  const commit = await commitPayment(env, payment, endpoint, noChargeReason);

  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    'Access-Control-Allow-Origin': '*',
    'Cache-Control': 'no-store',
    // Belt-and-suspenders cache partitioning (audit M-fix 2026-05-26):
    // Cache-Control: no-store should already prevent any caching, but Vary
    // makes the per-token contract explicit for proxies/CDNs that ignore
    // no-store, and for any downstream agent client cache. /api/premium/*
    // response bodies are token-scoped (X-Payment-Token-Balance, AFTA
    // receipt-bound to the bearer, optional new-token mint), so the cache
    // key MUST partition on Authorization and X-Payment-Token at minimum.
    Vary: 'Authorization, X-Payment-Token, X-Payment, PAYMENT-SIGNATURE',
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
  // Top-level freshness block on every premium 200 (charged or no-charge):
  // surfaces as_of / data_age_seconds / max_age_seconds / fresh / sla_applies
  // so an agent reads the data age and SLA without parsing the signed receipt.
  // Rides on no-charge responses too (including the retention-loop unchanged
  // poll), so a poller still sees the current as_of. The legacy stale_* markers
  // above are left in place for back-compat. Guard: never clobber a handler
  // that publishes its OWN top-level freshness contract. guidance-delta returns
  // an input-keyed `freshness` (supersession semantics, no wall-clock SLA), and
  // overwriting it with the generic block would strip the explanation the buyer
  // paid for and diverge the paid response from its Bazaar manifest and free
  // preview. Only attach the standard block when the handler supplied none.
  if (bodyResult.freshness === undefined) {
    bodyResult.freshness = responseFreshnessBlock(staleness);
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

  const finalResponse = new Response(JSON.stringify(responseBody), { status: 200, headers });
  // Tag the Response for the Agent Usage Meter when this call actually
  // debited credits, so the central AE hook records outcome 'paid', attributes
  // the AE data point to the payer wallet, and (for pilots) feeds the KV paid
  // rollup. A no-charge premium 200 (stale data, free-trial quota) leaves the
  // tag unset and records as 'served_free'.
  if (commit.creditsCharged > 0) {
    markResponseCharged(finalResponse, { wallet: payment.payerWallet, credits: creditsRequested });
  }
  return finalResponse;
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
    // Belt-and-suspenders cache partitioning (audit M-fix 2026-05-26):
    // Cache-Control: no-store should already prevent any caching, but Vary
    // makes the per-token contract explicit for proxies/CDNs that ignore
    // no-store, and for any downstream agent client cache. /api/premium/*
    // response bodies are token-scoped (X-Payment-Token-Balance, AFTA
    // receipt-bound to the bearer, optional new-token mint), so the cache
    // key MUST partition on Authorization and X-Payment-Token at minimum.
    Vary: 'Authorization, X-Payment-Token, X-Payment, PAYMENT-SIGNATURE',
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

// Injected into handlePremium (premium-handler.ts) so the wrapper module need
// not import these module-private settle helpers, which would be circular with
// index.ts. logPremiumUsage is imported above; the two settle functions are
// hoisted declarations.
const PREMIUM_DEPS = { premiumResponse, premiumValidationFailure, logPremiumUsage };

// Stable identity hash of a parsed lockfile: SHA-256 of the sorted name@version
// list. Reformatting the same lockfile does not change it; a genuinely
// different stack does. Binds a cve-check delta cursor to its stack so a
// different lockfile can never earn a wrong free poll.
async function lockfileIdentityHash(packages: { name: string; version: string | null }[]): Promise<string> {
  const norm = packages.map((p) => `${p.name}@${p.version ?? ''}`).sort().join('\n');
  const buf = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(norm));
  return Array.from(new Uint8Array(buf)).map((b) => b.toString(16).padStart(2, '0')).join('');
}

const CVE_CHECK_NEXT_CHECK_HINT = {
  suggested_recheck_seconds: 86400,
  reason: 'The AI-stack CVE batch refreshes on a daily to weekly cadence; re-poll daily and pay only when it advances.',
} as const;

const X402_SETTLEMENT_NEXT_CHECK_HINT = {
  suggested_recheck_seconds: 600,
  reason: 'The settlement index refreshes about every 5 minutes; re-poll and pay only when a new settlement lands.',
} as const;

// ─────────────────────────────────────────────────────────────────────

// CreditLedger Durable Object class. Cloudflare instantiates a DO class
// from a named export on the worker entrypoint matching the wrangler.toml
// `class_name`. Phase 2 scaffold: the binding is live so Cloudflare can
// allocate the class, but no production code path inside the default
// fetch handler reaches the DO yet. Phase 3 wires it into the requirePayment
// debit + spend-cap paths to close audit H-1 + H-2. See
// worker/src/credit-ledger.ts + tensorfeed-work/tier2-races/DESIGN.md.
export { CreditLedger } from './credit-ledger';

// PaymentClaim Durable Object class. Same export-on-entrypoint contract as
// CreditLedger: Cloudflare instantiates it from this named export matching the
// wrangler.toml binding's class_name. Serializes the settle+mint claim per
// payment-idempotency key. See worker/src/payment-claim.ts.
export { PaymentClaim } from './payment-claim';

// Agent Usage Meter charge signal. The central AE hook in fetch needs to
// know whether a premium 200 actually settled a payment this invocation so
// it can classify the data point as outcome 'paid' rather than 'served_free'
// (a free-quota or stale-no-charge premium 200 also returns status 200), and
// it needs the on-chain payer wallet plus credit cost so the AE funnel and
// the KV paid rollup both attribute the call to whoever paid. Threading those
// across the _handleRoute boundary would touch every handler; instead the
// paid-response builders tag the Response object here and the hook reads the
// tag off the same object. A WeakMap keyed on the Response is per-request,
// never serializes to the wire, and is garbage collected with the Response,
// so it adds no state to track or clean up.
interface ChargedResponseTag {
  // On-chain payer address surfaced at settle (PaymentResult.payerWallet).
  // Undefined for a bearer-token reuse charge (that wallet paid earlier).
  wallet?: string;
  // Credits this paid call debited. Used to feed the pilot KV rollup so the
  // per-endpoint paid totals match what the named handlers record.
  credits: number;
}

const CHARGED_RESPONSES = new WeakMap<Response, ChargedResponseTag>();

function markResponseCharged(response: Response, tag: ChargedResponseTag): void {
  try {
    CHARGED_RESPONSES.set(response, tag);
  } catch {
    // best-effort: the charge tag must never affect the response path
  }
}

// Returns the stored charge tag for a paid Response, or null when the
// Response was never tagged (free, 402, no-charge premium 200).
function chargedResponseTag(response: Response): ChargedResponseTag | null {
  try {
    return CHARGED_RESPONSES.get(response) ?? null;
  } catch {
    return null;
  }
}

export default {
  async fetch(request: Request, env: Env, ctx: ExecutionContext): Promise<Response> {
    const url = new URL(request.url);
    const t0 = Date.now();
    // Vanity-host normalization. mcp.tensorfeed.ai is bound by wrangler.toml
    // to this worker; treat its root and /mcp paths as /api/mcp so the
    // existing dispatch (line ~1168) handles the request without duplicating
    // the MCP handler. Done at the top of fetch so logging/auth/rate-limit
    // all see the canonical /api/mcp path. Per BlockRun-pattern parity:
    // mcp.<site> vanity URL is the agent-onboarding norm.
    let path = url.pathname;
    if (url.hostname === 'mcp.tensorfeed.ai') {
      if (path === '/' || path === '/mcp' || path === '/mcp/') {
        path = '/api/mcp';
      }
    }

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
    // Capture the injected delay so the request-health telemetry below can
    // subtract it: a caller-requested simulated latency must not be recorded
    // as server slowness.
    const chaosLatencyMs = await applySimulatedLatency(request);

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

    // Pre-payment input guard (2026-07-13 money-path incident). Param-required
    // premium endpoints used to validate their query params only AFTER
    // requirePayment, which on the fresh-mint x402 path has already SETTLED
    // USDC on chain. A bare call therefore paid first and got its 400 second:
    // one agent wallet burned 30 x $0.02 across a 10-endpoint sweep, minting
    // and discarding a bearer token every call and never receiving any data.
    //
    // Running the guard here, ahead of every premium handler, means a request
    // missing its required params never reaches requirePayment, so it is never
    // issued a 402 challenge and no spec-compliant x402 client will settle for
    // it. Pure and zero-I/O, so it costs nothing on the hot path. The
    // per-handler validators stay in place as a backstop.
    // GET only: the guard reads the query string, and a POST endpoint takes its
    // input from the body (see NON_QUERY_INPUT in premium-input-guard.ts).
    if (request.method === 'GET') {
      const inputCheck = checkPremiumInput(path, url.searchParams);
      if (!inputCheck.ok) {
        return jsonResponse(premiumInputErrorBody(path, inputCheck), 400);
      }
    }

    // Pre-payment BODY guard (2026-07-15). The query guard above cannot see a
    // POST endpoint whose required input is the request body. cve-check is the
    // one such premium endpoint: it reads a lockfile from the body. Until now a
    // bodyless or unparseable POST reached requirePayment, which on the
    // fresh-mint x402 path SETTLES 50 credits ($1.00) on chain, and only then
    // did the handler reject the empty body as a no-charge: the credit was held
    // but the USDC was already gone (the known gap the 2026-07-14 query-guard
    // fix left open). Validating the body HERE, ahead of the payment gate,
    // rejects a malformed call with a free 400: no 402 is issued, so no
    // spec-compliant x402 client will settle. request.clone() leaves the
    // handler's own request.text() read intact, and the handler keeps its parse
    // as the backstop. A WELL-FORMED but unpaid POST passes the guard and still
    // hits the 402 gate, so x402 discovery is unchanged. Scoped to the single
    // body-input path so no other POST endpoint is affected.
    if (request.method === 'POST' && path === '/api/premium/cve-check') {
      const { parseLockfile, LOCKFILE_MAX_BYTES } = await import('./lockfile-parse');
      // Reject an oversize body on its declared length without buffering it,
      // mirroring the handler's own defense-in-depth content-length check.
      const declaredLen = Number(request.headers.get('content-length') || '0');
      if (Number.isFinite(declaredLen) && declaredLen > LOCKFILE_MAX_BYTES) {
        return jsonResponse(
          premiumBodyErrorBody(path, 'too_large', `Lockfile exceeds ${LOCKFILE_MAX_BYTES} bytes.`),
          400,
        );
      }
      // Read a CLONE so the handler's own request.text() still sees the body.
      const raw = await request.clone().text().catch(() => '');
      const parsed = parseLockfile(raw);
      if (!parsed.ok) {
        return jsonResponse(premiumBodyErrorBody(path, parsed.error, parsed.hint), 400);
      }
    }

    // Soft per-request deadline. A hung handler (typically an upstream
    // subrequest with no timeout) that never returns is otherwise invisible:
    // the edge serves an opaque 504 and the worker never reaches the telemetry
    // hook below, so recordRequestHealth cannot see it. Racing the dispatch
    // against a generous deadline turns that hang into a fast, worker-returned
    // 504 that DOES flow through the telemetry block (status 504 + elapsed
    // ~deadline), finally making the hanging path visible in
    // /api/admin/request-health. _handleRoute never rejects (its outer catch
    // always returns a Response), so raceDeadline's no-reject contract holds.
    // Admin/refresh paths are exempt because they may legitimately run long.
    const routeWork = this._handleRoute(request, env, ctx, url, path);
    const deadlineMs = resolveDeadlineMs(env.REQUEST_DEADLINE_MS);
    const response = isDeadlineExempt(path)
      ? await routeWork
      : await raceDeadline(routeWork, deadlineMs, () =>
          buildDeadlineResponse(path, deadlineMs, CORS_HEADERS),
        );

    // Agent Usage Meter: one AE data point per premium / tracked-free API response.
    // `charged` is true only when this request settled a payment this invocation,
    // read off the Response tag the paid-response builders set (premiumResponse
    // and the inline routing handler). A premium 200 that ran on the free-trial
    // quota or returned stale-no-charge data is NOT charged, so it correctly
    // records as 'served_free' rather than 'paid'. Pilot paths are metered under
    // their stable BAZAAR_PILOTS template key so per-endpoint aggregation does
    // not fan out across query params or concrete path params; non-pilot premium
    // and tracked-free paths keep their own pathname.
    try {
      const tag = chargedResponseTag(response);
      const charged = tag !== null;
      const meterPath = pilotTemplatePath(path) ?? path;
      const evt = deriveUsageEvent(meterPath, response.status, charged);
      if (evt) {
        evt.ua = request.headers.get('User-Agent') || '';
        evt.country = request.cf?.country as string | undefined;
        // TF's own automated callers (integration tests, smoke scripts,
        // scheduled verification runs, the x402 catalog-settle script) should
        // send `X-TF-Internal: <INTERNAL_TRAFFIC_KEY>` so they are excluded
        // from external-demand funnel metrics. Unset secret = nothing tagged.
        evt.internal = isInternalTraffic(request.headers.get('X-TF-Internal'), env.INTERNAL_TRAFFIC_KEY);
        // Attribute the AE data point to the on-chain payer for EVERY paid
        // premium call, named and pilot. The wallet rides the charge tag the
        // paid-response builders set; it is undefined on a bearer-token reuse
        // charge (that wallet paid on an earlier call), which records as ''.
        if (tag) evt.wallet = tag.wallet;
        recordUsageEvent(env, evt);
      }
      // Request-health telemetry: fires for ALL paths (not just metered ones)
      // when the response is a 5xx or the request was slow. Same best-effort
      // try as the usage meter; never affects the response.
      recordRequestHealth(env, meterPath, response.status, request.headers.get('User-Agent') || '', Date.now() - t0 - chaosLatencyMs);
      // Pilots are intentionally NOT logged to the KV rollup here. Every
      // premium endpoint, pilots included, already calls logPremiumUsage
      // exactly once inside its named handler (the per-provider incident
      // triage logs via a `${provider}` template literal; parametric routes
      // log their bare path). A second call here double-counted all 51 pilots
      // in the rollup (call_count, total_credits_charged, lifetime counters,
      // top_payers). Removed 2026-05-30. The AE datapoint above is the only
      // telemetry this hook owns; do not re-add per-pilot KV logging here.
    } catch {
      // best-effort: telemetry must never affect the response path
    }

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
    // Private Signal console API (/api/signal/*). Session-gated, self-contained,
    // and short-circuited before any other routing or activity tracking.
    if (path.startsWith('/api/signal/')) {
      return await handleSignalRoute(request, env, ctx, url, path);
    }

    // Track agent/bot activity (non-blocking, batched in memory)
    ctx.waitUntil(trackAgentActivity(request, env, path));

    // Agent activity endpoint (reads from memory cache, minimal KV)
    if (path === '/api/agents/activity') {
      const activity = await getAgentActivity(env);
      return jsonResponse(activity, 200, 10);
    }

    // Public traction headline. Reads ONLY the single O(1) lifetime
    // counter (pay:stats:lifetime), never the dated rollups, so it is
    // KV-budget-safe. It leads with the real-money figures (usd_received,
    // paid_settlements) accumulated on the settle path. The served-call
    // figure (premium_responses_served) counts every premium response,
    // including free-trial-served calls and TF's own automated testing, so
    // it is reported as responses served, not as external paid demand. Each
    // such response returns a signed AFTA receipt whenever the receipt key
    // is provisioned; the headline states that only when true so it never
    // overclaims. Edge-cached 60s.
    if (path === '/api/stats') {
      const s = await getLifetimeStats(env);
      const receiptsActive =
        typeof env.RECEIPT_PRIVATE_KEY_JWK === 'string' &&
        env.RECEIPT_PRIVATE_KEY_JWK.length > 0;
      const usdReceived = s.usd_received ?? 0;
      const paidSettlements = s.paid_settlements ?? 0;
      const responsesServed = s.premium_calls;
      const receiptClause = receiptsActive
        ? ', each returning a signed AFTA receipt'
        : '';
      const headline = `$${usdReceived} received across ${paidSettlements} settlements; ${responsesServed} premium responses served${receiptClause}`;
      return jsonResponse(
        {
          ok: true,
          // Backward-compatible keys (this is a public endpoint).
          premium_calls_served: s.premium_calls,
          total_credits_charged: s.total_credits_charged,
          // Real-money signal: gross of TensorFeed's own test purchases.
          usd_received: usdReceived,
          paid_settlements: paidSettlements,
          // Honest alias for the served-call count.
          premium_responses_served: s.premium_calls,
          each_call_returns_signed_afta_receipt: receiptsActive,
          first_at: s.first_at,
          last_at: s.last_at,
          headline,
          note: "usd_received and paid_settlements are the real-money figures: gross USD settled and the number of settlements, gross of TensorFeed's own test purchases. premium_responses_served counts every premium response served, including free-trial-served calls and TensorFeed's own automated testing, so it is not a measure of external paid demand. AFTA receipts are not stored server-side (zero custody); receipt issuance is deterministic in receipt-key presence, surfaced here as each_call_returns_signed_afta_receipt.",
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

    // AI Infrastructure project registry. Static editorial data bundled into the
    // worker (the canonical data/ai-infrastructure-projects.json that the
    // /ai-infrastructure page also imports). The page advertises this endpoint as
    // its free JSON twin, so it must be served here (the worker captures all
    // /api/*; a static public/api file would never reach the client).
    if (path === '/api/ai-infrastructure/projects.json' || path === '/api/ai-infrastructure') {
      return jsonResponse(aiInfraProjects, 200, 60 * 60);
    }

    // Public MCP activity dashboard data. Two signal sources:
    //  - npm downloads (primary; covers the dominant stdio install path)
    //  - Hosted /api/mcp tool-call counters from KV (secondary)
    // Cached at the edge for 5 minutes; npm fetches inside are cached 1 hr.
    // AFTA Certified badge: SVG renderer. Publishers embed
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

    // Consolidated live-surface drift health. Public redacted view (status +
    // counts only, no failing-URL detail). Full detail goes to the alert email.
    // Computed by the daily 41 6 UTC drift-audit cron, served from KV.
    if (path === '/api/health/drift') {
      const { publicView } = await import('./drift-audit');
      const last = (await env.TENSORFEED_CACHE.get('drift:last', 'json')) as import('./drift-audit').DriftReport | null;
      if (!last) {
        return jsonResponse({ ok: false, error: 'not_ready', hint: 'The drift audit precomputes daily; retry after the next run.' }, 503, 0);
      }
      return jsonResponse({ ok: true, ...publicView(last) }, 200, 300);
    }

    // === NEWS ENDPOINTS (cached 60s via Cache API) ===

    if (path === '/api/news' || path === '/api/agents/news' || path === '/api/agents/news.json') {
      const category = url.searchParams.get('category');
      const parsedLimit = parseInt(url.searchParams.get('limit') || '50', 10);
      const limit = Math.min(Number.isNaN(parsedLimit) ? 50 : parsedLimit, 200);

      let articles = await cachedKVGet(request, env.TENSORFEED_NEWS, 'articles', 60, ctx, env) as Article[] | null;
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
      const articles = await cachedKVGet(request, env.TENSORFEED_NEWS, 'articles', 300, ctx, env) as Article[] | null;
      const safe = (articles || []).map(sanitizeArticleForAgents);
      return xmlResponse(articlesToRSS(safe, 'TensorFeed.ai', 'https://tensorfeed.ai/feed.xml'));
    }

    // Category RSS feeds. Served at both /feed/<cat>.xml and /api/feed/<cat>.xml.
    if ((path.startsWith('/feed/') || path.startsWith('/api/feed/')) && path.endsWith('.xml')) {
      const category = path.replace(/^\/(api\/)?feed\//, '').replace('.xml', '');
      const articles = await cachedKVGet(request, env.TENSORFEED_NEWS, 'articles', 300, ctx, env) as Article[] | null;
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
      const articles = await cachedKVGet(request, env.TENSORFEED_NEWS, 'articles', 60, ctx, env) as Article[] | null;
      const safe = (articles || []).map(sanitizeArticleForAgents);
      return jsonResponse(articlesToJsonFeed(safe), 200, 60);
    }

    // === STATUS ENDPOINTS (cached 120s) ===

    if (path === '/api/status' || path === '/api/agents/status' || path === '/api/agents/status.json') {
      const services = await cachedKVGet(request, env.TENSORFEED_STATUS, 'services', 120, ctx, env);
      return jsonResponse({
        ok: true,
        source: 'tensorfeed.ai',
        checked: new Date().toISOString(),
        services: services || [],
      }, 200, 120);
    }

    // === INCIDENTS ENDPOINT (cached 120s) ===

    if (path === '/api/incidents') {
      const incidents = await cachedKVGet(request, env.TENSORFEED_STATUS, 'incidents', 120, ctx, env);
      return jsonResponse({
        ok: true,
        source: 'tensorfeed.ai',
        incidents: incidents || [],
      }, 200, 120);
    }

    if (path === '/api/status/summary') {
      // Project the summary shape from the SAME cached 'services' entry that
      // /api/status serves, so the two endpoints can never disagree during a
      // status flip. They previously read two independent KV keys through two
      // separate 120s cache entries, so one could be fresh while the other was
      // stale for up to a cache TTL. Sharing the 'services' read removes the
      // desync and drops a per-cron KV write.
      type EarlyWarning = { source: string; note: string; detected_at: string | null; probe_signal: string };
      const services = (await cachedKVGet(request, env.TENSORFEED_STATUS, 'services', 120, ctx, env)) as
        | Array<{ name: string; status: string; provider: string; early_warning?: EarlyWarning }>
        | null;
      const summary = (services || []).map((s) => {
        const entry: { name: string; status: string; provider: string; early_warning?: EarlyWarning } = {
          name: s.name,
          status: s.status,
          provider: s.provider,
        };
        if (s.early_warning) entry.early_warning = s.early_warning;
        return entry;
      });
      return jsonResponse({
        ok: true,
        source: 'tensorfeed.ai',
        services: summary,
      }, 200, 120);
    }

    // Breaking-alert banner, public read. Cache-API-first read of the single
    // global alert, filtered to active (well-formed and not expired) or null.
    // Written only by the ADMIN_KEY-gated POST /api/admin/breaking below.
    if (path === '/api/breaking') {
      const { filterActiveAlert, CACHE_TTL_SECONDS } = await import('./breaking');
      const raw = await cachedKVGet(request, env.TENSORFEED_CACHE, 'breaking:current', CACHE_TTL_SECONDS, ctx, env);
      const alert = filterActiveAlert(raw, new Date());
      return jsonResponse({ ok: true, source: 'tensorfeed.ai', alert }, 200, CACHE_TTL_SECONDS);
    }

    // === PRICING ENDPOINT (cached 300s) ===

    if (path === '/api/agents/pricing' || path === '/api/pricing' || path === '/api/agents/pricing.json') {
      const cached = await cachedKVGet(request, env.TENSORFEED_CACHE, 'pricing', 300, ctx, env);
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
      let cached = await cachedKVGet(request, env.TENSORFEED_CACHE, 'models', 300, ctx, env);
      if (!cached) cached = await cachedKVGet(request, env.TENSORFEED_CACHE, 'pricing', 300, ctx, env);
      // Merge the free TFII headline per model from the latest index snapshot.
      // Direct KV read (not cachedKVGet) to avoid sharing a request-scoped cache
      // key with the 'models' read above. The snapshot is small and the whole
      // /api/models response is already edge-cached for 300s.
      const snap = (await env.TENSORFEED_CACHE.get('intelligence:snapshot:latest', 'json')) as
        | import('./model-intelligence').IntelligenceSnapshot
        | null;
      let body = (cached as Record<string, unknown>) || {};
      if (snap && body && Array.isArray((body as { providers?: unknown }).providers)) {
        const { enrichModelsWithIntelligence } = await import('./model-intelligence');
        body = enrichModelsWithIntelligence(body as { providers: Array<{ models: Array<{ name?: string }> }> }, snap) as Record<string, unknown>;
      }
      // Catalog-driven freshness signal (additive), computed from the same body.
      const { datasetFreshness } = await import('./data-freshness');
      const modelsFreshness = datasetFreshness({
        dataset: 'models',
        lastUpdated: (body?.lastUpdated as string | undefined) ?? null,
        coveredModelNames: ((body?.providers ?? []) as { models?: { name?: string }[] }[]).flatMap(p => (p.models ?? []).map(m => m.name ?? '')).filter(Boolean),
        pricing: body as Parameters<typeof datasetFreshness>[0]['pricing'],
        slaDays: 7,
        now: new Date().toISOString(),
      });
      return jsonResponse({
        ok: true,
        source: 'tensorfeed.ai',
        ...body,
        freshness: modelsFreshness,
      }, 200, 300);
    }

    if (path === '/api/intelligence') {
      const snap = (await cachedKVGet(request, env.TENSORFEED_CACHE, 'intelligence:snapshot:latest', 300)) as
        | import('./model-intelligence').IntelligenceSnapshot
        | null;
      if (!snap) {
        return jsonResponse(
          { ok: false, error: 'index_not_yet_populated', hint: 'The daily TFII snapshot runs at 07:00 UTC.' },
          503,
        );
      }
      const models = snap.models
        .filter(m => !m.trust.low_coverage)
        .sort((a, b) => a.rank - b.rank)
        .map(m => ({ model_id: m.model_id, name: m.name, provider: m.provider, tfii: m.tfii, rank: m.rank }));
      return jsonResponse(
        {
          ok: true,
          as_of: snap.as_of,
          methodology_version: snap.methodology_version,
          methodology_url: 'https://tensorfeed.ai/intelligence',
          count: models.length,
          models,
        },
        200,
        300,
      );
    }

    // === BENCHMARKS ENDPOINT (cached 300s) ===

    if (path === '/api/benchmarks') {
      const cached = await cachedKVGet(request, env.TENSORFEED_CACHE, 'benchmarks', 300);
      const benchData = cached as { lastUpdated?: string; models?: { model?: string }[] } | null;
      const pricing = await env.TENSORFEED_CACHE.get('models', 'json') as { providers?: unknown[] } | null;
      const { datasetFreshness } = await import('./data-freshness');
      const benchFreshness = datasetFreshness({
        dataset: 'benchmarks',
        lastUpdated: benchData?.lastUpdated ?? null,
        coveredModelNames: (benchData?.models ?? []).map(m => m.model ?? '').filter(Boolean),
        pricing: pricing as Parameters<typeof datasetFreshness>[0]['pricing'],
        slaDays: 14,
        now: new Date().toISOString(),
      });
      return jsonResponse({
        ok: true,
        source: 'tensorfeed.ai',
        ...(benchData || {}),
        freshness: benchFreshness,
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
      return jsonResponse({ ok: true, source: 'tensorfeed.ai', deprecated: true, deprecation_note: 'Use /api/policy/ai/registry, the richer typed AI policy registry.', lastUpdated: POLICY_LAST_UPDATED, count: items.length, items }, 200, 600);
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
    // Polyglot, and SWE-Lancer. Live scores for the major harnesses come
    // from the TerminalFeed federation snapshot (refreshed daily at 05:25
    // UTC by refreshHarnessSnapshot), overlaid on TF's editorial harness
    // defs and benchmark columns. Harnesses the board does not cover keep
    // TF's static rows; the static HARNESSES_DATA is the fallback when the
    // snapshot is absent.

    if (path === '/api/harnesses') {
      const { HARNESSES_DATA, harnessRollups } = await import('./harnesses');
      const { getHarnessSnapshot } = await import('./terminalfeed-harnesses-fetcher');
      const { buildHarnessesView } = await import('./harnesses-view');
      const snapshot = await getHarnessSnapshot(env);
      const usingFederation = !!(snapshot && Array.isArray(snapshot.benchmarks) && snapshot.benchmarks.length > 0);
      const view = usingFederation ? buildHarnessesView(snapshot!, HARNESSES_DATA) : HARNESSES_DATA;
      const harnPricing = await env.TENSORFEED_CACHE.get('models', 'json') as { providers?: unknown[] } | null;
      const { datasetFreshness } = await import('./data-freshness');
      const harnessFreshness = datasetFreshness({
        dataset: 'harnesses',
        lastUpdated: view.lastUpdated,
        coveredModelNames: view.results.map(r => r.model),
        pricing: harnPricing as Parameters<typeof datasetFreshness>[0]['pricing'],
        slaDays: 14,
        now: new Date().toISOString(),
      });
      return jsonResponse({
        ok: true,
        source: usingFederation ? 'terminalfeed.io' : 'tensorfeed.ai',
        ...view,
        rollups: harnessRollups(view),
        freshness: harnessFreshness,
        attribution: usingFederation
          ? {
              source: 'Live agentic-coding harness scores via the TerminalFeed federation board. Underlying benchmark scores carry their own per-source terms; see each upstream benchmark.',
              upstream_generated_at: snapshot!.upstream_generated_at,
              captured_at: snapshot!.capturedAt,
            }
          : undefined,
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
      if (!isAuthorizedAnyAdmin(env, extractAdminKey(request, url))) {
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

    // Breaking-alert banner control. Narrow ADMIN_KEY-only (the hoisted gate
    // above accepts INGEST_KEY/RECON_EMAIL_KEY; this must not). POST {headline,
    // href, ttl_hours?} sets; POST {clear:true} clears (direct delete, works even
    // during a cost kill switch); GET returns the raw stored alert + is_live + audit.
    // Qualifying bar (operator discipline): raise only for a frontier model GA, a
    // lab IPO milestone, an actively-exploited CVE in the agent stack, or a major
    // provider-policy/operational event. Default to not raising.
    if (path === '/api/admin/breaking' && isAuthorizedAdmin(env, extractAdminKey(request, url))) {
      const breaking = await import('./breaking');
      if (request.method === 'POST') {
        let body: { headline?: unknown; href?: unknown; ttl_hours?: unknown; clear?: unknown } = {};
        try {
          body = (await request.json()) as typeof body;
        } catch {
          return jsonResponse({ ok: false, error: 'invalid_json' }, 400, 0);
        }
        if (body.clear === true) {
          await breaking.clearBreaking(env);
          return jsonResponse({ ok: true, cleared: true }, 200, 0);
        }
        const h = breaking.validateHeadline(body.headline);
        if (!h.ok) return jsonResponse({ ok: false, error: h.error }, 400, 0);
        const href = breaking.validateHref(body.href);
        if (!href.ok) return jsonResponse({ ok: false, error: href.error }, 400, 0);
        let ttl = breaking.TTL_DEFAULT_HOURS;
        if (body.ttl_hours !== undefined) {
          const n = Number(body.ttl_hours);
          if (!Number.isFinite(n) || n < breaking.TTL_MIN_HOURS || n > breaking.TTL_MAX_HOURS) {
            return jsonResponse({ ok: false, error: 'invalid_ttl_hours', limits: { min: breaking.TTL_MIN_HOURS, max: breaking.TTL_MAX_HOURS } }, 400, 0);
          }
          ttl = n;
        }
        const rand = crypto.getRandomValues(new Uint8Array(6)).reduce((s, b) => s + b.toString(16).padStart(2, '0'), '');
        const alert = breaking.buildAlert(h.value, href.value, ttl, new Date(), rand);
        await breaking.setBreaking(env, alert);
        return jsonResponse({ ok: true, alert }, 200, 0);
      }
      // GET: observability
      const raw = await breaking.readRawBreaking(env);
      const isLive = breaking.filterActiveAlert(raw, new Date()) !== null;
      const audit = await breaking.getBreakingAudit(env);
      return jsonResponse({ ok: true, raw, is_live: isLive, audit: audit.slice(-10).reverse() }, 200, 0);
    }

    // One-time / idempotent: seed the lifetime traction counter from the
    // persisted dated rollups so /api/stats launches at the true
    // historical number instead of zero. Inherits the hoisted /api/admin
    // rate-limit + ADMIN_KEY pre-check. Safe to re-run (recomputes from
    // the authoritative rollups and overwrites). Not per-request.
    if (
      path === '/api/admin/stats/backfill' &&
      request.method === 'GET' &&
      isAuthorizedAdmin(env, extractAdminKey(request, url))
    ) {
      const backfilled = await backfillLifetimeFromRollups(env);
      return jsonResponse({ ok: true, backfilled }, 200, 0);
    }

    // One-time read-only backfill of past USDC settlements for the curated
    // x402 publisher wallets. Replays each wallet's inbound USDC transfer
    // history into the per-publisher-day and per-day settlement rollups.
    // Idempotent: every transfer is deduped on its event key before it is
    // applied, so re-running (or overlapping with the forward indexer) never
    // double-counts. This reads on-chain transfer history and writes
    // settlement rollups only; it does NOT touch the payment/settle money
    // path. Inherits the hoisted /api/admin rate-limit + ADMIN_KEY pre-check.
    // days defaults to 30 and is clamped to the 1 to 90 range. Self-contained:
    // it refreshes the publisher registry first (so the curated wallets are in
    // the KV wallet map the backfill reads), then backfills, then recomputes the
    // verified-directory blob so the backfilled settlements surface immediately
    // instead of waiting for the next daily 06:35 precompute. Pass refresh=0 to
    // skip the registry refresh when the daily cron has already run it.
    if (
      path === '/api/admin/x402-backfill' &&
      request.method === 'GET' &&
      isAuthorizedAdmin(env, extractAdminKey(request, url))
    ) {
      const parsed = parseInt(url.searchParams.get('days') ?? '', 10);
      const days = Math.min(90, Math.max(1, parsed || 30));
      const doRefresh = url.searchParams.get('refresh') !== '0';
      let refreshed: unknown = 'skipped';
      if (doRefresh) {
        const { refreshAllPublishers } = await import('./x402-index/publisher-registry');
        refreshed = await refreshAllPublishers(env);
      }
      const { backfillCuratedWallets } = await import('./x402-index/backfill');
      const result = await backfillCuratedWallets(env, days);
      const { writeVerifiedDirectory } = await import('./x402-index/verified-precompute');
      await writeVerifiedDirectory(env);
      return jsonResponse({ ok: true, days, refreshed, ...result }, 200, 0);
    }

    // Admin: on-demand capture of the Federal AI Spending snapshot, so the
    // /funding/federal feed can be populated without waiting for the daily
    // 14:00 UTC cron. Bounded by design (the fetcher is page-capped, has a
    // per-request timeout, and walks a fixed 8-vendor cohort), so it cannot
    // hang. Read-only over public USAspending data; writes only the
    // fedspend:snapshot KV blob. Inherits the hoisted /api/admin rate-limit
    // and ADMIN_KEY pre-check.
    if (
      path === '/api/admin/fedspend-refresh' &&
      request.method === 'GET' &&
      isAuthorizedAdmin(env, extractAdminKey(request, url))
    ) {
      const { captureFederalSpending, FED_SPEND_SNAPSHOT_KEY } = await import('./federal-spending-fetcher');
      const snap = await captureFederalSpending(env);
      await safePut(env, env.TENSORFEED_CACHE, FED_SPEND_SNAPSHOT_KEY, JSON.stringify(snap));
      return jsonResponse(
        { ok: true, captured_at: snap.captured_at, cohort_size: snap.cohort_size, total_usd: snap.total_usd, total_awards: snap.total_awards, vendors: snap.vendors.length },
        200,
        0,
      );
    }

    if (path === '/api/admin/agents/claim/pending' && isAuthorizedAdmin(env, extractAdminKey(request, url))) {
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
      isAuthorizedAdmin(env, extractAdminKey(request, url))
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
    // Admin: probe which (scheme, network) pairs THIS deployment's CDP key
    // is actually entitled to settle. Calls CDP's /supported via the
    // Worker's authHeaders(), which is already scoped to the allowed
    // /platform/v2/x402 path, so it does not broaden the CDP key blast
    // radius. Read-only, returns no secret material. This is the live
    // entitlement check for the second payment rail: the settlement-rails
    // feed's cdp_supported flag is static config drawn from CDP docs, NOT a
    // per-key entitlement, so confirm Solana exact here before wiring it.
    if (
      path === '/api/admin/cdp/supported' &&
      request.method === 'GET' &&
      isAuthorizedAdmin(env, extractAdminKey(request, url))
    ) {
      try {
        const supported = await cdpGetSupported(env);
        const kinds = supported.kinds ?? [];
        const networks = [...new Set(kinds.map((k) => k.network))].sort();
        const exactOn = (re: RegExp) =>
          kinds.some((k) => k.scheme === 'exact' && re.test(k.network));
        return jsonResponse(
          {
            ok: true,
            networks,
            entitled_exact: {
              base: exactOn(/eip155:8453|^base/i),
              solana: exactOn(/^solana/i),
            },
            kinds,
            extensions: supported.extensions ?? [],
          },
          200,
          0,
        );
      } catch (err) {
        return jsonResponse(
          {
            ok: false,
            error: 'cdp_supported_failed',
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
      isAuthorizedAdmin(env, extractAdminKey(request, url))
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
      isAuthorizedAdmin(env, extractAdminKey(request, url))
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
      isAuthorizedAdmin(env, extractAdminKey(request, url))
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
      isAuthorizedAdmin(env, extractAdminKey(request, url))
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
    if (path === '/api/admin/agents/admin-log' && isAuthorizedAdmin(env, extractAdminKey(request, url))) {
      const date = url.searchParams.get('date') ?? new Date().toISOString().slice(0, 10);
      if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) {
        return jsonResponse({ ok: false, error: 'invalid_date' }, 400);
      }
      const entries = await listAdminActions(env, date);
      return jsonResponse({ ok: true, date, total: entries.length, entries }, 200, 0);
    }
    if (path === '/api/admin/agents/ban' && request.method === 'POST' && isAuthorizedAdmin(env, extractAdminKey(request, url))) {
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
    if (path.startsWith('/api/admin/agents/ban/') && request.method === 'DELETE' && isAuthorizedAdmin(env, extractAdminKey(request, url))) {
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
    if (path.startsWith('/api/admin/agents/claim/review/') && request.method === 'POST' && isAuthorizedAdmin(env, extractAdminKey(request, url))) {
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
      // claim_changed_since_review, protecting the admin from approving a
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

    // === AI-CVES INGEST (admin, POST) ==================================
    // /api/admin/ai-cves/ingest?key=<ADMIN_KEY>
    // DP CC's Qwen-on-5090 extraction pipeline POSTs validated batches here.
    // See For_DP_CC_ai-cves-ingest-contract.md for the client contract +
    // ai-cves-feed.ts for the validation rules + KV layout. Idempotent on
    // batch_id (re-POSTing the same id overwrites in place). Inherits the
    // hoisted /api/admin rate-limit + ADMIN_KEY pre-check.
    if (path === '/api/admin/ai-cves/ingest' && request.method === 'POST') {
      // Narrower auth than the hoisted /api/admin pre-check: ingest
      // requires INGEST_KEY only. The ADMIN_KEY transition fallback was
      // retired 2026-05-26 (audit L-6) so a leaked ADMIN_KEY cannot
      // inject papers.
      if (!isAuthorizedIngest(env, extractAdminKey(request, url))) {
        return jsonResponse(
          { ok: false, error: 'unauthorized', message: 'ai-cves ingest requires a valid INGEST_KEY.' },
          401,
          0,
        );
      }
      let raw: unknown;
      try {
        raw = await request.json();
      } catch {
        return jsonResponse({ ok: false, error: 'invalid_json' }, 400);
      }
      const { validateBatch, writeBatch } = await import('./ai-cves-feed');
      const v = validateBatch(raw);
      if (!v.ok) {
        return jsonResponse({ ok: false, error: v.error, detail: v.detail }, 400);
      }
      const result = await writeBatch(env, v.batch);
      return jsonResponse({ ok: true, ...result }, 200, 0);
    }

    // POST /api/admin/sec-filings-extraction/ingest?key=<INGEST_KEY>
    //
    // DP CC's Qwen-on-5090 extraction pipeline POSTs validated batches
    // here for the SEC filings AI-extraction lane (Phase 3f.3). See
    // For_DP_CC_sec-filings-HANDOFF.md for the schema + workflow.
    // Idempotent on accession_number (re-POSTing replaces in-place);
    // batch_id is a free-form identifier for operator telemetry.
    // Inherits the hoisted /api/admin rate-limit + admin-class pre-check.
    // Narrower auth: INGEST_KEY only (transition fallback retired 2026-05-26),
    // matching the ai-cves ingest pattern.
    if (path === '/api/admin/sec-filings-extraction/ingest' && request.method === 'POST') {
      if (!isAuthorizedIngest(env, extractAdminKey(request, url))) {
        return jsonResponse(
          { ok: false, error: 'unauthorized', message: 'sec-filings-extraction ingest requires a valid INGEST_KEY.' },
          401,
          0,
        );
      }
      let raw: unknown;
      try {
        raw = await request.json();
      } catch {
        return jsonResponse({ ok: false, error: 'invalid_json' }, 400);
      }
      const { validateBatch, writeBatch } = await import('./sec-filings-extraction');
      const v = validateBatch(raw);
      if (!v.ok) {
        return jsonResponse(
          { ok: false, error: v.error, detail: v.detail, ...(v.index !== undefined ? { filing_index: v.index } : {}) },
          400,
        );
      }
      const result = await writeBatch(env, v.value);
      // IngestResult already carries ok:true; spread it directly so we
      // don't double-specify the key (caught by tsc as TS2783).
      return jsonResponse(result, 200, 0);
    }

    // POST /api/admin/sec-guidance-delta/ingest?key=<INGEST_KEY>
    //
    // DP CC's Phi-4-on-5090 extraction pipeline POSTs validated
    // guidance-delta batches here (the periodic-filing same-form delta
    // lane). See For_DP_CC_guidance_delta_contract.md for the schema +
    // workflow. Idempotent on accession_number. INGEST_KEY only, matching
    // the ai-cves + sec-filings-extraction ingest pattern.
    if (path === '/api/admin/sec-guidance-delta/ingest' && request.method === 'POST') {
      if (!isAuthorizedIngest(env, extractAdminKey(request, url))) {
        return jsonResponse(
          { ok: false, error: 'unauthorized', message: 'sec-guidance-delta ingest requires a valid INGEST_KEY.' },
          401,
          0,
        );
      }
      let raw: unknown;
      try {
        raw = await request.json();
      } catch {
        return jsonResponse({ ok: false, error: 'invalid_json' }, 400);
      }
      const { validateBatch, writeBatch, getLatest } = await import('./sec-guidance-delta');
      const v = validateBatch(raw);
      if (!v.ok) {
        return jsonResponse(
          { ok: false, error: v.error, detail: v.detail, ...(v.index !== undefined ? { delta_index: v.index } : {}) },
          400,
        );
      }
      // Stale-write guard (audit #9): read the current latest pointer and
      // reject the POST when the incoming batch's extracted_at is older than
      // or equal to the latest already written. Without this, a replayed or
      // out-of-order admin POST could roll the guidance-delta KV back to a
      // stale batch. Mirrors the OpenAlex snapshot monotonicity guard above.
      // Comparison is ISO-string lexicographic, correct for the RFC 3339 UTC
      // extracted_at values validateBatch enforces. 409 Conflict is the HTTP
      // idiom for "current state of the resource forbids this write".
      const currentLatest = await getLatest(env);
      if (currentLatest && v.value.extracted_at <= currentLatest.extracted_at) {
        return jsonResponse(
          { ok: false, error: 'stale_write', detail: 'incoming batch extracted_at is older than or equal to the current latest batch', currentExtractedAt: currentLatest.extracted_at, incomingExtractedAt: v.value.extracted_at },
          409,
          0,
        );
      }
      const result = await writeBatch(env, v.value);
      return jsonResponse(result, 200, 0);
    }

    // /api/admin/snapshot/openalex/{institutions|authors|citation-velocity}
    // POST a pre-built OpenAlex snapshot to KV. Used as a fallback when
    // the Worker's cron path is blocked by OpenAlex's per-IP throttle on
    // Cloudflare's shared egress (the throttle wedged for the 04:00 UTC
    // cron 2026-05-15 to 2026-05-25). The TF CC operator builds the
    // snapshot from a residential IP (which OpenAlex does NOT throttle)
    // and POSTs the result here. Writes the SAME KV keys the cron uses.
    // ADMIN_KEY gated (per-route narrower check). Body shape matches the
    // exported {AIInstitutionsSnapshot, AIAuthorsSnapshot,
    // CitationVelocitySnapshot} TS interfaces.
    if (path.startsWith('/api/admin/snapshot/openalex/') && request.method === 'POST') {
      if (!isAuthorizedAdmin(env, extractAdminKey(request, url))) {
        return jsonResponse({ ok: false, error: 'unauthorized' }, 401, 0);
      }
      let raw: unknown;
      try {
        raw = await request.json();
      } catch {
        return jsonResponse({ ok: false, error: 'invalid_json' }, 400);
      }
      const kind = path.slice('/api/admin/snapshot/openalex/'.length);
      // Monotonicity guard (audit M-4, 2026-05-26): reject the POST when
      // its capturedAt is older than or equal to the snapshot currently in
      // KV. Without this an attacker who captured an old admin POST body
      // (or an out-of-order TF CC operator) could roll the snapshot back to
      // a stale state. Comparison is ISO-string lexicographic, which is
      // correct for the RFC 3339 capturedAt values these modules emit.
      // 409 Conflict is the HTTP idiom for "current state of the resource
      // forbids this write".
      if (kind === 'institutions') {
        const { validateInstitutionsSnapshot, putInstitutionsSnapshot, getInstitutionsSnapshot } = await import('./openalex-research');
        const v = validateInstitutionsSnapshot(raw);
        if (!v.ok) return jsonResponse({ ok: false, error: v.error, detail: v.detail }, 400);
        const current = await getInstitutionsSnapshot(env);
        if (current && v.snapshot.capturedAt <= current.capturedAt) {
          return jsonResponse(
            { ok: false, error: 'stale_write', detail: 'incoming capturedAt is older than or equal to the current snapshot', currentCapturedAt: current.capturedAt, incomingCapturedAt: v.snapshot.capturedAt },
            409,
            0,
          );
        }
        await putInstitutionsSnapshot(env, v.snapshot);
        return jsonResponse({ ok: true, kind, capturedAt: v.snapshot.capturedAt, count: v.snapshot.institutions.length }, 200, 0);
      }
      if (kind === 'authors') {
        const { validateAuthorsSnapshot, putAuthorsSnapshot, getOpenAlexAIAuthors } = await import('./openalex-authors');
        const v = validateAuthorsSnapshot(raw);
        if (!v.ok) return jsonResponse({ ok: false, error: v.error, detail: v.detail }, 400);
        const current = await getOpenAlexAIAuthors(env);
        if (current && v.snapshot.capturedAt <= current.capturedAt) {
          return jsonResponse(
            { ok: false, error: 'stale_write', detail: 'incoming capturedAt is older than or equal to the current snapshot', currentCapturedAt: current.capturedAt, incomingCapturedAt: v.snapshot.capturedAt },
            409,
            0,
          );
        }
        await putAuthorsSnapshot(env, v.snapshot);
        return jsonResponse({ ok: true, kind, capturedAt: v.snapshot.capturedAt, count: v.snapshot.authors.length }, 200, 0);
      }
      if (kind === 'citation-velocity') {
        const { validateCitationVelocitySnapshot, putCitationVelocitySnapshot, getOpenAlexAICitationVelocity } = await import('./openalex-citation-velocity');
        const v = validateCitationVelocitySnapshot(raw);
        if (!v.ok) return jsonResponse({ ok: false, error: v.error, detail: v.detail }, 400);
        const current = await getOpenAlexAICitationVelocity(env);
        if (current && v.snapshot.capturedAt <= current.capturedAt) {
          return jsonResponse(
            { ok: false, error: 'stale_write', detail: 'incoming capturedAt is older than or equal to the current snapshot', currentCapturedAt: current.capturedAt, incomingCapturedAt: v.snapshot.capturedAt },
            409,
            0,
          );
        }
        await putCitationVelocitySnapshot(env, v.snapshot);
        // Re-run the Semantic Scholar enrichment immediately. The seeded snapshot
        // arrives without s2 fields, so without this the cross-check stays blank
        // until the next 04:00 cron (and a re-seed silently wipes prior s2).
        // enrichVelocityWithS2 reads the snapshot we just wrote, enriches it, and
        // writes it back. It never throws (returns {ok:false} on S2 failure), so
        // the seed still succeeds when S2 is unavailable.
        const enrich = await enrichVelocityWithS2(env);
        return jsonResponse({ ok: true, kind, capturedAt: v.snapshot.capturedAt, count: v.snapshot.papers.length, s2: enrich }, 200, 0);
      }
      return jsonResponse({ ok: false, error: 'unknown_snapshot_kind', kind, allowed: ['institutions', 'authors', 'citation-velocity'] }, 400);
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

    // === PREMIUM CATALOG (free, machine-readable; cached 1h) ===
    // The canonical "what can I buy" surface for agents: one free call
    // enumerates every payable endpoint with its credit cost, params,
    // returns, free sibling, and strict-premium flag. Compiled from the
    // real handlers and guarded against drift by premium-catalog.test.ts.

    if (path === '/api/meta/premium') {
      return jsonResponse(buildPremiumCatalog(), 200, 3600);
    }

    // === OFFICIAL SURFACES (free, machine-readable; cached 1h) ===
    // Canonical anti-impersonation list: the authentic packages, MCP servers,
    // SDKs, repos, dataset, well-knowns, and the one true payTo address. The
    // served payTo comes from the live env.PAYMENT_WALLET so it can never drift
    // from /api/payment/info.

    if (path === '/api/meta/official') {
      return jsonResponse(buildOfficialSurfaces(env.PAYMENT_WALLET || undefined), 200, 3600);
    }

    // === META ENDPOINT (cached 60s) ===

    if (path === '/api/freshness') {
      // Free, unauthenticated manifest of every premium endpoint's freshness
      // SLA and the no-charge-on-stale guarantee. Pure compute over the
      // in-memory SLA registry (no I/O); deploy-static, so edge-cache it for an
      // hour. The 402 echoes each endpoint's own promise; the paid response
      // carries the live as_of and data_age_seconds.
      const freshnessRows = describeSLAs();
      return jsonResponse(
        {
          ok: true,
          count: freshnessRows.length,
          note: 'Per-endpoint data-freshness commitments. If the data behind a paid call is staler than max_age_seconds, you are not charged: the response carries no_charge_reason stale_data and credits_charged 0. A null max_age_seconds means immutable historical data or a value computed live from current inputs, with no staleness concept. Each premium 402 echoes its own endpoint promise, and each paid response carries a top-level freshness block with the live as_of and data_age_seconds.',
          endpoints: freshnessRows,
        },
        200,
        3600,
      );
    }

    if (path === '/api/meta') {
      const newsMeta = await cachedKVGet(request, env.TENSORFEED_NEWS, 'meta', 60);
      return jsonResponse({
        ok: true,
        site: 'tensorfeed.ai',
        description: 'AI news, model tracking, and real-time AI ecosystem data.',
        afta_self_description:
          'TensorFeed.ai is agent fair-trade certified: open pricing, automatic no-charge on 5xx, breaker, schema fail, and stale data, Ed25519-signed receipts on every paid call, inference-only license. Built with Claude (Anthropic). Standard at /.well-known/agent-fair-trade.json.',
        metaPremium:
          '/api/meta/premium (free; machine-readable catalog of every premium endpoint: path, credit cost, params, returns, free sibling, strict-premium flag. The canonical "what can I buy" surface for agents.)',
        metaOfficial:
          '/api/meta/official (free; canonical list of TensorFeed official surfaces and the one true payment address, for anti-impersonation. Verify any package, MCP server, repo, or payTo claiming to be TensorFeed here.)',
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
          intelligence: '/api/intelligence (free; TFII Model Intelligence Index headline ranking, a 0 to 100 composite per model from public benchmarks (MMLU-Pro, HumanEval, GPQA-Diamond, MATH, SWE-bench) discounted for contamination and saturation. Free per-model field on /api/models; signed premium breakdown at /api/premium/model-intelligence.)',
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
          breaking: '/api/breaking',
          secFilingsRecent: '/api/sec/filings/recent?form=&ticker=&limit= (free, capped 50; recent EDGAR filings for the AI bellwether cohort: NVDA, AMD, AVGO, TSM, ARM, MSFT, GOOGL, AMZN, ORCL, PLTR, SMCI, AAPL, META, TSLA. Source data.sec.gov, public domain. Refreshed every 6h.)',
          secFilingsByCik: '/api/sec/filings/{cik}/recent (free; per-company recent filings, CIK must be from cohort. Returns 404 with cohort hint otherwise.)',
          secInsiderTrades: '/api/sec/insider-trades?ticker=&limit= (free, capped 100; Form 4 insider-trade filings for one AI bellwether ticker, lazy-fetched from EDGAR with 6h KV cache. V1 returns filing metadata (accession, date, URL); structured reporting-owner + transaction parsing queued behind DataPal Qwen. Source data.sec.gov, public domain.)',
          x402IndexSummary: '/api/x402-index/summary?window=24h|7d|30d (free, default 24h; ecosystem-level x402 USDC settlement volume + count + change-vs-prior-window across the AI agent payments economy on Base mainnet. Forward-only index from 2026-05-28 onward. Indexer cron every 5 min, daily publisher manifest refresh 06:35 UTC. Source data: Base mainnet USDC Transfer events filtered to wallets self-published in publisher /.well-known/x402.json manifests.)',
          x402IndexPublishers: '/api/x402-index/publishers (free, capped to discovered count; canonical list of x402-compliant publishers TensorFeed is currently indexing, auto-discovered from /.well-known/x402.json crawls plus a small hand-seeded set of discovery-dark publishers that expose no manifest. Each entry: domain, pay_to_wallets, source (manifest or manual), first_seen, last_crawled, last_event_at, last_crawl_error. Use this to see which publishers can be queried via /api/premium/x402-index/publisher/{domain}.)',
          x402IndexLeaderboard: '/api/x402-index/leaderboard?window=24h|7d|30d&limit= (free, limit clamped 1 to 25; top publishers by x402 USDC settlement volume in the window, with rank, count, volume_usdc, and share_pct of the windowed ecosystem volume (window_volume_usdc carries the denominator). Aggregated from full per-publisher daily rollups, no per-day top-N truncation.)',
          x402IndexRecent: '/api/x402-index/recent?limit= (free, limit clamped 1 to 50; most recent x402 USDC settlement events newest-first, each with tx_hash, block, ts, from_address, to_address, amount_usdc, publisher_domain, base_explorer_url. Powers a live ticker for the /x402 hub.)',
          x402IndexVerified: '/api/x402-index/verified (free; the verified-publisher directory: which curated x402 publishers have observed on-chain USDC settlements on Base, with verified/unverified status and metrics. Precomputed daily after the 06:35 UTC publisher refresh; each entry carries status (verified-settling, unverified, unreachable, no-base-payto), activity tier, settlement_count, volume_usdc, first/last_settled, pay_to_wallets, and source. Verification is a positive on-chain claim; absence of settlements is not a claim a publisher is fake.)',
          substrateChangelogRecent: '/api/substrate-changelog/recent?limit= (free, limit clamped 1 to 50; most recent substrate events newest-first across three event types: model lifecycle changes (added, removed, repriced, deprecated) across TF\'s curated catalog, version bumps in the public MCP, x402, and A2A spec repos (alongside the current spec versions), and agent-framework releases (new GitHub releases of ~20 agent frameworks and provider SDKs). Filter with event_type. Forward-only log fed by a daily 10:17 UTC capture.)',
          premiumAiCompaniesByTicker: '/api/premium/ai-companies/{ticker} (1 credit, AFTA-signed; per-ticker AI intelligence envelope for the 14 AI bellwethers. One paid call returns latest 10 SEC filings, latest 10 news mentions filtered by curated aliases, strategic and equity funding rounds where the company is a lead or notable investor, plus cohort metadata. Single captured-at timestamp, 9h freshness SLA. Composes four free siblings (/api/sec/filings, /api/news, /api/funding, cohort registry) into one round trip.)',
          premiumX402IndexPublisher: '/api/premium/x402-index/publisher/{domain}?from=YYYY-MM-DD&to=YYYY-MM-DD (1 credit, AFTA-signed; per-publisher receipt feed for one x402-compliant domain across the inclusive date range. Returns publisher meta (domain, pay_to_wallets, first_seen), window rollup (volume_usdc, count, avg_amount, daily_series), full attribution + CC BY 4.0 license. Forensic + compliance lane for any caller building dashboards over x402 settlement data. Strict-premium prefix; anonymous Bazaar probes see a clean 402 challenge.)',
          premiumX402IndexSeries: '/api/premium/x402-index/series?metric=volume|count&granularity=day|hour&from=&to=&domain= (1 credit, AFTA-signed; time-series of ecosystem or per-publisher x402 settlement volume / count across a date range. domain param optional (omit for ecosystem). MVP supports granularity=day only; hour returns an empty series with an attribution note. Wave 20 Bazaar pilot.)',
          premiumSubstrateChangelogHistory: '/api/premium/substrate-changelog/history?from=YYYY-MM-DD&to=YYYY-MM-DD&event_type= (1 credit, AFTA-signed; full forward-only changelog of model lifecycle events (added, removed, repriced, deprecated) and agent-protocol spec versions across an inclusive date range, optionally filtered by event_type. from and to required; an empty window returns free as a no-data result. Strict-premium prefix; anonymous Bazaar probes see a clean 402 challenge.)',
          premiumStatusIncidentsTriage: '/api/premium/status/incidents/triage?provider=&impact=&recommended_action=&capability=&ongoing_only= (1 credit, AFTA-signed; full incident cohort + provider substring + impact/action exact filters + capability membership filter + ongoing_only flag. Sort priority: impact > recommended_action > started_at. Summary rollups by_provider, by_impact, by_recommended_action, by_capability, cards_with_failover_action.)',
          premiumNewsActionCards: '/api/premium/news/action-cards?capability=&urgency=&min_cost_impact=&min_security_impact=&query= (1 credit, AFTA-signed; full cohort + capability/urgency exact filters + impact "at-or-above" threshold filters + title/source substring search. Sort priority: urgency > security_impact > cost_impact > published. Summary rollups by_capability, by_urgency, by_cost_impact, by_security_impact, cards_with_migration_recommendation.)',
          codingHarnessesDates: '/api/coding-harnesses/dates (free; ordered date index of captured TerminalFeed harness snapshots for delta queries.)',
          premiumCodingHarnessesWeeklyDeltas: '/api/premium/coding-harnesses/weekly-deltas?days_back=&harness=&benchmark=&model=&min_abs_delta= (1 credit, AFTA-signed; compares current TerminalFeed harness snapshot to a prior snapshot (default 7d back, clamp [1, 90]). Per-(benchmark, harness, model) score + rank deltas, biggest_gainers, biggest_regressions, entered/exited combinations, per-benchmark leader_cards with leader_changed flag.)',
          premiumAiCryptoPulse: '/api/premium/ai-crypto-pulse?token=&setup=&min_abs_change_pct= (1 credit, AFTA-signed; joins AI-token price moves with venue-weighted funding-rate skew. Per-token setup classification: squeeze_up / chase_up / squeeze_down / chase_down / coiled / neutral. Notable movers (squeezes_up, squeezes_down, coiled, top_gainers, top_losers), summary (by_setup, breadth_pct_positive, median_change_24h_pct).)',
          premiumAiVelocity: '/api/premium/ai-velocity?pipeline=&language=&min_traction=&cross_only= (1 credit, AFTA-signed; AI-velocity ranking + cross-pollination over the TerminalFeed-sourced HF + GitHub trending snapshot. Per-entry traction_score (HF: likes*3 + log10(downloads+1)*10; GH: log10(stars+1)*30), on_both flag, cross_pollinated array of normalized-name matches, summary rollups hf_by_pipeline + github_by_language.)',
          premiumPackagesReleasesVelocity: '/api/premium/packages/releases/velocity?ecosystem=&category=&package=&min_releases_7d= (1 credit, AFTA-signed; per-package release velocity (releases_24h/7d/30d), latest bump_kind (major/minor/patch/prerelease/sideways/unknown), is_breaking_recent flag (major bump within 30d). Notable movers: recent_major_bumps, most_releases_7d, fastest_cadence_30d. Pre-1.0 minor bumps count as major per semver convention.)',
          premiumAiSafetyPackagesSecurityRadar: '/api/premium/ai-safety/packages/security/radar?ecosystem=&category=&package=&min_risk_score= (1 credit, AFTA-signed; per-package risk_score (0-100) over the OSV snapshot. Risk_band classification (calm/watch/hot/critical), notable_movers (top-5 by_critical_30d, by_risk_score, new_in_last_7d), summary rollups by_band + by_ecosystem.)',
          premiumAiSafetyIncidentsExposure: '/api/premium/ai-safety/incidents/exposure?vendor=&risk_domain=&within_days= (1 credit, AFTA-signed; exposure rollups over the AVID snapshot. Per-developer + per-deployer incident counts with recency-weighted exposure_score (1.0 last 30d, 0.5 days 31-90, 0.25 older), risk_domain + sep_view distributions, top affected artifacts. Optional substring filters and within_days window [7, 730]. AIID coverage queued via the 100MB weekly R2 snapshot path.)',
          premiumSecurityPackageVerdict: '/api/premium/security/package-verdict?package=&ecosystem=&version= (1 credit, AFTA-signed; GO/REVIEW/BLOCK pre-install safety verdict for one AI/ML package, fusing the known-malicious IOC list, the OSV advisory snapshot, the GHSA AI firehose, and release cadence. No-charge out_of_coverage when the package is in no TF security feed.)',
          premiumResilienceConcentrationVerdict: '/api/premium/resilience/concentration-verdict?providers= (1 credit, AFTA-signed; RESILIENT/EXPOSED/CRITICAL single-point-of-failure ruling over a comma-separated AI-provider set, fusing the reliability ranking with live status, plus the weakest link and the best provider to add. No-charge when no listed provider is tracked.)',
          premiumInferenceCostVerdict: '/api/premium/inference/cost-verdict?model=&monthly_tokens=&current_provider= (1 credit, AFTA-signed; cheapest inference host to serve one open-weight model at a monthly token volume, per-host projected spend, throughput context, and savings vs the current host. Optional input_tokens + output_tokens for an exact split. No-charge when the model is not in the matrix.)',
          premiumModelsFrontier: '/api/premium/models/frontier?task= (1 credit, AFTA-signed; the Pareto-optimal set of models on a capability (TFII subscore) versus blended-price plane, with every dominated model flagged plus its dominator. Optional task=code|reasoning|creative|general.)',
          premiumStackDriftVerdict: '/api/premium/stack-drift-verdict?models=&packages=&protocols=&since_days= (1 credit, AFTA-signed; STABLE/WATCH/ACTION_NEEDED ruling on what moved under a declared stack in the last N days (deprecated model, breaking package bump, protocol spec bump), classified by break-risk. At least one of models, packages, or protocols required. No-charge when nothing is tracked.)',
          premiumModelMigrationVerdict: '/api/premium/model-migration-verdict?model=&deadline= (1 credit, AFTA-signed; MIGRATE_NOW/MIGRATE_SOON/NO_ACTION for one depended-on model: the recommended successor with cost delta, capability (TFII) delta, and days until sunset. Optional deadline=YYYY-MM-DD. No-charge when the model is in no TF source.)',
          agentsDirectory: '/api/agents/directory',
          agentsOpportunities: '/api/agents/opportunities (free; daily-refreshed scan of new GitHub repos that represent submission/distribution opportunities for TF: anthropics/openai/microsoft/modelcontextprotocol orgs + MCP/x402/skills keyword sweeps. Scored by signal_weight * recency + log10(stars). 13:30 UTC cron)',
          agentsReputationByWallet: '/api/agents/reputation/{wallet} (free; v0 Agent Reputation Bureau. Returns a ReputationCard with metrics, ranks, trust grade, flags, and operator-claim status. Cards rebuilt daily at 04:50 UTC from TF telemetry. 404 on unknown wallet.)',
          agentsReputationByToken: '/api/agents/reputation/by-token/{prefix} (free; same shape as the by-wallet card, indexed by tf_live_ token prefix for agents who have not signed an operator claim yet)',
          agentsLeaderboard: '/api/agents/leaderboard?metric=reliability|spend|activity|streak|composite&window=24h|7d|30d|all&limit=1-25 (free, cohort capped at 25; full cohort on /api/premium/agents/leaderboard/full at 1 credit)',
          agentsBans: '/api/agents/bans (free; transparency list of every banned wallet or token-prefix with reason + evidence_url; auto-bans for Chainalysis OFAC hits)',
          agentsBadgeByWallet: '/api/agents/badge/{wallet}.svg (free; embeddable 200x40 SVG reputation badge with composite rank, trust grade letter, reliability %. XSS-hardened, CSP-locked, 1h edge cache)',
          agentsBadgeByToken: '/api/agents/badge/by-token/{prefix}.svg (free; same shape, indexed by tf_live_ token prefix)',
          agentsClaim: 'POST /api/agents/claim with { message, signature } (free; EIP-191 signed claim binding a wallet to a display name + optional directory fields. Chainalysis-screened, Llama Guard pre-flighted, brand-allowlist gated. Returns approved | queued | banned | rejected | retry_later.)',
          agentsClaimRead: 'GET /api/agents/claim/{wallet} (free; read the verified operator claim record for a wallet)',
          agentsDirectorySearch: 'GET /api/agents/directory/search?skill=&service_area=&language=&available=true|false&max_rate=&min_experience=&verified=true&limit=1-25 (free; agent self-directory search. Verified-hireable members sort first. Operators self-describe; TF publishes the listing. Off-platform transactions only. TF is publisher, not facilitator.)',
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
          ssvcVerdictPreview:
            '/api/preview/security/ssvc-verdict?cve=CVE-YYYY-NNNNN (free, 10/IP/day; the three CISA SSVC decision points plus tree provenance, with the computed decision, the Mission and Well-being envelope, and the reasoning redacted)',
          ssvcVerdictVerdict:
            '/api/premium/security/ssvc-verdict?cve=CVE-YYYY-NNNNN (1 credit, AFTA-signed; the CISA SSVC Coordinator decision (Act, Attend, Track, or Track*) computed from the recorded decision points, returned as the full low/medium/high Mission and Well-being envelope with a per-level reasoning trace. Plus a kev_cross_check overlay that flags when the recorded Exploitation understates a CVE now on the CISA KEV catalog and recomputes the decision under active exploitation, leaving the CISA decision unchanged. Derived from CISA Vulnrichment, US Government public domain.)',
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
          mcpHttp: '/api/mcp (free to call; hosted MCP Streamable HTTP transport, JSON-RPC 2.0 over POST. Canonical URL https://mcp.tensorfeed.ai/mcp. Compatible with Anthropic Claude Code, vertical agent repos, claude.ai connectors, and other MCP-compliant clients. GET returns discovery info; POST expects JSON-RPC envelope. Serves a curated subset of 33 tools: 31 free (news, status, models, MITRE CVE, CISA KEV, EPSS, OSV.dev, SEC EDGAR search + submissions + ticker lookup, openFDA, EIA series, USGS earthquakes, NWS weather alerts, AI papers, agent-ecosystem opportunities) plus 2 premium tools (route_verdict, whats_new) wallet-payable per call over x402 via arguments.payment or an X-PAYMENT header, USDC on Base or Solana, or a Bearer tf_live_... credits token. Strict HTTP-402 transport for x402 client wrappers at https://mcp.tensorfeed.ai/mcp?x402=strict. The full 24-tool set ships on the npx stdio server @tensorfeed/mcp-server)',
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
          researchEmergingKeywords: '/api/research/emerging-keywords (free; top-25 preview of multi-word keyphrases across recent arXiv AI abstracts ranked by recent-vs-baseline lift. Cached 1800s. Full top-50 is paid /api/premium/research/emerging-keywords.)',
          researchCitationVelocity: '/api/research/citation-velocity (free; top-25 preview of AI papers from the last 2 years ranked by the share of citations that arrived in the most recent year. OpenAlex CC0, cross-checked against Semantic Scholar. Cached 1800s.)',
          researchAuthors: '/api/research/authors (free; top-25 preview of AI researchers by trailing-365-day publication volume, with h-index, citation count, affiliation, ORCID, and AI-publication share. OpenAlex CC0. Cached 1800s.)',
          researchConferenceAcceptances: '/api/research/conference-acceptances (free; notable-tier Oral and Spotlight accepted papers from ICLR, NeurIPS, ICML via OpenReview public metadata: title, authors, decision tier, area, keywords, clipped abstract, forum_url. Cached 1800s.)',
          researchNlpProceedings: '/api/research/nlp-proceedings (free; recent ACL, EMNLP, NAACL papers via the ACL Anthology: title, authors, clipped abstract, Anthology url. Abstracts CC-BY, link and summarize only. Cached 1800s.)',
          researchLabBlogs: '/api/research/lab-blogs (free; recent posts from major AI lab and academic research blogs (Google DeepMind, Google Research, Berkeley BAIR, MIT News AI, Hugging Face), newest-first: title, source, clipped snippet, date, link. Cached 1800s.)',
          researchMilestones: '/api/research/milestones (free; top-25 preview of arXiv papers from the last 30 days flagged is_milestone_candidate by the TensorFeed offline extraction pipeline, each with the named benchmark plus delta, model release, or architecture behind the flag. Cached 1800s. Full set is paid /api/premium/research/milestones.)',
          economyBLSIndicators: '/api/economy/bls/indicators?category=inflation|employment|wages|labor-force|jolts (US Bureau of Labor Statistics, public domain; CPI, unemployment, payrolls, JOLTS, etc., 24-month history with MoM delta)',
          economyFREDIndicators: '/api/economy/fred/indicators?category=rates|gdp|money|housing|fx|commodities (Federal Reserve Economic Data, public domain; fed funds, 10Y/2Y treasuries + spread, GDP, M2, mortgage rate, USD index, oil; native frequency per series)',
          policyAIRegistry: '/api/policy/ai/registry?jurisdiction=US-Federal|US-State|EU|UK|China|International&type=executive-order|statute|regulation|guidance|declaration|agency-action&status=active|phased|pending|rescinded|vetoed|proposed&scope=transparency|safety|high-risk|deepfakes|export-controls|...',
          fundingPortfolio: '/api/funding/portfolio?silicon_dependency=nvidia|tpu|trainium|mi400|maia|mixed&type=private-equity|public-equity|compute-commitment|capacity-partnership&from=&to=&since=&until= (free; hand-curated AI capital-commitment registry tagged with recipient silicon dependency. Sources: SEC filings, hyperscaler press releases, reputable trade reporting. Each entry carries source_urls. Returns summary aggregates by silicon dependency, type, and investor.)',
          premiumFundingExposure: '/api/premium/funding/exposure (1 credit; derived metrics over the free /api/funding/portfolio: silicon-vendor concentration shares, per-investor circular-loop classification (fully-circular / partial-loop / agnostic) using investor->silicon mapping for Nvidia/Google/Amazon/Microsoft/AMD, top recipients by inbound capital, co-investor pairs that both hold stakes in the same recipient.)',
          fundingFederalSummary: '/api/funding/federal/summary (free; full federal AI spending snapshot for a curated AI-vendor cohort: per-vendor totals, award counts, the most recent award date per vendor, top awarding agencies, plus cohort-wide totals and the top 25 recent awards. Source USAspending.gov, public domain under the DATA Act. Precomputed daily.)',
          fundingFederalRecent: '/api/funding/federal/recent (free; the 25 newest dated federal contract and grant awards across the AI-vendor cohort, each with recipient, amount, awarding agency, award type, and date. Source USAspending.gov, public domain. Precomputed daily.)',
          premiumFundingFederalMomentum: '/api/premium/funding/federal/momentum (1 credit, AFTA-signed; one signed leadership and concentration ruling over the federal spending snapshot. Names the cohort leader and its share of total tracked federal AI award dollars, the top-2 spend concentration, the leading awarding agency, and the vendors with a dated award inside the last 120 days, plus echoed cohort totals. 36h freshness SLA, no-charge when stale.)',
          procurementAiContracts: '/api/procurement/ai-contracts (free; the government AI procurement snapshot across the whole federal market, not a curated cohort: a keyword search of USAspending award descriptions for AI terms over the trailing 180 days, rolled up by agency demand, by vendor with an emerging-vendor flag, plus totals, unique counts, and the 25 newest dated awards. Source USAspending.gov, public domain under the DATA Act. Precomputed daily; cold-start returns an empty 200, never 503.)',
          premiumProcurementAiContractsDemand: '/api/premium/procurement/ai-contracts/demand (1 credit, AFTA-signed; one signed demand read over the free /api/procurement/ai-contracts snapshot. Agency concentration (top-agency share of tracked AI award dollars plus the Herfindahl-Hirschman Index over ranked agencies), the emerging contractors winning AI work outside the known vendor cohort, and the top buying agencies, with echoed total dollars. captured_at is the real snapshot data time; no-charge when the snapshot is not yet captured.)',
          procurementAiOpportunities: '/api/procurement/ai-opportunities (free; open US federal AI contract opportunities from SAM.gov, the open-solicitation sibling of /api/procurement/ai-contracts. A title-keyword search for AI terms across every agency over the trailing 90 days, rolled up by agency and set-aside, with a closing-soon preview and the 25 newest postings. The full ranked open pipeline is the paid sibling. Source SAM.gov, public domain. Precomputed daily; cold-start returns an empty 200, never 503.)',
          federalAiPolicy: '/api/federal-ai-policy (free; US federal AI policy tracker across two layers. Executive and agency actions from the Federal Register (rules, proposed rules, notices, presidential documents) whose title names an AI term, rolled up by agency and document type with the 15 newest as a preview; plus AI-named federal bills from GovInfo. License: US Gov public domain. The full ranked document and bill lists are the premium read /api/premium/federal-ai-policy. Precomputed daily; cold-start returns an empty 200, never 503.)',
          premiumProcurementAiOpportunitiesDeadlines: '/api/premium/procurement/ai-opportunities/deadlines (1 credit, AFTA-signed; the full ranked pipeline of open federal AI solicitations over the free /api/procurement/ai-opportunities snapshot, sorted by response deadline with days_remaining on each, plus the echoed agency and set-aside rollups. captured_at is the real snapshot data time; no-charge when the snapshot is not yet captured.)',
          premiumFederalAiPolicy: '/api/premium/federal-ai-policy (1 credit, AFTA-signed; the full ranked list of AI-related US Federal Register actions (rules, proposed rules, notices, presidential documents) plus AI-named federal bills (GovInfo), with agency and document-type rollups, over the free /api/federal-ai-policy snapshot. captured_at is the real snapshot data time; 36h freshness SLA, no-charge when stale or not yet captured.)',
          exportControlsAi: '/api/export-controls/ai (free; classified US BIS AI and advanced-computing export-control actions (Entity List changes, license and threshold rules) from the Federal Register. Returns by_category counts plus the 30 most recent classified events: Entity List additions, advanced-computing license and threshold rules, due-diligence and model-weights measures. Source federalregister.gov, public domain; TensorFeed editorial classification. Precomputed daily; cold-start returns an empty 200, never 503.)',
          premiumExportControlsAiHistory: '/api/premium/export-controls/ai/history?from=YYYY-MM-DD&to=YYYY-MM-DD&category= (1 credit, AFTA-signed; full filterable history of AI export-control actions by date range and category. Filters the BIS Federal Register snapshot by inclusive publication-date range and category (entity-list, compute-threshold, license-policy, due-diligence, model-weights, other). captured_at is the real snapshot data time; no-charge when the snapshot is missing or the filtered window is empty. Strict-premium prefix; anonymous Bazaar probes see a clean 402 challenge.)',
          euAiActNotifiedBodies: '/api/eu-ai-act/notified-bodies (free; current EU notified-body designations under the AI Act (Regulation (EU) 2024/1689), the Cyber Resilience Act (2024/2847), and EUCC (2024/482), from the European Commission NANDO / Single Market Compliance Space database, CC BY 4.0 with attribution. Per-legislation totals plus every latest-version notification with body number, country, scope (products, procedures, annexes), and status, plus a recent designation-change preview. The AI Act count is genuinely zero today (the Digital Omnibus deferred the high-risk regime to Dec 2027 / Aug 2028); the feed exists to catch the first designation the day it lands. Precomputed daily; cold-start returns an empty 200, never 503.)',
          premiumEuAiActNotifiedBodiesHistory: '/api/premium/eu-ai-act/notified-bodies/history?from=YYYY-MM-DD&to=YYYY-MM-DD&legislation_id=&type= (1 credit, AFTA-signed; full designation-change history over the EU NANDO / SMCS register for the AI Act, CRA, and EUCC: every designation_first_seen, status_change, scope_change, and delisted event, timestamped on the observation day. All filters optional. captured_at is the events-log update time; 36h freshness SLA, no-charge when stale, when the log is empty (the AI Act is pre-first-designation), or when the filtered window has no events. Strict-premium prefix.)',
          aiDatacenters: '/api/ai-datacenters?operator=&status=announced|under_construction|operational|expansion|paused&country=&region=&purpose=training|inference|mixed|unknown (free; hand-curated registry of publicly announced AI datacenter projects, the gigawatt-class training and inference campuses from the labs and hyperscalers. Each entry carries disclosed power (MW), capex, status, accelerator, partners, and a source_url; power and capex are disclosed values only, null where not public. Sorted operational-first.)',
          premiumAiDatacentersBuildout: '/api/premium/ai-datacenters/buildout (1 credit, AFTA-signed; aggregate over the free /api/ai-datacenters registry. Disclosed power (MW) and capex totals by operator, region, and status, plus the forward commissioning calendar of sites coming online. Curated registry, no staleness SLA.)',
          capitalCycles: '/api/capital-cycles?era=pre_1931|modern (free; hand-curated registry of six historical technology capital buildouts (UK Railway Mania through the dotcom fiber overbuild) on a fixed metric skeleton, plus the current AI buildout mapped into the same skeleton. The only cross-era-comparable metric is peak capex as a percent of national GDP; absolute dollars and physical units are descriptive. The signed ranking and analogy verdict is premium at /api/premium/ai-capex-cycle-verdict.)',
          premiumAiCapexCycleVerdict: '/api/premium/ai-capex-cycle-verdict (1 credit, AFTA-signed; one signed ruling on where the current AI infrastructure capex cycle ranks against six historical technology capital buildouts measured as capex over GDP: MODERATE, ELEVATED, EXTREME, or UNPRECEDENTED, with the closest and farthest historical analog, equities-led cycles surfaced as sentiment outliers, and the post-bust dimensions that cannot be scored while the cycle is in progress. No params. Free registry at /api/capital-cycles.)',
          routingPreview: '/api/preview/routing',
          routeVerdictPreview: '/api/preview/route-verdict?task=code|reasoning|creative|general or ?model= (free, 10/IP/day; the top Route Verdict only, no runners-up or signed receipt, so an agent can evaluate the shape before paying)',
          stackSafetyPreview: '/api/preview/stack-safety-verdict?packages= (free, 10/IP/day; the gate + per-package verdict only, no CVE evidence, capped at 3 packages)',
          benchmarkTrustPreview: '/api/preview/benchmark-trust-verdict (free, 10/IP/day; trust band + score per benchmark, no per-signal detail or recommendation)',
          failoverPreview: '/api/preview/failover-verdict?from= (free, 10/IP/day; the failover destination + incident reason, no full candidate detail or alternatives)',
          guidanceDeltaPreview: '/api/preview/sec/filings/guidance-delta?accession= or ?ticker=&form= (free, 10/IP/day; the materiality_summary + per-change category/type/direction/materiality, with the verbatim quotes and values redacted)',
          providerReliabilityPreview: '/api/preview/provider-reliability-verdict (free, 10/IP/day; the most-dependable and riskiest picks only, no full per-provider ranking or signed receipt)',
          x402SettlementPreview: '/api/preview/x402-settlement-verdict (free, 10/IP/day; the momentum, concentration, and leading-publisher verdict only, no full publisher ranking or signed receipt)',
          x402PublisherPreview: '/api/preview/x402-publisher-verdict?domain= (free, 10/IP/day; the trust verdict and claim for one publisher only, no momentum, shared-wallet flag, or settlement evidence)',
          inferenceArbitragePreview: '/api/preview/inference-providers/arbitrage (free, 10/IP/day; the single largest cross-provider price spread by magnitude and how many models clear the savings threshold. The full per-model cheapest, most-expensive, and fastest provider picks plus the provider value-score rollup are the paid upgrade at /api/premium/inference-providers/arbitrage. Optional ?family=, ?min_savings_pct=.)',
          whatsNewPreview: '/api/preview/whats-new (free, 10/IP/day; live summary counts plus the top 3 headline titles. The full morning brief with pricing deltas, incident detail, and all headlines is the paid upgrade at /api/premium/whats-new.)',
          whatsNewProPreview: '/api/preview/whats-new/pro (free, 10/IP/day; one sample cited takeaway plus the agent classes the brief tailors actions for and the analyst-summary length. The full cited analyst summary, every key takeaway, and recommended actions per agent class are the paid upgrade at /api/premium/whats-new/pro.)',
          policyTimelinePreview: '/api/preview/policy/timeline (free, 10/IP/day; window counts, per-jurisdiction totals, and the single next milestone headline. The full timeline with every entry, detail, and source links is the paid upgrade at /api/premium/policy/timeline. Optional ?days_back=, ?days_forward=, ?jurisdiction=.)',
          aiStackCvesPreview: '/api/preview/ai-cves/ai-stack-cves (free, 10/IP/day; counts only (total, exploited-in-wild, by severity, by AI-stack category) plus the single top CVE headline. The full AI-stack-filtered list with version ranges, fixes, and advisory links is the paid upgrade at /api/premium/ai-cves/ai-stack-cves. Raw unfiltered batches are free at /api/ai-cves/latest.)',
          modelDeprecationsTimelinePreview: '/api/preview/model-deprecations/timeline (free, 10/IP/day; registry and window counts, per-provider and per-urgency-band summaries, and the single most-imminent sunset headline. The full timeline with every model, urgency math, and migration chains is the paid upgrade at /api/premium/model-deprecations/timeline. Optional ?within_days=, ?provider=.)',
          aiCryptoPulsePreview: '/api/preview/ai-crypto-pulse (free, 10/IP/day; cohort size, the derived setup distribution (squeeze/chase/coiled, breadth, median move), and a few classified standouts. Full per-token setup classification and venue-weighted funding is the paid upgrade at /api/premium/ai-crypto-pulse. Raw movers and funding are free at /api/ai-crypto-pulse.)',
          researchAuthorsFreeTaste: '/api/research/authors (free; the top 25 AI researchers by trailing-365-day publication volume, same fields as the paid endpoint. The full top 100 is the paid /api/premium/research/authors.)',
          premiumRouting: '/api/premium/routing?task=code|reasoning|creative|general (1 credit; top-5 ranked models with full score breakdown, pricing, status, and component-level detail. Optional ?budget=, ?min_quality=, ?top_n=1-10, and custom weights ?w_quality=, ?w_availability=, ?w_cost=, ?w_latency=.)',
          premiumRouteVerdict: '/api/premium/route-verdict?task=code|reasoning|creative|general or ?model= (1 credit, AFTA-signed; the single best model to use right now, fusing pricing, contamination-discounted capability, real usage, measured p95 latency, and live incident state, plus runners-up and a signed receipt. Optional ?max_latency_p95_ms=, ?require_operational=, ?exclude_deprecated=. 30-min freshness SLA, no-charge when stale.)',
          stackSafetyVerdict: '/api/premium/stack-safety-verdict?packages=name@version,... (1 credit, AFTA-signed; GO/HOLD/BLOCK deploy gate per AI-stack package, fusing the ingested AI-CVE batch + CISA KEV. Up to 10 packages. Never-false-confirm: BLOCK only on exploited with no fix, HOLD on version-ambiguous, PASS on no match, UNKNOWN outside the cohort.)',
          cveCheck: 'POST /api/premium/cve-check (50 credits = $1.00, AFTA-signed; paste a lockfile (requirements.txt, package.json, package-lock.json, or poetry.lock) in the request body and get the BLOCK/HOLD/PASS deploy gate with matched-CVE evidence. Free sample at /api/preview/cve-check. Re-POST the same lockfile with ?since=<cursor> to re-audit for free until a new CVE batch lands.)',
          benchmarkTrustVerdict: '/api/premium/benchmark-trust-verdict?benchmark= or ?category= (1 credit, AFTA-signed; is an AI benchmark a trustworthy capability signal or saturated/contaminated/near-ceiling, so down-weight a high score. Trust band + 0-100 score per benchmark, fusing contamination and saturation flags with live frontier compression, plus a down-weight recommendation and an alternative benchmark.)',
          failoverVerdict: '/api/premium/failover-verdict?from=<provider>&task= (1 credit, AFTA-signed; provider A degraded, recommend the best operational failover target for a task. Confirms A against live incident triage, then runs the route verdict with A and any failover_now provider excluded. Returns destination + incident reason + ranked alternatives.)',
          guidanceDeltaVerdict: '/api/premium/sec/filings/guidance-delta?accession= or ?ticker=&form= (1 credit, AFTA-signed; did this periodic 10-K/10-Q materially change guidance, segment outlook, or risk language vs the prior same-form filing, with the exact changed sentences quoted. Deterministic materiality_summary + full verbatim changes. Input-keyed freshness, no-charge when a newer same-form filing supersedes the delta.)',
          providerReliabilityVerdict: '/api/premium/provider-reliability-verdict (1 credit, AFTA-signed; ranks the frontier providers TensorFeed probes by measured operational reliability, fusing availability and tail consistency (p50 over p95) into one dependability ranking. Names the most dependable and the riskiest, ships the full per-provider ranking and a signed receipt. 30-min freshness SLA, no-charge when stale.)',
          x402SettlementVerdict: '/api/premium/x402-settlement-verdict?window=24h|7d|30d (1 credit, AFTA-signed; rules on the Base x402 USDC settlement market over TensorFeed\'s own settlement index: momentum vs the prior window of equal length, concentration by the Herfindahl index, and the leading publisher, plus the full per-publisher ranking. 10-min freshness SLA, no-charge when stale.)',
          x402PublisherVerdict: '/api/premium/x402-publisher-verdict?domain= (1 credit, AFTA-signed; signed trust verdict on one x402 publisher over TensorFeed\'s own settlement index: whether its Base payTo is actively settling, its 30-day settlement momentum, a shared-wallet risk flag, and the settlement evidence. 10-min freshness SLA, no-charge when stale.)',
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
          premiumSecurityVerifiedCVE: '/api/premium/security/verified/{CVE-id} (1 credit; cross-database CVE verification: composes MITRE CVE + CISA KEV + FIRST.org EPSS + OSV.dev + CISA Vulnrichment into one fact card with confirmed_by array and corroboration_count. The single-call anti-hallucination lookup for security agents)',
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
          premiumCompareModels: '/api/premium/compare/models?ids=opus-4-7,gpt-5-5,gemini-3-5-flash',
          premiumWhatsNew: '/api/premium/whats-new?days=1&news_limit=10 (1 credit; morning brief. Pass ?since=<cursor> from a prior response to get only what changed; an unchanged poll is free (no charge). Every response returns a cursor and a continuation hint.)',
          premiumWhatsNewPro: '/api/premium/whats-new/pro?days=1&news_limit=10 (10 credits, AFTA-signed; pro tier of the morning brief. Same 24h base payload plus Claude Haiku 4.5 generated analyst summary, 1-5 cited key takeaways, and 1-3 recommended actions targeted by agent class. Every claim cites by stable basis ID; citations are server-side validated, so the agent never sees a hallucinated reference.)',
          premiumPolicyTimeline: '/api/premium/policy/timeline?days_back=&days_forward=&jurisdiction= (1 credit; forward + backward calendar over the AI policy registry with relative-to-now classification, next-3-milestones, days-until-effective per entry)',
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
          trialCredits: 'POST /api/payment/trial-credits (free; sign EIP-191, get 25 trial credits, one per wallet)',
          paymentConfirm: '/api/payment/confirm',
          paymentBalance: '/api/payment/balance',
          paymentUsage: '/api/payment/usage',
          paymentHistory: '/api/payment/history',
          paymentSpendCap: '/api/payment/spend-cap (GET reads, POST sets)',
          paymentRevoke: 'POST /api/payment/revoke',
          paymentNoChargeStats: '/api/payment/no-charge-stats',
          receiptVerify: '/api/receipt/verify',
          aiCrawlerAccessSummary: '/api/ai-crawler-access/summary.json (free; aggregate AI crawler access map across curated domains: per-bot allow/block percentages (GPTBot, ClaudeBot, PerplexityBot, CCBot, and more), plus llms.txt and ai.txt adoption. We report stated robots.txt policy, not enforcement. No parameters.)',
          aiCrawlerAccessSite: '/api/ai-crawler-access/site?domain= (free; per-site robots.txt verdict for each tracked AI bot, plus llms.txt and ai.txt presence, for one domain. Required param: domain.)',
          aiCrawlerAccessCheck: '/api/ai-crawler-access/check?domain= (free; live on-demand robots.txt verdict for any public domain not in the tracked set: per-bot allowed/blocked/partial/unknown plus llms.txt/ai.txt presence. Rate-limited 120/min/IP, cached 1h.)',
          premiumAiCrawlerAccessFull: '/api/premium/ai-crawler-access/full (1 credit, AFTA-signed; full dataset: every tracked domain with per-bot robots.txt verdicts (allowed/blocked/partial/unknown) and llms.txt/ai.txt flags, plus sector rollups. 8-day freshness SLA, no-charge when stale.)',
          premiumAiCrawlerAccessChanges: '/api/premium/ai-crawler-access/changes?domain=&from=&to= (1 credit, AFTA-signed, strict-premium; historical flip log: when a site changed a bot from allowed to blocked (or back) or published llms.txt, within a date range. Required params: from, to (domain optional).)',
          agentReadySummary: '/api/agent-ready/summary.json (free; agentic-web readiness across curated domains: per-surface adoption (x402 manifest, agent.json, openapi, llms.txt, AI-bot-crawlable, ai.txt), readiness-tier distribution, and a top-25 leaderboard. Derived from the crawler-access crawl. No parameters.)',
          agentReadySite: '/api/agent-ready/site?domain= (free; per-domain agent-readiness profile: a transparent 0-100 score, tier, and which agent surfaces the site exposes. Required param: domain.)',
          premiumAgentReadyFull: '/api/premium/agent-ready/full (1 credit, AFTA-signed; full per-domain agent-readiness dataset with scores and surface flags. 8-day freshness SLA, no-charge when stale.)',
          premiumHfLeaderboardMovers: '/api/premium/hf-leaderboard/movers?window= (1 credit, AFTA-signed, strict-premium; period-over-period movers on the Open LLM Leaderboard v2 from TF dated snapshots: rank climbers and fallers, score deltas, models entered and exited, new per-benchmark leaders, license changes. Optional window in days, default 7. 36h SLA, no-charge under two captured days.)',
        },
        admin: {
          usage: '/api/admin/usage?window=today|7d|30d&key=<ADMIN_KEY> (paid summary + AE funnel when provisioned; legacy ?date=YYYY-MM-DD still returns one day raw rollup)',
          statsBackfill: '/api/admin/stats/backfill?key=<ADMIN_KEY> (GET; one-time/idempotent seed of the /api/stats lifetime counter from the persisted daily rollups)',
          usageDates: '/api/admin/usage/dates?key=<ADMIN_KEY>',
          burnToken: '/api/admin/burn-token?token=tf_live_...&key=<ADMIN_KEY>',
          anomalies: '/api/admin/anomalies?key=<ADMIN_KEY>&severity=warning|critical',
          killSwitch: '/api/admin/kill-switch?key=<ADMIN_KEY> (GET = status + audit; POST&action=on|off to flip the runtime KV-flag side. Env-secret side via wrangler secret put KILL_SWITCH_KV_WRITES.)',
          breaking: '/api/admin/breaking?key=<ADMIN_KEY> (GET = raw alert + is_live + audit; POST {headline, href, ttl_hours?} sets; POST {clear:true} clears. Public read at /api/breaking.)',
          refresh: '/api/refresh?key=<ADMIN_KEY>[&task=history|harnesses|models|mcp-registry|papers|arxiv|hf|hf-leaderboard|hot-issues|reddit|openrouter|hf-daily-papers|probe|probe-rollup|fred|bls|npm-ai|pypi-ai|openalex|openalex-authors|openalex-citation-velocity|openreview|acl|lab-blogs|s2|apis-guru-ai|nflverse|sec-tickers|sec-filings|sports-news|opportunities|ai-supply-chain-iocs|ghsa-ai-feed|agent-reputation|epoch|crawler-access|federal-ai-policy]',
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
          no_charge_guarantees: ['5xx', 'circuit_breaker', 'schema_validation_failure', 'upstream_failure', 'stale_data', 'empty_result'],
          receipts: receiptStatus(env),
          freshness_slas: describeSLAs(),
          freshness_manifest: '/api/freshness',
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

    // === FREE: AI DATACENTER BUILDOUT REGISTRY ===
    // Hand-curated catalog of publicly announced AI datacenter projects: the
    // gigawatt-class training and inference campuses being built by the labs
    // and hyperscalers. Filter by operator (case-insensitive substring) and by
    // status / country / region / purpose (case-insensitive exact). Curated,
    // editorial cadence on redeploy. Sister to /api/funding/portfolio.
    if (path === '/api/ai-datacenters') {
      const { AI_DATACENTERS, AI_DATACENTERS_LAST_UPDATED, DATACENTERS_ATTRIBUTION, filterDatacenters } =
        await import('./ai-datacenters');
      const operator = url.searchParams.get('operator') ?? undefined;
      const status = url.searchParams.get('status') ?? undefined;
      const country = url.searchParams.get('country') ?? undefined;
      const region = url.searchParams.get('region') ?? undefined;
      const purpose = url.searchParams.get('purpose') ?? undefined;
      const datacenters = filterDatacenters(AI_DATACENTERS, { operator, status, country, region, purpose });
      return jsonResponse(
        {
          ok: true,
          source: 'tensorfeed.ai',
          count: datacenters.length,
          last_updated: AI_DATACENTERS_LAST_UPDATED,
          datacenters,
          attribution: DATACENTERS_ATTRIBUTION,
          filters: { operator, status, country, region, purpose },
        },
        200,
        3600,
      );
    }

    // === FREE: CAPITAL CYCLES ===
    // Hand-curated registry of historical technology capital buildouts on a
    // fixed metric skeleton, plus the current AI buildout mapped into the same
    // skeleton. The only cross-era-comparable metric is peak capex as a percent
    // of national GDP; absolute dollars and physical units are descriptive. The
    // current AI numerator is the curated AI_CURRENT annual-capex constant (an
    // annual flow, matching the historical annual-flow basis), not the
    // ai-datacenters cumulative announced capex. The signed ranking and analogy
    // verdict is premium at /api/premium/ai-capex-cycle-verdict. Filter by era
    // (pre_1931 | modern). Curated, editorial cadence on redeploy.
    if (path === '/api/capital-cycles') {
      const {
        CAPITAL_CYCLES,
        CAPITAL_CYCLES_LAST_UPDATED,
        CAPITAL_CYCLES_ATTRIBUTION,
        CONSIDERED_EXCLUDED,
        GDP_DENOMINATOR,
        AI_CURRENT,
        REAL_CAPITAL_NOTE,
        deriveCurrentAiCycle,
        filterCapitalCycles,
      } = await import('./capital-cycles');
      const { AI_DATACENTERS, AI_DATACENTERS_LAST_UPDATED, buildBuildoutAggregate } = await import('./ai-datacenters');
      const era = url.searchParams.get('era') ?? undefined;
      const cycles = filterCapitalCycles(CAPITAL_CYCLES, { era });
      const agg = buildBuildoutAggregate(AI_DATACENTERS, AI_DATACENTERS_LAST_UPDATED);
      const current_cycle = deriveCurrentAiCycle(
        AI_CURRENT,
        agg.totals.disclosed_power_mw,
        GDP_DENOMINATOR.value_usd_t,
        AI_DATACENTERS_LAST_UPDATED + 'T00:00:00Z',
      );
      return jsonResponse(
        {
          ok: true,
          source: 'tensorfeed.ai',
          count: cycles.length,
          last_updated: CAPITAL_CYCLES_LAST_UPDATED,
          gdp_denominator: GDP_DENOMINATOR,
          ai_current_capex: AI_CURRENT,
          real_capital_note: REAL_CAPITAL_NOTE,
          cycles,
          current_cycle,
          considered_excluded: CONSIDERED_EXCLUDED,
          attribution: CAPITAL_CYCLES_ATTRIBUTION,
          filters: { era },
        },
        200,
        3600,
      );
    }

    // === FREE: FEDERAL AI SPENDING ===
    // Surfaces US federal contract and grant awards flowing to a curated
    // AI-vendor cohort. The daily cron writes one precomputed snapshot blob
    // to KV; these routes serve it. Same precomputed-KV read shape as
    // /api/x402-index/verified: 503 not_ready when the blob is missing,
    // 200 with a short cache otherwise. Source: USAspending.gov, public
    // domain under the DATA Act.

    if (path === '/api/funding/federal/summary') {
      const { FED_SPEND_SNAPSHOT_KEY } = await import('./federal-spending-fetcher');
      const snap = await env.TENSORFEED_CACHE.get(FED_SPEND_SNAPSHOT_KEY, 'json');
      if (!snap) {
        return jsonResponse(
          { ok: false, error: 'not_ready', hint: 'The federal spending snapshot precomputes daily; retry after the next cron run.' },
          503,
          0,
        );
      }
      return jsonResponse(snap, 200, 300);
    }

    if (path === '/api/funding/federal/recent') {
      const { FED_SPEND_SNAPSHOT_KEY } = await import('./federal-spending-fetcher');
      const snap = (await env.TENSORFEED_CACHE.get(FED_SPEND_SNAPSHOT_KEY, 'json')) as
        | import('./federal-spending-fetcher').FedSnapshot
        | null;
      if (!snap) {
        return jsonResponse(
          { ok: false, error: 'not_ready', hint: 'The federal spending snapshot precomputes daily; retry after the next cron run.' },
          503,
          0,
        );
      }
      return jsonResponse(
        { ok: true, captured_at: snap.captured_at, source: snap.source, license: snap.license, recent: snap.recent },
        200,
        300,
      );
    }

    // === GOVERNMENT AI PROCUREMENT (free) ===
    // /api/procurement/ai-contracts: the full keyword-filtered AI procurement
    // snapshot across the whole federal market (every vendor), rolled up by
    // agency demand plus an emerging-vendor flag. The 16:23 UTC cron writes
    // one precomputed snapshot blob to KV; this route serves it. Distinct from
    // /api/funding/federal/summary, which name-matches a curated 8-vendor
    // cohort. Cold-start safe: pre-first-cron it returns a 200 empty shape,
    // never 503, so an agent always gets a parseable answer.
    if (path === '/api/procurement/ai-contracts') {
      const { AI_PROCUREMENT_SNAPSHOT_KEY } = await import('./ai-procurement');
      const snap = (await env.TENSORFEED_CACHE.get(AI_PROCUREMENT_SNAPSHOT_KEY, 'json')) as
        | import('./ai-procurement').ProcurementSnapshot
        | null;
      if (snap) {
        // snap already carries ok: true (ProcurementSnapshot), so the spread
        // alone satisfies the { ok: true, ...snapshot } contract.
        return jsonResponse({ ...snap }, 200, 300);
      }
      const { PROCUREMENT_SOURCE, PROCUREMENT_LICENSE, AI_KEYWORDS } = await import('./ai-procurement');
      return jsonResponse(
        {
          ok: true,
          captured_at: null,
          source: PROCUREMENT_SOURCE,
          license: PROCUREMENT_LICENSE,
          window_days: 180,
          keywords: AI_KEYWORDS,
          total_usd: 0,
          total_awards: 0,
          unique_recipients: 0,
          unique_agencies: 0,
          by_agency: [],
          by_vendor: [],
          recent: [],
          note: 'Snapshot not yet captured; first cron run pending.',
        },
        200,
        60,
      );
    }

    // === AI EXPORT CONTROLS (free) ===
    // /api/export-controls/ai: classified US BIS AI and advanced-computing
    // export-control actions (Entity List changes, advanced-computing license
    // and threshold rules, due-diligence measures) drawn from the Federal
    // Register and classified by TensorFeed. The 18:43 UTC cron writes one
    // snapshot blob to KV; this route serves a rollup over it (by_category
    // counts plus the 30 most recent events). Cold-start safe: pre-first-cron
    // it returns a 200 empty shape, never 503, so an agent always gets a
    // parseable answer.
    if (path === '/api/export-controls/ai') {
      const { EXPORT_CONTROLS_KEY, EXPORT_CONTROL_SOURCE, EXPORT_CONTROL_LICENSE } = await import('./export-controls');
      const snapshot = (await env.TENSORFEED_CACHE.get(EXPORT_CONTROLS_KEY, 'json')) as
        | {
            ok: true;
            captured_at: string;
            source: string;
            license: string;
            total: number;
            events: import('./export-controls').ExportControlEvent[];
          }
        | null;
      if (snapshot) {
        const byCategory: Record<string, number> = {};
        for (const e of snapshot.events) {
          byCategory[e.category] = (byCategory[e.category] ?? 0) + 1;
        }
        return jsonResponse(
          {
            ok: true,
            captured_at: snapshot.captured_at,
            source: snapshot.source,
            license: snapshot.license,
            total: snapshot.total,
            by_category: byCategory,
            recent: snapshot.events.slice(0, 30),
          },
          200,
          300,
        );
      }
      return jsonResponse(
        {
          ok: true,
          captured_at: null,
          source: EXPORT_CONTROL_SOURCE,
          license: EXPORT_CONTROL_LICENSE,
          total: 0,
          by_category: {},
          recent: [],
          note: 'snapshot not yet generated',
        },
        200,
        300,
      );
    }

    // === EU AI ACT NOTIFIED BODIES (free) ===
    // /api/eu-ai-act/notified-bodies: current EU conformity-assessment
    // designations under the AI Act (Regulation (EU) 2024/1689), the Cyber
    // Resilience Act (2024/2847), and EUCC (2024/482) from the Commission's
    // NANDO / Single Market Compliance Space database (CC BY 4.0). The 19:33
    // UTC cron writes one snapshot blob plus a forward-only change log to KV;
    // this route serves the snapshot with a short recent-changes preview (the
    // full designation-change history is the premium read). The AI Act count
    // being zero is real data, not a bug: the Digital Omnibus deferred the
    // high-risk regime, so the feed's job today is to catch the first
    // designation the day it lands. Cold-start safe: pre-first-cron it
    // returns a 200 empty shape, never 503.
    if (path === '/api/eu-ai-act/notified-bodies') {
      const {
        EU_AI_ACT_CURRENT_KEY,
        EU_AI_ACT_EVENTS_KEY,
        EU_AI_ACT_SOURCE,
        EU_AI_ACT_LICENSE,
        EU_AI_ACT_TIMELINE_NOTE,
        TRACKED_LEGISLATIONS,
      } = await import('./eu-ai-act');
      const snapshot = (await env.TENSORFEED_CACHE.get(EU_AI_ACT_CURRENT_KEY, 'json')) as
        | {
            ok: true;
            captured_at: string;
            source: string;
            license: string;
            timeline_note: string;
            legislations: Array<{
              legislation_id: number;
              code: string;
              name: string;
              total: number;
              active: number;
            }>;
            total: number;
            bodies: import('./eu-ai-act').NotifiedBodyRecord[];
          }
        | null;
      if (snapshot) {
        const log = (await env.TENSORFEED_CACHE.get(EU_AI_ACT_EVENTS_KEY, 'json')) as
          | { events: import('./eu-ai-act').DesignationEvent[] }
          | null;
        return jsonResponse(
          {
            ...snapshot,
            recent_changes: (log?.events ?? []).slice(0, 5),
          },
          200,
          300,
        );
      }
      return jsonResponse(
        {
          ok: true,
          captured_at: null,
          source: EU_AI_ACT_SOURCE,
          license: EU_AI_ACT_LICENSE,
          timeline_note: EU_AI_ACT_TIMELINE_NOTE,
          legislations: TRACKED_LEGISLATIONS.map((l) => ({ ...l, total: 0, active: 0 })),
          total: 0,
          bodies: [],
          recent_changes: [],
          note: 'snapshot not yet generated',
        },
        200,
        300,
      );
    }

    // === FEDERAL AI OPPORTUNITIES (free) ===
    // /api/procurement/ai-opportunities: the open-solicitation sibling of the
    // award-side /api/procurement/ai-contracts. A title-keyword SAM.gov search
    // for AI terms across every agency over the trailing 90 days, rolled up by
    // agency and set-aside with a closing-soon preview. The 01:37 UTC cron
    // writes one precomputed snapshot blob to KV; this route serves it with the
    // full `open` list stripped (that ranked pipeline is the premium read).
    // Cold-start safe: pre-first-cron it returns a 200 empty shape, never 503,
    // so an agent always gets a parseable answer.
    if (path === '/api/procurement/ai-opportunities') {
      const { OPP_SNAPSHOT_KEY } = await import('./ai-opportunities');
      const snapshot = (await env.TENSORFEED_CACHE.get(OPP_SNAPSHOT_KEY, 'json')) as
        | import('./ai-opportunities').OpportunitySnapshot
        | null;
      if (snapshot) {
        // Strip the full `open` pipeline; the free view keeps the rollups plus
        // the closing_soon and recent previews.
        const { open, ...freeView } = snapshot;
        void open;
        return jsonResponse(freeView, 200, 300);
      }
      const { OPP_SOURCE, OPP_LICENSE, WINDOW_DAYS, AI_TITLE_KEYWORDS } = await import('./ai-opportunities');
      return jsonResponse(
        {
          ok: true,
          captured_at: null,
          source: OPP_SOURCE,
          license: OPP_LICENSE,
          window_days: WINDOW_DAYS,
          keywords: AI_TITLE_KEYWORDS,
          total_open: 0,
          unique_agencies: 0,
          by_agency: [],
          by_set_aside: [],
          closing_soon: [],
          recent: [],
          note: 'snapshot not yet generated',
        },
        200,
        300,
      );
    }

    // === FEDERAL AI POLICY TRACKER (free) ===
    // /api/federal-ai-policy: US federal AI policy actions across two layers.
    // Executive/agency layer = Federal Register documents (rules, proposed
    // rules, notices, presidential documents) whose title or abstract names an
    // AI term. Legislative layer = GovInfo BILLS matches (key-gated; the
    // bills_enabled flag reflects whether DATA_GOV_API_KEY is set). The 01:47
    // UTC cron writes one precomputed snapshot blob; this route serves it with
    // the full `documents` and `bills` arrays stripped (those ranked lists are
    // the premium read). Cold-start safe: pre-first-cron it returns a 200 empty
    // shape, never 503, so an agent always gets a parseable answer.
    if (path === '/api/federal-ai-policy') {
      const { POLICY_SNAPSHOT_KEY } = await import('./federal-ai-policy');
      const snapshot = (await env.TENSORFEED_CACHE.get(POLICY_SNAPSHOT_KEY, 'json')) as
        | import('./federal-ai-policy').PolicySnapshot
        | null;
      if (snapshot) {
        // Strip the full pipelines; the free view keeps the rollups plus the
        // recent_documents and recent_bills previews.
        const { documents, bills, ...freeView } = snapshot;
        void documents;
        void bills;
        return jsonResponse(freeView, 200, 300);
      }
      const { POLICY_SOURCE, POLICY_LICENSE, POLICY_WINDOW_DAYS, POLICY_AI_KEYWORDS } = await import('./federal-ai-policy');
      return jsonResponse(
        {
          ok: true,
          captured_at: null,
          source: POLICY_SOURCE,
          license: POLICY_LICENSE,
          window_days: POLICY_WINDOW_DAYS,
          keywords: POLICY_AI_KEYWORDS,
          total_documents: 0,
          unique_agencies: 0,
          by_agency: [],
          by_type: [],
          recent_documents: [],
          bills_enabled: false,
          total_bills: 0,
          recent_bills: [],
          note: 'snapshot not yet generated',
        },
        200,
        300,
      );
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

    // === FREE RESEARCH FEEDS (top-25 previews of the premium full sets) ====
    // The /research/* public pages (authors, citation-velocity, milestones,
    // emerging-keywords) call these from the browser. They mirror the
    // shape of /api/premium/research/* but clip to top 25, so the page
    // renders without paying. The premium siblings return the full 100
    // for paying agents. Cached 1800s.

    if (path === '/api/research/authors') {
      const snapshot = await getOpenAlexAIAuthors(env);
      if (!snapshot) {
        return jsonResponse(
          { ok: false, error: 'no_snapshot_yet', hint: 'OpenAlex authors snapshot has not yet been refreshed. Cron runs daily; retry shortly.' },
          503,
          60,
        );
      }
      const clipped = { ...snapshot, authors: (snapshot.authors ?? []).slice(0, 25) };
      return jsonResponse({ ok: true, ...clipped }, 200, 1800);
    }

    if (path === '/api/research/citation-velocity') {
      const snapshot = await getOpenAlexAICitationVelocity(env);
      if (!snapshot) {
        return jsonResponse(
          { ok: false, error: 'no_snapshot_yet', hint: 'OpenAlex citation-velocity snapshot has not yet been refreshed. Cron runs daily; retry shortly.' },
          503,
          60,
        );
      }
      // Filter predatory venues + citation-farm signatures at read time, since
      // the stored snapshot may predate the filter (seed-script source).
      const cleaned = filterVelocityPapers(snapshot.papers ?? [], new Date().getUTCFullYear());
      const clipped = { ...snapshot, papers: cleaned.slice(0, 25) };
      return jsonResponse({ ok: true, ...clipped }, 200, 1800);
    }

    if (path === '/api/research/conference-acceptances') {
      const snapshot = await getOpenReviewAcceptances(env);
      if (!snapshot) {
        return jsonResponse(
          { ok: false, error: 'no_snapshot_yet', hint: 'OpenReview conference-acceptances snapshot has not yet been refreshed. Cron runs daily; retry shortly, or trigger task=openreview.' },
          503,
          60,
        );
      }
      const clipped = { ...snapshot, papers: (snapshot.papers ?? []).slice(0, 50) };
      return jsonResponse({ ok: true, ...clipped }, 200, 1800);
    }

    if (path === '/api/research/lab-blogs') {
      const snapshot = await getResearchBlogs(env);
      if (!snapshot) {
        return jsonResponse(
          { ok: false, error: 'no_snapshot_yet', hint: 'Research-blogs snapshot has not yet been refreshed. Cron runs daily; retry shortly, or trigger task=lab-blogs.' },
          503,
          60,
        );
      }
      const clipped = { ...snapshot, posts: (snapshot.posts ?? []).slice(0, 60) };
      return jsonResponse({ ok: true, ...clipped }, 200, 1800);
    }

    if (path === '/api/research/nlp-proceedings') {
      const snapshot = await getAclProceedings(env);
      if (!snapshot) {
        return jsonResponse(
          { ok: false, error: 'no_snapshot_yet', hint: 'ACL Anthology proceedings snapshot has not yet been refreshed. Cron runs daily; retry shortly, or trigger task=acl.' },
          503,
          60,
        );
      }
      const clipped = { ...snapshot, papers: (snapshot.papers ?? []).slice(0, 60) };
      return jsonResponse({ ok: true, ...clipped }, 200, 1800);
    }

    if (path === '/api/research/milestones') {
      const result = await computeArxivMilestones(env);
      if (!result.ok) {
        return jsonResponse({ ok: false, error: result.error, ...(result.hint ? { hint: result.hint } : {}) }, 503, 60);
      }
      const clipped = { ...result, papers: ((result as { papers?: unknown[] }).papers ?? []).slice(0, 25) };
      return jsonResponse(clipped, 200, 1800);
    }

    if (path === '/api/research/emerging-keywords') {
      const result = await computeArxivEmergingKeywords(env);
      if (!result.ok) {
        return jsonResponse({ ok: false, error: result.error, ...(result.hint ? { hint: result.hint } : {}) }, 503, 60);
      }
      const clipped = { ...result, keywords: ((result as { keywords?: unknown[] }).keywords ?? []).slice(0, 25) };
      return jsonResponse(clipped, 200, 1800);
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

    // === PAID PREMIUM: HF LEADERBOARD MOVERS (Tier 1, 1 credit) ===
    // /api/premium/hf-leaderboard/movers?window=<days, default 7, 1 to 90>
    // Period-over-period movers on the Open LLM Leaderboard v2, derived from
    // TensorFeed's own dated snapshots (the live board shows only today's
    // state). Rank climbers and fallers, average plus per-benchmark score
    // deltas, models entered and exited, new per-benchmark leaders, and license
    // changes. Reads the optional window param (default 7), so it is registered
    // strict-premium per the convention that any param-reading paid route is
    // strict. captured_at is the latest snapshot date. Fewer than two captured
    // days in the window passes empty_result so the call is not billed.
    if (path === '/api/premium/hf-leaderboard/movers') {
      const payment = await requirePayment(request, env, 1);
      if (!payment.paid) return payment.response!;
      const wRaw = parseInt(url.searchParams.get('window') ?? '', 10);
      const windowDays = Number.isFinite(wRaw) ? Math.max(1, Math.min(wRaw, 90)) : 7;
      const { buildMovers } = await import('./premium-hf-leaderboard');
      const result = await buildMovers(env, windowDays);
      // Fewer than two captured days is an empty movers result: no-charge AND
      // skip usage logging. logPremiumUsage previously fired before the
      // no-charge, over-counting the revenue rollup against a 0-credit debit.
      if (!result.has_data) {
        return await premiumResponse(result, payment, 1, request, env, 'empty_result');
      }
      ctx.waitUntil(logPremiumUsage(env, '/api/premium/hf-leaderboard/movers', request.headers.get('User-Agent') || 'unknown', 1, payment.token, payment.payerWallet));
      return await premiumResponse(result, payment, 1, request, env);
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
        wantNews ? safe(cachedKVGet(request, env.TENSORFEED_NEWS, 'articles', 60, ctx, env) as Promise<Article[] | null>) : Promise.resolve(null),
        wantPapers ? safe(getPapersLatest(env)) : Promise.resolve(null),
        wantPapers ? safe(getArxivLatest(env)) : Promise.resolve(null),
        wantPapers ? safe(getHFDailyPapersLatest(env)) : Promise.resolve(null),
        wantHf ? safe(getHFLatest(env)) : Promise.resolve(null),
        wantCommunity ? safe(getHotIssuesLatest(env)) : Promise.resolve(null),
        wantCommunity ? safe(getRedditLatest(env)) : Promise.resolve(null),
        wantInference ? safe(getORLatest(env)) : Promise.resolve(null),
        wantStatus ? safe(cachedKVGet(request, env.TENSORFEED_STATUS, 'services', 120, ctx, env) as Promise<ServiceStatus[] | null>) : Promise.resolve(null),
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

    // === SETTLEMENT RAILS: cross-chain x402 cost + finality (free) ===
    // /api/settlement-rails
    // Current settlement cost and finality per x402-supported rail (Base,
    // Solana, Polygon, Arbitrum, Avalanche). Raw on-chain self-settle cost plus
    // the CDP facilitator reality (gas sponsored, flat $0.001 after 1000/mo
    // free), plus published finality. Lazily refreshed (~20 min) from live RPC
    // and Coinbase spot prices, 60s in-memory cache, last-known-good fallback so
    // it never returns blank. Free sibling of the premium settlement rail verdict.
    if (path === '/api/settlement-rails') {
      const { getSnapshot } = await import('./settlement-rails');
      const snapshot = await getSnapshot(env);
      return jsonResponse({ ok: true, snapshot }, 200, 300);
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

    // MCP Pro Tier offering: monthly subscription for unlimited
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
      // Dedicated abuse limit. This route fans out up to ~5 outbound fetches to
      // a caller-supplied domain, so it must not ride only the generic per-IP
      // limit. 25/day/IP is plenty for a publisher iterating on fixes, and caps
      // the fetch-amplification surface. Mirrors the route-verdict preview limiter.
      const certifyIp =
        request.headers.get('CF-Connecting-IP') || request.headers.get('x-forwarded-for') || 'anonymous';
      const certifyRlKey = `rate:afta-certify:${new Date().toISOString().slice(0, 10)}:${certifyIp}`;
      const certifyRl = (await env.TENSORFEED_CACHE.get(certifyRlKey, 'json')) as { count: number } | null;
      const certifyCount = certifyRl?.count ?? 0;
      if (certifyCount >= 25) {
        return jsonResponse(
          {
            ok: false,
            error: 'rate_limit_exceeded',
            limit: 25,
            remaining: 0,
            reset_in_hours: hoursUntilUTCRollover(),
            message:
              'AFTA certification self-check is limited to 25 calls/day per IP. Re-checks are free; come back after the daily UTC reset.',
          },
          429,
        );
      }
      await safePut(env, env.TENSORFEED_CACHE, certifyRlKey, JSON.stringify({ count: certifyCount + 1 }), {
        expirationTtl: 60 * 60 * 48,
      });
      const { certifyDomain } = await import('./afta-certify');
      const result = await certifyDomain(domain);
      // Don't cache certification checks; publishers may re-run after
      // shipping fixes and need fresh state.
      return jsonResponse(result, result.ok ? 200 : 400, 0);
    }

    // === TRIAL CREDITS FAUCET (free conversion on-ramp) ===
    // POST /api/payment/trial-credits
    // An agent signs an EIP-191 message proving wallet control (no
    // on-chain transaction, no USDC, no gas) and receives a bearer token
    // preloaded with trial credits. One grant per wallet, OFAC-screened
    // (fail-closed), single-use nonce, signed-at window. The zero-setup
    // on-ramp: taste the premium endpoints before funding, then top up the
    // same token via /api/payment/buy-credits. Orchestration in faucet.ts.
    if (path === '/api/payment/trial-credits' && request.method === 'POST') {
      let faucetBody: unknown;
      try {
        faucetBody = await request.json();
      } catch {
        return jsonResponse({ ok: false, error: 'invalid_json' }, 400);
      }
      const faucetIp = getClientIP(request);
      // Bound the sybil-mint rate per IP. The counter increments only on a
      // successful grant, so invalid attempts never consume a legit
      // caller's quota. 10 grants per IP per UTC day.
      const faucetCapKey = `pay:faucet-ip:${new Date().toISOString().slice(0, 10)}:${faucetIp}`;
      const faucetCap = (await env.TENSORFEED_CACHE.get(faucetCapKey, 'json')) as { count: number } | null;
      if ((faucetCap?.count ?? 0) >= 10) {
        return jsonResponse(
          {
            ok: false,
            error: 'faucet_ip_cap',
            message: 'This IP reached the daily trial-credit grant cap. Fund via /api/payment/buy-credits or retry after the UTC day rolls over.',
          },
          429,
        );
      }
      const faucetUa = request.headers.get('User-Agent') || 'unknown';
      const { handleFaucetClaim } = await import('./faucet');
      const faucetOutcome = await handleFaucetClaim(
        env,
        faucetBody as { message?: unknown; signature?: unknown },
        faucetUa,
      );
      if (faucetOutcome.ok && faucetOutcome.status === 'granted') {
        ctx.waitUntil(
          env.TENSORFEED_CACHE.put(
            faucetCapKey,
            JSON.stringify({ count: (faucetCap?.count ?? 0) + 1 }),
            { expirationTtl: 48 * 60 * 60 },
          ),
        );
        return jsonResponse(
          {
            ok: true,
            token: faucetOutcome.token,
            credits: faucetOutcome.credits,
            expires_at: faucetOutcome.expires_at,
            wallet: faucetOutcome.wallet,
            how_to_use: 'Send Authorization: Bearer <token> on any /api/premium/* call until the balance or the expiry runs out. Top up the same token via /api/payment/buy-credits.',
          },
          200,
        );
      }
      const faucetStatus =
        faucetOutcome.status === 'bad_request'
          ? 400
          : faucetOutcome.status === 'already_claimed'
            ? 409
            : faucetOutcome.status === 'rejected'
              ? faucetOutcome.reason === 'signature_invalid'
                ? 401
                : faucetOutcome.reason === 'nonce_replayed'
                  ? 409
                  : 400
              : faucetOutcome.status === 'banned'
                ? 403
                : 503; // retry_later
      return jsonResponse(faucetOutcome, faucetStatus);
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
        // key_id-aware verification (audit #18). A federation receipt signed
        // by a member (e.g. TerminalFeed) carries that member's kid, so we
        // must verify against the member's published JWK, not TensorFeed's.
        // RECEIPT_KEY_ALLOWLIST maps a receipt key_id (the JWK kid) to the
        // well-known URL that publishes the matching public key. An absent
        // key_id falls back to TF's key for v1 backward compatibility; a
        // present-but-unknown key_id is rejected so we never fetch an
        // attacker-named URL.
        const TF_RECEIPT_KEY_URL = 'https://tensorfeed.ai/.well-known/tensorfeed-receipt-key.json';
        // TerminalFeed federation receipt key. kid pinned 2026-05-31 by reading
        // the live well-known (kty OKP, crv Ed25519). If TerminalFeed rotates,
        // refetch the kid from the URL below and update this constant.
        const TERMINALFEED_RECEIPT_KEY_URL = 'https://terminalfeed.io/.well-known/terminalfeed-receipt-key.json';
        const TERMINALFEED_RECEIPT_KID = '512774f98d56bb02';
        const RECEIPT_KEY_ALLOWLIST: Record<string, string> = {
          // TF's own kid, mirrored from public/.well-known/tensorfeed-receipt-key.json.
          'db1f1dc3dbf62c66': TF_RECEIPT_KEY_URL,
          [TERMINALFEED_RECEIPT_KID]: TERMINALFEED_RECEIPT_KEY_URL,
        };
        const receiptKid = typeof r.key_id === 'string' ? r.key_id : null;
        let keyUrl: string;
        if (receiptKid === null) {
          // v1 receipts predate kid rotation; default to TF's key.
          keyUrl = TF_RECEIPT_KEY_URL;
        } else if (receiptKid in RECEIPT_KEY_ALLOWLIST) {
          keyUrl = RECEIPT_KEY_ALLOWLIST[receiptKid];
        } else {
          return jsonResponse({ ok: true, valid: false, error: 'unknown_key_id', key_id: receiptKid }, 200);
        }
        // Fetch the resolved public JWK to verify against. TF's key file is
        // a static asset served by Cloudflare Pages on the same zone;
        // federation members publish theirs on their own zone.
        const keyRes = await fetch(keyUrl, {
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
          // Echo the receipt's own key_id (what the agent asked us to verify
          // against), falling back to the fetched JWK's kid for v1 receipts.
          key_id: receiptKid ?? publicJwk.kid ?? null,
          algorithm: 'EdDSA / Ed25519',
          canonical_form: 'tensorfeed-canonical-json-v1',
        });
      } catch {
        return jsonResponse({ ok: false, error: 'invalid_request_body' }, 400);
      }
    }

    // === PAID PREMIUM ENDPOINT: ROUTING (1 credit per call) ===
    // Top-5 ranked models with full score breakdown, pricing, status, and
    // component detail. Advertised at 1 credit (public/llms.txt + every
    // billing field), so the gate, the debit, and the docs all settle on 1.

    if (path === '/api/premium/routing') {
      const payment = await requirePayment(request, env, 1);
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
        logPremiumUsage(env, '/api/premium/routing', request.headers.get('User-Agent') || 'unknown', 1, payment.token, payment.payerWallet),
      );

      // Route the paid 200 through premiumResponse so the deferred debit
      // actually commits (commitPayment runs there), the billing block and
      // receipt reflect the REAL charged amount, and markResponseCharged is
      // tagged centrally for the Agent Usage Meter. computeRouting always
      // returns ok: true, including an empty-recommendations result when the
      // caller's filters match nothing (that is a valid paid answer, not an
      // upstream failure), so there is no no-charge branch here.
      return await premiumResponse(result, payment, 1, request, env);
    }

    // === ROUTE VERDICT PREVIEW (free, rate-limited) ===
    // Free taste of the signed Route Verdict: the top verdict only, no
    // runners-up and no signed receipt. 10 calls/day per IP. The paid
    // /api/premium/route-verdict adds runners-up, the AFTA-signed receipt
    // (the citeable provenance an agent staples to its own decision), the
    // filter params, and no rate limit.
    if (path === '/api/preview/route-verdict') {
      const ip = request.headers.get('CF-Connecting-IP') || request.headers.get('x-forwarded-for') || 'anonymous';
      const { computeRouteVerdict, checkRouteVerdictPreviewRateLimit, buildPreviewUpgrade } = await import('./premium-route-verdict');
      const limit = await checkRouteVerdictPreviewRateLimit(env, ip, 10);
      if (!limit.allowed) {
        return jsonResponse(
          {
            ok: false,
            error: 'rate_limit_exceeded',
            limit: limit.limit,
            remaining: 0,
            reset_in_hours: hoursUntilUTCRollover(),
            premium_endpoint: '/api/premium/route-verdict',
            message:
              'Free preview limited to 10 calls/day per IP. The paid /api/premium/route-verdict (full runners-up, AFTA-signed receipt, filter params, no rate limit) is the upgrade.',
          },
          429,
        );
      }
      const taskParam = url.searchParams.get('task');
      const modelParam = url.searchParams.get('model');
      const task: RoutingTask | undefined =
        taskParam === 'code' || taskParam === 'reasoning' || taskParam === 'creative' || taskParam === 'general'
          ? taskParam
          : undefined;
      if (!task && !modelParam) {
        return jsonResponse(
          { ok: false, error: 'missing_params', hint: 'provide ?task=code|reasoning|creative|general or ?model=<id-or-name>' },
          400,
        );
      }
      const result = await computeRouteVerdict(env, { task, model: modelParam ?? undefined });
      return jsonResponse(
        {
          ok: true,
          preview: true,
          query: result.query,
          verdict: result.verdict,
          trust: result.trust,
          data_freshness: result.data_freshness,
          claim: result.claim,
          rate_limit: { limit: limit.limit, remaining: limit.remaining, scope: 'per IP per UTC day' },
          upgrade: buildPreviewUpgrade(result),
        },
        200,
        0, // do not Cache-API; rate limiting is per IP
      );
    }

    // === PAID PREMIUM ENDPOINT: ROUTE VERDICT (Tier 1, 1 credit) ===
    // /api/premium/route-verdict
    // One signed routing decision. Fuses model pricing, benchmark
    // capability discounted for contamination and saturation, real
    // production usage, MEASURED p95 latency from the active probes, live
    // incident-triage operational state, and model deprecation flags into
    // a single verdict plus runners-up, with an AFTA-signed receipt over
    // the inputs. The decision layer above the free
    // /api/preview/route-verdict taste. Param-required (?task= or
    // ?model=), so strict-premium. 30-minute freshness SLA keyed to the
    // operational signal: a stale live layer triggers a no-charge.
    if (path === '/api/premium/route-verdict') {
      return handlePremium(request, env, ctx, { tier: 1, endpoint: '/api/premium/route-verdict' }, async () => {
        const taskParam = url.searchParams.get('task');
        const modelParam = url.searchParams.get('model');
        const task: RoutingTask | undefined =
          taskParam === 'code' || taskParam === 'reasoning' || taskParam === 'creative' || taskParam === 'general'
            ? taskParam
            : undefined;
        if (!task && !modelParam) {
          return { kind: 'validation_failure', error: { error: 'missing_params', hint: 'provide ?task=code|reasoning|creative|general or ?model=<id-or-name>' } };
        }
        const maxLatRaw = parseInt(url.searchParams.get('max_latency_p95_ms') ?? '', 10);
        const budgetRaw = parseFloat(url.searchParams.get('budget') ?? '');
        const minQualityRaw = parseFloat(url.searchParams.get('min_quality') ?? '');
        const { computeRouteVerdict } = await import('./premium-route-verdict');
        const result = await computeRouteVerdict(env, {
          task,
          model: modelParam ?? undefined,
          maxLatencyP95Ms: Number.isFinite(maxLatRaw) ? maxLatRaw : undefined,
          requireOperational: url.searchParams.get('require_operational') !== 'false',
          excludeDeprecated: url.searchParams.get('exclude_deprecated') !== 'false',
          budget: Number.isFinite(budgetRaw) && budgetRaw > 0 ? budgetRaw : undefined,
          minQuality: Number.isFinite(minQualityRaw) && minQualityRaw > 0 ? minQualityRaw : undefined,
        });
        return { kind: 'ok', body: result, dataCapturedAt: null };
      }, PREMIUM_DEPS);
    }

    // === PAID PREMIUM ENDPOINT: MODEL INTELLIGENCE BREAKDOWN (Tier 1, 1 credit) ===
    // /api/premium/model-intelligence
    // The full per-model TFII breakdown over the latest daily snapshot:
    // headline score, per-task subscores, and the trust block (contamination
    // tier, benchmarks used, coverage, flagged). Optional ?model= narrows to a
    // single model. Param-capable, so strict-premium gates anonymous crawlers
    // to a clean 402. capturedAt = snap.as_of drives the 48h stale no-charge.
    if (path === '/api/premium/model-intelligence') {
      const payment = await requirePayment(request, env, 1);
      if (!payment.paid) return payment.response!;
      const snap = (await env.TENSORFEED_CACHE.get('intelligence:snapshot:latest', 'json')) as
        | import('./model-intelligence').IntelligenceSnapshot
        | null;
      if (!snap) {
        return await premiumResponse(
          { ok: false, error: 'index_not_yet_populated' },
          payment,
          1,
          request,
          env,
          'empty_result',
        );
      }
      const { normalizeId } = await import('./model-intelligence');
      const modelParam = url.searchParams.get('model')?.trim();
      let result: Record<string, unknown>;
      if (modelParam) {
        const target = normalizeId(modelParam);
        const found = snap.models.find(
          m => m.model_id === target || m.name.toLowerCase().trim() === modelParam.toLowerCase().trim(),
        );
        if (!found) {
          return await premiumValidationFailure(
            { ok: false, error: 'model_not_found', hint: 'See /api/intelligence for valid model names.' },
            payment,
            request,
            env,
          );
        }
        result = { ok: true, capturedAt: snap.as_of, methodology_version: snap.methodology_version, model: found };
      } else {
        result = {
          ok: true,
          capturedAt: snap.as_of,
          methodology_version: snap.methodology_version,
          count: snap.models.length,
          models: snap.models,
        };
      }
      ctx.waitUntil(
        logPremiumUsage(env, '/api/premium/model-intelligence', request.headers.get('User-Agent') || 'unknown', 1, payment.token, payment.payerWallet),
      );
      return await premiumResponse(result, payment, 1, request, env);
    }

    // === PAID PREMIUM: MODEL PRICE-PERFORMANCE FRONTIER (Tier 1, 1 credit) ===
    // /api/premium/models/frontier?task=code|reasoning|creative|general
    // The Pareto-optimal set of models on a capability (TFII subscore) versus
    // blended-price plane, with every dominated model flagged plus the model
    // that dominates it. A dominated model is never the rational pick. Optional
    // ?task= (default general). Strict-premium (Bazaar-piloted, so anonymous
    // crawlers see a clean 402). Free siblings: /api/models and /api/intelligence.
    if (path === '/api/premium/models/frontier') {
      const payment = await requirePayment(request, env, 1);
      if (!payment.paid) return payment.response!;

      const snap = (await env.TENSORFEED_CACHE.get('intelligence:snapshot:latest', 'json')) as
        | import('./model-intelligence').IntelligenceSnapshot
        | null;
      const pricing = (await env.TENSORFEED_CACHE.get('models', 'json')) as
        | import('./premium-models-frontier').PricingDataLite
        | null;
      if (!snap || !pricing) {
        return await premiumValidationFailure(
          {
            ok: false,
            error: 'snapshot_not_ready',
            hint: 'The intelligence snapshot or pricing catalog has not populated yet. Retry after the next daily refresh.',
          },
          payment,
          request,
          env,
          'upstream_failure',
        );
      }

      const { buildModelFrontier, parseTask } = await import('./premium-models-frontier');
      const result = buildModelFrontier(snap, pricing, parseTask(url.searchParams.get('task')));

      if (!result.ok) {
        // insufficient_data: fewer than two overlapping priced and scored models.
        return await premiumValidationFailure({ ...result }, payment, request, env, 'empty_result', 404);
      }

      ctx.waitUntil(
        logPremiumUsage(env, '/api/premium/models/frontier', request.headers.get('User-Agent') || 'unknown', 1, payment.token, payment.payerWallet),
      );
      return await premiumResponse(result, payment, 1, request, env, null, result.as_of);
    }

    // === PAID PREMIUM: STACK DRIFT VERDICT (Tier 1, 1 credit, param-required) ===
    // /api/premium/stack-drift-verdict?models=a,b&packages=x,y&protocols=mcp&since_days=14
    // What moved under a caller's declared stack in the last N days that could
    // break them: a deprecated or sunsetting model, a breaking package major
    // bump, an agent-protocol spec-version bump, classified by break-risk into a
    // STABLE / WATCH / ACTION_NEEDED verdict. Fuses the substrate changelog, the
    // deprecation registry, and the release snapshot. Param-required, so strict-
    // premium. Coverage honesty: unrecognized items are reported under unmatched,
    // and an all-unrecognized stack is no-charge. Free sibling is the raw
    // /api/substrate-changelog feed.
    if (path === '/api/premium/stack-drift-verdict') {
      const payment = await requirePayment(request, env, 1);
      if (!payment.paid) return payment.response!;

      const { parseList, parseSinceDays, buildStackDriftVerdict, normalizeKey } = await import('./premium-stack-drift-verdict');
      const models = parseList(url.searchParams.get('models'));
      const packages = parseList(url.searchParams.get('packages'));
      const protocols = parseList(url.searchParams.get('protocols'));
      if (models.length === 0 && packages.length === 0 && protocols.length === 0) {
        return await premiumValidationFailure(
          {
            ok: false,
            error: 'missing_params',
            hint: 'Declare your stack: at least one of models=a,b, packages=x,y, or protocols=mcp,a2a. Optional since_days=N (default 14, max 365).',
          },
          payment,
          request,
          env,
        );
      }
      const since_days = parseSinceDays(url.searchParams.get('since_days'));
      const now = new Date();
      const to = now.toISOString().slice(0, 10);
      const from = new Date(now.getTime() - since_days * 86400000).toISOString().slice(0, 10);

      const [{ getChangelogHistory }, deprModule, { getPackageReleasesSnapshot }] = await Promise.all([
        import('./substrate-changelog/query'),
        import('./premium-model-deprecations'),
        import('./ai-package-releases-fetcher'),
      ]);
      const [changelogResult, releases, pricingRaw] = await Promise.all([
        getChangelogHistory(env, from, to),
        getPackageReleasesSnapshot(env),
        env.TENSORFEED_CACHE.get('models', 'json'),
      ]);
      const pricing = pricingRaw as { providers?: Array<{ models?: Array<{ id: string; name: string }> }> } | null;
      const deprecations = deprModule.buildTimeline({ within_days: null, provider: null }, now).entries;

      const knownModelKeys = new Set<string>();
      for (const provider of pricing?.providers ?? []) {
        for (const m of provider.models ?? []) {
          knownModelKeys.add(normalizeKey(m.id));
          knownModelKeys.add(normalizeKey(m.name));
        }
      }

      const result = buildStackDriftVerdict(
        { models, packages, protocols, since_days, from, to },
        { changelog: changelogResult.events, deprecations, releases, knownModelKeys },
        now,
      );

      if (!result.ok) {
        // no_recognized_stack: nothing the caller listed is tracked by TF.
        // AFTA empty_result no-charge, with the unmatched items returned.
        return await premiumValidationFailure({ ...result }, payment, request, env, 'empty_result', 404);
      }

      ctx.waitUntil(
        logPremiumUsage(env, '/api/premium/stack-drift-verdict', request.headers.get('User-Agent') || 'unknown', 1, payment.token, payment.payerWallet),
      );
      return await premiumResponse(result, payment, 1, request, env);
    }

    // === PAID PREMIUM: MODEL MIGRATION VERDICT (Tier 1, 1 credit, param-required) ===
    // /api/premium/model-migration-verdict?model=&deadline=
    // For one depended-on model: MIGRATE_NOW / MIGRATE_SOON / NO_ACTION plus the
    // recommended successor with cost delta, capability (TFII) delta, days until
    // sunset, and a drop-in note. Fuses the deprecation registry, pricing, and
    // the intelligence snapshot. Param-required (?model=), so strict-premium.
    // Optional ?deadline=YYYY-MM-DD reconciles against the sunset date. Free
    // sibling is the raw /api/model-deprecations feed.
    if (path === '/api/premium/model-migration-verdict') {
      const payment = await requirePayment(request, env, 1);
      if (!payment.paid) return payment.response!;

      const model = url.searchParams.get('model')?.trim() || null;
      if (!model) {
        return await premiumValidationFailure(
          {
            ok: false,
            error: 'missing_params',
            hint: 'Pass model=<id> (e.g. claude-3-opus). Optional deadline=YYYY-MM-DD reconciles against the sunset date.',
          },
          payment,
          request,
          env,
        );
      }
      const deadline = url.searchParams.get('deadline')?.trim() || null;

      const [deprModule, { buildMigrationVerdict }] = await Promise.all([
        import('./premium-model-deprecations'),
        import('./premium-model-migration-verdict'),
      ]);
      const [pricingRaw, intelligenceRaw] = await Promise.all([
        env.TENSORFEED_CACHE.get('models', 'json'),
        env.TENSORFEED_CACHE.get('intelligence:snapshot:latest', 'json'),
      ]);
      const pricing = (pricingRaw as import('./premium-models-frontier').PricingDataLite | null) ?? { providers: [] };
      const intelligence = intelligenceRaw as import('./model-intelligence').IntelligenceSnapshot | null;
      const deprecations = deprModule.buildTimeline({ within_days: null, provider: null }, new Date()).entries;

      const result = buildMigrationVerdict(model, deadline, { deprecations, pricing, intelligence }, new Date());

      if (!result.ok) {
        // model_not_recognized: the model is in no TF source. AFTA empty_result.
        return await premiumValidationFailure({ ...result }, payment, request, env, 'empty_result', 404);
      }

      ctx.waitUntil(
        logPremiumUsage(env, '/api/premium/model-migration-verdict', request.headers.get('User-Agent') || 'unknown', 1, payment.token, payment.payerWallet),
      );
      return await premiumResponse(result, payment, 1, request, env);
    }

    // === PAID PREMIUM ENDPOINT: MODEL INTELLIGENCE HISTORY (Tier 2, 2 credits) ===
    // /api/premium/model-intelligence/history
    // A single model's TFII time-series across the dated snapshots within the
    // requested window. Param-required (?model=), optional ?from=&to=. Immutable
    // past data, so no freshness SLA; an empty range no-charges. Strict-premium
    // gates anonymous crawlers to a clean 402.
    if (path === '/api/premium/model-intelligence/history') {
      const payment = await requirePayment(request, env, 2);
      if (!payment.paid) return payment.response!;
      const model = url.searchParams.get('model')?.trim();
      if (!model) {
        return await premiumValidationFailure(
          { ok: false, error: 'model_required', hint: 'Pass ?model=<id-or-name>' },
          payment,
          request,
          env,
        );
      }
      const { resolveDateRange, buildIntelligenceHistory } = await import('./model-intelligence');
      const range = resolveDateRange(url.searchParams.get('from'), url.searchParams.get('to'));
      if (!range.ok) {
        return await premiumValidationFailure({ ok: false, error: range.error }, payment, request, env);
      }
      const series = await buildIntelligenceHistory(env, model, range.from, range.to);
      if (series.points.length === 0) {
        return await premiumResponse(series, payment, 2, request, env, 'empty_result');
      }
      ctx.waitUntil(
        logPremiumUsage(env, '/api/premium/model-intelligence/history', request.headers.get('User-Agent') || 'unknown', 2, payment.token, payment.payerWallet),
      );
      return await premiumResponse(series, payment, 2, request, env);
    }

    // Free taste of the Provider Reliability Verdict: the most-dependable
    // and riskiest picks only, no full ranking and no signed receipt. 10
    // calls/day per IP. The paid /api/premium/provider-reliability-verdict
    // adds the full per-provider ranking and the AFTA-signed receipt.
    if (path === '/api/preview/provider-reliability-verdict') {
      const ip = request.headers.get('CF-Connecting-IP') || request.headers.get('x-forwarded-for') || 'anonymous';
      const { computeReliabilityVerdict, checkReliabilityVerdictPreviewRateLimit } = await import('./premium-provider-reliability-verdict');
      const limit = await checkReliabilityVerdictPreviewRateLimit(env, ip, 10);
      if (!limit.allowed) {
        return jsonResponse(
          {
            ok: false,
            error: 'rate_limit_exceeded',
            limit: limit.limit,
            remaining: 0,
            reset_in_hours: hoursUntilUTCRollover(),
            premium_endpoint: '/api/premium/provider-reliability-verdict',
            message:
              'Free preview limited to 10 calls/day per IP. The paid /api/premium/provider-reliability-verdict (full per-provider ranking, AFTA-signed receipt, no rate limit) is the upgrade.',
          },
          429,
        );
      }
      const result = await computeReliabilityVerdict(env);
      return jsonResponse(
        {
          ok: true,
          preview: true,
          verdict: result.verdict,
          coverage: result.coverage,
          captured_at: result.capturedAt,
          claim: result.claim,
          rate_limit: { limit: limit.limit, remaining: limit.remaining, scope: 'per IP per UTC day' },
          upgrade: {
            premium_endpoint: '/api/premium/provider-reliability-verdict',
            adds: ['full per-provider ranking', 'AFTA-signed receipt', 'no rate limit'],
          },
        },
        200,
        0, // do not Cache-API; rate limiting is per IP
      );
    }

    // === PAID PREMIUM ENDPOINT: PROVIDER RELIABILITY VERDICT (Tier 1, 1 credit) ===
    // /api/premium/provider-reliability-verdict
    // One signed dependability ruling over TensorFeed's OWN measured probes:
    // ranks the probed frontier providers by availability and tail
    // consistency (p50 over p95), names the most dependable and the riskiest,
    // and ships the full per-provider ranking with an AFTA-signed receipt. The
    // decision layer above the raw /api/probe/latest aggregates and the free
    // /api/preview/provider-reliability-verdict taste. No params (ranks all
    // probed providers); strict-premium so anonymous Bazaar crawlers see a
    // clean 402. 30-minute freshness SLA keyed to the probe computed_at: a
    // stale probe layer triggers a no-charge.
    if (path === '/api/premium/provider-reliability-verdict') {
      const payment = await requirePayment(request, env, 1);
      if (!payment.paid) return payment.response!;
      const { computeReliabilityVerdict } = await import('./premium-provider-reliability-verdict');
      const result = await computeReliabilityVerdict(env);
      // AFTA empty_result no-charge: a cold or empty probe layer yields a null
      // verdict over zero ranked providers (most_dependable/riskiest null). Same
      // payload, signed receipt records the no-charge. Mirrors the
      // concentration-verdict sibling, which already guards this cold state.
      if (result.ranking.length === 0) {
        return await premiumResponse(result, payment, 1, request, env, 'empty_result');
      }
      ctx.waitUntil(
        logPremiumUsage(env, '/api/premium/provider-reliability-verdict', request.headers.get('User-Agent') || 'unknown', 1, payment.token, payment.payerWallet),
      );
      return await premiumResponse(result, payment, 1, request, env);
    }

    // === PAID PREMIUM: DEPENDENCY CONCENTRATION VERDICT (Tier 1, 1 credit, param-required) ===
    // /api/premium/resilience/concentration-verdict?providers=openai,anthropic,google
    // RESILIENT/EXPOSED/CRITICAL ruling on a caller's AI-provider dependency
    // set: single-point-of-failure exposure, which listed providers are impaired
    // right now, and the most dependable provider to add for diversification.
    // Fuses the measured reliability ranking with the live status feed.
    // Param-required (?providers=), so strict-premium gates anonymous crawlers
    // to a clean 402. Coverage honesty: if no listed provider is tracked, the
    // call is no-charge and returns the tracked vocabulary. Free sibling is the
    // raw probe feed at /api/probe/latest.
    if (path === '/api/premium/resilience/concentration-verdict') {
      const payment = await requirePayment(request, env, 1);
      if (!payment.paid) return payment.response!;

      const { parseProviders, buildConcentrationVerdict } = await import('./premium-concentration-verdict');
      const providers = parseProviders(url.searchParams.get('providers'));
      if (providers.length === 0) {
        return await premiumValidationFailure(
          {
            ok: false,
            error: 'missing_params',
            hint: 'Pass providers=a,b,c (comma-separated AI providers you depend on, e.g. openai,anthropic,google). Aliases like claude, gpt, gemini, bedrock, azure are accepted.',
          },
          payment,
          request,
          env,
        );
      }

      const { computeReliabilityVerdict } = await import('./premium-provider-reliability-verdict');
      const reliability = await computeReliabilityVerdict(env);
      const statusServices =
        ((await cachedKVGet(request, env.TENSORFEED_STATUS, 'services', 120, ctx, env)) as import('./types').ServiceStatus[] | null) || [];

      // No operational signal at all (cold start before first cron): no-charge.
      if (reliability.ranking.length === 0 && statusServices.length === 0) {
        return await premiumValidationFailure(
          {
            ok: false,
            error: 'snapshot_not_ready',
            hint: 'The reliability probe and status feeds populate after the first cron ticks. Retry shortly.',
          },
          payment,
          request,
          env,
          'upstream_failure',
        );
      }

      const result = buildConcentrationVerdict(reliability, statusServices, providers, new Date());

      if (!result.ok) {
        // no_recognized_providers: a valid query where none of the listed
        // providers are tracked. AFTA empty_result no-charge, with the tracked
        // vocabulary returned so the caller can self-correct.
        return await premiumValidationFailure({ ...result }, payment, request, env, 'empty_result', 404);
      }

      // The premium value here is the FUSION of measured reliability with live
      // status. With no reliability backbone (cold or empty probe layer, ranking
      // empty), the verdict degrades to a status-only restatement, so serve the
      // usable answer but do not charge for the missing measured half, and skip
      // usage logging. Same no-charge family as the 30-minute stale-probe SLA.
      if (reliability.ranking.length === 0) {
        return await premiumResponse(result, payment, 1, request, env, 'stale_data', result.captured_at);
      }

      ctx.waitUntil(
        logPremiumUsage(env, '/api/premium/resilience/concentration-verdict', request.headers.get('User-Agent') || 'unknown', 1, payment.token, payment.payerWallet),
      );
      return await premiumResponse(result, payment, 1, request, env, null, result.captured_at);
    }

    // Free taste of the x402 Settlement Verdict: the three classifications
    // (momentum, concentration, leading publisher) only, no full publisher
    // ranking and no signed receipt. 10 calls/day per IP. The paid
    // /api/premium/x402-settlement-verdict adds the full ranking, the ecosystem
    // totals and HHI, and the AFTA-signed receipt.
    if (path === '/api/preview/x402-settlement-verdict') {
      const ip = request.headers.get('CF-Connecting-IP') || request.headers.get('x-forwarded-for') || 'anonymous';
      const { computeX402SettlementVerdict, checkX402SettlementVerdictPreviewRateLimit } = await import('./premium-x402-settlement-verdict');
      const limit = await checkX402SettlementVerdictPreviewRateLimit(env, ip, 10);
      if (!limit.allowed) {
        return jsonResponse(
          {
            ok: false,
            error: 'rate_limit_exceeded',
            limit: limit.limit,
            remaining: 0,
            reset_in_hours: hoursUntilUTCRollover(),
            premium_endpoint: '/api/premium/x402-settlement-verdict',
            message:
              'Free preview limited to 10 calls/day per IP. The paid /api/premium/x402-settlement-verdict (full publisher ranking, ecosystem totals and HHI, AFTA-signed receipt, no rate limit) is the upgrade.',
          },
          429,
        );
      }
      const result = await computeX402SettlementVerdict(env, '7d');
      return jsonResponse(
        {
          ok: true,
          preview: true,
          verdict: result.verdict,
          window_label: result.window_label,
          captured_at: result.capturedAt,
          claim: result.claim,
          rate_limit: { limit: limit.limit, remaining: limit.remaining, scope: 'per IP per UTC day' },
          upgrade: {
            premium_endpoint: '/api/premium/x402-settlement-verdict',
            adds: [
              'full per-publisher ranking with volume share',
              'ecosystem totals, change percentages, and the Herfindahl index',
              'AFTA-signed receipt',
              'no rate limit',
              'optional window (24h, 7d, 30d)',
            ],
          },
        },
        200,
        0, // do not Cache-API; rate limiting is per IP
      );
    }

    // Free taste of the single-publisher x402 Trust Verdict: the verdict and
    // claim for one publisher domain only, no momentum, no shared-wallet flag,
    // and no settlement evidence. 10 calls/day per IP. The paid
    // /api/premium/x402-publisher-verdict adds the 30-day settlement momentum,
    // the shared-wallet risk flag, the settlement evidence, and the AFTA-signed
    // receipt.
    if (path === '/api/preview/x402-publisher-verdict') {
      const domain = url.searchParams.get('domain');
      if (!domain) {
        return jsonResponse(
          {
            ok: false,
            error: 'missing_params',
            required: ['domain'],
            hint: 'domain=<publisher domain>, e.g. domain=x402.tavily.com',
          },
          400,
        );
      }
      const ip = request.headers.get('CF-Connecting-IP') || request.headers.get('x-forwarded-for') || 'anonymous';
      const { computeX402PublisherVerdict, redactX402PublisherVerdictForPreview, checkX402PublisherVerdictPreviewRateLimit } = await import('./premium-x402-publisher-verdict');
      const limit = await checkX402PublisherVerdictPreviewRateLimit(env, ip, 10);
      if (!limit.allowed) {
        return jsonResponse(
          {
            ok: false,
            error: 'rate_limit_exceeded',
            limit: limit.limit,
            remaining: 0,
            reset_in_hours: hoursUntilUTCRollover(),
            premium_endpoint: '/api/premium/x402-publisher-verdict',
            message:
              'Free preview limited to 10 calls/day per IP. The paid /api/premium/x402-publisher-verdict (full verdict with 30-day settlement momentum, shared-wallet risk flag, settlement evidence, AFTA-signed receipt, no rate limit) is the upgrade.',
          },
          429,
        );
      }
      const full = await computeX402PublisherVerdict(env, domain);
      return jsonResponse(
        {
          ...redactX402PublisherVerdictForPreview(full),
          rate_limit: { limit: limit.limit, remaining: limit.remaining, scope: 'per IP per UTC day' },
          upgrade: {
            premium_endpoint: '/api/premium/x402-publisher-verdict',
            adds: [
              'full verdict with 30-day settlement momentum',
              'shared-wallet risk flag and the settlement evidence',
              'AFTA-signed receipt',
              'no rate limit',
            ],
          },
        },
        200,
        0, // do not Cache-API; rate limiting is per IP
      );
    }

    // === PAID PREMIUM ENDPOINT: X402 SETTLEMENT VERDICT (Tier 1, 1 credit) ===
    // /api/premium/x402-settlement-verdict?window=24h|7d|30d (default 7d)
    // One signed ruling over TensorFeed's OWN x402 settlement index: classifies
    // the Base x402 USDC market momentum (versus the prior window of equal
    // length), concentration (Herfindahl index over publisher volume share), and
    // names the leading publisher, plus the full per-publisher ranking and an
    // AFTA-signed receipt. The decision layer above the raw /api/x402-index/summary
    // and /api/x402-index/leaderboard, and the free /api/preview/x402-settlement-verdict
    // taste. Reads optional ?window=, so strict-premium: anonymous Bazaar crawlers
    // see a clean 402, not a free trial. 10-minute freshness SLA keyed to the
    // index cursor last_run_at: a stale index (a real indexer outage) triggers a
    // no-charge.
    if (path === '/api/premium/x402-settlement-verdict') {
      const payment = await requirePayment(request, env, 1);
      if (!payment.paid) return payment.response!;
      const windowParam = url.searchParams.get('window');
      const window: '24h' | '7d' | '30d' =
        windowParam === '24h' || windowParam === '30d' ? windowParam : '7d';
      const { computeX402SettlementVerdict } = await import('./premium-x402-settlement-verdict');
      const result = await computeX402SettlementVerdict(env, window);

      // Delta cursor loop: gate on the NEWEST SETTLEMENT timestamp so an agent
      // polling a quiet market re-checks for free until a real settlement lands.
      // This is intentionally NOT the index captured_at (which ticks every 5 min)
      // and NOT the windowed count (which drifts as the trailing window slides).
      // The no-charge body carries the headline verdict only (what the free
      // preview gives), never the paid ranking / ecosystem / hhi.
      const { getRecent } = await import('./x402-index/query');
      const recent = await getRecent(env, 1);
      const settlementCap = recent.events[0]?.ts ?? null;
      const sinceRaw = url.searchParams.get('since');
      const cursor = sinceRaw ? decodeDeltaCursor(sinceRaw, DELTA_CURSOR_VERSION) : null;
      const outcome = cursor
        ? gateDeltaCursor({ resultCap: settlementCap, cursorCap: cursor.cap, resultKey: window, cursorKey: cursor.key })
        : 'full';
      const freshCursor = encodeDeltaCursor(DELTA_CURSOR_VERSION, settlementCap, window);
      const continuation = buildDeltaContinuation(
        'GET',
        `/api/premium/x402-settlement-verdict?window=${window}`,
        freshCursor,
        'Call again with this cursor; free unless a new settlement has landed since this response.',
      );

      if (outcome === 'no_charge') {
        const body = {
          ok: true,
          changed: false,
          window_label: result.window_label,
          verdict: result.verdict,
          captured_at: result.capturedAt,
          newest_settlement_at: settlementCap,
          cursor: freshCursor,
          continuation,
          next_check_hint: X402_SETTLEMENT_NEXT_CHECK_HINT,
        };
        return await premiumResponse(body, payment, 1, request, env, 'no_new_since_cursor', result.capturedAt);
      }

      ctx.waitUntil(
        logPremiumUsage(env, '/api/premium/x402-settlement-verdict', request.headers.get('User-Agent') || 'unknown', 1, payment.token, payment.payerWallet),
      );
      const body = { ...result, cursor: freshCursor, continuation };
      return await premiumResponse(body, payment, 1, request, env, null, result.capturedAt);
    }

    // === PAID PREMIUM ENDPOINT: X402 PUBLISHER TRUST VERDICT (Tier 1, 1 credit) ===
    // /api/premium/x402-publisher-verdict?domain=<publisher domain>
    // One signed ruling on a single x402 publisher derived from TensorFeed's OWN
    // on-chain settlement index: whether its Base payTo is actively settling, its
    // 30-day settlement momentum, a shared-wallet risk flag, and the settlement
    // evidence, plus an AFTA-signed receipt. The decision layer above the raw
    // /api/x402-index/* feeds and the free /api/preview/x402-publisher-verdict
    // taste. Requires ?domain=, so strict-premium: anonymous Bazaar crawlers see
    // a clean 402, not a free trial. A missing domain is a no-charge schema
    // validation failure. 10-minute freshness SLA keyed to the index cursor.
    if (path === '/api/premium/x402-publisher-verdict') {
      return handlePremium(request, env, ctx, { tier: 1, endpoint: '/api/premium/x402-publisher-verdict' }, async () => {
        const domain = url.searchParams.get('domain');
        if (!domain) {
          return { kind: 'validation_failure', error: { error: 'missing_params', required: ['domain'], hint: 'domain=<publisher domain>, e.g. domain=x402.tavily.com' } };
        }
        const { computeX402PublisherVerdict } = await import('./premium-x402-publisher-verdict');
        const result = await computeX402PublisherVerdict(env, domain);
        if (result.verdict === 'not_indexed') {
          // No-charge: the domain is not in TF's x402 registry, so there is no
          // settlement signal to sell. The agent still gets the signed not_indexed
          // ruling, billed at zero (empty-result rule).
          return { kind: 'no_charge', body: result, reason: 'empty_result', dataCapturedAt: null };
        }
        // captured_at rides the body; premiumResponse reads it for the 10-min SLA.
        return { kind: 'ok', body: result, dataCapturedAt: null };
      }, PREMIUM_DEPS);
    }

    // Free taste of the Counterparty Trust Verdict: the overall verdict and the
    // natural-language claim for one settlement address only, with every
    // evidence leg (sanctions detail, on-chain presence, TF footprint, TF
    // reputation, the ERC-8004 leg) stripped. 10 calls/day per IP. The paid
    // /api/premium/counterparty/trust-verdict adds all of it plus a signed receipt.
    if (path === '/api/preview/counterparty/trust-verdict') {
      const { computeCounterpartyTrustVerdict, redactCounterpartyTrustVerdictForPreview, checkCounterpartyTrustVerdictPreviewRateLimit, normalizeEvmAddress } = await import('./premium-counterparty-trust-verdict');
      const rawAddr = url.searchParams.get('address');
      const ctvAddress = rawAddr ? normalizeEvmAddress(rawAddr) : null;
      if (!ctvAddress) {
        return jsonResponse(
          { ok: false, error: 'missing_params', required: ['address'], hint: 'address=<0x EVM settlement address>, optional agent_id=<ERC-8004 agentId>' },
          400,
        );
      }
      const ctvIp = getClientIP(request);
      const ctvLimit = await checkCounterpartyTrustVerdictPreviewRateLimit(env, ctvIp, 10);
      if (!ctvLimit.allowed) {
        return jsonResponse(
          {
            ok: false,
            error: 'rate_limit_exceeded',
            limit: ctvLimit.limit,
            remaining: 0,
            reset_in_hours: hoursUntilUTCRollover(),
            premium_endpoint: '/api/premium/counterparty/trust-verdict',
            message:
              'Free preview limited to 10 calls/day per IP. The paid /api/premium/counterparty/trust-verdict (full verdict with sanctions screening, on-chain presence, TF settlement footprint, TF reputation, the ERC-8004 registry leg, and a signed receipt, no rate limit) is the upgrade.',
          },
          429,
        );
      }
      const ctvFull = await computeCounterpartyTrustVerdict(env, ctvAddress, { agentId: url.searchParams.get('agent_id') });
      return jsonResponse(
        {
          ...redactCounterpartyTrustVerdictForPreview(ctvFull),
          rate_limit: { limit: ctvLimit.limit, remaining: ctvLimit.remaining, scope: 'per IP per UTC day' },
          upgrade: {
            premium_endpoint: '/api/premium/counterparty/trust-verdict',
            adds: [
              'sanctions screening status and on-chain presence evidence',
              'TF settlement footprint and agent reputation',
              'the ERC-8004 registry leg (registration, agentId, raw feedback count)',
              'a signed receipt and no rate limit',
            ],
          },
        },
        200,
        0, // do not Cache-API; rate limiting is per IP
      );
    }

    // === PAID PREMIUM ENDPOINT: COUNTERPARTY TRUST VERDICT (Tier 1, 1 credit) ===
    // /api/premium/counterparty/trust-verdict?address=<0x address>[&agent_id=<ERC-8004 id>]
    // One signed ruling on a counterparty settlement address for agent-to-agent
    // commerce: a 3-state sanctions screen, live Base on-chain presence, TF's
    // x402 settlement footprint, TF agent reputation, and a Sybil-safe ERC-8004
    // registry leg, fused into a deterministic verdict with a signed receipt.
    // Requires ?address=, so strict-premium: anonymous Bazaar crawlers see a
    // clean 402, not a free trial. A missing or invalid address is a no-charge
    // schema validation failure; a sanctions-screen outage is a no-charge
    // upstream failure (TF will not bill for a verdict it could not screen).
    if (path === '/api/premium/counterparty/trust-verdict') {
      return handlePremium(request, env, ctx, { tier: 1, endpoint: '/api/premium/counterparty/trust-verdict' }, async () => {
        const { computeCounterpartyTrustVerdict, normalizeEvmAddress } = await import('./premium-counterparty-trust-verdict');
        const rawAddr = url.searchParams.get('address');
        const ctvAddress = rawAddr ? normalizeEvmAddress(rawAddr) : null;
        if (!ctvAddress) {
          return { kind: 'validation_failure', error: { error: 'missing_params', required: ['address'], hint: 'address=<0x EVM settlement address>, optional agent_id=<ERC-8004 agentId>' } };
        }
        const result = await computeCounterpartyTrustVerdict(env, ctvAddress, { agentId: url.searchParams.get('agent_id') });
        if (result.verdict === 'screening_unavailable') {
          // No-charge: sanctions screening was unavailable, so TF cannot stand
          // behind a trust verdict. The agent still gets the signed result, billed at zero.
          return { kind: 'no_charge', body: result, reason: 'upstream_failure', dataCapturedAt: result.capturedAt };
        }
        return { kind: 'ok', body: result, dataCapturedAt: result.capturedAt };
      }, PREMIUM_DEPS);
    }

    // Free taste of the Restricted-Party Compliance Screen: the overall verdict,
    // the natural-language claim, and the match count for one counterparty name,
    // with the matched-list detail and citations stripped. 10 calls/day per IP.
    // The paid /api/premium/compliance/restricted-party adds the full match rows
    // (lists, programs, citations) plus a signed receipt.
    if (path === '/api/preview/compliance/restricted-party') {
      const { computeRestrictedPartyVerdict, redactRestrictedPartyVerdictForPreview, checkRestrictedPartyVerdictPreviewRateLimit, normalizePartyName } = await import('./premium-restricted-party-verdict');
      const rawName = url.searchParams.get('name');
      const rpName = rawName ? normalizePartyName(rawName) : null;
      if (!rpName) {
        return jsonResponse(
          { ok: false, error: 'missing_params', required: ['name'], hint: 'name=<counterparty legal name or alias, 2 to 200 chars>, optional sources=<CSL codes e.g. SDN,EL> and country=<ISO-2>' },
          400,
        );
      }
      const rpIp = getClientIP(request);
      const rpLimit = await checkRestrictedPartyVerdictPreviewRateLimit(env, rpIp, 10);
      if (!rpLimit.allowed) {
        return jsonResponse(
          {
            ok: false,
            error: 'rate_limit_exceeded',
            limit: rpLimit.limit,
            remaining: 0,
            reset_in_hours: hoursUntilUTCRollover(),
            premium_endpoint: '/api/premium/compliance/restricted-party',
            message:
              'Free preview limited to 10 calls/day per IP. The paid /api/premium/compliance/restricted-party (full match rows with source lists, programs, and citations, plus a signed receipt and no rate limit) is the upgrade.',
          },
          429,
        );
      }
      const rpFull = await computeRestrictedPartyVerdict(env, rpName, {
        sources: url.searchParams.get('sources') ?? undefined,
        country: url.searchParams.get('country') ?? undefined,
      });
      return jsonResponse(
        {
          ...redactRestrictedPartyVerdictForPreview(rpFull),
          rate_limit: { limit: rpLimit.limit, remaining: rpLimit.remaining, scope: 'per IP per UTC day' },
          upgrade: {
            premium_endpoint: '/api/premium/compliance/restricted-party',
            adds: [
              'the full matched entries (name, aliases, type, source list, programs)',
              'official source citations (source_list_url, source_information_url)',
              'a signed receipt and no rate limit',
            ],
          },
        },
        200,
        0, // do not Cache-API; rate limiting is per IP
      );
    }

    // === PAID PREMIUM ENDPOINT: RESTRICTED-PARTY COMPLIANCE SCREEN (Tier 1, 1 credit) ===
    // /api/premium/compliance/restricted-party?name=<counterparty name>[&sources=&country=]
    // One signed restricted-party screen for agent-to-agent commerce: the supplied
    // counterparty name is screened against the US Consolidated Screening List
    // (trade.gov: OFAC SDN/SSI/CAPTA, BIS Entity/Denied/Unverified/MEU, State
    // ISN/AECA) and the matched entries are returned with citations and a signed
    // receipt. Requires ?name=, so strict-premium: anonymous Bazaar crawlers see a
    // clean 402, not a free trial. A missing or invalid name is a no-charge schema
    // validation failure; a screening outage (no key or upstream error) is a
    // no-charge upstream failure (TF will not bill for a screen it could not run).
    // A match is a screening signal requiring human verification, NOT a legal
    // determination and NOT legal advice.
    if (path === '/api/premium/compliance/restricted-party') {
      return handlePremium(request, env, ctx, { tier: 1, endpoint: '/api/premium/compliance/restricted-party' }, async () => {
        const { computeRestrictedPartyVerdict, normalizePartyName } = await import('./premium-restricted-party-verdict');
        const rawName = url.searchParams.get('name');
        const rpName = rawName ? normalizePartyName(rawName) : null;
        if (!rpName) {
          return { kind: 'validation_failure', error: { error: 'missing_params', required: ['name'], hint: 'name=<counterparty legal name or alias, 2 to 200 chars>, optional sources=<CSL codes> and country=<ISO-2>' } };
        }
        const result = await computeRestrictedPartyVerdict(env, rpName, {
          sources: url.searchParams.get('sources') ?? undefined,
          country: url.searchParams.get('country') ?? undefined,
        });
        if (result.verdict === 'screening_unavailable') {
          // No-charge: the CSL screen could not run (key missing or upstream
          // error), so TF cannot stand behind a screening result. The agent
          // still gets the signed result, billed at zero.
          return { kind: 'no_charge', body: result, reason: 'upstream_failure', dataCapturedAt: result.capturedAt };
        }
        return { kind: 'ok', body: result, dataCapturedAt: result.capturedAt };
      }, PREMIUM_DEPS);
    }

    // Free taste of the Landed-Cost Estimate: the overall status, the
    // natural-language claim, the column used, the total duty and total landed
    // cost, and the count of stacked add-on layers for one HTS/origin/value, with
    // the per-layer breakdown, base-rate detail, and citations stripped. 10
    // calls/day per IP. The paid /api/premium/customs/landed-cost adds the full
    // duty breakdown (base rate, each Chapter 99 layer with rate, litigation
    // status, and citation, plus the CBP fee lines) and a signed receipt.
    if (path === '/api/preview/customs/landed-cost') {
      const { normalizeLandedCostInputs, computeLandedCostVerdict, redactLandedCostVerdictForPreview, checkLandedCostPreviewRateLimit } = await import('./premium-landed-cost-verdict');
      const lcInputs = normalizeLandedCostInputs({
        hts: url.searchParams.get('hts'),
        origin: url.searchParams.get('origin'),
        value_usd: url.searchParams.get('value_usd'),
        mode: url.searchParams.get('mode'),
        fta: url.searchParams.get('fta'),
        quantity: url.searchParams.get('quantity'),
        unit: url.searchParams.get('unit'),
      });
      if (!lcInputs) {
        return jsonResponse(
          { ok: false, error: 'missing_params', required: ['hts', 'origin', 'value_usd'], hint: 'hts=<8 to 10 digit HTS code>, origin=<ISO-2 country>, value_usd=<customs value, positive>, optional mode=ocean|air, fta=<SPI code>, quantity=, unit=' },
          400,
        );
      }
      const lcIp = getClientIP(request);
      const lcLimit = await checkLandedCostPreviewRateLimit(env, lcIp, 10);
      if (!lcLimit.allowed) {
        return jsonResponse(
          {
            ok: false,
            error: 'rate_limit_exceeded',
            limit: lcLimit.limit,
            remaining: 0,
            reset_in_hours: hoursUntilUTCRollover(),
            premium_endpoint: '/api/premium/customs/landed-cost',
            message:
              'Free preview limited to 10 calls/day per IP. The paid /api/premium/customs/landed-cost (full duty breakdown: base column rate plus each Chapter 99 add-on layer with its rate, litigation-status flag, and citation, the CBP fee lines, plus a signed receipt and no rate limit) is the upgrade.',
          },
          429,
        );
      }
      const lcFull = await computeLandedCostVerdict(env, lcInputs);
      return jsonResponse(
        {
          ...redactLandedCostVerdictForPreview(lcFull),
          rate_limit: { limit: lcLimit.limit, remaining: lcLimit.remaining, scope: 'per IP per UTC day' },
          upgrade: {
            premium_endpoint: '/api/premium/customs/landed-cost',
            adds: [
              'the full duty breakdown (base column rate plus each Chapter 99 add-on layer with its rate, litigation-status flag, and citation)',
              'the CBP fee lines (MPF, HMF)',
              'a signed receipt and no rate limit',
            ],
          },
        },
        200,
        0, // do not Cache-API; rate limiting is per IP
      );
    }

    // === PAID PREMIUM ENDPOINT: LANDED-COST ESTIMATE (Tier 1, 1 credit) ===
    // /api/premium/customs/landed-cost?hts=&origin=&value_usd=[&mode=&fta=&quantity=&unit=]
    // One signed US landed-cost estimate for agent-to-agent commerce: the supplied
    // HTS code, country of origin, and customs value are turned into an estimated
    // import duty (base column rate plus the Chapter 99 add-on layers TF links from
    // the HTS footnotes) plus CBP fees (MPF, HMF) and the total landed cost.
    // Requires ?hts=&origin=&value_usd=, so strict-premium: anonymous Bazaar
    // crawlers see a clean 402, not a free trial. Missing or invalid params are a
    // no-charge schema validation failure; an HTS-source outage or unknown code is
    // a no-charge upstream failure (TF will not bill for an estimate it could not
    // compute). This is a PLANNING ESTIMATE, not a customs filing and NOT legal or
    // customs advice; HTS classification is the importer's responsibility and TF
    // does not auto-classify.
    if (path === '/api/premium/customs/landed-cost') {
      return handlePremium(request, env, ctx, { tier: 1, endpoint: '/api/premium/customs/landed-cost' }, async () => {
        const { normalizeLandedCostInputs, computeLandedCostVerdict } = await import('./premium-landed-cost-verdict');
        const lcInputs = normalizeLandedCostInputs({
          hts: url.searchParams.get('hts'),
          origin: url.searchParams.get('origin'),
          value_usd: url.searchParams.get('value_usd'),
          mode: url.searchParams.get('mode'),
          fta: url.searchParams.get('fta'),
          quantity: url.searchParams.get('quantity'),
          unit: url.searchParams.get('unit'),
        });
        if (!lcInputs) {
          return { kind: 'validation_failure', error: { error: 'missing_params', required: ['hts', 'origin', 'value_usd'], hint: 'hts=<8 to 10 digit HTS code>, origin=<ISO-2 country>, value_usd=<customs value, positive>, optional mode=ocean|air, fta=<SPI code>, quantity=, unit=' } };
        }
        const result = await computeLandedCostVerdict(env, lcInputs);
        if (result.status === 'unavailable') {
          // No-charge: the USITC HTS source could not be reached or the code was
          // not found, so TF cannot stand behind an estimate. The agent still
          // gets the signed result, billed at zero.
          return { kind: 'no_charge', body: result, reason: 'upstream_failure', dataCapturedAt: result.capturedAt };
        }
        return { kind: 'ok', body: result, dataCapturedAt: result.capturedAt };
      }, PREMIUM_DEPS);
    }

    // Free taste of the Merchant Legitimacy Verdict: the overall verdict and
    // score band for one domain only, with the per-signal breakdown, reasons,
    // and recommendation stripped. 10 calls/day per IP. The paid
    // /api/premium/merchant/legitimacy adds the full signal detail plus a signed receipt.
    if (path === '/api/preview/merchant/legitimacy') {
      const { computeMerchantLegitimacyVerdict, normalizeDomain, redactMerchantLegitimacyForPreview, checkMerchantLegitimacyPreviewRateLimit, billingKindFor } = await import('./premium-merchant-legitimacy');
      const domain = normalizeDomain(url.searchParams.get('domain') || '');
      if (!domain) return jsonResponse({ error: 'missing_params', required: ['domain'] }, 400, 0);
      // Cache-API front: preview is billing-free; a domain's verdict is stable for hours.
      // Cache hits skip rate-limit accounting and external fetches. Guard for test env
      // where caches is not defined.
      const mlPreviewCacheKey = typeof caches !== 'undefined'
        ? new Request(`https://tensorfeed.ai/__cache/merchant-legitimacy-preview/v1?domain=${domain}`)
        : null;
      if (mlPreviewCacheKey) {
        const hit = await caches.default.match(mlPreviewCacheKey);
        if (hit) return hit;
      }
      const ip = getClientIP(request);
      const lim = await checkMerchantLegitimacyPreviewRateLimit(env, ip, 10);
      if (!lim.allowed) return jsonResponse({ error: 'rate_limited', reset_in_hours: hoursUntilUTCRollover(), message: 'Free preview is 10/day. The premium endpoint /api/premium/merchant/legitimacy has no limit and returns full signals plus a signed receipt.' }, 429, 0);
      const full = await computeMerchantLegitimacyVerdict(env, domain);
      const redacted = redactMerchantLegitimacyForPreview(full);
      // mlPreviewCacheBody omits rate_limit so cached responses do not echo a stale count.
      const mlPreviewCacheBody = { ...redacted, upgrade: { premium_endpoint: '/api/premium/merchant/legitimacy', adds: ['per-signal breakdown', 'reasons', 'signed receipt'] } };
      // Live response includes rate_limit; cache hits do not.
      const mlPreviewBody = { ...mlPreviewCacheBody, rate_limit: { remaining: lim.remaining, limit: lim.limit } };
      // Only cache real verdicts (proceed/step_up/block). insufficient_data means all
      // live upstreams failed; caching that zero-evidence result would poison later
      // paid calls for 60 minutes after upstreams recover.
      if (mlPreviewCacheKey && billingKindFor(full) !== 'no_charge') {
        const cacheResp = new Response(JSON.stringify(mlPreviewCacheBody), {
          headers: { 'Content-Type': 'application/json', 'Cache-Control': 'public, max-age=3600' },
        });
        ctx.waitUntil(caches.default.put(mlPreviewCacheKey, cacheResp));
      }
      return jsonResponse(mlPreviewBody, 200, 0);
    }

    // === PAID PREMIUM ENDPOINT: MERCHANT LEGITIMACY VERDICT (Tier 1, 1 credit) ===
    // /api/premium/merchant/legitimacy?domain=<domain>
    // One signed merchant-domain legitimacy verdict for AI commerce agents:
    // a deterministic 0-100 score and proceed/step_up/block/insufficient_data
    // ruling, fused from RDAP domain age, DoH DNS hygiene, crt.sh cert history,
    // Majestic top-100k membership, and Phishing.Database active-domain list.
    // Requires ?domain=, so strict-premium: anonymous Bazaar crawlers see a
    // clean 402, not a free trial. A missing or invalid domain is a no-charge
    // schema validation failure.
    if (path === '/api/premium/merchant/legitimacy') {
      return handlePremium(request, env, ctx, { tier: 1, endpoint: '/api/premium/merchant/legitimacy' }, async () => {
        const { computeMerchantLegitimacyVerdict, normalizeDomain, billingKindFor } = await import('./premium-merchant-legitimacy');
        type MlResult = Awaited<ReturnType<typeof computeMerchantLegitimacyVerdict>>;
        const domain = normalizeDomain(url.searchParams.get('domain') || '');
        if (!domain) return { kind: 'validation_failure', error: { error: 'missing_params', required: ['domain'], hint: 'pass ?domain=example.com' } };
        // Cache-API front for verdict DATA only. Billing is always charged by
        // handlePremium BEFORE this callback runs, so serving cached data here
        // never bypasses payment. The signed response wrapper is produced fresh
        // by handlePremium after this callback returns. Guard for test env.
        const mlVerdictCacheKey = typeof caches !== 'undefined'
          ? new Request(`https://tensorfeed.ai/__cache/merchant-verdict/v1?domain=${domain}`)
          : null;
        if (mlVerdictCacheKey) {
          const hit = await caches.default.match(mlVerdictCacheKey);
          if (hit) {
            const cached = (await hit.json()) as MlResult;
            if (billingKindFor(cached) === 'no_charge') {
              return { kind: 'no_charge', body: cached, reason: 'upstream_failure', dataCapturedAt: cached.capturedAt };
            }
            return { kind: 'ok', body: cached, dataCapturedAt: cached.capturedAt };
          }
        }
        const result = await computeMerchantLegitimacyVerdict(env, domain);
        // Only cache real verdicts. A no_charge/insufficient_data result means all
        // live upstreams failed; caching it for 60 minutes would serve stale
        // non-answers to paid callers even after upstreams recover.
        if (mlVerdictCacheKey && billingKindFor(result) !== 'no_charge') {
          const cacheResp = new Response(JSON.stringify(result), {
            headers: { 'Content-Type': 'application/json', 'Cache-Control': 'public, max-age=3600' },
          });
          ctx.waitUntil(caches.default.put(mlVerdictCacheKey, cacheResp));
        }
        if (billingKindFor(result) === 'no_charge') {
          // No-charge: all live signals failed; TF cannot stand behind a verdict.
          // The agent still gets the signed result, billed at zero.
          return { kind: 'no_charge', body: result, reason: 'upstream_failure', dataCapturedAt: result.capturedAt };
        }
        return { kind: 'ok', body: result, dataCapturedAt: result.capturedAt };
      }, PREMIUM_DEPS);
    }

    // === STACK SAFETY VERDICT PREVIEW (free, rate-limited) ===
    // Free taste of the deploy gate: the per-package verdict and overall
    // gate, capped at 3 packages, with the matched-CVE evidence stripped
    // (premium carries the CVE ids, ranges, fixes, and KEV status).
    if (path === '/api/preview/stack-safety-verdict') {
      const ssIp = getClientIP(request);
      const { computeStackSafetyVerdict, parsePackagesParam, checkStackSafetyPreviewRateLimit } = await import('./premium-stack-safety');
      const ssLimit = await checkStackSafetyPreviewRateLimit(env, ssIp, 10);
      if (!ssLimit.allowed) {
        return jsonResponse(
          {
            ok: false,
            error: 'rate_limit_exceeded',
            limit: ssLimit.limit,
            remaining: 0,
            reset_in_hours: hoursUntilUTCRollover(),
            premium_endpoint: '/api/premium/stack-safety-verdict',
            message:
              'Free preview limited to 10 calls/day per IP. The paid /api/premium/stack-safety-verdict adds the matched-CVE evidence (ids, ranges, fixes, KEV status), an AFTA-signed receipt, up to 10 packages, and no rate limit.',
          },
          429,
        );
      }
      const ssParsed = parsePackagesParam(url.searchParams.get('packages'));
      if (!ssParsed.ok) return jsonResponse({ ok: false, error: ssParsed.error, hint: ssParsed.hint }, 400);
      const ssResult = await computeStackSafetyVerdict(env, ssParsed.packages.slice(0, 3));
      const slim = ssResult.packages.map(({ matched_cves, ...rest }) => ({ ...rest, matched_cve_count: matched_cves.length }));
      return jsonResponse(
        {
          ok: true,
          preview: true,
          gate: ssResult.gate,
          counts: ssResult.counts,
          packages: slim,
          extracted_at: ssResult.extracted_at,
          claim: ssResult.claim,
          rate_limit: { limit: ssLimit.limit, remaining: ssLimit.remaining, scope: 'per IP per UTC day' },
          upgrade: {
            premium_endpoint: '/api/premium/stack-safety-verdict',
            adds: ['matched CVE evidence (ids, ranges, fixes, KEV status)', 'AFTA-signed receipt', 'up to 10 packages', 'no rate limit'],
          },
        },
        200,
        0,
      );
    }

    // === CVE CHECK PREVIEW (free, rate-limited 1/IP/day) ===
    // Powers the /cve-check landing-page demo and the tweet funnel. Same
    // deterministic engine as the paid endpoint, run over the FULL parsed
    // stack so the free gate is accurate, but the per-package matched-CVE
    // evidence (the paid moat) is stripped down to the single worst
    // offender's verdict and reason. No payment, no receipt. Parse, never
    // resolve.
    if (path === '/api/preview/cve-check' && request.method === 'POST') {
      const ccIp = getClientIP(request);
      const { checkCveCheckSampleRateLimit } = await import('./cve-check-sample');
      const ccLimit = await checkCveCheckSampleRateLimit(env, ccIp, 1);
      if (!ccLimit.allowed) {
        return jsonResponse(
          {
            ok: false,
            error: 'rate_limit_exceeded',
            limit: ccLimit.limit,
            remaining: 0,
            reset_in_hours: hoursUntilUTCRollover(),
            premium_endpoint: '/api/premium/cve-check',
            message:
              'Free CVE Check sample limited to 1 call/day per IP. The paid /api/premium/cve-check runs your full lockfile with matched-CVE evidence (ids, ranges, fixes, KEV status), an AFTA-signed receipt, and no rate limit, for $1 in USDC.',
          },
          429,
        );
      }

      const { parseLockfile } = await import('./lockfile-parse');
      const raw = await request.text().catch(() => '');
      const parsed = parseLockfile(raw);
      if (!parsed.ok) {
        return jsonResponse({ ok: false, error: parsed.error, hint: parsed.hint }, 400);
      }

      const { computeStackSafetyVerdict } = await import('./premium-stack-safety');
      const verdict = await computeStackSafetyVerdict(env, parsed.packages);
      // Worst offender only, evidence stripped: the matched CVE ids, ranges,
      // fixes, and KEV status are the paid moat and are never in this body.
      const worst =
        verdict.packages.find((p) => p.verdict === 'BLOCK') ??
        verdict.packages.find((p) => p.verdict === 'HOLD') ??
        null;
      return jsonResponse(
        {
          ok: true,
          preview: true,
          gate: verdict.gate,
          counts: verdict.counts,
          format: parsed.format,
          truncated: parsed.truncated,
          worst_offender: worst
            ? { package: worst.package, version: worst.version, verdict: worst.verdict, reason: worst.reason }
            : null,
          claim: verdict.claim,
          rate_limit: { limit: ccLimit.limit, remaining: ccLimit.remaining, scope: 'per IP per UTC day' },
          upgrade: {
            premium_endpoint: '/api/premium/cve-check',
            adds: [
              'every package with matched-CVE evidence (ids, ranges, fixes, KEV status)',
              'AFTA-signed receipt',
              'no rate limit',
            ],
            price: '$1 in USDC over x402',
          },
        },
        200,
        0,
      );
    }

    // === PAID PREMIUM ENDPOINT: STACK SAFETY VERDICT (Tier 1, 1 credit) ===
    // /api/premium/stack-safety-verdict
    // GO / HOLD / BLOCK deploy gate per package, fusing the ingested AI-CVE
    // batch with the CISA KEV catalog. Param-required (?packages=), so
    // strict-premium. Never-false-confirm: BLOCK only on exploited with no
    // fix, HOLD when the version must be verified, PASS on no AI-stack
    // match, UNKNOWN outside the curated cohort.
    if (path === '/api/premium/stack-safety-verdict') {
      const payment = await requirePayment(request, env, 1);
      if (!payment.paid) return payment.response!;

      const { computeStackSafetyVerdict, parsePackagesParam } = await import('./premium-stack-safety');
      const ssParsed = parsePackagesParam(url.searchParams.get('packages'));
      if (!ssParsed.ok) {
        return premiumValidationFailure({ ok: false, error: ssParsed.error, hint: ssParsed.hint }, payment, request, env);
      }
      const result = await computeStackSafetyVerdict(env, ssParsed.packages);

      ctx.waitUntil(
        logPremiumUsage(env, '/api/premium/stack-safety-verdict', request.headers.get('User-Agent') || 'unknown', 1, payment.token, payment.payerWallet),
      );
      // Policy (Evan, 2026-07-09): a batch-unavailable all-UNKNOWN answer
      // still charges as-is (honestly disclosed "cannot assess"). Do not
      // wire batch_available into a no-charge here without a new ruling.
      return await premiumResponse(result, payment, 1, request, env);
    }

    // === PAID PREMIUM ENDPOINT: CVE CHECK (Tier 5, 50 credits = flat $1.00) ===
    // POST /api/premium/cve-check
    // The productized "$1 CVE Check": paste a lockfile (requirements.txt,
    // package.json, package-lock.json, or poetry.lock) in the request body
    // and get the same GO/HOLD/BLOCK deploy gate as stack-safety-verdict,
    // plus the detected format and a truncation flag, with an AFTA-signed
    // receipt. Param-required (a lockfile body), so strict-premium. The
    // verdict path is deterministic: no LLM. We parse, never resolve: no
    // install, no dependency resolution, no fetch of any URL the file names.
    if (path === '/api/premium/cve-check') {
      const payment = await requirePayment(request, env, 5);
      if (!payment.paid) return payment.response!;

      // Method gate runs AFTER payment, not as part of the path match: the
      // strict-premium invariant is that ANY anonymous call to this path
      // sees the canonical 402 challenge regardless of HTTP method (an
      // anonymous GET must not fall through to a bare 404). A valid-payment
      // non-POST call is a no-charge validation failure, not a raw 405.
      if (request.method !== 'POST') {
        return premiumValidationFailure(
          { ok: false, error: 'method_not_allowed', hint: 'POST a lockfile in the request body.' },
          payment,
          request,
          env,
        );
      }

      const { parseLockfile, LOCKFILE_MAX_BYTES } = await import('./lockfile-parse');

      // Reject an oversize body without buffering it (defense in depth; the
      // parser re-checks the actual body length below). Post-payment so the
      // no-charge path stays uniform: premiumValidationFailure does not charge.
      const declaredLen = Number(request.headers.get('content-length') || '0');
      if (Number.isFinite(declaredLen) && declaredLen > LOCKFILE_MAX_BYTES) {
        return premiumValidationFailure(
          { ok: false, error: 'too_large', hint: `Lockfile exceeds ${LOCKFILE_MAX_BYTES} bytes.` },
          payment,
          request,
          env,
        );
      }

      const raw = await request.text().catch(() => '');
      const parsed = parseLockfile(raw);
      if (!parsed.ok) {
        return premiumValidationFailure({ ok: false, error: parsed.error, hint: parsed.hint }, payment, request, env);
      }

      const { computeStackSafetyVerdict } = await import('./premium-stack-safety');
      const verdict = await computeStackSafetyVerdict(env, parsed.packages);
      // Carry the detected format and truncation flag. Spreading the full
      // verdict preserves capturedAt, so the AFTA freshness no-charge behaves
      // exactly as it does for stack-safety-verdict.
      const result = { ...verdict, format: parsed.format, truncated: parsed.truncated };

      // Delta cursor loop: re-POST the same lockfile with ?since=<cursor> to
      // re-audit for free until a new ai-cves batch lands for your stack. The
      // no-charge body carries counts + the gate letter only, never the
      // matched-CVE evidence (that ships on the charged path). A malformed,
      // future, or wrong-stack cursor degrades to a full charged audit.
      const url2 = new URL(request.url);
      const sinceRaw = url2.searchParams.get('since');
      const cursor = sinceRaw ? decodeDeltaCursor(sinceRaw, DELTA_CURSOR_VERSION) : null;
      const stackKey = await lockfileIdentityHash(parsed.packages);
      const outcome = cursor
        ? gateDeltaCursor({ resultCap: verdict.capturedAt, cursorCap: cursor.cap, resultKey: stackKey, cursorKey: cursor.key })
        : 'full';
      const freshCursor = encodeDeltaCursor(DELTA_CURSOR_VERSION, verdict.capturedAt, stackKey);
      const continuation = buildDeltaContinuation(
        'POST',
        '/api/premium/cve-check',
        freshCursor,
        'Re-POST the same lockfile with this cursor; free unless a new CVE batch has landed for your stack.',
      );

      if (outcome === 'no_charge') {
        const body = {
          ok: true,
          changed: false,
          gate: result.gate,
          counts: result.counts,
          format: result.format,
          batch_captured_at: verdict.capturedAt,
          cursor: freshCursor,
          continuation,
          next_check_hint: CVE_CHECK_NEXT_CHECK_HINT,
        };
        return await premiumResponse(body, payment, 50, request, env, 'no_new_since_cursor', verdict.capturedAt);
      }

      ctx.waitUntil(
        logPremiumUsage(env, '/api/premium/cve-check', request.headers.get('User-Agent') || 'unknown', 50, payment.token, payment.payerWallet),
      );
      // Policy (Evan, 2026-07-09): batch-unavailable charges as-is, same as
      // stack-safety-verdict above. batch_available is surfaced in the body
      // so the caller can see why everything is UNKNOWN.
      const body = { ...result, cursor: freshCursor, continuation };
      return await premiumResponse(body, payment, 50, request, env, null, verdict.capturedAt);
    }

    // === BENCHMARK TRUST VERDICT PREVIEW (free, rate-limited) ===
    // Free taste: trust band + score per benchmark, no per-signal detail
    // or recommendation (those are premium). Optional ?benchmark=, ?category=.
    if (path === '/api/preview/benchmark-trust-verdict') {
      const btIp = getClientIP(request);
      const { computeBenchmarkTrust, checkBenchmarkTrustPreviewRateLimit } = await import('./premium-benchmark-trust');
      const btLimit = await checkBenchmarkTrustPreviewRateLimit(env, btIp, 10);
      if (!btLimit.allowed) {
        return jsonResponse(
          {
            ok: false,
            error: 'rate_limit_exceeded',
            limit: btLimit.limit,
            remaining: 0,
            reset_in_hours: hoursUntilUTCRollover(),
            premium_endpoint: '/api/premium/benchmark-trust-verdict',
            message:
              'Free preview limited to 10 calls/day per IP. The paid /api/premium/benchmark-trust-verdict adds per-signal detail (ceiling proximity, frontier compression, contamination, status), the down-weight recommendation with an alternative benchmark, an AFTA-signed receipt, and no rate limit.',
          },
          429,
        );
      }
      const btResult = await computeBenchmarkTrust(env, {
        benchmark: url.searchParams.get('benchmark'),
        category: url.searchParams.get('category'),
      });
      const slim = btResult.verdicts.slice(0, 8).map((v) => ({
        id: v.id,
        name: v.name,
        category: v.category,
        trust_band: v.trust_band,
        trust_score: v.trust_score,
      }));
      return jsonResponse(
        {
          ok: true,
          preview: true,
          filter: btResult.filter,
          count: btResult.count,
          verdicts: slim,
          claim: btResult.claim,
          rate_limit: { limit: btLimit.limit, remaining: btLimit.remaining, scope: 'per IP per UTC day' },
          upgrade: {
            premium_endpoint: '/api/premium/benchmark-trust-verdict',
            adds: ['per-signal detail (ceiling proximity, frontier compression, contamination, status)', 'down-weight recommendation + alternative benchmark', 'AFTA-signed receipt', 'no rate limit'],
          },
        },
        200,
        0,
      );
    }

    // === PAID PREMIUM ENDPOINT: BENCHMARK TRUST VERDICT (Tier 1, 1 credit) ===
    // /api/premium/benchmark-trust-verdict
    // Is a benchmark a trustworthy capability signal right now, or
    // saturated / contaminated / near-ceiling so a high score should be
    // down-weighted? Pure deterministic compute over the benchmark registry
    // plus the live cross-model scores (frontier compression). No required
    // params (returns all benchmarks); strict-premium for Bazaar crawler
    // hygiene. AFTA-signed.
    if (path === '/api/premium/benchmark-trust-verdict') {
      const payment = await requirePayment(request, env, 1);
      if (!payment.paid) return payment.response!;

      const { computeBenchmarkTrust } = await import('./premium-benchmark-trust');
      const result = await computeBenchmarkTrust(env, {
        benchmark: url.searchParams.get('benchmark'),
        category: url.searchParams.get('category'),
      });

      ctx.waitUntil(
        logPremiumUsage(env, '/api/premium/benchmark-trust-verdict', request.headers.get('User-Agent') || 'unknown', 1, payment.token, payment.payerWallet),
      );
      return await premiumResponse(result, payment, 1, request, env);
    }

    // === FAILOVER VERDICT PREVIEW (free, rate-limited) ===
    // Free taste: the recommended failover destination + the from incident,
    // without the full candidate detail, ranked alternatives, or receipt.
    if (path === '/api/preview/failover-verdict') {
      const foIp = getClientIP(request);
      const { computeFailoverVerdict, checkFailoverPreviewRateLimit } = await import('./premium-failover-verdict');
      const foLimit = await checkFailoverPreviewRateLimit(env, foIp, 10);
      if (!foLimit.allowed) {
        return jsonResponse(
          {
            ok: false,
            error: 'rate_limit_exceeded',
            limit: foLimit.limit,
            remaining: 0,
            reset_in_hours: hoursUntilUTCRollover(),
            premium_endpoint: '/api/premium/failover-verdict',
            message: 'Free preview limited to 10 calls/day per IP. The paid /api/premium/failover-verdict adds the full failover candidate (pricing, measured latency, quality), the ranked alternatives, an AFTA-signed receipt, and no rate limit.',
          },
          429,
        );
      }
      const foFrom = url.searchParams.get('from');
      if (!foFrom || !foFrom.trim()) {
        return jsonResponse({ ok: false, error: 'missing_params', hint: 'Pass ?from=<provider> (the degraded provider), e.g. ?from=anthropic&task=code.' }, 400);
      }
      const foTaskParam = url.searchParams.get('task');
      const foTask: RoutingTask | undefined =
        foTaskParam === 'code' || foTaskParam === 'reasoning' || foTaskParam === 'creative' || foTaskParam === 'general' ? foTaskParam : undefined;
      const foResult = await computeFailoverVerdict(env, { from: foFrom.trim(), task: foTask, model: url.searchParams.get('model') ?? undefined });
      const slimDest = foResult.failover_to
        ? { model: foResult.failover_to.model, operational: foResult.failover_to.operational, composite_score: foResult.failover_to.composite_score }
        : null;
      return jsonResponse(
        {
          ok: true,
          preview: true,
          from: foResult.from,
          query: foResult.query,
          excluded_providers: foResult.excluded_providers,
          failover_to: slimDest,
          why: foResult.why,
          claim: foResult.claim,
          rate_limit: { limit: foLimit.limit, remaining: foLimit.remaining, scope: 'per IP per UTC day' },
          upgrade: {
            premium_endpoint: '/api/premium/failover-verdict',
            adds: ['full failover candidate (pricing, measured latency, quality)', 'ranked alternatives', 'AFTA-signed receipt', 'no rate limit'],
          },
        },
        200,
        0,
      );
    }

    // === PAID PREMIUM ENDPOINT: FAILOVER VERDICT (Tier 1, 1 credit) ===
    // /api/premium/failover-verdict
    // Provider A is degraded, which operational provider do I fail over to
    // for this task right now? Confirms A against the live incident-triage
    // feed, then runs the Route Verdict fusion with A (and any provider
    // flagged failover_now) excluded. Param-required (?from=), so strict-
    // premium. 30-minute operational freshness SLA. AFTA-signed.
    if (path === '/api/premium/failover-verdict') {
      const payment = await requirePayment(request, env, 1);
      if (!payment.paid) return payment.response!;

      const foFrom = url.searchParams.get('from');
      if (!foFrom || !foFrom.trim()) {
        return premiumValidationFailure(
          { ok: false, error: 'missing_params', hint: 'Pass ?from=<provider> (the degraded provider to fail over from), e.g. ?from=anthropic&task=code.' },
          payment,
          request,
          env,
        );
      }
      const foTaskParam = url.searchParams.get('task');
      const foTask: RoutingTask | undefined =
        foTaskParam === 'code' || foTaskParam === 'reasoning' || foTaskParam === 'creative' || foTaskParam === 'general' ? foTaskParam : undefined;
      const { computeFailoverVerdict } = await import('./premium-failover-verdict');
      const result = await computeFailoverVerdict(env, { from: foFrom.trim(), task: foTask, model: url.searchParams.get('model') ?? undefined });

      ctx.waitUntil(
        logPremiumUsage(env, '/api/premium/failover-verdict', request.headers.get('User-Agent') || 'unknown', 1, payment.token, payment.payerWallet),
      );
      return await premiumResponse(result, payment, 1, request, env);
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
          payment.payerWallet,
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
          payment.payerWallet,
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
      // Strict-premium tier 2 ($0.02): full-window historical time-series,
      // no per-IP trial. See worker/src/strict-premium-endpoints.ts.
      const payment = await requirePayment(request, env, 2);
      if (!payment.paid) return payment.response!;

      const model = url.searchParams.get('model')?.trim();
      if (!model) {
        return await premiumValidationFailure(
          { ok: false, error: 'model_required', hint: 'Pass ?model=<id-or-name>' },
          payment,
          request,
          env,
        );
      }
      const range = resolveRange(url.searchParams.get('from'), url.searchParams.get('to'));
      if (!range.ok) {
        return await premiumValidationFailure(
          {
            ok: false,
            error: range.error,
            limits: { max_range_days: MAX_RANGE_DAYS, default_range_days: DEFAULT_RANGE_DAYS },
          },
          payment,
          request,
          env,
        );
      }

      const result = await getPricingSeries(env, model, range.from, range.to);
      // AFTA empty_result no-charge: a valid model with zero captured days in
      // the window is a billable-free empty (same payload, signed receipt
      // records the no-charge). Mirrors model-intelligence/history.
      if (result.points.length === 0) {
        return await premiumResponse(result, payment, 2, request, env, 'empty_result');
      }
      ctx.waitUntil(
        logPremiumUsage(env, '/api/premium/history/pricing/series', request.headers.get('User-Agent') || 'unknown', 2, payment.token, payment.payerWallet),
      );
      return await premiumResponse(result, payment, 2, request, env);
    }

    if (path === '/api/premium/history/benchmarks/series') {
      // Strict-premium tier 2 ($0.02): full-window historical time-series.
      const payment = await requirePayment(request, env, 2);
      if (!payment.paid) return payment.response!;

      const model = url.searchParams.get('model')?.trim();
      const benchmark = url.searchParams.get('benchmark')?.trim();
      if (!model || !benchmark) {
        return await premiumValidationFailure(
          {
            ok: false,
            error: 'model_and_benchmark_required',
            hint: 'Pass ?model=<name>&benchmark=<key> (e.g. swe_bench, mmlu_pro, gpqa_diamond, math, human_eval)',
          },
          payment,
          request,
          env,
        );
      }
      const range = resolveRange(url.searchParams.get('from'), url.searchParams.get('to'));
      if (!range.ok) {
        return await premiumValidationFailure(
          {
            ok: false,
            error: range.error,
            limits: { max_range_days: MAX_RANGE_DAYS, default_range_days: DEFAULT_RANGE_DAYS },
          },
          payment,
          request,
          env,
        );
      }

      const result = await getBenchmarkSeries(env, model, benchmark, range.from, range.to);
      // AFTA empty_result no-charge: a valid model+benchmark with zero captured
      // days in the window is a billable-free empty (same payload, signed
      // receipt records the no-charge). Mirrors model-intelligence/history.
      if (result.points.length === 0) {
        return await premiumResponse(result, payment, 2, request, env, 'empty_result');
      }
      ctx.waitUntil(
        logPremiumUsage(env, '/api/premium/history/benchmarks/series', request.headers.get('User-Agent') || 'unknown', 2, payment.token, payment.payerWallet),
      );
      return await premiumResponse(result, payment, 2, request, env);
    }

    if (path === '/api/premium/history/status/uptime') {
      // Strict-premium tier 2 ($0.02): full-window historical time-series.
      const payment = await requirePayment(request, env, 2);
      if (!payment.paid) return payment.response!;

      const provider = url.searchParams.get('provider')?.trim();
      if (!provider) {
        return await premiumValidationFailure(
          { ok: false, error: 'provider_required', hint: 'Pass ?provider=<name>' },
          payment,
          request,
          env,
        );
      }
      const range = resolveRange(url.searchParams.get('from'), url.searchParams.get('to'));
      if (!range.ok) {
        return await premiumValidationFailure(
          {
            ok: false,
            error: range.error,
            limits: { max_range_days: MAX_RANGE_DAYS, default_range_days: DEFAULT_RANGE_DAYS },
          },
          payment,
          request,
          env,
        );
      }

      const result = await getStatusUptime(env, provider, range.from, range.to);
      // AFTA empty_result no-charge: a valid provider with zero captured days in
      // the window (no measurable uptime, uptime_pct null) is a billable-free
      // empty (same payload, signed receipt records the no-charge). This series
      // has no points array; days_with_data === 0 is the zero-data condition.
      if (result.days_with_data === 0) {
        return await premiumResponse(result, payment, 2, request, env, 'empty_result');
      }
      ctx.waitUntil(
        logPremiumUsage(env, '/api/premium/history/status/uptime', request.headers.get('User-Agent') || 'unknown', 2, payment.token, payment.payerWallet),
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
          logPremiumUsage(env, '/api/premium/history/news/full', request.headers.get('User-Agent') || 'unknown', 1, payment.token, payment.payerWallet),
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
        logPremiumUsage(env, '/api/premium/history/news/full', request.headers.get('User-Agent') || 'unknown', 1, payment.token, payment.payerWallet),
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
          payment.payerWallet,
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
          payment.payerWallet,
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
          return await premiumValidationFailure(
            { ok: false, error: 'invalid_date', hint: 'date must be YYYY-MM-DD' },
            payment,
            request,
            env,
          );
        }
        const clusters = await readClustersForDate(env, date);
        ctx.waitUntil(
          logPremiumUsage(
            env,
            '/api/premium/history/news/clusters/full',
            request.headers.get('User-Agent') || 'unknown',
            1,
            payment.token,
            payment.payerWallet,
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
        return await premiumValidationFailure(
          {
            ok: false,
            error: 'missing_params',
            hint: 'pass ?date=YYYY-MM-DD or ?from=YYYY-MM-DD&to=YYYY-MM-DD',
          },
          payment,
          request,
          env,
        );
      }
      if (!isISODate(fromParam) || !isISODate(toParam)) {
        return await premiumValidationFailure({ ok: false, error: 'invalid_date_range' }, payment, request, env);
      }
      const fromMs = Date.parse(fromParam + 'T00:00:00Z');
      const toMs = Date.parse(toParam + 'T00:00:00Z');
      if (!(toMs >= fromMs)) {
        return await premiumValidationFailure(
          { ok: false, error: 'invalid_date_range', hint: 'to must be on or after from' },
          payment,
          request,
          env,
        );
      }
      const dayCount = Math.floor((toMs - fromMs) / 86400_000) + 1;
      if (dayCount > 30) {
        return await premiumValidationFailure(
          { ok: false, error: 'range_too_large', hint: 'range must be at most 30 days', limits: { max_range_days: 30 } },
          payment,
          request,
          env,
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
          payment.payerWallet,
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
          return await premiumValidationFailure({ ok: false, error: 'invalid_date' }, payment, request, env);
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
            payment.payerWallet,
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
        return await premiumValidationFailure(
          {
            ok: false,
            error: 'missing_params',
            hint: 'pass ?date=YYYY-MM-DD or ?from=YYYY-MM-DD&to=YYYY-MM-DD with optional ?min_sources=2-50 (default 4)',
          },
          payment,
          request,
          env,
        );
      }
      if (!isISODate(fromParam) || !isISODate(toParam)) {
        return await premiumValidationFailure({ ok: false, error: 'invalid_date_range' }, payment, request, env);
      }
      const fromMs = Date.parse(fromParam + 'T00:00:00Z');
      const toMs = Date.parse(toParam + 'T00:00:00Z');
      if (!(toMs >= fromMs)) {
        return await premiumValidationFailure({ ok: false, error: 'invalid_date_range' }, payment, request, env);
      }
      const dayCount = Math.floor((toMs - fromMs) / 86400_000) + 1;
      if (dayCount > 30) {
        return await premiumValidationFailure(
          { ok: false, error: 'range_too_large', hint: 'range must be at most 30 days', limits: { max_range_days: 30 } },
          payment,
          request,
          env,
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
          payment.payerWallet,
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
        logPremiumUsage(env, '/api/premium/history/news/source-health', request.headers.get('User-Agent') || 'unknown', 1, payment.token, payment.payerWallet),
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
      return handlePremium(request, env, ctx, { tier: 1, endpoint: '/api/premium/clean/cve' }, async () => {
        const raw = await fetchCVE(env, cleanCveMatch[1]);
        if (!raw.ok) {
          if (raw.error === 'cve_not_found' || raw.error === 'invalid_cve_id') {
            // Client/validation no-charge: signed AFTA receipt + no-charge abuse cap.
            return { kind: 'validation_failure', error: { ok: false, error: raw.error, cve_id: raw.cveId, attribution: raw.attribution } };
          }
          // Upstream MITRE 5xx: now a SIGNED no-charge receipt (was a raw 502
          // with no receipt). The deferred debit still never commits.
          return { kind: 'upstream_failure', error: { ok: false, error: raw.error, cve_id: raw.cveId, attribution: raw.attribution }, status: 502, reason: '5xx' };
        }
        const clean = attachCompressionStats(
          transformCveRecord(raw.record),
          measureSourceBytes(raw.record),
        );
        return {
          kind: 'ok',
          body: {
            ok: true,
            source_format: 'mitre_cve_v5_2',
            target_format: 'tensorfeed_llm_ready_v1',
            source_payload: raw.source,
            ...clean,
            attribution: raw.attribution,
          },
          dataCapturedAt: null,
        };
      }, PREMIUM_DEPS);
    }

    const cleanKevMatch = path.match(/^\/api\/premium\/clean\/kev\/(CVE-\d{4}-\d{4,7})$/i);
    if (cleanKevMatch) {
      return handlePremium(request, env, ctx, { tier: 1, endpoint: '/api/premium/clean/kev' }, async () => {
        const entry = await readKEVByCVE(env, cleanKevMatch[1]);
        if (!entry) {
          return {
            kind: 'validation_failure',
            error: {
              ok: false,
              error: 'not_in_kev',
              cve_id: cleanKevMatch[1].toUpperCase(),
              hint: 'CVE may exist in MITRE CVE List but not be on the CISA KEV catalog.',
              attribution: KEV_ATTRIBUTION,
            },
          };
        }
        const clean = attachCompressionStats(
          transformKevEntry(entry),
          measureSourceBytes(entry),
        );
        // Real data-capture time = kev:meta.last_run (the daily cron write), NOT
        // entry.dateAdded (CISA's per-CVE add date, weeks old, would false-no-charge
        // fresh data on nearly every call). last_run no-charges only a stalled cron.
        const kevMeta = await readKEVMeta(env);
        const kevLastRun =
          kevMeta && typeof kevMeta === 'object' && typeof (kevMeta as Record<string, unknown>).last_run === 'string'
            ? ((kevMeta as Record<string, unknown>).last_run as string)
            : null;
        return {
          kind: 'ok',
          body: {
            ok: true,
            source_format: 'cisa_kev_v1',
            target_format: 'tensorfeed_llm_ready_v1',
            ...clean,
            attribution: KEV_ATTRIBUTION,
          },
          dataCapturedAt: kevLastRun,
        };
      }, PREMIUM_DEPS);
    }

    const cleanEpssMatch = path.match(/^\/api\/premium\/clean\/epss\/(CVE-\d{4}-\d{4,7})$/i);
    if (cleanEpssMatch) {
      return handlePremium(request, env, ctx, { tier: 1, endpoint: '/api/premium/clean/epss' }, async () => {
        const wantSeries = url.searchParams.get('series') === 'true';
        const raw = wantSeries
          ? await fetchEPSSSeries(env, cleanEpssMatch[1])
          : await fetchEPSSCurrent(env, cleanEpssMatch[1]);
        if (!raw.ok) {
          // Was a raw jsonResponse (no signed receipt). Now a signed no-charge:
          // not-in-EPSS -> empty_result 404, invalid -> schema 400, else upstream 502.
          const status = raw.error === 'cve_not_in_epss' ? 404 : raw.error === 'invalid_cve_id' ? 400 : 502;
          const reason: NoChargeReason =
            raw.error === 'cve_not_in_epss'
              ? 'empty_result'
              : raw.error === 'invalid_cve_id'
                ? 'schema_validation_failure'
                : 'upstream_failure';
          return { kind: 'validation_failure', error: { ok: false, error: raw.error, cve_id: raw.cve_id, attribution: raw.attribution }, status, reason };
        }
        const clean = attachCompressionStats(
          transformEpssScore(raw.data),
          measureSourceBytes(raw.data),
        );
        // No capturedAt on purpose: FIRST.org's date-only EPSS model date plus the
        // 24h cache and publication lag can exceed the 36h SLA on FRESH data, which
        // would false-no-charge healthy calls. EPSS is live-fetched (24h cache) so
        // it cannot serve deeply stale data; leaving the SLA inert is revenue-safe.
        return {
          kind: 'ok',
          body: {
            ok: true,
            source_format: 'first_org_epss_v1',
            target_format: 'tensorfeed_llm_ready_v1',
            source_payload: raw.source,
            included_series: wantSeries,
            ...clean,
            attribution: raw.attribution,
          },
          dataCapturedAt: null,
        };
      }, PREMIUM_DEPS);
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
      return handlePremium(request, env, ctx, { tier: 1, endpoint: '/api/premium/security/verified' }, async () => {
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
          // Was a raw jsonResponse(404). Now a signed empty_result no-charge.
          return {
            kind: 'validation_failure',
            error: {
              ok: false,
              error: 'cve_not_found_in_any_source',
              cve_id: cveId,
              checked: ['MITRE', 'KEV', 'EPSS', 'OSV', 'Vulnrichment'],
              hint: 'No corroboration found across the 5 security databases. CVE id may be invalid, very recent (not yet propagated), or reserved/disputed.',
            },
            status: 404,
            reason: 'empty_result',
          };
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

        return {
          kind: 'ok',
          body: {
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
          dataCapturedAt: null,
        };
      }, PREMIUM_DEPS);
    }

    // === PAID PREMIUM: EPSS SERIES (Tier 1, 1 credit) ===
    // Full historical time-series of EPSS scores for one CVE, sourced
    // from FIRST.org's `?cve={id}&scope=time-series` endpoint. The
    // series compounds with time as EPSS publishes daily. License:
    // FIRST.org free-for-any-use policy.

    if (path === '/api/premium/security/epss/series') {
      return handlePremium(request, env, ctx, { tier: 1, endpoint: '/api/premium/security/epss/series' }, async () => {
        const cveIdParam = url.searchParams.get('cve_id') ?? url.searchParams.get('cve');
        if (!cveIdParam) {
          return { kind: 'validation_failure', error: { ok: false, error: 'cve_id_required', hint: 'pass ?cve_id=CVE-YYYY-NNNNN' } };
        }
        const result = await fetchEPSSSeries(env, cveIdParam);
        if (!result.ok) {
          const status = result.error === 'cve_not_in_epss' ? 404 : result.error === 'invalid_cve_id' ? 400 : 502;
          const reason: NoChargeReason =
            result.error === 'cve_not_in_epss'
              ? 'empty_result'
              : result.error === 'invalid_cve_id'
                ? 'schema_validation_failure'
                : 'upstream_failure';
          return { kind: 'validation_failure', error: { ok: false, error: result.error, cve_id: result.cve_id, attribution: result.attribution }, status, reason };
        }
        // No capturedAt on purpose (same reasoning as clean/epss): FIRST.org's
        // date-only EPSS model date plus the 24h cache and publication lag can
        // legitimately exceed the 36h SLA on FRESH data, which would
        // false-no-charge healthy calls. EPSS is live-fetched with a 24h cache so
        // it cannot serve deeply stale data; leaving the SLA inert is revenue-safe.
        return {
          kind: 'ok',
          body: {
            ok: true,
            cve_id: result.cve_id,
            fetched_at: result.fetched_at,
            source: result.source,
            score: result.data,
            attribution: result.attribution,
          },
          dataCapturedAt: null,
        };
      }, PREMIUM_DEPS);
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
        return await premiumValidationFailure(
          { ok: false, error: 'invalid_date', hint: 'date must be YYYY-MM-DD' },
          payment,
          request,
          env,
        );
      }
      const requested = parseInt(url.searchParams.get('limit') ?? '50', 10);
      const limit = Math.max(1, Math.min(Number.isFinite(requested) ? requested : 50, 100));

      const result = await fetchEPSSTop(env, limit, dateParam);
      if (!result.ok) {
        return await premiumValidationFailure(
          { ok: false, error: result.error ?? 'first_api_unavailable', attribution: result.attribution },
          payment,
          request,
          env,
          'upstream_failure',
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
          payment.payerWallet,
        ),
      );
      // No single dataCapturedAt: the top-N is a heterogeneous set whose rows
      // each carry their own FIRST.org EPSS model date (result.data[i].date),
      // so there is no one snapshot capture time to gate the 36h SLA against.
      // Leave the 7th arg unset; the per-row dates travel in the payload.
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
      return handlePremium(request, env, ctx, { tier: 1, endpoint: '/api/premium/security/kev/full' }, async () => {
        const catalog = await readKEVCurrent(env);
        if (!catalog) {
          // Original: premiumValidationFailure(..., 'upstream_failure', 503). Preserve both.
          return { kind: 'validation_failure', error: { ok: false, error: 'not_yet_captured' }, reason: 'upstream_failure', status: 503 };
        }
        // The real data-capture time is kev:meta.last_run (the daily cron write),
        // NOT catalog dateReleased: CISA can go several days without a new version,
        // so dateReleased can sit past the 36h SLA while our cron is healthy.
        // last_run no-charges only a stalled cron.
        const kevMeta = await readKEVMeta(env);
        const kevLastRun =
          kevMeta && typeof kevMeta === 'object' && typeof (kevMeta as Record<string, unknown>).last_run === 'string'
            ? ((kevMeta as Record<string, unknown>).last_run as string)
            : null;
        return {
          kind: 'ok',
          body: {
            ok: true,
            catalog_version: catalog.catalogVersion,
            date_released: catalog.dateReleased,
            total_entries: catalog.count ?? catalog.vulnerabilities.length,
            vulnerabilities: catalog.vulnerabilities,
            attribution: KEV_ATTRIBUTION,
          },
          dataCapturedAt: kevLastRun,
        };
      }, PREMIUM_DEPS);
    }

    // === PAID PREMIUM: KEV ADDED SERIES (Tier 1, 1 credit) ===
    // Multi-day series of CISA KEV catalog additions across a UTC date
    // range, capped at 90 days. Each day returns the full set of entries
    // whose dateAdded fell on that day. Useful for trending exploitation
    // velocity, building anomaly detectors, or pulling weekly digests.

    if (path === '/api/premium/security/kev/series') {
      return handlePremium(request, env, ctx, { tier: 1, endpoint: '/api/premium/security/kev/series' }, async () => {
        const fromParam = url.searchParams.get('from');
        const toParam = url.searchParams.get('to');
        if (!fromParam || !toParam) {
          return { kind: 'validation_failure', error: { ok: false, error: 'missing_params', hint: 'pass ?from=YYYY-MM-DD&to=YYYY-MM-DD' } };
        }
        if (!isISODate(fromParam) || !isISODate(toParam)) {
          return { kind: 'validation_failure', error: { ok: false, error: 'invalid_date_range', hint: 'from and to must both be YYYY-MM-DD' } };
        }
        const fromMs = Date.parse(fromParam + 'T00:00:00Z');
        const toMs = Date.parse(toParam + 'T00:00:00Z');
        if (!(toMs >= fromMs)) {
          return { kind: 'validation_failure', error: { ok: false, error: 'invalid_date_range', hint: 'to must be on or after from' } };
        }
        const dayCount = Math.floor((toMs - fromMs) / 86400_000) + 1;
        const KEV_SERIES_MAX_DAYS = 90;
        if (dayCount > KEV_SERIES_MAX_DAYS) {
          return {
            kind: 'validation_failure',
            error: { ok: false, error: 'range_too_large', hint: `range must be at most ${KEV_SERIES_MAX_DAYS} days`, limits: { max_range_days: KEV_SERIES_MAX_DAYS } },
          };
        }

        const dates = enumerateDates(fromParam, toParam);
        const days = await Promise.all(
          dates.map(async (d) => {
            const entries = await readKEVAddedOnDate(env, d);
            return { date: d, count: entries.length, entries };
          }),
        );
        const totalAdded = days.reduce((sum, day) => sum + day.count, 0);
        return {
          kind: 'ok',
          body: {
            ok: true,
            from: fromParam,
            to: toParam,
            days_returned: days.length,
            total_added_in_range: totalAdded,
            days,
            attribution: KEV_ATTRIBUTION,
          },
          dataCapturedAt: null,
        };
      }, PREMIUM_DEPS);
    }

    // === PAID PREMIUM: CVE RANGE (Tier 1, 1 credit) ===
    // Multi-day CVE-ID list across a UTC date range, up to 30 days. Each
    // day returns the full CVE-ID set indexed by the daily cron. Agents
    // hit /api/security/cve/{id} for the per-CVE record after.

    if (path === '/api/premium/security/cve/range') {
      return handlePremium(request, env, ctx, { tier: 1, endpoint: '/api/premium/security/cve/range' }, async () => {
        const fromParam = url.searchParams.get('from');
        const toParam = url.searchParams.get('to');
        if (!fromParam || !toParam) {
          return { kind: 'validation_failure', error: { ok: false, error: 'missing_params', hint: 'pass ?from=YYYY-MM-DD&to=YYYY-MM-DD' } };
        }
        if (!isISODate(fromParam) || !isISODate(toParam)) {
          return { kind: 'validation_failure', error: { ok: false, error: 'invalid_date_range', hint: 'from and to must both be YYYY-MM-DD' } };
        }
        const fromMs = Date.parse(fromParam + 'T00:00:00Z');
        const toMs = Date.parse(toParam + 'T00:00:00Z');
        if (!(toMs >= fromMs)) {
          return { kind: 'validation_failure', error: { ok: false, error: 'invalid_date_range', hint: 'to must be on or after from' } };
        }
        const dayCount = Math.floor((toMs - fromMs) / 86400_000) + 1;
        const CVE_RANGE_MAX_DAYS = 30;
        if (dayCount > CVE_RANGE_MAX_DAYS) {
          return {
            kind: 'validation_failure',
            error: { ok: false, error: 'range_too_large', hint: `range must be at most ${CVE_RANGE_MAX_DAYS} days`, limits: { max_range_days: CVE_RANGE_MAX_DAYS } },
          };
        }

        const dates = enumerateDates(fromParam, toParam);
        const days = await Promise.all(
          dates.map(async (d) => {
            const ids = await readCVEsByDate(env, d);
            return { date: d, count: ids.length, cve_ids: ids };
          }),
        );
        const totalCves = days.reduce((sum, day) => sum + day.count, 0);
        return {
          kind: 'ok',
          body: {
            ok: true,
            from: fromParam,
            to: toParam,
            days_returned: days.length,
            cves_total: totalCves,
            days,
            attribution: CVE_ATTRIBUTION,
          },
          dataCapturedAt: null,
        };
      }, PREMIUM_DEPS);
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
    // Coverage is US states, territories, and marine zones; NWS is
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
      // Strict-premium tier 3 ($0.10): heavy cross-provider aggregation,
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
          payment.payerWallet,
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
      // AFTA empty_result no-charge: a valid provider with zero captured days in
      // the window is an all-null series with nothing to sell. The series always
      // spans the range (one point per day), so key on captured_days, not
      // points.length. Mirrors the history/*/series guards.
      if (result.summary.captured_days === 0) {
        return await premiumResponse(result, payment, 1, request, env, 'empty_result');
      }
      ctx.waitUntil(
        logPremiumUsage(env, '/api/premium/attention/series', request.headers.get('User-Agent') || 'unknown', 1, payment.token, payment.payerWallet),
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
      // AFTA empty_result no-charge: a window with zero captured snapshots is an
      // all-null series (every point has_data:false). points always spans the
      // range, so key on whether any point carries data, not points.length.
      if (!result.points.some((p) => p.has_data)) {
        return await premiumResponse(result, payment, 1, request, env, 'empty_result');
      }
      ctx.waitUntil(
        logPremiumUsage(env, '/api/premium/mcp/registry/series', request.headers.get('User-Agent') || 'unknown', 1, payment.token, payment.payerWallet),
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
      // AFTA empty_result no-charge: a window with zero captured snapshots is an
      // all-null series (every point has_data:false). points always spans the
      // range, so key on whether any point carries data, not points.length.
      if (!result.points.some((p) => p.has_data)) {
        return await premiumResponse(result, payment, 1, request, env, 'empty_result');
      }
      ctx.waitUntil(
        logPremiumUsage(env, '/api/premium/openrouter/series', request.headers.get('User-Agent') || 'unknown', 1, payment.token, payment.payerWallet),
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
      // AFTA empty_result no-charge: a window with zero captured snapshots is an
      // all-null series (every point has_data:false). points always spans the
      // range, so key on whether any point carries data, not points.length.
      if (!result.points.some((p) => p.has_data)) {
        return await premiumResponse(result, payment, 1, request, env, 'empty_result');
      }
      ctx.waitUntil(
        logPremiumUsage(env, '/api/premium/x402-registry/series', request.headers.get('User-Agent') || 'unknown', 1, payment.token, payment.payerWallet),
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
        return await premiumValidationFailure(
          {
            ok: false,
            error: range.error,
            limits: {
              max_range_days: HFVEL_MAX_RANGE_DAYS,
              default_range_days: HFVEL_DEFAULT_RANGE_DAYS,
            },
          },
          payment,
          request,
          env,
        );
      }

      const result = await getHFVelocitySeries(env, range.from!, range.to!);
      // AFTA empty_result no-charge: a window with zero captured snapshots is an
      // all-null velocity series (every point has_data:false). points always
      // spans the range, so key on whether any point carries data.
      if (!result.points.some((p) => p.has_data)) {
        return await premiumResponse(result, payment, 1, request, env, 'empty_result');
      }
      ctx.waitUntil(
        logPremiumUsage(env, '/api/premium/hf/velocity', request.headers.get('User-Agent') || 'unknown', 1, payment.token, payment.payerWallet),
      );
      return await premiumResponse(result, payment, 1, request, env);
    }

    // === PAID PREMIUM: LLM PROBE TIME SERIES (Tier 1, 1 credit) ===
    // Per-day SLA series for one provider: count, ok_pct, ttfb p50/p95/p99,
    // total p50/p95/p99, incident-hour count. The data is unique because
    // we measure it ourselves; no public source publishes 30/90-day SLA
    // history per LLM provider. 90-day max range, default 30 days back.

    if (path === '/api/premium/probe/series') {
      // Strict-premium tier 3 ($0.10): TF-measured latency series unique
      // to TF (we record it ourselves), 90-day window.
      const payment = await requirePayment(request, env, 3);
      if (!payment.paid) return payment.response!;

      const provider = url.searchParams.get('provider')?.trim();
      if (!provider) {
        return await premiumValidationFailure(
          {
            ok: false,
            error: 'provider_required',
            hint: 'Pass ?provider=<name> (anthropic, openai, google, mistral, cohere)',
          },
          payment,
          request,
          env,
        );
      }
      const range = resolveProbeRange(url.searchParams.get('from'), url.searchParams.get('to'));
      if (!range.ok) {
        return await premiumValidationFailure(
          {
            ok: false,
            error: range.error,
            limits: {
              max_range_days: PROBE_MAX_RANGE_DAYS,
              default_range_days: PROBE_DEFAULT_RANGE_DAYS,
            },
          },
          payment,
          request,
          env,
        );
      }

      const result = await getProviderSeries(env, provider, range.from!, range.to!);
      ctx.waitUntil(
        logPremiumUsage(env, '/api/premium/probe/series', request.headers.get('User-Agent') || 'unknown', 3, payment.token, payment.payerWallet),
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

    // === PAID PREMIUM: AI POLICY TIMELINE (Tier 1, 1 credit) ===
    // /api/premium/policy/timeline
    // Forward + backward calendar over the free /api/policy/ai/registry
    // catalog. Adds temporal layer: relative-to-now classification,
    // days-until-effective per entry, windowed view (default 12 months
    // total), and a next-3-milestones extraction. Pure compute on
    // editorial registry; raw catalog remains free.

    // === PAID PREMIUM: AI RESEARCH VELOCITY (Tier 1, 1 credit) ===
    // /api/premium/research/velocity
    // Adds a velocity layer over the free /api/research/institutions/ai
    // 365-day baseline. Joins it with a fresh OpenAlex 30-day group_by
    // (cached 24h after first fetch) to compute per-institution
    // velocity_ratio = (annualized 30d output) / 365d baseline.
    // Direction classification, notable-movers, by-country and by-type
    // breakdowns. One upstream API call per cache miss.

    if (path === '/api/premium/research/velocity') {
      return handlePremium(request, env, ctx, { tier: 1, endpoint: '/api/premium/research/velocity' }, async () => {
        const result = await computeResearchVelocity(env);
        if (!result.ok) {
          // research/velocity has no input schema; all non-ok cases are upstream
          // failures (OpenAlex 429, network timeout, etc). Preserves the original
          // 400 + 'upstream_failure' no-charge (status default) so the AFTA
          // receipt's no_charge_reason distinguishes "their upstream is down".
          return { kind: 'validation_failure', error: { error: result.error, ...(result.hint ? { hint: result.hint } : {}) }, reason: 'upstream_failure' };
        }
        // Pass the real OpenAlex baseline capture time so the 24h staleness SLA
        // can no-charge a stalled baseline cron. baseline_captured_at is the
        // BASELINE_KEY (openalex-ai-institutions:current) snapshot's capturedAt;
        // computed_at is response time and must never gate billing.
        return { kind: 'ok', body: result, dataCapturedAt: result.baseline_captured_at };
      }, PREMIUM_DEPS);
    }

    // === PAID PREMIUM: FUNDING EXPOSURE (Tier 1, 1 credit) ===
    // /api/premium/funding/exposure
    // Derived metrics over the free /api/funding/portfolio registry:
    // silicon concentration shares, per-investor circular exposure with
    // loop classification, top recipients by inbound capital, co-investor
    // pairs (investors that both hold stakes in the same recipient).

    if (path === '/api/premium/funding/exposure') {
      // Strict-premium tier 3 ($0.10): derived metrics over the free
      // funding/portfolio registry. Silicon-concentration + circular-
      // exposure + co-investor pairs computed server-side.
      return handlePremium(request, env, ctx, { tier: 3, endpoint: '/api/premium/funding/exposure' }, async () => {
        const result = computeFundingExposure();
        if (!result.ok) {
          // Preserves the original 400 + 'upstream_failure' no-charge (status default).
          return { kind: 'validation_failure', error: { error: result.error, ...(result.hint ? { hint: result.hint } : {}) }, reason: 'upstream_failure' };
        }
        // capturedAt rides the body; premiumResponse reads it for the 7-day SLA.
        return { kind: 'ok', body: { ...result, capturedAt: result.capturedAt }, dataCapturedAt: null };
      }, PREMIUM_DEPS);
    }

    // === PAID PREMIUM: AI DATACENTER BUILDOUT (Tier 1, 1 credit) ===
    // /api/premium/ai-datacenters/buildout
    // Aggregate over the free /api/ai-datacenters registry: disclosed power
    // (MW) and capex totals by operator, region, and status, plus the forward
    // commissioning calendar of sites coming online. No params; the registry is
    // always non-empty so it always charges. capturedAt is the registry
    // last-updated date (the real data time), so the freshness no-charge bills
    // against actual data age, never build time.
    if (path === '/api/premium/ai-datacenters/buildout') {
      return handlePremium(request, env, ctx, { tier: 1, endpoint: '/api/premium/ai-datacenters/buildout' }, async () => {
        const { AI_DATACENTERS, AI_DATACENTERS_LAST_UPDATED, buildBuildoutAggregate } =
          await import('./ai-datacenters');
        const result = {
          ok: true,
          ...buildBuildoutAggregate(AI_DATACENTERS, AI_DATACENTERS_LAST_UPDATED),
          capturedAt: AI_DATACENTERS_LAST_UPDATED + 'T00:00:00Z',
        };
        // capturedAt rides the body; premiumResponse reads it for the SLA.
        return { kind: 'ok', body: result, dataCapturedAt: null };
      }, PREMIUM_DEPS);
    }

    // === PAID PREMIUM: AI CAPEX CYCLE VERDICT (Tier 1, 1 credit) ===
    // /api/premium/ai-capex-cycle-verdict
    // One signed ruling over the free /api/capital-cycles registry: where the
    // current AI buildout ranks against the curated set of historical technology
    // capital buildouts on the single cross-era-comparable axis, peak annual
    // capex as a percent of national GDP. Names the closest and farthest
    // historical analog, lists equities-led cycles as sentiment outliers rather
    // than ranking them, and explicitly enumerates the post-bust dimensions that
    // cannot be scored while a cycle is still in progress. It deliberately does
    // NOT call "bubble" or "not a bubble"; the honesty about what cannot yet be
    // known is the product. Regular premium (no params); the AI numerator is the
    // curated AI_CURRENT annual-capex constant, not the ai-datacenters cumulative
    // announced capex. captured_at is the REAL registry data time so the
    // freshness no-charge bills against actual data age, never build time. When
    // the registry yields no rankable AI signal it no-charges (inputs_unavailable),
    // an unexpected cold state since the inputs are bundled and static.
    if (path === '/api/premium/ai-capex-cycle-verdict') {
      const payment = await requirePayment(request, env, 1);
      if (!payment.paid) return payment.response!;

      const { CAPITAL_CYCLES, CAPITAL_CYCLES_LAST_UPDATED, GDP_DENOMINATOR, AI_CURRENT, deriveCurrentAiCycle } =
        await import('./capital-cycles');
      const { AI_DATACENTERS, AI_DATACENTERS_LAST_UPDATED, buildBuildoutAggregate } =
        await import('./ai-datacenters');
      const { buildCapexCycleVerdict } = await import('./premium-capex-cycle-verdict');

      const agg = buildBuildoutAggregate(AI_DATACENTERS, AI_DATACENTERS_LAST_UPDATED);
      const current = deriveCurrentAiCycle(
        AI_CURRENT,
        agg.totals.disclosed_power_mw,
        GDP_DENOMINATOR.value_usd_t,
        AI_DATACENTERS_LAST_UPDATED + 'T00:00:00Z',
      );
      const result = buildCapexCycleVerdict(CAPITAL_CYCLES, current, CAPITAL_CYCLES_LAST_UPDATED, new Date());

      if (!result.ok) {
        return await premiumValidationFailure(
          { error: result.error, hint: result.hint },
          payment, request, env, 'upstream_failure', 503,
        );
      }

      ctx.waitUntil(
        logPremiumUsage(env, '/api/premium/ai-capex-cycle-verdict', request.headers.get('User-Agent') || 'unknown', 1, payment.token, payment.payerWallet),
      );
      return await premiumResponse(result, payment, 1, request, env, null, result.captured_at);
    }

    // === PAID PREMIUM: FEDERAL AI SPENDING LEADERSHIP (Tier 1, 1 credit) ===
    // /api/premium/funding/federal/momentum
    // One signed ruling over TensorFeed's own federal-spending snapshot:
    // names the cohort leader and its share of total tracked federal AI
    // award dollars, the top-2 spend concentration, the leading awarding
    // agency, and the vendors with a dated award inside the last 120 days
    // (award recency). A live USAspending pilot proved the old recent-vs-
    // prior 90-day momentum metric is lag-biased: the source under-reports
    // the most recent roughly 60 days, so active vendors falsely read as
    // collapsing. This verdict is leadership + concentration + recency,
    // which the source supports cleanly. Regular premium (no params); the
    // same premiumResponse signing path as the other verdicts. captured_at
    // is the REAL snapshot data time so the freshness no-charge bills
    // against actual data age, never build time. When the snapshot blob is
    // missing it no-charges (upstream_failure), same posture as
    // funding/exposure when its source is absent.
    if (path === '/api/premium/funding/federal/momentum') {
      const payment = await requirePayment(request, env, 1);
      if (!payment.paid) return payment.response!;

      const { FED_SPEND_SNAPSHOT_KEY } = await import('./federal-spending-fetcher');
      const snap = (await env.TENSORFEED_CACHE.get(FED_SPEND_SNAPSHOT_KEY, 'json')) as
        | import('./federal-spending-fetcher').FedSnapshot
        | null;
      if (!snap) {
        return await premiumValidationFailure(
          { error: 'not_ready', hint: 'The federal spending snapshot precomputes daily; retry after the next cron run.' },
          payment, request, env, 'upstream_failure', 503,
        );
      }

      // Inline compact-USD for the verdict sentence, e.g. $1.6B, $340.0M.
      const usdCompact = (n: number): string => {
        const v = Math.abs(n);
        if (v >= 1_000_000_000) return `$${(v / 1_000_000_000).toFixed(1)}B`;
        if (v >= 1_000_000) return `$${(v / 1_000_000).toFixed(1)}M`;
        if (v >= 1_000) return `$${(v / 1_000).toFixed(1)}K`;
        return `$${Math.round(v).toLocaleString()}`;
      };

      const total = snap.total_usd;
      const vendors = snap.vendors;

      const leader = vendors[0]
        ? {
            slug: vendors[0].slug,
            name: vendors[0].name,
            total_usd: vendors[0].total_usd,
            share_pct: total > 0 ? Math.round((vendors[0].total_usd / total) * 1000) / 10 : 0,
          }
        : null;

      const top2_concentration_pct =
        total > 0
          ? Math.round((((vendors[0]?.total_usd ?? 0) + (vendors[1]?.total_usd ?? 0)) / total) * 100)
          : 0;

      const leading_agency = snap.agencies[0] ?? null;

      const capturedMs = Date.parse(snap.captured_at);
      const recently_active = vendors
        .filter(
          (v) =>
            v.last_award_date !== null &&
            capturedMs - Date.parse(v.last_award_date + 'T00:00:00Z') <= 120 * 86_400_000,
        )
        .sort((a, b) => (b.last_award_date as string).localeCompare(a.last_award_date as string))
        .map((v) => ({
          slug: v.slug,
          name: v.name,
          last_award_date: v.last_award_date,
          total_usd: v.total_usd,
        }));

      const verdict = `${leader ? leader.name : 'No vendor'} leads tracked federal AI awards with ${usdCompact(leader?.total_usd ?? 0)} (${leader?.share_pct ?? 0}% of ${usdCompact(total)} across ${snap.cohort_size} vendors). ${snap.agencies[0] ? snap.agencies[0].agency : 'No agency'} is the top federal buyer.`;

      const result = {
        ok: true as const,
        captured_at: snap.captured_at,
        source: snap.source,
        license: snap.license,
        verdict,
        leader,
        top2_concentration_pct,
        leading_agency,
        recently_active,
        cohort_size: snap.cohort_size,
        total_usd: total,
        window_days: snap.window_days,
      };

      // A captured-but-empty snapshot (no vendors) is a no-data answer, not a
      // ruling; no-charge it rather than billing for an all-zeros verdict. The
      // cold (!snap) case no-charges above; this covers a present-but-empty
      // snapshot left by an upstream-source outage.
      if (vendors.length === 0) {
        return await premiumResponse(result, payment, 1, request, env, 'empty_result');
      }

      ctx.waitUntil(
        logPremiumUsage(env, '/api/premium/funding/federal/momentum', request.headers.get('User-Agent') || 'unknown', 1, payment.token, payment.payerWallet),
      );
      return await premiumResponse(result, payment, 1, request, env);
    }

    // === PAID PREMIUM: GOVERNMENT AI PROCUREMENT DEMAND (Tier 1, 1 credit) ===
    // /api/premium/procurement/ai-contracts/demand
    // One signed demand read over the free /api/procurement/ai-contracts
    // snapshot: agency concentration (top-agency share of tracked AI award
    // dollars plus the Herfindahl-Hirschman Index over all ranked agencies),
    // the emerging contractors winning AI work outside the known vendor
    // cohort, and the top buying agencies. Regular premium (no params), the
    // same premiumResponse signing path as the federal momentum verdict.
    // captured_at is the REAL snapshot data time so the freshness no-charge
    // bills against actual data age, never build time. Cold-start safe: when
    // the snapshot blob is missing it no-charges (empty_result), so an agent
    // is never billed for a pre-first-cron empty answer.
    if (path === '/api/premium/procurement/ai-contracts/demand') {
      const payment = await requirePayment(request, env, 1);
      if (!payment.paid) return payment.response!;

      const { AI_PROCUREMENT_SNAPSHOT_KEY } = await import('./ai-procurement');
      const snapshot = (await env.TENSORFEED_CACHE.get(AI_PROCUREMENT_SNAPSHOT_KEY, 'json')) as
        | import('./ai-procurement').ProcurementSnapshot
        | null;
      if (!snapshot) {
        return await premiumResponse(
          { ok: true, captured_at: null, note: 'Snapshot not yet captured.' },
          payment,
          1,
          request,
          env,
          'empty_result',
        );
      }

      // Agency concentration. top_agency_share_pct is the leading agency's
      // share of total tracked AI award dollars. hhi is the Herfindahl-
      // Hirschman Index: the sum of every ranked agency's percent-share
      // squared (each share as a 0-100 percent, so a single-agency market is
      // 100^2 = 10000 and a perfectly fragmented market trends toward 0).
      const total = snapshot.total_usd;
      const top_agency_share_pct =
        total > 0 ? (snapshot.by_agency[0]?.usd ?? 0) / total * 100 : 0;
      const hhi =
        total > 0
          ? snapshot.by_agency.reduce((sum, a) => {
              const sharePct = (a.usd / total) * 100;
              return sum + sharePct * sharePct;
            }, 0)
          : 0;

      const result = {
        ok: true as const,
        captured_at: snapshot.captured_at,
        total_usd: snapshot.total_usd,
        agency_concentration: { top_agency_share_pct, hhi },
        top_agencies: snapshot.by_agency.slice(0, 10),
        emerging_vendors: snapshot.by_vendor.filter((v) => v.emerging).slice(0, 15),
        capturedAt: snapshot.captured_at,
      };

      // A captured-but-empty snapshot (no awards, no ranked agencies/vendors)
      // is a no-data answer; no-charge it instead of billing for an all-zeros
      // concentration/HHI ruling. The cold (!snapshot) case no-charges above.
      if (snapshot.total_usd === 0 && snapshot.by_agency.length === 0 && snapshot.by_vendor.length === 0) {
        return await premiumResponse(result, payment, 1, request, env, 'empty_result');
      }

      ctx.waitUntil(
        logPremiumUsage(env, '/api/premium/procurement/ai-contracts/demand', request.headers.get('User-Agent') || 'unknown', 1, payment.token, payment.payerWallet),
      );
      return await premiumResponse(result, payment, 1, request, env);
    }

    // === PAID PREMIUM: FEDERAL AI OPPORTUNITIES DEADLINES (Tier 1, 1 credit) ===
    // /api/premium/procurement/ai-opportunities/deadlines
    // One signed read over the free /api/procurement/ai-opportunities snapshot:
    // the full ranked pipeline of open AI solicitations sorted by response
    // deadline, each with days_remaining, plus the echoed agency and set-aside
    // rollups. Regular premium (no params), the same premiumResponse signing
    // path as the procurement demand sibling. captured_at is the REAL snapshot
    // data time so the freshness no-charge bills against actual data age, never
    // build time. Cold-start safe: when the snapshot blob is missing it
    // no-charges (empty_result), so an agent is never billed for a pre-first-
    // cron empty answer.
    if (path === '/api/premium/procurement/ai-opportunities/deadlines') {
      const payment = await requirePayment(request, env, 1);
      if (!payment.paid) return payment.response!;

      const { OPP_SNAPSHOT_KEY } = await import('./ai-opportunities');
      const snapshot = (await env.TENSORFEED_CACHE.get(OPP_SNAPSHOT_KEY, 'json')) as
        | import('./ai-opportunities').OpportunitySnapshot
        | null;
      if (!snapshot) {
        return await premiumResponse(
          { ok: true, captured_at: null, note: 'Snapshot not yet captured.' },
          payment,
          1,
          request,
          env,
          'empty_result',
        );
      }

      const now = Date.now();
      const deadlines = snapshot.open
        .filter((o) => o.response_deadline !== null)
        .map((o) => ({
          ...o,
          days_remaining: Math.ceil((Date.parse(o.response_deadline as string) - now) / 86_400_000),
        }))
        .sort((a, b) => Date.parse(a.response_deadline as string) - Date.parse(b.response_deadline as string));
      const payload = {
        ok: true as const,
        window_days: snapshot.window_days,
        total_open: snapshot.total_open,
        by_agency: snapshot.by_agency,
        by_set_aside: snapshot.by_set_aside,
        deadlines,
        source: snapshot.source,
        license: snapshot.license,
        capturedAt: snapshot.captured_at,
      };

      // A captured-but-empty pipeline (no open solicitations) is a no-data
      // answer; no-charge it instead of billing for an empty deadlines list.
      // The cold (!snapshot) case no-charges above; this covers a present
      // snapshot whose open pipeline is empty.
      if (deadlines.length === 0) {
        return await premiumResponse(payload, payment, 1, request, env, 'empty_result');
      }

      ctx.waitUntil(
        logPremiumUsage(env, '/api/premium/procurement/ai-opportunities/deadlines', request.headers.get('User-Agent') || 'unknown', 1, payment.token, payment.payerWallet),
      );
      return await premiumResponse(payload, payment, 1, request, env);
    }

    // === PAID PREMIUM: FEDERAL AI POLICY (Tier 1, 1 credit) ===
    // /api/premium/federal-ai-policy
    // One signed read over the free /api/federal-ai-policy snapshot: the full
    // ranked list of AI-related Federal Register documents plus the AI bill
    // matches, with the agency and document-type rollups. Regular premiumResponse
    // signing path; strict-premium (see strict-premium-endpoints.ts) so anonymous
    // crawlers get a clean 402, not a free-trial 200 leaking the full dataset.
    // captured_at is the REAL snapshot data time so the freshness no-charge bills
    // against actual data age, never build time. Cold-start safe: a missing
    // snapshot no-charges (empty_result), so an agent is never billed for a
    // pre-first-cron empty answer.
    if (path === '/api/premium/federal-ai-policy') {
      const payment = await requirePayment(request, env, 1);
      if (!payment.paid) return payment.response!;

      const { POLICY_SNAPSHOT_KEY } = await import('./federal-ai-policy');
      const snapshot = (await env.TENSORFEED_CACHE.get(POLICY_SNAPSHOT_KEY, 'json')) as
        | import('./federal-ai-policy').PolicySnapshot
        | null;
      if (!snapshot) {
        return await premiumResponse(
          { ok: true, captured_at: null, note: 'Snapshot not yet captured.' },
          payment,
          1,
          request,
          env,
          'empty_result',
        );
      }

      const payload = {
        ok: true as const,
        window_days: snapshot.window_days,
        total_documents: snapshot.total_documents,
        unique_agencies: snapshot.unique_agencies,
        by_agency: snapshot.by_agency,
        by_type: snapshot.by_type,
        documents: snapshot.documents,
        bills_enabled: snapshot.bills_enabled,
        total_bills: snapshot.total_bills,
        bills: snapshot.bills,
        source: snapshot.source,
        license: snapshot.license,
        capturedAt: snapshot.captured_at,
      };

      // A captured-but-empty snapshot (no documents and no bills) is a no-data
      // answer; no-charge it instead of billing for an empty policy feed. The
      // cold (!snapshot) case no-charges above.
      if (snapshot.total_documents === 0 && snapshot.total_bills === 0) {
        return await premiumResponse(payload, payment, 1, request, env, 'empty_result');
      }

      ctx.waitUntil(
        logPremiumUsage(env, '/api/premium/federal-ai-policy', request.headers.get('User-Agent') || 'unknown', 1, payment.token, payment.payerWallet),
      );
      return await premiumResponse(payload, payment, 1, request, env);
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
        logPremiumUsage(env, '/api/premium/cve/kev-exploitation-timeline', request.headers.get('User-Agent') || 'unknown', 1, payment.token, payment.payerWallet),
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
        logPremiumUsage(env, '/api/premium/security/corroborated', request.headers.get('User-Agent') || 'unknown', 1, payment.token, payment.payerWallet),
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
        logPremiumUsage(env, '/api/premium/research/milestones', request.headers.get('User-Agent') || 'unknown', 1, payment.token, payment.payerWallet),
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
        logPremiumUsage(env, '/api/premium/research/emerging-keywords', request.headers.get('User-Agent') || 'unknown', 1, payment.token, payment.payerWallet),
      );
      return await premiumResponse({ ...result, capturedAt: result.capturedAt }, payment, 1, request, env);
    }

    // === SEC FILINGS RECENT (free, cached 1800s) ===
    // /api/sec/filings/recent?form=&ticker=&limit=
    // Recent EDGAR filings across the curated AI bellwether cohort
    // (NVDA, MSFT, GOOGL, META, AAPL, AMZN, TSLA, AMD, AVGO, ORCL, PLTR,
    // ARM, TSM, SMCI). Refreshed every 6h. Source: data.sec.gov, public
    // domain. Premium AI-flagged variant queued behind DataPal CC's
    // Qwen extraction pipeline.

    if (path === '/api/sec/filings/recent') {
      const { getSecFilingsSnapshot } = await import('./sec-filings-fetcher');
      const snap = await getSecFilingsSnapshot(env);
      if (!snap) {
        return jsonResponse({
          ok: false,
          error: 'snapshot_not_ready',
          hint: 'SEC filings snapshot refreshes every 6h at :05 UTC. After deploy + first cron tick, populates within 6 hours.',
        }, 503, 0);
      }
      const formFilter = url.searchParams.get('form')?.trim().toUpperCase() || null;
      const tickerFilter = url.searchParams.get('ticker')?.trim().toUpperCase() || null;
      const limit = (() => {
        const n = parseInt(url.searchParams.get('limit') ?? '', 10);
        return Number.isFinite(n) && n > 0 ? Math.min(n, 50) : 25;
      })();
      let filings = snap.filings;
      if (formFilter) filings = filings.filter((f) => f.form.toUpperCase() === formFilter);
      if (tickerFilter) filings = filings.filter((f) => f.ticker.toUpperCase() === tickerFilter);
      filings = filings.slice(0, limit);
      return jsonResponse({
        ok: true,
        source: snap.source,
        source_license: snap.source_license,
        capturedAt: snap.capturedAt,
        cohort_size: snap.cohort_size,
        cohort_tickers: ['NVDA', 'AMD', 'AVGO', 'TSM', 'ARM', 'MSFT', 'GOOGL', 'AMZN', 'ORCL', 'PLTR', 'SMCI', 'AAPL', 'META', 'TSLA'],
        filings_count: filings.length,
        filings_by_company: snap.filings_by_company,
        filings,
        attribution: {
          source: 'U.S. Securities and Exchange Commission (EDGAR via data.sec.gov)',
          license: 'Public domain (17 USC 105). Free to redistribute.',
          notes: 'AI bellwether cohort filings, refreshed every 6 hours. Per-company recent via /api/sec/filings/{cik}/recent. Premium AI-extraction endpoints land after DataPal Qwen pipeline.',
        },
      }, 200, 1800);
    }

    // === SEC FILINGS BY CIK (free, cached 1800s) ===
    // /api/sec/filings/{cik}/recent
    // Per-company recent filings. CIK must be from the cohort.

    // === SEC INSIDER TRADES (Form 4, free, lazy-fetched) ===
    // /api/sec/insider-trades?ticker=&limit=
    //
    // Form 4 insider-trade filings for the AI bellwether cohort. Lazy
    // fetched from EDGAR's per-company Atom feed with a 6h KV cache.
    // V1 returns filing metadata only (accession_number, filing_date,
    // filing_url, form_name). Agents that need parsed reporting owner +
    // transactions can fetch filing_url and parse the Form 4 XBRL
    // themselves; structured extraction is queued behind DataPal Qwen.
    // Public domain SEC data, license preserved on every response.

    if (path === '/api/sec/insider-trades') {
      const ticker = url.searchParams.get('ticker');
      if (!ticker || ticker.trim().length === 0) {
        return jsonResponse(
          {
            ok: false,
            error: 'missing_params',
            hint: 'Pass ticker=NVDA (or any AI bellwether). Supported: NVDA, AMD, AVGO, TSM, ARM, MSFT, GOOGL, AMZN, ORCL, PLTR, SMCI, AAPL, META, TSLA.',
          },
          400,
        );
      }
      const { isInCohort, getInsiderTradesResponse, parseLimitParam } = await import('./sec-insider-trades');
      if (!isInCohort(ticker.trim())) {
        return jsonResponse(
          {
            ok: false,
            error: 'ticker_not_in_cohort',
            ticker: ticker.trim().toUpperCase(),
            hint: 'TensorFeed tracks a curated AI bellwether cohort. See cohort_tickers in /api/sec/filings/recent for the supported list.',
          },
          404,
        );
      }
      const limit = parseLimitParam(url.searchParams.get('limit'));
      const response = await getInsiderTradesResponse(env, ticker.trim(), limit);
      if (response === null) {
        return jsonResponse(
          {
            ok: false,
            error: 'edgar_unreachable',
            hint: 'EDGAR upstream is unavailable and no cached snapshot exists for this ticker yet. Retry in a few minutes.',
          },
          503,
          0,
        );
      }
      return jsonResponse(response, 200, 1800);
    }

    if (path.startsWith('/api/sec/filings/') && path.endsWith('/recent') && path !== '/api/sec/filings/recent') {
      const cikRaw = path.slice('/api/sec/filings/'.length, -'/recent'.length);
      // Validate CIK format (10-digit zero-padded OR integer form).
      const cikInt = parseInt(cikRaw, 10);
      if (!Number.isFinite(cikInt) || cikInt <= 0 || cikRaw.length > 10) {
        return jsonResponse({ ok: false, error: 'invalid_cik', hint: 'CIK must be the 10-digit zero-padded form (e.g. 0001045810).' }, 400);
      }
      const cikPadded = String(cikInt).padStart(10, '0');
      const { getCompanyFilingsSnapshot, AI_BELLWETHERS } = await import('./sec-filings-fetcher');
      const inCohort = AI_BELLWETHERS.some((b) => b.cik === cikPadded);
      if (!inCohort) {
        return jsonResponse({
          ok: false,
          error: 'cik_not_in_cohort',
          hint: 'TF tracks a curated AI bellwether cohort. See cohort_tickers in /api/sec/filings/recent for the supported list.',
        }, 404);
      }
      const snap = await getCompanyFilingsSnapshot(env, cikPadded);
      if (!snap) {
        return jsonResponse({
          ok: false,
          error: 'snapshot_not_ready',
          hint: 'SEC filings snapshot refreshes every 6h at :05 UTC. After deploy + first cron tick, populates within 6 hours.',
        }, 503, 0);
      }
      return jsonResponse({
        ok: true,
        source: 'data.sec.gov/submissions',
        capturedAt: snap.capturedAt,
        cik: snap.cik,
        ticker: snap.ticker,
        company_name: snap.company_name,
        filings_count: snap.filings.length,
        filings: snap.filings,
        attribution: {
          source: 'U.S. Securities and Exchange Commission (EDGAR via data.sec.gov)',
          license: 'Public domain (17 USC 105).',
          notes: 'Per-company recent filings, refreshed every 6 hours.',
        },
      }, 200, 1800);
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
        logPremiumUsage(env, '/api/premium/status/incidents/triage', request.headers.get('User-Agent') || 'unknown', 1, payment.token, payment.payerWallet),
      );
      return await premiumResponse(result, payment, 1, request, env);
    }

    // === PAID PREMIUM: PER-PROVIDER INCIDENT TRIAGE (Tier 1, 1 credit) ====
    // /api/premium/status/{provider}/incidents/triage where provider is one
    // of openai, anthropic, google, aws, azure. Reuses the Wave 12 Haiku
    // triage snapshot and pre-applies the provider filter from the path.
    // Optional query filters (impact, recommended_action, capability,
    // ongoing_only) layer on top.
    //
    // AgentMail scoped+flat duplication pattern translated. Each path is a
    // distinct Bazaar pilot (5 separate catalog rows), NOT path-param with
    // routeTemplate which CDP consolidates to one row. The five rows let
    // agents subscribe to / discover a specific provider's incident stream
    // without re-deriving the filter on every call.

    {
      const providerTriageMatch = path.match(/^\/api\/premium\/status\/([a-z]+)\/incidents\/triage$/);
      if (providerTriageMatch) {
        const provider = providerTriageMatch[1];
        const SUPPORTED = ['openai', 'anthropic', 'google', 'aws', 'azure'];
        if (!SUPPORTED.includes(provider)) {
          return jsonResponse(
            {
              ok: false,
              error: 'unsupported_provider',
              hint: `Supported per-provider triage providers: ${SUPPORTED.join(', ')}. For other providers use /api/premium/status/incidents/triage?provider=...`,
            },
            404,
            0,
          );
        }

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

        const { buildTriageResponse, parseImpact, parseRecommendedAction, parseCapability, parseOngoingOnly } = await import('./premium-incident-triage');
        const result = buildTriageResponse(snap, {
          provider,
          impact: parseImpact(url.searchParams.get('impact')),
          recommended_action: parseRecommendedAction(url.searchParams.get('recommended_action')),
          capability: parseCapability(url.searchParams.get('capability')),
          ongoing_only: parseOngoingOnly(url.searchParams.get('ongoing_only')),
        });

        ctx.waitUntil(
          logPremiumUsage(env, `/api/premium/status/${provider}/incidents/triage`, request.headers.get('User-Agent') || 'unknown', 1, payment.token, payment.payerWallet),
        );
        return await premiumResponse(result, payment, 1, request, env);
      }
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
        logPremiumUsage(env, '/api/premium/news/action-cards', request.headers.get('User-Agent') || 'unknown', 1, payment.token, payment.payerWallet),
      );
      return await premiumResponse(result, payment, 1, request, env);
    }

    // === AI-CVES LATEST (free, cached 6h) ============================
    // /api/ai-cves/latest
    // Returns metadata for the most-recent DP CC batch + first 25 papers
    // (no pagination at this endpoint; use /api/ai-cves/feed for paginated
    // bulk). quote_spans field omitted pending DP CC's normalize.py
    // span-cleaning patch in job #78.

    if (path === '/api/ai-cves/latest') {
      const { getLatestBatch, getAiFlagged } = await import('./ai-cves-feed');
      const { buildLatestResponse } = await import('./premium-ai-cves');
      const [batch, flagged] = await Promise.all([getLatestBatch(env), getAiFlagged(env)]);
      const result = buildLatestResponse(batch, flagged?.papers.length ?? 0);
      return jsonResponse(result, 200, 6 * 60 * 60);
    }

    // === AI-CVES FEED (free, paginated, cached 6h) ===================
    // /api/ai-cves/feed?limit=N&offset=N
    // Paginated raw papers from the latest batch. limit capped at 50.

    if (path === '/api/ai-cves/feed') {
      const { getLatestBatch } = await import('./ai-cves-feed');
      const { buildFeedResponse } = await import('./premium-ai-cves');
      const batch = await getLatestBatch(env);
      const rawLimit = parseInt(url.searchParams.get('limit') ?? '', 10);
      const rawOffset = parseInt(url.searchParams.get('offset') ?? '', 10);
      const result = buildFeedResponse(
        batch ? { batch_id: batch.batch_id, papers: batch.papers } : null,
        Number.isFinite(rawLimit) ? rawLimit : 0,
        Number.isFinite(rawOffset) ? rawOffset : 0,
      );
      return jsonResponse(result, 200, 6 * 60 * 60);
    }

    // === AI-CVES STATS (free, cached 6h) =============================
    // /api/ai-cves/stats
    // Aggregate counts (by_severity, by_exploitation, top_vendors).

    if (path === '/api/ai-cves/stats') {
      const { getLatestBatch } = await import('./ai-cves-feed');
      const { buildStatsResponse } = await import('./premium-ai-cves');
      const batch = await getLatestBatch(env);
      const result = buildStatsResponse(
        batch ? { batch_id: batch.batch_id, papers: batch.papers } : null,
      );
      return jsonResponse(result, 200, 6 * 60 * 60);
    }

    // === PAID PREMIUM: AI-STACK CVES (Tier 1, 1 credit) ==============
    // /api/premium/ai-cves/ai-stack-cves
    // Wave 13 flagship. Filters DP CC's latest batch to papers whose
    // affected_products match the curated AI_STACK_VENDORS list, attaches
    // tf_ai_category + severity_rank, sorts: exploited_in_wild first,
    // then severity desc, then source_url asc. No params; bulk derived
    // view that "answers is my AI stack vulnerable" in one call.

    // === FREE PREVIEW: AI-STACK CVES TASTE (10/IP/day) ===
    // Free discovery sibling of /api/premium/ai-cves/ai-stack-cves. Counts
    // (total, exploited-in-wild, by severity, by AI-stack category) plus the
    // single top CVE headline, so an agent can see the filtered feed's shape
    // before paying. The full filtered list and per-CVE remediation detail
    // (version ranges, fixes, advisory links) stay paid. Raw unfiltered
    // batches are already free at /api/ai-cves/latest. Per-IP daily cap.
    if (path === '/api/preview/ai-cves/ai-stack-cves') {
      const ip = request.headers.get('CF-Connecting-IP') || request.headers.get('x-forwarded-for') || 'anonymous';
      const { getAiStackCves, previewAiStackCves, checkAiStackCvesPreviewRateLimit } = await import('./premium-ai-cves');
      const acLimit = await checkAiStackCvesPreviewRateLimit(env, ip, 10);
      if (!acLimit.allowed) {
        return jsonResponse(
          {
            ok: false,
            error: 'rate_limit_exceeded',
            limit: acLimit.limit,
            remaining: 0,
            reset_in_hours: hoursUntilUTCRollover(),
            premium_endpoint: '/api/premium/ai-cves/ai-stack-cves',
            message:
              'Free preview limited to 10 calls/day per IP. The paid /api/premium/ai-cves/ai-stack-cves (the full AI-stack-filtered CVE list with version ranges, fixes, and advisory links, no rate limit) is the upgrade. Raw unfiltered batches are free at /api/ai-cves/latest.',
          },
          429,
        );
      }
      const acResult = await getAiStackCves(env);
      return jsonResponse(
        {
          ...previewAiStackCves(acResult),
          rate_limit: { limit: acLimit.limit, remaining: acLimit.remaining, scope: 'per IP per UTC day' },
        },
        200,
        0,
      );
    }

    if (path === '/api/premium/ai-cves/ai-stack-cves') {
      const payment = await requirePayment(request, env, 1);
      if (!payment.paid) return payment.response!;

      const { getAiStackCves } = await import('./premium-ai-cves');
      const result = await getAiStackCves(env);

      // AFTA empty_result no-charge: cold-start absence (no ai-flagged batch
      // ingested yet) returns the placeholder {batch_id:null, total:0,
      // papers:[]}. batch_id === null only occurs on that cold placeholder; a
      // real batch always carries a batch_id (and this endpoint has no filter,
      // so an existing batch always yields its rows). Same payload, signed
      // receipt records the no-charge.
      if (result.batch_id === null) {
        return await premiumResponse(result, payment, 1, request, env, 'empty_result');
      }
      ctx.waitUntil(
        logPremiumUsage(env, '/api/premium/ai-cves/ai-stack-cves', request.headers.get('User-Agent') || 'unknown', 1, payment.token, payment.payerWallet),
      );
      // Pass the DP CC batch extraction time so the 10-day staleness SLA can
      // no-charge a stalled extraction pipeline. extracted_at is the batch's
      // own data-capture time (set at ingest), not a response timestamp. Same
      // contract the stack-safety-verdict sibling uses (capturedAt = extractedAt).
      return await premiumResponse(result, payment, 1, request, env, null, result.extracted_at);
    }

    // === PAID PREMIUM: EXPLOITED IN WILD (Tier 1, 1 credit) ==========
    // /api/premium/ai-cves/exploited-in-wild
    // Live-threat subset over the AI-flagged batch: only papers with
    // exploited_in_wild = stated_yes, sorted by severity_rank desc.

    if (path === '/api/premium/ai-cves/exploited-in-wild') {
      const payment = await requirePayment(request, env, 1);
      if (!payment.paid) return payment.response!;

      const { getExploitedInWildFromKv } = await import('./premium-ai-cves');
      const result = await getExploitedInWildFromKv(env);

      // AFTA empty_result no-charge: cold-start absence (no ai-flagged batch
      // ingested yet) returns the placeholder with batch_id:null. We key on
      // batch_id === null, NOT total === 0: when a batch exists the
      // exploited_in_wild filter legitimately yielding zero rows is a real
      // billable answer (the agent learns nothing is actively exploited), so
      // only the cold placeholder is no-charge.
      if (result.batch_id === null) {
        return await premiumResponse(result, payment, 1, request, env, 'empty_result');
      }
      ctx.waitUntil(
        logPremiumUsage(env, '/api/premium/ai-cves/exploited-in-wild', request.headers.get('User-Agent') || 'unknown', 1, payment.token, payment.payerWallet),
      );
      // Pass the DP CC batch extraction time so the 10-day staleness SLA can
      // no-charge a stalled extraction pipeline. extracted_at is the batch's
      // own data-capture time, not a response timestamp. Same contract as
      // the stack-safety-verdict sibling (capturedAt = extractedAt).
      return await premiumResponse(result, payment, 1, request, env, null, result.extracted_at);
    }

    // === PAID PREMIUM: CVE LOOKUP (Tier 1, 1 credit, param-required) =
    // /api/premium/ai-cves/cve?id=CVE-YYYY-NNNNN
    // Single-CVE resolve via the persistent index. Param-required, so
    // MUST be strict-premium (and is, per strict-premium-endpoints.ts)
    // so anonymous probes see 402 not 400.

    if (path === '/api/premium/ai-cves/cve') {
      // requirePayment FIRST so anonymous strict-premium probes see a clean
      // 402 challenge before any param validation. Missing-param 400 BEFORE
      // payment was the pay-skills #68 failure mode (audit CR-1, 2026-05-26).
      const payment = await requirePayment(request, env, 1);
      if (!payment.paid) return payment.response!;

      const id = url.searchParams.get('id');
      if (!id || !/^CVE-\d{4}-\d{4,7}$/i.test(id.trim())) {
        return await premiumValidationFailure(
          {
            ok: false,
            error: 'missing_params',
            hint: 'Pass id=CVE-YYYY-NNNNN. CVE IDs are case-insensitive (normalized to uppercase internally).',
          },
          payment,
          request,
          env,
        );
      }

      const { lookupCve } = await import('./premium-ai-cves');
      const result = await lookupCve(env, id);

      // AFTA empty_result no-charge: the id passed regex validation above, so a
      // not-found (no entry in TF's cve-index) is a valid query with no data,
      // not a malformed request. Mirror security/epss/series' cve_not_in_epss
      // -> empty_result convention (valid id, absent from this dataset) and
      // route through premiumValidationFailure so the no-charge is ledgered and
      // the signed receipt records empty_result. Same found:false payload, 404.
      if (!result.found) {
        return await premiumValidationFailure(
          { ok: false, error: 'cve_not_found', ...result },
          payment,
          request,
          env,
          'empty_result',
          404,
        );
      }
      ctx.waitUntil(
        logPremiumUsage(env, '/api/premium/ai-cves/cve', request.headers.get('User-Agent') || 'unknown', 1, payment.token, payment.payerWallet),
      );
      // Pass the resolved batch's extraction time so the 10-day staleness SLA
      // can no-charge a stalled extraction pipeline. extracted_at is the DP CC
      // batch data-capture time surfaced by lookupCve, not a response timestamp.
      return await premiumResponse(result, payment, 1, request, env, null, result.extracted_at);
    }

    // === FREE: AI CRAWLER ACCESS MAP, SUMMARY ===
    // /api/ai-crawler-access/summary.json
    // Aggregate map of which AI bots curated domains allow or block in
    // robots.txt, plus llms.txt and ai.txt adoption. No params. We report
    // stated policy, not enforcement.
    if (path === '/api/ai-crawler-access/summary.json') {
      const { readSnapshot } = await import('./ai-crawler-access-feed');
      const { buildSummaryResponse, SEED_COUNT } = await import('./premium-ai-crawler-access');
      const snap = await readSnapshot(env);
      return jsonResponse(buildSummaryResponse(snap, SEED_COUNT), 200, 6 * 60 * 60);
    }

    // === FREE: AI CRAWLER ACCESS MAP, SITE ===
    // /api/ai-crawler-access/site?domain=
    // Per-site robots.txt verdict for each tracked AI bot, plus llms.txt
    // and ai.txt presence, for one domain. Param-required: domain.
    if (path === '/api/ai-crawler-access/site') {
      const domain = url.searchParams.get('domain');
      if (!domain) return jsonResponse({ ok: false, error: 'missing_domain', hint: 'Pass ?domain=example.com' }, 400);
      const { readSnapshot } = await import('./ai-crawler-access-feed');
      const { buildSiteResponse } = await import('./premium-ai-crawler-access');
      const snap = await readSnapshot(env);
      return jsonResponse(buildSiteResponse(snap, domain), 200, 6 * 60 * 60);
    }

    // === FREE: AI CRAWLER ACCESS MAP, ON-DEMAND CHECK ===
    // /api/ai-crawler-access/check?domain=
    // Live on-demand robots.txt verdict for any public domain not in the
    // tracked seed set. SSRF-guarded validator rejects IPs, localhost,
    // internal suffixes, and underscores. Per-domain 1h Cache-API
    // memoization so repeat checks do not re-crawl the upstream site.
    if (path === '/api/ai-crawler-access/check') {
      const { validateCheckDomain, checkDomainLive } = await import('./ai-crawler-access-check');
      const v = validateCheckDomain(url.searchParams.get('domain') || '');
      if (!v.ok) return jsonResponse({ ok: false, error: v.error, hint: 'Pass ?domain=example.com (public hostname only)' }, 400);
      // 1h edge memoization per domain so repeat checks do not re-crawl
      const cache = caches.default;
      const cacheKey = new Request(`https://tensorfeed.ai/api/ai-crawler-access/check?domain=${v.domain}`, { method: 'GET' });
      const hit = await cache.match(cacheKey);
      if (hit) return hit;
      const record = await checkDomainLive(env, v.domain);
      const result = {
        ok: true, domain: v.domain, found: true, tracked: false, record,
        source_attribution: 'TensorFeed AI Crawler Access Map. Live robots.txt, llms.txt, and ai.txt crawl. We report stated policy, not enforcement.',
      };
      const resp = jsonResponse(result, 200, 60 * 60);
      ctx.waitUntil(cache.put(cacheKey, resp.clone()));
      return resp;
    }

    // === PAID PREMIUM: AI CRAWLER ACCESS MAP, FULL (Tier 1, 1 credit) ===
    // /api/premium/ai-crawler-access/full
    // Every tracked domain with per-bot robots.txt verdicts and
    // llms.txt/ai.txt flags, plus sector rollups. captured_at carries the
    // real data-capture time (snapshot.dataCapturedAt); a null snapshot
    // passes empty_result so an empty call is never billed.
    if (path === '/api/premium/ai-crawler-access/full') {
      const payment = await requirePayment(request, env, 1);
      if (!payment.paid) return payment.response!;
      const { readSnapshot } = await import('./ai-crawler-access-feed');
      const { buildFullResponse } = await import('./premium-ai-crawler-access');
      const snap = await readSnapshot(env);
      const result = buildFullResponse(snap);
      ctx.waitUntil(logPremiumUsage(env, '/api/premium/ai-crawler-access/full', request.headers.get('User-Agent') || 'unknown', 1, payment.token, payment.payerWallet));
      // captured_at carries the real data time; null snapshot => empty_result no-charge
      return await premiumResponse(result, payment, 1, request, env, snap ? null : 'empty_result');
    }

    // === PAID PREMIUM: AI CRAWLER ACCESS MAP, CHANGES (Tier 1, 1 credit) ===
    // /api/premium/ai-crawler-access/changes?domain=&from=&to=
    // Historical flip log: when a site changed a bot from allowed to
    // blocked (or back) or published llms.txt, within a date range.
    // Param-required (from, to; domain optional), so strict-premium gates
    // anonymous crawlers to a clean 402 instead of a 400. captured_at
    // carries the real data-capture time; no matching flips pass
    // empty_result so an empty window is never billed.
    if (path === '/api/premium/ai-crawler-access/changes') {
      const payment = await requirePayment(request, env, 1);
      if (!payment.paid) return payment.response!;
      const from = url.searchParams.get('from');
      const to = url.searchParams.get('to');
      const domain = url.searchParams.get('domain');  // optional
      if (!from || !to) {
        return premiumValidationFailure({ ok: false, error: 'missing_params', hint: 'Pass ?from=YYYY-MM-DD&to=YYYY-MM-DD (domain optional)' }, payment, request, env);
      }
      const { readFlips, readSnapshot } = await import('./ai-crawler-access-feed');
      const { buildChangesResponse } = await import('./premium-ai-crawler-access');
      const [flips, snap] = await Promise.all([readFlips(env), readSnapshot(env)]);
      const result = buildChangesResponse(flips, domain, from, to, snap?.dataCapturedAt ?? null);
      ctx.waitUntil(logPremiumUsage(env, '/api/premium/ai-crawler-access/changes', request.headers.get('User-Agent') || 'unknown', 1, payment.token, payment.payerWallet));
      return await premiumResponse(result, payment, 1, request, env, result.has_data ? null : 'empty_result');
    }

    // === AGENT-READY WEB MAP (derived over the crawler-access snapshot) ===
    // Free summary: agentic-web readiness across curated domains. Per-surface
    // adoption, tier distribution, and a top-25 leaderboard. No params.
    if (path === '/api/agent-ready/summary.json') {
      const { readSnapshot } = await import('./ai-crawler-access-feed');
      const { buildAgentReadySummary } = await import('./agent-ready');
      const { SEED_COUNT } = await import('./premium-ai-crawler-access');
      const snap = await readSnapshot(env);
      return jsonResponse(buildAgentReadySummary(snap, SEED_COUNT), 200, 6 * 60 * 60);
    }

    // Free per-domain readiness profile (0-100 score, tier, surface flags).
    if (path === '/api/agent-ready/site') {
      const domain = url.searchParams.get('domain');
      if (!domain) return jsonResponse({ ok: false, error: 'missing_domain', hint: 'Pass ?domain=example.com' }, 400);
      const { readSnapshot } = await import('./ai-crawler-access-feed');
      const { buildAgentReadySite } = await import('./agent-ready');
      const snap = await readSnapshot(env);
      return jsonResponse(buildAgentReadySite(snap, domain), 200, 6 * 60 * 60);
    }

    // Premium full dataset: every profiled domain with score and surface flags.
    // captured_at carries the real data-capture time (snapshot.dataCapturedAt),
    // never wall-clock; an absent snapshot passes empty_result so a payer is
    // never billed for nothing. 8-day freshness SLA, no-charge when stale.
    if (path === '/api/premium/agent-ready/full') {
      const payment = await requirePayment(request, env, 1);
      if (!payment.paid) return payment.response!;
      const { readSnapshot } = await import('./ai-crawler-access-feed');
      const { buildAgentReadyFull } = await import('./agent-ready');
      const snap = await readSnapshot(env);
      const result = buildAgentReadyFull(snap);
      ctx.waitUntil(logPremiumUsage(env, '/api/premium/agent-ready/full', request.headers.get('User-Agent') || 'unknown', 1, payment.token, payment.payerWallet));
      return await premiumResponse(result, payment, 1, request, env, snap ? null : 'empty_result');
    }

    // === FREE: SEC FILINGS EXTRACTION INDEX ===
    // /api/sec/filings/extraction-index?limit=&offset=
    // Lightweight discovery surface over the DP CC Qwen-extracted cohort.
    // Returns accession + form + ticker + filing_date + ai_relevant flag
    // per filing so agents can decide which premium ai-disclosures
    // lookups are worth a credit. Full cohort lives behind the premium
    // ai-flagged endpoint. Capped at 100 entries per call.
    if (path === '/api/sec/filings/extraction-index') {
      const rawLimit = parseInt(url.searchParams.get('limit') ?? '', 10);
      const rawOffset = parseInt(url.searchParams.get('offset') ?? '', 10);
      const { getIndexResponse } = await import('./premium-sec-filings');
      const result = await getIndexResponse(env, rawLimit, rawOffset);
      return jsonResponse({ ok: true, ...result }, 200, 300);
    }

    // === PAID PREMIUM: SEC FILINGS AI-FLAGGED COHORT (Tier 1, 1 credit) ====
    // /api/premium/sec/filings/ai-flagged?ticker=&form=&since=&min_score=
    //
    // Full AI-flagged filings cohort from the DP CC Qwen extraction.
    // Each filing carries the verbatim AI-capex / AI-revenue /
    // AI-partnership / AI-chip / new-AI-product / AI-workforce mention
    // arrays plus key_quotes. Optional filters: ticker (case-insensitive
    // exact), form (e.g. 10-K), since (YYYY-MM-DD, inclusive lower bound
    // on filing_date), min_score (0-100, inclusive lower bound on
    // ai_relevance_score). Sorted by filing_date desc, score desc.
    if (path === '/api/premium/sec/filings/ai-flagged') {
      const payment = await requirePayment(request, env, 1);
      if (!payment.paid) return payment.response!;

      const {
        getAiFlaggedResponse,
        parseTickerFilter,
        parseFormFilter,
        parseSinceFilter,
        parseMinScoreFilter,
      } = await import('./premium-sec-filings');
      const result = await getAiFlaggedResponse(env, {
        ticker: parseTickerFilter(url.searchParams.get('ticker')),
        form: parseFormFilter(url.searchParams.get('form')),
        since: parseSinceFilter(url.searchParams.get('since')),
        min_score: parseMinScoreFilter(url.searchParams.get('min_score')),
      });

      // AFTA empty_result no-charge: zero filings after filtering (covers both
      // cold start, where the snapshot is absent and the cohort is all-zero,
      // and a valid filter that matched nothing). Same payload, signed receipt
      // records the no-charge.
      if (result.cohort.total_after_filter === 0) {
        return await premiumResponse(result, payment, 1, request, env, 'empty_result');
      }
      ctx.waitUntil(
        logPremiumUsage(env, '/api/premium/sec/filings/ai-flagged', request.headers.get('User-Agent') || 'unknown', 1, payment.token, payment.payerWallet),
      );
      return await premiumResponse(result, payment, 1, request, env);
    }

    // === PAID PREMIUM: SEC FILINGS BY-FORM ROLLUP (Tier 1, 1 credit, param-required) ==
    // /api/premium/sec/filings/by-form?form=10-K[&ticker=]
    //
    // Per-form-type rollup over the AI-flagged cohort. Each entry:
    // total_filings, ai_relevant_count, avg_ai_relevance_score, totals
    // for capex / revenue / partnership / chip mentions, top_filings
    // (top 3 by ai_relevance_score). Param-required so anonymous Bazaar
    // crawlers see clean 402 not partial 200.
    if (path === '/api/premium/sec/filings/by-form') {
      // requirePayment FIRST (audit CR-1, 2026-05-26).
      const payment = await requirePayment(request, env, 1);
      if (!payment.paid) return payment.response!;

      const form = url.searchParams.get('form');
      if (!form || form.trim().length === 0) {
        return await premiumValidationFailure(
          {
            ok: false,
            error: 'missing_params',
            hint: 'Pass form=10-K (or 8-K, 10-Q, S-1, DEF 14A, etc).',
          },
          payment,
          request,
          env,
        );
      }

      const { getByFormResponse, parseTickerFilter, parseFormFilter } = await import('./premium-sec-filings');
      const result = await getByFormResponse(env, {
        ticker: parseTickerFilter(url.searchParams.get('ticker')),
        form: parseFormFilter(form),
      });

      ctx.waitUntil(
        logPremiumUsage(env, '/api/premium/sec/filings/by-form', request.headers.get('User-Agent') || 'unknown', 1, payment.token, payment.payerWallet),
      );
      return await premiumResponse(result, payment, 1, request, env);
    }

    // === PAID PREMIUM: SEC FILING AI DISCLOSURES (Tier 1, 1 credit, param-required) ==
    // /api/premium/sec/filings/ai-disclosures?accession=NNNNNNNNNN-NN-NNNNNN
    //
    // Single-filing dossier lookup. Returns the full FilingExtraction
    // for one accession_number (Qwen-extracted AI mentions + verbatim
    // key_quotes). Param-required so strict-premium gating is mandatory.
    if (path === '/api/premium/sec/filings/ai-disclosures') {
      // requirePayment FIRST (audit CR-1, 2026-05-26).
      const payment = await requirePayment(request, env, 1);
      if (!payment.paid) return payment.response!;

      const accession = url.searchParams.get('accession');
      if (!accession || !/^\d{10}-\d{2}-\d{6}$/.test(accession.trim())) {
        return await premiumValidationFailure(
          {
            ok: false,
            error: 'missing_params',
            hint: 'Pass accession=NNNNNNNNNN-NN-NNNNNN (SEC EDGAR accession number).',
          },
          payment,
          request,
          env,
        );
      }

      const { lookupFiling } = await import('./premium-sec-filings');
      const result = await lookupFiling(env, accession.trim());

      // AFTA empty_result no-charge: the accession passed the format check
      // above, so a not-found (no extraction for this accession) is a valid
      // query with no data, not a malformed request. Mirror the single-record
      // not-found convention (clean/cve, epss/series) and route through
      // premiumValidationFailure with empty_result so the no-charge is ledgered
      // and the receipt records it. Same found:false payload, 404.
      if (!result.found) {
        return await premiumValidationFailure(
          { ok: false, error: 'filing_not_found', ...result },
          payment,
          request,
          env,
          'empty_result',
          404,
        );
      }
      ctx.waitUntil(
        logPremiumUsage(env, '/api/premium/sec/filings/ai-disclosures', request.headers.get('User-Agent') || 'unknown', 1, payment.token, payment.payerWallet),
      );
      return await premiumResponse(result, payment, 1, request, env);
    }

    // === GUIDANCE-DELTA PREVIEW (free, rate-limited) ===
    // /api/preview/sec/filings/guidance-delta?accession= OR ?ticker=&form=
    //
    // Free taste of the periodic-filing guidance delta: the deterministic
    // materiality_summary (counts plus a one-line headline) and the
    // per-change {category, change_type, direction, materiality} profile,
    // WITHOUT the verbatim prior/current quotes, the prior/current values,
    // or the AFTA-signed receipt. 10 calls/day per IP. The paid endpoint
    // adds the quotes (the citeable evidence), the values, and the receipt.
    if (path === '/api/preview/sec/filings/guidance-delta') {
      const gdIp = getClientIP(request);
      const {
        getGuidanceDelta,
        resolveLatestDelta,
        checkGuidanceDeltaSupersession,
        buildGuidanceDeltaResponse,
        redactGuidanceDeltaForPreview,
        checkGuidanceDeltaPreviewRateLimit,
      } = await import('./sec-guidance-delta');
      const gdLimit = await checkGuidanceDeltaPreviewRateLimit(env, gdIp, 10);
      if (!gdLimit.allowed) {
        return jsonResponse(
          {
            ok: false,
            error: 'rate_limit_exceeded',
            limit: gdLimit.limit,
            remaining: 0,
            reset_in_hours: hoursUntilUTCRollover(),
            premium_endpoint: '/api/premium/sec/filings/guidance-delta',
            message:
              'Free preview limited to 10 calls/day per IP. The paid /api/premium/sec/filings/guidance-delta adds the verbatim prior and current quotes, the prior and current values, an AFTA-signed receipt, and no rate limit.',
          },
          429,
        );
      }
      const gdAccession = url.searchParams.get('accession');
      const gdTicker = url.searchParams.get('ticker');
      const gdForm = url.searchParams.get('form');
      let gdDelta: Awaited<ReturnType<typeof getGuidanceDelta>> = null;
      if (gdAccession) {
        if (!/^\d{10}-\d{2}-\d{6}$/.test(gdAccession.trim())) {
          return jsonResponse({ ok: false, error: 'bad_accession', hint: 'accession=NNNNNNNNNN-NN-NNNNNN' }, 400, 0);
        }
        gdDelta = await getGuidanceDelta(env, gdAccession.trim());
      } else if (gdTicker && gdForm) {
        gdDelta = await resolveLatestDelta(env, gdTicker, gdForm);
      } else {
        return jsonResponse(
          { ok: false, error: 'missing_params', hint: 'provide ?accession=NNNNNNNNNN-NN-NNNNNN or ?ticker=NVDA&form=10-Q' },
          400,
          0,
        );
      }
      if (!gdDelta) {
        return jsonResponse(
          {
            ok: false,
            error: 'not_found',
            message: 'No guidance delta available for that query yet.',
            query: { accession: gdAccession, ticker: gdTicker, form: gdForm },
          },
          404,
          0,
        );
      }
      const gdSupersession = gdAccession
        ? { superseded: false, checked: false, latest_same_form_accession: null, latest_same_form_filing_date: null }
        : await checkGuidanceDeltaSupersession(env, gdDelta);
      const gdFull = buildGuidanceDeltaResponse(gdDelta, gdSupersession);
      const gdPreview = redactGuidanceDeltaForPreview(gdFull);
      return jsonResponse(
        {
          ...gdPreview,
          rate_limit: { limit: gdLimit.limit, remaining: gdLimit.remaining, scope: 'per IP per UTC day' },
          upgrade: {
            premium_endpoint: '/api/premium/sec/filings/guidance-delta',
            adds: [
              'verbatim prior and current quotes',
              'prior and current values',
              'section labels',
              'AFTA-signed receipt',
              'no rate limit',
            ],
          },
        },
        200,
        0, // do not Cache-API; rate limiting is per IP
      );
    }

    // === SSVC DECISION VERDICT PREVIEW (free, rate-limited) ===
    // /api/preview/security/ssvc-verdict?cve=CVE-YYYY-NNNNN
    //
    // Free taste of the SSVC verdict: the three public CISA decision points and
    // the tree provenance, WITHOUT the computed decision, the Mission and
    // Well-being envelope, the reasoning, or the AFTA receipt. 10 calls/day per
    // IP. The paid endpoint computes and signs the decision.
    if (path === '/api/preview/security/ssvc-verdict') {
      const svIp = getClientIP(request);
      const { parseSsvcFromVulnrichment, buildSsvcVerdict, redactSsvcVerdictForPreview, checkSsvcVerdictPreviewRateLimit } =
        await import('./ssvc-verdict');
      const { fetchVulnrichment, normalizeCVEId } = await import('./security-vulnrichment');
      const svLimit = await checkSsvcVerdictPreviewRateLimit(env, svIp, 10);
      if (!svLimit.allowed) {
        return jsonResponse(
          {
            ok: false,
            error: 'rate_limit_exceeded',
            limit: svLimit.limit,
            remaining: 0,
            reset_in_hours: hoursUntilUTCRollover(),
            premium_endpoint: '/api/premium/security/ssvc-verdict',
            message:
              'Free preview limited to 10 calls/day per IP. The paid /api/premium/security/ssvc-verdict adds the computed SSVC decision, the full Mission and Well-being envelope, the per-level reasoning, an AFTA-signed receipt, and no rate limit.',
          },
          429,
        );
      }
      const svCveRaw = url.searchParams.get('cve');
      const svCve = svCveRaw ? normalizeCVEId(svCveRaw) : null;
      if (!svCve) {
        return jsonResponse({ ok: false, error: 'invalid_cve_id', hint: 'cve=CVE-YYYY-NNNNN' }, 400, 0);
      }
      const svRecord = await fetchVulnrichment(env, svCve);
      if (!svRecord.ok || !svRecord.record) {
        return jsonResponse(
          { ok: false, error: 'cve_not_in_vulnrichment', message: 'No CISA Vulnrichment record for that CVE.', cve: svCve },
          404,
          0,
        );
      }
      const svPoints = parseSsvcFromVulnrichment(svRecord.record);
      if (!svPoints) {
        return jsonResponse(
          { ok: false, error: 'no_ssvc_data', message: 'That CVE has a Vulnrichment record but no SSVC decision points.', cve: svCve },
          404,
          0,
        );
      }
      const svPreview = redactSsvcVerdictForPreview(buildSsvcVerdict(svCve, svPoints));
      return jsonResponse(
        {
          ...svPreview,
          rate_limit: { limit: svLimit.limit, remaining: svLimit.remaining, scope: 'per IP per UTC day' },
          upgrade: {
            premium_endpoint: '/api/premium/security/ssvc-verdict',
            adds: [
              'the computed SSVC decision (Act, Attend, Track, or Track*)',
              'the full Mission and Well-being envelope (low, medium, high)',
              'the per-level reasoning trace',
              'an AFTA-signed receipt',
              'no rate limit',
            ],
          },
        },
        200,
        0,
      );
    }

    // === PAID PREMIUM: GUIDANCE DELTA (Tier 1, 1 credit, param-required) ===
    // /api/premium/sec/filings/guidance-delta?accession= OR ?ticker=&form=
    //
    // One signed verified decision for a finance agent: did this periodic
    // SEC filing (10-K or 10-Q) materially change guidance, segment outlook,
    // or risk language versus the prior same-form filing, with the exact
    // changed sentences quoted. Reads the DP CC Phi-4 extraction from the
    // sec-guidance-delta KV layout (verbatim prior/current text plus values
    // plus section, deterministic enums). Returns provenance, the full
    // changes array with the verbatim quotes, a deterministic
    // materiality_summary (counts plus a one-line headline that never
    // asserts an unreliable risk added/removed count), and an AFTA-signed
    // receipt over the inputs.
    //
    // Freshness is INPUT-KEYED, not wall-clock: a filed 10-Q does not
    // change, so per-accession data is immutable (mapped to NULL_SLA). In
    // ?ticker=&form= mode the handler checks EDGAR for a newer same-form
    // filing; if one exists that has not been processed yet, the served
    // delta is behind the latest filing and the call is no-charge
    // (stale_data). Param-required, so strict-premium.
    if (path === '/api/premium/sec/filings/guidance-delta') {
      const payment = await requirePayment(request, env, 1);
      if (!payment.paid) return payment.response!;

      const {
        getGuidanceDelta,
        resolveLatestDelta,
        checkGuidanceDeltaSupersession,
        buildGuidanceDeltaResponse,
      } = await import('./sec-guidance-delta');

      const gdAccession = url.searchParams.get('accession');
      const gdTicker = url.searchParams.get('ticker');
      const gdForm = url.searchParams.get('form');

      let gdDelta: Awaited<ReturnType<typeof getGuidanceDelta>> = null;
      let gdLatestMode = false;
      if (gdAccession) {
        if (!/^\d{10}-\d{2}-\d{6}$/.test(gdAccession.trim())) {
          return await premiumValidationFailure(
            { error: 'bad_accession', hint: 'accession=NNNNNNNNNN-NN-NNNNNN (SEC EDGAR accession number)' },
            payment,
            request,
            env,
          );
        }
        gdDelta = await getGuidanceDelta(env, gdAccession.trim());
      } else if (gdTicker && gdForm) {
        gdLatestMode = true;
        gdDelta = await resolveLatestDelta(env, gdTicker, gdForm);
      } else {
        return await premiumValidationFailure(
          { error: 'missing_params', hint: 'provide ?accession=NNNNNNNNNN-NN-NNNNNN or ?ticker=NVDA&form=10-Q' },
          payment,
          request,
          env,
        );
      }

      if (!gdDelta) {
        // Valid request, but no delta exists for it yet (cohort not
        // extracted, or off-cohort ticker). No-charge: there is no answer
        // to sell. upstream_failure marks it free on the AFTA ledger.
        return await premiumValidationFailure(
          {
            error: 'not_found',
            message: 'No guidance delta available for that query yet.',
            query: { accession: gdAccession, ticker: gdTicker, form: gdForm },
          },
          payment,
          request,
          env,
          'upstream_failure',
          404,
        );
      }

      const gdSupersession = gdLatestMode
        ? await checkGuidanceDeltaSupersession(env, gdDelta)
        : { superseded: false, checked: false, latest_same_form_accession: null, latest_same_form_filing_date: null };
      const gdResult = buildGuidanceDeltaResponse(gdDelta, gdSupersession);

      // Input-keyed no-charge: if a newer same-form filing supersedes this
      // delta, the agent's "latest" request cannot be honestly fulfilled, so do
      // not charge AND do not log usage. logPremiumUsage previously fired before
      // the no-charge, over-counting the revenue rollup against a 0-credit debit.
      if (gdSupersession.superseded) {
        return await premiumResponse(gdResult, payment, 1, request, env, 'stale_data');
      }
      ctx.waitUntil(
        logPremiumUsage(env, '/api/premium/sec/filings/guidance-delta', request.headers.get('User-Agent') || 'unknown', 1, payment.token, payment.payerWallet),
      );
      return await premiumResponse(gdResult, payment, 1, request, env);
    }

    // === PAID PREMIUM: SSVC DECISION VERDICT (Tier 1, 1 credit, param-required) ===
    // /api/premium/security/ssvc-verdict?cve=CVE-YYYY-NNNNN
    //
    // One signed verified decision for a security agent: should this CVE be
    // patched now? Reads the three SSVC decision points CISA records in its
    // Vulnrichment data, applies the CISA SSVC Coordinator decision tree, and
    // returns the decision across the full Mission and Well-being envelope
    // (CISA omits M&W from the record, so the envelope is the honest form).
    // Param-required, so strict-premium. NULL_SLA: a scored record is immutable,
    // dataCapturedAt is CISA's scoring timestamp for the receipt only.
    if (path === '/api/premium/security/ssvc-verdict') {
      const payment = await requirePayment(request, env, 1);
      if (!payment.paid) return payment.response!;

      const { parseSsvcFromVulnrichment, buildSsvcVerdict, kevCrossCheck } = await import('./ssvc-verdict');
      const { fetchVulnrichment, normalizeCVEId } = await import('./security-vulnrichment');

      const svCveRaw = url.searchParams.get('cve');
      const svCve = svCveRaw ? normalizeCVEId(svCveRaw) : null;
      if (!svCve) {
        return await premiumValidationFailure(
          { error: 'invalid_cve_id', hint: 'cve=CVE-YYYY-NNNNN (e.g. CVE-2024-3094)' },
          payment,
          request,
          env,
        );
      }

      const svRecord = await fetchVulnrichment(env, svCve);
      if (!svRecord.ok || !svRecord.record) {
        // A genuine "no record" is not in the dataset (empty_result); a fetch
        // error from GitHub is upstream_failure. Both no-charge.
        const isUpstream = typeof svRecord.error === 'string' && svRecord.error.startsWith('vulnrichment_');
        return await premiumValidationFailure(
          isUpstream
            ? { error: 'upstream_failure', message: 'CISA Vulnrichment fetch failed; try again shortly.', cve: svCve }
            : { error: 'cve_not_in_vulnrichment', message: 'No CISA Vulnrichment record for that CVE.', cve: svCve },
          payment,
          request,
          env,
          isUpstream ? 'upstream_failure' : 'empty_result',
          isUpstream ? 502 : 404,
        );
      }

      const svPoints = parseSsvcFromVulnrichment(svRecord.record);
      if (!svPoints) {
        return await premiumValidationFailure(
          { error: 'no_ssvc_data', message: 'That CVE has a Vulnrichment record but no SSVC decision points.', cve: svCve },
          payment,
          request,
          env,
          'empty_result',
          404,
        );
      }

      const svVerdict = buildSsvcVerdict(svCve, svPoints);

      // v1.1 KEV staleness overlay: cross-check the recorded Exploitation
      // against the current CISA KEV snapshot (one KV read). Best-effort: a KEV
      // read failure never fails or no-charges the call; the CISA decision is
      // the product, the overlay is a bonus. Uses readKEVCurrent (not
      // readKEVByCVE) so "not on KEV" is distinguishable from "snapshot missing".
      let svKevLookup: { available: boolean; entry: { dateAdded: string } | null; catalog_date: string | null } = {
        available: false,
        entry: null,
        catalog_date: null,
      };
      try {
        const { readKEVCurrent } = await import('./security-kev');
        const svKevCatalog = await readKEVCurrent(env);
        if (svKevCatalog) {
          const svKevHit = svKevCatalog.vulnerabilities.find((v) => v.cveID?.toUpperCase() === svCve.toUpperCase()) ?? null;
          svKevLookup = {
            available: true,
            entry: svKevHit ? { dateAdded: svKevHit.dateAdded } : null,
            catalog_date: svKevCatalog.dateReleased ?? null,
          };
        }
      } catch {
        // best-effort: leave svKevLookup as unavailable
      }
      const svVerdictWithOverlay = { ...svVerdict, kev_cross_check: kevCrossCheck(svPoints, svKevLookup) };

      ctx.waitUntil(
        logPremiumUsage(
          env,
          '/api/premium/security/ssvc-verdict',
          request.headers.get('User-Agent') || 'unknown',
          1,
          payment.token,
          payment.payerWallet,
        ),
      );
      // dataCapturedAt = CISA's SSVC scoring timestamp (real data time, never
      // build time). NULL_SLA, so this never spuriously no-charges; it gives the
      // receipt an honest captured_at.
      return await premiumResponse(svVerdictWithOverlay, payment, 1, request, env, null, svVerdict.scored_at || null);
    }

    // === PAID PREMIUM: AI COMPANIES PER-TICKER ENVELOPE (Tier 1, 1 credit) ===
    // /api/premium/ai-companies/{ticker}
    //
    // Single-call aggregated intelligence envelope for one AI bellwether.
    // Composes four free siblings into one captured-at snapshot: latest
    // 10 SEC filings (from data.sec.gov, public domain), latest 10 news
    // mentions filtered by curated aliases (so PLTR does not match
    // "palantir cookies"), strategic and equity rounds where the
    // company is a lead or notable investor in TF's funding registry,
    // and cohort metadata (display name, CIK, category, AI angle).
    //
    // Worth a credit because a Robinhood-Agentic-Trading agent doing
    // pre-trade context for NVDA otherwise issues 3 separate free
    // calls plus its own alias filter, then races 3 different freshness
    // boundaries. The envelope is one call, alias-filtered, one SLA.
    //
    // Strict-premium prefix /api/premium/ai-companies/ is registered in
    // strict-premium-endpoints.ts, so anonymous Bazaar probes see a 402
    // challenge instead of the free-trial pool.
    const aiCompanyMatch = path.match(/^\/api\/premium\/ai-companies\/([A-Za-z]{1,10})$/);
    if (aiCompanyMatch) {
      const ticker = aiCompanyMatch[1].toUpperCase();

      const { isInCohort, getAiCompanyEnvelope } = await import('./premium-ai-companies');
      if (!isInCohort(ticker)) {
        // No-payment 404 BEFORE requirePayment so off-cohort tickers
        // never debit. Cohort hint follows the SEC sibling's pattern.
        return jsonResponse(
          {
            ok: false,
            error: 'ticker_not_in_cohort',
            ticker,
            hint: 'TensorFeed tracks a curated AI bellwether cohort. See cohort_tickers in /api/sec/filings/recent for the supported list.',
          },
          404,
        );
      }

      const payment = await requirePayment(request, env, 1);
      if (!payment.paid) return payment.response!;

      const envelope = await getAiCompanyEnvelope(env, ticker);
      if (envelope === null) {
        // Belt-and-suspenders: cohort check passed but envelope build
        // failed (would only happen on a race or KV outage). 503 not
        // 404; deferred-debit means no charge.
        return jsonResponse(
          {
            ok: false,
            error: 'envelope_unavailable',
            ticker,
            hint: 'Envelope build failed unexpectedly. Retry after the next cron tick at :05 UTC of any 6-hour boundary.',
          },
          503,
        );
      }

      ctx.waitUntil(
        logPremiumUsage(env, '/api/premium/ai-companies', request.headers.get('User-Agent') || 'unknown', 1, payment.token, payment.payerWallet),
      );
      return await premiumResponse(envelope, payment, 1, request, env);
    }

    // === FREE: x402 SETTLEMENT INDEX (Wave 20) ===
    // Ecosystem-level index of x402 USDC settlements on Base mainnet.
    // The indexer cron writes daily + per-publisher rollups to KV; these
    // routes serve them. Dynamic import() so cold-start cost of the
    // x402-index query module is deferred until the first call lands.

    if (path === '/api/x402-index/summary') {
      const window = (url.searchParams.get('window') ?? '24h') as '24h' | '7d' | '30d';
      if (window !== '24h' && window !== '7d' && window !== '30d') {
        return jsonResponse({ ok: false, error: 'invalid_window', hint: 'window must be one of: 24h, 7d, 30d' }, 400, 0);
      }
      const { getSummary } = await import('./x402-index/query');
      // Cache-API read layer: a hit serves the computed summary with ZERO KV
      // gets (vs up to 2x30 day-rollup reads on a cold miss). captured_at is
      // cursor-sourced (audit #15), so a <=60s cached value still reflects real
      // index freshness. Falls through to a live read in unit tests.
      const result = await cachedFetch(`x402idx:summary:${window}`, 60, () => getSummary(env, window));
      return jsonResponse({ ok: true, ...result }, 200, 60);
    }

    if (path === '/api/x402-index/publishers') {
      const { getPublishers } = await import('./x402-index/query');
      const result = await cachedFetch('x402idx:publishers', 300, () => getPublishers(env));
      return jsonResponse({ ok: true, ...result }, 200, 300);
    }

    if (path === '/api/x402-index/leaderboard') {
      const window = (url.searchParams.get('window') ?? '24h') as '24h' | '7d' | '30d';
      if (window !== '24h' && window !== '7d' && window !== '30d') {
        return jsonResponse({ ok: false, error: 'invalid_window', hint: 'window must be one of: 24h, 7d, 30d' }, 400, 0);
      }
      const limitParam = parseInt(url.searchParams.get('limit') ?? '10', 10);
      const limit = Number.isFinite(limitParam) && limitParam > 0 ? Math.min(limitParam, 25) : 10;
      const { getLeaderboard } = await import('./x402-index/query');
      // Cache key includes window AND the clamped limit (both shape leaders[]).
      // A hit serves the result with ZERO KV gets, which matters most here since
      // the full-rollup aggregation fans out (publisher count) x (window days).
      const result = await cachedFetch(`x402idx:leaderboard:${window}:${limit}`, 60, () => getLeaderboard(env, window, limit));
      return jsonResponse({ ok: true, ...result }, 200, 60);
    }

    if (path === '/api/x402-index/recent') {
      const limitParam = parseInt(url.searchParams.get('limit') ?? '20', 10);
      const limit = Number.isFinite(limitParam) && limitParam > 0 ? Math.min(limitParam, 50) : 20;
      const { getRecent } = await import('./x402-index/query');
      const result = await cachedFetch(`x402idx:recent:${limit}`, 30, () => getRecent(env, limit));
      return jsonResponse({ ok: true, ...result }, 200, 30);
    }

    // === FREE: SUBSTRATE CHANGELOG (recent) ===
    // Most recent model lifecycle events (added, removed, repriced,
    // deprecated) and agent-protocol spec versions, newest first, plus the
    // current MCP / x402 / A2A spec versions. The || 20 coerces a NaN from a
    // garbage limit to the default before clamping, since getRecentChangelog
    // does not default NaN itself.
    if (path === '/api/substrate-changelog/recent') {
      const limit = Math.min(Math.max(parseInt(url.searchParams.get('limit') ?? '20', 10) || 20, 1), 50);
      const { getRecentChangelog } = await import('./substrate-changelog/query');
      const result = await cachedFetch('substrate-changelog:recent:' + limit, 60, () => getRecentChangelog(env, limit));
      return jsonResponse({ ok: true, ...result }, 200, 60);
    }

    if (path === '/api/x402-index/verified') {
      const { KV_KEY_VERIFIED } = await import('./x402-index/constants');
      const blob = await env.TENSORFEED_CACHE.get(KV_KEY_VERIFIED, 'json');
      if (!blob) {
        return jsonResponse({ ok: false, error: 'not_ready', hint: 'The verified directory precomputes daily; retry after the next 06:35 UTC cron.' }, 503, 0);
      }
      return jsonResponse(blob, 200, 300);
    }

    // === PAID PREMIUM: x402 SETTLEMENT INDEX (Wave 20, 1 credit each) ===
    // Both routes are param-required so strict-premium-endpoints.ts
    // (registered in Task 15) gates anonymous Bazaar probes to a clean
    // 402 challenge. Follows the AI-companies pattern: requirePayment
    // returns PaymentResult with .paid + .response, NOT a Response
    // instance check.

    const xIdxPubMatch = path.match(/^\/api\/premium\/x402-index\/publisher\/([A-Za-z0-9._-]+)$/);
    if (xIdxPubMatch) {
      const domain = xIdxPubMatch[1];

      // requirePayment FIRST: strict-premium, so an anonymous probe sees the
      // 402 challenge, not a 400. Param + range validation runs after as a
      // no-charge premiumValidationFailure, BEFORE the per-day KV fan-out
      // (audit #4: a wide range would otherwise issue thousands of reads).
      const payment = await requirePayment(request, env, 1);
      if (!payment.paid) return payment.response!;

      const from = url.searchParams.get('from');
      const to = url.searchParams.get('to');
      if (!from || !to) {
        return await premiumValidationFailure(
          { error: 'missing_params', required: ['from', 'to'], hint: 'Both from and to required, YYYY-MM-DD format.' },
          payment,
          request,
          env,
        );
      }

      const { getPublisherReceipts, validateRange, publisherReceiptsCacheKey } = await import('./x402-index/query');
      const range = validateRange(from, to);
      if (!range.ok) {
        return await premiumValidationFailure(
          { error: range.error, hint: range.hint },
          payment,
          request,
          env,
        );
      }

      // Cache-API read layer over the per-day KV fan-out. The cached value is the
      // public index data (identical per query), so it is shared across callers;
      // requirePayment above and premiumResponse below still run per request, and a
      // cached captured_at can only be older than live, so the freshness SLA can
      // only no-charge earlier, never wrong-charge. 60s TTL sits far inside the
      // 10-min x402-index SLA. An unknown publisher (null) is not effectively cached.
      const result = await cachedFetch(
        publisherReceiptsCacheKey(domain, from, to),
        60,
        () => getPublisherReceipts(env, domain, from, to),
      );
      if (result === null) {
        return await premiumValidationFailure(
          {
            error: 'unknown_publisher',
            domain,
            hint: 'Domain not present in the x402 publisher registry. See /api/x402-index/publishers for the indexed set.',
          },
          payment,
          request,
          env,
          'upstream_failure',
          404,
        );
      }

      // Known publisher but zero settlements in the window (a quiet publisher, or
      // a window before the 2026-05-28 forward-only index start): return the
      // empty receipt for free rather than charging for a no-data answer. has_data
      // is true iff at least one day in the window had a stored rollup (audit #16).
      if (!result.has_data) {
        return await premiumResponse({ ok: true, ...result }, payment, 1, request, env, 'empty_result');
      }

      ctx.waitUntil(
        logPremiumUsage(env, '/api/premium/x402-index/publisher', request.headers.get('User-Agent') || 'unknown', 1, payment.token, payment.payerWallet),
      );
      return await premiumResponse({ ok: true, ...result }, payment, 1, request, env);
    }

    if (path === '/api/premium/x402-index/series') {
      // requirePayment FIRST: strict-premium, so an anonymous probe sees the
      // 402 challenge, not a 400. Validation (incl. the range cap that bounds
      // the per-day KV fan-out, audit #4) runs after as a no-charge
      // premiumValidationFailure.
      const payment = await requirePayment(request, env, 1);
      if (!payment.paid) return payment.response!;

      const metricParam = url.searchParams.get('metric');
      const granularityParam = url.searchParams.get('granularity');
      const from = url.searchParams.get('from');
      const to = url.searchParams.get('to');
      const domain = url.searchParams.get('domain') ?? undefined;
      if (!metricParam || !granularityParam || !from || !to) {
        return await premiumValidationFailure(
          {
            error: 'missing_params',
            required: ['metric', 'granularity', 'from', 'to'],
            hint: 'metric=volume|count, granularity=day|hour, from/to in YYYY-MM-DD.',
          },
          payment,
          request,
          env,
        );
      }
      if (metricParam !== 'volume' && metricParam !== 'count') {
        return await premiumValidationFailure({ error: 'invalid_metric', hint: 'metric must be volume or count' }, payment, request, env);
      }
      if (granularityParam !== 'day' && granularityParam !== 'hour') {
        return await premiumValidationFailure({ error: 'invalid_granularity', hint: 'granularity must be day or hour' }, payment, request, env);
      }
      const metric: 'volume' | 'count' = metricParam;
      const granularity: 'day' | 'hour' = granularityParam;

      // Hour granularity is not built in the MVP. Route it to a no-charge rather
      // than billing 1 credit for a guaranteed-empty apology series (audit #16).
      if (granularity === 'hour') {
        return await premiumValidationFailure(
          { error: 'granularity_unavailable', granularity: 'hour', hint: 'Hour granularity is not yet available in the MVP; use granularity=day.' },
          payment,
          request,
          env,
        );
      }

      const { getSeries, validateRange, seriesCacheKey } = await import('./x402-index/query');
      // Bound the per-day KV fan-out (audit #4). Only day granularity reaches
      // here now (hour returned above), so validateRange always applies.
      const range = validateRange(from, to);
      if (!range.ok) {
        return await premiumValidationFailure({ error: range.error, hint: range.hint }, payment, request, env);
      }
      // Same Cache-API read layer as the publisher-receipts route: cache the
      // public per-query series behind the per-request billing gate. Only day
      // granularity reaches here (hour is rejected above), 60s TTL sits inside the
      // 10-min SLA, and a cached captured_at can only ever no-charge earlier.
      const seriesParams = { metric, granularity, from, to, domain };
      const result = await cachedFetch(
        seriesCacheKey(seriesParams),
        60,
        () => getSeries(env, seriesParams),
      );

      // Empty/uncovered window (pre-2026-05-28 dates, or a quiet domain): return
      // the empty series for free rather than charging for a no-data answer.
      // has_data is true iff at least one day had a stored rollup (audit #16).
      if (!result.has_data) {
        return await premiumResponse({ ok: true, ...result }, payment, 1, request, env, 'empty_result');
      }

      ctx.waitUntil(
        logPremiumUsage(env, '/api/premium/x402-index/series', request.headers.get('User-Agent') || 'unknown', 1, payment.token, payment.payerWallet),
      );
      return await premiumResponse({ ok: true, ...result }, payment, 1, request, env);
    }

    // === PAID PREMIUM: SUBSTRATE CHANGELOG HISTORY (1 credit, param-required) ===
    // Full forward-only changelog of model lifecycle events (added, removed,
    // repriced, deprecated) and agent-protocol spec versions across a date
    // range, filterable by event_type. Strict-premium prefix, so an anonymous
    // Bazaar probe sees a clean 402 challenge.
    if (path === '/api/premium/substrate-changelog/history') {
      // requirePayment FIRST (the wrapper gates): strict-premium, so an anonymous
      // probe sees the 402 challenge, not a 400. Validation (incl. the range cap
      // that bounds the per-day KV fan-out) runs after as a no-charge failure.
      return handlePremium(request, env, ctx, { tier: 1, endpoint: '/api/premium/substrate-changelog/history' }, async () => {
        const from = url.searchParams.get('from');
        const to = url.searchParams.get('to');
        const eventType = url.searchParams.get('event_type');
        if (!from || !to) {
          return { kind: 'validation_failure', error: { error: 'missing_params', required: ['from', 'to'], hint: 'Both from and to required, YYYY-MM-DD format.' } };
        }

        const { getChangelogHistory, validateRange } = await import('./substrate-changelog/query');
        const range = validateRange(from, to);
        if (!range.ok) {
          return { kind: 'validation_failure', error: { error: range.error, hint: range.hint } };
        }

        // Narrow event_type to the known union; an unrecognized value (or none)
        // means "no filter" rather than a validation error, so the caller gets the
        // full window instead of an opaque rejection.
        const validEventTypes: ReadonlyArray<import('./substrate-changelog/types').SubstrateEventType> = [
          'model_added',
          'model_removed',
          'model_repriced',
          'model_deprecated',
          'spec_version',
          'framework_release',
          'protocol_milestone',
        ];
        const eventTypeArg = validEventTypes.find((t) => t === eventType);

        const result = await getChangelogHistory(env, from, to, eventTypeArg);

        // No day in the window had a stored rollup: return the empty result for
        // free rather than charging for a no-data answer.
        if (!result.has_data || result.events.length === 0) {
          return { kind: 'no_charge', body: { ok: true, ...result }, reason: 'empty_result', dataCapturedAt: null };
        }

        return { kind: 'ok', body: { ok: true, ...result }, dataCapturedAt: null };
      }, PREMIUM_DEPS);
    }

    // === PAID PREMIUM: AI EXPORT-CONTROL HISTORY (1 credit, param-optional) ===
    // Full filterable history of AI export-control actions over the BIS Federal
    // Register snapshot, by inclusive date range and category. Strict-premium
    // prefix, so an anonymous Bazaar probe sees a clean 402 challenge. A missing
    // snapshot or an empty filtered result returns free as a no-data result.
    if (path === '/api/premium/export-controls/ai/history') {
      // requirePayment FIRST: strict-premium, so an anonymous probe sees the
      // 402 challenge, not a 400.
      const payment = await requirePayment(request, env, 1);
      if (!payment.paid) return payment.response!;

      const from = url.searchParams.get('from');
      const to = url.searchParams.get('to');
      const category = url.searchParams.get('category');

      const { EXPORT_CONTROLS_KEY } = await import('./export-controls');
      const snapshot = (await env.TENSORFEED_CACHE.get(EXPORT_CONTROLS_KEY, 'json')) as
        | {
            ok: true;
            captured_at: string;
            source: string;
            license: string;
            total: number;
            events: import('./export-controls').ExportControlEvent[];
          }
        | null;

      // Snapshot missing (pre-first-cron): no-charge with empty_result rather
      // than charging for a no-data answer. Lexical date compare is correct for
      // YYYY-MM-DD.
      if (!snapshot) {
        return await premiumResponse(
          { ok: true, captured_at: null, total: 0, events: [] },
          payment,
          1,
          request,
          env,
          'empty_result',
        );
      }

      const filtered = snapshot.events.filter(
        (e) =>
          (!from || e.publication_date >= from) &&
          (!to || e.publication_date <= to) &&
          (!category || e.category === category),
      );

      // No event in the window matched the filters: no-charge with empty_result.
      if (filtered.length === 0) {
        return await premiumResponse(
          { ok: true, captured_at: snapshot.captured_at, total: 0, events: [] },
          payment,
          1,
          request,
          env,
          'empty_result',
        );
      }

      ctx.waitUntil(
        logPremiumUsage(env, '/api/premium/export-controls/ai/history', request.headers.get('User-Agent') || 'unknown', 1, payment.token, payment.payerWallet),
      );
      // captured_at carries the real snapshot data time; premiumResponse picks
      // it up for the AFTA staleness no-charge. Never new Date().
      return await premiumResponse(
        {
          ok: true,
          captured_at: snapshot.captured_at,
          total: filtered.length,
          events: filtered,
          source: snapshot.source,
          license: snapshot.license,
        },
        payment,
        1,
        request,
        env,
      );
    }

    // === PAID PREMIUM: EU AI ACT DESIGNATION HISTORY (1 credit, param-optional) ===
    // Full designation-change event history over the free
    // /api/eu-ai-act/notified-bodies snapshot: every first_seen, status_change,
    // scope_change, and delisted event the daily NANDO / SMCS diff has observed,
    // filterable by inclusive observed-at date range (from/to), legislation_id
    // (168380 AI Act, 167953 CRA, 164702 EUCC), and event type. The free route
    // serves only a 5-event preview; the history is the moat (the Commission
    // publishes no designation time series). Strict-premium prefix, so an
    // anonymous Bazaar probe sees a clean 402 challenge. An empty log (the
    // expected state until the EU's first AI Act notified body lands) or an
    // empty filtered window returns free as a no-data result.
    if (path === '/api/premium/eu-ai-act/notified-bodies/history') {
      // requirePayment FIRST: strict-premium, so an anonymous probe sees the
      // 402 challenge, not a 400.
      const payment = await requirePayment(request, env, 1);
      if (!payment.paid) return payment.response!;

      const from = url.searchParams.get('from');
      const to = url.searchParams.get('to');
      const legParam = url.searchParams.get('legislation_id');
      const typeParam = url.searchParams.get('type');

      // A malformed legislation_id must not silently widen the filter to the
      // full log on a billed call; reject it free instead.
      const legislationId = legParam === null ? null : Number(legParam);
      if (legislationId !== null && !Number.isInteger(legislationId)) {
        return await premiumValidationFailure(
          {
            ok: false,
            error: 'invalid legislation_id',
            hint: 'legislation_id must be a NANDO numeric id: 168380 (AI Act), 167953 (Cyber Resilience Act), 164702 (EUCC)',
          },
          payment,
          request,
          env,
        );
      }

      const { EU_AI_ACT_EVENTS_KEY, EU_AI_ACT_SOURCE, EU_AI_ACT_LICENSE, filterEvents } = await import('./eu-ai-act');
      const log = (await env.TENSORFEED_CACHE.get(EU_AI_ACT_EVENTS_KEY, 'json')) as
        | {
            ok: true;
            updated_at: string;
            baseline_established_at: string;
            total: number;
            events: import('./eu-ai-act').DesignationEvent[];
          }
        | null;

      // Log missing (pre-first-cron): no-charge with empty_result rather than
      // charging for a no-data answer.
      if (!log) {
        return await premiumResponse(
          { ok: true, captured_at: null, baseline_established_at: null, total: 0, events: [] },
          payment,
          1,
          request,
          env,
          'empty_result',
        );
      }

      const filtered = filterEvents(log.events, {
        from,
        to,
        legislation_id: legislationId,
        type: typeParam,
      });

      // Empty log or empty filtered window: no-charge. With the AI Act at zero
      // designations this is the expected day-one state; never bill for it.
      if (filtered.length === 0) {
        return await premiumResponse(
          {
            ok: true,
            captured_at: log.updated_at,
            baseline_established_at: log.baseline_established_at,
            total: 0,
            events: [],
          },
          payment,
          1,
          request,
          env,
          'empty_result',
        );
      }

      ctx.waitUntil(
        logPremiumUsage(env, '/api/premium/eu-ai-act/notified-bodies/history', request.headers.get('User-Agent') || 'unknown', 1, payment.token, payment.payerWallet),
      );
      // captured_at carries the events-log update time; premiumResponse picks
      // it up for the AFTA staleness no-charge. Never new Date().
      return await premiumResponse(
        {
          ok: true,
          captured_at: log.updated_at,
          baseline_established_at: log.baseline_established_at,
          total: filtered.length,
          events: filtered,
          source: EU_AI_ACT_SOURCE,
          license: EU_AI_ACT_LICENSE,
        },
        payment,
        1,
        request,
        env,
      );
    }

    // === PAID PREMIUM: CVE BATCH LOOKUP (Tier 1, 1 credit, param-required) ===
    // /api/premium/ai-cves/batch?ids=CVE-A,CVE-B,...
    // Up to 10 CVE ids per call, 1 credit flat. Reads the persistent
    // cve-index once and dedupes batch reads by batch_id so worst case
    // is 1 + N-unique-batch KV reads (typically 1 since most ids land in
    // the latest batch). Param-required so strict-premium gates anonymous
    // crawler probes to a clean 402 challenge.
    //
    // AgentMail messages/batch-get pattern translated. Saves up to 10
    // round-trips for the same 1-credit cost as a single lookup.

    if (path === '/api/premium/ai-cves/batch') {
      // requirePayment FIRST (audit CR-1, 2026-05-26).
      const payment = await requirePayment(request, env, 1);
      if (!payment.paid) return payment.response!;

      const { parseBatchIdsParam } = await import('./premium-ai-cves');
      const parsed = parseBatchIdsParam(url.searchParams.get('ids'));
      if (!parsed.ok) {
        return await premiumValidationFailure(
          { ok: false, error: parsed.error, hint: parsed.hint },
          payment,
          request,
          env,
        );
      }

      const { lookupCvesBatch } = await import('./premium-ai-cves');
      const result = await lookupCvesBatch(env, parsed.ids);

      // AFTA empty_result no-charge: every requested (validated) id resolved to
      // not-found, so the agent got zero records. Same payload (per-id results
      // preserved), signed receipt records the no-charge. Mirrors
      // model-intelligence/history. A partial hit (total_found > 0) charges.
      if (result.total_found === 0) {
        return await premiumResponse(result, payment, 1, request, env, 'empty_result');
      }
      ctx.waitUntil(
        logPremiumUsage(env, '/api/premium/ai-cves/batch', request.headers.get('User-Agent') || 'unknown', 1, payment.token, payment.payerWallet),
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
        logPremiumUsage(env, '/api/premium/coding-harnesses/weekly-deltas', request.headers.get('User-Agent') || 'unknown', 1, payment.token, payment.payerWallet),
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
      // Edge-cache the free response so a burst of agent requests on a cold
      // snapshot does not each re-run the lazy KV refresh + KV write on the
      // hot path (audit 2026-05-31 #20). Cache API is free/unlimited; only a
      // miss falls through to the KV-backed snapshot refresh. 300s matches
      // the snapshot TTL so the edge layer never serves staler-than-KV data.
      const cryptoCacheKey = new Request('https://tensorfeed.ai/__cache/ai-crypto-pulse/v1');
      const cryptoCache = caches.default;
      const cryptoHit = await cryptoCache.match(cryptoCacheKey);
      if (cryptoHit) return cryptoHit;

      const { getOrRefreshCryptoSnapshot } = await import('./terminalfeed-crypto-fetcher');
      const snap = await getOrRefreshCryptoSnapshot(env);
      if (!snap) {
        return jsonResponse({
          ok: false,
          error: 'upstream_unreachable',
          hint: 'TerminalFeed.io did not respond and we have no cached snapshot. Retry in a few minutes.',
        }, 503, 0);
      }
      const cryptoResponse = jsonResponse({
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
      ctx.waitUntil(cryptoCache.put(cryptoCacheKey, cryptoResponse.clone()));
      return cryptoResponse;
    }

    // === PAID PREMIUM: AI CRYPTO PULSE (Tier 1, 1 credit) ===
    // /api/premium/ai-crypto-pulse?token=&setup=&min_abs_change_pct=
    // Joins the price-mover signal with the funding-rate signal over the
    // AI-thesis token cohort. Per-token setup classification:
    // squeeze_up (rising + negative funding = shorts trapped),
    // chase_up (rising + positive funding = leverage on long side),
    // squeeze_down, chase_down, coiled, neutral. The squeeze
    // classifications are the contrarian alpha agents pay for.

    // === FREE PREVIEW: AI-CRYPTO PULSE TASTE (10/IP/day) ===
    // Free discovery sibling of /api/premium/ai-crypto-pulse. The raw movers
    // and funding arrays are ALREADY free at /api/ai-crypto-pulse; this taste
    // reveals the DERIVED layer's shape (cohort, setup distribution, breadth,
    // and a few classified standouts) so an agent sees the squeeze/chase value
    // before paying. Full per-token classified rows + venue funding stay paid.
    // Rate-limit BEFORE the federation fetch so capped bots cannot trigger it.
    if (path === '/api/preview/ai-crypto-pulse') {
      const ip = request.headers.get('CF-Connecting-IP') || request.headers.get('x-forwarded-for') || 'anonymous';
      const {
        buildPulse,
        parseToken,
        parseSetup,
        parseMinAbsChangePct,
        previewAiCryptoPulse,
        checkAiCryptoPulsePreviewRateLimit,
      } = await import('./premium-ai-crypto-pulse');
      const acpLimit = await checkAiCryptoPulsePreviewRateLimit(env, ip, 10);
      if (!acpLimit.allowed) {
        return jsonResponse(
          {
            ok: false,
            error: 'rate_limit_exceeded',
            limit: acpLimit.limit,
            remaining: 0,
            reset_in_hours: hoursUntilUTCRollover(),
            premium_endpoint: '/api/premium/ai-crypto-pulse',
            message:
              'Free preview limited to 10 calls/day per IP. The paid /api/premium/ai-crypto-pulse (full per-token setup classification and venue-weighted funding, no rate limit) is the upgrade. Raw movers and funding are free at /api/ai-crypto-pulse.',
          },
          429,
        );
      }
      const { getOrRefreshCryptoSnapshot } = await import('./terminalfeed-crypto-fetcher');
      const acpSnap = await getOrRefreshCryptoSnapshot(env);
      if (!acpSnap) {
        return jsonResponse(
          { ok: false, error: 'upstream_unreachable', hint: 'TerminalFeed.io did not respond and no cached snapshot is available. Retry in a few minutes.' },
          503,
          0,
        );
      }
      const acpResult = buildPulse(acpSnap, {
        token: parseToken(url.searchParams.get('token')),
        setup: parseSetup(url.searchParams.get('setup')),
        min_abs_change_pct: parseMinAbsChangePct(url.searchParams.get('min_abs_change_pct')),
      });
      return jsonResponse(
        {
          ...previewAiCryptoPulse(acpResult),
          rate_limit: { limit: acpLimit.limit, remaining: acpLimit.remaining, scope: 'per IP per UTC day' },
        },
        200,
        0,
      );
    }

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
        logPremiumUsage(env, '/api/premium/ai-crypto-pulse', request.headers.get('User-Agent') || 'unknown', 1, payment.token, payment.payerWallet),
      );
      // Partial (single-source) snapshot: the squeeze/chase join is missing
      // an entire side (movers or funding down) and could not be back-filled
      // from last-known-good. Serve it free with the degraded marker rather
      // than billing 1 credit for half the data (audit 2026-05-31 #13).
      const cryptoNoCharge = snap.degraded ? 'empty_result' : null;
      return await premiumResponse(result, payment, 1, request, env, cryptoNoCharge);
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
      const limit = (() => {
        const n = parseInt(url.searchParams.get('limit') ?? '', 10);
        return Number.isFinite(n) && n > 0 ? Math.min(n, 30) : 15;
      })();
      // Edge-cache the free response so a burst of agent requests on a cold
      // snapshot does not each re-run the lazy KV refresh + KV write on the
      // hot path (audit 2026-05-31 #20). Key on the (clamped) limit so a
      // limit=30 body is never served to a limit=15 caller. 600s matches
      // the response max-age; the snapshot TTL (30m) bounds upstream freshness.
      const velocityCacheKey = new Request(`https://tensorfeed.ai/__cache/ai-velocity/v1?limit=${limit}`);
      const velocityCache = caches.default;
      const velocityHit = await velocityCache.match(velocityCacheKey);
      if (velocityHit) return velocityHit;

      const { getOrRefreshVelocitySnapshot } = await import('./terminalfeed-ai-velocity-fetcher');
      const snap = await getOrRefreshVelocitySnapshot(env);
      if (!snap) {
        return jsonResponse({
          ok: false,
          error: 'upstream_unreachable',
          hint: 'TerminalFeed.io did not respond and we have no cached snapshot. Retry in a few minutes.',
        }, 503, 0);
      }
      const velocityResponse = jsonResponse({
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
      ctx.waitUntil(velocityCache.put(velocityCacheKey, velocityResponse.clone()));
      return velocityResponse;
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
        logPremiumUsage(env, '/api/premium/ai-velocity', request.headers.get('User-Agent') || 'unknown', 1, payment.token, payment.payerWallet),
      );
      // Partial (single-source) snapshot: the cross-join is missing an
      // entire surface (HF or GitHub down) and could not be back-filled
      // from last-known-good. Serve it free with the degraded marker rather
      // than billing 1 credit for half the data (audit 2026-05-31 #13).
      const velocityNoCharge = snap.degraded ? 'empty_result' : null;
      return await premiumResponse(result, payment, 1, request, env, velocityNoCharge);
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

      // AFTA empty_result no-charge: ecosystem/category/package filters that
      // match nothing yield an empty velocity result (packages_in_snapshot 0,
      // empty rows, zero summary totals). Nothing to sell, so do not bill.
      if (result.packages_in_snapshot === 0) {
        return await premiumResponse(result, payment, 1, request, env, 'empty_result');
      }
      ctx.waitUntil(
        logPremiumUsage(env, '/api/premium/packages/releases/velocity', request.headers.get('User-Agent') || 'unknown', 1, payment.token, payment.payerWallet),
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
        logPremiumUsage(env, '/api/premium/ai-safety/packages/security/radar', request.headers.get('User-Agent') || 'unknown', 1, payment.token, payment.payerWallet),
      );
      return await premiumResponse(result, payment, 1, request, env);
    }

    // === PAID PREMIUM: AI PACKAGE SAFETY VERDICT (Tier 1, 1 credit, param-required) ===
    // /api/premium/security/package-verdict?package=&ecosystem=&version=
    // Single GO/REVIEW/BLOCK ruling on whether an agent should install one
    // AI/ML package, fusing four feeds: the known-malicious IOC list, the
    // daily OSV advisory snapshot (curated AI/ML packages), the GHSA AI
    // advisory firehose, and the package-release snapshot (cadence context).
    // Param-required, so strict-premium (anonymous probes see a clean 402).
    // Coverage honesty: a package in none of the security feeds is no-charge
    // out_of_coverage, never a false GO. Free sibling is the raw OSV per-
    // package feed at /api/ai-safety/packages/security.

    if (path === '/api/premium/security/package-verdict') {
      // requirePayment FIRST so anonymous strict-premium probes see a clean
      // 402 challenge before any param validation (the audit CR-1 ordering).
      const payment = await requirePayment(request, env, 1);
      if (!payment.paid) return payment.response!;

      const { parseEcosystem, buildPackageVerdict } = await import('./premium-package-verdict');
      const pkg = url.searchParams.get('package')?.trim() || null;
      const ecosystem = parseEcosystem(url.searchParams.get('ecosystem'));
      if (!pkg || !ecosystem) {
        return await premiumValidationFailure(
          {
            ok: false,
            error: 'missing_params',
            hint: 'Pass package=<name> and ecosystem=PyPI|npm (pip is accepted as PyPI). version= is optional.',
          },
          payment,
          request,
          env,
        );
      }
      const version = url.searchParams.get('version')?.trim() || null;

      const [{ getAiSupplyChainIocs }, { getAiPackageSecuritySnapshot }, { getGhsaAiFeed }, { getPackageReleasesSnapshot }] =
        await Promise.all([
          import('./ai-supply-chain-iocs'),
          import('./ai-package-security-fetcher'),
          import('./ghsa-ai-feed'),
          import('./ai-package-releases-fetcher'),
        ]);
      const [iocs, security, ghsa, releases] = await Promise.all([
        getAiSupplyChainIocs(env),
        getAiPackageSecuritySnapshot(env),
        getGhsaAiFeed(env),
        getPackageReleasesSnapshot(env),
      ]);

      // Every security feed failed to load (cold start before first cron):
      // no-charge upstream_failure rather than billing for a non-answer.
      if (!iocs && !security && !ghsa) {
        return await premiumValidationFailure(
          {
            ok: false,
            error: 'snapshot_not_ready',
            hint: 'The package-security feeds populate after the first cron ticks (OSV 05:45 UTC, IOC 07:15 UTC, GHSA every 6h). Retry after the next run.',
          },
          payment,
          request,
          env,
          'upstream_failure',
        );
      }

      const result = buildPackageVerdict({ iocs, security, ghsa, releases }, { package: pkg, ecosystem, version }, new Date());

      if (!result.ok) {
        // out_of_coverage: a valid query for a package absent from every TF
        // security feed. AFTA empty_result no-charge, not a billable answer.
        return await premiumValidationFailure({ ...result }, payment, request, env, 'empty_result', 404);
      }

      ctx.waitUntil(
        logPremiumUsage(env, '/api/premium/security/package-verdict', request.headers.get('User-Agent') || 'unknown', 1, payment.token, payment.payerWallet),
      );
      return await premiumResponse(result, payment, 1, request, env, null, result.captured_at);
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

      // AFTA empty_result no-charge: vendor/risk_domain/within_days filters that
      // match nothing yield an all-empty rollup (entries_count 0, empty
      // developers/deployers/risk_domains/top_artifacts). Nothing to sell.
      if (result.entries_count === 0) {
        return await premiumResponse(result, payment, 1, request, env, 'empty_result');
      }
      ctx.waitUntil(
        logPremiumUsage(env, '/api/premium/ai-safety/incidents/exposure', request.headers.get('User-Agent') || 'unknown', 1, payment.token, payment.payerWallet),
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

      // AFTA empty_result no-charge: a family filter that matches no row in the
      // inference matrix yields an empty arbitrage view (models_in_matrix 0,
      // empty models/top_arbitrage). Nothing to sell, so do not bill.
      if (result.models_in_matrix === 0) {
        return await premiumResponse(result, payment, 1, request, env, 'empty_result');
      }
      ctx.waitUntil(
        logPremiumUsage(env, '/api/premium/inference-providers/arbitrage', request.headers.get('User-Agent') || 'unknown', 1, payment.token, payment.payerWallet),
      );
      return await premiumResponse(result, payment, 1, request, env);
    }

    // === FREE PREVIEW: INFERENCE ARBITRAGE TASTE (10/IP/day) ===
    // Discovery sibling of /api/premium/inference-providers/arbitrage. The
    // single largest price spread by magnitude plus the opportunity count, so an
    // agent sees there is savings on the table. Which provider is cheapest (the
    // actionable answer), the full table, and the provider rollup stay paid.
    // Pure compute over the registry, so the free taste has no synthesis cost.
    if (path === '/api/preview/inference-providers/arbitrage') {
      const ip = request.headers.get('CF-Connecting-IP') || request.headers.get('x-forwarded-for') || 'anonymous';
      const { previewArbitrage, buildArbitrage, parseFamily, parseMinSavingsPct, checkArbitragePreviewRateLimit } = await import('./premium-inference-arbitrage');
      const arbLimit = await checkArbitragePreviewRateLimit(env, ip, 10);
      if (!arbLimit.allowed) {
        return jsonResponse(
          {
            ok: false,
            error: 'rate_limit_exceeded',
            limit: arbLimit.limit,
            remaining: 0,
            reset_in_hours: hoursUntilUTCRollover(),
            premium_endpoint: '/api/premium/inference-providers/arbitrage',
            message:
              'Free preview limited to 10 calls/day per IP. The paid /api/premium/inference-providers/arbitrage (full per-model cheapest, most-expensive, and fastest provider picks, the provider value-score rollup, no rate limit) is the upgrade.',
          },
          429,
        );
      }
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
      return jsonResponse(
        {
          ...previewArbitrage(result),
          rate_limit: { limit: arbLimit.limit, remaining: arbLimit.remaining, scope: 'per IP per UTC day' },
        },
        200,
        0, // do not Cache-API; rate limiting is per IP
      );
    }

    // === PAID PREMIUM: INFERENCE COST VERDICT (Tier 1, 1 credit, param-required) ===
    // /api/premium/inference/cost-verdict?model=&monthly_tokens=&current_provider=
    // Cheapest inference host to serve one open-weight model at a monthly token
    // volume, projected per-host spend, and savings vs the caller's current host.
    // Ranks by cost with throughput (outputTPS) as the secondary signal; inference-
    // host reliability is not yet measured, so it is not factored in (a v2 item).
    // Optional input_tokens + output_tokens for an exact split (else blended 50/50).
    // Param-required (?model=), so strict-premium. Free sibling is the raw
    // /api/inference-providers/cheapest feed.
    if (path === '/api/premium/inference/cost-verdict') {
      const payment = await requirePayment(request, env, 1);
      if (!payment.paid) return payment.response!;

      const model = url.searchParams.get('model')?.trim() || null;
      const monthlyTokens = parseFloat(url.searchParams.get('monthly_tokens') ?? '');
      const inputTokens = parseFloat(url.searchParams.get('input_tokens') ?? '');
      const outputTokens = parseFloat(url.searchParams.get('output_tokens') ?? '');
      const hasSplit = Number.isFinite(inputTokens) && inputTokens >= 0 && Number.isFinite(outputTokens) && outputTokens >= 0;
      const hasMonthly = Number.isFinite(monthlyTokens) && monthlyTokens > 0;
      if (!model || (!hasMonthly && !hasSplit)) {
        return await premiumValidationFailure(
          {
            ok: false,
            error: 'missing_params',
            hint: 'Pass model=<id> (e.g. llama-3.1-70b) and monthly_tokens=<n>, or input_tokens=<n>&output_tokens=<n> for an exact split. Optional current_provider=<name> for a savings comparison.',
          },
          payment,
          request,
          env,
        );
      }

      const { buildInferenceCostVerdict } = await import('./premium-inference-cost-verdict');
      const { INFERENCE_MATRIX, INFERENCE_LAST_UPDATED } = await import('./inference-providers');
      const result = buildInferenceCostVerdict(
        INFERENCE_MATRIX,
        {
          model,
          monthly_tokens: hasMonthly ? monthlyTokens : null,
          input_tokens: hasSplit ? inputTokens : null,
          output_tokens: hasSplit ? outputTokens : null,
          current_provider: url.searchParams.get('current_provider')?.trim() || null,
        },
        INFERENCE_LAST_UPDATED,
      );

      if (!result.ok) {
        // model_not_in_matrix: a valid query for a model absent from the curated
        // matrix. AFTA empty_result no-charge, with the available model ids back.
        return await premiumValidationFailure({ ...result }, payment, request, env, 'empty_result', 404);
      }

      ctx.waitUntil(
        logPremiumUsage(env, '/api/premium/inference/cost-verdict', request.headers.get('User-Agent') || 'unknown', 1, payment.token, payment.payerWallet),
      );
      return await premiumResponse(result, payment, 1, request, env);
    }

    // === PAID PREMIUM: SETTLEMENT RAIL VERDICT (Tier 1, 1 credit) ===
    // /api/premium/settlement/rail-verdict?payment_usd=&prefer=balanced|cost|finality&accepted_rails=
    // The recommended x402 settlement rail for a given payment size, with a full
    // ranking across Base, Solana, Polygon, Arbitrum, Avalanche. Fuses live raw
    // on-chain cost with the CDP facilitator reality (gas sponsored, flat $0.001
    // marginal after 1000 free settlements per month) and published finality.
    // Optional ?payment_usd= (default 0.01), ?prefer=, and ?accepted_rails= (a
    // comma-separated id list to rank only the rails the recipient accepts). The
    // result also carries a cross_protocol block comparing the chosen x402 path
    // against a card baseline. Strict-premium (reads params) so anonymous Bazaar
    // crawlers see a clean 402. Free sibling is the /api/settlement-rails
    // snapshot. captured_at threads the freshness SLA.
    if (path === '/api/premium/settlement/rail-verdict') {
      const payment = await requirePayment(request, env, 1);
      if (!payment.paid) return payment.response!;

      const rawPayment = url.searchParams.get('payment_usd');
      let paymentUsd = 0.01;
      if (rawPayment != null) {
        const p = parseFloat(rawPayment);
        if (!Number.isFinite(p) || p <= 0 || p > 1_000_000) {
          return await premiumValidationFailure(
            {
              ok: false,
              error: 'invalid_payment_usd',
              hint: 'payment_usd must be a positive number of US dollars (e.g. 0.01). Omit it to use the $0.01 default.',
            },
            payment,
            request,
            env,
          );
        }
        paymentUsd = p;
      }

      const preferRaw = url.searchParams.get('prefer')?.trim().toLowerCase() || 'balanced';
      // Optional ?accepted_rails=base,solana restricts the ranking to the rails
      // the recipient accepts. Unknown ids are ignored and an all-miss set falls
      // back to every rail, both handled inside buildRailVerdict.
      const acceptedRailsRaw = url.searchParams.get('accepted_rails');
      const acceptedRails = acceptedRailsRaw
        ? acceptedRailsRaw.split(',').map((s) => s.trim().toLowerCase()).filter((s) => s.length > 0)
        : null;
      const { getSnapshot, buildRailVerdict, isRailPreference } = await import('./settlement-rails');
      const prefer = isRailPreference(preferRaw) ? preferRaw : 'balanced';
      const snapshot = await getSnapshot(env);
      const result = buildRailVerdict(snapshot, paymentUsd, prefer, acceptedRails);

      ctx.waitUntil(
        logPremiumUsage(env, '/api/premium/settlement/rail-verdict', request.headers.get('User-Agent') || 'unknown', 1, payment.token, payment.payerWallet),
      );
      return await premiumResponse(result, payment, 1, request, env, null, snapshot.capturedAt);
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

    // === FREE PREVIEW: MODEL-DEPRECATIONS TIMELINE TASTE (10/IP/day) ===
    // Free discovery sibling of /api/premium/model-deprecations/timeline.
    // Registry/window counts, per-provider and per-urgency-band summaries, and
    // the single most-imminent sunset headline, so an agent can see if a model
    // it depends on is affected before paying. The full timeline + per-entry
    // detail (days-until, migration chain, source links) stays paid.
    // buildTimeline reads no KV (bundled registry); per-IP cap bounds the op.
    if (path === '/api/preview/model-deprecations/timeline') {
      const ip = request.headers.get('CF-Connecting-IP') || request.headers.get('x-forwarded-for') || 'anonymous';
      const {
        buildTimeline,
        parseWithinDays,
        parseProvider,
        previewModelDeprecationsTimeline,
        checkModelDeprecationsTimelinePreviewRateLimit,
      } = await import('./premium-model-deprecations');
      const mdLimit = await checkModelDeprecationsTimelinePreviewRateLimit(env, ip, 10);
      if (!mdLimit.allowed) {
        return jsonResponse(
          {
            ok: false,
            error: 'rate_limit_exceeded',
            limit: mdLimit.limit,
            remaining: 0,
            reset_in_hours: hoursUntilUTCRollover(),
            premium_endpoint: '/api/premium/model-deprecations/timeline',
            message:
              'Free preview limited to 10 calls/day per IP. The paid /api/premium/model-deprecations/timeline (full timeline with every model, urgency math, and migration chains, no rate limit) is the upgrade.',
          },
          429,
        );
      }
      const mdResult = buildTimeline(
        {
          within_days: parseWithinDays(url.searchParams.get('within_days')),
          provider: parseProvider(url.searchParams.get('provider')),
        },
        new Date(),
      );
      return jsonResponse(
        {
          ...previewModelDeprecationsTimeline(mdResult),
          rate_limit: { limit: mdLimit.limit, remaining: mdLimit.remaining, scope: 'per IP per UTC day' },
        },
        200,
        0,
      );
    }

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
        logPremiumUsage(env, '/api/premium/model-deprecations/timeline', request.headers.get('User-Agent') || 'unknown', 1, payment.token, payment.payerWallet),
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

      // AFTA empty_result no-charge: the query validated and the snapshot
      // loaded (the !result.ok branch above already handled the cold-start
      // no_snapshot_yet upstream case), but the filters matched no papers (or
      // an offset landed past the result set). Zero returned rows is a
      // billable-free empty. Same payload, signed receipt records the
      // no-charge. Mirrors model-intelligence/history.
      if (result.papers.length === 0) {
        return await premiumResponse({ ...result, capturedAt: result.capturedAt }, payment, 1, request, env, 'empty_result');
      }

      ctx.waitUntil(
        logPremiumUsage(env, '/api/premium/research/topic-search', request.headers.get('User-Agent') || 'unknown', 1, payment.token, payment.payerWallet),
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
        logPremiumUsage(env, '/api/premium/research/lab-productivity', request.headers.get('User-Agent') || 'unknown', 1, payment.token, payment.payerWallet),
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
      // Strict-premium tier 3 ($0.10): rolling npm/PyPI momentum metrics
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
        logPremiumUsage(env, '/api/premium/packages/pypi/momentum', request.headers.get('User-Agent') || 'unknown', 3, payment.token, payment.payerWallet),
      );
      // Pass the real PyPI snapshot time so the 24h staleness SLA can
      // no-charge a stalled 03:45 UTC cron; the result surfaces the data
      // age only as source_captured_at, which premiumResponse does not read
      // on its own (audit 2026-05-31 #7).
      return await premiumResponse(result, payment, 3, request, env, null, result.source_captured_at);
    }

    // === FREE PREVIEW: POLICY TIMELINE TASTE (10/IP/day) ===
    // Free discovery sibling of /api/premium/policy/timeline. Window counts,
    // per-jurisdiction totals, and the single next milestone headline, so an
    // agent can see TF tracks live dated AI policy before paying. The full
    // timeline (every entry + per-entry detail) stays paid.
    // computePolicyTimeline reads no KV (bundled registry); the per-IP daily
    // cap bounds the only KV op.
    if (path === '/api/preview/policy/timeline') {
      const ip = request.headers.get('CF-Connecting-IP') || request.headers.get('x-forwarded-for') || 'anonymous';
      const ptLimit = await checkPolicyTimelinePreviewRateLimit(env, ip, 10);
      if (!ptLimit.allowed) {
        return jsonResponse(
          {
            ok: false,
            error: 'rate_limit_exceeded',
            limit: ptLimit.limit,
            remaining: 0,
            reset_in_hours: hoursUntilUTCRollover(),
            premium_endpoint: '/api/premium/policy/timeline',
            message:
              'Free preview limited to 10 calls/day per IP. The paid /api/premium/policy/timeline (full timeline with every entry, detail, and source links, no rate limit) is the upgrade.',
          },
          429,
        );
      }
      const ptParsed = parseTimelineParams(url.searchParams);
      if (ptParsed.error) {
        return jsonResponse(
          { ok: false, error: ptParsed.error, limits: { max_days_back: 365 * 5, max_days_forward: 365 * 5 } },
          400,
        );
      }
      const ptResult = computePolicyTimeline({
        daysBack: ptParsed.daysBack,
        daysForward: ptParsed.daysForward,
        jurisdiction: ptParsed.jurisdiction,
      });
      if (!ptResult.ok) {
        return jsonResponse(
          { ok: false, error: ptResult.error, ...(ptResult.hint ? { hint: ptResult.hint } : {}) },
          400,
        );
      }
      return jsonResponse(
        {
          ...previewPolicyTimeline(ptResult),
          rate_limit: { limit: ptLimit.limit, remaining: ptLimit.remaining, scope: 'per IP per UTC day' },
        },
        200,
        0,
      );
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
        logPremiumUsage(env, '/api/premium/policy/timeline', request.headers.get('User-Agent') || 'unknown', 1, payment.token, payment.payerWallet),
      );
      return await premiumResponse(result, payment, 1, request, env);
    }

    // === FREE PREVIEW: WHATS-NEW TASTE (10/IP/day) ===
    // The free discovery sibling of /api/premium/whats-new. Live summary
    // counts + the top 3 headline TITLES, so a booting agent can verify
    // TensorFeed has today's data before paying. The full brief (pricing
    // deltas, incident detail, all headlines with links) stays paid. Rate
    // limited per IP per UTC day, which also bounds the KV reads the same
    // bot volume that hammers the paid 402 would otherwise drive.
    if (path === '/api/preview/whats-new') {
      const ip = request.headers.get('CF-Connecting-IP') || request.headers.get('x-forwarded-for') || 'anonymous';
      const wnLimit = await checkWhatsNewPreviewRateLimit(env, ip, 10);
      if (!wnLimit.allowed) {
        return jsonResponse(
          {
            ok: false,
            error: 'rate_limit_exceeded',
            limit: wnLimit.limit,
            remaining: 0,
            reset_in_hours: hoursUntilUTCRollover(),
            premium_endpoint: '/api/premium/whats-new',
            message:
              'Free preview limited to 10 calls/day per IP. The paid /api/premium/whats-new (full pricing deltas, incident detail, all headlines, no rate limit) is the upgrade.',
          },
          429,
        );
      }
      const daysParam = parseInt(url.searchParams.get('days') ?? '', 10);
      const result = await computeWhatsNew(env, {
        ...(Number.isFinite(daysParam) ? { days: daysParam } : {}),
      });
      if (!result.ok) {
        return jsonResponse({ ok: false, error: 'whats_new_unavailable' }, 503, 0);
      }
      return jsonResponse(
        {
          ...previewWhatsNew(result),
          rate_limit: { limit: wnLimit.limit, remaining: wnLimit.remaining, scope: 'per IP per UTC day' },
        },
        200,
        0, // do not Cache-API; rate limiting is per IP
      );
    }

    // === FREE PREVIEW: WHATS-NEW PRO TASTE (10/IP/day) ===
    // Discovery sibling of /api/premium/whats-new/pro. One sample takeaway plus
    // the agent classes the paid brief tailors actions for, so an agent can see
    // the analyst-layer value before paying 10 credits. The full synthesis
    // (summary, all takeaways, every action) stays paid. The pro synthesis is
    // cached by base-data hash, so a cache hit is the common path and bot volume
    // cannot multiply the Haiku cost.
    if (path === '/api/preview/whats-new/pro') {
      const ip = request.headers.get('CF-Connecting-IP') || request.headers.get('x-forwarded-for') || 'anonymous';
      const wnpLimit = await checkWhatsNewProPreviewRateLimit(env, ip, 10);
      if (!wnpLimit.allowed) {
        return jsonResponse(
          {
            ok: false,
            error: 'rate_limit_exceeded',
            limit: wnpLimit.limit,
            remaining: 0,
            reset_in_hours: hoursUntilUTCRollover(),
            premium_endpoint: '/api/premium/whats-new/pro',
            message:
              'Free preview limited to 10 calls/day per IP. The paid /api/premium/whats-new/pro (full cited analyst summary, all takeaways, recommended actions per agent class, no rate limit) is the upgrade.',
          },
          429,
        );
      }
      const daysParam = parseInt(url.searchParams.get('days') ?? '', 10);
      const { computeWhatsNewPro, previewWhatsNewPro } = await import('./premium-whats-new-pro');
      const result = await computeWhatsNewPro(env, {
        ...(Number.isFinite(daysParam) ? { days: daysParam } : {}),
      });
      if (!result.ok) {
        return jsonResponse({ ok: false, error: 'whats_new_pro_unavailable', hint: result.hint }, 503, 0);
      }
      return jsonResponse(
        {
          ...previewWhatsNewPro(result),
          rate_limit: { limit: wnpLimit.limit, remaining: wnpLimit.remaining, scope: 'per IP per UTC day' },
        },
        200,
        0, // do not Cache-API; rate limiting is per IP
      );
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

      // Delta cursor loop: an agent passes ?since=<cursor> from a prior response
      // to get only what changed. Unchanged data no-charges (deferred debit
      // skipped) so polling is free and only real new content is billed. A
      // malformed, stale, window-mismatched, or future cursor degrades to a full
      // brief. The no-charge body carries counts only, never content.
      const sinceRaw = url.searchParams.get('since');
      const cursor = sinceRaw ? decodeWhatsNewCursor(sinceRaw) : null;
      const outcome = cursor ? computeWhatsNewDelta(result, cursor) : ({ mode: 'full' } as const);
      const freshCursor = encodeWhatsNewCursor(result);
      const continuation = buildWhatsNewContinuation(freshCursor);

      if (outcome.mode === 'no_charge') {
        const body = {
          ok: true,
          new_since_last: 0,
          window: result.window,
          capturedAt: result.capturedAt,
          cursor: freshCursor,
          next_check_hint: WHATS_NEW_NEXT_CHECK_HINT,
          continuation,
        };
        return await premiumResponse(body, payment, 1, request, env, 'no_new_since_cursor', result.capturedAt);
      }

      ctx.waitUntil(
        logPremiumUsage(env, '/api/premium/whats-new', request.headers.get('User-Agent') || 'unknown', 1, payment.token, payment.payerWallet),
      );
      const body =
        outcome.mode === 'delta'
          ? {
              ...result,
              new_since_last: outcome.new_since_last,
              summary: outcome.summary,
              summary_full: outcome.summary_full,
              pricing: outcome.pricing,
              status: outcome.status,
              news: outcome.news,
              cursor: freshCursor,
              continuation,
            }
          : { ...result, cursor: freshCursor, continuation };
      // Pass the freshest underlying data-capture time so the 1h staleness
      // SLA can no-charge when the pricing/status/news crons stall.
      return await premiumResponse(body, payment, 1, request, env, null, result.capturedAt);
    }

    // === PAID PREMIUM: WHATS-NEW PRO TIER (Tier 2, 10 credits) ============
    // /api/premium/whats-new/pro?days=1&news_limit=10
    //
    // Tier ladder variant of /api/premium/whats-new. Layers Haiku 4.5
    // generated analyst synthesis on top of the base payload:
    //   - analyst_summary (200-1500 chars narrative)
    //   - key_takeaways (1-5 items, each with cited basis IDs + confidence)
    //   - recommended_actions (1-3 items targeted by agent class)
    // Every claim cites back to a stable data_ids ID assigned server-side
    // BEFORE Haiku sees the payload. Citations that don't resolve fail
    // validation; agent never sees a hallucinated reference.
    //
    // Pattern: Parallel.ai-style tier ladder. Same product, deeper output,
    // higher price (10 credits = $0.20 vs base at 1 credit = $0.02).
    //
    // Caching: 6h TTL keyed on window + SHA-256(base data). Expected
    // 85%+ hit rate; uncached calls cost ~$0.01 Haiku, cached calls cost
    // ~$0.0000005 KV read. Synthesis failure = no charge (deferred-debit
    // honors premiumValidationFailure path).
    if (path === '/api/premium/whats-new/pro') {
      // Tier 4 = 10 credits (per TIER_COSTS in payments.ts). The handler
      // passes the TIER number; logPremiumUsage + premiumResponse take
      // the credit COUNT (10) since that's what gets ledgered.
      const payment = await requirePayment(request, env, 4);
      if (!payment.paid) return payment.response!;

      const daysParam = parseInt(url.searchParams.get('days') ?? '', 10);
      const newsLimitParam = parseInt(url.searchParams.get('news_limit') ?? '', 10);
      const baseOpts = {
        ...(Number.isFinite(daysParam) ? { days: daysParam } : {}),
        ...(Number.isFinite(newsLimitParam) ? { newsLimit: newsLimitParam } : {}),
      };

      const base = await computeWhatsNew(env, baseOpts);
      if (!base.ok) {
        return await premiumValidationFailure(
          base as unknown as Record<string, unknown>,
          payment,
          request,
          env,
        );
      }

      // Delta cursor loop (parity with /api/premium/whats-new). An unchanged
      // poll no-charges and skips the Haiku enrichment entirely; a poll with
      // new data returns the full cited brief plus new_since_last and a fresh
      // cursor. Bad/absent cursor degrades to a full charged brief. The
      // no-charge body carries counts only, never synthesis.
      const sinceRaw = url.searchParams.get('since');
      const cursor = sinceRaw ? decodeWhatsNewCursor(sinceRaw) : null;
      const outcome = cursor ? computeWhatsNewDelta(base, cursor) : ({ mode: 'full' } as const);
      const freshCursor = encodeWhatsNewCursor(base);
      const continuation = buildWhatsNewContinuation(freshCursor, '/api/premium/whats-new/pro');

      if (outcome.mode === 'no_charge') {
        const body = {
          ok: true,
          tier: 'pro' as const,
          new_since_last: 0,
          window: base.window,
          capturedAt: base.capturedAt,
          cursor: freshCursor,
          next_check_hint: WHATS_NEW_NEXT_CHECK_HINT,
          continuation,
        };
        return await premiumResponse(body, payment, 10, request, env, 'no_new_since_cursor', base.capturedAt);
      }

      const { enrichWhatsNewProFromBase } = await import('./premium-whats-new-pro');
      const pro = await enrichWhatsNewProFromBase(env, base, baseOpts);
      if (!pro.ok) {
        return await premiumValidationFailure(
          pro as unknown as Record<string, unknown>,
          payment,
          request,
          env,
        );
      }
      ctx.waitUntil(
        logPremiumUsage(env, '/api/premium/whats-new/pro', request.headers.get('User-Agent') || 'unknown', 10, payment.token, payment.payerWallet),
      );
      const body = {
        ...pro,
        cursor: freshCursor,
        continuation,
        ...(outcome.mode === 'delta' ? { new_since_last: outcome.new_since_last } : {}),
      };
      // Pass the freshest underlying data-capture time so the staleness SLA can
      // no-charge when the base data crons stall.
      return await premiumResponse(body, payment, 10, request, env, null, base.capturedAt);
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
        logPremiumUsage(env, '/api/premium/recent', request.headers.get('User-Agent') || 'unknown', 1, payment.token, payment.payerWallet),
      );
      // Pass the freshest underlying data-capture time so the 1h staleness
      // SLA can no-charge when the news/status crons stall.
      return await premiumResponse(result, payment, 1, request, env, null, result.capturedAt);
    }

    // === PAID PREMIUM: GHSA AI FIREHOSE (Tier 1, 1 credit) ===
    // /api/premium/security/ghsa/ai-feed: broader companion to the
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
        logPremiumUsage(env, '/api/premium/security/ghsa/ai-feed', request.headers.get('User-Agent') || 'unknown', 1, payment.token, payment.payerWallet),
      );
      // Pass generated_at (the last successful refresh write) as the
      // billing capture time so the 9h freshness SLA can no-charge when
      // the 6h cron stalls. The snapshot spreads generated_at into the
      // body, but premiumResponse does not probe that field name, so the
      // explicit arg is required.
      return await premiumResponse({ ok: true, ...snapshot }, payment, 1, request, env, null, snapshot.generated_at);
    }

    // === PAID PREMIUM: OPENALEX AI AUTHORS (Tier 1, 1 credit) ===
    // /api/premium/research/authors: top 100 AI authors by AI publication
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
        logPremiumUsage(env, '/api/premium/research/authors', request.headers.get('User-Agent') || 'unknown', 1, payment.token, payment.payerWallet),
      );
      return await premiumResponse({ ok: true, ...snapshot }, payment, 1, request, env);
    }

    // === PAID PREMIUM: OPENALEX AI CITATION VELOCITY (Tier 1, 1 credit) ===
    // /api/premium/research/citation-velocity: top 100 recent AI papers ranked
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
        logPremiumUsage(env, '/api/premium/research/citation-velocity', request.headers.get('User-Agent') || 'unknown', 1, payment.token, payment.payerWallet),
      );
      const cleanedPaid = filterVelocityPapers(snapshot.papers ?? [], new Date().getUTCFullYear());
      return await premiumResponse({ ok: true, ...snapshot, papers: cleanedPaid }, payment, 1, request, env);
    }

    // === PAID PREMIUM: APIs.GURU AI WATCH (Tier 1, 1 credit) ===
    // /api/premium/apis-guru/ai-feed: AI-relevant entries from the
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
        logPremiumUsage(env, '/api/premium/apis-guru/ai-feed', request.headers.get('User-Agent') || 'unknown', 1, payment.token, payment.payerWallet),
      );
      // generated_at = last successful daily refresh. Surfaced as the
      // billing capture time so the 36h freshness SLA no-charges a stalled
      // snapshot (premiumResponse does not probe generated_at by name).
      return await premiumResponse({ ok: true, ...snapshot }, payment, 1, request, env, null, snapshot.generated_at);
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
        // no_models_matched (pricing KV missing or zero ids resolved) is a
        // no-data case, not malformed input: route it as empty_result so the
        // agent is not billed for an empty comparison (audit 2026-05-31 #17).
        // The param-count guards keep the default schema_validation_failure.
        const noChargeReason = result.reason === 'no_models_matched' ? 'empty_result' : 'schema_validation_failure';
        return await premiumValidationFailure(
          result as unknown as Record<string, unknown>,
          payment, request, env, noChargeReason,
        );
      }
      ctx.waitUntil(
        logPremiumUsage(env, '/api/premium/compare/models', request.headers.get('User-Agent') || 'unknown', 1, payment.token, payment.payerWallet),
      );
      // Pass the real pricing capture time so the 24h staleness SLA can
      // no-charge stale pricing; the capture time lives nested under
      // data_freshness.pricing, which premiumResponse does not read on its
      // own (audit 2026-05-31 #16).
      return await premiumResponse(result, payment, 1, request, env, null, result.data_freshness?.pricing ?? null);
    }

    // === PAID PREMIUM: PROVIDER DEEP-DIVE (Tier 3, 5 credits = $0.10) ===
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
        logPremiumUsage(env, '/api/premium/providers', request.headers.get('User-Agent') || 'unknown', 3, payment.token, payment.payerWallet),
      );
      // Gate the 24h staleness SLA on the LIVE status capture time
      // (data_freshness.status = the latest probe lastChecked), which advances
      // on the status cron. We deliberately do NOT gate on data_freshness.pricing:
      // the pricing snapshot lastUpdated only moves when the LiteLLM catalog
      // changes (often weeks apart), so it is structurally older than 24h in
      // normal operation and would no-charge fresh deep-dives. If a provider has
      // no status (rare), capturedAt is null and the call charges (revenue-safe).
      return await premiumResponse(
        result,
        payment,
        3,
        request,
        env,
        null,
        result.data_freshness.status ?? null,
      );
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
      // No-charge when there is no usable cost data: zero models matched the
      // live pricing catalog (all-unmatched ids, or the 'models' KV is empty
      // before first seed) means an empty ranking and no projections to bill
      // for. cost/projection is NULL_SLA (pure compute), so the staleness
      // no-charge can never fire; route this to premiumValidationFailure with
      // 'empty_result' (HTTP 200) so the agent is not charged 1 credit for an
      // empty answer, mirroring the !result.ok no-charge branch above.
      if (result.ranked_cheapest_monthly.length === 0) {
        return await premiumValidationFailure(
          {
            error: 'no_models_matched',
            hint: 'None of the requested model ids matched the live pricing catalog. Confirm exact ids via /api/models. Not charged.',
            workload: result.workload,
            projections: result.projections,
            attribution: result.attribution,
            notes: result.notes,
          },
          payment, request, env, 'empty_result', 200,
        );
      }
      ctx.waitUntil(
        logPremiumUsage(env, '/api/premium/cost/projection', request.headers.get('User-Agent') || 'unknown', 1, payment.token, payment.payerWallet),
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
        logPremiumUsage(env, '/api/premium/news/search', request.headers.get('User-Agent') || 'unknown', 1, payment.token, payment.payerWallet),
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
        logPremiumUsage(env, '/api/premium/agents/directory', request.headers.get('User-Agent') || 'unknown', 1, payment.token, payment.payerWallet),
      );
      // Bill staleness against the real directory ingest time (the only
      // top-level field on this result is computed_at = build time, invisible
      // to the staleness check, so the 24h SLA could never fire). Pass the
      // upstream directory age so a >24h ingest outage no-charges.
      return await premiumResponse(
        result, payment, 1, request, env, null, result.data_freshness.directory ?? null,
      );
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
        return await premiumValidationFailure({ ok: false, error: 'invalid_json' }, payment, request, env);
      }
      if (typeof body.callback_url !== 'string') {
        return await premiumValidationFailure({ ok: false, error: 'callback_url_required' }, payment, request, env);
      }
      const result = await createWatch(env, payment.token, {
        spec: body.spec as never,
        callback_url: body.callback_url,
        ...(typeof body.secret === 'string' ? { secret: body.secret } : {}),
        ...(typeof body.fire_cap === 'number' ? { fire_cap: body.fire_cap } : {}),
      });
      if (!result.ok) {
        return await premiumValidationFailure(result as unknown as Record<string, unknown>, payment, request, env);
      }
      ctx.waitUntil(
        logPremiumUsage(env, '/api/premium/watches', request.headers.get('User-Agent') || 'unknown', 1, payment.token, payment.payerWallet),
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

    // === INTERNAL: backup chunk (SELF fan-out) ===
    // The daily KV->R2 backup orchestrator (backupKvToR2) calls this via
    // the SELF service binding, once per KV list page. Every SELF call is
    // a FRESH Worker invocation with its own ~1000-subrequest budget, so
    // one chunk can safely walk one page (<= CHUNK_PAGE_SIZE gets) no
    // matter how large the namespace is. This is what lets TENSORFEED_CACHE
    // (tens of thousands of keys) actually get backed up. Authenticated by
    // SHARED_INTERNAL_SECRET, same as the other internal endpoints. NOT in
    // /api/meta or any agent-facing surface.
    if (path === '/api/internal/backup-chunk') {
      if (request.method !== 'POST') {
        return jsonResponse({ error: 'method_not_allowed' }, 405, 0);
      }
      const auth = request.headers.get('X-Internal-Auth') ?? '';
      const secret = env.SHARED_INTERNAL_SECRET ?? '';
      if (!secret || !constantTimeEqual(auth, secret)) {
        return jsonResponse({ error: 'unauthorized' }, 401, 0);
      }
      let body: { name?: unknown; date?: unknown; runId?: unknown; cursor?: unknown; partIndex?: unknown };
      try {
        body = await request.json();
      } catch {
        return jsonResponse({ error: 'bad_json' }, 400, 0);
      }
      const name = typeof body?.name === 'string' ? body.name : '';
      const date = typeof body?.date === 'string' ? body.date : '';
      const runId = typeof body?.runId === 'string' ? body.runId : '';
      const cursor = typeof body?.cursor === 'string' ? body.cursor : null;
      const partIndex = Number.isInteger(body?.partIndex) ? (body.partIndex as number) : 0;
      if (!name || !date || !runId) {
        return jsonResponse({ error: 'bad_request' }, 400, 0);
      }
      const result = await backupNamespaceChunk(env, { name, date, runId, cursor, partIndex });
      return jsonResponse(result, 200, 0);
    }

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

    if (path === '/api/admin/usage' && isAuthorizedAdmin(env, extractAdminKey(request, url))) {
      // Legacy form: ?date=YYYY-MM-DD returns that single day's raw paid
      // rollup (unchanged, for callers and dashboards that pin a date).
      const dateParam = url.searchParams.get('date');
      if (dateParam) {
        const rollup = await getRollup(env, dateParam);
        if (!rollup) {
          return jsonResponse({ ok: false, error: 'no_data_for_date', date: dateParam }, 404);
        }
        return jsonResponse({ ok: true, ...rollup }, 200, 0);
      }
      // Agent Usage Meter view: ?window=today|7d|30d returns the shaped paid
      // summary (top paid endpoints + payers) plus the AE full funnel when a
      // CF_ANALYTICS_TOKEN is provisioned. The funnel degrades to
      // "unavailable" without the token; the paid summary still ships.
      const window = url.searchParams.get('window') || 'today';
      const report = await buildUsageReport(env, window);
      return jsonResponse({ ok: true, ...report }, 200, 0);
    }

    if (path === '/api/admin/request-health' && isAuthorizedAdmin(env, extractAdminKey(request, url))) {
      // Worker-returned 5xx + slow-but-completing requests by path, from the
      // tf_request_health AE dataset. ?window=today|7d|30d. The standing answer
      // to "which path is erroring or slow". A true gateway-timeout 504 (worker
      // hung, never returned) is not recorded; top_slow_by_path is the proxy.
      const rhWindow = url.searchParams.get('window') || 'today';
      const rhDays = rhWindow === '30d' ? 30 : rhWindow === '7d' ? 7 : 1;
      const rhReport = await queryRequestHealth(env, rhDays);
      return jsonResponse(
        {
          ok: true,
          note: 'Worker-returned 5xx and slow-but-completing requests by path. A true gateway-timeout 504 (worker hung, never returned) is not recorded here; top_slow_by_path is the proxy for which path is approaching the timeout.',
          ...rhReport,
        },
        200,
        0,
      );
    }

    // Admin: manually run the EU AI Act notified-body capture, the same code
    // path as the 19:33 UTC cron. Used to seed the baseline right after a
    // deploy and to verify the EC search API accepts Cloudflare egress (some
    // upstreams 403 shared CF IPs; never trust a local curl alone).
    if (path === '/api/admin/eu-ai-act/capture' && isAuthorizedAdmin(env, extractAdminKey(request, url))) {
      const { captureEuAiAct } = await import('./eu-ai-act');
      const result = await captureEuAiAct(env);
      return jsonResponse({ ok: true, ...result }, 200, 0);
    }

    if (path === '/api/admin/usage/dates' && isAuthorizedAdmin(env, extractAdminKey(request, url))) {
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
    if (path === '/api/admin/kill-switch' && isAuthorizedAdmin(env, extractAdminKey(request, url))) {
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
    if (path === '/api/admin/backup/run' && isAuthorizedAdmin(env, extractAdminKey(request, url))) {
      if (request.method !== 'POST') {
        return jsonResponse({ ok: false, error: 'POST_required' }, 405);
      }
      try {
        // The backup is resumable: an admin trigger runs within a wall-clock
        // budget (default 70s, under the edge response deadline) and returns
        // in_progress when the budget is hit. Re-POST to resume the same-day
        // run until manifest.in_progress is absent and complete is true. The
        // cron path passes no budget and completes in one invocation.
        const budgetMs = Math.min(
          600_000,
          Math.max(10_000, parseInt(url.searchParams.get('budget_ms') || '70000', 10) || 70_000),
        );
        const manifest = await backupKvToR2(env, 'admin', env.ENVIRONMENT || 'unknown', { budgetMs });
        return jsonResponse({ ok: true, manifest }, 200, 0);
      } catch (e) {
        return jsonResponse({ ok: false, error: e instanceof Error ? e.message : String(e) }, 500);
      }
    }

    // /api/admin/backup/health GET &key=<ADMIN_KEY>  Last run's completeness (from backup:last)
    if (path === '/api/admin/backup/health' && isAuthorizedAdmin(env, extractAdminKey(request, url))) {
      try {
        const health = await getBackupHealth(env);
        return jsonResponse({ ok: true, health: health ?? null }, 200, 0);
      } catch (e) {
        return jsonResponse({ ok: false, error: e instanceof Error ? e.message : String(e) }, 500);
      }
    }

    if (path === '/api/admin/backup/list' && isAuthorizedAdmin(env, extractAdminKey(request, url))) {
      try {
        const limit = Math.min(90, Math.max(1, parseInt(url.searchParams.get('limit') || '30', 10) || 30));
        const recent = await listRecentBackups(env, limit);
        return jsonResponse({ ok: true, count: recent.length, backups: recent }, 200, 0);
      } catch (e) {
        return jsonResponse({ ok: false, error: e instanceof Error ? e.message : String(e) }, 500);
      }
    }

    if (path === '/api/admin/backup/manifest' && isAuthorizedAdmin(env, extractAdminKey(request, url))) {
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

    // === ADMIN: force-run the drift audit (auth-gated) ===
    // The audit normally runs on the daily 06:41 UTC cron and /api/health/drift
    // serves the precomputed report from KV. This route runs it on demand so a
    // fix or an incident can be re-checked immediately instead of waiting a
    // day. Same code path as the cron, including alert emails on status flips.
    if (path === '/api/admin/drift-run' && isAuthorizedAdmin(env, extractAdminKey(request, url))) {
      const { runDriftAudit } = await import('./drift-audit');
      const report = await runDriftAudit(env);
      return jsonResponse({ ok: true, report }, 200, 0);
    }

    // === ADMIN: rebuild a day's premium rollup from its event trail ===
    // Dry by default (returns the rebuilt rollup without writing); pass
    // write=1 to persist. The write path enforces the pay:evt:since
    // coverage guard so a partially-covered day can never be clobbered.
    // GET /api/admin/rollup-reconcile?date=YYYY-MM-DD[&write=1]
    if (path === '/api/admin/rollup-reconcile' && isAuthorizedAdmin(env, extractAdminKey(request, url))) {
      const dateParam = url.searchParams.get('date')
        || new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString().slice(0, 10);
      if (!/^\d{4}-\d{2}-\d{2}$/.test(dateParam)) {
        return jsonResponse({ ok: false, error: 'bad_date', hint: 'date=YYYY-MM-DD' }, 400, 0);
      }
      const { reconcileRollupForDate } = await import('./payments');
      const result = await reconcileRollupForDate(env, dateParam, {
        dry: url.searchParams.get('write') !== '1',
      });
      return jsonResponse({ ok: true, ...result }, 200, 0);
    }

    if (path === '/api/admin/anomalies' && isAuthorizedAdmin(env, extractAdminKey(request, url))) {
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
    if (path === '/api/admin/wantlist/recent' && isAuthorizedAdmin(env, extractAdminKey(request, url))) {
      const limitParam = url.searchParams.get('limit');
      const limit = limitParam ? parseInt(limitParam, 10) : 100;
      const snap = await listWantlistForAdmin(env, Number.isFinite(limit) ? limit : 100);
      return jsonResponse({ ok: true, ...snap }, 200, 0);
    }
    const adminWantlistDelete = path.match(/^\/api\/admin\/wantlist\/([^/]+)$/);
    if (adminWantlistDelete && request.method === 'DELETE' && isAuthorizedAdmin(env, extractAdminKey(request, url))) {
      const id = adminWantlistDelete[1]!;
      const result = await deleteWantlistItem(env, id);
      const status = result.ok ? 200 : (result.error === 'not_found' ? 404 : 400);
      return jsonResponse(result, status, 0);
    }

    if (path === '/api/admin/burn-token' && isAuthorizedAdmin(env, extractAdminKey(request, url))) {
      const token = url.searchParams.get('token');
      if (!token || !token.startsWith('tf_live_')) {
        return jsonResponse({ ok: false, error: 'missing_or_invalid_token_param' }, 400);
      }
      const credKey = `pay:credits:${token}`;
      const before = await env.TENSORFEED_CACHE.get(credKey, 'json') as { balance?: number } | null;
      await env.TENSORFEED_CACHE.delete(credKey);
      // Don't echo any token entropy beyond the public 'tf_live_' prefix in the
      // response (audit M-fix 2026-05-26). Prior versions returned slice(0, 16)
      // which surfaced 8 hex chars worth of token bytes; whoever held the
      // ADMIN_KEY at burn time already knew the full token, but the response
      // would have ended up in their request logs and a subsequent log breach
      // would have surfaced enough prefix for /api/agents/reputation/by-token
      // (9-16 char prefix lookup) to deanonymize the agent.
      return jsonResponse({
        ok: true,
        burned: 'tf_live_***',
        previous_balance: before?.balance ?? 0,
        message: 'Token credits record deleted. Any further premium call with this token will be rejected.',
      }, 200, 0);
    }

    // POST /api/admin/recon-email?key=ADMIN_KEY
    // JSON body: { subject: string, body: string, to?: string }
    // Sends a plain-text email via Resend from env.ALERT_EMAIL_FROM. Default
    // recipient is env.ALERT_EMAIL_TO; the to override exists so a single
    // endpoint can serve multiple routine targets later. Rejects em dashes
    // (U+2014) per the TF anti-AI-detection rule so a malformed routine
    // prompt can't accidentally ship one through.
    //
    // Built 2026-05-26 because the claude.ai Gmail MCP connector only exposes
    // create_draft (no send_message capability), so scheduled remote agents
    // can't deliver real email through Gmail. This endpoint is the workaround.
    if (path === '/api/admin/recon-email' && request.method === 'POST') {
      // Least-privilege auth: RECON_EMAIL_KEY (if configured) authorizes
      // ONLY this endpoint. Falls back to ADMIN_KEY if the dedicated
      // secret isn't set. The dedicated key is preferred because the
      // routine prompt that calls this endpoint is stored in Anthropic
      // cloud config; if it ever leaks, we'd rather expose a single email
      // capability than the full admin surface (kill-switch, burn-token,
      // etc). Wrangler: `wrangler secret put RECON_EMAIL_KEY` to enable.
      const supplied = extractAdminKey(request, url) ?? '';
      const reconKeyOk =
        !!env.RECON_EMAIL_KEY &&
        env.RECON_EMAIL_KEY.length > 0 &&
        supplied.length > 0 &&
        constantTimeEqual(supplied, env.RECON_EMAIL_KEY);
      const adminKeyOk = isAuthorizedAdmin(env, supplied);
      if (!reconKeyOk && !adminKeyOk) {
        return jsonResponse({ ok: false, error: 'unauthorized' }, 401);
      }
      if (!env.RESEND_API_KEY || !env.ALERT_EMAIL_FROM) {
        return jsonResponse(
          { ok: false, error: 'email_not_configured', hint: 'RESEND_API_KEY and ALERT_EMAIL_FROM must be set in Worker secrets.' },
          500,
        );
      }

      let parsed: { subject?: unknown; body?: unknown; to?: unknown };
      try {
        parsed = await request.json();
      } catch {
        return jsonResponse({ ok: false, error: 'invalid_json' }, 400);
      }

      const subject = typeof parsed.subject === 'string' ? parsed.subject.trim() : '';
      const body = typeof parsed.body === 'string' ? parsed.body : '';
      const to =
        typeof parsed.to === 'string' && parsed.to.trim()
          ? parsed.to.trim()
          : env.ALERT_EMAIL_TO;

      if (!subject) return jsonResponse({ ok: false, error: 'missing_subject' }, 400);
      if (subject.length > 200) {
        return jsonResponse({ ok: false, error: 'subject_too_long', hint: 'max 200 chars' }, 400);
      }
      if (!body) return jsonResponse({ ok: false, error: 'missing_body' }, 400);
      if (body.length > 100_000) {
        return jsonResponse({ ok: false, error: 'body_too_long', hint: 'max 100000 chars' }, 400);
      }
      if (!to) {
        return jsonResponse(
          { ok: false, error: 'no_recipient', hint: 'Pass to in body, or set ALERT_EMAIL_TO worker secret.' },
          500,
        );
      }
      // TF anti-AI-detection guard: em dash is forbidden in outbound copy.
      if (body.includes('—') || subject.includes('—')) {
        return jsonResponse(
          { ok: false, error: 'em_dash_blocked', hint: 'Em dash (U+2014) is not allowed in TF outbound emails. Use commas, colons, or rewrite.' },
          400,
        );
      }

      try {
        const res = await fetch('https://api.resend.com/emails', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${env.RESEND_API_KEY}`,
          },
          body: JSON.stringify({
            from: `TensorFeed <${env.ALERT_EMAIL_FROM}>`,
            to: [to],
            subject,
            text: body,
          }),
          signal: AbortSignal.timeout(10_000),
        });
        if (!res.ok) {
          const errBody = await res.text().catch(() => '');
          return jsonResponse(
            { ok: false, error: 'resend_failed', status: res.status, detail: errBody.slice(0, 500) },
            502,
          );
        }
        const result = (await res.json().catch(() => ({}))) as { id?: string };
        return jsonResponse(
          { ok: true, to, subject, message_id: result.id ?? null },
          200,
          0,
        );
      } catch (err) {
        return jsonResponse(
          { ok: false, error: 'send_exception', detail: String(err).slice(0, 500) },
          500,
        );
      }
    }

    if (path === '/api/alerts-status') {
      const status = await getAlertsStatus(env);
      return jsonResponse({ ok: true, now: new Date().toISOString(), ...status }, 200, 60);
    }

    // === FORCE REFRESH (protected) ===
    //
    // Audit H-4 (2026-05-26): /api/refresh sits outside the hoisted
    // /api/admin/* pre-check despite being conceptually admin-only. Pair
    // it with the same per-IP rate limiter so a leaked ADMIN_KEY cannot
    // be brute-forced freely (and so KV-budget DoS via refresh-task spam
    // is bounded). Limiter runs BEFORE the auth check so bad-key attempts
    // also count against the cap.

    if (path === '/api/refresh') {
      const refreshIp = getClientIP(request);
      const refreshRate = checkAdminIPRateLimit(refreshIp);
      if (!refreshRate.allowed) {
        return rateLimitedResponse(refreshRate);
      }
      if (!isAuthorizedAdmin(env, extractAdminKey(request, url))) {
        return jsonResponse(
          { ok: false, error: 'unauthorized', message: '/api/refresh requires a valid ?key= param' },
          401,
          0,
        );
      }
      const task = url.searchParams.get('task');
      if (task === 'history') {
        const result = await captureHistory(env);
        return jsonResponse({ message: 'History snapshot captured', ...result });
      }
      if (task === 'harnesses') {
        // On-demand pull of the TerminalFeed federation harness board, so the
        // /api/harnesses overlay can land a fresh upstream (e.g. a new flagship)
        // without waiting for the daily 05:25 UTC cron. Writes the snapshot KV.
        const { refreshHarnessSnapshot } = await import('./terminalfeed-harnesses-fetcher');
        const snap = await refreshHarnessSnapshot(env);
        return jsonResponse(
          snap
            ? {
                ok: true,
                message: 'TerminalFeed harness snapshot refreshed',
                upstream_generated_at: snap.upstream_generated_at,
                captured_at: snap.capturedAt,
                benchmark_count: snap.benchmark_count,
                total_results: snap.total_results,
              }
            : { ok: false, message: 'Harness snapshot refresh failed (upstream unavailable or empty); kept last-known-good' },
        );
      }
      if (task === 'models') {
        // Full daily catalog refresh (models + benchmarks + agent staleness),
        // including the LiteLLM price merge that repairs tracked display names
        // and prunes dated snapshot duplicates. Lets an admin land a catalog
        // fix without waiting for the 07:00 UTC cron.
        const result = await updateDailyData(env);
        return jsonResponse({ message: 'Daily catalog refresh ran (models, benchmarks, agents)', ...result });
      }
      if (task === 'intelligence') {
        // Capture the daily TFII (Intelligence Index) snapshot on demand so
        // /api/intelligence can be repopulated without waiting for the 07:00 UTC
        // cron. Reads the current benchmarks KV (run task=models first if it is
        // stale); writes intelligence:snapshot:latest plus the dated key. Returns
        // the capture error verbatim (503) when benchmarks are unavailable, so a
        // missing snapshot is diagnosable rather than silent.
        const { captureIntelligenceSnapshot } = await import('./model-intelligence');
        const result = await captureIntelligenceSnapshot(env, new Date().toISOString());
        return jsonResponse(
          { message: result.ok ? 'Intelligence (TFII) snapshot captured' : 'Intelligence snapshot skipped', ...result },
          result.ok ? 200 : 503,
        );
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
      if (task === 'federal-ai-policy') {
        const { captureFederalAiPolicy } = await import('./federal-ai-policy');
        const result = await captureFederalAiPolicy(env);
        return jsonResponse({ message: 'Federal AI policy snapshot captured', ...result });
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
      if (task === 'openreview') {
        const result = await refreshOpenReviewAcceptances(env);
        return jsonResponse({ message: 'OpenReview conference acceptances refreshed', ...result });
      }
      if (task === 'acl') {
        const result = await refreshAclProceedings(env);
        return jsonResponse({ message: 'ACL Anthology proceedings refreshed', ...result });
      }
      if (task === 'lab-blogs') {
        const result = await refreshResearchBlogs(env);
        return jsonResponse({ message: 'Research blogs refreshed', ...result });
      }
      if (task === 's2') {
        const result = await enrichVelocityWithS2(env);
        return jsonResponse({ message: 'Citation-velocity Semantic Scholar enrichment ran', ...result });
      }
      if (task === 'openalex-citation-velocity') {
        const result = await refreshOpenAlexAICitationVelocity(env);
        return jsonResponse({ message: 'OpenAlex AI citation-velocity refreshed', ...result });
      }
      if (task === 'crawler-access') {
        const { captureAiCrawlerAccessMap } = await import('./ai-crawler-access-feed');
        const result = await captureAiCrawlerAccessMap(env);
        return jsonResponse({ message: 'AI Crawler Access Map rolling crawl ran', ...result });
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
      if (task === 'sec-filings') {
        try {
          const { refreshSecFilingsSnapshot } = await import('./sec-filings-fetcher');
          const snap = await refreshSecFilingsSnapshot(env);
          return jsonResponse({
            message: 'SEC filings refreshed for AI bellwether cohort',
            cohort_size: snap.cohort_size,
            filings_count: snap.filings_count,
            filings_by_company: snap.filings_by_company,
            capturedAt: snap.capturedAt,
          });
        } catch (err) {
          const msg = err instanceof Error ? err.message : String(err);
          console.error('refreshSecFilingsSnapshot threw:', msg);
          return jsonResponse({ ok: false, error: 'refresh_failed', message: msg }, 500, 0);
        }
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
    // Auth pattern when re-enabled: isAuthorizedAdmin(env, extractAdminKey(request, url))
    // if (path === '/api/tweet' && isAuthorizedAdmin(env, extractAdminKey(request, url))) {
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

    // x402-index settlement indexer (audit #5). Runs once every 5 minutes, gated
    // on the dedicated "*/5 * * * *" trigger. Cloudflare fires scheduled() once
    // PER matching cron pattern, so at minutes shared by */2, */10, and */15 the
    // handler runs several times concurrently. The prior gate on the wall-clock
    // minute (minute % 5 === 0) therefore ran the indexer 2-3x at once, bursting
    // the RPC rate limit and racing on the cursor. Verified 2026-05-30 from worker
    // logs that a "*/5" invocation fires at every multiple-of-5 minute (8
    // consecutive, no gaps), so this branch runs the tick exactly once per cycle.
    // An earlier comment claimed "*/5" was shadowed at collision minutes; that is
    // not the observed behavior.
    if (cron === '*/5 * * * *') {
      const { runIndexerTick } = await import('./x402-index/indexer');
      await run('x402IndexerTick', () => runIndexerTick(env));
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
    } else if (cron === '25 */2 * * *') {
      // Every 2 hours at :25 past: podcast feeds (10 sources, weekly cadence).
      // Was "0 */2 * * *" until 2026-05-25 but that pattern matched the same
      // 04:00 UTC instant as "0 4 * * *" (OpenAlex), so Cloudflare's scheduler
      // would fire one event with cron === "0 */2 * * *" and the 0 4 branch
      // never ran.
      await run('pollPodcastFeeds', () => pollPodcastFeeds(env));
    } else if (cron === '0 7 * * *') {
      // Daily (7 AM UTC): update models, benchmarks, agents staleness
      await run('updateDailyData', () => updateDailyData(env));
      // Phase 0 of agent payments: capture daily historical snapshot of
      // pricing, models, benchmarks, status, agent activity. Runs after
      // updateDailyData so the snapshot reflects freshly-updated data.
      await run('captureHistory', () => captureHistory(env));
      // Daily TFII (model Intelligence Index) snapshot. Computes the composite
      // from the freshly-updated benchmarks and writes latest + dated keys so
      // the premium history series accrues. Runs after captureHistory so the
      // benchmarks KV is current. See worker/src/model-intelligence.ts.
      await run('captureIntelligenceSnapshot', async () => {
        const { captureIntelligenceSnapshot } = await import('./model-intelligence');
        const res = await captureIntelligenceSnapshot(env, new Date().toISOString());
        if (!res.ok) throw new Error(`intelligence snapshot skipped: ${res.error}`);
      });
      // Daily AI Attention Index snapshot. Compounds into a multi-month
      // series of per-provider attention. Backs /api/attention/history
      // (free) and /api/premium/attention/series (1 credit).
      const { captureAttentionSnapshot } = await import('./attention-history');
      await run('captureAttentionSnapshot', () => captureAttentionSnapshot(env));
      // Catalog-driven freshness check: flags model/benchmark/harness datasets
      // that predate the newest flagship or have exceeded their SLA. Emails
      // an alert when any dataset is stale.
      await run('checkDataFreshness', async () => {
        const { checkDataFreshness } = await import('./data-freshness');
        await checkDataFreshness(env, new Date().toISOString());
      });
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
      // Same 14:00 UTC slot: Federal AI Spending snapshot (US federal
      // contract and grant awards flowing to the curated AI vendor
      // cohort, pulled from USAspending.gov). Same class of daily
      // external snapshot, co-located here to reuse this registered
      // trigger and avoid a duplicate wrangler.toml cron. Backs free
      // /api/funding/federal/summary and /recent.
      await run('captureFederalSpending', async () => {
        const { captureFederalSpending, FED_SPEND_SNAPSHOT_KEY } = await import(
          './federal-spending-fetcher'
        );
        const snap = await captureFederalSpending(env);
        await safePut(env, env.TENSORFEED_CACHE, FED_SPEND_SNAPSHOT_KEY, JSON.stringify(snap));
      });
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
    } else if (cron === '5 */6 * * *') {
      // Every 6h at :05 UTC: refresh SEC EDGAR filings for the AI
      // bellwether cohort. Sequential per-company fetches polite to SEC's
      // 10 req/sec ceiling. Writes sec-filings:current + per-company
      // snapshots. Powers free /api/sec/filings/recent +
      // /api/sec/filings/{cik}/recent.
      const { refreshSecFilingsSnapshot } = await import('./sec-filings-fetcher');
      await run('refreshSecFilingsSnapshot', () => refreshSecFilingsSnapshot(env));
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
      // Semantic Scholar cross-check: enrich the velocity snapshot with S2's
      // influential-citation count + tldr (separate host, runs even when the
      // OpenAlex velocity fetch above was throttled and kept last-known-good).
      await run('enrichVelocityWithS2', () => enrichVelocityWithS2(env));
      // OpenReview notable-tier conference acceptances (Track A2). Independent
      // host, not subject to the OpenAlex CF-egress throttle, so it is safe in
      // the same daily branch and succeeds even when OpenAlex is throttled.
      await run('refreshOpenReviewAcceptances', () => refreshOpenReviewAcceptances(env));
      // ACL Anthology recent NLP/CL proceedings (Track A2 source 2). Range-fetched
      // venue XML from GitHub, independent host, safe alongside the others.
      await run('refreshAclProceedings', () => refreshAclProceedings(env));
      // AI lab + academic research blogs RSS aggregation (Track A2 source 3).
      await run('refreshResearchBlogs', () => refreshResearchBlogs(env));
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
    } else if (cron === '17 10 * * *') {
      // Daily 10:17 UTC: substrate changelog capture. Diffs the model catalog
      // + deprecation registry day over day and polls the MCP / x402 / A2A
      // spec repos, appending model lifecycle + spec-version events to the
      // forward-only log. First run seeds the snapshots silently; events begin
      // the next day. Slot 10:17 is collision-free (NOT 0 10, which the hourly
      // 0 * * * * shadows under first-match-wins). Powers free
      // /api/substrate-changelog/recent + premium
      // /api/premium/substrate-changelog/history.
      const { captureSubstrateChangelog } = await import('./substrate-changelog/capture');
      await run('captureSubstrateChangelog', () => captureSubstrateChangelog(env));
    } else if (cron === '23 16 * * *') {
      // Daily 16:23 UTC: government AI procurement capture. One USAspending
      // keyword search across every vendor for AI contract awards over the
      // trailing 180 days, rolled up by agency demand plus an emerging-vendor
      // flag, written to ai-procurement:snapshot. Best-effort by design
      // (never throws). Powers free /api/procurement/ai-contracts + premium
      // /api/premium/procurement/ai-contracts/demand. Slot 16:23 is
      // collision-free (hour 16 empty, minute 23 odd/not-mult-5/not-27).
      const { captureAiProcurement } = await import('./ai-procurement');
      await run('captureAiProcurement', () => captureAiProcurement(env));
    } else if (cron === '43 18 * * *') {
      // Daily 18:43 UTC: AI export-control capture (worker/src/export-controls.ts).
      // Unions the BIS Federal Register term queries, keeps AI/advanced-computing
      // relevant docs, classifies each, merges into the forward-only snapshot at
      // export-controls:ai:events. Best-effort by design (never throws). Powers
      // free /api/export-controls/ai + premium /api/premium/export-controls/ai/
      // history. Slot 18:43 is collision-free (hour 18 has no fixed-time cron,
      // minute 43 is odd and unmatched by any wildcard incl 0 *, 27 *, */2, */5,
      // */6-minute, and the */6-hour :15/:35 patterns).
      const { captureExportControls } = await import('./export-controls');
      await run('captureExportControls', () => captureExportControls(env));
    } else if (cron === '33 19 * * *') {
      // Daily 19:33 UTC: EU AI Act notified-body capture (worker/src/eu-ai-act.ts).
      // Queries the EC search API behind the NANDO / SMCS Angular SPA for every
      // latest-version notification under the AI Act (168380), Cyber Resilience
      // Act (167953), and EUCC (164702), diffs against the previous snapshot,
      // and appends designation-change events (first_seen / status_change /
      // scope_change / delisted) to the forward-only log. Best-effort by design
      // (never throws). Powers free /api/eu-ai-act/notified-bodies + the
      // premium change-history read. Slot 19:33 is collision-free (hour 19 has
      // no fixed-time cron; minute 33 is odd, dodges 0 *, 27 *, */2, */5,
      // */10, */15, and the multi-hour :15/:25/:35 patterns).
      const { captureEuAiAct } = await import('./eu-ai-act');
      await run('captureEuAiAct', () => captureEuAiAct(env));
    } else if (cron === '37 1 * * *') {
      // Daily 01:37 UTC: federal AI opportunities capture (worker/src/
      // ai-opportunities.ts). One title-keyword SAM.gov Get Opportunities
      // search per AI term, unioned by noticeId, over the trailing 90 days,
      // rolled up by agency and set-aside, written to ai-opportunities:snapshot.
      // Best-effort by design (never throws; a missing SAM_GOV_API_KEY logs a
      // warning and writes an empty snapshot). Powers free /api/procurement/
      // ai-opportunities + premium /api/premium/procurement/ai-opportunities/
      // deadlines. Slot 01:37 is collision-free (hour 1 empty, minute 37 odd/
      // not-mult-2/not-mult-5/not-27, and not minute 0 shadowed by 0 * * * *).
      const { captureAiOpportunities } = await import('./ai-opportunities');
      await run('captureAiOpportunities', () => captureAiOpportunities(env));
    } else if (cron === '47 1 * * *') {
      // Daily 01:47 UTC: federal AI policy capture (worker/src/
      // federal-ai-policy.ts). One term query per AI keyword against the
      // Federal Register (no key) plus GovInfo BILLS search (key-gated on
      // DATA_GOV_API_KEY), filtered to documents and bills whose title or
      // abstract names an AI term, written to federal-ai-policy:snapshot.
      // Best-effort by design (never throws; a missing data.gov key just skips
      // the bill layer and writes bills_enabled=false). Powers free
      // /api/federal-ai-policy + premium /api/premium/federal-ai-policy. Slot
      // 01:47 is collision-free (hour 1 holds only 37 1; minute 47 is odd and
      // dodges 0 *, 27 *, */2, */5, */10).
      const { captureFederalAiPolicy } = await import('./federal-ai-policy');
      await run('captureFederalAiPolicy', () => captureFederalAiPolicy(env));
    } else if (cron === '35 6 * * *') {
      // Daily 06:35 UTC: crawl every seed publisher's /.well-known/x402.json,
      // merge first_seen across re-crawls, write the wallet allowlist +
      // per-publisher records to KV. Slot is 06:35 because 06:30 is held
      // by the CISA KEV cron; 06:35 is unused by any other cron.
      const { refreshAllPublishers } = await import('./x402-index/publisher-registry');
      const result = await refreshAllPublishers(env);
      console.log('[x402-index] publisher refresh:', JSON.stringify(result));
      // Bounded daily reconciliation backfill: replays curated-wallet USDC history
      // so any settlement the forward indexer missed (e.g. during an indexer outage)
      // gets captured, and day-one history fills in across runs. Idempotent and
      // time-bounded, so it is a cheap no-op once caught up. Best-effort via run() so
      // a failure can never block the directory precompute below.
      await run('x402IndexBackfill', async () => {
        const { backfillCuratedWallets } = await import('./x402-index/backfill');
        const b = await backfillCuratedWallets(env);
        console.log('[x402-index] backfill:', JSON.stringify(b));
      });
      await run('x402VerifiedDirectory', async () => {
        const { writeVerifiedDirectory } = await import('./x402-index/verified-precompute');
        await writeVerifiedDirectory(env);
      });
      return;
    }

    // Daily 09:53 UTC: AI Crawler Access Map rolling refresh. Independent
    // top-level if (not chained into the else-if above) so it dispatches on
    // its own dedicated slot. Crawls ~1/7 of the seed universe, merges into
    // the R2 snapshot, appends flips, advances the KV cursor.
    if (cron === '53 9 * * *') {
      const { captureAiCrawlerAccessMap } = await import('./ai-crawler-access-feed');
      await run('captureAiCrawlerAccessMap', () => captureAiCrawlerAccessMap(env));
    }

    // Daily 06:41 UTC: anti-drift health audit. Independent top-level if (not
    // chained into the else-if above) so it dispatches on its own dedicated
    // slot. HEAD-checks the live deployed site for broken URLs, folds in the
    // catalog data-freshness check, persists drift:last, and emails an alert
    // only when health flips to red or a new failure appears. The scheduled()
    // signature is (event, env) with no ctx, so the orchestrator awaits its
    // own work here. Powers the redacted /api/health/drift.
    if (cron === '41 6 * * *') {
      const { runDriftAudit } = await import('./drift-audit');
      await run('runDriftAudit', () => runDriftAudit(env));
    }

    // Daily 00:19 UTC: rebuild yesterday's premium rollup from the lossless
    // per-event trail (heals the KV read-modify-write undercount on burst
    // settles), then recompute the lifetime counter from the now-exact
    // rollups. Lifetime backfill only runs when a rebuild actually landed.
    if (cron === '19 0 * * *') {
      const { reconcileRollupForDate, backfillLifetimeFromRollups } = await import('./payments');
      const yesterday = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString().slice(0, 10);
      const result = await run('reconcileRollup', () => reconcileRollupForDate(env, yesterday));
      if (result && result.action === 'reconciled') {
        await run('backfillLifetime', () => backfillLifetimeFromRollups(env));
      }
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
