import type { Env } from '../types';
import type { DailyRollup, PublisherDailyRollup, PublisherRecord, SettlementEvent, IndexerCursor } from './types';
import { kvKeyDayRollup, KV_KEY_RECENT, kvKeyPublisher, kvKeyPubDayRollup, KV_KEY_CURSOR } from './constants';
import { addDecimal, fromMicroUnits, toMicroUnits, compareDecimal } from './indexer';

export type Window = '24h' | '7d' | '30d';

const WINDOW_DAYS: Record<Window, number> = { '24h': 1, '7d': 7, '30d': 30 };

// Shared agent-facing provenance for every x402-index response. The whole
// family describes the same public CC BY 4.0 on-chain data, so attribution and
// license are uniform across summary, leaderboard, recent, publishers, series,
// and publisher-receipts (agent-contract consistency).
const INDEX_ATTRIBUTION = 'TensorFeed x402 settlement index over public Base mainnet on-chain data';
const INDEX_LICENSE = 'CC BY 4.0';

// captured_at on every response is the index's real freshness: the cursor's
// last_run_at, NOT the request clock. runIndexerTick advances last_run_at on
// every block-processing tick and on init, and intentionally NOT on an empty
// tick, so it marks the last moment index data could have changed. Returns null
// when the index has never run (cold cursor); the freshness layer treats a null
// captured_at as "fresh, metadata missing" rather than punishing billing. This
// is what makes the 10-minute freshness SLA on the paid endpoints actually fire.
async function readCursorCapturedAt(env: Env): Promise<string | null> {
  const c = (await env.TENSORFEED_CACHE.get(KV_KEY_CURSOR, 'json')) as IndexerCursor | null;
  return c?.last_run_at ?? null;
}

// Canonicalize a caller-supplied publisher domain to the form the indexer stores
// (lowercased, trailing-dot stripped). refreshAllPublishers keys records by the
// normalized hostname, so a mixed-case or trailing-dot domain must collapse to
// the same string or every per-publisher KV read misses.
function canonDomain(d: string): string {
  return d.trim().toLowerCase().replace(/\.$/, '');
}

export function datesInWindow(window: Window, now: Date): string[] {
  const days = WINDOW_DAYS[window];
  const out: string[] = [];
  for (let i = 0; i < days; i++) {
    const d = new Date(now);
    d.setUTCDate(d.getUTCDate() - i);
    out.push(d.toISOString().slice(0, 10));
  }
  return out;
}

export interface SummaryResult {
  window: Window;
  captured_at: string | null;
  volume_usdc: string;
  count: number;
  unique_publishers: number;
  change_vs_prior_window: { volume_pct: number; count_pct: number; prior_window_empty: boolean };
  attribution: string;
  license: string;
}

export async function getSummary(env: Env, window: Window, now: Date = new Date()): Promise<SummaryResult> {
  const dates = datesInWindow(window, now);
  const [rollups, capturedAt] = await Promise.all([
    Promise.all(dates.map((d) => env.TENSORFEED_CACHE.get(kvKeyDayRollup(d), 'json') as Promise<DailyRollup | null>)),
    readCursorCapturedAt(env),
  ]);

  let volumeStr = '0';
  let count = 0;
  const publishers = new Set<string>();
  for (const r of rollups) {
    if (!r) continue;
    volumeStr = addDecimal(volumeStr, r.volume_usdc);
    count += r.count;
    for (const p of r.top_publishers) publishers.add(p.domain);
  }

  const priorOffsetMs = WINDOW_DAYS[window] * 24 * 60 * 60 * 1000;
  const priorDates = datesInWindow(window, new Date(now.getTime() - priorOffsetMs));
  const priorRollups = await Promise.all(
    priorDates.map((d) => env.TENSORFEED_CACHE.get(kvKeyDayRollup(d), 'json') as Promise<DailyRollup | null>),
  );

  let priorVolumeStr = '0';
  let priorCount = 0;
  for (const r of priorRollups) {
    if (!r) continue;
    priorVolumeStr = addDecimal(priorVolumeStr, r.volume_usdc);
    priorCount += r.count;
  }

  // prior_window_empty distinguishes "new activity from a zero baseline" from a
  // real +100% growth. The index is forward-only from 2026-05-28, so the prior
  // window is empty for every query in the first 24h/7d/30d after launch; without
  // this flag the volume_pct=100 sentinel reads as misleading growth.
  const priorWindowEmpty = priorVolumeStr === '0' && priorCount === 0;

  return {
    window,
    captured_at: capturedAt,
    volume_usdc: fromMicroUnits(toMicroUnits(volumeStr)),
    count,
    unique_publishers: publishers.size,
    change_vs_prior_window: {
      volume_pct: pctChangeDecimal(priorVolumeStr, volumeStr),
      count_pct: pctChangeNum(priorCount, count),
      prior_window_empty: priorWindowEmpty,
    },
    attribution: INDEX_ATTRIBUTION,
    license: INDEX_LICENSE,
  };
}

export interface LeaderboardEntry {
  rank: number;
  domain: string;
  volume_usdc: string;
  count: number;
  share_pct: number;
}

export interface LeaderboardResult {
  window: Window;
  captured_at: string | null;
  leaders: LeaderboardEntry[];
  window_volume_usdc: string;
  coverage_note: string;
  attribution: string;
  license: string;
}

export async function getLeaderboard(env: Env, window: Window, limit: number, now: Date = new Date()): Promise<LeaderboardResult> {
  const clampedLimit = Math.min(Math.max(limit, 1), 25);
  const dates = datesInWindow(window, now);

  // Enumerate the publisher universe (the indexed domains) and aggregate from the
  // FULL per-publisher-day rollups, NOT each DailyRollup.top_publishers, which the
  // indexer caps at TOP_PUBLISHERS_LIMIT per day. The capped top-N source silently
  // dropped any publisher below a day's top tier from its windowed total, both
  // omitting it from a limit>10 board and undercounting a publisher that ranked
  // outside the top tier on a busy day (audit numeric-correctness-1). Fan-out is
  // (publisher count) x (window days, <= 30), bounded by the registry size the
  // index controls, the same shape getSeries(domain) uses. As the registry grows,
  // the deferred Cache-API read layer bounds the free-endpoint KV cost.
  const PUB_PREFIX = 'x402-idx:publisher:';
  const [pubList, capturedAt] = await Promise.all([
    env.TENSORFEED_CACHE.list({ prefix: PUB_PREFIX }),
    readCursorCapturedAt(env),
  ]);
  const domains = pubList.keys
    .map((k) => k.name.slice(PUB_PREFIX.length))
    .filter((d) => d.length > 0);

  const byDomain = new Map<string, { volume_usdc: string; count: number }>();
  await Promise.all(
    domains.map(async (domain) => {
      const perDay = await Promise.all(
        dates.map((d) => env.TENSORFEED_CACHE.get(kvKeyPubDayRollup(domain, d), 'json') as Promise<PublisherDailyRollup | null>),
      );
      let vol = '0';
      let cnt = 0;
      for (const r of perDay) {
        if (!r) continue;
        vol = addDecimal(vol, r.volume_usdc);
        cnt += r.count;
      }
      // Only publishers with real settlements in the window appear; a registry
      // record with no in-window rollups (e.g. an errored crawl) contributes nothing.
      if (cnt > 0) byDomain.set(domain, { volume_usdc: vol, count: cnt });
    }),
  );

  const arr = Array.from(byDomain.entries()).map(([domain, v]) => ({ domain, ...v }));
  arr.sort((a, b) => {
    const cmp = compareDecimal(b.volume_usdc, a.volume_usdc);
    if (cmp !== 0) return cmp;
    if (b.count !== a.count) return b.count - a.count;
    return a.domain.localeCompare(b.domain);
  });

  // share_pct denominator is the full windowed volume across ALL aggregated
  // publishers (the pre-slice set), not just the returned slice, so each leader's
  // share is its true ecosystem share and the top N do not always sum to ~100%.
  const windowMicro = arr.reduce((acc, e) => acc + toMicroUnits(e.volume_usdc), 0n);
  const sliced = arr.slice(0, clampedLimit);
  const leaders: LeaderboardEntry[] = sliced.map((e, idx) => ({
    rank: idx + 1,
    domain: e.domain,
    volume_usdc: fromMicroUnits(toMicroUnits(e.volume_usdc)),
    count: e.count,
    share_pct: windowMicro === 0n ? 0 : Math.round(Number((toMicroUnits(e.volume_usdc) * 10000n) / windowMicro)) / 100,
  }));

  return {
    window,
    captured_at: capturedAt,
    leaders,
    window_volume_usdc: fromMicroUnits(windowMicro),
    coverage_note:
      'Aggregated from full per-publisher daily settlement rollups across the window; no per-day top-N truncation. window_volume_usdc carries the share_pct denominator.',
    attribution: INDEX_ATTRIBUTION,
    license: INDEX_LICENSE,
  };
}

export interface RecentResult {
  captured_at: string | null;
  count: number;
  events: Array<SettlementEvent & { base_explorer_url: string }>;
  attribution: string;
  license: string;
}

export async function getRecent(env: Env, limit: number): Promise<RecentResult> {
  const clampedLimit = Math.min(Math.max(limit, 1), 50);
  const [raw, capturedAt] = await Promise.all([
    env.TENSORFEED_CACHE.get(KV_KEY_RECENT, 'json') as Promise<SettlementEvent[] | null>,
    readCursorCapturedAt(env),
  ]);
  const events = (raw ?? []).slice(0, clampedLimit).map((e) => ({
    ...e,
    base_explorer_url: `https://basescan.org/tx/${e.tx_hash}`,
  }));
  return { captured_at: capturedAt, count: events.length, events, attribution: INDEX_ATTRIBUTION, license: INDEX_LICENSE };
}

export interface PublishersResult {
  captured_at: string | null;
  count: number;
  publishers: PublisherRecord[];
  attribution: string;
  license: string;
}

export async function getPublishers(env: Env): Promise<PublishersResult> {
  // List every per-publisher record (both successful and errored crawls).
  // The wallet map x402-idx:publishers deliberately excludes errored crawls,
  // so deriving the publisher set from it hides any publisher whose manifest
  // crawl is currently failing. Enumerating KV by prefix surfaces all of them
  // and lets callers see last_crawl_error to understand why a given publisher
  // is not actively contributing to the wallet allowlist.
  const [list, capturedAt] = await Promise.all([
    env.TENSORFEED_CACHE.list({ prefix: 'x402-idx:publisher:' }),
    readCursorCapturedAt(env),
  ]);
  const publishers = await Promise.all(
    list.keys.map((k) => env.TENSORFEED_CACHE.get(k.name, 'json') as Promise<PublisherRecord | null>),
  );
  const filtered = publishers.filter((p): p is PublisherRecord => p !== null);
  filtered.sort((a, b) => a.domain.localeCompare(b.domain));
  return { captured_at: capturedAt, count: filtered.length, publishers: filtered, attribution: INDEX_ATTRIBUTION, license: INDEX_LICENSE };
}

export function datesBetween(from: string, to: string): string[] {
  const out: string[] = [];
  const start = new Date(from + 'T00:00:00.000Z');
  const end = new Date(to + 'T00:00:00.000Z');
  for (let d = new Date(start); d.getTime() <= end.getTime(); d.setUTCDate(d.getUTCDate() + 1)) {
    out.push(d.toISOString().slice(0, 10));
  }
  return out;
}

// Max inclusive span for a from/to window. getSeries and getPublisherReceipts
// fan out one KV read per day, so an unbounded range (e.g. 2000 to 2030) would
// issue ~11,000 reads per single paid call, roughly 11% of the daily free-tier
// KV budget (audit #4). One year of daily points is the natural ceiling for a
// daily-granularity chart and bounds the fan-out to <= 366 reads per call.
export const MAX_SERIES_RANGE_DAYS = 366;

const RANGE_DATE_RE = /^\d{4}-\d{2}-\d{2}$/;

export interface RangeValidation {
  ok: boolean;
  error?: string;
  hint?: string;
  days?: number;
}

/**
 * Validate a from/to YYYY-MM-DD window before any per-day KV fan-out: both
 * well-formed real calendar dates, from on or before to, and the inclusive span
 * within maxDays. Returns a structured failure the handler turns into a
 * no-charge premiumValidationFailure, so a crafted wide range cannot burn the
 * KV budget.
 */
export function validateRange(from: string, to: string, maxDays = MAX_SERIES_RANGE_DAYS): RangeValidation {
  if (!RANGE_DATE_RE.test(from) || !RANGE_DATE_RE.test(to)) {
    return { ok: false, error: 'invalid_date_format', hint: 'from and to must be YYYY-MM-DD.' };
  }
  const start = new Date(from + 'T00:00:00.000Z').getTime();
  const end = new Date(to + 'T00:00:00.000Z').getTime();
  if (!Number.isFinite(start) || !Number.isFinite(end)) {
    return { ok: false, error: 'invalid_date', hint: 'from and to must be real calendar dates in YYYY-MM-DD.' };
  }
  // Reject calendar-overflow dates (2026-02-30, 2026-04-31) that V8 silently
  // rolls over to the next month instead of rejecting; otherwise datesBetween
  // would start from a date the caller never asked for.
  if (new Date(start).toISOString().slice(0, 10) !== from || new Date(end).toISOString().slice(0, 10) !== to) {
    return { ok: false, error: 'invalid_date', hint: 'from and to must be real calendar dates in YYYY-MM-DD.' };
  }
  if (start > end) {
    return { ok: false, error: 'inverted_range', hint: 'from must be on or before to.' };
  }
  const days = Math.floor((end - start) / 86400000) + 1;
  if (days > maxDays) {
    return { ok: false, error: 'range_too_large', hint: `Window spans ${days} days; the max is ${maxDays}. Narrow the from/to range.`, days };
  }
  return { ok: true, days };
}

export interface PublisherReceiptsResult {
  publisher: { domain: string; pay_to_wallets: string[]; first_seen: string };
  window: { from: string; to: string; days: number };
  rollup: {
    volume_usdc: string;
    count: number;
    avg_amount: string;
    daily_series: Array<{ date: string; volume_usdc: string; count: number }>;
  };
  captured_at: string | null;
  // has_data is true iff at least one day in the window has a stored rollup. The
  // indexer only writes a rollup when an event lands, so rollup-presence is the
  // clean boundary between "no settlements indexed for this window" (no-charge)
  // and a real measured (possibly tiny) result (billable).
  has_data: boolean;
  attribution: string;
  license: string;
}

export async function getPublisherReceipts(
  env: Env,
  rawDomain: string,
  from: string,
  to: string,
): Promise<PublisherReceiptsResult | null> {
  const domain = canonDomain(rawDomain);
  const pubRec = (await env.TENSORFEED_CACHE.get(kvKeyPublisher(domain), 'json')) as PublisherRecord | null;
  if (!pubRec) return null;

  const dates = datesBetween(from, to);
  const [perDay, capturedAt] = await Promise.all([
    Promise.all(dates.map((d) => env.TENSORFEED_CACHE.get(kvKeyPubDayRollup(domain, d), 'json') as Promise<PublisherDailyRollup | null>)),
    readCursorCapturedAt(env),
  ]);

  let hasData = false;
  const daily_series = dates.map((date, idx) => {
    const r = perDay[idx];
    if (r) hasData = true;
    return {
      date,
      volume_usdc: r ? fromMicroUnits(toMicroUnits(r.volume_usdc)) : '0.000000',
      count: r?.count ?? 0,
    };
  });

  let totalVolume = '0';
  let totalCount = 0;
  for (const r of perDay) {
    if (!r) continue;
    totalVolume = addDecimal(totalVolume, r.volume_usdc);
    totalCount += r.count;
  }
  const avg = totalCount === 0
    ? '0.000000'
    : fromMicroUnits(toMicroUnits(totalVolume) / BigInt(totalCount));

  return {
    publisher: {
      domain: pubRec.domain,
      pay_to_wallets: pubRec.pay_to_wallets,
      first_seen: pubRec.first_seen,
    },
    window: { from, to, days: dates.length },
    rollup: {
      volume_usdc: fromMicroUnits(toMicroUnits(totalVolume)),
      count: totalCount,
      avg_amount: avg,
      daily_series,
    },
    captured_at: capturedAt,
    has_data: hasData,
    attribution: INDEX_ATTRIBUTION,
    license: INDEX_LICENSE,
  };
}

export interface SeriesParams {
  metric: 'volume' | 'count';
  granularity: 'day' | 'hour';
  from: string;
  to: string;
  domain?: string;
}

export interface SeriesResult {
  metric: 'volume' | 'count';
  granularity: 'day' | 'hour';
  window: { from: string; to: string };
  series: Array<{ ts: string; value: string | number }>;
  captured_at: string | null;
  has_data: boolean;
  attribution: string;
  license: string;
}

export async function getSeries(env: Env, params: SeriesParams): Promise<SeriesResult> {
  const { metric, granularity, from, to } = params;
  const domain = params.domain ? canonDomain(params.domain) : undefined;

  if (granularity === 'hour') {
    return {
      metric,
      granularity,
      window: { from, to },
      series: [],
      captured_at: await readCursorCapturedAt(env),
      has_data: false,
      attribution: 'Hour granularity not yet available in MVP; use granularity=day',
      license: INDEX_LICENSE,
    };
  }

  const dates = datesBetween(from, to);
  const [perDay, capturedAt] = await Promise.all([
    Promise.all(
      dates.map((date) =>
        domain
          ? (env.TENSORFEED_CACHE.get(kvKeyPubDayRollup(domain, date), 'json') as Promise<PublisherDailyRollup | null>)
          : (env.TENSORFEED_CACHE.get(kvKeyDayRollup(date), 'json') as Promise<DailyRollup | null>),
      ),
    ),
    readCursorCapturedAt(env),
  ]);

  let hasData = false;
  const series = dates.map((date, idx) => {
    const r = perDay[idx];
    if (r) hasData = true;
    return {
      ts: date,
      value: metric === 'volume'
        ? (r ? fromMicroUnits(toMicroUnits(r.volume_usdc)) : '0.000000')
        : (r?.count ?? 0),
    };
  });

  return {
    metric,
    granularity,
    window: { from, to },
    series,
    captured_at: capturedAt,
    has_data: hasData,
    attribution: INDEX_ATTRIBUTION,
    license: INDEX_LICENSE,
  };
}

function pctChangeDecimal(prior: string, current: string): number {
  const p = toMicroUnits(prior);
  const c = toMicroUnits(current);
  if (p === 0n) return c === 0n ? 0 : 100;
  return Number(((c - p) * 10000n) / p) / 100;
}

function pctChangeNum(prior: number, current: number): number {
  if (prior === 0) return current === 0 ? 0 : 100;
  return Math.round(((current - prior) / prior) * 10000) / 100;
}

// Edge-cache keys for the paid x402-index endpoints. They key ONLY on the inputs
// that determine the response (canonicalized domain plus date window plus
// metric/granularity), never on the caller. The index data is public and
// identical per query, so one cached value is shared across all callers while
// requirePayment and premiumResponse still run per request. Domain is
// canonicalized so Example.com, example.com, and example.com. share a single
// entry, matching how getPublisherReceipts and getSeries normalize it. Field
// order is fixed and a colon cannot appear in a validated domain or a YYYY-MM-DD
// date, so distinct queries never collide onto the same key. The trailing empty
// domain field on a series key unambiguously marks an ecosystem (no-domain) query.
export function publisherReceiptsCacheKey(rawDomain: string, from: string, to: string): string {
  return `x402idx:receipts:${canonDomain(rawDomain)}:${from}:${to}`;
}

export function seriesCacheKey(params: SeriesParams): string {
  const domain = params.domain ? canonDomain(params.domain) : '';
  return `x402idx:series:${params.metric}:${params.granularity}:${params.from}:${params.to}:${domain}`;
}
