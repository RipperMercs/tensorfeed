import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { installFakeCache, InstalledCache } from './edge-cache-test-helpers';
import {
  parsePowerQuery,
  fetchPowerPoint,
  POWER_PARAMETER_CATALOG,
  POWER_ATTRIBUTION,
} from './climate-nasa-power';
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

const SAMPLE_DAILY = {
  type: 'Feature',
  geometry: { type: 'Point', coordinates: [-118.244, 34.052, 395.0] },
  properties: {
    parameter: {
      T2M: { '20260101': 13.57, '20260102': 14.07 },
    },
  },
  header: { sources: ['MERRA2'] },
};

function buildUrl(extras: Record<string, string>): URL {
  const base = new URL('https://tensorfeed.ai/api/climate/power/daily');
  for (const [k, v] of Object.entries(extras)) base.searchParams.set(k, v);
  return base;
}

describe('parsePowerQuery', () => {
  const defaults = { community: 'AG', maxRangeDays: 365 };

  it('parses a happy-path query', () => {
    const url = buildUrl({
      latitude: '34.0522',
      longitude: '-118.2437',
      parameters: 'T2M,PRECTOTCORR',
      start: '20260101',
      end: '20260105',
    });
    const result = parsePowerQuery(url, 'daily', defaults);
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.query.latitude).toBeCloseTo(34.0522);
      expect(result.query.parameters).toEqual(['T2M', 'PRECTOTCORR']);
      expect(result.query.community).toBe('AG');
    }
  });

  it('rejects missing parameters', () => {
    const url = buildUrl({
      latitude: '34',
      longitude: '-118',
      start: '20260101',
      end: '20260102',
    });
    const result = parsePowerQuery(url, 'daily', defaults);
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.error).toBe('parameters_required');
  });

  it('rejects out-of-range latitude', () => {
    const url = buildUrl({
      latitude: '95',
      longitude: '0',
      parameters: 'T2M',
      start: '20260101',
      end: '20260102',
    });
    const result = parsePowerQuery(url, 'daily', defaults);
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.error).toBe('invalid_latitude');
  });

  it('rejects malformed dates', () => {
    const url = buildUrl({
      latitude: '0',
      longitude: '0',
      parameters: 'T2M',
      start: '2026-01-01',
      end: '20260102',
    });
    const result = parsePowerQuery(url, 'daily', defaults);
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.error).toBe('invalid_date_range');
  });

  it('rejects ranges exceeding the cap', () => {
    const url = buildUrl({
      latitude: '0',
      longitude: '0',
      parameters: 'T2M',
      start: '20200101',
      end: '20260101',
    });
    const result = parsePowerQuery(url, 'daily', defaults);
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.error).toBe('range_too_large');
  });

  it('rejects an invalid community', () => {
    const url = buildUrl({
      latitude: '0',
      longitude: '0',
      parameters: 'T2M',
      start: '20260101',
      end: '20260102',
      community: 'XYZ',
    });
    const result = parsePowerQuery(url, 'daily', defaults);
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.error).toBe('invalid_community');
  });

  it('rejects malformed parameter codes', () => {
    const url = buildUrl({
      latitude: '0',
      longitude: '0',
      parameters: 't2m,5BAD',
      start: '20260101',
      end: '20260102',
    });
    const result = parsePowerQuery(url, 'daily', defaults);
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.error).toBe('invalid_parameter');
  });

  it('caps the parameter count at 20', () => {
    const params = Array.from({ length: 21 }, (_, i) => `P${i}`).join(',');
    const url = buildUrl({
      latitude: '0',
      longitude: '0',
      parameters: params,
      start: '20260101',
      end: '20260102',
    });
    const result = parsePowerQuery(url, 'daily', defaults);
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.error).toBe('invalid_parameters_count');
  });
});

describe('fetchPowerPoint', () => {
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
    latitude: 34.0522,
    longitude: -118.2437,
    parameters: ['T2M'],
    start: '20260101',
    end: '20260105',
    community: 'AG',
    temporal: 'daily' as const,
  };

  it('returns cached payload without network', async () => {
    const fetchSpy = vi.fn();
    globalThis.fetch = fetchSpy as unknown as typeof globalThis.fetch;
    const url = buildUrl({
      latitude: '34.0522',
      longitude: '-118.2437',
      parameters: 'T2M',
      start: '20260101',
      end: '20260105',
    });
    const parsed = parsePowerQuery(url, 'daily', { maxRangeDays: 365 });
    expect(parsed.ok).toBe(true);
    if (!parsed.ok) return;

    // Seed cache via a first successful live call
    let calls = 0;
    globalThis.fetch = (async () => {
      calls += 1;
      return { ok: true, status: 200, json: async () => SAMPLE_DAILY };
    }) as unknown as typeof globalThis.fetch;
    await fetchPowerPoint(env, parsed.query);
    expect(calls).toBe(1);

    const result2 = await fetchPowerPoint(env, parsed.query);
    expect(result2.source).toBe('cache');
    expect(calls).toBe(1);
  });

  it('caches with the documented daily TTL', async () => {
    globalThis.fetch = (async () => ({ ok: true, status: 200, json: async () => SAMPLE_DAILY })) as unknown as typeof globalThis.fetch;
    await fetchPowerPoint(env, QUERY);
    const stored = Array.from(installedCache.cache.store.values())[0];
    expect(stored?.headers.get('cache-control')).toBe(`s-maxage=${7 * 24 * 60 * 60}`);
  });

  it('reports rate-limit upstream as power_upstream_rate_limited', async () => {
    globalThis.fetch = (async () => ({ ok: false, status: 429, json: async () => ({}) })) as unknown as typeof globalThis.fetch;
    const result = await fetchPowerPoint(env, QUERY);
    expect(result.ok).toBe(false);
    expect(result.error).toBe('power_upstream_rate_limited');
    expect(result.http_status).toBe(429);
  });

  it('reports non-200 errors with power_http_<code>', async () => {
    globalThis.fetch = (async () => ({ ok: false, status: 500, json: async () => ({}) })) as unknown as typeof globalThis.fetch;
    const result = await fetchPowerPoint(env, QUERY);
    expect(result.error).toBe('power_http_500');
  });

  it('handles network failure cleanly', async () => {
    globalThis.fetch = (async () => {
      throw new Error('ETIMEDOUT');
    }) as unknown as typeof globalThis.fetch;
    const result = await fetchPowerPoint(env, QUERY);
    expect(result.ok).toBe(false);
    expect(result.error).toMatch(/power_fetch_failed/);
  });
});

describe('POWER_PARAMETER_CATALOG', () => {
  it('lists at least the canonical parameters', () => {
    const codes = POWER_PARAMETER_CATALOG.map((p) => p.code);
    expect(codes).toContain('T2M');
    expect(codes).toContain('PRECTOTCORR');
    expect(codes).toContain('ALLSKY_SFC_SW_DWN');
  });

  it('every entry has units, longname, community', () => {
    for (const p of POWER_PARAMETER_CATALOG) {
      expect(p.units).toBeTruthy();
      expect(p.longname).toBeTruthy();
      expect(['AG', 'RE', 'SB']).toContain(p.community);
    }
  });
});

describe('POWER_ATTRIBUTION', () => {
  it('declares public-domain redistribution', () => {
    expect(POWER_ATTRIBUTION.redistribution).toBe('commercial-permitted');
    expect(POWER_ATTRIBUTION.publisher).toMatch(/NASA/);
  });
});
