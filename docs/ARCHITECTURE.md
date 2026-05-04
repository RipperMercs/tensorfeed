# TensorFeed Architecture Reference

Detailed reference for the Worker, KV layout, endpoints, cron schedule, and subsystems. CLAUDE.md holds the rules; this file holds the encyclopedia. Read on demand.

## Worker Module Layout

`worker/src/` (Cloudflare Worker `tensorfeed-api`, deploys independently from the static site).

- `index.ts`: Worker entry, route handling, cron dispatcher
- `rss.ts`: RSS feed polling
- `status.ts`: Service status polling
- `catalog.ts`: Models / benchmarks / agents catalog
- `activity.ts`: Agent traffic tracking
- `alerts.ts`: Staleness watchdog plus daily email summary
- `snapshots.ts`: Rolling fallback snapshots (restore if live data fails)
- `history.ts`: Daily historical snapshots for premium products (Phase 0 of agent payments)
- `routing.ts`: Tier 2 routing recommendation engine plus free preview rate limiter
- `payments.ts`: Payment middleware (credits + x402 fallback), USDC on Base verification, daily rollup analytics
- `history-series.ts`: Premium history series (pricing/benchmark series, status uptime, snapshot diff)
- `watches.ts`: Premium webhook watches (register, predicate eval, HMAC-signed POST delivery, cron-driven dispatch)
- `agents-enriched.ts`: Premium enriched agents directory (joins catalog with status, news, activity, pricing; trending score; sort/filter)
- `news-search.ts`: Premium news search (tokenization, relevance scoring with title weight 3, snippet 1, recency boost; date/provider/category filters)
- `cost-projection.ts`: Premium cost projection (workload-to-spend math across 1-10 models, four horizons, cheapest-monthly ranking)
- `provider-deepdive.ts`: Premium provider deep-dive (aggregates pricing/benchmarks/status/news/activity for one provider in a single response)
- `compare-models.ts`: Premium model comparison (2-5 models side-by-side with pricing, benchmarks normalized to union-of-keys, status, news, plus rankings)
- `whats-new.ts`: Premium morning brief (1-7 day window, pricing diff, status incidents, top news, in one paid call)
- `mcp-registry.ts`: Daily MCP server registry telemetry (paginate registry.modelcontextprotocol.io, dedup by name keeping latest version, compute summary plus day-over-day deltas, store under mcp-reg:* prefix, expose range queries)
- `papers.ts`: Daily curated AI/ML research papers from the Semantic Scholar Graph API. Five broad fan-out queries (large language model, transformer, RLHF, AI agents, diffusion model), throttled at ~1 req/sec (free tier) or higher with optional `SEMANTIC_SCHOLAR_API_KEY`, deduped by paperId, ranked by citation count, top 30. Stores under `papers:*` prefix. Backs free `/api/papers/ai-trending`. Daily dated key `papers:daily:{YYYY-MM-DD}` compounds into a future premium time series.
- `arxiv.ts`: Daily snapshot of recent arXiv submissions in cs.AI / cs.LG / cs.CL / cs.CV. Single Atom API call (`https://export.arxiv.org/api/query`), entries parsed via regex (matches the rss.ts pattern), deduped by arxivId (versions stripped), sorted by publication date, top 50. Stores under `arxiv:*` prefix. Backs free `/api/papers/arxiv-recent`.
- `today-brief.ts`: Pure builder for the `/api/today` composite. Reads no KV itself; the route handler fans out to each daily-feed module's `getLatestSnapshot` plus the news + status caches in parallel, then passes the snapshots to `buildTodayBrief()` which produces a single structured response. Backs free `/api/today` with optional `?sections=` and `?limit=` query params (default all six sections, 3 items per section, max 10). Edge cache 5 min. Note: the MCP server's `get_ai_ecosystem_today` tool calls this endpoint instead of fanning out client-side, so the worker's edge cache absorbs concurrent agent load.
- `hf-daily-papers.ts`: Daily snapshot of Hugging Face's editor-curated "Daily Papers" feed via the public `huggingface.co/api/daily_papers` endpoint, no auth. Normalizer accepts both nested (`{ paper: {...}, ... }`) and flat shapes so a future API change is unlikely to break the capture. Top 30 ranked by upvotes (then comments, then title). Each paper carries upvotes, num_comments, ai_keywords, optional github_repo + stars. Titles pass through `sanitize.sanitizeTitle`. Stores under `hf-papers:*` prefix. Backs free `/api/papers/hf-daily`. Different signal from `arxiv.ts` (firehose) and `papers.ts` (Semantic Scholar citation-ranked).
- `hf-trending.ts`: Daily snapshot of top Hugging Face models, datasets, AND Spaces via the public HF JSON API (no auth). Models + datasets ranked by downloads (top 30 each); Spaces ranked by likes (top 30, since downloads is meaningless for hosted apps). Stores under `hf:*` prefix. Backs free `/api/hf/trending`. Once multiple daily snapshots accumulate, day-over-day deltas become a true trending signal computed over the dated keys. Spaces fetch is allowed to fail independently of models/datasets so a transient HF API hiccup on the Spaces endpoint does not invalidate the whole capture.
- `hot-issues.ts`: Daily snapshot of currently-hot GitHub issues across the AI ecosystem. Five fan-out search queries on `topic:llm`, `topic:ai-agents`, `topic:large-language-models`, `topic:machine-learning`, `topic:transformer` filtered to `is:issue is:open archived:false comments>=10 updated within the last 7 days`, sorted by comment count, deduped by URL, top 30. Uses `GITHUB_TOKEN` when present for the higher search rate limit (30/min authenticated vs 10/min unauthenticated). Stores under `issues:*` prefix. Backs free `/api/issues/hot`. Companion to `/api/trending-repos` (stars-gaining) and a future premium time-series candidate over the dated keys.
- `reddit-trending.ts`: Daily snapshot of currently-hot threads in 7 AI-relevant subreddits (LocalLLaMA, MachineLearning, ClaudeAI, OpenAI, singularity, artificial, AI_Agents) via the public Reddit JSON endpoint (no auth). Fan-out throttled at ~1 req/sec with a descriptive User-Agent. Stickied and NSFW posts filtered. Deduped by post id, top 30 by score. Titles pass through `sanitize.sanitizeTitle` at capture time so role-confusion tokens and bidi/zero-width spoofing in Reddit posts cannot reach a downstream agent. Stores under `reddit:*` prefix. Backs free `/api/reddit/trending`. Companion to `hot-issues.ts` on the community-discussion side.
- `openrouter-catalog.ts`: Daily snapshot of OpenRouter's normalized cross-provider model catalog. 200+ models across 50+ inference providers, single API call to `https://openrouter.ai/api/v1/models` (no auth). Each model carries per-token pricing (prompt + completion + image + request, parsed from string-valued fields into numbers), context window, modality, instruct_type, tokenizer, top-provider metadata (max_completion_tokens, is_moderated), and supported_parameters. Summary surfaces by_namespace, by_modality, cheapest_input/output (excluding free-tier zeros), largest_context, and free_tier_count. Stores under `or:*` prefix. Backs free `/api/openrouter/models`. Pairs with `/api/models` (curated frontier-lab catalog) by surfacing the long tail of OSS models on cloud inference. Future premium time series candidate over `or:daily:{date}` for tracking model availability and pricing drift.
- `probe.ts`: Active LLM endpoint probing (every 15 min POST a tiny prompt at each configured provider [Anthropic/OpenAI/Google/Mistral/Cohere], measure ttfb + total + status, append to 24h ring buffer, rewrite latest summary, daily roll-up to dated aggregate, per-provider daily call cap)
- `gpu-pricing.ts`: GPU rental price aggregation across cloud GPU marketplaces. Phase 1 sources: Vast.ai (unauthenticated) and RunPod (GraphQL, requires `RUNPOD_API_KEY`). Normalizes heterogeneous GPU naming into a canonical taxonomy (H200, H100, B200, A100-80GB, etc), refreshes every 4h, daily snapshot for the historical series. Backs free `/api/gpu/pricing`, `/api/gpu/pricing/cheapest`, premium `/api/premium/gpu/pricing/series`.
- `receipts.ts`: AFTA Ed25519 signing rail. Loads `RECEIPT_PRIVATE_KEY_JWK` Worker secret, signs canonical-JSON receipts on every premium response. Public key at `/.well-known/tensorfeed-receipt-key.json`. If secret is unset, premium responses ship without receipts (graceful, surfaced in `/api/meta`).
- `freshness.ts`: Per-endpoint freshness SLA registry. Each premium endpoint declares max data age. The premiumResponse() wrapper checks captured_at against the SLA; if stale, the deferred debit is skipped (no-charge), response is flagged with stale: true, and the no-charge event is logged.
- `spend-cap.ts`: Optional per-token daily credit-spend ceiling. Defense-in-depth on top of the circuit breaker (which limits request rate). A leaked token attached to a clever multi-isolate agent could otherwise drain a 1000-credit balance under the burn-rate threshold; the spend cap bounds damage to N credits per UTC day. Self-service via `/api/payment/spend-cap`. Daily counter at `pay:spend:{token}:{YYYY-MM-DD}` (TTL 48h). Cap is null/unset by default (back-compat). Race posture: read-inc-write across isolates can leak `~isolates*cost` credits over the cap, same tradeoff as the rate limiter and circuit breaker.
- `anomaly.ts`: Passive baseline-relative spend anomaly detector. Fills the gap between the per-minute circuit breaker (catches obvious abuse) and the per-day spend cap (only protects opted-in tokens). Maintains a rolling 7-day hourly spend buffer per token (`pay:hourly:{token}`, 168 entries cap). On every successful debit in `commitPayment`, increments the current-hour bucket and runs an assessment: median of all earlier buckets is the baseline; flag warning if current >= 5x baseline AND >= 20 credits; flag critical if current >= 10x baseline AND >= 50 credits. Both gates required so a token with a tiny baseline does not constantly false-positive on small spends. Tokens with <24h of buffer history are exempt (no_baseline). On flag, appends to `pay:anomaly:events` ring buffer (cap 200), deduped on (token, hour) so a single anomalous hour fires exactly one event. Surfaced via admin endpoint `/api/admin/anomalies?key=<ADMIN_KEY>&severity=warning|critical`. Privacy: events log a 16-char prefix of the bearer, never the full token.
- `podcasts.ts`: Podcast feed polling
- `trending.ts`: Trending GitHub repos
- `twitter.ts`: X/Twitter auto-posting
- `sources.ts`: Status page source definitions
- `chaos.ts`: Chaos engineering header layer
- `circuit-breaker.ts`: Premium request infinite-loop guard
- `rate-limit.ts`: IP rate limiter for free public traffic
- `sanitize.ts`: Prompt-injection sanitization for agent feed text
- `types.ts`: Shared Worker types (Env interface includes PAYMENT_WALLET, PAYMENT_ENABLED, BASE_RPC_URL)

Each `*.ts` has a sibling `*.test.ts` Vitest file where applicable.

`wrangler.toml`: Worker config, KV bindings, cron triggers, vars (PAYMENT_WALLET hardcoded).

## Cloudflare Workers KV Namespaces

- `TENSORFEED_NEWS` (`4924c4d8a64446cea111fd63a5b3455a`): articles, feeds, podcasts
- `TENSORFEED_STATUS` (`68eec8e4d37349a6adc1278c9280f653`): status pages, incidents
- `TENSORFEED_CACHE` (`4de30d8becd24b3bba9556b98bad8e69`): request cache, rate-limit state, misc, plus all agent-payments state under `pay:*` and `history:*` prefixes:
  - `history:{YYYY-MM-DD}:{type}`: daily snapshots (pricing, models, benchmarks, status, agent-activity)
  - `history:index`: ordered list of dates with snapshot data
  - `pay:credits:{token}`: `{ balance, created, last_used, agent_ua, total_purchased }` (no TTL)
  - `pay:tx:{txHash}`: `{ amount_usd, credits, token, block_number, created }` (no TTL, replay protection)
  - `pay:quote:{nonce}`: `{ amount_usd, credits, expires_at }` (30-min TTL)
  - `pay:rollup:{YYYY-MM-DD}`: daily revenue + usage rollup with per-endpoint breakdown and top-agents leaderboard
  - `pay:wallet-seen:{address}`: welcome bonus marker (no TTL)
  - `pay:purchases:{token}`: per-token purchase audit ring buffer, cap 100
  - `rate:routing-preview:{YYYY-MM-DD}:{ip}`: free preview rate limit counter (2-day TTL)
  - `mcp-reg:summary:{YYYY-MM-DD}`: daily MCP registry summary (counts, deltas, top namespaces)
  - `mcp-reg:servers:{YYYY-MM-DD}`: full deduped server list for that day (latest version per name); used by the next day's capture for delta computation
  - `mcp-reg:index`: ordered list of dates with MCP registry snapshot data
  - `papers:latest`: most recent curated AI/ML papers snapshot, served by `/api/papers/ai-trending`
  - `papers:daily:{YYYY-MM-DD}`: dated copy of the same snapshot for future premium time series
  - `papers:index`: ordered list of dates with AI papers snapshot data
  - `arxiv:latest`: most recent arXiv recent-submissions snapshot, served by `/api/papers/arxiv-recent`
  - `arxiv:daily:{YYYY-MM-DD}`: dated copy of the arXiv snapshot
  - `arxiv:index`: ordered list of dates with arXiv snapshot data
  - `hf-papers:latest`: most recent HF Daily Papers snapshot, served by `/api/papers/hf-daily`
  - `hf-papers:daily:{YYYY-MM-DD}`: dated copy of the HF Daily Papers snapshot
  - `hf-papers:index`: ordered list of dates with HF Daily Papers snapshot data
  - `hf:latest`: most recent Hugging Face top-models + top-datasets snapshot, served by `/api/hf/trending`
  - `hf:daily:{YYYY-MM-DD}`: dated copy of the HF snapshot, used for day-over-day download delta computation
  - `hf:index`: ordered list of dates with HF snapshot data
  - `issues:latest`: most recent hot AI GitHub issues snapshot, served by `/api/issues/hot`
  - `issues:daily:{YYYY-MM-DD}`: dated copy of the hot-issues snapshot
  - `issues:index`: ordered list of dates with hot-issues snapshot data
  - `reddit:latest`: most recent hot AI Reddit threads snapshot, served by `/api/reddit/trending`
  - `reddit:daily:{YYYY-MM-DD}`: dated copy of the Reddit snapshot
  - `reddit:index`: ordered list of dates with Reddit snapshot data
  - `or:latest`: most recent OpenRouter cross-provider model catalog snapshot, served by `/api/openrouter/models`
  - `or:daily:{YYYY-MM-DD}`: dated copy of the OpenRouter snapshot
  - `or:index`: ordered list of dates with OpenRouter snapshot data
  - `probe:buf:{provider}`: rolling 24h buffer of last 96 probe results per LLM provider (capped, so storage is bounded)
  - `probe:latest`: pre-computed last-24h summary across all providers, served by /api/probe/latest
  - `probe:daily:{YYYY-MM-DD}:{provider}`: daily aggregate per provider, served by /api/premium/probe/series
  - `probe:index`: ordered list of dates with probe daily data
  - `probe:budget:{YYYY-MM-DD}:{provider}`: per-provider per-day call counter, capped at 200 (36h TTL)
  - `gpu:current`: latest unified GPU pricing snapshot across all configured marketplaces, rewritten every 4h
  - `gpu:daily:{YYYY-MM-DD}`: dated daily snapshot for the premium series endpoint
  - `gpu:index`: ordered list of dates with GPU pricing snapshot data
  - `pay:no-charge:{YYYY-MM-DD}`: AFTA daily rollup of no-charge events (5xx, breaker, schema fail, stale data) with per-reason and per-endpoint counts plus the most-recent 200 events. Public via `/api/payment/no-charge-stats`.
  - `pay:no-charge:index`: ordered list of dates with no-charge data
  - `pay:spend:{token}:{YYYY-MM-DD}`: per-token daily credit-spend counter (TTL 48h). Backs the optional self-service spend cap.
  - `pay:revoked:{token}`: archive of credits records for self-revoked tokens (TTL 90 days). Audit trail for the token owner.
  - `pay:hourly:{token}`: rolling 7-day per-token spend buffer (cap 168 hourly buckets, no TTL). Backs the spend anomaly detector.
  - `pay:anomaly:events`: global ring buffer of detected anomaly events (cap 200, no TTL). Read-only via admin endpoint.

Optional: `OFAC_AUDIT_LOG` namespace for compliance audit trail beyond Workers' default ~3-day log retention. Screening helper writes conditionally so the unbound case is a no-op.

## Worker Cron Schedule

Defined in `worker/wrangler.toml`. All cron handlers dispatched from `worker/src/index.ts` `scheduled()` export.

- `*/5 * * * *`: Status page polling
- `*/10 * * * *`: RSS feed fetching
- `*/15 * * * *`: Active LLM endpoint probing (`probe.ts`). For each provider with a configured `PROBE_<PROVIDER>_KEY` secret, POST a single-token prompt to its chat endpoint, measure ttfb + total + status, append to a 24h ring buffer per provider, rewrite the latest summary. Per-provider daily call cap (200) prevents runaway spend. Backs free `/api/probe/latest` and premium `/api/premium/probe/series`.
- `0 * * * *`: Hourly full refresh (RSS + status + podcasts)
- `0 7 * * *`: Daily 7am UTC, models, benchmarks, agents catalog update (LiteLLM + HuggingFace), then daily history snapshot capture (`history.ts`)
- `30 8 * * *`: Daily 8:30am UTC, trending AI repos from GitHub
- `30 9 * * *`: Daily 9:30am UTC, MCP server registry telemetry capture (`mcp-registry.ts`). Paginates registry.modelcontextprotocol.io, dedups by name keeping isLatest, computes day-over-day deltas, stores under `mcp-reg:` prefix. Backs free `/api/mcp/registry/snapshot` and premium `/api/premium/mcp/registry/series`.
- `0 11 * * *`: Daily 11:00am UTC, AI/ML papers capture from Semantic Scholar (`papers.ts`). Five fan-out queries throttled at ~1 req/sec, deduped by paperId, ranked by citation count, top 30 stored under `papers:latest` and `papers:daily:{date}`. Backs free `/api/papers/ai-trending`.
- `30 11 * * *`: Daily 11:30am UTC, arXiv recent submissions capture (`arxiv.ts`). Single Atom API call across cs.AI/cs.LG/cs.CL/cs.CV, parsed and deduped by arxivId, top 50 stored under `arxiv:latest` and `arxiv:daily:{date}`. Backs free `/api/papers/arxiv-recent`.
- `0 12 * * *`: Daily 12:00 UTC, Hugging Face trending capture (`hf-trending.ts`). Top 30 most-downloaded models + top 30 most-downloaded datasets + top 30 most-liked Spaces stored under `hf:latest` and `hf:daily:{date}`. Backs free `/api/hf/trending`.
- `30 12 * * *`: Daily 12:30 UTC, hot AI GitHub issues capture (`hot-issues.ts`). Five fan-out search queries throttled, deduped by URL, top 30 by comment count stored under `issues:latest` and `issues:daily:{date}`. Backs free `/api/issues/hot`.
- `0 13 * * *`: Daily 13:00 UTC, hot AI Reddit threads capture (`reddit-trending.ts`). 7 fan-out subreddit fetches throttled, stickied + NSFW filtered, deduped by post id, top 30 by score. Backs free `/api/reddit/trending`.
- `0 14 * * *`: Daily 14:00 UTC, OpenRouter cross-provider model catalog capture (`openrouter-catalog.ts`). Single API call to `openrouter.ai/api/v1/models`, normalized into 200+ comparable model entries. Backs free `/api/openrouter/models`.
- `30 14 * * *`: Daily 14:30 UTC, HF Daily Papers capture (`hf-daily-papers.ts`). Editor-curated AI papers from huggingface.co/papers with community upvotes + discussion counts. Backs free `/api/papers/hf-daily`.
- `5 0 * * *`: Daily 12:05am UTC, roll yesterday's per-provider 24h probe buffer into a dated daily aggregate (`probe:daily:{date}:{provider}`) for the premium probe series endpoint.
- `15 */4 * * *`: GPU pricing refresh (`gpu-pricing.ts`). Polls Vast.ai (public) and RunPod (when `RUNPOD_API_KEY` is set), normalizes GPU names into the canonical taxonomy, writes the unified snapshot to `gpu:current`. Backs free `/api/gpu/pricing` and `/api/gpu/pricing/cheapest`.
- `45 0 * * *`: Daily 12:45am UTC, capture daily GPU pricing snapshot for the historical series. Backs premium `/api/premium/gpu/pricing/series`. Cannot be backfilled.
- `30 14 * * *`: Daily 2:30pm UTC, X/Twitter post (1/day, see X posting rules below)

## Data Flow

1. Worker cron polls RSS, status pages, podcasts, trending repos. Writes to KV.
2. Worker exposes that data at `/api/*` endpoints.
3. Next.js `prebuild` step (`scripts/fetch-feeds.ts`) pulls the latest from the Worker API and writes snapshots to `data/*.json`.
4. Next.js build bakes `data/*.json` into the static export so pages render correctly even if the Worker is down.
5. Client-side components (e.g. HomeFeed) hydrate with fresh data from `/api/news` after mount.

Fallback: Worker keeps rolling snapshots in KV. If a live poll returns empty or fails, `snapshots.ts` restores the previous known-good payload so the public API never serves blank data. `alerts.ts` sends an email if news staleness exceeds thresholds and sends a daily ops summary.

## Subsystems

### Agent Fair-Trade Agreement (AFTA)

TensorFeed publishes and self-adopts the Agent Fair-Trade Agreement, an open standard for API publishers fair to AI agents. Three pillars, all enforced in code:

1. **No-charge guarantees**, codified in `worker/src/payments.ts` (`commitPayment` + deferred-debit model). 5xx, circuit breaker trips, schema validation failures, and stale data all skip the credit debit. Every event is logged to `pay:no-charge:{YYYY-MM-DD}` and exposed at `/api/payment/no-charge-stats` as a public, auditable record.
2. **Ed25519-signed receipts** on every premium response (`worker/src/receipts.ts`). Canonical JSON + asymmetric signing means agents verify with no shared secret. Public key at `/.well-known/tensorfeed-receipt-key.json`. Verify endpoint at `/api/receipt/verify`. If the worker secret `RECEIPT_PRIVATE_KEY_JWK` is unset, premium responses ship without receipts (graceful, surfaced in `/api/meta`).
3. **Public on-chain payment rail** (USDC on Base mainnet). Every credit purchase leaves an immutable record on the Base block explorer. Receipt rail and on-chain rail are independent attestations.

Per-endpoint freshness SLAs live in `worker/src/freshness.ts`. Adding a new premium endpoint requires declaring its SLA there (or null for compute-only / immutable endpoints).

The standard manifest is at `/.well-known/agent-fair-trade.json`. The adoption schema other publishers can use is at `/.well-known/agent-fair-trade-schema.json`. Manifesto page: `/agent-fair-trade`.

Bootstrap procedure for the receipt keypair: run `node worker/scripts/generate-receipt-key.mjs`, paste the printed private JWK into `wrangler secret put RECEIPT_PRIVATE_KEY_JWK`, replace `public/.well-known/tensorfeed-receipt-key.json` with the printed public JWK, deploy.

### Chaos Engineering Headers (free, all endpoints)

`worker/src/chaos.ts` short-circuits the worker before any route dispatch when a request includes a chaos header. `X-TensorFeed-Simulate-Error: <400-599>` returns the requested status code with a body that declares the response is simulated; the response includes `X-TensorFeed-Simulated: true`. `X-TensorFeed-Simulate-Latency: <ms>` sleeps the requested duration before continuing (capped at 10000ms via `CHAOS_LIMITS.MAX_LATENCY_MS`). Both headers are free, no-auth, and never charge credits because the simulated-error path returns before `requirePayment` runs. Wired in `index.ts` at the top of `fetch()`. Tests in `chaos.test.ts`. Documented on `/developers/agent-payments#chaos-engineering` and `/api/meta`.

### Circuit Breaker (premium endpoints)

`worker/src/circuit-breaker.ts` is an in-memory, isolate-local sliding-window counter that trips after 20 identical premium requests from a single bearer token in 60 seconds. Tripping returns HTTP 429 `infinite_loop_detected` with a 120-second cooldown and a `Retry-After` header, and no credits are charged. The fingerprint is `(token-prefix-16, path, sorted-query)`; bodies are not hashed (all premium endpoints are GET today). Wired into `requirePayment` in `payments.ts` between token validation and balance debit via the `checkRequestCircuit` helper, so the breaker fires before any KV write. State is GC'd when the tracker exceeds `MAX_TRACKED_KEYS=5000`. Distributed loops across isolates leak through (acceptable tradeoff to avoid burning KV ops budget). Tests in `circuit-breaker.test.ts`. Documented on `/developers/agent-payments#circuit-breaker` and `/api/meta`.

### IP Rate Limit (free public API)

`worker/src/rate-limit.ts` is an in-memory, isolate-local per-IP counter that caps free public traffic at 120 requests per minute per IP. Wired in `fetch()` in `index.ts` between the chaos layer and route dispatch via `checkIPRateLimit(ip)`. Premium, payment, internal, and admin paths are exempt (`isRateLimitExempt`). Every non-exempt response carries the standard `RateLimit-Limit`, `RateLimit-Remaining`, `RateLimit-Reset` headers plus the legacy `X-RateLimit-*` aliases so well-behaved agents can pace themselves; on a 429 the response also sets `Retry-After`. Soft GC after `MAX_TRACKED_IPS=50000`. Distributed bursts across PoPs can exceed the per-isolate cap (acceptable tradeoff vs. burning KV ops). Tests in `rate-limit.test.ts`. Documented on `/developers/agent-payments#rate-limits` and `/api/meta`.

### Prompt-Injection Sanitization (agent endpoints)

`worker/src/sanitize.ts` scrubs aggregated feed text at read time before it leaves `/api/news`, `/api/agents/news`, `/feed.xml`, `/feed.json`, and `/feed/*.xml`. Strips ASCII control chars (preserves \n \r \t), bidi/zero-width spoofing chars (U+200B-200F, U+202A-202E, U+2060-206F, U+FEFF), and neutralizes role-confusion tokens (`<|im_start|>`, `<|im_end|>`, `[INST]`, `<<SYS>>`, line-leading `system:` / `developer:` / `assistant:`, and `ignore (all) (previous|prior|above) instructions`). Title is capped at 300 chars, snippet at 800. URL, source, dates, and categories pass through untouched. Applied at the edge so we can update rules without re-polling RSS. The agent JSON payload advertises `sanitization: "enabled"` so callers can verify the layer is on. Tests in `sanitize.test.ts`. Documented on `/developers/agent-payments#prompt-injection-sanitization` and `/api/meta`.

### Static-Site Security Headers

`public/_headers` is the Cloudflare Pages headers manifest applied to every static response. Set globally: `X-Content-Type-Options: nosniff`, `X-Frame-Options: DENY`, `Referrer-Policy: strict-origin-when-cross-origin`, a hardened `Permissions-Policy`, `Strict-Transport-Security: max-age=63072000; includeSubDomains; preload`, `Cross-Origin-Opener-Policy: same-origin-allow-popups` (AdSense-compatible), `Cross-Origin-Resource-Policy: cross-origin`, and a strict `Content-Security-Policy` that allow-lists `'self'`, AdSense (`pagead2.googlesyndication.com`, `*.googlesyndication.com`, `*.googleadservices.com`, `*.doubleclick.net`), Cloudflare insights (`static.cloudflareinsights.com`), and Google Fonts (`fonts.googleapis.com` / `fonts.gstatic.com`). `frame-ancestors 'none'` blocks clickjacking; `object-src 'none'` blocks Flash-style inclusions; `upgrade-insecure-requests` rewrites mixed-content fetches. Public feed/llms paths get `Access-Control-Allow-Origin: *` so agents can fetch them cross-origin.

### View as Agent toggle (frontend)

Every page has a `HUMAN | AGENT` toggle in the navbar (and in the mobile menu). When toggled, a terminal-style overlay (`src/components/AgentView.tsx`) takes over the viewport and shows the raw API JSON powering the current route, the response status line, response headers, and the equivalent `curl` command. Route to endpoint mapping lives in `getRouteEndpoints` inside `AgentView.tsx`; default is `/api/meta`. Multiple endpoints per route are supported via clickable pills. Preference is persisted in a `view-mode` cookie and applied early via the inline script in `src/app/layout.tsx` to prevent flash. CSS lives in the View as Agent overlay block in `src/app/globals.css` (scanlines, CRT flicker, JSON syntax classes). State is held in `src/components/ViewModeProvider.tsx`. This is a DX/marketing feature, not a separate API surface; the data is the same `/api/*` endpoints documented below.

## Design System

```
--bg-primary:      #0a0a0f
--bg-secondary:    #12121a
--bg-tertiary:     #1a1a2e
--text-primary:    #e2e8f0
--accent-primary:  #6366f1  /* indigo */
--accent-secondary:#8b5cf6  /* violet */
--accent-green:    #10b981  /* status OK */
--accent-red:      #ef4444  /* status down */
--accent-amber:    #f59e0b  /* status degraded */
```

Source color coding (left border on article cards):
- Anthropic: coral/orange
- OpenAI: green
- Google: blue
- Hacker News: orange
- The Verge: purple
- TechCrunch: green
- HuggingFace: yellow
- NVIDIA: lime

Typography: JetBrains Mono for numbers, code, pricing tables, and status badges. Inter for body and headings.

## API Endpoints

All mounted under `https://tensorfeed.ai/api/*` via the Worker. Authoritative machine-readable list lives at `/api/meta`; the human reference is `/developers` and `/developers/agent-payments`.

**Free, no auth:**
- `/api/news`: Articles. Supports `?category=` and `?limit=`
- `/api/status`, `/api/status/summary`: Live service status for tracked providers
- `/api/models`: Model pricing, context windows, specs
- `/api/benchmarks`: AI model benchmark scores
- `/api/incidents`: Historical incident database
- `/api/agents/activity`, `/api/agents/news`, `/api/agents/status`, `/api/agents/pricing`, `/api/agents/directory`: Agent-friendly aliases
- `/api/podcasts`, `/api/trending-repos`
- `/api/health`, `/api/ping`, `/api/meta`, `/api/cron-status`, `/api/snapshots`, `/api/alerts-status`
- `/api/history`, `/api/history/{YYYY-MM-DD}/{type}`: Daily historical snapshots (Phase 0 of agent payments)
- `/api/mcp/registry/snapshot`: Today's summary of the official MCP server registry. Captured daily at 9:30 AM UTC. Bootstraps a live capture on cold start so it never returns empty.
- `/api/papers/ai-trending`: Daily curated AI/ML papers from Semantic Scholar, ranked by citation count. Five fan-out queries (LLM, transformer, RLHF, AI agents, diffusion). Captured daily at 11:00 AM UTC. Bootstraps a live capture on cold start so it never returns empty.
- `/api/papers/arxiv-recent`: 50 most recent arXiv submissions in cs.AI / cs.LG / cs.CL / cs.CV from the Atom API, parsed and deduped by arxivId. Captured daily at 11:30 AM UTC. Bootstraps a live capture on cold start.
- `/api/papers/hf-daily`: HF's editor-curated daily AI papers feed with community upvotes + discussion counts. Top 30 by upvotes. Captured daily at 14:30 UTC. Bootstraps a live capture on cold start.
- `/api/today`: Composite "AI ecosystem today" brief. Fans out across every daily feed and returns a structured response in one request. Optional `?sections=` filter and `?limit=` per section. Edge cache 5 min.
- `/api/hf/trending`: Top Hugging Face models, datasets, and Spaces (top 30 each). Models/datasets ranked by downloads, Spaces by likes. Captured daily at 12:00 UTC against the public HF API. Bootstraps a live capture on cold start.
- `/api/issues/hot`: Currently-hot GitHub issues across the AI ecosystem (top 30 by comment count). Five fan-out search queries on AI topics, filtered to is:issue is:open with comments>=10 and activity within the last 7 days. Captured daily at 12:30 UTC. Bootstraps a live capture on cold start.
- `/api/reddit/trending`: Currently-hot threads in 7 AI-relevant subreddits (LocalLLaMA, MachineLearning, ClaudeAI, OpenAI, singularity, artificial, AI_Agents). Stickied and NSFW posts filtered, deduped by post id, top 30 by score. Captured daily at 13:00 UTC. Bootstraps a live capture on cold start.
- `/api/openrouter/models`: OpenRouter cross-provider model catalog (200+ models across 50+ inference providers) normalized with per-token pricing, context window, modality, and provider metadata. Captured daily at 14:00 UTC. Bootstraps a live capture on cold start.
- `/api/probe/latest`: Last 24h of measured LLM endpoint latency and availability per provider. Refreshed every 15 min by the probe cron. Returns 503 with explanatory body if no PROBE_*_KEY secrets are configured.
- `/api/gpu/pricing`: Aggregated GPU rental pricing across cloud GPU marketplaces (Vast.ai + RunPod). Cheapest on-demand and spot per canonical GPU class. Refreshed every 4 hours.
- `/api/gpu/pricing/cheapest?gpu=H100&type=on_demand|spot`: Top 3 cheapest current offers for one canonical GPU. Agent-friendly entry point.
- `/api/preview/routing?task=code|reasoning|creative|general&budget=&min_quality=`: Free top-1 routing recommendation (5 calls/day per IP)
- `/api/payment/info`: Wallet, pricing tiers, supported flows, verification metadata
- `/api/payment/buy-credits` (POST): Generate a 30-min payment quote with memo nonce
- `/api/payment/confirm` (POST): Verify USDC tx on-chain, mint a bearer token
- `/api/payment/balance`: Read remaining credits for the current bearer token
- `/api/payment/usage`: Per-token call history (last 100 calls aggregated by endpoint). Auth required, no credit cost. Powers the human /account dashboard.
- `/api/payment/history`: Per-token credit-purchase audit log. Auth required, no credit cost. Backed by `pay:purchases:{token}` ring buffer (cap 100); tokens minted before this ledger existed return an empty `purchases` array but still expose `current_balance` and `token_short`.
- `/api/payment/spend-cap` (GET / POST): Self-service per-token daily credit-spend cap. GET reads current cap, today's spend, remaining, reset_at, and balance. POST body `{ daily_cap: number | null }` sets the cap; `null` or `0` clears. Auth required, no credit cost.
- `/api/payment/revoke` (POST): Self-service token revocation. Burns the caller's own bearer token immediately; the credits record is archived under `pay:revoked:{token}` for 90 days. Auth required, no credit cost. Use this if a token is suspected leaked.
- `/api/alerts/subscribe`: Outage alert email signup

**Paid (USDC on Base, credits-first), all 1 credit unless noted:**
- `/api/premium/routing`: Tier 2 routing engine. Top-N ranked recommendations with full composite score breakdown.
- `/api/premium/history/pricing/series?model=&from=&to=`: Daily input/output/blended price points for one model. Range capped at 90 days.
- `/api/premium/history/benchmarks/series?model=&benchmark=&from=&to=`: Score evolution for a single benchmark on one model.
- `/api/premium/history/status/uptime?provider=&from=&to=`: Daily uptime % for one provider (degraded counts as half) with incident-day list.
- `/api/premium/watches` (POST): Body `{ spec, callback_url, secret?, fire_cap? }`. Spec is `{ type: "price"|"status"|"digest", ... }`. Watch lives 90 days, default fire cap 100. HMAC-signed POST delivery.
- `/api/premium/watches` (GET): List watches owned by the bearer token. Free.
- `/api/premium/watches/{id}` (GET|DELETE): Read or remove an owned watch. Free.
- `/api/premium/agents/directory?category=&status=&open_source=&capability=&sort=&limit=`: Enriched agents catalog. Sorts: trending, alphabetical, status, price_low, price_high, news_count.
- `/api/premium/news/search?q=&from=&to=&provider=&category=&limit=`: Full-text search. Default limit 25, max 100.
- `/api/premium/cost/projection?model=&input_tokens_per_day=&output_tokens_per_day=&horizon=`: Workload cost projection across 1-10 models (CSV in `model`).
- `/api/premium/providers/{name}`: One provider's complete profile in one call.
- `/api/premium/compare/models?ids=`: Side-by-side comparison of 2-5 models with rankings.
- `/api/premium/whats-new?days=&news_limit=`: Agent morning brief, 1-7 day window.
- `/api/premium/mcp/registry/series?from=&to=`: Multi-day time series of the official MCP server registry. Range capped at 90 days. Cannot be backfilled (depends on daily capture).
- `/api/premium/probe/series?provider=&from=&to=`: Daily measured-SLA series. Range capped at 90 days. Provider must be one of anthropic, openai, google, mistral, cohere.
- `/api/premium/gpu/pricing/series?gpu=&from=&to=`: Daily price series for one canonical GPU across all tracked marketplace providers. Cheapest on-demand and spot per day, provider count, total offers, plus pct change. Range capped at 90 days. Cannot be backfilled.

**Admin (auth-gated via `?key=<ADMIN_KEY>`):** `ADMIN_KEY` is a Worker secret, constant-time compare, default-denies if unset.
- `/api/admin/usage?date=YYYY-MM-DD`: Daily revenue + usage rollup
- `/api/admin/usage/dates`: List of dates with rollup data
- `/api/admin/burn-token?token=tf_live_...`: Invalidate a bearer token
- `/api/admin/anomalies[&severity=warning|critical]`: Read-only event log of detected per-token spend anomalies (cap 200, newest first). Each event records a 16-char token prefix, hour, severity, observed multiplier, and the baseline median that was exceeded. See `anomaly.ts`.
- `/api/refresh[?task=history]`: Manual data refresh / history capture trigger

**Internal (server-to-server only, NOT in `/api/meta` or `/llms.txt`):**
- `/api/internal/validate-and-charge` (POST): Sister-site Workers (TerminalFeed, future VR.org, etc) call with `X-Internal-Auth: ${SHARED_INTERNAL_SECRET}`. Body: `{ token, cost, endpoint }`. Always HTTP 200 with `{ok: true|false, ...}`; only 401/405/400 for auth/method/body failures. Auth check runs before body parsing so 401 does not leak endpoint existence. Backed by `validateAndCharge` in `payments.ts`.
- `/api/internal/track-bot` (POST): Receives bot hits from Cloudflare Pages Functions middleware at `functions/_middleware.ts` so static editorial / SEO route hits land in the same buffer as Worker-route hits. Body: `{ bot, path }`. `X-Internal-Auth: ${PAGES_TRACK_SECRET}`. Calls `trackBotHitDirect()` in `activity.ts`. The middleware skips API/feed paths so we never double-count.

Every new endpoint MUST be documented on `/developers` (or `/developers/agent-payments` for paid endpoints), added to `/api/meta`, and linked from `public/llms.txt`.

## RSS Sources

12 active sources defined in `data/sources.json`. Worker reads this list on every poll.

Anthropic Blog, OpenAI Blog, Google AI Blog, Meta AI Blog, HuggingFace Blog, TechCrunch AI, The Verge AI, Ars Technica, VentureBeat AI, NVIDIA AI Blog, ZDNet AI, Hacker News (AI-filtered via hnrss.org).

To add a source: append to `data/sources.json` with `id`, `name`, `url`, `domain`, `icon`, `categories`, `active: true`. Worker picks it up on next poll, no code change needed.

## Pages

Authoritative list lives in `src/app/sitemap.ts`. Major buckets:

- **Main**: `/`, `/models`, `/agents`, `/research`, `/status`, `/live`, `/originals`, `/today`, `/timeline`, `/podcasts`
- **Tools**: `/tools/cost-calculator`, `/tools/trending`, `/benchmarks`, `/ask`, `/alerts`, `/incidents`, `/compare`, `/gpu-pricing`
- **Status pillar pages**: `/is-claude-down`, `/is-chatgpt-down`, `/is-gemini-down`, `/is-copilot-down`, `/is-perplexity-down`, `/is-cohere-down`, `/is-mistral-down`, `/is-huggingface-down`, `/is-replicate-down`, `/is-midjourney-down`
- **SEO guides**: `/what-is-ai`, `/best-ai-tools`, `/best-ai-chatbots`, `/ai-api-pricing-guide`, `/what-are-ai-agents`, `/best-open-source-llms`
- **Editorial originals**: under `/originals/*`
- **Hubs**: `/agi-asi`, `/model-wars`
- **Meta/legal**: `/about`, `/privacy`, `/terms`, `/contact`, `/developers`, `/developers/agent-payments`, `/account` (human credits dashboard, noindex), `/changelog`
- **Agent acquisition**: `/for-ai-agents`, `/glossary` + `/glossary/{x402,mcp,agent-payments}`, `/openapi.json`, `/benchmarks/[name]` (per-benchmark leaderboards auto-generated from data/benchmarks.json via `getAllBenchmarkSlugs()` in `src/lib/benchmark-directory.ts`)
- **Meta editorial**: `/claude-md-guide`, `/claude-md-generator`, `/claude-md-examples`

## Feeds & Agent Discovery

- `https://tensorfeed.ai/feed.xml`: main RSS
- `https://tensorfeed.ai/feed.json`: JSON Feed 1.1
- `https://tensorfeed.ai/feed/research.xml`: research-only RSS
- `https://tensorfeed.ai/feed/tools.xml`: tools-only RSS
- `https://tensorfeed.ai/llms.txt`: agent discovery manifest
- `https://tensorfeed.ai/llms-full.txt`: full agent-readable site dump (regenerated each build by `scripts/generate-llms-full.ts`)
- `https://tensorfeed.ai/.well-known/x402.json`: x402 V2 discovery manifest. Lists every paid endpoint with input/output schemas, USDC payment specs, and per-call price. CDP Bazaar facilitators and x402 agents auto-index from this URL. Also served at `/.well-known/x402` without extension. Source: `public/.well-known/x402.json`.
- `https://tensorfeed.ai/sitemap.xml`: generated by `src/app/sitemap.ts`
- `https://tensorfeed.ai/robots.txt`: welcomes GPTBot, ClaudeBot, PerplexityBot, etc by name

## SEO

- `sitemap.xml` generated dynamically from `src/app/sitemap.ts` (45+ URLs)
- `robots.txt` explicitly welcomes all AI crawlers by name
- `llms.txt` and `llms-full.txt` for agent discovery
- IndexNow integration, auto-pings on content change (key in `worker/wrangler.toml` vars)
- Cloudflare Crawler Hints enabled
- FAQPage schema on all pillar/guide pages
- Article schema on all `/originals` posts
- WebSite + Organization schema in root layout
- Google Search Console and Bing Webmaster Tools verified

## Agent Payments (Phase 1, shipped 2026-04-27)

TensorFeed sells premium API access to AI agents via USDC on Base mainnet. No accounts, no API keys, no traditional payment processors. Decision locked 2026-04-27: USDC-only, no Stripe.

**Wallet:** `0x549c82e6bfc54bdae9a2073744cbc2af5d1fc6d1` (Rabby on Base, self-custodied)
**USDC contract on Base:** `0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913`
**Pricing:** 50 credits per $1 USDC base rate. Volume discounts at $5 (10%), $30 (25%), $200 (40%). Tier 2 routing currently 1 credit per call.

**Welcome bonus (shipped 2026-04-29):** Brand-new sender wallets get 50 free credits ($1.00 of value) on their first successful USDC payment, on top of the base rate. Applied automatically on both `/api/payment/confirm` and the x402 fallback. Backed by `pay:wallet-seen:{address}` (no TTL) marker in `TENSORFEED_CACHE`. The `confirmPayment` response surfaces `welcome_bonus_credits` and `is_first_payment` so SDKs can show the bonus to users. Helpers `checkAndMarkFirstPayment` and `markWalletSeen` are exported from `payments.ts` for unit testing. Race condition (two simultaneous first payments from the same wallet both seeing null marker) is accepted; worst case is one extra $1 of credits, capped per wallet.

Architecture (full detail in `AGENT-PAYMENTS-SPEC.md`):
- Credits-first flow primary, x402 per-call as fallback for one-off discovery
- Bearer token (`tf_live_<256-bit hex>`) is a debit account; each premium call decrements credits
- On-chain verification reads the USDC Transfer event from `eth_getTransactionReceipt` on Base RPC
- Replay protection: every used tx hash is permanently recorded in `pay:tx:{txHash}` (no TTL)
- Trust attestation via TLS + multi-publication (llms.txt, /api/payment/info, GitHub README, X bio); no DNS TXT signing in MVP

Key modules:
- `payments.ts`: middleware (`requirePayment`), USDC verification, quote/confirm/balance, daily rollup analytics
- `routing.ts`: routing engine + free preview rate limiter
- `history.ts`: daily snapshot capture (the data moat)
- `history-series.ts`: premium aggregated views (series, uptime, compare) over the daily snapshots
- `watches.ts`: premium webhook watches; status dispatch hooks into `pollStatusPages` (every 5 min), price dispatch runs daily after `updateCatalog`

SDKs:
- Python: `sdk/python/` (1.2.0). `pip install tensorfeed[web3]` enables `tf.purchase_credits()` for one-call sign-and-send. See `sdk/python/PUBLISHING.md` for the PyPI release flow.
- TypeScript: `sdk/javascript/` (1.1.0). Mirrors the Python surface, uses native fetch.

Frontend docs: `/developers/agent-payments` covers the wallet, pricing, both flows, all endpoints, and code examples. `/terms` Premium API and Agent Payments section is structured into numbered subsections 17.1 through 17.15. Premium API data practices are in `/privacy` Section 4B.

## OFAC Sanctions Screening (shipped 2026-04-28)

Premium API legal hardening from `terminalfeed/cc-spec-tensorfeed-premium-compliance.md` is live across four sections:

- Section 1 (Terms §17.9-17.15, no-refunds, governing law and venue): commit `53e6741`
- Section 2 (Privacy §4B Premium API data practices, Chainalysis disclosure, 7-year retention): commit `dff1c64`
- Section 3 (Chainalysis wallet-level screening on `/api/payment/confirm` and the x402 fallback)
- Section 4 (geo-IP block on `/api/payment/buy-credits` for CU/IR/KP/SY): commit `974441b`

`screenWalletOFAC` in `payments.ts` calls the free Chainalysis public sanctions API. Misconfig (no `CHAINALYSIS_API_KEY` secret) fails closed with HTTP 503 so credits cannot be minted without a screen. Sanctioned wallets return HTTP 403 `sanctions_block` and the block is logged via `console.log` (always) and persisted to the `OFAC_AUDIT_LOG` KV namespace if bound (7-year TTL per privacy policy retention). Transient Chainalysis errors fail open with an `ofac_screen_degraded` log line. The sender wallet is extracted from the USDC Transfer event `topics[1]` inside `verifyBaseUSDCTransaction`. Both the credits flow (`confirmPayment`) and the x402 per-call fallback (`requirePayment`) gate on the screen before any token is minted.

## Testing

The Worker has Vitest unit tests under `worker/src/*.test.ts`. Run from the `worker/` directory:

```bash
cd worker
npm install   # one-time, pulls vitest
npm test
npm run test:watch
```

## Email Addresses

- `support@tensorfeed.ai`
- `press@tensorfeed.ai`
- `feedback@tensorfeed.ai`
- `contact@tensorfeed.ai`
- `alerts@tensorfeed.ai`: Resend sending domain for outage alerts and daily ops summary
- Ops alerts from the staleness watchdog deliver to `evan@tensorfeed.ai` (set in `worker/wrangler.toml` as `ALERT_EMAIL_TO`)

All addresses managed via Google Workspace.

## Social

X/Twitter: [@tensorfeed](https://twitter.com/tensorfeed)

### X/Twitter posting (strict cadence, do not break)

Auto-posting handled by `worker/src/twitter.ts` on the `30 14 * * *` cron.

Account was flagged as spam on 2026-04-04 from posting 5x/day via automated cron. Auto-posting was re-enabled at 1/day on 2026-04-12. The manual `/api/tweet` endpoint remains disabled to prevent accidental bursts.

Cadence ramp, do not skip steps:
- Through 2026-05-04: 1 post/day max
- After 30 clean days (2026-05-04+): 2 posts/day (cron becomes `30 8,17 * * *`)
- After 60+ clean days (~2026-06-03+): 3 to 4 posts/day max, never more
- Never exceed 5 posts/day on any account under 6 months old
- Any new flag resets the clock to 1/day
