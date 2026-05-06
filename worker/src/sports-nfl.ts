import { Env } from './types';
import { sanitizeArticleForAgents } from './sanitize';

/**
 * NFL sports surface (V1).
 *
 * V1 ships three primitives:
 *   1. NFL_TEAMS: 32-team factual catalog (city, division, conference,
 *      abbreviation). Public-domain factual data, hand-curated.
 *   2. Sports news ingest: hourly RSS poll across NFL-focused outlets.
 *      Mirrors the AI-news pattern: title + ≤200-char snippet + canonical
 *      link, sanitized for prompt-injection. Stored under
 *      TENSORFEED_NEWS/sports-nfl:articles.
 *   3. Read endpoints exposed under /api/sports/* and /api/sports/nfl/*.
 *
 * V2 candidates (not in V1):
 *   - Players + roster from nflverse-data (CC-BY-4.0, on GitHub Releases)
 *   - Schedule + scores
 *   - Weekly stats
 *   - Injury reports
 *   - Editorial fantasy rankings
 *
 * Legal posture: NFL_TEAMS is factual data (Feist). News ingest follows
 * the same RSS fair-use pattern as the AI news layer (titles + 200-char
 * snippets + mandatory link to canonical source).
 */

// ── Types ───────────────────────────────────────────────────────────

export interface NFLTeam {
  id: string;            // 'sf'
  name: string;          // 'San Francisco 49ers'
  city: string;          // 'San Francisco'
  short_name: string;    // '49ers'
  abbreviation: string;  // 'SF'
  conference: 'AFC' | 'NFC';
  division: 'East' | 'North' | 'South' | 'West';
}

export interface SportsArticle {
  id: string;
  title: string;
  url: string;
  source: string;
  source_domain: string;
  snippet: string;
  league: 'nfl';
  publishedAt: string;
  fetchedAt: string;
}

export interface SportsNewsAttribution {
  policy: string;
  snippet_max_chars: number;
  link_required: true;
  source_required: true;
}

export const SPORTS_NEWS_ATTRIBUTION: SportsNewsAttribution = {
  policy:
    "RSS-syndicated NFL headlines and snippets capped at 200 characters with mandatory link and source name. Title and snippet are syndicated under each publisher's RSS feed; full content remains with the publisher. Each result links to the canonical article on the source domain.",
  snippet_max_chars: 200,
  link_required: true,
  source_required: true,
};

// ── 32-team factual catalog ─────────────────────────────────────────

export const NFL_TEAMS: NFLTeam[] = [
  // AFC East
  { id: 'buf', name: 'Buffalo Bills', city: 'Buffalo', short_name: 'Bills', abbreviation: 'BUF', conference: 'AFC', division: 'East' },
  { id: 'mia', name: 'Miami Dolphins', city: 'Miami', short_name: 'Dolphins', abbreviation: 'MIA', conference: 'AFC', division: 'East' },
  { id: 'ne', name: 'New England Patriots', city: 'New England', short_name: 'Patriots', abbreviation: 'NE', conference: 'AFC', division: 'East' },
  { id: 'nyj', name: 'New York Jets', city: 'New York', short_name: 'Jets', abbreviation: 'NYJ', conference: 'AFC', division: 'East' },
  // AFC North
  { id: 'bal', name: 'Baltimore Ravens', city: 'Baltimore', short_name: 'Ravens', abbreviation: 'BAL', conference: 'AFC', division: 'North' },
  { id: 'cin', name: 'Cincinnati Bengals', city: 'Cincinnati', short_name: 'Bengals', abbreviation: 'CIN', conference: 'AFC', division: 'North' },
  { id: 'cle', name: 'Cleveland Browns', city: 'Cleveland', short_name: 'Browns', abbreviation: 'CLE', conference: 'AFC', division: 'North' },
  { id: 'pit', name: 'Pittsburgh Steelers', city: 'Pittsburgh', short_name: 'Steelers', abbreviation: 'PIT', conference: 'AFC', division: 'North' },
  // AFC South
  { id: 'hou', name: 'Houston Texans', city: 'Houston', short_name: 'Texans', abbreviation: 'HOU', conference: 'AFC', division: 'South' },
  { id: 'ind', name: 'Indianapolis Colts', city: 'Indianapolis', short_name: 'Colts', abbreviation: 'IND', conference: 'AFC', division: 'South' },
  { id: 'jax', name: 'Jacksonville Jaguars', city: 'Jacksonville', short_name: 'Jaguars', abbreviation: 'JAX', conference: 'AFC', division: 'South' },
  { id: 'ten', name: 'Tennessee Titans', city: 'Tennessee', short_name: 'Titans', abbreviation: 'TEN', conference: 'AFC', division: 'South' },
  // AFC West
  { id: 'den', name: 'Denver Broncos', city: 'Denver', short_name: 'Broncos', abbreviation: 'DEN', conference: 'AFC', division: 'West' },
  { id: 'kc', name: 'Kansas City Chiefs', city: 'Kansas City', short_name: 'Chiefs', abbreviation: 'KC', conference: 'AFC', division: 'West' },
  { id: 'lv', name: 'Las Vegas Raiders', city: 'Las Vegas', short_name: 'Raiders', abbreviation: 'LV', conference: 'AFC', division: 'West' },
  { id: 'lac', name: 'Los Angeles Chargers', city: 'Los Angeles', short_name: 'Chargers', abbreviation: 'LAC', conference: 'AFC', division: 'West' },
  // NFC East
  { id: 'dal', name: 'Dallas Cowboys', city: 'Dallas', short_name: 'Cowboys', abbreviation: 'DAL', conference: 'NFC', division: 'East' },
  { id: 'nyg', name: 'New York Giants', city: 'New York', short_name: 'Giants', abbreviation: 'NYG', conference: 'NFC', division: 'East' },
  { id: 'phi', name: 'Philadelphia Eagles', city: 'Philadelphia', short_name: 'Eagles', abbreviation: 'PHI', conference: 'NFC', division: 'East' },
  { id: 'wsh', name: 'Washington Commanders', city: 'Washington', short_name: 'Commanders', abbreviation: 'WSH', conference: 'NFC', division: 'East' },
  // NFC North
  { id: 'chi', name: 'Chicago Bears', city: 'Chicago', short_name: 'Bears', abbreviation: 'CHI', conference: 'NFC', division: 'North' },
  { id: 'det', name: 'Detroit Lions', city: 'Detroit', short_name: 'Lions', abbreviation: 'DET', conference: 'NFC', division: 'North' },
  { id: 'gb', name: 'Green Bay Packers', city: 'Green Bay', short_name: 'Packers', abbreviation: 'GB', conference: 'NFC', division: 'North' },
  { id: 'min', name: 'Minnesota Vikings', city: 'Minnesota', short_name: 'Vikings', abbreviation: 'MIN', conference: 'NFC', division: 'North' },
  // NFC South
  { id: 'atl', name: 'Atlanta Falcons', city: 'Atlanta', short_name: 'Falcons', abbreviation: 'ATL', conference: 'NFC', division: 'South' },
  { id: 'car', name: 'Carolina Panthers', city: 'Carolina', short_name: 'Panthers', abbreviation: 'CAR', conference: 'NFC', division: 'South' },
  { id: 'no', name: 'New Orleans Saints', city: 'New Orleans', short_name: 'Saints', abbreviation: 'NO', conference: 'NFC', division: 'South' },
  { id: 'tb', name: 'Tampa Bay Buccaneers', city: 'Tampa Bay', short_name: 'Buccaneers', abbreviation: 'TB', conference: 'NFC', division: 'South' },
  // NFC West
  { id: 'ari', name: 'Arizona Cardinals', city: 'Arizona', short_name: 'Cardinals', abbreviation: 'ARI', conference: 'NFC', division: 'West' },
  { id: 'lar', name: 'Los Angeles Rams', city: 'Los Angeles', short_name: 'Rams', abbreviation: 'LAR', conference: 'NFC', division: 'West' },
  { id: 'sf', name: 'San Francisco 49ers', city: 'San Francisco', short_name: '49ers', abbreviation: 'SF', conference: 'NFC', division: 'West' },
  { id: 'sea', name: 'Seattle Seahawks', city: 'Seattle', short_name: 'Seahawks', abbreviation: 'SEA', conference: 'NFC', division: 'West' },
];

export function getNFLTeam(id: string): NFLTeam | null {
  const lower = id.toLowerCase();
  return NFL_TEAMS.find(t => t.id === lower || t.abbreviation.toLowerCase() === lower) ?? null;
}

// ── RSS news ingest ─────────────────────────────────────────────────

interface SportsRSSSource {
  id: string;
  name: string;
  url: string;
  domain: string;
}

const NFL_NEWS_SOURCES: SportsRSSSource[] = [
  { id: 'espn-nfl', name: 'ESPN NFL', url: 'https://www.espn.com/espn/rss/nfl/news', domain: 'espn.com' },
  { id: 'cbs-nfl', name: 'CBS Sports NFL', url: 'https://www.cbssports.com/rss/headlines/nfl/', domain: 'cbssports.com' },
  { id: 'yahoo-nfl', name: 'Yahoo Sports NFL', url: 'https://sports.yahoo.com/nfl/rss/', domain: 'sports.yahoo.com' },
  { id: 'nfl-com', name: 'NFL.com', url: 'https://www.nfl.com/rss/rsslanding?searchString=home', domain: 'nfl.com' },
];

const ARTICLES_KEY = 'sports-nfl:articles';
const META_KEY = 'sports-nfl:meta';
const MAX_ARTICLES = 200;
const MAX_PER_SOURCE = 25;
const SNIPPET_MAX = 200;
const FETCH_TIMEOUT_MS = 10000;

function hashString(str: string): string {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash |= 0;
  }
  return Math.abs(hash).toString(36);
}

function decodeEntities(text: string): string {
  return text
    .replace(/&#(\d+);/g, (_, c) => String.fromCharCode(parseInt(c, 10)))
    .replace(/&#x([0-9a-fA-F]+);/g, (_, c) => String.fromCharCode(parseInt(c, 16)))
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&#x27;/g, "'")
    .replace(/&apos;/g, "'")
    .replace(/&mdash;/g, ' - ')
    .replace(/&ndash;/g, '-')
    .replace(/&hellip;/g, '...')
    .replace(/&lsquo;/g, "'")
    .replace(/&rsquo;/g, "'")
    .replace(/&ldquo;/g, '"')
    .replace(/&rdquo;/g, '"');
}

function stripHtml(html: string): string {
  return decodeEntities(html.replace(/<[^>]*>/g, '')).replace(/\s+/g, ' ').trim();
}

function truncate(text: string, maxLength: number): string {
  if (text.length <= maxLength) return text;
  return text.substring(0, maxLength).replace(/\s+\S*$/, '') + '...';
}

function extractFromXml(xml: string, tag: string): string {
  const cdataRe = new RegExp(`<${tag}[^>]*>\\s*<!\\[CDATA\\[([\\s\\S]*?)\\]\\]>\\s*</${tag}>`, 'i');
  const cdata = xml.match(cdataRe);
  if (cdata) return cdata[1].trim();
  const re = new RegExp(`<${tag}[^>]*>([\\s\\S]*?)</${tag}>`, 'i');
  const m = xml.match(re);
  return m ? m[1].trim() : '';
}

function extractAttribute(xml: string, tag: string, attr: string): string {
  const re = new RegExp(`<${tag}[^>]*${attr}="([^"]*)"`, 'i');
  const m = xml.match(re);
  return m ? m[1] : '';
}

interface ParsedItem {
  title: string;
  link: string;
  description: string;
  pubDate: string;
}

export function parseRSSItems(xml: string): ParsedItem[] {
  const items: ParsedItem[] = [];
  const isAtom = xml.includes('<feed') && xml.includes('xmlns="http://www.w3.org/2005/Atom"');

  if (isAtom) {
    const entries = xml.split(/<entry>/i).slice(1);
    for (const entry of entries) {
      const title = stripHtml(extractFromXml(entry, 'title'));
      const link = extractAttribute(entry, 'link', 'href') || extractFromXml(entry, 'link');
      const description = extractFromXml(entry, 'summary') || extractFromXml(entry, 'content');
      const pubDate = extractFromXml(entry, 'published') || extractFromXml(entry, 'updated');
      if (title && link) items.push({ title, link, description, pubDate });
    }
  } else {
    const rssItems = xml.split(/<item>/i).slice(1);
    for (const it of rssItems) {
      const title = stripHtml(extractFromXml(it, 'title'));
      const link = extractFromXml(it, 'link') || extractFromXml(it, 'guid');
      const description = extractFromXml(it, 'description') || extractFromXml(it, 'content:encoded');
      const pubDate = extractFromXml(it, 'pubDate') || extractFromXml(it, 'dc:date');
      if (title && link) items.push({ title, link, description, pubDate });
    }
  }

  return items;
}

async function fetchSourceFeed(source: SportsRSSSource): Promise<SportsArticle[]> {
  try {
    const res = await fetch(source.url, {
      headers: { 'User-Agent': 'TensorFeed-Sports/1.0 (https://tensorfeed.ai)' },
      signal: AbortSignal.timeout(FETCH_TIMEOUT_MS),
    });
    if (!res.ok) {
      console.warn(`${source.name}: HTTP ${res.status}`);
      return [];
    }
    const xml = await res.text();
    const items = parseRSSItems(xml);
    const now = new Date().toISOString();
    const out: SportsArticle[] = [];

    for (const item of items) {
      if (out.length >= MAX_PER_SOURCE) break;
      const cleanDesc = stripHtml(item.description);
      const snippet = truncate(cleanDesc, SNIPPET_MAX) || `${item.title} (via ${source.name})`;
      out.push({
        id: hashString(item.link),
        title: item.title,
        url: item.link,
        source: source.name,
        source_domain: source.domain,
        snippet,
        league: 'nfl',
        publishedAt: item.pubDate ? new Date(item.pubDate).toISOString() : now,
        fetchedAt: now,
      });
    }
    return out;
  } catch (err) {
    console.warn(`${source.name}: fetch failed -`, err);
    return [];
  }
}

export interface NFLNewsPollResult {
  articlesTotal: number;
  sourcesPolled: number;
  sourcesSucceeded: number;
  sourceResults: Array<{ id: string; name: string; status: 'ok' | 'empty' | 'error'; articles: number; error?: string }>;
}

export async function pollNFLNews(env: Env): Promise<NFLNewsPollResult> {
  console.log(`NFL news poll starting - ${NFL_NEWS_SOURCES.length} sources`);
  const results = await Promise.allSettled(NFL_NEWS_SOURCES.map(fetchSourceFeed));

  const all: SportsArticle[] = [];
  const sourceResults: NFLNewsPollResult['sourceResults'] = [];
  let succeeded = 0;

  for (let i = 0; i < results.length; i++) {
    const r = results[i];
    const src = NFL_NEWS_SOURCES[i];
    if (r.status === 'fulfilled') {
      const count = r.value.length;
      if (count > 0) {
        all.push(...r.value);
        succeeded += 1;
        sourceResults.push({ id: src.id, name: src.name, status: 'ok', articles: count });
      } else {
        sourceResults.push({ id: src.id, name: src.name, status: 'empty', articles: 0 });
      }
    } else {
      const err = r.reason instanceof Error ? r.reason.message : String(r.reason);
      sourceResults.push({ id: src.id, name: src.name, status: 'error', articles: 0, error: err });
    }
  }

  const seen = new Set<string>();
  const deduped = all.filter(a => {
    if (seen.has(a.url)) return false;
    seen.add(a.url);
    return true;
  });
  deduped.sort((a, b) => new Date(b.publishedAt).getTime() - new Date(a.publishedAt).getTime());
  const final = deduped.slice(0, MAX_ARTICLES);

  await env.TENSORFEED_NEWS.put(ARTICLES_KEY, JSON.stringify(final), {
    metadata: { count: final.length, sources: succeeded, updatedAt: new Date().toISOString() },
  });
  await env.TENSORFEED_NEWS.put(META_KEY, JSON.stringify({
    totalArticles: final.length,
    sourcesPolled: NFL_NEWS_SOURCES.length,
    sourcesSucceeded: succeeded,
    lastUpdated: new Date().toISOString(),
  }));

  console.log(`NFL news poll complete - ${final.length} articles from ${succeeded}/${NFL_NEWS_SOURCES.length} sources`);

  return {
    articlesTotal: final.length,
    sourcesPolled: NFL_NEWS_SOURCES.length,
    sourcesSucceeded: succeeded,
    sourceResults,
  };
}

// ── Read API ─────────────────────────────────────────────────────────

export async function getStoredNFLNews(env: Env): Promise<SportsArticle[]> {
  const raw = (await env.TENSORFEED_NEWS.get(ARTICLES_KEY, 'json')) as SportsArticle[] | null;
  return raw ?? [];
}

export interface NFLNewsResponse {
  ok: true;
  league: 'nfl';
  count: number;
  articles: SportsArticle[];
  attribution: SportsNewsAttribution;
}

export async function readNFLNews(
  env: Env,
  options: { limit?: number; team?: string } = {},
): Promise<NFLNewsResponse> {
  const articles = await getStoredNFLNews(env);
  const limit = Math.max(1, Math.min(options.limit ?? 25, 100));

  let filtered = articles;
  if (options.team) {
    const team = getNFLTeam(options.team);
    if (team) {
      const matchTerms = [
        team.name.toLowerCase(),
        team.short_name.toLowerCase(),
        team.city.toLowerCase(),
      ];
      filtered = filtered.filter(a => {
        const haystack = `${a.title} ${a.snippet}`.toLowerCase();
        return matchTerms.some(t => haystack.includes(t));
      });
    }
  }

  const cleaned = filtered
    .slice(0, limit)
    .map(a => sanitizeArticleForAgents(a));

  return {
    ok: true,
    league: 'nfl',
    count: cleaned.length,
    articles: cleaned as SportsArticle[],
    attribution: SPORTS_NEWS_ATTRIBUTION,
  };
}

// ── Top-level league directory ───────────────────────────────────────

export interface SportsLeague {
  id: string;
  name: string;
  endpoint_prefix: string;
  status: 'live' | 'planned';
  description: string;
}

export const SUPPORTED_LEAGUES: SportsLeague[] = [
  {
    id: 'nfl',
    name: 'National Football League',
    endpoint_prefix: '/api/sports/nfl',
    status: 'live',
    description: 'NFL team catalog and aggregated news. Players, schedule, and stats land in V2 from nflverse-data (CC-BY-4.0).',
  },
  {
    id: 'nba',
    name: 'National Basketball Association',
    endpoint_prefix: '/api/sports/nba',
    status: 'planned',
    description: 'Roadmapped. Source TBD pending ToS review (NBA Stats API redistribution unclear; likely community open datasets).',
  },
  {
    id: 'mlb',
    name: 'Major League Baseball',
    endpoint_prefix: '/api/sports/mlb',
    status: 'live',
    description: 'Live as of 2026-05-06 (V1: 30-team factual catalog plus hourly RSS news from ESPN, MLB.com, CBS Sports, Yahoo Sports). V2 candidates: Lahman seasonal stats (CC-BY-SA) and Retrosheet game logs.',
  },
  {
    id: 'nhl',
    name: 'National Hockey League',
    endpoint_prefix: '/api/sports/nhl',
    status: 'planned',
    description: 'Roadmapped. Source TBD pending ToS review.',
  },
];
