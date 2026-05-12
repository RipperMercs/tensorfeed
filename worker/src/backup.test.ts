import { describe, it, expect, vi } from 'vitest';
import { backupKvToR2, listRecentBackups, readManifest } from './backup';
import type { Env } from './types';

function mockKvNamespace(entries: Array<{ key: string; value: string; metadata?: unknown }>): any {
  return {
    list: async (opts: any) => ({
      keys: entries.map((e) => ({ name: e.key, metadata: e.metadata })),
      list_complete: true,
      cursor: '',
    }),
    get: async (key: string) => {
      const e = entries.find((x) => x.key === key);
      return e ? e.value : null;
    },
  };
}

function mockR2(): { bucket: any; puts: Array<{ key: string; value: any; meta: any }> } {
  const puts: Array<{ key: string; value: any; meta: any }> = [];
  const bucket = {
    put: vi.fn(async (key: string, value: any, opts: any) => {
      puts.push({ key, value, meta: opts });
    }),
    list: vi.fn(async (opts: any) => ({
      objects: [
        { key: '2026-05-12/TENSORFEED_NEWS.jsonl.gz', size: 1024, uploaded: new Date('2026-05-12T06:00:00Z') },
        { key: '2026-05-12/manifest.json', size: 500, uploaded: new Date('2026-05-12T06:00:00Z') },
        { key: '2026-05-05/TENSORFEED_NEWS.jsonl.gz', size: 900, uploaded: new Date('2026-05-05T06:00:00Z') },
      ],
    })),
    get: vi.fn(async (key: string) => {
      if (key === '2026-05-12/manifest.json') {
        return {
          json: async () => ({
            run_id: 'test-run',
            started_at: '2026-05-12T06:00:00Z',
            completed_at: '2026-05-12T06:00:05Z',
            duration_ms: 5000,
            triggered_by: 'cron',
            worker_version: 'test',
            namespaces: [],
          }),
        };
      }
      return null;
    }),
  };
  return { bucket, puts };
}

describe('backupKvToR2', () => {
  it('writes one R2 object per namespace plus a manifest', async () => {
    const { bucket, puts } = mockR2();
    const news = mockKvNamespace([
      { key: 'meta', value: '{"last":"now"}' },
      { key: 'feed:items', value: '[1,2,3]', metadata: { count: 3 } },
    ]);
    const status = mockKvNamespace([{ key: 'svc:openai', value: 'operational' }]);
    const cache = mockKvNamespace([{ key: 'cache:foo', value: 'bar' }]);
    const env = {
      TENSORFEED_NEWS: news,
      TENSORFEED_STATUS: status,
      TENSORFEED_CACHE: cache,
      BACKUPS_R2: bucket,
    } as unknown as Env;

    const manifest = await backupKvToR2(env, 'admin', 'test-version');

    expect(manifest.triggered_by).toBe('admin');
    expect(manifest.worker_version).toBe('test-version');
    expect(manifest.namespaces.length).toBe(4); // includes OFAC_AUDIT_LOG which is missing
    expect(manifest.namespaces.find((n) => n.name === 'TENSORFEED_NEWS')!.key_count).toBe(2);
    expect(manifest.namespaces.find((n) => n.name === 'TENSORFEED_STATUS')!.key_count).toBe(1);
    expect(manifest.namespaces.find((n) => n.name === 'TENSORFEED_CACHE')!.key_count).toBe(1);
    expect(manifest.namespaces.find((n) => n.name === 'OFAC_AUDIT_LOG')!.error).toBe('binding_missing_from_env');

    const expectedPuts = puts.map((p) => p.key);
    const today = new Date().toISOString().slice(0, 10);
    expect(expectedPuts).toContain(`${today}/TENSORFEED_NEWS.jsonl.gz`);
    expect(expectedPuts).toContain(`${today}/TENSORFEED_STATUS.jsonl.gz`);
    expect(expectedPuts).toContain(`${today}/TENSORFEED_CACHE.jsonl.gz`);
    expect(expectedPuts).toContain(`${today}/manifest.json`);
  });

  it('throws when BACKUPS_R2 is missing entirely', async () => {
    const env = {
      TENSORFEED_NEWS: mockKvNamespace([]),
      TENSORFEED_STATUS: mockKvNamespace([]),
      TENSORFEED_CACHE: mockKvNamespace([]),
    } as unknown as Env;
    await expect(backupKvToR2(env, 'cron')).rejects.toThrow(/BACKUPS_R2/);
  });

  it('records per-namespace errors without failing the whole run', async () => {
    const { bucket } = mockR2();
    const newsFails: any = {
      list: async () => { throw new Error('simulated_kv_failure'); },
      get: async () => null,
    };
    const env = {
      TENSORFEED_NEWS: newsFails,
      TENSORFEED_STATUS: mockKvNamespace([{ key: 'k', value: 'v' }]),
      TENSORFEED_CACHE: mockKvNamespace([]),
      BACKUPS_R2: bucket,
    } as unknown as Env;
    const manifest = await backupKvToR2(env, 'cron');
    expect(manifest.namespaces.find((n) => n.name === 'TENSORFEED_NEWS')!.error).toContain('simulated_kv_failure');
    expect(manifest.namespaces.find((n) => n.name === 'TENSORFEED_STATUS')!.error).toBeUndefined();
  });

  it('produces a sha256 for each successful namespace dump', async () => {
    const { bucket } = mockR2();
    const env = {
      TENSORFEED_NEWS: mockKvNamespace([{ key: 'a', value: 'b' }]),
      TENSORFEED_STATUS: mockKvNamespace([]),
      TENSORFEED_CACHE: mockKvNamespace([]),
      BACKUPS_R2: bucket,
    } as unknown as Env;
    const manifest = await backupKvToR2(env, 'cron');
    const ns = manifest.namespaces.find((n) => n.name === 'TENSORFEED_NEWS');
    expect(ns!.sha256_hex).toMatch(/^[0-9a-f]{64}$/);
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
    expect(recent[0]!.objects.length).toBe(2);
  });

  it('respects limit param', async () => {
    const { bucket } = mockR2();
    const env = { BACKUPS_R2: bucket } as unknown as Env;
    const recent = await listRecentBackups(env, 1);
    expect(recent.length).toBe(1);
    expect(recent[0]!.date).toBe('2026-05-12');
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
