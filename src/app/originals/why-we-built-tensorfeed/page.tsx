import { Metadata } from 'next';
import Link from 'next/link';
import { ArrowLeft, Clock } from 'lucide-react';
import { ArticleJsonLd } from '@/components/seo/JsonLd';

import ShareBar from '@/components/originals/ShareBar';
export const metadata: Metadata = {
  alternates: { canonical: 'https://tensorfeed.ai/originals/why-we-built-tensorfeed' },
  title: 'Why We Built TensorFeed.ai',
  description:
    'The origin story of TensorFeed.ai. Why existing AI news sources fell short, the decision to build for AI agents as a first-class audience, and what makes TensorFeed different from every other aggregator.',
  openGraph: {
    title: 'Why We Built TensorFeed.ai',
    description: 'The origin story of TensorFeed.ai. Why existing AI news sources fell short and the decision to build for humans and AI agents.',
    type: 'article',
    publishedTime: '2026-03-18T12:00:00Z',
    authors: ['Ripper'],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Why We Built TensorFeed.ai',
    description: 'The origin story of TensorFeed.ai. Why existing AI news sources fell short and the decision to build for humans and AI agents.',
  },
};

export default function WhyWeBuiltTensorFeedPage() {
  return (
    <article className="max-w-3xl mx-auto px-4 sm:px-6 py-10">
      <ArticleJsonLd
        title="Why We Built TensorFeed.ai"
        description="The origin story of TensorFeed.ai. Why existing AI news sources fell short, the decision to build for AI agents as a first-class audience, and what makes TensorFeed different."
        datePublished="2026-03-18"
      />

      {/* Back link */}
      <Link
        href="/originals"
        className="inline-flex items-center gap-1.5 text-sm text-text-muted hover:text-accent-primary transition-colors mb-8"
      >
        <ArrowLeft className="w-4 h-4" />
        Back to Originals
      </Link>

      {/* Header */}
      <header className="mb-10">
        <h1 className="text-3xl sm:text-4xl font-bold text-text-primary mb-4 leading-tight">
          Why We Built TensorFeed.ai
        </h1>
        <div className="flex items-center gap-3 text-sm text-text-muted">
          <span className="text-text-secondary font-medium">Ripper</span>
          <span>&middot;</span>
          <time dateTime="2026-03-18">March 18, 2026</time>
          <span>&middot;</span>
          <span className="flex items-center gap-1">
            <Clock className="w-3.5 h-3.5" />
            5 min read
          </span>
        </div>
      </header>

      <ShareBar
        path="/originals/why-we-built-tensorfeed"
        title="Why We Built TensorFeed.ai"
      />
      {/* Article body */}
      <div className="prose-custom space-y-6 text-text-secondary leading-relaxed">
        <p className="text-lg text-text-primary leading-relaxed">
          I used to start every morning the same way. Open a dozen tabs. Hacker News, the OpenAI blog,
          Anthropic&apos;s changelog, Google DeepMind research, a couple Discord servers, maybe a subreddit
          or two. Scroll through everything. Close most of it. Repeat the next day. It was a ritual, and
          honestly, it was exhausting.
        </p>

        <p>
          That frustration is what eventually became TensorFeed. Not because I had some grand startup thesis
          or a slide deck with a TAM calculation. Because I was tired of doing the same scavenger hunt every
          single morning and still feeling like I was missing things.
        </p>

        <h2 className="text-2xl font-semibold text-text-primary pt-4">The AI News Problem</h2>

        <p>
          If you work in AI or build on top of AI APIs, you already know this pain. The information is out
          there, but it&apos;s scattered across a dozen platforms, each with its own format and its own
          incentives. Twitter rewards hot takes over substance. Reddit buries important announcements under
          memes. Official company blogs publish on their own schedule with their own spin. Research papers
          land on arXiv with zero context for practitioners who just want to know if a new technique
          actually matters.
        </p>

        <p>
          And the volume keeps growing. In January 2025, there were maybe two or three notable model
          releases per month. By early 2026, we&apos;re seeing multiple releases per week. Pricing changes,
          API deprecations, new frameworks, new standards. The firehose is real.
        </p>

        <p>
          I talked to other developers about this. The frustration was universal. Everyone had their own
          cobbled system of bookmarks and RSS readers and notification channels. Nobody was happy with it.
          Every person I talked to said some version of the same thing: &quot;I just want one place that
          has everything.&quot;
        </p>

        <h2 className="text-2xl font-semibold text-text-primary pt-4">So I Built That Place</h2>

        <p>
          TensorFeed started as a personal project. A Next.js app pulling RSS feeds from the major AI
          company blogs and tech outlets, dumping them into a single timeline. Nothing fancy. Just the
          headlines I cared about, in one place, updated automatically.
        </p>

        <p>
          But it grew fast. I added source filtering so you could drill into just Anthropic news, or just
          open-source releases. I added the{' '}
          <Link href="/status" className="text-accent-primary hover:underline">status dashboard</Link> because
          I was constantly checking whether Claude or GPT was down during development. I added{' '}
          <Link href="/models" className="text-accent-primary hover:underline">model tracking</Link> because
          keeping up with which version of which model supported which context window was becoming its own
          full-time job.
        </p>

        <p>
          Each feature started the same way: I needed it for myself, so I built it. The{' '}
          <Link href="/tools/cost-calculator" className="text-accent-primary hover:underline">cost calculator</Link> came
          from a spreadsheet I was maintaining to compare API pricing across providers. The{' '}
          <Link href="/alerts" className="text-accent-primary hover:underline">outage alerts</Link> came
          from the third time I lost twenty minutes debugging my code before realizing the API itself was
          down.
        </p>

        <h2 className="text-2xl font-semibold text-text-primary pt-4">Building for Agents (Not Just Humans)</h2>

        <p>
          Here&apos;s the part that makes TensorFeed genuinely different from other aggregators.
        </p>

        <p>
          From the very beginning, I designed it to serve two audiences: human readers and AI agents. That
          might sound like marketing fluff, but it&apos;s an actual architectural decision that shaped every
          part of the platform. Every piece of content on TensorFeed has structured metadata. Category tags,
          source attribution, timestamps, entity references. The kind of stuff that&apos;s invisible to most
          human readers but critical for an agent that needs to filter, sort, and analyze AI news
          programmatically.
        </p>

        <p>
          We publish an{' '}
          <code className="text-accent-cyan bg-bg-tertiary px-1.5 py-0.5 rounded text-sm">llms.txt</code> file
          that tells AI agents exactly what TensorFeed offers and how to interact with it. Think of it like{' '}
          <code className="text-accent-cyan bg-bg-tertiary px-1.5 py-0.5 rounded text-sm">robots.txt</code> for
          the agent era. We serve structured JSON endpoints through our{' '}
          <Link href="/developers" className="text-accent-primary hover:underline">developer API</Link>.
          We provide RSS and JSON feeds that any agent or tool can consume without authentication or
          rate-limit friction.
        </p>

        <p>
          The reason is simple: I believe the next generation of information tools will be used as much by
          AI agents acting on behalf of humans as by humans directly. An agent working for a developer
          should be able to ask &quot;What changed in the AI API landscape this week?&quot; and get a clean,
          structured answer from TensorFeed. That&apos;s the future I&apos;m building for.
        </p>

        <h2 className="text-2xl font-semibold text-text-primary pt-4">The TerminalFeed Connection</h2>

        <p>
          TensorFeed isn&apos;t a standalone project. It&apos;s part of a family of sites I&apos;m building
          under Pizza Robot Studios.{' '}
          <a href="https://terminalfeed.io" className="text-accent-primary hover:underline" target="_blank" rel="noopener noreferrer">
            TerminalFeed.io
          </a>{' '}
          is the sister site, focused on real-time data feeds and dashboards. Same philosophy: aggregate
          the signal, cut the noise, serve both humans and machines.
        </p>

        <p>
          The tech stack and design patterns flow between both projects. An improvement to one benefits the
          other. The Cloudflare Workers backend, the KV caching architecture, the feed aggregation
          pipeline. All of it is shared DNA.
        </p>

        <h2 className="text-2xl font-semibold text-text-primary pt-4">What Makes This Different</h2>

        <p>
          There are other AI news aggregators out there. I won&apos;t pretend there aren&apos;t. But most of
          them are doing one of two things: either they&apos;re glorified RSS readers with no curation, or
          they&apos;re editorial outlets that publish a handful of articles per day and miss everything else.
        </p>

        <p>
          TensorFeed sits in the middle. We aggregate from 15+ sources with automatic updates every 10
          minutes. We add structured data, categorization, and status monitoring on top. We publish original
          editorial analysis (like this article). And we make all of it available through machine-readable
          endpoints for the growing ecosystem of AI agents.
        </p>

        <p>
          No paywalls. No login walls. No CAPTCHAs blocking legitimate automated access. The AI ecosystem
          is open by nature, and the tools that serve it should be too.
        </p>

        <h2 className="text-2xl font-semibold text-text-primary pt-4">Where This Goes</h2>

        <p>
          I&apos;m building TensorFeed in public, and the roadmap is shaped by what the community tells me
          they need. The{' '}
          <Link href="/agents" className="text-accent-primary hover:underline">agents directory</Link>,
          the incident database, the benchmark tracker. All of those features started as requests from
          people using the site.
        </p>

        <p>
          If you have ideas for what TensorFeed should become, I genuinely want to hear them. Drop a note
          at{' '}
          <a href="mailto:feedback@tensorfeed.ai" className="text-accent-primary hover:underline">
            feedback@tensorfeed.ai
          </a>{' '}
          or find us on X at{' '}
          <a href="https://x.com/tensorfeed" target="_blank" rel="noopener noreferrer" className="text-accent-primary hover:underline">
            @tensorfeed
          </a>.
        </p>

        <p>
          Thanks for being here early. The AI space is moving fast, and I intend to keep up. Let&apos;s see
          where this goes.
        </p>
      </div>

      {/* Footer links */}
      <div className="flex flex-wrap items-center gap-4 mt-12 pt-6 border-t border-border text-sm">
        <Link
          href="/originals"
          className="inline-flex items-center gap-1.5 text-text-muted hover:text-accent-primary transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
          Back to Originals
        </Link>
        <Link
          href="/"
          className="text-text-muted hover:text-accent-primary transition-colors"
        >
          Back to Feed
        </Link>
      </div>
    </article>
  );
}
