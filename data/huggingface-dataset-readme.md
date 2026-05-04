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
---

# TensorFeed AI Ecosystem Daily

Daily snapshots of the AI ecosystem: news, model pricing, benchmarks, service status, GPU rental prices, MCP registry growth, LLM endpoint latency probes, agent traffic, and the AFTA adopter directory. Captured once per day from the public [tensorfeed.ai](https://tensorfeed.ai) API and committed to this repo as JSONL.

Each daily snapshot lives in a `YYYY-MM-DD/` subfolder with one JSONL file per feed plus a `manifest.json` summarizing what was captured.

## What's in here

| File | Records | Description |
|---|---|---|
| `news.jsonl` | up to 200 | AI news articles aggregated from major sources, snippets clipped, prompt-injection sanitized. |
| `models.jsonl` | ~230 | Model pricing and specs across all major labs. |
| `pricing.jsonl` | ~230 | Compact pricing payload for agents. |
| `status.jsonl` | ~12 | Real-time operational status of major AI services. |
| `benchmarks.jsonl` | ~15 | Public benchmark scores. |
| `agents-directory.jsonl` | ~18 | Curated AI agent directory. |
| `agents-activity.jsonl` | varies | Live AI bot traffic on tensorfeed.ai (ClaudeBot, GPTBot, Applebot, etc). |
| `podcasts.jsonl` | ~100 | Recent AI podcast episodes. |
| `trending-repos.jsonl` | ~20 | Trending GitHub repos in AI/ML. |
| `mcp-registry.jsonl` | 1 (summary) | Daily count + delta of the official MCP server registry. |
| `probe.jsonl` | varies | Last 24h of LLM endpoint latency measurements. |
| `gpu-pricing.jsonl` | varies | GPU rental price snapshot across cloud marketplaces. |
| `afta-adopters.jsonl` | varies | Sites publishing an AFTA manifest. |

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
