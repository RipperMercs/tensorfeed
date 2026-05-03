import { Metadata } from 'next';
import Link from 'next/link';
import { ArrowLeft, Clock } from 'lucide-react';
import { ArticleJsonLd } from '@/components/seo/JsonLd';
import AdPlaceholder from '@/components/AdPlaceholder';

export const metadata: Metadata = {
  title: 'Mistral Just Shipped a 128B Open-Weight Frontier Coder. The Numbers Make Sonnet Sweat.',
  description:
    'Mistral Medium 3.5 launched with 77.6% on SWE-Bench Verified, 256K context, $1.50/$7.50 pricing, and a modified MIT license. Cloud-based Vibe agents and a Le Chat Work mode shipped alongside. Here is how it stacks up against Claude Sonnet 4.6, GPT-5.5, and Gemini 3.1 Pro, and why open weights at this tier matters.',
  openGraph: {
    title: 'Mistral Just Shipped a 128B Open-Weight Frontier Coder. The Numbers Make Sonnet Sweat.',
    description: 'Mistral Medium 3.5 hits 77.6% on SWE-Bench Verified at half the price of Sonnet 4.6, with open weights and a 256K context. Inside the benchmarks, the Vibe coding agent, and what it changes for self-hosted AI.',
    type: 'article',
    publishedTime: '2026-05-03T10:00:00Z',
    authors: ['Marcus Chen'],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Mistral Just Shipped a 128B Open-Weight Frontier Coder. The Numbers Make Sonnet Sweat.',
    description: 'Mistral Medium 3.5: 77.6% SWE-Bench Verified, 256K context, $1.50/$7.50 pricing, open weights. Inside the launch.',
  },
};

export default function MistralMedium35OpenWeightsFrontierCoderPage() {
  return (
    <article className="max-w-3xl mx-auto px-4 sm:px-6 py-10">
      <ArticleJsonLd
        title="Mistral Just Shipped a 128B Open-Weight Frontier Coder. The Numbers Make Sonnet Sweat."
        description="Mistral Medium 3.5 launched with 77.6% on SWE-Bench Verified, 256K context, $1.50/$7.50 pricing, and a modified MIT license. Inside the benchmarks, the Vibe coding agent, and what open weights at this tier means for the market."
        datePublished="2026-05-03"
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
          Mistral Just Shipped a 128B Open-Weight Frontier Coder. The Numbers Make Sonnet Sweat.
        </h1>
        <div className="flex items-center gap-3 text-sm text-text-muted">
          <span className="text-text-secondary font-medium">Marcus Chen</span>
          <span>&middot;</span>
          <time dateTime="2026-05-03">May 3, 2026</time>
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
          Mistral Medium 3.5 went into public preview this weekend. It is a 128B dense model with a
          256K context, 77.6% on SWE-Bench Verified, and a price tag of $1.50 per million input
          tokens and $7.50 per million output. It also ships with open weights under a modified MIT
          license. That last sentence is the one that should make every API-only frontier lab pay
          attention.
        </p>

        <p>
          I&apos;ve been pulling the launch numbers into our tracker all morning. Here is what is
          actually different, and why this release matters more than the version bump suggests.
        </p>

        <h2 className="text-2xl font-semibold text-text-primary pt-4">One Model, One Set of Weights</h2>

        <p>
          Mistral spent most of 2025 fragmenting its lineup. Magistral for reasoning, Devstral for
          code, Medium 3.x for general chat. Medium 3.5 collapses all three back into a single set
          of weights. One 128B dense model handles instruction following, multi-step reasoning, and
          coding tasks, with a configurable reasoning effort knob you set per request.
        </p>

        <p>
          That last bit matters for anyone building agentic systems. You can hit the same endpoint
          with reasoning effort low for a quick lookup, or crank it up for a complex agentic run,
          without switching models or paying to host two checkpoints. It is the same trick OpenAI
          and Anthropic do internally with thinking budgets, but exposed cleanly at the API level.
        </p>

        <p>
          Context window is 256K, larger than Sonnet 4.6&apos;s 200K and double GPT-5.4&apos;s old
          128K. That is enough to fit roughly 500 pages of text or a good chunk of a real codebase
          in a single pass.
        </p>

        <h2 className="text-2xl font-semibold text-text-primary pt-4">The Benchmarks: Real Coding Work, Not Trivia</h2>

        <p>
          Mistral leaned hard on practical benchmarks for this release, and it is the right call.
          The headline number is 77.6% on SWE-Bench Verified. That is the benchmark that actually
          matters for coding agents: real GitHub issues from real open-source repos, scored by
          whether the model&apos;s patch passes the hidden test suite.
        </p>

        <p>
          Claude Sonnet 4.6 sits at about 79.6% on the same benchmark. So Sonnet still wins by two
          points. But Mistral Medium 3.5 costs half as much per token, ships with open weights,
          and runs self-hosted on as few as four GPUs through vLLM, SGLang, or Ollama. Two points
          of SWE-Bench is not nothing, but at this price point it is a comfortable trade.
        </p>

        <p>
          The other number Mistral is highlighting is 91.4% on tau-cubed Telecom, a domain-specific
          agentic benchmark that tests tool use and multi-step problem solving in a customer
          support setting. That is a strong agentic score for a model in this weight class.
        </p>

        <div className="bg-bg-secondary border border-border rounded-lg overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border">
                <th className="text-left px-4 py-3 text-text-primary font-semibold">Model</th>
                <th className="text-left px-4 py-3 text-text-primary font-semibold">Input (per 1M)</th>
                <th className="text-left px-4 py-3 text-text-primary font-semibold">Output (per 1M)</th>
                <th className="text-left px-4 py-3 text-text-primary font-semibold">Context</th>
                <th className="text-left px-4 py-3 text-text-primary font-semibold">Open</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              <tr>
                <td className="px-4 py-3 text-accent-primary font-medium">Mistral Medium 3.5</td>
                <td className="px-4 py-3">$1.50</td>
                <td className="px-4 py-3">$7.50</td>
                <td className="px-4 py-3">256K</td>
                <td className="px-4 py-3">Yes (modified MIT)</td>
              </tr>
              <tr>
                <td className="px-4 py-3 text-accent-primary font-medium">Claude Sonnet 4.6</td>
                <td className="px-4 py-3">$3.00</td>
                <td className="px-4 py-3">$15.00</td>
                <td className="px-4 py-3">200K</td>
                <td className="px-4 py-3">No</td>
              </tr>
              <tr>
                <td className="px-4 py-3 text-accent-primary font-medium">GPT-5.5</td>
                <td className="px-4 py-3">$5.00</td>
                <td className="px-4 py-3">$30.00</td>
                <td className="px-4 py-3">1M</td>
                <td className="px-4 py-3">No</td>
              </tr>
              <tr>
                <td className="px-4 py-3 text-accent-primary font-medium">Gemini 3.1 Pro</td>
                <td className="px-4 py-3">$1.25</td>
                <td className="px-4 py-3">$5.00</td>
                <td className="px-4 py-3">2M</td>
                <td className="px-4 py-3">No</td>
              </tr>
              <tr>
                <td className="px-4 py-3 text-accent-primary font-medium">DeepSeek V4</td>
                <td className="px-4 py-3">$0.55</td>
                <td className="px-4 py-3">$2.20</td>
                <td className="px-4 py-3">128K</td>
                <td className="px-4 py-3">Yes (MIT)</td>
              </tr>
            </tbody>
          </table>
        </div>

        <p>
          On price-to-capability, Mistral is now sitting in a real sweet spot. Cheaper than Sonnet
          4.6, more capable on practical coding than the open-weight runners-up at this size, and
          with open weights so you can actually rent or own the inference instead of being locked
          to a single API gateway.
        </p>

        <h2 className="text-2xl font-semibold text-text-primary pt-4">Vibe Goes Async, Le Chat Goes to Work</h2>

        <p>
          The model is half the story. The other half is what Mistral built on top of it.
        </p>

        <p>
          Vibe, Mistral&apos;s coding agent, now runs in the cloud. You can spawn a session from
          the CLI or from Le Chat, and the agent runs asynchronously in an isolated sandbox.
          Sessions opened locally can be teleported to the cloud without losing history or state.
          Translation: you can kick off a long-running agentic coding task on your laptop, close
          the lid, and have it keep working. When you reopen, it picks up exactly where it was.
        </p>

        <p>
          That is the same shape Anthropic offered with Claude Code&apos;s remote sessions and what
          OpenAI shipped with Codex on Bedrock last week. Mistral is now in that bracket too, and
          they have done it with an open-weight model underneath, which means anyone can host the
          agent infrastructure end-to-end on their own iron if they want to.
        </p>

        <p>
          Le Chat, Mistral&apos;s consumer-facing assistant, also got a Work mode. It runs the same
          Medium 3.5 model and can chain multi-step workflows across email and calendar through
          built-in connectors. Sensitive actions require explicit user approval before the agent
          executes them, which matches the consent model we wrote about in our coverage of the{' '}
          <Link href="/originals/cloudflare-stripe-agent-provisioning-protocol" className="text-accent-primary hover:underline">
            Cloudflare-Stripe agent provisioning protocol
          </Link>
          {' '}from Friday.
        </p>

        <h2 className="text-2xl font-semibold text-text-primary pt-4">Why the Open Weights Part Actually Matters</h2>

        <p>
          The pricing is good. The benchmarks are good. The agent infrastructure is good. But the
          piece that resets the conversation is the license.
        </p>

        <p>
          Mistral Medium 3.5 ships with open weights under a modified MIT license. You can pull
          the checkpoint from Hugging Face, host it on your own four-GPU node with vLLM, fine-tune
          it on your domain data, and ship it inside an air-gapped network. None of that is true
          for Sonnet 4.6, GPT-5.5, or Gemini 3.1 Pro, which are all closed-weight, API-only
          products.
        </p>

        <p>
          We covered this dynamic with{' '}
          <Link href="/originals/deepseek-v4-open-source-frontier" className="text-accent-primary hover:underline">DeepSeek V4</Link>{' '}
          earlier in the year: when an open-weight model gets close enough to frontier on
          capability, the locked-in pricing of the proprietary labs starts looking like rent.
          Mistral is now playing the same card, but at a quality tier where the trade-off versus
          Sonnet is two points on SWE-Bench instead of ten.
        </p>

        <p>
          For regulated industries, defense contractors, and anyone in a country where US-hosted
          AI is a procurement headache, that gap collapses. Self-hosted Medium 3.5 on your own
          hardware lets you keep the data in your VPC, customize the model with your own
          fine-tunes, and skip the per-token meter entirely once you have amortized the GPU spend.
        </p>

        <AdPlaceholder format="in-article" className="my-8" />

        <h2 className="text-2xl font-semibold text-text-primary pt-4">The Pricing Criticism</h2>

        <p>
          One caveat. The hosted API price of $1.50 input and $7.50 output drew some pushback from
          the Mistral community on launch day. Compared to DeepSeek V4 at $0.55 in and $2.20 out,
          or Gemini 3.1 Pro at $1.25 in and $5.00 out, Mistral is sitting on the higher end of the
          value tier. The argument from cost-sensitive shops: if you are willing to pay for
          quality, why not just buy Sonnet at $3.00 in?
        </p>

        <p>
          The answer Mistral is implicitly giving is that you should run it yourself. The hosted
          API is for evaluation and convenience. The real value proposition is the open weights
          and the inference economics that come with hosting it on your own infrastructure. If you
          are running enough volume that the per-token math matters, you should not be hitting the
          Mistral API endpoint in the first place.
        </p>

        <h2 className="text-2xl font-semibold text-text-primary pt-4">Where This Leaves the Market</h2>

        <p>
          The frontier model market is now stratifying in a way that is starting to matter for
          buyers. The top tier (GPT-5.5 and Claude Opus 4.7) is doubling down on premium pricing
          for raw capability. The mid-tier (Sonnet 4.6, Gemini 3.1 Pro) is fighting on
          price-to-capability ratios. And the open-weight tier (Mistral Medium 3.5, DeepSeek V4,
          Llama 4) is pulling closer to the closed mid-tier on benchmarks while owning the
          self-hosting and fine-tuning use cases outright.
        </p>

        <p>
          The harness gap we{' '}
          <Link href="/originals/harness-gap-not-the-model" className="text-accent-primary hover:underline">wrote about last week</Link>
          {' '}is also relevant here. SWE-Bench Verified scores depend heavily on the agent harness
          wrapping the model. Mistral built Vibe specifically to extract maximum performance from
          Medium 3.5 on agentic coding. If you wire Medium 3.5 into a generic harness, expect a
          lower number. If you use it through Vibe, you should be able to reproduce close to the
          published 77.6%.
        </p>

        <h2 className="text-2xl font-semibold text-text-primary pt-4">Our Take</h2>

        <p>
          Mistral Medium 3.5 is the most interesting open-weight release of the year so far. It is
          not topping every leaderboard, and it is not the cheapest option on the market. But it
          is the first model that meaningfully closes the SWE-Bench gap to Claude Sonnet 4.6 while
          staying open-weight, runnable on commodity GPUs, and licensed permissively enough for
          commercial use.
        </p>

        <p>
          For our own stack, this changes the calculus on a few internal tools we have been
          drafting against Sonnet. If we can run Medium 3.5 on a Hetzner box for the price of one
          good dinner per day and keep our data on our own iron, the API cost of Sonnet starts
          looking like a tax we are paying for two points of benchmark performance.
        </p>

        <p>
          We are adding Medium 3.5 to our{' '}
          <Link href="/models" className="text-accent-primary hover:underline">models tracker</Link>,{' '}
          <Link href="/tools/cost-calculator" className="text-accent-primary hover:underline">cost calculator</Link>, and{' '}
          <Link href="/benchmarks" className="text-accent-primary hover:underline">benchmarks page</Link>{' '}
          today. We are also wiring it into our edge latency probe so we can compare cold-start
          and first-token times against Sonnet, GPT-5.5, and Gemini under real load.
        </p>

        <p>
          Watch this one closely. The open-weight frontier is no longer a quality compromise. It
          is just a different deployment story, and Mistral just made that story two points more
          expensive to ignore.
        </p>
      </div>

      {/* Related */}
      <footer className="mt-12 pt-8 border-t border-border">
        <h2 className="text-lg font-semibold text-text-primary mb-4">Related</h2>
        <div className="grid gap-3">
          <Link
            href="/originals/deepseek-v4-open-source-frontier"
            className="block bg-bg-secondary border border-border rounded-lg px-4 py-3 hover:border-accent-primary transition-colors"
          >
            <span className="text-text-primary text-sm">DeepSeek V4 and the Open-Source Frontier</span>
          </Link>
          <Link
            href="/originals/gpt-5-5-openai-flagship"
            className="block bg-bg-secondary border border-border rounded-lg px-4 py-3 hover:border-accent-primary transition-colors"
          >
            <span className="text-text-primary text-sm">GPT-5.5 Just Landed. OpenAI Doubled the Price and Raised the Bar.</span>
          </Link>
          <Link
            href="/originals/harness-gap-not-the-model"
            className="block bg-bg-secondary border border-border rounded-lg px-4 py-3 hover:border-accent-primary transition-colors"
          >
            <span className="text-text-primary text-sm">It Is Not the Model. It Is the Harness.</span>
          </Link>
          <Link
            href="/originals/ai-api-pricing-war-2026"
            className="block bg-bg-secondary border border-border rounded-lg px-4 py-3 hover:border-accent-primary transition-colors"
          >
            <span className="text-text-primary text-sm">The AI API Pricing War: Who&apos;s Winning in 2026?</span>
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
