import { Metadata } from 'next';
import { notFound } from 'next/navigation';
import Link from 'next/link';
import { ArrowLeft, ExternalLink, Trophy, Wrench } from 'lucide-react';
import {
  HARNESS_DIRECTORY,
  getAllHarnessSlugs,
  getHarnessBySlug,
} from '@/lib/harness-directory';
import harnessData from '@/../data/harnesses.json';

export function generateStaticParams() {
  return getAllHarnessSlugs().map(slug => ({ slug }));
}

export function generateMetadata({ params }: { params: { slug: string } }): Metadata {
  const meta = getHarnessBySlug(params.slug);
  if (!meta) return {};
  return {
    title: meta.seoTitle,
    description: meta.seoDescription,
    alternates: { canonical: `https://tensorfeed.ai/harnesses/${meta.slug}` },
    openGraph: {
      type: 'website',
      url: `https://tensorfeed.ai/harnesses/${meta.slug}`,
      title: meta.seoTitle,
      description: meta.seoDescription,
      siteName: 'TensorFeed.ai',
      images: [{ url: '/tensorfeed-logo.png', width: 1024, height: 1024 }],
    },
    twitter: { card: 'summary_large_image', title: meta.seoTitle, description: meta.seoDescription },
  };
}

interface HarnessesFile {
  lastUpdated: string;
  benchmarks: { id: string; name: string; description: string; maxScore: number; unit: string; sourceUrl: string }[];
  harnesses: { id: string; name: string; vendor: string; type: string; openSource: boolean; url: string; modelLockIn: string; summary: string }[];
  results: { harness: string; model: string; scores: Record<string, number | null> }[];
}

export default function HarnessDetailPage({ params }: { params: { slug: string } }) {
  const meta = getHarnessBySlug(params.slug);
  if (!meta) notFound();

  const data = harnessData as HarnessesFile;
  const harnessDef = data.harnesses.find(h => h.id === meta.slug);
  const myResults = data.results.filter(r => r.harness === meta.slug);

  // Per-benchmark rankings to find where this harness places overall
  const placements = data.benchmarks.map(b => {
    const ranked = data.results
      .filter(r => typeof r.scores[b.id] === 'number' && Number.isFinite(r.scores[b.id]!))
      .map(r => ({ harness: r.harness, model: r.model, score: r.scores[b.id]! }))
      .sort((a, b2) => b2.score - a.score);

    const myBest = myResults
      .filter(r => typeof r.scores[b.id] === 'number' && Number.isFinite(r.scores[b.id]!))
      .map(r => ({ model: r.model, score: r.scores[b.id]! }))
      .sort((a, b2) => b2.score - a.score)[0];

    if (!myBest) return { benchmark: b, rank: null, score: null, model: null, total: ranked.length };

    const rank = ranked.findIndex(r => r.harness === meta.slug && r.model === myBest.model) + 1;
    return { benchmark: b, rank, score: myBest.score, model: myBest.model, total: ranked.length };
  });

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
        name: `Which models does ${meta.displayName} support?`,
        acceptedAnswer: { '@type': 'Answer', text: meta.modelStory },
      },
      {
        '@type': 'Question',
        name: `How much does ${meta.displayName} cost?`,
        acceptedAnswer: { '@type': 'Answer', text: meta.pricing },
      },
      {
        '@type': 'Question',
        name: `Who is ${meta.displayName} for?`,
        acceptedAnswer: { '@type': 'Answer', text: meta.whoItsFor },
      },
    ],
  };

  const ARTICLE_JSONLD = {
    '@context': 'https://schema.org',
    '@type': 'TechArticle',
    headline: meta.seoTitle,
    description: meta.seoDescription,
    url: `https://tensorfeed.ai/harnesses/${meta.slug}`,
    dateModified: data.lastUpdated,
    author: { '@type': 'Organization', name: 'TensorFeed.ai', url: 'https://tensorfeed.ai' },
    publisher: { '@type': 'Organization', name: 'TensorFeed.ai', url: 'https://tensorfeed.ai' },
  };

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(FAQ_JSONLD) }} />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(ARTICLE_JSONLD) }} />

      <Link href="/harnesses" className="inline-flex items-center gap-1 text-sm text-text-muted hover:text-accent-primary mb-6">
        <ArrowLeft className="w-4 h-4" /> All harnesses
      </Link>

      {/* Header */}
      <div className="mb-6">
        <div className="flex items-center gap-3 mb-2">
          <div className="p-2 rounded-lg bg-accent-primary/10">
            <Wrench className="w-6 h-6 text-accent-primary" />
          </div>
          <div>
            <h1 className="text-3xl sm:text-4xl font-bold text-text-primary">{meta.displayName}</h1>
            <div className="text-sm text-text-muted">{meta.vendor}</div>
          </div>
        </div>
        <p className="text-text-secondary text-lg leading-relaxed mt-4">{meta.description}</p>
      </div>

      {/* Quick facts grid */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-8">
        <div className="bg-bg-secondary border border-border rounded-lg p-3">
          <div className="text-xs text-text-muted uppercase tracking-wide">Type</div>
          <div className="text-sm text-text-primary font-medium mt-1">{harnessDef?.type || 'cli'}</div>
        </div>
        <div className="bg-bg-secondary border border-border rounded-lg p-3">
          <div className="text-xs text-text-muted uppercase tracking-wide">License</div>
          <div className="text-sm text-text-primary font-medium mt-1">{harnessDef?.openSource ? 'Open source' : 'Proprietary'}</div>
        </div>
        <div className="bg-bg-secondary border border-border rounded-lg p-3">
          <div className="text-xs text-text-muted uppercase tracking-wide">Model story</div>
          <div className="text-sm text-text-primary font-medium mt-1">{harnessDef?.modelLockIn}</div>
        </div>
        <div className="bg-bg-secondary border border-border rounded-lg p-3">
          <div className="text-xs text-text-muted uppercase tracking-wide">Vendor</div>
          <div className="text-sm text-text-primary font-medium mt-1">{meta.vendor}</div>
        </div>
      </div>

      {/* Benchmark placements */}
      <h2 className="text-xl font-semibold text-text-primary mb-3 flex items-center gap-2">
        <Trophy className="w-5 h-5 text-accent-primary" /> Leaderboard Placements
      </h2>
      <div className="overflow-x-auto mb-8">
        <table className="w-full text-left text-sm">
          <thead>
            <tr className="border-b border-border text-xs uppercase tracking-wide text-text-muted">
              <th className="py-3 px-3">Benchmark</th>
              <th className="py-3 px-3">Best base model</th>
              <th className="py-3 px-3 text-right">Score</th>
              <th className="py-3 px-3 text-right">Rank</th>
            </tr>
          </thead>
          <tbody>
            {placements.map(p => (
              <tr key={p.benchmark.id} className="border-b border-border/50 hover:bg-bg-tertiary/50 transition-colors">
                <td className="py-3 px-3">
                  <a href={p.benchmark.sourceUrl} target="_blank" rel="noopener noreferrer" className="text-text-primary hover:text-accent-primary inline-flex items-center gap-1">
                    {p.benchmark.name} <ExternalLink className="w-3 h-3 text-text-muted" />
                  </a>
                </td>
                <td className="py-3 px-3 text-text-secondary">{p.model || '—'}</td>
                <td className="py-3 px-3 text-right font-mono">
                  {typeof p.score === 'number' ? <span className="text-text-primary">{p.score.toFixed(1)}</span> : <span className="text-text-muted">—</span>}
                </td>
                <td className="py-3 px-3 text-right font-mono">
                  {p.rank ? (
                    <span className="text-text-primary">#{p.rank} <span className="text-text-muted text-xs">/ {p.total}</span></span>
                  ) : (
                    <span className="text-text-muted">—</span>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Detail sections */}
      <div className="space-y-6 mb-8">
        <section>
          <h2 className="text-xl font-semibold text-text-primary mb-2">Distribution</h2>
          <p className="text-text-secondary leading-relaxed">{meta.distribution}</p>
        </section>
        <section>
          <h2 className="text-xl font-semibold text-text-primary mb-2">Model Story</h2>
          <p className="text-text-secondary leading-relaxed">{meta.modelStory}</p>
        </section>
        <section>
          <h2 className="text-xl font-semibold text-text-primary mb-2">Pricing</h2>
          <p className="text-text-secondary leading-relaxed">{meta.pricing}</p>
        </section>
        <section>
          <h2 className="text-xl font-semibold text-text-primary mb-2">Who It&apos;s For</h2>
          <p className="text-text-secondary leading-relaxed">{meta.whoItsFor}</p>
        </section>
        <section>
          <h2 className="text-xl font-semibold text-text-primary mb-2">Notable Features</h2>
          <ul className="list-disc list-inside text-text-secondary space-y-1">
            {meta.notableFeatures.map(f => (
              <li key={f}>{f}</li>
            ))}
          </ul>
        </section>
      </div>

      {/* External link */}
      <div className="bg-bg-secondary border border-border rounded-lg p-4 mb-10 flex items-center justify-between gap-3 flex-wrap">
        <span className="text-sm text-text-secondary">
          Vendor site for {meta.displayName}:
        </span>
        <a
          href={meta.url}
          target="_blank"
          rel="noopener noreferrer"
          className="text-sm text-accent-primary hover:underline inline-flex items-center gap-1"
        >
          {meta.url} <ExternalLink className="w-3 h-3" />
        </a>
      </div>

      {/* Related harnesses */}
      <h2 className="text-xl font-semibold text-text-primary mb-3">Other Harnesses</h2>
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 mb-12">
        {HARNESS_DIRECTORY.filter(h => h.slug !== meta.slug).map(h => (
          <Link
            key={h.slug}
            href={`/harnesses/${h.slug}`}
            className="block bg-bg-secondary border border-border rounded-lg px-3 py-2 text-sm text-text-secondary hover:border-accent-primary hover:text-accent-primary transition-colors text-center"
          >
            {h.displayName}
          </Link>
        ))}
      </div>
    </div>
  );
}
