/**
 * News history capture.
 *
 * Two daily archives backstop the existing live news flow:
 *   1. `news:daily:{YYYY-MM-DD}` is a snapshot of the deduped article
 *      array as of the most recent hourly RSS poll for that UTC day.
 *      Overwritten on every hourly poll, so the day's final state is
 *      whatever the last poll before midnight wrote.
 *   2. `news:source-health:{YYYY-MM-DD}` accumulates per-source poll
 *      counters across the day (ok, empty, error, articles_total,
 *      last_status). Read-modify-write per hourly poll. Reliability
 *      score per source is derived at read time, not stored.
 *
 * Both indexes (`news:daily:index`, `news:source-health:index`) are
 * append-only ordered date lists capped at 730 days, matching the
 * pattern used by every other `*:index` key in the worker.
 *
 * Why both backstops live in TENSORFEED_CACHE: that namespace already
 * holds every other `history:*` and `*:daily:*` key (see
 * docs/ARCHITECTURE.md KV layout). Keeping news history alongside the
 * rest avoids a fourth namespace.
 *
 * KV op budget: at ~24 hourly polls per day,
 *   - news:daily:{date}            24 writes per day, single key
 *   - news:source-health:{date}    24 reads + 24 writes (RMW)
 *   - news:daily:index             1-2 writes per day (idempotent)
 *   - news:source-health:index     1-2 writes per day (idempotent)
 * Total: ~75 ops per day for this feature, comfortably inside the
 * 100k/day Cloudflare KV budget.
 */

import type { Article, Env } from './types';
import type { RSSPollResult } from './rss';

const NEWS_DAILY_KEY = (date: string) => `news:daily:${date}`;
const NEWS_DAILY_INDEX = 'news:daily:index';
const SOURCE_HEALTH_KEY = (date: string) => `news:source-health:${date}`;
const SOURCE_HEALTH_INDEX = 'news:source-health:index';

const INDEX_CAP_DAYS = 730;

export interface NewsDailySnapshot {
  date: string;
  captured_at: string;
  articles_count: number;
  articles: Article[];
}

export interface SourceHealthCounters {
  name: string;
  polls: number;
  polls_ok: number;
  polls_empty: number;
  polls_error: number;
  articles_total: number;
  last_status: 'ok' | 'empty' | 'error';
  last_error?: string;
  last_seen_at: string;
}

export interface SourceHealthDay {
  date: string;
  total_polls: number;
  updated_at: string;
  sources: Record<string, SourceHealthCounters>;
}

function todayUTC(now: Date = new Date()): string {
  return now.toISOString().slice(0, 10);
}

async function ensureDateInIndex(env: Env, key: string, date: string): Promise<void> {
  const list = (await env.TENSORFEED_CACHE.get<string[]>(key, 'json')) ?? [];
  if (list.includes(date)) return;
  list.push(date);
  list.sort();
  while (list.length > INDEX_CAP_DAYS) list.shift();
  await env.TENSORFEED_CACHE.put(key, JSON.stringify(list));
}

/**
 * Persist the day's news snapshot and roll the per-source health counters
 * forward by one poll. Called from the tail of `pollRSSFeeds`.
 */
export async function recordRSSPoll(
  env: Env,
  pollResult: RSSPollResult,
  articles: Article[],
  now: Date = new Date(),
): Promise<void> {
  const date = todayUTC(now);
  const ts = now.toISOString();

  const snapshot: NewsDailySnapshot = {
    date,
    captured_at: ts,
    articles_count: articles.length,
    articles,
  };

  await env.TENSORFEED_CACHE.put(NEWS_DAILY_KEY(date), JSON.stringify(snapshot));
  await ensureDateInIndex(env, NEWS_DAILY_INDEX, date);

  const existing = await env.TENSORFEED_CACHE.get<SourceHealthDay>(SOURCE_HEALTH_KEY(date), 'json');
  const day: SourceHealthDay = existing ?? {
    date,
    total_polls: 0,
    updated_at: ts,
    sources: {},
  };

  day.total_polls += 1;
  day.updated_at = ts;

  for (const sr of pollResult.sourceResults) {
    const slot: SourceHealthCounters = day.sources[sr.id] ?? {
      name: sr.name,
      polls: 0,
      polls_ok: 0,
      polls_empty: 0,
      polls_error: 0,
      articles_total: 0,
      last_status: sr.status,
      last_seen_at: ts,
    };
    slot.name = sr.name;
    slot.polls += 1;
    if (sr.status === 'ok') {
      slot.polls_ok += 1;
      slot.articles_total += sr.articles;
    } else if (sr.status === 'empty') {
      slot.polls_empty += 1;
    } else {
      slot.polls_error += 1;
      if (sr.error) slot.last_error = sr.error;
    }
    slot.last_status = sr.status;
    slot.last_seen_at = ts;
    day.sources[sr.id] = slot;
  }

  await env.TENSORFEED_CACHE.put(SOURCE_HEALTH_KEY(date), JSON.stringify(day));
  await ensureDateInIndex(env, SOURCE_HEALTH_INDEX, date);
}

export async function readNewsDaily(env: Env, date: string): Promise<NewsDailySnapshot | null> {
  return env.TENSORFEED_CACHE.get<NewsDailySnapshot>(NEWS_DAILY_KEY(date), 'json');
}

export async function readSourceHealth(env: Env, date: string): Promise<SourceHealthDay | null> {
  return env.TENSORFEED_CACHE.get<SourceHealthDay>(SOURCE_HEALTH_KEY(date), 'json');
}

export async function listNewsDailyDates(env: Env): Promise<string[]> {
  return (await env.TENSORFEED_CACHE.get<string[]>(NEWS_DAILY_INDEX, 'json')) ?? [];
}

export async function listSourceHealthDates(env: Env): Promise<string[]> {
  return (await env.TENSORFEED_CACHE.get<string[]>(SOURCE_HEALTH_INDEX, 'json')) ?? [];
}

/**
 * Per-source view derived from the stored counters. Adds reliability_pct
 * (rounded to one decimal) and sorts by reliability descending. Sources
 * that never polled OK in the day appear last.
 */
export interface SourceHealthEntry {
  id: string;
  name: string;
  polls: number;
  polls_ok: number;
  polls_empty: number;
  polls_error: number;
  articles_total: number;
  reliability_pct: number;
  last_status: 'ok' | 'empty' | 'error';
  last_error?: string;
  last_seen_at: string;
}

export function summarizeSourceHealth(day: SourceHealthDay): SourceHealthEntry[] {
  const entries: SourceHealthEntry[] = [];
  for (const [id, slot] of Object.entries(day.sources)) {
    const reliability_pct =
      slot.polls > 0 ? Math.round((slot.polls_ok / slot.polls) * 1000) / 10 : 0;
    entries.push({
      id,
      name: slot.name,
      polls: slot.polls,
      polls_ok: slot.polls_ok,
      polls_empty: slot.polls_empty,
      polls_error: slot.polls_error,
      articles_total: slot.articles_total,
      reliability_pct,
      last_status: slot.last_status,
      last_error: slot.last_error,
      last_seen_at: slot.last_seen_at,
    });
  }
  entries.sort((a, b) => b.reliability_pct - a.reliability_pct);
  return entries;
}

const ISO_DATE_RE = /^\d{4}-\d{2}-\d{2}$/;

export function isISODate(s: string | null | undefined): s is string {
  return typeof s === 'string' && ISO_DATE_RE.test(s);
}

/**
 * Enumerate every UTC date from `from` to `to` inclusive.
 * Caller must validate the format and ordering before calling.
 */
export function enumerateDates(from: string, to: string): string[] {
  const start = Date.parse(from + 'T00:00:00Z');
  const end = Date.parse(to + 'T00:00:00Z');
  const out: string[] = [];
  for (let t = start; t <= end; t += 86400_000) {
    out.push(new Date(t).toISOString().slice(0, 10));
  }
  return out;
}
