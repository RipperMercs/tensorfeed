import type { Metadata } from 'next';
import LabBlogsClient from './LabBlogsClient';

export const metadata: Metadata = {
  title: 'AI Research Blogs: DeepMind, Google Research, BAIR, MIT | TensorFeed',
  description:
    'Recent posts from the major AI lab and academic research blogs (Google DeepMind, Google Research, Berkeley BAIR, MIT News AI, Hugging Face), aggregated into one feed with links to each source.',
  alternates: { canonical: 'https://tensorfeed.ai/research/lab-blogs' },
  openGraph: {
    title: 'AI Research Blogs | TensorFeed',
    description: 'Recent posts from DeepMind, Google Research, BAIR, MIT, and Hugging Face.',
    url: 'https://tensorfeed.ai/research/lab-blogs',
    type: 'website',
  },
};

const JSONLD = {
  '@context': 'https://schema.org',
  '@type': 'CollectionPage',
  name: 'AI Research Blogs',
  description: 'Recent posts from major AI lab and academic research blogs, aggregated by TensorFeed.',
  url: 'https://tensorfeed.ai/research/lab-blogs',
  isPartOf: { '@type': 'WebSite', name: 'TensorFeed.ai', url: 'https://tensorfeed.ai' },
  about: ['AI research', 'Google DeepMind', 'Google Research', 'Berkeley BAIR', 'MIT'],
  creator: { '@type': 'Organization', name: 'TensorFeed.ai', url: 'https://tensorfeed.ai' },
};

export default function LabBlogsPage() {
  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(JSONLD) }} />
      <LabBlogsClient />
    </>
  );
}
