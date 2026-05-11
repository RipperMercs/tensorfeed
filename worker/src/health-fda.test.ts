import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import {
  parseFDAQuery,
  parseFDAAggregateQuery,
  fetchFDAQuery,
  fetchFDAAggregate,
  isFDACategory,
  FDA_CATEGORIES,
  FDA_ATTRIBUTION,
} from './health-fda';
import type { Env } from './types';
import { installFakeCache, InstalledCache } from './edge-cache-test-helpers';

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

function buildUrl(extras: Record<string, string>): URL {
  const base = new URL('https://tensorfeed.ai/api/health/fda/drug/events');
  for (const [k, v] of Object.entries(extras)) base.searchParams.set(k, v);
  return base;
}

const SAMPLE_QUERY_RESPONSE = {
  meta: { last_updated: '2026-04-28', results: { skip: 0, limit: 1, total: 609465 } },
  results: [{ safetyreportid: '10003304', primarysourcecountry: 'US' }],
};

const SAMPLE_AGGREGATE_RESPONSE = {
  meta: { last_updated: '2026-04-28' },
  results: [
    { term: 'aspirin', count: 12345 },
    { term: 'ibuprofen', count: 9876 },
  ],
};

describe('isFDACategory', () => {
  it('accepts the documented categories', () => {
    expect(isFDACategory('drug/events')).toBe(true);
    expect(isFDACategory('food/recalls')).toBe(true);
  });
  it('rejects unknown categories', () => {
    expect(isFDACategory('bogus')).toBe(false);
  });
  it('exposes a non-empty catalog', () => {
    expect(Object.keys(FDA_CATEGORIES).length).toBeGreaterThanOrEqual(5);
  });
  it('rejects prototype-chain keys (no method confusion)', () => {
    // Regression: `c in FDA_CATEGORIES` evaluates true for these and
    // would propagate to FDA_TRANSFORMERS[c] as Object.prototype, which
    // crashes the worker when invoked as a function.
    expect(isFDACategory('__proto__')).toBe(false);
    expect(isFDACategory('toString')).toBe(false);
    expect(isFDACategory('hasOwnProperty')).toBe(false);
    expect(isFDACategory('constructor')).toBe(false);
  });
  it('rejects prototype-chain keys via parseFDAQuery', () => {
    const url = new URL('https://tensorfeed.ai/api/health/fda/__proto__');
    const result = parseFDAQuery('__proto__', url);
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.error).toBe('unknown_category');
  });
});

describe('parseFDAQuery', () => {
  it('parses a happy-path query with defaults', () => {
    const url = buildUrl({});
    const result = parseFDAQuery('drug/events', url);
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.query.limit).toBe(10);
      expect(result.query.skip).toBe(0);
      expect(result.query.search).toBeNull();
    }
  });

  it('caps limit at 100', () => {
    const url = buildUrl({ limit: '5000' });
    const result = parseFDAQuery('drug/events', url);
    expect(result.ok).toBe(true);
    if (result.ok) expect(result.query.limit).toBe(100);
  });

  it('caps skip at 25000', () => {
    const url = buildUrl({ skip: '99999' });
    const result = parseFDAQuery('drug/events', url);
    expect(result.ok).toBe(true);
    if (result.ok) expect(result.query.skip).toBe(25000);
  });

  it('rejects unknown categories', () => {
    const url = buildUrl({});
    const result = parseFDAQuery('bogus', url);
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.error).toBe('unknown_category');
  });

  it('rejects malformed sort', () => {
    const url = buildUrl({ sort: 'NOT_A_SORT' });
    const result = parseFDAQuery('drug/events', url);
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.error).toBe('invalid_sort');
  });

  it('accepts a well-formed lucene-style search', () => {
    const url = buildUrl({ search: 'patient.drug.medicinalproduct:aspirin' });
    const result = parseFDAQuery('drug/events', url);
    expect(result.ok).toBe(true);
  });
});

describe('parseFDAAggregateQuery', () => {
  function aggUrl(extras: Record<string, string>): URL {
    const base = new URL('https://tensorfeed.ai/api/premium/health/fda/aggregate');
    for (const [k, v] of Object.entries(extras)) base.searchParams.set(k, v);
    return base;
  }

  it('requires category and count_by', () => {
    expect(parseFDAAggregateQuery(aggUrl({})).ok).toBe(false);
    expect(parseFDAAggregateQuery(aggUrl({ category: 'drug/events' })).ok).toBe(false);
  });

  it('rejects invalid count_by paths', () => {
    const result = parseFDAAggregateQuery(
      aggUrl({ category: 'drug/events', count_by: 'has spaces and !@#' }),
    );
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.error).toBe('invalid_count_by');
  });

  it('accepts a well-formed aggregate query', () => {
    const result = parseFDAAggregateQuery(
      aggUrl({
        category: 'drug/events',
        count_by: 'patient.reaction.reactionmeddrapt.exact',
        limit: '10',
      }),
    );
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.query.category).toBe('drug/events');
      expect(result.query.count_by).toBe('patient.reaction.reactionmeddrapt.exact');
      expect(result.query.limit).toBe(10);
    }
  });
});

describe('fetchFDAQuery', () => {
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
    category: 'drug/events',
    search: 'patient.drug.medicinalproduct:aspirin',
    limit: 5,
    skip: 0,
    sort: null,
  };

  it('fetches live and caches with the documented TTL', async () => {
    globalThis.fetch = (async () => ({
      ok: true,
      status: 200,
      json: async () => SAMPLE_QUERY_RESPONSE,
    })) as unknown as typeof globalThis.fetch;
    const result = await fetchFDAQuery(env, QUERY);
    expect(result.ok).toBe(true);
    expect(result.source).toBe('live');
    const stored = Array.from(installedCache.cache.store.values())[0];
    expect(stored?.headers.get('cache-control')).toBe(`s-maxage=${24 * 60 * 60}`);
  });

  it('serves from cache on the second call', async () => {
    let calls = 0;
    globalThis.fetch = (async () => {
      calls += 1;
      return { ok: true, status: 200, json: async () => SAMPLE_QUERY_RESPONSE };
    }) as unknown as typeof globalThis.fetch;
    await fetchFDAQuery(env, QUERY);
    const r2 = await fetchFDAQuery(env, QUERY);
    expect(r2.source).toBe('cache');
    expect(calls).toBe(1);
  });

  it('treats openFDA 404 as empty-result success', async () => {
    globalThis.fetch = (async () => ({
      ok: false,
      status: 404,
      json: async () => ({ error: { code: 'NOT_FOUND', message: 'No matches found' } }),
    })) as unknown as typeof globalThis.fetch;
    const result = await fetchFDAQuery(env, QUERY);
    expect(result.ok).toBe(true);
  });

  it('reports rate-limit as fda_upstream_rate_limited', async () => {
    globalThis.fetch = (async () => ({ ok: false, status: 429, json: async () => ({}) })) as unknown as typeof globalThis.fetch;
    const result = await fetchFDAQuery(env, QUERY);
    expect(result.ok).toBe(false);
    expect(result.error).toBe('fda_upstream_rate_limited');
  });

  it('reports network errors with fda_fetch_failed', async () => {
    globalThis.fetch = (async () => {
      throw new Error('ECONNRESET');
    }) as unknown as typeof globalThis.fetch;
    const result = await fetchFDAQuery(env, QUERY);
    expect(result.ok).toBe(false);
    expect(result.error).toMatch(/fda_fetch_failed/);
  });
});

describe('fetchFDAAggregate', () => {
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

  it('returns aggregation results from upstream', async () => {
    globalThis.fetch = (async () => ({
      ok: true,
      status: 200,
      json: async () => SAMPLE_AGGREGATE_RESPONSE,
    })) as unknown as typeof globalThis.fetch;
    const result = await fetchFDAAggregate(env, {
      category: 'drug/events',
      count_by: 'patient.drug.medicinalproduct.exact',
      search: null,
      limit: 5,
    });
    expect(result.ok).toBe(true);
    expect(result.data).toEqual(SAMPLE_AGGREGATE_RESPONSE);
  });

  it('keeps separate cache slots for different aggregation params', async () => {
    let calls = 0;
    globalThis.fetch = (async () => {
      calls += 1;
      return { ok: true, status: 200, json: async () => SAMPLE_AGGREGATE_RESPONSE };
    }) as unknown as typeof globalThis.fetch;
    await fetchFDAAggregate(env, {
      category: 'drug/events',
      count_by: 'patient.reaction.reactionmeddrapt.exact',
      search: null,
      limit: 5,
    });
    await fetchFDAAggregate(env, {
      category: 'drug/events',
      count_by: 'patient.drug.medicinalproduct.exact',
      search: null,
      limit: 5,
    });
    expect(calls).toBe(2);
  });
});

describe('FDA_ATTRIBUTION', () => {
  it('declares CC0 / public-domain redistribution', () => {
    expect(FDA_ATTRIBUTION.redistribution).toBe('commercial-permitted');
    expect(FDA_ATTRIBUTION.license).toMatch(/CC0/);
  });
});
