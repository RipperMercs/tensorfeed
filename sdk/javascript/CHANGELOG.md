# Changelog

All notable changes to the TypeScript / JavaScript SDK for [TensorFeed.ai](https://tensorfeed.ai). The full set of premium endpoints is documented at [tensorfeed.ai/developers/agent-payments](https://tensorfeed.ai/developers/agent-payments).

## 1.18.0 - 2026-05-04

### Changed
- `HFTrendingResponse` now includes a third section, `snapshot.spaces`: top 30 most-liked Hugging Face Spaces (hosted apps and demos) ranked by likes (the dominant popularity signal for non-downloadable assets). Each entry includes id, author, sdk (gradio / streamlit / static / docker), likes, tags, lastModified, private, runtime_stage (RUNNING / SLEEPING / BUILDING etc when surfaced), and hardware (cpu-basic / t4-small / a10g-large etc when surfaced). Also adds `summary.top_space_sdks`. New `HFSpaceEntry` type. Worker captures all three asset classes in a single 12:00 UTC cron.

## 1.17.0 - 2026-05-04

### Added
- `tf.getHotIssues()`. Free, no-auth method returning currently-hot GitHub issues across the AI ecosystem (five fan-out search queries on llm / ai-agents / large-language-models / machine-learning / transformer topics, is:issue is:open comments>=10 updated within the last 7 days, deduped by URL, top 30 by comment count). Refreshed daily at 12:30 UTC. Companion to `tf.getTrendingRepos()`: that returns repos gaining stars, this returns repos where active conversations are happening.
- `HotIssuesResponse` and `HotIssue` types.

## 1.16.0 - 2026-05-04

### Added
- `tf.getPapersAITrending()`, `tf.getPapersArxivRecent()`, `tf.getHFTrending()`. Three new free, no-auth methods covering daily AI/ML data feeds. `getPapersAITrending` returns Semantic Scholar's citation-ranked top 30 across five fan-out queries (LLM, transformer, RLHF, AI agents, diffusion). `getPapersArxivRecent` returns the 50 most recent arXiv submissions in cs.AI / cs.LG / cs.CL / cs.CV. `getHFTrending` returns the top 30 most-downloaded Hugging Face models and top 30 datasets. Refreshed daily at 11:00, 11:30, and 12:00 UTC respectively.
- `PapersAITrendingResponse`, `PapersAITrendingPaper`, `ArxivRecentResponse`, `ArxivPaper`, `HFTrendingResponse`, `HFModelEntry`, `HFDatasetEntry` types.

## 1.11.0 - 2026-04-27

### Added
- `tf.compareModels({ ids })` — side-by-side comparison of 2-5 models. Each entry returns pricing, benchmarks (normalized to a union of keys with `null` for missing scores so downstream code never crashes on undefined), provider live status, capabilities, context window, and recent news. Plus rankings by cheapest blended, most context, and per-benchmark leaderboard.
- `CompareModelsResponse`, `CompareEntry` (discriminated union), `CompareModelEntry`, `UnmatchedCompareEntry` types.

## 1.10.0 - 2026-04-27

### Added
- `tf.providerDeepDive(provider)` — everything about an AI provider in one call: live status with components, all models with pricing + tier + benchmark scores joined, recent news, agent traffic.
- `ProviderDeepDiveResponse`, `ProviderDeepDiveModel` types.

## 1.9.0 - 2026-04-27

### Added
- `tf.createDigestWatch({ cadence, callbackUrl, secret?, fireCap? })` — convenience helper for the new scheduled-digest watch type. `DigestWatchSpec` added to the `WatchSpec` discriminated union.

## 1.8.0 - 2026-04-27

### Added
- `tf.forecast({ target, model, field?, benchmark?, lookback?, horizon? })` — conservative statistical forecast for a price field or benchmark series with 95% prediction interval and confidence label.
- `ForecastResponse`, `ForecastPoint`, `ForecastTarget`, `ForecastField`, `ConfidenceLabel` types.

## 1.7.0 - 2026-04-27

### Added
- `tf.costProjection({ models, inputTokensPerDay, outputTokensPerDay, horizon? })` — project workload cost across 1-10 models with daily/weekly/monthly/yearly totals and a cheapest-monthly ranking.
- `CostProjectionResponse`, `CostHorizon`, `MatchedCostProjection`, `UnmatchedCostProjection` types.

## 1.6.0 - 2026-04-27

### Added
- `tf.newsSearch({ q?, from?, to?, provider?, category?, limit? })` — full-text search over the news article corpus with relevance scoring and date/provider/category filters.
- `NewsSearchResponse`, `NewsSearchResultItem` types.

## 1.5.0 - 2026-04-27

### Added
- `tf.usage()` — per-token call history (last 100 calls aggregated by endpoint).
- `UsageResponse`, `UsageEntry` types.

## 1.4.0 - 2026-04-27

### Added
- `tf.premiumAgentsDirectory({ category?, status?, sort?, limit?, ... })` — enriched agents catalog with live status, news, traffic, flagship pricing, and trending score.
- `PremiumAgentsDirectoryResponse`, `EnrichedAgentRecord`, `AgentsDirectorySort` types.

## 1.3.0 - 2026-04-27

### Added
- `tf.createWatch({ spec, callbackUrl, secret?, fireCap? })`, `tf.listWatches()`, `tf.getWatch(id)`, `tf.deleteWatch(id)` — webhook watches on price changes and status transitions. HMAC-signed POST delivery, 90-day TTL.
- `WatchSpec` discriminated union (`PriceWatchSpec | StatusWatchSpec`), `Watch`, `WatchCreateResponse`, `WatchListResponse`, `WatchGetResponse` types.
- `request<T>()` extended to support DELETE so `deleteWatch` uses the standard pipeline.

## 1.2.0 - 2026-04-27

### Added
- `tf.pricingSeries()`, `tf.benchmarkSeries()`, `tf.statusUptime()`, `tf.historyCompare()` — premium history endpoints.
- Full TypeScript types for every response: `PricingSeriesResponse`, `BenchmarkSeriesResponse`, `StatusUptimeResponse`, `CompareResponse` (discriminated union of pricing vs benchmarks).

## 1.1.0 — 2026-04-26 (initial release)

### Added
- Free-tier client and full premium tier with `tf.routing()`, `tf.buyCredits()`, `tf.confirm()`, `tf.balance()`.
- `PaymentRequired`, `RateLimited`, `TensorFeedError` typed exceptions.
- Native fetch only, zero runtime dependencies, Node 18+ or any modern browser.
