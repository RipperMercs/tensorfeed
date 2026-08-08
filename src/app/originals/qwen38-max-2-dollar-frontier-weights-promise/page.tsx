import { Metadata } from 'next';
import Link from 'next/link';
import { ArrowLeft, Clock, Coins } from 'lucide-react';
import { ArticleJsonLd } from '@/components/seo/JsonLd';

import ArticleHero from '@/components/originals/ArticleHero';
import ShareBar from '@/components/originals/ShareBar';
export const metadata: Metadata = {
  alternates: { canonical: 'https://tensorfeed.ai/originals/qwen38-max-2-dollar-frontier-weights-promise' },
  title: 'Qwen3.8-Max Beats Both Claude Flagships on Terminal-Bench for $2 Input. The Weights Are Still a Promise.',
  description:
    'Alibaba made Qwen3.8-Max broadly available: a 2.4 trillion parameter MoE with 95B active, 1M context, and a Terminal-Bench 2.1 score of 86.6 that lands above Claude Opus 4.8 and Fable 5 and below GPT-5.6 Sol, priced at $2 input and $6 output. The open weights are promised for around August 10 with no license file published. Third Chinese frontier release in 19 days.',
  openGraph: {
    title: 'Qwen3.8-Max Beats Both Claude Flagships on Terminal-Bench for $2 Input. The Weights Are Still a Promise.',
    description:
      'A 2.4T MoE that splits GPT-5.6 Sol and the Claude flagships on Terminal-Bench 2.1, priced at $2/$6. The weights land around August 10, the license file does not exist yet, and this is the third Chinese frontier drop in 19 days.',
    type: 'article',
    publishedTime: '2026-08-04T10:00:00Z',
    authors: ['Marcus Chen'],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Qwen3.8-Max Beats Both Claude Flagships on Terminal-Bench for $2 Input. The Weights Are Still a Promise.',
    description:
      '2.4T total, 95B active, 86.6 on Terminal-Bench 2.1, $2 input. The weights are promised for next week and the license file does not exist yet.',
  },
};

export default function Qwen38MaxFrontierPricePage() {
  return (
    <article className="max-w-3xl mx-auto px-4 sm:px-6 py-10">
      <ArticleJsonLd
        title="Qwen3.8-Max Beats Both Claude Flagships on Terminal-Bench for $2 Input. The Weights Are Still a Promise."
        description="Alibaba made Qwen3.8-Max broadly available: a 2.4 trillion parameter MoE with 95B active, 1M context, and a Terminal-Bench 2.1 score of 86.6, priced at $2 input and $6 output. The open weights are promised for around August 10 with no license file published."
        datePublished="2026-08-04"
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
          Qwen3.8-Max Beats Both Claude Flagships on Terminal-Bench for $2 Input. The Weights Are Still a Promise.
        </h1>
        <div className="flex items-center gap-3 text-sm text-text-muted">
          <span className="text-text-secondary font-medium">Marcus Chen</span>
          <span>&middot;</span>
          <time dateTime="2026-08-04">August 4, 2026</time>
          <span>&middot;</span>
          <span className="flex items-center gap-1">
            <Clock className="w-3.5 h-3.5" />
            7 min read
          </span>
        </div>
      </header>

      <ShareBar
        path="/originals/qwen38-max-2-dollar-frontier-weights-promise"
        title="Qwen3.8-Max Beats Both Claude Flagships on Terminal-Bench for $2 Input. The Weights Are Still a Promise."
      />

      <ArticleHero
        mode="graphic"
        icon={Coins}
        gradientFrom="#7F1D1D"
        gradientTo="#D97706"
        eyebrow="Models &middot; Pricing"
      />

      {/* Article body */}
      <div className="prose-custom space-y-6 text-lg text-text-primary leading-relaxed">
        <p>
          Over the weekend, Alibaba made Qwen3.8-Max broadly available. It is the largest and most
          capable model the Qwen team has shipped: 2.4 trillion total parameters in a
          mixture-of-experts design that activates 95 billion per token, a 1 million token context
          window, and native text, image, and video input. The launch benchmark that matters is
          Terminal-Bench 2.1 at 86.6, which lands above Claude Opus 4.8 and Claude Fable 5, both at
          84.6, and below GPT-5.6 Sol in max mode at 88.8.
        </p>

        <p>
          Sit with that ordering for a second. On the benchmark the industry currently treats as the
          best proxy for agentic terminal work, a Chinese model is sandwiched between the two most
          expensive American flagships. Then look at the price column: $2 per million input tokens,
          $6 per million output, $0.25 per million for implicit caching. Sol costs $5 and $30.
          Fable 5 costs $10 and $50. The capability story is real, but the price story is the one
          that changes routing decisions this week.
        </p>

        <h2 className="text-2xl font-semibold text-text-primary pt-4">The Numbers</h2>

        <div className="bg-bg-secondary border border-border rounded-lg overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border">
                <th className="text-left px-4 py-3 text-text-primary font-semibold">Item</th>
                <th className="text-left px-4 py-3 text-text-primary font-semibold">Value</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              <tr>
                <td className="px-4 py-3 text-text-primary font-medium">Broad availability</td>
                <td className="px-4 py-3">August 2 to 3, 2026 (previewed July 19)</td>
              </tr>
              <tr>
                <td className="px-4 py-3 text-text-primary font-medium">Architecture</td>
                <td className="px-4 py-3">MoE, 2.4T total parameters, 95B active per token</td>
              </tr>
              <tr>
                <td className="px-4 py-3 text-text-primary font-medium">Context / modalities</td>
                <td className="px-4 py-3">1M tokens; text, image, video in; text out</td>
              </tr>
              <tr>
                <td className="px-4 py-3 text-text-primary font-medium">Terminal-Bench 2.1</td>
                <td className="px-4 py-3 text-accent-primary font-semibold">86.6 (Sol max 88.8, Fable 5 and Opus 4.8 both 84.6)</td>
              </tr>
              <tr>
                <td className="px-4 py-3 text-text-primary font-medium">Vision rows</td>
                <td className="px-4 py-3">OSWorld-Verified 86.1, Parametric CAD Bench 91.5, OmniDocBench 1.5 at 92.1</td>
              </tr>
              <tr>
                <td className="px-4 py-3 text-text-primary font-medium">API pricing</td>
                <td className="px-4 py-3 text-accent-primary font-semibold">$2 in / $6 out / $0.25 cached, per 1M tokens</td>
              </tr>
              <tr>
                <td className="px-4 py-3 text-text-primary font-medium">Open weights</td>
                <td className="px-4 py-3">Promised around August 10 on Hugging Face and ModelScope</td>
              </tr>
              <tr>
                <td className="px-4 py-3 text-text-primary font-medium">License</td>
                <td className="px-4 py-3">Not published as of August 4</td>
              </tr>
            </tbody>
          </table>
        </div>

        <p>
          Two caveats belong next to the headline number. Terminal-Bench 2.1 is one benchmark, the
          scores come from Alibaba&apos;s launch post, and single-benchmark orderings have a way of
          compressing once independent harnesses run the model. And Sol in max mode still holds the
          top of the column by 2.2 points. Nobody should claim Qwen3.8-Max is the best model
          available. The claim that survives scrutiny is narrower and still remarkable: it is close
          enough that the price difference becomes the deciding variable for a large class of
          workloads.
        </p>

        <h2 className="text-2xl font-semibold text-text-primary pt-4">The Price Column Is the Story</h2>

        <p>
          Five days ago we wrote about OpenAI cutting GPT-5.6 Luna 80 percent because Sol rewrote
          its own inference stack. That was an attack on the price floor from below: the cheap tier
          got cheaper. Qwen3.8-Max is an attack on the flagship tier from the middle. It prices a
          frontier-adjacent model like a mid-tier one.
        </p>

        <div className="bg-bg-secondary border border-border rounded-lg overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border">
                <th className="text-left px-4 py-3 text-text-primary font-semibold">Model</th>
                <th className="text-left px-4 py-3 text-text-primary font-semibold">Input (per 1M)</th>
                <th className="text-left px-4 py-3 text-text-primary font-semibold">Output (per 1M)</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              <tr>
                <td className="px-4 py-3 text-accent-primary font-medium">Qwen3.8-Max</td>
                <td className="px-4 py-3">$2.00</td>
                <td className="px-4 py-3">$6.00</td>
              </tr>
              <tr>
                <td className="px-4 py-3 text-accent-primary font-medium">GPT-5.6 Sol</td>
                <td className="px-4 py-3">$5.00</td>
                <td className="px-4 py-3">$30.00</td>
              </tr>
              <tr>
                <td className="px-4 py-3 text-accent-primary font-medium">Claude Opus 5</td>
                <td className="px-4 py-3">$5.00</td>
                <td className="px-4 py-3">$25.00</td>
              </tr>
              <tr>
                <td className="px-4 py-3 text-accent-primary font-medium">Claude Fable 5</td>
                <td className="px-4 py-3">$10.00</td>
                <td className="px-4 py-3">$50.00</td>
              </tr>
              <tr>
                <td className="px-4 py-3 text-accent-primary font-medium">GPT-5.6 Luna</td>
                <td className="px-4 py-3">$0.20</td>
                <td className="px-4 py-3">$1.20</td>
              </tr>
              <tr>
                <td className="px-4 py-3 text-accent-primary font-medium">DeepSeek V4-Flash</td>
                <td className="px-4 py-3">$0.14</td>
                <td className="px-4 py-3">$0.28</td>
              </tr>
            </tbody>
          </table>
        </div>

        <p>
          On output tokens, which is where agentic workloads actually spend, Qwen3.8-Max costs one
          fifth of Sol and roughly one eighth of Fable 5. An agent trajectory that burns 10 million
          output tokens costs $60 on Qwen, $300 on Sol, and $500 on Fable 5. If the Terminal-Bench
          ordering holds up in independent runs, the premium labs are charging five to eight times
          the price for low single digit point advantages, and in the Claude case, for a two point
          deficit on this particular row. You can model your own workload on our{' '}
          <Link href="/tools/cost-calculator" className="text-accent-primary hover:underline">cost calculator</Link>{' '}
          and track the full pricing landscape on our{' '}
          <Link href="/models" className="text-accent-primary hover:underline">models tracker</Link>.
        </p>

        <h2 className="text-2xl font-semibold text-text-primary pt-4">Three Releases, Nineteen Days</h2>

        <p>
          Qwen3.8-Max did not arrive alone. It is the third Chinese frontier release in 19 days, and
          the three drops cover three different tiers of the market. Moonshot launched Kimi K3 on
          July 16 and published the full 2.8 trillion parameter weights on July 27, taking the number
          three slot on the Artificial Analysis leaderboard behind Fable 5 and Sol. DeepSeek shipped
          V4-Flash-0731 on July 31: 284 billion total parameters, about 13 billion active, 82.7 on
          Terminal-Bench 2.1, at $0.28 per million output tokens. Now Alibaba has the biggest single
          number on the board with 2.4 trillion parameters and the strongest price-to-capability
          ratio in the flagship tier.
        </p>

        <p>
          The pattern matters more than any single release. Moonshot covered the open-weight
          flagship. DeepSeek covered the inference floor. Alibaba covered the hosted frontier at a
          discount. A year ago the standard line was that Chinese labs trailed the frontier by six
          to nine months. The honest reading of the last three weeks is that the capability gap has
          compressed to a benchmark rounding error, and what remains is a capital gap, a trust gap,
          and increasingly a legal gap.
        </p>

        <h2 className="text-2xl font-semibold text-text-primary pt-4">The Weights Are a Promise, Not a Release</h2>

        <p>
          Alibaba says this will be the first time it open-sources a Max-class model, with weights
          landing on Hugging Face and ModelScope around August 10. As of today there is no
          repository and no license file. Previous open Qwen releases shipped under Apache 2.0, but
          several Chinese lab releases have carried usage restrictions Apache does not, and a 2.4
          trillion parameter download you cannot legally build a commercial product on is a
          marketing artifact, not infrastructure. We said it when Kimi K3 was eleven days of promise
          before the July 27 drop, and we will say it again: treat announced weights as vaporware
          until the repo exists, then read the license file before believing the announcement.
        </p>

        <p>
          There is also a Washington overhang that did not exist a month ago. On July 22 the White
          House named Moonshot for allegedly distilling Anthropic&apos;s Fable model, and Treasury
          said it will examine Chinese open-source models for signs of intellectual property theft,
          with sanctions and Entity List designations on the table for confirmed violations. Chinese
          open weights are now a sanctions surface. Alibaba is about to drop the largest open-weight
          release in history directly into that environment. Enterprise legal teams that spent July
          deciding whether they could touch Kimi K3 now get to run the same analysis on a bigger
          model from a bigger company with more US commercial entanglements.
        </p>

        <h2 className="text-2xl font-semibold text-text-primary pt-4">Our Take</h2>

        <p>
          The benchmark-parity debate is over, and rehashing it wastes everyone&apos;s time. The
          interesting question is what the American flagship premium is actually buying. Some of it
          is real: Sol max mode still tops the terminal column, Fable 5 still leads rows that
          Alibaba&apos;s launch post conveniently does not chart, and the closed labs offer
          jurisdiction, support contracts, and indemnification that no Chinese endpoint can. But the
          premium was priced against a six month capability lead, and the lead the pricing now rests
          on is measured in tenths of points on some rows and is negative on others.
        </p>

        <p>
          Watch what enterprises route, not what they say. Data residency, compliance, and the
          Treasury review will keep regulated workloads on American endpoints regardless of price.
          Everything else, the batch pipelines, the internal tools, the agent experiments that burn
          output tokens by the hundred million, now has a frontier-adjacent option at one fifth to
          one eighth the cost. That traffic moves quietly, and the labs will feel it in the usage
          curves before anyone admits it in public.
        </p>

        <p>
          Three signposts. First, whether the weights and a clean license actually land on August
          10, because an Apache 2.0 release at this scale forces every Western host to decide
          whether to serve it. Second, whether Anthropic reprices Fable 5, which has now been
          undercut on benchmarks by its own Opus 5 at half the price and by Qwen3.8-Max at a fifth.
          Third, whether Treasury&apos;s IP review reaches Qwen before or after the weights ship,
          because a designation after millions of downloads is a very different event than one
          before. We are adding Qwen3.8-Max to the{' '}
          <Link href="/models" className="text-accent-primary hover:underline">models tracker</Link> and{' '}
          <Link href="/benchmarks" className="text-accent-primary hover:underline">benchmarks page</Link>{' '}
          today.
        </p>
      </div>

      {/* Related */}
      <footer className="mt-12 pt-8 border-t border-border">
        <h2 className="text-lg font-semibold text-text-primary mb-4">Related</h2>
        <div className="grid gap-3">
          <Link
            href="/originals/gpt-56-luna-80-cut-sol-rewrote-inference-stack"
            className="block bg-bg-secondary border border-border rounded-lg px-4 py-3 hover:border-accent-primary transition-colors"
          >
            <span className="text-text-primary text-sm">OpenAI Cut Luna 80 Percent Because Sol Rewrote Its Own Inference Stack. The Pacing Letter Just Got a Live Case.</span>
          </Link>
          <Link
            href="/originals/kimi-k3-weights-live-self-host-math"
            className="block bg-bg-secondary border border-border rounded-lg px-4 py-3 hover:border-accent-primary transition-colors"
          >
            <span className="text-text-primary text-sm">The Kimi K3 Weights Went Live at Midnight. The Quantization Is the Story, Not the Parameter Count.</span>
          </Link>
          <Link
            href="/originals/white-house-moonshot-fable-gb300-treasury-gate"
            className="block bg-bg-secondary border border-border rounded-lg px-4 py-3 hover:border-accent-primary transition-colors"
          >
            <span className="text-text-primary text-sm">The White House Named Moonshot for Distilling Fable and Routing GB300s Through Thailand. Chinese Open Weights Are a Sanctions Question Now.</span>
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
