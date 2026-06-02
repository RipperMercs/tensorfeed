import { Metadata } from 'next';
import Link from 'next/link';
import { Landmark, ArrowRight, ExternalLink, Banknote } from 'lucide-react';
import JsonLd, { BreadcrumbListJsonLd, DatasetJsonLd } from '@/components/seo/JsonLd';
import MachineReadableLink from '@/components/MachineReadableLink';
import FederalSpending from './FederalSpending';

const TITLE = 'Federal AI Spending: US Contract and Grant Awards to the AI Vendor Cohort';
const DESCRIPTION =
  'US federal contract and grant awards flowing to a curated AI vendor cohort, the public-money side of the AI map. Sourced from USAspending.gov (public domain under the DATA Act). Cohort totals, federal award leadership and concentration, top agencies, and recent awards, refreshed daily. Free JSON for agents. The public-money companion to the private-capital funding portfolio.';
const URL = 'https://tensorfeed.ai/funding/federal';

export const metadata: Metadata = {
  title: TITLE,
  description: DESCRIPTION,
  alternates: { canonical: URL },
  openGraph: {
    type: 'website',
    url: URL,
    title: TITLE,
    description:
      'The public-money side of the AI map. US federal contract and grant awards to a curated AI vendor cohort, from USAspending.gov, with cohort totals, federal award leadership and concentration, and top agencies. Refreshed daily.',
    siteName: 'TensorFeed.ai',
    images: [{ url: '/tensorfeed-logo.png', width: 1024, height: 1024 }],
  },
  twitter: {
    card: 'summary_large_image',
    title: TITLE,
    description:
      'US federal contract and grant awards to a curated AI vendor cohort, from USAspending.gov. Cohort totals, federal award leadership and concentration, top agencies, refreshed daily. Free JSON.',
  },
  keywords: [
    'federal AI spending',
    'AI government contracts',
    'USAspending AI',
    'defense AI contracts',
    'Palantir federal awards',
    'Anduril contracts',
    'AI vendor cohort',
    'federal grants AI',
    'public money AI',
    'TensorFeed funding',
  ],
};

const BREADCRUMBS = [
  { name: 'Home', url: 'https://tensorfeed.ai' },
  { name: 'Funding', url: 'https://tensorfeed.ai/funding' },
  { name: 'Federal AI Spending', url: URL },
];

const DATASET_JSONLD = {
  '@context': 'https://schema.org',
  '@type': 'Dataset',
  name: 'Federal AI Spending: US Contract and Grant Awards to the AI Vendor Cohort',
  description:
    'US federal contract and grant awards flowing to a curated cohort of AI vendors (AI-native, defense-AI, frontier labs, silicon), aggregated from USAspending.gov. Each vendor carries total obligated dollars, award count, the date of its most recent award, and its top awarding agencies, supporting a federal award leadership and concentration read. Refreshed daily on a cron from the TensorFeed federal spending capture.',
  url: URL,
  license: 'https://www.usa.gov/government-works',
  isAccessibleForFree: true,
  creator: {
    '@type': 'Organization',
    name: 'TensorFeed.ai',
    url: 'https://tensorfeed.ai',
  },
  distribution: [
    {
      '@type': 'DataDownload',
      encodingFormat: 'application/json',
      contentUrl: 'https://tensorfeed.ai/api/funding/federal/summary',
    },
    {
      '@type': 'DataDownload',
      encodingFormat: 'application/json',
      contentUrl: 'https://tensorfeed.ai/api/funding/federal/recent',
    },
  ],
  measurementTechnique:
    'Daily query of the USAspending.gov Award Search API for contract and grant awards over a rolling 365-day window, matched against a curated AI vendor cohort, then aggregated into per-vendor and cohort-wide rollups.',
};

export default function FundingFederalPage() {
  return (
    <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <JsonLd data={DATASET_JSONLD} />
      <DatasetJsonLd
        name="Federal AI Spending: US Contract and Grant Awards to the AI Vendor Cohort"
        description="US federal contract and grant awards flowing to a curated AI vendor cohort, aggregated from USAspending.gov over a rolling 365-day window. Per-vendor obligated dollars, award counts, most recent award dates, top awarding agencies, cohort totals, and recent awards, refreshed daily. Free JSON for agents."
        url="https://tensorfeed.ai/funding/federal"
        jsonUrl="/api/funding/federal/summary"
        license="https://www.usa.gov/government-works"
        keywords={[
          'federal ai spending',
          'ai government contracts',
          'usaspending ai',
          'defense ai contracts',
          'ai vendor cohort',
          'federal grants ai',
          'public money ai',
        ]}
      />
      <BreadcrumbListJsonLd items={BREADCRUMBS} />

      {/* Hero */}
      <header className="mb-10">
        <div className="flex items-center gap-3 mb-3">
          <div className="p-2 rounded-lg bg-accent-primary/10">
            <Landmark className="w-7 h-7 text-accent-primary" />
          </div>
          <div className="flex flex-col sm:flex-row sm:items-baseline sm:gap-3">
            <h1 className="text-3xl sm:text-4xl font-bold text-text-primary">Federal AI Spending</h1>
            <span className="text-sm font-mono uppercase tracking-wider text-text-muted">
              the public-money side
            </span>
          </div>
        </div>
        <MachineReadableLink endpoint="/api/funding/federal/summary" className="mt-2" />
        <p className="text-text-secondary text-lg max-w-3xl leading-relaxed">
          US federal contract and grant awards flowing to a curated AI vendor cohort, the
          public-money side of the AI map. Where private capital tracks who is betting on whom, this
          tracks who the US government is actually paying: defense-AI primes, frontier labs, and the
          silicon underneath them. Cohort totals, federal award leadership and concentration, top
          awarding agencies, and the newest awards, refreshed daily.
        </p>

        {/* The pair: private capital and public money */}
        <div className="mt-6 bg-bg-secondary border border-border rounded-lg p-4 sm:p-5">
          <div className="flex items-start gap-3">
            <Banknote className="w-5 h-5 text-accent-primary shrink-0 mt-0.5" />
            <p className="text-sm text-text-secondary leading-relaxed">
              <strong className="text-text-primary">Read these as a pair.</strong> This page is the
              public-money companion to the{' '}
              <Link href="/funding/portfolio" className="text-accent-primary hover:underline">
                AI funding portfolio
              </Link>{' '}
              (private capital: disclosed equity stakes, compute commitments, and capacity
              partnerships tagged by silicon). Private dollars say who is positioning. Federal
              dollars say who is shipping for the government. Same cohort, two ledgers.
            </p>
          </div>
        </div>

        <div className="mt-5 flex flex-wrap items-center gap-2 text-sm">
          <Link
            href="/funding/portfolio"
            className="px-3 py-1.5 rounded bg-bg-tertiary text-accent-primary hover:underline inline-flex items-center gap-1"
          >
            private-capital portfolio
            <ArrowRight className="w-3 h-3" />
          </Link>
          <a
            href="https://tensorfeed.ai/api/funding/federal/summary"
            target="_blank"
            rel="noopener noreferrer"
            className="px-3 py-1.5 rounded bg-bg-tertiary text-accent-primary hover:underline font-mono inline-flex items-center gap-1"
          >
            /api/funding/federal/summary
            <ExternalLink className="w-3 h-3" />
          </a>
          <Link
            href="/ai-infrastructure"
            className="px-3 py-1.5 rounded bg-bg-tertiary text-accent-primary hover:underline"
          >
            infrastructure buildout
          </Link>
        </div>
      </header>

      {/* Live cohort */}
      <FederalSpending />

      {/* Source and license note */}
      <section className="mt-12 bg-bg-secondary border border-border rounded-lg p-5">
        <div className="flex items-start gap-3">
          <Landmark className="w-5 h-5 text-accent-primary shrink-0 mt-0.5" />
          <div className="text-sm text-text-secondary leading-relaxed">
            <strong className="text-text-primary">Source and license:</strong> award data comes from{' '}
            <a
              href="https://www.usaspending.gov"
              target="_blank"
              rel="noopener noreferrer"
              className="text-accent-primary hover:underline"
            >
              USAspending.gov
            </a>
            , the official US federal spending data source published under the DATA Act. Federal
            spending data is a US Government work in the public domain. The TensorFeed cohort
            selection, normalization, and leadership and concentration derivation are editorial. The
            machine-readable feed lives at{' '}
            <a
              href="https://tensorfeed.ai/api/funding/federal/summary"
              target="_blank"
              rel="noopener noreferrer"
              className="text-accent-primary hover:underline font-mono"
            >
              /api/funding/federal/summary
            </a>
            , free and no auth, so an agent can read cohort totals, per-vendor leadership and award
            recency, and recent awards directly. Absence of an award is not evidence of anything; it
            only means we observed none in the window.
          </div>
        </div>
      </section>
    </div>
  );
}
