import { Env } from './types';

/**
 * Daily ingest of recent arXiv submissions in AI/ML categories. The arXiv
 * Query API at https://export.arxiv.org/api/query returns Atom XML, no
 * auth required. We pull the most recent submissions across cs.AI, cs.LG,
 * cs.CL, cs.CV, parse the entries, dedup by arxivId (stripping vN
 * suffixes), and keep the top 50 by submission date.
 *
 * Daily snapshot at 11:30 UTC stored under `arxiv:*`. Backs free
 * `/api/papers/arxiv-recent`. Dated keys compound into a future premium
 * time series of submission volume per category.
 */

const ARXIV_BASE = 'https://export.arxiv.org/api/query';
const CATEGORIES = ['cs.AI', 'cs.LG', 'cs.CL', 'cs.CV'];
const MAX_RESULTS = 100;
const FINAL_TOP_N = 50;

const LATEST_KEY = 'arxiv:latest';
const DAILY_PREFIX = 'arxiv:daily:';
const INDEX_KEY = 'arxiv:index';
const MAX_INDEX_DATES = 365 * 3;

const TITLE_CAP = 300;
const ABSTRACT_CAP = 800;

export interface ArxivPaper {
  arxivId: string;          // e.g. "2401.12345" (no version suffix)
  version: string | null;   // e.g. "v2" if present
  title: string;
  abstract: string | null;
  authors: string[];
  primaryCategory: string | null;
  categories: string[];
  publishedAt: string;      // ISO 8601 (first submission)
  updatedAt: string;        // ISO 8601 (latest revision)
  htmlUrl: string;          // arxiv.org/abs/...
  pdfUrl: string;           // arxiv.org/pdf/...
  doi: string | null;
}

export interface ArxivSnapshot {
  date: string;
  capturedAt: string;
  total_papers: number;
  categories_queried: string[];
  raw_count: number;
  papers: ArxivPaper[];
  summary: {
    by_primary_category: Record<string, number>;
    top_authors: Array<{ author: string; count: number }>;
  };
}

const todayUTC = (): string => new Date().toISOString().slice(0, 10);
const dailyKey = (date: string): string => `${DAILY_PREFIX}${date}`;

function clampStr(s: string, max: number): string {
  if (s.length <= max) return s;
  return s.slice(0, max - 1) + '…';
}

function decodeXmlEntities(s: string): string {
  return s
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&apos;/g, "'")
    .replace(/&#(\d+);/g, (_, n) => String.fromCharCode(parseInt(n, 10)))
    .replace(/&amp;/g, '&');
}

function stripWhitespace(s: string): string {
  return s.replace(/\s+/g, ' ').trim();
}

function extractTag(xml: string, tag: string): string {
  const re = new RegExp(`<${tag}[^>]*>([\\s\\S]*?)</${tag}>`, 'i');
  const m = xml.match(re);
  return m ? m[1].trim() : '';
}

function extractAllTags(xml: string, tag: string): string[] {
  const re = new RegExp(`<${tag}[^>]*>([\\s\\S]*?)</${tag}>`, 'gi');
  const out: string[] = [];
  let m: RegExpExecArray | null;
  while ((m = re.exec(xml)) !== null) {
    out.push(m[1].trim());
  }
  return out;
}

function extractLinkByRel(xml: string, rel: string): string {
  const re = new RegExp(`<link[^>]*rel="${rel}"[^>]*href="([^"]+)"|<link[^>]*href="([^"]+)"[^>]*rel="${rel}"`, 'i');
  const m = xml.match(re);
  return (m?.[1] || m?.[2] || '').trim();
}

function extractAttributeOnTag(xml: string, tag: string, attr: string): string {
  const re = new RegExp(`<${tag}[^>]*\\b${attr}="([^"]*)"`, 'i');
  const m = xml.match(re);
  return m ? m[1] : '';
}

function extractAllAttributesOnTag(xml: string, tag: string, attr: string): string[] {
  const re = new RegExp(`<${tag}[^>]*\\b${attr}="([^"]*)"`, 'gi');
  const out: string[] = [];
  let m: RegExpExecArray | null;
  while ((m = re.exec(xml)) !== null) {
    out.push(m[1]);
  }
  return out;
}

const ARXIV_ID_RE = /arxiv\.org\/abs\/([\w.\-/]+?)(v(\d+))?$/i;

export function parseArxivIdFromUrl(idUrl: string): { arxivId: string; version: string | null } | null {
  const m = idUrl.match(ARXIV_ID_RE);
  if (!m) return null;
  return { arxivId: m[1], version: m[3] ? `v${m[3]}` : null };
}

export function parseEntry(entryXml: string): ArxivPaper | null {
  const idUrl = stripWhitespace(extractTag(entryXml, 'id'));
  if (!idUrl) return null;
  const ids = parseArxivIdFromUrl(idUrl);
  if (!ids) return null;

  const titleRaw = extractTag(entryXml, 'title');
  const title = stripWhitespace(decodeXmlEntities(titleRaw));
  if (!title) return null;

  const abstractRaw = extractTag(entryXml, 'summary');
  const abstract = abstractRaw ? clampStr(stripWhitespace(decodeXmlEntities(abstractRaw)), ABSTRACT_CAP) : null;

  const authorBlocks = extractAllTags(entryXml, 'author');
  const authors = authorBlocks
    .map(a => stripWhitespace(decodeXmlEntities(extractTag(a, 'name'))))
    .filter(Boolean)
    .slice(0, 8);

  const publishedAt = stripWhitespace(extractTag(entryXml, 'published'));
  const updatedAt = stripWhitespace(extractTag(entryXml, 'updated')) || publishedAt;

  const primaryCategory = extractAttributeOnTag(entryXml, 'arxiv:primary_category', 'term') || null;
  const categories = extractAllAttributesOnTag(entryXml, 'category', 'term');

  const pdfUrl = extractLinkByRel(entryXml, 'related') || `https://arxiv.org/pdf/${ids.arxivId}.pdf`;
  const htmlUrl = extractLinkByRel(entryXml, 'alternate') || idUrl.replace(/^http:/i, 'https:');

  const doi = stripWhitespace(extractTag(entryXml, 'arxiv:doi')) || null;

  return {
    arxivId: ids.arxivId,
    version: ids.version,
    title: clampStr(title, TITLE_CAP),
    abstract,
    authors,
    primaryCategory,
    categories,
    publishedAt: publishedAt || new Date().toISOString(),
    updatedAt: updatedAt || publishedAt || new Date().toISOString(),
    htmlUrl,
    pdfUrl,
    doi,
  };
}

export function parseFeed(xml: string): ArxivPaper[] {
  if (!xml.includes('<entry')) return [];
  const entries = xml.split(/<entry>/i).slice(1).map(e => e.split(/<\/entry>/i)[0]);
  const out: ArxivPaper[] = [];
  for (const e of entries) {
    const p = parseEntry(e);
    if (p) out.push(p);
  }
  return out;
}

export function dedupAndSort(papers: ArxivPaper[]): ArxivPaper[] {
  const byId = new Map<string, ArxivPaper>();
  for (const p of papers) {
    const existing = byId.get(p.arxivId);
    if (!existing || p.updatedAt > existing.updatedAt) {
      byId.set(p.arxivId, p);
    }
  }
  const list = Array.from(byId.values());
  list.sort((a, b) => {
    if (b.publishedAt !== a.publishedAt) return b.publishedAt < a.publishedAt ? -1 : 1;
    return a.title.localeCompare(b.title);
  });
  return list.slice(0, FINAL_TOP_N);
}

export function summarize(papers: ArxivPaper[]): ArxivSnapshot['summary'] {
  const byCat: Record<string, number> = {};
  const byAuthor = new Map<string, number>();
  for (const p of papers) {
    if (p.primaryCategory) byCat[p.primaryCategory] = (byCat[p.primaryCategory] || 0) + 1;
    for (const a of p.authors) {
      byAuthor.set(a, (byAuthor.get(a) || 0) + 1);
    }
  }
  const top_authors = Array.from(byAuthor.entries())
    .map(([author, count]) => ({ author, count }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 10);
  return { by_primary_category: byCat, top_authors };
}

async function fetchFeed(): Promise<string> {
  const url = new URL(ARXIV_BASE);
  url.searchParams.set('search_query', CATEGORIES.map(c => `cat:${c}`).join(' OR '));
  url.searchParams.set('sortBy', 'submittedDate');
  url.searchParams.set('sortOrder', 'descending');
  url.searchParams.set('max_results', String(MAX_RESULTS));

  const res = await fetch(url.toString(), {
    headers: {
      Accept: 'application/atom+xml',
      'User-Agent': 'tensorfeed-arxiv-tracker/1.0 (+https://tensorfeed.ai)',
    },
    signal: AbortSignal.timeout(15000),
  });
  if (!res.ok) throw new Error(`arxiv returned HTTP ${res.status}`);
  return await res.text();
}

export interface CaptureResult {
  ok: boolean;
  date: string;
  total_papers?: number;
  raw_count?: number;
  error?: string;
}

export async function captureArxivSnapshot(env: Env): Promise<CaptureResult> {
  const date = todayUTC();
  const capturedAt = new Date().toISOString();

  let xml: string;
  try {
    xml = await fetchFeed();
  } catch (err) {
    return { ok: false, date, error: (err as Error).message };
  }

  const all = parseFeed(xml);
  if (all.length === 0) {
    return { ok: false, date, error: 'no_entries_parsed' };
  }
  const papers = dedupAndSort(all);

  const snapshot: ArxivSnapshot = {
    date,
    capturedAt,
    total_papers: papers.length,
    categories_queried: CATEGORIES.slice(),
    raw_count: all.length,
    papers,
    summary: summarize(papers),
  };

  const json = JSON.stringify(snapshot);
  await Promise.all([
    env.TENSORFEED_CACHE.put(LATEST_KEY, json),
    env.TENSORFEED_CACHE.put(dailyKey(date), json),
  ]);
  await pushIndexDate(env, date);

  return { ok: true, date, total_papers: papers.length, raw_count: all.length };
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

export async function getLatestSnapshot(env: Env): Promise<ArxivSnapshot | null> {
  const cached = (await env.TENSORFEED_CACHE.get(LATEST_KEY, 'json')) as ArxivSnapshot | null;
  if (cached) return cached;
  const result = await captureArxivSnapshot(env);
  if (!result.ok) return null;
  return (await env.TENSORFEED_CACHE.get(LATEST_KEY, 'json')) as ArxivSnapshot | null;
}
