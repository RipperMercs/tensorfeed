import { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Agent Reputation Leaderboard',
  description:
    'TensorFeed Agent Reputation Bureau public leaderboard. Composite + sub-metric ranks across reliability, spend, activity, and streak. Daily rebuild from TF\'s own observable telemetry. Free, machine-readable.',
  openGraph: {
    type: 'website',
    url: 'https://tensorfeed.ai/agents/leaderboard',
    title: 'Agent Reputation Leaderboard',
    description:
      'TensorFeed Agent Reputation Bureau. Composite + sub-metric ranks across reliability, spend, activity, and streak. Daily rebuild.',
    siteName: 'TensorFeed.ai',
    images: [{ url: '/tensorfeed-logo.png', width: 1024, height: 1024 }],
  },
  twitter: {
    card: 'summary',
    title: 'Agent Reputation Leaderboard',
    description: 'TensorFeed Agent Reputation Bureau ranks every agent that interacts with TF.',
  },
  alternates: { canonical: 'https://tensorfeed.ai/agents/leaderboard' },
};

export default function Layout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
