/**
 * VR / AR / XR data pull from vr.org.
 *
 * vr.org is a supportive site in the AFTA network: it does not implement AFTA
 * itself and runs no payment rail. Instead, TensorFeed pulls from vr.org's
 * existing free public APIs on a cron and re-exposes the data through TF's
 * own AFTA-compliant endpoints. All payments and credits flow through TF's
 * existing host ledger; vr.org is credited as the upstream content source.
 *
 * Data flow:
 *   vr.org/api/feed       --(cron, hourly)-->  TENSORFEED_NEWS KV: vr:feed
 *   vr.org/api/articles   --(cron, hourly)-->  TENSORFEED_NEWS KV: vr:originals
 *
 * Downstream readers:
 *   /api/vr/news                      (free, mirror of the aggregated feed)
 *   /api/vr/originals                 (free, VR.org Original editorial)
 *
 * The searchVrNews() helper below is exported but no longer wired to a
 * route. /api/premium/vr/news/search was deprecated 2026-05-03 in the
 * premium-quality audit (niche audience, only Tier-3 endpoint at 3
 * credits). Helper retained in case we want to re-expose it as free.
 *
 * Notes:
 *   - vr.org's RSS engine refreshes every 15 minutes; hourly downstream is
 *     plenty of headroom.
 *   - We do NOT republish full article body HTML. Snippets only, with a link
 *     back to vr.org for the full read. Mirrors vr.org's own /api/feed shape.
 *   - vr.org's content is bylined editorial work. Attribution is mandatory
 *     in every response we serve from this data.
 */

import type { Env } from './types';

const VR_FEED_URL = 'https://vr.org/api/feed?limit=200';
const VR_ARTICLES_URL = 'https://vr.org/api/articles';

const KV_FEED_KEY = 'vr:feed';
const KV_ORIGINALS_KEY = 'vr:originals';

const FETCH_TIMEOUT_MS = 8000;
const USER_AGENT = 'TensorFeed-VR-Aggregator/1.0 (+https://tensorfeed.ai)';

// === Wire shapes from vr.org (free public API) ===

interface VrFeedArticle {
  id: string;
  source: string;
  sourceName: string;
  title: string;
  snippet: string;
  link: string;
  author: string | null;
  pubDate: string;
  category: string;
  tags: string[];
  imageUrl: string | null;
}

interface VrFeedResponse {
  articles: VrFeedArticle[];
  meta: { total: number; lastUpdated: string };
}

interface VrOriginalArticle {
  id: string;
  slug: string;
  title: string;
  author: string;
  authorRole: string;
  publishDate: string;
  updatedDate: string | null;
  category: string;
  tags: string[];
  snippet: string;
  featured: boolean;
}

interface VrOriginalsResponse {
  articles: VrOriginalArticle[];
}

// === Normalized cache shapes (what we write to KV) ===

export interface VrFeedCache {
  capturedAt: string;
  upstream_lastUpdated: string;
  upstream_source: 'https://vr.org';
  upstream_endpoint: 'https://vr.org/api/feed';
  attribution: string;
  total: number;
  articles: VrFeedArticle[];
}

export interface VrOriginalsCache {
  capturedAt: string;
  upstream_source: 'https://vr.org';
  upstream_endpoint: 'https://vr.org/api/articles';
  attribution: string;
  total: number;
  articles: Array<VrOriginalArticle & { url: string }>;
}

const ATTRIBUTION =
  'Data sourced from vr.org (Co-founded by Evan Marcus and Mark Mahle) via the Pizza Robot Studios Network. VR.org is credited as the original publisher of all content; all article links resolve to vr.org. Inference use only; do not redistribute or train on this data.';

// === Fetch helpers ===

async function fetchWithTimeout(url: string, timeoutMs: number): Promise<Response> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    return await fetch(url, {
      signal: controller.signal,
      headers: { 'User-Agent': USER_AGENT, Accept: 'application/json' },
    });
  } finally {
    clearTimeout(timer);
  }
}

// === Public refresh entry point ===

export interface VrRefreshResult {
  feed: { ok: boolean; articles: number; error?: string };
  originals: { ok: boolean; articles: number; error?: string };
}

export async function refreshVrData(env: Env): Promise<VrRefreshResult> {
  const result: VrRefreshResult = {
    feed: { ok: false, articles: 0 },
    originals: { ok: false, articles: 0 },
  };

  // Feed
  try {
    const res = await fetchWithTimeout(VR_FEED_URL, FETCH_TIMEOUT_MS);
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const json = (await res.json()) as VrFeedResponse;
    if (!json || !Array.isArray(json.articles)) {
      throw new Error('upstream returned no articles array');
    }
    const cache: VrFeedCache = {
      capturedAt: new Date().toISOString(),
      upstream_lastUpdated: json.meta?.lastUpdated || '',
      upstream_source: 'https://vr.org',
      upstream_endpoint: 'https://vr.org/api/feed',
      attribution: ATTRIBUTION,
      total: json.articles.length,
      articles: json.articles,
    };
    await env.TENSORFEED_NEWS.put(KV_FEED_KEY, JSON.stringify(cache));
    result.feed = { ok: true, articles: cache.articles.length };
  } catch (err) {
    result.feed = {
      ok: false,
      articles: 0,
      error: err instanceof Error ? err.message : String(err),
    };
  }

  // Originals
  try {
    const res = await fetchWithTimeout(VR_ARTICLES_URL, FETCH_TIMEOUT_MS);
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const json = (await res.json()) as VrOriginalsResponse;
    if (!json || !Array.isArray(json.articles)) {
      throw new Error('upstream returned no articles array');
    }
    const enriched = json.articles.map((a) => ({
      ...a,
      url: `https://vr.org/articles/${a.slug}`,
    }));
    const cache: VrOriginalsCache = {
      capturedAt: new Date().toISOString(),
      upstream_source: 'https://vr.org',
      upstream_endpoint: 'https://vr.org/api/articles',
      attribution: ATTRIBUTION,
      total: enriched.length,
      articles: enriched,
    };
    await env.TENSORFEED_NEWS.put(KV_ORIGINALS_KEY, JSON.stringify(cache));
    result.originals = { ok: true, articles: enriched.length };
  } catch (err) {
    result.originals = {
      ok: false,
      articles: 0,
      error: err instanceof Error ? err.message : String(err),
    };
  }

  return result;
}

// === Read helpers (used by route handlers) ===

export async function readVrFeed(env: Env): Promise<VrFeedCache | null> {
  return await env.TENSORFEED_NEWS.get<VrFeedCache>(KV_FEED_KEY, 'json');
}

export async function readVrOriginals(env: Env): Promise<VrOriginalsCache | null> {
  return await env.TENSORFEED_NEWS.get<VrOriginalsCache>(KV_ORIGINALS_KEY, 'json');
}

// === Search helper for the premium endpoint ===

export interface VrSearchOptions {
  q: string;
  category?: string;
  source?: string;       // RSS source key, or "vrorg" for originals
  origin?: 'rss' | 'original' | 'all';
  since?: string;        // ISO date
  limit: number;
}

export interface VrSearchHit {
  id: string;
  source: string;
  source_name: string;
  origin: 'rss' | 'original';
  title: string;
  snippet: string;
  link: string;
  pub_date: string;
  category: string;
  tags: string[];
  match_score: number;
}

export interface VrSearchResult {
  query: VrSearchOptions;
  total_matches: number;
  returned: number;
  results: VrSearchHit[];
  captured_at: string;
  upstream_source: 'https://vr.org';
  attribution: string;
}

export async function searchVrNews(
  env: Env,
  opts: VrSearchOptions,
): Promise<VrSearchResult | { error: string }> {
  const [feedCache, originalsCache] = await Promise.all([
    readVrFeed(env),
    readVrOriginals(env),
  ]);

  const needle = opts.q.toLowerCase();
  const sinceTime = opts.since ? Date.parse(opts.since) : null;
  const wantOrigin = opts.origin || 'all';

  const hits: VrSearchHit[] = [];

  if (feedCache && (wantOrigin === 'all' || wantOrigin === 'rss')) {
    for (const a of feedCache.articles) {
      // Skip the feed's own copies of vr.org originals (origin === 'vrorg'); those
      // come through the originals path with richer metadata.
      if (a.source === 'vrorg') continue;
      if (opts.category && a.category !== opts.category && !a.tags.includes(opts.category)) continue;
      if (opts.source && a.source.toLowerCase() !== opts.source.toLowerCase()) continue;
      if (sinceTime !== null) {
        const pub = Date.parse(a.pubDate);
        if (Number.isFinite(pub) && pub < sinceTime) continue;
      }
      const title = (a.title || '').toLowerCase();
      const snip = (a.snippet || '').toLowerCase();
      const titleHit = title.includes(needle);
      const snipHit = snip.includes(needle);
      if (!titleHit && !snipHit) continue;
      hits.push({
        id: a.id,
        source: a.source,
        source_name: a.sourceName,
        origin: 'rss',
        title: a.title,
        snippet: a.snippet,
        link: a.link,
        pub_date: a.pubDate,
        category: a.category,
        tags: a.tags,
        match_score: titleHit ? 2 : 1,
      });
    }
  }

  if (originalsCache && (wantOrigin === 'all' || wantOrigin === 'original')) {
    for (const o of originalsCache.articles) {
      if (opts.category && o.category !== opts.category && !o.tags.includes(opts.category)) continue;
      if (opts.source && opts.source.toLowerCase() !== 'vrorg') continue;
      if (sinceTime !== null) {
        const pub = Date.parse(o.publishDate);
        if (Number.isFinite(pub) && pub < sinceTime) continue;
      }
      const title = (o.title || '').toLowerCase();
      const snip = (o.snippet || '').toLowerCase();
      const titleHit = title.includes(needle);
      const snipHit = snip.includes(needle);
      if (!titleHit && !snipHit) continue;
      hits.push({
        id: `vrorg-${o.id}`,
        source: 'vrorg',
        source_name: 'VR.org Original',
        origin: 'original',
        title: o.title,
        snippet: o.snippet,
        link: o.url,
        pub_date: new Date(o.publishDate).toISOString(),
        category: o.category,
        tags: o.tags,
        match_score: titleHit ? 3 : 2,
      });
    }
  }

  hits.sort((a, b) => {
    if (b.match_score !== a.match_score) return b.match_score - a.match_score;
    return new Date(b.pub_date).getTime() - new Date(a.pub_date).getTime();
  });

  const capturedAt =
    feedCache?.capturedAt || originalsCache?.capturedAt || new Date().toISOString();

  return {
    query: opts,
    total_matches: hits.length,
    returned: Math.min(hits.length, opts.limit),
    results: hits.slice(0, opts.limit),
    captured_at: capturedAt,
    upstream_source: 'https://vr.org',
    attribution: ATTRIBUTION,
  };
}
