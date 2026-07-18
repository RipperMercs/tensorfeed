import { Metadata } from 'next';
import Link from 'next/link';
import { ArrowLeft, Clock, Wrench } from 'lucide-react';
import { ArticleJsonLd } from '@/components/seo/JsonLd';
import ArticleHero from '@/components/originals/ArticleHero';
import ShareBar from '@/components/originals/ShareBar';

export const metadata: Metadata = {
  alternates: {
    canonical: 'https://tensorfeed.ai/originals/thinking-machines-inkling-tinker-bet',
  },
  title:
    "Thinking Machines Shipped Inkling and Admitted It Is Not the Best. Bridgewater Already Beat Every Frontier Model at One Fourteenth the Cost.",
  description:
    "Mira Murati's Thinking Machines released Inkling on Wednesday, July 15, 2026: a 975 billion parameter Mixture-of-Experts model with roughly 41 billion active per token, natively multimodal across text, image, audio and video, trained on 45 trillion tokens, weights on Hugging Face under Apache 2.0, hosted via Tinker at $1.87 input and $4.68 sampling per million tokens on 64K context (with a 50 percent introductory discount). The company's own launch post says Inkling 'is not the strongest overall model available today, open or closed.' That sentence is the whole strategy. Bridgewater Associates took an earlier open model into Tinker, fine-tuned it on the firm's own financial reasoning corpus, and pushed a specialist to 84.7 percent on financial reasoning tests at roughly one fourteenth the inference cost of the top proprietary model. Inside the math, the two open-weight strategies that split in one week (Kimi K3 selling capability, Inkling selling ownership), what the Bridgewater result does to the frontier lab business model, and why an ex-OpenAI CTO built the anti-frontier stack.",
  openGraph: {
    title:
      "Thinking Machines Shipped Inkling and Admitted It Is Not the Best. Bridgewater Already Beat Every Frontier Model at One Fourteenth the Cost.",
    description:
      "Inkling is a 975B open-weight MoE with 41B active, Apache 2.0 on Hugging Face, Tinker at $1.87 input. Thinking Machines is not monetizing the model. The Bridgewater fine-tune is the actual product.",
    type: 'article',
    publishedTime: '2026-07-18T14:00:00Z',
    authors: ['Marcus Chen'],
  },
  twitter: {
    card: 'summary_large_image',
    title:
      "Thinking Machines Shipped Inkling and Admitted It Is Not the Best.",
    description:
      "975B open-weight MoE, Apache 2.0, Tinker at $1.87 input. Bridgewater already fine-tuned an open model to 84.7 percent on financial reasoning at one fourteenth the cost of proprietary frontier.",
  },
};

export default function ThinkingMachinesInklingTinkerBetPage() {
  return (
    <article className="max-w-3xl mx-auto px-4 sm:px-6 py-10">
      <ArticleJsonLd
        title="Thinking Machines Shipped Inkling and Admitted It Is Not the Best. Bridgewater Already Beat Every Frontier Model at One Fourteenth the Cost."
        description="Thinking Machines released Inkling on July 15, 2026: 975 billion total parameters, roughly 41 billion active per token, natively multimodal, trained on 45 trillion tokens, weights on Hugging Face under Apache 2.0, priced at $1.87 input and $4.68 sampling per million tokens on 64K Tinker context. The launch post admits it is not the strongest overall model available. That is the business model. Bridgewater already fine-tuned an open model on the Tinker platform to 84.7 percent on financial reasoning at roughly one fourteenth the inference cost of top proprietary frontier models."
        datePublished="2026-07-18"
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

      {/* Hero (graphic mode: dark violet into warm copper, ex-OpenAI-founder register) */}
      <ArticleHero
        mode="graphic"
        icon={Wrench}
        gradientFrom="#2E1B4E"
        gradientTo="#C26A3A"
        eyebrow="Markets &middot; Open Weights"
      />

      {/* Header */}
      <header className="mb-10">
        <h1 className="text-3xl sm:text-4xl font-bold text-text-primary mb-4 leading-tight">
          Thinking Machines Shipped Inkling and Admitted It Is Not the Best. Bridgewater Already Beat Every Frontier Model at One Fourteenth the Cost.
        </h1>
        <div className="flex items-center gap-3 text-sm text-text-muted">
          <span className="text-text-secondary font-medium">Marcus Chen</span>
          <span>&middot;</span>
          <time dateTime="2026-07-18">July 18, 2026</time>
          <span>&middot;</span>
          <span className="flex items-center gap-1">
            <Clock className="w-3.5 h-3.5" />
            7 min read
          </span>
        </div>
      </header>

      <ShareBar
        path="/originals/thinking-machines-inkling-tinker-bet"
        title="Thinking Machines Shipped Inkling and Admitted It Is Not the Best. Bridgewater Already Beat Every Frontier Model at One Fourteenth the Cost."
      />

      {/* Article body */}
      <div className="prose-custom space-y-6 text-lg text-text-primary leading-relaxed">
        <p className="text-lg text-text-primary leading-relaxed">
          Mira Murati&apos;s Thinking Machines Lab shipped its first foundation model on Wednesday, July 15, 2026. It is called Inkling. It is 975 billion total parameters, roughly 41 billion active per token, natively multimodal across text, image, audio and video, trained on 45 trillion tokens, published on Hugging Face under Apache 2.0, and available for fine-tuning through the company&apos;s own Tinker platform at $1.87 per million input tokens on a 64K context (with a 50 percent introductory discount). The official launch post is one paragraph in when the company writes, on the record, that Inkling &quot;is not the strongest overall model available today, open or closed.&quot;
        </p>

        <p>
          That sentence is not a hedge. It is the entire business strategy.
        </p>

        <h2 className="text-2xl font-semibold text-text-primary pt-4">The Numbers</h2>

        <div className="bg-bg-secondary border border-border rounded-lg overflow-x-auto my-6">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border">
                <th className="text-left px-4 py-3 text-text-primary font-semibold">Item</th>
                <th className="text-left px-4 py-3 text-text-primary font-semibold">Value</th>
                <th className="text-left px-4 py-3 text-text-primary font-semibold">Notes</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              <tr>
                <td className="px-4 py-3 text-accent-primary font-medium">Total parameters</td>
                <td className="px-4 py-3 font-mono">975B</td>
                <td className="px-4 py-3">Mixture-of-Experts, sparse routing</td>
              </tr>
              <tr>
                <td className="px-4 py-3 text-accent-primary font-medium">Active per token</td>
                <td className="px-4 py-3 font-mono">~41B</td>
                <td className="px-4 py-3">Sets per-token inference cost, not total</td>
              </tr>
              <tr>
                <td className="px-4 py-3 text-accent-primary font-medium">Modalities</td>
                <td className="px-4 py-3 font-mono">4</td>
                <td className="px-4 py-3">Text, image, audio, video, natively reasoned</td>
              </tr>
              <tr>
                <td className="px-4 py-3 text-accent-primary font-medium">Training tokens</td>
                <td className="px-4 py-3 font-mono">45T</td>
                <td className="px-4 py-3">Multimodal pretraining corpus</td>
              </tr>
              <tr>
                <td className="px-4 py-3 text-accent-primary font-medium">License</td>
                <td className="px-4 py-3 font-mono">Apache 2.0</td>
                <td className="px-4 py-3">Weights on Hugging Face, BF16 and NVFP4 checkpoints</td>
              </tr>
              <tr>
                <td className="px-4 py-3 text-accent-primary font-medium">Tinker 64K input price</td>
                <td className="px-4 py-3 font-mono">$1.87 / 1M</td>
                <td className="px-4 py-3">Cached prefill $0.374, sampling $4.68, training $5.61</td>
              </tr>
              <tr>
                <td className="px-4 py-3 text-accent-primary font-medium">Tinker 256K input price</td>
                <td className="px-4 py-3 font-mono">$3.74 / 1M</td>
                <td className="px-4 py-3">Cached $0.748, sampling $9.36, training $11.23</td>
              </tr>
              <tr>
                <td className="px-4 py-3 text-accent-primary font-medium">Intro discount</td>
                <td className="px-4 py-3 font-mono">50%</td>
                <td className="px-4 py-3">On the models page at launch, limited time</td>
              </tr>
              <tr>
                <td className="px-4 py-3 text-accent-primary font-medium">Company posture</td>
                <td className="px-4 py-3 font-mono">Not the best</td>
                <td className="px-4 py-3">Official launch post, on the record</td>
              </tr>
            </tbody>
          </table>
        </div>

        <p>
          Vendor-reported benchmarks put Inkling on Terminal Bench 2.1 for agentic coding, HLE for advanced reasoning, and IFBench for instruction following. Thinking Machines reports Inkling spends roughly one third as many tokens as Nemotron 3 Ultra to hit the same Terminal Bench score, which is an efficiency claim, not a capability claim. The company is not competing with Kimi K3, Fable 5, or GPT-5.6 Sol at the top of the intelligence index. It is not trying to.
        </p>

        <h2 className="text-2xl font-semibold text-text-primary pt-4">What Thinking Machines Just Did That No Frontier Lab Would</h2>

        <p>
          Every other lab shipping into this cycle leads with a benchmark that beats the previous frontier. Moonshot shipped Kimi K3 on Thursday and posted a 76 percent pairwise win rate on Frontend Code Arena. OpenAI shipped GPT-5.6 Sol earlier this month with a coding-agent index number one framing. Anthropic shipped Fable 5 and Mythos 5 with the premium ceiling argument. The Inkling launch post opens with a range of capability charts, then explicitly disclaims the frontier claim in the same section.
        </p>

        <p>
          Read the incentives. Thinking Machines closed a $2 billion seed in July 2025 at a $12 billion valuation. Bloomberg reported a $50 billion funding conversation in November of that year that stalled through January. Google inked a multi-billion-dollar compute and product agreement in April 2026. The company&apos;s revenue line comes from Tinker, a fine-tuning platform sold to enterprises that need a specialist. Its published customer is Bridgewater Associates, the largest hedge fund in the world.
        </p>

        <p>
          A company priced above $12 billion by the market, chased at $50 billion, and courted by Google does not need to prove Inkling beats Fable 5 to justify its next round. It needs to prove that the fine-tune of Inkling beats Fable 5 on the exact task an enterprise is willing to write a nine-figure check for. That is a completely different product.
        </p>

        <h2 className="text-2xl font-semibold text-text-primary pt-4">The Bridgewater Proof-Point</h2>

        <p>
          Before Inkling shipped, Thinking Machines and Bridgewater ran a joint project on Tinker: take an existing open model, fine-tune it against the hedge fund&apos;s financial reasoning corpus, and score it against the leading proprietary models on a financial reasoning suite. The specialist model scored 84.7 percent on the benchmark, ahead of every top proprietary AI on the same test, at roughly one fourteenth the inference cost.
        </p>

        <p>
          Two numbers do all the work here. The 84.7 percent number says a fine-tuned open model can cross the frontier on a bounded task the buyer actually cares about. The one fourteenth number says the buyer pays a small fraction of what the frontier costs, forever, on their own hardware if they want, with weights they own. Together they describe a market where the customer&apos;s question is no longer &quot;which frontier lab do I subscribe to.&quot; It becomes &quot;what is the exact benchmark I get graded on, and how fast can I fine-tune to beat it.&quot;
        </p>

        <p>
          That is the framing our{' '}
          <Link href="/originals/chatgpt-work-agent-product-outcome-not-tokens" className="text-accent-primary hover:underline">
            ChatGPT Work outcome-pricing piece
          </Link>{' '}
          picked up two weeks ago from the opposite direction. OpenAI is trying to move the price tag onto the finished job so the buyer stops shopping the model layer. Thinking Machines is trying to move the price tag onto the customization layer so the buyer stops shopping the frontier at all. Both moves flee the token as the unit of value, and both moves land in the same month, which is not a coincidence.
        </p>

        <h2 className="text-2xl font-semibold text-text-primary pt-4">Two Open-Weight Strategies Split in One Week</h2>

        <p>
          Kimi K3 shipped on Thursday, Inkling on the day before. Both are open-weight, both are Mixture-of-Experts, both are frontier-sized on total parameters. The strategies underneath are opposites.
        </p>

        <div className="bg-bg-secondary border border-border rounded-lg overflow-x-auto my-6">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border">
                <th className="text-left px-4 py-3 text-text-primary font-semibold">Dimension</th>
                <th className="text-left px-4 py-3 text-text-primary font-semibold">Kimi K3</th>
                <th className="text-left px-4 py-3 text-text-primary font-semibold">Inkling</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              <tr>
                <td className="px-4 py-3 text-accent-primary font-medium">Total params</td>
                <td className="px-4 py-3 font-mono">2.8T</td>
                <td className="px-4 py-3 font-mono">975B</td>
              </tr>
              <tr>
                <td className="px-4 py-3 text-accent-primary font-medium">Active params</td>
                <td className="px-4 py-3 font-mono">~50B</td>
                <td className="px-4 py-3 font-mono">~41B</td>
              </tr>
              <tr>
                <td className="px-4 py-3 text-accent-primary font-medium">Launch framing</td>
                <td className="px-4 py-3">Frontier ceiling</td>
                <td className="px-4 py-3">Not the best</td>
              </tr>
              <tr>
                <td className="px-4 py-3 text-accent-primary font-medium">Revenue path</td>
                <td className="px-4 py-3">Hosted API and enterprise inference</td>
                <td className="px-4 py-3">Tinker fine-tune platform</td>
              </tr>
              <tr>
                <td className="px-4 py-3 text-accent-primary font-medium">License</td>
                <td className="px-4 py-3">Modified MIT (weights July 27)</td>
                <td className="px-4 py-3">Apache 2.0 on day one</td>
              </tr>
              <tr>
                <td className="px-4 py-3 text-accent-primary font-medium">What buyer pays for</td>
                <td className="px-4 py-3">Capability</td>
                <td className="px-4 py-3">Ownership and specialization</td>
              </tr>
            </tbody>
          </table>
        </div>

        <p>
          Kimi is selling the biggest open number on a leaderboard, hosting the model on its own cloud, and taking the inference margin. Inkling is selling a canvas an enterprise brings its own data to. Kimi&apos;s bet works if buyers keep chasing the frontier. Inkling&apos;s bet works if buyers stop caring about the frontier and start caring about their own benchmark. Both cannot be right in the same market forever, and the answer will show up in Bridgewater-shaped customer stories from other regulated industries over the next two quarters.
        </p>

        <p>
          The sovereignty read we made on{' '}
          <Link href="/originals/glm-5-2-open-weights-not-sovereignty" className="text-accent-primary hover:underline">
            GLM-5.2 last week
          </Link>{' '}
          also applies here in the opposite direction. GLM is open weights hosted under Chinese jurisdiction, which means the weights are portable but the hosted call is not. Inkling is open weights hosted in the United States by an ex-OpenAI leadership team, with an Apache 2.0 license from day one, no export-control overhang, and Google as a strategic partner on distribution. For a bank, a hospital, or a US federal buyer, that is a legally different product from GLM even if the token cost lines look similar on paper.
        </p>

        <h2 className="text-2xl font-semibold text-text-primary pt-4">What This Does to the Frontier Business Model</h2>

        <p>
          Anthropic is on the road with bankers for an IPO that we{' '}
          <Link href="/originals/anthropic-confidential-s1-ipo" className="text-accent-primary hover:underline">
            wrote up in June
          </Link>
          . The pitch is that Claude is the premium tier and enterprises will pay for it because coding, agents, and safety all still route through Anthropic&apos;s stack. That pitch survives a Kimi K3 or an Inkling on a leaderboard, because the buyer of a frontier subscription is not comparing raw benchmarks. It buys the harness, the SLAs, the compliance surface, and the roadmap.
        </p>

        <p>
          What it does not survive as cleanly is a story where the buyer&apos;s CIO looks at a Bridgewater case and asks why the firm is paying twenty times more per token for a model that scores lower than an in-house fine-tune on the one benchmark the desk actually grades on. Not every enterprise workload is bounded enough to specialize. But financial reasoning, medical coding, legal citation, compliance monitoring, and customer support triage all are. Every one of those workloads has an executive with a P and L, a benchmark they answer to, and a vendor contract with a frontier lab that just got a public comp point.
        </p>

        <p>
          The pricing floor argument our{' '}
          <Link href="/originals/ai-pricing-floor" className="text-accent-primary hover:underline">
            price floor piece
          </Link>{' '}
          made in the spring assumed token prices fall because compute keeps getting cheaper. Add specialization to the picture and the fall gets steeper on a category-by-category basis. The frontier lab tier stays expensive at the top, because someone has to train the base capability, but the effective price of the workload underneath falls to whatever Tinker charges to fine-tune plus whatever hosting costs on commodity hardware. That is a very different curve.
        </p>

        <h2 className="text-2xl font-semibold text-text-primary pt-4">Our Take</h2>

        <p>
          Mira Murati was OpenAI&apos;s Chief Technology Officer through the entire frontier-model era. She left, raised $2 billion, built Tinker before shipping a model, and now ships a model whose official positioning is that it is not the best. That is a diagnosis, not a marketing choice. The frontier-model business, as it exists in mid-2026, is a game a small number of labs can afford to play, and the rest of the market pays them to play it. Thinking Machines is betting that the payers eventually stop.
        </p>

        <p>
          The Bridgewater number is what should worry the frontier labs, not the Inkling benchmarks. An 84.7 percent specialist at one fourteenth the cost is not the story of a new frontier model. It is the story of a new pricing structure, and it lands in an S-1 window where Anthropic and OpenAI both need enterprise revenue to justify their multiples. If a second regulated-industry customer runs the same play in the next quarter and posts the same shape of number, the frontier lab enterprise pitch changes from &quot;we are the smartest model&quot; to &quot;we are the best canvas for you to specialize against,&quot; which is Tinker&apos;s pitch already.
        </p>

        <p>
          Three signposts we are watching. One, whether Inkling weights hold up when independent researchers run the Terminal Bench and IFBench claims outside the Tinker platform, especially against Kimi K3 on the same tasks. Two, whether a second published Tinker customer lands in a non-finance vertical (health, legal, defense) with a similar cost delta versus proprietary frontier. Three, whether the frontier labs respond by opening up their own fine-tuning economics, which would mean cutting into the margin they most need before their IPO windows close.
        </p>

        <p>
          The token got cheap. The outcome got repriced. This week the customization layer entered the same conversation, and the ex-OpenAI CTO is the one selling it.
        </p>
      </div>

      {/* Related */}
      <footer className="mt-12 pt-8 border-t border-border">
        <h2 className="text-lg font-semibold text-text-primary mb-4">Related</h2>
        <div className="grid gap-3">
          <Link
            href="/originals/kimi-k3-open-frontier-ceiling-8x"
            className="block bg-bg-secondary border border-border rounded-lg px-4 py-3 hover:border-accent-primary transition-colors"
          >
            <span className="text-text-primary text-sm">Kimi K3 Ships With 2.8 Trillion Open Weights. The Open Frontier Ceiling Just Went Up 8x in Three Days.</span>
          </Link>
          <Link
            href="/originals/glm-5-2-open-weights-not-sovereignty"
            className="block bg-bg-secondary border border-border rounded-lg px-4 py-3 hover:border-accent-primary transition-colors"
          >
            <span className="text-text-primary text-sm">GLM-5.2 Now Runs 40% of Developer Tokens on OpenRouter. Open Weights Are Not the Same as Sovereignty.</span>
          </Link>
          <Link
            href="/originals/chatgpt-work-agent-product-outcome-not-tokens"
            className="block bg-bg-secondary border border-border rounded-lg px-4 py-3 hover:border-accent-primary transition-colors"
          >
            <span className="text-text-primary text-sm">OpenAI Stopped Selling You a Model. On July 9 It Started Selling You the Finished Job.</span>
          </Link>
          <Link
            href="/originals/ai-pricing-floor"
            className="block bg-bg-secondary border border-border rounded-lg px-4 py-3 hover:border-accent-primary transition-colors"
          >
            <span className="text-text-primary text-sm">The AI Inference Pricing Floor Keeps Falling. Here Is Where It Actually Stops.</span>
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
