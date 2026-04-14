import { Metadata } from 'next';
import { WebApplicationJsonLd } from '@/components/seo/JsonLd';
import StatusDashboard from '@/components/status/StatusDashboard';

export const metadata: Metadata = {
  title: 'AI Service Status Dashboard',
  description:
    'Real-time operational status monitoring for major AI services including Claude, ChatGPT, Gemini, Bedrock, Mistral, and more. Updated every 2 minutes.',
  openGraph: {
    type: 'website',
    url: 'https://tensorfeed.ai/status',
    title: 'AI Service Status Dashboard',
    description:
      'Real-time operational status monitoring for major AI services including Claude, ChatGPT, Gemini, Bedrock, Mistral, and more. Updated every 2 minutes.',
    siteName: 'TensorFeed.ai',
    images: [{ url: '/tensorfeed-logo.png', width: 1024, height: 1024 }],
  },
  twitter: {
    card: 'summary',
    title: 'AI Service Status Dashboard',
    description:
      'Real-time operational status monitoring for major AI services including Claude, ChatGPT, Gemini, Bedrock, Mistral, and more. Updated every 2 minutes.',
  },
};

export default function StatusPage() {
  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
      <WebApplicationJsonLd
        name="TensorFeed AI Service Status Dashboard"
        description="Real-time operational status monitoring for major AI services including Claude, OpenAI, Gemini, and more."
        url="https://tensorfeed.ai/status"
      />
      <StatusDashboard />
    </div>
  );
}
