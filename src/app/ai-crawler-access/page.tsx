import { Metadata } from 'next';
import Link from 'next/link';
import { Bot, ArrowRight, ScrollText, ShieldQuestion, History } from 'lucide-react';
import { DatasetJsonLd, FAQPageJsonLd, BreadcrumbListJsonLd } from '@/components/seo/JsonLd';
import MachineReadableLink from '@/components/MachineReadableLink';
import LastUpdatedFooter from '@/components/LastUpdatedFooter';
import AICrawlerAccessClient from './AICrawlerAccessClient';

const TRACKED_BOTS = [
  'GPTBot',
  'OAI-SearchBot',
  'ChatGPT-User',
  'ClaudeBot',
  'Claude-SearchBot',
  'Claude-User',
  'PerplexityBot',
  'CCBot',
  'Google-Extended',
  'Bytespider',
  'Amazonbot',
  'Applebot-Extended',
  'Meta-ExternalAgent',
  'cohere-ai',
];

const FAQS = [
  {
    question: 'What does this page measure?',
    answer:
      "For a curated universe of roughly 300 agent-relevant domains, we read each site's public robots.txt and assign a per-bot verdict (allowed, blocked, partial, or unknown) for 14 named AI crawlers. We also check whether the site publishes an llms.txt or ai.txt file. The numbers on this page are the aggregate of those per-site verdicts: what share of sites block GPTBot at the root, how many publish llms.txt, and so on.",
  },
  {
    question: 'Does a blocked verdict mean the bot actually cannot crawl the site?',
    answer:
      'No. We report stated policy, not enforcement. robots.txt is a request, not a wall. A site can list Disallow for ClaudeBot and that bot can still ignore it; a site can stay silent and a well-behaved bot will still crawl. We are documenting what each site declares in its robots.txt, which is the signal publishers control and the one most agents are supposed to honor. Whether a given crawler complies is a separate question we do not claim to answer.',
  },
  {
    question: 'How do you turn robots.txt into a verdict?',
    answer:
      'Deterministically. We pick the most specific matching user-agent group (an exact token match beats the wildcard group), then look at root access. A Disallow of the root with no equal-or-longer Allow override is blocked. A non-root Disallow with no root disallow is partial. An empty Disallow, an Allow that overrides, or no matching group at all is allowed (absence of a rule is permission, per the standard). If we cannot read robots.txt at all (timeout, network error, non-2xx), every bot for that domain is recorded as unknown, never as allowed.',
  },
  {
    question: 'Why does unknown matter, and how is it counted?',
    answer:
      'Honesty in the denominator. Blocked and allowed percentages are computed only over known verdicts. Domains where we could not read robots.txt are excluded from the math entirely rather than silently folded into allowed. That keeps the headline percentages from drifting just because a few sites were briefly unreachable.',
  },
  {
    question: 'How fresh is the data, and why does coverage fill in gradually?',
    answer:
      'The crawl is rolling: each daily run refreshes about one seventh of the universe, so the full set re-checks roughly weekly and the first snapshot fills in over about a week. The premium endpoints carry an eight-day freshness SLA, and if the snapshot is stale past that window the request is not charged. The summary on this page reports domains with data versus domains tracked so you can see the coverage build in real time.',
  },
  {
    question: 'What is llms.txt and ai.txt, and why track them here?',
    answer:
      'They are emerging, opt-in conventions at a site root for telling AI systems what they may use and how. llms.txt points models at the content a site wants surfaced; ai.txt is used by some sites to declare AI usage terms. Tracking their adoption alongside robots.txt verdicts gives a fuller picture of how the open web is choosing to engage with AI crawlers: not just who is blocked, but who is actively inviting.',
  },
  {
    question: 'Which bots do you track?',
    answer:
      `Fourteen named AI crawlers: ${TRACKED_BOTS.join(', ')}. The list covers the major training, search, and user-triggered agents from OpenAI, Anthropic, Perplexity, Common Crawl, Google, ByteDance, Amazon, Apple, Meta, and Cohere.`,
  },
  {
    question: 'How do I pull this programmatically?',
    answer:
      'Two free endpoints, no auth. GET /api/ai-crawler-access/summary.json for the aggregate, and GET /api/ai-crawler-access/site?domain=example.com for one site. The full dataset and the historical change log (when a site flips a bot from allowed to blocked, or publishes llms.txt) are premium at one credit each.',
  },
];

export const metadata: Metadata = {
  title: 'AI Crawler Access Map: Who Blocks GPTBot, ClaudeBot, PerplexityBot | TensorFeed',
  description:
    'Which AI bots curated domains allow or block in robots.txt, plus llms.txt and ai.txt adoption. Per-bot blocked and allowed percentages across GPTBot, ClaudeBot, PerplexityBot, CCBot, Google-Extended, and more. We report stated policy, not enforcement. Free JSON at /api/ai-crawler-access/summary.json.',
  alternates: { canonical: 'https://tensorfeed.ai/ai-crawler-access' },
  openGraph: {
    type: 'website',
    url: 'https://tensorfeed.ai/ai-crawler-access',
    title: 'TensorFeed AI Crawler Access Map',
    description:
      'Per-bot robots.txt verdicts and llms.txt/ai.txt adoption across a curated universe of agent-relevant domains. Stated policy, not enforcement.',
    siteName: 'TensorFeed.ai',
    images: [{ url: '/tensorfeed-logo.png', width: 1024, height: 1024 }],
  },
  twitter: {
    card: 'summary',
    title: 'TensorFeed AI Crawler Access Map',
    description:
      'Who blocks GPTBot, ClaudeBot, PerplexityBot in robots.txt, plus llms.txt adoption. Free JSON.',
  },
  keywords: [
    'ai crawler access',
    'who blocks GPTBot',
    'robots.txt ai bots',
    'ClaudeBot blocked',
    'PerplexityBot robots.txt',
    'llms.txt adoption',
    'ai.txt',
    'CCBot blocked',
    'Google-Extended opt out',
    'ai bot robots.txt tracker',
  ],
};

export default function AICrawlerAccessPage() {
  return (
    <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <DatasetJsonLd
        name="TensorFeed AI Crawler Access Map"
        description="Daily rolling crawl of curated agent-relevant domains. Per-bot robots.txt verdicts (allowed, blocked, partial, unknown) for 14 named AI crawlers, plus llms.txt and ai.txt presence. We report stated policy, not enforcement."
        url="https://tensorfeed.ai/ai-crawler-access"
        jsonUrl="/api/ai-crawler-access/summary.json"
        license="https://tensorfeed.ai/about"
        keywords={[
          'ai crawler access',
          'robots.txt ai bots',
          'gptbot blocked',
          'claudebot robots.txt',
          'perplexitybot access',
          'llms.txt adoption',
          'ai.txt adoption',
          'ai bot policy tracker',
        ]}
      />
      <FAQPageJsonLd faqs={FAQS} />
      <BreadcrumbListJsonLd
        items={[
          { name: 'Home', url: 'https://tensorfeed.ai' },
          { name: 'For AI agents', url: 'https://tensorfeed.ai/for-ai-agents' },
          { name: 'AI Crawler Access Map', url: 'https://tensorfeed.ai/ai-crawler-access' },
        ]}
      />

      <header className="mb-8">
        <div className="flex items-center gap-3 mb-3">
          <div className="p-2 rounded-lg bg-accent-primary/15">
            <Bot className="w-7 h-7 text-accent-primary" />
          </div>
          <h1 className="text-3xl sm:text-4xl font-bold text-text-primary">
            AI Crawler Access Map
          </h1>
        </div>
        <p className="text-text-secondary text-lg max-w-3xl mb-4">
          Which AI bots a curated universe of agent-relevant domains allow or block in their
          robots.txt, plus who publishes llms.txt and ai.txt. The open web is quietly deciding which
          crawlers it lets in. This is the running tally.
        </p>
        <MachineReadableLink endpoint="/api/ai-crawler-access/summary.json" className="mt-1" />
        <div className="text-text-secondary leading-relaxed max-w-3xl space-y-3 text-sm mt-4">
          <p>
            Every day we read the public robots.txt of part of the universe, assign a per-bot
            verdict, and check for llms.txt and ai.txt at the root. The aggregate below is live: it
            polls the same free endpoint agents use, so the human view and the machine view never
            disagree. Pair it with{' '}
            <Link href="/agent-traffic" className="text-accent-primary hover:underline">
              /agent-traffic
            </Link>{' '}
            (which bots actually hit us) to see both sides of the crawler relationship.
          </p>
        </div>
      </header>

      <AICrawlerAccessClient />

      {/* Methodology: this is the honesty section. State exactly what the
          numbers mean, what they do not mean, and how the rolling crawl
          and SLA work. No aggregate values are hardcoded here; they all
          come from the client poll above. */}
      <section className="mt-12 border-t border-bg-tertiary pt-8">
        <h2 className="text-xl font-semibold text-text-primary mb-4 flex items-center gap-2">
          <ShieldQuestion className="w-5 h-5 text-accent-primary" />
          Methodology and honest limits
        </h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="border border-bg-tertiary rounded-lg p-5 bg-bg-secondary/50">
            <div className="flex items-center gap-2 mb-2">
              <ScrollText className="w-4 h-4 text-accent-primary" />
              <h3 className="text-text-primary font-semibold text-sm">Stated policy, not enforcement</h3>
            </div>
            <p className="text-text-secondary text-sm leading-relaxed">
              robots.txt is a declaration, not a barrier. A blocked verdict means the site asks that
              crawler not to index the root; it does not prove the crawler obeys, and it does not
              mean the content is technically unreachable. We document the policy publishers control.
              Compliance is voluntary and outside what this feed claims to measure.
            </p>
          </div>
          <div className="border border-bg-tertiary rounded-lg p-5 bg-bg-secondary/50">
            <div className="flex items-center gap-2 mb-2">
              <ShieldQuestion className="w-4 h-4 text-accent-primary" />
              <h3 className="text-text-primary font-semibold text-sm">Unknown is never allowed</h3>
            </div>
            <p className="text-text-secondary text-sm leading-relaxed">
              When robots.txt cannot be read (timeout, network error, or a non-2xx response), every
              bot for that domain is recorded as unknown, not allowed. Blocked and allowed
              percentages are computed only over known verdicts, so a brief outage on a few sites
              does not quietly inflate the allowed share.
            </p>
          </div>
          <div className="border border-bg-tertiary rounded-lg p-5 bg-bg-secondary/50">
            <div className="flex items-center gap-2 mb-2">
              <History className="w-4 h-4 text-accent-primary" />
              <h3 className="text-text-primary font-semibold text-sm">Rolling daily crawl</h3>
            </div>
            <p className="text-text-secondary text-sm leading-relaxed">
              Each daily run refreshes about one seventh of the universe, so every domain is
              re-checked roughly weekly and the first snapshot fills in over about a week. The
              summary reports domains with data versus domains tracked so coverage is never
              overstated while the map seeds.
            </p>
          </div>
          <div className="border border-bg-tertiary rounded-lg p-5 bg-bg-secondary/50">
            <div className="flex items-center gap-2 mb-2">
              <ScrollText className="w-4 h-4 text-accent-primary" />
              <h3 className="text-text-primary font-semibold text-sm">Freshness SLA</h3>
            </div>
            <p className="text-text-secondary text-sm leading-relaxed">
              The premium full dataset and change log carry an eight-day freshness SLA. If the
              snapshot is older than that window, the request is not charged. The captured-at
              timestamp on every response reflects the real data-capture time, never the wall-clock
              moment you called.
            </p>
          </div>
        </div>
      </section>

      <div className="mt-10 border border-bg-tertiary rounded-lg p-5 bg-bg-secondary/50">
        <h2 className="text-lg font-semibold text-text-primary mb-3">Free agent endpoints</h2>
        <ul className="space-y-3 text-sm">
          <li>
            <code className="bg-bg-tertiary px-2 py-0.5 rounded text-accent-primary">
              /api/ai-crawler-access/summary.json
            </code>
            <span className="text-text-secondary ml-2 block mt-1">
              Aggregate: per-bot blocked and allowed percentages, llms.txt and ai.txt adoption, and
              a per-sector rollup. No parameters. Same payload this page renders.
            </span>
          </li>
          <li>
            <code className="bg-bg-tertiary px-2 py-0.5 rounded text-accent-primary">
              /api/ai-crawler-access/site?domain=
            </code>
            <span className="text-text-secondary ml-2 block mt-1">
              One domain: the per-bot robots.txt verdict plus llms.txt and ai.txt presence. Required
              param: domain.
            </span>
          </li>
        </ul>
        <p className="text-text-muted text-xs mt-4">
          The full dataset and the historical change log are premium at one credit each. See{' '}
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
            href="/agent-traffic"
            className="border border-bg-tertiary rounded-lg p-4 bg-bg-secondary/50 hover:bg-bg-secondary transition-colors group"
          >
            <div className="text-xs text-accent-primary mb-1">The other side</div>
            <div className="text-sm font-medium text-text-primary mb-1">Live AI bot traffic</div>
            <div className="text-xs text-text-muted flex items-center gap-1">
              Which bots hit us
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

      <LastUpdatedFooter path="/ai-crawler-access" />
    </div>
  );
}
