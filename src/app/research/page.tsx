import type { Metadata } from 'next';
import ResearchHubClient from './ResearchHubClient';

export const metadata: Metadata = {
  title: 'AI Research Hub | TensorFeed',
  description:
    'Daily AI research signal: milestone papers, top AI authors leaderboard, citation velocity leaders, emerging keywords, latest arXiv. Powered by TensorFeed extraction pipeline.',
  alternates: { canonical: 'https://tensorfeed.ai/research' },
  openGraph: {
    title: 'AI Research Hub | TensorFeed',
    description:
      'Daily AI research signal: milestone papers, top AI authors leaderboard, citation velocity leaders, emerging keywords, latest arXiv.',
    url: 'https://tensorfeed.ai/research',
    type: 'website',
  },
};

export default function ResearchPage() {
  return <ResearchHubClient />;
}
