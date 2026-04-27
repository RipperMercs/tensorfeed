#!/usr/bin/env node

import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import { z } from 'zod';

const API_BASE = 'https://tensorfeed.ai/api';
const SDK_VERSION = '1.3.0';

// ── API helpers ─────────────────────────────────────────────────────

interface FetchOptions {
  method?: 'GET' | 'POST' | 'DELETE';
  body?: unknown;
  /** When true, attach the TENSORFEED_TOKEN env var as a Bearer token. */
  auth?: boolean;
}

async function fetchJSON(path: string, opts: FetchOptions = {}): Promise<unknown> {
  const headers: Record<string, string> = {
    'User-Agent': `TensorFeed-MCP/${SDK_VERSION}`,
  };
  if (opts.body !== undefined) headers['Content-Type'] = 'application/json';
  if (opts.auth) {
    const token = process.env.TENSORFEED_TOKEN;
    if (!token) {
      throw new Error(
        'TENSORFEED_TOKEN env var is not set. Premium MCP tools require a bearer token. ' +
          'Buy credits at https://tensorfeed.ai/developers/agent-payments and pass the returned tf_live_... token via the TENSORFEED_TOKEN env var in your MCP client config.',
      );
    }
    headers['Authorization'] = `Bearer ${token}`;
  }
  const res = await fetch(`${API_BASE}${path}`, {
    method: opts.method ?? 'GET',
    headers,
    ...(opts.body !== undefined ? { body: JSON.stringify(opts.body) } : {}),
  });
  if (!res.ok) {
    let errPayload: unknown;
    try {
      errPayload = await res.json();
    } catch {
      errPayload = await res.text().catch(() => '');
    }
    if (res.status === 402) {
      throw new Error(
        `Payment required (402). Your token may be out of credits. Top up at https://tensorfeed.ai/developers/agent-payments. Detail: ${JSON.stringify(errPayload)}`,
      );
    }
    if (res.status === 401) {
      throw new Error(
        `Token rejected (401). Check that TENSORFEED_TOKEN is set to a valid tf_live_... token. Detail: ${JSON.stringify(errPayload)}`,
      );
    }
    throw new Error(`API error ${res.status}: ${JSON.stringify(errPayload)}`);
  }
  return res.json();
}

// ── Server setup ────────────────────────────────────────────────────

const server = new McpServer({
  name: 'tensorfeed',
  version: SDK_VERSION,
});

// ── Tool: get_ai_news ───────────────────────────────────────────────

server.tool(
  'get_ai_news',
  'Get the latest AI news articles from TensorFeed.ai. Aggregates from 15+ sources including Anthropic, OpenAI, Google, TechCrunch, The Verge, arXiv, and more.',
  {
    category: z.string().optional().describe('Filter by category (e.g. "anthropic", "openai", "research", "tools")'),
    limit: z.number().min(1).max(50).optional().describe('Number of articles to return (default 10, max 50)'),
  },
  async ({ category, limit }) => {
    const params = new URLSearchParams();
    if (category) params.set('category', category);
    params.set('limit', String(limit || 10));

    const data = await fetchJSON(`/news?${params}`) as {
      articles: { title: string; url: string; source: string; snippet: string; categories: string[]; publishedAt: string }[];
    };

    const text = data.articles
      .map((a, i) => `${i + 1}. ${a.title}\n   Source: ${a.source}\n   URL: ${a.url}\n   ${a.snippet ? a.snippet + '\n   ' : ''}Published: ${a.publishedAt}`)
      .join('\n\n');

    return { content: [{ type: 'text' as const, text: text || 'No articles found.' }] };
  }
);

// ── Tool: get_ai_status ─────────────────────────────────────────────

server.tool(
  'get_ai_status',
  'Get real-time operational status of major AI services (Claude, OpenAI, Gemini, Mistral, Cohere, Replicate, Hugging Face).',
  {},
  async () => {
    const data = await fetchJSON('/status') as {
      services: { name: string; provider: string; status: string; components: { name: string; status: string }[] }[];
    };

    const text = data.services
      .map(s => {
        const components = s.components.length > 0
          ? '\n' + s.components.map(c => `     ${c.name}: ${c.status}`).join('\n')
          : '';
        return `  ${s.status === 'operational' ? 'OK' : s.status.toUpperCase()} ${s.name} (${s.provider})${components}`;
      })
      .join('\n');

    return { content: [{ type: 'text' as const, text: `AI Service Status:\n${text}` }] };
  }
);

// ── Tool: is_service_down ───────────────────────────────────────────

server.tool(
  'is_service_down',
  'Check if a specific AI service is currently down or experiencing issues.',
  {
    service: z.string().describe('Service name to check (e.g. "claude", "openai", "gemini", "mistral", "cohere", "hugging face", "replicate")'),
  },
  async ({ service }) => {
    const data = await fetchJSON('/status') as {
      services: { name: string; provider: string; status: string; components: { name: string; status: string }[] }[];
    };

    const match = data.services.find(s =>
      s.name.toLowerCase().includes(service.toLowerCase()) ||
      s.provider.toLowerCase().includes(service.toLowerCase())
    );

    if (!match) {
      return { content: [{ type: 'text' as const, text: `Service "${service}" not found. Available services: ${data.services.map(s => s.name).join(', ')}` }] };
    }

    const statusEmoji = match.status === 'operational' ? 'OK' : match.status === 'degraded' ? 'DEGRADED' : 'DOWN';
    const components = match.components.length > 0
      ? '\nComponents:\n' + match.components.map(c => `  ${c.name}: ${c.status}`).join('\n')
      : '';

    return {
      content: [{
        type: 'text' as const,
        text: `${statusEmoji} ${match.name} (${match.provider}) is ${match.status}${components}`
      }]
    };
  }
);

// ── Tool: get_model_pricing ─────────────────────────────────────────

server.tool(
  'get_model_pricing',
  'Get AI model pricing comparison across all major providers (Anthropic, OpenAI, Google, Meta, Mistral, Cohere). Prices per 1M tokens.',
  {},
  async () => {
    const data = await fetchJSON('/models') as {
      providers: {
        name: string;
        models: { name: string; inputPrice: number; outputPrice: number; contextWindow: number; released: string; capabilities: string[] }[];
      }[];
    };

    const text = data.providers
      .map(p => {
        const models = p.models
          .map(m => {
            const input = m.inputPrice === 0 ? 'Free' : `$${m.inputPrice.toFixed(2)}`;
            const output = m.outputPrice === 0 ? 'Free' : `$${m.outputPrice.toFixed(2)}`;
            const ctx = m.contextWindow >= 1000000
              ? `${(m.contextWindow / 1000000).toFixed(0)}M`
              : `${(m.contextWindow / 1000).toFixed(0)}K`;
            return `    ${m.name}: Input ${input}, Output ${output}, Context ${ctx}, Released ${m.released}`;
          })
          .join('\n');
        return `  ${p.name}:\n${models}`;
      })
      .join('\n\n');

    return { content: [{ type: 'text' as const, text: `AI Model Pricing (per 1M tokens):\n\n${text}` }] };
  }
);

// ── Tool: get_ai_today ──────────────────────────────────────────────

server.tool(
  'get_ai_today',
  'Get a summary of what happened in AI today. Returns the top stories from the last 24 hours.',
  {
    limit: z.number().min(1).max(20).optional().describe('Number of stories (default 5)'),
  },
  async ({ limit }) => {
    const data = await fetchJSON(`/news?limit=${limit || 5}`) as {
      articles: { title: string; url: string; source: string; publishedAt: string }[];
    };

    const text = data.articles
      .map((a, i) => `${i + 1}. ${a.title} (${a.source})\n   ${a.url}`)
      .join('\n\n');

    return { content: [{ type: 'text' as const, text: `Today in AI:\n\n${text}` }] };
  }
);

// ════════════════════════════════════════════════════════════════════
// PREMIUM TOOLS (require TENSORFEED_TOKEN env var, paid in USDC on Base)
// ════════════════════════════════════════════════════════════════════

// ── Tool: get_account_balance ───────────────────────────────────────

server.tool(
  'get_account_balance',
  'Check the credit balance for the configured TensorFeed bearer token. Free, but requires TENSORFEED_TOKEN to be set.',
  {},
  async () => {
    const data = (await fetchJSON('/payment/balance', { auth: true })) as {
      balance: number;
      created: string;
      last_used: string;
      total_purchased: number;
    };
    return {
      content: [
        {
          type: 'text' as const,
          text: `Balance: ${data.balance} credits\nTotal purchased: ${data.total_purchased}\nCreated: ${data.created}\nLast used: ${data.last_used}`,
        },
      ],
    };
  },
);

// ── Tool: get_account_usage ─────────────────────────────────────────

server.tool(
  'get_account_usage',
  'Show per-endpoint usage for the configured TensorFeed token (last 100 calls aggregated). Free, but requires TENSORFEED_TOKEN.',
  {},
  async () => {
    const data = (await fetchJSON('/payment/usage', { auth: true })) as {
      total_calls: number;
      total_credits_spent: number;
      by_endpoint: Record<string, { calls: number; credits: number; last_seen: string }>;
    };
    if (data.total_calls === 0) {
      return { content: [{ type: 'text' as const, text: 'No premium API calls on this token yet.' }] };
    }
    const rows = Object.entries(data.by_endpoint)
      .sort(([, a], [, b]) => b.calls - a.calls)
      .map(([ep, info]) => `  ${ep}: ${info.calls} calls, ${info.credits} credits, last ${info.last_seen}`)
      .join('\n');
    return {
      content: [
        {
          type: 'text' as const,
          text: `Total: ${data.total_calls} calls, ${data.total_credits_spent} credits\n\n${rows}`,
        },
      ],
    };
  },
);

// ── Tool: premium_routing (1 credit) ────────────────────────────────

server.tool(
  'premium_routing',
  'Get a ranked list of recommended AI models for a task with full score breakdown (quality, availability, cost, latency). Costs 1 credit.',
  {
    task: z.enum(['code', 'reasoning', 'creative', 'general']).optional().describe('Task type the model needs to be good at (default: general)'),
    budget: z.number().optional().describe('Max blended USD per 1M tokens'),
    min_quality: z.number().min(0).max(1).optional().describe('Minimum quality score in [0, 1]'),
    top_n: z.number().min(1).max(10).optional().describe('How many models to return (default 5)'),
  },
  async ({ task, budget, min_quality, top_n }) => {
    const params = new URLSearchParams();
    if (task) params.set('task', task);
    if (typeof budget === 'number') params.set('budget', String(budget));
    if (typeof min_quality === 'number') params.set('min_quality', String(min_quality));
    if (typeof top_n === 'number') params.set('top_n', String(top_n));
    const data = (await fetchJSON(`/premium/routing?${params}`, { auth: true })) as {
      task: string;
      recommendations: {
        rank: number;
        model: { name: string; provider: string };
        pricing: { input: number; output: number };
        composite_score: number;
        components: { quality: number; availability: number; cost: number; latency: number };
      }[];
      billing?: { credits_charged: number; credits_remaining?: number };
    };
    const list = data.recommendations
      .map(r => {
        const c = r.components;
        return `  #${r.rank} ${r.model.name} (${r.model.provider}) score=${r.composite_score.toFixed(3)}\n     in $${r.pricing.input}/1M, out $${r.pricing.output}/1M\n     quality=${c.quality.toFixed(2)} avail=${c.availability.toFixed(2)} cost=${c.cost.toFixed(2)} latency=${c.latency.toFixed(2)}`;
      })
      .join('\n\n');
    const billing = data.billing
      ? `\n\nCharged ${data.billing.credits_charged} credit. Remaining: ${data.billing.credits_remaining}.`
      : '';
    return { content: [{ type: 'text' as const, text: `Routing for "${data.task}":\n\n${list}${billing}` }] };
  },
);

// ── Tool: pricing_series (1 credit) ─────────────────────────────────

server.tool(
  'pricing_series',
  'Daily price points for one AI model with min/max/delta summary. Default range = last 30 days, max 90 days. Costs 1 credit.',
  {
    model: z.string().describe('Model id or display name (e.g. "Claude Opus 4.7" or "claude-opus-4-7")'),
    from: z.string().optional().describe('Start date YYYY-MM-DD UTC (default: 30 days ago)'),
    to: z.string().optional().describe('End date YYYY-MM-DD UTC (default: today)'),
  },
  async ({ model, from, to }) => {
    const params = new URLSearchParams({ model });
    if (from) params.set('from', from);
    if (to) params.set('to', to);
    const data = (await fetchJSON(`/premium/history/pricing/series?${params}`, { auth: true })) as {
      model: string;
      provider: string | null;
      points: { date: string; input: number; output: number; blended: number }[];
      summary: {
        first: { date: string; blended: number } | null;
        latest: { date: string; blended: number } | null;
        min_blended: number | null;
        max_blended: number | null;
        delta_pct_blended: number | null;
        changes_detected: number;
        days_with_data: number;
      };
      billing?: { credits_remaining?: number };
    };
    const s = data.summary;
    const summary = s.first && s.latest
      ? `${s.first.date} blended $${s.first.blended} -> ${s.latest.date} blended $${s.latest.blended} (${s.delta_pct_blended}%, ${s.changes_detected} changes, min $${s.min_blended}, max $${s.max_blended})`
      : 'no data points in range';
    return {
      content: [
        {
          type: 'text' as const,
          text: `${data.model} (${data.provider ?? 'unknown'}) ${data.points.length} points\n${summary}\nCredits remaining: ${data.billing?.credits_remaining ?? '?'}`,
        },
      ],
    };
  },
);

// ── Tool: benchmark_series (1 credit) ───────────────────────────────

server.tool(
  'benchmark_series',
  'Score evolution for a single benchmark on one AI model. Costs 1 credit. Benchmark keys: swe_bench, mmlu_pro, gpqa_diamond, math, human_eval.',
  {
    model: z.string().describe('Model id or display name'),
    benchmark: z.string().describe('Benchmark key (e.g. swe_bench, mmlu_pro, gpqa_diamond, math, human_eval)'),
    from: z.string().optional().describe('Start date YYYY-MM-DD UTC (default: 30 days ago)'),
    to: z.string().optional().describe('End date YYYY-MM-DD UTC (default: today)'),
  },
  async ({ model, benchmark, from, to }) => {
    const params = new URLSearchParams({ model, benchmark });
    if (from) params.set('from', from);
    if (to) params.set('to', to);
    const data = (await fetchJSON(`/premium/history/benchmarks/series?${params}`, { auth: true })) as {
      model: string;
      benchmark: string;
      points: { date: string; score: number }[];
      summary: { first: { date: string; score: number } | null; latest: { date: string; score: number } | null; delta_pp: number | null };
      billing?: { credits_remaining?: number };
    };
    const s = data.summary;
    const summary = s.first && s.latest
      ? `${s.first.date} score ${s.first.score} -> ${s.latest.date} score ${s.latest.score} (delta ${s.delta_pp} pp)`
      : 'no data in range';
    return {
      content: [
        {
          type: 'text' as const,
          text: `${data.model} on ${data.benchmark}: ${data.points.length} points\n${summary}\nCredits remaining: ${data.billing?.credits_remaining ?? '?'}`,
        },
      ],
    };
  },
);

// ── Tool: status_uptime (1 credit) ──────────────────────────────────

server.tool(
  'status_uptime',
  'Daily uptime rollup for one provider with operational/degraded/down day counts and uptime % (degraded counts as half-credit). Costs 1 credit.',
  {
    provider: z.string().describe('Provider name (e.g. anthropic, openai, google)'),
    from: z.string().optional().describe('Start date YYYY-MM-DD UTC (default: 30 days ago)'),
    to: z.string().optional().describe('End date YYYY-MM-DD UTC (default: today)'),
  },
  async ({ provider, from, to }) => {
    const params = new URLSearchParams({ provider });
    if (from) params.set('from', from);
    if (to) params.set('to', to);
    const data = (await fetchJSON(`/premium/history/status/uptime?${params}`, { auth: true })) as {
      provider: string;
      days_total: number;
      days_with_data: number;
      days_operational: number;
      days_degraded: number;
      days_down: number;
      uptime_pct: number | null;
      incident_days: { date: string; status: string }[];
      billing?: { credits_remaining?: number };
    };
    const incidents = data.incident_days.length
      ? '\n\nIncident days:\n' + data.incident_days.map(d => `  ${d.date}: ${d.status}`).join('\n')
      : '';
    return {
      content: [
        {
          type: 'text' as const,
          text:
            `${data.provider} uptime: ${data.uptime_pct ?? 'n/a'}% over ${data.days_with_data} measured days (of ${data.days_total} in range)\n` +
            `  operational: ${data.days_operational}, degraded: ${data.days_degraded}, down: ${data.days_down}` +
            incidents +
            `\nCredits remaining: ${data.billing?.credits_remaining ?? '?'}`,
        },
      ],
    };
  },
);

// ── Tool: history_compare (1 credit) ────────────────────────────────

server.tool(
  'history_compare',
  'Diff two daily snapshots: returns added, removed, and changed entries with deltas. Costs 1 credit.',
  {
    from: z.string().describe('Earlier snapshot date YYYY-MM-DD'),
    to: z.string().describe('Later snapshot date YYYY-MM-DD'),
    type: z.enum(['pricing', 'benchmarks']).optional().describe('Snapshot type (default: pricing)'),
  },
  async ({ from, to, type }) => {
    const params = new URLSearchParams({ from, to, type: type ?? 'pricing' });
    const data = (await fetchJSON(`/premium/history/compare?${params}`, { auth: true })) as
      | {
          ok: true;
          type: 'pricing';
          added: { model: string; provider: string }[];
          removed: { model: string; provider: string }[];
          changed: { model: string; field: string; from: number; to: number; delta_pct: number | null }[];
          unchanged_count: number;
          billing?: { credits_remaining?: number };
        }
      | {
          ok: true;
          type: 'benchmarks';
          added_models: string[];
          removed_models: string[];
          changed: { model: string; benchmark: string; from: number; to: number; delta_pp: number }[];
          billing?: { credits_remaining?: number };
        };
    if (data.type === 'pricing') {
      const changes = data.changed
        .map(c => `  ${c.model} ${c.field}: ${c.from} -> ${c.to} (${c.delta_pct ?? 'n/a'}%)`)
        .join('\n');
      return {
        content: [
          {
            type: 'text' as const,
            text:
              `Pricing diff ${from} -> ${to}\n` +
              `  added: ${data.added.length} (${data.added.map(a => a.model).join(', ') || 'none'})\n` +
              `  removed: ${data.removed.length} (${data.removed.map(r => r.model).join(', ') || 'none'})\n` +
              `  unchanged: ${data.unchanged_count}\n\n` +
              (changes || '  no field changes') +
              `\nCredits remaining: ${data.billing?.credits_remaining ?? '?'}`,
          },
        ],
      };
    }
    const changes = data.changed
      .map(c => `  ${c.model} ${c.benchmark}: ${c.from} -> ${c.to} (delta ${c.delta_pp} pp)`)
      .join('\n');
    return {
      content: [
        {
          type: 'text' as const,
          text:
            `Benchmark diff ${from} -> ${to}\n` +
            `  added: ${data.added_models.length} (${data.added_models.join(', ') || 'none'})\n` +
            `  removed: ${data.removed_models.length} (${data.removed_models.join(', ') || 'none'})\n\n` +
            (changes || '  no score changes') +
            `\nCredits remaining: ${data.billing?.credits_remaining ?? '?'}`,
        },
      ],
    };
  },
);

// ── Tool: premium_agents_directory (1 credit) ───────────────────────

server.tool(
  'premium_agents_directory',
  'Enriched AI agents catalog joined with live status, recent news, agent traffic, flagship pricing, and a 0-100 trending_score. Costs 1 credit.',
  {
    category: z.string().optional().describe('coding, research, general, creative, frameworks'),
    status: z.enum(['operational', 'degraded', 'down', 'unknown']).optional(),
    open_source: z.boolean().optional(),
    sort: z.enum(['trending', 'alphabetical', 'status', 'price_low', 'price_high', 'news_count']).optional(),
    limit: z.number().min(1).max(100).optional(),
  },
  async ({ category, status, open_source, sort, limit }) => {
    const params = new URLSearchParams();
    if (category) params.set('category', category);
    if (status) params.set('status', status);
    if (typeof open_source === 'boolean') params.set('open_source', String(open_source));
    if (sort) params.set('sort', sort);
    if (typeof limit === 'number') params.set('limit', String(limit));
    const data = (await fetchJSON(`/premium/agents/directory?${params}`, { auth: true })) as {
      total: number;
      returned: number;
      sort: string;
      agents: {
        id: string;
        name: string;
        provider: string;
        category: string;
        live_status: string;
        recent_news_count: number;
        flagship_pricing: { model: string; blended: number } | null;
        trending_score: number;
      }[];
      billing?: { credits_remaining?: number };
    };
    const list = data.agents
      .map(
        a =>
          `  ${a.name} (${a.provider}) [${a.category}] status=${a.live_status} score=${a.trending_score} news=${a.recent_news_count}` +
          (a.flagship_pricing ? ` flagship=${a.flagship_pricing.model} $${a.flagship_pricing.blended}/1M` : ''),
      )
      .join('\n');
    return {
      content: [
        {
          type: 'text' as const,
          text: `Agents (sort: ${data.sort}, ${data.returned} of ${data.total}):\n\n${list}\n\nCredits remaining: ${data.billing?.credits_remaining ?? '?'}`,
        },
      ],
    };
  },
);

// ── Tool: cost_projection (1 credit) ────────────────────────────────

server.tool(
  'cost_projection',
  'Project the cost of a token-usage workload across 1-10 AI models. Returns daily/weekly/monthly/yearly totals per model and a ranking by cheapest monthly. Costs 1 credit.',
  {
    models: z.string().describe('One model or comma-separated list of up to 10 (e.g. "Claude Opus 4.7,GPT-5.5,Gemini 3"). Names or ids both work.'),
    input_tokens_per_day: z.number().min(0).describe('Expected daily input token volume'),
    output_tokens_per_day: z.number().min(0).describe('Expected daily output token volume'),
    horizon: z.enum(['daily', 'weekly', 'monthly', 'yearly']).optional().describe('Primary horizon to highlight (default monthly). All four are always computed.'),
  },
  async ({ models, input_tokens_per_day, output_tokens_per_day, horizon }) => {
    const params = new URLSearchParams({
      model: models,
      input_tokens_per_day: String(input_tokens_per_day),
      output_tokens_per_day: String(output_tokens_per_day),
    });
    if (horizon) params.set('horizon', horizon);
    const data = (await fetchJSON(`/premium/cost/projection?${params}`, { auth: true })) as {
      workload: { input_tokens_per_day: number; output_tokens_per_day: number };
      projections: (
        | { model: string; provider: string; matched: true; daily: { total: number }; weekly_total: number; monthly_total: number; yearly_total: number; rates: { input_per_1m: number; output_per_1m: number } }
        | { model: string; matched: false; reason: string }
      )[];
      ranked_cheapest_monthly: { model: string; provider: string; monthly_total: number }[];
      billing?: { credits_remaining?: number };
    };
    const lines = data.projections.map(p => {
      if (!p.matched) return `  ${p.model}: not found in pricing catalog`;
      return `  ${p.model} (${p.provider}): $${p.daily.total}/day, $${p.weekly_total}/wk, $${p.monthly_total}/mo, $${p.yearly_total}/yr (in $${p.rates.input_per_1m}/1M, out $${p.rates.output_per_1m}/1M)`;
    }).join('\n');
    const ranked = data.ranked_cheapest_monthly.length
      ? '\n\nCheapest monthly:\n' +
        data.ranked_cheapest_monthly
          .map((r, i) => `  #${i + 1} ${r.model} (${r.provider}): $${r.monthly_total}/mo`)
          .join('\n')
      : '';
    return {
      content: [
        {
          type: 'text' as const,
          text:
            `Workload: ${data.workload.input_tokens_per_day} input + ${data.workload.output_tokens_per_day} output tokens/day\n\n${lines}${ranked}\n\nCredits remaining: ${data.billing?.credits_remaining ?? '?'}`,
        },
      ],
    };
  },
);

// ── Tool: news_search (1 credit) ────────────────────────────────────

server.tool(
  'news_search',
  'Full-text search over the TensorFeed news article corpus with optional date range, provider, and category filters. Relevance scoring with recency boost. Costs 1 credit.',
  {
    q: z.string().optional().describe('Free-text query, e.g. "claude opus pricing". Omit to browse latest filtered articles.'),
    from: z.string().optional().describe('Start date YYYY-MM-DD UTC (inclusive)'),
    to: z.string().optional().describe('End date YYYY-MM-DD UTC (inclusive end-of-day)'),
    provider: z.string().optional().describe('Substring match against source name and domain (e.g. "anthropic", "openai", "techcrunch")'),
    category: z.string().optional().describe('Substring match against article categories'),
    limit: z.number().min(1).max(100).optional().describe('Max results (default 25, max 100)'),
  },
  async ({ q, from, to, provider, category, limit }) => {
    const params = new URLSearchParams();
    if (q) params.set('q', q);
    if (from) params.set('from', from);
    if (to) params.set('to', to);
    if (provider) params.set('provider', provider);
    if (category) params.set('category', category);
    if (typeof limit === 'number') params.set('limit', String(limit));
    const data = (await fetchJSON(`/premium/news/search?${params}`, { auth: true })) as {
      query: string | null;
      matched: number;
      returned: number;
      results: { title: string; url: string; source: string; published_at: string; relevance: number; matched_terms: string[]; snippet: string }[];
      billing?: { credits_remaining?: number };
    };
    if (data.results.length === 0) {
      return { content: [{ type: 'text' as const, text: `No articles matched. (matched: ${data.matched})` }] };
    }
    const list = data.results
      .map(
        (r, i) =>
          `${i + 1}. ${r.title} (${r.source})\n   ${r.url}\n   ${r.published_at} | relevance ${r.relevance}${r.matched_terms.length ? ` | terms: ${r.matched_terms.join(', ')}` : ''}\n   ${r.snippet}`,
      )
      .join('\n\n');
    return {
      content: [
        {
          type: 'text' as const,
          text: `${data.returned} of ${data.matched} matches${data.query ? ` for "${data.query}"` : ''}:\n\n${list}\n\nCredits remaining: ${data.billing?.credits_remaining ?? '?'}`,
        },
      ],
    };
  },
);

// ── Tool: list_watches ──────────────────────────────────────────────

server.tool(
  'list_watches',
  'List the active webhook watches owned by the configured TensorFeed token. Free, requires TENSORFEED_TOKEN.',
  {},
  async () => {
    const data = (await fetchJSON('/premium/watches', { auth: true })) as {
      count: number;
      watches: {
        id: string;
        spec: { type: string; model?: string; field?: string; op?: string; threshold?: number; provider?: string; value?: string };
        callback_url: string;
        fire_count: number;
        fire_cap: number;
        expires_at: string;
        status: string;
      }[];
    };
    if (data.count === 0) {
      return { content: [{ type: 'text' as const, text: 'No active watches.' }] };
    }
    const rows = data.watches
      .map(w => {
        const desc =
          w.spec.type === 'price'
            ? `${w.spec.model} ${w.spec.field} ${w.spec.op}${w.spec.threshold !== undefined ? ' ' + w.spec.threshold : ''}`
            : `${w.spec.provider} ${w.spec.op}${w.spec.value ? ' ' + w.spec.value : ''}`;
        return `  ${w.id} (${w.status}) [${w.spec.type}] ${desc}\n     -> ${w.callback_url}\n     fired ${w.fire_count}/${w.fire_cap}, expires ${w.expires_at}`;
      })
      .join('\n\n');
    return { content: [{ type: 'text' as const, text: `${data.count} active watches:\n\n${rows}` }] };
  },
);

// ── Tool: create_price_watch (1 credit) ─────────────────────────────

server.tool(
  'create_price_watch',
  'Register a webhook watch on a model price change. Costs 1 credit. Watch lives 90 days. Each fire is an HMAC-signed POST to callback_url.',
  {
    model: z.string().describe('Model name (e.g. "Claude Opus 4.7")'),
    field: z.enum(['inputPrice', 'outputPrice', 'blended']).describe('Which price field to watch'),
    op: z.enum(['lt', 'gt', 'changes']).describe('Trigger: lt = below threshold, gt = above, changes = any change'),
    threshold: z.number().optional().describe('Required when op is lt or gt; ignored for changes'),
    callback_url: z.string().describe('HTTPS URL to POST to when the watch fires'),
    secret: z.string().optional().describe('Optional shared secret used to HMAC-sign delivery bodies'),
  },
  async ({ model, field, op, threshold, callback_url, secret }) => {
    const body: Record<string, unknown> = {
      spec: { type: 'price', model, field, op, ...(typeof threshold === 'number' ? { threshold } : {}) },
      callback_url,
    };
    if (secret !== undefined) body.secret = secret;
    const data = (await fetchJSON('/premium/watches', { method: 'POST', body, auth: true })) as {
      watch: { id: string; expires_at: string };
      billing?: { credits_remaining?: number };
    };
    return {
      content: [
        {
          type: 'text' as const,
          text: `Created watch ${data.watch.id} (expires ${data.watch.expires_at}). Credits remaining: ${data.billing?.credits_remaining ?? '?'}`,
        },
      ],
    };
  },
);

// ── Tool: create_status_watch (1 credit) ────────────────────────────

server.tool(
  'create_status_watch',
  'Register a webhook watch on a service status transition (e.g. anthropic becomes down). Costs 1 credit. Watch lives 90 days.',
  {
    provider: z.string().describe('Provider name (e.g. anthropic, openai)'),
    op: z.enum(['becomes', 'changes']).describe('becomes = transitions to a specific value; changes = any transition'),
    value: z.enum(['operational', 'degraded', 'down']).optional().describe('Required when op is becomes'),
    callback_url: z.string().describe('HTTPS URL to POST to when the watch fires'),
    secret: z.string().optional().describe('Optional HMAC shared secret'),
  },
  async ({ provider, op, value, callback_url, secret }) => {
    const body: Record<string, unknown> = {
      spec: { type: 'status', provider, op, ...(value ? { value } : {}) },
      callback_url,
    };
    if (secret !== undefined) body.secret = secret;
    const data = (await fetchJSON('/premium/watches', { method: 'POST', body, auth: true })) as {
      watch: { id: string; expires_at: string };
      billing?: { credits_remaining?: number };
    };
    return {
      content: [
        {
          type: 'text' as const,
          text: `Created watch ${data.watch.id} (expires ${data.watch.expires_at}). Credits remaining: ${data.billing?.credits_remaining ?? '?'}`,
        },
      ],
    };
  },
);

// ── Tool: delete_watch ──────────────────────────────────────────────

server.tool(
  'delete_watch',
  'Delete one of your active webhook watches by id. Free, requires TENSORFEED_TOKEN.',
  {
    watch_id: z.string().describe('The wat_... id from create_price_watch / create_status_watch / list_watches'),
  },
  async ({ watch_id }) => {
    await fetchJSON(`/premium/watches/${watch_id}`, { method: 'DELETE', auth: true });
    return { content: [{ type: 'text' as const, text: `Deleted watch ${watch_id}.` }] };
  },
);

// ── Start ───────────────────────────────────────────────────────────

async function main() {
  const transport = new StdioServerTransport();
  await server.connect(transport);
  console.error('TensorFeed MCP server running on stdio');
}

main().catch(console.error);
