export const USDC_BASE_CONTRACT = '0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913';
export const USDC_DECIMALS = 6;
export const TRANSFER_TOPIC = '0xddf252ad1be2c89b69c2b068fc378daa952ba7f163c4a11628f55a4df523b3ef';
export const DEFAULT_BASE_RPC = 'https://mainnet.base.org';
export const REORG_SAFETY_BLOCKS = 30;
export const RECENT_FEED_SIZE = 100;
export const EVENT_TTL_SECONDS = 90 * 24 * 60 * 60;
export const PUBLISHER_DELIST_GRACE_DAYS = 7;
export const TOP_PUBLISHERS_LIMIT = 10;

export const SEED_PUBLISHERS: string[] = [
  'tensorfeed.ai',
  'terminalfeed.io',
];

export const KV_KEY_CURSOR = 'x402-idx:cursor';
export const KV_KEY_PUBLISHERS = 'x402-idx:publishers';
export const KV_KEY_RECENT = 'x402-idx:recent';
export const kvKeyPublisher = (domain: string) => `x402-idx:publisher:${domain}`;
export const kvKeyDayRollup = (date: string) => `x402-idx:day:${date}`;
export const kvKeyPubDayRollup = (domain: string, date: string) => `x402-idx:pub:${domain}:day:${date}`;
export const kvKeyEvent = (txHash: string) => `x402-idx:event:${txHash.toLowerCase()}`;
