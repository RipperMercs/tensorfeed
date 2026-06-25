import { Metadata } from 'next';
import Link from 'next/link';
import { ArrowLeft, Clock, Cpu } from 'lucide-react';
import { ArticleJsonLd } from '@/components/seo/JsonLd';
import ArticleHero from '@/components/originals/ArticleHero';
import ShareBar from '@/components/originals/ShareBar';

export const metadata: Metadata = {
  alternates: {
    canonical:
      'https://tensorfeed.ai/originals/openai-jalapeno-custom-silicon-loop-closed',
  },
  title:
    "OpenAI Taped Out Jalapeño in Nine Months. The Custom-Silicon Loop Just Closed.",
  description:
    "On June 24, 2026, OpenAI and Broadcom unveiled Jalapeño, OpenAI's first custom Intelligence Processor: a reticle-sized ASIC built at TSMC, designed for LLM inference, taped out in nine months, and aimed at a 10-gigawatt multi-generation deployment starting late 2026. OpenAI is claiming roughly 50 percent lower inference cost per token than current Nvidia GPUs. Inside the math, why a nine-month tape-out is a new floor, how OpenAI used its own models to compress the design schedule, and what it means now that every top-three frontier lab and every hyperscaler is running a custom-silicon program.",
  openGraph: {
    title:
      "OpenAI Taped Out Jalapeño in Nine Months. The Custom-Silicon Loop Just Closed.",
    description:
      "OpenAI's first custom chip is reticle-sized, taped out in nine months at TSMC, and aimed at 10 gigawatts of inference starting late 2026. Every frontier lab now owns silicon.",
    type: 'article',
    publishedTime: '2026-06-25T14:00:00Z',
    authors: ['Marcus Chen'],
  },
  twitter: {
    card: 'summary_large_image',
    title: "OpenAI Taped Out Jalapeño in Nine Months.",
    description:
      "First OpenAI custom chip. 840 mm² ASIC at TSMC. 10 GW of inference scale. Every frontier lab now owns silicon.",
  },
};

export default function OpenAIJalapenoCustomSiliconLoopClosedPage() {
  return (
    <article className="max-w-3xl mx-auto px-4 sm:px-6 py-10">
      <ArticleJsonLd
        title="OpenAI Taped Out Jalapeño in Nine Months. The Custom-Silicon Loop Just Closed."
        description="On June 24, 2026, OpenAI and Broadcom unveiled Jalapeño, OpenAI's first Intelligence Processor: a reticle-sized ASIC built at TSMC, taped out in nine months, claiming roughly 50 percent lower inference cost per token than current Nvidia GPUs, and aimed at a 10-gigawatt multi-generation deployment starting late 2026. Inside the math, the nine-month tape-out floor, the role of OpenAI's own models in the design loop, and the custom-silicon pattern that just completed."
        datePublished="2026-06-25"
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

      {/* Hero (graphic mode: OpenAI green to Broadcom red, jalapeño on silicon) */}
      <ArticleHero
        mode="graphic"
        icon={Cpu}
        gradientFrom="#10A37F"
        gradientTo="#C92228"
        eyebrow="Markets &middot; AI Silicon"
      />

      {/* Header */}
      <header className="mb-10">
        <h1 className="text-3xl sm:text-4xl font-bold text-text-primary mb-4 leading-tight">
          OpenAI Taped Out Jalapeño in Nine Months. The Custom-Silicon Loop Just Closed.
        </h1>
        <div className="flex items-center gap-3 text-sm text-text-muted">
          <span className="text-text-secondary font-medium">Marcus Chen</span>
          <span>&middot;</span>
          <time dateTime="2026-06-25">June 25, 2026</time>
          <span>&middot;</span>
          <span className="flex items-center gap-1">
            <Clock className="w-3.5 h-3.5" />
            6 min read
          </span>
        </div>
      </header>

      <ShareBar
        path="/originals/openai-jalapeno-custom-silicon-loop-closed"
        title="OpenAI Taped Out Jalapeño in Nine Months. The Custom-Silicon Loop Just Closed."
      />

      {/* Article body */}
      <div className="prose-custom space-y-6 text-lg text-text-primary leading-relaxed">
        <p className="text-lg text-text-primary leading-relaxed">
          OpenAI and Broadcom went on stage Wednesday and walked the reveal step
          by step. The chip is called Jalapeño. The branding is &quot;Intelligence
          Processor&quot;, not GPU or NPU. It is a custom ASIC, designed by OpenAI,
          built by Broadcom, fabbed at TSMC, packaged with Celestica, and aimed
          at a single workload: LLM inference at production scale. OpenAI is
          claiming roughly 50 percent lower cost per token than current Nvidia
          GPUs in early testing. Initial deployment lands by the end of 2026,
          and the multi-generation program targets 10 gigawatts of capacity
          across OpenAI facilities and partner data centers, with the build-out
          completing by 2029.
        </p>

        <p>
          The number that does the real work here is not 10 gigawatts, and it is
          not 50 percent. It is nine months. That is how long OpenAI and Broadcom
          took to go from initial design to manufacturing tape-out on a
          reticle-sized chip on an advanced node. The companies are calling it
          the fastest ASIC development cycle ever in high-performance
          semiconductors, and the surrounding evidence supports the claim. Nine
          months is what changes the industry math, because it tells you the
          tape-out clock for a lab-led inference chip is now short enough to
          ship inside a single model generation.
        </p>

        <h2 className="text-2xl font-semibold text-text-primary pt-4">The Math</h2>

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
                <td className="px-4 py-3 text-accent-primary font-medium">Tape-out time</td>
                <td className="px-4 py-3 font-mono">9 months</td>
                <td className="px-4 py-3">Initial design to manufacturing tape-out</td>
              </tr>
              <tr>
                <td className="px-4 py-3 text-accent-primary font-medium">Die size</td>
                <td className="px-4 py-3 font-mono">~840 mm²</td>
                <td className="px-4 py-3">25.46 mm by 33 mm, near EUV reticle limit of 858 mm²</td>
              </tr>
              <tr>
                <td className="px-4 py-3 text-accent-primary font-medium">Fab</td>
                <td className="px-4 py-3 font-mono">TSMC</td>
                <td className="px-4 py-3">Broadcom co-design, Celestica on packaging</td>
              </tr>
              <tr>
                <td className="px-4 py-3 text-accent-primary font-medium">Workload</td>
                <td className="px-4 py-3 font-mono">LLM inference</td>
                <td className="px-4 py-3">Purpose-built, not a repurposed training accelerator</td>
              </tr>
              <tr>
                <td className="px-4 py-3 text-accent-primary font-medium">Cost-per-token claim</td>
                <td className="px-4 py-3 font-mono">~50% lower</td>
                <td className="px-4 py-3">Versus current Nvidia GPUs, OpenAI early testing</td>
              </tr>
              <tr>
                <td className="px-4 py-3 text-accent-primary font-medium">First deployment</td>
                <td className="px-4 py-3 font-mono">Late 2026</td>
                <td className="px-4 py-3">OpenAI facilities plus partner data centers</td>
              </tr>
              <tr>
                <td className="px-4 py-3 text-accent-primary font-medium">Total program scale</td>
                <td className="px-4 py-3 font-mono">10 GW</td>
                <td className="px-4 py-3">Multi-generation, completing by 2029</td>
              </tr>
              <tr>
                <td className="px-4 py-3 text-accent-primary font-medium">Partnership announced</td>
                <td className="px-4 py-3 font-mono">Oct 13, 2025</td>
                <td className="px-4 py-3">18 months of joint design preceded the announcement</td>
              </tr>
            </tbody>
          </table>
        </div>

        <p>
          The cost-per-token number is the one to weight carefully. It is a
          vendor claim in pre-production silicon, comparing a single inference
          workload on an LLM-tuned ASIC against a general-purpose GPU. The right
          way to read it is as a directional statement on the per-token economics
          OpenAI now controls, not as a fixed multiple. The die size, the fab,
          and the timeline are harder numbers. Reticle-sized at TSMC, on an
          advanced node, in nine months, with deployment slated for inside the
          calendar year. The chip is real.
        </p>

        <h2 className="text-2xl font-semibold text-text-primary pt-4">The Nine-Month Story</h2>

        <p>
          The detail OpenAI volunteered on stage, and the one most worth
          chewing on, is that the design schedule got compressed because OpenAI
          used its own models inside the design loop. Greg Brockman framed the
          speed-up as &quot;very surprising to us&quot;, and the implication is
          that frontier LLMs are now a productive layer of the ASIC tooling
          stack. Floorplanning, place-and-route exploration, verification test
          generation, RTL synthesis hint passes: all of these are now jobs you
          can hand to a model with enough context, and OpenAI was running them
          on its own internal models against its own chip.
        </p>

        <p>
          This is the second OpenAI deliverable in a week that mentions the
          house models inside the loop. The{' '}
          <Link
            href="/originals/openai-frontier-model-science-loop"
            className="text-accent-primary hover:underline"
          >
            two science results from June 17 and 18
          </Link>{' '}
          were the cleaner story, but Jalapeño is the more expensive one. If a
          frontier model can shave even a quarter off the design schedule for
          a 840 mm² ASIC at TSMC, the next inference chip from any lab that has
          a similar in-house pipeline (Anthropic, Google DeepMind, Meta FAIR,
          and a handful of state labs) starts looking like a nine-month problem
          rather than a two-year one. That is the floor that moved this week,
          and it moves the entire custom-silicon roadmap of every competitor
          who can use the same trick.
        </p>

        <h2 className="text-2xl font-semibold text-text-primary pt-4">The Pattern Is Complete</h2>

        <p>
          Jalapeño is the entry that closes the table. Every top-three frontier
          lab and every top-three US hyperscaler now has a custom inference
          chip in production or in the pipe.
        </p>

        <div className="bg-bg-secondary border border-border rounded-lg overflow-x-auto my-6">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border">
                <th className="text-left px-4 py-3 text-text-primary font-semibold">Lab or cloud</th>
                <th className="text-left px-4 py-3 text-text-primary font-semibold">Silicon</th>
                <th className="text-left px-4 py-3 text-text-primary font-semibold">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              <tr>
                <td className="px-4 py-3 text-accent-primary font-medium">Google</td>
                <td className="px-4 py-3 font-mono">TPU v7</td>
                <td className="px-4 py-3">In production, $200B Anthropic offtake through 2031</td>
              </tr>
              <tr>
                <td className="px-4 py-3 text-accent-primary font-medium">Amazon</td>
                <td className="px-4 py-3 font-mono">Trainium 2 and 3</td>
                <td className="px-4 py-3">Project Rainier with Anthropic at multi-GW scale</td>
              </tr>
              <tr>
                <td className="px-4 py-3 text-accent-primary font-medium">Microsoft</td>
                <td className="px-4 py-3 font-mono">Maia 2</td>
                <td className="px-4 py-3">Inference focus, Anthropic on-ramp now public</td>
              </tr>
              <tr>
                <td className="px-4 py-3 text-accent-primary font-medium">Meta</td>
                <td className="px-4 py-3 font-mono">MTIA</td>
                <td className="px-4 py-3">In production for ads and ranking inference</td>
              </tr>
              <tr>
                <td className="px-4 py-3 text-accent-primary font-medium">OpenAI</td>
                <td className="px-4 py-3 font-mono">Jalapeño</td>
                <td className="px-4 py-3">First deployment late 2026, 10 GW program</td>
              </tr>
              <tr>
                <td className="px-4 py-3 text-accent-primary font-medium">Anthropic</td>
                <td className="px-4 py-3 font-mono">TPU plus Trainium plus Maia</td>
                <td className="px-4 py-3">Three-silicon buyer, no in-house ASIC of its own</td>
              </tr>
            </tbody>
          </table>
        </div>

        <p>
          Anthropic is the interesting line. It is the only top-three lab without
          its own ASIC, and the only one with named offtake at scale on three
          different custom platforms (TPU via the{' '}
          <Link
            href="/originals/anthropic-200b-google-tpu-math"
            className="text-accent-primary hover:underline"
          >
            $200B Google commitment
          </Link>
          , Trainium via Project Rainier on AWS, and Maia via{' '}
          <Link
            href="/originals/anthropic-maia-200-fourth-chip-inference"
            className="text-accent-primary hover:underline"
          >
            the Azure inference ramp
          </Link>
          ). The Anthropic posture is buyer of last resort on custom silicon, on
          purpose: the company has been explicit that it does not want to spend
          founder-cycle bandwidth on a fab program, and it would rather sit at
          the procurement table on three platforms than commit to one. OpenAI
          just made the opposite call, in public, with a chip on the floor.
        </p>

        <h2 className="text-2xl font-semibold text-text-primary pt-4">What Nvidia Loses</h2>

        <p>
          Less than the headlines will say, but in a specific place that
          matters. Nvidia keeps training. Nvidia keeps the long tail of buyers
          who cannot afford an ASIC program. Nvidia keeps the second-half
          Vera Rubin deployment with OpenAI itself, because the 10 GW Broadcom
          program does not replace the existing Nvidia commitment, it sits next
          to it. What Nvidia loses is the part of the inference workload at the
          frontier-lab top of the curve where the per-token economics are
          tightest and the cost-per-token claim of a 50 percent gap actually
          compounds across billions of queries a day.
        </p>

        <p>
          The cleaner way to say it: Nvidia&apos;s pricing power on inference
          GPUs at the top of the buyer list is now bounded by the
          cost-per-token of whatever custom silicon the buyer can stand up. For
          OpenAI, that bound is Jalapeño starting late 2026. For Anthropic, it
          is TPU v7 starting in 2027. For Meta, it is MTIA today. The
          GB300-and-up shelf still sells, because frontier training and the
          long tail of buyers without an ASIC program still need it, but the
          inference shelf has a ceiling on it that did not exist eighteen
          months ago.
        </p>

        <p>
          One more wrinkle: Broadcom now sits on both sides of the most
          expensive silicon contract in the industry. The Anthropic{' '}
          <Link
            href="/originals/anthropic-200b-google-tpu-math"
            className="text-accent-primary hover:underline"
          >
            $200B TPU commitment
          </Link>{' '}
          is Google plus Broadcom on the silicon. Jalapeño is OpenAI plus
          Broadcom on the silicon. The arms dealer of the custom-silicon era is
          not the lab and not the cloud. It is the partner that knows how to
          tape out a reticle-sized inference ASIC in nine months on advanced
          node. Broadcom equity reflected this on Wednesday, and the
          repricing has further to go.
        </p>

        <h2 className="text-2xl font-semibold text-text-primary pt-4">The 10-Gigawatt Floor</h2>

        <p>
          The capacity in this program does not show up in 2026 at scale. The
          first racks deploy late this year, and the full 10 gigawatts arrives
          in stages through 2029. That is the same physical constraint that
          governs the{' '}
          <Link
            href="/originals/anthropic-200b-google-tpu-math"
            className="text-accent-primary hover:underline"
          >
            Anthropic TPU build-out
          </Link>{' '}
          and the Vera Rubin deployments: gigawatt-scale data centers need
          power purchase agreements, fiber, substations, and TSMC fab
          allocations that none of the labs can compress past 18 to 24 months.
          Every frontier lab is now pre-paid through 2029 for compute that
          physically does not yet exist, and Jalapeño just added another wedge
          to that aggregate.
        </p>

        <p>
          What that does to the inference price floor is the part builders
          should be reading for. Our{' '}
          <Link
            href="/originals/ai-inference-floor-may-2026"
            className="text-accent-primary hover:underline"
          >
            inference floor analysis in May
          </Link>{' '}
          tracked per-token prices coming down faster than capacity could
          explain, on the back of TPU and Trainium absorbing OpenAI-equivalent
          workloads at lower marginal cost. Jalapeño is the next term in that
          series. By late 2027, the marginal cost of an inference call against
          a frontier OpenAI model is set by an OpenAI-designed ASIC, not a
          Nvidia GPU margin. The price floor falls further, on schedule.
        </p>

        <h2 className="text-2xl font-semibold text-text-primary pt-4">Our Take</h2>

        <p>
          Two signposts in the next ninety days. First, whether OpenAI publishes
          a real benchmark against the GB300 reference platform on a named
          inference workload (long-context Claude-style chat, agentic
          tool-calling, multimodal serving). The 50 percent number needs an
          apples-to-apples comparison before any buyer outside OpenAI sizes
          their next contract around it. Second, whether Anthropic responds by
          announcing the in-house chip program everyone in the procurement
          community has been waiting for, or by doubling down on the
          three-silicon buyer posture. The {`Jumper-to-Anthropic hire`} (June 19) and
          the wet-lab program suggest the second answer, but the equity
          conversation will press on the first.
        </p>

        <p>
          The cleanest read on this week. Jalapeño is not a Nvidia killer and
          it is not a hyperscaler killer. It is the closing entry on a custom-
          silicon table the industry has been filling out one cell at a time
          since 2022, and it sets a new tape-out floor that every other lab is
          now going to be measured against. Nine months from design to TSMC
          tape-out, with the labs running their own models inside the design
          loop, is a different competitive regime from the one that produced
          MTIA v1, TPU v3, or Maia 1. We are tracking the deal cadence on{' '}
          <Link
            href="/providers/openai"
            className="text-accent-primary hover:underline"
          >
            the OpenAI provider page
          </Link>{' '}
          and the silicon side on{' '}
          <Link
            href="/providers/broadcom"
            className="text-accent-primary hover:underline"
          >
            the Broadcom page
          </Link>
          . Next data point to watch: the first independent Jalapeño bench in
          a customer hand, and the first OpenAI API price cut that quietly
          credits the new silicon for the headroom.
        </p>
      </div>

      {/* Related */}
      <footer className="mt-12 pt-8 border-t border-border">
        <h2 className="text-lg font-semibold text-text-primary mb-4">Related</h2>
        <div className="grid gap-3">
          <Link
            href="/originals/anthropic-200b-google-tpu-math"
            className="block bg-bg-secondary border border-border rounded-lg px-4 py-3 hover:border-accent-primary transition-colors"
          >
            <span className="text-text-primary text-sm">Anthropic&apos;s $200B Compute Bill Is Bigger Than Its Revenue. The Google TPU Deal in Numbers.</span>
          </Link>
          <Link
            href="/originals/anthropic-maia-200-fourth-chip-inference"
            className="block bg-bg-secondary border border-border rounded-lg px-4 py-3 hover:border-accent-primary transition-colors"
          >
            <span className="text-text-primary text-sm">Anthropic Just Added Maia 200 As Its Fourth Inference Chip. The Multi-Silicon Era Is Permanent.</span>
          </Link>
          <Link
            href="/originals/ai-inference-floor-may-2026"
            className="block bg-bg-secondary border border-border rounded-lg px-4 py-3 hover:border-accent-primary transition-colors"
          >
            <span className="text-text-primary text-sm">The Inference Floor Keeps Falling. The May 2026 Cut Tells You Why.</span>
          </Link>
          <Link
            href="/originals/openai-frontier-model-science-loop"
            className="block bg-bg-secondary border border-border rounded-lg px-4 py-3 hover:border-accent-primary transition-colors"
          >
            <span className="text-text-primary text-sm">OpenAI Shipped Two Real Science Results in 24 Hours. The Frontier Model Climbed Into the Research Loop.</span>
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
