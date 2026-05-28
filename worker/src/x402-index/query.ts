import type { Env } from '../types';
import type { DailyRollup, PublisherDailyRollup, PublisherRecord, SettlementEvent } from './types';
import { kvKeyDayRollup, KV_KEY_RECENT, KV_KEY_PUBLISHERS, kvKeyPublisher, kvKeyPubDayRollup } from './constants';
import { addDecimal, fromMicroUnits, toMicroUnits, compareDecimal } from './indexer';

export type Window = '24h' | '7d' | '30d';

const WINDOW_DAYS: Record<Window, number> = { '24h': 1, '7d': 7, '30d': 30 };

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
  captured_at: string;
  volume_usdc: string;
  count: number;
  unique_publishers: number;
  change_vs_prior_window: { volume_pct: number; count_pct: number };
}

export async function getSummary(env: Env, window: Window, now: Date = new Date()): Promise<SummaryResult> {
  const dates = datesInWindow(window, now);
  const rollups = await Promise.all(
    dates.map((d) => env.TENSORFEED_CACHE.get(kvKeyDayRollup(d), 'json') as Promise<DailyRollup | null>),
  );

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

  return {
    window,
    captured_at: now.toISOString(),
    volume_usdc: fromMicroUnits(toMicroUnits(volumeStr)),
    count,
    unique_publishers: publishers.size,
    change_vs_prior_window: {
      volume_pct: pctChangeDecimal(priorVolumeStr, volumeStr),
      count_pct: pctChangeNum(priorCount, count),
    },
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
  captured_at: string;
  leaders: LeaderboardEntry[];
}

export async function getLeaderboard(env: Env, window: Window, limit: number, now: Date = new Date()): Promise<LeaderboardResult> {
  const clampedLimit = Math.min(Math.max(limit, 1), 25);
  const dates = datesInWindow(window, now);
  const rollups = await Promise.all(
    dates.map((d) => env.TENSORFEED_CACHE.get(kvKeyDayRollup(d), 'json') as Promise<DailyRollup | null>),
  );

  const byDomain = new Map<string, { volume_usdc: string; count: number }>();
  for (const r of rollups) {
    if (!r) continue;
    for (const p of r.top_publishers) {
      const cur = byDomain.get(p.domain) ?? { volume_usdc: '0', count: 0 };
      cur.volume_usdc = addDecimal(cur.volume_usdc, p.volume_usdc);
      cur.count += p.count;
      byDomain.set(p.domain, cur);
    }
  }

  const arr = Array.from(byDomain.entries()).map(([domain, v]) => ({ domain, ...v }));
  arr.sort((a, b) => {
    const cmp = compareDecimal(b.volume_usdc, a.volume_usdc);
    if (cmp !== 0) return cmp;
    if (b.count !== a.count) return b.count - a.count;
    return a.domain.localeCompare(b.domain);
  });

  const sliced = arr.slice(0, clampedLimit);
  const totalMicro = sliced.reduce((acc, e) => acc + toMicroUnits(e.volume_usdc), 0n);
  const leaders: LeaderboardEntry[] = sliced.map((e, idx) => ({
    rank: idx + 1,
    domain: e.domain,
    volume_usdc: fromMicroUnits(toMicroUnits(e.volume_usdc)),
    count: e.count,
    share_pct: totalMicro === 0n ? 0 : Math.round(Number((toMicroUnits(e.volume_usdc) * 10000n) / totalMicro)) / 100,
  }));

  return { window, captured_at: now.toISOString(), leaders };
}

export interface RecentResult {
  captured_at: string;
  count: number;
  events: Array<SettlementEvent & { base_explorer_url: string }>;
}

export async function getRecent(env: Env, limit: number, now: Date = new Date()): Promise<RecentResult> {
  const clampedLimit = Math.min(Math.max(limit, 1), 50);
  const raw = (await env.TENSORFEED_CACHE.get(KV_KEY_RECENT, 'json')) as SettlementEvent[] | null;
  const events = (raw ?? []).slice(0, clampedLimit).map((e) => ({
    ...e,
    base_explorer_url: `https://basescan.org/tx/${e.tx_hash}`,
  }));
  return { captured_at: now.toISOString(), count: events.length, events };
}

export interface PublishersResult {
  captured_at: string;
  count: number;
  publishers: PublisherRecord[];
}

export async function getPublishers(env: Env, now: Date = new Date()): Promise<PublishersResult> {
  const walletMap = ((await env.TENSORFEED_CACHE.get(KV_KEY_PUBLISHERS, 'json')) as Record<string, string> | null) ?? {};
  const domains = Array.from(new Set(Object.values(walletMap)));
  const publishers = await Promise.all(
    domains.map(async (d) => (await env.TENSORFEED_CACHE.get(kvKeyPublisher(d), 'json')) as PublisherRecord | null),
  );
  const filtered = publishers.filter((p): p is PublisherRecord => p !== null);
  return { captured_at: now.toISOString(), count: filtered.length, publishers: filtered };
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

export interface PublisherReceiptsResult {
  publisher: { domain: string; pay_to_wallets: string[]; first_seen: string };
  window: { from: string; to: string; days: number };
  rollup: {
    volume_usdc: string;
    count: number;
    avg_amount: string;
    daily_series: Array<{ date: string; volume_usdc: string; count: number }>;
  };
  attribution: string;
  license: string;
}

export async function getPublisherReceipts(
  env: Env,
  domain: string,
  from: string,
  to: string,
): Promise<PublisherReceiptsResult | null> {
  const pubRec = (await env.TENSORFEED_CACHE.get(kvKeyPublisher(domain), 'json')) as PublisherRecord | null;
  if (!pubRec) return null;

  const dates = datesBetween(from, to);
  const perDay = await Promise.all(
    dates.map((d) => env.TENSORFEED_CACHE.get(kvKeyPubDayRollup(domain, d), 'json') as Promise<PublisherDailyRollup | null>),
  );

  const daily_series = dates.map((date, idx) => {
    const r = perDay[idx];
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
    attribution: 'TensorFeed x402 settlement index over public Base mainnet on-chain data',
    license: 'CC BY 4.0',
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
