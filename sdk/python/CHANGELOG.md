# Changelog

All notable changes to the Python SDK for [TensorFeed.ai](https://tensorfeed.ai). The full set of premium endpoints is documented at [tensorfeed.ai/developers/agent-payments](https://tensorfeed.ai/developers/agent-payments).

## 1.20.0 - 2026-05-04

### Added
- `tf.get_papers_ai_trending()`, `tf.get_papers_arxiv_recent()`, `tf.get_hf_trending()`. Three new free, no-auth methods covering daily AI/ML data feeds. `papers_ai_trending` returns Semantic Scholar's citation-ranked top 30 across five fan-out queries (LLM, transformer, RLHF, AI agents, diffusion). `papers_arxiv_recent` returns the 50 most recent arXiv submissions in cs.AI / cs.LG / cs.CL / cs.CV. `hf_trending` returns the top 30 most-downloaded Hugging Face models and top 30 datasets. Refreshed daily at 11:00, 11:30, and 12:00 UTC respectively. Each daily snapshot is also keyed by date on the server, so a future premium time-series endpoint can read multi-day windows.

## 1.12.0 - 2026-04-27

### Added
- `tf.compare_models(ids=)` — side-by-side comparison of 2-5 models. Each entry returns pricing, benchmarks (normalized to a union of keys with `null` for missing scores so downstream code never crashes on undefined), provider live status, capabilities, context window, and recent news. Plus rankings by cheapest blended, most context, and per-benchmark leaderboard.

## 1.11.0 - 2026-04-27

### Added
- `tf.provider_deepdive(provider)` — everything about an AI provider in one call: live status with components, all models with pricing + tier + benchmark scores joined, recent news, agent traffic. Aggregation over four free endpoints in a single paid request.

## 1.10.0 - 2026-04-27

### Added
- `tf.create_digest_watch(cadence=, callback_url=, secret=, fire_cap=)` — convenience helper for the new scheduled-digest watch type. Daily or weekly cadence, fires HMAC-signed POST to your callback URL with a curated pricing-changes summary regardless of whether anything dramatic happened. Set-and-forget for agents that want periodic snapshots without subscribing to realtime transitions.

## 1.9.0 - 2026-04-27

### Added
- `tf.forecast(target=, model=, field=, benchmark=, lookback=, horizon=)` — conservative statistical forecast for a price field or benchmark series. Linear least-squares fit on 7-90 days of history projected forward 1-30 days with a 95% prediction interval and a confidence label so you can ignore low-signal forecasts.

## 1.8.0 - 2026-04-27

### Added
- `tf.cost_projection(models=, input_tokens_per_day=, output_tokens_per_day=, horizon=)` — project workload cost across 1-10 models with daily/weekly/monthly/yearly totals and a cheapest-monthly ranking.

## 1.7.0 - 2026-04-27

### Added
- `tf.news_search(q=, from_date=, to_date=, provider=, category=, limit=)` — full-text search over the AI news article corpus with relevance scoring (term hits weighted 3 in title, 1 in snippet, plus recency boost) and date/provider/category filters.

## 1.6.0 - 2026-04-27

### Added
- `tf.usage()` — per-token call history (last 100 calls aggregated by endpoint) for the human-facing /account dashboard or any agent monitoring its own spend.

## 1.5.0 - 2026-04-27

### Added
- `tf.premium_agents_directory(category=, status=, sort=, limit=, ...)` — enriched directory: catalog joined with live status, recent news, agent traffic, flagship pricing, and a 0-100 trending score per agent. Server-side filter and sort.

## 1.4.0 - 2026-04-27

### Added
- `tf.create_watch(spec=, callback_url=, secret=, fire_cap=)` — register a webhook watch on a price change or service status transition. HMAC-signed POST delivery, 90-day TTL, default fire cap 100, per-token cap of 25 active watches.
- `tf.list_watches()`, `tf.get_watch(watch_id)`, `tf.delete_watch(watch_id)` — manage active watches.

## 1.3.0 - 2026-04-27

### Added
- `tf.pricing_series(model=, from_date=, to_date=)`, `tf.benchmark_series(model=, benchmark=, from_date=, to_date=)`, `tf.status_uptime(provider=, from_date=, to_date=)`, `tf.history_compare(from_date=, to_date=, snapshot_type=)` — premium history endpoints with deltas, uptime rollups, and snapshot diffs.

## 1.2.0 - 2026-04-27

### Added
- `tf.purchase_credits(amount_usd=, private_key=, rpc_url=)` — optional `[web3]` extra. One-call quote + sign + broadcast + confirm via web3.py. Token auto-stored on the client.
- Initial premium tier support: `tf.routing()`, `tf.buy_credits()`, `tf.confirm()`, `tf.balance()`. Pay-per-call USDC on Base mainnet.
- All response types and `PaymentRequired`/`RateLimited`/`TensorFeedError` exception classes exported.

## 1.1.0 — 2026-04-26 (initial release)

### Added
- Free-tier client: `tf.news()`, `tf.status()`, `tf.is_down()`, `tf.models()`, `tf.benchmarks()`, `tf.history()`, `tf.routing_preview()`. No auth, no installs beyond stdlib.
