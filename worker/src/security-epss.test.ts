import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import {
  fetchEPSSCurrent,
  fetchEPSSSeries,
  fetchEPSSTop,
  normalizeCVEId,
  EPSS_ATTRIBUTION,
} from './security-epss';
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

const SAMPLE_CURRENT = {
  status: 'OK',
  total: 1,
  data: [
    { cve: 'CVE-2024-3094', epss: '0.850580000', percentile: '0.993590000', date: '2026-05-08' },
  ],
};

const SAMPLE_SERIES = {
  status: 'OK',
  total: 1,
  data: [
    {
      cve: 'CVE-2024-3094',
      epss: '0.850580000',
      percentile: '0.993590000',
      date: '2026-05-08',
      'time-series': [
        { epss: '0.850580000', percentile: '0.993590000', date: '2026-05-07' },
        { epss: '0.84588000', percentile: '0.99337000', date: '2026-05-06' },
      ],
    },
  ],
};

const SAMPLE_TOP = {
  status: 'OK',
  total: 331435,
  data: [
    { cve: 'CVE-2023-23752', epss: '0.945200000', percentile: '1.000000000', date: '2026-05-08' },
    { cve: 'CVE-2017-8917', epss: '0.945130000', percentile: '1.000000000', date: '2026-05-08' },
  ],
};

describe('normalizeCVEId', () => {
  it('uppercases valid ids', () => {
    expect(normalizeCVEId('cve-2024-3094')).toBe('CVE-2024-3094');
  });
  it('rejects malformed input', () => {
    expect(normalizeCVEId('foo')).toBeNull();
    expect(normalizeCVEId('')).toBeNull();
  });
});

describe('fetchEPSSCurrent', () => {
  let env: Env;
  let originalFetch: typeof globalThis.fetch;

  beforeEach(() => {
    env = makeEnv();
    originalFetch = globalThis.fetch;
  });

  afterEach(() => {
    globalThis.fetch = originalFetch;
  });

  it('returns cached score without a network call', async () => {
    const cache = env.TENSORFEED_CACHE as unknown as MockKV;
    cache.store.set(
      'epss:current:CVE-2024-3094',
      JSON.stringify(SAMPLE_CURRENT.data[0]),
    );
    const fetchSpy = vi.fn();
    globalThis.fetch = fetchSpy as unknown as typeof globalThis.fetch;

    const result = await fetchEPSSCurrent(env, 'CVE-2024-3094');
    expect(result.ok).toBe(true);
    expect(result.source).toBe('cache');
    expect(result.data?.epss).toBe('0.850580000');
    expect(fetchSpy).not.toHaveBeenCalled();
  });

  it('fetches live and caches with TTL on miss', async () => {
    globalThis.fetch = (async () => ({
      ok: true,
      status: 200,
      json: async () => SAMPLE_CURRENT,
    })) as unknown as typeof globalThis.fetch;

    const result = await fetchEPSSCurrent(env, 'cve-2024-3094');
    expect(result.ok).toBe(true);
    expect(result.source).toBe('live');
    expect(result.data?.epss).toBe('0.850580000');
    const cache = env.TENSORFEED_CACHE as unknown as MockKV;
    expect(cache.store.has('epss:current:CVE-2024-3094')).toBe(true);
    expect(cache.ttls.get('epss:current:CVE-2024-3094')).toBe(24 * 60 * 60);
  });

  it('returns cve_not_in_epss when FIRST has no record', async () => {
    globalThis.fetch = (async () => ({ ok: true, status: 200, json: async () => ({ status: 'OK', data: [] }) })) as unknown as typeof globalThis.fetch;
    const result = await fetchEPSSCurrent(env, 'CVE-9999-9999');
    expect(result.ok).toBe(false);
    expect(result.error).toBe('cve_not_in_epss');
  });

  it('reports first_api_unavailable on transient HTTP error', async () => {
    globalThis.fetch = (async () => ({ ok: false, status: 503, json: async () => ({}) })) as unknown as typeof globalThis.fetch;
    const result = await fetchEPSSCurrent(env, 'CVE-2024-3094');
    expect(result.ok).toBe(false);
    expect(result.error).toBe('first_api_unavailable');
  });

  it('rejects malformed CVE IDs without a network call', async () => {
    const fetchSpy = vi.fn();
    globalThis.fetch = fetchSpy as unknown as typeof globalThis.fetch;
    const result = await fetchEPSSCurrent(env, 'bogus-id');
    expect(result.ok).toBe(false);
    expect(result.error).toBe('invalid_cve_id');
    expect(fetchSpy).not.toHaveBeenCalled();
  });
});

describe('fetchEPSSSeries', () => {
  let env: Env;
  let originalFetch: typeof globalThis.fetch;

  beforeEach(() => {
    env = makeEnv();
    originalFetch = globalThis.fetch;
  });

  afterEach(() => {
    globalThis.fetch = originalFetch;
  });

  it('returns the time-series array from FIRST', async () => {
    globalThis.fetch = (async () => ({ ok: true, status: 200, json: async () => SAMPLE_SERIES })) as unknown as typeof globalThis.fetch;
    const result = await fetchEPSSSeries(env, 'CVE-2024-3094');
    expect(result.ok).toBe(true);
    expect(result.source).toBe('live');
    expect((result.data as { 'time-series'?: unknown[] })?.['time-series']?.length).toBe(2);
  });

  it('caches on subsequent calls', async () => {
    let calls = 0;
    globalThis.fetch = (async () => {
      calls += 1;
      return { ok: true, status: 200, json: async () => SAMPLE_SERIES };
    }) as unknown as typeof globalThis.fetch;
    await fetchEPSSSeries(env, 'CVE-2024-3094');
    const result2 = await fetchEPSSSeries(env, 'CVE-2024-3094');
    expect(calls).toBe(1);
    expect(result2.source).toBe('cache');
  });
});

describe('fetchEPSSTop', () => {
  let env: Env;
  let originalFetch: typeof globalThis.fetch;

  beforeEach(() => {
    env = makeEnv();
    originalFetch = globalThis.fetch;
  });

  afterEach(() => {
    globalThis.fetch = originalFetch;
  });

  it('returns top-N current with no date param', async () => {
    globalThis.fetch = (async () => ({ ok: true, status: 200, json: async () => SAMPLE_TOP })) as unknown as typeof globalThis.fetch;
    const result = await fetchEPSSTop(env, 2, null);
    expect(result.ok).toBe(true);
    expect(result.count).toBe(2);
    expect(result.data[0].cve).toBe('CVE-2023-23752');
  });

  it('uses a different cache slot for date-filtered queries', async () => {
    let calls = 0;
    globalThis.fetch = (async () => {
      calls += 1;
      return { ok: true, status: 200, json: async () => SAMPLE_TOP };
    }) as unknown as typeof globalThis.fetch;
    await fetchEPSSTop(env, 5, null);
    await fetchEPSSTop(env, 5, '2026-05-01');
    expect(calls).toBe(2);
    await fetchEPSSTop(env, 5, '2026-05-01');
    expect(calls).toBe(2);
  });

  it('caps the limit at 100', async () => {
    let capturedUrl = '';
    globalThis.fetch = (async (url: string) => {
      capturedUrl = url;
      return { ok: true, status: 200, json: async () => SAMPLE_TOP };
    }) as unknown as typeof globalThis.fetch;
    await fetchEPSSTop(env, 10000, null);
    expect(capturedUrl).toContain('limit=100');
  });
});

describe('EPSS_ATTRIBUTION', () => {
  it('declares commercial-permitted redistribution', () => {
    expect(EPSS_ATTRIBUTION.redistribution).toBe('commercial-permitted');
    expect(EPSS_ATTRIBUTION.publisher).toMatch(/FIRST/);
  });
});
