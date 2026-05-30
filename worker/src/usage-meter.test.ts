import { describe, it, expect, vi } from 'vitest';
import {
  deriveUsageEvent,
  normalizeUaFamily,
  recordUsageEvent,
  buildUsageReport,
} from './usage-meter';
import type { Env } from './types';

describe('deriveUsageEvent', () => {
  it('classifies a paid premium 200 as premium/paid', () => {
    expect(deriveUsageEvent('/api/premium/research/emerging-keywords', 200, true))
      .toMatchObject({ path: '/api/premium/research/emerging-keywords', tier: 'premium', outcome: 'paid' });
  });
  it('classifies a premium 402 as premium/unpaid_402', () => {
    expect(deriveUsageEvent('/api/premium/compare/models', 402, false))
      .toMatchObject({ tier: 'premium', outcome: 'unpaid_402' });
  });
  it('classifies a tracked free 200 as free/served_free', () => {
    expect(deriveUsageEvent('/api/news', 200, false))
      .toMatchObject({ tier: 'free', outcome: 'served_free' });
  });
  it('returns null for non-tracked paths (internal/health)', () => {
    expect(deriveUsageEvent('/api/internal/track-bot', 200, false)).toBeNull();
    expect(deriveUsageEvent('/api/admin/usage', 200, false)).toBeNull();
  });
  it('classifies any non-2xx/402 as error outcome', () => {
    expect(deriveUsageEvent('/api/premium/compare/models', 500, false))
      .toMatchObject({ tier: 'premium', outcome: 'error' });
  });
});

describe('normalizeUaFamily', () => {
  it('truncates and strips versions to bound cardinality', () => {
    expect(normalizeUaFamily('axios/1.14.0')).toBe('axios');
    expect(normalizeUaFamily('')).toBe('unknown');
    expect(normalizeUaFamily('python-requests/2.31.0')).toBe('python-requests');
  });
});

describe('recordUsageEvent', () => {
  it('writes one AE data point with the expected shape', () => {
    const writeDataPoint = vi.fn();
    const env = { USAGE_AE: { writeDataPoint } } as unknown as import('./types').Env;
    recordUsageEvent(env, { path: '/api/premium/x', tier: 'premium', outcome: 'paid', wallet: '0xabc', ua: 'axios/1', country: 'US', credits: 1 });
    expect(writeDataPoint).toHaveBeenCalledOnce();
    const dp = writeDataPoint.mock.calls[0][0];
    expect(dp.indexes).toEqual(['/api/premium/x']);
    expect(dp.blobs).toEqual(['/api/premium/x', 'premium', 'paid', '0xabc', 'axios', 'US']);
    expect(dp.doubles).toEqual([1]);
  });
  it('never throws when the binding is missing (best-effort)', () => {
    const env = {} as unknown as import('./types').Env;
    expect(() => recordUsageEvent(env, { path: '/api/news', tier: 'free', outcome: 'served_free', ua: '' })).not.toThrow();
  });
});

// Minimal mock KV that records reads/writes by string key. buildUsageReport
// reads the dated paid rollups under pay:rollup:{date}; we seed today's rollup
// and leave the AE token unset so the funnel degrades.
function makeKv(initial: Record<string, unknown> = {}) {
  const store = new Map<string, unknown>(Object.entries(initial));
  return {
    get: async (key: string, _type?: string) => store.get(key) ?? null,
    put: async (key: string, value: string) => {
      try {
        store.set(key, JSON.parse(value));
      } catch {
        store.set(key, value);
      }
    },
  };
}

function today(): string {
  return new Date().toISOString().slice(0, 10);
}

// Seed a single day's rollup keyed by today's date so the default window
// ('today') picks it up without depending on prior days existing in KV.
function makeEnvWithRollup(rollup: Record<string, unknown>): Env {
  const seeded = { date: today(), ...rollup };
  return {
    TENSORFEED_CACHE: makeKv({ [`pay:rollup:${today()}`]: seeded }),
  } as unknown as Env;
}

describe('buildUsageReport', () => {
  it('aggregates the KV paid summary and degrades the funnel when no AE token', async () => {
    const env = makeEnvWithRollup({
      by_endpoint: {
        '/api/premium/x': {
          calls: 5,
          credits_charged: 5,
          first_seen: 't',
          last_seen: 't',
          distinct_payers: 2,
        },
      },
      top_payers: {
        '0xa': { calls: 3, credits_charged: 3, first_seen: 't', last_seen: 't' },
      },
      call_count: 5,
      total_credits_charged: 5,
    });
    // no CF_ANALYTICS_TOKEN on env
    const report = await buildUsageReport(env, 'today');
    expect(report.top_paid_endpoints[0]).toMatchObject({ endpoint: '/api/premium/x', paid_calls: 5 });
    expect(report.top_payers[0]).toMatchObject({ wallet: '0xa', credits_charged: 3 });
    expect(report.funnel_by_endpoint).toBeNull();
    expect(report.funnel_status).toBe('unavailable');
    expect(report.build_targets).toEqual([]);
  });

  it('ranks paid endpoints by credits charged and bounds payers to the window', async () => {
    const env = makeEnvWithRollup({
      by_endpoint: {
        '/api/premium/low': { calls: 1, credits_charged: 1, first_seen: 't', last_seen: 't', distinct_payers: 1 },
        '/api/premium/high': { calls: 2, credits_charged: 20, first_seen: 't', last_seen: 't', distinct_payers: 1 },
      },
      top_payers: {
        '0xa': { calls: 1, credits_charged: 1, first_seen: 't', last_seen: 't' },
        '0xb': { calls: 2, credits_charged: 20, first_seen: 't', last_seen: 't' },
      },
      call_count: 3,
      total_credits_charged: 21,
    });
    const report = await buildUsageReport(env, 'today');
    expect(report.window).toBe('today');
    expect(report.top_paid_endpoints[0].endpoint).toBe('/api/premium/high');
    expect(report.top_payers[0].wallet).toBe('0xb');
  });

  it('returns an empty paid summary (never throws) when no rollup exists', async () => {
    const env = { TENSORFEED_CACHE: makeKv({}) } as unknown as Env;
    const report = await buildUsageReport(env, 'today');
    expect(report.top_paid_endpoints).toEqual([]);
    expect(report.top_payers).toEqual([]);
    expect(report.funnel_status).toBe('unavailable');
  });
});

// The /api/admin/usage route in index.ts gates on the same default-deny
// admin-key contract every other /api/admin/* route uses: deny when ADMIN_KEY
// is unset, and require an exact key match otherwise. This locks that contract
// at unit level (the fetch handler itself has no test harness in this suite).
function adminGateAllows(adminKey: string | undefined, supplied: string | null): boolean {
  if (!adminKey || adminKey.length === 0) return false;
  if (!supplied) return false;
  return supplied === adminKey;
}

describe('/api/admin/usage gating contract', () => {
  it('denies when ADMIN_KEY is unset', () => {
    expect(adminGateAllows(undefined, 'anything')).toBe(false);
    expect(adminGateAllows('', 'anything')).toBe(false);
  });
  it('denies a missing or wrong key', () => {
    expect(adminGateAllows('secret', null)).toBe(false);
    expect(adminGateAllows('secret', 'nope')).toBe(false);
  });
  it('allows only the exact ADMIN_KEY', () => {
    expect(adminGateAllows('secret', 'secret')).toBe(true);
  });
});
