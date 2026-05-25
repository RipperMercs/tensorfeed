export interface Env {
  TENSORFEED_NEWS: KVNamespace;
  TENSORFEED_STATUS: KVNamespace;
  TENSORFEED_CACHE: KVNamespace;
  // Workers AI binding for news-history Phase B clustering
  // (worker/src/news-clustering.ts). Used to embed article titles +
  // snippets via @cf/baai/bge-base-en-v1.5 on the daily clustering
  // cron. Optional binding; module skips gracefully if unset (e.g.
  // in unit-test environments).
  AI?: { run: (model: string, input: { text: string[] }) => Promise<{ data: number[][] }> };
  ENVIRONMENT: string;
  SITE_URL: string;
  INDEXNOW_KEY: string;
  X_API_KEY: string;
  X_API_SECRET: string;
  X_ACCESS_TOKEN: string;
  X_ACCESS_SECRET: string;
  GITHUB_TOKEN: string;
  RESEND_API_KEY: string;
  ALERT_EMAIL_TO: string;
  ALERT_EMAIL_FROM: string;
  // Agent payments (Phase 1)
  PAYMENT_WALLET: string;
  PAYMENT_ENABLED: string;
  BASE_RPC_URL?: string;
  // Cross-Worker validate-and-charge (sister-site integration)
  SHARED_INTERNAL_SECRET?: string;
  // Pages Functions middleware -> Worker bot-hit ingest auth
  PAGES_TRACK_SECRET?: string;
  // OFAC sanctions screening (Chainalysis public sanctions API)
  CHAINALYSIS_API_KEY?: string;
  // Persistent OFAC block audit log (optional, 7-year retention per privacy policy)
  OFAC_AUDIT_LOG?: KVNamespace;
  // R2 bucket for weekly KV backups (Layer 1 of the disaster recovery
  // plan). Optional binding; backup module no-ops if missing.
  BACKUPS_R2?: R2Bucket;
  // R2 bucket for rolling hourly snapshots (worker/src/snapshots.ts).
  // Migrated off KV on 2026-05-12 to preserve the KV write/month bundle
  // for hot-path writes. Optional binding; module falls back to KV reads
  // if missing (so a deploy with a stale wrangler.toml degrades gracefully).
  SNAPSHOTS_R2?: R2Bucket;
  // Workers Analytics Engine: honeypot hit records. Replaces the 2-KV-
  // write-per-hit pattern in honeypot.ts (record + index). Free with
  // Workers Paid, 25M datapoints/mo. Read via SQL API (set up later).
  HONEYPOT_AE?: AnalyticsEngineDataset;
  // Workers Analytics Engine: hosted MCP endpoint tool call telemetry.
  // Replaces the per-call KV counter in mcp-activity.ts. Read via SQL
  // API; until that's wired the /api/mcp/activity dashboard shows
  // zeros for hosted_endpoint (npm download counts remain the primary
  // signal).
  MCP_TOOL_CALLS_AE?: AnalyticsEngineDataset;
  // Admin-only routes auth. REQUIRED in production. Set via:
  //   wrangler secret put ADMIN_KEY
  // Used by /api/admin/* and /api/refresh. Replaces the previous
  // ?key=ENVIRONMENT pattern, which was unsafe once the repo went
  // public (ENVIRONMENT="production" lives in wrangler.toml).
  ADMIN_KEY?: string;
  // Separate key for the high-blast-radius /api/admin/ai-cves/ingest
  // endpoint (DP CC's POST surface). Privilege-separated from ADMIN_KEY
  // 2026-05-25 so a leaked ADMIN_KEY (telemetry, dashboards, refresh
  // scripts) cannot inject papers into production KV. Transition: while
  // INGEST_KEY is unset, ai-cves ingest falls back to ADMIN_KEY so the
  // rollout doesn't break DP CC's existing config. Once Evan provisions
  // INGEST_KEY via `wrangler secret put INGEST_KEY <value>` and updates
  // DP CC's contract, the fallback is dead code.
  INGEST_KEY?: string;
  // Kill switch for non-critical KV writes. Persistent env-secret side
  // of the dual control surface implemented in kill-switch.ts. Set to
  // "true" via `wrangler secret put KILL_SWITCH_KV_WRITES` to no-op
  // every wrapped write until unset. Requires deploy to flip; the KV-
  // flag side (admin:kill-switch:kv-writes) supports runtime flipping
  // via /api/admin/kill-switch. EITHER set means kill switch is active.
  KILL_SWITCH_KV_WRITES?: string;
  // Active LLM endpoint probing. Each is independently optional;
  // probe.ts gracefully skips any provider whose key is unset, so the
  // module degrades to whichever providers you have keys for. Set with:
  //   wrangler secret put PROBE_ANTHROPIC_KEY
  //   wrangler secret put PROBE_OPENAI_KEY
  //   wrangler secret put PROBE_GOOGLE_KEY
  //   wrangler secret put PROBE_MISTRAL_KEY
  //   wrangler secret put PROBE_COHERE_KEY
  // Probe cost is roughly $0.05-0.10 per provider per month at 15-minute
  // sampling with single-token responses. Per-provider daily budget cap
  // is enforced in code via PROBE_MAX_DAILY_CALLS.
  PROBE_ANTHROPIC_KEY?: string;
  PROBE_OPENAI_KEY?: string;
  PROBE_GOOGLE_KEY?: string;
  PROBE_MISTRAL_KEY?: string;
  PROBE_COHERE_KEY?: string;
  // GPU pricing aggregation (worker/src/gpu-pricing.ts). Each key is
  // independently optional; gpu-pricing.ts skips a provider whose key
  // is unset. Vast.ai uses an unauthenticated public endpoint, so it
  // works with no secret. RunPod requires an API key. Set with:
  //   wrangler secret put RUNPOD_API_KEY
  RUNPOD_API_KEY?: string;
  // Semantic Scholar Graph API key (optional). The free tier is
  // unauthenticated and rate-limited to ~1 req/sec, which is plenty for the
  // daily cron. If you have a registered API key, set it for higher limits:
  //   wrangler secret put SEMANTIC_SCHOLAR_API_KEY
  // Powers the daily AI papers capture in worker/src/papers.ts.
  SEMANTIC_SCHOLAR_API_KEY?: string;
  // FRED API key (free registration at fred.stlouisfed.org). Required
  // for /api/economy/fred/indicators. If unset the endpoint returns
  // 503 with a hint and the daily refresh is skipped gracefully. Set
  // with: wrangler secret put FRED_API_KEY
  FRED_API_KEY?: string;
  // Agent Fair-Trade Agreement: Ed25519 private key used to sign every
  // premium response receipt. Stored as a JWK string (kty=OKP, crv=Ed25519).
  // Generate with `node worker/scripts/generate-receipt-key.mjs` and set
  // via `wrangler secret put RECEIPT_PRIVATE_KEY_JWK`. The matching
  // public key lives at /.well-known/tensorfeed-receipt-key.json. If
  // unset, premium responses ship without a receipt (graceful, with
  // /api/meta exposing the bootstrap status). See receipts.ts.
  RECEIPT_PRIVATE_KEY_JWK?: string;
  // Standards-compliant Coinbase x402 V2 facilitator (worker/src/x402-facilitator.ts).
  // Hot wallet private key used to broadcast EIP-3009 transferWithAuthorization
  // calls submitted by clients via the X-PAYMENT header. Distinct from
  // PAYMENT_WALLET (which receives the USDC). The broadcaster only pays Base
  // ETH gas; it does not custody USDC. Set via:
  //   wrangler secret put X402_BROADCAST_KEY
  // Hex-encoded 32-byte private key (with or without 0x prefix). If unset,
  // the X-PAYMENT path returns unexpected_settle_error and the legacy
  // X-Payment-Tx + credits flows continue to work unchanged.
  X402_BROADCAST_KEY?: string;
  // Network selector for the x402 facilitator. Defaults to "mainnet" (Base
  // mainnet, chainId 8453). Set to "sepolia" for the smoke test against
  // Base Sepolia (chainId 84532) before flipping back to mainnet for prod.
  // Affects: USDC contract address, EIP-712 domain chainId used for
  // signature recovery, advertised PaymentRequirements network, on-chain
  // broadcast destination. Set via:
  //   wrangler secret put X402_NETWORK   (or unset for mainnet default)
  X402_NETWORK?: string;
  // Coinbase Developer Platform x402 facilitator credentials. ONLY consumed
  // by worker/src/cdp-facilitator.ts; no other module imports these.
  // CDP_API_KEY_ID is the public key identifier shown in the CDP dashboard.
  // CDP_API_KEY_SECRET is the 64-byte base64 Ed25519 secret (32 seed +
  // 32 pubkey) issued once at key creation. Per feedback_cdp_key_constraints
  // these are tied to Evan's personal Coinbase account: read-only scope,
  // never logged, never echoed, never used outside this module.
  CDP_API_KEY_ID?: string;
  CDP_API_KEY_SECRET?: string;
}

export interface Article {
  id: string;
  title: string;
  url: string;
  source: string;
  sourceDomain: string;
  snippet: string;
  categories: string[];
  publishedAt: string;
  fetchedAt: string;
}

export interface RSSSource {
  id: string;
  name: string;
  url: string;
  domain: string;
  categories: string[];
  active: boolean;
}

export interface ServiceStatus {
  name: string;
  provider: string;
  status: 'operational' | 'degraded' | 'down' | 'unknown';
  statusPageUrl: string;
  components: { name: string; status: string }[];
  lastChecked: string;
}

export interface StatusPageResponse {
  page: { name: string };
  status: { indicator: string; description: string };
  components?: { name: string; status: string }[];
}

export interface PodcastEpisode {
  id: string;
  podcastName: string;
  podcastImage: string;
  title: string;
  description: string;
  url: string;
  audioUrl: string;
  duration: string;
  publishedAt: string;
  fetchedAt: string;
}

export interface PodcastSource {
  id: string;
  name: string;
  feedUrl: string;
  active: boolean;
}

export interface TrendingRepo {
  name: string;
  description: string;
  language: string;
  stars: number;
  forks: number;
  todayStars: number;
  url: string;
  topics: string[];
  createdAt: string;
  fetchedAt: string;
}
