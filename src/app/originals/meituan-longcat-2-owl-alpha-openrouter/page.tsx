import { Metadata } from 'next';
import Link from 'next/link';
import { ArrowLeft, Clock, Cat } from 'lucide-react';
import { ArticleJsonLd } from '@/components/seo/JsonLd';
import ArticleHero from '@/components/originals/ArticleHero';

import ShareBar from '@/components/originals/ShareBar';
export const metadata: Metadata = {
  alternates: { canonical: 'https://tensorfeed.ai/originals/meituan-longcat-2-owl-alpha-openrouter' },
  title: 'Owl Alpha Was Meituan All Along. LongCat-2.0 Open-Sourced Today at 1.6T, Zero Nvidia, and It Has Been Number One on OpenRouter For Two Months.',
  description:
    'Meituan open-sourced LongCat-2.0 on June 30, 2026 under MIT: a 1.6 trillion-parameter MoE with about 48B active per token, a 1M context window, SWE-bench Pro 59.5 (above GPT-5.5), and Terminal-Bench 70.8. The same weights have been running on OpenRouter as the anonymous Owl Alpha at 10.1 trillion monthly tokens, 559 billion a day, and +242 percent month over month. Trained on 50,000 plus domestic Chinese ASICs using Huawei Atlas-950 superpods and the HCCL collective library, with zero Nvidia in the loop. A food delivery company just shipped the most-used model on the open developer router, on hardware US export controls cannot reach, at the same moment Anthropic still has Fable 5 dark and Google missed Gemini 3.5 Pro by a month.',
  openGraph: {
    title: 'Owl Alpha Was Meituan All Along. LongCat-2.0 Open-Sourced Today at 1.6T, Zero Nvidia, and It Has Been Number One on OpenRouter For Two Months.',
    description: 'Meituan open-sourced LongCat-2.0 on June 30, 2026 under MIT, the model that has been the stealth Owl Alpha at 10.1 trillion monthly tokens on OpenRouter. Trained on 50,000 plus Huawei Atlas-950 chips with zero Nvidia in the loop.',
    type: 'article',
    publishedTime: '2026-06-30T10:00:00Z',
    authors: ['Adrian Vale'],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Owl Alpha Was Meituan. LongCat-2.0 Just Open-Sourced at 1.6T, Trained on Zero Nvidia.',
    description: 'Number one on OpenRouter for two months as a stealth drop. MIT licensed today. SWE-bench Pro 59.5 over GPT-5.5. The export letter does not reach it.',
  },
};

export default function MeituanLongCat2OwlAlphaPage() {
  return (
    <article className="max-w-3xl mx-auto px-4 sm:px-6 py-10">
      <ArticleJsonLd
        title="Owl Alpha Was Meituan All Along. LongCat-2.0 Open-Sourced Today at 1.6T, Zero Nvidia, and It Has Been Number One on OpenRouter For Two Months."
        description="Meituan open-sourced LongCat-2.0 on June 30, 2026 under MIT: a 1.6T MoE with ~48B active, 1M context, SWE-bench Pro 59.5, Terminal-Bench 70.8. The same weights have been OpenRouter's stealth Owl Alpha at 10.1T monthly tokens. Trained on 50,000+ Huawei Atlas-950 superpods with zero Nvidia in the loop."
        datePublished="2026-06-30"
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
      {/* Hero (graphic mode: Meituan yellow to open-weights red) */}
      <ArticleHero
        mode="graphic"
        icon={Cat}
        gradientFrom="#FFD100"
        gradientTo="#DE2910"
        eyebrow="Open Frontier &middot; Model Release"
      />

      <header className="mb-10">
        <h1 className="text-3xl sm:text-4xl font-bold text-text-primary mb-4 leading-tight">
          Owl Alpha Was Meituan All Along. LongCat-2.0 Open-Sourced Today at 1.6T, Zero Nvidia, and It Has Been Number One on OpenRouter For Two Months.
        </h1>
        <div className="flex items-center gap-3 text-sm text-text-muted">
          <span className="text-text-secondary font-medium">Adrian Vale</span>
          <span>&middot;</span>
          <time dateTime="2026-06-30">June 30, 2026</time>
          <span>&middot;</span>
          <span className="flex items-center gap-1">
            <Clock className="w-3.5 h-3.5" />
            7 min read
          </span>
        </div>
      </header>

      <ShareBar
        path="/originals/meituan-longcat-2-owl-alpha-openrouter"
        title="Owl Alpha Was Meituan All Along. LongCat-2.0 Open-Sourced Today at 1.6T, Zero Nvidia, and It Has Been Number One on OpenRouter For Two Months."
      />

      {/* Article body */}
      <div className="prose-custom space-y-6 text-lg text-text-primary leading-relaxed">
        <p>
          On June 30, 2026, Meituan open-sourced LongCat-2.0 on GitHub and Hugging Face under MIT. A 1.6 trillion-parameter Mixture-of-Experts with about 48 billion active per token, a 1 million-token context window, native tool calling, and a posted SWE-bench Pro of 59.5, which is a point higher than the GPT-5.5 number OpenAI shipped at $5 input. The same release confirmed what builders had been arguing about for two months: Owl Alpha, the anonymous stealth model that had climbed to roughly 10.1 trillion monthly tokens on OpenRouter (about 559 billion a day, +242 percent month over month, number one on Hermes Agent, number two inside Claude Code, number three on OpenClaw) is LongCat-2.0-Preview.
        </p>

        <p>
          The technical envelope is the obvious headline. The part that matters more is that a Chinese food delivery company has been running the most-used model on the open developer router, the model was trained without a single Nvidia GPU in the loop, and the weights are now downloadable under the most permissive license in the catalog. The same week Google admitted Gemini 3.5 Pro is slipping to July and Anthropic still has Fable 5 dark under a US export directive, the model devs actually pick when nobody is looking is open, Chinese, and unreachable to the export letter.
        </p>

        <p>
          I have been writing about the open-frontier shift for most of June. This is the one that ends the debate.
        </p>

        <h2 className="text-2xl font-semibold text-text-primary pt-4">What Actually Shipped Today</h2>

        <p>
          LongCat-2.0 is a 1.6T total parameter sparse MoE with roughly 48B active per forward pass, a 1M context window, and a Max-effort reasoning mode toggle borrowed from the same playbook Z.ai used for GLM-5.2 in mid-June. The license is MIT, the weights live at meituan-longcat/LongCat-2.0 on Hugging Face, and the chat surface is at longcatai.org.
        </p>

        <p>
          The vendor-reported benchmarks lean hard into agentic coding, which is exactly where production token volume on OpenRouter is concentrated now. SWE-bench Pro at 59.5 and Terminal-Bench at 70.8 put it on the upper shelf next to GPT-5.5 and Opus 4.8, with the caveat that everyone&apos;s benchmark suite needs independent reproduction before it earns full credit. The harness rankings are the more interesting number, because they are not self-reported.
        </p>

        <div className="bg-bg-secondary border border-border rounded-lg overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border">
                <th className="text-left px-4 py-3 text-text-primary font-semibold">Spec</th>
                <th className="text-left px-4 py-3 text-text-primary font-semibold">LongCat-2.0</th>
                <th className="text-left px-4 py-3 text-text-primary font-semibold">GLM-5.2 (Z.ai)</th>
                <th className="text-left px-4 py-3 text-text-primary font-semibold">DeepSeek V4 Pro</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              <tr>
                <td className="px-4 py-3 text-text-primary font-medium">Total params</td>
                <td className="px-4 py-3 text-accent-primary font-semibold">1.6T</td>
                <td className="px-4 py-3">744B</td>
                <td className="px-4 py-3">671B</td>
              </tr>
              <tr>
                <td className="px-4 py-3 text-text-primary font-medium">Active per token</td>
                <td className="px-4 py-3">~48B</td>
                <td className="px-4 py-3">~32B</td>
                <td className="px-4 py-3">~37B</td>
              </tr>
              <tr>
                <td className="px-4 py-3 text-text-primary font-medium">Context window</td>
                <td className="px-4 py-3">1M</td>
                <td className="px-4 py-3">1M</td>
                <td className="px-4 py-3">128K</td>
              </tr>
              <tr>
                <td className="px-4 py-3 text-text-primary font-medium">License</td>
                <td className="px-4 py-3 text-accent-primary font-semibold">MIT</td>
                <td className="px-4 py-3">MIT</td>
                <td className="px-4 py-3">MIT</td>
              </tr>
              <tr>
                <td className="px-4 py-3 text-text-primary font-medium">Training silicon</td>
                <td className="px-4 py-3 text-accent-primary font-semibold">Huawei Atlas-950</td>
                <td className="px-4 py-3">Huawei Ascend 910B</td>
                <td className="px-4 py-3">Nvidia H800</td>
              </tr>
              <tr>
                <td className="px-4 py-3 text-text-primary font-medium">SWE-bench Pro</td>
                <td className="px-4 py-3 text-accent-primary font-semibold">59.5</td>
                <td className="px-4 py-3">not posted</td>
                <td className="px-4 py-3">54.1</td>
              </tr>
              <tr>
                <td className="px-4 py-3 text-text-primary font-medium">Terminal-Bench</td>
                <td className="px-4 py-3 text-accent-primary font-semibold">70.8</td>
                <td className="px-4 py-3">not posted</td>
                <td className="px-4 py-3">64.2</td>
              </tr>
            </tbody>
          </table>
        </div>

        <p>
          Two structural notes on that table. First, all three Chinese open-weight frontiers from June are MIT licensed. The Chinese-lab open-weight catalog is no longer pretending to be permissive, it is now mechanically permissive in the way builders need: redistributable, no field-of-use carve-out, no acceptable-use policy gate at inference time. Second, LongCat-2.0 is the first frontier-scale model whose training silicon row says Huawei Atlas-950 instead of Huawei Ascend or anything Nvidia. The Atlas-950 superpods are reportedly architected around Huawei&apos;s ASIC stack and HCCL collective library, which means the chip-to-chip interconnect under this training run is entirely outside the Nvidia, AMD, and InfiniBand stack the US export regime has spent four years trying to constrain.
        </p>

        <h2 className="text-2xl font-semibold text-text-primary pt-4">The Two-Month Stealth On OpenRouter</h2>

        <p>
          Owl Alpha showed up on OpenRouter in late April. It was free, fast, large context, surprisingly good at coding, and labeled as a preview from an anonymous lab. Builders moved traffic to it inside the first two weeks because it was free and the agentic coding output was inside a hair of GPT-5.5 and Opus 4.8 at zero per-token cost. By mid-June, the leaderboard scoreboard inside OpenRouter looked like this: Owl Alpha number one on Hermes Agent (the multi-tool agent harness that handles a large share of the platform&apos;s coding token volume), number two on Claude Code, and number three on OpenClaw.
        </p>

        <p>
          The volume numbers are what make this a structural story rather than a curiosity. Owl Alpha processed about 10.1 trillion tokens in the last 30 days, averaging 559 billion tokens a day, with +242 percent month over month growth. That puts a single anonymous model from a previously unknown stealth lab in the same per-day token volume bracket as the entire DeepSeek V4 family. It also means a large block of the OpenRouter token volume that is showing up in the June OpenRouter usage charts as Chinese-share-of-traffic was, structurally, this exact model. The 60 percent Chinese share on OpenRouter that everyone talked about in February and March was open-weight catalog dominance; the June version is one model from one lab pulling double-digit percentages of platform volume on its own.
        </p>

        <p>
          You can track the live OpenRouter volume cohort on TF&apos;s {' '}
          <Link href="/api/usage-rankings" className="text-accent-primary hover:underline">usage rankings endpoint</Link>{' '}
          (real production token share, 7-day rolling, weighted by share rather than benchmark). The model-level coding benchmark rollup is on the {' '}
          <Link href="/leaderboard" className="text-accent-primary hover:underline">leaderboard</Link>.
        </p>

        <h2 className="text-2xl font-semibold text-text-primary pt-4">A Food Delivery Company Trained This. Read That Sentence Again.</h2>

        <p>
          Meituan is, in the US frame, DoorDash. Or DoorDash plus Instacart plus a piece of Uber. It runs the largest food delivery and local-services platform in China, with a stack of side businesses spanning ride-hailing, hotel bookings, retail, and on-demand groceries. It is not a frontier AI lab in anyone&apos;s 2024 ranking. It is the company that books your bao buns.
        </p>

        <p>
          The training cluster underneath LongCat-2.0 is reportedly 50,000 to 60,000 domestic Chinese AI ASICs organized into Huawei Atlas-950 superpods with the HCCL collective communications library doing the chip-to-chip orchestration. That is somewhere between a quarter and a third of the scale Anthropic and OpenAI use for their frontier training runs, and it is built from a fleet of supply-controlled Chinese chips that the US export regime has been blocking, throttling, and naming on the entity list for two and a half years. The runtime was completed inside a calendar year.
        </p>

        <p>
          The structural read is that the floor on who can ship a frontier model has fallen far enough that a Chinese consumer internet platform with a logistics-grade compute budget can produce a 1.6T MoE that wins production token share on the open developer router. Once your bao-bun company can ship the most-used model on OpenRouter, the frontier is not a club of four labs anymore. It is a manufacturing-and-procurement question, and Meituan just answered it on hardware the US government cannot recall.
        </p>

        <h2 className="text-2xl font-semibold text-text-primary pt-4">Why The Export Letter Does Not Reach This One</h2>

        <p>
          Two weeks ago Kira covered the Fable 5 and Mythos 5 suspension after the US Commerce directive blacked them out worldwide. The day after that order, Z.ai shipped GLM-5.2 to every paid tier on the GLM coding plan, with MIT weights queued for the following week, on a training pipeline that used 100,000 Huawei Ascend 910B chips and zero Nvidia. The contrast we wrote up then was structural: the US can disable a model the lab still controls, and it has no mechanism to recall one it does not. LongCat-2.0 is the second instance of that pattern in three weeks, at three times the parameter count, with two months of production token data already proving the open weights are competitive.
        </p>

        <p>
          The export-control story now has a clear shape. The chip lever (Nvidia H100, H200, B200) hits the lab that builds on the constrained silicon. The model lever (the Fable 5 directive) hits the lab that answers a US phone call. Neither reaches a Chinese frontier lab training on Chinese ASICs with MIT weights on a public mirror. The weights LongCat-2.0 published on Hugging Face today are a permanent fact of the deployed model layer. Any builder who downloads them owns the inference path. There is no killswitch.
        </p>

        <p>
          For builders shipping into compliance-sensitive markets (EU AI Act in August, the California SB 53 cohort, the GPT-5.6 federal staggered preview that Marcus covered on June 26), the procurement implication is that a self-hostable, MIT-licensed, frontier-scoring agentic coder is now part of the routing table. The {' '}
          <Link href="/api/open-weights" className="text-accent-primary hover:underline">open-weights deployment endpoint</Link>{' '}
          gets a new top-shelf entry today, and the inference-provider cohort on the {' '}
          <Link href="/api/inference-providers" className="text-accent-primary hover:underline">inference providers matrix</Link>{' '}
          is about to compete to host it cheapest.
        </p>

        <h2 className="text-2xl font-semibold text-text-primary pt-4">What This Does To The June IPO Math</h2>

        <p>
          Two-thirds of the June TF originals queue covered the IPO window: Anthropic&apos;s June 1 confidential S-1 at $965B, OpenAI steering toward a 2027 listing, SpaceX pricing at $1.77T on June 11. The single figure underneath the prospectus for both Anthropic and OpenAI is inference gross margin, which is where token billing meets a token-volume share that started slipping toward open-weight catalog providers in February and never came back.
        </p>

        <p>
          LongCat-2.0 makes that slope steeper. The OpenRouter token volume that has been quietly migrating away from US frontier APIs is now provably going to a model that is open weight, MIT, and self-hostable. The previous read was that the open-weight catalog was dragging down the per-token price floor that Anthropic and OpenAI could charge for parity work. The new read is that the open-weight catalog includes a 1.6T MoE that beats GPT-5.5 on a code benchmark and was already running production token volumes at a meaningful fraction of the closed-API leaders. The price floor is not just below the closed API anymore. The capability floor is too.
        </p>

        <p>
          Marcus made the point on June 27 that the tokenmaxxing era ended when Uber capped Claude Code at $1,500 per employee per month and Lindy moved 100 percent of its production traffic to DeepSeek. LongCat-2.0 is the next leg of that move. Lindy went to DeepSeek because it was 20 to 30 times cheaper. The next Lindy goes to a self-hosted LongCat deployment because it is free at the weights level, frontier-scoring on the benchmarks it cares about, and not subject to a US government recall risk that a buyer with European data residency cannot live with.
        </p>

        <h2 className="text-2xl font-semibold text-text-primary pt-4">Three Signposts In The Next Ninety Days</h2>

        <p>
          One. Whether the inference provider cohort (Together, Fireworks, DeepInfra, OpenRouter native, Groq) lists LongCat-2.0 at a price point that meaningfully undercuts DeepSeek V4 Pro inside the first thirty days. If LongCat lands at five cents per million blended on a US provider, the price floor on agentic coding tokens just moved another rung lower. The {' '}
          <Link href="/api/inference-providers/cheapest" className="text-accent-primary hover:underline">cheapest inference endpoint</Link>{' '}
          is the place to watch.
        </p>

        <p>
          Two. Whether a US enterprise puts a self-hosted LongCat deployment into production for an internal coding workload and writes a public case study, the way Lindy did with DeepSeek. The Lindy moment for DeepSeek took about four months from V3 to public reference. LongCat already has two months of stealth production-volume traffic. The first public case study compresses the procurement debate elsewhere.
        </p>

        <p>
          Three. Whether the Trump administration responds to LongCat-2.0 with anything besides a press release. The Fable 5 directive worked because Anthropic answered the phone. The GLM-5.2 directive (there has not been one) did not happen because there is no phone to dial. LongCat-2.0 is the second test case for that gap, at a parameter count and a production-share level that the previous one did not have. If the answer is still nothing, the export-control instrument has reached its structural ceiling on the model layer. If the answer is a new mechanism (sanctions on a Chinese consumer platform for shipping open weights, a Hugging Face takedown attempt, a CDN-level block), then the regulatory perimeter has just moved into territory it has never been in before.
        </p>

        <h2 className="text-2xl font-semibold text-text-primary pt-4">My Take</h2>

        <p>
          For two years, the conventional wisdom was that frontier AI was a four-lab club, that Chinese open weights were a step behind, that Huawei silicon was a workaround, and that the US could shape the model layer at will. June broke each of those four assumptions in order. Z.ai shipped 1M context on Ascend. Anthropic got an off-switch. Google missed a flagship by a month and lost five senior researchers in six days. And today, the most-used model on OpenRouter, trained on Huawei ASICs by a food delivery company, became open weight under MIT.
        </p>

        <p>
          The next month of TF originals is going to be the response. Who hosts it, who deploys it, who governs it, and what Washington does about a model the only useful posture toward is to download a copy. I do not know the answer to the last one. I know the question is now structural rather than incidental, and that the IPO models inside the two largest US labs do not have a line item for what happens when the open-weight catalog catches the closed API on the work most enterprise spend is going to.
        </p>

        <p>
          Two months ago a stealth model showed up on OpenRouter and the developer community noticed it was better than expected. Today we know who made it. The story of the back half of 2026 is what builders do with that knowledge.
        </p>
      </div>

      {/* Related */}
      <footer className="mt-12 pt-8 border-t border-border">
        <h2 className="text-lg font-semibold text-text-primary mb-4">Related</h2>
        <div className="grid gap-3">
          <Link
            href="/originals/glm-5-2-open-frontier-export-letter"
            className="block bg-bg-secondary border border-border rounded-lg px-4 py-3 hover:border-accent-primary transition-colors"
          >
            <span className="text-text-primary text-sm">Zhipu Shipped a 1M Open-Weight Frontier on Huawei Silicon. The Export Letter Does Not Reach It.</span>
          </Link>
          <Link
            href="/originals/tokenmaxxing-cliff-ipo-math"
            className="block bg-bg-secondary border border-border rounded-lg px-4 py-3 hover:border-accent-primary transition-colors"
          >
            <span className="text-text-primary text-sm">The Tokenmaxxing Era Just Ended. The Run-Rate Doubling Curve Just Got an Efficiency Asterisk.</span>
          </Link>
          <Link
            href="/originals/deepmind-talent-exodus-gemini-pro-slip"
            className="block bg-bg-secondary border border-border rounded-lg px-4 py-3 hover:border-accent-primary transition-colors"
          >
            <span className="text-text-primary text-sm">John Jumper Walked. The DeepMind Bench Lost Four in Eleven Days, and Gemini 3.5 Pro Slipped Again.</span>
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
