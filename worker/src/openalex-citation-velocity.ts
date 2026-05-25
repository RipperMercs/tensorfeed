import type { Env } from './types';
import { fetchOpenAlexWithRetry } from './openalex-fetch';

/**
 * AI/ML research papers ranked by citation velocity (OpenAlex).
 *
 * Answers the question "which recent AI papers are gaining citations
 * fastest right now?" — the inverse of the usual top-cited lists which
 * are dominated by older foundational papers.
 *
 * Velocity definition: for a paper, velocity_ratio is the share of its
 * total citations that arrived in the most recent calendar year. A
 * brand-new paper with all its citations in the latest year scores 1.0;
 * a foundational paper still steady-state cited scores around its
 * latest-year-share-of-total (often ~0.05-0.1). Filtering to papers
 * published in the last 2 years removes old long-tail papers from the
 * leaderboard so the result is genuinely "what's hot RIGHT NOW".
 *
 * Why agents pay for this:
 *   - "Which paper should I read?" is a real research-agent question.
 *     Top-cited lists answer "which paper has been read most" which is
 *     a historical artifact. Velocity answers "which paper is being
 *     cited fastest right now."
 *   - OpenAlex exposes counts_by_year per work; the compute is one
 *     API call + client-side ranking. Agents would otherwise have to
 *     fetch each work individually.
 *
 * Architecture:
 *   1. /works?filter=concepts.id:C154945302,from_publication_date:LAST_2_YEARS,cited_by_count:>3
 *      &sort=cited_by_count:desc&per_page=200&select=id,display_name,publication_year,cited_by_count,counts_by_year,authorships,doi,primary_location
 *   2. Compute velocity for each, sort, return top 100.
 *
 * License: OpenAlex CC0, attribution appreciated. Cited on every response.
 */

const OPENALEX_BASE = 'https://api.openalex.org';
const AI_CONCEPT_ID = 'C154945302';
const POLITE_UA = 'tensorfeed-research/1.0 (mailto:evan@tensorfeed.ai; +https://tensorfeed.ai)';

const CURRENT_KEY = 'openalex-ai-citation-velocity:current';
const TOP_N = 100;
const MIN_CITATIONS_TO_RANK = 3;
const RECENT_PUBLICATION_YEARS = 2;

// ── OpenAlex API shapes ────────────────────────────────────────────

interface OpenAlexWork {
  id?: string;
  display_name?: string;
  publication_year?: number;
  cited_by_count?: number;
  counts_by_year?: Array<{ year?: number; cited_by_count?: number }>;
  authorships?: Array<{
    author?: { id?: string; display_name?: string };
    institutions?: Array<{ id?: string; display_name?: string }>;
  }>;
  doi?: string | null;
  primary_location?: {
    source?: { display_name?: string | null };
    landing_page_url?: string | null;
  } | null;
}

interface WorksList {
  results?: OpenAlexWork[];
}

// ── Public types ───────────────────────────────────────────────────

export interface CitationVelocityEntry {
  rank: number;
  openalex_id: string;
  title: string;
  publication_year: number;
  cited_by_count: number;
  citations_latest_year: number;
  citations_latest_year_share: number; // 0..1
  doi: string | null;
  venue: string | null;
  landing_page_url: string | null;
  first_three_authors: Array<{ openalex_id: string | null; display_name: string }>;
  primary_affiliation: { openalex_id: string | null; display_name: string | null };
}

export interface CitationVelocitySnapshot {
  capturedAt: string;
  filter: {
    concept_id: string;
    concept_name: string;
    min_publication_year: number;
    min_citations: number;
  };
  papers: CitationVelocityEntry[];
  notes: string[];
  source: { name: string; url: string; license: string };
}

// ── Fetch + compute ────────────────────────────────────────────────

async function fetchRecentCitedAIWorks(): Promise<OpenAlexWork[]> {
  const currentYear = new Date().getUTCFullYear();
  const minYear = currentYear - RECENT_PUBLICATION_YEARS;
  const url =
    `${OPENALEX_BASE}/works` +
    `?filter=concepts.id:${AI_CONCEPT_ID},from_publication_date:${minYear}-01-01,cited_by_count:>${MIN_CITATIONS_TO_RANK - 1}` +
    `&sort=cited_by_count:desc` +
    `&per_page=200` +
    `&select=id,display_name,publication_year,cited_by_count,counts_by_year,authorships,doi,primary_location` +
    `&mailto=evan@tensorfeed.ai`;
  const res = await fetchOpenAlexWithRetry(url, {
    'User-Agent': POLITE_UA,
    Accept: 'application/json',
  });
  if (!res.ok) {
    throw new Error(`openalex works failed: HTTP ${res.status}`);
  }
  const data = (await res.json()) as WorksList;
  return data.results ?? [];
}

function citationsInLatestYear(w: OpenAlexWork): number {
  const counts = w.counts_by_year ?? [];
  if (counts.length === 0) return 0;
  // Find the most recent year with data.
  let latest = -Infinity;
  for (const c of counts) {
    if (typeof c.year === 'number' && c.year > latest) latest = c.year;
  }
  if (latest === -Infinity) return 0;
  for (const c of counts) {
    if (c.year === latest && typeof c.cited_by_count === 'number') return c.cited_by_count;
  }
  return 0;
}

function pickFirstThreeAuthors(
  w: OpenAlexWork,
): CitationVelocityEntry['first_three_authors'] {
  const out: CitationVelocityEntry['first_three_authors'] = [];
  for (const a of (w.authorships ?? []).slice(0, 3)) {
    const id = a.author?.id;
    const bare = id?.startsWith('http') ? id.split('/').pop()! : id ?? null;
    out.push({
      openalex_id: bare ?? null,
      display_name: a.author?.display_name ?? '(unknown)',
    });
  }
  return out;
}

function pickPrimaryAffiliation(
  w: OpenAlexWork,
): CitationVelocityEntry['primary_affiliation'] {
  // First author's first listed institution if present.
  const firstAuthor = w.authorships?.[0];
  const firstInst = firstAuthor?.institutions?.[0];
  if (!firstInst) return { openalex_id: null, display_name: null };
  const bare = firstInst.id?.startsWith('http') ? firstInst.id.split('/').pop()! : firstInst.id ?? null;
  return {
    openalex_id: bare ?? null,
    display_name: firstInst.display_name ?? null,
  };
}

export function buildVelocitySnapshot(works: OpenAlexWork[]): CitationVelocitySnapshot {
  const notes: string[] = [];
  const currentYear = new Date().getUTCFullYear();
  const minYear = currentYear - RECENT_PUBLICATION_YEARS;
  const scored: Array<{ work: OpenAlexWork; share: number; latest: number }> = [];

  for (const w of works) {
    const total = typeof w.cited_by_count === 'number' ? w.cited_by_count : 0;
    if (total < MIN_CITATIONS_TO_RANK) continue;
    const latest = citationsInLatestYear(w);
    const share = total > 0 ? latest / total : 0;
    scored.push({ work: w, share, latest });
  }
  scored.sort((a, b) => b.share - a.share);

  const papers: CitationVelocityEntry[] = [];
  for (let i = 0; i < Math.min(scored.length, TOP_N); i++) {
    const { work, share, latest } = scored[i];
    const id = work.id;
    if (!id) continue;
    const bare = id.startsWith('http') ? id.split('/').pop()! : id;
    papers.push({
      rank: i + 1,
      openalex_id: bare,
      title: work.display_name ?? '(no title)',
      publication_year: typeof work.publication_year === 'number' ? work.publication_year : minYear,
      cited_by_count: work.cited_by_count ?? 0,
      citations_latest_year: latest,
      citations_latest_year_share: parseFloat(share.toFixed(4)),
      doi: work.doi ?? null,
      venue: work.primary_location?.source?.display_name ?? null,
      landing_page_url: work.primary_location?.landing_page_url ?? null,
      first_three_authors: pickFirstThreeAuthors(work),
      primary_affiliation: pickPrimaryAffiliation(work),
    });
  }
  if (papers.length === 0) {
    notes.push('No papers met the minimum-citations threshold; check OpenAlex availability and concept filter.');
  }

  return {
    capturedAt: new Date().toISOString(),
    filter: {
      concept_id: AI_CONCEPT_ID,
      concept_name: 'Artificial intelligence',
      min_publication_year: minYear,
      min_citations: MIN_CITATIONS_TO_RANK,
    },
    papers,
    notes,
    source: {
      name: 'OpenAlex',
      url: 'https://api.openalex.org',
      license: 'CC0 1.0 Universal Public Domain Dedication. Commercial use and redistribution permitted; attribution appreciated.',
    },
  };
}

// ── Refresh + read API ─────────────────────────────────────────────

export interface RefreshVelocityResult {
  ok: boolean;
  count?: number;
  error?: string;
}

export async function refreshOpenAlexAICitationVelocity(env: Env): Promise<RefreshVelocityResult> {
  let works: OpenAlexWork[];
  try {
    works = await fetchRecentCitedAIWorks();
  } catch (err) {
    return { ok: false, error: (err as Error).message };
  }
  const snapshot = buildVelocitySnapshot(works);
  await env.TENSORFEED_CACHE.put(CURRENT_KEY, JSON.stringify(snapshot), {
    expirationTtl: 60 * 60 * 24 * 7,
  });
  return { ok: true, count: snapshot.papers.length };
}

export async function getOpenAlexAICitationVelocity(
  env: Env,
): Promise<CitationVelocitySnapshot | null> {
  const raw = await env.TENSORFEED_CACHE.get(CURRENT_KEY, 'text');
  if (!raw) return null;
  try {
    return JSON.parse(raw) as CitationVelocitySnapshot;
  } catch {
    return null;
  }
}
