import { Env } from './types';

/**
 * Premium news search.
 *
 * Free /api/news returns the latest articles in date order with optional
 * category filter. This module powers /api/premium/news/search, which adds:
 *   - Full-text query against title + snippet
 *   - Date range filter (from / to)
 *   - Provider filter (matches source name and sourceDomain)
 *   - Category filter
 *   - Relevance scoring (term frequency + recency boost)
 *
 * Cost: 1 credit per call. Backed by the same `articles` KV payload as
 * the free endpoint, so no new ingestion cost; the value is in the search
 * abstraction agents would otherwise have to build themselves.
 */

interface Article {
  id: string;
  title: string;
  url: string;
  source: string;
  sourceDomain: string;
  snippet: string;
  categories: string[];
  publishedAt: string;
  fetchedAt: string;
}

const ISO_DATE = /^\d{4}-\d{2}-\d{2}$/;

export interface NewsSearchOptions {
  q?: string;
  from?: string;
  to?: string;
  provider?: string;
  category?: string;
  limit?: number;
}

export interface ScoredArticle {
  article: Article;
  relevance: number;
  matched_terms: string[];
}

export interface NewsAttribution {
  policy: string;
  snippet_max_chars: number;
  link_required: true;
  source_required: true;
}

export const NEWS_ATTRIBUTION: NewsAttribution = {
  policy:
    'RSS-syndicated headlines and snippets capped at 200 characters with mandatory link and source name. Title and snippet are syndicated under the publisher\'s RSS feed; full content and editorial control remain with the original publisher. Each result links to the canonical article on the source domain.',
  snippet_max_chars: 200,
  link_required: true,
  source_required: true,
};

export interface NewsSearchResult {
  ok: true;
  query: string | null;
  filters: {
    from?: string;
    to?: string;
    provider?: string;
    category?: string;
  };
  total_corpus: number;
  matched: number;
  returned: number;
  /**
   * Corpus capture time: the most recent fetchedAt across the WHOLE article
   * corpus (the RSS poll cron stamps every article it pulls with the pull
   * time, so this is effectively the last successful news refresh). Null only
   * when the corpus is empty or carries no parseable fetchedAt. This is the
   * real data-capture signal the 30-min staleness SLA bills against; it is NOT
   * a response timestamp and it advances every poll even in a quiet news
   * window (so a quiet period does not falsely look stale, while a stalled
   * poll cron does). publishedAt is deliberately not used: it is the article's
   * own publication time, which can outrun the SLA during slow news.
   */
  captured_at: string | null;
  attribution: NewsAttribution;
  results: {
    title: string;
    url: string;
    source: string;
    source_domain: string;
    snippet: string;
    categories: string[];
    published_at: string;
    relevance: number;
    matched_terms: string[];
  }[];
}

export interface NewsSearchError {
  ok: false;
  error: string;
}

const STOP_WORDS = new Set([
  'a', 'an', 'and', 'are', 'as', 'at', 'be', 'by', 'for', 'from', 'has',
  'he', 'in', 'is', 'it', 'its', 'of', 'on', 'or', 'that', 'the', 'this',
  'to', 'was', 'were', 'will', 'with', 'i', 'you', 'we', 'they',
]);

function tokenize(text: string): string[] {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, ' ')
    .split(/\s+/)
    .filter(t => t.length >= 2 && !STOP_WORDS.has(t));
}

function uniqueTokens(text: string): string[] {
  return Array.from(new Set(tokenize(text)));
}

interface ScoringInput {
  article: Article;
  queryTerms: string[];
  /** ISO timestamp of the most recent article in the corpus, used for recency boost. */
  newestMs: number;
  /** ISO timestamp of the oldest article in the corpus. */
  oldestMs: number;
}

/**
 * Relevance is a blend of term frequency in title (weight 3), term
 * frequency in snippet (weight 1), and a recency factor in [0, 0.3].
 * Returns { score, matched } so the response can show which query
 * terms actually hit.
 */
function scoreArticle(input: ScoringInput): { score: number; matched: string[] } {
  const titleTokens = tokenize(input.article.title);
  const snippetTokens = tokenize(input.article.snippet);
  const titleSet = new Set(titleTokens);
  const snippetSet = new Set(snippetTokens);

  let termHits = 0;
  const matched: string[] = [];
  for (const term of input.queryTerms) {
    let hit = false;
    if (titleSet.has(term)) {
      termHits += 3;
      hit = true;
    }
    if (snippetSet.has(term)) {
      termHits += 1;
      hit = true;
    }
    if (hit) matched.push(term);
  }

  if (termHits === 0) return { score: 0, matched: [] };

  // Normalize term hits by query length so longer queries don't
  // automatically out-score shorter ones.
  const normalizedHits = termHits / (input.queryTerms.length * 4); // max 1.0 if every term hits both title and snippet

  // Recency boost: newer articles get up to 0.3 added.
  let recency = 0;
  const range = input.newestMs - input.oldestMs;
  if (range > 0) {
    const articleMs = new Date(input.article.publishedAt).getTime();
    const norm = Math.max(0, Math.min(1, (articleMs - input.oldestMs) / range));
    recency = norm * 0.3;
  }

  return {
    score: parseFloat((normalizedHits * 0.7 + recency).toFixed(4)),
    matched,
  };
}

function withinRange(article: Article, from?: string, to?: string): boolean {
  if (!from && !to) return true;
  const ms = new Date(article.publishedAt).getTime();
  if (Number.isNaN(ms)) return false;
  if (from) {
    const fromMs = new Date(`${from}T00:00:00Z`).getTime();
    if (ms < fromMs) return false;
  }
  if (to) {
    // Inclusive end-of-day for `to`
    const toMs = new Date(`${to}T23:59:59Z`).getTime();
    if (ms > toMs) return false;
  }
  return true;
}

function matchesProvider(article: Article, provider: string): boolean {
  const k = provider.toLowerCase();
  return (
    article.source.toLowerCase().includes(k) ||
    article.sourceDomain.toLowerCase().includes(k)
  );
}

function matchesCategory(article: Article, category: string): boolean {
  const k = category.toLowerCase();
  return article.categories.some(c => c.toLowerCase().includes(k));
}

export async function searchNews(
  env: Env,
  options: NewsSearchOptions,
): Promise<NewsSearchResult | NewsSearchError> {
  if (options.from && !ISO_DATE.test(options.from)) {
    return { ok: false, error: 'invalid_from_date_format' };
  }
  if (options.to && !ISO_DATE.test(options.to)) {
    return { ok: false, error: 'invalid_to_date_format' };
  }
  if (options.from && options.to && options.from > options.to) {
    return { ok: false, error: 'from_after_to' };
  }

  const articles =
    ((await env.TENSORFEED_NEWS.get('articles', 'json')) as Article[] | null) ?? [];
  const totalCorpus = articles.length;

  // Corpus capture time = the freshest fetchedAt across the whole corpus (the
  // RSS poll stamps every article with its pull time). This is the data-time
  // the 30-min staleness SLA bills against. Computed over the full corpus, not
  // the filtered pool, so a from/to filter restricting to old articles does
  // not make a healthy corpus look stale.
  let newestFetchedMs = -Infinity;
  for (const a of articles) {
    const ms = new Date(a.fetchedAt).getTime();
    if (!Number.isNaN(ms) && ms > newestFetchedMs) newestFetchedMs = ms;
  }
  const corpusCapturedAt =
    newestFetchedMs > -Infinity ? new Date(newestFetchedMs).toISOString() : null;

  // Apply non-text filters first to shrink the candidate set
  let pool = articles;
  if (options.from || options.to) {
    pool = pool.filter(a => withinRange(a, options.from, options.to));
  }
  if (options.provider) {
    pool = pool.filter(a => matchesProvider(a, options.provider!));
  }
  if (options.category) {
    pool = pool.filter(a => matchesCategory(a, options.category!));
  }

  const limit = Math.max(1, Math.min(options.limit ?? 25, 100));
  const queryTerms = options.q ? uniqueTokens(options.q) : [];

  // No-query path: filtered articles in publishedAt desc, no scoring
  if (queryTerms.length === 0) {
    const sorted = pool
      .slice()
      .sort((a, b) => new Date(b.publishedAt).getTime() - new Date(a.publishedAt).getTime())
      .slice(0, limit);
    return {
      ok: true,
      query: options.q ? options.q : null,
      filters: {
        ...(options.from ? { from: options.from } : {}),
        ...(options.to ? { to: options.to } : {}),
        ...(options.provider ? { provider: options.provider } : {}),
        ...(options.category ? { category: options.category } : {}),
      },
      total_corpus: totalCorpus,
      matched: pool.length,
      returned: sorted.length,
      captured_at: corpusCapturedAt,
      attribution: NEWS_ATTRIBUTION,
      results: sorted.map(a => ({
        title: a.title,
        url: a.url,
        source: a.source,
        source_domain: a.sourceDomain,
        snippet: a.snippet,
        categories: a.categories,
        published_at: a.publishedAt,
        relevance: 1,
        matched_terms: [],
      })),
    };
  }

  // Scored path
  if (pool.length === 0) {
    return {
      ok: true,
      query: options.q ?? null,
      filters: {
        ...(options.from ? { from: options.from } : {}),
        ...(options.to ? { to: options.to } : {}),
        ...(options.provider ? { provider: options.provider } : {}),
        ...(options.category ? { category: options.category } : {}),
      },
      total_corpus: totalCorpus,
      matched: 0,
      returned: 0,
      captured_at: corpusCapturedAt,
      attribution: NEWS_ATTRIBUTION,
      results: [],
    };
  }

  const times = pool.map(a => new Date(a.publishedAt).getTime()).filter(n => !Number.isNaN(n));
  const newestMs = times.length ? Math.max(...times) : Date.now();
  const oldestMs = times.length ? Math.min(...times) : Date.now();

  const scored: ScoredArticle[] = [];
  for (const article of pool) {
    const { score, matched } = scoreArticle({ article, queryTerms, newestMs, oldestMs });
    if (score > 0) {
      scored.push({ article, relevance: score, matched_terms: matched });
    }
  }

  scored.sort((a, b) => b.relevance - a.relevance);
  const top = scored.slice(0, limit);

  return {
    ok: true,
    query: options.q ?? null,
    filters: {
      ...(options.from ? { from: options.from } : {}),
      ...(options.to ? { to: options.to } : {}),
      ...(options.provider ? { provider: options.provider } : {}),
      ...(options.category ? { category: options.category } : {}),
    },
    total_corpus: totalCorpus,
    matched: scored.length,
    returned: top.length,
    captured_at: corpusCapturedAt,
    attribution: NEWS_ATTRIBUTION,
    results: top.map(s => ({
      title: s.article.title,
      url: s.article.url,
      source: s.article.source,
      source_domain: s.article.sourceDomain,
      snippet: s.article.snippet,
      categories: s.article.categories,
      published_at: s.article.publishedAt,
      relevance: s.relevance,
      matched_terms: s.matched_terms,
    })),
  };
}
