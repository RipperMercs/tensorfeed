import { Metadata } from 'next';
import Link from 'next/link';
import { ArrowLeft, Clock, Server } from 'lucide-react';
import { ArticleJsonLd } from '@/components/seo/JsonLd';
import ArticleHero from '@/components/originals/ArticleHero';
import ShareBar from '@/components/originals/ShareBar';

export const metadata: Metadata = {
  alternates: { canonical: 'https://tensorfeed.ai/originals/ai-buildout-explained' },
  title: 'The AI Buildout, Plain English: What Is Actually Getting Built',
  description:
    'The AI industry is putting steel and concrete in the ground at a pace nobody has seen since the dotcom era of physical fiber. Stargate, Hyperion, Colossus, nuclear restarts, gigawatt-class campuses. A plain-English read of what is being built, where, with what power, and what it means for the AI we actually use.',
  openGraph: {
    title: 'The AI Buildout, Plain English',
    description:
      'A plain-English read of the gigawatt-class AI data center buildout: what is being built, where, with what power, and what it means for the AI you use.',
    type: 'article',
    publishedTime: '2026-05-13T18:00:00Z',
    authors: ['Marcus Chen'],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'The AI Buildout, Plain English',
    description:
      'Stargate, Hyperion, Colossus, nuclear restarts. What is actually getting built, where, and what it means.',
  },
};

export default function AIBuildoutExplainedPage() {
  return (
    <article className="max-w-3xl mx-auto px-4 sm:px-6 py-10">
      <ArticleJsonLd
        title="The AI Buildout, Plain English: What Is Actually Getting Built"
        description="The AI industry is putting steel and concrete in the ground at a pace nobody has seen since the dotcom era. A plain-English read of the gigawatt-class buildout, the nuclear restarts, the community pushback, and what it means for the AI we actually use."
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
        icon={Server}
        gradientFrom="#1F2937"
        gradientTo="#0E7490"
        eyebrow="Infrastructure &middot; AI Buildout"
      />

      <header className="mb-10">
        <h1 className="text-3xl sm:text-4xl font-bold text-text-primary mb-4 leading-tight">
          The AI Buildout, Plain English: What Is Actually Getting Built
        </h1>
        <div className="flex items-center gap-3 text-sm text-text-muted">
          <span className="text-text-secondary font-medium">Marcus Chen</span>
          <span>&middot;</span>
          <time dateTime="2026-05-13">May 13, 2026</time>
          <span>&middot;</span>
          <span className="flex items-center gap-1">
            <Clock className="w-3.5 h-3.5" />
            7 min read
          </span>
        </div>
      </header>

      <ShareBar
        path="/originals/ai-buildout-explained"
        title="The AI Buildout, Plain English: What Is Actually Getting Built"
      />

      <div className="prose-custom space-y-6 text-text-secondary leading-relaxed">
        <p className="text-lg text-text-primary leading-relaxed">
          The AI industry is putting steel and concrete in the ground at a pace nobody has seen
          since the dotcom buildout of physical fiber. Stargate, Hyperion, Colossus, nuclear plants
          getting unmothballed, gas turbines arriving on flatbeds, utility commissions filing
          emergency load adjustments. We track 10 of the biggest projects on the new{' '}
          <Link href="/ai-infrastructure" className="text-accent-primary hover:underline">
            AI infrastructure page
          </Link>
          . This piece is the plain-English read of what they are, what they need, and why this is
          happening so fast.
        </p>

        <h2 className="text-2xl font-semibold text-text-primary pt-4">What is being built</h2>

        <p>
          Big buildings full of computers, drawing a lot of electricity. That is the short version.
          The longer version: the new AI data centers are different from the cloud data centers of
          the 2010s in three structural ways. First, they are bigger. A modern Meta campus like
          Hyperion is heading for 2 gigawatts of power draw on completion. A traditional
          general-purpose data center campus tops out at one or two hundred megawatts. Hyperion
          alone could draw 10 to 20x what a 2018-era hyperscale campus did.
        </p>

        <p>
          Second, the silicon density is higher. A rack of Nvidia GB200 NVL72 systems draws
          roughly 120 kilowatts. A traditional server rack drew 5 to 15. That is the same
          floor area pulling 10x the power, which means new cooling (liquid cooling is now the
          default), new power distribution (some campuses run their own substations), and new heat
          rejection plans. Some of the gas turbine controversy at xAI Colossus in Memphis comes
          straight from this density problem: the grid could not deliver the kilowatts per square
          foot on the timeline, so xAI brought in temporary methane turbines.
        </p>

        <p>
          Third, the workload profile is different. AI training runs are flatter than traditional
          cloud workloads. A model training job pulls close to peak power 24 hours a day for weeks
          or months at a time. Inference is more variable but still bursty in a different way than
          web traffic. This matters for the grid because peak-flat is harder to balance than
          peak-spiky. Utilities are used to planning around residential evening peaks and
          industrial daytime loads. AI training is its own load curve and most US utilities are
          still figuring out how to model it.
        </p>

        <h2 className="text-2xl font-semibold text-text-primary pt-4">The four numbers that matter</h2>

        <div className="bg-bg-secondary border border-border rounded-lg overflow-x-auto my-6">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border">
                <th className="text-left px-4 py-3 text-text-primary font-semibold">Number</th>
                <th className="text-left px-4 py-3 text-text-primary font-semibold">Value</th>
                <th className="text-left px-4 py-3 text-text-primary font-semibold">What it tells you</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              <tr>
                <td className="px-4 py-3 text-accent-primary font-medium">Total announced</td>
                <td className="px-4 py-3 font-mono">~$500B (Stargate alone)</td>
                <td className="px-4 py-3">Five-year program across multiple sites</td>
              </tr>
              <tr>
                <td className="px-4 py-3 text-accent-primary font-medium">Single-campus draw</td>
                <td className="px-4 py-3 font-mono">up to 2 GW</td>
                <td className="px-4 py-3">Meta Hyperion class; rivals a small city</td>
              </tr>
              <tr>
                <td className="px-4 py-3 text-accent-primary font-medium">Nuclear MW signed</td>
                <td className="px-4 py-3 font-mono">~1,800 MW (TMI + Susquehanna)</td>
                <td className="px-4 py-3">Hyperscalers buying or restarting reactors directly</td>
              </tr>
              <tr>
                <td className="px-4 py-3 text-accent-primary font-medium">Operational year cluster</td>
                <td className="px-4 py-3 font-mono">2026 to 2030</td>
                <td className="px-4 py-3">Most new campuses come online in this window</td>
              </tr>
            </tbody>
          </table>
        </div>

        <h2 className="text-2xl font-semibold text-text-primary pt-4">Why nuclear is suddenly back</h2>

        <p>
          For 30 years US utility nuclear was in retreat. New plants got cancelled, old plants got
          retired, and the orthodoxy was that we were done building reactors. Then Microsoft signed
          a 20-year deal to restart Three Mile Island Unit 1 (the undamaged one; Unit 2 is the
          1979 partial meltdown and remains permanently shut). Amazon bought a 480 MW direct feed
          from Talen Energy&apos;s Susquehanna plant with provisions to scale to 960 MW. Google
          signed with Kairos Power for small modular reactors. Oracle announced three SMRs of its
          own.
        </p>

        <p>
          The hyperscalers want clean firm baseload that runs 24/7 and does not need backup gas. A
          nuclear plant fits that exactly. They also want to write 15 to 20 year power purchase
          agreements at predictable prices, which works for nuclear economics but does not work
          for solar or wind alone. Net effect: AI capital is reopening reactors that the previous
          decade closed. That is a notable shift and it shows up most clearly in the
          permits and PPAs, not the marketing.
        </p>

        <h2 className="text-2xl font-semibold text-text-primary pt-4">Where this gets contested</h2>

        <p>
          Three flashpoints, all factual, none speculative.
        </p>

        <p>
          <strong className="text-text-primary">Water draws.</strong> Liquid cooling and evaporative
          cooling pull water. In wet climates this is mostly fine. In Arizona, Texas, and parts of
          Nevada it competes with municipal and agricultural use. Several Arizona municipalities
          have started requiring closed-loop systems and pre-treatment commitments before
          permitting new builds. Public records on water consumption per facility remain spotty;
          some operators publish, some do not.
        </p>

        <p>
          <strong className="text-text-primary">Grid bypass.</strong> The Amazon-Talen Susquehanna
          deal triggered a FERC fight in late 2024 about whether co-located data centers should
          pay full transmission cost-share if they are technically behind the meter. The answer is
          unsettled. If FERC sides against bypass structures, the economics of every direct-feed
          nuclear deal changes. If it sides for them, every utility ratepayer in the country may
          end up subsidizing infrastructure that does not serve their load.
        </p>

        <p>
          <strong className="text-text-primary">Local pushback.</strong> Memphis residents living
          downwind of the Colossus campus filed complaints over methane turbine emissions. Loudoun
          County Virginia, the largest data center cluster on Earth, has been debating moratoriums
          for two years. Some counties want the tax revenue and jobs; some want the steel out of
          their viewshed and the gas turbines out of their air. It depends on the county and the
          neighborhood and it does not split cleanly along party lines.
        </p>

        <h2 className="text-2xl font-semibold text-text-primary pt-4">What this means for the AI you use</h2>

        <p>
          Pricing floors first. The reason model pricing has been falling for two years is that
          compute supply outran demand. The gigawatt-class campuses arriving in 2026 to 2030 keep
          that supply curve growing. As long as new capacity comes online faster than agent and
          enterprise adoption picks up the slack, prices keep drifting down. The moment buildout
          slips or demand spikes, prices stop falling. The 2027 to 2028 window is the most
          interesting one to watch on that front because most of the new GW capacity lands then.
        </p>

        <p>
          Provider-specific reliability second. The campuses backing different providers come
          online at different times with different power profiles. Anthropic just locked in five
          years of Google TPU capacity that begins arriving in 2027. OpenAI&apos;s Stargate
          flagship in Abilene comes online in 2026. xAI is running on Memphis methane until the
          grid catches up. These delivery timelines map directly to which providers have
          headroom for which workloads in which year. Our{' '}
          <Link href="/status" className="text-accent-primary hover:underline">
            /status page
          </Link>{' '}
          and{' '}
          <Link href="/pricing" className="text-accent-primary hover:underline">
            /pricing page
          </Link>{' '}
          will start surfacing those constraints as they get real.
        </p>

        <p>
          Geopolitics third. The buildout is heavily US-concentrated, with secondary clusters in
          the UAE, Saudi Arabia, France, and the UK. China is building its own version, mostly
          opaque to outside observers. Sovereign-AI compute as a national security argument is
          getting louder and is now showing up in DOE filings, DOD partnerships, and Treasury
          export-control decisions. That story is bigger than one article and we will keep
          covering it.
        </p>

        <h2 className="text-2xl font-semibold text-text-primary pt-4">The bottom line</h2>

        <p>
          The AI industry is no longer software-only. It is steel, concrete, transformers, cooling
          towers, and 20-year power contracts. That changes how fast it can grow (slower than
          software, faster than utilities are used to), where it can grow (where the power is and
          where the permits clear), and who has leverage (whoever signs the long-dated power deals
          first).
        </p>

        <p>
          For everyone using the AI: the buildout is mostly good news for the next three years.
          More compute means cheaper inference, more model variety, more headroom for agents.
          After that the picture gets harder to read because we will see whether the demand curve
          has caught up to the supply curve. If yes, prices stabilize and the providers with the
          most signed-up power win. If no, somebody owns 2 gigawatts of empty server halls.
        </p>

        <p>
          Either way, the next phase of AI is not just about better models. It is about who has
          the steel.
        </p>

        <p className="text-sm text-text-muted pt-6 border-t border-bg-tertiary">
          We track 10 of the largest projects on the{' '}
          <Link href="/ai-infrastructure" className="text-accent-primary hover:underline">
            AI infrastructure page
          </Link>
          . Free JSON for agents at{' '}
          <code className="bg-bg-tertiary px-1.5 py-0.5 rounded text-xs">
            /api/ai-infrastructure/projects.json
          </code>
          .
        </p>
      </div>
    </article>
  );
}
