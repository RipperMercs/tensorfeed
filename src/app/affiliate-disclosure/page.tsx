import type { Metadata } from 'next';
import Link from 'next/link';
import { ArrowLeft, Info } from 'lucide-react';
import { BreadcrumbListJsonLd } from '@/components/seo/JsonLd';

export const metadata: Metadata = {
  title: 'Affiliate Disclosure',
  description:
    'TensorFeed earns a commission from qualifying Amazon purchases on the /gear page. Non-Amazon products are listed without affiliate links. Full disclosure.',
  alternates: { canonical: 'https://tensorfeed.ai/affiliate-disclosure' },
  openGraph: {
    title: 'Affiliate Disclosure on TensorFeed',
    description:
      'TensorFeed earns commission from qualifying Amazon purchases on /gear. Non-Amazon products are listed without affiliate links.',
    url: 'https://tensorfeed.ai/affiliate-disclosure',
    type: 'website',
    siteName: 'TensorFeed.ai',
  },
  twitter: {
    card: 'summary',
    title: 'Affiliate Disclosure on TensorFeed',
    description: 'How TensorFeed monetizes the /gear page.',
  },
};

export default function AffiliateDisclosurePage() {
  return (
    <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
      <BreadcrumbListJsonLd
        items={[
          { name: 'Home', url: 'https://tensorfeed.ai' },
          { name: 'Affiliate Disclosure', url: 'https://tensorfeed.ai/affiliate-disclosure' },
        ]}
      />

      <Link
        href="/gear"
        className="inline-flex items-center gap-2 text-sm text-text-secondary hover:text-text-primary transition-colors mb-6"
      >
        <ArrowLeft className="w-4 h-4" />
        Back to Gear
      </Link>

      <header className="mb-8">
        <div className="flex items-center gap-3 mb-3">
          <div className="p-2 rounded-lg bg-accent-primary/10">
            <Info className="w-7 h-7 text-accent-primary" />
          </div>
          <h1 className="text-3xl sm:text-4xl font-bold text-text-primary">
            Affiliate Disclosure
          </h1>
        </div>
        <p className="text-text-muted text-sm">
          Effective May 23, 2026.
        </p>
      </header>

      <div className="prose-custom space-y-6 text-text-secondary leading-relaxed">
        <p className="text-base sm:text-lg text-text-primary leading-relaxed">
          TensorFeed.ai participates in the Amazon Associates Program, an
          affiliate advertising program designed to provide a means for sites
          to earn fees by linking to Amazon.com and affiliated sites.
        </p>

        <h2 className="text-xl font-semibold text-text-primary pt-2">
          What this means in practice
        </h2>
        <p>
          When you click on certain product links on our{' '}
          <Link
            href="/gear"
            className="text-accent-primary hover:text-accent-cyan transition-colors underline underline-offset-2"
          >
            /gear
          </Link>{' '}
          page and then make a qualifying purchase on Amazon.com, TensorFeed
          earns a small commission at no extra cost to you. The price you pay
          is identical whether or not you use our link.
        </p>
        <p>
          Not every product on /gear is an affiliate link. Products from
          manufacturers and retailers outside Amazon are linked directly to the
          vendor with no affiliate relationship and no commission. We list
          those products because they are genuinely interesting, not because
          they pay us anything.
        </p>

        <h2 className="text-xl font-semibold text-text-primary pt-2">
          How affiliate revenue affects what we recommend
        </h2>
        <p>
          It does not. We pick the products on /gear because we think they are
          the right answer for a specific AI workload (running local language
          models, building agent UIs, self-hosted inference, on-device
          multimodal work, and so on). When the right product happens to be on
          Amazon, we use an affiliate link. When the right product is sold
          directly by the manufacturer or by a non-Amazon retailer, we link
          there without one.
        </p>
        <p>
          If a product is mediocre, we do not list it just because the
          affiliate payout is attractive. The /gear catalog is small on
          purpose. We would rather list 30 things we vouch for than 300 things
          that pad search results.
        </p>

        <h2 className="text-xl font-semibold text-text-primary pt-2">
          Identifying affiliate links
        </h2>
        <p>
          Affiliate links on TensorFeed are tagged with{' '}
          <code className="text-xs font-mono bg-bg-secondary px-1.5 py-0.5 rounded border border-border-primary/40">
            rel=&quot;sponsored nofollow noopener&quot;
          </code>
          , which is the signal search engines use to identify monetized
          outbound links. Non-affiliate vendor links use{' '}
          <code className="text-xs font-mono bg-bg-secondary px-1.5 py-0.5 rounded border border-border-primary/40">
            rel=&quot;nofollow noopener&quot;
          </code>{' '}
          without the sponsored tag.
        </p>

        <h2 className="text-xl font-semibold text-text-primary pt-2">
          About TensorFeed
        </h2>
        <p>
          TensorFeed.ai is an AI ecosystem hub run by Pizza Robot Studios. We
          publish original editorial under{' '}
          <Link
            href="/originals"
            className="text-accent-primary hover:text-accent-cyan transition-colors underline underline-offset-2"
          >
            /originals
          </Link>
          , track AI models and pricing at{' '}
          <Link
            href="/models"
            className="text-accent-primary hover:text-accent-cyan transition-colors underline underline-offset-2"
          >
            /models
          </Link>
          , and now curate AI-relevant consumer hardware at{' '}
          <Link
            href="/gear"
            className="text-accent-primary hover:text-accent-cyan transition-colors underline underline-offset-2"
          >
            /gear
          </Link>
          .
        </p>
        <p>
          Questions about how we make money or what we recommend? Email{' '}
          <a
            href="mailto:evan@tensorfeed.ai"
            className="text-accent-primary hover:text-accent-cyan transition-colors underline underline-offset-2"
          >
            evan@tensorfeed.ai
          </a>
          .
        </p>
      </div>
    </div>
  );
}
