/**
 * Inference provider pricing matrix.
 *
 * Same open-weight model, different price across hosted inference
 * providers. The model-providers' own APIs (Anthropic, OpenAI, Google)
 * are already in /api/models. This module covers the third-party
 * inference layer: Together, Fireworks, Groq, DeepInfra, OpenRouter,
 * Replicate, Anyscale, Hugging Face Inference.
 *
 * Agents picking the cheapest path for Llama 4 Scout / DeepSeek V4 /
 * Mixtral can call /api/inference-providers/cheapest?model=... and get
 * the lowest blended price across all tracked providers.
 *
 * Editorial data, refreshed by hand on redeploy when providers change
 * pricing. Provider pricing changes more often than embedding pricing
 * (weeks not months), so a weekly refresh routine fits this surface.
 *
 * Served at /api/inference-providers (free, cached 600s).
 */

export interface ProviderOffer {
  provider: string;
  /** The provider's own model id, may differ from canonical (e.g. "meta-llama/Llama-3.1-70B-Instruct"). */
  providerModelId: string;
  /** Price per 1M input tokens, USD. */
  inputPrice: number;
  /** Price per 1M output tokens, USD. */
  outputPrice: number;
  /** Blended assuming 1:1 in/out (for cheapest-by-blended sort). */
  blendedPrice: number;
  /** Context window the provider serves this model with. */
  contextWindow: number;
  /** Output tokens per second (provider-published or measured). */
  outputTPS: number | null;
  /** Notable feature flags (function calling, tool use, vision, json mode). */
  features: string[];
  /** Direct URL to provider docs for this model. */
  url: string;
  /** Pricing-tier note (e.g. "free during beta", "spot tier", etc). */
  note: string;
}

export interface ModelMatrix {
  /** Canonical model id we use across TensorFeed. */
  modelId: string;
  /** Display name. */
  modelName: string;
  /** Origin lab (Meta, DeepSeek, etc) — for grouping in the UI. */
  family: string;
  /** Parameter count, in billions, for sorting. */
  paramsB: number | null;
  /** License (Llama 3 Community, MIT, Apache-2.0, etc). */
  license: string;
  /** Open-weights flag. False here means the model is closed source but is hosted by multiple inference providers (rare; Mixtral instruct used to fall here). */
  openWeights: boolean;
  /** Sorted list of provider offers for this model. */
  offers: ProviderOffer[];
}

export const INFERENCE_MATRIX: ModelMatrix[] = [
  // ── Meta Llama 4 ─────────────────────────────────────────
  {
    modelId: 'llama-4-maverick',
    modelName: 'Llama 4 Maverick',
    family: 'Meta',
    paramsB: 400,
    license: 'Llama 4 Community License',
    openWeights: true,
    offers: [
      { provider: 'Together AI', providerModelId: 'meta-llama/Llama-4-Maverick-Instruct', inputPrice: 0.50, outputPrice: 1.50, blendedPrice: 1.00, contextWindow: 1000000, outputTPS: 145, features: ['function-calling', 'json-mode', 'vision'], url: 'https://www.together.ai/pricing', note: '' },
      { provider: 'Fireworks', providerModelId: 'accounts/fireworks/models/llama4-maverick', inputPrice: 0.55, outputPrice: 1.65, blendedPrice: 1.10, contextWindow: 1000000, outputTPS: 130, features: ['function-calling', 'json-mode', 'vision'], url: 'https://fireworks.ai/pricing', note: '' },
      { provider: 'DeepInfra', providerModelId: 'meta-llama/Llama-4-Maverick', inputPrice: 0.45, outputPrice: 1.40, blendedPrice: 0.925, contextWindow: 1000000, outputTPS: 110, features: ['function-calling', 'vision'], url: 'https://deepinfra.com/pricing', note: '' },
      { provider: 'Groq', providerModelId: 'llama-4-maverick', inputPrice: 0.59, outputPrice: 1.79, blendedPrice: 1.19, contextWindow: 128000, outputTPS: 720, features: ['function-calling', 'json-mode', 'vision'], url: 'https://groq.com/pricing', note: 'Highest TPS in the matrix; 128k context cap' },
      { provider: 'OpenRouter', providerModelId: 'meta-llama/llama-4-maverick', inputPrice: 0.49, outputPrice: 1.49, blendedPrice: 0.99, contextWindow: 1000000, outputTPS: null, features: ['function-calling', 'vision'], url: 'https://openrouter.ai/meta-llama/llama-4-maverick', note: 'Routes across multiple providers automatically' },
    ],
  },
  {
    modelId: 'llama-4-scout',
    modelName: 'Llama 4 Scout',
    family: 'Meta',
    paramsB: 109,
    license: 'Llama 4 Community License',
    openWeights: true,
    offers: [
      { provider: 'Together AI', providerModelId: 'meta-llama/Llama-4-Scout-Instruct', inputPrice: 0.18, outputPrice: 0.59, blendedPrice: 0.385, contextWindow: 10000000, outputTPS: 195, features: ['function-calling', 'json-mode', 'vision'], url: 'https://www.together.ai/pricing', note: '' },
      { provider: 'Fireworks', providerModelId: 'accounts/fireworks/models/llama4-scout', inputPrice: 0.20, outputPrice: 0.60, blendedPrice: 0.40, contextWindow: 10000000, outputTPS: 180, features: ['function-calling', 'json-mode', 'vision'], url: 'https://fireworks.ai/pricing', note: '' },
      { provider: 'DeepInfra', providerModelId: 'meta-llama/Llama-4-Scout', inputPrice: 0.16, outputPrice: 0.55, blendedPrice: 0.355, contextWindow: 10000000, outputTPS: 170, features: ['function-calling', 'vision'], url: 'https://deepinfra.com/pricing', note: '' },
      { provider: 'Groq', providerModelId: 'llama-4-scout', inputPrice: 0.18, outputPrice: 0.59, blendedPrice: 0.385, contextWindow: 128000, outputTPS: 950, features: ['function-calling', 'json-mode', 'vision'], url: 'https://groq.com/pricing', note: 'Highest TPS in the matrix; 128k context cap' },
      { provider: 'OpenRouter', providerModelId: 'meta-llama/llama-4-scout', inputPrice: 0.18, outputPrice: 0.59, blendedPrice: 0.385, contextWindow: 10000000, outputTPS: null, features: ['function-calling', 'vision'], url: 'https://openrouter.ai/meta-llama/llama-4-scout', note: '' },
      { provider: 'Replicate', providerModelId: 'meta/llama-4-scout', inputPrice: 0.20, outputPrice: 0.65, blendedPrice: 0.425, contextWindow: 10000000, outputTPS: 95, features: ['function-calling'], url: 'https://replicate.com/meta/llama-4-scout', note: '' },
    ],
  },

  // ── Llama 3.1 (still widely served) ──────────────────────
  {
    modelId: 'llama-3.1-405b',
    modelName: 'Llama 3.1 405B Instruct',
    family: 'Meta',
    paramsB: 405,
    license: 'Llama 3.1 Community License',
    openWeights: true,
    offers: [
      { provider: 'Together AI', providerModelId: 'meta-llama/Meta-Llama-3.1-405B-Instruct-Turbo', inputPrice: 3.50, outputPrice: 3.50, blendedPrice: 3.50, contextWindow: 130000, outputTPS: 70, features: ['function-calling', 'json-mode'], url: 'https://www.together.ai/pricing', note: 'Turbo (FP8) variant' },
      { provider: 'Fireworks', providerModelId: 'accounts/fireworks/models/llama-v3p1-405b-instruct', inputPrice: 3.00, outputPrice: 3.00, blendedPrice: 3.00, contextWindow: 130000, outputTPS: 65, features: ['function-calling', 'json-mode'], url: 'https://fireworks.ai/pricing', note: '' },
      { provider: 'DeepInfra', providerModelId: 'meta-llama/Meta-Llama-3.1-405B-Instruct', inputPrice: 1.79, outputPrice: 1.79, blendedPrice: 1.79, contextWindow: 130000, outputTPS: 50, features: ['function-calling'], url: 'https://deepinfra.com/pricing', note: 'Cheapest 405B host' },
      { provider: 'OpenRouter', providerModelId: 'meta-llama/llama-3.1-405b-instruct', inputPrice: 3.00, outputPrice: 3.00, blendedPrice: 3.00, contextWindow: 130000, outputTPS: null, features: ['function-calling'], url: 'https://openrouter.ai/meta-llama/llama-3.1-405b-instruct', note: '' },
    ],
  },
  {
    modelId: 'llama-3.1-70b',
    modelName: 'Llama 3.1 70B Instruct',
    family: 'Meta',
    paramsB: 70,
    license: 'Llama 3.1 Community License',
    openWeights: true,
    offers: [
      { provider: 'Together AI', providerModelId: 'meta-llama/Meta-Llama-3.1-70B-Instruct-Turbo', inputPrice: 0.88, outputPrice: 0.88, blendedPrice: 0.88, contextWindow: 130000, outputTPS: 165, features: ['function-calling', 'json-mode'], url: 'https://www.together.ai/pricing', note: 'Turbo (FP8) variant' },
      { provider: 'Fireworks', providerModelId: 'accounts/fireworks/models/llama-v3p1-70b-instruct', inputPrice: 0.90, outputPrice: 0.90, blendedPrice: 0.90, contextWindow: 130000, outputTPS: 145, features: ['function-calling', 'json-mode'], url: 'https://fireworks.ai/pricing', note: '' },
      { provider: 'DeepInfra', providerModelId: 'meta-llama/Meta-Llama-3.1-70B-Instruct', inputPrice: 0.35, outputPrice: 0.40, blendedPrice: 0.375, contextWindow: 130000, outputTPS: 95, features: ['function-calling'], url: 'https://deepinfra.com/pricing', note: 'Cheapest 70B host' },
      { provider: 'Groq', providerModelId: 'llama-3.1-70b-versatile', inputPrice: 0.59, outputPrice: 0.79, blendedPrice: 0.69, contextWindow: 130000, outputTPS: 280, features: ['function-calling', 'json-mode'], url: 'https://groq.com/pricing', note: '' },
      { provider: 'OpenRouter', providerModelId: 'meta-llama/llama-3.1-70b-instruct', inputPrice: 0.40, outputPrice: 0.40, blendedPrice: 0.40, contextWindow: 130000, outputTPS: null, features: ['function-calling'], url: 'https://openrouter.ai/meta-llama/llama-3.1-70b-instruct', note: '' },
      { provider: 'Anyscale', providerModelId: 'meta-llama/Meta-Llama-3.1-70B-Instruct', inputPrice: 1.00, outputPrice: 1.00, blendedPrice: 1.00, contextWindow: 130000, outputTPS: 110, features: ['function-calling'], url: 'https://www.anyscale.com/pricing', note: '' },
    ],
  },

  // ── DeepSeek V4 ──────────────────────────────────────────
  {
    modelId: 'deepseek-v4-pro',
    modelName: 'DeepSeek V4 Pro',
    family: 'DeepSeek',
    paramsB: 1600,
    license: 'MIT',
    openWeights: true,
    offers: [
      { provider: 'DeepSeek', providerModelId: 'deepseek-chat', inputPrice: 0.14, outputPrice: 0.28, blendedPrice: 0.21, contextWindow: 1000000, outputTPS: 110, features: ['function-calling', 'json-mode'], url: 'https://api-docs.deepseek.com/quick_start/pricing', note: 'First-party API; cheapest path' },
      { provider: 'Together AI', providerModelId: 'deepseek-ai/DeepSeek-V4-Pro', inputPrice: 0.27, outputPrice: 1.10, blendedPrice: 0.685, contextWindow: 1000000, outputTPS: 90, features: ['function-calling', 'json-mode'], url: 'https://www.together.ai/pricing', note: '' },
      { provider: 'Fireworks', providerModelId: 'accounts/fireworks/models/deepseek-v4-pro', inputPrice: 0.30, outputPrice: 1.20, blendedPrice: 0.75, contextWindow: 1000000, outputTPS: 85, features: ['function-calling', 'json-mode'], url: 'https://fireworks.ai/pricing', note: '' },
      { provider: 'OpenRouter', providerModelId: 'deepseek/deepseek-chat', inputPrice: 0.14, outputPrice: 0.28, blendedPrice: 0.21, contextWindow: 1000000, outputTPS: null, features: ['function-calling'], url: 'https://openrouter.ai/deepseek/deepseek-chat', note: 'Routes to first-party DeepSeek' },
    ],
  },
  {
    modelId: 'deepseek-v4-flash',
    modelName: 'DeepSeek V4 Flash',
    family: 'DeepSeek',
    paramsB: 70,
    license: 'MIT',
    openWeights: true,
    offers: [
      { provider: 'DeepSeek', providerModelId: 'deepseek-flash', inputPrice: 0.04, outputPrice: 0.08, blendedPrice: 0.06, contextWindow: 130000, outputTPS: 165, features: ['function-calling', 'json-mode'], url: 'https://api-docs.deepseek.com/quick_start/pricing', note: 'Cheapest hosted inference of any frontier-class model in 2026' },
      { provider: 'Together AI', providerModelId: 'deepseek-ai/DeepSeek-V4-Flash', inputPrice: 0.10, outputPrice: 0.30, blendedPrice: 0.20, contextWindow: 130000, outputTPS: 145, features: ['function-calling', 'json-mode'], url: 'https://www.together.ai/pricing', note: '' },
      { provider: 'Fireworks', providerModelId: 'accounts/fireworks/models/deepseek-v4-flash', inputPrice: 0.12, outputPrice: 0.36, blendedPrice: 0.24, contextWindow: 130000, outputTPS: 130, features: ['function-calling', 'json-mode'], url: 'https://fireworks.ai/pricing', note: '' },
      { provider: 'OpenRouter', providerModelId: 'deepseek/deepseek-flash', inputPrice: 0.04, outputPrice: 0.08, blendedPrice: 0.06, contextWindow: 130000, outputTPS: null, features: ['function-calling'], url: 'https://openrouter.ai/deepseek/deepseek-flash', note: '' },
    ],
  },

  // ── Mistral / Mixtral ───────────────────────────────────
  {
    modelId: 'mixtral-8x22b',
    modelName: 'Mixtral 8x22B Instruct',
    family: 'Mistral',
    paramsB: 141,
    license: 'Apache-2.0',
    openWeights: true,
    offers: [
      { provider: 'Together AI', providerModelId: 'mistralai/Mixtral-8x22B-Instruct-v0.1', inputPrice: 1.20, outputPrice: 1.20, blendedPrice: 1.20, contextWindow: 65536, outputTPS: 90, features: ['function-calling', 'json-mode'], url: 'https://www.together.ai/pricing', note: '' },
      { provider: 'Fireworks', providerModelId: 'accounts/fireworks/models/mixtral-8x22b-instruct', inputPrice: 1.20, outputPrice: 1.20, blendedPrice: 1.20, contextWindow: 65536, outputTPS: 80, features: ['function-calling', 'json-mode'], url: 'https://fireworks.ai/pricing', note: '' },
      { provider: 'DeepInfra', providerModelId: 'mistralai/Mixtral-8x22B-Instruct-v0.1', inputPrice: 0.65, outputPrice: 0.65, blendedPrice: 0.65, contextWindow: 65536, outputTPS: 60, features: ['function-calling'], url: 'https://deepinfra.com/pricing', note: 'Cheapest Mixtral 8x22B host' },
      { provider: 'OpenRouter', providerModelId: 'mistralai/mixtral-8x22b-instruct', inputPrice: 0.65, outputPrice: 0.65, blendedPrice: 0.65, contextWindow: 65536, outputTPS: null, features: ['function-calling'], url: 'https://openrouter.ai/mistralai/mixtral-8x22b-instruct', note: '' },
    ],
  },

  // ── Qwen ────────────────────────────────────────────────
  {
    modelId: 'qwen-2.5-72b',
    modelName: 'Qwen 2.5 72B Instruct',
    family: 'Alibaba',
    paramsB: 72,
    license: 'Qwen License',
    openWeights: true,
    offers: [
      { provider: 'Together AI', providerModelId: 'Qwen/Qwen2.5-72B-Instruct-Turbo', inputPrice: 0.90, outputPrice: 0.90, blendedPrice: 0.90, contextWindow: 130000, outputTPS: 130, features: ['function-calling', 'json-mode'], url: 'https://www.together.ai/pricing', note: 'Turbo (FP8) variant' },
      { provider: 'Fireworks', providerModelId: 'accounts/fireworks/models/qwen2p5-72b-instruct', inputPrice: 0.90, outputPrice: 0.90, blendedPrice: 0.90, contextWindow: 130000, outputTPS: 110, features: ['function-calling', 'json-mode'], url: 'https://fireworks.ai/pricing', note: '' },
      { provider: 'DeepInfra', providerModelId: 'Qwen/Qwen2.5-72B-Instruct', inputPrice: 0.35, outputPrice: 0.40, blendedPrice: 0.375, contextWindow: 130000, outputTPS: 80, features: ['function-calling'], url: 'https://deepinfra.com/pricing', note: 'Cheapest Qwen 72B host' },
      { provider: 'OpenRouter', providerModelId: 'qwen/qwen-2.5-72b-instruct', inputPrice: 0.35, outputPrice: 0.40, blendedPrice: 0.375, contextWindow: 130000, outputTPS: null, features: ['function-calling'], url: 'https://openrouter.ai/qwen/qwen-2.5-72b-instruct', note: '' },
    ],
  },
];

export const INFERENCE_LAST_UPDATED = '2026-04-30';

export const TRACKED_PROVIDERS = [
  'Together AI', 'Fireworks', 'DeepInfra', 'Groq', 'OpenRouter', 'Replicate', 'Anyscale', 'DeepSeek',
];

/**
 * Find the cheapest provider offer for a given model. Returns null if
 * the model is not in the matrix.
 *
 * @param modelId  Canonical model id (e.g. "llama-4-scout")
 * @param sortBy   "blended" (default), "input", "output", or "tps_desc"
 */
export function cheapestForModel(
  modelId: string,
  sortBy: 'blended' | 'input' | 'output' | 'tps_desc' = 'blended',
) {
  const m = INFERENCE_MATRIX.find(x => x.modelId === modelId);
  if (!m) return null;

  const offers = [...m.offers];
  if (sortBy === 'tps_desc') {
    offers.sort((a, b) => (b.outputTPS ?? -Infinity) - (a.outputTPS ?? -Infinity));
  } else if (sortBy === 'input') {
    offers.sort((a, b) => a.inputPrice - b.inputPrice);
  } else if (sortBy === 'output') {
    offers.sort((a, b) => a.outputPrice - b.outputPrice);
  } else {
    offers.sort((a, b) => a.blendedPrice - b.blendedPrice);
  }

  return {
    modelId: m.modelId,
    modelName: m.modelName,
    family: m.family,
    cheapest: offers[0] ?? null,
    top3: offers.slice(0, 3),
    sortBy,
  };
}
