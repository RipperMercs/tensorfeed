import type { Env } from './types';
import { getRollup } from './payments';

export type UsageTier = 'free' | 'premium';
export type UsageOutcome = 'paid' | 'unpaid_402' | 'served_free' | 'error';

export interface UsageEvent {
  path: string;
  tier: UsageTier;
  outcome: UsageOutcome;
  wallet?: string;
  ua: string;
  country?: string;
  credits?: number;
  internal?: boolean;
}

// All /api/premium/* is always tracked. Every other /api/* read is tracked for
// per-endpoint demand visibility EXCEPT these operational families (admin, ops,
// health, internal, cron, cache, the refresh trigger), which are not external
// demand. Denylist not allowlist, so new free feeds are metered automatically.
const UNTRACKED_FREE_PREFIXES = [
  '/api/admin', '/api/internal', '/api/refresh', '/api/ping', '/api/health',
];

export function normalizeUaFamily(ua: string): string {
  if (!ua) return 'unknown';
  // Take the token before the first slash or space, lowercased, bounded length.
  const head = ua.split(/[/\s]/)[0].toLowerCase().trim();
  return head ? head.slice(0, 40) : 'unknown';
}

// Pure: is this request one of TensorFeed's own automated callers? True only
// when the shared secret is configured AND the request's X-TF-Internal header
// value equals it. When the secret is unset, nothing is ever internal.
export function isInternalTraffic(headerValue: string | null, key: string | undefined): boolean {
  return !!key && headerValue === key;
}

// Pure: decide whether a request is metered, and how. Returns null to skip.
export function deriveUsageEvent(path: string, status: number, charged: boolean): UsageEvent | null {
  const isPremium = path.startsWith('/api/premium/');
  const isFreeApi = !isPremium && path.startsWith('/api/');
  const isUntracked = path.startsWith('/api/__') || UNTRACKED_FREE_PREFIXES.some((p) => path === p || path.startsWith(p + '/') || path.startsWith(p + '?'));
  const isTrackedFree = isFreeApi && !isUntracked;
  if (!isPremium && !isTrackedFree) return null;

  const tier: UsageTier = isPremium ? 'premium' : 'free';
  let outcome: UsageOutcome;
  if (status === 402) outcome = 'unpaid_402';
  else if (status >= 200 && status < 300) outcome = charged ? 'paid' : 'served_free';
  else outcome = 'error';

  return { path, tier, outcome, ua: '' };
}

// Best-effort AE write. Never throws; never blocks a response.
export function recordUsageEvent(env: Env, evt: UsageEvent): void {
  try {
    if (!env.USAGE_AE) return;
    env.USAGE_AE.writeDataPoint({
      indexes: [evt.path],
      blobs: [
        evt.path,
        evt.tier,
        evt.outcome,
        evt.wallet ?? '',
        normalizeUaFamily(evt.ua),
        evt.country ?? '',
        evt.internal ? '1' : '0',
      ],
      doubles: [evt.credits ?? 0],
    });
  } catch {
    // swallow: telemetry must never affect the response path
  }
}

// === Private admin usage view ===
//
// The admin view reads the KV paid summary directly (cheap, low volume) and
// queries Analytics Engine for the high-volume funnel. The AE read degrades
// gracefully: when no CF API token is provisioned the view still returns the
// paid summary and marks the funnel "unavailable". Never public: the demand
// map is a competitive brief (see repo content rules).

// Read-only shapes for the fields buildUsageReport consumes off the daily
// rollup. The rollup is owned by payments.ts; we read it via getRollup and
// only depend on these fields, so the meter stays decoupled from the full
// payments rollup type.
interface RollupEndpointSlot {
  calls: number;
  credits_charged: number;
  first_seen: string;
  last_seen: string;
  distinct_payers?: number;
}

interface RollupPayerSlot {
  calls: number;
  credits_charged: number;
  first_seen: string;
  last_seen: string;
}

interface ReadRollup {
  by_endpoint?: Record<string, RollupEndpointSlot>;
  top_payers?: Record<string, RollupPayerSlot>;
}

export interface UsageReport {
  window: string;
  top_paid_endpoints: Array<{
    endpoint: string;
    paid_calls: number;
    credits_charged: number;
    distinct_payers: number;
    last_seen: string;
  }>;
  top_payers: Array<{ wallet: string; calls: number; credits_charged: number }>;
  funnel_by_endpoint:
    | Array<{ endpoint: string; free_hits: number; unpaid_402: number; paid: number; conversion: number }>
    | null;
  build_targets: Array<{ endpoint: string; reason: string }>;
  funnel_status: 'ok' | 'unavailable';
}

// Map a window label to a day count. Anything other than 7d/30d is "today".
function windowDays(window: string): number {
  return window === '30d' ? 30 : window === '7d' ? 7 : 1;
}

// Read the dated rollups covering the window (today back N-1 days). Missing
// days are simply skipped (getRollup returns null for a day with no data).
async function readRollupsForWindow(env: Env, days: number): Promise<ReadRollup[]> {
  const out: ReadRollup[] = [];
  const base = Date.now();
  for (let i = 0; i < days; i += 1) {
    const date = new Date(base - i * 24 * 60 * 60 * 1000).toISOString().slice(0, 10);
    const r = (await getRollup(env, date)) as ReadRollup | null;
    if (r) out.push(r);
  }
  return out;
}

// Sum the per-endpoint paid slots across the window's rollups.
function mergeByEndpoint(rollups: ReadRollup[]): Record<string, RollupEndpointSlot> {
  const merged: Record<string, RollupEndpointSlot> = {};
  for (const r of rollups) {
    for (const [endpoint, slot] of Object.entries(r.by_endpoint || {})) {
      const acc = merged[endpoint] || {
        calls: 0,
        credits_charged: 0,
        first_seen: slot.first_seen,
        last_seen: slot.last_seen,
        distinct_payers: 0,
      };
      acc.calls += slot.calls || 0;
      acc.credits_charged += slot.credits_charged || 0;
      acc.distinct_payers = (acc.distinct_payers || 0) + (slot.distinct_payers || 0);
      if (slot.first_seen < acc.first_seen) acc.first_seen = slot.first_seen;
      if (slot.last_seen > acc.last_seen) acc.last_seen = slot.last_seen;
      merged[endpoint] = acc;
    }
  }
  return merged;
}

// Sum per-wallet paid totals across the window, sorted by credits desc.
function mergePayers(rollups: ReadRollup[]): Array<{ wallet: string; calls: number; credits_charged: number }> {
  const merged: Record<string, { calls: number; credits_charged: number }> = {};
  for (const r of rollups) {
    for (const [wallet, slot] of Object.entries(r.top_payers || {})) {
      const acc = merged[wallet] || { calls: 0, credits_charged: 0 };
      acc.calls += slot.calls || 0;
      acc.credits_charged += slot.credits_charged || 0;
      merged[wallet] = acc;
    }
  }
  return Object.entries(merged)
    .map(([wallet, v]) => ({ wallet, calls: v.calls, credits_charged: v.credits_charged }))
    .sort((a, b) => b.credits_charged - a.credits_charged);
}

// Decide what to build more of. Two signals, both AE-funnel-derived:
//   1. High demand, low conversion: many 402 probes but few paid. The
//      endpoint is wanted but the price/quality/promo is off.
//   2. Hot free endpoint: heavy free traffic, a premiumization candidate.
// When the funnel is null (no AE token), there is nothing to derive, so this
// returns an empty array (the paid summary still ships).
function deriveBuildTargets(
  funnel: UsageReport['funnel_by_endpoint'],
): Array<{ endpoint: string; reason: string }> {
  if (!funnel) return [];
  const targets: Array<{ endpoint: string; reason: string }> = [];
  for (const f of funnel) {
    if (f.unpaid_402 >= 5 && f.conversion < 0.2) {
      targets.push({ endpoint: f.endpoint, reason: 'high demand, low conversion (improve/price/promote)' });
    }
  }
  const hotFree = funnel
    .filter((f) => f.free_hits > 0)
    .sort((a, b) => b.free_hits - a.free_hits)
    .slice(0, 5);
  for (const f of hotFree) {
    targets.push({ endpoint: f.endpoint, reason: 'hot free endpoint (premiumization candidate)' });
  }
  return targets;
}

// Reads the day rollup(s) for the window from KV and shapes the paid summary,
// then layers on the AE funnel when a token is present. window: today|7d|30d.
export async function buildUsageReport(env: Env, window: string): Promise<UsageReport> {
  const days = windowDays(window);
  const rollups = await readRollupsForWindow(env, days);
  const byEndpoint = mergeByEndpoint(rollups);

  const top_paid_endpoints = Object.entries(byEndpoint)
    .map(([endpoint, v]) => ({
      endpoint,
      paid_calls: v.calls,
      credits_charged: v.credits_charged,
      distinct_payers: v.distinct_payers || 0,
      last_seen: v.last_seen,
    }))
    .sort((a, b) => b.credits_charged - a.credits_charged)
    .slice(0, 25);

  const top_payers = mergePayers(rollups).slice(0, 25);

  let funnel_by_endpoint: UsageReport['funnel_by_endpoint'] = null;
  let funnel_status: UsageReport['funnel_status'] = 'unavailable';
  const funnel = await queryUsageFunnel(env, days);
  if (funnel) {
    funnel_by_endpoint = funnel;
    funnel_status = 'ok';
  }

  const build_targets = deriveBuildTargets(funnel_by_endpoint);
  return { window, top_paid_endpoints, top_payers, funnel_by_endpoint, build_targets, funnel_status };
}

// Request-health threshold: a request that completes slower than this many ms
// is recorded as a slow-path signal (the proxy for a path approaching the
// gateway-timeout 504, which a hung worker can never self-report).
export const SLOW_MS = 5000;

// Best-effort AE write for request health. Writes ONE datapoint only when the
// request returned a 5xx OR completed slower than SLOW_MS; otherwise no-op.
// Never throws, never blocks. path goes in indexes; status, ua-family and the
// UTC date in blobs; duration in doubles. A true gateway-timeout 504 (worker
// hung, never returned) cannot be recorded here.
export function recordRequestHealth(env: Env, path: string, status: number, ua: string, durationMs: number): void {
  if (status < 500 && durationMs <= SLOW_MS) return;
  try {
    if (!env.REQUEST_HEALTH_AE) return;
    env.REQUEST_HEALTH_AE.writeDataPoint({
      indexes: [path.slice(0, 96)],
      blobs: [String(status), normalizeUaFamily(ua), new Date().toISOString().slice(0, 10)],
      doubles: [durationMs],
    });
  } catch {
    // swallow: telemetry must never affect the response path
  }
}

export interface RequestHealthReport {
  window: string;
  slow_ms: number;
  top_5xx_by_path: Array<{ path: string; status: string; hits: number; max_ms: number }> | null;
  top_slow_by_path: Array<{ path: string; slow_hits: number; avg_ms: number; max_ms: number }> | null;
  status: 'ok' | 'unavailable';
}

// AE SQL read for the admin request-health view. Degrades gracefully to
// "unavailable" (null arrays) when the token/account id are absent or a query
// fails. Never throws. Mirrors queryUsageFunnel.
export async function queryRequestHealth(env: Env, days: number): Promise<RequestHealthReport> {
  const base: RequestHealthReport = { window: `${days}d`, slow_ms: SLOW_MS, top_5xx_by_path: null, top_slow_by_path: null, status: 'unavailable' };
  if (!env.CF_ANALYTICS_TOKEN || !env.CF_ACCOUNT_ID) return base;
  const run = async (sql: string): Promise<Array<Record<string, unknown>> | null> => {
    try {
      const resp = await fetch(
        `https://api.cloudflare.com/client/v4/accounts/${env.CF_ACCOUNT_ID}/analytics_engine/sql`,
        {
          method: 'POST',
          headers: { Authorization: `Bearer ${env.CF_ANALYTICS_TOKEN}`, 'Content-Type': 'text/plain' },
          body: sql,
          signal: AbortSignal.timeout(15_000),
        },
      );
      if (!resp.ok) return null;
      const json = (await resp.json()) as { data?: Array<Record<string, unknown>> };
      return json.data ?? null;
    } catch {
      return null;
    }
  };
  const fivexxSql = `SELECT index1 AS path, blob1 AS status, SUM(_sample_interval) AS hits, MAX(double1) AS max_ms FROM tf_request_health WHERE timestamp > now() - INTERVAL '${days}' DAY AND blob1 >= '500' GROUP BY path, status ORDER BY hits DESC LIMIT 100`;
  const slowSql = `SELECT index1 AS path, SUM(_sample_interval) AS slow_hits, AVG(double1) AS avg_ms, MAX(double1) AS max_ms FROM tf_request_health WHERE timestamp > now() - INTERVAL '${days}' DAY AND double1 > ${SLOW_MS} GROUP BY path ORDER BY slow_hits DESC LIMIT 50`;
  const [fivexx, slow] = await Promise.all([run(fivexxSql), run(slowSql)]);
  if (fivexx === null && slow === null) return base;
  return {
    window: `${days}d`,
    slow_ms: SLOW_MS,
    top_5xx_by_path: fivexx ? fivexx.map((r) => ({ path: String(r.path), status: String(r.status), hits: Number(r.hits), max_ms: Number(r.max_ms) })) : null,
    top_slow_by_path: slow ? slow.map((r) => ({ path: String(r.path), slow_hits: Number(r.slow_hits), avg_ms: Number(r.avg_ms), max_ms: Number(r.max_ms) })) : null,
    status: 'ok',
  };
}

// Analytics Engine SQL read. Returns null (graceful degrade) when the token or
// account id are absent, or when the query fails. Never throws. The funnel is
// external-only: events tagged internal (blob7 = '1', TF's own automated
// callers carrying X-TF-Internal) are excluded so the funnel measures external
// agent demand, not TF's own smoke / test / integration traffic. The exclusion
// is NULL-tolerant: events written before blob7 existed (blob7 absent or empty)
// still count, so the funnel never silently drops historical data points.
export async function queryUsageFunnel(
  env: Env,
  days: number,
): Promise<UsageReport['funnel_by_endpoint']> {
  if (!env.CF_ANALYTICS_TOKEN || !env.CF_ACCOUNT_ID) return null;
  try {
    const sql = `SELECT blob1 AS endpoint,
      sum(if(blob3='served_free',1,0)) AS free_hits,
      sum(if(blob3='unpaid_402',1,0)) AS unpaid_402,
      sum(if(blob3='paid',1,0)) AS paid
      FROM tf_usage WHERE timestamp > now() - INTERVAL '${days}' DAY AND (blob7 IS NULL OR blob7 != '1') GROUP BY endpoint ORDER BY paid DESC LIMIT 100`;
    const resp = await fetch(
      `https://api.cloudflare.com/client/v4/accounts/${env.CF_ACCOUNT_ID}/analytics_engine/sql`,
      {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${env.CF_ANALYTICS_TOKEN}`,
          'Content-Type': 'text/plain',
        },
        body: sql,
        signal: AbortSignal.timeout(15_000),
      },
    );
    if (!resp.ok) return null;
    const json = (await resp.json()) as {
      data?: Array<{ endpoint: string; free_hits: number; unpaid_402: number; paid: number }>;
    };
    return (json.data || []).map((r) => {
      const paid = Number(r.paid);
      const unpaid = Number(r.unpaid_402);
      const denom = paid + unpaid;
      return {
        endpoint: r.endpoint,
        free_hits: Number(r.free_hits),
        unpaid_402: unpaid,
        paid,
        conversion: denom > 0 ? paid / denom : 0,
      };
    });
  } catch {
    return null;
  }
}
