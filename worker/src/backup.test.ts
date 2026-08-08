import { describe, it, expect, vi } from 'vitest';
import {
  backupKvToR2,
  backupNamespaceChunk,
  listRecentBackups,
  readManifest,
  resolveBackupNamespace,
  restoreNamespaceFromR2,
  restoreWriteAuthorized,
} from './backup';
import type { Env } from './types';

/**
 * A KV mock that (a) paginates entries at `internalPage` regardless of the
 * requested list limit, so a small fixture exercises the multi-page walk,
 * and (b) stores non-entry puts (backup:progress, backup:last) in a `_meta`
 * map so the resumable orchestrator can read them back. get(key, 'json')
 * parses stored JSON, matching the real KV binding.
 */
function mockKv(entries: Array<{ key: string; value: string; metadata?: unknown }>, internalPage = 2): any {
  const meta = new Map<string, string>();
  return {
    _meta: meta,
    list: async (opts: any) => {
      const start = opts?.cursor ? parseInt(opts.cursor, 10) : 0;
      const slice = entries.slice(start, start + internalPage);
      const nextStart = start + slice.length;
      const complete = nextStart >= entries.length;
      return {
        keys: slice.map((e) => ({ name: e.key, metadata: e.metadata })),
        list_complete: complete,
        cursor: complete ? '' : String(nextStart),
      };
    },
    get: async (key: string, type?: string) => {
      if (meta.has(key)) {
        const v = meta.get(key)!;
        return type === 'json' ? JSON.parse(v) : v;
      }
      const e = entries.find((x) => x.key === key);
      return e ? e.value : null;
    },
    put: vi.fn(async (key: string, val: string) => {
      meta.set(key, val);
    }),
    delete: vi.fn(async (key: string) => {
      meta.delete(key);
    }),
  };
}

function mockR2(): { bucket: any; puts: Array<{ key: string; value: any; meta: any }> } {
  const puts: Array<{ key: string; value: any; meta: any }> = [];
  const bucket = {
    put: vi.fn(async (key: string, value: any, opts: any) => {
      puts.push({ key, value, meta: opts });
    }),
    list: vi.fn(async () => ({
      objects: [
        { key: '2026-05-12/TENSORFEED_CACHE.part-0000.jsonl.gz', size: 1024, uploaded: new Date('2026-05-12T06:00:00Z') },
        { key: '2026-05-12/manifest.json', size: 500, uploaded: new Date('2026-05-12T06:00:00Z') },
        { key: '2026-05-05/TENSORFEED_NEWS.part-0000.jsonl.gz', size: 900, uploaded: new Date('2026-05-05T06:00:00Z') },
      ],
    })),
    get: vi.fn(async (key: string) => {
      if (key === '2026-05-12/manifest.json') {
        return { json: async () => ({ run_id: 'test-run', complete: true, namespaces: [] }) };
      }
      return null;
    }),
  };
  return { bucket, puts };
}

/** Route SELF /backup-chunk calls to backupNamespaceChunk, optionally injecting small limits. */
function withSelf(env: Env, limits?: { pageSize?: number; flushBytes?: number }): Env {
  (env as any).SELF = {
    fetch: async (_url: string, init: any) => {
      const p = JSON.parse(init.body);
      const result = await backupNamespaceChunk(env, limits ? { ...p, limits } : p);
      return new Response(JSON.stringify(result), { status: 200, headers: { 'Content-Type': 'application/json' } });
    },
  };
  return env;
}

const today = new Date().toISOString().slice(0, 10);

describe('backupNamespaceChunk', () => {
  it('skips re-derivable prefixes and backs up only durable keys', async () => {
    const { bucket } = mockR2();
    const cache = mockKv(
      [
        { key: 'x402-idx:a', value: '1' },
        { key: 'news:b', value: '2' },
        { key: 'pay:credits:t', value: '{"balance":5}' },
        { key: 'history:2026-07-20', value: '{}' },
      ],
      10,
    );
    const env = { TENSORFEED_CACHE: cache, BACKUPS_R2: bucket } as unknown as Env;
    const r = await backupNamespaceChunk(env, { name: 'TENSORFEED_CACHE', date: today, runId: 'run1', cursor: null, partIndex: 0 });
    // x402-idx + news skipped; pay + history kept.
    expect(r.key_count).toBe(2);
    expect(r.done).toBe(true);
    expect(r.parts).toEqual([`${today}/TENSORFEED_CACHE.part-0000.jsonl.gz`]);
  });

  it('processes one list page and reports the next cursor when more remain', async () => {
    const { bucket } = mockR2();
    const entries = Array.from({ length: 5 }, (_, i) => ({ key: `pay:${i}`, value: `${i}` }));
    const cache = mockKv(entries, 2); // page size 2 => first chunk sees 2 keys, more remain
    const env = { TENSORFEED_CACHE: cache, BACKUPS_R2: bucket } as unknown as Env;
    const r = await backupNamespaceChunk(env, { name: 'TENSORFEED_CACHE', date: today, runId: 'run1', cursor: null, partIndex: 0 });
    expect(r.key_count).toBe(2);
    expect(r.done).toBe(false);
    expect(r.next_cursor).not.toBeNull();
  });

  it('byte-flushes into multiple parts within one chunk (memory bound)', async () => {
    const { bucket } = mockR2();
    const entries = Array.from({ length: 20 }, (_, i) => ({ key: `pay:${i}`, value: 'x'.repeat(100) }));
    const cache = mockKv(entries, 100); // all 20 in one page
    const env = { TENSORFEED_CACHE: cache, BACKUPS_R2: bucket } as unknown as Env;
    // A tiny flush threshold forces a flush after every get-batch, so 20 keys
    // spill into several parts, all within a single chunk call. Proves memory
    // never has to hold the whole namespace at once.
    const r = await backupNamespaceChunk(env, {
      name: 'TENSORFEED_CACHE',
      date: today,
      runId: 'run1',
      cursor: null,
      partIndex: 0,
      limits: { flushBytes: 50 },
    });
    expect(r.parts.length).toBeGreaterThanOrEqual(2);
    expect(r.next_part_index).toBe(r.parts.length);
    expect(r.key_count).toBe(20);
    expect(r.done).toBe(true);
  });

  it('returns binding_missing_from_env for an unbound namespace', async () => {
    const { bucket } = mockR2();
    const env = { BACKUPS_R2: bucket } as unknown as Env;
    const r = await backupNamespaceChunk(env, { name: 'OFAC_AUDIT_LOG', date: today, runId: 'run1', cursor: null, partIndex: 0 });
    expect(r.error).toBe('binding_missing_from_env');
    expect(r.done).toBe(true);
    expect(r.key_count).toBe(0);
  });
});

describe('backupKvToR2', () => {
  it('fans out, skips re-derivable CACHE keys, and completes', async () => {
    const { bucket, puts } = mockR2();
    const env = withSelf({
      TENSORFEED_NEWS: mockKv([{ key: 'meta', value: '{}' }]),
      TENSORFEED_STATUS: mockKv([{ key: 'svc', value: 'ok' }]),
      TENSORFEED_CACHE: mockKv([
        { key: 'x402-idx:a', value: '1' },
        { key: 'news:b', value: '2' },
        { key: 'pay:x', value: '3' },
      ]),
      BACKUPS_R2: bucket,
      SHARED_INTERNAL_SECRET: 'secret',
    } as unknown as Env);

    const manifest = await backupKvToR2(env, 'admin', 'test-version');
    expect(manifest.complete).toBe(true);
    expect(manifest.in_progress).toBeUndefined();
    // Only the durable pay:x key is backed up from CACHE.
    expect(manifest.namespaces.find((n) => n.name === 'TENSORFEED_CACHE')!.key_count).toBe(1);
    expect(manifest.namespaces.find((n) => n.name === 'OFAC_AUDIT_LOG')!.error).toBe('binding_missing_from_env');
    expect(puts.some((p) => p.key.endsWith('/manifest.json'))).toBe(true);
  });

  it('REGRESSION: a large durable namespace fans across multiple parts and still completes', async () => {
    // The bug: a big namespace exhausted the subrequest budget mid-walk and
    // never uploaded. Here small injected limits force 3 parts across 5 keys.
    const { bucket, puts } = mockR2();
    const cacheEntries = Array.from({ length: 5 }, (_, i) => ({ key: `pay:${i}`, value: `${i}` }));
    const env = withSelf({
      TENSORFEED_NEWS: mockKv([{ key: 'a', value: '1' }]),
      TENSORFEED_STATUS: mockKv([{ key: 'b', value: '1' }]),
      TENSORFEED_CACHE: mockKv(cacheEntries, 2), // page size 2 => 3 pages => 3 chunks => 3 parts
      BACKUPS_R2: bucket,
      SHARED_INTERNAL_SECRET: 'secret',
    } as unknown as Env);

    const manifest = await backupKvToR2(env, 'cron');
    const cache = manifest.namespaces.find((n) => n.name === 'TENSORFEED_CACHE')!;
    expect(cache.complete).toBe(true);
    expect(cache.key_count).toBe(5);
    expect(cache.parts.length).toBe(3); // ceil(5/2)
    expect(manifest.complete).toBe(true);
    const cacheParts = puts.map((p) => p.key).filter((k) => k.includes('TENSORFEED_CACHE.part-'));
    expect(cacheParts).toContain(`${today}/TENSORFEED_CACHE.part-0000.jsonl.gz`);
    expect(cacheParts).toContain(`${today}/TENSORFEED_CACHE.part-0002.jsonl.gz`);
  });

  it('marks the run incomplete and writes a health key when a part fails to upload', async () => {
    const { bucket } = mockR2();
    bucket.put = vi.fn(async (key: string) => {
      if (key.includes('TENSORFEED_CACHE.part-')) throw new Error('r2_down');
    });
    const cacheKv = mockKv([{ key: 'pay:x', value: '1' }]);
    const env = withSelf({
      TENSORFEED_NEWS: mockKv([{ key: 'a', value: '1' }]),
      TENSORFEED_STATUS: mockKv([{ key: 'b', value: '1' }]),
      TENSORFEED_CACHE: cacheKv,
      BACKUPS_R2: bucket,
      SHARED_INTERNAL_SECRET: 'secret',
    } as unknown as Env);

    const manifest = await backupKvToR2(env, 'cron');
    expect(manifest.complete).toBe(false);
    const cache = manifest.namespaces.find((n) => n.name === 'TENSORFEED_CACHE')!;
    expect(cache.complete).toBe(false);
    expect(cache.error).toContain('put_failed');
    expect(cacheKv.put).toHaveBeenCalledWith('backup:last', expect.any(String));
  });

  it('is resumable: a budgeted run returns in_progress, and a later run completes it', async () => {
    const { bucket } = mockR2();
    const cache = mockKv([{ key: 'pay:1', value: 'a' }, { key: 'pay:2', value: 'b' }]);
    const env = withSelf({
      TENSORFEED_NEWS: mockKv([{ key: 'n', value: 'x' }]),
      TENSORFEED_STATUS: mockKv([{ key: 's', value: 'y' }]),
      TENSORFEED_CACHE: cache,
      BACKUPS_R2: bucket,
      SHARED_INTERNAL_SECRET: 'secret',
    } as unknown as Env);

    const first = await backupKvToR2(env, 'admin', 'v', { budgetMs: -1 });
    expect(first.in_progress).toBe(true);
    expect(first.complete).toBe(false);
    expect(cache._meta.has('backup:progress')).toBe(true);

    const second = await backupKvToR2(env, 'admin', 'v');
    expect(second.complete).toBe(true);
    expect(second.in_progress).toBeUndefined();
    expect(cache._meta.has('backup:progress')).toBe(false); // cleared on completion
  });

  it('retries a flaky chunk (intermittent 504) and still completes', async () => {
    const { bucket } = mockR2();
    const cache = mockKv([{ key: 'pay:1', value: 'a' }, { key: 'pay:2', value: 'b' }]);
    const env = {
      TENSORFEED_NEWS: mockKv([{ key: 'n', value: 'x' }]),
      TENSORFEED_STATUS: mockKv([{ key: 's', value: 'y' }]),
      TENSORFEED_CACHE: cache,
      BACKUPS_R2: bucket,
      SHARED_INTERNAL_SECRET: 'secret',
    } as unknown as Env;
    let cacheFails = 2; // first two CACHE chunk calls 504, then recover
    (env as any).SELF = {
      fetch: async (_url: string, init: any) => {
        const p = JSON.parse(init.body);
        if (p.name === 'TENSORFEED_CACHE' && cacheFails > 0) {
          cacheFails -= 1;
          return new Response('gateway timeout', { status: 504 });
        }
        const r = await backupNamespaceChunk(env, p);
        return new Response(JSON.stringify(r), { status: 200 });
      },
    };
    const m = await backupKvToR2(env, 'admin', 'v');
    expect(m.complete).toBe(true);
    expect(m.namespaces.find((n) => n.name === 'TENSORFEED_CACHE')!.complete).toBe(true);
  });

  it('throws when BACKUPS_R2 is missing', async () => {
    const env = { TENSORFEED_CACHE: mockKv([]), SHARED_INTERNAL_SECRET: 's', SELF: {} } as unknown as Env;
    await expect(backupKvToR2(env, 'cron')).rejects.toThrow(/BACKUPS_R2/);
  });

  it('throws when the SELF binding is missing', async () => {
    const { bucket } = mockR2();
    const env = { BACKUPS_R2: bucket, SHARED_INTERNAL_SECRET: 's' } as unknown as Env;
    await expect(backupKvToR2(env, 'cron')).rejects.toThrow(/SELF/);
  });

  it('throws when SHARED_INTERNAL_SECRET is missing', async () => {
    const { bucket } = mockR2();
    const env = { BACKUPS_R2: bucket, SELF: {} } as unknown as Env;
    await expect(backupKvToR2(env, 'cron')).rejects.toThrow(/SHARED_INTERNAL_SECRET/);
  });
});

/**
 * An R2 mock that honours the real bucket's list() semantics: keys come back
 * in lexicographic order, `prefix` filters, `limit` truncates, and `cursor`
 * resumes. The older fixed-response mock above hid a real bug, because the
 * production code's unprefixed `list({ limit: 1000 })` gets its window eaten
 * by the OLDEST keys once the bucket holds more than 1000 objects.
 */
function faithfulR2(keys: string[]): any {
  const sorted = [...keys].sort();
  return {
    list: vi.fn(async (opts: any = {}) => {
      const prefix = opts.prefix ?? '';
      const limit = opts.limit ?? 1000;
      const matching = sorted.filter((k) => k.startsWith(prefix));
      const start = opts.cursor ? parseInt(opts.cursor, 10) : 0;
      const slice = matching.slice(start, start + limit);
      const nextStart = start + slice.length;
      const truncated = nextStart < matching.length;
      return {
        objects: slice.map((k) => ({ key: k, size: 100, uploaded: new Date('2026-08-01T06:00:00Z') })),
        truncated,
        cursor: truncated ? String(nextStart) : undefined,
      };
    }),
  };
}

/** 30 objects per date across `dates`, mirroring the real part-NNNN layout. */
function keysForDates(dates: string[]): string[] {
  const out: string[] = [];
  for (const d of dates) {
    out.push(`${d}/manifest.json`);
    for (let i = 0; i < 29; i++) {
      out.push(`${d}/TENSORFEED_CACHE.part-${String(i).padStart(4, '0')}.jsonl.gz`);
    }
  }
  return out;
}

describe('listRecentBackups', () => {
  it('groups objects by date prefix, newest first', async () => {
    const bucket = faithfulR2([
      '2026-05-12/TENSORFEED_CACHE.part-0000.jsonl.gz',
      '2026-05-12/manifest.json',
      '2026-05-05/TENSORFEED_NEWS.part-0000.jsonl.gz',
    ]);
    const env = { BACKUPS_R2: bucket } as unknown as Env;
    const recent = await listRecentBackups(env, 30, { today: '2026-05-12', maxLookbackDays: 30 });
    expect(recent.length).toBe(2);
    expect(recent[0]!.date).toBe('2026-05-12');
    expect(recent[0]!.objects.length).toBe(2);
    expect(recent[1]!.date).toBe('2026-05-05');
  });

  it('returns the newest dates when older objects would fill a single 1000-object list window', async () => {
    // 40 dates x 30 objects = 1200 objects, so a single unprefixed
    // list({ limit: 1000 }) never reaches the most recent dates.
    const dates: string[] = [];
    for (let i = 0; i < 40; i++) {
      const d = new Date(Date.UTC(2026, 5, 1) + i * 86400000);
      dates.push(d.toISOString().slice(0, 10));
    }
    const newest = dates[dates.length - 1]!;
    const bucket = faithfulR2(keysForDates(dates));
    const env = { BACKUPS_R2: bucket } as unknown as Env;

    const recent = await listRecentBackups(env, 5, { today: newest, maxLookbackDays: 60 });

    expect(recent[0]!.date).toBe(newest);
    expect(recent.map((r) => r.date)).toEqual(dates.slice(-5).reverse());
  });

  it('skips dates with no backup and still fills the requested count', async () => {
    const present = ['2026-08-07', '2026-08-05', '2026-08-01'];
    const bucket = faithfulR2(keysForDates(present));
    const env = { BACKUPS_R2: bucket } as unknown as Env;

    const recent = await listRecentBackups(env, 3, { today: '2026-08-07', maxLookbackDays: 30 });

    expect(recent.map((r) => r.date)).toEqual(present);
  });

  it('returns every object for a date whose part count exceeds one list page', async () => {
    // 1400 parts for a single day forces cursor pagination within that prefix.
    const keys = ['2026-08-07/manifest.json'];
    for (let i = 0; i < 1400; i++) {
      keys.push(`2026-08-07/TENSORFEED_CACHE.part-${String(i).padStart(4, '0')}.jsonl.gz`);
    }
    const bucket = faithfulR2(keys);
    const env = { BACKUPS_R2: bucket } as unknown as Env;

    const recent = await listRecentBackups(env, 1, { today: '2026-08-07', maxLookbackDays: 1 });

    expect(recent[0]!.objects.length).toBe(1401);
    expect(recent[0]!.objects.some((o) => o.key.endsWith('manifest.json'))).toBe(true);
  });
});

describe('readManifest', () => {
  it('returns the manifest for a known date', async () => {
    const { bucket } = mockR2();
    const env = { BACKUPS_R2: bucket } as unknown as Env;
    const m = await readManifest(env, '2026-05-12');
    expect(m!.run_id).toBe('test-run');
  });

  it('returns null when manifest is missing', async () => {
    const { bucket } = mockR2();
    const env = { BACKUPS_R2: bucket } as unknown as Env;
    const m = await readManifest(env, '2026-01-01');
    expect(m).toBeNull();
  });
});

// === restore ===

/** Gzip a JSONL body the same way backupNamespaceChunk writes parts. */
async function gzipJsonl(records: Array<{ k: string; v: string; m?: unknown }>): Promise<Uint8Array> {
  const text = records.map((r) => JSON.stringify({ k: r.k, v: r.v, m: r.m })).join('\n') + '\n';
  const src = new Blob([text]).stream().pipeThrough(new CompressionStream('gzip'));
  return new Uint8Array(await new Response(src).arrayBuffer());
}

/**
 * An R2 mock holding a manifest plus real gzipped parts, so restore is
 * exercised against the exact bytes the backup writer produces.
 */
async function r2WithBackup(
  date: string,
  namespaces: Array<{
    name: string;
    records: Array<{ k: string; v: string; m?: unknown }>;
    perPart?: number;
    complete?: boolean;
    keyCountOverride?: number;
  }>,
): Promise<any> {
  const store = new Map<string, Uint8Array | string>();
  const manifestNs: unknown[] = [];

  for (const ns of namespaces) {
    const perPart = ns.perPart ?? 2;
    const parts: string[] = [];
    for (let i = 0; i * perPart < ns.records.length; i++) {
      const key = `${date}/${ns.name}.part-${String(i).padStart(4, '0')}.jsonl.gz`;
      store.set(key, await gzipJsonl(ns.records.slice(i * perPart, (i + 1) * perPart)));
      parts.push(key);
    }
    manifestNs.push({
      name: ns.name,
      key_count: ns.keyCountOverride ?? ns.records.length,
      byte_count: 0,
      sha256_hex: '',
      duration_ms: 0,
      parts,
      complete: ns.complete !== false,
      error: null,
    });
  }

  store.set(
    `${date}/manifest.json`,
    JSON.stringify({ run_id: 'restore-fixture', date, complete: true, namespaces: manifestNs }),
  );

  return {
    get: vi.fn(async (key: string) => {
      if (!store.has(key)) return null;
      const val = store.get(key)!;
      if (typeof val === 'string') {
        return { json: async () => JSON.parse(val) };
      }
      return { arrayBuffer: async () => val.buffer.slice(val.byteOffset, val.byteOffset + val.byteLength) };
    }),
  };
}

/** A KV target that records writes. */
function targetKv(): any {
  const written = new Map<string, { value: string; metadata?: unknown }>();
  return {
    _written: written,
    put: vi.fn(async (key: string, value: string, opts?: any) => {
      written.set(key, { value, metadata: opts?.metadata });
    }),
  };
}

describe('restoreWriteAuthorized', () => {
  it('refuses a write with no confirmation token', () => {
    expect(restoreWriteAuthorized('2026-08-07', null)).toBe(false);
    expect(restoreWriteAuthorized('2026-08-07', '')).toBe(false);
  });

  it('refuses a confirmation token for a different date', () => {
    expect(restoreWriteAuthorized('2026-08-07', 'RESTORE-2026-08-06')).toBe(false);
  });

  it('refuses a truthy but wrong token', () => {
    expect(restoreWriteAuthorized('2026-08-07', 'yes')).toBe(false);
    expect(restoreWriteAuthorized('2026-08-07', 'true')).toBe(false);
    expect(restoreWriteAuthorized('2026-08-07', '1')).toBe(false);
  });

  it('authorizes only the token naming the exact date being restored', () => {
    expect(restoreWriteAuthorized('2026-08-07', 'RESTORE-2026-08-07')).toBe(true);
  });
});

describe('resolveBackupNamespace', () => {
  it('resolves a known namespace name to its binding', () => {
    const cache = { put: vi.fn() };
    const env = { TENSORFEED_CACHE: cache } as unknown as Env;
    expect(resolveBackupNamespace(env, 'TENSORFEED_CACHE')).toBe(cache);
  });

  it('returns null for a name outside the backup set', () => {
    const env = { TENSORFEED_CACHE: {} } as unknown as Env;
    expect(resolveBackupNamespace(env, 'SOMETHING_ELSE')).toBeNull();
    expect(resolveBackupNamespace(env, 'BACKUPS_R2')).toBeNull();
  });

  it('returns null when the binding is absent from env', () => {
    const env = {} as unknown as Env;
    expect(resolveBackupNamespace(env, 'TENSORFEED_CACHE')).toBeNull();
  });
});

describe('restoreNamespaceFromR2', () => {
  const DATE = '2026-08-07';

  it('reads every part listed in the manifest and counts records without writing in dry run', async () => {
    const records = [
      { k: 'pay:evt:a', v: '{"usd":0.02}' },
      { k: 'pay:evt:b', v: '{"usd":0.10}' },
      { k: 'history:2026-08-01', v: 'x' },
    ];
    const bucket = await r2WithBackup(DATE, [{ name: 'TENSORFEED_CACHE', records, perPart: 2 }]);
    const target = targetKv();
    const env = { BACKUPS_R2: bucket } as unknown as Env;

    const report = await restoreNamespaceFromR2(env, {
      date: DATE,
      namespace: 'TENSORFEED_CACHE',
      target,
    });

    expect(report.dry_run).toBe(true);
    expect(report.parts_read).toBe(2);
    expect(report.records).toBe(3);
    expect(report.keys_written).toBe(0);
    expect(target.put).not.toHaveBeenCalled();
    expect(report.matches_manifest).toBe(true);
  });

  it('writes every record back into the target namespace when dry run is disabled', async () => {
    const records = [
      { k: 'pay:evt:a', v: '{"usd":0.02}', m: { rail: 'evm' } },
      { k: 'pay:evt:b', v: '{"usd":0.10}' },
    ];
    const bucket = await r2WithBackup(DATE, [{ name: 'TENSORFEED_CACHE', records, perPart: 1 }]);
    const target = targetKv();
    const env = { BACKUPS_R2: bucket } as unknown as Env;

    const report = await restoreNamespaceFromR2(env, {
      date: DATE,
      namespace: 'TENSORFEED_CACHE',
      target,
      dryRun: false,
    });

    expect(report.keys_written).toBe(2);
    expect(target._written.get('pay:evt:a')!.value).toBe('{"usd":0.02}');
    expect(target._written.get('pay:evt:a')!.metadata).toEqual({ rail: 'evm' });
    expect(target._written.get('pay:evt:b')!.value).toBe('{"usd":0.10}');
  });

  it('restores only keys matching the prefix filter', async () => {
    const records = [
      { k: 'pay:evt:a', v: '1' },
      { k: 'news:top', v: '2' },
      { k: 'pay:evt:b', v: '3' },
    ];
    const bucket = await r2WithBackup(DATE, [{ name: 'TENSORFEED_CACHE', records, perPart: 3 }]);
    const target = targetKv();
    const env = { BACKUPS_R2: bucket } as unknown as Env;

    const report = await restoreNamespaceFromR2(env, {
      date: DATE,
      namespace: 'TENSORFEED_CACHE',
      target,
      dryRun: false,
      prefix: 'pay:',
    });

    expect(report.keys_written).toBe(2);
    expect([...target._written.keys()].sort()).toEqual(['pay:evt:a', 'pay:evt:b']);
  });

  it('refuses to write from a namespace the manifest marks incomplete', async () => {
    const bucket = await r2WithBackup(DATE, [
      { name: 'TENSORFEED_CACHE', records: [{ k: 'a', v: '1' }], complete: false },
    ]);
    const target = targetKv();
    const env = { BACKUPS_R2: bucket } as unknown as Env;

    await expect(
      restoreNamespaceFromR2(env, { date: DATE, namespace: 'TENSORFEED_CACHE', target, dryRun: false }),
    ).rejects.toThrow(/incomplete/i);
    expect(target.put).not.toHaveBeenCalled();
  });

  it('restores an incomplete namespace only when explicitly allowed', async () => {
    const bucket = await r2WithBackup(DATE, [
      { name: 'TENSORFEED_CACHE', records: [{ k: 'a', v: '1' }], complete: false },
    ]);
    const target = targetKv();
    const env = { BACKUPS_R2: bucket } as unknown as Env;

    const report = await restoreNamespaceFromR2(env, {
      date: DATE,
      namespace: 'TENSORFEED_CACHE',
      target,
      dryRun: false,
      allowIncomplete: true,
    });

    expect(report.keys_written).toBe(1);
  });

  it('flags a record count that disagrees with the manifest key count', async () => {
    const bucket = await r2WithBackup(DATE, [
      { name: 'TENSORFEED_CACHE', records: [{ k: 'a', v: '1' }], keyCountOverride: 99 },
    ]);
    const env = { BACKUPS_R2: bucket } as unknown as Env;

    const report = await restoreNamespaceFromR2(env, {
      date: DATE,
      namespace: 'TENSORFEED_CACHE',
      target: targetKv(),
    });

    expect(report.records).toBe(1);
    expect(report.manifest_key_count).toBe(99);
    expect(report.matches_manifest).toBe(false);
  });

  it('throws when the date has no manifest', async () => {
    const bucket = await r2WithBackup(DATE, [{ name: 'TENSORFEED_CACHE', records: [{ k: 'a', v: '1' }] }]);
    const env = { BACKUPS_R2: bucket } as unknown as Env;

    await expect(
      restoreNamespaceFromR2(env, { date: '2020-01-01', namespace: 'TENSORFEED_CACHE', target: targetKv() }),
    ).rejects.toThrow(/manifest/i);
  });

  it('throws when the namespace is absent from the manifest', async () => {
    const bucket = await r2WithBackup(DATE, [{ name: 'TENSORFEED_CACHE', records: [{ k: 'a', v: '1' }] }]);
    const env = { BACKUPS_R2: bucket } as unknown as Env;

    await expect(
      restoreNamespaceFromR2(env, { date: DATE, namespace: 'TENSORFEED_STATUS', target: targetKv() }),
    ).rejects.toThrow(/TENSORFEED_STATUS/);
  });

  it('records a missing part as an error instead of silently restoring less', async () => {
    const bucket = await r2WithBackup(DATE, [
      { name: 'TENSORFEED_CACHE', records: [{ k: 'a', v: '1' }, { k: 'b', v: '2' }], perPart: 1 },
    ]);
    const realGet = bucket.get;
    bucket.get = vi.fn(async (key: string) =>
      key.endsWith('part-0001.jsonl.gz') ? null : realGet(key),
    );
    const env = { BACKUPS_R2: bucket } as unknown as Env;

    const report = await restoreNamespaceFromR2(env, {
      date: DATE,
      namespace: 'TENSORFEED_CACHE',
      target: targetKv(),
    });

    expect(report.records).toBe(1);
    expect(report.errors.some((e) => /part-0001/.test(e))).toBe(true);
    expect(report.matches_manifest).toBe(false);
  });
});
