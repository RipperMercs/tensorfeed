/**
 * Per-provider uptime time series.
 *
 * Returns the daily breakdown of operational/degraded/down/unknown polls
 * for a single provider across a date range, plus aggregate summary.
 * Powers the /uptime/{slug} pages on tensorfeed.ai and the
 * /api/uptime/series endpoint.
 *
 * Distinct from getStatusUptime() in history-series.ts which reads the
 * day-granular captureHistory snapshots (one status reading per day).
 * This module reads the new minute-resolution counter data captured by
 * status-counters.ts, so each "day" reflects ~720 status samples.
 */

import { Env } from './types';
import {
  enumerateDates,
  readCounterRange,
  sumCountersByProvider,
} from './status-counters';

const POLL_INTERVAL_MINUTES = 2;

export interface DayPoint {
  date: string;
  polls: number;
  operational: number;
  degraded: number;
  down: number;
  unknown: number;
  uptime_pct: number | null; // null when no decisive samples that day
}

export interface ProviderUptimeSeriesOk {
  ok: true;
  provider: string;
  range: { from: string; to: string; days: number };
  poll_interval_minutes: number;
  series: DayPoint[];
  summary: {
    polls: number;
    operational_polls: number;
    degraded_polls: number;
    down_polls: number;
    unknown_polls: number;
    uptime_pct: number | null;
    downtime_minutes: number;
    hard_down_minutes: number;
    days_with_data: number;
  };
}

export interface ProviderUptimeSeriesErr {
  ok: false;
  error: string;
  message: string;
  range?: { from: string; to: string; days: number };
}

function round4(n: number): number {
  return Math.round(n * 10000) / 10000;
}

export async function getProviderUptimeSeries(
  env: Env,
  provider: string,
  fromDate: string,
  toDate: string,
): Promise<ProviderUptimeSeriesOk | ProviderUptimeSeriesErr> {
  const days = enumerateDates(fromDate, toDate);
  if (days.length === 0) {
    return {
      ok: false,
      error: 'invalid_range',
      message: `Invalid date range. from=${fromDate} to=${toDate}.`,
    };
  }

  const dailyCounters = await readCounterRange(env, fromDate, toDate);

  const series: DayPoint[] = dailyCounters.map(({ date, counters }) => {
    const c = counters?.[provider];
    if (!c) {
      return {
        date,
        polls: 0,
        operational: 0,
        degraded: 0,
        down: 0,
        unknown: 0,
        uptime_pct: null,
      };
    }
    const decisive = c.operational + c.degraded + c.down;
    const uptime_pct =
      decisive > 0 ? round4(((c.operational + 0.5 * c.degraded) / decisive) * 100) : null;
    return {
      date,
      polls: c.polls,
      operational: c.operational,
      degraded: c.degraded,
      down: c.down,
      unknown: c.unknown,
      uptime_pct,
    };
  });

  const totals = sumCountersByProvider(dailyCounters);
  const t = totals[provider] || {
    polls: 0,
    operational: 0,
    degraded: 0,
    down: 0,
    unknown: 0,
  };
  const decisive = t.operational + t.degraded + t.down;
  const uptime_pct =
    decisive > 0 ? round4(((t.operational + 0.5 * t.degraded) / decisive) * 100) : null;
  const days_with_data = series.filter((d) => d.polls > 0).length;

  return {
    ok: true,
    provider,
    range: { from: fromDate, to: toDate, days: days.length },
    poll_interval_minutes: POLL_INTERVAL_MINUTES,
    series,
    summary: {
      polls: t.polls,
      operational_polls: t.operational,
      degraded_polls: t.degraded,
      down_polls: t.down,
      unknown_polls: t.unknown,
      uptime_pct,
      downtime_minutes: (t.degraded + t.down) * POLL_INTERVAL_MINUTES,
      hard_down_minutes: t.down * POLL_INTERVAL_MINUTES,
      days_with_data,
    },
  };
}
