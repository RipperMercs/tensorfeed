import { Metadata } from 'next';
import Link from 'next/link';
import Image from 'next/image';
import { Activity } from 'lucide-react';
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

      {/*
        Hero with photo background. Dim server hall with cool blue light
        spilling through a far doorway evokes operational machinery
        breathing quietly. 2400px WebP, ~85KB.
      */}
      <section className="relative isolate overflow-hidden rounded-xl border border-bg-tertiary mb-10 px-6 sm:px-8 py-12 sm:py-16">
        <Image
          src="/status-hero.webp"
          alt=""
          aria-hidden="true"
          fill
          priority
          sizes="(max-width: 768px) 100vw, 1280px"
          className="object-cover -z-20"
        />
        <div
          aria-hidden="true"
          className="absolute inset-0 -z-10"
          style={{
            background:
              'linear-gradient(to bottom, rgba(2,6,23,0.55) 0%, rgba(2,6,23,0.78) 100%)',
          }}
        />
        <div
          aria-hidden="true"
          className="absolute inset-0 -z-10 opacity-[0.04]"
          style={{
            backgroundImage: [
              'linear-gradient(rgba(255,255,255,0.6) 1px, transparent 1px)',
              'linear-gradient(90deg, rgba(255,255,255,0.6) 1px, transparent 1px)',
            ].join(', '),
            backgroundSize: '48px 48px',
          }}
        />

        <div className="max-w-4xl">
          <div className="flex items-center gap-3 mb-3">
            <div className="p-2 rounded-lg bg-accent-primary/15 backdrop-blur-sm">
              <Activity className="w-7 h-7 text-accent-primary" />
            </div>
            <h1 className="text-3xl sm:text-4xl font-bold text-white drop-shadow-md">
              AI Service Status
            </h1>
          </div>
          <div className="text-text-secondary leading-relaxed space-y-3 drop-shadow text-sm sm:text-base">
            <p>
              Building AI applications means depending on external APIs. Claude, GPT-4, Gemini, and dozens of other services power production systems that serve millions of users. When these services degrade or go offline, the impact ripples through the entire ecosystem. We monitor 12 major AI providers in real time and update this dashboard every 2 minutes.
            </p>
            <p>
              We track Claude API, OpenAI, Google Gemini, AWS Bedrock, Mistral, Hugging Face, Replicate, Cohere, Perplexity, Microsoft Copilot, and Midjourney. Each service is monitored continuously for availability, response-time degradation, and error rates. Green is operational. Amber is degraded. Red is down.
            </p>
            <p>
              Beyond this real-time view: historical{' '}
              <Link href="/incidents" className="text-accent-cyan hover:text-white transition-colors">
                incident history
              </Link>
              , the live{' '}
              <Link href="/leaderboard" className="text-accent-cyan hover:text-white transition-colors">
                7-day uptime leaderboard
              </Link>
              , per-service drilldowns (e.g.{' '}
              <Link href="/is-claude-down" className="text-accent-cyan hover:text-white transition-colors">
                is-claude-down
              </Link>
              ), and{' '}
              <Link href="/alerts" className="text-accent-cyan hover:text-white transition-colors">
                email alerts
              </Link>{' '}
              when things go wrong. For developers, reliability is not optional. It is infrastructure.
            </p>
          </div>
        </div>
      </section>

      <StatusDashboard />
    </div>
  );
}
