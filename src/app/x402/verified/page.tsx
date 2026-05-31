import { Metadata } from 'next';
import Link from 'next/link';
import { ShieldCheck, ArrowRight, ExternalLink } from 'lucide-react';
import JsonLd, { BreadcrumbListJsonLd } from '@/components/seo/JsonLd';
import VerifiedDirectory from './VerifiedDirectory';

const TITLE = 'x402 Verified Directory: Which x402 Publishers Actually Settle on Base';
const DESCRIPTION =
  'TensorFeed verifies which curated x402 publishers have observed on-chain USDC settlements on Base mainnet. A directory grounded in chain data: verified-settling publishers ranked by activity and volume, plus an honest list of publishers with no settlement observed yet. Refreshed live from the TensorFeed x402 index.';
const URL = 'https://tensorfeed.ai/x402/verified';

export const metadata: Metadata = {
  title: TITLE,
  description: DESCRIPTION,
  alternates: { canonical: URL },
  openGraph: {
    type: 'website',
    url: URL,
    title: TITLE,
    description:
      'A directory grounded in chain data. TensorFeed verifies which curated x402 publishers have observed on-chain USDC settlements on Base mainnet, ranked by activity and volume.',
    siteName: 'TensorFeed.ai',
    images: [{ url: '/tensorfeed-logo.png', width: 1024, height: 1024 }],
  },
  twitter: {
    card: 'summary_large_image',
    title: TITLE,
    description:
      'TensorFeed verifies which curated x402 publishers actually settle USDC on Base. Verified-settling publishers ranked by activity and volume, refreshed live.',
  },
  keywords: [
    'x402 verified',
    'x402 directory',
    'x402 publishers',
    'x402 settlement',
    'verified x402',
    'USDC on Base',
    'on-chain settlement',
    'agent payments',
    'x402 index',
    'TensorFeed x402',
  ],
};

const BREADCRUMBS = [
  { name: 'Home', url: 'https://tensorfeed.ai' },
  { name: 'x402', url: 'https://tensorfeed.ai/x402' },
  { name: 'Verified Directory', url: URL },
];

const DATASET_JSONLD = {
  '@context': 'https://schema.org',
  '@type': 'Dataset',
  name: 'x402 Verified Publisher Directory',
  description:
    'Curated x402 publishers labeled by whether they have observed on-chain USDC settlements on Base mainnet tied to their declared manifest wallet. Verified-settling publishers carry settlement counts, USDC volume, and last-settled timestamps. Refreshed on a cron from the TensorFeed x402 settlement index.',
  url: URL,
  license: 'https://tensorfeed.ai/about',
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
      contentUrl: 'https://tensorfeed.ai/api/x402-index/verified',
    },
  ],
  measurementTechnique:
    'On-chain observation of USDC settlements on Base mainnet matched against wallets declared in each publisher x402 manifest.',
};

export default function X402VerifiedPage() {
  return (
    <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <JsonLd data={DATASET_JSONLD} />
      <BreadcrumbListJsonLd items={BREADCRUMBS} />

      {/* Hero */}
      <header className="mb-10">
        <div className="flex items-center gap-3 mb-3">
          <div className="p-2 rounded-lg bg-accent-primary/10">
            <ShieldCheck className="w-7 h-7 text-accent-primary" />
          </div>
          <div className="flex flex-col sm:flex-row sm:items-baseline sm:gap-3">
            <h1 className="text-3xl sm:text-4xl font-bold text-text-primary">
              x402 Verified Directory
            </h1>
            <span className="text-sm font-mono uppercase tracking-wider text-text-muted">
              grounded in chain data
            </span>
          </div>
        </div>
        <p className="text-text-secondary text-lg max-w-3xl leading-relaxed">
          TensorFeed verifies which curated x402 publishers have observed on-chain USDC settlements
          on Base mainnet. Each verified entry is backed by a real settlement on a wallet the
          publisher declared in its own manifest, so the label is provable from chain data, not
          self-reported. Ranked by recent activity and volume, refreshed live.
        </p>

        <div className="mt-5 flex flex-wrap items-center gap-2 text-sm">
          <Link
            href="/x402"
            className="px-3 py-1.5 rounded bg-bg-tertiary text-accent-primary hover:underline inline-flex items-center gap-1"
          >
            x402 settlement index hub
            <ArrowRight className="w-3 h-3" />
          </Link>
          <a
            href="https://tensorfeed.ai/api/x402-index/verified"
            target="_blank"
            rel="noopener noreferrer"
            className="px-3 py-1.5 rounded bg-bg-tertiary text-accent-primary hover:underline font-mono inline-flex items-center gap-1"
          >
            /api/x402-index/verified
            <ExternalLink className="w-3 h-3" />
          </a>
          <Link
            href="/x402-adopters"
            className="px-3 py-1.5 rounded bg-bg-tertiary text-accent-primary hover:underline"
          >
            full adopter directory
          </Link>
        </div>
      </header>

      {/* Live directory */}
      <VerifiedDirectory />

      {/* For agents footer */}
      <section className="mt-12 bg-bg-secondary border border-border rounded-lg p-5">
        <div className="flex items-start gap-3">
          <ShieldCheck className="w-5 h-5 text-accent-primary shrink-0 mt-0.5" />
          <div className="text-sm text-text-secondary leading-relaxed">
            <strong className="text-text-primary">For agents:</strong> the machine-readable feed
            lives at{' '}
            <a
              href="https://tensorfeed.ai/api/x402-index/verified"
              target="_blank"
              rel="noopener noreferrer"
              className="text-accent-primary hover:underline font-mono"
            >
              /api/x402-index/verified
            </a>
            . Free, no auth. Each publisher carries its status, settlement count, USDC volume,
            declared pay-to wallets, and manifest URL, so an agent can route to a counterparty whose
            settlement history is verifiable on chain.
          </div>
        </div>
      </section>
    </div>
  );
}
