# TensorFeed.ai

TensorFeed.ai is an AI news aggregator and real-time data hub built for humans and AI agents. It combines editorial RSS news aggregation, model/pricing tracking, live service status monitoring, agent discovery, and original editorial content into one dashboard. Machine-readable first (llms.txt, JSON feeds, open API) with a dark-themed human UI on top.

Domain: https://tensorfeed.ai
GitHub: https://github.com/RipperMercs/tensorfeed (public)
Sister site: https://terminalfeed.io

## Where things live

```
src/app/         Next.js 14 App Router pages (45+ routes; sitemap.ts is authoritative)
src/components/  React components (HomeFeed, AgentActivity, layout/, news/, status/, seo/)
src/lib/         Shared utilities (api, constants, types, terminalfeed client)
worker/src/      Cloudflare Worker (tensorfeed-api). Each *.ts has a sibling *.test.ts.
data/            Bundled JSON snapshots baked into the static export
public/          Static assets (feeds, llms.txt, robots.txt, _headers, .well-known/)
scripts/         Prebuild: fetch-feeds.ts, generate-llms-full.ts
mcp-server/      MCP server exposing TensorFeed data to Claude Desktop
sdk/python/      Python SDK (pip install tensorfeed)
sdk/javascript/  TypeScript SDK (npm install tensorfeed)
docs/ARCHITECTURE.md         Detailed reference (Worker modules, KV layout, endpoints, subsystems, cron, agent payments architecture, CI workflows)
```

For details on the Worker modules, KV namespaces and prefixes, cron schedule, every API endpoint, design tokens, security subsystems (chaos, circuit breaker, rate limit, sanitize, OFAC), agent payments architecture, X posting cadence, and email addresses, read `docs/ARCHITECTURE.md`. The endpoint catalog is also live at `/api/meta` and `/developers`.

## Stack

- **Framework**: Next.js 14 App Router, static export (`output: 'export'`)
- **Hosting**: Cloudflare Pages, auto-deploys from `main`
- **API/Backend**: Cloudflare Worker `tensorfeed-api` in `worker/`, attached to `tensorfeed.ai/api/*`, auto-deploys on push to `main`
- **Styling**: Tailwind CSS, dark theme default with light mode toggle
- **Data storage**: Cloudflare Workers KV (3 namespaces: TENSORFEED_NEWS, TENSORFEED_STATUS, TENSORFEED_CACHE)
- **Fonts**: JetBrains Mono (data, code, numbers), Inter (body)
- **Email**: Resend (sending domain `alerts@tensorfeed.ai`)
- **Domain & DNS**: Cloudflare

## Commands

```bash
npm run dev         # Next.js dev server at localhost:3000
npm run build       # Runs prebuild (fetch-feeds + generate-llms-full), then next build
npm run lint
```

Worker (from `worker/`):
```bash
wrangler deploy
wrangler secret put RESEND_API_KEY
wrangler tail
cd worker && npm test          # Vitest
```

Manual data refresh (requires the ADMIN_KEY Worker secret):
```
GET https://tensorfeed.ai/api/refresh?key=<ADMIN_KEY>
```

## KV Operation Limits (CRITICAL)

Cloudflare free tier allows 100,000 KV operations per day. To stay within budget:
- Batch KV writes. Never write on every request.
- Cache reads in Worker memory for 30 to 60 seconds.
- Use Cloudflare Cache API (free, unlimited) as the primary read layer. Only fall back to KV on cache miss.
- Agent activity logging must be batched, not per-request.
- Daily cron jobs should write once per run, not per item.

## Content Rules

- **No em dashes anywhere**. Not in code comments, UI text, articles, meta tags, alt text, nowhere. Strict.
- **No double hyphens (`--`) as a substitute for em dashes**. Same rule, same scope.
- Use commas, periods, colons, semicolons, or parentheses. Rewrite the sentence if needed. This is an anti-AI-detection measure.
- All article cards link back to the original source. Never republish full third-party content.
- Original editorial content lives only under `/originals`.
- RSS snippets are clipped to 150 to 200 characters max.
- Vary article dates and lengths naturally. Short paragraphs. Vary sentence length.
- Write in first person from the TensorFeed brand voice. Include specific data points and opinions.
- Every page needs a unique title tag, meta description, JSON-LD schema, and OG tags.
- Every new page must be added to `src/app/sitemap.ts` and `public/llms.txt`.

## Code Style

- TypeScript strict mode. No `any` types.
- React functional components with hooks. No class components.
- Tailwind only. No CSS modules, no styled-components. Use CSS custom properties for theming colors.
- Semantic HTML: `<article>`, `<nav>`, `<aside>`, `<main>`, `<section>`. ARIA labels on interactive elements.
- Skeleton loaders for loading states. Graceful fallback UI for error states.

## Security Rules

- **Never hardcode API keys as fallbacks**. No `|| 'sk-ant-...'` patterns. If an env var is missing, throw.
- All secrets via `wrangler secret put NAME`. Never commit them.
- `.env`, `.env.*`, and `worker/.env*` are gitignored. Keep it that way.
- Pre-commit hook (`.husky/pre-commit`) greps staged diffs for key patterns (`sk-ant-`, `sk-proj-`, `AIza`, `re_`, `github_pat`). Do not bypass with `--no-verify`.
- Verify repo visibility before assessing severity of any leaked secret. `RipperMercs/tensorfeed` is public, so any secret in git history is world-readable and must be rotated.

## When Building New Features

1. Create the page or component under `src/app` or `src/components`
2. Add a unique title tag, meta description, OG tags, and JSON-LD schema (Article, FAQPage, etc as appropriate)
3. Add the route to `src/app/sitemap.ts`
4. Add the route to `public/llms.txt`
5. If it adds a new API endpoint, implement it in `worker/src/index.ts` and document on `/developers` (or `/developers/agent-payments` if paid), plus add to `/api/meta`
6. Test on mobile viewports
7. Ensure zero em dashes and zero double hyphens in any text
8. Commit and push to `main`. Cloudflare Pages deploys the site, and the Worker redeploys on any `worker/**` change.
