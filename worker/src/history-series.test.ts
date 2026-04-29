/**
 * Pure-logic unit tests for the premium history-series module.
 *
 * No network, no Cloudflare Workers runtime. KV is stubbed with an
 * in-memory Map fake seeded with synthetic daily snapshots.
 */

import { describe, it, expect } from 'vitest';
import {
  resolveRange,
  getPricingSeries,
  getBenchmarkSeries,
  getStatusUptime,
  MAX_RANGE_DAYS,
  DEFAULT_RANGE_DAYS,
} from './history-series';
import type { Env } from './types';

// ── Mock infrastructure ─────────────────────────────────────────────

interface MockKV {
  get: (key: string, type?: string) => Promise<unknown>;
  put: (key: string, value: string) => Promise<void>;
  delete: () => Promise<void>;
  list: () => Promise<{ keys: { name: string }[] }>;
}

function makeKV(initial: Record<string, unknown>): MockKV {
  const store = new Map<string, unknown>(Object.entries(initial));
  return {
    get: async (key: string) => store.get(key) ?? null,
    put: async (key: string, value: string) => {
      try {
        store.set(key, JSON.parse(value));
      } catch {
        store.set(key, value);
      }
    },
    delete: async () => undefined,
    list: async () => ({
      keys: Array.from(store.keys()).map(name => ({ name })),
    }),
  };
}

function makeEnv(seed: Record<string, unknown>): Env {
  const cache = makeKV(seed);
  const status = makeKV({});
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

// ── Snapshot builders ───────────────────────────────────────────────

function pricingSnapshot(
  date: string,
  models: { id: string; name: string; provider: string; inputPrice: number; outputPrice: number }[],
) {
  // group by provider
  const byProvider = new Map<
    string,
    { id: string; name: string; models: { id: string; name: string; inputPrice: number; outputPrice: number; contextWindow: number }[] }
  >();
  for (const m of models) {
    const existing = byProvider.get(m.provider) || {
      id: m.provider.toLowerCase(),
      name: m.provider,
      models: [],
    };
    existing.models.push({
      id: m.id,
      name: m.name,
      inputPrice: m.inputPrice,
      outputPrice: m.outputPrice,
      contextWindow: 200_000,
    });
    byProvider.set(m.provider, existing);
  }
  return {
    date,
    type: 'models',
    capturedAt: `${date}T07:00:00.000Z`,
    data: {
      lastUpdated: date,
      providers: Array.from(byProvider.values()),
    },
  };
}

function benchmarkSnapshot(date: string, models: { model: string; provider: string; scores: Record<string, number> }[]) {
  return {
    date,
    type: 'benchmarks',
    capturedAt: `${date}T07:00:00.000Z`,
    data: {
      lastUpdated: date,
      models,
    },
  };
}

function statusSnapshot(
  date: string,
  services: { name: string; provider: string; status: 'operational' | 'degraded' | 'down' | 'unknown' }[],
) {
  return {
    date,
    type: 'status',
    capturedAt: `${date}T07:00:00.000Z`,
    data: services,
  };
}

// ── resolveRange ────────────────────────────────────────────────────

describe('resolveRange', () => {
  it('defaults to the last DEFAULT_RANGE_DAYS ending today', () => {
    const r = resolveRange(undefined, undefined);
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    // Span should equal DEFAULT_RANGE_DAYS - 1 (inclusive)
    const fromMs = new Date(`${r.from}T00:00:00Z`).getTime();
    const toMs = new Date(`${r.to}T00:00:00Z`).getTime();
    const days = Math.round((toMs - fromMs) / (1000 * 60 * 60 * 24)) + 1;
    expect(days).toBe(DEFAULT_RANGE_DAYS);
  });

  it('rejects malformed dates', () => {
    expect(resolveRange('2026/04/01', '2026-04-10').ok).toBe(false);
    expect(resolveRange('2026-04-01', 'tomorrow').ok).toBe(false);
  });

  it('rejects from after to', () => {
    const r = resolveRange('2026-04-10', '2026-04-01');
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.error).toBe('from_after_to');
  });

  it('rejects ranges over MAX_RANGE_DAYS', () => {
    const r = resolveRange('2026-01-01', '2026-12-31');
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.error).toContain(String(MAX_RANGE_DAYS));
  });

  it('accepts exactly MAX_RANGE_DAYS', () => {
    // 90-day inclusive window: from + 89 days = to
    const from = '2026-01-01';
    const d = new Date('2026-01-01T00:00:00Z');
    d.setUTCDate(d.getUTCDate() + (MAX_RANGE_DAYS - 1));
    const to = d.toISOString().slice(0, 10);
    expect(resolveRange(from, to).ok).toBe(true);
  });
});

// ── getPricingSeries ────────────────────────────────────────────────

describe('getPricingSeries', () => {
  it('extracts a model price across days and computes deltas', async () => {
    const env = makeEnv({
      'history:2026-04-25:models': pricingSnapshot('2026-04-25', [
        { id: 'opus-4-7', name: 'Opus 4.7', provider: 'Anthropic', inputPrice: 15, outputPrice: 75 },
      ]),
      'history:2026-04-26:models': pricingSnapshot('2026-04-26', [
        { id: 'opus-4-7', name: 'Opus 4.7', provider: 'Anthropic', inputPrice: 15, outputPrice: 75 },
      ]),
      'history:2026-04-27:models': pricingSnapshot('2026-04-27', [
        { id: 'opus-4-7', name: 'Opus 4.7', provider: 'Anthropic', inputPrice: 12, outputPrice: 60 },
      ]),
    });

    const result = await getPricingSeries(env, 'Opus 4.7', '2026-04-25', '2026-04-27');
    expect(result.ok).toBe(true);
    expect(result.points).toHaveLength(3);
    expect(result.provider).toBe('Anthropic');
    expect(result.summary.changes_detected).toBe(1);
    expect(result.summary.first?.blended).toBe(45);
    expect(result.summary.latest?.blended).toBe(36);
    expect(result.summary.delta_pct_blended).toBeCloseTo(-20, 4);
    expect(result.summary.days_with_data).toBe(3);
    expect(result.summary.days_missing).toBe(0);
  });

  it('matches by model id case-insensitively', async () => {
    const env = makeEnv({
      'history:2026-04-27:models': pricingSnapshot('2026-04-27', [
        { id: 'opus-4-7', name: 'Opus 4.7', provider: 'Anthropic', inputPrice: 12, outputPrice: 60 },
      ]),
    });
    const result = await getPricingSeries(env, 'OPUS-4-7', '2026-04-27', '2026-04-27');
    expect(result.points).toHaveLength(1);
  });

  it('counts missing days when snapshots are gappy', async () => {
    const env = makeEnv({
      'history:2026-04-25:models': pricingSnapshot('2026-04-25', [
        { id: 'opus-4-7', name: 'Opus 4.7', provider: 'Anthropic', inputPrice: 15, outputPrice: 75 },
      ]),
      // 2026-04-26 missing entirely
      'history:2026-04-27:models': pricingSnapshot('2026-04-27', [
        { id: 'opus-4-7', name: 'Opus 4.7', provider: 'Anthropic', inputPrice: 12, outputPrice: 60 },
      ]),
    });
    const result = await getPricingSeries(env, 'opus-4-7', '2026-04-25', '2026-04-27');
    expect(result.summary.days_with_data).toBe(2);
    expect(result.summary.days_missing).toBe(1);
  });

  it('returns empty points and null summary when no data', async () => {
    const env = makeEnv({});
    const result = await getPricingSeries(env, 'phantom-model', '2026-04-25', '2026-04-27');
    expect(result.points).toHaveLength(0);
    expect(result.summary.first).toBeNull();
    expect(result.summary.delta_pct_blended).toBeNull();
    expect(result.summary.days_missing).toBe(3);
  });
});

// ── getBenchmarkSeries ──────────────────────────────────────────────

describe('getBenchmarkSeries', () => {
  it('tracks a single benchmark score over time', async () => {
    const env = makeEnv({
      'history:2026-04-25:benchmarks': benchmarkSnapshot('2026-04-25', [
        { model: 'Opus 4.7', provider: 'Anthropic', scores: { swe_bench: 70.0, mmlu_pro: 88.0 } },
      ]),
      'history:2026-04-26:benchmarks': benchmarkSnapshot('2026-04-26', [
        { model: 'Opus 4.7', provider: 'Anthropic', scores: { swe_bench: 72.0, mmlu_pro: 88.0 } },
      ]),
      'history:2026-04-27:benchmarks': benchmarkSnapshot('2026-04-27', [
        { model: 'Opus 4.7', provider: 'Anthropic', scores: { swe_bench: 73.4, mmlu_pro: 88.5 } },
      ]),
    });

    const result = await getBenchmarkSeries(env, 'Opus 4.7', 'swe_bench', '2026-04-25', '2026-04-27');
    expect(result.points.map(p => p.score)).toEqual([70.0, 72.0, 73.4]);
    expect(result.summary.delta_pp).toBeCloseTo(3.4, 4);
    expect(result.summary.min_score).toBe(70.0);
    expect(result.summary.max_score).toBe(73.4);
  });

  it('handles benchmark name case-insensitively', async () => {
    const env = makeEnv({
      'history:2026-04-27:benchmarks': benchmarkSnapshot('2026-04-27', [
        { model: 'Opus 4.7', provider: 'Anthropic', scores: { SWE_Bench: 73.4 } },
      ]),
    });
    const result = await getBenchmarkSeries(env, 'opus 4.7', 'swe_bench', '2026-04-27', '2026-04-27');
    expect(result.points).toHaveLength(1);
    expect(result.points[0].score).toBe(73.4);
  });

  it('skips days where the benchmark is absent', async () => {
    const env = makeEnv({
      'history:2026-04-25:benchmarks': benchmarkSnapshot('2026-04-25', [
        { model: 'Opus 4.7', provider: 'Anthropic', scores: { mmlu_pro: 88.0 } },
      ]),
      'history:2026-04-26:benchmarks': benchmarkSnapshot('2026-04-26', [
        { model: 'Opus 4.7', provider: 'Anthropic', scores: { swe_bench: 72.0 } },
      ]),
    });
    const result = await getBenchmarkSeries(env, 'Opus 4.7', 'swe_bench', '2026-04-25', '2026-04-26');
    expect(result.points).toHaveLength(1);
    expect(result.summary.days_missing).toBe(1);
  });
});

// ── getStatusUptime ─────────────────────────────────────────────────

describe('getStatusUptime', () => {
  it('computes uptime % treating degraded as half-credit', async () => {
    const env = makeEnv({
      'history:2026-04-25:status': statusSnapshot('2026-04-25', [
        { name: 'Anthropic', provider: 'anthropic', status: 'operational' },
      ]),
      'history:2026-04-26:status': statusSnapshot('2026-04-26', [
        { name: 'Anthropic', provider: 'anthropic', status: 'degraded' },
      ]),
      'history:2026-04-27:status': statusSnapshot('2026-04-27', [
        { name: 'Anthropic', provider: 'anthropic', status: 'down' },
      ]),
    });

    const result = await getStatusUptime(env, 'anthropic', '2026-04-25', '2026-04-27');
    expect(result.days_operational).toBe(1);
    expect(result.days_degraded).toBe(1);
    expect(result.days_down).toBe(1);
    // (1 + 0.5 + 0) / 3 * 100 = 50
    expect(result.uptime_pct).toBeCloseTo(50, 4);
    expect(result.incident_days).toHaveLength(2);
  });

  it('excludes missing-data days from the uptime denominator', async () => {
    const env = makeEnv({
      'history:2026-04-25:status': statusSnapshot('2026-04-25', [
        { name: 'Anthropic', provider: 'anthropic', status: 'operational' },
      ]),
      // 2026-04-26 missing
      'history:2026-04-27:status': statusSnapshot('2026-04-27', [
        { name: 'Anthropic', provider: 'anthropic', status: 'operational' },
      ]),
    });
    const result = await getStatusUptime(env, 'anthropic', '2026-04-25', '2026-04-27');
    expect(result.days_total).toBe(3);
    expect(result.days_with_data).toBe(2);
    expect(result.days_missing).toBe(1);
    expect(result.uptime_pct).toBe(100);
  });

  it('returns null uptime when no data exists', async () => {
    const env = makeEnv({});
    const result = await getStatusUptime(env, 'anthropic', '2026-04-25', '2026-04-27');
    expect(result.uptime_pct).toBeNull();
  });
});

