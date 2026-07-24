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
  /**
   * Whether the weights are actually downloadable right now. A model can be
   * announced as open and still not be runnable, which is the difference
   * between a press release and a deployment.
   */
  weightsAvailable: boolean;
  /** ISO date the weights are expected, when weightsAvailable is false. */
  weightsExpected?: string;
  /** Editorial notes on what to use this for. */
  notes: string;
  /** List of quantizations actually available for this model. */
  quantizations: QuantizationOption[];
}

export const OPEN_WEIGHTS_CATALOG: OpenWeightModel[] = [
  {
    id: 'kimi-k3',
    name: 'Kimi K3',
    family: 'Moonshot',
    activeParamsB: 50,
    totalParamsB: 2800,
    contextWindow: 1000000,
    released: '2026-07',
    license: 'Modified MIT',
    hfUrl: 'https://huggingface.co/moonshotai/Kimi-K3',
    url: 'https://moonshot.ai',
    capabilities: ['text', 'vision', 'tool-use', 'function-calling'],
    weightsAvailable: false,
    weightsExpected: '2026-07-27',
    notes: 'Largest open-weight model ever shipped. 896 experts with roughly 16 active per token, so only about 1.8 percent of the network fires on any given token. Ranks third on the Artificial Analysis Intelligence Index behind Fable 5 and GPT-5.6 Sol. Released as an API on July 16 with weights promised July 27. Ships natively in MXFP4, so there is no FP16 checkpoint to download. Downloadable does not mean runnable here: this needs a rack, not a workstation.',
    quantizations: [
      { id: 'mxfp4',   name: 'MXFP4 (native)', vramGB: 1450, quality: 100, recommendedGpu: '8x B200',        notes: 'Moonshot ships this format; it is the reference, not a downgrade' },
      { id: 'gguf-q3', name: 'GGUF Q3_K_M',    vramGB: 1120, quality: 88,  recommendedGpu: '8x H200',        notes: 'Community requant below native precision' },
      { id: 'gguf-q2', name: 'GGUF Q2_K',      vramGB: 760,  quality: 79,  recommendedGpu: '8x H100-80GB',   notes: 'Heavy quality loss; experimental only' },
    ],
  },
  {
    id: 'glm-5.2',
    name: 'GLM-5.2',
    family: 'Zhipu',
    activeParamsB: 40,
    totalParamsB: 753,
    contextWindow: 1000000,
    released: '2026-06',
    license: 'MIT',
    hfUrl: 'https://huggingface.co/zai-org/GLM-5.2',
    url: 'https://z.ai',
    capabilities: ['text', 'tool-use', 'function-calling'],
    weightsAvailable: true,
    notes: 'The strongest open-weights coding model by benchmark: 62.1 on SWE-bench Pro, above GPT-5.5 at 58.6. Plain MIT with no field-of-use carve-outs, which is rarer than the open-weights label suggests. IndexShare sparse attention keeps 1M-context inference affordable. The best license-to-capability ratio in this catalog.',
    quantizations: [
      { id: 'fp16',    name: 'FP16',        vramGB: 1550, quality: 100, recommendedGpu: '8x B200',      notes: 'Reference precision' },
      { id: 'fp8',     name: 'FP8',         vramGB: 800,  quality: 99,  recommendedGpu: '8x H200',      notes: 'Production default' },
      { id: 'awq',     name: 'AWQ INT4',    vramGB: 400,  quality: 95,  recommendedGpu: '4x H200',      notes: 'Cheapest serious self-host' },
      { id: 'gguf-q4', name: 'GGUF Q4_K_M', vramGB: 425,  quality: 93,  recommendedGpu: '4x H200',      notes: 'llama.cpp path' },
    ],
  },
  {
    id: 'longcat-2.0',
    name: 'LongCat-2.0',
    family: 'Meituan',
    activeParamsB: 45,
    totalParamsB: 1600,
    contextWindow: 1000000,
    released: '2026-06',
    license: 'MIT',
    hfUrl: 'https://huggingface.co/meituan-longcat/LongCat-2.0',
    url: 'https://longcat.ai',
    capabilities: ['text', 'tool-use', 'function-calling'],
    weightsAvailable: true,
    notes: 'MIT-licensed 1.6T MoE with dynamic activation of 33 to 56B per token, purpose-built for agentic coding. The first trillion-parameter model trained and served entirely on a 50,000-card domestic Chinese cluster. Meituan self-reports 59.5 on SWE-Bench Pro; independent verification is still pending, so treat the number as vendor-supplied.',
    quantizations: [
      { id: 'fp16',    name: 'FP16',        vramGB: 3300, quality: 100, recommendedGpu: '16x B200 (multi-node)', notes: 'Reference precision' },
      { id: 'fp8',     name: 'FP8',         vramGB: 1690, quality: 99,  recommendedGpu: '8x B200',               notes: 'Production self-host minimum' },
      { id: 'awq',     name: 'AWQ INT4',    vramGB: 870,  quality: 95,  recommendedGpu: '8x H200',               notes: 'Quantized self-host' },
      { id: 'gguf-q4', name: 'GGUF Q4_K_M', vramGB: 940,  quality: 93,  recommendedGpu: '8x H200',               notes: 'llama.cpp; uncommon at this size' },
    ],
  },
  {
    id: 'minimax-m3',
    name: 'MiniMax M3',
    family: 'MiniMax',
    activeParamsB: 23,
    totalParamsB: 428,
    contextWindow: 1000000,
    released: '2026-06',
    license: 'MiniMax Community (commercial restrictions)',
    hfUrl: 'https://huggingface.co/MiniMaxAI/MiniMax-M3',
    url: 'https://www.minimax.io',
    capabilities: ['text', 'vision', 'video', 'tool-use', 'function-calling'],
    weightsAvailable: true,
    notes: 'Sparse-attention MoE with native image and video input. Loosened from the M2.7 terms, which banned commercial use outright without written permission, but this is still a custom community license and not Apache or MIT. Read it before you build a business on it. The most capable open multimodal option at a size a small cluster can actually hold.',
    quantizations: [
      { id: 'fp16',    name: 'FP16',        vramGB: 880, quality: 100, recommendedGpu: '8x H200',      notes: 'Reference precision' },
      { id: 'fp8',     name: 'FP8',         vramGB: 450, quality: 99,  recommendedGpu: '4x H200',      notes: 'Production default' },
      { id: 'awq',     name: 'AWQ INT4',    vramGB: 230, quality: 95,  recommendedGpu: '2x H200',      notes: 'Two-GPU fit' },
      { id: 'gguf-q4', name: 'GGUF Q4_K_M', vramGB: 245, quality: 93,  recommendedGpu: '2x H200',      notes: 'llama.cpp path' },
    ],
  },
  {
    id: 'nemotron-3-ultra',
    name: 'Nemotron 3 Ultra 550B-A55B',
    family: 'NVIDIA',
    activeParamsB: 55,
    totalParamsB: 550,
    contextWindow: 262144,
    released: '2026-06',
    license: 'NVIDIA Open Model License',
    hfUrl: 'https://huggingface.co/nvidia/NVIDIA-Nemotron-3-Ultra-550B-A55B-BF16',
    url: 'https://developer.nvidia.com/nemotron',
    capabilities: ['text', 'tool-use', 'function-calling', 'multilingual'],
    weightsAvailable: true,
    notes: 'NVIDIA\'s own flagship open model and the largest American open-weight release. Nemotron-H hybrid Mamba and Transformer architecture with 512 routed experts activating 22 per token, 256K context. NVIDIA publishes first-party BF16 and NVFP4 checkpoints, and the NVFP4 path is the point: 4-bit inference designed for Blackwell tensor cores rather than a community requant. The company that convened the July 2026 open-weights coalition letter ships a frontier-class open model itself.',
    quantizations: [
      { id: 'bf16',  name: 'BF16',            vramGB: 1150, quality: 100, recommendedGpu: '8x B200',      notes: 'Official NVIDIA checkpoint' },
      { id: 'fp8',   name: 'FP8',             vramGB: 590,  quality: 99,  recommendedGpu: '8x H200',      notes: 'Production default' },
      { id: 'nvfp4', name: 'NVFP4 (native 4-bit)', vramGB: 295, quality: 96, recommendedGpu: '4x H200',  notes: 'Official NVIDIA 4-bit; full speedup needs Blackwell' },
    ],
  },
  {
    id: 'nemotron-3-super',
    name: 'Nemotron 3 Super 120B-A12B',
    family: 'NVIDIA',
    activeParamsB: 12,
    totalParamsB: 120,
    contextWindow: 262144,
    released: '2026-03',
    license: 'NVIDIA Open Model License',
    hfUrl: 'https://huggingface.co/nvidia/NVIDIA-Nemotron-3-Super-120B-A12B-BF16',
    url: 'https://developer.nvidia.com/nemotron',
    capabilities: ['text', 'tool-use', 'function-calling', 'multilingual'],
    weightsAvailable: true,
    notes: 'The most downloaded model in the Nemotron 3 family and the sweet spot of the catalog: 120B total but only 12B active per token, so throughput tracks a small model while quality tracks a large one. 256K context. Quantized to NVFP4 it fits on a single 80GB card, which makes it the most accessible agentic model at this capability tier. Permissive enough for commercial self-hosting.',
    quantizations: [
      { id: 'bf16',  name: 'BF16',            vramGB: 250, quality: 100, recommendedGpu: '4x H100-80GB', notes: 'Official NVIDIA checkpoint' },
      { id: 'fp8',   name: 'FP8',             vramGB: 130, quality: 99,  recommendedGpu: '2x H100-80GB', notes: 'Official NVIDIA checkpoint' },
      { id: 'nvfp4', name: 'NVFP4 (native 4-bit)', vramGB: 68, quality: 96, recommendedGpu: '1x H100-80GB', notes: 'Single-GPU production fit' },
    ],
  },
  {
    id: 'nemotron-3-nano',
    name: 'Nemotron 3 Nano 30B-A3B',
    family: 'NVIDIA',
    activeParamsB: 3,
    totalParamsB: 30,
    contextWindow: 262144,
    released: '2025-12',
    license: 'NVIDIA Open Model License',
    hfUrl: 'https://huggingface.co/nvidia/NVIDIA-Nemotron-3-Nano-30B-A3B-BF16',
    url: 'https://developer.nvidia.com/nemotron',
    capabilities: ['text', 'tool-use', 'function-calling', 'multilingual'],
    weightsAvailable: true,
    notes: 'The workstation entry point. 30B total with 3B active across 128 experts, yet it keeps the full 256K context of its larger siblings. At NVFP4 it runs on a single consumer 24GB card, which makes it the cheapest way to put a modern long-context agent on hardware you already own. An Omni variant adds vision and audio.',
    quantizations: [
      { id: 'bf16',  name: 'BF16',            vramGB: 64, quality: 100, recommendedGpu: '1x H100-80GB', notes: 'Official NVIDIA checkpoint' },
      { id: 'fp8',   name: 'FP8',             vramGB: 34, quality: 99,  recommendedGpu: '1x A100-40GB', notes: 'Official NVIDIA checkpoint' },
      { id: 'nvfp4', name: 'NVFP4 (native 4-bit)', vramGB: 18, quality: 96, recommendedGpu: '1x RTX 4090', notes: 'Consumer-GPU fit' },
      { id: 'gguf-q4', name: 'GGUF Q4_K_M',   vramGB: 19, quality: 93,  recommendedGpu: '1x RTX 4090',  notes: 'llama.cpp / Ollama' },
    ],
  },
  {
    id: 'command-a-plus',
    name: 'Command A+',
    family: 'Cohere',
    activeParamsB: 25,
    totalParamsB: 218,
    contextWindow: 128000,
    released: '2026-05',
    license: 'Apache-2.0',
    hfUrl: 'https://huggingface.co/CohereLabs/command-a-plus-05-2026-bf16',
    url: 'https://cohere.com',
    capabilities: ['text', 'tool-use', 'function-calling', 'multilingual'],
    weightsAvailable: true,
    notes: 'Apache-2.0 MoE from an American lab, which makes it the cleanest license-plus-jurisdiction combination in the catalog for regulated buyers. Cohere publishes official bf16, FP8, and w4a4 checkpoints, so the quantizations below are first-party rather than community requants. Strong RAG and enterprise retrieval fit.',
    quantizations: [
      { id: 'bf16',    name: 'BF16',        vramGB: 460, quality: 100, recommendedGpu: '8x H100-80GB', notes: 'Official Cohere checkpoint' },
      { id: 'fp8',     name: 'FP8',         vramGB: 235, quality: 99,  recommendedGpu: '4x H100-80GB', notes: 'Official Cohere checkpoint' },
      { id: 'w4a4',    name: 'W4A4',        vramGB: 120, quality: 94,  recommendedGpu: '2x H100-80GB', notes: 'Official 4-bit weight and activation quant' },
      { id: 'gguf-q4', name: 'GGUF Q4_K_M', vramGB: 125, quality: 93,  recommendedGpu: '2x H100-80GB', notes: 'Community llama.cpp build' },
    ],
  },
  {
    id: 'mistral-medium-3.5',
    name: 'Mistral Medium 3.5',
    family: 'Mistral',
    activeParamsB: null,
    totalParamsB: 128,
    contextWindow: 256000,
    released: '2026-05',
    license: 'Modified MIT',
    hfUrl: 'https://huggingface.co/mistralai/Mistral-Medium-3.5-128B',
    url: 'https://mistral.ai/news/mistral-medium-3-5/',
    capabilities: ['text', 'tool-use', 'function-calling', 'multilingual'],
    weightsAvailable: true,
    notes: 'Dense 128B hitting 77.6 percent on SWE-Bench Verified, which is frontier-adjacent coding performance at a size that fits on one node. 256K context, larger than Sonnet 4.6. The most practical entry in this catalog: strong enough to matter, small enough to actually run, and licensed permissively enough to ship.',
    quantizations: [
      { id: 'fp16',    name: 'FP16',        vramGB: 270, quality: 100, recommendedGpu: '4x H100-80GB', notes: 'Reference precision' },
      { id: 'fp8',     name: 'FP8',         vramGB: 140, quality: 99,  recommendedGpu: '2x H100-80GB', notes: 'Production default' },
      { id: 'awq',     name: 'AWQ INT4',    vramGB: 72,  quality: 96,  recommendedGpu: '1x H100-80GB', notes: 'Single-GPU production fit' },
      { id: 'gguf-q4', name: 'GGUF Q4_K_M', vramGB: 78,  quality: 94,  recommendedGpu: '1x H200',      notes: 'llama.cpp / Ollama' },
    ],
  },
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
    weightsAvailable: true,
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
    weightsAvailable: true,
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
    activeParamsB: 49,
    totalParamsB: 1600,
    contextWindow: 1000000,
    released: '2026-04',
    license: 'MIT',
    hfUrl: 'https://huggingface.co/deepseek-ai/DeepSeek-V4-Pro',
    url: 'https://www.deepseek.com',
    capabilities: ['text', 'tool-use', 'function-calling'],
    weightsAvailable: true,
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
    activeParamsB: 13,
    totalParamsB: 284,
    contextWindow: 1000000,
    released: '2026-04',
    license: 'MIT',
    hfUrl: 'https://huggingface.co/deepseek-ai/DeepSeek-V4-Flash',
    url: 'https://www.deepseek.com',
    capabilities: ['text', 'tool-use', 'function-calling'],
    weightsAvailable: true,
    notes: 'Cheap DeepSeek tier and the throughput workhorse of the MIT-licensed open stack. 284B total with only 13B active per token (top-6 of 256 routed experts plus one shared), so serving cost tracks a 13B model while quality tracks something far larger. Official release is a mixed native format: FP4 for the MoE experts, FP8 for the dense layers. Note the total parameter count, not the active one, when sizing VRAM.',
    quantizations: [
      { id: 'native',   name: 'FP4/FP8 (native)', vramGB: 160, quality: 100, recommendedGpu: '2x H200',      notes: 'DeepSeek reference release format' },
      { id: 'fp16',     name: 'FP16',             vramGB: 600, quality: 100, recommendedGpu: '8x H100-80GB', notes: 'Upcast; rarely worth it over native' },
      { id: 'fp8',      name: 'FP8',              vramGB: 300, quality: 99,  recommendedGpu: '4x H100-80GB', notes: 'Uniform FP8 across all layers' },
      { id: 'awq',      name: 'AWQ INT4',         vramGB: 155, quality: 95,  recommendedGpu: '2x H200',      notes: 'Comparable footprint to native FP4' },
      { id: 'gguf-q4',  name: 'GGUF Q4_K_M',      vramGB: 165, quality: 93,  recommendedGpu: '2x H200',      notes: 'llama.cpp path' },
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
    weightsAvailable: true,
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
    weightsAvailable: true,
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
    weightsAvailable: true,
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
    weightsAvailable: true,
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
    weightsAvailable: true,
    notes: 'MIT-licensed 14B with strong math performance for its size. Fits in consumer-grade VRAM. Good fit for on-device or edge agents.',
    quantizations: [
      { id: 'fp16',    name: 'FP16',        vramGB: 28, quality: 100, recommendedGpu: '1x A100-40GB', notes: 'Reference' },
      { id: 'fp8',     name: 'FP8',         vramGB: 15, quality: 99,  recommendedGpu: '1x RTX 4090',  notes: 'Consumer-GPU' },
      { id: 'awq',     name: 'AWQ INT4',    vramGB: 8,  quality: 96,  recommendedGpu: '1x RTX 3090',  notes: 'Older consumer GPU' },
      { id: 'gguf-q4', name: 'GGUF Q4_K_M', vramGB: 9,  quality: 94,  recommendedGpu: '1x RTX 3090',  notes: 'Edge / Mac M-series' },
    ],
  },
];

export const OPEN_WEIGHTS_LAST_UPDATED = '2026-07-24';
