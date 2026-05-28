import { describe, it, expect } from 'vitest';
import { computeBlockRange, decodeTransferLog, type RpcLog } from './indexer';

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
