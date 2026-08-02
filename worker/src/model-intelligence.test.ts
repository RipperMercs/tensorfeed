import { describe, expect, it } from 'vitest';
import {
  computeModelIntelligence,
  buildIntelligenceSnapshot,
  enrichModelsWithIntelligence,
  registryMap,
  normalizeId,
  taskQuality,
  trustForTask,
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
        { model_id: 'gpt-5.5', name: 'GPT-5.5', provider: 'OpenAI', tfii: 90.1, generation: 'v1', subscores: { code: 1, reasoning: 1, creative: 1, general: 90.1 }, trust: { contamination: 'low', benchmarks_used: [], coverage: 1, low_coverage: false, flagged: [] }, rank: 1, methodology_version: METHODOLOGY_VERSION, as_of: '2026-06-01T07:00:00.000Z' },
      ],
    };
    const pricing = { providers: [{ id: 'openai', name: 'OpenAI', models: [{ id: 'gpt-5.5', name: 'GPT-5.5', inputPrice: 1, outputPrice: 2, contextWindow: 1000 }] }] };
    const out = enrichModelsWithIntelligence(pricing, snap) as typeof pricing & { providers: Array<{ models: Array<{ intelligence?: { tfii: number } }> }> };
    expect(out.providers[0].models[0].intelligence?.tfii).toBe(90.1);
  });

  it('publishes tfii null for a low-coverage model instead of a misleading number', () => {
    const snap: IntelligenceSnapshot = {
      as_of: '2026-08-01T07:00:00.000Z',
      methodology_version: METHODOLOGY_VERSION,
      models: [
        {
          model_id: 'claude-opus-5', name: 'Claude Opus 5', provider: 'Anthropic', tfii: 0,
          generation: 'v1', subscores: { code: 0, reasoning: 0, creative: 0, general: 0 },
          trust: { contamination: 'unknown', benchmarks_used: [], coverage: 0, low_coverage: true, flagged: [] },
          rank: 0, methodology_version: METHODOLOGY_VERSION, as_of: '2026-08-01T07:00:00.000Z',
        },
        {
          model_id: 'kimi-k3', name: 'Kimi K3', provider: 'Moonshot AI', tfii: 93.5,
          generation: 'v1', subscores: { code: 0, reasoning: 93.5, creative: 0, general: 93.5 },
          trust: { contamination: 'low', benchmarks_used: ['gpqa_diamond'], coverage: 0.2, low_coverage: true, flagged: [] },
          rank: 0, methodology_version: METHODOLOGY_VERSION, as_of: '2026-08-01T07:00:00.000Z',
        },
      ],
    };
    const pricing = {
      providers: [
        { id: 'anthropic', name: 'Anthropic', models: [{ id: 'claude-opus-5', name: 'Claude Opus 5', inputPrice: 5, outputPrice: 25, contextWindow: 1000000 }] },
        { id: 'moonshot', name: 'Moonshot AI', models: [{ id: 'kimi-k3', name: 'Kimi K3', inputPrice: 1, outputPrice: 3, contextWindow: 256000 }] },
      ],
    };
    const out = enrichModelsWithIntelligence(pricing, snap) as typeof pricing & {
      providers: Array<{ models: Array<{ intelligence?: { tfii: number | null; low_coverage: boolean; coverage: number } }> }>;
    };
    const opus = out.providers[0].models[0];
    const kimi = out.providers[1].models[0];
    // A zero from an unscored flagship and a 93.5 off one benchmark are both
    // absences of data, not verdicts. Neither may ship as a number.
    expect(opus.intelligence?.tfii).toBeNull();
    expect(opus.intelligence?.low_coverage).toBe(true);
    expect(kimi.intelligence?.tfii).toBeNull();
    expect(kimi.intelligence?.coverage).toBe(0.2);
  });

  it('leaves models without a snapshot match unchanged', () => {
    const snap: IntelligenceSnapshot = { as_of: 'x', methodology_version: METHODOLOGY_VERSION, models: [] };
    const pricing = { providers: [{ id: 'p', name: 'P', models: [{ id: 'm', name: 'No Match', inputPrice: 0, outputPrice: 0, contextWindow: 1 }] }] };
    const out = enrichModelsWithIntelligence(pricing, snap) as typeof pricing & { providers: Array<{ models: Array<{ intelligence?: unknown }> }> };
    expect(out.providers[0].models[0].intelligence).toBeUndefined();
  });
});

// Claude Opus 5 carries only the 2026 set. Before methodology 1.1 that meant
// no score at all, because the weights only knew the 2024 benchmarks.
const V2_SCORES = { osworld_2: 70.6, browsecomp: 90.8, frontier_code: 53.4, hle_tools: 64.7 };

describe('benchmark generations (methodology 1.1)', () => {
  it('scores a model that carries only the 2026 benchmark set', () => {
    const core = computeModelIntelligence(V2_SCORES, registryMap());
    expect(core.generation).toBe('v2');
    expect(core.trust.coverage).toBe(1);
    expect(core.trust.low_coverage).toBe(false);
    expect(core.tfii).toBeGreaterThan(0);
  });

  it('keeps the 2024 set on v1', () => {
    const core = computeModelIntelligence(FRONTIER_SCORES, registryMap());
    expect(core.generation).toBe('v1');
    expect(core.trust.low_coverage).toBe(false);
  });

  it('picks the generation the model actually covers, not the newest by default', () => {
    // One legacy benchmark plus the full 2026 set: v2 wins on coverage.
    expect(computeModelIntelligence({ swe_bench: 95.0, ...V2_SCORES }, registryMap()).generation).toBe('v2');
    // A single legacy benchmark and nothing modern stays v1, still unscored.
    const thin = computeModelIntelligence({ gpqa_diamond: 93.5 }, registryMap());
    expect(thin.generation).toBe('v1');
    expect(thin.trust.low_coverage).toBe(true);
  });

  it('ranks within a generation rather than across them', () => {
    const data = {
      lastUpdated: '2026-08-01',
      benchmarks: [],
      models: [
        { model: 'Legacy Strong', provider: 'A', scores: FRONTIER_SCORES },
        { model: 'Legacy Weak', provider: 'B', scores: { mmlu_pro: 70, human_eval: 60, gpqa_diamond: 40, math: 50, swe_bench: 30 } },
        { model: 'Modern', provider: 'C', scores: V2_SCORES },
      ],
    };
    const snap = buildIntelligenceSnapshot(data, '2026-08-01T07:00:00.000Z');
    const byName = (n: string) => snap.models.find(m => m.name === n)!;
    expect(byName('Legacy Strong').rank).toBe(1);
    expect(byName('Legacy Weak').rank).toBe(2);
    // The modern model leads its own generation. It is not slotted into the
    // legacy ordering, because the two composites are not the same measurement.
    expect(byName('Modern').generation).toBe('v2');
    expect(byName('Modern').rank).toBe(1);
  });
});

describe('normalizeId', () => {
  it('lowercases and hyphenates', () => {
    expect(normalizeId('Claude Opus 4.7')).toBe('claude-opus-4.7');
  });
});

describe('shared scoring is the source of truth', () => {
  it('taskQuality and trustForTask are exported and composable for a known fixture', () => {
    const scores = { mmlu_pro: 90, human_eval: 80, swe_bench: 70 };
    const q = taskQuality('code', scores);
    const trust = trustForTask('code', scores, registryMap());
    const discounted = q * trust.multiplier;
    expect(q).toBeGreaterThan(0);
    expect(trust.multiplier).toBeGreaterThan(0);
    expect(trust.multiplier).toBeLessThanOrEqual(1);
    expect(discounted).toBeLessThanOrEqual(q);
  });
});
