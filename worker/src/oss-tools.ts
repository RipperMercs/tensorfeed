/**
 * Open-source AI tools registry.
 *
 * Tools agents and developers actually install: model runtimes (Ollama,
 * LM Studio, vLLM, llama.cpp), inference servers, fine-tuning toolkits,
 * UIs, evaluation frameworks. Different from /api/frameworks (agent
 * frameworks) and /api/mcp-servers (MCP servers).
 *
 * Editorial; refreshed on redeploy.
 *
 * Served at /api/oss-tools (free, cached 600s).
 */

export interface OSSTool {
  id: string;
  name: string;
  vendor: string;
  category: 'runtime' | 'inference-server' | 'fine-tuning' | 'ui' | 'eval' | 'training' | 'observability' | 'edge';
  language: string;
  license: string;
  /** GitHub stars (k = thousand). */
  starsK: number;
  /** Latest stable version. */
  version: string;
  released: string;
  features: string[];
  url: string;
  github: string;
  notes: string;
}

export const OSS_TOOLS: OSSTool[] = [
  // ── Runtimes (local) ────────────────────────────────
  { id: 'ollama', name: 'Ollama', vendor: 'Ollama', category: 'runtime', language: 'Go', license: 'MIT', starsK: 105, version: '0.5.x', released: '2023-07', features: ['model library', 'one-line install', 'OpenAI-compatible API', 'GGUF native'], url: 'https://ollama.com', github: 'https://github.com/ollama/ollama', notes: 'Most-installed local LLM runtime. Mac / Linux / Windows. Curated model library; one command to pull and run.' },
  { id: 'lm-studio', name: 'LM Studio', vendor: 'LM Studio', category: 'runtime', language: 'TypeScript / C++', license: 'Proprietary (free)', starsK: 0, version: '0.3.x', released: '2023-05', features: ['GUI', 'GGUF + MLX', 'OpenAI-compatible server', 'multi-model loading'], url: 'https://lmstudio.ai', github: 'https://github.com/lmstudio-ai', notes: 'Polished desktop app. Best for non-CLI users running local models. Free for personal use; commercial license required.' },
  { id: 'llama-cpp', name: 'llama.cpp', vendor: 'Georgi Gerganov', category: 'runtime', language: 'C++', license: 'MIT', starsK: 75, version: '0.0.x (rolling)', released: '2023-03', features: ['GGUF', 'CPU + GPU + Metal', 'quantization', 'server mode'], url: 'https://github.com/ggerganov/llama.cpp', github: 'https://github.com/ggerganov/llama.cpp', notes: 'The reference open-source LLM inference engine. Originated GGUF format. Powers Ollama and most other local runtimes.' },
  { id: 'vllm', name: 'vLLM', vendor: 'UC Berkeley + community', category: 'inference-server', language: 'Python / CUDA', license: 'Apache-2.0', starsK: 36, version: '0.7.x', released: '2023-06', features: ['PagedAttention', 'continuous batching', 'tensor parallelism', 'OpenAI-compatible API', 'speculative decoding'], url: 'https://github.com/vllm-project/vllm', github: 'https://github.com/vllm-project/vllm', notes: 'Highest-throughput open-source inference server. Production default for self-hosted multi-GPU LLM serving.' },
  { id: 'sglang', name: 'SGLang', vendor: 'LMSYS Org + community', category: 'inference-server', language: 'Python / CUDA', license: 'Apache-2.0', starsK: 9, version: '0.4.x', released: '2024-01', features: ['RadixAttention', 'structured generation', 'MoE-optimized', 'tensor + expert parallelism'], url: 'https://github.com/sgl-project/sglang', github: 'https://github.com/sgl-project/sglang', notes: 'High-performance inference engine that often matches or beats vLLM throughput. Strong on MoE models (DeepSeek, Llama 4).' },
  { id: 'tgi', name: 'Text Generation Inference (TGI)', vendor: 'Hugging Face', category: 'inference-server', language: 'Rust', license: 'Apache-2.0', starsK: 9, version: '3.0.x', released: '2023-04', features: ['continuous batching', 'tensor parallelism', 'speculative decoding', 'LoRA serving'], url: 'https://github.com/huggingface/text-generation-inference', github: 'https://github.com/huggingface/text-generation-inference', notes: 'Hugging Face\'s production inference server. Powers HF Inference Endpoints. Multi-LoRA serving.' },
  { id: 'tei', name: 'Text Embeddings Inference', vendor: 'Hugging Face', category: 'inference-server', language: 'Rust', license: 'Apache-2.0', starsK: 3, version: '1.5.x', released: '2024-01', features: ['embedding model serving', 'reranker support', 'GPU + CPU', 'OpenAI-compatible API'], url: 'https://github.com/huggingface/text-embeddings-inference', github: 'https://github.com/huggingface/text-embeddings-inference', notes: 'Production embedding-server. Drop-in for OpenAI embeddings API. Faster than vanilla sentence-transformers.' },
  { id: 'mlx', name: 'MLX', vendor: 'Apple', category: 'runtime', language: 'Python / C++', license: 'MIT', starsK: 18, version: '0.21.x', released: '2023-12', features: ['Apple Silicon native', 'unified memory', 'lazy execution', 'distributed training'], url: 'https://github.com/ml-explore/mlx', github: 'https://github.com/ml-explore/mlx', notes: 'Apple\'s ML framework, optimized for M-series chips. Strong inference + fine-tuning on Mac Studio (128GB unified memory).' },
  { id: 'mlc-llm', name: 'MLC LLM', vendor: 'MLC AI Team', category: 'runtime', language: 'Python / C++', license: 'Apache-2.0', starsK: 19, version: '0.18.x', released: '2023-04', features: ['cross-platform compilation', 'WebGPU', 'Android + iOS deployment', 'TVM-based'], url: 'https://github.com/mlc-ai/mlc-llm', github: 'https://github.com/mlc-ai/mlc-llm', notes: 'Compile LLMs to run anywhere: web browsers (WebGPU), iOS, Android, embedded. Best fit for on-device inference research.' },
  { id: 'exllamav2', name: 'ExLlamaV2', vendor: 'turboderp', category: 'runtime', language: 'Python / C++', license: 'MIT', starsK: 4, version: '0.2.x', released: '2023-09', features: ['EXL2 quantization', 'speculative decoding', 'multi-GPU split'], url: 'https://github.com/turboderp/exllamav2', github: 'https://github.com/turboderp/exllamav2', notes: 'High-throughput inference for quantized models on consumer GPUs. EXL2 quantization is uniquely flexible per-layer.' },
  { id: 'kobold-cpp', name: 'KoboldCpp', vendor: 'LostRuins + community', category: 'runtime', language: 'C++', license: 'AGPL-3.0', starsK: 6, version: 'rolling', released: '2023-04', features: ['GGUF', 'creative writing UI', 'image gen', 'multimodal'], url: 'https://github.com/LostRuins/koboldcpp', github: 'https://github.com/LostRuins/koboldcpp', notes: 'Single-binary local LLM with creative-writing UI. Popular in roleplay / fiction communities.' },

  // ── Fine-tuning ─────────────────────────────────────
  { id: 'unsloth', name: 'Unsloth', vendor: 'Unsloth AI', category: 'fine-tuning', language: 'Python', license: 'Apache-2.0', starsK: 18, version: '2025.1', released: '2023-11', features: ['2x faster QLoRA', '50% less VRAM', 'Llama / Mistral / Qwen support', 'free Colab'], url: 'https://unsloth.ai', github: 'https://github.com/unslothai/unsloth', notes: 'Fastest open QLoRA fine-tuning library. Free tier runs on Google Colab. Strong adoption in indie fine-tuner community.' },
  { id: 'axolotl', name: 'Axolotl', vendor: 'OpenAccess AI Collective', category: 'fine-tuning', language: 'Python', license: 'Apache-2.0', starsK: 8, version: '0.7.x', released: '2023-05', features: ['YAML-driven config', 'LoRA + QLoRA + full SFT + DPO', 'multi-GPU', 'large-scale recipes'], url: 'https://axolotl.ai', github: 'https://github.com/axolotl-ai-cloud/axolotl', notes: 'YAML-config fine-tuning toolkit. The default for production-scale custom training runs.' },
  { id: 'torchtune', name: 'TorchTune', vendor: 'Meta', category: 'fine-tuning', language: 'Python', license: 'BSD-3-Clause', starsK: 4, version: '0.5.x', released: '2024-04', features: ['PyTorch-native', 'distributed training', 'LoRA + QLoRA + full', 'composable recipes'], url: 'https://github.com/pytorch/torchtune', github: 'https://github.com/pytorch/torchtune', notes: 'Meta\'s official PyTorch fine-tuning library. Pure-PyTorch (no abstractions). Strongest distributed-training story in OSS.' },

  // ── UIs ─────────────────────────────────────────────
  { id: 'open-webui', name: 'Open WebUI', vendor: 'Open WebUI community', category: 'ui', language: 'Python / Svelte', license: 'BSD-3-Clause', starsK: 53, version: '0.5.x', released: '2023-10', features: ['ChatGPT-style UI', 'Ollama integration', 'RAG', 'function calling', 'multi-user'], url: 'https://openwebui.com', github: 'https://github.com/open-webui/open-webui', notes: 'Most-deployed local LLM UI. Self-hostable; supports Ollama, OpenAI, and any compatible API. Multi-user out of the box.' },
  { id: 'librechat', name: 'LibreChat', vendor: 'Danny Avila', category: 'ui', language: 'TypeScript / Node', license: 'MIT', starsK: 23, version: '0.7.x', released: '2023-04', features: ['multi-provider', 'plugins', 'MCP support', 'workflows', 'agents'], url: 'https://www.librechat.ai', github: 'https://github.com/danny-avila/LibreChat', notes: 'Self-hosted multi-LLM chat UI. Strong agent + MCP integration in 2025. Production-ready alternative to ChatGPT for orgs that want control.' },
  { id: 'jan', name: 'Jan', vendor: 'Menlo Research', category: 'ui', language: 'TypeScript / Tauri', license: 'AGPL-3.0', starsK: 25, version: '0.5.x', released: '2024-01', features: ['offline-first', 'GGUF + Cortex backend', 'extensions', 'electron-style UI'], url: 'https://jan.ai', github: 'https://github.com/menloresearch/jan', notes: 'Local desktop AI app with offline-first ethos. Cortex backend; OpenAI-compatible API. Polished consumer-grade UX.' },

  // ── Evaluation ──────────────────────────────────────
  { id: 'lm-eval-harness', name: 'lm-evaluation-harness', vendor: 'EleutherAI', category: 'eval', language: 'Python', license: 'MIT', starsK: 9, version: '0.4.x', released: '2020-11', features: ['200+ benchmark tasks', 'multi-backend (HF, vLLM, OpenAI)', 'reproducible scoring', 'few-shot evaluation'], url: 'https://github.com/EleutherAI/lm-evaluation-harness', github: 'https://github.com/EleutherAI/lm-evaluation-harness', notes: 'The reference open-source eval harness. Powers HF Open LLM Leaderboard. The standard for "can I reproduce a benchmark score."' },
  { id: 'inspect-ai', name: 'Inspect AI', vendor: 'UK AISI', category: 'eval', language: 'Python', license: 'MIT', starsK: 1, version: '0.3.x', released: '2024-05', features: ['agentic eval', 'tool-use scoring', 'human-in-the-loop', 'reproducible runs'], url: 'https://inspect.ai-safety-institute.org.uk', github: 'https://github.com/UKGovernmentBEIS/inspect_ai', notes: 'UK AI Safety Institute\'s eval framework. Designed for agentic + tool-use evaluations. Used in their pre-deployment red-teams.' },
  { id: 'opik', name: 'Opik', vendor: 'Comet', category: 'observability', language: 'Python / TypeScript', license: 'Apache-2.0', starsK: 4, version: '1.5.x', released: '2024-09', features: ['LLM tracing', 'eval scoring', 'feedback loops', 'self-host or cloud'], url: 'https://www.comet.com/site/products/opik/', github: 'https://github.com/comet-ml/opik', notes: 'OSS LLM observability + evaluation. Trace any LangChain / LlamaIndex / OpenAI run. Free self-host; paid cloud tier.' },
  { id: 'langfuse', name: 'Langfuse', vendor: 'Langfuse', category: 'observability', language: 'TypeScript / Python', license: 'MIT', starsK: 8, version: '3.x', released: '2023-08', features: ['LLM tracing', 'prompt management', 'datasets + evals', 'self-host'], url: 'https://langfuse.com', github: 'https://github.com/langfuse/langfuse', notes: 'Most-deployed open LLM observability platform. Free self-host; managed cloud tier. Strong fit for LangGraph / LangChain stacks.' },

  // ── Image / Video UIs ───────────────────────────────
  { id: 'comfyui', name: 'ComfyUI', vendor: 'comfyanonymous', category: 'ui', language: 'Python', license: 'GPL-3.0', starsK: 65, version: '0.3.x', released: '2023-01', features: ['node-graph UI', 'diffusion model support', 'video', '3D extensions', 'custom nodes'], url: 'https://www.comfy.org', github: 'https://github.com/comfyanonymous/ComfyUI', notes: 'Node-based UI for diffusion models. The default for advanced image / video workflow construction. Powers most production creative pipelines.' },
  { id: 'sd-webui', name: 'AUTOMATIC1111 / Stable Diffusion WebUI', vendor: 'AUTOMATIC1111', category: 'ui', language: 'Python', license: 'AGPL-3.0', starsK: 145, version: '1.10.x', released: '2022-08', features: ['Stable Diffusion', 'extensions', 'LoRA', 'inpainting', 'animation'], url: 'https://github.com/AUTOMATIC1111/stable-diffusion-webui', github: 'https://github.com/AUTOMATIC1111/stable-diffusion-webui', notes: 'Most-installed Stable Diffusion UI. Massive plugin ecosystem. Slowly losing ground to ComfyUI and Forge for new workflows.' },

  // ── Edge / on-device ────────────────────────────────
  { id: 'onnxruntime', name: 'ONNX Runtime', vendor: 'Microsoft', category: 'edge', language: 'C++ / Python / Java', license: 'MIT', starsK: 16, version: '1.20.x', released: '2018-12', features: ['cross-platform', 'mobile + web', 'quantization', 'CPU + GPU'], url: 'https://onnxruntime.ai', github: 'https://github.com/microsoft/onnxruntime', notes: 'Production ONNX runtime. Best fit for deploying small models to mobile / browser / embedded. Powers Windows Copilot+.' },
  { id: 'tinygrad', name: 'tinygrad', vendor: 'tinycorp / George Hotz', category: 'training', language: 'Python', license: 'MIT', starsK: 28, version: '0.10.x', released: '2020-11', features: ['minimal ML framework', 'multiple accelerators', 'lazy compute graph'], url: 'https://tinygrad.org', github: 'https://github.com/tinygrad/tinygrad', notes: 'Minimalist deep learning framework. <10k LOC core. Backs Tinybox products (consumer-grade compute boxes).' },
];

export const OSS_TOOLS_LAST_UPDATED = '2026-04-30';
