import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import {
  captureKEV,
  readKEVCurrent,
  readKEVByCVE,
  readKEVAddedOnDate,
  listKEVAddedDates,
  readKEVMeta,
  summarizeKEVForFreeTier,
  type KEVCatalog,
  KEV_ATTRIBUTION,
} from './security-kev';
import type { Env } from './types';

class MockKV {
  store = new Map<string, string>();
  async get<T = string>(key: string, format?: 'json'): Promise<T | null> {
    const raw = this.store.get(key);
    if (raw === undefined) return null;
    if (format === 'json') return JSON.parse(raw) as T;
    return raw as unknown as T;
  }
  async put(key: string, value: string): Promise<void> {
    this.store.set(key, value);
  }
}

function makeEnv(): Env {
  return {
    TENSORFEED_CACHE: new MockKV(),
    TENSORFEED_NEWS: new MockKV(),
    TENSORFEED_STATUS: new MockKV(),
  } as unknown as Env;
}

const SAMPLE_CATALOG: KEVCatalog = {
  title: 'CISA Catalog of Known Exploited Vulnerabilities',
  catalogVersion: '2026.05.08',
  dateReleased: '2026-05-08T17:31:07.6877Z',
  count: 3,
  vulnerabilities: [
    {
      cveID: 'CVE-2026-42208',
      vendorProject: 'BerriAI',
      product: 'LiteLLM',
      vulnerabilityName: 'BerriAI LiteLLM SQL Injection',
      dateAdded: '2026-05-08',
      shortDescription: 'SQL injection in LiteLLM proxy.',
      requiredAction: 'Apply mitigations.',
      dueDate: '2026-05-11',
      knownRansomwareCampaignUse: 'Unknown',
      notes: 'https://example.com',
      cwes: ['CWE-89'],
    },
    {
      cveID: 'CVE-2026-1942',
      vendorProject: 'Ivanti',
      product: 'EPMM',
      vulnerabilityName: 'Improper input validation',
      dateAdded: '2026-05-07',
      shortDescription: 'Improper input validation.',
      requiredAction: 'Apply patches.',
      dueDate: '2026-05-21',
      knownRansomwareCampaignUse: 'Unknown',
      notes: '',
      cwes: ['CWE-20'],
    },
    {
      cveID: 'CVE-2024-3094',
      vendorProject: 'OSS',
      product: 'xz',
      vulnerabilityName: 'Malicious code in xz',
      dateAdded: '2024-03-29',
      shortDescription: 'Backdoor in xz.',
      requiredAction: 'Downgrade.',
      dueDate: '2024-04-12',
      knownRansomwareCampaignUse: 'Unknown',
      notes: '',
      cwes: ['CWE-506'],
    },
  ],
};

describe('captureKEV', () => {
  let env: Env;
  let originalFetch: typeof globalThis.fetch;

  beforeEach(() => {
    env = makeEnv();
    originalFetch = globalThis.fetch;
  });

  afterEach(() => {
    globalThis.fetch = originalFetch;
  });

  it('writes the full catalog and harvests today-added entries', async () => {
    globalThis.fetch = (async () => ({ ok: true, status: 200, json: async () => SAMPLE_CATALOG })) as unknown as typeof globalThis.fetch;

    const result = await captureKEV(env, new Date('2026-05-08T20:00:00Z'));

    expect(result.ok).toBe(true);
    expect(result.total_entries).toBe(3);
    expect(result.newly_added_today).toBe(1);

    const current = await readKEVCurrent(env);
    expect(current?.count).toBe(3);

    const added = await readKEVAddedOnDate(env, '2026-05-08');
    expect(added.length).toBe(1);
    expect(added[0].cveID).toBe('CVE-2026-42208');

    const dates = await listKEVAddedDates(env);
    expect(dates).toEqual(['2026-05-08']);
  });

  it('writes meta with the catalog version', async () => {
    globalThis.fetch = (async () => ({ ok: true, status: 200, json: async () => SAMPLE_CATALOG })) as unknown as typeof globalThis.fetch;
    await captureKEV(env, new Date('2026-05-08T20:00:00Z'));
    const meta = (await readKEVMeta(env)) as { catalog_version: string };
    expect(meta?.catalog_version).toBe('2026.05.08');
  });

  it('skips writing kev:added when no entries match today', async () => {
    globalThis.fetch = (async () => ({ ok: true, status: 200, json: async () => SAMPLE_CATALOG })) as unknown as typeof globalThis.fetch;
    await captureKEV(env, new Date('2030-01-01T00:00:00Z'));
    const dates = await listKEVAddedDates(env);
    expect(dates).toEqual([]);
  });

  it('handles a non-200 response with kev_http_<code>', async () => {
    globalThis.fetch = (async () => ({ ok: false, status: 503, json: async () => ({}) })) as unknown as typeof globalThis.fetch;
    const result = await captureKEV(env, new Date('2026-05-08T20:00:00Z'));
    expect(result.ok).toBe(false);
    expect(result.error).toBe('kev_http_503');
  });

  it('handles a malformed catalog gracefully', async () => {
    globalThis.fetch = (async () => ({ ok: true, status: 200, json: async () => ({ title: 'no array here' }) })) as unknown as typeof globalThis.fetch;
    const result = await captureKEV(env, new Date('2026-05-08T20:00:00Z'));
    expect(result.ok).toBe(false);
    expect(result.error).toBe('kev_missing_vulnerabilities_array');
  });
});

describe('readKEVByCVE', () => {
  it('finds an entry case-insensitively', async () => {
    const env = makeEnv();
    const cache = env.TENSORFEED_CACHE as unknown as MockKV;
    cache.store.set('kev:current', JSON.stringify(SAMPLE_CATALOG));
    const found = await readKEVByCVE(env, 'cve-2024-3094');
    expect(found?.cveID).toBe('CVE-2024-3094');
  });

  it('returns null when the catalog is empty or missing', async () => {
    const env = makeEnv();
    expect(await readKEVByCVE(env, 'CVE-2024-3094')).toBeNull();
  });

  it('returns null on a non-matching id', async () => {
    const env = makeEnv();
    const cache = env.TENSORFEED_CACHE as unknown as MockKV;
    cache.store.set('kev:current', JSON.stringify(SAMPLE_CATALOG));
    expect(await readKEVByCVE(env, 'CVE-9999-9999')).toBeNull();
  });
});

describe('summarizeKEVForFreeTier', () => {
  it('sorts most-recent first and respects the limit', () => {
    const view = summarizeKEVForFreeTier(SAMPLE_CATALOG, 2);
    expect(view.returned).toBe(2);
    expect(view.most_recent[0].dateAdded).toBe('2026-05-08');
    expect(view.most_recent[1].dateAdded).toBe('2026-05-07');
  });

  it('reports the catalog metadata accurately', () => {
    const view = summarizeKEVForFreeTier(SAMPLE_CATALOG);
    expect(view.catalog_version).toBe('2026.05.08');
    expect(view.total_entries).toBe(3);
  });
});

describe('KEV_ATTRIBUTION', () => {
  it('declares public-domain redistribution', () => {
    expect(KEV_ATTRIBUTION.redistribution).toBe('commercial-permitted');
    expect(KEV_ATTRIBUTION.license).toMatch(/public domain/i);
  });
});
