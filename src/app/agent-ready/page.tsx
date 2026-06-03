import { Metadata } from 'next';
import Link from 'next/link';
import { Gauge, ArrowRight, Scale, Layers, History } from 'lucide-react';
import { DatasetJsonLd, FAQPageJsonLd, BreadcrumbListJsonLd } from '@/components/seo/JsonLd';
import MachineReadableLink from '@/components/MachineReadableLink';
import LastUpdatedFooter from '@/components/LastUpdatedFooter';
import AgentReadyClient from './AgentReadyClient';

// The six surfaces and their exact score weights. Published here in plain text
// so the methodology section and the JSON-LD stay in lockstep with the worker
// (worker/src/agent-ready.ts computeReadiness). No aggregate stats are baked in;
// only the static scoring rubric, which is the same for every domain.
const SURFACE_WEIGHTS: { surface: string; weight: number; note: string }[] = [
  {
    surface: 'x402 payment manifest',
    weight: 25,
    note: 'A non-empty /.well-known/x402.json. The strongest agent-readiness signal: the site can charge a machine directly.',
  },
  {
    surface: 'agent.json',
    weight: 20,
    note: 'A non-empty /.well-known/agent.json descriptor that tells an agent what the site is and how to act on it.',
  },
  {
    surface: 'OpenAPI spec',
    weight: 20,
    note: 'A machine-callable interface. We check two common paths and count the surface present if either resolves.',
  },
  {
    surface: 'llms.txt',
    weight: 15,
    note: 'A root llms.txt that points models at the content the site wants surfaced.',
  },
  {
    surface: 'AI-bot-crawlable',
    weight: 15,
    note: 'At least one core AI crawler is allowed or partially allowed in robots.txt. Fully blocked or unknown does not count.',
  },
  {
    surface: 'ai.txt',
    weight: 5,
    note: 'A root ai.txt declaring AI usage terms. The lightest signal, scored last.',
  },
];

const FAQS = [
  {
    question: 'What does an agent-readiness score mean?',
    answer:
      "It is a transparent 0 to 100 sum of six published surfaces a site can expose for autonomous agents. Each surface adds a fixed number of points: an x402 payment manifest is worth 25, agent.json 20, an OpenAPI spec 20, llms.txt 15, being crawlable by a core AI bot 15, and ai.txt 5. There is no model, no opinion, and no weighting we hide. A site's score is just the sum of the surfaces we found published at its public paths.",
  },
  {
    question: 'How are the tiers defined?',
    answer:
      'Four bands by score. A score of 20 or below is closed. From 21 through 50 is emerging. From 51 through 80 is ready. Above 80 is advanced. The cutoffs are fixed at 20, 50, and 80 so a tier never drifts: a domain moves bands only when it actually adds or drops a surface.',
  },
  {
    question: 'What counts as AI-bot-crawlable?',
    answer:
      'We look at the robots.txt verdict for a small set of core AI crawlers: GPTBot, ClaudeBot, PerplexityBot, Google-Extended, and CCBot. If any one of them is allowed or partially allowed at the root, the site earns the crawlable surface. If every core bot is blocked, or robots.txt could not be read at all, the surface scores zero. Unknown is never treated as crawlable.',
  },
  {
    question: 'How do you detect an OpenAPI spec?',
    answer:
      'With a two-path heuristic. We fetch /openapi.json and /.well-known/openapi.json and count the OpenAPI surface present if either one returns non-empty content. It is a deliberately simple probe: it catches the two conventional locations without claiming to validate the spec itself. A site that serves its spec at some bespoke path will read as absent here, which we would rather do than guess.',
  },
  {
    question: 'Why is coverage filling in gradually?',
    answer:
      'The crawl is rolling. Each daily run profiles a slice of the universe, so the full set re-checks roughly weekly and the first snapshot fills in over about a week. The summary reports profiled versus domains tracked precisely so you can watch coverage build: profiled is the number of domains we have actually scored for agent surfaces, and it climbs toward domains tracked as the backfill catches up. We never quietly count an unprofiled domain as ready.',
  },
  {
    question: 'Is this stated capability or verified behavior?',
    answer:
      'Stated, published surfaces. We read what a site publishes at its public paths and score the presence of each surface. We do not test whether the x402 manifest actually settles a payment, whether the OpenAPI endpoints respond, or whether a crawler obeys the robots policy. This is a map of declared agent readiness across the open web, not a conformance certification.',
  },
  {
    question: 'How do I pull this programmatically?',
    answer:
      'Two free endpoints, no auth. GET /api/agent-ready/summary.json for the aggregate (per-surface adoption, the tier distribution, and a top-25 leaderboard), and GET /api/agent-ready/site?domain=example.com for a single domain score and surface breakdown. The full per-domain dataset is premium at one credit, with an eight-day freshness SLA and no charge when the snapshot is stale.',
  },
];

export const metadata: Metadata = {
  title: 'Is Your Site Agent-Ready? The Agentic Web Readiness Map | TensorFeed',
  description:
    'A transparent 0 to 100 agent-readiness score for a curated universe of domains, derived from six public surfaces: x402 payment manifest, agent.json, OpenAPI, llms.txt, AI-bot-crawlable robots policy, and ai.txt. Per-surface adoption, tier distribution, and a top-25 leaderboard. Free JSON at /api/agent-ready/summary.json.',
  alternates: { canonical: 'https://tensorfeed.ai/agent-ready' },
  openGraph: {
    type: 'website',
    url: 'https://tensorfeed.ai/agent-ready',
    title: 'TensorFeed Agent-Ready Web Map',
    description:
      'How ready is the open web for autonomous agents? A published 0 to 100 score across six surfaces (x402, agent.json, OpenAPI, llms.txt, crawlable, ai.txt) for a curated universe of domains. Stated surfaces, not enforcement.',
    siteName: 'TensorFeed.ai',
    images: [{ url: '/tensorfeed-logo.png', width: 1024, height: 1024 }],
  },
  twitter: {
    card: 'summary',
    title: 'TensorFeed Agent-Ready Web Map',
    description:
      'A transparent 0 to 100 agent-readiness score across six surfaces: x402, agent.json, OpenAPI, llms.txt, crawlable, ai.txt. Free JSON.',
  },
  keywords: [
    'agent-ready web',
    'agentic web readiness',
    'is my site agent ready',
    'x402 adoption',
    'agent.json adoption',
    'openapi adoption',
    'llms.txt adoption',
    'ai.txt adoption',
    'agent readiness score',
    'agentic web map',
  ],
};

export default function AgentReadyPage() {
  return (
    <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <DatasetJsonLd
        name="TensorFeed Agent-Ready Web Map"
        description="Daily rolling profile of curated domains, scoring agent readiness from six public surfaces: x402 payment manifest, agent.json, OpenAPI spec, llms.txt, AI-bot-crawlable robots policy, and ai.txt. A transparent 0 to 100 score plus tier. We report stated, published surfaces, not enforcement."
        url="https://tensorfeed.ai/agent-ready"
        jsonUrl="/api/agent-ready/summary.json"
        license="https://tensorfeed.ai/about"
        keywords={[
          'agent-ready web',
          'agentic web readiness',
          'x402 adoption',
          'agent.json adoption',
          'openapi adoption',
          'llms.txt adoption',
          'ai.txt adoption',
          'agent readiness score',
        ]}
      />
      <FAQPageJsonLd faqs={FAQS} />
      <BreadcrumbListJsonLd
        items={[
          { name: 'Home', url: 'https://tensorfeed.ai' },
          { name: 'For AI agents', url: 'https://tensorfeed.ai/for-ai-agents' },
          { name: 'Agent-Ready Web Map', url: 'https://tensorfeed.ai/agent-ready' },
        ]}
      />

      <header className="mb-8">
        <div className="flex items-center gap-3 mb-3">
          <div className="p-2 rounded-lg bg-accent-primary/15">
            <Gauge className="w-7 h-7 text-accent-primary" />
          </div>
          <h1 className="text-3xl sm:text-4xl font-bold text-text-primary">
            Agent-Ready Web Map
          </h1>
        </div>
        <p className="text-text-secondary text-lg max-w-3xl mb-4">
          How ready is the open web for autonomous agents? For a curated universe of domains we
          score six public surfaces, an x402 payment manifest, agent.json, an OpenAPI spec, llms.txt,
          an AI-crawlable robots policy, and ai.txt, into one transparent number from 0 to 100. This
          is the running tally.
        </p>
        <MachineReadableLink endpoint="/api/agent-ready/summary.json" className="mt-1" />
        <div className="text-text-secondary leading-relaxed max-w-3xl space-y-3 text-sm mt-4">
          <p>
            Every day we profile part of the universe at its public paths and add up the surfaces we
            find. The aggregate below is live: it polls the same free endpoint agents use, so the
            human view and the machine view never disagree. Pair it with{' '}
            <Link href="/ai-crawler-access" className="text-accent-primary hover:underline">
              /ai-crawler-access
            </Link>{' '}
            (the robots.txt layer this map is built on) to see what each domain declares to crawlers.
          </p>
        </div>
      </header>

      <AgentReadyClient />

      {/* Methodology: the honesty section. Publish the exact weights, the tier
          cutoffs, the crawlable rule, the OpenAPI two-path heuristic, and the
          rolling-fill caveat. No aggregate values are hardcoded here; they all
          come from the client poll above. Only the fixed rubric lives here. */}
      <section className="mt-12 border-t border-bg-tertiary pt-8">
        <h2 className="text-xl font-semibold text-text-primary mb-4 flex items-center gap-2">
          <Scale className="w-5 h-5 text-accent-primary" />
          How the score is computed
        </h2>
        <p className="text-text-muted text-sm mb-6 max-w-3xl">
          The score is a plain sum of six fixed weights. There is no model and no hidden weighting. A
          domain&apos;s number is just the surfaces we found published, added together. Here is the
          full rubric, the same one the worker applies to every domain.
        </p>
        <div className="bg-bg-secondary border border-border rounded-xl overflow-hidden mb-6">
          {SURFACE_WEIGHTS.map((row, idx) => (
            <div
              key={row.surface}
              className={`flex items-start gap-4 px-4 py-3 ${
                idx > 0 ? 'border-t border-border' : ''
              }`}
            >
              <span className="text-accent-primary font-mono text-sm font-semibold w-12 flex-shrink-0 pt-0.5">
                +{row.weight}
              </span>
              <div className="min-w-0">
                <div className="text-text-primary text-sm font-medium">{row.surface}</div>
                <div className="text-text-muted text-xs mt-0.5 leading-relaxed">{row.note}</div>
              </div>
            </div>
          ))}
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="border border-bg-tertiary rounded-lg p-5 bg-bg-secondary/50">
            <div className="flex items-center gap-2 mb-2">
              <Layers className="w-4 h-4 text-accent-primary" />
              <h3 className="text-text-primary font-semibold text-sm">Four tiers, fixed cutoffs</h3>
            </div>
            <p className="text-text-secondary text-sm leading-relaxed">
              A score of 20 or below is closed. From 21 through 50 is emerging. From 51 through 80 is
              ready. Above 80 is advanced. The cutoffs at 20, 50, and 80 never move, so a domain
              changes tier only when it adds or drops a real surface, not because we retuned anything.
            </p>
          </div>
          <div className="border border-bg-tertiary rounded-lg p-5 bg-bg-secondary/50">
            <div className="flex items-center gap-2 mb-2">
              <Scale className="w-4 h-4 text-accent-primary" />
              <h3 className="text-text-primary font-semibold text-sm">The crawlable rule</h3>
            </div>
            <p className="text-text-secondary text-sm leading-relaxed">
              A domain earns the 15-point crawlable surface if any core AI bot (GPTBot, ClaudeBot,
              PerplexityBot, Google-Extended, or CCBot) is allowed or partially allowed in robots.txt.
              If every core bot is blocked, or robots.txt could not be read, the surface scores zero.
              Unknown is never counted as crawlable.
            </p>
          </div>
          <div className="border border-bg-tertiary rounded-lg p-5 bg-bg-secondary/50">
            <div className="flex items-center gap-2 mb-2">
              <Layers className="w-4 h-4 text-accent-primary" />
              <h3 className="text-text-primary font-semibold text-sm">OpenAPI two-path heuristic</h3>
            </div>
            <p className="text-text-secondary text-sm leading-relaxed">
              We probe two conventional locations, /openapi.json and /.well-known/openapi.json, and
              count the OpenAPI surface present if either returns non-empty content. A spec served at
              a bespoke path reads as absent. We would rather under-report than guess at a location we
              did not check.
            </p>
          </div>
          <div className="border border-bg-tertiary rounded-lg p-5 bg-bg-secondary/50">
            <div className="flex items-center gap-2 mb-2">
              <History className="w-4 h-4 text-accent-primary" />
              <h3 className="text-text-primary font-semibold text-sm">Rolling fill, honest denominator</h3>
            </div>
            <p className="text-text-secondary text-sm leading-relaxed">
              The crawl is rolling, so the map seeds over about a week. The summary reports profiled
              (domains actually scored for agent surfaces) versus domains tracked, and profiled grows
              toward domains tracked over the first seven days. Adoption percentages are computed only
              over profiled domains, never over the full universe.
            </p>
          </div>
        </div>
      </section>

      <div className="mt-10 border border-bg-tertiary rounded-lg p-5 bg-bg-secondary/50">
        <h2 className="text-lg font-semibold text-text-primary mb-3">Free agent endpoints</h2>
        <ul className="space-y-3 text-sm">
          <li>
            <code className="bg-bg-tertiary px-2 py-0.5 rounded text-accent-primary">
              /api/agent-ready/summary.json
            </code>
            <span className="text-text-secondary ml-2 block mt-1">
              Aggregate: per-surface adoption, the readiness-tier distribution, and a top-25
              leaderboard. No parameters. Same payload this page renders.
            </span>
          </li>
          <li>
            <code className="bg-bg-tertiary px-2 py-0.5 rounded text-accent-primary">
              /api/agent-ready/site?domain=
            </code>
            <span className="text-text-secondary ml-2 block mt-1">
              One domain: a transparent 0 to 100 score, tier, and which agent surfaces the site
              exposes. Required param: domain.
            </span>
          </li>
        </ul>
        <p className="text-text-muted text-xs mt-4">
          The full per-domain dataset is premium at one credit. See{' '}
          <Link href="/developers/agent-payments" className="text-accent-primary hover:underline">
            /developers/agent-payments
          </Link>
          .
        </p>
      </div>

      <div className="mt-10 border-t border-bg-tertiary pt-6">
        <h2 className="text-xl font-semibold text-text-primary mb-4">Related on TensorFeed</h2>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <Link
            href="/ai-crawler-access"
            className="border border-bg-tertiary rounded-lg p-4 bg-bg-secondary/50 hover:bg-bg-secondary transition-colors group"
          >
            <div className="text-xs text-accent-primary mb-1">The layer beneath</div>
            <div className="text-sm font-medium text-text-primary mb-1">AI crawler access</div>
            <div className="text-xs text-text-muted flex items-center gap-1">
              Who blocks which bots
              <ArrowRight className="w-3 h-3 group-hover:translate-x-0.5 transition-transform" />
            </div>
          </Link>
          <Link
            href="/originals/agents-md-new-robots-txt"
            className="border border-bg-tertiary rounded-lg p-4 bg-bg-secondary/50 hover:bg-bg-secondary transition-colors group"
          >
            <div className="text-xs text-accent-primary mb-1">Editorial</div>
            <div className="text-sm font-medium text-text-primary mb-1">
              AGENTS.md, the new robots.txt
            </div>
            <div className="text-xs text-text-muted flex items-center gap-1">
              Read article
              <ArrowRight className="w-3 h-3 group-hover:translate-x-0.5 transition-transform" />
            </div>
          </Link>
          <Link
            href="/for-ai-agents"
            className="border border-bg-tertiary rounded-lg p-4 bg-bg-secondary/50 hover:bg-bg-secondary transition-colors group"
          >
            <div className="text-xs text-accent-primary mb-1">Agent surface</div>
            <div className="text-sm font-medium text-text-primary mb-1">For AI agents</div>
            <div className="text-xs text-text-muted flex items-center gap-1">
              Discovery, MCP, x402
              <ArrowRight className="w-3 h-3 group-hover:translate-x-0.5 transition-transform" />
            </div>
          </Link>
        </div>
      </div>

      <div className="mt-10 border-t border-bg-tertiary pt-6">
        <h2 className="text-xl font-semibold text-text-primary mb-4">Frequently asked questions</h2>
        <dl className="space-y-4 text-sm">
          {FAQS.map((faq) => (
            <div key={faq.question}>
              <dt className="font-semibold text-text-primary mb-1">{faq.question}</dt>
              <dd className="text-text-secondary leading-relaxed">{faq.answer}</dd>
            </div>
          ))}
        </dl>
      </div>

      <LastUpdatedFooter path="/agent-ready" />
    </div>
  );
}
