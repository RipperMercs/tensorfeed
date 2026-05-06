import { Env } from './types';

/**
 * Federal Reserve Economic Data (FRED) macro indicators.
 *
 * FRED is a service of the Federal Reserve Bank of St. Louis offering
 * 800,000+ economic time series. The underlying data is public-domain
 * Federal Reserve / Treasury / commerce-department aggregates; FRED's
 * own API serves it under terms that explicitly permit free public
 * use. See fred.stlouisfed.org/legal/.
 *
 * Curated set of high-signal macro indicators (rates, yields, money
 * supply, dollar index, commodities) at their native frequencies.
 * Each fetched once per day via the documented JSON endpoint.
 *
 * Requires FRED_API_KEY Worker secret (free registration at
 * fred.stlouisfed.org/docs/api/api_key.html). Endpoint returns 503
 * gracefully when unset.
 *
 * Sister to bls-indicators.ts. Together they cover the macro signal
 * matrix: BLS owns labor + prices + jobs; FRED owns rates + money +
 * commodities + dollar.
 */

const FRED_OBS_URL = 'https://api.stlouisfed.org/fred/series/observations';
const FETCH_TIMEOUT_MS = 12_000;
const MAX_HISTORY_OBS = 90;

const CURRENT_KEY = 'fred-indicators:current';
const META_KEY = 'fred-indicators:meta';

// === Curated indicator set ==========================================

export type IndicatorCategory =
  | 'rates'
  | 'gdp'
  | 'money'
  | 'housing'
  | 'fx'
  | 'commodities';

export type Frequency = 'daily' | 'weekly' | 'monthly' | 'quarterly';

export interface FREDSeriesMeta {
  id: string;
  name: string;
  category: IndicatorCategory;
  frequency: Frequency;
  unit: string;
  description: string;
  source_url: string;
}

export const FRED_SERIES: FREDSeriesMeta[] = [
  // Rates
  {
    id: 'DFF',
    name: 'Effective Federal Funds Rate',
    category: 'rates',
    frequency: 'daily',
    unit: '%',
    description: "Daily effective federal funds rate. The interest rate at which depository institutions trade federal funds with each other overnight; the Fed's primary policy lever.",
    source_url: 'https://fred.stlouisfed.org/series/DFF',
  },
  {
    id: 'DGS10',
    name: '10-Year Treasury Constant Maturity Rate',
    category: 'rates',
    frequency: 'daily',
    unit: '%',
    description: 'Market yield on US Treasury securities at 10-year constant maturity. The benchmark long-rate.',
    source_url: 'https://fred.stlouisfed.org/series/DGS10',
  },
  {
    id: 'DGS2',
    name: '2-Year Treasury Constant Maturity Rate',
    category: 'rates',
    frequency: 'daily',
    unit: '%',
    description: 'Market yield on US Treasury securities at 2-year constant maturity. Front-end policy expectations.',
    source_url: 'https://fred.stlouisfed.org/series/DGS2',
  },
  {
    id: 'T10Y2Y',
    name: '10Y minus 2Y Treasury Spread',
    category: 'rates',
    frequency: 'daily',
    unit: 'percentage points',
    description: '10-year minus 2-year Treasury constant-maturity yield spread. The headline yield-curve indicator; negative = inverted.',
    source_url: 'https://fred.stlouisfed.org/series/T10Y2Y',
  },
  {
    id: 'MORTGAGE30US',
    name: '30-Year Fixed Mortgage Rate',
    category: 'housing',
    frequency: 'weekly',
    unit: '%',
    description: '30-year fixed-rate mortgage average from the Freddie Mac Primary Mortgage Market Survey.',
    source_url: 'https://fred.stlouisfed.org/series/MORTGAGE30US',
  },

  // GDP
  {
    id: 'GDP',
    name: 'Gross Domestic Product (Nominal)',
    category: 'gdp',
    frequency: 'quarterly',
    unit: 'billions USD, SAAR',
    description: 'Nominal GDP, seasonally adjusted annual rate. Headline output measure.',
    source_url: 'https://fred.stlouisfed.org/series/GDP',
  },
  {
    id: 'GDPC1',
    name: 'Real Gross Domestic Product',
    category: 'gdp',
    frequency: 'quarterly',
    unit: 'billions chained 2017 USD, SAAR',
    description: 'Real GDP in chained 2017 dollars, seasonally adjusted annual rate.',
    source_url: 'https://fred.stlouisfed.org/series/GDPC1',
  },

  // Money supply
  {
    id: 'M2SL',
    name: 'M2 Money Stock',
    category: 'money',
    frequency: 'monthly',
    unit: 'billions USD, SA',
    description: 'M2 money stock, seasonally adjusted. Currency, demand deposits, and most savings deposits.',
    source_url: 'https://fred.stlouisfed.org/series/M2SL',
  },

  // FX
  {
    id: 'DTWEXBGS',
    name: 'Trade Weighted U.S. Dollar Index: Broad',
    category: 'fx',
    frequency: 'daily',
    unit: 'index Jan 2006=100',
    description: 'Trade weighted broad dollar index, goods and services. Macro-level USD strength.',
    source_url: 'https://fred.stlouisfed.org/series/DTWEXBGS',
  },

  // Commodities
  {
    id: 'DCOILWTICO',
    name: 'WTI Crude Oil Spot Price',
    category: 'commodities',
    frequency: 'daily',
    unit: 'USD per barrel',
    description: 'Cushing, OK WTI spot price FOB.',
    source_url: 'https://fred.stlouisfed.org/series/DCOILWTICO',
  },
];

// === Date helpers ===================================================

function isoDateOffsetDays(days: number): string {
  const d = new Date();
  d.setUTCDate(d.getUTCDate() - days);
  return d.toISOString().slice(0, 10);
}

// === FRED response shape ============================================

interface FREDObservation {
  date?: string;
  value?: string;
  realtime_start?: string;
  realtime_end?: string;
}

interface FREDObservationsResponse {
  observations?: FREDObservation[];
}

// === Pure parser ====================================================

export interface IndicatorObservation {
  date: string;          // YYYY-MM-DD
  value: number;
}

export function parseSeriesObservations(raw: FREDObservation[]): IndicatorObservation[] {
  const out: IndicatorObservation[] = [];
  for (const r of raw) {
    if (!r.date || !r.value) continue;
    if (r.value === '.' || r.value === '' || r.value === 'NA') continue;  // FRED uses "." for missing
    const value = parseFloat(r.value);
    if (!Number.isFinite(value)) continue;
    out.push({ date: r.date, value });
  }
  out.sort((a, b) => a.date.localeCompare(b.date));
  if (out.length > MAX_HISTORY_OBS) {
    return out.slice(out.length - MAX_HISTORY_OBS);
  }
  return out;
}

// === Fetcher ========================================================

async function fetchSeries(seriesId: string, apiKey: string): Promise<IndicatorObservation[]> {
  const sinceDate = isoDateOffsetDays(365 * 3);   // 3 years window, then we trim to MAX_HISTORY_OBS
  const params = new URLSearchParams({
    series_id: seriesId,
    api_key: apiKey,
    file_type: 'json',
    observation_start: sinceDate,
    sort_order: 'asc',
  });
  const url = `${FRED_OBS_URL}?${params.toString()}`;

  const res = await fetch(url, {
    headers: {
      'User-Agent': 'tensorfeed-fred/1.0 (mailto:evan@tensorfeed.ai; +https://tensorfeed.ai)',
      'Accept': 'application/json',
    },
    signal: AbortSignal.timeout(FETCH_TIMEOUT_MS),
    cf: { cacheTtl: 60 } as RequestInitCfProperties,
  });
  if (!res.ok) {
    throw new Error(`HTTP ${res.status}`);
  }
  const data = (await res.json()) as FREDObservationsResponse;
  const obs = Array.isArray(data.observations) ? data.observations : [];
  return parseSeriesObservations(obs);
}

// === Snapshot =======================================================

export interface IndicatorSnapshotEntry {
  series_id: string;
  name: string;
  category: IndicatorCategory;
  frequency: Frequency;
  unit: string;
  description: string;
  source_url: string;
  observations: IndicatorObservation[];
  latest: IndicatorObservation | null;
  prior: IndicatorObservation | null;
  delta_absolute: number | null;
  delta_pct: number | null;
}

export interface IndicatorsSnapshot {
  capturedAt: string;
  count: number;
  indicators: IndicatorSnapshotEntry[];
  errors: Array<{ series_id: string; error: string }>;
}

function pctChange(prior: number | null, latest: number | null): number | null {
  if (prior === null || latest === null) return null;
  if (prior === 0) return null;
  return Math.round(((latest - prior) / prior) * 10000) / 100;
}

function buildEntry(meta: FREDSeriesMeta, obs: IndicatorObservation[]): IndicatorSnapshotEntry {
  const latest = obs[obs.length - 1] ?? null;
  const prior = obs.length >= 2 ? obs[obs.length - 2] : null;
  const delta_absolute =
    latest !== null && prior !== null
      ? Math.round((latest.value - prior.value) * 10000) / 10000
      : null;
  return {
    series_id: meta.id,
    name: meta.name,
    category: meta.category,
    frequency: meta.frequency,
    unit: meta.unit,
    description: meta.description,
    source_url: meta.source_url,
    observations: obs,
    latest,
    prior,
    delta_absolute,
    delta_pct: pctChange(prior?.value ?? null, latest?.value ?? null),
  };
}

// === Cron entry =====================================================

export interface RefreshResult {
  ok: boolean;
  fetched?: number;
  failed?: number;
  errors?: Array<{ series_id: string; error: string }>;
  skipped?: boolean;
  reason?: string;
}

export async function refreshFREDIndicators(env: Env): Promise<RefreshResult> {
  if (!env.FRED_API_KEY) {
    return { ok: false, skipped: true, reason: 'FRED_API_KEY secret not configured' };
  }
  const apiKey = env.FRED_API_KEY;

  const indicators: IndicatorSnapshotEntry[] = [];
  const errors: Array<{ series_id: string; error: string }> = [];

  for (const meta of FRED_SERIES) {
    try {
      const obs = await fetchSeries(meta.id, apiKey);
      indicators.push(buildEntry(meta, obs));
    } catch (err) {
      errors.push({ series_id: meta.id, error: (err as Error).message });
    }
  }

  if (errors.length > 0) {
    const prior = (await env.TENSORFEED_CACHE.get(CURRENT_KEY, 'json')) as IndicatorsSnapshot | null;
    if (prior) {
      const haveIds = new Set(indicators.map(i => i.series_id));
      for (const stale of prior.indicators) {
        if (!haveIds.has(stale.series_id)) {
          indicators.push(stale);
        }
      }
    }
  }

  indicators.sort((a, b) =>
    a.category === b.category ? a.name.localeCompare(b.name) : a.category.localeCompare(b.category),
  );

  const snapshot: IndicatorsSnapshot = {
    capturedAt: new Date().toISOString(),
    count: indicators.length,
    indicators,
    errors,
  };

  await env.TENSORFEED_CACHE.put(CURRENT_KEY, JSON.stringify(snapshot));
  await env.TENSORFEED_CACHE.put(
    META_KEY,
    JSON.stringify({
      capturedAt: snapshot.capturedAt,
      count: snapshot.count,
      failed: errors.length,
    }),
  );

  return {
    ok: errors.length < FRED_SERIES.length,
    fetched: FRED_SERIES.length - errors.length,
    failed: errors.length,
    errors,
  };
}

// === Read API =======================================================

export interface FREDAttribution {
  source: string;
  source_url: string;
  license: string;
  required_credit: string;
}

export const FRED_ATTRIBUTION: FREDAttribution = {
  source: 'Federal Reserve Economic Data (FRED), Federal Reserve Bank of St. Louis',
  source_url: 'https://fred.stlouisfed.org',
  license: 'Public-domain data; FRED service free for public use per fred.stlouisfed.org/legal',
  required_credit:
    "Data via Federal Reserve Economic Data (FRED), Federal Reserve Bank of St. Louis. Series IDs preserved on each entry; click any source_url to verify the upstream series page.",
};

export interface IndicatorsResponse {
  ok: true;
  capturedAt: string;
  count: number;
  filters: { category?: IndicatorCategory };
  indicators: IndicatorSnapshotEntry[];
  attribution: FREDAttribution;
  notes: string[];
}

export interface IndicatorsOptions {
  category?: IndicatorCategory;
}

export const VALID_CATEGORIES: IndicatorCategory[] = [
  'rates',
  'gdp',
  'money',
  'housing',
  'fx',
  'commodities',
];

export function isValidCategory(s: string): s is IndicatorCategory {
  return (VALID_CATEGORIES as string[]).includes(s);
}

export async function readIndicators(
  env: Env,
  options: IndicatorsOptions = {},
): Promise<IndicatorsResponse | null> {
  const snapshot = (await env.TENSORFEED_CACHE.get(CURRENT_KEY, 'json')) as IndicatorsSnapshot | null;
  if (!snapshot) return null;

  let indicators = snapshot.indicators;
  if (options.category) {
    indicators = indicators.filter(i => i.category === options.category);
  }

  const notes: string[] = [];
  if (snapshot.errors.length > 0) {
    notes.push(
      `${snapshot.errors.length} series failed in the last refresh; their values may be stale (kept from the prior snapshot).`,
    );
  }

  return {
    ok: true,
    capturedAt: snapshot.capturedAt,
    count: indicators.length,
    filters: options.category ? { category: options.category } : {},
    indicators,
    attribution: FRED_ATTRIBUTION,
    notes,
  };
}
