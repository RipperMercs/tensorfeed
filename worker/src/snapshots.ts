import { Env, Article } from './types';

/**
 * Rolling hourly snapshot system.
 *
 * Each snapshot type is stored as a single object whose value is an array
 * of up to 24 entries (one per hour). New entries are prepended; the tail
 * is trimmed. If a cron run ever produces empty or missing live data, the
 * latest good snapshot can be restored into the live key so readers
 * never see an empty response.
 *
 * Storage backend: R2 (migrated off KV on 2026-05-12).
 *
 * Why R2 instead of KV
 * --------------------
 * The hourly cron capturing 8 snapshot types = 192 writes/day = ~5,760
 * writes/month. KV billable overage is $5 per million writes after the
 * 1M bundle, so this is pennies in raw cost. The real reason to move
 * is the *bundle competition*: every snapshot write that goes to KV is
 * one fewer write available for hot-path writes (payments, replay
 * protection, anomaly events) before the 1M bundle is exhausted and
 * everything starts billing. R2 has its own separate, generous free
 * tier (10 GB storage, 1M Class A ops/mo) that does not compete with
 * KV bundles at all.
 *
 * Reads are wrapped in Cache API (5 min TTL) so steady-state read load
 * doesn't hit R2 either. Worst case is 12 R2 reads/hour/type at full
 * Cache API miss rate, well under any tier limit.
 *
 * Failure modes
 * -------------
 * Bind missing or R2 outage: write/read functions return as if the
 * snapshot was empty/missing. Callers degrade gracefully (snapshots
 * stop accumulating temporarily; readers fall back to live data).
 */

const MAX_SNAPSHOTS = 24;
const CACHE_TTL_SECONDS = 300; // 5 min; reads are fronted by Cache API

interface SnapshotEntry<T> {
  timestamp: string;
  data: T;
}

type SnapshotType =
  | 'news'
  | 'status:services'
  | 'status:summary'
  | 'status:incidents'
  | 'models'
  | 'benchmarks'
  | 'podcasts'
  | 'trending-repos';

const SNAPSHOT_KEY_PREFIX = 'snapshot:';

function snapshotKey(type: SnapshotType): string {
  return `${SNAPSHOT_KEY_PREFIX}${type}`;
}

function snapshotR2Key(type: SnapshotType): string {
  // Object key in R2. Keep the same logical name as the legacy KV key
  // for traceability against historical logs.
  return `${SNAPSHOT_KEY_PREFIX}${type}.json`;
}

function namespaceFor(env: Env, type: SnapshotType): KVNamespace {
  if (type === 'news') return env.TENSORFEED_NEWS;
  if (type === 'status:services' || type === 'status:summary' || type === 'status:incidents') {
    return env.TENSORFEED_STATUS;
  }
  return env.TENSORFEED_CACHE;
}

function liveKeyFor(type: SnapshotType): string {
  switch (type) {
    case 'news':
      return 'articles';
    case 'status:services':
      return 'services';
    case 'status:summary':
      return 'summary';
    case 'status:incidents':
      return 'incidents';
    case 'models':
      return 'models';
    case 'benchmarks':
      return 'benchmarks';
    case 'podcasts':
      return 'podcasts';
    case 'trending-repos':
      return 'trending-repos';
  }
}

function isGoodLiveValue(type: SnapshotType, value: unknown): boolean {
  if (value === null || value === undefined) return false;
  if (type === 'news') {
    return Array.isArray(value) && value.length > 0;
  }
  if (type === 'status:services' || type === 'status:summary' || type === 'status:incidents') {
    return Array.isArray(value) && value.length > 0;
  }
  if (type === 'podcasts' || type === 'trending-repos') {
    return Array.isArray(value) && value.length > 0;
  }
  if (type === 'models') {
    const v = value as { providers?: unknown[] };
    return Array.isArray(v.providers) && v.providers.length > 0;
  }
  if (type === 'benchmarks') {
    const v = value as { models?: unknown[] };
    return Array.isArray(v.models) && v.models.length > 0;
  }
  return false;
}

// ── R2 + Cache API wrappers ────────────────────────────────────────

function cacheRequestFor(type: SnapshotType): Request {
  return new Request(`https://tf-snapshots.internal/v1/${encodeURIComponent(type)}`, {
    method: 'GET',
  });
}

function getCache(): Cache | null {
  try {
    if (typeof caches === 'undefined') return null;
    return caches.default ?? null;
  } catch {
    return null;
  }
}

async function readSnapshotArrayR2<T>(env: Env, type: SnapshotType): Promise<SnapshotEntry<T>[]> {
  // 1. Try edge Cache API. Free, fast, fronts every read so steady-state
  //    reads never touch R2.
  const cache = getCache();
  const cacheReq = cacheRequestFor(type);
  if (cache) {
    try {
      const hit = await cache.match(cacheReq);
      if (hit) {
        const text = await hit.text();
        const parsed = JSON.parse(text);
        if (Array.isArray(parsed)) return parsed as SnapshotEntry<T>[];
      }
    } catch {
      // Cache miss or parse failure: fall through to R2.
    }
  }

  // 2. R2 read. Object is a JSON array.
  if (!env.SNAPSHOTS_R2) return [];
  let entries: SnapshotEntry<T>[] = [];
  try {
    const obj = await env.SNAPSHOTS_R2.get(snapshotR2Key(type));
    if (obj) {
      const text = await obj.text();
      const parsed = JSON.parse(text);
      if (Array.isArray(parsed)) entries = parsed as SnapshotEntry<T>[];
    }
  } catch (err) {
    console.warn(`snapshots: R2 read failed for ${type}:`, err);
    return [];
  }

  // 3. Populate cache for next reader.
  if (cache && entries.length > 0) {
    try {
      const res = new Response(JSON.stringify(entries), {
        headers: {
          'content-type': 'application/json',
          'cache-control': `s-maxage=${CACHE_TTL_SECONDS}`,
        },
      });
      await cache.put(cacheReq, res);
    } catch {
      // Cache populate failure is non-blocking.
    }
  }

  return entries;
}

async function writeSnapshotArrayR2<T>(
  env: Env,
  type: SnapshotType,
  entries: SnapshotEntry<T>[],
): Promise<void> {
  if (!env.SNAPSHOTS_R2) {
    console.warn(`snapshots: SNAPSHOTS_R2 binding missing, skipping write for ${type}`);
    return;
  }
  await env.SNAPSHOTS_R2.put(snapshotR2Key(type), JSON.stringify(entries), {
    httpMetadata: {
      contentType: 'application/json',
    },
  });
  // Invalidate cache so the next read picks up the fresh array.
  const cache = getCache();
  if (cache) {
    try {
      await cache.delete(cacheRequestFor(type));
    } catch {
      // Cache invalidation failure is non-blocking; cache entry will
      // age out within CACHE_TTL_SECONDS anyway.
    }
  }
}

/**
 * Legacy KV read for fallback during the migration window. R2 starts
 * empty after the bucket is created; until the first hourly cron fires
 * and populates each type, readers will get nothing from R2. Falling
 * back to the last good KV snapshot keeps `restoreFromSnapshot` working
 * during the transition. Remove this fallback after 24h of healthy R2
 * writes (next session).
 */
async function readSnapshotArrayKVFallback<T>(
  env: Env,
  type: SnapshotType,
): Promise<SnapshotEntry<T>[]> {
  const ns = namespaceFor(env, type);
  try {
    const raw = (await ns.get(snapshotKey(type), 'json')) as SnapshotEntry<T>[] | null;
    return Array.isArray(raw) ? raw : [];
  } catch {
    return [];
  }
}

// ── Public API ─────────────────────────────────────────────────────

/**
 * Capture the current live value for a given type into the rolling snapshot
 * array, if the live value looks healthy. Returns true if a snapshot was
 * taken, false if skipped (missing or empty live data).
 *
 * Writes go to R2 only. The hourly cron drives this; KV is no longer
 * touched by the snapshot write path.
 */
export async function captureSnapshot(env: Env, type: SnapshotType): Promise<boolean> {
  const ns = namespaceFor(env, type);
  const live = await ns.get(liveKeyFor(type), 'json');
  if (!isGoodLiveValue(type, live)) {
    console.warn(`snapshot skipped: ${type} live value missing or empty`);
    return false;
  }

  // Read prior array from R2 (with KV fallback during the transition
  // window so we don't lose the rolling history at the moment of cutover).
  let entries = await readSnapshotArrayR2<unknown>(env, type);
  if (entries.length === 0) {
    entries = await readSnapshotArrayKVFallback<unknown>(env, type);
  }
  entries.unshift({ timestamp: new Date().toISOString(), data: live });
  const trimmed = entries.slice(0, MAX_SNAPSHOTS);
  await writeSnapshotArrayR2(env, type, trimmed);
  console.log(`snapshot captured: ${type} (rolling=${trimmed.length}, backend=R2)`);
  return true;
}

/**
 * Capture all known snapshot types. Returns a report for logging.
 */
export async function captureAllSnapshots(env: Env): Promise<{
  captured: SnapshotType[];
  skipped: SnapshotType[];
}> {
  const allTypes: SnapshotType[] = [
    'news',
    'status:services',
    'status:summary',
    'status:incidents',
    'models',
    'benchmarks',
    'podcasts',
    'trending-repos',
  ];

  const captured: SnapshotType[] = [];
  const skipped: SnapshotType[] = [];

  for (const type of allTypes) {
    try {
      const ok = await captureSnapshot(env, type);
      if (ok) captured.push(type);
      else skipped.push(type);
    } catch (err) {
      console.error(`snapshot error for ${type}:`, err);
      skipped.push(type);
    }
  }

  return { captured, skipped };
}

/**
 * Read the latest snapshot for a given type without modifying anything.
 * Prefers R2 (with Cache API in front); falls back to KV during the
 * migration window so `restoreFromSnapshot` keeps working immediately
 * after deploy, before R2 has been populated.
 */
export async function getLatestSnapshot<T>(
  env: Env,
  type: SnapshotType,
): Promise<SnapshotEntry<T> | null> {
  const r2Entries = await readSnapshotArrayR2<T>(env, type);
  if (r2Entries.length > 0) return r2Entries[0];
  const kvEntries = await readSnapshotArrayKVFallback<T>(env, type);
  return kvEntries.length > 0 ? kvEntries[0] : null;
}

/**
 * Restore a specific type from the most recent snapshot back into the live
 * KV key. Used when the live value is missing, empty, or stale. Returns
 * true if a restore happened.
 *
 * The restored value goes back into the LIVE KV key (e.g. `articles`),
 * which is the read-hot path. That single write is small and not a
 * candidate for migration; the snapshot itself is what moved to R2.
 */
export async function restoreFromSnapshot(env: Env, type: SnapshotType): Promise<boolean> {
  const latest = await getLatestSnapshot<unknown>(env, type);
  if (!latest) {
    console.warn(`restore skipped: no snapshot available for ${type}`);
    return false;
  }

  const ns = namespaceFor(env, type);
  await ns.put(liveKeyFor(type), JSON.stringify(latest.data));

  // Also refresh the news meta record so /api/health reflects the restore.
  if (type === 'news') {
    const articles = latest.data as Article[];
    await env.TENSORFEED_NEWS.put(
      'meta',
      JSON.stringify({
        totalArticles: articles.length,
        sourcesPolled: 0,
        sourcesSucceeded: 0,
        lastUpdated: new Date().toISOString(),
        restoredFromSnapshot: true,
        snapshotTimestamp: latest.timestamp,
      }),
    );
    // Also refresh articles:latest so lightweight readers see fresh data.
    await env.TENSORFEED_NEWS.put('articles:latest', JSON.stringify(articles.slice(0, 50)));
  }

  console.log(`restored ${type} from snapshot dated ${latest.timestamp}`);
  return true;
}

/**
 * Summarize snapshot state for debug endpoints. Small response, safe to
 * expose publicly (no secrets, just counts and timestamps).
 */
export async function getSnapshotSummary(
  env: Env,
): Promise<Record<SnapshotType, { count: number; newest: string | null; oldest: string | null }>> {
  const allTypes: SnapshotType[] = [
    'news',
    'status:services',
    'status:summary',
    'status:incidents',
    'models',
    'benchmarks',
    'podcasts',
    'trending-repos',
  ];

  const summary = {} as Record<SnapshotType, { count: number; newest: string | null; oldest: string | null }>;
  for (const type of allTypes) {
    let entries = await readSnapshotArrayR2(env, type);
    if (entries.length === 0) entries = await readSnapshotArrayKVFallback(env, type);
    summary[type] = {
      count: entries.length,
      newest: entries[0]?.timestamp ?? null,
      oldest: entries[entries.length - 1]?.timestamp ?? null,
    };
  }
  return summary;
}

export type { SnapshotType };
