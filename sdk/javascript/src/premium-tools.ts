/**
 * Shared premium-tool plumbing for the framework adapters.
 *
 * Internal module. Powers `tensorfeed/ai` (Vercel AI SDK) and
 * `tensorfeed/langchain` (LangChain.js). Framework agnostic: it owns
 * the canonical tool descriptions, the result formatters, the call
 * targets, and the one behavior that must never drift between
 * frameworks, the payment posture.
 *
 * Payment posture (load-bearing, do not weaken):
 *
 *   These tools never move funds. A premium call made without a valid
 *   token returns a clear, actionable guidance string explaining how an
 *   operator provisions credits out of band. The tool does not, and
 *   will not, initiate a USDC transfer on its own. Autonomous payment
 *   from inside a tool call is a deliberate non-feature: credit
 *   purchases stay an explicit, per-action operator decision.
 *   Centralizing this here (and testing it once) keeps every framework
 *   binding honest. A test asserts statically that this file never
 *   reaches the payment or signing surface.
 *
 * No `any`: response shapes are read through small `unknown` narrowing
 * helpers, matching the rest of the SDK.
 */

import {
  TensorFeed,
  PaymentRequired,
  RateLimited,
  TensorFeedError,
} from './index.js';

/**
 * The exact, actionable message an agent sees when a premium tool is
 * called without spendable credits. States what is true (this needs
 * credits), what will not happen (no automatic payment), and the path
 * (an operator provisions a token out of band).
 */
export const PREMIUM_PAYMENT_GUIDANCE =
  'This is a paid TensorFeed endpoint (1 credit) and no spendable ' +
  'credit token is available. This tool will not buy credits or move ' +
  'any funds on its own, by design. To enable it, an operator must ' +
  'provision credits out of band (the documented buy-credits then ' +
  'confirm flow with a USDC payment on Base, or the x402 flow) and ' +
  'pass the resulting token when constructing the tools, for example ' +
  "tensorfeedPremiumTools({ token: '...' }). Until then, prefer the " +
  'free TensorFeed tools (news, status, attention, harnesses, routing ' +
  'preview) for this question.';

// ── unknown narrowing helpers (no any) ────────────────────────────────

type Obj = Record<string, unknown>;

function obj(v: unknown): Obj {
  return v !== null && typeof v === 'object' ? (v as Obj) : {};
}
function list(v: unknown): unknown[] {
  return Array.isArray(v) ? v : [];
}
function str(v: unknown): string {
  return v === undefined || v === null ? '' : String(v);
}
function numOrUndef(v: unknown): number | undefined {
  return typeof v === 'number' ? v : undefined;
}

function billingLine(result: unknown): string {
  const b = obj(obj(result).billing);
  const bits: string[] = [];
  if (b.credits_charged !== undefined) bits.push(`${str(b.credits_charged)} credit(s) charged`);
  if (b.balance !== undefined) bits.push(`${str(b.balance)} remaining`);
  return bits.length ? `\n[${bits.join(', ')}]` : '';
}

/**
 * Run a premium client call and resolve to agent-readable text.
 *
 * Never rejects for the expected money and quota cases. A thrown error
 * inside an agent tool call usually aborts the agent or yields an
 * opaque trace; a structured guidance string lets the model reason
 * about what to do next (typically: tell the user it needs credits, or
 * fall back to a free tool).
 *
 *   - no token / token rejected (402): the payment guidance string
 *   - rate limited (429): a short back-off message
 *   - other API error: a concise one-line error
 *   - success: the tool's own formatter output plus a billing footer
 *
 * The PaymentRequired and missing-token paths are exactly where an
 * autonomous-payment bug would hide. There is intentionally no code
 * path here that touches the wallet or the signer.
 */
export async function safeCall(
  invoke: () => Promise<unknown>,
  formatter: (r: unknown) => string,
): Promise<string> {
  let result: unknown;
  try {
    result = await invoke();
  } catch (err) {
    if (err instanceof PaymentRequired) {
      const required = obj(err.payload).credits_required;
      const hint = required !== undefined ? ` (endpoint requires ${str(required)} credit(s))` : '';
      return PREMIUM_PAYMENT_GUIDANCE + hint;
    }
    if (err instanceof RateLimited) {
      return (
        'TensorFeed rate limit hit. Wait and retry, or reduce call ' +
        'frequency. Free public endpoints allow 120 requests/minute ' +
        'per IP; bearer tokens are exempt.'
      );
    }
    if (err instanceof TensorFeedError) {
      return `TensorFeed API error ${err.statusCode}: ${err.message}`;
    }
    // The client throws a plain Error before any network call when no
    // token is set. Treat that as the no-credit path; never rethrow.
    if (err instanceof Error && /token/i.test(err.message)) {
      return PREMIUM_PAYMENT_GUIDANCE;
    }
    return `TensorFeed tool error: ${err instanceof Error ? err.message : String(err)}`;
  }
  try {
    return formatter(result) + billingLine(result);
  } catch {
    const keys =
      result !== null && typeof result === 'object'
        ? Object.keys(result as Obj).sort().join(', ')
        : typeof result;
    return `TensorFeed returned a response in an unexpected shape. Top-level keys: ${keys}.`;
  }
}

// ── Shared descriptions (identical copy across frameworks) ────────────
//
// Every description states the credit cost up front so the model can
// weigh it before calling, and what the tool is uniquely good for so it
// is picked for the right question. Kept verbatim in sync with the
// Python SDK.

export const DESCRIPTIONS: Record<string, string> = {
  tensorfeed_whats_new:
    'PAID, 1 credit. The agent boot brief: a single curated summary of ' +
    'AI model pricing changes, new and removed models, service ' +
    'incidents that started or resolved, current operational counts, ' +
    'and the top news headlines, over the last 1 to 7 days. Call this ' +
    'once at startup instead of polling many free endpoints. Inputs: ' +
    'days (1-7, default 1), news_limit (1-25, default 10).',
  tensorfeed_routing:
    'PAID, 1 credit. Full ranked model routing: the top-N AI models ' +
    'for a task with a complete score breakdown (quality, ' +
    'availability, cost, latency). Use this when the free top-1 ' +
    'preview is not enough. Inputs: task (code|reasoning|creative|' +
    'general), budget (optional max blended USD per 1M tokens), top_n ' +
    '(1-10, default 5).',
  tensorfeed_compare_models:
    'PAID, 1 credit. Side-by-side comparison of 2 to 5 AI models: ' +
    'pricing, normalized benchmarks, live provider status, context ' +
    'window, capabilities, recent news, plus rankings for cheapest ' +
    'blended and most context. Input: ids (comma-separated model ids ' +
    'or display names, 2 to 5).',
  tensorfeed_cost_projection:
    'PAID, 1 credit. Project the cost of a token-usage workload across ' +
    '1 to 10 models over day, week, month, and year, with a ' +
    'cheapest-monthly ranking. Inputs: models (comma-separated), ' +
    'input_tokens_per_day, output_tokens_per_day, horizon (optional).',
  tensorfeed_news_search:
    'PAID, 1 credit. Full-text search over the TensorFeed AI news ' +
    'corpus with relevance scoring and a recency boost. Filter by ' +
    'query, date range, provider, and category. Use this instead of ' +
    'the free latest-news feed when you need to find specific ' +
    'coverage. Inputs: q, from_date, to_date, provider, category, ' +
    'limit (1-100, default 25).',
  tensorfeed_provider_deepdive:
    'PAID, 1 credit. One AI provider full profile in a single call: ' +
    'live status, every model with pricing and benchmarks joined in, ' +
    'recent news, and agent-traffic attribution. Doing this from free ' +
    'endpoints takes several round-trips and a non-trivial join. ' +
    'Input: provider (id or display name).',
  tensorfeed_status_leaderboard:
    'PAID, 1 credit. Cross-provider AI uptime leaderboard over the ' +
    'full 90-day retention window, with incident_count and ' +
    'mttr_minutes per provider. Built for vendor selection and ' +
    'post-incident review. Inputs: from_date, to_date (optional, ' +
    'default last 30 days).',
};

export const PREMIUM_TOOL_NAMES: string[] = Object.keys(DESCRIPTIONS);

// ── Shared invokers (name -> client call) ─────────────────────────────
//
// The single place each tool's call target is defined, so the framework
// bindings cannot drift apart on what they actually call.

export type PremiumArgs = Record<string, unknown>;

type RoutingTask = 'code' | 'reasoning' | 'creative' | 'general';
type CostHorizon = 'daily' | 'weekly' | 'monthly' | 'yearly';

export const INVOKERS: Record<
  string,
  (client: TensorFeed, args: PremiumArgs) => Promise<unknown>
> = {
  tensorfeed_whats_new: (c, a) =>
    c.whatsNew({
      days: numOrUndef(a.days),
      newsLimit: numOrUndef(a.news_limit),
    }),
  tensorfeed_routing: (c, a) =>
    c.routing({
      task: a.task as RoutingTask | undefined,
      budget: numOrUndef(a.budget),
      topN: numOrUndef(a.top_n),
    }),
  tensorfeed_compare_models: (c, a) =>
    c.compareModels({ ids: str(a.ids) }),
  tensorfeed_cost_projection: (c, a) =>
    c.costProjection({
      models: str(a.models),
      inputTokensPerDay: numOrUndef(a.input_tokens_per_day) ?? 0,
      outputTokensPerDay: numOrUndef(a.output_tokens_per_day) ?? 0,
      horizon: a.horizon as CostHorizon | undefined,
    }),
  tensorfeed_news_search: (c, a) =>
    c.newsSearch({
      q: a.q as string | undefined,
      from: a.from_date as string | undefined,
      to: a.to_date as string | undefined,
      provider: a.provider as string | undefined,
      category: a.category as string | undefined,
      limit: numOrUndef(a.limit),
    }),
  tensorfeed_provider_deepdive: (c, a) =>
    c.providerDeepDive(str(a.provider)),
  tensorfeed_status_leaderboard: (c, a) =>
    c.statusLeaderboard({
      from: a.from_date as string | undefined,
      to: a.to_date as string | undefined,
    }),
};

// ── Shared result formatters ──────────────────────────────────────────
//
// Compact, deterministic, defensive. They turn a response into a short
// text block an LLM can read. Lists are truncated. Missing keys degrade
// to a sane default rather than throwing (safeCall also guards the
// formatter; this is belt and suspenders). Behavior mirrors the Python
// SDK formatters.

function formatWhatsNew(raw: unknown): string {
  const r = obj(raw);
  const w = obj(r.window);
  const lines = [`What's new (${str(w.days) || '?'}d window):`];
  const pricing = obj(r.pricing);
  const changed = list(pricing.changes);
  const added = list(pricing.new_models);
  const removed = list(pricing.removed_models);
  lines.push(
    `  pricing: ${changed.length} changes, ${added.length} new, ${removed.length} removed models`,
  );
  for (const ci of changed.slice(0, 5)) {
    const c = obj(ci);
    lines.push(`    ${str(c.model) || '?'} ${str(c.field)}: ${str(c.from)} -> ${str(c.to)}`);
  }
  const incidents = list(obj(r.status).incidents);
  lines.push(`  status: ${incidents.length} incident(s) in window`);
  for (const ii of incidents.slice(0, 3)) {
    const i = obj(ii);
    lines.push(`    ${str(i.provider) || '?'}: ${str(i.state) || str(i.status)}`);
  }
  const news = list(r.news);
  lines.push(`  news: ${news.length} headlines`);
  for (const ni of news.slice(0, 5)) {
    const n = obj(ni);
    lines.push(`    - ${str(n.title)} (${str(n.source)})`);
  }
  if (r.summary !== undefined) lines.push(`  counts: ${JSON.stringify(r.summary)}`);
  return lines.join('\n');
}

function formatRouting(raw: unknown): string {
  const r = obj(raw);
  let recs = r.recommendations ?? r.recommendation ?? [];
  if (recs && !Array.isArray(recs)) recs = [recs];
  const arr = list(recs);
  if (!arr.length) return 'No routing recommendation returned.';
  const lines = ['Model routing (ranked):'];
  for (const xi of arr.slice(0, 10)) {
    const x = obj(xi);
    const model = obj(x.model);
    const name = model.name !== undefined ? str(model.name) : str(x.model);
    const rawScore = x.composite_score ?? x.score;
    const score = typeof rawScore === 'number' ? rawScore.toFixed(3) : str(rawScore);
    const provider = str(x.provider) || str(model.provider);
    lines.push(`  #${str(x.rank) || '?'} ${name}  score=${score}  provider=${provider}`);
  }
  return lines.join('\n');
}

function formatCompareModels(raw: unknown): string {
  const r = obj(raw);
  const models = list(r.models);
  const lines = [`Compared ${models.length} model(s):`];
  for (const mi of models.slice(0, 5)) {
    const m = obj(mi);
    if (m.matched === false) {
      const label = str(m.query) || str(m.name) || str(m.id) || '?';
      lines.push(`  ${label}: (no match)`);
      continue;
    }
    const name = str(m.name) || str(m.id) || '?';
    const p = obj(m.pricing);
    lines.push(
      `  ${name}: in ${str(p.input) || '?'} / out ${str(p.output) || '?'} per 1M, ctx ${str(m.context_window) || '?'}`,
    );
  }
  const rk = obj(r.rankings);
  if (rk.cheapest_blended) lines.push(`  cheapest blended: ${str(rk.cheapest_blended)}`);
  if (rk.most_context) lines.push(`  most context: ${str(rk.most_context)}`);
  return lines.join('\n');
}

function formatCostProjection(raw: unknown): string {
  const r = obj(raw);
  const proj = list(r.projections);
  const lines = ['Cost projection (per model):'];
  for (const pi of proj.slice(0, 10)) {
    const p = obj(pi);
    lines.push(`  ${str(p.model) || '?'}: ~${str(p.monthly_total)}/month`);
  }
  const ranked = list(r.ranked_cheapest_monthly);
  if (ranked.length) {
    const head = ranked[0];
    lines.push(`  cheapest monthly: ${typeof head === 'object' ? str(obj(head).model) : str(head)}`);
  }
  return lines.join('\n');
}

function formatNewsSearch(raw: unknown): string {
  const r = obj(raw);
  const results = list(r.results);
  const lines = [
    `News search: ${str(r.matched) || results.length} matched, showing ${results.length}`,
  ];
  for (const ai of results.slice(0, 10)) {
    const a = obj(ai);
    lines.push(`  - ${str(a.title)} (${str(a.source)}, ${str(a.published_at)}) ${str(a.url)}`);
  }
  return lines.join('\n');
}

function formatProviderDeepDive(raw: unknown): string {
  const r = obj(raw);
  const status = r.status;
  const st = typeof status === 'object' ? str(obj(status).status) : str(status);
  const models = list(r.models);
  const lines = [
    `${str(r.provider) || '?'}: status=${st}, ${models.length} model(s), ${str(r.recent_news_count) || 0} recent news, ${str(r.agent_traffic_24h) || 0} agent hits/24h`,
  ];
  for (const mi of models.slice(0, 6)) {
    const m = obj(mi);
    lines.push(`  ${str(m.name) || str(m.id) || '?'}: tier ${str(m.tier) || '?'}, ctx ${str(m.context_window) || '?'}`);
  }
  for (const ni of list(r.recent_news).slice(0, 5)) {
    const n = obj(ni);
    lines.push(`  news: ${str(n.title)} (${str(n.source)})`);
  }
  return lines.join('\n');
}

function formatStatusLeaderboard(raw: unknown): string {
  const r = obj(raw);
  const entries = list(r.entries);
  if (!entries.length) {
    return `No leaderboard data for the requested window (${str(r.error) || 'no_data'}).`;
  }
  const lines = ['AI provider uptime leaderboard:'];
  for (const ei of entries.slice(0, 15)) {
    const e = obj(ei);
    lines.push(
      `  #${str(e.rank) || '?'} ${str(e.provider) || '?'}: ${str(e.uptime_pct) || '?'}% uptime, ${str(e.incident_count) || 0} incidents, MTTR ${str(e.mttr_minutes) || '?'}m`,
    );
  }
  return lines.join('\n');
}

export const FORMATTERS: Record<string, (r: unknown) => string> = {
  tensorfeed_whats_new: formatWhatsNew,
  tensorfeed_routing: formatRouting,
  tensorfeed_compare_models: formatCompareModels,
  tensorfeed_cost_projection: formatCostProjection,
  tensorfeed_news_search: formatNewsSearch,
  tensorfeed_provider_deepdive: formatProviderDeepDive,
  tensorfeed_status_leaderboard: formatStatusLeaderboard,
};
