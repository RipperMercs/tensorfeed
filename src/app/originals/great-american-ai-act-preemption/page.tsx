import { Metadata } from 'next';
import Link from 'next/link';
import { ArrowLeft, Clock } from 'lucide-react';
import { ArticleJsonLd } from '@/components/seo/JsonLd';

import ShareBar from '@/components/originals/ShareBar';
export const metadata: Metadata = {
  alternates: { canonical: 'https://tensorfeed.ai/originals/great-american-ai-act-preemption' },
  title: 'Congress Finally Wrote the Preemption Down: Three Years, Development Only. Sacramento Keeps the Rest.',
  description:
    'Reps. Jay Obernolte and Lori Trahan released the 269-page Great American AI Act discussion draft on June 4. It would preempt state laws regulating AI model development for three years, formally establish CAISI with $100M a year, and require frontier risk plans, incident reporting, and whistleblower protections. The line it draws (development versus deployment) decides which of California\'s 30 bills live or die.',
  openGraph: {
    title: 'Congress Finally Wrote the Preemption Down: Three Years, Development Only. Sacramento Keeps the Rest.',
    description:
      'The Great American AI Act draft freezes state model-development laws for three years but leaves the deployment layer untouched. Here is which state bills live or die.',
    type: 'article',
    publishedTime: '2026-06-05T10:00:00Z',
    authors: ['Kira Nolan'],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Congress Finally Wrote the Preemption Down: Three Years, Development Only.',
    description:
      'The Great American AI Act draft freezes state model-development laws for three years but leaves the deployment layer untouched.',
  },
};

export default function GreatAmericanAIActPreemptionDraftPage() {
  return (
    <article className="max-w-3xl mx-auto px-4 sm:px-6 py-10">
      <ArticleJsonLd
        title="Congress Finally Wrote the Preemption Down: Three Years, Development Only. Sacramento Keeps the Rest."
        description="The 269-page Great American AI Act discussion draft would preempt state laws regulating AI model development for three years, formalize CAISI with $100M a year, and require frontier risk plans, incident reporting, and whistleblower protections. The development versus deployment line decides which state bills live or die."
        datePublished="2026-06-05"
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
          Congress Finally Wrote the Preemption Down: Three Years, Development Only. Sacramento Keeps the Rest.
        </h1>
        <div className="flex items-center gap-3 text-sm text-text-muted">
          <span className="text-text-secondary font-medium">Kira Nolan</span>
          <span>&middot;</span>
          <time dateTime="2026-06-05">June 5, 2026</time>
          <span>&middot;</span>
          <span className="flex items-center gap-1">
            <Clock className="w-3.5 h-3.5" />
            7 min read
          </span>
        </div>
      </header>

      <ShareBar
        path="/originals/great-american-ai-act-preemption"
        title="Congress Finally Wrote the Preemption Down: Three Years, Development Only. Sacramento Keeps the Rest."
      />
      {/* Article body */}
      <div className="prose-custom space-y-6 text-text-secondary leading-relaxed">
        <p className="text-lg text-text-primary leading-relaxed">
          For a year, federal preemption of state AI law has been a threat without a text. On
          Thursday it got one. Reps. Jay Obernolte (R-CA) and Lori Trahan (D-MA) released a 269-page
          discussion draft of the Great American Artificial Intelligence Act, the most complete
          federal AI framework Congress has produced. The headline provision freezes state laws that
          specifically regulate the development of AI models for three years. The detail that
          matters just as much: it leaves state laws on the use and deployment of AI alone.
        </p>

        <p>
          I wrote last week that with no federal standard above them, California&apos;s roughly 30
          surviving AI bills were about to set the US floor. This draft is the federal standard
          showing up, and it is narrower than the preemption fight everyone was bracing for. It
          does not erase Sacramento. It splits the stack and claims the bottom half.
        </p>

        <h2 className="text-2xl font-semibold text-text-primary pt-4">What the Draft Actually Says</h2>

        <p>
          The bill is a discussion draft, not introduced legislation, which means it is a position
          paper with bill formatting. But it is a bipartisan one, with co-sponsors on both sides:
          Suhas Subramanyam (D-VA), Scott Franklin (R-FL), Scott Peters (D-CA), and Erin Houchin
          (R-IN). Obernolte co-chaired the House AI Task Force. Trahan is one of the few members
          with a working technical background. This is the text the preemption fight will be argued
          over for the rest of the year.
        </p>

        <p>The core provisions:</p>

        <p>
          <strong className="text-text-primary">Preemption, scoped and sunset.</strong> State laws
          and regulations &quot;specifically regulating the development&quot; of an AI model are
          preempted. The preemption expires after three years, a forcing function that obliges
          Congress to revisit the framework rather than set it and forget it. Laws governing the
          use or deployment of AI models are explicitly not preempted.
        </p>

        <p>
          <strong className="text-text-primary">CAISI gets statutory legs.</strong> The draft
          formally establishes the Center for AI Standards and Innovation, the renamed successor to
          the AI Safety Institute, and appropriates $100 million per year from 2027 through 2029.
          Its standards remain voluntary.
        </p>

        <p>
          <strong className="text-text-primary">Obligations for frontier developers.</strong> Large
          frontier developers would be required to write and implement risk management plans before
          releasing new models, and to report critical safety incidents to CAISI.
        </p>

        <p>
          <strong className="text-text-primary">Whistleblower protections.</strong> Frontier labs
          would be barred from retaliating against employees who report potential violations,
          critical safety incidents, or other risks related to advanced model development.
        </p>

        <p>
          If that obligation list sounds familiar, it should. Risk plans before release, incident
          reporting to a named agency, whistleblower protections: that is the skeleton of
          California&apos;s SB 53, federalized. The draft does not so much repeal the state model
          layer as nationalize it, with CAISI standing in for the California Attorney General and
          voluntary standards standing in for enforcement. That last substitution is where the
          fight will be.
        </p>

        <h2 className="text-2xl font-semibold text-text-primary pt-4">Which State Laws Live or Die</h2>

        <p>
          The development versus deployment line is the entire ballgame, so here is how it cuts
          through the state laws we have been tracking. Trahan&apos;s office published an
          accompanying document naming two California casualties directly.
        </p>

        <div className="bg-bg-secondary border border-border rounded-lg overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border">
                <th className="text-left px-4 py-3 text-text-primary font-semibold">State law</th>
                <th className="text-left px-4 py-3 text-text-primary font-semibold">Layer</th>
                <th className="text-left px-4 py-3 text-text-primary font-semibold">Under the draft</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              <tr>
                <td className="px-4 py-3 text-text-primary font-medium">CA AB 2013 (training data summaries)</td>
                <td className="px-4 py-3">Development</td>
                <td className="px-4 py-3 text-accent-primary font-medium">Preempted (named)</td>
              </tr>
              <tr>
                <td className="px-4 py-3 text-text-primary font-medium">CA SB 942 (watermarking portion)</td>
                <td className="px-4 py-3">Development</td>
                <td className="px-4 py-3 text-accent-primary font-medium">Partially preempted (named)</td>
              </tr>
              <tr>
                <td className="px-4 py-3 text-text-primary font-medium">CA SB 53 (frontier governance)</td>
                <td className="px-4 py-3">Development</td>
                <td className="px-4 py-3">Contested; squarely in scope</td>
              </tr>
              <tr>
                <td className="px-4 py-3 text-text-primary font-medium">CA chatbot bills (AB 1609, SB 300, et al)</td>
                <td className="px-4 py-3">Deployment</td>
                <td className="px-4 py-3">Survive</td>
              </tr>
              <tr>
                <td className="px-4 py-3 text-text-primary font-medium">CA workplace ADS bills (AB 1883, SB 947)</td>
                <td className="px-4 py-3">Deployment</td>
                <td className="px-4 py-3">Survive</td>
              </tr>
              <tr>
                <td className="px-4 py-3 text-text-primary font-medium">Illinois SB 315, Colorado chatbot bills</td>
                <td className="px-4 py-3">Deployment</td>
                <td className="px-4 py-3">Survive</td>
              </tr>
            </tbody>
          </table>
        </div>

        <p>
          Read that table against the Sacramento crop and the result is almost backwards from the
          rhetoric. Public Citizen called the draft a bill that strips states of authority to
          protect consumers, workers, and children. But the consumer, worker, and child-facing
          bills in California are nearly all deployment-layer bills, and the draft leaves them
          standing. What it actually freezes is the transparency and governance regime aimed at
          the labs themselves: training data disclosure, watermarking at the model level, and very
          likely SB 53&apos;s frontier governance framework, the one statute the labs have already
          built compliance documents against.
        </p>

        <p>
          That last point deserves emphasis. OpenAI published a Frontier Governance Framework
          mapped to SB 53 and the EU AI Act eight days ago. Anthropic maintains its Frontier
          Compliance Framework against the same statute. If this draft becomes law, the named state
          anchor under those documents dissolves for three years and is replaced by a federal risk
          plan requirement with voluntary CAISI standards underneath it. The compliance documents
          will survive; the enforcement teeth behind them change owners.
        </p>

        <h2 className="text-2xl font-semibold text-text-primary pt-4">The Week Washington Reversed Itself</h2>

        <p>
          The timing is not subtle. On May 28 the administration pulled a federal AI review
          executive order hours before signing, after calls from David Sacks, Elon Musk, and Mark
          Zuckerberg. We covered it as the federal government handing the rulebook to Sacramento
          and Brussels. Five days later, on June 2, a version of that order was signed after all:
          AI developers can voluntarily submit frontier models for up to 30 days of federal review
          before release, focused on cybersecurity and national security risks. Thirty days instead
          of ninety, voluntary instead of expected, but signed.
        </p>

        <p>
          Two days after that, this draft landed. In one week, Washington went from no federal
          model-layer policy to a signed review order plus the most serious preemption text ever
          circulated. The federal vacuum I described on May 31 is filling in fast, and it is
          filling in precisely at the layer where the labs wanted relief: the model layer, where a
          50-state patchwork is most expensive to comply with and where California was setting the
          de facto national standard.
        </p>

        <h2 className="text-2xl font-semibold text-text-primary pt-4">Our Take</h2>

        <p>
          The development versus deployment split is a better-engineered compromise than I
          expected from this Congress. It gives the labs the one thing they have lobbied hardest
          for, a single national rulebook for building models, while letting states keep
          legislating where AI touches their residents: chatbots, hiring, healthcare, schools. The
          three-year sunset is the cleverest part. It converts preemption from a permanent land
          grab into a rental with a renewal vote, which is what makes the bipartisan sponsor list
          possible.
        </p>

        <p>
          The weakness is the same one every voluntary framework has. SB 53 carries a $1 million
          per violation penalty enforced by a state AG. The draft replaces that with risk plans
          checked against voluntary CAISI standards and an incident reporting duty with
          unspecified teeth. For three years, the strongest binding obligations on frontier model
          development in the United States would get weaker, not stronger, even as the obligation
          list looks similar on paper. Whether that trade is worth a uniform national standard is
          the actual debate, and it is now a concrete one with section numbers instead of a
          Twitter fight.
        </p>

        <p>
          Discussion drafts die more often than they pass, and this one faces an election year, a
          crowded calendar, and governors in both parties who like their AI laws. But the
          preemption argument now has an anchor text, and every state bill we track gets read
          against it from here on. Watch three things over the next ninety days: whether the draft
          gets formally introduced with a hearing date, whether California&apos;s July 2 sprint
          accelerates to get bills signed before any federal freeze can attach, and whether the
          labs publicly endorse the draft or stay quiet and let the trade associations carry it.
          The quiet path tells you they think they can get preemption without the federal
          obligations attached.
        </p>
      </div>

      {/* Related */}
      <footer className="mt-12 pt-8 border-t border-border">
        <h2 className="text-lg font-semibold text-text-primary mb-4">Related</h2>
        <div className="grid gap-3">
          <Link
            href="/originals/california-30-ai-bills-crossover-july-sprint"
            className="block bg-bg-secondary border border-border rounded-lg px-4 py-3 hover:border-accent-primary transition-colors"
          >
            <span className="text-text-primary text-sm">Thirty AI Bills Just Survived in Sacramento. The Next Four Weeks Set the US Floor.</span>
          </Link>
          <Link
            href="/originals/trump-pulled-federal-ai-review-order"
            className="block bg-bg-secondary border border-border rounded-lg px-4 py-3 hover:border-accent-primary transition-colors"
          >
            <span className="text-text-primary text-sm">Trump Pulled the Federal AI Review Order at the Last Minute. The Rules Now Come From Sacramento and Brussels.</span>
          </Link>
          <Link
            href="/originals/openai-frontier-governance-framework-compliance-era"
            className="block bg-bg-secondary border border-border rounded-lg px-4 py-3 hover:border-accent-primary transition-colors"
          >
            <span className="text-text-primary text-sm">OpenAI Mapped Its Safety Stack to the Law. Frontier AI Just Crossed From Voluntary to Mandatory.</span>
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
