import { Metadata } from 'next';
import Link from 'next/link';
import { ArrowLeft, Clock, Zap } from 'lucide-react';
import { ArticleJsonLd } from '@/components/seo/JsonLd';
import ArticleHero from '@/components/originals/ArticleHero';
import ShareBar from '@/components/originals/ShareBar';

export const metadata: Metadata = {
  title: 'AI Just Reopened American Nuclear. Inside the Eighteen-Month Shift.',
  description:
    'For thirty years US utility nuclear was in retreat. New plants got cancelled, old plants got retired, and the orthodoxy said we were done building reactors. Then Microsoft signed a 20-year PPA to restart Three Mile Island Unit 1. Amazon bought a direct feed from Talen Susquehanna. Google signed with Kairos Power. Oracle announced three SMRs. AI capital just reopened American nuclear in eighteen months. Inside the deals, why nuclear fits AI workloads so cleanly, the FERC fight that could unravel it all, and the pipeline now in front of the NRC.',
  openGraph: {
    title: 'AI Just Reopened American Nuclear',
    description:
      'Microsoft TMI, Amazon Susquehanna, Google Kairos, Oracle SMRs. The eighteen-month shift that reopened American nuclear, why AI workloads need it, the FERC fight, the SMR pipeline.',
    type: 'article',
    publishedTime: '2026-05-13T20:00:00Z',
    authors: ['Marcus Chen'],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'AI Just Reopened American Nuclear',
    description:
      'The 18-month shift: Microsoft TMI, Amazon Susquehanna, Google Kairos, Oracle SMRs. Inside why nuclear fits AI workloads and what could unravel it.',
  },
};

export default function AINuclearRestartThesisPage() {
  return (
    <article className="max-w-3xl mx-auto px-4 sm:px-6 py-10">
      <ArticleJsonLd
        title="AI Just Reopened American Nuclear. Inside the Eighteen-Month Shift."
        description="In eighteen months, AI capital signed Microsoft + Three Mile Island Unit 1, Amazon + Talen Susquehanna, Google + Kairos Power, and Oracle's three-reactor SMR program. The deals that reopened American nuclear, why nuclear fits AI workloads so cleanly, the FERC fight that could unravel it, and the pipeline in front of the NRC."
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
        icon={Zap}
        gradientFrom="#1E3A2A"
        gradientTo="#D97706"
        eyebrow="Infrastructure &middot; Nuclear &middot; AI Buildout"
      />

      <header className="mb-10">
        <h1 className="text-3xl sm:text-4xl font-bold text-text-primary mb-4 leading-tight">
          AI Just Reopened American Nuclear. Inside the Eighteen-Month Shift.
        </h1>
        <div className="flex items-center gap-3 text-sm text-text-muted">
          <span className="text-text-secondary font-medium">Marcus Chen</span>
          <span>&middot;</span>
          <time dateTime="2026-05-13">May 13, 2026</time>
          <span>&middot;</span>
          <span className="flex items-center gap-1">
            <Clock className="w-3.5 h-3.5" />
            8 min read
          </span>
        </div>
      </header>

      <ShareBar
        path="/originals/ai-nuclear-restart-thesis"
        title="AI Just Reopened American Nuclear. Inside the Eighteen-Month Shift."
      />

      <div className="prose-custom space-y-6 text-text-secondary leading-relaxed">
        <p className="text-lg text-text-primary leading-relaxed">
          For thirty years US utility nuclear was in retreat. New plants got cancelled, old plants
          got retired, and the orthodoxy in the industry was that we were done building reactors in
          this country. Then Microsoft signed a 20-year power purchase agreement to restart Three
          Mile Island Unit 1. Amazon bought a 480 MW direct feed from Talen Energy&apos;s
          Susquehanna plant with provisions to scale to 960 MW. Google signed with Kairos Power
          for small modular reactors. Oracle announced three SMRs of its own. In eighteen months,
          AI capital reopened American nuclear.
        </p>

        <p>
          Walk through how it happened, why it works for AI specifically, and what the FERC fight
          looks like that could unravel the whole structure if it goes the wrong way.
        </p>

        <h2 className="text-2xl font-semibold text-text-primary pt-4">The Eighteen-Month Shift</h2>

        <p>
          Chronologically, the major deals:
        </p>

        <div className="bg-bg-secondary border border-border rounded-lg overflow-x-auto my-6">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border">
                <th className="text-left px-4 py-3 text-text-primary font-semibold">Date</th>
                <th className="text-left px-4 py-3 text-text-primary font-semibold">Deal</th>
                <th className="text-left px-4 py-3 text-text-primary font-semibold">Structure</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              <tr>
                <td className="px-4 py-3 font-mono text-xs">Mar 2024</td>
                <td className="px-4 py-3 text-accent-primary">Amazon + Talen Susquehanna</td>
                <td className="px-4 py-3">$650M campus acquisition, 480 MW direct feed, scale to 960 MW</td>
              </tr>
              <tr>
                <td className="px-4 py-3 font-mono text-xs">Sep 2024</td>
                <td className="px-4 py-3 text-accent-primary">Microsoft + Constellation TMI</td>
                <td className="px-4 py-3">20-year PPA to restart Unit 1, ~835 MW, 2028 target</td>
              </tr>
              <tr>
                <td className="px-4 py-3 font-mono text-xs">Oct 2024</td>
                <td className="px-4 py-3 text-accent-primary">Google + Kairos Power</td>
                <td className="px-4 py-3">Master agreement for up to 500 MW of SMR capacity</td>
              </tr>
              <tr>
                <td className="px-4 py-3 font-mono text-xs">Oct 2024</td>
                <td className="px-4 py-3 text-accent-primary">Amazon + X-energy</td>
                <td className="px-4 py-3">$500M+ funding round, SMR partnership in Washington and Virginia</td>
              </tr>
              <tr>
                <td className="px-4 py-3 font-mono text-xs">Sep 2024</td>
                <td className="px-4 py-3 text-accent-primary">Oracle three SMRs</td>
                <td className="px-4 py-3">Larry Ellison&apos;s public commitment on the earnings call</td>
              </tr>
              <tr>
                <td className="px-4 py-3 font-mono text-xs">2025+</td>
                <td className="px-4 py-3 text-accent-primary">Palisades restart (Holtec)</td>
                <td className="px-4 py-3">DOE loan, ~800 MW, second mothballed plant being unmoth-balled</td>
              </tr>
            </tbody>
          </table>
        </div>

        <p>
          Nothing like this sequence had happened in three decades. The previous decade was the
          opposite: plants closing early because natural gas was cheaper and operators could not
          justify continued operation. Indian Point shut in 2021. Palisades shut in 2022. Diablo
          Canyon was scheduled to close in 2025 before California intervened. The industry
          consensus was that the existing fleet would retire on natural schedules and nothing new
          would replace it.
        </p>

        <p>
          The Microsoft TMI announcement in September 2024 was the moment that consensus broke.
          Wall Street took it as a signal, and inside six months every other hyperscaler had
          announced something.
        </p>

        <h2 className="text-2xl font-semibold text-text-primary pt-4">Why Nuclear Fits AI Workloads</h2>

        <p>
          Three structural reasons, in order of importance.
        </p>

        <p>
          <strong className="text-text-primary">One, the load profile.</strong> AI training runs
          pull close to peak power 24 hours a day for weeks or months at a time. Inference is
          bursty in a different way than web traffic but still relatively flat compared to
          consumer demand. Nuclear is baseload-by-design. A typical plant runs at 90% plus
          capacity factor with refueling outages once every 18 to 24 months. The mismatch between
          nuclear&apos;s output curve and traditional grid demand (peaky in evenings, dipping
          overnight) is what made nuclear economics hard in deregulated markets. AI training is
          flat. The mismatch disappears.
        </p>

        <p>
          <strong className="text-text-primary">Two, the contract length.</strong> Nuclear
          economics work when you can write 15 to 20 year power purchase agreements at predictable
          prices. They do not work when you have to compete in spot markets against natural gas.
          Hyperscalers want exactly the kind of long-dated price certainty that nuclear plants
          want to sell. The PPAs underwriting the new deals are 20-year, take-or-pay structures.
          That is enough to underwrite a restart. It is also enough to underwrite an SMR build,
          which is why the SMR vendors are suddenly real businesses again.
        </p>

        <p>
          <strong className="text-text-primary">Three, the carbon math.</strong> Every hyperscaler
          has a public net-zero commitment by 2030 or 2040. Adding two gigawatts of AI training
          capacity makes those commitments harder unless the underlying power is firm and
          carbon-free. Solar plus wind plus battery can be carbon-free but is not yet reliably
          firm at gigawatt scale. Nuclear is the only proven dispatchable clean source for that
          duty cycle.
        </p>

        <h2 className="text-2xl font-semibold text-text-primary pt-4">The FERC Fight That Could Unravel It</h2>

        <p>
          In November 2024 the Federal Energy Regulatory Commission blocked an amended
          interconnection service agreement that would have let Amazon scale its Susquehanna draw
          from 480 MW to 960 MW behind the meter. The technical objection: a campus that big
          drawing power from a generator inside the substation, but not paying full transmission
          cost-share, was a structural change to how grid costs get allocated. If hyperscalers can
          co-locate at nuclear plants and avoid transmission fees, the rest of the ratepayer base
          ends up subsidizing infrastructure that does not serve their load.
        </p>

        <p>
          Talen and AWS filed a rehearing request. The matter remains unresolved. Three outcomes
          matter:
        </p>

        <p>
          If FERC sides against the bypass structure, every direct-feed deal has to renegotiate.
          Microsoft TMI may or may not survive in current form because its structure is different
          (Constellation owns the plant and sells power into the grid, then bills Microsoft
          through a virtual PPA, not a direct feed). Amazon Susquehanna would have to either pay
          full transmission cost-share or restructure as a virtual PPA. The latter is uglier
          because it loses the latency and reliability benefits of co-location.
        </p>

        <p>
          If FERC sides for the bypass structure, every existing nuclear plant becomes a potential
          AI campus site. The economics turn sharply favorable for operators who can lease land
          adjacent to existing reactors. Vistra Energy, Constellation, Dominion, and a handful of
          other nuclear operators with surplus land near plants effectively get a new revenue
          stream worth tens of billions over the next decade.
        </p>

        <p>
          If FERC delays or punts, the deals stall. Some restructure as virtual PPAs. Some get
          cancelled. The bigger SMR commitments (Kairos, X-energy) are less affected because
          they are net-new builds that get built directly into the grid, not co-located bypasses.
          But the restart-existing-plant deals get harder.
        </p>

        <h2 className="text-2xl font-semibold text-text-primary pt-4">The SMR Pipeline Behind the Restarts</h2>

        <p>
          The restart deals are short-term wins (existing reactor, NRC license renewal pathway,
          2028 or 2029 operational target). The structural shift is the SMR pipeline behind them.
        </p>

        <p>
          Kairos Power has DOE Hermes demonstration approval, targeting first criticality
          mid-2027, with Google as anchor customer for up to 500 MW of follow-on commercial
          deployment. X-energy is closer to commercial with Dow Chemical and Amazon committing.
          NuScale was the first SMR design certified by the NRC and remains a credible US option
          despite the UAMPS cancellation. Oklo, TerraPower (Bill Gates), Westinghouse AP300, and
          a handful of others are in earlier stages.
        </p>

        <p>
          The pre-pandemic estimate for first commercial SMR criticality in the US was 2032 to
          2035. AI capital has compressed that to 2027 to 2030 for the leading designs.
          Compressed how: by writing the offtake agreements that let SMR vendors get financed,
          and by lobbying the NRC to streamline license review for the licensing bottleneck.
        </p>

        <h2 className="text-2xl font-semibold text-text-primary pt-4">What To Watch</h2>

        <p>
          The FERC ruling on the Amazon-Talen rehearing request. It is the load-bearing decision
          for whether the direct-feed structure survives. Expected sometime in 2025 to 2026.
        </p>

        <p>
          NRC license decisions on TMI Unit 1 restart and Palisades restart. Both are mid-2026 to
          2028 timelines. If either slips, the announcement-to-electrons window opens further.
        </p>

        <p>
          Kairos Hermes first criticality in 2027. The first real SMR demonstration in the US in
          decades. If it goes well, the commercial SMR market is real. If it slips, the SMR
          pipeline gets longer.
        </p>

        <p>
          New deals from hyperscalers not yet announced. Meta has not publicly signed a nuclear
          deal. Apple has not. xAI has not. All three have load profiles that need nuclear-shaped
          firm clean power, and all three have public clean-energy commitments. The next twelve
          months of announcements will tell us whether the eighteen-month wave was the front
          edge of a deeper structural shift or the peak of a short cycle.
        </p>

        <p>
          Bet right now is that it is the front edge. AI demand is not going down, and the grid
          is not building transmission fast enough to serve it from anywhere else. The steel is
          going to follow the megawatts. The megawatts are increasingly going to come from
          uranium.
        </p>

        <p className="text-sm text-text-muted pt-6 border-t border-bg-tertiary">
          We track the active nuclear deals on the{' '}
          <Link href="/ai-infrastructure" className="text-accent-primary hover:underline">
            AI infrastructure page
          </Link>
          : Microsoft Three Mile Island, Amazon Susquehanna. Companion analysis of the broader
          buildout at{' '}
          <Link href="/originals/ai-buildout-explained" className="text-accent-primary hover:underline">
            The AI Buildout, Plain English
          </Link>
          .
        </p>
      </div>
    </article>
  );
}
