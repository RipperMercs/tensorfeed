import type { Metadata } from 'next';
import NlpProceedingsClient from './NlpProceedingsClient';
import { DatasetJsonLd } from '@/components/seo/JsonLd';
import MachineReadableLink from '@/components/MachineReadableLink';

export const metadata: Metadata = {
  title: 'Recent NLP Conference Papers: ACL, EMNLP, NAACL | TensorFeed',
  description:
    'Recent papers from the current ACL, EMNLP, and NAACL proceedings via the ACL Anthology. Titles, authors, clipped abstracts, and a link to each paper on the Anthology.',
  alternates: { canonical: 'https://tensorfeed.ai/research/nlp-proceedings' },
  openGraph: {
    title: 'Recent NLP Conference Papers | TensorFeed',
    description: 'Recent ACL, EMNLP, and NAACL papers via the ACL Anthology.',
    url: 'https://tensorfeed.ai/research/nlp-proceedings',
    type: 'website',
  },
};

const JSONLD = {
  '@context': 'https://schema.org',
  '@type': 'CollectionPage',
  name: 'Recent NLP Conference Papers',
  description: 'Recent papers from the current ACL, EMNLP, and NAACL proceedings via the ACL Anthology.',
  url: 'https://tensorfeed.ai/research/nlp-proceedings',
  isPartOf: { '@type': 'WebSite', name: 'TensorFeed.ai', url: 'https://tensorfeed.ai' },
  about: ['Natural language processing', 'Computational linguistics', 'ACL', 'EMNLP', 'NAACL'],
  creator: { '@type': 'Organization', name: 'TensorFeed.ai', url: 'https://tensorfeed.ai' },
};

export default function NlpProceedingsPage() {
  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(JSONLD) }} />
      <DatasetJsonLd
        name="Recent NLP Conference Papers"
        description="Recent papers from the current ACL, EMNLP, and NAACL proceedings via the ACL Anthology. Each record carries the title, authors, a clipped abstract, the venue group, and a link to the full paper on the Anthology. A bounded per-venue sample, refreshed daily."
        url="https://tensorfeed.ai/research/nlp-proceedings"
        jsonUrl="/api/research/nlp-proceedings"
        keywords={[
          'nlp proceedings',
          'acl anthology',
          'emnlp papers',
          'naacl papers',
          'computational linguistics',
          'natural language processing',
          'conference papers',
        ]}
      />
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-6">
        <MachineReadableLink endpoint="/api/research/nlp-proceedings" className="mt-2" />
      </div>
      <NlpProceedingsClient />
    </>
  );
}
