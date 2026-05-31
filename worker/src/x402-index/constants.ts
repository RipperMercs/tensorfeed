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
// Abort a single indexer RPC call that stalls. The hot 5-minute cron makes up to
// MAX_GETLOGS_CALLS_PER_TICK sequential getLogs+getBlockByNumber pairs per tick;
// without a per-call timeout one stalled-but-accepting RPC socket burns the whole
// cron invocation budget and freezes forward progress until the RPC recovers.
// Matches backfill.ts PAGE_TIMEOUT_MS so both paths fail fast at the same bound.
export const RPC_TIMEOUT_MS = 15_000;
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
  // ==== x402 verified-publisher directory additions, sourced 2026-05-30 ====
  // Verification key: "Bazaar" = Coinbase CDP x402 discovery facilitator
  // (api.cdp.coinbase.com/platform/v2/x402/discovery/resources), the authoritative
  // public registry. "live 402" = read directly from the endpoint's 402 accepts[].
  // "manifest" = /.well-known/x402.json accepts[] (not at the path the crawler reads,
  // so seeded here). All payTo are Base eip155:8453 USDC, lowercased.
  { domain: 'api.exa.ai', wallets: ['0x6d6e695b09861467c7d462f5aaf31cf3540b9192'], note: 'Exa AI search. Base USDC payTo confirmed 2026-05-30 from the live 402 of POST https://api.exa.ai/search and cross-checked against Coinbase Bazaar discovery. Re-verify on dispute.' },
  { domain: 'x402.quicknode.com', wallets: ['0xf46394addda95a3d5bcc1124605e3d15d204623c'], note: 'QuickNode RPC. Base USDC payTo confirmed 2026-05-30 from the live 402 of POST https://x402.quicknode.com/base-mainnet and Coinbase Bazaar discovery. Re-verify on dispute.' },
  { domain: 'agent-proxy.alchemy.com', wallets: ['0xb15a55e85fdf5edc41b6c1eaf7813e2c6e6def59'], note: 'Alchemy agent proxy. Base USDC payTo confirmed 2026-05-30 from the live 402 of its /v1/x402 swap-quote endpoint and Coinbase Bazaar discovery. Re-verify on dispute.' },
  { domain: 'agents.allium.so', wallets: ['0xb5a7f25bac5152a71838d3e16f566d6b0f13a370'], note: 'Allium on-chain data. Base USDC payTo read 2026-05-30 from the live 402 of POST https://agents.allium.so/api/v1/explorer/queries/run-async. Note: live wallet differs from the Bazaar-listed one; live challenge taken as authoritative. Re-verify on dispute.' },
  { domain: 'pro-api.coingecko.com', wallets: ['0x110cdbba7fe6434ec4ce3464cc523942ad6fb784'], note: 'CoinGecko Pro x402 endpoints. Base USDC payTo from Coinbase Bazaar discovery 2026-05-30. Re-verify on dispute.' },
  { domain: 'public.zapper.xyz', wallets: ['0x43a2a720cd0911690c248075f4a29a5e7716f758'], note: 'Zapper portfolio x402. Base USDC payTo from Coinbase Bazaar discovery 2026-05-30. Re-verify on dispute.' },
  { domain: 'x402.telnyx.com', wallets: ['0x19a78b27a28ed93c3c914878bde7f2f843afaea8'], note: 'Telnyx LLM x402. Base USDC payTo from Coinbase Bazaar discovery 2026-05-30. Re-verify on dispute.' },
  { domain: 'nichedata.dev', wallets: ['0xcafe605dfeba96ba84c2d520e3cf972cac184e3a'], note: 'KDP niche-research intelligence. Base USDC payTo read 2026-05-30 from its /.well-known/x402.json resources[].accepts[] (not at the path the crawler reads). Re-verify on dispute.' },
  { domain: 'x402engine.app', wallets: ['0x7dd5be069f2d2ead75ec7c3423b116ff043c2629'], note: 'Multi-model LLM and tool gateway. Base USDC payTo read 2026-05-30 from its /.well-known/x402.json (routes and services). Same wallet on Base and megaeth. Re-verify on dispute.' },
  { domain: 'agent.news', wallets: ['0xc0900bc3ed4520b761012ca75164d0d4746124bc'], note: 'Agent news API. Base USDC payTo read 2026-05-30 from its /.well-known/x402.json top-level payTo and confirmed in Coinbase Bazaar discovery. Re-verify on dispute.' },
  { domain: 'policycheck.tools', wallets: ['0x5feb3281d7e81ea5e55aaea96639daaca5d601c1'], note: 'Policy and compliance checks. Base USDC payTo read 2026-05-30 from its /.well-known/x402.json resources[].accepts[] and confirmed in Coinbase Bazaar discovery. Re-verify on dispute.' },
  { domain: 'tooloracle.io', wallets: ['0x4a4b1f45a00892542ac62562d1f2c62f579e4945'], note: 'Tool oracle. Base USDC payTo read 2026-05-30 from its /.well-known/x402.json (manifest wallet; differs from the Bazaar-listed wallet, manifest taken as authoritative). Re-verify on dispute.' },
  { domain: 'socialintel.dev', wallets: ['0xb1acd9e0269023546074400a434e703b646aabba'], note: 'Instagram influencer search. Base USDC payTo confirmed 2026-05-30 from the live 402 of GET https://socialintel.dev/v1/search and Coinbase Bazaar discovery. Re-verify on dispute.' },
  { domain: 'api.bitfence.ai', wallets: ['0x7f6fa471726c35321b58704bd2a440d405767bfd'], note: 'BitFence security MCP. Base USDC payTo from Coinbase Bazaar discovery 2026-05-30. Re-verify on dispute.' },
  { domain: 'api.justaname.id', wallets: ['0xc529edd6d47c60923902514c7c0b3993ae42c2ec'], note: 'JustaName ENS and identity. Base USDC payTo from Coinbase Bazaar discovery 2026-05-30. Re-verify on dispute.' },
  { domain: 'api.munition.io', wallets: ['0x54d6c2c08e10f1a1d3da88df513bbe9bcf1a4afa'], note: 'Munition flight search. Base USDC payTo from Coinbase Bazaar discovery 2026-05-30. Re-verify on dispute.' },
  { domain: 'docpull.ai', wallets: ['0x9ca11f04cc1a89abc641a88c97b6f4a7afccfb86'], note: 'DocPull document extraction. Base USDC payTo from Coinbase Bazaar discovery 2026-05-30. Re-verify on dispute.' },
  { domain: 'jsonrecon.com', wallets: ['0xc1726e09aea4b9b967353b7b56890955e9e5bc2c'], note: 'JSON extraction. Base USDC payTo from Coinbase Bazaar discovery 2026-05-30. Re-verify on dispute.' },
  { domain: 'minifetch.com', wallets: ['0xffa9155a0e4b3d8d42351da226cc1feee449686f'], note: 'URL preview and extract. Base USDC payTo from Coinbase Bazaar discovery 2026-05-30. Re-verify on dispute.' },
  { domain: 'img402.dev', wallets: ['0x77f3c9bcb898ad1d30e9a336e2cc3108d88d6c09'], note: 'Image hosting for agents. Base USDC payTo from Coinbase Bazaar discovery 2026-05-30. Re-verify on dispute.' },
  { domain: 'hirescrape.com', wallets: ['0xb5194a98dbdbb7028b585db26b972e7f0f3f826a'], note: 'LinkedIn scraping. Base USDC payTo from Coinbase Bazaar discovery 2026-05-30. Re-verify on dispute.' },
  { domain: 'search.reversesandbox.com', wallets: ['0x5770e66181984aa8510777790016b64aeda4f8b2'], note: 'Web search. Base USDC payTo from Coinbase Bazaar discovery 2026-05-30. Re-verify on dispute.' },
  { domain: 'polynews.news', wallets: ['0x6ee49a7872844397fb52870cc07b308ffadc9427'], note: 'Polymarket arbitrage news. Base USDC payTo from Coinbase Bazaar discovery 2026-05-30. Re-verify on dispute.' },
  { domain: 'regimeshift.xyz', wallets: ['0x82b17d0bb4de9ae6c3491257b60e8245e70acd7b'], note: 'Macro and rate data. Base USDC payTo from Coinbase Bazaar discovery 2026-05-30. Re-verify on dispute.' },
  { domain: 'api.dripmetrics.ai', wallets: ['0xc9b70d8d342609437bc87ec3c877911a306d3e6a'], note: 'DeFi VPIN metrics. Base USDC payTo from Coinbase Bazaar discovery 2026-05-30. Re-verify on dispute.' },
  { domain: 'api.lastlookdata.com', wallets: ['0xb4848d1b4b7e31b75b9b30d717f89777dc65d68e'], note: 'FX series data. Base USDC payTo from Coinbase Bazaar discovery 2026-05-30. Re-verify on dispute.' },
  { domain: 'api.stocktrends.com', wallets: ['0xaeeb8eabdc05532a26123045f99d208eb1cc00ab'], note: 'Stock trend signals. Base USDC payTo from Coinbase Bazaar discovery 2026-05-30. Re-verify on dispute.' },
  { domain: 'pubmed.sekgen.xyz', wallets: ['0x8c05121c9617f8960cf5b7451103192f32de8dde'], note: 'PubMed trends. Base USDC payTo from Coinbase Bazaar discovery 2026-05-30. Re-verify on dispute.' },
  { domain: 'trader.rigoblock.com', wallets: ['0xa0f9c380ad1e1be09046319fd907335b2b452b37'], note: 'RigoBlock trading tools. Base USDC payTo from Coinbase Bazaar discovery 2026-05-30. Re-verify on dispute.' },
  { domain: 'vu.velvetdao.xyz', wallets: ['0xd8ca10c55296bd8ca1dd409ea2f0fa72fb0c643f'], note: 'VelvetDAO trending tokens. Base USDC payTo from Coinbase Bazaar discovery 2026-05-30. Re-verify on dispute.' },
  { domain: 'library.proofivy.com', wallets: ['0x859af250df0b68bfd0768ca22142a1afa0abeaf4'], note: 'Proofivy content library. Base USDC payTo from Coinbase Bazaar discovery 2026-05-30. Re-verify on dispute.' },
  { domain: 'verify.agentutil.net', wallets: ['0x1357bef96ec515d250137d7eb712f0395eb5142d'], note: 'Agent verification utility. Base USDC payTo from Coinbase Bazaar discovery 2026-05-30. Re-verify on dispute.' },
  { domain: 'x402.fiasignals.com', wallets: ['0x8d32c6a3ee3fb8a8b4c5378f7c5a26cc320a853f'], note: 'FIA token-safety signals. Base USDC payTo from Coinbase Bazaar discovery 2026-05-30. Re-verify on dispute.' },
  { domain: 'x402.blocknotify.com', wallets: ['0xd1c1931e3740371033c994df775bde553a99366f'], note: 'BlockNotify token resolver. Base USDC payTo from Coinbase Bazaar discovery 2026-05-30. Re-verify on dispute.' },
  { domain: 'svm402.com', wallets: ['0xdd8c16002a967fbc039c1eabb6bc2db0d9ef6aed'], note: 'Base token risk reports. Base USDC payTo from Coinbase Bazaar discovery 2026-05-30. Re-verify on dispute.' },
];

export const KV_KEY_CURSOR = 'x402-idx:cursor';
export const KV_KEY_PUBLISHERS = 'x402-idx:publishers';
export const KV_KEY_RECENT = 'x402-idx:recent';
export const kvKeyPublisher = (domain: string) => `x402-idx:publisher:${domain}`;
export const kvKeyDayRollup = (date: string) => `x402-idx:day:${date}`;
export const kvKeyPubDayRollup = (domain: string, date: string) => `x402-idx:pub:${domain}:day:${date}`;
export const kvKeyEvent = (txHash: string) => `x402-idx:event:${txHash.toLowerCase()}`;

// A publisher counts as actively settling if its most recent observed
// settlement is within this many days; older verified publishers are 'quiet'.
export const ACTIVE_DAYS = 14;

// Precomputed verified-directory blob (written daily, served by /api/x402-index/verified).
export const KV_KEY_VERIFIED = 'x402-idx:verified';

// The full curated publisher set the directory classifies: crawlable seeds plus
// hand-seeded discovery-dark publishers. Deduped, manual domains appended only
// if not already a seed.
export function curatedDomains(): string[] {
  const out = [...SEED_PUBLISHERS];
  for (const m of MANUAL_PUBLISHERS) {
    if (!out.includes(m.domain)) out.push(m.domain);
  }
  return out;
}
