import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import JsonLd, { BreadcrumbListJsonLd } from '@/components/seo/JsonLd';
import { GEAR_CATEGORIES, getCategory } from '@/data/gear/categories';
import {
  PRODUCTS,
  getProductsByCategory,
  getCategoryCounts,
  getActiveCategoryIds,
} from '@/data/gear/products';
import { CategoryId } from '@/data/gear/types';
import GearHero from '@/components/gear/GearHero';
import CategoryGrid from '@/components/gear/CategoryGrid';
import ProductGrid from '@/components/gear/ProductGrid';
import CompareStrip from '@/components/gear/CompareStrip';

export function generateStaticParams() {
  return getActiveCategoryIds().map(category => ({ category }));
}

export function generateMetadata({
  params,
}: {
  params: { category: string };
}): Metadata {
  const meta = getCategory(params.category);
  if (!meta) return {};
  return {
    title: `${meta.name}: AI gear picks on TensorFeed`,
    description: `${meta.description} Curated and reviewed weekly on TensorFeed.`,
    alternates: { canonical: `https://tensorfeed.ai/gear/${meta.id}` },
    openGraph: {
      type: 'website',
      siteName: 'TensorFeed',
      title: `${meta.name} · TensorFeed AI Gear`,
      description: meta.description,
      url: `https://tensorfeed.ai/gear/${meta.id}`,
      images: [
        { url: 'https://tensorfeed.ai/tensorfeed-logo.png', width: 1024, height: 1024 },
      ],
    },
    twitter: { card: 'summary' },
  };
}

export default function GearCategoryPage({
  params,
}: {
  params: { category: string };
}) {
  const meta = getCategory(params.category);
  if (!meta) notFound();

  const products = getProductsByCategory(meta.id).sort((a, b) =>
    b.reviewedAt.localeCompare(a.reviewedAt)
  );
  if (products.length === 0) notFound();

  const counts = getCategoryCounts();
  const allCategories = GEAR_CATEGORIES.map(c => ({
    ...c,
    count: counts[c.id] ?? 0,
  })).filter(c => c.count > 0);

  const stats = {
    products: products.length,
    categories: allCategories.length,
    lastReview: '2026-05-23',
    refresh: 'Weekly',
  };

  const itemList = {
    '@context': 'https://schema.org',
    '@type': 'ItemList',
    name: `TensorFeed AI Gear: ${meta.name}`,
    description: meta.description,
    numberOfItems: products.length,
    itemListElement: products.map((p, i) => ({
      '@type': 'ListItem',
      position: i + 1,
      item: {
        '@type': 'Product',
        name: p.name,
        brand: { '@type': 'Brand', name: p.brand },
        description: p.blurb,
        category: p.category,
        image: p.image ? `https://tensorfeed.ai${p.image}` : undefined,
        url: `https://tensorfeed.ai/gear/${p.category}#${p.id}`,
      },
    })),
  };

  return (
    <main className="gear-main">
      <BreadcrumbListJsonLd
        items={[
          { name: 'TensorFeed', url: 'https://tensorfeed.ai/' },
          { name: 'AI Gear', url: 'https://tensorfeed.ai/gear' },
          { name: meta.name, url: `https://tensorfeed.ai/gear/${meta.id}` },
        ]}
      />
      <JsonLd data={itemList} />

      <GearHero
        stats={stats}
        title={meta.name}
        lede={meta.description}
      />

      <section className="gear-section" id="categories" style={{ paddingTop: 40 }}>
        <div className="container">
          <div className="gear-section-head">
            <div>
              <div className="h-eyebrow">
                <span className="bar" aria-hidden="true" /> BROWSE
              </div>
              <h2>All Categories</h2>
            </div>
            <div className="h-sub">
              <strong>{allCategories.length}</strong> categories
            </div>
          </div>
          <CategoryGrid
            mode="link"
            categories={allCategories}
            active={meta.id as CategoryId}
          />
        </div>
      </section>

      <section className="gear-section" id="picks">
        <div className="container">
          <div className="gear-section-head">
            <div>
              <div className="h-eyebrow">
                <span className="bar" aria-hidden="true" /> PICKS
              </div>
              <h2>{meta.name}</h2>
            </div>
            <div className="h-sub">
              <strong>{products.length}</strong>{' '}
              {products.length === 1 ? 'product' : 'products'} in {meta.name}
            </div>
          </div>
          <ProductGrid products={products} />
          <CompareStrip />
        </div>
      </section>
    </main>
  );
}
