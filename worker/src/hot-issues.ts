import { Env } from './types';

/**
 * Daily snapshot of currently-hot issues across the AI ecosystem on
 * GitHub. Companion to /api/trending-repos: that one shows which AI
 * repos are gaining stars; this one shows which AI repos have active
 * discussion happening right now (open issues with high comment counts
 * and recent activity).
 *
 * Sources via GitHub Search API: five fan-out queries across AI-relevant
 * topics (llm, ai-agents, large-language-models, machine-learning,
 * transformer). Filters: is:issue, is:open, archived:false, comments>=N,
 * updated within the last 7 days. Sort by comment count descending.
 * Dedup by html_url across the fanout, keep top 30.
 *
 * Free tier of GitHub Search API: 10 req/min unauthenticated, 30 req/min
 * authenticated. We use the existing GITHUB_TOKEN secret when present so
 * the cron has plenty of headroom.
 *
 * KV layout (TENSORFEED_CACHE):
 *   issues:latest               -> HotIssuesSnapshot
 *   issues:daily:{YYYY-MM-DD}   -> HotIssuesSnapshot (compounds, future premium)
 *   issues:index                -> string[] of dates
 */

const SEARCH_BASE = 'https://api.github.com/search/issues';

const TOPICS = [
  'llm',
  'ai-agents',
  'large-language-models',
  'machine-learning',
  'transformer',
];

const PER_QUERY_LIMIT = 15;
const FINAL_TOP_N = 30;
const COMMENT_THRESHOLD = 10;
const RECENT_DAYS = 7;
const QUERY_DELAY_MS = 1100;

const LATEST_KEY = 'issues:latest';
const DAILY_PREFIX = 'issues:daily:';
const INDEX_KEY = 'issues:index';
const MAX_INDEX_DATES = 365 * 3;

const TITLE_CAP = 300;

export interface HotIssue {
  url: string;             // html_url
  api_url: string;
  repo: string;            // owner/name (parsed from repository_url)
  number: number;
  title: string;
  author: string | null;
  state: 'open' | 'closed';
  comments: number;
  reactions_total: number;
  labels: string[];
  created_at: string;
  updated_at: string;
  matched_topic: string;
}

export interface HotIssuesSnapshot {
  date: string;
  capturedAt: string;
  total_issues: number;
  topics_queried: string[];
  raw_count: number;
  recent_window_days: number;
  comments_threshold: number;
  issues: HotIssue[];
  summary: {
    by_topic: Record<string, number>;
    top_repos: Array<{ repo: string; count: number }>;
  };
}

const todayUTC = (): string => new Date().toISOString().slice(0, 10);
const dailyKey = (date: string): string => `${DAILY_PREFIX}${date}`;

function isoDaysAgo(n: number): string {
  const d = new Date();
  d.setUTCDate(d.getUTCDate() - n);
  return d.toISOString().slice(0, 10);
}

function clampStr(s: string, max: number): string {
  if (s.length <= max) return s;
  return s.slice(0, max - 1) + '…';
}

function repoFromRepositoryUrl(url: string): string {
  // https://api.github.com/repos/foo/bar -> foo/bar
  const m = url.match(/\/repos\/([^/]+\/[^/]+)$/);
  return m ? m[1] : url;
}

interface RawSearchItem {
  url?: string;
  html_url?: string;
  repository_url?: string;
  number?: number;
  title?: string;
  user?: { login?: string };
  state?: string;
  pull_request?: unknown;
  comments?: number;
  reactions?: { total_count?: number };
  labels?: Array<string | { name?: string }>;
  created_at?: string;
  updated_at?: string;
}

interface RawSearchPage {
  total_count?: number;
  items?: RawSearchItem[];
}

export function normalizeIssue(item: RawSearchItem, matchedTopic: string): HotIssue | null {
  if (item.pull_request) return null; // belt-and-braces; query has is:issue
  const html = item.html_url?.trim();
  if (!html) return null;
  const title = item.title?.trim();
  if (!title) return null;
  const repoUrl = item.repository_url?.trim() || '';
  const repo = repoUrl ? repoFromRepositoryUrl(repoUrl) : '';
  const labels = Array.isArray(item.labels)
    ? item.labels
        .map(l => (typeof l === 'string' ? l : l?.name))
        .filter((n): n is string => !!n)
        .slice(0, 8)
    : [];
  const stateRaw = (item.state || '').toLowerCase();
  const state: 'open' | 'closed' = stateRaw === 'closed' ? 'closed' : 'open';
  return {
    url: html,
    api_url: item.url?.trim() || '',
    repo,
    number: typeof item.number === 'number' ? item.number : 0,
    title: clampStr(title, TITLE_CAP),
    author: item.user?.login?.trim() || null,
    state,
    comments: typeof item.comments === 'number' ? item.comments : 0,
    reactions_total: item.reactions?.total_count ?? 0,
    labels,
    created_at: item.created_at || '',
    updated_at: item.updated_at || '',
    matched_topic: matchedTopic,
  };
}

export function dedupAndRank(issues: HotIssue[]): HotIssue[] {
  const byUrl = new Map<string, HotIssue>();
  for (const i of issues) {
    const existing = byUrl.get(i.url);
    if (!existing || i.comments > existing.comments) {
      byUrl.set(i.url, i);
    }
  }
  const list = Array.from(byUrl.values());
  list.sort((a, b) => {
    if (b.comments !== a.comments) return b.comments - a.comments;
    if (b.reactions_total !== a.reactions_total) return b.reactions_total - a.reactions_total;
    if (a.updated_at !== b.updated_at) return b.updated_at.localeCompare(a.updated_at);
    return a.url.localeCompare(b.url);
  });
  return list.slice(0, FINAL_TOP_N);
}

export function summarize(issues: HotIssue[]): HotIssuesSnapshot['summary'] {
  const byTopic: Record<string, number> = {};
  const byRepo = new Map<string, number>();
  for (const i of issues) {
    if (i.matched_topic) byTopic[i.matched_topic] = (byTopic[i.matched_topic] || 0) + 1;
    if (i.repo) byRepo.set(i.repo, (byRepo.get(i.repo) || 0) + 1);
  }
  const top_repos = Array.from(byRepo.entries())
    .map(([repo, count]) => ({ repo, count }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 10);
  return { by_topic: byTopic, top_repos };
}

const sleep = (ms: number): Promise<void> => new Promise(r => setTimeout(r, ms));

async function fetchOneTopic(topic: string, since: string, token: string | undefined): Promise<HotIssue[]> {
  const q = `is:issue is:open archived:false comments:>=${COMMENT_THRESHOLD} updated:>=${since} topic:${topic}`;
  const url = new URL(SEARCH_BASE);
  url.searchParams.set('q', q);
  url.searchParams.set('sort', 'comments');
  url.searchParams.set('order', 'desc');
  url.searchParams.set('per_page', String(PER_QUERY_LIMIT));

  const headers: Record<string, string> = {
    Accept: 'application/vnd.github+json',
    'User-Agent': 'tensorfeed-hot-issues/1.0 (+https://tensorfeed.ai)',
    'X-GitHub-Api-Version': '2022-11-28',
  };
  if (token) headers['Authorization'] = `Bearer ${token}`;

  const res = await fetch(url.toString(), {
    headers,
    signal: AbortSignal.timeout(15000),
  });
  if (!res.ok) {
    throw new Error(`github search returned HTTP ${res.status} for topic "${topic}"`);
  }
  const data = (await res.json()) as RawSearchPage;
  if (!Array.isArray(data.items)) return [];
  const out: HotIssue[] = [];
  for (const item of data.items) {
    const norm = normalizeIssue(item, topic);
    if (norm) out.push(norm);
  }
  return out;
}

interface HotIssuesEnvKey {
  GITHUB_TOKEN?: string;
}

export interface CaptureResult {
  ok: boolean;
  date: string;
  total_issues?: number;
  raw_count?: number;
  error?: string;
}

export async function captureHotIssues(env: Env): Promise<CaptureResult> {
  const date = todayUTC();
  const capturedAt = new Date().toISOString();
  const since = isoDaysAgo(RECENT_DAYS);
  const token = (env as Env & HotIssuesEnvKey).GITHUB_TOKEN;

  const allIssues: HotIssue[] = [];
  for (let i = 0; i < TOPICS.length; i++) {
    if (i > 0) await sleep(QUERY_DELAY_MS);
    try {
      const page = await fetchOneTopic(TOPICS[i], since, token);
      allIssues.push(...page);
    } catch (err) {
      console.error(`hot-issues fetch failed for topic "${TOPICS[i]}":`, (err as Error).message);
    }
  }

  if (allIssues.length === 0) {
    return { ok: false, date, error: 'all_queries_failed' };
  }

  const ranked = dedupAndRank(allIssues);
  const snapshot: HotIssuesSnapshot = {
    date,
    capturedAt,
    total_issues: ranked.length,
    topics_queried: TOPICS.slice(),
    raw_count: allIssues.length,
    recent_window_days: RECENT_DAYS,
    comments_threshold: COMMENT_THRESHOLD,
    issues: ranked,
    summary: summarize(ranked),
  };

  const json = JSON.stringify(snapshot);
  await Promise.all([
    env.TENSORFEED_CACHE.put(LATEST_KEY, json),
    env.TENSORFEED_CACHE.put(dailyKey(date), json),
  ]);
  await pushIndexDate(env, date);

  return { ok: true, date, total_issues: ranked.length, raw_count: allIssues.length };
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

export async function getLatestSnapshot(env: Env): Promise<HotIssuesSnapshot | null> {
  const cached = (await env.TENSORFEED_CACHE.get(LATEST_KEY, 'json')) as HotIssuesSnapshot | null;
  if (cached) return cached;
  const result = await captureHotIssues(env);
  if (!result.ok) return null;
  return (await env.TENSORFEED_CACHE.get(LATEST_KEY, 'json')) as HotIssuesSnapshot | null;
}
