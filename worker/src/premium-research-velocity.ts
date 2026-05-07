import { Env } from './types';

/**
 * Premium AI research velocity.
 *
 * Adds a velocity layer over the free /api/research/institutions/ai
 * leaderboard. The free tier ranks institutions by AI-tagged
 * publications in the last 365 days. This premium endpoint compares
 * each institution's last-30-day output against its 365-day baseline
 * to surface acceleration / deceleration.
 *
 * Compute that justifies the gate:
 *   - velocity_ratio per institution: (last_30d * 365/30) / last_365d.
 *     A ratio above 1.2 means the institution is publishing faster
 *     than its annual average; below 0.8 means slower.
 *   - Direction classification (accelerating / steady / decelerating /
 *     insufficient_data).
 *   - Notable-movers extraction (top 5 each direction).
 *   - Aggregates by country and by type.
 *
 * Architecture:
 *   - Reads the existing free /api/research/institutions/ai snapshot
 *     for the 365-day baseline + display names + country + type.
 *   - Fetches a fresh 30-day group_by from OpenAlex on first call,
 *     caches in KV with 24h TTL.
 *   - One OpenAlex API call per cache miss, no auth required.
 *
 * Cost: 1 credit per call.
 */

const OPENALEX_BASE = 'https://api.openalex.org';
const AI_CONCEPT_ID = 'C154945302';
const POLITE_UA = 'tensorfeed-research/1.0 (mailto:evan@tensorfeed.ai; +https://tensorfeed.ai)';
const FETCH_TIMEOUT_MS = 15_000;

const BASELINE_KEY = 'openalex-ai-institutions:current';
const RECENT_30D_CACHE_KEY = 'openalex-ai-institutions:recent-30d';
const CACHE_TTL_SECONDS = 24 * 60 * 60;
const RECENT_WINDOW_DAYS = 30;

// ── Source shapes ──────────────────────────────────────────────────

interface BaselineInstitution {
  rank: number;
  openalex_id: string;
  display_name: string;
  country_code: string | null;
  type: string | null;
  ai_works_last_year: number;
  total_works_count: number | null;
}

interface BaselineSnapshot {
  capturedAt: string;
  institutions: BaselineInstitution[];
}

interface OpenAlexGroupByResult {
  group_by?: Array<{ key?: string; count?: number }>;
}

interface RecentSnapshot {
  fetchedAt: string;
  windowDays: number;
  countsById: Record<string, number>;
}

// ── Public types ────────────────────────────────────────────────────

export type VelocityDirection = 'accelerating' | 'steady' | 'decelerating' | 'insufficient_data';

export interface InstitutionVelocityEntry {
  baseline_rank: number;
  openalex_id: string;
  display_name: string;
  country_code: string | null;
  type: string | null;
  ai_works_last_year: number;
  ai_works_last_30d: number;
  /** Annualized 30-day count: (last_30d * 12). The "are they on pace" projection. */
  annualized_30d: number;
  /** velocity_ratio = annualized_30d / last_year. */
  velocity_ratio: number | null;
  direction: VelocityDirection;
  rank_by_velocity: number;
}

export interface ResearchVelocityAttribution {
  source: string;
  source_url: string;
  license: string;
  derivation: string;
}

export const RESEARCH_VELOCITY_ATTRIBUTION: ResearchVelocityAttribution = {
  source: 'OpenAlex',
  source_url: 'https://openalex.org',
  license: 'CC0 1.0 Universal (Public Domain Dedication)',
  derivation:
    'Velocity layer over the free /api/research/institutions/ai 365-day leaderboard. Joins the cached baseline with a fresh OpenAlex group_by query over the trailing 30 days. Per-institution velocity ratio, direction classification, and notable-movers extraction. Compute is the gate; the underlying CC0 catalog and group_by query are free upstream.',
};

export interface ResearchVelocityResult {
  ok: true;
  computed_at: string;
  baseline_captured_at: string;
  recent_window_days: number;
  total_institutions: number;
  totals_by_direction: {
    accelerating: number;
    steady: number;
    decelerating: number;
    insufficient_data: number;
  };
  by_country: Record<string, { accelerating: number; steady: number; decelerating: number; insufficient_data: number }>;
  by_type: Record<string, { accelerating: number; steady: number; decelerating: number; insufficient_data: number }>;
  notable_movers: {
    top_accelerating: InstitutionVelocityEntry[];
    top_decelerating: InstitutionVelocityEntry[];
  };
  institutions: InstitutionVelocityEntry[];
  attribution: ResearchVelocityAttribution;
  notes: string[];
}

export interface ResearchVelocityError {
  ok: false;
  error: string;
  hint?: string;
}

// ── Helpers ─────────────────────────────────────────────────────────

function isoDateOffsetDays(days: number): string {
  const d = new Date();
  d.setUTCDate(d.getUTCDate() - days);
  return d.toISOString().slice(0, 10);
}

function round4(n: number): number {
  return Math.round(n * 10000) / 10000;
}

const ACCELERATE_THRESHOLD = 1.2;
const DECELERATE_THRESHOLD = 0.8;

export function classifyVelocity(ratio: number | null): VelocityDirection {
  if (ratio === null) return 'insufficient_data';
  if (ratio > ACCELERATE_THRESHOLD) return 'accelerating';
  if (ratio < DECELERATE_THRESHOLD) return 'decelerating';
  return 'steady';
}

export function computeVelocityRatio(annualized30d: number, last_year: number): number | null {
  if (last_year <= 0) return null;
  return round4(annualized30d / last_year);
}

// ── Recent-30d fetcher ─────────────────────────────────────────────

async function fetchRecent30dCounts(): Promise<Record<string, number>> {
  const fromDate = isoDateOffsetDays(RECENT_WINDOW_DAYS);
  const url =
    `${OPENALEX_BASE}/works` +
    `?filter=concepts.id:${AI_CONCEPT_ID},from_publication_date:${fromDate}` +
    `&group_by=authorships.institutions.id` +
    `&per_page=200`;

  const res = await fetch(url, {
    headers: { 'User-Agent': POLITE_UA, Accept: 'application/json' },
    signal: AbortSignal.timeout(FETCH_TIMEOUT_MS),
    cf: { cacheTtl: 60 } as RequestInitCfProperties,
  });
  if (!res.ok) {
    throw new Error(`openalex 30d group_by failed: HTTP ${res.status}`);
  }
  const data = (await res.json()) as OpenAlexGroupByResult;
  const groups = Array.isArray(data.group_by) ? data.group_by : [];

  const out: Record<string, number> = {};
  for (const g of groups) {
    if (!g.key || typeof g.count !== 'number') continue;
    const id = g.key.startsWith('http') ? g.key.split('/').pop()! : g.key;
    if (!id || !id.startsWith('I')) continue;
    out[id] = g.count;
  }
  return out;
}

async function getRecent30dCached(env: Env): Promise<RecentSnapshot> {
  const cached = (await env.TENSORFEED_CACHE.get(RECENT_30D_CACHE_KEY, 'json')) as RecentSnapshot | null;
  if (cached && cached.windowDays === RECENT_WINDOW_DAYS) {
    return cached;
  }
  const counts = await fetchRecent30dCounts();
  const snapshot: RecentSnapshot = {
    fetchedAt: new Date().toISOString(),
    windowDays: RECENT_WINDOW_DAYS,
    countsById: counts,
  };
  await env.TENSORFEED_CACHE.put(RECENT_30D_CACHE_KEY, JSON.stringify(snapshot), {
    expirationTtl: CACHE_TTL_SECONDS,
  });
  return snapshot;
}

// ── Builder ─────────────────────────────────────────────────────────

export function buildVelocityEntries(
  baseline: BaselineInstitution[],
  countsById: Record<string, number>,
): InstitutionVelocityEntry[] {
  const entries: InstitutionVelocityEntry[] = baseline.map(b => {
    const recent = countsById[b.openalex_id] ?? 0;
    const annualized = recent * (365 / RECENT_WINDOW_DAYS);
    const ratio = computeVelocityRatio(annualized, b.ai_works_last_year);
    return {
      baseline_rank: b.rank,
      openalex_id: b.openalex_id,
      display_name: b.display_name,
      country_code: b.country_code,
      type: b.type,
      ai_works_last_year: b.ai_works_last_year,
      ai_works_last_30d: recent,
      annualized_30d: Math.round(annualized),
      velocity_ratio: ratio,
      direction: classifyVelocity(ratio),
      rank_by_velocity: 0,
    };
  });

  entries.sort((a, b) => (b.velocity_ratio ?? -Infinity) - (a.velocity_ratio ?? -Infinity));
  entries.forEach((e, i) => { e.rank_by_velocity = i + 1; });
  return entries;
}

// ── Top-level entry ────────────────────────────────────────────────

export async function computeResearchVelocity(env: Env): Promise<ResearchVelocityResult | ResearchVelocityError> {
  const baseline = (await env.TENSORFEED_CACHE.get(BASELINE_KEY, 'json')) as BaselineSnapshot | null;
  if (!baseline || !Array.isArray(baseline.institutions) || baseline.institutions.length === 0) {
    return {
      ok: false,
      error: 'no_baseline_yet',
      hint:
        'OpenAlex AI institutions baseline (365-day snapshot) refreshes daily at 04:00 UTC. After deploy the first snapshot may take up to 24 hours; this endpoint joins it with a fresh 30-day fetch.',
    };
  }

  let recent: RecentSnapshot;
  try {
    recent = await getRecent30dCached(env);
  } catch (err) {
    return {
      ok: false,
      error: 'recent_fetch_failed',
      hint: (err as Error).message,
    };
  }

  const entries = buildVelocityEntries(baseline.institutions, recent.countsById);

  const totals = { accelerating: 0, steady: 0, decelerating: 0, insufficient_data: 0 };
  for (const e of entries) totals[e.direction] += 1;

  const byCountry: Record<string, { accelerating: number; steady: number; decelerating: number; insufficient_data: number }> = {};
  const byType: Record<string, { accelerating: number; steady: number; decelerating: number; insufficient_data: number }> = {};

  for (const e of entries) {
    const cc = e.country_code ?? 'UNKNOWN';
    if (!byCountry[cc]) byCountry[cc] = { accelerating: 0, steady: 0, decelerating: 0, insufficient_data: 0 };
    byCountry[cc][e.direction] += 1;

    const tk = e.type ?? 'unknown';
    if (!byType[tk]) byType[tk] = { accelerating: 0, steady: 0, decelerating: 0, insufficient_data: 0 };
    byType[tk][e.direction] += 1;
  }

  const accelerating = entries.filter(e => e.direction === 'accelerating');
  const decelerating = entries.filter(e => e.direction === 'decelerating');
  const decelSorted = decelerating.slice().sort((a, b) => (a.velocity_ratio ?? Infinity) - (b.velocity_ratio ?? Infinity));

  const notes: string[] = [];
  if (totals.insufficient_data > 0) {
    notes.push(`${totals.insufficient_data} institution(s) had a zero or missing baseline; velocity could not be computed.`);
  }

  return {
    ok: true,
    computed_at: new Date().toISOString(),
    baseline_captured_at: baseline.capturedAt,
    recent_window_days: RECENT_WINDOW_DAYS,
    total_institutions: entries.length,
    totals_by_direction: totals,
    by_country: byCountry,
    by_type: byType,
    notable_movers: {
      top_accelerating: accelerating.slice(0, 5),
      top_decelerating: decelSorted.slice(0, 5),
    },
    institutions: entries,
    attribution: RESEARCH_VELOCITY_ATTRIBUTION,
    notes,
  };
}
