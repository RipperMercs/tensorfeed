/**
 * Pure-logic tests for the ai-stack-cves free preview taste.
 *
 * previewAiStackCves shapes the paid AI-stack CVE feed down to counts plus
 * a single top-CVE headline. The leak guards below are load-bearing: the
 * full filtered papers list and the per-CVE remediation detail (version
 * ranges, fixed versions, advisory source URLs) are the paid product and
 * must never escape the taste.
 */

import { describe, it, expect } from 'vitest';
import { previewAiStackCves, type AiStackCvesResponse, type AiStackCvePaper } from './premium-ai-cves';

function paper(over: Partial<AiStackCvePaper>): AiStackCvePaper {
  return {
    cve_ids: ['CVE-2026-0001'],
    affected_products: ['Next.js'],
    affected_version_ranges: ['SECRET-range'],
    fixed_versions: ['SECRET-fix'],
    exploited_in_wild: 'stated_yes',
    severity_label: 'high',
    source_url: 'https://secret.example/advisory',
    tf_ai_category: 'agent-framework',
    severity_rank: 3,
    ...over,
  };
}

function fixtureResponse(papers: AiStackCvePaper[]): AiStackCvesResponse {
  return {
    batch_id: '20260624-120000',
    extracted_at: '2026-06-24T12:00:00Z',
    total: papers.length,
    papers,
    source_license: 'CC BY 4.0',
    source_attribution: 'GitHub Advisory Database',
  };
}

describe('previewAiStackCves (free taste)', () => {
  const full = fixtureResponse([
    paper({ cve_ids: ['CVE-2026-0001'], affected_products: ['Next.js'], severity_label: 'high', severity_rank: 3, tf_ai_category: 'agent-framework', exploited_in_wild: 'stated_yes' }),
    paper({ cve_ids: ['CVE-2026-0002'], affected_products: ['vLLM'], severity_label: 'critical', severity_rank: 4, tf_ai_category: 'inference-stack', exploited_in_wild: 'stated_no' }),
    paper({ cve_ids: ['CVE-2026-0003'], affected_products: ['Chroma'], severity_label: 'medium', severity_rank: 2, tf_ai_category: 'vector-db', exploited_in_wild: 'unstated' }),
  ]);

  it('passes through batch identity and totals, flagged as a preview', () => {
    const p = previewAiStackCves(full);
    expect(p.ok).toBe(true);
    expect(p.preview).toBe(true);
    expect(p.batch_id).toBe('20260624-120000');
    expect(p.extracted_at).toBe('2026-06-24T12:00:00Z');
    expect(p.total).toBe(3);
    expect(p.source_license).toBe('CC BY 4.0');
    expect(p.unlock.full_endpoint).toBe('/api/premium/ai-cves/ai-stack-cves');
  });

  it('computes counts: exploited-in-wild, by severity, and by AI-stack category', () => {
    const p = previewAiStackCves(full);
    expect(p.exploited_in_wild_count).toBe(1);
    expect(p.by_severity).toEqual({ critical: 1, high: 1, medium: 1, low: 0, unstated: 0 });
    expect(p.by_category).toEqual({ 'agent-framework': 1, 'inference-stack': 1, 'vector-db': 1 });
  });

  it('reveals only the single top CVE, reduced to headline fields', () => {
    const p = previewAiStackCves(full);
    expect(p.top_cve).toEqual({
      cve_ids: ['CVE-2026-0001'],
      affected_products: ['Next.js'],
      tf_ai_category: 'agent-framework',
      severity_label: 'high',
      exploited_in_wild: 'stated_yes',
    });
  });

  it('handles the cold-start placeholder (no batch) with a null top CVE', () => {
    const p = previewAiStackCves(fixtureResponse([]));
    expect(p.top_cve).toBeNull();
    expect(p.total).toBe(0);
    expect(p.exploited_in_wild_count).toBe(0);
  });

  it('LEAK GUARD: withholds the papers list and all per-CVE remediation detail', () => {
    const p = previewAiStackCves(full);
    const bag = p as unknown as Record<string, unknown>;
    expect(bag.papers).toBeUndefined();
    const serialized = JSON.stringify(p);
    expect(serialized).not.toContain('SECRET-range'); // affected_version_ranges
    expect(serialized).not.toContain('SECRET-fix'); // fixed_versions
    expect(serialized).not.toContain('secret.example'); // advisory source_url
  });
});
