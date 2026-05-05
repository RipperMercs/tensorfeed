/**
 * High-resolution status counter capture.
 *
 * Every pollStatusPages run (every 2 min) increments one counter per provider
 * per status bucket inside the day's combined counter object. At 720 polls/day
 * a 7-day uptime % is computed against 5040 samples per provider, vastly more
 * accurate than the legacy day-granular snapshot (which captured a single
 * status reading per provider per day at the captureHistory cron).
 *
 * KV layout — one key per day, all providers in one object:
 *
 *   daycount:2026-05-04 = {
 *     "OpenAI API":  { polls: 720, operational: 715, degraded: 3, down: 0, unknown: 2 },
 *     "Claude API":  { polls: 720, operational: 720, degraded: 0, down: 0, unknown: 0 },
 *     ...
 *   }
 *
 * Cost: 1 read + 1 write per poll cycle = ~1440 ops/day total, well under
 * the Cloudflare free-tier 100k/day cap. Storage: ~10 providers × ~80 bytes
 * = ~800 bytes per day key, ~72KB at the 90-day retention horizon.
 */

import { Env } from './types';

export interface ProviderDayCounter {
  polls: number;
  operational: number;
  degraded: number;
  down: number;
  unknown: number;
}

export type DayCounterMap = Record<string, ProviderDayCounter>;

const COUNTER_RETENTION_DAYS = 90;

function todayUtcKey(now = new Date()): string {
  return now.toISOString().slice(0, 10);
}

function emptyCounter(): ProviderDayCounter {
  return { polls: 0, operational: 0, degraded: 0, down: 0, unknown: 0 };
}

/**
 * Increment today's per-provider counters from a poll cycle's results.
 *
 * One read + one write. Safe to call from pollStatusPages without
 * meaningfully impacting the KV op budget. New providers added mid-day
 * start with a zeroed counter so their uptime % isn't penalized by the
 * polls they missed.
 */
export async function recordPollCycle(
  env: Env,
  results: { name: string; status: 'operational' | 'degraded' | 'down' | 'unknown' }[],
  now = new Date(),
): Promise<void> {
  const dayKey = `daycount:${todayUtcKey(now)}`;
  const existing = (await env.TENSORFEED_STATUS.get(dayKey, 'json')) as DayCounterMap | null;
  const map: DayCounterMap = existing || {};

  for (const r of results) {
    if (!map[r.name]) map[r.name] = emptyCounter();
    map[r.name].polls += 1;
    if (r.status === 'operational') map[r.name].operational += 1;
    else if (r.status === 'degraded') map[r.name].degraded += 1;
    else if (r.status === 'down') map[r.name].down += 1;
    else map[r.name].unknown += 1;
  }

  // KV TTL handles retention so we don't have to enumerate-and-delete.
  // 90 days × 86400s = 7,776,000s. Cloudflare requires expirationTtl >= 60.
  await env.TENSORFEED_STATUS.put(dayKey, JSON.stringify(map), {
    expirationTtl: COUNTER_RETENTION_DAYS * 24 * 60 * 60,
  });
}

/**
 * Read counter objects for an inclusive UTC date range.
 * Missing days are returned as null so callers can distinguish "no data
 * captured" from "all polls were operational".
 */
export async function readCounterRange(
  env: Env,
  fromDate: string,
  toDate: string,
): Promise<{ date: string; counters: DayCounterMap | null }[]> {
  const days = enumerateDates(fromDate, toDate);
  return Promise.all(
    days.map(async (date) => {
      const counters = (await env.TENSORFEED_STATUS.get(
        `daycount:${date}`,
        'json',
      )) as DayCounterMap | null;
      return { date, counters };
    }),
  );
}

export function enumerateDates(fromDate: string, toDate: string): string[] {
  const out: string[] = [];
  const start = new Date(`${fromDate}T00:00:00Z`).getTime();
  const end = new Date(`${toDate}T00:00:00Z`).getTime();
  if (Number.isNaN(start) || Number.isNaN(end) || end < start) return out;
  for (let t = start; t <= end; t += 86400000) {
    out.push(new Date(t).toISOString().slice(0, 10));
  }
  return out;
}

/**
 * Sum per-provider counters across a list of day-counter maps. Providers
 * appearing in any day are included; days where the provider was absent
 * contribute zero (e.g. recently-added providers).
 */
export function sumCountersByProvider(
  daily: { date: string; counters: DayCounterMap | null }[],
): DayCounterMap {
  const out: DayCounterMap = {};
  for (const day of daily) {
    if (!day.counters) continue;
    for (const [provider, c] of Object.entries(day.counters)) {
      if (!out[provider]) out[provider] = emptyCounter();
      out[provider].polls += c.polls;
      out[provider].operational += c.operational;
      out[provider].degraded += c.degraded;
      out[provider].down += c.down;
      out[provider].unknown += c.unknown;
    }
  }
  return out;
}
