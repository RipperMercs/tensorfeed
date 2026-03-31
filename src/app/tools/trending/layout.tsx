import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Trending AI Repos | TensorFeed.ai',
  description: 'Discover the hottest new AI repositories on GitHub. Updated daily with repos gaining traction in LLMs, agents, machine learning, and more.',
  openGraph: {
    title: 'Trending AI Repos | TensorFeed.ai',
    description: 'Discover the hottest new AI repositories on GitHub. Updated daily.',
    url: 'https://tensorfeed.ai/tools/trending',
    siteName: 'TensorFeed.ai',
  },
  alternates: {
    canonical: 'https://tensorfeed.ai/tools/trending',
  },
};

export default function TrendingLayout({ children }: { children: React.ReactNode }) {
  return children;
}
