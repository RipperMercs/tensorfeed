import { Env } from './types';

/**
 * Premium AI research velocity.
 *
 * Adds a velocity layer over the free /api/research/institutions/ai
 * leaderboard. The free tier ranks institutions by AI-tagged
 * publications in the last 365 days. This premium endpoint compares
 * each institution's recent output against its 365-day baseline
 * to surface acceleration / deceleration.
 *
 * Indexing-lag correction: OpenAlex under-indexes very recent works
 * (they keep landing for weeks after the publication date), so the
 * recent window EXCLUDES the most-recent 14 days and measures only a
 * completed, well-indexed sub-window (day -30 to day -14). Annualization
 * scales by the realized window length, not a naive 30, so the cohort is
 * not falsely biased toward "decelerating".
 *
 * Compute that justifies the gate:
 *   - velocity_ratio per institution: (recent * 365/realized_window) / last_365d.
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
 *   - Fetches a fresh group_by from OpenAlex over the completed recent
 *     sub-window (day -30 to day -14) on first call, caches in KV 24h TTL.
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
// OpenAlex heavily under-indexes recently published works: they keep
// trickling in for weeks after the publication date. Annualizing a window
// that includes those last couple of weeks systematically depresses the
// velocity ratio and falsely classifies the whole cohort as decelerating.
// So we exclude the most-recent lag buffer and measure only a completed,
// well-indexed sub-window, then annualize over its REALIZED length.
const RECENT_LAG_BUFFER_DAYS = 14;
// The realized, completed sub-window we actually measure (30 - 14 = 16 days),
// ending RECENT_LAG_BUFFER_DAYS before today. Annualization scales by this,
// not a naive 30, so the ratio is comparable to the 365-day baseline.
const REALIZED_WINDOW_DAYS = RECENT_WINDOW_DAYS - RECENT_LAG_BUFFER_DAYS;

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
  /** Nominal request window (30d), kept for cache-shape versioning. */
  windowDays: number;
  /** Realized completed sub-window actually measured (excludes the lag buffer). */
  realizedWindowDays: number;
  /** Days of the most-recent window excluded for OpenAlex indexing lag. */
  lagBufferDays: number;
  /** Inclusive publication-date bounds of the measured window (UTC, YYYY-MM-DD). */
  fromDate: string;
  toDate: string;
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
  /**
   * Count over the recent measured window. The window is the trailing 30 days
   * MINUS the most-recent lag buffer (a completed, well-indexed sub-window),
   * so this is not a literal last-30-calendar-day count; see recent_window_days
   * and the notes/disclaimer on the envelope.
   */
  ai_works_last_30d: number;
  /** Annualized projection: recent count scaled to a full year over the realized window length. The "are they on pace" projection. */
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
    'Velocity layer over the free /api/research/institutions/ai 365-day leaderboard. Joins the cached baseline with a fresh OpenAlex group_by query over a completed recent sub-window (trailing 30 days minus a 14-day indexing-lag buffer), annualized over the realized window length so directions are not biased by OpenAlex recent-work under-indexing. Per-institution velocity ratio, direction classification, and notable-movers extraction. Compute is the gate; the underlying CC0 catalog and group_by query are free upstream.',
};

export interface ResearchVelocityResult {
  ok: true;
  computed_at: string;
  baseline_captured_at: string;
  /** Realized completed window length actually measured and annualized (days). */
  recent_window_days: number;
  /** Days of the most-recent window excluded to avoid OpenAlex indexing-lag bias. */
  recent_window_lag_buffer_days: number;
  /** Inclusive publication-date bounds of the measured window (UTC, YYYY-MM-DD). */
  recent_window_from: string;
  recent_window_to: string;
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

async function fetchRecent30dCounts(): Promise<{ countsById: Record<string, number>; fromDate: string; toDate: string }> {
  // Lower bound is today-30d; upper bound is today minus the lag buffer, so the
  // measured window is a completed, well-indexed sub-window (e.g. day -30 to
  // day -14). OpenAlex from/to_publication_date filters are inclusive.
  const fromDate = isoDateOffsetDays(RECENT_WINDOW_DAYS);
  const toDate = isoDateOffsetDays(RECENT_LAG_BUFFER_DAYS);
  const url =
    `${OPENALEX_BASE}/works` +
    `?filter=concepts.id:${AI_CONCEPT_ID},from_publication_date:${fromDate},to_publication_date:${toDate}` +
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
  return { countsById: out, fromDate, toDate };
}

async function getRecent30dCached(env: Env): Promise<RecentSnapshot> {
  const cached = (await env.TENSORFEED_CACHE.get(RECENT_30D_CACHE_KEY, 'json')) as RecentSnapshot | null;
  // Require the realized-window field so pre-lag-fix snapshots are discarded
  // and refetched against the lag-corrected window.
  if (cached && cached.windowDays === RECENT_WINDOW_DAYS && cached.realizedWindowDays === REALIZED_WINDOW_DAYS) {
    return cached;
  }
  const fetched = await fetchRecent30dCounts();
  const snapshot: RecentSnapshot = {
    fetchedAt: new Date().toISOString(),
    windowDays: RECENT_WINDOW_DAYS,
    realizedWindowDays: REALIZED_WINDOW_DAYS,
    lagBufferDays: RECENT_LAG_BUFFER_DAYS,
    fromDate: fetched.fromDate,
    toDate: fetched.toDate,
    countsById: fetched.countsById,
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
  realizedWindowDays: number = REALIZED_WINDOW_DAYS,
): InstitutionVelocityEntry[] {
  // Annualize over the REALIZED (completed, lag-excluded) window length, not a
  // naive 30. Guard against a zero/negative window so we never divide by zero.
  const windowDays = realizedWindowDays > 0 ? realizedWindowDays : REALIZED_WINDOW_DAYS;
  const entries: InstitutionVelocityEntry[] = baseline.map(b => {
    const recent = countsById[b.openalex_id] ?? 0;
    const annualized = recent * (365 / windowDays);
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

  const realizedWindowDays = recent.realizedWindowDays && recent.realizedWindowDays > 0
    ? recent.realizedWindowDays
    : REALIZED_WINDOW_DAYS;
  const lagBufferDays = typeof recent.lagBufferDays === 'number' ? recent.lagBufferDays : RECENT_LAG_BUFFER_DAYS;
  const entries = buildVelocityEntries(baseline.institutions, recent.countsById, realizedWindowDays);

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
  notes.push(
    `Recent window is a completed ${realizedWindowDays}-day sub-window (publication dates ${recent.fromDate} to ${recent.toDate}). The most-recent ${lagBufferDays} days are excluded because OpenAlex under-indexes very recent works (they keep landing for weeks after publication); including them would bias the whole cohort toward "decelerating". Counts are annualized over the realized window length, so velocity_ratio is comparable to the 365-day baseline.`,
  );
  if (totals.insufficient_data > 0) {
    notes.push(`${totals.insufficient_data} institution(s) had a zero or missing baseline; velocity could not be computed.`);
  }

  return {
    ok: true,
    computed_at: new Date().toISOString(),
    baseline_captured_at: baseline.capturedAt,
    recent_window_days: realizedWindowDays,
    recent_window_lag_buffer_days: lagBufferDays,
    recent_window_from: recent.fromDate,
    recent_window_to: recent.toDate,
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
