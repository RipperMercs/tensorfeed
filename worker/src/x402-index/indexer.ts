import { REORG_SAFETY_BLOCKS, TRANSFER_TOPIC, USDC_DECIMALS } from './constants';
import type { SettlementEvent } from './types';

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
