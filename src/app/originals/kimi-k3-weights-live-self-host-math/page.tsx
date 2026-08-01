import { Metadata } from 'next';
import Link from 'next/link';
import { ArrowLeft, Clock, HardDrive } from 'lucide-react';
import { ArticleJsonLd } from '@/components/seo/JsonLd';
import ArticleHero from '@/components/originals/ArticleHero';
import ShareBar from '@/components/originals/ShareBar';

export const metadata: Metadata = {
  alternates: {
    canonical:
      'https://tensorfeed.ai/originals/kimi-k3-weights-live-self-host-math',
  },
  title:
    'The Kimi K3 Weights Went Live at Midnight. The Quantization Is the Story, Not the Parameter Count.',
  description:
    'Moonshot AI published the full Kimi K3 weights at 00:00 UTC on July 27, 2026 under a modified MIT license, roughly 1.4TB in MXFP4. Moonshot confirmed it is the exact same quantization running behind the hosted API, which means self-hosted output is not a degraded copy for the first time in an open frontier release. The technical report shipped with it. Here is the hardware math, the breakeven volume, and the hallucination number that did not make the launch chart.',
  openGraph: {
    title:
      'The Kimi K3 Weights Went Live at Midnight. The Quantization Is the Story, Not the Parameter Count.',
    description:
      'Same MXFP4 weights as the hosted API, a modified MIT license, and about 1.4TB to load. The download is free. The breakeven is roughly 6 billion output tokens a month.',
    type: 'article',
    publishedTime: '2026-07-27T13:00:00Z',
    authors: ['Adrian Vale'],
  },
  twitter: {
    card: 'summary_large_image',
    title:
      'The Kimi K3 Weights Went Live at Midnight. The Quantization Is the Story.',
    description:
      'Moonshot shipped the same MXFP4 weights it serves from its own API. Self-hosted K3 is not a degraded copy. It is just expensive.',
  },
};

export default function KimiK3WeightsLiveSelfHostMathPage() {
  return (
    <article className="max-w-3xl mx-auto px-4 sm:px-6 py-10">
      <ArticleJsonLd
        title="The Kimi K3 Weights Went Live at Midnight. The Quantization Is the Story, Not the Parameter Count."
        description="Moonshot AI published the full Kimi K3 weights at 00:00 UTC on July 27, 2026 under a modified MIT license, roughly 1.4TB in MXFP4, and confirmed it is the same quantization behind the hosted API. Here is the hardware math, the breakeven volume, and the hallucination number that did not make the launch chart."
        datePublished="2026-07-27"
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

      {/* Header */}
      <header className="mb-10">
        <h1 className="text-3xl sm:text-4xl font-bold text-text-primary mb-4 leading-tight">
          The Kimi K3 Weights Went Live at Midnight. The Quantization Is the Story, Not
          the Parameter Count.
        </h1>
        <div className="flex items-center gap-3 text-sm text-text-muted">
          <span className="text-text-secondary font-medium">Adrian Vale</span>
          <span>&middot;</span>
          <time dateTime="2026-07-27">July 27, 2026</time>
          <span>&middot;</span>
          <span className="flex items-center gap-1">
            <Clock className="w-3.5 h-3.5" />7 min read
          </span>
        </div>
      </header>

      <ShareBar
        path="/originals/kimi-k3-weights-live-self-host-math"
        title="The Kimi K3 Weights Went Live at Midnight. The Quantization Is the Story, Not the Parameter Count."
      />

      <ArticleHero
        mode="graphic"
        icon={HardDrive}
        gradientFrom="#312e81"
        gradientTo="#0f172a"
        eyebrow="Open weights"
        caption="Kimi K3 full weights, released 00:00 UTC July 27, 2026. Roughly 1.4TB in MXFP4, modified MIT license."
      />

      {/* Article body */}
      <div className="prose-custom space-y-6 text-lg text-text-primary leading-relaxed">
        <p>
          At 00:00 UTC this morning, Moonshot AI put the full Kimi K3 weights on Hugging
          Face. Eleven days after the model went live behind an API, the largest
          open-weight system anyone has shipped is a download. The repository is
          MXFP4-quantized, the license is a modified MIT, and the technical report landed
          with it rather than three weeks later, which is more than most labs manage.
        </p>

        <p>
          We wrote about K3 on July 20, when it was still a promise with a date attached,
          and I closed that piece by saying the interesting question was not whether the
          weights would drop but who would actually run them. That question is now live,
          and the answer got more interesting overnight because of one detail almost
          nobody led with.
        </p>

        <h2 className="text-2xl font-semibold text-text-primary pt-4">
          The Detail That Actually Matters
        </h2>

        <p>
          In an AMA on r/LocalLLaMA a few hours after the drop, Moonshot co-founders
          confirmed that the MXFP4 weights in the public repository are the exact same
          quantization the company serves from its own hosted API. Not a smaller sibling.
          Not a distilled release build. The same file.
        </p>

        <p>
          I want to be clear about why that is a big deal, because it sounds like a
          footnote. Every open-weight release for the last two years has carried an
          unspoken asymmetry: the lab serves something internally, and you get something
          adjacent. Sometimes it is a different quantization, sometimes a different
          checkpoint, sometimes just a serving stack with tricks that never shipped.
          You could download the model, but you could not reproduce the demo.
        </p>

        <p>
          Moonshot just collapsed that gap. If you stand up K3 on your own hardware with a
          compatible stack, your output quality is not a degraded approximation of the
          hosted product. It is the hosted product. That is the strongest verifiability
          claim any frontier-adjacent lab has made this year, and it comes from the one
          most people were, until last week, accusing of copying somebody else&apos;s
          homework.
        </p>

        <p>
          It also removes the last technical excuse for treating the API as the only real
          way to use K3. What remains is money.
        </p>

        <h2 className="text-2xl font-semibold text-text-primary pt-4">
          What the Report Says About the Architecture
        </h2>

        <p>
          The technical report fills in what the launch post gestured at. K3 runs on Kimi
          Delta Attention, which replaces the scalar decay factor in the gated delta rule
          with a vector, so every dimension of the recurrent state gets its own forgetting
          rate. KDA is not used alone. It is interleaved with full attention in a 3:1
          ratio, three KDA layers for every full-attention layer.
        </p>

        <p>
          That ratio is the whole reason a 1 million token context is affordable on this
          model. Moonshot reports the hybrid cuts KV cache memory by up to roughly 75
          percent and delivers up to about 6x faster decoding at 1M tokens. Alongside it
          sits Attention Residuals for depth-wise information flow, a Stable LatentMoE
          arrangement over 896 experts with about 16 active per token, and a set of
          training stabilizers (Quantile Balancing, per-head Muon, gated MLA) that exist
          because nothing about training a 2.8 trillion parameter sparse model at MXFP4
          precision is stable by default. The claimed net result is roughly 2.5x better
          scaling efficiency than K2.
        </p>

        <p>
          vLLM support for KDA and prefix caching shipped in the same window, which is the
          difference between weights you can download and weights you can serve. Without
          a kernel path for the attention variant, a 1.4TB repository is an archive, not
          a model.
        </p>

        <h2 className="text-2xl font-semibold text-text-primary pt-4">
          Now the Hardware Bill
        </h2>

        <p>
          2.8 trillion parameters at 4 bits is about 1.4 terabytes of weights. That is
          before the KV cache, before activation memory, before any headroom for
          concurrent requests. It does not fit on one GPU. It does not fit on one node of
          most things people own.
        </p>

        <div className="bg-bg-secondary border border-border rounded-lg overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border">
                <th className="text-left px-4 py-3 text-text-primary font-semibold">
                  Configuration
                </th>
                <th className="text-left px-4 py-3 text-text-primary font-semibold">
                  Aggregate VRAM
                </th>
                <th className="text-left px-4 py-3 text-text-primary font-semibold">
                  Loads K3 at MXFP4
                </th>
                <th className="text-left px-4 py-3 text-text-primary font-semibold">
                  Note
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              <tr>
                <td className="px-4 py-3 text-text-primary font-medium">1x RTX 4090</td>
                <td className="px-4 py-3 font-mono">24GB</td>
                <td className="px-4 py-3">No</td>
                <td className="px-4 py-3">About 58x short on weights alone</td>
              </tr>
              <tr>
                <td className="px-4 py-3 text-text-primary font-medium">8x H100 80GB</td>
                <td className="px-4 py-3 font-mono">640GB</td>
                <td className="px-4 py-3">No</td>
                <td className="px-4 py-3">Less than half the weight file</td>
              </tr>
              <tr>
                <td className="px-4 py-3 text-text-primary font-medium">8x B200 180GB</td>
                <td className="px-4 py-3 font-mono">1,440GB</td>
                <td className="px-4 py-3">Barely</td>
                <td className="px-4 py-3">Weights only, effectively no KV cache room</td>
              </tr>
              <tr>
                <td className="px-4 py-3 text-accent-primary font-medium">
                  16x B200 180GB
                </td>
                <td className="px-4 py-3 font-mono text-violet-400 font-semibold">
                  2,880GB
                </td>
                <td className="px-4 py-3 text-violet-400 font-semibold">Yes</td>
                <td className="px-4 py-3">Realistic floor with usable context</td>
              </tr>
              <tr>
                <td className="px-4 py-3 text-text-primary font-medium">
                  64+ accelerator supernode
                </td>
                <td className="px-4 py-3 font-mono">Multi-node</td>
                <td className="px-4 py-3">Yes</td>
                <td className="px-4 py-3">What Moonshot recommends for production</td>
              </tr>
            </tbody>
          </table>
        </div>

        <p>
          Moonshot has not published a minimum viable configuration, which is itself
          informative. Labs publish minimums when the minimum is flattering. The guidance
          it did publish points at 64 or more accelerators for production serving, and
          Linux on NVIDIA silicon is the only path anyone should consider production-ready
          on day one.
        </p>

        <h2 className="text-2xl font-semibold text-text-primary pt-4">
          The Breakeven Nobody Ran
        </h2>

        <p>
          Here is the arithmetic I actually care about, and I have not seen anyone do it
          in public since the weights landed. Assume a 16x B200 deployment, which is the
          honest floor above. At mid-2026 cloud rates a B200 rents somewhere around $6 to
          $11 per GPU-hour depending on term and provider, so call it roughly $100 to $175
          per hour all in. Run it continuously and you are looking at something like
          $72,000 to $126,000 a month for the box, before engineers.
        </p>

        <p>
          Now price the same spend against the API at $15 per million output tokens. Take
          the middle of that range, about $100,000 a month. That buys roughly 6.7 billion
          output tokens from Moonshot directly. Six point seven billion output tokens per
          month, every month, is not a startup workload. It is not most Series B workloads.
        </p>

        <div className="bg-bg-secondary border border-border rounded-lg overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border">
                <th className="text-left px-4 py-3 text-text-primary font-semibold">
                  Path
                </th>
                <th className="text-left px-4 py-3 text-text-primary font-semibold">
                  Monthly cost
                </th>
                <th className="text-left px-4 py-3 text-text-primary font-semibold">
                  What you get
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              <tr>
                <td className="px-4 py-3 text-accent-primary font-medium">
                  Moonshot API
                </td>
                <td className="px-4 py-3 font-mono">Pay per token</td>
                <td className="px-4 py-3">
                  $0.30 cache-hit input, $3.00 cache-miss, $15.00 output per 1M
                </td>
              </tr>
              <tr>
                <td className="px-4 py-3 text-accent-primary font-medium">
                  Self-host, 16x B200
                </td>
                <td className="px-4 py-3 font-mono">~$72K to $126K</td>
                <td className="px-4 py-3">
                  Identical weights, your jurisdiction, your uptime problem
                </td>
              </tr>
              <tr>
                <td className="px-4 py-3 text-text-primary font-medium">
                  Rough breakeven
                </td>
                <td className="px-4 py-3 font-mono text-violet-400 font-semibold">
                  ~6.7B output tokens
                </td>
                <td className="px-4 py-3">
                  Per month, sustained, at the midpoint estimate
                </td>
              </tr>
            </tbody>
          </table>
        </div>

        <p>
          Treat those rental figures as an estimate rather than a quote, because B200
          pricing moves and reserved capacity changes the answer materially. The order of
          magnitude is what matters, and the order of magnitude says self-hosting K3 is a
          decision you make for reasons other than cost. Model your own traffic on our{' '}
          <Link href="/tools/cost-calculator" className="text-accent-primary hover:underline">
            cost calculator
          </Link>{' '}
          before you believe anybody, including me.
        </p>

        <p>
          Which is fine, because the reasons are real. Data residency. Regulated
          workloads. Not sending your customers&apos; prompts to a company whose
          infrastructure sits under Chinese jurisdiction, which was the objection we raised
          last week and which the API cannot answer no matter how good the model is. Those
          are the reasons to run it yourself. Saving money is not one of them, and anyone
          selling you the download as a cost play is selling you something.
        </p>

        <h2 className="text-2xl font-semibold text-text-primary pt-4">
          The Number That Did Not Make the Chart
        </h2>

        <p>
          One thing I will not let pass in the release-day glow. Artificial Analysis found
          in independent testing that K3&apos;s factual accuracy improved substantially
          over K2.6, from about 33 percent to about 46 percent. Good. In the same
          evaluation its hallucination rate went from about 39 percent to about 51 percent.
          That figure does not appear anywhere in Moonshot&apos;s published benchmark
          charts.
        </p>

        <p>
          Two pieces of context before anyone runs with that. First, Artificial Analysis
          computes hallucination rate as incorrect answers divided by all non-correct
          responses, not as a share of all answers, so it measures what the model does when
          it does not know rather than how often it is wrong overall. Second, Claude Fable
          5 posts about 54.9 percent on the same measure. K3 is not an outlier here. It is
          in the pack.
        </p>

        <p>
          The pattern is still worth naming: K3 gets more questions right and, when it is
          uncertain, more often invents an answer instead of declining. For a coding agent
          that mostly gets verified by a compiler, that tradeoff is close to free. For
          anything touching facts a human will act on without checking, it is not. Omitting
          it from the launch chart was a choice, and I would rather a lab publish the
          unflattering row than make me find it in somebody else&apos;s harness.
        </p>

        <h2 className="text-2xl font-semibold text-text-primary pt-4">Our Take</h2>

        <p>
          The parameter count is the headline and the least interesting fact in this
          release. What Moonshot actually did today was publish the artifact it runs in
          production, under a permissive license, with the report that explains it, on the
          date it said it would. Every one of those four is a norm the closed labs have
          spent two years declining to adopt, and three of them cost Moonshot nothing but
          nerve.
        </p>

        <p>
          The gap between open and closed is no longer a capability gap you can point at on
          a chart. It is a capital gap. K3 is downloadable by anyone and runnable by
          roughly the same set of organizations that could already afford to train
          something respectable. A modified MIT license on a 1.4 terabyte file democratizes
          inspection, not access, and those are different goods. Inspection still matters
          enormously, because researchers, red teams, and auditors can now examine the
          exact weights serving production traffic. Nobody could do that with GPT-5.6 Sol
          this morning and nobody can do it tonight.
        </p>

        <p>
          For builders, my advice has not changed from last week. Put a routing layer
          between your product and any single lab, benchmark on cost per task rather than
          sticker price, and keep K3 in the table. We have it on our{' '}
          <Link href="/models" className="text-accent-primary hover:underline">
            models tracker
          </Link>{' '}
          with the pricing and the VRAM figure, and the head-to-head against the closed
          leaders is on{' '}
          <Link href="/benchmarks" className="text-accent-primary hover:underline">
            benchmarks
          </Link>
          .
        </p>

        <p>
          Three things I am watching over the next month. First, whether a Western host
          serves these weights at scale or whether convenience keeps most K3 traffic on
          Moonshot&apos;s own endpoint, which would make the license a symbol rather than a
          shift. Second, whether the fine-tune and further-quantization wave produces
          something that fits on eight GPUs instead of sixteen without falling apart,
          because that is where the actual democratization happens. Third, whether any
          closed lab responds by publishing a served checkpoint, which would be the single
          most credible thing any of them could do and which I do not expect from a
          single one of them.
        </p>

        <p>
          The weights are live. The download is free. The bill is not.
        </p>
      </div>

      {/* Related */}
      <footer className="mt-12 pt-8 border-t border-border">
        <h2 className="text-lg font-semibold text-text-primary mb-4">Related</h2>
        <div className="grid gap-3">
          <Link
            href="/originals/kimi-k3-largest-open-weight-model-frontier-gap"
            className="block bg-bg-secondary border border-border rounded-lg px-4 py-3 hover:border-accent-primary transition-colors"
          >
            <span className="text-text-primary text-sm">
              Kimi K3 Is the Largest Open Model Ever and It Sits Three Points Off the
              Frontier. The Weights Drop This Week.
            </span>
          </Link>
          <Link
            href="/originals/open-weights-coalition-letter-who-didnt-sign"
            className="block bg-bg-secondary border border-border rounded-lg px-4 py-3 hover:border-accent-primary transition-colors"
          >
            <span className="text-text-primary text-sm">
              25 Companies Signed the Open Weights Letter. The Story Is the Three That Did
              Not.
            </span>
          </Link>
          <Link
            href="/originals/glm-5-2-open-weights-not-sovereignty"
            className="block bg-bg-secondary border border-border rounded-lg px-4 py-3 hover:border-accent-primary transition-colors"
          >
            <span className="text-text-primary text-sm">
              GLM-5.2 Now Runs 40% of Developer Tokens on OpenRouter. Open Weights Are Not
              the Same as Sovereignty.
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
