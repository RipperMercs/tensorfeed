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
const DEFAULT_USER_AGENT = 'TensorFeed-SDK-JS/1.7';

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

export interface PricingChangeEntry {
  model: string;
  provider: string;
  field: 'inputPrice' | 'outputPrice';
  from: number;
  to: number;
  delta_pct: number | null;
}

export interface PricingCompareResponse {
  ok: true;
  type: 'pricing';
  from_date: string;
  to_date: string;
  added: { model: string; provider: string; inputPrice: number; outputPrice: number }[];
  removed: { model: string; provider: string; inputPrice: number; outputPrice: number }[];
  changed: PricingChangeEntry[];
  unchanged_count: number;
  billing?: { credits_charged: number; credits_remaining?: number };
}

export interface BenchmarkChangeEntry {
  model: string;
  benchmark: string;
  from: number;
  to: number;
  delta_pp: number;
}

export interface BenchmarkCompareResponse {
  ok: true;
  type: 'benchmarks';
  from_date: string;
  to_date: string;
  added_models: string[];
  removed_models: string[];
  changed: BenchmarkChangeEntry[];
  billing?: { credits_charged: number; credits_remaining?: number };
}

export type CompareResponse = PricingCompareResponse | BenchmarkCompareResponse;

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

export type WatchSpec = PriceWatchSpec | StatusWatchSpec;

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
  terms: { no_training: string; refund: string; kill_switch: string };
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

  /**
   * Diff two daily snapshots: added, removed, and changed entries with
   * deltas. Useful for detecting price wars and benchmark regressions.
   * Costs 1 credit per call.
   *
   * @throws Error if no token is set on the client
   * @throws PaymentRequired if the token has insufficient credits
   */
  async historyCompare(options: {
    from: string;
    to: string;
    type?: 'pricing' | 'benchmarks';
  }): Promise<CompareResponse> {
    this.requireToken('historyCompare');
    return this.request<CompareResponse>('GET', '/premium/history/compare', {
      params: { from: options.from, to: options.to, type: options.type ?? 'pricing' },
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
}

export default TensorFeed;
