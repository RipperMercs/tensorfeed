---
language:
  - en
license: other
license_name: tensorfeed-inference-only
license_link: https://tensorfeed.ai/agent-fair-trade
pretty_name: TensorFeed AI Ecosystem Daily
size_categories:
  - 10K<n<100K
task_categories:
  - text-classification
  - text-generation
  - feature-extraction
  - text-retrieval
tags:
  - ai
  - news
  - llm
  - benchmarks
  - pricing
  - mcp
  - agents
  - timeseries
  - afta
  - x402
configs:
  - config_name: news
    data_files: '*/news.jsonl'
  - config_name: models
    data_files: '*/models.jsonl'
  - config_name: pricing
    data_files: '*/pricing.jsonl'
  - config_name: status
    data_files: '*/status.jsonl'
  - config_name: benchmarks
    data_files: '*/benchmarks.jsonl'
  - config_name: agents-directory
    data_files: '*/agents-directory.jsonl'
  - config_name: agents-activity
    data_files: '*/agents-activity.jsonl'
  - config_name: podcasts
    data_files: '*/podcasts.jsonl'
  - config_name: trending-repos
    data_files: '*/trending-repos.jsonl'
  - config_name: mcp-registry
    data_files: '*/mcp-registry.jsonl'
  - config_name: probe
    data_files: '*/probe.jsonl'
  - config_name: gpu-pricing
    data_files: '*/gpu-pricing.jsonl'
  - config_name: afta-adopters
    data_files: '*/afta-adopters.jsonl'
  - config_name: ai-hardware
    data_files: '*/ai-hardware.jsonl'
  - config_name: open-weights
    data_files: '*/open-weights.jsonl'
  - config_name: inference-providers
    data_files: '*/inference-providers.jsonl'
  - config_name: training-runs
    data_files: '*/training-runs.jsonl'
  - config_name: marketplaces
    data_files: '*/marketplaces.jsonl'
  - config_name: specialized-models
    data_files: '*/specialized-models.jsonl'
  - config_name: fine-tuning
    data_files: '*/fine-tuning.jsonl'
  - config_name: oss-tools
    data_files: '*/oss-tools.jsonl'
  - config_name: agent-apis
    data_files: '*/agent-apis.jsonl'
  - config_name: voice-leaderboards
    data_files: '*/voice-leaderboards.jsonl'
  - config_name: embeddings
    data_files: '*/embeddings.jsonl'
  - config_name: multimodal
    data_files: '*/multimodal.jsonl'
  - config_name: vector-dbs
    data_files: '*/vector-dbs.jsonl'
  - config_name: frameworks
    data_files: '*/frameworks.jsonl'
  - config_name: benchmark-registry
    data_files: '*/benchmark-registry.jsonl'
  - config_name: public-leaderboards
    data_files: '*/public-leaderboards.jsonl'
  - config_name: conferences
    data_files: '*/conferences.jsonl'
  - config_name: funding
    data_files: '*/funding.jsonl'
  - config_name: model-cards
    data_files: '*/model-cards.jsonl'
  - config_name: ai-policy
    data_files: '*/ai-policy.jsonl'
  - config_name: compute-providers
    data_files: '*/compute-providers.jsonl'
  - config_name: usage-rankings
    data_files: '*/usage-rankings.jsonl'
  - config_name: agent-provisioning
    data_files: '*/agent-provisioning.jsonl'
---

# TensorFeed AI Ecosystem Daily

Daily snapshots of the AI ecosystem: news, model pricing, benchmarks, service status, GPU rental prices, MCP registry growth, LLM endpoint latency probes, agent traffic, and the AFTA adopter directory. Captured once per day from the public [tensorfeed.ai](https://tensorfeed.ai) API and committed to this repo as JSONL.

Each daily snapshot lives in a `YYYY-MM-DD/` subfolder with one JSONL file per feed plus a `manifest.json` summarizing what was captured.

## What's in here

| File | Records | Description |
|---|---|---|
| `news.jsonl` | up to 200 | AI news articles aggregated from major sources, snippets clipped, prompt-injection sanitized. |
| `models.jsonl` | ~230 | Model pricing and specs across all major labs, flattened with provider name on each row. |
| `pricing.jsonl` | 1 (summary) | Compact pricing payload for agents. |
| `status.jsonl` | ~12 | Real-time operational status of major AI services. |
| `benchmarks.jsonl` | ~5 | Public benchmark scores per model. |
| `agents-directory.jsonl` | ~18 | Curated AI agent directory. |
| `agents-activity.jsonl` | varies | Live AI bot traffic on tensorfeed.ai (ClaudeBot, GPTBot, Applebot, etc). |
| `podcasts.jsonl` | ~50 | Recent AI podcast episodes. |
| `trending-repos.jsonl` | ~20 | Trending GitHub repos in AI/ML. |
| `mcp-registry.jsonl` | 1 (summary) | Daily count + delta of the official MCP server registry. |
| `probe.jsonl` | 1 (summary) | Last 24h of LLM endpoint latency measurements. |
| `gpu-pricing.jsonl` | 1 (summary) | GPU rental price snapshot across cloud marketplaces (Vast.ai, RunPod). |
| `afta-adopters.jsonl` | varies | Sites publishing an AFTA manifest. |
| `ai-hardware.jsonl` | ~17 | AI accelerator specs: NVIDIA Hopper/Blackwell, AMD Instinct, Google TPU, AWS Trainium, Apple, Cerebras, Groq. FLOPS, VRAM, memory bandwidth, list price. |
| `open-weights.jsonl` | ~9 | Production-ready open-weights models with quantization options (FP16/FP8/AWQ INT4/GGUF), VRAM requirement per quantization, recommended GPU class, license. |
| `inference-providers.jsonl` | ~8 | Hosted inference providers for open-weights models (Together, Fireworks, etc) with per-model pricing. |
| `training-runs.jsonl` | ~11 | Disclosed and estimated training cost catalog: parameters, training tokens, hardware, GPU hours, USD millions, costSource (disclosed vs estimated). |
| `marketplaces.jsonl` | ~12 | AI marketplace catalog: GPT Store, Claude Skills, HF Spaces, HF Models, Replicate, MCP Registry, etc. |
| `specialized-models.jsonl` | ~19 | Domain-specialized models (code, medical, legal, finance, music, 3D, retrieval). |
| `fine-tuning.jsonl` | ~12 | Fine-tuning providers (first-party + hosted) with training pricing per 1M tokens, methods, base models supported. |
| `oss-tools.jsonl` | ~25 | Production OSS tools agents and developers actually install (Ollama, llama.cpp, vLLM, Open WebUI, etc). |
| `agent-apis.jsonl` | ~29 | Non-LLM APIs agents commonly wire (Tavily, Brave, Exa, Firecrawl, OpenWeather, Stripe, Twilio, etc). |
| `voice-leaderboards.jsonl` | 1 (summary) | TTS Arena Elo + Open ASR Leaderboard WER rankings. |
| `embeddings.jsonl` | ~18 | Embedding + reranker model catalog. |
| `multimodal.jsonl` | ~24 | Image, video, TTS, STT model catalog with pricing. |
| `vector-dbs.jsonl` | ~12 | Vector database catalog (managed, OSS, hybrid). |
| `frameworks.jsonl` | ~15 | Agent framework catalog (LangChain, CrewAI, AG2, etc) with language + category. |
| `benchmark-registry.jsonl` | ~24 | Benchmark catalog with active/saturated status. |
| `public-leaderboards.jsonl` | ~20 | Pointers to every live public AI leaderboard. |
| `conferences.jsonl` | ~18 | AI conferences (research, industry, developer) with dates. |
| `funding.jsonl` | ~21 | AI funding rounds catalog by stage and category. |
| `model-cards.jsonl` | ~8 | Per-model system / safety / red-team document index. |
| `ai-policy.jsonl` | ~10 | AI regulation tracker (EU AI Act, US executive orders, etc). |
| `compute-providers.jsonl` | ~17 | GPU cloud, hyperscaler, AI-serverless, marketplace catalog. |
| `usage-rankings.jsonl` | ~20 | Model usage rankings (which models are actually winning). |
| `agent-provisioning.jsonl` | ~18 | Agent infrastructure providers (hosting, DB, auth, observability) by AFTA-style protocol status. |

## Quick start

```python
from datasets import load_dataset

# Latest news
news = load_dataset("tensorfeed/ai-ecosystem-daily", "news", split="train")

# Model pricing time series (load all dates, filter by date column or filename)
models = load_dataset("tensorfeed/ai-ecosystem-daily", "models", split="train")
```

## Update cadence

Snapshots commit at 08:00 UTC each day, fired by a GitHub Actions workflow in the [TensorFeed repo](https://github.com/RipperMercs/tensorfeed/blob/main/.github/workflows/huggingface-push.yml). One commit per day. The data itself is captured in the TensorFeed Worker via the daily 07:00 UTC `captureHistory` cron, so the file written here reflects state at roughly 07:00 UTC.

Cannot be backfilled. Every day without a snapshot is a day of history lost.

## License: inference-only

This dataset is released under TensorFeed's **inference-only** license. You may use it as input context for AI agents and LLM inference (RAG, evals, prompt context, agent tools). You may not use it as training data for foundation models without explicit written permission.

Read the full Agent Fair-Trade Agreement at [tensorfeed.ai/agent-fair-trade](https://tensorfeed.ai/agent-fair-trade) for the rationale, including the receipt-signing infrastructure and machine-payable upgrade path for paid endpoints.

## Live API

Everything in this dataset is also available as a live API. If you need fresher than daily, prefer the API:

- Free, no-auth: [tensorfeed.ai/developers](https://tensorfeed.ai/developers)
- Premium tier (USDC on Base): [tensorfeed.ai/developers/agent-payments](https://tensorfeed.ai/developers/agent-payments)
- OpenAPI 3.1 spec: [tensorfeed.ai/openapi.yaml](https://tensorfeed.ai/openapi.yaml)
- MCP server: `npm install -g @tensorfeed/mcp-server`

## Citation

```bibtex
@misc{tensorfeed_ai_ecosystem_daily,
  title  = {TensorFeed AI Ecosystem Daily},
  author = {{TensorFeed.ai}},
  year   = {2026},
  publisher = {Hugging Face},
  url    = {https://huggingface.co/datasets/tensorfeed/ai-ecosystem-daily}
}
```

Built with Claude (Anthropic). The full system, including the AFTA standard governing this dataset's license, was designed in collaboration with Claude. Source: [github.com/RipperMercs/tensorfeed](https://github.com/RipperMercs/tensorfeed).
