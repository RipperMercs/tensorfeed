import { Metadata } from 'next';
import Link from 'next/link';
import { ArrowLeft, Clock, Cpu } from 'lucide-react';
import { ArticleJsonLd } from '@/components/seo/JsonLd';
import ArticleHero from '@/components/originals/ArticleHero';
import ShareBar from '@/components/originals/ShareBar';

export const metadata: Metadata = {
  alternates: { canonical: 'https://tensorfeed.ai/originals/google-spacex-30b-colossus-2-compute' },
  title: 'Google Has TPUs. So Why Is It Paying SpaceX $30 Billion for Nvidia GPUs?',
  description:
    "SpaceX's amended S-1, filed June 5 ahead of its June 11 pricing, disclosed a Cloud Service Agreement with Google for roughly 110,000 Nvidia GPUs at the Colossus 2 campus in Southaven, Mississippi: $920 million a month at full rate, October 2026 through June 2029, about $30 billion if it runs the full course. Google has its own TPUs and a $200B Anthropic backlog feeding them. Renting Nvidia capacity from a launch company looks like the wrong direction on paper. Read the termination clause and the picture flips: 90-day mutual exit after December 31, 2026, capacity penalties if SpaceX misses September 30, and Musk's own 1 GW claim already trimmed to 350 MW by satellite imagery. The headline is a 33-month contract. The structure is a 6-month firm with a 27-month option, and the second SpaceX cluster lease to surface in an S-1 in two weeks tells you the compute market just sprouted a secondary layer.",
  openGraph: {
    title: 'Google Has TPUs. So Why Is It Paying SpaceX $30 Billion for Nvidia GPUs?',
    description:
      "SpaceX's S-1 amendment disclosed a $920M-a-month Google contract for 110,000 Nvidia GPUs at Colossus 2. Read the termination clause: it is a 6-month firm with a 27-month option, not a 33-month contract.",
    type: 'article',
    publishedTime: '2026-06-10T14:00:00Z',
    authors: ['Marcus Chen'],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Google Has TPUs. So Why Is It Paying SpaceX $30 Billion for Nvidia GPUs?',
    description:
      'SpaceX is renting Google 110,000 Nvidia GPUs at Colossus 2 for $920M a month. The termination clause is the story.',
  },
};

export default function GoogleSpaceX30BColossus2ComputePage() {
  return (
    <article className="max-w-3xl mx-auto px-4 sm:px-6 py-10">
      <ArticleJsonLd
        title="Google Has TPUs. So Why Is It Paying SpaceX $30 Billion for Nvidia GPUs?"
        description="SpaceX's amended S-1 disclosed a Cloud Service Agreement with Google: about 110,000 Nvidia GPUs at Colossus 2 in Southaven, Mississippi, $920 million a month at full rate from October 2026 through June 2029, roughly $30 billion total. The termination clauses reframe a 33-month contract as a 6-month firm with a 27-month option."
        datePublished="2026-06-10"
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

      {/* Hero (graphic mode: Google blue to SpaceX rocket amber) */}
      <ArticleHero
        mode="graphic"
        icon={Cpu}
        gradientFrom="#1e40af"
        gradientTo="#b45309"
        eyebrow="Markets &middot; AI Infrastructure"
      />

      {/* Header */}
      <header className="mb-10">
        <h1 className="text-3xl sm:text-4xl font-bold text-text-primary mb-4 leading-tight">
          Google Has TPUs. So Why Is It Paying SpaceX $30 Billion for Nvidia GPUs?
        </h1>
        <div className="flex items-center gap-3 text-sm text-text-muted">
          <span className="text-text-secondary font-medium">Marcus Chen</span>
          <span>&middot;</span>
          <time dateTime="2026-06-10">June 10, 2026</time>
          <span>&middot;</span>
          <span className="flex items-center gap-1">
            <Clock className="w-3.5 h-3.5" />
            6 min read
          </span>
        </div>
      </header>

      <ShareBar
        path="/originals/google-spacex-30b-colossus-2-compute"
        title="Google Has TPUs. So Why Is It Paying SpaceX $30 Billion for Nvidia GPUs?"
      />

      {/* Article body */}
      <div className="prose-custom space-y-6 text-text-secondary leading-relaxed">
        <p className="text-lg text-text-primary leading-relaxed">
          SpaceX filed an amended S-1 on June 5, six days before it prices the biggest IPO in
          history, and the document carried a second compute disclosure that nobody on the road
          show was selling. Google signed a Cloud Service Agreement with SpaceX for roughly
          110,000 Nvidia GPUs at the Colossus 2 campus in Southaven, Mississippi: $920 million a
          month at full rate, October 2026 through June 2029, with a reduced ramp fee from June
          through September. Run the contract its full 33 months and Google pays SpaceX about $30
          billion for capacity at someone else&apos;s data center.
        </p>

        <p>
          I have read the filing twice. The headline is wrong on purpose. This is not a 33-month
          contract. It is a 6-month firm commitment with a 27-month option, and the structure
          tells you more about where the compute market is headed than the dollar number does.
        </p>

        <h2 className="text-2xl font-semibold text-text-primary pt-4">The Math Nobody Wants to Read Twice</h2>

        <p>
          Add the two SpaceX cluster leases now sitting in the filing. Anthropic pays $1.25
          billion a month for the full output of Colossus 1, the ~220,000-GPU Memphis cluster we{' '}
          <Link href="/originals/spacex-ipo-anthropic-colossus-compute" className="text-accent-primary hover:underline">
            wrote up last week when the original S-1 surfaced it
          </Link>
          . Google adds $920 million a month at Colossus 2. Combined: about $2.17 billion a month
          of contracted compute revenue, or roughly $26 billion annualized once both clusters
          ramp.
        </p>

        <div className="bg-bg-secondary border border-border rounded-lg overflow-x-auto my-6">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border">
                <th className="text-left px-4 py-3 text-text-primary font-semibold">Lease</th>
                <th className="text-left px-4 py-3 text-text-primary font-semibold">Customer</th>
                <th className="text-left px-4 py-3 text-text-primary font-semibold">Asset</th>
                <th className="text-left px-4 py-3 text-text-primary font-semibold">Monthly</th>
                <th className="text-left px-4 py-3 text-text-primary font-semibold">Term</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              <tr>
                <td className="px-4 py-3 text-accent-primary font-medium">Colossus 1</td>
                <td className="px-4 py-3">Anthropic</td>
                <td className="px-4 py-3">~220K GPUs, Memphis, full output</td>
                <td className="px-4 py-3 font-mono">$1.25B</td>
                <td className="px-4 py-3">Through May 2029 (filing) / 180 days (Musk)</td>
              </tr>
              <tr>
                <td className="px-4 py-3 text-accent-primary font-medium">Colossus 2</td>
                <td className="px-4 py-3">Google</td>
                <td className="px-4 py-3">~110K Nvidia GPUs, Southaven MS</td>
                <td className="px-4 py-3 font-mono">$920M</td>
                <td className="px-4 py-3">Oct 2026 through June 2029, 90-day exit</td>
              </tr>
              <tr>
                <td className="px-4 py-3 text-accent-primary font-medium">Combined</td>
                <td className="px-4 py-3">Two frontier customers</td>
                <td className="px-4 py-3">SpaceX-owned, xAI-built</td>
                <td className="px-4 py-3 font-mono">~$2.17B</td>
                <td className="px-4 py-3">~$26B annualized at full ramp</td>
              </tr>
            </tbody>
          </table>
        </div>

        <p>
          $26 billion of annualized compute revenue is bigger than every neocloud not named
          CoreWeave, which exited 2025 around $1.92 billion in quarterly run rate. SpaceX did not
          announce a cloud business. The IPO calendar surfaced one.
        </p>

        <h2 className="text-2xl font-semibold text-text-primary pt-4">Why Google Is Renting Nvidia at All</h2>

        <p>
          The instinctive question is the right one: Google has its own silicon. The Anthropic
          TPU mega-commitment, which we walked through{' '}
          <Link href="/originals/anthropic-200b-google-tpu-math" className="text-accent-primary hover:underline">
            in the $200B math piece
          </Link>
          , locks Anthropic to roughly $40 billion a year of Google compute through 2032 and gives
          Google a guaranteed TPU off-taker. So why does Google&apos;s data center wing need to
          rent 110,000 Blackwell-class Nvidia GPUs from a launch company?
        </p>

        <p>
          Three answers, in order of how loudly people inside Google Cloud will say them out loud.
        </p>

        <p>
          One, customer capture. A meaningful slice of Google Cloud&apos;s enterprise pipeline
          will not move workloads off Nvidia, because their model code, their tooling, and their
          existing fine-tunes are CUDA-bound. Google needs Nvidia inventory on hand to keep those
          contracts from drifting to AWS or Azure. The fastest way to get 110,000 Blackwell-class
          GPUs in the ground in Q4 2026 is to rent a cluster a competitor already built.
        </p>

        <p>
          Two, TPU hedging. The TPU strategy works if customer demand follows the Anthropic
          template. It works less well if demand stalls and Google Cloud is left holding TPU
          inventory while the market wants Nvidia. Renting from SpaceX is short-tenor Nvidia
          exposure that Google can shut off after a year. That is the kind of optionality a
          capacity-planning team begs for.
        </p>

        <p>
          Three, sub-leasing. Google Cloud already serves Anthropic, and Anthropic&apos;s
          multi-silicon posture (TPU + Trainium + Nvidia + soon possibly Maia 200, which we
          covered{' '}
          <Link href="/originals/anthropic-maia-200-fourth-chip-inference" className="text-accent-primary hover:underline">
            yesterday
          </Link>
          ) means Anthropic still buys Nvidia capacity through Google Cloud on top of the TPU
          commitment. Google effectively recycles the Colossus 2 rent through its own customer
          stack. Whether the deal economics work for Google depends entirely on the implicit
          markup, and that part is not in any filing.
        </p>

        <h2 className="text-2xl font-semibold text-text-primary pt-4">The Termination Clause Is the Contract</h2>

        <p>
          The exit terms are why the 33-month framing is misleading. Per the S-1 amendment, either
          party can walk after December 31, 2026, on 90 days&apos; notice. SpaceX has a separate
          performance clause: if it fails to deliver the committed GPU capacity by September 30,
          2026, Google can terminate after a one-month grace period, or accept whatever capacity
          is online at a proportionally reduced fee.
        </p>

        <p>
          Translation: Google has a hard six months of firm cost (October 2026 through March
          2027, the 90 days plus the December cutoff), and everything after that is optional.
          SpaceX has an even shorter firm window, because if its capacity lights up late, Google
          gets to leave early. The contract reads as $30 billion. The downside-bounded commitment
          is closer to $5.5 billion.
        </p>

        <p>
          That structure is the same shape we flagged on Anthropic&apos;s Colossus 1 lease, where
          the S-1 calls it a fee through May 2029 and Musk publicly described a 180-day rolling
          rental. Two large compute leases, both at SpaceX, both with the long number on paper
          and the short number in the cancellation clause. That is not a coincidence. It is the
          new shape of large compute contracts in a market where capacity is uncertain on both
          sides of the trade.
        </p>

        <h2 className="text-2xl font-semibold text-text-primary pt-4">What Colossus 2 Actually Is</h2>

        <p>
          One reason the termination penalty exists: Colossus 2 is not yet what its owner said it
          was. xAI built the cluster in Southaven and turned it on in January. Musk claimed 1
          gigawatt of capacity at launch. Independent satellite imagery in the same month showed
          cooling equipment sized for roughly 350 megawatts. The 110,000-GPU figure in the Google
          contract maps reasonably to that lower number, not to the marketing claim.
        </p>

        <p>
          Two things follow. First, xAI itself has moved off Colossus 1 to Colossus 2 for its own
          training, which is what freed Colossus 1 to be sublet to Anthropic in the first place.
          Second, Google&apos;s contractual right to terminate if capacity is short is not a
          theoretical hedge. The capacity gap between claim and delivery is already visible from
          orbit, and Google&apos;s deal team wrote the clause anyway.
        </p>

        <h2 className="text-2xl font-semibold text-text-primary pt-4">What This Means for the Compute Market</h2>

        <p>
          Three things, none of which are priced into anyone&apos;s 2027 numbers yet.
        </p>

        <p>
          One, the compute market is now a two-sided market with a secondary layer. Through 2025
          the cloud business was hyperscalers selling to enterprises and frontier labs renting
          everything they could find. As of this month, hyperscalers rent from each other, labs
          rent from each other, and a launch company is renting to both. Compute is liquid in a
          way it was not last year. The pricing power that came from owning the capacity is being
          redistributed.
        </p>

        <p>
          Two, the SpaceX IPO disclosure regime has become the most useful public source on AI
          compute terms anywhere. In two weeks, the SEC filing process has surfaced both the
          Anthropic-Colossus lease and the Google-Colossus 2 lease. Neither side of either deal
          would have disclosed those numbers voluntarily. The cleanest information you can get on
          the compute layer right now is in an S-1, not in an analyst report, because anyone
          consolidating a hyperscale revenue line has to disclose customer concentration and
          material contracts. Expect more of this once OpenAI&apos;s public S-1 lands in
          September.
        </p>

        <p>
          Three, the rent-vs-build math has flipped for the back half of 2026. New TPU and Maia
          capacity does not arrive at scale until 2027, the floor we walked through in the
          original{' '}
          <Link href="/originals/anthropic-200b-google-tpu-math" className="text-accent-primary hover:underline">
            $200B TPU piece
          </Link>
          . Until then, the only way to add 100,000-plus GPUs in six months is to take a cluster
          someone else lit up first. SpaceX, which got into compute because xAI moved its
          training off, is the only seller in the market with that much idle capacity that is
          also Nvidia-current. The shape of this market in 2027, when the new buildouts come
          online, is going to look completely different. The shape in Q4 2026 looks like
          this contract.
        </p>

        <h2 className="text-2xl font-semibold text-text-primary pt-4">Our Take</h2>

        <p>
          The clean version of this story is that Google is bridging an Nvidia capacity gap for
          eighteen months and SpaceX is taking the cash. That is true, and it is the version of
          the story almost every outlet ran on Friday. The interesting version is that the two
          biggest compute contracts of 2026 are both back-half-cancelable on three months&apos;
          notice, and both came out of a single IPO filing in Memphis. The cloud industry is
          quietly pricing in shorter commitments because nobody on either side of the trade is
          willing to be long compute past the 2027 buildout wave. The contract length got cut in
          half and nobody renamed the deal.
        </p>

        <p>
          Practical implication for builders. The inference price floor we modeled in{' '}
          <Link href="/originals/ai-pricing-floor" className="text-accent-primary hover:underline">
            the pricing-floor analysis
          </Link>{' '}
          assumes a fully built-out 2027 supply curve. If Colossus 2 underdelivers, or Google
          exercises its exit, you get a sharp pre-2027 squeeze that pushes inference prices the
          other way for two quarters. Watch the September 30 capacity milestone and the December
          31 cancellation gate. Both are now public, both are dated, and both will move the API
          price of every model running on Nvidia.
        </p>

        <p>
          We are tracking the SpaceX IPO date (June 11 pricing, June 12 debut as SPCX at a fixed
          $135 a share) and the corresponding compute disclosures on our{' '}
          <Link href="/providers" className="text-accent-primary hover:underline">
            provider pages
          </Link>
          . The next disclosure to watch: whether OpenAI&apos;s public S-1 includes a cluster
          lease of its own, or whether OpenAI&apos;s compute story stays entirely inside the
          Microsoft and Oracle relationships. The pattern set by SpaceX this month says you will
          be reading it in a filing either way.
        </p>

        <p className="text-sm text-text-muted">
          Sources:{' '}
          <a
            href="https://www.cnbc.com/2026/06/05/google-to-pay-spacex-920-million-a-month-for-xai-compute-capacity.html"
            target="_blank"
            rel="noopener noreferrer"
            className="text-accent-primary hover:underline"
          >
            CNBC
          </a>
          ,{' '}
          <a
            href="https://techcrunch.com/2026/06/05/google-will-pay-spacex-920m-per-month-for-compute/"
            target="_blank"
            rel="noopener noreferrer"
            className="text-accent-primary hover:underline"
          >
            TechCrunch
          </a>
          ,{' '}
          <a
            href="https://www.tomshardware.com/tech-industry/artificial-intelligence/google-signs-usd920m-monthly-compute-deal-with-spacex-companys-projected-annual-data-center-revenue-to-exceed-its-combined-proceeds-from-starlink-launch-services-and-ai-in-2025"
            target="_blank"
            rel="noopener noreferrer"
            className="text-accent-primary hover:underline"
          >
            Tom&apos;s Hardware
          </a>
          ,{' '}
          <a
            href="https://www.datacenterdynamics.com/en/news/google-to-pay-920-million-to-spacex-monthly-for-ai-capacity/"
            target="_blank"
            rel="noopener noreferrer"
            className="text-accent-primary hover:underline"
          >
            Data Center Dynamics
          </a>
          ,{' '}
          <a
            href="https://www.sec.gov/Archives/edgar/data/1181412/000162828026040364/spaceexplorationtechnologib.htm"
            target="_blank"
            rel="noopener noreferrer"
            className="text-accent-primary hover:underline"
          >
            SpaceX S-1/A
          </a>
          .
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
              The Biggest IPO in History Is Also an AI-Compute Disclosure. SpaceX&apos;s S-1
              Surfaced the Anthropic-Colossus Lease.
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
          <Link
            href="/originals/anthropic-maia-200-fourth-chip-inference"
            className="block bg-bg-secondary border border-border rounded-lg px-4 py-3 hover:border-accent-primary transition-colors"
          >
            <span className="text-text-primary text-sm">
              Anthropic Is Negotiating a Fourth Chip. Claude Inference Just Stopped Being a Nvidia
              Story.
            </span>
          </Link>
          <Link
            href="/originals/anthropic-spacexai-colossus-orbital"
            className="block bg-bg-secondary border border-border rounded-lg px-4 py-3 hover:border-accent-primary transition-colors"
          >
            <span className="text-text-primary text-sm">
              Anthropic Just Booked 220K GPUs on Colossus 1. The Orbital Footnote Is the Bigger
              Story.
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
