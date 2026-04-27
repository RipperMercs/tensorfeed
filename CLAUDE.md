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
      snapshots.ts    Fallback snapshots (restore if live data fails)
      podcasts.ts     Podcast feed polling
      trending.ts     Trending GitHub repos
      twitter.ts      X/Twitter auto-posting
      sources.ts      Status page source definitions
      types.ts        Shared Worker types
    wrangler.toml     Worker config, KV bindings, cron triggers, vars
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
  sdk/                TypeScript SDK for consuming the public API
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
- `TENSORFEED_CACHE`: `4de30d8becd24b3bba9556b98bad8e69`: request cache, rate-limit state, misc

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

- `/api/news`: Articles. Supports `?category=` and `?limit=`
- `/api/status`: Live service status for tracked providers
- `/api/models`: Model pricing, context windows, specs
- `/api/benchmarks`: AI model benchmark scores
- `/api/incidents`: Historical incident database
- `/api/agents/activity`: Agent traffic metrics (which AI agents visit the site)
- `/api/agents/news`: News feed formatted for agent consumption
- `/api/health`: Worker health check
- `/api/meta`: Endpoint discovery manifest
- `/api/ask`: Ask TensorFeed (Claude Haiku powered Q&A)
- `/api/alerts/subscribe`: Outage alert email signup
- `/api/refresh?key=production`: Manual data refresh trigger
- `/api/ping`: Worker health ping

Every new endpoint MUST be documented on `/developers` and added to `/api/meta`.

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
- **Meta/legal**: `/about`, `/privacy`, `/terms`, `/contact`, `/developers`, `/changelog`
- **Meta editorial**: `/claude-md-guide`, `/claude-md-generator`, `/claude-md-examples`

## Feeds & Agent Discovery

- `https://tensorfeed.ai/feed.xml`: main RSS
- `https://tensorfeed.ai/feed.json`: JSON Feed 1.1
- `https://tensorfeed.ai/feed/research.xml`: research-only RSS
- `https://tensorfeed.ai/feed/tools.xml`: tools-only RSS
- `https://tensorfeed.ai/llms.txt`: agent discovery manifest
- `https://tensorfeed.ai/llms-full.txt`: full agent-readable site dump (regenerated each build by `scripts/generate-llms-full.ts`)
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
