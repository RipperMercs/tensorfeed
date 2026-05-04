export interface Env {
  TENSORFEED_NEWS: KVNamespace;
  TENSORFEED_STATUS: KVNamespace;
  TENSORFEED_CACHE: KVNamespace;
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
  // Admin-only routes auth. REQUIRED in production. Set via:
  //   wrangler secret put ADMIN_KEY
  // Used by /api/admin/* and /api/refresh. Replaces the previous
  // ?key=ENVIRONMENT pattern, which was unsafe once the repo went
  // public (ENVIRONMENT="production" lives in wrangler.toml).
  ADMIN_KEY?: string;
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
  // Agent Fair-Trade Agreement: Ed25519 private key used to sign every
  // premium response receipt. Stored as a JWK string (kty=OKP, crv=Ed25519).
  // Generate with `node worker/scripts/generate-receipt-key.mjs` and set
  // via `wrangler secret put RECEIPT_PRIVATE_KEY_JWK`. The matching
  // public key lives at /.well-known/tensorfeed-receipt-key.json. If
  // unset, premium responses ship without a receipt (graceful, with
  // /api/meta exposing the bootstrap status). See receipts.ts.
  RECEIPT_PRIVATE_KEY_JWK?: string;
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
