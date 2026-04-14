import { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Live Data Feeds',
  description: 'Real-time AI ecosystem data: agent activity, service status, GitHub trending, prediction markets, and more. Powered by TerminalFeed.io.',
  openGraph: {
    type: 'website',
    url: 'https://tensorfeed.ai/live',
    title: 'Live Data Feeds',
    description: 'Real-time AI ecosystem data: agent activity, service status, GitHub trending, prediction markets, and more. Powered by TerminalFeed.io.',
    siteName: 'TensorFeed.ai',
    images: [{ url: '/tensorfeed-logo.png', width: 1024, height: 1024 }],
  },
  twitter: {
    card: 'summary',
    title: 'Live Data Feeds',
    description: 'Real-time AI ecosystem data: agent activity, service status, GitHub trending, prediction markets, and more. Powered by TerminalFeed.io.',
  },
};

export default function Layout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
