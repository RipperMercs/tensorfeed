import { describe, it, expect, vi } from 'vitest';
import { computeBlockRange, chunkBlockRange, decodeTransferLog, type RpcLog, addDecimal, compareDecimal, toMicroUnits, fromMicroUnits, applyEventToRollups, runIndexerTick } from './indexer';
import {
  TRANSFER_TOPIC,
  MAX_GETLOGS_CALLS_PER_TICK,
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

describe('chunkBlockRange', () => {
  it('returns a single window when the span fits in maxSpan', () => {
    expect(chunkBlockRange(1001, 3000, 2000)).toEqual([{ fromBlock: 1001, toBlock: 3000 }]);
  });

  it('splits a range into contiguous windows of at most maxSpan blocks', () => {
    expect(chunkBlockRange(1001, 1030, 10)).toEqual([
      { fromBlock: 1001, toBlock: 1010 },
      { fromBlock: 1011, toBlock: 1020 },
      { fromBlock: 1021, toBlock: 1030 },
    ]);
  });

  it('makes the final window short when the range is not a multiple of maxSpan', () => {
    expect(chunkBlockRange(1001, 1025, 10)).toEqual([
      { fromBlock: 1001, toBlock: 1010 },
      { fromBlock: 1011, toBlock: 1020 },
      { fromBlock: 1021, toBlock: 1025 },
    ]);
  });

  it('returns one single-block window when from equals to', () => {
    expect(chunkBlockRange(1001, 1001, 10)).toEqual([{ fromBlock: 1001, toBlock: 1001 }]);
  });

  it('never returns a window wider than maxSpan', () => {
    for (const w of chunkBlockRange(1, 95, 10)) {
      expect(w.toBlock - w.fromBlock + 1).toBeLessThanOrEqual(10);
    }
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

type RpcReq = { jsonrpc: string; method: string; params: unknown[]; id: number };

// A realistic Base-RPC mock that dispatches by JSON-RPC method (not call order),
// so a test can assert how the indexer windows eth_getLogs across a block range.
// logsByBlock maps a block number to the logs the RPC returns when that block is
// inside the requested [fromBlock, toBlock] window.
function makeRpcMock(head: number, logsByBlock: Record<number, RpcLog[]> = {}) {
  const getLogsCalls: { fromBlock: number; toBlock: number }[] = [];
  const fetchFn = vi.fn(async (_url: string, opts?: RequestInit) => {
    const parsed = JSON.parse(String(opts?.body)) as RpcReq | RpcReq[];
    if (Array.isArray(parsed)) {
      return {
        json: async () => parsed.map((req) => ({
          id: req.id,
          result: { number: req.params[0] as string, timestamp: Math.floor(Date.parse('2026-05-29T00:00:00Z') / 1000).toString(16) },
        })),
      } as unknown as Response;
    }
    if (parsed.method === 'eth_blockNumber') {
      return { json: async () => ({ result: '0x' + head.toString(16) }) } as unknown as Response;
    }
    if (parsed.method === 'eth_getLogs') {
      const p = parsed.params[0] as { fromBlock: string; toBlock: string };
      const from = parseInt(p.fromBlock, 16);
      const to = parseInt(p.toBlock, 16);
      getLogsCalls.push({ fromBlock: from, toBlock: to });
      const result: RpcLog[] = [];
      for (let b = from; b <= to; b++) if (logsByBlock[b]) result.push(...logsByBlock[b]);
      return { json: async () => ({ result }) } as unknown as Response;
    }
    throw new Error('unexpected RPC method: ' + parsed.method);
  }) as unknown as typeof fetch;
  return { fetchFn, getLogsCalls };
}

function mkTransferLog(block: number, tx: string, toWallet: string): RpcLog {
  const pad = (a: string) => '0x' + '0'.repeat(24) + a.toLowerCase().replace(/^0x/, '');
  return {
    address: '0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913',
    topics: [TRANSFER_TOPIC, pad('aaa0000000000000000000000000000000000001'), pad(toWallet)],
    data: '0x' + (20000).toString(16).padStart(64, '0'), // 0.02 USDC (6 decimals)
    blockNumber: '0x' + block.toString(16),
    transactionHash: tx,
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

  it('uses env.BASE_INDEXER_RPC_URL and never the payments BASE_RPC_URL', async () => {
    const kv = mockKv();
    const seenUrls: string[] = [];
    const env = {
      TENSORFEED_CACHE: kv,
      BASE_INDEXER_RPC_URL: 'https://indexer.example/rpc',
      BASE_RPC_URL: 'https://payments.example/rpc',
    } as unknown as import('../types').Env;
    const mockFetch = vi.fn(async (url: string) => {
      seenUrls.push(url);
      return { json: async () => ({ result: '0x100' }) } as unknown as Response;
    }) as unknown as typeof fetch;

    await runIndexerTick(env, undefined, mockFetch);
    expect(seenUrls).toContain('https://indexer.example/rpc');
    // The indexer must NEVER borrow the payments/facilitator RPC: that endpoint
    // can cap eth_getLogs spans, which is exactly what froze the cursor.
    expect(seenUrls).not.toContain('https://payments.example/rpc');
  });

  it('falls back to the reachable BASE_RPC_URL when no dedicated indexer RPC is set', async () => {
    const kv = mockKv();
    const seenUrls: string[] = [];
    const env = {
      TENSORFEED_CACHE: kv,
      BASE_RPC_URL: 'https://payments.example/rpc',
    } as unknown as import('../types').Env;
    const mockFetch = vi.fn(async (url: string) => {
      seenUrls.push(url);
      return { json: async () => ({ result: '0x100' }) } as unknown as Response;
    }) as unknown as typeof fetch;

    // The public node throttles the Worker's shared Cloudflare egress, so the
    // indexer prefers the keyed BASE_RPC_URL (which the Worker can reach) over
    // the public default. Wide-span safety comes from chunking, not the RPC.
    await runIndexerTick(env, undefined, mockFetch);
    expect(seenUrls).toContain('https://payments.example/rpc');
    expect(seenUrls).not.toContain('https://mainnet.base.org');
  });

  it('falls back to the public node only when no RPC is configured at all', async () => {
    const kv = mockKv();
    const seenUrls: string[] = [];
    const env = { TENSORFEED_CACHE: kv } as unknown as import('../types').Env;
    const mockFetch = vi.fn(async (url: string) => {
      seenUrls.push(url);
      return { json: async () => ({ result: '0x100' }) } as unknown as Response;
    }) as unknown as typeof fetch;

    await runIndexerTick(env, undefined, mockFetch);
    expect(seenUrls).toContain('https://mainnet.base.org');
  });

  it('windows a tick into <=span eth_getLogs calls and aggregates events across windows', async () => {
    const kv = mockKv();
    kv.store.set(KV_KEY_CURSOR, JSON.stringify({ block: 1000, ts: '2026-05-29T00:00:00.000Z', last_run_at: '2026-05-29T00:00:00.000Z' }));
    kv.store.set(KV_KEY_PUBLISHERS, JSON.stringify({ '0xbbb0000000000000000000000000000000000002': 'example.com' }));
    const env = { TENSORFEED_CACHE: kv, BASE_RPC_GETLOGS_SPAN: '10' } as unknown as import('../types').Env;

    // head 1055 -> safeTo 1025 -> range [1001,1025]; span 10 -> 3 windows.
    // Logs sit in the first (1005) and last (1023) window to prove aggregation.
    const { fetchFn, getLogsCalls } = makeRpcMock(1055, {
      1005: [mkTransferLog(1005, '0xtxA', 'bbb0000000000000000000000000000000000002')],
      1023: [mkTransferLog(1023, '0xtxB', 'bbb0000000000000000000000000000000000002')],
    });

    const result = await runIndexerTick(env, 'https://small.example/rpc', fetchFn);

    expect(result).toMatchObject({ events: 2, to: 1025 });
    expect(getLogsCalls).toHaveLength(3);
    for (const c of getLogsCalls) {
      expect(c.toBlock - c.fromBlock + 1).toBeLessThanOrEqual(10);
    }
    const cursor = await kv.get(KV_KEY_CURSOR, 'json') as { block: number };
    expect(cursor.block).toBe(1025);
  });

  it('checkpoints the cursor to the last good window when a later window errors, then surfaces the error', async () => {
    const kv = mockKv();
    kv.store.set(KV_KEY_CURSOR, JSON.stringify({ block: 1000, ts: '2026-05-29T00:00:00.000Z', last_run_at: '2026-05-29T00:00:00.000Z' }));
    kv.store.set(KV_KEY_PUBLISHERS, JSON.stringify({ '0xbbb0000000000000000000000000000000000002': 'example.com' }));
    const env = { TENSORFEED_CACHE: kv, BASE_RPC_GETLOGS_SPAN: '10' } as unknown as import('../types').Env;

    // range [1001,1025], 3 windows. The 2nd window ([1011,1020]) errors.
    const fetchFn = vi.fn(async (_url: string, opts?: RequestInit) => {
      const parsed = JSON.parse(String(opts?.body)) as { method?: string; params?: Array<{ fromBlock: string }> } | unknown[];
      if (Array.isArray(parsed)) {
        return { json: async () => [] } as unknown as Response;
      }
      const body = parsed as { method?: string; params?: Array<{ fromBlock: string }> };
      if (body.method === 'eth_blockNumber') {
        return { json: async () => ({ result: '0x' + (1055).toString(16) }) } as unknown as Response;
      }
      if (body.method === 'eth_getLogs') {
        const from = parseInt(body.params![0].fromBlock, 16);
        if (from === 1011) {
          return { json: async () => ({ error: { message: 'over rate limit' } }) } as unknown as Response;
        }
        return { json: async () => ({ result: [] }) } as unknown as Response;
      }
      throw new Error('unexpected');
    }) as unknown as typeof fetch;

    await expect(runIndexerTick(env, 'https://small.example/rpc', fetchFn)).rejects.toThrow(/over rate limit/);

    const cursor = await kv.get(KV_KEY_CURSOR, 'json') as { block: number };
    // First window [1001,1010] succeeded and is checkpointed; the failing 2nd
    // window did not advance the cursor past 1010, and it is not stuck at 1000.
    expect(cursor.block).toBe(1010);
  });

  it('surfaces an RPC failure on eth_blockNumber instead of silently no-oping', async () => {
    const kv = mockKv();
    kv.store.set(KV_KEY_CURSOR, JSON.stringify({ block: 1000, ts: '2026-05-29T00:00:00.000Z', last_run_at: '2026-05-29T00:00:00.000Z' }));
    kv.store.set(KV_KEY_PUBLISHERS, JSON.stringify({ '0xbbb0000000000000000000000000000000000002': 'example.com' }));
    const env = { TENSORFEED_CACHE: kv } as unknown as import('../types').Env;
    // A throttled public node returns a JSON-RPC error (no `result`). The tick
    // must throw so the cron logs it, never compute a NaN range and silently
    // freeze the cursor (the bug that hid a multi-day outage).
    const mockFetch = vi.fn(async () => ({ json: async () => ({ error: { message: 'over rate limit' } }) }) as unknown as Response) as unknown as typeof fetch;

    await expect(runIndexerTick(env, 'https://throttled.example/rpc', mockFetch)).rejects.toThrow(/over rate limit/);

    const cursor = await kv.get(KV_KEY_CURSOR, 'json') as { block: number };
    expect(cursor.block).toBe(1000);
  });

  it('caps eth_getLogs calls per tick so a small-span RPC stays within the cron time budget', async () => {
    const kv = mockKv();
    kv.store.set(KV_KEY_CURSOR, JSON.stringify({ block: 1000, ts: '2026-05-29T00:00:00.000Z', last_run_at: '2026-05-29T00:00:00.000Z' }));
    kv.store.set(KV_KEY_PUBLISHERS, JSON.stringify({ '0xbbb0000000000000000000000000000000000002': 'example.com' }));
    const env = { TENSORFEED_CACHE: kv, BASE_RPC_GETLOGS_SPAN: '10' } as unknown as import('../types').Env;

    // head far ahead -> range capped at MAX_BLOCKS_PER_TICK (2000) = [1001,3000]
    // = 200 windows at span 10, which exceeds the per-tick call cap. Only
    // MAX_GETLOGS_CALLS_PER_TICK windows run; the cursor advances that many * span
    // blocks and the next tick continues from there. (Valid while the cap is below
    // MAX_BLOCKS_PER_TICK / span = 200.)
    const { fetchFn, getLogsCalls } = makeRpcMock(100000, {});
    const result = await runIndexerTick(env, 'https://small.example/rpc', fetchFn);

    expect(getLogsCalls).toHaveLength(MAX_GETLOGS_CALLS_PER_TICK);
    const expectedTo = 1000 + MAX_GETLOGS_CALLS_PER_TICK * 10;
    expect(result).toMatchObject({ to: expectedTo });
    const cursor = await kv.get(KV_KEY_CURSOR, 'json') as { block: number };
    expect(cursor.block).toBe(expectedTo);
  });
});
