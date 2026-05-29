/**
 * USGS Earthquakes ingest.
 *
 * USGS publishes a stream of pre-built GeoJSON summary feeds that bucket
 * recent seismic events by magnitude and time window. Updated every
 * minute. Maintained by the US Geological Survey.
 *
 * License: US Government work in the public domain (17 USC §105). USGS
 * publishes the feeds without restriction. Commercial redistribution
 * permitted; the standard attribution block ships on every response.
 *
 * Architecture: pure lazy-proxy with KV cache. USGS rate-limits politely
 * and the upstream pipeline is hardened, but TensorFeed's traffic from
 * Cloudflare's IP space is shared across many tenants, so caching is
 * load-bearing. Cache TTL scales with the feed's freshness window.
 *
 * Endpoint we proxy:
 *   https://earthquake.usgs.gov/earthquakes/feed/v1.0/summary/{magnitude}_{period}.geojson
 */

import type { Env } from './types';
import { readEdgeCacheJSON, writeEdgeCacheJSON } from './edge-cache';

const FEED_BASE = 'https://earthquake.usgs.gov/earthquakes/feed/v1.0/summary';

const VALID_MAGS = new Set(['significant', '4.5', '2.5', '1.0', 'all']);
const VALID_PERIODS = new Set(['hour', 'day', 'week', 'month']);

const TTL_BY_PERIOD: Record<string, number> = {
  hour: 60,
  day: 120,
  week: 300,
  month: 900,
};

const DEFAULT_LIMIT = 50;
const MAX_LIMIT = 500;

const ATTRIBUTION = {
  source: 'USGS Earthquake Hazards Program, Real-time Feed',
  source_url: 'https://earthquake.usgs.gov/earthquakes/feed/',
  publisher: 'United States Geological Survey',
  license: 'US Government work in the public domain (17 USC §105)',
  redistribution: 'commercial-permitted',
  notice:
    'Pre-built summary feeds. Magnitude buckets: significant | 4.5 | 2.5 | 1.0 | all. Period buckets: hour | day | week | month. Upstream feeds refresh every minute. Place strings and titles are USGS-authored; magnitude and depth are best estimates and may be revised after initial detection.',
};

export interface EarthquakeFeedQuery {
  magnitude: string;
  period: string;
  limit: number;
}

export interface FlatEarthquake {
  id: string;
  magnitude: number | null;
  magnitude_type: string | null;
  place: string | null;
  title: string | null;
  time: string | null;
  updated: string | null;
  depth_km: number | null;
  longitude: number | null;
  latitude: number | null;
  tsunami: boolean;
  significance: number | null;
  felt: number | null;
  alert: string | null;
  status: string | null;
  url: string | null;
}

export interface EarthquakeFeedResult {
  ok: boolean;
  source: 'cache' | 'live';
  fetched_at: string;
  query: EarthquakeFeedQuery;
  feed_metadata?: {
    title: string | null;
    generated: string | null;
    api_version: string | null;
    upstream_count: number;
  };
  earthquakes?: FlatEarthquake[];
  attribution: typeof ATTRIBUTION;
  error?: string;
  hint?: string;
  http_status?: number;
}

export interface ParsedEarthquakeQuery {
  ok: boolean;
  query?: EarthquakeFeedQuery;
  error?: string;
  hint?: string;
}

export function parseEarthquakeQuery(url: URL): ParsedEarthquakeQuery {
  const magnitude = (url.searchParams.get('magnitude') ?? '4.5').trim();
  const period = (url.searchParams.get('period') ?? 'day').trim();
  const limitRaw = url.searchParams.get('limit');

  if (!VALID_MAGS.has(magnitude)) {
    return {
      ok: false,
      error: 'invalid_magnitude',
      hint: `magnitude must be one of: ${Array.from(VALID_MAGS).join(', ')}`,
    };
  }
  if (!VALID_PERIODS.has(period)) {
    return {
      ok: false,
      error: 'invalid_period',
      hint: `period must be one of: ${Array.from(VALID_PERIODS).join(', ')}`,
    };
  }

  let limit = DEFAULT_LIMIT;
  if (limitRaw !== null) {
    const parsed = parseInt(limitRaw, 10);
    if (!Number.isFinite(parsed) || parsed < 1 || parsed > MAX_LIMIT) {
      return {
        ok: false,
        error: 'invalid_limit',
        hint: `limit must be an integer 1-${MAX_LIMIT}`,
      };
    }
    limit = parsed;
  }

  return { ok: true, query: { magnitude, period, limit } };
}

interface UsgsFeature {
  id?: string;
  properties?: {
    mag?: number | null;
    magType?: string | null;
    place?: string | null;
    time?: number | null;
    updated?: number | null;
    tsunami?: number | null;
    sig?: number | null;
    felt?: number | null;
    alert?: string | null;
    status?: string | null;
    url?: string | null;
    title?: string | null;
  };
  geometry?: {
    coordinates?: [number, number, number];
  };
}

interface UsgsFeed {
  metadata?: {
    title?: string | null;
    generated?: number | null;
    api?: string | null;
    count?: number | null;
  };
  features?: UsgsFeature[];
}

function flattenFeature(f: UsgsFeature): FlatEarthquake {
  const p = f.properties ?? {};
  const coords = f.geometry?.coordinates ?? [null, null, null];
  return {
    id: f.id ?? '',
    magnitude: typeof p.mag === 'number' ? p.mag : null,
    magnitude_type: typeof p.magType === 'string' ? p.magType : null,
    place: typeof p.place === 'string' ? p.place : null,
    title: typeof p.title === 'string' ? p.title : null,
    time: typeof p.time === 'number' ? new Date(p.time).toISOString() : null,
    updated: typeof p.updated === 'number' ? new Date(p.updated).toISOString() : null,
    depth_km: typeof coords[2] === 'number' ? coords[2] : null,
    longitude: typeof coords[0] === 'number' ? coords[0] : null,
    latitude: typeof coords[1] === 'number' ? coords[1] : null,
    tsunami: p.tsunami === 1,
    significance: typeof p.sig === 'number' ? p.sig : null,
    felt: typeof p.felt === 'number' ? p.felt : null,
    alert: typeof p.alert === 'string' ? p.alert : null,
    status: typeof p.status === 'string' ? p.status : null,
    url: typeof p.url === 'string' ? p.url : null,
  };
}

function cacheKey(q: EarthquakeFeedQuery): string {
  return `usgs:eq:${q.magnitude}_${q.period}`;
}

export async function fetchUSGSEarthquakes(
  env: Env,
  q: EarthquakeFeedQuery,
): Promise<EarthquakeFeedResult> {
  const fetched_at = new Date().toISOString();
  const key = cacheKey(q);

  const cached = await readEdgeCacheJSON<UsgsFeed>(key);
  if (cached) {
    const features = cached.features ?? [];
    return {
      ok: true,
      source: 'cache',
      fetched_at,
      query: q,
      feed_metadata: {
        title: cached.metadata?.title ?? null,
        generated:
          typeof cached.metadata?.generated === 'number'
            ? new Date(cached.metadata.generated).toISOString()
            : null,
        api_version: cached.metadata?.api ?? null,
        upstream_count: features.length,
      },
      earthquakes: features.slice(0, q.limit).map(flattenFeature),
      attribution: ATTRIBUTION,
    };
  }

  const feedUrl = `${FEED_BASE}/${q.magnitude}_${q.period}.geojson`;

  let resp: Response;
  try {
    resp = await fetch(feedUrl, {
      headers: { 'User-Agent': 'TensorFeed/1.0 (https://tensorfeed.ai)' },
      signal: AbortSignal.timeout(15000),
    });
  } catch (e) {
    return {
      ok: false,
      source: 'live',
      fetched_at,
      query: q,
      attribution: ATTRIBUTION,
      error: `usgs_fetch_failed: ${e instanceof Error ? e.message : String(e)}`,
    };
  }

  if (!resp.ok) {
    return {
      ok: false,
      source: 'live',
      fetched_at,
      query: q,
      attribution: ATTRIBUTION,
      error: `usgs_http_${resp.status}`,
      http_status: resp.status,
    };
  }

  let payload: UsgsFeed;
  try {
    payload = (await resp.json()) as UsgsFeed;
  } catch {
    return {
      ok: false,
      source: 'live',
      fetched_at,
      query: q,
      attribution: ATTRIBUTION,
      error: 'usgs_invalid_json',
    };
  }

  const ttl = TTL_BY_PERIOD[q.period] ?? 120;
  await writeEdgeCacheJSON(key, payload, ttl);

  const features = payload.features ?? [];
  return {
    ok: true,
    source: 'live',
    fetched_at,
    query: q,
    feed_metadata: {
      title: payload.metadata?.title ?? null,
      generated:
        typeof payload.metadata?.generated === 'number'
          ? new Date(payload.metadata.generated).toISOString()
          : null,
      api_version: payload.metadata?.api ?? null,
      upstream_count: features.length,
    },
    earthquakes: features.slice(0, q.limit).map(flattenFeature),
    attribution: ATTRIBUTION,
  };
}

export const USGS_VALID_MAGNITUDES = Array.from(VALID_MAGS);
export const USGS_VALID_PERIODS = Array.from(VALID_PERIODS);
