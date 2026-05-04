import { Env } from './types';
import { sanitizeTitle } from './sanitize';

/**
 * Daily snapshot of currently-hot threads in AI-relevant subreddits.
 * Companion to /api/issues/hot (which surfaces developer-side
 * conversation on GitHub) on the community-discussion side.
 *
 * Sources: 7 AI-focused subreddits via the public Reddit JSON
 * endpoint (https://www.reddit.com/r/{name}/hot.json), no auth.
 * Reddit allows unauthenticated polling at modest rates; we throttle
 * fan-out at ~1 req/sec and use a descriptive User-Agent so we are
 * not mistaken for a default crawler signature.
 *
 * KV layout (TENSORFEED_CACHE):
 *   reddit:latest               -> RedditSnapshot
 *   reddit:daily:{YYYY-MM-DD}   -> RedditSnapshot (compounds, future premium)
 *   reddit:index                -> string[] of dates
 *
 * Title sanitization: titles pass through `sanitize.sanitizeTitle`
 * before the snapshot is stored, so role-confusion tokens and
 * control-char spoofing in Reddit posts cannot reach a downstream
 * agent through our endpoint.
 */

const SUBREDDITS = [
  'LocalLLaMA',
  'MachineLearning',
  'ClaudeAI',
  'OpenAI',
  'singularity',
  'artificial',
  'AI_Agents',
];

const PER_SUB_LIMIT = 15;
const FINAL_TOP_N = 30;
const QUERY_DELAY_MS = 1100;

const LATEST_KEY = 'reddit:latest';
const DAILY_PREFIX = 'reddit:daily:';
const INDEX_KEY = 'reddit:index';
const MAX_INDEX_DATES = 365 * 3;

export interface RedditPost {
  id: string;              // t3_abc123
  subreddit: string;       // 'LocalLLaMA'
  title: string;           // sanitized + clamped
  author: string | null;
  score: number;           // net upvotes
  upvote_ratio: number;    // 0..1
  num_comments: number;
  permalink: string;       // https://reddit.com/r/.../comments/...
  url: string;             // external link or self-post permalink
  created_utc: number;     // Unix seconds
  flair: string | null;
  is_self: boolean;        // true for text posts
  is_video: boolean;
}

export interface RedditSnapshot {
  date: string;
  capturedAt: string;
  total_posts: number;
  subreddits_queried: string[];
  raw_count: number;
  posts: RedditPost[];
  summary: {
    by_subreddit: Record<string, number>;
    top_authors: Array<{ author: string; count: number }>;
  };
}

const todayUTC = (): string => new Date().toISOString().slice(0, 10);
const dailyKey = (date: string): string => `${DAILY_PREFIX}${date}`;

interface RawRedditPostData {
  id?: string;
  name?: string;
  subreddit?: string;
  title?: string;
  author?: string;
  score?: number;
  upvote_ratio?: number;
  num_comments?: number;
  permalink?: string;
  url?: string;
  created_utc?: number;
  link_flair_text?: string | null;
  is_self?: boolean;
  is_video?: boolean;
  stickied?: boolean;
  over_18?: boolean;
}

interface RawRedditChild {
  kind?: string;
  data?: RawRedditPostData;
}

interface RawRedditListing {
  kind?: string;
  data?: { children?: RawRedditChild[] };
}

export function normalizePost(raw: RawRedditPostData): RedditPost | null {
  // Skip stickied (community pinned) and NSFW posts.
  if (raw.stickied) return null;
  if (raw.over_18) return null;

  const id = raw.name?.trim() || (raw.id ? `t3_${raw.id}` : '');
  if (!id) return null;
  const titleRaw = raw.title?.trim();
  if (!titleRaw) return null;

  const subreddit = raw.subreddit?.trim() || '';
  const permalink = raw.permalink ? `https://reddit.com${raw.permalink}` : '';
  const url = raw.url?.trim() || permalink;
  if (!permalink && !url) return null;

  return {
    id,
    subreddit,
    title: sanitizeTitle(titleRaw),
    author: raw.author && raw.author !== '[deleted]' ? raw.author.trim() : null,
    score: typeof raw.score === 'number' ? raw.score : 0,
    upvote_ratio: typeof raw.upvote_ratio === 'number' ? raw.upvote_ratio : 0,
    num_comments: typeof raw.num_comments === 'number' ? raw.num_comments : 0,
    permalink,
    url,
    created_utc: typeof raw.created_utc === 'number' ? raw.created_utc : 0,
    flair: raw.link_flair_text?.trim() || null,
    is_self: raw.is_self === true,
    is_video: raw.is_video === true,
  };
}

export function dedupAndRank(posts: RedditPost[]): RedditPost[] {
  const byId = new Map<string, RedditPost>();
  for (const p of posts) {
    const existing = byId.get(p.id);
    if (!existing || p.score > existing.score) {
      byId.set(p.id, p);
    }
  }
  const list = Array.from(byId.values());
  list.sort((a, b) => {
    if (b.score !== a.score) return b.score - a.score;
    if (b.num_comments !== a.num_comments) return b.num_comments - a.num_comments;
    return b.created_utc - a.created_utc;
  });
  return list.slice(0, FINAL_TOP_N);
}

export function summarize(posts: RedditPost[]): RedditSnapshot['summary'] {
  const bySub: Record<string, number> = {};
  const byAuthor = new Map<string, number>();
  for (const p of posts) {
    if (p.subreddit) bySub[p.subreddit] = (bySub[p.subreddit] || 0) + 1;
    if (p.author) byAuthor.set(p.author, (byAuthor.get(p.author) || 0) + 1);
  }
  const top_authors = Array.from(byAuthor.entries())
    .map(([author, count]) => ({ author, count }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 10);
  return { by_subreddit: bySub, top_authors };
}

const sleep = (ms: number): Promise<void> => new Promise(r => setTimeout(r, ms));

async function fetchOneSubreddit(name: string): Promise<RedditPost[]> {
  const url = `https://www.reddit.com/r/${encodeURIComponent(name)}/hot.json?limit=${PER_SUB_LIMIT}&raw_json=1`;
  const res = await fetch(url, {
    headers: {
      Accept: 'application/json',
      'User-Agent': 'tensorfeed-reddit-tracker/1.0 (+https://tensorfeed.ai)',
    },
    signal: AbortSignal.timeout(15000),
  });
  if (!res.ok) {
    throw new Error(`reddit returned HTTP ${res.status} for r/${name}`);
  }
  const data = (await res.json()) as RawRedditListing;
  const children = data.data?.children;
  if (!Array.isArray(children)) return [];
  const out: RedditPost[] = [];
  for (const c of children) {
    if (c.kind !== 't3' || !c.data) continue;
    const norm = normalizePost(c.data);
    if (norm) out.push(norm);
  }
  return out;
}

export interface CaptureResult {
  ok: boolean;
  date: string;
  total_posts?: number;
  raw_count?: number;
  error?: string;
}

export async function captureRedditSnapshot(env: Env): Promise<CaptureResult> {
  const date = todayUTC();
  const capturedAt = new Date().toISOString();

  const allPosts: RedditPost[] = [];
  for (let i = 0; i < SUBREDDITS.length; i++) {
    if (i > 0) await sleep(QUERY_DELAY_MS);
    try {
      const page = await fetchOneSubreddit(SUBREDDITS[i]);
      allPosts.push(...page);
    } catch (err) {
      console.error(`reddit fetch failed for r/${SUBREDDITS[i]}:`, (err as Error).message);
    }
  }

  if (allPosts.length === 0) {
    return { ok: false, date, error: 'all_subreddits_failed' };
  }

  const ranked = dedupAndRank(allPosts);
  const snapshot: RedditSnapshot = {
    date,
    capturedAt,
    total_posts: ranked.length,
    subreddits_queried: SUBREDDITS.slice(),
    raw_count: allPosts.length,
    posts: ranked,
    summary: summarize(ranked),
  };

  const json = JSON.stringify(snapshot);
  await Promise.all([
    env.TENSORFEED_CACHE.put(LATEST_KEY, json),
    env.TENSORFEED_CACHE.put(dailyKey(date), json),
  ]);
  await pushIndexDate(env, date);

  return { ok: true, date, total_posts: ranked.length, raw_count: allPosts.length };
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

export async function getLatestSnapshot(env: Env): Promise<RedditSnapshot | null> {
  const cached = (await env.TENSORFEED_CACHE.get(LATEST_KEY, 'json')) as RedditSnapshot | null;
  if (cached) return cached;
  const result = await captureRedditSnapshot(env);
  if (!result.ok) return null;
  return (await env.TENSORFEED_CACHE.get(LATEST_KEY, 'json')) as RedditSnapshot | null;
}
