import { describe, it, expect, vi } from 'vitest';
import { computeBlockRange, decodeTransferLog, type RpcLog, addDecimal, compareDecimal, toMicroUnits, fromMicroUnits, applyEventToRollups, runIndexerTick } from './indexer';
import {
  KV_KEY_RECENT,
  kvKeyDayRollup,
  kvKeyPubDayRollup,
  kvKeyEvent,
  KV_KEY_CURSOR,
  KV_KEY_PUBLISHERS,
} from './constants';
import type { SettlementEvent } from './types';

describe('computeBlockRange', () => {
  it('returns range from cursor+1 to current-30 when current is far ahead', () => {
    expect(computeBlockRange(1000, 2000)).toEqual({ fromBlock: 1001, toBlock: 1970 });
  });

  it('returns null when current is within reorg-safety window of cursor', () => {
    expect(computeBlockRange(1000, 1029)).toBeNull();
    expect(computeBlockRange(1000, 1030)).toBeNull();
  });

  it('returns single-block range when current is exactly 31 ahead of cursor', () => {
    expect(computeBlockRange(1000, 1031)).toEqual({ fromBlock: 1001, toBlock: 1001 });
  });

  it('caps the span at MAX_BLOCKS_PER_TICK so an oversized backlog is walked incrementally', () => {
    // A multi-hour stall leaves the cursor tens of thousands of blocks behind.
    // Without the cap this returns a span the public RPC rejects (the death
    // spiral that stalls the cursor forever). Capped, the tick advances at most
    // MAX_BLOCKS_PER_TICK (2000) and the next tick continues from there.
    expect(computeBlockRange(1000, 1_000_000)).toEqual({ fromBlock: 1001, toBlock: 3000 });
  });

  it('does not cap when the gap is smaller than MAX_BLOCKS_PER_TICK', () => {
    expect(computeBlockRange(1000, 2500)).toEqual({ fromBlock: 1001, toBlock: 2470 });
  });
});

describe('decodeTransferLog', () => {
  const validLog: RpcLog = {
    address: '0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913',
    topics: [
      '0xddf252ad1be2c89b69c2b068fc378daa952ba7f163c4a11628f55a4df523b3ef',
      '0x000000000000000000000000aaa0000000000000000000000000000000000001',
      '0x000000000000000000000000bbb0000000000000000000000000000000000002',
    ],
    data: '0x0000000000000000000000000000000000000000000000000000000000004e20',
    blockNumber: '0x10',
    transactionHash: '0xDEADBEEF',
  };

  it('decodes a Transfer to an allowlisted publisher with correct fields', () => {
    const walletMap = { '0xbbb0000000000000000000000000000000000002': 'example.com' };
    const event = decodeTransferLog(validLog, '2026-05-27T12:00:00.000Z', walletMap);
    expect(event).not.toBeNull();
    expect(event!.tx_hash).toBe('0xdeadbeef');
    expect(event!.block).toBe(16);
    expect(event!.from_address).toBe('0xaaa0000000000000000000000000000000000001');
    expect(event!.to_address).toBe('0xbbb0000000000000000000000000000000000002');
    expect(event!.amount_usdc).toBe('0.020000');
    expect(event!.publisher_domain).toBe('example.com');
    expect(event!.asset).toBe('USDC');
    expect(event!.chain).toBe('base');
  });

  it('returns null when recipient is not in allowlist', () => {
    const walletMap = { '0xother000000000000000000000000000000000000': 'other.com' };
    expect(decodeTransferLog(validLog, '2026-05-27T12:00:00.000Z', walletMap)).toBeNull();
  });

  it('returns null when topic count is wrong (e.g. ERC-20 Approval has different signature)', () => {
    const badLog = { ...validLog, topics: validLog.topics.slice(0, 2) };
    expect(decodeTransferLog(badLog, '2026-05-27T12:00:00.000Z', { '0xbbb0000000000000000000000000000000000002': 'example.com' })).toBeNull();
  });

  it('returns null when topic[0] is not Transfer signature', () => {
    const badLog = { ...validLog, topics: ['0xdeadbeef', validLog.topics[1], validLog.topics[2]] };
    expect(decodeTransferLog(badLog, '2026-05-27T12:00:00.000Z', { '0xbbb0000000000000000000000000000000000002': 'example.com' })).toBeNull();
  });

  it('handles large USDC amounts (1000 USDC = 1e9 micro)', () => {
    const bigLog = {
      ...validLog,
      data: '0x' + (1_000_000_000n).toString(16).padStart(64, '0'),
    };
    const event = decodeTransferLog(bigLog, '2026-05-27T12:00:00.000Z', { '0xbbb0000000000000000000000000000000000002': 'example.com' });
    expect(event!.amount_usdc).toBe('1000.000000');
  });
});

describe('decimal arithmetic helpers', () => {
  it('toMicroUnits parses 6dp decimal string to bigint micro', () => {
    expect(toMicroUnits('0.02')).toBe(20000n);
    expect(toMicroUnits('0.020000')).toBe(20000n);
    expect(toMicroUnits('1.5')).toBe(1500000n);
    expect(toMicroUnits('0')).toBe(0n);
    expect(toMicroUnits('1000')).toBe(1000000000n);
  });

  it('fromMicroUnits formats bigint micro to 6dp string', () => {
    expect(fromMicroUnits(20000n)).toBe('0.020000');
    expect(fromMicroUnits(1500000n)).toBe('1.500000');
    expect(fromMicroUnits(0n)).toBe('0.000000');
    expect(fromMicroUnits(1000000000n)).toBe('1000.000000');
  });

  it('addDecimal sums two 6dp strings without floating-point drift', () => {
    expect(addDecimal('0.02', '0.02')).toBe('0.040000');
    expect(addDecimal('1.5', '0.02')).toBe('1.520000');
    expect(addDecimal('0.000001', '0.000001')).toBe('0.000002');
  });

  it('compareDecimal returns -1, 0, 1 correctly', () => {
    expect(compareDecimal('1.0', '2.0')).toBe(-1);
    expect(compareDecimal('2.0', '1.0')).toBe(1);
    expect(compareDecimal('1.0', '1.0')).toBe(0);
  });
});

function mockKv() {
  const store = new Map<string, string>();
  return {
    store,
    get: vi.fn(async (key: string, type?: 'json') => {
      const raw = store.get(key);
      if (raw === undefined) return null;
      return type === 'json' ? JSON.parse(raw) : raw;
    }),
    put: vi.fn(async (key: string, value: string, _opts?: { expirationTtl?: number }) => {
      store.set(key, value);
    }),
  };
}

const baseEvent: SettlementEvent = {
  tx_hash: '0xaaa',
  block: 1,
  ts: '2026-05-27T12:00:00.000Z',
  from_address: '0xfromfromfrom',
  to_address: '0xtotototo',
  amount_usdc: '0.02',
  publisher_domain: 'tensorfeed.ai',
  asset: 'USDC',
  chain: 'base',
};

describe('applyEventToRollups', () => {
  it('initializes daily + per-publisher rollups + recent ring on first event', async () => {
    const kv = mockKv();
    const env = { TENSORFEED_CACHE: kv } as unknown as import('../types').Env;
    await applyEventToRollups(env, baseEvent);

    const daily = await kv.get(kvKeyDayRollup('2026-05-27'), 'json');
    expect(daily).toMatchObject({
      date: '2026-05-27',
      volume_usdc: '0.020000',
      count: 1,
      top_publishers: [{ domain: 'tensorfeed.ai', volume_usdc: '0.020000', count: 1 }],
    });

    const pubDaily = await kv.get(kvKeyPubDayRollup('tensorfeed.ai', '2026-05-27'), 'json');
    expect(pubDaily).toMatchObject({
      date: '2026-05-27',
      domain: 'tensorfeed.ai',
      volume_usdc: '0.020000',
      count: 1,
    });

    const ev = await kv.get(kvKeyEvent('0xaaa'), 'json');
    expect(ev).toEqual(baseEvent);

    const recent = await kv.get(KV_KEY_RECENT, 'json');
    expect(recent).toEqual([baseEvent]);
  });

  it('increments existing daily rollup on second event same day same publisher', async () => {
    const kv = mockKv();
    const env = { TENSORFEED_CACHE: kv } as unknown as import('../types').Env;
    await applyEventToRollups(env, baseEvent);
    await applyEventToRollups(env, { ...baseEvent, tx_hash: '0xbbb', amount_usdc: '0.05' });

    const daily = await kv.get(kvKeyDayRollup('2026-05-27'), 'json');
    expect(daily).toMatchObject({
      volume_usdc: '0.070000',
      count: 2,
      top_publishers: [{ domain: 'tensorfeed.ai', volume_usdc: '0.070000', count: 2 }],
    });
  });

  it('builds top_publishers sorted by volume desc, count desc tie-break, domain asc tie-break', async () => {
    const kv = mockKv();
    const env = { TENSORFEED_CACHE: kv } as unknown as import('../types').Env;
    await applyEventToRollups(env, { ...baseEvent, tx_hash: '0x1', publisher_domain: 'zzz.com', amount_usdc: '1.0' });
    await applyEventToRollups(env, { ...baseEvent, tx_hash: '0x2', publisher_domain: 'aaa.com', amount_usdc: '1.0' });
    await applyEventToRollups(env, { ...baseEvent, tx_hash: '0x3', publisher_domain: 'mmm.com', amount_usdc: '2.0' });

    const daily = await kv.get(kvKeyDayRollup('2026-05-27'), 'json') as { top_publishers: Array<{ domain: string; volume_usdc: string; count: number }> };
    expect(daily.top_publishers).toEqual([
      { domain: 'mmm.com', volume_usdc: '2.000000', count: 1 },
      { domain: 'aaa.com', volume_usdc: '1.000000', count: 1 },
      { domain: 'zzz.com', volume_usdc: '1.000000', count: 1 },
    ]);
  });

  it('caps recent feed at RECENT_FEED_SIZE (100)', async () => {
    const kv = mockKv();
    const env = { TENSORFEED_CACHE: kv } as unknown as import('../types').Env;
    for (let i = 0; i < 105; i++) {
      await applyEventToRollups(env, { ...baseEvent, tx_hash: `0x${i.toString(16)}` });
    }
    const recent = await kv.get(KV_KEY_RECENT, 'json') as SettlementEvent[];
    expect(recent.length).toBe(100);
    expect(recent[0].tx_hash).toBe('0x68'); // i=104, newest first
  });

  it('is idempotent on tx_hash: re-processing the same settlement does not double-count rollups or duplicate the recent ring', async () => {
    const kv = mockKv();
    const env = { TENSORFEED_CACHE: kv } as unknown as import('../types').Env;
    // Same tx applied twice, as happens when a tick's cursor write fails mid-run,
    // the worker restarts, or two ticks process an overlapping block range.
    await applyEventToRollups(env, baseEvent);
    await applyEventToRollups(env, baseEvent);

    const daily = await kv.get(kvKeyDayRollup('2026-05-27'), 'json');
    expect(daily).toMatchObject({
      volume_usdc: '0.020000',
      count: 1,
      top_publishers: [{ domain: 'tensorfeed.ai', volume_usdc: '0.020000', count: 1 }],
    });

    const pubDaily = await kv.get(kvKeyPubDayRollup('tensorfeed.ai', '2026-05-27'), 'json');
    expect(pubDaily).toMatchObject({ volume_usdc: '0.020000', count: 1 });

    const recent = await kv.get(KV_KEY_RECENT, 'json') as SettlementEvent[];
    expect(recent).toEqual([baseEvent]);
  });
});

describe('runIndexerTick', () => {
  it('initializes cursor on first run and reports skipped', async () => {
    const kv = mockKv();
    const env = { TENSORFEED_CACHE: kv } as unknown as import('../types').Env;
    const mockFetch = vi.fn(async () => ({ json: async () => ({ result: '0x100' }) })) as unknown as typeof fetch;

    const result = await runIndexerTick(env, 'https://rpc.example', mockFetch);
    expect(result).toEqual({ skipped: true, reason: 'cursor_initialized' });

    const cursor = await kv.get(KV_KEY_CURSOR, 'json') as { block: number };
    expect(cursor.block).toBe(256);
  });

  it('skips when no blocks past safety window', async () => {
    const kv = mockKv();
    kv.store.set(KV_KEY_CURSOR, JSON.stringify({ block: 1000, ts: '2026-05-27T00:00:00.000Z', last_run_at: '2026-05-27T00:00:00.000Z' }));
    kv.store.set(KV_KEY_PUBLISHERS, JSON.stringify({ '0xpub': 'example.com' }));
    const env = { TENSORFEED_CACHE: kv } as unknown as import('../types').Env;
    const mockFetch = vi.fn(async () => ({ json: async () => ({ result: '0x3F0' }) })) as unknown as typeof fetch; // 1008, safe_to=978, <=1000

    const result = await runIndexerTick(env, 'https://rpc.example', mockFetch);
    expect(result).toEqual({ skipped: true, reason: 'no_blocks_to_process' });
  });

  it('skips when publisher map is empty', async () => {
    const kv = mockKv();
    kv.store.set(KV_KEY_CURSOR, JSON.stringify({ block: 1000, ts: '2026-05-27T00:00:00.000Z', last_run_at: '2026-05-27T00:00:00.000Z' }));
    const env = { TENSORFEED_CACHE: kv } as unknown as import('../types').Env;
    const mockFetch = vi.fn(async () => ({ json: async () => ({ result: '0x10000' }) })) as unknown as typeof fetch;

    const result = await runIndexerTick(env, 'https://rpc.example', mockFetch);
    expect(result).toEqual({ skipped: true, reason: 'no_publishers' });
  });

  it('processes matching logs and advances cursor on success', async () => {
    const kv = mockKv();
    kv.store.set(KV_KEY_CURSOR, JSON.stringify({ block: 1000, ts: '2026-05-27T00:00:00.000Z', last_run_at: '2026-05-27T00:00:00.000Z' }));
    kv.store.set(KV_KEY_PUBLISHERS, JSON.stringify({ '0xbbb0000000000000000000000000000000000002': 'example.com' }));
    const env = { TENSORFEED_CACHE: kv } as unknown as import('../types').Env;

    let call = 0;
    const mockFetch = vi.fn(async (_url: string, _opts?: RequestInit) => {
      call++;
      if (call === 1) {
        return { json: async () => ({ result: '0x10000' }) } as unknown as Response;
      }
      if (call === 2) {
        return {
          json: async () => ({
            result: [
              {
                address: '0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913',
                topics: [
                  '0xddf252ad1be2c89b69c2b068fc378daa952ba7f163c4a11628f55a4df523b3ef',
                  '0x000000000000000000000000aaa0000000000000000000000000000000000001',
                  '0x000000000000000000000000bbb0000000000000000000000000000000000002',
                ],
                data: '0x0000000000000000000000000000000000000000000000000000000000004e20',
                blockNumber: '0x9c4',
                transactionHash: '0xtxhash1',
              },
            ],
          }),
        } as unknown as Response;
      }
      return {
        json: async () => [
          {
            id: 0,
            result: {
              number: '0x9c4',
              timestamp: (Math.floor(Date.parse('2026-05-27T12:00:00Z') / 1000)).toString(16),
            },
          },
        ],
      } as unknown as Response;
    }) as unknown as typeof fetch;

    const result = await runIndexerTick(env, 'https://rpc.example', mockFetch);
    expect(result).toMatchObject({ events: 1 });

    const cursor = await kv.get(KV_KEY_CURSOR, 'json') as { block: number };
    // Capped: 1000 + MAX_BLOCKS_PER_TICK (2000). The ~64k-block gap is not
    // scanned in one oversized eth_getLogs; it is walked 2000 blocks per tick.
    expect(cursor.block).toBe(3000);
  });

  it('uses env.BASE_RPC_URL when no explicit rpcUrl arg is passed', async () => {
    const kv = mockKv();
    const seenUrls: string[] = [];
    const env = { TENSORFEED_CACHE: kv, BASE_RPC_URL: 'https://keyed.example/rpc' } as unknown as import('../types').Env;
    const mockFetch = vi.fn(async (url: string) => {
      seenUrls.push(url);
      return { json: async () => ({ result: '0x100' }) } as unknown as Response;
    }) as unknown as typeof fetch;

    // No cursor yet, so this initializes and only calls getCurrentBlock, which is
    // enough to prove the configured keyed RPC is the URL used (not the public
    // default). Before BASE_RPC_URL was wired in, this hit mainnet.base.org.
    await runIndexerTick(env, undefined, mockFetch);
    expect(seenUrls).toContain('https://keyed.example/rpc');
  });
});
