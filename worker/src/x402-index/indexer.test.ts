import { describe, it, expect } from 'vitest';
import { computeBlockRange } from './indexer';

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
