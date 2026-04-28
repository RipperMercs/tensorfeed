# TensorFeed.ai

TensorFeed.ai is an AI news aggregator and real-time data hub built for humans and AI agents. It combines editorial RSS news aggregation, model/pricing tracking, live service status monitoring, agent discovery, and original editorial content into one dashboard. The site is designed to be machine-readable first (llms.txt, JSON feeds, open API) with a dark-themed human UI on top.

Domain: https://tensorfeed.ai
GitHub: https://github.com/RipperMercs/tensorfeed
Sister site: https://terminalfeed.io (real-time data dashboard, free public API)

## Repo Layout

```
tensorfeed/
  src/
    app/              Next.js 14 App Router pages (45+ routes)
      layout.tsx      Root layout, theme provider, global SEO
      page.tsx        Homepage (HomeFeed component)
      originals/      Original editorial articles
      tools/          Cost calculator, trending
      is-*-down/      Status pages per provider (Claude, ChatGPT, Gemini, etc)
      ...             Models, agents, research, live, benchmarks, etc
      sitemap.ts      Dynamic sitemap generator
    components/       Reusable React components (HomeFeed, AgentActivity, etc)
      layout/         Header, footer, sidebar
      news/           Article cards, category filters
      status/         Status widgets
      seo/            JSON-LD schema components
    lib/              Shared utilities (api, constants, types, terminalfeed client)
  worker/             Cloudflare Worker (tensorfeed-api), deploys independently
    src/
      index.ts        Worker entry, route handling, cron dispatcher
      rss.ts          RSS feed polling
      status.ts       Service status polling
      catalog.ts      Models/benchmarks/agents catalog
      activity.ts     Agent traffic tracking
      alerts.ts       Staleness watchdog + daily email summary
      snapshots.ts    Rolling fallback snapshots (restore if live data fails)
      history.ts      Daily historical snapshots for premium products (Phase 0 of agent payments)
      routing.ts      Tier 2 routing recommendation engine + free preview rate limiter
      routing.test.ts Vitest unit tests for the routing engine (pure-logic, no chain)
      payments.ts     Payment middleware: credits + x402 fallback, USDC on Base verification, daily rollup analytics
      history-series.ts  Premium history series: pricing/benchmark series, status uptime, snapshot diff
      watches.ts      Premium webhook watches: register, predicate eval, HMAC-signed POST delivery, cron-driven dispatch
      watches.test.ts Vitest coverage for predicate edge transitions, SSRF guard, dispatch end-to-end
      agents-enriched.ts  Premium enriched agents directory: joins catalog with status, news, activity, pricing; trending score; sort/filter
      agents-enriched.test.ts  Vitest coverage for enrichment join logic, filters, sort, scoring
      news-search.ts  Premium news search: tokenization, relevance scoring (title weight 3, snippet 1, recency boost), date/provider/category filters
      news-search.test.ts  Vitest coverage for query mode, filters, browse mode, validation
      cost-projection.ts  Premium cost projection: workload-to-spend math across 1-10 models, four horizons, cheapest-monthly ranking
      cost-projection.test.ts  Vitest coverage for math, ranking, validation
      forecast.ts  Premium forecast: linear least-squares fit on 7-90 days of price/benchmark history, 1-30 day projection with 95% prediction interval and confidence scoring
      forecast.test.ts  Vitest coverage for fit accuracy, confidence weighting, validation, insufficient-data handling
      provider-deepdive.ts  Premium provider deep-dive: aggregates pricing/benchmarks/status/news/activity for one provider in a single response
      provider-deepdive.test.ts  Vitest coverage for join logic, sort order, fuzzy match, fallbacks, news cap
      compare-models.ts  Premium model comparison: 2-5 models side-by-side with pricing, benchmarks normalized to union-of-keys, status, news, plus rankings
      compare-models.test.ts  Vitest coverage for benchmark normalization, ranking math, validation
      whats-new.ts  Premium morning brief: 1-7 day window, pricing diff, status incidents, top news, in one paid call
      whats-new.test.ts  Vitest coverage for window math, news limit, status counts, validation, no-snapshot fallback
      podcasts.ts     Podcast feed polling
      trending.ts     Trending GitHub repos
      twitter.ts      X/Twitter auto-posting
      sources.ts      Status page source definitions
      types.ts        Shared Worker types (Env interface includes PAYMENT_WALLET, PAYMENT_ENABLED, BASE_RPC_URL)
    wrangler.toml     Worker config, KV bindings, cron triggers, vars (PAYMENT_WALLET hardcoded)
  data/               Bundled JSON snapshots (built into static export)
    articles.json     Latest article cache (refreshed by prebuild script)
    sources.json      RSS source definitions (id, url, categories, active)
    pricing.json      Model pricing data
    benchmarks.json   Benchmark scores
    agents-directory.json
    timeline.json
  scripts/
    fetch-feeds.ts    Prebuild: pulls latest articles from worker API
    generate-llms-full.ts  Prebuild: regenerates /llms-full.txt
  public/             Static assets served as-is (feeds, markdown guides, llms.txt, robots.txt, sitemap.xml, ads.txt, images)
  mcp-server/         MCP server exposing TensorFeed data to Claude Desktop
  sdk/
    python/           Python SDK (pip install tensorfeed). Free + premium endpoints, optional web3 auto-send via the [web3] extra. Single tensorfeed.client module, no required deps. PUBLISHING.md documents the maintainer release flow.
    javascript/       TypeScript SDK (npm install tensorfeed). Mirrors the Python surface. Native fetch only, Node 18+ or any modern browser.
  AGENT-PAYMENTS-SPEC.md          Canonical agent payments architecture (v3, USDC-only).
  AGENT-PAYMENTS-PHASE-0-SPEC.md  Original Phase 0 snapshotting deliverable. Implementation note at top documents the naming deviations from the original draft.
```

## Stack

- **Framework**: Next.js 14 App Router, static export (`output: 'export'` in next.config.mjs)
- **Hosting**: Cloudflare Pages, auto-deploys from `main` branch on github.com/RipperMercs/tensorfeed
- **API / Backend**: Cloudflare Worker `tensorfeed-api` in `worker/`, auto-deploys on push to `main`
- **Routing**: Worker is attached to `tensorfeed.ai/api/*` so the Pages static site and Worker API share one domain
- **Styling**: Tailwind CSS, dark theme default with light mode toggle via ThemeProvider
- **Data storage**: Cloudflare Workers KV (3 namespaces, see below)
- **Fonts**: JetBrains Mono (data, code, numbers), Inter (body text)
- **Analytics**: Cloudflare Web Analytics (no cookies, no external trackers)
- **Ads**: Google AdSense (pub-7224757913262984)
- **Email**: Resend API for outage alerts and daily ops summary (sending domain: alerts@tensorfeed.ai)
- **Domain & DNS**: Cloudflare

## Commands

```bash
npm run dev         # Next.js dev server at localhost:3000
npm run build       # Runs prebuild (fetch-feeds + generate-llms-full), then next build
npm run lint
```

Worker deploy (from `worker/` directory):
```bash
cd worker
wrangler deploy                          # deploy to production
wrangler secret put RESEND_API_KEY       # set secret
wrangler tail                            # live log stream
```

Manual data refresh (triggers all polls immediately):
```
GET https://tensorfeed.ai/api/refresh?key=production
```

## Cloudflare Workers KV Namespaces

- `TENSORFEED_NEWS`: `4924c4d8a64446cea111fd63a5b3455a`: articles, feeds, podcasts
- `TENSORFEED_STATUS`: `68eec8e4d37349a6adc1278c9280f653`: status pages, incidents
- `TENSORFEED_CACHE`: `4de30d8becd24b3bba9556b98bad8e69`: request cache, rate-limit state, misc, plus all agent-payments state under the `pay:*` and `history:*` prefixes:
  - `history:{YYYY-MM-DD}:{type}`: daily snapshots (pricing, models, benchmarks, status, agent-activity)
  - `history:index`: ordered list of dates with snapshot data
  - `pay:credits:{token}`: `{ balance, created, last_used, agent_ua, total_purchased }` (no TTL)
  - `pay:tx:{txHash}`: `{ amount_usd, credits, token, block_number, created }` (no TTL, replay protection)
  - `pay:quote:{nonce}`: `{ amount_usd, credits, expires_at }` (30-min TTL)
  - `pay:rollup:{YYYY-MM-DD}`: daily revenue + usage rollup with per-endpoint breakdown and top-agents leaderboard
  - `rate:routing-preview:{YYYY-MM-DD}:{ip}`: free preview rate limit counter (2-day TTL)

## KV Operation Limits (CRITICAL)

Cloudflare free tier allows 100,000 KV operations per day. To stay within budget:
- Batch KV writes. Never write on every request.
- Cache reads in Worker memory for 30 to 60 seconds.
- Use Cloudflare Cache API (free, unlimited) as the primary read layer. Only fall back to KV on cache miss.
- Agent activity logging must be batched, not per-request.
- Daily cron jobs should write once per run, not per item.

## Worker Cron Schedule

Defined in `worker/wrangler.toml`. All cron handlers dispatched from `worker/src/index.ts` `scheduled()` export.

- `*/5 * * * *`: Status page polling (every 5 min)
- `*/10 * * * *`: RSS feed fetching (every 10 min)
- `0 * * * *`: Hourly full refresh (RSS + status + podcasts)
- `0 7 * * *`: Daily 7am UTC: models, benchmarks, agents catalog update (LiteLLM + HuggingFace), then daily history snapshot capture (`worker/src/history.ts`, Phase 0 of agent payments)
- `30 8 * * *`: Daily 8:30am UTC: trending AI repos from GitHub
- `30 14 * * *`: Daily 2:30pm UTC: X/Twitter post (1/day, see X posting rules below)

## Data Flow

1. Worker cron polls RSS, status pages, podcasts, trending repos. Writes to KV.
2. Worker exposes that data at `/api/*` endpoints.
3. Next.js `prebuild` step (`scripts/fetch-feeds.ts`) pulls the latest from the Worker API and writes snapshots to `data/*.json`.
4. Next.js build bakes `data/*.json` into the static export so pages render correctly even if the Worker is down.
5. Client-side components (e.g. HomeFeed) hydrate with fresh data from `/api/news` after mount.

Fallback: Worker keeps rolling snapshots in KV. If a live poll returns empty or fails, `snapshots.ts` restores the previous known-good payload so the public API never serves blank data. `alerts.ts` sends an email if news staleness exceeds thresholds and sends a daily ops summary.

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

All mounted under `https://tensorfeed.ai/api/*` via the Worker.

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
- `/api/preview/routing?task=code|reasoning|creative|general&budget=&min_quality=`: Free top-1 routing recommendation (5 calls/day per IP)
- `/api/payment/info`: Wallet, pricing tiers, supported flows, verification metadata
- `/api/payment/buy-credits` (POST): Generate a 30-min payment quote with memo nonce
- `/api/payment/confirm` (POST): Verify USDC tx on-chain, mint a bearer token
- `/api/payment/balance`: Read remaining credits for the current bearer token
- `/api/payment/usage`: Per-token call history (last 100 calls aggregated by endpoint). Auth required, no credit cost. Powers the human /account dashboard.
- `/api/payment/history`: Per-token credit-purchase audit log (which on-chain txs added how many credits and when). Auth required (`Authorization: Bearer <token>`), no credit cost. Pairs with `/api/payment/usage` (spend side) to give the bearer's full token lifecycle. Backed by `pay:purchases:{token}` ring buffer (cap 100); tokens minted before this ledger existed return an empty `purchases` array but still expose `current_balance` and `token_short`.
- `/api/alerts/subscribe`: Outage alert email signup
- `/api/refresh?key=production[&task=history]`: Manual data refresh / history capture trigger

**Paid (USDC on Base, credits-first):**
- `/api/premium/routing`: Tier 2 routing engine, 1 credit per call. Top-N ranked recommendations with full composite score breakdown.
- `/api/premium/history/pricing/series?model=&from=&to=`: Tier 1, 1 credit. Daily input/output/blended price points for one model with min/max/delta summary. Range capped at 90 days.
- `/api/premium/history/benchmarks/series?model=&benchmark=&from=&to=`: Tier 1, 1 credit. Score evolution for a single benchmark on one model. Returns delta in percentage points.
- `/api/premium/history/status/uptime?provider=&from=&to=`: Tier 1, 1 credit. Daily uptime % for one provider (degraded counts as half) with incident-day list. Missing-data days excluded from denominator.
- `/api/premium/history/compare?from=&to=&type=pricing|benchmarks`: Tier 1, 1 credit. Diff two daily snapshots: added, removed, changed entries with deltas.
- `/api/premium/watches` (POST): Tier 1, 1 credit per registration. Body `{ spec, callback_url, secret?, fire_cap? }`. Spec is `{ type: "price"|"status"|"digest", ... }`. Price/status fire on transitions; digest fires on a daily/weekly cadence with a pricing-changes summary. Watch lives 90 days, default fire cap 100. Fires deliver HMAC-signed POST to callback URL.
- `/api/premium/watches` (GET): List watches owned by the bearer token. Free.
- `/api/premium/watches/{id}` (GET|DELETE): Read or remove an owned watch. Free.
- `/api/premium/agents/directory?category=&status=&open_source=&capability=&sort=&limit=`: Tier 1, 1 credit. Enriched agents catalog joined with live status, recent news (count + top 3), agent traffic, flagship pricing, and a derived trending_score. Sort options: trending, alphabetical, status, price_low, price_high, news_count.
- `/api/premium/news/search?q=&from=&to=&provider=&category=&limit=`: Tier 1, 1 credit. Full-text search over the article corpus with relevance scoring (term hits weighted 3 in title, 1 in snippet, plus recency boost) and date/provider/category filters. Default limit 25, max 100.
- `/api/premium/cost/projection?model=&input_tokens_per_day=&output_tokens_per_day=&horizon=`: Tier 1, 1 credit. Project the cost of a token-usage workload across 1-10 models (CSV in `model`). Returns daily/weekly/monthly/yearly totals per model and a ranking by cheapest monthly. Pure compute on live pricing.
- `/api/premium/forecast?target=price|benchmark&model=&field=&benchmark=&lookback=&horizon=`: Tier 1, 1 credit. Conservative linear-regression forecast (95% prediction interval) for one model price field or benchmark score, projected 1-30 days forward. Confidence label (low/medium/high) reflects fit quality and sample size. Returns explicit "not a guarantee" disclaimers.
- `/api/premium/providers/{name}`: Tier 1, 1 credit. One provider's complete profile in one call: live status + components, all models with pricing + tier + benchmark scores joined, recent news (top 8), agent traffic. Aggregation over 4 free endpoints; agents pay 1 credit instead of stitching client-side.
- `/api/premium/compare/models?ids=`: Tier 1, 1 credit. Side-by-side comparison of 2-5 models with pricing, benchmarks (union-of-keys normalized to null for missing), status, news. Plus rankings (cheapest_blended, most_context, by_benchmark leaderboard).
- `/api/premium/whats-new?days=&news_limit=`: Tier 1, 1 credit. Agent morning brief: pricing changes, new/removed models, status incidents, top news headlines from last 1-7 days. Single call instead of stitching free endpoints client-side.

**Admin (auth-gated via `?key=ENVIRONMENT`):**
- `/api/admin/usage?date=YYYY-MM-DD`: Daily revenue + usage rollup
- `/api/admin/usage/dates`: List of dates with rollup data

**Internal (server-to-server only, NOT in `/api/meta` or `/llms.txt`):**
- `/api/internal/validate-and-charge` (POST): Sister-site Workers (TerminalFeed and any future Pizza Robot Studios sister site like VR.org) call this with `X-Internal-Auth: ${SHARED_INTERNAL_SECRET}` to validate a TensorFeed bearer token and atomically debit credits. Body: `{ token, cost, endpoint }`. Always returns HTTP 200 with `{ok: true, credits_remaining}` or `{ok: false, reason}`; only 401/405/400 for auth/method/body failures. Auth check runs BEFORE body parsing so 401 does not leak endpoint existence. Constant-time secret compare. Backed by `validateAndCharge` helper in `worker/src/payments.ts` which is the same atomic-charge logic that `requirePayment` uses internally for in-process callers.
- `/api/internal/track-bot` (POST): Receives bot hits from the Cloudflare Pages Functions middleware at `functions/_middleware.ts` so static editorial / SEO route hits (e.g. `/originals/*`, `/api-reference/*`, `/for-ai-agents`) land in the same in-memory buffer as Worker-route hits. Body: `{ bot, path }`. `X-Internal-Auth: ${PAGES_TRACK_SECRET}` constant-time compare. Dedicated secret (separate from `SHARED_INTERNAL_SECRET`) so its rotation cadence is independent of cross-site coordination. Calls `trackBotHitDirect()` in `worker/src/activity.ts`. The middleware skips API/feed paths so we never double-count.

Every new endpoint MUST be documented on `/developers` (or `/developers/agent-payments` for paid endpoints), added to `/api/meta`, and linked from `public/llms.txt`.

## RSS Sources (12 active)

Defined in `data/sources.json`. Worker reads this list on every poll.

- Anthropic Blog
- OpenAI Blog
- Google AI Blog
- Meta AI Blog
- HuggingFace Blog
- TechCrunch AI
- The Verge AI
- Ars Technica
- VentureBeat AI
- NVIDIA AI Blog
- ZDNet AI
- Hacker News (AI-filtered via hnrss.org)

To add a source: append to `data/sources.json` with `id`, `name`, `url`, `domain`, `icon`, `categories`, `active: true`. Worker picks it up on next poll, no code change needed.

## Pages (45+ routes)

- **Main**: `/`, `/models`, `/agents`, `/research`, `/status`, `/live`, `/originals`, `/today`, `/timeline`, `/podcasts`
- **Tools**: `/tools/cost-calculator`, `/tools/trending`, `/benchmarks`, `/ask`, `/alerts`, `/incidents`, `/compare`
- **Status**: `/is-claude-down`, `/is-chatgpt-down`, `/is-gemini-down`, `/is-copilot-down`, `/is-perplexity-down`, `/is-cohere-down`, `/is-mistral-down`, `/is-huggingface-down`, `/is-replicate-down`, `/is-midjourney-down`
- **Guides** (pillar SEO pages): `/what-is-ai`, `/best-ai-tools`, `/best-ai-chatbots`, `/ai-api-pricing-guide`, `/what-are-ai-agents`, `/best-open-source-llms`
- **Editorial originals**: `/originals/why-we-built-tensorfeed`, `/originals/claude-mythos-not-afraid`, `/originals/claude-code-leak`, `/originals/ai-api-pricing-war-2026`, `/originals/rise-of-agentic-ai`, `/originals/state-of-ai-apis-2026`, `/originals/mcp-97-million-installs`, `/originals/openai-killed-sora`, `/originals/claude-vs-gpt-vs-gemini`, `/originals/open-source-llms-closing-gap`, `/originals/ai-service-outages-month`, `/originals/building-for-ai-agents`
- **Hubs**: `/agi-asi`, `/model-wars`
- **Meta/legal**: `/about`, `/privacy`, `/terms`, `/contact`, `/developers`, `/developers/agent-payments`, `/account` (human credits dashboard, noindex), `/changelog`
- **Agent acquisition surface**: `/for-ai-agents` (explicit agent-first landing page with discovery surfaces and integration paths), `/glossary` + `/glossary/{x402,mcp,agent-payments}` (FAQPage-schema definitions for the agent payment ecosystem), `/openapi.json` (machine-readable API spec at the root, served from `public/openapi.json`), `/benchmarks/[name]` (per-benchmark leaderboard pages auto-generated from data/benchmarks.json via `getAllBenchmarkSlugs()` in `src/lib/benchmark-directory.ts`)
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

## Content Rules

- **No em dashes anywhere**. Not in code comments, UI text, articles, meta tags, alt text, nowhere. This is strict.
- **No double hyphens (`--`) as a substitute for em dashes**. Same rule, same scope.
- Use commas, periods, colons, semicolons, or parentheses. Rewrite the sentence if needed.
- This is an anti-AI-detection measure so editorial content reads as naturally human-written.
- All article cards link back to the original source. Never republish full third-party content.
- Original editorial content lives only under `/originals`.
- RSS snippets are clipped to 150 to 200 characters max.
- Vary article dates naturally when writing new editorial content.
- Vary article lengths by subject matter. Short paragraphs. Vary sentence length.
- Write in first person from the TensorFeed brand voice. Include specific data points and opinions.
- Every page needs a unique title tag, meta description, JSON-LD schema, and OG tags.
- Every new page must be added to the sitemap and `llms.txt`.

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

## Code Style

- TypeScript strict mode. No `any` types.
- React functional components with hooks. No class components.
- Tailwind CSS only. No CSS modules, no styled-components.
- Use CSS custom properties (variables) for theming colors.
- Semantic HTML: `<article>`, `<nav>`, `<aside>`, `<main>`, `<section>`.
- ARIA labels on all interactive elements.
- Skeleton loaders for loading states.
- Graceful fallback UI for error states.

## Security Rules

- **Never hardcode API keys as fallbacks**. No `|| 'sk-ant-...'` patterns. If an env var is missing, throw an error.
- Store all secrets as Cloudflare Worker secrets via `wrangler secret put NAME`. Never commit them.
- `.env`, `.env.*`, and `worker/.env*` are gitignored. Keep it that way.
- Pre-commit hook (`.husky/pre-commit`) greps staged diffs for key patterns (`sk-ant-`, `sk-proj-`, `AIza`, `re_`, `github_pat`). Do not bypass with `--no-verify`.
- Verify repo visibility (public vs private) before assessing severity of any leaked secret. `RipperMercs/tensorfeed` is currently public, so any secret in git history is world-readable and must be rotated.

## Agent Payments (Phase 1, shipped 2026-04-27)

TensorFeed sells premium API access to AI agents via USDC on Base mainnet. No accounts, no API keys, no traditional payment processors. Decision locked 2026-04-27: USDC-only, no Stripe.

**Wallet:** `0x549c82e6bfc54bdae9a2073744cbc2af5d1fc6d1` (Rabby on Base, self-custodied)
**USDC contract on Base:** `0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913`
**Pricing:** 50 credits per $1 USDC base rate. Volume discounts at $5 (10%), $30 (25%), $200 (40%). Tier 2 routing currently 1 credit per call.

Architecture (full detail in `AGENT-PAYMENTS-SPEC.md`):
- Credits-first flow primary, x402 per-call as fallback for one-off discovery
- Bearer token (`tf_live_<256-bit hex>`) is a debit account; each premium call decrements credits
- On-chain verification reads the USDC Transfer event from `eth_getTransactionReceipt` on Base RPC
- Replay protection: every used tx hash is permanently recorded in `pay:tx:{txHash}` (no TTL)
- Trust attestation via TLS + multi-publication (llms.txt, /api/payment/info, GitHub README, X bio); no DNS TXT signing in MVP

Key modules:
- `worker/src/payments.ts`: middleware (`requirePayment`), USDC verification, quote/confirm/balance, daily rollup analytics
- `worker/src/routing.ts`: routing engine + free preview rate limiter
- `worker/src/history.ts`: daily snapshot capture (the data moat)
- `worker/src/history-series.ts`: premium aggregated views (series, uptime, compare) over the daily snapshots
- `worker/src/watches.ts`: premium webhook watches; status dispatch hooks into `pollStatusPages` (every 5 min), price dispatch runs daily after `updateCatalog`

SDKs:
- Python: `sdk/python/` (1.2.0). `pip install tensorfeed[web3]` enables `tf.purchase_credits()` for one-call sign-and-send. See `sdk/python/PUBLISHING.md` for the PyPI release flow.
- TypeScript: `sdk/javascript/` (1.1.0). Mirrors the Python surface, uses native fetch.

Frontend docs: `/developers/agent-payments` (Next.js page) covers the wallet, pricing, both flows, all endpoints, and code examples. `/terms` includes the Premium API and Agent Payments section with the no-training license, refund policy, and replay protection.

## Testing

The Worker has Vitest unit tests under `worker/src/*.test.ts`. Run from the `worker/` directory:

```bash
cd worker
npm install   # one-time, pulls vitest
npm test      # vitest run
npm run test:watch
```

Current coverage: routing engine (quality weighting per task, cost normalization, filters, custom weights, edge cases). Future: payment middleware (mock RPC), history capture, request handlers.

## Email Addresses

- `support@tensorfeed.ai`
- `press@tensorfeed.ai`
- `feedback@tensorfeed.ai`
- `contact@tensorfeed.ai`
- `alerts@tensorfeed.ai`: Resend sending domain for outage alerts and daily ops summary
- Ops alerts from the staleness watchdog deliver to `evan@tensorfeed.ai` (set in `worker/wrangler.toml` as `ALERT_EMAIL_TO`)

All addresses managed via Google Workspace.

## Social

- X/Twitter: [@tensorfeed](https://twitter.com/tensorfeed)

### X/Twitter posting (strict cadence, do not break)

Auto-posting is handled by `worker/src/twitter.ts` on the `30 14 * * *` cron.

Account was flagged as spam on 2026-04-04 from posting 5x/day via automated cron. Auto-posting was re-enabled at 1/day on 2026-04-12. The manual `/api/tweet` endpoint remains disabled to prevent accidental bursts.

Cadence ramp, do not skip steps:
- Through 2026-05-04: 1 post/day max
- After 30 clean days (2026-05-04+): 2 posts/day (cron becomes `30 8,17 * * *`)
- After 60+ clean days (~2026-06-03+): 3 to 4 posts/day max, never more
- Never exceed 5 posts/day on any account under 6 months old
- Any new flag resets the clock to 1/day

## When Building New Features

1. Create the page or component under `src/app` or `src/components`
2. Add a unique title tag and meta description
3. Add JSON-LD schema (Article, FAQPage, etc as appropriate)
4. Add OG meta tags
5. Add the route to `src/app/sitemap.ts`
6. Add the route to `public/llms.txt`
7. If it adds a new API endpoint, implement it in `worker/src/index.ts` and document it on `/developers` and in `/api/meta`
8. Test on mobile viewports
9. Ensure zero em dashes and zero double hyphens in any text
10. Commit and push to `main`. Cloudflare Pages deploys the site, and the Worker redeploys on any `worker/**` change.
