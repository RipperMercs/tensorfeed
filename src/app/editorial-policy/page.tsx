import { Metadata } from 'next';
import Link from 'next/link';
import {
  BookOpenCheck,
  ShieldCheck,
  ListChecks,
  Link2,
  Pencil,
  AlertTriangle,
  Mail,
  Scale,
  UserCheck,
  Bot,
} from 'lucide-react';

export const metadata: Metadata = {
  title: 'Editorial Policy',
  description:
    'TensorFeed.ai editorial standards: how we source and fact-check AI news, attribute aggregated content, label opinions, disclose conflicts, and correct errors.',
  alternates: {
    canonical: 'https://tensorfeed.ai/editorial-policy',
  },
  openGraph: {
    type: 'website',
    url: 'https://tensorfeed.ai/editorial-policy',
    title: 'Editorial Policy',
    description:
      'TensorFeed.ai editorial standards: how we source and fact-check AI news, attribute aggregated content, label opinions, disclose conflicts, and correct errors.',
    siteName: 'TensorFeed.ai',
    images: [{ url: '/tensorfeed-logo.png', width: 1024, height: 1024 }],
  },
  twitter: {
    card: 'summary',
    title: 'Editorial Policy',
    description:
      'TensorFeed.ai editorial standards: how we source and fact-check AI news, attribute aggregated content, label opinions, disclose conflicts, and correct errors.',
  },
};

export default function EditorialPolicyPage() {
  const lastUpdated = 'April 18, 2026';

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      {/* Header */}
      <div className="mb-10">
        <div className="flex items-center gap-3 mb-2">
          <BookOpenCheck className="w-7 h-7 text-accent-primary" />
          <h1 className="text-3xl font-bold text-text-primary">Editorial Policy</h1>
        </div>
        <p className="text-text-muted text-sm">Last updated: {lastUpdated}</p>
      </div>

      <div className="space-y-10 text-text-secondary leading-relaxed">
        {/* Summary */}
        <section>
          <p>
            TensorFeed.ai is an independent publication covering artificial intelligence,
            machine learning, model releases, API pricing, and the operational status of
            the AI stack. We publish two kinds of content: aggregated news (headlines and
            short snippets linked back to their original publishers) and original editorial
            articles written by the TensorFeed editorial team under{' '}
            <Link href="/originals" className="text-accent-primary hover:underline">
              /originals
            </Link>
            . This page explains how we make editorial decisions, verify information,
            credit sources, separate reporting from opinion, and correct mistakes.
          </p>
        </section>

        {/* Mission */}
        <section>
          <div className="flex items-center gap-2 mb-3">
            <Scale className="w-5 h-5 text-accent-secondary" />
            <h2 className="text-xl font-semibold text-text-primary">Mission and Scope</h2>
          </div>
          <p>
            Our mission is to be the fastest, cleanest, most reliable source of truth for
            what is happening in AI, served equally well to human readers and to AI agents.
            We cover frontier model releases, open-source model ecosystems, AI APIs and
            pricing, agent frameworks, AI safety research, incidents and outages,
            benchmarks, and the companies that build and fund these systems. We do not
            cover unrelated consumer technology, politics outside its direct intersection
            with AI policy, or celebrity news.
          </p>
        </section>

        {/* Editorial independence */}
        <section>
          <div className="flex items-center gap-2 mb-3">
            <ShieldCheck className="w-5 h-5 text-accent-secondary" />
            <h2 className="text-xl font-semibold text-text-primary">Editorial Independence</h2>
          </div>
          <p className="mb-3">
            TensorFeed is operated by Pizza Robot Studios LLC, an independent company
            based in Los Angeles, California. We have taken no venture capital, no
            strategic investment from any AI provider, and no sponsorship that influences
            our coverage.
          </p>
          <p>
            TensorFeed runs no third-party display advertising at this time. If we ever
            accept a paid placement, sponsored post, or affiliate link, it will be clearly
            labeled as such inside the article. Coverage decisions are made solely by the
            editorial team and have never been influenced by ad placement.
          </p>
        </section>

        {/* Sourcing and fact-checking */}
        <section>
          <div className="flex items-center gap-2 mb-3">
            <ListChecks className="w-5 h-5 text-accent-secondary" />
            <h2 className="text-xl font-semibold text-text-primary">
              Sourcing and Fact-Checking
            </h2>
          </div>
          <p className="mb-3">
            Every original editorial article on TensorFeed is checked against primary
            sources before publication. Our sourcing hierarchy, in order of preference:
          </p>
          <ol className="list-decimal list-inside space-y-2 pl-2 mb-3">
            <li>
              Official provider documentation, API references, release notes, model cards,
              and changelogs (for example Anthropic, OpenAI, Google DeepMind, Meta AI,
              Mistral, Cohere, HuggingFace).
            </li>
            <li>
              First-party blog posts or press releases from the company making the news.
            </li>
            <li>
              Peer-reviewed papers and pre-prints on arXiv, with an explicit note when a
              paper has not yet been peer reviewed.
            </li>
            <li>
              Public benchmark leaderboards, published methodology, and reproducible
              evaluation suites.
            </li>
            <li>
              Reporting from established technology news outlets, cross-checked against at
              least one additional source before we repeat a claim.
            </li>
            <li>
              Direct observation, such as status page probes run by our own Cloudflare
              Worker and logged incident history.
            </li>
          </ol>
          <p>
            Rumors, leaks, and anonymously sourced claims are labeled as such inside the
            article, and we will not publish a leak-based story unless we can corroborate
            it against at least one of the primary sources above or independently verify
            the artifact (for example by inspecting a leaked binary or public commit).
          </p>
        </section>

        {/* Attribution */}
        <section>
          <div className="flex items-center gap-2 mb-3">
            <Link2 className="w-5 h-5 text-accent-secondary" />
            <h2 className="text-xl font-semibold text-text-primary">
              Source Attribution and Aggregation
            </h2>
          </div>
          <p className="mb-3">
            Aggregated news on TensorFeed is pulled from public RSS and JSON feeds
            published by the source outlet. Every aggregated article card shows the source
            name, a timestamp, and a link that takes you directly to the original
            publisher. We do not rehost full articles, reproduce full paragraphs of
            third-party reporting, or strip author bylines. Snippets are clipped to about
            150 to 200 characters.
          </p>
          <p className="mb-3">
            Where we quote or paraphrase another outlet in an original article, we name
            the outlet in-line and link to the source. Where a claim originates with a
            research paper, we link to the paper or its arXiv entry. Where we cite data
            (pricing, context length, benchmark scores), we link to the canonical page we
            pulled the number from.
          </p>
          <p>
            If you publish an RSS feed that we aggregate and want to request attribution
            changes, feed removal, or a different snippet length, email{' '}
            <a
              href="mailto:feedback@tensorfeed.ai"
              className="text-accent-primary hover:underline"
            >
              feedback@tensorfeed.ai
            </a>
            . We honor removal requests promptly.
          </p>
        </section>

        {/* Opinion */}
        <section>
          <div className="flex items-center gap-2 mb-3">
            <Pencil className="w-5 h-5 text-accent-secondary" />
            <h2 className="text-xl font-semibold text-text-primary">
              Reporting vs Opinion
            </h2>
          </div>
          <p className="mb-3">
            TensorFeed originals combine reporting with analysis. When we are stating a
            verifiable fact, we cite it. When we are offering an opinion, prediction, or
            editorial take, we write in the first person and make the nature of the claim
            clear. Headlines, summaries, and the first paragraph of each original article
            are written so that a reader can quickly tell the difference between news
            reporting, analysis, and opinion.
          </p>
          <p>
            We try to present evidence fairly even when we disagree with a position, and
            we link to the strongest steelman of the opposing view we can find.
          </p>
        </section>

        {/* Corrections */}
        <section>
          <div className="flex items-center gap-2 mb-3">
            <AlertTriangle className="w-5 h-5 text-accent-secondary" />
            <h2 className="text-xl font-semibold text-text-primary">Corrections Policy</h2>
          </div>
          <p className="mb-3">
            We aim to fix mistakes quickly and visibly. When we learn that a published
            article contains a factual error, a misattribution, or outdated information
            that materially changes the meaning of the piece, we do the following:
          </p>
          <ul className="list-disc list-inside space-y-2 pl-2 mb-3">
            <li>
              Update the article body with the correct information as soon as possible,
              typically within 24 hours of confirming the error.
            </li>
            <li>
              Append a dated correction or update note at the bottom of the article
              describing what changed and why. Corrections are never silent.
            </li>
            <li>
              Update the <code className="text-accent-cyan bg-bg-tertiary px-1.5 py-0.5 rounded text-sm">dateModified</code>{' '}
              field in the article&apos;s structured data so search engines and AI agents
              can see the revision.
            </li>
            <li>
              For significant corrections (for example, a retraction or a changed
              conclusion), we note the correction in our{' '}
              <Link href="/changelog" className="text-accent-primary hover:underline">
                public changelog
              </Link>
              .
            </li>
          </ul>
          <p>
            Typos, formatting fixes, and minor copy edits that do not change meaning are
            made silently. To request a correction or report an error, email{' '}
            <a
              href="mailto:feedback@tensorfeed.ai"
              className="text-accent-primary hover:underline"
            >
              feedback@tensorfeed.ai
            </a>
            . Include the article URL and a clear description of the issue. We read every
            message.
          </p>
        </section>

        {/* Conflicts */}
        <section>
          <div className="flex items-center gap-2 mb-3">
            <UserCheck className="w-5 h-5 text-accent-secondary" />
            <h2 className="text-xl font-semibold text-text-primary">
              Conflicts of Interest
            </h2>
          </div>
          <p className="mb-3">
            Our writers use AI products daily. Where an individual writer has a material
            financial relationship with a company mentioned in a piece (equity position,
            paid consulting engagement, employment, or similar), that relationship is
            disclosed inside the article. General usage of a product (for example, paying
            for a Claude or ChatGPT subscription) is not considered a conflict of interest.
          </p>
          <p>
            TensorFeed does not hold equity in any AI company we cover. If this ever
            changes, we will disclose it here and inside every affected article.
          </p>
        </section>

        {/* AI use */}
        <section>
          <div className="flex items-center gap-2 mb-3">
            <Bot className="w-5 h-5 text-accent-secondary" />
            <h2 className="text-xl font-semibold text-text-primary">
              Use of AI in Our Editorial Process
            </h2>
          </div>
          <p className="mb-3">
            We use AI tools (including Claude, GPT-4, and other assistants) for research
            triage, outlining, code examples, and copy editing. Every original article is
            authored, fact-checked, edited, and signed by a named human writer on the
            TensorFeed team. We do not publish end-to-end AI-generated articles under our
            byline, and we do not pass off AI-generated quotes as statements from real
            people.
          </p>
          <p>
            Where an article includes AI-generated output as an example (for example, a
            response we prompted a model to produce), we label it clearly as model output
            and name the model and date.
          </p>
        </section>

        {/* Data integrity */}
        <section>
          <div className="flex items-center gap-2 mb-3">
            <ListChecks className="w-5 h-5 text-accent-secondary" />
            <h2 className="text-xl font-semibold text-text-primary">
              Data and Numbers
            </h2>
          </div>
          <p className="mb-3">
            Pricing tables, context-window sizes, benchmark scores, and status data come
            from provider APIs, official documentation, and public benchmark datasets.
            Pricing and model data refresh daily. Status monitoring runs every 2 to 5
            minutes. News feeds refresh every 10 minutes. When a data point is stale or
            contested, we say so next to the number.
          </p>
          <p>
            Benchmark scores are reported with the source (for example, MMLU, GPQA,
            SWE-bench, HumanEval) and with a link to the reporting entity&apos;s
            methodology. We do not average across incompatible benchmarks to produce a
            single score.
          </p>
        </section>

        {/* Contact */}
        <section>
          <div className="flex items-center gap-2 mb-3">
            <Mail className="w-5 h-5 text-accent-primary" />
            <h2 className="text-xl font-semibold text-text-primary">
              Contact the Editors
            </h2>
          </div>
          <div className="bg-bg-secondary border border-border rounded-lg p-5 space-y-2">
            <p>
              Corrections, tips, and editorial feedback:{' '}
              <a
                href="mailto:feedback@tensorfeed.ai"
                className="text-accent-primary hover:underline"
              >
                feedback@tensorfeed.ai
              </a>
            </p>
            <p>
              Press inquiries:{' '}
              <a
                href="mailto:press@tensorfeed.ai"
                className="text-accent-primary hover:underline"
              >
                press@tensorfeed.ai
              </a>
            </p>
            <p>
              General support:{' '}
              <a
                href="mailto:support@tensorfeed.ai"
                className="text-accent-primary hover:underline"
              >
                support@tensorfeed.ai
              </a>
            </p>
          </div>
        </section>

        {/* Related */}
        <section className="pt-2">
          <p className="text-sm text-text-muted">
            Related:{' '}
            <Link href="/about" className="text-accent-primary hover:underline">
              About TensorFeed
            </Link>
            {', '}
            <Link href="/authors" className="text-accent-primary hover:underline">
              Our Authors
            </Link>
            {', '}
            <Link href="/privacy" className="text-accent-primary hover:underline">
              Privacy Policy
            </Link>
            {', '}
            <Link href="/terms" className="text-accent-primary hover:underline">
              Terms of Service
            </Link>
            .
          </p>
        </section>
      </div>
    </div>
  );
}
