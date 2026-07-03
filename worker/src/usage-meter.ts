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

// Known x402-ecosystem discovery crawlers, uptime monitors, and directory
// indexers that walk our manifest on a schedule. These dominate the raw 402
// funnel (CarbonMonitor alone is tens of thousands per week) but never pay, so
// counting them as "demand" is how the build-target heuristic gets misled.
const CRAWLER_UA_FAMILIES = new Set<string>([
  'carbonmonitor', 'x402station', 'x402-observer', 'mako-pulse-prober',
  'lion-probe', 'dexter-verifier', 'ari-indexer', 'ioi-indexer',
  'mpp32-health', 'nitrograph-healthcheck', 'coinbasebazaardiscovery', 'weftsearchbot',
]);

// Self-identifying probe/monitor/indexer signals for forward compatibility with
// new bots that follow the same naming. Deliberately specific: generic HTTP
// client names (axios, undici, python-httpx) are NOT here, because real paying
// agents call from those, and a false crawler tag would erase a real buyer.
const CRAWLER_UA_SUBSTRINGS = ['probe', 'prober', 'healthcheck', 'uptime', 'indexer', 'observer', 'verifier', 'discovery', 'monitor', 'crawler', 'scanner'];

// Classify a normalized UA family as a known crawler/monitor or a (potential)
// real agent. Conservative by design: anything not provably a crawler counts as
// an agent, so the real-agent funnel never hides actual demand. Read-only,
// query-time classification; the request hot path is untouched.
export function classifyUaFamily(family: string): 'crawler' | 'agent' {
  const f = (family || '').toLowerCase();
  if (CRAWLER_UA_FAMILIES.has(f)) return 'crawler';
  for (const s of CRAWLER_UA_SUBSTRINGS) {
    if (f.includes(s)) return 'crawler';
  }
  return 'agent';
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
  // Original-case wallet (base58 Solana addresses are case-sensitive; the
  // record key is lowercased for dedupe and lossy) + settlement VM tag.
  // Absent on rollups written before 2026-07-02.
  wallet_raw?: string;
  rail?: 'evm' | 'svm';
}

interface RollupRailSlot {
  calls: number;
  credits_charged: number;
}

interface ReadRollup {
  by_endpoint?: Record<string, RollupEndpointSlot>;
  top_payers?: Record<string, RollupPayerSlot>;
  rails?: Partial<Record<'evm' | 'svm', RollupRailSlot>>;
}

export interface UsageReport {
  window: string;
  top_paid_endpoints: Array<{
    endpoint: string;
    // ACTUAL charged calls, from the AE funnel (outcome='paid' is set only on a
    // real charge). null when the AE funnel is unavailable (no CF API token).
    // Never the KV rollup's nominal counter, which over-counts no-charge calls.
    paid_calls: number | null;
    // Wallets that actually settled against this endpoint (accurate).
    distinct_payers: number;
    // Served premium calls incl. no-charge (KV rollup nominal count). Volume
    // only, NOT revenue: a free-trial or stale-data no-charge call still counts
    // here. A single 2026-05-31 free-trial burst pushed two security endpoints
    // to 1143 logged calls while only one ever settled.
    logged_calls: number;
    last_seen: string;
  }>;
  top_payers: Array<{
    wallet: string;
    calls: number;
    credits_charged: number;
    wallet_raw?: string;
    rail?: 'evm' | 'svm';
  }>;
  // Per-rail paid totals summed across the window. null when no rollup in
  // the window carries rail attribution (all data predates the rail tag),
  // so a zero is never confused with "not measured".
  rails: Partial<Record<'evm' | 'svm', { calls: number; credits_charged: number }>> | null;
  funnel_by_endpoint:
    | Array<{ endpoint: string; free_hits: number; unpaid_402: number; paid: number; conversion: number }>
    | null;
  // Crawler-filtered view: the same funnel counting only non-crawler traffic,
  // plus how much of the 402 volume is discovery-crawler noise. Null when the
  // AE token is absent (same degrade contract as funnel_by_endpoint).
  real_agent_funnel: RealAgentFunnelEntry[] | null;
  crawler_summary: CrawlerSummary | null;
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

// Reconcile the per-endpoint paid summary against the accurate AE funnel.
//
// The KV daily rollup banks the NOMINAL tier cost (1 or 2) into a per-endpoint
// call counter inside logPremiumUsage, which runs BEFORE commitPayment decides
// charge-vs-no-charge. Free-trial and stale-data no-charge calls therefore
// inflate that counter: a single 2026-05-31 free-trial burst pushed
// security/kev/full and security/epss/top to 1143 "paid" each while exactly one
// call ever settled. The AE usage event records outcome='paid' only on a real
// charge (it reads the charge tag off the response), so the funnel's `paid` is
// the accurate per-endpoint paid count. distinct_payers (settling wallets only)
// is already accurate. This surfaces paid_calls from AE, relabels the rollup
// count as logged_calls (volume, includes no-charge), and sorts by the accurate
// signal so a crawler/free-trial flood can never top the table again.
export function reconcileTopPaidEndpoints(
  byEndpoint: Record<string, RollupEndpointSlot>,
  funnel: UsageReport['funnel_by_endpoint'],
): UsageReport['top_paid_endpoints'] {
  const aePaid = new Map<string, number>();
  if (funnel) for (const f of funnel) aePaid.set(f.endpoint, f.paid);
  return Object.entries(byEndpoint)
    .map(([endpoint, v]) => ({
      endpoint,
      paid_calls: aePaid.has(endpoint) ? (aePaid.get(endpoint) as number) : null,
      distinct_payers: v.distinct_payers || 0,
      logged_calls: v.calls,
      last_seen: v.last_seen,
    }))
    .sort(
      (a, b) =>
        (b.paid_calls ?? 0) - (a.paid_calls ?? 0) ||
        b.distinct_payers - a.distinct_payers ||
        b.logged_calls - a.logged_calls,
    )
    .slice(0, 25);
}

// Sum per-wallet paid totals across the window, sorted by credits desc.
function mergePayers(rollups: ReadRollup[]): UsageReport['top_payers'] {
  const merged: Record<
    string,
    { calls: number; credits_charged: number; wallet_raw?: string; rail?: 'evm' | 'svm' }
  > = {};
  for (const r of rollups) {
    for (const [wallet, slot] of Object.entries(r.top_payers || {})) {
      const acc = merged[wallet] || { calls: 0, credits_charged: 0 };
      acc.calls += slot.calls || 0;
      acc.credits_charged += slot.credits_charged || 0;
      // Newer rollups carry the original-case wallet + rail tag; any day's
      // value works (a wallet's case and rail never change), so last wins.
      if (slot.wallet_raw) acc.wallet_raw = slot.wallet_raw;
      if (slot.rail) acc.rail = slot.rail;
      merged[wallet] = acc;
    }
  }
  return Object.entries(merged)
    .map(([wallet, v]) => ({
      wallet,
      calls: v.calls,
      credits_charged: v.credits_charged,
      ...(v.wallet_raw ? { wallet_raw: v.wallet_raw } : {}),
      ...(v.rail ? { rail: v.rail } : {}),
    }))
    .sort((a, b) => b.credits_charged - a.credits_charged);
}

// Sum per-rail paid totals across the window. Returns null when NO rollup in
// the window carries a rails field (all data predates rail attribution), so
// callers can distinguish "zero Solana calls" from "not measured yet".
function mergeRails(
  rollups: ReadRollup[],
): Partial<Record<'evm' | 'svm', { calls: number; credits_charged: number }>> | null {
  let seen = false;
  const merged: Partial<Record<'evm' | 'svm', { calls: number; credits_charged: number }>> = {};
  for (const r of rollups) {
    if (!r.rails) continue;
    seen = true;
    for (const rail of ['evm', 'svm'] as const) {
      const slot = r.rails[rail];
      if (!slot) continue;
      const acc = merged[rail] || { calls: 0, credits_charged: 0 };
      acc.calls += slot.calls || 0;
      acc.credits_charged += slot.credits_charged || 0;
      merged[rail] = acc;
    }
  }
  return seen ? merged : null;
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

// === Real-agent funnel (crawler-filtered) ===
//
// The raw funnel counts every 402, including the x402 ecosystem's discovery
// crawlers and uptime monitors. They never pay, so the raw conversion number is
// a vanity metric. This collapses the per-(endpoint, ua) rows into a funnel that
// counts only non-crawler traffic, plus a summary of how much of the 402 volume
// is crawler noise. Pure; no I/O.

export interface FunnelByUaRow {
  endpoint: string;
  ua: string;
  free_hits: number;
  unpaid_402: number;
  paid: number;
}

export interface RealAgentFunnelEntry {
  endpoint: string;
  free_hits: number;
  unpaid_402: number;
  paid: number;
  conversion: number;
}

export interface CrawlerSummary {
  total_402: number;
  crawler_402: number;
  crawler_share: number;
  top_crawler_families: Array<{ ua: string; unpaid_402: number }>;
}

export function deriveRealAgentFunnel(rows: FunnelByUaRow[]): {
  real_agent_funnel: RealAgentFunnelEntry[];
  crawler_summary: CrawlerSummary;
} {
  const byEndpoint = new Map<string, { free_hits: number; unpaid_402: number; paid: number }>();
  const crawlerByUa = new Map<string, number>();
  let total402 = 0;
  let crawler402 = 0;

  for (const r of rows) {
    total402 += r.unpaid_402;
    if (classifyUaFamily(r.ua) === 'crawler') {
      crawler402 += r.unpaid_402;
      crawlerByUa.set(r.ua, (crawlerByUa.get(r.ua) || 0) + r.unpaid_402);
      continue;
    }
    const acc = byEndpoint.get(r.endpoint) || { free_hits: 0, unpaid_402: 0, paid: 0 };
    acc.free_hits += r.free_hits;
    acc.unpaid_402 += r.unpaid_402;
    acc.paid += r.paid;
    byEndpoint.set(r.endpoint, acc);
  }

  const real_agent_funnel: RealAgentFunnelEntry[] = [...byEndpoint.entries()]
    .map(([endpoint, v]) => {
      const denom = v.paid + v.unpaid_402;
      return {
        endpoint,
        free_hits: v.free_hits,
        unpaid_402: v.unpaid_402,
        paid: v.paid,
        conversion: denom > 0 ? v.paid / denom : 0,
      };
    })
    .sort((a, b) => b.paid - a.paid || b.unpaid_402 - a.unpaid_402);

  const top_crawler_families = [...crawlerByUa.entries()]
    .map(([ua, unpaid_402]) => ({ ua, unpaid_402 }))
    .sort((a, b) => b.unpaid_402 - a.unpaid_402)
    .slice(0, 10);

  return {
    real_agent_funnel,
    crawler_summary: {
      total_402: total402,
      crawler_402: crawler402,
      crawler_share: total402 > 0 ? crawler402 / total402 : 0,
      top_crawler_families,
    },
  };
}

// Reads the day rollup(s) for the window from KV and shapes the paid summary,
// then layers on the AE funnel when a token is present. window: today|7d|30d.
export async function buildUsageReport(env: Env, window: string): Promise<UsageReport> {
  const days = windowDays(window);
  const rollups = await readRollupsForWindow(env, days);
  const byEndpoint = mergeByEndpoint(rollups);

  // Funnel first: its accurate per-endpoint paid count (AE outcome='paid' is a
  // real charge) is what top_paid_endpoints reconciles against. Degrades to null
  // when no CF API token is provisioned.
  let funnel_by_endpoint: UsageReport['funnel_by_endpoint'] = null;
  let funnel_status: UsageReport['funnel_status'] = 'unavailable';
  const funnel = await queryUsageFunnel(env, days);
  if (funnel) {
    funnel_by_endpoint = funnel;
    funnel_status = 'ok';
  }

  // paid_calls comes from the funnel (accurate); the KV rollup count, which
  // over-counts no-charge calls, is surfaced as logged_calls only.
  const top_paid_endpoints = reconcileTopPaidEndpoints(byEndpoint, funnel_by_endpoint);

  const top_payers = mergePayers(rollups).slice(0, 25);
  const rails = mergeRails(rollups);

  // Crawler-filtered real-agent view, derived from the per-(endpoint, ua) funnel.
  let real_agent_funnel: UsageReport['real_agent_funnel'] = null;
  let crawler_summary: UsageReport['crawler_summary'] = null;
  const byUa = await queryUsageFunnelByUa(env, days);
  if (byUa) {
    const derived = deriveRealAgentFunnel(byUa);
    real_agent_funnel = derived.real_agent_funnel;
    crawler_summary = derived.crawler_summary;
  }

  // Build targets are derived from the real-agent funnel, not the raw one, so a
  // crawler-only 402 flood (e.g. agents/directory) is never flagged as demand.
  // Falls back to [] when the AE token is absent.
  const build_targets = deriveBuildTargets(real_agent_funnel);
  return { window, top_paid_endpoints, top_payers, rails, funnel_by_endpoint, real_agent_funnel, crawler_summary, build_targets, funnel_status };
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
  // Slow rows broken out by (path, ua family, status). Separates real agent
  // slowness from synthetic latency (chaos-header tests) and shows whether a
  // hang clusters on one caller family or spans all of them.
  slow_by_ua: Array<{ path: string; ua: string; status: string; hits: number; avg_ms: number; max_ms: number }> | null;
  // Most recent individual slow/5xx rows with timestamps. Lets the reader
  // correlate stalls against the cron schedule (isolate CPU contention shows
  // up as multi-path stalls at cron minutes; KV tail latency is scattered).
  slow_recent: Array<{ at: string; path: string; ua: string; status: string; ms: number }> | null;
  status: 'ok' | 'unavailable';
}

// AE SQL read for the admin request-health view. Degrades gracefully to
// "unavailable" (null arrays) when the token/account id are absent or a query
// fails. Never throws. Mirrors queryUsageFunnel.
export async function queryRequestHealth(env: Env, days: number): Promise<RequestHealthReport> {
  const base: RequestHealthReport = { window: `${days}d`, slow_ms: SLOW_MS, top_5xx_by_path: null, top_slow_by_path: null, slow_by_ua: null, slow_recent: null, status: 'unavailable' };
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
  const slowByUaSql = `SELECT index1 AS path, blob2 AS ua, blob1 AS status, SUM(_sample_interval) AS hits, AVG(double1) AS avg_ms, MAX(double1) AS max_ms FROM tf_request_health WHERE timestamp > now() - INTERVAL '${days}' DAY AND double1 > ${SLOW_MS} GROUP BY path, ua, status ORDER BY hits DESC LIMIT 100`;
  const slowRecentSql = `SELECT timestamp AS ts, index1 AS path, blob2 AS ua, blob1 AS status, double1 AS ms FROM tf_request_health WHERE timestamp > now() - INTERVAL '${days}' DAY AND double1 > ${SLOW_MS} ORDER BY ts DESC LIMIT 50`;
  const [fivexx, slow, slowByUa, slowRecent] = await Promise.all([run(fivexxSql), run(slowSql), run(slowByUaSql), run(slowRecentSql)]);
  if (fivexx === null && slow === null && slowByUa === null && slowRecent === null) return base;
  return {
    window: `${days}d`,
    slow_ms: SLOW_MS,
    top_5xx_by_path: fivexx ? fivexx.map((r) => ({ path: String(r.path), status: String(r.status), hits: Number(r.hits), max_ms: Number(r.max_ms) })) : null,
    top_slow_by_path: slow ? slow.map((r) => ({ path: String(r.path), slow_hits: Number(r.slow_hits), avg_ms: Number(r.avg_ms), max_ms: Number(r.max_ms) })) : null,
    slow_by_ua: slowByUa ? slowByUa.map((r) => ({ path: String(r.path), ua: String(r.ua), status: String(r.status), hits: Number(r.hits), avg_ms: Number(r.avg_ms), max_ms: Number(r.max_ms) })) : null,
    slow_recent: slowRecent ? slowRecent.map((r) => ({ at: String(r.ts), path: String(r.path), ua: String(r.ua), status: String(r.status), ms: Number(r.ms) })) : null,
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

// Analytics Engine SQL read at (endpoint, ua-family) grain. Same external-only
// filter as queryUsageFunnel (internal blob7='1' excluded, NULL-tolerant).
// Feeds deriveRealAgentFunnel, which classifies each ua family as crawler or
// agent. Returns null (graceful degrade) without the token or on failure.
export async function queryUsageFunnelByUa(env: Env, days: number): Promise<FunnelByUaRow[] | null> {
  if (!env.CF_ANALYTICS_TOKEN || !env.CF_ACCOUNT_ID) return null;
  try {
    const sql = `SELECT blob1 AS endpoint, blob5 AS ua,
      sum(if(blob3='served_free',1,0)) AS free_hits,
      sum(if(blob3='unpaid_402',1,0)) AS unpaid_402,
      sum(if(blob3='paid',1,0)) AS paid
      FROM tf_usage WHERE timestamp > now() - INTERVAL '${days}' DAY AND (blob7 IS NULL OR blob7 != '1') GROUP BY endpoint, ua ORDER BY unpaid_402 DESC LIMIT 1000`;
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
      data?: Array<{ endpoint: string; ua: string; free_hits: number; unpaid_402: number; paid: number }>;
    };
    return (json.data || []).map((r) => ({
      endpoint: r.endpoint,
      ua: r.ua,
      free_hits: Number(r.free_hits),
      unpaid_402: Number(r.unpaid_402),
      paid: Number(r.paid),
    }));
  } catch {
    return null;
  }
}
