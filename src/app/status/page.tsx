import { Metadata } from 'next';
import Link from 'next/link';
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

      {/* Editorial Intro */}
      <div className="max-w-4xl mb-12">
        <div className="mb-8">
          <h2 className="text-2xl font-bold text-text-primary mb-4">Real-Time AI Service Monitoring</h2>
          <div className="text-text-secondary leading-relaxed space-y-4">
            <p>
              Building AI applications means depending on external APIs. Claude, GPT-4, Gemini, and dozens of other services power production systems that serve millions of users. When these services degrade or go offline, the impact ripples through the entire ecosystem. That&apos;s why we monitor 12 major AI providers in real time and update our status dashboard every 2 minutes.
            </p>
            <p>
              This dashboard shows you the current operational status of major AI APIs. We track Claude API, OpenAI, Google Gemini, AWS Bedrock, Mistral, Hugging Face, Replicate, Cohere, Perplexity, Microsoft Copilot, and Midjourney. Each service is monitored continuously for availability, response time degradation, and error rates. Green means operational. Amber means degraded or experiencing partial outages. Red means down.
            </p>
            <p>
              Beyond this real-time view, we maintain historical incident data on our <Link href="/incidents" className="text-accent-primary hover:underline">incident history page</Link>, breakdown analysis by individual service (check <Link href="/is-claude-down" className="text-accent-primary hover:underline">is-claude-down</Link> for Claude-specific status), and <Link href="/alerts" className="text-accent-primary hover:underline">email alerts</Link> for when things go wrong. For developers, reliability isn&apos;t optional. It&apos;s infrastructure.
            </p>
          </div>
        </div>
      </div>

      <StatusDashboard />
    </div>
  );
}
