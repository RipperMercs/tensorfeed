/**
 * Professional services offering: paid engagements for x402, AFTA,
 * and agent-payments implementation work.
 *
 * Catalog of consulting/implementation offerings that don't fit the
 * per-call API model. Buyers contact contact@tensorfeed.ai to engage;
 * pricing is starting-point and negotiable based on scope.
 *
 * This is merchant-model (TF selling its own time/expertise) on a
 * different surface from the data API. Surfaced via /api/services
 * for machine discovery; landing page is follow-up work.
 */

export interface ServiceOffering {
  id: string;
  name: string;
  shortDescription: string;
  /** Who this engagement is for. */
  audience: string;
  /** Concrete deliverables: what the buyer gets. */
  deliverables: string[];
  /** Suggested price band in USD. Negotiable based on scope. */
  priceBand: { fromUsd: number; toUsd: number };
  /** Typical duration. */
  duration: string;
  /** Engagement model: fixed-fee, retainer, etc. */
  engagement: 'fixed-fee' | 'retainer' | 'hourly' | 'one-time';
  /** Why TF is well-positioned to deliver this. */
  whyTf: string;
}

export const SERVICE_OFFERINGS: ServiceOffering[] = [
  {
    id: 'x402_implementation_sprint',
    name: 'x402 Implementation Sprint',
    shortDescription:
      'Add canonical Coinbase x402 V2 to your existing HTTP API. End-to-end: 402 response shape, EIP-3009 verification, broadcaster wallet, AFTA-style signed receipts, /.well-known/x402 manifest.',
    audience: 'API publishers (10-1M monthly calls) who want to accept x402-native agent payments',
    deliverables: [
      'Canonical /.well-known/x402.json manifest with per-network domain hints (extra.name)',
      'Worker (or equivalent) middleware that handles X-PAYMENT requests',
      'EIP-3009 signature verification against the correct USDC domain (mainnet vs Sepolia)',
      'Broadcaster wallet setup + funding model + monitoring',
      'AFTA-style signed-receipt issuance on every paid response',
      'Pull request against your repo with full PR description and test coverage',
      'One follow-up debugging session within 30 days of merge',
    ],
    priceBand: { fromUsd: 4500, toUsd: 9500 },
    duration: '1-2 weeks elapsed time',
    engagement: 'fixed-fee',
    whyTf:
      'TensorFeed runs its own canonical x402 V2 facilitator on Base mainnet (commit fad6dfe). First-party experience with the exact-domain footgun (USDC.name is "USD Coin" on mainnet, "USDC" on Sepolia) and the gas-only broadcaster pattern. We ship the same code we run.',
  },
  {
    id: 'afta_codesign_session',
    name: 'AFTA Co-Design Session',
    shortDescription:
      'Get your /.well-known/agent-fair-trade.json + signed-receipt key spec to AFTA-Certified eligibility in a single working session.',
    audience: 'API publishers that already do x402 or are migrating, and want the AFTA badge for credibility with agent operators',
    deliverables: [
      'Live walkthrough of your existing agent-fair-trade.json + receipt key publication',
      'Concrete edits to bring your manifest to 6/6 on /api/afta-certify/check',
      'Drafted no_charge_guarantees with code-pointer attestations',
      'Optional: receipt-signing key generation + canonical-form selection',
      'Follow-up self-check pass before we close the engagement',
    ],
    priceBand: { fromUsd: 1500, toUsd: 3500 },
    duration: '4-8 hours over 1-3 days',
    engagement: 'fixed-fee',
    whyTf:
      'AFTA was designed and originally implemented at TensorFeed (April 2026). We wrote the standard, the schema, and the certification check. Anyone selling AFTA consulting is selling our work; we sell it first-party.',
  },
  {
    id: 'agent_payments_office_hours',
    name: 'Agent Payments Office Hours',
    shortDescription:
      'Recurring 90-minute monthly working session on your team\'s x402/AFTA/agent-payments implementation. Drop in with current questions, leave with clear next steps.',
    audience:
      'Engineering teams shipping agent-payment infrastructure that need a sounding board on protocol questions, security tradeoffs, or competitive landscape',
    deliverables: [
      '90-min live working session per month, recorded for your team',
      'Async access to a shared channel for between-session questions (response within 1 business day)',
      'Quarterly written brief summarizing the agent-payment ecosystem changes relevant to your stack',
      'Cancel anytime with 30 days notice',
    ],
    priceBand: { fromUsd: 2500, toUsd: 4500 },
    duration: 'monthly retainer',
    engagement: 'retainer',
    whyTf:
      'TF tracks agent-payment ecosystem changes daily as part of its product surface. We\'re a level-of-effort lower than a full-time hire and a meaningful step up from a one-off consultation.',
  },
  {
    id: 'agentcore_payments_integration',
    name: 'AgentCore Payments Integration',
    shortDescription:
      'Wire your AWS Bedrock AgentCore agents to pay third-party x402 endpoints (including TensorFeed) for live data, model inference, and tooling. Includes wallet provisioning, policy-based spending controls, and audit trail review.',
    audience:
      'Teams building AI agents on AWS Bedrock AgentCore that need to consume paid data/services without standing vendor contracts',
    deliverables: [
      'AgentCore Payments wallet provisioning with appropriate spend caps and policies',
      'PaymentSession setup wired to your agent\'s task structure',
      'Reference integration against TensorFeed\'s premium endpoints (proves the loop end-to-end)',
      'Two additional third-party x402 publisher integrations of your choosing',
      'Compliance and audit-trail review (per-PaymentSession spend governance, CloudWatch span review)',
    ],
    priceBand: { fromUsd: 6500, toUsd: 14000 },
    duration: '2-3 weeks elapsed time',
    engagement: 'fixed-fee',
    whyTf:
      'AgentCore Payments launched 2026-05-07 with native x402 support. TensorFeed shipped a fully canonical x402 V2 facilitator the same evening (tx 0xe20c57d8aa6df...bd67) and is one of the first AgentCore-compatible publishers in production.',
  },
];

export const SERVICES_LAST_UPDATED = '2026-05-08';

export function servicesPayload(): {
  ok: true;
  source: 'tensorfeed.ai';
  lastUpdated: string;
  contact: string;
  count: number;
  payment: { accepted: string[]; default: string };
  note: string;
  offerings: ServiceOffering[];
} {
  return {
    ok: true,
    source: 'tensorfeed.ai',
    lastUpdated: SERVICES_LAST_UPDATED,
    contact: 'contact@tensorfeed.ai',
    count: SERVICE_OFFERINGS.length,
    payment: {
      accepted: ['USDC on Base', 'USDC over x402', 'USDC direct (Coinbase, MetaMask, any wallet)', 'wire transfer'],
      default: 'USDC on Base: lowest friction, no platform fees, instant settlement',
    },
    note:
      'Price bands are starting points. Engagements are scoped against your actual stack on intake. Email contact@tensorfeed.ai with the offering id and a paragraph describing your situation; we confirm scope and pricing before any commitment.',
    offerings: SERVICE_OFFERINGS,
  };
}
