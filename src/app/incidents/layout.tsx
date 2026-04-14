import { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'AI Service Incident History | TensorFeed.ai',
  description:
    'Historical log of AI service incidents, outages, and degraded performance across major providers including Anthropic, OpenAI, Google, and more.',
  openGraph: {
    type: 'website',
    url: 'https://tensorfeed.ai/incidents',
    title: 'AI Service Incident History | TensorFeed.ai',
    description:
      'Historical log of AI service incidents, outages, and degraded performance across major providers including Anthropic, OpenAI, Google, and more.',
    siteName: 'TensorFeed.ai',
    images: [{ url: '/tensorfeed-logo.png', width: 1024, height: 1024 }],
  },
  twitter: {
    card: 'summary',
    title: 'AI Service Incident History | TensorFeed.ai',
    description:
      'Historical log of AI service incidents, outages, and degraded performance across major providers including Anthropic, OpenAI, Google, and more.',
  },
};

export default function IncidentsLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
