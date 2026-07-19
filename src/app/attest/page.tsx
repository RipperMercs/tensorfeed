import { Metadata } from 'next';
import { Suspense } from 'react';
import AttestClient from './AttestClient';

export const metadata: Metadata = {
  title: 'Data Attestations: Verify a TensorFeed Signed Citation',
  description:
    'Verify a TensorFeed data attestation: an Ed25519-signed record of a premium API response, stored by the paying agent as a third-party-checkable citation. Paste or open an attestation id to check it.',
  openGraph: {
    type: 'website',
    url: 'https://tensorfeed.ai/attest',
    title: 'TensorFeed Data Attestations',
    description:
      'Cryptographically verify what an AI agent was told, by whom, and when. Attestations are signed receipts for premium API data, checkable by anyone.',
    siteName: 'TensorFeed.ai',
  },
  alternates: { canonical: 'https://tensorfeed.ai/attest' },
};

const jsonLd = {
  '@context': 'https://schema.org',
  '@type': 'WebPage',
  name: 'TensorFeed Data Attestations',
  url: 'https://tensorfeed.ai/attest',
  description:
    'Verification surface for TensorFeed data attestations: Ed25519-signed records of premium API responses that AI agents store as third-party-checkable citations.',
  isPartOf: { '@type': 'WebSite', name: 'TensorFeed.ai', url: 'https://tensorfeed.ai' },
};

export default function AttestPage() {
  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />
      <Suspense fallback={<div className="max-w-3xl mx-auto px-4 py-12 text-text-secondary">Loading attestation viewer...</div>}>
        <AttestClient />
      </Suspense>
    </>
  );
}
