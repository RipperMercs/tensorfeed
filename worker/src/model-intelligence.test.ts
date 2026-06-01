import { describe, expect, it } from 'vitest';
import {
  computeModelIntelligence,
  buildIntelligenceSnapshot,
  enrichModelsWithIntelligence,
  registryMap,
  normalizeId,
  METHODOLOGY_VERSION,
  type IntelligenceSnapshot,
} from './model-intelligence';

const FRONTIER_SCORES = {
  mmlu_pro: 94.2,
  human_eval: 97.1,
  gpqa_diamond: 78.3,
  math: 95.8,
  swe_bench: 68.7,
};

const SPARSE_SCORES = { mmlu_pro: 80 }; // only 1 of 5 general benchmarks

describe('computeModelIntelligence', () => {
  it('produces a 0-100 TFII equal to the general subscore', () => {
    const core = computeModelIntelligence(FRONTIER_SCORES, registryMap());
    expect(core.tfii).toBeGreaterThan(0);
    expect(core.tfii).toBeLessThanOrEqual(100);
    expect(core.tfii).toBe(core.subscores.general);
    expect(core.methodology_version).toBe(METHODOLOGY_VERSION);
  });

  it('reports full coverage for a model scored on all general benchmarks', () => {
    const core = computeModelIntelligence(FRONTIER_SCORES, registryMap());
    expect(core.trust.coverage).toBe(1);
    expect(core.trust.low_coverage).toBe(false);
    expect(core.trust.benchmarks_used).toContain('mmlu_pro');
  });

  it('flags low coverage when most benchmarks are missing', () => {
    const core = computeModelIntelligence(SPARSE_SCORES, registryMap());
    expect(core.trust.coverage).toBeLessThan(0.6);
    expect(core.trust.low_coverage).toBe(true);
  });

  it('returns four named subscores', () => {
    const core = computeModelIntelligence(FRONTIER_SCORES, registryMap());
    expect(Object.keys(core.subscores).sort()).toEqual(['code', 'creative', 'general', 'reasoning']);
  });
});

describe('buildIntelligenceSnapshot', () => {
  const data = {
    lastUpdated: '2026-06-01',
    benchmarks: [],
    models: [
      { model: 'Strong Model', provider: 'A', scores: FRONTIER_SCORES },
      { model: 'Weaker Model', provider: 'B', scores: { mmlu_pro: 70, human_eval: 60, gpqa_diamond: 40, math: 50, swe_bench: 30 } },
      { model: 'Sparse Model', provider: 'C', scores: SPARSE_SCORES },
    ],
  };

  it('ranks adequately-covered models by tfii desc and leaves low-coverage unranked (rank 0)', () => {
    const snap = buildIntelligenceSnapshot(data, '2026-06-01T07:00:00.000Z');
    const strong = snap.models.find(m => m.name === 'Strong Model')!;
    const weak = snap.models.find(m => m.name === 'Weaker Model')!;
    const sparse = snap.models.find(m => m.name === 'Sparse Model')!;
    expect(strong.rank).toBe(1);
    expect(weak.rank).toBe(2);
    expect(sparse.rank).toBe(0);
    expect(strong.tfii).toBeGreaterThan(weak.tfii);
    expect(snap.as_of).toBe('2026-06-01T07:00:00.000Z');
    expect(snap.methodology_version).toBe(METHODOLOGY_VERSION);
  });
});

describe('enrichModelsWithIntelligence', () => {
  it('merges the free headline fields by model name', () => {
    const snap: IntelligenceSnapshot = {
      as_of: '2026-06-01T07:00:00.000Z',
      methodology_version: METHODOLOGY_VERSION,
      models: [
        { model_id: 'gpt-5.5', name: 'GPT-5.5', provider: 'OpenAI', tfii: 90.1, subscores: { code: 1, reasoning: 1, creative: 1, general: 90.1 }, trust: { contamination: 'low', benchmarks_used: [], coverage: 1, low_coverage: false, flagged: [] }, rank: 1, methodology_version: METHODOLOGY_VERSION, as_of: '2026-06-01T07:00:00.000Z' },
      ],
    };
    const pricing = { providers: [{ id: 'openai', name: 'OpenAI', models: [{ id: 'gpt-5.5', name: 'GPT-5.5', inputPrice: 1, outputPrice: 2, contextWindow: 1000 }] }] };
    const out = enrichModelsWithIntelligence(pricing, snap) as typeof pricing & { providers: Array<{ models: Array<{ intelligence?: { tfii: number } }> }> };
    expect(out.providers[0].models[0].intelligence?.tfii).toBe(90.1);
  });

  it('leaves models without a snapshot match unchanged', () => {
    const snap: IntelligenceSnapshot = { as_of: 'x', methodology_version: METHODOLOGY_VERSION, models: [] };
    const pricing = { providers: [{ id: 'p', name: 'P', models: [{ id: 'm', name: 'No Match', inputPrice: 0, outputPrice: 0, contextWindow: 1 }] }] };
    const out = enrichModelsWithIntelligence(pricing, snap) as typeof pricing & { providers: Array<{ models: Array<{ intelligence?: unknown }> }> };
    expect(out.providers[0].models[0].intelligence).toBeUndefined();
  });
});

describe('normalizeId', () => {
  it('lowercases and hyphenates', () => {
    expect(normalizeId('Claude Opus 4.7')).toBe('claude-opus-4.7');
  });
});
