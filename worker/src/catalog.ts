import { Env } from './types';

/**
 * Daily data updater for AI models/pricing, benchmarks, and agents directory.
 *
 * Runs once per day at 7 AM UTC. Data flow:
 *   1. On first run, seeds KV from BASELINE data (mirrors data/*.json)
 *   2. Daily cron fetches public sources and merges new models/pricing/benchmarks
 *   3. API endpoints serve from KV via Cache API layer
 *
 * Public data sources:
 *   - LiteLLM community-maintained model pricing (GitHub, MIT license)
 *
 * Benchmark scores are editorial: hand-curated from vendor-published evals
 * (OpenAI eval tables, Anthropic model cards, Google AI blog, Meta Llama
 * benchmarks). HF Open LLM Leaderboard ingest was removed 2026-05-06 to
 * eliminate redistribution-rights ambiguity in HF's compiled leaderboard ToS.
 *
 * KV optimization: one read to check current data, one write only if changed.
 */

// ── Types ───────────────────────────────────────────────────────────

interface ModelEntry {
  id: string;
  name: string;
  inputPrice: number;
  outputPrice: number;
  contextWindow: number;
  released: string;
  capabilities: string[];
  openSource?: boolean;
  license?: string;
  /**
   * flagship = the primary model people compare for that provider.
   * mid = secondary tier, still capable but not the headline.
   * budget = small / cheap tier.
   * The /compare page uses this to pick its default selection and to
   * auto-generate popular comparisons whenever a new flagship lands.
   */
  tier?: 'flagship' | 'mid' | 'budget';
}

interface ProviderEntry {
  id: string;
  name: string;
  logo: string;
  url: string;
  models: ModelEntry[];
}

interface PricingData {
  lastUpdated: string;
  providers: ProviderEntry[];
  pricingNotes: {
    unit: string;
    currency: string;
    openSourceNote: string;
    disclaimer: string;
  };
}

interface BenchmarkDef {
  id: string;
  name: string;
  description: string;
  maxScore: number;
}

interface BenchmarkModelEntry {
  model: string;
  provider: string;
  released: string;
  scores: Record<string, number>;
}

interface BenchmarksData {
  lastUpdated: string;
  benchmarks: BenchmarkDef[];
  models: BenchmarkModelEntry[];
}

interface AgentEntry {
  id: string;
  name: string;
  provider: string;
  category: string;
  description: string;
  url: string;
  pricing: string;
  launched: number;
}

interface AgentsData {
  lastUpdated: string;
  categories: { id: string; name: string; description: string }[];
  agents: AgentEntry[];
}

interface DailyUpdateResult {
  modelsChanged: boolean;
  benchmarksChanged: boolean;
  modelCount: number;
  benchmarkModelCount: number;
  agentCount: number;
}

export interface BenchmarkAttribution {
  source: string;
  policy: string;
  vendor_sources: string[];
}

export const BENCHMARK_ATTRIBUTION: BenchmarkAttribution = {
  source: 'TensorFeed editorial',
  policy:
    'Benchmark scores are hand-curated from vendor-published evaluation tables (model cards, release blog posts, technical reports). Scores are factual data points from primary publishers; this catalog is the editorial compilation. Citations live with each score in the model release artifact noted under the model entry. Snapshots refresh on redeploy.',
  vendor_sources: [
    'Anthropic model cards (anthropic.com/news, model-card PDFs)',
    'OpenAI eval tables (openai.com release posts, openai/evals on GitHub)',
    'Google AI blog and Gemini technical reports (deepmind.google)',
    'Meta Llama eval tables (ai.meta.com/llama, llama-models repo)',
    'Mistral model release pages (mistral.ai)',
    'Vendor-published benchmark leaderboards (SWE-bench.com, lmarena.ai, livecodebench.github.io)',
  ],
};

export interface PricingAttribution {
  source: string;
  source_url: string;
  license: string;
  license_url: string;
}

export const PRICING_ATTRIBUTION: PricingAttribution = {
  source: 'BerriAI/litellm (model_prices_and_context_window.json)',
  source_url:
    'https://github.com/BerriAI/litellm/blob/main/model_prices_and_context_window.json',
  license: 'MIT',
  license_url: 'https://github.com/BerriAI/litellm/blob/main/LICENSE',
};

// ── LiteLLM pricing source mapping ─────────────────────────────────

const LITELLM_PROVIDER_MAP: Record<string, string> = {
  'claude-': 'anthropic',
  'gpt-': 'openai',
  'o1': 'openai',
  'o3': 'openai',
  'o4': 'openai',
  'gemini/': 'google',
  'mistral/': 'mistral',
  'command-': 'cohere',
};

const TRACKED_MODELS: Record<string, { providerId: string; ourId: string; name: string }> = {
  'claude-opus-4-8': { providerId: 'anthropic', ourId: 'claude-opus-4-8', name: 'Claude Opus 4.8' },
  'claude-opus-4-7': { providerId: 'anthropic', ourId: 'claude-opus-4-7', name: 'Claude Opus 4.7' },
  'claude-opus-4-6': { providerId: 'anthropic', ourId: 'claude-opus-4-6', name: 'Claude Opus 4.6' },
  'claude-sonnet-4-6': { providerId: 'anthropic', ourId: 'claude-sonnet-4-6', name: 'Claude Sonnet 4.6' },
  'claude-haiku-4-5': { providerId: 'anthropic', ourId: 'claude-haiku-4-5', name: 'Claude Haiku 4.5' },
  'gpt-4o': { providerId: 'openai', ourId: 'gpt-4o', name: 'GPT-4o' },
  'gpt-4o-mini': { providerId: 'openai', ourId: 'gpt-4o-mini', name: 'GPT-4o-mini' },
  'o1': { providerId: 'openai', ourId: 'o1', name: 'o1' },
  'o3-mini': { providerId: 'openai', ourId: 'o3-mini', name: 'o3-mini' },
  'gemini/gemini-2.5-pro': { providerId: 'google', ourId: 'gemini-2-5-pro', name: 'Gemini 2.5 Pro' },
  'gemini/gemini-2.0-flash': { providerId: 'google', ourId: 'gemini-2-0-flash', name: 'Gemini 2.0 Flash' },
  'mistral/mistral-large-latest': { providerId: 'mistral', ourId: 'mistral-large', name: 'Mistral Large' },
  'mistral/mistral-small-latest': { providerId: 'mistral', ourId: 'mistral-small', name: 'Mistral Small' },
  'command-r-plus': { providerId: 'cohere', ourId: 'command-r-plus', name: 'Command R+' },
  'command-r': { providerId: 'cohere', ourId: 'command-r', name: 'Command R' },
};

const LITELLM_URL =
  'https://raw.githubusercontent.com/BerriAI/litellm/main/model_prices_and_context_window.json';

// ── Fetch helpers ──────────────────────────────────────────────────

async function fetchLiteLLMPricing(): Promise<Record<string, unknown> | null> {
  try {
    const res = await fetch(LITELLM_URL, {
      headers: { 'User-Agent': 'TensorFeed/1.0 (https://tensorfeed.ai)' },
      signal: AbortSignal.timeout(15000),
    });
    if (!res.ok) return null;
    return await res.json() as Record<string, unknown>;
  } catch (e) {
    console.warn('Failed to fetch LiteLLM pricing:', e);
    return null;
  }
}

// ── Merge logic ────────────────────────────────────────────────────

function mergePricing(current: PricingData, litellm: Record<string, unknown>): { data: PricingData; changed: boolean } {
  let changed = false;

  for (const [litellmKey, tracked] of Object.entries(TRACKED_MODELS)) {
    const entry = litellm[litellmKey] as Record<string, unknown> | undefined;
    if (!entry) continue;

    const provider = current.providers.find(p => p.id === tracked.providerId);
    if (!provider) continue;

    const model = provider.models.find(m => m.id === tracked.ourId);
    if (!model) continue;

    const inputPerToken = entry['input_cost_per_token'] as number | undefined;
    const outputPerToken = entry['output_cost_per_token'] as number | undefined;
    const maxTokens = entry['max_input_tokens'] as number | undefined;

    if (inputPerToken !== undefined) {
      const newInput = parseFloat((inputPerToken * 1_000_000).toFixed(2));
      if (newInput !== model.inputPrice && newInput > 0) {
        console.log(`Price update: ${model.name} input $${model.inputPrice} -> $${newInput}`);
        model.inputPrice = newInput;
        changed = true;
      }
    }

    if (outputPerToken !== undefined) {
      const newOutput = parseFloat((outputPerToken * 1_000_000).toFixed(2));
      if (newOutput !== model.outputPrice && newOutput > 0) {
        console.log(`Price update: ${model.name} output $${model.outputPrice} -> $${newOutput}`);
        model.outputPrice = newOutput;
        changed = true;
      }
    }

    if (maxTokens !== undefined && maxTokens !== model.contextWindow && maxTokens > 0) {
      console.log(`Context update: ${model.name} ${model.contextWindow} -> ${maxTokens}`);
      model.contextWindow = maxTokens;
      changed = true;
    }
  }

  // Check for new models from tracked providers
  for (const [key, value] of Object.entries(litellm)) {
    if (typeof value !== 'object' || value === null) continue;
    const entry = value as Record<string, unknown>;

    if (TRACKED_MODELS[key]) continue;

    let providerId: string | null = null;
    for (const [prefix, pid] of Object.entries(LITELLM_PROVIDER_MAP)) {
      if (key.startsWith(prefix)) {
        providerId = pid;
        break;
      }
    }
    if (!providerId) continue;

    const provider = current.providers.find(p => p.id === providerId);
    if (!provider) continue;

    const litellmProvider = entry['litellm_provider'] as string | undefined;
    if (!litellmProvider) continue;

    const inputPerToken = entry['input_cost_per_token'] as number | undefined;
    const outputPerToken = entry['output_cost_per_token'] as number | undefined;
    const maxTokens = (entry['max_input_tokens'] || entry['max_tokens']) as number | undefined;

    if (key.includes(':') || key.includes('/latest')) continue;
    if (inputPerToken === undefined || outputPerToken === undefined) continue;

    const cleanKey = key.replace('gemini/', '').replace('mistral/', '');
    const alreadyHave = provider.models.some(
      m => m.id === cleanKey || m.name.toLowerCase().includes(cleanKey.toLowerCase())
    );
    if (alreadyHave) continue;

    const lowerName = cleanKey.toLowerCase();
    let inferredTier: ModelEntry['tier'] = 'mid';
    if (/opus|ultra|max|behemoth|maverick|large|premier|reasoning/.test(lowerName)) {
      inferredTier = 'flagship';
    } else if (/mini|nano|flash|tiny|small|haiku|lite|edge/.test(lowerName)) {
      inferredTier = 'budget';
    }

    const newModel: ModelEntry = {
      id: cleanKey,
      name: cleanKey,
      inputPrice: parseFloat((inputPerToken * 1_000_000).toFixed(2)),
      outputPrice: parseFloat((outputPerToken * 1_000_000).toFixed(2)),
      contextWindow: maxTokens || 128000,
      released: new Date().toISOString().slice(0, 7),
      capabilities: ['text'],
      tier: inferredTier,
    };

    console.log(`New model detected: ${provider.name} / ${newModel.name}`);
    provider.models.push(newModel);
    changed = true;
  }

  if (changed) {
    current.lastUpdated = new Date().toISOString().slice(0, 10);
  }

  return { data: current, changed };
}

// ── IndexNow ping ──────────────────────────────────────────────────

async function pingIndexNow(env: Env): Promise<void> {
  if (!env.INDEXNOW_KEY) return;
  try {
    await fetch('https://api.indexnow.org/indexnow', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        host: 'tensorfeed.ai',
        key: env.INDEXNOW_KEY,
        keyLocation: `https://tensorfeed.ai/${env.INDEXNOW_KEY}.txt`,
        urlList: [
          'https://tensorfeed.ai/models',
          'https://tensorfeed.ai/benchmarks',
          'https://tensorfeed.ai/ai-api-pricing-guide',
          'https://tensorfeed.ai/compare',
        ],
      }),
      signal: AbortSignal.timeout(5000),
    });
    console.log('IndexNow pinged for models/benchmarks pages');
  } catch (e) {
    console.warn('IndexNow ping failed:', e);
  }
}

// ── Baseline data (mirrors data/*.json for first-run seeding) ───────

const BASELINE_PRICING: PricingData = {
  lastUpdated: '2026-06-01',
  providers: [
    {
      id: 'anthropic', name: 'Anthropic', logo: '/images/providers/anthropic.png', url: 'https://www.anthropic.com',
      models: [
        { id: 'claude-opus-4-8', name: 'Claude Opus 4.8', inputPrice: 5.00, outputPrice: 25.00, contextWindow: 1000000, released: '2026-05', capabilities: ['text', 'vision', 'tool-use', 'code'], tier: 'flagship' },
        { id: 'claude-opus-4-7', name: 'Claude Opus 4.7', inputPrice: 15.00, outputPrice: 75.00, contextWindow: 1000000, released: '2026-04', capabilities: ['text', 'vision', 'tool-use', 'code'], tier: 'flagship' },
        { id: 'claude-opus-4-6', name: 'Claude Opus 4.6', inputPrice: 15.00, outputPrice: 75.00, contextWindow: 200000, released: '2026-03', capabilities: ['text', 'vision', 'tool-use', 'code'], tier: 'mid' },
        { id: 'claude-sonnet-4-6', name: 'Claude Sonnet 4.6', inputPrice: 3.00, outputPrice: 15.00, contextWindow: 200000, released: '2026-03', capabilities: ['text', 'vision', 'tool-use', 'code'], tier: 'mid' },
        { id: 'claude-haiku-4-5', name: 'Claude Haiku 4.5', inputPrice: 0.80, outputPrice: 4.00, contextWindow: 200000, released: '2025-06', capabilities: ['text', 'vision', 'tool-use', 'code'], tier: 'budget' },
      ],
    },
    {
      id: 'openai', name: 'OpenAI', logo: '/images/providers/openai.png', url: 'https://openai.com',
      models: [
        { id: 'gpt-4o', name: 'GPT-4o', inputPrice: 2.50, outputPrice: 10.00, contextWindow: 128000, released: '2024-05', capabilities: ['text', 'vision', 'tool-use', 'code'], tier: 'flagship' },
        { id: 'gpt-4o-mini', name: 'GPT-4o-mini', inputPrice: 0.15, outputPrice: 0.60, contextWindow: 128000, released: '2024-07', capabilities: ['text', 'vision', 'tool-use', 'code'], tier: 'budget' },
        { id: 'o1', name: 'o1', inputPrice: 15.00, outputPrice: 60.00, contextWindow: 200000, released: '2024-12', capabilities: ['text', 'reasoning', 'code'], tier: 'flagship' },
        { id: 'o3-mini', name: 'o3-mini', inputPrice: 1.10, outputPrice: 4.40, contextWindow: 200000, released: '2025-01', capabilities: ['text', 'reasoning', 'code'], tier: 'mid' },
      ],
    },
    {
      id: 'google', name: 'Google', logo: '/images/providers/google.png', url: 'https://ai.google.dev',
      models: [
        { id: 'gemini-2-5-pro', name: 'Gemini 2.5 Pro', inputPrice: 1.25, outputPrice: 10.00, contextWindow: 1000000, released: '2025-03', capabilities: ['text', 'vision', 'tool-use', 'code', 'reasoning'], tier: 'flagship' },
        { id: 'gemini-2-0-flash', name: 'Gemini 2.0 Flash', inputPrice: 0.10, outputPrice: 0.40, contextWindow: 1000000, released: '2025-02', capabilities: ['text', 'vision', 'tool-use', 'code'], tier: 'budget' },
      ],
    },
    {
      id: 'meta', name: 'Meta', logo: '/images/providers/meta.png', url: 'https://ai.meta.com',
      models: [
        { id: 'llama-4-scout', name: 'Llama 4 Scout', inputPrice: 0, outputPrice: 0, contextWindow: 10000000, released: '2025-04', openSource: true, license: 'Llama 4 Community License', capabilities: ['text', 'vision', 'code'], tier: 'mid' },
        { id: 'llama-4-maverick', name: 'Llama 4 Maverick', inputPrice: 0, outputPrice: 0, contextWindow: 1000000, released: '2025-04', openSource: true, license: 'Llama 4 Community License', capabilities: ['text', 'vision', 'code'], tier: 'flagship' },
      ],
    },
    {
      id: 'mistral', name: 'Mistral', logo: '/images/providers/mistral.png', url: 'https://mistral.ai',
      models: [
        { id: 'mistral-large', name: 'Mistral Large', inputPrice: 2.00, outputPrice: 6.00, contextWindow: 128000, released: '2025-01', capabilities: ['text', 'vision', 'tool-use', 'code'], tier: 'flagship' },
        { id: 'mistral-small', name: 'Mistral Small', inputPrice: 0.10, outputPrice: 0.30, contextWindow: 128000, released: '2025-01', capabilities: ['text', 'tool-use', 'code'], tier: 'budget' },
      ],
    },
    {
      id: 'cohere', name: 'Cohere', logo: '/images/providers/cohere.png', url: 'https://cohere.com',
      models: [
        { id: 'command-r-plus', name: 'Command R+', inputPrice: 2.50, outputPrice: 10.00, contextWindow: 128000, released: '2024-04', capabilities: ['text', 'tool-use', 'RAG'], tier: 'flagship' },
        { id: 'command-r', name: 'Command R', inputPrice: 0.15, outputPrice: 0.60, contextWindow: 128000, released: '2024-03', capabilities: ['text', 'tool-use', 'RAG'], tier: 'mid' },
      ],
    },
  ],
  pricingNotes: {
    unit: 'per 1M tokens',
    currency: 'USD',
    openSourceNote: 'Open source models are free to download and self-host. Hosted API pricing varies by provider.',
    disclaimer: 'Prices are subject to change. Check provider websites for the most current pricing.',
  },
};

const BASELINE_BENCHMARKS: BenchmarksData = {
  lastUpdated: '2026-04-17',
  benchmarks: [
    { id: 'mmlu_pro', name: 'MMLU-Pro', description: 'General knowledge and reasoning across 57 subjects', maxScore: 100 },
    { id: 'human_eval', name: 'HumanEval', description: 'Python code generation and problem solving', maxScore: 100 },
    { id: 'gpqa_diamond', name: 'GPQA Diamond', description: 'Graduate-level science questions verified by domain experts', maxScore: 100 },
    { id: 'math', name: 'MATH', description: 'Competition-level mathematics problems', maxScore: 100 },
    { id: 'swe_bench', name: 'SWE-bench', description: 'Real-world software engineering tasks from GitHub issues', maxScore: 100 },
  ],
  models: [
    { model: 'Claude Opus 4.7', provider: 'Anthropic', released: '2026-04', scores: { mmlu_pro: 93.8, human_eval: 96.2, gpqa_diamond: 76.5, math: 93.1, swe_bench: 65.4 } },
    { model: 'Claude Opus 4.6', provider: 'Anthropic', released: '2026-03', scores: { mmlu_pro: 92.4, human_eval: 95.1, gpqa_diamond: 74.2, math: 91.8, swe_bench: 62.3 } },
    { model: 'Claude Sonnet 4.6', provider: 'Anthropic', released: '2026-02', scores: { mmlu_pro: 88.7, human_eval: 92.0, gpqa_diamond: 65.8, math: 85.4, swe_bench: 55.7 } },
    { model: 'Claude Haiku 4.5', provider: 'Anthropic', released: '2026-01', scores: { mmlu_pro: 82.1, human_eval: 86.3, gpqa_diamond: 52.4, math: 74.6, swe_bench: 41.2 } },
    { model: 'GPT-4o', provider: 'OpenAI', released: '2025-05', scores: { mmlu_pro: 87.2, human_eval: 90.2, gpqa_diamond: 59.1, math: 81.3, swe_bench: 48.5 } },
    { model: 'GPT-4.5', provider: 'OpenAI', released: '2025-12', scores: { mmlu_pro: 90.1, human_eval: 93.4, gpqa_diamond: 68.7, math: 88.2, swe_bench: 56.1 } },
    { model: 'o1', provider: 'OpenAI', released: '2025-09', scores: { mmlu_pro: 91.8, human_eval: 94.2, gpqa_diamond: 72.5, math: 94.6, swe_bench: 58.9 } },
    { model: 'o3-mini', provider: 'OpenAI', released: '2025-11', scores: { mmlu_pro: 86.3, human_eval: 89.7, gpqa_diamond: 60.3, math: 87.1, swe_bench: 49.3 } },
    { model: 'Gemini 2.5 Pro', provider: 'Google', released: '2026-01', scores: { mmlu_pro: 91.2, human_eval: 93.8, gpqa_diamond: 71.9, math: 90.5, swe_bench: 59.4 } },
    { model: 'Gemini 2.0 Flash', provider: 'Google', released: '2025-10', scores: { mmlu_pro: 84.5, human_eval: 87.6, gpqa_diamond: 54.8, math: 77.2, swe_bench: 43.1 } },
    { model: 'Llama 4 Scout', provider: 'Meta', released: '2026-02', scores: { mmlu_pro: 85.9, human_eval: 88.4, gpqa_diamond: 56.2, math: 79.8, swe_bench: 44.6 } },
    { model: 'Llama 4 Maverick', provider: 'Meta', released: '2026-03', scores: { mmlu_pro: 89.3, human_eval: 91.7, gpqa_diamond: 64.1, math: 86.7, swe_bench: 52.8 } },
    { model: 'Mistral Large', provider: 'Mistral', released: '2025-11', scores: { mmlu_pro: 86.8, human_eval: 89.1, gpqa_diamond: 57.3, math: 80.4, swe_bench: 46.2 } },
    { model: 'Mistral Small', provider: 'Mistral', released: '2025-09', scores: { mmlu_pro: 78.4, human_eval: 82.5, gpqa_diamond: 44.6, math: 68.9, swe_bench: 34.7 } },
    { model: 'DeepSeek V3', provider: 'DeepSeek', released: '2025-12', scores: { mmlu_pro: 88.1, human_eval: 91.2, gpqa_diamond: 63.5, math: 85.9, swe_bench: 51.4 } },
  ],
};

const BASELINE_AGENTS: AgentsData = {
  lastUpdated: '2026-03-28',
  categories: [
    { id: 'coding', name: 'Coding Agents', description: 'AI-powered tools that write, review, and debug code directly in your development workflow.' },
    { id: 'research', name: 'Research Agents', description: 'AI agents specialized in finding, synthesizing, and analyzing information from various sources.' },
    { id: 'general', name: 'General / Personal Agents', description: 'Versatile AI assistants for everyday tasks including writing, analysis, brainstorming, and conversation.' },
    { id: 'creative', name: 'Creative Agents', description: 'AI tools for generating images, music, video, and other creative media.' },
    { id: 'frameworks', name: 'Frameworks & Platforms', description: 'Developer tools and SDKs for building custom AI agents and multi-agent workflows.' },
  ],
  agents: [
    { id: 'claude-code', name: 'Claude Code', provider: 'Anthropic', category: 'coding', description: 'An agentic CLI tool that lets Claude operate directly in your terminal, reading files, editing code, running commands, and managing git workflows autonomously.', url: 'https://docs.anthropic.com/en/docs/claude-code', pricing: 'Usage-based via Claude API', launched: 2025 },
    { id: 'cursor', name: 'Cursor', provider: 'Anysphere', category: 'coding', description: 'An AI-native code editor built on VS Code that provides inline code generation, multi-file editing, and codebase-aware chat powered by multiple foundation models.', url: 'https://cursor.sh', pricing: 'Free tier, Pro $20/mo, Business $40/mo', launched: 2023 },
    { id: 'github-copilot', name: 'GitHub Copilot', provider: 'GitHub / Microsoft', category: 'coding', description: 'An AI pair programmer integrated into popular editors that suggests code completions, generates functions from comments, and offers chat-based coding assistance.', url: 'https://github.com/features/copilot', pricing: 'Individual $10/mo, Business $19/mo, Enterprise $39/mo', launched: 2022 },
    { id: 'windsurf', name: 'Windsurf', provider: 'Codeium', category: 'coding', description: 'An AI-powered IDE that combines copilot and agent capabilities, allowing flows where the AI and developer collaborate on code changes across an entire project.', url: 'https://codeium.com/windsurf', pricing: 'Free tier, Pro $15/mo, Teams $30/mo', launched: 2024 },
    { id: 'perplexity', name: 'Perplexity', provider: 'Perplexity AI', category: 'research', description: 'An AI-powered answer engine that searches the web in real time, synthesizes information from multiple sources, and provides cited responses to complex questions.', url: 'https://www.perplexity.ai', pricing: 'Free tier, Pro $20/mo', launched: 2022 },
    { id: 'elicit', name: 'Elicit', provider: 'Elicit Inc.', category: 'research', description: 'A research assistant that helps find and analyze academic papers, extract key claims, and summarize findings across large bodies of scientific literature.', url: 'https://elicit.com', pricing: 'Free tier, Plus $10/mo, Enterprise custom', launched: 2021 },
    { id: 'consensus', name: 'Consensus', provider: 'Consensus NLP', category: 'research', description: 'A search engine that uses AI to find and synthesize results from peer-reviewed scientific research, providing evidence-based answers with citations.', url: 'https://consensus.app', pricing: 'Free tier, Premium $9.99/mo', launched: 2022 },
    { id: 'chatgpt', name: 'ChatGPT', provider: 'OpenAI', category: 'general', description: 'A general-purpose AI assistant that can handle conversation, writing, coding, analysis, and web browsing, with plugin and custom GPT support for specialized tasks.', url: 'https://chat.openai.com', pricing: 'Free tier, Plus $20/mo, Team $25/mo, Enterprise custom', launched: 2022 },
    { id: 'gemini', name: 'Gemini', provider: 'Google', category: 'general', description: "Google's multimodal AI assistant with deep integration into Google Workspace, Search, and Android, capable of handling text, images, code, and long documents.", url: 'https://gemini.google.com', pricing: 'Free tier, Advanced $19.99/mo (included with Google One AI Premium)', launched: 2023 },
    { id: 'claude', name: 'Claude', provider: 'Anthropic', category: 'general', description: 'A helpful AI assistant known for nuanced instruction-following, long-context understanding, and careful reasoning across writing, analysis, coding, and research tasks.', url: 'https://claude.ai', pricing: 'Free tier, Pro $20/mo, Team $25/mo, Enterprise custom', launched: 2023 },
    { id: 'midjourney', name: 'Midjourney', provider: 'Midjourney Inc.', category: 'creative', description: 'A leading AI image generation tool that creates high-quality, artistic images from text prompts, known for its distinctive aesthetic style and photorealistic output.', url: 'https://www.midjourney.com', pricing: 'Basic $10/mo, Standard $30/mo, Pro $60/mo', launched: 2022 },
    { id: 'dall-e-3', name: 'DALL-E 3', provider: 'OpenAI', category: 'creative', description: "OpenAI's image generation model integrated into ChatGPT and available via API, offering precise prompt adherence and the ability to render text within images.", url: 'https://openai.com/dall-e-3', pricing: 'Included with ChatGPT Plus, API usage-based', launched: 2023 },
    { id: 'suno', name: 'Suno', provider: 'Suno Inc.', category: 'creative', description: 'An AI music generation platform that creates full songs with vocals, instruments, and lyrics from text prompts or custom lyrics input.', url: 'https://suno.com', pricing: 'Free tier, Pro $10/mo, Premier $30/mo', launched: 2023 },
    { id: 'langchain', name: 'LangChain', provider: 'LangChain Inc.', category: 'frameworks', description: 'An open-source framework for building LLM-powered applications with chains, agents, retrieval-augmented generation, and memory, supporting multiple model providers.', url: 'https://www.langchain.com', pricing: 'Open source (LangSmith platform has paid tiers)', launched: 2022 },
    { id: 'crewai', name: 'CrewAI', provider: 'CrewAI Inc.', category: 'frameworks', description: 'A framework for orchestrating role-playing AI agents that collaborate on complex tasks, allowing developers to define agent roles, goals, and delegation patterns.', url: 'https://www.crewai.com', pricing: 'Open source, Enterprise cloud plans available', launched: 2024 },
    { id: 'autogen', name: 'AutoGen', provider: 'Microsoft', category: 'frameworks', description: 'An open-source framework for building multi-agent conversational systems where multiple AI agents can collaborate, debate, and coordinate to solve tasks.', url: 'https://github.com/microsoft/autogen', pricing: 'Open source', launched: 2023 },
    { id: 'openai-assistants', name: 'OpenAI Assistants API', provider: 'OpenAI', category: 'frameworks', description: "A platform API for building AI assistants with persistent threads, file retrieval, code interpretation, and function calling built into OpenAI's hosted infrastructure.", url: 'https://platform.openai.com/docs/assistants', pricing: 'Usage-based via OpenAI API', launched: 2023 },
    { id: 'claude-mcp', name: 'Model Context Protocol (MCP)', provider: 'Anthropic', category: 'frameworks', description: 'An open protocol that standardizes how AI applications connect to external data sources and tools, enabling plug-and-play integrations for any MCP-compatible client.', url: 'https://modelcontextprotocol.io', pricing: 'Open source protocol', launched: 2024 },
  ],
};

// ── Main daily update function ─────────────────────────────────────

export async function updateDailyData(env: Env): Promise<DailyUpdateResult> {
  console.log('Daily data update starting...');

  const result: DailyUpdateResult = {
    modelsChanged: false,
    benchmarksChanged: false,
    modelCount: 0,
    benchmarkModelCount: 0,
    agentCount: 0,
  };

  // --- 1. Models / Pricing ---
  let pricing = await env.TENSORFEED_CACHE.get('models', 'json') as PricingData | null;
  // Migration: check old key if new key is empty
  if (!pricing) {
    pricing = await env.TENSORFEED_CACHE.get('pricing', 'json') as PricingData | null;
  }
  if (!pricing) {
    console.log('Seeding pricing data from baseline');
    pricing = BASELINE_PRICING;
  }

  // Backfill: add any new models present in baseline but missing from KV
  {
    let backfilled = false;
    for (const baseProvider of BASELINE_PRICING.providers) {
      const liveProvider = pricing.providers.find((p) => p.id === baseProvider.id);
      if (!liveProvider) {
        pricing.providers.push(baseProvider);
        backfilled = true;
        continue;
      }
      for (const baseModel of baseProvider.models) {
        if (!liveProvider.models.find((m) => m.id === baseModel.id)) {
          liveProvider.models.unshift(baseModel);
          backfilled = true;
        }
      }
    }
    if (backfilled) {
      pricing.lastUpdated = BASELINE_PRICING.lastUpdated;
      result.modelsChanged = true;
      console.log('Pricing baseline backfill added new models');
    }
  }

  const litellm = await fetchLiteLLMPricing();
  if (litellm) {
    const merged = mergePricing(pricing, litellm);
    pricing = merged.data;
    result.modelsChanged = merged.changed;
    console.log(`LiteLLM merge: ${merged.changed ? 'changes detected' : 'no changes'}`);
  } else {
    console.log('LiteLLM fetch failed, keeping existing pricing');
  }

  result.modelCount = pricing.providers.reduce((n, p) => n + p.models.length, 0);

  // Write to KV only if data changed or first seed
  if (result.modelsChanged || !await env.TENSORFEED_CACHE.get('models')) {
    await env.TENSORFEED_CACHE.put('models', JSON.stringify(pricing), {
      metadata: { updatedAt: new Date().toISOString() },
    });
    // Keep old key in sync for backwards compatibility during migration
    await env.TENSORFEED_CACHE.put('pricing', JSON.stringify(pricing), {
      metadata: { updatedAt: new Date().toISOString() },
    });
    console.log('Models KV updated');
  }

  // --- 2. Benchmarks ---
  let benchmarks = await env.TENSORFEED_CACHE.get('benchmarks', 'json') as BenchmarksData | null;
  if (!benchmarks) {
    console.log('Seeding benchmarks from baseline');
    benchmarks = BASELINE_BENCHMARKS;
  }

  // Backfill: add any new benchmark entries present in baseline but missing from KV
  {
    let backfilled = false;
    for (const baseModel of BASELINE_BENCHMARKS.models) {
      if (!benchmarks.models.find((m) => m.model === baseModel.model)) {
        benchmarks.models.unshift(baseModel);
        backfilled = true;
      }
    }
    if (backfilled) {
      benchmarks.lastUpdated = BASELINE_BENCHMARKS.lastUpdated;
      result.benchmarksChanged = true;
      console.log('Benchmarks baseline backfill added new models');
    }
  }

  // Benchmark scores are editorial; updates land on redeploy via
  // BASELINE_BENCHMARKS, not from a third-party leaderboard ingest.
  result.benchmarkModelCount = benchmarks.models.length;

  // Write only if changed or first seed
  if (result.benchmarksChanged || !await env.TENSORFEED_CACHE.get('benchmarks')) {
    await env.TENSORFEED_CACHE.put('benchmarks', JSON.stringify(benchmarks), {
      metadata: { updatedAt: new Date().toISOString() },
    });
    console.log('Benchmarks KV updated');
  }

  // --- 3. Agents directory: seed if needed, set staleness timestamp ---
  let agents = await env.TENSORFEED_CACHE.get('agents-directory', 'json') as AgentsData | null;
  if (!agents) {
    console.log('Seeding agents directory from baseline');
    agents = BASELINE_AGENTS;
    await env.TENSORFEED_CACHE.put('agents-directory', JSON.stringify(agents), {
      metadata: { updatedAt: new Date().toISOString() },
    });
  }
  result.agentCount = agents.agents.length;

  // Set agents-updated timestamp so /api/health can track staleness
  await env.TENSORFEED_CACHE.put('agents-updated', JSON.stringify({
    lastChecked: new Date().toISOString(),
    lastManualUpdate: agents.lastUpdated,
    agentCount: agents.agents.length,
  }));

  // --- 4. Log what changed for /api/health ---
  await env.TENSORFEED_CACHE.put('daily-update-log', JSON.stringify({
    timestamp: new Date().toISOString(),
    modelsChanged: result.modelsChanged,
    benchmarksChanged: result.benchmarksChanged,
    modelCount: result.modelCount,
    benchmarkModelCount: result.benchmarkModelCount,
    agentCount: result.agentCount,
  }));

  // --- 5. Ping IndexNow if any data changed ---
  if (result.modelsChanged || result.benchmarksChanged) {
    await pingIndexNow(env);
  }

  console.log(
    `Daily update complete: ${result.modelCount} models, ${result.benchmarkModelCount} benchmark entries, ${result.agentCount} agents` +
    ` | models ${result.modelsChanged ? 'UPDATED' : 'unchanged'}, benchmarks ${result.benchmarksChanged ? 'UPDATED' : 'unchanged'}`
  );

  return result;
}

// Keep the old export name for backwards compat with /api/refresh
export { updateDailyData as updateCatalog };
