/**
 * Notable AI training runs catalog.
 *
 * Public training-run records: parameter count, training tokens,
 * estimated GPU hours, estimated cost, hardware used, training duration.
 * Sourced from published papers, model cards, and disclosed numbers.
 *
 * The compute economics layer: lets agents (and humans) reason about
 * "what does it cost to train a frontier model" by comparing across
 * generations, labs, and hardware.
 *
 * Editorial; refreshed when significant runs are disclosed.
 *
 * Served at /api/training-runs (free, cached 600s).
 */

export interface TrainingRun {
  id: string;
  model: string;
  publisher: string;
  released: string;
  /** Active parameter count (B) for MoE; same as total for dense. */
  activeParamsB: number | null;
  /** Total parameter count (B). */
  totalParamsB: number;
  /** Training tokens, formatted (e.g. "15T", "1.4T", "300B"). */
  trainingTokens: string;
  /** Hardware used. */
  hardware: string;
  /** GPU/accelerator count used at peak. */
  hardwareCount: number | null;
  /** Reported or estimated GPU/TPU hours. */
  computeHours: string | null;
  /** Reported or estimated cost in USD millions. */
  estimatedCostMillionUSD: number | null;
  /** Whether the cost is officially disclosed or independently estimated. */
  costSource: 'disclosed' | 'estimated';
  /** Training duration. */
  duration: string;
  /** Open-weights flag. */
  openWeights: boolean;
  /** Public paper / blog URL. */
  url: string;
  /** Notable detail or takeaway. */
  notes: string;
}

export const TRAINING_RUNS: TrainingRun[] = [
  // ── 2026 frontier ──────────────────────────────────────
  {
    id: 'gpt-5.5',
    model: 'GPT-5.5',
    publisher: 'OpenAI',
    released: '2026-04',
    activeParamsB: null,
    totalParamsB: 1500,
    trainingTokens: '~16T (estimated)',
    hardware: 'NVIDIA H200 + Blackwell',
    hardwareCount: 75000,
    computeHours: '~3.5 billion GPU-hours (estimated)',
    estimatedCostMillionUSD: 800,
    costSource: 'estimated',
    duration: '~6 months',
    openWeights: false,
    url: 'https://openai.com/index/gpt-5-5/',
    notes: 'OpenAI flagship. Numbers reverse-engineered from public hints; OpenAI does not disclose officially. Estimated ~$800M in compute alone.',
  },
  {
    id: 'claude-opus-4-7',
    model: 'Claude Opus 4.7',
    publisher: 'Anthropic',
    released: '2026-04',
    activeParamsB: null,
    totalParamsB: null as unknown as number,
    trainingTokens: 'undisclosed',
    hardware: 'AWS Trainium 2 + NVIDIA H200',
    hardwareCount: null,
    computeHours: null,
    estimatedCostMillionUSD: null,
    costSource: 'estimated',
    duration: 'undisclosed',
    openWeights: false,
    url: 'https://www.anthropic.com/news/claude-opus-4-7',
    notes: 'Anthropic does not disclose training run details. Co-trained on Trainium 2 (Anthropic-AWS partnership) and H200. Cost estimate withheld for lack of public signal.',
  },
  {
    id: 'deepseek-v4-pro',
    model: 'DeepSeek V4 Pro',
    publisher: 'DeepSeek',
    released: '2026-04',
    activeParamsB: 37,
    totalParamsB: 1600,
    trainingTokens: '14T',
    hardware: 'NVIDIA H800',
    hardwareCount: 4096,
    computeHours: '5.5M GPU-hours',
    estimatedCostMillionUSD: 6.5,
    costSource: 'disclosed',
    duration: '~55 days',
    openWeights: true,
    url: 'https://www.deepseek.com',
    notes: 'MIT-licensed frontier MoE. The disclosed $6.5M training cost is the cheapest cited frontier-class run by an order of magnitude vs Western labs. Sparse activation + FP8 + MoE = unusually compute-efficient.',
  },
  {
    id: 'llama-4-maverick',
    model: 'Llama 4 Maverick',
    publisher: 'Meta',
    released: '2026-04',
    activeParamsB: 17,
    totalParamsB: 400,
    trainingTokens: '22T',
    hardware: 'NVIDIA H100',
    hardwareCount: 32000,
    computeHours: '~150M GPU-hours (estimated)',
    estimatedCostMillionUSD: 220,
    costSource: 'estimated',
    duration: '~5 months',
    openWeights: true,
    url: 'https://ai.meta.com/blog/llama-4/',
    notes: 'Meta\'s frontier MoE. 22T training tokens reported; first major model trained on the 32k H100 cluster Meta announced in 2024. Cost estimated based on cluster-hour rates.',
  },
  {
    id: 'gemini-2.5-pro',
    model: 'Gemini 2.5 Pro',
    publisher: 'Google',
    released: '2026-01',
    activeParamsB: null,
    totalParamsB: null as unknown as number,
    trainingTokens: 'undisclosed',
    hardware: 'Google TPU v5p',
    hardwareCount: null,
    computeHours: null,
    estimatedCostMillionUSD: null,
    costSource: 'estimated',
    duration: 'undisclosed',
    openWeights: false,
    url: 'https://deepmind.google/models/gemini/',
    notes: 'Google does not disclose Gemini training details. Trained on TPU v5p pods (8960-chip topology). 1M context with strong long-context retention.',
  },

  // ── 2024-2025 reference points ─────────────────────────
  {
    id: 'gpt-4',
    model: 'GPT-4',
    publisher: 'OpenAI',
    released: '2023-03',
    activeParamsB: 280,
    totalParamsB: 1760,
    trainingTokens: '~13T (estimated)',
    hardware: 'NVIDIA A100',
    hardwareCount: 25000,
    computeHours: '~270M GPU-hours (estimated)',
    estimatedCostMillionUSD: 100,
    costSource: 'estimated',
    duration: '~3 months',
    openWeights: false,
    url: 'https://openai.com/index/gpt-4-research/',
    notes: 'Reverse-engineered numbers from public leaks (1.76T MoE, 280B active). The reference point for "what did frontier training cost in 2023." Made obsolete in compute terms by H100/H200/Blackwell era.',
  },
  {
    id: 'llama-3.1-405b',
    model: 'Llama 3.1 405B',
    publisher: 'Meta',
    released: '2024-07',
    activeParamsB: 405,
    totalParamsB: 405,
    trainingTokens: '15T',
    hardware: 'NVIDIA H100',
    hardwareCount: 16000,
    computeHours: '30.84M GPU-hours',
    estimatedCostMillionUSD: 60,
    costSource: 'disclosed',
    duration: '~54 days',
    openWeights: true,
    url: 'https://ai.meta.com/research/publications/the-llama-3-herd-of-models/',
    notes: 'The most-detailed open training run disclosure of 2024. 30.84M H100-hours documented in the paper. Base for 2024-2025 reasoning about what dense 405B costs.',
  },
  {
    id: 'deepseek-v3',
    model: 'DeepSeek V3',
    publisher: 'DeepSeek',
    released: '2024-12',
    activeParamsB: 37,
    totalParamsB: 671,
    trainingTokens: '14.8T',
    hardware: 'NVIDIA H800',
    hardwareCount: 2048,
    computeHours: '2.788M GPU-hours',
    estimatedCostMillionUSD: 5.6,
    costSource: 'disclosed',
    duration: '~57 days',
    openWeights: true,
    url: 'https://github.com/deepseek-ai/DeepSeek-V3',
    notes: 'The training run that triggered the "are we overspending on AI compute" debate. $5.6M disclosed cost vs ~$60M for Llama 3.1 405B at comparable performance. Sparked global market reaction in late January 2025.',
  },
  {
    id: 'olmo-2-32b',
    model: 'OLMo 2 32B',
    publisher: 'Allen AI',
    released: '2025-03',
    activeParamsB: 32,
    totalParamsB: 32,
    trainingTokens: '6T',
    hardware: 'AMD MI250X / NVIDIA H100',
    hardwareCount: null,
    computeHours: 'documented in paper',
    estimatedCostMillionUSD: 1.5,
    costSource: 'estimated',
    duration: '~2 months',
    openWeights: true,
    url: 'https://allenai.org/olmo',
    notes: 'Fully open: weights, code, training data, and intermediate checkpoints. The reference for "open all the way down" pretraining. Closer to academic reproducibility than commercial open-weights.',
  },
  {
    id: 'mistral-large-2',
    model: 'Mistral Large 2',
    publisher: 'Mistral',
    released: '2024-07',
    activeParamsB: 123,
    totalParamsB: 123,
    trainingTokens: 'undisclosed',
    hardware: 'NVIDIA H100',
    hardwareCount: null,
    computeHours: null,
    estimatedCostMillionUSD: 25,
    costSource: 'estimated',
    duration: 'undisclosed',
    openWeights: true,
    url: 'https://mistral.ai/news/mistral-large-2407/',
    notes: 'Mistral does not disclose training details. Cost estimated based on 123B dense + standard FLOP-per-parameter ratios.',
  },
  {
    id: 'qwen-2.5-72b',
    model: 'Qwen 2.5 72B',
    publisher: 'Alibaba',
    released: '2024-09',
    activeParamsB: 72,
    totalParamsB: 72,
    trainingTokens: '18T',
    hardware: 'NVIDIA H800',
    hardwareCount: null,
    computeHours: null,
    estimatedCostMillionUSD: 12,
    costSource: 'estimated',
    duration: 'undisclosed',
    openWeights: true,
    url: 'https://qwenlm.github.io',
    notes: 'Alibaba\'s open dense flagship. 18T tokens disclosed; cost estimated. Strongest 72B-class open model on multilingual workloads.',
  },
];

export const TRAINING_RUNS_LAST_UPDATED = '2026-04-30';
