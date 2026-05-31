import {
  DEFAULT_BASE_RPC,
  USDC_BASE_CONTRACT,
  USDC_DECIMALS,
  KV_KEY_PUBLISHERS,
  KV_KEY_CURSOR,
  kvKeyEvent,
} from './constants';
import { applyEventToRollups, fromMicroUnits, formatDecimal, toMicroUnits } from './indexer';
import type { SettlementEvent, IndexerCursor } from './types';
import type { Env } from '../types';

// One Base block is roughly 2 seconds, so a day is about 43,200 blocks. Used to
// translate a "days back" backfill window into a block height the address-filtered
// transfer scan starts from.
const BLOCKS_PER_DAY = 43200;

// Bound the per-wallet transfer scan so a high-traffic address (one receiving lots
// of inbound USDC beyond x402 settlements) cannot walk pages without end. A few
// small pages are plenty to confirm a wallet settles; the hard deadline below is
// the real guard, this just keeps each wallet's inner loop short.
const DEFAULT_MAX_PAGES = 5;

// Transfers per Alchemy page. Deliberately small: every transfer costs one
// sequential KV dedup read, so a 1000-row page on a busy address is exactly what
// hung the scan. 100 keeps a single page cheap and the deadline check frequent.
const PAGE_SIZE = '0x64';

// Abort a single Alchemy page request that stalls, so one unresponsive call breaks
// the wallet scan instead of hanging the whole backfill on an open socket.
const PAGE_TIMEOUT_MS = 15_000;

// An asset transfer as returned by alchemy_getAssetTransfers. Only the fields the
// backfill consumes are typed; the upstream payload carries more.
interface AssetTransfer {
  hash: string;
  blockNum: string;
  from?: string;
  metadata?: { blockTimestamp?: string };
  value?: number;
  rawContract?: { value?: string; address?: string; decimal?: string };
}

interface GetAssetTransfersResult {
  transfers?: AssetTransfer[];
  pageKey?: string;
}

interface RpcResponse {
  result?: GetAssetTransfersResult;
  error?: { message?: string };
}

// Derive the USDC amount as the same decimal-string format the forward indexer
// writes to volume_usdc. The indexer reads the raw on-chain log value (micro
// units) and runs it through formatDecimal/fromMicroUnits. The backfill mirrors
// that exactly: prefer the transfer's rawContract.value (a hex micro-unit string,
// identical to the log data the indexer decodes), and only fall back to the
// human-decimal `value` field when the raw value is absent. This keeps a
// backfilled day byte-identical to a forward-indexed day so the two data paths
// add up consistently.
function amountUsdcFromTransfer(t: AssetTransfer): string {
  const raw = t.rawContract?.value;
  if (typeof raw === 'string' && raw.length > 0) {
    return fromMicroUnits(BigInt(raw));
  }
  if (typeof t.value === 'number' && Number.isFinite(t.value)) {
    // value is a whole-USDC decimal number; scale to micro units the same way
    // toMicroUnits parses a decimal string, so the formatted result matches.
    return fromMicroUnits(toMicroUnits(t.value.toFixed(USDC_DECIMALS)));
  }
  return formatDecimal(0n, USDC_DECIMALS);
}

// Backfill a single curated wallet by replaying its inbound USDC transfer history
// into the per-publisher-day and per-day rollups. Best-effort and idempotent:
// every transfer is deduped on kvKeyEvent before it is applied, so re-running the
// backfill (or overlapping with the forward indexer) never double-counts. Returns
// how many new settlements were applied and how many transfers were scanned.
export async function backfillWallet(
  env: Env,
  wallet: string,
  domain: string,
  fromBlock: number,
  fetchFn: typeof fetch = fetch,
  maxPages: number = DEFAULT_MAX_PAGES,
  deadlineAt: number = Infinity,
): Promise<{ applied: number; scanned: number; truncated: boolean }> {
  // RPC precedence mirrors runIndexerTick: a dedicated BASE_INDEXER_RPC_URL first,
  // then the keyed BASE_RPC_URL (payments RPC), then the public node. This method is
  // alchemy_getAssetTransfers, an Alchemy-namespaced call. BASE_RPC_URL is a
  // small-limit non-Alchemy payments RPC and the public DEFAULT_BASE_RPC does not
  // implement the method at all, so resolving to either of those silently returns
  // zero transfers. BASE_INDEXER_RPC_URL is the keyed Alchemy endpoint documented in
  // wrangler.toml and is the only one that actually supports this scan.
  const rpc = env.BASE_INDEXER_RPC_URL ?? env.BASE_RPC_URL ?? DEFAULT_BASE_RPC;
  let applied = 0;
  let scanned = 0;
  let pages = 0;
  let truncated = false;
  let pageKey: string | undefined;

  // Paginate the address-filtered transfer history. Tolerate a page failure
  // (HTTP error, RPC error, malformed body) by returning what has been applied
  // so far: the backfill is re-runnable and the dedup guard makes a retry safe.
  for (;;) {
    // Hard wall-clock budget, checked before each page so a busy wallet cannot run
    // past the deadline the orchestrator shares across all wallets.
    if (Date.now() > deadlineAt) {
      truncated = true;
      break;
    }
    const params: Record<string, unknown> = {
      fromBlock: '0x' + fromBlock.toString(16),
      toBlock: 'latest',
      toAddress: wallet,
      contractAddresses: [USDC_BASE_CONTRACT],
      category: ['erc20'],
      withMetadata: true,
      excludeZeroValue: true,
      maxCount: PAGE_SIZE,
    };
    if (pageKey) params.pageKey = pageKey;

    let data: RpcResponse;
    const ac = new AbortController();
    const timer = setTimeout(() => ac.abort(), PAGE_TIMEOUT_MS);
    try {
      const res = await fetchFn(rpc, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          jsonrpc: '2.0',
          method: 'alchemy_getAssetTransfers',
          params: [params],
          id: 1,
        }),
        signal: ac.signal,
      });
      if (!res.ok) {
        // Surface the silent no-op in wrangler tail. Still best-effort: break and
        // return progress, do not throw.
        console.warn(JSON.stringify({ event: 'backfill_rpc_error', wallet, message: `http ${res.status}` }));
        break;
      }
      data = (await res.json()) as RpcResponse;
    } catch (err) {
      // A timed-out (aborted) page lands here too, surfaced as the same best-effort
      // break so a stalled call never hangs the run.
      const message = err instanceof Error ? err.message : String(err);
      console.warn(JSON.stringify({ event: 'backfill_rpc_error', wallet, message }));
      break;
    } finally {
      clearTimeout(timer);
    }
    if (data.error || !data.result) {
      console.warn(JSON.stringify({ event: 'backfill_rpc_error', wallet, message: data.error?.message ?? 'missing result' }));
      break;
    }

    const transfers = data.result.transfers ?? [];
    let hitDeadline = false;
    for (const t of transfers) {
      scanned += 1;
      // Re-check the budget inside the page. The dedup read below is the per-transfer
      // cost and Date.now() advances on it, so this bounds a single page too.
      if ((scanned & 31) === 0 && Date.now() > deadlineAt) {
        truncated = true;
        hitDeadline = true;
        break;
      }
      const ts = t.metadata?.blockTimestamp;
      if (!ts) continue;
      const tx = String(t.hash).toLowerCase();

      // Dedup before applying so a transfer already counted by the forward
      // indexer (or a prior backfill page) is never double-billed.
      const alreadyApplied = await env.TENSORFEED_CACHE.get(kvKeyEvent(tx));
      if (alreadyApplied) continue;

      const event: SettlementEvent = {
        tx_hash: tx,
        block: parseInt(t.blockNum, 16) || fromBlock,
        ts,
        from_address: (t.from ?? '').toLowerCase(),
        to_address: wallet.toLowerCase(),
        amount_usdc: amountUsdcFromTransfer(t),
        publisher_domain: domain,
        asset: 'USDC',
        chain: 'base',
      };

      // Reuse the indexer's single-event apply so a backfilled rollup is written
      // by the exact same code path (same volume_usdc format, same top_publishers
      // handling, same event marker and TTL) as a forward-indexed one.
      await applyEventToRollups(env, event);
      applied += 1;
    }

    if (hitDeadline) break;
    pages += 1;
    pageKey = data.result.pageKey;
    if (!pageKey) break;
    if (pages >= maxPages) {
      // Page ceiling hit: a high-traffic wallet. Stop with what we have rather than
      // scan unbounded; the per-event dedup makes a later re-run safe and resumable.
      console.warn(JSON.stringify({ event: 'backfill_truncated', wallet, pages, scanned }));
      truncated = true;
      break;
    }
  }

  return { applied, scanned, truncated };
}

// Backfill every curated wallet from roughly `days` days before the current
// indexer cursor. One paginated address-filtered scan per wallet, idempotent via
// the per-event dedup. Returns the wallet count and the total settlements applied.
export async function backfillCuratedWallets(
  env: Env,
  days = 30,
  deadlineMs = 40_000,
): Promise<{ wallets: number; completed: number; applied: number; scanned: number; truncated: number }> {
  const walletMap = (await env.TENSORFEED_CACHE.get(KV_KEY_PUBLISHERS, 'json')) as Record<string, string> | null;
  if (!walletMap || Object.keys(walletMap).length === 0) {
    return { wallets: 0, completed: 0, applied: 0, scanned: 0, truncated: 0 };
  }

  const cursor = (await env.TENSORFEED_CACHE.get(KV_KEY_CURSOR, 'json')) as IndexerCursor | null;
  const cursorBlock = cursor?.block ?? 0;
  const fromBlock = Math.max(0, cursorBlock - days * BLOCKS_PER_DAY);

  // One absolute wall-clock deadline shared by this loop AND passed into each wallet
  // scan, so neither the wallet sequence nor any single wallet's inner loop can run
  // past it. Wallets not reached are backfilled on the next run; the per-event dedup
  // makes that safe, resumable, and free of double-counts.
  const deadlineAt = Date.now() + deadlineMs;
  let applied = 0;
  let scanned = 0;
  let truncated = 0;
  let completed = 0;
  const entries = Object.entries(walletMap);
  for (const [wallet, domain] of entries) {
    if (Date.now() > deadlineAt) {
      console.warn(JSON.stringify({ event: 'backfill_deadline', completed, total: entries.length }));
      break;
    }
    const r = await backfillWallet(env, wallet, domain, fromBlock, fetch, DEFAULT_MAX_PAGES, deadlineAt);
    applied += r.applied;
    scanned += r.scanned;
    if (r.truncated) truncated += 1;
    completed += 1;
  }

  return { wallets: entries.length, completed, applied, scanned, truncated };
}
