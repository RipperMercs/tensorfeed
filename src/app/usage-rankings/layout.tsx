import { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'AI Model Usage Rankings: What Production Agents Actually Use',
  description:
    'Live ranking of AI models by real production token volume, sourced from OpenRouter. Beyond benchmarks: what models are actually getting picked. Free, no auth, updated weekly.',
  alternates: { canonical: 'https://tensorfeed.ai/usage-rankings' },
  openGraph: {
    type: 'website',
    url: 'https://tensorfeed.ai/usage-rankings',
    title: 'AI Model Usage Rankings',
    description:
      'Real production token volume per AI model from OpenRouter. The actual market signal.',
    siteName: 'TensorFeed.ai',
    images: [{ url: '/tensorfeed-logo.png', width: 1024, height: 1024 }],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'AI Model Usage Rankings',
    description: 'Real production token volume per AI model.',
  },
};

export default function UsageRankingsLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
