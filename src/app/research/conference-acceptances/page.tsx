import type { Metadata } from 'next';
import ConferenceAcceptancesClient from './ConferenceAcceptancesClient';
import { DatasetJsonLd } from '@/components/seo/JsonLd';
import MachineReadableLink from '@/components/MachineReadableLink';

export const metadata: Metadata = {
  title: 'Top AI Conference Acceptances: ICLR, NeurIPS, ICML | TensorFeed',
  description:
    'Notable-tier (Oral and Spotlight) accepted papers from the top machine-learning conferences (ICLR, NeurIPS, ICML), sourced from OpenReview. Decision tier, primary area, authors, and a link to each paper on OpenReview.',
  alternates: { canonical: 'https://tensorfeed.ai/research/conference-acceptances' },
  openGraph: {
    title: 'Top AI Conference Acceptances | TensorFeed',
    description: 'Oral and Spotlight papers from ICLR, NeurIPS, and ICML via OpenReview.',
    url: 'https://tensorfeed.ai/research/conference-acceptances',
    type: 'website',
  },
};

const JSONLD = {
  '@context': 'https://schema.org',
  '@type': 'CollectionPage',
  name: 'Top AI Conference Acceptances',
  description:
    'Notable-tier (Oral and Spotlight) accepted papers from top machine-learning conferences (ICLR, NeurIPS, ICML), sourced from OpenReview public metadata.',
  url: 'https://tensorfeed.ai/research/conference-acceptances',
  isPartOf: { '@type': 'WebSite', name: 'TensorFeed.ai', url: 'https://tensorfeed.ai' },
  about: ['Machine learning research', 'AI conference papers', 'ICLR', 'NeurIPS', 'ICML'],
  creator: { '@type': 'Organization', name: 'TensorFeed.ai', url: 'https://tensorfeed.ai' },
};

export default function ConferenceAcceptancesPage() {
  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(JSONLD) }} />
      <DatasetJsonLd
        name="Top AI Conference Acceptances"
        description="Notable-tier (Oral and Spotlight) accepted papers from top machine-learning conferences (ICLR, NeurIPS, ICML), sourced from OpenReview public submission metadata. Includes decision tier, primary area, authors, a clipped abstract, and a link to each paper on OpenReview."
        url="https://tensorfeed.ai/research/conference-acceptances"
        jsonUrl="/api/research/conference-acceptances"
        keywords={['ai conference acceptances', 'iclr papers', 'neurips papers', 'icml papers', 'oral and spotlight papers', 'openreview metadata', 'machine learning research']}
      />
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-6">
        <MachineReadableLink endpoint="/api/research/conference-acceptances" className="mt-2" />
      </div>
      <ConferenceAcceptancesClient />
    </>
  );
}
