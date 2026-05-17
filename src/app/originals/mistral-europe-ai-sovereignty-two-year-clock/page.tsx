import type { Metadata } from 'next';
import Link from 'next/link';
import { ArrowLeft, Clock, Scale } from 'lucide-react';
import { ArticleJsonLd } from '@/components/seo/JsonLd';
import ShareBar from '@/components/originals/ShareBar';
import ArticleHero from '@/components/originals/ArticleHero';

const slug = 'mistral-europe-ai-sovereignty-two-year-clock';
const title =
  'Mistral Says Europe Has Two Years. The Compute Map Says the Clock Runs Faster Than That.';
const description =
  'The Mistral CEO told Europe it has roughly two years to avoid becoming an American AI vassal state. I read that against the data we already publish: the frontier tier on our model catalog is almost entirely US labs, the attention is concentrated there too, and the compute that decides the next two years is being financed through American IPOs and Gulf capital. The warning is correct. The timeline is generous.';
const author = 'Kira Nolan';
const isoDate = '2026-05-17T10:00:00.000Z';
const displayDate = 'May 17, 2026';

export const metadata: Metadata = {
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
            <Clock className="w-3.5 h-3.5" />6 min read
          </span>
        </div>
      </header>

      <ShareBar path={`/originals/${slug}`} title={title} />

      <ArticleHero
        mode="graphic"
        icon={Scale}
        gradientFrom="#1e40af"
        gradientTo="#172554"
        eyebrow="REGULATION"
      />

      <div className="prose-custom space-y-6 text-text-secondary leading-relaxed mt-8">
        <p className="text-lg text-text-primary leading-relaxed">
          The Mistral CEO told Europe it has about two years to avoid
          becoming an American AI vassal state. He is right about the
          direction. I think he is being generous about the time. The
          window is not measured in product roadmaps. It is measured in
          where the compute gets built and who finances it, and on that
          axis the next two years are already mostly spoken for.
        </p>

        <h2 className="text-2xl font-semibold text-text-primary pt-4">
          What the warning actually says
        </h2>
        <p>
          The framing, reported by{' '}
          <a
            href="https://www.businessinsider.com/mistral-ceo-warns-europe-2-years-avoid-us-ai-dependence-2026-5"
            target="_blank"
            rel="noopener noreferrer"
            className="text-accent-primary hover:underline"
          >
            Business Insider on May 17
          </a>
          , is a vassal state: a Europe that consumes American models,
          runs on American clouds, and sets its industrial policy around
          capabilities it does not control. That is not a hypothetical.
          It is a description of the present with the dependency curve
          extended two years to the right.
        </p>
        <p>
          A vassal does not lack technology. It lacks leverage. The
          question is not whether Europe can train a competitive model.
          Mistral has proven it can. The question is whether the rest of
          the stack underneath that model, the silicon, the financing,
          the inference capacity, stays sovereign long enough to matter.
        </p>

        <h2 className="text-2xl font-semibold text-text-primary pt-4">
          The frontier tier is already a US roster
        </h2>
        <p>
          Look at our{' '}
          <Link href="/models" className="text-accent-primary hover:underline">
            model catalog
          </Link>{' '}
          and the shape is hard to miss. The flagship tier, the models
          that set the ceiling everyone else is benchmarked against, is
          almost entirely Anthropic, OpenAI, and Google. Mistral is the
          strongest European entry on that board and it is still the
          challenger, not the holder. Our{' '}
          <Link href="/attention" className="text-accent-primary hover:underline">
            attention index
          </Link>{' '}
          tells the same story from the demand side: mindshare, the
          coverage and developer pull that compounds into defaults,
          concentrates on the same three names. Sovereignty is not just
          about having a model. It is about being the model other people
          reach for by reflex, and reflexes are American right now.
        </p>
        <p>
          None of this is a knock on Mistral&apos;s engineering. It is a
          statement about gravity. When the defaults sit elsewhere, every
          integration, every framework tutorial, every agent harness
          ships pointed at the incumbent first. That is the vassal
          mechanic, and it operates whether or not anyone intends it.
        </p>

        <h2 className="text-2xl font-semibold text-text-primary pt-4">
          The compute is being financed in dollars and Gulf capital
        </h2>
        <p>
          Here is why I think two years is optimistic. The decisive
          variable is inference capacity, and the capital that builds it
          is being raised on American markets right now. We documented
          this in our own coverage. Cerebras went public and{' '}
          <Link
            href="/originals/cerebras-95-billion-ipo-inference-bet"
            className="text-accent-primary hover:underline"
          >
            closed near a 95 billion dollar market cap
          </Link>
          , the largest US tech IPO since 2019, with roughly 86 percent
          of its revenue concentrated in two UAE entities. The
          non-Nvidia inference bet is now a public-market story, and the
          market it answers to is in New York, with a structural Gulf
          dependency we{' '}
          <Link
            href="/originals/cerebras-g42-cfius-national-security-tax"
            className="text-accent-primary hover:underline"
          >
            walked through on the CFIUS angle
          </Link>
          . Anthropic, separately, is raising in the 900 to 950 billion
          dollar range. The money that decides the next compute
          generation is not European money, and it is not waiting two
          years to deploy.
        </p>
        <p>
          Europe can write a model. It is much harder to write a model,
          own the wafer it runs on, and finance the data center it lives
          in, all from inside the bloc, on a two-year clock, while the
          counterparties have a multi-year head start in all three. The
          warning is correct precisely because the gap is not at the
          model layer where Europe is strong. It is at the layers under
          it where the clock is shorter than two years.
        </p>

        <h2 className="text-2xl font-semibold text-text-primary pt-4">
          What sovereignty would actually require
        </h2>
        <p>
          A serious answer is not another model. It is procurement and
          rails. It is European public money committing to European
          inference the way the US committed through its IPO pipeline and
          the Gulf committed through direct stakes. It is open weights
          treated as strategic infrastructure rather than a marketing
          tier. And it is owning the agent and payment standards layer,
          not just consuming it. The agent economy is being plumbed now,
          and standards set early are very hard to dislodge later, a
          pattern I keep coming back to when I look at how fast the
          acceptance side of agent commerce is being laid down.
        </p>
        <p>
          That last point is the one Europe is closest to losing
          quietly. A model can be swapped. A settled standard, the thing
          every agent reaches for by default, is the real vassal trap,
          and it does not announce itself with a headline.
        </p>

        <h2 className="text-2xl font-semibold text-text-primary pt-4">
          Our Take
        </h2>
        <p>
          The Mistral warning is right and I would shorten it. Two years
          is the political timeline. The technical timeline, set by where
          compute is financed and which defaults harden, is already
          running and a good deal of it is decided. Europe is not behind
          at the model layer. It is behind at the layers the data keeps
          pointing to: silicon ownership, inference financing, and the
          standards that agents will reach for without thinking. If the
          response is one more sovereign model and a press release, the
          vassal outcome is the base case. If the response is European
          capital underwriting European inference and European
          institutions owning the agent rails, two years is enough. The
          warning is not the problem. Treating it as a model problem
          would be.
        </p>
      </div>

      <footer className="mt-12 pt-8 border-t border-border">
        <h2 className="text-2xl font-semibold text-text-primary">Related</h2>
        <div className="mt-4 grid gap-3 sm:grid-cols-3">
          <Link
            href="/originals/cerebras-95-billion-ipo-inference-bet"
            className="block rounded-lg border border-border p-4 hover:border-accent-primary/40 transition-colors"
          >
            <span className="text-sm font-medium text-text-primary">
              Cerebras Went Public at a 95 Billion Dollar Close
            </span>
          </Link>
          <Link
            href="/originals/cerebras-g42-cfius-national-security-tax"
            className="block rounded-lg border border-border p-4 hover:border-accent-primary/40 transition-colors"
          >
            <span className="text-sm font-medium text-text-primary">
              Cerebras Cleared the IPO, Not the G42 Question
            </span>
          </Link>
          <Link
            href="/originals/google-a2a-x402-payments-extension"
            className="block rounded-lg border border-border p-4 hover:border-accent-primary/40 transition-colors"
          >
            <span className="text-sm font-medium text-text-primary">
              Google Put 60 Payment Companies Behind an Agent Rail
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
