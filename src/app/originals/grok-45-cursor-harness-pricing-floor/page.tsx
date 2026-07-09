import { Metadata } from 'next';
import Link from 'next/link';
import { ArrowLeft, Clock, Terminal } from 'lucide-react';
import { ArticleJsonLd } from '@/components/seo/JsonLd';
import ArticleHero from '@/components/originals/ArticleHero';
import ShareBar from '@/components/originals/ShareBar';

export const metadata: Metadata = {
  alternates: { canonical: 'https://tensorfeed.ai/originals/grok-45-cursor-harness-pricing-floor' },
  title: 'Grok 4.5 Is the First Frontier Model Trained From Inside a Harness. Its Price Advantage Lasted 24 Hours.',
  description:
    'SpaceXAI shipped Grok 4.5 on July 8, 2026, twenty-two days after SpaceX closed the $60 billion Anysphere acquisition. It was trained on trillions of tokens of real Cursor sessions against live codebases, it ships inside Cursor on every plan, and it is priced at $2 input and $6 output. Then OpenAI released GPT-5.6 Luna publicly the next morning at $1 and $6. Inside the harness-data thesis, the benchmark sleight of hand in comparing against a model nobody can buy, and what a $6 output tier does to the closed-frontier pricing floor.',
  openGraph: {
    title: 'Grok 4.5 Is the First Frontier Model Trained From Inside a Harness. Its Price Advantage Lasted 24 Hours.',
    description:
      'Grok 4.5 shipped 22 days after SpaceX bought Cursor, trained on the harness data that came with the deal. Priced at $2/$6. Luna landed at $1/$6 the next morning.',
    type: 'article',
    publishedTime: '2026-07-09T18:00:00Z',
    authors: ['Marcus Chen'],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Grok 4.5 Is the First Frontier Model Trained From Inside a Harness.',
    description:
      'SpaceXAI bought the harness, trained on the harness, shipped inside the harness. Then Luna undercut it in 24 hours.',
  },
};

export default function Grok45CursorHarnessPricingFloorPage() {
  return (
    <article className="max-w-3xl mx-auto px-4 sm:px-6 py-10">
      <ArticleJsonLd
        title="Grok 4.5 Is the First Frontier Model Trained From Inside a Harness. Its Price Advantage Lasted 24 Hours."
        description="SpaceXAI released Grok 4.5 on July 8, 2026, trained jointly with Cursor on trillions of tokens of real developer sessions, priced at $2 input and $6 output per million tokens. OpenAI released GPT-5.6 Luna publicly the next morning at $1 and $6. Inside the harness-data thesis and the closed-frontier pricing floor."
        datePublished="2026-07-09"
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

      {/* Hero (graphic mode: terminal black to xAI violet) */}
      <ArticleHero
        mode="graphic"
        icon={Terminal}
        gradientFrom="#0B1120"
        gradientTo="#7C3AED"
        eyebrow="Models &middot; Pricing"
      />

      {/* Header */}
      <header className="mb-10">
        <h1 className="text-3xl sm:text-4xl font-bold text-text-primary mb-4 leading-tight">
          Grok 4.5 Is the First Frontier Model Trained From Inside a Harness. Its Price Advantage
          Lasted 24 Hours.
        </h1>
        <div className="flex items-center gap-3 text-sm text-text-muted">
          <span className="text-text-secondary font-medium">Marcus Chen</span>
          <span>&middot;</span>
          <time dateTime="2026-07-09">July 9, 2026</time>
          <span>&middot;</span>
          <span className="flex items-center gap-1">
            <Clock className="w-3.5 h-3.5" />
            6 min read
          </span>
        </div>
      </header>

      <ShareBar
        path="/originals/grok-45-cursor-harness-pricing-floor"
        title="Grok 4.5 Is the First Frontier Model Trained From Inside a Harness. Its Price Advantage Lasted 24 Hours."
      />

      {/* Article body */}
      <div className="prose-custom space-y-6 text-lg text-text-primary leading-relaxed">
        <p className="text-lg text-text-primary leading-relaxed">
          SpaceXAI shipped Grok 4.5 yesterday. Everyone read the price tag first: $2 per million
          input tokens, $6 per million output. Musk framed it as Opus-class performance at a fraction
          of Opus money, the model went live inside Cursor on every plan the same hour, and the
          coverage wrote itself. Cheap frontier model, incumbents in trouble.
        </p>

        <p>
          The price tag is the least interesting thing in the release. Read the training section
          instead. Grok 4.5 was trained jointly with Cursor on trillions of tokens of real developer
          sessions: humans working live codebases, invoking tools, failing, retrying, accepting
          diffs, rejecting diffs. That corpus did not exist on the open web. It exists because{' '}
          <Link
            href="/originals/spacex-cursor-acquisition-coding-consolidation"
            className="text-accent-primary hover:underline"
          >
            SpaceX bought Anysphere for $60 billion on June 16
          </Link>
          . Twenty-two days later, the first model built on that data shipped.
        </p>

        <p>
          That is the story. A model lab bought a harness, trained on what the harness sees, and
          distributed the result back through the harness. Nobody else in the closed frontier has
          done the full loop.
        </p>

        <h2 className="text-2xl font-semibold text-text-primary pt-4">The 24 Hour Undercut</h2>

        <p>
          Now the part the launch coverage skipped. Grok 4.5 landed on July 8. On the morning of July
          9, OpenAI released GPT-5.6 Luna publicly at $1 input and $6 output, matching Grok 4.5 on
          output and halving it on input. Here is the buyable ladder as of this afternoon, per the{' '}
          <Link href="/models" className="text-accent-primary hover:underline">
            TensorFeed pricing tracker
          </Link>
          .
        </p>

        <div className="bg-bg-secondary border border-border rounded-lg overflow-x-auto my-6">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border">
                <th className="text-left px-4 py-3 text-text-primary font-semibold">Model</th>
                <th className="text-left px-4 py-3 text-text-primary font-semibold">Input / 1M</th>
                <th className="text-left px-4 py-3 text-text-primary font-semibold">Output / 1M</th>
                <th className="text-left px-4 py-3 text-text-primary font-semibold">1M in + 1M out</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              <tr>
                <td className="px-4 py-3 text-accent-primary font-medium">GPT-5.6 Sol</td>
                <td className="px-4 py-3 font-mono">$5.00</td>
                <td className="px-4 py-3 font-mono">$30.00</td>
                <td className="px-4 py-3 font-mono">$35.00</td>
              </tr>
              <tr>
                <td className="px-4 py-3 text-accent-primary font-medium">Claude Opus 4.8</td>
                <td className="px-4 py-3 font-mono">$5.00</td>
                <td className="px-4 py-3 font-mono">$25.00</td>
                <td className="px-4 py-3 font-mono">$30.00</td>
              </tr>
              <tr>
                <td className="px-4 py-3 text-accent-primary font-medium">GPT-5.6 Terra</td>
                <td className="px-4 py-3 font-mono">$2.50</td>
                <td className="px-4 py-3 font-mono">$15.00</td>
                <td className="px-4 py-3 font-mono">$17.50</td>
              </tr>
              <tr>
                <td className="px-4 py-3 text-accent-primary font-medium">Claude Sonnet 5</td>
                <td className="px-4 py-3 font-mono">$2.00</td>
                <td className="px-4 py-3 font-mono">$10.00</td>
                <td className="px-4 py-3 font-mono">$12.00</td>
              </tr>
              <tr>
                <td className="px-4 py-3 text-accent-primary font-medium">Grok 4.5</td>
                <td className="px-4 py-3 font-mono">$2.00</td>
                <td className="px-4 py-3 font-mono">$6.00</td>
                <td className="px-4 py-3 font-mono">$8.00</td>
              </tr>
              <tr>
                <td className="px-4 py-3 text-accent-primary font-medium">GPT-5.6 Luna</td>
                <td className="px-4 py-3 font-mono">$1.00</td>
                <td className="px-4 py-3 font-mono">$6.00</td>
                <td className="px-4 py-3 font-mono">$7.00</td>
              </tr>
              <tr>
                <td className="px-4 py-3 text-accent-primary font-medium">Grok 4.3</td>
                <td className="px-4 py-3 font-mono">$1.25</td>
                <td className="px-4 py-3 font-mono">$2.50</td>
                <td className="px-4 py-3 font-mono">$3.75</td>
              </tr>
            </tbody>
          </table>
        </div>

        <p>
          Two things fall out of that table. The first is that Grok 4.5 does undercut the flagship
          tier hard. Against Opus 4.8, output is 76 percent cheaper. Against Sol, 80 percent cheaper.
          On agentic workloads, where output tokens dominate because the model is writing code and
          reasoning traces rather than reading them, that is not a discount. That is a different
          business.
        </p>

        <p>
          The second is that SpaceXAI raised its own output price 140 percent. Grok 4.3 sells output
          at $2.50. Grok 4.5 sells it at $6.00. The company that just undercut the frontier by 76
          percent simultaneously made its own cheapest serious model look like a bargain. Musk is not
          racing to the bottom. He is walking a new SKU up the ladder while the press writes about
          how cheap it is relative to somebody else.
        </p>

        <h2 className="text-2xl font-semibold text-text-primary pt-4">
          Opus-Class Against a Model You Cannot Buy
        </h2>

        <p>
          The performance claims deserve a harder look than they got. SpaceXAI published four coding
          benchmarks. Grok 4.5 wins on none of them outright against the full field. It beats Opus
          4.8 at max settings on all four, which is the comparison the launch materials lead with.
        </p>

        <div className="bg-bg-secondary border border-border rounded-lg overflow-x-auto my-6">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border">
                <th className="text-left px-4 py-3 text-text-primary font-semibold">Benchmark</th>
                <th className="text-left px-4 py-3 text-text-primary font-semibold">Grok 4.5</th>
                <th className="text-left px-4 py-3 text-text-primary font-semibold">Opus 4.8 (max)</th>
                <th className="text-left px-4 py-3 text-text-primary font-semibold">Gap</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              <tr>
                <td className="px-4 py-3 text-accent-primary font-medium">Terminal Bench 2.1</td>
                <td className="px-4 py-3 font-mono">83.3%</td>
                <td className="px-4 py-3 font-mono">78.9%</td>
                <td className="px-4 py-3 font-mono">+4.4</td>
              </tr>
              <tr>
                <td className="px-4 py-3 text-accent-primary font-medium">DeepSWE 1.0</td>
                <td className="px-4 py-3 font-mono">62.0%</td>
                <td className="px-4 py-3 font-mono">55.8%</td>
                <td className="px-4 py-3 font-mono">+6.2</td>
              </tr>
              <tr>
                <td className="px-4 py-3 text-accent-primary font-medium">SWE Marathon (resolution)</td>
                <td className="px-4 py-3 font-mono">29.0%</td>
                <td className="px-4 py-3 font-mono">26.0%</td>
                <td className="px-4 py-3 font-mono">+3.0</td>
              </tr>
            </tbody>
          </table>
        </div>

        <p>
          Where it gets slippery: the frontier reference point in the SpaceXAI charts is Claude Fable
          5, which tops all four published coding evals. Fable 5 was dark under the Commerce order
          from June 12 through June 30, when the controls were lifted and the model returned on July
          1. So the honest reading of the release is that Grok 4.5 beat every model available on the
          day it shipped, and trails Fable 5, which has been back on the market for eight days. Musk
          himself has conceded that Grok 4.5 trails the leaders. He is right, and the gap now
          matters, because Fable 5 is live.
        </p>

        <p>
          The number I would actually put weight on is the one that is hardest to game: SpaceXAI
          claims roughly 2x token efficiency versus comparable models, solving tasks in under half
          the steps. If that survives independent replication on real repos rather than eval harnesses,
          the effective cost gap is not 76 percent. It is closer to 88 percent, because you are paying
          less per token across fewer tokens. That is what harness training buys you. The model has
          seen what a failed tool call looks like a few hundred million times.
        </p>

        <h2 className="text-2xl font-semibold text-text-primary pt-4">What This Does to the Floor</h2>

        <p>
          We have been tracking the{' '}
          <Link href="/originals/ai-pricing-floor" className="text-accent-primary hover:underline">
            closed-frontier pricing floor
          </Link>{' '}
          for most of the year, and the thesis has been that closed models get cheaper without going
          open, squeezed from below by open weights and from the side by buyer-owned silicon. Grok
          4.5 is the cleanest confirmation yet, with a twist nobody had on the card: the squeeze is
          now coming from a lab that owns the surface where the tokens get spent.
        </p>

        <p>
          Consider what SpaceXAI actually holds. It owns Cursor, so it sees the sessions. It trains on
          the sessions, so the model is fit to the workflow rather than to the eval. It distributes
          inside Cursor on every plan, so it does not pay customer acquisition cost at the API layer.
          And it prices output at $6 because it does not need API gross margin to fund the training
          run. That is a vertically integrated coding stack, and it is priced like a loss leader for a
          rocket company.
        </p>

        <p>
          Anthropic and OpenAI both sell coding capability into harnesses they do not own. Claude Code
          and Codex are the counterweights, and they are good ones, but neither lab is sitting on a
          multi-year archive of a competitor&apos;s users editing live production repos. The Cursor
          purchase looked expensive at $60 billion all-stock three weeks ago. It looks like a data
          acquisition today.
        </p>

        <h2 className="text-2xl font-semibold text-text-primary pt-4">Three Things to Watch</h2>

        <p>
          First, EU availability. Grok 4.5 is not live in the EU in any SpaceXAI product or the
          console, with mid-July given as the target. That is a compliance gap, not a capacity gap,
          and how it resolves tells you whether SpaceXAI intends to operate under the AI Act or route
          around it. Watch the date slip.
        </p>

        <p>
          Second, whether Cursor keeps serving rival models at parity. Grok 4.5 shipped on every
          Cursor plan on day one. The interesting question is whether Sonnet 5 and Sol keep their
          default slots, their rate limits, and their placement in the model picker ninety days from
          now. Owning the harness is only leverage if you eventually pull it. If Cursor quietly demotes
          Anthropic, the acquisition thesis stops being about data and starts being about distribution
          foreclosure, and somebody at the FTC will notice.
        </p>

        <p>
          Third, the token efficiency claim. Two independent replications on real repositories,
          measuring wall-clock steps and total spend rather than pass rate, would settle whether
          harness training is a durable moat or a benchmark artifact. If it holds, every lab without a
          harness has an acquisition problem, and the remaining independent surfaces get expensive
          fast.
        </p>

        <p>
          I do not think Grok 4.5 is the best model in the world. SpaceXAI does not think so either,
          which is why the launch materials talk about price and step count instead of intelligence.
          What it is, is the first evidence that the fastest path to a competitive frontier model in
          2026 does not run through more compute or a cleverer architecture. It runs through owning the
          place where developers already work, and quietly logging what happens there.
        </p>
      </div>

      {/* Related */}
      <footer className="mt-12 pt-8 border-t border-border">
        <h2 className="text-lg font-semibold text-text-primary mb-4">Related</h2>
        <div className="grid gap-3">
          <Link
            href="/originals/spacex-cursor-acquisition-coding-consolidation"
            className="block bg-bg-secondary border border-border rounded-lg px-4 py-3 hover:border-accent-primary transition-colors"
          >
            <span className="text-text-primary text-sm">
              SpaceX Just Bought Cursor for $60 Billion. Every Major AI Coding Tool Now Has an Owner.
            </span>
          </Link>
          <Link
            href="/originals/gpt-56-sol-public-sonnet-5-monopoly-ends"
            className="block bg-bg-secondary border border-border rounded-lg px-4 py-3 hover:border-accent-primary transition-colors"
          >
            <span className="text-text-primary text-sm">
              GPT-5.6 Sol Just Went Public. Sonnet 5&apos;s 9-Day Monopoly on the Buyable Frontier Just
              Ended.
            </span>
          </Link>
          <Link
            href="/originals/ai-pricing-floor"
            className="block bg-bg-secondary border border-border rounded-lg px-4 py-3 hover:border-accent-primary transition-colors"
          >
            <span className="text-text-primary text-sm">The AI Pricing Floor: How Low Can It Go?</span>
          </Link>
          <Link
            href="/originals/ai-api-pricing-war-2026"
            className="block bg-bg-secondary border border-border rounded-lg px-4 py-3 hover:border-accent-primary transition-colors"
          >
            <span className="text-text-primary text-sm">
              The AI API Pricing War: Who&apos;s Winning in 2026?
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
