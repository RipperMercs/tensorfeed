import { Env } from './types';

/**
 * Premium economy series history.
 *
 * Full historical depth for any BLS or FRED series, on-demand fetched
 * from upstream (BLS V1 GET / FRED observations endpoint) and
 * normalized into the canonical shape used by /api/economy/*.
 *
 * Compute on top of the raw history that justifies the gate:
 *   - 3-month and 12-month moving averages (when enough data)
 *   - YoY paired series (each observation with its same-month-last-year
 *     delta when computable)
 *   - min / max observation identification with timestamps
 *   - 3-observation trend direction (up / down / flat)
 *
 * Free /api/economy/bls/indicators caps at 24 observations per series.
 * Free /api/economy/fred/indicators caps at 90. This endpoint serves
 * the full available archive.
 *
 * Cost: 1 credit per call. KV-cached at 6h TTL to amortize upstream
 * fetches across many agent calls.
 */

const BLS_V1_URL = 'https://api.bls.gov/publicAPI/v1/timeseries/data/';
const FRED_OBS_URL = 'https://api.stlouisfed.org/fred/series/observations';
const CACHE_PREFIX = 'premium-econ-history:';
const CACHE_TTL_SECONDS = 6 * 60 * 60;
const FETCH_TIMEOUT_MS = 12_000;

// ── Types ───────────────────────────────────────────────────────────

export type Source = 'bls' | 'fred';

export interface NormalizedObservation {
  date: string;          // YYYY-MM-DD (FRED native; BLS month -> YYYY-MM-01)
  period_label: string;  // human-readable
  value: number;
  yoy_pct: number | null;
  ma_3: number | null;
  ma_12: number | null;
}

export interface SeriesHistoryAttribution {
  source: string;
  source_url: string;
  license: string;
  derivation: string;
}

export interface SeriesHistoryResult {
  ok: true;
  source: Source;
  series_id: string;
  computed_at: string;
  observations_count: number;
  date_range: { from: string; to: string };
  observations: NormalizedObservation[];
  summary: {
    latest: NormalizedObservation | null;
    min: NormalizedObservation | null;
    max: NormalizedObservation | null;
    trend_3obs: 'up' | 'down' | 'flat' | 'unknown';
  };
  attribution: SeriesHistoryAttribution;
}

export interface SeriesHistoryError {
  ok: false;
  error: string;
  hint?: string;
}

// ── Upstream shapes ────────────────────────────────────────────────

interface BLSV1Response {
  status?: string;
  message?: string[];
  Results?: {
    series?: Array<{
      seriesID?: string;
      data?: Array<{
        year?: string;
        period?: string;
        periodName?: string;
        value?: string;
      }>;
    }>;
  };
}

interface FREDObsResponse {
  observations?: Array<{
    date?: string;
    value?: string;
  }>;
}

// ── Fetchers ────────────────────────────────────────────────────────

async function fetchBLSSeries(seriesId: string): Promise<NormalizedObservation[]> {
  const url = `${BLS_V1_URL}${encodeURIComponent(seriesId)}`;
  const res = await fetch(url, {
    headers: {
      'User-Agent': 'tensorfeed-econ-history/1.0 (mailto:evan@tensorfeed.ai; +https://tensorfeed.ai)',
      'Accept': 'application/json',
    },
    signal: AbortSignal.timeout(FETCH_TIMEOUT_MS),
  });
  if (!res.ok) throw new Error(`BLS HTTP ${res.status}`);
  const data = (await res.json()) as BLSV1Response;
  if (data.status !== 'REQUEST_SUCCEEDED') {
    throw new Error(`BLS status=${data.status} (${(data.message ?? []).join('; ')})`);
  }
  const series = data.Results?.series?.[0];
  if (!series) throw new Error('empty BLS response');
  const raw = series.data ?? [];

  const out: NormalizedObservation[] = [];
  for (const r of raw) {
    if (!r.year || !r.period || !r.value) continue;
    if (!r.period.startsWith('M')) continue;
    const month = parseInt(r.period.slice(1), 10);
    if (!Number.isFinite(month) || month < 1 || month > 12) continue;
    const year = parseInt(r.year, 10);
    if (!Number.isFinite(year)) continue;
    const value = parseFloat(r.value);
    if (!Number.isFinite(value)) continue;
    const monthShort = r.periodName ? r.periodName.slice(0, 3) : '';
    out.push({
      date: `${r.year}-${String(month).padStart(2, '0')}-01`,
      period_label: monthShort ? `${monthShort} ${r.year}` : `${r.year}-${String(month).padStart(2, '0')}`,
      value,
      yoy_pct: null,
      ma_3: null,
      ma_12: null,
    });
  }
  out.sort((a, b) => a.date.localeCompare(b.date));
  return out;
}

async function fetchFREDSeries(seriesId: string, apiKey: string): Promise<NormalizedObservation[]> {
  const params = new URLSearchParams({
    series_id: seriesId,
    api_key: apiKey,
    file_type: 'json',
    sort_order: 'asc',
  });
  const url = `${FRED_OBS_URL}?${params.toString()}`;
  const res = await fetch(url, {
    headers: {
      'User-Agent': 'tensorfeed-econ-history/1.0 (mailto:evan@tensorfeed.ai; +https://tensorfeed.ai)',
      'Accept': 'application/json',
    },
    signal: AbortSignal.timeout(FETCH_TIMEOUT_MS),
  });
  if (!res.ok) throw new Error(`FRED HTTP ${res.status}`);
  const data = (await res.json()) as FREDObsResponse;
  const raw = data.observations ?? [];

  const out: NormalizedObservation[] = [];
  for (const r of raw) {
    if (!r.date || !r.value) continue;
    if (r.value === '.' || r.value === '' || r.value === 'NA') continue;
    const value = parseFloat(r.value);
    if (!Number.isFinite(value)) continue;
    out.push({
      date: r.date,
      period_label: r.date,
      value,
      yoy_pct: null,
      ma_3: null,
      ma_12: null,
    });
  }
  return out;
}

// ── Compute layer ───────────────────────────────────────────────────

function round4(n: number): number {
  return Math.round(n * 10000) / 10000;
}

/**
 * Compute YoY pairing per observation. For each obs, find the
 * observation closest to (date - 1 year) on-or-before. Skip if not
 * found in the available history.
 */
export function computeYoYSeries(obs: NormalizedObservation[]): NormalizedObservation[] {
  if (obs.length === 0) return obs;
  return obs.map(o => {
    const yearAgoTs = new Date(`${o.date}T00:00:00Z`);
    yearAgoTs.setUTCFullYear(yearAgoTs.getUTCFullYear() - 1);
    const yearAgoIso = yearAgoTs.toISOString().slice(0, 10);
    // Find latest observation on-or-before yearAgoIso
    const eligible = obs.filter(x => x.date <= yearAgoIso);
    if (eligible.length === 0) return o;
    const yearAgo = eligible[eligible.length - 1];
    if (yearAgo.value === 0) return o;
    return { ...o, yoy_pct: round4(((o.value - yearAgo.value) / yearAgo.value) * 100) };
  });
}

/**
 * N-period moving average. Position i gets the average of obs[i-N+1..i].
 * Returns NormalizedObservation[] with ma_N populated when there's enough lookback.
 */
export function computeMovingAverages(
  obs: NormalizedObservation[],
  windows: Array<3 | 12>,
): NormalizedObservation[] {
  if (obs.length === 0) return obs;
  return obs.map((o, i) => {
    const updates: Partial<NormalizedObservation> = {};
    for (const w of windows) {
      if (i + 1 < w) continue;
      let sum = 0;
      for (let k = i - w + 1; k <= i; k++) {
        sum += obs[k].value;
      }
      const avg = round4(sum / w);
      if (w === 3) updates.ma_3 = avg;
      if (w === 12) updates.ma_12 = avg;
    }
    return { ...o, ...updates };
  });
}

export function computeTrend3Obs(obs: NormalizedObservation[]): 'up' | 'down' | 'flat' | 'unknown' {
  if (obs.length < 3) return 'unknown';
  const last3 = obs.slice(-3);
  const a = last3[0].value;
  const c = last3[2].value;
  const range = Math.max(...obs.map(o => o.value)) - Math.min(...obs.map(o => o.value));
  if (range === 0) return 'flat';
  const flatThreshold = range * 0.005; // 0.5% of total range
  if (Math.abs(c - a) <= flatThreshold) return 'flat';
  return c > a ? 'up' : 'down';
}

// ── Cache ──────────────────────────────────────────────────────────

interface CachedSeries {
  observations: NormalizedObservation[];
  capturedAt: string;
}

async function cacheGet(env: Env, key: string): Promise<CachedSeries | null> {
  return (await env.TENSORFEED_CACHE.get(key, 'json')) as CachedSeries | null;
}

async function cachePut(env: Env, key: string, value: CachedSeries): Promise<void> {
  await env.TENSORFEED_CACHE.put(key, JSON.stringify(value), {
    expirationTtl: CACHE_TTL_SECONDS,
  });
}

// ── Validation ─────────────────────────────────────────────────────

const SERIES_ID_RE = /^[A-Z0-9_-]{2,40}$/i;

export function isValidSource(s: string): s is Source {
  return s === 'bls' || s === 'fred';
}

export function isValidSeriesId(s: string): boolean {
  return SERIES_ID_RE.test(s);
}

// ── Top-level entry ────────────────────────────────────────────────

export async function getEconomySeriesHistory(
  env: Env,
  source: Source,
  seriesId: string,
): Promise<SeriesHistoryResult | SeriesHistoryError> {
  const upper = seriesId.toUpperCase();
  if (!isValidSeriesId(upper)) {
    return {
      ok: false,
      error: 'invalid_series_id',
      hint: 'Series ID must be 2-40 alphanumeric characters (with - and _ allowed).',
    };
  }

  if (source === 'fred' && !env.FRED_API_KEY) {
    return {
      ok: false,
      error: 'fred_key_unset',
      hint: 'FRED requires the FRED_API_KEY Worker secret to be configured. BLS works without a key.',
    };
  }

  const cacheKey = `${CACHE_PREFIX}${source}:${upper}`;
  const cached = await cacheGet(env, cacheKey);

  let observations: NormalizedObservation[];
  let capturedAt: string;
  if (cached) {
    observations = cached.observations;
    capturedAt = cached.capturedAt;
  } else {
    try {
      observations =
        source === 'bls'
          ? await fetchBLSSeries(upper)
          : await fetchFREDSeries(upper, env.FRED_API_KEY!);
    } catch (err) {
      return {
        ok: false,
        error: 'upstream_fetch_failed',
        hint: (err as Error).message,
      };
    }
    if (observations.length === 0) {
      return {
        ok: false,
        error: 'series_not_found',
        hint: `${source.toUpperCase()} returned no observations for series ${upper}. Verify the series ID at ${source === 'bls' ? 'bls.gov' : 'fred.stlouisfed.org'}.`,
      };
    }
    capturedAt = new Date().toISOString();
    await cachePut(env, cacheKey, { observations, capturedAt });
  }

  // Apply compute layer
  const withYoY = computeYoYSeries(observations);
  const withMA = computeMovingAverages(withYoY, [3, 12]);
  const trend = computeTrend3Obs(withMA);

  // Summary
  const latest = withMA[withMA.length - 1] ?? null;
  let min: NormalizedObservation | null = null;
  let max: NormalizedObservation | null = null;
  for (const o of withMA) {
    if (!min || o.value < min.value) min = o;
    if (!max || o.value > max.value) max = o;
  }

  const sourceUrl =
    source === 'bls'
      ? `https://www.bls.gov/data/`
      : `https://fred.stlouisfed.org/series/${upper}`;
  const license =
    source === 'bls'
      ? 'Public domain (US Federal government work)'
      : 'Public-domain data via FRED service (fred.stlouisfed.org/legal)';

  return {
    ok: true,
    source,
    series_id: upper,
    computed_at: new Date().toISOString(),
    observations_count: withMA.length,
    date_range: {
      from: withMA[0]?.date ?? '',
      to: withMA[withMA.length - 1]?.date ?? '',
    },
    observations: withMA,
    summary: { latest, min, max, trend_3obs: trend },
    attribution: {
      source: source === 'bls' ? 'U.S. Bureau of Labor Statistics' : 'Federal Reserve Economic Data (FRED), Federal Reserve Bank of St. Louis',
      source_url: sourceUrl,
      license,
      derivation:
        'Full upstream observation history (capped only by what the source returns) with TensorFeed-computed YoY pairing per observation, 3-month and 12-month moving averages, min/max identification, and 3-observation trend direction. The free /api/economy/bls/indicators (24-month cap) and /api/economy/fred/indicators (90-obs cap) are summary surfaces; this is the full archive plus compute.',
    },
  };
}
