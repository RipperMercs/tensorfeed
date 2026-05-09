import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import {
  fetchOSVById,
  fetchOSVForPackage,
  parseOsvPackageQuery,
  normalizeOsvId,
  OSV_ATTRIBUTION,
  OSV_SUPPORTED_ECOSYSTEMS,
} from './security-osv';
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

const SAMPLE_ADVISORY = {
  id: 'GHSA-r75f-5x8p-qvmc',
  summary: 'LiteLLM has SQL Injection in Proxy API key verification',
  aliases: ['CVE-2026-42208'],
  published: '2026-04-24T16:17:07Z',
  modified: '2026-05-05T16:10:31Z',
};

const SAMPLE_PACKAGE_QUERY_RESPONSE = {
  vulns: [
    { id: 'GHSA-2qmj-7962-cjq8', summary: 'langchain arbitrary code execution', aliases: ['CVE-2023-36258'] },
    { id: 'GHSA-aaaa-bbbb-cccc', summary: 'second issue', aliases: [] },
  ],
};

function pkgUrl(extras: Record<string, string>): URL {
  const base = new URL('https://tensorfeed.ai/api/security/osv/package');
  for (const [k, v] of Object.entries(extras)) base.searchParams.set(k, v);
  return base;
}

describe('normalizeOsvId', () => {
  it('uppercases and validates known shapes', () => {
    expect(normalizeOsvId('ghsa-r75f-5x8p-qvmc')).toBe('GHSA-R75F-5X8P-QVMC');
    expect(normalizeOsvId('CVE-2024-3094')).toBe('CVE-2024-3094');
    expect(normalizeOsvId('PYSEC-2023-98')).toBe('PYSEC-2023-98');
  });
  it('rejects empty / whitespace input', () => {
    expect(normalizeOsvId('')).toBeNull();
    expect(normalizeOsvId('  ')).toBeNull();
  });

  it('rejects ids starting with non-letter', () => {
    expect(normalizeOsvId('1234-5678')).toBeNull();
    expect(normalizeOsvId('-LEAD-DASH')).toBeNull();
  });

  it('rejects ids with disallowed characters', () => {
    expect(normalizeOsvId('GHSA spaces inside')).toBeNull();
    expect(normalizeOsvId('GHSA/with/slashes')).toBeNull();
  });
});

describe('parseOsvPackageQuery', () => {
  it('parses a happy-path query with version', () => {
    const out = parseOsvPackageQuery(pkgUrl({ ecosystem: 'PyPI', name: 'langchain', version: '0.1.0' }));
    expect(out.ok).toBe(true);
    if (out.ok) {
      expect(out.query.ecosystem).toBe('PyPI');
      expect(out.query.name).toBe('langchain');
      expect(out.query.version).toBe('0.1.0');
    }
  });

  it('parses without version', () => {
    const out = parseOsvPackageQuery(pkgUrl({ ecosystem: 'npm', name: '@anthropic-ai/sdk' }));
    expect(out.ok).toBe(true);
    if (out.ok) {
      expect(out.query.version).toBeNull();
    }
  });

  it('rejects missing ecosystem', () => {
    const out = parseOsvPackageQuery(pkgUrl({ name: 'foo' }));
    expect(out.ok).toBe(false);
    if (!out.ok) expect(out.error).toBe('ecosystem_required');
  });

  it('rejects missing name', () => {
    const out = parseOsvPackageQuery(pkgUrl({ ecosystem: 'PyPI' }));
    expect(out.ok).toBe(false);
    if (!out.ok) expect(out.error).toBe('name_required');
  });

  it('rejects malformed name', () => {
    const out = parseOsvPackageQuery(pkgUrl({ ecosystem: 'PyPI', name: 'bad name with spaces!' }));
    expect(out.ok).toBe(false);
    if (!out.ok) expect(out.error).toBe('invalid_name');
  });
});

describe('fetchOSVById', () => {
  let env: Env;
  let originalFetch: typeof globalThis.fetch;

  beforeEach(() => {
    env = makeEnv();
    originalFetch = globalThis.fetch;
  });

  afterEach(() => {
    globalThis.fetch = originalFetch;
  });

  it('returns cached advisory without network', async () => {
    const cache = env.TENSORFEED_CACHE as unknown as MockKV;
    cache.store.set('osv:id:GHSA-R75F-5X8P-QVMC', JSON.stringify(SAMPLE_ADVISORY));
    const fetchSpy = vi.fn();
    globalThis.fetch = fetchSpy as unknown as typeof globalThis.fetch;
    const result = await fetchOSVById(env, 'ghsa-r75f-5x8p-qvmc');
    expect(result.ok).toBe(true);
    expect(result.source).toBe('cache');
    expect(fetchSpy).not.toHaveBeenCalled();
  });

  it('fetches live and caches with the documented TTL', async () => {
    globalThis.fetch = (async () => ({ ok: true, status: 200, json: async () => SAMPLE_ADVISORY })) as unknown as typeof globalThis.fetch;
    const result = await fetchOSVById(env, 'GHSA-R75F-5X8P-QVMC');
    expect(result.ok).toBe(true);
    expect(result.source).toBe('live');
    const cache = env.TENSORFEED_CACHE as unknown as MockKV;
    expect(cache.ttls.get('osv:id:GHSA-R75F-5X8P-QVMC')).toBe(24 * 60 * 60);
  });

  it('returns osv_not_found on 404', async () => {
    globalThis.fetch = (async () => ({ ok: false, status: 404, json: async () => ({}) })) as unknown as typeof globalThis.fetch;
    const result = await fetchOSVById(env, 'GHSA-9999-9999-9999');
    expect(result.ok).toBe(false);
    expect(result.error).toBe('osv_not_found');
  });

  it('rejects invalid IDs without network', async () => {
    const fetchSpy = vi.fn();
    globalThis.fetch = fetchSpy as unknown as typeof globalThis.fetch;
    const result = await fetchOSVById(env, 'not a valid id');
    expect(result.ok).toBe(false);
    expect(result.error).toBe('invalid_osv_id');
    expect(fetchSpy).not.toHaveBeenCalled();
  });
});

describe('fetchOSVForPackage', () => {
  let env: Env;
  let originalFetch: typeof globalThis.fetch;

  beforeEach(() => {
    env = makeEnv();
    originalFetch = globalThis.fetch;
  });

  afterEach(() => {
    globalThis.fetch = originalFetch;
  });

  const QUERY = { ecosystem: 'PyPI', name: 'langchain', version: '0.1.0' };

  it('POSTs to OSV with the package descriptor', async () => {
    let captured: { url: string; init?: RequestInit } | null = null;
    globalThis.fetch = (async (url: string, init?: RequestInit) => {
      captured = { url, init };
      return { ok: true, status: 200, json: async () => SAMPLE_PACKAGE_QUERY_RESPONSE };
    }) as unknown as typeof globalThis.fetch;

    const result = await fetchOSVForPackage(env, QUERY);
    expect(result.ok).toBe(true);
    expect(result.source).toBe('live');
    expect(result.vulns_count).toBe(2);
    expect(captured!.url).toContain('/v1/query');
    expect(captured!.init!.method).toBe('POST');
    const body = JSON.parse(captured!.init!.body as string);
    expect(body).toEqual({ package: { name: 'langchain', ecosystem: 'PyPI' }, version: '0.1.0' });
  });

  it('caches subsequent queries for the same package', async () => {
    let calls = 0;
    globalThis.fetch = (async () => {
      calls += 1;
      return { ok: true, status: 200, json: async () => SAMPLE_PACKAGE_QUERY_RESPONSE };
    }) as unknown as typeof globalThis.fetch;
    await fetchOSVForPackage(env, QUERY);
    const r2 = await fetchOSVForPackage(env, QUERY);
    expect(calls).toBe(1);
    expect(r2.source).toBe('cache');
  });

  it('keeps separate cache entries per ecosystem + name + version', async () => {
    let calls = 0;
    globalThis.fetch = (async () => {
      calls += 1;
      return { ok: true, status: 200, json: async () => SAMPLE_PACKAGE_QUERY_RESPONSE };
    }) as unknown as typeof globalThis.fetch;
    await fetchOSVForPackage(env, { ecosystem: 'PyPI', name: 'langchain', version: '0.1.0' });
    await fetchOSVForPackage(env, { ecosystem: 'PyPI', name: 'langchain', version: '0.2.0' });
    await fetchOSVForPackage(env, { ecosystem: 'npm', name: 'langchain', version: null });
    expect(calls).toBe(3);
  });

  it('handles non-200 errors with osv_http_<code>', async () => {
    globalThis.fetch = (async () => ({ ok: false, status: 500, json: async () => ({}) })) as unknown as typeof globalThis.fetch;
    const result = await fetchOSVForPackage(env, QUERY);
    expect(result.ok).toBe(false);
    expect(result.error).toBe('osv_http_500');
  });

  it('handles empty vulns response cleanly', async () => {
    globalThis.fetch = (async () => ({ ok: true, status: 200, json: async () => ({}) })) as unknown as typeof globalThis.fetch;
    const result = await fetchOSVForPackage(env, QUERY);
    expect(result.ok).toBe(true);
    expect(result.vulns_count).toBe(0);
  });
});

describe('OSV_ATTRIBUTION', () => {
  it('declares Apache-2.0 commercial-permitted', () => {
    expect(OSV_ATTRIBUTION.redistribution).toBe('commercial-permitted');
    expect(OSV_ATTRIBUTION.license).toMatch(/Apache/);
  });
});

describe('OSV_SUPPORTED_ECOSYSTEMS', () => {
  it('includes the canonical ecosystems', () => {
    expect(OSV_SUPPORTED_ECOSYSTEMS).toContain('PyPI');
    expect(OSV_SUPPORTED_ECOSYSTEMS).toContain('npm');
    expect(OSV_SUPPORTED_ECOSYSTEMS).toContain('Go');
  });
});
