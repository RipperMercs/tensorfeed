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

/**
 * Last UTC date whose stored snapshot was produced by the defective crawler.
 *
 * From the registry's launch on 2026-05-11 until the 2026-08-18 fix, the
 * crawler fetched only the extensionless /.well-known/x402. Both seeded
 * domains actually publish at /.well-known/x402.json, and tensorfeed.ai
 * additionally served a stale v1 stub at the extensionless path, so every
 * snapshot in that period recorded ok_count 0 and no churn. Those zeros are
 * an artifact of our crawler, NOT an observation about publisher
 * reachability, and a buyer reading the series would otherwise take them
 * for ecosystem data.
 *
 * A day is flagged only when it is in range AND actually recorded zero
 * reachable publishers, so a day re-crawled by the fixed code (for example
 * 2026-08-18 itself, if the manual refresh reran it) is not falsely marked.
 * The tradeoff: a genuine total-outage day inside the window would also be
 * flagged. Over a two-domain seed list during a period we know the crawler
 * was broken, disclosing too much beats disclosing too little.
 */
export const CRAWLER_DEFECT_THROUGH = '2026-08-18';

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
  /**
   * This day's counts came from the pre-2026-08-18 crawler defect, so
   * ok_count, federation_count, and the endpoint totals are artifacts
   * rather than observations. See CRAWLER_DEFECT_THROUGH.
   */
  crawler_defect: boolean;
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
    /**
     * The window straddles the 2026-08-18 crawler fix, so any rise in
     * start_ok to end_ok is our crawler being repaired, not publishers
     * coming online. Do not read it as ecosystem growth.
     */
    spans_crawler_defect: boolean;
  };
  attribution: typeof X402_REGISTRY_ATTRIBUTION;
  notes: string[];
  data_quality: {
    crawler_defect_through: string;
    defect_days_in_window: number;
    usable_days_in_window: number;
    note: string | null;
  };
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
        crawler_defect: false,
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
      crawler_defect: date <= CRAWLER_DEFECT_THROUGH && snap.ok_count === 0,
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

  const defectDays = withData.filter((p) => p.crawler_defect).length;
  const usableDays = withData.length - defectDays;
  const spansDefect = defectDays > 0 && usableDays > 0;

  if (defectDays > 0) {
    notes.push(
      usableDays === 0
        ? `Every captured day in this range (${defectDays}) predates the 2026-08-18 crawler fix and recorded 0 reachable publishers. Those zeros are an artifact of TensorFeed's crawler reading the wrong manifest path, not publisher downtime, so this window carries no usable reachability signal.`
        : `${defectDays} captured day(s) in this range predate the 2026-08-18 crawler fix and recorded 0 reachable publishers as an artifact of TensorFeed's crawler, not publisher downtime. Compare only the ${usableDays} day(s) after the fix.`,
    );
  }
  if (spansDefect) {
    notes.push(
      'This window straddles the crawler fix, so any rise from start_ok to end_ok is our measurement being repaired rather than publishers coming online.',
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
      spans_crawler_defect: spansDefect,
    },
    attribution: X402_REGISTRY_ATTRIBUTION,
    notes,
    data_quality: {
      crawler_defect_through: CRAWLER_DEFECT_THROUGH,
      defect_days_in_window: defectDays,
      usable_days_in_window: usableDays,
      note:
        defectDays > 0
          ? `Snapshots captured on or before ${CRAWLER_DEFECT_THROUGH} came from a crawler that fetched only /.well-known/x402 and therefore recorded 0 reachable publishers for the registry's whole life. Treat reachability, federation, and endpoint totals on flagged days as unmeasured rather than zero.`
          : null,
    },
  };
}

/**
 * True when every captured day in the window came from the pre-fix crawler
 * defect, i.e. the caller would be paying for records we already know are
 * artifacts. The route turns this into an AFTA no-charge rather than
 * billing a credit for a window with no usable observation in it.
 *
 * Deliberately requires at least one captured day: a window with NO
 * snapshots at all is the existing empty_result case and is checked first,
 * so the two no-charge paths stay distinguishable in the receipt.
 */
export function isWindowAllCrawlerDefect(result: X402RegSeriesResult): boolean {
  return result.data_quality.defect_days_in_window > 0 && result.data_quality.usable_days_in_window === 0;
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
