import { Metadata } from 'next';
import Link from 'next/link';
import { ArrowLeft, Clock, TrendingDown } from 'lucide-react';
import { ArticleJsonLd } from '@/components/seo/JsonLd';
import ArticleHero from '@/components/originals/ArticleHero';
import ShareBar from '@/components/originals/ShareBar';

export const metadata: Metadata = {
  alternates: { canonical: 'https://tensorfeed.ai/originals/fable-5-1-cache-read-cut-agent-pricing-floor' },
  title: "Anthropic Kept Fable at $10 and $50. It Cut Cache Reads 75 Percent. That's the Line Agents Actually Pay.",
  description:
    "On Monday, September 1, 2026, Anthropic shipped Claude Fable 5.1 with the same sticker price as Fable 5, $10 per million input and $50 per million output. It also dropped the cache-read rate from $1.00 per million to $0.25 per million, a 75 percent cut on the piece of the token bill that agentic workloads actually generate. Inside the math, why cache reads are the frontier pricing floor now, what it does to OpenAI and Google, and why the next quarter of the API price war is being fought on a line item most customers do not read.",
  openGraph: {
    title: "Anthropic Kept Fable at $10 and $50. It Cut Cache Reads 75 Percent. That's the Line Agents Actually Pay.",
    description:
      "Fable 5.1 kept the sticker and cut cache reads from $1.00 to $0.25 per million. Cache reads are where agent bills actually live. The frontier pricing floor just moved.",
    type: 'article',
    publishedTime: '2026-09-04T14:00:00Z',
    authors: ['Marcus Chen'],
  },
  twitter: {
    card: 'summary_large_image',
    title: "Anthropic Kept Fable at $10 and $50. It Cut Cache Reads 75 Percent.",
    description:
      "Fable 5.1 dropped cache reads from $1.00 to $0.25 per million, a 25 to 45 percent cut on real agent workloads. The frontier pricing floor moved.",
  },
};

export default function Fable51CacheReadCutAgentPricingFloorPage() {
  return (
    <article className="max-w-3xl mx-auto px-4 sm:px-6 py-10">
      <ArticleJsonLd
        title="Anthropic Kept Fable at $10 and $50. It Cut Cache Reads 75 Percent. That's the Line Agents Actually Pay."
        description="On September 1, 2026, Anthropic shipped Claude Fable 5.1 with unchanged sticker pricing but dropped cache reads 75 percent, from $1.00 to $0.25 per million tokens. Cache reads dominate agentic workloads. Inside the math, and what it does to the frontier pricing floor."
        datePublished="2026-09-04"
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

      {/* Hero (graphic mode: discount green to Anthropic copper) */}
      <ArticleHero
        mode="graphic"
        icon={TrendingDown}
        gradientFrom="#14532D"
        gradientTo="#C26A3A"
        eyebrow="Markets &middot; API Pricing"
      />

      {/* Header */}
      <header className="mb-10">
        <h1 className="text-3xl sm:text-4xl font-bold text-text-primary mb-4 leading-tight">
          Anthropic Kept Fable at $10 and $50. It Cut Cache Reads 75 Percent. That&apos;s the Line Agents Actually Pay.
        </h1>
        <div className="flex items-center gap-3 text-sm text-text-muted">
          <span className="text-text-secondary font-medium">Marcus Chen</span>
          <span>&middot;</span>
          <time dateTime="2026-09-04">September 4, 2026</time>
          <span>&middot;</span>
          <span className="flex items-center gap-1">
            <Clock className="w-3.5 h-3.5" />
            6 min read
          </span>
        </div>
      </header>

      <ShareBar
        path="/originals/fable-5-1-cache-read-cut-agent-pricing-floor"
        title="Anthropic Kept Fable at $10 and $50. It Cut Cache Reads 75 Percent. That's the Line Agents Actually Pay."
      />

      {/* Article body */}
      <div className="prose-custom space-y-6 text-lg text-text-primary leading-relaxed">
        <p className="text-lg text-text-primary leading-relaxed">
          Anthropic shipped Claude Fable 5.1 and Claude Mythos 5.1 on Monday, September 1, 2026,
          three months after Fable 5. The sticker price is unchanged at $10 per million input tokens
          and $50 per million output tokens. The line that moved sits two rows down on the pricing
          page: cache reads dropped from $1.00 per million tokens to $0.25 per million tokens, a 75
          percent cut. Anthropic&apos;s own framing on the same page says the change translates to
          roughly 25 percent lower cost on typical workloads and up to 45 percent on agentic ones.
        </p>

        <p>
          Headline: the frontier tier of the API price war is now being fought on a line item most
          buyers do not read, and Anthropic just cut its number by three quarters while the sticker
          stayed flat.
        </p>

        <h2 className="text-2xl font-semibold text-text-primary pt-4">The Line That Moved</h2>

        <div className="bg-bg-secondary border border-border rounded-lg overflow-x-auto my-6">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border">
                <th className="text-left px-4 py-3 text-text-primary font-semibold">Model</th>
                <th className="text-left px-4 py-3 text-text-primary font-semibold">Input</th>
                <th className="text-left px-4 py-3 text-text-primary font-semibold">Output</th>
                <th className="text-left px-4 py-3 text-text-primary font-semibold">Cache read</th>
                <th className="text-left px-4 py-3 text-text-primary font-semibold">Read vs input</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              <tr>
                <td className="px-4 py-3 text-accent-primary font-medium">Fable 5</td>
                <td className="px-4 py-3 font-mono">$10.00</td>
                <td className="px-4 py-3 font-mono">$50.00</td>
                <td className="px-4 py-3 font-mono">$1.00</td>
                <td className="px-4 py-3 font-mono">10.0%</td>
              </tr>
              <tr>
                <td className="px-4 py-3 text-accent-primary font-medium">Fable 5.1</td>
                <td className="px-4 py-3 font-mono">$10.00</td>
                <td className="px-4 py-3 font-mono">$50.00</td>
                <td className="px-4 py-3 font-mono">$0.25</td>
                <td className="px-4 py-3 font-mono">2.5%</td>
              </tr>
              <tr>
                <td className="px-4 py-3 text-accent-primary font-medium">GPT-5.6 Sol</td>
                <td className="px-4 py-3 font-mono">$5.00</td>
                <td className="px-4 py-3 font-mono">$30.00</td>
                <td className="px-4 py-3 font-mono">$0.50</td>
                <td className="px-4 py-3 font-mono">10.0%</td>
              </tr>
              <tr>
                <td className="px-4 py-3 text-accent-primary font-medium">GPT-5.6 Cyber</td>
                <td className="px-4 py-3 font-mono">$12.50</td>
                <td className="px-4 py-3 font-mono">$75.00</td>
                <td className="px-4 py-3 font-mono">$1.25</td>
                <td className="px-4 py-3 font-mono">10.0%</td>
              </tr>
              <tr>
                <td className="px-4 py-3 text-accent-primary font-medium">Gemini 3.8 Flash</td>
                <td className="px-4 py-3 font-mono">$0.30</td>
                <td className="px-4 py-3 font-mono">$2.50</td>
                <td className="px-4 py-3 font-mono">$0.075</td>
                <td className="px-4 py-3 font-mono">25.0%</td>
              </tr>
            </tbody>
          </table>
          <div className="px-4 py-2 text-xs text-text-muted">
            All figures per million tokens. Gemini 3.8 Flash is a smaller model tier, included for
            floor context. Fable 5.1&apos;s 2.5 percent read-to-input ratio is the lowest at the
            frontier tier.
          </div>
        </div>

        <p>
          Two things to read off the table. First, Anthropic did not fight OpenAI on the sticker.
          Fable 5.1 is still twice the input price and 1.7 times the output price of GPT-5.6 Sol,
          the tier OpenAI positions as the coding and knowledge-work workhorse. Second, on the
          number that matters for an agent that re-sends the same context on every step, Fable 5.1
          is now half the price of GPT-5.6 Sol and one fifth the price of GPT-5.6 Cyber. The
          frontier pricing floor for cached input tokens just fell to $0.25 per million, and the
          model shipping at that number is one of the two credible top-tier coding options.
        </p>

        <h2 className="text-2xl font-semibold text-text-primary pt-4">Why Cache Reads Are the Real Bill</h2>

        <p>
          The theory of pricing on a hosted LLM API used to be simple. An input line, an output
          line, and the input side was cheaper because the model does less work on the way in. That
          held while chat products dominated the workload mix. The message the user typed was a few
          hundred tokens, the reply was a few hundred tokens, cache was a nice-to-have that saved a
          little on system prompts.
        </p>

        <p>
          Agents do not work that way. An agent loop re-sends the same system prompt, the same tool
          definitions, the same repository context, and a growing transcript on every step. The
          model reads all of it. It emits a tool call, a short piece of reasoning, and hands
          control back to the harness. The harness executes the tool, appends the result to the
          transcript, and re-sends the whole thing. Do that for a hundred steps and the cached
          input column dwarfs both fresh input and output on the invoice.
        </p>

        <p>
          The rough shape of an agent turn on a large context: 100,000 tokens of cached context
          resent, 2,000 tokens of new material appended, 500 tokens of output. On Fable 5 pricing
          that was $100 of cache reads plus $20 of new input plus $25 of output, so cache was 69
          percent of a $145 turn. On Fable 5.1 the same turn is $25 of cache reads plus $20 of new
          input plus $25 of output, so cache falls to 36 percent of a $70 turn, and the total
          drops 52 percent. Anthropic&apos;s public framing of 25 to 45 percent savings is
          load-weighted across smaller cache footprints. The upper end of the range is where the
          agent-native products live.
        </p>

        <h2 className="text-2xl font-semibold text-text-primary pt-4">Where This Hits First</h2>

        <p>
          Cursor, Cognition&apos;s Devin, Anthropic&apos;s own Claude Code, Codex, Zed, and the
          long tail of Fable-first coding harnesses have been running gross margins in the
          low single digits for eighteen months, one of the through-lines we covered in the{' '}
          <Link href="/originals/copilot-first-cycle-bill-shock-developer-tokenmaxx" className="text-accent-primary hover:underline">
            Copilot first-cycle bill-shock piece
          </Link>{' '}
          and again in{' '}
          <Link href="/originals/tokenmaxxing-cliff-ipo-math" className="text-accent-primary hover:underline">
            the tokenmaxxing cliff IPO math
          </Link>
          . The unit economics fixed inside a quarter for any product that was cache-heavy on
          Fable. A team burning $8 in COGS per active seat per day at Fable 5 pricing lands closer
          to $4 per seat per day at Fable 5.1 pricing without shipping a single product change. That
          is real margin recovery on a customer base that priced its subscriptions at $20 to $200
          per seat per month with the current cost curve in mind.
        </p>

        <p>
          Two knock-on effects worth naming. Every coding harness that had a routing rule sending
          long-context cache-heavy turns to a cheaper model for margin reasons now has less incentive
          to route away from Fable, which means Anthropic recovers a share of workload that had been
          leaking to OpenAI and Google on cost. And every startup that was raising 2027 capital
          against a projection of Fable 5-level unit economics is going to have to re-diligence the
          bridge, because the model just moved by a factor that changes the shape of the P&amp;L.
        </p>

        <h2 className="text-2xl font-semibold text-text-primary pt-4">What OpenAI and Google Do Next</h2>

        <p>
          OpenAI is the closer of the two problems for Anthropic to have solved. GPT-5.6 Sol prices
          cache reads at 10 percent of input, a ratio that used to be the industry norm. Fable 5.1
          just moved the norm to 2.5 percent. OpenAI can either match the ratio by cutting cache
          reads to $0.50 per million on Sol, which pushes the tier margin down further right after
          the Luna price cut we covered in{' '}
          <Link href="/originals/gpt-56-luna-80-cut-sol-rewrote-inference-stack" className="text-accent-primary hover:underline">
            the Luna 80 percent cut piece
          </Link>
          , or hold the line and cede the agent-heavy segment of the coding market to Fable while
          arguing on sticker for the chat and single-turn segments. Neither option is free. The
          announcement to watch is whether the next OpenAI pricing update quietly cuts cached input
          without touching the input sticker, mirroring Anthropic&apos;s move.
        </p>

        <p>
          Google is in a stranger position. Gemini 3.8 Flash cache reads are $0.075 per million on a
          $0.30 input, so the ratio is high (25 percent) but the sticker is so low that the ratio
          barely matters at that tier. The place Google will feel pressure is the top of the stack,
          Gemini 3.8 Pro and whatever succeeds it, where a Fable-shaped cache pricing model would
          make the frontier tier economically closer to Fable 5.1 than the sticker delta suggests.
          Google has spent a year insisting the Pro tier is the correct home for agent workloads on
          Gemini, and the cache-read line is now the piece of that argument the buyer will check
          first.
        </p>

        <h2 className="text-2xl font-semibold text-text-primary pt-4">The Second-Order Read</h2>

        <p>
          Cutting cache reads by three quarters is a claim about compute economics that Anthropic
          could not have made a year ago. Serving a cache read is a memory-plus-network operation on
          a KV block already resident on the accelerator. The marginal cost is roughly the cost of
          the DRAM footprint the KV block occupies for the duration of the request, plus the fabric
          egress moving it back to compute. On the TPU Trillium and Nvidia Blackwell generations
          both Anthropic and its cloud partners are running today, that number is small and getting
          smaller as HBM density and interconnect bandwidth improve. Anthropic just repriced the API
          to reflect what the silicon has been doing for the last three quarters, and the
          competitive read is that the other two frontier labs will have to do the same math on
          their own accelerator base or accept a widening cost gap on agent workloads.
        </p>

        <p>
          The other second-order read is what this does to the{' '}
          <Link href="/originals/anthropic-200b-google-tpu-math" className="text-accent-primary hover:underline">
            $200 billion Anthropic-Google TPU contract
          </Link>{' '}
          on unit economics. If Anthropic can price cache reads at 2.5 percent of input and still
          make gross margin on the segment, then the TPU per-token cost inside the Google
          contract is materially lower than the public price implies. Which is exactly the point of
          committing $40 billion a year to a single silicon partner. The pricing sheet just made
          part of that math public.
        </p>

        <h2 className="text-2xl font-semibold text-text-primary pt-4">Our Take</h2>

        <p>
          The interesting fact is not the 75 percent number, it is the choice to hold the sticker.
          A traditional price cut would have moved input and output together, generated a headline,
          and signaled a race to the bottom. Anthropic did the opposite. It kept the top-line
          price a buyer sees on the pricing page, which lets it preserve the enterprise anchoring
          it built through the year&apos;s procurement conversations, and it moved the invisible
          line where agent workloads actually settle. That is a segmentation move dressed as a
          discount, and the segment it captures is the one that grows fastest through 2027.
        </p>

        <p>
          Practical implication for anyone building on the API. If your product is agent-shaped and
          you had a routing rule sending long-context turns off Fable to save cost, re-run the
          numbers this week. The gross-margin math flipped, and the version of your product that
          stayed on Fable for quality reasons is now cheaper on the workload that had been the
          reason to route away. If you are pricing a 2027 raise on cost projections that predate
          Monday, redraw the curve; the line that dominates your COGS moved 75 percent in one
          day and the analog moves at OpenAI and Google are the base case rather than the tail
          risk.
        </p>

        <p>
          Three signposts for the next 60 days. Whether OpenAI publishes a cached-input cut on
          GPT-5.6 Sol or GPT-5.5 that lands inside the same order of magnitude as $0.25 per
          million, which is the direct test of whether the price floor at the frontier tier has
          reset industry-wide. Whether any of the coding-harness startups (Cursor, Cognition,
          Codex-native shops) update their pricing pages to reflect the new margin picture, which
          is the direct test of whether the savings pass through to the buyer or stay with the
          harness vendor. And whether Anthropic&apos;s next revenue disclosure breaks out cached
          input as a separate line, because at 2.5 percent of input and 25 to 45 percent of an
          agent bill, cached input is now the metric that tells you where the API business
          actually lives. Any two of the three fire and cache pricing becomes the primary axis
          the frontier tier competes on for the rest of the year.
        </p>
      </div>

      {/* Related */}
      <footer className="mt-12 pt-8 border-t border-border">
        <h2 className="text-lg font-semibold text-text-primary mb-4">Related</h2>
        <div className="grid gap-3">
          <Link
            href="/originals/ai-api-pricing-war-2026"
            className="block bg-bg-secondary border border-border rounded-lg px-4 py-3 hover:border-accent-primary transition-colors"
          >
            <span className="text-text-primary text-sm">The AI API Pricing War of 2026, and Why the Floor Keeps Falling</span>
          </Link>
          <Link
            href="/originals/gpt-56-luna-80-cut-sol-rewrote-inference-stack"
            className="block bg-bg-secondary border border-border rounded-lg px-4 py-3 hover:border-accent-primary transition-colors"
          >
            <span className="text-text-primary text-sm">GPT-5.6 Luna Just Cut 80 Percent, Sol Rewrote the Inference Stack</span>
          </Link>
          <Link
            href="/originals/copilot-first-cycle-bill-shock-developer-tokenmaxx"
            className="block bg-bg-secondary border border-border rounded-lg px-4 py-3 hover:border-accent-primary transition-colors"
          >
            <span className="text-text-primary text-sm">First-Cycle Copilot Bill Shock and the Developer Tokenmaxx Problem</span>
          </Link>
          <Link
            href="/originals/tokenmaxxing-cliff-ipo-math"
            className="block bg-bg-secondary border border-border rounded-lg px-4 py-3 hover:border-accent-primary transition-colors"
          >
            <span className="text-text-primary text-sm">The Tokenmaxxing Cliff and the IPO Math Behind Coding Agents</span>
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
