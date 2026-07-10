import { describe, it, expect } from 'vitest';
import {
  parsePackagesParam,
  buildStackSafetyVerdict,
  parseStrictVersion,
  versionAgainstRange,
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

  it('ecosystem gate: pip package does not match an npm-only same-name advisory', () => {
    const r = buildStackSafetyVerdict(
      [paper({ affected_products: ['onnx'], ecosystems: ['npm'] })],
      [{ ...pkg('onnx', '1.16.0'), ecosystem: 'pip' }],
      NO_KEV,
      TS,
    );
    expect(r.packages[0].verdict).toBe('PASS');
    expect(r.packages[0].matched_cves).toEqual([]);
  });

  it('ecosystem gate: same-ecosystem advisory still matches', () => {
    // Wide range keeps the fixture pin inside it (this test is about the
    // ecosystem gate, not v2 version clearing).
    const r = buildStackSafetyVerdict(
      [paper({ affected_products: ['onnx'], ecosystems: ['pip'], affected_version_ranges: ['< 999.0'] })],
      [{ ...pkg('onnx', '1.16.0'), ecosystem: 'pip' }],
      NO_KEV,
      TS,
    );
    expect(r.packages[0].verdict).toBe('HOLD');
    expect(r.packages[0].matched_cves.length).toBeGreaterThan(0);
  });

  it('ecosystem gate: absent data on either side falls back to name-only matching', () => {
    // Wide ranges keep the fixture pin inside them; this test targets the
    // ecosystem fallback, not v2 version clearing.
    // Paper without ecosystems (pre-sidecar batch) vs ecosystem-tagged package.
    const a = buildStackSafetyVerdict(
      [paper({ affected_products: ['onnx'], affected_version_ranges: ['< 999.0'] })],
      [{ ...pkg('onnx', '1.16.0'), ecosystem: 'pip' }],
      NO_KEV,
      TS,
    );
    expect(a.packages[0].verdict).toBe('HOLD');
    // Ecosystem-tagged paper vs ?packages= query form (no ecosystem).
    const b = buildStackSafetyVerdict(
      [paper({ affected_products: ['onnx'], ecosystems: ['npm'], affected_version_ranges: ['< 999.0'] })],
      [pkg('onnx', '1.16.0')],
      NO_KEV,
      TS,
    );
    expect(b.packages[0].verdict).toBe('HOLD');
    // Empty ecosystems array behaves like absent.
    const c = buildStackSafetyVerdict(
      [paper({ affected_products: ['onnx'], ecosystems: [], affected_version_ranges: ['< 999.0'] })],
      [{ ...pkg('onnx', '1.16.0'), ecosystem: 'pip' }],
      NO_KEV,
      TS,
    );
    expect(c.packages[0].verdict).toBe('HOLD');
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
    // batch_available lets callers distinguish "assessed clean" from
    // "could not assess" (billing policy on this state lives in the handlers).
    expect(r.batch_available).toBe(false);
  });

  it('batch_available is true whenever the batch was readable, even with zero matches', () => {
    const r = buildStackSafetyVerdict([], [pkg('vllm', '0.6.0')], NO_KEV, TS);
    expect(r.batch_available).toBe(true);
  });

  it('does not match a substring-only collision (torch must NOT hit pytorch-lightning)', () => {
    const r = buildStackSafetyVerdict(
      [paper({ affected_products: ['pytorch-lightning'], exploited_in_wild: 'stated_yes', fixed_versions: [] })],
      [pkg('torch', '2.3.0')],
      NO_KEV,
      TS,
    );
    // "torch" is a substring of "pytorch-lightning" but a different package,
    // so the advisory must NOT match and the gate must NOT be BLOCK/HOLD.
    // Under the OLD substring logic this returned a false BLOCK.
    expect(r.packages[0].matched_cves).toHaveLength(0);
    expect(r.packages[0].verdict).not.toBe('BLOCK');
    expect(r.packages[0].verdict).not.toBe('HOLD');
    expect(r.gate).not.toBe('BLOCK');
    expect(r.gate).not.toBe('HOLD');
  });

  it('a real pytorch package DOES still match pytorch-lightning by token (true positive preserved)', () => {
    const r = buildStackSafetyVerdict(
      [paper({ affected_products: ['pytorch-lightning'], tf_ai_category: 'training-stack', affected_version_ranges: ['< 999.0'] })],
      [pkg('pytorch-lightning', '2.1.0')],
      NO_KEV,
      TS,
    );
    expect(r.packages[0].matched_cves).toHaveLength(1);
    expect(r.packages[0].verdict).toBe('HOLD');
  });

  it('does not match a short common-substring name (ai must NOT hit unrelated advisories)', () => {
    const r = buildStackSafetyVerdict(
      [
        paper({ affected_products: ['chromadb'], exploited_in_wild: 'stated_yes', fixed_versions: [] }),
        paper({ affected_products: ['some-ai-gateway thing'], cve_ids: ['CVE-2026-0002'] }),
      ],
      [pkg('ai', '1.0')],
      NO_KEV,
      TS,
    );
    // "ai" substring-hits "chromadb" (no) and is a token only as part of
    // "some-ai-gateway", never standalone, so nothing matches.
    expect(r.packages[0].matched_cves).toHaveLength(0);
    expect(['PASS', 'UNKNOWN']).toContain(r.packages[0].verdict);
    expect(r.gate).not.toBe('BLOCK');
    expect(r.gate).not.toBe('HOLD');
  });

  it('still matches an exact same-name CVE (true positive preserved)', () => {
    const r = buildStackSafetyVerdict(
      [paper({ affected_products: ['vllm'], exploited_in_wild: 'stated_yes', fixed_versions: [] })],
      [pkg('vllm', '0.6.0')],
      NO_KEV,
      TS,
    );
    expect(r.packages[0].verdict).toBe('BLOCK');
    expect(r.packages[0].matched_cves).toHaveLength(1);
  });

  it('matches case- and separator-insensitively (LangChain == langchain, llama_index == llama-index)', () => {
    const r1 = buildStackSafetyVerdict(
      [paper({ affected_products: ['LangChain'], tf_ai_category: 'agent-framework' })],
      [pkg('langchain', '0.3.0')],
      NO_KEV,
      TS,
    );
    expect(r1.packages[0].matched_cves).toHaveLength(1);
    expect(r1.packages[0].verdict).toBe('HOLD');

    const r2 = buildStackSafetyVerdict(
      [paper({ affected_products: ['llama_index'], tf_ai_category: 'agent-framework', affected_version_ranges: ['< 999.0'] })],
      [pkg('llama-index', '0.10.0')],
      NO_KEV,
      TS,
    );
    expect(r2.packages[0].matched_cves).toHaveLength(1);
  });

  it('matches a package token embedded in a longer advisory phrase (PyTorch in "PyTorch Lightning")', () => {
    const r = buildStackSafetyVerdict(
      [paper({ affected_products: ['PyTorch Lightning'], tf_ai_category: 'training-stack', affected_version_ranges: ['< 999.0'] })],
      [pkg('lightning', '2.1.0')],
      NO_KEV,
      TS,
    );
    // "lightning" is a standalone token in "PyTorch Lightning", so it matches;
    // but "pytorch" would also match that phrase, and a bare "torch" would not.
    expect(r.packages[0].matched_cves).toHaveLength(1);
    const rTorch = buildStackSafetyVerdict(
      [paper({ affected_products: ['PyTorch Lightning'], tf_ai_category: 'training-stack' })],
      [pkg('torch', '2.1.0')],
      NO_KEV,
      TS,
    );
    expect(rTorch.packages[0].matched_cves).toHaveLength(0);
  });

  it('matches a scoped npm name against a slash-qualified advisory product', () => {
    const r = buildStackSafetyVerdict(
      [paper({ affected_products: ['@langchain/core'], tf_ai_category: 'agent-framework' })],
      [pkg('@langchain/core', '0.3.1')],
      NO_KEV,
      TS,
    );
    expect(r.packages[0].matched_cves).toHaveLength(1);
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

// === v2: strict version parsing ===
describe('parseStrictVersion', () => {
  it('parses plain numeric dotted versions up to four segments', () => {
    expect(parseStrictVersion('2.4.0')).toEqual([2, 4, 0]);
    expect(parseStrictVersion('0.6')).toEqual([0, 6]);
    expect(parseStrictVersion('10.0.0.365')).toEqual([10, 0, 0, 365]);
    expect(parseStrictVersion('7')).toEqual([7]);
  });

  it('tolerates a single leading v and surrounding whitespace', () => {
    expect(parseStrictVersion('v1.2.3')).toEqual([1, 2, 3]);
    expect(parseStrictVersion(' 2.0.0 ')).toEqual([2, 0, 0]);
  });

  it('rejects anything that is not purely numeric dotted (conservative by design)', () => {
    expect(parseStrictVersion('2.4.0rc1')).toBeNull();
    expect(parseStrictVersion('2.4.0.post1')).toBeNull();
    expect(parseStrictVersion('1.2.3-beta.1')).toBeNull();
    expect(parseStrictVersion('1!2.0')).toBeNull();
    expect(parseStrictVersion('^1.2.3')).toBeNull();
    expect(parseStrictVersion('~2.0')).toBeNull();
    expect(parseStrictVersion('1.2.3.4.5')).toBeNull();
    expect(parseStrictVersion('')).toBeNull();
    expect(parseStrictVersion(null)).toBeNull();
    expect(parseStrictVersion('1..2')).toBeNull();
    expect(parseStrictVersion('.1.2')).toBeNull();
  });
});

// === v2: range clause evaluation ===
describe('versionAgainstRange', () => {
  it('handles < (exclusive upper bound)', () => {
    expect(versionAgainstRange('2.3.3', '< 2.3.4')).toBe('inside');
    expect(versionAgainstRange('2.3.4', '< 2.3.4')).toBe('outside');
    expect(versionAgainstRange('2.4.0', '< 2.3.4')).toBe('outside');
  });

  it('handles >= lower and < upper as a conjunction', () => {
    expect(versionAgainstRange('2.4.1', '>= 2.4.0, < 2.4.3')).toBe('inside');
    expect(versionAgainstRange('2.4.0', '>= 2.4.0, < 2.4.3')).toBe('inside');
    expect(versionAgainstRange('2.4.3', '>= 2.4.0, < 2.4.3')).toBe('outside');
    expect(versionAgainstRange('2.3.9', '>= 2.4.0, < 2.4.3')).toBe('outside');
  });

  it('handles = exact and <= inclusive', () => {
    expect(versionAgainstRange('2.5.0', '= 2.5.0')).toBe('inside');
    expect(versionAgainstRange('2.5.1', '= 2.5.0')).toBe('outside');
    expect(versionAgainstRange('1.0.18', '<= 1.0.18')).toBe('inside');
    expect(versionAgainstRange('1.0.19', '<= 1.0.18')).toBe('outside');
  });

  it('zero-pads segment-count differences on both sides', () => {
    expect(versionAgainstRange('2.4', '>= 2.4.0, < 2.4.3')).toBe('inside');
    expect(versionAgainstRange('2.5.0', '= 2.5')).toBe('inside');
    expect(versionAgainstRange('2.4.0.1', '< 2.4.1')).toBe('inside');
  });

  it('returns unparseable for pre-release bounds, unknown operators, and junk', () => {
    expect(versionAgainstRange('1.0.0', '>= 1.0.0-rc1, < 2.0.0')).toBe('unparseable');
    expect(versionAgainstRange('1.0.0', '~= 1.0')).toBe('unparseable');
    expect(versionAgainstRange('1.0.0', '')).toBe('unparseable');
    expect(versionAgainstRange('1.0.0', 'all versions')).toBe('unparseable');
    expect(versionAgainstRange('1.0.0rc1', '< 2.0.0')).toBe('unparseable');
  });
});

// === v2: version-range intersection in the verdict ===
describe('buildStackSafetyVerdict version intersection (v2)', () => {
  const vllmRange = (over: Partial<FlaggedPaper> = {}) =>
    paper({
      affected_products: ['vllm'],
      affected_version_ranges: ['>= 0.6.0, < 0.6.2'],
      fixed_versions: ['0.6.2'],
      ...over,
    });

  it('PASS when the pinned version is outside every applicable range (the v2 flip)', () => {
    const r = buildStackSafetyVerdict([vllmRange()], [pkg('vllm', '0.6.2')], NO_KEV, TS);
    expect(r.packages[0].verdict).toBe('PASS');
    expect(r.packages[0].matched_cves).toHaveLength(0);
    expect(r.packages[0].version_cleared_count).toBe(1);
    expect(r.packages[0].reason).toContain('0.6.2');
    expect(r.gate).toBe('PASS');
  });

  it('clears an exploited advisory too when the pin is outside the range', () => {
    const r = buildStackSafetyVerdict(
      [vllmRange({ exploited_in_wild: 'stated_yes', fixed_versions: [] })],
      [pkg('vllm', '0.7.0')],
      NO_KEV,
      TS,
    );
    expect(r.packages[0].verdict).toBe('PASS');
    expect(r.packages[0].exploited).toBe(false);
    expect(r.packages[0].version_cleared_count).toBe(1);
  });

  it('HOLD with version_status affected when the pin falls inside the range', () => {
    const r = buildStackSafetyVerdict([vllmRange()], [pkg('vllm', '0.6.1')], NO_KEV, TS);
    expect(r.packages[0].verdict).toBe('HOLD');
    expect(r.packages[0].matched_cves[0].version_status).toBe('affected');
    expect(r.packages[0].version_cleared_count).toBe(0);
  });

  it('keeps the match as unverified when the package is unpinned', () => {
    const r = buildStackSafetyVerdict([vllmRange()], [pkg('vllm', null)], NO_KEV, TS);
    expect(r.packages[0].verdict).toBe('HOLD');
    expect(r.packages[0].matched_cves[0].version_status).toBe('unverified');
  });

  it('still evaluates the union when products and ranges are misaligned (validated vs OSV)', () => {
    // 207 live papers ship misaligned arrays; a 1,892-probe OSV pass over
    // them found zero dangerous clears under union semantics, so they are
    // evaluated rather than parked as unverified.
    const r = buildStackSafetyVerdict(
      [vllmRange({ affected_products: ['vllm', 'vllm-extra'], affected_version_ranges: ['>= 0.6.0, < 0.6.2'] })],
      [pkg('vllm', '9.9.9')],
      NO_KEV,
      TS,
    );
    expect(r.packages[0].verdict).toBe('PASS');
    expect(r.packages[0].version_cleared_count).toBe(1);
  });

  it('keeps the match as unverified when the paper carries no ranges at all', () => {
    const r = buildStackSafetyVerdict(
      [vllmRange({ affected_version_ranges: [] })],
      [pkg('vllm', '9.9.9')],
      NO_KEV,
      TS,
    );
    expect(r.packages[0].verdict).toBe('HOLD');
    expect(r.packages[0].matched_cves[0].version_status).toBe('unverified');
  });

  it('keeps the match as unverified when any applicable range is unparseable', () => {
    const r = buildStackSafetyVerdict(
      [vllmRange({ affected_version_ranges: ['>= 0.6.0-rc1, < 0.6.2'] })],
      [pkg('vllm', '9.9.9')],
      NO_KEV,
      TS,
    );
    expect(r.packages[0].verdict).toBe('HOLD');
    expect(r.packages[0].matched_cves[0].version_status).toBe('unverified');
  });

  it('keeps the match as unverified when the pinned version itself is not strictly parseable', () => {
    const r = buildStackSafetyVerdict([vllmRange()], [pkg('vllm', '0.6.2rc1')], NO_KEV, TS);
    expect(r.packages[0].verdict).toBe('HOLD');
    expect(r.packages[0].matched_cves[0].version_status).toBe('unverified');
  });

  it('evaluates the UNION of all range rows, not just the rows attributed to the package', () => {
    // The extraction rotates multi-branch advisories across sibling package
    // names (OSV harness finding, 2026-07-09), so row attribution cannot be
    // trusted. A sibling row's range MUST keep the match alive: union can
    // only over-hold, never over-clear.
    const multi = paper({
      affected_products: ['tensorflow', 'tensorflow', 'tensorflow-cpu'],
      affected_version_ranges: ['< 2.3.4', '>= 2.4.0, < 2.4.3', '>= 2.5.0, < 2.5.1'],
      fixed_versions: ['2.3.4', '2.4.3', '2.5.1'],
      tf_ai_category: 'training-stack' as AiCategory,
    });
    // tensorflow@2.5.0 is outside both tensorflow-attributed rows, but inside
    // the sibling tensorflow-cpu row: HOLD, not a version-cleared PASS.
    const r = buildStackSafetyVerdict([multi], [pkg('tensorflow', '2.5.0')], NO_KEV, TS);
    expect(r.packages[0].verdict).toBe('HOLD');
    expect(r.packages[0].matched_cves[0].version_status).toBe('affected');
    expect(r.packages[0].version_cleared_count).toBe(0);
    // A pin outside EVERY row of the union still clears.
    const r2 = buildStackSafetyVerdict([multi], [pkg('tensorflow', '2.5.1')], NO_KEV, TS);
    expect(r2.packages[0].verdict).toBe('PASS');
    expect(r2.packages[0].version_cleared_count).toBe(1);
  });

  it('a mix of cleared and affected papers keeps the affected verdict and counts the cleared', () => {
    const cleared = vllmRange({ source_url: 'https://github.com/advisories/GHSA-clear' });
    const affected = vllmRange({
      affected_version_ranges: ['< 1.0.0'],
      cve_ids: ['CVE-2026-0002'],
      source_url: 'https://github.com/advisories/GHSA-hit',
    });
    const r = buildStackSafetyVerdict([cleared, affected], [pkg('vllm', '0.9.0')], NO_KEV, TS);
    expect(r.packages[0].verdict).toBe('HOLD');
    expect(r.packages[0].version_cleared_count).toBe(1);
    expect(r.packages[0].matched_cves).toHaveLength(1);
    expect(r.packages[0].matched_cves[0].cve_id).toBe('CVE-2026-0002');
  });

  it('version-cleared PASS reasons carry no em dashes or double hyphens', () => {
    const r = buildStackSafetyVerdict([vllmRange()], [pkg('vllm', '0.6.2')], NO_KEV, TS);
    const json = JSON.stringify(r);
    expect(json).not.toContain('—');
    expect(json.includes('--')).toBe(false);
  });
});
