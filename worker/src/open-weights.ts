/**
 * Open-weights model deployment registry.
 *
 * Production-ready open-weights models with the data an agent needs to
 * actually self-host: quantization options (FP16, FP8, AWQ Q4, GGUF
 * Q4_K_M, etc), VRAM requirement per quantization, recommended GPU,
 * Hugging Face URL, and license.
 *
 * Different from /api/inference-providers (which is hosted pricing
 * across third parties) and /api/models (which is first-party model
 * pricing). This is the "I want to run this myself" surface.
 *
 * Editorial; refreshed on redeploy.
 *
 * Served at /api/open-weights (free, cached 600s).
 */

export interface QuantizationOption {
  /** Quantization id: fp16, fp8, awq, gptq, gguf-q8, gguf-q5, gguf-q4 etc. */
  id: string;
  /** Display name, e.g. "FP8", "AWQ INT4", "GGUF Q4_K_M". */
  name: string;
  /** VRAM required to load + run, in GB. */
  vramGB: number;
  /** Quality vs FP16 baseline (0-100, where FP16 = 100). */
  quality: number;
  /** Recommended GPU class (1x A100-80GB, 2x H100, etc). */
  recommendedGpu: string;
  /** Notes on the quant (e.g. "best quality", "single-GPU fit", "edge-device"). */
  notes: string;
}

export interface OpenWeightModel {
  id: string;
  name: string;
  family: string;
  /** Active parameter count when MoE. */
  activeParamsB: number | null;
  /** Total parameter count. */
  totalParamsB: number;
  contextWindow: number;
  released: string;
  license: string;
  /** Hugging Face URL. */
  hfUrl: string;
  /** Vendor announcement URL. */
  url: string;
  /** Capabilities: text, vision, tool-use, function-calling. */
  capabilities: string[];
  /** Editorial notes on what to use this for. */
  notes: string;
  /** List of quantizations actually available for this model. */
  quantizations: QuantizationOption[];
}

export const OPEN_WEIGHTS_CATALOG: OpenWeightModel[] = [
  {
    id: 'llama-4-maverick',
    name: 'Llama 4 Maverick',
    family: 'Meta',
    activeParamsB: 17,
    totalParamsB: 400,
    contextWindow: 1000000,
    released: '2026-04',
    license: 'Llama 4 Community License',
    hfUrl: 'https://huggingface.co/meta-llama/Llama-4-Maverick-17B-128E-Instruct',
    url: 'https://ai.meta.com/blog/llama-4/',
    capabilities: ['text', 'vision', 'tool-use', 'function-calling'],
    notes: 'Meta flagship MoE. 17B active / 400B total. 1M context. Vision-native. Best fit for organizations that have multi-H100 / B200 capacity.',
    quantizations: [
      { id: 'fp16', name: 'FP16',         vramGB: 800, quality: 100, recommendedGpu: '8x H200',     notes: 'Full precision, multi-node typical' },
      { id: 'fp8',  name: 'FP8',          vramGB: 410, quality: 99,  recommendedGpu: '4x H200',     notes: 'Production default; minimal quality loss' },
      { id: 'awq',  name: 'AWQ INT4',     vramGB: 215, quality: 96,  recommendedGpu: '2x H100-80GB',notes: 'Fits on 2-GPU node' },
      { id: 'gguf-q4', name: 'GGUF Q4_K_M', vramGB: 240, quality: 94, recommendedGpu: '1x B200',    notes: 'CPU/GPU offload via llama.cpp' },
    ],
  },
  {
    id: 'llama-4-scout',
    name: 'Llama 4 Scout',
    family: 'Meta',
    activeParamsB: 17,
    totalParamsB: 109,
    contextWindow: 10000000,
    released: '2026-04',
    license: 'Llama 4 Community License',
    hfUrl: 'https://huggingface.co/meta-llama/Llama-4-Scout-17B-16E-Instruct',
    url: 'https://ai.meta.com/blog/llama-4/',
    capabilities: ['text', 'vision', 'tool-use', 'function-calling'],
    notes: 'Smaller Llama 4 sibling. 17B active / 109B total. 10M context (industry record). Vision-native. The default open-weights agent choice.',
    quantizations: [
      { id: 'fp16',     name: 'FP16',         vramGB: 220, quality: 100, recommendedGpu: '4x H100-80GB', notes: 'Multi-GPU fit' },
      { id: 'fp8',      name: 'FP8',          vramGB: 115, quality: 99,  recommendedGpu: '2x H100-80GB', notes: 'Production default' },
      { id: 'awq',      name: 'AWQ INT4',     vramGB: 60,  quality: 96,  recommendedGpu: '1x H100-80GB', notes: 'Single-GPU production fit' },
      { id: 'gguf-q4',  name: 'GGUF Q4_K_M',  vramGB: 65,  quality: 94,  recommendedGpu: '1x A100-80GB', notes: 'llama.cpp / Ollama' },
      { id: 'gguf-q3',  name: 'GGUF Q3_K_M',  vramGB: 50,  quality: 89,  recommendedGpu: '1x RTX 6000',  notes: 'Edge-device deploys' },
    ],
  },
  {
    id: 'deepseek-v4-pro',
    name: 'DeepSeek V4 Pro',
    family: 'DeepSeek',
    activeParamsB: 37,
    totalParamsB: 1600,
    contextWindow: 1000000,
    released: '2026-04',
    license: 'MIT',
    hfUrl: 'https://huggingface.co/deepseek-ai/DeepSeek-V4-Pro',
    url: 'https://www.deepseek.com',
    capabilities: ['text', 'tool-use', 'function-calling'],
    notes: 'MIT-licensed frontier MoE. 37B active / 1.6T total. The first truly open frontier model. Self-hosting requires serious compute; most deploy via DeepSeek API at $0.21 blended.',
    quantizations: [
      { id: 'fp16',     name: 'FP16',         vramGB: 3200, quality: 100, recommendedGpu: '8x B200 cluster',    notes: 'Reference precision' },
      { id: 'fp8',      name: 'FP8',          vramGB: 1640, quality: 99,  recommendedGpu: '8x H200',            notes: 'Production self-host minimum' },
      { id: 'awq',      name: 'AWQ INT4',     vramGB: 850,  quality: 95,  recommendedGpu: '8x H100-80GB',       notes: 'Quantized self-host' },
      { id: 'gguf-q4',  name: 'GGUF Q4_K_M',  vramGB: 920,  quality: 93,  recommendedGpu: '8x H100-80GB',       notes: 'llama.cpp; rare in production' },
    ],
  },
  {
    id: 'deepseek-v4-flash',
    name: 'DeepSeek V4 Flash',
    family: 'DeepSeek',
    activeParamsB: 9,
    totalParamsB: 70,
    contextWindow: 130000,
    released: '2026-04',
    license: 'MIT',
    hfUrl: 'https://huggingface.co/deepseek-ai/DeepSeek-V4-Flash',
    url: 'https://www.deepseek.com',
    capabilities: ['text', 'tool-use', 'function-calling'],
    notes: 'Cheap DeepSeek tier. MIT-licensed. Easy single-GPU fit when quantized. The default cost-sensitive open agent base model in 2026.',
    quantizations: [
      { id: 'fp16',     name: 'FP16',         vramGB: 140, quality: 100, recommendedGpu: '2x H100-80GB', notes: 'Reference' },
      { id: 'fp8',      name: 'FP8',          vramGB: 75,  quality: 99,  recommendedGpu: '1x H100-80GB', notes: 'Single-GPU production' },
      { id: 'awq',      name: 'AWQ INT4',     vramGB: 40,  quality: 96,  recommendedGpu: '1x A100-80GB', notes: 'Cheaper GPU class' },
      { id: 'gguf-q4',  name: 'GGUF Q4_K_M',  vramGB: 45,  quality: 94,  recommendedGpu: '1x RTX 6000',  notes: 'Workstation deploys' },
      { id: 'gguf-q4-cpu', name: 'GGUF Q4_K_M (CPU offload)', vramGB: 16, quality: 94, recommendedGpu: 'CPU + 16GB RAM', notes: 'Slow but works on consumer laptop' },
    ],
  },
  {
    id: 'qwen-2.5-72b',
    name: 'Qwen 2.5 72B Instruct',
    family: 'Alibaba',
    activeParamsB: 72,
    totalParamsB: 72,
    contextWindow: 130000,
    released: '2024-09',
    license: 'Qwen License',
    hfUrl: 'https://huggingface.co/Qwen/Qwen2.5-72B-Instruct',
    url: 'https://qwenlm.github.io',
    capabilities: ['text', 'tool-use', 'function-calling', 'multilingual'],
    notes: 'Strong multilingual (29 languages). Solid coding performance. Workhorse alternative to Llama 4 Scout for organizations that prefer dense over MoE.',
    quantizations: [
      { id: 'fp16',    name: 'FP16',        vramGB: 145, quality: 100, recommendedGpu: '2x H100-80GB', notes: 'Reference precision' },
      { id: 'fp8',     name: 'FP8',         vramGB: 75,  quality: 99,  recommendedGpu: '1x H100-80GB', notes: 'Single-GPU fit' },
      { id: 'awq',     name: 'AWQ INT4',    vramGB: 40,  quality: 96,  recommendedGpu: '1x A100-80GB', notes: 'Cheaper GPU' },
      { id: 'gguf-q4', name: 'GGUF Q4_K_M', vramGB: 45,  quality: 94,  recommendedGpu: '1x RTX 6000',  notes: 'Workstation' },
    ],
  },
  {
    id: 'mixtral-8x22b',
    name: 'Mixtral 8x22B Instruct',
    family: 'Mistral',
    activeParamsB: 39,
    totalParamsB: 141,
    contextWindow: 65536,
    released: '2024-04',
    license: 'Apache-2.0',
    hfUrl: 'https://huggingface.co/mistralai/Mixtral-8x22B-Instruct-v0.1',
    url: 'https://mistral.ai/news/mixtral-8x22b/',
    capabilities: ['text', 'tool-use', 'function-calling', 'multilingual'],
    notes: 'Apache-2.0 MoE; the cleanest open license in the catalog. Older but battle-tested. Strong fit for production deployments where license clarity matters.',
    quantizations: [
      { id: 'fp16',    name: 'FP16',        vramGB: 282, quality: 100, recommendedGpu: '4x H100-80GB', notes: 'Multi-GPU' },
      { id: 'fp8',     name: 'FP8',         vramGB: 145, quality: 99,  recommendedGpu: '2x H100-80GB', notes: 'Production' },
      { id: 'awq',     name: 'AWQ INT4',    vramGB: 75,  quality: 95,  recommendedGpu: '1x H100-80GB', notes: 'Single-GPU fit' },
      { id: 'gguf-q4', name: 'GGUF Q4_K_M', vramGB: 80,  quality: 93,  recommendedGpu: '1x A100-80GB', notes: 'llama.cpp' },
    ],
  },
  {
    id: 'gemma-3-27b',
    name: 'Gemma 3 27B Instruct',
    family: 'Google',
    activeParamsB: 27,
    totalParamsB: 27,
    contextWindow: 128000,
    released: '2025-11',
    license: 'Gemma Terms of Use',
    hfUrl: 'https://huggingface.co/google/gemma-3-27b-it',
    url: 'https://blog.google/technology/developers/gemma-3/',
    capabilities: ['text', 'vision', 'tool-use', 'multilingual'],
    notes: 'Google open model with native vision. 140 languages. Light fine-tune target; strong base for domain-specific agents.',
    quantizations: [
      { id: 'fp16',    name: 'FP16',        vramGB: 54, quality: 100, recommendedGpu: '1x H100-80GB',  notes: 'Single-GPU FP16' },
      { id: 'fp8',     name: 'FP8',         vramGB: 28, quality: 99,  recommendedGpu: '1x A100-40GB',  notes: 'Cheaper GPU' },
      { id: 'awq',     name: 'AWQ INT4',    vramGB: 16, quality: 96,  recommendedGpu: '1x RTX 4090',   notes: 'Consumer GPU' },
      { id: 'gguf-q4', name: 'GGUF Q4_K_M', vramGB: 18, quality: 94,  recommendedGpu: '1x RTX 4090',   notes: 'llama.cpp/Ollama' },
    ],
  },
  {
    id: 'llama-3.3-70b',
    name: 'Llama 3.3 70B Instruct',
    family: 'Meta',
    activeParamsB: 70,
    totalParamsB: 70,
    contextWindow: 128000,
    released: '2024-12',
    license: 'Llama 3.3 Community License',
    hfUrl: 'https://huggingface.co/meta-llama/Llama-3.3-70B-Instruct',
    url: 'https://ai.meta.com/blog/meta-llama-3-3/',
    capabilities: ['text', 'tool-use', 'function-calling', 'multilingual'],
    notes: 'Late-2024 dense Llama. Stronger than Llama 3.1 70B at the same parameter count. Workhorse before Llama 4 Scout took over in 2026.',
    quantizations: [
      { id: 'fp16',    name: 'FP16',        vramGB: 140, quality: 100, recommendedGpu: '2x H100-80GB', notes: 'Reference' },
      { id: 'fp8',     name: 'FP8',         vramGB: 75,  quality: 99,  recommendedGpu: '1x H100-80GB', notes: 'Single-GPU' },
      { id: 'awq',     name: 'AWQ INT4',    vramGB: 40,  quality: 96,  recommendedGpu: '1x A100-80GB', notes: 'Cheaper GPU' },
      { id: 'gguf-q4', name: 'GGUF Q4_K_M', vramGB: 45,  quality: 94,  recommendedGpu: '1x RTX 6000',  notes: 'Workstation' },
    ],
  },
  {
    id: 'phi-4',
    name: 'Phi-4',
    family: 'Microsoft',
    activeParamsB: 14,
    totalParamsB: 14,
    contextWindow: 16384,
    released: '2024-12',
    license: 'MIT',
    hfUrl: 'https://huggingface.co/microsoft/phi-4',
    url: 'https://techcommunity.microsoft.com/blog/aiplatformblog/introducing-phi-4',
    capabilities: ['text', 'tool-use'],
    notes: 'MIT-licensed 14B with strong math performance for its size. Fits in consumer-grade VRAM. Good fit for on-device or edge agents.',
    quantizations: [
      { id: 'fp16',    name: 'FP16',        vramGB: 28, quality: 100, recommendedGpu: '1x A100-40GB', notes: 'Reference' },
      { id: 'fp8',     name: 'FP8',         vramGB: 15, quality: 99,  recommendedGpu: '1x RTX 4090',  notes: 'Consumer-GPU' },
      { id: 'awq',     name: 'AWQ INT4',    vramGB: 8,  quality: 96,  recommendedGpu: '1x RTX 3090',  notes: 'Older consumer GPU' },
      { id: 'gguf-q4', name: 'GGUF Q4_K_M', vramGB: 9,  quality: 94,  recommendedGpu: '1x RTX 3090',  notes: 'Edge / Mac M-series' },
    ],
  },
];

export const OPEN_WEIGHTS_LAST_UPDATED = '2026-04-30';
