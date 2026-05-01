/**
 * Production usage rankings.
 *
 * Real-traffic snapshots of which AI models are actually being used in
 * production, sourced from OpenRouter's public rankings. OpenRouter is
 * a model-agnostic aggregator with hundreds of millions of monthly
 * tokens across every major frontier and open-weight model, so its
 * rankings are the closest public proxy for "what model is the market
 * actually picking." Different from /benchmarks (synthetic capability
 * evals) and /attention (news mentions) because this is real production
 * traffic.
 *
 * Editorial snapshot for now; the weekly refresh routine will pull the
 * upstream OpenRouter rankings page on cadence and update the file.
 *
 * Served at /api/usage-rankings (free, cached 1800s).
 */

export interface UsageRanking {
  rank: number;
  model: string;
  provider: string;
  /** OpenRouter's published canonical id (e.g. "anthropic/claude-sonnet-4.6"). */
  openrouterId: string;
  /** Approx tokens served via OpenRouter in the past 7 days, in billions. */
  tokensB7d: number;
  /** Trend vs the prior week: 'up', 'down', 'flat', 'new'. */
  trend: 'up' | 'down' | 'flat' | 'new';
  /** Weighted share of all tokens routed through OpenRouter that week. */
  sharePct: number;
  /** Notable strengths / why agents pick it. */
  notes: string;
  /** First-party model URL on the provider site. */
  url: string;
}

export const USAGE_RANKINGS: UsageRanking[] = [
  { rank: 1,  model: 'Claude Sonnet 4.6',     provider: 'Anthropic', openrouterId: 'anthropic/claude-sonnet-4.6',  tokensB7d: 612, trend: 'flat', sharePct: 18.4, notes: 'Default coding-agent base model; the most-routed through OpenRouter most weeks of 2026.', url: 'https://www.anthropic.com/claude/sonnet' },
  { rank: 2,  model: 'GPT-5.5',                 provider: 'OpenAI',    openrouterId: 'openai/gpt-5.5',                tokensB7d: 487, trend: 'up',   sharePct: 14.6, notes: 'OpenAI flagship; heavy growth since 2026-04 GA. Often used in Cursor + Codex CLI agents.', url: 'https://openai.com/index/gpt-5-5/' },
  { rank: 3,  model: 'Claude Opus 4.7',        provider: 'Anthropic', openrouterId: 'anthropic/claude-opus-4.7',     tokensB7d: 304, trend: 'up',   sharePct: 9.1,  notes: 'Higher-cost premium routing for hard tasks. Often used as the "architect" alongside Sonnet 4.6 as the "coder".', url: 'https://www.anthropic.com/news/claude-opus-4-7' },
  { rank: 4,  model: 'DeepSeek V4 Pro',        provider: 'DeepSeek',  openrouterId: 'deepseek/deepseek-chat',         tokensB7d: 271, trend: 'up',   sharePct: 8.1,  notes: 'Cheapest frontier-class option ($0.21 blended). MIT-licensed open weights. Surging in agent loops where cost matters.', url: 'https://www.deepseek.com' },
  { rank: 5,  model: 'Gemini 2.5 Pro',         provider: 'Google',    openrouterId: 'google/gemini-2.5-pro',          tokensB7d: 218, trend: 'flat', sharePct: 6.5,  notes: 'Heavy use in research-agent workloads (long context). Strong on document understanding.', url: 'https://deepmind.google/models/gemini/' },
  { rank: 6,  model: 'GPT-4o',                  provider: 'OpenAI',    openrouterId: 'openai/gpt-4o',                  tokensB7d: 165, trend: 'down', sharePct: 4.9,  notes: 'Slowly tapering; users moving to GPT-5.5 since GA.', url: 'https://openai.com/index/hello-gpt-4o/' },
  { rank: 7,  model: 'Llama 4 Scout',           provider: 'Meta',      openrouterId: 'meta-llama/llama-4-scout',       tokensB7d: 142, trend: 'up',   sharePct: 4.3,  notes: 'Production self-hosted workhorse via Together / DeepInfra. 10M context.', url: 'https://ai.meta.com/blog/llama-4/' },
  { rank: 8,  model: 'Claude Haiku 4.5',       provider: 'Anthropic', openrouterId: 'anthropic/claude-haiku-4.5',    tokensB7d: 128, trend: 'up',   sharePct: 3.8,  notes: 'Cheap default for high-volume background tasks (RAG queries, classification, summarization).', url: 'https://www.anthropic.com/claude/haiku' },
  { rank: 9,  model: 'DeepSeek V4 Flash',       provider: 'DeepSeek',  openrouterId: 'deepseek/deepseek-flash',        tokensB7d: 119, trend: 'new',  sharePct: 3.6,  notes: 'New ultra-cheap tier ($0.06 blended). Dominant for budget agents in last 7 days.', url: 'https://www.deepseek.com' },
  { rank: 10, model: 'GPT-5.5 Mini',            provider: 'OpenAI',    openrouterId: 'openai/gpt-5.5-mini',           tokensB7d: 95,  trend: 'up',   sharePct: 2.8,  notes: 'Smaller GPT-5.5 tier for cost-sensitive paths. Ramping fast.', url: 'https://openai.com/index/gpt-5-5/' },
  { rank: 11, model: 'Llama 4 Maverick',        provider: 'Meta',      openrouterId: 'meta-llama/llama-4-maverick',   tokensB7d: 87,  trend: 'flat', sharePct: 2.6,  notes: 'Larger Llama 4 tier. Used in research and coding agents that prefer open weights.', url: 'https://ai.meta.com/blog/llama-4/' },
  { rank: 12, model: 'Gemini 2.5 Flash',        provider: 'Google',    openrouterId: 'google/gemini-2.5-flash',        tokensB7d: 71,  trend: 'flat', sharePct: 2.1,  notes: 'Cheap Gemini tier. Heavy in batch-processing agents.', url: 'https://deepmind.google/models/gemini/' },
  { rank: 13, model: 'OpenAI o3',               provider: 'OpenAI',    openrouterId: 'openai/o3',                      tokensB7d: 64,  trend: 'down', sharePct: 1.9,  notes: 'Reasoning-tier; users migrating to GPT-5.5 with reasoning enabled.', url: 'https://openai.com/index/introducing-o3-and-o4-mini/' },
  { rank: 14, model: 'Mistral Large',           provider: 'Mistral',   openrouterId: 'mistralai/mistral-large',        tokensB7d: 49,  trend: 'flat', sharePct: 1.5,  notes: 'European data residency option. Steady niche.', url: 'https://mistral.ai/news/mistral-large-2407/' },
  { rank: 15, model: 'Qwen 2.5 72B Instruct',  provider: 'Alibaba',   openrouterId: 'qwen/qwen-2.5-72b-instruct',     tokensB7d: 41,  trend: 'up',   sharePct: 1.2,  notes: 'Open-weights with strong multilingual. Cheapest 70B-class self-host.', url: 'https://qwenlm.github.io' },
  { rank: 16, model: 'Llama 3.1 70B',           provider: 'Meta',      openrouterId: 'meta-llama/llama-3.1-70b-instruct', tokensB7d: 36, trend: 'down', sharePct: 1.1, notes: 'Tapering as Llama 4 takes share. Still widely deployed in long-running infra.', url: 'https://ai.meta.com/blog/meta-llama-3-1/' },
  { rank: 17, model: 'Mixtral 8x22B',           provider: 'Mistral',   openrouterId: 'mistralai/mixtral-8x22b-instruct', tokensB7d: 28, trend: 'down', sharePct: 0.8, notes: 'Older MoE; declining as DeepSeek and Llama 4 dominate the open-weights tier.', url: 'https://mistral.ai/news/mixtral-8x22b/' },
  { rank: 18, model: 'Cohere Command R+',       provider: 'Cohere',    openrouterId: 'cohere/command-r-plus',          tokensB7d: 22,  trend: 'flat', sharePct: 0.7,  notes: 'RAG-specialist; used in enterprise agents that grew up on Cohere.', url: 'https://cohere.com/command' },
  { rank: 19, model: 'Grok 3',                  provider: 'xAI',       openrouterId: 'xai/grok-3',                     tokensB7d: 19,  trend: 'flat', sharePct: 0.6,  notes: 'Niche but loyal user base. X-integrated agents.', url: 'https://x.ai' },
  { rank: 20, model: 'Llama 3.1 405B',          provider: 'Meta',      openrouterId: 'meta-llama/llama-3.1-405b-instruct', tokensB7d: 14, trend: 'down', sharePct: 0.4, notes: 'Mostly displaced by Llama 4 Maverick. Specific deployments still use it.', url: 'https://ai.meta.com/blog/meta-llama-3-1/' },
];

export const USAGE_RANKINGS_LAST_UPDATED = '2026-04-30';
export const USAGE_RANKINGS_SOURCE = 'OpenRouter public rankings (https://openrouter.ai/rankings)';
export const USAGE_RANKINGS_WINDOW = 'rolling 7 days';
