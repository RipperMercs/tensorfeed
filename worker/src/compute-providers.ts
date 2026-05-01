/**
 * AI compute provider catalog.
 *
 * Full-service AI compute platforms: GPU clouds (Lambda, CoreWeave,
 * Crusoe, Nebius, Vast.ai, RunPod), hyperscalers (AWS, Azure, GCP,
 * Oracle, IBM), AI-native serverless (Modal, Replicate, Beam). Different
 * from /api/gpu-pricing (live cheapest hourly rates) and
 * /api/inference-providers (hosted-model pricing). This is the platform
 * spec catalog: what you actually buy.
 *
 * Editorial; refreshed on redeploy.
 *
 * Served at /api/compute-providers (free, cached 600s).
 */

export interface ComputeProvider {
  id: string;
  name: string;
  vendor: string;
  /** Type. */
  type: 'gpu-cloud' | 'hyperscaler' | 'ai-serverless' | 'marketplace' | 'specialized';
  /** GPU classes available (formatted). */
  gpus: string[];
  /** Pricing model summary. */
  pricingModel: string;
  /** Starting price for the most popular tier (formatted). */
  startingPrice: string;
  /** Whether you can rent on-demand without a long-term contract. */
  onDemand: boolean;
  /** Whether they offer spot/preemptible pricing. */
  spotPricing: boolean;
  /** Geographic regions available, formatted. */
  regions: string;
  /** AI-specific services beyond raw compute. */
  aiServices: string[];
  /** What kind of customer this fits. */
  bestFor: string;
  url: string;
  notes: string;
}

export const COMPUTE_PROVIDERS: ComputeProvider[] = [
  // ── GPU clouds ──────────────────────────────────────
  { id: 'lambda', name: 'Lambda', vendor: 'Lambda', type: 'gpu-cloud', gpus: ['B200', 'H200', 'H100', 'A100', 'A6000'], pricingModel: 'On-demand + 1/3-year reserved', startingPrice: 'H100 from $2.49/hr on-demand', onDemand: true, spotPricing: false, regions: 'US (multiple), EU, APAC', aiServices: ['Lambda Stack (preinstalled CUDA + frameworks)', '1-Click Clusters', 'managed Kubernetes', 'private cloud'], bestFor: 'Researchers + AI startups wanting bare-metal GPU without hyperscaler complexity', url: 'https://lambdalabs.com', notes: 'Founded 2012. The default \'GPU cloud\' for indie AI research and startup deployments. Strong CLI experience.' },
  { id: 'coreweave', name: 'CoreWeave', vendor: 'CoreWeave', type: 'gpu-cloud', gpus: ['GB200', 'B200', 'H200', 'H100', 'A100', 'A40'], pricingModel: 'Reserved (1-3 year minimum) + on-demand', startingPrice: 'H100 from $2.23/hr (reserved); higher on-demand', onDemand: true, spotPricing: false, regions: 'US (multiple), UK, EU expanding', aiServices: ['Kubernetes-first', 'managed inference', 'SUNK scheduler (Slurm-on-K8s)', 'NVLink fabric'], bestFor: 'Frontier labs + enterprise AI training; second-largest H100/H200 fleet after AWS', url: 'https://www.coreweave.com', notes: 'IPO\'d 2025. Anchor tenant for many frontier lab compute deals. Specializes in NVIDIA-only large-scale training.' },
  { id: 'crusoe', name: 'Crusoe', vendor: 'Crusoe', type: 'gpu-cloud', gpus: ['B200', 'H200', 'H100', 'A100', 'A40'], pricingModel: 'Reserved + on-demand', startingPrice: 'H100 from $2.45/hr on-demand', onDemand: true, spotPricing: false, regions: 'US (TX, IA, OK, ND); building Abilene Texas mega-site', aiServices: ['AI-first data centers', 'managed inference', 'GPU clusters', 'sustainable energy sourcing'], bestFor: 'Enterprise AI training where energy story matters; mega-cluster customers', url: 'https://crusoe.ai', notes: 'Founded as \'Crusoe Energy\' (stranded methane); pivoted to AI-first data centers. The Abilene Texas site is among the largest under construction in 2026.' },
  { id: 'nebius', name: 'Nebius', vendor: 'Nebius (formerly Yandex N.V.)', type: 'gpu-cloud', gpus: ['H200', 'H100'], pricingModel: 'On-demand + reserved + spot', startingPrice: 'H100 from $1.99/hr on-demand', onDemand: true, spotPricing: true, regions: 'EU (Finland), Israel; US Kansas City planned 2026', aiServices: ['vLLM serving', 'fine-tuning service', 'managed K8s', 'NVLink fabric'], bestFor: 'EU customers needing data residency; cost-sensitive H100 access', url: 'https://nebius.com', notes: 'Reorganized after Yandex split. EU-headquartered. Strong NVIDIA H200/B200 supply for 2026.' },
  { id: 'vast-ai', name: 'Vast.ai', vendor: 'Vast.ai', type: 'marketplace', gpus: ['H100', 'A100', 'RTX 4090', 'RTX 3090', 'RTX 6000', 'consumer GPUs'], pricingModel: 'Marketplace (host bid + offer)', startingPrice: 'RTX 3090 from $0.20/hr; H100 from $1.50/hr (varies wildly)', onDemand: true, spotPricing: true, regions: 'Global (host-dependent)', aiServices: ['Docker-only deployments', 'SSH access', 'image library'], bestFor: 'Hobbyist + research workloads; cheapest path for short experiments', url: 'https://vast.ai', notes: 'Marketplace of independent GPU hosts. Heterogeneous quality; verified hosts available. The cheapest GPU rentals in the catalog.' },
  { id: 'runpod', name: 'RunPod', vendor: 'RunPod', type: 'marketplace', gpus: ['H200', 'H100', 'A100', 'L40S', 'RTX 4090', 'RTX A6000'], pricingModel: 'Secure Cloud (RunPod-managed) + Community Cloud (peer hosts) + Serverless', startingPrice: 'H100 from $1.99/hr (Secure); $1.49/hr (Community)', onDemand: true, spotPricing: true, regions: 'Global (multiple)', aiServices: ['Serverless GPU functions', 'instant deploy templates', 'persistent volumes'], bestFor: 'AI app developers wanting per-second serverless GPU + on-demand instances', url: 'https://www.runpod.io', notes: 'Strong serverless GPU offering. Fastest cold-start in the marketplace category.' },
  { id: 'paperspace', name: 'Paperspace (DigitalOcean)', vendor: 'DigitalOcean', type: 'gpu-cloud', gpus: ['H100', 'A100', 'A6000', 'A5000', 'RTX 4000'], pricingModel: 'On-demand + Gradient (managed Jupyter)', startingPrice: 'A100 from $3.09/hr', onDemand: true, spotPricing: false, regions: 'US (multiple), EU', aiServices: ['Gradient managed Jupyter', 'Core (raw VM access)', 'deployments'], bestFor: 'Solo data scientists + small teams wanting managed Jupyter environment', url: 'https://www.paperspace.com', notes: 'Acquired by DigitalOcean 2023. Strong Jupyter-first UX; less competitive on raw H100 pricing than Lambda or CoreWeave.' },

  // ── Hyperscalers ────────────────────────────────────
  { id: 'aws-ec2-gpu', name: 'AWS EC2 GPU', vendor: 'Amazon Web Services', type: 'hyperscaler', gpus: ['B200 (P6)', 'H200 (P5e)', 'H100 (P5)', 'A100 (P4d)', 'V100 (P3)'], pricingModel: 'On-demand + Reserved + Spot + Capacity Reservations + Trainium dedicated', startingPrice: 'P5 (H100, 8x) from $98.32/hr on-demand; spot 50-70% cheaper', onDemand: true, spotPricing: true, regions: 'Global (32 regions)', aiServices: ['Bedrock (managed model APIs)', 'SageMaker', 'Trainium / Inferentia', 'Capacity Blocks', 'EFA networking'], bestFor: 'Enterprise + regulated industries needing AWS ecosystem integration', url: 'https://aws.amazon.com/ec2/instance-types/p5/', notes: 'Largest cloud AI compute footprint. Bedrock is the managed-model layer; Trainium is AWS\'s in-house silicon (Anthropic uses these).' },
  { id: 'azure-ml', name: 'Azure ML / OpenAI Service', vendor: 'Microsoft', type: 'hyperscaler', gpus: ['H200 (NDv5)', 'H100 (ND H100)', 'A100 (ND A100)', 'B200 announced'], pricingModel: 'On-demand + Reserved + Spot + Azure Reserved Instances', startingPrice: 'ND H100 v5 from $98.32/hr', onDemand: true, spotPricing: true, regions: 'Global (60+ regions)', aiServices: ['Azure OpenAI Service (private GPT)', 'Azure AI Foundry', 'Phi-4 hosting', 'Maia 100 (in-house silicon)'], bestFor: 'Enterprise customers anchored on Microsoft ecosystem; private GPT deployments', url: 'https://azure.microsoft.com/en-us/products/machine-learning/', notes: 'Strongest first-party OpenAI hosting (Azure OpenAI Service). Maia 100 is Microsoft\'s in-house silicon, paralleling Trainium / TPU.' },
  { id: 'gcp-vertex', name: 'GCP Vertex AI / Compute Engine GPU', vendor: 'Google', type: 'hyperscaler', gpus: ['B200', 'H200', 'H100', 'A100', 'L4', 'TPU v5p', 'TPU v5e'], pricingModel: 'On-demand + Sustained Use + Committed Use Discounts + Spot + TPU pod-hours', startingPrice: 'A3 (8x H100) from $88.49/hr; TPU v5p pod-hour from $4.20', onDemand: true, spotPricing: true, regions: 'Global (40+ regions)', aiServices: ['Vertex AI', 'Gemini API', 'TPU v5p pods', 'Model Garden', 'AutoML'], bestFor: 'Customers needing TPU access; Gemini-anchored stacks', url: 'https://cloud.google.com/vertex-ai', notes: 'Only major cloud with TPU access. Vertex AI is the managed-model layer. TPU pods (8960-chip topology) are unique in the industry.' },
  { id: 'oci-gpu', name: 'Oracle Cloud Infrastructure', vendor: 'Oracle', type: 'hyperscaler', gpus: ['B200', 'H200', 'H100', 'A100', 'L40S', 'GB200 announced'], pricingModel: 'On-demand + Annual flex commitments + Bare metal', startingPrice: 'BM.GPU.H100.8 from $84.00/hr on-demand', onDemand: true, spotPricing: false, regions: 'Global (50+ regions, OCI Generation 2)', aiServices: ['OCI Generative AI', 'Cohere partnership (private deployments)', 'GPU Bare Metal'], bestFor: 'Enterprise + government wanting NVIDIA cluster scale at competitive bare-metal pricing', url: 'https://www.oracle.com/cloud/compute/gpu/', notes: 'Won large frontier-lab contracts (xAI, Meta) on bare-metal GPU pricing. Strongest cluster networking story among hyperscalers.' },

  // ── AI-native serverless ────────────────────────────
  { id: 'modal', name: 'Modal', vendor: 'Modal Labs', type: 'ai-serverless', gpus: ['H200', 'H100', 'A100', 'A10', 'L4', 'L40S', 'T4'], pricingModel: 'Pay-per-second compute + $30/mo free credit', startingPrice: 'H100 from $3.95/hr; per-second billing', onDemand: true, spotPricing: false, regions: 'US (multi-region)', aiServices: ['serverless functions', 'instant cold-start GPU', 'volumes', 'web endpoints', 'cron jobs', 'distributed training'], bestFor: 'Python developers wanting serverless GPU without container ops', url: 'https://modal.com', notes: 'Per-second GPU billing with sub-second cold-start. Best Python developer ergonomics in the AI-serverless category.' },
  { id: 'replicate-compute', name: 'Replicate', vendor: 'Replicate', type: 'ai-serverless', gpus: ['H100', 'A100', 'A40', 'T4', 'CPU'], pricingModel: 'Pay-per-second on the model you run', startingPrice: 'H100 from $0.001525/sec ($5.49/hr)', onDemand: true, spotPricing: false, regions: 'US, EU', aiServices: ['model marketplace (40k+ models)', 'API endpoints', 'webhooks', 'fine-tuning'], bestFor: 'Image / video / voice model developers wanting one-API model serving', url: 'https://replicate.com', notes: 'Pay-per-second model serving with massive (40k+) catalog. Strong fit for media-generation pipelines.' },
  { id: 'beam', name: 'Beam', vendor: 'Beam.cloud', type: 'ai-serverless', gpus: ['H100', 'A100', 'A10G', 'T4'], pricingModel: 'Pay-per-second + monthly commit tiers', startingPrice: 'H100 from $3.40/hr; per-second', onDemand: true, spotPricing: false, regions: 'US', aiServices: ['serverless GPU functions', 'apps', 'persistent volumes', 'queues'], bestFor: 'Modal-alternative for teams wanting cheaper H100 per-second pricing', url: 'https://www.beam.cloud', notes: 'Younger Modal competitor. Slightly cheaper H100 per-second. Smaller library of preinstalled environments.' },

  // ── Specialized ─────────────────────────────────────
  { id: 'cerebras-cloud', name: 'Cerebras Cloud', vendor: 'Cerebras', type: 'specialized', gpus: ['CS-3 (WSE-3 wafer)'], pricingModel: 'Per-token API (proprietary inference)', startingPrice: 'Llama 3.3 70B at $0.85 input / $1.20 output per 1M', onDemand: true, spotPricing: false, regions: 'US', aiServices: ['ultra-fast inference', 'training service', 'Cerebras Inference Cloud'], bestFor: 'Inference workloads needing maximum tokens/sec on Llama-class models', url: 'https://cerebras.ai/inference', notes: 'Unique wafer-scale silicon. Fastest inference in production for sub-100B models (1500+ tokens/sec on Llama 3.3 70B).' },
  { id: 'sambanova', name: 'SambaNova Cloud', vendor: 'SambaNova', type: 'specialized', gpus: ['SN40L (in-house RDU)'], pricingModel: 'Per-token API + dedicated capacity', startingPrice: 'Llama 3.3 70B at $0.60 input / $1.20 output per 1M', onDemand: true, spotPricing: false, regions: 'US', aiServices: ['fast inference', 'fine-tuning service', 'private deployments'], bestFor: 'Enterprise inference; on-prem private cloud option', url: 'https://sambanova.ai/cloud', notes: 'Custom RDU silicon. Strong on-prem private deployment story. Less hype than Cerebras but solid customer list.' },
  { id: 'fireworks-compute', name: 'Fireworks Compute', vendor: 'Fireworks AI', type: 'ai-serverless', gpus: ['H200', 'H100'], pricingModel: 'Per-token (serverless) + dedicated reserved (per GPU-hour)', startingPrice: 'H100 reserved from $2.50/hr; serverless per-token varies', onDemand: true, spotPricing: false, regions: 'US, EU', aiServices: ['serverless model APIs', 'dedicated capacity', 'fine-tuning', 'multi-LoRA serving'], bestFor: 'Production inference on open-weights models with reserved capacity option', url: 'https://fireworks.ai', notes: 'Inference-first platform. Multi-LoRA serving (many fine-tunes share one base GPU) is the pricing differentiator.' },
];

export const COMPUTE_PROVIDERS_LAST_UPDATED = '2026-04-30';
