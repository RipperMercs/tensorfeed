# TensorFeed Distribution Playbook

Copy-paste-ready submissions for the directories, registries, and awesome-lists where AI agent and MCP developers go to find tools. Work top to bottom; the early ones have the highest ceiling.

**Prerequisite for most submissions:** the npm package `@tensorfeed/mcp-server` (now at 1.7.0 locally) must be published so `npx -y @tensorfeed/mcp-server` works for whoever clicks through. Publish first, then submit.

```
# TypeScript SDK (1.1.0 on npm, 1.11.0 local)
cd sdk/javascript && npm publish

# MCP server (1.0.0 on npm, 1.7.0 local)
cd ../../mcp-server && npm publish --access public

# Python SDK (1.3.0 on PyPI, 1.12.0 local)
cd ../sdk/python && python -m build && twine upload dist/tensorfeed-1.4.0* dist/tensorfeed-1.5.0* dist/tensorfeed-1.6.0* dist/tensorfeed-1.7.0* dist/tensorfeed-1.8.0* dist/tensorfeed-1.9.0* dist/tensorfeed-1.10.0* dist/tensorfeed-1.11.0* dist/tensorfeed-1.12.0*
```

The MCP server `server.json` manifest already exists at `mcp-server/server.json` so the registry publisher CLI can read it directly. No authoring step needed.

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
- **[TensorFeed MCP Server](https://github.com/RipperMercs/tensorfeed/tree/main/mcp-server)** ([npm](https://www.npmjs.com/package/@tensorfeed/mcp-server)) – AI news, service status, model pricing, plus 15 premium tools (routing, news search, history series, cost projection, forecasting, provider deep-dive, model comparison, webhook watches with digest tier, account management). Pay-per-call premium endpoints in USDC on Base, registered in the official MCP registry. Free tier with no auth, premium tier with bearer token via `TENSORFEED_TOKEN`.
```

PR title: `Add TensorFeed MCP server to community resources`

PR description:
```
Adds TensorFeed.ai MCP server to the community resources list.

What it exposes:
- 5 free tools: AI news, status, is-down checks, model pricing, today summary
- 15 premium tools: routing recommendations, news search, history series (pricing/benchmark/uptime), snapshot diff, enriched agents directory, cost projection, forecasting, provider deep-dive, model comparison, webhook watches (with daily/weekly digest tier), account balance/usage

What's novel: first MCP server I know of with native pay-per-call billing in USDC on Base. Validated end-to-end on Base mainnet (tx 0x13bc9e2378edae44685a63bdedd3ba802372e2e656961610b8c169ca60431c0e). Free tools work without configuration; premium tools require a bearer token from /api/payment/buy-credits passed via TENSORFEED_TOKEN env var. The full payment flow follows x402 V2 with a discovery manifest at /.well-known/x402.

Already registered in the official MCP registry (registry.modelcontextprotocol.io) as ai.tensorfeed/mcp-server.

npm: https://www.npmjs.com/package/@tensorfeed/mcp-server
Source: https://github.com/RipperMercs/tensorfeed/tree/main/mcp-server
Docs: https://tensorfeed.ai/developers/agent-payments
Discovery: https://tensorfeed.ai/.well-known/x402
```

---

### 3. `punkpeye/awesome-mcp-servers` — Most-watched community list

The most-mentioned awesome-mcp-servers list. Has an associated web frontend at glama.ai/mcp/servers.

**Fastest path: GitHub web UI**

1. Open https://github.com/punkpeye/awesome-mcp-servers/blob/main/README.md
2. Click the pencil icon (top right of file) — GitHub forks and opens an editor in your browser
3. Find the `## 🔗 Aggregators` section. Paste the entry below, alphabetically by GitHub username (it goes near `[RipperMercs/...]`)
4. Commit message + PR title: see below

**Entry to paste (alphabetical by username):**
```markdown
- [RipperMercs/tensorfeed](https://github.com/RipperMercs/tensorfeed/tree/main/mcp-server) 📇 ☁️ - AI news + machine-payable intelligence. 5 free tools (news, status, is-down, pricing, today summary). 15 premium tools at 1 credit each (USDC on Base): routing recommendations, news search, pricing/benchmark/uptime history series, snapshot diff, enriched agents directory, cost projection, forecasting, provider deep-dive, model comparison, webhook watches with daily/weekly digest tier, account balance/usage. Install: `npx @tensorfeed/mcp-server`
```

Badges: 📇 = TypeScript, ☁️ = Cloud Service.

**PR title:**
```
Add TensorFeed MCP server to Aggregators (machine-payable AI intelligence)
```

**PR body:**
```
Adds @tensorfeed/mcp-server to the Aggregators section.

What it is: an MCP server that exposes 20 tools (5 free, 15 premium) for AI news, service status, model pricing, premium routing recommendations, news search, history series, cost projection, forecasting, provider deep-dive, model comparison, and webhook watches.

Why it might be interesting to this list: this is the first MCP server I'm aware of with native pay-per-call billing in USDC on Base. Validated end-to-end on Base mainnet (tx 0x13bc9e2378edae44685a63bdedd3ba802372e2e656961610b8c169ca60431c0e). Free tools work without configuration; premium tools require a bearer token via the TENSORFEED_TOKEN env var. x402 V2 discovery manifest at /.well-known/x402 so x402-compatible facilitators can auto-index.

Install: `npx @tensorfeed/mcp-server`
Source: https://github.com/RipperMercs/tensorfeed/tree/main/mcp-server
Docs: https://tensorfeed.ai/developers/agent-payments
Already in the official MCP registry as ai.tensorfeed/mcp-server.
```

**If you want the local-fork path instead:**
```bash
gh repo fork punkpeye/awesome-mcp-servers --clone
cd awesome-mcp-servers
# edit README.md, add the line under ## 🔗 Aggregators alphabetically
git add README.md
git commit -m "Add TensorFeed MCP server to Aggregators (machine-payable AI intelligence)"
git push
gh pr create --title "Add TensorFeed MCP server to Aggregators (machine-payable AI intelligence)" --body-file <(cat <<'EOF'
[paste the PR body from above]
EOF
)
```

---

### 4. `xpaysh/awesome-x402` — The x402 ecosystem list

The single best fit. x402 is the standard we implement; this list is read by everyone shipping x402 services.

**Fastest path: GitHub web UI**

1. Open https://github.com/xpaysh/awesome-x402/blob/main/README.md
2. Click the pencil icon, GitHub auto-forks
3. Find `## 🌟 Ecosystem Projects` → `Tools & Services` subsection. Paste the entry below alphabetically.

**Entry to paste:**
```markdown
- [TensorFeed](https://tensorfeed.ai/developers/agent-payments) - Pay-per-call AI news and intelligence API. 18 premium endpoints (routing recommendations, news search, history series, enriched agents directory, cost projection, forecasting, provider deep-dive, model comparison, webhook watches with daily/weekly digest tier) at 1 credit (~$0.02) per call. Credits-first flow with x402 fallback, x402 V2 discovery manifest at `/.well-known/x402`, full Python and TypeScript SDKs, MCP server with 20 tools. Validated end-to-end on Base mainnet. ([GitHub](https://github.com/RipperMercs/tensorfeed)) ([npm](https://www.npmjs.com/package/tensorfeed)) ([PyPI](https://pypi.org/project/tensorfeed/)) ([discovery manifest](https://tensorfeed.ai/.well-known/x402))
```

**PR title:**
```
Add TensorFeed: pay-per-call AI intelligence API on Base, x402 V2 discovery
```

**PR body:**
```
Adds TensorFeed.ai to the Ecosystem Projects > Tools & Services section.

What's there: an x402-compatible API for AI news, model pricing, benchmarks, and 18 premium intelligence endpoints (routing recommendations, news search, history series, cost projection, forecasting, provider deep-dive, model comparison, webhook watches with a daily/weekly digest tier). Pay-per-call in USDC on Base at $0.02 per credit, volume discounts at $5/$30/$200.

x402 V2 specifically:
- Discovery manifest at https://tensorfeed.ai/.well-known/x402 (also served at /.well-known/x402.json) declaring all 11 paid endpoint listings with input/output schemas, accepts.amount in atomic USDC units, payTo address, and asset spec
- Both flows supported: credits-first (recommended for repeat use) and per-call x402 with X-Payment-Tx header (fallback for discovery)
- Validated end-to-end on Base mainnet. Tx: 0x13bc9e2378edae44685a63bdedd3ba802372e2e656961610b8c169ca60431c0e

SDKs:
- Python: `pip install tensorfeed` (PyPI)
- TypeScript: `npm install tensorfeed` (npm)
- MCP server: `npx @tensorfeed/mcp-server` (npm)

Source: https://github.com/RipperMercs/tensorfeed
Docs: https://tensorfeed.ai/developers/agent-payments
```

**Local-fork path (same shape as #3):**
```bash
gh repo fork xpaysh/awesome-x402 --clone
cd awesome-x402
# edit README.md, paste entry under Ecosystem Projects > Tools & Services
git add README.md
git commit -m "Add TensorFeed: pay-per-call AI intelligence API on Base, x402 V2 discovery"
git push
gh pr create --title "Add TensorFeed: pay-per-call AI intelligence API on Base, x402 V2 discovery"
```

---

### 5. `wong2/awesome-mcp-servers`, `appcypher/awesome-mcp-servers`, `TensorBlock/awesome-mcp-servers`

Same entry as #3, adapted to whatever section structure each repo uses. Each is its own PR.

For all three, the line is the same:
```markdown
- [tensorfeed](https://github.com/RipperMercs/tensorfeed/tree/main/mcp-server) - AI news, status, model pricing, premium pay-per-call endpoints (USDC on Base). 5 free tools, 15 premium tools. `npx @tensorfeed/mcp-server`
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

**Title (under 80 chars, includes the hook + the rail):**
```
Show HN: TensorFeed – Pay AI agents per call in USDC on Base, x402 compatible
```

**Body (tightened, lead with the receipt, end with the question):**
```
Hi HN,

I built TensorFeed.ai as a real-time AI news and intelligence API. Yesterday I shipped a payment layer that lets AI agents pay per call in USDC on Base. No accounts, no API keys, no Stripe.

The receipt first, because most "shipped a payment system" posts don't have one:

  Tx 0x13bc9e2378edae44685a63bdedd3ba802372e2e656961610b8c169ca60431c0e
  1 USDC -> 50 credits -> one premium routing call charged 1 credit -> balance 49.
  Five steps, ran in under two minutes from a Python REPL, worked first try.

Verifiable on Basescan; the full trace is at https://tensorfeed.ai/originals/validating-agent-payments-mainnet

Why I think this matters: less than 1% of paid APIs on the internet are machine-payable today. Almost every paid API still requires a human signup form, a credit card, and a copy-paste API key. That works fine when the buyer is human. It doesn't work for an agent making decisions in a loop at 3am.

What's live as of now:

- 18 paid premium endpoints at $0.02 per credit (50 credits per $1 USDC), volume discounts at $5/$30/$200
- Endpoints cover: model routing recommendations with composite scoring, full-text news search over our article corpus, daily price/benchmark/uptime history series, snapshot diff between any two dates, enriched agents directory with derived trending score, cost projection across 1-10 models, conservative regression-based forecasting, single-call provider deep-dive, side-by-side model comparison, webhook watches with realtime price/status triggers AND a scheduled digest tier
- Discovery: x402 V2 manifest at https://tensorfeed.ai/.well-known/x402 so CDP Bazaar facilitators auto-index us
- MCP server at @tensorfeed/mcp-server so Claude Desktop / Code can call the premium tools directly via the TENSORFEED_TOKEN env var
- Python and TypeScript SDKs on PyPI/npm
- Cross-site bundle: TerminalFeed.io shares the credit pool via an internal validate-and-charge endpoint, one purchase, both sites
- 147 worker tests, all passing, all pure-logic so they run in 500ms

I want to be honest about scope: this is a real-money system that has moved exactly $1 of real money so far. The architecture is right, the math is right, the on-chain verification works, but volume is zero. I'm posting because I'd rather find out the hard parts now than later. Specifically interested in feedback on:

1. The credit-account model (one bearer token, debit-style) vs strict per-call x402. We do both; recommended path is credits because per-call is 3-4 seconds of latency. Is that the right tradeoff?
2. Wallet attestation across four published locations (TLS + multi-publication, no DNS TXT signing yet). Strong enough?
3. Are there x402 V2 details I'm missing in the discovery manifest?

Docs: https://tensorfeed.ai/developers/agent-payments
Source: https://github.com/RipperMercs/tensorfeed
Build retrospective (18 endpoints in 24 hours, here's what compounded): https://tensorfeed.ai/originals/15-paid-endpoints-24-hours
```

Post on a Tuesday-Thursday morning Pacific time for best engagement. Good titles avoid superlatives ("the first", "everyone needs"), good first paragraphs lead with verifiable evidence (the tx hash), good closes invite specific feedback rather than vague "thoughts?"

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
