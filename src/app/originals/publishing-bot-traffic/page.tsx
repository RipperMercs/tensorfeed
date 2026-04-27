import { Metadata } from 'next';
import Link from 'next/link';
import { ArrowLeft, Clock } from 'lucide-react';
import { ArticleJsonLd } from '@/components/seo/JsonLd';

export const metadata: Metadata = {
  title: "We Made Our AI Bot Traffic Public. Here's What We're Seeing.",
  description:
    'Most sites hide bot traffic. We just published ours at /agent-traffic with a per-bot breakdown, top hit endpoints, and a live tail. ClaudeBot, GPTBot, PerplexityBot, Bytespider, Google-Extended, and the rest of the AI crawler set, refreshed every 30 seconds.',
  alternates: { canonical: 'https://tensorfeed.ai/originals/publishing-bot-traffic' },
  openGraph: {
    title: "We Made Our AI Bot Traffic Public. Here's What We're Seeing.",
    description:
      'A live public dashboard of AI bot traffic on TensorFeed.ai. Why we publish it, what we see, and what it tells us about the agent web.',
    type: 'article',
    publishedTime: '2026-04-28T01:30:00Z',
    authors: ['Ripper'],
  },
  twitter: {
    card: 'summary_large_image',
    title: "We Made Our AI Bot Traffic Public. Here's What We're Seeing.",
    description:
      'Most sites hide their bot traffic. We publish ours, live, at /agent-traffic. ClaudeBot, GPTBot, PerplexityBot, the lot.',
  },
};

export default function PublishingBotTrafficPage() {
  return (
    <article className="max-w-3xl mx-auto px-4 sm:px-6 py-10">
      <ArticleJsonLd
        title="We Made Our AI Bot Traffic Public. Here's What We're Seeing."
        description="Most sites hide bot traffic. We publish ours at /agent-traffic with a per-bot breakdown, top hit endpoints, and a live tail."
        datePublished="2026-04-28"
        url="https://tensorfeed.ai/originals/publishing-bot-traffic"
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
          We Made Our AI Bot Traffic Public. Here&apos;s What We&apos;re Seeing.
        </h1>
        <div className="flex items-center gap-3 text-sm text-text-muted">
          <span className="text-text-secondary font-medium">Ripper</span>
          <span>&middot;</span>
          <time dateTime="2026-04-28">April 28, 2026</time>
          <span>&middot;</span>
          <span className="flex items-center gap-1">
            <Clock className="w-3.5 h-3.5" />
            6 min read
          </span>
        </div>
      </header>

      <div className="prose-custom space-y-6 text-text-secondary leading-relaxed">
        <p className="text-lg text-text-primary leading-relaxed">
          Most sites hide their bot traffic. They treat it like a janitor problem, something to
          rate-limit and forget. We just published ours at{' '}
          <Link href="/agent-traffic" className="text-accent-primary hover:underline">
            /agent-traffic
          </Link>
          : a live dashboard of every AI crawler hitting TensorFeed, refreshed every 30 seconds,
          no auth required, with per-bot breakdown, top hit endpoints, and a live tail.
        </p>

        <p>
          Two reasons we did it. First, TensorFeed was built for AI agents. Hiding the agent
          footprint while telling agents we welcome them is incoherent. Second, the data itself is
          interesting in a way that nobody else has surfaced yet. Which crawlers index which
          surfaces? Where does the agent web actually live? You cannot answer that from your own
          server logs alone, but you can answer it from a network of public dashboards. So we are
          publishing the first one.
        </p>

        <h2 className="text-2xl font-semibold text-text-primary pt-4">What we track</h2>

        <p>
          Twenty-five user-agent patterns at the Cloudflare Worker layer. ClaudeBot and
          anthropic-ai for Anthropic. GPTBot, ChatGPT-User, and OAI-SearchBot for OpenAI.
          PerplexityBot. Google-Extended (the Gemini training opt-in crawler) and Googlebot.
          Bingbot. Applebot. Bytespider for ByteDance. Amazonbot. cohere-ai. YouBot. Plus generic
          patterns for Scrapy, python-requests, axios, node-fetch, and any user agent that says
          bot, crawler, spider, or agent.
        </p>

        <p>
          We do not block any of them. We do not rate-limit them. We log a hit and move on. The
          identification is a string match, nothing fancier. Sophisticated agents who want to
          impersonate a browser can; we are not playing that game.
        </p>

        <h2 className="text-2xl font-semibold text-text-primary pt-4">What the dashboard shows</h2>

        <p>
          Today&apos;s running counter (resets at 00:00 UTC). The most recent fifty bot hits as a
          rolling buffer. A derived breakdown by bot with vendor labels and a one-line description
          of what each crawler does. The top eight endpoints those bots are pulling. A 10-deep
          live tail with timestamps. The breakdown updates every thirty seconds.
        </p>

        <p>
          The data already tells a story, even before we have a multi-day archive built up.
          OpenAI&apos;s OAI-SearchBot is the most frequent visitor. ClaudeBot and GPTBot are
          steady but lower volume. PerplexityBot shows up but irregularly. Bytespider is a
          surprise, given that we are an English-language site. The most-hit endpoints are the
          obvious ones: <code className="text-accent-primary font-mono text-sm">/feed.xml</code>,{' '}
          <code className="text-accent-primary font-mono text-sm">/feed.json</code>,{' '}
          <code className="text-accent-primary font-mono text-sm">/api/news</code>, and{' '}
          <code className="text-accent-primary font-mono text-sm">/api/payment/info</code>. That
          last one is interesting. Agents are scraping our wallet address, presumably to verify
          before sending USDC.
        </p>

        <h2 className="text-2xl font-semibold text-text-primary pt-4">Why this is on-brand</h2>

        <p>
          We have been saying for months that TensorFeed is built for AI agents. Concretely that
          means we welcome them in robots.txt by name, ship a discovery manifest at{' '}
          <Link href="/llms.txt" className="text-accent-primary hover:underline font-mono text-sm">
            /llms.txt
          </Link>
          , publish an x402 V2 manifest at{' '}
          <Link href="/.well-known/x402" className="text-accent-primary hover:underline font-mono text-sm">
            /.well-known/x402
          </Link>
          , maintain an MCP server, and accept payment in USDC. All of that is plumbing.
        </p>

        <p>
          The dashboard is the first surface that makes the thesis visceral. You land on{' '}
          <code className="text-accent-primary font-mono text-sm">/agent-traffic</code> and see a
          live ticker of AI agents pulling data from us. Right now. The story we have been telling
          becomes a thing you can watch. That kind of demonstration compounds: every screenshot
          of the dashboard is implicit proof that the agent web exists and that we are part of
          it.
        </p>

        <h2 className="text-2xl font-semibold text-text-primary pt-4">The data moat angle</h2>

        <p>
          Bot traffic patterns are themselves a dataset. Which crawler indexes which surface? How
          often? When did a new crawler show up? When did an existing one go quiet? Today we have
          one site&apos;s worth, but the daily snapshots also land in our public history at{' '}
          <code className="text-accent-primary font-mono text-sm">/api/history</code>, so the
          archive grows by a row per day. In thirty days we will have a real time series. In a
          year we will have a meaningful longitudinal view of how the AI crawler population
          shifts.
        </p>

        <p>
          Sister sites running the same Worker pattern can publish their own dashboards. Aggregate
          across enough of them and you have a public ledger of how the agent web behaves, which
          is information that does not exist anywhere right now. We are not racing to build that
          aggregator today, but the per-site dashboards are the building block.
        </p>

        <h2 className="text-2xl font-semibold text-text-primary pt-4">The KV math, since people will ask</h2>

        <p>
          We do not write to KV on every bot hit. We buffer in a Worker isolate&apos;s in-memory
          array and flush once per fifty hits or once per sixty seconds, whichever comes first.
          That keeps us inside the 100,000 ops/day budget on the Cloudflare free tier. The
          dashboard reads from a 30-second in-memory cache fronted by Cache API, so the
          /api/agents/activity endpoint costs roughly two KV ops per minute regardless of how
          many people are watching it. We covered the full pattern in{' '}
          <Link
            href="/originals/kv-ops-budget-edge-architecture"
            className="text-accent-primary hover:underline"
          >
            The 100,000 KV Ops Daily Budget and What Fits in It
          </Link>
          . This dashboard is just one more thing that fits inside it.
        </p>

        <h2 className="text-2xl font-semibold text-text-primary pt-4">If you run a site, you should do this too</h2>

        <p>
          Whatever your stack is, you can probably spend a Saturday afternoon parsing user-agent
          strings on the request path and writing the breakdown to a stable URL. Most operators
          are nervous about exposing bot traffic because they think it makes them look small or
          gives crawlers a target. The opposite turns out to be true. Publishing your bot traffic
          is the strongest signal you can send that your site is built for the agent web. Crawlers
          themselves index it, your humans find it interesting, and your prospective AI users
          treat it as a credibility marker.
        </p>

        <p>
          Our worker code that does it is roughly 200 lines, sits in{' '}
          <code className="text-accent-primary font-mono text-sm">worker/src/activity.ts</code>,
          and is open source under the same MIT license as the rest of the repo. Take it. Run
          your own dashboard. Send us the URL and we will link it from ours.
        </p>

        <h2 className="text-2xl font-semibold text-text-primary pt-4">What the dashboard means in one sentence</h2>

        <p className="text-lg text-text-primary leading-relaxed">
          The agent web is real, it is hitting our servers right now, and we believe the right
          response to that is to count and publish, not to count and hide.
        </p>

        <p className="text-text-muted text-sm pt-4">
          The dashboard is at{' '}
          <Link href="/agent-traffic" className="text-accent-primary hover:underline">
            /agent-traffic
          </Link>
          . Free, no auth, refreshed every thirty seconds. The raw data is at{' '}
          <Link href="/api/agents/activity" className="text-accent-primary hover:underline">
            /api/agents/activity
          </Link>
          . The MCP shortcut is{' '}
          <code className="text-accent-primary font-mono text-sm">get_agent_activity</code>{' '}
          (no token required). Welcome to the agent web. Start watching.
        </p>
      </div>
    </article>
  );
}
