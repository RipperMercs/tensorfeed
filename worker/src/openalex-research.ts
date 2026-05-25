import { Env } from './types';
import { fetchOpenAlexWithRetry } from './openalex-fetch';

/**
 * AI/ML academic research metrics from OpenAlex.
 *
 * OpenAlex (openalex.org) is an open scholarly index covering 250M+
 * works, 20M+ authors, 100k+ institutions. Data released under CC0
 * (public domain) per openalex-docs/license.md and confirmed in their
 * FAQ. Commercial use and redistribution explicitly permitted;
 * attribution appreciated but not required.
 *
 * V1 surface: top institutions ranked by AI publications in the
 * last 12 months. Net-new value, no overlap with the existing
 * /api/papers/* endpoints (which cover Semantic Scholar + arXiv
 * paper-level data, not institution-level aggregates).
 *
 * Architecture: two API calls per cron tick.
 *   1. /works?filter=concepts.id:C154945302,from_publication_date:...&group_by=authorships.institutions.id
 *      Returns groups with institution OpenAlex IDs and work counts.
 *   2. /institutions?filter=ids.openalex:<top-N>&select=id,display_name,country_code,type,works_count
 *      Enriches the top entries with display names and country.
 *
 * V2 candidates (not in V1): authors leaderboard, concept hierarchy,
 * sources/venues ranked by AI publication volume.
 */

const OPENALEX_BASE = 'https://api.openalex.org';
// "Artificial intelligence" concept in OpenAlex's concept hierarchy.
// Captures the broad AI body of work (machine learning, NLP, vision,
// etc. all roll up under this).
const AI_CONCEPT_ID = 'C154945302';
// Polite-pool email signal in the User-Agent. OpenAlex docs recommend
// including a contact so they can reach out if something goes wrong;
// not required, no auth, just goodwill that gets faster responses.
const POLITE_UA = 'tensorfeed-research/1.0 (mailto:evan@tensorfeed.ai; +https://tensorfeed.ai)';

const CURRENT_KEY = 'openalex-ai-institutions:current';
const META_KEY = 'openalex-ai-institutions:meta';
const TOP_N = 100;

// === Date helpers ===================================================

function isoDateOffsetDays(days: number): string {
  const d = new Date();
  d.setUTCDate(d.getUTCDate() - days);
  return d.toISOString().slice(0, 10);
}

// === Fetcher ========================================================

interface OpenAlexGroupByResult {
  meta?: { count?: number };
  group_by?: Array<{ key?: string; key_display_name?: string; count?: number }>;
}

interface OpenAlexInstitution {
  id?: string;
  display_name?: string;
  country_code?: string | null;
  type?: string | null;
  works_count?: number;
}

interface OpenAlexInstitutionsList {
  results?: OpenAlexInstitution[];
}

interface InstitutionAggregate {
  openalex_id: string;
  ai_works_last_year: number;
}

async function fetchInstitutionAggregate(): Promise<InstitutionAggregate[]> {
  const fromDate = isoDateOffsetDays(365);
  const url =
    `${OPENALEX_BASE}/works` +
    `?filter=concepts.id:${AI_CONCEPT_ID},from_publication_date:${fromDate}` +
    `&group_by=authorships.institutions.id` +
    `&per_page=200` +
    `&mailto=evan@tensorfeed.ai`;

  const res = await fetchOpenAlexWithRetry(url, {
    'User-Agent': POLITE_UA,
    Accept: 'application/json',
  });
  if (!res.ok) {
    throw new Error(`openalex group_by failed: HTTP ${res.status}`);
  }
  const data = (await res.json()) as OpenAlexGroupByResult;
  const groups = Array.isArray(data.group_by) ? data.group_by : [];

  const out: InstitutionAggregate[] = [];
  for (const g of groups) {
    if (!g.key || typeof g.count !== 'number') continue;
    // The group_by key for institutions can come back as a full URL
    // (https://openalex.org/I123) or a bare id (I123). Normalize to bare.
    const id = g.key.startsWith('http') ? g.key.split('/').pop()! : g.key;
    if (!id || !id.startsWith('I')) continue;
    out.push({ openalex_id: id, ai_works_last_year: g.count });
  }
  out.sort((a, b) => b.ai_works_last_year - a.ai_works_last_year);
  return out.slice(0, TOP_N);
}

async function fetchInstitutionDetails(ids: string[]): Promise<Map<string, OpenAlexInstitution>> {
  if (ids.length === 0) return new Map();
  // OpenAlex supports ids.openalex:id1|id2|id3 (pipe-separated OR)
  const filterValue = ids.map(id => id).join('|');
  const url =
    `${OPENALEX_BASE}/institutions` +
    `?filter=ids.openalex:${encodeURIComponent(filterValue)}` +
    `&select=id,display_name,country_code,type,works_count` +
    `&per_page=200` +
    `&mailto=evan@tensorfeed.ai`;

  const res = await fetchOpenAlexWithRetry(url, {
    'User-Agent': POLITE_UA,
    Accept: 'application/json',
  });
  if (!res.ok) {
    throw new Error(`openalex institutions failed: HTTP ${res.status}`);
  }
  const data = (await res.json()) as OpenAlexInstitutionsList;
  const out = new Map<string, OpenAlexInstitution>();
  for (const inst of data.results ?? []) {
    if (!inst.id) continue;
    const bare = inst.id.startsWith('http') ? inst.id.split('/').pop()! : inst.id;
    out.set(bare, inst);
  }
  return out;
}

// === Snapshot =======================================================

export interface AIInstitutionEntry {
  rank: number;
  openalex_id: string;
  display_name: string;
  country_code: string | null;
  type: string | null;          // e.g. 'education', 'company', 'government'
  ai_works_last_year: number;
  total_works_count: number | null;
}

export interface AIInstitutionsSnapshot {
  capturedAt: string;
  window_days: number;
  concept: { id: string; name: string };
  institutions: AIInstitutionEntry[];
  notes: string[];
}

export function buildSnapshot(
  aggregates: InstitutionAggregate[],
  details: Map<string, OpenAlexInstitution>,
): AIInstitutionsSnapshot {
  const notes: string[] = [];
  const rows: AIInstitutionEntry[] = [];
  let missing = 0;

  for (let i = 0; i < aggregates.length; i++) {
    const a = aggregates[i];
    const d = details.get(a.openalex_id);
    if (!d) {
      missing += 1;
      continue;
    }
    rows.push({
      rank: i + 1,
      openalex_id: a.openalex_id,
      display_name: d.display_name ?? a.openalex_id,
      country_code: d.country_code ?? null,
      type: d.type ?? null,
      ai_works_last_year: a.ai_works_last_year,
      total_works_count: typeof d.works_count === 'number' ? d.works_count : null,
    });
  }
  if (missing > 0) {
    notes.push(`${missing} institution(s) had aggregate counts but no enrichment lookup; omitted from output`);
  }

  return {
    capturedAt: new Date().toISOString(),
    window_days: 365,
    concept: { id: AI_CONCEPT_ID, name: 'Artificial intelligence' },
    institutions: rows,
    notes,
  };
}

// === Cron entry =====================================================

export interface RefreshResult {
  ok: boolean;
  count?: number;
  error?: string;
}

export async function refreshOpenAlexAIInstitutions(env: Env): Promise<RefreshResult> {
  let aggregates: InstitutionAggregate[];
  try {
    aggregates = await fetchInstitutionAggregate();
  } catch (err) {
    return { ok: false, error: `aggregate: ${(err as Error).message}` };
  }
  if (aggregates.length === 0) {
    return { ok: false, error: 'aggregate returned 0 groups' };
  }

  let details: Map<string, OpenAlexInstitution>;
  try {
    details = await fetchInstitutionDetails(aggregates.map(a => a.openalex_id));
  } catch (err) {
    return { ok: false, error: `details: ${(err as Error).message}` };
  }

  const snapshot = buildSnapshot(aggregates, details);
  await env.TENSORFEED_CACHE.put(CURRENT_KEY, JSON.stringify(snapshot));
  await env.TENSORFEED_CACHE.put(
    META_KEY,
    JSON.stringify({
      capturedAt: snapshot.capturedAt,
      count: snapshot.institutions.length,
      concept_id: AI_CONCEPT_ID,
    }),
  );

  return { ok: true, count: snapshot.institutions.length };
}

// === Read API =======================================================

export interface OpenAlexAttribution {
  source: string;
  source_url: string;
  license: string;
  license_url: string;
  notes: string;
}

export const OPENALEX_ATTRIBUTION: OpenAlexAttribution = {
  source: 'OpenAlex',
  source_url: 'https://openalex.org',
  license: 'CC0 1.0 Universal (Public Domain Dedication)',
  license_url: 'https://creativecommons.org/publicdomain/zero/1.0/',
  notes:
    'OpenAlex data is released under CC0; attribution is appreciated but not required. The TensorFeed snapshot is a derived aggregate (top institutions by AI-tagged publications in the last 365 days, OpenAlex concept C154945302) of the underlying public-domain dataset.',
};

export interface AIInstitutionsResponse {
  ok: true;
  capturedAt: string;
  window_days: number;
  concept: { id: string; name: string };
  count: number;
  filters: { country?: string; type?: string };
  institutions: AIInstitutionEntry[];
  attribution: OpenAlexAttribution;
  notes: string[];
}

export interface AIInstitutionsOptions {
  country?: string;       // ISO-2 country code, case-insensitive
  type?: string;          // e.g. 'education', 'company', 'government'
  limit?: number;
}

export async function readAIInstitutions(
  env: Env,
  options: AIInstitutionsOptions = {},
): Promise<AIInstitutionsResponse | null> {
  const snapshot = (await env.TENSORFEED_CACHE.get(
    CURRENT_KEY,
    'json',
  )) as AIInstitutionsSnapshot | null;
  if (!snapshot) return null;

  const limit = Math.max(1, Math.min(options.limit ?? snapshot.institutions.length, 200));
  const country = options.country?.toUpperCase().trim();
  const type = options.type?.toLowerCase().trim();

  let rows = snapshot.institutions;
  if (country) rows = rows.filter(r => (r.country_code ?? '').toUpperCase() === country);
  if (type) rows = rows.filter(r => (r.type ?? '').toLowerCase() === type);

  return {
    ok: true,
    capturedAt: snapshot.capturedAt,
    window_days: snapshot.window_days,
    concept: snapshot.concept,
    count: Math.min(rows.length, limit),
    filters: {
      ...(options.country ? { country: options.country } : {}),
      ...(options.type ? { type: options.type } : {}),
    },
    institutions: rows.slice(0, limit),
    attribution: OPENALEX_ATTRIBUTION,
    notes: snapshot.notes,
  };
}
