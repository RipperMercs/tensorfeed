# TensorFeed Agent Payments: Architecture Spec (v2)

## Vision

TensorFeed becomes the first AI data hub that treats autonomous agents as paying customers. Agents buy credits via USDC (on Base) or traditional payment (Stripe), then consume premium data feeds at millisecond latency using a bearer token. Revenue flows to a TensorFeed-controlled wallet or Stripe account with zero platform risk. No middlemen deciding who gets to participate.

## Why This Works Now

1. MCP hit 97M installs. Agents are real consumers of web data.
2. Coinbase shipped AgentKit and the x402 protocol for agent-native HTTP payments.
3. Base L2 transaction fees are under $0.01, making micropayments viable.
4. TensorFeed already tracks 25+ bot types hitting the API daily. These are future customers.
5. Nobody else is building paid data services for agents. The market is uncontested.
6. Historical data compounds: every day of snapshots is a day competitors can never backfill.

## Core Architecture Decisions

### Credits-first, x402 as fallback

Per-call x402 (pay on-chain for each request) adds 3-4 seconds of latency per call. For real-time routing decisions, that is unusable. Agents will route around you.

**Primary flow (credits):**
1. Agent buys credits once (USDC on Base or Stripe). Takes ~5 seconds.
2. Worker issues a bearer token tied to a credit balance in KV.
3. Every subsequent request: bearer token in header, data in 50ms.
4. Credits deducted per request. Agent tops up when low.

**Fallback flow (x402, for discovery/one-off):**
1. Agent hits premium endpoint with no token.
2. Worker returns 402 with payment instructions.
3. Agent pays, retries with tx hash.
4. Worker verifies, issues a credit balance + token.
5. Even one-off payments funnel into the credit system.

### Hybrid payment rails

In Q2 2026, fewer than 5% of agents have funded crypto wallets. Both paths feed the same credits ledger:

- **USDC on Base**: Zero account, anonymous, 0% processor fee. For crypto-native agents.
- **Stripe + email API key**: Traditional, ~3% fee, requires email. For the 95% of agent operators without wallets yet.

Same credits, same bearer token, same premium endpoints. The payment method is invisible after purchase.

### Snapshotting is Phase 0

The historical dataset is the moat and cannot be backfilled. Snapshots ship before any payment infrastructure. The data clock starts immediately, even if payment work slips by weeks.

### Free preview on every premium endpoint

Agents need to evaluate before paying. Every paid endpoint has a free counterpart:
- Free `/api/routing-preview`: Top 1 recommendation, no detail, 5 calls/day per IP.
- Premium `/api/premium/routing`: Top 5 ranked with full scoring data, unlimited with credits.

Discovery happens via free preview. Conversion happens when agents need depth or volume.

### Open-source SDK is the adoption flywheel

If `pip install tensorfeed` is the easiest way for an agent to consume the API, TensorFeed becomes the default. The SDK handles:
- Wallet management (or proxy to operator's wallet)
- Automatic 402 retry flow (transparent to the agent)
- In-memory credit caching across requests
- Typed clients for every endpoint
- Examples for LangChain, LlamaIndex, CrewAI, MCP

Ship on PyPI and npm. Cost: 1-2 weeks. Value: every agent framework adopts it as the default TensorFeed client.

## Payment Protocol

### Credit Purchase (primary)

```
POST /api/payment/buy-credits
Body: { amount_usd: 1.00, method: "usdc" | "stripe" }

USDC path:
  Response: { wallet: "0x...", amount: "1.00", network: "base", memo: "tf-{nonce}" }
  Agent sends USDC, then:
  POST /api/payment/confirm
  Body: { tx_hash: "0x...", nonce: "tf-{nonce}" }
  Response: { token: "tf_live_...", credits: 50, rate: "$0.02/credit" }

Stripe path:
  Response: { checkout_url: "https://checkout.stripe.com/..." }
  After payment, webhook creates credits:
  GET /api/payment/activate?session_id=...
  Response: { token: "tf_live_...", credits: 50, rate: "$0.02/credit" }
```

### x402 Fallback (one-off discovery)

```
1. GET /api/premium/routing (no auth)
2. 402 Payment Required
   Headers:
     X-Payment-Address: 0x...
     X-Payment-Amount: 0.02
     X-Payment-Currency: USDC
     X-Payment-Network: base
   Body: { error: "payment_required", credits_url: "/api/payment/buy-credits" }
3. Agent pays on-chain
4. GET /api/premium/routing
   Headers: X-Payment-Tx: 0x...
5. Worker verifies, issues token + 1 credit, serves data
```

### Wallet Trust Attestation

Agents need to verify the wallet address is actually TensorFeed's, not a man-in-the-middle swap:

1. **llms.txt**: Publish wallet address in the canonical agent discovery file.
2. **Signed payment info**: `/api/payment/info` returns an HMAC-signed response. Public key published in DNS TXT record (`_tensorfeed-payment.tensorfeed.ai`).
3. **Out-of-band**: Cross-publish wallet address on verified X (@tensorfeed) and GitHub (RipperMercs/tensorfeed README).

One bad address-swap incident in the agent-payment ecosystem could slow down the whole space. Be the source that did this right from day one.

## Premium Data Tiers

### Tier 0: Free (current, unchanged)
Everything that exists today stays free. This is the funnel.
- `/api/news`, `/api/status`, `/api/models`, `/api/benchmarks`
- `/api/agents/activity`
- RSS/JSON feeds, llms.txt, llms-full.txt
- No rate limits for reasonable use

### Free Preview (rate-limited, no auth)
- `/api/routing-preview`: Top 1 model recommendation, 5 calls/day per IP
- Future: preview versions of each premium endpoint

### Tier 1: Enhanced Data ($0.02 per credit)
Same endpoints, richer payloads.
- `/api/premium/news`: Full structured summaries with entity extraction, impact scoring (1-5), affected providers/models, actionable tags (pricing-change, outage, model-release, acquisition)
- `/api/premium/status`: Current status + 24-hour latency history + incident count + uptime percentage + component-level detail
- `/api/premium/models`: Current pricing + 30-day price history + price-change alerts + cost-per-benchmark-point scores

### Tier 2: Computed Intelligence ($0.02 per credit, same price initially)
- `/api/premium/routing`: Real-time model routing recommendation. Input: task type (code, reasoning, creative, general), budget constraint, latency requirement. Output: ranked list of models with composite score, updated every 2 minutes from live status + pricing + benchmarks. **Agent-configurable weights via query params.**
- `/api/premium/digest`: Structured daily digest of everything that changed. One request replaces parsing 50+ free-tier requests.
- `/api/premium/compare`: On-demand model comparison with live data. Input: two model IDs. Output: full pricing, benchmark, status, and trend comparison.

### Tier 3: Bulk (future, $0.10 per credit or $1/day subscription)
- `/api/premium/stream`: Server-Sent Events (SSE) stream of all data changes. NOT WebSocket (requires Durable Objects, adds complexity).
- `/api/premium/export`: Full database export in a single JSON payload.

## Pricing Strategy

Start low. Prove value before raising prices.

An agent could ask GPT "which model should I use" for ~$0.005 in tokens. TensorFeed's advantage is real-time data (polled every 2 minutes) plus historical context. The data has to be 10x better, not 10x more expensive.

```
Launch pricing:     $0.01-0.02 per credit (all tiers same price initially)
Credit bundles:     50 credits for $1.00 USDC (or $1.03 via Stripe)
                    250 credits for $4.50 USDC
                    1000 credits for $15.00 USDC
After validation:   Tier 2 rises to $0.03-0.05 based on usage data
```

Revenue math at scale: 100 agents * 20 queries/day * $0.02 = $40/day = $14,600/year in passive income. Zero support tickets, zero invoicing, zero chargebacks on the USDC path.

## Routing Score Engine

### Architecture
New Worker module: `worker/src/routing.ts`

1. Every 2-minute status poll records provider health (already happening).
2. Add: p95 latency per provider in KV (rolling 1-hour window).
3. Quality score per model from benchmarks (static, updates weekly).
4. Cost efficiency = benchmark_composite / price_per_1M_tokens.
5. Default composite: (quality * 0.4) + (availability * 0.3) + (cost * 0.2) + (latency * 0.1).

### Agent-configurable weights
Agents pass weights as query params to override defaults:
```
GET /api/premium/routing?task=code&w_quality=0.6&w_cost=0.3&w_avail=0.1
```

Future: log which recommendations agents actually used and tune default weights from real feedback data.

## Data Pipeline

### Snapshots (Phase 0, ships first)
New Worker module: `worker/src/snapshots-daily.ts`

Daily cron captures full state:
```
KV keys:
  snapshot:{date}:pricing     -> full pricing.json
  snapshot:{date}:benchmarks  -> full benchmarks.json
  snapshot:{date}:status      -> provider status summary
  snapshot:{date}:activity    -> agent activity summary
```

Storage: ~5KB per snapshot type * 4 types * 365 days = ~7MB/year, well within KV limits.

Public endpoint for listing snapshots (free, part of the data moat marketing):
```
GET /api/snapshots -> { dates: ["2026-04-26", ...], types: ["pricing", "benchmarks", ...] }
GET /api/snapshots/2026-04-26/pricing -> { ...snapshot data }
```

### Enhanced News Processing
Extend `worker/src/rss.ts` for premium payloads:
- Entity extraction: regex matching against known provider/model names
- Impact scoring: keyword heuristics (e.g., "launched" + provider name = high impact)
- Action tagging: pricing-change, outage, model-release, acquisition, regulatory

Free tier: title, url, snippet (200 chars), source, categories.
Premium tier: adds impact_score, affected_entities, action_type, full_summary (500 chars).

## Worker Changes

### New Env vars (wrangler.toml)
```toml
[vars]
PAYMENT_WALLET = "0x..."
PAYMENT_ENABLED = "true"
BASE_RPC_URL = "https://base-mainnet.g.alchemy.com/v2/{key}"

# Secrets (wrangler secret put):
# STRIPE_SECRET_KEY
# STRIPE_WEBHOOK_SECRET
# ALCHEMY_API_KEY
# PAYMENT_HMAC_KEY  (for signed payment info responses)
```

### New KV namespace
Add a dedicated namespace for payment data (separate from cache, no TTL risk):
```toml
[[kv_namespaces]]
binding = "TENSORFEED_PAYMENTS"
id = "..."
```

### KV schema
```
TENSORFEED_PAYMENTS:
  credits:{token}             -> { balance, created, last_used, agent_ua, method }
  tx:{txHash}                 -> { amount, agent, endpoint, timestamp, verified }
  revenue:daily:{date}        -> { total_usd, tx_count, unique_agents, by_method }
  revenue:monthly:{month}     -> { aggregated }

TENSORFEED_CACHE:
  snapshot:{date}:{type}      -> { ...snapshot data }
  routing-scores              -> { ...computed scores, ttl: 120s }
```

Replay protection: tx hashes stored permanently in TENSORFEED_PAYMENTS (no TTL expiry). The free-tier TENSORFEED_CACHE KV has TTL behavior that could allow replay if tx hashes were stored there.

### New route structure
```
Free:
  /api/routing-preview         -> Rate-limited free preview (5/day/IP)
  /api/snapshots               -> List available snapshots
  /api/snapshots/{date}/{type} -> Read a snapshot (free, marketing the moat)
  /api/payment/info            -> Signed wallet address, pricing, supported methods

Payment:
  /api/payment/buy-credits     -> Initiate credit purchase
  /api/payment/confirm         -> Confirm USDC payment
  /api/payment/activate        -> Activate Stripe credits
  /api/payment/balance         -> Check credit balance

Premium (requires credits):
  /api/premium/routing         -> Model routing score
  /api/premium/news            -> Enhanced news feed
  /api/premium/status          -> Enhanced status with history
  /api/premium/models          -> Pricing with history
  /api/premium/digest          -> Daily change digest
  /api/premium/compare         -> On-demand model comparison

Admin:
  /api/admin/revenue           -> Auth-gated revenue dashboard
```

## Legal

### Terms of Service: No-Training Clause
Without explicit terms, a model provider could pay $0.02 once and train on your premium data. ToS must include:

> "Premium data is licensed for inference-time use only. You may not use premium API responses, in whole or in part, for training, fine-tuning, distillation, evaluation, or benchmarking of machine learning models without prior written consent from TensorFeed. Violation results in immediate API access revocation."

This is now standard for paid AI data sources (Reddit, Stack Overflow, Getty). Without it, you give away the moat.

### Tax/Accounting
Every USDC payment received is taxable income at received-date USD value. Daily cron logs USD value at receipt time. A `revenue:daily:{date}` KV entry captures total USD, tx count, and unique agents. Hand the annual export to an accountant in January.

### Kill Switch and Refund
`PAYMENT_ENABLED` flag in wrangler.toml vars disables all premium endpoints instantly. Document a refund process: unused credits are refundable within 30 days by emailing support@tensorfeed.ai. Credit a public incident page if data quality breaks (e.g., routing scores go stale for >1 hour).

## Operational Requirements

1. **Base RPC**: Public Base RPC will rate-limit within hours. Budget for Alchemy or QuickNode (~$50/month for production).
2. **KV ops**: At 50K paid requests/day, the 100K free-tier ceiling is exceeded. Workers Paid plan ($5/month) is mandatory before launch.
3. **Stripe fees**: ~3% on card payments. Baked into Stripe credit pricing (e.g., 50 credits = $1.03 via Stripe vs $1.00 via USDC).
4. **Monitoring**: Add payment verification failures and credit depletion events to the existing daily ops email.

## Open-Source SDK

### Python (`pip install tensorfeed`)
```python
from tensorfeed import TensorFeed

tf = TensorFeed(token="tf_live_...")  # or wallet="0x..." for auto-purchase

# Transparent credit management
routing = tf.routing(task="code", budget=5.0)
print(routing.top_pick)  # "claude-opus-4-7"
print(routing.scores)    # [{ model, score, price, status, latency }, ...]

# Free preview (no auth needed)
preview = tf.routing_preview(task="code")
print(preview.top_pick)

# Check balance
print(tf.credits.balance)  # 47
```

### TypeScript (`npm install tensorfeed`)
```typescript
import { TensorFeed } from 'tensorfeed';

const tf = new TensorFeed({ token: 'tf_live_...' });
const routing = await tf.routing({ task: 'code', budget: 5.0 });
console.log(routing.topPick); // "claude-opus-4-7"
```

### MCP Integration
Ship a TensorFeed MCP server that agents can mount:
```json
{
  "mcpServers": {
    "tensorfeed": {
      "command": "npx",
      "args": ["tensorfeed-mcp"],
      "env": { "TENSORFEED_TOKEN": "tf_live_..." }
    }
  }
}
```

Note: an MCP server already exists at `/mcp-server/`. Extend it with premium endpoint tools and credit management.

## Phased Rollout

### Phase 0: Snapshots (THIS WEEK, no payment)
- [ ] Daily snapshots of pricing, benchmarks, status, agent activity
- [ ] KV keys: `snapshot:{date}:{type}`
- [ ] `/api/snapshots` endpoint to list and read
- [ ] Add snapshot cron to existing daily 7 AM catalog update
- [ ] Zero monetization, just start the data clock

### Phase 1: MVP Launch (weeks 2-4)
- [ ] Base USDC wallet setup, published in llms.txt + DNS TXT
- [ ] Payment middleware: credits-first, x402 fallback, Stripe alternative
- [ ] ONE premium endpoint: `/api/premium/routing` at $0.01-0.02/credit
- [ ] Free `/api/routing-preview` (5 calls/day per IP)
- [ ] `/api/payment/info` with signed response (wallet attestation)
- [ ] ToS with no-training clause
- [ ] Documentation on `/developers/agent-payments`
- [ ] Python SDK: `pip install tensorfeed`

### Phase 2: Expand (months 2-4, after first paying agent)
- [ ] Tier 1 enhanced endpoints (news, status, models with 30-day history)
- [ ] Tier 2 expansion (digest, compare)
- [ ] TypeScript SDK on npm
- [ ] MCP server extension with premium tools
- [ ] `/api/admin/revenue` dashboard
- [ ] Revenue metrics in daily ops email
- [ ] Refund and kill-switch tooling

### Phase 3: Scale (months 6+, after $100/month sustained)
- [ ] Incident forecast endpoint (needs 12+ months of outage data + real ML model)
- [ ] SSE streaming endpoint (NOT WebSocket, avoids Durable Objects complexity)
- [ ] Bulk export endpoint
- [ ] Cold storage wallet sweep automation
- [ ] Agent analytics dashboard (who pays most, what they query)
- [ ] Subscription tier ($1/day flat rate)
- [ ] Tune routing weights from real agent usage feedback

## Out of Scope (initial launch)

Explicit list of things NOT to build in Phase 0 or Phase 1, captured here so they do not creep in:

- **Forecast endpoint**: pushed to Phase 3. Statistical incident forecasting on sparse outage data has huge variance; wrong predictions on a paid endpoint would lose agent trust fast. Wait for 12+ months of history and a real ML model.
- **WebSocket firehose**: replaced by SSE in Phase 3. Workers WebSocket requires Durable Objects, a different architecture and added complexity. SSE works on plain Workers.
- **Per-call x402 as primary UX**: it is a fallback only. Credits-first is the load-bearing path. Per-call latency (3 to 4 seconds) makes real-time routing decisions unusable.
- **Crypto other than USDC on Base**: no L1 Ethereum (gas too high), no other L2s (Optimism, Arbitrum) at launch.
- **Custom enterprise tiers, SLAs, white-label**: Phase 3+ if demand emerges. Not before.
- **Subscriptions**: Phase 3 once credit-usage patterns are known. Pure pay-as-you-go at launch.
- **Per-agent rate limiting beyond credit balance**: add only when abuse patterns appear.
- **Frontend dashboards for agents**: API-first product. UI is for humans buying credits, not for agents consuming data.

## Phase 1 Cost Floor

Fixed monthly costs before any revenue:

```
Workers Paid plan       $5/mo     (KV ops budget)
Base RPC (Alchemy)     ~$50/mo    (production rate limits)
Stripe                  variable  (only on Stripe-path payments, ~3% per tx)
D1                      $0        (free tier sufficient)
Total fixed:           ~$55/mo
```

Break-even at Tier 2 pricing ($0.02/request): ~140 paid requests/day, or 2 to 3 dependent agents. Treat the first 6 months as positioning investment, not revenue.

## Competitive Moat

1. **Data moat**: Historical snapshots compound daily. Six months in, TensorFeed owns the only complete dataset of AI API pricing and status trends. Cannot be backfilled by competitors.
2. **First-mover moat**: First site with agent payment rails gets indexed by agent frameworks as a data source. Network effects compound.
3. **SDK moat**: `pip install tensorfeed` becomes the default way agents consume AI ecosystem data. Integration stickiness.
4. **Infrastructure moat**: Polling 12+ status pages every 2 minutes and 15+ RSS feeds every 10 minutes. Non-trivial to replicate.
5. **Trust moat**: Signed wallet attestation, ToS, editorial credibility. Agents (and their operators) prefer trusted data sources.
6. **Zero middleman moat**: Direct USDC payments mean no platform risk, no chargebacks, no payment processor deciding to drop you.
