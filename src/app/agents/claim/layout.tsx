import { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Claim Your Wallet · TensorFeed Agent Reputation',
  description:
    'Sign an EIP-191 message to bind a wallet to your TensorFeed agent reputation. Verified operators get a display name + operator URL on every reputation card and badge. Free, no payment required.',
  openGraph: {
    type: 'website',
    url: 'https://tensorfeed.ai/agents/claim',
    title: 'Claim Your Wallet · TensorFeed',
    description: 'Bind a wallet to your TensorFeed agent reputation profile via signed EIP-191 message.',
    siteName: 'TensorFeed.ai',
    images: [{ url: '/tensorfeed-logo.png', width: 1024, height: 1024 }],
  },
  twitter: {
    card: 'summary',
    title: 'Claim Your Wallet · TensorFeed',
    description: 'Bind a wallet to your TensorFeed agent reputation profile via signed EIP-191 message.',
  },
  alternates: { canonical: 'https://tensorfeed.ai/agents/claim' },
};

export default function Layout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
