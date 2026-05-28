import { describe, it, expect } from 'vitest';
import { buildBenchmarkTrust, type BenchmarkTrustVerdict } from './premium-benchmark-trust';
import { BENCHMARK_REGISTRY } from './benchmark-registry';

const NO_SCORES = null;

function find(verdicts: BenchmarkTrustVerdict[], id: string): BenchmarkTrustVerdict | undefined {
  return verdicts.find((v) => v.id === id);
}

describe('buildBenchmarkTrust', () => {
  it('flags HumanEval as contaminated with a low trust score', () => {
    const r = buildBenchmarkTrust(BENCHMARK_REGISTRY, NO_SCORES, {});
    const he = find(r.verdicts, 'humaneval');
    expect(he).toBeDefined();
    expect(he!.trust_band).toBe('contaminated'); // high contamination risk
    expect(he!.trust_score).toBeLessThan(40);
    expect(he!.recommendation).toContain('Down-weight');
  });

  it("rates Humanity's Last Exam reliable (low contamination, active, lots of headroom)", () => {
    const r = buildBenchmarkTrust(BENCHMARK_REGISTRY, NO_SCORES, {});
    const hle = find(r.verdicts, 'hle');
    expect(hle).toBeDefined();
    expect(hle!.trust_band).toBe('reliable');
    expect(hle!.trust_score).toBeGreaterThanOrEqual(80);
    expect(hle!.signals.ceiling_proximity).toBe('headroom');
  });

  it('narrows to a single benchmark by id', () => {
    const r = buildBenchmarkTrust(BENCHMARK_REGISTRY, NO_SCORES, { benchmark: 'hle' });
    expect(r.count).toBe(1);
    expect(r.verdicts[0].id).toBe('hle');
  });

  it('filters by category', () => {
    const r = buildBenchmarkTrust(BENCHMARK_REGISTRY, NO_SCORES, { category: 'code' });
    expect(r.count).toBeGreaterThan(0);
    expect(r.verdicts.every((v) => v.category === 'code')).toBe(true);
  });

  it('computes frontier compression when the top model scores are bunched', () => {
    const bunched = {
      lastUpdated: '2026-05-28T08:00:00Z',
      models: [
        { model: 'A', provider: 'x', scores: { swe_bench: 75 } },
        { model: 'B', provider: 'y', scores: { swe_bench: 74 } },
        { model: 'C', provider: 'z', scores: { swe_bench: 73 } },
      ],
    };
    const r = buildBenchmarkTrust(BENCHMARK_REGISTRY, bunched, { benchmark: 'swe-bench-verified' });
    const swe = r.verdicts[0];
    expect(swe.id).toBe('swe-bench-verified');
    expect(swe.signals.frontier_compression).toBe('compressed');
    expect(swe.signals.top_score_spread).toBe(2);
    expect(swe.signals.models_scored).toBe(3);
    expect(r.capturedAt).toBe('2026-05-28T08:00:00Z');
  });

  it('marks compression unknown when there are no model scores', () => {
    const r = buildBenchmarkTrust(BENCHMARK_REGISTRY, NO_SCORES, { benchmark: 'swe-bench-verified' });
    expect(r.verdicts[0].signals.frontier_compression).toBe('unknown');
    expect(r.verdicts[0].signals.top_score_spread).toBeNull();
  });

  it('sorts least-trustworthy first (the actionable down-weights)', () => {
    const r = buildBenchmarkTrust(BENCHMARK_REGISTRY, NO_SCORES, {});
    for (let i = 1; i < r.verdicts.length; i++) {
      expect(r.verdicts[i].trust_score).toBeGreaterThanOrEqual(r.verdicts[i - 1].trust_score);
    }
  });

  it('emits zero em dashes and zero double hyphens', () => {
    const r = buildBenchmarkTrust(BENCHMARK_REGISTRY, NO_SCORES, {});
    const json = JSON.stringify(r);
    expect(json).not.toContain('—');
    expect(json.includes('--')).toBe(false);
  });
});
