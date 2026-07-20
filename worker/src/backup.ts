/**
 * KV -> R2 backup (Layer 1 of the disaster recovery plan).
 *
 * Cloudflare KV has no native backup, no trash, no point-in-time
 * recovery. If a namespace is deleted (accidental wrangler command,
 * stolen credentials, Cloudflare-side error) the data is gone. This
 * module ships a daily cron that walks the KV namespaces and writes
 * compressed snapshots to R2 under a date-stamped prefix.
 *
 * WHAT IS BACKED UP
 * -----------------
 * Only the UN-BACKFILLABLE data. TENSORFEED_CACHE holds ~45k keys, but
 * ~88% of them are re-derivable and have no place in a DR snapshot:
 *   - x402-idx:*  (~70%) re-indexes from Base on-chain settlement data
 *   - news:*      (~18%) re-fetches from the RSS sources
 * SKIP_SEGMENTS lists those re-derivable prefixes; every other key
 * (the pay ledger, history snapshots, every dated series) IS backed up.
 * This is both correct (protect what cannot be rebuilt) and fast (~5.4k
 * reads instead of ~45k).
 *
 * SUBREQUEST-LIMIT ARCHITECTURE
 * -----------------------------
 * A Worker invocation is capped at ~1000 subrequests, and each KV get is
 * one subrequest. A single-invocation walk of a large namespace exhausts
 * that budget and silently uploads nothing (which is exactly what used to
 * happen: only NEWS + STATUS ever reached R2). The backup fans out over
 * the SELF service binding: the orchestrator (backupKvToR2) calls the
 * internal endpoint /api/internal/backup-chunk once per chunk via
 * env.SELF.fetch. Every SELF call is a FRESH invocation with its OWN
 * subrequest budget, so a chunk that lists several pages and gets up to
 * CHUNK_MAX_GETS durable keys stays well under the cap regardless of how
 * large the namespace is.
 *
 * RESUMABLE + TIME-BUDGETED
 * -------------------------
 * Progress (namespace index + list cursor + part index + accumulators)
 * is persisted to `backup:progress` in TENSORFEED_CACHE. The cron runs
 * with no time budget and completes in one invocation. A caller may pass
 * a budgetMs (the admin trigger does), in which case the run persists
 * progress and returns in_progress when the budget is hit; calling again
 * the same day resumes. A run for a new date starts fresh.
 *
 * OBJECT LAYOUT
 * -------------
 *   r2://tensorfeed-backups/{YYYY-MM-DD}/{NAMESPACE}.part-{NNNN}.jsonl.gz
 *   r2://tensorfeed-backups/{YYYY-MM-DD}/manifest.json
 *
 * Each JSONL line is one record: { "k": key, "v": value-as-text, "m": metadata|null }.
 * Restore concatenates a namespace's parts (listed in the manifest) in
 * ascending part order and gunzips each. See docs/restore-from-backup.md.
 */

import type { Env } from './types';
import { sendEmail } from './alerts';

const BACKUP_NAMESPACES: ReadonlyArray<{ binding: keyof Env; name: string }> = [
  { binding: 'TENSORFEED_NEWS', name: 'TENSORFEED_NEWS' },
  { binding: 'TENSORFEED_STATUS', name: 'TENSORFEED_STATUS' },
  { binding: 'TENSORFEED_CACHE', name: 'TENSORFEED_CACHE' },
  { binding: 'OFAC_AUDIT_LOG', name: 'OFAC_AUDIT_LOG' },
];

// Re-derivable key prefixes to SKIP per namespace, keyed by the first
// colon-segment of the key. These are rebuildable from an external source
// of truth, so they do not belong in a disaster-recovery snapshot:
//   x402-idx: the Base x402 settlement index (re-index from chain)
//   news:     news-derived cache (re-fetch from RSS; source articles live
//             in TENSORFEED_NEWS, which IS backed up)
const SKIP_SEGMENTS: Record<string, ReadonlySet<string>> = {
  TENSORFEED_CACHE: new Set(['x402-idx', 'news']),
};
const EMPTY_SET: ReadonlySet<string> = new Set();

// A chunk lists in pages of this size. Kept small so a single page of durable
// keys is a few dozen gets: fast enough that one sub-invocation never times
// out (a 200-key durable page was too slow and returned 504), while still far
// under the ~1000-subrequest ceiling.
const LIST_PAGE_SIZE = 40;
// A chunk keeps listing while pages are entirely skipped (the x402-idx tail is
// ~32k keys), so a fully-re-derivable region costs few round-trips. It stops
// after the first page that yields durable keys, so gets are bounded to one
// page. This caps how many skip-only pages one chunk walks.
const MAX_LIST_PAGES_PER_CHUNK = 25;
// Parallel KV gets inside a chunk. Sequential gets timed out (504) on a full
// durable page; bounded concurrency keeps a chunk fast while byte-flush keeps
// memory bounded (at most GET_CONCURRENCY values in flight plus the buffer).
const GET_CONCURRENCY = 8;
// Flush a part to R2 once the buffered records reach this many bytes. Bounds
// per-chunk memory regardless of value size (some CACHE values are multi-MB
// history snapshots), well under the 128 MB isolate ceiling. A single chunk
// therefore emits one OR MORE parts.
const FLUSH_BYTES = 8 * 1024 * 1024;
const MAX_CHUNKS_PER_NAMESPACE = 20000; // runaway guard
// Retries for a single chunk invocation before it counts as a stall. An
// intermittent 504 (slow sub-invocation) usually succeeds on a fresh attempt.
const CHUNK_RETRIES = 6;
// Consecutive stalls (across resume calls) before the run gives up on a
// namespace and finalizes incomplete + alerts, rather than resuming forever.
const MAX_STALLS = 15;

const PROGRESS_KEY = 'backup:progress';
const HEALTH_KEY = 'backup:last';
const OPTIONAL_MISSING_ERROR = 'binding_missing_from_env';

function errMsg(e: unknown): string {
  return e instanceof Error ? e.message : String(e);
}

function firstSegment(key: string): string {
  const i = key.indexOf(':');
  return i === -1 ? key : key.slice(0, i);
}

// === Types ===

export interface NamespaceBackupSummary {
  name: string;
  key_count: number; // durable keys actually backed up (excludes skipped)
  byte_count: number;
  sha256_hex: string; // retained for manifest back-compat; always '' post-streaming
  duration_ms: number;
  parts: string[];
  complete: boolean;
  error?: string;
}

export interface BackupManifest {
  run_id: string;
  started_at: string;
  completed_at: string;
  duration_ms: number;
  triggered_by: 'cron' | 'admin';
  worker_version: string;
  complete: boolean;
  in_progress?: boolean;
  namespaces: NamespaceBackupSummary[];
}

export interface ChunkResult {
  name: string;
  parts: string[]; // part object keys written by this chunk (0..N, byte-bounded)
  next_part_index: number; // next free part index after this chunk
  key_count: number;
  byte_count: number;
  done: boolean;
  next_cursor: string | null;
  error?: string;
}

interface NsAccumulator {
  key_count: number;
  byte_count: number;
  parts: string[];
  error?: string;
  started_ms: number;
}

interface BackupProgress {
  date: string;
  run_id: string;
  ns_index: number;
  cursor: string | null;
  part_index: number;
  ns_partial: NsAccumulator;
  done_summaries: NamespaceBackupSummary[];
  stall_count?: number;
}

// === gzip helper ===

async function gzipChunks(chunks: Uint8Array[]): Promise<Uint8Array> {
  const src = new ReadableStream<Uint8Array>({
    start(controller) {
      for (const c of chunks) controller.enqueue(c);
      controller.close();
    },
  });
  const compressed = src.pipeThrough(new CompressionStream('gzip'));
  const reader = compressed.getReader();
  const out: Uint8Array[] = [];
  let len = 0;
  // eslint-disable-next-line no-constant-condition
  while (true) {
    const { value, done } = await reader.read();
    if (done) break;
    if (value) {
      out.push(value);
      len += value.length;
    }
  }
  const buf = new Uint8Array(len);
  let offset = 0;
  for (const c of out) {
    buf.set(c, offset);
    offset += c.length;
  }
  return buf;
}

// === Chunk: back up part of ONE namespace within one invocation ===

/**
 * List pages of one namespace (skipping re-derivable prefixes) until it
 * has CHUNK_MAX_GETS durable keys or CHUNK_MAX_LIST_PAGES pages, gets
 * those values, and writes one compressed part object. Runs inside its
 * own Worker invocation via /api/internal/backup-chunk, so it has a full
 * fresh subrequest budget: up to CHUNK_MAX_LIST_PAGES lists + up to
 * CHUNK_MAX_GETS gets + one put.
 *
 * Returns whether the namespace walk is complete; when not, next_cursor
 * carries the position for the orchestrator's next chunk. A page region
 * that is entirely skipped writes no part but still advances the cursor.
 */
export async function backupNamespaceChunk(
  env: Env,
  params: {
    name: string;
    date: string;
    runId: string;
    cursor: string | null;
    partIndex: number;
    limits?: { pageSize?: number; flushBytes?: number };
  },
): Promise<ChunkResult> {
  const { name, date, runId, cursor, partIndex } = params;
  const pageSize = params.limits?.pageSize ?? LIST_PAGE_SIZE;
  const flushBytes = params.limits?.flushBytes ?? FLUSH_BYTES;
  const base: ChunkResult = {
    name,
    parts: [],
    next_part_index: partIndex,
    key_count: 0,
    byte_count: 0,
    done: true,
    next_cursor: null,
  };

  const nsEntry = BACKUP_NAMESPACES.find((n) => n.name === name);
  if (!nsEntry) return { ...base, error: 'unknown_namespace' };
  const ns = env[nsEntry.binding] as unknown as KVNamespace | undefined;
  if (!ns) return { ...base, error: OPTIONAL_MISSING_ERROR };
  if (!env.BACKUPS_R2) return { ...base, done: false, error: 'BACKUPS_R2_missing' };

  const skip = SKIP_SEGMENTS[name] ?? EMPTY_SET;

  // Phase 1: list pages, consuming entirely-skipped pages for free (zero gets),
  // and stop after the first page that yields durable keys so the get count is
  // bounded to one page. This walks the big re-derivable regions cheaply while
  // keeping each chunk's subrequest cost low.
  let listCursor: string | null = cursor ?? null;
  let done = false;
  const toGet: KVNamespaceListKey<unknown, string>[] = [];
  for (let pages = 0; pages < MAX_LIST_PAGES_PER_CHUNK; pages++) {
    let page: KVNamespaceListResult<unknown, string>;
    try {
      page = await ns.list({ limit: pageSize, cursor: listCursor ?? undefined });
    } catch (e) {
      return { ...base, done: false, next_cursor: cursor, error: `list_failed: ${errMsg(e)}` };
    }
    for (const k of page.keys) {
      if (!skip.has(firstSegment(k.name))) toGet.push(k);
    }
    if (page.list_complete) {
      done = true;
      listCursor = null;
      break;
    }
    listCursor = page.cursor ?? null;
    if (toGet.length > 0) break; // stop after the first page carrying durable keys
    if (listCursor === null) {
      done = true;
      break;
    }
  }
  const finalListCursor: string | null = done ? null : listCursor;

  // Phase 2 + 3: get the durable values SEQUENTIALLY, buffering into byte-
  // bounded parts. Flushing at flushBytes keeps peak memory to roughly one
  // value plus the flush threshold, so a run of multi-MB values cannot blow
  // the isolate. One chunk therefore emits one or more part objects.
  const encoder = new TextEncoder();
  const R2 = env.BACKUPS_R2;
  const parts: string[] = [];
  let partsIndex = partIndex;
  let buffer: Uint8Array[] = [];
  let bufferBytes = 0;
  let byteCount = 0;
  let getError: string | undefined;

  async function flush(): Promise<void> {
    if (buffer.length === 0) return;
    const partStr = String(partsIndex).padStart(4, '0');
    const partKey = `${date}/${name}.part-${partStr}.jsonl.gz`;
    const compressed = await gzipChunks(buffer);
    await R2.put(partKey, compressed, {
      httpMetadata: { contentType: 'application/gzip' },
      customMetadata: { namespace: name, run_id: runId, part_index: partStr },
    });
    parts.push(partKey);
    partsIndex += 1;
    buffer = [];
    bufferBytes = 0;
  }

  for (let i = 0; i < toGet.length; i += GET_CONCURRENCY) {
    const batch = toGet.slice(i, i + GET_CONCURRENCY);
    const results = await Promise.all(
      batch.map(async (k) => {
        try {
          const v = await ns.get(k.name, 'text');
          return { name: k.name, value: v, metadata: k.metadata ?? null };
        } catch (e) {
          getError = getError ?? `get_failed: ${errMsg(e)}`;
          return { name: k.name, value: null, metadata: { backup_get_error: errMsg(e) } };
        }
      }),
    );
    for (const r of results) {
      const line = JSON.stringify({ k: r.name, v: r.value, m: r.metadata }) + '\n';
      const bytes = encoder.encode(line);
      buffer.push(bytes);
      bufferBytes += bytes.length;
      byteCount += bytes.length;
    }
    if (bufferBytes >= flushBytes) {
      try {
        await flush();
      } catch (e) {
        return { ...base, key_count: toGet.length, byte_count: byteCount, done: false, next_cursor: cursor, error: `put_failed: ${errMsg(e)}` };
      }
    }
  }
  try {
    await flush();
  } catch (e) {
    return { ...base, key_count: toGet.length, byte_count: byteCount, done: false, next_cursor: cursor, error: `put_failed: ${errMsg(e)}` };
  }

  const finalDone = finalListCursor === null;
  return {
    name,
    parts,
    next_part_index: partsIndex,
    key_count: toGet.length,
    byte_count: byteCount,
    done: finalDone,
    next_cursor: finalListCursor,
    error: getError,
  };
}

// === Progress persistence ===

async function loadProgress(env: Env): Promise<BackupProgress | null> {
  if (!env.TENSORFEED_CACHE) return null;
  try {
    return (await env.TENSORFEED_CACHE.get(PROGRESS_KEY, 'json')) as BackupProgress | null;
  } catch {
    return null;
  }
}

async function saveProgress(env: Env, prog: BackupProgress): Promise<void> {
  if (!env.TENSORFEED_CACHE) return;
  await env.TENSORFEED_CACHE.put(PROGRESS_KEY, JSON.stringify(prog));
}

async function clearProgress(env: Env): Promise<void> {
  if (!env.TENSORFEED_CACHE) return;
  try {
    await env.TENSORFEED_CACHE.delete(PROGRESS_KEY);
  } catch {
    /* best effort */
  }
}

// === Orchestrator helpers ===

function todayDateStamp(): string {
  return new Date().toISOString().slice(0, 10);
}

function newRunId(): string {
  const t = new Date();
  const stamp = t.toISOString().replace(/[-:.]/g, '').slice(0, 15); // YYYYMMDDTHHMMSS
  const rand = Math.floor(Math.random() * 1e6).toString(16).padStart(5, '0');
  return `${stamp}-${rand}`;
}

async function runChunkViaSelf(
  env: Env,
  secret: string,
  params: { name: string; date: string; runId: string; cursor: string | null; partIndex: number },
): Promise<ChunkResult> {
  if (!env.SELF) throw new Error('SELF service binding is not configured');
  const res = await env.SELF.fetch('https://tensorfeed.ai/api/internal/backup-chunk', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'X-Internal-Auth': secret },
    body: JSON.stringify(params),
    signal: AbortSignal.timeout(30_000),
  });
  if (!res.ok) {
    throw new Error(`backup-chunk endpoint returned status ${res.status}`);
  }
  return (await res.json()) as ChunkResult;
}

function isAlertWorthy(s: NamespaceBackupSummary): boolean {
  if (s.error === OPTIONAL_MISSING_ERROR) return false;
  return !s.complete || Boolean(s.error);
}

async function writeBackupHealth(env: Env, manifest: BackupManifest): Promise<void> {
  try {
    if (!env.TENSORFEED_CACHE) return;
    await env.TENSORFEED_CACHE.put(
      HEALTH_KEY,
      JSON.stringify({
        date: manifest.started_at.slice(0, 10),
        run_id: manifest.run_id,
        complete: manifest.complete,
        completed_at: manifest.completed_at,
        namespaces: manifest.namespaces.map((n) => ({
          name: n.name,
          key_count: n.key_count,
          parts: n.parts.length,
          complete: n.complete,
          error: n.error ?? null,
        })),
      }),
    );
  } catch (e) {
    console.error('[backup] writeBackupHealth failed', errMsg(e));
  }
}

export async function getBackupHealth(env: Env): Promise<unknown | null> {
  if (!env.TENSORFEED_CACHE) return null;
  return env.TENSORFEED_CACHE.get(HEALTH_KEY, 'json');
}

async function alertIncompleteBackup(env: Env, bad: NamespaceBackupSummary[], manifest: BackupManifest): Promise<void> {
  const date = manifest.started_at.slice(0, 10);
  const lines = bad
    .map((n) => `  ${n.name}: complete=${n.complete} keys=${n.key_count} parts=${n.parts.length} error=${n.error ?? 'none'}`)
    .join('\n');
  const text =
    `TensorFeed KV to R2 backup INCOMPLETE for ${date} (run ${manifest.run_id}).\n\n` +
    `Affected namespaces:\n${lines}\n\n` +
    `The disaster-recovery snapshot did not fully complete. This protects the un-backfillable corpus, so investigate worker/src/backup.ts and the /api/internal/backup-chunk path.`;
  console.error('[backup] INCOMPLETE', JSON.stringify({ date, run_id: manifest.run_id, bad }));
  try {
    await sendEmail(env, `[TensorFeed] Backup incomplete ${date}`, `<pre>${text}</pre>`, text);
  } catch (e) {
    console.error('[backup] alert email failed', errMsg(e));
  }
}

function freshAccumulator(): NsAccumulator {
  return { key_count: 0, byte_count: 0, parts: [], error: undefined, started_ms: Date.now() };
}

function buildManifest(
  prog: BackupProgress,
  triggeredBy: 'cron' | 'admin',
  workerVersion: string,
  startedAt: string,
  durationMs: number,
  extraSummaries: NamespaceBackupSummary[],
  inProgress: boolean,
): BackupManifest {
  const namespaces = [...prog.done_summaries, ...extraSummaries];
  const complete = !inProgress && namespaces.filter(isAlertWorthy).length === 0;
  return {
    run_id: prog.run_id,
    started_at: startedAt,
    completed_at: new Date().toISOString(),
    duration_ms: durationMs,
    triggered_by: triggeredBy,
    worker_version: workerVersion,
    complete,
    ...(inProgress ? { in_progress: true } : {}),
    namespaces,
  };
}

/**
 * Main entry point, called from the daily cron (no budget: runs to
 * completion) and from the admin trigger (a budgetMs, so it returns
 * in_progress and can be resumed). Orchestrates the chunked, prefix-scoped
 * backup of every namespace via SELF, writes the manifest on completion,
 * records a health key, and alerts if anything did not complete. Throws
 * only on a deploy misconfiguration (missing R2 / SELF / internal secret).
 */
export async function backupKvToR2(
  env: Env,
  triggeredBy: 'cron' | 'admin',
  workerVersion: string = 'unknown',
  opts?: { budgetMs?: number },
): Promise<BackupManifest> {
  if (!env.BACKUPS_R2) throw new Error('BACKUPS_R2 binding missing from worker env');
  if (!env.SELF) throw new Error('SELF service binding missing from worker env');
  const secret = env.SHARED_INTERNAL_SECRET;
  if (!secret) throw new Error('SHARED_INTERNAL_SECRET missing; backup fan-out cannot authenticate');

  const budgetMs = opts?.budgetMs ?? Number.POSITIVE_INFINITY;
  const wallStart = Date.now();
  const startedAt = new Date().toISOString();
  const dateStamp = todayDateStamp();

  // Resume same-day progress; otherwise start a fresh run.
  let prog = await loadProgress(env);
  if (!prog || prog.date !== dateStamp) {
    prog = {
      date: dateStamp,
      run_id: newRunId(),
      ns_index: 0,
      cursor: null,
      part_index: 0,
      ns_partial: freshAccumulator(),
      done_summaries: [],
    };
  }

  while (prog.ns_index < BACKUP_NAMESPACES.length) {
    const { name } = BACKUP_NAMESPACES[prog.ns_index]!;
    let complete = false;

    for (let guard = 0; guard < MAX_CHUNKS_PER_NAMESPACE; guard++) {
      if (Date.now() - wallStart > budgetMs) {
        // Budget hit mid-namespace: persist and report in_progress.
        await saveProgress(env, prog);
        return buildManifest(prog, triggeredBy, workerVersion, startedAt, Date.now() - wallStart, [], true);
      }

      // Retry the chunk on failure: a chunk invocation can hit an intermittent
      // 504 (a slow sub-invocation) that succeeds on a fresh attempt.
      let chunk: ChunkResult | null = null;
      let lastErr = '';
      for (let attempt = 0; attempt < CHUNK_RETRIES; attempt++) {
        try {
          chunk = await runChunkViaSelf(env, secret, {
            name,
            date: dateStamp,
            runId: prog.run_id,
            cursor: prog.cursor,
            partIndex: prog.part_index,
          });
          break;
        } catch (e) {
          lastErr = errMsg(e);
        }
      }
      if (!chunk) {
        // Persistent chunk failure. Do NOT abandon the namespace or clear
        // progress (that would throw away every part already written and
        // restart from scratch). Preserve everything, leaving ns_index and
        // cursor at the failed position, and pause: the next run/cron resumes
        // exactly here. A stall counter bounds this so a permanently-bad page
        // cannot loop forever, giving up (finalize + alert) after MAX_STALLS.
        prog.stall_count = (prog.stall_count ?? 0) + 1;
        prog.ns_partial.error = `chunk_stalled: ${lastErr}`;
        console.error('[backup] chunk stalled', JSON.stringify({ name, cursor: prog.cursor, stall: prog.stall_count, err: lastErr }));
        if (prog.stall_count < MAX_STALLS) {
          await saveProgress(env, prog);
          return buildManifest(prog, triggeredBy, workerVersion, startedAt, Date.now() - wallStart, [], true);
        }
        complete = false; // give up on this namespace; fall through to finalize + alert
        break;
      }
      prog.stall_count = 0; // a successful chunk resets the stall counter

      if (chunk.parts.length) prog.ns_partial.parts.push(...chunk.parts);
      prog.ns_partial.key_count += chunk.key_count;
      prog.ns_partial.byte_count += chunk.byte_count;
      prog.part_index = chunk.next_part_index;
      if (chunk.error) prog.ns_partial.error = prog.ns_partial.error ?? chunk.error;

      if (chunk.error && !chunk.done) {
        complete = false;
        break;
      }
      if (chunk.done) {
        complete = true;
        break;
      }
      if (!chunk.next_cursor) {
        prog.ns_partial.error = prog.ns_partial.error ?? 'no_cursor_but_not_done';
        complete = false;
        break;
      }
      prog.cursor = chunk.next_cursor;
    }

    prog.done_summaries.push({
      name,
      key_count: prog.ns_partial.key_count,
      byte_count: prog.ns_partial.byte_count,
      sha256_hex: '',
      duration_ms: Date.now() - prog.ns_partial.started_ms,
      parts: prog.ns_partial.parts,
      complete,
      error: prog.ns_partial.error,
    });

    prog.ns_index += 1;
    prog.cursor = null;
    prog.part_index = 0;
    prog.ns_partial = freshAccumulator();
  }

  // All namespaces processed: finalize.
  const manifest = buildManifest(prog, triggeredBy, workerVersion, startedAt, Date.now() - wallStart, [], false);
  await env.BACKUPS_R2.put(`${dateStamp}/manifest.json`, JSON.stringify(manifest, null, 2), {
    httpMetadata: { contentType: 'application/json' },
    customMetadata: { run_id: prog.run_id, complete: String(manifest.complete) },
  });
  await clearProgress(env);
  await writeBackupHealth(env, manifest);

  const bad = manifest.namespaces.filter(isAlertWorthy);
  if (bad.length > 0) {
    await alertIncompleteBackup(env, bad, manifest);
  }

  return manifest;
}

/**
 * List the last N daily backups by date prefix. Returns a flat list
 * across all dates for ease of admin display.
 */
export async function listRecentBackups(
  env: Env,
  limit: number = 30,
): Promise<Array<{ date: string; objects: Array<{ key: string; size: number; uploaded: string }> }>> {
  if (!env.BACKUPS_R2) throw new Error('BACKUPS_R2 binding missing from worker env');
  const objects = await env.BACKUPS_R2.list({ limit: 1000 });
  const byDate = new Map<string, Array<{ key: string; size: number; uploaded: string }>>();
  for (const obj of objects.objects) {
    const m = obj.key.match(/^(\d{4}-\d{2}-\d{2})\//);
    if (!m) continue;
    const date = m[1]!;
    if (!byDate.has(date)) byDate.set(date, []);
    byDate.get(date)!.push({ key: obj.key, size: obj.size, uploaded: obj.uploaded.toISOString() });
  }
  const sortedDates = Array.from(byDate.keys()).sort((a, b) => b.localeCompare(a)).slice(0, limit);
  return sortedDates.map((date) => ({ date, objects: byDate.get(date)! }));
}

/**
 * Read a manifest JSON object directly. Lets the admin endpoint surface
 * key counts + completeness without downloading the gzipped dumps.
 */
export async function readManifest(env: Env, date: string): Promise<BackupManifest | null> {
  if (!env.BACKUPS_R2) throw new Error('BACKUPS_R2 binding missing from worker env');
  const obj = await env.BACKUPS_R2.get(`${date}/manifest.json`);
  if (!obj) return null;
  return obj.json<BackupManifest>();
}
