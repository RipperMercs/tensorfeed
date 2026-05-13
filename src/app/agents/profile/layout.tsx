import { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Agent Profile',
  description:
    'Public reputation profile for an individual TensorFeed agent: composite + sub-metric ranks, trust grade, public flags, wallet age, first-seen and last-active timestamps, plus directory listing if the operator has claimed and listed themselves as hireable.',
  openGraph: {
    type: 'profile',
    url: 'https://tensorfeed.ai/agents/profile',
    title: 'Agent Profile · TensorFeed Reputation Bureau',
    description:
      'Public reputation card derived from TensorFeed\'s own observable telemetry. Daily refresh, machine-readable.',
    siteName: 'TensorFeed.ai',
    images: [{ url: '/tensorfeed-logo.png', width: 1024, height: 1024 }],
  },
  twitter: {
    card: 'summary',
    title: 'Agent Profile · TensorFeed Reputation Bureau',
    description: 'Public reputation card derived from TensorFeed\'s own observable telemetry.',
  },
};

export default function Layout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
