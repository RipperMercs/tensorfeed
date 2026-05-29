/**
 * MCP Pro Tier offering catalog.
 *
 * The TensorFeed MCP server (npm @tensorfeed/mcp-server) is free for
 * the free-tier endpoints today. Customers running the MCP server
 * inside Claude Desktop or similar agent environments who hit premium
 * endpoints repeatedly want a flat predictable fee instead of credit
 * accounting per call.
 *
 * MCP Pro Tier is a monthly subscription token that grants unlimited
 * premium API calls when used through the TensorFeed MCP server.
 * Pricing: $25/mo USDC. Cancel anytime (credit on remaining days).
 *
 * v1 is manual: customer emails contact@tensorfeed.ai, pays via x402
 * or USDC direct, we issue a tf_pro_<token> bearer token bound to
 * a one-month TTL. Surfaced via /api/mcp/pro-tier.
 *
 * v2 work (when demand justifies): auto-purchase flow at
 * /api/mcp/pro-tier/subscribe, recurring renewal via signed
 * authorizations, cancellation at /api/mcp/pro-tier/cancel.
 */

export interface McpProTier {
  id: string;
  name: string;
  description: string;
  monthlyUsd: number;
  /** What's included in the subscription. */
  included: string[];
  /** What's NOT included (so buyers know the boundary). */
  notIncluded: string[];
  /** Suggested customer profile. */
  audience: string;
}

export const MCP_PRO_TIER: McpProTier = {
  id: 'mcp_pro_monthly',
  name: 'MCP Pro Tier',
  description:
    'Unlimited TensorFeed premium API calls when accessed through the TensorFeed MCP server. Predictable monthly cost instead of credit accounting per call. Designed for Claude Desktop, Cline, and other MCP-capable agent environments where the agent is owned by a single human operator.',
  monthlyUsd: 25,
  included: [
    'Unlimited calls to all premium endpoints listed in /api/payment/info via the TensorFeed MCP server',
    'AFTA-signed receipts on every paid call (same as the credits flow)',
    'Free-tier endpoints continue to be free',
    'Token rotation on request',
    'Usage observability: per-day call counts visible to the customer',
    'Cancel anytime; pro-rated refund on remaining days',
  ],
  notIncluded: [
    'Direct REST API access via Authorization: Bearer (use the credits flow for that, different rate model)',
    'Bulk data exports (use /api/data-licensing for those)',
    'Sister-site federation calls beyond TensorFeed (TerminalFeed federation requires its own subscription)',
    'Reselling tokens or proxying the API surface (acceptable-use policy applies)',
  ],
  audience:
    'Solo agent operators (developers, researchers, analysts) running Claude Desktop, Cline, or other MCP environments who hit TensorFeed premium endpoints regularly and want predictable monthly cost.',
};

export const MCP_PRO_LAST_UPDATED = '2026-05-08';

export function mcpProTierPayload(): {
  ok: true;
  source: 'tensorfeed.ai';
  lastUpdated: string;
  contact: string;
  payment: { accepted: string[]; default: string };
  status: 'invite-only-beta' | 'public';
  tier: McpProTier;
  process: { step: number; description: string }[];
  pairs_with: { name: string; url: string }[];
} {
  return {
    ok: true,
    source: 'tensorfeed.ai',
    lastUpdated: MCP_PRO_LAST_UPDATED,
    contact: 'contact@tensorfeed.ai',
    payment: {
      accepted: ['USDC on Base', 'USDC over x402'],
      default: 'USDC on Base',
    },
    status: 'invite-only-beta',
    tier: MCP_PRO_TIER,
    process: [
      {
        step: 1,
        description:
          'Email contact@tensorfeed.ai with subject "MCP Pro Tier" and your sender wallet address. We confirm fit and reply with payment instructions.',
      },
      {
        step: 2,
        description:
          'Pay $25 USDC on Base to the published TF payment wallet (cross-checked at /api/payment/info, /llms.txt, /.well-known/x402.json; verify all three before sending).',
      },
      {
        step: 3,
        description:
          'On confirmed payment, we provision a tf_pro_<token> bearer token with a 30-day TTL and unlimited premium-endpoint quota when used via the TF MCP server.',
      },
      {
        step: 4,
        description:
          'Set TENSORFEED_TOKEN to the issued token in your MCP server config. Calls flow as before; no per-call deduction.',
      },
    ],
    pairs_with: [
      {
        name: 'TensorFeed MCP server (npm @tensorfeed/mcp-server)',
        url: 'https://www.npmjs.com/package/@tensorfeed/mcp-server',
      },
      {
        name: 'Claude Desktop',
        url: 'https://claude.ai/download',
      },
    ],
  };
}
