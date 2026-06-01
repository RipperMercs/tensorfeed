import { describe, expect, it } from 'vitest';
import { isStrictPremiumPath } from './strict-premium-endpoints';
import { resolveSLA, checkStaleness } from './freshness';
import { resolveDateRange, buildIntelligenceHistory, type IntelligenceSnapshot } from './model-intelligence';

describe('TFII premium gating + freshness', () => {
  it('registers both premium paths as strict-premium', () => {
    expect(isStrictPremiumPath('/api/premium/model-intelligence')).toBe(true);
    expect(isStrictPremiumPath('/api/premium/model-intelligence/history')).toBe(true);
  });

  it('applies a 48h freshness SLA to the breakdown and flags stale data (no-charge path)', () => {
    const sla = resolveSLA('/api/premium/model-intelligence');
    expect(sla?.maxAgeSeconds).toBe(48 * 60 * 60);
    const old = new Date(Date.now() - 72 * 60 * 60 * 1000).toISOString();
    const stale = checkStaleness('/api/premium/model-intelligence', old);
    expect(stale.applies).toBe(true);
    expect(stale.stale).toBe(true);
  });
});

describe('resolveDateRange', () => {
  it('rejects malformed dates and inverted ranges, accepts a valid window', () => {
    expect(resolveDateRange('not-a-date', null).ok).toBe(false);
    expect(resolveDateRange('2026-06-02', '2026-06-01').ok).toBe(false);
    expect(resolveDateRange('2026-01-01', '2026-02-01').ok).toBe(true);
  });
});

describe('buildIntelligenceHistory', () => {
  function fakeEnv(store: Record<string, unknown>) {
    return {
      TENSORFEED_CACHE: {
        get: async (key: string) => store[key] ?? null,
      },
    } as unknown as import('./types').Env;
  }

  it('returns empty points when no snapshots exist (drives no-charge)', async () => {
    const env = fakeEnv({ 'intelligence:snapshot:index': [] });
    const h = await buildIntelligenceHistory(env, 'GPT-5.5', '0000-01-01', '9999-12-31');
    expect(h.points).toHaveLength(0);
  });

  it('extracts a model series across dated snapshots in date order', async () => {
    const snap = (date: string, tfii: number): IntelligenceSnapshot => ({
      as_of: `${date}T07:00:00.000Z`,
      methodology_version: '1.0',
      models: [
        {
          model_id: 'gpt-5.5',
          name: 'GPT-5.5',
          provider: 'OpenAI',
          tfii,
          subscores: { code: 1, reasoning: 1, creative: 1, general: tfii },
          trust: { contamination: 'low', benchmarks_used: [], coverage: 1, low_coverage: false, flagged: [] },
          rank: 1,
          methodology_version: '1.0',
          as_of: `${date}T07:00:00.000Z`,
        },
      ],
    });
    const env = fakeEnv({
      'intelligence:snapshot:index': ['2026-06-02', '2026-06-01'],
      'intelligence:snapshot:2026-06-01': snap('2026-06-01', 90.1),
      'intelligence:snapshot:2026-06-02': snap('2026-06-02', 90.4),
    });
    const h = await buildIntelligenceHistory(env, 'gpt-5.5', '0000-01-01', '9999-12-31');
    expect(h.points).toEqual([
      { date: '2026-06-01', tfii: 90.1, rank: 1 },
      { date: '2026-06-02', tfii: 90.4, rank: 1 },
    ]);
  });
});
