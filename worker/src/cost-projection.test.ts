/**
 * Pure-logic unit tests for cost projection.
 */

import { describe, it, expect } from 'vitest';
import { computeCostProjection } from './cost-projection';
import type { Env } from './types';

interface MockKV {
  get: (key: string, type?: string) => Promise<unknown>;
  put: () => Promise<void>;
  delete: () => Promise<void>;
  list: () => Promise<{ keys: { name: string }[] }>;
}

function makeKV(initial: Record<string, unknown>): MockKV {
  const store = new Map<string, unknown>(Object.entries(initial));
  return {
    get: async (key: string) => store.get(key) ?? null,
    put: async () => undefined,
    delete: async () => undefined,
    list: async () => ({ keys: [] }),
  };
}

function makeEnv(pricing: unknown): Env {
  const cache = makeKV({ models: pricing });
  return {
    TENSORFEED_NEWS: makeKV({}) as unknown as KVNamespace,
    TENSORFEED_STATUS: makeKV({}) as unknown as KVNamespace,
    TENSORFEED_CACHE: cache as unknown as KVNamespace,
    ENVIRONMENT: 'test',
    SITE_URL: 'https://tensorfeed.ai',
    INDEXNOW_KEY: '',
    X_API_KEY: '',
    X_API_SECRET: '',
    X_ACCESS_TOKEN: '',
    X_ACCESS_SECRET: '',
    GITHUB_TOKEN: '',
    RESEND_API_KEY: '',
    ALERT_EMAIL_TO: '',
    ALERT_EMAIL_FROM: '',
    PAYMENT_WALLET: '0x0',
    PAYMENT_ENABLED: 'true',
  };
}

const PRICING = {
  providers: [
    {
      id: 'anthropic',
      name: 'Anthropic',
      models: [
        { id: 'opus-4-7', name: 'Claude Opus 4.7', inputPrice: 15, outputPrice: 75 },
      ],
    },
    {
      id: 'openai',
      name: 'OpenAI',
      models: [{ id: 'gpt-5-5', name: 'GPT-5.5', inputPrice: 10, outputPrice: 30 }],
    },
    {
      id: 'google',
      name: 'Google',
      models: [{ id: 'gemini-3', name: 'Gemini 3', inputPrice: 7, outputPrice: 21 }],
    },
  ],
};

describe('computeCostProjection: math', () => {
  it('computes daily/weekly/monthly/yearly cost from token rates', async () => {
    // 1M input @ $15 = $15. 0.5M output @ $75 = $37.50. Total daily = $52.50.
    const env = makeEnv(PRICING);
    const r = await computeCostProjection(env, {
      models: ['Claude Opus 4.7'],
      inputTokensPerDay: 1_000_000,
      outputTokensPerDay: 500_000,
    });
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    const p = r.projections[0];
    if (!p.matched) throw new Error('expected matched projection');
    expect(p.daily.input_cost).toBe(15);
    expect(p.daily.output_cost).toBe(37.5);
    expect(p.daily.total).toBe(52.5);
    expect(p.weekly_total).toBe(367.5);
    expect(p.monthly_total).toBeCloseTo(1575, 4);
    expect(p.yearly_total).toBeCloseTo(19162.5, 4);
  });

  it('handles zero token volume cleanly', async () => {
    const env = makeEnv(PRICING);
    const r = await computeCostProjection(env, {
      models: ['Claude Opus 4.7'],
      inputTokensPerDay: 0,
      outputTokensPerDay: 0,
    });
    if (!r.ok) return;
    const p = r.projections[0];
    if (!p.matched) throw new Error('expected matched projection');
    expect(p.daily.total).toBe(0);
    expect(p.monthly_total).toBe(0);
  });

  it('matches model id case-insensitively', async () => {
    const env = makeEnv(PRICING);
    const r = await computeCostProjection(env, {
      models: ['OPUS-4-7'],
      inputTokensPerDay: 100_000,
      outputTokensPerDay: 50_000,
    });
    if (!r.ok) return;
    const p = r.projections[0];
    if (!p.matched) throw new Error('expected matched projection');
    expect(p.model).toBe('Claude Opus 4.7');
  });
});

describe('computeCostProjection: ranking', () => {
  it('ranks projections by cheapest monthly cost', async () => {
    const env = makeEnv(PRICING);
    const r = await computeCostProjection(env, {
      models: ['Claude Opus 4.7', 'GPT-5.5', 'Gemini 3'],
      inputTokensPerDay: 1_000_000,
      outputTokensPerDay: 500_000,
    });
    if (!r.ok) return;
    expect(r.ranked_cheapest_monthly[0].model).toBe('Gemini 3');
    expect(r.ranked_cheapest_monthly[1].model).toBe('GPT-5.5');
    expect(r.ranked_cheapest_monthly[2].model).toBe('Claude Opus 4.7');
  });

  it('excludes unmatched models from the ranking', async () => {
    const env = makeEnv(PRICING);
    const r = await computeCostProjection(env, {
      models: ['Claude Opus 4.7', 'phantom-model'],
      inputTokensPerDay: 100_000,
      outputTokensPerDay: 50_000,
    });
    if (!r.ok) return;
    expect(r.projections).toHaveLength(2);
    expect(r.projections[1].matched).toBe(false);
    expect(r.ranked_cheapest_monthly).toHaveLength(1);
    expect(r.ranked_cheapest_monthly[0].model).toBe('Claude Opus 4.7');
  });

  it('returns empty ranking when no models match', async () => {
    const env = makeEnv(PRICING);
    const r = await computeCostProjection(env, {
      models: ['phantom-1', 'phantom-2'],
      inputTokensPerDay: 100_000,
      outputTokensPerDay: 50_000,
    });
    if (!r.ok) return;
    expect(r.ranked_cheapest_monthly).toHaveLength(0);
    expect(r.projections.every(p => !p.matched)).toBe(true);
    expect(r.notes.some(n => n.includes('No requested models matched'))).toBe(true);
  });
});

describe('computeCostProjection: validation', () => {
  it('rejects empty models array', async () => {
    const env = makeEnv(PRICING);
    const r = await computeCostProjection(env, {
      models: [],
      inputTokensPerDay: 100,
      outputTokensPerDay: 100,
    });
    expect(r.ok).toBe(false);
    if (r.ok) return;
    expect(r.error).toBe('models_required');
  });

  it('rejects more than 10 models', async () => {
    const env = makeEnv(PRICING);
    const r = await computeCostProjection(env, {
      models: Array.from({ length: 11 }, (_, i) => `m${i}`),
      inputTokensPerDay: 100,
      outputTokensPerDay: 100,
    });
    expect(r.ok).toBe(false);
    if (r.ok) return;
    expect(r.error).toContain('max');
  });

  it('rejects negative or NaN token counts', async () => {
    const env = makeEnv(PRICING);
    const r1 = await computeCostProjection(env, {
      models: ['x'],
      inputTokensPerDay: -1,
      outputTokensPerDay: 100,
    });
    expect(r1.ok).toBe(false);

    const r2 = await computeCostProjection(env, {
      models: ['x'],
      inputTokensPerDay: NaN,
      outputTokensPerDay: 100,
    });
    expect(r2.ok).toBe(false);
  });

  it('falls back to monthly when horizon is invalid', async () => {
    const env = makeEnv(PRICING);
    const r = await computeCostProjection(env, {
      models: ['Claude Opus 4.7'],
      inputTokensPerDay: 100,
      outputTokensPerDay: 100,
      primaryHorizon: 'fortnightly' as never,
    });
    if (!r.ok) return;
    expect(r.primary_horizon).toBe('monthly');
  });
});
