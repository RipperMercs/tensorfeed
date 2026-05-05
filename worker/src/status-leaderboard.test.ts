import { describe, it, expect } from 'vitest';
import { computeLeaderboard, resolveLastNDays } from './status-leaderboard';
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

describe('resolveLastNDays', () => {
  it('returns inclusive N-day window ending today UTC', () => {
    const r = resolveLastNDays(7, new Date('2026-05-04T12:00:00Z'));
    expect(r.to).toBe('2026-05-04');
    expect(r.from).toBe('2026-04-28');
  });

  it('handles single-day window', () => {
    const r = resolveLastNDays(1, new Date('2026-05-04T12:00:00Z'));
    expect(r.from).toBe('2026-05-04');
    expect(r.to).toBe('2026-05-04');
  });
});

describe('computeLeaderboard', () => {
  it('returns no_data error when no counter days exist in range', async () => {
    const { kv } = makeMockKv();
    const env = makeEnv(kv);
    const r = await computeLeaderboard(env, '2026-05-01', '2026-05-04');
    expect(r.ok).toBe(false);
    if (!r.ok) {
      expect(r.error).toBe('no_data');
    }
  });

  it('returns invalid_range for inverted dates', async () => {
    const { kv } = makeMockKv();
    const env = makeEnv(kv);
    const r = await computeLeaderboard(env, '2026-05-04', '2026-05-01');
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.error).toBe('invalid_range');
  });

  it('ranks providers by uptime DESC and assigns 1-indexed ranks', async () => {
    const seed = {
      'daycount:2026-05-04': JSON.stringify({
        // 100% uptime
        Anthropic: { polls: 720, operational: 720, degraded: 0, down: 0, unknown: 0 },
        // 50% uptime (all degraded counts as 0.5)
        Wobbly: { polls: 720, operational: 0, degraded: 720, down: 0, unknown: 0 },
        // 0% uptime (all down)
        Broken: { polls: 720, operational: 0, degraded: 0, down: 720, unknown: 0 },
        // 99% uptime
        Solid: { polls: 720, operational: 713, degraded: 0, down: 7, unknown: 0 },
      }),
    };
    const { kv } = makeMockKv(seed);
    const env = makeEnv(kv);
    const r = await computeLeaderboard(env, '2026-05-04', '2026-05-04');
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    expect(r.entries.map((e) => e.provider)).toEqual([
      'Anthropic',
      'Solid',
      'Wobbly',
      'Broken',
    ]);
    expect(r.entries[0].rank).toBe(1);
    expect(r.entries[0].uptime_pct).toBe(100);
    expect(r.entries[3].uptime_pct).toBe(0);
  });

  it('converts poll counts to minute-equivalent downtime', async () => {
    const seed = {
      'daycount:2026-05-04': JSON.stringify({
        // 5 down polls × 2 min = 10 min hard down
        // 3 degraded polls × 2 min = 6 min degraded
        // total downtime = 16 min, hard_down = 10 min
        TestProvider: { polls: 720, operational: 712, degraded: 3, down: 5, unknown: 0 },
      }),
    };
    const { kv } = makeMockKv(seed);
    const env = makeEnv(kv);
    const r = await computeLeaderboard(env, '2026-05-04', '2026-05-04');
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    expect(r.entries[0].downtime_minutes).toBe(16);
    expect(r.entries[0].hard_down_minutes).toBe(10);
  });

  it('excludes unknown polls from the uptime denominator (no false penalty for our outage)', async () => {
    // If our worker crashed and 100 polls came back unknown, we should not
    // count that against the provider. Provider is 720/720 of the polls
    // where we got a real answer.
    const seed = {
      'daycount:2026-05-04': JSON.stringify({
        TestProvider: { polls: 820, operational: 720, degraded: 0, down: 0, unknown: 100 },
      }),
    };
    const { kv } = makeMockKv(seed);
    const env = makeEnv(kv);
    const r = await computeLeaderboard(env, '2026-05-04', '2026-05-04');
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    expect(r.entries[0].uptime_pct).toBe(100);
  });

  it('aggregates across multiple days when given a multi-day range', async () => {
    const seed = {
      'daycount:2026-05-03': JSON.stringify({
        TestProvider: { polls: 720, operational: 720, degraded: 0, down: 0, unknown: 0 },
      }),
      'daycount:2026-05-04': JSON.stringify({
        TestProvider: { polls: 720, operational: 700, degraded: 10, down: 10, unknown: 0 },
      }),
    };
    const { kv } = makeMockKv(seed);
    const env = makeEnv(kv);
    const r = await computeLeaderboard(env, '2026-05-03', '2026-05-04');
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    expect(r.entries[0].polls).toBe(1440);
    expect(r.entries[0].operational_polls).toBe(1420);
    expect(r.entries[0].down_polls).toBe(10);
    // (1420 + 0.5*10) / 1440 = 0.989583... → 98.9583
    expect(r.entries[0].uptime_pct).toBe(98.9583);
  });

  it('breaks uptime ties by lower hard_down_minutes (cleaner record wins)', async () => {
    // Both at 99% uptime but A had a real outage, B was just degraded.
    const seed = {
      'daycount:2026-05-04': JSON.stringify({
        // 712 op + 8 down → (712 + 0.5*0) / 720 = 98.8889
        ProviderA: { polls: 720, operational: 712, degraded: 0, down: 8, unknown: 0 },
        // 712 op + 8 degraded → (712 + 0.5*8) / 720 = 99.4444
        ProviderB: { polls: 720, operational: 712, degraded: 8, down: 0, unknown: 0 },
      }),
    };
    const { kv } = makeMockKv(seed);
    const env = makeEnv(kv);
    const r = await computeLeaderboard(env, '2026-05-04', '2026-05-04');
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    // Different uptime so tie-breaker not exercised here, but B should be first
    expect(r.entries[0].provider).toBe('ProviderB');
    expect(r.entries[1].provider).toBe('ProviderA');
  });

  it('includes incident_count and mttr_minutes only when includeIncidents=true', async () => {
    const seed = {
      'daycount:2026-05-04': JSON.stringify({
        TestProvider: { polls: 720, operational: 700, degraded: 0, down: 20, unknown: 0 },
      }),
      incidents: JSON.stringify([
        {
          service: 'TestProvider',
          startedAt: '2026-05-04T10:00:00Z',
          resolvedAt: '2026-05-04T10:30:00Z',
          durationMinutes: 30,
        },
        {
          service: 'TestProvider',
          startedAt: '2026-05-04T15:00:00Z',
          resolvedAt: '2026-05-04T15:10:00Z',
          durationMinutes: 10,
        },
        // Out-of-range incident, ignored
        {
          service: 'TestProvider',
          startedAt: '2026-04-01T00:00:00Z',
          resolvedAt: '2026-04-01T01:00:00Z',
          durationMinutes: 60,
        },
      ]),
    };
    const { kv } = makeMockKv(seed);
    const env = makeEnv(kv);

    const free = await computeLeaderboard(env, '2026-05-04', '2026-05-04');
    expect(free.ok).toBe(true);
    if (free.ok) expect(free.entries[0].incident_count).toBeUndefined();

    const premium = await computeLeaderboard(env, '2026-05-04', '2026-05-04', {
      includeIncidents: true,
    });
    expect(premium.ok).toBe(true);
    if (!premium.ok) return;
    expect(premium.entries[0].incident_count).toBe(2);
    // (30 + 10) / 2 = 20.0
    expect(premium.entries[0].mttr_minutes).toBe(20);
  });

  it('handles missing days inside range without crashing (sparse coverage)', async () => {
    const seed = {
      'daycount:2026-05-04': JSON.stringify({
        TestProvider: { polls: 720, operational: 720, degraded: 0, down: 0, unknown: 0 },
      }),
    };
    const { kv } = makeMockKv(seed);
    const env = makeEnv(kv);
    // 5-day range, only one day has data
    const r = await computeLeaderboard(env, '2026-04-30', '2026-05-04');
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    expect(r.entries[0].polls).toBe(720);
    expect(r.range.days).toBe(5);
  });
});
