import { Metadata } from 'next';
import Link from 'next/link';
import { ArrowLeft, Clock, Scale } from 'lucide-react';
import { ArticleJsonLd } from '@/components/seo/JsonLd';
import ShareBar from '@/components/originals/ShareBar';
import ArticleHero from '@/components/originals/ArticleHero';

export const metadata: Metadata = {
  alternates: { canonical: 'https://tensorfeed.ai/originals/trump-pulled-federal-ai-review-order' },
  title: 'Trump Pulled the Federal AI Review Order at the Last Minute. The Rules Now Come From Sacramento and Brussels.',
  description:
    'The Trump administration was set to sign an executive order on May 21, 2026 creating a voluntary federal review of frontier AI models before release, with agencies given up to 90 days to inspect them. Hours before signing, after calls from David Sacks, Elon Musk, and Mark Zuckerberg, the President pulled it. The competitiveness framing misses the structural point: killing the one shot at a single national standard does not deregulate frontier AI, it hands the binding rules to California SB 53, the EU AI Act, and the compliance frameworks the labs publish themselves. Inside what the order would have done, who killed it and why, what it means for the model-release pipeline, and three signposts.',
  openGraph: {
    title: 'Trump Pulled the Federal AI Review Order at the Last Minute. The Rules Now Come From Sacramento and Brussels.',
    description:
      'A voluntary federal pre-release review of frontier models died hours before signing, after calls from Sacks, Musk, and Zuckerberg. Killing the one shot at a national standard does not deregulate AI; it hands the binding rules to California, Brussels, and the labs themselves.',
    type: 'article',
    publishedTime: '2026-05-29T16:00:00Z',
    authors: ['Marcus Chen'],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Trump Pulled the Federal AI Review Order at the Last Minute. The Rules Now Come From Sacramento and Brussels.',
    description:
      'Washington backed off even a voluntary frontier-model review. The binding rules now come from California SB 53, the EU AI Act, and the labs own compliance frameworks.',
  },
};

export default function TrumpPulledFederalAiReviewOrderPage() {
  return (
    <article className="max-w-3xl mx-auto px-4 sm:px-6 py-10">
      <ArticleJsonLd
        title="Trump Pulled the Federal AI Review Order at the Last Minute. The Rules Now Come From Sacramento and Brussels."
        description="The Trump administration pulled a planned executive order creating a voluntary federal pre-release review of frontier AI models, hours before signing, after calls from David Sacks, Elon Musk, and Mark Zuckerberg. The federal retreat leaves the binding rules to California SB 53, the EU AI Act, and the labs own compliance frameworks."
        datePublished="2026-05-29"
        author="Marcus Chen"
      />

      <Link
        href="/originals"
        className="inline-flex items-center gap-1.5 text-sm text-text-muted hover:text-accent-primary transition-colors mb-8"
      >
        <ArrowLeft className="w-4 h-4" />
        Back to Originals
      </Link>

      <header className="mb-10">
        <h1 className="text-3xl sm:text-4xl font-bold text-text-primary mb-4 leading-tight">
          Trump Pulled the Federal AI Review Order at the Last Minute. The Rules Now Come From Sacramento and Brussels.
        </h1>
        <div className="flex items-center gap-3 text-sm text-text-muted">
          <span className="text-text-secondary font-medium">Marcus Chen</span>
          <span>&middot;</span>
          <time dateTime="2026-05-29">May 29, 2026</time>
          <span>&middot;</span>
          <span className="flex items-center gap-1">
            <Clock className="w-3.5 h-3.5" />
            6 min read
          </span>
        </div>
      </header>

      <ShareBar
        path="/originals/trump-pulled-federal-ai-review-order"
        title="Trump Pulled the Federal AI Review Order at the Last Minute. The Rules Now Come From Sacramento and Brussels."
      />

      <ArticleHero
        mode="graphic"
        icon={Scale}
        gradientFrom="#1e40af"
        gradientTo="#172554"
        eyebrow="REGULATION"
      />

      <div className="prose-custom space-y-6 text-lg text-text-primary leading-relaxed">
        <p className="text-lg text-text-primary leading-relaxed">
          The Trump administration spent Thursday, May 21, getting ready to sign an executive order that
          would have given the federal government its first structured look at frontier AI models before
          they ship. Hours before the ceremony, the President pulled it.
        </p>

        <p>
          The order was not stopped by a hearing or a court. It was stopped by phone calls. Reporting
          across the Washington Post,{' '}
          <a
            href="https://www.axios.com/2026/05/22/ai-executive-order-cancelled-white-house"
            target="_blank"
            rel="noopener noreferrer"
            className="text-accent-primary hover:underline"
          >
            Axios
          </a>
          , and{' '}
          <a
            href="https://www.nbcnews.com/tech/tech-news/trump-scraps-signing-landmark-executive-order-regulating-ai-rcna346288"
            target="_blank"
            rel="noopener noreferrer"
            className="text-accent-primary hover:underline"
          >
            NBC
          </a>{' '}
          has the former White House AI and crypto czar David Sacks, along with Meta chief Mark Zuckerberg
          and xAI chief Elon Musk, reaching the President between Wednesday night and Thursday morning and
          talking him out of it.
        </p>

        <p>
          What got pulled matters less for what it contained than for what its absence sets in motion. A
          federal pre-release review of frontier models was the one mechanism that could have produced a
          single national standard. Without it, the rules that actually bind a model before it ships now
          come from Sacramento, Brussels, and the legal departments of the labs themselves. That is the
          story.
        </p>

        <h2 className="text-2xl font-semibold text-text-primary pt-4">What the order would have done</h2>

        <p>
          The draft, framed around cybersecurity and AI, would have set up a voluntary arrangement.
          Leading AI companies share their most advanced models with the federal government before public
          release, and federal agencies get a window of up to 90 days to run a security review. Several
          agencies would have been directed to define which models fall under the regime and to build the
          process for evaluating not-yet-released systems alongside the companies that make them.
        </p>

        <p>
          Read the word doing the work there: voluntary. This was not a licensing regime or a hard gate.
          It was an opt-in pre-release check, the federal version of the safety-testing agreements that
          bodies like the US AI Safety Institute had already signed with individual labs. OpenAI and
          Anthropic were both at the table negotiating it.
        </p>

        <p>
          So the order mostly codified what the frontier labs were already doing on a handshake. That is
          what makes the reversal interesting. The thing that became too hot to sign was the
          formalization, not the substance.
        </p>

        <h2 className="text-2xl font-semibold text-text-primary pt-4">Who killed it, and why</h2>

        <p>
          The stated reason and the real reason are both on the record, and they do not match. Trump told
          reporters he pulled the signing because he did not like certain aspects of the order and did not
          want anything to become a &quot;blocker&quot; on an AI race the US is currently leading against
          China. That is the competitiveness argument, and it is the one the administration will keep
          repeating.
        </p>

        <p>
          The version from people close to it is blunter. One source told reporters the President
          &quot;just hates regulation,&quot; and that Sacks hated this order in particular.
        </p>

        <p>
          The three names that moved him are the tell. Sacks is the administration insider on AI. Musk
          runs a frontier lab that would have been subject to the review. Zuckerberg runs the largest
          open-weight model program in the country, the one a pre-release federal review would complicate
          most. The opposition here was not the safety camp arguing the order was too weak. It was the
          industry worried it was a precedent. A voluntary review you negotiate today is the template for
          the mandatory one a future administration writes.
        </p>

        <h2 className="text-2xl font-semibold text-text-primary pt-4">The binding rules are coming from everywhere else</h2>

        <p>
          Here is what the competitiveness framing obscures. Pulling the federal order does not leave
          frontier AI unregulated. It leaves it regulated by everyone except Washington.
        </p>

        <p>
          The California Transparency in Frontier AI Act, SB 53, is already law, with a training-compute
          threshold near 10 to the 26th FLOP, a 500 million dollar revenue line, pre-deployment
          transparency reports, and incident reporting. The EU AI Act Code of Practice for general-purpose
          models is live and carries real penalties. Both bind any lab that wants to sell into those
          markets, which is all of them.
        </p>

        <p>
          The labs have read the board. Each frontier company now runs a split my colleague mapped in our{' '}
          <Link
            href="/originals/openai-frontier-governance-framework-compliance-era"
            className="text-accent-primary hover:underline"
          >
            companion piece on the new frontier-governance frameworks
          </Link>
          : a voluntary best-practices policy it can edit at will, and a statute-facing compliance
          framework it cannot quietly walk back. OpenAI published exactly that this week.
        </p>

        <p>
          A federal pre-release review would have been the one chance to fold that patchwork into a single
          national standard the whole industry answers to. Pulling it means the consolidation does not
          happen, and the patchwork hardens.
        </p>

        <h2 className="text-2xl font-semibold text-text-primary pt-4">What it means for the model-release pipeline</h2>

        <p>
          For anyone shipping or building on frontier models, the near-term read is simple and the
          medium-term read is not.
        </p>

        <p>
          Near term, there is no new federal gate between a finished model and its release. The release
          pipeline you can track on our{' '}
          <Link href="/models" className="text-accent-primary hover:underline">models catalog</Link>{' '}
          does not get a 90-day review step bolted onto it. Models ship on the timelines the labs choose,
          the same as last week.
        </p>

        <p>
          Medium term, the compliance surface fragments instead of consolidating. A lab now answers to
          California, to the EU, to whatever a New York bill becomes, and to its own published framework,
          with no federal layer harmonizing them. For the labs that is a legal cost. For the agent builders
          downstream it is a sourcing question, because the model you wire into an agent is governed by a
          different rulebook depending on where your users sit, and for now the provider absorbs that,
          until the day a state decides the deployer shares the obligation.
        </p>

        <p>
          The GUARD Act fight in the Senate, which I{' '}
          <Link
            href="/originals/guard-act-senate-judiciary-22-0"
            className="text-accent-primary hover:underline"
          >
            wrote up when it cleared committee 22 to 0
          </Link>
          , is the reminder that the federal vacuum is at the model-oversight layer, not across the whole
          field. Congress is still moving on the consumer-protection side. It is the pre-release review of
          frontier capability specifically that just lost its federal champion.
        </p>

        <h2 className="text-2xl font-semibold text-text-primary pt-4">Our take</h2>

        <p>
          The competitiveness argument has it backwards. A single, voluntary, federal pre-release review
          was the most industry-friendly shape that oversight of frontier models was ever going to take. It
          was opt-in, it was negotiated with the labs in the room, and it would have handed every company
          one rulebook instead of fifty. Pulling it does not make AI less regulated. It makes it regulated
          less coherently.
        </p>

        <p>
          The winners are not the builders who wanted freedom. The winners are California and Brussels,
          which now set the binding rules by default, and the compliance departments inside the labs, which
          become the de facto standard-setters in the gap. The loser is the idea of a national AI policy,
          which just got pushed past the next model generation.
        </p>

        <p>
          Three signposts over the next ninety days. First, whether the administration revives a narrower
          order or cedes the ground entirely. The Washington Post has reported it is already building
          alternative defenses, so this reads as a delay, not a funeral. Second, whether a second or third
          state passes an SB 53 variant before any federal action lands, hardening the patchwork into the
          de facto national rule. Third, whether the labs, with the federal formalization off the table,
          quietly loosen the voluntary commitments they made when an order looked imminent, or hold the
          line because Sacramento and Brussels are watching regardless. The order is gone. The rulemaking
          did not stop. It just changed addresses.
        </p>
      </div>

      <footer className="mt-12 pt-8 border-t border-border">
        <h2 className="text-lg font-semibold text-text-primary mb-4">Related</h2>
        <div className="grid gap-3">
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
          <Link
            href="/originals/pentagon-blacklists-anthropic-defense-deals"
            className="block bg-bg-secondary border border-border rounded-lg px-4 py-3 hover:border-accent-primary transition-colors"
          >
            <span className="text-text-primary text-sm">The Pentagon Skipped Anthropic. Seven Other AI Companies Got the Contracts.</span>
          </Link>
        </div>
      </footer>

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
