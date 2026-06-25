import { describe, it, expect, vi } from 'vitest';
import {
  deriveUsageEvent,
  normalizeUaFamily,
  recordUsageEvent,
  buildUsageReport,
  isInternalTraffic,
  recordRequestHealth,
  classifyUaFamily,
  deriveRealAgentFunnel,
  reconcileTopPaidEndpoints,
  SLOW_MS,
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
  it('tracks ALL free /api/* feed families, not just a hardcoded few', () => {
    expect(deriveUsageEvent('/api/research/citation-velocity', 200, false)).toMatchObject({ tier: 'free', outcome: 'served_free' });
    expect(deriveUsageEvent('/api/agent-ready/summary.json', 200, false)).toMatchObject({ tier: 'free', outcome: 'served_free' });
    expect(deriveUsageEvent('/api/gpu-pricing', 200, false)).toMatchObject({ tier: 'free' });
  });
  it('still skips ops, health, refresh, and cache paths', () => {
    expect(deriveUsageEvent('/api/ping', 200, false)).toBeNull();
    expect(deriveUsageEvent('/api/refresh', 200, false)).toBeNull();
    expect(deriveUsageEvent('/api/__kv_cache/x', 200, false)).toBeNull();
  });
  it('does not track non-api paths', () => {
    expect(deriveUsageEvent('/llms.txt', 200, false)).toBeNull();
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

describe('isInternalTraffic', () => {
  it('returns true when the header value exactly matches the key', () => {
    expect(isInternalTraffic('s3cret-key', 's3cret-key')).toBe(true);
  });
  it('returns false when the key is set but the header is null', () => {
    expect(isInternalTraffic(null, 's3cret-key')).toBe(false);
  });
  it('returns false when the key is set but the header mismatches', () => {
    expect(isInternalTraffic('wrong', 's3cret-key')).toBe(false);
  });
  it('returns false when the key is undefined even if a header is present', () => {
    expect(isInternalTraffic('anything', undefined)).toBe(false);
    expect(isInternalTraffic(null, undefined)).toBe(false);
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
    expect(dp.blobs).toEqual(['/api/premium/x', 'premium', 'paid', '0xabc', 'axios', 'US', '0']);
    expect(dp.doubles).toEqual([1]);
  });
  it('writes blob7 = 1 when the event is tagged internal', () => {
    const writeDataPoint = vi.fn();
    const env = { USAGE_AE: { writeDataPoint } } as unknown as import('./types').Env;
    recordUsageEvent(env, { path: '/api/premium/x', tier: 'premium', outcome: 'paid', ua: 'axios/1', internal: true });
    const dp = writeDataPoint.mock.calls[0][0];
    expect(dp.blobs[6]).toBe('1');
    // The first 6 blobs keep their order so blob1/blob3 reads are unaffected.
    expect(dp.blobs.slice(0, 6)).toEqual(['/api/premium/x', 'premium', 'paid', '', 'axios', '']);
  });
  it('writes blob7 = 0 when internal is false or absent', () => {
    const writeDataPoint = vi.fn();
    const env = { USAGE_AE: { writeDataPoint } } as unknown as import('./types').Env;
    recordUsageEvent(env, { path: '/api/news', tier: 'free', outcome: 'served_free', ua: '', internal: false });
    expect(writeDataPoint.mock.calls[0][0].blobs[6]).toBe('0');
    recordUsageEvent(env, { path: '/api/news', tier: 'free', outcome: 'served_free', ua: '' });
    expect(writeDataPoint.mock.calls[1][0].blobs[6]).toBe('0');
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
    // no CF_ANALYTICS_TOKEN on env: the funnel degrades, so paid_calls is
    // unknown (null) rather than the inflated rollup count, which becomes
    // logged_calls. distinct_payers stays accurate.
    const report = await buildUsageReport(env, 'today');
    expect(report.top_paid_endpoints[0]).toMatchObject({ endpoint: '/api/premium/x', paid_calls: null, logged_calls: 5, distinct_payers: 2 });
    expect(report.top_payers[0]).toMatchObject({ wallet: '0xa', credits_charged: 3 });
    expect(report.funnel_by_endpoint).toBeNull();
    expect(report.funnel_status).toBe('unavailable');
    expect(report.build_targets).toEqual([]);
  });

  it('ranks paid endpoints by the accurate signal (logged_calls tiebreak when the AE funnel is absent) and bounds payers to the window', async () => {
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

  it('exposes real_agent_funnel and crawler_summary as null when no AE token', async () => {
    const env = makeEnvWithRollup({
      by_endpoint: { '/api/premium/x': { calls: 1, credits_charged: 1, first_seen: 't', last_seen: 't', distinct_payers: 1 } },
      top_payers: {},
    });
    const report = await buildUsageReport(env, 'today');
    expect(report.real_agent_funnel).toBeNull();
    expect(report.crawler_summary).toBeNull();
    // build targets degrade to empty without a funnel to derive from.
    expect(report.build_targets).toEqual([]);
  });
});

describe('reconcileTopPaidEndpoints', () => {
  it('sources paid_calls from the accurate AE funnel and relabels the inflated rollup count as logged_calls', () => {
    // The KV rollup banks the nominal tier cost at log time, before commitPayment
    // decides charge-vs-no-charge, so a free-trial burst inflates the per-endpoint
    // call counter. The AE funnel's `paid` reflects an ACTUAL charge; distinct_payers
    // (settling wallets only) is already accurate. This is the real 2026-05-31 case.
    const byEndpoint = {
      '/api/premium/security/kev/full': {
        calls: 1143, credits_charged: 1143, first_seen: 't', last_seen: 't', distinct_payers: 1,
      },
    };
    const funnel = [
      { endpoint: '/api/premium/security/kev/full', free_hits: 53, unpaid_402: 4873, paid: 1, conversion: 0.0002 },
    ];
    const out = reconcileTopPaidEndpoints(byEndpoint, funnel);
    expect(out[0]).toEqual({
      endpoint: '/api/premium/security/kev/full',
      paid_calls: 1,
      distinct_payers: 1,
      logged_calls: 1143,
      last_seen: 't',
    });
  });

  it('sets paid_calls to null (unknown) when the AE funnel is unavailable, never the inflated rollup count', () => {
    const byEndpoint = {
      '/api/premium/x': { calls: 1143, credits_charged: 1143, first_seen: 't', last_seen: 't', distinct_payers: 1 },
    };
    const out = reconcileTopPaidEndpoints(byEndpoint, null);
    expect(out[0].paid_calls).toBeNull();
    expect(out[0].logged_calls).toBe(1143);
    expect(out[0].distinct_payers).toBe(1);
  });

  it('ranks by accurate paid_calls, not the inflated logged count', () => {
    const byEndpoint = {
      '/api/premium/noise': { calls: 5000, credits_charged: 5000, first_seen: 't', last_seen: 't', distinct_payers: 0 },
      '/api/premium/real': { calls: 8, credits_charged: 8, first_seen: 't', last_seen: 't', distinct_payers: 3 },
    };
    const funnel = [
      { endpoint: '/api/premium/noise', free_hits: 0, unpaid_402: 4999, paid: 0, conversion: 0 },
      { endpoint: '/api/premium/real', free_hits: 0, unpaid_402: 5, paid: 4, conversion: 0.44 },
    ];
    const out = reconcileTopPaidEndpoints(byEndpoint, funnel);
    expect(out[0].endpoint).toBe('/api/premium/real');
    expect(out[1].endpoint).toBe('/api/premium/noise');
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

function fakeAeEnv() {
  const calls: Array<{ indexes: unknown[]; blobs: unknown[]; doubles: unknown[] }> = [];
  const env = { REQUEST_HEALTH_AE: { writeDataPoint: (d: { indexes: unknown[]; blobs: unknown[]; doubles: unknown[] }) => calls.push(d) } } as unknown as import('./types').Env;
  return { env, calls };
}

describe('recordRequestHealth', () => {
  it('writes a datapoint on a 5xx', () => {
    const { env, calls } = fakeAeEnv();
    recordRequestHealth(env, '/api/mcp', 503, 'axios/1.7', 12);
    expect(calls).toHaveLength(1);
    expect(calls[0].indexes).toEqual(['/api/mcp']);
    expect(calls[0].blobs[0]).toBe('503');
    expect(calls[0].blobs[1]).toBe('axios');
    expect(calls[0].doubles).toEqual([12]);
  });

  it('writes a datapoint on a slow 200', () => {
    const { env, calls } = fakeAeEnv();
    recordRequestHealth(env, '/api/news', 200, 'python-requests', SLOW_MS + 1000);
    expect(calls).toHaveLength(1);
    expect(calls[0].doubles).toEqual([SLOW_MS + 1000]);
  });

  it('does not write on a fast 200', () => {
    const { env, calls } = fakeAeEnv();
    recordRequestHealth(env, '/api/status', 200, 'curl', 40);
    expect(calls).toHaveLength(0);
  });

  it('never throws when the binding is absent', () => {
    expect(() => recordRequestHealth({} as import('./types').Env, '/api/x', 500, 'ua', 9999)).not.toThrow();
  });
});

describe('classifyUaFamily', () => {
  it('flags known x402 discovery crawlers and uptime monitors as crawler', () => {
    for (const fam of [
      'carbonmonitor', 'x402station', 'x402-observer', 'mako-pulse-prober',
      'lion-probe', 'dexter-verifier', 'ari-indexer', 'ioi-indexer',
      'mpp32-health', 'nitrograph-healthcheck', 'coinbasebazaardiscovery', 'weftsearchbot',
    ]) {
      expect(classifyUaFamily(fam)).toBe('crawler');
    }
  });
  it('flags self-identifying probe/monitor/indexer families by substring', () => {
    for (const fam of ['acme-probe', 'foo-indexer', 'bar-monitor', 'baz-uptime', 'qux-healthcheck', 'zed-verifier', 'site-discovery', 'net-observer']) {
      expect(classifyUaFamily(fam)).toBe('crawler');
    }
  });
  it('counts generic HTTP libraries and unknown UAs as agent (never hide real demand)', () => {
    // Real paying agents commonly call from these; misclassifying them as
    // crawlers would erase actual buyers from the real-agent funnel.
    for (const fam of ['axios', 'undici', 'python-httpx', 'node', 'go-http-client', 'okhttp', 'curl', 'unknown', 'mozilla', '']) {
      expect(classifyUaFamily(fam)).toBe('agent');
    }
  });
});

describe('deriveRealAgentFunnel', () => {
  const rows = [
    { endpoint: '/api/premium/agents/directory', ua: 'mako-pulse-prober', free_hits: 0, unpaid_402: 1510, paid: 0 },
    { endpoint: '/api/premium/agents/directory', ua: 'carbonmonitor', free_hits: 0, unpaid_402: 1030, paid: 0 },
    { endpoint: '/api/premium/agents/directory', ua: 'axios', free_hits: 0, unpaid_402: 730, paid: 0 },
    { endpoint: '/api/premium/whats-new', ua: 'python-httpx', free_hits: 0, unpaid_402: 50, paid: 10 },
    { endpoint: '/api/premium/whats-new', ua: 'carbonmonitor', free_hits: 0, unpaid_402: 600, paid: 0 },
    { endpoint: '/api/premium/series/x', ua: 'carbonmonitor', free_hits: 0, unpaid_402: 767, paid: 0 },
  ];

  it('builds a per-endpoint funnel counting only non-crawler traffic', () => {
    const { real_agent_funnel } = deriveRealAgentFunnel(rows);
    const dir = real_agent_funnel.find((e) => e.endpoint === '/api/premium/agents/directory');
    const wn = real_agent_funnel.find((e) => e.endpoint === '/api/premium/whats-new');
    expect(dir).toMatchObject({ unpaid_402: 730, paid: 0 });
    expect(dir!.conversion).toBe(0);
    expect(wn).toMatchObject({ unpaid_402: 50, paid: 10 });
    expect(wn!.conversion).toBeCloseTo(10 / 60, 5);
  });

  it('omits endpoints that only ever saw crawler traffic', () => {
    const { real_agent_funnel } = deriveRealAgentFunnel(rows);
    // /api/premium/series/x had only a carbonmonitor row: no real demand at all.
    expect(real_agent_funnel.find((e) => e.endpoint === '/api/premium/series/x')).toBeUndefined();
  });

  it('summarizes crawler share of the 402 funnel and the top crawler families', () => {
    const { crawler_summary } = deriveRealAgentFunnel(rows);
    // total 402 = 1510+1030+730+50+600+767 = 4687; crawler 402 = 1510+1030+600+767 = 3907
    expect(crawler_summary.total_402).toBe(4687);
    expect(crawler_summary.crawler_402).toBe(3907);
    expect(crawler_summary.crawler_share).toBeCloseTo(3907 / 4687, 5);
    // carbonmonitor aggregates across endpoints (1030+600+767=2397) and leads mako (1510).
    expect(crawler_summary.top_crawler_families[0]).toMatchObject({ ua: 'carbonmonitor', unpaid_402: 2397 });
    expect(crawler_summary.top_crawler_families[1]).toMatchObject({ ua: 'mako-pulse-prober', unpaid_402: 1510 });
  });
});
