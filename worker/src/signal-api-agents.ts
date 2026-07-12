import type { Env } from './types';
import {
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
    const rows = await queryUsageFunnelByUa(env, windowDays);
    if (rows === null) return unavailable;
    const view = deriveApiAgentsView(rows);
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
