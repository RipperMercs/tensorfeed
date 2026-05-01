import { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'AI Attention Index: Live Provider Hype & Mention Score',
  description:
    'Live attention score per AI provider, derived from news volume, GitHub trending, and agent traffic. Updated every 5 minutes. Free, no auth. The hype index for the AI ecosystem.',
  alternates: { canonical: 'https://tensorfeed.ai/attention' },
  openGraph: {
    type: 'website',
    url: 'https://tensorfeed.ai/attention',
    title: 'AI Attention Index',
    description:
      'Live attention score per AI provider derived from news, GitHub trending, and agent traffic. Updated every 5 minutes. Free, no auth.',
    siteName: 'TensorFeed.ai',
    images: [{ url: '/tensorfeed-logo.png', width: 1024, height: 1024 }],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'AI Attention Index',
    description: 'Live attention score per AI provider. News, GitHub trending, agent traffic.',
  },
};

export default function AttentionLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
