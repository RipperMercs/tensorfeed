import { Metadata } from 'next';
import { notFound } from 'next/navigation';
import Link from 'next/link';
import { ArrowLeft, ChevronRight, Trophy, Scale, Zap, BookOpen } from 'lucide-react';
import { COMPARISONS, getComparisonBySlug, getAllComparisonSlugs } from '@/lib/comparison-directory';
import { FAQPageJsonLd } from '@/components/seo/JsonLd';
import pricingData from '@/../data/pricing.json';
import benchmarkData from '@/../data/benchmarks.json';

export function generateStaticParams() {
  return getAllComparisonSlugs().map(slug => ({ slug }));
}

export function generateMetadata({ params }: { params: { slug: string } }): Metadata {
  const meta = getComparisonBySlug(params.slug);
  if (!meta) return {};

  return {
    title: meta.seoTitle,
    description: meta.seoDescription,
    openGraph: {
      type: 'article',
      url: `https://tensorfeed.ai/compare/${meta.slug}`,
      title: meta.seoTitle,
      description: meta.seoDescription,
      siteName: 'TensorFeed.ai',
      images: [{ url: '/tensorfeed-logo.png', width: 1024, height: 1024 }],
    },
    twitter: {
      card: 'summary',
      title: meta.seoTitle,
      description: meta.seoDescription,
    },
  };
}

function formatContext(ctx: number): string {
  if (ctx >= 1000000) return `${(ctx / 1000000).toFixed(ctx % 1000000 === 0 ? 0 : 1)}M`;
  return `${(ctx / 1000).toFixed(0)}K`;
}

function formatPrice(price: number): string {
  return price === 0 ? 'Free' : `$${price.toFixed(2)}`;
}

function winnerBadge(winner: 'A' | 'B' | 'tie') {
  if (winner === 'tie') {
    return <span className="text-xs font-medium px-2 py-0.5 rounded-full bg-bg-tertiary text-text-muted border border-border">Tie</span>;
  }
  return null;
}

export default function ComparisonPage({ params }: { params: { slug: string } }) {
  const meta = getComparisonBySlug(params.slug);
  if (!meta) notFound();

  // Look up pricing data for both models
  const providerA = pricingData.providers.find(p => p.models.some((m: { id: string }) => m.id === meta.modelA));
  const modelDataA = providerA?.models.find((m: { id: string }) => m.id === meta.modelA);
  const providerB = pricingData.providers.find(p => p.models.some((m: { id: string }) => m.id === meta.modelB));
  const modelDataB = providerB?.models.find((m: { id: string }) => m.id === meta.modelB);

  // Look up benchmark data
  const benchA = benchmarkData.models.find((b: { model: string }) => b.model === meta.benchmarkNameA);
  const benchB = benchmarkData.models.find((b: { model: string }) => b.model === meta.benchmarkNameB);

  // Other comparisons for the "Related" section
  const related = COMPARISONS.filter(c => c.slug !== meta.slug).slice(0, 4);

  // Generate FAQ data
  const faqs = [
    {
      question: `Which is better, ${meta.nameA} or ${meta.nameB}?`,
      answer: `It depends on your use case. ${meta.nameA} from ${meta.providerA} excels at ${meta.chooseA[0]?.toLowerCase()}, while ${meta.nameB} from ${meta.providerB} is better for ${meta.chooseB[0]?.toLowerCase()}. See the full comparison above for detailed benchmarks and pricing.`,
    },
    {
      question: `How much does ${meta.nameA} cost compared to ${meta.nameB}?`,
      answer: modelDataA && modelDataB
        ? `${meta.nameA} costs ${formatPrice(modelDataA.inputPrice)} input and ${formatPrice(modelDataA.outputPrice)} output per 1M tokens. ${meta.nameB} costs ${formatPrice(modelDataB.inputPrice)} input and ${formatPrice(modelDataB.outputPrice)} output per 1M tokens.`
        : `Check the pricing table above for current per-token costs for both models.`,
    },
    {
      question: `What is the context window difference between ${meta.nameA} and ${meta.nameB}?`,
      answer: modelDataA && modelDataB
        ? `${meta.nameA} supports ${formatContext(modelDataA.contextWindow)} tokens, while ${meta.nameB} supports ${formatContext(modelDataB.contextWindow)} tokens.`
        : `See the specs table above for current context window sizes.`,
    },
  ];

  return (
    <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <FAQPageJsonLd faqs={faqs} />

      {/* Breadcrumb */}
      <nav className="flex items-center gap-2 text-sm text-text-muted mb-6">
        <Link href="/compare" className="hover:text-accent-primary transition-colors flex items-center gap-1">
          <ArrowLeft className="w-3.5 h-3.5" />
          Compare
        </Link>
        <ChevronRight className="w-3.5 h-3.5" />
        <span className="text-text-primary">{meta.nameA} vs {meta.nameB}</span>
      </nav>

      {/* Hero */}
      <header className="mb-10">
        <h1 className="text-3xl sm:text-4xl font-bold text-text-primary mb-4 leading-tight">
          {meta.nameA} vs {meta.nameB}
        </h1>
        <p className="text-text-secondary text-lg leading-relaxed max-w-3xl">
          {meta.intro}
        </p>
      </header>

      {/* Quick Stats Comparison */}
      {modelDataA && modelDataB && (
        <section className="mb-10">
          <h2 className="text-xl font-semibold text-text-primary mb-4 flex items-center gap-2">
            <Scale className="w-5 h-5 text-accent-primary" />
            Head-to-Head Specs
          </h2>
          <div className="overflow-x-auto rounded-xl border border-border">
            <table className="w-full text-left">
              <thead>
                <tr className="bg-bg-tertiary">
                  <th className="px-4 py-3 text-xs font-semibold text-text-secondary uppercase tracking-wider">Spec</th>
                  <th className="px-4 py-3 text-xs font-semibold text-accent-primary uppercase tracking-wider">{meta.nameA}</th>
                  <th className="px-4 py-3 text-xs font-semibold text-accent-cyan uppercase tracking-wider">{meta.nameB}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                <tr className="bg-bg-secondary">
                  <td className="px-4 py-3 text-sm text-text-muted">Provider</td>
                  <td className="px-4 py-3 text-sm text-text-primary">{meta.providerA}</td>
                  <td className="px-4 py-3 text-sm text-text-primary">{meta.providerB}</td>
                </tr>
                <tr className="bg-bg-secondary">
                  <td className="px-4 py-3 text-sm text-text-muted">Input Price</td>
                  <td className={`px-4 py-3 text-sm font-mono ${modelDataA.inputPrice <= modelDataB.inputPrice ? 'text-accent-green font-semibold' : 'text-text-secondary'}`}>
                    {formatPrice(modelDataA.inputPrice)}/1M
                  </td>
                  <td className={`px-4 py-3 text-sm font-mono ${modelDataB.inputPrice <= modelDataA.inputPrice ? 'text-accent-green font-semibold' : 'text-text-secondary'}`}>
                    {formatPrice(modelDataB.inputPrice)}/1M
                  </td>
                </tr>
                <tr className="bg-bg-secondary">
                  <td className="px-4 py-3 text-sm text-text-muted">Output Price</td>
                  <td className={`px-4 py-3 text-sm font-mono ${modelDataA.outputPrice <= modelDataB.outputPrice ? 'text-accent-green font-semibold' : 'text-text-secondary'}`}>
                    {formatPrice(modelDataA.outputPrice)}/1M
                  </td>
                  <td className={`px-4 py-3 text-sm font-mono ${modelDataB.outputPrice <= modelDataA.outputPrice ? 'text-accent-green font-semibold' : 'text-text-secondary'}`}>
                    {formatPrice(modelDataB.outputPrice)}/1M
                  </td>
                </tr>
                <tr className="bg-bg-secondary">
                  <td className="px-4 py-3 text-sm text-text-muted">Context Window</td>
                  <td className={`px-4 py-3 text-sm font-mono ${modelDataA.contextWindow >= modelDataB.contextWindow ? 'text-accent-green font-semibold' : 'text-text-secondary'}`}>
                    {formatContext(modelDataA.contextWindow)}
                  </td>
                  <td className={`px-4 py-3 text-sm font-mono ${modelDataB.contextWindow >= modelDataA.contextWindow ? 'text-accent-green font-semibold' : 'text-text-secondary'}`}>
                    {formatContext(modelDataB.contextWindow)}
                  </td>
                </tr>
                <tr className="bg-bg-secondary">
                  <td className="px-4 py-3 text-sm text-text-muted">Released</td>
                  <td className="px-4 py-3 text-sm text-text-secondary">{modelDataA.released}</td>
                  <td className="px-4 py-3 text-sm text-text-secondary">{modelDataB.released}</td>
                </tr>
                <tr className="bg-bg-secondary">
                  <td className="px-4 py-3 text-sm text-text-muted">Capabilities</td>
                  <td className="px-4 py-3 text-sm text-text-secondary">{modelDataA.capabilities.join(', ')}</td>
                  <td className="px-4 py-3 text-sm text-text-secondary">{modelDataB.capabilities.join(', ')}</td>
                </tr>
              </tbody>
            </table>
          </div>
        </section>
      )}

      {/* Benchmark Comparison */}
      {benchA && benchB && (
        <section className="mb-10">
          <h2 className="text-xl font-semibold text-text-primary mb-4 flex items-center gap-2">
            <BookOpen className="w-5 h-5 text-accent-primary" />
            Benchmark Scores
          </h2>
          <div className="overflow-x-auto rounded-xl border border-border">
            <table className="w-full text-left">
              <thead>
                <tr className="bg-bg-tertiary">
                  <th className="px-4 py-3 text-xs font-semibold text-text-secondary uppercase tracking-wider">Benchmark</th>
                  <th className="px-4 py-3 text-xs font-semibold text-accent-primary uppercase tracking-wider text-right">{meta.nameA}</th>
                  <th className="px-4 py-3 text-xs font-semibold text-accent-cyan uppercase tracking-wider text-right">{meta.nameB}</th>
                  <th className="px-4 py-3 text-xs font-semibold text-text-secondary uppercase tracking-wider text-center">Winner</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {benchmarkData.benchmarks.map((bm: { id: string; name: string }) => {
                  const scoreA = benchA.scores[bm.id as keyof typeof benchA.scores];
                  const scoreB = benchB.scores[bm.id as keyof typeof benchB.scores];
                  if (scoreA === undefined || scoreB === undefined) return null;
                  const aWins = scoreA > scoreB;
                  const bWins = scoreB > scoreA;
                  return (
                    <tr key={bm.id} className="bg-bg-secondary">
                      <td className="px-4 py-3 text-sm text-text-primary font-medium">{bm.name}</td>
                      <td className={`px-4 py-3 text-sm text-right font-mono font-semibold ${aWins ? 'text-accent-green' : 'text-text-secondary'}`}>
                        {scoreA.toFixed(1)}
                      </td>
                      <td className={`px-4 py-3 text-sm text-right font-mono font-semibold ${bWins ? 'text-accent-green' : 'text-text-secondary'}`}>
                        {scoreB.toFixed(1)}
                      </td>
                      <td className="px-4 py-3 text-sm text-center">
                        <span className={`text-xs font-medium ${aWins ? 'text-accent-primary' : bWins ? 'text-accent-cyan' : 'text-text-muted'}`}>
                          {aWins ? meta.nameA.split(' ')[0] : bWins ? meta.nameB.split(' ')[0] : 'Tie'}
                        </span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
          <p className="text-text-muted text-xs mt-2">
            See the{' '}
            <Link href="/benchmarks" className="text-accent-primary hover:underline">full benchmark leaderboard</Link>
            {' '}for all models.
          </p>
        </section>
      )}

      {/* Category Verdicts */}
      <section className="mb-10">
        <h2 className="text-xl font-semibold text-text-primary mb-4 flex items-center gap-2">
          <Trophy className="w-5 h-5 text-accent-primary" />
          Category Breakdown
        </h2>
        <div className="space-y-3">
          {meta.verdicts.map((v) => (
            <div key={v.category} className="bg-bg-secondary border border-border rounded-lg p-4">
              <div className="flex items-center justify-between mb-1">
                <span className="text-text-primary font-medium">{v.category}</span>
                <span className={`text-xs font-semibold px-2.5 py-0.5 rounded-full ${
                  v.winner === 'A' ? 'bg-accent-primary/10 text-accent-primary border border-accent-primary/20' :
                  v.winner === 'B' ? 'bg-accent-cyan/10 text-accent-cyan border border-accent-cyan/20' :
                  'bg-bg-tertiary text-text-muted border border-border'
                }`}>
                  {v.winner === 'A' ? meta.nameA : v.winner === 'B' ? meta.nameB : 'Tie'}
                </span>
                {winnerBadge(v.winner)}
              </div>
              <p className="text-text-muted text-sm">{v.reason}</p>
            </div>
          ))}
        </div>
      </section>

      {/* When to Choose */}
      <section className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-10">
        <div className="bg-bg-secondary border border-accent-primary/20 rounded-xl p-6">
          <h2 className="text-lg font-semibold text-accent-primary mb-4">
            Choose {meta.nameA} when:
          </h2>
          <ul className="space-y-2">
            {meta.chooseA.map((item) => (
              <li key={item} className="flex items-start gap-2 text-text-secondary text-sm">
                <span className="text-accent-primary mt-0.5 shrink-0">&#x25B8;</span>
                {item}
              </li>
            ))}
          </ul>
          <Link
            href={`/models/${meta.modelA}`}
            className="inline-flex items-center gap-1 text-sm text-accent-primary hover:underline mt-4"
          >
            View {meta.nameA} details <ChevronRight className="w-3.5 h-3.5" />
          </Link>
        </div>
        <div className="bg-bg-secondary border border-accent-cyan/20 rounded-xl p-6">
          <h2 className="text-lg font-semibold text-accent-cyan mb-4">
            Choose {meta.nameB} when:
          </h2>
          <ul className="space-y-2">
            {meta.chooseB.map((item) => (
              <li key={item} className="flex items-start gap-2 text-text-secondary text-sm">
                <span className="text-accent-cyan mt-0.5 shrink-0">&#x25B8;</span>
                {item}
              </li>
            ))}
          </ul>
          <Link
            href={`/models/${meta.modelB}`}
            className="inline-flex items-center gap-1 text-sm text-accent-cyan hover:underline mt-4"
          >
            View {meta.nameB} details <ChevronRight className="w-3.5 h-3.5" />
          </Link>
        </div>
      </section>

      {/* FAQ */}
      <section className="mb-10">
        <h2 className="text-xl font-semibold text-text-primary mb-4 flex items-center gap-2">
          <Zap className="w-5 h-5 text-accent-primary" />
          Frequently Asked Questions
        </h2>
        <div className="space-y-4">
          {faqs.map((faq) => (
            <div key={faq.question} className="bg-bg-secondary border border-border rounded-lg p-5">
              <h3 className="text-text-primary font-medium mb-2">{faq.question}</h3>
              <p className="text-text-secondary text-sm leading-relaxed">{faq.answer}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Related Comparisons */}
      <section className="mb-10">
        <h2 className="text-xl font-semibold text-text-primary mb-4">More Comparisons</h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {related.map((c) => (
            <Link
              key={c.slug}
              href={`/compare/${c.slug}`}
              className="bg-bg-secondary border border-border rounded-xl p-4 hover:shadow-glow transition-shadow group"
            >
              <h3 className="text-text-primary font-semibold group-hover:text-accent-primary transition-colors mb-1">
                {c.nameA} vs {c.nameB}
              </h3>
              <p className="text-text-muted text-sm">{c.providerA} vs {c.providerB}</p>
            </Link>
          ))}
        </div>
      </section>

      {/* CTAs */}
      <section className="flex flex-wrap gap-3">
        <Link
          href="/compare"
          className="inline-flex items-center gap-2 px-5 py-2.5 bg-accent-primary text-white rounded-lg hover:bg-accent-primary/90 transition-colors font-medium text-sm"
        >
          Interactive Compare Tool
        </Link>
        <Link
          href="/models"
          className="inline-flex items-center gap-2 px-5 py-2.5 border border-border text-text-secondary rounded-lg hover:bg-bg-tertiary transition-colors font-medium text-sm"
        >
          All Models
        </Link>
        <Link
          href="/ai-api-pricing-guide"
          className="inline-flex items-center gap-2 px-5 py-2.5 border border-border text-text-secondary rounded-lg hover:bg-bg-tertiary transition-colors font-medium text-sm"
        >
          Full Pricing Guide
        </Link>
      </section>
    </div>
  );
}
