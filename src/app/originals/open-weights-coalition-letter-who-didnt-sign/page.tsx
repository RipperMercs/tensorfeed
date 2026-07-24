import { Metadata } from 'next';
import Link from 'next/link';
import { ArrowLeft, Clock } from 'lucide-react';
import { ArticleJsonLd } from '@/components/seo/JsonLd';
import ArticleHero from '@/components/originals/ArticleHero';
import ShareBar from '@/components/originals/ShareBar';

export const metadata: Metadata = {
  alternates: { canonical: 'https://tensorfeed.ai/originals/open-weights-coalition-letter-who-didnt-sign' },
  title: '25 Companies Signed the Open Weights Letter. The Story Is the Three That Did Not.',
  description:
    'Jensen Huang used his first X post to publish a joint letter on open-weight AI signed by NVIDIA, Microsoft, Meta, IBM, Dell, Palantir, Hugging Face, Mistral, Mozilla, and 16 others. OpenAI, Anthropic, and Google are absent, and every signatory sells a complement to the model rather than the model itself. Buried on the last page is a defense of distillation, filed two days after Washington accused Moonshot of distilling Anthropic. That paragraph is the real payload.',
  openGraph: {
    title: '25 Companies Signed the Open Weights Letter. The Story Is the Three That Did Not.',
    description:
      'A coalition letter on open-weight AI, read as a values statement, is better read as a map of who profits when models become commodities. Plus the distillation paragraph nobody is quoting.',
    type: 'article',
    publishedTime: '2026-07-24T16:30:00Z',
    authors: ['Kira Nolan'],
    images: [{ url: 'https://tensorfeed.ai/originals/open-weights-coalition-letter-who-didnt-sign/hero.jpg', width: 1600, height: 900 }],
  },
  twitter: {
    card: 'summary_large_image',
    title: '25 Companies Signed the Open Weights Letter. The Story Is the Three That Did Not.',
    description:
      'Every signatory sells a complement to the model. OpenAI, Anthropic, and Google are absent. And page three quietly defends distillation.',
  },
};

export default function OpenWeightsCoalitionLetterPage() {
  return (
    <article className="max-w-3xl mx-auto px-4 sm:px-6 py-10">
      <ArticleJsonLd
        title="25 Companies Signed the Open Weights Letter. The Story Is the Three That Did Not."
        description="Jensen Huang's first X post carried a 25-company joint letter arguing that American AI leadership depends on open-weight models. OpenAI, Anthropic, and Google did not sign, and a paragraph on the last page defends distillation two days into a federal accusation against Moonshot AI."
        datePublished="2026-07-24"
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
          25 Companies Signed the Open Weights Letter. The Story Is the Three That Did Not.
        </h1>
        <div className="flex items-center gap-3 text-sm text-text-muted">
          <span className="text-text-secondary font-medium">Kira Nolan</span>
          <span>&middot;</span>
          <time dateTime="2026-07-24">July 24, 2026</time>
          <span>&middot;</span>
          <span className="flex items-center gap-1">
            <Clock className="w-3.5 h-3.5" />
            8 min read
          </span>
        </div>
      </header>

      <ShareBar
        path="/originals/open-weights-coalition-letter-who-didnt-sign"
        title="25 Companies Signed the Open Weights Letter. The Story Is the Three That Did Not."
      />

      <ArticleHero
        src="/originals/open-weights-coalition-letter-who-didnt-sign/hero.jpg"
        alt="Jensen Huang, chief executive of NVIDIA, surrounded by students holding phones at a Stanford event in April 2026"
        caption="Jensen Huang at Stanford, April 2026. His first post on X, three months later, was a policy letter."
        credit="Anderseidesvik / Wikimedia Commons / CC BY-SA 4.0"
      />

      {/* Article body */}
      <div className="prose-custom space-y-6 text-lg text-text-primary leading-relaxed">
        <p>
          Jensen Huang has run NVIDIA for 33 years without an X account. Today he opened one, and
          his first post was not a product, a benchmark, or a photo from a keynote. It was a PDF: a
          joint letter titled &ldquo;Open Weights and American AI Leadership,&rdquo; signed by 25
          companies and organizations, hosted on NVIDIA&apos;s own image server.
        </p>

        <p>
          The coverage has settled on the obvious frame. Huang defends open source. NVIDIA,
          Microsoft, and Meta warn Washington against premature restrictions. All true, and all
          less interesting than what the document actually is.
        </p>

        <p>
          I read the letter twice. The first read is a competent, genuinely well-argued case for
          open-weight models. The second read is a map of who gets richer when frontier models stop
          being scarce. Those are not the same document, and the second one is the one worth your
          time.
        </p>

        <h2 className="text-2xl font-semibold text-text-primary pt-4">Every Signatory Sells a Complement</h2>

        <p>
          Here is the full signatory list, because the shape of it is the argument: American
          Innovators Network, Andreessen Horowitz, Arcee AI, Arena, Black Forest Labs, Box,
          CrowdStrike, Dell Technologies, Emergence Capital, Hugging Face, IBM, The Linux
          Foundation, Mariana Minerals, Meta, Microsoft, Mistral, Mozilla, NVIDIA, Palantir,
          Perplexity, Reflection, Replit, ServiceNow, Telnyx, and Y Combinator.
        </p>

        <p>
          Sort them by what they actually sell and the coalition stops looking like a movement and
          starts looking like a supply chain.
        </p>

        <div className="bg-bg-secondary border border-border rounded-lg overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border">
                <th className="text-left px-4 py-3 text-text-primary font-semibold">Layer</th>
                <th className="text-left px-4 py-3 text-text-primary font-semibold">Signatories</th>
                <th className="text-left px-4 py-3 text-text-primary font-semibold">Why open weights help them</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              <tr>
                <td className="px-4 py-3 text-accent-primary font-medium">Silicon</td>
                <td className="px-4 py-3">NVIDIA, Dell, Mariana Minerals</td>
                <td className="px-4 py-3">Self-hosting converts software spend into hardware spend</td>
              </tr>
              <tr>
                <td className="px-4 py-3 text-accent-primary font-medium">Distribution</td>
                <td className="px-4 py-3">Hugging Face, The Linux Foundation, Mozilla</td>
                <td className="px-4 py-3">Their entire product is the place weights live</td>
              </tr>
              <tr>
                <td className="px-4 py-3 text-accent-primary font-medium">Cloud and infra</td>
                <td className="px-4 py-3">Microsoft, IBM, Telnyx</td>
                <td className="px-4 py-3">Sell the runtime regardless of whose model runs on it</td>
              </tr>
              <tr>
                <td className="px-4 py-3 text-accent-primary font-medium">Applications</td>
                <td className="px-4 py-3">Box, Replit, ServiceNow, Perplexity, Arena</td>
                <td className="px-4 py-3">Cheaper inputs widen margins; no lab holds them hostage</td>
              </tr>
              <tr>
                <td className="px-4 py-3 text-accent-primary font-medium">Deployment and security</td>
                <td className="px-4 py-3">Palantir, CrowdStrike</td>
                <td className="px-4 py-3">Air-gapped and regulated buyers need weights they can hold</td>
              </tr>
              <tr>
                <td className="px-4 py-3 text-accent-primary font-medium">Model builders</td>
                <td className="px-4 py-3">Meta, Mistral, Arcee AI, Black Forest Labs, Reflection</td>
                <td className="px-4 py-3">Already open-weight; the policy is their business model</td>
              </tr>
              <tr>
                <td className="px-4 py-3 text-accent-primary font-medium">Capital</td>
                <td className="px-4 py-3">a16z, Y Combinator, Emergence Capital</td>
                <td className="px-4 py-3">Portfolios full of companies that cannot afford frontier pricing</td>
              </tr>
            </tbody>
          </table>
        </div>

        <p>
          Not one signatory&apos;s primary revenue comes from metered access to a closed frontier
          model. That is not a coincidence and it is not a scandal. It is how policy coalitions
          work. But it means the letter should be read as an economic filing, not an ethical one,
          and the strongest passages are exactly the ones where interest and argument line up.
        </p>

        <h2 className="text-2xl font-semibold text-text-primary pt-4">The Absences</h2>

        <p>
          OpenAI did not sign. Anthropic did not sign. Google did not sign. Between them they own
          the models sitting at the top of every capability index, and all three sell access by the
          token.
        </p>

        <p>
          The letter never names them. It does not have to. Read this sentence and tell me who it
          is about: relying solely on closed models &ldquo;is not inherently safe: they can be
          breached, misused, or fail in ways that outsiders cannot detect.&rdquo; Then the turn,
          which is the sharpest line in the document. Concentrating advanced AI behind a few closed
          models &ldquo;results in a small number of single points of failure, weakens competition,
          and leaves critical technology in the hands of a few providers.&rdquo;
        </p>

        <p>
          That is a safety argument repurposed as an antitrust argument, aimed at three companies
          that were invited to the industry consensus and are instead its subject. Microsoft
          signing it is the detail I keep turning over. Microsoft is OpenAI&apos;s largest partner
          and just put its name to a document arguing that OpenAI&apos;s market structure is a
          systemic risk.
        </p>

        <h2 className="text-2xl font-semibold text-text-primary pt-4">The Distillation Paragraph Is the Real Payload</h2>

        <p>
          Now the part that has gone almost entirely unquoted, and the reason I think this letter
          was filed this week rather than any other week. It is on the last page, after the
          policy asks, where nobody looks.
        </p>

        <p>
          Policymakers, the letter says, &ldquo;should be careful not to conflate legitimate
          model-development techniques with misappropriation.&rdquo; Distillation, meaning the
          practice of using one model&apos;s outputs to help train or improve another, is
          &ldquo;a widely used technique for model improvement, evaluation, and
          validation.&rdquo; It reflects &ldquo;a long tradition of learning from, building upon,
          and improving existing technologies.&rdquo; Unlawful extraction from closed models is a
          real concern, but it should be handled through &ldquo;targeted legal and commercial
          frameworks rather than sweeping restrictions.&rdquo;
        </p>

        <p>
          Two days ago, White House OSTP director Michael Kratsios accused Moonshot AI of
          distilling Anthropic&apos;s Fable model to build Kimi K3. Anthropic endorsed the
          statement. Treasury Secretary Scott Bessent raised sanctions. We covered why that charge
          is the weaker half of Washington&apos;s case in{' '}
          <Link href="/originals/moonshot-distillation-charge-gb300-thailand" className="text-accent-primary hover:underline">
            the distillation charge is the weak half
          </Link>.
        </p>

        <p>
          So the sequence is: the administration calls distillation theft on Tuesday, and on Friday
          NVIDIA, Meta, Microsoft, Mistral, IBM, and Palantir sign a document calling it a
          legitimate technique with a long and honorable tradition. Whatever else this letter is,
          that paragraph is a pre-emptive strike against a rule nobody has written yet.
        </p>

        <p>
          The self-interest is not subtle. Restricting distillation would hurt every open-weight
          lab that improves models by training on outputs, which is most of them, and it would
          hand closed labs a legal weapon against exactly the competitors this coalition is built
          from. It is also, as an intellectual matter, largely correct. You cannot call the
          technique standard practice when an American lab uses it and industrial theft when a
          Chinese one does. That argument was always going to arrive. It arrived on page three of
          a PDF about American leadership.
        </p>

        <h2 className="text-2xl font-semibold text-text-primary pt-4">The Sovereignty Claim Has a Hardware Bill</h2>

        <p>
          The letter&apos;s cleanest promise is control. Open weights let organizations
          &ldquo;control their own data, evaluate and adapt models to their own needs, and deploy
          them wherever their business requirements demand.&rdquo; True in principle. The word
          doing the quiet work is &ldquo;deploy.&rdquo;
        </p>

        <p>
          Downloadable and runnable are different claims, and the gap between them is measured in
          accelerators. We refreshed our{' '}
          <Link href="/open-weights" className="text-accent-primary hover:underline">open-weights deployment catalog</Link>{' '}
          this morning, and these are the entry costs for the models this letter is implicitly
          about, at the cheapest quantization where each is still worth running.
        </p>

        <div className="bg-bg-secondary border border-border rounded-lg overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border">
                <th className="text-left px-4 py-3 text-text-primary font-semibold">Model</th>
                <th className="text-left px-4 py-3 text-text-primary font-semibold">License</th>
                <th className="text-left px-4 py-3 text-text-primary font-semibold">VRAM (4-bit)</th>
                <th className="text-left px-4 py-3 text-text-primary font-semibold">Minimum realistic host</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              <tr>
                <td className="px-4 py-3 text-accent-primary font-medium">Kimi K3</td>
                <td className="px-4 py-3">Modified MIT</td>
                <td className="px-4 py-3 font-mono">1,450 GB</td>
                <td className="px-4 py-3">8x B200</td>
              </tr>
              <tr>
                <td className="px-4 py-3 text-accent-primary font-medium">LongCat-2.0</td>
                <td className="px-4 py-3">MIT</td>
                <td className="px-4 py-3 font-mono">870 GB</td>
                <td className="px-4 py-3">8x H200</td>
              </tr>
              <tr>
                <td className="px-4 py-3 text-accent-primary font-medium">GLM-5.2</td>
                <td className="px-4 py-3">MIT</td>
                <td className="px-4 py-3 font-mono">400 GB</td>
                <td className="px-4 py-3">4x H200</td>
              </tr>
              <tr>
                <td className="px-4 py-3 text-accent-primary font-medium">MiniMax M3</td>
                <td className="px-4 py-3">Community, restricted</td>
                <td className="px-4 py-3 font-mono">230 GB</td>
                <td className="px-4 py-3">2x H200</td>
              </tr>
              <tr>
                <td className="px-4 py-3 text-accent-primary font-medium">Mistral Medium 3.5</td>
                <td className="px-4 py-3">Modified MIT</td>
                <td className="px-4 py-3 font-mono text-violet-400 font-semibold">72 GB</td>
                <td className="px-4 py-3">1x H100-80GB</td>
              </tr>
            </tbody>
          </table>
        </div>

        <p>
          Read the last row against the first. Mistral Medium 3.5 is the letter&apos;s thesis
          working: 128 billion parameters, 77.6 percent on SWE-Bench Verified, one GPU, a license
          you can ship on. Kimi K3 is the thesis straining. A permissive license on a 2.8 trillion
          parameter model buys a hospital or a county government nothing at all, because the
          sovereignty on offer costs seven figures of silicon to exercise.
        </p>

        <p>
          Which is the part where you notice who organized the letter. NVIDIA is entirely sincere
          that open weights enable sovereignty, and NVIDIA sells the sovereignty. Both things are
          true at once. We made the narrower version of this argument about{' '}
          <Link href="/originals/glm-5-2-open-weights-not-sovereignty" className="text-accent-primary hover:underline">
            GLM-5.2 and the difference between open weights and independence
          </Link>, and this letter is the strongest evidence yet that the industry knows the gap
          exists and would rather talk about licenses than about racks.
        </p>

        <h2 className="text-2xl font-semibold text-text-primary pt-4">What They Actually Asked For</h2>

        <p>
          Strip out the framing and there are four concrete asks, which is four more than most
          industry letters manage:
        </p>

        <p>
          Expand compute access for startups and researchers. Fund shared training assets, meaning
          datasets, tools, and evaluation frameworks. Keep the frontier plural by avoiding
          premature restrictions on open models that would &ldquo;stifle competition or drive
          innovation overseas.&rdquo; And do not treat distillation as misappropriation.
        </p>

        <p>
          The first two are subsidy requests and will be read that way. The third is the one with
          teeth, because &ldquo;premature&rdquo; is doing enormous load-bearing work and nobody in
          the letter defines it. The fourth is the live one.
        </p>

        <p>
          The best paragraph in the document, and the one I wish had been the headline, is the
          economic case. Open weights let organizations &ldquo;match the right model to the right
          job at the right cost, reserving frontier-scale capability for genuine frontier problems
          and running efficient, specialized models everywhere else.&rdquo; That is a description
          of routing, and it is the correct architecture. It is also what we have been telling
          builders to do for a year, and it does not require a single policy change to start
          doing.
        </p>

        <h2 className="text-2xl font-semibold text-text-primary pt-4">Our Take</h2>

        <p>
          The letter is right about the thing it is arguing and it is not a neutral document. Both
          of those can hold. Concentration of capability inside three closed labs really is a
          systemic risk, transparency really does aid defense, and a plural frontier really is
          better for everyone downstream. The 25 companies making that case also happen to own
          every layer of the stack that gets more valuable when models stop being the scarce part.
        </p>

        <p>
          What actually changed today is that the open-weight position now has an organized
          industrial lobby with NVIDIA&apos;s balance sheet behind it, at the exact moment
          Washington is drafting rules and accusing a Chinese lab of the technique this letter
          defends. The policy fight over open models just stopped being a debate among researchers
          and became a contest between two coalitions with money on the table.
        </p>

        <p>
          For builders, none of this changes the work. Put a routing layer between your product
          and any single lab. Benchmark on cost per task, not sticker price. Check the license
          before you check the benchmark, because MIT and &ldquo;community, restricted&rdquo; are
          not the same product no matter how the press release reads. And size the hardware before
          you believe the sovereignty pitch: our{' '}
          <Link href="/open-weights" className="text-accent-primary hover:underline">deployment catalog</Link>{' '}
          and{' '}
          <Link href="/models" className="text-accent-primary hover:underline">models tracker</Link>{' '}
          exist so that number arrives before the invoice does.
        </p>

        <p>
          Three things to watch. Whether OpenAI, Anthropic, or Google answers publicly or lets the
          letter stand unchallenged. Whether the distillation paragraph shows up in the August
          White House framework, in either direction. And whether any of the 25 signatories funds
          the unglamorous half of their own argument, which is not more open models but cheaper
          ways to run the ones that already exist. The letter asks for compute access for startups.
          The company that convened it is the company that prices it.
        </p>
      </div>

      {/* Related */}
      <footer className="mt-12 pt-8 border-t border-border">
        <h2 className="text-lg font-semibold text-text-primary mb-4">Related</h2>
        <div className="grid gap-3">
          <Link
            href="/originals/moonshot-distillation-charge-gb300-thailand"
            className="block bg-bg-secondary border border-border rounded-lg px-4 py-3 hover:border-accent-primary transition-colors"
          >
            <span className="text-text-primary text-sm">Washington Named Moonshot. The Distillation Charge Is the Weak Half. The Chips Are the Strong Half.</span>
          </Link>
          <Link
            href="/originals/kimi-k3-largest-open-weight-model-frontier-gap"
            className="block bg-bg-secondary border border-border rounded-lg px-4 py-3 hover:border-accent-primary transition-colors"
          >
            <span className="text-text-primary text-sm">Kimi K3 Is the Largest Open Model Ever and It Sits Three Points Off the Frontier. The Weights Drop This Week.</span>
          </Link>
          <Link
            href="/originals/glm-5-2-open-weights-not-sovereignty"
            className="block bg-bg-secondary border border-border rounded-lg px-4 py-3 hover:border-accent-primary transition-colors"
          >
            <span className="text-text-primary text-sm">GLM-5.2 Now Runs 40% of Developer Tokens on OpenRouter. Open Weights Are Not the Same as Sovereignty.</span>
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
