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

const PAYMENT_WALLET = '0x549c82e6bfc54bdae9a2073744cbc2af5d1fc6d1';
const USDC_BASE_CONTRACT = '0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913';

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
    path: '/api/premium/clean/fda/{category}',
    description:
      'LLM-ready OpenFDA query results. Same five categories as the free /api/health/fda/{category} (drug/events, drug/labels, drug/recalls, food/recalls, device/events) with per-category flat schemas. Drug events flatten patient demo + drugs + reactions + outcomes + seriousness flags. Drug labels surface brand/generic/manufacturer + section text. Recalls expose classification + reason + voluntary flag. Device events extract primary device + outcomes + truncated narrative. License: CC0 1.0 Universal Dedication.',
    cost: '1 credit per call',
    example: `// GET /api/premium/clean/fda/drug/events?search=patient.drug.medicinalproduct:aspirin&limit=2
{
  "ok": true,
  "source_format": "openfda_v1",
  "target_format": "tensorfeed_llm_ready_v1",
  "schema_version": "1.0",
  "cleaning_version": "1.0",
  "data": {
    "category": "drug/events",
    "upstream_total": 609465,
    "count": 2,
    "results": [
      {
        "id": "10003304",
        "country": "US",
        "received_at": "2014-03-12",
        "serious": true,
        "seriousness_flags": ["hospitalization"],
        "patient_age": 65,
        "patient_sex": "female",
        "drugs": ["ASPIRIN"],
        "reactions": ["NAUSEA", "HEADACHE"],
        "primary_drug": "ASPIRIN",
        "primary_reaction": "NAUSEA",
        "drug_count": 1,
        "reaction_count": 2
      }
    ]
  },
  "billing": { "credits_charged": 1, "credits_remaining": 33 }
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
      "Agent morning brief: pricing changes, new/removed models, status incidents, and top news headlines from the last 1-7 days. The single endpoint to call when an agent boots up.",
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
    path: '/api/premium/compare/models',
    description:
      'Side-by-side comparison of 2-5 AI models. Each entry returns pricing, benchmarks (normalized to a union of keys with null for missing scores so downstream code never crashes on undefined), provider live status, capabilities, context window, and recent news. Plus rankings: cheapest blended, most context, and a per-benchmark leaderboard.',
    cost: '1 credit per call',
    example: `// Query: ?ids=opus-4-7,gpt-5-5,gemini-3
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
            tokens or email <code className="font-mono">evan@tensorfeed.ai</code>.
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
            TensorFeed ships two MCP transports for two distinct deployment shapes. Same tool surface, different connection model.
          </p>

          <h3 className="text-sm font-semibold text-text-primary mb-2">Hosted HTTP MCP (Streamable HTTP, MCP 2024-11-05)</h3>
          <p className="text-text-secondary text-sm mb-2">
            The canonical entry for hosted-marketplace listings (Anthropic vertical agent repos, claude.ai connectors, third-party MCP catalogs).
            POST a JSON-RPC 2.0 envelope to <code className="text-accent-primary font-mono">https://tensorfeed.ai/api/mcp</code>;
            GET returns discovery info. CORS open for cross-origin agent fetches. 12 tools in V1 spanning AI news, model pricing, AI service status,
            MITRE CVE, CISA KEV, EPSS, OSV.dev, SEC EDGAR (search + submissions + ticker lookup), and EIA Open Data.
          </p>
          <pre className="bg-bg-tertiary/50 border border-border rounded p-3 text-xs font-mono text-text-secondary overflow-x-auto whitespace-pre leading-relaxed mb-3">
{`# Probe + initialize
curl https://tensorfeed.ai/api/mcp

# Tool list
curl -X POST https://tensorfeed.ai/api/mcp \\
  -H 'Content-Type: application/json' \\
  -d '{"jsonrpc":"2.0","id":1,"method":"tools/list"}'

# Tool call: ticker lookup
curl -X POST https://tensorfeed.ai/api/mcp \\
  -H 'Content-Type: application/json' \\
  -d '{"jsonrpc":"2.0","id":2,"method":"tools/call",
       "params":{"name":"lookup_sec_company_ticker",
                 "arguments":{"ticker_or_cik":"AAPL"}}}'`}
          </pre>
          <p className="text-text-muted text-xs mb-4">
            To add as a Claude Code plugin or vertical-agent MCP entry, point the
            client&apos;s <code className="font-mono">.mcp.json</code> at the URL with{' '}
            <code className="font-mono">type: &quot;http&quot;</code>. No API key required for V1 free tools.
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
