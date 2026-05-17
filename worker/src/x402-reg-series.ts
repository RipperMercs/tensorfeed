import { Env } from './types';
import {
  RegistrySnapshot,
  X402_REGISTRY_ATTRIBUTION,
  dailyKey as x402RegDailyKey,
} from './x402-registry';

/**
 * Premium time series over the daily x402 publisher registry snapshots.
 *
 * x402-registry.ts crawls the seed list and writes x402-reg:daily:{date}
 * once per day. A registry is current-state only by nature: who
 * publishes a valid /.well-known/x402 today, what wallet they declare,
 * what they charge. None of that is recoverable after the fact, so the
 * multi-day record is TensorFeed-captured and cannot be backfilled.
 *
 * Derived metric, grounded in RegistrySnapshot: per-day reachable and
 * erroring publisher counts, federation count, network breadth, paid
 * and free endpoint totals, and agent-fair-trade declarations; plus
 * day-over-day churn versus the prior captured day: domains added or
 * removed, status flips (a publisher going dark or coming back), and
 * payment-wallet changes (the security-relevant signal an agent paying
 * a publisher wants to watch).
 *
 * Mirrors or-series.ts and mcp-registry.ts discipline: a pure
 * projection (no env, fully unit-testable) plus a thin env-bound
 * reader.
 */

export const MAX_RANGE_DAYS = 90;
export const DEFAULT_RANGE_DAYS = 30;

const ISO_DATE = /^\d{4}-\d{2}-\d{2}$/;
const todayUTC = (): string => new Date().toISOString().slice(0, 10);

function addDays(dateStr: string, n: number): string {
  const d = new Date(`${dateStr}T00:00:00Z`);
  d.setUTCDate(d.getUTCDate() + n);
  return d.toISOString().slice(0, 10);
}

function daysBetween(from: string, to: string): number {
  const a = new Date(`${from}T00:00:00Z`).getTime();
  const b = new Date(`${to}T00:00:00Z`).getTime();
  return Math.round((b - a) / (1000 * 60 * 60 * 24));
}

export interface RangeResolution {
  ok: boolean;
  error?: string;
  from?: string;
  to?: string;
}

/**
 * Same contract as or-series.resolveRange: optional from/to, default a
 * trailing DEFAULT_RANGE_DAYS window ending today, hard cap at
 * MAX_RANGE_DAYS. Optional params so the route stays non-strict-premium.
 */
export function resolveRange(rawFrom: string | null, rawTo: string | null): RangeResolution {
  const today = todayUTC();
  const to = rawTo?.trim() || today;
  if (!ISO_DATE.test(to)) return { ok: false, error: 'invalid_to_date' };

  let from = rawFrom?.trim();
  if (!from) {
    from = addDays(to, -(DEFAULT_RANGE_DAYS - 1));
  } else if (!ISO_DATE.test(from)) {
    return { ok: false, error: 'invalid_from_date' };
  }
  if (from > to) return { ok: false, error: 'from_after_to' };
  const span = daysBetween(from, to);
  if (span + 1 > MAX_RANGE_DAYS) return { ok: false, error: 'range_exceeds_max_days' };

  return { ok: true, from, to };
}

export interface X402RegSeriesPoint {
  date: string;
  total: number | null;
  ok_count: number | null;
  error_count: number | null;
  federation_count: number | null;
  network_count: number | null;
  networks: string[];
  paid_endpoints_total: number | null;
  free_endpoints_total: number | null;
  agent_fair_trade_count: number | null;
  /** Domains present today not present the prior has-data day. */
  added: number | null;
  /** Domains present the prior has-data day not present today. */
  removed: number | null;
  /** Domains present both days whose crawl status changed. */
  status_flips: number | null;
  /** Domains present both days, each with a wallet, whose wallet changed. */
  wallet_changes: number | null;
  added_sample: string[];
  removed_sample: string[];
  wallet_change_sample: string[];
  has_data: boolean;
}

export interface X402RegSeriesResult {
  from: string;
  to: string;
  days: number;
  points: X402RegSeriesPoint[];
  delta_in_window: {
    start_total: number | null;
    end_total: number | null;
    net: number | null;
    start_ok: number | null;
    end_ok: number | null;
  };
  attribution: typeof X402_REGISTRY_ATTRIBUTION;
  notes: string[];
}

const SAMPLE_CAP = 50;

type DomainState = Map<string, { status: string; wallet: string | null }>;

/**
 * Pure: project an ordered list of (date, snapshot|null) into a series.
 *
 * Input MUST be chronologically ascending. Churn is computed against
 * the most recent PRIOR day that has data, so a missing day in the
 * middle does not produce a spurious full-registry add then remove.
 */
export function projectX402RegSeries(
  from: string,
  to: string,
  byDate: ReadonlyArray<{ date: string; snap: RegistrySnapshot | null }>,
): X402RegSeriesResult {
  let prev: DomainState | null = null;

  const points: X402RegSeriesPoint[] = byDate.map(({ date, snap }) => {
    if (!snap) {
      return {
        date,
        total: null,
        ok_count: null,
        error_count: null,
        federation_count: null,
        network_count: null,
        networks: [],
        paid_endpoints_total: null,
        free_endpoints_total: null,
        agent_fair_trade_count: null,
        added: null,
        removed: null,
        status_flips: null,
        wallet_changes: null,
        added_sample: [],
        removed_sample: [],
        wallet_change_sample: [],
        has_data: false,
      };
    }

    const cur: DomainState = new Map();
    let paidTotal = 0;
    let freeTotal = 0;
    let aftCount = 0;
    for (const e of snap.entries) {
      cur.set(e.domain, { status: e.status, wallet: e.payment_wallet ?? null });
      paidTotal += e.paid_endpoints_count ?? 0;
      freeTotal += e.free_endpoints_count ?? 0;
      if (e.agent_fair_trade_declared) aftCount += 1;
    }

    let added: number | null = null;
    let removed: number | null = null;
    let statusFlips: number | null = null;
    let walletChanges: number | null = null;
    const addedSample: string[] = [];
    const removedSample: string[] = [];
    const walletChangeSample: string[] = [];

    if (prev) {
      added = 0;
      removed = 0;
      statusFlips = 0;
      walletChanges = 0;
      for (const [domain, state] of cur) {
        const p = prev.get(domain);
        if (!p) {
          added++;
          if (addedSample.length < SAMPLE_CAP) addedSample.push(domain);
          continue;
        }
        if (p.status !== state.status) statusFlips++;
        if (p.wallet && state.wallet && p.wallet !== state.wallet) {
          walletChanges++;
          if (walletChangeSample.length < SAMPLE_CAP) walletChangeSample.push(domain);
        }
      }
      for (const domain of prev.keys()) {
        if (!cur.has(domain)) {
          removed++;
          if (removedSample.length < SAMPLE_CAP) removedSample.push(domain);
        }
      }
    }

    prev = cur;

    const networks = Object.keys(snap.by_network).sort();
    return {
      date,
      total: snap.total,
      ok_count: snap.ok_count,
      error_count: snap.error_count,
      federation_count: snap.federation_count,
      network_count: networks.length,
      networks,
      paid_endpoints_total: paidTotal,
      free_endpoints_total: freeTotal,
      agent_fair_trade_count: aftCount,
      added,
      removed,
      status_flips: statusFlips,
      wallet_changes: walletChanges,
      added_sample: addedSample,
      removed_sample: removedSample,
      wallet_change_sample: walletChangeSample,
      has_data: true,
    };
  });

  const withData = points.filter((p) => p.has_data);
  const first = withData[0] ?? null;
  const last = withData.length > 0 ? withData[withData.length - 1] : null;
  const startTotal = first?.total ?? null;
  const endTotal = last?.total ?? null;

  const notes: string[] = [];
  const missing = points.length - withData.length;
  if (missing > 0) notes.push(`${missing} day(s) in range have no captured snapshot yet`);
  if (withData.length === 1) {
    notes.push('Only one day has data; churn metrics need at least two captured days.');
  }
  if (withData.length === 0) {
    notes.push(
      'No captured snapshots in this range yet. x402-reg:daily is captured on the daily registry cron.',
    );
  }

  return {
    from,
    to,
    days: points.length,
    points,
    delta_in_window: {
      start_total: startTotal,
      end_total: endTotal,
      net: startTotal !== null && endTotal !== null ? endTotal - startTotal : null,
      start_ok: first?.ok_count ?? null,
      end_ok: last?.ok_count ?? null,
    },
    attribution: X402_REGISTRY_ATTRIBUTION,
    notes,
  };
}

/**
 * Thin env-bound reader. Reads x402-reg:daily:{date} for each date in
 * range (missing day reads as null) then defers all logic to the pure
 * projector.
 */
export async function getX402RegSeries(
  env: Env,
  from: string,
  to: string,
): Promise<X402RegSeriesResult> {
  const dates: string[] = [];
  const span = daysBetween(from, to);
  for (let i = 0; i <= span; i++) dates.push(addDays(from, i));

  const snaps = await Promise.all(
    dates.map(
      (d) =>
        env.TENSORFEED_CACHE.get(x402RegDailyKey(d), 'json') as Promise<RegistrySnapshot | null>,
    ),
  );

  return projectX402RegSeries(
    from,
    to,
    dates.map((date, i) => ({ date, snap: snaps[i] })),
  );
}
