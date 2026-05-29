import { Metadata } from 'next';
import Link from 'next/link';
import { ArrowLeft, Clock, Coins } from 'lucide-react';
import { ArticleJsonLd } from '@/components/seo/JsonLd';
import ShareBar from '@/components/originals/ShareBar';
import ArticleHero from '@/components/originals/ArticleHero';

export const metadata: Metadata = {
  title: 'Coinbase Put Tavily Search on x402. The Pay Rail Shipped; the Discovery Rail Did Not.',
  description:
    "Coinbase and Tavily brought agentic web search to x402: an agent pays per request from a Base wallet, no API key. The payment rail works cleanly, $0.01 an advanced search in USDC. But probe the service and the discovery rail is missing: no published manifest, no catalog entry, no agent card. The pay layer of agentic commerce is converging fast; the discover layer is fragmenting, and that gap is the real story under the launch.",
  openGraph: {
    title: 'Coinbase Put Tavily Search on x402. The Pay Rail Shipped; the Discovery Rail Did Not.',
    description:
      'Tavily search is live on x402 at $0.01 a request, no API key. The payment works. The discovery layer that lets an agent find it autonomously does not exist yet. That gap is the story.',
    type: 'article',
    publishedTime: '2026-05-29T13:00:00Z',
    authors: ['Marcus Chen'],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Coinbase Put Tavily Search on x402. The Pay Rail Shipped; the Discovery Rail Did Not.',
    description:
      'Agentic pay-per-search is live and clean. Autonomous discovery of it is not. The x402 payment layer is racing ahead of the discovery layer.',
  },
};

export default function TavilyX402DiscoveryGapPage() {
  return (
    <article className="max-w-3xl mx-auto px-4 sm:px-6 py-10">
      <ArticleJsonLd
        title="Coinbase Put Tavily Search on x402. The Pay Rail Shipped; the Discovery Rail Did Not."
        description="Coinbase and Tavily launched pay-per-request agentic web search on x402 (Base USDC, no API key). The payment rail is clean, but the discovery rail (manifest, catalog, agent card) is absent. The x402 payment layer is converging while the discovery layer fragments."
        datePublished="2026-05-29"
        author="Marcus Chen"
      />

      <Link
        href="/originals"
        className="inline-flex items-center gap-1.5 text-sm text-text-muted hover:text-accent-primary transition-colors mb-8"
      >
        <ArrowLeft className="w-4 h-4" />
        Back to Originals
      </Link>

      <header className="mb-10">
        <h1 className="text-3xl sm:text-4xl font-bold text-text-primary mb-4 leading-tight">
          Coinbase Put Tavily Search on x402. The Pay Rail Shipped; the Discovery Rail Did Not.
        </h1>
        <div className="flex items-center gap-3 text-sm text-text-muted">
          <span className="text-text-secondary font-medium">Marcus Chen</span>
          <span>&middot;</span>
          <time dateTime="2026-05-29">May 29, 2026</time>
          <span>&middot;</span>
          <span className="flex items-center gap-1">
            <Clock className="w-3.5 h-3.5" />
            6 min read
          </span>
        </div>
      </header>

      <ShareBar
        path="/originals/tavily-x402-search-discovery-layer-gap"
        title="Coinbase Put Tavily Search on x402. The Pay Rail Shipped; the Discovery Rail Did Not."
      />

      <ArticleHero
        mode="graphic"
        icon={Coins}
        gradientFrom="#0052ff"
        gradientTo="#001a4d"
        eyebrow="AGENT PAYMENTS"
      />

      <div className="prose-custom space-y-6 text-text-secondary leading-relaxed">
        <p className="text-lg text-text-primary leading-relaxed">
          Coinbase and Tavily announced this week that Tavily web search is live on x402, the open
          protocol for pay-per-request agentic payments. The pitch is the one the whole agent
          ecosystem has been waiting on: an AI agent discovers a service at runtime, pays for it from
          a Base wallet with no API key and no signup, and gets the result. Tavily is a sensible
          flagship for it. Its search API is wired into a large share of the agent stacks built in
          the last two years, so a credible web-search provider going pay-per-call on a public
          stablecoin rail is a real marker of where this is heading.
        </p>

        <p>
          I spent twenty minutes with the live service instead of the announcement, because the
          interesting questions about agentic commerce are not in the press copy. They are in what an
          autonomous agent actually encounters when it tries to use the thing. Two findings. The
          payment rail is clean and works exactly as advertised. The discovery rail, the part that is
          supposed to let an agent find and evaluate the service before it pays, is not there yet.
          That gap is the story.
        </p>

        <h2 className="text-2xl font-semibold text-text-primary pt-4">The pay rail works, and it is cheap</h2>

        <p>
          Send an unpaid request to the search endpoint and you get back a textbook x402 challenge:
          a 402 status, the canonical payment requirements, the exact scheme, Base mainnet as the
          network, USDC as the asset, and a per-call price. Advanced search runs $0.01 a request.
          That is the number worth sitting with. A penny a search, settled in USDC on Base, with the
          buyer signing an off-chain authorization and no card, no key, no account. For an agent that
          fires a few hundred searches assembling one answer, that is a few dollars, billed exactly,
          to the request, with no subscription to amortize and no human in the loop.
        </p>

        <p>
          This is the part of the agentic-commerce thesis that is now plainly real. The economics
          that broke against card networks and SaaS seats work here, because the protocol does not
          carry their fixed costs. A penny-per-call web search is not a demo. It is a price an agent
          can actually pay at scale, and a credible vendor just put one in production. The payment
          layer of this market has converged: the 402 envelope, the EIP-3009 signed authorization,
          the Base settlement. A buyer SDK that handles one x402 endpoint handles this one.
        </p>

        <h2 className="text-2xl font-semibold text-text-primary pt-4">The discovery rail did not ship</h2>

        <p>
          Now try to do the other half of the promise, the part where an agent finds the service on
          its own. This is where it falls down. The conventional places an agent or a crawler looks
          to discover an x402 service and read its terms before paying are all empty. There is no
          published payment manifest at the well-known path the ecosystem standardized on. There is
          no catalog or discovery listing on the service itself. There is no agent card. The service
          root returns a bare health check that says, in effect, the payment service is up, and
          nothing about what it sells, what parameters it takes, or what a result looks like.
        </p>

        <p>
          So the only way an agent learns this endpoint exists, learns its path, its price, and its
          input shape, is by reading the Tavily announcement or its human documentation. That means a
          person has to put it in front of the agent. The launch solved how an agent pays. It did not
          solve how an agent finds. And finding is the harder, less glamorous half. Paying is a
          settled protocol problem. Discovery is a standards-and-incentives problem, and it is not
          converging at the same speed.
        </p>

        <h2 className="text-2xl font-semibold text-text-primary pt-4">Why the gap is structural, not a Tavily oversight</h2>

        <p>
          This is not a knock on Tavily. They shipped a working pay rail on a tight timeline, which
          is the hard engineering. The gap belongs to the ecosystem. The x402 effort produced a clean,
          widely-implemented standard for the payment exchange, the 402 challenge and the signed
          settlement. It did not produce one equally-adopted standard for discovery. There are at
          least three competing answers in the wild: the well-known payment manifest, the hosted
          marketplace catalog, and the agent-card pattern borrowed from the agent-to-agent world.
          Publishers pick one, or none, or roll their own. A launch can be fully payment-compliant
          and completely invisible to an autonomous crawler at the same time, which is exactly what
          happened here.
        </p>

        <p>
          That matters because the headline vision, the one in every x402 announcement including this
          one, is agents discovering and paying for services with no human involved. You cannot get
          there on a payment standard alone. If every service exposes its price and parameters
          differently, or only in prose a human has to read, then a human stays in the loop wiring
          each integration, and the autonomy is capped at the discovery step no matter how good the
          payments are. The pay rail is necessary. It is not sufficient.
        </p>

        <h2 className="text-2xl font-semibold text-text-primary pt-4">Our take</h2>

        <p>
          The right read on this launch is bullish on the thesis and impatient with the plumbing. A
          top-tier search provider pricing autonomous access at a penny a call, settled on-chain with
          no key, is a genuine signal that pay-per-request is crossing from protocol demos into the
          services agents actually use. The capital and the credible vendors are arriving. What is
          lagging is the boring layer that makes the autonomy real: a discovery surface an agent can
          parse without a human, carrying the price, the parameters, and the terms in a machine-first
          shape.
        </p>

        <p>
          Three signposts over the next ninety days. Whether Tavily and the next wave of x402
          launches backfill a machine-readable discovery surface, or keep treating discovery as a
          docs-and-announcement problem. Whether one discovery convention starts to win, the way the
          payment envelope already did, or the field stays split across manifest, catalog, and agent
          card. And whether the marketplaces that index these services can keep up with publishers
          who ship pay rails without discovery rails, because an x402 endpoint that no crawler can
          find is, to the billion agents the announcements keep invoking, the same as an endpoint
          that does not exist. The pennies are flowing. The map is the part still being drawn.
        </p>

      </div>

      <footer className="mt-12 pt-8 border-t border-border">
        <h2 className="text-lg font-semibold text-text-primary mb-4">Related</h2>
        <div className="grid gap-3">
          <Link
            href="/originals/agent-commerce-fee-floor-spacex-memo"
            className="block bg-bg-secondary border border-border rounded-lg px-4 py-3 hover:border-accent-primary transition-colors"
          >
            <span className="text-text-primary text-sm">76% of AI Agent Payments Are Already Below Visa&apos;s Floor. Then Came the SpaceX Memo.</span>
          </Link>
          <Link
            href="/originals/robinhood-agentic-trading-mcp-brokerage-account"
            className="block bg-bg-secondary border border-border rounded-lg px-4 py-3 hover:border-accent-primary transition-colors"
          >
            <span className="text-text-primary text-sm">Robinhood Just Gave AI Agents a Brokerage Account. The Floor Below x402 Has a New Lane.</span>
          </Link>
          <Link
            href="/originals/google-a2a-x402-payments-extension"
            className="block bg-bg-secondary border border-border rounded-lg px-4 py-3 hover:border-accent-primary transition-colors"
          >
            <span className="text-text-primary text-sm">Google A2A x402: the Payments Extension Wiring Agent-to-Agent Commerce.</span>
          </Link>
        </div>
      </footer>

      <div className="flex flex-wrap items-center gap-4 mt-12 pt-6 border-t border-border text-sm">
        <Link
          href="/originals"
          className="inline-flex items-center gap-1.5 text-text-muted hover:text-accent-primary transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
          Back to Originals
        </Link>
        <Link href="/" className="text-text-muted hover:text-accent-primary transition-colors">
          Back to Feed
        </Link>
      </div>
    </article>
  );
}
