import { Metadata } from 'next';
import { notFound } from 'next/navigation';
import Link from 'next/link';
import { ArrowLeft, ExternalLink, Cpu, Zap, BookOpen, ChevronRight } from 'lucide-react';
import { MODEL_DIRECTORY, getModelBySlug, getAllModelSlugs } from '@/lib/model-directory';
import { SoftwareApplicationJsonLd } from '@/components/seo/JsonLd';
import pricingData from '@/../data/pricing.json';
import benchmarkData from '@/../data/benchmarks.json';

// ── Static params for static export ───────────────────────────────
export function generateStaticParams() {
  return getAllModelSlugs().map(slug => ({ slug }));
}

// ── Dynamic metadata per model ────────────────────────────────────
export function generateMetadata({ params }: { params: { slug: string } }): Metadata {
  const meta = getModelBySlug(params.slug);
  if (!meta) return {};

  return {
    title: meta.seoTitle,
    description: meta.seoDescription,
    openGraph: {
      type: 'website',
      url: `https://tensorfeed.ai/models/${meta.slug}`,
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

// ── Helpers ────────────────────────────────────────────────────────

function formatContext(ctx: number): string {
  if (ctx >= 1000000) return `${(ctx / 1000000).toFixed(ctx % 1000000 === 0 ? 0 : 1)}M tokens`;
  return `${(ctx / 1000).toFixed(0)}K tokens`;
}

function formatPrice(price: number): string {
  return price === 0 ? 'Free (open source)' : `$${price.toFixed(2)} / 1M tokens`;
}

function tierLabel(tier: string): string {
  if (tier === 'flagship') return 'Flagship';
  if (tier === 'mid') return 'Mid-tier';
  return 'Budget';
}

function tierColor(tier: string): string {
  if (tier === 'flagship') return 'text-accent-primary bg-accent-primary/10 border-accent-primary/20';
  if (tier === 'mid') return 'text-accent-amber bg-accent-amber/10 border-accent-amber/20';
  return 'text-accent-green bg-accent-green/10 border-accent-green/20';
}

function scoreColor(score: number): string {
  if (score >= 90) return 'text-accent-green';
  if (score >= 80) return 'text-accent-amber';
  if (score >= 70) return 'text-text-primary';
  return 'text-text-secondary';
}

// ── Page ───────────────────────────────────────────────────────────

export default function ModelPage({ params }: { params: { slug: string } }) {
  const meta = getModelBySlug(params.slug);
  if (!meta) notFound();

  // Find pricing data
  const provider = pricingData.providers.find(p => p.id === meta.providerId);
  const model = provider?.models.find((m: { id: string }) => m.id === meta.pricingId);

  // Find benchmark data
  const benchmark = benchmarkData.models.find(
    (b: { model: string }) => b.model === meta.benchmarkName
  );

  // Find sibling models from same provider
  const siblings = MODEL_DIRECTORY.filter(
    m => m.providerId === meta.providerId && m.slug !== meta.slug
  );

  // Find competing models from other providers in same tier
  const competitors = MODEL_DIRECTORY.filter(
    m => m.tier === meta.tier && m.providerId !== meta.providerId
  ).slice(0, 4);

  const isOpenSource = model && 'openSource' in model && (model as { openSource?: boolean }).openSource;

  return (
    <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <SoftwareApplicationJsonLd
        name={meta.benchmarkName}
        description={meta.seoDescription}
        url={`https://tensorfeed.ai/models/${meta.slug}`}
        provider={meta.providerName}
        providerUrl={meta.providerUrl}
        offers={
          model && model.inputPrice > 0
            ? {
                price: model.inputPrice.toFixed(2),
                priceCurrency: 'USD',
                description: `$${model.inputPrice.toFixed(2)} input, $${model.outputPrice.toFixed(2)} output per 1M tokens`,
              }
            : undefined
        }
      />

      {/* Breadcrumb */}
      <nav className="flex items-center gap-2 text-sm text-text-muted mb-6">
        <Link href="/models" className="hover:text-accent-primary transition-colors flex items-center gap-1">
          <ArrowLeft className="w-3.5 h-3.5" />
          Models
        </Link>
        <ChevronRight className="w-3.5 h-3.5" />
        <span className="text-text-secondary">{meta.providerName}</span>
        <ChevronRight className="w-3.5 h-3.5" />
        <span className="text-text-primary">{meta.benchmarkName}</span>
      </nav>

      {/* Hero */}
      <header className="mb-10">
        <div className="flex items-start gap-4 mb-4">
          <div className="p-2.5 rounded-xl bg-accent-primary/10 shrink-0">
            <Cpu className="w-8 h-8 text-accent-primary" />
          </div>
          <div>
            <div className="flex items-center gap-3 mb-1">
              <h1 className="text-3xl sm:text-4xl font-bold text-text-primary">
                {meta.benchmarkName}
              </h1>
              <span className={`text-xs font-medium px-2.5 py-1 rounded-full border ${tierColor(meta.tier)}`}>
                {tierLabel(meta.tier)}
              </span>
            </div>
            <p className="text-text-muted text-lg">
              by{' '}
              <a
                href={meta.providerUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="text-accent-primary hover:underline"
              >
                {meta.providerName}
              </a>
            </p>
          </div>
        </div>
        <p className="text-text-secondary text-lg leading-relaxed max-w-3xl">
          {meta.intro}
        </p>
      </header>

      {/* Quick Stats Grid */}
      {model && (
        <section className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-10">
          <div className="bg-bg-secondary border border-border rounded-xl p-4">
            <p className="text-text-muted text-xs uppercase tracking-wider mb-1">Input Price</p>
            <p className="text-text-primary font-semibold font-mono">
              {model.inputPrice === 0 ? 'Free' : `$${model.inputPrice.toFixed(2)}`}
            </p>
            <p className="text-text-muted text-xs">per 1M tokens</p>
          </div>
          <div className="bg-bg-secondary border border-border rounded-xl p-4">
            <p className="text-text-muted text-xs uppercase tracking-wider mb-1">Output Price</p>
            <p className="text-text-primary font-semibold font-mono">
              {model.outputPrice === 0 ? 'Free' : `$${model.outputPrice.toFixed(2)}`}
            </p>
            <p className="text-text-muted text-xs">per 1M tokens</p>
          </div>
          <div className="bg-bg-secondary border border-border rounded-xl p-4">
            <p className="text-text-muted text-xs uppercase tracking-wider mb-1">Context Window</p>
            <p className="text-text-primary font-semibold font-mono">
              {formatContext(model.contextWindow).replace(' tokens', '')}
            </p>
            <p className="text-text-muted text-xs">tokens</p>
          </div>
          <div className="bg-bg-secondary border border-border rounded-xl p-4">
            <p className="text-text-muted text-xs uppercase tracking-wider mb-1">Released</p>
            <p className="text-text-primary font-semibold">
              {model.released}
            </p>
            <p className="text-text-muted text-xs">{isOpenSource ? 'Open source' : 'API access'}</p>
          </div>
        </section>
      )}

      {/* Capabilities */}
      {model && (
        <section className="mb-10">
          <h2 className="text-xl font-semibold text-text-primary mb-4 flex items-center gap-2">
            <Zap className="w-5 h-5 text-accent-primary" />
            Capabilities
          </h2>
          <div className="flex flex-wrap gap-2">
            {model.capabilities.map((cap: string) => (
              <span
                key={cap}
                className="px-3 py-1.5 rounded-lg bg-bg-tertiary text-text-secondary border border-border text-sm font-medium"
              >
                {cap}
              </span>
            ))}
          </div>
        </section>
      )}

      {/* Strengths & Use Cases side by side */}
      <section className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-10">
        <div className="bg-bg-secondary border border-border rounded-xl p-6">
          <h2 className="text-lg font-semibold text-text-primary mb-4">Key Strengths</h2>
          <ul className="space-y-2">
            {meta.strengths.map((s) => (
              <li key={s} className="flex items-start gap-2 text-text-secondary">
                <span className="text-accent-green mt-1 shrink-0">&#x2713;</span>
                {s}
              </li>
            ))}
          </ul>
        </div>
        <div className="bg-bg-secondary border border-border rounded-xl p-6">
          <h2 className="text-lg font-semibold text-text-primary mb-4">Best For</h2>
          <ul className="space-y-2">
            {meta.useCases.map((u) => (
              <li key={u} className="flex items-start gap-2 text-text-secondary">
                <span className="text-accent-primary mt-1 shrink-0">&#x25B8;</span>
                {u}
              </li>
            ))}
          </ul>
        </div>
      </section>

      {/* Benchmark Scores */}
      {benchmark && (
        <section className="mb-10">
          <h2 className="text-xl font-semibold text-text-primary mb-4 flex items-center gap-2">
            <BookOpen className="w-5 h-5 text-accent-primary" />
            Benchmark Scores
          </h2>
          <div className="overflow-x-auto rounded-xl border border-border">
            <table className="w-full text-left">
              <thead>
                <tr className="bg-bg-tertiary">
                  <th className="px-4 py-3 text-xs font-semibold text-text-secondary uppercase tracking-wider">
                    Benchmark
                  </th>
                  <th className="px-4 py-3 text-xs font-semibold text-text-secondary uppercase tracking-wider text-right">
                    Score
                  </th>
                  <th className="px-4 py-3 text-xs font-semibold text-text-secondary uppercase tracking-wider">
                    Description
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {benchmarkData.benchmarks.map((bm: { id: string; name: string; description: string }) => {
                  const score = benchmark.scores[bm.id as keyof typeof benchmark.scores];
                  if (score === undefined) return null;
                  return (
                    <tr key={bm.id} className="bg-bg-secondary">
                      <td className="px-4 py-3 text-sm text-text-primary font-medium">{bm.name}</td>
                      <td className={`px-4 py-3 text-sm text-right font-mono font-semibold ${scoreColor(score)}`}>
                        {score.toFixed(1)}
                      </td>
                      <td className="px-4 py-3 text-sm text-text-muted">{bm.description}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
          <p className="text-text-muted text-xs mt-2">
            Scores sourced from public benchmark datasets. See{' '}
            <Link href="/benchmarks" className="text-accent-primary hover:underline">full benchmark leaderboard</Link>
            {' '}for all models.
          </p>
        </section>
      )}

      {/* Pricing Detail */}
      {model && model.inputPrice > 0 && (
        <section className="mb-10">
          <h2 className="text-xl font-semibold text-text-primary mb-4">Pricing Details</h2>
          <div className="bg-bg-secondary border border-border rounded-xl p-6">
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
              <div>
                <p className="text-text-muted text-sm mb-1">Input tokens</p>
                <p className="text-2xl font-bold text-text-primary font-mono">${model.inputPrice.toFixed(2)}</p>
                <p className="text-text-muted text-xs">per 1M tokens</p>
              </div>
              <div>
                <p className="text-text-muted text-sm mb-1">Output tokens</p>
                <p className="text-2xl font-bold text-text-primary font-mono">${model.outputPrice.toFixed(2)}</p>
                <p className="text-text-muted text-xs">per 1M tokens</p>
              </div>
              <div>
                <p className="text-text-muted text-sm mb-1">Estimated cost per 1K requests</p>
                <p className="text-2xl font-bold text-text-primary font-mono">
                  ${((model.inputPrice * 0.001 + model.outputPrice * 0.0005) * 1000).toFixed(2)}
                </p>
                <p className="text-text-muted text-xs">~1K input + ~500 output tokens avg</p>
              </div>
            </div>
            <div className="mt-4 pt-4 border-t border-border">
              <p className="text-text-muted text-sm">
                Prices are subject to change. Check the{' '}
                <a
                  href={meta.docsUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-accent-primary hover:underline"
                >
                  official documentation
                </a>
                {' '}for current pricing. See the{' '}
                <Link href="/tools/cost-calculator" className="text-accent-primary hover:underline">
                  cost calculator
                </Link>
                {' '}for detailed estimates.
              </p>
            </div>
          </div>
        </section>
      )}

      {/* Open Source Notice */}
      {isOpenSource && (
        <section className="mb-10">
          <div className="bg-accent-green/5 border border-accent-green/20 rounded-xl p-6">
            <h2 className="text-lg font-semibold text-accent-green mb-2">Open Source Model</h2>
            <p className="text-text-secondary">
              {meta.benchmarkName} is free to download and self-host under the{' '}
              {(model as { license?: string }).license || 'open source license'}.
              Hosted API pricing varies by provider (e.g., Together, Fireworks, Groq). See our{' '}
              <Link href="/best-open-source-llms" className="text-accent-primary hover:underline">
                open source LLM guide
              </Link>
              {' '}for deployment options.
            </p>
          </div>
        </section>
      )}

      {/* Related Models */}
      <section className="mb-10">
        <h2 className="text-xl font-semibold text-text-primary mb-4">Related Models</h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {/* Siblings from same provider */}
          {siblings.map((s) => {
            const sModel = pricingData.providers
              .find(p => p.id === s.providerId)
              ?.models.find((m: { id: string }) => m.id === s.pricingId);
            return (
              <Link
                key={s.slug}
                href={`/models/${s.slug}`}
                className="bg-bg-secondary border border-border rounded-xl p-4 hover:shadow-glow transition-shadow group"
              >
                <div className="flex items-center justify-between mb-2">
                  <h3 className="text-text-primary font-semibold group-hover:text-accent-primary transition-colors">
                    {s.benchmarkName}
                  </h3>
                  <span className={`text-xs px-2 py-0.5 rounded-full border ${tierColor(s.tier)}`}>
                    {tierLabel(s.tier)}
                  </span>
                </div>
                <p className="text-text-muted text-sm">{s.providerName}</p>
                {sModel && (
                  <p className="text-text-secondary text-sm mt-1 font-mono">
                    {sModel.inputPrice === 0 ? 'Free' : `$${sModel.inputPrice.toFixed(2)} in`}
                    {sModel.inputPrice > 0 && ` / $${sModel.outputPrice.toFixed(2)} out`}
                  </p>
                )}
              </Link>
            );
          })}
          {/* Competitors from other providers */}
          {competitors.map((c) => {
            const cModel = pricingData.providers
              .find(p => p.id === c.providerId)
              ?.models.find((m: { id: string }) => m.id === c.pricingId);
            return (
              <Link
                key={c.slug}
                href={`/models/${c.slug}`}
                className="bg-bg-secondary border border-border rounded-xl p-4 hover:shadow-glow transition-shadow group"
              >
                <div className="flex items-center justify-between mb-2">
                  <h3 className="text-text-primary font-semibold group-hover:text-accent-primary transition-colors">
                    {c.benchmarkName}
                  </h3>
                  <span className={`text-xs px-2 py-0.5 rounded-full border ${tierColor(c.tier)}`}>
                    {tierLabel(c.tier)}
                  </span>
                </div>
                <p className="text-text-muted text-sm">{c.providerName}</p>
                {cModel && (
                  <p className="text-text-secondary text-sm mt-1 font-mono">
                    {cModel.inputPrice === 0 ? 'Free' : `$${cModel.inputPrice.toFixed(2)} in`}
                    {cModel.inputPrice > 0 && ` / $${cModel.outputPrice.toFixed(2)} out`}
                  </p>
                )}
              </Link>
            );
          })}
        </div>
      </section>

      {/* CTAs */}
      <section className="flex flex-wrap gap-3 mb-10">
        <a
          href={meta.docsUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center gap-2 px-5 py-2.5 bg-accent-primary text-white rounded-lg hover:bg-accent-primary/90 transition-colors font-medium text-sm"
        >
          <ExternalLink className="w-4 h-4" />
          View Documentation
        </a>
        <Link
          href="/compare"
          className="inline-flex items-center gap-2 px-5 py-2.5 border border-border text-text-secondary rounded-lg hover:bg-bg-tertiary transition-colors font-medium text-sm"
        >
          Compare Models
        </Link>
        <Link
          href="/tools/cost-calculator"
          className="inline-flex items-center gap-2 px-5 py-2.5 border border-border text-text-secondary rounded-lg hover:bg-bg-tertiary transition-colors font-medium text-sm"
        >
          Cost Calculator
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
