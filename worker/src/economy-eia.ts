/**
 * EIA (US Energy Information Administration) Open Data ingest.
 *
 * EIA publishes 2.2M+ time series covering electricity, petroleum,
 * natural gas, coal, nuclear, renewables, and total energy. Public
 * domain via 17 USC §105 (US Government work); commercial
 * redistribution explicitly permitted with no attribution requirement.
 *
 * Architecture: pure lazy-proxy with KV cache, same pattern as FRED
 * and OpenFDA. EIA requires a free API key (`api_key` query param)
 * for rate-limit purposes; the module degrades gracefully to a 503
 * `eia_key_unset` response when `EIA_API_KEY` is unbound, mirroring
 * the FRED treatment.
 *
 * Route allowlist: rather than a generic passthrough we expose a
 * curated set of high-demand EIA routes covering the macroeconomic
 * core (oil prices, gasoline prices, natural gas prices, electricity
 * retail sales, net generation, total energy). Agents pass any
 * standard EIA query param (frequency, start, end, length, sort);
 * we restrict the route to keep the surface small and predictable.
 */

import type { Env } from './types';
import { readEdgeCacheJSON, writeEdgeCacheJSON } from './edge-cache';
import { sha256CacheKey } from './cache-key';

const EIA_BASE = 'https://api.eia.gov/v2';

const TTL_QUERY = 24 * 60 * 60;

const ATTRIBUTION = {
  source: 'EIA Open Data',
  source_url: 'https://www.eia.gov/opendata/',
  publisher: 'US Energy Information Administration (Department of Energy)',
  license: 'US Government public domain (17 USC §105)',
  redistribution: 'commercial-permitted',
  notice:
    'EIA Open Data is in the public domain. Cadence varies dramatically by series (some weekly, some monthly, some annual); the response includes the EIA-published frequency and the most recent observation date. Free API key registration at https://www.eia.gov/opendata/register.php.',
};

export interface EIARoute {
  description: string;
  default_frequency: string;
  example_filters: Record<string, string>;
}

export const EIA_ROUTES: Record<string, EIARoute> = {
  'petroleum/pri/spt': {
    description: 'Crude oil spot prices (WTI Cushing, Brent). Daily.',
    default_frequency: 'daily',
    example_filters: { 'facets[product][]': 'EPCBRENT', 'facets[series][]': 'RBRTE' },
  },
  'petroleum/pri/gnd': {
    description: 'US weekly retail gasoline prices by region and grade.',
    default_frequency: 'weekly',
    example_filters: { 'facets[product][]': 'EPMR', 'facets[duoarea][]': 'NUS' },
  },
  'natural-gas/pri/sum': {
    description: 'Natural gas price summary including Henry Hub spot, citygate, residential, commercial, industrial.',
    default_frequency: 'monthly',
    example_filters: { 'facets[duoarea][]': 'NUS' },
  },
  'electricity/retail-sales': {
    description: 'Retail electricity sales, prices, and revenue by state and sector (residential, commercial, industrial, transportation).',
    default_frequency: 'monthly',
    example_filters: { 'facets[stateid][]': 'CA', 'facets[sectorid][]': 'RES' },
  },
  'electricity/electric-power-operational-data': {
    description: 'Net electricity generation by fuel source (natural gas, coal, nuclear, hydro, solar, wind, etc).',
    default_frequency: 'monthly',
    example_filters: { 'facets[fueltypeid][]': 'NG' },
  },
  'total-energy': {
    description: 'Aggregate US total energy production, consumption, imports, and exports across all fuel types.',
    default_frequency: 'monthly',
    example_filters: {},
  },
};

const FREQUENCY_RE = /^[a-zA-Z][a-zA-Z0-9_-]{1,30}$/;
// EIA Open Data accepts dates in formats matched to the requested
// frequency: YYYY (annual), YYYY-MM (monthly/quarterly), YYYY-MM-DD
// (daily/hourly). We accept all three at the validator layer; if the
// agent supplies a format that doesn't match the underlying frequency,
// EIA upstream returns 400 and we proxy that error verbatim with our
// attribution block. Single-digit month/day is still rejected so 2026-5
// or 2026-5-8 fall to invalid_start.
const ISO_DATE_RE = /^\d{4}(-\d{2}(-\d{2})?)?$/;
const FACET_KEY_RE = /^facets\[[a-zA-Z0-9_]+\]\[\]$/;
const FACET_VAL_RE = /^[A-Za-z0-9_.\-]{1,40}$/;

export interface EIAQuery {
  route: string;
  frequency: string;
  start: string | null;
  end: string | null;
  length: number;
  offset: number;
  facets: Record<string, string[]>;
  data_columns: string[];
}

export interface EIAResult {
  ok: boolean;
  source: 'cache' | 'live';
  fetched_at: string;
  query: EIAQuery;
  data: unknown | null;
  attribution: typeof ATTRIBUTION;
  error?: string;
  http_status?: number;
}

export interface ParseOk {
  ok: true;
  query: EIAQuery;
}

export interface ParseError {
  ok: false;
  error: string;
  hint: string;
}

export function isEIARoute(r: string): r is keyof typeof EIA_ROUTES {
  return r in EIA_ROUTES;
}

export function parseEIAQuery(url: URL): ParseOk | ParseError {
  const route = url.searchParams.get('route');
  if (!route || !isEIARoute(route)) {
    return {
      ok: false,
      error: 'invalid_route',
      hint: `pass ?route=<one of: ${Object.keys(EIA_ROUTES).join(', ')}>. See /api/economy/eia/categories for descriptions.`,
    };
  }

  const def = EIA_ROUTES[route];
  const frequency = url.searchParams.get('frequency') ?? def.default_frequency;
  if (!FREQUENCY_RE.test(frequency)) {
    return { ok: false, error: 'invalid_frequency', hint: 'frequency must match [a-zA-Z][a-zA-Z0-9_-]+' };
  }

  const start = url.searchParams.get('start');
  if (start && !ISO_DATE_RE.test(start)) {
    return { ok: false, error: 'invalid_start', hint: 'start must be YYYY, YYYY-MM, or YYYY-MM-DD (matched to frequency)' };
  }
  const end = url.searchParams.get('end');
  if (end && !ISO_DATE_RE.test(end)) {
    return { ok: false, error: 'invalid_end', hint: 'end must be YYYY, YYYY-MM, or YYYY-MM-DD (matched to frequency)' };
  }

  const requestedLength = parseInt(url.searchParams.get('length') ?? '100', 10);
  const length = Math.max(1, Math.min(Number.isFinite(requestedLength) ? requestedLength : 100, 5000));
  const requestedOffset = parseInt(url.searchParams.get('offset') ?? '0', 10);
  const offset = Math.max(0, Math.min(Number.isFinite(requestedOffset) ? requestedOffset : 0, 100000));

  // Facets are passed as repeated facets[key][] params. We collect them
  // verbatim to forward to EIA, with a strict allowlist on the value.
  const facets: Record<string, string[]> = {};
  for (const [key, val] of url.searchParams.entries()) {
    if (!FACET_KEY_RE.test(key)) continue;
    if (!FACET_VAL_RE.test(val)) {
      return {
        ok: false,
        error: 'invalid_facet',
        hint: `facet value "${val}" contains disallowed characters; use [A-Za-z0-9_.-]`,
      };
    }
    if (!facets[key]) facets[key] = [];
    facets[key].push(val);
  }

  // data[] columns. Default to "value" which is the universal column.
  const dataParam = url.searchParams.getAll('data');
  const data_columns = dataParam.length > 0 ? dataParam.slice(0, 5) : ['value'];
  for (const col of data_columns) {
    if (!FACET_VAL_RE.test(col)) {
      return {
        ok: false,
        error: 'invalid_data_column',
        hint: `data column "${col}" contains disallowed characters`,
      };
    }
  }

  return {
    ok: true,
    query: { route, frequency, start, end, length, offset, facets, data_columns },
  };
}

async function cacheKey(q: EIAQuery): Promise<string> {
  const facetParts: string[] = [];
  for (const [k, vs] of Object.entries(q.facets)) {
    facetParts.push(`${k}=${vs.slice().sort().join(',')}`);
  }
  facetParts.sort();
  const parts = [
    q.route,
    q.frequency,
    q.start ?? '',
    q.end ?? '',
    q.length,
    q.offset,
    q.data_columns.slice().sort().join(','),
    facetParts.join('|'),
  ].join('||');
  return `eia:q:${await sha256CacheKey(parts)}`;
}

function buildEIAUrl(q: EIAQuery, apiKey: string): string {
  const params = new URLSearchParams();
  params.set('api_key', apiKey);
  params.set('frequency', q.frequency);
  if (q.start) params.set('start', q.start);
  if (q.end) params.set('end', q.end);
  params.set('length', String(q.length));
  if (q.offset > 0) params.set('offset', String(q.offset));
  for (let i = 0; i < q.data_columns.length; i += 1) {
    params.append(`data[${i}]`, q.data_columns[i]);
  }
  for (const [key, vals] of Object.entries(q.facets)) {
    for (const v of vals) params.append(key, v);
  }
  // Sort by period DESC by default so the most recent observations come first.
  params.append('sort[0][column]', 'period');
  params.append('sort[0][direction]', 'desc');
  return `${EIA_BASE}/${q.route}/data/?${params.toString()}`;
}

export async function fetchEIASeries(env: Env, q: EIAQuery): Promise<EIAResult> {
  const fetched_at = new Date().toISOString();

  const apiKey = (env as unknown as { EIA_API_KEY?: string }).EIA_API_KEY;
  if (!apiKey) {
    return {
      ok: false,
      source: 'live',
      fetched_at,
      query: q,
      data: null,
      attribution: ATTRIBUTION,
      error: 'eia_key_unset',
      http_status: 503,
    };
  }

  const key = await cacheKey(q);
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
    resp = await fetch(buildEIAUrl(q, apiKey), {
      headers: {
        'User-Agent': 'TensorFeed/1.0 (https://tensorfeed.ai)',
        Accept: 'application/json',
      },
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
      error: `eia_fetch_failed: ${e instanceof Error ? e.message : String(e)}`,
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
      error: 'eia_upstream_rate_limited',
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
      error: `eia_http_${resp.status}`,
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
      error: 'eia_invalid_json',
    };
  }

  await writeEdgeCacheJSON(key, payload, TTL_QUERY);

  return {
    ok: true,
    source: 'live',
    fetched_at,
    query: q,
    data: payload,
    attribution: ATTRIBUTION,
  };
}

export const EIA_ATTRIBUTION = ATTRIBUTION;
