import { Metadata } from 'next';
import Link from 'next/link';
import { ArrowLeft, Clock } from 'lucide-react';
import { ArticleJsonLd } from '@/components/seo/JsonLd';

import ShareBar from '@/components/originals/ShareBar';
export const metadata: Metadata = {
  alternates: { canonical: 'https://tensorfeed.ai/originals/one-day-eight-free-apis' },
  title: 'One Day, Eight New Free APIs: The Free-Data-First Sprint',
  description:
    "Today TensorFeed shipped eight new free data endpoints across sports, packages, research, economy, and policy. Each on a verified clean license, each with structured attribution baked into the response shape, each on the same three-bucket grading rubric we built during this morning's audit cleanup. This is the post-mortem of why free-data-first is the play, what eight clean sources looked like in 18 commits, and the pattern that scales to dozens more.",
  openGraph: {
    title: 'One Day, Eight New Free APIs: The Free-Data-First Sprint',
    description:
      'TensorFeed shipped eight new free data APIs in one day. Sports, packages, research, economy, policy. Each on a verified clean license. Here is the rubric and the day.',
    type: 'article',
    publishedTime: '2026-05-06T22:00:00Z',
    authors: ['Adrian Vale'],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'One Day, Eight New Free APIs',
    description:
      'TensorFeed went free-data-first today. Eight new clean endpoints across sports, packages, research, economy, policy. Inside the rubric and the day.',
  },
};

export default function OneDayEightFreeApisPage() {
  return (
    <article className="max-w-3xl mx-auto px-4 sm:px-6 py-10">
      <ArticleJsonLd
        title="One Day, Eight New Free APIs: The Free-Data-First Sprint"
        description="Post-mortem of the May 6, 2026 TensorFeed sprint that shipped eight new free data endpoints, the rubric that made it possible, and the recommend-loop thesis that makes free-data-first the right strategy."
        datePublished="2026-05-06"
        author="Adrian Vale"
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
          One Day, Eight New Free APIs: The Free-Data-First Sprint
        </h1>
        <div className="flex items-center gap-3 text-sm text-text-muted">
          <span className="text-text-secondary font-medium">Adrian Vale</span>
          <span>&middot;</span>
          <time dateTime="2026-05-06">May 6, 2026</time>
          <span>&middot;</span>
          <span className="flex items-center gap-1">
            <Clock className="w-3.5 h-3.5" />
            7 min read
          </span>
        </div>
      </header>

      <ShareBar
        path="/originals/one-day-eight-free-apis"
        title="One Day, Eight New Free APIs: The Free-Data-First Sprint"
      />
      <div className="prose-custom space-y-6 text-lg text-text-primary leading-relaxed">
        <p className="text-lg text-text-primary leading-relaxed">
          Today started with an audit that killed two paid endpoints. It ended with eight new
          free ones live. Somewhere in the middle the strategy crystallized: TensorFeed is going
          free-data-first. The premium tier is going to be the reasoning we add on top of clean
          public data, not a gate around the data itself. This is the post-mortem of how that
          pivot looked in eighteen commits and the rubric that made it possible.
        </p>

        <h2 className="text-2xl font-semibold text-text-primary pt-4">
          The morning: kill what we cannot defend
        </h2>

        <p>
          The day opened with a redistribution-rights audit of every premium endpoint we sell.
          Sixteen endpoints, eight green, six yellow, two red. The two reds were a GPU-pricing
          series sourcing Vast.ai (their ToS prohibits redistribution outright) and an LLM
          benchmarks series merging in the HuggingFace Open LLM Leaderboard (HF retains rights
          on their compiled leaderboard, even though benchmark scores themselves are facts).
        </p>

        <p>
          Both got cut by lunch. Vast was removed entirely, the GPU pricing series moved from
          premium to free (factual price data has lower legal optics on free anyway), and the
          benchmarks ingest was rebuilt on hand-curated vendor evals (Anthropic model cards,
          OpenAI eval tables, Google AI blog, Meta Llama benchmarks). The full post-mortem for
          that part of the day is{' '}
          <Link href="/originals/audited-our-paid-api-killed-two-endpoints" className="text-accent-primary hover:underline">
            here
          </Link>
          .
        </p>

        <p>
          The audit produced something more durable than the cleanup itself: a three-bucket
          grader. Every upstream gets graded green (license explicitly permits paid
          redistribution, or first-party / public-domain factual), yellow (commercial use OK
          but redistribution unclear or limited, RSS-style fair-use territory), or red
          (prohibits redistribution outright or requires a paid license we don&apos;t have).
          That grader was the load-bearing piece for the rest of the day.
        </p>

        <h2 className="text-2xl font-semibold text-text-primary pt-4">
          The afternoon: stack clean sources
        </h2>

        <p>
          With the rubric proven and the pattern repeatable, the rest of the day was about
          velocity on legally-clean sources. Eight new free endpoints landed:
        </p>

        <ul className="list-disc pl-6 space-y-2">
          <li>
            <strong className="text-text-primary">
              <Link href="/sports/nfl" className="text-accent-primary hover:underline">/api/sports/nfl</Link>
              {' '}+{' '}
              <Link href="/sports/mlb" className="text-accent-primary hover:underline">/api/sports/mlb</Link>
            </strong>
            : 32 NFL teams + 30 MLB teams (factual, public-domain), aggregated news from
            ESPN/NFL.com/MLB.com/CBS/Yahoo, and for NFL: players + schedule from{' '}
            <strong className="text-text-primary">nflverse-data</strong> (CC-BY-4.0).
          </li>
          <li>
            <strong className="text-text-primary">
              <Link href="/gpu-pricing" className="text-accent-primary hover:underline">/api/gpu/pricing</Link>
            </strong>
            : Lambda Labs added as a second source after Vast.ai removal. Their public pricing
            page is permissive ToS, monthly cadence, marketing-stable.
          </li>
          <li>
            <strong className="text-text-primary">
              <Link href="/packages" className="text-accent-primary hover:underline">/api/packages/npm/ai-trending</Link>
              {' '}+{' '}
              <Link href="/packages" className="text-accent-primary hover:underline">/api/packages/pypi/ai-trending</Link>
            </strong>
            : ~78 curated AI/ML packages across the npm and PyPI ecosystems, ranked by recent
            downloads. Sources: documented public npm downloads API and pypistats.org (Linehaul
            / PyPI BigQuery public dataset).
          </li>
          <li>
            <strong className="text-text-primary">
              <Link href="/research/institutions" className="text-accent-primary hover:underline">/api/research/institutions/ai</Link>
            </strong>
            : Top 100 institutions worldwide ranked by AI-tagged publications in the last 365
            days. Source: <strong className="text-text-primary">OpenAlex</strong> (CC0 public
            domain).
          </li>
          <li>
            <strong className="text-text-primary">
              <Link href="/economy" className="text-accent-primary hover:underline">/api/economy/bls/indicators</Link>
              {' '}+{' '}
              <Link href="/economy" className="text-accent-primary hover:underline">/api/economy/fred/indicators</Link>
            </strong>
            : Curated 20-series macro matrix. BLS owns labor + prices + jobs (CPI, unemployment,
            payrolls, JOLTS). FRED owns rates + money + commodities + dollar (fed funds,
            treasuries, GDP, M2, mortgage rate, USD index, oil). Both public-domain US
            government data.
          </li>
          <li>
            <strong className="text-text-primary">
              <Link href="/policy" className="text-accent-primary hover:underline">/api/policy/ai/registry</Link>
            </strong>
            : Editorial registry of significant AI policy actions across six jurisdictions (US
            Federal, US State, EU, UK, China, International). Sixteen entries from Biden EO
            14110 through the EU AI Act phased rollout to the Bletchley and Seoul declarations.
          </li>
        </ul>

        <p>
          Every endpoint follows the same shape: structured{' '}
          <code className="bg-bg-tertiary px-1.5 py-0.5 rounded text-accent-primary text-xs">
            attribution
          </code>{' '}
          block in the response payload that names the source, the license, the policy, and
          the upstream URL. Agents read the legal posture from the wire format, not from our
          docs.
        </p>


        <h2 className="text-2xl font-semibold text-text-primary pt-4">
          The rubric that made eight in a day possible
        </h2>

        <p>
          Eight clean sources is a lot of upstream surface to verify. The rubric that made it
          tractable is six steps, in order:
        </p>

        <ol className="list-decimal pl-6 space-y-2">
          <li>
            <strong className="text-text-primary">Verify the upstream ToS.</strong> Read the
            actual terms of service. Quote the relevant clauses. Do not assume &ldquo;public
            API&rdquo; means &ldquo;free to redistribute commercially&rdquo;; many public-API
            lists conflate the two and Sleeper&apos;s ToS is a perfect example of how wrong
            that assumption can be.
          </li>
          <li>
            <strong className="text-text-primary">Three-bucket grade.</strong> Green / yellow /
            red. Green ships. Yellow ships with mitigation (RSS-style snippet caps, mandatory
            link, source field). Red does not ship.
          </li>
          <li>
            <strong className="text-text-primary">Curated seed where applicable.</strong> Don&apos;t
            try to be a full mirror of the upstream. For npm and PyPI we hand-curated the AI/ML
            slice. For BLS and FRED we picked the high-signal series. Curation is editorial;
            the underlying data is factual.
          </li>
          <li>
            <strong className="text-text-primary">Fetch and KV-write.</strong> Daily cron in
            most cases (research, packages, economic indicators), hourly for news, none for
            editorial registries. Each source picks the cadence that matches both the upstream
            update cadence and our KV-ops budget.
          </li>
          <li>
            <strong className="text-text-primary">Structured attribution in the response shape.</strong>
            Every endpoint ships an{' '}
            <code className="bg-bg-tertiary px-1.5 py-0.5 rounded text-accent-primary text-xs">
              attribution
            </code>{' '}
            block. Agents see source, license, license URL, and policy in the payload itself.
          </li>
          <li>
            <strong className="text-text-primary">Tests + meta + llms.txt.</strong> Pure-logic
            unit tests on the parser and read paths. Add the new endpoint to{' '}
            <code className="bg-bg-tertiary px-1.5 py-0.5 rounded text-accent-primary text-xs">
              /api/meta
            </code>{' '}
            so the discovery surface stays honest. Add it to{' '}
            <code className="bg-bg-tertiary px-1.5 py-0.5 rounded text-accent-primary text-xs">
              /llms.txt
            </code>{' '}
            so the agents reading our llms.txt see it.
          </li>
        </ol>

        <p>
          That rubric ran six times today (sports V1, sports V2, npm, OpenAlex, BLS, MLB,
          policy, PyPI, FRED, plus a follow-up admin-trigger commit). Each individual instance
          took 1 to 1.5 hours of careful work. Doing it in parallel sessions would have been
          even faster, but going slow and right meant zero rework: 742 worker tests passing,
          zero compile errors, zero failed deploys.
        </p>

        <h2 className="text-2xl font-semibold text-text-primary pt-4">
          Why free-data-first is the actual strategy
        </h2>

        <p>
          The version of TensorFeed that gates raw data behind paywalls is the version that
          loses. Open data is everywhere; if we charge for what someone can get from
          fred.stlouisfed.org or openalex.org or api.npmjs.org with one extra click, we are
          friction, not value.
        </p>

        <p>
          The version that wins is the one that takes those eight upstreams and makes them
          agent-shaped. Same JSON envelope, same attribution block, same filter syntax across
          economy, research, packages, sports, policy. Same predictable rate-limit posture,
          same predictable refresh cadence. An agent that learns how one TensorFeed endpoint
          works has effectively learned how all of them work.
        </p>

        <p>
          That uniformity is the moat. The premium tier becomes the place we add reasoning on
          top: cross-source joins, weekly trend metrics, capability heatmaps,
          cost-optimization recommendations, watches, alerts. The compute is the value, not
          the gate.
        </p>

        <p>
          And paying for clean data is the wrong frame anyway. Most of what agents actually
          need is public-domain or permissive-license data. The hard part is not paying for
          access; the hard part is the eight upstream ToS reads and the three-bucket grader
          and the structured attribution in every response. We have done that work. Eight
          times today, in fact.
        </p>

        <h2 className="text-2xl font-semibold text-text-primary pt-4">
          What ships next
        </h2>

        <p>
          The crons we wired today fire overnight. By tomorrow morning the npm, PyPI, OpenAlex,
          BLS, FRED, and nflverse endpoints all have their first populated snapshots. Lambda
          Labs is already live. Sports news is already polling hourly. Eight new endpoints,
          eight new clean upstreams, all attributed in the response shape.
        </p>

        <p>
          The next session is the first premium derived endpoint. Something like{' '}
          <code className="bg-bg-tertiary px-1.5 py-0.5 rounded text-accent-primary text-xs">
            /api/premium/whats-new
          </code>{' '}
          that joins the day&apos;s news, pricing, and status changes into a single agent-shaped
          morning brief: what launched, what repriced, what degraded, in one paid call. That
          validates the &ldquo;premium = compute we add&rdquo; thesis on the foundation we
          built today.
        </p>

        <p>
          After that, more sources: USPTO patents, Wikidata, more sports leagues, more macro
          series. The rubric ran six times today and broke zero times. Tomorrow it runs again.
        </p>

        <p className="text-text-muted text-sm pt-6 border-t border-bg-tertiary">
          The eight new endpoints are live now under{' '}
          <Link href="/sports" className="text-accent-primary hover:underline">/sports</Link>,{' '}
          <Link href="/economy" className="text-accent-primary hover:underline">/economy</Link>,{' '}
          <Link href="/research/institutions" className="text-accent-primary hover:underline">/research/institutions</Link>,{' '}
          <Link href="/packages" className="text-accent-primary hover:underline">/packages</Link>, and{' '}
          <Link href="/policy" className="text-accent-primary hover:underline">/policy</Link>. The full audit
          history (today&apos;s eighteen commits) is on the public repo. Every paid endpoint we still sell
          carries a structured attribution block telling you where the data came from. That is the brand
          now: free data, clean licenses, agent-shaped, transparent.
        </p>
      </div>
    </article>
  );
}
