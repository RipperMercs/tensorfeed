/**
 * EPSS (Exploit Prediction Scoring System) ingest.
 *
 * EPSS publishes a daily probability score (0 to 1) for every CVE
 * estimating the likelihood of exploitation in the next 30 days, plus
 * a percentile rank within the corpus. Maintained by the EPSS Special
 * Interest Group at FIRST.org. ~330K CVEs scored, refreshed daily.
 *
 * License: EPSS data is free for any use per FIRST.org's published
 * policy. Commercial redistribution explicitly permitted; the
 * attribution block is attached to every response.
 *
 * Architecture: pure lazy-proxy. FIRST.org's API exposes:
 *   - `?cve={id}` for one CVE's current score
 *   - `?cve={id}&scope=time-series` for one CVE's full history
 *   - `?order=!epss&limit=N` for top-N highest scores
 *   - `?date=YYYY-MM-DD&order=!epss&limit=N` for top-N as of date
 *
 * We cache responses in KV with TTLs sized to the underlying volatility:
 * 24h for current single-CVE and series (history is mostly immutable
 * but the trailing edge updates daily), 6h for top-N current (active
 * exploitation can shift the leaderboard), 7d for top-N historical.
 */

import type { Env } from './types';

const FIRST_API_BASE = 'https://api.first.org/data/v1/epss';

const EPSS_CURRENT_KEY = (cveId: string) => `epss:current:${cveId}`;
const EPSS_SERIES_KEY = (cveId: string) => `epss:series:${cveId}`;
const EPSS_TOP_CURRENT_KEY = (limit: number) => `epss:top:current:${limit}`;
const EPSS_TOP_HISTORICAL_KEY = (date: string, limit: number) =>
  `epss:top:date:${date}:${limit}`;

const TTL_CURRENT = 24 * 60 * 60;
const TTL_SERIES = 24 * 60 * 60;
const TTL_TOP_CURRENT = 6 * 60 * 60;
const TTL_TOP_HISTORICAL = 7 * 24 * 60 * 60;

const ATTRIBUTION = {
  source: 'EPSS (Exploit Prediction Scoring System)',
  source_url: 'https://www.first.org/epss/',
  publisher: 'FIRST.org EPSS Special Interest Group',
  license: 'Free for any use per FIRST.org policy',
  redistribution: 'commercial-permitted',
  notice:
    'EPSS scores are updated daily. The probability is the estimated likelihood of exploitation in the next 30 days. Percentile is the rank within the EPSS corpus on that date.',
};

const CVE_ID_RE = /^CVE-\d{4}-\d{4,7}$/i;

export function normalizeCVEId(input: string): string | null {
  if (!input) return null;
  const trimmed = input.trim().toUpperCase();
  return CVE_ID_RE.test(trimmed) ? trimmed : null;
}

interface EPSSPoint {
  cve?: string;
  epss?: string;
  percentile?: string;
  date?: string;
}

interface EPSSEnvelope {
  status?: string;
  total?: number;
  data?: EPSSPoint[];
}

interface EPSSWithSeries extends EPSSPoint {
  'time-series'?: { epss?: string; percentile?: string; date?: string }[];
}

export interface EPSSCurrentResult {
  ok: boolean;
  cve_id: string;
  source: 'cache' | 'live' | 'not_found';
  fetched_at: string;
  data: EPSSPoint | null;
  attribution: typeof ATTRIBUTION;
  error?: string;
}

export interface EPSSSeriesResult {
  ok: boolean;
  cve_id: string;
  source: 'cache' | 'live' | 'not_found';
  fetched_at: string;
  data: EPSSWithSeries | null;
  attribution: typeof ATTRIBUTION;
  error?: string;
}

export interface EPSSTopResult {
  ok: boolean;
  source: 'cache' | 'live';
  fetched_at: string;
  date: string | null;
  count: number;
  data: EPSSPoint[];
  attribution: typeof ATTRIBUTION;
  error?: string;
}

async function fetchFirstEPSS(qs: string): Promise<EPSSEnvelope | null> {
  let resp: Response;
  try {
    resp = await fetch(`${FIRST_API_BASE}?${qs}`, {
      headers: { 'User-Agent': 'TensorFeed/1.0 (https://tensorfeed.ai)' },
      signal: AbortSignal.timeout(15000),
    });
  } catch {
    return null;
  }
  if (!resp.ok) return null;
  try {
    return (await resp.json()) as EPSSEnvelope;
  } catch {
    return null;
  }
}

export async function fetchEPSSCurrent(env: Env, cveId: string): Promise<EPSSCurrentResult> {
  const fetched_at = new Date().toISOString();
  const id = normalizeCVEId(cveId);
  if (!id) {
    return {
      ok: false,
      cve_id: cveId,
      source: 'not_found',
      fetched_at,
      data: null,
      attribution: ATTRIBUTION,
      error: 'invalid_cve_id',
    };
  }

  const cached = await env.TENSORFEED_CACHE.get<EPSSPoint>(EPSS_CURRENT_KEY(id), 'json');
  if (cached) {
    return { ok: true, cve_id: id, source: 'cache', fetched_at, data: cached, attribution: ATTRIBUTION };
  }

  const envelope = await fetchFirstEPSS(`cve=${encodeURIComponent(id)}`);
  if (!envelope) {
    return {
      ok: false,
      cve_id: id,
      source: 'not_found',
      fetched_at,
      data: null,
      attribution: ATTRIBUTION,
      error: 'first_api_unavailable',
    };
  }
  const point = envelope.data?.[0];
  if (!point) {
    return {
      ok: false,
      cve_id: id,
      source: 'not_found',
      fetched_at,
      data: null,
      attribution: ATTRIBUTION,
      error: 'cve_not_in_epss',
    };
  }

  await env.TENSORFEED_CACHE.put(EPSS_CURRENT_KEY(id), JSON.stringify(point), {
    expirationTtl: TTL_CURRENT,
  });

  return { ok: true, cve_id: id, source: 'live', fetched_at, data: point, attribution: ATTRIBUTION };
}

export async function fetchEPSSSeries(env: Env, cveId: string): Promise<EPSSSeriesResult> {
  const fetched_at = new Date().toISOString();
  const id = normalizeCVEId(cveId);
  if (!id) {
    return {
      ok: false,
      cve_id: cveId,
      source: 'not_found',
      fetched_at,
      data: null,
      attribution: ATTRIBUTION,
      error: 'invalid_cve_id',
    };
  }

  const cached = await env.TENSORFEED_CACHE.get<EPSSWithSeries>(EPSS_SERIES_KEY(id), 'json');
  if (cached) {
    return { ok: true, cve_id: id, source: 'cache', fetched_at, data: cached, attribution: ATTRIBUTION };
  }

  const envelope = await fetchFirstEPSS(`cve=${encodeURIComponent(id)}&scope=time-series`);
  if (!envelope) {
    return {
      ok: false,
      cve_id: id,
      source: 'not_found',
      fetched_at,
      data: null,
      attribution: ATTRIBUTION,
      error: 'first_api_unavailable',
    };
  }
  const point = envelope.data?.[0] as EPSSWithSeries | undefined;
  if (!point) {
    return {
      ok: false,
      cve_id: id,
      source: 'not_found',
      fetched_at,
      data: null,
      attribution: ATTRIBUTION,
      error: 'cve_not_in_epss',
    };
  }

  await env.TENSORFEED_CACHE.put(EPSS_SERIES_KEY(id), JSON.stringify(point), {
    expirationTtl: TTL_SERIES,
  });

  return { ok: true, cve_id: id, source: 'live', fetched_at, data: point, attribution: ATTRIBUTION };
}

export async function fetchEPSSTop(
  env: Env,
  limit: number,
  date: string | null,
): Promise<EPSSTopResult> {
  const fetched_at = new Date().toISOString();
  const cappedLimit = Math.max(1, Math.min(limit, 100));
  const cacheKey = date
    ? EPSS_TOP_HISTORICAL_KEY(date, cappedLimit)
    : EPSS_TOP_CURRENT_KEY(cappedLimit);
  const ttl = date ? TTL_TOP_HISTORICAL : TTL_TOP_CURRENT;

  const cached = await env.TENSORFEED_CACHE.get<EPSSPoint[]>(cacheKey, 'json');
  if (cached) {
    return {
      ok: true,
      source: 'cache',
      fetched_at,
      date,
      count: cached.length,
      data: cached,
      attribution: ATTRIBUTION,
    };
  }

  const params = new URLSearchParams();
  params.set('order', '!epss');
  params.set('limit', String(cappedLimit));
  if (date) params.set('date', date);

  const envelope = await fetchFirstEPSS(params.toString());
  if (!envelope) {
    return {
      ok: false,
      source: 'live',
      fetched_at,
      date,
      count: 0,
      data: [],
      attribution: ATTRIBUTION,
      error: 'first_api_unavailable',
    };
  }
  const data = envelope.data ?? [];
  await env.TENSORFEED_CACHE.put(cacheKey, JSON.stringify(data), { expirationTtl: ttl });

  return {
    ok: true,
    source: 'live',
    fetched_at,
    date,
    count: data.length,
    data,
    attribution: ATTRIBUTION,
  };
}

export const EPSS_ATTRIBUTION = ATTRIBUTION;
