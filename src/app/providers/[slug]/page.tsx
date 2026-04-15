import { Metadata } from 'next';
import { notFound } from 'next/navigation';
import Link from 'next/link';
import { ArrowLeft, ChevronRight, Building2, ExternalLink, Cpu, BookOpen } from 'lucide-react';
import { getProviderBySlug, getAllProviderSlugs, PROVIDERS } from '@/lib/provider-directory';
import { MODEL_DIRECTORY } from '@/lib/model-directory';
import { COMPARISONS } from '@/lib/comparison-directory';
import pricingData from '@/../data/pricing.json';
import benchmarkData from '@/../data/benchmarks.json';

export function generateStaticParams() {
  return getAllProviderSlugs().map(slug => ({ slug }));
}

export function generateMetadata({ params }: { params: { slug: string } }): Metadata {
  const meta = getProviderBySlug(params.slug);
  if (!meta) return {};

  return {
    title: meta.seoTitle,
    description: meta.seoDescription,
    openGraph: {
      type: 'website',
      url: `https://tensorfeed.ai/providers/${meta.slug}`,
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

export default function ProviderPage({ params }: { params: { slug: string } }) {
  const meta = getProviderBySlug(params.slug);
  if (!meta) notFound();

  // Get provider pricing data
  const providerData = pricingData.providers.find(p => p.id === meta.pricingId);
  const models = providerData?.models || [];

  // Get model detail pages for this provider
  const modelPages = MODEL_DIRECTORY.filter(m => m.providerId === meta.pricingId);

  // Get benchmark data for this provider's models
  const providerBenchmarks = benchmarkData.models.filter(
    (b: { provider: string }) => b.provider === meta.name
  );

  // Get comparisons involving this provider
  const relatedComparisons = COMPARISONS.filter(
    c => c.providerA === meta.name || c.providerB === meta.name
  );

  // Other providers
  const otherProviders = PROVIDERS.filter(p => p.slug !== meta.slug);

  return (
    <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      {/* Breadcrumb */}
      <nav className="flex items-center gap-2 text-sm text-text-muted mb-6">
        <Link href="/models" className="hover:text-accent-primary transition-colors flex items-center gap-1">
          <ArrowLeft className="w-3.5 h-3.5" />
          Models
        </Link>
        <ChevronRight className="w-3.5 h-3.5" />
        <span className="text-text-primary">{meta.name}</span>
      </nav>

      {/* Hero */}
      <header className="mb-10">
        <div className="flex items-start gap-4 mb-4">
          <div className="p-2.5 rounded-xl bg-accent-primary/10 shrink-0">
            <Building2 className="w-8 h-8 text-accent-primary" />
          </div>
          <div>
            <h1 className="text-3xl sm:text-4xl font-bold text-text-primary mb-1">
              {meta.name}
            </h1>
            <p className="text-text-muted">
              <a href={meta.url} target="_blank" rel="noopener noreferrer" className="text-accent-primary hover:underline inline-flex items-center gap-1">
                {meta.url.replace('https://', '')} <ExternalLink className="w-3.5 h-3.5" />
              </a>
            </p>
          </div>
        </div>
        <p className="text-text-secondary text-lg leading-relaxed max-w-3xl">
          {meta.intro}
        </p>
      </header>

      {/* Quick Facts */}
      <section className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-10">
        <div className="bg-bg-secondary border border-border rounded-xl p-4">
          <p className="text-text-muted text-xs uppercase tracking-wider mb-1">Founded</p>
          <p className="text-text-primary font-semibold">{meta.founded}</p>
        </div>
        <div className="bg-bg-secondary border border-border rounded-xl p-4">
          <p className="text-text-muted text-xs uppercase tracking-wider mb-1">Headquarters</p>
          <p className="text-text-primary font-semibold text-sm">{meta.headquarters}</p>
        </div>
        <div className="bg-bg-secondary border border-border rounded-xl p-4">
          <p className="text-text-muted text-xs uppercase tracking-wider mb-1">CEO</p>
          <p className="text-text-primary font-semibold">{meta.ceo}</p>
        </div>
        <div className="bg-bg-secondary border border-border rounded-xl p-4">
          <p className="text-text-muted text-xs uppercase tracking-wider mb-1">Models</p>
          <p className="text-text-primary font-semibold">{models.length} active</p>
        </div>
      </section>

      {/* Key Products */}
      <section className="mb-10">
        <h2 className="text-xl font-semibold text-text-primary mb-4">Key Products</h2>
        <div className="flex flex-wrap gap-2">
          {meta.keyProducts.map((product) => (
            <span key={product} className="px-3 py-1.5 rounded-lg bg-bg-tertiary text-text-secondary border border-border text-sm font-medium">
              {product}
            </span>
          ))}
        </div>
      </section>

      {/* Strengths */}
      <section className="mb-10">
        <h2 className="text-xl font-semibold text-text-primary mb-4">Strengths</h2>
        <div className="bg-bg-secondary border border-border rounded-xl p-6">
          <ul className="space-y-2">
            {meta.strengths.map((s) => (
              <li key={s} className="flex items-start gap-2 text-text-secondary">
                <span className="text-accent-green mt-1 shrink-0">&#x2713;</span>
                {s}
              </li>
            ))}
          </ul>
        </div>
      </section>

      {/* Model Pricing Table */}
      {models.length > 0 && (
        <section className="mb-10">
          <h2 className="text-xl font-semibold text-text-primary mb-4 flex items-center gap-2">
            <Cpu className="w-5 h-5 text-accent-primary" />
            {meta.name} Models
          </h2>
          <div className="overflow-x-auto rounded-xl border border-border">
            <table className="w-full text-left">
              <thead>
                <tr className="bg-bg-tertiary">
                  <th className="px-4 py-3 text-xs font-semibold text-text-secondary uppercase tracking-wider">Model</th>
                  <th className="px-4 py-3 text-xs font-semibold text-text-secondary uppercase tracking-wider text-right">Input / 1M</th>
                  <th className="px-4 py-3 text-xs font-semibold text-text-secondary uppercase tracking-wider text-right">Output / 1M</th>
                  <th className="px-4 py-3 text-xs font-semibold text-text-secondary uppercase tracking-wider text-right">Context</th>
                  <th className="px-4 py-3 text-xs font-semibold text-text-secondary uppercase tracking-wider">Capabilities</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {models.map((model: { id: string; name: string; inputPrice: number; outputPrice: number; contextWindow: number; capabilities: string[] }) => {
                  const modelPage = modelPages.find(mp => mp.pricingId === model.id);
                  return (
                    <tr key={model.id} className="bg-bg-secondary hover:bg-bg-tertiary/50 transition-colors">
                      <td className="px-4 py-3 text-sm text-text-primary font-medium">
                        {modelPage ? (
                          <Link href={`/models/${modelPage.slug}`} className="hover:text-accent-primary transition-colors">
                            {model.name}
                          </Link>
                        ) : model.name}
                      </td>
                      <td className="px-4 py-3 text-sm text-right font-mono text-text-secondary">
                        {formatPrice(model.inputPrice)}
                      </td>
                      <td className="px-4 py-3 text-sm text-right font-mono text-text-secondary">
                        {formatPrice(model.outputPrice)}
                      </td>
                      <td className="px-4 py-3 text-sm text-right text-text-secondary">
                        {formatContext(model.contextWindow)}
                      </td>
                      <td className="px-4 py-3 text-sm text-text-muted">
                        {model.capabilities.join(', ')}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
          <p className="text-text-muted text-xs mt-2">
            Prices per 1M tokens in USD. See the{' '}
            <Link href="/ai-api-pricing-guide" className="text-accent-primary hover:underline">full pricing guide</Link>
            {' '}for detailed analysis.
          </p>
        </section>
      )}

      {/* Benchmark Scores */}
      {providerBenchmarks.length > 0 && (
        <section className="mb-10">
          <h2 className="text-xl font-semibold text-text-primary mb-4 flex items-center gap-2">
            <BookOpen className="w-5 h-5 text-accent-primary" />
            Benchmark Scores
          </h2>
          <div className="overflow-x-auto rounded-xl border border-border">
            <table className="w-full text-left">
              <thead>
                <tr className="bg-bg-tertiary">
                  <th className="px-4 py-3 text-xs font-semibold text-text-secondary uppercase tracking-wider">Model</th>
                  {benchmarkData.benchmarks.map((bm: { id: string; name: string }) => (
                    <th key={bm.id} className="px-4 py-3 text-xs font-semibold text-text-secondary uppercase tracking-wider text-right">
                      {bm.name}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {providerBenchmarks.map((b: { model: string; scores: Record<string, number> }) => (
                  <tr key={b.model} className="bg-bg-secondary">
                    <td className="px-4 py-3 text-sm text-text-primary font-medium">{b.model}</td>
                    {benchmarkData.benchmarks.map((bm: { id: string }) => {
                      const score = b.scores[bm.id as keyof typeof b.scores];
                      return (
                        <td key={bm.id} className={`px-4 py-3 text-sm text-right font-mono font-semibold ${
                          score >= 90 ? 'text-accent-green' : score >= 80 ? 'text-accent-amber' : 'text-text-secondary'
                        }`}>
                          {score?.toFixed(1) ?? 'N/A'}
                        </td>
                      );
                    })}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      )}

      {/* Related Comparisons */}
      {relatedComparisons.length > 0 && (
        <section className="mb-10">
          <h2 className="text-xl font-semibold text-text-primary mb-4">Comparisons</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {relatedComparisons.map((c) => (
              <Link
                key={c.slug}
                href={`/compare/${c.slug}`}
                className="bg-bg-secondary border border-border rounded-xl p-4 hover:shadow-glow transition-shadow group"
              >
                <h3 className="text-text-primary font-semibold group-hover:text-accent-primary transition-colors">
                  {c.nameA} vs {c.nameB}
                </h3>
                <p className="text-text-muted text-sm mt-1">{c.providerA} vs {c.providerB}</p>
              </Link>
            ))}
          </div>
        </section>
      )}

      {/* Status Link */}
      {meta.statusSlug && (
        <section className="mb-10">
          <Link
            href={`/${meta.statusSlug}`}
            className="block bg-bg-secondary border border-border rounded-xl p-5 hover:border-accent-primary transition-colors group"
          >
            <h3 className="text-text-primary font-semibold group-hover:text-accent-primary transition-colors mb-1">
              Is {meta.name} Down?
            </h3>
            <p className="text-text-muted text-sm">
              Real-time status monitoring for {meta.name} services, updated every 2 minutes.
            </p>
          </Link>
        </section>
      )}

      {/* Other Providers */}
      <section className="mb-10">
        <h2 className="text-xl font-semibold text-text-primary mb-4">Other Providers</h2>
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
          {otherProviders.map((p) => (
            <Link
              key={p.slug}
              href={`/providers/${p.slug}`}
              className="bg-bg-secondary border border-border rounded-lg p-3 hover:border-accent-primary transition-colors text-center group"
            >
              <p className="text-text-primary font-medium text-sm group-hover:text-accent-primary transition-colors">{p.name}</p>
            </Link>
          ))}
        </div>
      </section>

      {/* CTAs */}
      <section className="flex flex-wrap gap-3">
        <a
          href={meta.url}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center gap-2 px-5 py-2.5 bg-accent-primary text-white rounded-lg hover:bg-accent-primary/90 transition-colors font-medium text-sm"
        >
          <ExternalLink className="w-4 h-4" />
          Visit {meta.name}
        </a>
        <Link
          href="/compare"
          className="inline-flex items-center gap-2 px-5 py-2.5 border border-border text-text-secondary rounded-lg hover:bg-bg-tertiary transition-colors font-medium text-sm"
        >
          Compare Models
        </Link>
        <Link
          href="/models"
          className="inline-flex items-center gap-2 px-5 py-2.5 border border-border text-text-secondary rounded-lg hover:bg-bg-tertiary transition-colors font-medium text-sm"
        >
          All Models
        </Link>
      </section>
    </div>
  );
}
