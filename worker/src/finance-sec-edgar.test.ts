import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { installFakeCache, InstalledCache } from './edge-cache-test-helpers';
import {
  parseEdgarSearchQuery,
  searchEdgar,
  fetchEdgarSubmissions,
  normalizeCIK,
  EDGAR_ATTRIBUTION,
} from './finance-sec-edgar';
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

function makeEnv(): Env {
  return {
    TENSORFEED_CACHE: new MockKV(),
    TENSORFEED_NEWS: new MockKV(),
    TENSORFEED_STATUS: new MockKV(),
  } as unknown as Env;
}

const SAMPLE_SEARCH = {
  hits: { total: { value: 35 }, hits: [{ _id: 'foo:bar.htm', _source: { form: '10-K' } }] },
};

const SAMPLE_SUBMISSIONS = {
  cik: '0000320193',
  name: 'Apple Inc.',
  tickers: ['AAPL'],
};

function searchUrl(extras: Record<string, string>): URL {
  const base = new URL('https://tensorfeed.ai/api/sec/edgar/search');
  for (const [k, v] of Object.entries(extras)) base.searchParams.set(k, v);
  return base;
}

describe('normalizeCIK', () => {
  it('zero-pads short CIKs', () => {
    expect(normalizeCIK('320193')).toBe('0000320193');
    expect(normalizeCIK('5')).toBe('0000000005');
  });
  it('strips CIK prefix', () => {
    expect(normalizeCIK('CIK0000320193')).toBe('0000320193');
    expect(normalizeCIK('cik0000320193')).toBe('0000320193');
  });
  it('keeps already-canonical CIKs', () => {
    expect(normalizeCIK('0000320193')).toBe('0000320193');
  });
  it('rejects malformed input', () => {
    expect(normalizeCIK('AAPL')).toBeNull();
    expect(normalizeCIK('')).toBeNull();
    expect(normalizeCIK('CIK320193')).toBeNull();
    expect(normalizeCIK('12345678901')).toBeNull();
  });
});

describe('parseEdgarSearchQuery', () => {
  it('parses a happy-path search', () => {
    const result = parseEdgarSearchQuery(searchUrl({ q: 'artificial intelligence', forms: '10-K' }));
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.query.q).toBe('artificial intelligence');
      expect(result.query.forms).toBe('10-K');
      expect(result.query.limit).toBe(10);
      expect(result.query.page).toBe(1);
    }
  });

  it('rejects missing q', () => {
    const result = parseEdgarSearchQuery(searchUrl({}));
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.error).toBe('q_required');
  });

  it('rejects malformed q', () => {
    const result = parseEdgarSearchQuery(searchUrl({ q: '‎\\bad‮' }));
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.error).toBe('invalid_q');
  });

  it('accepts startdt/enddt aliases (from/to)', () => {
    const result = parseEdgarSearchQuery(
      searchUrl({ q: 'foo', from: '2024-01-01', to: '2024-12-31' }),
    );
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.query.startdt).toBe('2024-01-01');
      expect(result.query.enddt).toBe('2024-12-31');
    }
  });

  it('caps limit at 50 and page at 100', () => {
    const result = parseEdgarSearchQuery(searchUrl({ q: 'foo', limit: '999', page: '500' }));
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.query.limit).toBe(50);
      expect(result.query.page).toBe(100);
    }
  });

  it('rejects malformed forms', () => {
    const result = parseEdgarSearchQuery(searchUrl({ q: 'foo', forms: 'has spaces' }));
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.error).toBe('invalid_forms');
  });
});

describe('searchEdgar', () => {
  let env: Env;
  let originalFetch: typeof globalThis.fetch;
  let installedCache: InstalledCache;

  beforeEach(() => {
    env = makeEnv();
    originalFetch = globalThis.fetch;
    installedCache = installFakeCache();
  });

  afterEach(() => {
    globalThis.fetch = originalFetch;
    installedCache.uninstall();
  });

  const QUERY = {
    q: 'artificial intelligence',
    forms: '10-K' as string | null,
    startdt: '2024-01-01' as string | null,
    enddt: '2024-01-31' as string | null,
    limit: 10,
    page: 1,
  };

  it('fetches live and caches with the documented TTL', async () => {
    let captured = '';
    globalThis.fetch = (async (url: string) => {
      captured = url;
      return { ok: true, status: 200, json: async () => SAMPLE_SEARCH };
    }) as unknown as typeof globalThis.fetch;

    const result = await searchEdgar(env, QUERY);
    expect(result.ok).toBe(true);
    expect(result.source).toBe('live');
    expect(captured).toContain('efts.sec.gov/LATEST/search-index');
    expect(captured).toContain('q=artificial+intelligence');
    expect(captured).toContain('forms=10-K');
    expect(captured).toContain('startdt=2024-01-01');

    const stored = Array.from(installedCache.cache.store.values())[0];
    expect(stored?.headers.get('cache-control')).toBe(`s-maxage=${60 * 60}`);
  });

  it('serves from cache on repeat call', async () => {
    let calls = 0;
    globalThis.fetch = (async () => {
      calls += 1;
      return { ok: true, status: 200, json: async () => SAMPLE_SEARCH };
    }) as unknown as typeof globalThis.fetch;
    await searchEdgar(env, QUERY);
    const r2 = await searchEdgar(env, QUERY);
    expect(calls).toBe(1);
    expect(r2.source).toBe('cache');
  });

  it('reports rate-limit upstream', async () => {
    globalThis.fetch = (async () => ({ ok: false, status: 429, json: async () => ({}) })) as unknown as typeof globalThis.fetch;
    const result = await searchEdgar(env, QUERY);
    expect(result.ok).toBe(false);
    expect(result.error).toBe('edgar_upstream_rate_limited');
  });

  it('honors page > 1 with computed offset', async () => {
    let captured = '';
    globalThis.fetch = (async (url: string) => {
      captured = url;
      return { ok: true, status: 200, json: async () => SAMPLE_SEARCH };
    }) as unknown as typeof globalThis.fetch;
    await searchEdgar(env, { ...QUERY, page: 3, limit: 20 });
    expect(captured).toContain('from=40'); // (3-1) * 20
  });
});

describe('fetchEdgarSubmissions', () => {
  let env: Env;
  let originalFetch: typeof globalThis.fetch;
  let installedCache: InstalledCache;

  beforeEach(() => {
    env = makeEnv();
    originalFetch = globalThis.fetch;
    installedCache = installFakeCache();
  });

  afterEach(() => {
    globalThis.fetch = originalFetch;
    installedCache.uninstall();
  });

  it('fetches by canonical CIK and caches', async () => {
    let captured = '';
    globalThis.fetch = (async (url: string) => {
      captured = url;
      return { ok: true, status: 200, json: async () => SAMPLE_SUBMISSIONS };
    }) as unknown as typeof globalThis.fetch;

    const result = await fetchEdgarSubmissions(env, '320193');
    expect(result.ok).toBe(true);
    expect(result.cik).toBe('0000320193');
    expect(captured).toContain('CIK0000320193.json');

    const stored = Array.from(installedCache.cache.store.values())[0];
    expect(stored?.headers.get('cache-control')).toBe(`s-maxage=${6 * 60 * 60}`);
  });

  it('returns cik_not_found on 404', async () => {
    globalThis.fetch = (async () => ({ ok: false, status: 404, json: async () => ({}) })) as unknown as typeof globalThis.fetch;
    const result = await fetchEdgarSubmissions(env, '9999999999');
    expect(result.ok).toBe(false);
    expect(result.error).toBe('cik_not_found');
  });

  it('rejects invalid CIK without network', async () => {
    const fetchSpy = vi.fn();
    globalThis.fetch = fetchSpy as unknown as typeof globalThis.fetch;
    const result = await fetchEdgarSubmissions(env, 'AAPL');
    expect(result.ok).toBe(false);
    expect(result.error).toBe('invalid_cik');
    expect(fetchSpy).not.toHaveBeenCalled();
  });
});

describe('EDGAR_ATTRIBUTION', () => {
  it('declares public-domain redistribution', () => {
    expect(EDGAR_ATTRIBUTION.redistribution).toBe('commercial-permitted');
    expect(EDGAR_ATTRIBUTION.publisher).toMatch(/Securities and Exchange Commission/);
  });
});
