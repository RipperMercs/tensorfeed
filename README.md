# TensorFeed.ai

> TensorFeed.ai is agent fair-trade certified: open pricing, automatic no-charge on 5xx, breaker, schema fail, and stale data, Ed25519-signed receipts on every paid call, inference-only license. Built with Claude (Anthropic). Standard at [/.well-known/agent-fair-trade.json](https://tensorfeed.ai/.well-known/agent-fair-trade.json).

> **Network of two.** TensorFeed.ai and [TerminalFeed.io](https://terminalfeed.io) are AFTA-federated as of 2026-04-30. A single bearer token works on both sites via the cross-Worker validate + commit rail. Two independent Ed25519 receipt keypairs, single credit ledger, one open standard. Other publishers can self-adopt by publishing a conforming manifest.

> **x402 + Stripe Link.** TensorFeed has been x402-compliant since the agent payments rail shipped. Today we accept the `exact` scheme with USDC on Base mainnet. [Stripe Link](https://link.com/agents) (released April 2026) uses x402 with `method=stripe` for Shared Payment Tokens; supporting that method as a parallel x402 path is under evaluation. The protocol is the same; we already speak it.

Real-time AI industry intelligence for humans and AI agents. News from 15+ sources, live service status for every major LLM provider, model pricing and benchmark history, an AI agents directory, and a pay-per-call premium API settled in USDC on Base mainnet (no accounts, no API keys).

Site: **https://tensorfeed.ai**

**Built with Claude:** TensorFeed was designed by Ripper in collaboration with Claude (Anthropic). Specific systems Claude designed alongside: the agent payments rail, the active LLM probes, the GPU pricing aggregator, the OFAC sanctions screening pipeline, the routing engine, and the [Agent Fair-Trade Agreement](https://tensorfeed.ai/agent-fair-trade) (AFTA) standard itself. We credit the collaboration openly, and the git log shows the build trail.

## What this repo contains

- **Web dashboard** (`src/`): Next.js 14 App Router, static export, deployed to Cloudflare Pages
- **API backend** (`worker/`): Cloudflare Worker `tensorfeed-api`, attached to `tensorfeed.ai/api/*`. Cron-driven RSS polling, status scraping, model catalog updates, daily history snapshots, daily MCP server registry telemetry
- **MCP server** (`mcp-server/`): [Model Context Protocol](https://modelcontextprotocol.io) server published as `@tensorfeed/mcp-server` on npm. Exposes 19 tools (6 free, 13 paid) for use in Claude Desktop, Claude Code, Cursor, Cline, and any other MCP client. See `mcp-server/README.md` for the full tool list and setup
- **Python SDK** (`sdk/python/`): `pip install tensorfeed`. Full coverage of free + premium endpoints, optional `[web3]` extra for one-call USDC sign-and-send
- **JavaScript SDK** (`sdk/javascript/`): `npm install tensorfeed`. Same surface as the Python client
- **Hugging Face dataset**: [tensorfeed/ai-ecosystem-daily](https://huggingface.co/datasets/tensorfeed/ai-ecosystem-daily). Daily JSONL snapshots of the public API committed at 08:00 UTC by `.github/workflows/huggingface-push.yml`. Inference-only license per AFTA

## MCP server quick start

The TensorFeed MCP server is the fastest way to plug an AI agent into the TensorFeed API.

```bash
npx -y @tensorfeed/mcp-server
```

Or in your Claude Desktop / Claude Code config:

```json
{
  "mcpServers": {
    "tensorfeed": {
      "command": "npx",
      "args": ["-y", "@tensorfeed/mcp-server"]
    }
  }
}
```

Free tools work without auth. To enable the 13 paid tools (routing recommendations, news search, history series, cost projection, provider deep-dive, model comparison, MCP registry series, webhook watches, and more), add a `TENSORFEED_TOKEN` env var. Buy credits at [tensorfeed.ai/developers/agent-payments](https://tensorfeed.ai/developers/agent-payments) using USDC on Base. New wallets get a 50-credit welcome bonus on first payment.

Listed in the official MCP server registry as `ai.tensorfeed/mcp-server`. See `mcp-server/README.md` for the full tool catalog, example agent queries, and pricing.

## API

All endpoints live at `https://tensorfeed.ai/api/*`.

**Free, no auth:**
- `/api/news`, `/api/status`, `/api/models`, `/api/benchmarks`, `/api/incidents`
- `/api/agents/activity`, `/api/agents/news`, `/api/agents/status`, `/api/agents/pricing`, `/api/agents/directory`
- `/api/podcasts`, `/api/trending-repos`
- `/api/history`, `/api/history/{YYYY-MM-DD}/{type}` (daily snapshots)
- `/api/mcp/registry/snapshot` (daily telemetry of the official MCP server registry)
- `/api/health`, `/api/ping`, `/api/meta`, `/api/cron-status`

**Paid (1 credit each, USDC on Base):**
- `/api/premium/routing`, `/api/premium/news/search`, `/api/premium/cost/projection`
- `/api/premium/history/pricing/series`, `/api/premium/history/benchmarks/series`, `/api/premium/history/status/uptime`
- `/api/premium/agents/directory`, `/api/premium/providers/{name}`, `/api/premium/compare/models`
- `/api/premium/whats-new` (agent morning brief), `/api/premium/mcp/registry/series`
- `/api/premium/watches` (webhook watches with daily/weekly digest tier)

Full documentation: [tensorfeed.ai/developers](https://tensorfeed.ai/developers) and [tensorfeed.ai/developers/agent-payments](https://tensorfeed.ai/developers/agent-payments). Machine-readable: [`/llms.txt`](https://tensorfeed.ai/llms.txt), [`/openapi.json`](https://tensorfeed.ai/openapi.json), [`/.well-known/x402.json`](https://tensorfeed.ai/.well-known/x402.json).

## Discovery surfaces for AI agents

- Official MCP server registry: `ai.tensorfeed/mcp-server`
- llms.txt: https://tensorfeed.ai/llms.txt
- OpenAPI 3.1 spec: https://tensorfeed.ai/openapi.json
- x402 V2 manifest: https://tensorfeed.ai/.well-known/x402.json
- Agent-first landing: https://tensorfeed.ai/for-ai-agents
- View as Agent toggle: every page on the site exposes the underlying API JSON via a navbar toggle, so agents can introspect what powers any view

## Stack

Next.js 14 (static export), Cloudflare Pages + Workers + KV, Tailwind CSS, JetBrains Mono + Inter, Resend for email alerts, Cloudflare Web Analytics. The MCP server is plain TypeScript on top of the official `@modelcontextprotocol/sdk`.

## Development

```bash
npm install
npm run dev      # Next.js dev server at localhost:3000
npm run build    # Static export
npm run lint
```

Worker:

```bash
cd worker
npm install
npm test         # 214 vitest cases, all green
wrangler deploy
```

MCP server:

```bash
cd mcp-server
npm install
npm run build
npm start
```

## License

MIT. See `LICENSE`.

## Contact

- support@tensorfeed.ai
- press@tensorfeed.ai
- feedback@tensorfeed.ai

A Pizza Robot Studios project.
