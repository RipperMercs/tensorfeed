import { Metadata } from 'next';
import Link from 'next/link';
import { ArrowLeft, Clock, Cpu } from 'lucide-react';
import { ArticleJsonLd } from '@/components/seo/JsonLd';
import ArticleHero from '@/components/originals/ArticleHero';
import ShareBar from '@/components/originals/ShareBar';

export const metadata: Metadata = {
  alternates: {
    canonical: 'https://tensorfeed.ai/originals/jalapeno-benchmarks-watt-win-token-cost-tie',
  },
  title:
    'Jalapeno Won the Watt and Tied on the Token. Only One of Those Reaches a Price Sheet.',
  description:
    'OpenAI published the first Jalapeno benchmarks at Hot Chips: 1.5x to 1.9x more throughput per kilowatt than Nvidia GB300 at 700W against 1,400W. SemiAnalysis verified runs in the lab and then added the line nobody quoted: against Vera Rubin, total cost of ownership per token comes out roughly even.',
  openGraph: {
    title:
      'Jalapeno Won the Watt and Tied on the Token. Only One of Those Reaches a Price Sheet.',
    description:
      'OpenAI claimed 50 percent lower cost per token in June. The first measured numbers say the efficiency win is real and the cost win is roughly a tie.',
    type: 'article',
    publishedTime: '2026-08-26T14:00:00Z',
    authors: ['Marcus Chen'],
  },
  twitter: {
    card: 'summary_large_image',
    title:
      'Jalapeno Won the Watt and Tied on the Token. Only One of Those Reaches a Price Sheet.',
    description:
      'The first Jalapeno benchmarks are a real efficiency win and a roughly even cost result. Those are different stories.',
  },
};

export default function JalapenoBenchmarksPage() {
  return (
    <article className="max-w-3xl mx-auto px-4 sm:px-6 py-10">
      <ArticleJsonLd
        title="Jalapeno Won the Watt and Tied on the Token. Only One of Those Reaches a Price Sheet."
        description="OpenAI published the first Jalapeno inference benchmarks at Hot Chips 2026. The perf-per-watt lead over Nvidia GB300 is real. The cost-per-token lead over Vera Rubin is roughly a tie."
        datePublished="2026-08-26"
        author="Marcus Chen"
      />

      <Link
        href="/originals"
        className="inline-flex items-center gap-1.5 text-sm text-text-muted hover:text-accent-primary transition-colors mb-8"
      >
        <ArrowLeft className="w-4 h-4" />
        Back to Originals
      </Link>

      <header className="mb-10">
        <h1 className="text-3xl sm:text-4xl font-bold text-text-primary mb-4 leading-tight">
          Jalapeno Won the Watt and Tied on the Token. Only One of Those Reaches a Price Sheet.
        </h1>
        <div className="flex items-center gap-3 text-sm text-text-muted">
          <span className="text-text-secondary font-medium">Marcus Chen</span>
          <span>&middot;</span>
          <time dateTime="2026-08-26">August 26, 2026</time>
          <span>&middot;</span>
          <span className="flex items-center gap-1">
            <Clock className="w-3.5 h-3.5" />7 min read
          </span>
        </div>
      </header>

      <ShareBar
        path="/originals/jalapeno-benchmarks-watt-win-token-cost-tie"
        title="Jalapeno Won the Watt and Tied on the Token. Only One of Those Reaches a Price Sheet."
      />

      <ArticleHero
        mode="graphic"
        icon={Cpu}
        gradientFrom="#0B1120"
        gradientTo="#7C2D12"
        eyebrow="Custom Silicon &middot; Inference Economics"
      />

      <div className="prose-custom space-y-6 text-lg text-text-primary leading-relaxed">
        <p>
          OpenAI walked into Hot Chips on Tuesday, August 25, 2026 with the first published
          benchmarks for Jalapeno, the inference ASIC it built with Broadcom, and the headline is
          exactly as good as the headlines say. Against Nvidia GB200 and GB300 rack systems on
          SemiAnalysis&apos;s public InferenceX suite, Jalapeno delivered 1.5x to 1.9x more
          throughput per kilowatt at peak and 1.7x to 3.6x lower end-to-end latency. Dylan Patel
          summarized it in one line: usually first generation chips are not competitive, and this one
          is beating Blackwell and even Rubin.
        </p>

        <p>
          I have been tracking this program since the tape-out. In June, when Jalapeno was unveiled,
          the number OpenAI put in front of everyone was roughly 50 percent lower cost per token than
          current Nvidia GPUs in early testing. That was the claim. Yesterday was the first time
          anyone put instruments on it.
        </p>

        <p>
          So here is the sentence that matters, and it is not in most of the coverage. SemiAnalysis
          says the fair comparison is not Blackwell but Vera Rubin, because both parts use HBM4.
          Jalapeno still squeezes out more output tokens per megawatt than Vera Rubin. And on total
          cost of ownership per token, the two come out roughly even.
        </p>

        <p>
          Roughly even. Not 50 percent lower. The efficiency claim survived contact with a benchmark.
          The cost claim, measured against the platform that will actually be in the racks next to
          it, did not.
        </p>

        <h2 className="text-2xl font-semibold text-text-primary pt-4">What Was Actually Measured</h2>

        <p>
          Three open models: GPT-OSS 120B, DeepSeek R1 670B, and Moonshot&apos;s trillion-parameter
          Kimi K2.5. OpenAI supplied the numbers and SemiAnalysis verified some runs on-site in
          OpenAI&apos;s lab, which is better disclosure hygiene than most vendor benchmarks get and
          worth saying plainly. On GPT-OSS, Jalapeno hit roughly 1,400 tokens per second per user. On
          DeepSeek R1, it cleared 700 tokens per second on a single concurrent request.
        </p>

        <div className="bg-bg-secondary border border-border rounded-lg overflow-x-auto">
          <table className="w-full text-sm font-mono">
            <thead>
              <tr className="border-b border-border">
                <th className="text-left px-4 py-3 text-text-primary font-semibold">Spec</th>
                <th className="text-left px-4 py-3 text-text-primary font-semibold">Jalapeno</th>
                <th className="text-left px-4 py-3 text-text-primary font-semibold">Nvidia GB300</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              <tr>
                <td className="px-4 py-3 text-accent-primary font-medium">Rated package power</td>
                <td className="px-4 py-3">700W</td>
                <td className="px-4 py-3">1,400W</td>
              </tr>
              <tr>
                <td className="px-4 py-3 text-accent-primary font-medium">Measured sustained</td>
                <td className="px-4 py-3">at or below 550W</td>
                <td className="px-4 py-3">not disclosed</td>
              </tr>
              <tr>
                <td className="px-4 py-3 text-accent-primary font-medium">All-in utility power</td>
                <td className="px-4 py-3">1.18 kW</td>
                <td className="px-4 py-3">2.55 kW</td>
              </tr>
              <tr>
                <td className="px-4 py-3 text-accent-primary font-medium">Memory</td>
                <td className="px-4 py-3">216 GiB HBM4</td>
                <td className="px-4 py-3">288 GB HBM3E</td>
              </tr>
              <tr>
                <td className="px-4 py-3 text-accent-primary font-medium">Bandwidth</td>
                <td className="px-4 py-3">15.4 TB/s</td>
                <td className="px-4 py-3">not compared</td>
              </tr>
              <tr>
                <td className="px-4 py-3 text-accent-primary font-medium">Trains models</td>
                <td className="px-4 py-3">no</td>
                <td className="px-4 py-3">yes</td>
              </tr>
              <tr>
                <td className="px-4 py-3 text-accent-primary font-medium">Shipping status</td>
                <td className="px-4 py-3">engineering samples</td>
                <td className="px-4 py-3">in customer racks</td>
              </tr>
            </tbody>
          </table>
        </div>

        <p>
          Per watt of rated power, OpenAI&apos;s part carries roughly 50 percent more memory than the
          GB300. The Hot Chips deck says the bottleneck the architecture targets is exposing
          aggregate HBM bandwidth rather than adding more of it, which is a real design opinion and,
          on this evidence, a correct one.
        </p>

        <h2 className="text-2xl font-semibold text-text-primary pt-4">
          Four Choices That Set the Size of the Win
        </h2>

        <p>
          None of these are cheating. All of them are normalization decisions that a vendor gets to
          make when it publishes its own numbers, and each one moves the gap.
        </p>

        <div className="bg-bg-secondary border border-border rounded-lg overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border">
                <th className="text-left px-4 py-3 text-text-primary font-semibold">Choice</th>
                <th className="text-left px-4 py-3 text-text-primary font-semibold">
                  Effect on the lead
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              <tr>
                <td className="px-4 py-3 text-accent-primary font-medium">
                  Normalize to published package TDP
                </td>
                <td className="px-4 py-3">
                  Headline 1.5x to 1.9x. OpenAI&apos;s own appendix, using all-in utility power per
                  accelerator, produces narrower gaps.
                </td>
              </tr>
              <tr>
                <td className="px-4 py-3 text-accent-primary font-medium">
                  Compare against GB300, not Vera Rubin
                </td>
                <td className="px-4 py-3">
                  Rubin is the HBM4 peer and the platform OpenAI itself agreed to deploy a gigawatt
                  of in the second half of 2026. It was not in the test.
                </td>
              </tr>
              <tr>
                <td className="px-4 py-3 text-accent-primary font-medium">
                  Single-token prediction on both sides
                </td>
                <td className="px-4 py-3">
                  Against a GB300 running multi-token prediction, the peak efficiency lead shrinks to
                  roughly 1.5x. Production Nvidia deployments commonly use MTP.
                </td>
              </tr>
              <tr>
                <td className="px-4 py-3 text-accent-primary font-medium">
                  Pick the operating point
                </td>
                <td className="px-4 py-3">
                  At the GB300&apos;s fastest previous time-between-tokens settings, OpenAI claims
                  8.6x to 104.3x. That is the number in the chart, and it is a latency-corner
                  measurement, not a fleet average.
                </td>
              </tr>
            </tbody>
          </table>
        </div>

        <p>
          Two of those cut the other way, and I want to be fair about it. Jalapeno posted its numbers
          without multi-token prediction and without speculative decoding while some comparison
          systems used them, so there is headroom left on the table. And a first-generation part
          landing anywhere near a mature platform is genuinely unusual.
        </p>

        <h2 className="text-2xl font-semibold text-text-primary pt-4">
          Why the Tie Is the Story
        </h2>

        <p>
          Watts per token and dollars per token are different currencies, and only one of them ends
          up on an API price sheet. If you buy tokens, your bill is a function of total cost of
          ownership: silicon amortization, HBM, packaging, power, cooling, networking, and the
          utilization you actually achieve. Power is one line in that stack. Halving it is worth
          real money and it is not worth half the bill.
        </p>

        <p>
          That is what the SemiAnalysis TCO note is telling you. Against Vera Rubin, the two parts
          land in the same neighborhood on cost per token. Which means that as of yesterday, nothing
          about the published inference price floor moved. No developer&apos;s cost per million
          tokens changed. What changed is who captures the margin between the cost of a token and the
          price of a token, and today that is a conversation between OpenAI and Nvidia, not between
          OpenAI and you.
        </p>

        <p>
          The second-order effect is real, though, and it is the reason CNBC ran this as a margin
          story. Nvidia reports fiscal Q2 after the close today, with guidance around $91 billion
          against a record $75.2 billion data center quarter last time out. A first-generation ASIC
          from a customer that Nvidia is simultaneously financing, to the tune of up to $105 billion
          for the Ohio campus announced on August 17, is not a revenue threat this quarter. It is a
          price-negotiation artifact. OpenAI now has a published benchmark to put on the table.
        </p>

        <p>
          Richard Ho, OpenAI&apos;s VP of hardware, said the quiet part out loud after the financing
          news: Nvidia is a really good partner, and we continue to need a lot of Nvidia. Sarah Friar
          framed Jalapeno as complementing the Nvidia, AMD, AWS, Cerebras, and CoreWeave
          relationships rather than replacing them. Both of those are true and both of them are also
          what you say when the leverage has shifted a few degrees and you would like to keep the
          shipment schedule.
        </p>

        <h2 className="text-2xl font-semibold text-text-primary pt-4">
          The Claim I Think Is Underpriced
        </h2>

        <p>
          Buried under the perf-per-watt chart is the sentence with the longest half-life.
          SemiAnalysis wrote that the CUDA moat is potentially dead given how fast OpenAI can bring
          up new models on its silicon.
        </p>

        <p>
          Consider what the bring-up actually looked like. Design started mid-2024. Final design went
          to fabrication in November 2025. Sixteen months end to end, nine of them from first chip
          design to finished blueprint. OpenAI used its own models in the loop: older generations on
          chip design, newer ones on programming and optimization. Then it ran three foreign models
          it did not train, including a trillion-parameter Kimi checkpoint, on first-silicon hardware
          well enough to publish.
        </p>

        <p>
          The moat was never the instruction set. It was the years of kernel and compiler work that
          made a new accelerator painful to target. If a lab can compress that work using the models
          the accelerator exists to serve, the moat is not gone but it is measurably shallower, and
          the depth is now a function of model capability, which is the one variable in this industry
          that only moves one direction.
        </p>

        <h2 className="text-2xl font-semibold text-text-primary pt-4">Three Counterarguments</h2>

        <p>
          <strong className="text-text-primary">Rubin ships, Jalapeno does not.</strong> Rubin
          systems are in customer hands. Jalapeno reportedly has not moved past engineering samples,
          with first deployment in OpenAI&apos;s own data centers targeted for later this year. A
          benchmark against a shipping platform from a part that is not yet in production is a
          promise with a chart attached.
        </p>

        <p>
          <strong className="text-text-primary">The model list is stale.</strong> Nvidia and AMD have
          already published results on larger models, DeepSeek V4 Pro and Kimi K3 among them, that
          Jalapeno has not been tested against. Inference efficiency is workload-shaped. A part that
          wins on a 120B and a 670B does not automatically win on whatever ships in Q4.
        </p>

        <p>
          <strong className="text-text-primary">HBM is the actual constraint.</strong> This is the
          one I would put money on. Samsung, SK hynix, and Micron have sold HBM capacity through
          2027. Micron told the same conference on August 23 that HBM burns roughly three times the
          wafer area of DDR5 for equivalent capacity, and that the penalty widens each generation. SK
          hynix&apos;s CEO has called 2027 the worst year of the crunch. Scaling Jalapeno across the
          10 gigawatt Broadcom agreement makes OpenAI a large new claimant on HBM4 supply that Nvidia
          currently dominates through multi-year allocation deals. Jalapeno sits in the same TSMC
          3nm-class wafer queue, the same HBM queue, and the same advanced packaging queue as
          Blackwell and Rubin. You cannot design your way out of a line you are standing in.
        </p>

        <h2 className="text-2xl font-semibold text-text-primary pt-4">Our Take</h2>

        <p>
          This is a real engineering result and a smaller economic one than the day&apos;s coverage
          implies, and the gap between those two facts is the entire piece. A first-generation
          inference ASIC beating a mature rack platform on throughput per kilowatt is the kind of
          thing that does not usually happen, and I do not want to talk anyone out of being impressed
          by it. But the June claim was 50 percent lower cost per token, the August measurement is
          roughly even against the right peer, and a claim that gets tested and comes back smaller is
          how you tell a benchmark from a press release.
        </p>

        <p>
          The honest read: OpenAI bought itself a second source and a negotiating position, not a
          price cut. Vertical integration at this layer pays off in supply security and in what you
          can say to your largest vendor, and it pays off years later if generation two and three
          extend the curve. It does not show up in anyone&apos;s cost per million tokens in 2026.
        </p>

        <p>Three things I am watching:</p>

        <p>
          One, whether anyone publishes a Jalapeno versus Vera Rubin run on the same suite with MTP
          enabled on both sides. That is the only comparison that answers the question people think
          was answered yesterday.
        </p>

        <p>
          Two, whether the second-generation part, reportedly approaching tapeout within months,
          arrives with an HBM4 allocation attached. Silicon without memory is a slide.
        </p>

        <p>
          Three, whether any of this reaches a published price. We track the inference floor daily on
          our{' '}
          <Link href="/models" className="text-accent-primary hover:underline">
            models tracker
          </Link>{' '}
          and{' '}
          <Link href="/tools/cost-calculator" className="text-accent-primary hover:underline">
            cost calculator
          </Link>
          . If custom silicon is going to change what a token costs a developer, it has to show up
          there. So far it has not, and a tie on total cost of ownership is a fair explanation of
          why.
        </p>
      </div>

      <footer className="mt-12 pt-8 border-t border-border">
        <h2 className="text-lg font-semibold text-text-primary mb-4">Related</h2>
        <div className="grid gap-3">
          <Link
            href="/originals/openai-jalapeno-custom-silicon-loop-closed"
            className="block bg-bg-secondary border border-border rounded-lg px-4 py-3 hover:border-accent-primary transition-colors"
          >
            <span className="text-text-primary text-sm">
              OpenAI Taped Out Jalapeno in Nine Months. The Custom-Silicon Loop Just Closed.
            </span>
          </Link>
          <Link
            href="/originals/nvidia-105b-openai-ohio-guarantee-shipped"
            className="block bg-bg-secondary border border-border rounded-lg px-4 py-3 hover:border-accent-primary transition-colors"
          >
            <span className="text-text-primary text-sm">
              The $250B Nvidia Guarantee Talks Shipped as $105B. The Shadow Bank Now Has a Signed
              Contract.
            </span>
          </Link>
          <Link
            href="/originals/ai-inference-floor-may-2026"
            className="block bg-bg-secondary border border-border rounded-lg px-4 py-3 hover:border-accent-primary transition-colors"
          >
            <span className="text-text-primary text-sm">
              The Cheapest AI Model on the Market Costs 1.7 Cents per Million Tokens
            </span>
          </Link>
        </div>
      </footer>

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
