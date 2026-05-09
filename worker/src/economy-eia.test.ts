import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import {
  parseEIAQuery,
  fetchEIASeries,
  isEIARoute,
  EIA_ROUTES,
  EIA_ATTRIBUTION,
} from './economy-eia';
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
    ...extras,
  } as unknown as Env;
}

function buildUrl(extras: Record<string, string | string[]>): URL {
  const base = new URL('https://tensorfeed.ai/api/economy/eia/series');
  for (const [k, v] of Object.entries(extras)) {
    if (Array.isArray(v)) for (const item of v) base.searchParams.append(k, item);
    else base.searchParams.set(k, v);
  }
  return base;
}

const SAMPLE_RESPONSE = {
  response: {
    total: 1234,
    dateFormat: 'YYYY-MM-DD',
    frequency: 'daily',
    data: [{ period: '2026-05-08', value: 78.42 }],
  },
};

describe('isEIARoute', () => {
  it('accepts the documented routes', () => {
    expect(isEIARoute('petroleum/pri/spt')).toBe(true);
    expect(isEIARoute('total-energy')).toBe(true);
  });
  it('rejects bogus routes', () => {
    expect(isEIARoute('not/a/route')).toBe(false);
    expect(isEIARoute('')).toBe(false);
  });
  it('exposes the curated catalog', () => {
    expect(Object.keys(EIA_ROUTES).length).toBeGreaterThanOrEqual(6);
  });
});

describe('parseEIAQuery', () => {
  it('parses a happy-path query with defaults', () => {
    const url = buildUrl({ route: 'petroleum/pri/spt' });
    const result = parseEIAQuery(url);
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.query.route).toBe('petroleum/pri/spt');
      expect(result.query.frequency).toBe('daily');
      expect(result.query.length).toBe(100);
      expect(result.query.data_columns).toEqual(['value']);
    }
  });

  it('rejects unknown routes', () => {
    const url = buildUrl({ route: 'unknown/route' });
    const result = parseEIAQuery(url);
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.error).toBe('invalid_route');
  });

  it('rejects malformed start dates', () => {
    const url = buildUrl({ route: 'petroleum/pri/spt', start: '2026-5-8' });
    const result = parseEIAQuery(url);
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.error).toBe('invalid_start');
  });

  it('accepts YYYY annual format for start/end', () => {
    const url = buildUrl({ route: 'total-energy', start: '2024', end: '2026' });
    const result = parseEIAQuery(url);
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.query.start).toBe('2024');
      expect(result.query.end).toBe('2026');
    }
  });

  it('accepts YYYY-MM monthly format for start/end', () => {
    const url = buildUrl({ route: 'electricity/retail-sales', frequency: 'monthly', start: '2025-01', end: '2026-04' });
    const result = parseEIAQuery(url);
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.query.start).toBe('2025-01');
      expect(result.query.end).toBe('2026-04');
    }
  });

  it('still accepts YYYY-MM-DD daily format', () => {
    const url = buildUrl({ route: 'petroleum/pri/spt', start: '2026-04-01', end: '2026-05-09' });
    const result = parseEIAQuery(url);
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.query.start).toBe('2026-04-01');
      expect(result.query.end).toBe('2026-05-09');
    }
  });

  it('rejects partial month/day strings', () => {
    expect(parseEIAQuery(buildUrl({ route: 'petroleum/pri/spt', start: '2026-5' })).ok).toBe(false);
    expect(parseEIAQuery(buildUrl({ route: 'petroleum/pri/spt', start: '202' })).ok).toBe(false);
    expect(parseEIAQuery(buildUrl({ route: 'petroleum/pri/spt', start: '2026-04-1' })).ok).toBe(false);
  });

  it('caps length at 5000', () => {
    const url = buildUrl({ route: 'total-energy', length: '999999' });
    const result = parseEIAQuery(url);
    expect(result.ok).toBe(true);
    if (result.ok) expect(result.query.length).toBe(5000);
  });

  it('collects facets from facets[*][] params', () => {
    const url = buildUrl({
      route: 'electricity/retail-sales',
      'facets[stateid][]': ['CA', 'NY'],
      'facets[sectorid][]': 'RES',
    });
    const result = parseEIAQuery(url);
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.query.facets['facets[stateid][]']).toEqual(['CA', 'NY']);
      expect(result.query.facets['facets[sectorid][]']).toEqual(['RES']);
    }
  });

  it('rejects facet values with disallowed characters', () => {
    const url = buildUrl({
      route: 'electricity/retail-sales',
      'facets[stateid][]': 'BAD; DROP TABLE',
    });
    const result = parseEIAQuery(url);
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.error).toBe('invalid_facet');
  });

  it('collects multiple data columns', () => {
    const url = buildUrl({ route: 'total-energy', data: ['value', 'units'] });
    const result = parseEIAQuery(url);
    expect(result.ok).toBe(true);
    if (result.ok) expect(result.query.data_columns).toEqual(['value', 'units']);
  });
});

describe('fetchEIASeries', () => {
  let originalFetch: typeof globalThis.fetch;

  beforeEach(() => {
    originalFetch = globalThis.fetch;
  });

  afterEach(() => {
    globalThis.fetch = originalFetch;
  });

  const QUERY = {
    route: 'petroleum/pri/spt',
    frequency: 'daily',
    start: null as string | null,
    end: null as string | null,
    length: 5,
    offset: 0,
    facets: {} as Record<string, string[]>,
    data_columns: ['value'],
  };

  it('returns eia_key_unset when EIA_API_KEY is not bound', async () => {
    const env = makeEnv();
    const fetchSpy = vi.fn();
    globalThis.fetch = fetchSpy as unknown as typeof globalThis.fetch;
    const result = await fetchEIASeries(env, QUERY);
    expect(result.ok).toBe(false);
    expect(result.error).toBe('eia_key_unset');
    expect(result.http_status).toBe(503);
    expect(fetchSpy).not.toHaveBeenCalled();
  });

  it('fetches live and caches with the documented TTL when key is set', async () => {
    const env = makeEnv({ EIA_API_KEY: 'test-key' } as unknown as Partial<Env>);
    globalThis.fetch = (async () => ({
      ok: true,
      status: 200,
      json: async () => SAMPLE_RESPONSE,
    })) as unknown as typeof globalThis.fetch;
    const result = await fetchEIASeries(env, QUERY);
    expect(result.ok).toBe(true);
    expect(result.source).toBe('live');
    const cache = env.TENSORFEED_CACHE as unknown as MockKV;
    const ttl = Array.from(cache.ttls.values())[0];
    expect(ttl).toBe(24 * 60 * 60);
  });

  it('serves from cache on the second call', async () => {
    const env = makeEnv({ EIA_API_KEY: 'test-key' } as unknown as Partial<Env>);
    let calls = 0;
    globalThis.fetch = (async () => {
      calls += 1;
      return { ok: true, status: 200, json: async () => SAMPLE_RESPONSE };
    }) as unknown as typeof globalThis.fetch;
    await fetchEIASeries(env, QUERY);
    const r2 = await fetchEIASeries(env, QUERY);
    expect(calls).toBe(1);
    expect(r2.source).toBe('cache');
  });

  it('does not include the api_key in the cache key', async () => {
    const env = makeEnv({ EIA_API_KEY: 'key-A' } as unknown as Partial<Env>);
    let lastUrl = '';
    globalThis.fetch = (async (url: string) => {
      lastUrl = url;
      return { ok: true, status: 200, json: async () => SAMPLE_RESPONSE };
    }) as unknown as typeof globalThis.fetch;
    await fetchEIASeries(env, QUERY);
    expect(lastUrl).toContain('api_key=key-A');
  });

  it('reports rate-limit upstream as eia_upstream_rate_limited', async () => {
    const env = makeEnv({ EIA_API_KEY: 'test-key' } as unknown as Partial<Env>);
    globalThis.fetch = (async () => ({ ok: false, status: 429, json: async () => ({}) })) as unknown as typeof globalThis.fetch;
    const result = await fetchEIASeries(env, QUERY);
    expect(result.ok).toBe(false);
    expect(result.error).toBe('eia_upstream_rate_limited');
  });
});

describe('EIA_ATTRIBUTION', () => {
  it('declares public-domain redistribution', () => {
    expect(EIA_ATTRIBUTION.redistribution).toBe('commercial-permitted');
    expect(EIA_ATTRIBUTION.publisher).toMatch(/EIA|Energy Information/);
  });
});
