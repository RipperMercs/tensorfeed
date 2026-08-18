import { Metadata } from 'next';
import Link from 'next/link';
import { ArrowLeft, Clock, Landmark } from 'lucide-react';
import { ArticleJsonLd } from '@/components/seo/JsonLd';
import ArticleHero from '@/components/originals/ArticleHero';
import ShareBar from '@/components/originals/ShareBar';
import { AdPlaceholder } from '@/components/AdPlaceholder';

export const metadata: Metadata = {
  alternates: {
    canonical:
      'https://tensorfeed.ai/originals/nvidia-105b-openai-ohio-guarantee-shipped',
  },
  title:
    'The $250B Nvidia Guarantee Talks Shipped as $105B. The Shadow Bank Now Has a Signed Contract.',
  description:
    "On Monday, August 17, 2026, Nvidia, OpenAI, and SoftBank signed the residual value guaranty behind the 8 gigawatt PORTS-Pike campus in Ohio. Nvidia backs up to $105 billion on the first 4.25 gigawatts, holds the option on another 3.8, takes exclusivity across the whole site, and puts $1.5 billion of equity into SB Energy. Inside the numbers, what dropped from the July talks, and why the mechanism now looks like Nvidia's operating model rather than a one-off.",
  openGraph: {
    title:
      'The $250B Nvidia Guarantee Talks Shipped as $105B. The Shadow Bank Now Has a Signed Contract.',
    description:
      'The July leak was $250B on 10 gigawatts. The signed deal is $105B on 4.25 gigawatts plus an option, a 20 year OpenAI lease, a $1.5B Nvidia equity check into SB Energy, and exclusive AI compute rights across the whole campus. The mechanism is now operating model, not one off.',
    type: 'article',
    publishedTime: '2026-08-18T14:00:00Z',
    authors: ['Marcus Chen'],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Nvidia Signs the Ohio Guarantee. $105B, 4.25 GW, Exclusivity.',
    description:
      'The July talks landed. Residual value guaranty on 4.25 gigawatts, option on 3.8 more, 20 year OpenAI lease, $1.5B Nvidia equity into SB Energy, and exclusive Nvidia AI compute across the site.',
  },
};

export default function Nvidia105BOpenAIOhioGuaranteeShippedPage() {
  return (
    <article className="max-w-3xl mx-auto px-4 sm:px-6 py-10">
      <ArticleJsonLd
        title="The $250B Nvidia Guarantee Talks Shipped as $105B. The Shadow Bank Now Has a Signed Contract."
        description="On August 17, 2026, Nvidia signed a residual value guaranty of up to $105 billion behind the 4.25 GW first phase of the PORTS-Pike Ohio campus, with an option on another 3.8 GW, plus $1.5B equity into SB Energy and exclusive AI compute rights across all 8 GW."
        datePublished="2026-08-18"
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

      {/* Hero (graphic mode: bank vault green to Nvidia green) */}
      <ArticleHero
        mode="graphic"
        icon={Landmark}
        gradientFrom="#0a1f0a"
        gradientTo="#76B900"
        eyebrow="Markets &middot; AI Infrastructure"
      />

      {/* Header */}
      <header className="mb-10">
        <h1 className="text-3xl sm:text-4xl font-bold text-text-primary mb-4 leading-tight">
          The $250B Nvidia Guarantee Talks Shipped as $105B. The Shadow Bank Now Has a Signed Contract.
        </h1>
        <div className="flex items-center gap-3 text-sm text-text-muted">
          <span className="text-text-secondary font-medium">Marcus Chen</span>
          <span>&middot;</span>
          <time dateTime="2026-08-18">August 18, 2026</time>
          <span>&middot;</span>
          <span className="flex items-center gap-1">
            <Clock className="w-3.5 h-3.5" />
            6 min read
          </span>
        </div>
      </header>

      <ShareBar
        path="/originals/nvidia-105b-openai-ohio-guarantee-shipped"
        title="The $250B Nvidia Guarantee Talks Shipped as $105B. The Shadow Bank Now Has a Signed Contract."
      />

      {/* Article body */}
      <div className="prose-custom space-y-6 text-lg text-text-primary leading-relaxed">
        <p className="text-lg text-text-primary leading-relaxed">
          On Monday, August 17, 2026, the leak became a contract. Nvidia, OpenAI, and
          SoftBank finalized the residual value guaranty behind the PORTS-Pike Technology
          Campus in Pike County, Ohio, and disclosed it through an 8-K the same afternoon.
          The signed number is up to $105 billion of Nvidia backing on the first 4.25
          gigawatts of IT load, with an option on the remaining 3.8 gigawatts at
          Nvidia&apos;s sole discretion. SB Energy, the SoftBank subsidiary, builds, owns,
          and operates the site under a 20 year OpenAI lease. Nvidia writes a $1.5 billion
          equity check directly into SB Energy and becomes the exclusive AI compute
          infrastructure provider across the entire 8 gigawatt footprint. First capacity
          comes online in 2028.
        </p>

        <p>
          We covered the leak in{' '}
          <Link
            href="/originals/nvidia-250b-guarantee-credit-rating-rental"
            className="text-accent-primary hover:underline"
          >
            late July
          </Link>
          , when the Wall Street Journal and Bloomberg put the talks near $250 billion on
          a 10 gigawatt project. The signed shape is smaller, tighter, and structurally
          more specific. It is also the second of two Nvidia disclosures inside eight days
          that make the same point. This is no longer a talk. This is the operating model.
        </p>

        <h2 className="text-2xl font-semibold text-text-primary pt-4">What Actually Got Signed</h2>

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
                <td className="px-4 py-3 text-accent-primary font-medium">Nvidia guaranty ceiling</td>
                <td className="px-4 py-3 font-mono">Up to $105B</td>
                <td className="px-4 py-3">Initial commitment, contingent on OpenAI default or insolvency</td>
              </tr>
              <tr>
                <td className="px-4 py-3 text-accent-primary font-medium">Guaranteed IT load</td>
                <td className="px-4 py-3 font-mono">4.25 GW</td>
                <td className="px-4 py-3">Plus option on ~3.8 GW more at Nvidia&apos;s discretion</td>
              </tr>
              <tr>
                <td className="px-4 py-3 text-accent-primary font-medium">Full campus capacity</td>
                <td className="px-4 py-3 font-mono">8 GW</td>
                <td className="px-4 py-3">Largest single AI campus ever announced</td>
              </tr>
              <tr>
                <td className="px-4 py-3 text-accent-primary font-medium">OpenAI lease term</td>
                <td className="px-4 py-3 font-mono">20 years</td>
                <td className="px-4 py-3">Payments start as capacity comes available, not on signing</td>
              </tr>
              <tr>
                <td className="px-4 py-3 text-accent-primary font-medium">Nvidia equity into SB Energy</td>
                <td className="px-4 py-3 font-mono">$1.5B</td>
                <td className="px-4 py-3">Joins SoftBank and OpenAI on the SB Energy cap table</td>
              </tr>
              <tr>
                <td className="px-4 py-3 text-accent-primary font-medium">Nvidia AI compute exclusivity</td>
                <td className="px-4 py-3 font-mono">All 8 GW</td>
                <td className="px-4 py-3">No other accelerator vendor gets rack space on the campus</td>
              </tr>
              <tr>
                <td className="px-4 py-3 text-accent-primary font-medium">First capacity online</td>
                <td className="px-4 py-3 font-mono">2028</td>
                <td className="px-4 py-3">Phased ramp, PORTS-Pike site is a former uranium enrichment plant</td>
              </tr>
              <tr>
                <td className="px-4 py-3 text-accent-primary font-medium">SB Energy regional grid commit</td>
                <td className="px-4 py-3 font-mono">$4.2B</td>
                <td className="px-4 py-3">Toward the ~10 GW of generation the site will pull</td>
              </tr>
            </tbody>
          </table>
        </div>

        <p>
          The instrument is called a residual value guaranty. Nvidia is not writing a
          check on day one. Nvidia is promising SB Energy and its lenders that if OpenAI
          walks away from the lease or files, Nvidia covers a defined portion of the
          shortfall on lease and power payments, and it stands behind a minimum value for
          the underlying real estate and shell infrastructure. No cash out the door today.
          A footnote until it triggers. Uncapped only in the specific sense that the
          triggered obligation is whatever the contract says, capped in the general sense
          that the ceiling on the initial phase is the disclosed $105 billion.
        </p>

        <h2 className="text-2xl font-semibold text-text-primary pt-4">What Dropped From the July Talks</h2>

        <p>
          Three things moved. The topline came in at $105 billion for the initial phase
          instead of the $250 billion Bloomberg had floated across the full 10 gigawatt
          basket. The scope tightened from 10 gigawatts to 8, with the guaranty attaching
          to 4.25 up front and the rest sitting behind an Nvidia option. The exposure is
          now explicitly phased, tied to specific gigawatts, and gated on OpenAI actually
          taking delivery.
        </p>

        <p>
          The second move is what got added. The July talks were about credit support. The
          signed deal packages the credit support with equity in the counterparty (the
          $1.5 billion Nvidia check into SB Energy), exclusivity on the compute side (only
          Nvidia silicon lands in the racks), and a 20 year OpenAI lease shape that makes
          SB Energy&apos;s revenue schedule roughly co-terminous with Nvidia&apos;s
          contingent obligation. Nvidia is not just underwriting the tail risk. Nvidia is
          the customer of the customer, the shareholder of the landlord, and the sole
          silicon vendor on the site. Every dollar SB Energy collects from OpenAI passes
          through a schedule Nvidia is on both sides of.
        </p>

        <p>
          The third move is what did not get added, and it matters. The July talks had a
          separate line for up to $350 billion of chip purchase financing sitting on top
          of the Ohio number. That line is not in the 8-K. The market read of the signed
          deal versus the leak should not be that Nvidia backed off. It should be that
          Nvidia disaggregated. Chip financing lives in its own instrument now, presumably
          routed through the $500 billion third party platform Nvidia announced with
          Apollo, BlackRock, Blackstone, Brookfield, Goldman Sachs, and KKR on August 10.
          The Ohio guaranty covers the real estate and power stack. The silicon gets
          financed on its own paper by outside investors, off Nvidia&apos;s balance sheet.
        </p>

        <h2 className="text-2xl font-semibold text-text-primary pt-4">The Residual Value Guaranty as a Product</h2>

        <p>
          A residual value guaranty is a specific object in corporate finance and it is
          worth pinning down. When a company leases something (an aircraft, a fleet of
          trucks, a data center shell), the lender behind the lease worries about two
          things. One, will the tenant pay every month for the term. Two, will there be
          anything worth foreclosing on if the tenant does not. A residual guaranty from a
          third party addresses the second worry directly. The guarantor promises that if
          the tenant defaults and the lender has to seize and sell the asset, the sale
          will clear a minimum defined value, and the guarantor makes up the difference.
        </p>

        <p>
          The lender then rates the debt as if that minimum were the actual recovery
          value. That lets the debt price at rates a hyperscaler campus with a single
          startup tenant would not otherwise clear. The tenant gets cheaper capital. The
          landlord gets a bankable project. The guarantor gets exclusivity, board seats,
          and a chair at the negotiating table for every future phase. In this deal, the
          guarantor is a company with a $4 trillion market cap and a 75 percent gross
          margin, and the tenant is a private AI lab that lost roughly $12 billion in the
          first half of 2026 and is filing to go public into a rate environment that has
          not blessed a $500 billion IPO in living memory.
        </p>

        <p>
          Read that sentence twice. This is Nvidia lending its balance sheet to make
          OpenAI&apos;s pre-IPO capital stack financeable. The Bloomberg framing, of a
          chip vendor becoming a shadow bank, is not a metaphor any more. The 8-K is the
          license.
        </p>

        <h2 className="text-2xl font-semibold text-text-primary pt-4">The August 10 Frame</h2>

        <p>
          Eight days before Ohio signed, Nvidia announced memorandums with six of the
          largest infrastructure investors on the planet to establish separate compute
          financing platforms sized to mobilize over $500 billion of third party capital.
          The six are Apollo, BlackRock, Blackstone, Brookfield, Goldman Sachs, and KKR.
          Each runs its own platform under its own underwriting, and Nvidia sits alongside
          rather than on the balance sheet. That is the vehicle. Ohio is the first
          publicly disclosed use case.
        </p>

        <p>
          The two announcements read as one architecture. The $500 billion platform
          finances the silicon. The Ohio guaranty backstops the real estate and power
          stack. Nvidia takes the equity in the operating counterparty, locks exclusivity
          across the site, and keeps the cash side of the balance sheet clean. This is
          not a scrambling response to OpenAI&apos;s capital needs. This is a
          purpose-built rail for financing AI infrastructure at frontier lab scale,
          designed to route around the constraint that no single hyperscaler is willing to
          put a half trillion dollar buildout on its own books.
        </p>

        <p>
          The other frontier labs are not on this rail yet. Anthropic pre-bought its
          compute inside Google&apos;s balance sheet on the{' '}
          <Link href="/originals/anthropic-200b-google-tpu-math" className="text-accent-primary hover:underline">
            $200 billion TPU deal we covered in May
          </Link>
          , which is a fundamentally different instrument (a supply agreement, not a
          guaranty). xAI runs its capex through Elon&apos;s own leverage. Meta funds
          out of Meta&apos;s operating cash flow. What is emerging in the Nvidia model is
          the first vertically integrated compute financing stack that operates
          independently of any single hyperscaler&apos;s treasury, which is exactly what
          you would build if you thought the next $2 trillion of AI capex was going to be
          bigger than any one hyperscaler is willing to write.
        </p>

        <h2 className="text-2xl font-semibold text-text-primary pt-4">What Repriced</h2>

        <p>
          Nvidia&apos;s five year CDS was already at a record 82 basis points after the
          July leak. It moved another few basis points wider on the Monday session, though
          well inside the July jump. The stock closed roughly flat on the announcement, in
          contrast to the 6 percent two session drop that followed the leak. The
          disclosure at $105 billion instead of $250 billion, and the explicit contingent
          language (payments trigger only on OpenAI default or insolvency), gave the
          equity desks something concrete to plug into a model, which is usually what
          calms an equity move faster than a credit move.
        </p>

        <p>
          But the credit market&apos;s repricing of Nvidia is now a settled fact rather
          than a one day event. Nvidia five year protection costs more than Alphabet&apos;s
          again on the print. A company with $215.9 billion of trailing revenue and 75
          percent gross margins is now priced by lenders as if its default probability
          were meaningfully higher than a company that runs the search monopoly. Nothing
          about the operating business changed this week. What changed is the set of
          promises attached to it, and the credit market is telling you that the promises
          are big enough to matter.
        </p>

        <h2 className="text-2xl font-semibold text-text-primary pt-4">Our Take</h2>

        <p>
          The signed number is smaller than the leak. That is a headline. The mechanism
          is the story. Nvidia has now paired a $500 billion off balance sheet financing
          platform with a $105 billion contingent guaranty and $1.5 billion of direct
          equity into the operating counterparty on the first publicly disclosed use case,
          all inside eight days. The company is not just selling chips into the AI
          buildout. It is underwriting the buildout&apos;s counterparty risk, financing
          its silicon through third party capital, and taking equity in the landlord that
          houses the racks. That is a fully vertically integrated compute finance stack,
          run by the vendor with the biggest gross margin in the industry, and it looks a
          lot more like how a national infrastructure bank operates than how a chip
          company usually does.
        </p>

        <p>
          Second order for OpenAI: the IPO math just got easier. A 20 year lease on 8
          gigawatts of Nvidia backed capacity is exactly the kind of contracted supply
          number a $500 billion filing needs to justify its revenue trajectory, and the
          contingent structure means OpenAI itself does not have to raise the capital that
          the campus consumes. We covered the{' '}
          <Link href="/originals/openai-ipo-filing-anthropic-first-profit" className="text-accent-primary hover:underline">
            confidential S-1 dynamics
          </Link>{' '}
          last month. The Ohio signing is the compute footnote that turns those dynamics
          into a plausible story an underwriter can pitch.
        </p>

        <p>
          Second order for the rest of the industry: every other frontier lab now has to
          decide whether to compete for a chair on Nvidia&apos;s rail or build a rival
          one. Google has an in-house rail (TPU capex on Alphabet&apos;s balance sheet).
          Amazon has Trainium and a hyperscaler treasury. The interesting question is
          Anthropic, which sits on Google&apos;s TPU compute today but takes AWS Trainium
          and Nvidia GPUs from multiple sources on the side. If Anthropic ever wants a
          purpose built campus with Nvidia silicon at the scale OpenAI just secured, the
          rail exists. The price of admission is exclusivity on the compute side, which
          Anthropic has historically declined to give any single vendor.
        </p>

        <p>
          Three signposts to watch. One, whether the option on the remaining 3.8
          gigawatts gets exercised inside 12 months (fast exercise means Nvidia is
          confident in OpenAI&apos;s revenue ramp, slow exercise means Nvidia wants a
          second data point on default probability first). Two, whether the second
          publicly disclosed use of the $500 billion platform surfaces a non OpenAI lab,
          and if so which one, because that will tell you whether this rail is a
          purpose-built OpenAI vehicle or an actual industry-wide instrument. Three,
          whether Nvidia&apos;s next 10-Q discloses the guaranty as a specific line item
          under contingent liabilities or buries it in footnote aggregate, because the SEC
          has been asking pointed questions about off balance sheet AI exposure since the
          spring.
        </p>

        <p>
          We are tracking the deal cadence on{' '}
          <Link href="/providers/openai" className="text-accent-primary hover:underline">
            our OpenAI provider page
          </Link>{' '}
          and the Nvidia side on{' '}
          <Link href="/providers/nvidia" className="text-accent-primary hover:underline">
            the Nvidia page
          </Link>
          . Next data point to watch: whether the SB Energy 8-K adds any covenant language
          around minimum utilization or take-or-pay floors that turn the OpenAI lease from
          a soft commitment into a hard one. The shape of that language will decide
          whether the Ohio deal is a lease or, in economic substance, a debt instrument
          Nvidia just co-signed.
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
            <span className="text-text-primary text-sm">Nvidia Stopped Buying Into OpenAI. It Started Renting Out Its Credit Rating.</span>
          </Link>
          <Link
            href="/originals/nvidia-40b-equity-customer-investor-loop"
            className="block bg-bg-secondary border border-border rounded-lg px-4 py-3 hover:border-accent-primary transition-colors"
          >
            <span className="text-text-primary text-sm">Nvidia Just Crossed $40 Billion in AI Equity Bets. The Customer-Investor Loop Is the Real Moat.</span>
          </Link>
          <Link
            href="/originals/anthropic-200b-google-tpu-math"
            className="block bg-bg-secondary border border-border rounded-lg px-4 py-3 hover:border-accent-primary transition-colors"
          >
            <span className="text-text-primary text-sm">Anthropic&apos;s $200B Compute Bill Is Bigger Than Its Revenue. The Google TPU Deal in Numbers.</span>
          </Link>
          <Link
            href="/originals/openai-ipo-filing-anthropic-first-profit"
            className="block bg-bg-secondary border border-border rounded-lg px-4 py-3 hover:border-accent-primary transition-colors"
          >
            <span className="text-text-primary text-sm">OpenAI Filed for a Trillion-Dollar IPO. The Same Week Anthropic Booked Its First Profit.</span>
          </Link>
        </div>
      </footer>

      {/* Ad slot */}
      <div className="mt-12">
        <AdPlaceholder format="horizontal" />
      </div>

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
