import { Metadata } from 'next';
import Link from 'next/link';
import { ArrowLeft, Clock, Building2 } from 'lucide-react';
import { ArticleJsonLd } from '@/components/seo/JsonLd';
import ArticleHero from '@/components/originals/ArticleHero';
import ShareBar from '@/components/originals/ShareBar';

export const metadata: Metadata = {
  alternates: { canonical: 'https://tensorfeed.ai/originals/meta-blackrock-el-paso-14b-second-eighty-twenty-jv' },
  title: "Meta Handed BlackRock 80 Percent of a $14 Billion El Paso Data Center. That's the Second 80/20 JV in Nine Months.",
  description:
    "On Tuesday, July 28, 2026, Meta and BlackRock announced a $14 billion, 1 gigawatt data center in El Paso for a 2028 launch, with Meta as the only tenant, BlackRock funds owning 80 percent, Meta keeping 20, Meta contributing $2.3B in land and pocketing a $1B one-time payment, BlackRock writing $4.9B of cash, and $12.5B of bonds sitting on top of the capital stack. The El Paso structure is the same 80/20 template Meta already used with Blue Owl in October 2025 to build Hyperion in Richland Parish, since expanded to 5 gigawatts and $50 billion. Two JVs in nine months, both with an asset manager holding title on the gigawatt while Meta writes a compute offtake and gets the tokens. Inside the numbers, the accounting read, why the headline CapEx line is going to stop meaning what analysts think it means, and how this rhymes with the NAVER and Brookfield financing template we walked through yesterday.",
  openGraph: {
    title: "Meta Handed BlackRock 80 Percent of a $14 Billion El Paso Data Center. That's the Second 80/20 JV in Nine Months.",
    description:
      "Meta and BlackRock announce $14B, 1GW, 2028 in El Paso, structured 80/20 with Meta as sole tenant. The El Paso deal is Meta's second identical JV template in nine months. Hyperscaler gigawatts are moving off balance sheet.",
    type: 'article',
    publishedTime: '2026-07-28T14:00:00Z',
    authors: ['Marcus Chen'],
  },
  twitter: {
    card: 'summary_large_image',
    title: "Meta Handed BlackRock 80 Percent of a $14 Billion El Paso Data Center.",
    description:
      "Second 80/20 hyperscaler JV in nine months. The template is now the story: asset managers hold title on the gigawatt, hyperscalers keep the offtake.",
  },
};

export default function MetaBlackRockElPasoPage() {
  return (
    <article className="max-w-3xl mx-auto px-4 sm:px-6 py-10">
      <ArticleJsonLd
        title="Meta Handed BlackRock 80 Percent of a $14 Billion El Paso Data Center. That's the Second 80/20 JV in Nine Months."
        description="Meta and BlackRock announced a $14 billion, 1 gigawatt data center in El Paso for a 2028 launch, structured as an 80/20 JV with Meta as sole tenant. It is the second identical hyperscaler JV template in nine months, following the Blue Owl Hyperion deal in October 2025 that has since expanded to $50 billion. Hyperscaler CapEx is moving off balance sheet at scale."
        datePublished="2026-07-28"
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

      {/* Hero (graphic mode: deep finance blue to dark gold) */}
      <ArticleHero
        mode="graphic"
        icon={Building2}
        gradientFrom="#0A2540"
        gradientTo="#8B7A2E"
        eyebrow="Markets &middot; AI Infrastructure"
      />

      {/* Header */}
      <header className="mb-10">
        <h1 className="text-3xl sm:text-4xl font-bold text-text-primary mb-4 leading-tight">
          Meta Handed BlackRock 80 Percent of a $14 Billion El Paso Data Center. That&apos;s the Second 80/20 JV in Nine Months.
        </h1>
        <div className="flex items-center gap-3 text-sm text-text-muted">
          <span className="text-text-secondary font-medium">Marcus Chen</span>
          <span>&middot;</span>
          <time dateTime="2026-07-28">July 28, 2026</time>
          <span>&middot;</span>
          <span className="flex items-center gap-1">
            <Clock className="w-3.5 h-3.5" />
            7 min read
          </span>
        </div>
      </header>

      <ShareBar
        path="/originals/meta-blackrock-el-paso-14b-second-eighty-twenty-jv"
        title="Meta Handed BlackRock 80 Percent of a $14 Billion El Paso Data Center. That's the Second 80/20 JV in Nine Months."
      />

      {/* Article body */}
      <div className="prose-custom space-y-6 text-lg text-text-primary leading-relaxed">
        <p className="text-lg text-text-primary leading-relaxed">
          Meta and BlackRock filed a joint press release before the open on Tuesday, July 28, 2026,
          announcing a $14 billion, 1 gigawatt data center campus in El Paso, Texas. Site launch is
          scheduled for 2028. Meta will be the first and only tenant. Funds managed by BlackRock
          own 80 percent of the joint venture. Meta owns 20 and contributes the land and other
          assets at a value of roughly $2.3 billion. BlackRock puts in $4.9 billion of cash. Meta
          receives a $1 billion one-time payment on close. A $12.5 billion bond offering finances
          the rest of the capital stack.
        </p>

        <p>
          Read the ownership split first. Eighty percent of a 1 GW AI campus is going to sit on
          BlackRock&apos;s books. Meta contributes the site, signs the offtake, and gets a check
          on the way in.
        </p>

        <p>
          The reason this deal reads the way it does is that Meta has done it before. In October
          2025, Meta and Blue Owl Capital formed an identical 80/20 joint venture for the Hyperion
          campus in Richland Parish, Louisiana, then valued at roughly $27 billion. Meta expanded
          Hyperion two weeks ago to 5 gigawatts and $50 billion of total build. Two JVs, two asset
          managers on the majority side, and one hyperscaler on the tenancy line. The template is
          now the story.
        </p>

        <h2 className="text-2xl font-semibold text-text-primary pt-4">The Numbers</h2>

        <div className="bg-bg-secondary border border-border rounded-lg overflow-x-auto my-6">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border">
                <th className="text-left px-4 py-3 text-text-primary font-semibold">Line item</th>
                <th className="text-left px-4 py-3 text-text-primary font-semibold">El Paso, July 28, 2026</th>
                <th className="text-left px-4 py-3 text-text-primary font-semibold">Hyperion, October 2025 (now expanded)</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              <tr>
                <td className="px-4 py-3 text-accent-primary font-medium">Total build cost</td>
                <td className="px-4 py-3 font-mono">$14B</td>
                <td className="px-4 py-3 font-mono">$27B on original close, $50B post July 13</td>
              </tr>
              <tr>
                <td className="px-4 py-3 text-accent-primary font-medium">Capacity</td>
                <td className="px-4 py-3 font-mono">1 GW</td>
                <td className="px-4 py-3 font-mono">2 GW at close, 5 GW after expansion</td>
              </tr>
              <tr>
                <td className="px-4 py-3 text-accent-primary font-medium">Asset manager partner</td>
                <td className="px-4 py-3">BlackRock (funds managed)</td>
                <td className="px-4 py-3">Blue Owl Capital</td>
              </tr>
              <tr>
                <td className="px-4 py-3 text-accent-primary font-medium">Ownership split</td>
                <td className="px-4 py-3 font-mono">80 / 20</td>
                <td className="px-4 py-3 font-mono">80 / 20</td>
              </tr>
              <tr>
                <td className="px-4 py-3 text-accent-primary font-medium">Meta contribution</td>
                <td className="px-4 py-3">~$2.3B in land and assets</td>
                <td className="px-4 py-3">Land, entitlements, permits</td>
              </tr>
              <tr>
                <td className="px-4 py-3 text-accent-primary font-medium">Meta one-time payment on close</td>
                <td className="px-4 py-3 font-mono">$1B</td>
                <td className="px-4 py-3">Not disclosed at the same line</td>
              </tr>
              <tr>
                <td className="px-4 py-3 text-accent-primary font-medium">Cash from asset manager</td>
                <td className="px-4 py-3 font-mono">$4.9B</td>
                <td className="px-4 py-3">Majority position, terms private</td>
              </tr>
              <tr>
                <td className="px-4 py-3 text-accent-primary font-medium">Debt tranche</td>
                <td className="px-4 py-3 font-mono">$12.5B in bonds</td>
                <td className="px-4 py-3">Project-level debt, laddered</td>
              </tr>
              <tr>
                <td className="px-4 py-3 text-accent-primary font-medium">Anchor tenant</td>
                <td className="px-4 py-3">Meta (sole, first)</td>
                <td className="px-4 py-3">Meta (sole, first)</td>
              </tr>
              <tr>
                <td className="px-4 py-3 text-accent-primary font-medium">First-tokens window</td>
                <td className="px-4 py-3 font-mono">2028</td>
                <td className="px-4 py-3 font-mono">2 GW by 2030, 5 GW date open</td>
              </tr>
            </tbody>
          </table>
        </div>

        <p>
          Sum the two campuses at their current sizing: 6 gigawatts, $64 billion of build cost,
          both structured so that the hyperscaler holds the smaller equity slice on the property
          and books the compute as an operating expense on the way out. Meta is the sole tenant on
          both. If you were sizing Meta&apos;s effective compute exposure by counting only the
          20 percent equity share of these JVs, you would miss most of it.
        </p>

        <h2 className="text-2xl font-semibold text-text-primary pt-4">What the Structure Actually Does</h2>

        <p>
          An 80/20 project-finance JV with an asset manager on the majority side is not a
          traditional data center lease and it is not a build-to-suit. It is a purpose-built
          special vehicle that owns the physical campus, borrows against the anchor tenant&apos;s
          contracted rent, and depreciates the building on the asset manager&apos;s books.
        </p>

        <p>
          Three things happen at the same time when a hyperscaler runs this playbook. One, the
          gigawatt does not land on the hyperscaler&apos;s balance sheet at cost, only the 20
          percent equity contribution and the lease commitments do. Two, the tenant obligation
          becomes an operating item that spreads over the term of the take-or-pay contract instead
          of a lump-sum capital line in the year the campus is built. Three, the asset manager
          gets a long-duration, credit-grade income stream backed by the strongest offtake in the
          US corporate market: a hyperscaler paying rent on compute that services its own
          revenue base.
        </p>

        <p>
          The $1 billion one-time payment is the tell. Meta contributed roughly $2.3 billion of
          land and assets, took a $1 billion check out at close, and ended up with a 20 percent
          equity stake in a $14 billion project. In practical terms, Meta got compensated on the
          way in for the entitlements it had already spent to get the site permittable. That is
          how a hyperscaler turns a land bank into working capital while still guaranteeing itself
          the compute output.
        </p>

        <h2 className="text-2xl font-semibold text-text-primary pt-4">The NAVER Rhyme</h2>

        <p>
          We walked through the NAVER, NVIDIA, and Brookfield deal yesterday: a $10 billion Korean
          sovereign AI factory with Brookfield as the exclusive project-finance partner on a
          non-binding term sheet, NVIDIA writing a $1 billion equity alignment check, and NAVER
          carrying the tenancy. The El Paso deal is the same shape with the country and the
          counterparties swapped. Asset manager on the majority position, hyperscaler-adjacent
          equity on top for alignment, contracted offtake underneath, and a gigawatt of physical
          asset in the middle that nobody wants sitting on the operating company&apos;s balance
          sheet.
        </p>

        <p>
          The pattern is the same because the problem is the same. A gigawatt AI campus takes 24
          to 36 months to build, needs $10 billion to $50 billion of capital, and has an anchor
          tenant that has to guarantee the offtake for the debt to price. Whether the tenant is a
          Korean incumbent (NAVER), a US hyperscaler (Meta), or a frontier lab (Anthropic on TPU,
          on Trainium, on Colossus, and now on MI450), the capital does not want to sit on the
          tenant&apos;s books. It sits on an asset manager&apos;s.
        </p>

        <p>
          The financing loop we tracked through Q1 and Q2 (Google recycling $40 billion of equity
          into Anthropic TPU offtake, AMD writing $5 billion into{' '}
          <Link href="/originals/amd-anthropic-2gw-mi450-fifth-vendor" className="text-accent-primary hover:underline">
            Anthropic against 2 GW of MI450
          </Link>
          , NVIDIA sending $40 billion into OpenAI to anchor Vera Rubin) is the vendor version of
          the same trade. The El Paso deal is the landlord version. Both close the same
          loop. Both offload the balance sheet weight of the physical buildout to a party whose
          business model is holding long-duration assets.
        </p>

        <h2 className="text-2xl font-semibold text-text-primary pt-4">What This Does to CapEx Analysis</h2>

        <p>
          Meta&apos;s 2026 CapEx guidance is in the $145 billion to $155 billion range. Google
          just raised full-year 2026 CapEx to $195 billion to $205 billion,{' '}
          <Link href="/originals/google-cloud-514b-backlog-tpu-in-customer-dc" className="text-accent-primary hover:underline">
            per the July 22 earnings call
          </Link>
          . Microsoft, Amazon, and Meta together are running roughly $500 billion of stated 2026
          CapEx across the hyperscaler complex. Those numbers get quoted every quarter in the AI
          bubble debate. They also get less informative every quarter, because more of the
          effective compute buildout is being financed off balance sheet through structures like
          this one.
        </p>

        <p>
          On the disclosed numbers, Meta&apos;s 20 percent equity stake in El Paso is worth
          roughly $460 million against a $14 billion build. Meta will book its 20 percent share
          of the JV under equity method accounting, and the lease payments will show up as
          operating expense once the site is producing tokens. The other 80 percent (roughly
          $11.2 billion of underlying asset cost, plus the $12.5 billion of bonds sitting above
          it) is somebody else&apos;s balance sheet problem. Repeat the exercise for Hyperion at
          $50 billion, and Meta is running two of the largest AI campuses in the western
          hemisphere with a low single-digit-billion equity footprint on its own books.
        </p>

        <p>
          Two things follow. First, the CapEx number the market reads on a hyperscaler earnings
          call is now a lower bound on effective compute spend, not the ceiling. Analysts have to
          look through the JV commitments (usually disclosed in the 10-K commitments and
          contingencies note, sometimes only reconcilable a quarter or two after the fact) to
          size the full exposure. Second, the risk sitting behind the compute buildout is
          migrating from hyperscaler shareholders to asset manager LPs. If the AI revenue curve
          keeps up, the LPs get a long-duration credit-grade yield and everyone wins. If it does
          not, the loss sits on BlackRock and Blue Owl clients instead of Meta.
        </p>

        <p>
          This is not new financial engineering. Telcos did it with cell towers. Real estate did
          it forever. What is new is the pace and the scale: an entire compute buildout for the
          largest hyperscaler complex in history is running through JV structures that did not
          exist at this size two years ago, financed by private credit funds that raised the
          capital specifically for AI infrastructure.
        </p>

        <h2 className="text-2xl font-semibold text-text-primary pt-4">Where the Rest of the Complex Goes</h2>

        <p>
          Meta is out in front on this structure but is not going to be alone for long.
          Microsoft, Amazon, and Google all have the same problem: build $150 billion to $200
          billion of physical infrastructure per year without breaking the operating margin line
          that funds the equity story. The obvious next steps to watch are Google finding an
          equivalent to Blue Owl or BlackRock on a US TPU campus, Microsoft splitting one of the
          Wisconsin or Georgia builds off through a private-credit JV, and Amazon doing the same
          on a Trainium 3 campus. OpenAI is a special case, because it is not public and has
          already told the market it plans to lean hard on{' '}
          <Link href="/originals/openai-oracle-credits-frontier-procurement" className="text-accent-primary hover:underline">
            third-party procurement
          </Link>
          , but the same structural logic applies: keep the tokens, ship the balance sheet weight.
        </p>

        <p>
          Two categories of counterparty are best positioned. BlackRock, Blue Owl, Brookfield,
          and Apollo raised dedicated AI infrastructure funds in the last 18 months. Their
          mandates are long-duration, credit-linked, and specifically sized for gigawatt-scale
          builds. Ten years ago this deal shape did not fit any existing private credit fund
          because the assets did not exist at this scale. Now the assets, the funds, and the
          hyperscaler counterparties all exist at the same time, and the term sheets are getting
          traced.
        </p>

        <h2 className="text-2xl font-semibold text-text-primary pt-4">Our Take</h2>

        <p>
          The El Paso deal is not the biggest number of the week. Hyperion at 5 gigawatts and $50
          billion is. But the El Paso deal is the more important one, because it is the second
          instance of the same template, and templates are what turn one-off dealmaking into
          repeatable market structure. When you see a hyperscaler and an asset manager settle on
          an 80/20 split with the tenant retaining land contribution and taking a modest cash
          payment at close, you are looking at what the next $500 billion of AI infrastructure is
          going to be financed like.
        </p>

        <p>
          The uncomfortable version of the same read: hyperscalers have found a way to keep
          building at gigawatt scale while limiting the balance sheet exposure the market can
          see. That is good for hyperscaler equity, good for asset manager fee income, and
          neutral to positive for the actual buildout timeline. It is worse for anyone trying to
          look at published CapEx numbers and infer how much AI compute is actually being
          contracted. The bull case for AI CapEx just became structurally harder to disprove,
          because much of the spend is now happening one step off the reported line.
        </p>

        <p>
          Three signposts. First, whether Meta names a third asset manager on a third US JV
          before the end of 2026 (the pattern locks if it does). Second, whether Google,
          Microsoft, or Amazon files a comparable 80/20 project-finance JV on a named US site by
          Q1 2027 (if they do, this is the standard hyperscaler treatment for physical
          infrastructure, not a Meta idiosyncrasy). Third, whether SEC disclosure rules catch up
          before the pattern becomes universal: the current 10-K commitments and contingencies
          language was written for a world where the number in that footnote was measured in
          hundreds of millions, not tens of billions. When BlackRock, Blue Owl, and Brookfield
          collectively hold title on a hundred gigawatts of AI compute, the market is going to
          need a new line item, and it is going to want it on the face of the balance sheet, not
          in the notes.
        </p>

        <p>
          We are tracking the campus buildouts on our{' '}
          <Link href="/originals/ai-buildout-explained" className="text-accent-primary hover:underline">
            AI buildout explainer
          </Link>{' '}
          and the vendor stack on the{' '}
          <Link href="/providers/meta" className="text-accent-primary hover:underline">
            Meta provider page
          </Link>
          . The next data point that changes this thesis is the Q3 hyperscaler earnings cycle,
          starting with Meta on the same October window it always uses. If the JV commitments
          note grows by another $10 billion to $20 billion and analysts do not press on it, the
          template is going to run to its natural end.
        </p>
      </div>

      {/* Related */}
      <footer className="mt-12 pt-8 border-t border-border">
        <h2 className="text-lg font-semibold text-text-primary mb-4">Related</h2>
        <div className="grid gap-3">
          <Link
            href="/originals/naver-nvidia-brookfield-10b-sovereign-ai-triangle"
            className="block bg-bg-secondary border border-border rounded-lg px-4 py-3 hover:border-accent-primary transition-colors"
          >
            <span className="text-text-primary text-sm">NAVER, NVIDIA, and Brookfield Put $10 Billion Behind Korea&apos;s 200 Megawatt Sovereign AI Factory. The Financing Template Is the Story.</span>
          </Link>
          <Link
            href="/originals/anthropic-meta-10b-fourth-compute-vendor"
            className="block bg-bg-secondary border border-border rounded-lg px-4 py-3 hover:border-accent-primary transition-colors"
          >
            <span className="text-text-primary text-sm">Anthropic&apos;s Fourth Compute Vendor Ships Llama. Meta Just Became a Hyperscaler in the Same News Cycle.</span>
          </Link>
          <Link
            href="/originals/google-cloud-514b-backlog-tpu-in-customer-dc"
            className="block bg-bg-secondary border border-border rounded-lg px-4 py-3 hover:border-accent-primary transition-colors"
          >
            <span className="text-text-primary text-sm">Google Cloud Booked $514 Billion in Backlog. Q2 Was the First Quarter TPUs Shipped Into Customer Data Centers.</span>
          </Link>
          <Link
            href="/originals/ai-buildout-explained"
            className="block bg-bg-secondary border border-border rounded-lg px-4 py-3 hover:border-accent-primary transition-colors"
          >
            <span className="text-text-primary text-sm">The AI Buildout, Explained: Stargate, Hyperion, Colossus, and the Physical Layer of the Model Race.</span>
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
