import type { Env } from './types';

/**
 * Research-blog RSS aggregator (Track A2, source 3, the last of the four).
 *
 * An editorial research-news layer for /research: recent posts from the major
 * AI lab and academic research blogs (Google DeepMind, Google Research,
 * Berkeley BAIR, MIT News AI, Hugging Face). Each is an RSS/Atom feed; Workers
 * have no DOM/XML parser, so this regex-parses <item>/<entry> blocks with an
 * explicit entity decoder (same approach as acl-anthology.ts, helpers
 * duplicated here to keep the modules decoupled).
 *
 * Source posture: link and summarize only. Each entry carries the title, a
 * clipped snippet from the feed description, the source blog, and the link.
 * No full-text republish. KV no-TTL (last-known-good), refresh with loud
 * logging, read accessor. Refreshed daily; task=lab-blogs manual lever.
 *
 * Maintenance: the FEEDS list is curated. Feed URLs drift; re-pilot before
 * adding. Stanford HAI (dead feed) and the OpenAI feed (malformed, empty
 * titles) were excluded at pilot time 2026-06-01.
 */

const CURRENT_KEY = 'research-blogs:current';
const TOTAL_CAP = 60;
const SNIPPET_CLIP = 220;
const FETCH_TIMEOUT_MS = 15_000;
const UA = 'tensorfeed-research/1.0 (+https://tensorfeed.ai)';

interface FeedConfig {
  url: string;
  label: string;
  cap: number;
}
const FEEDS: FeedConfig[] = [
  { url: 'https://deepmind.google/blog/rss.xml', label: 'Google DeepMind', cap: 15 },
  { url: 'https://research.google/blog/rss/', label: 'Google Research', cap: 15 },
  { url: 'https://bair.berkeley.edu/blog/feed.xml', label: 'Berkeley BAIR', cap: 10 },
  { url: 'https://news.mit.edu/rss/topic/artificial-intelligence2', label: 'MIT News (AI)', cap: 10 },
  { url: 'https://huggingface.co/blog/feed.xml', label: 'Hugging Face', cap: 10 },
];

export interface BlogPost {
  title: string;
  url: string;
  source: string;
  snippet: string;
  published_at: string | null;
}

export interface ResearchBlogsSnapshot {
  capturedAt: string;
  sources: string[];
  post_count: number;
  posts: BlogPost[];
  notes: string[];
  source: { name: string; url: string; license: string };
}

// ── Pure transforms (tested) ───────────────────────────────────────

const NAMED_ENTITIES: Record<string, string> = { amp: '&', lt: '<', gt: '>', quot: '"', apos: "'", nbsp: ' ' };

export function decodeEntities(s: string): string {
  return s.replace(/&(#x?[0-9a-fA-F]+|[a-zA-Z]+);/g, (m, e: string) => {
    if (e[0] === '#') {
      const cp = e[1] === 'x' || e[1] === 'X' ? parseInt(e.slice(2), 16) : parseInt(e.slice(1), 10);
      return Number.isFinite(cp) ? String.fromCodePoint(cp) : m;
    }
    return NAMED_ENTITIES[e] ?? m;
  });
}

export function stripTags(s: string): string {
  // Drop CDATA wrappers, then tags, decode entities, collapse whitespace.
  const noCdata = s.replace(/<!\[CDATA\[([\s\S]*?)\]\]>/g, '$1');
  return decodeEntities(noCdata.replace(/<[^>]+>/g, '')).replace(/\s+/g, ' ').trim();
}

function clip(s: string, n: number): string {
  return s.length <= n ? s : `${s.slice(0, n - 3).trimEnd()}...`;
}

/** Parse one RSS <item> or Atom <entry> block into a BlogPost. */
export function parseItem(block: string, label: string): BlogPost | null {
  const tm = block.match(/<title[^>]*>([\s\S]*?)<\/title>/);
  if (!tm) return null;
  const title = stripTags(tm[1]);
  if (!title) return null;

  // RSS <link>url</link> or Atom <link href="url"/>.
  let url = '';
  const lm = block.match(/<link>([\s\S]*?)<\/link>/);
  if (lm) url = stripTags(lm[1]);
  if (!url) {
    const lh = block.match(/<link[^>]*href="([^"]+)"/);
    if (lh) url = lh[1];
  }
  if (!url) return null;

  const dm =
    block.match(/<description>([\s\S]*?)<\/description>/) ||
    block.match(/<summary[^>]*>([\s\S]*?)<\/summary>/) ||
    block.match(/<content[^>]*>([\s\S]*?)<\/content>/);

  const pm =
    block.match(/<pubDate>([\s\S]*?)<\/pubDate>/) ||
    block.match(/<published>([\s\S]*?)<\/published>/) ||
    block.match(/<updated>([\s\S]*?)<\/updated>/) ||
    block.match(/<dc:date>([\s\S]*?)<\/dc:date>/);
  let published: string | null = null;
  if (pm) {
    const d = new Date(stripTags(pm[1]));
    if (!Number.isNaN(d.getTime())) published = d.toISOString();
  }

  return {
    title,
    url,
    source: label,
    snippet: dm ? clip(stripTags(dm[1]), SNIPPET_CLIP) : '',
    published_at: published,
  };
}

/** Extract up to `cap` posts from a feed (RSS items first, then Atom entries). */
export function extractPosts(xml: string, label: string, cap: number): BlogPost[] {
  const out: BlogPost[] = [];
  const blocks = [
    ...xml.matchAll(/<item[ >][\s\S]*?<\/item>/g),
    ...xml.matchAll(/<entry[ >][\s\S]*?<\/entry>/g),
  ];
  for (const m of blocks) {
    const p = parseItem(m[0], label);
    if (p) out.push(p);
    if (out.length >= cap) break;
  }
  return out;
}

// ── Fetch + refresh ────────────────────────────────────────────────

async function fetchFeed(url: string): Promise<string | null> {
  const controller = new AbortController();
  const id = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS);
  try {
    const res = await fetch(url, { headers: { 'User-Agent': UA, Accept: 'application/rss+xml, application/xml, text/xml' }, signal: controller.signal });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    return await res.text();
  } finally {
    clearTimeout(id);
  }
}

export interface RefreshBlogsResult {
  ok: boolean;
  count?: number;
  error?: string;
}

export async function refreshResearchBlogs(env: Env): Promise<RefreshBlogsResult> {
  const posts: BlogPost[] = [];
  const sources: string[] = [];
  for (const f of FEEDS) {
    try {
      const xml = await fetchFeed(f.url);
      if (!xml) continue;
      const got = extractPosts(xml, f.label, f.cap);
      if (got.length > 0) {
        posts.push(...got);
        if (!sources.includes(f.label)) sources.push(f.label);
      }
    } catch (err) {
      console.warn(`[research-blogs] fetch/parse failed for ${f.label} (${f.url}): ${(err as Error).message}`);
    }
  }
  if (posts.length === 0) {
    console.warn('[research-blogs] refresh skipped, no posts parsed; snapshot NOT written');
    return { ok: false, error: 'no posts parsed' };
  }
  // Newest first; entries without a date sort last.
  posts.sort((a, b) => (b.published_at ?? '').localeCompare(a.published_at ?? ''));
  const capped = posts.slice(0, TOTAL_CAP);
  const snapshot: ResearchBlogsSnapshot = {
    capturedAt: new Date().toISOString(),
    sources,
    post_count: capped.length,
    posts: capped,
    notes: [
      'Recent posts from major AI lab and academic research blogs (Google DeepMind, Google Research, Berkeley BAIR, MIT News AI, Hugging Face). Link and summarize only: title plus a clipped snippet and the link, never full text. Feed list is curated; re-pilot before adding sources.',
    ],
    source: {
      name: 'AI research blogs (multiple)',
      url: 'https://tensorfeed.ai/research/lab-blogs',
      license: 'Aggregated public RSS/Atom feeds. Each post links to its source; TensorFeed shows the title and a short snippet only, not the full text. Attribution is the source field on every entry.',
    },
  };
  await env.TENSORFEED_CACHE.put(CURRENT_KEY, JSON.stringify(snapshot));
  return { ok: true, count: capped.length };
}

export async function getResearchBlogs(env: Env): Promise<ResearchBlogsSnapshot | null> {
  const raw = await env.TENSORFEED_CACHE.get(CURRENT_KEY, 'text');
  if (!raw) return null;
  try {
    return JSON.parse(raw) as ResearchBlogsSnapshot;
  } catch {
    return null;
  }
}
