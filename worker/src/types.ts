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
