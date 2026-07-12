import { Metadata } from 'next';
import Link from 'next/link';
import { ArrowLeft, Clock, Zap } from 'lucide-react';
import { ArticleJsonLd } from '@/components/seo/JsonLd';
import ArticleHero from '@/components/originals/ArticleHero';
import ShareBar from '@/components/originals/ShareBar';
export const metadata: Metadata = {
  alternates: { canonical: 'https://tensorfeed.ai/originals/five-coding-models-48-hours-scoreboard' },
  title: 'Five Frontier Coding Models Shipped in 48 Hours. Here Is the Scoreboard.',
  description:
    'GPT-5.6, Grok 4.5, Meta Muse Spark 1.1, and ByteDance Seedream 5.0 all landed between July 8 and July 9, 2026. A week later, Claude Mythos 5 and Fable 5 still top SWE-Bench Pro. The real story is cost per benchmark point, not the leaderboard.',
  openGraph: {
    title: 'Five Frontier Coding Models Shipped in 48 Hours. Here Is the Scoreboard.',
    description:
      'GPT-5.6, Grok 4.5, Muse Spark 1.1, and Seedream 5.0 all shipped in one 48-hour window. The winner is decided by cost per benchmark point, not raw score.',
    type: 'article',
    publishedTime: '2026-07-11T09:30:00Z',
    authors: ['Adrian Vale'],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Five Frontier Coding Models Shipped in 48 Hours. Here Is the Scoreboard.',
    description:
      'The coding frontier got five new entrants in one window. Cost per benchmark point is the number that actually moved.',
  },
};

export default function FiveCodingModels48HoursScoreboardPage() {
  return (
    <article className="max-w-3xl mx-auto px-4 sm:px-6 py-10">
      <ArticleJsonLd
        title="Five Frontier Coding Models Shipped in 48 Hours. Here Is the Scoreboard."
        description="GPT-5.6, Grok 4.5, Meta Muse Spark 1.1, and ByteDance Seedream 5.0 all landed between July 8 and July 9, 2026. A week later, Claude Mythos 5 and Fable 5 still top SWE-Bench Pro. The real story is cost per benchmark point."
        datePublished="2026-07-11"
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

      {/* Hero (graphic mode: molten amber, the price-war heat) */}
      <ArticleHero
        mode="graphic"
        icon={Zap}
        gradientFrom="#a16207"
        gradientTo="#451a03"
        eyebrow="Pricing &middot; Scoreboard"
      />

      {/* Header */}
      <header className="mb-10">
        <h1 className="text-3xl sm:text-4xl font-bold text-text-primary mb-4 leading-tight">
          Five Frontier Coding Models Shipped in 48 Hours. Here Is the Scoreboard.
        </h1>
        <div className="flex items-center gap-3 text-sm text-text-muted">
          <span className="text-text-secondary font-medium">Adrian Vale</span>
          <span>&middot;</span>
          <time dateTime="2026-07-11">July 11, 2026</time>
          <span>&middot;</span>
          <span className="flex items-center gap-1">
            <Clock className="w-3.5 h-3.5" />
            7 min read
          </span>
        </div>
      </header>

      <ShareBar
        path="/originals/five-coding-models-48-hours-scoreboard"
        title="Five Frontier Coding Models Shipped in 48 Hours. Here Is the Scoreboard."
      />
      {/* Article body */}
      <div className="prose-custom space-y-6 text-lg text-text-primary leading-relaxed">
        <p className="text-lg text-text-primary leading-relaxed">
          It is Saturday, the launch dust has settled, and I finally have a full week of numbers to
          look at. Between the morning of July 8 and the evening of July 9, five frontier models aimed
          at coding and agentic work shipped into public availability. We covered the big ones one at a
          time as they landed. Now I want to put all of them on the same table, because the individual
          launch posts miss the thing that actually changed this week.
        </p>

        <p>
          The leaderboard did not move. Anthropic still sits on top of SWE-Bench Pro. What moved is the
          floor: the cost of getting most of the way to the frontier fell off a cliff, and it fell in a
          single 48-hour window.
        </p>

        <h2 className="text-2xl font-semibold text-text-primary pt-4">Who Shipped, and When</h2>

        <p>
          Here is the raw sequence, because the compression is the story. Five launches, two calendar
          days.
        </p>

        <div className="bg-bg-secondary border border-border rounded-lg overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border">
                <th className="text-left px-4 py-3 text-text-primary font-semibold">Date</th>
                <th className="text-left px-4 py-3 text-text-primary font-semibold">Model</th>
                <th className="text-left px-4 py-3 text-text-primary font-semibold">Lab</th>
                <th className="text-left px-4 py-3 text-text-primary font-semibold">Pitch</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              <tr>
                <td className="px-4 py-3 font-mono">Jul 8</td>
                <td className="px-4 py-3 text-accent-primary font-medium">Grok 4.5</td>
                <td className="px-4 py-3">SpaceXAI</td>
                <td className="px-4 py-3">Cursor-trained coding model, cheap</td>
              </tr>
              <tr>
                <td className="px-4 py-3 font-mono">Jul 9</td>
                <td className="px-4 py-3 text-accent-primary font-medium">GPT-5.6 (Sol, Terra, Luna)</td>
                <td className="px-4 py-3">OpenAI</td>
                <td className="px-4 py-3">Three-tier family, new ChatGPT default</td>
              </tr>
              <tr>
                <td className="px-4 py-3 font-mono">Jul 9</td>
                <td className="px-4 py-3 text-accent-primary font-medium">Muse Spark 1.1</td>
                <td className="px-4 py-3">Meta</td>
                <td className="px-4 py-3">Meta&apos;s first paid API model</td>
              </tr>
              <tr>
                <td className="px-4 py-3 font-mono">Jul 9</td>
                <td className="px-4 py-3 text-accent-primary font-medium">Seedream 5.0 Pro</td>
                <td className="px-4 py-3">ByteDance</td>
                <td className="px-4 py-3">Multilingual text-and-layout image model</td>
              </tr>
            </tbody>
          </table>
        </div>

        <p>
          I am counting GPT-5.6 as one launch even though it is three separate models, because they
          shipped together and share a pricing philosophy. Add Anthropic&apos;s Sonnet 5 (June 30) and
          the July 1 return of Fable 5 and Mythos 5 from their export-control pull, and the buyable
          frontier expanded by roughly eight distinct models in eleven days. That is not a normal
          cadence. That is a scramble.
        </p>

        <h2 className="text-2xl font-semibold text-text-primary pt-4">The Coding Scoreboard</h2>

        <p>
          Everyone leads their launch post with a benchmark. The problem is that no two labs run the
          same harness, so the numbers are not strictly comparable. I am going to show them anyway,
          because the pattern survives the noise. These are SWE-Bench Pro resolve rates as reported by
          each lab, which means they are vendor numbers, not neutral ones. Read them as a shape, not a
          ruling.
        </p>

        <div className="bg-bg-secondary border border-border rounded-lg overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border">
                <th className="text-left px-4 py-3 text-text-primary font-semibold">Model</th>
                <th className="text-left px-4 py-3 text-text-primary font-semibold">SWE-Bench Pro</th>
                <th className="text-left px-4 py-3 text-text-primary font-semibold">Note</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              <tr>
                <td className="px-4 py-3 text-text-primary font-medium">Claude Mythos 5</td>
                <td className="px-4 py-3 text-accent-primary font-semibold">80.3%</td>
                <td className="px-4 py-3">Leads, vendor scaffolding</td>
              </tr>
              <tr>
                <td className="px-4 py-3 text-text-primary font-medium">Claude Fable 5</td>
                <td className="px-4 py-3 text-accent-primary font-semibold">80.0%</td>
                <td className="px-4 py-3">Score contested, replication underway</td>
              </tr>
              <tr>
                <td className="px-4 py-3 text-text-primary font-medium">Grok 4.5</td>
                <td className="px-4 py-3 text-accent-primary font-semibold">64.7%</td>
                <td className="px-4 py-3">Cursor-trained</td>
              </tr>
              <tr>
                <td className="px-4 py-3 text-text-primary font-medium">GPT-5.6 Sol</td>
                <td className="px-4 py-3 text-accent-primary font-semibold">64.6%</td>
                <td className="px-4 py-3">OpenAI flagship tier</td>
              </tr>
              <tr>
                <td className="px-4 py-3 text-text-primary font-medium">GPT-5.6 Terra</td>
                <td className="px-4 py-3 text-accent-primary font-semibold">63.4%</td>
                <td className="px-4 py-3">Mid tier</td>
              </tr>
              <tr>
                <td className="px-4 py-3 text-text-primary font-medium">GPT-5.6 Luna</td>
                <td className="px-4 py-3 text-accent-primary font-semibold">62.7%</td>
                <td className="px-4 py-3">Cheapest tier</td>
              </tr>
              <tr>
                <td className="px-4 py-3 text-text-primary font-medium">GPT-5.5 (April flagship)</td>
                <td className="px-4 py-3 text-accent-primary font-semibold">59.4%</td>
                <td className="px-4 py-3">For reference</td>
              </tr>
            </tbody>
          </table>
        </div>

        <p>
          Look at the cluster. Grok 4.5, all three GPT-5.6 tiers, and last quarter&apos;s flagship land
          inside a six-point band. The two Claude models sit fifteen points clear of the pack. If you
          only read the leaderboard, you would conclude Anthropic won the week and everyone else traded
          rounding errors.
        </p>

        <p>
          That conclusion is wrong, and the reason it is wrong is the second table.
        </p>

        <h2 className="text-2xl font-semibold text-text-primary pt-4">The Number That Actually Moved: Price</h2>

        <p>
          The leaderboard measures capability. Nobody ships production on the leaderboard. They ship on
          a budget. So here is the same window priced out, per million tokens.
        </p>

        <div className="bg-bg-secondary border border-border rounded-lg overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border">
                <th className="text-left px-4 py-3 text-text-primary font-semibold">Model</th>
                <th className="text-left px-4 py-3 text-text-primary font-semibold">Input</th>
                <th className="text-left px-4 py-3 text-text-primary font-semibold">Output</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              <tr>
                <td className="px-4 py-3 text-accent-primary font-medium">GPT-5.6 Luna</td>
                <td className="px-4 py-3 font-mono">$1.00</td>
                <td className="px-4 py-3 font-mono">$6.00</td>
              </tr>
              <tr>
                <td className="px-4 py-3 text-accent-primary font-medium">Grok 4.5</td>
                <td className="px-4 py-3 font-mono">$2.00</td>
                <td className="px-4 py-3 font-mono">$6.00</td>
              </tr>
              <tr>
                <td className="px-4 py-3 text-accent-primary font-medium">Claude Sonnet 5 (intro)</td>
                <td className="px-4 py-3 font-mono">$2.00</td>
                <td className="px-4 py-3 font-mono">$10.00</td>
              </tr>
              <tr>
                <td className="px-4 py-3 text-accent-primary font-medium">GPT-5.6 Terra</td>
                <td className="px-4 py-3 font-mono">$2.50</td>
                <td className="px-4 py-3 font-mono">$15.00</td>
              </tr>
              <tr>
                <td className="px-4 py-3 text-accent-primary font-medium">GPT-5.6 Sol</td>
                <td className="px-4 py-3 font-mono">$5.00</td>
                <td className="px-4 py-3 font-mono">$30.00</td>
              </tr>
              <tr>
                <td className="px-4 py-3 text-accent-primary font-medium">Claude Fable 5</td>
                <td className="px-4 py-3 font-mono">$10.00</td>
                <td className="px-4 py-3 font-mono">$50.00</td>
              </tr>
            </tbody>
          </table>
        </div>

        <p>
          Now overlay the two tables. Grok 4.5 and GPT-5.6 Luna score within a couple of points of
          Sol, and within fifteen points of Fable 5, while costing one fifth to one tenth as much on
          output. The gap between the best model and the good-enough model has never been this cheap to
          skip.
        </p>

        <p>
          The sharpest version of this shows up on DeepSWE, a long-horizon engineering benchmark, when
          you divide score by dollars. By the estimates circulating this week, Luna returns roughly 24
          benchmark points per API dollar. Claude Opus 4.8 returns about 4.5. Fable 5 returns about
          3.2. Luna is not the smartest model on that test. It is doing something like five to seven
          times the work per dollar, and that is the ratio a CFO signs off on, not the leaderboard rank.
        </p>

        <h2 className="text-2xl font-semibold text-text-primary pt-4">Two Bets on the Same Table</h2>

        <p>
          What I find interesting is that these labs are not running the same play. They are running
          opposite ones, and both shipped in the same 48 hours.
        </p>

        <p>
          Anthropic is defending the ceiling. Mythos 5 and Fable 5 hold a real, measurable lead on the
          hardest coding evals, and Anthropic is charging accordingly: $10 input and $50 output on
          Fable 5 is roughly ten times Luna on the way in. The bet is that a slice of the market will
          always pay a premium for the last fifteen points, because on genuinely hard problems those
          points are the whole job.
        </p>

        <p>
          OpenAI and SpaceXAI are attacking the floor. Luna at a dollar in and Grok 4.5 at two dollars
          in are not trying to win the benchmark. They are trying to make the benchmark irrelevant to
          the purchase decision by getting close enough that price becomes the only variable left.
          SpaceXAI trained Grok 4.5 inside Cursor on real developer sessions, which is a different way
          of chasing the same goal: match the frontier on the work people actually do, then win on cost
          and distribution.
        </p>

        <p>
          Both bets can be right at once, and I think they are. The market is splitting into a thin
          premium tier where Anthropic prices like a specialist, and a thick commodity tier where a
          dollar of output buys you most of the frontier. This week is the clearest snapshot yet of
          that split, because you can see both strategies land on the same two days.
        </p>

        <h2 className="text-2xl font-semibold text-text-primary pt-4">The Caveat I Keep Repeating</h2>

        <p>
          Every number in the first table is vendor-reported. Fable 5&apos;s SWE-Bench Pro score is
          already contested, with independent evaluators noting it was produced on Anthropic&apos;s own
          scaffolding rather than a neutral harness. OpenAI&apos;s own comparison tables put Mythos 5
          ahead of Sol on this exact benchmark, which is an unusual thing for a lab to publish about a
          competitor unless the gap is real. The Artificial Analysis Coding Agent Index, which pairs
          models with a fixed harness, tells a slightly different story and puts Sol at the top of the
          new entrants. Different harness, different winner. That is the whole problem with launch-week
          benchmarks.
        </p>

        <p>
          So treat the ranks as provisional. The prices are not provisional. Prices are the one number
          a lab cannot fudge, and the price collapse is what I would build around if I were shipping
          this quarter. You can run your own workload against the current numbers on our{' '}
          <Link href="/tools/cost-calculator" className="text-accent-primary hover:underline">cost calculator</Link>{' '}
          and track the live leaderboard on our{' '}
          <Link href="/benchmarks" className="text-accent-primary hover:underline">benchmarks page</Link>.
        </p>

        <h2 className="text-2xl font-semibold text-text-primary pt-4">What I Am Watching Next</h2>

        <p>
          Three things over the next two weeks. First, independent replication of the Claude
          SWE-Bench Pro numbers on a neutral harness, which will tell us whether the fifteen-point lead
          is real or scaffolding. Second, Gemini 3.5 Pro, which Google slipped from June into a July
          general-availability window and which has not entered this scoreboard yet. When it does, it
          lands straight into the commodity tier and the price pressure gets worse. Third, whether
          Anthropic&apos;s premium holds once buyers have a full month of production data on the cheap
          tier instead of a launch-day benchmark.
        </p>

        <h2 className="text-2xl font-semibold text-text-primary pt-4">Our Take</h2>

        <p>
          The headline this week was five models in 48 hours. The actual event was quieter: the price
          of good enough dropped to a dollar, and the only labs still charging a premium are the two
          that can prove they earn it. Everyone else is now competing on the one axis they cannot spin.
        </p>
      </div>

      {/* Related */}
      <footer className="mt-12 pt-8 border-t border-border">
        <h2 className="text-lg font-semibold text-text-primary mb-4">Related</h2>
        <div className="grid gap-3">
          <Link
            href="/originals/gpt-56-sol-public-sonnet-5-monopoly-ends"
            className="block bg-bg-secondary border border-border rounded-lg px-4 py-3 hover:border-accent-primary transition-colors"
          >
            <span className="text-text-primary text-sm">GPT-5.6 Sol Just Went Public After a 13-Day Federal Gate</span>
          </Link>
          <Link
            href="/originals/grok-45-cursor-harness-pricing-floor"
            className="block bg-bg-secondary border border-border rounded-lg px-4 py-3 hover:border-accent-primary transition-colors"
          >
            <span className="text-text-primary text-sm">Grok 4.5 Is the First Frontier Model Trained From Inside a Harness</span>
          </Link>
          <Link
            href="/originals/chatgpt-work-agent-product-outcome-not-tokens"
            className="block bg-bg-secondary border border-border rounded-lg px-4 py-3 hover:border-accent-primary transition-colors"
          >
            <span className="text-text-primary text-sm">OpenAI Stopped Selling You a Model. It Started Selling You the Finished Job.</span>
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
