import { REORG_SAFETY_BLOCKS, TRANSFER_TOPIC, USDC_DECIMALS, EVENT_TTL_SECONDS, KV_KEY_RECENT, RECENT_FEED_SIZE, TOP_PUBLISHERS_LIMIT, kvKeyDayRollup, kvKeyPubDayRollup, kvKeyEvent } from './constants';
import type { SettlementEvent, DailyRollup, PublisherDailyRollup } from './types';
import type { Env } from '../types';

export interface BlockRange {
  fromBlock: number;
  toBlock: number;
}

export function computeBlockRange(cursorBlock: number, currentBlock: number): BlockRange | null {
  const safeTo = currentBlock - REORG_SAFETY_BLOCKS;
  if (safeTo <= cursorBlock) return null;
  return {
    fromBlock: cursorBlock + 1,
    toBlock: safeTo,
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
