import { Env } from './types';
import { sanitizeArticleForAgents } from './sanitize';

/**
 * MLB sports surface (V1).
 *
 * Mirrors the NFL V1 pattern: 30-team factual catalog + hourly RSS
 * news aggregation. Lahman seasonal database (CC-BY-SA) and Retrosheet
 * game logs (free with attribution) are V2 candidates; both are
 * distributed as zipped CSVs which need a streaming zip parser the
 * Worker doesn't ship today.
 *
 * Legal posture:
 *   - MLB_TEAMS is factual public-domain data (Feist v. Rural).
 *   - News follows the RSS fair-use pattern (titles + 200-char
 *     snippets + mandatory link to canonical source).
 */

// ── Types ───────────────────────────────────────────────────────────

export interface MLBTeam {
  id: string;             // 'sf'
  name: string;           // 'San Francisco Giants'
  city: string;           // 'San Francisco'
  short_name: string;     // 'Giants'
  abbreviation: string;   // 'SF'
  league: 'AL' | 'NL';
  division: 'East' | 'Central' | 'West';
}

export interface SportsArticle {
  id: string;
  title: string;
  url: string;
  source: string;
  source_domain: string;
  snippet: string;
  league: 'mlb';
  publishedAt: string;
  fetchedAt: string;
}

export interface SportsNewsAttribution {
  policy: string;
  snippet_max_chars: number;
  link_required: true;
  source_required: true;
}

export const MLB_NEWS_ATTRIBUTION: SportsNewsAttribution = {
  policy:
    "RSS-syndicated MLB headlines and snippets capped at 200 characters with mandatory link and source name. Title and snippet are syndicated under each publisher's RSS feed; full content remains with the publisher. Each result links to the canonical article on the source domain.",
  snippet_max_chars: 200,
  link_required: true,
  source_required: true,
};

// ── 30-team factual catalog ─────────────────────────────────────────

export const MLB_TEAMS: MLBTeam[] = [
  // AL East
  { id: 'bal', name: 'Baltimore Orioles', city: 'Baltimore', short_name: 'Orioles', abbreviation: 'BAL', league: 'AL', division: 'East' },
  { id: 'bos', name: 'Boston Red Sox', city: 'Boston', short_name: 'Red Sox', abbreviation: 'BOS', league: 'AL', division: 'East' },
  { id: 'nyy', name: 'New York Yankees', city: 'New York', short_name: 'Yankees', abbreviation: 'NYY', league: 'AL', division: 'East' },
  { id: 'tb', name: 'Tampa Bay Rays', city: 'Tampa Bay', short_name: 'Rays', abbreviation: 'TB', league: 'AL', division: 'East' },
  { id: 'tor', name: 'Toronto Blue Jays', city: 'Toronto', short_name: 'Blue Jays', abbreviation: 'TOR', league: 'AL', division: 'East' },
  // AL Central
  { id: 'cws', name: 'Chicago White Sox', city: 'Chicago', short_name: 'White Sox', abbreviation: 'CWS', league: 'AL', division: 'Central' },
  { id: 'cle', name: 'Cleveland Guardians', city: 'Cleveland', short_name: 'Guardians', abbreviation: 'CLE', league: 'AL', division: 'Central' },
  { id: 'det', name: 'Detroit Tigers', city: 'Detroit', short_name: 'Tigers', abbreviation: 'DET', league: 'AL', division: 'Central' },
  { id: 'kc', name: 'Kansas City Royals', city: 'Kansas City', short_name: 'Royals', abbreviation: 'KC', league: 'AL', division: 'Central' },
  { id: 'min', name: 'Minnesota Twins', city: 'Minnesota', short_name: 'Twins', abbreviation: 'MIN', league: 'AL', division: 'Central' },
  // AL West
  { id: 'ath', name: 'Athletics', city: 'Sacramento', short_name: 'Athletics', abbreviation: 'ATH', league: 'AL', division: 'West' },
  { id: 'hou', name: 'Houston Astros', city: 'Houston', short_name: 'Astros', abbreviation: 'HOU', league: 'AL', division: 'West' },
  { id: 'laa', name: 'Los Angeles Angels', city: 'Los Angeles', short_name: 'Angels', abbreviation: 'LAA', league: 'AL', division: 'West' },
  { id: 'sea', name: 'Seattle Mariners', city: 'Seattle', short_name: 'Mariners', abbreviation: 'SEA', league: 'AL', division: 'West' },
  { id: 'tex', name: 'Texas Rangers', city: 'Texas', short_name: 'Rangers', abbreviation: 'TEX', league: 'AL', division: 'West' },
  // NL East
  { id: 'atl', name: 'Atlanta Braves', city: 'Atlanta', short_name: 'Braves', abbreviation: 'ATL', league: 'NL', division: 'East' },
  { id: 'mia', name: 'Miami Marlins', city: 'Miami', short_name: 'Marlins', abbreviation: 'MIA', league: 'NL', division: 'East' },
  { id: 'nym', name: 'New York Mets', city: 'New York', short_name: 'Mets', abbreviation: 'NYM', league: 'NL', division: 'East' },
  { id: 'phi', name: 'Philadelphia Phillies', city: 'Philadelphia', short_name: 'Phillies', abbreviation: 'PHI', league: 'NL', division: 'East' },
  { id: 'wsh', name: 'Washington Nationals', city: 'Washington', short_name: 'Nationals', abbreviation: 'WSH', league: 'NL', division: 'East' },
  // NL Central
  { id: 'chc', name: 'Chicago Cubs', city: 'Chicago', short_name: 'Cubs', abbreviation: 'CHC', league: 'NL', division: 'Central' },
  { id: 'cin', name: 'Cincinnati Reds', city: 'Cincinnati', short_name: 'Reds', abbreviation: 'CIN', league: 'NL', division: 'Central' },
  { id: 'mil', name: 'Milwaukee Brewers', city: 'Milwaukee', short_name: 'Brewers', abbreviation: 'MIL', league: 'NL', division: 'Central' },
  { id: 'pit', name: 'Pittsburgh Pirates', city: 'Pittsburgh', short_name: 'Pirates', abbreviation: 'PIT', league: 'NL', division: 'Central' },
  { id: 'stl', name: 'St. Louis Cardinals', city: 'St. Louis', short_name: 'Cardinals', abbreviation: 'STL', league: 'NL', division: 'Central' },
  // NL West
  { id: 'ari', name: 'Arizona Diamondbacks', city: 'Arizona', short_name: 'Diamondbacks', abbreviation: 'ARI', league: 'NL', division: 'West' },
  { id: 'col', name: 'Colorado Rockies', city: 'Colorado', short_name: 'Rockies', abbreviation: 'COL', league: 'NL', division: 'West' },
  { id: 'lad', name: 'Los Angeles Dodgers', city: 'Los Angeles', short_name: 'Dodgers', abbreviation: 'LAD', league: 'NL', division: 'West' },
  { id: 'sd', name: 'San Diego Padres', city: 'San Diego', short_name: 'Padres', abbreviation: 'SD', league: 'NL', division: 'West' },
  { id: 'sf', name: 'San Francisco Giants', city: 'San Francisco', short_name: 'Giants', abbreviation: 'SF', league: 'NL', division: 'West' },
];

export function getMLBTeam(id: string): MLBTeam | null {
  const lower = id.toLowerCase();
  return MLB_TEAMS.find(t => t.id === lower || t.abbreviation.toLowerCase() === lower) ?? null;
}

// ── RSS news ingest ─────────────────────────────────────────────────

interface SportsRSSSource {
  id: string;
  name: string;
  url: string;
  domain: string;
}

const MLB_NEWS_SOURCES: SportsRSSSource[] = [
  { id: 'espn-mlb', name: 'ESPN MLB', url: 'https://www.espn.com/espn/rss/mlb/news', domain: 'espn.com' },
  { id: 'cbs-mlb', name: 'CBS Sports MLB', url: 'https://www.cbssports.com/rss/headlines/mlb/', domain: 'cbssports.com' },
  { id: 'yahoo-mlb', name: 'Yahoo Sports MLB', url: 'https://sports.yahoo.com/mlb/rss/', domain: 'sports.yahoo.com' },
  { id: 'mlb-com', name: 'MLB.com', url: 'https://www.mlb.com/feeds/news/rss.xml', domain: 'mlb.com' },
];

const ARTICLES_KEY = 'sports-mlb:articles';
const META_KEY = 'sports-mlb:meta';
const MAX_ARTICLES = 200;
const MAX_PER_SOURCE = 25;
const SNIPPET_MAX = 200;
const FETCH_TIMEOUT_MS = 10_000;

// === RSS plumbing (mirrors sports-nfl.ts deliberately; both are kept
// independent so each league can evolve its source list and category
// rules without coupling)

function hashString(str: string): string {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    const ch = str.charCodeAt(i);
    hash = ((hash << 5) - hash) + ch;
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
        league: 'mlb',
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

export interface MLBNewsPollResult {
  articlesTotal: number;
  sourcesPolled: number;
  sourcesSucceeded: number;
  sourceResults: Array<{ id: string; name: string; status: 'ok' | 'empty' | 'error'; articles: number; error?: string }>;
}

export async function pollMLBNews(env: Env): Promise<MLBNewsPollResult> {
  console.log(`MLB news poll starting - ${MLB_NEWS_SOURCES.length} sources`);
  const results = await Promise.allSettled(MLB_NEWS_SOURCES.map(fetchSourceFeed));

  const all: SportsArticle[] = [];
  const sourceResults: MLBNewsPollResult['sourceResults'] = [];
  let succeeded = 0;

  for (let i = 0; i < results.length; i++) {
    const r = results[i];
    const src = MLB_NEWS_SOURCES[i];
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
    sourcesPolled: MLB_NEWS_SOURCES.length,
    sourcesSucceeded: succeeded,
    lastUpdated: new Date().toISOString(),
  }));

  return {
    articlesTotal: final.length,
    sourcesPolled: MLB_NEWS_SOURCES.length,
    sourcesSucceeded: succeeded,
    sourceResults,
  };
}

// ── Read API ─────────────────────────────────────────────────────────

export async function getStoredMLBNews(env: Env): Promise<SportsArticle[]> {
  const raw = (await env.TENSORFEED_NEWS.get(ARTICLES_KEY, 'json')) as SportsArticle[] | null;
  return raw ?? [];
}

export interface MLBNewsResponse {
  ok: true;
  league: 'mlb';
  count: number;
  articles: SportsArticle[];
  attribution: SportsNewsAttribution;
}

export async function readMLBNews(
  env: Env,
  options: { limit?: number; team?: string } = {},
): Promise<MLBNewsResponse> {
  const articles = await getStoredMLBNews(env);
  const limit = Math.max(1, Math.min(options.limit ?? 25, 100));

  let filtered = articles;
  if (options.team) {
    const team = getMLBTeam(options.team);
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

  const cleaned = filtered.slice(0, limit).map(a => sanitizeArticleForAgents(a));

  return {
    ok: true,
    league: 'mlb',
    count: cleaned.length,
    articles: cleaned as SportsArticle[],
    attribution: MLB_NEWS_ATTRIBUTION,
  };
}
