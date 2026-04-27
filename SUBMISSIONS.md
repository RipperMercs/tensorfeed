# TensorFeed Distribution Playbook

Copy-paste-ready submissions for the directories, registries, and awesome-lists where AI agent and MCP developers go to find tools. Work top to bottom; the early ones have the highest ceiling.

**Prerequisite for most submissions:** the npm package `@tensorfeed/mcp-server@1.2.0+` must be published so `npx -y @tensorfeed/mcp-server` works for whoever clicks through. Publish first, then submit.

```
cd sdk/javascript && npm publish
cd ../../mcp-server && npm publish --access public
cd ../sdk/python && python -m build && twine upload dist/tensorfeed-1.4.0* dist/tensorfeed-1.5.0* dist/tensorfeed-1.6.0* dist/tensorfeed-1.7.0*
```

---

## Tier 1: Highest leverage (do these first)

### 1. Official MCP Registry — `registry.modelcontextprotocol.io`

The official one, run by Anthropic and the MCP working group. Lower noise than the awesome-lists, higher authority. Publishing here means we show up in any MCP client that consumes the registry.

**How:**
```bash
git clone https://github.com/modelcontextprotocol/registry
cd registry
make publisher
./bin/mcp-publisher login github
./bin/mcp-publisher publish
```

The publisher CLI reads a `server.json` from the project root. We need to author one in `mcp-server/server.json`. (Stub below.)

**`mcp-server/server.json` (commit this to the repo):**
```json
{
  "name": "@tensorfeed/mcp-server",
  "version": "1.2.0",
  "description": "TensorFeed.ai MCP server: AI news, status, model pricing, premium routing, history series, webhook watches, and news search. Pay-per-call premium endpoints in USDC on Base.",
  "homepage": "https://tensorfeed.ai/developers/agent-payments",
  "repository": "https://github.com/RipperMercs/tensorfeed",
  "license": "MIT",
  "tags": ["ai-news", "x402", "usdc", "base", "model-routing", "agent-payments"]
}
```

**Auth:** GitHub OAuth (you are `RipperMercs`). The publisher CLI walks you through it.

---

### 2. `modelcontextprotocol/servers` — Official Community Servers list

The reference list inside the official MCP repo. PR adds us to the "Community Servers" or "Resources" section.

**Submit a PR that adds this line under `## Resources` (alphabetical):**
```markdown
- **[TensorFeed MCP Server](https://github.com/RipperMercs/tensorfeed/tree/main/mcp-server)** ([npm](https://www.npmjs.com/package/@tensorfeed/mcp-server)) – AI news, service status, model pricing, premium routing, news search, webhook watches, and account management. Pay-per-call premium endpoints in USDC on Base. Free tier with no auth, premium tier with bearer token via `TENSORFEED_TOKEN`.
```

PR title: `Add TensorFeed MCP server to community resources`

PR description:
```
Adds TensorFeed.ai MCP server to the community resources list.

What it exposes:
- 5 free tools: AI news, status, is-down checks, model pricing, today summary
- 12 premium tools: routing recommendations, history series (pricing/benchmark/uptime/compare), news search, enriched agents directory, webhook watches, account management

What's novel: first MCP server we know of with native pay-per-call billing in USDC on Base. Validated end-to-end on Base mainnet (tx 0x13bc9e23...). Free tools work without configuration; premium tools require a bearer token from /api/payment/buy-credits passed via TENSORFEED_TOKEN env var.

npm: https://www.npmjs.com/package/@tensorfeed/mcp-server
Source: https://github.com/RipperMercs/tensorfeed/tree/main/mcp-server
Docs: https://tensorfeed.ai/developers/agent-payments
```

---

### 3. `punkpeye/awesome-mcp-servers` — Most-watched community list

The most-mentioned awesome-mcp-servers list. Has an associated web frontend at glama.ai/mcp/servers.

**PR adds this line under `## 🔗 Aggregators` (alphabetical by username):**
```markdown
- [RipperMercs/tensorfeed](https://github.com/RipperMercs/tensorfeed/tree/main/mcp-server) 📇 ☁️ - AI news aggregator + machine-payable premium API. Free tools cover news, status, pricing, benchmarks. Premium tools (1 credit per call, USDC on Base) cover routing recommendations, news search, history series, enriched agents directory, and webhook watches. Install: `npx @tensorfeed/mcp-server`
```

Badges: 📇 = TypeScript, ☁️ = Cloud Service.

---

### 4. `xpaysh/awesome-x402` — The x402 ecosystem list

The single best fit. x402 is the standard we implement; this list is read by everyone shipping x402 services.

**PR adds this under `## 🌟 Ecosystem Projects > Tools & Services`:**
```markdown
- [TensorFeed](https://tensorfeed.ai/developers/agent-payments) - Pay-per-call AI news and intelligence API. 14 premium endpoints (routing recommendations, history series, news search, enriched agents directory, webhook watches) at 1 credit (~$0.02) per call. Credits-first flow with x402 fallback, full SDKs and MCP server. Validated end-to-end on Base mainnet. ([GitHub](https://github.com/RipperMercs/tensorfeed)) ([npm](https://www.npmjs.com/package/tensorfeed)) ([PyPI](https://pypi.org/project/tensorfeed/))
```

PR title: `Add TensorFeed: pay-per-call AI intelligence API on Base`

---

### 5. `wong2/awesome-mcp-servers`, `appcypher/awesome-mcp-servers`, `TensorBlock/awesome-mcp-servers`

Same entry as #3, adapted to whatever section structure each repo uses. Each is its own PR.

For all three, the line is the same:
```markdown
- [tensorfeed](https://github.com/RipperMercs/tensorfeed/tree/main/mcp-server) - AI news, status, model pricing, premium pay-per-call endpoints (USDC on Base). 5 free tools, 12 premium tools. `npx @tensorfeed/mcp-server`
```

(Drop the badges if a list doesn't use them.)

---

## Tier 2: Web directories

### 6. mcpservers.org

Web-based MCP directory. Submit via whatever form/PR mechanism they use (check the site footer when you visit). The metadata they typically want:

- Name: TensorFeed MCP Server
- npm: @tensorfeed/mcp-server
- Description: same as the punkpeye entry above
- Categories: News, Pricing/Models, Premium/Paid

### 7. mcp.so

Another web directory. Same metadata as mcpservers.org. Often has a "Submit your MCP server" link in the nav.

### 8. Smithery.ai

CLI-based registry (~6,000 servers indexed). One command:

```bash
cd mcp-server
smithery mcp publish "https://github.com/RipperMercs/tensorfeed/tree/main/mcp-server" -n RipperMercs/tensorfeed-mcp
```

Or use the web flow at smithery.ai. Heads up: a path-traversal vuln was disclosed October 2025; their team patched it but treat it as a "discoverability" target rather than a primary install path. Don't ship secrets through their config.

---

## Tier 3: Adjacent ecosystems

### 9. `e2b-dev/awesome-sdks-for-ai-agents`

The SDK companion to `awesome-ai-agents`. We don't fit `awesome-ai-agents` itself (their README says "agents only" not data providers), but the SDKs list is a fit.

**PR adds this under the appropriate language section:**
```markdown
### TensorFeed
- **Description**: Python and TypeScript SDKs for the TensorFeed.ai API: AI news, model pricing, status, benchmarks, and premium pay-per-call endpoints (USDC on Base, x402 compatible)
- **Languages**: Python ([PyPI](https://pypi.org/project/tensorfeed/)), TypeScript ([npm](https://www.npmjs.com/package/tensorfeed))
- **Source**: https://github.com/RipperMercs/tensorfeed
- **Docs**: https://tensorfeed.ai/developers/agent-payments
```

Submission form: https://forms.gle/UXQFCogLYrPFvfoUA (per their README)

---

## Tier 4: One-time announcements

### 10. Hacker News — Show HN

One post, one shot. Best after npm + PyPI publishing is done.

**Title:**
```
Show HN: TensorFeed – Pay AI agents in USDC on Base, no accounts, x402 compatible
```

**Body:**
```
Hey HN,

I built TensorFeed.ai as a real-time AI news and intelligence API and just shipped a payment layer that lets AI agents pay per call in USDC on Base. No accounts, no API keys, no Stripe.

I validated the full payment loop on Base mainnet this morning. Tx 0x13bc9e2378edae44685a63bdedd3ba802372e2e656961610b8c169ca60431c0e: 1 USDC bought 50 credits, one premium routing call charged 1 credit, balance went 50→49. All five steps worked first try.

Why this might matter: less than 1% of paid APIs on the internet are machine-payable today. Almost every paid API still requires a human signup form, credit card, and copy-paste API key. That works fine when the buyer is human; it doesn't work for an agent making decisions in a loop.

What's live (14 paid endpoints):
- Routing recommendations (top-N model with composite score)
- History series (pricing/benchmark/uptime time series and snapshot diffs)
- News search (full-text over our article corpus)
- Webhook watches (HMAC-signed deliveries on price or status transitions)
- Enriched agents directory with derived trending score

Plus a free tier (news, status, pricing, benchmarks) and an MCP server so Claude Desktop can call the premium tools directly.

Pricing: 50 credits per $1 USDC (so $0.02 per call), volume discounts at $5/$30/$200.

Happy to answer questions about the architecture, the verification flow (we read the USDC Transfer event from eth_getTransactionReceipt), or what surprised me about shipping it.

Docs: https://tensorfeed.ai/developers/agent-payments
Validation post: https://tensorfeed.ai/originals/validating-agent-payments-mainnet
Source: https://github.com/RipperMercs/tensorfeed
```

Post on a Tuesday-Thursday morning Pacific time for best engagement.

### 11. Anthropic Developer Discord / Claude Developers community

Share the MCP server in the appropriate channel. Lightweight, a single message:

```
Hey, just shipped a free MCP server that exposes AI news, model pricing, and service status to Claude Desktop / Claude Code: `npx -y @tensorfeed/mcp-server`. There's also a premium tier (model routing, news search, history series, webhook watches) that's pay-per-call in USDC on Base, no accounts. Validated end-to-end on mainnet today. Source: https://github.com/RipperMercs/tensorfeed/tree/main/mcp-server. Happy to answer questions.
```

### 12. r/LocalLLaMA + r/AIAgents (Reddit)

Subreddits where MCP and agent-payment tooling actually gets discussed. Don't post the same body as HN; rewrite for the audience. Self-promotion rules vary, so check each sub's rules first.

---

## Tracking checklist

| # | Target | Action | Status | Posted |
|---|--------|--------|--------|--------|
| 1 | registry.modelcontextprotocol.io | `mcp-publisher publish` | ☐ | |
| 2 | modelcontextprotocol/servers | PR | ☐ | |
| 3 | punkpeye/awesome-mcp-servers | PR | ☐ | |
| 4 | xpaysh/awesome-x402 | PR | ☐ | |
| 5a | wong2/awesome-mcp-servers | PR | ☐ | |
| 5b | appcypher/awesome-mcp-servers | PR | ☐ | |
| 5c | TensorBlock/awesome-mcp-servers | PR | ☐ | |
| 6 | mcpservers.org | Web form | ☐ | |
| 7 | mcp.so | Web form | ☐ | |
| 8 | smithery.ai | `smithery mcp publish` | ☐ | |
| 9 | e2b-dev/awesome-sdks-for-ai-agents | Form/PR | ☐ | |
| 10 | Hacker News (Show HN) | Post | ☐ | |
| 11 | Anthropic Discord | DM/message | ☐ | |
| 12 | r/LocalLLaMA, r/AIAgents | Post | ☐ | |

---

## Notes on positioning

A few framings that have worked in early conversations:

- "First machine-payable AI intelligence API. No accounts, no API keys, no Stripe."
- "x402 + MCP. Pay-per-call AI news, pricing, and routing recommendations in USDC on Base."
- "Validated end-to-end on Base mainnet. Real tx hash, real credits, no bugs surfaced."

The `/originals/validating-agent-payments-mainnet` article is the strongest single piece of proof. Link to it from any longer post.

If you get pushback on "why USDC instead of Stripe," the short answer is: agents don't have credit cards, USDC settles in seconds with no chargebacks, and Base gas is sub-cent so $0.02 micropayments are economically viable. The longer answer is in `AGENT-PAYMENTS-SPEC.md`.

---

## After landing each submission

Update this file's tracking table with the date you posted and the URL of the PR/listing/post. That gives us a clean history of what landed where, useful for debugging "why is `tensorfeed` not in X anymore" questions later.
