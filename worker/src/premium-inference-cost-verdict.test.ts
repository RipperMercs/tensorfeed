import { describe, it, expect } from 'vitest';
import { buildInferenceCostVerdict } from './premium-inference-cost-verdict';
import type { ModelMatrix, ProviderOffer } from './inference-providers';

const LAST_UPDATED = '2026-05-24';

function offer(provider: string, inputPrice: number, outputPrice: number, tps: number | null): ProviderOffer {
  return {
    provider,
    providerModelId: `${provider}/model`,
    inputPrice,
    outputPrice,
    blendedPrice: (inputPrice + outputPrice) / 2,
    contextWindow: 128000,
    outputTPS: tps,
    features: [],
    url: 'https://example.com/pricing',
    note: '',
  };
}

const MATRIX: ModelMatrix[] = [
  {
    modelId: 'llama-3.1-70b',
    modelName: 'Llama 3.1 70B',
    family: 'Meta',
    paramsB: 70,
    license: 'Llama 3.1 Community',
    openWeights: true,
    offers: [
      offer('DeepInfra', 0.35, 0.4, 95), // blended 0.375
      offer('Together AI', 0.88, 0.88, 120), // blended 0.88
      offer('Groq', 0.59, 0.79, 250), // blended 0.69
    ],
  },
];

const Q = (over: Partial<Parameters<typeof buildInferenceCostVerdict>[1]> = {}) => ({
  model: 'llama-3.1-70b',
  monthly_tokens: 100_000_000,
  input_tokens: null,
  output_tokens: null,
  current_provider: null,
  ...over,
});

describe('/api/premium/inference/cost-verdict', () => {
  it('picks the cheapest host and ranks all offers by monthly cost', () => {
    const r = buildInferenceCostVerdict(MATRIX, Q(), LAST_UPDATED);
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    expect(r.cheapest.provider).toBe('DeepInfra');
    expect(r.cheapest.monthly_cost_usd).toBe(37.5); // 100M/1M * 0.375
    expect(r.ranked.map((x) => x.provider)).toEqual(['DeepInfra', 'Groq', 'Together AI']);
  });

  it('computes savings vs the current provider', () => {
    const r = buildInferenceCostVerdict(MATRIX, Q({ current_provider: 'Together AI' }), LAST_UPDATED);
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    expect(r.current?.monthly_cost_usd).toBe(88);
    expect(r.savings?.vs_current_usd).toBe(50.5);
    expect(r.savings?.vs_current_pct).toBe(57.4);
  });

  it('honors an exact input/output split', () => {
    const r = buildInferenceCostVerdict(
      MATRIX,
      Q({ monthly_tokens: null, input_tokens: 50_000_000, output_tokens: 50_000_000 }),
      LAST_UPDATED,
    );
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    expect(r.cheapest.monthly_cost_usd).toBe(37.5); // 50*0.35 + 50*0.40
    expect(r.assumptions.blended_5050_split).toBe(false);
  });

  it('flags a throughput tradeoff when the cheapest host is much slower', () => {
    const r = buildInferenceCostVerdict(MATRIX, Q(), LAST_UPDATED);
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    expect(r.fastest?.provider).toBe('Groq');
    expect(r.throughput_note).not.toBeNull(); // DeepInfra 95 tps is >20% slower than Groq 250
  });

  it('matches model id case-insensitively', () => {
    const r = buildInferenceCostVerdict(MATRIX, Q({ model: 'LLAMA-3.1-70B' }), LAST_UPDATED);
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    expect(r.model_id).toBe('llama-3.1-70b');
  });

  it('no-charges (model_not_in_matrix) for an unknown model, returning the vocabulary', () => {
    const r = buildInferenceCostVerdict(MATRIX, Q({ model: 'gpt-5-turbo' }), LAST_UPDATED);
    expect(r.ok).toBe(false);
    if (r.ok) return;
    expect(r.error).toBe('model_not_in_matrix');
    expect(r.available_models).toContain('llama-3.1-70b');
  });

  it('emits no em dashes or double hyphens in any output string', () => {
    const emDash = String.fromCharCode(0x2014);
    const doubleHyphen = '-' + '-';
    const ok = buildInferenceCostVerdict(MATRIX, Q({ current_provider: 'Together AI' }), LAST_UPDATED);
    const empty = buildInferenceCostVerdict(MATRIX, Q({ model: 'nope' }), LAST_UPDATED);
    for (const json of [JSON.stringify(ok), JSON.stringify(empty)]) {
      expect(json.includes(emDash)).toBe(false);
      expect(json.includes(doubleHyphen)).toBe(false);
    }
  });
});
