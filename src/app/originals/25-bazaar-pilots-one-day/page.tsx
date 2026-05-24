import { Metadata } from 'next';
import Link from 'next/link';
import { ArrowLeft, Clock, Network } from 'lucide-react';
import { ArticleJsonLd } from '@/components/seo/JsonLd';
import ShareBar from '@/components/originals/ShareBar';
import ArticleHero from '@/components/originals/ArticleHero';

export const metadata: Metadata = {
  title:
    'I Shipped 25 CDP Bazaar Pilots in One Day. That Is What an AI Data Library Looks Like.',
  description:
    'I went from 4 to 25 CDP Bazaar-cataloged paid endpoints in one day. Three of them are the first AFTA federation cross-calls in production (TF pulls live HF + GitHub trending, AI-thesis crypto with funding-rate skew, and the weekly delta of agentic-coding leaderboards from TerminalFeed). Two are Haiku-derived with per-item caching that holds spend at $1 to $2 a month combined. The static x402 manifest is now generated from the pilot registry so this stops drifting. Two production bugs caught and fixed in same-day verification, including a single em dash that crashed btoa() inside a 402 challenge. Inside the day, the patterns, and what an AI data library actually looks like when you compress weeks of pipeline work into 14 hours.',
  openGraph: {
    title:
      'I Shipped 25 CDP Bazaar Pilots in One Day. That Is What an AI Data Library Looks Like.',
    description:
      '4 to 25 paid agent endpoints in 14 commits. Three federation cross-calls, two Haiku-derived feeds, one split-rig handoff for SEC filings, two production bugs caught in same-day verification. Inside the patterns that compressed weeks into a day.',
    type: 'article',
    publishedTime: '2026-05-24T22:00:00Z',
    authors: ['Ripper'],
  },
  twitter: {
    card: 'summary_large_image',
    title:
      'I Shipped 25 CDP Bazaar Pilots in One Day. That Is What an AI Data Library Looks Like.',
    description:
      '4 to 25 paid agent endpoints in 14 commits. Three federation cross-calls, two Haiku-derived feeds, one split-rig handoff, two bugs fixed same day.',
  },
};

export default function BazaarPilotsOneDayPage() {
  return (
    <article className="max-w-3xl mx-auto px-4 sm:px-6 py-10">
      <ArticleJsonLd
        title="I Shipped 25 CDP Bazaar Pilots in One Day. That Is What an AI Data Library Looks Like."
        description="A 14-commit, 1080-test, 11-new-free-feed day at TensorFeed. Three AFTA federation cross-calls, two Haiku-derived endpoints, one split-rig SEC handoff, and two same-day bug catches."
        datePublished="2026-05-24"
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
          I Shipped 25 CDP Bazaar Pilots in One Day. That Is What an AI Data Library Looks Like.
        </h1>
        <div className="flex items-center gap-3 text-sm text-text-muted">
          <span className="text-text-secondary font-medium">Ripper</span>
          <span>&middot;</span>
          <time dateTime="2026-05-24">May 24, 2026</time>
          <span>&middot;</span>
          <span className="flex items-center gap-1">
            <Clock className="w-3.5 h-3.5" />
            6 min read
          </span>
        </div>
      </header>

      <ShareBar
        path="/originals/25-bazaar-pilots-one-day"
        title="I Shipped 25 CDP Bazaar Pilots in One Day. That Is What an AI Data Library Looks Like."
      />

      <ArticleHero
        mode="graphic"
        icon={Network}
        gradientFrom="#134e4a"
        gradientTo="#042f2e"
        eyebrow="AGENT STACK"
      />

      {/* Article body */}
      <div className="prose-custom space-y-6 text-text-secondary leading-relaxed">
        <p className="text-lg text-text-primary leading-relaxed">
          I went from 4 to 25 CDP Bazaar-cataloged paid endpoints today. The first 4 had taken
          three weeks. The next 21 took 14 hours and 14 commits to main, and the static
          x402 manifest finally stopped being a hand-edited file. Underneath that count is a
          working answer to a question I have been pushing on for months: what does an AI data
          library for AI agents actually look like in practice, not in a deck.
        </p>

        <p>
          It looks like this.
        </p>

        <h2 className="text-2xl font-semibold text-text-primary pt-4">The day in numbers</h2>

        <p>
          14 commits to <code className="text-accent-primary">main</code>. 11 net-new paid endpoints,
          plus 10 promotions of existing endpoints into the Bazaar catalog. 11 new free feeds beside
          them. 1,080 new Vitest tests added, taking the worker suite from 2,228 to 3,308, every one
          green. The endpoint catalog at our{' '}
          <Link href="/api" className="text-accent-primary hover:underline">/api meta</Link>{' '}
          listing went from 35 priced surfaces to roughly 50, and the canonical
          x402 publisher manifest at{' '}
          <code className="text-accent-primary">/.well-known/x402.json</code> went from 35 items to 61.
        </p>

        <p>
          That is the count. The patterns behind it are what matter, because none of this would
          have worked at this cadence without three things landing in the right order: federation
          derivations, batched Haiku, and split-rig handoffs.
        </p>

        <h2 className="text-2xl font-semibold text-text-primary pt-4">Three federation cross-calls (the first agentic-trade-association payoff in production)</h2>

        <p>
          The AFTA federation has been mostly a shared-standard story for six months. As of today
          it is also a derivation product. TensorFeed shipped three premium endpoints whose data
          is pulled live from{' '}
          <Link href="https://terminalfeed.io" className="text-accent-primary hover:underline">TerminalFeed</Link>
          {' '}(sister AFTA member, separate stack) and re-derived for the AI-agent audience.
        </p>

        <p>
          The first, <code className="text-accent-primary">/api/premium/ai-velocity</code>,
          cross-joins TerminalFeed&apos;s HF and GitHub trending leaderboards, filters each to
          AI-relevant entries, and emits a unified traction_score plus a cross-pollinated set
          (model names appearing on both surfaces simultaneously, which is the highest-confidence
          agent signal). The second,{' '}
          <code className="text-accent-primary">/api/premium/ai-crypto-pulse</code>, joins
          TerminalFeed&apos;s crypto movers stream with the perp funding-rate venues over a curated
          AI-thesis token cohort (TAO, FET, RNDR, AKT, IO, ARKM, WLD, plus seven more), and
          classifies each position as squeeze_up, chase_up, squeeze_down, chase_down, coiled,
          or neutral based on the price-move vs funding-rate axis. The third,{' '}
          <code className="text-accent-primary">/api/premium/coding-harnesses/weekly-deltas</code>,
          snapshots TerminalFeed&apos;s harness leaderboard daily and computes per-(benchmark,
          harness, model) score and rank deltas vs a prior snapshot, surfacing entered, exited,
          and leader-changed cohorts.
        </p>

        <p>
          The pattern across all three: TF as an HTTP client of another federation member,
          lazy KV refresh on cold cache, AI-cohort filter, premium derivation. Each one ships in
          one module pair (a fetcher and a derivation), one cron entry (or a 30-minute lazy
          refresh when daily history is not required), one Bazaar pilot config. Establishing the
          pattern took the first one. The second and third were each under an hour of net new code.
        </p>

        <h2 className="text-2xl font-semibold text-text-primary pt-4">Two Haiku-derived endpoints (and why they stay cheap)</h2>

        <p>
          The other net-new shape was the first production use of Claude Haiku 4.5 inside the
          worker. Two endpoints,{' '}
          <code className="text-accent-primary">/api/premium/news/action-cards</code> and{' '}
          <code className="text-accent-primary">/api/premium/status/incidents/triage</code>, both
          turn unstructured text into structured agent-decision cards. The news one produces one
          card per article (action_summary, migration_recommendation, affected_capability,
          cost_impact, security_impact, urgency). The incident one produces one card per AI
          provider incident (triage_summary, impact_classification, affected_capabilities,
          recommended_action from a 5-enum set including failover_now and escalate).
        </p>

        <p>
          The cost discipline is the part I want to lodge here. Haiku runs once per article or per
          incident, ever, with a per-item KV cache (7 days on news, 24 hours on incidents). Re-runs
          of the cron reuse the cached card. A daily news refresh hits roughly 50 articles, most
          of which were already extracted last cycle, so real marginal Haiku spend is closer to
          5 to 10 net-new calls per day. Combined steady-state projection across both endpoints:
          $1 to $2 a month. The batch-not-request pattern (per{' '}
          <Link href="/originals/free-tier-on-paid-routes" className="text-accent-primary hover:underline">the same posture as the rate-limiter-based free tier</Link>) is what makes per-call LLM
          economics work for $0.02-per-call premium products.
        </p>

        <h2 className="text-2xl font-semibold text-text-primary pt-4">One split-rig handoff (and why SEC filings will not run on Haiku)</h2>

        <p>
          The fourth pattern was the one I almost got wrong. SEC EDGAR filings for an AI bellwether
          cohort (NVDA, AMD, AVGO, TSM, ARM, MSFT, GOOGL, AMZN, ORCL, PLTR, SMCI, AAPL, META, TSLA)
          ship today as free endpoints (
          <code className="text-accent-primary">/api/sec/filings/recent</code> and per-CIK), and
          the premium AI-extraction layer is queued behind a Qwen 3.6 27B pipeline running on a
          separate rig. The split is the discipline.
        </p>

        <p>
          A single 10-K is 300,000 tokens. At Haiku 4.5 prices that is roughly $0.30 per filing.
          Across the 50 AI-relevant filings per week the cohort produces, that math becomes $15
          a month, which is an order of magnitude above the per-month spend on the news and
          incident pipelines combined. Qwen 3.6 27B on a 5090 handles the same context for zero
          per-call cost. Right rig for the workload. I shipped the EDGAR ingest plus the handoff
          spec (extraction schema, suggested prompt, three worked examples) and the offline
          partner picked it up before I finished pushing the commit.
        </p>

        <p>
          The reply that came back two hours later argued for an engine-fit reshape: keep Qwen
          doing pure verbatim extraction, move all six enum-assignment fields (vendor,
          relationship_type, change_type, category, ai_relevant, ai_relevance_score) into a
          deterministic post-step. I approved it on the merits. Two structural failures on a
          prior pipeline (research-milestones) had taught the partner that Qwen drifts on
          trusted enums. I had walked into the same trap. The fix is a 150-line normalize.py
          and a tighter prompt, with the output JSON shape staying identical so the downstream
          premium endpoints I will ship next week (
          <code className="text-accent-primary">/api/premium/sec/filings/ai-flagged</code> and{' '}
          <code className="text-accent-primary">/api/premium/sec/filings/by-form</code>) do not
          need to change.
        </p>

        <h2 className="text-2xl font-semibold text-text-primary pt-4">Two bugs caught in same-day verification</h2>

        <p>
          The reason I am writing this at 22:00 UTC and not midnight is that the smoke-check
          after the last push surfaced two production bugs that the test suite did not catch.
          Worth naming both because the lesson generalizes.
        </p>

        <p>
          The first:{' '}
          <code className="text-accent-primary">/api/premium/apis-guru/ai-feed</code> was
          returning HTTP 500 with{' '}
          <code className="text-accent-primary">InvalidCharacterError: btoa() can only operate on characters in the Latin1 range</code>.
          One em dash (U+2014) in the bazaar pilot description string was crashing the base64
          encoder that builds the 402 challenge. The other 20 strict-premium endpoints worked
          because their pilot strings happened to be ASCII-only. 27 em dashes purged from the
          pilot config, 8 more from neighboring files, a memory entry written so the
          pre-deploy Latin1 scan now lives in muscle memory.
        </p>

        <p>
          The second: the canonical x402 manifest at{' '}
          <Link
            href="/.well-known/x402.json"
            className="text-accent-primary hover:underline"
          >
            /.well-known/x402.json
          </Link>{' '}
          was a hand-maintained file frozen on May 16, missing 12 of the 25 active pilots. CDP
          Bazaar and x402scan both consume this for discovery, so the stale file was blocking
          ecosystem propagation. A prebuild script now generates the manifest from the pilot
          registry on every deploy, refreshes the bazaar extension and description from
          source-of-truth, defensively scans every emitted string for non-Latin1 characters so
          the em-dash class of bug cannot reach the manifest, and bumps lastUpdated only when
          something actually changed. Idempotent. The first run added 16 missing items and
          refreshed 9 stale ones in a single pass.
        </p>

        <p>
          Both bugs were caught by a 30-second smoke-check (one curl per endpoint, response code
          plus body length per row). Both would have been silent for days if I had assumed tests
          equal correctness and skipped the smoke-check. The verification-after-deploy step is
          now in my standing checklist for any backend change. The rule
          &quot;tests verify code correctness, not feature correctness&quot; cost me two production
          5xx today and is the cheapest lesson I will buy this week.
        </p>

        <h2 className="text-2xl font-semibold text-text-primary pt-4">Our Take</h2>

        <p>
          25 paid endpoints is not the headline. The headline is that the four patterns I worked
          through today are each replicable, and once each one is replicable the daily cadence
          of the data library is not bounded by my typing speed, it is bounded by which raw
          sources are worth wrapping. That is a different shape of constraint.
        </p>

        <p>
          A federation member with a real-time feed is a derivation candidate. A long-document
          source is a split-rig handoff candidate. A short-form prose source (news, status
          incidents, earnings transcripts, regulatory filings) is a batched-Haiku candidate. A
          curated registry that updates on redeploy is a deterministic-derivation candidate.
          Four templates, applied per source, with the shared infrastructure (Bazaar pilot
          config, strict-premium gate, AFTA-signed receipts,{' '}
          <Link
            href="/agent-payments"
            className="text-accent-primary hover:underline"
          >
            agent-payments tier
          </Link>
          ) doing the same work each time.
        </p>

        <p>
          The 100-paid-endpoint long-term goal stops looking aspirational under that framing and
          starts looking like a few weeks of source selection. Tomorrow I am chasing the
          DataPal-shipped SEC extraction pilot back through into the premium tier. After that, I
          am pretty sure the next four pipelines look exactly like the four I shipped today, just
          pointed at different sources.
        </p>

        <p>
          The data library is the product. Today is what compressing it looks like.
        </p>
      </div>

      {/* Related */}
      <footer className="mt-12 pt-8 border-t border-border">
        <h2 className="text-lg font-semibold text-text-primary mb-4">Related</h2>
        <div className="grid gap-3">
          <Link
            href="/originals/free-tier-on-paid-routes"
            className="block bg-bg-secondary border border-border rounded-lg px-4 py-3 hover:border-accent-primary transition-colors"
          >
            <span className="text-text-primary text-sm">
              x402 Has Three Options for Free Trials on Paid Routes. We Shipped a Fourth.
            </span>
          </Link>
          <Link
            href="/originals/x402-multi-rail-fireblocks-allunity"
            className="block bg-bg-secondary border border-border rounded-lg px-4 py-3 hover:border-accent-primary transition-colors"
          >
            <span className="text-text-primary text-sm">
              Fireblocks Brought Spend Governance. AllUnity Brought a Krona. x402 Stopped Being
              a One-Rail Protocol This Week.
            </span>
          </Link>
          <Link
            href="/originals/openai-chatgpt-bank-access-agent-trust-gap"
            className="block bg-bg-secondary border border-border rounded-lg px-4 py-3 hover:border-accent-primary transition-colors"
          >
            <span className="text-text-primary text-sm">
              OpenAI Wants ChatGPT in Your Bank Account. That Is the Opposite of How Agent Money
              Should Work.
            </span>
          </Link>
        </div>
      </footer>

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
