import { REORG_SAFETY_BLOCKS } from './constants';

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
