import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import Link from 'next/link';
import { ArrowLeft, ChevronRight, Info } from 'lucide-react';
import JsonLd, { BreadcrumbListJsonLd } from '@/components/seo/JsonLd';
import {
  getCategoryMeta,
  getProductsByCategory,
  getActiveCategorySlugs,
  getLastReviewed,
  GearCategory,
} from '@/lib/gear';
import GearCard from '@/components/gear/GearCard';

export function generateStaticParams() {
  return getActiveCategorySlugs().map(category => ({ category }));
}

export function generateMetadata({
  params,
}: {
  params: { category: string };
}): Metadata {
  const meta = getCategoryMeta(params.category as GearCategory);
  if (!meta) return {};
  return {
    title: `${meta.display}: AI-Relevant Gear Picks`,
    description: `${meta.description} Curated and reviewed weekly on TensorFeed.`,
    alternates: { canonical: `https://tensorfeed.ai/gear/${meta.slug}` },
    openGraph: {
      title: `${meta.display}: AI-Relevant Gear Picks on TensorFeed`,
      description: meta.description,
      url: `https://tensorfeed.ai/gear/${meta.slug}`,
      type: 'website',
      siteName: 'TensorFeed.ai',
      images: [{ url: 'https://tensorfeed.ai/tensorfeed-logo.png', width: 1024, height: 1024 }],
    },
    twitter: {
      card: 'summary',
      title: `${meta.display}: AI-Relevant Gear on TensorFeed`,
      description: meta.description,
    },
  };
}

export default function GearCategoryPage({
  params,
}: {
  params: { category: string };
}) {
  const meta = getCategoryMeta(params.category as GearCategory);
  if (!meta) notFound();

  const products = getProductsByCategory(meta.slug).sort((a, b) =>
    b.updated.localeCompare(a.updated)
  );
  if (products.length === 0) notFound();

  const lastReviewed = getLastReviewed();

  const itemList = {
    '@context': 'https://schema.org',
    '@type': 'ItemList',
    name: `TensorFeed AI Gear: ${meta.display}`,
    description: meta.description,
    numberOfItems: products.length,
    itemListElement: products.map((p, i) => ({
      '@type': 'ListItem',
      position: i + 1,
      item: {
        '@type': 'Product',
        name: p.name,
        brand: { '@type': 'Brand', name: p.manufacturer },
        description: p.blurb,
        category: p.category,
        url: `https://tensorfeed.ai/gear/${meta.slug}#${p.id}`,
      },
    })),
  };

  return (
    <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <BreadcrumbListJsonLd
        items={[
          { name: 'Home', url: 'https://tensorfeed.ai' },
          { name: 'Gear', url: 'https://tensorfeed.ai/gear' },
          { name: meta.display, url: `https://tensorfeed.ai/gear/${meta.slug}` },
        ]}
      />
      <JsonLd data={itemList} />

      <nav className="flex items-center gap-2 text-sm text-text-muted mb-6">
        <Link
          href="/gear"
          className="hover:text-accent-primary transition-colors flex items-center gap-1"
        >
          <ArrowLeft className="w-3.5 h-3.5" />
          Gear
        </Link>
        <ChevronRight className="w-3.5 h-3.5" aria-hidden />
        <span className="text-text-secondary">{meta.display}</span>
      </nav>

      <header className="mb-10">
        <div
          className="rounded-lg p-6 sm:p-8 mb-5"
          style={{
            background: `linear-gradient(135deg, ${meta.gradientFrom} 0%, ${meta.gradientTo} 100%)`,
          }}
        >
          <h1 className="text-2xl sm:text-3xl font-bold text-white mb-2">
            {meta.display}
          </h1>
          <p className="text-white/80 text-sm sm:text-base max-w-3xl">
            {meta.description}
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-4 text-sm text-text-muted">
          <span className="font-mono">
            {products.length}{' '}
            {products.length === 1 ? 'product' : 'products'}
          </span>
          <span aria-hidden>·</span>
          <span>
            Last reviewed:{' '}
            <time dateTime={lastReviewed} className="font-mono">
              {lastReviewed}
            </time>
          </span>
        </div>

        <div className="mt-5 flex items-start gap-2 text-xs text-text-muted bg-bg-secondary/50 border border-border-primary/40 rounded px-3 py-2 max-w-3xl">
          <Info className="w-4 h-4 mt-0.5 flex-shrink-0" aria-hidden />
          <p>
            TensorFeed earns a commission from qualifying Amazon purchases.
            Non-Amazon products are listed without affiliate links. See our{' '}
            <Link
              href="/affiliate-disclosure"
              className="text-accent-primary hover:text-accent-cyan transition-colors underline underline-offset-2"
            >
              affiliate disclosure
            </Link>
            .
          </p>
        </div>
      </header>

      <section>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
          {products.map(product => (
            <div key={product.id} id={product.id}>
              <GearCard product={product} />
            </div>
          ))}
        </div>
      </section>

      <section className="mt-16 pt-8 border-t border-border-primary/50 flex flex-col sm:flex-row gap-4 sm:items-center sm:justify-between text-sm">
        <Link
          href="/gear"
          className="inline-flex items-center gap-1.5 text-text-muted hover:text-accent-primary transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
          All gear categories
        </Link>
        <Link
          href="/ai-hardware"
          className="inline-flex items-center gap-1.5 text-accent-primary hover:text-accent-cyan transition-colors font-medium"
        >
          Datacenter chip specs (H100, MI300, TPUs)
          <ChevronRight className="w-4 h-4" />
        </Link>
      </section>
    </div>
  );
}
