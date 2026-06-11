import { Metadata } from 'next';
import Link from 'next/link';
import { ArrowLeft, Clock } from 'lucide-react';
import { ArticleJsonLd } from '@/components/seo/JsonLd';

import ShareBar from '@/components/originals/ShareBar';
export const metadata: Metadata = {
  alternates: { canonical: 'https://tensorfeed.ai/originals/ai-service-outages-month' },
  title: 'I Tracked AI Service Outages for a Month. Here\'s What I Found.',
  description:
    'Real data from TensorFeed\'s incident database on AI service reliability. Which services went down most, average resolution times, when outages cluster, and what developers should plan for.',
  openGraph: {
    title: 'I Tracked AI Service Outages for a Month. Here\'s What I Found.',
    description: 'Real data on AI service reliability: which services went down most, average resolution times, and what developers should plan for.',
    type: 'article',
    publishedTime: '2026-03-27T12:00:00Z',
    authors: ['Adrian Vale'],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'I Tracked AI Service Outages for a Month. Here\'s What I Found.',
    description: 'Real data on AI service reliability: which services went down most and what developers should plan for.',
  },
};

export default function AIServiceOutagesPage() {
  return (
    <article className="max-w-3xl mx-auto px-4 sm:px-6 py-10">
      <ArticleJsonLd
        title="I Tracked AI Service Outages for a Month. Here's What I Found."
        description="Real data from TensorFeed's incident database on AI service reliability. Which services went down most, average resolution times, and what developers should plan for."
        datePublished="2026-03-27"
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
          I Tracked AI Service Outages for a Month. Here&apos;s What I Found.
        </h1>
        <div className="flex items-center gap-3 text-sm text-text-muted">
          <span className="text-text-secondary font-medium">Adrian Vale</span>
          <span>&middot;</span>
          <time dateTime="2026-03-27">March 27, 2026</time>
          <span>&middot;</span>
          <span className="flex items-center gap-1">
            <Clock className="w-3.5 h-3.5" />
            4 min read
          </span>
        </div>
      </header>

      <ShareBar
        path="/originals/ai-service-outages-month"
        title="I Tracked AI Service Outages for a Month. Here's What I Found."
      />
      {/* Article body */}
      <div className="prose-custom space-y-6 text-lg text-text-primary leading-relaxed">
        <p className="text-lg text-text-primary leading-relaxed">
          TensorFeed polls the status of every major AI service every two minutes. We&apos;ve been doing
          this since launch, and the data is starting to tell a clear story. I pulled the numbers from
          February 20 to March 20, 2026, and the results were more interesting than I expected.
        </p>

        <p>
          The short version: AI services are less reliable than you think, outages cluster in predictable
          patterns, and the differences between providers are significant enough to matter for your
          architecture decisions.
        </p>

        <h2 className="text-2xl font-semibold text-text-primary pt-4">The Scoreboard</h2>

        <p>
          Over 30 days, here&apos;s how the major services performed:
        </p>

        <div className="bg-bg-secondary border border-border rounded-lg overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border">
                <th className="text-left px-4 py-3 text-text-primary font-semibold">Service</th>
                <th className="text-left px-4 py-3 text-text-primary font-semibold">Incidents</th>
                <th className="text-left px-4 py-3 text-text-primary font-semibold">Total Downtime</th>
                <th className="text-left px-4 py-3 text-text-primary font-semibold">Avg Resolution</th>
                <th className="text-left px-4 py-3 text-text-primary font-semibold">Uptime %</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              <tr>
                <td className="px-4 py-3 text-accent-primary font-medium">Claude API</td>
                <td className="px-4 py-3">3</td>
                <td className="px-4 py-3">2h 14m</td>
                <td className="px-4 py-3">45 min</td>
                <td className="px-4 py-3 text-accent-green">99.69%</td>
              </tr>
              <tr>
                <td className="px-4 py-3 text-accent-primary font-medium">OpenAI API</td>
                <td className="px-4 py-3">7</td>
                <td className="px-4 py-3">5h 38m</td>
                <td className="px-4 py-3">48 min</td>
                <td className="px-4 py-3 text-accent-amber">99.22%</td>
              </tr>
              <tr>
                <td className="px-4 py-3 text-accent-primary font-medium">Gemini API</td>
                <td className="px-4 py-3">4</td>
                <td className="px-4 py-3">3h 22m</td>
                <td className="px-4 py-3">50 min</td>
                <td className="px-4 py-3 text-accent-green">99.53%</td>
              </tr>
              <tr>
                <td className="px-4 py-3 text-accent-primary font-medium">AWS Bedrock</td>
                <td className="px-4 py-3">2</td>
                <td className="px-4 py-3">1h 05m</td>
                <td className="px-4 py-3">32 min</td>
                <td className="px-4 py-3 text-accent-green">99.85%</td>
              </tr>
              <tr>
                <td className="px-4 py-3 text-accent-primary font-medium">Mistral Platform</td>
                <td className="px-4 py-3">5</td>
                <td className="px-4 py-3">4h 10m</td>
                <td className="px-4 py-3">50 min</td>
                <td className="px-4 py-3 text-accent-amber">99.42%</td>
              </tr>
              <tr>
                <td className="px-4 py-3 text-accent-primary font-medium">Replicate</td>
                <td className="px-4 py-3">6</td>
                <td className="px-4 py-3">7h 45m</td>
                <td className="px-4 py-3">78 min</td>
                <td className="px-4 py-3 text-accent-amber">98.92%</td>
              </tr>
            </tbody>
          </table>
        </div>

        <p>
          AWS Bedrock was the most reliable, which makes sense. It&apos;s running on Amazon&apos;s
          infrastructure with their decades of ops experience. The direct-to-provider APIs (Claude, OpenAI,
          Gemini) were in the middle. Replicate had the roughest month, with the longest total downtime and
          the slowest recovery times.
        </p>

        <h2 className="text-2xl font-semibold text-text-primary pt-4">When Outages Happen</h2>

        <p>
          This was the most interesting finding. Outages are not randomly distributed across the week. They
          cluster heavily around two patterns.
        </p>

        <p>
          <span className="text-text-primary font-medium">Tuesday and Wednesday afternoons (US Pacific).</span> This
          is when most providers do their deployments. New model versions, infrastructure updates, scaling
          changes. The deployment window is the riskiest period, and Tuesday/Wednesday catch most of it.
          Of the 27 total incidents I tracked, 14 happened on Tuesdays or Wednesdays.
        </p>

        <p>
          <span className="text-text-primary font-medium">Monday mornings (US Eastern).</span> Usage spikes
          at the start of the work week, and services that were fine over the weekend sometimes buckle
          under the sudden load increase. Five incidents happened during the Monday 8am to 11am EST window.
        </p>

        <p>
          Weekends were nearly spotless. Only two incidents happened on Saturday or Sunday across the entire
          month. If you&apos;re planning a critical demo or deadline, Saturday is statistically your safest
          bet.
        </p>

        <h2 className="text-2xl font-semibold text-text-primary pt-4">The Cascade Effect</h2>

        <p>
          Something I didn&apos;t expect: when one major provider goes down, others often degrade within
          the next hour. Not because they&apos;re technically linked, but because traffic shifts. When
          OpenAI goes down, developers switch to Claude or Gemini. The surge in requests to the fallback
          provider can push it past its capacity limits.
        </p>

        <p>
          I saw this happen twice during the tracking period. OpenAI had a significant outage on a
          Wednesday afternoon, and within 40 minutes, Claude&apos;s API response times doubled. Not a full
          outage, but enough degradation to affect production workloads. The providers know this happens,
          but the surge capacity isn&apos;t always there to absorb it.
        </p>

        <h2 className="text-2xl font-semibold text-text-primary pt-4">What Developers Should Do</h2>

        <p>
          Based on a month of data, here are my practical recommendations.
        </p>

        <p>
          <span className="text-text-primary font-medium">Always have a fallback provider.</span> If your
          production app uses Claude as the primary model, configure an OpenAI or Gemini fallback. Not as
          a theoretical plan, but as working code that&apos;s been tested. The switch should be automatic.
        </p>

        <p>
          <span className="text-text-primary font-medium">Monitor proactively.</span> Don&apos;t wait for
          your users to tell you the AI API is down. Use our{' '}
          <Link href="/status" className="text-accent-primary hover:underline">status dashboard</Link> or
          set up{' '}
          <Link href="/alerts" className="text-accent-primary hover:underline">outage alerts</Link> to
          get notified the moment a service degrades. The average time between incident start and official
          status page update was 12 minutes. That&apos;s 12 minutes your users are getting errors if
          you&apos;re only watching the provider&apos;s status page.
        </p>

        <p>
          <span className="text-text-primary font-medium">Implement circuit breakers.</span> When you
          detect elevated error rates or latency, stop sending requests and switch to your fallback
          immediately. Don&apos;t wait for the provider to confirm an outage. Your error rate is all the
          confirmation you need.
        </p>

        <p>
          <span className="text-text-primary font-medium">Cache aggressively.</span> If your AI responses
          can be cached (and many can), cache them. A cache hit that serves a slightly stale response is
          infinitely better than a failed request during an outage.
        </p>

        <h2 className="text-2xl font-semibold text-text-primary pt-4">What Comes Next</h2>

        <p>
          I&apos;m going to keep tracking this data and publishing regular updates. The one-month snapshot
          is useful, but the real value will come from tracking trends over quarters. Are services getting
          more reliable as they scale? Are deployment windows getting safer? Does competition drive better
          uptime?
        </p>

        <p>
          All of the raw data feeds into our{' '}
          <Link href="/incidents" className="text-accent-primary hover:underline">incident database</Link>,
          which is open and queryable through the API. If you want to run your own analysis or build
          monitoring into your infrastructure, it&apos;s all there.
        </p>

        <p>
          The AI services we depend on are still young. Their reliability will improve. But right now,
          treating any single provider as a guaranteed always-on service is a mistake. Plan for failure,
          build in redundancy, and keep watching the data.
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
