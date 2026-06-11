import { Metadata } from 'next';
import Link from 'next/link';
import { ArrowLeft, Clock } from 'lucide-react';
import { ArticleJsonLd } from '@/components/seo/JsonLd';

import ShareBar from '@/components/originals/ShareBar';

export const metadata: Metadata = {
  alternates: { canonical: 'https://tensorfeed.ai/originals/california-30-ai-bills-crossover-july-sprint' },
  title: 'Thirty AI Bills Just Survived in Sacramento. The Next Four Weeks Set the US Floor.',
  description:
    'Nearly all of California’s 30 active AI bills cleared their chamber of origin before the May 29 crossover deadline. With no federal standard and a July 2 adjournment looming, the application layer of AI regulation gets written in the next four weeks. Inside the bills that matter for agent operators, why SB 53 covered the model layer and this crop covers deployment, and three signposts.',
  openGraph: {
    title: 'Thirty AI Bills Just Survived in Sacramento. The Next Four Weeks Set the US Floor.',
    description:
      'California’s 30 active AI bills cleared crossover before May 29. The four-week sprint to July 2 writes the deployment layer of US AI law, with no federal standard to override it.',
    type: 'article',
    publishedTime: '2026-05-31T11:00:00Z',
    authors: ['Kira Nolan'],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Thirty AI Bills Just Survived in Sacramento. The Next Four Weeks Set the US Floor.',
    description:
      'California’s 30 active AI bills cleared crossover. The sprint to July 2 writes the deployment layer of US AI law.',
  },
};

export default function CaliforniaAIBillsCrossoverPage() {
  return (
    <article className="max-w-3xl mx-auto px-4 sm:px-6 py-10">
      <ArticleJsonLd
        title="Thirty AI Bills Just Survived in Sacramento. The Next Four Weeks Set the US Floor."
        description="Nearly all of California's 30 active AI bills cleared their chamber of origin before the May 29 crossover deadline. With no federal standard and a July 2 adjournment looming, the application layer of AI regulation gets written in the next four weeks."
        datePublished="2026-05-31"
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
          Thirty AI Bills Just Survived in Sacramento. The Next Four Weeks Set the US Floor.
        </h1>
        <div className="flex items-center gap-3 text-sm text-text-muted">
          <span className="text-text-secondary font-medium">Kira Nolan</span>
          <span>&middot;</span>
          <time dateTime="2026-05-31">May 31, 2026</time>
          <span>&middot;</span>
          <span className="flex items-center gap-1">
            <Clock className="w-3.5 h-3.5" />
            7 min read
          </span>
        </div>
      </header>

      <ShareBar
        path="/originals/california-30-ai-bills-crossover-july-sprint"
        title="Thirty AI Bills Just Survived in Sacramento. The Next Four Weeks Set the US Floor."
      />

      {/* Article body */}
      <div className="prose-custom space-y-6 text-lg text-text-primary leading-relaxed">
        <p className="text-lg text-text-primary leading-relaxed">
          Friday was the crossover deadline in the California Legislature, the procedural gate where a
          bill has to pass its first chamber or sit out the rest of the year. Nearly all of the state&apos;s
          roughly 30 active AI bills made it through. That number matters more than any single launch this
          week, because there is still no federal standard sitting above it.
        </p>

        <p>
          Two days earlier we wrote about the federal review order that got pulled hours before signing.
          The structural consequence of that decision is playing out right now in Sacramento. With no
          national framework, the rules that actually bind AI products in the United States get written
          by whoever moves first, and California is the largest market moving fastest.
        </p>

        <p>
          The clock is the story. The Legislature adjourns for summer recess on July 2, returns August 3,
          and runs to a sine die date of August 31. So a bill that cleared crossover still has to survive
          policy committees, an appropriations suspense file, and a floor vote in the second chamber inside
          a four-week window, then a second sprint in August, then the governor&apos;s pen. Last year that
          final filter cut hard: Newsom signed SB 53 on September 29 and vetoed several other AI bills the
          same season. Crossover is the halfway mark, not the finish line.
        </p>

        <h2 className="text-2xl font-semibold text-text-primary pt-4">SB 53 Was the Model Layer. This Crop Is the Deployment Layer.</h2>

        <p>
          Here is the framing that makes the 2026 bills legible. SB 53, the Transparency in Frontier
          Artificial Intelligence Act that Newsom signed last September, regulates the model layer. It
          applies to large frontier developers with annual revenue above $500 million, which in practice
          is five to eight companies: OpenAI, Anthropic, Google DeepMind, Meta, Microsoft, and whoever
          else crosses the line. It is about training compute, governance frameworks, transparency reports,
          and critical safety incident disclosure, enforced by the California Attorney General at up to
          $1 million per violation.
        </p>

        <p>
          The bills that just cleared crossover are aimed somewhere else entirely. They regulate the
          deployment layer: the chatbot a company points at its customers, the automated system that
          screens a job applicant, the AI scribe in a therapy session, the disclosure on a real estate
          listing. SB 53 governs the handful of labs that build the models. This crop governs the tens of
          thousands of businesses that ship products on top of them. If you operate an agent or a
          consumer-facing AI feature, the second category is the one that lands on you.
        </p>

        <h2 className="text-2xl font-semibold text-text-primary pt-4">The Bills Worth Tracking</h2>

        <p>
          Thirty bills is too many to read closely, so here are the ones with the clearest reach into
          products people are actually shipping. Status reflects action as of the May 29 crossover gate.
        </p>

        <div className="bg-bg-secondary border border-border rounded-lg overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border">
                <th className="text-left px-4 py-3 text-text-primary font-semibold">Bill</th>
                <th className="text-left px-4 py-3 text-text-primary font-semibold">What it touches</th>
                <th className="text-left px-4 py-3 text-text-primary font-semibold">Latest action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              <tr>
                <td className="px-4 py-3 text-accent-primary font-medium font-mono">AB 1609</td>
                <td className="px-4 py-3">Customer service chatbots</td>
                <td className="px-4 py-3">Assembly passed May 27, in Senate</td>
              </tr>
              <tr>
                <td className="px-4 py-3 text-accent-primary font-medium font-mono">AB 1988</td>
                <td className="px-4 py-3">Chatbot safety (PAUSE Act)</td>
                <td className="px-4 py-3">Assembly passed May 21, in Senate</td>
              </tr>
              <tr>
                <td className="px-4 py-3 text-accent-primary font-medium font-mono">AB 2023 / SB 1119</td>
                <td className="px-4 py-3">Companion chatbots and child safety</td>
                <td className="px-4 py-3">AB 2023 passed May 26; SB 1119 passed Senate 39-0</td>
              </tr>
              <tr>
                <td className="px-4 py-3 text-accent-primary font-medium font-mono">SB 300</td>
                <td className="px-4 py-3">Companion chatbots, explicit-content controls</td>
                <td className="px-4 py-3">Senate passed 38-0, in Assembly</td>
              </tr>
              <tr>
                <td className="px-4 py-3 text-accent-primary font-medium font-mono">SB 867</td>
                <td className="px-4 py-3">Ban on companion chatbots in toys</td>
                <td className="px-4 py-3">On special consent calendar May 26</td>
              </tr>
              <tr>
                <td className="px-4 py-3 text-accent-primary font-medium font-mono">AB 1883</td>
                <td className="px-4 py-3">Workplace surveillance via AI</td>
                <td className="px-4 py-3">Assembly passed May 27, in Senate</td>
              </tr>
              <tr>
                <td className="px-4 py-3 text-accent-primary font-medium font-mono">SB 947</td>
                <td className="px-4 py-3">Worker protections on automated decision systems</td>
                <td className="px-4 py-3">Passed Senate, in Assembly</td>
              </tr>
              <tr>
                <td className="px-4 py-3 text-accent-primary font-medium font-mono">SB 719</td>
                <td className="px-4 py-3">High-risk ADS inventory at state agencies</td>
                <td className="px-4 py-3">Senate passed, in Assembly committee</td>
              </tr>
              <tr>
                <td className="px-4 py-3 text-accent-primary font-medium font-mono">AB 1979 / AB 2575</td>
                <td className="px-4 py-3">AI in healthcare services</td>
                <td className="px-4 py-3">Both passed Assembly (May 21 / May 27), in Senate</td>
              </tr>
              <tr>
                <td className="px-4 py-3 text-accent-primary font-medium font-mono">SB 903</td>
                <td className="px-4 py-3">AI transcription in mental health therapy</td>
                <td className="px-4 py-3">Senate passed 39-0, Assembly hearing June 16</td>
              </tr>
              <tr>
                <td className="px-4 py-3 text-accent-primary font-medium font-mono">AB 2713</td>
                <td className="px-4 py-3">Provenance and signatures (AI Transparency Act tune-up)</td>
                <td className="px-4 py-3">Assembly passed 74-0, in Senate</td>
              </tr>
              <tr>
                <td className="px-4 py-3 text-accent-primary font-medium font-mono">SB 813</td>
                <td className="px-4 py-3">California AI Standards and Safety Commission</td>
                <td className="px-4 py-3">Senate passed 31-7, in Assembly committee</td>
              </tr>
            </tbody>
          </table>
        </div>

        <p>
          A few patterns jump out of that list. Companion chatbots are the single most legislated category
          in the building, with at least four separate bills (AB 2023, SB 1119, SB 300, SB 867) coming at
          the same product from different angles: child safety, explicit content, and a flat ban on putting
          one inside a toy. That is what a moral panic looks like when it reaches a legislature, and the
          consumer-assistant cohort that just added action permissions is the target whether the vendors
          read it that way yet or not.
        </p>

        <p>
          The second cluster is automated decision systems. SB 947 and SB 719 are the descendants of the
          employment and ADS bills that stalled in 2025, and they are back. If your agent makes or informs
          what California calls a consequential decision (hiring, housing, credit, healthcare access), the
          disclosure and accountability rules are being drafted in this window, not next year.
        </p>

        <p>
          The third is the quiet one: the natural-person bills. Separate measures specify that a public
          school employee and a CSU instructor have to be a human being, not an AI system. It reads like
          housekeeping until you notice the legislature is now writing into statute the places where a
          model is not allowed to stand in for a person at all. That is a different kind of line than a
          disclosure rule, and it is worth watching where it spreads.
        </p>

        <h2 className="text-2xl font-semibold text-text-primary pt-4">California Is Not Alone, Which Is the Problem</h2>

        <p>
          The same week California cleared crossover, the multistate picture filled in. Illinois gave final
          approval to SB 315, a frontier model safety act the governor has said he will sign, which makes
          it the second state after California to legislate the model layer directly. Colorado was expected
          to sign a chatbot safety bill and a separate measure restricting AI in psychotherapy. Louisiana
          sent three AI bills to its governor as it wrapped its session. Thirty-some states introduced AI
          legislation this year.
        </p>

        <p>
          For an operator, the through-line is not any one state&apos;s rule. It is that the federal vacuum
          guarantees a patchwork, and a patchwork means you comply with the strictest applicable standard
          across every state you touch, because geofencing a chatbot&apos;s safety behavior by user location
          is both technically awkward and a bad look in a deposition. California sets the practical floor
          for the same reason its emissions rules set the floor for cars: it is too big to build a separate
          product for, so its rules become everyone&apos;s rules by default. That dynamic was the entire
          point of the federal order that got killed. Scrapping the one shot at preemption did not produce
          less regulation. It produced fifty venues writing it at once, with the biggest one moving fastest.
        </p>

        <h2 className="text-2xl font-semibold text-text-primary pt-4">Our Take</h2>

        <p>
          The labs spent the spring optimizing for the model layer of compliance, mapping their safety
          stacks to SB 53 and the EU AI Act. That work is real and it is mostly done. The layer that is
          still wide open is the one almost no one outside California is tracking week to week: the
          deployment rules that govern the products built on top of the models. Those are the rules that
          decide whether your customer-facing agent needs a human-disclosure banner, whether your hiring
          screen needs an audit trail, whether your healthcare scribe can run at all.
        </p>

        <p>
          If you ship an AI feature to California users, the practical move this month is unglamorous:
          pull the three or four bills above that map to your product, read the actual obligations rather
          than the headlines, and assume the strictest version passes. The ones that clear the second
          chamber by July 2 are the ones that reach Newsom&apos;s desk in the fall. The veto pen is real,
          but planning around a veto is not a compliance strategy.
        </p>

        <h2 className="text-2xl font-semibold text-text-primary pt-4">Three Signposts Over the Next Ninety Days</h2>

        <p>
          <span className="text-text-primary font-medium">The July 2 survivor list.</span> Which of the
          companion-chatbot and ADS bills actually clear the second chamber before recess. A bill that
          stalls in appropriations is functionally dead for the year, so the early-July count is the real
          shortlist of what reaches the governor.
        </p>

        <p>
          <span className="text-text-primary font-medium">The companion-chatbot consolidation.</span>
          Whether the four overlapping chatbot bills get merged or amended into one another, or whether the
          legislature ships conflicting definitions that vendors then have to reconcile. The drafting
          collisions are where compliance cost actually lives.
        </p>

        <p>
          <span className="text-text-primary font-medium">The Illinois and Colorado signatures.</span>
          Whether a second and third state lock in their own model-layer and chatbot rules on a different
          schedule than California. Two states with slightly different frontier-safety statutes is the
          moment the patchwork stops being theoretical and starts being a build constraint.
        </p>

        <p>
          The capital story got the headlines this spring. The regulation story is the one that changes
          what you are allowed to ship, and it is being written in a four-week sprint that most of the
          industry is not watching. We will update this as the July 2 deadline approaches.
        </p>
      </div>

      {/* Related */}
      <footer className="mt-12 pt-8 border-t border-border">
        <h2 className="text-lg font-semibold text-text-primary mb-4">Related</h2>
        <div className="grid gap-3">
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
          <Link
            href="/originals/guard-act-senate-judiciary-22-0"
            className="block bg-bg-secondary border border-border rounded-lg px-4 py-3 hover:border-accent-primary transition-colors"
          >
            <span className="text-text-primary text-sm">The Senate Just Voted 22-0 to Regulate AI Chatbots. Here Is What Is Actually in the GUARD Act.</span>
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
