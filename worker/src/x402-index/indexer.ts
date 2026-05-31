import { REORG_SAFETY_BLOCKS, MAX_BLOCKS_PER_TICK, TRANSFER_TOPIC, USDC_DECIMALS, EVENT_TTL_SECONDS, KV_KEY_RECENT, RECENT_FEED_SIZE, TOP_PUBLISHERS_LIMIT, kvKeyDayRollup, kvKeyPubDayRollup, kvKeyEvent, DEFAULT_BASE_RPC, DEFAULT_GETLOGS_BLOCK_SPAN, MAX_GETLOGS_CALLS_PER_TICK, KV_KEY_CURSOR, KV_KEY_PUBLISHERS, USDC_BASE_CONTRACT, RPC_TIMEOUT_MS } from './constants';
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

// Split a block range into contiguous windows of at most maxSpan blocks each.
// A single tick's range can exceed the per-call eth_getLogs span limit of the
// configured RPC, so each window is fetched separately and the results are
// aggregated. Windows are inclusive and never overlap.
export function chunkBlockRange(fromBlock: number, toBlock: number, maxSpan: number): BlockRange[] {
  const chunks: BlockRange[] = [];
  let start = fromBlock;
  while (start <= toBlock) {
    const end = Math.min(toBlock, start + maxSpan - 1);
    chunks.push({ fromBlock: start, toBlock: end });
    start = end + 1;
  }
  return chunks;
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
  // RPC precedence: explicit arg (tests), then a dedicated BASE_INDEXER_RPC_URL,
  // then the keyed BASE_RPC_URL (payments RPC), then the public node. The public
  // node throttles the Worker's shared Cloudflare egress, so an anonymous default
  // is the LEAST reliable choice for a cron that must run unattended; a keyed
  // endpoint the Worker can actually reach is preferred. A keyed payments RPC may
  // cap eth_getLogs spans (some allow only 10 blocks), but the indexer now windows
  // each tick to BASE_RPC_GETLOGS_SPAN, so that cap is handled by chunking rather
  // than by avoiding the endpoint. For best results point BASE_INDEXER_RPC_URL at
  // a logs-friendly keyed endpoint (10k-span) and set BASE_RPC_GETLOGS_SPAN high.
  const rpc = rpcUrl ?? env.BASE_INDEXER_RPC_URL ?? env.BASE_RPC_URL ?? DEFAULT_BASE_RPC;
  const parsedSpan = env.BASE_RPC_GETLOGS_SPAN ? parseInt(env.BASE_RPC_GETLOGS_SPAN, 10) : NaN;
  const getLogsSpan = Number.isFinite(parsedSpan) && parsedSpan > 0 ? parsedSpan : DEFAULT_GETLOGS_BLOCK_SPAN;
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
  // Bound the eth_getLogs calls per tick. On a small-span RPC the range can fan
  // out to hundreds of windows; processing at most MAX_GETLOGS_CALLS_PER_TICK of
  // them keeps the tick inside the cron wall-clock budget and lets the cursor
  // checkpoint reliably. The remaining windows are picked up by the next tick.
  const windows = chunkBlockRange(range.fromBlock, range.toBlock, getLogsSpan).slice(0, MAX_GETLOGS_CALLS_PER_TICK);

  // Walk the range one bounded window at a time, checkpointing the cursor after
  // each fully-processed window. A window failure (rate limit, oversized span on
  // a misconfigured RPC) stops the tick but never loses ground: the next tick
  // resumes from the last good window instead of re-scanning from a frozen
  // cursor forever (the death-spiral this whole module guards against).
  let lastProcessed = cursorRaw.block;
  let count = 0;
  let tickError: unknown = null;

  for (const window of windows) {
    try {
      const logs = await getTransferLogsForWallets(rpc, window.fromBlock, window.toBlock, wallets, fetchFn);

      const uniqueBlockNumbers = Array.from(new Set(logs.map((l) => l.blockNumber)));
      const blockTsMap = uniqueBlockNumbers.length > 0
        ? await getBlockTimestamps(rpc, uniqueBlockNumbers, fetchFn)
        : {};

      for (const log of logs) {
        const ts = blockTsMap[log.blockNumber];
        if (!ts) continue;
        const event = decodeTransferLog(log, ts, walletMap);
        if (!event) continue;
        await applyEventToRollups(env, event);
        count++;
      }

      // Advance only after the window is fully applied, so the cursor never skips
      // an unscanned window. applyEventToRollups is idempotent, so re-running a
      // window whose error landed mid-apply does not double-count.
      lastProcessed = window.toBlock;
    } catch (err) {
      tickError = err;
      break;
    }
  }

  if (lastProcessed > cursorRaw.block) {
    const nowStr = new Date().toISOString();
    await env.TENSORFEED_CACHE.put(
      KV_KEY_CURSOR,
      JSON.stringify({ block: lastProcessed, ts: nowStr, last_run_at: nowStr }),
    );
  }

  // Surface the failure so the cron logs it, but only after the partial progress
  // is durably checkpointed above.
  if (tickError) throw tickError;

  return { events: count, from: range.fromBlock, to: lastProcessed };
}

async function getCurrentBlock(rpcUrl: string, fetchFn: typeof fetch): Promise<number> {
  // Bound the call: this runs before the per-window try/catch and before any
  // cursor checkpoint, so a stalled RPC here kills the whole tick with zero
  // progress. A timeout lets the call fail fast and the next tick recover.
  const ac = new AbortController();
  const timer = setTimeout(() => ac.abort(), RPC_TIMEOUT_MS);
  let res: Response;
  try {
    res = await fetchFn(rpcUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ jsonrpc: '2.0', method: 'eth_blockNumber', params: [], id: 1 }),
      signal: ac.signal,
    });
  } finally {
    clearTimeout(timer);
  }
  const data = (await res.json()) as { result?: string; error?: { message?: string } };
  // Validate explicitly. A throttled or rate-limited node returns a JSON-RPC
  // error (or a body with no `result`); blindly parseInt-ing it yields NaN, which
  // would flow into computeBlockRange as a NaN range, produce zero windows, and
  // freeze the cursor with no error logged. Throw instead so the cron surfaces it.
  if (data.error) throw new Error(`eth_blockNumber failed: ${data.error.message ?? 'rpc error'}`);
  const block = typeof data.result === 'string' ? parseInt(data.result, 16) : NaN;
  if (!Number.isFinite(block)) throw new Error(`eth_blockNumber failed: unparseable result ${JSON.stringify(data.result)}`);
  return block;
}

async function getTransferLogsForWallets(
  rpcUrl: string,
  fromBlock: number,
  toBlock: number,
  wallets: string[],
  fetchFn: typeof fetch,
): Promise<RpcLog[]> {
  const paddedWallets = wallets.map((w) => '0x' + w.toLowerCase().replace(/^0x/, '').padStart(64, '0'));
  // Bound the call so a stalled RPC fails fast within the tick instead of
  // burning the cron budget. The thrown abort is caught by the tick's per-window
  // try/catch, which checkpoints prior progress before surfacing the error.
  const ac = new AbortController();
  const timer = setTimeout(() => ac.abort(), RPC_TIMEOUT_MS);
  let res: Response;
  try {
    res = await fetchFn(rpcUrl, {
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
      signal: ac.signal,
    });
  } finally {
    clearTimeout(timer);
  }
  const data = (await res.json()) as { result?: RpcLog[]; error?: { message: string } };
  if (data.error) throw new Error(`eth_getLogs failed: ${data.error.message}`);
  // Validate the result like getCurrentBlock does. A throttled or proxy node can
  // return HTTP 200 with neither an `error` nor an array `result`; returning that
  // undefined would make the caller's logs.map throw a bare TypeError, which the
  // tick catches but leaves the cursor frozen on this window forever (the
  // stuck-cursor death spiral). A descriptive throw surfaces the malformed node
  // and still flows through the existing checkpoint-then-throw error path.
  if (!Array.isArray(data.result)) {
    throw new Error('eth_getLogs failed: non-array result ' + JSON.stringify(data.result));
  }
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
  // Bound the batch call so a stalled RPC fails fast within the tick. The thrown
  // abort lands in the tick's per-window try/catch, which checkpoints prior
  // progress before surfacing the error.
  const ac = new AbortController();
  const timer = setTimeout(() => ac.abort(), RPC_TIMEOUT_MS);
  let res: Response;
  try {
    res = await fetchFn(rpcUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(batch),
      signal: ac.signal,
    });
  } finally {
    clearTimeout(timer);
  }
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
