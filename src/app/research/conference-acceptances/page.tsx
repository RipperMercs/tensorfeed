import type { Metadata } from 'next';
import ConferenceAcceptancesClient from './ConferenceAcceptancesClient';
import { DatasetJsonLd } from '@/components/seo/JsonLd';
import MachineReadableLink from '@/components/MachineReadableLink';
import FeedStatusNotice from '@/components/research/FeedStatusNotice';

export const metadata: Metadata = {
  title: 'AI Conference Acceptances Archive: ICLR, NeurIPS, ICML | TensorFeed',
  description:
    'Archive of notable-tier (Oral and Spotlight) accepted papers from ICLR, NeurIPS and ICML through the 2025 season, sourced from OpenReview. No longer updating: OpenReview now blocks automated access. Decision tier, primary area, authors, and a link to each paper.',
  alternates: { canonical: 'https://tensorfeed.ai/research/conference-acceptances' },
  openGraph: {
    title: 'AI Conference Acceptances Archive | TensorFeed',
    description: 'Archived Oral and Spotlight papers from ICLR, NeurIPS and ICML through the 2025 season. No longer updating.',
    url: 'https://tensorfeed.ai/research/conference-acceptances',
    type: 'website',
  },
};

const JSONLD = {
  '@context': 'https://schema.org',
  '@type': 'CollectionPage',
  name: 'AI Conference Acceptances Archive (through the 2025 season)',
  description:
    'Archive of notable-tier (Oral and Spotlight) accepted papers from top machine-learning conferences (ICLR, NeurIPS, ICML) through the 2025 season, sourced from OpenReview public metadata. Frozen since June 2026 because OpenReview now blocks automated access.',
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
        name="AI Conference Acceptances Archive (through the 2025 season)"
        description="Archive of notable-tier (Oral and Spotlight) accepted papers from ICLR, NeurIPS and ICML through the 2025 season, sourced from OpenReview public submission metadata. Frozen since June 2026: OpenReview now returns an HTTP 403 challenge to automated queries. Includes decision tier, primary area, authors, a clipped abstract, and a link to each paper."
        url="https://tensorfeed.ai/research/conference-acceptances"
        jsonUrl="/api/research/conference-acceptances"
        keywords={['ai conference acceptances', 'iclr papers', 'neurips papers', 'icml papers', 'oral and spotlight papers', 'openreview metadata', 'machine learning research']}
      />
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-6">
        <MachineReadableLink endpoint="/api/research/conference-acceptances" className="mt-2" />
        {/* Frozen rather than withdrawn: these are genuine ICLR, NeurIPS and
            ICML Oral and Spotlight papers and stay citable for their seasons.
            They simply stopped updating when OpenReview put its API behind a
            challenge wall. The data still renders below. */}
        <div className="mt-6">
          <FeedStatusNotice
            status="frozen"
            title="This feed is no longer updating"
            reason="OpenReview now returns an HTTP 403 challenge on every automated query to its notes API, so TensorFeed can no longer pull new conference decisions. The papers below are real Oral and Spotlight acceptances and remain accurate for the seasons they cover, but nothing newer will appear and the venue list stops at the 2025 season."
            since="June 29, 2026"
            alternatives={[
              { href: '/research/nlp-proceedings', label: 'NLP Proceedings' },
              { href: '/research/papers', label: 'Latest Papers' },
            ]}
            apiPath="/api/research/conference-acceptances"
          />
        </div>
      </div>
      <ConferenceAcceptancesClient />
    </>
  );
}
