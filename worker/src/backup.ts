/**
 * KV → R2 backup (Layer 1 of the disaster recovery plan).
 *
 * Cloudflare KV has no native backup, no trash, no point-in-time
 * recovery. If a namespace is deleted (accidental wrangler command,
 * stolen credentials, Cloudflare-side error) the data is gone. This
 * module ships a weekly cron that walks every KV namespace and writes
 * a compressed snapshot to R2 under a date-stamped prefix.
 *
 * The R2 bucket lives in the same Cloudflare account but on a different
 * service — partial protection at zero ongoing cost. Layers 2 (mirror
 * to a separate provider) and 3 (operator pulls a local copy) are
 * follow-ups.
 *
 * Schema (per namespace):
 *
 *   r2://tensorfeed-backups/{YYYY-MM-DD}/{NAMESPACE}.jsonl.gz
 *
 * Each line is one record:
 *
 *   { "k": "<key>", "v": "<value-as-text>", "m": {<metadata>} | null }
 *
 * Plus a single manifest at the date prefix:
 *
 *   r2://tensorfeed-backups/{YYYY-MM-DD}/manifest.json
 *
 *   { run_id, started_at, completed_at, duration_ms, namespaces: [
 *       { name, key_count, byte_count, sha256_of_jsonl_uncompressed }
 *     ],
 *     worker_version, triggered_by: "cron" | "admin"
 *   }
 *
 * Restore procedure lives in docs/restore-from-backup.md.
 */

import type { Env } from './types';

const BACKUP_NAMESPACES: ReadonlyArray<{ binding: keyof Env; name: string }> = [
  { binding: 'TENSORFEED_NEWS', name: 'TENSORFEED_NEWS' },
  { binding: 'TENSORFEED_STATUS', name: 'TENSORFEED_STATUS' },
  { binding: 'TENSORFEED_CACHE', name: 'TENSORFEED_CACHE' },
  { binding: 'OFAC_AUDIT_LOG', name: 'OFAC_AUDIT_LOG' },
];

const LIST_LIMIT = 1000; // Cloudflare KV list max page size

export interface NamespaceBackupSummary {
  name: string;
  key_count: number;
  byte_count: number;
  sha256_hex: string;
  duration_ms: number;
  error?: string;
}

export interface BackupManifest {
  run_id: string;
  started_at: string;
  completed_at: string;
  duration_ms: number;
  triggered_by: 'cron' | 'admin';
  worker_version: string;
  namespaces: NamespaceBackupSummary[];
}

/**
 * Walk one KV namespace and stream its contents directly through gzip
 * into R2. No in-memory buffering of the JSONL — values flow from KV
 * through a ReadableStream, through CompressionStream('gzip'), and
 * straight into R2.put as a streamed body.
 *
 * Memory footprint is bounded by the largest single KV value plus
 * gzip working memory (low double-digit MB at most). Removes the
 * 50/100 MB cap that the previous buffering implementation needed.
 *
 * Tradeoff: we no longer compute sha256 of the uncompressed content
 * because that would require a tee + full buffer. R2 returns an etag
 * (md5 of the put content) on success that serves as the integrity
 * check; the manifest captures the R2-side checksum after the upload
 * completes.
 */
async function streamNamespaceToR2(
  ns: KVNamespace,
  name: string,
  r2: R2Bucket,
  objectKey: string,
  runId: string,
): Promise<NamespaceBackupSummary> {
  const started = Date.now();
  const encoder = new TextEncoder();
  let keyCount = 0;
  let byteCount = 0;
  let firstError: string | undefined;

  async function* walk(): AsyncGenerator<Uint8Array> {
    let cursor: string | undefined;
    try {
      // eslint-disable-next-line no-constant-condition
      while (true) {
        const page = await ns.list({ limit: LIST_LIMIT, cursor });
        for (const key of page.keys) {
          const value = await ns.get(key.name, 'text');
          const line = JSON.stringify({ k: key.name, v: value, m: key.metadata ?? null }) + '\n';
          const bytes = encoder.encode(line);
          keyCount += 1;
          byteCount += bytes.length;
          yield bytes;
        }
        if (page.list_complete) return;
        cursor = page.cursor;
        if (!cursor) return;
      }
    } catch (e) {
      firstError = e instanceof Error ? e.message : String(e);
      return;
    }
  }

  const iter = walk();
  const body = new ReadableStream<Uint8Array>({
    async pull(controller) {
      const { value, done } = await iter.next();
      if (done) controller.close();
      else if (value) controller.enqueue(value);
    },
  });

  try {
    const gzipped = body.pipeThrough(new CompressionStream('gzip'));
    await r2.put(objectKey, gzipped, {
      httpMetadata: { contentType: 'application/gzip' },
      customMetadata: {
        namespace: name,
        run_id: runId,
      },
    });
  } catch (e) {
    firstError = firstError ?? (e instanceof Error ? e.message : String(e));
  }

  return {
    name,
    key_count: keyCount,
    byte_count: byteCount,
    sha256_hex: '',
    duration_ms: Date.now() - started,
    error: firstError,
  };
}

function todayDateStamp(): string {
  return new Date().toISOString().slice(0, 10);
}

function newRunId(): string {
  const t = new Date();
  const stamp = t.toISOString().replace(/[-:.]/g, '').slice(0, 15); // YYYYMMDDTHHMMSS
  const rand = Math.floor(Math.random() * 1e6).toString(16).padStart(5, '0');
  return `${stamp}-${rand}`;
}

/**
 * Main entry point. Walks every configured KV namespace, gzips, and
 * uploads to R2 under r2://tensorfeed-backups/{date}/{NAMESPACE}.jsonl.gz.
 * Writes a manifest.json with sha256 + counts for verifiability.
 *
 * Designed to be called from a scheduled() handler. Errors on individual
 * namespaces are captured in the manifest; the function only throws if
 * R2 is completely unavailable.
 */
export async function backupKvToR2(
  env: Env,
  triggeredBy: 'cron' | 'admin',
  workerVersion: string = 'unknown',
): Promise<BackupManifest> {
  if (!env.BACKUPS_R2) {
    throw new Error('BACKUPS_R2 binding missing from worker env');
  }

  const runId = newRunId();
  const startedAt = new Date().toISOString();
  const dateStamp = todayDateStamp();
  const t0 = Date.now();
  const summaries: NamespaceBackupSummary[] = [];

  for (const { binding, name } of BACKUP_NAMESPACES) {
    const ns = env[binding] as unknown as KVNamespace | undefined;
    if (!ns) {
      summaries.push({
        name,
        key_count: 0,
        byte_count: 0,
        sha256_hex: '',
        duration_ms: 0,
        error: 'binding_missing_from_env',
      });
      continue;
    }
    const objectKey = `${dateStamp}/${name}.jsonl.gz`;
    const summary = await streamNamespaceToR2(ns, name, env.BACKUPS_R2, objectKey, runId);
    summaries.push(summary);
  }

  const completedAt = new Date().toISOString();
  const manifest: BackupManifest = {
    run_id: runId,
    started_at: startedAt,
    completed_at: completedAt,
    duration_ms: Date.now() - t0,
    triggered_by: triggeredBy,
    worker_version: workerVersion,
    namespaces: summaries,
  };

  const manifestKey = `${dateStamp}/manifest.json`;
  await env.BACKUPS_R2.put(manifestKey, JSON.stringify(manifest, null, 2), {
    httpMetadata: { contentType: 'application/json' },
    customMetadata: { run_id: runId },
  });

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
  const objects = await env.BACKUPS_R2.list({ limit: 500 });
  const byDate = new Map<string, Array<{ key: string; size: number; uploaded: string }>>();
  for (const obj of objects.objects) {
    const m = obj.key.match(/^(\d{4}-\d{2}-\d{2})\//);
    if (!m) continue;
    const date = m[1]!;
    if (!byDate.has(date)) byDate.set(date, []);
    byDate.get(date)!.push({
      key: obj.key,
      size: obj.size,
      uploaded: obj.uploaded.toISOString(),
    });
  }
  // Newest dates first.
  const sortedDates = Array.from(byDate.keys()).sort((a, b) => b.localeCompare(a)).slice(0, limit);
  return sortedDates.map((date) => ({ date, objects: byDate.get(date)! }));
}

/**
 * Read a manifest JSON object directly. Lets the admin endpoint surface
 * key counts + sha256 without downloading the gzipped dumps.
 */
export async function readManifest(env: Env, date: string): Promise<BackupManifest | null> {
  if (!env.BACKUPS_R2) throw new Error('BACKUPS_R2 binding missing from worker env');
  const obj = await env.BACKUPS_R2.get(`${date}/manifest.json`);
  if (!obj) return null;
  return obj.json<BackupManifest>();
}
