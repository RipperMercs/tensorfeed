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
  Handshake,
} from 'lucide-react';
import premiumCatalogRaw from '@/../data/premium-catalog.json';

const PAYMENT_WALLET = '0x549c82e6bfc54bdae9a2073744cbc2af5d1fc6d1';
const USDC_BASE_CONTRACT = '0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913';

// Full machine-payable catalog, generated at build time from the worker's
// PREMIUM_CATALOG by scripts/generate-premium-catalog.ts. Rendered below the
// curated Endpoints highlights so this page can never drift behind the real
// endpoint set (the storefront-coverage drift class, killed at the root).
interface CatalogEndpoint {
  path: string;
  credits: number;
  strict_premium: boolean;
  params: { name: string; required: boolean }[];
  returns: string;
  free_sibling: string | null;
  category: string;
}
interface PremiumCatalogData {
  count: number;
  credit_range: { min: number; max: number };
  categories: Record<string, number>;
  endpoints: CatalogEndpoint[];
  note: string;
  attribution: string;
}
const premiumCatalog = premiumCatalogRaw as unknown as PremiumCatalogData;

// Readable display labels for the catalog category buckets. Unmapped keys fall
// back to the raw category string, so a new bucket renders without a code change.
const CATEGORY_LABELS: Record<string, string> = {
  history: 'Time series and history',
  verdict: 'Signed verdicts',
  intelligence: 'Model intelligence',
  security: 'Security and CVE',
  sec: 'SEC filings',
  research: 'Research',
  funding: 'Funding and procurement',
  policy: 'AI policy',
  compute: 'Compute and datacenters',
  status: 'Service status',
  x402: 'x402 settlement',
  mcp: 'MCP registry',
  packages: 'Package ecosystem',
  misc: 'General intelligence',
};

// Endpoints arrive sorted by category then path. Group them into ordered
// [category, endpoints] pairs for the rendered sections.
const premiumCatalogByCategory: [string, CatalogEndpoint[]][] = (() => {
  const groups: Record<string, CatalogEndpoint[]> = {};
  for (const ep of premiumCatalog.endpoints) {
    if (!groups[ep.category]) groups[ep.category] = [];
    groups[ep.category].push(ep);
  }
  return Object.entries(groups).sort((a, b) => (a[0] < b[0] ? -1 : a[0] > b[0] ? 1 : 0));
})();

export const metadata: Metadata = {
  title: 'Pay-Per-Call API for AI Agents: USDC on Base, x402 Compatible | TensorFeed',
  description:
    'Machine-payable API for AI agents. Pay per call in USDC on Base, no accounts, no API keys, no processors. x402 V2 compatible, MCP ready, Python and TypeScript SDKs. Validated end-to-end on mainnet.',
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
      'Machine-payable API for AI agents. x402 V2 compatible, MCP ready, validated on Base mainnet.',
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
    'x402 v2 discovery',
    '.well-known x402',
    'CDP Bazaar',
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
        text: 'On-chain verification reads the USDC Transfer event from eth_getTransactionReceipt on the Base RPC. If the tx is invalid, the wrong recipient, or already used, /api/payment/confirm returns an error and no credits are minted. Replay protection means every successful tx hash is permanently recorded so the same payment cannot be claimed twice. Note that confirmed credit purchases are non-refundable per Section 17.5 of the Terms; credits do not expire, so the recommended pattern is to buy small at first and top up as call volume is calibrated.',
      },
    },
    {
      '@type': 'Question',
      name: 'Are TensorFeed premium APIs covered by an SLA?',
      acceptedAnswer: {
        '@type': 'Answer',
        text: 'No SLA in the MVP phase. Premium credits do not expire and there is no scheduled downtime, but if a premium endpoint is down we will not credit your account automatically. Credit purchases are non-refundable; the practical mitigation is the small-purchase pattern (start at $1 USDC for 50 credits, top up after calibration). As the product matures we may introduce paid SLA tiers.',
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
      text: 'POST to /api/payment/buy-credits with { "amount_usd": 1.00, "sender_wallet": "0xYOUR_EOA" }. sender_wallet is the EVM address that will sign the on-chain USDC transfer; it is bound to the quote and the confirm step rejects any tx whose on-chain from address does not match. The response includes the wallet address, a memo nonce, the credit amount (50 credits at base rate), and a 30-minute expiry.',
    },
    {
      '@type': 'HowToStep',
      position: 2,
      name: 'Send USDC on Base to the wallet',
      text: 'From the same Base wallet listed as sender_wallet in step 1, transfer the quoted USDC amount to the address returned in step 1. The on-chain from must match sender_wallet exactly; the confirm step will reject with sender_mismatch otherwise.',
    },
    {
      '@type': 'HowToStep',
      position: 3,
      name: 'Confirm the transaction',
      text: 'POST to /api/payment/confirm with { "tx_hash": "0x...", "nonce": "tf-..." }. nonce is required (the legacy no-nonce path is closed to prevent public-mempool tx-hash sniping). The worker verifies the USDC Transfer event on-chain via the Base RPC, confirms the sender matches the quote-bound sender_wallet, and mints a tf_live_ bearer token tied to your credit balance.',
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
    description: 'Generate a 30-minute payment quote bound to a sender wallet. Returns wallet, memo (nonce), credit count, and the bound sender_wallet. Required body fields: amount_usd, sender_wallet.',
    cost: 'Free',
    example: `// Body: { "amount_usd": 1.00, "sender_wallet": "0xYOUR_EOA" }
{
  "ok": true,
  "wallet": "0x549c82e6bfc54bdae9a2073744cbc2af5d1fc6d1",
  "sender_wallet": "0xyour_eoa",
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
    description: 'Verify a USDC tx on Base and mint a bearer token. Requires nonce (legacy no-nonce path closed to prevent public-mempool tx sniping). The on-chain sender must match the quote-bound sender_wallet or the call returns sender_mismatch. Idempotent: same tx submitted twice is rejected.',
    cost: 'Free',
    example: `// Body: { "tx_hash": "0x...", "nonce": "tf-abc123" }
// Note: nonce is REQUIRED. The on-chain tx.from MUST match the
// sender_wallet that was bound to the quote, or this returns
// { ok: false, error: "sender_mismatch" }.
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
    path: '/api/premium/route-verdict',
    description: 'The signed model-routing decision. For ?task=code|reasoning|creative|general or ?model=<id-or-name>, returns the single best model to use right now, fusing pricing, benchmark capability discounted for contamination, real production usage, measured p95 latency probes, and live incident-triage operational state, plus runners-up and an AFTA-signed receipt over the inputs. Optional ?max_latency_p95_ms=, ?require_operational=, ?exclude_deprecated=. 30-minute operational freshness SLA, no-charge when the live layer is stale. A free top-verdict-only taste (no runners-up, no receipt) lives at /api/preview/route-verdict, 10 calls per IP per day.',
    cost: '1 credit per call',
    example: `// Header: Authorization: Bearer tf_live_...
// Query: ?task=code&max_latency_p95_ms=2000
{
  "ok": true,
  "query": { "task": "code", "model": null },
  "capturedAt": "2026-05-28T14:42:00Z",
  "verdict": {
    "rank": 1,
    "model": { "id": "claude-sonnet-4-6", "name": "Claude Sonnet 4.6", "provider": "anthropic", "openSource": false, "contextWindow": 200000 },
    "pricing": { "input": 3, "output": 15, "blended": 9, "currency": "USD", "unit": "per 1M tokens" },
    "quality": { "task_score": 0.87, "trust_discounted": 0.83, "contamination_note": "HumanEval (high contamination, saturated)" },
    "usage": { "corroborated": true, "rank": 1, "share_pct": 18.4, "trend": "flat" },
    "latency": { "measured_p95_ms": 1180, "source": "measured_probe" },
    "operational": { "ok": true, "status": "operational", "source": "live_status" },
    "deprecation": { "flagged": false, "status": null, "sunset_date": null },
    "composite_score": 0.78,
    "why": "code quality 0.83 after trust discount; corroborated by real usage (rank 1, 18.4% share, flat); measured p95 1180 ms; operational; blended $9 / 1M"
  },
  "runners_up": [
    { "rank": 2, "model": { "name": "GPT-5.5", "provider": "openai" }, "composite_score": 0.74 }
  ],
  "trust": { "usage_corroborated": true, "benchmark_contamination": "mixed", "operational_layer": "partial", "latency_layer": "partial" },
  "billing": { "credits_charged": 1, "credits_remaining": 48 },
  "receipt": { "id": "rcpt_...", "signing_alg": "EdDSA", "signing_curve": "Ed25519", "signature": "<base64url>" }
}`,
  },
  {
    method: 'GET',
    path: '/api/premium/security/package-verdict',
    description: 'GO / REVIEW / BLOCK before an agent installs an AI/ML package. Pass package=<name>&ecosystem=PyPI|npm (optional version=) and get a single ruling fusing the known-malicious supply-chain IOC list, the OSV advisory snapshot of curated AI packages, the GHSA AI-relevant firehose, and release cadence. BLOCK on known-malicious, REVIEW on open critical or high advisories, GO when covered and clean. Coverage honesty: a package in no TF security feed is no-charge out_of_coverage, never a false GO.',
    cost: '1 credit per call',
    example: `// Query: ?package=langchain&ecosystem=PyPI
{
  "ok": true,
  "verdict_kind": "package_safety",
  "package": "langchain",
  "ecosystem": "PyPI",
  "verdict": "REVIEW",
  "risk_score": 39,
  "risk_band": "hot",
  "reasons": [
    { "signal": "osv", "severity": "high", "detail": "OSV risk_band is hot (risk_score 39): 1 critical and 2 high advisories in the last 90 days." }
  ],
  "coverage_sources": ["osv", "release"],
  "recommendation": "Review before installing langchain. Pin to a patched version where a first_patched_version is listed.",
  "billing": { "credits_charged": 1, "credits_remaining": 49 }
}`,
  },
  {
    method: 'GET',
    path: '/api/premium/resilience/concentration-verdict',
    description: 'RESILIENT / EXPOSED / CRITICAL single-point-of-failure ruling for your AI-provider dependency set. Pass providers=openai,anthropic,google (aliases like claude, gpt, gemini, bedrock, azure accepted) and get which providers are impaired right now, your weakest link, and the most dependable provider to add for redundancy, fusing the measured reliability ranking with live status. No-charge when no listed provider is tracked.',
    cost: '1 credit per call',
    example: `// Query: ?providers=openai,anthropic,google
{
  "ok": true,
  "verdict_kind": "dependency_concentration",
  "verdict": "EXPOSED",
  "provider_count": 3,
  "single_point_of_failure": false,
  "currently_impaired": ["Anthropic"],
  "weakest_link": { "provider": "Anthropic", "reliability_score": 0.97, "current_status": "degraded" },
  "diversification": { "suggested": [{ "provider": "AWS", "reliability_score": 0.96, "rank": 4 }] },
  "recommendation": "Exposed: Anthropic impaired right now. Keep a healthy fallback ready and consider adding AWS.",
  "billing": { "credits_charged": 1, "credits_remaining": 49 }
}`,
  },
  {
    method: 'GET',
    path: '/api/premium/inference/cost-verdict',
    description: 'The cheapest inference host to serve one open-weight model at a monthly token volume, with per-host projected spend, throughput context, and the savings versus your current host. Pass model=<id>&monthly_tokens=<n> (optional current_provider=, or input_tokens + output_tokens for an exact split). Ranked by cost with throughput as the secondary signal. No-charge when the model is not in the matrix.',
    cost: '1 credit per call',
    example: `// Query: ?model=llama-3.1-70b&monthly_tokens=100000000&current_provider=Together AI
{
  "ok": true,
  "verdict_kind": "inference_cost",
  "model": "Llama 3.1 70B",
  "cheapest": { "provider": "DeepInfra", "monthly_cost_usd": 37.5, "output_tps": 95 },
  "current": { "provider": "Together AI", "monthly_cost_usd": 88 },
  "savings": { "vs_current_usd": 50.5, "vs_current_pct": 57.4 },
  "recommendation": "DeepInfra is the cheapest host at 37.5 USD per month. Switching from Together AI saves 50.5 USD per month (57.4 percent).",
  "billing": { "credits_charged": 1, "credits_remaining": 49 }
}`,
  },
  {
    method: 'GET',
    path: '/api/premium/models/frontier',
    description: 'The Pareto-optimal set of models on a capability versus price plane, with every dominated model flagged plus the cheaper, at-least-as-capable model that dominates it. The set-level answer to which models to rule out entirely. Capability is the contamination-discounted TFII subscore; price is blended USD per 1M tokens. Optional task=code|reasoning|creative|general (default general).',
    cost: '1 credit per call',
    example: `// Query: ?task=code
{
  "ok": true,
  "verdict_kind": "price_performance_frontier",
  "task": "code",
  "frontier": [
    { "model_id": "claude-opus-4-8", "name": "Claude Opus 4.8", "capability": 92, "blended_price": 30 },
    { "model_id": "gpt-5-mini", "name": "GPT-5 mini", "capability": 78, "blended_price": 1.2 }
  ],
  "dominated": [
    { "model_id": "legacy-model", "name": "Legacy Model", "capability": 70, "blended_price": 5, "dominated_by": { "model_id": "gpt-5-mini", "capability": 78, "blended_price": 1.2 } }
  ],
  "counts": { "priced": 36, "frontier": 6, "dominated": 30 },
  "billing": { "credits_charged": 1, "credits_remaining": 49 }
}`,
  },
  {
    method: 'GET',
    path: '/api/premium/stack-drift-verdict',
    description: 'STABLE / WATCH / ACTION_NEEDED ruling on what moved under your declared stack in the last N days that could break you: a deprecated or sunsetting model, a breaking package major bump, an agent-protocol spec-version bump, each classified by break-risk with a recommended action. Pass at least one of models=, packages=, protocols= (comma-separated), optional since_days= (default 14). No-charge when nothing in your stack is tracked.',
    cost: '1 credit per call',
    example: `// Query: ?models=claude-3-opus&packages=langchain&protocols=mcp&since_days=14
{
  "ok": true,
  "verdict_kind": "stack_drift",
  "verdict": "ACTION_NEEDED",
  "window": { "since_days": 14, "from": "2026-05-23", "to": "2026-06-06" },
  "findings": [
    { "kind": "model", "subject": "claude-3-opus", "signal": "deprecated", "break_risk": "high", "detail": "Claude 3 Opus is deprecated, sunset 2026-07-21 (45 days).", "recommended_action": "Migrate to claude-opus-4-8." }
  ],
  "counts": { "high": 1, "medium": 0, "low": 0, "info": 0, "total": 1, "assessed": 3 },
  "billing": { "credits_charged": 1, "credits_remaining": 49 }
}`,
  },
  {
    method: 'GET',
    path: '/api/premium/model-migration-verdict',
    description: 'For one model you depend on: MIGRATE_NOW / MIGRATE_SOON / NO_ACTION plus the recommended successor with the blended-cost delta, the capability (TFII) delta, days until sunset, and a drop-in note (same provider versus an API change). Pass model=<id>, optional deadline=YYYY-MM-DD to reconcile against the sunset date. No-charge when the model is in no TF source.',
    cost: '1 credit per call',
    example: `// Query: ?model=claude-3-opus&deadline=2026-08-01
{
  "ok": true,
  "verdict_kind": "model_migration",
  "verdict": "MIGRATE_NOW",
  "model": { "id": "claude-3-opus", "name": "Claude 3 Opus", "cost_blended_per_1m": 30, "capability_tfii": 74 },
  "successor": { "id": "claude-opus-4-8", "name": "Claude Opus 4.8", "cost_blended_per_1m": 30, "capability_tfii": 92 },
  "deltas": { "cost_blended_per_1m": 0, "cost_pct": 0, "capability_tfii": 18 },
  "deadline": { "date": "2026-08-01", "days_from_now": 56, "sunset_before_deadline": true },
  "recommendation": "Claude 3 Opus is deprecated, sunset 2026-07-21 (45 days). Migrate to Claude Opus 4.8. The successor is same blended cost, TFII up 18.",
  "billing": { "credits_charged": 1, "credits_remaining": 49 }
}`,
  },
  {
    method: 'GET',
    path: '/api/premium/stack-safety-verdict',
    description: 'GO / HOLD / BLOCK deploy gate for your AI stack. Pass packages=name@version (up to 10) and get a verdict per package plus an overall gate, fusing the ingested AI-CVE batch (GHSA plus vendor advisories) with the CISA KEV catalog. Pinned versions are checked against advisory ranges: an advisory clears only when your pin is verifiably outside every affected range (version_cleared_count reports how many cleared), and anything ambiguous stays a conservative HOLD. BLOCK only when an exploited CVE applies with no fix, PASS when nothing matches or every match is version-cleared, UNKNOWN outside the curated cohort. A free gate-only preview (no CVE evidence, capped at 3 packages) lives at /api/preview/stack-safety-verdict, 10 calls per IP per day.',
    cost: '1 credit per call',
    example: `// Query: ?packages=langchain@0.3.27,vllm@0.6.0
{
  "ok": true,
  "gate": "HOLD",
  "capturedAt": "2026-05-27T09:00:00Z",
  "counts": { "block": 0, "hold": 1, "pass": 1, "unknown": 0 },
  "packages": [
    {
      "package": "vllm",
      "version": "0.6.0",
      "verdict": "HOLD",
      "in_cohort": true,
      "exploited": false,
      "fix_available": true,
      "category": "inference-stack",
      "matched_cves": [
        { "cve_id": "CVE-2026-1234", "on_kev": false, "exploited_in_wild": "stated_no", "severity_label": "high", "affected_version_ranges": ["< 0.6.1"], "fixed_versions": ["0.6.1"], "source_url": "https://github.com/advisories/GHSA-xxxx", "version_status": "affected" }
      ],
      "version_cleared_count": 0,
      "reason": "A known CVE applies to this package (not confirmed exploited). Verify your pinned version against the surfaced ranges and fixes."
    },
    { "package": "langchain", "version": "0.3.27", "verdict": "PASS", "in_cohort": true, "exploited": false, "fix_available": false, "category": "agent-framework", "matched_cves": [], "version_cleared_count": 2, "reason": "2 advisories match this package name, but pinned version 0.3.27 is outside every affected version range. Not a full vulnerability scan." }
  ],
  "billing": { "credits_charged": 1, "credits_remaining": 48 },
  "receipt": { "id": "rcpt_...", "signing_alg": "EdDSA", "signing_curve": "Ed25519", "signature": "<base64url>" }
}`,
  },
  {
    method: 'GET',
    path: '/api/premium/benchmark-trust-verdict',
    description: 'Is an AI benchmark a trustworthy capability signal right now, or saturated, contaminated, or near its ceiling so a high score is a floor and not a differentiator? Returns a trust band and a 0-100 trust score per benchmark, fusing the registry contamination and saturation flags with the live spread of the top model scores (frontier compression), plus a down-weight recommendation and an alternative benchmark. Optional ?benchmark= or ?category=. A free band-and-score-only preview lives at /api/preview/benchmark-trust-verdict, 10 calls per IP per day.',
    cost: '1 credit per call',
    example: `// Query: ?category=code
{
  "ok": true,
  "capturedAt": "2026-05-28T08:00:00Z",
  "filter": { "benchmark": null, "category": "code" },
  "count": 7,
  "verdicts": [
    {
      "id": "humaneval", "name": "HumanEval", "category": "code", "status": "saturated", "contamination_risk": "high",
      "frontier_score": "~97%", "score_range": "0-100% pass@1", "trust_band": "contaminated", "trust_score": 12,
      "signals": { "ceiling_proximity": "at_ceiling", "frontier_compression": "unknown", "top_score_spread": null, "models_scored": 0 },
      "recommendation": "Down-weight scores on this benchmark (high training-contamination risk, marked saturated, frontier score is near the ceiling). A high score is closer to a capability floor than a differentiator. Prefer LiveCodeBench for current code signal.",
      "leaderboard_url": "https://paperswithcode.com/sota/code-generation-on-humaneval"
    }
  ],
  "billing": { "credits_charged": 1, "credits_remaining": 48 },
  "receipt": { "id": "rcpt_...", "signing_alg": "EdDSA", "signing_curve": "Ed25519", "signature": "<base64url>" }
}`,
  },
  {
    method: 'GET',
    path: '/api/premium/failover-verdict',
    description: 'Provider A is degraded, which operational provider do I fail over to for this task right now? Confirms A against the live incident-triage feed, then runs the capability-first route verdict with A and any provider flagged failover_now excluded, returning the recommended destination, the incident reason, and ranked alternatives. Param-required (?from=), optional ?task= or ?model=. A free destination-and-reason-only preview lives at /api/preview/failover-verdict, 10 calls per IP per day.',
    cost: '1 credit per call',
    example: `// Query: ?from=anthropic&task=code
{
  "ok": true,
  "from": { "provider": "anthropic", "in_incident": true, "incident": { "title": "Anthropic API elevated errors", "service": "Anthropic API", "impact_classification": "critical", "recommended_action": "failover_now", "started_at": "2026-05-28T11:00:00Z", "triage_summary": "Anthropic API returning elevated 5xx for Messages." } },
  "query": { "task": "code", "model": null },
  "capturedAt": "2026-05-28T11:55:00Z",
  "excluded_providers": ["anthropic"],
  "failover_to": { "rank": 1, "model": { "id": "gpt-5-5", "name": "GPT-5.5", "provider": "openai", "openSource": false, "contextWindow": 400000 }, "pricing": { "input": 5, "output": 15, "blended": 10, "currency": "USD", "unit": "per 1M tokens" }, "quality": { "task_score": 0.86, "trust_discounted": 0.83, "contamination_note": null }, "usage": { "corroborated": true, "rank": 2, "share_pct": 14.6, "trend": "up" }, "latency": { "measured_p95_ms": 1200, "source": "measured_probe" }, "operational": { "ok": true, "status": "operational", "source": "live_status" }, "deprecation": { "flagged": false, "status": null, "sunset_date": null }, "composite_score": 0.79, "why": "code quality 0.83 after trust discount; corroborated by real usage (rank 2, 14.6% share, up); measured p95 1200 ms; operational; blended $10 / 1M" },
  "alternatives": [],
  "billing": { "credits_charged": 1, "credits_remaining": 48 },
  "receipt": { "id": "rcpt_...", "signing_alg": "EdDSA", "signing_curve": "Ed25519", "signature": "<base64url>" }
}`,
  },
  {
    method: 'GET',
    path: '/api/premium/sec/filings/guidance-delta',
    description: 'Did this periodic SEC filing (10-K or 10-Q) materially change guidance, segment outlook, or risk language versus the prior same-form filing, with the exact changed sentences quoted? Pass ?ticker=NVDA&form=10-Q for the latest same-form delta, or ?accession= for one specific filing. Returns a deterministic materiality_summary (counts by materiality, category, change type, and direction, plus a one-line headline) and the full changes array with verbatim prior and current quotes, values, and section. Input-keyed freshness: a filed 10-K or 10-Q is immutable, so the call no-charges only when a newer same-form filing has superseded the served delta. A free summary-only preview (quotes redacted) lives at /api/preview/sec/filings/guidance-delta, 10 calls per IP per day.',
    cost: '1 credit per call',
    example: `// Query: ?ticker=NVDA&form=10-Q
{
  "ok": true,
  "ticker": "NVDA",
  "company_name": "NVIDIA CORP",
  "form": "10-Q",
  "accession_number": "0001045810-26-000052",
  "prior_accession_number": "0001045810-25-000230",
  "filing_date": "2026-05-20",
  "prior_filing_date": "2025-11-19",
  "materiality_summary": { "total_changes": 10, "by_materiality": { "material": 3, "minor": 6, "boilerplate": 1 }, "by_category": { "revenue_guidance": 1, "segment_outlook": 2, "risk_factor": 4, "other": 3 }, "by_change_type": { "reworded": 8, "initiated": 1, "raised": 1 }, "by_direction": { "neutral": 8, "unclear": 1, "up": 1 }, "headline": "FY26 revenue guidance raised; Investments in Fiscal Year 2027 initiated; 4 risk factor wordings revised" },
  "changes": [ { "topic": "Investments in Fiscal Year 2027", "prior_text": "", "current_text": "In the first quarter of fiscal year 2027, we made the following investments: 18.6 billion dollars in private companies and infrastructure funds.", "prior_value": null, "current_value": "18.6 billion", "section": "Management's Discussion and Analysis", "category": "other", "change_type": "initiated", "direction": "unclear", "materiality": "material" } ],
  "freshness": { "model": "input_keyed", "superseded": false },
  "capturedAt": "2026-05-28T00:00:00Z",
  "billing": { "credits_charged": 1, "credits_remaining": 48 },
  "receipt": { "id": "rcpt_...", "signing_alg": "EdDSA", "signing_curve": "Ed25519", "signature": "<base64url>" }
}`,
  },
  {
    method: 'GET',
    path: '/api/premium/provider-reliability-verdict',
    description: 'Which frontier AI provider is the most dependable to build on right now, and which is the riskiest? Ranks the providers TensorFeed actively probes by measured operational reliability, fusing availability (ok rate) and tail consistency (p50 over p95) from its own latency probes into one dependability score. The thesis: an agent retry loop feels the tail of the latency distribution, not the median, so the score rewards a tight tail alongside raw availability rather than crowning whoever wins the median. Returns the most-dependable and riskiest picks, the full per-provider ranking, and an AFTA-signed receipt. No params. 30-minute freshness SLA keyed to the probe computed_at, no-charge when stale. A free picks-only preview (no ranking, no receipt) lives at /api/preview/provider-reliability-verdict, 10 calls per IP per day.',
    cost: '1 credit per call',
    example: `// Header: Authorization: Bearer tf_live_...
{
  "ok": true,
  "capturedAt": "2026-05-29T11:55:00Z",
  "window_label": "last_24h",
  "verdict": { "most_dependable": "anthropic", "riskiest": "deepseek" },
  "ranking": [
    { "rank": 1, "provider": "anthropic", "ok_pct": 0.99, "total_p50_ms": 500, "total_p95_ms": 900, "total_p99_ms": 1400, "spread_ratio": 1.8, "reliability_score": 0.7728, "measured": true, "note": "measured availability 99 percent, p50 500 ms, p95 900 ms, p95 over p50 spread 1.8x" }
  ],
  "coverage": { "providers_ranked": 3, "fully_measured": 3, "availability_only": 0 },
  "billing": { "credits_charged": 1, "credits_remaining": 48 },
  "receipt": { "id": "rcpt_...", "signing_alg": "EdDSA", "signing_curve": "Ed25519", "signature": "<base64url>" }
}`,
  },
  {
    method: 'GET',
    path: '/api/premium/ai-capex-cycle-verdict',
    description: 'Where does the current AI infrastructure buildout rank against the great technology capital buildouts of the past? Ranks the AI cycle against a curated historical set (UK and US railways, electrification, the Bell telephone network, the dotcom telecom-fiber overbuild) on the single cross-era-comparable axis: peak annual capex as a percent of national GDP. Returns a MODERATE / ELEVATED / EXTREME / UNPRECEDENTED band, the current rank in the set, the closest and farthest historical analog, the equities-led cycles (radio 1929) flagged separately as sentiment outliers rather than ranked, and an explicit list of the post-bust dimensions (overbuild ratio, drawdown, boom-to-bust duration, survival rate) that cannot be scored while a cycle is in progress. It deliberately does not call bubble or not-a-bubble; the honesty about what cannot yet be known is the product. No params. Editorial-cadence freshness keyed to the registry data time, no-charge when the inputs are unavailable. AFTA-signed.',
    cost: '1 credit per call',
    example: `// Header: Authorization: Bearer tf_live_...
{
  "ok": true,
  "verdict_kind": "capex_cycle_analog",
  "verdict": "ELEVATED",
  "ranked_dimension": "peak_capex_pct_gdp",
  "current_cycle": { "id": "ai-buildout", "name": "AI infrastructure buildout", "peak_capex_pct_gdp": 1.887, "annual_capex_usd_b": 600, "in_progress": true },
  "current_rank": 3,
  "total_ranked": 6,
  "exceeds_all_priors": false,
  "ranking": [
    { "id": "uk-railway-mania", "name": "UK Railway Mania", "peak_capex_pct_gdp": 7.0, "is_current": false },
    { "id": "us-railroad-1873", "name": "US Railroad Boom and Panic of 1873", "peak_capex_pct_gdp": 4.8, "is_current": false },
    { "id": "ai-buildout", "name": "AI infrastructure buildout", "peak_capex_pct_gdp": 1.887, "is_current": true },
    { "id": "dotcom-fiber", "name": "Dotcom and Telecom-Fiber Overbuild", "peak_capex_pct_gdp": 1.2, "is_current": false }
  ],
  "closest_analog": { "cycle_id": "dotcom-fiber", "name": "Dotcom and Telecom-Fiber Overbuild", "peak_capex_pct_gdp": 1.2, "distance": 0.687 },
  "sentiment_outliers": [
    { "cycle_id": "radio-1929", "name": "1920s Radio Boom and 1929 Crash", "peak_to_trough_drawdown_pct": 98.0, "note": "Equity mania around a new platform technology, capital-light, best compared on drawdown not capex." }
  ],
  "not_yet_measurable": ["overbuild_ratio", "peak_to_trough_drawdown_pct", "boom_to_bust_years", "survival_rate_pct"],
  "caveats": [
    "The AI capex-to-GDP figure is a point estimate near 1.887 percent (US AI capex over US GDP); estimates range from about 0.8 percent on a global-GDP denominator to about 2.4 percent on the broadest hyperscaler guidance.",
    "The AI numerator is disclosed annual capex and is a lower bound; it excludes AI labs, neoclouds, and sovereign buildouts."
  ],
  "interpretation": "On capex as a share of GDP, the AI buildout is comparable to the larger historical buildouts (rank 3 of 6), closest to the Dotcom and Telecom-Fiber Overbuild. The post-bust dimensions that decide whether a buildout was a bubble cannot be scored while the cycle is in progress.",
  "captured_at": "2026-06-07T00:00:00Z",
  "billing": { "credits_charged": 1, "credits_remaining": 48 },
  "receipt": { "id": "rcpt_...", "signing_alg": "EdDSA", "signing_curve": "Ed25519", "signature": "<base64url>" }
}`,
  },
  {
    method: 'GET',
    path: '/api/premium/x402-settlement-verdict',
    description: 'Is the Base x402 USDC settlement market growing, is it concentrated or a real market, and who leads? Rules over TensorFeed\'s own on-chain settlement index: momentum versus the prior window of equal length (expanding, steady, contracting, or nascent), concentration by the Herfindahl index (concentrated, moderate, or diversified), and the leading publisher, plus the full per-publisher volume ranking and the ecosystem totals with the window-over-window change. Optional ?window=24h|7d|30d (default 7d). Coverage is the Base settlements TensorFeed indexes, forward-only from launch: not all of x402 and not other chains. 10-minute freshness SLA keyed to the index cursor last_run_at, no-charge when stale. A free classifications-only preview lives at /api/preview/x402-settlement-verdict, 10 calls per IP per day.',
    cost: '1 credit per call',
    example: `// Query: ?window=7d
{
  "ok": true,
  "capturedAt": "2026-05-29T17:54:00Z",
  "window_label": "7d",
  "verdict": { "momentum": "expanding", "concentration": "concentrated", "leading_publisher": "pay.example.com" },
  "ecosystem": { "volume_usdc": "1234.500000", "count": 42, "unique_publishers": 3, "volume_change_pct": 30, "count_change_pct": 25, "prior_window_empty": false, "top_publisher_share_pct": 64.8, "hhi": 4908 },
  "ranking": [
    { "rank": 1, "domain": "pay.example.com", "volume_usdc": "800.000000", "count": 25, "share_pct": 64.8 }
  ],
  "billing": { "credits_charged": 1, "credits_remaining": 48 },
  "receipt": { "id": "rcpt_...", "signing_alg": "EdDSA", "signing_curve": "Ed25519", "signature": "<base64url>" }
}`,
  },
  {
    method: 'POST',
    path: '/api/payment/trial-credits',
    description: 'Free, zero-setup on-ramp. Sign an EIP-191 message proving you control a wallet (no on-chain transaction, no USDC, no gas), POST { message, signature }, and receive a bearer token preloaded with 25 trial credits. One grant per wallet, OFAC-screened, single-use nonce, 30-day expiry. Top up the same token later via /api/payment/buy-credits.',
    cost: 'Free',
    example: `// POST body: { message, signature }. The wallet signs this EIP-191 message:
//   I am requesting TensorFeed trial credits for this wallet.
//
//   wallet: 0xYourEoa
//   timestamp: 2026-05-28T14:42:00.000Z
//   nonce: 9f3c1ab27de40581
{
  "ok": true,
  "token": "tf_live_<64-hex-chars>",
  "credits": 25,
  "expires_at": "2026-06-27T14:42:00.000Z",
  "wallet": "0xYourEoa",
  "how_to_use": "Send Authorization: Bearer <token> on any /api/premium/* call until the balance or the expiry runs out. Top up the same token via /api/payment/buy-credits."
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
    path: '/api/premium/hf-leaderboard/movers',
    description:
      'Period-over-period movers on the Hugging Face Open LLM Leaderboard v2, diffed from TensorFeed dated snapshots: rank climbers and fallers, average and per-benchmark score deltas, models entered and exited, new per-benchmark leaders, and license changes. Optional window in days (default 7, 1 to 90). The live board shows only today; this is what moved between two captured days.',
    cost: '1 credit per call',
    example: `// Query: ?window=7
{
  "ok": true,
  "captured_at": "2026-06-03",
  "from_date": "2026-05-27",
  "to_date": "2026-06-03",
  "window_days": 7,
  "has_data": true,
  "rank_climbers": [
    { "model_id": "org/model-a", "from_rank": 12, "to_rank": 5, "rank_change": 7, "average_change": 2.6 }
  ],
  "new_leaders": [
    { "benchmark": "math_lvl_5", "model_id": "org/model-a", "score": 38.4, "prev_leader": "org/model-b" }
  ]
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
    path: '/api/premium/history/news/full',
    description: 'Untruncated daily news archive. Single-date mode (?date=YYYY-MM-DD) returns the complete deduped article list for one UTC day (up to 200 articles). Range mode (?from=&to=, max 30 days) returns one entry per UTC date in the window. The free /api/history/news endpoint is capped at 25 articles per day; this endpoint exposes the full snapshot. Captured by every hourly RSS poll, so each day reflects the last poll before midnight.',
    cost: '1 credit per call',
    example: `// Query: ?date=2026-05-07
{
  "ok": true,
  "mode": "single",
  "date": "2026-05-07",
  "captured_at": "2026-05-07T23:00:14.812Z",
  "articles_count": 187,
  "articles": [
    {
      "id": "x9k2pq",
      "title": "Anthropic Ships Mythos to Defenders First",
      "url": "https://www.anthropic.com/news/mythos",
      "source": "Anthropic Blog",
      "sourceDomain": "anthropic.com",
      "snippet": "Anthropic released Mythos Preview today...",
      "categories": ["models", "security"],
      "publishedAt": "2026-05-07T18:30:00Z",
      "fetchedAt": "2026-05-07T19:00:11Z"
    }
  ],
  "billing": { "credits_charged": 1, "credits_remaining": 47 }
}`,
  },
  {
    method: 'GET',
    path: '/api/premium/history/news/source-health',
    description:
      'Multi-day per-source RSS poll reliability series. Each entry per day carries polls (total polls in the UTC day), polls_ok, polls_empty, polls_error, articles_total, reliability_pct, last_status, and last_error. Sources sorted by reliability_pct descending. Range capped at 90 days. Useful for trending source reliability, detecting feeds that went silent, or building a procurement-grade view of which AI publishers are most consistent.',
    cost: '1 credit per call',
    example: `// Query: ?from=2026-05-01&to=2026-05-07
{
  "ok": true,
  "from": "2026-05-01",
  "to": "2026-05-07",
  "days_returned": 7,
  "days": [
    {
      "date": "2026-05-07",
      "total_polls": 24,
      "updated_at": "2026-05-07T23:00:14.812Z",
      "sources": [
        { "id": "anthropic", "name": "Anthropic Blog", "polls": 24, "polls_ok": 24, "polls_empty": 0, "polls_error": 0, "articles_total": 32, "reliability_pct": 100, "last_status": "ok", "last_seen_at": "2026-05-07T23:00:11Z" },
        { "id": "huggingface", "name": "HuggingFace Blog", "polls": 24, "polls_ok": 18, "polls_empty": 6, "polls_error": 0, "articles_total": 14, "reliability_pct": 75, "last_status": "ok", "last_seen_at": "2026-05-07T23:00:12Z" }
      ]
    }
  ],
  "billing": { "credits_charged": 1, "credits_remaining": 46 }
}`,
  },
  {
    method: 'GET',
    path: '/api/premium/security/cve/range',
    description:
      'MITRE CVE List range query. Returns CVE IDs added or modified across a UTC date range, capped at 30 days. Each day in the response carries the full CVE-ID set indexed by the daily cvelistV5 commit-history scan. Pair with /api/security/cve/{id} for the per-CVE Record v5.2 lookup. License: MITRE CVE Terms of Use, commercial redistribution explicitly permitted; attribution block included on every response.',
    cost: '1 credit per call',
    example: `// Query: ?from=2026-05-06&to=2026-05-08
{
  "ok": true,
  "from": "2026-05-06",
  "to": "2026-05-08",
  "days_returned": 3,
  "cves_total": 412,
  "days": [
    { "date": "2026-05-06", "count": 138, "cve_ids": ["CVE-2026-1801", "CVE-2026-1802", "..."] },
    { "date": "2026-05-07", "count": 87,  "cve_ids": ["CVE-2026-1939", "CVE-2026-1940", "..."] },
    { "date": "2026-05-08", "count": 187, "cve_ids": ["CVE-2026-2027", "CVE-2026-2028", "..."] }
  ],
  "attribution": {
    "source": "MITRE CVE List",
    "source_url": "https://www.cve.org",
    "license": "MITRE CVE Terms of Use",
    "redistribution": "commercial-permitted"
  },
  "billing": { "credits_charged": 1, "credits_remaining": 45 }
}`,
  },
  {
    method: 'GET',
    path: '/api/premium/cve/kev-exploitation-timeline',
    description:
      'Per-vendor exploited-in-the-wild history from the cve-kev-2026 dataset. One vendor per call (?vendor=, loose matching: vendor=cisco resolves to "Cisco Systems, Inc."). Each CVE in the vendor timeline carries NVD disclosure date, days from disclosure to CISA KEV listing (often thousands of days for old CVEs CISA added in 2026), vulnerability class, CVSS, attack vector, vendor patch status, ransomware association, and a one-sentence summary, plus per-vendor aggregates (kev_count, mean and fastest KEV-add lag, severity distribution). Built from an offline per-CVE LLM extraction and a deterministic per-vendor rollup. v1 is a capped slice, not the full KEV catalog. License: NVD + CISA KEV US Government public domain (17 USC 105), commercial redistribution permitted.',
    cost: '1 credit per call',
    example: `// Query: ?vendor=cisco
{
  "ok": true,
  "vendor_query": "cisco",
  "matched_vendor": "Cisco Systems, Inc.",
  "dataset_meta": {
    "dataset": "cve-kev-2026",
    "cves_total": 200,
    "vendors_total": 91,
    "coverage": "v1 capped slice (not the full kev-anchored-2026 corpus)",
    "attribution": { "source": "NVD and CISA KEV", "license": "US Government public domain (17 USC 105)" }
  },
  "vendor": {
    "vendor_normalized": "Cisco Systems, Inc.",
    "cve_count": 12,
    "kev_count": 12,
    "ransomware_count": 0,
    "mean_days_disclosure_to_kev": 1180.4,
    "fastest_days_disclosure_to_kev": 21,
    "severity_distribution": { "critical": 5, "high": 7 },
    "timeline": [
      { "cve_id": "CVE-20XX-NNNN", "published_date": "20XX-0X-0X", "kev_date_added": "2026-0X-0X",
        "days_disclosure_to_kev": 412, "vulnerability_class": "rce-unauth", "cvss_v3_score": 9.8,
        "attack_vector": "network", "vendor_patch_status": "patch-released",
        "ransomware_use_known": false, "summary_one_sentence": "..." }
    ]
  },
  "billing": { "credits_charged": 1, "credits_remaining": 44 }
}`,
  },
  {
    method: 'GET',
    path: '/api/premium/security/corroborated',
    description:
      'One package whole corroborated GHSA advisory set per call (?package=, loose matching: package=commons-text resolves to the canonical name). Each advisory carries three explicit provenance buckets: corroborated_claim (verbatim affected_products + the deterministic product-vs-authoritative-OSV verdict, never-false-confirm), deterministic_enrichment (KEV/EPSS/SSVC/OSV joined ONLY by a verbatim-verified CVE id), verbatim_context (version/severity/exploited copied verbatim, not corroborated). meta.claim is surfaced verbatim: we corroborate the affected package and enrich by verified CVE id; we do NOT verify the advisory exploitation or severity claims (GHSA prose does not make them). Quarantined (extraction_suspect) records are never served. Honest counts: 82 package-addressable advisories (73 corroborated, 9 novel) across 47 packages; product-less unverifiable and quarantined excluded from served counts, not padded. Built from an offline grammar-constrained extraction, a deterministic OSV-only never-false-confirm corroboration, and a verbatim-CVE guard. Strict-premium: anonymous probes get the canonical 402. License: GHSA + OSV/CISA KEV/FIRST EPSS/NVD public; derived metadata + corroboration verdicts, advisory prose not republished.',
    cost: '1 credit per call',
    example: `// Query: ?package=free5gc
{
  "ok": true,
  "package_query": "free5gc",
  "matched_package": "free5GC",
  "claim": "Affected package corroborated against authoritative OSV, plus deterministic KEV/EPSS/CVSS/SSVC enrichment joined by a verbatim-verified CVE id. We do NOT verify the advisory exploitation or severity claims; GHSA prose does not make them.",
  "advisory_count": 13,
  "advisories": [
    {
      "source_url": "https://github.com/advisories/GHSA-27ph-8q4f-h7m7",
      "overall": "corroborated",
      "corroborated_claim": { "affected_products": ["free5GC"], "product_corroboration": "confirmed" },
      "deterministic_enrichment": {
        "cves_verbatim_verified": [], "kev_listed": false, "epss_percentile": null,
        "ssvc": null, "osv_packages": ["github.com/free5gc/bsf"]
      },
      "verbatim_context": {
        "affected_version_ranges": ["v4.2.1"], "fixed_versions": [],
        "severity_label": "unstated", "exploited_in_wild": "unstated"
      }
    }
  ],
  "billing": { "credits_charged": 1, "credits_remaining": 44 }
}`,
  },
  {
    method: 'GET',
    path: '/api/premium/security/kev/full',
    description:
      'Full untruncated CISA KEV catalog. Free /api/security/kev returns top-50 most-recent; this endpoint returns the entire current catalog with every field per entry. License: US Government public domain (17 USC 105), commercial redistribution explicitly permitted.',
    cost: '1 credit per call',
    example: `{
  "ok": true,
  "catalog_version": "2026.05.08",
  "date_released": "2026-05-08T17:31:07Z",
  "total_entries": 1590,
  "vulnerabilities": [
    {
      "cveID": "CVE-2026-42208",
      "vendorProject": "BerriAI",
      "product": "LiteLLM",
      "vulnerabilityName": "BerriAI LiteLLM SQL Injection",
      "dateAdded": "2026-05-08",
      "shortDescription": "...",
      "requiredAction": "Apply mitigations.",
      "dueDate": "2026-05-11",
      "knownRansomwareCampaignUse": "Unknown",
      "cwes": ["CWE-89"]
    }
  ],
  "billing": { "credits_charged": 1, "credits_remaining": 44 }
}`,
  },
  {
    method: 'GET',
    path: '/api/premium/security/kev/series',
    description:
      'Multi-day series of CISA KEV catalog additions across a UTC date range, capped at 90 days. Each day returns the full entry list whose dateAdded fell on that day. Useful for trending exploitation velocity, building anomaly detectors, or pulling weekly digest reports.',
    cost: '1 credit per call',
    example: `// Query: ?from=2026-05-01&to=2026-05-08
{
  "ok": true,
  "from": "2026-05-01",
  "to": "2026-05-08",
  "days_returned": 8,
  "total_added_in_range": 14,
  "days": [
    { "date": "2026-05-01", "count": 0, "entries": [] },
    { "date": "2026-05-07", "count": 3, "entries": [...] },
    { "date": "2026-05-08", "count": 11, "entries": [...] }
  ],
  "billing": { "credits_charged": 1, "credits_remaining": 43 }
}`,
  },
  {
    method: 'GET',
    path: '/api/premium/security/epss/series',
    description:
      'Full historical EPSS time-series for one CVE, sourced from FIRST.org. Each entry per date carries epss probability (0 to 1) and percentile rank. The series compounds with time as EPSS publishes daily. License: FIRST.org free-for-any-use policy.',
    cost: '1 credit per call',
    example: `// Query: ?cve_id=CVE-2024-3094
{
  "ok": true,
  "cve_id": "CVE-2024-3094",
  "score": {
    "cve": "CVE-2024-3094",
    "epss": "0.850580000",
    "percentile": "0.993590000",
    "date": "2026-05-08",
    "time-series": [
      { "epss": "0.850580000", "percentile": "0.993590000", "date": "2026-05-07" },
      { "epss": "0.84588000",  "percentile": "0.99337000",  "date": "2026-05-06" }
    ]
  },
  "billing": { "credits_charged": 1, "credits_remaining": 42 }
}`,
  },
  {
    method: 'GET',
    path: '/api/premium/security/epss/top',
    description:
      'Top-N highest-EPSS CVEs, optionally as of any historical UTC date. Free /api/security/epss/top serves the current snapshot only; this endpoint adds the historical-date filter. License: FIRST.org free-for-any-use policy.',
    cost: '1 credit per call',
    example: `// Query: ?date=2026-04-01&limit=5
{
  "ok": true,
  "date": "2026-04-01",
  "count": 5,
  "top": [
    { "cve": "CVE-2023-23752", "epss": "0.943100000", "percentile": "1.000000000", "date": "2026-04-01" }
  ],
  "billing": { "credits_charged": 1, "credits_remaining": 41 }
}`,
  },
  {
    method: 'GET',
    path: '/api/premium/clean/cve/{CVE-id}',
    description:
      'LLM-ready MITRE CVE record. Drops a typical CVE from ~3KB nested JSON to ~500 bytes flat JSON (~80% token reduction) with zero information loss for agent decision-making. Adds derived severity_band (none/low/medium/high/critical), deduped CWEs, flat vendor+product affected_products list, and top 5 references. Versioned via schema_version + cleaning_version for schema stability. The deep moat over the free /api/security/cve/{id} endpoint: agents pay because their context-window-tax savings exceed the $0.02 cost.',
    cost: '1 credit per call',
    example: `// GET /api/premium/clean/cve/CVE-2024-3094
{
  "ok": true,
  "source_format": "mitre_cve_v5_2",
  "target_format": "tensorfeed_llm_ready_v1",
  "source_payload": "cache",
  "schema_version": "1.0",
  "cleaning_version": "1.0",
  "transformed_at": "2026-05-09T03:45:11Z",
  "source": "MITRE CVE List",
  "data": {
    "id": "CVE-2024-3094",
    "state": "PUBLISHED",
    "published_at": "2024-03-29T16:51:12.588Z",
    "summary": "Malicious code in xz upstream tarballs.",
    "cvss_v3_1_score": 10,
    "cvss_v3_1_severity": "CRITICAL",
    "severity_band": "critical",
    "cwes": ["CWE-506"],
    "affected_products": ["xz liblzma", "Red Hat Fedora"],
    "affected_count": 2,
    "references_count": 8,
    "references_top": ["https://www.openwall.com/...", "https://access.redhat.com/...", "..."]
  },
  "billing": { "credits_charged": 1, "credits_remaining": 38 }
}`,
  },
  {
    method: 'GET',
    path: '/api/premium/clean/kev/{CVE-id}',
    description:
      'LLM-ready CISA KEV entry. Same content as /api/security/kev/{CVE-id} (free) but with normalized ransomware_use enum (yes/unknown/no) and notes_urls extracted from the upstream semicolon-separated reference text. Returns 404 if the CVE is not on the KEV catalog.',
    cost: '1 credit per call',
    example: `{
  "ok": true,
  "source_format": "cisa_kev_v1",
  "target_format": "tensorfeed_llm_ready_v1",
  "schema_version": "1.0",
  "cleaning_version": "1.0",
  "data": {
    "cve_id": "CVE-2026-42208",
    "vendor": "BerriAI",
    "product": "LiteLLM",
    "vulnerability_name": "BerriAI LiteLLM SQL Injection",
    "date_added": "2026-05-08",
    "due_date": "2026-05-11",
    "ransomware_use": "unknown",
    "cwes": ["CWE-89"],
    "notes_urls": ["https://github.com/BerriAI/litellm/security/advisories/...", "https://nvd.nist.gov/vuln/detail/..."]
  },
  "billing": { "credits_charged": 1, "credits_remaining": 37 }
}`,
  },
  {
    method: 'GET',
    path: '/api/premium/clean/epss/{CVE-id}',
    description:
      'LLM-ready EPSS score. Numeric probability (not stringified), derived risk_band (low/medium/high/critical), optional series summary (?series=true returns first/min/max snapshot instead of the full daily series, sized to fit comfortably in any context window). License: FIRST.org free-for-any-use policy.',
    cost: '1 credit per call',
    example: `// GET /api/premium/clean/epss/CVE-2024-3094?series=true
{
  "ok": true,
  "source_format": "first_org_epss_v1",
  "target_format": "tensorfeed_llm_ready_v1",
  "included_series": true,
  "schema_version": "1.0",
  "cleaning_version": "1.0",
  "data": {
    "cve_id": "CVE-2024-3094",
    "date": "2026-05-08",
    "epss_probability": 0.85058,
    "percentile": 0.99359,
    "risk_band": "high",
    "series_points": 365,
    "series_first": { "date": "2025-05-09", "epss": 0.71245 },
    "series_min": { "date": "2025-05-09", "epss": 0.71245 },
    "series_max": { "date": "2026-04-12", "epss": 0.86103 }
  },
  "billing": { "credits_charged": 1, "credits_remaining": 36 }
}`,
  },
  {
    method: 'GET',
    path: '/api/premium/history/news/clusters/full',
    description:
      'Full untruncated cross-source story clusters per UTC date. Each cluster groups TensorFeed news articles about the same story via embedding-based similarity and reports source_count, sources_list, hero article, corroboration_band (single / limited / broad), and contributing article_ids. The free /api/history/news/clusters caps at 25 clusters/day; this endpoint removes the cap and adds 30-day range support. Computed nightly at 07:30 UTC.',
    cost: '1 credit per call',
    example: `// GET /api/premium/history/news/clusters/full?date=2026-05-08
{
  "ok": true,
  "mode": "single",
  "date": "2026-05-08",
  "count": 47,
  "clusters": [
    {
      "cluster_id": "k3mn8q",
      "date": "2026-05-08",
      "article_count": 6,
      "source_count": 5,
      "sources": ["anthropic.com", "techcrunch.com", "theverge.com", "reuters.com", "bloomberg.com"],
      "article_ids": ["a1", "a2", "a3", "a4", "a5", "a6"],
      "hero": { "id": "a1", "title": "Anthropic Ships Mythos to Defenders First", "url": "https://www.anthropic.com/news/mythos", "source": "Anthropic Blog", "publishedAt": "2026-05-07T18:30:00Z" },
      "first_seen_at": "2026-05-07T18:30:00Z",
      "corroboration_band": "broad"
    }
  ],
  "billing": { "credits_charged": 1, "credits_remaining": 32 }
}`,
  },
  {
    method: 'GET',
    path: '/api/premium/history/news/verified',
    description:
      'Story-level feed filtered to clusters with N+ independent sources corroborating. Default min_sources=4 (broad corroboration). Agents asking "do not act on a single source" get a clean stream of stories that cleared the trust threshold. The verification product uniquely possible for TF because only TF has the cross-source view at scale.',
    cost: '1 credit per call',
    example: `// GET /api/premium/history/news/verified?from=2026-05-01&to=2026-05-08&min_sources=4
{
  "ok": true,
  "mode": "range",
  "from": "2026-05-01",
  "to": "2026-05-08",
  "min_sources": 4,
  "days_returned": 8,
  "total_verified": 23,
  "days": [
    {
      "date": "2026-05-08",
      "total_clusters_for_day": 47,
      "verified_count": 4,
      "clusters": [
        { "cluster_id": "k3mn8q", "source_count": 5, "corroboration_band": "broad", "hero": { "title": "Anthropic Ships Mythos..." } }
      ]
    }
  ],
  "billing": { "credits_charged": 1, "credits_remaining": 31 }
}`,
  },
  {
    method: 'GET',
    path: '/api/premium/status/leaderboard',
    description:
      'Cross-provider uptime ranking. Computed from minute-resolution counters (one sample every 2 minutes per provider, ~720 samples per provider per day). Each entry includes uptime_pct, polls, operational/degraded/down/unknown buckets, downtime_minutes, hard_down_minutes (excludes degraded), incident_count, and mttr_minutes (mean time to recover from resolved incidents). Sorted by uptime % DESC with hard_down_minutes as tie-breaker. Custom date range up to 90 days. Aimed at SRE/ops/procurement teams comparing AI vendor reliability.',
    cost: '1 credit per call',
    example: `// Query: ?from=2026-04-01&to=2026-04-30
{
  "ok": true,
  "range": { "from": "2026-04-01", "to": "2026-04-30", "days": 30 },
  "generated_at": "2026-05-04T21:00:00Z",
  "entry_count": 10,
  "poll_interval_minutes": 2,
  "entries": [
    {
      "provider": "Claude API",
      "rank": 1,
      "uptime_pct": 99.9722,
      "polls": 21600,
      "operational_polls": 21594,
      "degraded_polls": 6,
      "down_polls": 0,
      "unknown_polls": 0,
      "downtime_minutes": 12,
      "hard_down_minutes": 0,
      "incident_count": 1,
      "mttr_minutes": 12
    },
    {
      "provider": "OpenAI API",
      "rank": 2,
      "uptime_pct": 99.4444,
      "polls": 21600,
      "operational_polls": 21480,
      "degraded_polls": 100,
      "down_polls": 20,
      "unknown_polls": 0,
      "downtime_minutes": 240,
      "hard_down_minutes": 40,
      "incident_count": 4,
      "mttr_minutes": 35.5
    }
  ]
}`,
  },
  {
    method: 'GET',
    path: '/api/premium/whats-new',
    description:
      "Agent morning brief: pricing changes, new/removed models, status incidents, and top news headlines from the last 1-7 days. The single endpoint to call when an agent boots up. Pass the cursor from any response back as ?since= to get only what changed since your last call; if nothing changed, the call is free.",
    cost: '1 credit per call',
    example: `// Query: ?days=1&news_limit=10
{
  "ok": true,
  "window": { "from": "2026-04-26T...", "to": "2026-04-27T...", "days": 1 },
  "summary": {
    "total_pricing_changes": 2, "new_models": 1, "removed_models": 0,
    "incidents": 1, "news_articles": 8
  },
  "pricing": {
    "changes": [
      { "model": "Claude Opus 4.7", "field": "inputPrice", "from": 15, "to": 12, "delta_pct": -20 }
    ],
    "new_models": [
      { "model": "Gemini 3.5", "provider": "Google", "input_per_1m": 6, "output_per_1m": 18, "tier": "flagship" }
    ],
    "removed_models": []
  },
  "status": {
    "incidents": [{ "service": "OpenAI", "severity": "minor", "title": "Degraded latency", "duration_minutes": 35 }],
    "currently_operational": 8, "currently_degraded": 0, "currently_down": 0
  },
  "news": [{ "title": "Anthropic ships ...", "url": "...", "published_at": "..." }],
  "billing": { "credits_charged": 1, "credits_remaining": 42 }
}`,
  },
  {
    method: 'GET',
    path: '/api/premium/whats-new/pro',
    description:
      "Pro tier of the morning brief. Same base payload as /api/premium/whats-new plus a Claude Haiku 4.5 analyst summary, 1 to 5 key takeaways with per-field cited basis IDs and confidence scores, and 1 to 3 recommended actions targeted by agent class. Every claim cites by stable basis ID assigned server-side BEFORE the model sees the data; citations are server-side validated, so the agent never sees a hallucinated reference. Failure to synthesize is a no-charge event under AFTA.",
    cost: '10 credits per call',
    example: `// Query: ?days=1&news_limit=10
{
  "ok": true,
  "tier": "pro",
  "window": { "from": "2026-05-13", "to": "2026-05-14", "days": 1 },
  "summary": { "total_pricing_changes": 1, "new_models": 1, "incidents": 1, "news_articles": 1 },
  "pricing": { "changes": [{ "model": "Claude Opus 4.7", "from": 15, "to": 14, "delta_pct": -6.6667 }], "new_models": [{ "model": "Sonnet 4.7", "tier": "mid" }] },
  "status": { "incidents": [{ "provider": "openai", "severity": "minor", "title": "Elevated latency" }] },
  "news": [{ "title": "Anthropic announces Sonnet 4.7", "url": "..." }],
  "data_ids": {
    "pricing_changes": { "c1": "Claude Opus 4.7|anthropic|inputPrice" },
    "new_models": { "m1": "Sonnet 4.7|anthropic" },
    "incidents": { "i1": "openai|Elevated latency|..." },
    "news": { "n1": "https://anthropic.com/news/sonnet-4-7" }
  },
  "pro": {
    "generated_by": "claude-haiku-4-5-20251001",
    "analyst_summary": "Anthropic cut Claude Opus 4.7 input pricing by 7 percent. New Sonnet 4.7 mid tier model announced. OpenAI had a minor 90 minute latency event...",
    "key_takeaways": [
      { "claim": "Anthropic cut Claude Opus 4.7 input pricing by 7 percent", "basis": ["c1"], "confidence": 0.98 },
      { "claim": "Anthropic announced a new Sonnet 4.7 mid tier model", "basis": ["m1", "n1"], "confidence": 0.95 }
    ],
    "recommended_actions": [
      { "for": "cost-bound", "action": "Re-evaluate Claude Opus as primary model given the price cut", "priority": "monitor", "basis": ["c1"] },
      { "for": "inference-bound", "action": "Test Sonnet 4.7 in low risk workloads", "priority": "monitor", "basis": ["m1"] }
    ]
  },
  "billing": { "credits_charged": 10, "credits_remaining": 32 }
}`,
  },
  {
    method: 'GET',
    path: '/api/premium/probe/series',
    description:
      "Daily SLA series for one LLM provider, measured by TensorFeed itself. Returns per-day count, success rate, ttfb p50/p95/p99, total latency p50/p95/p99, incident-hour count, plus an overall window summary. The free /api/probe/latest serves the most-recent 24h aggregate. We probe Anthropic, OpenAI, Google, Mistral, and Cohere chat-completion endpoints every 15 min with a single-token prompt and record measured response time + status. The data is unique: provider status pages are politically managed; this is what we measure. Pairs naturally with /api/premium/routing for picking a model whose SLA you can verify. 90-day max range, default 30 days back.",
    cost: '1 credit per call',
    example: `// Query: ?provider=anthropic&from=2026-04-01&to=2026-04-29
{
  "ok": true,
  "provider": "anthropic",
  "from": "2026-04-01",
  "to": "2026-04-29",
  "days": 29,
  "points": [
    {
      "date": "2026-04-29",
      "count": 96, "ok_pct": 0.989, "uptime_pct": 0.989,
      "ttfb_p50": 320, "ttfb_p95": 510, "ttfb_p99": 740,
      "total_p50": 410, "total_p95": 690, "total_p99": 1120,
      "incident_hours": 0, "has_data": true
    }
  ],
  "summary": { "overall_uptime_pct": 0.992, "days_with_data": 29, "days_with_incidents": 2 },
  "notes": [],
  "billing": { "credits_charged": 1, "credits_remaining": 41 }
}`,
  },
  {
    method: 'GET',
    path: '/api/premium/openrouter/series',
    description:
      "Daily OpenRouter cross-provider catalog drift over a 90-day window. Per day: model count, cheapest paid input and output USD-per-million floor, free-tier count, namespace breadth. Plus day-over-day churn: models added, models removed, and per-model price-change counts versus the prior captured day, with sample id lists. OpenRouter's public catalog serves only current state, so this longitudinal record is captured by TensorFeed and cannot be backfilled. Optional ?from=&to= (ISO dates), default 30-day window, 90-day max.",
    cost: '1 credit per call',
    example: `// Query: ?from=2026-05-01&to=2026-05-16
{
  "ok": true,
  "from": "2026-05-01",
  "to": "2026-05-16",
  "days": 16,
  "points": [
    {
      "date": "2026-05-16",
      "total_models": 372,
      "cheapest_input_usd_per_m": 0.02,
      "cheapest_output_usd_per_m": 0.05,
      "free_tier_count": 41,
      "namespace_count": 58,
      "top_namespace": "openai",
      "added": 3, "removed": 1, "price_changes": 7,
      "added_sample": ["x-ai/grok-4-mini"],
      "removed_sample": ["deprecated/old-model"],
      "has_data": true
    }
  ],
  "delta_in_window": {
    "start_total": 361, "end_total": 372, "net": 11,
    "cheapest_input_start": 0.03, "cheapest_input_end": 0.02,
    "cheapest_output_start": 0.06, "cheapest_output_end": 0.05
  },
  "notes": [],
  "billing": { "credits_charged": 1, "credits_remaining": 40 }
}`,
  },
  {
    method: 'GET',
    path: '/api/premium/x402-registry/series',
    description:
      "Daily x402 publisher-registry drift over a 90-day window. Per day: reachable vs erroring publisher counts, federation count, distinct payment networks, paid and free endpoint totals, and agent-fair-trade declarations. Plus day-over-day churn versus the prior captured day: domains added, domains removed, status flips (a publisher going dark or returning), and payment-wallet changes, each with sample domain lists. A registry is current-state only by nature, so this longitudinal record is captured by TensorFeed and cannot be backfilled. Optional ?from=&to= (ISO dates), default 30-day window, 90-day max.",
    cost: '1 credit per call',
    example: `// Query: ?from=2026-05-01&to=2026-05-16
{
  "ok": true,
  "from": "2026-05-01",
  "to": "2026-05-16",
  "days": 16,
  "points": [
    {
      "date": "2026-05-16",
      "total": 6, "ok_count": 5, "error_count": 1,
      "federation_count": 2, "network_count": 2,
      "networks": ["eip155:8453", "eip155:84532"],
      "paid_endpoints_total": 41, "free_endpoints_total": 12,
      "agent_fair_trade_count": 3,
      "added": 1, "removed": 0, "status_flips": 1, "wallet_changes": 0,
      "added_sample": ["newpublisher.ai"],
      "removed_sample": [],
      "wallet_change_sample": [],
      "has_data": true
    }
  ],
  "delta_in_window": {
    "start_total": 4, "end_total": 6, "net": 2,
    "start_ok": 4, "end_ok": 5
  },
  "notes": [],
  "billing": { "credits_charged": 1, "credits_remaining": 39 }
}`,
  },
  {
    method: 'GET',
    path: '/api/premium/hf/velocity',
    description:
      "Daily Hugging Face download-velocity over a 90-day window. Per day: the top models and datasets by download delta and the top Spaces by likes delta, computed only for ids present in the daily top-30 on both the prior captured day and this one. Plus top-set churn (models and datasets entered and exited) and window gainers (last minus first captured day). HF exposes only cumulative totals and a live top list, so this velocity is computed by TensorFeed and cannot be backfilled. Optional ?from=&to= (ISO dates), default 30-day window, 90-day max.",
    cost: '1 credit per call',
    example: `// Query: ?from=2026-05-01&to=2026-05-16
{
  "ok": true,
  "from": "2026-05-01",
  "to": "2026-05-16",
  "days": 16,
  "points": [
    {
      "date": "2026-05-16",
      "model_count": 30, "dataset_count": 30, "space_count": 30,
      "models_entered": 2, "models_exited": 2,
      "datasets_entered": 1, "datasets_exited": 1,
      "top_models_by_download_delta": [
        { "id": "deepseek-ai/DeepSeek-V4", "downloads": 4120333, "download_delta": 88210 }
      ],
      "top_datasets_by_download_delta": [
        { "id": "open-r1/Mixture", "downloads": 990122, "download_delta": 15400 }
      ],
      "top_spaces_by_likes_delta": [
        { "id": "huggingface/chat", "likes": 71233, "likes_delta": 412 }
      ],
      "has_data": true
    }
  ],
  "window": {
    "top_model_gainers": [
      { "id": "deepseek-ai/DeepSeek-V4", "downloads": 4120333, "download_delta": 612944 }
    ],
    "top_dataset_gainers": [
      { "id": "open-r1/Mixture", "downloads": 990122, "download_delta": 88010 }
    ],
    "model_count_start": 30,
    "model_count_end": 30
  },
  "notes": [],
  "billing": { "credits_charged": 1, "credits_remaining": 38 }
}`,
  },
  {
    method: 'GET',
    path: '/api/premium/compare/models',
    description:
      'Side-by-side comparison of 2-5 AI models. Each entry returns pricing, benchmarks (normalized to a union of keys with null for missing scores so downstream code never crashes on undefined), provider live status, capabilities, context window, and recent news. Plus rankings: cheapest blended, most context, and a per-benchmark leaderboard.',
    cost: '1 credit per call',
    example: `// Query: ?ids=opus-4-7,gpt-5-5,gemini-3-5-flash
{
  "ok": true,
  "benchmark_keys": ["mmlu_pro", "swe_bench"],
  "models": [
    {
      "matched": true, "id": "opus-4-7", "name": "Claude Opus 4.7",
      "provider": "Anthropic", "tier": "flagship",
      "pricing": { "input": 15, "output": 75, "blended": 45 },
      "context_window": 1000000, "status": "operational",
      "benchmarks": { "swe_bench": 73.4, "mmlu_pro": 88.5 }
    }
  ],
  "rankings": {
    "cheapest_blended": [
      { "name": "Gemini 3", "blended": 14 },
      { "name": "GPT-5.5", "blended": 20 },
      { "name": "Claude Opus 4.7", "blended": 45 }
    ],
    "most_context": [
      { "name": "Gemini 3", "context_window": 2000000 }
    ],
    "by_benchmark": {
      "swe_bench": [
        { "name": "Claude Opus 4.7", "score": 73.4 },
        { "name": "GPT-5.5", "score": 70.0 }
      ]
    }
  },
  "billing": { "credits_charged": 1, "credits_remaining": 43 }
}`,
  },
  {
    method: 'GET',
    path: '/api/premium/providers/{name}',
    description:
      'Everything about an AI provider in one paid call: live status + components, all models with pricing + tier + benchmark scores joined, recent news mentions, agent traffic. Aggregation over 4 free endpoints in one paid request.',
    cost: '1 credit per call',
    example: `// Path: /api/premium/providers/anthropic
{
  "ok": true,
  "provider": { "id": "anthropic", "name": "Anthropic", "url": "https://anthropic.com" },
  "status": {
    "state": "operational",
    "status_page_url": "https://status.anthropic.com",
    "last_checked": "2026-04-27T18:00:00Z",
    "components": [{ "name": "API", "status": "operational" }]
  },
  "models": [
    {
      "id": "opus-4-7", "name": "Claude Opus 4.7", "tier": "flagship",
      "pricing": { "input": 15, "output": 75, "blended": 45 },
      "context_window": 1000000, "released": "2026-04-17",
      "capabilities": ["tool-use", "vision"],
      "benchmark_scores": { "swe_bench": 73.4, "mmlu_pro": 88.5 }
    }
  ],
  "recent_news": [{ "title": "Anthropic ships...", "url": "...", "published_at": "..." }],
  "recent_news_count": 12,
  "agent_traffic_24h": 124,
  "billing": { "credits_charged": 1, "credits_remaining": 44 }
}`,
  },
  {
    method: 'GET',
    path: '/api/premium/cost/projection',
    description:
      'Project the cost of a token-usage workload across 1-10 AI models. Returns daily/weekly/monthly/yearly totals per model plus a ranking by cheapest monthly. Pure compute on live /api/models pricing.',
    cost: '1 credit per call',
    example: `// Query: ?model=opus-4-7,gpt-5-5,gemini-3-5-flash&input_tokens_per_day=1000000&output_tokens_per_day=500000&horizon=monthly
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
      'Register a webhook watch. Four types: realtime price (fires when a model price crosses a threshold or any change), realtime status (fires on provider operational/degraded/down transitions), scheduled digest (fires daily or weekly with a curated summary of pricing changes regardless of whether anything dramatic happened), or leaderboard_rank (fires when a provider crosses a rank threshold on the cross-provider 7-day uptime leaderboard). Each watch lives 90 days and fires up to 100 times by default. Deliveries POST to your callback URL with an HMAC-SHA256 signature header (X-TensorFeed-Signature: sha256=...). Per-token cap of 25 active watches. Listing and per-watch read/delete are free for the owning bearer token.',
    cost: '1 credit per registration',
    example: `// Body: { spec, callback_url, secret?, fire_cap? }
// Spec types:
//   { type: "price", model, field: "inputPrice"|"outputPrice"|"blended",
//     op: "lt"|"gt"|"changes", threshold? }
//   { type: "status", provider, op: "becomes"|"changes",
//     value?: "operational"|"degraded"|"down" }
//   { type: "digest", cadence: "daily"|"weekly" }
//   { type: "leaderboard_rank", provider, op: "drops_below"|"rises_above"|"changes",
//     threshold? }  // threshold = integer rank (1=best); required unless op=changes
{
  "ok": true,
  "watch": {
    "id": "wat_a1b2c3d4e5f60718a9b0c1d2",
    "spec": { "type": "digest", "cadence": "daily" },
    "callback_url": "https://agent.example.com/hook",
    "created": "2026-04-27T18:00:00Z",
    "expires_at": "2026-07-26T18:00:00Z",
    "fire_count": 0, "fire_cap": 100, "status": "active"
  },
  "billing": { "credits_charged": 1, "credits_remaining": 49 }
}

// Digest fire payload (delivered to callback_url):
{
  "event": "watch.fire",
  "watch_id": "wat_...",
  "fired_at": "2026-04-28T07:00:00Z",
  "spec": { "type": "digest", "cadence": "daily" },
  "match": {
    "type": "digest",
    "cadence": "daily",
    "period": { "from": "2026-04-27T07:00:00Z", "to": "2026-04-28T07:00:00Z" },
    "pricing": {
      "changed": [
        { "model": "Claude Opus 4.7", "provider": "Anthropic",
          "field": "inputPrice", "from": 15, "to": 12, "delta_pct": -20 }
      ],
      "added": [], "removed": [], "total_changes": 1
    }
  }
}`,
  },
  {
    method: 'GET',
    path: '/api/premium/research/milestones',
    description:
      "Last 30 days of arXiv preprints flagged is_milestone_candidate by an offline Qwen 3.6 27B per-paper extraction. Each paper carries arxiv_id, date, subfield_tag, methodology_bucket, title, normalized affiliations, milestone_reasoning (named benchmark plus quantified delta, model release, or novel architecture), and a one-sentence summary. Conservative by design: false positives are worse than false negatives. Refreshed weekly. arXiv data is CC-BY; the per-paper extraction and milestone classification are the gate.",
    cost: '1 credit per call',
    example: `{
  "ok": true,
  "capturedAt": "2026-05-10",
  "window_days": 30,
  "total": 12,
  "papers": [
    {
      "arxiv_id": "2026.04001",
      "date": "2026-04-15",
      "subfield_tag": "llm-alignment",
      "methodology_bucket": "empirical-study",
      "title": "Constitutional AI for Multi-Turn Dialogue Safety",
      "affiliations": ["Anthropic"],
      "milestone_reasoning": "Established new SOTA on HHH-Eval at 87.4%, prior 81.2%.",
      "summary": "Extended constitutional AI methodology to multi-turn dialogue with new SOTA on HHH-Eval."
    }
  ],
  "attribution": { "source": "arXiv (preprint metadata) + TensorFeed Qwen-extracted analytical fields", ... },
  "billing": { "credits_charged": 1, "credits_remaining": 41 }
}`,
  },
  {
    method: 'GET',
    path: '/api/premium/research/emerging-keywords',
    description:
      "Top-50 multi-word keyphrases across recent arXiv abstracts, ranked by recent-vs-baseline lift. lift = (last 30d frequency) / (prior 90d frequency, smoothed). Each entry carries 2 to 5 example arxiv_ids so the agent can dive into a specific paper. Captures emerging research terminology before it shows up in citation counts. Refreshed weekly from the offline pipeline.",
    cost: '1 credit per call',
    example: `{
  "ok": true,
  "capturedAt": "2026-05-10",
  "recent_window_days": 30,
  "baseline_window_days": 90,
  "total": 50,
  "keywords": [
    {
      "keyword": "speculative decoding",
      "recent_count": 18,
      "baseline_count": 6,
      "lift": 9.1,
      "example_arxiv_ids": ["2026.04111", "2026.04222", "2026.04333"]
    }
  ],
  "attribution": { ... },
  "billing": { "credits_charged": 1, "credits_remaining": 40 }
}`,
  },
  {
    method: 'GET',
    path: '/api/premium/funding/exposure',
    description:
      "Derived analytics over the free /api/funding/portfolio registry. Returns silicon_concentration (per-silicon commitment count, total $ committed, share % of total), circular_exposure per investor (with loop_classification: fully-circular >=85%, partial-loop 25-85%, agnostic below, insufficient-data for one-shot investors), top_recipients sorted by inbound capital with the investor list per recipient, and co_investor_pairs (pairs of investors that both hold stakes in the same recipient). Underlying registry is editorial; the analytical layer is the gate.",
    cost: '1 credit per call',
    example: `{
  "ok": true,
  "capturedAt": "2026-05-10",
  "total_commitments": 8,
  "total_amount_usd_max": 313300000000,
  "silicon_concentration": [
    { "silicon_dependency": "tpu", "commitment_count": 1, "total_amount_usd_max": 200000000000, "share_of_total_pct": 63.84 },
    { "silicon_dependency": "nvidia", "commitment_count": 5, "total_amount_usd_max": 48300000000, "share_of_total_pct": 15.42 }
  ],
  "circular_exposure": [
    {
      "investor": "Nvidia",
      "investor_silicon_brand": "nvidia",
      "total_commitments": 3,
      "total_amount_usd_max": 35300000000,
      "commitments_to_own_silicon": 3,
      "circular_ratio_by_count": 1,
      "circular_ratio_by_amount": 1,
      "loop_classification": "fully-circular"
    }
  ],
  "top_recipients": [
    { "recipient": "OpenAI", "inbound_commitments": 2, "inbound_amount_usd_max": 43000000000, "investors": ["Microsoft", "Nvidia"] }
  ],
  "co_investor_pairs": [
    { "investor_a": "Microsoft", "investor_b": "Nvidia", "shared_recipients": ["OpenAI"] }
  ],
  "attribution": { ... },
  "billing": { "credits_charged": 1, "credits_remaining": 40 }
}`,
  },
  {
    method: 'GET',
    path: '/api/premium/ai-companies/{ticker}',
    description:
      "Per-ticker AI intelligence envelope for the 14 AI bellwethers (NVDA, AMD, AVGO, TSM, ARM, MSFT, GOOGL, AMZN, ORCL, PLTR, SMCI, AAPL, META, TSLA). Composes four free siblings into one paid call: latest 10 SEC filings (data.sec.gov, public domain), latest 10 AI-tagged news mentions filtered by curated aliases (so PLTR does not match unrelated 'palantir' matches), strategic and equity funding rounds where the company is a lead or notable investor in the TensorFeed funding registry, and cohort metadata (CIK, display name, category, AI angle, exchange). Single captured-at timestamp, 9h freshness SLA. Strict-premium path; ticker must be in the cohort, otherwise 404. Built for trading agents on Robinhood Agentic, ChatGPT, Claude, and custom rails doing pre-trade context in one round trip.",
    cost: '1 credit per call',
    example: `// GET /api/premium/ai-companies/NVDA
{
  "ok": true,
  "capturedAt": "2026-05-27T18:00:00Z",
  "ticker": "NVDA",
  "cohort_size": 14,
  "company": {
    "ticker": "NVDA",
    "cik": "0001045810",
    "display_name": "NVIDIA",
    "category": "silicon",
    "ai_angle": "The dominant supplier of AI training and inference GPUs (H100, H200, B200, Rubin). Every frontier lab buys from here.",
    "exchange": "NASDAQ"
  },
  "filings": {
    "count": 10,
    "items": [
      {
        "accession_number": "0001045810-26-000052",
        "form": "10-Q",
        "filing_date": "2026-05-20",
        "primary_doc_url": "https://www.sec.gov/Archives/edgar/data/1045810/..."
      }
    ],
    "source": "data.sec.gov/submissions",
    "license": "Public domain (17 USC 105). SEC EDGAR."
  },
  "news": {
    "count": 4,
    "items": [
      {
        "id": "abc123",
        "title": "NVIDIA announces Rubin successor at GTC",
        "url": "https://example.com/nvda-rubin",
        "source": "TechCrunch AI",
        "publishedAt": "2026-05-27T14:00:00Z",
        "matched_aliases": ["NVIDIA"]
      }
    ],
    "aliases_used": ["NVIDIA", "Nvidia"],
    "sanitization": "enabled"
  },
  "funding_as_investor": {
    "count": 0,
    "items": [],
    "description": "Strategic and equity rounds where this company is listed as a lead or notable investor in TensorFeed funding registry."
  },
  "attribution": { "sources": [ "SEC EDGAR ...", "TensorFeed news ...", "TensorFeed funding ..." ] },
  "billing": { "credits_charged": 1, "credits_remaining": 40 }
}`,
  },
  {
    method: 'GET',
    path: '/api/premium/research/topic-search',
    description:
      "Structured search over the arXiv preprint corpus using the TF derived taxonomy. Filters: subfield_tag, methodology_bucket, since (YYYY-MM-DD), until (YYYY-MM-DD), milestone_only (1 or 0), limit (1 to 100, default 25), offset (paginate). subfield_tag is one of llm-architecture, llm-training, llm-eval, llm-alignment, multimodal, vision, speech, robotics, rl, theory, optimization, efficiency, retrieval, agents, code-generation, scientific-ml, fairness-safety, dataset, survey, application, other. methodology_bucket is one of new-architecture, training-recipe, fine-tuning, eval-benchmark, theoretical-analysis, empirical-study, dataset-release, system-tooling, survey, position-paper, application, other. Returns matching papers sorted by date desc. arXiv's native search has no concept of methodology bucket or our subfield taxonomy; that's the gate.",
    cost: '1 credit per call',
    example: `// Query: ?subfield_tag=agents&methodology_bucket=system-tooling&since=2026-04-01&limit=5
{
  "ok": true,
  "capturedAt": "2026-05-10",
  "query": {
    "subfield_tag": "agents",
    "methodology_bucket": "system-tooling",
    "since": "2026-04-01",
    "until": null,
    "milestone_only": false,
    "limit": 5,
    "offset": 0
  },
  "total_matches": 73,
  "returned": 5,
  "papers": [
    {
      "arxiv_id": "2026.05003",
      "date": "2026-05-05",
      "title": "Agent Memory via Retrieval Over Episodic Logs",
      "subfield_tag": "agents",
      "methodology_bucket": "system-tooling",
      "is_milestone_candidate": false,
      "affiliations": ["MIT", "OpenAI"],
      "summary": "Introduced an episodic-log retrieval mechanism for long-running agent memory."
    }
  ],
  "attribution": { ... },
  "billing": { "credits_charged": 1, "credits_remaining": 39 }
}`,
  },
  {
    method: 'GET',
    path: '/api/premium/research/lab-productivity',
    description:
      "Top labs by paper count over rolling 30d / 90d / 365d windows on the offline Qwen-extracted arXiv corpus. Each entry carries affiliation, papers (count), and type (industry, academia, government, nonprofit, mixed, unknown). Filters: window (30d|90d|365d, default returns all three), affiliation_type (one of the type values), limit per window (1 to 50, default 25). arXiv has no native concept of normalized lab attribution; the per-paper extraction and affiliation normalization are the gate.",
    cost: '1 credit per call',
    example: `// Query: ?window=90d&affiliation_type=industry&limit=5
{
  "ok": true,
  "capturedAt": "2026-05-10",
  "query": {
    "window": "90d",
    "affiliation_type": "industry",
    "limit": 5
  },
  "windows": {
    "90d": [
      { "affiliation": "Google DeepMind", "papers": 142, "type": "industry" },
      { "affiliation": "Meta AI", "papers": 98, "type": "industry" },
      { "affiliation": "Microsoft Research", "papers": 81, "type": "industry" },
      { "affiliation": "OpenAI", "papers": 47, "type": "industry" },
      { "affiliation": "Anthropic", "papers": 31, "type": "industry" }
    ]
  },
  "attribution": { ... },
  "billing": { "credits_charged": 1, "credits_remaining": 38 }
}`,
  },
  {
    method: 'GET',
    path: '/api/premium/x402-index/publisher/{domain}',
    description:
      "Per-publisher receipt feed for one x402-compliant domain across an inclusive from/to date range. Returns publisher meta (domain, pay_to_wallets, first_seen) plus the window rollup (volume_usdc, count, avg_amount, daily_series of per-day rows for the entire range, zeros included). Forensic and compliance lane for any caller building dashboards over x402 settlement data on Base mainnet. Required params: from, to (YYYY-MM-DD). Strict-premium path; anonymous Bazaar probes see a clean 402 challenge before the param check. Returns 404 with a hint when the domain is not present in the x402 publisher registry (see /api/x402-index/publishers for the indexed set). Wave 20 Bazaar pilot.",
    cost: '1 credit per call',
    example: `// GET /api/premium/x402-index/publisher/tensorfeed.ai?from=2026-05-21&to=2026-05-27
{
  "ok": true,
  "publisher": {
    "domain": "tensorfeed.ai",
    "pay_to_wallets": ["0x549c82e6bfc54bdae9a2073744cbc2af5d1fc6d1"],
    "first_seen": "2026-05-28T00:00:00Z"
  },
  "window": { "from": "2026-05-21", "to": "2026-05-27", "days": 7 },
  "rollup": {
    "volume_usdc": "287.420000",
    "count": 1342,
    "avg_amount": "0.214172",
    "daily_series": [
      { "date": "2026-05-21", "volume_usdc": "32.180000", "count": 156 },
      { "date": "2026-05-22", "volume_usdc": "41.260000", "count": 198 },
      { "date": "2026-05-23", "volume_usdc": "38.940000", "count": 182 },
      { "date": "2026-05-24", "volume_usdc": "44.180000", "count": 211 },
      { "date": "2026-05-25", "volume_usdc": "39.620000", "count": 188 },
      { "date": "2026-05-26", "volume_usdc": "47.860000", "count": 219 },
      { "date": "2026-05-27", "volume_usdc": "43.380000", "count": 188 }
    ]
  },
  "attribution": "TensorFeed x402 settlement index over public Base mainnet on-chain data",
  "license": "CC BY 4.0",
  "billing": { "credits_charged": 1, "credits_remaining": 37 }
}`,
  },
  {
    method: 'GET',
    path: '/api/premium/x402-index/series',
    description:
      "Time-series of ecosystem-level or per-publisher x402 USDC settlement volume or count across a from/to date range. Chart-feeding shape. Required params: metric (volume | count), granularity (day | hour), from, to (YYYY-MM-DD). Optional domain filter (omit for ecosystem-level series). MVP supports granularity=day; granularity=hour returns an empty series with an attribution note that hour granularity is not yet available. Each series row is { ts, value }: value is a USDC decimal string when metric=volume, an integer when metric=count. Strict-premium path; anonymous Bazaar probes see a clean 402 challenge before the param check. Wave 20 Bazaar pilot.",
    cost: '1 credit per call',
    example: `// GET /api/premium/x402-index/series?metric=volume&granularity=day&from=2026-05-23&to=2026-05-27
{
  "ok": true,
  "metric": "volume",
  "granularity": "day",
  "window": { "from": "2026-05-23", "to": "2026-05-27" },
  "series": [
    { "ts": "2026-05-23", "value": "38.940000" },
    { "ts": "2026-05-24", "value": "52.180000" },
    { "ts": "2026-05-25", "value": "47.620000" },
    { "ts": "2026-05-26", "value": "58.860000" },
    { "ts": "2026-05-27", "value": "54.380000" }
  ],
  "attribution": "TensorFeed x402 settlement index over public Base mainnet on-chain data",
  "billing": { "credits_charged": 1, "credits_remaining": 36 }
}`,
  },
  {
    method: 'GET',
    path: '/api/premium/ai-crawler-access/full',
    description:
      'The full AI Crawler Access Map dataset in one call: every tracked domain with its per-bot robots.txt verdict (allowed, blocked, partial, or unknown) across the tracked AI bots (GPTBot, ClaudeBot, PerplexityBot, CCBot, Google-Extended, and more), plus llms.txt and ai.txt presence flags, plus precomputed sector rollups and aggregate blocked/allowed percentages. We report stated robots.txt policy, not enforcement. The free /api/ai-crawler-access/summary.json gives the aggregate view; this returns the per-domain rows. captured_at carries the oldest checkedAt across the set, so a stale snapshot is honest; 8-day freshness SLA, no-charge when stale.',
    cost: '1 credit per call',
    example: `// Header: Authorization: Bearer tf_live_...
{
  "ok": true,
  "captured_at": "2026-06-01T09:53:00Z",
  "domains": [
    {
      "domain": "nytimes.com",
      "sector": "publishing",
      "checkedAt": "2026-06-01T09:53:00Z",
      "robotsStatus": 200,
      "bots": { "GPTBot": "blocked", "ClaudeBot": "blocked", "CCBot": "blocked", "PerplexityBot": "partial" },
      "hasLlmsTxt": false,
      "hasAiTxt": false,
      "llmsTxtBytes": null
    }
  ],
  "stats": {
    "domainsWithData": 300,
    "botBlockedPct": { "ClaudeBot": 69, "GPTBot": 62 },
    "botAllowedPct": { "ClaudeBot": 28, "GPTBot": 35 },
    "llmsTxtAdoptionPct": 11,
    "aiTxtAdoptionPct": 3,
    "bySector": { "publishing": { "domains": 35, "llmsTxt": 2 } }
  },
  "source_attribution": "TensorFeed AI Crawler Access Map. Daily rolling crawl of curated domains, parsing public robots.txt, llms.txt, and ai.txt. We report stated policy, not enforcement."
}`,
  },
  {
    method: 'GET',
    path: '/api/premium/ai-crawler-access/changes',
    description:
      'The historical flip log over the AI Crawler Access Map: when a tracked domain changed a bot from allowed to blocked (or back), or first published or removed llms.txt or ai.txt, within a date range. Each entry is { domain, field, from, to, at }, where field is a bot name or llms.txt or ai.txt. Required params: from, to (YYYY-MM-DD). Optional domain filter (omit to scan all tracked domains). Strict-premium path; anonymous Bazaar probes see a clean 402 challenge before the param check. has_data is false and the call is not charged when nothing in the window matches. captured_at carries the snapshot data time.',
    cost: '1 credit per call',
    example: `// Header: Authorization: Bearer tf_live_...
// GET /api/premium/ai-crawler-access/changes?domain=nytimes.com&from=2026-05-01&to=2026-06-01
{
  "ok": true,
  "captured_at": "2026-06-01T09:53:00Z",
  "domain": "nytimes.com",
  "from": "2026-05-01",
  "to": "2026-06-01",
  "changes": [
    { "domain": "nytimes.com", "field": "PerplexityBot", "from": "allowed", "to": "blocked", "at": "2026-05-18T09:53:00Z" },
    { "domain": "nytimes.com", "field": "llms.txt", "from": "absent", "to": "present", "at": "2026-05-24T09:53:00Z" }
  ],
  "has_data": true,
  "source_attribution": "TensorFeed AI Crawler Access Map. Daily rolling crawl of curated domains, parsing public robots.txt, llms.txt, and ai.txt. We report stated policy, not enforcement."
}`,
  },
  {
    method: 'GET',
    path: '/api/premium/agent-ready/full',
    description:
      'The full Agent-Ready Web Map dataset in one call: every profiled domain with a transparent 0 to 100 agent-readiness score, a tier (closed, emerging, ready, or advanced), and per-surface flags covering x402 manifest, agent.json, openapi, llms.txt, AI-bot-crawlable, and ai.txt. The score weights are published: x402 +25, agent.json +20, openapi +20, llms.txt +15, crawlable +15, ai.txt +5. Derived from the crawler-access crawl; the free /api/agent-ready/summary.json gives the aggregate view, this returns the per-domain rows. We report stated, published surfaces, not enforcement. captured_at carries the snapshot data time; 8-day freshness SLA, no-charge when stale.',
    cost: '1 credit per call',
    example: `// Header: Authorization: Bearer tf_live_...
{
  "ok": true,
  "captured_at": "2026-06-01T09:53:00Z",
  "domains": [
    {
      "domain": "stripe.com",
      "sector": "payments",
      "readiness": {
        "score": 95,
        "tier": "advanced",
        "surfaces": { "x402": true, "agentJson": true, "openapi": true, "llmsTxt": true, "crawlable": true, "aiTxt": false }
      }
    }
  ],
  "source_attribution": "TensorFeed Agent-Ready Web Map. Derived from the daily crawler-access crawl of curated domains. Scores agent readiness from public surfaces (x402, agent.json, openapi, llms.txt, robots policy, ai.txt). We report stated, published surfaces, not enforcement."
}`,
  },
  {
    method: 'GET',
    path: '/api/premium/eu-ai-act/notified-bodies/history',
    description:
      'Full designation-change history over the EU NANDO / SMCS notified-body register for the AI Act (Regulation (EU) 2024/1689), the Cyber Resilience Act (2024/2847), and EUCC (2024/482): every designation_first_seen, status_change, scope_change, and delisted event, timestamped on the day TensorFeed observed it. The Commission publishes the register but no change history; the daily diff is the product. Optional params: from and to (YYYY-MM-DD, inclusive, on the observation day), legislation_id (168380 AI Act, 167953 CRA, 164702 EUCC), type. The free /api/eu-ai-act/notified-bodies gives the current list and a 5-event preview. No-charge when the log is empty (the AI Act is pre-first-designation today), when the filtered window has no events, or when the watch is stale past the 36h SLA. AFTA-signed.',
    cost: '1 credit per call',
    example: `// Header: Authorization: Bearer tf_live_...
// Query: ?legislation_id=168380&type=designation_first_seen
{
  "ok": true,
  "captured_at": "2026-06-10T19:33:09.000Z",
  "baseline_established_at": "2026-06-09T19:33:09.000Z",
  "total": 1,
  "events": [
    {
      "type": "designation_first_seen",
      "observed_at": "2026-06-10T19:33:09.000Z",
      "legislation_id": 168380,
      "legislation": "Regulation (EU) 2024/1689 on artificial intelligence (Artificial Intelligence Act)",
      "notification_id": 1031234,
      "body": "Example Conformity Assessment GmbH",
      "body_display": "NB 1234",
      "country": "Germany",
      "detail": "first designation observed: NB 1234 under Regulation (EU) 2024/1689"
    }
  ],
  "license": "CC BY 4.0 (European Commission reuse policy, Decision 2011/833/EU). TensorFeed aggregation and change-history derivation.",
  "billing": { "credits_charged": 1, "credits_remaining": 49 }
}`,
  },
];

const PYTHON_QUICKSTART = `from tensorfeed import TensorFeed

tf = TensorFeed()

# 1. Quote a credit purchase (30-minute TTL). sender_wallet is REQUIRED.
quote = tf.buy_credits(amount_usd=1.00, sender_wallet="0xYOUR_EOA")
print(f"Send {quote['amount_usd']} USDC on Base FROM {quote['sender_wallet']}")
print(f"          TO {quote['wallet']}")
print(f"Memo: {quote['memo']}")

# 2. Send the USDC tx FROM the same sender_wallet you bound to the
#    quote (Rabby, Coinbase Wallet, etc.) then confirm with the tx
#    hash. The on-chain from must match sender_wallet exactly.
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

# 1. Quote a purchase. sender_wallet is REQUIRED and binds the quote
#    to the EOA that will sign the on-chain USDC transfer. This closes
#    the public-mempool tx sniping vector.
curl -X POST https://tensorfeed.ai/api/payment/buy-credits \\
  -H "Content-Type: application/json" \\
  -d '{"amount_usd": 1.00, "sender_wallet": "0xYOUR_EOA"}'

# 2. Send USDC on Base from sender_wallet to the wallet returned in
#    step 1, then confirm with the tx hash and nonce. Both fields are
#    REQUIRED; legacy no-nonce confirm path is closed.
curl -X POST https://tensorfeed.ai/api/payment/confirm \\
  -H "Content-Type: application/json" \\
  -d '{"tx_hash": "0xYOUR_TX", "nonce": "tf-abc123"}'

# 3. Use the token on premium endpoints
curl -H "Authorization: Bearer tf_live_..." \\
  "https://tensorfeed.ai/api/premium/routing?task=code&top_n=5"

# 4. Check balance
curl -H "Authorization: Bearer tf_live_..." \\
  https://tensorfeed.ai/api/payment/balance`;

const X402_FALLBACK_CURL = `# x402 flow with sender-wallet binding (post-2026-05-05)
curl https://tensorfeed.ai/api/premium/routing
# 402 Payment Required + payment instructions in headers and body

# 1. Pre-flight quote bound to your sender wallet
curl -X POST https://tensorfeed.ai/api/payment/buy-credits \\
  -H "Content-Type: application/json" \\
  -d '{"amount_usd": 1.00, "sender_wallet": "0xYOUR_EOA"}'
# Response includes "memo": "tf-abc123"

# 2. Send USDC on Base from sender_wallet to the publisher wallet.

# 3. Retry the premium endpoint with BOTH X-Payment-Tx and
#    X-Payment-Quote headers. Both are REQUIRED on the x402 fallback;
#    the worker checks the on-chain sender against the quote-bound
#    sender_wallet and rejects sender_mismatch otherwise.
curl -H "X-Payment-Tx: 0xYOUR_TX" \\
     -H "X-Payment-Quote: tf-abc123" \\
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

      {/* AFTA Callout */}
      <Link
        href="/agent-fair-trade"
        className="block mb-10 group"
        aria-label="Learn about the Agent Fair-Trade Agreement"
      >
        <div className="bg-gradient-to-r from-accent-primary/10 via-accent-cyan/10 to-accent-primary/10 border border-accent-primary/30 rounded-xl p-5 sm:p-6 hover:border-accent-primary/60 transition-colors">
          <div className="flex items-start sm:items-center gap-4 flex-col sm:flex-row">
            <div className="p-2.5 rounded-lg bg-accent-primary/15 shrink-0">
              <Handshake className="w-6 h-6 text-accent-primary" />
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 mb-1 flex-wrap">
                <h2 className="text-text-primary font-semibold text-base sm:text-lg">
                  Every paid call is Agent Fair-Trade certified.
                </h2>
                <span className="text-[10px] px-2 py-0.5 rounded-full bg-accent-primary/15 text-accent-primary font-mono uppercase tracking-wide">
                  AFTA
                </span>
              </div>
              <p className="text-text-secondary text-sm">
                Code-enforced no-charge on 5xx, breaker, schema fail, or stale data. Every successful paid response carries an Ed25519-signed receipt your agent can verify. Open standard, machine-readable manifest at <code className="font-mono text-xs text-accent-primary">/.well-known/agent-fair-trade.json</code>.
              </p>
            </div>
            <div className="flex items-center gap-1.5 text-accent-primary text-sm font-medium shrink-0 group-hover:gap-2.5 transition-all">
              Read the standard
              <ArrowRight className="w-4 h-4" />
            </div>
          </div>
        </div>
      </Link>

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
        <div className="mt-4 bg-bg-secondary border border-accent-green/40 rounded-xl px-5 py-4">
          <div className="flex items-center gap-2 mb-1">
            <span className="text-accent-green font-semibold text-sm">
              First-payment welcome bonus
            </span>
            <span className="text-text-muted text-xs">($1.00 of value)</span>
          </div>
          <p className="text-text-secondary text-sm">
            The first successful USDC payment from a new sender wallet receives an
            extra <span className="font-mono text-text-primary">50 credits</span> on top
            of the base rate. Granted automatically; the response from{' '}
            <code className="font-mono text-accent-primary">/api/payment/confirm</code>{' '}
            includes <code className="font-mono">welcome_bonus_credits</code> and{' '}
            <code className="font-mono">is_first_payment</code> when applied. Same gate
            applies on the x402 fallback. Stacks with volume discounts: a $1 first
            payment yields 100 credits ($2.00 of value), a $5 first payment yields 325
            credits.
          </p>
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
                with <code className="font-mono">amount_usd</code> and{' '}
                <code className="font-mono">sender_wallet</code>
              </li>
              <li>
                Send USDC on Base FROM your <code className="font-mono">sender_wallet</code> to the
                returned wallet
              </li>
              <li>
                POST{' '}
                <code className="text-accent-primary font-mono">/api/payment/confirm</code>{' '}
                with <code className="font-mono">tx_hash</code> and the returned{' '}
                <code className="font-mono">nonce</code>
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
              total latency on the first call. Requires a pre-flight quote so the on-chain
              sender can be bound and the public-mempool sniping vector is closed.
            </p>
            <ol className="text-sm space-y-2 list-decimal list-inside text-text-secondary">
              <li>
                GET <code className="text-accent-primary font-mono">/api/premium/*</code> with
                no auth
              </li>
              <li>Receive 402 with payment instructions in headers and body</li>
              <li>
                POST <code className="text-accent-primary font-mono">/api/payment/buy-credits</code>{' '}
                with <code className="font-mono">amount_usd</code> and{' '}
                <code className="font-mono">sender_wallet</code> to bind a quote
              </li>
              <li>Send USDC on Base FROM your sender_wallet to the publisher wallet</li>
              <li>
                Retry with BOTH <code className="font-mono">X-Payment-Tx</code> and{' '}
                <code className="font-mono">X-Payment-Quote</code> (the returned memo) headers;
                receive data plus a token in{' '}
                <code className="font-mono">X-Payment-Token</code> header
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

      {/* Full premium catalog (generated from PREMIUM_CATALOG at build time) */}
      <section className="mb-10" id="full-catalog">
        <h2 className="text-2xl font-semibold text-text-primary mb-2">Full premium catalog</h2>
        <p className="text-text-secondary text-sm mb-1">
          Every payable endpoint, generated from the live catalog so this list never lags the
          API. {premiumCatalog.count} endpoints, {premiumCatalog.credit_range.min} to{' '}
          {premiumCatalog.credit_range.max} credits each. The machine-readable version is a free
          call to{' '}
          <code className="font-mono text-accent-primary">/api/meta/premium</code>.
        </p>
        <p className="text-text-muted text-xs mb-5">
          A star marks a required parameter. Every premium call settles in USDC on Base via x402
          and returns an Ed25519-signed AFTA receipt.
        </p>
        <div className="space-y-8">
          {premiumCatalogByCategory.map(([category, endpoints]) => (
            <div key={category}>
              <h3 className="text-sm font-semibold uppercase tracking-wide text-text-muted mb-3">
                {CATEGORY_LABELS[category] ?? category} ({endpoints.length})
              </h3>
              <div className="space-y-3">
                {endpoints.map(ep => (
                  <div
                    key={ep.path}
                    className="bg-bg-secondary border border-border rounded-lg px-4 py-3"
                  >
                    <div className="flex flex-wrap items-center gap-2 mb-1">
                      <code className="text-sm font-mono text-text-primary break-all">
                        {ep.path}
                      </code>
                      {ep.strict_premium && (
                        <span className="text-xs font-medium px-1.5 py-0.5 rounded text-text-muted bg-bg-tertiary">
                          strict
                        </span>
                      )}
                      <span className="text-xs font-medium px-2 py-0.5 rounded ml-auto text-accent-primary bg-accent-primary/10">
                        {ep.credits} {ep.credits === 1 ? 'credit' : 'credits'}
                      </span>
                    </div>
                    <p className="text-text-secondary text-sm">{ep.returns}</p>
                    {(ep.params.length > 0 || ep.free_sibling) && (
                      <div className="flex flex-wrap items-center gap-x-5 gap-y-1 mt-2 text-xs text-text-muted">
                        {ep.params.length > 0 && (
                          <span>
                            Params:{' '}
                            {ep.params.map((p, i) => (
                              <span key={p.name}>
                                <code className="font-mono text-text-secondary">{p.name}</code>
                                {p.required && (
                                  <span className="text-accent-amber" aria-label="required">
                                    *
                                  </span>
                                )}
                                {i < ep.params.length - 1 ? ', ' : ''}
                              </span>
                            ))}
                          </span>
                        )}
                        {ep.free_sibling && (
                          <span>
                            Free taste:{' '}
                            <code className="font-mono text-accent-green">{ep.free_sibling}</code>
                          </span>
                        )}
                      </div>
                    )}
                  </div>
                ))}
              </div>
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

      {/* Circuit breaker */}
      <section className="mb-10" id="circuit-breaker">
        <div className="bg-bg-secondary border border-border rounded-xl p-5">
          <h2 className="text-lg font-semibold text-text-primary mb-2">Circuit Breaker (Loop Protection)</h2>
          <p className="text-text-secondary text-sm mb-3">
            Two independent layers run on every premium call. Both return{' '}
            <span className="text-text-primary font-mono">HTTP 429</span> with no credits charged.
          </p>
          <ul className="text-text-secondary text-sm space-y-3 mb-3">
            <li>
              <span className="text-text-primary">Identical-request layer</span>{' '}
              (<code className="text-accent-primary font-mono">trip_kind: &quot;identical_request&quot;</code>): more
              than <span className="text-text-primary font-mono">20</span> requests with the same path and sorted
              query string from one bearer token inside a <span className="text-text-primary font-mono">60s</span>{' '}
              rolling window trips a <span className="text-text-primary font-mono">120s</span> cooldown. The error
              code is{' '}
              <code className="text-accent-primary font-mono">infinite_loop_detected</code>. Catches naive
              while-loops.
            </li>
            <li>
              <span className="text-text-primary">Burn-rate layer</span>{' '}
              (<code className="text-accent-primary font-mono">trip_kind: &quot;burn_rate&quot;</code>): more than{' '}
              <span className="text-text-primary font-mono">100</span> requests from one bearer token inside the
              same <span className="text-text-primary font-mono">60s</span> window, regardless of path or query,
              trips a <span className="text-text-primary font-mono">300s</span> cooldown. The error code is{' '}
              <code className="text-accent-primary font-mono">burn_rate_exceeded</code>. Catches loops that vary the
              URL on each call (for example, appending a random nonce parameter) and would otherwise slip past the
              identical-request layer.
            </li>
          </ul>
          <p className="text-text-muted text-sm">
            Different tokens are tracked independently, so normal high-volume traffic across multiple agents is
            unaffected. If you legitimately need more than 100 RPM on one token, split traffic across multiple
            tokens or email <code className="font-mono">contact@tensorfeed.ai</code>.
          </p>
        </div>
      </section>

      {/* Signed receipts + agent nonce */}
      <section className="mb-10" id="signed-receipts">
        <div className="bg-bg-secondary border border-border rounded-xl p-5">
          <h2 className="text-lg font-semibold text-text-primary mb-2">Signed Receipts &amp; Agent Nonce</h2>
          <p className="text-text-secondary text-sm mb-3">
            Every premium response (paid OR no-charge) carries an Ed25519-signed receipt your agent can verify
            against the public key at{' '}
            <code className="text-accent-primary font-mono">/.well-known/tensorfeed-receipt-key.json</code> with no
            shared secret. The signature covers a canonical-JSON form of the receipt fields, so any tampering with
            the body, the credit charge, or the no-charge reason invalidates the signature.
          </p>
          <p className="text-text-secondary text-sm mb-3">
            Send an optional <code className="text-accent-primary font-mono">X-Agent-Nonce</code> header with any
            premium request and the value is echoed verbatim into the signed receipt&apos;s{' '}
            <code className="text-accent-primary font-mono">agent_nonce</code> field. This binds the signature to{' '}
            <span className="text-text-primary">your specific request</span>, so a server cannot return a previously
            signed receipt from a cached identical call. The nonce is also returned in the{' '}
            <code className="text-accent-primary font-mono">X-Agent-Nonce-Echo</code> response header for log
            correlation.
          </p>
          <ul className="text-text-secondary text-sm space-y-2 mb-3">
            <li>
              Allowed characters: <code className="font-mono">[A-Za-z0-9._-]</code>. Length:{' '}
              <span className="text-text-primary font-mono">8 to 128</span> characters.
            </li>
            <li>
              Recommended: a UUIDv4 (with dashes stripped) or a base64url-encoded random 32-byte value. Generate a
              fresh nonce on every call.
            </li>
            <li>
              Receipts are versioned: <code className="font-mono">v: 2</code> includes{' '}
              <code className="font-mono">agent_nonce</code> (null when no nonce was supplied);{' '}
              <code className="font-mono">v: 1</code> receipts (issued before 2026-05-03) omit the field and verify
              under the v1 canonical form.
            </li>
          </ul>
          <p className="text-text-muted text-sm">
            Verification reference: <code className="font-mono">/api/receipt/verify</code>. The full canonical-JSON
            spec is at <code className="font-mono">/agent-fair-trade#receipts</code>.
          </p>
        </div>
      </section>

      {/* Rate limit */}
      <section className="mb-10" id="rate-limits">
        <div className="bg-bg-secondary border border-border rounded-xl p-5">
          <h2 className="text-lg font-semibold text-text-primary mb-2">Rate Limits (Free Tier)</h2>
          <p className="text-text-secondary text-sm mb-3">
            Free public endpoints (everything outside <code className="text-accent-primary font-mono">/api/premium/*</code>)
            are rate-limited to <span className="text-text-primary font-mono">120 requests per minute per IP</span>.
            Premium bearer tokens skip this limit entirely (they are gated by credits and the per-token circuit
            breaker instead).
          </p>
          <p className="text-text-secondary text-sm mb-3">
            Every response broadcasts standard headers so a well-behaved agent can pace itself without trial and
            error:
          </p>
          <ul className="text-text-secondary text-sm space-y-2 mb-3">
            <li>
              <code className="text-accent-primary font-mono">RateLimit-Limit</code> total requests allowed per
              window.
            </li>
            <li>
              <code className="text-accent-primary font-mono">RateLimit-Remaining</code> requests left in the
              current window.
            </li>
            <li>
              <code className="text-accent-primary font-mono">RateLimit-Reset</code> seconds until the window
              resets.
            </li>
          </ul>
          <p className="text-text-muted text-sm">
            Equivalent <code className="font-mono">X-RateLimit-*</code> headers are also sent for older clients.
            On a 429, <code className="font-mono">Retry-After</code> tells you exactly how long to wait.
          </p>
        </div>
      </section>

      {/* Prompt injection sanitization */}
      <section className="mb-10" id="prompt-injection-sanitization">
        <div className="bg-bg-secondary border border-border rounded-xl p-5">
          <h2 className="text-lg font-semibold text-text-primary mb-2">Prompt-Injection Sanitization</h2>
          <p className="text-text-secondary text-sm mb-3">
            Aggregated text on the agent endpoints (<code className="text-accent-primary font-mono">/api/news</code>,
            <code className="text-accent-primary font-mono">/api/agents/news</code>,{' '}
            <code className="text-accent-primary font-mono">/feed.xml</code>,{' '}
            <code className="text-accent-primary font-mono">/feed.json</code>) is scrubbed at read time before it
            reaches your agent. We strip ASCII control chars, bidi/zero-width spoofing chars, and neutralize
            role-confusion tokens like <code className="font-mono">&lt;|im_start|&gt;</code>,{' '}
            <code className="font-mono">[INST]</code>, and lines that try to fake a system or assistant turn. Title
            and snippet are also length-capped so a single feed item cannot fill your context window.
          </p>
          <p className="text-text-muted text-sm">
            URLs, source attribution, dates, and categories are passed through untouched. The endpoint advertises{' '}
            <code className="font-mono">sanitization: &quot;enabled&quot;</code> in the JSON response so you can
            verify the layer is on.
          </p>
        </div>
      </section>

      {/* Chaos engineering */}
      <section className="mb-10" id="chaos-engineering">
        <div className="bg-bg-secondary border border-border rounded-xl p-5">
          <h2 className="text-lg font-semibold text-text-primary mb-2">Chaos Engineering Headers (Free)</h2>
          <p className="text-text-secondary text-sm mb-3">
            Test your fallback logic without waiting for a real upstream incident. Both headers are free, no-auth, work
            on every endpoint, and never charge credits.
          </p>
          <ul className="text-text-secondary text-sm space-y-2 mb-3">
            <li>
              <code className="text-accent-primary font-mono">X-TensorFeed-Simulate-Error: 503</code> returns the
              requested status code (any value in 400-599) with a body that declares the response is simulated.
            </li>
            <li>
              <code className="text-accent-primary font-mono">X-TensorFeed-Simulate-Latency: 2500</code> sleeps the
              requested milliseconds before responding (capped at 10000ms).
            </li>
          </ul>
          <pre className="bg-bg-tertiary/50 border border-border rounded p-3 text-xs font-mono text-text-secondary overflow-x-auto whitespace-pre leading-relaxed">
{`curl -H "X-TensorFeed-Simulate-Error: 503" https://tensorfeed.ai/api/news
curl -H "X-TensorFeed-Simulate-Latency: 2500" https://tensorfeed.ai/api/status`}
          </pre>
          <p className="text-text-muted text-xs mt-3">
            Simulated responses include the header <code className="font-mono">X-TensorFeed-Simulated: true</code> so
            your test assertions can verify they are coming from the chaos layer and not a real outage.
          </p>
        </div>
      </section>

      {/* MCP servers (stdio + HTTP) */}
      <section className="mb-10" id="mcp-servers">
        <div className="bg-bg-secondary border border-border rounded-xl p-5">
          <h2 className="text-lg font-semibold text-text-primary mb-2">Model Context Protocol (MCP)</h2>
          <p className="text-text-secondary text-sm mb-4">
            TensorFeed ships two MCP transports for two distinct deployment shapes. The npx stdio server carries the full 24-tool set; the hosted HTTP endpoint serves a curated 33-tool subset whose premium tools are wallet-payable per call over x402, no account required.
          </p>

          <h3 className="text-sm font-semibold text-text-primary mb-2">Hosted HTTP MCP (Streamable HTTP, MCP 2024-11-05)</h3>
          <p className="text-text-secondary text-sm mb-2">
            The canonical entry for hosted-marketplace listings (Anthropic vertical agent repos, claude.ai connectors, third-party MCP catalogs).
            POST a JSON-RPC 2.0 envelope to <code className="text-accent-primary font-mono">https://mcp.tensorfeed.ai/mcp</code>;
            GET returns discovery info. CORS open for cross-origin agent fetches. A curated subset of 33 tools spanning AI news, model pricing, AI service status,
            MITRE CVE, CISA KEV, EPSS, OSV.dev, SEC EDGAR (search + submissions + ticker lookup), openFDA, EIA Open Data, USGS earthquakes, NWS weather alerts, AI papers, the agent-ecosystem opportunities scan, plus two wallet-payable premium tools: route_verdict (the signed model-routing decision) and whats_new (the full AFTA-signed morning brief).
            The legacy <code className="font-mono">https://tensorfeed.ai/api/mcp</code> path still works for backward compatibility.
          </p>
          <pre className="bg-bg-tertiary/50 border border-border rounded p-3 text-xs font-mono text-text-secondary overflow-x-auto whitespace-pre leading-relaxed mb-3">
{`# Probe + initialize
curl https://mcp.tensorfeed.ai/mcp

# Tool list
curl -X POST https://mcp.tensorfeed.ai/mcp \\
  -H 'Content-Type: application/json' \\
  -d '{"jsonrpc":"2.0","id":1,"method":"tools/list"}'

# Tool call: ticker lookup
curl -X POST https://mcp.tensorfeed.ai/mcp \\
  -H 'Content-Type: application/json' \\
  -d '{"jsonrpc":"2.0","id":2,"method":"tools/call",
       "params":{"name":"lookup_sec_company_ticker",
                 "arguments":{"ticker_or_cik":"AAPL"}}}'`}
          </pre>
          <p className="text-text-muted text-xs mb-4">
            To add as a Claude Code plugin or vertical-agent MCP entry, point the
            client&apos;s <code className="font-mono">.mcp.json</code> at the URL with{' '}
            <code className="font-mono">type: &quot;http&quot;</code>. No API key required for free tools.
          </p>

          <h3 className="text-sm font-semibold text-text-primary mb-2">Paying premium MCP tools per call (x402)</h3>
          <p className="text-text-secondary text-sm mb-2">
            Premium tools settle per call in USDC (Base or Solana, 1 credit = $0.02) with no account, no signup, and no API key.
            Three ways to pay: send the base64 x402 payment payload as an{' '}
            <code className="text-accent-primary font-mono">X-PAYMENT</code> header on the POST, put the same string in{' '}
            <code className="text-accent-primary font-mono">arguments.payment</code> if your MCP client cannot set headers,
            or keep using an <code className="font-mono">Authorization: Bearer tf_live_...</code> credits token.
            An unpaid premium call returns the canonical x402 payment requirements (the <code className="font-mono">accepts</code> array) to sign against.
          </p>
          <p className="text-text-secondary text-sm mb-2">
            x402 client wrappers that auto-pay on HTTP 402 should use the strict transport URL:{' '}
            <code className="text-accent-primary font-mono">https://mcp.tensorfeed.ai/mcp?x402=strict</code>. Unpaid premium
            calls there return a real HTTP 402 with a <code className="font-mono">PAYMENT-REQUIRED</code> header; the wrapper
            signs and retries, and the settled response carries a <code className="font-mono">PAYMENT-RESPONSE</code> header
            plus the AFTA-signed receipt in the body.
          </p>
          <pre className="bg-bg-tertiary/50 border border-border rounded p-3 text-xs font-mono text-text-secondary overflow-x-auto whitespace-pre leading-relaxed mb-3">
{`# Unpaid premium call returns payment requirements (default mode, HTTP 200)
curl -X POST https://mcp.tensorfeed.ai/mcp \\
  -H 'Content-Type: application/json' \\
  -d '{"jsonrpc":"2.0","id":3,"method":"tools/call",
       "params":{"name":"whats_new","arguments":{"days":1}}}'

# Pay in-band: retry with the signed base64 payload in arguments.payment
curl -X POST https://mcp.tensorfeed.ai/mcp \\
  -H 'Content-Type: application/json' \\
  -d '{"jsonrpc":"2.0","id":4,"method":"tools/call",
       "params":{"name":"whats_new",
                 "arguments":{"days":1,"payment":"<base64 x402 payload>"}}}'`}
          </pre>
          <p className="text-text-muted text-xs mb-4">
            No USDC? Claim free trial credits by signing a wallet message at{' '}
            <code className="font-mono">/api/payment/trial-credits</code> (no payment required), then use the bearer path.
          </p>

          <h3 className="text-sm font-semibold text-text-primary mb-2">npm stdio MCP server (client-side install)</h3>
          <p className="text-text-secondary text-sm mb-2">
            For Claude Desktop, Claude Code CLI, Cursor, Cline, and any MCP client that prefers spawning a local subprocess.
            Same tool surface, plus access to premium tools when you set the <code className="font-mono">TENSORFEED_TOKEN</code> environment variable.
          </p>
          <pre className="bg-bg-tertiary/50 border border-border rounded p-3 text-xs font-mono text-text-secondary overflow-x-auto whitespace-pre leading-relaxed mb-3">
{`# One-shot install + run (no global install needed)
npx -y @tensorfeed/mcp-server

# Or, for premium tools, set the bearer token first:
export TENSORFEED_TOKEN=tf_live_...
npx -y @tensorfeed/mcp-server`}
          </pre>
          <p className="text-text-muted text-xs">
            Buy a bearer token via <Link href="/account" className="text-accent-primary hover:underline">/account</Link>{' '}
            or programmatically via <code className="font-mono">/api/payment/buy-credits</code> +{' '}
            <code className="font-mono">/api/payment/confirm</code>. Both transports speak the same MCP spec; pick whichever matches how your agent connects.
          </p>
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

      {/* Terms summary */}
      <section className="mb-10">
        <div className="bg-bg-secondary border border-border rounded-xl p-5">
          <h2 className="text-lg font-semibold text-text-primary mb-3">Terms summary</h2>
          <ul className="text-text-secondary text-sm space-y-2">
            <li>
              <span className="text-text-primary font-medium">No-training license (17.1):</span>{' '}
              Premium API responses are licensed for inference use only. Use for training,
              fine-tuning, evaluation, or distillation of ML models is prohibited.
            </li>
            <li>
              <span className="text-text-primary font-medium">No refunds (17.5):</span> All
              credit purchases are final and non-refundable. Credits do not expire and remain
              redeemable across tensorfeed.ai and terminalfeed.io. Buy small (for example, $1
              USDC for 50 credits), calibrate, then top up as needed.
            </li>
            <li>
              <span className="text-text-primary font-medium">Best-effort, no SLA (17.6):</span>{' '}
              We aim for high uptime but offer no service guarantee. Specific premium
              endpoints may be modified or discontinued with reasonable notice.
            </li>
            <li>
              <span className="text-text-primary font-medium">Replay protection (17.4):</span>{' '}
              Each USDC tx can be used to mint credits exactly once. Re-submitting the same
              tx hash is rejected.
            </li>
            <li>
              <span className="text-text-primary font-medium">Cross-site bundle (17.8):</span>{' '}
              Bearer tokens and credits are jointly redeemable on tensorfeed.ai and
              terminalfeed.io. TensorFeed is the system of record for credit balances.
            </li>
            <li>
              <span className="text-text-primary font-medium">Sanctions and jurisdiction (17.9):</span>{' '}
              Premium API access is unavailable to OFAC-, EU-, UK-, or UN-sanctioned persons
              and to residents of comprehensively sanctioned jurisdictions (Cuba, Iran, North
              Korea, Syria, Crimea, Donetsk, Luhansk). Inbound credit-purchase transactions
              are screened against the Chainalysis public sanctions API.
            </li>
            <li>
              <span className="text-text-primary font-medium">Acceptable use (17.12):</span>{' '}
              No reselling of bearer tokens, no proxy APIs that materially reproduce the
              Premium API surface, no use of premium responses to train or evaluate competing
              models.
            </li>
            <li>
              <span className="text-text-primary font-medium">Governing law and venue:</span>{' '}
              California law, exclusive venue Los Angeles County, California.
            </li>
          </ul>
          <p className="text-text-muted text-xs mt-3">
            This is a summary, not the full agreement. Full legal terms are in the{' '}
            <Link href="/terms#premium" className="text-accent-primary hover:underline">
              Terms of Service
            </Link>
            . Premium API data practices are in the{' '}
            <Link href="/privacy#premium-api" className="text-accent-primary hover:underline">
              Privacy Policy
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
