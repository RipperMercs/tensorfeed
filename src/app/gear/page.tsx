import type { Metadata } from 'next';
import Link from 'next/link';
import { ArrowRight, Info, Microchip } from 'lucide-react';
import JsonLd, { BreadcrumbListJsonLd } from '@/components/seo/JsonLd';
import {
  getActiveCategories,
  getFeaturedProducts,
  getLastReviewed,
  getProductCounts,
  getProducts,
} from '@/lib/gear';
import GearCard from '@/components/gear/GearCard';

export const metadata: Metadata = {
  title: 'AI Gear: Curated Hardware Picks for Local LLMs, XR, and Robotics',
  description:
    'Hand-curated AI-relevant hardware. Laptops capable of running local language models, GPUs for self-built rigs, AR glasses, robotics, and more. Updated weekly on TensorFeed.',
  alternates: { canonical: 'https://tensorfeed.ai/gear' },
  openGraph: {
    title: 'AI Gear: Curated Hardware Picks for Local LLMs, XR, and Robotics',
    description:
      'Hand-curated AI-relevant consumer hardware. Updated weekly on TensorFeed.',
    url: 'https://tensorfeed.ai/gear',
    type: 'website',
    siteName: 'TensorFeed.ai',
    images: [{ url: 'https://tensorfeed.ai/tensorfeed-logo.png', width: 1024, height: 1024 }],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'AI Gear: Curated Hardware Picks on TensorFeed',
    description:
      'Hand-curated AI-relevant consumer hardware: laptops, GPUs, AR glasses, and more.',
  },
};

export default function GearPage() {
  const featured = getFeaturedProducts(9);
  const activeCategories = getActiveCategories();
  const counts = getProductCounts();
  const lastReviewed = getLastReviewed();
  const total = getProducts().length;

  const itemList = {
    '@context': 'https://schema.org',
    '@type': 'ItemList',
    name: 'TensorFeed AI Gear Picks',
    description:
      'Curated AI-relevant consumer hardware including laptops, GPUs, AR glasses, robotics, and edge devices.',
    numberOfItems: total,
    itemListElement: featured.map((p, i) => ({
      '@type': 'ListItem',
      position: i + 1,
      item: {
        '@type': 'Product',
        name: p.name,
        brand: { '@type': 'Brand', name: p.manufacturer },
        description: p.blurb,
        category: p.category,
        url: `https://tensorfeed.ai/gear/${p.category}#${p.id}`,
      },
    })),
  };

  return (
    <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <BreadcrumbListJsonLd
        items={[
          { name: 'Home', url: 'https://tensorfeed.ai' },
          { name: 'Gear', url: 'https://tensorfeed.ai/gear' },
        ]}
      />
      <JsonLd data={itemList} />

      <header className="mb-10">
        <div className="flex items-center gap-3 mb-3">
          <div className="p-2 rounded-lg bg-accent-primary/10">
            <Microchip className="w-7 h-7 text-accent-primary" />
          </div>
          <h1 className="text-3xl sm:text-4xl font-bold text-text-primary">AI Gear</h1>
        </div>
        <p className="text-text-secondary text-base sm:text-lg leading-relaxed max-w-3xl">
          Hand-curated AI-relevant consumer hardware. Laptops capable of running
          local language models, discrete GPUs for self-built rigs, AR glasses
          with AI overlays, robotics, edge accelerators, and the occasional
          experimental device worth knowing about.
        </p>

        <div className="mt-4 flex flex-wrap items-center gap-4 text-sm text-text-muted">
          <span className="font-mono">
            {total} {total === 1 ? 'product' : 'products'}
          </span>
          <span aria-hidden>·</span>
          <span>
            Last reviewed:{' '}
            <time dateTime={lastReviewed} className="font-mono">
              {lastReviewed}
            </time>
          </span>
          <span aria-hidden>·</span>
          <span>Refreshed weekly</span>
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

      {activeCategories.length > 0 && (
        <section className="mb-12">
          <h2 className="text-xl font-semibold text-text-primary mb-4">
            Browse by category
          </h2>
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
            {activeCategories.map(cat => (
              <Link
                key={cat.slug}
                href={`/gear/${cat.slug}`}
                className="group relative h-28 rounded-lg overflow-hidden border border-border-primary hover:border-accent-primary/40 transition-colors"
                style={{
                  background: `linear-gradient(135deg, ${cat.gradientFrom} 0%, ${cat.gradientTo} 100%)`,
                }}
              >
                <div className="absolute inset-0 p-4 flex flex-col justify-end">
                  <div className="text-white font-semibold text-base group-hover:text-accent-cyan transition-colors">
                    {cat.display}
                  </div>
                  <div className="text-white/70 text-xs font-mono mt-0.5">
                    {counts[cat.slug]}{' '}
                    {counts[cat.slug] === 1 ? 'product' : 'products'}
                  </div>
                </div>
              </Link>
            ))}
          </div>
        </section>
      )}

      {featured.length > 0 && (
        <section className="mb-12">
          <h2 className="text-xl font-semibold text-text-primary mb-4">
            Featured picks
          </h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
            {featured.map(product => (
              <GearCard key={product.id} product={product} />
            ))}
          </div>
        </section>
      )}

      {total === 0 && (
        <section className="border border-dashed border-border-primary/60 rounded-lg p-10 text-center">
          <p className="text-text-secondary text-sm">
            The catalog is being seeded. Check back shortly for our first round
            of picks.
          </p>
        </section>
      )}

      <section className="mt-16 pt-8 border-t border-border-primary/50 flex flex-col sm:flex-row gap-4 sm:items-center sm:justify-between text-sm">
        <div className="text-text-muted">
          Want raw datacenter chip specs (H100, MI300, TPUs)?
        </div>
        <Link
          href="/ai-hardware"
          className="inline-flex items-center gap-1.5 text-accent-primary hover:text-accent-cyan transition-colors font-medium"
        >
          AI Hardware database
          <ArrowRight className="w-4 h-4" />
        </Link>
      </section>
    </div>
  );
}
