import type { Metadata } from 'next';
import NlpProceedingsClient from './NlpProceedingsClient';

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
      <NlpProceedingsClient />
    </>
  );
}
