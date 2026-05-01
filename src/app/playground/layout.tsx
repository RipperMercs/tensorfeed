import { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'TensorFeed API Playground: Try Endpoints Live, No Login',
  description:
    'Run live queries against the TensorFeed AI API directly in your browser. News, status, models, benchmarks, harnesses, GPU pricing, MCP registry, more. No account, no login, no API key. See the JSON, copy the curl.',
  alternates: { canonical: 'https://tensorfeed.ai/playground' },
  openGraph: {
    type: 'website',
    url: 'https://tensorfeed.ai/playground',
    title: 'TensorFeed API Playground',
    description:
      'Run live queries against the TensorFeed AI API in your browser. No login, no key. See the JSON and copy the curl.',
    siteName: 'TensorFeed.ai',
    images: [{ url: '/tensorfeed-logo.png', width: 1024, height: 1024 }],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'TensorFeed API Playground',
    description: 'Live, no-auth API playground for AI news, status, models, benchmarks, harnesses, more.',
  },
};

export default function PlaygroundLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
