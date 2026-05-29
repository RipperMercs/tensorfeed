import { Metadata } from 'next';
import Link from 'next/link';
import { Crown, Mail, ArrowRight, Infinity as InfinityIcon, Check, X } from 'lucide-react';
import { BreadcrumbListJsonLd } from '@/components/seo/JsonLd';

// Source of truth: worker/src/mcp-pro-tier.ts. Live JSON at
// /api/mcp/pro-tier.

export const metadata: Metadata = {
  title: 'MCP Pro Tier: Unlimited TensorFeed Premium via MCP Server',
  description:
    'Monthly subscription token that grants unlimited TensorFeed premium API calls when used through the TensorFeed MCP server. $25 USDC per month, designed for Claude Desktop, Cline, and other MCP-capable agent environments. Predictable cost instead of per-call credit accounting.',
  alternates: { canonical: 'https://tensorfeed.ai/mcp/pro' },
  openGraph: {
    type: 'website',
    url: 'https://tensorfeed.ai/mcp/pro',
    title: 'TensorFeed MCP Pro Tier ($25/mo unlimited)',
    description:
      'Unlimited premium API calls via the TensorFeed MCP server. Predictable monthly cost. Claude Desktop, Cline.',
    siteName: 'TensorFeed.ai',
    images: [{ url: '/tensorfeed-logo.png', width: 1024, height: 1024 }],
  },
  twitter: {
    card: 'summary',
    title: 'TensorFeed MCP Pro Tier',
    description: '$25/mo unlimited TensorFeed premium via the MCP server.',
  },
};

const INCLUDED = [
  'Unlimited calls to all premium endpoints listed in /api/payment/info via the TensorFeed MCP server',
  'AFTA-signed receipts on every paid call (same as the credits flow)',
  'Free-tier endpoints continue to be free',
  'Token rotation on request',
  'Usage observability: per-day call counts visible to the customer',
  'Cancel anytime; pro-rated refund on remaining days',
];

const NOT_INCLUDED = [
  'Direct REST API access via Authorization: Bearer (use the credits flow for that, different rate model)',
  'Bulk data exports (use /data-licensing for those)',
  'Sister-site federation calls beyond TensorFeed (TerminalFeed federation requires its own subscription)',
  'Reselling tokens or proxying the API surface (acceptable-use policy applies)',
];

const BREADCRUMBS = [
  { name: 'Home', url: 'https://tensorfeed.ai' },
  { name: 'MCP', url: 'https://tensorfeed.ai/mcp' },
  { name: 'Pro Tier', url: 'https://tensorfeed.ai/mcp/pro' },
];

export default function McpProPage() {
  return (
    <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <BreadcrumbListJsonLd items={BREADCRUMBS} />

      <header className="mb-10">
        <div className="flex items-center gap-3 mb-3">
          <div className="p-2 rounded-lg bg-accent-primary/10">
            <Crown className="w-7 h-7 text-accent-primary" />
          </div>
          <h1 className="text-3xl sm:text-4xl font-bold text-text-primary">
            MCP Pro Tier
          </h1>
        </div>
        <p className="text-text-secondary text-lg max-w-3xl leading-relaxed">
          A monthly subscription token that grants unlimited TensorFeed premium API calls
          when used through the TensorFeed MCP server. Predictable monthly cost instead of
          credit accounting per call. Designed for solo agent operators running Claude
          Desktop, Cline, or other MCP environments.
        </p>
        <div className="mt-5 flex flex-wrap items-center gap-2 text-sm">
          <Link
            href="/api/mcp/pro-tier"
            className="px-3 py-1.5 rounded bg-bg-tertiary text-accent-primary hover:underline font-mono"
          >
            /api/mcp/pro-tier
          </Link>
          <Link
            href="/mcp"
            className="px-3 py-1.5 rounded bg-bg-tertiary text-accent-primary hover:underline"
          >
            MCP hub
          </Link>
          <a
            href="https://www.npmjs.com/package/@tensorfeed/mcp-server"
            target="_blank"
            rel="noopener noreferrer"
            className="px-3 py-1.5 rounded bg-bg-tertiary text-accent-primary hover:underline font-mono"
          >
            @tensorfeed/mcp-server
          </a>
        </div>
      </header>

      <section className="mb-10 bg-gradient-to-br from-accent-primary/10 to-accent-primary/5 border border-accent-primary/20 rounded-xl p-6">
        <div className="flex items-baseline justify-between gap-4 mb-3 flex-wrap">
          <h2 className="text-xl font-semibold text-text-primary">Monthly subscription</h2>
          <div className="text-2xl font-bold text-accent-primary font-mono">$25 USDC / month</div>
        </div>
        <div className="flex items-center gap-2 text-sm text-text-secondary mb-3">
          <InfinityIcon className="w-4 h-4 text-accent-primary" />
          Unlimited premium calls via the TF MCP server
        </div>
        <p className="text-text-secondary leading-relaxed mb-4 text-sm">
          Pay $25 USDC on Base; we provision a{' '}
          <code className="font-mono text-xs bg-bg-tertiary px-1.5 py-0.5 rounded">
            tf_pro_&lt;token&gt;
          </code>{' '}
          bearer token with a 30-day TTL and unlimited premium quota when used via the MCP
          server. Set <code className="font-mono text-xs bg-bg-tertiary px-1.5 py-0.5 rounded">
            TENSORFEED_TOKEN
          </code>{' '}
          to that token in your MCP server config and you&apos;re done.
        </p>
        <Link
          href="mailto:contact@tensorfeed.ai?subject=MCP%20Pro%20Tier"
          className="inline-flex items-center gap-2 px-3 py-1.5 rounded bg-accent-primary text-white hover:bg-accent-primary/90 text-sm font-medium"
        >
          <Mail className="w-4 h-4" />
          Email to subscribe (invite-only beta)
        </Link>
      </section>

      <section className="mb-10 grid gap-4 sm:grid-cols-2">
        <div className="bg-bg-secondary border border-border rounded-lg p-5">
          <h3 className="font-semibold text-text-primary mb-3 flex items-center gap-2">
            <Check className="w-5 h-5 text-accent-primary" />
            Included
          </h3>
          <ul className="space-y-2">
            {INCLUDED.map((item, i) => (
              <li key={i} className="text-sm text-text-secondary leading-relaxed flex gap-2">
                <span className="text-accent-primary shrink-0 mt-0.5">&middot;</span>
                <span>{item}</span>
              </li>
            ))}
          </ul>
        </div>
        <div className="bg-bg-secondary border border-border rounded-lg p-5">
          <h3 className="font-semibold text-text-primary mb-3 flex items-center gap-2">
            <X className="w-5 h-5 text-text-muted" />
            Not included
          </h3>
          <ul className="space-y-2">
            {NOT_INCLUDED.map((item, i) => (
              <li key={i} className="text-sm text-text-secondary leading-relaxed flex gap-2">
                <span className="text-text-muted shrink-0 mt-0.5">&middot;</span>
                <span>{item}</span>
              </li>
            ))}
          </ul>
        </div>
      </section>

      <section className="mb-10">
        <h2 className="text-2xl font-semibold text-text-primary mb-4">Process</h2>
        <ol className="space-y-3 max-w-3xl">
          {[
            <span key="1">
              Email{' '}
              <a
                href="mailto:contact@tensorfeed.ai?subject=MCP%20Pro%20Tier"
                className="text-accent-primary hover:underline"
              >
                contact@tensorfeed.ai
              </a>{' '}
              with subject &quot;MCP Pro Tier&quot; and your sender wallet address. We
              confirm fit and reply with payment instructions.
            </span>,
            <span key="2">
              Pay $25 USDC on Base to the published TF payment wallet. Cross-check the
              address at{' '}
              <Link href="/api/payment/info" className="text-accent-primary hover:underline font-mono">
                /api/payment/info
              </Link>
              ,{' '}
              <Link href="/llms.txt" className="text-accent-primary hover:underline font-mono">
                /llms.txt
              </Link>
              , and{' '}
              <Link href="/.well-known/x402.json" className="text-accent-primary hover:underline font-mono">
                /.well-known/x402.json
              </Link>{' '}
              before sending. If any disagree, do not send.
            </span>,
            <span key="3">
              On confirmed payment we provision a{' '}
              <code className="font-mono text-sm bg-bg-tertiary px-1.5 py-0.5 rounded">
                tf_pro_&lt;token&gt;
              </code>{' '}
              with 30-day TTL.
            </span>,
            <span key="4">
              Set <code className="font-mono text-sm bg-bg-tertiary px-1.5 py-0.5 rounded">
                TENSORFEED_TOKEN
              </code>{' '}
              to the issued token in your MCP server config. Calls flow as before; no
              per-call credit deduction.
            </span>,
          ].map((step, i) => (
            <li key={i} className="flex gap-3 text-text-secondary leading-relaxed">
              <span className="font-mono text-accent-primary shrink-0">{i + 1}.</span>
              {step}
            </li>
          ))}
        </ol>
      </section>

      <section className="bg-bg-secondary border border-border rounded-lg p-5 mb-8">
        <h3 className="font-semibold text-text-primary mb-2">Status: invite-only beta</h3>
        <p className="text-sm text-text-secondary leading-relaxed">
          Fulfillment is manual for v1: we provision tokens by email. Auto-purchase flow
          with recurring renewal via signed authorizations is queued for v2 once we have a
          steady invite-only customer base. Pricing is locked for early subscribers.
        </p>
      </section>

      <section className="text-sm text-text-muted">
        <Link
          href="/pricing/packs"
          className="inline-flex items-center gap-1.5 text-accent-primary hover:underline"
        >
          Prefer pay-per-call? See the packs at /pricing/packs{' '}
          <ArrowRight className="w-4 h-4" />
        </Link>
      </section>
    </div>
  );
}
