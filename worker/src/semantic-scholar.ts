import type { Env } from './types';

/**
 * Semantic Scholar enrichment for the citation-velocity feed (Track A2 source
 * 4, an enrichment rather than a new surface).
 *
 * Reads the existing OpenAlex citation-velocity snapshot and, for every paper
 * that has a DOI, batch-looks it up in the Semantic Scholar Graph API (one
 * call, unauthenticated) to attach a second-source cross-check: S2's total
 * citation count, its influential-citation subset, fields of study, a one-line
 * tldr, and the S2 link. This validates the OpenAlex ranking against a second
 * source and adds a quality signal (influential citations) plus a tldr.
 *
 * Runs as its own daily task AFTER the velocity refresh. S2 is a separate host
 * (not subject to the OpenAlex Cloudflare-egress throttle), so the enrichment
 * succeeds and stays fresh even when the OpenAlex velocity refresh is throttled
 * and serving last-known-good. Writes the snapshot back in place.
 *
 * Source posture: S2 metadata under ODC-BY; attributed via the source field
 * and the per-paper s2_url. The tldr is S2's own one-line summary, clipped.
 */

const S2_BASE = 'https://api.semanticscholar.org/graph/v1';
const S2_FIELDS = 'externalIds,influentialCitationCount,citationCount,fieldsOfStudy,tldr,url';
const VELOCITY_KEY = 'openalex-ai-citation-velocity:current';
const BATCH_CAP = 200;
const TLDR_CLIP = 280;
const FETCH_TIMEOUT_MS = 20_000;
const UA = 'tensorfeed-research/1.0 (mailto:evan@tensorfeed.ai; +https://tensorfeed.ai)';

interface S2Paper {
  externalIds?: { DOI?: string } | null;
  influentialCitationCount?: number;
  citationCount?: number;
  fieldsOfStudy?: string[] | null;
  tldr?: { text?: string } | null;
  url?: string;
}

export interface S2Enrichment {
  influential_citation_count: number | null;
  s2_citation_count: number | null;
  fields_of_study: string[];
  tldr: string | null;
  s2_url: string | null;
}

// A loose view of the velocity snapshot (owned by openalex-citation-velocity.ts);
// kept generic here so that module stays untouched. We only add the s2 field.
interface VelocityPaperLike {
  doi?: string | null;
  cited_by_count?: number;
  s2?: S2Enrichment;
  [k: string]: unknown;
}
interface VelocitySnapshotLike {
  papers?: VelocityPaperLike[];
  notes?: string[];
  s2_enriched_at?: string;
  [k: string]: unknown;
}

function clip(s: string, n: number): string {
  return s.length <= n ? s : `${s.slice(0, n - 3).trimEnd()}...`;
}

/** Bare DOI for the S2 `DOI:` id form. OpenAlex returns full doi.org URLs. */
export function normDoi(doi: string | null | undefined): string {
  if (typeof doi !== 'string') return '';
  return doi.trim().replace(/^https?:\/\/(dx\.)?doi\.org\//i, '');
}

/** Pure: zip S2 batch results (same order as the input DOIs, null if unfound) into a doi->enrichment map. */
export function mergeEnrichments(dois: string[], results: (S2Paper | null)[]): Record<string, S2Enrichment> {
  const map: Record<string, S2Enrichment> = {};
  for (let i = 0; i < dois.length; i++) {
    const r = results[i];
    if (!r) continue;
    map[dois[i].toLowerCase()] = {
      influential_citation_count: typeof r.influentialCitationCount === 'number' ? r.influentialCitationCount : null,
      s2_citation_count: typeof r.citationCount === 'number' ? r.citationCount : null,
      fields_of_study: Array.isArray(r.fieldsOfStudy) ? r.fieldsOfStudy : [],
      tldr: r.tldr?.text ? clip(r.tldr.text, TLDR_CLIP) : null,
      s2_url: typeof r.url === 'string' ? r.url : null,
    };
  }
  return map;
}

/** Pure: attach enrichments to papers by DOI, returning the count enriched. */
export function applyEnrichments(papers: VelocityPaperLike[], map: Record<string, S2Enrichment>): number {
  let n = 0;
  for (const p of papers) {
    const doi = normDoi(p.doi).toLowerCase();
    if (doi && map[doi]) {
      p.s2 = map[doi];
      n++;
    }
  }
  return n;
}

async function fetchS2Batch(dois: string[]): Promise<(S2Paper | null)[]> {
  const controller = new AbortController();
  const id = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS);
  try {
    const res = await fetch(`${S2_BASE}/paper/batch?fields=${S2_FIELDS}`, {
      method: 'POST',
      headers: { 'User-Agent': UA, 'Content-Type': 'application/json', Accept: 'application/json' },
      body: JSON.stringify({ ids: dois.map((d) => `DOI:${d}`) }),
      signal: controller.signal,
    });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const data = (await res.json()) as (S2Paper | null)[];
    return Array.isArray(data) ? data : [];
  } finally {
    clearTimeout(id);
  }
}

export interface EnrichResult {
  ok: boolean;
  enriched?: number;
  error?: string;
}

export async function enrichVelocityWithS2(env: Env): Promise<EnrichResult> {
  const raw = await env.TENSORFEED_CACHE.get(VELOCITY_KEY, 'text');
  if (!raw) {
    console.warn('[semantic-scholar] no velocity snapshot to enrich (seed it first)');
    return { ok: false, error: 'no_velocity_snapshot' };
  }
  let snap: VelocitySnapshotLike;
  try {
    snap = JSON.parse(raw) as VelocitySnapshotLike;
  } catch {
    return { ok: false, error: 'velocity_snapshot_parse_failed' };
  }
  const papers = Array.isArray(snap.papers) ? snap.papers : [];
  const dois = papers.map((p) => normDoi(p.doi)).filter(Boolean).slice(0, BATCH_CAP);
  if (dois.length === 0) {
    console.warn('[semantic-scholar] velocity snapshot has no DOIs to enrich');
    return { ok: false, error: 'no_dois' };
  }

  let results: (S2Paper | null)[];
  try {
    results = await fetchS2Batch(dois);
  } catch (err) {
    console.warn(`[semantic-scholar] batch lookup failed, snapshot NOT modified: ${(err as Error).message}`);
    return { ok: false, error: `s2_batch: ${(err as Error).message}` };
  }

  const map = mergeEnrichments(dois, results);
  const enriched = applyEnrichments(papers, map);
  if (enriched === 0) {
    console.warn('[semantic-scholar] 0 papers enriched; snapshot NOT modified');
    return { ok: false, error: 'zero_enriched' };
  }

  const note = `Citation counts cross-checked against Semantic Scholar: each paper carries s2 (influential_citation_count, s2_citation_count, tldr, fields_of_study, s2_url). S2 metadata is ODC-BY. Enriched ${enriched} of ${papers.length} papers (those with a DOI).`;
  snap.notes = [...(snap.notes ?? []).filter((n) => !n.startsWith('Citation counts cross-checked')), note];
  snap.s2_enriched_at = new Date().toISOString();
  await env.TENSORFEED_CACHE.put(VELOCITY_KEY, JSON.stringify(snap));
  return { ok: true, enriched };
}
