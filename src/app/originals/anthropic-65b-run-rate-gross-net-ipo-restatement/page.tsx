import { Metadata } from 'next';
import Link from 'next/link';
import { ArrowLeft, Clock, Scale } from 'lucide-react';
import { ArticleJsonLd } from '@/components/seo/JsonLd';

import ShareBar from '@/components/originals/ShareBar';
import ArticleHero from '@/components/originals/ArticleHero';

const TITLE =
  'Anthropic Says $65 Billion. OpenAI Says $40 Billion. Only One of Them Is Counting the Same Way.';

export const metadata: Metadata = {
  alternates: {
    canonical:
      'https://tensorfeed.ai/originals/anthropic-65b-run-rate-gross-net-ipo-restatement',
  },
  title: TITLE,
  description:
    "Anthropic's annualized run rate topped $65 billion at the end of July, more than sevenfold since December. The growth is real. The comparison to OpenAI is not, because Anthropic books cloud reseller revenue gross and OpenAI books its channel net. The S-1 is where that stops being a footnote.",
  openGraph: {
    title: TITLE,
    description:
      'Anthropic run rate: $9B to $65B in seven months, Q2 revenue above $11.5B, and a fall IPO. The number that decides the price is not the growth rate. It is the principal versus agent determination on channel revenue.',
    type: 'article',
    publishedTime: '2026-08-20T10:00:00Z',
    authors: ['Adrian Vale'],
  },
  twitter: {
    card: 'summary_large_image',
    title: TITLE,
    description:
      'Gross versus net on cloud channel revenue, adjusted operating income that excludes stock comp, and an S-1 that has to reconcile both. The growth is real. The comparison is not.',
  },
};

export default function Anthropic65BRunRateGrossNetIpoRestatementPage() {
  return (
    <article className="max-w-3xl mx-auto px-4 sm:px-6 py-10">
      <ArticleJsonLd
        title={TITLE}
        description="Anthropic's annualized revenue run rate surpassed $65 billion at the end of July 2026 ahead of a possible fall IPO. The reported gap against OpenAI's $40 billion is partly a revenue recognition difference, and the S-1 is the first time either convention gets audited."
        datePublished="2026-08-20"
        author="Adrian Vale"
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
          Anthropic Says $65 Billion. OpenAI Says $40 Billion. Only One of Them Is Counting the Same
          Way.
        </h1>
        <div className="flex items-center gap-3 text-sm text-text-muted">
          <span className="text-text-secondary font-medium">Adrian Vale</span>
          <span>&middot;</span>
          <time dateTime="2026-08-20">August 20, 2026</time>
          <span>&middot;</span>
          <span className="flex items-center gap-1">
            <Clock className="w-3.5 h-3.5" />7 min read
          </span>
        </div>
      </header>

      <ShareBar
        path="/originals/anthropic-65b-run-rate-gross-net-ipo-restatement"
        title="Anthropic Says $65 Billion. OpenAI Says $40 Billion. Only One of Them Is Counting the Same Way."
      />

      <ArticleHero
        mode="graphic"
        icon={Scale}
        gradientFrom="#0B1120"
        gradientTo="#1E3A8A"
        eyebrow="Capital Markets &middot; Revenue Recognition"
      />

      {/* Article body */}
      <div className="prose-custom space-y-6 text-lg text-text-primary leading-relaxed">
        <p>
          Bloomberg reported on Monday, August 17, 2026 that Anthropic told investors its annualized
          revenue run rate passed $65 billion at the end of July. That is more than seven times where
          the company sat at the close of 2025. Two days earlier, preliminary second quarter revenue
          landed above $11.5 billion against $787 million in the same quarter a year ago. The company
          has filed confidentially for an IPO with Morgan Stanley, Goldman Sachs and JPMorgan on the
          cover, and could list as early as this fall.
        </p>

        <p>
          Every outlet ran the same comparison: Anthropic at $65 billion, OpenAI at $40 billion. Case
          closed, one lab is lapping the other.
        </p>

        <p>
          I do not think that comparison survives contact with the S-1, and I want to be careful about
          why. This is not a claim that Anthropic is inflating anything or doing anything improper.
          The growth is extraordinary under any convention. The problem is narrower and more boring:
          the two companies are not counting the same dollar the same way, and nobody has been forced
          to reconcile that in an audited document yet.
        </p>

        <h2 className="text-2xl font-semibold text-text-primary pt-4">
          First, the Growth Curve, Because It Is Genuinely Absurd
        </h2>

        <p>
          Before the accounting argument, the numbers deserve their own paragraph. This is one of the
          steepest revenue ramps anyone has put on paper.
        </p>

        <div className="bg-bg-secondary border border-border rounded-lg overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border">
                <th className="text-left px-4 py-3 text-text-primary font-semibold">Point in time</th>
                <th className="text-left px-4 py-3 text-text-primary font-semibold">
                  Annualized run rate
                </th>
                <th className="text-left px-4 py-3 text-text-primary font-semibold">Note</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              <tr>
                <td className="px-4 py-3 text-accent-primary font-medium font-mono">End 2025</td>
                <td className="px-4 py-3 font-mono">~$9B</td>
                <td className="px-4 py-3">Baseline</td>
              </tr>
              <tr>
                <td className="px-4 py-3 text-accent-primary font-medium font-mono">April 2026</td>
                <td className="px-4 py-3 font-mono">$30B+</td>
                <td className="px-4 py-3">Roughly 3.3x in four months</td>
              </tr>
              <tr>
                <td className="px-4 py-3 text-accent-primary font-medium font-mono">May 2026</td>
                <td className="px-4 py-3 font-mono">$47B+</td>
                <td className="px-4 py-3">$17B added in one month</td>
              </tr>
              <tr>
                <td className="px-4 py-3 text-accent-primary font-medium font-mono">End July 2026</td>
                <td className="px-4 py-3 font-mono">$65B+</td>
                <td className="px-4 py-3">$18B added in two months</td>
              </tr>
              <tr>
                <td className="px-4 py-3 text-accent-primary font-medium font-mono">End 2026</td>
                <td className="px-4 py-3 font-mono">$100B to $120B</td>
                <td className="px-4 py-3">Investor expectation, not a company guide</td>
              </tr>
              <tr>
                <td className="px-4 py-3 text-accent-primary font-medium font-mono">2028</td>
                <td className="px-4 py-3 font-mono">$190B to $200B</td>
                <td className="px-4 py-3">Company projection</td>
              </tr>
            </tbody>
          </table>
        </div>

        <p>
          The quarterly line tells the same story without the annualization multiplier doing any work:
          $787 million in Q2 2025, $4.73 billion in Q1 2026, more than $11.5 billion preliminary in Q2
          2026. That is above 14x year over year on a trailing quarter. Anthropic also says it posted
          positive adjusted operating income in the quarter, which would be a first for a frontier lab.
        </p>

        <p>
          Hold that word &quot;adjusted.&quot; We come back to it.
        </p>

        <h2 className="text-2xl font-semibold text-text-primary pt-4">
          The Same Dollar, Counted Twice Differently
        </h2>

        <p>
          Here is the mechanism. A large share of both companies&apos; enterprise revenue does not
          arrive through a direct API relationship. It arrives through a hyperscaler: Claude through
          AWS Bedrock and Google Vertex and Microsoft Foundry, and OpenAI models through Microsoft.
          The customer pays the cloud. The cloud keeps a cut. The lab gets the rest.
        </p>

        <p>
          The question accountants have to answer is whether the lab is the principal in that
          transaction or the agent. Principal means you book the whole customer payment as revenue and
          the partner&apos;s cut as cost of revenue. Agent means you book only your cut.
        </p>

        <p>
          Anthropic books gross. OpenAI books its Microsoft channel net. Same economics, two very
          different top lines.
        </p>

        <div className="bg-bg-secondary border border-border rounded-lg overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border">
                <th className="text-left px-4 py-3 text-text-primary font-semibold">
                  Customer spends $1.00 via a cloud partner
                </th>
                <th className="text-left px-4 py-3 text-text-primary font-semibold">
                  Booked as revenue
                </th>
                <th className="text-left px-4 py-3 text-text-primary font-semibold">
                  Booked as cost
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              <tr>
                <td className="px-4 py-3 text-accent-primary font-medium">
                  Anthropic (gross / principal)
                </td>
                <td className="px-4 py-3 font-mono">$1.00</td>
                <td className="px-4 py-3 font-mono">partner cut</td>
              </tr>
              <tr>
                <td className="px-4 py-3 text-accent-primary font-medium">
                  OpenAI (net / agent)
                </td>
                <td className="px-4 py-3 font-mono">~$0.20</td>
                <td className="px-4 py-3 font-mono">none of the partner cut</td>
              </tr>
            </tbody>
          </table>
        </div>

        <p>
          Run the sensitivity yourself and the headline moves a real amount. Take the $65 billion run
          rate. Assume half of it flows through cloud channels, and assume the blended partner fee on
          that half is somewhere between 15 and 25 percent. That is $4.9 billion to $8.1 billion of
          revenue that a net reporter would never have put on the top line, putting a net-equivalent
          figure somewhere around $57 billion to $60 billion.
        </p>

        <p>
          I want to flag those assumptions loudly. The channel mix is not public and neither is the
          blended fee. I picked a 50 percent mix because Anthropic&apos;s enterprise motion leans hard
          on Bedrock and Vertex, and a 15 to 25 percent band because that is the ordinary range for
          this kind of marketplace arrangement. If the real mix is 30 percent, the haircut is half the
          size. If it is 70 percent, it is larger. The point of the exercise is not the specific number.
          The point is that the gap between $65 billion and $40 billion is not entirely a gap in
          business performance, and right now nobody outside either company can tell you how much of it
          is.
        </p>

        <h2 className="text-2xl font-semibold text-text-primary pt-4">
          The Case That Gross Is the Right Answer
        </h2>

        <p>
          The lazy version of this article treats gross reporting as a trick. It is not, and the
          argument for it is strong enough that I expect the auditors signed off without much drama.
        </p>

        <p>
          Anthropic sets the model price. Anthropic controls the weights, the serving behavior, the
          rate limits, the deprecation schedule, and the safety policy that governs what the model will
          and will not do. The hyperscaler is running infrastructure and billing against a service it
          does not define. Under the ordinary principal versus agent test, controlling the service
          before it transfers to the customer is exactly what makes you the principal. Plenty of
          software companies book gross on far weaker facts.
        </p>

        <p>
          And here is the part that cuts against my own framing: growth rate is invariant to the
          convention. If you haircut every period by the same percentage, 14x year over year is still
          14x. The slope does not care. Whatever discount you apply to $65 billion, you apply to the
          $9 billion it grew from. The trajectory is real and it is not an artifact.
        </p>

        <p>
          The convention matters for two things instead: the absolute number in a headline comparison
          against a peer using a different convention, and gross margin percentage, because gross
          reporting mechanically compresses margin by stuffing partner fees into cost of revenue.
        </p>

        <h2 className="text-2xl font-semibold text-text-primary pt-4">
          Now Back to &quot;Adjusted&quot;
        </h2>

        <p>
          The second number in the release deserves the same treatment. Positive adjusted operating
          income in Q2 would be the first time a frontier lab cleared that bar, and it lands with a
          modifier doing load-bearing work.
        </p>

        <p>
          To Anthropic&apos;s credit, the figure reportedly includes model training costs, which is the
          expense skeptics assumed would be quietly excluded. That is the hard one and it is in there.
          What it excludes is stock-based compensation, and critics have argued the adjustment also
          sidesteps training compute amortization and infrastructure capital expenditure.
        </p>

        <div className="bg-bg-secondary border border-border rounded-lg overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border">
                <th className="text-left px-4 py-3 text-text-primary font-semibold">Line item</th>
                <th className="text-left px-4 py-3 text-text-primary font-semibold">
                  In adjusted figure?
                </th>
                <th className="text-left px-4 py-3 text-text-primary font-semibold">
                  Required under GAAP?
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              <tr>
                <td className="px-4 py-3 text-text-primary font-medium">Model training cost</td>
                <td className="px-4 py-3 text-accent-primary font-semibold">Included</td>
                <td className="px-4 py-3">Yes</td>
              </tr>
              <tr>
                <td className="px-4 py-3 text-text-primary font-medium">Stock-based compensation</td>
                <td className="px-4 py-3">Excluded</td>
                <td className="px-4 py-3">Yes</td>
              </tr>
              <tr>
                <td className="px-4 py-3 text-text-primary font-medium">
                  Training compute amortization
                </td>
                <td className="px-4 py-3">Disputed</td>
                <td className="px-4 py-3">Yes, per capitalization policy</td>
              </tr>
              <tr>
                <td className="px-4 py-3 text-text-primary font-medium">Infrastructure capex effects</td>
                <td className="px-4 py-3">Disputed</td>
                <td className="px-4 py-3">Yes, via depreciation</td>
              </tr>
            </tbody>
          </table>
        </div>

        <p>
          Stock comp at a company that has raised this much private capital at these valuations is not
          a rounding error. It is plausibly large enough on its own to move a thin positive operating
          line back under zero on a GAAP basis. That is not an accusation. It is the reason the word
          &quot;adjusted&quot; is in the sentence, and it is the single most likely place a fall
          prospectus produces a headline that reads worse than the August press cycle did.
        </p>

        <h2 className="text-2xl font-semibold text-text-primary pt-4">
          Why This Matters If You Are Just Buying Tokens
        </h2>

        <p>
          If you build on this stuff rather than trade it, there is still something practical here.
        </p>

        <p>
          A vendor that books channel revenue gross and pays a 15 to 25 percent partner fee out of it
          does not see your Bedrock dollar and your direct API dollar as the same dollar. The direct
          relationship is materially better for them. That asymmetry is where enterprise discounting
          pressure actually comes from, and it predicts something specific: over the next several
          quarters, expect the aggressive commit pricing and the earliest access to new capability
          tiers to show up on the direct path first, with marketplace parity arriving later.
        </p>

        <p>
          It also means the channel decision is a negotiating lever. Procurement teams default to
          buying through the hyperscaler they already have a contract with because it is easier. Easier
          is worth something. It is not always worth the spread, and it is worth knowing the vendor has
          a reason to want you off that path.
        </p>

        <p>
          The other durable read is on price stability. A company approaching a public listing has an
          incentive to protect reported gross margin through the quarters that become the comparison
          base. That is a mild argument against expecting deep list-price cuts on the flagship tiers
          near term, in a market where{' '}
          <Link href="/originals/ai-api-pricing-war-2026" className="text-accent-primary hover:underline">
            almost every other headline rate has been moving
          </Link>
          . Introductory rates reverting on schedule is the more likely shape than a new cut.
        </p>

        <h2 className="text-2xl font-semibold text-text-primary pt-4">Our Take</h2>

        <p>
          Anthropic went from $9 billion to $65 billion in seven months. That is the story and no
          accounting argument touches it. I do not want the rest of this piece read as debunking,
          because there is nothing here to debunk.
        </p>

        <p>
          What I am arguing is narrower: the industry has spent eighteen months ranking labs by a
          self-reported metric that has no standard definition, no audit, and no requirement that any
          two companies compute it the same way. Run rate is a marketing unit. It got treated as a
          scoreboard because it was the only number available.
        </p>

        <p>
          The interesting thing about an IPO is that it ends that. An S-1 forces a single company to
          state its revenue recognition policy in writing, get it audited, and live with the number.
          When Anthropic files publicly, we will get the first hard data point on what frontier lab
          revenue actually looks like when someone with liability exposure has to sign it. If OpenAI
          follows, we get a second, and the comparison becomes possible for the first time.
        </p>

        <p>
          My honest expectation is that the audited numbers come in lower than the press-cycle numbers
          and that this changes very little, because a company growing at this rate can absorb a
          restatement in a way a company growing at 30 percent cannot. The risk is not the size of the
          haircut. The risk is the gap between the two figures being large enough that the market
          decides it was managed rather than merely inconsistent. Those are different problems and only
          one of them is fatal.
        </p>

        <p>Three things I am watching:</p>

        <p>
          <strong className="text-text-primary">One.</strong> Whether the S-1 breaks out channel
          revenue as a disclosed line item or buries the principal versus agent determination in a
          revenue recognition policy note. A number in a table means the comparison against OpenAI can
          finally be done. A policy note means it still cannot.
        </p>

        <p>
          <strong className="text-text-primary">Two.</strong> Whether the first audited GAAP operating
          line for Q2 2026 stays positive once stock-based compensation is back in it. If it does, the
          profitability claim was conservative and the skeptics were wrong. If it does not, the gap
          between the two figures becomes the story for a quarter.
        </p>

        <p>
          <strong className="text-text-primary">Three.</strong> Whether OpenAI clarifies or changes its
          own convention before its own listing. Net reporting understates OpenAI in exactly the way
          gross reporting flatters Anthropic, and the first company to file sets the disclosure
          standard the second one gets measured against.
        </p>

        <p>
          Until then, treat $65 billion and $40 billion as two numbers from two different measuring
          systems, and be suspicious of anyone who subtracts one from the other.
        </p>
      </div>

      {/* Related */}
      <footer className="mt-12 pt-8 border-t border-border">
        <h2 className="text-lg font-semibold text-text-primary mb-4">Related</h2>
        <div className="grid gap-3">
          <Link
            href="/originals/anthropic-confidential-s1-ipo"
            className="block bg-bg-secondary border border-border rounded-lg px-4 py-3 hover:border-accent-primary transition-colors"
          >
            <span className="text-text-primary text-sm">
              Anthropic Filed to Go Public. A Confidential S-1 at a $965 Billion Valuation Is an
              Option, Not a Date.
            </span>
          </Link>
          <Link
            href="/originals/anthropic-900-billion-valuation-tops-openai"
            className="block bg-bg-secondary border border-border rounded-lg px-4 py-3 hover:border-accent-primary transition-colors"
          >
            <span className="text-text-primary text-sm">
              Anthropic at $900 Billion. The Valuation Just Lapped OpenAI.
            </span>
          </Link>
          <Link
            href="/originals/ai-capex-bubble-debate-scoreboard"
            className="block bg-bg-secondary border border-border rounded-lg px-4 py-3 hover:border-accent-primary transition-colors"
          >
            <span className="text-text-primary text-sm">
              Everyone Is Calling an AI Capex Bubble. Almost No One Agrees on How to Measure One.
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
        <Link href="/" className="text-text-muted hover:text-accent-primary transition-colors">
          Back to Feed
        </Link>
      </div>
    </article>
  );
}
