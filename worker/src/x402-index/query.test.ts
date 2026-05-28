import { describe, it, expect, vi } from 'vitest';
import { getSummary } from './query';
import { kvKeyDayRollup } from './constants';

function mockKv() {
  const store = new Map<string, string>();
  return {
    store,
    get: vi.fn(async (key: string, type?: 'json') => {
      const raw = store.get(key);
      if (raw === undefined) return null;
      return type === 'json' ? JSON.parse(raw) : raw;
    }),
    put: vi.fn(async (key: string, value: string) => {
      store.set(key, value);
    }),
  };
}

describe('getSummary', () => {
  it('aggregates daily rollups across 7d window', async () => {
    const kv = mockKv();
    const env = { TENSORFEED_CACHE: kv } as unknown as import('../types').Env;
    const now = new Date('2026-05-27T00:00:00.000Z');

    kv.store.set(kvKeyDayRollup('2026-05-27'), JSON.stringify({
      date: '2026-05-27', volume_usdc: '1.0', count: 10,
      top_publishers: [{ domain: 'tensorfeed.ai', volume_usdc: '1.0', count: 10 }],
    }));
    kv.store.set(kvKeyDayRollup('2026-05-26'), JSON.stringify({
      date: '2026-05-26', volume_usdc: '2.0', count: 20,
      top_publishers: [{ domain: 'terminalfeed.io', volume_usdc: '2.0', count: 20 }],
    }));

    const result = await getSummary(env, '7d', now);

    expect(result.window).toBe('7d');
    expect(result.volume_usdc).toBe('3.000000');
    expect(result.count).toBe(30);
    expect(result.unique_publishers).toBe(2);
  });

  it('returns zero rollup when no data in window', async () => {
    const kv = mockKv();
    const env = { TENSORFEED_CACHE: kv } as unknown as import('../types').Env;
    const result = await getSummary(env, '24h', new Date('2026-05-27T00:00:00.000Z'));

    expect(result.volume_usdc).toBe('0.000000');
    expect(result.count).toBe(0);
    expect(result.unique_publishers).toBe(0);
    expect(result.change_vs_prior_window.volume_pct).toBe(0);
  });

  it('computes change_vs_prior_window correctly', async () => {
    const kv = mockKv();
    const env = { TENSORFEED_CACHE: kv } as unknown as import('../types').Env;
    const now = new Date('2026-05-27T00:00:00.000Z');

    kv.store.set(kvKeyDayRollup('2026-05-27'), JSON.stringify({
      date: '2026-05-27', volume_usdc: '2.0', count: 10, top_publishers: [],
    }));
    kv.store.set(kvKeyDayRollup('2026-05-26'), JSON.stringify({
      date: '2026-05-26', volume_usdc: '1.0', count: 5, top_publishers: [],
    }));

    const result = await getSummary(env, '24h', now);
    expect(result.change_vs_prior_window.volume_pct).toBe(100);
    expect(result.change_vs_prior_window.count_pct).toBe(100);
  });
});
