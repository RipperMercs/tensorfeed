import { describe, it, expect } from 'vitest';
import {
  recordPollCycle,
  readCounterRange,
  enumerateDates,
  sumCountersByProvider,
  DayCounterMap,
} from './status-counters';
import type { Env } from './types';

interface MockKV {
  get: (key: string, type?: string) => Promise<unknown>;
  put: (key: string, value: string, opts?: unknown) => Promise<void>;
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
    put: async (key, value) => {
      store.set(key, value);
    },
  };
  return { kv, store };
}

function makeEnv(kv: MockKV): Env {
  return { TENSORFEED_STATUS: kv as unknown as Env['TENSORFEED_STATUS'] } as Env;
}

describe('enumerateDates', () => {
  it('returns inclusive list of UTC dates', () => {
    expect(enumerateDates('2026-05-01', '2026-05-04')).toEqual([
      '2026-05-01',
      '2026-05-02',
      '2026-05-03',
      '2026-05-04',
    ]);
  });

  it('returns single date when from==to', () => {
    expect(enumerateDates('2026-05-04', '2026-05-04')).toEqual(['2026-05-04']);
  });

  it('returns empty array for inverted range', () => {
    expect(enumerateDates('2026-05-04', '2026-05-01')).toEqual([]);
  });

  it('returns empty array for invalid input', () => {
    expect(enumerateDates('not-a-date', '2026-05-01')).toEqual([]);
  });
});

describe('recordPollCycle', () => {
  const NOW = new Date('2026-05-04T12:00:00Z');

  it('initializes today key with correct increments on first call', async () => {
    const { kv, store } = makeMockKv();
    const env = makeEnv(kv);
    await recordPollCycle(
      env,
      [
        { name: 'Claude API', status: 'operational' },
        { name: 'OpenAI API', status: 'degraded' },
      ],
      NOW,
    );
    const stored = JSON.parse(store.get('daycount:2026-05-04')!) as DayCounterMap;
    expect(stored['Claude API']).toEqual({
      polls: 1,
      operational: 1,
      degraded: 0,
      down: 0,
      unknown: 0,
    });
    expect(stored['OpenAI API']).toEqual({
      polls: 1,
      operational: 0,
      degraded: 1,
      down: 0,
      unknown: 0,
    });
  });

  it('accumulates across multiple cycles in the same day', async () => {
    const { kv, store } = makeMockKv();
    const env = makeEnv(kv);
    for (let i = 0; i < 5; i++) {
      await recordPollCycle(
        env,
        [{ name: 'Claude API', status: 'operational' }],
        NOW,
      );
    }
    await recordPollCycle(env, [{ name: 'Claude API', status: 'down' }], NOW);
    const stored = JSON.parse(store.get('daycount:2026-05-04')!) as DayCounterMap;
    expect(stored['Claude API']).toEqual({
      polls: 6,
      operational: 5,
      degraded: 0,
      down: 1,
      unknown: 0,
    });
  });

  it('handles unknown status without breaking the polls counter', async () => {
    const { kv, store } = makeMockKv();
    const env = makeEnv(kv);
    await recordPollCycle(env, [{ name: 'Claude API', status: 'unknown' }], NOW);
    const stored = JSON.parse(store.get('daycount:2026-05-04')!) as DayCounterMap;
    expect(stored['Claude API']).toEqual({
      polls: 1,
      operational: 0,
      degraded: 0,
      down: 0,
      unknown: 1,
    });
  });

  it('starts new providers from zero (no penalty for being added mid-day)', async () => {
    const seed = {
      'daycount:2026-05-04': JSON.stringify({
        'Claude API': { polls: 100, operational: 100, degraded: 0, down: 0, unknown: 0 },
      }),
    };
    const { kv, store } = makeMockKv(seed);
    const env = makeEnv(kv);
    await recordPollCycle(
      env,
      [
        { name: 'Claude API', status: 'operational' },
        { name: 'NewProvider', status: 'operational' },
      ],
      NOW,
    );
    const stored = JSON.parse(store.get('daycount:2026-05-04')!) as DayCounterMap;
    expect(stored['Claude API'].polls).toBe(101);
    expect(stored['NewProvider'].polls).toBe(1);
    expect(stored['NewProvider'].operational).toBe(1);
  });

  it('keys per UTC day, not local time', async () => {
    const { kv, store } = makeMockKv();
    const env = makeEnv(kv);
    // 23:30 PST is 07:30 UTC the next day
    await recordPollCycle(
      env,
      [{ name: 'X', status: 'operational' }],
      new Date('2026-05-04T23:30:00Z'),
    );
    expect(store.has('daycount:2026-05-04')).toBe(true);
    expect(store.has('daycount:2026-05-03')).toBe(false);
  });
});

describe('readCounterRange', () => {
  it('returns null for missing days, parsed object for present ones', async () => {
    const seed = {
      'daycount:2026-05-02': JSON.stringify({
        Claude: { polls: 720, operational: 720, degraded: 0, down: 0, unknown: 0 },
      }),
      'daycount:2026-05-04': JSON.stringify({
        Claude: { polls: 360, operational: 350, degraded: 5, down: 5, unknown: 0 },
      }),
    };
    const { kv } = makeMockKv(seed);
    const env = makeEnv(kv);
    const result = await readCounterRange(env, '2026-05-01', '2026-05-04');
    expect(result.map((r) => r.date)).toEqual([
      '2026-05-01',
      '2026-05-02',
      '2026-05-03',
      '2026-05-04',
    ]);
    expect(result[0].counters).toBeNull();
    expect(result[1].counters?.Claude.polls).toBe(720);
    expect(result[2].counters).toBeNull();
    expect(result[3].counters?.Claude.down).toBe(5);
  });
});

describe('sumCountersByProvider', () => {
  it('aggregates across days, ignoring null days', () => {
    const result = sumCountersByProvider([
      { date: '2026-05-01', counters: null },
      {
        date: '2026-05-02',
        counters: {
          A: { polls: 100, operational: 95, degraded: 3, down: 2, unknown: 0 },
          B: { polls: 100, operational: 100, degraded: 0, down: 0, unknown: 0 },
        },
      },
      {
        date: '2026-05-03',
        counters: {
          A: { polls: 200, operational: 190, degraded: 5, down: 5, unknown: 0 },
        },
      },
    ]);
    expect(result.A).toEqual({ polls: 300, operational: 285, degraded: 8, down: 7, unknown: 0 });
    expect(result.B).toEqual({ polls: 100, operational: 100, degraded: 0, down: 0, unknown: 0 });
  });
});
