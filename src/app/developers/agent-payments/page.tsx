import { Metadata } from 'next';
import Link from 'next/link';
import {
  Wallet,
  Code,
  Shield,
  Bot,
  ArrowRight,
  ExternalLink,
  Zap,
  FileText,
  CreditCard,
} from 'lucide-react';

const PAYMENT_WALLET = '0x549c82e6bfc54bdae9a2073744cbc2af5d1fc6d1';
const USDC_BASE_CONTRACT = '0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913';

export const metadata: Metadata = {
  title: 'Pay-Per-Call API for AI Agents: USDC on Base, x402 Compatible | TensorFeed',
  description:
    'The first machine-payable API for AI agents. Pay per call in USDC on Base, no accounts, no API keys, no processors. x402 compatible, MCP ready, Python and TypeScript SDKs. Validated end-to-end on mainnet.',
  alternates: {
    canonical: 'https://tensorfeed.ai/developers/agent-payments',
  },
  openGraph: {
    type: 'website',
    url: 'https://tensorfeed.ai/developers/agent-payments',
    title: 'Pay-Per-Call API for AI Agents: USDC on Base, x402 Compatible',
    description:
      'Pay AI agents in USDC on Base. No accounts, no API keys, no processors. x402 compatible, MCP ready, Python + TypeScript SDKs.',
    siteName: 'TensorFeed.ai',
    images: [{ url: '/tensorfeed-logo.png', width: 1024, height: 1024 }],
  },
  twitter: {
    card: 'summary',
    title: 'Pay-Per-Call API for AI Agents: USDC on Base',
    description:
      'The first machine-payable API for AI agents. x402 compatible, MCP ready, validated on Base mainnet.',
  },
  keywords: [
    'AI agent payment API',
    'x402 payment API',
    'machine payable API',
    'pay per call AI API',
    'USDC payment API',
    'agent monetization',
    'agentic payment',
    'stablecoin API',
    'Base USDC API',
    'MCP payment server',
    'AI agent commerce',
    'autonomous agent payment',
  ],
};

const FAQ_JSONLD = {
  '@context': 'https://schema.org',
  '@type': 'FAQPage',
  mainEntity: [
    {
      '@type': 'Question',
      name: 'How do AI agents pay for APIs on TensorFeed?',
      acceptedAnswer: {
        '@type': 'Answer',
        text: 'Agents pay in USDC on Base mainnet. There are no accounts, no API keys, and no traditional payment processors. An agent buys credits once via /api/payment/buy-credits, sends USDC to the published wallet, calls /api/payment/confirm with the tx hash, and receives a bearer token that debits credits per premium API call.',
      },
    },
    {
      '@type': 'Question',
      name: 'What is x402 and is TensorFeed compatible?',
      acceptedAnswer: {
        '@type': 'Answer',
        text: 'x402 is the emerging HTTP standard for machine-payable APIs: the server returns HTTP 402 Payment Required with payment instructions, and the client retries with proof of payment. TensorFeed supports both the credits-first flow (recommended for repeat use) and an x402-style fallback where a single call without auth returns a 402 with a wallet address, and a retry with the X-Payment-Tx header serves the data.',
      },
    },
    {
      '@type': 'Question',
      name: 'Why USDC on Base instead of Stripe or PayPal?',
      acceptedAnswer: {
        '@type': 'Answer',
        text: 'AI agents do not have credit cards or human-mediated checkout. USDC on Base settles in seconds with no chargebacks, no KYC at the API layer, and no platform risk from a payment processor. Base is an Ethereum L2 with sub-cent gas fees, making microtransactions ($0.02 per credit) viable. We accepted a smaller short-term TAM (only crypto-native agents) for zero processor fees and cleaner agent-native positioning.',
      },
    },
    {
      '@type': 'Question',
      name: 'How do I verify the TensorFeed payment wallet address before sending funds?',
      acceptedAnswer: {
        '@type': 'Answer',
        text: 'Cross-check the wallet address across four published locations before sending USDC: /llms.txt on tensorfeed.ai, the JSON response from /api/payment/info, the README in github.com/RipperMercs/tensorfeed, and the @tensorfeed bio on X. If any of the four disagree, do not send. The address is also published with TLS so a network MITM cannot swap it.',
      },
    },
    {
      '@type': 'Question',
      name: 'What happens if my payment fails or the API rejects the transaction?',
      acceptedAnswer: {
        '@type': 'Answer',
        text: 'On-chain verification reads the USDC Transfer event from eth_getTransactionReceipt on the Base RPC. If the tx is invalid, the wrong recipient, or already used, /api/payment/confirm returns an error and no credits are minted. Replay protection means every successful tx hash is permanently recorded so the same payment cannot be claimed twice. For genuine refunds, email evan@tensorfeed.ai with the tx hash within 24 hours of the charge.',
      },
    },
    {
      '@type': 'Question',
      name: 'Are TensorFeed premium APIs covered by an SLA?',
      acceptedAnswer: {
        '@type': 'Answer',
        text: 'No SLA in the MVP phase. Premium credits do not expire and there is no scheduled downtime, but if a premium endpoint is down we will not credit your account automatically. Refunds for prolonged outages are handled manually within 24 hours via email. As the product matures we may introduce paid SLA tiers.',
      },
    },
    {
      '@type': 'Question',
      name: 'Can I use TensorFeed premium data to train my AI model?',
      acceptedAnswer: {
        '@type': 'Answer',
        text: 'No. Premium data is licensed for inference use only. Use of TensorFeed premium endpoint responses for training, fine-tuning, evaluation, or distillation of machine learning models is prohibited. This is in the Terms of Service section on Premium API and Agent Payments.',
      },
    },
    {
      '@type': 'Question',
      name: 'Does TensorFeed work with the Model Context Protocol (MCP)?',
      acceptedAnswer: {
        '@type': 'Answer',
        text: 'Yes. The @tensorfeed/mcp-server package exposes every premium endpoint as an MCP tool, so Claude Desktop, Claude Code, and other MCP clients can call routing, history series, watches, and the enriched agents directory directly. Pass your tf_live_ bearer token via the TENSORFEED_TOKEN env var in your MCP client config.',
      },
    },
  ],
};

const HOWTO_JSONLD = {
  '@context': 'https://schema.org',
  '@type': 'HowTo',
  name: 'How to pay TensorFeed premium APIs in USDC on Base',
  description:
    'Buy credits with USDC on Base mainnet, receive a bearer token, and call premium AI agent APIs at $0.02 per credit.',
  totalTime: 'PT2M',
  estimatedCost: { '@type': 'MonetaryAmount', currency: 'USD', value: '1.00' },
  supply: [
    { '@type': 'HowToSupply', name: 'A Base mainnet wallet (Rabby, Coinbase, MetaMask)' },
    { '@type': 'HowToSupply', name: 'USDC on Base (minimum $0.50)' },
  ],
  tool: [
    { '@type': 'HowToTool', name: 'curl, Python SDK (pip install tensorfeed), or TypeScript SDK' },
  ],
  step: [
    {
      '@type': 'HowToStep',
      position: 1,
      name: 'Quote a credit purchase',
      text: 'POST to /api/payment/buy-credits with { "amount_usd": 1.00 }. The response includes the wallet address, a memo nonce, the credit amount (50 credits at base rate), and a 30-minute expiry.',
    },
    {
      '@type': 'HowToStep',
      position: 2,
      name: 'Send USDC on Base to the wallet',
      text: 'From your Base wallet, transfer the quoted USDC amount to the address returned in step 1. The memo nonce is optional but recommended for traceability.',
    },
    {
      '@type': 'HowToStep',
      position: 3,
      name: 'Confirm the transaction',
      text: 'POST to /api/payment/confirm with { "tx_hash": "0x...", "nonce": "tf-..." }. The worker verifies the USDC Transfer event on-chain via the Base RPC and mints a tf_live_ bearer token tied to your credit balance.',
    },
    {
      '@type': 'HowToStep',
      position: 4,
      name: 'Call premium endpoints',
      text: 'Send Authorization: Bearer tf_live_... on any /api/premium/* request. Each call decrements credits. Check remaining balance any time at /api/payment/balance.',
    },
  ],
};

interface PremiumEndpoint {
  method: string;
  path: string;
  description: string;
  cost: string;
  example?: string;
}

const ENDPOINTS: PremiumEndpoint[] = [
  {
    method: 'GET',
    path: '/api/payment/info',
    description: 'Public. Returns wallet address, pricing tiers, supported flows, and verification metadata.',
    cost: 'Free',
    example: `{
  "ok": true,
  "wallet": {
    "address": "0x549c82e6bfc54bdae9a2073744cbc2af5d1fc6d1",
    "currency": "USDC",
    "network": "base",
    "contract": "0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913"
  },
  "pricing": { "base_rate": "50 credits per $1 USDC", "volume_bundles": [...] },
  "flow": { "with_quote": [...], "x402_fallback": [...] },
  "verification": { ... }
}`,
  },
  {
    method: 'POST',
    path: '/api/payment/buy-credits',
    description: 'Generate a 30-minute payment quote. Returns wallet, memo (nonce), and credit count.',
    cost: 'Free',
    example: `// Body: { "amount_usd": 1.00 }
{
  "ok": true,
  "wallet": "0x549c82e6bfc54bdae9a2073744cbc2af5d1fc6d1",
  "memo": "tf-abc123",
  "amount_usd": 1.00,
  "credits": 50,
  "currency": "USDC",
  "network": "base",
  "expires_at": "2026-04-27T22:30:00Z",
  "ttl_seconds": 1800
}`,
  },
  {
    method: 'POST',
    path: '/api/payment/confirm',
    description: 'Verify a USDC tx on Base and mint a bearer token. Idempotent: same tx submitted twice is rejected.',
    cost: 'Free',
    example: `// Body: { "tx_hash": "0x...", "nonce": "tf-abc123" }
{
  "ok": true,
  "token": "tf_live_<64-hex-chars>",
  "credits": 50,
  "balance": 50,
  "tx_amount_usd": 1.00,
  "rate": "base"
}`,
  },
  {
    method: 'GET',
    path: '/api/payment/balance',
    description: 'Check remaining credits for the current bearer token.',
    cost: 'Token required',
    example: `// Header: Authorization: Bearer tf_live_...
{
  "ok": true,
  "balance": 47,
  "created": "2026-04-27T22:00:00Z",
  "last_used": "2026-04-27T22:14:23Z",
  "total_purchased": 50
}`,
  },
  {
    method: 'GET',
    path: '/api/preview/routing',
    description: 'Free routing preview, top-1 model only, no score breakdown. Rate-limited to 5 calls per UTC day per IP.',
    cost: 'Free (5/day/IP)',
    example: `{
  "ok": true,
  "preview": true,
  "task": "code",
  "rate_limit": { "limit": 5, "remaining": 4, "scope": "per IP per UTC day" },
  "recommendation": { "model": "Claude Opus 4.7", "provider": "anthropic" },
  "upgrade": { "premium_endpoint": "/api/premium/routing", ... }
}`,
  },
  {
    method: 'GET',
    path: '/api/premium/routing',
    description: 'Tier 2 routing engine. Top-N ranked models with full composite score breakdown, pricing, status, and live data freshness. Custom weights via query params.',
    cost: '1 credit per call',
    example: `// Header: Authorization: Bearer tf_live_...
// Query: ?task=code&budget=5.0&top_n=3&w_quality=0.6&w_cost=0.3
{
  "ok": true,
  "task": "code",
  "weights": { "quality": 0.6, "availability": 0.0, "cost": 0.4, "latency": 0.0 },
  "recommendations": [
    {
      "rank": 1,
      "model": { "id": "claude-opus-4-7", "name": "Claude Opus 4.7", ... },
      "pricing": { "input": 15, "output": 75, "currency": "USD" },
      "status": "operational",
      "composite_score": 0.87,
      "components": { "quality": 0.94, "availability": 1.0, "cost": 0.65, "latency": 0.5 }
    }
  ],
  "billing": { "credits_charged": 1, "credits_remaining": 49 }
}`,
  },
  {
    method: 'GET',
    path: '/api/premium/history/pricing/series',
    description: 'Daily price points for one model across a date range, with min/max/delta summary and changes-detected count. Range capped at 90 days, default 30 days back.',
    cost: '1 credit per call',
    example: `// Query: ?model=Claude+Opus+4.7&from=2026-04-01&to=2026-04-27
{
  "ok": true,
  "model": "Claude Opus 4.7",
  "provider": "Anthropic",
  "range": { "from": "2026-04-01", "to": "2026-04-27", "days": 27 },
  "points": [
    { "date": "2026-04-01", "input": 18, "output": 90, "blended": 54 },
    { "date": "2026-04-15", "input": 15, "output": 75, "blended": 45 },
    { "date": "2026-04-27", "input": 12, "output": 60, "blended": 36 }
  ],
  "summary": {
    "first": { "date": "2026-04-01", "blended": 54 },
    "latest": { "date": "2026-04-27", "blended": 36 },
    "min_blended": 36, "max_blended": 54,
    "delta_pct_blended": -33.33,
    "changes_detected": 2,
    "days_with_data": 27, "days_missing": 0
  },
  "billing": { "credits_charged": 1, "credits_remaining": 48 }
}`,
  },
  {
    method: 'GET',
    path: '/api/premium/history/benchmarks/series',
    description: 'Score evolution for a single benchmark on one model. Supported benchmark keys: swe_bench, mmlu_pro, gpqa_diamond, math, human_eval. Returns delta in percentage points.',
    cost: '1 credit per call',
    example: `// Query: ?model=Claude+Opus+4.7&benchmark=swe_bench&from=2026-04-01&to=2026-04-27
{
  "ok": true,
  "model": "Claude Opus 4.7",
  "benchmark": "swe_bench",
  "points": [
    { "date": "2026-04-01", "score": 70.0 },
    { "date": "2026-04-27", "score": 73.4 }
  ],
  "summary": { "min_score": 70.0, "max_score": 73.4, "delta_pp": 3.4 }
}`,
  },
  {
    method: 'GET',
    path: '/api/premium/history/status/uptime',
    description: 'Daily status rollup for one provider over a date range. Returns operational/degraded/down day counts plus uptime % (degraded counts as half-credit). Missing-data days are excluded from the denominator.',
    cost: '1 credit per call',
    example: `// Query: ?provider=anthropic&from=2026-04-01&to=2026-04-27
{
  "ok": true,
  "provider": "anthropic",
  "days_total": 27, "days_with_data": 27, "days_missing": 0,
  "days_operational": 24, "days_degraded": 2, "days_down": 1, "days_unknown": 0,
  "uptime_pct": 92.59,
  "incident_days": [
    { "date": "2026-04-09", "status": "degraded" },
    { "date": "2026-04-17", "status": "down" }
  ]
}`,
  },
  {
    method: 'GET',
    path: '/api/premium/history/compare',
    description: 'Diff two daily snapshots: returns added, removed, and changed entries with deltas. Supported types: pricing, benchmarks. Useful for detecting price wars and benchmark regressions.',
    cost: '1 credit per call',
    example: `// Query: ?from=2026-04-01&to=2026-04-27&type=pricing
{
  "ok": true,
  "type": "pricing",
  "from_date": "2026-04-01", "to_date": "2026-04-27",
  "added": [{ "model": "Opus 4.7", "provider": "Anthropic", ... }],
  "removed": [{ "model": "Opus 4.6", "provider": "Anthropic", ... }],
  "changed": [
    { "model": "GPT-5.5", "field": "inputPrice", "from": 12, "to": 10, "delta_pct": -16.67 }
  ],
  "unchanged_count": 8
}`,
  },
  {
    method: 'GET',
    path: '/api/premium/cost/projection',
    description:
      'Project the cost of a token-usage workload across 1-10 AI models. Returns daily/weekly/monthly/yearly totals per model plus a ranking by cheapest monthly. Pure compute on live /api/models pricing.',
    cost: '1 credit per call',
    example: `// Query: ?model=opus-4-7,gpt-5-5,gemini-3&input_tokens_per_day=1000000&output_tokens_per_day=500000&horizon=monthly
{
  "ok": true,
  "workload": { "input_tokens_per_day": 1000000, "output_tokens_per_day": 500000, "total_tokens_per_day": 1500000 },
  "primary_horizon": "monthly",
  "projections": [
    {
      "model": "Claude Opus 4.7", "provider": "Anthropic",
      "matched": true,
      "rates": { "input_per_1m": 15, "output_per_1m": 75, "blended_per_1m": 45 },
      "daily": { "input_cost": 15, "output_cost": 37.5, "total": 52.5 },
      "weekly_total": 367.5, "monthly_total": 1575, "yearly_total": 19162.5
    }
  ],
  "ranked_cheapest_monthly": [
    { "model": "Gemini 3", "provider": "Google", "monthly_total": 525 },
    { "model": "GPT-5.5", "provider": "OpenAI", "monthly_total": 750 },
    { "model": "Claude Opus 4.7", "provider": "Anthropic", "monthly_total": 1575 }
  ],
  "billing": { "credits_charged": 1, "credits_remaining": 46 }
}`,
  },
  {
    method: 'GET',
    path: '/api/premium/news/search',
    description:
      'Full-text search over the TensorFeed news corpus with relevance scoring (term hits in title weighted 3, snippet weighted 1, plus recency boost). Filter by date range, provider, and category. Omit q to browse the latest filtered articles. Default limit=25, max 100.',
    cost: '1 credit per call',
    example: `// Query: ?q=opus+pricing&provider=anthropic&from=2026-04-01
{
  "ok": true,
  "query": "opus pricing",
  "filters": { "provider": "anthropic", "from": "2026-04-01" },
  "total_corpus": 4823,
  "matched": 12,
  "returned": 12,
  "results": [
    {
      "title": "Anthropic ships Claude Opus 4.7 with 1M context",
      "url": "https://anthropic.com/opus-4-7",
      "source": "Anthropic Blog",
      "source_domain": "anthropic.com",
      "snippet": "New flagship model with extended context window...",
      "categories": ["Anthropic", "Models"],
      "published_at": "2026-04-27T12:00:00Z",
      "relevance": 0.85,
      "matched_terms": ["opus"]
    }
  ],
  "billing": { "credits_charged": 1, "credits_remaining": 47 }
}`,
  },
  {
    method: 'GET',
    path: '/api/premium/agents/directory',
    description:
      'The agents catalog joined with live status, recent news (count + top 3 articles), agent traffic, flagship pricing, and a derived trending_score (0-100). Server-side filter and sort so you pull a ranked list in one call. Default limit=50, max 100.',
    cost: '1 credit per call',
    example: `// Query: ?sort=trending&category=coding&status=operational
{
  "ok": true,
  "total": 18, "returned": 5,
  "sort": "trending",
  "filters_applied": { "category": "coding", "status": "operational" },
  "agents": [
    {
      "id": "claude-code", "name": "Claude Code", "provider": "Anthropic",
      "live_status": "operational",
      "status_page_url": "https://status.anthropic.com",
      "recent_news_count": 7,
      "recent_news": [
        { "title": "Anthropic ships Opus 4.7", "url": "...", "published_at": "..." }
      ],
      "agent_traffic_24h": 124,
      "flagship_pricing": { "model": "Claude Opus 4.7", "input": 15, "output": 75, "blended": 45 },
      "trending_score": 86
    }
  ],
  "billing": { "credits_charged": 1, "credits_remaining": 48 }
}`,
  },
  {
    method: 'POST',
    path: '/api/premium/watches',
    description:
      'Register a webhook watch on a price change or service status transition. Each watch lives 90 days and fires up to 100 times by default. Deliveries POST to your callback URL with an HMAC-SHA256 signature header (X-TensorFeed-Signature: sha256=...). Per-token cap of 25 active watches. Listing and per-watch read/delete are free for the owning bearer token.',
    cost: '1 credit per registration',
    example: `// Body: { spec, callback_url, secret?, fire_cap? }
// Spec types:
//   { type: "price", model, field: "inputPrice"|"outputPrice"|"blended",
//     op: "lt"|"gt"|"changes", threshold? }
//   { type: "status", provider, op: "becomes"|"changes",
//     value?: "operational"|"degraded"|"down" }
{
  "ok": true,
  "watch": {
    "id": "wat_a1b2c3d4e5f60718a9b0c1d2",
    "spec": { "type": "price", "model": "Claude Opus 4.7",
              "field": "blended", "op": "lt", "threshold": 30 },
    "callback_url": "https://agent.example.com/hook",
    "created": "2026-04-27T18:00:00Z",
    "expires_at": "2026-07-26T18:00:00Z",
    "fire_count": 0, "fire_cap": 100, "status": "active"
  },
  "billing": { "credits_charged": 1, "credits_remaining": 49 }
}`,
  },
];

const PYTHON_QUICKSTART = `from tensorfeed import TensorFeed

tf = TensorFeed()

# 1. Quote a credit purchase (30-minute TTL)
quote = tf.buy_credits(amount_usd=1.00)
print(f"Send {quote['amount_usd']} USDC on Base to {quote['wallet']}")
print(f"Memo: {quote['memo']}")

# 2. Send the USDC tx with your own wallet (Rabby, Coinbase, etc.)
#    then confirm with the tx hash:
result = tf.confirm(tx_hash="0xYOUR_TX_HASH", nonce=quote["memo"])
# The token is auto-stored on the client; routing() uses it automatically.

# 3. Call premium endpoints
rec = tf.routing(task="code", budget=5.0, top_n=3)
for r in rec["recommendations"]:
    print(f"#{r['rank']}: {r['model']['name']} (score: {r['composite_score']:.2f})")

# 4. Check remaining credits
print(tf.balance())`;

const CURL_QUICKSTART = `# Free preview (5 calls/day per IP)
curl "https://tensorfeed.ai/api/preview/routing?task=code"

# 1. Quote a purchase
curl -X POST https://tensorfeed.ai/api/payment/buy-credits \\
  -H "Content-Type: application/json" \\
  -d '{"amount_usd": 1.00}'

# 2. Send USDC on Base to the wallet, then confirm
curl -X POST https://tensorfeed.ai/api/payment/confirm \\
  -H "Content-Type: application/json" \\
  -d '{"tx_hash": "0xYOUR_TX", "nonce": "tf-abc123"}'

# 3. Use the token on premium endpoints
curl -H "Authorization: Bearer tf_live_..." \\
  "https://tensorfeed.ai/api/premium/routing?task=code&top_n=5"

# 4. Check balance
curl -H "Authorization: Bearer tf_live_..." \\
  https://tensorfeed.ai/api/payment/balance`;

const X402_FALLBACK_CURL = `# Single-retry x402 flow (no pre-flight)
curl https://tensorfeed.ai/api/premium/routing
# 402 Payment Required + payment instructions in headers and body

# Send USDC on Base to the wallet, then retry with the tx hash:
curl -H "X-Payment-Tx: 0xYOUR_TX" \\
  "https://tensorfeed.ai/api/premium/routing?task=code"
# Returns the data + a fresh token in X-Payment-Token header for future calls`;

export default function AgentPaymentsPage() {
  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(FAQ_JSONLD) }}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(HOWTO_JSONLD) }}
      />
      {/* Hero */}
      <div className="mb-10">
        <div className="flex items-center gap-3 mb-3">
          <div className="p-2 rounded-lg bg-accent-primary/10">
            <Bot className="w-7 h-7 text-accent-primary" />
          </div>
          <h1 className="text-3xl sm:text-4xl font-bold text-text-primary">
            Agent Payments API
          </h1>
        </div>
        <p className="text-text-secondary text-lg max-w-3xl mb-3">
          Premium API access for AI agents. Paid in USDC on Base, settled in seconds. No
          accounts, no API keys, no traditional payment processors.
        </p>
        <p className="text-text-muted text-sm max-w-3xl">
          Send USDC, get a bearer token, call premium endpoints. Each call decrements credits
          from your token. When credits run out, top up. The token is the only credential the
          API ever sees from you.
        </p>
      </div>

      {/* Wallet & Trust */}
      <section className="mb-10">
        <div className="bg-bg-secondary border border-border rounded-xl p-6">
          <div className="flex items-center gap-2 mb-4">
            <Wallet className="w-5 h-5 text-accent-primary" />
            <h2 className="text-xl font-semibold text-text-primary">Payment Wallet</h2>
          </div>
          <div className="bg-bg-tertiary/50 rounded-lg p-4 mb-4">
            <p className="text-text-muted text-xs uppercase tracking-wide mb-1">Address</p>
            <code className="text-accent-primary font-mono text-sm break-all block">
              {PAYMENT_WALLET}
            </code>
            <a
              href={`https://basescan.org/address/${PAYMENT_WALLET}`}
              target="_blank"
              rel="noopener noreferrer"
              className="text-text-muted text-xs hover:text-accent-primary inline-flex items-center gap-1 mt-1.5 mb-3"
            >
              View on Basescan
              <ExternalLink className="w-3 h-3" />
            </a>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-sm">
              <div>
                <p className="text-text-muted text-xs">Network</p>
                <p className="text-text-primary font-mono">Base mainnet</p>
              </div>
              <div>
                <p className="text-text-muted text-xs">Currency</p>
                <p className="text-text-primary font-mono">USDC (Circle native)</p>
              </div>
              <div className="sm:col-span-2">
                <p className="text-text-muted text-xs">USDC contract</p>
                <code className="text-text-primary font-mono text-xs break-all">
                  {USDC_BASE_CONTRACT}
                </code>
              </div>
            </div>
          </div>
          <div className="flex items-start gap-2 text-sm">
            <Shield className="w-4 h-4 text-accent-amber mt-0.5 shrink-0" />
            <p className="text-text-secondary">
              Cross-check this address before sending funds:{' '}
              <a href="/llms.txt" className="text-accent-primary hover:underline">
                /llms.txt
              </a>
              ,{' '}
              <a href="/api/payment/info" className="text-accent-primary hover:underline">
                /api/payment/info
              </a>
              ,{' '}
              <a
                href="https://github.com/RipperMercs/tensorfeed"
                className="text-accent-primary hover:underline"
                target="_blank"
                rel="noopener noreferrer"
              >
                GitHub README
              </a>
              , and the{' '}
              <a
                href="https://x.com/tensorfeed"
                className="text-accent-primary hover:underline"
                target="_blank"
                rel="noopener noreferrer"
              >
                @tensorfeed bio
              </a>
              . If any source disagrees, do not send.
            </p>
          </div>
        </div>
      </section>

      {/* Pricing */}
      <section className="mb-10">
        <h2 className="text-2xl font-semibold text-text-primary mb-4">Pricing</h2>
        <div className="bg-bg-secondary border border-border rounded-xl overflow-hidden">
          <div className="px-5 py-4 border-b border-border">
            <p className="text-text-secondary text-sm">
              Base rate:{' '}
              <span className="text-text-primary font-semibold">
                50 credits per $1 USDC
              </span>{' '}
              (about $0.02 per credit). Volume discounts apply automatically when you buy
              larger bundles.
            </p>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-bg-tertiary/30">
                <tr>
                  <th className="text-left px-5 py-3 text-text-muted font-medium uppercase text-xs tracking-wide">
                    Send
                  </th>
                  <th className="text-left px-5 py-3 text-text-muted font-medium uppercase text-xs tracking-wide">
                    Credits
                  </th>
                  <th className="text-left px-5 py-3 text-text-muted font-medium uppercase text-xs tracking-wide">
                    Discount
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                <tr>
                  <td className="px-5 py-3 font-mono text-text-primary">$1.00</td>
                  <td className="px-5 py-3 font-mono text-text-primary">50</td>
                  <td className="px-5 py-3 text-text-muted">base</td>
                </tr>
                <tr>
                  <td className="px-5 py-3 font-mono text-text-primary">$5.00</td>
                  <td className="px-5 py-3 font-mono text-text-primary">275</td>
                  <td className="px-5 py-3 text-accent-green">10% off</td>
                </tr>
                <tr>
                  <td className="px-5 py-3 font-mono text-text-primary">$30.00</td>
                  <td className="px-5 py-3 font-mono text-text-primary">1,950</td>
                  <td className="px-5 py-3 text-accent-green">25% off</td>
                </tr>
                <tr>
                  <td className="px-5 py-3 font-mono text-text-primary">$200.00</td>
                  <td className="px-5 py-3 font-mono text-text-primary">16,000</td>
                  <td className="px-5 py-3 text-accent-green">40% off</td>
                </tr>
              </tbody>
            </table>
          </div>
          <div className="px-5 py-4 border-t border-border bg-bg-tertiary/20">
            <p className="text-text-muted text-xs">
              Credits do not expire. Each premium call costs 1 to 5 credits depending on the
              tier. Tier 2 routing is currently 1 credit per call.
            </p>
          </div>
        </div>
      </section>

      {/* Two Flows */}
      <section className="mb-10">
        <h2 className="text-2xl font-semibold text-text-primary mb-4">Two Payment Flows</h2>
        <div className="grid md:grid-cols-2 gap-4">
          <div className="bg-bg-secondary border border-accent-primary/40 rounded-xl p-5">
            <div className="flex items-center gap-2 mb-3">
              <Zap className="w-4 h-4 text-accent-primary" />
              <h3 className="text-text-primary font-semibold">
                Credits-first (recommended)
              </h3>
            </div>
            <p className="text-text-secondary text-sm mb-3">
              Buy a batch of credits once, use a bearer token for all subsequent calls.
              About 50ms per call.
            </p>
            <ol className="text-sm space-y-2 list-decimal list-inside text-text-secondary">
              <li>
                POST{' '}
                <code className="text-accent-primary font-mono">/api/payment/buy-credits</code>{' '}
                with <code className="font-mono">amount_usd</code>
              </li>
              <li>Send USDC on Base to the returned wallet (memo optional)</li>
              <li>
                POST{' '}
                <code className="text-accent-primary font-mono">/api/payment/confirm</code>{' '}
                with the tx hash
              </li>
              <li>
                Receive a <code className="font-mono">tf_live_*</code> token; pass it as{' '}
                <code className="font-mono">Authorization: Bearer</code>
              </li>
            </ol>
          </div>
          <div className="bg-bg-secondary border border-border rounded-xl p-5">
            <div className="flex items-center gap-2 mb-3">
              <CreditCard className="w-4 h-4 text-accent-amber" />
              <h3 className="text-text-primary font-semibold">x402 fallback (one-off)</h3>
            </div>
            <p className="text-text-secondary text-sm mb-3">
              For agents that want to discover and pay in a single retry. About 3 to 4 seconds
              total latency on the first call.
            </p>
            <ol className="text-sm space-y-2 list-decimal list-inside text-text-secondary">
              <li>
                GET <code className="text-accent-primary font-mono">/api/premium/*</code> with
                no auth
              </li>
              <li>Receive 402 with payment instructions in headers and body</li>
              <li>Send USDC on Base to the wallet</li>
              <li>
                Retry with <code className="font-mono">X-Payment-Tx</code> header; receive
                data plus a token in <code className="font-mono">X-Payment-Token</code> header
              </li>
            </ol>
          </div>
        </div>
      </section>

      {/* Endpoints */}
      <section className="mb-10">
        <h2 className="text-2xl font-semibold text-text-primary mb-4">Endpoints</h2>
        <div className="space-y-4">
          {ENDPOINTS.map(ep => (
            <div
              key={ep.path}
              className="bg-bg-secondary border border-border rounded-xl overflow-hidden"
            >
              <div className="px-5 py-4 border-b border-border">
                <div className="flex flex-wrap items-center gap-3 mb-1">
                  <span
                    className={`text-xs font-bold px-2 py-0.5 rounded ${
                      ep.method === 'POST'
                        ? 'text-accent-amber bg-accent-amber/10'
                        : 'text-accent-green bg-accent-green/10'
                    }`}
                  >
                    {ep.method}
                  </span>
                  <code className="text-sm font-mono text-text-primary">{ep.path}</code>
                  <span
                    className={`text-xs font-medium px-2 py-0.5 rounded ml-auto ${
                      ep.cost === 'Free' || ep.cost.startsWith('Free')
                        ? 'text-accent-green bg-accent-green/10'
                        : ep.cost === 'Token required'
                          ? 'text-text-muted bg-bg-tertiary'
                          : 'text-accent-primary bg-accent-primary/10'
                    }`}
                  >
                    {ep.cost}
                  </span>
                </div>
                <p className="text-text-secondary text-sm mt-1">{ep.description}</p>
              </div>
              {ep.example && (
                <div className="px-5 py-3 bg-bg-tertiary/50">
                  <p className="text-xs text-text-muted mb-1.5">Example response</p>
                  <pre className="text-xs font-mono text-text-secondary overflow-x-auto whitespace-pre leading-relaxed">
                    {ep.example}
                  </pre>
                </div>
              )}
            </div>
          ))}
        </div>
      </section>

      {/* Code Examples */}
      <section className="mb-10">
        <h2 className="text-2xl font-semibold text-text-primary mb-4">Code Examples</h2>
        <div className="space-y-6">
          <div className="bg-bg-secondary border border-border rounded-xl overflow-hidden">
            <div className="px-5 py-3 border-b border-border flex items-center gap-2">
              <span className="text-xs font-bold text-accent-cyan bg-accent-cyan/10 px-2 py-0.5 rounded">
                Python SDK
              </span>
              <span className="text-text-muted text-xs">pip install tensorfeed</span>
            </div>
            <div className="px-5 py-4 bg-bg-tertiary/50">
              <pre className="text-sm font-mono text-text-secondary overflow-x-auto whitespace-pre leading-relaxed">
                {PYTHON_QUICKSTART}
              </pre>
            </div>
          </div>

          <div className="bg-bg-secondary border border-border rounded-xl overflow-hidden">
            <div className="px-5 py-3 border-b border-border flex items-center gap-2">
              <span className="text-xs font-bold text-accent-amber bg-accent-amber/10 px-2 py-0.5 rounded">
                Shell
              </span>
              <span className="text-text-muted text-xs">curl, credits-first flow</span>
            </div>
            <div className="px-5 py-4 bg-bg-tertiary/50">
              <pre className="text-sm font-mono text-text-secondary overflow-x-auto whitespace-pre leading-relaxed">
                {CURL_QUICKSTART}
              </pre>
            </div>
          </div>

          <div className="bg-bg-secondary border border-border rounded-xl overflow-hidden">
            <div className="px-5 py-3 border-b border-border flex items-center gap-2">
              <span className="text-xs font-bold text-accent-amber bg-accent-amber/10 px-2 py-0.5 rounded">
                Shell
              </span>
              <span className="text-text-muted text-xs">curl, x402 fallback flow</span>
            </div>
            <div className="px-5 py-4 bg-bg-tertiary/50">
              <pre className="text-sm font-mono text-text-secondary overflow-x-auto whitespace-pre leading-relaxed">
                {X402_FALLBACK_CURL}
              </pre>
            </div>
          </div>
        </div>
      </section>

      {/* Free preview */}
      <section className="mb-10">
        <div className="bg-bg-secondary border border-border rounded-xl p-5">
          <h2 className="text-lg font-semibold text-text-primary mb-2">Free Preview Tier</h2>
          <p className="text-text-secondary text-sm mb-2">
            Every paid endpoint has a free preview at{' '}
            <code className="text-accent-primary font-mono">/api/preview/*</code>. The free
            tier returns the top recommendation only (no score breakdown) and is rate-limited
            to 5 calls per UTC day per IP. The counter resets at UTC midnight.
          </p>
          <p className="text-text-muted text-sm">
            Use the preview to validate the endpoint before committing credits. After 5 calls
            in a day, the response is a 429 with a hint to use the paid endpoint and the
            number of hours until reset.
          </p>
        </div>
      </section>

      {/* ToS + refunds */}
      <section className="mb-10">
        <div className="bg-bg-secondary border border-border rounded-xl p-5">
          <h2 className="text-lg font-semibold text-text-primary mb-3">Terms and Refunds</h2>
          <ul className="text-text-secondary text-sm space-y-2">
            <li>
              <span className="text-text-primary font-medium">No-training license:</span>{' '}
              Premium API responses are licensed for inference use only. Use for training,
              fine-tuning, evaluation, or distillation of ML models is prohibited.
            </li>
            <li>
              <span className="text-text-primary font-medium">Refunds:</span> Email{' '}
              <a
                href="mailto:evan@tensorfeed.ai"
                className="text-accent-primary hover:underline"
              >
                evan@tensorfeed.ai
              </a>{' '}
              with the tx hash within 24 hours of the charge. Manual USDC refund to the
              originating address within 5 business days.
            </li>
            <li>
              <span className="text-text-primary font-medium">Best-effort, no SLA:</span> We
              aim for high uptime but offer no service guarantee. Credits do not expire but
              specific premium endpoints may be modified or discontinued with reasonable
              notice.
            </li>
            <li>
              <span className="text-text-primary font-medium">Replay protection:</span> Each
              USDC tx can be used to mint credits exactly once. Re-submitting the same tx
              hash is rejected.
            </li>
          </ul>
          <p className="text-text-muted text-xs mt-3">
            Full legal terms are in the{' '}
            <Link href="/terms" className="text-accent-primary hover:underline">
              Terms of Service
            </Link>
            .
          </p>
        </div>
      </section>

      {/* Footer cards */}
      <section className="mb-10">
        <div className="grid sm:grid-cols-3 gap-3">
          <Link
            href="/developers"
            className="bg-bg-secondary border border-border rounded-lg p-4 hover:border-accent-primary transition-colors group"
          >
            <Code className="w-4 h-4 text-accent-primary mb-2" />
            <p className="text-text-primary font-medium text-sm flex items-center gap-1">
              Free API docs
              <ArrowRight className="w-3 h-3 opacity-0 group-hover:opacity-100 transition-opacity" />
            </p>
            <p className="text-text-muted text-xs">News, status, models, history</p>
          </Link>
          <a
            href="https://github.com/RipperMercs/tensorfeed/tree/main/sdk/python"
            target="_blank"
            rel="noopener noreferrer"
            className="bg-bg-secondary border border-border rounded-lg p-4 hover:border-accent-primary transition-colors group"
          >
            <FileText className="w-4 h-4 text-accent-primary mb-2" />
            <p className="text-text-primary font-medium text-sm flex items-center gap-1">
              Python SDK
              <ExternalLink className="w-3 h-3" />
            </p>
            <p className="text-text-muted text-xs">pip install tensorfeed</p>
          </a>
          <a
            href="/api/payment/info"
            className="bg-bg-secondary border border-border rounded-lg p-4 hover:border-accent-primary transition-colors group"
          >
            <Bot className="w-4 h-4 text-accent-primary mb-2" />
            <p className="text-text-primary font-medium text-sm flex items-center gap-1">
              /api/payment/info
              <ArrowRight className="w-3 h-3 opacity-0 group-hover:opacity-100 transition-opacity" />
            </p>
            <p className="text-text-muted text-xs">Live wallet and pricing JSON</p>
          </a>
        </div>
      </section>
    </div>
  );
}
