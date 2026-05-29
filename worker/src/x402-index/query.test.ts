import { describe, it, expect, vi } from 'vitest';
import { getSummary, getLeaderboard, getRecent, getPublishers, getPublisherReceipts, getSeries, validateRange, MAX_SERIES_RANGE_DAYS } from './query';
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
    list: vi.fn(async ({ prefix }: { prefix: string }) => ({
      keys: Array.from(store.keys())
        .filter((k) => k.startsWith(prefix))
        .map((name) => ({ name })),
      list_complete: true,
    })),
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
  it('lists publishers with their wallets and totals from KV via list prefix', async () => {
    const kv = mockKv();
    const env = { TENSORFEED_CACHE: kv } as unknown as import('../types').Env;
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

  it('surfaces errored publishers too (last_crawl_error not null), not just successful crawls', async () => {
    const kv = mockKv();
    const env = { TENSORFEED_CACHE: kv } as unknown as import('../types').Env;

    // Successful publisher (also lives in the wallet map).
    kv.store.set(KV_KEY_PUBLISHERS, JSON.stringify({ '0xaaa': 'tensorfeed.ai' }));
    kv.store.set(kvKeyPublisher('tensorfeed.ai'), JSON.stringify({
      domain: 'tensorfeed.ai',
      manifest_url: 'https://tensorfeed.ai/.well-known/x402.json',
      pay_to_wallets: ['0xaaa'],
      first_seen: '2026-05-01T00:00:00.000Z',
      last_crawled: '2026-05-28T06:35:00.000Z',
      last_crawl_error: null,
      last_event_at: null,
    }));

    // Errored publisher: its record IS in KV but it is NOT in the wallet map
    // (refreshAllPublishers excludes errored crawls from the map). The fixed
    // getPublishers must still surface it so operators can see why the
    // publisher is missing from the allowlist.
    kv.store.set(kvKeyPublisher('terminalfeed.io'), JSON.stringify({
      domain: 'terminalfeed.io',
      manifest_url: 'https://terminalfeed.io/.well-known/x402.json',
      pay_to_wallets: [],
      first_seen: '2026-05-28T06:35:00.000Z',
      last_crawled: '2026-05-28T06:35:00.000Z',
      last_crawl_error: 'HTTP 404',
      last_event_at: null,
    }));

    const result = await getPublishers(env);
    expect(result.count).toBe(2);
    const tf = result.publishers.find((p) => p.domain === 'tensorfeed.ai');
    const errored = result.publishers.find((p) => p.domain === 'terminalfeed.io');
    expect(tf?.last_crawl_error).toBeNull();
    expect(errored?.last_crawl_error).toBe('HTTP 404');
    expect(errored?.pay_to_wallets).toEqual([]);
  });

  it('returns publishers sorted by domain ascending', async () => {
    const kv = mockKv();
    const env = { TENSORFEED_CACHE: kv } as unknown as import('../types').Env;
    for (const domain of ['zzz.com', 'aaa.com', 'mmm.com']) {
      kv.store.set(kvKeyPublisher(domain), JSON.stringify({
        domain,
        manifest_url: `https://${domain}/.well-known/x402.json`,
        pay_to_wallets: [],
        first_seen: '2026-05-28T00:00:00.000Z',
        last_crawled: '2026-05-28T00:00:00.000Z',
        last_crawl_error: null,
        last_event_at: null,
      }));
    }
    const result = await getPublishers(env);
    expect(result.publishers.map((p) => p.domain)).toEqual(['aaa.com', 'mmm.com', 'zzz.com']);
  });
});

describe('getPublisherReceipts', () => {
  it('returns publisher meta + window rollup + daily series', async () => {
    const kv = mockKv();
    const env = { TENSORFEED_CACHE: kv } as unknown as import('../types').Env;

    kv.store.set(kvKeyPublisher('tensorfeed.ai'), JSON.stringify({
      domain: 'tensorfeed.ai',
      manifest_url: 'https://tensorfeed.ai/.well-known/x402.json',
      pay_to_wallets: ['0xaaa'],
      first_seen: '2026-05-01T00:00:00.000Z',
      last_crawled: '2026-05-27T00:00:00.000Z',
      last_crawl_error: null,
      last_event_at: '2026-05-27T11:00:00.000Z',
    }));
    kv.store.set(kvKeyPubDayRollup('tensorfeed.ai', '2026-05-27'), JSON.stringify({
      date: '2026-05-27', domain: 'tensorfeed.ai', volume_usdc: '0.04', count: 2,
    }));
    kv.store.set(kvKeyPubDayRollup('tensorfeed.ai', '2026-05-26'), JSON.stringify({
      date: '2026-05-26', domain: 'tensorfeed.ai', volume_usdc: '0.02', count: 1,
    }));

    const result = await getPublisherReceipts(env, 'tensorfeed.ai', '2026-05-26', '2026-05-27');

    expect(result).not.toBeNull();
    expect(result!.publisher.domain).toBe('tensorfeed.ai');
    expect(result!.window.days).toBe(2);
    expect(result!.rollup.volume_usdc).toBe('0.060000');
    expect(result!.rollup.count).toBe(3);
    expect(result!.rollup.avg_amount).toBe('0.020000');
    expect(result!.rollup.daily_series).toEqual([
      { date: '2026-05-26', volume_usdc: '0.020000', count: 1 },
      { date: '2026-05-27', volume_usdc: '0.040000', count: 2 },
    ]);
  });

  it('returns null when publisher is unknown', async () => {
    const kv = mockKv();
    const env = { TENSORFEED_CACHE: kv } as unknown as import('../types').Env;
    const result = await getPublisherReceipts(env, 'unknown.com', '2026-05-26', '2026-05-27');
    expect(result).toBeNull();
  });
});

describe('getSeries', () => {
  it('returns daily-granularity volume series across date range (ecosystem)', async () => {
    const kv = mockKv();
    const env = { TENSORFEED_CACHE: kv } as unknown as import('../types').Env;

    kv.store.set(kvKeyDayRollup('2026-05-27'), JSON.stringify({
      date: '2026-05-27', volume_usdc: '5.0', count: 50, top_publishers: [],
    }));
    kv.store.set(kvKeyDayRollup('2026-05-26'), JSON.stringify({
      date: '2026-05-26', volume_usdc: '3.0', count: 30, top_publishers: [],
    }));

    const result = await getSeries(env, { metric: 'volume', granularity: 'day', from: '2026-05-26', to: '2026-05-27' });

    expect(result.series).toEqual([
      { ts: '2026-05-26', value: '3.000000' },
      { ts: '2026-05-27', value: '5.000000' },
    ]);
  });

  it('returns count series when metric=count', async () => {
    const kv = mockKv();
    const env = { TENSORFEED_CACHE: kv } as unknown as import('../types').Env;
    kv.store.set(kvKeyDayRollup('2026-05-27'), JSON.stringify({
      date: '2026-05-27', volume_usdc: '5.0', count: 50, top_publishers: [],
    }));
    const result = await getSeries(env, { metric: 'count', granularity: 'day', from: '2026-05-27', to: '2026-05-27' });
    expect(result.series).toEqual([{ ts: '2026-05-27', value: 50 }]);
  });

  it('returns per-publisher series when domain filter provided', async () => {
    const kv = mockKv();
    const env = { TENSORFEED_CACHE: kv } as unknown as import('../types').Env;
    kv.store.set(kvKeyPubDayRollup('tensorfeed.ai', '2026-05-27'), JSON.stringify({
      date: '2026-05-27', domain: 'tensorfeed.ai', volume_usdc: '2.0', count: 20,
    }));
    const result = await getSeries(env, { metric: 'volume', granularity: 'day', from: '2026-05-27', to: '2026-05-27', domain: 'tensorfeed.ai' });
    expect(result.series).toEqual([{ ts: '2026-05-27', value: '2.000000' }]);
  });
});

describe('validateRange (audit #4 KV-budget guard)', () => {
  it('accepts a normal window and returns the inclusive day count', () => {
    const r = validateRange('2026-05-01', '2026-05-10');
    expect(r.ok).toBe(true);
    expect(r.days).toBe(10);
  });
  it('accepts a single-day window', () => {
    const r = validateRange('2026-05-01', '2026-05-01');
    expect(r.ok).toBe(true);
    expect(r.days).toBe(1);
  });
  it('rejects a non-ISO date format', () => {
    expect(validateRange('2026/05/01', '2026-05-10').ok).toBe(false);
    expect(validateRange('garbage', '2026-05-10').error).toBe('invalid_date_format');
  });
  it('rejects an inverted range (from after to)', () => {
    const r = validateRange('2026-05-10', '2026-05-01');
    expect(r.ok).toBe(false);
    expect(r.error).toBe('inverted_range');
  });
  it('rejects a range wider than the cap (the unbounded fan-out vector)', () => {
    const r = validateRange('2000-01-01', '2030-01-01');
    expect(r.ok).toBe(false);
    expect(r.error).toBe('range_too_large');
  });
  it('accepts exactly the max span and rejects one day over', () => {
    const startMs = new Date('2026-01-01T00:00:00.000Z').getTime();
    const okEnd = new Date(startMs + (MAX_SERIES_RANGE_DAYS - 1) * 86400000).toISOString().slice(0, 10);
    const overEnd = new Date(startMs + MAX_SERIES_RANGE_DAYS * 86400000).toISOString().slice(0, 10);
    const okR = validateRange('2026-01-01', okEnd);
    expect(okR.ok).toBe(true);
    expect(okR.days).toBe(MAX_SERIES_RANGE_DAYS);
    expect(validateRange('2026-01-01', overEnd).ok).toBe(false);
  });
});
