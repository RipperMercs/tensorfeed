import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import {
  fetchVulnrichment,
  normalizeCVEId,
  vulnrichmentPath,
  VULNRICHMENT_ATTRIBUTION,
} from './security-vulnrichment';
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

const SAMPLE_RECORD = {
  dataType: 'CVE_RECORD',
  containers: {
    adp: [{ title: 'CVE Program Container', references: [{ url: 'https://example.com' }] }],
  },
};

describe('normalizeCVEId', () => {
  it('uppercases valid CVE ids', () => {
    expect(normalizeCVEId('cve-2024-3094')).toBe('CVE-2024-3094');
    expect(normalizeCVEId('CVE-2024-42208')).toBe('CVE-2024-42208');
  });
  it('rejects malformed', () => {
    expect(normalizeCVEId('GHSA-r75f-5x8p-qvmc')).toBeNull();
    expect(normalizeCVEId('')).toBeNull();
    expect(normalizeCVEId('CVE-24-3094')).toBeNull();
  });
});

describe('vulnrichmentPath', () => {
  it('builds the expected path for 4-digit CVE numbers', () => {
    expect(vulnrichmentPath('CVE-2024-3094')).toBe('2024/3xxx/CVE-2024-3094.json');
  });
  it('builds the expected path for 5-digit CVE numbers', () => {
    expect(vulnrichmentPath('CVE-2024-42208')).toBe('2024/42xxx/CVE-2024-42208.json');
  });
  it('builds the expected path for low CVE numbers', () => {
    expect(vulnrichmentPath('CVE-2024-0005')).toBe('2024/0xxx/CVE-2024-0005.json');
  });
  it('builds for 6-digit CVE numbers (forward-compat)', () => {
    expect(vulnrichmentPath('CVE-2024-100050')).toBe('2024/100xxx/CVE-2024-100050.json');
  });
  it('returns null for malformed input', () => {
    expect(vulnrichmentPath('not-a-cve')).toBeNull();
  });
});

describe('fetchVulnrichment', () => {
  let env: Env;
  let originalFetch: typeof globalThis.fetch;

  beforeEach(() => {
    env = makeEnv();
    originalFetch = globalThis.fetch;
  });

  afterEach(() => {
    globalThis.fetch = originalFetch;
  });

  it('returns cached record without network', async () => {
    const cache = env.TENSORFEED_CACHE as unknown as MockKV;
    cache.store.set('vulnrichment:CVE-2024-3094', JSON.stringify(SAMPLE_RECORD));
    const fetchSpy = vi.fn();
    globalThis.fetch = fetchSpy as unknown as typeof globalThis.fetch;

    const result = await fetchVulnrichment(env, 'CVE-2024-3094');
    expect(result.ok).toBe(true);
    expect(result.source).toBe('cache');
    expect(fetchSpy).not.toHaveBeenCalled();
  });

  it('fetches live and caches with the documented TTL', async () => {
    let captured = '';
    globalThis.fetch = (async (url: string) => {
      captured = url;
      return { ok: true, status: 200, json: async () => SAMPLE_RECORD };
    }) as unknown as typeof globalThis.fetch;

    const result = await fetchVulnrichment(env, 'cve-2024-3094');
    expect(result.ok).toBe(true);
    expect(result.source).toBe('live');
    expect(captured).toContain('cisagov/vulnrichment/develop/2024/3xxx/CVE-2024-3094.json');

    const cache = env.TENSORFEED_CACHE as unknown as MockKV;
    expect(cache.ttls.get('vulnrichment:CVE-2024-3094')).toBe(7 * 24 * 60 * 60);
  });

  it('returns cve_not_in_vulnrichment on 404 (not every CVE is enriched)', async () => {
    globalThis.fetch = (async () => ({ ok: false, status: 404, json: async () => ({}) })) as unknown as typeof globalThis.fetch;
    const result = await fetchVulnrichment(env, 'CVE-2024-9999');
    expect(result.ok).toBe(false);
    expect(result.error).toBe('cve_not_in_vulnrichment');
  });

  it('rejects invalid input without network', async () => {
    const fetchSpy = vi.fn();
    globalThis.fetch = fetchSpy as unknown as typeof globalThis.fetch;
    const result = await fetchVulnrichment(env, 'totally bogus');
    expect(result.ok).toBe(false);
    expect(result.error).toBe('invalid_cve_id');
    expect(fetchSpy).not.toHaveBeenCalled();
  });

  it('reports network failure cleanly', async () => {
    globalThis.fetch = (async () => {
      throw new Error('ETIMEDOUT');
    }) as unknown as typeof globalThis.fetch;
    const result = await fetchVulnrichment(env, 'CVE-2024-3094');
    expect(result.ok).toBe(false);
    expect(result.error).toMatch(/vulnrichment_fetch_failed/);
  });
});

describe('VULNRICHMENT_ATTRIBUTION', () => {
  it('declares public-domain redistribution', () => {
    expect(VULNRICHMENT_ATTRIBUTION.redistribution).toBe('commercial-permitted');
    expect(VULNRICHMENT_ATTRIBUTION.publisher).toMatch(/Cybersecurity and Infrastructure/);
  });
});
