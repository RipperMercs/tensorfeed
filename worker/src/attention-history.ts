/**
 * Daily AI Attention Index snapshots.
 *
 * The live /api/attention endpoint returns a normalized-within-response
 * attention score per provider. Useful but ahistorical: today's score is
 * always 100 for the top provider regardless of whether the AI conversation
 * is hotter or colder than last week.
 *
 * The snapshot system captures the raw signal counts and the normalized
 * attention_score once per day under `attention-history:YYYY-MM-DD`. The
 * dataset compounds; cannot be backfilled. Backs:
 *   - /api/attention/history          (free, list of dates)
 *   - /api/attention/history/{date}   (free, one day's snapshot)
 *   - /api/premium/attention/series   (paid, per-provider time series with
 *                                      delta + min + max + average over
 *                                      the requested range)
 *
 * Same shape and storage prefix conventions as worker/src/history.ts so
 * future bulk-export tooling can treat them uniformly.
 */

import { Env } from './types';
import { computeAttention, AttentionResponse } from './attention';

const KEY_PREFIX = 'attention-history:';
const INDEX_KEY = 'attention-history:index';
const MAX_INDEX_DATES = 365 * 5;

export const MAX_RANGE_DAYS = 90;
export const DEFAULT_RANGE_DAYS = 30;

const ISO_DATE = /^\d{4}-\d{2}-\d{2}$/;

const todayUTC = (): string => new Date().toISOString().slice(0, 10);
const snapshotKey = (date: string): string => `${KEY_PREFIX}${date}`;

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

interface AttentionSnapshot {
  date: string;
  capturedAt: string;
  data: AttentionResponse;
}

async function loadInputs(env: Env) {
  const [articles, trending, activityHits] = await Promise.all([
    env.TENSORFEED_NEWS.get('articles', 'json') as Promise<unknown[] | null>,
    env.TENSORFEED_CACHE.get('trending-repos', 'json') as Promise<unknown[] | null>,
    env.TENSORFEED_CACHE.get('agent-activity', 'json') as Promise<{ endpoint?: string }[] | null>,
  ]);
  return { articles: articles || [], trending: trending || [], activity: activityHits ? { recent: activityHits } : null };
}

async function updateIndex(env: Env, date: string): Promise<void> {
  const raw = (await env.TENSORFEED_CACHE.get(INDEX_KEY, 'json')) as string[] | null;
  const dates = raw || [];
  if (!dates.includes(date)) {
    dates.unshift(date);
    if (dates.length > MAX_INDEX_DATES) dates.length = MAX_INDEX_DATES;
    await env.TENSORFEED_CACHE.put(INDEX_KEY, JSON.stringify(dates));
  }
}

/**
 * Capture today's attention snapshot. Designed to be called from the daily
 * 7 AM UTC cron after updateDailyData and captureHistory have run, so the
 * inputs reflect the freshly-updated news + trending caches.
 */
export async function captureAttentionSnapshot(env: Env): Promise<{ date: string; providers: number }> {
  const date = todayUTC();
  const inputs = await loadInputs(env);
  const data = computeAttention(
    inputs.articles as Parameters<typeof computeAttention>[0],
    inputs.trending as Parameters<typeof computeAttention>[1],
    inputs.activity,
  );

  const snapshot: AttentionSnapshot = {
    date,
    capturedAt: new Date().toISOString(),
    data,
  };

  await env.TENSORFEED_CACHE.put(snapshotKey(date), JSON.stringify(snapshot));
  await updateIndex(env, date);

  return { date, providers: data.providers.length };
}

export async function listAttentionDates(env: Env): Promise<string[]> {
  const raw = (await env.TENSORFEED_CACHE.get(INDEX_KEY, 'json')) as string[] | null;
  return raw || [];
}

export async function readAttentionSnapshot(env: Env, date: string): Promise<AttentionSnapshot | null> {
  if (!ISO_DATE.test(date)) return null;
  return (await env.TENSORFEED_CACHE.get(snapshotKey(date), 'json')) as AttentionSnapshot | null;
}

export interface RangeResolution {
  ok: boolean;
  error?: string;
  from: string;
  to: string;
}

export function resolveRange(fromParam: string | null, toParam: string | null): RangeResolution {
  const today = todayUTC();
  let from = fromParam?.trim() || addDays(today, -DEFAULT_RANGE_DAYS);
  let to = toParam?.trim() || today;
  if (!ISO_DATE.test(from)) return { ok: false, error: 'invalid_from', from, to };
  if (!ISO_DATE.test(to)) return { ok: false, error: 'invalid_to', from, to };
  if (from > to) [from, to] = [to, from];
  const span = daysBetween(from, to);
  if (span > MAX_RANGE_DAYS) {
    return { ok: false, error: 'range_too_large', from, to };
  }
  return { ok: true, from, to };
}

/**
 * Build a per-provider time series over the requested date range.
 * Returns the daily attention_score, news_24h, news_7d, trending_repos,
 * agent_hits, and rank for the named provider, plus a summary block with
 * min/max/avg score and start->end delta.
 */
export async function getAttentionSeries(
  env: Env,
  providerId: string,
  from: string,
  to: string,
) {
  const span = daysBetween(from, to);
  const dates: string[] = [];
  for (let i = 0; i <= span; i++) dates.push(addDays(from, i));

  const points: {
    date: string;
    attention_score: number | null;
    rank: number | null;
    news_24h: number | null;
    news_7d: number | null;
    trending_repos: number | null;
    agent_hits: number | null;
  }[] = [];

  for (const date of dates) {
    const snap = await readAttentionSnapshot(env, date);
    if (!snap) {
      points.push({ date, attention_score: null, rank: null, news_24h: null, news_7d: null, trending_repos: null, agent_hits: null });
      continue;
    }
    const p = snap.data.providers.find(x => x.id === providerId);
    if (!p) {
      points.push({ date, attention_score: null, rank: null, news_24h: null, news_7d: null, trending_repos: null, agent_hits: null });
    } else {
      points.push({
        date,
        attention_score: p.attention_score,
        rank: p.rank,
        news_24h: p.news_24h,
        news_7d: p.news_7d,
        trending_repos: p.trending_repos,
        agent_hits: p.agent_hits,
      });
    }
  }

  const scored = points.filter(p => typeof p.attention_score === 'number') as { attention_score: number }[];
  const min = scored.length ? Math.min(...scored.map(p => p.attention_score)) : null;
  const max = scored.length ? Math.max(...scored.map(p => p.attention_score)) : null;
  const avg = scored.length
    ? Math.round((scored.reduce((s, p) => s + p.attention_score, 0) / scored.length) * 10) / 10
    : null;
  const first = points.find(p => typeof p.attention_score === 'number')?.attention_score ?? null;
  const last = [...points].reverse().find(p => typeof p.attention_score === 'number')?.attention_score ?? null;
  const delta = first !== null && last !== null ? Math.round((last - first) * 10) / 10 : null;

  return {
    ok: true,
    provider: providerId,
    range: { from, to, days: span + 1 },
    summary: { first, last, delta, min, max, avg, captured_days: scored.length },
    series: points,
  };
}
