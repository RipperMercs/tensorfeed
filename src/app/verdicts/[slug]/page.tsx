import { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { ArrowLeft, Gavel, ExternalLink } from 'lucide-react';
import { ArticleJsonLd } from '@/components/seo/JsonLd';
import ShareBar from '@/components/originals/ShareBar';
import { VERDICTS, getVerdict } from '@/lib/verdicts-directory';

const confidenceLabel: Record<string, string> = {
  high: 'High confidence',
  medium: 'Medium confidence',
  low: 'Low confidence',
};

export function generateStaticParams() {
  return VERDICTS.map((v) => ({ slug: v.slug }));
}

export function generateMetadata({ params }: { params: { slug: string } }): Metadata {
  const v = getVerdict(params.slug);
  if (!v) return { title: 'Verdict not found' };
  const url = `https://tensorfeed.ai/verdicts/${v.slug}`;
  return {
    title: v.question,
    description: v.ruling,
    openGraph: {
      type: 'article',
      url,
      title: v.question,
      description: v.ruling,
      siteName: 'TensorFeed.ai',
    },
    twitter: {
      card: 'summary_large_image',
      title: v.question,
      description: v.ruling,
    },
  };
}

function isoDate(human: string): string {
  const t = Date.parse(human);
  return Number.isNaN(t) ? '' : new Date(t).toISOString().slice(0, 10);
}

export default function VerdictPage({ params }: { params: { slug: string } }) {
  const v = getVerdict(params.slug);
  if (!v) notFound();

  const paragraphs = v.body.split(/\n\s*\n/).map((p) => p.trim()).filter(Boolean);

  return (
    <article className="max-w-3xl mx-auto px-4 sm:px-6 py-10">
      <ArticleJsonLd
        title={v.question}
        description={v.ruling}
        datePublished={isoDate(v.date)}
        author="TensorFeed"
      />

      <Link
        href="/verdicts"
        className="inline-flex items-center gap-1.5 text-sm text-text-muted hover:text-accent-primary transition-colors mb-8"
      >
        <ArrowLeft className="w-4 h-4" />
        All TF Verdicts
      </Link>

      <header className="mb-8">
        <div className="flex items-center gap-2 mb-3 flex-wrap text-xs font-mono uppercase tracking-wider text-text-muted">
          <Gavel className="w-4 h-4 text-accent-primary" />
          <span className="text-accent-primary">TF Verdict</span>
          <span>&middot;</span>
          <span>{v.category}</span>
          <span>&middot;</span>
          <time dateTime={isoDate(v.date)}>{v.date}</time>
          <span>&middot;</span>
          <span>{confidenceLabel[v.confidence] ?? v.confidence}</span>
        </div>
        <h1 className="text-3xl sm:text-4xl font-bold text-text-primary leading-tight">{v.question}</h1>
      </header>

      <ShareBar path={`/verdicts/${v.slug}`} title={v.question} />

      {/* The ruling */}
      <div className="my-8 border-l-4 border-accent-primary bg-bg-secondary rounded-r-lg px-5 py-4">
        <p className="text-xs font-mono uppercase tracking-wider text-text-muted mb-2">The verdict</p>
        <p className="text-lg text-text-primary font-medium leading-relaxed">{v.ruling}</p>
      </div>

      {/* Reasoning */}
      <div className="prose-custom space-y-6 text-text-secondary leading-relaxed">
        {paragraphs.map((p, i) => (
          <p key={i} className={i === 0 ? 'text-lg text-text-primary leading-relaxed' : undefined}>
            {p}
          </p>
        ))}
      </div>

      {/* The evidence */}
      {v.dataPoints.length > 0 && (
        <section className="mt-10">
          <h2 className="text-2xl font-semibold text-text-primary pt-4 mb-1">The evidence</h2>
          <p className="text-sm text-text-muted mb-4">
            The data points behind this verdict. Each is cited so you can check the call against its source.
          </p>
          <div className="grid gap-3">
            {v.dataPoints.map((d, i) => (
              <div key={i} className="bg-bg-secondary border border-border rounded-lg px-4 py-3">
                <p className="text-text-primary text-sm">{d.claim}</p>
                <p className="text-text-secondary text-sm mt-1">
                  <span className="font-mono text-accent-primary">{d.value}</span>
                </p>
                <a
                  href={d.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1 text-xs text-text-muted hover:text-accent-primary transition-colors mt-2"
                >
                  {d.source}
                  <ExternalLink className="w-3 h-3" />
                </a>
              </div>
            ))}
          </div>
        </section>
      )}

      {/* Caveats */}
      {v.caveats && (
        <section className="mt-10">
          <h2 className="text-2xl font-semibold text-text-primary pt-4 mb-3">Caveats</h2>
          <p className="text-text-secondary leading-relaxed">{v.caveats}</p>
        </section>
      )}

      {/* Methodology note */}
      <section className="mt-10 border-t border-border pt-6">
        <p className="text-sm text-text-muted leading-relaxed">
          A TF Verdict is TensorFeed&apos;s own analysis over cited public data, not a republished
          dataset. We take a clear position, show the evidence and the sources, and date-stamp the call
          because the answer can change. Disagree with a data point? Follow the source link and check it
          yourself.
        </p>
      </section>

      <div className="flex flex-wrap items-center gap-4 mt-12 pt-6 border-t border-border text-sm">
        <Link
          href="/verdicts"
          className="inline-flex items-center gap-1.5 text-text-muted hover:text-accent-primary transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
          All TF Verdicts
        </Link>
        <Link href="/" className="text-text-muted hover:text-accent-primary transition-colors">
          Back to Feed
        </Link>
      </div>
    </article>
  );
}
