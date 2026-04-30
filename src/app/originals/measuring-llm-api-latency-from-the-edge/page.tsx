import { Metadata } from 'next';
import Link from 'next/link';
import { ArrowLeft, Clock } from 'lucide-react';
import { ArticleJsonLd } from '@/components/seo/JsonLd';
import AdPlaceholder from '@/components/AdPlaceholder';

export const metadata: Metadata = {
  title: 'Provider Status Pages Are Marketing. We Built Our Own LLM Probes.',
  description:
    'Most LLM provider status pages are politically managed. They underreport partial outages, hide latency drift, and never publish per-day SLA. Today we shipped active probing that measures what we see from Cloudflare\'s edge across Anthropic, Google, Mistral, and Cohere. The methodology, the first hour of data, and what comes next.',
  openGraph: {
    title: 'Provider Status Pages Are Marketing. We Built Our Own LLM Probes.',
    description:
      'TensorFeed now measures LLM API latency and uptime from Cloudflare\'s edge. Active probes against Anthropic, Google, Mistral, and Cohere every 15 minutes. The data is unique because it is measured, not self-reported.',
    type: 'article',
    publishedTime: '2026-04-29T17:00:00Z',
    authors: ['Ripper'],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Provider Status Pages Are Marketing. We Built Our Own LLM Probes.',
    description: 'Active LLM SLA measurement from Cloudflare\'s edge. Free endpoint, weekly reports starting next week.',
  },
};

export default function MeasuringLlmApiLatencyPage() {
  return (
    <article className="max-w-3xl mx-auto px-4 sm:px-6 py-10">
      <ArticleJsonLd
        title="Provider Status Pages Are Marketing. We Built Our Own LLM Probes."
        description="TensorFeed now measures LLM API latency and uptime from Cloudflare's edge. Active probes against Anthropic, Google, Mistral, and Cohere every 15 minutes. The data is unique because it is measured, not self-reported."
        datePublished="2026-04-29"
        author="Ripper"
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
          Provider Status Pages Are Marketing. We Built Our Own LLM Probes.
        </h1>
        <div className="flex items-center gap-3 text-sm text-text-muted">
          <span className="text-text-secondary font-medium">Ripper</span>
          <span>&middot;</span>
          <time dateTime="2026-04-29">April 29, 2026</time>
          <span>&middot;</span>
          <span className="flex items-center gap-1">
            <Clock className="w-3.5 h-3.5" />
            6 min read
          </span>
        </div>
      </header>

      {/* Article body */}
      <div className="prose-custom space-y-6 text-text-secondary leading-relaxed">
        <p className="text-lg text-text-primary leading-relaxed">
          Every major LLM provider runs a status page. They look reassuring. They
          are also, almost without exception, politically managed. Partial
          outages get downgraded to &ldquo;some users may experience elevated
          latency.&rdquo; Regional brownouts vanish from the timeline once
          they&apos;re fixed. The aggregate SLA number on the page reads
          &ldquo;99.9% over the trailing 30 days&rdquo; in a typeface chosen by
          a designer who has never been paged at 3 a.m.
        </p>

        <p>
          If you build agents, this is a real problem. Your routing logic needs
          to know when a provider is slow, not when its status page admits a
          provider is slow. Those are different signals, and the gap between
          them is where customer trust dies.
        </p>

        <p>
          So today we shipped something. TensorFeed now actively measures LLM
          provider latency and availability from Cloudflare&apos;s edge.
        </p>

        <h2 className="text-2xl font-semibold text-text-primary pt-4">What We Measure</h2>

        <p>
          Every fifteen minutes, our Worker fires a single short prompt at each
          provider whose key we&apos;ve configured. We record:
        </p>

        <ul className="list-disc pl-6 space-y-2">
          <li>HTTP status code (the truth, not what the status page says)</li>
          <li>Time to first response byte</li>
          <li>Total response time including the body read</li>
          <li>Whether the response shape was a valid completion</li>
          <li>Tokens consumed, for cost normalization</li>
        </ul>

        <p>
          Results stream into a 24-hour ring buffer per provider. A pre-computed
          summary updates on every cycle and is exposed at{' '}
          <Link
            href="https://tensorfeed.ai/api/probe/latest"
            className="text-accent-primary hover:underline"
          >
            /api/probe/latest
          </Link>{' '}
          for free, no auth, no signup. A daily roll-up cron creates a per-day
          aggregate that backs the premium time-series endpoint at{' '}
          <code className="text-accent-secondary">/api/premium/probe/series</code>.
          Two endpoints, one moat that compounds for as long as we keep the
          cron running.
        </p>

        <h2 className="text-2xl font-semibold text-text-primary pt-4">
          Day Zero, Four Providers
        </h2>

        <p>
          We launched today with measured probing across four providers:
          Anthropic, Google, Mistral, and Cohere. OpenAI sits out for now;
          adding it is one secret away if we choose. Each provider was a
          deliberate choice. They cover the spectrum from the well-funded big
          three (Anthropic, Google, OpenAI) down to the credible challengers
          (Mistral, Cohere) that often beat the big three on speed.
        </p>

        <p>
          The first hour of measurements already produced a finding I did not
          expect. Cohere&apos;s p50 time-to-first-byte from Cloudflare&apos;s
          edge clocked in at 264 milliseconds. Mistral landed around 500.
          Google around 606. Anthropic, on Claude Haiku 4.5 with our smallest
          possible prompt, came in north of 5,000.
        </p>

        <p>
          That number deserves caveats and they are honest ones. Two probes is
          not a steady-state measurement. Cold-start effects matter. Edge
          routing matters. The model could be returning before our fetch
          buffer drains. We will have a fair answer in seven days. But the
          shape of the data is already telling. The fastest API in our sample
          is Cohere, not the provider you would guess from press releases.
        </p>

        <p>
          This is exactly why the dataset matters. Marketing will tell you
          which model is &ldquo;state of the art.&rdquo; Routing decisions
          care about something else. They care about the request that just
          left your code returning before your user gives up.
        </p>

        <h2 className="text-2xl font-semibold text-text-primary pt-4">
          Why This Compounds
        </h2>

        <p>
          The economic case for the system is simple. Probe cost across all
          four providers is roughly ten cents a month at our cadence. Per-
          provider daily call cap is hard-coded in our worker so a runaway
          cron cannot empty an Anthropic balance. The data we generate is
          something nobody else publishes systematically.
        </p>

        <p>
          Day zero is a snapshot. Day ninety is a 90-day SLA history per
          provider that anyone building an agent can query for one credit.
          Year one is a measured comparison nobody can match without having
          started measuring on day one. That is the whole game with this
          kind of data. You cannot backfill a time series. Either the
          probes ran or they did not.
        </p>

        <p>
          We started the probes today.
        </p>

        <h2 className="text-2xl font-semibold text-text-primary pt-4">
          What Comes Next
        </h2>

        <p>
          A few things are on the runway. First, weekly SLA reports starting
          next Monday. Per-provider uptime, p50 / p95 / p99 latency, notable
          incident hours, all from our own measurements. We will publish them
          as originals on this site and structure the data so anyone can cite
          it. Second, more providers as the moat justifies them: OpenAI,
          Groq, Together, DeepInfra, regional alternates. Third, regional
          probes from multiple Cloudflare points of presence so we can see
          when a problem is global versus local.
        </p>

        <p>
          For agent builders reading this: hit{' '}
          <Link
            href="https://tensorfeed.ai/api/probe/latest"
            className="text-accent-primary hover:underline"
          >
            /api/probe/latest
          </Link>{' '}
          right now. It returns a summary of the last 24 hours of measured
          provider latency across whatever providers we have keys configured
          for. It is free. There is no rate limit beyond our normal IP cap.
          If you want the historical series, the premium endpoint is one
          credit per call and accepts USDC on Base mainnet without an
          account.
        </p>

        <p>
          For the rest of you, just follow along. Next Monday&apos;s report
          will be the first one with enough data to actually mean something.
        </p>

        <p className="text-sm text-text-muted italic pt-6">
          This article was written on the same day the probing system shipped
          to production. Numbers cited reflect the first hour of measurements
          and will be refined in the first weekly report.
        </p>

        <AdPlaceholder slot="article-bottom" />
      </div>
    </article>
  );
}
