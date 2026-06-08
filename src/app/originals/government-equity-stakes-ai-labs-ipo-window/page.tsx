import { Metadata } from 'next';
import Link from 'next/link';
import { ArrowLeft, Clock } from 'lucide-react';
import { ArticleJsonLd } from '@/components/seo/JsonLd';

import ShareBar from '@/components/originals/ShareBar';
export const metadata: Metadata = {
  alternates: { canonical: 'https://tensorfeed.ai/originals/government-equity-stakes-ai-labs-ipo-window' },
  title: 'Trump and Sanders Now Want the Same Thing: Government Equity in the AI Labs. The Timing Is the Story.',
  description:
    'On June 6 Trump told reporters the US government may take direct equity stakes in OpenAI, Anthropic, and xAI, days after Bernie Sanders proposed a one-time 50% stock tax on the same three companies. Sam Altman has been privately pitching a donated-equity Public Wealth Fund to the White House since early 2025. All of this is landing inside a five-month window where SpaceX, OpenAI, and Anthropic are trying to go public. The convergence is real, the odds of passage are low, and the IPO risk factors just got longer.',
  openGraph: {
    title: 'Trump and Sanders Now Want the Same Thing: Government Equity in the AI Labs. The Timing Is the Story.',
    description:
      'Washington just converged from both poles on public ownership of frontier AI, right as SpaceX, OpenAI, and Anthropic line up to go public. What is actually on the table and what it does to the IPO window.',
    type: 'article',
    publishedTime: '2026-06-07T10:00:00Z',
    authors: ['Kira Nolan'],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Trump and Sanders Now Want the Same Thing: Government Equity in the AI Labs.',
    description:
      'Washington converged from both poles on public ownership of frontier AI, right as SpaceX, OpenAI, and Anthropic line up to go public.',
  },
};

export default function GovernmentEquityStakesAILabsIPOWindowPage() {
  return (
    <article className="max-w-3xl mx-auto px-4 sm:px-6 py-10">
      <ArticleJsonLd
        title="Trump and Sanders Now Want the Same Thing: Government Equity in the AI Labs. The Timing Is the Story."
        description="On June 6 Trump endorsed direct government equity stakes in OpenAI, Anthropic, and xAI, days after Sanders proposed a one-time 50% stock tax on the same three companies. Sam Altman has been privately pitching a donated-equity Public Wealth Fund since early 2025. All of it lands inside the SpaceX, OpenAI, and Anthropic IPO window."
        datePublished="2026-06-07"
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
          Trump and Sanders Now Want the Same Thing: Government Equity in the AI Labs. The Timing Is the Story.
        </h1>
        <div className="flex items-center gap-3 text-sm text-text-muted">
          <span className="text-text-secondary font-medium">Kira Nolan</span>
          <span>&middot;</span>
          <time dateTime="2026-06-07">June 7, 2026</time>
          <span>&middot;</span>
          <span className="flex items-center gap-1">
            <Clock className="w-3.5 h-3.5" />
            7 min read
          </span>
        </div>
      </header>

      <ShareBar
        path="/originals/government-equity-stakes-ai-labs-ipo-window"
        title="Trump and Sanders Now Want the Same Thing: Government Equity in the AI Labs. The Timing Is the Story."
      />
      {/* Article body */}
      <div className="prose-custom space-y-6 text-text-secondary leading-relaxed">
        <p className="text-lg text-text-primary leading-relaxed">
          On Friday, June 6, President Trump told reporters the US government may take direct
          equity stakes in AI companies like OpenAI, Anthropic, and xAI. &quot;You make them a
          partnership in this revolution,&quot; he said. &quot;It would be a beautiful thing.&quot;
          That came days after Bernie Sanders published a New York Times op-ed calling for a 50
          percent public ownership stake in the same companies. The most prominent democratic
          socialist in the Senate and a Republican president who ran on deregulation are now
          describing the same policy outcome in different vocabularies.
        </p>

        <p>
          The convergence is strange enough on its own. What makes it a story I have to write this
          weekend is the calendar underneath it. SpaceX prices the largest IPO in history on
          Thursday. Anthropic{' '}
          <Link href="/originals/anthropic-confidential-s1-ipo" className="text-accent-primary hover:underline">
            confidentially filed its S-1
          </Link>{' '}
          on June 1 at a $965 billion private valuation. OpenAI is finalizing its own confidential
          filing with Goldman Sachs and Morgan Stanley for a September window. Washington decided
          to start a public conversation about owning pieces of these companies in the exact five
          months they are all trying to sell shares to everyone else.
        </p>

        <h2 className="text-2xl font-semibold text-text-primary pt-4">What Is Actually on the Table</h2>

        <p>
          There are three distinct proposals circulating, and they get conflated constantly. They
          should not be, because they differ by an order of magnitude.
        </p>

        <p>
          The Sanders version is the most aggressive. His American AI Sovereign Wealth Fund Act,
          which followed the op-ed and has not yet been formally introduced as of this writing,
          proposes a one-time 50 percent tax on frontier AI companies, paid in stock rather than
          cash. The collected shares would sit in a federal sovereign wealth fund with voting
          rights, board representation at each company, and eventual dividend distributions to the
          public. His stated justification: the models were trained on the creative output of
          millions of people who were never asked and never paid, so the public should hold the
          upside.
        </p>

        <p>
          The Trump version is vaguer and, for that reason, harder to price. Senior administration
          officials have held preliminary discussions about government shares in AI firms, per
          reporting from NOTUS confirmed by CNBC and others. Friday&apos;s comments are the first
          time the president endorsed the concept on camera. No mechanism, no percentage, no
          legislation. Just a stated openness to the idea from the executive branch that would have
          to implement it.
        </p>

        <p>
          The third version is the one the market should study, because it came from inside the
          building. Sam Altman has been pitching a government equity concept to the Trump
          administration since early 2025, and revisited it with senior officials this week.
          OpenAI&apos;s own April 2026 policy proposal sketches a &quot;Public Wealth Fund&quot;
          seeded by donated equity. Donated, not taxed. A sliver, not half. Altman&apos;s answer to
          Sanders, who confronted him directly: he cannot support the 50 percent number, but he
          wants to work together on the general idea of public participation.
        </p>

        <div className="bg-bg-secondary border border-border rounded-lg overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border">
                <th className="text-left px-4 py-3 text-text-primary font-semibold">Proposal</th>
                <th className="text-left px-4 py-3 text-text-primary font-semibold">Mechanism</th>
                <th className="text-left px-4 py-3 text-text-primary font-semibold">Size</th>
                <th className="text-left px-4 py-3 text-text-primary font-semibold">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              <tr>
                <td className="px-4 py-3 text-accent-primary font-medium">Sanders bill</td>
                <td className="px-4 py-3">One-time 50% tax paid in stock, to a sovereign wealth fund</td>
                <td className="px-4 py-3 font-mono">50%</td>
                <td className="px-4 py-3">Op-ed plus draft, not formally introduced</td>
              </tr>
              <tr>
                <td className="px-4 py-3 text-accent-primary font-medium">Trump remarks</td>
                <td className="px-4 py-3">Unspecified direct equity stakes</td>
                <td className="px-4 py-3 font-mono">Unstated</td>
                <td className="px-4 py-3">Verbal endorsement, June 6</td>
              </tr>
              <tr>
                <td className="px-4 py-3 text-accent-primary font-medium">OpenAI Public Wealth Fund</td>
                <td className="px-4 py-3">Voluntary donated equity seeding a public fund</td>
                <td className="px-4 py-3 font-mono">Small, undisclosed</td>
                <td className="px-4 py-3">Policy proposal, private talks since early 2025</td>
              </tr>
            </tbody>
          </table>
        </div>

        <p>
          One detail worth flagging: the Sanders bill targets OpenAI, Anthropic, and xAI by
          description, and conspicuously not Google or Meta. The three named companies are
          private and heading to market. The two omitted ones have millions of public shareholders
          who would litigate instantly. That tells you the proposal is aimed at the IPO moment,
          when ownership structures are still wet cement.
        </p>

        <h2 className="text-2xl font-semibold text-text-primary pt-4">This Administration Already Owns Things</h2>

        <p>
          The reflex is to dismiss all of this as theater. I would not. Government equity in
          private companies stopped being hypothetical under this administration a while ago. The
          golden share in US Steel that conditioned the Nippon deal. The roughly 10 percent stake
          in Intel taken in August 2025. The Defense Department&apos;s preferred position in MP
          Materials. Each was unthinkable until it was a term sheet.
        </p>

        <p>
          So when the president muses about partnership stakes in AI labs, the relevant precedent
          class is not campaign rhetoric. It is three executed transactions in eighteen months.
          The mechanics exist, the lawyers have done it before, and the political coalition behind
          it now spans from Bannon (who called voluntary donations &quot;tip money&quot; and wants
          the full 50 percent) to the Vermont left.
        </p>

        <p>
          Anthropic, for what it is worth, is reportedly not participating in any equity
          discussions with the administration. That is a cleaner posture for an S-1 review. It is
          also a riskier one if the political weather keeps moving, because the company that did
          not pre-negotiate is the company that gets terms written for it.
        </p>

        <h2 className="text-2xl font-semibold text-text-primary pt-4">The IPO Window Just Got a New Risk Factor</h2>

        <p>
          Here is the calendar these proposals are landing on.
        </p>

        <div className="bg-bg-secondary border border-border rounded-lg overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border">
                <th className="text-left px-4 py-3 text-text-primary font-semibold">Company</th>
                <th className="text-left px-4 py-3 text-text-primary font-semibold">Valuation</th>
                <th className="text-left px-4 py-3 text-text-primary font-semibold">IPO status</th>
                <th className="text-left px-4 py-3 text-text-primary font-semibold">Named in Sanders bill</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              <tr>
                <td className="px-4 py-3 text-accent-primary font-medium">SpaceX (incl. xAI)</td>
                <td className="px-4 py-3 font-mono">~$1.77T</td>
                <td className="px-4 py-3">Prices June 11, trades June 12 as SPCX</td>
                <td className="px-4 py-3">Yes (xAI)</td>
              </tr>
              <tr>
                <td className="px-4 py-3 text-accent-primary font-medium">OpenAI</td>
                <td className="px-4 py-3 font-mono">$730B to $850B</td>
                <td className="px-4 py-3">Confidential filing in progress, September target</td>
                <td className="px-4 py-3">Yes</td>
              </tr>
              <tr>
                <td className="px-4 py-3 text-accent-primary font-medium">Anthropic</td>
                <td className="px-4 py-3 font-mono">$965B</td>
                <td className="px-4 py-3">Confidential S-1 filed June 1, October window</td>
                <td className="px-4 py-3">Yes</td>
              </tr>
            </tbody>
          </table>
        </div>

        <p>
          An IPO roadshow is a machine for converting uncertainty into a price. Institutional
          buyers will discount anything they cannot model, and &quot;a sitting senator wants half
          your equity while the White House muses about a partnership stake&quot; is close to
          unmodelable. It does not need to pass to cost money. It only needs to sit in the risk
          factors section while the bankers build the book.
        </p>

        <p>
          SpaceX is the immediate test. Its roadshow finished week one on June 6, the same day
          Trump made his comments, and 30 percent of the float is earmarked for retail through
          Robinhood, Fidelity, and Schwab. If SPCX prices at target on Thursday and holds, the
          market is saying it treats all of this as noise. If pricing comes in soft or the
          allocation gets restructured, the September and October filers will read that as a
          political risk premium with a number attached.
        </p>

        <p>
          I wrote two weeks ago that{' '}
          <Link href="/originals/altman-amodei-walk-back-jobs-apocalypse-ipo-pivot" className="text-accent-primary hover:underline">
            Altman and Amodei were softening their AI jobs rhetoric
          </Link>{' '}
          because apocalypse framing is an asset when raising private capital and a liability
          under public-market disclosure rules. The equity-stake conversation is the same dynamic
          from the other direction. Eighteen months of telling Washington that AI will reorder the
          entire economy worked. Washington believed it. And institutions that believe a
          technology will reorder the economy historically do not stay passive shareholders of it.
        </p>

        <h2 className="text-2xl font-semibold text-text-primary pt-4">Why Altman Is Pre-Negotiating</h2>

        <p>
          Read Altman&apos;s position as a hedge, not a concession. If some form of public
          participation in AI upside becomes politically inevitable, the company that designed the
          vehicle gets to set the terms: donated rather than taxed, a sliver rather than half,
          governance-free fund units rather than board seats. A voluntary 2 percent donation that
          defuses the pressure for a legislated 50 percent transfer is the cheapest insurance
          policy in corporate history.
        </p>

        <p>
          It also buys something an S-1 cannot: political cover for the listing itself. OpenAI is
          asking public markets to fund a company that lost money at a negative 122 percent
          operating margin in Q1 while projecting losses through 2029. A populist backlash against
          AI wealth concentration, arriving mid-roadshow, is a real threat to that ask. A Public
          Wealth Fund announcement, arriving mid-roadshow, is a counter-narrative.
        </p>

        <p>
          The cynical read writes itself: both labs spent the spring asking Congress for safety
          regulation they can live with, and now one of them is designing the equity participation
          scheme it can live with. Regulatory capture is when you write the rules. This is a step
          further. This is writing the expropriation.
        </p>

        <h2 className="text-2xl font-semibold text-text-primary pt-4">Our Take</h2>

        <p>
          The near-term odds that either the Sanders bill or a Trump executive action puts real
          government equity in these companies are low. The bill is not introduced, the
          administration has no mechanism, and the IPO timelines are moving faster than the
          legislative calendar. Nothing here changes a filing date this month.
        </p>

        <p>
          But the Overton window does not move back. As of this weekend, public ownership of
          frontier AI labs is a position held simultaneously by the president, the most visible
          senator on the left, the MAGA media flank, and the CEO of the largest lab. Nobody
          prominent is making the opposite case. That is a one-directional ratchet, and every
          future negotiation between these companies and this government (compute permits, export
          rules, federal contracts like the $0.42 GSA deal xAI just signed) now happens with
          equity as a live bargaining chip on the table.
        </p>

        <p>
          Three signposts for the next ninety days. First, whether the Sanders bill gets formally
          introduced with co-sponsors, which converts an op-ed into a CBO-scoreable object.
          Second, whether OpenAI&apos;s eventual public S-1 mentions government equity discussions
          in its risk factors, which it almost certainly must if the talks are material. Third,
          whether Anthropic&apos;s October window slips, which would be the first hard evidence
          that the politics are pricing into the calendar. We will be tracking all three.
        </p>
      </div>

      {/* Related */}
      <footer className="mt-12 pt-8 border-t border-border">
        <h2 className="text-lg font-semibold text-text-primary mb-4">Related</h2>
        <div className="grid gap-3">
          <Link
            href="/originals/anthropic-confidential-s1-ipo"
            className="block bg-bg-secondary border border-border rounded-lg px-4 py-3 hover:border-accent-primary transition-colors"
          >
            <span className="text-text-primary text-sm">Anthropic Filed to Go Public. A Confidential S-1 at a $965 Billion Valuation Is an Option, Not a Date.</span>
          </Link>
          <Link
            href="/originals/spacex-ipo-anthropic-colossus-compute"
            className="block bg-bg-secondary border border-border rounded-lg px-4 py-3 hover:border-accent-primary transition-colors"
          >
            <span className="text-text-primary text-sm">The Biggest IPO in History Is Also an AI-Compute Disclosure. SpaceX&apos;s S-1 Surfaced the Anthropic-Colossus Lease.</span>
          </Link>
          <Link
            href="/originals/altman-amodei-walk-back-jobs-apocalypse-ipo-pivot"
            className="block bg-bg-secondary border border-border rounded-lg px-4 py-3 hover:border-accent-primary transition-colors"
          >
            <span className="text-text-primary text-sm">Altman and Amodei Walked Back the AI Jobs Apocalypse. The Subtext Is the IPO Calendar.</span>
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
