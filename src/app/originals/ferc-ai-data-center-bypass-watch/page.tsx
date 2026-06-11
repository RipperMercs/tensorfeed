import { Metadata } from 'next';
import Link from 'next/link';
import { ArrowLeft, Clock, Scale } from 'lucide-react';
import { ArticleJsonLd } from '@/components/seo/JsonLd';
import ArticleHero from '@/components/originals/ArticleHero';
import ShareBar from '@/components/originals/ShareBar';

export const metadata: Metadata = {
  alternates: { canonical: 'https://tensorfeed.ai/originals/ferc-ai-data-center-bypass-watch' },
  title: 'The FERC Ruling Watch: One Decision Could Reshape Every AI Nuclear Deal',
  description:
    'In November 2024, FERC blocked the amended interconnection agreement that would have let Amazon scale its Susquehanna nuclear draw from 480 MW to 960 MW behind the meter. The matter is unresolved. Whichever way it falls reshapes every direct-feed nuclear deal hyperscalers have signed. Inside the procedural state of play, the three possible outcomes, the projects on each side of the bet, and the signposts to watch as the decision approaches.',
  openGraph: {
    title: 'The FERC Ruling Watch',
    description:
      'One FERC decision could reshape every AI nuclear deal. State of play, three outcomes, projects at stake, signposts.',
    type: 'article',
    publishedTime: '2026-05-13T23:00:00Z',
    authors: ['Marcus Chen'],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'The FERC Ruling Watch',
    description:
      'One regulator decision reshapes every AI nuclear deal. Three outcomes, projects at stake, signposts to watch.',
  },
};

export default function FERCRulingWatchPage() {
  return (
    <article className="max-w-3xl mx-auto px-4 sm:px-6 py-10">
      <ArticleJsonLd
        title="The FERC Ruling Watch: One Decision Could Reshape Every AI Nuclear Deal"
        description="FERC's pending decision on the Amazon-Talen Susquehanna interconnection amendment is the single highest-stakes regulatory call in the AI buildout. Procedural state of play, three outcomes, projects on each side of the bet, and signposts to watch."
        datePublished="2026-05-13"
        author="Marcus Chen"
      />

      <Link
        href="/originals"
        className="inline-flex items-center gap-1.5 text-sm text-text-muted hover:text-accent-primary transition-colors mb-8"
      >
        <ArrowLeft className="w-4 h-4" />
        Back to Originals
      </Link>

      <ArticleHero
        mode="graphic"
        icon={Scale}
        gradientFrom="#1E1B4B"
        gradientTo="#7C2D12"
        eyebrow="Regulatory &middot; FERC &middot; AI Infrastructure"
      />

      <header className="mb-10">
        <h1 className="text-3xl sm:text-4xl font-bold text-text-primary mb-4 leading-tight">
          The FERC Ruling Watch: One Decision Could Reshape Every AI Nuclear Deal
        </h1>
        <div className="flex items-center gap-3 text-sm text-text-muted">
          <span className="text-text-secondary font-medium">Marcus Chen</span>
          <span>&middot;</span>
          <time dateTime="2026-05-13">May 13, 2026</time>
          <span>&middot;</span>
          <span className="flex items-center gap-1">
            <Clock className="w-3.5 h-3.5" />
            6 min read
          </span>
        </div>
      </header>

      <ShareBar
        path="/originals/ferc-ai-data-center-bypass-watch"
        title="The FERC Ruling Watch: One Decision Could Reshape Every AI Nuclear Deal"
      />

      <div className="prose-custom space-y-6 text-lg text-text-primary leading-relaxed">
        <p className="text-lg text-text-primary leading-relaxed">
          The single highest-stakes pending regulatory decision in the AI buildout is not at the
          NRC, not at the EPA, not in any state utility commission. It is at FERC, the Federal
          Energy Regulatory Commission, in the matter of the Amazon-Talen Susquehanna
          interconnection service amendment. Whichever way it falls reshapes every direct-feed
          nuclear deal hyperscalers have signed and will sign for the rest of the decade. This
          page tracks the watch.
        </p>

        <h2 className="text-2xl font-semibold text-text-primary pt-4">The State Of Play</h2>

        <p>
          In March 2024 Amazon Web Services bought Talen Energy&apos;s adjacent Cumulus data
          center campus for $650 million and signed a direct-feed power agreement: an initial 480
          MW pull from the Susquehanna nuclear plant, with provisions to scale to 960 MW. The
          structure is sometimes called co-location or behind-the-meter, depending on whose
          filing you read. The campus sits inside the substation; the power moves between
          generator and load without traversing the wider PJM grid.
        </p>

        <p>
          PJM filed an amended Interconnection Service Agreement (ISA) on Amazon&apos;s behalf in
          mid-2024 to memorialize the scale to 960 MW. In November 2024, FERC rejected the
          amendment in a split decision. The technical objection: a campus drawing that much
          power from a generator inside the substation, but not paying full transmission
          cost-share, was a structural change to how grid costs get allocated. If the structure
          stands, the rest of the ratepayer base ends up subsidizing infrastructure that does
          not serve their load.
        </p>

        <p>
          Talen, AWS, and PJM filed rehearing requests. The proceedings have continued in front
          of FERC and on parallel state tracks at the Pennsylvania Public Utility Commission.
          As of May 2026 the matter remains procedurally open. A decision is expected sometime
          in the 2026 calendar year, though FERC rarely commits to exact dates.
        </p>

        <h2 className="text-2xl font-semibold text-text-primary pt-4">What FERC Has To Decide</h2>

        <p>
          The substantive question is straightforward to state and complex to resolve.
        </p>

        <p>
          When a large industrial load co-locates physically with a generator and pulls power
          through facilities inside the substation, is it a transmission customer (and therefore
          owes the full network cost-share) or is it something else (a direct sale, a wholesale
          arrangement, a behind-the-meter campus)? The Federal Power Act and the existing FERC
          tariff structure assume the prior decades&apos; pattern: generation feeds the grid, the
          grid serves load, transmission gets paid for. Co-location at this scale is a structure
          the existing tariffs were not designed for.
        </p>

        <p>
          The pure regulatory answer matters less than the precedent. Whatever FERC decides on
          Susquehanna becomes the template for every subsequent application. Constellation,
          Vistra, Dominion, Public Service Enterprise Group, and at least four other US nuclear
          operators have surplus land adjacent to their plants and have publicly or privately
          explored similar structures. Every one of those waits on this ruling.
        </p>

        <h2 className="text-2xl font-semibold text-text-primary pt-4">The Three Outcomes</h2>

        <div className="bg-bg-secondary border border-border rounded-lg overflow-x-auto my-6">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border">
                <th className="text-left px-4 py-3 text-text-primary font-semibold">Outcome</th>
                <th className="text-left px-4 py-3 text-text-primary font-semibold">What changes</th>
                <th className="text-left px-4 py-3 text-text-primary font-semibold">Who wins / loses</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              <tr>
                <td className="px-4 py-3 text-accent-primary font-medium">Approves bypass</td>
                <td className="px-4 py-3">Co-location stays viable; nuclear-adjacent land becomes premium</td>
                <td className="px-4 py-3">Wins: nuclear operators, hyperscalers / Loses: PJM ratepayers</td>
              </tr>
              <tr>
                <td className="px-4 py-3 text-accent-primary font-medium">Rejects bypass</td>
                <td className="px-4 py-3">Every direct-feed deal renegotiates as virtual PPA; some cancel</td>
                <td className="px-4 py-3">Wins: utility ratepayers / Loses: nuclear operators, hyperscaler latency hopes</td>
              </tr>
              <tr>
                <td className="px-4 py-3 text-accent-primary font-medium">Splits or delays</td>
                <td className="px-4 py-3">Conditional approval with cost-share formula; lots of negotiation</td>
                <td className="px-4 py-3">Wins: lawyers / Loses: timelines, certainty for both sides</td>
              </tr>
            </tbody>
          </table>
        </div>

        <p>
          <strong className="text-text-primary">Approves.</strong> The 480 to 960 MW scale-up
          goes through with current structural terms. Amazon adds gigawatt of training capacity
          adjacent to Susquehanna. Constellation, Vistra, and the other nuclear operators with
          adjacent land start running their own co-location auctions. Land within five miles of
          an operating reactor effectively gets a new asset class. Microsoft TMI may or may not
          reopen the structural terms of its own deal to take advantage. The hyperscaler
          competition for nuclear-adjacent acreage gets aggressive.
        </p>

        <p>
          <strong className="text-text-primary">Rejects.</strong> The bypass structure gets sent
          back. Amazon Susquehanna renegotiates as a virtual PPA: Talen sells power into the
          grid, AWS buys the equivalent through the grid, the transmission cost-share gets paid.
          The economics are still positive for both sides but worse, and the latency benefits of
          true co-location are lost. Some currently-announced deals (Oracle SMRs, X-energy
          Amazon, smaller proposed Constellation co-locations) get re-papered. Some get
          cancelled. The pace of new nuclear-AI deals slows materially through 2027.
        </p>

        <p>
          <strong className="text-text-primary">Splits or delays.</strong> The likeliest actual
          outcome. FERC writes a conditional approval that requires Amazon to pay some
          transmission cost-share, but not full. Parties negotiate the cost-share formula for
          months. The Susquehanna structure goes forward in modified form. Other co-location
          applications now have a cost-share floor they have to design around. The result is
          messier than either pure outcome and adds 12 to 24 months of negotiation tail to every
          subsequent deal.
        </p>

        <h2 className="text-2xl font-semibold text-text-primary pt-4">Who Else Is Watching</h2>

        <p>
          <strong className="text-text-primary">Constellation Energy.</strong> Owns Three Mile
          Island, plus Calvert Cliffs, Limerick, Peach Bottom, and others. Microsoft TMI is
          structured as a virtual PPA, but Constellation has multiple other plants where
          adjacent co-location would be commercially valuable if the structure clears.
        </p>

        <p>
          <strong className="text-text-primary">Vistra Energy.</strong> Owns Comanche Peak in
          Texas and has publicly explored co-location proposals. Texas is on the ERCOT grid, not
          PJM, so the Susquehanna ruling does not directly bind. But ERCOT will take cues.
        </p>

        <p>
          <strong className="text-text-primary">Dominion Energy.</strong> Operates several
          nuclear plants in Virginia, where Loudoun County data center demand is the densest in
          the country. Adjacent co-location structures have been floated. Virginia state
          regulators have additionally weighed in.
        </p>

        <p>
          <strong className="text-text-primary">Hyperscalers without nuclear deals yet.</strong>{' '}
          Meta, Apple, and xAI have all been reported to be exploring nuclear arrangements but
          have not publicly signed. They wait on the FERC outcome to decide what structure to
          even pursue. A clean approval brings a wave of announcements in the following six
          months; a rejection delays them all by a year.
        </p>

        <p>
          <strong className="text-text-primary">PJM ratepayers and consumer advocates.</strong>{' '}
          Filed formal opposition to the original ISA amendment. Their argument is straightforward
          and not unreasonable: residential and small-business customers should not subsidize
          billion-dollar hyperscaler infrastructure through avoided transmission costs.
        </p>

        <h2 className="text-2xl font-semibold text-text-primary pt-4">What To Watch</h2>

        <p>
          The FERC docket. EL24-149 and related sub-dockets carry the procedural updates. New
          filings appear on the public docket; rulings post the same day.
        </p>

        <p>
          The composition of the commission. FERC sits five commissioners but operates often
          with four during transitions. Voting patterns on infrastructure questions have been
          unstable in recent commission cycles. A change in commission composition mid-proceeding
          changes the math.
        </p>

        <p>
          Parallel state-level proceedings at the Pennsylvania PUC. State actions can constrain
          the federal answer in ways that show up months before the FERC ruling lands.
        </p>

        <p>
          Constellation, Vistra, and Dominion earnings calls. Management commentary on nuclear
          co-location strategy gets specific quarter over quarter; the framing shifts visibly
          when the underlying regulatory state shifts.
        </p>

        <p>
          New deal announcements that explicitly do or do not use the bypass structure. Each
          new deal is a small data point on what the lawyers expect FERC to do.
        </p>

        <h2 className="text-2xl font-semibold text-text-primary pt-4">The Stakes</h2>

        <p>
          Hyperscaler capex on US nuclear since the Microsoft TMI announcement is in the tens of
          billions of dollars across signed and announced deals. The FERC ruling is the
          load-bearing decision for how those deals close out structurally and whether the next
          wave behind them happens at all. One regulator, one ruling, one cost-share formula
          that does not yet exist on paper, deciding whether the AI buildout keeps reopening
          American nuclear or has to find another way to power the next decade.
        </p>

        <p>
          We will update this page when the decision lands.
        </p>

        <p className="text-sm text-text-muted pt-6 border-t border-bg-tertiary">
          Related: full nuclear-restart analysis at{' '}
          <Link href="/originals/ai-nuclear-restart-thesis" className="text-accent-primary hover:underline">
            AI Just Reopened American Nuclear
          </Link>
          . Live tracker of nuclear deals on{' '}
          <Link href="/ai-infrastructure" className="text-accent-primary hover:underline">
            the AI infrastructure page
          </Link>{' '}
          (Microsoft TMI restart, Amazon Susquehanna campus).
        </p>
      </div>
    </article>
  );
}
