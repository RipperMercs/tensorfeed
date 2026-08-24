import { Metadata } from 'next';
import Link from 'next/link';
import { ArrowLeft, Clock, Landmark } from 'lucide-react';
import { ArticleJsonLd } from '@/components/seo/JsonLd';

import ShareBar from '@/components/originals/ShareBar';
import ArticleHero from '@/components/originals/ArticleHero';

const TITLE =
  'Broadcom Is Raising $70 Billion Against Its Own Balance Sheet. The Market Already Priced What That Guarantee Is Worth: 275 Basis Points.';

export const metadata: Metadata = {
  alternates: {
    canonical: 'https://tensorfeed.ai/originals/broadcom-xpv-70b-residual-value-guarantee',
  },
  title: TITLE,
  description:
    'Broadcom is in talks for $70 billion to $80 billion in debt to buy chips that get leased to Anthropic, ten weeks after the first $35 billion tranche. The tranche stack from that first deal contains the only public quote on what the credit markets think a frontier AI lab is worth as a borrower, and the number is 8.5 percent.',
  openGraph: {
    title: TITLE,
    description:
      'The AI XPV platform borrows against Broadcom credit, not Anthropic credit. Guaranteed A2 notes cleared at 5.75 percent. Unguaranteed B notes cleared at 8.5 percent. That 275 basis point gap is the whole story.',
    type: 'article',
    publishedTime: '2026-08-21T10:00:00Z',
    authors: ['Kira Nolan'],
  },
  twitter: {
    card: 'summary_large_image',
    title: TITLE,
    description:
      'A residual value guarantee on custom ASICs with no secondary market is not collateral. It is a credit guarantee wearing a collateral costume. BofA already cut Broadcom to Marketweight over it.',
  },
};

export default function BroadcomXpv70bResidualValueGuaranteePage() {
  return (
    <article className="max-w-3xl mx-auto px-4 sm:px-6 py-10">
      <ArticleJsonLd
        title={TITLE}
        description="Broadcom is in talks to raise $70 billion to $80 billion in debt through its AI XPV platform to fund chips leased to Anthropic and other frontier labs, ten weeks after an initial $35 billion tranche. The pricing gap between Broadcom-guaranteed and unguaranteed notes is the first public credit quote on a frontier AI lab."
        datePublished="2026-08-21"
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

      {/* Header */}
      <header className="mb-10">
        <h1 className="text-3xl sm:text-4xl font-bold text-text-primary mb-4 leading-tight">
          Broadcom Is Raising $70 Billion Against Its Own Balance Sheet. The Market Already Priced
          What That Guarantee Is Worth: 275 Basis Points.
        </h1>
        <div className="flex items-center gap-3 text-sm text-text-muted">
          <span className="text-text-secondary font-medium">Kira Nolan</span>
          <span>&middot;</span>
          <time dateTime="2026-08-21">August 21, 2026</time>
          <span>&middot;</span>
          <span className="flex items-center gap-1">
            <Clock className="w-3.5 h-3.5" />8 min read
          </span>
        </div>
      </header>

      <ShareBar
        path="/originals/broadcom-xpv-70b-residual-value-guarantee"
        title="Broadcom Is Raising $70 Billion Against Its Own Balance Sheet. The Market Already Priced What That Guarantee Is Worth: 275 Basis Points."
      />

      <ArticleHero
        mode="graphic"
        icon={Landmark}
        gradientFrom="#0B1120"
        gradientTo="#4C1D95"
        eyebrow="Credit Markets &middot; AI Infrastructure"
      />

      {/* Article body */}
      <div className="prose-custom space-y-6 text-lg text-text-primary leading-relaxed">
        <p>
          Bloomberg reported on Thursday, August 20, 2026 that Broadcom is in talks with lenders to
          raise more than $60 billion in debt for an AI chip financing deal benefiting Anthropic and
          other labs. By Friday morning CNBC had the number higher: $70 billion to $80 billion, with a
          senior tranche around $45 billion and a junior tranche around $35 billion. Apollo and
          Blackstone are again in the room.
        </p>

        <p>
          The first deal on this platform closed in June at $35 billion. Ten weeks later the second
          one is roughly double. That is the headline everybody ran.
        </p>

        <p>
          I want to argue the headline is the least interesting part. The June deal left behind
          something far more useful than a dollar figure: a tranche stack where one slice carried a
          Broadcom guarantee and one slice did not, and both cleared the market on the same day. Two
          prices, same collateral, same lessee, same five-year term. Subtract them and you get the only
          public quote anyone has on what the credit markets think a frontier AI lab is worth as a
          borrower on its own name.
        </p>

        <p>The answer is 275 basis points.</p>

        <h2 className="text-2xl font-semibold text-text-primary pt-4">
          What the AI XPV Platform Actually Is
        </h2>

        <p>
          Broadcom announced the AI XPV platform on June 9, 2026, with Apollo Global Management and
          Blackstone&apos;s Credit and Insurance business as anchor investors. The stated design goal is
          more than 20 gigawatts of compute capacity through 2028, built on Broadcom XPUs and
          networking, customized for frontier labs including Anthropic and OpenAI.
        </p>

        <p>
          The mechanics are ordinary structured finance dressed in AI clothing. A special purpose
          vehicle borrows money from institutional investors, takes an equity slug, buys the chips, and
          leases them to Anthropic on a five-year term. The SPV owns the silicon. Anthropic makes lease
          payments. Investors get paid from those payments. Anthropic never puts $35 billion of
          accelerators on its own balance sheet, and Broadcom books a chip sale to a counterparty
          funded by somebody else&apos;s capital.
        </p>

        <p>
          Hock Tan called it synchronizing the world&apos;s most sophisticated capital with
          Broadcom&apos;s technological roadmap. That is a fair description of what it does. It is also
          a fair description of what a vendor does when its customers cannot fund the purchase order.
        </p>

        <p>
          The initial tranche was roughly $35 billion, led by Apollo with Blackstone, covering about
          1GW that Anthropic deploys at Fluidstack sites starting mid-2026. Here is how it split.
        </p>

        <div className="bg-bg-secondary border border-border rounded-lg overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border">
                <th className="text-left px-4 py-3 text-text-primary font-semibold">Tranche</th>
                <th className="text-left px-4 py-3 text-text-primary font-semibold">Size</th>
                <th className="text-left px-4 py-3 text-text-primary font-semibold">Broadcom RVG</th>
                <th className="text-left px-4 py-3 text-text-primary font-semibold">Clearing rate</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              <tr>
                <td className="px-4 py-3 text-accent-primary font-medium font-mono">Senior A1</td>
                <td className="px-4 py-3 font-mono">$6B</td>
                <td className="px-4 py-3">Yes</td>
                <td className="px-4 py-3 font-mono">T + ~100 bps</td>
              </tr>
              <tr>
                <td className="px-4 py-3 text-accent-primary font-medium font-mono">Senior A2</td>
                <td className="px-4 py-3 font-mono">$24B</td>
                <td className="px-4 py-3">Yes</td>
                <td className="px-4 py-3 font-mono">5.75% at par</td>
              </tr>
              <tr>
                <td className="px-4 py-3 text-accent-primary font-medium font-mono">Class B</td>
                <td className="px-4 py-3 font-mono">$4.5B</td>
                <td className="px-4 py-3">No</td>
                <td className="px-4 py-3 font-mono">8.5% at par</td>
              </tr>
            </tbody>
          </table>
        </div>

        <p>
          Thirty billion of the $34.5 billion in notes carries a Broadcom residual value guarantee. The
          remaining $4.5 billion does not. Under the residual value support agreement, if Anthropic
          stops making lease payments and the proceeds from selling the chips fall short, Broadcom
          covers the full outstanding balance for A1 and A2 holders. Class B holders get whatever is
          left.
        </p>

        <h2 className="text-2xl font-semibold text-text-primary pt-4">
          The 275 Basis Points Is the Only Honest Number in the Deal
        </h2>

        <p>
          A2 cleared at 5.75 percent. Class B cleared at 8.5 percent. Both sit against the same chips,
          the same lessee, the same lease, the same tenor. The only material difference between them is
          whose name is on the backstop.
        </p>

        <p>
          I want to be careful here, because subordination alone carries a spread even with identical
          credit behind it. Some slice of that 275 basis points is payment priority rather than
          guarantee value. But the guarantee is not partial in the usual sense. It does not absorb a
          first loss and then run out. It covers the full outstanding balance on A1 and A2 if the chips
          do not cover it. Once you strip out a normal subordination premium, most of what remains is
          the market pricing the difference between lending to Broadcom and lending to Anthropic.
        </p>

        <p>
          And 8.5 percent is a real number with a real meaning. That is high yield. That is where the
          market prices a chip-backed, asset-secured, five-year obligation from a company that is
          simultaneously reporting a $65 billion annualized run rate and reportedly seeking a public
          valuation of $2 trillion or more.
        </p>

        <p>
          Both things are true at once and they are not in tension, which is the part I find genuinely
          interesting. Equity markets price the upside distribution. Credit markets price the downside
          one. An investor can rationally believe Anthropic is worth $2 trillion in the good case and
          still want 8.5 percent to lend against a five-year lease, because the equity case runs on
          growth and the credit case runs on whether the lease payments show up every month for sixty
          months at a company that did not exist at this scale eighteen months ago.
        </p>

        <p>
          The credit markets have been quiet on frontier labs because frontier labs have funded
          themselves with equity. This is the first clean tick.
        </p>

        <h2 className="text-2xl font-semibold text-text-primary pt-4">
          A Residual Value Guarantee on a Custom ASIC Is Not Really About Residual Value
        </h2>

        <p>
          This is the part I think is underread, and it is a hardware argument rather than a finance
          one.
        </p>

        <p>
          Residual value guarantees are a normal instrument. Aircraft lessors use them. Auto lessors use
          them. They work because the underlying asset has a deep, liquid secondary market with
          observable prices. If a lessee defaults on a fleet of narrowbodies, there is a global bid for
          narrowbodies.
        </p>

        <p>
          An XPU is not a narrowbody. It is not even a GPU. Nvidia hardware has a genuine resale market:
          neoclouds buy it, research labs buy it, crypto refugees buy it, and there is a price you can
          look up. A Broadcom XPU is a custom ASIC co-designed for one customer&apos;s stack, wired into
          one customer&apos;s network topology, and paired with one customer&apos;s compiler and kernel
          work. If Anthropic stops paying, the SPV is holding a gigawatt of accelerators configured for
          Anthropic.
        </p>

        <p>
          Who is the second buyer? Possibly Google, since the TPU lineage is shared and Broadcom has
          built Google&apos;s tensor chips for over a decade. Possibly another XPV tenant. But that is a
          list of two or three names, and every one of them is a strategic buyer who knows the seller is
          distressed and knows the hardware fits almost nobody else. That is not a market. That is a
          negotiation.
        </p>

        <p>
          Which means the residual value guarantee is doing something different from what its name
          suggests. In a deep secondary market, an RVG covers a gap between expected and realized resale
          value. Here, the realistic recovery in a default scenario is low enough that the guarantee is
          functionally a full credit guarantee with a collateral costume on. Broadcom is not insuring a
          price. Broadcom is insuring a customer.
        </p>

        <h2 className="text-2xl font-semibold text-text-primary pt-4">
          Bank of America Noticed on August 11
        </h2>

        <p>
          Ten days before this week&apos;s reporting, BofA cut its credit view on Broadcom from
          Overweight to Marketweight, citing XPV specifically. Analyst Tom Curcuruto noted that
          Broadcom&apos;s bond spreads had widened roughly 20 to 30 basis points against other A-rated
          semiconductor issuers since early June, which is to say since the XPV launch.
        </p>

        <p>
          The modeled exposure is the number that should stop people. Scaled across the full 20GW
          ambition with roughly 2GW deals landing quarterly, maximum residual value guarantee exposure
          reaches about $370 billion by mid-2029. BofA put maximum loss exposure at roughly $42 billion
          under a total default assumption and about $10.5 billion at a 25 percent default rate.
          Separately, Broadcom has extended around $29 billion in backstop guarantees on XPV lease
          payments.
        </p>

        <p>
          Broadcom&apos;s entire AI-related order backlog was reported at roughly $73 billion. The
          contingent guarantee book is on a path to be five times that.
        </p>

        <div className="bg-bg-secondary border border-border rounded-lg overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border">
                <th className="text-left px-4 py-3 text-text-primary font-semibold">Deal</th>
                <th className="text-left px-4 py-3 text-text-primary font-semibold">Date</th>
                <th className="text-left px-4 py-3 text-text-primary font-semibold">Size</th>
                <th className="text-left px-4 py-3 text-text-primary font-semibold">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              <tr>
                <td className="px-4 py-3 text-accent-primary font-medium font-mono">XPV tranche 1</td>
                <td className="px-4 py-3 font-mono">June 9, 2026</td>
                <td className="px-4 py-3 font-mono">~$35B</td>
                <td className="px-4 py-3">Closed, ~1GW to Anthropic via Fluidstack</td>
              </tr>
              <tr>
                <td className="px-4 py-3 text-accent-primary font-medium font-mono">BofA credit cut</td>
                <td className="px-4 py-3 font-mono">Aug 11, 2026</td>
                <td className="px-4 py-3 font-mono">n/a</td>
                <td className="px-4 py-3">Overweight to Marketweight on XPV</td>
              </tr>
              <tr>
                <td className="px-4 py-3 text-accent-primary font-medium font-mono">XPV tranche 2</td>
                <td className="px-4 py-3 font-mono">Aug 20 to 21, 2026</td>
                <td className="px-4 py-3 font-mono">$70B to $80B</td>
                <td className="px-4 py-3">In talks, ~$45B senior and ~$35B junior</td>
              </tr>
              <tr>
                <td className="px-4 py-3 text-accent-primary font-medium font-mono">Modeled peak RVG</td>
                <td className="px-4 py-3 font-mono">Mid-2029</td>
                <td className="px-4 py-3 font-mono">~$370B</td>
                <td className="px-4 py-3">BofA estimate across full 20GW</td>
              </tr>
            </tbody>
          </table>
        </div>

        <p>
          Note the shape change between tranche one and tranche two. The first deal was 87 percent
          guaranteed senior paper and 13 percent unguaranteed junior. The second is reportedly around
          $45 billion senior against $35 billion junior, which is closer to 56 and 44. If those
          proportions hold, a much larger share of the second deal is being sold to investors who are
          taking lab credit risk directly rather than Broadcom credit risk. That could mean the market
          got more comfortable with Anthropic. It could also mean Broadcom is rationing how much of its
          own balance sheet it is willing to keep pledging. Those read very differently and nobody
          outside the deal knows which one it is yet.
        </p>

        <h2 className="text-2xl font-semibold text-text-primary pt-4">
          The Case That This Is Fine, Made Properly
        </h2>

        <p>
          The obvious comparison is vendor financing in the telecom buildout, when equipment makers
          lent customers the money to buy equipment and booked the resulting revenue as real. It ended
          badly and the phrase still carries a smell. I think the comparison is worth making and I also
          think it is weaker than it looks, in four specific ways.
        </p>

        <p>
          <strong className="text-text-primary">One.</strong> Broadcom is not lending cash. It is
          providing a contingent guarantee. The money comes from Apollo, Blackstone, and institutional
          credit investors who are underwriting the deal on their own analysis. No receivable from a
          shaky customer sits on Broadcom&apos;s books inflating revenue quality.
        </p>

        <p>
          <strong className="text-text-primary">Two.</strong> The exposure is contingent and
          collateralized rather than direct. Broadcom pays only if Anthropic defaults and the chips fail
          to cover the balance. Both conditions have to fire. My argument above is that the second
          condition is closer to automatic than the structure implies, but it is still a second
          condition.
        </p>

        <p>
          <strong className="text-text-primary">Three.</strong> The demand is not speculative in the way
          dark fiber was. Anthropic is putting these chips against paying inference workloads today, at a
          run rate the company says passed $65 billion in July, with reported positive adjusted operating
          income in the second quarter. Telecom built capacity for traffic that had not arrived.
          Anthropic is buying capacity for traffic it is currently rate limiting.
        </p>

        <p>
          <strong className="text-text-primary">Four.</strong> Somebody has to solve this. A five-year-old
          company cannot put $71 billion of compute commitments on a balance sheet that has never issued
          a bond. Either the compute does not get built, or the frontier labs get absorbed by
          hyperscalers who can fund it from operating cash flow, or a structure like XPV bridges the gap.
          The third option is the only one that preserves independent labs. That is a real argument and I
          do not want to wave it away.
        </p>

        <p>
          What survives all four counterpoints is narrower but I think it holds: the demand signal for
          Broadcom&apos;s chips is now partially manufactured by Broadcom&apos;s own credit. Every rack
          sold through XPV grows the guarantee book. Revenue and contingent liability rise together, in
          lockstep, by construction. That is not fraud and it is not even unusual. It is just a feedback
          loop, and feedback loops are fine right up until the input changes sign.
        </p>

        <h2 className="text-2xl font-semibold text-text-primary pt-4">
          This Is Not Happening in Isolation
        </h2>

        <p>
          XPV is the most structurally interesting deal in the category but it is far from alone. The
          financing of AI compute moved from equity to debt over about eighteen months, and the totals
          have gotten large enough that the shape matters.
        </p>

        <div className="bg-bg-secondary border border-border rounded-lg overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border">
                <th className="text-left px-4 py-3 text-text-primary font-semibold">Borrower</th>
                <th className="text-left px-4 py-3 text-text-primary font-semibold">Amount</th>
                <th className="text-left px-4 py-3 text-text-primary font-semibold">Shape</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              <tr>
                <td className="px-4 py-3 text-accent-primary font-medium font-mono">Big 5 hyperscalers</td>
                <td className="px-4 py-3 font-mono">$159B</td>
                <td className="px-4 py-3">US corporate bonds, 2026 through mid-year</td>
              </tr>
              <tr>
                <td className="px-4 py-3 text-accent-primary font-medium font-mono">Meta (Hyperion)</td>
                <td className="px-4 py-3 font-mono">$30B</td>
                <td className="px-4 py-3">Private credit, largest DC deal on record</td>
              </tr>
              <tr>
                <td className="px-4 py-3 text-accent-primary font-medium font-mono">Oracle</td>
                <td className="px-4 py-3 font-mono">$18B</td>
                <td className="px-4 py-3">Public bonds sold in a single day</td>
              </tr>
              <tr>
                <td className="px-4 py-3 text-accent-primary font-medium font-mono">CoreWeave</td>
                <td className="px-4 py-3 font-mono">$8.5B</td>
                <td className="px-4 py-3">GPU-collateralized loan</td>
              </tr>
              <tr>
                <td className="px-4 py-3 text-accent-primary font-medium font-mono">xAI</td>
                <td className="px-4 py-3 font-mono">$5B</td>
                <td className="px-4 py-3">Bonds and loans</td>
              </tr>
              <tr>
                <td className="px-4 py-3 text-accent-primary font-medium font-mono">Global AI issuance</td>
                <td className="px-4 py-3 font-mono">~$570B</td>
                <td className="px-4 py-3">Morgan Stanley 2026 estimate, 2x 2025</td>
              </tr>
            </tbody>
          </table>
        </div>

        <p>
          The number in that table that should get more attention than it does: the five largest US
          hyperscalers ended 2025 with roughly $969 billion in total undiscounted future data center
          lease commitments, of which about $662 billion had not yet commenced and therefore sat
          entirely off the reported balance sheet. That off-sheet figure equals about 113 percent of
          those same five companies&apos; combined adjusted on-balance-sheet debt.
        </p>

        <p>
          So the pattern is consistent from the largest balance sheets in the world down to a
          five-year-old lab: the obligation is real, the structure keeps it off the primary financial
          statements, and the disclosure lives in a footnote or a private credit agreement that nobody
          gets to read.
        </p>

        <h2 className="text-2xl font-semibold text-text-primary pt-4">Our Take</h2>

        <p>
          The interesting thing about the XPV structure is not whether it blows up. I do not think
          anyone can honestly forecast that, and pieces that claim to are selling something. The
          interesting thing is that it has produced a price where there was no price.
        </p>

        <p>
          For three years, every argument about whether the AI buildout is rational has been conducted
          in equity terms, which means it has been conducted in terms of upside scenarios and terminal
          multiples and vibes. Credit markets do the opposite job. They ask what happens in the bad case
          and demand to be paid for it. The June tranche stack is the first time the bad case got quoted
          out loud on a frontier lab, and it printed at 8.5 percent against 5.75 percent for the same
          asset with a large chip vendor standing behind it.
        </p>

        <p>
          That is not a scandal. It is data, and it is better data than anything the equity side has
          produced. It says the credit market believes these chips will be paid for, and also that it
          wants roughly 275 basis points of compensation for the possibility that they are not, and that
          Broadcom is currently willing to absorb that risk in exchange for demand it would otherwise
          have to wait for.
        </p>

        <p>
          The thing worth watching is not default. It is whether Broadcom keeps writing the guarantee at
          the same ratio as the deals get bigger. A vendor that backstops 87 percent of a $35 billion
          deal is confident. A vendor that backstops 56 percent of an $80 billion deal is either being
          disciplined or being told no. Same behavior, opposite meanings, and the difference is
          everything.
        </p>

        <p>Three things I am watching:</p>

        <p>
          <strong className="text-text-primary">One.</strong> The guaranteed share of tranche two when it
          prices. If the Broadcom-backed portion falls as a percentage of total, the market is taking
          more lab credit risk directly, and the unguaranteed coupon becomes the number to track. If it
          clears meaningfully inside 8.5 percent, Anthropic&apos;s standalone credit improved in ten
          weeks. If it clears wider, it did not.
        </p>

        <p>
          <strong className="text-text-primary">Two.</strong> Whether Anthropic&apos;s public S-1
          discloses the XPV lease obligations as a quantified commitment schedule or as narrative risk
          language. A company reportedly carrying around $71 billion in compute commitments and seeking a
          $2 trillion valuation will be judged partly on how legible it makes that number. Reporting is
          already pointing at AI backlash showing up as a named risk factor in the filing, which suggests
          the disclosure posture is at least deliberate.
        </p>

        <p>
          <strong className="text-text-primary">Three.</strong> Whether any second XPU customer signs a
          comparable structure. OpenAI is named in the platform&apos;s stated scope. A second lab
          borrowing against the same vendor&apos;s guarantee would turn a bilateral arrangement into a
          market, and would also concentrate a great deal of the industry&apos;s downside onto one
          semiconductor company&apos;s credit rating.
        </p>

        <p>
          Nvidia sells chips. Broadcom is starting to sell chips and underwrite the buyer. Those are
          different businesses with different risk profiles, and only one of them is priced into a
          semiconductor multiple.
        </p>
      </div>

      {/* Related */}
      <footer className="mt-12 pt-8 border-t border-border">
        <h2 className="text-lg font-semibold text-text-primary mb-4">Related</h2>
        <div className="grid gap-3">
          <Link
            href="/originals/anthropic-65b-run-rate-gross-net-ipo-restatement"
            className="block bg-bg-secondary border border-border rounded-lg px-4 py-3 hover:border-accent-primary transition-colors"
          >
            <span className="text-text-primary text-sm">
              Anthropic Says $65 Billion. OpenAI Says $40 Billion. Only One of Them Is Counting the
              Same Way.
            </span>
          </Link>
          <Link
            href="/originals/ai-capex-bubble-debate-scoreboard"
            className="block bg-bg-secondary border border-border rounded-lg px-4 py-3 hover:border-accent-primary transition-colors"
          >
            <span className="text-text-primary text-sm">
              Everyone Is Calling an AI Capex Bubble. Almost No One Agrees on How to Measure One.
            </span>
          </Link>
          <Link
            href="/originals/anthropic-200b-google-tpu-math"
            className="block bg-bg-secondary border border-border rounded-lg px-4 py-3 hover:border-accent-primary transition-colors"
          >
            <span className="text-text-primary text-sm">
              Anthropic&apos;s $200B Compute Bill Is Bigger Than Its Revenue. The Google TPU Deal in
              Numbers.
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
