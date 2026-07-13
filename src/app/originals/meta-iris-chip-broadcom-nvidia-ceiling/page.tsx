import { Metadata } from 'next';
import Link from 'next/link';
import { ArrowLeft, Clock, Cpu } from 'lucide-react';
import { ArticleJsonLd } from '@/components/seo/JsonLd';
import ArticleHero from '@/components/originals/ArticleHero';
import ShareBar from '@/components/originals/ShareBar';

export const metadata: Metadata = {
  alternates: { canonical: 'https://tensorfeed.ai/originals/meta-iris-chip-broadcom-nvidia-ceiling' },
  title: "Meta's Iris Chip Enters Production in September. Broadcom Is Quietly Winning the Custom Silicon Race.",
  description:
    "An internal memo Reuters saw on July 9, 2026 has Meta putting its in-house MTIA Iris chip into production this September, on the way to a doubling of compute capacity from 7 GW to 14 GW by 2027 and up to $145 billion of CapEx this year. Broadcom is the design partner, TSMC is the fab. Broadcom also co-designed TPU v7 for the Anthropic $200B TPU commitment. Inside the math, why a six-week bug test is the number the industry should be reading, and what a fourth hyperscaler ASIC does to Nvidia's growth story.",
  openGraph: {
    title: "Meta's Iris Chip Enters Production in September. Broadcom Is Quietly Winning the Custom Silicon Race.",
    description:
      "Meta pushes the MTIA Iris chip into production in September at up to $145B CapEx. Broadcom sits on both this and the Anthropic-Google $200B TPU deal. Inside what the four-hyperscaler ASIC lockup does to Nvidia.",
    type: 'article',
    publishedTime: '2026-07-13T14:00:00Z',
    authors: ['Marcus Chen'],
  },
  twitter: {
    card: 'summary_large_image',
    title: "Meta's Iris Chip Enters Production in September.",
    description:
      "Broadcom is on Meta's Iris and Google's TPU v7. The four-hyperscaler ASIC lockup is now complete, and Nvidia's growth story just got a new asterisk.",
  },
};

export default function MetaIrisChipBroadcomNvidiaCeilingPage() {
  return (
    <article className="max-w-3xl mx-auto px-4 sm:px-6 py-10">
      <ArticleJsonLd
        title="Meta's Iris Chip Enters Production in September. Broadcom Is Quietly Winning the Custom Silicon Race."
        description="An internal memo has Meta putting its in-house MTIA Iris chip into production this September, on the way to a doubling of compute capacity from 7 GW to 14 GW by 2027 and up to $145 billion of CapEx this year. Broadcom co-designed both this and the Anthropic-Google $200B TPU deal."
        datePublished="2026-07-13"
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

      {/* Hero (graphic mode: Meta blue into hot-silicon rust) */}
      <ArticleHero
        mode="graphic"
        icon={Cpu}
        gradientFrom="#1e3a8a"
        gradientTo="#7c2d12"
        eyebrow="Markets &middot; Custom Silicon"
      />

      {/* Header */}
      <header className="mb-10">
        <h1 className="text-3xl sm:text-4xl font-bold text-text-primary mb-4 leading-tight">
          Meta&apos;s Iris Chip Enters Production in September. Broadcom Is Quietly Winning the Custom Silicon Race.
        </h1>
        <div className="flex items-center gap-3 text-sm text-text-muted">
          <span className="text-text-secondary font-medium">Marcus Chen</span>
          <span>&middot;</span>
          <time dateTime="2026-07-13">July 13, 2026</time>
          <span>&middot;</span>
          <span className="flex items-center gap-1">
            <Clock className="w-3.5 h-3.5" />
            6 min read
          </span>
        </div>
      </header>

      <ShareBar
        path="/originals/meta-iris-chip-broadcom-nvidia-ceiling"
        title="Meta's Iris Chip Enters Production in September. Broadcom Is Quietly Winning the Custom Silicon Race."
      />

      {/* Article body */}
      <div className="prose-custom space-y-6 text-lg text-text-primary leading-relaxed">
        <p className="text-lg text-text-primary leading-relaxed">
          Reuters got the memo on Thursday. Meta is putting the Iris chip, the first production
          silicon out of its MTIA program, into manufacturing in September. Broadcom did the design
          work. TSMC has the fab allocation. Iris cleared its bug-testing phase in about six weeks
          with no significant issues, which is roughly the fastest anyone has taken a custom AI
          accelerator from tape-out to production this cycle. The memo also spelled out the
          compute-capacity target and the CapEx line: seven gigawatts online in 2026, fourteen
          gigawatts by 2027, up to $145 billion of AI infrastructure spend for the year.
        </p>

        <p>
          The headline read is that Meta joined the custom-silicon club. That is the surface story.
          The one worth pulling on is that Broadcom just added a second $100B-plus program to the
          same design bench that already carries TPU v7 for Google, which is the silicon underneath
          the $200 billion Anthropic commitment we{' '}
          <Link href="/originals/anthropic-200b-google-tpu-math" className="text-accent-primary hover:underline">
            wrote up in May
          </Link>
          . The same company is quietly on both sides of the largest ASIC buildouts in the industry.
        </p>

        <h2 className="text-2xl font-semibold text-text-primary pt-4">The Iris Memo In Numbers</h2>

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
                <td className="px-4 py-3 text-accent-primary font-medium">Production start</td>
                <td className="px-4 py-3 font-mono">September 2026</td>
                <td className="px-4 py-3">Mass manufacturing, not sampling</td>
              </tr>
              <tr>
                <td className="px-4 py-3 text-accent-primary font-medium">Bug-test window</td>
                <td className="px-4 py-3 font-mono">~6 weeks</td>
                <td className="px-4 py-3">No major issues found</td>
              </tr>
              <tr>
                <td className="px-4 py-3 text-accent-primary font-medium">Design partner</td>
                <td className="px-4 py-3 font-mono">Broadcom</td>
                <td className="px-4 py-3">Also on Google TPU v7</td>
              </tr>
              <tr>
                <td className="px-4 py-3 text-accent-primary font-medium">Fabricator</td>
                <td className="px-4 py-3 font-mono">TSMC</td>
                <td className="px-4 py-3">Same fab queue as Nvidia Rubin</td>
              </tr>
              <tr>
                <td className="px-4 py-3 text-accent-primary font-medium">Compute today</td>
                <td className="px-4 py-3 font-mono">7 GW</td>
                <td className="px-4 py-3">Ramp target for 2026</td>
              </tr>
              <tr>
                <td className="px-4 py-3 text-accent-primary font-medium">Compute by 2027</td>
                <td className="px-4 py-3 font-mono">14 GW</td>
                <td className="px-4 py-3">Doubling in twelve months</td>
              </tr>
              <tr>
                <td className="px-4 py-3 text-accent-primary font-medium">2026 CapEx ceiling</td>
                <td className="px-4 py-3 font-mono">$145B</td>
                <td className="px-4 py-3">Prior guide was $118B; raised</td>
              </tr>
              <tr>
                <td className="px-4 py-3 text-accent-primary font-medium">MTIA generations</td>
                <td className="px-4 py-3 font-mono">4</td>
                <td className="px-4 py-3">Iris is generation two hitting production</td>
              </tr>
            </tbody>
          </table>
        </div>

        <p>
          Two of those numbers belong in a case study. Six weeks of bug testing is not normal for a
          new-node accelerator. Google spent close to a year on TPU v5 validation before green-lighting
          fab starts. Amazon needed most of a year on Trainium 2. Six weeks tells you Iris is either
          (a) an architecturally conservative refresh of the MTIA v1 die with a Broadcom-tuned
          interconnect, or (b) validated primarily against Meta&apos;s own known workloads, which
          have narrower coverage than a general-purpose accelerator. Both readings are more likely
          than the third possibility, that Meta simply moved faster than the rest of the industry
          on a fresh architecture. The memo is not describing a moonshot. It is describing a chip
          Meta is confident enough in to commit fab and packaging capacity against.
        </p>

        <p>
          The other number that matters is the CapEx raise. Meta had been guiding investors to roughly
          $118 billion of 2026 infrastructure spend at the last earnings call. The memo puts the top
          of the range at $145 billion. That is a $27 billion swing inside one calendar quarter,
          which is bigger than the annual R&amp;D budget of every AI lab except OpenAI and Anthropic.
          The compute-buildout arms race we sketched out in{' '}
          <Link href="/originals/ai-buildout-explained" className="text-accent-primary hover:underline">
            the buildout piece
          </Link>{' '}
          just got a fresh delta from the largest ad platform on the internet.
        </p>

        <h2 className="text-2xl font-semibold text-text-primary pt-4">The Broadcom Story Nobody Is Telling</h2>

        <p>
          Every ASIC needs a design partner. That is where the chip actually gets turned from a
          workload spec into physical silicon. The current tally at the top of the market:
        </p>

        <div className="bg-bg-secondary border border-border rounded-lg overflow-x-auto my-6">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border">
                <th className="text-left px-4 py-3 text-text-primary font-semibold">Hyperscaler</th>
                <th className="text-left px-4 py-3 text-text-primary font-semibold">Chip</th>
                <th className="text-left px-4 py-3 text-text-primary font-semibold">Design partner</th>
                <th className="text-left px-4 py-3 text-text-primary font-semibold">Fab</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              <tr>
                <td className="px-4 py-3 text-accent-primary font-medium">Google</td>
                <td className="px-4 py-3">TPU v7 Ironwood</td>
                <td className="px-4 py-3">Broadcom</td>
                <td className="px-4 py-3">TSMC</td>
              </tr>
              <tr>
                <td className="px-4 py-3 text-accent-primary font-medium">Meta</td>
                <td className="px-4 py-3">MTIA Iris</td>
                <td className="px-4 py-3">Broadcom</td>
                <td className="px-4 py-3">TSMC</td>
              </tr>
              <tr>
                <td className="px-4 py-3 text-accent-primary font-medium">Amazon</td>
                <td className="px-4 py-3">Trainium 3</td>
                <td className="px-4 py-3">Marvell / Alchip</td>
                <td className="px-4 py-3">TSMC</td>
              </tr>
              <tr>
                <td className="px-4 py-3 text-accent-primary font-medium">Microsoft</td>
                <td className="px-4 py-3">Maia 200</td>
                <td className="px-4 py-3">In-house / Global Unichip</td>
                <td className="px-4 py-3">TSMC</td>
              </tr>
              <tr>
                <td className="px-4 py-3 text-accent-primary font-medium">OpenAI</td>
                <td className="px-4 py-3">Jalapeno (2027)</td>
                <td className="px-4 py-3">Broadcom</td>
                <td className="px-4 py-3">TSMC</td>
              </tr>
            </tbody>
          </table>
        </div>

        <p>
          Broadcom is now on three of the five most important custom AI programs in the industry.
          Google TPU has been the flagship for years. OpenAI Jalapeno, which we covered when the
          deal closed and{' '}
          <Link href="/originals/openai-jalapeno-custom-silicon-loop-closed" className="text-accent-primary hover:underline">
            wrote up as the closed silicon loop
          </Link>
          , added the second flagship in Q1. Meta MTIA/Iris makes it three. The company&apos;s AI
          revenue guide for fiscal 2026 was $17 billion at the last update; the run rate implied by
          these three programs alone, on multi-year contracts, is closer to $60 billion by 2028.
        </p>

        <p>
          Broadcom trades at roughly 22 times forward revenue right now. If the market caught up to
          the ASIC concentration story, it would be trading closer to Nvidia&apos;s multiple. It is
          not. The market still prices Broadcom as a networking silicon business with an AI
          attachment. The reality is closer to inverted. Broadcom is the ASIC business the market
          has not repriced yet.
        </p>

        <h2 className="text-2xl font-semibold text-text-primary pt-4">What This Does to Nvidia</h2>

        <p>
          Less than the ASIC-shipment-growth headlines suggest, but more than zero, and the
          composition of the delta matters. Custom AI chip shipments are on track to grow about 45
          percent in 2026 against roughly 16 percent for merchant GPU shipments, per Futurum
          Research&apos;s July update. That gap is the sharpest single data point on where marginal
          silicon dollars are going.
        </p>

        <p>
          Nvidia is not losing revenue on any of this. Its 2026 data-center number is still tracking
          to a record. What it is losing is future customer concentration. Until this year the
          bull case on Nvidia assumed Meta, Microsoft, Google, and Amazon would each keep buying
          roughly a fifth of every new node&apos;s output for the foreseeable buildout. That
          assumption is now empirically wrong for three of the four. Google is buying half as many
          Nvidia GPUs per gigawatt as it was in 2024, because TPU covers the rest. Microsoft is
          publicly guiding to Maia 200 handling the Copilot inference base, which we covered in{' '}
          <Link href="/originals/anthropic-maia-200-fourth-chip-inference" className="text-accent-primary hover:underline">
            the Maia 200 piece
          </Link>
          . Meta with Iris is the last of the top-four hyperscalers to lock in the split.
        </p>

        <p>
          The single largest remaining Nvidia-dependent frontier buyer is now OpenAI, which still
          runs Vera Rubin on Azure and CoreWeave as its dominant training substrate and does not
          take Jalapeno silicon at meaningful volume until 2027. Anthropic is the second largest,
          and Anthropic&apos;s $200B commitment is now TPU-anchored. That is the shape of
          Nvidia&apos;s 2027 customer file: two labs on top, hyperscalers filling in around the
          edges, and the growth math meaningfully harder than it was six months ago.
        </p>

        <h2 className="text-2xl font-semibold text-text-primary pt-4">The 14 GW Question</h2>

        <p>
          Doubling data-center compute from 7 gigawatts to 14 gigawatts inside twelve months is not
          primarily a silicon problem. It is a power problem, a substation problem, and a permitting
          problem. Meta already has the majority of its 2027 gigawatts under signed power purchase
          agreements, but the transformer and switchgear lead times sit at eighteen to twenty-four
          months for anything above 300 MVA, and the FERC interconnection queue we{' '}
          <Link href="/originals/ferc-ai-data-center-bypass-watch" className="text-accent-primary hover:underline">
            wrote up in April
          </Link>{' '}
          has not shortened. Meta&apos;s answer, reportedly, is a mix of Louisiana natural gas
          co-siting, some behind-the-meter solar, and at least one nuclear PPA under negotiation.
          None of that is in the memo. All of it is implied by the number.
        </p>

        <p>
          The 2027 delivery window keeps hardening into a real cliff. Anthropic&apos;s TPU capacity
          arrives in 2027. OpenAI&apos;s 10 GW Vera Rubin commitment on Nvidia arrives starting in
          2027. Meta&apos;s second 7 GW arrives in 2027. Add Microsoft&apos;s Azure expansion and
          the SAP Prior Labs European buildout and you get roughly 40 gigawatts of new AI compute
          landing on the grid inside one year. The industry is now betting the same twelve-month
          window as if it were the launch pad for the whole next decade of scaling.
        </p>

        <h2 className="text-2xl font-semibold text-text-primary pt-4">Our Take</h2>

        <p>
          The clean read on the Iris memo is that Meta closed the fourth hyperscaler ASIC loop.
          Google closed it with TPU. Amazon closed it with Trainium. Microsoft closed it with Maia
          200. Meta&apos;s Iris makes four for four. That is the concrete end of a strategic
          transition every big infrastructure buyer has been running since 2023, and it happened
          without a keynote. It happened in a Reuters memo leak.
        </p>

        <p>
          The more interesting read is that Broadcom is the invisible platform underneath it. If you
          are underwriting AI infrastructure exposure and you own Nvidia against the buildout, you
          are half-hedged at best. The other half of the trade is the design partner sitting on the
          call sheet for three of the five biggest ASIC programs in the industry. Broadcom does not
          make the chip in a way retail investors instinctively price for. It makes the chip
          possible. In 2027 that is going to be reflected in the multiple, and by the time it is,
          the story will be finished.
        </p>

        <p>
          Practical implication for builders. Meta is not selling MTIA capacity externally. Iris
          matters to you only as a floor on internal Facebook and Instagram AI cost, which sets the
          shape of the free-tier consumer AI product Meta ships next. If Meta&apos;s inference cost
          per token on its own chip lands anywhere close to the TPU curve, expect Muse Spark 1.1 and
          its successors to be priced aggressively into the same commodity tier that GPT-5.6 Luna
          and Grok 4.5 opened up last week in{' '}
          <Link href="/originals/five-coding-models-48-hours-scoreboard" className="text-accent-primary hover:underline">
            the coding scoreboard
          </Link>
          . The bottom of the market keeps getting cheaper. The design partner on the silicon that
          makes it cheap is Broadcom. That is the actual story of the Iris memo, and it does not
          fit inside a headline.
        </p>

        <p>
          We are tracking hyperscaler chip cadence on{' '}
          <Link href="/providers/meta" className="text-accent-primary hover:underline">
            our Meta provider page
          </Link>{' '}
          and the ASIC-versus-GPU capital rotation on{' '}
          <Link href="/originals/inference-money-vs-ai-chip-stocks" className="text-accent-primary hover:underline">
            the inference-money piece
          </Link>
          . Next data point to watch: whether Meta lets an outside customer touch Iris at all, and
          whether Broadcom guides Q3 AI revenue up on the design-win pipeline. Either would confirm
          the story the market has not yet priced.
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
            href="/originals/openai-jalapeno-custom-silicon-loop-closed"
            className="block bg-bg-secondary border border-border rounded-lg px-4 py-3 hover:border-accent-primary transition-colors"
          >
            <span className="text-text-primary text-sm">OpenAI&apos;s Jalapeno Just Closed the Custom Silicon Loop</span>
          </Link>
          <Link
            href="/originals/anthropic-maia-200-fourth-chip-inference"
            className="block bg-bg-secondary border border-border rounded-lg px-4 py-3 hover:border-accent-primary transition-colors"
          >
            <span className="text-text-primary text-sm">Maia 200 Is Microsoft&apos;s Answer On the Fourth Chip For Inference</span>
          </Link>
          <Link
            href="/originals/nvidia-40b-equity-customer-investor-loop"
            className="block bg-bg-secondary border border-border rounded-lg px-4 py-3 hover:border-accent-primary transition-colors"
          >
            <span className="text-text-primary text-sm">Nvidia&apos;s $40B Equity Ties Its Customer to Its Investor</span>
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
