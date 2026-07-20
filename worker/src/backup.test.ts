import { describe, it, expect, vi } from 'vitest';
import { backupKvToR2, backupNamespaceChunk, listRecentBackups, readManifest } from './backup';
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

describe('listRecentBackups', () => {
  it('groups objects by date prefix, newest first', async () => {
    const { bucket } = mockR2();
    const env = { BACKUPS_R2: bucket } as unknown as Env;
    const recent = await listRecentBackups(env, 30);
    expect(recent.length).toBe(2);
    expect(recent[0]!.date).toBe('2026-05-12');
    expect(recent[1]!.date).toBe('2026-05-05');
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
