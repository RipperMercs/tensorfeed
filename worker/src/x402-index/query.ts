import type { Env } from '../types';
import type { DailyRollup } from './types';
import { kvKeyDayRollup } from './constants';
import { addDecimal, fromMicroUnits, toMicroUnits } from './indexer';

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
