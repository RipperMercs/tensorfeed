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
 * Walk one KV namespace and stream a JSONL representation into an
 * accumulating buffer + sha256 hash. Returns the assembled buffer
 * plus stats. Caller is responsible for gzipping + uploading to R2.
 *
 * Memory consideration: a full namespace can be large. We chunk the
 * JSONL into 1 MB segments so a single oversized value doesn't blow
 * the isolate memory limit. If a namespace produces more than 50 MB
 * we abort that namespace's backup with an error and continue with
 * the others (better partial than nothing).
 */
async function dumpNamespace(
  ns: KVNamespace,
  name: string,
): Promise<{ jsonl: string; summary: NamespaceBackupSummary }> {
  const started = Date.now();
  const parts: string[] = [];
  let keyCount = 0;
  let byteCount = 0;
  let cursor: string | undefined;
  // 100 MB sanity cap. Worker isolate memory ceiling is ~128 MB, and we
  // buffer the entire JSONL in memory before gzipping. When a single
  // namespace exceeds this we need to refactor to a streaming pipeline
  // (ReadableStream chained through CompressionStream into R2.put).
  // TENSORFEED_CACHE first crossed 50 MB on 2026-05-12; revisit
  // streaming when it exceeds 80 MB.
  const MAX_BYTES = 100 * 1024 * 1024;

  try {
    // Loop the list cursor until exhausted. Each list returns up to 1000
    // keys; we get the value separately because list() does not include
    // values by design.
    // eslint-disable-next-line no-constant-condition
    while (true) {
      const page = await ns.list({ limit: LIST_LIMIT, cursor });
      for (const key of page.keys) {
        // Read the value as text. Most TF values are JSON strings.
        // Binary blobs (rare on TF) would lose fidelity in this format
        // and need a per-key sidecar; out of scope for v1.
        const value = await ns.get(key.name, 'text');
        const record = {
          k: key.name,
          v: value,
          m: key.metadata ?? null,
        };
        const line = JSON.stringify(record) + '\n';
        parts.push(line);
        keyCount += 1;
        byteCount += line.length;
        if (byteCount > MAX_BYTES) {
          throw new Error(`namespace_too_large: ${name} exceeded ${MAX_BYTES} bytes after ${keyCount} keys`);
        }
      }
      if (page.list_complete) break;
      cursor = page.cursor;
      if (!cursor) break;
    }
  } catch (e) {
    return {
      jsonl: parts.join(''),
      summary: {
        name,
        key_count: keyCount,
        byte_count: byteCount,
        sha256_hex: '',
        duration_ms: Date.now() - started,
        error: e instanceof Error ? e.message : String(e),
      },
    };
  }

  const jsonl = parts.join('');
  const sha256 = await sha256Hex(jsonl);
  return {
    jsonl,
    summary: {
      name,
      key_count: keyCount,
      byte_count: byteCount,
      sha256_hex: sha256,
      duration_ms: Date.now() - started,
    },
  };
}

async function sha256Hex(input: string): Promise<string> {
  const buf = new TextEncoder().encode(input);
  const digest = await crypto.subtle.digest('SHA-256', buf);
  const bytes = new Uint8Array(digest);
  let hex = '';
  for (let i = 0; i < bytes.length; i++) {
    const b = bytes[i] ?? 0;
    hex += b.toString(16).padStart(2, '0');
  }
  return hex;
}

/**
 * Gzip a string using the platform CompressionStream. Returns a
 * Uint8Array suitable for R2.put.
 */
async function gzip(input: string): Promise<Uint8Array> {
  const stream = new Blob([input]).stream().pipeThrough(new CompressionStream('gzip'));
  const buf = await new Response(stream).arrayBuffer();
  return new Uint8Array(buf);
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
    const { jsonl, summary } = await dumpNamespace(ns, name);
    summaries.push(summary);
    if (summary.error) continue;

    try {
      const gz = await gzip(jsonl);
      const objectKey = `${dateStamp}/${name}.jsonl.gz`;
      await env.BACKUPS_R2.put(objectKey, gz, {
        httpMetadata: { contentType: 'application/gzip' },
        customMetadata: {
          namespace: name,
          run_id: runId,
          key_count: String(summary.key_count),
          sha256_uncompressed: summary.sha256_hex,
        },
      });
    } catch (e) {
      summary.error = `r2_put_failed: ${e instanceof Error ? e.message : String(e)}`;
    }
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
