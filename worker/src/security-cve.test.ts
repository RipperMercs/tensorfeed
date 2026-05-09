import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import {
  fetchCVE,
  normalizeCVEId,
  captureRecentCVEs,
  readRecentCVEs,
  readCVEsByDate,
  listCVEDates,
  CVE_ATTRIBUTION,
} from './security-cve';
import type { Env } from './types';

class MockKV {
  store = new Map<string, string>();
  ttls = new Map<string, number | undefined>();

  async get<T = string>(key: string, format?: 'json'): Promise<T | null> {
    const raw = this.store.get(key);
    if (raw === undefined) return null;
    if (format === 'json') return JSON.parse(raw) as T;
    return raw as unknown as T;
  }

  async put(key: string, value: string, opts?: { expirationTtl?: number }): Promise<void> {
    this.store.set(key, value);
    this.ttls.set(key, opts?.expirationTtl);
  }
}

function makeEnv(extras: Partial<Env> = {}): Env {
  return {
    TENSORFEED_CACHE: new MockKV(),
    TENSORFEED_NEWS: new MockKV(),
    TENSORFEED_STATUS: new MockKV(),
    GITHUB_TOKEN: 'test-gh-token',
    ...extras,
  } as unknown as Env;
}

const SAMPLE_RECORD = {
  dataType: 'CVE_RECORD',
  dataVersion: '5.2',
  cveMetadata: {
    cveId: 'CVE-2024-3094',
    state: 'PUBLISHED',
    datePublished: '2024-03-29T16:51:12.588Z',
  },
  containers: { cna: { title: 'xz: malicious code in distributed source' } },
};

describe('normalizeCVEId', () => {
  it('uppercases and validates', () => {
    expect(normalizeCVEId('cve-2024-3094')).toBe('CVE-2024-3094');
    expect(normalizeCVEId('CVE-2024-3094')).toBe('CVE-2024-3094');
    expect(normalizeCVEId(' CVE-2024-3094 ')).toBe('CVE-2024-3094');
  });
  it('rejects malformed input', () => {
    expect(normalizeCVEId('not-a-cve')).toBeNull();
    expect(normalizeCVEId('CVE-24-3094')).toBeNull();
    expect(normalizeCVEId('')).toBeNull();
    expect(normalizeCVEId('CVE-2024-')).toBeNull();
  });
  it('accepts wide id ranges', () => {
    expect(normalizeCVEId('CVE-2024-1234567')).toBe('CVE-2024-1234567');
  });
});

describe('fetchCVE', () => {
  let env: Env;
  let originalFetch: typeof globalThis.fetch;

  beforeEach(() => {
    env = makeEnv();
    originalFetch = globalThis.fetch;
  });

  afterEach(() => {
    globalThis.fetch = originalFetch;
  });

  it('returns cached record without a network call', async () => {
    const cache = env.TENSORFEED_CACHE as unknown as MockKV;
    cache.store.set('cve:record:CVE-2024-3094', JSON.stringify(SAMPLE_RECORD));
    const fetchSpy = vi.fn();
    globalThis.fetch = fetchSpy as unknown as typeof globalThis.fetch;

    const result = await fetchCVE(env, 'CVE-2024-3094');

    expect(result.ok).toBe(true);
    expect(result.source).toBe('cache');
    expect(result.record).toEqual(SAMPLE_RECORD);
    expect(fetchSpy).not.toHaveBeenCalled();
    expect(result.attribution).toEqual(CVE_ATTRIBUTION);
  });

  it('fetches live and writes to cache on miss', async () => {
    const fetchSpy = vi.fn(async () => ({
      ok: true,
      status: 200,
      json: async () => SAMPLE_RECORD,
    }));
    globalThis.fetch = fetchSpy as unknown as typeof globalThis.fetch;

    const result = await fetchCVE(env, 'cve-2024-3094');

    expect(result.ok).toBe(true);
    expect(result.source).toBe('live');
    expect(result.record).toEqual(SAMPLE_RECORD);
    expect(fetchSpy).toHaveBeenCalledOnce();
    const cache = env.TENSORFEED_CACHE as unknown as MockKV;
    expect(cache.store.has('cve:record:CVE-2024-3094')).toBe(true);
    expect(cache.ttls.get('cve:record:CVE-2024-3094')).toBe(7 * 24 * 60 * 60);
  });

  it('returns not_found on MITRE 404', async () => {
    globalThis.fetch = (async () => ({ ok: false, status: 404, json: async () => ({}) })) as unknown as typeof globalThis.fetch;
    const result = await fetchCVE(env, 'CVE-9999-9999');
    expect(result.ok).toBe(false);
    expect(result.source).toBe('not_found');
    expect(result.error).toBe('cve_not_found');
  });

  it('returns invalid_cve_id without a network call', async () => {
    const fetchSpy = vi.fn();
    globalThis.fetch = fetchSpy as unknown as typeof globalThis.fetch;
    const result = await fetchCVE(env, 'totally bogus');
    expect(result.ok).toBe(false);
    expect(result.error).toBe('invalid_cve_id');
    expect(fetchSpy).not.toHaveBeenCalled();
  });

  it('handles network errors gracefully', async () => {
    globalThis.fetch = (async () => {
      throw new Error('network down');
    }) as unknown as typeof globalThis.fetch;
    const result = await fetchCVE(env, 'CVE-2024-3094');
    expect(result.ok).toBe(false);
    expect(result.error).toMatch(/mitre_fetch_failed/);
  });

  it('handles non-200 non-404 errors with mitre_http_<code>', async () => {
    globalThis.fetch = (async () => ({ ok: false, status: 500, json: async () => ({}) })) as unknown as typeof globalThis.fetch;
    const result = await fetchCVE(env, 'CVE-2024-3094');
    expect(result.ok).toBe(false);
    expect(result.error).toBe('mitre_http_500');
  });
});

describe('captureRecentCVEs', () => {
  let env: Env;
  let originalFetch: typeof globalThis.fetch;

  beforeEach(() => {
    env = makeEnv();
    originalFetch = globalThis.fetch;
  });

  afterEach(() => {
    globalThis.fetch = originalFetch;
  });

  function buildCommitsResponse(commits: { sha: string; date: string }[]): {
    ok: boolean;
    status: number;
    json: () => Promise<unknown>;
  } {
    return {
      ok: true,
      status: 200,
      json: async () =>
        commits.map((c) => ({ sha: c.sha, commit: { committer: { date: c.date } } })),
    };
  }

  function buildCommitDetail(
    sha: string,
    date: string,
    files: { filename: string; status: 'added' | 'modified' | 'removed' }[],
  ): { ok: boolean; status: number; json: () => Promise<unknown> } {
    return {
      ok: true,
      status: 200,
      json: async () => ({ sha, commit: { committer: { date } }, files }),
    };
  }

  it('harvests CVE IDs from added file paths and writes the recent ring + dated index', async () => {
    const commits = [{ sha: 'aaa', date: '2026-05-08T12:00:00Z' }];
    const detail = buildCommitDetail('aaa', '2026-05-08T12:00:00Z', [
      { filename: 'cves/2026/0xxx/CVE-2026-0001.json', status: 'added' },
      { filename: 'cves/2026/0xxx/CVE-2026-0002.json', status: 'added' },
      { filename: 'README.md', status: 'modified' },
    ]);
    let call = 0;
    globalThis.fetch = (async () => {
      call += 1;
      if (call === 1) return buildCommitsResponse(commits) as Response;
      return detail as Response;
    }) as unknown as typeof globalThis.fetch;

    const result = await captureRecentCVEs(env, new Date('2026-05-08T13:00:00Z'));

    expect(result.ok).toBe(true);
    expect(result.newly_seen).toBe(2);
    expect(result.scanned_commits).toBe(1);

    const recent = await readRecentCVEs(env);
    expect(recent.ids).toEqual(['CVE-2026-0002', 'CVE-2026-0001']);

    const day = await readCVEsByDate(env, '2026-05-08');
    expect(day).toEqual(['CVE-2026-0001', 'CVE-2026-0002']);

    const dates = await listCVEDates(env);
    expect(dates).toEqual(['2026-05-08']);
  });

  it('is idempotent on a re-run with the same commits', async () => {
    const commits = [{ sha: 'aaa', date: '2026-05-08T12:00:00Z' }];
    const detail = buildCommitDetail('aaa', '2026-05-08T12:00:00Z', [
      { filename: 'cves/2026/0xxx/CVE-2026-0001.json', status: 'added' },
    ]);
    let call = 0;
    globalThis.fetch = (async () => {
      call += 1;
      if (call % 2 === 1) return buildCommitsResponse(commits) as Response;
      return detail as Response;
    }) as unknown as typeof globalThis.fetch;

    await captureRecentCVEs(env, new Date('2026-05-08T13:00:00Z'));
    await captureRecentCVEs(env, new Date('2026-05-08T14:00:00Z'));

    const recent = await readRecentCVEs(env);
    expect(recent.ids).toEqual(['CVE-2026-0001']);

    const day = await readCVEsByDate(env, '2026-05-08');
    expect(day).toEqual(['CVE-2026-0001']);
  });

  it('skips removed files and non-CVE filenames', async () => {
    const commits = [{ sha: 'bbb', date: '2026-05-08T12:00:00Z' }];
    const detail = buildCommitDetail('bbb', '2026-05-08T12:00:00Z', [
      { filename: 'cves/2026/0xxx/CVE-2026-9999.json', status: 'removed' },
      { filename: 'docs/README.md', status: 'added' },
      { filename: 'cves/2026/0xxx/CVE-2026-0042.json', status: 'modified' },
    ]);
    let call = 0;
    globalThis.fetch = (async () => {
      call += 1;
      if (call === 1) return buildCommitsResponse(commits) as Response;
      return detail as Response;
    }) as unknown as typeof globalThis.fetch;

    const result = await captureRecentCVEs(env, new Date('2026-05-08T13:00:00Z'));
    expect(result.newly_seen).toBe(1);
    const day = await readCVEsByDate(env, '2026-05-08');
    expect(day).toEqual(['CVE-2026-0042']);
  });

  it('reports HTTP errors from the commits-list endpoint', async () => {
    globalThis.fetch = (async () => ({ ok: false, status: 403, json: async () => ({}) })) as unknown as typeof globalThis.fetch;
    const result = await captureRecentCVEs(env, new Date('2026-05-08T13:00:00Z'));
    expect(result.ok).toBe(false);
    expect(result.error).toBe('commits_list_http_403');
    expect(result.newly_seen).toBe(0);
  });

  it('handles a no-op run cleanly when no commits matched any CVE files', async () => {
    const commits = [{ sha: 'ccc', date: '2026-05-08T12:00:00Z' }];
    const detail = buildCommitDetail('ccc', '2026-05-08T12:00:00Z', [
      { filename: 'README.md', status: 'modified' },
    ]);
    let call = 0;
    globalThis.fetch = (async () => {
      call += 1;
      if (call === 1) return buildCommitsResponse(commits) as Response;
      return detail as Response;
    }) as unknown as typeof globalThis.fetch;

    const result = await captureRecentCVEs(env, new Date('2026-05-08T13:00:00Z'));
    expect(result.ok).toBe(true);
    expect(result.newly_seen).toBe(0);
    expect(result.scanned_commits).toBe(1);
    const recent = await readRecentCVEs(env);
    expect(recent.ids).toEqual([]);
  });

  it('caps recent ring at the documented limit', async () => {
    const cache = env.TENSORFEED_CACHE as unknown as MockKV;
    const seed: string[] = [];
    for (let i = 1; i <= 200; i += 1) {
      seed.push(`CVE-2026-${String(1000 + i).padStart(4, '0')}`);
    }
    cache.store.set('cve:recent', JSON.stringify(seed));

    const commits = [{ sha: 'ddd', date: '2026-05-08T12:00:00Z' }];
    const detail = buildCommitDetail('ddd', '2026-05-08T12:00:00Z', [
      { filename: 'cves/2026/9xxx/CVE-2026-9999.json', status: 'added' },
    ]);
    let call = 0;
    globalThis.fetch = (async () => {
      call += 1;
      if (call === 1) return buildCommitsResponse(commits) as Response;
      return detail as Response;
    }) as unknown as typeof globalThis.fetch;

    await captureRecentCVEs(env, new Date('2026-05-08T13:00:00Z'));
    const recent = await readRecentCVEs(env, 200);
    expect(recent.ids.length).toBe(200);
    expect(recent.ids[0]).toBe('CVE-2026-9999');
  });
});

describe('readRecentCVEs', () => {
  it('respects the requested limit and the upper cap', async () => {
    const env = makeEnv();
    const cache = env.TENSORFEED_CACHE as unknown as MockKV;
    cache.store.set(
      'cve:recent',
      JSON.stringify(Array.from({ length: 250 }, (_, i) => `CVE-2026-${String(i + 1).padStart(4, '0')}`)),
    );
    const out10 = await readRecentCVEs(env, 10);
    expect(out10.ids.length).toBe(10);
    const out500 = await readRecentCVEs(env, 500);
    expect(out500.ids.length).toBe(200);
  });
});
