import { describe, it, expect } from 'vitest';
import { buildModelFrontier, parseTask, type PricingDataLite } from './premium-models-frontier';
import type { IntelligenceSnapshot, ModelIntelligence } from './model-intelligence';

function mi(model_id: string, name: string, provider: string, general: number, over: Partial<ModelIntelligence['subscores']> = {}): ModelIntelligence {
  return {
    model_id,
    name,
    provider,
    rank: 1,
    as_of: '2026-06-06',
    tfii: general,
    subscores: { code: general, reasoning: general, creative: general, general, ...over },
    trust: { contamination: 'low', benchmarks_used: ['mmlu_pro'], coverage: 1, low_coverage: false, flagged: [] },
    methodology_version: 'tfii-1',
  };
}

function snap(models: ModelIntelligence[]): IntelligenceSnapshot {
  return { as_of: '2026-06-06', methodology_version: 'tfii-1', models };
}

function price(id: string, name: string, blended: number): { id: string; name: string; inputPrice: number; outputPrice: number } {
  return { id, name, inputPrice: blended, outputPrice: blended };
}

function pricing(models: Array<{ id: string; name: string; inputPrice: number; outputPrice: number }>): PricingDataLite {
  return { providers: [{ name: 'All', models }] };
}

// A(90,30) and B(80,5) and D(60,3) are non-dominated; C(80,10) is dominated by B.
const INTEL = snap([
  mi('model-a', 'Model A', 'P', 90),
  mi('model-b', 'Model B', 'P', 80),
  mi('model-c', 'Model C', 'P', 80),
  mi('model-d', 'Model D', 'P', 60),
]);
const PRICING = pricing([
  price('model-a', 'Model A', 30),
  price('model-b', 'Model B', 5),
  price('model-c', 'Model C', 10),
  price('model-d', 'Model D', 3),
]);

describe('parseTask', () => {
  it('defaults to general and validates', () => {
    expect(parseTask(null)).toBe('general');
    expect(parseTask('code')).toBe('code');
    expect(parseTask('nonsense')).toBe('general');
  });
});

describe('/api/premium/models/frontier', () => {
  it('separates the Pareto frontier from dominated models', () => {
    const r = buildModelFrontier(INTEL, PRICING, 'general');
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    expect(r.frontier.map((m) => m.model_id).sort()).toEqual(['model-a', 'model-b', 'model-d']);
    expect(r.dominated.map((m) => m.model_id)).toEqual(['model-c']);
  });

  it('names the dominator of a dominated model', () => {
    const r = buildModelFrontier(INTEL, PRICING, 'general');
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    const c = r.dominated.find((m) => m.model_id === 'model-c');
    expect(c?.dominated_by.model_id).toBe('model-b');
  });

  it('uses the task subscore as the capability axis', () => {
    const intel = snap([
      mi('model-a', 'Model A', 'P', 90, { code: 42 }),
      mi('model-b', 'Model B', 'P', 80, { code: 70 }),
    ]);
    const r = buildModelFrontier(intel, PRICING, 'code');
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    expect(r.capability_metric).toContain('code');
    const a = [...r.frontier, ...r.dominated].find((m) => m.model_id === 'model-a');
    expect(a?.capability).toBe(42);
  });

  it('counts and skips models with no matching price', () => {
    const intel = snap([mi('model-a', 'Model A', 'P', 90), mi('model-b', 'Model B', 'P', 80), mi('ghost', 'Ghost', 'P', 50)]);
    const r = buildModelFrontier(intel, PRICING, 'general');
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    expect(r.counts.unpriced_skipped).toBe(1);
    expect([...r.frontier, ...r.dominated].some((m) => m.model_id === 'ghost')).toBe(false);
  });

  it('no-charges (insufficient_data) with fewer than two priced models', () => {
    const r = buildModelFrontier(snap([mi('model-a', 'Model A', 'P', 90)]), PRICING, 'general');
    expect(r.ok).toBe(false);
    if (r.ok) return;
    expect(r.error).toBe('insufficient_data');
  });

  it('emits no em dashes or double hyphens in any output string', () => {
    const emDash = String.fromCharCode(0x2014);
    const doubleHyphen = '-' + '-';
    const ok = buildModelFrontier(INTEL, PRICING, 'general');
    const empty = buildModelFrontier(snap([mi('only', 'Only', 'P', 50)]), PRICING, 'general');
    for (const json of [JSON.stringify(ok), JSON.stringify(empty)]) {
      expect(json.includes(emDash)).toBe(false);
      expect(json.includes(doubleHyphen)).toBe(false);
    }
  });
});
