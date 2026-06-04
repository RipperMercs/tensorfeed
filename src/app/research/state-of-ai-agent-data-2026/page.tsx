import type { Metadata } from 'next';
import Link from 'next/link';
import { ArrowLeft, FileText, BarChart3, Shield, Network } from 'lucide-react';

const TITLE =
  'State of AI Agent Data 2026: The Substrate Underneath Agent Commerce';
const DESCRIPTION =
  "AI agents are paying for things. What they pay for, what runs underneath, and what the data layer looks like a year after x402 went live. A research report from TensorFeed: AI vendor pricing, model lifecycle, service reliability, supply-chain security, and the AFTA federation. Sourced from TF's own daily-fresh data feeds.";
const PUBLISHED = '2026-05-25';
const VERSION = 'v1.0';

export const metadata: Metadata = {
  title: 'State of AI Agent Data 2026 | TensorFeed Research',
  description: DESCRIPTION,
  alternates: { canonical: 'https://tensorfeed.ai/research/state-of-ai-agent-data-2026' },
  openGraph: {
    type: 'article',
    title: TITLE,
    description: DESCRIPTION,
    url: 'https://tensorfeed.ai/research/state-of-ai-agent-data-2026',
    siteName: 'TensorFeed',
    publishedTime: PUBLISHED + 'T00:00:00Z',
    authors: ['Adrian Vale'],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'State of AI Agent Data 2026',
    description:
      "What AI agents are paying for, what runs underneath, and what the data layer looks like a year after x402 went live. From TensorFeed's daily-fresh research feeds.",
  },
};

const JSON_LD: Record<string, unknown> = {
  '@context': 'https://schema.org',
  '@type': 'TechArticle',
  headline: TITLE,
  description: DESCRIPTION,
  author: { '@type': 'Person', name: 'Adrian Vale', url: 'https://tensorfeed.ai' },
  publisher: { '@type': 'Organization', name: 'TensorFeed', url: 'https://tensorfeed.ai' },
  datePublished: PUBLISHED,
  dateModified: PUBLISHED,
  mainEntityOfPage: 'https://tensorfeed.ai/research/state-of-ai-agent-data-2026',
  inLanguage: 'en',
  keywords: [
    'AI agent data',
    'agent commerce',
    'x402',
    'AFTA',
    'AI vendor pricing',
    'AI service status',
    'AI CVEs',
    'AI research velocity',
    'model deprecations',
    'TensorFeed',
  ],
};

function StatCard({ value, label, source }: { value: string; label: string; source: string }) {
  return (
    <div className="border border-border rounded-lg p-5 bg-bg-secondary">
      <div className="font-mono text-3xl sm:text-4xl text-text-primary font-bold leading-none mb-2">
        {value}
      </div>
      <div className="text-sm text-text-secondary leading-snug mb-2">{label}</div>
      <div className="text-xs text-text-muted font-mono">{source}</div>
    </div>
  );
}

export default function StateOfAIAgentData2026Page() {
  return (
    <article
      className="max-w-3xl mx-auto px-4 sm:px-6 py-10"
      itemScope
      itemType="https://schema.org/TechArticle"
    >
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(JSON_LD) }}
      />

      {/* Back link */}
      <Link
        href="/research"
        className="inline-flex items-center gap-1.5 text-sm text-text-muted hover:text-accent-primary transition-colors mb-8"
      >
        <ArrowLeft className="w-4 h-4" />
        Back to Research
      </Link>

      {/* Header */}
      <header className="mb-10 not-prose">
        <div
          className="font-mono uppercase mb-3"
          style={{ fontSize: 11, letterSpacing: '0.16em', color: 'var(--text-muted)' }}
        >
          / Research Report {VERSION} &middot; Published {PUBLISHED}
        </div>
        <h1
          className="text-3xl sm:text-4xl lg:text-5xl font-bold text-text-primary mb-4 leading-tight"
          itemProp="headline"
        >
          State of AI Agent Data 2026
        </h1>
        <p className="text-lg sm:text-xl text-text-secondary leading-relaxed mb-6">
          The substrate underneath agent commerce. What agents are paying for, what runs
          underneath, and what changed since x402 went mainstream.
        </p>
        <div className="flex flex-wrap items-center gap-3 text-sm text-text-muted">
          <span itemProp="author" className="text-text-secondary font-medium">
            Adrian Vale @ TensorFeed.ai
          </span>
          <span>&middot;</span>
          <time itemProp="datePublished" dateTime={PUBLISHED}>
            May 25, 2026
          </time>
          <span>&middot;</span>
          <span>{VERSION}</span>
          <span>&middot;</span>
          <span>~12 min read</span>
        </div>
      </header>

      {/* Hero stats */}
      <section className="mb-12 not-prose">
        <div className="grid sm:grid-cols-2 gap-4">
          <StatCard
            value="19,434"
            label="Premium responses TF served in 28 days, each returning a signed AFTA receipt."
            source="/api/stats"
          />
          <StatCard
            value="34"
            label="TF premium endpoints piloted on CDP Bazaar, settling in USDC on Base."
            source="worker/src/bazaar-pilots.ts"
          />
          <StatCard
            value="367"
            label="AI models tracked across 50+ providers, refreshed daily."
            source="/api/openrouter/models"
          />
          <StatCard
            value="2,701"
            label="Security advisories audited in the latest AI-relevant CVE batch."
            source="/api/ai-cves/latest"
          />
        </div>
      </section>

      {/* Article body */}
      <div className="prose-custom space-y-6 text-text-secondary leading-relaxed">
        <p className="text-lg text-text-primary leading-relaxed">
          BlockRun published the State of x402 in December 2025 and effectively claimed the agent
          commerce corner of the data. Their report counted transactions, USDC volume, buyer
          wallets, and marketplace activity: 63 million transactions, $7.5 million in USDC,
          64,000 buyers, across the publishers they can see. The story of what agents are paying
          for got told in dollars.
        </p>

        <p>
          The story of what they got back did not. This report is that side. AI agents pay for
          inference, security signals, model intelligence, research feeds, capital data, and the
          handful of other surfaces that compose into useful work. The questions agents are
          actually asking before they spend the dollar are: which vendor is degraded today, which
          model just shipped a deprecation, which CVE landed in the inference stack this week,
          which institution is publishing the cutting research, which provider just announced a
          billion-dollar capex round. These are substrate questions. They are not glamorous. They
          determine whether the dollar an agent spends gets a useful answer or a stale one.
        </p>

        <p>
          We run the data layer for those questions. The numbers in this report are pulled live
          from TensorFeed&apos;s own production feeds, each linked back to the public endpoint
          serving them. Reproduce any of them against the open APIs at{' '}
          <Link href="/api/meta" className="text-accent-primary hover:underline">/api/meta</Link>.
        </p>

        <h2 className="text-2xl font-semibold text-text-primary pt-6 flex items-center gap-2">
          <BarChart3 className="w-5 h-5" />
          1. What agents are actually paying for
        </h2>

        <p>
          TF&apos;s lifetime paid-call counter passed 19,000 calls in late May, in roughly 28 days.
          Each call returns a signed AFTA receipt (Ed25519, canonical JSON, verifiable against the
          public key at <Link href="/api/agent-fair-trade/receipts/public-key.jwk" className="text-accent-primary hover:underline">/api/agent-fair-trade/receipts/public-key.jwk</Link>),
          which means every single one is independently auditable. No buyer has to trust our usage
          counter; they can verify it.
        </p>

        <p>
          The distribution across the 34 piloted endpoints is heavily skewed. Status, news, and
          model-pricing reads dominate. Single-record security lookups (CVE clean, KEV clean,
          EPSS clean, cross-database verified) grew faster than any other category over the most
          recent week, almost entirely from agents that need a fact card before they reason about
          a vulnerability. The agent commerce stack is, in shape, what you would predict if you
          asked a careful engineer to design it: most calls are cheap reads, a long tail of
          calls are paid analytical derivations.
        </p>

        <p>
          One number worth pulling out separately: the AFTA refund mechanism (the code-enforced
          no-charge guarantees, the substrate of the agreement we shipped in
          <Link href="/whitepaper" className="text-accent-primary hover:underline"> the AFTA whitepaper</Link>) actually fires on real
          upstream failures. The honest-failure rate is small but non-zero, and the receipts list
          the reason. An agent paying TF for an OpenAlex-backed research velocity reading on a
          day when OpenAlex was rate-limiting our egress IP gets a $0 charge and a receipt saying
          <code className="text-accent-primary font-mono"> no_charge_reason: upstream_failure</code>.
          That is the part of the commerce loop you cannot run on trust.
        </p>

        <h2 className="text-2xl font-semibold text-text-primary pt-6 flex items-center gap-2">
          <BarChart3 className="w-5 h-5" />
          2. Vendor economics and the inference floor
        </h2>

        <p>
          TF tracks 367 distinct models in the OpenRouter catalog refresh, across more than 50
          providers, refreshed every day at <Link href="/api/openrouter/models" className="text-accent-primary hover:underline">/api/openrouter/models</Link>. The
          cheapest blended-mix tier for general LLM inference has fallen most quarters since 2024.
          The most expensive frontier tier has held a roughly 100x premium to the floor; that
          ratio has been remarkably stable even as both endpoints moved down.
        </p>

        <p>
          The most useful lens for an agent making a buy is not the floor or the ceiling. It is
          the per-model drift over the last 30 to 90 days. The premium derivation at
          <Link href="/api/premium/openrouter/series" className="text-accent-primary hover:underline"> /api/premium/openrouter/series</Link> exposes
          the delta directly, including which models gained or lost price points, which providers
          added or dropped them, and which tier (cheap, mid, premium, frontier) the model
          currently sits in. Twelve models in the catalog have a formally announced
          deprecation date in the next 365 days, tracked at{' '}
          <Link href="/api/model-deprecations" className="text-accent-primary hover:underline">/api/model-deprecations</Link>. Three of
          those twelve have a deprecation date inside the next 90 days; agents currently routing
          to them will need a migration plan inside the quarter.
        </p>

        <p>
          The arbitrage view at <Link href="/api/premium/inference-providers/arbitrage" className="text-accent-primary hover:underline">/api/premium/inference-providers/arbitrage</Link> takes
          the same underlying data and asks the spread question: for any given model, what is the
          range from cheapest to most expensive provider, and what does the average provider
          charge. The spread is wider than agents commonly assume. For several frontier models the
          provider-to-provider gap is 30 to 60 percent at the same context length and the same
          stated reliability tier.
        </p>

        <h2 className="text-2xl font-semibold text-text-primary pt-6 flex items-center gap-2">
          <Shield className="w-5 h-5" />
          3. Reliability and the cost of provider drift
        </h2>

        <p>
          The TF status board polls 33 AI provider status pages every two minutes. We have
          continuous uptime data on every major LLM gateway, every frontier lab&apos;s consumer
          surface, every named inference provider with a public status page. The two-minute
          cadence is deliberate. Agents that catch a degraded provider inside the first poll
          window can reroute before their workflow hits the wall.
        </p>

        <p>
          Two structural readings. First: the reliability gap between the named frontier labs and
          the long tail of inference providers is narrower than reputation suggests. Frontier
          labs have outages too. The reputation gap exists because frontier labs publish their
          status more visibly and recover faster from incidents that do happen. Second: incidents
          cluster around launches. The week a major model release goes live is the week the
          provider&apos;s status board has more amber and red bars than any other week of the
          month. Agents that lean on a brand-new model in its first 72 hours of availability are
          accepting a meaningfully degraded reliability profile.
        </p>

        <p>
          The Haiku-derived per-incident triage at{' '}
          <Link href="/api/premium/status/incidents/triage" className="text-accent-primary hover:underline">/api/premium/status/incidents/triage</Link> exists
          for the next layer down: an agent that needs not just &quot;is it down&quot; but
          &quot;what is the recommended action,&quot; with impact classification and
          rerouting hints. The trade is one credit per call against the work an agent would
          otherwise do parsing a status page and a postmortem.
        </p>

        <h2 className="text-2xl font-semibold text-text-primary pt-6 flex items-center gap-2">
          <Shield className="w-5 h-5" />
          4. The AI supply chain under measurement
        </h2>

        <p>
          The first systematic ingest of AI-relevant security advisories landed at TF this week.
          The latest batch from the security-xsource extraction pipeline carries 2,701 audited
          records out of GitHub Security Advisories (CC BY 4.0), with the AI-stack vendor filter
          identifying the subset that touches the curated catalog: inference servers, agent
          frameworks, training stacks, vector databases, model gateways, MCP tools. A single CVE
          lookup is one credit at <Link href="/api/premium/ai-cves/cve" className="text-accent-primary hover:underline">/api/premium/ai-cves/cve</Link>;
          the full AI-flagged subset and the exploited-in-wild slice are also published as paid
          endpoints. The fact card returned per CVE is normalized for LLM consumption:
          deduplicated CWEs, flat affected_products, normalized severity bands, top-five
          references.
        </p>

        <p>
          The structural read so far: most AI-stack CVEs land in the inference and agent-framework
          layers, not in the training stacks. That tracks the deployment surface area. A training
          stack has a small number of sophisticated operators. An inference server is deployed in
          thousands of hobbyist and small-team configurations. The asymmetry is in adversarial
          exposure, not in code quality.
        </p>

        <p>
          For real-time supply-chain signal across the broader AI package ecosystem, the OSV
          radar at <Link href="/api/premium/ai-safety/packages/security/radar" className="text-accent-primary hover:underline">/api/premium/ai-safety/packages/security/radar</Link> scores
          per-package risk over a curated PyPI and npm AI-package list. The AI-specific supply-chain
          IOC feed at <Link href="/api/security/ai-supply-chain-iocs.json" className="text-accent-primary hover:underline">/api/security/ai-supply-chain-iocs.json</Link> refreshes
          every six hours and captures the malware-advisories slice (the Shai-style npm worm
          subset of GHSA), republished with attribution.
        </p>

        <h2 className="text-2xl font-semibold text-text-primary pt-6 flex items-center gap-2">
          <Network className="w-5 h-5" />
          5. Where agent commerce settles, and the AFTA federation
        </h2>

        <p>
          BlockRun&apos;s State of x402 surfaced the marketplace shape. TF&apos;s view of the
          commerce layer is narrower and more local: 34 premium endpoints registered as Bazaar
          pilots on Coinbase&apos;s CDP, settling in USDC on Base, real on-chain transactions for
          every paid call. The companion view at <Link href="/api/x402-registry/snapshot" className="text-accent-primary hover:underline">/api/x402-registry/snapshot</Link> tracks
          the known publisher set we crawl directly: today small, growing slowly, intentionally
          curated rather than auto-scraped.
        </p>

        <p>
          The federation pattern is the part of this layer that most needs reflection. TF is
          one member of the Agent Fair-Trade Agreement federation; TerminalFeed.io is the other.
          The federation lets two independent sites share a credit ledger without a central
          broker: a credit bought from TF works at TerminalFeed and vice versa, with each site
          signing receipts under its own keypair. The pattern is described in detail in
          <Link href="/whitepaper" className="text-accent-primary hover:underline"> the AFTA whitepaper</Link>.
          The next federation members will determine whether the pattern stays a two-site
          arrangement or grows into a real peer-to-peer mesh of agent-paying sites. Candidates
          exist; we have not pushed expansion because the operational complexity of multi-party
          settlement deserves to be load-tested across the existing two before adding a third.
        </p>

        <p>
          One unique surface TF publishes: the no-charge transparency feed at{' '}
          <Link href="/api/payment/no-charge-stats" className="text-accent-primary hover:underline">/api/payment/no-charge-stats</Link>.
          Every time AFTA&apos;s code-enforced refund mechanism fires (because an upstream failed,
          because a freshness SLA was violated, because the worker breaker was open), the receipt
          is counted and the reason is rolled up. We publish the count and the reasons. It is the
          counterpart to the marketplace volume metric: not how much got paid for, but how much
          got refunded and why.
        </p>

        <h2 className="text-2xl font-semibold text-text-primary pt-6">What this report is not</h2>

        <p>
          It is not a forecast. The numbers above describe the substrate as it stands at the end
          of May 2026. The pace at which AI vendor pricing falls, the pace at which models are
          deprecated, the rate at which agent commerce grows on x402: these are derivatives of
          the substrate. They move. We will republish this report on a quarterly cadence and
          surface the deltas explicitly.
        </p>

        <p>
          It is also not a TF marketing piece. Every stat in here links to the open endpoint that
          serves it. Reproduce them. The point is the readings, not the system that produces
          them. Companion to BlockRun&apos;s State of x402 (the commerce layer), not a
          replacement.
        </p>

        <h2 className="text-2xl font-semibold text-text-primary pt-6">Where to read more</h2>

        <ul className="list-disc pl-6 space-y-2">
          <li>
            <Link href="/developers" className="text-accent-primary hover:underline">Developer API catalog</Link>: every endpoint cited in this report, plus the long tail not surfaced here.
          </li>
          <li>
            <Link href="/api/meta" className="text-accent-primary hover:underline">/api/meta</Link>: the machine-readable index of TF endpoints.
          </li>
          <li>
            <Link href="/whitepaper" className="text-accent-primary hover:underline">AFTA whitepaper</Link>: the standard underneath this commerce layer.
          </li>
          <li>
            <Link href="/agent-fair-trade" className="text-accent-primary hover:underline">/agent-fair-trade</Link>: the public AFTA explainer and verification page.
          </li>
          <li>
            <Link href="/research" className="text-accent-primary hover:underline">/research</Link>: the live data hub for milestone papers, top authors, citation velocity, emerging topics.
          </li>
          <li>
            <a href="https://storage.googleapis.com/blockrun-static/state-x402-2025.pdf" target="_blank" rel="noopener noreferrer" className="text-accent-primary hover:underline">State of x402 by BlockRun (Dec 2025)</a>: the commerce-layer companion report.
          </li>
        </ul>

        <h2 className="text-2xl font-semibold text-text-primary pt-6">Methodology</h2>

        <p>
          Every stat in this report is sourced from a live TensorFeed endpoint and linked above.
          Counts are captured at the timestamps embedded in each endpoint&apos;s response. We do
          not store derived snapshots for this report; each reader can pull the same data from
          the same endpoint and verify the count moved (or did not) since publication.
        </p>

        <p>
          Sources of data:
        </p>
        <ul className="list-disc pl-6 space-y-1">
          <li>AI model catalog: OpenRouter (Terms of Service), refreshed daily.</li>
          <li>AI service status: 33 public status pages, polled every two minutes.</li>
          <li>Security advisories: GitHub Security Advisories (CC BY 4.0); MITRE CVE; CISA KEV (US Government public domain); FIRST.org EPSS; OSV.dev (Apache 2.0).</li>
          <li>Research velocity: OpenAlex (CC0); arXiv (CC); Hugging Face Daily Papers (HF Terms).</li>
          <li>Capital and IPO: SEC EDGAR (US Government public domain).</li>
          <li>Agent commerce: Coinbase CDP Bazaar; x402scan; TF&apos;s own x402-registry crawl.</li>
        </ul>
      </div>

      {/* Footer */}
      <footer className="mt-16 pt-8 border-t border-border text-sm text-text-muted">
        <p className="mb-4">
          State of AI Agent Data is open and free to cite, fork, or critique. The reference data
          implementations are at the public endpoints linked throughout. Source code for the TF
          worker is at{' '}
          <a
            href="https://github.com/RipperMercs/tensorfeed"
            target="_blank"
            rel="noopener noreferrer"
            className="text-accent-primary hover:underline"
          >
            github.com/RipperMercs/tensorfeed
          </a>.
        </p>
        <p className="mb-4">
          Republished quarterly. Next edition: August 2026.
        </p>
        <div className="flex flex-wrap items-center gap-4 mt-6">
          <Link href="/research" className="inline-flex items-center gap-1.5 text-text-muted hover:text-accent-primary transition-colors">
            <ArrowLeft className="w-4 h-4" />
            Back to Research Hub
          </Link>
          <Link href="/whitepaper" className="text-text-muted hover:text-accent-primary transition-colors inline-flex items-center gap-1.5">
            <FileText className="w-4 h-4" />
            AFTA Whitepaper
          </Link>
          <Link href="/developers" className="text-text-muted hover:text-accent-primary transition-colors">
            /developers
          </Link>
        </div>
      </footer>
    </article>
  );
}
