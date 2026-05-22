import { Metadata } from 'next';
import Link from 'next/link';
import Image from 'next/image';
import { Cpu, ExternalLink } from 'lucide-react';
import fallbackPricingData from '@/../data/pricing.json';
import { DatasetJsonLd } from '@/components/seo/JsonLd';
import LastUpdatedFooter from '@/components/LastUpdatedFooter';
import ModelsDataSection, { PricingData } from '@/components/models/ModelsDataSection';

export const metadata: Metadata = {
  title: 'AI Model Tracker & Pricing Comparison',
  description:
    'Track the latest AI model releases, compare pricing across providers, and explore benchmark leaderboards. Updated daily.',
  openGraph: {
    type: 'website',
    url: 'https://tensorfeed.ai/models',
    title: 'AI Model Tracker & Pricing Comparison',
    description:
      'Track the latest AI model releases, compare pricing across providers, and explore benchmark leaderboards. Updated daily.',
    siteName: 'TensorFeed.ai',
    images: [{ url: '/tensorfeed-logo.png', width: 1024, height: 1024 }],
  },
  twitter: {
    card: 'summary',
    title: 'AI Model Tracker & Pricing Comparison',
    description:
      'Track the latest AI model releases, compare pricing across providers, and explore benchmark leaderboards. Updated daily.',
  },
};

const leaderboards = [
  {
    name: 'LMArena',
    url: 'https://lmarena.ai',
    description: 'Community-driven blind model comparison with Elo ratings from real user votes.',
  },
  {
    name: 'HuggingFace Open LLM Leaderboard',
    url: 'https://huggingface.co/spaces/open-llm-leaderboard/open_llm_leaderboard',
    description: 'Automated benchmark suite for open-weight models across reasoning, math, and knowledge tasks.',
  },
  {
    name: 'MMLU Benchmark Results',
    url: 'https://paperswithcode.com/sota/multi-task-language-understanding-on-mmlu',
    description: 'Massive Multitask Language Understanding scores across 57 academic subjects.',
  },
];

export default function ModelsPage() {
  const initialData = fallbackPricingData as PricingData;

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <DatasetJsonLd
        name="TensorFeed AI Model Pricing & Releases"
        description="Comprehensive AI model pricing comparison, release tracking, and specifications across all major providers."
        url="https://tensorfeed.ai/models"
      />
      {/*
        Hero with photo background. Circuit-board with floating token-coins
        evokes per-million-token API pricing. Layered with dark gradient +
        faint grid for legibility. Image is 2400px wide WebP, ~81KB.
      */}
      <section className="relative isolate overflow-hidden rounded-xl border border-bg-tertiary mb-10 px-6 sm:px-8 py-12 sm:py-20">
        <Image
          src="/pricing-hero.webp"
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
              'linear-gradient(to bottom, rgba(2,6,23,0.65) 0%, rgba(2,6,23,0.75) 100%)',
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

        <div className="flex items-center gap-3 mb-3">
          <div className="p-2 rounded-lg bg-accent-primary/15 backdrop-blur-sm">
            <Cpu className="w-7 h-7 text-accent-primary" />
          </div>
          <h1 className="text-3xl sm:text-4xl font-bold text-white drop-shadow-md">AI Models</h1>
        </div>
        <p className="text-text-secondary text-lg max-w-2xl mb-4 drop-shadow">
          Track releases, compare pricing, and benchmark scores across all major providers.
        </p>
        <div className="text-text-secondary leading-relaxed max-w-3xl space-y-3 text-sm">
          <p>
            The AI model landscape changes fast. New releases ship weekly, pricing drops without warning,
            and context windows that seemed impossible a year ago are now standard. This page tracks every
            major model from Anthropic, OpenAI, Google, Meta, Mistral, Cohere, and DeepSeek with current
            pricing (per million tokens), context window sizes, release dates, and capability tags. Click
            any model name to see its full detail page with benchmark scores, strengths, and use case
            recommendations.
          </p>
          <p>
            Pricing data is sourced directly from provider APIs and official documentation, refreshed
            daily by our worker pipeline and rehydrated in your browser on each visit. For deeper
            analysis, see the{' '}
            <Link href="/ai-api-pricing-guide" className="text-accent-primary hover:underline">full pricing guide</Link>,
            use the{' '}
            <Link href="/tools/cost-calculator" className="text-accent-primary hover:underline">cost calculator</Link>{' '}
            for real-world cost estimates, or{' '}
            <Link href="/compare" className="text-accent-primary hover:underline">compare models side by side</Link>.
          </p>
        </div>
      </section>

      {/* Latest Releases + Pricing Comparison (client-hydrated) */}
      <ModelsDataSection initialData={initialData} />

      {/* Leaderboard Links */}
      <section className="mb-10">
        <h2 className="text-2xl font-semibold text-text-primary mb-6">Leaderboard Links</h2>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          {leaderboards.map((board) => (
            <a
              key={board.name}
              href={board.url}
              target="_blank"
              rel="noopener noreferrer"
              className="bg-bg-secondary border border-border rounded-xl p-5 hover:shadow-glow transition-shadow group"
            >
              <div className="flex items-center gap-2 mb-2">
                <h3 className="text-text-primary font-semibold group-hover:text-accent-primary transition-colors">
                  {board.name}
                </h3>
                <ExternalLink className="w-4 h-4 text-text-muted group-hover:text-accent-primary transition-colors" />
              </div>
              <p className="text-text-muted text-sm">{board.description}</p>
            </a>
          ))}
        </div>
      </section>

      <LastUpdatedFooter path="/models" />
    </div>
  );
}
