import { Metadata } from 'next';
import Link from 'next/link';
import { ArrowLeft, Clock, CheckCircle2 } from 'lucide-react';
import { ArticleJsonLd } from '@/components/seo/JsonLd';
import AdPlaceholder from '@/components/AdPlaceholder';
import ArticleHero from '@/components/originals/ArticleHero';
import ShareBar from '@/components/originals/ShareBar';

export const metadata: Metadata = {
  title:
    "The Verified Feed Is Live: Cross-Source Story Corroboration for AI Agents",
  description:
    'Agents acting on a single source is the real failure mode of the autonomous web, not model hallucinations. TensorFeed just shipped a verification product that filters news to stories with N+ independent sources corroborating, computed nightly via embedding-based clustering. Inside how it works, why only the cross-source view enables it, and why the AFTA federation makes it compound.',
  openGraph: {
    title: 'The Verified Feed Is Live: Cross-Source Story Corroboration for AI Agents',
    description:
      'Single-source attribution is the real agent failure mode, not hallucinations. Inside the verification product TensorFeed shipped tonight: embedding-based story clustering across 12 RSS sources, premium "verified across N sources" feed, free preview at 25 clusters/day. Uniquely possible because only TF has the cross-source view at scale.',
    type: 'article',
    publishedTime: '2026-05-09T05:00:00Z',
    authors: ['Marcus Chen'],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'The Verified Feed Is Live: Cross-Source Story Corroboration for Agents',
    description:
      'Embedding-based story clustering across 12 RSS sources. Premium "verified across N sources" feed at $0.02 USDC. The trust layer agents need to stop acting on single-source news.',
  },
};

export default function VerifiedFeedTrustLayerPage() {
  return (
    <article className="max-w-3xl mx-auto px-4 sm:px-6 py-10">
      <ArticleJsonLd
        title="The Verified Feed Is Live: Cross-Source Story Corroboration for AI Agents"
        description="Agents acting on single sources is the real failure mode, not hallucinations. TensorFeed shipped a verification product tonight that filters news to stories with N+ independent sources corroborating, computed nightly via embedding-based clustering."
        datePublished="2026-05-09"
        author="Marcus Chen"
      />

      <Link
        href="/originals"
        className="inline-flex items-center gap-1.5 text-sm text-text-muted hover:text-accent-primary transition-colors mb-8"
      >
        <ArrowLeft className="w-4 h-4" />
        Back to Originals
      </Link>

      <ArticleHero
        mode="graphic"
        icon={CheckCircle2}
        gradientFrom="#0F2A1F"
        gradientTo="#10B981"
        eyebrow="Analysis · Trust Infrastructure"
      />

      <header className="mb-6">
        <h1 className="text-3xl sm:text-4xl font-bold text-text-primary mb-4 leading-tight">
          The Verified Feed Is Live: Cross-Source Story Corroboration for AI Agents
        </h1>
        <div className="flex items-center gap-3 text-sm text-text-muted">
          <span className="text-text-secondary font-medium">Marcus Chen</span>
          <span>&middot;</span>
          <time dateTime="2026-05-09">May 9, 2026</time>
          <span>&middot;</span>
          <span className="flex items-center gap-1">
            <Clock className="w-3.5 h-3.5" />
            6 min read
          </span>
        </div>
      </header>

      <ShareBar
        path="/originals/verified-feed-trust-layer"
        title="The Verified Feed: Cross-Source Story Corroboration for AI Agents"
      />

      <div className="prose-custom space-y-6 text-text-secondary leading-relaxed">
        <p className="text-lg text-text-primary leading-relaxed">
          Most discourse about AI safety in 2026 is focused on the wrong failure
          mode. People keep talking about hallucinations. Agents make up facts.
          That problem is real but bounded; modern frontier models hallucinate at
          single-digit rates on well-grounded queries, and improving steadily.
          The actual failure mode that&apos;s about to bite the autonomous economy
          is uglier and underappreciated: agents acting on a single source.
        </p>

        <p>
          When a finance agent reads a news headline that turns out to be
          fabricated and executes a trade on it, the model didn&apos;t hallucinate.
          The model read the source faithfully. The source was wrong. The agent
          had no way to know. That&apos;s a different problem and it requires a
          different fix, and tonight we shipped that fix.
        </p>

        <h2 className="text-2xl font-semibold text-text-primary pt-4">What we shipped</h2>

        <p>
          As of tonight, TensorFeed has a working verification layer on top of
          its news aggregation. The mechanic is simple to describe and not simple
          to build:
        </p>

        <ol className="list-decimal pl-6 space-y-2">
          <li>
            We poll 12 distinct AI news sources hourly. The list lives at{' '}
            <Link href="/api/history/news/sources" className="text-accent-primary hover:underline">
              /api/history/news/sources
            </Link>
            . Anthropic&apos;s blog, OpenAI&apos;s blog, Google AI, Meta AI,
            HuggingFace, Hacker News, TechCrunch, The Verge, Ars Technica,
            VentureBeat, NVIDIA, ZDNet.
          </li>
          <li>
            Every UTC night at 07:30, the daily cluster cron embeds yesterday&apos;s
            news (title plus snippet) via Cloudflare Workers AI on the
            <code className="bg-bg-secondary px-1.5 py-0.5 rounded text-xs mx-1">
              @cf/baai/bge-base-en-v1.5
            </code>
            model.
          </li>
          <li>
            Articles are clustered by cosine similarity at threshold 0.82 using
            single-link grouping. Stories about the same event from different
            sources collapse into one cluster regardless of phrasing.
          </li>
          <li>
            Each cluster is tagged with a corroboration band: <strong>single</strong>{' '}
            (1 source, default skeptical), <strong>limited</strong> (2 to 3
            sources), <strong>broad</strong> (4 or more independent sources).
            The hero article (earliest publishedAt) gets surfaced; the
            contributing article IDs all stay in the payload so an agent can
            cross-reference.
          </li>
          <li>
            Two new endpoints expose the result. Free at{' '}
            <Link href="/api/history/news/clusters" className="text-accent-primary hover:underline">
              /api/history/news/clusters
            </Link>
            {' '}with a 25-cluster cap and an optional <code className="bg-bg-secondary px-1 py-0.5 rounded text-xs">?min_sources=</code>{' '}
            filter, and premium at{' '}
            <Link href="/api/premium/history/news/verified" className="text-accent-primary hover:underline">
              /api/premium/history/news/verified
            </Link>
            {' '}for the unfiltered &quot;cleared the trust threshold&quot; feed.
            $0.02 USDC per call. Same AFTA-certified, x402-billable rail as the
            rest of the premium catalog.
          </li>
        </ol>

        <p>
          Concretely, an agent asking &quot;was the FDA approval news this morning
          actually reported by major outlets, or did it surface in one place&quot;
          now hits a single endpoint that returns either a cluster with
          source_count=5 (act on it) or source_count=1 (do not). That decision
          previously required either parallel calls to multiple news APIs or a
          custom NLP pipeline the agent&apos;s developer didn&apos;t want to
          maintain.
        </p>

        <h2 className="text-2xl font-semibold text-text-primary pt-4">Why this is harder than it looks</h2>

        <p>
          The naive version of cross-source verification is URL-based dedup. Two
          articles with the same URL collapse. That misses 90% of real-world
          corroboration because Reuters and Bloomberg and Anthropic&apos;s own
          blog all have different URLs even when they&apos;re reporting the same
          event.
        </p>

        <p>
          The next-naive version is title-similarity matching via Jaccard or
          n-gram overlap. Better, still wrong. It fails on rephrasing
          (&quot;Anthropic ships Mythos&quot; vs &quot;Mythos: Inside Anthropic&apos;s
          Latest Model&quot;) which IS the cross-source signal we&apos;re trying
          to catch. Different newsrooms phrase the same story differently. That&apos;s
          not noise; that&apos;s the data.
        </p>

        <p>
          The right version is semantic. You embed the title and snippet into a
          dense vector space and cluster by cosine similarity. The
          bge-base-en-v1.5 model has been around for two years; it&apos;s small,
          fast, free on Cloudflare Workers AI, and adequate for our scale
          (roughly 200 articles per day). The whole nightly clustering pass
          fits inside the free Workers AI tier of 10,000 neurons per day with
          comfortable headroom. The infrastructure is genuinely cheap; what was
          hard was committing to which architecture and tuning the threshold.
        </p>

        <p>
          Threshold 0.82 is what we shipped after sketching the trade-off
          space. Anything above 0.85 is too tight (rephrasings get split
          apart); anything below 0.78 is too loose (unrelated stories from the
          same newsroom collide because they share boilerplate). 0.82 sits in
          the sweet spot for English news headlines plus snippets. We expect
          to tune this empirically over the next two weeks of real production
          data.
        </p>

        <AdPlaceholder format="in-article" className="my-8" />

        <h2 className="text-2xl font-semibold text-text-primary pt-4">Why TensorFeed could ship it</h2>

        <p>
          The verification product structurally requires the cross-source view
          at scale. A publisher that aggregates one or two sources can&apos;t
          generate meaningful corroboration counts; the math demands a wide
          input distribution. That&apos;s why this product was always going to
          live with someone like TensorFeed rather than a model vendor. We
          aggregate from 12 distinct AI-relevant sources hourly and have been
          doing it long enough to ship the cluster cron without rebuilding
          the underlying ingest layer.
        </p>

        <p>
          The Agent Fair-Trade Agreement plays into this directly. As the AFTA
          federation grows beyond TensorFeed and TerminalFeed.io, the
          corroboration math composes across publishers. A future state where
          five federation members publish their own news streams means
          &quot;verified across N sources&quot; can include cross-publisher
          consensus, which is a strictly stronger trust signal than
          intra-publisher consensus alone. The schema we shipped tonight
          reserves the array shape for that future without committing to it
          today.
        </p>

        <h2 className="text-2xl font-semibold text-text-primary pt-4">What this is not</h2>

        <p>
          It is not a fact-check. We do not validate the underlying claim,
          only that multiple independent sources reported the same story.
          When five sources all repeat a press release verbatim, the verified
          feed will tag the story as broadly corroborated even if the press
          release itself is misleading. That&apos;s a known limitation. Adding
          a fact-check layer is a separate product that requires a different
          input pipeline.
        </p>

        <p>
          It is also not a real-time signal. Stories that break inside the
          last hour have not had time for other sources to react. Tonight&apos;s
          verification model is end-of-UTC-day; the cluster is computed
          against everything we polled up to the day&apos;s last hourly RSS
          run. Real-time clustering is a future iteration if usage demands it.
        </p>

        <h2 className="text-2xl font-semibold text-text-primary pt-4">What&apos;s queued</h2>

        <p>
          Phase B.1 captured the foundation: per-source RSS reliability scores
          and daily news snapshots, persisting from May 8. Phase B.2 (this ship)
          adds clustering and the verified feed. Phase B.3 layers an anomaly
          detector on top of the source-health series, flagging days where a
          source went silent or spiked or where the corroboration distribution
          shifted unusually. That detector needs roughly 14 days of source-health
          baseline before it produces useful output, which lands us around
          May 22, 2026.
        </p>

        <p>
          Beyond Phase B, the longer-term plays are cross-publisher verification
          (when the AFTA federation grows past two members) and a per-source
          tier system that scores T1 first-party vendor blogs differently from
          T3 aggregator wires. The data foundation we shipped tonight makes
          both of those a forward-only build.
        </p>

        <h2 className="text-2xl font-semibold text-text-primary pt-4">Try it</h2>

        <p>
          The first cron runs at 07:30 UTC tomorrow morning, embedding today&apos;s
          news. By tomorrow afternoon both endpoints return real cluster data.
          Until then, the endpoints respond with empty cluster arrays, which
          is the correct behavior for a not-yet-populated date.
        </p>

        <ul className="list-disc pl-6 space-y-2">
          <li>
            Free, no auth:{' '}
            <Link href="/api/history/news/clusters" className="text-accent-primary hover:underline">
              /api/history/news/clusters?date=YYYY-MM-DD
            </Link>
          </li>
          <li>
            Premium verified feed at $0.02 USDC:{' '}
            <Link href="/api/premium/history/news/verified" className="text-accent-primary hover:underline">
              /api/premium/history/news/verified?date=&amp;min_sources=4
            </Link>
          </li>
          <li>
            Premium full clusters:{' '}
            <Link href="/api/premium/history/news/clusters/full" className="text-accent-primary hover:underline">
              /api/premium/history/news/clusters/full?date=YYYY-MM-DD
            </Link>
          </li>
        </ul>

        <p>
          The autonomous economy is going to grow up the same way every other
          economy grew up: trust infrastructure compounds with the volume of
          transactions running through it. We just shipped the trust layer
          for one specific surface. There&apos;s a long road of building
          others.
        </p>
      </div>

      <footer className="mt-12 pt-8 border-t border-border">
        <h2 className="text-lg font-semibold text-text-primary mb-4">Related</h2>
        <div className="grid gap-3">
          <Link
            href="/originals/ai-cyber-tier-data-layer"
            className="block bg-bg-secondary border border-border rounded-lg px-4 py-3 hover:border-accent-primary transition-colors"
          >
            <span className="text-text-primary text-sm">The AI Cyber Tier Now Has a Data Layer. It Is Token-Optimized, Pay-Per-Call, and Live.</span>
          </Link>
          <Link
            href="/originals/ai-week-may-8-2026"
            className="block bg-bg-secondary border border-border rounded-lg px-4 py-3 hover:border-accent-primary transition-colors"
          >
            <span className="text-text-primary text-sm">This Week in AI: The Mythos Effect, $200B for Google, and an FDA for Models</span>
          </Link>
          <Link
            href="/agent-fair-trade"
            className="block bg-bg-secondary border border-border rounded-lg px-4 py-3 hover:border-accent-primary transition-colors"
          >
            <span className="text-text-primary text-sm">The Agent Fair-Trade Agreement (open standard)</span>
          </Link>
        </div>
      </footer>

      <AdPlaceholder format="horizontal" className="mt-10" />

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
