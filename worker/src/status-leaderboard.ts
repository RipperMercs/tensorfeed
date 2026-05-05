/**
 * Cross-provider uptime leaderboard.
 *
 * Ranks all monitored AI providers by uptime % across a configurable date
 * range, with companion metrics (total polls, downtime minutes, incident
 * count, MTTR). Powers free /api/status/leaderboard (capped at 7 days) and
 * premium /api/premium/status/leaderboard (full date range, includes
 * incidents and MTTR).
 *
 * Data source priority:
 *   1. High-resolution day counters from status-counters.ts (recorded every
 *      poll cycle = 720 samples/provider/day at our 2-min cadence). Used
 *      whenever any day in the range has counter data.
 *   2. No fallback. The legacy day-granular snapshot is too coarse for the
 *      "compare uptime % across providers" use case the leaderboard exists
 *      for. Endpoints return ok:false when there's no counter coverage yet
 *      (e.g. immediately after deploy, before the first poll cycle runs).
 */

import { Env } from './types';
import {
  DayCounterMap,
  ProviderDayCounter,
  enumerateDates,
  readCounterRange,
  sumCountersByProvider,
} from './status-counters';

// Our public-facing poll cadence. Consumed here to convert poll counts into
// minute-equivalent downtime. If wrangler.toml's status cron changes, update
// this constant — it's the only canonical place that maps polls to minutes.
const POLL_INTERVAL_MINUTES = 2;

export interface LeaderboardEntry {
  provider: string;
  rank: number;
  uptime_pct: number; // 0-100, four decimals
  polls: number;
  operational_polls: number;
  degraded_polls: number;
  down_polls: number;
  unknown_polls: number;
  downtime_minutes: number; // (degraded + down) × POLL_INTERVAL_MINUTES
  hard_down_minutes: number; // down × POLL_INTERVAL_MINUTES (excludes degraded)
  incident_count?: number; // premium only
  mttr_minutes?: number | null; // premium only
}

export interface LeaderboardResult {
  ok: true;
  range: { from: string; to: string; days: number };
  generated_at: string;
  entry_count: number;
  poll_interval_minutes: number;
  entries: LeaderboardEntry[];
}

export interface LeaderboardErrorResult {
  ok: false;
  error: string;
  message: string;
  range?: { from: string; to: string; days: number };
}

export interface ComputeOptions {
  includeIncidents?: boolean; // premium tier
}

interface IncidentForMttr {
  service: string;
  startedAt: string;
  resolvedAt: string | null;
  durationMinutes: number | null;
}

/**
 * Compute the leaderboard. Pure-ish: takes Env to read KV but otherwise
 * deterministic given the captured data. Returns sorted-by-uptime-DESC.
 */
export async function computeLeaderboard(
  env: Env,
  fromDate: string,
  toDate: string,
  opts: ComputeOptions = {},
): Promise<LeaderboardResult | LeaderboardErrorResult> {
  const days = enumerateDates(fromDate, toDate);
  if (days.length === 0) {
    return {
      ok: false,
      error: 'invalid_range',
      message: `Invalid date range. from=${fromDate} to=${toDate}.`,
    };
  }

  const dailyCounters = await readCounterRange(env, fromDate, toDate);
  const haveAnyData = dailyCounters.some((d) => d.counters !== null);
  if (!haveAnyData) {
    return {
      ok: false,
      error: 'no_data',
      message:
        'No high-resolution counter data captured yet for this range. Counters started accumulating after the leaderboard module was deployed; check back in a few hours.',
      range: { from: fromDate, to: toDate, days: days.length },
    };
  }

  const totals = sumCountersByProvider(dailyCounters);
  const entries: LeaderboardEntry[] = [];

  for (const [provider, c] of Object.entries(totals)) {
    const decisive = c.operational + c.degraded + c.down; // exclude unknown from denominator
    const uptime_pct =
      decisive > 0
        ? round4(((c.operational + 0.5 * c.degraded) / decisive) * 100)
        : 0;
    entries.push({
      provider,
      rank: 0, // assigned after sort
      uptime_pct,
      polls: c.polls,
      operational_polls: c.operational,
      degraded_polls: c.degraded,
      down_polls: c.down,
      unknown_polls: c.unknown,
      downtime_minutes: (c.degraded + c.down) * POLL_INTERVAL_MINUTES,
      hard_down_minutes: c.down * POLL_INTERVAL_MINUTES,
    });
  }

  // Premium: add incident_count and mttr_minutes per provider.
  if (opts.includeIncidents) {
    const incidentsRaw = (await env.TENSORFEED_STATUS.get(
      'incidents',
      'json',
    )) as IncidentForMttr[] | null;
    const incidents = incidentsRaw || [];
    const startMs = new Date(`${fromDate}T00:00:00Z`).getTime();
    const endMs = new Date(`${toDate}T23:59:59Z`).getTime();

    const incsInRange = incidents.filter((i) => {
      const t = new Date(i.startedAt).getTime();
      return t >= startMs && t <= endMs;
    });

    const byService = new Map<string, IncidentForMttr[]>();
    for (const inc of incsInRange) {
      const arr = byService.get(inc.service) || [];
      arr.push(inc);
      byService.set(inc.service, arr);
    }

    for (const e of entries) {
      const provIncs = byService.get(e.provider) || [];
      e.incident_count = provIncs.length;
      const resolvedDurations = provIncs
        .filter((i) => typeof i.durationMinutes === 'number')
        .map((i) => i.durationMinutes as number);
      e.mttr_minutes =
        resolvedDurations.length > 0
          ? Math.round(
              (resolvedDurations.reduce((a, b) => a + b, 0) / resolvedDurations.length) * 10,
            ) / 10
          : null;
    }
  }

  // Sort by uptime DESC, with ties broken by lower hard_down_minutes
  // (a clean degraded period beats actual downs at the same headline %).
  entries.sort((a, b) => {
    if (b.uptime_pct !== a.uptime_pct) return b.uptime_pct - a.uptime_pct;
    return a.hard_down_minutes - b.hard_down_minutes;
  });
  entries.forEach((e, i) => {
    e.rank = i + 1;
  });

  return {
    ok: true,
    range: { from: fromDate, to: toDate, days: days.length },
    generated_at: new Date().toISOString(),
    entry_count: entries.length,
    poll_interval_minutes: POLL_INTERVAL_MINUTES,
    entries,
  };
}

function round4(n: number): number {
  return Math.round(n * 10000) / 10000;
}

/**
 * Resolve a "last N days" request to from/to ISO dates (inclusive).
 * Used by the free endpoint where the caller passes ?days=7 instead of
 * explicit from/to. Caller is expected to clamp `days` to its tier limit.
 */
export function resolveLastNDays(days: number, now = new Date()): { from: string; to: string } {
  const to = now.toISOString().slice(0, 10);
  const fromMs = now.getTime() - (days - 1) * 86400000;
  const from = new Date(fromMs).toISOString().slice(0, 10);
  return { from, to };
}

// Re-exported for unit tests so they can build counter maps without going
// through KV. Not used by the runtime path.
export type { DayCounterMap, ProviderDayCounter };
