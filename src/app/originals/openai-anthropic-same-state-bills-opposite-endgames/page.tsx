import { Metadata } from 'next';
import Link from 'next/link';
import { ArrowLeft, Clock, Landmark } from 'lucide-react';
import { ArticleJsonLd } from '@/components/seo/JsonLd';
import ArticleHero from '@/components/originals/ArticleHero';
import ShareBar from '@/components/originals/ShareBar';

export const metadata: Metadata = {
  alternates: {
    canonical:
      'https://tensorfeed.ai/originals/openai-anthropic-same-state-bills-opposite-endgames',
  },
  title:
    'OpenAI and Anthropic Now Back the Same State AI Bills. They Want Opposite Things From Them.',
  description:
    'Both labs endorsed California SB 53, New York RAISE, and Illinois SB 315. OpenAI calls it reverse federalism, a route to a de facto national standard. Anthropic is building a floor that makes preemption harder to justify. Same votes, opposite endgames, and the Great American AI Act would freeze the exact layer they are fighting over.',
  openGraph: {
    title:
      'OpenAI and Anthropic Now Back the Same State AI Bills. They Want Opposite Things From Them.',
    description:
      'Two labs, the same three state bills, opposite endgames. The real fight is not disclosure anymore. It is who gets to verify.',
    type: 'article',
    publishedTime: '2026-07-16T11:00:00Z',
    authors: ['Adrian Vale'],
  },
  twitter: {
    card: 'summary_large_image',
    title:
      'OpenAI and Anthropic Now Back the Same State AI Bills. They Want Opposite Things From Them.',
    description:
      'Same votes, opposite endgames. The AI policy fight moved from disclosure to verification.',
  },
};

export default function OpenAIAnthropicStateBillsPage() {
  return (
    <article className="max-w-3xl mx-auto px-4 sm:px-6 py-10">
      <ArticleJsonLd
        title="OpenAI and Anthropic Now Back the Same State AI Bills. They Want Opposite Things From Them."
        description="Both labs endorsed California SB 53, New York RAISE, and Illinois SB 315, for opposite strategic reasons. Inside the reverse federalism play, the floor strategy, and why the audit layer is the contested territory."
        datePublished="2026-07-16"
        author="Adrian Vale"
      />

      {/* Back link */}
      <Link
        href="/originals"
        className="inline-flex items-center gap-1.5 text-sm text-text-muted hover:text-accent-primary transition-colors mb-8"
      >
        <ArrowLeft className="w-4 h-4" />
        Back to Originals
      </Link>

      {/* Hero (graphic mode: indigo into violet) */}
      <ArticleHero
        mode="graphic"
        icon={Landmark}
        gradientFrom="#312E81"
        gradientTo="#5B21B6"
        eyebrow="Governance &middot; Preemption"
      />

      {/* Header */}
      <header className="mb-10">
        <h1 className="text-3xl sm:text-4xl font-bold text-text-primary mb-4 leading-tight">
          OpenAI and Anthropic Now Back the Same State AI Bills. They Want Opposite Things From
          Them.
        </h1>
        <div className="flex items-center gap-3 text-sm text-text-muted">
          <span className="text-text-secondary font-medium">Adrian Vale</span>
          <span>&middot;</span>
          <time dateTime="2026-07-16">July 16, 2026</time>
          <span>&middot;</span>
          <span className="flex items-center gap-1">
            <Clock className="w-3.5 h-3.5" />7 min read
          </span>
        </div>
      </header>

      <ShareBar
        path="/originals/openai-anthropic-same-state-bills-opposite-endgames"
        title="OpenAI and Anthropic Now Back the Same State AI Bills. They Want Opposite Things From Them."
      />

      {/* Article body */}
      <div className="prose-custom space-y-6 text-lg text-text-primary leading-relaxed">
        <p>
          The Hill ran a story this week with a headline that reads like a truce: OpenAI and
          Anthropic are both backing state AI bills while Congress stalls. Two labs that agree on
          almost nothing in public are now on the same side of the same three pieces of
          legislation. California&apos;s SB 53. New York&apos;s RAISE Act. Illinois&apos;s SB 315.
        </p>

        <p>
          It is not a truce. Read what each company says it wants out of those votes and you get two
          strategies pointed in opposite directions, using identical ballots. One is trying to build
          a national standard out of state parts. The other is trying to build a floor that Congress
          cannot pour concrete over. Both need the same bills to pass to get there.
        </p>

        <p>
          The part nobody is pricing correctly: the thing they are actually fighting over is not
          disclosure. That argument is settled. It is verification, and Illinois just moved the line.
        </p>

        <h2 className="text-2xl font-semibold text-text-primary pt-4">
          What Illinois Actually Did on July 6
        </h2>

        <p>
          Governor JB Pritzker signed SB 315, the Artificial Intelligence Safety Measures Act, on
          July 6. It applies to large frontier developers, defined as companies with annual gross
          revenue above $500 million training models past the frontier compute threshold. The law
          takes effect January 1, 2027. The framework and audit obligations land January 1, 2028, or
          90 days after a developer first qualifies, whichever is later.
        </p>

        <p>
          The disclosure provisions are familiar. Publish a safety framework, report critical safety
          incidents (72 hours in Illinois), maintain compliance processes, protect whistleblowers.
          California and New York already got there. If SB 315 stopped at that, it would be the
          third verse of the same song.
        </p>

        <p>
          It does not stop there. Illinois is the first state in the country to require{' '}
          <em>recurring</em> independent third-party audits of covered AI systems, by qualified
          experts without financial conflicts of interest. New York&apos;s RAISE Act requires a
          single independent audit at the moment a developer becomes large enough to qualify. One
          audit, once, forever. Illinois made it annual.
        </p>

        <p>
          Pritzker&apos;s framing in the signing release was not subtle. &quot;As AI systems become
          more powerful and the federal government is unwilling to step in, states have a
          responsibility to protect our people.&quot; Illinois Attorney General Kwame Raoul said the
          state is &quot;stepping up to fill the gap.&quot; That is a jurisdictional claim, not a
          safety claim.
        </p>

        <p>
          Anthropic was the first AI lab to support the bill. Cesar Fernandez, the company&apos;s
          head of US state and local government relations, called it &quot;an important step toward
          the accountability this technology demands.&quot; Encode AI&apos;s Sunny Gandhi put the
          actual thesis more plainly: independent audits mean &quot;the public doesn&apos;t have to
          take AI companies at their word.&quot;
        </p>

        <h2 className="text-2xl font-semibold text-text-primary pt-4">
          Four Frameworks, One Contested Column
        </h2>

        <p>
          Here is the landscape as of today, including the federal draft that would sit on top of all
          three. Watch the audit column. Everything else has converged.
        </p>

        <div className="bg-bg-secondary border border-border rounded-lg overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border">
                <th className="text-left px-4 py-3 text-text-primary font-semibold">Framework</th>
                <th className="text-left px-4 py-3 text-text-primary font-semibold">
                  Incident report
                </th>
                <th className="text-left px-4 py-3 text-text-primary font-semibold">
                  Independent audit
                </th>
                <th className="text-left px-4 py-3 text-text-primary font-semibold">Penalty</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              <tr>
                <td className="px-4 py-3 text-accent-primary font-medium">CA SB 53</td>
                <td className="px-4 py-3 font-mono">15 days</td>
                <td className="px-4 py-3">None</td>
                <td className="px-4 py-3 font-mono">$1M / violation</td>
              </tr>
              <tr>
                <td className="px-4 py-3 text-accent-primary font-medium">NY RAISE Act</td>
                <td className="px-4 py-3 font-mono">72 hours</td>
                <td className="px-4 py-3">Once, at qualification</td>
                <td className="px-4 py-3 font-mono">Up to $3M</td>
              </tr>
              <tr>
                <td className="px-4 py-3 text-accent-primary font-medium">IL SB 315</td>
                <td className="px-4 py-3 font-mono">72 hours</td>
                <td className="px-4 py-3 text-accent-primary font-semibold">Annual, recurring</td>
                <td className="px-4 py-3 font-mono">Up to $3M</td>
              </tr>
              <tr>
                <td className="px-4 py-3 text-accent-primary font-medium">
                  Great American AI Act (draft)
                </td>
                <td className="px-4 py-3 font-mono">15 days / 24 hrs</td>
                <td className="px-4 py-3 text-accent-primary font-semibold">
                  Semi-annual, licensed IVO
                </td>
                <td className="px-4 py-3 font-mono">$1M / day</td>
              </tr>
            </tbody>
          </table>
        </div>

        <p>
          Disclosure obligations are now boilerplate across all four. The variance is entirely in who
          checks the homework and how often. That is the whole game, and it is worth understanding
          why: a published safety framework is a document a company writes about itself. A recurring
          audit by a conflict-free third party is someone else writing it. Those are not two grades of
          the same requirement. They are different requirements wearing the same word.
        </p>

        <h2 className="text-2xl font-semibold text-text-primary pt-4">
          OpenAI&apos;s Play: Reverse Federalism
        </h2>

        <p>
          OpenAI&apos;s chief of global affairs, Chris Lehane, described the company&apos;s approach
          to The Hill with unusual candor. OpenAI is cherry picking a handful of similar state bills
          to build what he called a &quot;de facto&quot; national framework. His words for the
          mechanism: &quot;a form of reverse federalism,&quot; where &quot;you&apos;re basically
          getting the states to replicate each other.&quot;
        </p>

        <p>
          That is a coherent strategy and I do not think it is a cynical one. More than 1,500 state
          AI bills were introduced in the first half of this year. If you are running a company that
          has to comply with all of them, 50 different regimes is a genuine operational nightmare,
          and the cheapest exit is to make sure the ones that pass all say the same thing. OpenAI
          endorsed the Illinois bill in May, after California and New York, specifically because it
          echoed the language of the other two.
        </p>

        <p>
          The endgame matters though. Convergence is the argument for preemption, not against it.
          Once a handful of large states have functionally identical rules, &quot;just federalize the
          text everyone already agrees on&quot; becomes the reasonable-sounding position, and the
          federal version is the one that gets negotiated in a building where the labs have far more
          leverage than they do in Springfield. Reverse federalism is not an alternative to a
          national standard. It is a way of writing the first draft of one.
        </p>

        <h2 className="text-2xl font-semibold text-text-primary pt-4">
          Anthropic&apos;s Play: Build a Floor
        </h2>

        <p>
          Anthropic backs the same bills and refuses the conclusion. Its stated position is that
          Congress should not preempt state law unless it enacts a federal framework at least as
          strong as the one Anthropic has proposed. The company has been explicit that it would
          prefer federal-level rules over a state patchwork, and equally explicit that powerful AI
          is not going to wait for Washington to agree on anything.
        </p>

        <p>
          So the state bills are a floor. Every state law that lands with real verification in it
          raises the price of preemption, because preemption now has to explain what it is taking
          away. Anthropic being first to endorse the one bill with recurring audits is not a
          coincidence. It is the strategy stated out loud.
        </p>

        <p>
          I will note the obvious: this is also the position that costs Anthropic the least. It
          already publishes a responsible scaling policy and system cards, and it has said the state
          requirements largely formalize what it does anyway. Endorsing rules you already comply with
          is cheap, and it is expensive for competitors who do not. Strategy and principle point the
          same direction here. That does not make it insincere, but it should temper how much credit
          anyone extends for it.
        </p>

        <h2 className="text-2xl font-semibold text-text-primary pt-4">
          The Collision Nobody Has Priced
        </h2>

        <p>
          On June 4, Reps. Jay Obernolte (R-CA) and Lori Trahan (D-MA) dropped the Great American AI
          Act as a 269-page discussion draft. We{' '}
          <Link
            href="/originals/great-american-ai-act-preemption"
            className="text-accent-primary hover:underline"
          >
            covered the draft itself
          </Link>{' '}
          when it landed. The relevant provision: three years of preemption on state laws that
          specifically regulate the <em>development</em> of an AI model. Deployment and use laws are
          untouched.
        </p>

        <p>
          Now line that up against the table. The state laws whose preemptive exposure is greatest
          are exactly the three both labs just endorsed, and the specific provision most at risk is
          the audit mandate, because auditing how a model is built is development-layer regulation by
          any reading. Illinois passed the strongest verification requirement in the country on July
          6. The federal draft would freeze it before it takes effect in 2028.
        </p>

        <p>
          The draft does not delete audits. It relocates them, to semi-annual reviews by independent
          verification organizations licensed through NIST&apos;s CAISI. On paper that is stricter
          than Illinois. Twice a year beats once. But it swaps a state attorney general with
          subpoena power for a federal licensing regime that has to be stood up from nothing, and it
          caps continuing-violation penalties at $1 million per day where Illinois and New York allow
          up to $3 million for repeat violations with no equivalent daily cap. There is also a
          definitional oddity worth flagging: the federal draft sets its frontier developer threshold
          at $50 million in gross revenue, an order of magnitude below the $500 million the states
          use for large frontier developers. Broader net, different mesh.
        </p>

        <p>
          The honest read is that nobody knows whether that trade is good, because the federal
          enforcement machinery does not exist yet and the state machinery does. Congress voted 99 to
          1 to strip a 10-year state AI moratorium out of budget reconciliation in July 2025. The
          preemption instinct did not survive contact with a floor vote then. This draft is narrower
          and better argued, and it is still a discussion draft that has not been formally
          introduced.
        </p>

        <h2 className="text-2xl font-semibold text-text-primary pt-4">Our Take</h2>

        <p>
          Treat &quot;OpenAI and Anthropic both endorsed it&quot; as close to zero information about
          a bill. Two companies with opposite theories of where AI law should live are voting the
          same way on the same text for reasons that cancel out. Unanimity among the regulated is
          not evidence a rule has teeth. Sometimes it is evidence of the opposite.
        </p>

        <p>
          The signal worth tracking is narrower than the headline. Ask one question of any AI bill,
          state or federal: does someone outside the company have to look, on a schedule, with access
          to unredacted material, and what happens when they find something. Everything else on the
          page is a press release with a bill number. By that test there is exactly one law in the
          United States that qualifies right now, it was signed ten days ago, it does not bite until
          2028, and there is a live federal draft that would switch it off first.
        </p>

        <p>
          Three signposts over the next ninety days. Whether the Great American AI Act gets formally
          introduced with the preemption clause intact or whether it gets stripped the way the
          moratorium was in 2025. Whether any lab publicly opposes the Illinois audit provision now
          that it is law rather than a proposal, which is the moment the endorsements get tested.
          And whether a fourth state copies the recurring-audit language, because reverse federalism
          cuts both ways: if replication is the mechanism, the safety side can use it too, and
          Virginia is already studying the verification-organization model under SB 384.
        </p>

        <p>
          We are tracking the frontier compliance regimes as they take effect on our{' '}
          <Link href="/status" className="text-accent-primary hover:underline">
            status
          </Link>{' '}
          and{' '}
          <Link href="/models" className="text-accent-primary hover:underline">
            models
          </Link>{' '}
          pages. January 1, 2027 is the next date that matters. January 1, 2028 is the one that
          decides whether any of this was real.
        </p>
      </div>

      {/* Related */}
      <footer className="mt-12 pt-8 border-t border-border">
        <h2 className="text-lg font-semibold text-text-primary mb-4">Related</h2>
        <div className="grid gap-3">
          <Link
            href="/originals/great-american-ai-act-preemption"
            className="block bg-bg-secondary border border-border rounded-lg px-4 py-3 hover:border-accent-primary transition-colors"
          >
            <span className="text-text-primary text-sm">
              Congress Finally Wrote the Preemption Down: Three Years, Development Only. Sacramento
              Keeps the Rest.
            </span>
          </Link>
          <Link
            href="/originals/fli-safety-index-conditional-pause-clause"
            className="block bg-bg-secondary border border-border rounded-lg px-4 py-3 hover:border-accent-primary transition-colors"
          >
            <span className="text-text-primary text-sm">
              Every Frontier Lab Promised to Pause. Now They Only Promise to Pause If Everyone Else
              Does.
            </span>
          </Link>
          <Link
            href="/originals/guard-act-senate-judiciary-22-0"
            className="block bg-bg-secondary border border-border rounded-lg px-4 py-3 hover:border-accent-primary transition-colors"
          >
            <span className="text-text-primary text-sm">
              The Senate Just Voted 22-0 to Regulate AI Chatbots. Here Is What Is Actually in the
              GUARD Act.
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
