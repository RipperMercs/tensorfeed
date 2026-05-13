import { describe, expect, it } from 'vitest';
import { buildSuggestedNextCalls, __test } from './suggested-next';

const { lookupSuggestions, resolveTemplatePath, renderSuggestion, FALLBACK_SUGGESTIONS } = __test;

describe('resolveTemplatePath', () => {
  it('returns path unchanged when no placeholders', () => {
    expect(resolveTemplatePath('/api/premium/news/decision-verified', '/api/premium/news/decision-verified')).toBe(
      '/api/premium/news/decision-verified',
    );
  });
  it('substitutes a single trailing placeholder', () => {
    expect(
      resolveTemplatePath('/api/security/cve/{cve}', '/api/premium/security/verified/CVE-2024-3094'),
    ).toBe('/api/security/cve/CVE-2024-3094');
  });
  it('leaves placeholder in place when inbound has no value at that position', () => {
    expect(resolveTemplatePath('/api/security/cve/{cve}', '/api/premium')).toBe('/api/security/cve/{cve}');
  });
});

describe('lookupSuggestions', () => {
  it('finds an exact-match key', () => {
    const out = lookupSuggestions('/api/premium/research/topic-search');
    expect(out).not.toBeNull();
    expect(out!.length).toBeGreaterThan(0);
  });
  it('matches a template key by segment shape', () => {
    const out = lookupSuggestions('/api/premium/security/verified/CVE-2024-3094');
    expect(out).not.toBeNull();
    expect(out!.some((s) => s.path === '/api/security/cve/{cve}')).toBe(true);
  });
  it('returns null when no map entry and no template matches', () => {
    expect(lookupSuggestions('/api/premium/some-bogus-endpoint')).toBeNull();
  });
});

describe('renderSuggestion', () => {
  it('inherits requested params verbatim', () => {
    const inbound = new URL('https://tensorfeed.ai/api/premium/news/decision-verified?cluster_id=abc&date=2026-05-12');
    const out = renderSuggestion(
      {
        path: '/api/history/news/clusters',
        why: 'discovery',
        credits: 0,
        inheritParams: ['date'],
      },
      inbound.origin,
      inbound,
    );
    expect(out.url).toBe('https://tensorfeed.ai/api/history/news/clusters?date=2026-05-12');
    expect(out.credits).toBe(0);
    expect(out.method).toBe('GET');
  });

  it('applies default params when inbound did not supply them', () => {
    const inbound = new URL('https://tensorfeed.ai/api/premium/news/decision-verified?cluster_id=abc&date=2026-05-12');
    const out = renderSuggestion(
      {
        path: '/api/premium/news/decision-verified/search',
        why: 'search',
        credits: 1,
        defaultParams: { min_sources: '4' },
      },
      inbound.origin,
      inbound,
    );
    expect(out.url).toContain('min_sources=4');
  });

  it('inherited params take precedence over defaults', () => {
    const inbound = new URL('https://tensorfeed.ai/api/premium/news/search?q=openai&min_sources=8');
    const out = renderSuggestion(
      {
        path: '/api/premium/news/decision-verified/search',
        why: 'search',
        credits: 1,
        inheritParams: ['min_sources'],
        defaultParams: { min_sources: '4' },
      },
      inbound.origin,
      inbound,
    );
    expect(out.url).toContain('min_sources=8');
    expect(out.url).not.toContain('min_sources=4');
  });

  it('substitutes path placeholders from inbound URL', () => {
    const inbound = new URL('https://tensorfeed.ai/api/premium/security/verified/CVE-2024-3094');
    const out = renderSuggestion(
      {
        path: '/api/security/cve/{cve}',
        why: 'mitre',
        credits: 0,
      },
      inbound.origin,
      inbound,
    );
    expect(out.url).toBe('https://tensorfeed.ai/api/security/cve/CVE-2024-3094');
  });
});

describe('buildSuggestedNextCalls', () => {
  it('returns at most 3 suggestions for a mapped endpoint', () => {
    const req = new Request('https://tensorfeed.ai/api/premium/research/topic-search?subfield_tag=agents');
    const out = buildSuggestedNextCalls(req);
    expect(out.length).toBeGreaterThan(0);
    expect(out.length).toBeLessThanOrEqual(3);
    for (const s of out) {
      expect(typeof s.url).toBe('string');
      expect(s.url.startsWith('https://tensorfeed.ai/api/')).toBe(true);
      expect(['GET', 'POST']).toContain(s.method);
      expect(typeof s.why).toBe('string');
      expect(typeof s.credits).toBe('number');
    }
  });

  it('inherits date param into clusters suggestion when present', () => {
    const req = new Request('https://tensorfeed.ai/api/premium/news/decision-verified?cluster_id=abc&date=2026-05-12');
    const out = buildSuggestedNextCalls(req);
    const clusterSugg = out.find((s) => s.url.includes('/api/history/news/clusters'));
    expect(clusterSugg).toBeDefined();
    expect(clusterSugg!.url).toContain('date=2026-05-12');
  });

  it('falls back to discovery surfaces for unmapped endpoints', () => {
    const req = new Request('https://tensorfeed.ai/api/premium/some-unknown-endpoint');
    const out = buildSuggestedNextCalls(req);
    expect(out.length).toBe(FALLBACK_SUGGESTIONS.length);
    expect(out.some((s) => s.url.endsWith('/api/meta'))).toBe(true);
    expect(out.some((s) => s.url.endsWith('/api/free-tier/status'))).toBe(true);
  });

  it('substitutes CVE id in verified-CVE suggestions', () => {
    const req = new Request('https://tensorfeed.ai/api/premium/security/verified/CVE-2024-3094');
    const out = buildSuggestedNextCalls(req);
    expect(out.some((s) => s.url === 'https://tensorfeed.ai/api/security/cve/CVE-2024-3094')).toBe(true);
    expect(out.some((s) => s.url === 'https://tensorfeed.ai/api/security/kev/CVE-2024-3094')).toBe(true);
  });
});
