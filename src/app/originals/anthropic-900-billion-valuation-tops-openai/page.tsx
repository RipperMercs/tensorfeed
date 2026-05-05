import { Metadata } from 'next';
import Link from 'next/link';
import { ArrowLeft, Clock } from 'lucide-react';
import { ArticleJsonLd } from '@/components/seo/JsonLd';
import AdPlaceholder from '@/components/AdPlaceholder';

export const metadata: Metadata = {
  title: 'Anthropic at $900 Billion. The Valuation Just Lapped OpenAI.',
  description:
    'Anthropic is closing a $50B round at a $900B valuation, more than 2x its February mark and ahead of OpenAI for the first time. The board meeting is this month, the IPO window opens in October, and the revenue numbers actually justify the price.',
  openGraph: {
    title: 'Anthropic at $900 Billion. The Valuation Just Lapped OpenAI.',
    description:
      'Anthropic is closing a $50B round at a $900B valuation. ARR ran from $9B to $30B in five months. The numbers behind the leapfrog.',
    type: 'article',
    publishedTime: '2026-05-04T10:00:00Z',
    authors: ['Marcus Chen'],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Anthropic at $900 Billion. The Valuation Just Lapped OpenAI.',
    description:
      'Anthropic is closing a $50B round at a $900B valuation. The numbers behind the leapfrog.',
  },
};

export default function Anthropic900BillionValuationTopsOpenAIPage() {
  return (
    <article className="max-w-3xl mx-auto px-4 sm:px-6 py-10">
      <ArticleJsonLd
        title="Anthropic at $900 Billion. The Valuation Just Lapped OpenAI."
        description="Anthropic is closing a $50B round at a $900B valuation, more than 2x its February mark and ahead of OpenAI for the first time. The board meeting is this month, the IPO window opens in October, and the revenue numbers actually justify the price."
        datePublished="2026-05-04"
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
          Anthropic at $900 Billion. The Valuation Just Lapped OpenAI.
        </h1>
        <div className="flex items-center gap-3 text-sm text-text-muted">
          <span className="text-text-secondary font-medium">Marcus Chen</span>
          <span>&middot;</span>
          <time dateTime="2026-05-04">May 4, 2026</time>
          <span>&middot;</span>
          <span className="flex items-center gap-1">
            <Clock className="w-3.5 h-3.5" />
            7 min read
          </span>
        </div>
      </header>

      {/* Article body */}
      <div className="prose-custom space-y-6 text-text-secondary leading-relaxed">
        <p className="text-lg text-text-primary leading-relaxed">
          Anthropic is days away from closing a $50 billion funding round at a $900 billion valuation.
          That number is not a typo, and it is not a forward projection. It is the price tag investors
          are right now writing checks against, and it puts Anthropic ahead of OpenAI by valuation for
          the first time in either company&apos;s history.
        </p>

        <p>
          Three months ago Anthropic closed a $30B round at $380B. The new round more than doubles that
          mark. Board approval is expected at a meeting this month, with an IPO window opening as early
          as October. We have been watching the numbers run for a while. Here is what changed.
        </p>

        <h2 className="text-2xl font-semibold text-text-primary pt-4">The Round Itself</h2>

        <p>
          Reporting from Bloomberg and TechCrunch over the last week pegged the round at roughly $50B in
          new capital, with the valuation sitting between $850B and $900B depending on which source you
          read. By the weekend the number had hardened around $900B, with sources noting investor demand
          could push it higher before the deal is signed.
        </p>

        <p>
          The most striking detail is the timeline. Investors were reportedly given a 48-hour window to
          submit allocations on or around May 1. That is not a normal pace for a deal of this size. It
          tells you two things: the round is heavily oversubscribed, and Anthropic is moving fast enough
          that it is willing to leave money on the table to lock the cap table before the IPO conversation
          gets serious.
        </p>

        <div className="bg-bg-secondary border border-border rounded-lg overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border">
                <th className="text-left px-4 py-3 text-text-primary font-semibold">Round</th>
                <th className="text-left px-4 py-3 text-text-primary font-semibold">Date</th>
                <th className="text-left px-4 py-3 text-text-primary font-semibold">Raise</th>
                <th className="text-left px-4 py-3 text-text-primary font-semibold">Valuation</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              <tr>
                <td className="px-4 py-3 text-accent-primary font-medium">Series F (current)</td>
                <td className="px-4 py-3">May 2026</td>
                <td className="px-4 py-3">$50.0B</td>
                <td className="px-4 py-3 font-mono">$900B</td>
              </tr>
              <tr>
                <td className="px-4 py-3 text-accent-primary font-medium">Series E</td>
                <td className="px-4 py-3">Feb 2026</td>
                <td className="px-4 py-3">$30.0B</td>
                <td className="px-4 py-3 font-mono">$380B</td>
              </tr>
              <tr>
                <td className="px-4 py-3 text-accent-primary font-medium">Series D</td>
                <td className="px-4 py-3">Mar 2025</td>
                <td className="px-4 py-3">$3.5B</td>
                <td className="px-4 py-3 font-mono">$61.5B</td>
              </tr>
              <tr>
                <td className="px-4 py-3 text-accent-primary font-medium">Series C extension</td>
                <td className="px-4 py-3">Aug 2024</td>
                <td className="px-4 py-3">$4.0B (Amazon)</td>
                <td className="px-4 py-3 font-mono">$40.0B</td>
              </tr>
            </tbody>
          </table>
        </div>

        <p>
          Read top to bottom: Anthropic&apos;s valuation has roughly 22x&apos;d in 21 months. Most of that
          gain happened in the last six. The compounding shape here is closer to a hardware company
          riding a hyperscaler tailwind than to a typical software business. There is precedent (NVIDIA
          itself between 2023 and 2024), but precedent is a short list.
        </p>

        <h2 className="text-2xl font-semibold text-text-primary pt-4">The Revenue Has Caught Up to the Hype</h2>

        <p>
          Valuations of this size used to be a faith trade. Anthropic is no longer in that category. The
          revenue numbers leaked over the last month genuinely justify a frontier-leader multiple, and
          the trajectory is still vertical.
        </p>

        <div className="bg-bg-secondary border border-border rounded-lg overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border">
                <th className="text-left px-4 py-3 text-text-primary font-semibold">Period</th>
                <th className="text-left px-4 py-3 text-text-primary font-semibold">Annualized Revenue</th>
                <th className="text-left px-4 py-3 text-text-primary font-semibold">Notes</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              <tr>
                <td className="px-4 py-3 text-text-primary font-medium">Jan 2024</td>
                <td className="px-4 py-3 font-mono">$0.087B</td>
                <td className="px-4 py-3">Pre-Sonnet 3 ARR run-rate</td>
              </tr>
              <tr>
                <td className="px-4 py-3 text-text-primary font-medium">Dec 2024</td>
                <td className="px-4 py-3 font-mono">$1.0B</td>
                <td className="px-4 py-3">Sonnet 3.5 inflection</td>
              </tr>
              <tr>
                <td className="px-4 py-3 text-text-primary font-medium">Dec 2025</td>
                <td className="px-4 py-3 font-mono">$9.0B</td>
                <td className="px-4 py-3">Claude Code in production</td>
              </tr>
              <tr>
                <td className="px-4 py-3 text-text-primary font-medium">Feb 2026</td>
                <td className="px-4 py-3 font-mono">$14.0B</td>
                <td className="px-4 py-3">Series E close</td>
              </tr>
              <tr>
                <td className="px-4 py-3 text-text-primary font-medium">Mar 2026</td>
                <td className="px-4 py-3 font-mono">$19.0B</td>
                <td className="px-4 py-3">Opus 4.7 launch</td>
              </tr>
              <tr>
                <td className="px-4 py-3 text-text-primary font-medium">Apr 2026</td>
                <td className="px-4 py-3 font-mono">$30.0B</td>
                <td className="px-4 py-3 text-accent-primary">Passed OpenAI ($25B) for the first time</td>
              </tr>
              <tr>
                <td className="px-4 py-3 text-text-primary font-medium">May 2026 (est.)</td>
                <td className="px-4 py-3 font-mono">$44.0B</td>
                <td className="px-4 py-3">Reported run-rate at the time of the new round</td>
              </tr>
            </tbody>
          </table>
        </div>

        <p>
          ARR went from $9B to a reported $44B in five months. That is a 4.9x in less than half a year.
          For context, the comparable five-month stretch for OpenAI in the post-ChatGPT period was about
          2x. This is not a typical growth curve for a company this size, and it is the part of the
          story that is most defensible against gravity.
        </p>

        <p>
          At a $900B valuation against $44B ARR, the implied multiple is roughly 20x. That is high in
          absolute terms, but for context: NVIDIA traded at a 25x revenue multiple at peak. OpenAI&apos;s
          last round priced it at roughly 32x. If you believe the run rate holds for two quarters,
          Anthropic is actually the cheaper of the two frontier labs by this measure.
        </p>

        <h2 className="text-2xl font-semibold text-text-primary pt-4">Where Did the Revenue Come From</h2>

        <p>
          Three drivers, in rough order of contribution.
        </p>

        <p>
          First, Claude Code. The internal coding agent rolled out paid tiers in late 2025 and turned
          into one of the most-used coding products in the developer tool category by early 2026. The
          revenue share for Claude Code itself is not public, but the Anthropic team has been pointing
          at it as the primary driver of Q1 acceleration in conversations with investors. We track the
          harness side of that story on our{' '}
          <Link href="/harnesses" className="text-accent-primary hover:underline">harnesses page</Link>.
        </p>

        <p>
          Second, enterprise API at the high end. Reporting from Sacra and the company itself indicates
          customers spending $1M+ per year on Claude have grown from a dozen two years ago to over 500.
          Customers spending $100K+ per year are up 7x in the last year. That is a thick middle of the
          curve, not just whales.
        </p>

        <p>
          Third, distribution muscle that did not exist 18 months ago. Claude is now first-party on AWS
          Bedrock, Google Vertex, and Snowflake. The Amazon and Google compute partnerships funnel
          enterprise procurement into Anthropic by default. When AWS sales reps walk into a Fortune 500
          and pitch generative AI, the path of least resistance is Bedrock plus Claude.

        </p>

        <h2 className="text-2xl font-semibold text-text-primary pt-4">The Compute Math</h2>

        <p>
          The other thing the new round funds is silicon. Anthropic announced two compute deals in the
          last six weeks that, taken together, lock in roughly 10 gigawatts of capacity coming online
          through 2027.
        </p>

        <p>
          The Amazon deal is up to 5GW for training and inference. The Google plus Broadcom deal added
          another 5GW, anchored by Anthropic-tuned TPU capacity through Google Cloud. The headline
          investment commitments include up to $25B from Amazon and up to $40B from Google ($10B
          immediate, $30B contingent on milestones).
        </p>

        <p>
          For context, 10GW of training capacity is roughly the entire installed base of frontier AI
          training infrastructure as of mid-2024. Anthropic alone has now contracted for that much over
          the next 18 months. The new $50B round is the company&apos;s share of bringing that capacity
          online and paying for the training runs that fill it.
        </p>

        <AdPlaceholder format="in-article" className="my-8" />

        <h2 className="text-2xl font-semibold text-text-primary pt-4">What This Does to OpenAI</h2>

        <p>
          OpenAI&apos;s last round priced the company at roughly $800B against $122B raised. That deal
          was anchored by Amazon, NVIDIA, SoftBank, and Microsoft. The new Anthropic mark prices ahead
          of that, on less raised capital and (as of April) higher ARR.
        </p>

        <p>
          The strategic implication is more interesting than the headline. For two years OpenAI was the
          default frontier lab in every enterprise AI conversation. Anthropic was the safety-conscious
          alternative. The conversation has flipped. Today Anthropic is the revenue leader, the
          valuation leader, and (as of last week) the only frontier lab that walked away from a Pentagon
          contract on principle. Read{' '}
          <Link href="/originals/pentagon-blacklists-anthropic-defense-deals" className="text-accent-primary hover:underline">our coverage of that decision</Link>{' '}
          for the connecting story.
        </p>

        <p>
          OpenAI is still bigger by user count (900M weekly actives on ChatGPT) and consumer brand. But
          on the metrics that drive enterprise AI procurement (revenue per customer, retention,
          infrastructure spend, enterprise distribution agreements), Anthropic now leads. That gap is
          the story for the next 12 months.
        </p>

        <h2 className="text-2xl font-semibold text-text-primary pt-4">The IPO Question</h2>

        <p>
          October 2026 is the IPO window the board is reportedly evaluating. If they file in October at
          the current valuation, Anthropic would be the largest tech IPO since Saudi Aramco in 2019. The
          public markets pricing for an AI company at $900B+ is uncharted. The closest comparable is
          NVIDIA in 2023, and NVIDIA had four decades of public-company financial discipline before that
          re-rate.
        </p>

        <p>
          The bear case is that an IPO at this valuation requires Anthropic to keep growing 4x annualized
          for at least four more quarters to grow into the multiple. That is an aggressive bet on a
          company that just turned three.
        </p>

        <p>
          The bull case is that AI infrastructure spend is still front-loaded, the enterprise revenue
          ramp is accelerating not decelerating, and the compute deals lock in cost advantages that
          competitors will spend years matching. Both cases are credible. Pick your priors.
        </p>

        <h2 className="text-2xl font-semibold text-text-primary pt-4">Our Take</h2>

        <p>
          The $900B headline is the easy story. The interesting story is the speed. A frontier lab going
          from $9B to $44B ARR in five months is something the public markets have never priced before.
          A company more than doubling its valuation in 90 days while shipping models, signing 10GW of
          compute, and walking away from defense contracts on principle is the kind of compound action
          that breaks valuation models.
        </p>

        <p>
          We will be watching three things over the next 60 days. First, whether the round actually
          closes at $900B or pushes higher on demand. Second, whether the May ARR figure is real once
          third parties get a look at it (Sacra, The Information, anyone with a finance source). Third,
          the IPO filing date, which will tell you what the board actually thinks the long-term clearing
          price is.
        </p>

        <p>
          We track the AI funding and pricing landscape on our{' '}
          <Link href="/models" className="text-accent-primary hover:underline">models tracker</Link>{' '}
          and{' '}
          <Link href="/providers/anthropic" className="text-accent-primary hover:underline">Anthropic provider page</Link>.
          The numbers update as the deals close. If you want the agent-readable feed, it lives at our{' '}
          <Link href="/developers" className="text-accent-primary hover:underline">developers page</Link>.
        </p>

        <p>
          One last thing. A year ago the consensus was that the AI industry would consolidate to two
          frontier labs, and that one of those would be much larger than the other. The consensus is
          half right. There are two. They are within striking distance of each other, and the second one
          just lapped the first.
        </p>
      </div>

      {/* Related */}
      <footer className="mt-12 pt-8 border-t border-border">
        <h2 className="text-lg font-semibold text-text-primary mb-4">Related</h2>
        <div className="grid gap-3">
          <Link
            href="/originals/pentagon-blacklists-anthropic-defense-deals"
            className="block bg-bg-secondary border border-border rounded-lg px-4 py-3 hover:border-accent-primary transition-colors"
          >
            <span className="text-text-primary text-sm">The Pentagon Skipped Anthropic. Seven Other AI Companies Got the Contracts.</span>
          </Link>
          <Link
            href="/originals/google-anthropic-40b-compute"
            className="block bg-bg-secondary border border-border rounded-lg px-4 py-3 hover:border-accent-primary transition-colors"
          >
            <span className="text-text-primary text-sm">Google&apos;s $40B Bet on Anthropic Compute</span>
          </Link>
          <Link
            href="/originals/gpt-5-5-openai-flagship"
            className="block bg-bg-secondary border border-border rounded-lg px-4 py-3 hover:border-accent-primary transition-colors"
          >
            <span className="text-text-primary text-sm">GPT-5.5 Just Landed. OpenAI Doubled the Price and Raised the Bar.</span>
          </Link>
        </div>
      </footer>

      <AdPlaceholder format="horizontal" className="mt-10" />

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
