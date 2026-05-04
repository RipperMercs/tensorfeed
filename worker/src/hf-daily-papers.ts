import { Env } from './types';
import { sanitizeTitle } from './sanitize';

/**
 * Daily snapshot of Hugging Face's curated "Daily Papers" feed.
 *
 * HF maintains a small editor-curated list of AI/ML papers worth
 * reading, refreshed daily. Different signal from our other paper
 * feeds:
 *   - /api/papers/arxiv-recent: unfiltered firehose of recent
 *     submissions in cs.AI/cs.LG/cs.CL/cs.CV.
 *   - /api/papers/ai-trending: citation-ranked top of Semantic Scholar.
 *   - /api/papers/hf-daily (this): editor-curated picks of-the-day,
 *     with HF community upvotes and discussion counts as a quality
 *     signal layered on top.
 *
 * Uses the public HF endpoint at https://huggingface.co/api/daily_papers,
 * no auth. The API surface has shifted shape over time; we accept both
 * the nested form (`{ paper: {...}, publishedAt, submittedBy, ... }`)
 * and the flat form (everything top-level) so a future shape change is
 * less likely to break us.
 *
 * KV layout (TENSORFEED_CACHE):
 *   hf-papers:latest               -> HFDailyPapersSnapshot
 *   hf-papers:daily:{YYYY-MM-DD}   -> HFDailyPapersSnapshot (compounds)
 *   hf-papers:index                -> string[] of dates
 *
 * Title sanitization: titles pass through `sanitize.sanitizeTitle`
 * before storage so role-confusion tokens and bidi spoofing in
 * upstream paper titles can never reach a downstream agent through
 * our endpoint.
 */

const HF_DAILY_BASE = 'https://huggingface.co/api/daily_papers';

const FINAL_TOP_N = 30;

const LATEST_KEY = 'hf-papers:latest';
const DAILY_PREFIX = 'hf-papers:daily:';
const INDEX_KEY = 'hf-papers:index';
const MAX_INDEX_DATES = 365 * 3;

const TITLE_CAP = 300;
const SUMMARY_CAP = 800;

export interface HFDailyPaper {
  paperId: string;       // arxiv-style id when available, else HF discussion id
  title: string;
  summary: string | null;
  authors: string[];
  publishedAt: string | null;
  submittedAt: string | null;
  upvotes: number;
  num_comments: number;
  thumbnail: string | null;
  hf_url: string;
  arxiv_url: string | null;
  github_repo: string | null;
  github_stars: number | null;
  ai_keywords: string[];
}

export interface HFDailyPapersSnapshot {
  date: string;
  capturedAt: string;
  total_papers: number;
  raw_count: number;
  papers: HFDailyPaper[];
  summary: {
    by_keyword: Array<{ keyword: string; count: number }>;
    most_upvoted: { paperId: string; title: string; upvotes: number } | null;
    most_discussed: { paperId: string; title: string; comments: number } | null;
  };
}

const todayUTC = (): string => new Date().toISOString().slice(0, 10);
const dailyKey = (date: string): string => `${DAILY_PREFIX}${date}`;

function clampStr(s: string, max: number): string {
  if (s.length <= max) return s;
  return s.slice(0, max - 1) + '…';
}

interface RawHFAuthor {
  name?: string;
  user?: { fullname?: string; name?: string };
}

interface RawHFPaperInner {
  id?: string;
  title?: string;
  summary?: string;
  authors?: RawHFAuthor[];
  publishedAt?: string;
  upvotes?: number;
  ai_keywords?: string[];
  ai_summary?: string;
}

interface RawHFEntry {
  // Nested form: { paper: {...}, ... }
  paper?: RawHFPaperInner;
  // Flat form: everything at top level
  id?: string;
  title?: string;
  summary?: string;
  authors?: RawHFAuthor[];
  // Common metadata fields
  publishedAt?: string;
  submittedOnDailyAt?: string;
  upvotes?: number;
  numComments?: number;
  thumbnail?: string;
  discussionId?: string;
  projectPage?: string;
  githubRepo?: string;
  githubStars?: number;
  ai_keywords?: string[];
  ai_summary?: string;
}

function authorName(a: RawHFAuthor): string {
  return (a.name?.trim() || a.user?.fullname?.trim() || a.user?.name?.trim() || '').trim();
}

function pickPaperId(raw: RawHFEntry): string {
  return (
    raw.paper?.id?.trim() ||
    raw.id?.trim() ||
    raw.discussionId?.trim() ||
    ''
  );
}

function pickTitle(raw: RawHFEntry): string {
  return (raw.paper?.title?.trim() || raw.title?.trim() || '').trim();
}

function pickSummary(raw: RawHFEntry): string | null {
  const s =
    raw.paper?.summary?.trim() ||
    raw.summary?.trim() ||
    raw.ai_summary?.trim() ||
    raw.paper?.ai_summary?.trim() ||
    '';
  return s ? clampStr(s, SUMMARY_CAP) : null;
}

function pickAuthors(raw: RawHFEntry): string[] {
  const list = raw.paper?.authors || raw.authors || [];
  return list.map(authorName).filter(Boolean).slice(0, 8);
}

function pickKeywords(raw: RawHFEntry): string[] {
  const list = raw.paper?.ai_keywords || raw.ai_keywords || [];
  return list.filter((k): k is string => typeof k === 'string').slice(0, 10);
}

export function normalizePaper(raw: RawHFEntry): HFDailyPaper | null {
  const paperId = pickPaperId(raw);
  if (!paperId) return null;
  const titleRaw = pickTitle(raw);
  if (!titleRaw) return null;

  const arxivUrl = /^\d{4}\.\d{4,5}/.test(paperId)
    ? `https://arxiv.org/abs/${paperId}`
    : null;

  return {
    paperId,
    title: sanitizeTitle(clampStr(titleRaw, TITLE_CAP)),
    summary: pickSummary(raw),
    authors: pickAuthors(raw),
    publishedAt: raw.paper?.publishedAt?.trim() || raw.publishedAt?.trim() || null,
    submittedAt: raw.submittedOnDailyAt?.trim() || null,
    upvotes: typeof raw.upvotes === 'number' ? raw.upvotes : (typeof raw.paper?.upvotes === 'number' ? raw.paper.upvotes : 0),
    num_comments: typeof raw.numComments === 'number' ? raw.numComments : 0,
    thumbnail: raw.thumbnail?.trim() || null,
    hf_url: `https://huggingface.co/papers/${paperId}`,
    arxiv_url: arxivUrl,
    github_repo: raw.githubRepo?.trim() || null,
    github_stars: typeof raw.githubStars === 'number' ? raw.githubStars : null,
    ai_keywords: pickKeywords(raw),
  };
}

export function dedupAndRank(papers: HFDailyPaper[]): HFDailyPaper[] {
  const byId = new Map<string, HFDailyPaper>();
  for (const p of papers) {
    const existing = byId.get(p.paperId);
    if (!existing || p.upvotes > existing.upvotes) {
      byId.set(p.paperId, p);
    }
  }
  const list = Array.from(byId.values());
  list.sort((a, b) => {
    if (b.upvotes !== a.upvotes) return b.upvotes - a.upvotes;
    if (b.num_comments !== a.num_comments) return b.num_comments - a.num_comments;
    return a.title.localeCompare(b.title);
  });
  return list.slice(0, FINAL_TOP_N);
}

export function summarize(papers: HFDailyPaper[]): HFDailyPapersSnapshot['summary'] {
  const byKw = new Map<string, number>();
  for (const p of papers) {
    for (const k of p.ai_keywords) {
      byKw.set(k, (byKw.get(k) || 0) + 1);
    }
  }
  const by_keyword = Array.from(byKw.entries())
    .map(([keyword, count]) => ({ keyword, count }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 15);

  let mostUp: HFDailyPaper | null = null;
  let mostComm: HFDailyPaper | null = null;
  for (const p of papers) {
    if (!mostUp || p.upvotes > mostUp.upvotes) mostUp = p;
    if (!mostComm || p.num_comments > mostComm.num_comments) mostComm = p;
  }

  return {
    by_keyword,
    most_upvoted: mostUp ? { paperId: mostUp.paperId, title: mostUp.title, upvotes: mostUp.upvotes } : null,
    most_discussed: mostComm ? { paperId: mostComm.paperId, title: mostComm.title, comments: mostComm.num_comments } : null,
  };
}

export interface CaptureResult {
  ok: boolean;
  date: string;
  total_papers?: number;
  raw_count?: number;
  error?: string;
}

export async function captureHFDailyPapers(env: Env): Promise<CaptureResult> {
  const date = todayUTC();
  const capturedAt = new Date().toISOString();

  let raw: RawHFEntry[];
  try {
    const res = await fetch(HF_DAILY_BASE, {
      headers: {
        Accept: 'application/json',
        'User-Agent': 'tensorfeed-hf-daily-papers/1.0 (+https://tensorfeed.ai)',
      },
      signal: AbortSignal.timeout(15000),
    });
    if (!res.ok) {
      return { ok: false, date, error: `hf daily_papers returned HTTP ${res.status}` };
    }
    const body = await res.json();
    raw = Array.isArray(body) ? (body as RawHFEntry[]) : [];
  } catch (err) {
    return { ok: false, date, error: (err as Error).message };
  }

  if (raw.length === 0) {
    return { ok: false, date, error: 'empty_response' };
  }

  const normalized = raw.map(normalizePaper).filter((p): p is HFDailyPaper => p !== null);
  if (normalized.length === 0) {
    return { ok: false, date, error: 'no_entries_parsed' };
  }
  const ranked = dedupAndRank(normalized);

  const snapshot: HFDailyPapersSnapshot = {
    date,
    capturedAt,
    total_papers: ranked.length,
    raw_count: raw.length,
    papers: ranked,
    summary: summarize(ranked),
  };

  const json = JSON.stringify(snapshot);
  await Promise.all([
    env.TENSORFEED_CACHE.put(LATEST_KEY, json),
    env.TENSORFEED_CACHE.put(dailyKey(date), json),
  ]);
  await pushIndexDate(env, date);

  return { ok: true, date, total_papers: ranked.length, raw_count: raw.length };
}

async function readIndex(env: Env): Promise<string[]> {
  const r = (await env.TENSORFEED_CACHE.get(INDEX_KEY, 'json')) as string[] | null;
  return r || [];
}

async function pushIndexDate(env: Env, date: string): Promise<void> {
  const dates = await readIndex(env);
  if (!dates.includes(date)) {
    dates.unshift(date);
    if (dates.length > MAX_INDEX_DATES) dates.length = MAX_INDEX_DATES;
    await env.TENSORFEED_CACHE.put(INDEX_KEY, JSON.stringify(dates));
  }
}

export async function getLatestSnapshot(env: Env): Promise<HFDailyPapersSnapshot | null> {
  const cached = (await env.TENSORFEED_CACHE.get(LATEST_KEY, 'json')) as HFDailyPapersSnapshot | null;
  if (cached) return cached;
  const result = await captureHFDailyPapers(env);
  if (!result.ok) return null;
  return (await env.TENSORFEED_CACHE.get(LATEST_KEY, 'json')) as HFDailyPapersSnapshot | null;
}
