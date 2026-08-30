import { Metadata } from 'next';
import Link from 'next/link';
import { ArrowLeft, Clock, Layers } from 'lucide-react';
import { ArticleJsonLd } from '@/components/seo/JsonLd';
import ArticleHero from '@/components/originals/ArticleHero';
import ShareBar from '@/components/originals/ShareBar';

const TITLE =
  'SoftBank Is Refinancing a $40 Billion Bridge With Margin Loans on a Paper Mark. The OpenAI Stake Is a Leverage Stack Now.';

export const metadata: Metadata = {
  alternates: {
    canonical:
      'https://tensorfeed.ai/originals/softbank-openai-stake-serial-loans-collateral-stack',
  },
  title: TITLE,
  description:
    "Bloomberg reported on Friday, August 28, 2026, that SoftBank is seeking a second $10 billion loan against its OpenAI stake, three weeks after closing the first $10 billion margin loan on August 6 and two days after mulling a $10 to $20 billion September bond sale. All of it is layered on top of a $40 billion unsecured bridge signed in March that has to be repaid by March 2027. Inside the math: SoftBank has already committed $64.6 billion for roughly 13 percent of OpenAI, the paper mark on that stake at the March 2026 $852 billion valuation is about $110 billion, and the borrowing stack behind it is now stacking three tiers deep on a private-company mark that only clears if the IPO holds it.",
  openGraph: {
    title: TITLE,
    description:
      "Three tranches of borrowing, one paper mark, and a March 2027 repayment wall. Inside the SoftBank leverage stack against its OpenAI stake, and what a mark cut in diligence does to the whole ledger.",
    type: 'article',
    publishedTime: '2026-08-30T14:00:00Z',
    authors: ['Marcus Chen'],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'SoftBank Is Refinancing a $40B Bridge With Margin Loans on a Paper Mark.',
    description:
      "SoftBank's OpenAI stake is now a leverage stack three tiers deep. Inside the math and the March 2027 wall.",
  },
};

export default function SoftBankOpenAILeverageStackPage() {
  return (
    <article className="max-w-3xl mx-auto px-4 sm:px-6 py-10">
      <ArticleJsonLd
        title={TITLE}
        description="Bloomberg reported August 28, 2026 that SoftBank is seeking a second $10 billion loan against its OpenAI stake, on top of a first $10 billion margin loan closed August 6, a potential $10 to $20 billion September bond sale, and a $40 billion unsecured bridge signed in March that has to be repaid by March 2027. This piece reads the whole stack as a leveraged bet on a private-company mark."
        datePublished="2026-08-30"
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

      {/* Hero (graphic mode: deep navy leverage to margin-call gold) */}
      <ArticleHero
        mode="graphic"
        icon={Layers}
        gradientFrom="#0A2540"
        gradientTo="#C08C2A"
        eyebrow="Markets &middot; AI Financing"
      />

      {/* Header */}
      <header className="mb-10">
        <h1 className="text-3xl sm:text-4xl font-bold text-text-primary mb-4 leading-tight">
          SoftBank Is Refinancing a $40 Billion Bridge With Margin Loans on a Paper Mark. The OpenAI Stake Is a Leverage Stack Now.
        </h1>
        <div className="flex items-center gap-3 text-sm text-text-muted">
          <span className="text-text-secondary font-medium">Marcus Chen</span>
          <span>&middot;</span>
          <time dateTime="2026-08-30">August 30, 2026</time>
          <span>&middot;</span>
          <span className="flex items-center gap-1">
            <Clock className="w-3.5 h-3.5" />
            6 min read
          </span>
        </div>
      </header>

      <ShareBar
        path="/originals/softbank-openai-stake-serial-loans-collateral-stack"
        title="SoftBank Is Refinancing a $40 Billion Bridge With Margin Loans on a Paper Mark. The OpenAI Stake Is a Leverage Stack Now."
      />

      {/* Article body */}
      <div className="prose-custom space-y-6 text-lg text-text-primary leading-relaxed">
        <p className="text-lg text-text-primary leading-relaxed">
          Bloomberg had it on Friday afternoon. SoftBank is talking to lenders about a second $10
          billion loan against its OpenAI stake, priced roughly 275 basis points over SOFR on a
          two year term, with Mizuho as the mandated lead arranger. That is three weeks after
          SoftBank closed the first $10 billion margin loan against the same stake, and two days
          after a separate Bloomberg piece put a potential $10 to $20 billion bond sale on the
          table for September. All of it is layered on top of a $40 billion unsecured bridge
          SoftBank signed in March, which comes due in March 2027.
        </p>

        <p>
          The headline is the second loan. The story is the shape of the stack.
        </p>

        <h2 className="text-2xl font-semibold text-text-primary pt-4">The Ledger</h2>

        <div className="bg-bg-secondary border border-border rounded-lg overflow-x-auto my-6">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border">
                <th className="text-left px-4 py-3 text-text-primary font-semibold">Date</th>
                <th className="text-left px-4 py-3 text-text-primary font-semibold">Instrument</th>
                <th className="text-left px-4 py-3 text-text-primary font-semibold">Size</th>
                <th className="text-left px-4 py-3 text-text-primary font-semibold">Terms</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              <tr>
                <td className="px-4 py-3 text-accent-primary font-medium">Mar 2026</td>
                <td className="px-4 py-3">Unsecured bridge</td>
                <td className="px-4 py-3 font-mono">$40B</td>
                <td className="px-4 py-3">Due March 2027, 21 new lenders added in July</td>
              </tr>
              <tr>
                <td className="px-4 py-3 text-accent-primary font-medium">Aug 6, 2026</td>
                <td className="px-4 py-3">Margin loan, OpenAI shares</td>
                <td className="px-4 py-3 font-mono">$10B</td>
                <td className="px-4 py-3">2 yr, Goldman + JPM + Mizuho + Apollo + SMBC, corporate guarantee attached</td>
              </tr>
              <tr>
                <td className="px-4 py-3 text-accent-primary font-medium">Aug 26, 2026</td>
                <td className="px-4 py-3">Potential bond, $ and euro tranches</td>
                <td className="px-4 py-3 font-mono">$10B to $20B</td>
                <td className="px-4 py-3">Marketed for early September, per Bloomberg</td>
              </tr>
              <tr>
                <td className="px-4 py-3 text-accent-primary font-medium">Aug 28, 2026</td>
                <td className="px-4 py-3">Second loan, OpenAI backing</td>
                <td className="px-4 py-3 font-mono">$10B</td>
                <td className="px-4 py-3">2 yr, SOFR + ~275 bps, Mizuho lead</td>
              </tr>
              <tr>
                <td className="px-4 py-3 text-accent-primary font-medium">Cumulative</td>
                <td className="px-4 py-3">Announced or sought</td>
                <td className="px-4 py-3 font-mono">$70B to $80B</td>
                <td className="px-4 py-3">Against a single private-company mark</td>
              </tr>
            </tbody>
          </table>
        </div>

        <p>
          For scale on the other side of the ledger: SoftBank has publicly committed $64.6 billion
          in equity to OpenAI across the initial 2024 round, the $22.5 billion follow-on, and the
          conversion tranches announced in February 2026, for a fully diluted position of roughly
          13 percent. At the $852 billion secondary mark set in March, that paper stake is worth
          about $110 billion. So the borrowing stack is not larger than the mark. It is a large
          fraction of it, and the fraction grows every time OpenAI closes at a lower number than
          the last one.
        </p>

        <h2 className="text-2xl font-semibold text-text-primary pt-4">What Is Actually Being Pledged</h2>

        <p>
          The subtle line in every SoftBank OpenAI financing headline this year has been the
          collateral. Pledging equity in a private company is not the same as pledging listed
          shares. When SoftBank first went to lenders in April for $10 billion secured on OpenAI
          shares, the process broke on valuation: nobody could agree what a private secondary mark
          was worth as collateral. The target was cut to $6 billion in May, and only revived at
          $10 billion in July after SoftBank added a corporate guarantee. That guarantee is the
          fact under the fact. The lenders on the August 6 loan have recourse to SoftBank Group
          the parent if the pledged OpenAI shares fall short of the collateral schedule. It is a
          margin loan in name and a partly recourse loan in substance.
        </p>

        <p>
          The corporate guarantee is what let the second loan get priced this fast. It is also
          what turns an OpenAI mark-down into a SoftBank balance-sheet event. Under a pure
          non-recourse structure, a stake that lost value would just get repossessed. Under a
          guarantee, a lender that took a mark hit could go looking for cash from the parent, or
          more precisely from whichever piece of the parent still trades on a public market. That
          is Arm, mostly. There is a reason the earlier reporting on a $5 billion loan proposed
          Arm shares as separate collateral.
        </p>

        <h2 className="text-2xl font-semibold text-text-primary pt-4">Why the Bridge Is the Real Deadline</h2>

        <p>
          Every piece of this stack points at one date: March 2027. That is when the $40 billion
          unsecured bridge comes due. The margin loans and the September bond are the tools
          SoftBank plans to use to get out from under that bridge before the deadline. Read that
          way, the August 6 loan and the August 28 loan are not additional leverage. They are the
          first two tranches of the takeout. The bond is meant to be the third.
        </p>

        <p>
          That framing is friendlier than the leverage headline suggests, and it is the version
          SoftBank has been quietly encouraging with the banks. It is also the version that only
          works if two things hold. One, the OpenAI mark does not slip between now and when the
          bond prices. Bond investors will look at the same collateral schedule the margin lenders
          did, and a private-company mark that got a haircut in the intervening quarter would
          reprice the coupon. Two, the OpenAI IPO clears inside the window. The prospectus was
          filed confidentially in June. The read across the confidential-filing to first-print
          timeline for other frontier IPOs is nine to fourteen months, which puts the earliest
          plausible print somewhere between March and August 2027. That is exactly the same
          window as the bridge deadline. The whole stack is timed against the same event.
        </p>

        <h2 className="text-2xl font-semibold text-text-primary pt-4">What Changes at a Mark Cut</h2>

        <p>
          Assume the OpenAI IPO prices at $600 billion instead of the $850 billion the March
          secondary implied. That is not a bear scenario. That is a modestly conservative one, the
          kind that shows up in a diligence report when the underwriter compares AI revenue
          multiples to the mature software cohort. At $600 billion, the 13 percent stake is worth
          roughly $78 billion, and the collateral coverage on the August 6 loan falls from about
          eleven times to about eight times. That is still comfortable, on paper. It is not
          comfortable if the corporate guarantee triggers a margin call at a lower ratio, and
          most margin loans do.
        </p>

        <p>
          Assume $400 billion. Now the stake is worth about $52 billion, the two $10 billion
          margin loans plus a $20 billion bond stack to $40 billion against $52 billion, and the
          coverage ratio flirts with breach. The bridge is not paid off in that scenario. It gets
          rolled again, at a higher coupon, or it eats into Arm proceeds. Neither is a solvency
          event for SoftBank. Both are the kind of thing that shows up as a Vision Fund line
          write-down in the November quarterly, and shows up in the OpenAI cap table two quarters
          later as a distressed sale of a preferred position.
        </p>

        <h2 className="text-2xl font-semibold text-text-primary pt-4">Where This Sits in the Broader Financing Stack</h2>

        <p>
          The reason to stack this piece against the ones we ran on the Ohio guarantee and the
          circular equity loop is that it is the third face of the same architecture. Nvidia
          agreed to backstop up to $105 billion of the Piketon build via its {' '}
          <Link
            href="/originals/nvidia-105b-openai-ohio-guarantee-shipped"
            className="text-accent-primary hover:underline"
          >
            Ohio guarantee
          </Link>
          . Google recycled its $40 billion Anthropic equity into $200 billion of {' '}
          <Link
            href="/originals/anthropic-200b-google-tpu-math"
            className="text-accent-primary hover:underline"
          >
            TPU commitments
          </Link>{' '}
          on the compute side. Now SoftBank is borrowing against its own OpenAI mark to keep
          funding an OpenAI position it already paid for in equity. The buildout is being paid
          for by a rotating cast of guarantors, and each one is layering financial commitments on
          top of paper marks. The bubble-debate {' '}
          <Link
            href="/originals/ai-capex-bubble-debate-scoreboard"
            className="text-accent-primary hover:underline"
          >
            scoreboard
          </Link>{' '}
          gets an extra column this week, and the column is labeled recourse.
        </p>

        <h2 className="text-2xl font-semibold text-text-primary pt-4">Counterreads</h2>

        <p>
          The strongest bear read on this piece is that we are pattern-matching to a leverage
          crisis that has not happened. SoftBank has run large balance-sheet positions for a
          decade. Masayoshi Son ran WeWork exposure and Alibaba exposure through worse volatility
          than an OpenAI mark cut in diligence. The $40 billion bridge got 21 additional lenders
          in July, which is the opposite signal a stressed borrower would generate. Mizuho would
          not lead-arrange a second $10 billion facility at SOFR + 275 if the collateral picture
          were shaky. Every one of those points is true, and none of them changes the fact that
          the structural risk has moved. What used to be equity risk on a paper mark is now
          equity risk plus a schedule.
        </p>

        <p>
          The second counterread is that private markets have moved on. Bloomberg reported this
          spring that the secondary OpenAI mark was clearing above $850 billion with real
          volume, and Coatue and Sequoia and Fidelity are still writing checks at those numbers.
          A single desk cutting a bond diligence mark is not the same as the market clearing at a
          new price. That is fair. It also underlines exactly why the March 2027 wall matters:
          the private mark holds up as long as private buyers keep clearing at it, and private
          buyers only clear at it as long as the IPO is visible on the horizon. Delay the print by
          six months and half the diligence spreadsheets swap the secondary price for a public
          comp.
        </p>

        <p>
          The third counterread is the one worth sitting with. The whole stack is not really about
          collateral coverage. It is about SoftBank ensuring that its OpenAI position is fully
          funded before the equity gets diluted again in a pre-IPO round. Cheap dollars secured
          on the current mark are the cheapest way to defend the 13 percent, and defending the
          13 percent is what keeps SoftBank in the Founders Fund tier of the eventual public cap
          table. On that read, the leverage stack is a rational insurance policy, and the
          headline risk is a rounding error against the alternative of getting diluted below the
          board seat threshold. That framing is coherent. It also is a bet that the equity
          upside on the marginal share exceeds the interest cost across the stack, and interest
          costs across the stack are already north of $2 billion a year on the drawn portion.
        </p>

        <h2 className="text-2xl font-semibold text-text-primary pt-4">Our Take</h2>

        <p>
          Priced against the way frontier-lab exposures were funded eighteen months ago (mostly
          equity from a handful of names, held on unlevered balance sheets), the SoftBank stack
          is a step-change in how the AI capex conversation reaches the credit markets. Priced
          against the way LBO sponsors have been funding private-company positions for two
          decades, it is aggressive but not exotic. Both readings are true. What matters this
          quarter is that the borrower is a public company with a very visible balance sheet, the
          collateral is a private position that trades on infrequent secondary marks, and the
          repayment schedule is stacked against a single IPO window nobody controls.
        </p>

        <p>
          Practical implication for anyone modeling the compute buildout. The next time an
          Anthropic or an OpenAI headlines a multi-year hyperscaler commitment, ask a follow-up
          question the reporter probably did not: which piece of the stack is being funded by
          fresh cash flow, which piece is being funded by equity, and which piece is being
          funded by debt secured against another party&apos;s equity. Two years ago the answer was
          almost entirely equity. This week the answer is mostly debt-on-paper, and the paper is
          not liquid.
        </p>

        <p>
          Three signposts to watch. Whether the September bond prints at the marketed size, or
          gets cut to the $10 billion floor, which tells you whether the credit market is
          repricing SoftBank OpenAI paper. Whether the {' '}
          <Link
            href="/originals/anthropic-confidential-s1-ipo"
            className="text-accent-primary hover:underline"
          >
            OpenAI S-1
          </Link>{' '}
          moves from confidential to public inside 120 days, which is the earliest visible
          checkpoint on the IPO clearing before March 2027. And whether any of the eight banks
          on the August loans quietly refuses to backstop the bond, which is the way this kind
          of situation surfaces first, one syndicate desk at a time.
        </p>

        <p>
          We are tracking the OpenAI cap table and the March 2027 refinance clock on {' '}
          <Link href="/providers/openai" className="text-accent-primary hover:underline">
            our OpenAI provider page
          </Link>{' '}
          and the SoftBank Piketon build via the {' '}
          <Link
            href="/originals/nvidia-250b-guarantee-credit-rating-rental"
            className="text-accent-primary hover:underline"
          >
            Nvidia guarantee analysis
          </Link>
          . Next data point: the SoftBank Q2 FY27 print later this quarter, which is the first
          time the second margin loan and any priced bond show up on the same page.
        </p>
      </div>

      {/* Related */}
      <footer className="mt-12 pt-8 border-t border-border">
        <h2 className="text-lg font-semibold text-text-primary mb-4">Related</h2>
        <div className="grid gap-3">
          <Link
            href="/originals/nvidia-250b-guarantee-credit-rating-rental"
            className="block bg-bg-secondary border border-border rounded-lg px-4 py-3 hover:border-accent-primary transition-colors"
          >
            <span className="text-text-primary text-sm">Nvidia Is Guaranteeing $250B of OpenAI Financing. That Is a Credit Rating Being Rented.</span>
          </Link>
          <Link
            href="/originals/nvidia-105b-openai-ohio-guarantee-shipped"
            className="block bg-bg-secondary border border-border rounded-lg px-4 py-3 hover:border-accent-primary transition-colors"
          >
            <span className="text-text-primary text-sm">Nvidia Signed the Ohio Guaranty at $105B. The Shadow Bank Model Has an Operating Contract.</span>
          </Link>
          <Link
            href="/originals/ai-capex-bubble-debate-scoreboard"
            className="block bg-bg-secondary border border-border rounded-lg px-4 py-3 hover:border-accent-primary transition-colors"
          >
            <span className="text-text-primary text-sm">The AI Capex Bubble Debate, Scored.</span>
          </Link>
          <Link
            href="/originals/anthropic-confidential-s1-ipo"
            className="block bg-bg-secondary border border-border rounded-lg px-4 py-3 hover:border-accent-primary transition-colors"
          >
            <span className="text-text-primary text-sm">Anthropic Filed a Confidential S-1. The IPO Clock Just Started.</span>
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
