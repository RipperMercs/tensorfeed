import { Metadata } from 'next';
import Link from 'next/link';
import { ArrowLeft, Clock } from 'lucide-react';
import { ArticleJsonLd } from '@/components/seo/JsonLd';

import ShareBar from '@/components/originals/ShareBar';

export const metadata: Metadata = {
  title: 'The Codex Bleed: Anthropic Just Made Its Third Capacity Move in Five Weeks',
  description:
    'Anthropic bumped Claude Code weekly limits 50 percent through July 13, then quietly re-allowed third-party harnesses on paid plans behind a separate credit meter, then watched Sam Altman dangle two free months of Codex at every new business customer. Three live interventions on the same product surface in 35 days. The unlimited agent subscription is cracking, and the token-efficiency gap is the reason.',
  openGraph: {
    title: 'The Codex Bleed: Anthropic Just Made Its Third Capacity Move in Five Weeks',
    description:
      'Three capacity interventions in 35 days. A token-efficiency gap of roughly 4.2x. A $900B valuation being raised in the same week. Inside what Codex is actually doing to the Claude Code subscription.',
    type: 'article',
    publishedTime: '2026-05-16T15:00:00Z',
    authors: ['Marcus Chen'],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'The Codex Bleed: Anthropic Just Made Its Third Capacity Move in Five Weeks',
    description:
      'Anthropic keeps raising Claude Code limits because Codex keeps raising the cost of leaving them at the old level. The math behind the cold war.',
  },
};

export default function CodexBleedThreeInterventionsPage() {
  return (
    <article className="max-w-3xl mx-auto px-4 sm:px-6 py-10">
      <ArticleJsonLd
        title="The Codex Bleed: Anthropic Just Made Its Third Capacity Move in Five Weeks"
        description="Three Claude Code capacity interventions in 35 days, a 4.2x token-efficiency gap with Codex, and a $900B funding round happening at the same time. The unit economics of the agent subscription, in numbers."
        datePublished="2026-05-16"
        author="Marcus Chen"
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
          The Codex Bleed: Anthropic Just Made Its Third Capacity Move in Five Weeks
        </h1>
        <div className="flex items-center gap-3 text-sm text-text-muted">
          <span className="text-text-secondary font-medium">Marcus Chen</span>
          <span>&middot;</span>
          <time dateTime="2026-05-16">May 16, 2026</time>
          <span>&middot;</span>
          <span className="flex items-center gap-1">
            <Clock className="w-3.5 h-3.5" />
            7 min read
          </span>
        </div>
      </header>

      <ShareBar
        path="/originals/codex-bleed-anthropic-three-interventions"
        title="The Codex Bleed: Anthropic Just Made Its Third Capacity Move in Five Weeks"
      />

      {/* Article body */}
      <div className="prose-custom space-y-6 text-text-secondary leading-relaxed">
        <p className="text-lg text-text-primary leading-relaxed">
          Anthropic does not bump rate limits three times in five weeks because it wants to.
          It bumps them because something on the other side of the market is forcing the move.
          That something is Codex. The Claude Code subscription is the most profitable developer
          product Anthropic has ever shipped, and OpenAI just spent a month showing the world
          how to bleed it.
        </p>

        <p>
          On May 13, the @ClaudeDevs account quietly posted that weekly Claude Code limits would
          be lifted by 50 percent for every Pro, Max, Team, and seat-based Enterprise user
          through July 13, 2026. The Anthropic comms machine did not put a CEO on stage for it.
          There was no blog post. No marketing reel. Seven days earlier, on May 6, Anthropic had
          already doubled hourly limits. Roughly a month before that, peak-hour throttling was
          removed for Pro and Max users entirely. Three live interventions on the same product
          surface in 35 calendar days.
        </p>

        <p>
          The next day, May 14, Anthropic did something stranger. It quietly re-enabled paid
          Claude subscriptions inside third-party agent harnesses, the OpenClaw-style wrappers
          that route Claude tokens through their own scaffolding. But it did so behind a new,
          separate monthly credit meter. Subscribers can use Claude inside someone else&apos;s
          harness again, just not for free, and not as much as they want. That is not a feature
          announcement. That is a metering wall going up on the path Anthropic shut six weeks
          earlier.
        </p>

        <p>
          The unlimited agent subscription is cracking. And the reason is the same reason every
          time you look at the data.
        </p>

        <h2 className="text-2xl font-semibold text-text-primary pt-4">
          What the timeline actually says
        </h2>

        <p>
          Read in order, the moves tell you what Anthropic was reacting to before the press
          tells you. I am not guessing here. The releases are public, the dates are public, and
          the framing on each one is defensive.
        </p>

        <div className="bg-bg-secondary border border-border rounded-lg overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border">
                <th className="text-left px-4 py-3 text-text-primary font-semibold">Date</th>
                <th className="text-left px-4 py-3 text-text-primary font-semibold">Move</th>
                <th className="text-left px-4 py-3 text-text-primary font-semibold">Read</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              <tr>
                <td className="px-4 py-3 text-accent-primary font-medium">Early April</td>
                <td className="px-4 py-3">Peak-hour throttling removed for Pro and Max</td>
                <td className="px-4 py-3">Friction reduction, not a capacity bump</td>
              </tr>
              <tr>
                <td className="px-4 py-3 text-accent-primary font-medium">May 6</td>
                <td className="px-4 py-3">Hourly limits doubled across Claude Code tiers</td>
                <td className="px-4 py-3">First real capacity intervention</td>
              </tr>
              <tr>
                <td className="px-4 py-3 text-accent-primary font-medium">May 13</td>
                <td className="px-4 py-3">Weekly limits +50 percent through July 13</td>
                <td className="px-4 py-3">Time-boxed bump, not a permanent change</td>
              </tr>
              <tr>
                <td className="px-4 py-3 text-accent-primary font-medium">May 14</td>
                <td className="px-4 py-3">Third-party harnesses re-allowed behind a separate credit meter</td>
                <td className="px-4 py-3">Concession on policy, but with a price tag bolted on</td>
              </tr>
            </tbody>
          </table>
        </div>

        <p>
          The May 13 bump is the giveaway. A permanent capacity increase is a roadmap item. A
          time-boxed bump with an explicit July 13 sunset is a tourniquet. Anthropic is buying
          itself eight weeks. Whatever the strategy team is doing about Codex, they are doing
          it on a clock that ends mid-summer.
        </p>

        <h2 className="text-2xl font-semibold text-text-primary pt-4">
          The token-efficiency gap is the whole story
        </h2>

        <p>
          The fundamental asymmetry sits at the workload level, not the price level. Multiple
          independent benchmark passes (and a useful Northflank writeup from this week) put
          Codex token consumption at roughly one quarter of Claude Code&apos;s for equivalent
          coding tasks. Call it 4.2 times fewer tokens on the workloads developers actually run.
        </p>

        <p>
          Now layer that onto an unlimited-tier subscription. If a Max 20x user runs an agent
          loop that costs $400 in raw Claude inference for the month, Anthropic eats that
          delta against the $200 sticker. The same workload on Codex, by token count, costs
          OpenAI roughly $95. The two companies are not running the same business on the same
          tier even when they charge the same price. They are running fundamentally different
          margin curves, and the one with the wider gap between revenue and inference cost is
          the one that can keep raising limits.
        </p>

        <div className="bg-bg-secondary border border-border rounded-lg overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border">
                <th className="text-left px-4 py-3 text-text-primary font-semibold">Tier</th>
                <th className="text-left px-4 py-3 text-text-primary font-semibold">Sticker</th>
                <th className="text-left px-4 py-3 text-text-primary font-semibold">Inference cost on hot workload</th>
                <th className="text-left px-4 py-3 text-text-primary font-semibold">Gross margin signal</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              <tr>
                <td className="px-4 py-3 text-text-primary font-medium">Claude Code Pro</td>
                <td className="px-4 py-3">$20</td>
                <td className="px-4 py-3">$25 to $40 typical</td>
                <td className="px-4 py-3 text-rose-400">Negative on active users</td>
              </tr>
              <tr>
                <td className="px-4 py-3 text-text-primary font-medium">Claude Code Max 5x</td>
                <td className="px-4 py-3">$100</td>
                <td className="px-4 py-3">$120 to $200 typical</td>
                <td className="px-4 py-3 text-rose-400">Negative on heavy users</td>
              </tr>
              <tr>
                <td className="px-4 py-3 text-text-primary font-medium">Claude Code Max 20x</td>
                <td className="px-4 py-3">$200</td>
                <td className="px-4 py-3">$280 to $450 typical</td>
                <td className="px-4 py-3 text-rose-400">Negative on power users</td>
              </tr>
              <tr>
                <td className="px-4 py-3 text-text-primary font-medium">Codex Pro (comp)</td>
                <td className="px-4 py-3">$200</td>
                <td className="px-4 py-3">$60 to $110 typical</td>
                <td className="px-4 py-3 text-emerald-400">Positive on most workloads</td>
              </tr>
            </tbody>
          </table>
        </div>

        <p>
          The numbers in the right column are not Anthropic financials. They are workload
          estimates from running both harnesses against the same task surface. But the
          direction is what matters. Codex eats fewer tokens, which means the same flat
          subscription supports more usage, which means OpenAI can dangle more capacity before
          the math turns red.
        </p>

        <h2 className="text-2xl font-semibold text-text-primary pt-4">
          Why Sam Altman gave away two months for free
        </h2>

        <p>
          Inside that asymmetry, Sam Altman&apos;s May offer (two months of free Codex usage
          for every new business customer) is not generosity. It is a calculated raid. Free
          months on Codex are cheap to deliver because Codex is cheap to deliver. Free months
          on Claude Code would have triggered an investor meeting.
        </p>

        <p>
          OpenAI is using its cost advantage to do the most aggressive thing a competitor with
          better unit economics can do: it is buying churn. Every developer who tries Codex on
          the free window and decides to stay is a Claude Max subscription that never renews.
          Anthropic&apos;s only counter, given the cost structure, is to raise the perceived
          value of Claude Code on the existing price. Raise the limits. Concede ground on
          third-party harnesses. Buy back attention with capacity.
        </p>

        <h2 className="text-2xl font-semibold text-text-primary pt-4">
          The $900B sitting on top of all this
        </h2>

        <p>
          The pricing context is important, and worth saying out loud. Anthropic is, at the
          same moment it is rate-limiting its own developer plan three times in five weeks,
          locking in terms for a $30 billion fundraise at a roughly $900 billion post-money
          valuation. Annualized revenue is on track to top $45 billion. The numbers Anthropic
          shows fundraisers are real, large, and growing faster than any private software
          company in history.
        </p>

        <p>
          But the strain is sitting on a single product line. The agent subscription, sold at
          a flat monthly price into a workload that scales with developer ambition, is the
          piece of the Anthropic business model that does not benefit from the same
          superlinear curve as enterprise tokens. Enterprise customers pay metered. Pro and
          Max users pay flat. Codex is structurally cheap, which makes it the natural
          competitor to a flat-priced product whose underlying cost has no flat curve to
          match.
        </p>

        <p>
          A $900 billion valuation does not save you from a $20 subscription bleeding $30 of
          inference. It just means you can afford to bleed for a while.
        </p>

        <h2 className="text-2xl font-semibold text-text-primary pt-4">
          What developers should actually do
        </h2>

        <p>
          If you run agent loops for a living, three practical things matter this quarter.
        </p>

        <p>
          One: do not plan around the unlimited promise. The July 13 sunset on the 50 percent
          weekly bump is the most honest statement anyone in this market has made about
          unlimited tiers in 2026. Treat it as a soft preview of where things land. Capacity
          floors are going up because providers are reconciling unit economics, and your
          workloads should be priced like they will be metered by end of year.
        </p>

        <p>
          Two: try the harness you do not pay for. Codex is two months free for new business
          accounts. Claude Code on third-party harnesses now has a separate credit meter, but
          for a lot of teams the meter is generous enough to A/B test the workflows you
          actually run. Independent harness comparisons matter more this quarter than they
          have at any point in the agent era. Our{' '}
          <Link href="/harnesses" className="text-accent-primary hover:underline">harness leaderboard</Link>{' '}
          tracks the surface and is updated weekly.
        </p>

        <p>
          Three: instrument your token bill. If you are not logging tokens per task on both
          harnesses, you are negotiating in the dark. The 4.2x asymmetry I quoted above does
          not hold on every workload. On some agent loops it collapses to 1.6x. On others it
          opens to 6x. The right number for your codebase, your test suite, and your
          coding style is something you measure, not something you read off a press release.
        </p>

        <h2 className="text-2xl font-semibold text-text-primary pt-4">Our take</h2>

        <p>
          The cold war between Anthropic and OpenAI on developer agents is the most
          consequential pricing dynamic in AI right now, and most of it is happening in
          changelog entries and X posts. Three Claude Code interventions in 35 days is a
          signal. The third-party harness concession with a metered cap is a signal. The
          two-month free Codex offer is a signal. The $900B raise running in parallel is the
          context that makes the signals legible.
        </p>

        <p>
          The unlimited developer subscription was a creature of the 2024 to 2025 AI
          discounting era, when every provider was racing inference cost to the floor and
          flat-priced consumer pricing could mostly absorb the loss. That era ended somewhere
          in the last six weeks, and the May 13 sunset date is the closest thing to a
          tombstone we have. The next subscription generation will be metered, capped,
          credit-windowed, or some combination of all three. Codex is what made it
          unavoidable.
        </p>

        <p>
          We will be watching three numbers between now and July 13. First, whether Anthropic
          extends the weekly bump or lets it expire. Second, whether OpenAI broadens the free
          Codex offer to existing customers. Third, whether the third-party harness credit
          meter on Claude paid plans gets generous enough to use, or stays restrictive enough
          to defend the first-party harness. The order in which those three resolve will tell
          us what the agent subscription actually costs to deliver in 2026, and which lab is
          willing to admit it first.
        </p>
      </div>

      {/* Related */}
      <footer className="mt-12 pt-8 border-t border-border">
        <h2 className="text-lg font-semibold text-text-primary mb-4">Related</h2>
        <div className="grid gap-3">
          <Link
            href="/originals/harness-gap-not-the-model"
            className="block bg-bg-secondary border border-border rounded-lg px-4 py-3 hover:border-accent-primary transition-colors"
          >
            <span className="text-text-primary text-sm">It Is Not the Model. It Is the Harness.</span>
          </Link>
          <Link
            href="/originals/anthropic-900-billion-valuation-tops-openai"
            className="block bg-bg-secondary border border-border rounded-lg px-4 py-3 hover:border-accent-primary transition-colors"
          >
            <span className="text-text-primary text-sm">Anthropic at $900 Billion. The Valuation Just Lapped OpenAI.</span>
          </Link>
          <Link
            href="/originals/anthropic-dreaming-managed-agents"
            className="block bg-bg-secondary border border-border rounded-lg px-4 py-3 hover:border-accent-primary transition-colors"
          >
            <span className="text-text-primary text-sm">Anthropic Just Taught Claude to Dream Between Tasks. Long-Running Agents Got Their Memory Layer.</span>
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
