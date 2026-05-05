import { describe, it, expect } from 'vitest';
import { getProviderUptimeSeries } from './status-history';
import type { Env } from './types';

interface MockKV {
  get: (key: string, type?: string) => Promise<unknown>;
  put: () => Promise<void>;
}

function makeMockKv(seed: Record<string, string> = {}) {
  const store = new Map<string, string>(Object.entries(seed));
  const kv: MockKV = {
    get: async (key, type) => {
      const raw = store.get(key);
      if (raw === undefined) return null;
      if (type === 'json') return JSON.parse(raw);
      return raw;
    },
    put: async () => {},
  };
  return { kv };
}

function makeEnv(kv: MockKV): Env {
  return { TENSORFEED_STATUS: kv as unknown as Env['TENSORFEED_STATUS'] } as Env;
}

describe('getProviderUptimeSeries', () => {
  it('returns invalid_range for inverted dates', async () => {
    const { kv } = makeMockKv();
    const env = makeEnv(kv);
    const r = await getProviderUptimeSeries(env, 'Claude API', '2026-05-04', '2026-05-01');
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.error).toBe('invalid_range');
  });

  it('returns one zeroed DayPoint per missing day plus null uptime', async () => {
    const { kv } = makeMockKv();
    const env = makeEnv(kv);
    const r = await getProviderUptimeSeries(env, 'Claude API', '2026-05-01', '2026-05-03');
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    expect(r.series).toHaveLength(3);
    expect(r.series.every((d) => d.polls === 0 && d.uptime_pct === null)).toBe(true);
    expect(r.summary.uptime_pct).toBeNull();
  });

  it('returns full daily breakdown when counter data exists', async () => {
    const seed = {
      'daycount:2026-05-02': JSON.stringify({
        'Claude API': { polls: 720, operational: 720, degraded: 0, down: 0, unknown: 0 },
      }),
      'daycount:2026-05-03': JSON.stringify({
        'Claude API': { polls: 720, operational: 700, degraded: 10, down: 10, unknown: 0 },
      }),
    };
    const { kv } = makeMockKv(seed);
    const env = makeEnv(kv);
    const r = await getProviderUptimeSeries(env, 'Claude API', '2026-05-01', '2026-05-03');
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    expect(r.series).toHaveLength(3);
    // Day 1: no data
    expect(r.series[0].polls).toBe(0);
    expect(r.series[0].uptime_pct).toBeNull();
    // Day 2: 100% uptime
    expect(r.series[1].polls).toBe(720);
    expect(r.series[1].uptime_pct).toBe(100);
    // Day 3: (700 + 0.5*10) / 720 = 97.9167
    expect(r.series[2].polls).toBe(720);
    expect(r.series[2].uptime_pct).toBe(97.9167);
  });

  it('summary aggregates across the full range and excludes unknown from denominator', async () => {
    const seed = {
      'daycount:2026-05-04': JSON.stringify({
        // 100 unknown polls (worker outage on our side); 620 decisive operational
        'Claude API': { polls: 720, operational: 620, degraded: 0, down: 0, unknown: 100 },
      }),
    };
    const { kv } = makeMockKv(seed);
    const env = makeEnv(kv);
    const r = await getProviderUptimeSeries(env, 'Claude API', '2026-05-04', '2026-05-04');
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    expect(r.summary.uptime_pct).toBe(100); // 620/620 decisive
    expect(r.summary.unknown_polls).toBe(100);
    expect(r.summary.downtime_minutes).toBe(0);
  });

  it('downtime_minutes counts both degraded and down at 2 min/sample', async () => {
    const seed = {
      'daycount:2026-05-04': JSON.stringify({
        'Claude API': { polls: 720, operational: 700, degraded: 15, down: 5, unknown: 0 },
      }),
    };
    const { kv } = makeMockKv(seed);
    const env = makeEnv(kv);
    const r = await getProviderUptimeSeries(env, 'Claude API', '2026-05-04', '2026-05-04');
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    // (15 + 5) * 2 = 40
    expect(r.summary.downtime_minutes).toBe(40);
    // 5 * 2 = 10
    expect(r.summary.hard_down_minutes).toBe(10);
  });

  it('days_with_data counts only days that have polls > 0', async () => {
    const seed = {
      'daycount:2026-05-02': JSON.stringify({
        'Claude API': { polls: 720, operational: 720, degraded: 0, down: 0, unknown: 0 },
      }),
      'daycount:2026-05-04': JSON.stringify({
        'Claude API': { polls: 360, operational: 360, degraded: 0, down: 0, unknown: 0 },
      }),
    };
    const { kv } = makeMockKv(seed);
    const env = makeEnv(kv);
    const r = await getProviderUptimeSeries(env, 'Claude API', '2026-04-29', '2026-05-04');
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    expect(r.series).toHaveLength(6);
    expect(r.summary.days_with_data).toBe(2);
  });

  it('returns zeroed summary when provider has no counter data anywhere in range', async () => {
    const seed = {
      'daycount:2026-05-04': JSON.stringify({
        'Claude API': { polls: 720, operational: 720, degraded: 0, down: 0, unknown: 0 },
      }),
    };
    const { kv } = makeMockKv(seed);
    const env = makeEnv(kv);
    const r = await getProviderUptimeSeries(env, 'NotMonitored', '2026-05-01', '2026-05-04');
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    expect(r.summary.polls).toBe(0);
    expect(r.summary.uptime_pct).toBeNull();
    expect(r.summary.days_with_data).toBe(0);
  });
});
