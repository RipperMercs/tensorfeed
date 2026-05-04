import { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'x402 Adopters: Live Publishers, SDKs, and Gateways',
  description:
    'Curated catalog of who actually speaks the x402 HTTP-payment protocol today. TensorFeed.ai, TerminalFeed.io, Stripe Link Agents (announced), Coinbase x402 SDK, afta-gateway template, tensorfeed Python + JS SDKs, tensorfeed-mcp. Each entry: org, status, networks, tokens, x402 methods, endpoint URL, repo, docs, lastVerified. Free.',
  alternates: { canonical: 'https://tensorfeed.ai/x402-adopters' },
  openGraph: {
    type: 'website',
    url: 'https://tensorfeed.ai/x402-adopters',
    title: 'x402 Adopters Tracker',
    description:
      'Who speaks x402 today. Live publishers, SDKs, gateway templates, references.',
    siteName: 'TensorFeed.ai',
    images: [{ url: '/tensorfeed-logo.png', width: 1024, height: 1024 }],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'x402 Adopters Tracker',
    description: 'Live x402 publishers, SDKs, gateways, and references.',
  },
  keywords: [
    'x402',
    'x402 protocol',
    'x402 adopters',
    'agent payments',
    'machine payable',
    'USDC on Base',
    'Stripe Link Agents',
    'Coinbase x402',
    'afta-gateway',
    'AFTA',
    'TensorFeed',
    'TerminalFeed',
    'HTTP 402',
    'agent fair trade',
  ],
};

export default function X402AdoptersLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
