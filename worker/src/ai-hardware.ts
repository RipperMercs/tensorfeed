/**
 * AI accelerator hardware spec catalog.
 *
 * Companion to /api/gpu/pricing (which is rental rates) and /api/inference-providers
 * (which is hosted-model pricing). This is the spec sheet: FLOPS, VRAM,
 * memory bandwidth, NVLink/interconnect, manufacturer launch year.
 *
 * Editorial; refreshed when new chips ship.
 *
 * Served at /api/ai-hardware (free, cached 600s).
 */

export interface AIHardware {
  id: string;
  name: string;
  manufacturer: 'NVIDIA' | 'AMD' | 'Google' | 'AWS' | 'Intel' | 'Apple' | 'Cerebras' | 'Groq';
  family: string;
  /** Process node (e.g. "TSMC 4N", "TSMC 3nm"). */
  process: string;
  /** Year released. */
  released: string;
  /** VRAM / on-package memory in GB. */
  memoryGB: number;
  /** Memory bandwidth in TB/s. */
  memoryBandwidthTBs: number;
  /** Peak FP16 / BF16 compute in TFLOPS (dense, no sparsity). */
  fp16TFLOPS: number;
  /** Peak FP8 / INT8 compute in TFLOPS (dense). Null if not supported. */
  fp8TFLOPS: number | null;
  /** Peak FP4 compute in TFLOPS (dense). Null if not supported. */
  fp4TFLOPS: number | null;
  /** Power draw at full utilization, watts. */
  tdpWatts: number;
  /** Interconnect: NVLink/PCIe/InfinityFabric details. */
  interconnect: string;
  /** Approx list price USD when retail (null if cloud-only or undisclosed). */
  listPriceUSD: number | null;
  /** Where you can rent it / buy it. */
  availability: string;
  /** Notable strengths. */
  notes: string;
  /** Vendor product page. */
  url: string;
}

export const AI_HARDWARE_CATALOG: AIHardware[] = [
  // ── NVIDIA ─────────────────────────────────────────────────
  {
    id: 'gb200',
    name: 'NVIDIA GB200 (Blackwell)',
    manufacturer: 'NVIDIA',
    family: 'Blackwell',
    process: 'TSMC 4NP',
    released: '2025',
    memoryGB: 384,
    memoryBandwidthTBs: 16.0,
    fp16TFLOPS: 5000,
    fp8TFLOPS: 10000,
    fp4TFLOPS: 20000,
    tdpWatts: 2700,
    interconnect: 'NVLink 5 (1.8 TB/s) + Grace CPU C2C (900 GB/s)',
    listPriceUSD: null,
    availability: 'Cloud only (CoreWeave, AWS, Azure, GCP, Oracle, Lambda)',
    notes: 'Blackwell flagship: dual B200 + Grace CPU. FP4 native. The chip every major lab is buying for 2025-2026 frontier training.',
    url: 'https://www.nvidia.com/en-us/data-center/gb200-nvl72/',
  },
  {
    id: 'b200',
    name: 'NVIDIA B200',
    manufacturer: 'NVIDIA',
    family: 'Blackwell',
    process: 'TSMC 4NP',
    released: '2025',
    memoryGB: 192,
    memoryBandwidthTBs: 8.0,
    fp16TFLOPS: 2500,
    fp8TFLOPS: 5000,
    fp4TFLOPS: 10000,
    tdpWatts: 1000,
    interconnect: 'NVLink 5 (1.8 TB/s)',
    listPriceUSD: null,
    availability: 'Cloud only',
    notes: 'Single-die Blackwell. 192GB HBM3e (largest in the catalog at single-die). Inference workhorse for serving 100B+ MoE models on a single GPU.',
    url: 'https://www.nvidia.com/en-us/data-center/blackwell-architecture/',
  },
  {
    id: 'h200',
    name: 'NVIDIA H200',
    manufacturer: 'NVIDIA',
    family: 'Hopper',
    process: 'TSMC 4N',
    released: '2024',
    memoryGB: 141,
    memoryBandwidthTBs: 4.8,
    fp16TFLOPS: 989,
    fp8TFLOPS: 1979,
    fp4TFLOPS: null,
    tdpWatts: 700,
    interconnect: 'NVLink 4 (900 GB/s)',
    listPriceUSD: null,
    availability: 'Cloud and direct sale',
    notes: 'Hopper refresh with HBM3e. The sweet spot for production inference in 2025. Extra memory means 70B-class models fit single-GPU at FP8.',
    url: 'https://www.nvidia.com/en-us/data-center/h200/',
  },
  {
    id: 'h100',
    name: 'NVIDIA H100',
    manufacturer: 'NVIDIA',
    family: 'Hopper',
    process: 'TSMC 4N',
    released: '2022',
    memoryGB: 80,
    memoryBandwidthTBs: 3.35,
    fp16TFLOPS: 989,
    fp8TFLOPS: 1979,
    fp4TFLOPS: null,
    tdpWatts: 700,
    interconnect: 'NVLink 4 (900 GB/s)',
    listPriceUSD: 30000,
    availability: 'Cloud and direct sale (~$30k retail, declining)',
    notes: 'The chip that built the 2023-2024 LLM boom. Still the most-deployed AI GPU. FP8 native. 80GB HBM3.',
    url: 'https://www.nvidia.com/en-us/data-center/h100/',
  },
  {
    id: 'a100',
    name: 'NVIDIA A100 80GB',
    manufacturer: 'NVIDIA',
    family: 'Ampere',
    process: 'TSMC 7nm',
    released: '2020',
    memoryGB: 80,
    memoryBandwidthTBs: 2.0,
    fp16TFLOPS: 312,
    fp8TFLOPS: null,
    fp4TFLOPS: null,
    tdpWatts: 400,
    interconnect: 'NVLink 3 (600 GB/s)',
    listPriceUSD: 18000,
    availability: 'Cloud and used market (~$18k retail, declining)',
    notes: 'Workhorse of the late-2010s ML wave. Still widely used for training smaller models and inference where H100/H200 supply is tight.',
    url: 'https://www.nvidia.com/en-us/data-center/a100/',
  },
  {
    id: 'rtx-pro-6000-blackwell',
    name: 'NVIDIA RTX PRO 6000 Blackwell',
    manufacturer: 'NVIDIA',
    family: 'Blackwell',
    process: 'TSMC 4NP',
    released: '2025',
    memoryGB: 96,
    memoryBandwidthTBs: 1.79,
    fp16TFLOPS: 360,
    fp8TFLOPS: 720,
    fp4TFLOPS: 1440,
    tdpWatts: 600,
    interconnect: 'PCIe 5.0',
    listPriceUSD: 8500,
    availability: 'Direct sale (workstation card)',
    notes: 'Workstation Blackwell. 96GB GDDR7. Good fit for on-prem agent dev environments where multi-H100 rentals are overkill.',
    url: 'https://www.nvidia.com/en-us/products/workstations/professional-desktop-gpus/rtx-pro-6000-blackwell/',
  },
  {
    id: 'rtx-4090',
    name: 'NVIDIA RTX 4090',
    manufacturer: 'NVIDIA',
    family: 'Ada Lovelace',
    process: 'TSMC 4N',
    released: '2022',
    memoryGB: 24,
    memoryBandwidthTBs: 1.01,
    fp16TFLOPS: 165,
    fp8TFLOPS: 660,
    fp4TFLOPS: null,
    tdpWatts: 450,
    interconnect: 'PCIe 4.0',
    listPriceUSD: 1600,
    availability: 'Consumer retail',
    notes: 'Best price/perf for local agent dev. 24GB VRAM fits Q4-quantized 70B models. The default consumer-tier choice for self-hosted Ollama/llama.cpp.',
    url: 'https://www.nvidia.com/en-us/geforce/graphics-cards/40-series/rtx-4090/',
  },
  {
    id: 'rtx-5090',
    name: 'NVIDIA RTX 5090',
    manufacturer: 'NVIDIA',
    family: 'Blackwell',
    process: 'TSMC 4NP',
    released: '2025',
    memoryGB: 32,
    memoryBandwidthTBs: 1.79,
    fp16TFLOPS: 209,
    fp8TFLOPS: 838,
    fp4TFLOPS: 3352,
    tdpWatts: 575,
    interconnect: 'PCIe 5.0',
    listPriceUSD: 2000,
    availability: 'Consumer retail',
    notes: 'Consumer Blackwell flagship. 32GB GDDR7. FP4 native. Strong pick for local agent dev with current-frontier features.',
    url: 'https://www.nvidia.com/en-us/geforce/graphics-cards/50-series/rtx-5090/',
  },

  // ── AMD ────────────────────────────────────────────────────
  {
    id: 'mi325x',
    name: 'AMD MI325X',
    manufacturer: 'AMD',
    family: 'Instinct',
    process: 'TSMC N5 / N6',
    released: '2024-Q4',
    memoryGB: 256,
    memoryBandwidthTBs: 6.0,
    fp16TFLOPS: 1300,
    fp8TFLOPS: 2600,
    fp4TFLOPS: null,
    tdpWatts: 1000,
    interconnect: 'Infinity Fabric (8x 153 GB/s)',
    listPriceUSD: null,
    availability: 'Cloud (Microsoft Azure, Oracle), direct sale',
    notes: 'AMD\'s answer to H200. 256GB HBM3e (highest in the catalog at single-die). Strong inference value when supply is constrained on NVIDIA.',
    url: 'https://www.amd.com/en/products/accelerators/instinct/mi300/mi325x.html',
  },
  {
    id: 'mi300x',
    name: 'AMD MI300X',
    manufacturer: 'AMD',
    family: 'Instinct',
    process: 'TSMC N5 / N6',
    released: '2023-Q4',
    memoryGB: 192,
    memoryBandwidthTBs: 5.3,
    fp16TFLOPS: 1300,
    fp8TFLOPS: 2600,
    fp4TFLOPS: null,
    tdpWatts: 750,
    interconnect: 'Infinity Fabric',
    listPriceUSD: 15000,
    availability: 'Cloud (Vultr, RunPod, Microsoft Azure), direct sale (~$15k)',
    notes: 'Wider availability than NVIDIA flagship; cheaper to rent. ROCm software stack matures; vLLM and PyTorch first-class on MI300X in 2026.',
    url: 'https://www.amd.com/en/products/accelerators/instinct/mi300/mi300x.html',
  },

  // ── Google TPU ────────────────────────────────────────────
  {
    id: 'tpu-v5p',
    name: 'Google TPU v5p',
    manufacturer: 'Google',
    family: 'TPU',
    process: 'TSMC 3nm',
    released: '2023-12',
    memoryGB: 95,
    memoryBandwidthTBs: 2.77,
    fp16TFLOPS: 459,
    fp8TFLOPS: 918,
    fp4TFLOPS: null,
    tdpWatts: 700,
    interconnect: 'ICI (Inter-Chip Interconnect, 4.8 Tb/s per chip)',
    listPriceUSD: null,
    availability: 'Google Cloud only (Vertex AI, GCE)',
    notes: 'Google\'s top training TPU. Used for Gemini training. Only available on GCP; pod-scale (8960 chips) is a different beast than per-chip rentals.',
    url: 'https://cloud.google.com/tpu/docs/v5p',
  },
  {
    id: 'tpu-v5e',
    name: 'Google TPU v5e',
    manufacturer: 'Google',
    family: 'TPU',
    process: 'TSMC 5nm',
    released: '2023-08',
    memoryGB: 16,
    memoryBandwidthTBs: 0.82,
    fp16TFLOPS: 197,
    fp8TFLOPS: 394,
    fp4TFLOPS: null,
    tdpWatts: 170,
    interconnect: 'ICI',
    listPriceUSD: null,
    availability: 'Google Cloud only',
    notes: 'TPU inference tier. Cheaper than v5p; 256-chip pods. Best fit for Google Cloud customers serving Gemini-style inference at scale.',
    url: 'https://cloud.google.com/tpu/docs/v5e',
  },

  // ── AWS Trainium ──────────────────────────────────────────
  {
    id: 'trainium-2',
    name: 'AWS Trainium 2',
    manufacturer: 'AWS',
    family: 'Trainium',
    process: 'TSMC 5nm',
    released: '2024-12',
    memoryGB: 96,
    memoryBandwidthTBs: 2.9,
    fp16TFLOPS: 1300,
    fp8TFLOPS: 2600,
    fp4TFLOPS: null,
    tdpWatts: 500,
    interconnect: 'NeuronLink (3 TB/s per chip)',
    listPriceUSD: null,
    availability: 'AWS only (Trn2 instances)',
    notes: 'AWS custom training/inference silicon. Anthropic uses these for Claude training. Cheaper TCO on AWS than NVIDIA flagship for committed workloads.',
    url: 'https://aws.amazon.com/ai/machine-learning/trainium/',
  },
  {
    id: 'inferentia-2',
    name: 'AWS Inferentia 2',
    manufacturer: 'AWS',
    family: 'Inferentia',
    process: 'TSMC 5nm',
    released: '2023-04',
    memoryGB: 32,
    memoryBandwidthTBs: 0.82,
    fp16TFLOPS: 190,
    fp8TFLOPS: null,
    fp4TFLOPS: null,
    tdpWatts: null as unknown as number, // varies by instance
    interconnect: 'NeuronLink',
    listPriceUSD: null,
    availability: 'AWS only (Inf2 instances)',
    notes: 'AWS inference silicon. Lower compute than Trainium 2 but cheaper per-token for high-volume serving workloads on AWS.',
    url: 'https://aws.amazon.com/ai/machine-learning/inferentia/',
  },

  // ── Apple ─────────────────────────────────────────────────
  {
    id: 'apple-m4-max',
    name: 'Apple M4 Max',
    manufacturer: 'Apple',
    family: 'Apple Silicon',
    process: 'TSMC 3nm',
    released: '2024-10',
    memoryGB: 128,
    memoryBandwidthTBs: 0.546,
    fp16TFLOPS: 38,
    fp8TFLOPS: null,
    fp4TFLOPS: null,
    tdpWatts: 60,
    interconnect: 'On-die (unified memory)',
    listPriceUSD: 4699,
    availability: 'Consumer retail (MacBook Pro / Studio)',
    notes: '128GB unified memory means a Mac Studio runs 70B-class models at Q4 quantization with usable speed. The dark-horse local-inference platform.',
    url: 'https://www.apple.com/shop/buy-mac/mac-studio',
  },

  // ── Cerebras (wafer-scale) ────────────────────────────────
  {
    id: 'cerebras-wse-3',
    name: 'Cerebras WSE-3',
    manufacturer: 'Cerebras',
    family: 'WSE',
    process: 'TSMC 5nm',
    released: '2024',
    memoryGB: 44,
    memoryBandwidthTBs: 21.0,
    fp16TFLOPS: 125000,
    fp8TFLOPS: null,
    fp4TFLOPS: null,
    tdpWatts: 23000,
    interconnect: 'On-wafer (no interconnect needed)',
    listPriceUSD: null,
    availability: 'Cerebras Cloud only',
    notes: 'Single 46,225 mm^2 wafer. Holds entire activations on-chip; eliminates many distributed-training pains. Fastest inference for sub-100B models in production.',
    url: 'https://cerebras.ai/product-chip/',
  },

  // ── Groq ──────────────────────────────────────────────────
  {
    id: 'groq-lpu',
    name: 'Groq LPU',
    manufacturer: 'Groq',
    family: 'LPU',
    process: 'GlobalFoundries 14nm (gen 1)',
    released: '2023',
    memoryGB: 0.23,
    memoryBandwidthTBs: 80.0,
    fp16TFLOPS: 188,
    fp8TFLOPS: null,
    fp4TFLOPS: null,
    tdpWatts: 350,
    interconnect: 'GroqLink',
    listPriceUSD: null,
    availability: 'Groq Cloud only',
    notes: 'Deterministic single-thread inference silicon. SRAM-only memory model means small per-chip capacity but massive bandwidth. Behind Groq\'s 700+ tokens/sec Llama 4 Scout serving.',
    url: 'https://groq.com/lpu-language-processing-unit/',
  },
];

export const AI_HARDWARE_LAST_UPDATED = '2026-04-30';
