/**
 * NASA POWER (Prediction Of Worldwide Energy Resources) ingest.
 *
 * NASA POWER serves global meteorological and solar energy data spanning
 * 40+ years at 0.5-degree spatial resolution. Maintained by NASA Langley
 * Research Center, refreshed daily, sourced primarily from the MERRA2
 * reanalysis. Used widely for solar siting, agricultural moisture
 * tracking, climate indicator modeling, and renewable energy forecasting.
 *
 * API endpoints we proxy:
 *   /api/temporal/daily/point   one-point daily series
 *   /api/temporal/hourly/point  one-point hourly series (premium)
 *   /api/temporal/climatology/point  climatology summary (compute-only)
 *
 * License: NASA POWER data is open access with no restrictions per the
 * project's published terms. As US Government work it is also in the
 * public domain (17 USC 105). Acknowledgment is requested but not
 * legally required for commercial redistribution. Standard attribution
 * block on every response.
 *
 * Architecture: pure lazy-proxy with KV cache. NASA POWER rate limits
 * at 30 req/min per IP and we are calling from Cloudflare's IP space
 * shared across millions of customers, so caching is load-bearing.
 * Each unique (endpoint, lat, lon, parameters, dates, community) tuple
 * becomes a hashed cache key with a 7-day TTL.
 *
 * Why 7 days: historical data from yesterday and earlier is immutable;
 * the trailing edge of the daily feed updates as MERRA2 reanalysis
 * back-fills (typically 4-7 days). 7-day TTL keeps cached responses
 * fresh enough for almost all use cases while avoiding repeated calls
 * to NASA when many agents query the same (lat, lon, year) tuple.
 */

import type { Env } from './types';
import { readEdgeCacheJSON, writeEdgeCacheJSON } from './edge-cache';

const POWER_BASE = 'https://power.larc.nasa.gov/api/temporal';

const TTL_DAILY = 7 * 24 * 60 * 60;
const TTL_HOURLY = 7 * 24 * 60 * 60;

const ATTRIBUTION = {
  source: 'NASA POWER (Prediction Of Worldwide Energy Resources)',
  source_url: 'https://power.larc.nasa.gov/',
  publisher: 'NASA Langley Research Center',
  license: 'Open access; US Government work in the public domain (17 USC §105)',
  redistribution: 'commercial-permitted',
  notice:
    'NASA requests acknowledgment of POWER data in publications: "These data were obtained from the NASA Langley Research Center POWER Project". Not legally required for commercial redistribution. Data sourced from MERRA2 reanalysis; treat values as model output rather than ground-truth measurements.',
};

const COMMUNITIES = new Set(['AG', 'RE', 'SB']);
const TEMPORAL_DAILY = 'daily';
const TEMPORAL_HOURLY = 'hourly';

const DATE_RE = /^\d{8}$/;

export interface PowerQuery {
  latitude: number;
  longitude: number;
  parameters: string[];
  start: string;
  end: string;
  community: string;
  temporal: 'daily' | 'hourly';
}

export interface PowerResult {
  ok: boolean;
  source: 'cache' | 'live';
  fetched_at: string;
  query: PowerQuery;
  data: unknown | null;
  attribution: typeof ATTRIBUTION;
  error?: string;
  http_status?: number;
}

function isValidLatitude(n: number): boolean {
  return Number.isFinite(n) && n >= -90 && n <= 90;
}

function isValidLongitude(n: number): boolean {
  return Number.isFinite(n) && n >= -180 && n <= 180;
}

function isValidDate(s: string): boolean {
  return DATE_RE.test(s);
}

const PARAM_RE = /^[A-Z][A-Z0-9_]{1,31}$/;

function isValidParameter(p: string): boolean {
  return PARAM_RE.test(p);
}

export interface ParseResult {
  ok: true;
  query: PowerQuery;
}

export interface ParseError {
  ok: false;
  error: string;
  hint: string;
}

export function parsePowerQuery(
  url: URL,
  temporal: 'daily' | 'hourly',
  defaults: { community?: string; maxRangeDays: number },
): ParseResult | ParseError {
  const latRaw = url.searchParams.get('latitude') ?? url.searchParams.get('lat');
  const lonRaw = url.searchParams.get('longitude') ?? url.searchParams.get('lon');
  const lat = latRaw ? parseFloat(latRaw) : NaN;
  const lon = lonRaw ? parseFloat(lonRaw) : NaN;
  if (!isValidLatitude(lat)) {
    return { ok: false, error: 'invalid_latitude', hint: 'latitude must be -90 to 90 (decimal degrees)' };
  }
  if (!isValidLongitude(lon)) {
    return { ok: false, error: 'invalid_longitude', hint: 'longitude must be -180 to 180 (decimal degrees)' };
  }

  const parametersRaw = url.searchParams.get('parameters') ?? url.searchParams.get('params');
  if (!parametersRaw) {
    return {
      ok: false,
      error: 'parameters_required',
      hint: 'pass ?parameters=T2M,PRECTOTCORR (comma-separated NASA POWER parameter codes; see /api/climate/power/parameters)',
    };
  }
  const parameters = parametersRaw
    .split(',')
    .map((p) => p.trim().toUpperCase())
    .filter(Boolean);
  if (parameters.length === 0 || parameters.length > 20) {
    return {
      ok: false,
      error: 'invalid_parameters_count',
      hint: 'pass 1 to 20 comma-separated parameter codes',
    };
  }
  for (const p of parameters) {
    if (!isValidParameter(p)) {
      return {
        ok: false,
        error: 'invalid_parameter',
        hint: `parameter "${p}" must match [A-Z][A-Z0-9_]+ (e.g. T2M, PRECTOTCORR, ALLSKY_SFC_SW_DWN)`,
      };
    }
  }

  const start = url.searchParams.get('start');
  const end = url.searchParams.get('end');
  if (!start || !end || !isValidDate(start) || !isValidDate(end)) {
    return {
      ok: false,
      error: 'invalid_date_range',
      hint: 'pass ?start=YYYYMMDD&end=YYYYMMDD (NASA POWER date format, no dashes)',
    };
  }
  if (start > end) {
    return { ok: false, error: 'invalid_date_range', hint: 'end must be on or after start' };
  }

  const startDate = new Date(
    `${start.slice(0, 4)}-${start.slice(4, 6)}-${start.slice(6, 8)}T00:00:00Z`,
  );
  const endDate = new Date(
    `${end.slice(0, 4)}-${end.slice(4, 6)}-${end.slice(6, 8)}T00:00:00Z`,
  );
  if (Number.isNaN(startDate.getTime()) || Number.isNaN(endDate.getTime())) {
    return { ok: false, error: 'invalid_date_range', hint: 'dates must be valid YYYYMMDD' };
  }
  const dayCount = Math.floor((endDate.getTime() - startDate.getTime()) / 86400_000) + 1;
  if (dayCount > defaults.maxRangeDays) {
    return {
      ok: false,
      error: 'range_too_large',
      hint: `range must be at most ${defaults.maxRangeDays} days for the ${temporal} endpoint`,
    };
  }

  const community = (
    url.searchParams.get('community') ??
    defaults.community ??
    'AG'
  ).toUpperCase();
  if (!COMMUNITIES.has(community)) {
    return {
      ok: false,
      error: 'invalid_community',
      hint: 'community must be AG, RE, or SB',
    };
  }

  return {
    ok: true,
    query: {
      latitude: lat,
      longitude: lon,
      parameters,
      start,
      end,
      community,
      temporal,
    },
  };
}

/**
 * Stable, short cache key for a NASA POWER query. Uses simple hashing
 * to avoid huge KV keys; collision risk is negligible at this volume.
 */
function cacheKey(q: PowerQuery): string {
  const parts = [
    q.temporal,
    q.latitude.toFixed(4),
    q.longitude.toFixed(4),
    q.parameters.slice().sort().join(','),
    q.start,
    q.end,
    q.community,
  ].join('|');
  // Simple FNV-1a-style hash (32-bit). Keeps key under ~80 chars.
  let hash = 2166136261;
  for (let i = 0; i < parts.length; i += 1) {
    hash ^= parts.charCodeAt(i);
    hash = Math.imul(hash, 16777619);
  }
  const tag = (hash >>> 0).toString(36);
  return `power:${q.temporal}:${tag}`;
}

function buildPowerUrl(q: PowerQuery): string {
  const params = new URLSearchParams();
  params.set('parameters', q.parameters.join(','));
  params.set('community', q.community);
  params.set('latitude', String(q.latitude));
  params.set('longitude', String(q.longitude));
  params.set('start', q.start);
  params.set('end', q.end);
  params.set('format', 'JSON');
  return `${POWER_BASE}/${q.temporal}/point?${params.toString()}`;
}

export async function fetchPowerPoint(env: Env, q: PowerQuery): Promise<PowerResult> {
  const fetched_at = new Date().toISOString();
  const key = cacheKey(q);

  const cached = await readEdgeCacheJSON<unknown>(key);
  if (cached) {
    return {
      ok: true,
      source: 'cache',
      fetched_at,
      query: q,
      data: cached,
      attribution: ATTRIBUTION,
    };
  }

  let resp: Response;
  try {
    resp = await fetch(buildPowerUrl(q), {
      headers: { 'User-Agent': 'TensorFeed/1.0 (https://tensorfeed.ai)' },
      signal: AbortSignal.timeout(20000),
    });
  } catch (e) {
    return {
      ok: false,
      source: 'live',
      fetched_at,
      query: q,
      data: null,
      attribution: ATTRIBUTION,
      error: `power_fetch_failed: ${e instanceof Error ? e.message : String(e)}`,
    };
  }

  if (resp.status === 429) {
    return {
      ok: false,
      source: 'live',
      fetched_at,
      query: q,
      data: null,
      attribution: ATTRIBUTION,
      error: 'power_upstream_rate_limited',
      http_status: 429,
    };
  }
  if (!resp.ok) {
    return {
      ok: false,
      source: 'live',
      fetched_at,
      query: q,
      data: null,
      attribution: ATTRIBUTION,
      error: `power_http_${resp.status}`,
      http_status: resp.status,
    };
  }

  let payload: unknown;
  try {
    payload = await resp.json();
  } catch {
    return {
      ok: false,
      source: 'live',
      fetched_at,
      query: q,
      data: null,
      attribution: ATTRIBUTION,
      error: 'power_invalid_json',
    };
  }

  const ttl = q.temporal === TEMPORAL_HOURLY ? TTL_HOURLY : TTL_DAILY;
  await writeEdgeCacheJSON(key, payload, ttl);

  return {
    ok: true,
    source: 'live',
    fetched_at,
    query: q,
    data: payload,
    attribution: ATTRIBUTION,
  };
}

/**
 * Curated list of the most-requested NASA POWER parameters for the
 * /api/climate/power/parameters discovery endpoint. Not exhaustive
 * (NASA exposes 100+ parameters); the curated set here covers the
 * common cases for solar siting, agriculture, and climate analysis.
 */
export const POWER_PARAMETER_CATALOG = [
  { code: 'T2M', units: 'C', longname: 'Temperature at 2 Meters', community: 'AG' },
  { code: 'T2M_MAX', units: 'C', longname: 'Temperature at 2 Meters Maximum', community: 'AG' },
  { code: 'T2M_MIN', units: 'C', longname: 'Temperature at 2 Meters Minimum', community: 'AG' },
  { code: 'T2MDEW', units: 'C', longname: 'Dew/Frost Point at 2 Meters', community: 'AG' },
  { code: 'RH2M', units: '%', longname: 'Relative Humidity at 2 Meters', community: 'AG' },
  { code: 'PRECTOTCORR', units: 'mm/day', longname: 'Precipitation Corrected', community: 'AG' },
  { code: 'PS', units: 'kPa', longname: 'Surface Pressure', community: 'AG' },
  { code: 'WS10M', units: 'm/s', longname: 'Wind Speed at 10 Meters', community: 'AG' },
  { code: 'WS10M_MAX', units: 'm/s', longname: 'Wind Speed at 10 Meters Maximum', community: 'AG' },
  { code: 'WS50M', units: 'm/s', longname: 'Wind Speed at 50 Meters', community: 'RE' },
  { code: 'ALLSKY_SFC_SW_DWN', units: 'kWh/m^2/day', longname: 'All Sky Surface Shortwave Downward Irradiance', community: 'RE' },
  { code: 'CLRSKY_SFC_SW_DWN', units: 'kWh/m^2/day', longname: 'Clear Sky Surface Shortwave Downward Irradiance', community: 'RE' },
  { code: 'ALLSKY_SFC_LW_DWN', units: 'kWh/m^2/day', longname: 'All Sky Surface Longwave Downward Irradiance', community: 'RE' },
  { code: 'ALLSKY_SFC_PAR_TOT', units: 'W/m^2', longname: 'All Sky Surface Photosynthetically Active Radiation', community: 'AG' },
  { code: 'ALLSKY_SFC_UV_INDEX', units: 'index', longname: 'All Sky Surface UV Index', community: 'AG' },
  { code: 'EVPTRNS', units: 'mm/day', longname: 'Evapotranspiration', community: 'AG' },
];

export const POWER_ATTRIBUTION = ATTRIBUTION;
export { TEMPORAL_DAILY, TEMPORAL_HOURLY, COMMUNITIES };
