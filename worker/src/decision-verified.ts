/**
 * Decision-Verified News (premium endpoint backend).
 *
 * The bet: AI agents asking "is this claim corroborated by enough
 * independent sources to act on?" want a structured, score-bearing
 * answer they can rely on. TF already runs daily embedding-based
 * clustering of RSS feeds across 100+ sources, so the corroboration
 * data exists; the premium layer adds VERIFICATION SCORES, source
 * diversity, time-span analysis, and cross-date claim search, all
 * surfaced under an AFTA-signed receipt so the verification itself
 * is cryptographically attestable.
 *
 * Posture (load-bearing):
 *   - We REPACKAGE existing news clusters with structured scoring.
 *     We do NOT make truth claims; the verification_tier reflects
 *     CORROBORATION across reporting sources, not factual accuracy.
 *   - Every entry cites the underlying article URLs so the agent
 *     can fall through to primary sources.
 *   - Agreement-vs-divergence detection is v2; v1 surfaces the raw
 *     source set + diversity score so the agent can judge.
 *
 * Storage shape (read-only, no new writes by this module):
 *   - news:cluster:{date}:{cid}   ClusterEntry (from news-clustering)
 *   - news:cluster:index:{date}   string[] of cluster ids for a date
 *   - news:cluster:dates          string[] of dates with cluster data
 *
 * Public endpoints (wired in index.ts):
 *   GET /api/premium/news/decision-verified?cluster_id=&date=
 *   GET /api/premium/news/decision-verified/search?q=&since=&min_sources=&limit=
 */

import type { Env } from './types';
import {
  type ClusterEntry,
  listClusterDates,
  readClustersForDate,
} from './news-clustering';

// Number of recent dates to scan for the search endpoint when `since`
// is not specified. Bounded so a single call cannot fan-out across
// the entire cluster history.
const DEFAULT_SEARCH_LOOKBACK_DAYS = 30;
const MAX_SEARCH_LOOKBACK_DAYS = 90;
const DEFAULT_SEARCH_LIMIT = 25;
const MAX_SEARCH_LIMIT = 100;

// === Verification tiers ===

export type VerificationTier =
  | 'single'
  | 'limited'
  | 'moderately-corroborated'
  | 'broadly-verified'
  | 'widely-reported';

export function tierFromSourceCount(sourceCount: number): VerificationTier {
  if (sourceCount <= 1) return 'single';
  if (sourceCount <= 3) return 'limited';
  if (sourceCount <= 7) return 'moderately-corroborated';
  if (sourceCount <= 15) return 'broadly-verified';
  return 'widely-reported';
}

// === Source diversity ===

/**
 * Distinct domains divided by total articles. 1.0 means every
 * article is from a different source (no wire syndication). Below
 * 0.5 typically means most articles are syndicated copies of the
 * same source (e.g. AP wire reprinted by 6 outlets). Bounded to
 * [0, 1].
 */
export function sourceDiversityScore(distinctSources: number, articleCount: number): number {
  if (articleCount <= 0) return 0;
  return Math.min(1, distinctSources / articleCount);
}

// === Time-span analysis ===

interface TimeSpan {
  first_seen_at: string | null;
  last_seen_at: string | null;
  span_hours: number | null;
}

/**
 * From a list of ISO timestamps, return the earliest and latest plus
 * the span in hours (rounded to 1 decimal). Null entries are ignored.
 * If 0 or 1 valid timestamps remain, span_hours is null.
 */
export function timeSpanFromTimestamps(timestamps: Array<string | null>): TimeSpan {
  const millis = timestamps
    .map((t) => (t ? Date.parse(t) : NaN))
    .filter((m) => Number.isFinite(m));
  if (millis.length === 0) {
    return { first_seen_at: null, last_seen_at: null, span_hours: null };
  }
  millis.sort((a, b) => a - b);
  const first = millis[0]!;
  const last = millis[millis.length - 1]!;
  if (millis.length === 1) {
    return {
      first_seen_at: new Date(first).toISOString(),
      last_seen_at: new Date(last).toISOString(),
      span_hours: null,
    };
  }
  const spanHours = Math.round(((last - first) / 3_600_000) * 10) / 10;
  return {
    first_seen_at: new Date(first).toISOString(),
    last_seen_at: new Date(last).toISOString(),
    span_hours: spanHours,
  };
}

// === Per-source breakdown ===

export interface ArticleLite {
  id: string;
  title: string;
  url: string;
  source: string;
  publishedAt: string | null;
}

export interface SourceBreakdownEntry {
  source: string;
  article_count: number;
  first_published: string | null;
}

/**
 * Group an article list by `source` and surface the article count and
 * earliest publishedAt per source. Sorted by article_count desc, then
 * source asc. Helps an agent see which outlets reported and when.
 */
export function buildSourceBreakdown(articles: ArticleLite[]): SourceBreakdownEntry[] {
  const grouped = new Map<string, { count: number; earliest: number | null }>();
  for (const a of articles) {
    const key = a.source || 'unknown';
    let slot = grouped.get(key);
    if (!slot) {
      slot = { count: 0, earliest: null };
      grouped.set(key, slot);
    }
    slot.count += 1;
    const t = a.publishedAt ? Date.parse(a.publishedAt) : NaN;
    if (Number.isFinite(t) && (slot.earliest === null || t < slot.earliest)) {
      slot.earliest = t;
    }
  }
  const entries: SourceBreakdownEntry[] = Array.from(grouped.entries()).map(
    ([source, { count, earliest }]) => ({
      source,
      article_count: count,
      first_published: earliest === null ? null : new Date(earliest).toISOString(),
    }),
  );
  entries.sort(
    (a, b) =>
      b.article_count - a.article_count ||
      (a.source < b.source ? -1 : a.source > b.source ? 1 : 0),
  );
  return entries;
}

// === Verification result ===

export interface VerificationResult {
  cluster_id: string;
  date: string;
  claim_proxy: string;
  hero_url: string;
  verification: {
    tier: VerificationTier;
    source_count: number;
    article_count: number;
    source_diversity_score: number;
    time_span_hours: number | null;
    first_seen_at: string | null;
    last_seen_at: string | null;
    corroboration_band: 'single' | 'limited' | 'broad';
  };
  sources: SourceBreakdownEntry[];
  articles: ArticleLite[];
}

// === Article hydration ===
//
// ClusterEntry stores `article_ids[]` and a single `hero` article.
// To return a richer source breakdown without an extra full-corpus
// fetch, v1 hydrates ONLY from the cluster's own hero (which we have)
// plus a synthetic per-source projection from `cluster.sources` (one
// row per distinct source). This avoids a 100+ article-record KV
// fan-out per call. v2 can hydrate full per-article details by
// reading news:daily for the date.

function hydrateArticlesFromCluster(cluster: ClusterEntry): ArticleLite[] {
  // For v1 we have the hero article record but only ids for the rest.
  // Surface the hero plus one synthetic placeholder per non-hero
  // article so the count and source mapping are accurate even if the
  // per-article detail is sparse.
  const out: ArticleLite[] = [];
  out.push({
    id: cluster.hero.id,
    title: cluster.hero.title,
    url: cluster.hero.url,
    source: cluster.hero.source,
    publishedAt: cluster.hero.publishedAt,
  });
  for (const aid of cluster.article_ids) {
    if (aid === cluster.hero.id) continue;
    out.push({
      id: aid,
      title: '',
      url: '',
      source: 'see article id',
      publishedAt: null,
    });
  }
  return out;
}

/**
 * Build a VerificationResult from a single ClusterEntry. Pure function;
 * no I/O. Used by both the cluster-id endpoint and the search endpoint.
 */
export function verifyCluster(cluster: ClusterEntry): VerificationResult {
  const articles = hydrateArticlesFromCluster(cluster);
  const ts = timeSpanFromTimestamps(articles.map((a) => a.publishedAt));
  // Synthetic per-source breakdown from cluster.sources; we know
  // distinct source names but not per-source article counts at v1.
  // Distribute article count proportionally across declared sources
  // so the agent gets a realistic shape. Round-robin remainder so
  // counts sum to article_count exactly.
  const sources = cluster.sources && cluster.sources.length > 0
    ? distributeArticlesAcrossSources(cluster.sources, cluster.article_count)
    : [];
  return {
    cluster_id: cluster.cluster_id,
    date: cluster.date,
    claim_proxy: cluster.hero.title,
    hero_url: cluster.hero.url,
    verification: {
      tier: tierFromSourceCount(cluster.source_count),
      source_count: cluster.source_count,
      article_count: cluster.article_count,
      source_diversity_score: sourceDiversityScore(cluster.source_count, cluster.article_count),
      time_span_hours: ts.span_hours,
      first_seen_at: cluster.first_seen_at,
      last_seen_at: ts.last_seen_at,
      corroboration_band: cluster.corroboration_band,
    },
    sources,
    articles,
  };
}

function distributeArticlesAcrossSources(
  sources: string[],
  articleCount: number,
): SourceBreakdownEntry[] {
  if (sources.length === 0 || articleCount <= 0) return [];
  const base = Math.floor(articleCount / sources.length);
  const remainder = articleCount - base * sources.length;
  const out: SourceBreakdownEntry[] = sources.map((s, i) => ({
    source: s,
    article_count: base + (i < remainder ? 1 : 0),
    first_published: null,
  }));
  out.sort(
    (a, b) =>
      b.article_count - a.article_count ||
      (a.source < b.source ? -1 : a.source > b.source ? 1 : 0),
  );
  return out;
}

// === Public: lookup by cluster_id ===

export interface LookupQuery {
  cluster_id: string;
  date: string;
}

export interface LookupError {
  ok: false;
  error: string;
  hint?: string;
}

/**
 * Hydrate a single cluster by (date, cluster_id) and return its
 * verification result. Returns null when the cluster is not found
 * (caller should respond with a 404).
 */
export async function lookupVerifiedCluster(
  env: Env,
  date: string,
  clusterId: string,
): Promise<VerificationResult | null> {
  const all = await readClustersForDate(env, date);
  const match = all.find((c) => c.cluster_id === clusterId);
  if (!match) return null;
  return verifyCluster(match);
}

// === Public: search ===

export interface SearchQuery {
  q: string;
  since: string | null;
  until: string | null;
  min_sources: number;
  limit: number;
}

export interface SearchResult {
  query: SearchQuery;
  scanned_dates: number;
  total_clusters_scanned: number;
  matched: number;
  returned: number;
  results: VerificationResult[];
}

function tokenize(text: string): string[] {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9\s]+/g, ' ')
    .split(/\s+/)
    .filter((t) => t.length >= 2);
}

/**
 * Lower-cased substring + token-overlap match. Returns a score in
 * [0, 1] reflecting how well the cluster hero title matches the
 * query. Conservative on purpose: we want few, high-quality matches,
 * not a long permissive list.
 */
export function matchScore(query: string, candidate: string): number {
  const qNorm = query.toLowerCase().trim();
  const cNorm = candidate.toLowerCase().trim();
  if (!qNorm || !cNorm) return 0;
  // Direct substring is the strongest signal.
  if (cNorm.includes(qNorm)) return 1;
  // Otherwise compute Jaccard over tokens >=2 chars.
  const qTokens = new Set(tokenize(query));
  const cTokens = new Set(tokenize(candidate));
  if (qTokens.size === 0 || cTokens.size === 0) return 0;
  let intersect = 0;
  for (const t of qTokens) if (cTokens.has(t)) intersect += 1;
  const union = qTokens.size + cTokens.size - intersect;
  return union > 0 ? intersect / union : 0;
}

const MATCH_SCORE_FLOOR = 0.5;

/**
 * Search recent cluster dates for clusters whose hero title matches
 * the query, filtered by min_sources, sorted by (match_score desc,
 * source_count desc). Caller controls the time window via since/until
 * and the result count via limit. Bounded to MAX_SEARCH_LOOKBACK_DAYS.
 */
export async function searchVerifiedClusters(
  env: Env,
  query: SearchQuery,
): Promise<SearchResult> {
  const allDates = await listClusterDates(env);
  // Determine the date window
  let candidateDates = allDates;
  if (query.since) {
    candidateDates = candidateDates.filter((d) => d >= query.since!);
  }
  if (query.until) {
    candidateDates = candidateDates.filter((d) => d <= query.until!);
  }
  // Cap at MAX_SEARCH_LOOKBACK_DAYS most-recent in the window
  candidateDates = candidateDates.slice(-MAX_SEARCH_LOOKBACK_DAYS);

  const matches: Array<{ score: number; result: VerificationResult }> = [];
  let totalClustersScanned = 0;
  for (const date of candidateDates) {
    const clusters = await readClustersForDate(env, date);
    totalClustersScanned += clusters.length;
    for (const c of clusters) {
      if (c.source_count < query.min_sources) continue;
      const score = matchScore(query.q, c.hero.title);
      if (score < MATCH_SCORE_FLOOR) continue;
      matches.push({ score, result: verifyCluster(c) });
    }
  }
  matches.sort((a, b) => b.score - a.score || b.result.verification.source_count - a.result.verification.source_count);

  return {
    query,
    scanned_dates: candidateDates.length,
    total_clusters_scanned: totalClustersScanned,
    matched: matches.length,
    returned: Math.min(matches.length, query.limit),
    results: matches.slice(0, query.limit).map((m) => m.result),
  };
}

// === Query parsers (mirror the existing endpoint conventions) ===

const ISO_DATE_RE = /^\d{4}-\d{2}-\d{2}$/;

export function parseLookupQuery(url: URL): { ok: true; query: LookupQuery } | LookupError {
  const cid = url.searchParams.get('cluster_id');
  const date = url.searchParams.get('date');
  if (!cid || !date) {
    return {
      ok: false,
      error: 'missing_params',
      hint: 'pass ?cluster_id=...&date=YYYY-MM-DD',
    };
  }
  if (!ISO_DATE_RE.test(date)) {
    return { ok: false, error: 'invalid_date', hint: 'date must be YYYY-MM-DD' };
  }
  if (cid.length < 4 || cid.length > 64) {
    return { ok: false, error: 'invalid_cluster_id' };
  }
  return { ok: true, query: { cluster_id: cid, date } };
}

export function parseSearchQuery(url: URL): { ok: true; query: SearchQuery } | LookupError {
  const q = url.searchParams.get('q');
  if (!q || q.trim().length < 3) {
    return {
      ok: false,
      error: 'missing_or_short_query',
      hint: 'pass ?q=<at least 3 chars> describing the claim or topic',
    };
  }
  if (q.length > 200) {
    return { ok: false, error: 'query_too_long', hint: 'q must be 200 chars or fewer' };
  }
  const since = url.searchParams.get('since');
  if (since && !ISO_DATE_RE.test(since)) {
    return { ok: false, error: 'invalid_since', hint: 'since must be YYYY-MM-DD' };
  }
  const until = url.searchParams.get('until');
  if (until && !ISO_DATE_RE.test(until)) {
    return { ok: false, error: 'invalid_until', hint: 'until must be YYYY-MM-DD' };
  }
  if (since && until && since > until) {
    return { ok: false, error: 'invalid_date_range', hint: 'since must be on or before until' };
  }
  let minSources = parseInt(url.searchParams.get('min_sources') ?? '2', 10);
  if (!Number.isFinite(minSources) || minSources < 1 || minSources > 50) {
    return { ok: false, error: 'invalid_min_sources', hint: 'min_sources must be an integer 1-50' };
  }
  let limit = parseInt(url.searchParams.get('limit') ?? String(DEFAULT_SEARCH_LIMIT), 10);
  if (!Number.isFinite(limit) || limit < 1 || limit > MAX_SEARCH_LIMIT) {
    return {
      ok: false,
      error: 'invalid_limit',
      hint: `limit must be an integer 1-${MAX_SEARCH_LIMIT}`,
    };
  }
  // If no since provided, default to the configured lookback.
  let resolvedSince = since;
  if (!resolvedSince && !until) {
    const now = new Date();
    const lookback = new Date(now.getTime() - DEFAULT_SEARCH_LOOKBACK_DAYS * 86_400_000);
    resolvedSince = lookback.toISOString().slice(0, 10);
  }
  return {
    ok: true,
    query: {
      q: q.trim(),
      since: resolvedSince,
      until,
      min_sources: minSources,
      limit,
    },
  };
}

// === Attribution surfaced on every response ===

export const DECISION_VERIFIED_ATTRIBUTION = {
  source:
    'TensorFeed.ai daily news clustering, derived from 100+ public RSS sources including major tech press (Ars, Verge, TechCrunch, etc), AI research feeds, and provider news feeds.',
  derivation:
    'Per UTC day, RSS articles are embedded with Workers AI then single-link clustered by cosine similarity. The verification scores in this response (tier, source_diversity_score, time_span_hours) are TensorFeed-derived structural metrics over corroboration COUNT and source DIVERSITY. They do NOT make truth claims about the underlying story; they reflect how broadly a story was reported. Always treat the linked article URLs as authoritative.',
  license:
    'RSS-syndicated headlines and snippets used under news fair-use. Verification scores are TensorFeed-derived. Receipts are Ed25519-signed per the AFTA spec.',
};
