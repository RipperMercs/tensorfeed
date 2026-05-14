import { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'AI Agent Directory',
  description: 'Discover AI agents, frameworks, and tools shaping the ecosystem. Compare coding agents, research agents, creative tools, and developer frameworks.',
  openGraph: {
    type: 'website',
    url: 'https://tensorfeed.ai/agents',
    title: 'AI Agent Directory',
    description: 'Discover AI agents, frameworks, and tools shaping the ecosystem. Compare coding agents, research agents, creative tools, and developer frameworks.',
    siteName: 'TensorFeed.ai',
    images: [{ url: '/tensorfeed-logo.png', width: 1024, height: 1024 }],
  },
  twitter: {
    card: 'summary',
    title: 'AI Agent Directory',
    description: 'Discover AI agents, frameworks, and tools shaping the ecosystem. Compare coding agents, research agents, creative tools, and developer frameworks.',
  },
};

export default function Layout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
