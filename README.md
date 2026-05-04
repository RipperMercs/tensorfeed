# TensorFeed.ai

[![Site](https://img.shields.io/badge/site-tensorfeed.ai-2563eb?style=flat-square)](https://tensorfeed.ai)
[![MCP Server](https://img.shields.io/npm/v/@tensorfeed/mcp-server.svg?label=%40tensorfeed%2Fmcp-server&style=flat-square&color=cb3837)](https://github.com/RipperMercs/tensorfeed-mcp)
[![HF Dataset](https://img.shields.io/badge/HF-tensorfeed%2Fai--ecosystem--daily-yellow?style=flat-square)](https://huggingface.co/datasets/tensorfeed/ai-ecosystem-daily)
[![AFTA Certified](https://img.shields.io/badge/AFTA-Certified-7c3aed?style=flat-square)](https://tensorfeed.ai/agent-fair-trade)
[![x402](https://img.shields.io/badge/x402-USDC%20on%20Base-0052ff?style=flat-square)](https://tensorfeed.ai/.well-known/x402.json)
[![License: MIT](https://img.shields.io/badge/License-MIT-green.svg?style=flat-square)](LICENSE)

Real-time AI ecosystem intelligence built for humans **and** AI agents. News from 36+ sources, live service status for every major LLM provider, model pricing and benchmark history, an AI agents directory, and a pay-per-call premium API settled in USDC on Base mainnet (no accounts, no API keys).

🌐 **Site:** https://tensorfeed.ai · 📊 **Sister site:** [terminalfeed.io](https://terminalfeed.io) · 📦 **HF dataset:** [tensorfeed/ai-ecosystem-daily](https://huggingface.co/datasets/tensorfeed/ai-ecosystem-daily) · 🤖 **MCP server:** [tensorfeed-mcp](https://github.com/RipperMercs/tensorfeed-mcp)

## Three things make this different

1. **Code-enforced fair trade for agents.** TensorFeed is the reference implementation of the [Agent Fair-Trade Agreement](https://tensorfeed.ai/agent-fair-trade) (AFTA). Every paid call returns no charge on 5xx, breaker, schema-fail, or stale data, plus an Ed25519-signed receipt your agent can verify offline. Most APIs promise this. We code it.

2. **Two networks already federated.** TensorFeed.ai and [TerminalFeed.io](https://terminalfeed.io) accept each other's bearer tokens via a server-to-server validate + commit rail. One token, two sites. Other publishers can self-adopt by publishing a conforming `/.well-known/agent-fair-trade.json`.

3. **x402 from day one.** No subscription, no signup, no email-me-the-API-key. Send USDC on Base, get a token, agent uses it. Compatible with [Stripe Link Agents](https://link.com/agents) (April 2026 release) — same x402 protocol, different scheme.

## Drop-in MCP server

The fastest way to plug an AI agent into TensorFeed is the official MCP server. It works in Claude Desktop, Claude Code, Cursor, Cline, Continue, Zed, Goose, and anywhere else that takes a stdio MCP config.

```jsonc
// claude_desktop_config.json
{
  "mcpServers": {
    "tensorfeed": {
      "command": "npx",
      "args": ["-y", "@tensorfeed/mcp-server"]
    }
  }
}
```

Restart your client and ask: *"What's happening in AI today?"* or *"Compare pricing between Claude Opus and GPT-4o."*

The MCP server has its own dedicated repo: **[github.com/RipperMercs/tensorfeed-mcp](https://github.com/RipperMercs/tensorfeed-mcp)** ⭐ — full tool catalog, premium config, and example queries live there.

## Try the API in 30 seconds

```bash
# Free, no auth
curl -s https://tensorfeed.ai/api/news?limit=5 | jq '.articles[] | {title, source}'

# Real-time provider status
curl -s https://tensorfeed.ai/api/status | jq '.services[] | {name, status}'

# Live model pricing across every provider
curl -s https://tensorfeed.ai/api/agents/pricing | jq '.pricing[] | {model, input_per_1m, output_per_1m}'
```

For premium endpoints (routing, history series, news search, cost projection, webhook watches, etc), buy credits in USDC on Base at [tensorfeed.ai/developers/agent-payments](https://tensorfeed.ai/developers/agent-payments). 50 credits per dollar at base rate, volume tiers up to 40% off, 50-credit welcome bonus on a wallet's first payment.

## What's in the box

| Surface | What it is | Where |
|---------|-----------|-------|
| **Web dashboard** | Next.js 14, dark/light mode, 60+ pages | `src/`, deployed to Cloudflare Pages |
| **API backend** | Cloudflare Worker `tensorfeed-api`, 70+ endpoints, 14 paid | `worker/`, attached to `tensorfeed.ai/api/*` |
| **MCP server** | 22 tools (8 free, 14 paid), npm `@tensorfeed/mcp-server` | [`tensorfeed-mcp` repo](https://github.com/RipperMercs/tensorfeed-mcp) (mirrored from `mcp-server/`) |
| **Python SDK** | `pip install tensorfeed`, optional `[web3]` for one-call USDC | `sdk/python/` |
| **JavaScript SDK** | `npm install tensorfeed` | `sdk/javascript/` |
| **HF dataset** | 42 daily JSONL feeds, 08:00 UTC commit, inference-only license | [`tensorfeed/ai-ecosystem-daily`](https://huggingface.co/datasets/tensorfeed/ai-ecosystem-daily) |

## Free public endpoints

```
/api/news                  /api/status                /api/models
/api/benchmarks            /api/incidents             /api/pricing
/api/agents/{activity,news,status,pricing,directory}
/api/podcasts              /api/trending-repos        /api/attention
/api/embodied-ai           /api/training-datasets     /api/mcp-servers
/api/mcp/registry/snapshot /api/probe/latest          /api/gpu/pricing
/api/benchmark-registry    /api/harnesses             /api/funding
/api/health, /api/ping, /api/meta, /api/cron-status
```

## Paid endpoints (1 credit each, USDC on Base)

```
/api/premium/routing                          # smart model routing
/api/premium/news/search                      # full-text + filters
/api/premium/cost/projection                  # workload cost projection
/api/premium/whats-new                        # agent morning brief
/api/premium/compare/models                   # side-by-side comparison
/api/premium/providers/{name}                 # one-provider deep dive
/api/premium/agents/directory                 # enriched + sortable
/api/premium/watches                          # webhook watches + digest
/api/premium/history/{pricing,benchmarks,status}/series
/api/premium/{mcp/registry,probe,gpu/pricing,attention}/series
```

Full docs: [tensorfeed.ai/developers](https://tensorfeed.ai/developers) · [agent-payments flow](https://tensorfeed.ai/developers/agent-payments) · machine-readable: [`/llms.txt`](https://tensorfeed.ai/llms.txt), [`/openapi.json`](https://tensorfeed.ai/openapi.json), [`/.well-known/x402.json`](https://tensorfeed.ai/.well-known/x402.json), [`/.well-known/agent-fair-trade.json`](https://tensorfeed.ai/.well-known/agent-fair-trade.json).

## Discovery surfaces

- Official MCP server registry: [`ai.tensorfeed/mcp-server`](https://registry.modelcontextprotocol.io/v0/servers/ai.tensorfeed/mcp-server)
- Hugging Face dataset: [`tensorfeed/ai-ecosystem-daily`](https://huggingface.co/datasets/tensorfeed/ai-ecosystem-daily)
- llms.txt: https://tensorfeed.ai/llms.txt
- OpenAPI 3.1 spec: https://tensorfeed.ai/openapi.json
- x402 manifest: https://tensorfeed.ai/.well-known/x402.json
- AFTA manifest: https://tensorfeed.ai/.well-known/agent-fair-trade.json
- "View as Agent" toggle on every page exposes the underlying JSON
- Listed in [punkpeye/awesome-mcp-servers](https://github.com/punkpeye/awesome-mcp-servers), [TensorBlock/awesome-mcp-servers](https://github.com/TensorBlock/awesome-mcp-servers), [public-apis/public-apis](https://github.com/public-apis/public-apis), and others

## Star this repo ⭐

If TensorFeed is useful to you (or your agents), starring helps other builders find it. The [MCP server repo](https://github.com/RipperMercs/tensorfeed-mcp) is also begging for stars if you use that surface specifically.

## Built with Claude

TensorFeed was designed by Ripper in collaboration with Claude (Anthropic). Specific systems Claude designed alongside: the agent payments rail, the active LLM probes, the GPU pricing aggregator, the OFAC sanctions screening pipeline, the routing engine, and the [AFTA standard](https://tensorfeed.ai/agent-fair-trade) itself. Git log shows the build trail.

## Stack

Next.js 14 (static export) · Cloudflare Pages + Workers + KV · Tailwind · JetBrains Mono + Inter · Resend (email) · Cloudflare Web Analytics · Vitest. MCP server is plain TypeScript on top of the official `@modelcontextprotocol/sdk`.

## Development

```bash
npm install
npm run dev      # Next.js dev server at localhost:3000
npm run build    # Static export (runs prebuild: fetch-feeds + generate-llms-full)
npm run lint
```

Worker (from `worker/`):

```bash
npm install
npm test         # 318 vitest cases, all green
wrangler deploy
```

MCP server (from `mcp-server/` or the [standalone repo](https://github.com/RipperMercs/tensorfeed-mcp)):

```bash
npm install
npm run build
npm start
```

## License

MIT. See `LICENSE`. Premium API responses ship under an inference-only license (no model training); see [tensorfeed.ai/agent-fair-trade](https://tensorfeed.ai/agent-fair-trade) for the full terms.

## Contact

- support@tensorfeed.ai
- press@tensorfeed.ai
- feedback@tensorfeed.ai
- Bug reports: [GitHub issues](https://github.com/RipperMercs/tensorfeed/issues)

A [Pizza Robot Studios](https://pizzarobotstudios.com) project.
