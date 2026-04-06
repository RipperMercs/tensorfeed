# TensorFeed.ai - Project CLAUDE.md

## Project Overview
TensorFeed.ai is an AI news aggregator and real-time data hub built for humans and AI agents. It combines editorial RSS news aggregation with TerminalFeed.io's live data feed architecture.

## Stack
- Framework: Next.js 14 (App Router, static export via `output: 'export'`)
- Hosting: Cloudflare Pages (auto-deploys from GitHub main branch)
- API/Backend: Cloudflare Worker (`tensorfeed-api`), auto-deploys on push
- Styling: Tailwind CSS, dark theme default with light mode toggle
- Data Storage: Cloudflare Workers KV
- Fonts: JetBrains Mono (data/code), Inter (body text)
- Analytics: Cloudflare Web Analytics
- Ads: Google AdSense (pub-7224757913262984)
- Email Alerts: Resend API
- Domain: tensorfeed.ai (Cloudflare)

## KV Namespaces
- TENSORFEED_NEWS: 4924c4d8a64446cea111fd63a5b3455a
- TENSORFEED_STATUS: 68eec8e4d37349a6adc1278c9280f653
- TENSORFEED_CACHE: 4de30d8becd24b3bba9556b98bad8e69

## Worker Cron Schedule
- Every 2 min: Status page polling
- Every 10 min: RSS feed fetching from all sources
- Every hour: Full refresh
- Daily 6am UTC: Model catalog and pricing update from LiteLLM

## KV Operation Limits (CRITICAL)
Cloudflare free tier has 100,000 KV operations/day. To stay within limits:
- Batch KV writes (never write on every request)
- Cache reads in Worker memory for 30-60 seconds
- Use Cloudflare Cache API (free, unlimited) as primary read layer
- Only fall back to KV for writes and cache misses
- Agent activity logging must be batched, not per-request

## Design System
Colors:
- --bg-primary: #0a0a0f
- --bg-secondary: #12121a
- --bg-tertiary: #1a1a2e
- --text-primary: #e2e8f0
- --accent-primary: #6366f1 (indigo)
- --accent-secondary: #8b5cf6 (violet)
- --accent-green: #10b981 (status OK)
- --accent-red: #ef4444 (status down)
- --accent-amber: #f59e0b (status degraded)

Source color coding (left border on article cards):
- Anthropic: coral/orange
- OpenAI: green
- Google: blue
- HN: orange
- The Verge: purple
- TechCrunch: green
- HuggingFace: yellow
- NVIDIA: lime

## Key URLs
- Site: https://tensorfeed.ai
- Worker API: https://tensorfeed.ai/api/*
- RSS Feed: https://tensorfeed.ai/feed.xml
- JSON Feed: https://tensorfeed.ai/feed.json
- Agent Discovery: https://tensorfeed.ai/llms.txt
- Full Docs: https://tensorfeed.ai/llms-full.txt
- Status: https://tensorfeed.ai/status
- Developers: https://tensorfeed.ai/developers

## RSS Sources (12 active)
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
- Hacker News (AI filtered via hnrss.org)

## API Endpoints
- /api/news: Articles with ?category= and ?limit= support
- /api/status: Live service status
- /api/models: Model pricing and specs
- /api/incidents: Historical incident database
- /api/agents/activity: Agent traffic metrics
- /api/health: Worker health check
- /api/meta: Endpoint discovery
- /api/ask: Ask TensorFeed (Claude Haiku powered)
- /api/alerts/subscribe: Outage alert signup
- /api/refresh?key=production: Manual data refresh
- /api/ping: Worker health ping

## Pages (40+)
Main: /, /models, /agents, /research, /status, /live, /originals
Tools: /tools/cost-calculator, /benchmarks, /ask, /alerts, /incidents
Status: /is-claude-down, /is-chatgpt-down (+ more planned)
Guides: /what-is-ai, /best-ai-tools, /best-ai-chatbots, /ai-api-pricing-guide, /what-are-ai-agents, /best-open-source-llms
Meta: /about, /privacy, /developers, /changelog

## Email Addresses
- support@tensorfeed.ai
- press@tensorfeed.ai (set up in Google Workspace)
- feedback@tensorfeed.ai
- contact@tensorfeed.ai
- alerts@tensorfeed.ai (Resend sending domain for outage alerts)

## Social
- X/Twitter: @tensorfeed
- GitHub: github.com/RipperMercs/tensorfeed

## X/Twitter Posting (CURRENTLY DISABLED)
Account was flagged as spam on 2026-04-04 from posting 5x/day via automated cron.
Auto-posting and manual /api/tweet endpoint are both disabled until the flag is lifted.

Safe posting limits for re-enabling:
- Month 1: 1 post/day max (cron: "30 14 * * *")
- After 30 days with no flags: 2 posts/day (cron: "30 8,17 * * *")
- After 60+ days: can push to 3-4/day max, never exceed that
- Never exceed 5 posts/day on any account under 6 months old
- 10+/day is spam territory for any account

## Sister Site
- TerminalFeed.io: Real-time data dashboard (free API at terminalfeed.io/api/*)

## Content Rules
- NO em dashes or double hyphens anywhere on the entire site
- All articles link back to original sources (never republish full content)
- Original editorial content goes under /originals only
- RSS snippets kept to 150-200 characters max
- Every page needs unique title tag, JSON-LD schema, OG meta tags
- Every new page must be added to sitemap.xml and llms.txt
- Every new API endpoint must be documented on /developers

## SEO
- Sitemap: /sitemap.xml (40+ URLs)
- robots.txt welcomes all AI crawlers by name
- llms.txt and llms-full.txt for agent discovery
- IndexNow integration (auto-pings on content change)
- Cloudflare Crawler Hints enabled
- FAQPage schema on all pillar pages
- Unique meta descriptions on every page
- Google Search Console and Bing Webmaster Tools verified

## When Building New Features
1. Create the page/component
2. Add unique title tag and meta description
3. Add JSON-LD schema
4. Add OG meta tags
5. Add to sitemap.xml
6. Add to llms.txt
7. Document any new API endpoints on /developers
8. Test on mobile
9. Ensure no em dashes or double hyphens in any text
