/**
 * Pure-logic unit tests for the routing engine.
 *
 * No network, no Cloudflare Workers runtime. KV namespaces are stubbed
 * with in-memory Map fakes. The goal is to lock in:
 *   - Correct ranking given known pricing/benchmark/status data
 *   - Cost normalization across the candidate set
 *   - Quality scoring is task-aware (code task weights HumanEval and
 *     SWE-bench higher than general)
 *   - Filters (budget, min_quality) shrink the candidate set
 *   - Custom weights actually shift the ordering
 *   - Availability score reflects per-provider status
 *   - Score components stay in [0, 1] and weights normalize to 1
 *
 * Run from the worker/ directory:
 *   npm install   # pulls vitest the first time
 *   npm test
 */

import { describe, it, expect } from 'vitest';
import { computeRouting, hoursUntilUTCRollover } from './routing';
import type { Env } from './types';

// ── Mock infrastructure ───────────────────────────────────────────

interface MockKVStore {
  get: (key: string, type?: string) => Promise<unknown>;
  put: () => Promise<void>;
  delete: () => Promise<void>;
  list: () => Promise<{ keys: { name: string }[] }>;
}

function makeKV(initial: Record<string, unknown>): MockKVStore {
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
}): Env {
  const cache = makeKV({
    ...(opts.pricing !== undefined ? { models: opts.pricing } : {}),
    ...(opts.benchmarks !== undefined ? { benchmarks: opts.benchmarks } : {}),
  });
  const status = makeKV(
    opts.services !== undefined ? { services: opts.services } : {},
  );
  const news = makeKV({});

  return {
    TENSORFEED_NEWS: news as unknown as KVNamespace,
    TENSORFEED_STATUS: status as unknown as KVNamespace,
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

// ── Sample data ───────────────────────────────────────────────────

const SAMPLE_PRICING = {
  lastUpdated: '2026-04-27',
  providers: [
    {
      id: 'anthropic',
      name: 'Anthropic',
      models: [
        {
          id: 'claude-opus-4-7',
          name: 'Claude Opus 4.7',
          inputPrice: 15,
          outputPrice: 75,
          contextWindow: 1000000,
          released: '2026-04',
          capabilities: ['text', 'vision', 'tool-use', 'code'],
          tier: 'flagship',
        },
        {
          id: 'claude-haiku-4-5',
          name: 'Claude Haiku 4.5',
          inputPrice: 0.8,
          outputPrice: 4,
          contextWindow: 200000,
          released: '2025-06',
          capabilities: ['text', 'vision', 'tool-use', 'code'],
          tier: 'budget',
        },
      ],
    },
    {
      id: 'openai',
      name: 'OpenAI',
      models: [
        {
          id: 'gpt-4o',
          name: 'GPT-4o',
          inputPrice: 2.5,
          outputPrice: 10,
          contextWindow: 128000,
          released: '2024-05',
          capabilities: ['text', 'vision', 'tool-use', 'code'],
          tier: 'flagship',
        },
      ],
    },
  ],
};

const SAMPLE_BENCHMARKS = {
  lastUpdated: '2026-04-27',
  benchmarks: [
    { id: 'mmlu_pro', name: 'MMLU-Pro', description: '', maxScore: 100 },
    { id: 'human_eval', name: 'HumanEval', description: '', maxScore: 100 },
    { id: 'gpqa_diamond', name: 'GPQA Diamond', description: '', maxScore: 100 },
    { id: 'math', name: 'MATH', description: '', maxScore: 100 },
    { id: 'swe_bench', name: 'SWE-bench', description: '', maxScore: 100 },
  ],
  models: [
    {
      model: 'Claude Opus 4.7',
      provider: 'Anthropic',
      released: '2026-04',
      scores: { mmlu_pro: 93.8, human_eval: 96.2, gpqa_diamond: 76.5, math: 93.1, swe_bench: 65.4 },
    },
    {
      model: 'Claude Haiku 4.5',
      provider: 'Anthropic',
      released: '2026-01',
      scores: { mmlu_pro: 82.1, human_eval: 86.3, gpqa_diamond: 52.4, math: 74.6, swe_bench: 41.2 },
    },
    {
      model: 'GPT-4o',
      provider: 'OpenAI',
      released: '2025-05',
      scores: { mmlu_pro: 87.2, human_eval: 90.2, gpqa_diamond: 59.1, math: 81.3, swe_bench: 48.5 },
    },
  ],
};

const ALL_OPERATIONAL = [
  {
    name: 'Anthropic API',
    provider: 'Anthropic',
    status: 'operational',
    statusPageUrl: '',
    components: [],
    lastChecked: '2026-04-27T20:00:00Z',
  },
  {
    name: 'OpenAI API',
    provider: 'OpenAI',
    status: 'operational',
    statusPageUrl: '',
    components: [],
    lastChecked: '2026-04-27T20:00:00Z',
  },
];

const ANTHROPIC_DOWN = [
  {
    name: 'Anthropic API',
    provider: 'Anthropic',
    status: 'down',
    statusPageUrl: '',
    components: [],
    lastChecked: '2026-04-27T20:00:00Z',
  },
  {
    name: 'OpenAI API',
    provider: 'OpenAI',
    status: 'operational',
    statusPageUrl: '',
    components: [],
    lastChecked: '2026-04-27T20:00:00Z',
  },
];

// ── Tests ────────────────────────────────────────────────────────

describe('computeRouting', () => {
  it('returns recommendations for code task with all 3 candidate models', async () => {
    const env = makeEnv({
      pricing: SAMPLE_PRICING,
      benchmarks: SAMPLE_BENCHMARKS,
      services: ALL_OPERATIONAL,
    });
    const result = await computeRouting(env, { task: 'code', topN: 5 });
    expect(result.ok).toBe(true);
    expect(result.task).toBe('code');
    expect(result.recommendations.length).toBe(3);
    expect(result.recommendations.map(r => r.rank)).toEqual([1, 2, 3]);
    const scores = result.recommendations.map(r => r.composite_score);
    expect(scores[0]).toBeGreaterThanOrEqual(scores[1]);
    expect(scores[1]).toBeGreaterThanOrEqual(scores[2]);
  });

  it('cost score normalizes across candidate set: cheapest=1.0, most expensive=0.0', async () => {
    const env = makeEnv({
      pricing: SAMPLE_PRICING,
      benchmarks: SAMPLE_BENCHMARKS,
      services: ALL_OPERATIONAL,
    });
    const result = await computeRouting(env, { task: 'general', topN: 3 });
    const haiku = result.recommendations.find(r => r.model.id === 'claude-haiku-4-5');
    const opus = result.recommendations.find(r => r.model.id === 'claude-opus-4-7');
    expect(haiku?.components.cost).toBe(1);
    expect(opus?.components.cost).toBe(0);
  });

  it('quality score is task-aware (code weights HumanEval and SWE-bench)', async () => {
    const env = makeEnv({
      pricing: SAMPLE_PRICING,
      benchmarks: SAMPLE_BENCHMARKS,
      services: ALL_OPERATIONAL,
    });
    const codeResult = await computeRouting(env, { task: 'code', topN: 3 });
    const opusCode = codeResult.recommendations.find(r => r.model.id === 'claude-opus-4-7');
    expect(opusCode).toBeDefined();
    // Opus has HumanEval=96.2, SWE-bench=65.4, MMLU-Pro=93.8
    // Code task weights: 0.4 HumanEval + 0.4 SWE-bench + 0.2 MMLU-Pro
    // Expected quality ~= 0.4*0.962 + 0.4*0.654 + 0.2*0.938 = 0.835
    expect(opusCode!.components.quality).toBeGreaterThan(0.8);
    expect(opusCode!.components.quality).toBeLessThan(0.9);
  });

  it('budget filter excludes models above the price cap', async () => {
    const env = makeEnv({
      pricing: SAMPLE_PRICING,
      benchmarks: SAMPLE_BENCHMARKS,
      services: ALL_OPERATIONAL,
    });
    // Blended prices: Opus=45, GPT-4o=6.25, Haiku=2.4
    // Budget 5 should exclude Opus and GPT-4o
    const result = await computeRouting(env, { task: 'general', budget: 5, topN: 5 });
    expect(result.recommendations.length).toBe(1);
    expect(result.recommendations[0].model.id).toBe('claude-haiku-4-5');
    expect(result.filters_applied.budget).toBe(5);
  });

  it('min_quality filter excludes weak models', async () => {
    const env = makeEnv({
      pricing: SAMPLE_PRICING,
      benchmarks: SAMPLE_BENCHMARKS,
      services: ALL_OPERATIONAL,
    });
    // General-task quality: Opus ~0.860, GPT-4o ~0.751, Haiku ~0.694
    const result = await computeRouting(env, {
      task: 'general',
      minQuality: 0.8,
      topN: 5,
    });
    expect(result.recommendations.length).toBe(1);
    expect(result.recommendations[0].model.id).toBe('claude-opus-4-7');
    expect(result.filters_applied.min_quality).toBe(0.8);
  });

  it('custom weights bias the ordering (cost-only weights pick the cheapest)', async () => {
    const env = makeEnv({
      pricing: SAMPLE_PRICING,
      benchmarks: SAMPLE_BENCHMARKS,
      services: ALL_OPERATIONAL,
    });
    const result = await computeRouting(env, {
      task: 'general',
      weights: { quality: 0, availability: 0, cost: 1, latency: 0 },
      topN: 1,
    });
    expect(result.recommendations[0].model.id).toBe('claude-haiku-4-5');
  });

  it('availability reflects per-provider status (down provider scores 0)', async () => {
    const env = makeEnv({
      pricing: SAMPLE_PRICING,
      benchmarks: SAMPLE_BENCHMARKS,
      services: ANTHROPIC_DOWN,
    });
    const result = await computeRouting(env, { task: 'general', topN: 3 });
    const anthropicModels = result.recommendations.filter(r => r.model.provider === 'anthropic');
    const openaiModels = result.recommendations.filter(r => r.model.provider === 'openai');
    expect(anthropicModels.length).toBeGreaterThan(0);
    expect(openaiModels.length).toBeGreaterThan(0);
    for (const m of anthropicModels) expect(m.components.availability).toBe(0);
    for (const m of openaiModels) expect(m.components.availability).toBe(1);
  });

  it('returns empty recommendations and a note when no models match filters', async () => {
    const env = makeEnv({
      pricing: SAMPLE_PRICING,
      benchmarks: SAMPLE_BENCHMARKS,
      services: ALL_OPERATIONAL,
    });
    const result = await computeRouting(env, { budget: 0.001 });
    expect(result.recommendations).toEqual([]);
    expect(result.notes.some(n => n.includes('no models match'))).toBe(true);
  });

  it('skips models without benchmark data', async () => {
    const env = makeEnv({
      pricing: SAMPLE_PRICING,
      benchmarks: { lastUpdated: '2026-04-27', models: [] },
      services: ALL_OPERATIONAL,
    });
    const result = await computeRouting(env, { task: 'general' });
    expect(result.recommendations).toEqual([]);
  });

  it('clamps topN to [1, 10]', async () => {
    const env = makeEnv({
      pricing: SAMPLE_PRICING,
      benchmarks: SAMPLE_BENCHMARKS,
      services: ALL_OPERATIONAL,
    });
    const huge = await computeRouting(env, { topN: 999 });
    expect(huge.recommendations.length).toBeLessThanOrEqual(10);
    const zero = await computeRouting(env, { topN: 0 });
    expect(zero.recommendations.length).toBeGreaterThanOrEqual(1);
  });

  it('weights normalize to sum 1', async () => {
    const env = makeEnv({
      pricing: SAMPLE_PRICING,
      benchmarks: SAMPLE_BENCHMARKS,
      services: ALL_OPERATIONAL,
    });
    const result = await computeRouting(env, {
      weights: { quality: 4, availability: 4, cost: 4, latency: 4 },
    });
    const sum =
      result.weights.quality +
      result.weights.availability +
      result.weights.cost +
      result.weights.latency;
    expect(Math.abs(sum - 1)).toBeLessThan(1e-9);
  });

  it('falls back to general task when an invalid task is provided', async () => {
    const env = makeEnv({
      pricing: SAMPLE_PRICING,
      benchmarks: SAMPLE_BENCHMARKS,
      services: ALL_OPERATIONAL,
    });
    // Cast through unknown to bypass the literal-type guard at the call site
    const result = await computeRouting(env, {
      task: 'invalid-task' as unknown as 'general',
    });
    expect(result.task).toBe('general');
  });

  it('exposes data freshness from the source KV records', async () => {
    const env = makeEnv({
      pricing: SAMPLE_PRICING,
      benchmarks: SAMPLE_BENCHMARKS,
      services: ALL_OPERATIONAL,
    });
    const result = await computeRouting(env, { task: 'general' });
    expect(result.data_freshness.pricing).toBe('2026-04-27');
    expect(result.data_freshness.benchmarks).toBe('2026-04-27');
    expect(result.data_freshness.status).toBe('2026-04-27T20:00:00Z');
  });

  it('keeps every score component in [0, 1] and the composite in [0, 1]', async () => {
    const env = makeEnv({
      pricing: SAMPLE_PRICING,
      benchmarks: SAMPLE_BENCHMARKS,
      services: ALL_OPERATIONAL,
    });
    const result = await computeRouting(env, { task: 'reasoning', topN: 3 });
    for (const r of result.recommendations) {
      for (const v of [
        r.components.quality,
        r.components.availability,
        r.components.cost,
        r.components.latency,
        r.composite_score,
      ]) {
        expect(v).toBeGreaterThanOrEqual(0);
        expect(v).toBeLessThanOrEqual(1);
      }
    }
  });
});

describe('hoursUntilUTCRollover', () => {
  it('returns a number in [1, 24]', () => {
    const h = hoursUntilUTCRollover();
    expect(h).toBeGreaterThanOrEqual(1);
    expect(h).toBeLessThanOrEqual(24);
  });
});
