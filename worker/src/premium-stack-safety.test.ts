import { describe, it, expect } from 'vitest';
import {
  parsePackagesParam,
  buildStackSafetyVerdict,
  type PackageInput,
} from './premium-stack-safety';
import type { AiCvesPaper, AiCategory, ExploitedInWild } from './ai-cves-feed';

type FlaggedPaper = AiCvesPaper & { tf_ai_category: AiCategory };

function paper(over: Partial<FlaggedPaper> = {}): FlaggedPaper {
  return {
    cve_ids: ['CVE-2026-0001'],
    affected_products: ['vllm'],
    affected_version_ranges: ['< 0.6.1'],
    fixed_versions: ['0.6.1'],
    exploited_in_wild: 'stated_no' as ExploitedInWild,
    severity_label: 'high',
    source_url: 'https://github.com/advisories/GHSA-test',
    quote_spans: { exploited_in_wild: '', severity_label: '' },
    tf_ai_category: 'inference-stack' as AiCategory,
    ...over,
  };
}

const NO_KEV = new Set<string>();
const TS = '2026-05-28T08:00:00Z';
const pkg = (name: string, version: string | null = null): PackageInput => ({ name, version });

describe('parsePackagesParam', () => {
  it('parses name@version pairs', () => {
    const r = parsePackagesParam('langchain@0.3.27,vllm@0.6.0');
    expect(r.ok).toBe(true);
    if (r.ok) {
      expect(r.packages).toEqual([
        { name: 'langchain', version: '0.3.27' },
        { name: 'vllm', version: '0.6.0' },
      ]);
    }
  });

  it('allows a missing version', () => {
    const r = parsePackagesParam('langchain');
    expect(r.ok).toBe(true);
    if (r.ok) expect(r.packages[0]).toEqual({ name: 'langchain', version: null });
  });

  it('splits a scoped npm name on the last @', () => {
    const r = parsePackagesParam('@langchain/core@0.3.1');
    expect(r.ok).toBe(true);
    if (r.ok) expect(r.packages[0]).toEqual({ name: '@langchain/core', version: '0.3.1' });
  });

  it('rejects empty input', () => {
    expect(parsePackagesParam('').ok).toBe(false);
    expect(parsePackagesParam(null).ok).toBe(false);
  });

  it('rejects more than the cap', () => {
    const many = Array.from({ length: 11 }, (_, i) => `pkg${i}@1.0`).join(',');
    const r = parsePackagesParam(many);
    expect(r).toMatchObject({ ok: false, error: 'too_many_packages' });
  });

  it('rejects an invalid package name', () => {
    const r = parsePackagesParam('bad name!@1.0');
    expect(r).toMatchObject({ ok: false, error: 'invalid_package_name' });
  });
});

describe('buildStackSafetyVerdict', () => {
  it('PASS: in-cohort package with no matching CVE', () => {
    const r = buildStackSafetyVerdict([paper({ affected_products: ['vllm'] })], [pkg('langchain', '0.3.27')], NO_KEV, TS);
    expect(r.packages[0].verdict).toBe('PASS');
    expect(r.packages[0].in_cohort).toBe(true);
    expect(r.gate).toBe('PASS');
    expect(r.extracted_at).toBe(TS);
  });

  it('UNKNOWN: package outside the curated AI-stack cohort', () => {
    const r = buildStackSafetyVerdict([], [pkg('zzz-not-an-ai-pkg', '1.0')], NO_KEV, TS);
    expect(r.packages[0].verdict).toBe('UNKNOWN');
    expect(r.packages[0].in_cohort).toBe(false);
    expect(r.gate).toBe('UNKNOWN');
  });

  it('BLOCK: exploited CVE with no fix listed', () => {
    const r = buildStackSafetyVerdict(
      [paper({ affected_products: ['vllm'], exploited_in_wild: 'stated_yes', fixed_versions: [] })],
      [pkg('vllm', '0.6.0')],
      NO_KEV,
      TS,
    );
    expect(r.packages[0].verdict).toBe('BLOCK');
    expect(r.packages[0].exploited).toBe(true);
    expect(r.packages[0].fix_available).toBe(false);
    expect(r.gate).toBe('BLOCK');
  });

  it('HOLD: exploited CVE but a fix exists (version must be verified)', () => {
    const r = buildStackSafetyVerdict(
      [paper({ affected_products: ['vllm'], exploited_in_wild: 'stated_yes', fixed_versions: ['0.6.1'] })],
      [pkg('vllm', '0.6.0')],
      NO_KEV,
      TS,
    );
    expect(r.packages[0].verdict).toBe('HOLD');
    expect(r.packages[0].exploited).toBe(true);
    expect(r.packages[0].fix_available).toBe(true);
  });

  it('HOLD: known CVE that is not confirmed exploited', () => {
    const r = buildStackSafetyVerdict(
      [paper({ affected_products: ['vllm'], exploited_in_wild: 'stated_no' })],
      [pkg('vllm', '0.6.0')],
      NO_KEV,
      TS,
    );
    expect(r.packages[0].verdict).toBe('HOLD');
    expect(r.packages[0].exploited).toBe(false);
  });

  it('KEV membership marks a CVE exploited even when the advisory says stated_no', () => {
    const r = buildStackSafetyVerdict(
      [paper({ affected_products: ['langchain'], cve_ids: ['CVE-2026-9999'], exploited_in_wild: 'stated_no', fixed_versions: [], tf_ai_category: 'agent-framework' })],
      [pkg('langchain', '0.3.27')],
      new Set(['CVE-2026-9999']),
      TS,
    );
    expect(r.packages[0].matched_cves[0].on_kev).toBe(true);
    expect(r.packages[0].exploited).toBe(true);
    expect(r.packages[0].verdict).toBe('BLOCK'); // exploited (via KEV) + no fix
  });

  it('overall gate is the worst per-package verdict', () => {
    const r = buildStackSafetyVerdict(
      [paper({ affected_products: ['vllm'], exploited_in_wild: 'stated_yes', fixed_versions: [] })],
      [pkg('vllm', '0.6.0'), pkg('langchain', '0.3.27')],
      NO_KEV,
      TS,
    );
    expect(r.gate).toBe('BLOCK');
    expect(r.counts.block).toBe(1);
    expect(r.counts.pass).toBe(1);
  });

  it('UNKNOWN gate when the batch is unavailable', () => {
    const r = buildStackSafetyVerdict(null, [pkg('vllm', '0.6.0'), pkg('langchain')], NO_KEV, null);
    expect(r.gate).toBe('UNKNOWN');
    expect(r.packages.every((p) => p.verdict === 'UNKNOWN')).toBe(true);
    expect(r.notes.some((n) => n.includes('unavailable'))).toBe(true);
  });

  it('emits zero em dashes and zero double hyphens', () => {
    const r = buildStackSafetyVerdict(
      [paper({ affected_products: ['vllm'], exploited_in_wild: 'stated_yes', fixed_versions: [] })],
      [pkg('vllm', '0.6.0')],
      new Set(['CVE-2026-0001']),
      TS,
    );
    const json = JSON.stringify(r);
    expect(json).not.toContain('—');
    expect(json.includes('--')).toBe(false);
  });
});
