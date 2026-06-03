import { Metadata } from 'next';
import Link from 'next/link';
import { Package, Coins, Compass, ArrowRight, Sparkles } from 'lucide-react';
import { BreadcrumbListJsonLd } from '@/components/seo/JsonLd';

// Source of truth: worker/src/payment-packs.ts. Live JSON at
// https://tensorfeed.ai/api/payment/packs. This page mirrors the catalog
// for human-readable pricing/discovery; agents read the JSON directly.

export const metadata: Metadata = {
  title: 'Premium API Packs: Curated Credit Bundles for AI Agents',
  description:
    'Six themed credit bundles for the TensorFeed premium API. Macro, AI Routing, Research Velocity, Provider Intel, Agent Brief, and a Starter Pack. Credits are fully fungible across all premium endpoints; packs just suggest USD amounts and highlight endpoints. Pay in USDC on Base.',
  alternates: { canonical: 'https://tensorfeed.ai/pricing/packs' },
  openGraph: {
    type: 'website',
    url: 'https://tensorfeed.ai/pricing/packs',
    title: 'TensorFeed Premium API Packs',
    description:
      'Curated credit bundles for AI agents. Macro, Routing, Research, Provider Intel, Agent Brief. USDC on Base.',
    siteName: 'TensorFeed.ai',
    images: [{ url: '/tensorfeed-logo.png', width: 1024, height: 1024 }],
  },
  twitter: {
    card: 'summary',
    title: 'TensorFeed Premium API Packs',
    description: 'Themed credit bundles for AI agents. USDC on Base, fully fungible across endpoints.',
  },
};

const PACKS = [
  {
    id: 'starter',
    name: 'Starter Pack',
    suggestedUsd: 5,
    approxCredits: 275,
    useCase:
      'Just exploring TF premium endpoints. Cheapest entry point, fungible credits, includes the first-payment welcome bonus on a fresh sender wallet.',
    highlightedEndpoints: [
      '/api/premium/whats-new',
      '/api/premium/news/search',
      '/api/premium/agents/directory',
    ],
  },
  {
    id: 'ai_routing',
    name: 'AI Routing Pack',
    suggestedUsd: 20,
    approxCredits: 1100,
    useCase:
      'Agents that route LLM calls across providers and need to pick the right model on every request given budget, quality, and latency constraints.',
    highlightedEndpoints: [
      '/api/premium/routing',
      '/api/premium/compare/models',
      '/api/premium/cost/projection',
      '/api/premium/providers/{name}',
    ],
  },
  {
    id: 'macro',
    name: 'Macro Pack',
    suggestedUsd: 20,
    approxCredits: 1100,
    useCase:
      'Agents tracking macro/economic conditions, recession risk, and AI policy timelines for investment thesis, commentary, or scheduled briefings.',
    highlightedEndpoints: [
      '/api/premium/policy/timeline',
    ],
  },
  {
    id: 'research_velocity',
    name: 'Research Velocity Pack',
    suggestedUsd: 20,
    approxCredits: 1100,
    useCase:
      'Agents tracking AI research momentum: which institutions are accelerating, which Python packages are getting traction, which MCP servers are appearing.',
    highlightedEndpoints: [
      '/api/premium/research/velocity',
      '/api/premium/packages/pypi/momentum',
      '/api/premium/research/emerging-keywords',
    ],
  },
  {
    id: 'provider_intel',
    name: 'Provider Intel Pack',
    suggestedUsd: 30,
    approxCredits: 1950,
    useCase:
      'Agents doing deep AI provider analysis: pricing history, benchmark trajectories, uptime curves, measured SLA series. Bigger pack because the data is series-shaped.',
    highlightedEndpoints: [
      '/api/premium/providers/{name}',
      '/api/premium/history/pricing/series',
      '/api/premium/history/benchmarks/series',
      '/api/premium/history/status/uptime',
      '/api/premium/probe/series',
    ],
  },
  {
    id: 'agent_brief',
    name: 'Agent Brief Pack',
    suggestedUsd: 30,
    approxCredits: 1950,
    useCase:
      'Agents producing daily AI briefings: news search with relevance scoring, what\'s-new morning brief, agents directory with traffic signal. Recurring usage profile that compounds.',
    highlightedEndpoints: [
      '/api/premium/news/search',
      '/api/premium/whats-new',
      '/api/premium/agents/directory',
      '/api/premium/watches',
    ],
  },
];

const BREADCRUMBS = [
  { name: 'Home', url: 'https://tensorfeed.ai' },
  { name: 'Pricing', url: 'https://tensorfeed.ai/pricing/packs' },
  { name: 'Packs', url: 'https://tensorfeed.ai/pricing/packs' },
];

export default function PricingPacksPage() {
  return (
    <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <BreadcrumbListJsonLd items={BREADCRUMBS} />

      <header className="mb-10">
        <div className="flex items-center gap-3 mb-3">
          <div className="p-2 rounded-lg bg-accent-primary/10">
            <Package className="w-7 h-7 text-accent-primary" />
          </div>
          <h1 className="text-3xl sm:text-4xl font-bold text-text-primary">
            Premium API Packs
          </h1>
        </div>
        <p className="text-text-secondary text-lg max-w-3xl leading-relaxed">
          Curated credit bundles for the TensorFeed premium API. Each pack is a suggested
          USD amount paired with the endpoints that pack is built for. Credits are fully
          fungible across all premium endpoints; the pack is a discovery layer, not a
          scoping layer. Volume tiers (5, 30, 200 USD) apply automatically.
        </p>
        <div className="mt-5 flex flex-wrap items-center gap-2 text-sm">
          <Link
            href="/api/payment/packs"
            className="px-3 py-1.5 rounded bg-bg-tertiary text-accent-primary hover:underline font-mono"
          >
            /api/payment/packs
          </Link>
          <Link
            href="/developers/agent-payments"
            className="px-3 py-1.5 rounded bg-bg-tertiary text-accent-primary hover:underline"
          >
            payment docs
          </Link>
          <Link
            href="/x402"
            className="px-3 py-1.5 rounded bg-bg-tertiary text-accent-primary hover:underline"
          >
            x402 hub
          </Link>
        </div>
      </header>

      <section className="mb-10 bg-gradient-to-br from-accent-primary/10 to-accent-primary/5 border border-accent-primary/20 rounded-xl p-5">
        <div className="flex items-start gap-3">
          <Sparkles className="w-5 h-5 text-accent-primary shrink-0 mt-0.5" />
          <div className="text-sm text-text-secondary leading-relaxed">
            <strong className="text-text-primary">First-payment welcome bonus:</strong> 50
            bonus credits ($1 of value) on the first successful USDC payment from a new
            sender wallet, on top of the base rate. Stacks with volume tiers. Granted
            automatically; the response from <code className="font-mono">/api/payment/confirm</code>
            includes the welcome bonus when applied.
          </div>
        </div>
      </section>

      <section className="grid gap-4 sm:grid-cols-2 mb-10">
        {PACKS.map(p => (
          <div
            key={p.id}
            className="bg-bg-secondary border border-border rounded-lg p-5 flex flex-col"
          >
            <div className="flex items-baseline justify-between mb-2 gap-3">
              <h2 className="text-lg font-semibold text-text-primary">{p.name}</h2>
              <div className="text-sm text-text-muted font-mono shrink-0">
                ${p.suggestedUsd} = {p.approxCredits.toLocaleString()} credits
              </div>
            </div>
            <p className="text-sm text-text-secondary leading-relaxed mb-3">{p.useCase}</p>
            <div className="text-xs text-text-muted mb-3 font-mono uppercase tracking-wide">
              Highlighted endpoints
            </div>
            <ul className="space-y-1 mb-4 grow">
              {p.highlightedEndpoints.map(ep => (
                <li key={ep} className="text-xs font-mono text-text-secondary">
                  <Compass className="w-3 h-3 inline mr-1 text-accent-primary" />
                  {ep}
                </li>
              ))}
            </ul>
          </div>
        ))}
      </section>

      <section className="mb-10">
        <h2 className="text-2xl font-semibold text-text-primary mb-4">How to buy a pack</h2>
        <ol className="space-y-3 max-w-3xl">
          {[
            <span key="1">
              POST <code className="font-mono text-sm bg-bg-tertiary px-1.5 py-0.5 rounded">/api/payment/buy-credits</code>{' '}
              with <code className="font-mono text-sm bg-bg-tertiary px-1.5 py-0.5 rounded">{`{ amount_usd, sender_wallet }`}</code>{' '}
              (use the suggested USD amount from the pack).
            </span>,
            <span key="2">
              Send the quoted USDC amount on Base mainnet to the published payment wallet,
              referencing the returned memo.
            </span>,
            <span key="3">
              POST <code className="font-mono text-sm bg-bg-tertiary px-1.5 py-0.5 rounded">/api/payment/confirm</code>{' '}
              with <code className="font-mono text-sm bg-bg-tertiary px-1.5 py-0.5 rounded">{`{ tx_hash, nonce }`}</code>{' '}
              to mint your bearer token.
            </span>,
            <span key="4">
              Use <code className="font-mono text-sm bg-bg-tertiary px-1.5 py-0.5 rounded">Authorization: Bearer &lt;token&gt;</code>{' '}
              on premium endpoints. Credits decrement per call; the token persists across all
              premium endpoints regardless of which pack you bought.
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
        <div className="flex items-start gap-3">
          <Coins className="w-5 h-5 text-accent-primary shrink-0 mt-0.5" />
          <div className="text-sm text-text-secondary leading-relaxed">
            <strong className="text-text-primary">Why packs aren&apos;t scoped:</strong> credits
            stay fungible because most agents discover their needs over time. A research
            agent that buys the Research Velocity Pack today might want to call the routing
            endpoint tomorrow. Forcing a scope would force agents to over-buy across packs
            instead of growing organically. Packs surface the recommended starting points;
            credits flow where the agent flows.
          </div>
        </div>
      </section>

      <section className="text-sm text-text-muted">
        <Link
          href="/developers/agent-payments"
          className="inline-flex items-center gap-1.5 text-accent-primary hover:underline"
        >
          Full payment documentation <ArrowRight className="w-4 h-4" />
        </Link>
      </section>
    </div>
  );
}
