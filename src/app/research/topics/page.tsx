import type { Metadata } from 'next';
import TopicsClient from './TopicsClient';

export const metadata: Metadata = {
  title: 'Emerging AI Research Topics | TensorFeed',
  description:
    'Top multi-word keyphrases across recent arXiv AI abstracts ranked by recent-vs-baseline lift. Captures emerging research terminology before it shows up in citation counts. Refreshed weekly from the TensorFeed extraction pipeline.',
  alternates: { canonical: 'https://tensorfeed.ai/research/topics' },
  openGraph: {
    title: 'Emerging AI Research Topics | TensorFeed',
    description: 'Top emerging keyphrases across recent arXiv AI abstracts.',
    url: 'https://tensorfeed.ai/research/topics',
    type: 'website',
  },
};

export default function TopicsPage() {
  return <TopicsClient />;
}
