import { Metadata } from 'next';
import Link from 'next/link';
import { Wrench, Mail, ArrowRight, Calendar, Zap, Cloud } from 'lucide-react';
import { BreadcrumbListJsonLd } from '@/components/seo/JsonLd';

// Source of truth: worker/src/professional-services.ts. Live JSON at
// /api/services.

export const metadata: Metadata = {
  title: 'Professional Services: x402, AFTA, and Agent Payments Implementation',
  description:
    'Paid implementation engagements: x402 Implementation Sprint, AFTA Co-Design Session, Agent Payments Office Hours, AgentCore Payments Integration. TensorFeed runs the same code we ship to customers. Pay in USDC on Base.',
  alternates: { canonical: 'https://tensorfeed.ai/services' },
  openGraph: {
    type: 'website',
    url: 'https://tensorfeed.ai/services',
    title: 'TensorFeed Professional Services',
    description:
      'x402 + AFTA + agent-payments implementation. Same code we run, available as a paid engagement.',
    siteName: 'TensorFeed.ai',
    images: [{ url: '/tensorfeed-logo.png', width: 1024, height: 1024 }],
  },
  twitter: {
    card: 'summary',
    title: 'TensorFeed Professional Services',
    description: 'Paid x402, AFTA, AgentCore Payments engagements. USDC on Base.',
  },
};

const OFFERINGS = [
  {
    id: 'x402_implementation_sprint',
    icon: Zap,
    name: 'x402 Implementation Sprint',
    priceBand: '$4.5k to $9.5k',
    duration: '1-2 weeks',
    engagement: 'Fixed-fee',
    audience: 'API publishers (10 to 1M monthly calls) who want to accept x402-native agent payments',
    description:
      'Add canonical Coinbase x402 V2 to your existing HTTP API. End-to-end: 402 response shape, EIP-3009 verification, broadcaster wallet, AFTA-style signed receipts, /.well-known/x402 manifest.',
    deliverables: [
      'Canonical /.well-known/x402.json with per-network domain hints (extra.name)',
      'Worker (or equivalent) middleware handling X-PAYMENT requests',
      'EIP-3009 signature verification against the correct USDC domain (mainnet vs Sepolia)',
      'Broadcaster wallet setup, funding model, monitoring',
      'AFTA-style signed-receipt issuance on every paid response',
      'PR against your repo with full description and test coverage',
      '30-day post-merge debugging session included',
    ],
    whyTf:
      'TensorFeed runs its own canonical x402 V2 facilitator on Base mainnet. First-party experience with the exact-domain footgun (USDC.name is "USD Coin" on mainnet, "USDC" on Sepolia) and the gas-only broadcaster pattern. We ship the same code we run.',
  },
  {
    id: 'afta_codesign_session',
    icon: Wrench,
    name: 'AFTA Co-Design Session',
    priceBand: '$1.5k to $3.5k',
    duration: '4-8 hours over 1-3 days',
    engagement: 'Fixed-fee',
    audience: 'API publishers that want the AFTA badge for credibility with agent operators',
    description:
      'Get your /.well-known/agent-fair-trade.json + signed-receipt key spec to AFTA-Certified eligibility (6/6 on /api/afta-certify/check) in a single working session.',
    deliverables: [
      'Live walkthrough of your existing manifest + receipt key publication',
      'Concrete edits to bring your manifest to 6/6 on the self-check',
      'Drafted no_charge_guarantees with code-pointer attestations',
      'Optional: receipt-signing key generation + canonical-form selection',
      'Follow-up self-check pass before we close the engagement',
    ],
    whyTf:
      'AFTA was designed and originally implemented at TensorFeed. We wrote the standard, the schema, and the certification check.',
  },
  {
    id: 'agent_payments_office_hours',
    icon: Calendar,
    name: 'Agent Payments Office Hours',
    priceBand: '$2.5k to $4.5k / month',
    duration: 'Monthly retainer',
    engagement: 'Retainer',
    audience: 'Engineering teams shipping agent-payment infrastructure',
    description:
      'Recurring 90-minute monthly working session on your team\'s x402/AFTA/agent-payments implementation. Drop in with current questions, leave with clear next steps.',
    deliverables: [
      '90-min live session per month, recorded for your team',
      'Async access to a shared channel between sessions (response within 1 business day)',
      'Quarterly written brief on agent-payment ecosystem changes relevant to your stack',
      'Cancel anytime with 30 days notice',
    ],
    whyTf:
      'TF tracks agent-payment ecosystem changes daily as part of its product surface. A level of effort below a full-time hire and a meaningful step up from a one-off consultation.',
  },
  {
    id: 'agentcore_payments_integration',
    icon: Cloud,
    name: 'AgentCore Payments Integration',
    priceBand: '$6.5k to $14k',
    duration: '2-3 weeks',
    engagement: 'Fixed-fee',
    audience: 'Teams building AI agents on AWS Bedrock AgentCore',
    description:
      'Wire your AgentCore agents to pay third-party x402 endpoints (including TensorFeed) for live data, model inference, and tooling. Includes wallet provisioning, policy-based spending controls, and audit trail review.',
    deliverables: [
      'AgentCore Payments wallet provisioning with appropriate spend caps and policies',
      'PaymentSession setup wired to your agent\'s task structure',
      'Reference integration against TensorFeed premium endpoints (proves the loop end-to-end)',
      'Two additional third-party x402 publisher integrations of your choosing',
      'Compliance and audit-trail review (per-PaymentSession spend governance, CloudWatch span review)',
    ],
    whyTf:
      'AgentCore Payments launched 2026-05-07 with native x402 support. TensorFeed shipped a fully canonical x402 V2 facilitator the same evening (tx 0xe20c57d8aa6df...bd67) and is one of the first AgentCore-compatible publishers in production.',
  },
];

const BREADCRUMBS = [
  { name: 'Home', url: 'https://tensorfeed.ai' },
  { name: 'Services', url: 'https://tensorfeed.ai/services' },
];

export default function ServicesPage() {
  return (
    <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <BreadcrumbListJsonLd items={BREADCRUMBS} />

      <header className="mb-10">
        <div className="flex items-center gap-3 mb-3">
          <div className="p-2 rounded-lg bg-accent-primary/10">
            <Wrench className="w-7 h-7 text-accent-primary" />
          </div>
          <h1 className="text-3xl sm:text-4xl font-bold text-text-primary">
            Professional Services
          </h1>
        </div>
        <p className="text-text-secondary text-lg max-w-3xl leading-relaxed">
          Paid engagements for x402, AFTA, and agent-payments implementation. TensorFeed
          runs the same canonical Coinbase x402 V2 facilitator and AFTA infrastructure
          we ship to customers; the engagements below are how that work transfers to your
          team.
        </p>
        <div className="mt-5 flex flex-wrap items-center gap-2 text-sm">
          <Link
            href="/api/services"
            className="px-3 py-1.5 rounded bg-bg-tertiary text-accent-primary hover:underline font-mono"
          >
            /api/services
          </Link>
          <Link
            href="/x402"
            className="px-3 py-1.5 rounded bg-bg-tertiary text-accent-primary hover:underline"
          >
            x402 hub
          </Link>
          <Link
            href="/agent-fair-trade"
            className="px-3 py-1.5 rounded bg-bg-tertiary text-accent-primary hover:underline"
          >
            AFTA standard
          </Link>
        </div>
      </header>

      <section className="grid gap-6 mb-10">
        {OFFERINGS.map(o => (
          <div
            key={o.id}
            className="bg-bg-secondary border border-border rounded-lg p-6"
          >
            <div className="flex items-start gap-4 mb-3">
              <div className="p-2 rounded-lg bg-accent-primary/10 shrink-0">
                <o.icon className="w-5 h-5 text-accent-primary" />
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-baseline justify-between gap-3 flex-wrap mb-1">
                  <h2 className="text-xl font-semibold text-text-primary">{o.name}</h2>
                  <div className="text-sm text-text-muted font-mono shrink-0">
                    {o.priceBand}
                  </div>
                </div>
                <div className="flex flex-wrap items-center gap-3 text-xs text-text-muted font-mono uppercase tracking-wide">
                  <span>{o.engagement}</span>
                  <span>·</span>
                  <span>{o.duration}</span>
                </div>
              </div>
            </div>

            <p className="text-text-secondary leading-relaxed mb-4">{o.description}</p>

            <div className="text-xs font-mono uppercase tracking-wide text-text-muted mb-2">
              Audience
            </div>
            <p className="text-sm text-text-secondary mb-4">{o.audience}</p>

            <div className="text-xs font-mono uppercase tracking-wide text-text-muted mb-2">
              Deliverables
            </div>
            <ul className="space-y-1 mb-4">
              {o.deliverables.map((d, i) => (
                <li key={i} className="text-sm text-text-secondary leading-relaxed">
                  &middot; {d}
                </li>
              ))}
            </ul>

            <div className="text-xs font-mono uppercase tracking-wide text-text-muted mb-2">
              Why TensorFeed
            </div>
            <p className="text-sm text-text-secondary leading-relaxed">{o.whyTf}</p>
          </div>
        ))}
      </section>

      <section className="bg-gradient-to-br from-accent-primary/10 to-accent-primary/5 border border-accent-primary/20 rounded-xl p-6 mb-8">
        <h2 className="text-xl font-semibold text-text-primary mb-2">Engagement</h2>
        <p className="text-text-secondary leading-relaxed mb-4">
          Price bands are starting points. Engagements are scoped against your actual stack
          on intake. Email{' '}
          <a
            href="mailto:contact@tensorfeed.ai"
            className="text-accent-primary hover:underline"
          >
            contact@tensorfeed.ai
          </a>{' '}
          with the offering id and a paragraph describing your situation; we confirm scope
          and pricing before any commitment.
        </p>
        <div className="text-xs font-mono uppercase tracking-wide text-text-muted mb-2">
          Payment accepted
        </div>
        <ul className="space-y-1 text-sm text-text-secondary">
          <li>USDC on Base (default, lowest friction, no platform fees, instant settlement)</li>
          <li>USDC over x402 (we accept our own rail)</li>
          <li>USDC direct from any wallet (Coinbase, MetaMask, etc.)</li>
          <li>Wire transfer for engagements over $10k</li>
        </ul>
        <Link
          href="mailto:contact@tensorfeed.ai?subject=Services%20inquiry"
          className="inline-flex items-center gap-2 mt-5 px-4 py-2 rounded bg-accent-primary text-white hover:bg-accent-primary/90 text-sm font-medium"
        >
          <Mail className="w-4 h-4" />
          Email to start a conversation
        </Link>
      </section>
    </div>
  );
}
