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
): Promise<{ applied: number; scanned: number }> {
  const rpc = env.BASE_RPC_URL ?? DEFAULT_BASE_RPC;
  let applied = 0;
  let scanned = 0;
  let pageKey: string | undefined;

  // Paginate the address-filtered transfer history. Tolerate a page failure
  // (HTTP error, RPC error, malformed body) by returning what has been applied
  // so far: the backfill is re-runnable and the dedup guard makes a retry safe.
  for (;;) {
    const params: Record<string, unknown> = {
      fromBlock: '0x' + fromBlock.toString(16),
      toBlock: 'latest',
      toAddress: wallet,
      contractAddresses: [USDC_BASE_CONTRACT],
      category: ['erc20'],
      withMetadata: true,
      excludeZeroValue: true,
      maxCount: '0x3e8',
    };
    if (pageKey) params.pageKey = pageKey;

    let data: RpcResponse;
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
      });
      if (!res.ok) break;
      data = (await res.json()) as RpcResponse;
    } catch {
      break;
    }
    if (data.error || !data.result) break;

    const transfers = data.result.transfers ?? [];
    for (const t of transfers) {
      scanned += 1;
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

    pageKey = data.result.pageKey;
    if (!pageKey) break;
  }

  return { applied, scanned };
}

// Backfill every curated wallet from roughly `days` days before the current
// indexer cursor. One paginated address-filtered scan per wallet, idempotent via
// the per-event dedup. Returns the wallet count and the total settlements applied.
export async function backfillCuratedWallets(
  env: Env,
  days = 30,
): Promise<{ wallets: number; applied: number }> {
  const walletMap = (await env.TENSORFEED_CACHE.get(KV_KEY_PUBLISHERS, 'json')) as Record<string, string> | null;
  if (!walletMap || Object.keys(walletMap).length === 0) {
    return { wallets: 0, applied: 0 };
  }

  const cursor = (await env.TENSORFEED_CACHE.get(KV_KEY_CURSOR, 'json')) as IndexerCursor | null;
  const cursorBlock = cursor?.block ?? 0;
  const fromBlock = Math.max(0, cursorBlock - days * BLOCKS_PER_DAY);

  let applied = 0;
  const entries = Object.entries(walletMap);
  for (const [wallet, domain] of entries) {
    const r = await backfillWallet(env, wallet, domain, fromBlock);
    applied += r.applied;
  }

  return { wallets: entries.length, applied };
}
