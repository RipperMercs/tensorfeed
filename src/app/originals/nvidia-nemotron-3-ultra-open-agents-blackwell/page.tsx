import { Metadata } from 'next';
import Link from 'next/link';
import { ArrowLeft, Clock, Cpu } from 'lucide-react';
import { ArticleJsonLd } from '@/components/seo/JsonLd';
import ArticleHero from '@/components/originals/ArticleHero';
import ShareBar from '@/components/originals/ShareBar';

export const metadata: Metadata = {
  alternates: { canonical: 'https://tensorfeed.ai/originals/nvidia-nemotron-3-ultra-open-agents-blackwell' },
  title: "NVIDIA Just Open-Sourced a 550B Agent Model. The Architecture Is the Blackwell Sale.",
  description:
    "On June 4, 2026, NVIDIA released Nemotron 3 Ultra: a 550B mixture-of-experts hybrid Mamba-Transformer with 55B active parameters, a 1M token context, 300+ tokens/sec, and open weights under the NVIDIA Open Model License. It is the highest scoring US open weight model on the Artificial Analysis Intelligence Index (48), still six points behind China's Kimi K2.6 (54). On OpenRouter it lists at $0.50 input / $2.50 output per million tokens, with a free tier. NVIDIA built it for long-running agents and trained it natively in NVFP4 on Blackwell. Inside the spec, what NVFP4 and Mamba do to the inference TCO math, the US versus China open weight gap that did not close, and why the giveaway is a chip sales motion.",
  openGraph: {
    title: "NVIDIA Just Open-Sourced a 550B Agent Model. The Architecture Is the Blackwell Sale.",
    description:
      "Nemotron 3 Ultra is the best US open weight model and a Blackwell-native architecture. Inside the spec, the US versus China gap, and why open weights are NVIDIA's chip sales motion.",
    type: 'article',
    publishedTime: '2026-06-07T14:00:00Z',
    authors: ['Kira Nolan'],
  },
  twitter: {
    card: 'summary_large_image',
    title: "NVIDIA Just Open-Sourced a 550B Agent Model. The Architecture Is the Blackwell Sale.",
    description:
      "550B MoE, 55B active, hybrid Mamba-Transformer, NVFP4-native, open weights. The top US open weight model, still six points behind Kimi K2.6. Why the giveaway is a Blackwell motion.",
  },
};

export default function NvidiaNemotron3UltraOpenAgentsBlackwellPage() {
  return (
    <article className="max-w-3xl mx-auto px-4 sm:px-6 py-10">
      <ArticleJsonLd
        title="NVIDIA Just Open-Sourced a 550B Agent Model. The Architecture Is the Blackwell Sale."
        description="On June 4, 2026, NVIDIA released Nemotron 3 Ultra, a 550B MoE (55B active) hybrid Mamba-Transformer built for long-running agents and trained natively in NVFP4 on Blackwell. It is the top US open weight model (AA Intelligence Index 48), still six points behind China's Kimi K2.6. Inside the architecture, the inference economics, the US versus China open weight gap, and why the giveaway is a chip sales motion."
        datePublished="2026-06-07"
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

      {/* Hero (graphic mode: NVIDIA green to silicon charcoal) */}
      <ArticleHero
        mode="graphic"
        icon={Cpu}
        gradientFrom="#76B900"
        gradientTo="#1F2937"
        eyebrow="Product &middot; Models &amp; Agents"
      />

      {/* Header */}
      <header className="mb-10">
        <h1 className="text-3xl sm:text-4xl font-bold text-text-primary mb-4 leading-tight">
          NVIDIA Just Open-Sourced a 550B Agent Model. The Architecture Is the Blackwell Sale.
        </h1>
        <div className="flex items-center gap-3 text-sm text-text-muted">
          <span className="text-text-secondary font-medium">Kira Nolan</span>
          <span>&middot;</span>
          <time dateTime="2026-06-07">June 7, 2026</time>
          <span>&middot;</span>
          <span className="flex items-center gap-1">
            <Clock className="w-3.5 h-3.5" />
            6 min read
          </span>
        </div>
      </header>

      <ShareBar
        path="/originals/nvidia-nemotron-3-ultra-open-agents-blackwell"
        title="NVIDIA Just Open-Sourced a 550B Agent Model. The Architecture Is the Blackwell Sale."
      />

      {/* Article body */}
      <div className="prose-custom space-y-6 text-text-secondary leading-relaxed">
        <p className="text-lg text-text-primary leading-relaxed">
          On Thursday morning Pacific time, NVIDIA pushed Nemotron 3 Ultra to HuggingFace, OpenRouter,
          and NIM. It is a 550 billion parameter mixture-of-experts model with 55B active, a hybrid
          Mamba and attention design, a 1M token context, and open weights under the NVIDIA Open
          Model License. NVIDIA is calling it the first open frontier model purpose-built for
          long-running agents. It is also the cleverest piece of Blackwell marketing the company has
          shipped this year.
        </p>

        <p>
          The headlines are reading it as a model release. We are reading it as a chip release with a
          model attached.
        </p>

        <h2 className="text-2xl font-semibold text-text-primary pt-4">The Spec, in Numbers</h2>

        <div className="bg-bg-secondary border border-border rounded-lg overflow-x-auto my-6">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border">
                <th className="text-left px-4 py-3 text-text-primary font-semibold">Number</th>
                <th className="text-left px-4 py-3 text-text-primary font-semibold">Value</th>
                <th className="text-left px-4 py-3 text-text-primary font-semibold">Notes</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              <tr>
                <td className="px-4 py-3 text-accent-primary font-medium">Total parameters</td>
                <td className="px-4 py-3 font-mono">550B</td>
                <td className="px-4 py-3">MoE; 55B active per token</td>
              </tr>
              <tr>
                <td className="px-4 py-3 text-accent-primary font-medium">Architecture</td>
                <td className="px-4 py-3 font-mono">Mamba + attention</td>
                <td className="px-4 py-3">Hybrid layers; NVFP4 routed experts, FP8 shared, BF16 attention</td>
              </tr>
              <tr>
                <td className="px-4 py-3 text-accent-primary font-medium">Context</td>
                <td className="px-4 py-3 font-mono">1M tokens</td>
                <td className="px-4 py-3">Mamba layers carry most of the long range work</td>
              </tr>
              <tr>
                <td className="px-4 py-3 text-accent-primary font-medium">Throughput</td>
                <td className="px-4 py-3 font-mono">300+ tok/sec</td>
                <td className="px-4 py-3">NVIDIA-reported, ~5.9x vs GLM-5.1 on 8K/64K</td>
              </tr>
              <tr>
                <td className="px-4 py-3 text-accent-primary font-medium">AA Intelligence Index</td>
                <td className="px-4 py-3 font-mono">48</td>
                <td className="px-4 py-3">Top US open weight; Kimi K2.6 leads at 54</td>
              </tr>
              <tr>
                <td className="px-4 py-3 text-accent-primary font-medium">AA-Omniscience</td>
                <td className="px-4 py-3 font-mono">78.7</td>
                <td className="px-4 py-3">Highest non-hallucination score in its set</td>
              </tr>
              <tr>
                <td className="px-4 py-3 text-accent-primary font-medium">OpenRouter list</td>
                <td className="px-4 py-3 font-mono">$0.50 / $2.50</td>
                <td className="px-4 py-3">Per million input / output tokens; free tier alongside</td>
              </tr>
              <tr>
                <td className="px-4 py-3 text-accent-primary font-medium">License</td>
                <td className="px-4 py-3 font-mono">NVIDIA OML / OpenMDW-1.1</td>
                <td className="px-4 py-3">Commercial use permitted; weights, data, recipes released</td>
              </tr>
            </tbody>
          </table>
        </div>

        <p>
          The blended cost on Artificial Analysis lands near $0.52 per million at a typical mix, with
          cache hits discounted roughly two-thirds against input. That is the same price tier
          DeepSeek and Qwen have been pulling US inference toward for the last six months, on a model
          NVIDIA designed to run fastest on the hardware NVIDIA sells. The pricing is the point.
        </p>

        <h2 className="text-2xl font-semibold text-text-primary pt-4">Why the Architecture Is the Sale</h2>

        <p>
          Three choices in this model are silicon decisions disguised as research decisions.
        </p>

        <p>
          One, the routed experts ship in NVFP4. NVFP4 is NVIDIA&apos;s 4-bit floating-point format,
          and Blackwell is the only generation of NVIDIA silicon with native tensor-core support for
          it. Run the same checkpoint on Hopper and you fall back to FP8 or BF16, eating the memory
          and throughput advantage that makes a 550B model affordable in the first place. Run it on
          AMD MI300 or Trainium and you lose the format entirely. The weights are open. The format
          they want to live in is not.
        </p>

        <p>
          Two, the long context is carried by Mamba layers, not by stretched attention. Mamba is
          linear in sequence length where attention is quadratic, which is what makes a 1M token
          context economically possible at 300+ tokens per second. It is also a layer type whose
          performance ceiling on competing accelerators is still an open question. Blackwell&apos;s
          memory bandwidth and the cuDNN kernel work NVIDIA has been quietly shipping for state-space
          models give Nemotron 3 Ultra a runway nobody else has tuned for yet. If long-running agents
          are the workload that defines 2027, NVIDIA just shipped the reference implementation.
        </p>

        <p>
          Three, the model is positioned for agent trajectories, not for chat. NVIDIA&apos;s own
          framing emphasizes hundreds of turns, sub-agent delegation, tool calls, and error
          recovery. That is the workload profile where token volume per task is highest and where
          inference cost dominates total cost of ownership. Saving 30 percent on per-token compute
          across a 50,000-token agent trajectory matters in a way it does not for a 2,000-token
          chatbot reply. The model is shaped for the workload most likely to consume the most chips
          per dollar of value.
        </p>

        <h2 className="text-2xl font-semibold text-text-primary pt-4">The US Versus China Gap That Did Not Close</h2>

        <p>
          The AA Intelligence Index score is 48. The leader on open weights is Moonshot&apos;s Kimi
          K2.6 at 54. Behind Kimi sit DeepSeek V4, Qwen 3, and GLM 5.1, all out of China, all open,
          all priced for builders to default to them. Nemotron 3 Ultra is the best the United States
          has shipped on open weights this year, and it is six points behind the Chinese frontier.
        </p>

        <p>
          Six points on Intelligence Index is not a rounding error. It is the gap between an agent
          that can plan a multi-step workflow and recover from a failed tool call, and an agent that
          loses the plot at turn forty. The closed US frontier (Claude Opus 4.8, GPT-5.5, Gemini 3.5
          Pro) sits well above all of this, but the closed models do not address the inference cost
          curve we{' '}
          <Link href="/originals/ai-pricing-floor" className="text-accent-primary hover:underline">
            wrote about in April
          </Link>
          . Open weights do. And on the open shelf, the US has been a customer of China for the
          better part of a year. Nemotron 3 Ultra is the first credible US response. It is also
          still a response, not a lead.
        </p>

        <p>
          The frame to hold both at once: NVIDIA wants the US to have a default open frontier model
          to standardize on, because the consequence of US builders defaulting to DeepSeek and Qwen
          is that the chip choice eventually starts looking neutral too. NVIDIA does not love the
          option set there. A 48 on AA at 300+ tokens per second on Blackwell is good enough to give
          US developers a reason to stop one step before the Chinese checkpoints. That is the
          strategic job of this release. Closing the gap to Kimi is the engineering job for the next
          one.
        </p>

        <h2 className="text-2xl font-semibold text-text-primary pt-4">What This Does to the Inference Floor</h2>

        <p>
          Two things, both pointed in the same direction.
        </p>

        <p>
          The list price falls. A 550B-class model at $0.50 input and $2.50 output drags the
          near-frontier open tier into the same neighborhood DeepSeek and Qwen have already
          established. The blended $0.52 per million is roughly an order of magnitude under
          flagship Claude and GPT pricing, and it is set by a vendor whose entire business is
          getting more of these calls to run on Blackwell. The inference floor we have been
          tracking just got another anchor.
        </p>

        <p>
          The hardware mix consolidates. Cheap open inference at this quality, on a model whose
          architecture is sized to a specific format and a specific memory hierarchy, pulls
          inference deployment toward the silicon that runs it best. Cerebras and Groq still own
          niches at the extreme low-latency end; AMD MI300 still wins on dollar-per-FLOP for some
          workloads. But for the agent workload Nemotron 3 Ultra is built for, the path of least
          resistance routes back to Blackwell. NVIDIA spent zero dollars in headline ad buys for
          this and gave away a frontier model. It will recoup the cost in Blackwell rack orders for
          the next three years.
        </p>

        <h2 className="text-2xl font-semibold text-text-primary pt-4">Our Take</h2>

        <p>
          This is the same playbook Google ran with TPUs, and the same logic underneath the{' '}
          <Link href="/originals/anthropic-200b-google-tpu-math" className="text-accent-primary hover:underline">
            $200 billion Anthropic-Google TPU commitment
          </Link>
          : make the chip indispensable to the workload by making the reference workload native to
          the chip. Google did it through a customer contract. NVIDIA is doing it through an open
          model release. The mechanism is different. The lock-in is identical.
        </p>

        <p>
          For builders, the practical read is straightforward. If you are running long-horizon
          agents on a budget, Nemotron 3 Ultra is now on the shortlist along with DeepSeek V4 and
          Kimi K2.6, and at this price tier it deserves a real eval. The catch is the deployment
          decision: if you want NVIDIA&apos;s reported throughput, you are sizing your inference
          around Blackwell. Bench it on whatever you actually plan to ship on, not on the NIM
          reference rack. The numbers that come back will tell you what fraction of the
          NVIDIA-reported speedup is the model and what fraction is the silicon.
        </p>

        <p>
          The bigger question is whether any US lab outside NVIDIA ships an open frontier model in
          2026 that beats this one. Meta has been quiet on Llama 4 since Q1. OpenAI&apos;s open
          weight release earlier this year did not crack the agent workload. Anthropic does not
          ship open weights and has{' '}
          <Link href="/originals/open-source-llms-closing-gap" className="text-accent-primary hover:underline">
            said as much repeatedly
          </Link>
          . The US open weight ceiling for the rest of this year is now whatever NVIDIA is willing
          to push, which is its own strange outcome: the open frontier in the United States is set
          by the chip vendor. Watch for two things over the next ninety days: a Nemotron 3 Ultra
          mid-cycle update that closes the gap to Kimi, and a Meta or OpenAI response in the same
          size class. The shape of that response tells you whether the open frontier becomes
          contested again or stays a NVIDIA-and-China conversation.
        </p>

        <p>
          We are tracking the inference economics on{' '}
          <Link href="/originals/ai-pricing-floor" className="text-accent-primary hover:underline">
            the pricing floor page
          </Link>{' '}
          and the broader NVIDIA full-stack play on{' '}
          <Link href="/originals/nvidia-rtx-spark-edge-agents" className="text-accent-primary hover:underline">
            the RTX Spark piece from last week
          </Link>
          . Nemotron 3 Ultra is the datacenter half of the same thesis: NVIDIA wants every layer of
          the agent stack, and if the way to own the model layer is to give the model away, that is
          what the company is going to do.
        </p>
      </div>

      {/* Related */}
      <footer className="mt-12 pt-8 border-t border-border">
        <h2 className="text-lg font-semibold text-text-primary mb-4">Related</h2>
        <div className="grid gap-3">
          <Link
            href="/originals/nvidia-rtx-spark-edge-agents"
            className="block bg-bg-secondary border border-border rounded-lg px-4 py-3 hover:border-accent-primary transition-colors"
          >
            <span className="text-text-primary text-sm">NVIDIA&apos;s RTX Spark Runs a 120B Model on a Laptop. The Real Move Is Owning Every Layer.</span>
          </Link>
          <Link
            href="/originals/anthropic-200b-google-tpu-math"
            className="block bg-bg-secondary border border-border rounded-lg px-4 py-3 hover:border-accent-primary transition-colors"
          >
            <span className="text-text-primary text-sm">Anthropic&apos;s $200B Compute Bill Is Bigger Than Its Revenue. The Google TPU Deal in Numbers.</span>
          </Link>
          <Link
            href="/originals/deepseek-v4-open-source-frontier"
            className="block bg-bg-secondary border border-border rounded-lg px-4 py-3 hover:border-accent-primary transition-colors"
          >
            <span className="text-text-primary text-sm">DeepSeek V4 Is The First Open Source Frontier Model. Closed Labs Should Be Worried.</span>
          </Link>
          <Link
            href="/originals/open-source-llms-closing-gap"
            className="block bg-bg-secondary border border-border rounded-lg px-4 py-3 hover:border-accent-primary transition-colors"
          >
            <span className="text-text-primary text-sm">Open Source LLMs Are Closing the Gap Faster Than Anyone Expected.</span>
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
