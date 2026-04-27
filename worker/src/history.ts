import { Env } from './types';
import { getAgentActivity } from './activity';

/**
 * Daily historical snapshots for agent payments Phase 0.
 *
 * Captures pricing, models, benchmarks, status, and agent-activity once per
 * day to a dated KV key under the `history:` prefix. The dataset compounds
 * over time and becomes the foundation for Phase 1+ premium products that
 * need historical context (price-change alerts, latency trends, drift).
 *
 * Cannot be backfilled. Every day without snapshots is a day of history lost.
 *
 * Key prefix: `history:` is intentionally distinct from the rolling
 * `snapshot:` prefix used by `worker/src/snapshots.ts`, which is a separate
 * fallback-restore system. Do not confuse the two.
 */

export type HistoryType = 'pricing' | 'models' | 'benchmarks' | 'status' | 'agent-activity';

export const ALL_HISTORY_TYPES: HistoryType[] = [
  'pricing',
  'models',
  'benchmarks',
  'status',
  'agent-activity',
];

interface HistorySnapshot {
  date: string;        // YYYY-MM-DD UTC
  type: HistoryType;
  capturedAt: string;  // ISO 8601 timestamp
  data: unknown;
}

const KEY_PREFIX = 'history:';
const INDEX_KEY = 'history:index';
const MAX_INDEX_DATES = 365 * 5; // soft cap at 5 years of date entries

const todayUTC = (): string => new Date().toISOString().slice(0, 10);
const snapshotKey = (date: string, type: HistoryType): string => `${KEY_PREFIX}${date}:${type}`;

async function fetchPayload(env: Env, type: HistoryType): Promise<unknown | null> {
  switch (type) {
    case 'pricing':
      return env.TENSORFEED_CACHE.get('pricing', 'json');
    case 'models':
      return env.TENSORFEED_CACHE.get('models', 'json');
    case 'benchmarks':
      return env.TENSORFEED_CACHE.get('benchmarks', 'json');
    case 'status':
      return env.TENSORFEED_STATUS.get('services', 'json');
    case 'agent-activity':
      return getAgentActivity(env);
  }
}

function isHealthy(type: HistoryType, payload: unknown): boolean {
  if (payload === null || payload === undefined) return false;
  if (type === 'status') return Array.isArray(payload) && payload.length > 0;
  return typeof payload === 'object';
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

interface CaptureResult {
  date: string;
  captured: HistoryType[];
  skipped: { type: HistoryType; reason: string }[];
}

/**
 * Capture today's snapshot of all history types. Idempotent within the day:
 * if a type's key already exists for today, it is skipped (so re-running
 * the cron or hitting the manual trigger twice does no harm).
 */
export async function captureHistory(env: Env): Promise<CaptureResult> {
  const date = todayUTC();
  const captured: HistoryType[] = [];
  const skipped: { type: HistoryType; reason: string }[] = [];

  for (const type of ALL_HISTORY_TYPES) {
    try {
      const existing = await env.TENSORFEED_CACHE.get(snapshotKey(date, type));
      if (existing) {
        skipped.push({ type, reason: 'already-captured' });
        continue;
      }

      const payload = await fetchPayload(env, type);
      if (!isHealthy(type, payload)) {
        skipped.push({ type, reason: 'no-healthy-data' });
        continue;
      }

      const snapshot: HistorySnapshot = {
        date,
        type,
        capturedAt: new Date().toISOString(),
        data: payload,
      };
      await env.TENSORFEED_CACHE.put(snapshotKey(date, type), JSON.stringify(snapshot));
      captured.push(type);
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      console.error(`history capture failed for ${type}:`, msg);
      skipped.push({ type, reason: msg });
    }
  }

  if (captured.length > 0) {
    await updateIndex(env, date);
  }

  console.log(
    `history captured for ${date}: ${captured.length}/${ALL_HISTORY_TYPES.length} (${captured.join(', ')})`,
  );
  return { date, captured, skipped };
}

interface HistoryListing {
  dates: string[];
  types: HistoryType[];
  count: number;
}

/**
 * List available historical snapshot dates (newest first) and the type set.
 */
export async function listHistory(env: Env): Promise<HistoryListing> {
  const raw = (await env.TENSORFEED_CACHE.get(INDEX_KEY, 'json')) as string[] | null;
  const dates = raw || [];
  return { dates, types: ALL_HISTORY_TYPES, count: dates.length };
}

/**
 * Read a specific historical snapshot. Returns null on invalid date format,
 * unknown type, or missing snapshot.
 */
export async function readHistory(
  env: Env,
  date: string,
  type: string,
): Promise<HistorySnapshot | null> {
  if (!ALL_HISTORY_TYPES.includes(type as HistoryType)) return null;
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) return null;
  return (await env.TENSORFEED_CACHE.get(
    snapshotKey(date, type as HistoryType),
    'json',
  )) as HistorySnapshot | null;
}
