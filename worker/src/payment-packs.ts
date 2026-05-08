/**
 * TensorFeed credit packs.
 *
 * Packs are CURATED MARKETING BUNDLES, not a backend pricing or scoping
 * change. Credits purchased through any pack are fully fungible and can be
 * spent on any premium endpoint, just like credits bought through the base
 * /api/payment/buy-credits flow. The point of a pack is:
 *
 *   1. Reduce decision friction for agent operators ("which size do I buy?")
 *   2. Showcase relevant endpoints ("here are the calls you'll actually make")
 *   3. Give a concrete sample so agents can see expected output shapes
 *
 * The actual purchase still goes through /api/payment/buy-credits +
 * /api/payment/confirm. The only thing a pack does at the Worker level is
 * suggest a USD amount + endpoint list. The volume-discount tiers in
 * /api/payment/info still apply (5/30/200 USD), so a pack at $30 gets the
 * 25% bonus tier automatically.
 */

export interface PaymentPack {
  /** Stable id, used in URLs and analytics. snake_case. */
  id: string;
  /** Display name. */
  name: string;
  /** One-sentence target use case for an agent operator. */
  useCase: string;
  /** Suggested USD purchase amount. Volume tiers apply automatically. */
  suggestedUsd: number;
  /** Approximate credits the suggested amount yields at base + tier bonus. */
  approxCredits: number;
  /** Premium endpoint paths the pack is built around. Agents can call any premium endpoint with these credits, but these are the ones the pack is curated for. */
  highlightedEndpoints: string[];
  /** Free endpoints that pair well with the pack (no credit cost). */
  pairsWithFree: string[];
  /** A sample call agent operators can drop into a runbook to verify the pack works. Plain prose; not executed. */
  sampleCall: string;
}

const TIER_BONUS = (usd: number): number => {
  if (usd >= 200) return 80;
  if (usd >= 30) return 65;
  if (usd >= 5) return 55;
  return 50;
};

const creditsFor = (usd: number): number => Math.floor(usd * TIER_BONUS(usd));

export const PAYMENT_PACKS: PaymentPack[] = [
  {
    id: 'starter',
    name: 'Starter Pack',
    useCase:
      'Just exploring TF premium endpoints. Cheapest entry point, fungible credits, includes the first-payment welcome bonus on a fresh sender wallet.',
    suggestedUsd: 5,
    approxCredits: creditsFor(5),
    highlightedEndpoints: [
      '/api/premium/whats-new',
      '/api/premium/news/search',
      '/api/premium/agents/directory',
    ],
    pairsWithFree: ['/api/news', '/api/status', '/api/models'],
    sampleCall:
      'GET /api/premium/whats-new with Authorization: Bearer <token>. Returns the morning brief: pricing changes, model adds/removes, status incidents, top headlines from the last 1-7 days.',
  },
  {
    id: 'ai_routing',
    name: 'AI Routing Pack',
    useCase:
      'Agents that route LLM calls across providers and need to pick the right model on every request given budget, quality, and latency constraints.',
    suggestedUsd: 20,
    approxCredits: creditsFor(20),
    highlightedEndpoints: [
      '/api/premium/routing',
      '/api/premium/compare/models',
      '/api/premium/cost/projection',
      '/api/premium/providers/{name}',
    ],
    pairsWithFree: ['/api/models', '/api/benchmarks', '/api/preview/routing'],
    sampleCall:
      'GET /api/premium/routing?task=code&budget=5&min_quality=0.7&top_n=3. Returns top-3 ranked model recommendations with composite scores across quality/availability/cost/latency, joined live from pricing/benchmarks/status.',
  },
  {
    id: 'macro',
    name: 'Macro Pack',
    useCase:
      'Agents tracking macro/economic conditions, recession risk, and AI policy timelines for investment thesis, commentary, or scheduled briefings.',
    suggestedUsd: 20,
    approxCredits: creditsFor(20),
    highlightedEndpoints: [
      '/api/premium/macro/digest',
      '/api/premium/economy/recession-watch',
      '/api/premium/economy/series/{source}/{series_id}',
      '/api/premium/policy/timeline',
    ],
    pairsWithFree: ['/api/economy/bls/indicators', '/api/economy/fred/indicators', '/api/policy/ai/registry'],
    sampleCall:
      'GET /api/premium/macro/digest. One agent-shaped morning brief: rates with yield-curve regime, inflation regime, employment regime, growth + money + FX, plus 2-3 sentence overall narrative. Compute is the gate; raw data stays free.',
  },
  {
    id: 'research_velocity',
    name: 'Research Velocity Pack',
    useCase:
      'Agents tracking AI research momentum: which institutions are accelerating, which Python packages are getting traction, which MCP servers are appearing.',
    suggestedUsd: 20,
    approxCredits: creditsFor(20),
    highlightedEndpoints: [
      '/api/premium/research/velocity',
      '/api/premium/packages/pypi/momentum',
      '/api/premium/mcp/registry/series',
    ],
    pairsWithFree: ['/api/research/institutions/ai', '/api/packages/pypi/ai-trending', '/api/mcp/registry/snapshot'],
    sampleCall:
      'GET /api/premium/research/velocity. Per-institution velocity layer over the free OpenAlex baseline: 30-day output annualized vs 365-day baseline, direction classification, top movers, country/type breakdowns.',
  },
  {
    id: 'provider_intel',
    name: 'Provider Intel Pack',
    useCase:
      'Agents doing deep AI provider analysis: pricing history, benchmark trajectories, uptime curves, measured SLA series. Bigger pack because the data is series-shaped (one credit per series query).',
    suggestedUsd: 30,
    approxCredits: creditsFor(30),
    highlightedEndpoints: [
      '/api/premium/providers/{name}',
      '/api/premium/history/pricing/series',
      '/api/premium/history/benchmarks/series',
      '/api/premium/history/status/uptime',
      '/api/premium/probe/series',
    ],
    pairsWithFree: ['/api/models', '/api/benchmarks', '/api/status'],
    sampleCall:
      'GET /api/premium/providers/anthropic. One paid call returns live status, all models with pricing+tier+benchmarks joined, recent news, agent traffic. Aggregation over four free endpoints into one agent-shaped payload.',
  },
  {
    id: 'agent_brief',
    name: 'Agent Brief Pack',
    useCase:
      'Agents producing daily AI briefings: news search with relevance scoring, what\'s-new morning brief, agents directory with traffic signal. Recurring usage profile that compounds.',
    suggestedUsd: 30,
    approxCredits: creditsFor(30),
    highlightedEndpoints: [
      '/api/premium/news/search',
      '/api/premium/whats-new',
      '/api/premium/agents/directory',
      '/api/premium/watches',
    ],
    pairsWithFree: ['/api/news', '/api/agents/activity'],
    sampleCall:
      'GET /api/premium/news/search?q=AgentCore+Payments&days=7. Full-text search over the AI news corpus with title (3x) + snippet (1x) + recency boost, plus date/provider/category filters. Returns relevance-scored articles.',
  },
];

export const PAYMENT_PACKS_LAST_UPDATED = '2026-05-08';

/**
 * Builds the public-facing JSON payload for /api/payment/packs.
 */
export function paymentPacksPayload(): {
  ok: true;
  source: 'tensorfeed.ai';
  lastUpdated: string;
  count: number;
  note: string;
  packs: PaymentPack[];
} {
  return {
    ok: true,
    source: 'tensorfeed.ai',
    lastUpdated: PAYMENT_PACKS_LAST_UPDATED,
    count: PAYMENT_PACKS.length,
    note:
      'Packs are curated marketing bundles. Credits purchased through any pack are fully fungible across all premium endpoints. Volume tiers (5/30/200 USD) apply automatically. Purchase via /api/payment/buy-credits with the suggested amount.',
    packs: PAYMENT_PACKS,
  };
}
