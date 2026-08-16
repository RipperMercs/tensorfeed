import { Metadata } from 'next';
import Link from 'next/link';
import { ArrowLeft, Clock, Scale } from 'lucide-react';
import { ArticleJsonLd } from '@/components/seo/JsonLd';

import ArticleHero from '@/components/originals/ArticleHero';
import ShareBar from '@/components/originals/ShareBar';
export const metadata: Metadata = {
  alternates: { canonical: 'https://tensorfeed.ai/originals/apple-openai-injunction-io-court-clock' },
  title: 'Apple Asked a Judge to Freeze OpenAI Out of Its Trade Secrets. The io Device Now Runs on a Court Clock.',
  description:
    'Apple moved for a preliminary injunction barring OpenAI, io Products, and two former Apple engineers from acquiring, accessing, using, or disclosing its alleged trade secrets, plus expedited discovery with four depositions. Apple says more ex-employees may have taken confidential data. OpenAI calls the motion false and unnecessary. The hearing is October 1.',
  openGraph: {
    title: 'Apple Asked a Judge to Freeze OpenAI Out of Its Trade Secrets. The io Device Now Runs on a Court Clock.',
    description:
      'A preliminary injunction motion, an expedited discovery demand with four depositions, and a widening list of ex-Apple employees. The io hardware program just picked up an October 1 court date.',
    type: 'article',
    publishedTime: '2026-08-05T10:00:00Z',
    authors: ['Kira Nolan'],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Apple Asked a Judge to Freeze OpenAI Out of Its Trade Secrets. The io Device Now Runs on a Court Clock.',
    description:
      'Preliminary injunction, expedited discovery, four depositions, and a widening employee list. Hearing October 1.',
  },
};

export default function AppleOpenAIInjunctionPage() {
  return (
    <article className="max-w-3xl mx-auto px-4 sm:px-6 py-10">
      <ArticleJsonLd
        title="Apple Asked a Judge to Freeze OpenAI Out of Its Trade Secrets. The io Device Now Runs on a Court Clock."
        description="Apple moved for a preliminary injunction barring OpenAI, io Products, and two former Apple engineers from acquiring, accessing, using, or disclosing its alleged trade secrets, plus expedited discovery with four depositions. OpenAI calls the motion false and unnecessary. The hearing is October 1."
        datePublished="2026-08-05"
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
          Apple Asked a Judge to Freeze OpenAI Out of Its Trade Secrets. The io Device Now Runs on a Court Clock.
        </h1>
        <div className="flex items-center gap-3 text-sm text-text-muted">
          <span className="text-text-secondary font-medium">Kira Nolan</span>
          <span>&middot;</span>
          <time dateTime="2026-08-05">August 5, 2026</time>
          <span>&middot;</span>
          <span className="flex items-center gap-1">
            <Clock className="w-3.5 h-3.5" />
            7 min read
          </span>
        </div>
      </header>

      <ShareBar
        path="/originals/apple-openai-injunction-io-court-clock"
        title="Apple Asked a Judge to Freeze OpenAI Out of Its Trade Secrets. The io Device Now Runs on a Court Clock."
      />

      <ArticleHero
        mode="graphic"
        icon={Scale}
        gradientFrom="#1E1B4B"
        gradientTo="#9F1239"
        eyebrow="Legal &middot; Hardware"
      />

      {/* Article body */}
      <div className="prose-custom space-y-6 text-lg text-text-primary leading-relaxed">
        <p>
          On Monday, Apple asked a federal judge in the Northern District of California for a
          preliminary injunction that would bar OpenAI, its hardware subsidiary io Products, and two
          former Apple employees from acquiring, accessing, using, or disclosing what Apple says are
          its trade secrets. Apple filed a second motion the same day asking for expedited
          discovery: document production covering the defendants&apos; alleged access to Apple
          confidential material, plus depositions of four people, two of whom are current OpenAI
          employees. The hearing is set for October 1.
        </p>

        <p>
          This is the escalation of the suit Apple filed on July 10 against OpenAI, io Products,
          former senior system electrical engineer Chang Liu, and former vice president of product
          design Tang Yew Tan, the executive who ran product design for the iPhone and Apple Watch
          before joining Jony Ive&apos;s hardware effort. A complaint is an accusation. A
          preliminary injunction motion is a demand that the court act before trial, and to get one
          Apple has to show it is likely to win and that waiting causes irreparable harm. Apple just
          told the court that every week io keeps working is a week of damage that money cannot fix.
        </p>

        <h2 className="text-2xl font-semibold text-text-primary pt-4">The Numbers</h2>

        <div className="bg-bg-secondary border border-border rounded-lg overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border">
                <th className="text-left px-4 py-3 text-text-primary font-semibold">Item</th>
                <th className="text-left px-4 py-3 text-text-primary font-semibold">Value</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              <tr>
                <td className="px-4 py-3 text-text-primary font-medium">Original complaint</td>
                <td className="px-4 py-3">July 10, 2026, N.D. Cal., case 5:26-cv-07078</td>
              </tr>
              <tr>
                <td className="px-4 py-3 text-text-primary font-medium">Claims</td>
                <td className="px-4 py-3">Trade secret misappropriation, breach of contract</td>
              </tr>
              <tr>
                <td className="px-4 py-3 text-text-primary font-medium">Defendants</td>
                <td className="px-4 py-3">OpenAI, io Products, Chang Liu, Tang Yew Tan</td>
              </tr>
              <tr>
                <td className="px-4 py-3 text-text-primary font-medium">Injunction motion</td>
                <td className="px-4 py-3">Dated August 3, filed August 4, 2026</td>
              </tr>
              <tr>
                <td className="px-4 py-3 text-text-primary font-medium">Requested scope</td>
                <td className="px-4 py-3">No acquiring, accessing, using, or disclosing Apple trade secrets</td>
              </tr>
              <tr>
                <td className="px-4 py-3 text-text-primary font-medium">Depositions sought</td>
                <td className="px-4 py-3">Liu, Tan, OpenAI employee Yu-Ting Peng, one unnamed ex-Apple OpenAI employee</td>
              </tr>
              <tr>
                <td className="px-4 py-3 text-text-primary font-medium">Employee list</td>
                <td className="px-4 py-3">Apple says additional ex-employees may have taken confidential data</td>
              </tr>
              <tr>
                <td className="px-4 py-3 text-text-primary font-medium">io acquisition</td>
                <td className="px-4 py-3">Roughly $6.5B, OpenAI acquired Jony Ive&apos;s io in 2025</td>
              </tr>
              <tr>
                <td className="px-4 py-3 text-text-primary font-medium">Hearing date</td>
                <td className="px-4 py-3 text-accent-primary font-semibold">October 1, 2026</td>
              </tr>
            </tbody>
          </table>
        </div>

        <h2 className="text-2xl font-semibold text-text-primary pt-4">The Discovery Motion Is the Weapon</h2>

        <p>
          Most coverage led with the injunction. I think the expedited discovery motion is the
          sharper instrument. An injunction phrased as &quot;do not use Apple&apos;s trade
          secrets&quot; is genuinely hard to police. OpenAI will say it is not using any, work
          inside io continues, and enforcement collapses into an argument about what any given CAD
          decision was derived from. Discovery is different. Apple is asking the court to order
          production of documents showing exactly what the defendants accessed, and to put four
          people under oath months before a trial would normally reach them: Liu, Tan, OpenAI
          employee Yu-Ting Peng, and a fourth OpenAI employee, unnamed in public filings, who
          previously worked at Apple.
        </p>

        <p>
          Depositions taken in August and September feed directly into the October 1 hearing. If
          any of the four gives Apple a usable admission, the injunction argument writes itself. If
          none do, Apple still walks away with a map of io&apos;s early design process, which is
          exactly the thing OpenAI paid roughly $6.5 billion to keep private when it bought
          Ive&apos;s startup. There is no symmetric downside for Apple. Its secrets are already the
          subject of the case; io&apos;s are not, yet.
        </p>

        <p>
          Apple also signaled in this week&apos;s filings that the defendant list may not be done
          growing, saying additional former employees may have taken confidential data on their way
          out. The July complaint already described a scheme it said operated &quot;at every
          level&quot;: confidential hardware designs, CAD files, manufacturing processes, and
          supply chain strategy, with recruiting used as the extraction mechanism. Reporting on the
          complaint read like a spy novel, with allegations of pre-departure downloads and
          coordinated timing. None of that is proven. All of it is now headed for sworn testimony
          on an accelerated clock.
        </p>

        <h2 className="text-2xl font-semibold text-text-primary pt-4">OpenAI&apos;s Answer Is Total Denial</h2>

        <p>
          OpenAI did not hedge. Its public response: the motion is &quot;based on false information
          and completely unnecessary because we do not have, nor want, any of their trade
          secrets.&quot; That is the strongest available position and also the most brittle one.
          A company that argued its device work is independently derived could lose a document
          fight and survive it. A company that says it holds nothing at all has staked its
          credibility on discovery coming back empty. If a single Apple-marked file surfaces on an
          io system, the categorical denial becomes Exhibit A on irreparable harm.
        </p>

        <p>
          The denial also does nothing to slow the process. Apple does not need to prove theft to
          win expedited discovery; it needs to convince a judge that the question is urgent enough
          to answer early. The device program&apos;s own momentum works against OpenAI here. The
          more real the io hardware becomes, the easier it is for Apple to argue that any
          misappropriated process knowledge is being baked into tooling and supplier contracts
          right now, which is the definition of harm an injunction exists to stop.
        </p>

        <h2 className="text-2xl font-semibold text-text-primary pt-4">Why Trade Secrets Are the Only Lever Apple Has</h2>

        <p>
          Step back and the strategy is legible. California will not enforce non-compete
          agreements, so Apple cannot stop its engineers from walking to io, and dozens have.
          Poaching is legal. Salary competition is legal. What remains actionable is the narrow
          claim that specific confidential material crossed the street with them. Trade secret law
          is the last fence around institutional knowledge in California, and Apple is now testing
          how much weight that fence can bear when the departing team is building the first
          credible attempt at a post-iPhone device category.
        </p>

        <p>
          That is why this case matters beyond Cupertino. Every frontier lab is staffed with people
          who used to work somewhere that considers its methods confidential, and the talent
          velocity of this industry has been treated as a feature. A ruling that pre-trial
          injunctions and expedited depositions are available whenever a rival hires your hardware
          team would change the price of every senior hire in the valley. A ruling the other way
          confirms that once employees clear the door, only the most literal file-copying evidence
          counts.
        </p>

        <h2 className="text-2xl font-semibold text-text-primary pt-4">Two Tracks: Open at the Model Layer, Scorched Earth at the Device Layer</h2>

        <p>
          The part I keep coming back to is how cleanly this splits from Apple&apos;s model
          strategy. This spring Apple rebuilt Siri on Gemini and opened iPhone assistant
          extensions to Claude, ending ChatGPT&apos;s exclusivity and treating frontier models as
          swappable suppliers. At the software layer, Apple decided models are commodities and
          peace is cheap. At the hardware layer, it is spending its credibility on the most
          aggressive litigation posture available against the one lab building a device intended
          to make the iPhone optional. The two moves are the same thesis: the model is not the
          moat, the object in your pocket is.
        </p>

        <p>
          For OpenAI the timing is unhelpful in a specific way. The io device does not exist as a
          product yet; analysts expect AI-native hardware that leans away from the app-and-screen
          model, on a timeline nobody outside the company can verify. What the injunction motion
          does, regardless of outcome, is attach a public court calendar to a private hardware
          roadmap. Suppliers, prospective partners, and the people io is still recruiting can now
          read a docket instead of a press release. Litigation as signal jamming is an old Apple
          play; it ran versions of it against Samsung and Masimo. This is the first time the
          target is a lab it also depends on as a Siri-era partner turned rival.
        </p>

        <h2 className="text-2xl font-semibold text-text-primary pt-4">Our Take</h2>

        <p>
          Preliminary injunctions in trade secret cases are hard to get, and judges are especially
          reluctant when the requested order would shadow an entire product program rather than a
          named document set. On the public record so far, I would not bet on Apple winning the
          injunction as scoped. The expedited discovery motion is another matter: courts grant
          narrower versions of these routinely, and even a partial grant puts io engineers under
          oath this quarter. The most likely outcome is the one that serves Apple anyway, a
          months-long window where io&apos;s design history gets excavated in front of a magistrate
          while OpenAI tries to ship around it.
        </p>

        <p>
          Three signposts. First, whether the court grants any part of expedited discovery before
          the October 1 hearing, because depositions taken in September change what that hearing
          is. Second, whether Apple amends the complaint to name additional former employees as
          defendants, which would confirm the widening it previewed this week. Third, whether
          OpenAI counterclaims or moves the fight to a different venue entirely, because the
          categorical denial it published is the posture of a company preparing to attack the
          premise rather than negotiate. We track OpenAI availability and releases on our{' '}
          <Link href="/status" className="text-accent-primary hover:underline">status page</Link>{' '}
          and{' '}
          <Link href="/models" className="text-accent-primary hover:underline">models tracker</Link>,
          and we will follow the docket from here.
        </p>
      </div>

      {/* Related */}
      <footer className="mt-12 pt-8 border-t border-border">
        <h2 className="text-lg font-semibold text-text-primary mb-4">Related</h2>
        <div className="grid gap-3">
          <Link
            href="/originals/apple-gemini-siri-extensions-wwdc-2026"
            className="block bg-bg-secondary border border-border rounded-lg px-4 py-3 hover:border-accent-primary transition-colors"
          >
            <span className="text-text-primary text-sm">Apple Rebuilt Siri on Gemini and Opened the iPhone to Claude. The Assistant Layer Just Became Swappable.</span>
          </Link>
          <Link
            href="/originals/apple-intelligence-extensions-ios-27"
            className="block bg-bg-secondary border border-border rounded-lg px-4 py-3 hover:border-accent-primary transition-colors"
          >
            <span className="text-text-primary text-sm">Apple Just Opened Siri to Claude and Gemini. ChatGPT&apos;s Exclusivity Is Dead.</span>
          </Link>
          <Link
            href="/originals/openai-astra-ten-proofs-2000-compute"
            className="block bg-bg-secondary border border-border rounded-lg px-4 py-3 hover:border-accent-primary transition-colors"
          >
            <span className="text-text-primary text-sm">OpenAI Revealed Astra Through Ten Math Proofs. The Token Bill Was $2,000.</span>
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
