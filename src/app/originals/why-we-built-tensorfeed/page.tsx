import { Metadata } from 'next';
import Link from 'next/link';
import { ArrowLeft } from 'lucide-react';
import { ArticleJsonLd } from '@/components/seo/JsonLd';

export const metadata: Metadata = {
  title: 'Why We Built TensorFeed.ai',
  description:
    'The story behind TensorFeed.ai: how a personal frustration with scattered AI news turned into an aggregated hub built for humans and AI agents alike.',
};

export default function WhyWeBuiltTensorFeedPage() {
  return (
    <article className="max-w-3xl mx-auto px-4 sm:px-6 py-10">
      <ArticleJsonLd
        title="Why We Built TensorFeed.ai"
        description="The story behind TensorFeed.ai: how a personal frustration with scattered AI news turned into an aggregated hub built for humans and AI agents alike."
        datePublished="2026-03-28"
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
        <div className="flex items-center gap-2 text-sm text-text-muted">
          <span className="text-text-secondary font-medium">Evan Marcus</span>
          <span>&middot;</span>
          <time dateTime="2026-03-28">March 28, 2026</time>
        </div>
      </header>

      {/* Article body */}
      <div className="prose-custom space-y-6 text-text-secondary leading-relaxed">
        <p className="text-lg text-text-primary leading-relaxed">
          Every morning, I used to open somewhere between eight and fifteen browser tabs before I even
          had coffee. Hacker News for general tech chatter. Twitter for the hot takes. The OpenAI blog
          in case they dropped something overnight. Anthropic&apos;s changelog. Google DeepMind&apos;s
          research page. A couple of Discord servers. Maybe a subreddit or two. It was exhausting, and
          I wasn&apos;t even reading most of it.
        </p>

        <p>
          That ritual is what eventually became TensorFeed. Not because I had some grand startup vision,
          but because I was genuinely annoyed. The AI space moves faster than any technology space I&apos;ve
          ever worked in, and there was no single place that pulled it all together in a way that
          respected my time.
        </p>

        <h2 className="text-2xl font-semibold text-text-primary pt-4">The Problem Was Obvious</h2>

        <p>
          AI news is scattered across a dozen platforms, each with its own format and agenda. Twitter
          rewards hot takes over substance. Reddit buries important announcements under memes. Official
          blogs publish on their own schedule with their own spin. Research papers land on arXiv with
          zero context for practitioners.
        </p>

        <p>
          If you&apos;re a developer building on top of these models, you need to know when a new version
          ships, when pricing changes, when an API goes down, and when a competitor releases something
          that might change your architecture decisions. You shouldn&apos;t have to piece that together
          from fifteen sources every morning.
        </p>

        <p>
          I talked to other developers and the frustration was universal. Everyone had their own
          cobbled-together system of bookmarks, RSS feeds, and notification channels. Nobody was happy
          with it.
        </p>

        <h2 className="text-2xl font-semibold text-text-primary pt-4">One Hub, No Noise</h2>

        <p>
          The core idea behind TensorFeed is simple: aggregate everything important in AI into one
          clean feed. Model releases, API updates, pricing changes, research breakthroughs, industry
          news. All of it, from every major source, organized and filterable.
        </p>

        <p>
          We pull from official provider blogs, research repositories, developer changelogs, and
          curated community sources. Everything gets categorized and tagged so you can drill into
          exactly what matters to you. If you only care about open-source model releases, you can
          filter for that. If you want to track pricing across providers, we have a dedicated view
          for it.
        </p>

        <p>
          The goal was never to replace deep-dive journalism or original research. It&apos;s to be the
          first place you check in the morning, the one tab that replaces all the others.
        </p>

        <h2 className="text-2xl font-semibold text-text-primary pt-4">Built for Humans and Agents</h2>

        <p>
          Here&apos;s where TensorFeed gets a little different from a typical news aggregator. From day
          one, we designed the platform to serve two audiences: human readers and AI agents.
        </p>

        <p>
          That sounds like a buzzword, but it&apos;s practical. AI agents are increasingly browsing the
          web, pulling data from APIs, and making decisions based on structured information. If an
          agent needs to know which model provider offers the cheapest embedding API right now, it
          should be able to query TensorFeed and get a clean, structured answer.
        </p>

        <p>
          We publish an <code className="text-accent-cyan bg-bg-tertiary px-1.5 py-0.5 rounded text-sm">llms.txt</code> file,
          serve structured JSON endpoints, and think carefully about how our data is formatted for
          machine consumption. The human experience comes first, always. But the agent experience is
          a close second.
        </p>

        <h2 className="text-2xl font-semibold text-text-primary pt-4">The Tech Stack</h2>

        <div className="bg-bg-secondary border border-border rounded-lg p-5">
          <p className="text-text-primary font-medium mb-3">What powers TensorFeed:</p>
          <ul className="space-y-2 text-sm">
            <li><span className="text-accent-primary font-medium">Frontend:</span> Next.js 14 with App Router, Tailwind CSS, TypeScript</li>
            <li><span className="text-accent-primary font-medium">Data:</span> Aggregation pipelines pulling from 40+ sources</li>
            <li><span className="text-accent-primary font-medium">Infrastructure:</span> Vercel for hosting, edge functions for API routes</li>
            <li><span className="text-accent-primary font-medium">AI:</span> Claude for content processing and summarization</li>
          </ul>
        </div>

        <p>
          We chose Next.js because it gives us server-side rendering for SEO, great performance out
          of the box, and the App Router makes organizing a content-heavy site surprisingly pleasant.
          Tailwind keeps our styling consistent without the overhead of a component library.
        </p>

        <p>
          The real complexity lives in the data layer. Aggregating from dozens of sources, normalizing
          formats, deduplicating content, and categorizing everything accurately is the hard part.
          We use AI assistance for some of this, but there&apos;s a lot of hand-tuned logic to make sure
          the feed stays high quality.
        </p>

        <h2 className="text-2xl font-semibold text-text-primary pt-4">Part of a Bigger Picture</h2>

        <p>
          TensorFeed isn&apos;t a standalone project. It&apos;s part of a family of sites that I&apos;m building
          under Pizza Robot Studios. <a href="https://vr.org" className="text-accent-primary hover:underline">VR.org</a> covers
          the virtual reality and spatial computing space with the same aggregation approach.{' '}
          <a href="https://terminalfeed.io" className="text-accent-primary hover:underline">TerminalFeed.io</a> is
          focused on developer tools, CLI workflows, and terminal productivity.
        </p>

        <p>
          Each site serves a specific community, but they share the same philosophy: aggregate the
          signal, cut the noise, and make the information accessible to both humans and machines.
          The tech stack and design patterns flow between all three projects, which means improvements
          to one benefit the others.
        </p>

        <h2 className="text-2xl font-semibold text-text-primary pt-4">What Comes Next</h2>

        <p>
          We&apos;re just getting started. The feed is live, the data is flowing, and we&apos;re iterating
          fast based on feedback from the community. Here&apos;s what&apos;s on the roadmap:
        </p>

        <ul className="list-disc list-inside space-y-2 pl-2">
          <li>Personalized feeds that learn what you care about over time</li>
          <li>Real-time alerts for breaking model releases and API changes</li>
          <li>A public API so developers can build on top of our aggregated data</li>
          <li>Deeper comparison tools for model pricing, performance, and capabilities</li>
          <li>Community features so readers can discuss and annotate the news</li>
        </ul>

        <p>
          The AI space is moving fast, and we intend to keep up. If you have ideas for what TensorFeed
          should become, I genuinely want to hear them. Drop me a note at{' '}
          <a href="mailto:evan@tensorfeed.ai" className="text-accent-primary hover:underline">evan@tensorfeed.ai</a>{' '}
          or find us on social media.
          This thing is being built in public, and community input shapes what we prioritize.
        </p>

        <p>
          Thanks for reading, and thanks for being here early. Let&apos;s see where this goes.
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
