import { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'AI Timeline | Major Milestones & Model Releases',
  description:
    'Chronological timeline of AI model releases, industry milestones, and major events from 2024 to present.',
  openGraph: {
    type: 'website',
    url: 'https://tensorfeed.ai/timeline',
    title: 'AI Timeline | Major Milestones & Model Releases',
    description:
      'Chronological timeline of AI model releases, industry milestones, and major events from 2024 to present.',
    siteName: 'TensorFeed.ai',
    images: [{ url: '/tensorfeed-logo.png', width: 1024, height: 1024 }],
  },
  twitter: {
    card: 'summary',
    title: 'AI Timeline | Major Milestones & Model Releases',
    description:
      'Chronological timeline of AI model releases, industry milestones, and major events from 2024 to present.',
  },
};

export default function TimelineLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
