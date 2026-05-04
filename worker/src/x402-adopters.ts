/**
 * x402 adoption tracker.
 *
 * Curated catalog of publishers, SDKs, gateway templates, and reference
 * implementations that speak the x402 HTTP-payment protocol (or a
 * compatible agent-payment shape over USDC stablecoins).
 *
 * The universe is intentionally small in 2026. We list what we can
 * verify is live, plus the canonical SDKs and references. New adopters
 * welcome; submit at github.com/RipperMercs/tensorfeed/issues with a
 * link we can verify.
 *
 * Editorial; refreshed on redeploy.
 *
 * Served at /api/x402-adopters (free, cached 600s).
 */

export type X402Status =
  | 'live'                // production endpoints accepting x402 payments today
  | 'beta'                // running but not yet GA
  | 'reference-impl'      // canonical example, not a paid product
  | 'announced'           // promised but not yet deployed
  | 'sdk'                 // a library that implements the protocol
  | 'gateway'             // a deployable template
  | 'spec';               // the standard itself

export type X402Category =
  | 'publisher'           // an API that you can call and pay for
  | 'sdk'                 // a client/server library
  | 'gateway'             // a drop-in template
  | 'reference'           // documentation / canonical examples
  | 'spec';               // the protocol document

export interface X402Adopter {
  id: string;
  name: string;
  org: string;
  category: X402Category;
  status: X402Status;
  /** Settlement networks, e.g. ['base', 'ethereum-mainnet']. */
  networks: string[];
  /** Stablecoins accepted, e.g. ['USDC']. */
  tokens: string[];
  /** x402 method names supported, e.g. ['exact'] or ['exact', 'stripe']. */
  x402Methods: string[];
  /** Production payable endpoint root, when applicable. */
  endpointUrl: string | null;
  websiteUrl: string;
  repoUrl: string | null;
  docsUrl: string | null;
  /** ISO date when we last verified the entry was accurate. */
  lastVerified: string;
  notes: string;
}

export const X402_ADOPTERS: X402Adopter[] = [
  // ── Spec / canonical references ──────────────────────────────
  {
    id: 'x402-spec',
    name: 'x402 specification',
    org: 'Coinbase + community',
    category: 'spec',
    status: 'spec',
    networks: ['chain-agnostic'],
    tokens: ['stablecoin-agnostic'],
    x402Methods: ['exact', 'stripe', 'method-agnostic'],
    endpointUrl: null,
    websiteUrl: 'https://x402.org',
    repoUrl: 'https://github.com/coinbase/x402',
    docsUrl: 'https://x402.org/docs',
    lastVerified: '2026-05-04',
    notes: 'The HTTP-status-402 protocol that revives the long-dormant "Payment Required" status code as a machine-payable handshake. Method-agnostic by design: \"exact\" for direct on-chain transfers, \"stripe\" for the Stripe Link variant, future methods can be added.',
  },

  // ── Publishers (live paid endpoints) ─────────────────────────
  {
    id: 'tensorfeed',
    name: 'TensorFeed.ai',
    org: 'Pizza Robot Studios',
    category: 'publisher',
    status: 'live',
    networks: ['base'],
    tokens: ['USDC'],
    x402Methods: ['exact'],
    endpointUrl: 'https://tensorfeed.ai/api/premium',
    websiteUrl: 'https://tensorfeed.ai/developers/agent-payments',
    repoUrl: 'https://github.com/RipperMercs/tensorfeed',
    docsUrl: 'https://tensorfeed.ai/.well-known/x402.json',
    lastVerified: '2026-05-04',
    notes: 'Real-time AI-ecosystem data with 14 paid premium endpoints. AFTA-certified: code-enforced no-charge guarantees plus Ed25519-signed receipts on every paid call. End-to-end USDC loop verified on Base mainnet 2026-04-27.',
  },
  {
    id: 'terminalfeed',
    name: 'TerminalFeed.io',
    org: 'Pizza Robot Studios',
    category: 'publisher',
    status: 'live',
    networks: ['base'],
    tokens: ['USDC'],
    x402Methods: ['exact'],
    endpointUrl: 'https://terminalfeed.io/api/premium',
    websiteUrl: 'https://terminalfeed.io',
    repoUrl: null,
    docsUrl: 'https://terminalfeed.io/.well-known/x402.json',
    lastVerified: '2026-05-04',
    notes: 'Real-time data dashboard. AFTA-federated with TensorFeed: a single bearer token works on both sites via the cross-Worker validate + commit rail. Independent Ed25519 receipt keypair, shared credit ledger.',
  },

  // ── Announced / coming soon ──────────────────────────────────
  {
    id: 'stripe-link-agents',
    name: 'Stripe Link Agents',
    org: 'Stripe',
    category: 'publisher',
    status: 'announced',
    networks: ['ethereum-mainnet', 'base'],
    tokens: ['USDC'],
    x402Methods: ['stripe'],
    endpointUrl: null,
    websiteUrl: 'https://link.com/agents',
    repoUrl: null,
    docsUrl: 'https://docs.stripe.com/link/agents',
    lastVerified: '2026-05-04',
    notes: 'April 2026 announcement: Stripe Link extended to AI agents using x402 with a `stripe` method for Shared Payment Tokens. Same x402 protocol envelope, different settlement scheme. General availability rolling out across the Stripe payments platform through 2026.',
  },

  // ── SDKs ─────────────────────────────────────────────────────
  {
    id: 'coinbase-x402-sdk',
    name: '@coinbase/x402',
    org: 'Coinbase',
    category: 'sdk',
    status: 'sdk',
    networks: ['base', 'ethereum-mainnet'],
    tokens: ['USDC'],
    x402Methods: ['exact'],
    endpointUrl: null,
    websiteUrl: 'https://www.npmjs.com/package/@coinbase/x402',
    repoUrl: 'https://github.com/coinbase/x402',
    docsUrl: 'https://x402.org/docs',
    lastVerified: '2026-05-04',
    notes: 'Reference TypeScript SDK from Coinbase. Provides client + server middleware for the `exact` x402 method, plus Express/Fastify/Hono adapters. The fastest way to add x402 to an existing Node API.',
  },
  {
    id: 'tensorfeed-python-sdk',
    name: 'tensorfeed (Python)',
    org: 'Pizza Robot Studios',
    category: 'sdk',
    status: 'sdk',
    networks: ['base'],
    tokens: ['USDC'],
    x402Methods: ['exact'],
    endpointUrl: null,
    websiteUrl: 'https://pypi.org/project/tensorfeed/',
    repoUrl: 'https://github.com/RipperMercs/tensorfeed/tree/main/sdk/python',
    docsUrl: 'https://tensorfeed.ai/developers/agent-payments',
    lastVerified: '2026-05-04',
    notes: 'Python SDK with optional [web3] extra for one-call USDC sign-and-send. Targets the TensorFeed API but the payment helpers are reusable for any AFTA-compliant publisher.',
  },
  {
    id: 'tensorfeed-js-sdk',
    name: 'tensorfeed (JavaScript)',
    org: 'Pizza Robot Studios',
    category: 'sdk',
    status: 'sdk',
    networks: ['base'],
    tokens: ['USDC'],
    x402Methods: ['exact'],
    endpointUrl: null,
    websiteUrl: 'https://www.npmjs.com/package/tensorfeed',
    repoUrl: 'https://github.com/RipperMercs/tensorfeed/tree/main/sdk/javascript',
    docsUrl: 'https://tensorfeed.ai/developers/agent-payments',
    lastVerified: '2026-05-04',
    notes: 'TypeScript SDK with full coverage of free + premium endpoints and the x402 confirm flow.',
  },

  // ── Gateway templates ────────────────────────────────────────
  {
    id: 'afta-gateway',
    name: 'afta-gateway',
    org: 'Pizza Robot Studios',
    category: 'gateway',
    status: 'gateway',
    networks: ['base'],
    tokens: ['USDC'],
    x402Methods: ['exact'],
    endpointUrl: null,
    websiteUrl: 'https://github.com/RipperMercs/afta-gateway',
    repoUrl: 'https://github.com/RipperMercs/afta-gateway',
    docsUrl: 'https://tensorfeed.ai/agent-fair-trade',
    lastVerified: '2026-05-04',
    notes: 'Drop-in Cloudflare Worker template. Wraps any HTTP API in AFTA primitives: USDC verification, bearer-token credits, Ed25519-signed receipts, code-enforced no-charge ledger. MIT, no protocol fee, no signup. Fork, set 3 secrets, deploy.',
  },

  // ── Reference implementations ─────────────────────────────────
  {
    id: 'tensorfeed-mcp',
    name: 'tensorfeed-mcp (MCP server)',
    org: 'Pizza Robot Studios',
    category: 'reference',
    status: 'live',
    networks: ['base'],
    tokens: ['USDC'],
    x402Methods: ['exact'],
    endpointUrl: null,
    websiteUrl: 'https://github.com/RipperMercs/tensorfeed-mcp',
    repoUrl: 'https://github.com/RipperMercs/tensorfeed-mcp',
    docsUrl: 'https://registry.modelcontextprotocol.io/v0/servers/ai.tensorfeed/mcp-server',
    lastVerified: '2026-05-04',
    notes: 'MCP server that consumes a TensorFeed bearer token (paid via USDC on Base) and exposes 14 paid tools to any MCP client (Claude Desktop, Claude Code, Cursor, Cline, etc). Reference example of how an MCP server can wrap an x402 publisher.',
  },
];

export const X402_ADOPTERS_LAST_UPDATED = '2026-05-04';
