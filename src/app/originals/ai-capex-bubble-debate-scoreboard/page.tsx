import { Metadata } from 'next';
import Link from 'next/link';
import { ArrowLeft, Clock, Coins } from 'lucide-react';
import { ArticleJsonLd } from '@/components/seo/JsonLd';
import ArticleHero from '@/components/originals/ArticleHero';
import ShareBar from '@/components/originals/ShareBar';

export const metadata: Metadata = {
  alternates: {
    canonical: 'https://tensorfeed.ai/originals/ai-capex-bubble-debate-scoreboard',
  },
  title:
    'Everyone Is Calling an AI Capex Bubble. Almost No One Agrees on How to Measure One.',
  description:
    "The four largest US hyperscalers spent roughly $448 billion on capex in 2025 and have guided 2026 to about $600 to $725 billion. Goldman models roughly $765 billion of AI capex in 2026 and $7.6 trillion through 2031. The bears point to a MIT study finding 95 percent of enterprise GenAI pilots showed no P&L return, to circular vendor financing, and to depreciation games. The bulls point to real inference demand and sold-out capacity. The trouble is that the two camps are not measuring the same thing, and the one lens that travels across history, capex as a share of GDP, ranges from about 0.8 percent to 2 percent depending on the denominator.",
  openGraph: {
    title:
      'Everyone Is Calling an AI Capex Bubble. Almost No One Agrees on How to Measure One.',
    description:
      "The bear case (spend outrunning return, circular financing, depreciation), the bull case (demand and a genuine capacity shortage), and the measurement problem underneath both. The one number that travels is capex as a share of GDP, where the AI boom currently sits between the dotcom peak near 1.2 percent and the railroad manias above 4 percent.",
    type: 'article',
    publishedTime: '2026-06-07T10:00:00Z',
    authors: ['Marcus Chen'],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Everyone Is Calling an AI Capex Bubble. Nobody Agrees How to Measure One.',
    description:
      "Hyperscaler capex hit roughly $448 billion in 2025, guided to $600 to $725 billion for 2026. The bull and bear camps are not using the same scoreboard. The number that travels: capex as a share of GDP.",
  },
};

export default function AiCapexBubbleDebateScoreboardPage() {
  return (
    <article className="max-w-3xl mx-auto px-4 sm:px-6 py-10">
      <ArticleJsonLd
        title="Everyone Is Calling an AI Capex Bubble. Almost No One Agrees on How to Measure One."
        description="The 2026 AI capex bubble debate has gone mainstream, but the bull and bear camps are not measuring the same thing. The bear case rests on spend outrunning return, circular vendor financing, and depreciation accounting. The bull case rests on real inference demand and a capacity shortage. The one lens that travels across history is capex as a share of GDP, where the AI boom sits between the dotcom peak and the railroad manias."
        datePublished="2026-06-07"
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

      {/* Header */}
      <header className="mb-10">
        <h1 className="text-3xl sm:text-4xl font-bold text-text-primary mb-4 leading-tight">
          Everyone Is Calling an AI Capex Bubble. Almost No One Agrees on How to Measure One.
        </h1>
        <div className="flex items-center gap-3 text-sm text-text-muted">
          <span className="text-text-secondary font-medium">Marcus Chen</span>
          <span>&middot;</span>
          <time dateTime="2026-06-07">June 7, 2026</time>
          <span>&middot;</span>
          <span className="flex items-center gap-1">
            <Clock className="w-3.5 h-3.5" />
            6 min read
          </span>
        </div>
      </header>

      <ShareBar
        path="/originals/ai-capex-bubble-debate-scoreboard"
        title="Everyone Is Calling an AI Capex Bubble. Almost No One Agrees on How to Measure One."
      />

      <ArticleHero
        mode="graphic"
        icon={Coins}
        gradientFrom="#854d0e"
        gradientTo="#422006"
        eyebrow="CAPITAL"
      />

      <div className="prose-custom space-y-6 text-text-secondary leading-relaxed">
        <p className="text-lg text-text-primary leading-relaxed">
          The word &quot;bubble&quot; is now attached to AI capex on every earnings call, every cable
          panel, and every fund letter I read. What strikes me is that the people shouting it and the
          people waving it off are not actually arguing about the same number. One camp is measuring
          spend against profit. The other is measuring spend against demand. They both think they are
          winning, because they are not playing on the same board.
        </p>

        <p>
          I cover capital for TensorFeed, and I have watched this debate harden into two scripts that
          rarely touch. So let me do the boring thing first: lay out the bear case and the bull case on
          their own terms, with real figures attributed, then show the one lens that actually travels
          across a century of buildouts. That last lens is the only honest way I have found to ask
          whether this is a mania or a buildout, and the answer is less obvious than either camp wants.
        </p>

        <h2 className="text-2xl font-semibold text-text-primary pt-4">
          The bear case: the spend is outrunning the return
        </h2>

        <p>
          Start with the raw outlay, because it is genuinely enormous. The four largest US hyperscalers
          (Microsoft, Alphabet, Amazon, and Meta) spent roughly $448 billion on capex in 2025, up from
          about $162 billion in 2022, and have guided 2026 capex to roughly $600 to $725 billion, the
          bulk of it AI and datacenter, per their own guidance and a tally by{' '}
          <a
            href="https://www.tomshardware.com/tech-industry/artificial-intelligence"
            target="_blank"
            rel="noopener noreferrer"
            className="text-accent-primary hover:underline"
          >
            Tom&apos;s Hardware
          </a>{' '}
          and IEEE ComSoc. TrendForce puts the top nine cloud and AI infrastructure providers near $830
          billion for 2026. Goldman Sachs models roughly{' '}
          <a
            href="https://www.goldmansachs.com/insights/articles"
            target="_blank"
            rel="noopener noreferrer"
            className="text-accent-primary hover:underline"
          >
            $765 billion of AI capex in 2026 and about $7.6 trillion cumulatively from 2026 through 2031
          </a>
          .
        </p>

        <p>
          Now the part that worries the bears. A widely cited 2025 MIT study (Project NANDA, &quot;The
          GenAI Divide&quot;) found that roughly{' '}
          <a
            href="https://nanda.media.mit.edu/"
            target="_blank"
            rel="noopener noreferrer"
            className="text-accent-primary hover:underline"
          >
            95 percent of enterprise generative-AI pilots showed no measurable P&amp;L return
          </a>
          . Set that against capex that is compressing hyperscaler free cash flow as it outruns operating
          cash flow, and you get the bear thesis in one sentence: the money is going out the door far
          faster than it is coming back.
        </p>

        <p>
          Then there is the plumbing. Critics argue that a chunk of the demand is circular vendor
          financing, where the same dollars cycle between chipmaker, lab, and cloud. The examples they
          cite are Nvidia&apos;s reported roughly $100 billion commitment tied to OpenAI and OpenAI&apos;s
          reported roughly $300 billion Oracle compute deal. Investor Michael Burry has reopened bearish
          positions and publicly argued, as reported, that hyperscalers flatter earnings by extending the
          assumed useful life of AI servers, which understates depreciation. I treat that as one bear&apos;s
          claim rather than settled fact, but it points at a real soft spot: the accounting for how fast
          this hardware ages is an assumption, not a measurement.
        </p>

        <h2 className="text-2xl font-semibold text-text-primary pt-4">
          The bull case: the demand is real and the capacity is short
        </h2>

        <p>
          The bulls do not dispute the spend. They dispute the framing of it as speculative. Their
          starting point is that inference demand is real and growing, not a pilot that fizzles, and that
          the constraint right now is supply, not interest. Operators keep reporting that GPUs and power
          are effectively sold out, which is not what a demand mirage looks like.
        </p>

        <p>
          The revenue side backs that up, though I am going to keep the exact figures hedged because the
          private labs disclose selectively. The reported pattern is steep, recurring revenue ramps at the
          frontier labs and at the clouds renting them capacity. When a stranded cluster gets leased to a
          rival within weeks of going idle, as we documented in{' '}
          <Link
            href="/originals/spacex-ipo-anthropic-colossus-compute"
            className="text-accent-primary hover:underline"
          >
            the SpaceX S-1 disclosure of the Anthropic-Colossus lease
          </Link>
          , that is a capacity shortage with a price, not a glut.
        </p>

        <p>
          The bull reading of the circular-financing complaint is also worth stating fairly. A chipmaker
          taking equity or a supply commitment in a customer is how booms have always financed their
          early innings. It is risky, and it can paper over weak end demand, but vendor financing is not
          by itself proof of a bubble. The honest bull position is that the spend is rational if the
          inference economy compounds, and reckless if it does not, and that the early demand signals lean
          toward compounding.
        </p>

        <h2 className="text-2xl font-semibold text-text-primary pt-4">
          Why nobody agrees: there is no shared scoreboard
        </h2>

        <p>
          Here is the core problem, and it is the reason both camps can sound right. There is no agreed
          scoreboard. The denominators are different, the flows are partly circular, and the depreciation
          is an estimate.
        </p>

        <p>
          Take the simplest ratio, capex against return. The bears divide this year&apos;s spend by this
          year&apos;s realized profit and get an alarming number. The bulls divide this year&apos;s spend by
          a forward demand curve and get a reasonable one. Neither is lying. They have chosen different
          denominators, and the entire disagreement lives in that choice.
        </p>

        <p>
          The circular flows make it worse. When Nvidia funds a lab that buys Nvidia chips through a cloud
          that books the revenue, the same dollar can appear as demand in three places. Counting it once
          or counting it three times produces wildly different pictures of how much real, independent
          demand exists. And the depreciation schedule, the thing Burry is poking at, is not observed at
          all. It is an assumption about how long a GPU stays useful, and shifting it a couple of years
          moves reported earnings without moving a single server. You cannot settle a bubble argument with
          a number that the accountants get to choose.
        </p>

        <h2 className="text-2xl font-semibold text-text-primary pt-4">
          The one number that travels: capex as a share of GDP
        </h2>

        <p>
          When the firm-level ratios fail, I reach for the one lens that survives across very different
          eras: total buildout capex measured against the size of the economy. It does not care about a
          single company&apos;s depreciation policy or which entity books a circular dollar. It just asks
          how big the bet is relative to everything else being produced.
        </p>

        <p>
          Even this number is contested, which tells you how unsettled the whole debate is. Estimates of
          AI capex as a share of GDP run from about{' '}
          <a
            href="https://www.goldmansachs.com/insights/articles"
            target="_blank"
            rel="noopener noreferrer"
            className="text-accent-primary hover:underline"
          >
            0.8 percent (Goldman, dividing total AI capex by global GDP)
          </a>{' '}
          to roughly 2 percent (US hyperscaler capex over US GDP near $31.8 trillion). The gap is entirely
          the denominator: global output or US output. Goldman has noted that past technology booms peaked
          above 1.5 percent of GDP, so by the US-only reading the AI boom is already in historic-peak
          territory, and by the global reading it has room to run.
        </p>

        <p>
          The historical analogs put both readings in perspective. The dotcom and telecom fiber buildout
          peaked near 1.0 to 1.2 percent of US GDP around 2000, and by 2002 only about 5 percent of the
          laid fiber was lit, a vivid reminder that real demand can arrive years after the capital does.
          Go back further and the manias get larger, not smaller: the US railroad boom ran near 4.8 percent
          of GNP at its 1880s peak, and the UK Railway Mania hit roughly 7 percent of GDP at its 1847 peak.
          So the AI buildout, even on the aggressive US-only reading near 2 percent, is bigger than dotcom
          but well short of the railroad manias. That single comparison reframes the question from
          &quot;is this a bubble&quot; to &quot;which historical buildout does it rhyme with.&quot;
        </p>

        <p>
          For readers who want to track that comparison themselves rather than take my framing on faith,
          TensorFeed publishes the historical capital-buildout series and the live AI capex figures at its{' '}
          <code className="text-accent-primary">/api/capital-cycles</code> and{' '}
          <code className="text-accent-primary">/api/ai-datacenters</code> endpoints, alongside the{' '}
          <Link href="/funding/portfolio" className="text-accent-primary hover:underline">
            funding portfolio tracker
          </Link>
          . It is one of a few places to line up the railroad, fiber, and AI cycles on the same axis. The
          live spend, the model landscape on{' '}
          <Link href="/model-wars" className="text-accent-primary hover:underline">
            model wars
          </Link>
          , and the day&apos;s capital headlines on{' '}
          <Link href="/today" className="text-accent-primary hover:underline">
            today
          </Link>{' '}
          are where I check whether the trend is bending.
        </p>

        <h2 className="text-2xl font-semibold text-text-primary pt-4">Our Take</h2>

        <p>
          This is a buildout, not a bubble in the dotcom sense, but it is a buildout that is being financed
          and accounted for in ways that should make everyone nervous. Those are not contradictory
          statements. The demand signal is real: sold-out capacity and a rival paying nine figures a month
          for idle GPUs are not what fake demand looks like. At roughly 2 percent of US GDP on the
          aggressive reading, the bet is large but it is closer to the dotcom buildout than to the railroad
          manias that ran four to seven times higher. The capital is not insane relative to history.
        </p>

        <p>
          The risk is not the size of the bet. It is the quality of the scoreboard. The 95 percent
          no-return pilot figure from MIT, the circular vendor financing, and the depreciation schedules
          that the operators get to set are three different ways of saying the same thing: the industry is
          marking its own homework. A buildout this large funded on assumptions this soft does not need a
          demand collapse to hurt people. It just needs the depreciation math to prove optimistic, or one
          link in the Nvidia-to-lab-to-cloud loop to stall, and the circular dollars unwind faster than
          they stacked up. I have watched booms that were directionally right still wipe out the investors
          who bought the peak, because the timing and the accounting, not the thesis, are what kill you.
        </p>

        <p>
          So my call is specific. Stop arguing about whether it is a bubble, because the word is doing no
          work when the two sides cannot agree on a denominator. Watch three things instead. First, capex
          as a share of GDP: if the US-only reading pushes past the 1.5 percent zone where prior booms
          peaked and keeps climbing, the railroad comparison starts to bite. Second, the depreciation
          disclosures: if more operators quietly extend server useful-life assumptions the way Burry
          alleges, that is the tell that earnings are being managed rather than earned. Third, whether the
          circular financing keeps growing as a share of the demand. The thesis can be right and the trade
          can still be a disaster. Both of those can be true at once, and right now they are.
        </p>
      </div>

      {/* Related */}
      <footer className="mt-12 pt-8 border-t border-border">
        <h2 className="text-lg font-semibold text-text-primary mb-4">Related</h2>
        <div className="grid gap-3">
          <Link
            href="/originals/spacex-ipo-anthropic-colossus-compute"
            className="block bg-bg-secondary border border-border rounded-lg px-4 py-3 hover:border-accent-primary transition-colors"
          >
            <span className="text-text-primary text-sm">
              The Biggest IPO in History Is Also an AI-Compute Disclosure. SpaceX&apos;s S-1 Surfaced
              the Anthropic-Colossus Lease.
            </span>
          </Link>
          <Link
            href="/originals/government-equity-stakes-ai-labs-ipo-window"
            className="block bg-bg-secondary border border-border rounded-lg px-4 py-3 hover:border-accent-primary transition-colors"
          >
            <span className="text-text-primary text-sm">
              Trump and Sanders Now Want the Same Thing: Government Equity in the AI Labs. The Timing Is
              the Story.
            </span>
          </Link>
          <Link
            href="/funding/portfolio"
            className="block bg-bg-secondary border border-border rounded-lg px-4 py-3 hover:border-accent-primary transition-colors"
          >
            <span className="text-text-primary text-sm">
              The AI funding portfolio: who is spending the capital, tracked by company and segment.
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
