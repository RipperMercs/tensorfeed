import { Metadata } from 'next';
import Link from 'next/link';
import { ArrowLeft, Clock, ShieldAlert } from 'lucide-react';
import { ArticleJsonLd } from '@/components/seo/JsonLd';
import ArticleHero from '@/components/originals/ArticleHero';
import ShareBar from '@/components/originals/ShareBar';

export const metadata: Metadata = {
  alternates: {
    canonical: 'https://tensorfeed.ai/originals/nvidia-250b-guarantee-credit-rating-rental',
  },
  title: 'Nvidia Stopped Buying Into OpenAI. It Started Renting Out Its Credit Rating.',
  description:
    "Nvidia is in talks to guarantee about $250 billion of debt on OpenAI's Ohio campus, plus roughly $350 billion of chip financing. A guarantee is not an investment. Nvidia's own credit default swaps hit a record 82 basis points within hours, which is the market telling you exactly what changed.",
  openGraph: {
    title: 'Nvidia Stopped Buying Into OpenAI. It Started Renting Out Its Credit Rating.',
    description:
      'The $250 billion Ohio guarantee is a different instrument than the equity stakes that came before it. Uncapped downside, no cash out the door, and a CDS market that repriced Nvidia in a single session.',
    type: 'article',
    publishedTime: '2026-07-28T11:00:00Z',
    authors: ['Kira Nolan'],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Nvidia Stopped Buying Into OpenAI. It Started Renting Out Its Credit Rating.',
    description:
      "A $250B guarantee costs nothing on day one and caps nothing on the downside. Nvidia's five-year CDS hit a record 82bp the day it leaked.",
  },
};

export default function NvidiaGuaranteeCreditRatingRentalPage() {
  return (
    <article className="max-w-3xl mx-auto px-4 sm:px-6 py-10">
      <ArticleJsonLd
        title="Nvidia Stopped Buying Into OpenAI. It Started Renting Out Its Credit Rating."
        description="Nvidia is in talks to guarantee roughly $250 billion of debt behind OpenAI's Ohio data center campus and to finance up to $350 billion of chip purchases. A guarantee is a contingent liability with uncapped downside, and the credit market repriced Nvidia within hours."
        datePublished="2026-07-28"
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
          Nvidia Stopped Buying Into OpenAI. It Started Renting Out Its Credit Rating.
        </h1>
        <div className="flex items-center gap-3 text-sm text-text-muted">
          <span className="text-text-secondary font-medium">Kira Nolan</span>
          <span>&middot;</span>
          <time dateTime="2026-07-28">July 28, 2026</time>
          <span>&middot;</span>
          <span className="flex items-center gap-1">
            <Clock className="w-3.5 h-3.5" />7 min read
          </span>
        </div>
      </header>

      <ShareBar
        path="/originals/nvidia-250b-guarantee-credit-rating-rental"
        title="Nvidia Stopped Buying Into OpenAI. It Started Renting Out Its Credit Rating."
      />

      <ArticleHero
        mode="graphic"
        icon={ShieldAlert}
        gradientFrom="#3f1d38"
        gradientTo="#0f172a"
        eyebrow="Contingent liability"
        caption="Nvidia is reportedly in talks to guarantee about $250 billion of debt behind OpenAI's planned 10 gigawatt campus in Piketon, Ohio. Its five-year CDS hit a record 82 basis points on July 27, 2026."
      />

      {/* Article body */}
      <div className="prose-custom space-y-6 text-lg text-text-primary leading-relaxed">
        <p>
          The Wall Street Journal reported on Sunday, and Bloomberg confirmed on Monday, that Nvidia
          is in talks to guarantee roughly $250 billion of financing behind OpenAI&apos;s planned
          data center campus in Piketon, Ohio. Ten gigawatts, developed by SoftBank&apos;s energy
          arm, first phase around 800 megawatts targeted for 2028, total project cost plausibly north
          of half a trillion dollars once you count the silicon. Separately, Nvidia is discussing
          financing as much as $350 billion of the chips that go inside it. Bloomberg put the full
          basket of arrangements above $750 billion.
        </p>

        <p>
          Most of the coverage filed this under circular financing, which is the same headline we
          have been running on Nvidia deals since last year and is not wrong. It is just not
          specific. The number changed, sure. The instrument changed too, and that is the part worth
          your attention.
        </p>

        <h2 className="text-2xl font-semibold text-text-primary pt-4">
          A Guarantee Is Not an Investment
        </h2>

        <p>
          When we wrote about Nvidia crossing $40 billion in AI equity commitments back in May, every
          one of those deals had the same shape: cash leaves Nvidia, an asset arrives on the balance
          sheet, and the worst case is that the asset goes to zero. Painful, bounded, disclosed. You
          can look up what Nvidia paid for its OpenAI stake and know the maximum loss.
        </p>

        <p>
          A guarantee does not work that way. No cash moves on signing. Nothing shows up as an
          expense. Nvidia does not own anything new. What it has done instead is promise lenders
          that if OpenAI cannot service the debt on a building it is leasing, Nvidia will. The
          exposure is contingent, it is off the balance sheet until it is triggered, and the ceiling
          on it is whatever the underlying obligation grows to. That is a fundamentally different
          risk object than a stock certificate.
        </p>

        <div className="bg-bg-secondary border border-border rounded-lg overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border">
                <th className="text-left px-4 py-3 text-text-primary font-semibold">Instrument</th>
                <th className="text-left px-4 py-3 text-text-primary font-semibold">Cash out day one</th>
                <th className="text-left px-4 py-3 text-text-primary font-semibold">Where it sits</th>
                <th className="text-left px-4 py-3 text-text-primary font-semibold">Maximum loss</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              <tr>
                <td className="px-4 py-3 text-text-primary font-medium">Equity stake</td>
                <td className="px-4 py-3 font-mono">Full amount</td>
                <td className="px-4 py-3">Assets, marked</td>
                <td className="px-4 py-3">What you paid</td>
              </tr>
              <tr>
                <td className="px-4 py-3 text-text-primary font-medium">Vendor loan</td>
                <td className="px-4 py-3 font-mono">Full amount</td>
                <td className="px-4 py-3">Receivable</td>
                <td className="px-4 py-3">Principal plus interest</td>
              </tr>
              <tr>
                <td className="px-4 py-3 text-accent-primary font-medium">Guarantee</td>
                <td className="px-4 py-3 font-mono">Zero</td>
                <td className="px-4 py-3">Footnote, until triggered</td>
                <td className="px-4 py-3">The whole obligation</td>
              </tr>
            </tbody>
          </table>
        </div>

        <p>
          Read the last row again. The instrument with the largest downside is the one that costs
          nothing today and lives in a footnote. That combination is not a scandal by itself, plenty
          of ordinary corporate finance runs on guarantees, but it does mean the usual quick checks
          people apply to these deals stop working. You cannot spot it in cash flow from investing.
          It does not dent free cash flow. It will not compress reported margins. If you were
          tracking Nvidia&apos;s customer exposure by watching what it spends, you just went blind.
        </p>

        <h2 className="text-2xl font-semibold text-text-primary pt-4">
          The Credit Market Was Not Blind
        </h2>

        <p>
          Here is the number that made this a story rather than another Sunday leak. Nvidia&apos;s
          five-year credit default swap, the contract that pays out if Nvidia itself defaults, jumped
          to a record 82 basis points on Monday. That was the biggest single-day move since the
          contract started trading actively in November 2025. The stock fell about 6 percent across
          two sessions, which got the headlines, but equity moves for a dozen reasons on any given
          Monday. CDS moves for one.
        </p>

        <p>
          Nvidia&apos;s default protection now costs more than Alphabet&apos;s. Sit with that. This
          is a company that did $215.9 billion of revenue in fiscal 2026, printed $81.6 billion in a
          single quarter, generated $50.3 billion of operating cash flow in that quarter, and carries
          gross margins near 75 percent. On the fundamentals nothing about Nvidia got riskier this
          week. What got riskier is the set of promises attached to it.
        </p>

        <div className="bg-bg-secondary border border-border rounded-lg overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border">
                <th className="text-left px-4 py-3 text-text-primary font-semibold">Exposure</th>
                <th className="text-left px-4 py-3 text-text-primary font-semibold">Reported size</th>
                <th className="text-left px-4 py-3 text-text-primary font-semibold">Form</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              <tr>
                <td className="px-4 py-3 text-accent-primary font-medium">Ohio campus lease and debt</td>
                <td className="px-4 py-3 font-mono">~$250B</td>
                <td className="px-4 py-3">Guarantee, in talks</td>
              </tr>
              <tr>
                <td className="px-4 py-3 text-accent-primary font-medium">Chip purchase financing</td>
                <td className="px-4 py-3 font-mono">Up to ~$350B</td>
                <td className="px-4 py-3">Financing, in talks</td>
              </tr>
              <tr>
                <td className="px-4 py-3 text-text-primary font-medium">Prior OpenAI commitment</td>
                <td className="px-4 py-3 font-mono">~$30B</td>
                <td className="px-4 py-3">Equity, trimmed from $100B</td>
              </tr>
              <tr>
                <td className="px-4 py-3 text-text-primary font-medium">Other 2026 AI equity</td>
                <td className="px-4 py-3 font-mono">$40B+</td>
                <td className="px-4 py-3">Equity, dozens of names</td>
              </tr>
            </tbody>
          </table>
        </div>

        <p>
          Nothing in the top two rows is signed. Terms are unsettled and the whole package could
          shrink or die, the way the original $100 billion OpenAI number quietly became something
          closer to $30 billion. But the CDS market does not wait for a signature to reprice a tail.
        </p>

        <h2 className="text-2xl font-semibold text-text-primary pt-4">Why a Guarantee at All</h2>

        <p>
          This is the question that answers itself, and the answer is the actual news.
        </p>

        <p>
          OpenAI has no investment-grade credit rating. On the numbers most widely circulated it is
          losing something near $14 billion this year against roughly $25 billion of revenue. A
          lender being asked to fund a multi-decade lease on a 10 gigawatt campus in southern Ohio,
          against a tenant with those financials and a product cycle measured in months, is being
          asked to underwrite a very long asset with a very short view of the borrower.
        </p>

        <p>
          The guarantee exists because that underwriting did not clear on its own. Nvidia&apos;s
          balance sheet is being substituted for a credit rating OpenAI does not have, so the paper
          can be priced against Nvidia&apos;s risk instead of OpenAI&apos;s. That is the entire
          mechanism. Which means the existence of the guarantee is itself a disclosure about what
          the debt market thinks of financing OpenAI unassisted, and it is not flattering.
        </p>

        <p>
          I want to be fair about the counterargument, because there is a real one. Nvidia is not
          guaranteeing a speculative venture with no demand behind it. It is guaranteeing capacity
          for the largest consumer AI product on earth, and if the tokens keep flowing the building
          gets paid for out of revenue that already exists in some form. Structurally this is closer
          to a landlord taking a corporate guarantee from a parent company than to a startup writing
          IOUs. Guarantees mostly do not get called.
        </p>

        <p>
          The problem is correlation. The scenario where OpenAI cannot pay its Ohio lease is not an
          isolated tenant problem. It is a scenario where AI demand disappointed badly enough to
          break the biggest name in the category, which is the same scenario where Nvidia&apos;s
          order book collapses, its equity stakes in a dozen AI companies mark down together, and it
          would very much prefer not to be writing a check on someone else&apos;s building. The
          guarantee pays out precisely when Nvidia can least afford it. That is what the CDS is
          pricing, and the CDS is right to price it.
        </p>

        <h2 className="text-2xl font-semibold text-text-primary pt-4">Our Take</h2>

        <p>
          The circular financing frame has been load-bearing for a year and it is starting to sag.
          Calling equity stakes, warrants, prepayments, and now credit guarantees all the same thing
          because money moves in a loop tells you almost nothing. What matters is who holds the
          downside and how it is disclosed, and on both counts a guarantee is the most aggressive
          structure anyone in this cycle has proposed.
        </p>

        <p>
          It also marks a shift in what Nvidia is selling. Compute vendors used to compete on chips,
          then on rack-scale systems, then on software stacks, and now the frontier of the
          competition is the ability to make a customer bankable. AMD put $5 billion into Anthropic
          in milestone-gated cash with no warrants, and we called that the cleanest deal in the
          market. That view holds up better every week. Nvidia is playing a different game with a
          much bigger balance sheet, and the price of the game just showed up in its own credit
          spread.
        </p>

        <p>
          Three things worth watching. Whether any of this gets signed at the reported size or shrinks
          on the way to a term sheet, since the $100 billion to $30 billion precedent suggests leaks
          run hot. Whether Nvidia discloses guarantee exposure as a named line item in its next 10-Q
          or leaves it in commitments and contingencies, because that choice tells you how the
          company itself is classifying the risk. And whether the CDS holds above the pre-leak level
          after the initial reaction fades, which is the cleanest available read on whether credit
          investors think this is a headline or a repricing.
        </p>

        <p>
          Nvidia spent 2026 turning its cash into stakes in its own customers. The Ohio deal is a
          different trade. It is lending out the one asset that cannot be diversified, and the market
          charged it for the privilege the same afternoon.
        </p>
      </div>

      {/* Related */}
      <footer className="mt-12 pt-8 border-t border-border">
        <h2 className="text-lg font-semibold text-text-primary mb-4">Related</h2>
        <div className="grid gap-3">
          <Link
            href="/originals/nvidia-40b-equity-customer-investor-loop"
            className="block bg-bg-secondary border border-border rounded-lg px-4 py-3 hover:border-accent-primary transition-colors"
          >
            <span className="text-text-primary text-sm">
              Nvidia Just Crossed $40 Billion in AI Equity Bets. The Customer-Investor Loop Is the
              Real Moat.
            </span>
          </Link>
          <Link
            href="/originals/amd-anthropic-2gw-mi450-fifth-vendor"
            className="block bg-bg-secondary border border-border rounded-lg px-4 py-3 hover:border-accent-primary transition-colors"
          >
            <span className="text-text-primary text-sm">AMD Put $5 Billion Into Anthropic for 2 Gigawatts of MI450. The Fifth Compute Vendor Comes With a ROCm Engineering Team Attached.</span>
          </Link>
          <Link
            href="/originals/hyperscaler-earnings-week-backlog-defense"
            className="block bg-bg-secondary border border-border rounded-lg px-4 py-3 hover:border-accent-primary transition-colors"
          >
            <span className="text-text-primary text-sm">
              Alphabet Gave the Perfect AI Quarter and the Stock Fell. Free Cash Flow Went Negative
              for the First Time.
            </span>
          </Link>
          <Link
            href="/originals/ai-capex-bubble-debate-scoreboard"
            className="block bg-bg-secondary border border-border rounded-lg px-4 py-3 hover:border-accent-primary transition-colors"
          >
            <span className="text-text-primary text-sm">The AI Capex Bubble Debate: A Scoreboard</span>
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
