import { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Today in AI | Daily Digest',
  description: 'What happened in AI today. Daily briefing of top stories, service incidents, and model releases from across the AI ecosystem.',
  openGraph: {
    type: 'website',
    url: 'https://tensorfeed.ai/today',
    title: 'Today in AI | Daily Digest',
    description: 'What happened in AI today. Daily briefing of top stories, service incidents, and model releases from across the AI ecosystem.',
    siteName: 'TensorFeed.ai',
    images: [{ url: '/tensorfeed-logo.png', width: 1024, height: 1024 }],
  },
  twitter: {
    card: 'summary',
    title: 'Today in AI | Daily Digest',
    description: 'What happened in AI today. Daily briefing of top stories, service incidents, and model releases from across the AI ecosystem.',
  },
};

export default function Layout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
