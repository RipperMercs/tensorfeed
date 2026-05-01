/**
 * Fine-tuning provider catalog.
 *
 * Where you can fine-tune AI models in production: first-party
 * (OpenAI, Anthropic, Google) and third-party hosted (Together,
 * Fireworks, OpenPipe, Predibase, etc) with pricing per training token,
 * inference pricing on the fine-tuned model, and base models supported.
 *
 * Editorial; refreshed on redeploy.
 *
 * Served at /api/fine-tuning (free, cached 600s).
 */

export interface FineTuningProvider {
  id: string;
  name: string;
  vendor: string;
  /** Provider type: first-party (own the base model) vs hosted (run others' models). */
  type: 'first-party' | 'hosted';
  /** Base models you can fine-tune here. */
  baseModels: string[];
  /** Methods supported: full, lora, qlora, dpo, rlhf. */
  methods: ('full' | 'lora' | 'qlora' | 'dpo' | 'rlhf' | 'continued-pretraining')[];
  /** Training pricing summary in $/1M training tokens (formatted). */
  trainingPricing: string;
  /** Inference pricing summary on the fine-tuned model. */
  inferencePricing: string;
  /** Free tier or starting credit. */
  freeTier: string | null;
  /** Notable features. */
  features: string[];
  url: string;
  notes: string;
}

export const FINE_TUNING_PROVIDERS: FineTuningProvider[] = [
  // ── First-party ─────────────────────────────────────
  {
    id: 'openai-finetune',
    name: 'OpenAI Fine-Tuning',
    vendor: 'OpenAI',
    type: 'first-party',
    baseModels: ['GPT-4o', 'GPT-4o-mini', 'GPT-4.1', 'GPT-4.1-mini', 'o4-mini'],
    methods: ['full', 'dpo', 'rlhf'],
    trainingPricing: '$25/1M tokens (GPT-4o); $3/1M (GPT-4o-mini); $25 (GPT-4.1); $5 (GPT-4.1-mini)',
    inferencePricing: 'Roughly 1.5-2x the base model API price',
    freeTier: 'GPT-4o-mini: 2M training tokens/day free until 2025',
    features: ['DPO support', 'RFT (reinforcement fine-tuning) on o4-mini', 'OpenAI infrastructure'],
    url: 'https://platform.openai.com/docs/guides/fine-tuning',
    notes: 'OpenAI\'s first-party fine-tuning. Strong defaults for instruction-following customization. RFT on o4-mini lets you reward-shape reasoning. No model export.',
  },
  {
    id: 'anthropic-finetune',
    name: 'Anthropic Fine-Tuning (AWS Bedrock)',
    vendor: 'Anthropic',
    type: 'first-party',
    baseModels: ['Claude Sonnet 4.6', 'Claude Haiku 4.5'],
    methods: ['lora'],
    trainingPricing: 'Custom; from $9/1M training tokens for Haiku 4.5',
    inferencePricing: 'Same per-token rate as base model + provisioned-throughput fee',
    freeTier: null,
    features: ['Bedrock-only (AWS)', 'LoRA adapters', 'Trained model stays in your AWS account'],
    url: 'https://docs.aws.amazon.com/bedrock/latest/userguide/model-customization-overview.html',
    notes: 'Anthropic exposes Claude fine-tuning only through AWS Bedrock. Adapters; not full weights. Strong fit for AWS-anchored stacks.',
  },
  {
    id: 'google-vertex-finetune',
    name: 'Google Vertex AI Fine-Tuning',
    vendor: 'Google',
    type: 'first-party',
    baseModels: ['Gemini 2.5 Flash', 'Gemini 2.5 Pro', 'PaLM 2', 'Codey'],
    methods: ['lora', 'rlhf'],
    trainingPricing: '$8/1M tokens (Gemini 2.5 Flash); $35/1M (Gemini 2.5 Pro)',
    inferencePricing: 'Base model rate + provisioned-throughput fee',
    freeTier: null,
    features: ['Supervised fine-tuning', 'RLHF for Gemini', 'Distillation pipelines'],
    url: 'https://cloud.google.com/vertex-ai/generative-ai/docs/models/tune-models',
    notes: 'Vertex AI tuning. Supervised + RLHF supported. Strong fit for GCP-anchored stacks; Vertex tooling is the strongest first-party pipeline observability story.',
  },
  {
    id: 'mistral-finetune',
    name: 'Mistral Fine-Tuning',
    vendor: 'Mistral',
    type: 'first-party',
    baseModels: ['Mistral Small', 'Mistral Large', 'Codestral'],
    methods: ['lora', 'full'],
    trainingPricing: '$2/1M tokens (Mistral Small); $9/1M (Mistral Large)',
    inferencePricing: 'Roughly 1.5x the base model price',
    freeTier: '1 free fine-tune per la Plateforme account',
    features: ['LoRA + full SFT', 'Open weights export available', 'European data residency'],
    url: 'https://docs.mistral.ai/capabilities/finetuning/finetuning_overview/',
    notes: 'Mistral\'s la Plateforme tuning. The only first-party provider that lets you export the fine-tuned weights for self-host.',
  },

  // ── Hosted (third-party) ────────────────────────────
  {
    id: 'together-finetune',
    name: 'Together AI Fine-Tuning',
    vendor: 'Together AI',
    type: 'hosted',
    baseModels: ['Llama 4 Scout/Maverick', 'Llama 3.x 70B/8B', 'Mixtral 8x7B/8x22B', 'Qwen 2.5', 'Gemma 2'],
    methods: ['lora', 'qlora', 'full', 'dpo'],
    trainingPricing: '$0.40/1M tokens (Llama 3.1 8B); $1.60/1M (Llama 3.1 70B); LoRA-only at half price',
    inferencePricing: 'Same as base model on Together (LoRA serving, no markup)',
    freeTier: '$5 sign-up credit',
    features: ['Open-weights base only', 'LoRA + full SFT + DPO', 'Weight export available', 'Custom datasets via JSONL'],
    url: 'https://www.together.ai/products/fine-tuning',
    notes: 'Best price/perf for fine-tuning open-weights models. Weight export is the differentiator vs first-party. The default for "I want a custom Llama" workflows.',
  },
  {
    id: 'fireworks-finetune',
    name: 'Fireworks Fine-Tuning',
    vendor: 'Fireworks AI',
    type: 'hosted',
    baseModels: ['Llama 4 Scout/Maverick', 'Llama 3.x', 'Mixtral 8x22B', 'DeepSeek V3', 'Qwen 2.5'],
    methods: ['lora', 'qlora'],
    trainingPricing: '$0.50/1M tokens for most open-weights models',
    inferencePricing: 'Same per-token rate as base model + LoRA serve fee',
    freeTier: '$1 sign-up credit',
    features: ['LoRA only', 'Multi-LoRA per base (cheap to switch)', 'Long-context support'],
    url: 'https://fireworks.ai/blog/fine-tuning-models-with-fireworks',
    notes: 'LoRA-first hosted tuning. Multi-LoRA serving means many fine-tunes share one base, very cheap to deploy 10s of variants.',
  },
  {
    id: 'openpipe',
    name: 'OpenPipe',
    vendor: 'OpenPipe',
    type: 'hosted',
    baseModels: ['Llama 3.x', 'Mistral 7B', 'Qwen 2.5'],
    methods: ['lora', 'full'],
    trainingPricing: '$1/1M tokens',
    inferencePricing: '$1.20/1M tokens (Mistral 7B fine-tune); volume discounts',
    freeTier: '1M training tokens free',
    features: ['Distill from GPT-4 traces', 'Auto-eval pipeline', 'A/B test against base model'],
    url: 'https://openpipe.ai',
    notes: 'Distillation-first: pipe production GPT-4 traffic, distill into a cheaper fine-tuned open model. The default workflow for "make my expensive prompts cheaper."',
  },
  {
    id: 'predibase',
    name: 'Predibase',
    vendor: 'Predibase',
    type: 'hosted',
    baseModels: ['Llama 3.x', 'Mistral 7B', 'Qwen 2.5', 'Solar 10.7B'],
    methods: ['lora', 'qlora', 'full'],
    trainingPricing: '$0.50/1M tokens',
    inferencePricing: 'Pay-per-token; multi-LoRA serving',
    freeTier: 'Trial credits',
    features: ['Turbo LoRA (faster training)', 'Unlimited adapters per base', 'Adapter hot-swap inference'],
    url: 'https://predibase.com',
    notes: 'Production fine-tuning + serving with strong adapter management. The platform behind Lorax (open-source LoRA serving).',
  },
  {
    id: 'huggingface-autotrain',
    name: 'Hugging Face AutoTrain',
    vendor: 'Hugging Face',
    type: 'hosted',
    baseModels: ['Most HuggingFace open-weights models'],
    methods: ['lora', 'full', 'dpo'],
    trainingPricing: 'GPU-time billed; ~$1.40/hr for A10G',
    inferencePricing: 'Inference Endpoints separately billed (~$0.50-$5/hr)',
    freeTier: 'Free for non-GPU jobs',
    features: ['Browser-only training', 'Spaces integration', 'Push to Hub'],
    url: 'https://huggingface.co/autotrain',
    notes: 'Easiest no-code fine-tuning. Browser UI; trained model lands in your HuggingFace account. Best for prototyping and educational use.',
  },
  {
    id: 'aws-bedrock-finetune',
    name: 'AWS Bedrock Fine-Tuning',
    vendor: 'Amazon Web Services',
    type: 'hosted',
    baseModels: ['Claude Sonnet/Haiku', 'Llama 3.x', 'Titan', 'Cohere Command'],
    methods: ['lora', 'continued-pretraining'],
    trainingPricing: 'Provider-specific (e.g. Claude Haiku $9/1M tokens; Titan Express $15/1M)',
    inferencePricing: 'Provisioned throughput model: $/hour rate per model unit',
    freeTier: null,
    features: ['Continued pretraining', 'Cross-region inference', 'Bedrock Guardrails included', 'Tied to AWS IAM'],
    url: 'https://docs.aws.amazon.com/bedrock/latest/userguide/model-customization-overview.html',
    notes: 'AWS-native fine-tuning across many providers. Provisioned throughput billing (not per-token) makes pricing predictable but expensive at low volume.',
  },
  {
    id: 'replicate-finetune',
    name: 'Replicate Fine-Tuning',
    vendor: 'Replicate',
    type: 'hosted',
    baseModels: ['Llama 3.x', 'FLUX (image)', 'SDXL', 'StyleGAN'],
    methods: ['lora'],
    trainingPricing: 'GPU-time; ~$0.001-$0.01/sec',
    inferencePricing: 'Per-second GPU billing on the fine-tuned model',
    freeTier: 'Free trial credit',
    features: ['Image LoRA fine-tuning standout', 'API-driven', 'Webhook-on-completion'],
    url: 'https://replicate.com/docs/guides/fine-tune-an-image-model',
    notes: 'Strongest image LoRA fine-tuning experience (FLUX, SDXL). Less competitive on text-LLM fine-tuning vs Together / Fireworks.',
  },
  {
    id: 'modal-finetune',
    name: 'Modal Labs (DIY)',
    vendor: 'Modal',
    type: 'hosted',
    baseModels: ['Any (BYO code)', 'Llama 3.x recipes published'],
    methods: ['lora', 'qlora', 'full', 'dpo', 'rlhf', 'continued-pretraining'],
    trainingPricing: 'GPU-time billing; H100 ~$3.95/hr',
    inferencePricing: 'GPU-time billing on serving function',
    freeTier: '$30/mo compute credit',
    features: ['Full BYO control', 'Serverless GPU', 'Distributed training', 'Open-source recipes'],
    url: 'https://modal.com/docs/examples/llm-finetuning',
    notes: 'BYO fine-tuning infra. You own the code; Modal owns the GPU scheduling. The right answer if your tuning recipe does not fit a turn-key provider.',
  },
];

export const FINE_TUNING_LAST_UPDATED = '2026-04-30';
