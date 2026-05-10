/**
 * NWS (National Weather Service) Active Weather Alerts ingest.
 *
 * NWS publishes a real-time stream of active US weather alerts: tornado
 * warnings, severe thunderstorm warnings, flood warnings, winter storm
 * warnings, heat advisories, fire weather watches, etc. The active-alerts
 * endpoint always returns the currently-in-effect set; expired alerts
 * fall off automatically.
 *
 * License: US Government work in the public domain (17 USC §105). NWS
 * publishes weather data without restriction. Commercial redistribution
 * permitted; the standard attribution block ships on every response.
 *
 * Architecture: pure lazy-proxy with KV cache. NWS rate limits politely
 * and the upstream is hardened, but TensorFeed traffic from Cloudflare's
 * shared IP space benefits from caching. NWS asks for a User-Agent
 * identifying the application; we send TensorFeed/1.0.
 *
 * Endpoint we proxy:
 *   https://api.weather.gov/alerts/active
 *
 * Coverage: US states, territories, and marine zones. NWS is US-only.
 */

import type { Env } from './types';

const NWS_BASE = 'https://api.weather.gov/alerts/active';

const VALID_SEVERITIES = new Set(['Extreme', 'Severe', 'Moderate', 'Minor', 'Unknown']);
const VALID_URGENCIES = new Set(['Immediate', 'Expected', 'Future', 'Past', 'Unknown']);
const VALID_STATUSES = new Set(['actual', 'exercise', 'system', 'test', 'draft']);

const STATE_RE = /^[A-Z]{2}$/;
const EVENT_RE = /^[A-Za-z][A-Za-z .'/\-,()]{1,80}$/;

const TTL_SECONDS = 60;
const DEFAULT_LIMIT = 50;
const MAX_LIMIT = 500;

const ATTRIBUTION = {
  source: 'NWS Active Weather Alerts (api.weather.gov)',
  source_url: 'https://www.weather.gov/documentation/services-web-api',
  publisher: 'NOAA / National Weather Service',
  license: 'US Government work in the public domain (17 USC §105)',
  redistribution: 'commercial-permitted',
  notice:
    'Active alerts only — expired alerts fall off automatically. Coverage is US states, territories, and marine zones; NWS does not cover international locations. Severity scale: Extreme | Severe | Moderate | Minor | Unknown. Use the web URL for the canonical NWS detail page; areas listed in areaDesc are NWS county or zone names.',
};

export interface NWSAlertsQuery {
  area: string | null;
  event: string | null;
  severity: string | null;
  urgency: string | null;
  status: string | null;
  limit: number;
}

export interface FlatNWSAlert {
  id: string;
  event: string | null;
  severity: string | null;
  urgency: string | null;
  certainty: string | null;
  headline: string | null;
  description: string | null;
  instruction: string | null;
  area_desc: string | null;
  sent: string | null;
  effective: string | null;
  onset: string | null;
  expires: string | null;
  ends: string | null;
  sender: string | null;
  sender_name: string | null;
  status: string | null;
  message_type: string | null;
  category: string | null;
  response: string | null;
  web: string | null;
}

export interface NWSAlertsResult {
  ok: boolean;
  source: 'cache' | 'live';
  fetched_at: string;
  query: NWSAlertsQuery;
  feed_metadata?: {
    title: string | null;
    updated: string | null;
    upstream_count: number;
  };
  alerts?: FlatNWSAlert[];
  attribution: typeof ATTRIBUTION;
  error?: string;
  hint?: string;
  http_status?: number;
}

export interface ParsedNWSAlertsQuery {
  ok: boolean;
  query?: NWSAlertsQuery;
  error?: string;
  hint?: string;
}

export function parseNWSAlertsQuery(url: URL): ParsedNWSAlertsQuery {
  const areaRaw = url.searchParams.get('area');
  const eventRaw = url.searchParams.get('event');
  const severityRaw = url.searchParams.get('severity');
  const urgencyRaw = url.searchParams.get('urgency');
  const statusRaw = url.searchParams.get('status');
  const limitRaw = url.searchParams.get('limit');

  let area: string | null = null;
  if (areaRaw !== null) {
    const upper = areaRaw.trim().toUpperCase();
    if (!STATE_RE.test(upper)) {
      return {
        ok: false,
        error: 'invalid_area',
        hint: 'area must be a 2-letter US state or territory code (CA, TX, PR, etc)',
      };
    }
    area = upper;
  }

  let event: string | null = null;
  if (eventRaw !== null) {
    const trimmed = eventRaw.trim();
    if (!EVENT_RE.test(trimmed)) {
      return {
        ok: false,
        error: 'invalid_event',
        hint: 'event must look like an NWS event name, e.g. "Tornado Warning", "Heat Advisory"',
      };
    }
    event = trimmed;
  }

  let severity: string | null = null;
  if (severityRaw !== null) {
    if (!VALID_SEVERITIES.has(severityRaw)) {
      return {
        ok: false,
        error: 'invalid_severity',
        hint: `severity must be one of: ${Array.from(VALID_SEVERITIES).join(', ')}`,
      };
    }
    severity = severityRaw;
  }

  let urgency: string | null = null;
  if (urgencyRaw !== null) {
    if (!VALID_URGENCIES.has(urgencyRaw)) {
      return {
        ok: false,
        error: 'invalid_urgency',
        hint: `urgency must be one of: ${Array.from(VALID_URGENCIES).join(', ')}`,
      };
    }
    urgency = urgencyRaw;
  }

  let status: string | null = null;
  if (statusRaw !== null) {
    if (!VALID_STATUSES.has(statusRaw)) {
      return {
        ok: false,
        error: 'invalid_status',
        hint: `status must be one of: ${Array.from(VALID_STATUSES).join(', ')}`,
      };
    }
    status = statusRaw;
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

  return { ok: true, query: { area, event, severity, urgency, status, limit } };
}

interface NWSFeature {
  id?: string;
  properties?: {
    id?: string;
    event?: string | null;
    severity?: string | null;
    urgency?: string | null;
    certainty?: string | null;
    headline?: string | null;
    description?: string | null;
    instruction?: string | null;
    areaDesc?: string | null;
    sent?: string | null;
    effective?: string | null;
    onset?: string | null;
    expires?: string | null;
    ends?: string | null;
    sender?: string | null;
    senderName?: string | null;
    status?: string | null;
    messageType?: string | null;
    category?: string | null;
    response?: string | null;
    web?: string | null;
  };
}

interface NWSFeed {
  title?: string | null;
  updated?: string | null;
  features?: NWSFeature[];
}

function flattenAlert(f: NWSFeature): FlatNWSAlert {
  const p = f.properties ?? {};
  return {
    id: p.id ?? f.id ?? '',
    event: p.event ?? null,
    severity: p.severity ?? null,
    urgency: p.urgency ?? null,
    certainty: p.certainty ?? null,
    headline: p.headline ?? null,
    description: p.description ?? null,
    instruction: p.instruction ?? null,
    area_desc: p.areaDesc ?? null,
    sent: p.sent ?? null,
    effective: p.effective ?? null,
    onset: p.onset ?? null,
    expires: p.expires ?? null,
    ends: p.ends ?? null,
    sender: p.sender ?? null,
    sender_name: p.senderName ?? null,
    status: p.status ?? null,
    message_type: p.messageType ?? null,
    category: p.category ?? null,
    response: p.response ?? null,
    web: p.web ?? null,
  };
}

function cacheKey(q: NWSAlertsQuery): string {
  const parts = [
    q.area ?? '_',
    q.event ?? '_',
    q.severity ?? '_',
    q.urgency ?? '_',
    q.status ?? '_',
  ];
  return `nws:alerts:${parts.join('|')}`;
}

function buildUrl(q: NWSAlertsQuery): string {
  const params = new URLSearchParams();
  if (q.area) params.set('area', q.area);
  if (q.event) params.set('event', q.event);
  if (q.severity) params.set('severity', q.severity);
  if (q.urgency) params.set('urgency', q.urgency);
  if (q.status) params.set('status', q.status);
  const qs = params.toString();
  return qs ? `${NWS_BASE}?${qs}` : NWS_BASE;
}

export async function fetchNWSAlerts(env: Env, q: NWSAlertsQuery): Promise<NWSAlertsResult> {
  const fetched_at = new Date().toISOString();
  const key = cacheKey(q);

  const cached = await env.TENSORFEED_CACHE.get<NWSFeed>(key, 'json');
  if (cached) {
    const features = cached.features ?? [];
    return {
      ok: true,
      source: 'cache',
      fetched_at,
      query: q,
      feed_metadata: {
        title: cached.title ?? null,
        updated: cached.updated ?? null,
        upstream_count: features.length,
      },
      alerts: features.slice(0, q.limit).map(flattenAlert),
      attribution: ATTRIBUTION,
    };
  }

  let resp: Response;
  try {
    resp = await fetch(buildUrl(q), {
      headers: {
        'User-Agent': 'TensorFeed/1.0 (https://tensorfeed.ai; contact: alerts@tensorfeed.ai)',
        Accept: 'application/geo+json',
      },
      signal: AbortSignal.timeout(15000),
    });
  } catch (e) {
    return {
      ok: false,
      source: 'live',
      fetched_at,
      query: q,
      attribution: ATTRIBUTION,
      error: `nws_fetch_failed: ${e instanceof Error ? e.message : String(e)}`,
    };
  }

  if (!resp.ok) {
    return {
      ok: false,
      source: 'live',
      fetched_at,
      query: q,
      attribution: ATTRIBUTION,
      error: `nws_http_${resp.status}`,
      http_status: resp.status,
    };
  }

  let payload: NWSFeed;
  try {
    payload = (await resp.json()) as NWSFeed;
  } catch {
    return {
      ok: false,
      source: 'live',
      fetched_at,
      query: q,
      attribution: ATTRIBUTION,
      error: 'nws_invalid_json',
    };
  }

  await env.TENSORFEED_CACHE.put(key, JSON.stringify(payload), { expirationTtl: TTL_SECONDS });

  const features = payload.features ?? [];
  return {
    ok: true,
    source: 'live',
    fetched_at,
    query: q,
    feed_metadata: {
      title: payload.title ?? null,
      updated: payload.updated ?? null,
      upstream_count: features.length,
    },
    alerts: features.slice(0, q.limit).map(flattenAlert),
    attribution: ATTRIBUTION,
  };
}

export const NWS_VALID_SEVERITIES = Array.from(VALID_SEVERITIES);
export const NWS_VALID_URGENCIES = Array.from(VALID_URGENCIES);
export const NWS_VALID_STATUSES = Array.from(VALID_STATUSES);
