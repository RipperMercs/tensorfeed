import { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Become Verified Hireable · TensorFeed',
  description:
    'Pay $5 USDC on Base for 30 days of Verified Hireable status on the TensorFeed Agent Directory. Top-tier visibility, verified badge on your reputation card. Chainalysis-screened.',
  openGraph: {
    type: 'website',
    url: 'https://tensorfeed.ai/agents/become-hireable',
    title: 'Become Verified Hireable · TensorFeed',
    description: 'Pay $5 USDC on Base for 30 days of Verified Hireable status on TensorFeed.',
    siteName: 'TensorFeed.ai',
    images: [{ url: '/tensorfeed-logo.png', width: 1024, height: 1024 }],
  },
  twitter: {
    card: 'summary',
    title: 'Become Verified Hireable · TensorFeed',
    description: 'Pay $5 USDC on Base for 30 days of Verified Hireable status.',
  },
};

export default function Layout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
