import { Metadata } from 'next';
import { AlertTriangle, Database, FileText, ExternalLink } from 'lucide-react';
import { DatasetJsonLd, FAQPageJsonLd } from '@/components/seo/JsonLd';

export const metadata: Metadata = {
  title: 'AI Research Firehose: raw, unverified arXiv AI/ML feed | TensorFeed',
  description:
    'A raw, fast, unverified feed of recent arXiv AI/ML papers. Bibliographic fields are copied verbatim; subfield and milestone tags are heuristic and explicitly NOT authoritative. Free, never queryable as truth, no premium tier.',
  alternates: { canonical: 'https://tensorfeed.ai/research/firehose' },
  openGraph: {
    type: 'website',
    url: 'https://tensorfeed.ai/research/firehose',
    title: 'AI Research Firehose: raw, unverified arXiv AI/ML feed',
    description:
      'Recent arXiv AI/ML, raw, fast, unverified. Heuristic tags, not authoritative, not verified TensorFeed data. Free, no premium tier.',
    siteName: 'TensorFeed.ai',
    images: [{ url: '/tensorfeed-logo.png', width: 1024, height: 1024 }],
  },
  twitter: {
    card: 'summary',
    title: 'AI Research Firehose (raw, unverified)',
    description:
      'Recent arXiv AI/ML, raw and unverified. Heuristic tags are not authoritative. Free static feed.',
  },
};

const CAVEAT =
  'Heuristic tags from a fast local model. subfield_tag and is_milestone_candidate are best-effort and NOT authoritative. Not verified TensorFeed data.';

const TRUSTED = [
  'arxiv_id',
  'date',
  'title',
  'authors',
  'arxiv_categories',
  'keywords',
  'summary_one_sentence',
];

const UNTRUSTED = [
  'subfield_tag',
  'methodology_bucket',
  'is_milestone_candidate',
  'milestone_reasoning',
  'milestone_evidence',
  'confidence',
  'affiliations_normalized',
  'affiliation_types',
];

const FAQS = [
  {
    question: 'Is this a TensorFeed quality feed?',
    answer:
      'No. It is a raw firehose. The bibliographic fields (arXiv id, date, title, authors, categories, keywords, one-sentence summary) are copied verbatim from arXiv and are sound. The interpretive fields (subfield, methodology, milestone) are produced by a fast local model that confidently mislabels often enough that they cannot be trusted or queried as truth. They are present only because the records carry them.',
  },
  {
    question: 'Why ship it at all if the tags are unreliable?',
    answer:
      'The verbatim extraction is genuinely useful as a recent arXiv AI/ML stream. Single-source subfield classification hit a proven model ceiling and that quality work is closed, so rather than sell a labeled feed that would have negative value, we ship the raw stream clearly marked as raw. Honest or absent.',
  },
  {
    question: 'Can I filter by subfield or get a milestones feed?',
    answer:
      'No, by design. subfield_tag and the milestone fields are never offered as a query dimension or a curated feed, because that would present heuristic guesses as authoritative. The feed is a single static file. Read it whole and treat the interpretive fields as noise unless you independently verify them.',
  },
  {
    question: 'Is there a paid tier?',
    answer:
      'No. This data is free only. There is no premium tier on the research firehose, ever.',
  },
];

const FEED_URL = 'https://tensorfeed.ai/api/research/firehose.json';

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
            <strong>Read this first.</strong> {CAVEAT} It ships this way on purpose. If your
            agent needs authoritative subfield or milestone data, this is not that feed and
            no such TensorFeed feed exists; treat the interpretive fields here as noise.
          </p>
        </div>
      </section>

      <section className="mb-10">
        <h2 className="text-2xl font-bold text-text-primary mb-4">What this is</h2>
        <p className="text-text-secondary text-sm leading-relaxed">
          A flat dump of recent arXiv AI/ML papers (cs.AI, cs.LG, cs.CL, cs.CV, cs.RO,
          cs.NE, cs.IR, stat.ML). Each record carries the paper&apos;s bibliographic facts
          copied verbatim, plus a few heuristic interpretive tags. There is no quality gate
          on this feed by design. It is not ranked, not deduped against a curated index, and
          not editorially reviewed.
        </p>
      </section>

      <section className="mb-10">
        <h2 className="text-2xl font-bold text-text-primary mb-4">Trust boundary inside each record</h2>
        <div className="grid sm:grid-cols-2 gap-4">
          <div className="bg-bg-secondary border border-border rounded-xl p-5">
            <h3 className="text-text-primary font-semibold mb-2 flex items-center gap-2">
              <FileText className="w-4 h-4 text-accent-green" aria-hidden="true" /> Trusted (verbatim)
            </h3>
            <ul className="text-text-secondary text-sm font-mono space-y-1">
              {TRUSTED.map(f => (
                <li key={f}>{f}</li>
              ))}
            </ul>
          </div>
          <div className="bg-bg-secondary border border-border rounded-xl p-5">
            <h3 className="text-text-primary font-semibold mb-2 flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 text-accent-amber" aria-hidden="true" /> Heuristic (not authoritative)
            </h3>
            <ul className="text-text-secondary text-sm font-mono space-y-1">
              {UNTRUSTED.map(f => (
                <li key={f}>{f}</li>
              ))}
            </ul>
          </div>
        </div>
        <p className="text-text-muted text-xs mt-3">
          affiliations are almost entirely &quot;unknown&quot; (an arXiv API limitation); treat them as absent.
        </p>
      </section>

      <section className="mb-10">
        <h2 className="text-2xl font-bold text-text-primary mb-4">The feed</h2>
        <div className="bg-bg-secondary border border-border rounded-xl p-5">
          <div className="flex items-baseline justify-between mb-2 flex-wrap gap-2">
            <code className="text-accent-primary font-mono text-sm">GET /api/research/firehose.json</code>
            <span className="text-xs px-2 py-0.5 rounded bg-accent-green/10 text-accent-green border border-accent-green/30">
              free
            </span>
          </div>
          <p className="text-text-secondary text-sm mb-3">
            One static JSON file. The <code className="font-mono text-xs">_meta</code> block
            carries this same caveat and the trusted/untrusted field lists, so an agent that
            reads the feed reads the contract with it. There are no query parameters; it is
            not filterable server side, on purpose.
          </p>
          <pre className="bg-bg-tertiary/50 border border-border rounded p-2 text-xs font-mono text-text-muted overflow-x-auto">
{`curl '${FEED_URL}'`}
          </pre>
          <div className="mt-4 flex flex-wrap gap-4 text-sm">
            <a
              href="/api/research/firehose.json"
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
