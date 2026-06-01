import { Metadata } from 'next';
import { AlertTriangle, Database, FileText, ExternalLink } from 'lucide-react';
import { DatasetJsonLd, FAQPageJsonLd } from '@/components/seo/JsonLd';

export const metadata: Metadata = {
  title: 'AI Research Firehose: raw, unverified arXiv AI/ML feed | TensorFeed',
  description:
    'A raw, fast feed of the most recent arXiv AI/ML submissions (cs.AI, cs.LG, cs.CL, cs.CV). Bibliographic fields are copied verbatim from arXiv: id, title, abstract, authors, categories, dates, links, doi. Free, no premium tier.',
  alternates: { canonical: 'https://tensorfeed.ai/research/firehose' },
  openGraph: {
    type: 'website',
    url: 'https://tensorfeed.ai/research/firehose',
    title: 'AI Research Firehose: raw arXiv AI/ML feed',
    description:
      'The 50 most recent arXiv AI/ML submissions, raw and fast. Verbatim bibliographic fields from arXiv. Free, no premium tier.',
    siteName: 'TensorFeed.ai',
    images: [{ url: '/tensorfeed-logo.png', width: 1024, height: 1024 }],
  },
  twitter: {
    card: 'summary',
    title: 'AI Research Firehose (raw arXiv AI/ML)',
    description:
      'The 50 most recent arXiv AI/ML submissions, raw and fast. Verbatim bibliographic fields. Free feed.',
  },
};

const CAVEAT =
  'A raw, unranked, unfiltered stream of the most recent arXiv AI/ML submissions. Every field is copied verbatim from the arXiv API. There is no editorial review, no dedup against a curated index, and no quality gate, by design.';

const TRUSTED = [
  'arxivId',
  'version',
  'title',
  'abstract',
  'authors',
  'primaryCategory',
  'categories',
  'publishedAt',
  'updatedAt',
  'htmlUrl',
  'pdfUrl',
  'doi',
];

const FAQS = [
  {
    question: 'Is this a TensorFeed quality feed?',
    answer:
      'No. It is a raw firehose. Every field (arXiv id, version, title, abstract, authors, primary category, all categories, published and updated dates, HTML and PDF links, doi) is copied verbatim from the arXiv API and is sound. There is no interpretive layer: no subfield, methodology, or milestone tagging. It is the unranked stream of what just landed.',
  },
  {
    question: 'Is it ranked, deduped, or editorially reviewed?',
    answer:
      'No, by design. The feed is sorted by submission date only. It is not ranked by importance, not deduped against a curated index, and not editorially reviewed. For a citation-ranked view of the field, use /api/papers/ai-trending; for an editor-curated daily set, use /api/papers/hf-daily.',
  },
  {
    question: 'Can I filter the feed server side?',
    answer:
      'No. The endpoint returns the latest snapshot whole, with no query parameters. Read it and filter client side. It refreshes once per day from the arXiv API.',
  },
  {
    question: 'Is there a paid tier?',
    answer:
      'No. This data is free only. There is no premium tier on the research firehose, ever.',
  },
];

const FEED_URL = 'https://tensorfeed.ai/api/papers/arxiv-recent';

export default function ResearchFirehosePage() {
  return (
    <main className="max-w-4xl mx-auto px-4 py-10">
      <DatasetJsonLd
        name="AI Research Firehose (raw, unverified arXiv AI/ML)"
        description={CAVEAT}
        url="https://tensorfeed.ai/research/firehose"
      />
      <FAQPageJsonLd faqs={FAQS} />

      <header className="mb-8">
        <h1 className="text-3xl font-bold text-text-primary mb-2">AI Research Firehose</h1>
        <p className="text-text-secondary text-base">
          Recent arXiv AI/ML, raw, fast, unverified. One static file. No login, no paywall.
        </p>
      </header>

      <section aria-label="Caveat" className="mb-10">
        <div className="bg-accent-amber/10 border border-accent-amber/40 rounded-xl p-5 flex items-start gap-3">
          <AlertTriangle className="w-5 h-5 text-accent-amber mt-0.5 flex-shrink-0" aria-hidden="true" />
          <p className="text-text-primary text-sm leading-relaxed">
            <strong>Read this first.</strong> {CAVEAT} If your agent needs a citation-ranked
            view of the field, use <code className="font-mono text-xs">/api/papers/ai-trending</code>;
            for an editor-curated daily set, use <code className="font-mono text-xs">/api/papers/hf-daily</code>.
          </p>
        </div>
      </section>

      <section className="mb-10">
        <h2 className="text-2xl font-bold text-text-primary mb-4">What this is</h2>
        <p className="text-text-secondary text-sm leading-relaxed">
          A flat dump of recent arXiv AI/ML papers (cs.AI, cs.LG, cs.CL, cs.CV, cs.RO,
          cs.NE, cs.IR, stat.ML). Each record carries the paper&apos;s bibliographic facts
          copied verbatim from the arXiv API. There is no quality gate
          on this feed by design. It is not ranked, not deduped against a curated index, and
          not editorially reviewed.
        </p>
      </section>

      <section className="mb-10">
        <h2 className="text-2xl font-bold text-text-primary mb-4">Fields in each record</h2>
        <div className="bg-bg-secondary border border-border rounded-xl p-5">
          <h3 className="text-text-primary font-semibold mb-2 flex items-center gap-2">
            <FileText className="w-4 h-4 text-accent-green" aria-hidden="true" /> Verbatim from arXiv
          </h3>
          <ul className="text-text-secondary text-sm font-mono grid grid-cols-2 sm:grid-cols-3 gap-x-4 gap-y-1">
            {TRUSTED.map(f => (
              <li key={f}>{f}</li>
            ))}
          </ul>
        </div>
        <p className="text-text-muted text-xs mt-3">
          Author affiliations are almost entirely &quot;unknown&quot; (an arXiv API limitation); treat them as absent.
        </p>
      </section>

      <section className="mb-10">
        <h2 className="text-2xl font-bold text-text-primary mb-4">The feed</h2>
        <div className="bg-bg-secondary border border-border rounded-xl p-5">
          <div className="flex items-baseline justify-between mb-2 flex-wrap gap-2">
            <code className="text-accent-primary font-mono text-sm">GET /api/papers/arxiv-recent</code>
            <span className="text-xs px-2 py-0.5 rounded bg-accent-green/10 text-accent-green border border-accent-green/30">
              free
            </span>
          </div>
          <p className="text-text-secondary text-sm mb-3">
            One JSON snapshot, refreshed daily at 11:30 UTC from the arXiv API. The response
            is <code className="font-mono text-xs">&#123; ok, snapshot &#125;</code>, and
            <code className="font-mono text-xs"> snapshot.papers</code> is the array of records.
            There are no query parameters; it is not filterable server side, on purpose.
          </p>
          <pre className="bg-bg-tertiary/50 border border-border rounded p-2 text-xs font-mono text-text-muted overflow-x-auto">
{`curl '${FEED_URL}'`}
          </pre>
          <div className="mt-4 flex flex-wrap gap-4 text-sm">
            <a
              href="/api/papers/arxiv-recent"
              className="text-accent-primary hover:underline inline-flex items-center gap-1"
            >
              <Database className="w-4 h-4" aria-hidden="true" /> Open the feed
            </a>
            <a
              href="https://arxiv.org/list/cs.AI/recent"
              className="text-accent-primary hover:underline inline-flex items-center gap-1"
              rel="noopener noreferrer"
              target="_blank"
            >
              <ExternalLink className="w-4 h-4" aria-hidden="true" /> Source: arXiv
            </a>
          </div>
        </div>
      </section>

      <section className="mb-4">
        <h2 className="text-2xl font-bold text-text-primary mb-4">FAQ</h2>
        <div className="space-y-3">
          {FAQS.map(faq => (
            <details key={faq.question} className="bg-bg-secondary border border-border rounded-xl p-5">
              <summary className="text-text-primary font-semibold cursor-pointer">
                {faq.question}
              </summary>
              <p className="text-text-secondary text-sm mt-2 leading-relaxed">{faq.answer}</p>
            </details>
          ))}
        </div>
      </section>
    </main>
  );
}
