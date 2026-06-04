import type { Metadata } from 'next';
import Link from 'next/link';
import { ArrowLeft, Clock, Coins } from 'lucide-react';
import { ArticleJsonLd } from '@/components/seo/JsonLd';
import ShareBar from '@/components/originals/ShareBar';
import ArticleHero from '@/components/originals/ArticleHero';

const slug = 'openai-chatgpt-bank-access-agent-trust-gap';
const title =
  'OpenAI Wants ChatGPT in Your Bank Account. That Is the Opposite of How Agent Money Should Work.';
const description =
  'OpenAI is wiring ChatGPT into financial accounts through a Plaid connection. Broad standing access to your bank is the convenient answer and the wrong architecture. I have spent this whole stretch building the other one: no custody, per-action authorization, a signed receipt for every paid call. Today our own /api/stats crossed into the thousands of verifiable paid agent calls, each with a receipt an auditor can check. That is the contrast that matters.';
const author = 'Adrian Vale';
const isoDate = '2026-05-17T10:00:00.000Z';
const displayDate = 'May 17, 2026';

export const metadata: Metadata = {
  alternates: { canonical: 'https://tensorfeed.ai/originals/openai-chatgpt-bank-access-agent-trust-gap' },
  title,
  description,
  openGraph: {
    title,
    description,
    type: 'article',
    publishedTime: isoDate,
    authors: [author],
    url: `https://tensorfeed.ai/originals/${slug}`,
  },
  twitter: {
    card: 'summary_large_image',
    title,
    description,
  },
};

export default function Page() {
  return (
    <article className="max-w-3xl mx-auto px-4 sm:px-6 py-10">
      <ArticleJsonLd
        title={title}
        description={description}
        datePublished={isoDate}
        author={author}
        url={`https://tensorfeed.ai/originals/${slug}`}
      />

      <Link
        href="/originals"
        className="inline-flex items-center gap-2 text-sm text-text-secondary hover:text-text-primary transition-colors"
      >
        <ArrowLeft className="w-4 h-4" />
        Back to Originals
      </Link>

      <header className="mt-6">
        <h1 className="text-3xl sm:text-4xl font-bold text-text-primary leading-tight">
          {title}
        </h1>
        <div className="mt-3 flex items-center gap-2 text-sm text-text-muted">
          <span className="text-text-secondary font-medium">{author}</span>
          <span>&middot;</span>
          <time dateTime="2026-05-17">{displayDate}</time>
          <span>&middot;</span>
          <span className="inline-flex items-center gap-1">
            <Clock className="w-3.5 h-3.5" />5 min read
          </span>
        </div>
      </header>

      <ShareBar path={`/originals/${slug}`} title={title} />

      <ArticleHero
        mode="graphic"
        icon={Coins}
        gradientFrom="#854d0e"
        gradientTo="#422006"
        eyebrow="CAPITAL"
      />

      <div className="prose-custom space-y-6 text-text-secondary leading-relaxed mt-8">
        <p className="text-lg text-text-primary leading-relaxed">
          OpenAI is wiring ChatGPT into your financial accounts through a
          Plaid connection. I understand why. It is the shortest path to
          an assistant that can actually move money for you. It is also
          the wrong architecture, and I want to be precise about why,
          because we have spent this entire stretch building the other
          one.
        </p>

        <h2 className="text-2xl font-semibold text-text-primary pt-4">
          What was actually announced
        </h2>
        <p>
          As{' '}
          <a
            href="https://www.theverge.com/ai-artificial-intelligence/931122/openai-chatgpt-financial-accounts-plaid-connection"
            target="_blank"
            rel="noopener noreferrer"
            className="text-accent-primary hover:underline"
          >
            The Verge reported on May 15
          </a>
          , the plan is a ChatGPT to financial-account link by way of
          Plaid, the aggregation layer that already sits behind a large
          share of fintech. Plaid is good infrastructure. That is not
          the issue. The issue is the shape of the trust: a standing
          connection that grants a model broad, durable read into your
          accounts so it can be helpful on demand.
        </p>
        <p>
          Standing access is the convenient default and the dangerous
          one. The moment an agent holds durable account reach, the
          blast radius of a bad prompt, a jailbreak, or a model error is
          your money, and the audit trail is whatever the platform
          decides to keep.
        </p>

        <h2 className="text-2xl font-semibold text-text-primary pt-4">
          The other architecture exists, and we run it
        </h2>
        <p>
          There is a different way to let an agent pay, and it is not
          theoretical. It is the model behind x402 and the{' '}
          <Link
            href="/agent-fair-trade"
            className="text-accent-primary hover:underline"
          >
            Agent Fair-Trade Agreement
          </Link>
          : no custody, per-action authorization, and a signed receipt
          for every paid call. The agent does not get a key to the
          vault. It gets to authorize one specific payment, for one
          specific call, and it walks away holding cryptographic proof
          of exactly what it paid for. We wrote down how the rail itself
          works in our{' '}
          <Link href="/a2a-x402" className="text-accent-primary hover:underline">
            x402 coverage
          </Link>{' '}
          and how the merchant side stays non-custodial in the{' '}
          <Link
            href="/developers/agent-payments"
            className="text-accent-primary hover:underline"
          >
            agent payments docs
          </Link>
          .
        </p>
        <p>
          The difference is not cosmetic. Standing bank access is a
          capability you hand over once and hope is scoped well forever.
          A per-call settlement is a capability that expires the instant
          the call completes. One of these fails open. The other fails
          closed.
        </p>

        <h2 className="text-2xl font-semibold text-text-primary pt-4">
          Receipts are the part nobody demos
        </h2>
        <p>
          Here is the number I care about today. Our public{' '}
          <Link href="/developers" className="text-accent-primary hover:underline">
            stats endpoint
          </Link>{' '}
          crossed into the thousands of successful paid agent API calls,
          and every one of them returned a signed receipt an auditor can
          verify against our published key. Not a dashboard we control. A
          receipt the agent holds. If we ever billed wrong, the proof is
          in the agent&apos;s hands, not ours.
        </p>
        <p>
          That is the property a Plaid-shaped connection does not give
          you. Broad access optimizes for the assistant feeling capable.
          Signed, per-action receipts optimize for you being able to
          prove what happened later. Agent finance without verifiable
          receipts is just trust me with a bigger surface area.
        </p>

        <h2 className="text-2xl font-semibold text-text-primary pt-4">
          Why the convenient version wins anyway, for now
        </h2>
        <p>
          I am not naive about adoption. The standing-access version
          ships first because it demos better and because the incumbent
          with the distribution gets to define the default. We saw the
          same dynamic when{' '}
          <Link
            href="/originals/google-a2a-x402-payments-extension"
            className="text-accent-primary hover:underline"
          >
            Google put sixty payment companies behind an agent rail
          </Link>
          : the acceptance side gets built loudly while the trust
          architecture gets argued quietly. Defaults set now are
          expensive to unset later. That is exactly why it is worth
          saying plainly which default is the safe one before it
          hardens.
        </p>

        <h2 className="text-2xl font-semibold text-text-primary pt-4">
          Our Take
        </h2>
        <p>
          ChatGPT reaching into your bank through Plaid will be popular
          and it will work most of the time. Most of the time is the
          problem. The right design for agent money is the boring one:
          the agent never holds custody, authorizes exactly one action
          at a time, and leaves you a signed receipt for each. We did not
          build it that way to be purists. We built it that way because
          the failure mode of the convenient version is your accounts,
          and there is no good apology for that. Convenience is winning
          the demo. It should not win the standard.
        </p>
      </div>

      <footer className="mt-12 pt-8 border-t border-border">
        <h2 className="text-2xl font-semibold text-text-primary">Related</h2>
        <div className="mt-4 grid gap-3 sm:grid-cols-3">
          <Link
            href="/originals/google-a2a-x402-payments-extension"
            className="block rounded-lg border border-border p-4 hover:border-accent-primary/40 transition-colors"
          >
            <span className="text-sm font-medium text-text-primary">
              Google Put 60 Payment Companies Behind an Agent Rail
            </span>
          </Link>
          <Link
            href="/agent-fair-trade"
            className="block rounded-lg border border-border p-4 hover:border-accent-primary/40 transition-colors"
          >
            <span className="text-sm font-medium text-text-primary">
              The Agent Fair-Trade Agreement
            </span>
          </Link>
          <Link
            href="/originals/mistral-europe-ai-sovereignty-two-year-clock"
            className="block rounded-lg border border-border p-4 hover:border-accent-primary/40 transition-colors"
          >
            <span className="text-sm font-medium text-text-primary">
              Mistral Says Europe Has Two Years
            </span>
          </Link>
        </div>

        <div className="mt-8 flex items-center gap-4 text-sm">
          <Link
            href="/originals"
            className="inline-flex items-center gap-2 text-text-secondary hover:text-text-primary transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
            Back to Originals
          </Link>
          <Link
            href="/"
            className="text-text-secondary hover:text-text-primary transition-colors"
          >
            Back to Feed
          </Link>
        </div>
      </footer>
    </article>
  );
}
