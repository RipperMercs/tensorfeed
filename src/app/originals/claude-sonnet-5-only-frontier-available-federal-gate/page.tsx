import { Metadata } from 'next';
import Link from 'next/link';
import { ArrowLeft, Clock, Zap } from 'lucide-react';
import { ArticleJsonLd } from '@/components/seo/JsonLd';
import ArticleHero from '@/components/originals/ArticleHero';

import ShareBar from '@/components/originals/ShareBar';

export const metadata: Metadata = {
  alternates: { canonical: 'https://tensorfeed.ai/originals/claude-sonnet-5-only-frontier-available-federal-gate' },
  title: 'Claude Sonnet 5 Just Became the Only Frontier Model You Can Actually Buy. Fable Pulled, GPT-5.6 Sol Is NCD-Gated, Gemini 3.5 Slipped.',
  description:
    'On June 30, 2026 Anthropic shipped Claude Sonnet 5 to the public API at $2/$10 introductory pricing with a 1M context, 85.2 percent SWE-Bench Verified, and 63.2 percent SWE-Bench Pro. It is the only top-tier US frontier model a builder without a federal sponsor can call today. Fable 5 was dark under the export-control pull when this ran (lift announced June 30, access back July 1), GPT-5.6 Sol is inside a customer-by-customer NCD and OSTP queue, and Gemini 3.5 Pro slipped a second I/O commitment into July. The distribution window the federal gate handed Anthropic closed almost as soon as it opened: Fable 5 returned the day this piece published.',
  openGraph: {
    title: 'Claude Sonnet 5 Just Became the Only Frontier Model You Can Actually Buy. Fable Pulled, GPT-5.6 Sol Is NCD-Gated, Gemini 3.5 Slipped.',
    description: 'Sonnet 5 shipped into the one open lane on the frontier ceiling this week. Fable 5 pulled, GPT-5.6 Sol federally gated, Gemini 3.5 Pro slipped again. Here is what the distribution window was worth; Fable 5 returned July 1.',
    type: 'article',
    publishedTime: '2026-07-01T10:00:00Z',
    authors: ['Kira Nolan'],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Claude Sonnet 5 Just Became the Only Frontier Model You Can Actually Buy.',
    description: "Fable pulled, then back July 1. GPT-5.6 Sol NCD-gated. Gemini 3.5 slipped. Sonnet 5's solo window closed almost as soon as it opened.",
  },
};

export default function ClaudeSonnet5OnlyFrontierAvailableFederalGatePage() {
  return (
    <article className="max-w-3xl mx-auto px-4 sm:px-6 py-10">
      <ArticleJsonLd
        title="Claude Sonnet 5 Just Became the Only Frontier Model You Can Actually Buy. Fable Pulled, GPT-5.6 Sol Is NCD-Gated, Gemini 3.5 Slipped."
        description="Anthropic shipped Claude Sonnet 5 to the public API on June 30, 2026 with $2/$10 introductory pricing, a 1M context, 85.2 percent SWE-Bench Verified, and 63.2 percent SWE-Bench Pro. At publication it was the newest top-tier US frontier model a builder without a federal sponsor could call. Fable 5 was dark until its July 1 return, GPT-5.6 Sol was federally gated, Gemini 3.5 Pro slipped a second I/O commitment. The distribution window closed almost as soon as it opened."
        datePublished="2026-07-01"
        author="Kira Nolan"
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
      {/* Hero (graphic mode: Anthropic clay against the dark federal gate) */}
      <ArticleHero
        mode="graphic"
        icon={Zap}
        gradientFrom="#D97757"
        gradientTo="#0F1115"
        eyebrow="Model Release &middot; Federal Gate"
      />

      <header className="mb-10">
        <h1 className="text-3xl sm:text-4xl font-bold text-text-primary mb-4 leading-tight">
          Claude Sonnet 5 Just Became the Only Frontier Model You Can Actually Buy. Fable Pulled, GPT-5.6 Sol Is NCD-Gated, Gemini 3.5 Slipped.
        </h1>
        <div className="flex items-center gap-3 text-sm text-text-muted">
          <span className="text-text-secondary font-medium">Kira Nolan</span>
          <span>&middot;</span>
          <time dateTime="2026-07-01">July 1, 2026</time>
          <span>&middot;</span>
          <span className="flex items-center gap-1">
            <Clock className="w-3.5 h-3.5" />
            7 min read
          </span>
        </div>
      </header>

      <ShareBar
        path="/originals/claude-sonnet-5-only-frontier-available-federal-gate"
        title="Claude Sonnet 5 Just Became the Only Frontier Model You Can Actually Buy. Fable Pulled, GPT-5.6 Sol Is NCD-Gated, Gemini 3.5 Slipped."
      />

      {/* Article body */}
      <div className="prose-custom space-y-6 text-lg text-text-primary leading-relaxed">
        <p className="italic text-text-muted text-base">
          Editor&apos;s note (July 9, 2026): this piece published on July 1 describing the ladder
          as of June 30. Anthropic had announced the Fable 5 export-control lift on June 30, and
          access was restored on July 1, so the distribution window described below closed almost
          as soon as it opened. The analysis is preserved as written; read it as of June 30.
        </p>

        <p>
          On June 30, 2026 Anthropic shipped Claude Sonnet 5 into the public API with a 1M token
          context window, 85.2 percent on SWE-Bench Verified, 63.2 percent on SWE-Bench Pro, and a
          $2 in, $10 out introductory rate that holds through August 31 before it steps up to $3
          and $15. On paper it reads like an incremental Sonnet tick. It is not. Sonnet 5 shipped
          into an empty room. Everyone else at the top of the ladder is either dark, gated, or
          slipped.
        </p>

        <p>
          Fable 5, Anthropic&apos;s own flagship, has been offline since June 12 when Washington
          issued the export control pull. Mythos 5 went with it. GPT-5.6 Sol is inside a
          customer-by-customer preview approved by the Office of the National Cyber Director and
          the Office of Science and Technology Policy, with the broad release still weeks out.
          Gemini 3.5 Pro missed its June ship date and now targets late July, the second I/O
          commitment Google has missed on a flagship this year. Meituan open-sourced LongCat-2.0
          yesterday, which matters at the price floor, but it is not a US-signed frontier product a
          Fortune 500 procurement desk will greenlight without a security review.
        </p>

        <p>
          For the next two to eight weeks, if you want a broadly-available top-tier US model
          shipping into production traffic today, Sonnet 5 is the list. Not the top of the list.
          The list.
        </p>

        <h2 className="text-2xl font-semibold text-text-primary pt-4">What Anthropic Actually Shipped</h2>

        <p>
          Sonnet 5 is Anthropic&apos;s most agentic Sonnet-class model. The company positions it as
          closing most of the gap to Opus 4.8 on reasoning, tool use, coding, computer use, and
          long-horizon planning, while landing at Sonnet pricing. The headline specs read like a
          direct answer to the last six months of enterprise complaints about cost caps.
        </p>

        <p>
          Context is 1M tokens with adaptive thinking and context compaction, which puts it at
          parity with GPT-5.5 on window size and closes a gap that had been showing up on tokenized
          RAG evals. Max output is 128k. Image input is included. Adaptive thinking scales through
          selectable effort levels up to xhigh, which is Anthropic&apos;s answer to OpenAI&apos;s
          max reasoning-effort and ultra modes on Sol.
        </p>

        <p>
          The pricing lane is the tell. Introductory rate through August 31 is $2 input and $10
          output per million tokens, then $3 and $15 at standard rates. There is no long-context
          premium. Rate limits are higher than 4.6 out of the gate.
        </p>

        <p>
          One footnote enterprise procurement teams should read twice: the new tokenizer produces
          roughly 1.0 to 1.35 times more tokens for the same input than the Sonnet 4.6 tokenizer.
          At standard rates a task that used to cost $X on 4.6 can cost up to 1.35 times as much
          per unit of text on the new rate card even with a lower headline number. The
          introductory pricing partially absorbs this. Run a token count on representative traffic
          before you rewrite your run-rate model.
        </p>

        <h2 className="text-2xl font-semibold text-text-primary pt-4">The Benchmarks</h2>

        <p>
          Sonnet 5 leads SWE-Bench Pro, which is the benchmark that matters most for agentic
          coding right now because it has the least contamination surface. It trails GPT-5.5 on
          Terminal-Bench 2.1 by three points and would trail GPT-5.6 Sol Ultra by more if Sol were
          buyable, which it is not. Against the Sonnet 4.6 predecessor the jumps are 12 points on
          SWE-Bench Pro and 6 points on SWE-Bench Verified, which is a real generational tick and
          not a fine-tune.
        </p>

        <div className="bg-bg-secondary border border-border rounded-lg overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border">
                <th className="text-left px-4 py-3 text-text-primary font-semibold">Benchmark</th>
                <th className="text-left px-4 py-3 text-text-primary font-semibold">Sonnet 5</th>
                <th className="text-left px-4 py-3 text-text-primary font-semibold">GPT-5.5</th>
                <th className="text-left px-4 py-3 text-text-primary font-semibold">Notes</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              <tr>
                <td className="px-4 py-3 text-text-primary font-medium">SWE-Bench Pro</td>
                <td className="px-4 py-3 text-accent-primary font-semibold">63.2%</td>
                <td className="px-4 py-3">58.6%</td>
                <td className="px-4 py-3">Best publicly buyable score</td>
              </tr>
              <tr>
                <td className="px-4 py-3 text-text-primary font-medium">SWE-Bench Verified</td>
                <td className="px-4 py-3 text-accent-primary font-semibold">85.2%</td>
                <td className="px-4 py-3">n/d</td>
                <td className="px-4 py-3">Up 6 pts vs Sonnet 4.6</td>
              </tr>
              <tr>
                <td className="px-4 py-3 text-text-primary font-medium">SWE-Bench Multilingual</td>
                <td className="px-4 py-3 text-accent-primary font-semibold">78.3%</td>
                <td className="px-4 py-3">n/d</td>
                <td className="px-4 py-3">Non-English repos</td>
              </tr>
              <tr>
                <td className="px-4 py-3 text-text-primary font-medium">Terminal-Bench 2.1</td>
                <td className="px-4 py-3">80.4%</td>
                <td className="px-4 py-3 text-accent-primary font-semibold">83.4%</td>
                <td className="px-4 py-3">GPT-5.6 Sol Ultra: 91.9 (gated)</td>
              </tr>
            </tbody>
          </table>
        </div>

        <p>
          Numbers marked n/d are not directly disclosed by OpenAI in a comparable form. Compare on
          our{' '}
          <Link href="/benchmarks" className="text-accent-primary hover:underline">benchmarks page</Link>{' '}
          where we track third-party reproductions as they come in.
        </p>

        <h2 className="text-2xl font-semibold text-text-primary pt-4">The Empty Room</h2>

        <p>
          Sonnet 5 did not launch into a fair fight. It launched into the one broad lane still
          open. Here is the state of the top of the ladder as of this morning.
        </p>

        <div className="bg-bg-secondary border border-border rounded-lg overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border">
                <th className="text-left px-4 py-3 text-text-primary font-semibold">Model</th>
                <th className="text-left px-4 py-3 text-text-primary font-semibold">Status Today</th>
                <th className="text-left px-4 py-3 text-text-primary font-semibold">Rate Card</th>
                <th className="text-left px-4 py-3 text-text-primary font-semibold">Bought Without a Sponsor?</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              <tr>
                <td className="px-4 py-3 text-accent-primary font-medium">Claude Sonnet 5</td>
                <td className="px-4 py-3">Public API, general availability</td>
                <td className="px-4 py-3">$2/$10 intro, $3/$15 standard</td>
                <td className="px-4 py-3 text-emerald-400">Yes</td>
              </tr>
              <tr>
                <td className="px-4 py-3 text-accent-primary font-medium">Claude Fable 5</td>
                <td className="px-4 py-3">Dark since June 12 under export control</td>
                <td className="px-4 py-3">$10/$50 (dark)</td>
                <td className="px-4 py-3 text-red-400">No</td>
              </tr>
              <tr>
                <td className="px-4 py-3 text-accent-primary font-medium">Claude Opus 4.8</td>
                <td className="px-4 py-3">Public API, general availability</td>
                <td className="px-4 py-3">$5/$25 standard</td>
                <td className="px-4 py-3 text-emerald-400">Yes</td>
              </tr>
              <tr>
                <td className="px-4 py-3 text-accent-primary font-medium">GPT-5.6 Sol</td>
                <td className="px-4 py-3">Limited preview, NCD + OSTP gated per-customer</td>
                <td className="px-4 py-3">Not yet public</td>
                <td className="px-4 py-3 text-red-400">No</td>
              </tr>
              <tr>
                <td className="px-4 py-3 text-accent-primary font-medium">GPT-5.5</td>
                <td className="px-4 py-3">Public API, general availability</td>
                <td className="px-4 py-3">$5/$30 standard</td>
                <td className="px-4 py-3 text-emerald-400">Yes</td>
              </tr>
              <tr>
                <td className="px-4 py-3 text-accent-primary font-medium">Gemini 3.5 Pro</td>
                <td className="px-4 py-3">Slipped from June to late July</td>
                <td className="px-4 py-3">n/d</td>
                <td className="px-4 py-3 text-red-400">No</td>
              </tr>
              <tr>
                <td className="px-4 py-3 text-accent-primary font-medium">Meituan LongCat-2.0</td>
                <td className="px-4 py-3">Open weights (MIT), inference-only broadly available</td>
                <td className="px-4 py-3">Zero weights, self-host inference cost</td>
                <td className="px-4 py-3 text-yellow-400">Yes, security review required</td>
              </tr>
            </tbody>
          </table>
        </div>

        <p>
          Opus 4.8 and GPT-5.5 are still publicly available and both are strong. But the buyable
          top of the ladder right now is a two-model set: Sonnet 5 at the value tier and Opus 4.8
          or GPT-5.5 at the premium tier. Anthropic just owns two of those three positions with
          the same brand and the same billing surface. Two weeks ago the top of the ladder was
          Fable 5, Opus 4.8, GPT-5.5, GPT-5.6 Sol (previewing), and Gemini 3.5 Pro (coming). The
          list shrunk fast.
        </p>

        <h2 className="text-2xl font-semibold text-text-primary pt-4">The Federal Gate Just Handed Anthropic a Distribution Monopoly</h2>

        <p>
          The Sonnet 5 release timing is not coincidence. The NCD and OSTP customer-by-customer
          gate on GPT-5.6 Sol is running two to eight weeks minimum before broad release, based on
          OpenAI&apos;s own posture and the pace of the Fable 5 pull, which is now nineteen days
          old and still active. That window is exactly the window Sonnet 5 is priced to fill.
        </p>

        <p>
          There is a real irony here. The same federal release-gating template that pulled
          Anthropic&apos;s own flagship 19 days ago is now the reason the Sonnet 5 launch has the
          distribution runway it does. The gate that hurts one Anthropic model helps another one.
          If you were building a procurement strategy at a large enterprise buyer this quarter, the
          rational move is to standardize agentic workflows on Sonnet 5 now rather than wait on
          GPT-5.6 Sol&apos;s queue position. Every week of production integration on Sonnet 5
          during the gate is a week of lock-in that survives whenever the gate lifts.
        </p>

        <p>
          Anthropic&apos;s $47B run-rate context makes this material. The IPO window and
          confidential S-1 filed June 1 at $965B both need a strong Q3, and Q3 begins today. A two
          to eight week window where Sonnet 5 is the only broadly-available frontier alternative
          to Opus 4.8 is exactly the kind of shipping story an S-1 disclosure can lean on. Watch
          the language in the next amended filing.
        </p>

        <h2 className="text-2xl font-semibold text-text-primary pt-4">What Builders Should Do This Week</h2>

        <p>
          If you are running agentic workflows and you have been waiting on GPT-5.6 Sol, stop
          waiting. Route the workload to Sonnet 5 now. The SWE-Bench Pro delta is real, the
          Terminal-Bench 2.1 gap versus GPT-5.5 is three points but versus what you can actually
          buy today it is meaningless. You are picking between Sonnet 5 and Opus 4.8, not Sonnet 5
          and Sol.
        </p>

        <p>
          If you are on Sonnet 4.6, upgrade before August 31. The introductory rate matters, and
          the SWE-Bench jump is enough to justify the migration even factoring in the tokenizer
          expansion. Test it against your representative prompt distribution first because the
          tokenizer difference can eat 20 to 35 percent of the headline savings depending on
          language, format, and prompt style.
        </p>

        <p>
          If you are on Opus 4.8, run the cost delta. Sonnet 5 at intro rates is 60 percent
          cheaper input and output, close on most agentic benchmarks, and behind only on the
          hardest reasoning tasks. For a big chunk of the traffic currently landing on Opus 4.8,
          Sonnet 5 is the right default and Opus 4.8 becomes the escalation lane.
        </p>

        <p>
          If you are on GPT-5.5, the calculus is trickier. GPT-5.5 still wins on Terminal-Bench
          and on some reasoning benchmarks, and OpenAI&apos;s ecosystem and Codex tooling are
          real. But Sonnet 5 at $2 input beats GPT-5.5 at $5 input by more than 2x on rate card,
          leads on SWE-Bench Pro, and shares the 1M context window. On pure economics the switch
          is defensible.
        </p>

        <h2 className="text-2xl font-semibold text-text-primary pt-4">Three Signposts for the Next Ninety Days</h2>

        <p>
          <span className="text-accent-primary font-semibold">One.</span> Does the NCD and OSTP
          gate on GPT-5.6 Sol lift before August 15? If yes, Sonnet 5&apos;s distribution monopoly
          is a six-week window and Anthropic will have booked one quarter of concentrated demand.
          If no, Sol&apos;s absence from the broad market stretches into Q4 planning and the S-1
          amendment language changes.
        </p>

        <p>
          <span className="text-accent-primary font-semibold">Two.</span> Does Fable 5 come back?
          The export-control pull was framed as directive, not permanent. If Fable 5 clears and
          returns before Q3 ends, Anthropic gets the full three-tier ladder back (Sonnet 5, Opus
          4.8, Fable 5) at exactly the moment competitors are still gated. If it does not, Sonnet
          5 and Opus 4.8 have to carry the S-1 revenue narrative alone.
        </p>

        <p>
          <span className="text-accent-primary font-semibold">Three.</span> Where does Gemini 3.5
          Pro actually land in late July? If it ships on time with a competitive SWE-Bench Pro
          number, the buyable ladder rebalances fast and the empty room closes. If it slips a
          third time, Google&apos;s frontier posture becomes a structural question and the top of
          the ladder is functionally Anthropic and OpenAI only.
        </p>

        <h2 className="text-2xl font-semibold text-text-primary pt-4">Our Take</h2>

        <p>
          Sonnet 5 is a good model. On any other week that would be the whole story. It is not
          the whole story this week because the release landed inside a distribution vacuum
          created by a federal gate Anthropic did not build but happens to benefit from
          asymmetrically. The buyable frontier is a two-model list for the next two to eight
          weeks, and Anthropic owns both slots. That is not a benchmark win. It is a distribution
          win. Distribution wins compound faster than benchmarks do.
        </p>

        <p>
          We are adding Sonnet 5 to our{' '}
          <Link href="/models" className="text-accent-primary hover:underline">models tracker</Link>{' '}
          today and updating the{' '}
          <Link href="/tools/cost-calculator" className="text-accent-primary hover:underline">cost calculator</Link>{' '}
          with both the introductory rate and the September step-up. We will be watching NCD queue
          movement on GPT-5.6 Sol closely, because that is the clock on the runway Sonnet 5 got
          for free.
        </p>
      </div>

      {/* Related */}
      <footer className="mt-12 pt-8 border-t border-border">
        <h2 className="text-lg font-semibold text-text-primary mb-4">Related</h2>
        <div className="grid gap-3">
          <Link
            href="/originals/white-house-gpt-56-stagger-federal-gate-bilateral"
            className="block bg-bg-secondary border border-border rounded-lg px-4 py-3 hover:border-accent-primary transition-colors"
          >
            <span className="text-text-primary text-sm">OpenAI Will Stagger GPT-5.6 By Customer. The Federal Gate on the Frontier Just Went Bilateral.</span>
          </Link>
          <Link
            href="/originals/meituan-longcat-2-owl-alpha-openrouter"
            className="block bg-bg-secondary border border-border rounded-lg px-4 py-3 hover:border-accent-primary transition-colors"
          >
            <span className="text-text-primary text-sm">Owl Alpha Was Meituan All Along. LongCat-2.0 Open-Sourced Today at 1.6T, Zero Nvidia.</span>
          </Link>
          <Link
            href="/originals/gpt-5-5-openai-flagship"
            className="block bg-bg-secondary border border-border rounded-lg px-4 py-3 hover:border-accent-primary transition-colors"
          >
            <span className="text-text-primary text-sm">GPT-5.5 Just Landed. OpenAI Doubled the Price and Raised the Bar.</span>
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
