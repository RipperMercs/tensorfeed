import type { Env } from './types';
import { fetchOpenAlexWithRetry } from './openalex-fetch';

/**
 * AI/ML academic research authors leaderboard from OpenAlex.
 *
 * Companion to openalex-research.ts (institutions). Where that endpoint
 * ranks institutions by AI publication volume in the trailing 365 days,
 * this one ranks individual authors by the same metric, then enriches
 * with their h_index, cited_by_count, primary affiliation, and ORCID.
 *
 * V1 surface: top 100 authors by AI publication volume in the last
 * year. Net-new value, no overlap with /api/premium/research/velocity
 * (institution-level) or /api/premium/research/lab-productivity
 * (Qwen-extracted affiliations from arXiv).
 *
 * Why agents pay for this:
 *   - "who's publishing the most AI work right now" is a question that
 *     would otherwise require scraping Google Scholar or paying Semantic
 *     Scholar enterprise. OpenAlex has the data free (CC0); the value-add
 *     here is the AI-concept filter + enrichment + derived ai_share_pct
 *     + h_index/cited_by_count in one ranked card per author.
 *   - Pairs with the institutions endpoint: agents tracking AI talent
 *     migration can join author → institution by openalex_id.
 *
 * Architecture (same shape as openalex-research.ts):
 *   1. /works?filter=concepts.id:C154945302,from_publication_date:...&group_by=authorships.author.id
 *   2. /authors?filter=ids.openalex:<top-N>&select=id,display_name,orcid,affiliations,summary_stats,works_count,cited_by_count
 *
 * License: OpenAlex CC0, commercial use + redistribution permitted,
 * attribution appreciated. TF cites the source on every response.
 */

const OPENALEX_BASE = 'https://api.openalex.org';
const AI_CONCEPT_ID = 'C154945302';
const POLITE_UA = 'tensorfeed-research/1.0 (mailto:evan@tensorfeed.ai; +https://tensorfeed.ai)';

const CURRENT_KEY = 'openalex-ai-authors:current';
const TOP_N = 100;

function isoDateOffsetDays(days: number): string {
  const d = new Date();
  d.setUTCDate(d.getUTCDate() - days);
  return d.toISOString().slice(0, 10);
}

// ── OpenAlex API shapes ────────────────────────────────────────────

interface GroupByResult {
  group_by?: Array<{ key?: string; key_display_name?: string; count?: number }>;
}

interface OpenAlexAuthor {
  id?: string;
  display_name?: string;
  orcid?: string | null;
  affiliations?: Array<{
    institution?: { id?: string; display_name?: string; country_code?: string | null };
    years?: number[];
  }>;
  summary_stats?: { h_index?: number; i10_index?: number };
  works_count?: number;
  cited_by_count?: number;
}

interface AuthorsList {
  results?: OpenAlexAuthor[];
}

interface AuthorAggregate {
  openalex_id: string;
  ai_works_last_year: number;
}

// ── Public types ───────────────────────────────────────────────────

export interface AIAuthorEntry {
  rank: number;
  openalex_id: string;
  display_name: string;
  orcid: string | null;
  primary_affiliation: {
    openalex_id: string | null;
    display_name: string | null;
    country_code: string | null;
  };
  ai_works_last_year: number;
  total_works_count: number | null;
  cited_by_count: number | null;
  h_index: number | null;
  i10_index: number | null;
  /** AI publications as fraction of total works (0 to 1). Null if total unknown. */
  ai_share_pct: number | null;
}

export interface AIAuthorsSnapshot {
  capturedAt: string;
  window_days: number;
  concept: { id: string; name: string };
  authors: AIAuthorEntry[];
  notes: string[];
  source: {
    name: string;
    url: string;
    license: string;
  };
}

// ── Fetchers ───────────────────────────────────────────────────────

async function fetchAuthorAggregate(): Promise<AuthorAggregate[]> {
  const fromDate = isoDateOffsetDays(365);
  const url =
    `${OPENALEX_BASE}/works` +
    `?filter=concepts.id:${AI_CONCEPT_ID},from_publication_date:${fromDate}` +
    `&group_by=authorships.author.id` +
    `&per_page=200` +
    `&mailto=evan@tensorfeed.ai`;
  const res = await fetchOpenAlexWithRetry(url, {
    'User-Agent': POLITE_UA,
    Accept: 'application/json',
  });
  if (!res.ok) {
    throw new Error(`openalex authors group_by failed: HTTP ${res.status}`);
  }
  const data = (await res.json()) as GroupByResult;
  const groups = Array.isArray(data.group_by) ? data.group_by : [];
  const out: AuthorAggregate[] = [];
  for (const g of groups) {
    if (!g.key || typeof g.count !== 'number') continue;
    const id = g.key.startsWith('http') ? g.key.split('/').pop()! : g.key;
    if (!id || !id.startsWith('A')) continue;
    out.push({ openalex_id: id, ai_works_last_year: g.count });
  }
  out.sort((a, b) => b.ai_works_last_year - a.ai_works_last_year);
  return out.slice(0, TOP_N);
}

async function fetchAuthorDetails(ids: string[]): Promise<Map<string, OpenAlexAuthor>> {
  if (ids.length === 0) return new Map();
  const filterValue = ids.join('|');
  const url =
    `${OPENALEX_BASE}/authors` +
    `?filter=ids.openalex:${encodeURIComponent(filterValue)}` +
    `&select=id,display_name,orcid,affiliations,summary_stats,works_count,cited_by_count` +
    `&per_page=200` +
    `&mailto=evan@tensorfeed.ai`;
  const res = await fetchOpenAlexWithRetry(url, {
    'User-Agent': POLITE_UA,
    Accept: 'application/json',
  });
  if (!res.ok) {
    throw new Error(`openalex authors details failed: HTTP ${res.status}`);
  }
  const data = (await res.json()) as AuthorsList;
  const out = new Map<string, OpenAlexAuthor>();
  for (const a of data.results ?? []) {
    if (!a.id) continue;
    const bare = a.id.startsWith('http') ? a.id.split('/').pop()! : a.id;
    out.set(bare, a);
  }
  return out;
}

// ── Snapshot ───────────────────────────────────────────────────────

function pickPrimaryAffiliation(
  author: OpenAlexAuthor,
): AIAuthorEntry['primary_affiliation'] {
  const affiliations = author.affiliations ?? [];
  // Pick the affiliation with the most recent years entry. Falls back to
  // the first listed if no years data is available.
  let chosen = affiliations[0] ?? null;
  let mostRecent = -Infinity;
  for (const aff of affiliations) {
    const maxYear = Math.max(...(aff.years ?? [-Infinity]));
    if (maxYear > mostRecent) {
      mostRecent = maxYear;
      chosen = aff;
    }
  }
  if (!chosen?.institution) {
    return { openalex_id: null, display_name: null, country_code: null };
  }
  const inst = chosen.institution;
  const bare = inst.id?.startsWith('http') ? inst.id.split('/').pop()! : inst.id ?? null;
  return {
    openalex_id: bare ?? null,
    display_name: inst.display_name ?? null,
    country_code: inst.country_code ?? null,
  };
}

export function buildSnapshot(
  aggregates: AuthorAggregate[],
  details: Map<string, OpenAlexAuthor>,
): AIAuthorsSnapshot {
  const notes: string[] = [];
  const rows: AIAuthorEntry[] = [];
  let missing = 0;

  for (let i = 0; i < aggregates.length; i++) {
    const a = aggregates[i];
    const d = details.get(a.openalex_id);
    if (!d) {
      missing += 1;
      continue;
    }
    const totalWorks = typeof d.works_count === 'number' ? d.works_count : null;
    const aiShare = totalWorks && totalWorks > 0
      ? Math.min(1, a.ai_works_last_year / totalWorks)
      : null;
    rows.push({
      rank: i + 1,
      openalex_id: a.openalex_id,
      display_name: d.display_name ?? a.openalex_id,
      orcid: d.orcid ?? null,
      primary_affiliation: pickPrimaryAffiliation(d),
      ai_works_last_year: a.ai_works_last_year,
      total_works_count: totalWorks,
      cited_by_count: typeof d.cited_by_count === 'number' ? d.cited_by_count : null,
      h_index: typeof d.summary_stats?.h_index === 'number' ? d.summary_stats.h_index : null,
      i10_index: typeof d.summary_stats?.i10_index === 'number' ? d.summary_stats.i10_index : null,
      ai_share_pct: aiShare !== null ? parseFloat((aiShare * 100).toFixed(2)) : null,
    });
  }
  if (missing > 0) {
    notes.push(`${missing} author(s) had aggregate counts but no enrichment lookup; omitted from output`);
  }

  return {
    capturedAt: new Date().toISOString(),
    window_days: 365,
    concept: { id: AI_CONCEPT_ID, name: 'Artificial intelligence' },
    authors: rows,
    notes,
    source: {
      name: 'OpenAlex',
      url: 'https://api.openalex.org',
      license: 'CC0 1.0 Universal Public Domain Dedication. Commercial use and redistribution permitted; attribution appreciated.',
    },
  };
}

// ── Refresh + read API ─────────────────────────────────────────────

export interface RefreshAuthorsResult {
  ok: boolean;
  count?: number;
  error?: string;
}

export async function refreshOpenAlexAIAuthors(env: Env): Promise<RefreshAuthorsResult> {
  let aggregates: AuthorAggregate[];
  try {
    aggregates = await fetchAuthorAggregate();
  } catch (err) {
    return { ok: false, error: `aggregate: ${(err as Error).message}` };
  }
  if (aggregates.length === 0) {
    return { ok: false, error: 'aggregate returned 0 groups' };
  }

  let details: Map<string, OpenAlexAuthor>;
  try {
    details = await fetchAuthorDetails(aggregates.map(a => a.openalex_id));
  } catch (err) {
    return { ok: false, error: `details: ${(err as Error).message}` };
  }

  const snapshot = buildSnapshot(aggregates, details);
  await env.TENSORFEED_CACHE.put(CURRENT_KEY, JSON.stringify(snapshot), {
    expirationTtl: 60 * 60 * 24 * 7,
  });
  return { ok: true, count: snapshot.authors.length };
}

export async function getOpenAlexAIAuthors(env: Env): Promise<AIAuthorsSnapshot | null> {
  const raw = await env.TENSORFEED_CACHE.get(CURRENT_KEY, 'text');
  if (!raw) return null;
  try {
    return JSON.parse(raw) as AIAuthorsSnapshot;
  } catch {
    return null;
  }
}
