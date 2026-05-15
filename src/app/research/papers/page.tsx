import type { Metadata } from 'next';
import PapersClient from './PapersClient';

export const metadata: Metadata = {
  title: 'Latest AI Research Papers (arXiv) | TensorFeed',
  description:
    'Live feed of the last 24 hours of AI research papers from arXiv, captured every day at 11:30 UTC. Filterable by primary category. Free and agent-readable.',
  alternates: { canonical: 'https://tensorfeed.ai/research/papers' },
  openGraph: {
    title: 'Latest AI Research Papers (arXiv) | TensorFeed',
    description: 'Live feed of the last 24 hours of AI research papers from arXiv.',
    url: 'https://tensorfeed.ai/research/papers',
    type: 'website',
  },
};

export default function ResearchPapersPage() {
  return <PapersClient />;
}
