import type { Metadata } from 'next';
import JsonLd, { BreadcrumbListJsonLd, DatasetJsonLd } from '@/components/seo/JsonLd';
import MachineReadableLink from '@/components/MachineReadableLink';
import { GEAR_CATEGORIES } from '@/data/gear/categories';
import { PRODUCTS, getCategoryCounts } from '@/data/gear/products';
import { SPOTLIGHT } from '@/data/gear/spotlight';
import GearHero from '@/components/gear/GearHero';
import Spotlight from '@/components/gear/Spotlight';
import GearInteractive from '@/components/gear/GearInteractive';
import CompareStrip from '@/components/gear/CompareStrip';

export const metadata: Metadata = {
  title: 'AI Gear: hand-curated hardware for local LLMs, robotics, and AR',
  description:
    "TensorFeed's curated hub of AI-relevant consumer hardware. Laptops capable of local LLMs, discrete GPUs, AR glasses, robotics, and edge accelerators. Reviewed and refreshed weekly.",
  alternates: { canonical: 'https://tensorfeed.ai/gear' },
  openGraph: {
    type: 'website',
    siteName: 'TensorFeed',
    title: 'AI Gear · TensorFeed',
    description:
      'Hand-curated AI-relevant consumer hardware, reviewed weekly.',
    url: 'https://tensorfeed.ai/gear',
    images: [
      { url: 'https://tensorfeed.ai/tensorfeed-logo.png', width: 1024, height: 1024 },
    ],
  },
  twitter: { card: 'summary_large_image' },
};

export default function GearHubPage() {
  const counts = getCategoryCounts();
  const categories = GEAR_CATEGORIES.map(c => ({
    ...c,
    count: counts[c.id] ?? 0,
  })).filter(c => c.count > 0);

  const stats = {
    products: PRODUCTS.length,
    categories: categories.length,
    lastReview: '2026-05-23',
    refresh: 'Weekly',
  };

  const itemList = {
    '@context': 'https://schema.org',
    '@type': 'ItemList',
    name: 'TensorFeed AI Gear',
    description:
      'Curated AI-relevant consumer hardware including laptops, GPUs, AR glasses, robotics, edge accelerators, and AI-aware peripherals.',
    numberOfItems: PRODUCTS.length,
    itemListElement: PRODUCTS.map((p, i) => ({
      '@type': 'ListItem',
      position: i + 1,
      item: {
        '@type': 'Product',
        name: p.name,
        brand: { '@type': 'Brand', name: p.brand },
        description: p.blurb,
        category: p.category,
        image: p.image
          ? `https://tensorfeed.ai${p.image}`
          : undefined,
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
        ]}
      />
      <JsonLd data={itemList} />
      <DatasetJsonLd
        name="TensorFeed AI Gear"
        description="Curated, human-reviewed catalog of AI-relevant consumer hardware: laptops capable of local language models, discrete GPUs, AR glasses, robotics, and edge accelerators. The machine-readable JSON twin strips affiliate plumbing so agents read clean vendor URLs."
        url="https://tensorfeed.ai/gear"
        jsonUrl="/api/gear"
        keywords={[
          'ai gear',
          'local llm hardware',
          'gpu catalog',
          'ar glasses',
          'edge accelerators',
          'robotics hardware',
          'consumer ai hardware',
        ]}
        license="CC-BY-4.0"
      />

      <GearHero stats={stats} />

      <section className="gear-section" style={{ paddingTop: 16, paddingBottom: 0 }}>
        <div className="container">
          <MachineReadableLink endpoint="/api/gear" className="mt-2" />
        </div>
      </section>

      <section className="gear-section" id="spotlight" style={{ paddingTop: 40 }}>
        <div className="container">
          <div className="gear-section-head">
            <div>
              <div className="h-eyebrow">
                <span className="bar" aria-hidden="true" /> 01 / SPOTLIGHT
              </div>
              <h2>This Month&apos;s Pick</h2>
            </div>
            <div className="h-sub">
              Updated <strong>weekly</strong> &middot; based on tested workloads
            </div>
          </div>
          <Spotlight spotlight={SPOTLIGHT} />
        </div>
      </section>

      <GearInteractive categories={categories} products={PRODUCTS} />

      <section className="gear-section" style={{ paddingTop: 0 }}>
        <div className="container">
          <CompareStrip />
        </div>
      </section>
    </main>
  );
}
