import { Metadata } from 'next';
import Link from 'next/link';
import { ArrowLeft, Clock, Shield } from 'lucide-react';
import { ArticleJsonLd } from '@/components/seo/JsonLd';
import ShareBar from '@/components/originals/ShareBar';
import ArticleHero from '@/components/originals/ArticleHero';

export const metadata: Metadata = {
  alternates: { canonical: 'https://tensorfeed.ai/originals/white-house-jailbreak-proof-fable-5-mandate' },
  title: 'The White House Told Anthropic to Make Fable 5 Jailbreak-Proof. That Is Not a Thing That Exists.',
  description:
    "Reporting this week says the White House will only let Fable 5 back online if Anthropic blocks all jailbreaks, and security researchers say that may not be possible. No frontier model is robust to jailbreaks; adversarial robustness has been an open problem for over a decade. The mandate is a category error: it asks for a perfect outcome instead of a sound process, and it governs the one lab that complied while open weights it cannot recall ship anyway.",
  openGraph: {
    title: 'The White House Told Anthropic to Make Fable 5 Jailbreak-Proof. That Is Not a Thing That Exists.',
    description:
      'Washington set jailbreak-proof as the bar for putting Fable 5 back online. No deployed model has ever cleared it, and the field does not believe it is currently possible. Inside a mandate that asks for the nonexistent.',
    type: 'article',
    publishedTime: '2026-06-17T10:00:00Z',
    authors: ['Kira Nolan'],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'The White House Told Anthropic to Make Fable 5 Jailbreak-Proof. That Is Not a Thing That Exists.',
    description:
      'Jailbreak-proof is not an engineering target, it is an open research problem. A look at a reinstatement condition no lab can meet.',
  },
};

export default function WhiteHouseJailbreakProofMandatePage() {
  return (
    <article className="max-w-3xl mx-auto px-4 sm:px-6 py-10">
      <ArticleJsonLd
        title="The White House Told Anthropic to Make Fable 5 Jailbreak-Proof. That Is Not a Thing That Exists."
        description="Reporting this week says the White House will only reinstate Fable 5 if Anthropic blocks all jailbreaks, and security researchers say that may not be possible. No frontier model is robust to jailbreaks, and adversarial robustness has been an open problem for more than a decade."
        datePublished="2026-06-17"
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
          The White House Told Anthropic to Make Fable 5 Jailbreak-Proof. Security Researchers Say That Is Not a Thing That Exists.
        </h1>
        <div className="flex items-center gap-3 text-sm text-text-muted">
          <span className="text-text-secondary font-medium">Kira Nolan</span>
          <span>&middot;</span>
          <time dateTime="2026-06-17">June 17, 2026</time>
          <span>&middot;</span>
          <span className="flex items-center gap-1">
            <Clock className="w-3.5 h-3.5" />
            6 min read
          </span>
        </div>
      </header>

      <ShareBar
        path="/originals/white-house-jailbreak-proof-fable-5-mandate"
        title="The White House Told Anthropic to Make Fable 5 Jailbreak-Proof. Security Researchers Say That Is Not a Thing That Exists."
      />

      <ArticleHero
        mode="graphic"
        icon={Shield}
        gradientFrom="#7f1d1d"
        gradientTo="#450a0a"
        eyebrow="AI SAFETY"
      />

      {/* Article body */}
      <div className="prose-custom space-y-6 text-lg text-text-primary leading-relaxed">
        <p>
          The White House has told Anthropic what it will take to put Fable 5 back online for the
          people it just locked out. The model has to be jailbreak-proof. I have spent years reading
          adversarial machine learning papers, and I want to be precise about what that request is. It
          is a demand for a property that no deployed language model has ever had, that no published
          defense achieves, and that the researchers who study this for a living do not believe is
          currently possible.
        </p>

        <h2 className="text-2xl font-semibold text-text-primary pt-4">What Washington Actually Asked For</h2>

        <p>
          On June 12 the administration ordered Anthropic to cut Fable 5 and Mythos 5 access for all
          foreign nationals, a directive The Verge described this week as{' '}
          <a
            href="https://www.theverge.com"
            target="_blank"
            rel="noopener noreferrer"
            className="text-accent-primary hover:underline"
          >
            export rules nobody understands
          </a>
          . Because a global API cannot check passports at the token level, the only compliant setting
          was off, and both models went dark worldwide. I walked through that mechanism when it
          happened, in{' '}
          <Link
            href="/originals/fable-5-mythos-5-export-control-suspension"
            className="text-accent-primary hover:underline"
          >
            the original export control suspension
          </Link>
          .
        </p>

        <p>
          This week the reinstatement terms came into view, and they are stricter than the original
          order. WIRED reported that the White House wants Anthropic to block all jailbreaks before
          Fable 5 returns, and that security experts told them this may not be possible. Anthropic
          reportedly sent Nicholas Carlini, one of the most cited adversarial ML researchers working
          today, to explain the technical reality to the government. When the company whose model is on
          the line sends its sharpest red-teamer to manage expectations, that tells you which direction
          the expectations need managing.
        </p>

        <h2 className="text-2xl font-semibold text-text-primary pt-4">Jailbreak-Proof Describes Something That Does Not Exist</h2>

        <p>
          Here is the part the policy skips. There is no frontier model, from any lab, that is robust
          to jailbreaks. Not Claude, not GPT, not Gemini, not an open-weight model. Adversarial
          robustness has been an open research problem for more than a decade, and the consistent
          result across that decade is that published defenses get broken, often within months, often
          by the people who proposed them. Carlini built a career on exactly that pattern: a defense
          ships claiming to stop attacks, and a follow-up paper shows it does not.
        </p>

        <p>
          Fable 5 is not a counterexample. It is the example. The model got pulled in the first place
          because Amazon researchers jailbroke it days after launch, the chain of events I traced in{' '}
          <Link
            href="/originals/amazon-pulled-fable-5-hyperscaler-conflict"
            className="text-accent-primary hover:underline"
          >
            the hyperscaler conflict piece
          </Link>
          . Asking Anthropic to guarantee that no one will ever do that again is asking it to certify
          the absence of an attack nobody has invented yet. You cannot prove that negative. No one can.
        </p>

        <h2 className="text-2xl font-semibold text-text-primary pt-4">The Category Error Underneath the Order</h2>

        <p>
          Good security regulation mandates process, not perfection. It asks for red-teaming, defense
          in depth, monitoring, disclosure, and a fast patch cycle. It does not ask for zero successful
          attacks, because every serious security professional knows zero is not on the menu.
        </p>

        <p>
          A zero-jailbreak standard is the safety equivalent of demanding software with zero
          vulnerabilities. We already have a clear view of how that thinking fails. TF&apos;s own{' '}
          <Link href="/verdicts/trust-ai-found-cves" className="text-accent-primary hover:underline">
            verdict on AI-discovered CVEs
          </Link>{' '}
          lands on managing a flood of imperfect findings with human gates and reproduction, not on
          pretending a clean bill is achievable. The bar the White House set is unfalsifiable in the
          direction that would let the model ship, and trivially falsifiable in the direction that
          keeps it dark. One clever prompt, and Anthropic has failed a test that has no passing grade.
        </p>

        <h2 className="text-2xl font-semibold text-text-primary pt-4">Two Resolutions, Both Bad</h2>

        <p>
          Read the condition literally and it is a permanent ban dressed as a safety requirement. No
          model meets it, so no model comes back, and the precedent quietly threatens frontier
          deployment for every US lab the moment a regulator invokes the same standard.
        </p>

        <p>
          Soften it in private, which is the more likely path, and you get security theater plus
          something worse: an unwritten standard. If jailbreak-proof actually means hard enough to
          jailbreak that we are comfortable, then the real bar is whatever a phone call decides in a
          given week. That is not a regulation. It is discretion with a security label on it, and
          discretion is the thing export controls were supposed to replace with rules.
        </p>

        <h2 className="text-2xl font-semibold text-text-primary pt-4">The Hole the Mandate Cannot Reach</h2>

        <p>
          While Washington negotiates the impossible with the one lab that answered the phone, the
          capability it fears is already loose. Two days after the Fable pull, Zhipu shipped GLM-5.2 as
          an open-weight frontier trained on Huawei silicon, with MIT-licensed weights landing this
          week, which I covered in{' '}
          <Link
            href="/originals/glm-5-2-open-frontier-export-letter"
            className="text-accent-primary hover:underline"
          >
            the open frontier export letter piece
          </Link>
          . You cannot make open weights jailbreak-proof, and you cannot recall them. Ars Technica put
          the broader point plainly this week: dangerous models are coming no matter what, because
          offensive capability is becoming a default feature of the frontier, not a bug to be patched
          out of one vendor.
        </p>

        <p>
          So the mandate governs exactly the models that comply and is blind to the models that do not.
          It raises the bar for the lab disputing the order in public, and lowers nothing for the lab
          that published its weights and walked away. The threat model is inverted.
        </p>

        <h2 className="text-2xl font-semibold text-text-primary pt-4">Our Take</h2>

        <p>
          The danger here is not that Fable 5 can be jailbroken. Every model can be jailbroken, and a
          government that did not know that should not be setting the terms. The danger is a regulator
          certifying safety as perfection, because perfection forces the regulated party to either lie
          or stop shipping, and both outcomes are worse than honest residual-risk management.
        </p>

        <p>
          If the White House wants safer deployed models, the lever exists and it is boring: mandate
          the process, fund the red teams, require disclosure and fast patching, and accept that the
          residual risk is not zero because it never is. What it should not do is hang reinstatement on
          a guarantee that the field&apos;s best researchers, including the one Anthropic just sent into
          the room, will tell them flatly cannot be given. We track how the frontier models actually
          stack up on capability and access on our{' '}
          <Link href="/model-wars" className="text-accent-primary hover:underline">model wars</Link>{' '}
          page, and the number I am watching is not a jailbreak rate. It is a date. Anthropic heads back
          to Washington on June 22, and the question is whether anyone in the room has revised the ask
          from impossible to merely hard.
        </p>
      </div>

      {/* Related */}
      <footer className="mt-12 pt-8 border-t border-border">
        <h2 className="text-lg font-semibold text-text-primary mb-4">Related</h2>
        <div className="grid gap-3">
          <Link
            href="/originals/fable-5-mythos-5-export-control-suspension"
            className="block bg-bg-secondary border border-border rounded-lg px-4 py-3 hover:border-accent-primary transition-colors"
          >
            <span className="text-text-primary text-sm">Washington Pulled Fable 5 and Mythos 5 Three Days After Launch. Export Control Reached the Model Layer.</span>
          </Link>
          <Link
            href="/originals/amazon-pulled-fable-5-hyperscaler-conflict"
            className="block bg-bg-secondary border border-border rounded-lg px-4 py-3 hover:border-accent-primary transition-colors"
          >
            <span className="text-text-primary text-sm">Amazon Pulled the Off-Switch on Fable 5. The Hyperscaler Equity Loop Just Met Its First Conflict Test.</span>
          </Link>
          <Link
            href="/originals/glm-5-2-open-frontier-export-letter"
            className="block bg-bg-secondary border border-border rounded-lg px-4 py-3 hover:border-accent-primary transition-colors"
          >
            <span className="text-text-primary text-sm">Zhipu Shipped a 1M Open-Weight Frontier on Huawei Silicon. The Export Letter Does Not Reach It.</span>
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
