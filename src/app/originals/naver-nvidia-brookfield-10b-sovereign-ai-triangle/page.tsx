import { Metadata } from 'next';
import Link from 'next/link';
import { ArrowLeft, Clock, Factory } from 'lucide-react';
import { ArticleJsonLd } from '@/components/seo/JsonLd';
import ArticleHero from '@/components/originals/ArticleHero';
import ShareBar from '@/components/originals/ShareBar';

export const metadata: Metadata = {
  alternates: {
    canonical:
      'https://tensorfeed.ai/originals/naver-nvidia-brookfield-10b-sovereign-ai-triangle',
  },
  title:
    "NAVER, NVIDIA, and Brookfield Put $10 Billion Behind Korea's 200 Megawatt Sovereign AI Factory. The Financing Template Is the Story.",
  description:
    "On Friday, July 25, 2026, NAVER, NVIDIA, and Brookfield announced a $10 billion expansion of the GAK Sejong AI factory from 55 megawatts to 200 megawatts by 2028, with NVIDIA writing $1B of equity, Brookfield committing up to $9B on a non-binding term sheet, and NAVER carrying the rest. Inside the numbers table, why the vendor-equity loop just recruited a project-finance firm to close deals that NVIDIA cannot underwrite alone, the two sovereign AI templates now in the field (Beijing's all-domestic burn versus Seoul's allied triangle), what Brookfield's $100B AI infrastructure fund does to NVIDIA's placement capacity outside the hyperscaler stack, and why the 2028 delivery window puts NAVER's take-or-pay math on the same 24-month clock as every other frontier commitment written this year.",
  openGraph: {
    title:
      "NAVER, NVIDIA, and Brookfield Put $10B Behind Korea's 200MW Sovereign AI Factory.",
    description:
      "NVIDIA writes $1B, Brookfield writes up to $9B on a term sheet, NAVER carries the rest. The vendor equity loop just added project finance. Inside the sovereign AI triangle.",
    type: 'article',
    publishedTime: '2026-07-27T14:00:00Z',
    authors: ['Marcus Chen'],
  },
  twitter: {
    card: 'summary_large_image',
    title: "NAVER, NVIDIA, and Brookfield Put $10B Behind Korea's Sovereign AI Factory.",
    description:
      "The vendor equity loop just recruited a project-finance firm. Two sovereign AI templates are now in the field, and one of them keeps Vera Rubin in the racks.",
  },
};

export default function NaverNvidiaBrookfield10BSovereignAiTrianglePage() {
  return (
    <article className="max-w-3xl mx-auto px-4 sm:px-6 py-10">
      <ArticleJsonLd
        title="NAVER, NVIDIA, and Brookfield Put $10 Billion Behind Korea's 200 Megawatt Sovereign AI Factory. The Financing Template Is the Story."
        description="Announced Friday, July 25, 2026, the deal expands NAVER's GAK Sejong AI factory from 55 megawatts to 200 megawatts by 2028 for $10 billion. NVIDIA writes $1B of equity, Brookfield commits up to $9B on a non-binding term sheet, NAVER carries the rest. Inside the vendor-equity loop widened by project finance, the two sovereign AI templates now in the field, and what this does to NVIDIA's placement capacity outside the hyperscaler stack."
        datePublished="2026-07-27"
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

      {/* Hero (graphic mode: Korean flag blue into NVIDIA green) */}
      <ArticleHero
        mode="graphic"
        icon={Factory}
        gradientFrom="#003478"
        gradientTo="#76B900"
        eyebrow="Markets &middot; AI Infrastructure"
      />

      {/* Header */}
      <header className="mb-10">
        <h1 className="text-3xl sm:text-4xl font-bold text-text-primary mb-4 leading-tight">
          NAVER, NVIDIA, and Brookfield Put $10 Billion Behind Korea&apos;s 200 Megawatt Sovereign AI Factory. The Financing Template Is the Story.
        </h1>
        <div className="flex items-center gap-3 text-sm text-text-muted">
          <span className="text-text-secondary font-medium">Marcus Chen</span>
          <span>&middot;</span>
          <time dateTime="2026-07-27">July 27, 2026</time>
          <span>&middot;</span>
          <span className="flex items-center gap-1">
            <Clock className="w-3.5 h-3.5" />
            7 min read
          </span>
        </div>
      </header>

      <ShareBar
        path="/originals/naver-nvidia-brookfield-10b-sovereign-ai-triangle"
        title="NAVER, NVIDIA, and Brookfield Put $10 Billion Behind Korea's 200 Megawatt Sovereign AI Factory."
      />

      {/* Article body */}
      <div className="prose-custom space-y-6 text-lg text-text-primary leading-relaxed">
        <p className="text-lg text-text-primary leading-relaxed">
          NAVER, NVIDIA, and Brookfield put out a joint statement on Friday, July 25, saying they
          will expand NAVER&apos;s DSX AI factory at the GAK Sejong hyperscale campus from 55
          megawatts to 200 megawatts by 2028. Total bill: about $10 billion. NVIDIA writes an
          equity check of $1 billion. Brookfield puts up to $9 billion on a non-binding term
          sheet. NAVER covers the remainder and operates the site. The compute starts on Blackwell
          today, moves to Vera Rubin in 2027 and 2028, and the trio&apos;s stated long-term ambition
          is one gigawatt of sovereign AI capacity on the same campus.
        </p>

        <p>
          The megawatt number is not the story. The financing structure is.
        </p>

        <h2 className="text-2xl font-semibold text-text-primary pt-4">The Numbers</h2>

        <div className="bg-bg-secondary border border-border rounded-lg overflow-x-auto my-6">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border">
                <th className="text-left px-4 py-3 text-text-primary font-semibold">Line</th>
                <th className="text-left px-4 py-3 text-text-primary font-semibold">Value</th>
                <th className="text-left px-4 py-3 text-text-primary font-semibold">Notes</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              <tr>
                <td className="px-4 py-3 text-accent-primary font-medium">Announcement</td>
                <td className="px-4 py-3 font-mono">Jul 25, 2026</td>
                <td className="px-4 py-3">Joint NAVER, NVIDIA, Brookfield statement</td>
              </tr>
              <tr>
                <td className="px-4 py-3 text-accent-primary font-medium">Total project cost</td>
                <td className="px-4 py-3 font-mono">~$10B</td>
                <td className="px-4 py-3">Expansion of GAK Sejong DSX factory</td>
              </tr>
              <tr>
                <td className="px-4 py-3 text-accent-primary font-medium">Brookfield</td>
                <td className="px-4 py-3 font-mono">up to $9B</td>
                <td className="px-4 py-3">Non-binding term sheet, exclusive capital partner</td>
              </tr>
              <tr>
                <td className="px-4 py-3 text-accent-primary font-medium">NVIDIA equity</td>
                <td className="px-4 py-3 font-mono">$1B</td>
                <td className="px-4 py-3">Equity into NAVER, anchors the deal</td>
              </tr>
              <tr>
                <td className="px-4 py-3 text-accent-primary font-medium">NAVER</td>
                <td className="px-4 py-3 font-mono">Balance</td>
                <td className="px-4 py-3">Land, ops, offtake, national champion cover</td>
              </tr>
              <tr>
                <td className="px-4 py-3 text-accent-primary font-medium">Current capacity</td>
                <td className="px-4 py-3 font-mono">55 MW</td>
                <td className="px-4 py-3">GAK Sejong, live today</td>
              </tr>
              <tr>
                <td className="px-4 py-3 text-accent-primary font-medium">2028 target</td>
                <td className="px-4 py-3 font-mono">200 MW</td>
                <td className="px-4 py-3">3.6x expansion, Blackwell plus Vera Rubin</td>
              </tr>
              <tr>
                <td className="px-4 py-3 text-accent-primary font-medium">Long-term goal</td>
                <td className="px-4 py-3 font-mono">1 GW</td>
                <td className="px-4 py-3">Stated ceiling on the same Sejong campus</td>
              </tr>
              <tr>
                <td className="px-4 py-3 text-accent-primary font-medium">Brookfield AI fund AUM</td>
                <td className="px-4 py-3 font-mono">~$100B</td>
                <td className="px-4 py-3">Anchored by NVIDIA and KIA, stood up in 2025</td>
              </tr>
            </tbody>
          </table>
        </div>

        <h2 className="text-2xl font-semibold text-text-primary pt-4">The Vendor Equity Loop Just Recruited a Project Finance Firm</h2>

        <p>
          The $1B NVIDIA equity into NAVER continues a pattern we have been tracking all year.
          Google put roughly $40B of equity into Anthropic and is recovering it through TPU spend
          in the deal{' '}
          <Link href="/originals/anthropic-200b-google-tpu-math" className="text-accent-primary hover:underline">
            we broke down in May
          </Link>
          . AMD wrote a $5B check to Anthropic to close 2 gigawatts of MI450, walked through in{' '}
          <Link href="/originals/amd-anthropic-2gw-mi450-fifth-vendor" className="text-accent-primary hover:underline">
            last Thursday&apos;s piece
          </Link>
          . NVIDIA itself sent $40B toward OpenAI to anchor a Vera Rubin commitment,{' '}
          <Link href="/originals/nvidia-40b-equity-customer-investor-loop" className="text-accent-primary hover:underline">
            the closed loop we sketched in April
          </Link>
          . Every one of those deals closes inside the chip vendor&apos;s balance sheet. Customer
          takes equity, gives commitment, vendor gets a demand floor, and the equity becomes a
          hedge on the commitment.
        </p>

        <p>
          Those deals worked because the customer on the other side was a US frontier lab with
          hyperscaler credit behind it and a revenue line that doubles on a quarterly cadence.
          NAVER is not that customer. NAVER is a Korean national champion with a real advertising
          and commerce business but nothing that looks like Anthropic&apos;s $30B run-rate or
          OpenAI&apos;s ChatGPT cash flow. NAVER is also building sovereign compute, which by
          definition cannot lean on AWS, Azure, or Google Cloud to underwrite the ramp. The vendor
          equity loop stops closing at NVIDIA&apos;s balance sheet.
        </p>

        <p>
          The gap gets filled by Brookfield&apos;s non-binding $9B, which is not a chip deal at
          all. It is project finance against a physical asset, sourced from the $100 billion AI
          infrastructure fund Brookfield stood up last year with NVIDIA and KIA as anchor
          investors. That is the new template. NVIDIA writes a token equity check for alignment.
          Brookfield writes the majority of the bill against the site. The customer signs a
          compute offtake that services the debt. Sovereign compute gets built without a
          hyperscaler landlord and without the customer needing to be creditworthy at the scale
          the compute demands.
        </p>

        <h2 className="text-2xl font-semibold text-text-primary pt-4">Two Sovereign AI Templates Are Now in the Field</h2>

        <p>
          Beijing already showed the other version. Z.ai turned on a gigawatt in Hebei last week,
          the story{' '}
          <Link href="/originals/z-ai-1gw-domestic-chips-sovereignty-stack" className="text-accent-primary hover:underline">
            we wrote up on Tuesday
          </Link>
          , using nothing but Chinese silicon on state-financed grid rails. No vendor equity from
          anyone because there is no allied vendor to write it. The Chinese template is: burn
          political will, absorb the yield hit on inferior silicon, close the sovereignty gap on
          hardware.
        </p>

        <p>
          Seoul&apos;s template is different. Keep the frontier silicon (Blackwell today, Vera
          Rubin from 2027). Give up a fraction of upside to NVIDIA via the equity leg. Recruit
          private capital at project-finance scale. Anchor the whole thing on a national champion.
          What you get is a sovereign AI factory that actually runs the frontier stack, but you
          now owe Brookfield and NVIDIA both. Ownership is on paper Korean. Financially, it is a
          triangle.
        </p>

        <p>
          Neither template is obviously wrong. Beijing&apos;s version buys full technical
          independence at the cost of a 20 to 40 percent per-chip performance gap and a
          balance-sheet dependence on state actors who do not price risk the way private markets
          do. Seoul&apos;s version keeps hardware parity and dilutes to a set of allied
          counterparties who now have a stake in the outcome. If you are a US ally sitting on the
          Korean side of the buildout, that is a feature, not a bug. If you were hoping for a
          template you could copy without owing NVIDIA and Brookfield, this week did not deliver
          one.
        </p>

        <h2 className="text-2xl font-semibold text-text-primary pt-4">What This Does to NVIDIA</h2>

        <p>
          Two things.
        </p>

        <p>
          One, NVIDIA now has a repeatable placement mechanism for gigawatt-class capacity in
          allied jurisdictions where the customer is neither a hyperscaler nor a frontier lab.
          That was the growth vector nobody had priced. Every US frontier-lab compute deal has
          already been written. Sovereign compute in Korea, Japan, Taiwan, Singapore, the Gulf,
          and probably slices of the EU, that market was open, and until this quarter the
          underwriting mechanism did not exist. Brookfield just handed NVIDIA one.
        </p>

        <p>
          Two, the $100B AI infrastructure fund is the external mirror of the customer-investor
          loop we have been describing all year. Google recycles Anthropic equity into TPU
          revenue. NVIDIA does the same trick but funds the deal externally through Brookfield,
          which is significantly more capital efficient at the vendor level. NVIDIA takes multi
          year offtake without carrying multi year balance sheet risk against a customer that is
          not one of its natural credits. It is the cleanest version of the compute buildout that
          has been assembled anywhere in the industry.
        </p>

        <p>
          The catch is concentration. Brookfield&apos;s fund is $100B and has NVIDIA anchoring the
          anchor tenants list. If Brookfield ends up on every meaningful sovereign AI deal outside
          China, and NVIDIA sits on the same side of every one, the CFIUS-adjacent question
          becomes real quickly, and so does the antitrust one. Kimi K3&apos;s open weights drop
          today (July 27), and if every sovereign AI factory on the allied side of the wall ends
          up running the same Brookfield-financed NVIDIA rack architecture, the word sovereign
          starts to do a lot of work in the marketing copy.
        </p>

        <h2 className="text-2xl font-semibold text-text-primary pt-4">The 2028 Delivery Window</h2>

        <p>
          The Korea site does not fill up in 2026. The 200 MW target is 2028. Vera Rubin arrives
          in 2027 and 2028. That puts NAVER&apos;s build alongside essentially every other frontier
          compute commitment we have been tracking. OpenAI&apos;s 10 gigawatt Vera Rubin ramp with
          NVIDIA, Anthropic&apos;s $200B on Google TPU, Meta&apos;s Anthropic-adjacent buildout,
          and now this. The 2027 to 2028 window is the physical delivery ceiling on close to a
          trillion dollars of announced compute demand. Fab allocations, substation permits, water
          rights, and grid interconnects all converge in the same 18 month band.
        </p>

        <p>
          That matters because the offtake math on a sovereign AI factory is nothing like the
          offtake math on a frontier lab. NAVER cannot double revenue every six months. It runs a
          business inside Korea&apos;s advertising, commerce, and mapping economy, and its top
          line is roughly $8 billion. The compute at Sejong has to service a longer, flatter demand
          curve than what Anthropic or OpenAI runs against, and Brookfield knows this. That is
          precisely why the term sheet is non-binding today and why the guarantee, when it
          hardens, will be a much stronger take-or-pay than any hyperscaler has ever asked a
          customer to sign.
        </p>

        <p>
          That guarantee lives on NAVER&apos;s balance sheet, which is why the stated 1 GW
          long-term target is the number the deal actually depends on. The 200 MW at Sejong is
          only the first tranche. The financing model only works if Korean demand keeps climbing
          through the decade, which is a bet on NAVER pulling US-based AI customers into the site
          through the trio&apos;s stated intent to serve Korean and US innovators from the same
          racks.
        </p>

        <h2 className="text-2xl font-semibold text-text-primary pt-4">Our Take</h2>

        <p>
          The pattern we saw with Anthropic-Google (customer pre-finances vendor buildout via
          offtake), Anthropic-AMD (vendor equity check locks in commitment), and NVIDIA-OpenAI
          (larger vendor check locks in larger commitment) just added a fourth variant. Project
          finance replaces the vendor&apos;s balance sheet. The vendor still gets the customer,
          and now also gets to preserve capital for the deals that need equity to close.
        </p>

        <p>
          That template is the exportable version of the Google-Anthropic loop. It is why NAVER
          got Vera Rubin capacity, and why every sovereign AI buildout on the allied side of the
          wall for the next 18 months is going to look like this one on the org chart. The
          customer sits on the sovereignty. NVIDIA sits on the silicon. Brookfield sits on the
          beam.
        </p>

        <p>
          Practical implication for builders. If your AI product is going to run inference in
          Korea, the price floor by 2028 is going to look a lot like the inference price floor
          everywhere else, because the underlying hardware and vendor economics are the same. The
          compute floor we described in{' '}
          <Link href="/originals/ai-pricing-floor" className="text-accent-primary hover:underline">
            our pricing-floor analysis
          </Link>{' '}
          is now genuinely global at the frontier tier. What differs is who owns the copy of the
          model and what jurisdiction its training data sat in. That is a policy floor, not a
          price floor.
        </p>

        <p>
          Three signposts to watch:
        </p>

        <p>
          One, whether the Brookfield term sheet hardens into binding debt before year end. That
          is what turns the $9B soft commitment into the actual financing engine of the site, and
          the terms of the offtake will tell you how tight Brookfield is squeezing NAVER on
          take-or-pay.
        </p>

        <p>
          Two, whether Japan (SoftBank plus Rapidus) or Taiwan (Foxconn plus TSMC) announces a
          comparable NVIDIA plus project-finance sovereign AI deal before Q1 2027. If Brookfield
          shows up on either, this becomes a template. If it does not, this stays a one-off.
        </p>

        <p>
          Three, whether the AI FINRA gate{' '}
          <Link href="/originals/white-house-ai-finra-sec-regulator-frontier" className="text-accent-primary hover:underline">
            we covered in June
          </Link>{' '}
          ends up applying to sovereign AI factories that host US-designed model weights, not just
          to the labs that train them. If the answer is yes, the offshore version of the American
          frontier stack picks up an additional compliance surface, and Brookfield&apos;s legal
          team gets very busy.
        </p>
      </div>

      {/* Related */}
      <footer className="mt-12 pt-8 border-t border-border">
        <h2 className="text-lg font-semibold text-text-primary mb-4">Related</h2>
        <div className="grid gap-3">
          <Link
            href="/originals/z-ai-1gw-domestic-chips-sovereignty-stack"
            className="block bg-bg-secondary border border-border rounded-lg px-4 py-3 hover:border-accent-primary transition-colors"
          >
            <span className="text-text-primary text-sm">Z.ai Just Powered On a Gigawatt Without a Single Nvidia Chip. Sovereignty Is a Hardware Story Now.</span>
          </Link>
          <Link
            href="/originals/amd-anthropic-2gw-mi450-fifth-vendor"
            className="block bg-bg-secondary border border-border rounded-lg px-4 py-3 hover:border-accent-primary transition-colors"
          >
            <span className="text-text-primary text-sm">AMD Put $5 Billion Into Anthropic for 2 Gigawatts of MI450. The Fifth Compute Vendor Comes With a ROCm Engineering Team Attached.</span>
          </Link>
          <Link
            href="/originals/anthropic-200b-google-tpu-math"
            className="block bg-bg-secondary border border-border rounded-lg px-4 py-3 hover:border-accent-primary transition-colors"
          >
            <span className="text-text-primary text-sm">Anthropic&apos;s $200B Compute Bill Is Bigger Than Its Revenue. The Google TPU Deal in Numbers.</span>
          </Link>
          <Link
            href="/originals/nvidia-40b-equity-customer-investor-loop"
            className="block bg-bg-secondary border border-border rounded-lg px-4 py-3 hover:border-accent-primary transition-colors"
          >
            <span className="text-text-primary text-sm">Nvidia&apos;s $40B Into OpenAI Closes the Customer-Investor Loop.</span>
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
