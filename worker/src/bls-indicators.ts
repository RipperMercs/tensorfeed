import { Env } from './types';

/**
 * U.S. Bureau of Labor Statistics economic indicators.
 *
 * BLS data is in the public domain (Federal government agency
 * publication), free for commercial use and redistribution, citation
 * requested but not legally required. Confirmed via
 * www.bls.gov/opub/copyright-information.htm.
 *
 * Curated set of ~10 high-signal economic indicators (CPI, core CPI,
 * unemployment, payrolls, hourly earnings, labor force participation,
 * PPI, weekly hours, JOLTS openings, JOLTS hires). Each fetched once
 * per day via the V1 unregistered GET endpoint, single series per
 * call. With 10 series and the V1 unregistered cap of 25 queries/day
 * per IP, we sit at 40% of the daily envelope with headroom for
 * retries.
 *
 * V1 endpoint: api.bls.gov/publicAPI/v1/timeseries/data/{seriesId}
 * Returns up to 10 years of monthly observations per call. We only
 * keep the last 24 months for the snapshot.
 *
 * Daily refresh at 05:00 UTC. BLS releases mostly land morning ET
 * (12-13:00 UTC) for headline series; an overnight refresh catches
 * the prior day's announcements + any late corrections.
 */

const BLS_V1_BASE = 'https://api.bls.gov/publicAPI/v1/timeseries/data/';
const FETCH_TIMEOUT_MS = 12_000;
const MAX_HISTORY_MONTHS = 24;

const CURRENT_KEY = 'bls-indicators:current';
const META_KEY = 'bls-indicators:meta';

// === Curated indicator set ==========================================

export type IndicatorCategory =
  | 'inflation'
  | 'employment'
  | 'wages'
  | 'labor-force'
  | 'jolts';

export interface BLSSeriesMeta {
  id: string;                 // BLS series id (e.g., 'CUUR0000SA0')
  name: string;               // human-readable name
  category: IndicatorCategory;
  unit: string;               // 'index 1982-84=100', '%', 'thousands of persons', etc.
  description: string;
  source_url: string;         // canonical BLS series page
}

export const BLS_SERIES: BLSSeriesMeta[] = [
  {
    id: 'CUUR0000SA0',
    name: 'CPI-U All Items',
    category: 'inflation',
    unit: 'index 1982-84=100',
    description: 'Consumer Price Index for All Urban Consumers, all items, NSA. Headline inflation.',
    source_url: 'https://www.bls.gov/cpi/',
  },
  {
    id: 'CUUR0000SA0L1E',
    name: 'CPI-U Core (Less Food and Energy)',
    category: 'inflation',
    unit: 'index 1982-84=100',
    description: 'Consumer Price Index for All Urban Consumers, less food and energy, NSA. Core inflation.',
    source_url: 'https://www.bls.gov/cpi/',
  },
  {
    id: 'WPSFD49207',
    name: 'PPI Final Demand',
    category: 'inflation',
    unit: 'index Nov 2009=100',
    description: 'Producer Price Index for Final Demand, NSA. Wholesale price pressure.',
    source_url: 'https://www.bls.gov/ppi/',
  },
  {
    id: 'LNS14000000',
    name: 'Civilian Unemployment Rate',
    category: 'employment',
    unit: '%',
    description: 'Unemployment rate, 16+, seasonally adjusted.',
    source_url: 'https://www.bls.gov/cps/',
  },
  {
    id: 'CES0000000001',
    name: 'Total Nonfarm Employment',
    category: 'employment',
    unit: 'thousands of persons',
    description: 'All employees, total nonfarm, seasonally adjusted. The headline payrolls number.',
    source_url: 'https://www.bls.gov/ces/',
  },
  {
    id: 'CES0500000003',
    name: 'Average Hourly Earnings, Private',
    category: 'wages',
    unit: 'USD',
    description: 'Average hourly earnings of all employees, total private, seasonally adjusted.',
    source_url: 'https://www.bls.gov/ces/',
  },
  {
    id: 'CES0500000002',
    name: 'Average Weekly Hours, Private',
    category: 'wages',
    unit: 'hours',
    description: 'Average weekly hours of all employees, total private, seasonally adjusted.',
    source_url: 'https://www.bls.gov/ces/',
  },
  {
    id: 'LNS11300000',
    name: 'Civilian Labor Force Participation Rate',
    category: 'labor-force',
    unit: '%',
    description: 'Labor force participation rate, 16+, seasonally adjusted.',
    source_url: 'https://www.bls.gov/cps/',
  },
  {
    id: 'JTS000000000000000JOL',
    name: 'JOLTS Job Openings',
    category: 'jolts',
    unit: 'thousands',
    description: 'Total nonfarm job openings, seasonally adjusted (JOLTS).',
    source_url: 'https://www.bls.gov/jlt/',
  },
  {
    id: 'JTS000000000000000HIL',
    name: 'JOLTS Hires',
    category: 'jolts',
    unit: 'thousands',
    description: 'Total nonfarm hires, seasonally adjusted (JOLTS).',
    source_url: 'https://www.bls.gov/jlt/',
  },
];

// === BLS V1 response shape ==========================================

interface BLSObservation {
  year?: string;
  period?: string;       // 'M01'..'M12' for monthly
  periodName?: string;
  value?: string;
  footnotes?: Array<{ code?: string; text?: string }>;
}

interface BLSV1Response {
  status?: string;
  responseTime?: number;
  message?: string[];
  Results?: {
    series?: Array<{
      seriesID?: string;
      data?: BLSObservation[];
    }>;
  };
}

// === Pure parser ====================================================

export interface IndicatorObservation {
  year: number;
  month: number;          // 1-12
  period_label: string;   // 'Jan 2026'
  value: number;
}

/**
 * Convert a BLS v1 response into normalized observations sorted
 * oldest-first. Drops malformed rows. Caps at MAX_HISTORY_MONTHS.
 */
export function parseSeriesObservations(raw: BLSObservation[]): IndicatorObservation[] {
  const out: IndicatorObservation[] = [];
  for (const r of raw) {
    if (!r.year || !r.period || !r.value) continue;
    if (!r.period.startsWith('M')) continue;       // skip annual (M13) and quarterly
    const month = parseInt(r.period.slice(1), 10);
    if (!Number.isFinite(month) || month < 1 || month > 12) continue;
    const year = parseInt(r.year, 10);
    if (!Number.isFinite(year)) continue;
    const value = parseFloat(r.value);
    if (!Number.isFinite(value)) continue;
    const monthShort = r.periodName ? r.periodName.slice(0, 3) : '';
    out.push({
      year,
      month,
      period_label: monthShort ? `${monthShort} ${year}` : `${year}-${String(month).padStart(2, '0')}`,
      value,
    });
  }
  // BLS returns newest first; sort oldest-first for time-series clarity.
  out.sort((a, b) => (a.year - b.year) || (a.month - b.month));
  if (out.length > MAX_HISTORY_MONTHS) {
    return out.slice(out.length - MAX_HISTORY_MONTHS);
  }
  return out;
}

// === Fetcher ========================================================

async function fetchSeries(seriesId: string): Promise<IndicatorObservation[]> {
  const url = `${BLS_V1_BASE}${encodeURIComponent(seriesId)}`;
  const res = await fetch(url, {
    headers: {
      'User-Agent': 'tensorfeed-bls/1.0 (mailto:evan@tensorfeed.ai; +https://tensorfeed.ai)',
      'Accept': 'application/json',
    },
    signal: AbortSignal.timeout(FETCH_TIMEOUT_MS),
    cf: { cacheTtl: 60 } as RequestInitCfProperties,
  });
  if (!res.ok) {
    throw new Error(`HTTP ${res.status}`);
  }
  const data = (await res.json()) as BLSV1Response;
  if (data.status !== 'REQUEST_SUCCEEDED') {
    const msg = (data.message ?? []).join('; ') || 'unknown';
    throw new Error(`BLS status=${data.status} (${msg})`);
  }
  const series = data.Results?.series?.[0];
  if (!series || !Array.isArray(series.data)) {
    throw new Error('empty series response');
  }
  return parseSeriesObservations(series.data);
}

// === Snapshot =======================================================

export interface IndicatorSnapshotEntry {
  series_id: string;
  name: string;
  category: IndicatorCategory;
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

function buildEntry(meta: BLSSeriesMeta, obs: IndicatorObservation[]): IndicatorSnapshotEntry {
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
  fetched: number;
  failed: number;
  errors: Array<{ series_id: string; error: string }>;
}

export async function refreshBLSIndicators(env: Env): Promise<RefreshResult> {
  const indicators: IndicatorSnapshotEntry[] = [];
  const errors: Array<{ series_id: string; error: string }> = [];

  // Sequential to be polite to BLS and stay well under their per-IP
  // rate envelope. 10 series x ~1s each is fine in a cron tick.
  for (const meta of BLS_SERIES) {
    try {
      const obs = await fetchSeries(meta.id);
      indicators.push(buildEntry(meta, obs));
    } catch (err) {
      const msg = (err as Error).message;
      errors.push({ series_id: meta.id, error: msg });
    }
  }

  // Read prior snapshot to merge in any series that failed this run,
  // so a single bad fetch does not nuke the catalog.
  if (errors.length > 0) {
    const prior = (await env.TENSORFEED_CACHE.get(
      CURRENT_KEY,
      'json',
    )) as IndicatorsSnapshot | null;
    if (prior) {
      const haveIds = new Set(indicators.map(i => i.series_id));
      for (const stale of prior.indicators) {
        if (!haveIds.has(stale.series_id)) {
          indicators.push(stale);
        }
      }
    }
  }

  // Stable sort by category then name for response readability.
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
    ok: errors.length < BLS_SERIES.length,
    fetched: BLS_SERIES.length - errors.length,
    failed: errors.length,
    errors,
  };
}

// === Read API =======================================================

export interface BLSAttribution {
  source: string;
  source_url: string;
  license: string;
  required_credit: string;
}

export const BLS_ATTRIBUTION: BLSAttribution = {
  source: 'U.S. Bureau of Labor Statistics',
  source_url: 'https://www.bls.gov',
  license: 'Public domain (US Federal government work)',
  required_credit:
    'Data via U.S. Bureau of Labor Statistics (bls.gov). BLS data is in the public domain; this snapshot is a TensorFeed-curated set of high-signal monthly indicators.',
};

export interface IndicatorsResponse {
  ok: true;
  capturedAt: string;
  count: number;
  filters: { category?: IndicatorCategory };
  indicators: IndicatorSnapshotEntry[];
  attribution: BLSAttribution;
  notes: string[];
}

export interface IndicatorsOptions {
  category?: IndicatorCategory;
}

export const VALID_CATEGORIES: IndicatorCategory[] = [
  'inflation',
  'employment',
  'wages',
  'labor-force',
  'jolts',
];

export function isValidCategory(s: string): s is IndicatorCategory {
  return (VALID_CATEGORIES as string[]).includes(s);
}

export async function readIndicators(
  env: Env,
  options: IndicatorsOptions = {},
): Promise<IndicatorsResponse | null> {
  const snapshot = (await env.TENSORFEED_CACHE.get(
    CURRENT_KEY,
    'json',
  )) as IndicatorsSnapshot | null;
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
    attribution: BLS_ATTRIBUTION,
    notes,
  };
}
