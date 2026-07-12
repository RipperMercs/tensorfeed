import type { Env } from './types';
import {
  CRAWLER_UA_FAMILIES,
  classifyUaFamily,
  deriveRealAgentFunnel,
  queryUsageFunnelByUa,
  type FunnelByUaRow,
} from './usage-meter';

// Private Signal console: agent traffic to the paid/backend API, sourced from
// the Worker's own tf_usage Analytics Engine dataset (one datapoint per tracked
// /api/* call). This is the coverage the page-side tf_signal panel structurally
// cannot see: every agent that talks to /api/premium/* or a tracked free feed
// hits the Worker, never Cloudflare Pages, so the middleware telemetry misses it.
//
// The read reuses the exact query and classifiers that power /api/admin/usage:
//   - queryUsageFunnelByUa: per-(endpoint, ua-family) paid / unpaid_402 / free,
//     external-only (TF's own internal callers excluded, NULL-tolerant).
//   - classifyUaFamily: separates real agents from x402 discovery crawlers.
//   - deriveRealAgentFunnel: the crawler-filtered endpoint demand map.
// Read-only and never-throw: a missing credential or query failure degrades to a
// zeroed, status:'unavailable' payload rather than raising. Not public; the
// console is session-gated upstream.

export interface ApiAgentRow {
  ua: string;
  kind: 'agent' | 'crawler';
  paid: number;
  unpaid402: number;
  free: number;
  total: number;
}

export interface ApiEndpointRow {
  endpoint: string;
  paid: number;
  unpaid402: number;
  free: number;
  conversion: number; // paid / (paid + unpaid402), 0..1
  // Movers (present when the daily trend query succeeds; 0 / [] on degrade):
  paidPrior: number; // paid in the equal-length window immediately before this one
  paidDelta: number; // paid (this window) - paid (prior window); the "is it climbing" signal
  dailyDemand: number[]; // crawler-filtered daily demand (paid + unpaid402), oldest to newest, one per window day
}

// Per-(endpoint, ua, day) daily row from tf_usage, used to build the movers
// delta and the demand sparkline. paid is inherently crawler-free (crawlers
// never pay); demand (paid + unpaid402) is crawler-filtered in JS.
export interface EndpointDailyRow {
  endpoint: string;
  ua: string;
  day: string; // YYYY-MM-DD (UTC)
  paid: number;
  demand: number;
}

export interface EndpointTrend {
  paidCurrent: number;
  paidPrior: number;
  paidDelta: number;
  dailyDemand: number[];
}

export interface ApiAgentTotals {
  calls: number;
  paid: number;
  unpaid402: number;
  free: number;
  realAgentCalls: number;
  crawlerCalls: number;
  distinctAgents: number; // distinct real-agent UA families (crawlers excluded)
}

export interface SignalApiAgentsResponse {
  version: string;
  fetchedAt: number;
  windowDays: number;
  status: 'ok' | 'unavailable';
  totals: ApiAgentTotals;
  agents: ApiAgentRow[]; // leaderboard, all callers tagged, top 25 by total calls
  endpoints: ApiEndpointRow[]; // real-agent demand map, top 25 by paid calls
}

const LEADERBOARD_LIMIT = 25;
const ENDPOINT_LIMIT = 25;

// Clamp a raw window value to a safe integer day count in [1, 30]. Default 7.
// The result is interpolated into the AE INTERVAL literal downstream, so it MUST
// be a bounded integer; any non-finite or out-of-range input falls back to 7.
export function clampApiAgentsDays(raw: string | number | null | undefined): number {
  const n = Math.floor(Number(raw));
  if (!Number.isFinite(n) || n < 1) return 7;
  return n > 30 ? 30 : n;
}

function zeroTotals(): ApiAgentTotals {
  return {
    calls: 0,
    paid: 0,
    unpaid402: 0,
    free: 0,
    realAgentCalls: 0,
    crawlerCalls: 0,
    distinctAgents: 0,
  };
}

// Pure aggregation over the per-(endpoint, ua) funnel rows. Collapses to a
// per-agent leaderboard (every caller, tagged agent vs crawler), a crawler-
// filtered endpoint demand map, and the roll-up totals. No I/O; unit-tested.
export function deriveApiAgentsView(rows: FunnelByUaRow[]): {
  totals: ApiAgentTotals;
  agents: ApiAgentRow[];
  endpoints: ApiEndpointRow[];
} {
  const byUa = new Map<string, { ua: string; paid: number; unpaid402: number; free: number }>();
  let paid = 0;
  let unpaid402 = 0;
  let free = 0;
  let realAgentCalls = 0;
  let crawlerCalls = 0;

  for (const r of rows) {
    const acc = byUa.get(r.ua) || { ua: r.ua, paid: 0, unpaid402: 0, free: 0 };
    acc.paid += r.paid;
    acc.unpaid402 += r.unpaid_402;
    acc.free += r.free_hits;
    byUa.set(r.ua, acc);

    paid += r.paid;
    unpaid402 += r.unpaid_402;
    free += r.free_hits;
    const calls = r.paid + r.unpaid_402 + r.free_hits;
    if (classifyUaFamily(r.ua) === 'crawler') crawlerCalls += calls;
    else realAgentCalls += calls;
  }

  const agents: ApiAgentRow[] = [...byUa.values()]
    .map((a) => ({
      ua: a.ua,
      kind: classifyUaFamily(a.ua),
      paid: a.paid,
      unpaid402: a.unpaid402,
      free: a.free,
      total: a.paid + a.unpaid402 + a.free,
    }))
    .sort((x, y) => y.total - x.total || y.paid - x.paid)
    .slice(0, LEADERBOARD_LIMIT);

  let distinctAgents = 0;
  for (const a of byUa.values()) {
    if (classifyUaFamily(a.ua) === 'agent') distinctAgents += 1;
  }

  const { real_agent_funnel } = deriveRealAgentFunnel(rows);
  const endpoints: ApiEndpointRow[] = real_agent_funnel.slice(0, ENDPOINT_LIMIT).map((e) => ({
    endpoint: e.endpoint,
    paid: e.paid,
    unpaid402: e.unpaid_402,
    free: e.free_hits,
    conversion: e.conversion,
    // Movers default to neutral; buildSignalApiAgents overwrites when the daily
    // trend query succeeds. A degrade leaves these at 0 / [] (no false signal).
    paidPrior: 0,
    paidDelta: 0,
    dailyDemand: [],
  }));

  return {
    totals: {
      calls: paid + unpaid402 + free,
      paid,
      unpaid402,
      free,
      realAgentCalls,
      crawlerCalls,
      distinctAgents,
    },
    agents,
    endpoints,
  };
}

// Pure: from per-(endpoint, ua, day) rows spanning the current and prior window,
// build each endpoint's paid delta (this window vs the prior equal-length window)
// and its crawler-filtered daily demand series for the current window. Crawlers
// are dropped here (paid is already crawler-free; demand must be filtered). nowMs
// is injected so the UTC day boundaries are deterministically testable.
export function deriveEndpointTrends(
  rows: EndpointDailyRow[],
  days: number,
  nowMs: number,
): Map<string, EndpointTrend> {
  const DAY_MS = 86_400_000;
  const startOfTodayUtc = Math.floor(nowMs / DAY_MS) * DAY_MS;
  const dayStr = (ms: number): string => new Date(ms).toISOString().slice(0, 10);

  // Current window: the most recent `days` UTC days, oldest to newest (today last).
  const currentDays: string[] = [];
  for (let i = days - 1; i >= 0; i -= 1) currentDays.push(dayStr(startOfTodayUtc - i * DAY_MS));
  // Prior window: the `days` UTC days immediately before the current window.
  const priorDays = new Set<string>();
  for (let i = 2 * days - 1; i >= days; i -= 1) priorDays.add(dayStr(startOfTodayUtc - i * DAY_MS));

  // endpoint -> day -> { paid, demand }, crawlers dropped.
  const byEndpoint = new Map<string, Map<string, { paid: number; demand: number }>>();
  for (const r of rows) {
    if (classifyUaFamily(r.ua) === 'crawler') continue;
    let m = byEndpoint.get(r.endpoint);
    if (!m) {
      m = new Map();
      byEndpoint.set(r.endpoint, m);
    }
    const slot = m.get(r.day) || { paid: 0, demand: 0 };
    slot.paid += r.paid;
    slot.demand += r.demand;
    m.set(r.day, slot);
  }

  const out = new Map<string, EndpointTrend>();
  for (const [endpoint, m] of byEndpoint) {
    const dailyDemand = currentDays.map((d) => m.get(d)?.demand ?? 0);
    let paidCurrent = 0;
    for (const d of currentDays) paidCurrent += m.get(d)?.paid ?? 0;
    let paidPrior = 0;
    for (const d of priorDays) paidPrior += m.get(d)?.paid ?? 0;
    out.set(endpoint, { paidCurrent, paidPrior, paidDelta: paidCurrent - paidPrior, dailyDemand });
  }
  return out;
}

// Big crawlers are pre-filtered in SQL so their high-volume rows do not crowd out
// real-agent rows under the row cap; the remaining substring-matched crawlers are
// dropped in deriveEndpointTrends. CRAWLER_UA_FAMILIES is a fixed set of known
// identifiers (no user input), so interpolating it is injection-safe.
const CRAWLER_IN_LIST = [...CRAWLER_UA_FAMILIES].map((f) => `'${f}'`).join(',');

// AE SQL read at (endpoint, ua, day) grain over the current + prior window, with
// paid and demand (paid + unpaid402) sums. Returns null on any failure. Never
// throws. Feeds deriveEndpointTrends.
async function queryEndpointDaily(env: Env, totalDays: number): Promise<EndpointDailyRow[] | null> {
  if (!env.CF_ANALYTICS_TOKEN || !env.CF_ACCOUNT_ID) return null;
  try {
    const sql = `SELECT blob1 AS endpoint, blob5 AS ua, toDate(timestamp) AS day,
      sum(if(blob3='paid',1,0)) AS paid,
      sum(if(blob3='paid' OR blob3='unpaid_402',1,0)) AS demand
      FROM tf_usage
      WHERE timestamp > now() - INTERVAL '${totalDays}' DAY
        AND (blob7 IS NULL OR blob7 != '1')
        AND blob5 NOT IN (${CRAWLER_IN_LIST})
      GROUP BY endpoint, ua, day ORDER BY day DESC LIMIT 8000`;
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
    const json = (await resp.json()) as {
      data?: Array<{ endpoint: string; ua: string; day: string; paid: number; demand: number }>;
    };
    return (json.data || []).map((r) => ({
      endpoint: String(r.endpoint),
      ua: String(r.ua),
      day: String(r.day).slice(0, 10),
      paid: Number(r.paid),
      demand: Number(r.demand),
    }));
  } catch {
    return null;
  }
}

// Assemble the API-agent snapshot over the last `days` days from tf_usage.
// Degrades to a zeroed, status:'unavailable' payload when the AE credentials are
// absent or the query fails. Never throws.
export async function buildSignalApiAgents(env: Env, days: number): Promise<SignalApiAgentsResponse> {
  const windowDays = clampApiAgentsDays(days);
  const unavailable: SignalApiAgentsResponse = {
    version: '1.0',
    fetchedAt: Date.now(),
    windowDays,
    status: 'unavailable',
    totals: zeroTotals(),
    agents: [],
    endpoints: [],
  };
  try {
    // Two independent AE reads in parallel: the window funnel (agents, endpoints,
    // totals) and the daily trend (movers delta + demand sparkline).
    const [rows, daily] = await Promise.all([
      queryUsageFunnelByUa(env, windowDays),
      queryEndpointDaily(env, windowDays * 2),
    ]);
    if (rows === null) return unavailable;
    const view = deriveApiAgentsView(rows);
    // Merge movers onto each endpoint when the daily query succeeded; a failure
    // leaves the neutral defaults so the panel still renders without trend badges.
    if (daily) {
      const trends = deriveEndpointTrends(daily, windowDays, Date.now());
      for (const e of view.endpoints) {
        const tr = trends.get(e.endpoint);
        if (tr) {
          e.paidPrior = tr.paidPrior;
          e.paidDelta = tr.paidDelta;
          e.dailyDemand = tr.dailyDemand;
        }
      }
    }
    return {
      version: '1.0',
      fetchedAt: Date.now(),
      windowDays,
      status: 'ok',
      ...view,
    };
  } catch {
    return unavailable;
  }
}
