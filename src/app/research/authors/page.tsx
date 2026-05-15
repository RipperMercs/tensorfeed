import type { Metadata } from 'next';
import AuthorsClient from './AuthorsClient';

export const metadata: Metadata = {
  title: 'Top AI Researchers Leaderboard | TensorFeed',
  description:
    'Top 100 AI researchers by publication volume in the trailing 365 days. Includes h-index, citation count, primary affiliation, ORCID, and AI-publication share. Sourced from OpenAlex (CC0).',
  alternates: { canonical: 'https://tensorfeed.ai/research/authors' },
  openGraph: {
    title: 'Top AI Researchers Leaderboard | TensorFeed',
    description:
      'Top 100 AI researchers ranked by publication volume, h-index, and citation count.',
    url: 'https://tensorfeed.ai/research/authors',
    type: 'website',
  },
};

export default function AuthorsPage() {
  return <AuthorsClient />;
}
