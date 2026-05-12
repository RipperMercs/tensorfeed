import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { getAiSupplyChainIocs, refreshAiSupplyChainIocs } from './ai-supply-chain-iocs';

function makeKv(): { kv: any; store: Map<string, string> } {
  const store = new Map<string, string>();
  const kv = {
    async get(key: string) {
      return store.get(key) ?? null;
    },
    async put(key: string, value: string) {
      store.set(key, value);
    },
  };
  return { kv, store };
}

function ghsaAdvisory(overrides: Record<string, unknown> = {}) {
  return {
    ghsa_id: 'GHSA-test-0001',
    type: 'malware',
    severity: 'critical',
    summary: 'Malware in test-package',
    description: 'desc',
    published_at: '2026-05-12T10:00:00Z',
    html_url: 'https://github.com/advisories/GHSA-test-0001',
    vulnerabilities: [
      {
        package: { ecosystem: 'npm', name: 'test-package' },
        vulnerable_version_range: '>= 0',
      },
    ],
    ...overrides,
  };
}

describe('refreshAiSupplyChainIocs', () => {
  beforeEach(() => {
    vi.stubGlobal('fetch', vi.fn());
  });
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('keeps advisories whose package name matches an AI keyword', async () => {
    (fetch as any).mockResolvedValueOnce(
      new Response(
        JSON.stringify([
          ghsaAdvisory({
            ghsa_id: 'GHSA-ai-1',
            summary: 'Malware in @openai/fake-sdk',
            vulnerabilities: [
              { package: { ecosystem: 'npm', name: '@openai/fake-sdk' } },
            ],
          }),
          ghsaAdvisory({
            ghsa_id: 'GHSA-mcp-1',
            summary: 'Malware in mcp-server-helper',
            vulnerabilities: [
              { package: { ecosystem: 'npm', name: 'mcp-server-helper' } },
            ],
          }),
        ]),
        { status: 200 },
      ),
    );

    const { kv } = makeKv();
    const env = { TENSORFEED_CACHE: kv } as any;
    const snap = await refreshAiSupplyChainIocs(env);

    expect(snap.total).toBe(2);
    expect(snap.entries.map((e) => e.advisory_id).sort()).toEqual([
      'GHSA-ai-1',
      'GHSA-mcp-1',
    ]);
    expect(snap.entries[0].ai_relevance.matched_keywords.length).toBeGreaterThan(0);
  });

  it('drops advisories that have no AI-relevance signal', async () => {
    (fetch as any).mockResolvedValueOnce(
      new Response(
        JSON.stringify([
          ghsaAdvisory({
            ghsa_id: 'GHSA-irrelevant-1',
            summary: 'Malware in left-pad-imposter',
            vulnerabilities: [
              { package: { ecosystem: 'npm', name: 'left-pad-imposter' } },
            ],
          }),
        ]),
        { status: 200 },
      ),
    );

    const { kv } = makeKv();
    const env = { TENSORFEED_CACHE: kv } as any;
    const snap = await refreshAiSupplyChainIocs(env);

    expect(snap.total).toBe(0);
    expect(snap.entries).toEqual([]);
  });

  it('drops advisories outside npm and pip ecosystems', async () => {
    (fetch as any).mockResolvedValueOnce(
      new Response(
        JSON.stringify([
          ghsaAdvisory({
            ghsa_id: 'GHSA-rubygem-1',
            summary: 'Malware in openai-gem',
            vulnerabilities: [
              { package: { ecosystem: 'rubygems', name: 'openai-gem' } },
            ],
          }),
        ]),
        { status: 200 },
      ),
    );

    const { kv } = makeKv();
    const env = { TENSORFEED_CACHE: kv } as any;
    const snap = await refreshAiSupplyChainIocs(env);

    expect(snap.total).toBe(0);
  });

  it('drops advisories whose type is not malware', async () => {
    (fetch as any).mockResolvedValueOnce(
      new Response(
        JSON.stringify([
          ghsaAdvisory({
            ghsa_id: 'GHSA-cve-1',
            type: 'reviewed',
            summary: 'CVE in openai-thing',
            vulnerabilities: [
              { package: { ecosystem: 'npm', name: 'openai-thing' } },
            ],
          }),
        ]),
        { status: 200 },
      ),
    );

    const { kv } = makeKv();
    const env = { TENSORFEED_CACHE: kv } as any;
    const snap = await refreshAiSupplyChainIocs(env);
    expect(snap.total).toBe(0);
  });

  it('throws when GHSA returns a non-ok status', async () => {
    (fetch as any).mockResolvedValueOnce(
      new Response('rate limited', { status: 429 }),
    );

    const { kv } = makeKv();
    const env = { TENSORFEED_CACHE: kv } as any;
    await expect(refreshAiSupplyChainIocs(env)).rejects.toThrow(/429/);
  });

  it('persists the snapshot to KV and reads it back via getAiSupplyChainIocs', async () => {
    (fetch as any).mockResolvedValueOnce(
      new Response(
        JSON.stringify([
          ghsaAdvisory({
            ghsa_id: 'GHSA-roundtrip-1',
            summary: 'Malware in claude-helper',
            vulnerabilities: [
              { package: { ecosystem: 'npm', name: 'claude-helper' } },
            ],
          }),
        ]),
        { status: 200 },
      ),
    );

    const { kv } = makeKv();
    const env = { TENSORFEED_CACHE: kv } as any;
    await refreshAiSupplyChainIocs(env);

    const read = await getAiSupplyChainIocs(env);
    expect(read).not.toBeNull();
    expect(read!.total).toBe(1);
    expect(read!.entries[0].advisory_id).toBe('GHSA-roundtrip-1');
    expect(read!.sources.some((s) => s.name.includes('GitHub'))).toBe(true);
  });

  it('returns null when KV is empty', async () => {
    const { kv } = makeKv();
    const env = { TENSORFEED_CACHE: kv } as any;
    const read = await getAiSupplyChainIocs(env);
    expect(read).toBeNull();
  });
});
