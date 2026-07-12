import type { Env } from './types';

// Private Signal analytics console: whole-zone traffic view sourced from the
// Cloudflare GraphQL Analytics API (httpRequestsAdaptiveGroups). Read-only and
// never-throw: any missing credential, network failure, or GraphQL error
// degrades to a fully zeroed response. Not public; the console is admin-gated
// upstream. Mirrors the AE read pattern in usage-meter (Bearer token, hard
// timeout, try/catch degrade), swapped to the GraphQL endpoint.

export interface SignalStatsResponse {
  version: string;
  fetchedAt: number;
  requests5m: number;
  requests1h: number;
  requests24h: number;
  uniqueVisitors24h: number;
  bandwidth24h: number;
  requests24hPrev: number;
  status2xx: number;
  status3xx: number;
  status4xx: number;
  status5xx: number;
  cacheHitRatio: number;
  topPath: string;
  topCountry: string;
  hourly: number[]; // length 24, oldest first
}

// Single zeroed shape reused for every graceful-degrade path. fetchedAt is
// stamped fresh so the console still shows a current timestamp when data is
// unavailable.
function zeroedSignalStats(): SignalStatsResponse {
  return {
    version: '1.0',
    fetchedAt: Date.now(),
    requests5m: 0,
    requests1h: 0,
    requests24h: 0,
    uniqueVisitors24h: 0,
    bandwidth24h: 0,
    requests24hPrev: 0,
    status2xx: 0,
    status3xx: 0,
    status4xx: 0,
    status5xx: 0,
    cacheHitRatio: 0,
    topPath: '',
    topCountry: '',
    hourly: new Array<number>(24).fill(0),
  };
}

// Minimal typed views of the GraphQL response. Every field is optional because
// the API may omit an empty group set, and the parse below tolerates missing
// nodes rather than trusting the shape.
interface AdaptiveGroup {
  count?: number;
  sum?: { edgeResponseBytes?: number };
  dimensions?: {
    edgeResponseStatus?: number;
    cacheStatus?: string;
    clientCountryName?: string;
    clientRequestPath?: string;
    datetimeHour?: string;
  };
}

// httpRequests1dGroups is a separate dataset that DOES expose uniq { uniques };
// the adaptive dataset does not. Used only for the unique-visitor count.
interface DailyUniqGroup {
  uniq?: { uniques?: number };
}

interface SignalStatsZone {
  overall?: AdaptiveGroup[];
  last1h?: AdaptiveGroup[];
  last5m?: AdaptiveGroup[];
  prev?: AdaptiveGroup[];
  byStatus?: AdaptiveGroup[];
  byCache?: AdaptiveGroup[];
  topCountry?: AdaptiveGroup[];
  topPath?: AdaptiveGroup[];
  hourly?: AdaptiveGroup[];
  uniques?: DailyUniqGroup[];
}

interface SignalStatsGraphQL {
  data?: { viewer?: { zones?: SignalStatsZone[] } };
  errors?: Array<{ message?: string }>;
}

// One request, several aliased group sets: the whole-zone 24h aggregate, the
// prior 24h (for the delta), the last 1h and 5m windows, status and cache
// breakdowns, the single top path and country, and 24 hourly buckets ordered
// oldest first. Variables carry every datetime; no untrusted value is ever
// interpolated into the query text.
const SIGNAL_STATS_QUERY = `query SignalStats($zone: string!, $since: string!, $until: string!, $prevSince: string!, $h1: string!, $m5: string!, $dSince: string!, $dUntil: string!) {
  viewer {
    zones(filter: { zoneTag: $zone }) {
      overall: httpRequestsAdaptiveGroups(limit: 1, filter: { datetime_geq: $since, datetime_leq: $until }) {
        count
        sum { edgeResponseBytes }
      }
      uniques: httpRequests1dGroups(limit: 2, filter: { date_geq: $dSince, date_leq: $dUntil }) {
        uniq { uniques }
      }
      last1h: httpRequestsAdaptiveGroups(limit: 1, filter: { datetime_geq: $h1, datetime_leq: $until }) { count }
      last5m: httpRequestsAdaptiveGroups(limit: 1, filter: { datetime_geq: $m5, datetime_leq: $until }) { count }
      prev: httpRequestsAdaptiveGroups(limit: 1, filter: { datetime_geq: $prevSince, datetime_leq: $since }) { count }
      byStatus: httpRequestsAdaptiveGroups(limit: 100, filter: { datetime_geq: $since, datetime_leq: $until }) {
        count
        dimensions { edgeResponseStatus }
      }
      byCache: httpRequestsAdaptiveGroups(limit: 100, filter: { datetime_geq: $since, datetime_leq: $until }) {
        count
        dimensions { cacheStatus }
      }
      topCountry: httpRequestsAdaptiveGroups(limit: 1, orderBy: [count_DESC], filter: { datetime_geq: $since, datetime_leq: $until }) {
        count
        dimensions { clientCountryName }
      }
      topPath: httpRequestsAdaptiveGroups(limit: 1, orderBy: [count_DESC], filter: { datetime_geq: $since, datetime_leq: $until }) {
        count
        dimensions { clientRequestPath }
      }
      hourly: httpRequestsAdaptiveGroups(limit: 24, orderBy: [datetimeHour_ASC], filter: { datetime_geq: $since, datetime_leq: $until }) {
        count
        dimensions { datetimeHour }
      }
    }
  }
}`;

// Cache statuses that represent a cacheable outcome. The hit ratio is computed
// over these only, so an uncacheable dynamic response never dilutes it.
const CACHEABLE_STATUSES = new Set(['hit', 'miss', 'expired', 'stale', 'revalidated', 'updating']);

// Assemble the whole-zone traffic snapshot from the GraphQL Analytics API.
// Degrades to a zeroed response on any missing credential, network failure, or
// GraphQL error. Never throws.
export async function buildSignalStats(env: Env): Promise<SignalStatsResponse> {
  if (!env.CF_ANALYTICS_TOKEN || !env.CF_ACCOUNT_ID || !env.CF_ZONE_TAG) {
    return zeroedSignalStats();
  }
  try {
    const now = Date.now();
    const H = 60 * 60 * 1000;
    const iso = (ms: number): string => new Date(ms).toISOString();
    const day = (ms: number): string => new Date(ms).toISOString().slice(0, 10);
    const variables = {
      zone: env.CF_ZONE_TAG,
      since: iso(now - 24 * H),
      until: iso(now),
      prevSince: iso(now - 48 * H),
      h1: iso(now - H),
      m5: iso(now - 5 * 60 * 1000),
      dSince: day(now - 24 * H),
      dUntil: day(now),
    };
    const resp = await fetch('https://api.cloudflare.com/client/v4/graphql', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${env.CF_ANALYTICS_TOKEN}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ query: SIGNAL_STATS_QUERY, variables }),
      signal: AbortSignal.timeout(15_000),
    });
    if (!resp.ok) return zeroedSignalStats();
    const json = (await resp.json()) as SignalStatsGraphQL;
    if (json.errors && json.errors.length > 0) return zeroedSignalStats();
    const zone = json.data?.viewer?.zones?.[0];
    if (!zone) return zeroedSignalStats();

    const num = (v: number | undefined): number =>
      typeof v === 'number' && Number.isFinite(v) ? v : 0;

    const overall = zone.overall?.[0];
    const requests24h = num(overall?.count);
    const bandwidth24h = num(overall?.sum?.edgeResponseBytes);
    // The adaptive dataset has no uniques field, so unique visitors come from
    // httpRequests1dGroups (daily-deduped). The rolling 24h window can straddle
    // two calendar days; take the busier day so the figure does not collapse to
    // near-zero right after UTC midnight.
    let uniqueVisitors24h = 0;
    for (const d of zone.uniques ?? []) {
      uniqueVisitors24h = Math.max(uniqueVisitors24h, num(d.uniq?.uniques));
    }
    const requests1h = num(zone.last1h?.[0]?.count);
    const requests5m = num(zone.last5m?.[0]?.count);
    const requests24hPrev = num(zone.prev?.[0]?.count);

    let status2xx = 0;
    let status3xx = 0;
    let status4xx = 0;
    let status5xx = 0;
    for (const row of zone.byStatus ?? []) {
      const s = num(row.dimensions?.edgeResponseStatus);
      const c = num(row.count);
      if (s >= 200 && s < 300) status2xx += c;
      else if (s >= 300 && s < 400) status3xx += c;
      else if (s >= 400 && s < 500) status4xx += c;
      else if (s >= 500) status5xx += c;
    }

    let cacheHits = 0;
    let cacheable = 0;
    for (const row of zone.byCache ?? []) {
      const st = String(row.dimensions?.cacheStatus ?? '').toLowerCase();
      const c = num(row.count);
      if (CACHEABLE_STATUSES.has(st)) {
        cacheable += c;
        if (st === 'hit') cacheHits += c;
      }
    }
    const cacheHitRatio = cacheable > 0 ? Math.round((cacheHits / cacheable) * 1000) / 10 : 0;

    // datetimeHour_ASC orders oldest first; slice the last 24 in case the API
    // returns a partial or over-length set, then fill positionally.
    const hourly = new Array<number>(24).fill(0);
    const hourRows = (zone.hourly ?? []).slice(-24);
    for (let i = 0; i < hourRows.length && i < 24; i += 1) {
      hourly[i] = num(hourRows[i].count);
    }

    return {
      version: '1.0',
      fetchedAt: now,
      requests5m,
      requests1h,
      requests24h,
      uniqueVisitors24h,
      bandwidth24h,
      requests24hPrev,
      status2xx,
      status3xx,
      status4xx,
      status5xx,
      cacheHitRatio,
      topPath: String(zone.topPath?.[0]?.dimensions?.clientRequestPath ?? ''),
      topCountry: String(zone.topCountry?.[0]?.dimensions?.clientCountryName ?? ''),
      hourly,
    };
  } catch {
    return zeroedSignalStats();
  }
}
