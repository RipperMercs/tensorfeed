import { Env } from './types';
import { pingIndexNow } from './indexnow';

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

/**
 * Who produced one score. `vendor` covers anything published by the lab that
 * makes the model, including a figure it commissioned from a benchmark
 * maintainer. `independent` means a third party ran the model itself.
 *
 * Vendor and independent figures are NOT interchangeable: observed gaps on the
 * same model and benchmark reach 10.9 points.
 */
interface ScoreProvenance {
  type: 'vendor' | 'independent';
  by: string;
  url: string;
}

interface BenchmarkModelEntry {
  model: string;
  provider: string;
  released: string;
  scores: Record<string, number>;
  /**
   * Per-cell provenance, keyed by benchmark id. A benchmark id absent from
   * this map means provenance was not recorded (or two sources disagreed and
   * neither was asserted), NOT that the score is unsourced. Kept as a sibling
   * of `scores` on purpose so `scores` stays Record<string, number> and every
   * existing consumer is unaffected.
   */
  provenance?: Record<string, ScoreProvenance>;
}

interface BenchmarksData {
  lastUpdated: string;
  benchmarks: BenchmarkDef[];
  models: BenchmarkModelEntry[];
  provenanceNotes?: Record<string, unknown>;
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
//
// TRACKED_MODELS is the allowlist of LiteLLM keys whose prices and context
// windows we mirror onto the curated catalog. /api/models is the curated
// frontier set: we deliberately do NOT auto-add LiteLLM's long tail here (that
// lives at /api/openrouter/models). LiteLLM is a price-freshness overlay, not a
// membership source.

const TRACKED_MODELS: Record<string, { providerId: string; ourId: string; name: string }> = {
  'claude-opus-5': { providerId: 'anthropic', ourId: 'claude-opus-5', name: 'Claude Opus 5' },
  'claude-fable-5': { providerId: 'anthropic', ourId: 'claude-fable-5', name: 'Claude Fable 5' },
  'claude-opus-4-8': { providerId: 'anthropic', ourId: 'claude-opus-4-8', name: 'Claude Opus 4.8' },
  'claude-sonnet-4-5': { providerId: 'anthropic', ourId: 'claude-sonnet-4-5', name: 'Claude Sonnet 4.5' },
  'claude-opus-4-1': { providerId: 'anthropic', ourId: 'claude-opus-4-1', name: 'Claude Opus 4.1' },
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

    // Enforce the canonical display name from TRACKED_MODELS. A pre-tracking
    // run may have added this model from a raw LiteLLM key with a slug name
    // (e.g. "claude-opus-4-8"); the tracked entry is the source of truth, so a
    // later run repairs the persisted name rather than leaving the slug.
    if (tracked.name && model.name !== tracked.name) {
      console.log(`Name fix: ${model.name} -> ${tracked.name}`);
      model.name = tracked.name;
      changed = true;
    }

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

  // No auto-add. /api/models is the curated frontier catalog; LiteLLM only
  // refreshes price and context on the TRACKED_MODELS above. The long tail of
  // cloud-hosted models is served separately at /api/openrouter/models, so we
  // never widen this set from the LiteLLM dump (that drift is what buried the
  // flagship and dragged in dated snapshots and non-chat modalities). The
  // lastUpdated date is owned by the editorial baseline (data/pricing.json),
  // not bumped here, so a stable LiteLLM delta does not churn the KV value.
  return { data: current, changed };
}

// ── IndexNow ping ──────────────────────────────────────────────────
// Shared transport lives in indexnow.ts; this keeps the catalog's url list.

const CATALOG_CHANGE_URLS = [
  'https://tensorfeed.ai/models',
  'https://tensorfeed.ai/benchmarks',
  'https://tensorfeed.ai/ai-api-pricing-guide',
  'https://tensorfeed.ai/compare',
];

// ── Baseline data (mirrors data/*.json for first-run seeding) ───────

export const BASELINE_PRICING: PricingData = {
  lastUpdated: '2026-08-26',
  providers: [
    {
      id: 'anthropic', name: 'Anthropic', logo: '/images/providers/anthropic.png', url: 'https://www.anthropic.com',
      models: [
        { id: 'claude-opus-5', name: 'Claude Opus 5', inputPrice: 5, outputPrice: 25, contextWindow: 1000000, released: '2026-07', capabilities: ['text', 'vision', 'tool-use', 'code', 'reasoning'], tier: 'flagship' },
        { id: 'claude-fable-5', name: 'Claude Fable 5', inputPrice: 10, outputPrice: 50, contextWindow: 1000000, released: '2026-06', capabilities: ['text', 'vision', 'tool-use', 'code'], tier: 'flagship' },
        { id: 'claude-sonnet-5', name: 'Claude Sonnet 5', inputPrice: 2, outputPrice: 10, contextWindow: 1000000, released: '2026-06', capabilities: ['text', 'vision', 'tool-use', 'code', 'reasoning'], tier: 'mid' },
        { id: 'claude-opus-4-8', name: 'Claude Opus 4.8', inputPrice: 5, outputPrice: 25, contextWindow: 1000000, released: '2026-05', capabilities: ['text', 'vision', 'tool-use', 'code'], tier: 'flagship' },
        { id: 'claude-opus-4-7', name: 'Claude Opus 4.7', inputPrice: 15, outputPrice: 75, contextWindow: 1000000, released: '2026-04', capabilities: ['text', 'vision', 'tool-use', 'code'], tier: 'flagship' },
        { id: 'claude-opus-4-6', name: 'Claude Opus 4.6', inputPrice: 15, outputPrice: 75, contextWindow: 200000, released: '2026-03', capabilities: ['text', 'vision', 'tool-use', 'code'], tier: 'mid' },
        { id: 'claude-sonnet-4-6', name: 'Claude Sonnet 4.6', inputPrice: 3, outputPrice: 15, contextWindow: 200000, released: '2026-03', capabilities: ['text', 'vision', 'tool-use', 'code'], tier: 'mid' },
        { id: 'claude-haiku-4-5', name: 'Claude Haiku 4.5', inputPrice: 0.8, outputPrice: 4, contextWindow: 200000, released: '2025-06', capabilities: ['text', 'vision', 'tool-use', 'code'], tier: 'budget' },
      ],
    },
    {
      id: 'openai', name: 'OpenAI', logo: '/images/providers/openai.png', url: 'https://openai.com',
      models: [
        { id: 'gpt-5-6-sol', name: 'GPT-5.6 Sol', inputPrice: 4.0, outputPrice: 20.0, contextWindow: 1000000, released: '2026-07', capabilities: ['text', 'vision', 'tool-use', 'code', 'reasoning'], tier: 'flagship' },
        { id: 'gpt-5-6-terra', name: 'GPT-5.6 Terra', inputPrice: 2.0, outputPrice: 12.0, contextWindow: 1000000, released: '2026-07', capabilities: ['text', 'vision', 'tool-use', 'code', 'reasoning'], tier: 'mid' },
        { id: 'gpt-5-6-luna', name: 'GPT-5.6 Luna', inputPrice: 0.2, outputPrice: 1.2, contextWindow: 1000000, released: '2026-07', capabilities: ['text', 'vision', 'tool-use', 'code', 'reasoning'], tier: 'budget' },
        { id: 'gpt-5-5', name: 'GPT-5.5', inputPrice: 5.0, outputPrice: 30.0, contextWindow: 1000000, released: '2026-04', capabilities: ['text', 'vision', 'tool-use', 'code', 'reasoning'], tier: 'flagship' },
        { id: 'gpt-4o', name: 'GPT-4o', inputPrice: 2.5, outputPrice: 10, contextWindow: 128000, released: '2024-05', capabilities: ['text', 'vision', 'tool-use', 'code'], tier: 'flagship' },
        { id: 'gpt-4o-mini', name: 'GPT-4o-mini', inputPrice: 0.15, outputPrice: 0.6, contextWindow: 128000, released: '2024-07', capabilities: ['text', 'vision', 'tool-use', 'code'], tier: 'budget' },
        { id: 'o1', name: 'o1', inputPrice: 15, outputPrice: 60, contextWindow: 200000, released: '2024-12', capabilities: ['text', 'reasoning', 'code'], tier: 'flagship' },
        { id: 'o3-mini', name: 'o3-mini', inputPrice: 1.1, outputPrice: 4.4, contextWindow: 200000, released: '2025-01', capabilities: ['text', 'reasoning', 'code'], tier: 'mid' },
      ],
    },
    {
      id: 'google', name: 'Google', logo: '/images/providers/google.png', url: 'https://ai.google.dev',
      models: [
        { id: 'gemini-2-5-pro', name: 'Gemini 2.5 Pro', inputPrice: 1.25, outputPrice: 10, contextWindow: 1000000, released: '2025-03', capabilities: ['text', 'vision', 'tool-use', 'code', 'reasoning'], tier: 'flagship' },
        { id: 'gemini-2-0-flash', name: 'Gemini 2.0 Flash', inputPrice: 0.1, outputPrice: 0.4, contextWindow: 1000000, released: '2025-02', capabilities: ['text', 'vision', 'tool-use', 'code'], tier: 'budget' },
        { id: 'gemini-3-1-flash-lite', name: 'Gemini 3.1 Flash-Lite', inputPrice: 0.25, outputPrice: 1.5, contextWindow: 1048576, released: '2026-05', capabilities: ['text', 'vision', 'tool-use', 'code', 'reasoning'], tier: 'budget' },
        { id: 'gemini-3-5-flash', name: 'Gemini 3.5 Flash', inputPrice: 1.5, outputPrice: 9, contextWindow: 1048576, released: '2026-05', capabilities: ['text', 'vision', 'tool-use', 'code', 'reasoning'], tier: 'mid' },
        { id: 'gemini-3-7-flash', name: 'Gemini 3.7 Flash', inputPrice: 0.75, outputPrice: 3.75, contextWindow: 1048576, released: '2026-08', capabilities: ['text', 'vision', 'audio', 'video', 'tool-use', 'code', 'reasoning'], tier: 'mid' },
        { id: 'gemini-3-6-flash', name: 'Gemini 3.6 Flash', inputPrice: 1.5, outputPrice: 7.5, contextWindow: 1048576, released: '2026-07', capabilities: ['text', 'vision', 'audio', 'video', 'tool-use', 'code', 'reasoning'], tier: 'mid' },
        { id: 'gemini-3-5-flash-lite', name: 'Gemini 3.5 Flash-Lite', inputPrice: 0.3, outputPrice: 2.5, contextWindow: 1048576, released: '2026-07', capabilities: ['text', 'vision', 'tool-use', 'code', 'reasoning'], tier: 'budget' },
      ],
    },
    {
      id: 'meta', name: 'Meta', logo: '/images/providers/meta.png', url: 'https://ai.meta.com',
      models: [
        { id: 'muse-glimmer-30b', name: 'Muse Glimmer 30B', inputPrice: 0.35, outputPrice: 1.5, contextWindow: 131072, released: '2026-08', openSource: true, license: 'Apache-2.0', capabilities: ['text', 'vision', 'tool-use', 'code', 'reasoning'], tier: 'mid' },
        { id: 'muse-spark-1-2', name: 'Muse Spark 1.2', inputPrice: 1.25, outputPrice: 4.25, contextWindow: 1000000, released: '2026-08', capabilities: ['text', 'vision', 'tool-use', 'code', 'reasoning'], tier: 'mid' },
        { id: 'muse-spark-1-2-contributor', name: 'Muse Spark 1.2 Contributor', inputPrice: 0.1, outputPrice: 0.2, contextWindow: 1000000, released: '2026-08', capabilities: ['text', 'vision', 'tool-use', 'code', 'reasoning'], tier: 'budget' },
        { id: 'muse-spark-1-1', name: 'Muse Spark 1.1', inputPrice: 1.25, outputPrice: 4.25, contextWindow: 1000000, released: '2026-07', capabilities: ['text', 'vision', 'tool-use', 'code', 'reasoning'], tier: 'mid' },
        { id: 'llama-4-scout', name: 'Llama 4 Scout', inputPrice: 0, outputPrice: 0, contextWindow: 10000000, released: '2025-04', openSource: true, license: 'Llama 4 Community License', capabilities: ['text', 'vision', 'code'], tier: 'mid' },
        { id: 'llama-4-maverick', name: 'Llama 4 Maverick', inputPrice: 0, outputPrice: 0, contextWindow: 1000000, released: '2025-04', openSource: true, license: 'Llama 4 Community License', capabilities: ['text', 'vision', 'code'], tier: 'flagship' },
      ],
    },
    {
      id: 'mistral', name: 'Mistral', logo: '/images/providers/mistral.png', url: 'https://mistral.ai',
      models: [
        { id: 'mistral-medium-3-5', name: 'Mistral Medium 3.5', inputPrice: 1.5, outputPrice: 7.5, contextWindow: 256000, released: '2026-05', openSource: true, license: 'Modified MIT', capabilities: ['text', 'code', 'tool-use', 'reasoning'], tier: 'mid' },
        { id: 'mistral-large', name: 'Mistral Large', inputPrice: 2, outputPrice: 6, contextWindow: 128000, released: '2025-01', capabilities: ['text', 'vision', 'tool-use', 'code'], tier: 'flagship' },
        { id: 'mistral-small', name: 'Mistral Small', inputPrice: 0.1, outputPrice: 0.3, contextWindow: 128000, released: '2025-01', capabilities: ['text', 'tool-use', 'code'], tier: 'budget' },
      ],
    },
    {
      id: 'cohere', name: 'Cohere', logo: '/images/providers/cohere.png', url: 'https://cohere.com',
      models: [
        { id: 'command-r-plus', name: 'Command R+', inputPrice: 2.5, outputPrice: 10, contextWindow: 128000, released: '2024-04', capabilities: ['text', 'tool-use', 'RAG'], tier: 'flagship' },
        { id: 'command-r', name: 'Command R', inputPrice: 0.15, outputPrice: 0.6, contextWindow: 128000, released: '2024-03', capabilities: ['text', 'tool-use', 'RAG'], tier: 'mid' },
      ],
    },
    {
      id: 'deepseek', name: 'DeepSeek', logo: '/images/providers/deepseek.png', url: 'https://www.deepseek.com',
      models: [
        { id: 'deepseek-v4-pro', name: 'DeepSeek V4 Pro', inputPrice: 0.435, outputPrice: 0.87, contextWindow: 1000000, released: '2026-04', openSource: true, license: 'MIT', capabilities: ['text', 'vision', 'code', 'reasoning'], tier: 'flagship' },
        { id: 'deepseek-v4-flash', name: 'DeepSeek V4 Flash', inputPrice: 0.14, outputPrice: 0.28, contextWindow: 1000000, released: '2026-04', openSource: true, license: 'MIT', capabilities: ['text', 'vision', 'code'], tier: 'budget' },
      ],
    },
    {
      id: 'alibaba', name: 'Alibaba', logo: '/images/providers/alibaba.png', url: 'https://qwenlm.ai',
      models: [
        { id: 'qwen3-8-27b', name: 'Qwen3.8 27B', inputPrice: 0.425, outputPrice: 2.55, contextWindow: 1000000, released: '2026-08', openSource: true, license: 'Apache-2.0', capabilities: ['text', 'vision', 'tool-use', 'code', 'reasoning'], tier: 'mid' },
        { id: 'qwen3-8-a95b', name: 'Qwen3.8 2.4T-A95B', inputPrice: 2.0, outputPrice: 6.0, contextWindow: 1048576, released: '2026-08', openSource: true, license: 'Qwen3.8-Max License', capabilities: ['text', 'tool-use', 'code', 'reasoning'], tier: 'flagship' },
        { id: 'qwen3-8-max', name: 'Qwen3.8-Max', inputPrice: 2, outputPrice: 6, contextWindow: 1000000, released: '2026-08', capabilities: ['text', 'vision', 'video', 'code', 'reasoning', 'tool-use'], tier: 'flagship' },
        { id: 'qwen3-7-max', name: 'Qwen3.7-Max', inputPrice: 2.5, outputPrice: 7.5, contextWindow: 1000000, released: '2026-05', capabilities: ['text', 'code', 'reasoning', 'tool-use'], tier: 'flagship' },
      ],
    },
    {
      id: 'xai', name: 'xAI', logo: '/images/providers/xai.png', url: 'https://x.ai',
      models: [
        { id: 'grok-4-6', name: 'Grok 4.6', inputPrice: 2, outputPrice: 6, contextWindow: 500000, released: '2026-08', capabilities: ['text', 'vision', 'tool-use', 'code', 'reasoning'], tier: 'flagship' },
        { id: 'grok-4-5', name: 'Grok 4.5', inputPrice: 2, outputPrice: 6, contextWindow: 500000, released: '2026-07', capabilities: ['text', 'vision', 'tool-use', 'code', 'reasoning'], tier: 'flagship' },
        { id: 'grok-4-3', name: 'Grok 4.3', inputPrice: 1.25, outputPrice: 2.5, contextWindow: 1000000, released: '2026-04', capabilities: ['text', 'vision', 'tool-use', 'code'], tier: 'flagship' },
      ],
    },
    {
      id: 'nvidia', name: 'NVIDIA', logo: '/images/providers/nvidia.png', url: 'https://www.nvidia.com/en-us/ai/',
      models: [
        { id: 'nemotron-3-5-lightning', name: 'Nemotron 3.5 Lightning', inputPrice: 0.08, outputPrice: 0.2, contextWindow: 262144, released: '2026-08', openSource: true, license: 'OpenMDW-1.1', capabilities: ['text', 'tool-use', 'code', 'reasoning'], tier: 'budget' },
        { id: 'nemotron-3-nano-omni', name: 'Nemotron 3 Nano Omni', inputPrice: 0, outputPrice: 0, contextWindow: 256000, released: '2026-04', openSource: true, license: 'NVIDIA Open Model License', capabilities: ['text', 'vision', 'audio', 'video', 'code', 'reasoning', 'tool-use'], tier: 'mid' },
      ],
    },
    {
      id: 'microsoft', name: 'Microsoft', logo: '/images/providers/microsoft.png', url: 'https://microsoft.ai',
      models: [
        { id: 'mai-code-1-flash', name: 'MAI-Code-1-Flash', inputPrice: 0.75, outputPrice: 4.5, contextWindow: 256000, released: '2026-06', capabilities: ['text', 'code', 'tool-use'], tier: 'budget' },
      ],
    },
    {
      id: 'minimax', name: 'MiniMax', logo: '/images/providers/minimax.png', url: 'https://www.minimax.io',
      models: [
        { id: 'minimax-m3', name: 'MiniMax M3', inputPrice: 0.3, outputPrice: 1.2, contextWindow: 1048576, released: '2026-06', openSource: true, license: 'Open weights, license TBD', capabilities: ['text', 'vision', 'video', 'code', 'tool-use'], tier: 'budget' },
      ],
    },
    {
      id: 'meituan', name: 'Meituan', logo: '/images/providers/meituan.png', url: 'https://www.longcatai.org',
      models: [
        { id: 'longcat-2', name: 'LongCat-2.0', inputPrice: 0, outputPrice: 0, contextWindow: 1000000, released: '2026-06', openSource: true, license: 'MIT', capabilities: ['text', 'code', 'tool-use', 'reasoning'], tier: 'flagship' },
      ],
    },
    {
      id: 'zhipu', name: 'Z.ai (Zhipu AI)', logo: '/images/providers/zhipu.png', url: 'https://z.ai',
      models: [
        { id: 'glm-5-3', name: 'GLM-5.3', inputPrice: 1.4, outputPrice: 4.4, contextWindow: 1048576, released: '2026-08', capabilities: ['text', 'tool-use', 'code', 'reasoning'], tier: 'flagship' },
        { id: 'glm-5-2', name: 'GLM-5.2', inputPrice: 1.4, outputPrice: 4.4, contextWindow: 1000000, released: '2026-06', openSource: true, license: 'MIT', capabilities: ['text', 'code', 'tool-use', 'reasoning'], tier: 'flagship' },
      ],
    },
    {
      id: 'moonshot', name: 'Moonshot AI', logo: '/images/providers/moonshot.png', url: 'https://www.moonshot.cn',
      models: [
        { id: 'kimi-k3', name: 'Kimi K3', inputPrice: 3, outputPrice: 15, contextWindow: 1000000, released: '2026-07', openSource: true, license: 'Kimi K3 License', capabilities: ['text', 'vision', 'code', 'tool-use', 'reasoning'], tier: 'flagship' },
      ],
    },
    {
      id: 'poolside', name: 'poolside', logo: '/images/providers/poolside.png', url: 'https://poolside.ai',
      models: [
        { id: 'laguna-s-2-1', name: 'Laguna S 2.1', inputPrice: 0.1, outputPrice: 0.2, contextWindow: 1048576, released: '2026-07', openSource: true, license: 'OpenMDW-1.1', capabilities: ['text', 'code', 'tool-use', 'reasoning'], tier: 'mid' },
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

export const BASELINE_BENCHMARKS: BenchmarksData = {
  lastUpdated: '2026-08-27',
  benchmarks: [
    { id: 'swe_bench', name: 'SWE-bench', description: 'Real-world software engineering tasks from GitHub issues (SWE-bench Verified)', maxScore: 100 },
    { id: 'mmlu_pro', name: 'MMLU-Pro', description: 'General knowledge and reasoning across 57 subjects', maxScore: 100 },
    { id: 'human_eval', name: 'HumanEval', description: 'Python code generation and problem solving', maxScore: 100 },
    { id: 'gpqa_diamond', name: 'GPQA Diamond', description: 'Graduate-level science questions verified by domain experts', maxScore: 100 },
    { id: 'math', name: 'MATH', description: 'Competition-level mathematics problems', maxScore: 100 },
    { id: 'osworld_2', name: 'OSWorld 2.0', description: 'Computer use across real desktop applications and multi-step GUI tasks', maxScore: 100 },
    { id: 'browsecomp', name: 'BrowseComp', description: 'Agentic web search and browsing over hard-to-find facts', maxScore: 100 },
    { id: 'frontier_code', name: 'FrontierCode v1.1', description: 'Agentic coding on frontier software engineering tasks (Main split)', maxScore: 100 },
    { id: 'hle_tools', name: "Humanity's Last Exam (tools)", description: 'Multidisciplinary expert-level reasoning with tool access', maxScore: 100 },
  ],
  models: [
    {
      model: 'Qwen3.8 2.4T-A95B', provider: 'Alibaba', released: '2026-08', scores: { gpqa_diamond: 92.6, hle_tools: 56.2 },
      provenance: {
        gpqa_diamond: { type: 'vendor', by: 'Alibaba', url: 'https://huggingface.co/Qwen/Qwen3.8-2.4T-A95B' },
        hle_tools: { type: 'vendor', by: 'Alibaba', url: 'https://huggingface.co/Qwen/Qwen3.8-2.4T-A95B' },
      },
    },
    {
      model: 'Qwen3.8 27B', provider: 'Alibaba', released: '2026-08', scores: { gpqa_diamond: 89.2 },
      provenance: {
        gpqa_diamond: { type: 'vendor', by: 'Alibaba', url: 'https://huggingface.co/Qwen/Qwen3.8-27B' },
      },
    },
    {
      model: 'Muse Glimmer 30B', provider: 'Meta', released: '2026-08', scores: { swe_bench: 76.0, gpqa_diamond: 83.5 },
      provenance: {
        swe_bench: { type: 'vendor', by: 'Meta', url: 'https://huggingface.co/meta-models/Muse-Glimmer-30B' },
        gpqa_diamond: { type: 'vendor', by: 'Meta', url: 'https://huggingface.co/meta-models/Muse-Glimmer-30B' },
      },
    },
    {
      model: 'Nemotron 3.5 Lightning', provider: 'NVIDIA', released: '2026-08', scores: { swe_bench: 51.56, mmlu_pro: 81.94, gpqa_diamond: 75.44, browsecomp: 36.97 },
      provenance: {
        swe_bench: { type: 'vendor', by: 'NVIDIA', url: 'https://huggingface.co/nvidia/NVIDIA-Nemotron-3.5-Lightning-30B-A3B-BF16' },
        mmlu_pro: { type: 'vendor', by: 'NVIDIA', url: 'https://huggingface.co/nvidia/NVIDIA-Nemotron-3.5-Lightning-30B-A3B-BF16' },
        gpqa_diamond: { type: 'vendor', by: 'NVIDIA', url: 'https://huggingface.co/nvidia/NVIDIA-Nemotron-3.5-Lightning-30B-A3B-BF16' },
        browsecomp: { type: 'vendor', by: 'NVIDIA', url: 'https://huggingface.co/nvidia/NVIDIA-Nemotron-3.5-Lightning-30B-A3B-BF16' },
      },
    },
    {
      model: 'Gemini 3.7 Flash', provider: 'Google', released: '2026-08', scores: { gpqa_diamond: 94.5, osworld_2: 47.9 },
      provenance: {
        gpqa_diamond: { type: 'independent', by: 'Artificial Analysis', url: 'https://artificialanalysis.ai/evaluations/gpqa-diamond' },
        osworld_2: { type: 'vendor', by: 'Google DeepMind', url: 'https://deepmind.google/models/model-cards/gemini-3-7-flash/' },
      },
    },
    {
      model: 'Grok 4.6', provider: 'xAI', released: '2026-08', scores: { gpqa_diamond: 94.9 },
      provenance: {
        gpqa_diamond: { type: 'independent', by: 'Artificial Analysis', url: 'https://artificialanalysis.ai/evaluations/gpqa-diamond' },
      },
    },
    {
      model: 'GLM-5.3', provider: 'Z.ai', released: '2026-08', scores: { swe_bench: 95.4, mmlu_pro: 86.77, gpqa_diamond: 88.13, hle_tools: 62.5 },
      provenance: {
        swe_bench: { type: 'independent', by: 'Vals AI', url: 'https://www.vals.ai/models/zai_glm-5.3' },
        mmlu_pro: { type: 'independent', by: 'Vals AI', url: 'https://www.vals.ai/models/zai_glm-5.3' },
        gpqa_diamond: { type: 'independent', by: 'Vals AI', url: 'https://www.vals.ai/models/zai_glm-5.3' },
        hle_tools: { type: 'vendor', by: 'Z.ai', url: 'https://z.ai/blog/glm-5.3' },
      },
    },
    {
      model: 'Qwen3.8-Max', provider: 'Alibaba', released: '2026-08', scores: { swe_bench: 85.6, gpqa_diamond: 92.6, hle_tools: 56.2 },
      provenance: {
        swe_bench: { type: 'independent', by: 'Vals AI', url: 'https://www.vals.ai/benchmarks/swebench' },
        gpqa_diamond: { type: 'vendor', by: 'Alibaba', url: 'https://qwen.ai/blog?id=qwen3.8' },
        hle_tools: { type: 'vendor', by: 'Alibaba', url: 'https://qwen.ai/blog?id=qwen3.8' },
      },
    },
    {
      model: 'GPT-5.6 Sol', provider: 'OpenAI', released: '2026-07', scores: { gpqa_diamond: 94.6, osworld_2: 62.6, browsecomp: 90.4 },
      provenance: {
        gpqa_diamond: { type: 'vendor', by: 'OpenAI', url: 'https://openai.com/index/gpt-5-6/' },
        osworld_2: { type: 'vendor', by: 'OpenAI', url: 'https://openai.com/index/gpt-5-6/' },
        browsecomp: { type: 'vendor', by: 'OpenAI', url: 'https://openai.com/index/gpt-5-6/' },
      },
    },
    {
      model: 'GPT-5.6 Terra', provider: 'OpenAI', released: '2026-07', scores: { gpqa_diamond: 92.9, osworld_2: 50.2, browsecomp: 87.5 },
      provenance: {
        gpqa_diamond: { type: 'vendor', by: 'OpenAI', url: 'https://openai.com/index/gpt-5-6/' },
        osworld_2: { type: 'vendor', by: 'OpenAI', url: 'https://openai.com/index/gpt-5-6/' },
        browsecomp: { type: 'vendor', by: 'OpenAI', url: 'https://openai.com/index/gpt-5-6/' },
      },
    },
    {
      model: 'GPT-5.6 Luna', provider: 'OpenAI', released: '2026-07', scores: { gpqa_diamond: 92.3, osworld_2: 45.6, browsecomp: 83.3 },
      provenance: {
        gpqa_diamond: { type: 'vendor', by: 'OpenAI', url: 'https://openai.com/index/gpt-5-6/' },
        osworld_2: { type: 'vendor', by: 'OpenAI', url: 'https://openai.com/index/gpt-5-6/' },
        browsecomp: { type: 'vendor', by: 'OpenAI', url: 'https://openai.com/index/gpt-5-6/' },
      },
    },
    {
      model: 'Gemini 3.6 Flash', provider: 'Google', released: '2026-07', scores: { osworld_2: 33.8 },
      provenance: {
        osworld_2: { type: 'vendor', by: 'Google DeepMind', url: 'https://deepmind.google/models/model-cards/gemini-3-7-flash/' },
      },
    },
    {
      model: 'Grok 4.5', provider: 'xAI', released: '2026-07', scores: { swe_bench: 86.6 },
      provenance: {
        swe_bench: { type: 'independent', by: 'Vals AI', url: 'https://www.vals.ai/benchmarks/swebench' },
      },
    },
    {
      model: 'Inkling', provider: 'Thinking Machines', released: '2026-07', scores: { swe_bench: 77.6, gpqa_diamond: 87.2, browsecomp: 77.1, hle_tools: 46.0 },
      provenance: {
        swe_bench: { type: 'vendor', by: 'Thinking Machines', url: 'https://thinkingmachines.ai/model-card/inkling/' },
        gpqa_diamond: { type: 'vendor', by: 'Thinking Machines', url: 'https://thinkingmachines.ai/model-card/inkling/' },
        browsecomp: { type: 'vendor', by: 'Thinking Machines', url: 'https://thinkingmachines.ai/model-card/inkling/' },
        hle_tools: { type: 'vendor', by: 'Thinking Machines', url: 'https://thinkingmachines.ai/model-card/inkling/' },
      },
    },
    {
      model: 'GLM-5.2', provider: 'Z.ai', released: '2026-06', scores: { swe_bench: 82.8, mmlu_pro: 86.71, gpqa_diamond: 91.2, hle_tools: 54.7 },
      provenance: {
        swe_bench: { type: 'independent', by: 'Vals AI', url: 'https://www.vals.ai/models/zai_glm-5.2' },
        mmlu_pro: { type: 'independent', by: 'Vals AI', url: 'https://www.vals.ai/models/zai_glm-5.2' },
        gpqa_diamond: { type: 'vendor', by: 'Z.ai', url: 'https://huggingface.co/zai-org/GLM-5.2' },
        hle_tools: { type: 'vendor', by: 'Z.ai', url: 'https://huggingface.co/zai-org/GLM-5.2' },
      },
    },
    {
      model: 'MiniMax M3', provider: 'MiniMax', released: '2026-06', scores: { swe_bench: 80.5, mmlu_pro: 84.22, gpqa_diamond: 92.68, browsecomp: 83.5 },
      provenance: {
        swe_bench: { type: 'vendor', by: 'MiniMax', url: 'https://huggingface.co/MiniMaxAI/MiniMax-M3' },
        mmlu_pro: { type: 'independent', by: 'Vals AI', url: 'https://www.vals.ai/benchmarks/mmlu_pro' },
        gpqa_diamond: { type: 'independent', by: 'Vals AI', url: 'https://www.vals.ai/models/minimax_MiniMax-M3' },
        browsecomp: { type: 'vendor', by: 'MiniMax', url: 'https://huggingface.co/MiniMaxAI/MiniMax-M3' },
      },
    },
    {
      model: 'LongCat-2.0', provider: 'Meituan', released: '2026-06', scores: { gpqa_diamond: 88.9, browsecomp: 79.9 },
      provenance: {
        gpqa_diamond: { type: 'vendor', by: 'Meituan', url: 'https://huggingface.co/meituan-longcat/LongCat-2.0' },
        browsecomp: { type: 'vendor', by: 'Meituan', url: 'https://huggingface.co/meituan-longcat/LongCat-2.0' },
      },
    },
    { model: 'GPT-5.5', provider: 'OpenAI', released: '2026-04', scores: { mmlu_pro: 94.2, human_eval: 97.1, gpqa_diamond: 78.3, math: 95.8, swe_bench: 82.6 } },
    { model: 'DeepSeek V4 Pro', provider: 'DeepSeek', released: '2026-04', scores: { mmlu_pro: 91.5, human_eval: 94.8, gpqa_diamond: 73.1, math: 92.4, swe_bench: 80.6 } },
    { model: 'DeepSeek V4 Flash', provider: 'DeepSeek', released: '2026-04', scores: { mmlu_pro: 85.2, human_eval: 89.4, gpqa_diamond: 58.7, math: 82.1, swe_bench: 79.0 } },
    {
      model: 'Kimi K3', provider: 'Moonshot AI', released: '2026-07', scores: { swe_bench: 93.4, mmlu_pro: 87.97, gpqa_diamond: 93.5, osworld_2: 58.3, browsecomp: 91.2, hle_tools: 56.0 },
      provenance: {
        swe_bench: { type: 'independent', by: 'Vals AI', url: 'https://www.vals.ai/benchmarks/swebench' },
        mmlu_pro: { type: 'independent', by: 'Vals AI', url: 'https://www.vals.ai/benchmarks/mmlu_pro' },
        gpqa_diamond: { type: 'vendor', by: 'Moonshot AI', url: 'https://github.com/MoonshotAI/Kimi-K3' },
        osworld_2: { type: 'vendor', by: 'Moonshot AI', url: 'https://github.com/MoonshotAI/Kimi-K3' },
        browsecomp: { type: 'vendor', by: 'Moonshot AI', url: 'https://github.com/MoonshotAI/Kimi-K3' },
        hle_tools: { type: 'vendor', by: 'Moonshot AI', url: 'https://github.com/MoonshotAI/Kimi-K3' },
      },
    },
    { model: 'Mistral Medium 3.5', provider: 'Mistral', released: '2026-05', scores: { swe_bench: 77.6 } },
    {
      model: 'Claude Opus 5', provider: 'Anthropic', released: '2026-07', scores: { swe_bench: 96.0, osworld_2: 70.6, browsecomp: 90.8, frontier_code: 53.4, hle_tools: 64.7 },
      provenance: {
        swe_bench: { type: 'vendor', by: 'Anthropic', url: 'https://www.anthropic.com/claude-opus-5-system-card' },
        osworld_2: { type: 'vendor', by: 'Anthropic', url: 'https://www.anthropic.com/claude-opus-5-system-card' },
        browsecomp: { type: 'vendor', by: 'Anthropic', url: 'https://www.anthropic.com/claude-opus-5-system-card' },
        frontier_code: { type: 'vendor', by: 'Anthropic', url: 'https://www.anthropic.com/claude-opus-5-system-card' },
      },
    },
    { model: 'Claude Fable 5', provider: 'Anthropic', released: '2026-06', scores: { swe_bench: 95.0, osworld_2: 66.1, browsecomp: 87.4, frontier_code: 53.5, hle_tools: 63.9 } },
    {
      model: 'Claude Sonnet 5', provider: 'Anthropic', released: '2026-06', scores: { swe_bench: 85.2, browsecomp: 84.7, hle_tools: 57.4 },
      provenance: {
        swe_bench: { type: 'vendor', by: 'Anthropic', url: 'https://www.anthropic.com/claude-sonnet-5-system-card' },
        browsecomp: { type: 'vendor', by: 'Anthropic', url: 'https://www.anthropic.com/claude-sonnet-5-system-card' },
        hle_tools: { type: 'vendor', by: 'Anthropic', url: 'https://www.anthropic.com/claude-sonnet-5-system-card' },
      },
    },
    { model: 'Claude Opus 4.8', provider: 'Anthropic', released: '2026-05', scores: { gpqa_diamond: 93.6, swe_bench: 88.6, osworld_2: 55.7, browsecomp: 84.3, frontier_code: 46.5, hle_tools: 57.9 } },
    { model: 'Claude Opus 4.7', provider: 'Anthropic', released: '2026-04', scores: { mmlu_pro: 93.8, human_eval: 96.2, gpqa_diamond: 76.5, math: 93.1, swe_bench: 87.6 } },
    { model: 'Claude Opus 4.6', provider: 'Anthropic', released: '2026-03', scores: { mmlu_pro: 92.4, human_eval: 95.1, gpqa_diamond: 74.2, math: 91.8, swe_bench: 80.8 } },
    { model: 'Claude Sonnet 4.6', provider: 'Anthropic', released: '2026-02', scores: { mmlu_pro: 88.7, human_eval: 92.0, gpqa_diamond: 65.8, math: 85.4, swe_bench: 79.6 } },
    { model: 'Claude Haiku 4.5', provider: 'Anthropic', released: '2026-01', scores: { mmlu_pro: 82.1, human_eval: 86.3, gpqa_diamond: 52.4, math: 74.6, swe_bench: 73.3 } },
    { model: 'GPT-4o', provider: 'OpenAI', released: '2024-05', scores: { mmlu_pro: 87.2, human_eval: 90.2, gpqa_diamond: 59.1, math: 81.3, swe_bench: 33.2 } },
    { model: 'GPT-4.5', provider: 'OpenAI', released: '2025-12', scores: { mmlu_pro: 90.1, human_eval: 93.4, gpqa_diamond: 68.7, math: 88.2, swe_bench: 38.0 } },
    { model: 'o1', provider: 'OpenAI', released: '2024-12', scores: { mmlu_pro: 91.8, human_eval: 94.2, gpqa_diamond: 72.5, math: 94.6, swe_bench: 48.9 } },
    { model: 'o3-mini', provider: 'OpenAI', released: '2025-01', scores: { mmlu_pro: 86.3, human_eval: 89.7, gpqa_diamond: 60.3, math: 87.1, swe_bench: 49.3 } },
    { model: 'Gemini 2.5 Pro', provider: 'Google', released: '2026-01', scores: { mmlu_pro: 91.2, human_eval: 93.8, gpqa_diamond: 71.9, math: 90.5, swe_bench: 63.8 } },
    { model: 'Gemini 2.0 Flash', provider: 'Google', released: '2025-02', scores: { mmlu_pro: 84.5, human_eval: 87.6, gpqa_diamond: 54.8, math: 77.2 } },
    { model: 'Llama 4 Scout', provider: 'Meta', released: '2025-04', scores: { mmlu_pro: 85.9, human_eval: 88.4, gpqa_diamond: 56.2, math: 79.8 } },
    { model: 'Llama 4 Maverick', provider: 'Meta', released: '2025-04', scores: { mmlu_pro: 89.3, human_eval: 91.7, gpqa_diamond: 64.1, math: 86.7, swe_bench: 24.0 } },
    { model: 'Mistral Large', provider: 'Mistral', released: '2025-11', scores: { mmlu_pro: 86.8, human_eval: 89.1, gpqa_diamond: 57.3, math: 80.4, swe_bench: 47.2 } },
    { model: 'Mistral Small', provider: 'Mistral', released: '2025-01', scores: { mmlu_pro: 78.4, human_eval: 82.5, gpqa_diamond: 44.6, math: 68.9 } },
    { model: 'DeepSeek V3', provider: 'DeepSeek', released: '2025-12', scores: { mmlu_pro: 88.1, human_eval: 91.2, gpqa_diamond: 63.5, math: 85.9, swe_bench: 42.0 } },
  ],
  provenanceNotes: {
    field: 'provenance',
    meaning: 'Per-cell record of who produced a score, keyed by benchmark id.',
    types: { vendor: 'Published by the lab that makes the model, including figures a lab commissioned from a benchmark maintainer.', independent: 'Produced by a third party that ran the model itself, such as Vals AI or Artificial Analysis.' },
    absent: "A benchmark id missing from a model's provenance map means provenance was not recorded, or two sources disagreed. It is not a claim that the score is unsourced.",
    caution: 'Vendor and independent figures are not interchangeable. Observed gaps on the same model and benchmark reach 10.9 points, so do not rank across mixed provenance without checking.',
  },
};

export const BASELINE_AGENTS: AgentsData = {
  lastUpdated: '2026-08-17',
  categories: [
    { id: 'coding', name: 'Coding Agents', description: 'AI-powered tools that write, review, and debug code directly in your development workflow.' },
    { id: 'research', name: 'Research Agents', description: 'AI agents specialized in finding, synthesizing, and analyzing information from various sources.' },
    { id: 'general', name: 'General / Personal Agents', description: 'Versatile AI assistants for everyday tasks including writing, analysis, brainstorming, and conversation.' },
    { id: 'creative', name: 'Creative Agents', description: 'AI tools for generating images, music, video, and other creative media.' },
    { id: 'frameworks', name: 'Frameworks & Platforms', description: 'Developer tools and SDKs for building custom AI agents and multi-agent workflows.' },
  ],
  agents: [
    { id: 'muse-code', name: 'Muse Code', provider: 'Meta', category: 'coding', description: 'A terminal coding agent for macOS and Linux, released August 5, 2026 and co-trained as one unit with Muse Spark 1.2 so the model and the harness share goals, compaction, and subagent recipes. Runs persistent background agents across a session and keeps a replay-safe event log so it survives a crash.', url: 'https://dev.meta.ai', pricing: 'Usage-based via the Meta Model API: $1.25/$4.25 per 1M tokens standard, or $0.10/$0.20 on the contributor tier if you let Meta train on your data', launched: 2026 },
    { id: 'deepseek-harness', name: 'DeepSeek Harness', provider: 'DeepSeek', category: 'coding', description: 'A plugin-first open-source coding agent released August 13, 2026 under MIT, aimed directly at Claude Code. Shipped the same day DeepSeek moved V4-Pro to general availability and raised API prices, pairing an open harness with a more expensive model.', url: 'https://www.deepseek.com', pricing: 'Free and open source under MIT; model inference billed separately', launched: 2026 },
    { id: 'grok-build', name: 'Grok Build', provider: 'xAI (SpaceXAI)', category: 'coding', description: 'xAI\'s official terminal coding agent, invoked as the grok command. Runs up to 8 parallel sub-agents and has defaulted to Grok 4.6 with a 500K context window since August 12, 2026.', url: 'https://x.ai/build', pricing: 'No standalone plan; bundled into xAI subscriptions at SuperGrok $30/mo, X Premium+ $40/mo, and SuperGrok Heavy $300/mo. Every tier unlocks the same CLI and differs only in usage limits. Headless use via the API bills grok-build-0.1 at roughly $0.20/$1.50 per 1M tokens', launched: 2026 },
    { id: 'claude-code', name: 'Claude Code', provider: 'Anthropic', category: 'coding', description: 'An agentic CLI tool that lets Claude operate directly in your terminal, reading files, editing code, running commands, and managing git workflows autonomously.', url: 'https://docs.anthropic.com/en/docs/claude-code', pricing: 'Usage-based via Claude API', launched: 2025 },
    { id: 'cursor', name: 'Cursor', provider: 'SpaceXAI (formerly Anysphere)', category: 'coding', description: 'An AI-native code editor built on VS Code that provides inline code generation, multi-file editing, and codebase-aware chat powered by multiple foundation models. SpaceX closed its $60 billion all-stock acquisition of maker Anysphere on August 14, 2026, folding Cursor into the SpaceXAI unit alongside Grok Build and Grok Bot.', url: 'https://cursor.sh', pricing: 'Free tier, Pro $20/mo, Business $40/mo', launched: 2023 },
    { id: 'github-copilot', name: 'GitHub Copilot', provider: 'GitHub / Microsoft', category: 'coding', description: 'An AI pair programmer integrated into popular editors that suggests code completions, generates functions from comments, and offers chat-based coding assistance.', url: 'https://github.com/features/copilot', pricing: 'Individual $10/mo, Business $19/mo, Enterprise $39/mo', launched: 2022 },
    { id: 'windsurf', name: 'Devin Desktop (formerly Windsurf)', provider: 'Cognition', category: 'coding', description: 'An AI-native developer environment (rebranded from Windsurf in June 2026) that provides a unified surface for managing local and cloud coding agents, including Devin, Claude Code, Codex, and custom agents through the Agent Client Protocol.', url: 'https://devin.ai', pricing: 'Free tier, Pro $15/mo, Teams $30/mo', launched: 2024 },
    { id: 'perplexity', name: 'Perplexity', provider: 'Perplexity AI', category: 'research', description: 'An AI-powered answer engine that searches the web in real time, synthesizes information from multiple sources, and provides cited responses to complex questions.', url: 'https://www.perplexity.ai', pricing: 'Free tier, Pro $20/mo', launched: 2022 },
    { id: 'elicit', name: 'Elicit', provider: 'Elicit Inc.', category: 'research', description: 'A research assistant that helps find and analyze academic papers, extract key claims, and summarize findings across large bodies of scientific literature.', url: 'https://elicit.com', pricing: 'Free tier, Plus $10/mo, Enterprise custom', launched: 2021 },
    { id: 'consensus', name: 'Consensus', provider: 'Consensus NLP', category: 'research', description: 'A search engine that uses AI to find and synthesize results from peer-reviewed scientific research, providing evidence-based answers with citations.', url: 'https://consensus.app', pricing: 'Free tier, Premium $9.99/mo', launched: 2022 },
    { id: 'chatgpt', name: 'ChatGPT', provider: 'OpenAI', category: 'general', description: 'A general-purpose AI assistant that can handle conversation, writing, coding, analysis, and web browsing, with plugin and custom GPT support for specialized tasks.', url: 'https://chat.openai.com', pricing: 'Free tier, Plus $20/mo, Team $25/mo, Enterprise custom', launched: 2022 },
    { id: 'gemini', name: 'Gemini', provider: 'Google', category: 'general', description: 'Google\'s multimodal AI assistant with deep integration into Google Workspace, Search, and Android, capable of handling text, images, code, and long documents.', url: 'https://gemini.google.com', pricing: 'Free tier, Advanced $19.99/mo (included with Google One AI Premium)', launched: 2023 },
    { id: 'gemini-spark', name: 'Gemini Spark', provider: 'Google', category: 'general', description: 'A 24/7 personal AI agent announced at Google I/O May 2026 that runs continuously in the background, managing Gmail, Google Calendar, and 30+ third-party tools via MCP connections. Designed to handle tasks proactively with user approval gates.', url: 'https://blog.google/products-and-platforms/products/google-one/google-ai-subscriptions/', pricing: 'Google AI Ultra subscription required (~$100/mo); US beta access for Ultra subscribers', launched: 2026 },
    { id: 'openclaw', name: 'OpenClaw', provider: 'OpenClaw (Peter Steinberger)', category: 'general', description: 'Open-source personal AI agent that runs locally, keeps context across conversations, and acts on the user\'s own machine, driven mainly through messaging platforms rather than a chat window. Shipped in 2025 as Clawdbot, renamed Moltbot over a trademark conflict, and settled on OpenClaw in January 2026 before passing 100,000 GitHub stars the month after.', url: 'https://github.com/openclaw/openclaw', pricing: 'Free and open source; you pay only whatever model provider it calls', launched: 2025 },
    { id: 'grok-bot', name: 'Grok Bot', provider: 'xAI (SpaceXAI)', category: 'general', description: 'Always-on agents that each get their own cloud computer, sign into a customer\'s existing tools, and finish multi-step jobs unsupervised, including inside apps and sites that expose no clean API or MCP integration. Work continues after the user closes the laptop, and the agent comes back when it needs approval rather than direction at every step.', url: 'https://x.ai/bot', pricing: 'No standalone plan and no published per-bot fee. Beta access ships with SuperGrok Heavy (about $300/mo), Cursor Ultra ($200/mo), and Cursor Teams Premium ($120/user/mo), each including weekly usage with on-demand overage billed at model and token cost', launched: 2026 },
    { id: 'claude', name: 'Claude', provider: 'Anthropic', category: 'general', description: 'A helpful AI assistant known for nuanced instruction-following, long-context understanding, and careful reasoning across writing, analysis, coding, and research tasks.', url: 'https://claude.ai', pricing: 'Free tier, Pro $20/mo, Team $25/mo, Enterprise custom', launched: 2023 },
    { id: 'midjourney', name: 'Midjourney', provider: 'Midjourney Inc.', category: 'creative', description: 'A leading AI image generation tool that creates high-quality, artistic images from text prompts, known for its distinctive aesthetic style and photorealistic output.', url: 'https://www.midjourney.com', pricing: 'Basic $10/mo, Standard $30/mo, Pro $60/mo', launched: 2022 },
    { id: 'dall-e-3', name: 'DALL-E 3', provider: 'OpenAI', category: 'creative', description: 'OpenAI\'s image generation model integrated into ChatGPT and available via API, offering precise prompt adherence and the ability to render text within images.', url: 'https://openai.com/dall-e-3', pricing: 'Included with ChatGPT Plus, API usage-based', launched: 2023 },
    { id: 'suno', name: 'Suno', provider: 'Suno Inc.', category: 'creative', description: 'An AI music generation platform that creates full songs with vocals, instruments, and lyrics from text prompts or custom lyrics input.', url: 'https://suno.com', pricing: 'Free tier, Pro $10/mo, Premier $30/mo', launched: 2023 },
    { id: 'langchain', name: 'LangChain', provider: 'LangChain Inc.', category: 'frameworks', description: 'An open-source framework for building LLM-powered applications with chains, agents, retrieval-augmented generation, and memory, supporting multiple model providers.', url: 'https://www.langchain.com', pricing: 'Open source (LangSmith platform has paid tiers)', launched: 2022 },
    { id: 'crewai', name: 'CrewAI', provider: 'CrewAI Inc.', category: 'frameworks', description: 'A framework for orchestrating role-playing AI agents that collaborate on complex tasks, allowing developers to define agent roles, goals, and delegation patterns.', url: 'https://www.crewai.com', pricing: 'Open source, Enterprise cloud plans available', launched: 2024 },
    { id: 'autogen', name: 'AutoGen', provider: 'Microsoft', category: 'frameworks', description: 'An open-source framework for building multi-agent conversational systems where multiple AI agents can collaborate, debate, and coordinate to solve tasks.', url: 'https://github.com/microsoft/autogen', pricing: 'Open source', launched: 2023 },
    { id: 'openai-assistants', name: 'OpenAI Assistants API', provider: 'OpenAI', category: 'frameworks', description: 'A platform API for building AI assistants with persistent threads, file retrieval, code interpretation, and function calling built into OpenAI\'s hosted infrastructure.', url: 'https://platform.openai.com/docs/assistants', pricing: 'Usage-based via OpenAI API', launched: 2023 },
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
  // BASELINE_PRICING (the worker mirror of data/pricing.json, guarded by
  // catalog-pricing-sync.test.ts) is the canonical source of truth for
  // /api/models membership AND order, exactly like BASELINE_BENCHMARKS below.
  // We rebuild the curated frontier catalog from the baseline every run, so
  // additions, reorderings, removals, and the lastUpdated date in
  // data/pricing.json always propagate, and the flagship always leads. LiteLLM
  // is layered on top purely to refresh price and context on the tracked
  // models; it never widens the set (the long tail lives at
  // /api/openrouter/models). This is what stopped the drift where auto-added
  // LiteLLM entries polluted the curated set and buried the flagship.
  const existingPricing =
    ((await env.TENSORFEED_CACHE.get('models', 'json')) as PricingData | null) ??
    ((await env.TENSORFEED_CACHE.get('pricing', 'json')) as PricingData | null);

  let pricing: PricingData = JSON.parse(JSON.stringify(BASELINE_PRICING)) as PricingData;

  const litellm = await fetchLiteLLMPricing();
  if (litellm) {
    pricing = mergePricing(pricing, litellm).data;
    console.log('LiteLLM merge: refreshed tracked-model prices');
  } else {
    console.log('LiteLLM fetch failed, serving curated baseline prices');
  }

  result.modelCount = pricing.providers.reduce((n, p) => n + p.models.length, 0);

  // Write only when the serialized catalog actually changed, to respect the KV
  // write budget. The serialized compare (rather than a change flag) is what
  // lets a redeploy re-seed a previously polluted KV: even with no price move,
  // the curated membership and order differ from the drifted value and land
  // exactly once, then stay byte-stable.
  if (!existingPricing || JSON.stringify(existingPricing) !== JSON.stringify(pricing)) {
    result.modelsChanged = true;
    await env.TENSORFEED_CACHE.put('models', JSON.stringify(pricing), {
      metadata: { updatedAt: new Date().toISOString() },
    });
    // Keep the legacy key in sync for backwards compatibility during migration.
    await env.TENSORFEED_CACHE.put('pricing', JSON.stringify(pricing), {
      metadata: { updatedAt: new Date().toISOString() },
    });
    console.log('Models KV updated (curated baseline + LiteLLM prices)');
  }

  // --- 2. Benchmarks ---
  // Benchmark scores are editorial: BASELINE_BENCHMARKS is the single source of
  // truth (it mirrors data/benchmarks.json, enforced by
  // catalog-benchmarks-sync.test.ts). Adopt the baseline wholesale so model
  // additions, score revisions, and the lastUpdated date all propagate on
  // redeploy, not just models absent from KV (the old backfill only added
  // missing models, so a re-synced baseline with edited scores never landed).
  // No third-party leaderboard writes this key, so the baseline is canonical.
  // Write only when the serialized value changed, to respect the KV write budget.
  const existingBenchmarks = await env.TENSORFEED_CACHE.get('benchmarks', 'json') as BenchmarksData | null;
  const benchmarks = BASELINE_BENCHMARKS;
  result.benchmarkModelCount = benchmarks.models.length;
  if (!existingBenchmarks || JSON.stringify(existingBenchmarks) !== JSON.stringify(benchmarks)) {
    result.benchmarksChanged = true;
    await env.TENSORFEED_CACHE.put('benchmarks', JSON.stringify(benchmarks), {
      metadata: { updatedAt: new Date().toISOString() },
    });
    console.log('Benchmarks KV updated from baseline');
  }

  // --- 3. Agents directory: baseline is canonical (mirrors
  // data/agents-directory.json, guarded by catalog-agents-sync.test.ts), so
  // adopt it wholesale like benchmarks above instead of the old seed-if-empty
  // logic. Seed-only meant directory edits (a rebrand, a new agent like Gemini
  // Spark) never reached /api/agents after the first seed; adopting the baseline
  // lets additions and revisions propagate on redeploy. No other writer touches
  // this key, so the baseline is the single source of truth. Write only on a
  // serialized change, to respect the KV write budget.
  const existingAgents = await env.TENSORFEED_CACHE.get('agents-directory', 'json') as AgentsData | null;
  const agents = BASELINE_AGENTS;
  result.agentCount = agents.agents.length;
  if (!existingAgents || JSON.stringify(existingAgents) !== JSON.stringify(agents)) {
    await env.TENSORFEED_CACHE.put('agents-directory', JSON.stringify(agents), {
      metadata: { updatedAt: new Date().toISOString() },
    });
    console.log('Agents directory KV updated from baseline');
  }

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
    await pingIndexNow(env, CATALOG_CHANGE_URLS, 'catalog-update');
  }

  console.log(
    `Daily update complete: ${result.modelCount} models, ${result.benchmarkModelCount} benchmark entries, ${result.agentCount} agents` +
    ` | models ${result.modelsChanged ? 'UPDATED' : 'unchanged'}, benchmarks ${result.benchmarksChanged ? 'UPDATED' : 'unchanged'}`
  );

  return result;
}

// Keep the old export name for backwards compat with /api/refresh
export { updateDailyData as updateCatalog };
