import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { getGhsaAiFeed, refreshGhsaAiFeed } from './ghsa-ai-feed';

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
    cve_id: null,
    type: 'reviewed',
    severity: 'high',
    summary: 'Generic advisory in test-package',
    description: '',
    published_at: '2026-05-12T10:00:00Z',
    html_url: 'https://github.com/advisories/GHSA-test-0001',
    cwes: [],
    references: [],
    vulnerabilities: [
      {
        package: { ecosystem: 'npm', name: 'test-package' },
        vulnerable_version_range: '>= 0',
        first_patched_version: null,
      },
    ],
    ...overrides,
  };
}

describe('refreshGhsaAiFeed', () => {
  beforeEach(() => {
    vi.stubGlobal('fetch', vi.fn());
  });
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('captures reviewed (non-malware) advisories that match the AI keyword filter', async () => {
    (fetch as any).mockResolvedValueOnce(
      new Response(
        JSON.stringify([
          ghsaAdvisory({
            ghsa_id: 'GHSA-langchain-rce',
            cve_id: 'CVE-2026-12345',
            type: 'reviewed',
            severity: 'critical',
            summary: 'Remote code execution in langchain',
            vulnerabilities: [
              { package: { ecosystem: 'pip', name: 'langchain' }, vulnerable_version_range: '< 0.3.0', first_patched_version: '0.3.0' },
            ],
          }),
        ]),
        { status: 200 },
      ),
    );
    const { kv } = makeKv();
    const env = { TENSORFEED_CACHE: kv } as any;
    const snap = await refreshGhsaAiFeed(env);

    expect(snap.total).toBe(1);
    const entry = snap.entries[0];
    expect(entry.advisory_id).toBe('GHSA-langchain-rce');
    expect(entry.cve_id).toBe('CVE-2026-12345');
    expect(entry.type).toBe('reviewed');
    expect(entry.severity_band).toBe('critical');
    expect(entry.first_patched_version).toBe('0.3.0');
    expect(entry.ai_relevance.matched_keywords).toContain('langchain');
    expect(entry.ai_relevance.confidence).toBe('high');
  });

  it('classifies single weak keyword as low confidence', async () => {
    (fetch as any).mockResolvedValueOnce(
      new Response(
        JSON.stringify([
          ghsaAdvisory({
            ghsa_id: 'GHSA-weak-1',
            type: 'reviewed',
            severity: 'medium',
            summary: 'XSS in foo. Mentions ai briefly.',
            description: 'Mentions  ai  in the body and is otherwise unrelated.',
            vulnerabilities: [
              { package: { ecosystem: 'npm', name: 'foo' }, vulnerable_version_range: '< 1.0.0' },
            ],
          }),
        ]),
        { status: 200 },
      ),
    );
    const { kv } = makeKv();
    const env = { TENSORFEED_CACHE: kv } as any;
    const snap = await refreshGhsaAiFeed(env);

    expect(snap.total).toBe(1);
    expect(snap.entries[0].ai_relevance.confidence).toBe('low');
  });

  it('drops advisories with no AI relevance', async () => {
    (fetch as any).mockResolvedValueOnce(
      new Response(
        JSON.stringify([
          ghsaAdvisory({
            ghsa_id: 'GHSA-unrelated-1',
            summary: 'CVE in left-pad. Nothing here is AI-related at all.',
            description: 'Pure utility library, no machine learning vocabulary present.',
            vulnerabilities: [
              { package: { ecosystem: 'npm', name: 'left-pad' }, vulnerable_version_range: '< 2.0' },
            ],
          }),
        ]),
        { status: 200 },
      ),
    );
    const { kv } = makeKv();
    const env = { TENSORFEED_CACHE: kv } as any;
    const snap = await refreshGhsaAiFeed(env);
    expect(snap.total).toBe(0);
  });

  it('builds by_severity, by_ecosystem, and by_type aggregates', async () => {
    (fetch as any).mockResolvedValueOnce(
      new Response(
        JSON.stringify([
          ghsaAdvisory({ ghsa_id: 'GHSA-1', severity: 'critical', type: 'reviewed', summary: 'rce in vllm', vulnerabilities: [{ package: { ecosystem: 'pip', name: 'vllm' } }] }),
          ghsaAdvisory({ ghsa_id: 'GHSA-2', severity: 'high', type: 'reviewed', summary: 'auth bypass in langchain', vulnerabilities: [{ package: { ecosystem: 'pip', name: 'langchain' } }] }),
          ghsaAdvisory({ ghsa_id: 'GHSA-3', severity: 'high', type: 'malware', summary: 'malware in @anthropic/fake', vulnerabilities: [{ package: { ecosystem: 'npm', name: '@anthropic/fake' } }] }),
        ]),
        { status: 200 },
      ),
    );
    const { kv } = makeKv();
    const env = { TENSORFEED_CACHE: kv } as any;
    const snap = await refreshGhsaAiFeed(env);

    expect(snap.total).toBe(3);
    expect(snap.by_severity.critical).toBe(1);
    expect(snap.by_severity.high).toBe(2);
    expect(snap.by_ecosystem.pip).toBe(2);
    expect(snap.by_ecosystem.npm).toBe(1);
    expect(snap.by_type.reviewed).toBe(2);
    expect(snap.by_type.malware).toBe(1);
  });

  it('sorts newest-first by published_at', async () => {
    (fetch as any).mockResolvedValueOnce(
      new Response(
        JSON.stringify([
          ghsaAdvisory({ ghsa_id: 'GHSA-older', published_at: '2026-04-01T00:00:00Z', summary: 'old langchain', vulnerabilities: [{ package: { ecosystem: 'pip', name: 'langchain' } }] }),
          ghsaAdvisory({ ghsa_id: 'GHSA-newer', published_at: '2026-05-10T00:00:00Z', summary: 'new langchain', vulnerabilities: [{ package: { ecosystem: 'pip', name: 'langchain' } }] }),
        ]),
        { status: 200 },
      ),
    );
    const { kv } = makeKv();
    const env = { TENSORFEED_CACHE: kv } as any;
    const snap = await refreshGhsaAiFeed(env);
    expect(snap.entries[0].advisory_id).toBe('GHSA-newer');
    expect(snap.entries[1].advisory_id).toBe('GHSA-older');
  });

  it('computes age_days from published_at', async () => {
    const now = new Date('2026-05-14T00:00:00Z').getTime();
    vi.useFakeTimers();
    vi.setSystemTime(now);

    (fetch as any).mockResolvedValueOnce(
      new Response(
        JSON.stringify([
          ghsaAdvisory({ ghsa_id: 'GHSA-week', published_at: '2026-05-07T00:00:00Z', summary: 'week-old vllm advisory', vulnerabilities: [{ package: { ecosystem: 'pip', name: 'vllm' } }] }),
        ]),
        { status: 200 },
      ),
    );
    const { kv } = makeKv();
    const env = { TENSORFEED_CACHE: kv } as any;
    const snap = await refreshGhsaAiFeed(env);
    expect(snap.entries[0].age_days).toBe(7);

    vi.useRealTimers();
  });

  it('throws on GHSA fetch failure (cron will record + log)', async () => {
    (fetch as any).mockResolvedValueOnce(
      new Response('upstream rate limit', { status: 403 }),
    );
    const { kv } = makeKv();
    const env = { TENSORFEED_CACHE: kv } as any;
    await expect(refreshGhsaAiFeed(env)).rejects.toThrow(/github advisories fetch failed: 403/);
  });
});

describe('getGhsaAiFeed', () => {
  it('returns null when no snapshot has been written', async () => {
    const { kv } = makeKv();
    const env = { TENSORFEED_CACHE: kv } as any;
    expect(await getGhsaAiFeed(env)).toBeNull();
  });

  it('returns the parsed snapshot when one exists', async () => {
    const { kv, store } = makeKv();
    store.set(
      'security:ghsa-ai-feed',
      JSON.stringify({
        generated_at: '2026-05-14T00:00:00Z',
        total: 1,
        by_severity: { critical: 0, high: 1, medium: 0, low: 0, unknown: 0 },
        by_ecosystem: { pip: 1 },
        by_type: { reviewed: 1, unreviewed: 0, malware: 0 },
        entries: [],
        sources: [],
        posture: '',
      }),
    );
    const env = { TENSORFEED_CACHE: kv } as any;
    const got = await getGhsaAiFeed(env);
    expect(got?.total).toBe(1);
  });

  it('returns null when KV value is unparseable', async () => {
    const { kv, store } = makeKv();
    store.set('security:ghsa-ai-feed', 'not-json');
    const env = { TENSORFEED_CACHE: kv } as any;
    expect(await getGhsaAiFeed(env)).toBeNull();
  });
});
