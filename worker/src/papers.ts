import { Env } from './types';

/**
 * Daily curated AI/ML research papers, sourced from the Semantic Scholar
 * Graph API (https://api.semanticscholar.org/graph/v1).
 *
 * Strategy: fan out a small set of broad AI-related search queries, dedup
 * by paperId, sort by citation count, keep the top N. The free tier of the
 * Semantic Scholar API is unauthenticated (no key required); if the worker
 * secret SEMANTIC_SCHOLAR_API_KEY is set, we forward it as `x-api-key` for
 * the higher rate limit.
 *
 * Data compounds: each daily capture is also written to a dated key so a
 * future premium time-series endpoint can read N-day windows. No backfill
 * is possible once a day passes.
 *
 * Free `/api/papers/ai-trending` exposes the latest curated list.
 */

const SS_BASE = 'https://api.semanticscholar.org/graph/v1/paper/search';

const QUERIES = [
  'large language model',
  'transformer neural network',
  'reinforcement learning from human feedback',
  'AI agents',
  'diffusion model',
];

const FIELDS = [
  'paperId',
  'title',
  'abstract',
  'authors.name',
  'year',
  'venue',
  'citationCount',
  'url',
  'publicationDate',
  'externalIds',
  'fieldsOfStudy',
].join(',');

const PER_QUERY_LIMIT = 25;
const FINAL_TOP_N = 30;
const QUERY_DELAY_MS = 1100; // free tier is 1 req/sec; pad to 1.1s

const LATEST_KEY = 'papers:latest';
const DAILY_PREFIX = 'papers:daily:';
const INDEX_KEY = 'papers:index';
const MAX_INDEX_DATES = 365 * 3;

const TITLE_CAP = 300;
const ABSTRACT_CAP = 800;

export interface PaperAuthor {
  name: string;
}

export interface Paper {
  paperId: string;
  title: string;
  abstract: string | null;
  authors: string[];
  year: number | null;
  venue: string | null;
  citationCount: number;
  url: string | null;
  publicationDate: string | null;
  arxivId: string | null;
  doi: string | null;
  fieldsOfStudy: string[];
}

export interface PapersSnapshot {
  date: string;
  capturedAt: string;
  total_papers: number;
  queries: string[];
  raw_count: number;
  papers: Paper[];
  summary: {
    by_year: Record<string, number>;
    top_venues: Array<{ venue: string; count: number }>;
    top_authors: Array<{ author: string; count: number }>;
  };
}

const todayUTC = (): string => new Date().toISOString().slice(0, 10);
const dailyKey = (date: string): string => `${DAILY_PREFIX}${date}`;

function clampStr(s: string, max: number): string {
  if (s.length <= max) return s;
  return s.slice(0, max - 1) + '…';
}

interface RawSSAuthor {
  name?: string;
}

interface RawSSPaper {
  paperId?: string;
  title?: string;
  abstract?: string | null;
  authors?: RawSSAuthor[];
  year?: number | null;
  venue?: string | null;
  citationCount?: number | null;
  url?: string | null;
  publicationDate?: string | null;
  externalIds?: { ArXiv?: string; DOI?: string; [k: string]: string | undefined };
  fieldsOfStudy?: string[] | null;
}

interface RawSSPage {
  total?: number;
  data?: RawSSPaper[];
}

export function normalizePaper(raw: RawSSPaper): Paper | null {
  const id = raw.paperId?.trim();
  const title = raw.title?.trim();
  if (!id || !title) return null;
  const authors = Array.isArray(raw.authors)
    ? raw.authors.map(a => a?.name?.trim()).filter((n): n is string => !!n)
    : [];
  return {
    paperId: id,
    title: clampStr(title, TITLE_CAP),
    abstract: raw.abstract ? clampStr(raw.abstract.trim(), ABSTRACT_CAP) : null,
    authors: authors.slice(0, 8),
    year: typeof raw.year === 'number' ? raw.year : null,
    venue: raw.venue?.trim() || null,
    citationCount: typeof raw.citationCount === 'number' ? raw.citationCount : 0,
    url: raw.url?.trim() || null,
    publicationDate: raw.publicationDate?.trim() || null,
    arxivId: raw.externalIds?.ArXiv?.trim() || null,
    doi: raw.externalIds?.DOI?.trim() || null,
    fieldsOfStudy: Array.isArray(raw.fieldsOfStudy) ? raw.fieldsOfStudy.filter(Boolean) : [],
  };
}

export function dedupAndRank(rawPapers: RawSSPaper[]): Paper[] {
  const byId = new Map<string, Paper>();
  for (const r of rawPapers) {
    const p = normalizePaper(r);
    if (!p) continue;
    const existing = byId.get(p.paperId);
    if (!existing || p.citationCount > existing.citationCount) {
      byId.set(p.paperId, p);
    }
  }
  const list = Array.from(byId.values());
  list.sort((a, b) => {
    if (b.citationCount !== a.citationCount) return b.citationCount - a.citationCount;
    const ay = a.year ?? 0;
    const by = b.year ?? 0;
    if (by !== ay) return by - ay;
    return a.title.localeCompare(b.title);
  });
  return list.slice(0, FINAL_TOP_N);
}

export function summarize(papers: Paper[]): PapersSnapshot['summary'] {
  const byYear: Record<string, number> = {};
  const byVenue = new Map<string, number>();
  const byAuthor = new Map<string, number>();
  for (const p of papers) {
    if (p.year !== null) {
      const k = String(p.year);
      byYear[k] = (byYear[k] || 0) + 1;
    }
    if (p.venue) byVenue.set(p.venue, (byVenue.get(p.venue) || 0) + 1);
    for (const a of p.authors) {
      byAuthor.set(a, (byAuthor.get(a) || 0) + 1);
    }
  }
  const top_venues = Array.from(byVenue.entries())
    .map(([venue, count]) => ({ venue, count }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 10);
  const top_authors = Array.from(byAuthor.entries())
    .map(([author, count]) => ({ author, count }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 10);
  return { by_year: byYear, top_venues, top_authors };
}

const sleep = (ms: number): Promise<void> => new Promise(r => setTimeout(r, ms));

interface SemanticScholarKeyEnv {
  SEMANTIC_SCHOLAR_API_KEY?: string;
}

async function fetchOneQuery(query: string, apiKey: string | undefined): Promise<RawSSPaper[]> {
  const url = new URL(SS_BASE);
  url.searchParams.set('query', query);
  url.searchParams.set('limit', String(PER_QUERY_LIMIT));
  url.searchParams.set('fields', FIELDS);

  const headers: Record<string, string> = {
    Accept: 'application/json',
    'User-Agent': 'tensorfeed-papers-tracker/1.0 (+https://tensorfeed.ai)',
  };
  if (apiKey) headers['x-api-key'] = apiKey;

  const res = await fetch(url.toString(), {
    headers,
    signal: AbortSignal.timeout(15000),
  });
  if (!res.ok) {
    throw new Error(`semantic scholar returned HTTP ${res.status} for query "${query}"`);
  }
  const data = (await res.json()) as RawSSPage;
  return Array.isArray(data.data) ? data.data : [];
}

export interface CaptureResult {
  ok: boolean;
  date: string;
  total_papers?: number;
  raw_count?: number;
  error?: string;
}

export async function captureDailyPapers(env: Env): Promise<CaptureResult> {
  const date = todayUTC();
  const capturedAt = new Date().toISOString();
  const apiKey = (env as Env & SemanticScholarKeyEnv).SEMANTIC_SCHOLAR_API_KEY;

  const allRaw: RawSSPaper[] = [];
  for (let i = 0; i < QUERIES.length; i++) {
    if (i > 0) await sleep(QUERY_DELAY_MS);
    try {
      const page = await fetchOneQuery(QUERIES[i], apiKey);
      allRaw.push(...page);
    } catch (err) {
      console.error(`papers fetch failed for "${QUERIES[i]}":`, (err as Error).message);
    }
  }

  if (allRaw.length === 0) {
    return { ok: false, date, error: 'all_queries_failed' };
  }

  const ranked = dedupAndRank(allRaw);
  const snapshot: PapersSnapshot = {
    date,
    capturedAt,
    total_papers: ranked.length,
    queries: QUERIES.slice(),
    raw_count: allRaw.length,
    papers: ranked,
    summary: summarize(ranked),
  };

  const json = JSON.stringify(snapshot);
  await Promise.all([
    env.TENSORFEED_CACHE.put(LATEST_KEY, json),
    env.TENSORFEED_CACHE.put(dailyKey(date), json),
  ]);
  await pushIndexDate(env, date);

  return { ok: true, date, total_papers: snapshot.total_papers, raw_count: snapshot.raw_count };
}

async function readIndex(env: Env): Promise<string[]> {
  const raw = (await env.TENSORFEED_CACHE.get(INDEX_KEY, 'json')) as string[] | null;
  return raw || [];
}

async function pushIndexDate(env: Env, date: string): Promise<void> {
  const dates = await readIndex(env);
  if (!dates.includes(date)) {
    dates.unshift(date);
    if (dates.length > MAX_INDEX_DATES) dates.length = MAX_INDEX_DATES;
    await env.TENSORFEED_CACHE.put(INDEX_KEY, JSON.stringify(dates));
  }
}

/**
 * Read the most recent stored snapshot. If none exists yet (e.g. cron has
 * not run since deploy), runs a one-time live capture so the free endpoint
 * never returns empty on cold start.
 */
export async function getLatestSnapshot(env: Env): Promise<PapersSnapshot | null> {
  const cached = (await env.TENSORFEED_CACHE.get(LATEST_KEY, 'json')) as PapersSnapshot | null;
  if (cached) return cached;
  const result = await captureDailyPapers(env);
  if (!result.ok) return null;
  return (await env.TENSORFEED_CACHE.get(LATEST_KEY, 'json')) as PapersSnapshot | null;
}

export async function listIndexedDates(env: Env): Promise<string[]> {
  return readIndex(env);
}
