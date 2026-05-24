import type { Metadata } from 'next';
import Link from 'next/link';
import { ArrowLeft } from 'lucide-react';
import { BreadcrumbListJsonLd } from '@/components/seo/JsonLd';

export const metadata: Metadata = {
  title: 'Affiliate policy and methodology',
  description:
    'How TensorFeed picks the products on /gear, how Amazon Associates commissions work, and how to send a correction. Plain-language affiliate disclosure.',
  alternates: { canonical: 'https://tensorfeed.ai/gear/policy' },
  openGraph: {
    type: 'website',
    siteName: 'TensorFeed',
    title: 'AI Gear policy · TensorFeed',
    description:
      'Affiliate disclosure, editorial methodology, and contact for the TensorFeed /gear hub.',
    url: 'https://tensorfeed.ai/gear/policy',
  },
  twitter: { card: 'summary' },
};

export default function GearPolicyPage() {
  return (
    <main className="gear-main">
      <BreadcrumbListJsonLd
        items={[
          { name: 'TensorFeed', url: 'https://tensorfeed.ai/' },
          { name: 'AI Gear', url: 'https://tensorfeed.ai/gear' },
          { name: 'Policy', url: 'https://tensorfeed.ai/gear/policy' },
        ]}
      />

      <div className="container" style={{ maxWidth: 720, padding: '48px 24px 64px' }}>
        <Link
          href="/gear"
          className="gear-eyebrow"
          style={{ textDecoration: 'none' }}
        >
          <ArrowLeft className="w-4 h-4" />
          <span>BACK TO GEAR</span>
        </Link>

        <h1 className="gear-title" style={{ fontSize: 'clamp(36px, 4vw, 56px)', marginTop: 18 }} aria-label="Gear policy">
          Policy
        </h1>
        <p className="gear-lede" style={{ marginBottom: 32 }}>
          How the TensorFeed Gear hub picks products, how the commerce side
          works, and how to flag anything that reads off. Effective May 23,
          2026.
        </p>

        <section style={{ marginBottom: 32 }}>
          <h2 style={{ fontSize: 20, fontWeight: 700, marginBottom: 10, color: 'var(--text-primary)' }}>
            What is /gear
          </h2>
          <p style={{ fontSize: 15, color: 'var(--text-secondary)', lineHeight: 1.6 }}>
            /gear is a hand-curated catalog of AI-relevant consumer hardware:
            laptops capable of running local language models, discrete GPUs for
            self-built rigs, AR glasses, robotics, edge AI accelerators, AI
            peripherals, and the occasional experimental device worth knowing
            about. The catalog is small on purpose. We would rather list 30
            things we vouch for than 300 things that pad search results.
          </p>
        </section>

        <section style={{ marginBottom: 32 }}>
          <h2 style={{ fontSize: 20, fontWeight: 700, marginBottom: 10, color: 'var(--text-primary)' }}>
            Affiliate disclosure
          </h2>
          <p style={{ fontSize: 15, color: 'var(--text-secondary)', lineHeight: 1.6 }}>
            TensorFeed.ai participates in the Amazon Associates Program, an
            affiliate advertising program designed to provide a means for sites
            to earn fees by linking to Amazon.com and affiliated sites. When you
            click an amber &ldquo;View on Amazon&rdquo; button on /gear and then
            make a qualifying purchase, TensorFeed earns a small commission at
            no extra cost to you. The price you pay is identical whether or not
            you use our link.
          </p>
          <p style={{ fontSize: 15, color: 'var(--text-secondary)', lineHeight: 1.6, marginTop: 12 }}>
            Cyan &ldquo;Visit&rdquo; buttons are non-affiliate links to a
            manufacturer or non-Amazon retailer. We earn nothing on those clicks.
            The amber / cyan distinction is the user-legible signal of
            &ldquo;we earn vs we do not earn&rdquo; on each product.
          </p>
          <p style={{ fontSize: 15, color: 'var(--text-secondary)', lineHeight: 1.6, marginTop: 12 }}>
            Affiliate links carry{' '}
            <code style={{ fontFamily: 'var(--font-mono)', fontSize: 12.5, color: 'var(--accent-cyan)' }}>
              rel=&quot;sponsored noopener noreferrer&quot;
            </code>{' '}
            per Google&apos;s documented signal for monetized links.
            Non-affiliate links carry{' '}
            <code style={{ fontFamily: 'var(--font-mono)', fontSize: 12.5, color: 'var(--accent-cyan)' }}>
              rel=&quot;noopener noreferrer&quot;
            </code>{' '}
            without the sponsored tag.
          </p>
        </section>

        <section style={{ marginBottom: 32 }}>
          <h2 style={{ fontSize: 20, fontWeight: 700, marginBottom: 10, color: 'var(--text-primary)' }}>
            How products get picked
          </h2>
          <p style={{ fontSize: 15, color: 'var(--text-secondary)', lineHeight: 1.6 }}>
            Picks are made first, the commerce arrangement comes after. The
            order of operations is:
          </p>
          <ol style={{ fontSize: 15, color: 'var(--text-secondary)', lineHeight: 1.7, paddingLeft: 24, marginTop: 8 }}>
            <li>An editor identifies a product worth covering for an AI use case (local LLM workstation, agent-friendly peripheral, robotics dev kit, etc.).</li>
            <li>The product is researched, specs verified against the manufacturer page, and an editorial blurb plus AI use line are written.</li>
            <li>If the product happens to be available on Amazon, the CTA uses an Amazon Associates link. If not, the CTA links directly to the manufacturer.</li>
            <li>Pricing is refreshed weekly. Prices on the cards may lag street prices by a few days; the price note records the source.</li>
          </ol>
          <p style={{ fontSize: 15, color: 'var(--text-secondary)', lineHeight: 1.6, marginTop: 12 }}>
            Affiliate availability does not change which products we cover. A
            product is either worth covering or it is not.
          </p>
        </section>

        <section style={{ marginBottom: 32 }}>
          <h2 style={{ fontSize: 20, fontWeight: 700, marginBottom: 10, color: 'var(--text-primary)' }}>
            Amazon Associates Operating Agreement notes
          </h2>
          <ul style={{ fontSize: 15, color: 'var(--text-secondary)', lineHeight: 1.7, paddingLeft: 24 }}>
            <li>Amazon is named in the disclosure above the fold on every /gear page.</li>
            <li>The amber CTA reads &ldquo;View on Amazon&rdquo;, never &ldquo;Buy now&rdquo;. Amazon prohibits implying the click is the purchase.</li>
            <li>Prices on the cards include the date or source they were sampled from. They are not real-time.</li>
            <li>The Associates tracking ID is sourced from a build-time environment variable, not hard-coded into any data file.</li>
            <li>Amazon product imagery, when used, is sourced through the Amazon Product API. We do not use the Amazon logo in a way that implies endorsement.</li>
          </ul>
        </section>

        <section style={{ marginBottom: 32 }}>
          <h2 style={{ fontSize: 20, fontWeight: 700, marginBottom: 10, color: 'var(--text-primary)' }}>
            Corrections and suggestions
          </h2>
          <p style={{ fontSize: 15, color: 'var(--text-secondary)', lineHeight: 1.6 }}>
            Something on the cards reads off? Want to suggest a product? Email{' '}
            <a
              href="mailto:gear@tensorfeed.ai"
              style={{ color: 'var(--accent-cyan)', textDecoration: 'underline' }}
            >
              gear@tensorfeed.ai
            </a>
            . We log every suggestion. We do not log who sent it past the
            address you emailed from.
          </p>
        </section>

        <section style={{ marginBottom: 32 }}>
          <h2 style={{ fontSize: 20, fontWeight: 700, marginBottom: 10, color: 'var(--text-primary)' }}>
            About TensorFeed
          </h2>
          <p style={{ fontSize: 15, color: 'var(--text-secondary)', lineHeight: 1.6 }}>
            TensorFeed.ai is an AI ecosystem hub run by Pizza Robot Studios.
            We publish original editorial at{' '}
            <Link href="/originals" style={{ color: 'var(--accent-cyan)', textDecoration: 'underline' }}>
              /originals
            </Link>
            , track AI models and pricing at{' '}
            <Link href="/models" style={{ color: 'var(--accent-cyan)', textDecoration: 'underline' }}>
              /models
            </Link>
            , and curate AI-relevant consumer hardware at{' '}
            <Link href="/gear" style={{ color: 'var(--accent-cyan)', textDecoration: 'underline' }}>
              /gear
            </Link>
            .
          </p>
        </section>
      </div>
    </main>
  );
}
