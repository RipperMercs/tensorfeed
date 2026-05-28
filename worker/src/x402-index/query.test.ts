import { describe, it, expect, vi } from 'vitest';
import { getSummary, getLeaderboard, getRecent, getPublishers, getPublisherReceipts, getSeries } from './query';
import { kvKeyDayRollup, KV_KEY_RECENT, KV_KEY_PUBLISHERS, kvKeyPublisher, kvKeyPubDayRollup } from './constants';
import type { SettlementEvent } from './types';

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

describe('getLeaderboard', () => {
  it('aggregates per-publisher across window, sorts, computes shares', async () => {
    const kv = mockKv();
    const env = { TENSORFEED_CACHE: kv } as unknown as import('../types').Env;
    const now = new Date('2026-05-27T00:00:00.000Z');

    kv.store.set(kvKeyDayRollup('2026-05-27'), JSON.stringify({
      date: '2026-05-27', volume_usdc: '3.0', count: 30,
      top_publishers: [
        { domain: 'tensorfeed.ai', volume_usdc: '2.0', count: 20 },
        { domain: 'terminalfeed.io', volume_usdc: '1.0', count: 10 },
      ],
    }));
    kv.store.set(kvKeyDayRollup('2026-05-26'), JSON.stringify({
      date: '2026-05-26', volume_usdc: '1.0', count: 5,
      top_publishers: [
        { domain: 'tensorfeed.ai', volume_usdc: '1.0', count: 5 },
      ],
    }));

    const result = await getLeaderboard(env, '7d', 10, now);

    expect(result.leaders[0]).toMatchObject({
      rank: 1,
      domain: 'tensorfeed.ai',
      volume_usdc: '3.000000',
      count: 25,
    });
    expect(result.leaders[1]).toMatchObject({
      rank: 2,
      domain: 'terminalfeed.io',
      volume_usdc: '1.000000',
      count: 10,
    });
    expect(result.leaders[0].share_pct).toBe(75);
    expect(result.leaders[1].share_pct).toBe(25);
  });

  it('clamps limit to max 25', async () => {
    const kv = mockKv();
    const env = { TENSORFEED_CACHE: kv } as unknown as import('../types').Env;
    const result = await getLeaderboard(env, '24h', 999, new Date('2026-05-27T00:00:00.000Z'));
    expect(result.leaders.length).toBeLessThanOrEqual(25);
  });
});

describe('getRecent', () => {
  it('returns up to N most recent events with base explorer URLs', async () => {
    const kv = mockKv();
    const env = { TENSORFEED_CACHE: kv } as unknown as import('../types').Env;
    const ev: SettlementEvent = {
      tx_hash: '0xabc', block: 1, ts: '2026-05-27T00:00:00.000Z',
      from_address: '0xfff', to_address: '0xttt', amount_usdc: '0.02',
      publisher_domain: 'tensorfeed.ai', asset: 'USDC', chain: 'base',
    };
    kv.store.set(KV_KEY_RECENT, JSON.stringify([ev, ev, ev]));

    const result = await getRecent(env, 2);
    expect(result.events.length).toBe(2);
    expect(result.events[0].base_explorer_url).toBe('https://basescan.org/tx/0xabc');
  });

  it('clamps limit to max 50', async () => {
    const kv = mockKv();
    const env = { TENSORFEED_CACHE: kv } as unknown as import('../types').Env;
    kv.store.set(KV_KEY_RECENT, JSON.stringify(Array(100).fill({
      tx_hash: '0xa', block: 1, ts: '2026-05-27T00:00:00.000Z',
      from_address: '0xf', to_address: '0xt', amount_usdc: '0.02',
      publisher_domain: 'x.com', asset: 'USDC', chain: 'base',
    })));
    const result = await getRecent(env, 999);
    expect(result.events.length).toBe(50);
  });

  it('returns empty events when KV has no recent data', async () => {
    const kv = mockKv();
    const env = { TENSORFEED_CACHE: kv } as unknown as import('../types').Env;
    const result = await getRecent(env, 10);
    expect(result.events).toEqual([]);
    expect(result.count).toBe(0);
  });
});

describe('getPublishers', () => {
  it('lists publishers with their wallets and totals from KV', async () => {
    const kv = mockKv();
    const env = { TENSORFEED_CACHE: kv } as unknown as import('../types').Env;
    kv.store.set(KV_KEY_PUBLISHERS, JSON.stringify({
      '0xaaa': 'tensorfeed.ai',
      '0xbbb': 'terminalfeed.io',
    }));
    kv.store.set(kvKeyPublisher('tensorfeed.ai'), JSON.stringify({
      domain: 'tensorfeed.ai',
      manifest_url: 'https://tensorfeed.ai/.well-known/x402.json',
      pay_to_wallets: ['0xaaa'],
      first_seen: '2026-05-01T00:00:00.000Z',
      last_crawled: '2026-05-27T00:00:00.000Z',
      last_crawl_error: null,
      last_event_at: '2026-05-27T11:00:00.000Z',
    }));
    kv.store.set(kvKeyPublisher('terminalfeed.io'), JSON.stringify({
      domain: 'terminalfeed.io',
      manifest_url: 'https://terminalfeed.io/.well-known/x402.json',
      pay_to_wallets: ['0xbbb'],
      first_seen: '2026-05-10T00:00:00.000Z',
      last_crawled: '2026-05-27T00:00:00.000Z',
      last_crawl_error: null,
      last_event_at: null,
    }));

    const result = await getPublishers(env);
    expect(result.count).toBe(2);
    expect(result.publishers.find((p) => p.domain === 'tensorfeed.ai')).toMatchObject({
      pay_to_wallets: ['0xaaa'],
      last_event_at: '2026-05-27T11:00:00.000Z',
    });
  });
});
