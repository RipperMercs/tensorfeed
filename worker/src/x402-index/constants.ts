export const USDC_BASE_CONTRACT = '0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913';
export const USDC_DECIMALS = 6;
export const TRANSFER_TOPIC = '0xddf252ad1be2c89b69c2b068fc378daa952ba7f163c4a11628f55a4df523b3ef';
export const DEFAULT_BASE_RPC = 'https://mainnet.base.org';
export const REORG_SAFETY_BLOCKS = 30;
// Max blocks a single tick will scan in one eth_getLogs call. The public Base
// RPC rejects eth_getLogs spans wider than 10,000 blocks (error -32614), and a
// wide span is also the heaviest query, the first to be rate limited from the
// shared Cloudflare egress. Capping the per-tick span keeps every query small
// and accepted, and lets the indexer catch up incrementally over several ticks
// after an outage instead of stalling forever on one oversized request. At a
// ~5-minute cadence on ~2-second Base blocks, normal operation accrues ~150
// blocks per tick, so this 2,000 ceiling is only ever hit while catching up.
export const MAX_BLOCKS_PER_TICK = 2000;
// Max blocks per single eth_getLogs request. Distinct from MAX_BLOCKS_PER_TICK
// (how far the cursor advances per tick): some RPC providers cap the span of one
// getLogs call (a few keyed free tiers allow only 10 blocks). The indexer windows
// each tick's range into chunks of this size, so it stays within whatever limit
// the configured RPC enforces. The public Base node allows 10,000, so this 2,000
// default is a single call per tick there; lower it via BASE_RPC_GETLOGS_SPAN to
// match a small-limit RPC.
export const DEFAULT_GETLOGS_BLOCK_SPAN = 2000;
// Max eth_getLogs calls a single tick will make. On a small-span RPC (10-block
// limit) a 2000-block tick would otherwise fan out to 200 sequential calls,
// risking the cron wall-clock budget and the RPC rate limit. Capping the calls
// bounds each tick to a fast, reliably-checkpointed unit of work; the next tick
// resumes from the new cursor. On a wide-span RPC each tick is a single call, so
// this cap is never reached. Sized from measured production wall-time once the
// concurrent-dispatch bug was fixed: a clean 50-call tick ran ~5.8s (20ms CPU) at
// ~8.6 calls/sec without throttling, so 120 calls is ~14s wall at the same safe
// rate, well within the cron budget, and roughly halves backfill time vs 50.
export const MAX_GETLOGS_CALLS_PER_TICK = 120;
export const RECENT_FEED_SIZE = 100;
export const EVENT_TTL_SECONDS = 90 * 24 * 60 * 60;
export const PUBLISHER_DELIST_GRACE_DAYS = 7;
export const TOP_PUBLISHERS_LIMIT = 10;

export const SEED_PUBLISHERS: string[] = [
  'tensorfeed.ai',
  'terminalfeed.io',
];

export interface ManualPublisher {
  domain: string;
  wallets: string[];
  note: string;
}

// Publishers with known Base payTo wallets that do NOT expose a crawlable
// /.well-known/x402.json manifest (discovery-dark). The daily crawl cannot
// find them, so their wallets are seeded here by hand from the live 402
// challenge of their paid endpoint. Attribution is only as strong as that
// observation: if a publisher routes through a shared facilitator wallet rather
// than a dedicated one, settlements to it may include other merchants. Verify
// each wallet against the live 402 before adding, and re-verify on dispute.
export const MANUAL_PUBLISHERS: ManualPublisher[] = [
  {
    domain: 'x402.tavily.com',
    // Sourced 2026-05-29 from the 402 challenge of POST https://x402.tavily.com/search
    // (scheme exact, eip155:8453, USDC, 10000 micro = $0.01 advanced search).
    // Tavily exposes no /.well-known/x402.json, /discovery/resources, or
    // agent-card, so the manifest crawl returns HTTP 404 for it.
    wallets: ['0xc78f83c13ba79be3781e7c5f658d1341729515b0'],
    note: 'Manually seeded from the live x402.tavily.com 402 challenge (no public manifest). Attribution is observation-based; re-verify on dispute.',
  },
];

export const KV_KEY_CURSOR = 'x402-idx:cursor';
export const KV_KEY_PUBLISHERS = 'x402-idx:publishers';
export const KV_KEY_RECENT = 'x402-idx:recent';
export const kvKeyPublisher = (domain: string) => `x402-idx:publisher:${domain}`;
export const kvKeyDayRollup = (date: string) => `x402-idx:day:${date}`;
export const kvKeyPubDayRollup = (domain: string, date: string) => `x402-idx:pub:${domain}:day:${date}`;
export const kvKeyEvent = (txHash: string) => `x402-idx:event:${txHash.toLowerCase()}`;
