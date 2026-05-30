import { REORG_SAFETY_BLOCKS, MAX_BLOCKS_PER_TICK, TRANSFER_TOPIC, USDC_DECIMALS, EVENT_TTL_SECONDS, KV_KEY_RECENT, RECENT_FEED_SIZE, TOP_PUBLISHERS_LIMIT, kvKeyDayRollup, kvKeyPubDayRollup, kvKeyEvent, DEFAULT_BASE_RPC, KV_KEY_CURSOR, KV_KEY_PUBLISHERS, USDC_BASE_CONTRACT } from './constants';
import type { SettlementEvent, DailyRollup, PublisherDailyRollup, IndexerCursor } from './types';
import type { Env } from '../types';

export interface BlockRange {
  fromBlock: number;
  toBlock: number;
}

export function computeBlockRange(cursorBlock: number, currentBlock: number): BlockRange | null {
  const safeTo = currentBlock - REORG_SAFETY_BLOCKS;
  if (safeTo <= cursorBlock) return null;
  // Never scan more than MAX_BLOCKS_PER_TICK in one eth_getLogs. A wider span is
  // rejected by the public Base RPC (10,000-block limit) and is the first query
  // rate limited from the shared Cloudflare egress, which is exactly what stalls
  // the cursor: once the gap grows past the limit, every tick re-requests the
  // whole oversized span and fails forever. Capping the span lets the indexer
  // walk the backlog forward one bounded, accepted window per tick.
  const toBlock = Math.min(safeTo, cursorBlock + MAX_BLOCKS_PER_TICK);
  return {
    fromBlock: cursorBlock + 1,
    toBlock,
  };
}

export interface RpcLog {
  address: string;
  topics: string[];
  data: string;
  blockNumber: string;
  transactionHash: string;
}

export function decodeTransferLog(
  log: RpcLog,
  blockTs: string,
  walletToDomain: Record<string, string>,
): SettlementEvent | null {
  if (log.topics.length !== 3) return null;
  if (log.topics[0].toLowerCase() !== TRANSFER_TOPIC) return null;

  const fromAddr = '0x' + log.topics[1].slice(26).toLowerCase();
  const toAddr = '0x' + log.topics[2].slice(26).toLowerCase();

  const publisherDomain = walletToDomain[toAddr];
  if (!publisherDomain) return null;

  const amountWei = BigInt(log.data);
  const amountUsdc = formatDecimal(amountWei, USDC_DECIMALS);

  return {
    tx_hash: log.transactionHash.toLowerCase(),
    block: parseInt(log.blockNumber, 16),
    ts: blockTs,
    from_address: fromAddr,
    to_address: toAddr,
    amount_usdc: amountUsdc,
    publisher_domain: publisherDomain,
    asset: 'USDC',
    chain: 'base',
  };
}

export function formatDecimal(value: bigint, decimals: number): string {
  const divisor = 10n ** BigInt(decimals);
  const whole = value / divisor;
  const frac = value % divisor;
  return `${whole.toString()}.${frac.toString().padStart(decimals, '0')}`;
}

export function toMicroUnits(s: string): bigint {
  const [whole, frac = ''] = s.split('.');
  const fracPadded = (frac + '000000').slice(0, 6);
  return BigInt(whole) * 1_000_000n + BigInt(fracPadded);
}

export function fromMicroUnits(v: bigint): string {
  // Equivalent to formatDecimal(v, 6); kept as a named helper for callsite clarity
  // so indexer code reads in domain language (microUnits) rather than generic decimals.
  const whole = v / 1_000_000n;
  const frac = v % 1_000_000n;
  return `${whole.toString()}.${frac.toString().padStart(6, '0')}`;
}

export function addDecimal(a: string, b: string): string {
  return fromMicroUnits(toMicroUnits(a) + toMicroUnits(b));
}

export function compareDecimal(a: string, b: string): -1 | 0 | 1 {
  const am = toMicroUnits(a);
  const bm = toMicroUnits(b);
  if (am < bm) return -1;
  if (am > bm) return 1;
  return 0;
}

export async function applyEventToRollups(env: Env, event: SettlementEvent): Promise<void> {
  // Idempotency guard: skip a settlement we have already applied. The per-tx event
  // record (written below) is our durable marker, so if a re-processed block range
  // (cursor write failed mid-tick, a worker restart, or two overlapping ticks) feeds
  // the same tx_hash back in, we neither double-count the rollups it bills against nor
  // duplicate it in the recent ticker.
  const alreadyApplied = await env.TENSORFEED_CACHE.get(kvKeyEvent(event.tx_hash));
  if (alreadyApplied) return;

  const date = event.ts.slice(0, 10);

  const dailyKey = kvKeyDayRollup(date);
  const dailyRaw = (await env.TENSORFEED_CACHE.get(dailyKey, 'json')) as DailyRollup | null;
  const daily: DailyRollup = dailyRaw ?? {
    date,
    volume_usdc: '0',
    count: 0,
    top_publishers: [],
  };
  daily.volume_usdc = addDecimal(daily.volume_usdc, event.amount_usdc);
  daily.count += 1;
  daily.top_publishers = recomputeTopPublishers(daily.top_publishers, event);
  await env.TENSORFEED_CACHE.put(dailyKey, JSON.stringify(daily));

  const pubDailyKey = kvKeyPubDayRollup(event.publisher_domain, date);
  const pubDailyRaw = (await env.TENSORFEED_CACHE.get(pubDailyKey, 'json')) as PublisherDailyRollup | null;
  const pubDaily: PublisherDailyRollup = pubDailyRaw ?? {
    date,
    domain: event.publisher_domain,
    volume_usdc: '0',
    count: 0,
  };
  pubDaily.volume_usdc = addDecimal(pubDaily.volume_usdc, event.amount_usdc);
  pubDaily.count += 1;
  await env.TENSORFEED_CACHE.put(pubDailyKey, JSON.stringify(pubDaily));

  await env.TENSORFEED_CACHE.put(kvKeyEvent(event.tx_hash), JSON.stringify(event), {
    expirationTtl: EVENT_TTL_SECONDS,
  });

  const recentRaw = (await env.TENSORFEED_CACHE.get(KV_KEY_RECENT, 'json')) as SettlementEvent[] | null;
  const recent = recentRaw ?? [];
  recent.unshift(event);
  if (recent.length > RECENT_FEED_SIZE) recent.length = RECENT_FEED_SIZE;
  await env.TENSORFEED_CACHE.put(KV_KEY_RECENT, JSON.stringify(recent));
}

function recomputeTopPublishers(
  existing: DailyRollup['top_publishers'],
  event: SettlementEvent,
): DailyRollup['top_publishers'] {
  const map = new Map(existing.map((p) => [p.domain, p]));
  const cur = map.get(event.publisher_domain) ?? {
    domain: event.publisher_domain,
    volume_usdc: '0',
    count: 0,
  };
  cur.volume_usdc = addDecimal(cur.volume_usdc, event.amount_usdc);
  cur.count += 1;
  map.set(event.publisher_domain, cur);

  const arr = Array.from(map.values());
  arr.sort((a, b) => {
    const cmp = compareDecimal(b.volume_usdc, a.volume_usdc);
    if (cmp !== 0) return cmp;
    if (b.count !== a.count) return b.count - a.count;
    return a.domain.localeCompare(b.domain);
  });
  return arr.slice(0, TOP_PUBLISHERS_LIMIT);
}

// ---------------------------------------------------------------------------
// Full tick orchestration
// ---------------------------------------------------------------------------

type IndexerResult =
  | { events: number; from: number; to: number }
  | { skipped: true; reason: 'cursor_initialized' | 'no_blocks_to_process' | 'no_publishers' };

export async function runIndexerTick(
  env: Env,
  rpcUrl?: string,
  fetchFn: typeof fetch = fetch,
): Promise<IndexerResult> {
  // Prefer an explicit arg (tests), then the configured BASE_RPC_URL secret or
  // var (a keyed endpoint with its own rate budget, immune to the shared
  // Cloudflare egress throttling that hits the public node), then the public
  // default. The scheduled call site passes no arg, so production honors
  // BASE_RPC_URL when set and falls back to the public RPC when it is not.
  const rpc = rpcUrl ?? env.BASE_RPC_URL ?? DEFAULT_BASE_RPC;
  const cursorRaw = (await env.TENSORFEED_CACHE.get(KV_KEY_CURSOR, 'json')) as IndexerCursor | null;
  const currentBlock = await getCurrentBlock(rpc, fetchFn);

  if (!cursorRaw) {
    const nowStr = new Date().toISOString();
    await env.TENSORFEED_CACHE.put(
      KV_KEY_CURSOR,
      JSON.stringify({ block: currentBlock, ts: nowStr, last_run_at: nowStr }),
    );
    return { skipped: true, reason: 'cursor_initialized' };
  }

  const range = computeBlockRange(cursorRaw.block, currentBlock);
  if (!range) return { skipped: true, reason: 'no_blocks_to_process' };

  const walletMap = (await env.TENSORFEED_CACHE.get(KV_KEY_PUBLISHERS, 'json')) as Record<string, string> | null;
  if (!walletMap || Object.keys(walletMap).length === 0) {
    return { skipped: true, reason: 'no_publishers' };
  }

  const wallets = Object.keys(walletMap);
  const logs = await getTransferLogsForWallets(rpc, range.fromBlock, range.toBlock, wallets, fetchFn);

  const uniqueBlockNumbers = Array.from(new Set(logs.map((l) => l.blockNumber)));
  const blockTsMap = uniqueBlockNumbers.length > 0
    ? await getBlockTimestamps(rpc, uniqueBlockNumbers, fetchFn)
    : {};

  let count = 0;
  for (const log of logs) {
    const ts = blockTsMap[log.blockNumber];
    if (!ts) continue;
    const event = decodeTransferLog(log, ts, walletMap);
    if (!event) continue;
    await applyEventToRollups(env, event);
    count++;
  }

  const nowStr = new Date().toISOString();
  await env.TENSORFEED_CACHE.put(
    KV_KEY_CURSOR,
    JSON.stringify({ block: range.toBlock, ts: nowStr, last_run_at: nowStr }),
  );

  return { events: count, from: range.fromBlock, to: range.toBlock };
}

async function getCurrentBlock(rpcUrl: string, fetchFn: typeof fetch): Promise<number> {
  const res = await fetchFn(rpcUrl, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ jsonrpc: '2.0', method: 'eth_blockNumber', params: [], id: 1 }),
  });
  const data = (await res.json()) as { result: string };
  return parseInt(data.result, 16);
}

async function getTransferLogsForWallets(
  rpcUrl: string,
  fromBlock: number,
  toBlock: number,
  wallets: string[],
  fetchFn: typeof fetch,
): Promise<RpcLog[]> {
  const paddedWallets = wallets.map((w) => '0x' + w.toLowerCase().replace(/^0x/, '').padStart(64, '0'));
  const res = await fetchFn(rpcUrl, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      jsonrpc: '2.0',
      method: 'eth_getLogs',
      params: [{
        address: USDC_BASE_CONTRACT,
        topics: [TRANSFER_TOPIC, null, paddedWallets],
        fromBlock: '0x' + fromBlock.toString(16),
        toBlock: '0x' + toBlock.toString(16),
      }],
      id: 1,
    }),
  });
  const data = (await res.json()) as { result: RpcLog[]; error?: { message: string } };
  if (data.error) throw new Error(`eth_getLogs failed: ${data.error.message}`);
  return data.result;
}

async function getBlockTimestamps(
  rpcUrl: string,
  blockNumbers: string[],
  fetchFn: typeof fetch,
): Promise<Record<string, string>> {
  const map: Record<string, string> = {};
  const batch = blockNumbers.map((bn, idx) => ({
    jsonrpc: '2.0',
    method: 'eth_getBlockByNumber',
    params: [bn, false],
    id: idx,
  }));
  const res = await fetchFn(rpcUrl, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(batch),
  });
  const data = (await res.json()) as Array<{ id: number; result: { number: string; timestamp: string } | null }>;
  for (const item of data) {
    const block = item.result;
    if (block) {
      const ts = new Date(parseInt(block.timestamp, 16) * 1000).toISOString();
      map[block.number] = ts;
    }
  }
  return map;
}
