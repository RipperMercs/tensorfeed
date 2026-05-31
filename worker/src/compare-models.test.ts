/**
 * Pure-logic tests for premium model comparison.
 */

import { describe, it, expect } from 'vitest';
import { compareModels } from './compare-models';
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

function makeEnv(opts: {
  pricing?: unknown;
  benchmarks?: unknown;
  services?: unknown;
  articles?: unknown;
}): Env {
  return {
    TENSORFEED_NEWS: makeKV(opts.articles !== undefined ? { articles: opts.articles } : {}) as unknown as KVNamespace,
    TENSORFEED_STATUS: makeKV(opts.services !== undefined ? { services: opts.services } : {}) as unknown as KVNamespace,
    TENSORFEED_CACHE: makeKV({
      ...(opts.pricing !== undefined ? { models: opts.pricing } : {}),
      ...(opts.benchmarks !== undefined ? { benchmarks: opts.benchmarks } : {}),
    }) as unknown as KVNamespace,
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
  lastUpdated: '2026-04-27',
  providers: [
    {
      id: 'anthropic',
      name: 'Anthropic',
      models: [
        { id: 'opus-4-7', name: 'Claude Opus 4.7', inputPrice: 15, outputPrice: 75, contextWindow: 1_000_000, tier: 'flagship' },
      ],
    },
    {
      id: 'openai',
      name: 'OpenAI',
      models: [{ id: 'gpt-5-5', name: 'GPT-5.5', inputPrice: 10, outputPrice: 30, contextWindow: 256_000, tier: 'flagship' }],
    },
    {
      id: 'google',
      name: 'Google',
      models: [{ id: 'gemini-3', name: 'Gemini 3', inputPrice: 7, outputPrice: 21, contextWindow: 2_000_000, tier: 'flagship' }],
    },
  ],
};

const BENCHMARKS = {
  lastUpdated: '2026-04-27',
  models: [
    { model: 'Claude Opus 4.7', provider: 'Anthropic', scores: { swe_bench: 73.4, mmlu_pro: 88.5 } },
    { model: 'GPT-5.5', provider: 'OpenAI', scores: { swe_bench: 70.0 } },
    // Gemini 3 has no benchmark coverage
  ],
};

const SERVICES = [
  { name: 'Anthropic', provider: 'anthropic', status: 'operational', lastChecked: '2026-04-27T18:00:00Z' },
  { name: 'OpenAI', provider: 'openai', status: 'degraded', lastChecked: '2026-04-27T18:00:00Z' },
  { name: 'Google', provider: 'google', status: 'operational', lastChecked: '2026-04-27T18:00:00Z' },
];

describe('compareModels: validation', () => {
  it('rejects fewer than 2 models', async () => {
    const env = makeEnv({ pricing: PRICING });
    const r = await compareModels(env, { modelKeys: ['opus-4-7'] });
    expect(r.ok).toBe(false);
    if (r.ok) return;
    expect(r.error).toBe('min_two_models_required');
  });

  it('rejects more than 5 models', async () => {
    const env = makeEnv({ pricing: PRICING });
    const r = await compareModels(env, { modelKeys: ['a', 'b', 'c', 'd', 'e', 'f'] });
    expect(r.ok).toBe(false);
    if (r.ok) return;
    expect(r.error).toContain('max_5');
  });

  it('de-duplicates the same model passed twice', async () => {
    const env = makeEnv({ pricing: PRICING, benchmarks: BENCHMARKS, services: SERVICES });
    const r = await compareModels(env, { modelKeys: ['opus-4-7', 'opus-4-7', 'gpt-5-5'] });
    if (!r.ok) return;
    expect(r.models).toHaveLength(2);
  });
});

describe('compareModels: no-data no-charge (audit #17)', () => {
  it('returns ok:false / no_models_matched when none of the ids resolve', async () => {
    const env = makeEnv({ pricing: PRICING, benchmarks: BENCHMARKS, services: SERVICES });
    const r = await compareModels(env, { modelKeys: ['phantom-a', 'phantom-b'] });
    expect(r.ok).toBe(false);
    if (r.ok) return;
    expect(r.error).toBe('no_models_matched');
    expect(r.reason).toBe('no_models_matched');
  });

  it('returns ok:false / no_models_matched when the pricing KV is missing', async () => {
    // No pricing key in KV at all -> pricingRaw is null -> zero matches.
    const env = makeEnv({ benchmarks: BENCHMARKS, services: SERVICES });
    const r = await compareModels(env, { modelKeys: ['opus-4-7', 'gpt-5-5'] });
    expect(r.ok).toBe(false);
    if (r.ok) return;
    expect(r.error).toBe('no_models_matched');
  });

  it('still returns ok when at least one id resolves', async () => {
    const env = makeEnv({ pricing: PRICING, benchmarks: BENCHMARKS, services: SERVICES });
    const r = await compareModels(env, { modelKeys: ['opus-4-7', 'phantom-model'] });
    expect(r.ok).toBe(true);
  });
});

describe('compareModels: data_freshness surfaces pricing capture time (audit #16)', () => {
  it('exposes pricing lastUpdated so the handler can bill staleness against it', async () => {
    const env = makeEnv({ pricing: PRICING, benchmarks: BENCHMARKS, services: SERVICES });
    const r = await compareModels(env, { modelKeys: ['opus-4-7', 'gpt-5-5'] });
    if (!r.ok) return;
    expect(r.data_freshness.pricing).toBe('2026-04-27');
  });
});

describe('compareModels: matched vs unmatched', () => {
  it('returns matched and unmatched entries side by side', async () => {
    const env = makeEnv({ pricing: PRICING, benchmarks: BENCHMARKS, services: SERVICES });
    const r = await compareModels(env, { modelKeys: ['opus-4-7', 'phantom-model'] });
    if (!r.ok) return;
    expect(r.models).toHaveLength(2);
    expect(r.models[0].matched).toBe(true);
    expect(r.models[1].matched).toBe(false);
    if (!r.models[1].matched) {
      expect(r.models[1].reason).toBe('model_not_found');
      expect(r.models[1].query).toBe('phantom-model');
    }
  });

  it('matches by display name case-insensitively', async () => {
    const env = makeEnv({ pricing: PRICING, benchmarks: BENCHMARKS, services: SERVICES });
    const r = await compareModels(env, { modelKeys: ['CLAUDE OPUS 4.7', 'GPT-5.5'] });
    if (!r.ok) return;
    expect(r.models[0].matched).toBe(true);
    if (!r.models[0].matched) return;
    expect(r.models[0].name).toBe('Claude Opus 4.7');
  });
});

describe('compareModels: benchmark normalization', () => {
  it('normalizes benchmarks to a union of keys with null for missing', async () => {
    const env = makeEnv({ pricing: PRICING, benchmarks: BENCHMARKS, services: SERVICES });
    const r = await compareModels(env, { modelKeys: ['opus-4-7', 'gpt-5-5', 'gemini-3'] });
    if (!r.ok) return;
    expect(r.benchmark_keys.sort()).toEqual(['mmlu_pro', 'swe_bench']);

    const opus = r.models[0];
    if (!opus.matched) throw new Error('expected matched');
    expect(opus.benchmarks.swe_bench).toBe(73.4);
    expect(opus.benchmarks.mmlu_pro).toBe(88.5);

    const gpt = r.models[1];
    if (!gpt.matched) throw new Error('expected matched');
    expect(gpt.benchmarks.swe_bench).toBe(70.0);
    // GPT-5.5 has no mmlu_pro score, must be normalized to null not undefined
    expect(gpt.benchmarks.mmlu_pro).toBeNull();

    const gem = r.models[2];
    if (!gem.matched) throw new Error('expected matched');
    // Gemini has no benchmark coverage at all
    expect(gem.benchmarks.swe_bench).toBeNull();
    expect(gem.benchmarks.mmlu_pro).toBeNull();
  });
});

describe('compareModels: rankings', () => {
  it('ranks by cheapest blended price', async () => {
    const env = makeEnv({ pricing: PRICING, benchmarks: BENCHMARKS, services: SERVICES });
    const r = await compareModels(env, { modelKeys: ['opus-4-7', 'gpt-5-5', 'gemini-3'] });
    if (!r.ok) return;
    expect(r.rankings.cheapest_blended[0].name).toBe('Gemini 3');
    expect(r.rankings.cheapest_blended[1].name).toBe('GPT-5.5');
    expect(r.rankings.cheapest_blended[2].name).toBe('Claude Opus 4.7');
  });

  it('ranks by largest context window', async () => {
    const env = makeEnv({ pricing: PRICING, benchmarks: BENCHMARKS, services: SERVICES });
    const r = await compareModels(env, { modelKeys: ['opus-4-7', 'gpt-5-5', 'gemini-3'] });
    if (!r.ok) return;
    expect(r.rankings.most_context[0].name).toBe('Gemini 3');
    expect(r.rankings.most_context[0].context_window).toBe(2_000_000);
    expect(r.rankings.most_context[1].name).toBe('Claude Opus 4.7');
  });

  it('ranks per-benchmark, excluding models without scores for that benchmark', async () => {
    const env = makeEnv({ pricing: PRICING, benchmarks: BENCHMARKS, services: SERVICES });
    const r = await compareModels(env, { modelKeys: ['opus-4-7', 'gpt-5-5', 'gemini-3'] });
    if (!r.ok) return;
    expect(r.rankings.by_benchmark.swe_bench[0].name).toBe('Claude Opus 4.7');
    expect(r.rankings.by_benchmark.swe_bench[1].name).toBe('GPT-5.5');
    // mmlu_pro only has Opus, so the leaderboard has 1 entry
    expect(r.rankings.by_benchmark.mmlu_pro).toHaveLength(1);
    expect(r.rankings.by_benchmark.mmlu_pro[0].name).toBe('Claude Opus 4.7');
  });
});

describe('compareModels: status join', () => {
  it('attaches provider-level status to each matched model', async () => {
    const env = makeEnv({ pricing: PRICING, benchmarks: BENCHMARKS, services: SERVICES });
    const r = await compareModels(env, { modelKeys: ['opus-4-7', 'gpt-5-5'] });
    if (!r.ok) return;
    if (!r.models[0].matched || !r.models[1].matched) return;
    expect(r.models[0].status).toBe('operational');
    expect(r.models[1].status).toBe('degraded');
  });

  it('reports unknown when no status entry matches the provider', async () => {
    const env = makeEnv({ pricing: PRICING, benchmarks: BENCHMARKS, services: [] });
    const r = await compareModels(env, { modelKeys: ['opus-4-7', 'gpt-5-5'] });
    if (!r.ok) return;
    if (!r.models[0].matched) return;
    expect(r.models[0].status).toBe('unknown');
  });
});
