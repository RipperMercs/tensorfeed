import type { Metadata } from 'next';
import Link from 'next/link';
import {
  ArrowRight,
  Coins,
  Network,
  TrendingUp,
  Building2,
  Activity,
  Layers,
} from 'lucide-react';
import { FAQPageJsonLd } from '@/components/seo/JsonLd';

export const metadata: Metadata = {
  title:
    'Hyperliquid: The Perps Venue Where AI Agents Trade in USDC | TensorFeed',
  description:
    'Hyperliquid is the perps DEX where most AI trading agents settle USDC collateral. After Coinbase became the official treasury deployer of USDC and Circle made USDC the Aligned Quote Asset across HIP-1/2/3/4 markets, the agent trading layer is converging on the same plumbing as agent payments. What HL is, why it matters for AI agents, and how to track it from TensorFeed.',
  openGraph: {
    title:
      'Hyperliquid: The Perps Venue Where AI Agents Trade in USDC',
    description:
      'Coinbase became the official treasury deployer of USDC on Hyperliquid. Circle made USDC the Aligned Quote Asset across HIP-1/2/3/4 and is staking HYPE. Inside what this means for AI agents and how TF tracks the venue.',
    type: 'article',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Hyperliquid: The Perps Venue Where AI Agents Trade in USDC',
    description:
      'Agent payments and agent trading now share one asset, one chain, one custodian.',
  },
  alternates: {
    canonical: 'https://tensorfeed.ai/hyperliquid',
  },
};

const HIP_MARKETS = [
  {
    id: 'hip-1',
    name: 'HIP-1',
    title: 'Native fungible token standard',
    description:
      'The core token standard on Hyperliquid L1. HYPE itself plus the spot listings issued under HIP-1 use this format. Settlement asset across all HIP markets is now USDC per the May 2026 Circle alignment.',
  },
  {
    id: 'hip-2',
    name: 'HIP-2',
    title: 'Native liquidity layer',
    description:
      'Onchain market-making primitive that gives HIP-1 listings access to deep liquidity without a separate AMM. Pairs with USDC as the quote asset by default after the HIP-4 alignment.',
  },
  {
    id: 'hip-3',
    name: 'HIP-3',
    title: 'Permissionless perpetual futures',
    description:
      'Permissionless perps. Any builder can launch a new perp market on Hyperliquid L1 under HIP-3 without core-team approval. USDC is the standard collateral asset.',
  },
  {
    id: 'hip-4',
    name: 'HIP-4',
    title: 'Newest market class',
    description:
      'The most recent market class, where Circle just confirmed USDC continues as the Aligned Quote Asset. Cementing USDC as the venue-wide settlement standard rather than a per-market choice.',
  },
];

const PARTNER_POSITIONS = [
  {
    name: 'Coinbase',
    role: 'Official treasury deployer of USDC on Hyperliquid',
    detail:
      'Coinbase announced this expanded support in May 2026, alongside a significantly increased position in staked HYPE. The custodian for the rest of the dollar stack also custodies the trading-collateral side now.',
    icon: Building2,
  },
  {
    name: 'Circle',
    role: 'USDC as Aligned Quote Asset across HIP-1/2/3/4',
    detail:
      'Circle confirmed USDC as the primary collateral asset across every HIP market class, and is making a financial investment in the ecosystem through HYPE staking. Issuer and stake-holder alignment, not just listing.',
    icon: Coins,
  },
];

const FAQS = [
  {
    question: 'What is Hyperliquid?',
    answer:
      'Hyperliquid is a perpetual futures decentralized exchange running on its own Layer 1 chain (Hyperliquid L1). 100+ perps and spot assets, fully onchain order books, native HYPE token. Most AI trading agents in 2026 settle their positions on Hyperliquid because the orderbook latency and fee structure are closer to centralized exchanges than typical AMM-based DEXs.',
  },
  {
    question: 'Why does TensorFeed track Hyperliquid?',
    answer:
      'TensorFeed is the data layer for AI agents. AI agents that read pricing, news, and benchmarks from TF also trade markets, and most of that trading happens on Hyperliquid. Tracking HL operational status and ecosystem moves keeps the data layer and the execution layer in the same view.',
  },
  {
    question: 'What changed with the May 2026 Coinbase + Circle announcements?',
    answer:
      'Coinbase became the official treasury deployer of USDC on Hyperliquid and increased its stake in HYPE. Circle made USDC the Aligned Quote Asset across HIP-1, HIP-2, HIP-3, and the new HIP-4 markets, and is also staking HYPE. The largest US custodian and the largest dollar-stablecoin issuer both committed institutional capital to the same venue with USDC as the settlement asset. That converges the trading collateral side onto the same plumbing as the agent payments side (AWS AgentCore Payments, x402, TensorFeed premium).',
  },
  {
    question: 'Are there AI agents actually trading on Hyperliquid?',
    answer:
      'Yes. Public examples include autonomous LLM-driven trading bots running on dedicated infra, plus the broader long tail of quant agents that prefer onchain perps over centralized exchange APIs for verifiability and transparency. Hyperliquid does not publish an agent-vs-human breakdown of volume; that signal has to come from third parties watching the orderbook.',
  },
  {
    question: 'Is TensorFeed integrating with Hyperliquid directly?',
    answer:
      'Not as an execution venue. TF is a data layer; we point agents at the venues that fit their strategy. We do monitor operational status (see /status) so an agent calling /api/premium/whats-new or /api/premium/routing can also check whether Hyperliquid is healthy before sending an order. Direct trade routing is not a TF product and is not on the roadmap.',
  },
  {
    question: 'What is the HYPE token?',
    answer:
      'HYPE is the native token of Hyperliquid L1. It governs validator staking, fee distribution, and protocol incentives. The recent Coinbase and Circle commitments to HYPE staking are institutional alignment around the chain itself, not just an endorsement of trading on top of it.',
  },
  {
    question: 'How current is the data on this page?',
    answer:
      'Editorial. HIP descriptions and partner positions are written from public announcements (Coinbase, Circle, Hyperliquid core team) as of May 2026. Operational status is live from the /status feed which polls Hyperliquid every two minutes. If something material changes (new HIP class, partner reversal, major incident) we update the page directly and ship an /originals post.',
  },
];

export default function HyperliquidPage() {
  return (
    <main className="max-w-5xl mx-auto px-4 sm:px-6 py-10">
      <FAQPageJsonLd
        faqs={FAQS.map((f) => ({ question: f.question, answer: f.answer }))}
      />

      <header className="mb-10">
        <div className="text-xs text-text-secondary tracking-wider uppercase mb-3">
          Topic Hub · Agent Trading
        </div>
        <h1 className="text-3xl sm:text-4xl font-bold text-text-primary leading-tight mb-4">
          Hyperliquid: The Perps Venue Where AI Agents Trade in USDC
        </h1>
        <p className="text-lg text-text-secondary leading-relaxed">
          Most AI trading agents in 2026 settle their positions on Hyperliquid.
          In May 2026, Coinbase became the official treasury deployer of USDC
          on the venue and Circle made USDC the Aligned Quote Asset across
          HIP-1, HIP-2, HIP-3, and HIP-4. Coinbase and Circle both committed
          HYPE staking positions. The agent trading layer converges on the
          same plumbing as agent payments.
        </p>
      </header>

      {/* Convergence callout */}
      <section className="mb-12 rounded-lg border border-border bg-bg-secondary p-6">
        <div className="flex items-start gap-4">
          <Coins className="w-8 h-8 text-amber-400 flex-shrink-0 mt-1" />
          <div>
            <div className="text-xs text-text-secondary tracking-wider uppercase mb-2">
              The convergence
            </div>
            <p className="text-text-primary leading-relaxed">
              Agents now pay for data in USDC on Base via x402, then trade in
              USDC on Hyperliquid L1. Same dollar, same issuer, same custodian
              on the treasury side. The agentic-economy plumbing is collapsing
              into one asset and one settlement layer.{' '}
              <Link
                href="/originals/agentic-usdc-pay-and-trade-converge"
                className="text-accent-blue hover:underline"
              >
                Full analysis in our editorial.
              </Link>
            </p>
          </div>
        </div>
      </section>

      {/* Partner positions */}
      <section className="mb-12">
        <h2 className="text-2xl font-semibold text-text-primary mb-4">
          The May 2026 institutional alignment
        </h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {PARTNER_POSITIONS.map((p) => {
            const Icon = p.icon;
            return (
              <div
                key={p.name}
                className="rounded-lg border border-border bg-bg-secondary p-5"
              >
                <div className="flex items-center gap-3 mb-2">
                  <Icon className="w-5 h-5 text-text-secondary" />
                  <div className="font-semibold text-text-primary">{p.name}</div>
                </div>
                <div className="text-sm text-text-secondary mb-3">{p.role}</div>
                <p className="text-sm text-text-secondary leading-relaxed">
                  {p.detail}
                </p>
              </div>
            );
          })}
        </div>
      </section>

      {/* HIP markets */}
      <section className="mb-12">
        <h2 className="text-2xl font-semibold text-text-primary mb-4">
          The HIP market standards
        </h2>
        <p className="text-text-secondary mb-6 leading-relaxed">
          Hyperliquid Improvement Proposals (HIPs) define the venue&apos;s
          market classes. As of May 2026, USDC is the standardized settlement
          asset across all four.
        </p>
        <div className="space-y-3">
          {HIP_MARKETS.map((hip) => (
            <div
              key={hip.id}
              className="rounded-lg border border-border bg-bg-secondary p-5"
            >
              <div className="flex items-baseline gap-3 mb-2">
                <span className="font-mono text-accent-blue text-sm">
                  {hip.name}
                </span>
                <span className="font-semibold text-text-primary">
                  {hip.title}
                </span>
              </div>
              <p className="text-sm text-text-secondary leading-relaxed">
                {hip.description}
              </p>
            </div>
          ))}
        </div>
      </section>

      {/* Live status callout */}
      <section className="mb-12 rounded-lg border border-border bg-bg-secondary p-6">
        <div className="flex items-start gap-4">
          <Activity className="w-8 h-8 text-emerald-400 flex-shrink-0 mt-1" />
          <div className="flex-1">
            <h2 className="text-xl font-semibold text-text-primary mb-2">
              Live operational status
            </h2>
            <p className="text-text-secondary leading-relaxed mb-3">
              TensorFeed polls Hyperliquid&apos;s status page (Frontend,
              Hyperliquid L1, API) every two minutes alongside the major
              LLM providers. If you are running an agent that depends on
              both data and execution, check both surfaces.
            </p>
            <Link
              href="/status"
              className="inline-flex items-center gap-2 text-accent-blue hover:underline text-sm"
            >
              View live status feed
              <ArrowRight className="w-4 h-4" />
            </Link>
          </div>
        </div>
      </section>

      {/* Why TF tracks this */}
      <section className="mb-12">
        <h2 className="text-2xl font-semibold text-text-primary mb-4">
          Why TensorFeed tracks this
        </h2>
        <div className="space-y-4 text-text-secondary leading-relaxed">
          <p>
            TF is a data layer for AI agents. Most agents that pay for data
            here also trade markets somewhere, and in 2026 most of that
            trading happens onchain. The infrastructure underneath both sides
            now shares the same custodian, issuer, asset, and chain.
          </p>
          <p>
            We are not building agent execution. We are tracking the venues
            where agent execution happens, so an agent calling{' '}
            <Link href="/api/status" className="text-accent-blue hover:underline">
              /api/status
            </Link>{' '}
            sees the same operational picture across LLM providers and the
            primary onchain trading venue. Pair with{' '}
            <Link
              href="/ai-infrastructure"
              className="text-accent-blue hover:underline"
            >
              /ai-infrastructure
            </Link>{' '}
            for the physical buildout view and{' '}
            <Link
              href="/funding/portfolio"
              className="text-accent-blue hover:underline"
            >
              /funding/portfolio
            </Link>{' '}
            for the capital flowing into the same stack.
          </p>
        </div>
      </section>

      {/* FAQ */}
      <section className="mb-12">
        <h2 className="text-2xl font-semibold text-text-primary mb-4">FAQ</h2>
        <div className="space-y-5">
          {FAQS.map((f, i) => (
            <details
              key={i}
              className="rounded-lg border border-border bg-bg-secondary p-5"
            >
              <summary className="font-semibold text-text-primary cursor-pointer">
                {f.question}
              </summary>
              <p className="mt-3 text-text-secondary leading-relaxed">
                {f.answer}
              </p>
            </details>
          ))}
        </div>
      </section>

      {/* Cross-links */}
      <section className="mb-12">
        <h2 className="text-2xl font-semibold text-text-primary mb-4">
          Related
        </h2>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <Link
            href="/originals/agentic-usdc-pay-and-trade-converge"
            className="block rounded-lg border border-border bg-bg-secondary p-4 hover:border-accent-blue transition-colors"
          >
            <div className="flex items-center gap-2 mb-2">
              <Coins className="w-4 h-4 text-amber-400" />
              <div className="text-xs text-text-secondary tracking-wider uppercase">
                Editorial
              </div>
            </div>
            <div className="font-semibold text-text-primary">
              Same Dollar, Same Chain, Same Custodian
            </div>
          </Link>
          <Link
            href="/ai-infrastructure"
            className="block rounded-lg border border-border bg-bg-secondary p-4 hover:border-accent-blue transition-colors"
          >
            <div className="flex items-center gap-2 mb-2">
              <Layers className="w-4 h-4 text-text-secondary" />
              <div className="text-xs text-text-secondary tracking-wider uppercase">
                Topic hub
              </div>
            </div>
            <div className="font-semibold text-text-primary">
              AI Infrastructure
            </div>
          </Link>
          <Link
            href="/funding/portfolio"
            className="block rounded-lg border border-border bg-bg-secondary p-4 hover:border-accent-blue transition-colors"
          >
            <div className="flex items-center gap-2 mb-2">
              <TrendingUp className="w-4 h-4 text-emerald-400" />
              <div className="text-xs text-text-secondary tracking-wider uppercase">
                Capital
              </div>
            </div>
            <div className="font-semibold text-text-primary">
              Funding Portfolio
            </div>
          </Link>
        </div>
      </section>

      <footer className="mt-12 pt-8 border-t border-border text-sm text-text-secondary">
        <p>
          Editorial cadence. Updated when material structural changes land
          (new HIP class, partner reversal, major incident). Operational
          status is live from{' '}
          <Link href="/status" className="text-accent-blue hover:underline">
            /status
          </Link>
          .
        </p>
        <p className="mt-3">
          <Network className="w-4 h-4 inline mr-1" />
          <Link href="/" className="text-accent-blue hover:underline">
            Back to TensorFeed
          </Link>
        </p>
      </footer>
    </main>
  );
}
