import { Metadata } from 'next';
import { notFound } from 'next/navigation';
import Link from 'next/link';
import { ArrowLeft, ExternalLink, Trophy } from 'lucide-react';
import {
  BENCHMARK_DIRECTORY,
  getBenchmarkBySlug,
  getAllBenchmarkSlugs,
  getModelSlugByBenchmarkName,
} from '@/lib/benchmark-directory';
import benchmarkData from '@/../data/benchmarks.json';

export function generateStaticParams() {
  return getAllBenchmarkSlugs().map(name => ({ name }));
}

export function generateMetadata({ params }: { params: { name: string } }): Metadata {
  const meta = getBenchmarkBySlug(params.name);
  if (!meta) return {};
  return {
    title: meta.seoTitle,
    description: meta.seoDescription,
    alternates: { canonical: `https://tensorfeed.ai/benchmarks/${meta.slug}` },
    openGraph: {
      type: 'website',
      url: `https://tensorfeed.ai/benchmarks/${meta.slug}`,
      title: meta.seoTitle,
      description: meta.seoDescription,
      siteName: 'TensorFeed.ai',
      images: [{ url: '/tensorfeed-logo.png', width: 1024, height: 1024 }],
    },
    twitter: { card: 'summary_large_image', title: meta.seoTitle, description: meta.seoDescription },
  };
}

interface BenchmarksFile {
  lastUpdated: string;
  benchmarks: { id: string; name: string; description: string; maxScore: number }[];
  models: { model: string; provider: string; released?: string; scores: Record<string, number> }[];
}

export default function BenchmarkLeaderboardPage({ params }: { params: { name: string } }) {
  const meta = getBenchmarkBySlug(params.name);
  if (!meta) notFound();

  const data = benchmarkData as BenchmarksFile;
  const benchDef = data.benchmarks.find(b => b.id === meta.slug);

  // Build the leaderboard: filter to models that have a numeric score for this benchmark
  const ranked = data.models
    .filter(m => typeof m.scores[meta.slug] === 'number' && Number.isFinite(m.scores[meta.slug]))
    .map(m => ({
      model: m.model,
      provider: m.provider,
      released: m.released,
      score: m.scores[meta.slug],
      modelSlug: getModelSlugByBenchmarkName(m.model),
    }))
    .sort((a, b) => b.score - a.score);

  const top = ranked[0];

  const FAQ_JSONLD = {
    '@context': 'https://schema.org',
    '@type': 'FAQPage',
    mainEntity: [
      {
        '@type': 'Question',
        name: `What is ${meta.displayName}?`,
        acceptedAnswer: { '@type': 'Answer', text: meta.description },
      },
      {
        '@type': 'Question',
        name: `Which AI model leads the ${meta.displayName} leaderboard?`,
        acceptedAnswer: {
          '@type': 'Answer',
          text: top
            ? `As of ${data.lastUpdated}, ${top.model} from ${top.provider} leads the ${meta.displayName} leaderboard with a score of ${top.score}%. The full ranked list of ${ranked.length} models is on this page, updated as we ingest new scores.`
            : `No published scores for ${meta.displayName} are available yet.`,
        },
      },
      {
        '@type': 'Question',
        name: `How is ${meta.displayName} scored?`,
        acceptedAnswer: { '@type': 'Answer', text: meta.scoringNotes },
      },
      {
        '@type': 'Question',
        name: `Why does ${meta.displayName} matter for AI agents?`,
        acceptedAnswer: { '@type': 'Answer', text: meta.whyItMatters },
      },
      ...meta.ranges.map(r => ({
        '@type': 'Question',
        name: `What does a ${meta.displayName} score of ${r.range} mean?`,
        acceptedAnswer: { '@type': 'Answer', text: r.meaning },
      })),
    ],
  };

  const DATASET_JSONLD = {
    '@context': 'https://schema.org',
    '@type': 'Dataset',
    name: `${meta.displayName} Leaderboard`,
    description: meta.seoDescription,
    url: `https://tensorfeed.ai/benchmarks/${meta.slug}`,
    isAccessibleForFree: true,
    license: 'https://tensorfeed.ai/terms',
    creator: { '@type': 'Organization', name: 'TensorFeed.ai', url: 'https://tensorfeed.ai' },
    keywords: [meta.displayName, 'AI benchmark leaderboard', 'AI model comparison', 'TensorFeed'],
    datePublished: data.lastUpdated,
  };

  return (
    <article className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(FAQ_JSONLD) }}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(DATASET_JSONLD) }}
      />

      <Link
        href="/benchmarks"
        className="inline-flex items-center gap-1.5 text-sm text-text-muted hover:text-accent-primary transition-colors mb-8"
      >
        <ArrowLeft className="w-4 h-4" />
        All benchmarks
      </Link>

      <header className="mb-8">
        <div className="flex items-center gap-3 mb-3">
          <div className="p-2 rounded-lg bg-accent-primary/10">
            <Trophy className="w-6 h-6 text-accent-primary" />
          </div>
          <h1 className="text-3xl sm:text-4xl font-bold text-text-primary">
            {meta.displayName} leaderboard
          </h1>
        </div>
        <p className="text-text-secondary text-lg max-w-3xl">{meta.description}</p>
      </header>

      {top && (
        <div className="bg-bg-secondary border border-border rounded-xl p-6 mb-8">
          <div className="flex items-center gap-2 text-text-muted text-xs uppercase tracking-wide mb-2">
            <Trophy className="w-4 h-4 text-amber-400" />
            Current leader
          </div>
          <div className="flex items-baseline gap-3 flex-wrap">
            <span className="text-2xl font-bold text-text-primary">
              {top.modelSlug ? (
                <Link href={`/models/${top.modelSlug}`} className="text-accent-primary hover:underline">
                  {top.model}
                </Link>
              ) : (
                top.model
              )}
            </span>
            <span className="text-text-muted text-sm">({top.provider})</span>
            <span className="font-mono text-2xl text-accent-primary">{top.score}%</span>
          </div>
          <p className="text-text-muted text-sm mt-2">
            Last refreshed {data.lastUpdated}. {ranked.length} models scored on this benchmark.
          </p>
        </div>
      )}

      <section className="mb-10">
        <h2 className="text-xl font-semibold text-text-primary mb-3">Full leaderboard</h2>
        {ranked.length === 0 ? (
          <p className="text-text-muted">No published scores yet for {meta.displayName}.</p>
        ) : (
          <div className="bg-bg-secondary border border-border rounded-xl overflow-hidden">
            <table className="w-full text-sm">
              <thead className="bg-bg-tertiary text-text-muted text-xs uppercase tracking-wide">
                <tr>
                  <th className="text-left px-4 py-2.5 w-12">#</th>
                  <th className="text-left px-4 py-2.5">Model</th>
                  <th className="text-left px-4 py-2.5">Provider</th>
                  <th className="text-right px-4 py-2.5">Score</th>
                  <th className="text-right px-4 py-2.5">Released</th>
                </tr>
              </thead>
              <tbody>
                {ranked.map((row, i) => (
                  <tr key={`${row.provider}-${row.model}`} className="border-t border-border">
                    <td className="px-4 py-2.5 text-text-muted font-mono">{i + 1}</td>
                    <td className="px-4 py-2.5 text-text-primary">
                      {row.modelSlug ? (
                        <Link href={`/models/${row.modelSlug}`} className="text-accent-primary hover:underline">
                          {row.model}
                        </Link>
                      ) : (
                        row.model
                      )}
                    </td>
                    <td className="px-4 py-2.5 text-text-secondary">{row.provider}</td>
                    <td className="px-4 py-2.5 text-right font-mono text-accent-primary">
                      {row.score}%
                    </td>
                    <td className="px-4 py-2.5 text-right text-text-muted text-xs">
                      {row.released ?? '—'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

      <section className="mb-10">
        <h2 className="text-xl font-semibold text-text-primary mb-3">Score interpretation</h2>
        <div className="bg-bg-secondary border border-border rounded-xl p-5">
          <p className="text-text-secondary mb-4">{meta.scoringNotes}</p>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {meta.ranges.map(r => (
              <div key={r.range} className="border-l-2 border-accent-primary/40 pl-3">
                <div className="font-mono text-text-primary font-semibold text-sm">{r.range}</div>
                <div className="text-text-muted text-sm">{r.meaning}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="mb-10">
        <h2 className="text-xl font-semibold text-text-primary mb-3">Why this matters for AI agents</h2>
        <p className="text-text-secondary">{meta.whyItMatters}</p>
      </section>

      <section className="mb-10">
        <h2 className="text-xl font-semibold text-text-primary mb-3">Other benchmarks</h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {BENCHMARK_DIRECTORY.filter(b => b.slug !== meta.slug).map(b => (
            <Link
              key={b.slug}
              href={`/benchmarks/${b.slug}`}
              className="block bg-bg-secondary border border-border rounded-xl p-4 hover:border-accent-primary transition"
            >
              <div className="text-text-primary font-semibold mb-1">{b.displayName}</div>
              <div className="text-text-muted text-xs line-clamp-2">{b.seoDescription}</div>
            </Link>
          ))}
        </div>
      </section>

      <section className="mb-10">
        <h2 className="text-xl font-semibold text-text-primary mb-3">Premium API: time-series for {meta.displayName}</h2>
        <p className="text-text-secondary mb-3">
          The leaderboard above is a snapshot. Want to see how a model&apos;s {meta.displayName}{' '}
          score has moved over the last 30-90 days, or set a webhook that fires when a score
          crosses a threshold? The premium API has both:
        </p>
        <ul className="space-y-2 text-text-secondary list-disc list-inside ml-4">
          <li>
            <Link href="/developers/agent-payments" className="text-accent-primary hover:underline">
              <code className="font-mono text-sm">/api/premium/history/benchmarks/series?model=&benchmark={meta.slug}</code>
            </Link>{' '}
            — daily score evolution for one model on this benchmark, 1 credit per call
          </li>
        </ul>
      </section>

      <div className="mt-10 pt-6 border-t border-border text-text-muted text-sm flex flex-wrap items-center gap-3">
        <a
          href={meta.sourceUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center gap-1 text-accent-primary hover:underline"
        >
          {meta.displayName} source <ExternalLink className="w-3 h-3" />
        </a>
        <span>·</span>
        <span>Last refreshed {data.lastUpdated}</span>
        {benchDef && (
          <>
            <span>·</span>
            <span>Max score {benchDef.maxScore}</span>
          </>
        )}
      </div>
    </article>
  );
}
