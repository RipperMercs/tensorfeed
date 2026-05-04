/**
 * TensorFeed.ai JavaScript/TypeScript SDK
 *
 * Free endpoints (news, status, models, benchmarks, history, routing
 * preview, agent activity) need no auth. The premium tier (top-N model
 * routing, more endpoints landing later) is paid via USDC on Base.
 *
 * https://tensorfeed.ai/developers
 * https://tensorfeed.ai/developers/agent-payments
 */

const DEFAULT_BASE_URL = 'https://tensorfeed.ai/api';
const DEFAULT_USER_AGENT = 'TensorFeed-SDK-JS/1.15';

// ── Error types ─────────────────────────────────────────────────────

export class TensorFeedError extends Error {
  readonly statusCode: number;
  readonly payload: unknown;
  constructor(statusCode: number, payload: unknown) {
    const p = payload as { error?: string; message?: string } | undefined;
    const msg = p?.error || p?.message || JSON.stringify(payload);
    super(`TensorFeed API error ${statusCode}: ${msg}`);
    this.name = 'TensorFeedError';
    this.statusCode = statusCode;
    this.payload = payload;
  }
}

/** Thrown on HTTP 402 (premium endpoint requires payment). */
export class PaymentRequired extends TensorFeedError {
  constructor(payload: unknown) {
    super(402, payload);
    this.name = 'PaymentRequired';
  }
}

/** Thrown on HTTP 429 (free preview rate limit, 5/day per IP). */
export class RateLimited extends TensorFeedError {
  constructor(payload: unknown) {
    super(429, payload);
    this.name = 'RateLimited';
  }
}

// ── Free-endpoint response types (preserved from 1.0.0) ────────────

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

export interface NewsResponse {
  ok: boolean;
  source: string;
  updated: string;
  count: number;
  articles: Article[];
}

export interface ServiceStatus {
  name: string;
  provider: string;
  status: 'operational' | 'degraded' | 'down' | 'unknown';
  components: { name: string; status: string }[];
  lastChecked?: string;
}

export interface StatusResponse {
  ok: boolean;
  source: string;
  checked: string;
  services: ServiceStatus[];
}

export interface Model {
  id: string;
  name: string;
  inputPrice: number;
  outputPrice: number;
  contextWindow: number;
  released: string;
  capabilities: string[];
  openSource?: boolean;
  license?: string;
}

export interface Provider {
  id: string;
  name: string;
  logo: string;
  url: string;
  models: Model[];
}

export interface ModelsResponse {
  ok: boolean;
  source: string;
  lastUpdated: string;
  providers: Provider[];
}

export interface AgentActivity {
  today_count: number;
  last_updated: string;
  recent: { bot: string; endpoint: string; timestamp: string }[];
}

export interface HealthResponse {
  ok: boolean;
  timestamp: string;
  news: { totalArticles: number; sourcesPolled: number; sourcesSucceeded: number; lastUpdated: string };
}

// ── New in 1.1.0: benchmarks, history, premium ─────────────────────

export interface BenchmarkDefinition {
  id: string;
  name: string;
  description: string;
  maxScore: number;
}

export interface BenchmarkModelEntry {
  model: string;
  provider: string;
  released?: string;
  scores: Record<string, number>;
}

export interface BenchmarksResponse {
  ok: boolean;
  source: string;
  lastUpdated?: string;
  benchmarks?: BenchmarkDefinition[];
  models?: BenchmarkModelEntry[];
}

export interface HistoryListResponse {
  ok: boolean;
  dates: string[];
  types: string[];
  count: number;
}

export interface HistorySnapshot {
  ok: boolean;
  date: string;
  type: string;
  capturedAt: string;
  data: unknown;
}

// ── Premium: routing ────────────────────────────────────────────────

export type RoutingTask = 'code' | 'reasoning' | 'creative' | 'general';

export interface RoutingPreviewResponse {
  ok: boolean;
  preview: true;
  task: RoutingTask;
  computed_at: string;
  rate_limit: { limit: number; remaining: number; scope: string };
  recommendation: { model: string; provider: string } | null;
  upgrade: {
    message: string;
    premium_endpoint: string;
    preview_limits: {
      top_n: number;
      includes_score_breakdown: boolean;
      includes_pricing: boolean;
      rate_limit_per_ip_per_day: number;
    };
  };
}

export interface RoutingRecommendation {
  rank: number;
  model: {
    id: string;
    name: string;
    provider: string;
    contextWindow: number;
    capabilities: string[];
    openSource: boolean;
  };
  pricing: { input: number; output: number; currency: 'USD'; unit: string };
  status: ServiceStatus['status'];
  composite_score: number;
  components: { quality: number; availability: number; cost: number; latency: number };
}

export interface RoutingWeights {
  quality: number;
  availability: number;
  cost: number;
  latency: number;
}

export interface RoutingResponse {
  ok: boolean;
  task: RoutingTask;
  computed_at: string;
  weights: RoutingWeights;
  filters_applied: { budget?: number; min_quality?: number };
  data_freshness: { pricing: string | null; benchmarks: string | null; status: string | null };
  recommendations: RoutingRecommendation[];
  notes: string[];
  billing?: {
    credits_charged: number;
    credits_remaining?: number;
    new_token_issued?: boolean;
    token?: string;
  };
}

// ── Premium: history series ────────────────────────────────────────

export interface PricingSeriesPoint {
  date: string;
  input: number;
  output: number;
  blended: number;
}

export interface PricingSeriesResponse {
  ok: boolean;
  model: string;
  provider: string | null;
  range: { from: string; to: string; days: number };
  resolution: 'daily';
  points: PricingSeriesPoint[];
  summary: {
    first: PricingSeriesPoint | null;
    latest: PricingSeriesPoint | null;
    min_blended: number | null;
    max_blended: number | null;
    delta_pct_blended: number | null;
    changes_detected: number;
    days_with_data: number;
    days_missing: number;
  };
  billing?: { credits_charged: number; credits_remaining?: number };
}

export interface BenchmarkSeriesPoint {
  date: string;
  score: number;
}

export interface BenchmarkSeriesResponse {
  ok: boolean;
  model: string;
  benchmark: string;
  range: { from: string; to: string; days: number };
  points: BenchmarkSeriesPoint[];
  summary: {
    first: BenchmarkSeriesPoint | null;
    latest: BenchmarkSeriesPoint | null;
    min_score: number | null;
    max_score: number | null;
    delta_pp: number | null;
    days_with_data: number;
    days_missing: number;
  };
  billing?: { credits_charged: number; credits_remaining?: number };
}

export interface UptimeIncidentDay {
  date: string;
  status: 'degraded' | 'down' | 'unknown';
}

export interface StatusUptimeResponse {
  ok: boolean;
  provider: string;
  range: { from: string; to: string; days: number };
  days_total: number;
  days_with_data: number;
  days_missing: number;
  days_operational: number;
  days_degraded: number;
  days_down: number;
  days_unknown: number;
  uptime_pct: number | null;
  incident_days: UptimeIncidentDay[];
  billing?: { credits_charged: number; credits_remaining?: number };
}

// ── Premium: webhook watches ───────────────────────────────────────

export interface PriceWatchSpec {
  type: 'price';
  /** Model id or display name (case-insensitive). */
  model: string;
  field: 'inputPrice' | 'outputPrice' | 'blended';
  op: 'lt' | 'gt' | 'changes';
  /** Required when op is lt or gt. */
  threshold?: number;
}

export interface StatusWatchSpec {
  type: 'status';
  /** Provider name (case-insensitive). */
  provider: string;
  op: 'becomes' | 'changes';
  /** Required when op is becomes. */
  value?: 'operational' | 'degraded' | 'down';
}

export interface DigestWatchSpec {
  type: 'digest';
  cadence: 'daily' | 'weekly';
}

export type WatchSpec = PriceWatchSpec | StatusWatchSpec | DigestWatchSpec;

export interface Watch {
  id: string;
  spec: WatchSpec;
  callback_url: string;
  secret?: string;
  token: string;
  created: string;
  expires_at: string;
  fire_count: number;
  fire_cap: number;
  last_fired_at: string | null;
  last_delivery_status: number | null;
  status: 'active' | 'expired' | 'cap_reached' | 'deleted';
}

export interface WatchCreateResponse {
  ok: boolean;
  watch: Watch;
  billing?: { credits_charged: number; credits_remaining?: number };
}

export interface WatchListResponse {
  ok: boolean;
  count: number;
  watches: Watch[];
}

export interface WatchGetResponse {
  ok: boolean;
  watch: Watch;
}

// ── Premium: enriched agents directory ────────────────────────────

export interface EnrichedAgentRecord {
  id: string;
  name: string;
  provider: string;
  category: string;
  description: string;
  url: string;
  pricing?: string;
  launched?: number | string;
  capabilities?: string[];
  openSource?: boolean;
  live_status: 'operational' | 'degraded' | 'down' | 'unknown';
  status_page_url: string | null;
  recent_news_count: number;
  recent_news: { title: string; url: string; published_at: string; source: string }[];
  agent_traffic_24h: number;
  flagship_pricing: { model: string; input: number; output: number; blended: number } | null;
  trending_score: number;
}

export type AgentsDirectorySort =
  | 'trending'
  | 'alphabetical'
  | 'status'
  | 'price_low'
  | 'price_high'
  | 'news_count';

export interface NewsSearchResultItem {
  title: string;
  url: string;
  source: string;
  source_domain: string;
  snippet: string;
  categories: string[];
  published_at: string;
  relevance: number;
  matched_terms: string[];
}

export interface WhatsNewPriceChange {
  model: string;
  provider: string;
  field: 'inputPrice' | 'outputPrice';
  from: number;
  to: number;
  delta_pct: number | null;
}

export interface WhatsNewNewModel {
  model: string;
  provider: string;
  input_per_1m: number;
  output_per_1m: number;
  tier: string | null;
}

export interface WhatsNewIncident {
  service: string;
  provider: string;
  severity: string;
  title: string;
  started_at: string;
  resolved_at: string | null;
  duration_minutes: number | null;
}

export interface WhatsNewHeadline {
  title: string;
  url: string;
  source: string;
  source_domain: string;
  published_at: string;
  snippet: string;
  categories: string[];
}

export interface ProbeProviderAggregate {
  provider: string;
  count: number;
  success_count: number;
  ok_pct: number;
  ttfb: { p50: number | null; p95: number | null; p99: number | null };
  total: { p50: number | null; p95: number | null; p99: number | null };
  status_codes: Record<string, number>;
  last_probe_at: string | null;
  last_error: string | null;
}

export interface ProbeLatestResponse {
  ok: boolean;
  summary: {
    computed_at: string;
    window_label: string;
    providers: ProbeProviderAggregate[];
  };
}

export interface ProbeSeriesPoint {
  date: string;
  count: number | null;
  ok_pct: number | null;
  uptime_pct: number | null;
  ttfb_p50: number | null;
  ttfb_p95: number | null;
  ttfb_p99: number | null;
  total_p50: number | null;
  total_p95: number | null;
  total_p99: number | null;
  incident_hours: number;
  has_data: boolean;
}

export interface ProbeSeriesResponse {
  provider: string;
  from: string;
  to: string;
  days: number;
  points: ProbeSeriesPoint[];
  summary: { overall_uptime_pct: number | null; days_with_data: number; days_with_incidents: number };
  notes: string[];
}

export interface MCPRegistrySnapshotResponse {
  ok: boolean;
  summary: {
    date: string;
    capturedAt: string;
    total_servers: number;
    total_versions: number;
    by_status: Record<string, number>;
    top_namespaces: Array<{ namespace: string; count: number }>;
    new_today: { count: number; names: string[] };
    reactivated_today: { count: number; names: string[] };
    deprecated_today: { count: number; names: string[] };
    delta_vs_yesterday: { added: number; removed: number; net: number } | null;
    pages_fetched: number;
    fetch_truncated: boolean;
  };
}

export interface PapersAITrendingPaper {
  paperId: string;
  title: string;
  abstract: string | null;
  authors: string[];
  year: number | null;
  venue: string | null;
  citationCount: number;
  url: string | null;
  publicationDate: string | null;
  arxivId: string | null;
  doi: string | null;
  fieldsOfStudy: string[];
}

export interface PapersAITrendingResponse {
  ok: boolean;
  snapshot: {
    date: string;
    capturedAt: string;
    total_papers: number;
    queries: string[];
    raw_count: number;
    papers: PapersAITrendingPaper[];
    summary: {
      by_year: Record<string, number>;
      top_venues: Array<{ venue: string; count: number }>;
      top_authors: Array<{ author: string; count: number }>;
    };
  };
}

export interface ArxivPaper {
  arxivId: string;
  version: string | null;
  title: string;
  abstract: string | null;
  authors: string[];
  primaryCategory: string | null;
  categories: string[];
  publishedAt: string;
  updatedAt: string;
  htmlUrl: string;
  pdfUrl: string;
  doi: string | null;
}

export interface ArxivRecentResponse {
  ok: boolean;
  snapshot: {
    date: string;
    capturedAt: string;
    total_papers: number;
    categories_queried: string[];
    raw_count: number;
    papers: ArxivPaper[];
    summary: {
      by_primary_category: Record<string, number>;
      top_authors: Array<{ author: string; count: number }>;
    };
  };
}

export interface HFModelEntry {
  id: string;
  downloads: number;
  likes: number;
  pipeline_tag: string | null;
  tags: string[];
  lastModified: string | null;
  private: boolean;
  gated: boolean | string;
}

export interface HFDatasetEntry {
  id: string;
  downloads: number;
  likes: number;
  tags: string[];
  lastModified: string | null;
  private: boolean;
  gated: boolean | string;
}

export interface HFSpaceEntry {
  id: string;
  author: string | null;
  sdk: string | null;
  likes: number;
  tags: string[];
  lastModified: string | null;
  private: boolean;
  runtime_stage: string | null;
  hardware: string | null;
}

export interface HFTrendingResponse {
  ok: boolean;
  snapshot: {
    date: string;
    capturedAt: string;
    models: { sort: 'downloads'; count: number; items: HFModelEntry[] };
    datasets: { sort: 'downloads'; count: number; items: HFDatasetEntry[] };
    spaces: { sort: 'likes'; count: number; items: HFSpaceEntry[] };
    summary: {
      top_pipeline_tags: Array<{ tag: string; count: number }>;
      top_namespaces: Array<{ namespace: string; count: number }>;
      top_space_sdks: Array<{ sdk: string; count: number }>;
    };
  };
}

export interface HotIssue {
  url: string;
  api_url: string;
  repo: string;
  number: number;
  title: string;
  author: string | null;
  state: 'open' | 'closed';
  comments: number;
  reactions_total: number;
  labels: string[];
  created_at: string;
  updated_at: string;
  matched_topic: string;
}

export interface HotIssuesResponse {
  ok: boolean;
  snapshot: {
    date: string;
    capturedAt: string;
    total_issues: number;
    topics_queried: string[];
    raw_count: number;
    recent_window_days: number;
    comments_threshold: number;
    issues: HotIssue[];
    summary: {
      by_topic: Record<string, number>;
      top_repos: Array<{ repo: string; count: number }>;
    };
  };
}

export interface MCPRegistrySeriesPoint {
  date: string;
  total_servers: number | null;
  total_versions: number | null;
  active_count: number | null;
  added: number | null;
  removed: number | null;
  net: number | null;
  has_data: boolean;
}

export interface MCPRegistrySeriesResponse {
  from: string;
  to: string;
  days: number;
  points: MCPRegistrySeriesPoint[];
  delta_in_window: { start_total: number | null; end_total: number | null; net: number | null };
  notes: string[];
}

export interface WhatsNewResponse {
  ok: boolean;
  window: { from: string; to: string; days: number };
  computed_at: string;
  summary: {
    total_pricing_changes: number;
    new_models: number;
    removed_models: number;
    incidents: number;
    news_articles: number;
  };
  pricing: {
    changes: WhatsNewPriceChange[];
    new_models: WhatsNewNewModel[];
    removed_models: { model: string; provider: string }[];
  };
  status: {
    incidents: WhatsNewIncident[];
    currently_operational: number;
    currently_degraded: number;
    currently_down: number;
    currently_unknown: number;
  };
  news: WhatsNewHeadline[];
  data_freshness: {
    pricing: string | null;
    status: string | null;
    incidents_count: number;
    news_total_corpus: number;
  };
  notes: string[];
  billing?: { credits_charged: number; credits_remaining?: number };
}

export interface CompareModelEntry {
  matched: true;
  id: string;
  name: string;
  provider: string;
  tier: string | null;
  context_window: number | null;
  released: string | null;
  capabilities: string[];
  open_source: boolean;
  pricing: { input: number; output: number; blended: number };
  benchmarks: Record<string, number | null>;
  status: 'operational' | 'degraded' | 'down' | 'unknown';
  recent_news_count: number;
  recent_news: { title: string; url: string; source: string; published_at: string }[];
}

export interface UnmatchedCompareEntry {
  matched: false;
  query: string;
  reason: 'model_not_found';
}

export type CompareEntry = CompareModelEntry | UnmatchedCompareEntry;

export interface CompareModelsResponse {
  ok: boolean;
  benchmark_keys: string[];
  models: CompareEntry[];
  rankings: {
    cheapest_blended: { name: string; blended: number }[];
    most_context: { name: string; context_window: number }[];
    by_benchmark: Record<string, { name: string; score: number }[]>;
  };
  data_freshness: {
    pricing: string | null;
    benchmarks: string | null;
    status: string | null;
  };
  billing?: { credits_charged: number; credits_remaining?: number };
}

export interface ProviderDeepDiveModel {
  id: string;
  name: string;
  tier: string | null;
  pricing: { input: number; output: number; blended: number };
  context_window: number | null;
  released: string | null;
  capabilities: string[];
  open_source: boolean;
  license: string | null;
  benchmark_scores: Record<string, number>;
}

export interface ProviderDeepDiveResponse {
  ok: boolean;
  provider: { id: string; name: string; url: string | null; logo: string | null };
  status: {
    state: 'operational' | 'degraded' | 'down' | 'unknown';
    last_checked: string | null;
    status_page_url: string | null;
    components: { name: string; status: string }[];
  };
  models: ProviderDeepDiveModel[];
  recent_news: { title: string; url: string; source: string; published_at: string; snippet: string }[];
  recent_news_count: number;
  agent_traffic_24h: number;
  data_freshness: {
    pricing: string | null;
    benchmarks: string | null;
    status: string | null;
    news: string | null;
    activity: string | null;
  };
  notes: string[];
  billing?: { credits_charged: number; credits_remaining?: number };
}

export type CostHorizon = 'daily' | 'weekly' | 'monthly' | 'yearly';

export interface MatchedCostProjection {
  model: string;
  provider: string;
  matched: true;
  rates: { input_per_1m: number; output_per_1m: number; blended_per_1m: number };
  daily: { input_cost: number; output_cost: number; total: number };
  weekly_total: number;
  monthly_total: number;
  yearly_total: number;
}

export interface UnmatchedCostProjection {
  model: string;
  matched: false;
  reason: 'model_not_found';
}

export type CostProjectionEntry = MatchedCostProjection | UnmatchedCostProjection;

export interface CostProjectionResponse {
  ok: boolean;
  workload: {
    input_tokens_per_day: number;
    output_tokens_per_day: number;
    total_tokens_per_day: number;
  };
  primary_horizon: CostHorizon;
  computed_at: string;
  projections: CostProjectionEntry[];
  ranked_cheapest_monthly: { model: string; provider: string; monthly_total: number }[];
  notes: string[];
  billing?: { credits_charged: number; credits_remaining?: number };
}

export interface NewsSearchResponse {
  ok: boolean;
  query: string | null;
  filters: { from?: string; to?: string; provider?: string; category?: string };
  total_corpus: number;
  matched: number;
  returned: number;
  results: NewsSearchResultItem[];
  billing?: { credits_charged: number; credits_remaining?: number };
}

export interface PremiumAgentsDirectoryResponse {
  ok: boolean;
  source: 'tensorfeed.ai';
  computed_at: string;
  total: number;
  returned: number;
  filters_applied: Record<string, unknown>;
  sort: AgentsDirectorySort;
  data_freshness: {
    directory: string | null;
    status: string | null;
    news: string | null;
    pricing: string | null;
    activity: string | null;
  };
  agents: EnrichedAgentRecord[];
  billing?: { credits_charged: number; credits_remaining?: number };
}

// ── Payment ─────────────────────────────────────────────────────────

export interface PaymentInfo {
  ok: boolean;
  wallet: { address: string; currency: string; network: string; contract: string; decimals: number };
  pricing: {
    base_rate: string;
    volume_bundles: { amount_usd: number; credits: number; rate: string }[];
    tiers: Record<string, string>;
  };
  flow: { with_quote: string[]; x402_fallback: string[] };
  verification: {
    attestation_method: string;
    address_published_at: string[];
    note: string;
  };
  terms: {
    no_training: string;
    refund: string;
    sanctions?: string;
    acceptable_use?: string;
    governing_law?: string;
    kill_switch: string;
  };
}

export interface QuoteResponse {
  ok: boolean;
  wallet: string;
  memo: string;
  amount_usd: number;
  credits: number;
  currency: 'USDC';
  network: 'base';
  expires_at: string;
  ttl_seconds: number;
  next_step: string;
}

export interface ConfirmResponse {
  ok: boolean;
  token?: string;
  credits?: number;
  balance?: number;
  tx_amount_usd?: number;
  rate?: string;
  error?: string;
  reason?: string;
}

export interface BalanceResponse {
  ok: boolean;
  balance: number;
  created: string;
  last_used: string;
  total_purchased: number;
}

export interface UsageEntry {
  endpoint: string;
  credits: number;
  at: string;
}

export interface UsageResponse {
  ok: boolean;
  token_balance: number | null;
  total_calls: number;
  total_credits_spent: number;
  by_endpoint: Record<string, { calls: number; credits: number; last_seen: string }>;
  recent: UsageEntry[];
}

// ── Options ────────────────────────────────────────────────────────

export interface TensorFeedOptions {
  baseUrl?: string;
  /** Bearer token for premium endpoints. Auto-set after a successful confirm(). */
  token?: string;
  userAgent?: string;
}

// ── Client ──────────────────────────────────────────────────────────

export class TensorFeed {
  private baseUrl: string;
  private userAgent: string;
  /** Bearer token used on premium endpoints and balance(). Mutable so confirm() can populate it. */
  public token: string | undefined;

  constructor(options?: TensorFeedOptions) {
    this.baseUrl = options?.baseUrl ?? DEFAULT_BASE_URL;
    this.token = options?.token;
    this.userAgent = options?.userAgent ?? DEFAULT_USER_AGENT;
  }

  private async request<T>(
    method: 'GET' | 'POST' | 'DELETE',
    path: string,
    options?: { params?: Record<string, unknown>; body?: unknown; requireToken?: boolean },
  ): Promise<T> {
    let url = `${this.baseUrl}${path}`;
    if (options?.params) {
      const usp = new URLSearchParams();
      for (const [k, v] of Object.entries(options.params)) {
        if (v !== undefined && v !== null) usp.set(k, String(v));
      }
      const qs = usp.toString();
      if (qs) url += `?${qs}`;
    }

    const headers: Record<string, string> = { 'User-Agent': this.userAgent };
    let body: string | undefined;
    if (options?.body !== undefined) {
      headers['Content-Type'] = 'application/json';
      body = JSON.stringify(options.body);
    }

    const needsAuth =
      options?.requireToken ||
      path.startsWith('/premium/') ||
      path === '/payment/balance';
    if (needsAuth && this.token) {
      headers['Authorization'] = `Bearer ${this.token}`;
    }

    const res = await fetch(url, { method, headers, body });
    let payload: unknown;
    try {
      payload = await res.json();
    } catch {
      payload = { error: 'non_json_response', status: res.status };
    }
    if (res.status === 402) throw new PaymentRequired(payload);
    if (res.status === 429) throw new RateLimited(payload);
    if (!res.ok) throw new TensorFeedError(res.status, payload);
    return payload as T;
  }

  private get<T>(path: string, params?: Record<string, unknown>): Promise<T> {
    return this.request<T>('GET', path, { params });
  }

  private post<T>(path: string, body?: unknown): Promise<T> {
    return this.request<T>('POST', path, { body });
  }

  // ── Free: news, status, models ─────────────────────────────────

  /** Get latest AI news articles. Free. */
  async news(options?: { category?: string; limit?: number }): Promise<NewsResponse> {
    return this.get<NewsResponse>('/news', {
      category: options?.category,
      limit: options?.limit,
    });
  }

  /** Get real-time AI service status. Free. */
  async status(): Promise<StatusResponse> {
    return this.get<StatusResponse>('/status');
  }

  /** Lightweight status summary. Free. */
  async statusSummary(): Promise<{
    ok: boolean;
    services: { name: string; status: string; provider: string }[];
  }> {
    return this.get('/status/summary');
  }

  /** AI model pricing and specs. Free. */
  async models(): Promise<ModelsResponse> {
    return this.get<ModelsResponse>('/models');
  }

  /** AI model benchmark scores. Free. */
  async benchmarks(): Promise<BenchmarksResponse> {
    return this.get<BenchmarksResponse>('/benchmarks');
  }

  /** Agent traffic metrics. Free. */
  async agentActivity(): Promise<AgentActivity> {
    return this.get<AgentActivity>('/agents/activity');
  }

  /**
   * Embodied AI catalog. Free.
   *
   * Vision-language-action foundation models (pi-0, GR00T N1, OpenVLA,
   * Octo, RDT-1B, Helix), humanoid platforms (Figure 02, 1X NEO, Tesla
   * Optimus, Apptronik Apollo, Unitree G1/H1, Atlas Electric, Agility
   * Digit, Sanctuary Phoenix), real-world training datasets (Open
   * X-Embodiment, DROID, AgiBot World, Mobile ALOHA, BridgeData V2),
   * and physics simulators (Isaac Lab, MuJoCo Playground, Genesis).
   *
   * @param options.category Filter to "foundation_model" | "humanoid" | "dataset" | "simulator".
   */
  async embodiedAi(options?: {
    category?: 'foundation_model' | 'humanoid' | 'dataset' | 'simulator';
  }): Promise<{
    ok: boolean;
    source: string;
    lastUpdated: string;
    count: number;
    entries: Array<Record<string, unknown>>;
  }> {
    return this.get('/embodied-ai', { category: options?.category });
  }

  /**
   * AI training datasets registry. Free.
   *
   * Pretraining corpora (FineWeb, RedPajama v2, Common Crawl, Dolma,
   * The Pile), instruction-tuning sets (Tulu 3, OpenHermes, OpenOrca,
   * AgentInstruct), DPO/RLHF preference sets (UltraFeedback, HelpSteer 2),
   * and multimodal sets (LAION-5B, DataComp-1B). Each row: tokens,
   * license, languages, and the upstream URL.
   *
   * @param options.stage Filter to one of "pretraining" | "instruction-tuning" | "dpo" | "rlhf" | "continued-pretraining" | "multimodal".
   */
  async trainingDatasets(options?: {
    stage?: 'pretraining' | 'instruction-tuning' | 'dpo' | 'rlhf' | 'continued-pretraining' | 'multimodal';
  }): Promise<{
    ok: boolean;
    source: string;
    lastUpdated: string;
    count: number;
    datasets: Array<Record<string, unknown>>;
  }> {
    return this.get('/training-datasets', { stage: options?.stage });
  }

  /**
   * Curated MCP server catalog. Free.
   *
   * Distinct from `/api/mcp/registry/snapshot` (which is a daily count
   * + churn telemetry of the official registry); this returns the
   * curated production-server catalog with capabilities, transport,
   * license, and first-party flag.
   */
  async mcpServers(options?: {
    capability?: string;
    firstParty?: boolean;
  }): Promise<{
    ok: boolean;
    source: string;
    lastUpdated: string;
    count: number;
    servers: Array<Record<string, unknown>>;
  }> {
    const params: Record<string, string | undefined> = {};
    if (options?.capability) params.capability = options.capability;
    if (options?.firstParty === true) params.first_party = 'true';
    return this.get('/mcp-servers', params);
  }

  /**
   * Meta-catalog of AI evaluation benchmarks. Free.
   *
   * Each entry: size, score range, current frontier score, current SOTA
   * holder model + date + citation URL, status (active vs saturated vs
   * deprecated), contamination risk, paper/repo/leaderboard URLs.
   * Covers MMLU-Pro, GPQA Diamond, HLE, ARC-AGI-2, AIME 2025, SWE-bench
   * Verified, LiveCodeBench, Aider Polyglot, Terminal-Bench, SWE-Lancer,
   * MMMU-Pro, MathVista, Tau-Bench, GAIA, WebArena, OSWorld, BFCL v3,
   * HCAST, RULER, and more.
   */
  async benchmarkRegistry(options?: {
    category?: 'knowledge' | 'math' | 'code' | 'multimodal' | 'agents' | 'long-context' | 'safety';
    status?: 'active' | 'saturated' | 'deprecated';
  }): Promise<{
    ok: boolean;
    source: string;
    lastUpdated: string;
    count: number;
    benchmarks: Array<Record<string, unknown>>;
  }> {
    return this.get('/benchmark-registry', {
      category: options?.category,
      status: options?.status,
    });
  }

  /**
   * GPU rental pricing snapshot across cloud marketplaces. Free.
   *
   * H100, H200, A100, L40S, B200, MI300X, etc across Vast.ai, RunPod,
   * and other marketplaces. Updated multiple times per day.
   */
  async gpuPricing(): Promise<Record<string, unknown>> {
    return this.get('/gpu/pricing');
  }

  /**
   * AI service incident history. Free.
   *
   * Incidents surfaced by TensorFeed status monitoring across major
   * providers. Pairs with `status()` (current state) and the premium
   * `statusUptime()` series for per-provider rollups.
   */
  async incidents(): Promise<{
    ok: boolean;
    source: string;
    incidents: Array<Record<string, unknown>>;
  }> {
    return this.get('/incidents');
  }

  /** API health. Free. */
  async health(): Promise<HealthResponse> {
    return this.get<HealthResponse>('/health');
  }

  /** Check if a specific AI service is down. */
  async isDown(serviceName: string): Promise<{ name: string; status: string; isDown: boolean }> {
    const data = await this.status();
    const needle = serviceName.toLowerCase();
    const service = data.services.find(
      s => s.name.toLowerCase().includes(needle) || s.provider.toLowerCase().includes(needle),
    );
    if (!service) {
      throw new Error(
        `Service "${serviceName}" not found. Available: ${data.services.map(s => s.name).join(', ')}`,
      );
    }
    return { name: service.name, status: service.status, isDown: service.status === 'down' };
  }

  // ── Free: history snapshots ────────────────────────────────────

  /** List available daily history snapshot dates. Free. */
  async history(): Promise<HistoryListResponse> {
    return this.get<HistoryListResponse>('/history');
  }

  /** Read a specific historical snapshot. Free.
   * @param date YYYY-MM-DD UTC
   * @param snapshotType pricing, models, benchmarks, status, or agent-activity
   */
  async historySnapshot(date: string, snapshotType: string): Promise<HistorySnapshot> {
    return this.get<HistorySnapshot>(`/history/${date}/${snapshotType}`);
  }

  // ── Free: routing preview (rate-limited) ───────────────────────

  /**
   * Top-1 model recommendation. Free, 5 calls per UTC day per IP.
   * For full top-N with score breakdown and no rate limit, use routing().
   * @throws RateLimited after 5 free preview calls in a UTC day from your IP
   */
  async routingPreview(options?: {
    task?: RoutingTask;
    budget?: number;
    minQuality?: number;
  }): Promise<RoutingPreviewResponse> {
    return this.get<RoutingPreviewResponse>('/preview/routing', {
      task: options?.task,
      budget: options?.budget,
      min_quality: options?.minQuality,
    });
  }

  // ── Payment flow ───────────────────────────────────────────────

  /** Wallet, pricing, supported flows. Free. Use to verify the wallet address. */
  async paymentInfo(): Promise<PaymentInfo> {
    return this.get<PaymentInfo>('/payment/info');
  }

  /**
   * Generate a 30-minute payment quote. Send USDC on Base to the returned
   * wallet (memo optional), then call confirm() with the tx hash.
   */
  async buyCredits(options: { amountUsd: number }): Promise<QuoteResponse> {
    return this.post<QuoteResponse>('/payment/buy-credits', { amount_usd: options.amountUsd });
  }

  /**
   * Verify a USDC tx on-chain and mint a credit token.
   * On success the returned token is auto-stored on this client instance.
   * Pass `nonce` (the memo from buyCredits) if you want quoted credits with
   * volume discount; otherwise credits are calculated from the actual tx amount.
   */
  async confirm(options: { txHash: string; nonce?: string }): Promise<ConfirmResponse> {
    const body: Record<string, unknown> = { tx_hash: options.txHash };
    if (options.nonce !== undefined) body.nonce = options.nonce;
    const res = await this.post<ConfirmResponse>('/payment/confirm', body);
    if (res.ok && res.token) this.token = res.token;
    return res;
  }

  /**
   * Check remaining credits for the current bearer token.
   * @throws Error if no token is set on the client
   */
  async balance(): Promise<BalanceResponse> {
    if (!this.token) {
      throw new Error(
        'balance() requires a token. Pass it via new TensorFeed({ token }) or call confirm() first.',
      );
    }
    return this.request<BalanceResponse>('GET', '/payment/balance', { requireToken: true });
  }

  /**
   * Per-token usage history for the current bearer token. Free.
   * Returns the last 100 premium API calls aggregated by endpoint plus
   * the 25 most recent entries. Useful for monitoring your own spend.
   * @throws Error if no token is set on the client
   */
  async usage(): Promise<UsageResponse> {
    if (!this.token) {
      throw new Error(
        'usage() requires a token. Pass it via new TensorFeed({ token }) or call confirm() first.',
      );
    }
    return this.request<UsageResponse>('GET', '/payment/usage', { requireToken: true });
  }

  // ── Paid: routing (Tier 2, 1 credit per call) ─────────────────

  /**
   * Tier 2 routing recommendation: top-N ranked models with full score breakdown.
   * Costs 1 credit per call.
   *
   * @throws Error if no token is set on the client
   * @throws PaymentRequired if the token has insufficient credits
   */
  async routing(options?: {
    task?: RoutingTask;
    budget?: number;
    minQuality?: number;
    topN?: number;
    weights?: Partial<RoutingWeights>;
  }): Promise<RoutingResponse> {
    if (!this.token) {
      throw new Error(
        'routing() requires a token. Buy credits via buyCredits() and confirm(), or pass a token to the constructor.',
      );
    }
    const params: Record<string, unknown> = {
      task: options?.task,
      budget: options?.budget,
      min_quality: options?.minQuality,
      top_n: options?.topN,
    };
    const w = options?.weights;
    if (w) {
      if (w.quality !== undefined) params.w_quality = w.quality;
      if (w.availability !== undefined) params.w_availability = w.availability;
      if (w.cost !== undefined) params.w_cost = w.cost;
      if (w.latency !== undefined) params.w_latency = w.latency;
    }
    return this.request<RoutingResponse>('GET', '/premium/routing', {
      params,
      requireToken: true,
    });
  }

  // ── Paid: history series (Tier 1, 1 credit per call) ──────────

  private requireToken(name: string): void {
    if (!this.token) {
      throw new Error(
        `${name}() requires a token. Buy credits via buyCredits() and confirm(), or pass a token to the constructor.`,
      );
    }
  }

  /**
   * Daily price points for one model with min/max/delta summary.
   * Costs 1 credit per call. Range capped at 90 days; default 30 days back.
   *
   * @throws Error if no token is set on the client
   * @throws PaymentRequired if the token has insufficient credits
   */
  async pricingSeries(options: {
    model: string;
    from?: string;
    to?: string;
  }): Promise<PricingSeriesResponse> {
    this.requireToken('pricingSeries');
    return this.request<PricingSeriesResponse>('GET', '/premium/history/pricing/series', {
      params: { model: options.model, from: options.from, to: options.to },
      requireToken: true,
    });
  }

  /**
   * Score evolution for a single benchmark on one model.
   * Costs 1 credit per call. Benchmark keys: swe_bench, mmlu_pro,
   * gpqa_diamond, math, human_eval (case-insensitive).
   *
   * @throws Error if no token is set on the client
   * @throws PaymentRequired if the token has insufficient credits
   */
  async benchmarkSeries(options: {
    model: string;
    benchmark: string;
    from?: string;
    to?: string;
  }): Promise<BenchmarkSeriesResponse> {
    this.requireToken('benchmarkSeries');
    return this.request<BenchmarkSeriesResponse>('GET', '/premium/history/benchmarks/series', {
      params: {
        model: options.model,
        benchmark: options.benchmark,
        from: options.from,
        to: options.to,
      },
      requireToken: true,
    });
  }

  /**
   * Daily uptime rollup for one provider. Operational days count fully,
   * degraded days count as half, missing-data days are excluded from the
   * denominator. Costs 1 credit per call.
   *
   * @throws Error if no token is set on the client
   * @throws PaymentRequired if the token has insufficient credits
   */
  async statusUptime(options: {
    provider: string;
    from?: string;
    to?: string;
  }): Promise<StatusUptimeResponse> {
    this.requireToken('statusUptime');
    return this.request<StatusUptimeResponse>('GET', '/premium/history/status/uptime', {
      params: { provider: options.provider, from: options.from, to: options.to },
      requireToken: true,
    });
  }

  // ── Paid: webhook watches (1 credit per registration) ─────────

  /**
   * Register a webhook watch on a price change or status transition.
   * Costs 1 credit at registration. Watch lives 90 days, fires up to
   * fire_cap times (default 100), capped at 25 active watches per token.
   *
   * Each fire is a signed POST to callbackUrl with X-TensorFeed-Signature
   * (HMAC-SHA256 over the body using `secret`) and X-TensorFeed-Watch-Id
   * headers. Predicates are debounced: they fire only on edge transitions.
   *
   * @throws Error if no token is set
   * @throws PaymentRequired if the token has insufficient credits
   * @throws TensorFeedError 400 on invalid spec or callback URL
   */
  async createWatch(options: {
    spec: WatchSpec;
    callbackUrl: string;
    secret?: string;
    fireCap?: number;
  }): Promise<WatchCreateResponse> {
    this.requireToken('createWatch');
    const body: Record<string, unknown> = {
      spec: options.spec,
      callback_url: options.callbackUrl,
    };
    if (options.secret !== undefined) body.secret = options.secret;
    if (options.fireCap !== undefined) body.fire_cap = options.fireCap;
    return this.request<WatchCreateResponse>('POST', '/premium/watches', {
      body,
      requireToken: true,
    });
  }

  /** List all active watches owned by the current bearer token. Free. */
  async listWatches(): Promise<WatchListResponse> {
    this.requireToken('listWatches');
    return this.request<WatchListResponse>('GET', '/premium/watches', {
      requireToken: true,
    });
  }

  /** Read one watch (must be owned by the current token). Free. */
  async getWatch(id: string): Promise<WatchGetResponse> {
    this.requireToken('getWatch');
    return this.request<WatchGetResponse>('GET', `/premium/watches/${id}`, {
      requireToken: true,
    });
  }

  /** Delete an owned watch. Free. */
  async deleteWatch(id: string): Promise<{ ok: boolean }> {
    this.requireToken('deleteWatch');
    return this.request<{ ok: boolean }>('DELETE', `/premium/watches/${id}`, {
      requireToken: true,
    });
  }

  /**
   * Convenience helper that registers a scheduled digest watch.
   * Costs 1 credit. Fires on the given cadence (daily or weekly) with
   * a curated summary of pricing changes regardless of whether anything
   * dramatic happened. Same delivery contract as createWatch.
   *
   * @throws Error if no token is set
   * @throws PaymentRequired if the token has insufficient credits
   */
  async createDigestWatch(options: {
    cadence: 'daily' | 'weekly';
    callbackUrl: string;
    secret?: string;
    fireCap?: number;
  }): Promise<WatchCreateResponse> {
    return this.createWatch({
      spec: { type: 'digest', cadence: options.cadence },
      callbackUrl: options.callbackUrl,
      secret: options.secret,
      fireCap: options.fireCap,
    });
  }

  // ── Paid: provider deep-dive (1 credit per call) ─────────────

  /**
   * Everything about a provider in one paid call: live status,
   * all models with pricing + tier + benchmark scores joined,
   * recent news, agent traffic. Costs 1 credit.
   *
   * @throws Error if no token is set
   * @throws PaymentRequired if the token has insufficient credits
   * @throws TensorFeedError 404 with available_providers if no match
   */
  async providerDeepDive(provider: string): Promise<ProviderDeepDiveResponse> {
    this.requireToken('providerDeepDive');
    return this.request<ProviderDeepDiveResponse>(
      'GET',
      `/premium/providers/${encodeURIComponent(provider)}`,
      { requireToken: true },
    );
  }

  // ── Paid: compare models (1 credit per call) ──────────────────

  /**
   * Side-by-side comparison of 2-5 AI models. Each entry includes
   * pricing, benchmarks (normalized to union-of-keys with null for
   * missing scores), provider live status, and recent news. Plus
   * rankings: cheapest_blended, most_context, by_benchmark. Costs
   * 1 credit.
   *
   * @throws Error if no token is set
   * @throws PaymentRequired if the token has insufficient credits
   * @throws TensorFeedError 400 on < 2 or > 5 models
   */
  async compareModels(options: {
    ids: string | string[];
  }): Promise<CompareModelsResponse> {
    this.requireToken('compareModels');
    const idsCsv = Array.isArray(options.ids) ? options.ids.join(',') : options.ids;
    return this.request<CompareModelsResponse>('GET', '/premium/compare/models', {
      params: { ids: idsCsv },
      requireToken: true,
    });
  }

  // ── Paid: enriched agents directory (1 credit per call) ──────

  /**
   * Premium agents directory: catalog joined with live status, recent news
   * (count + top 3), agent traffic, flagship pricing, and a derived
   * trending_score (0-100). Server-side filter and sort. Costs 1 credit.
   *
   * @throws Error if no token is set
   * @throws PaymentRequired if the token has insufficient credits
   */
  async premiumAgentsDirectory(options?: {
    category?: string;
    status?: 'operational' | 'degraded' | 'down' | 'unknown';
    openSource?: boolean;
    capability?: string;
    sort?: AgentsDirectorySort;
    limit?: number;
  }): Promise<PremiumAgentsDirectoryResponse> {
    this.requireToken('premiumAgentsDirectory');
    const params: Record<string, unknown> = {
      category: options?.category,
      status: options?.status,
      capability: options?.capability,
      sort: options?.sort,
      limit: options?.limit,
    };
    if (options?.openSource === true) params.open_source = 'true';
    else if (options?.openSource === false) params.open_source = 'false';
    return this.request<PremiumAgentsDirectoryResponse>('GET', '/premium/agents/directory', {
      params,
      requireToken: true,
    });
  }

  // ── Paid: news search (1 credit per call) ──────────────────────

  /**
   * Full-text search over the TensorFeed news article corpus with date
   * range, provider, and category filters. Relevance scoring blends term
   * hits in title (weight 3) and snippet (weight 1) plus a recency boost.
   * Costs 1 credit. Stop words and tokens shorter than 2 chars are
   * stripped from the query.
   *
   * @throws Error if no token is set
   * @throws PaymentRequired if the token has insufficient credits
   */
  async newsSearch(options?: {
    q?: string;
    from?: string;
    to?: string;
    provider?: string;
    category?: string;
    limit?: number;
  }): Promise<NewsSearchResponse> {
    this.requireToken('newsSearch');
    return this.request<NewsSearchResponse>('GET', '/premium/news/search', {
      params: {
        q: options?.q,
        from: options?.from,
        to: options?.to,
        provider: options?.provider,
        category: options?.category,
        limit: options?.limit,
      },
      requireToken: true,
    });
  }

  // ── Paid: cost projection (1 credit per call) ──────────────────

  /**
   * Project cost of a token-usage workload across one or more models.
   * Returns daily/weekly/monthly/yearly cost per model plus a ranking
   * by cheapest monthly. Up to 10 models per call. Costs 1 credit.
   *
   * @throws Error if no token is set
   * @throws PaymentRequired if the token has insufficient credits
   */
  async costProjection(options: {
    models: string | string[];
    inputTokensPerDay: number;
    outputTokensPerDay: number;
    horizon?: CostHorizon;
  }): Promise<CostProjectionResponse> {
    this.requireToken('costProjection');
    const modelsCsv = Array.isArray(options.models)
      ? options.models.join(',')
      : options.models;
    return this.request<CostProjectionResponse>('GET', '/premium/cost/projection', {
      params: {
        model: modelsCsv,
        input_tokens_per_day: options.inputTokensPerDay,
        output_tokens_per_day: options.outputTokensPerDay,
        horizon: options.horizon,
      },
      requireToken: true,
    });
  }

  // ── Paid: whats-new summary (1 credit per call) ───────────────

  /**
   * Agent morning brief: pricing changes, new/removed models, status
   * incidents, and top news headlines from the last 1-7 days. The
   * endpoint to call when an agent boots up. Costs 1 credit.
   *
   * @throws Error if no token is set
   * @throws PaymentRequired if the token has insufficient credits
   */
  async whatsNew(options?: {
    days?: number;
    newsLimit?: number;
  }): Promise<WhatsNewResponse> {
    this.requireToken('whatsNew');
    return this.request<WhatsNewResponse>('GET', '/premium/whats-new', {
      params: {
        days: options?.days,
        news_limit: options?.newsLimit,
      },
      requireToken: true,
    });
  }

  /**
   * Daily curated AI/ML research papers ranked by citation count.
   *
   * Free, no auth. Five fan-out queries against the Semantic Scholar
   * Graph API (large language model, transformer, RLHF, AI agents,
   * diffusion model), deduped by paperId, top 30 returned. Refreshed
   * daily at 11:00 UTC.
   */
  async getPapersAITrending(): Promise<PapersAITrendingResponse> {
    return this.request<PapersAITrendingResponse>('GET', '/papers/ai-trending');
  }

  /**
   * Most recent arXiv submissions in cs.AI / cs.LG / cs.CL / cs.CV.
   *
   * Free, no auth. Single Atom API call to arXiv, deduped by arxivId,
   * top 50 by submission date. The firehose pair to
   * `getPapersAITrending`: this shows what just dropped, ai-trending
   * ranks the field by citation count. Refreshed daily at 11:30 UTC.
   */
  async getPapersArxivRecent(): Promise<ArxivRecentResponse> {
    return this.request<ArxivRecentResponse>('GET', '/papers/arxiv-recent');
  }

  /**
   * Top 30 most-downloaded Hugging Face models and top 30 datasets.
   *
   * Free, no auth. Snapshotted daily at 12:00 UTC against the public
   * HF API. Once enough daily snapshots accumulate, day-over-day
   * download deltas become a real trending signal computed over the
   * dated keys.
   */
  async getHFTrending(): Promise<HFTrendingResponse> {
    return this.request<HFTrendingResponse>('GET', '/hf/trending');
  }

  /**
   * Currently-hot GitHub issues across the AI ecosystem.
   *
   * Free, no auth. Five fan-out searches on AI-relevant topics
   * (llm, ai-agents, large-language-models, machine-learning,
   * transformer) for is:issue is:open archived:false comments>=10
   * updated within the last 7 days. Deduped by URL, top 30 by
   * comment count. Refreshed daily at 12:30 UTC. Companion to
   * /api/trending-repos: that one shows which AI repos are gaining
   * stars; this one shows where the active conversations are.
   */
  async getHotIssues(): Promise<HotIssuesResponse> {
    return this.request<HotIssuesResponse>('GET', '/issues/hot');
  }

  /**
   * Last 24 hours of measured LLM endpoint latency and availability.
   *
   * Free, no auth. TensorFeed pings each major LLM provider's chat
   * completion endpoint every 15 min and records ttfb / total time /
   * HTTP status. Returns per-provider aggregates. Data is unique
   * because we measure it (not self-reported by providers).
   */
  async getProbeLatest(): Promise<ProbeLatestResponse> {
    return this.request<ProbeLatestResponse>('GET', '/probe/latest');
  }

  /**
   * Daily SLA series for one LLM provider, measured by TensorFeed.
   * Costs 1 credit. Range capped at 90 days, default 30 days back.
   *
   * Provider must be one of: anthropic, openai, google, mistral, cohere.
   *
   * @throws Error if no token is set
   * @throws PaymentRequired if the token has insufficient credits
   */
  async getProbeSeries(options: {
    provider: 'anthropic' | 'openai' | 'google' | 'mistral' | 'cohere';
    from?: string;
    to?: string;
  }): Promise<ProbeSeriesResponse> {
    this.requireToken('getProbeSeries');
    return this.request<ProbeSeriesResponse>('GET', '/premium/probe/series', {
      params: { provider: options.provider, from: options.from, to: options.to },
      requireToken: true,
    });
  }

  /**
   * Today's MCP server registry summary with 1-day deltas.
   *
   * Free, no auth. Captured daily at 9:30 AM UTC from
   * registry.modelcontextprotocol.io. Returns total servers, by-status
   * breakdown, top namespaces, and newly added/reactivated/deprecated
   * names compared to yesterday's capture.
   */
  async getMCPRegistrySnapshot(): Promise<MCPRegistrySnapshotResponse> {
    return this.request<MCPRegistrySnapshotResponse>('GET', '/mcp/registry/snapshot');
  }

  /**
   * Multi-day series of MCP registry growth and churn. Costs 1 credit.
   *
   * Range capped at 90 days, default 30 days back. The registry itself is
   * open data, but a 30/90-day trend requires daily capture started weeks
   * before the question is asked. Days without a captured snapshot return
   * has_data=false.
   *
   * @throws Error if no token is set
   * @throws PaymentRequired if the token has insufficient credits
   */
  async getMCPRegistrySeries(options?: {
    from?: string;
    to?: string;
  }): Promise<MCPRegistrySeriesResponse> {
    this.requireToken('getMCPRegistrySeries');
    return this.request<MCPRegistrySeriesResponse>('GET', '/premium/mcp/registry/series', {
      params: { from: options?.from, to: options?.to },
      requireToken: true,
    });
  }
}

export default TensorFeed;
