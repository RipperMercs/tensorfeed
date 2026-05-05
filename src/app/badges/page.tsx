import { Metadata } from 'next';
import Link from 'next/link';
import { Badge, ArrowRight, Code } from 'lucide-react';
import { WebApplicationJsonLd, BreadcrumbListJsonLd } from '@/components/seo/JsonLd';
import BadgeCopyRow from './BadgeCopyRow';

interface BadgeProvider {
  slug: string;
  name: string;
  href: string;
}

// Slugs match the worker's SLUG_TO_PROVIDER table in worker/src/badges.ts.
// Order matches the rough strategic priority in project_status_coverage_strategy
// (frontier labs first, then cloud gateways, then specialists).
const PROVIDERS: BadgeProvider[] = [
  { slug: 'claude', name: 'Claude API', href: '/is-claude-down' },
  { slug: 'openai', name: 'OpenAI API', href: '/is-chatgpt-down' },
  { slug: 'gemini', name: 'Google Gemini', href: '/is-gemini-down' },
  { slug: 'groq', name: 'Groq', href: '/is-groq-down' },
  { slug: 'bedrock', name: 'AWS Bedrock', href: '/is-bedrock-down' },
  { slug: 'azure', name: 'Azure OpenAI', href: '/is-azure-openai-down' },
  { slug: 'deepseek', name: 'DeepSeek', href: '/is-deepseek-down' },
  { slug: 'together', name: 'Together AI', href: '/is-together-down' },
  { slug: 'fireworks', name: 'Fireworks AI', href: '/is-fireworks-down' },
  { slug: 'openrouter', name: 'OpenRouter', href: '/is-openrouter-down' },
  { slug: 'perplexity', name: 'Perplexity', href: '/is-perplexity-down' },
  { slug: 'copilot', name: 'GitHub Copilot', href: '/is-copilot-down' },
  { slug: 'huggingface', name: 'Hugging Face', href: '/is-huggingface-down' },
  { slug: 'replicate', name: 'Replicate', href: '/is-replicate-down' },
  { slug: 'cohere', name: 'Cohere', href: '/is-cohere-down' },
  { slug: 'mistral', name: 'Mistral', href: '/is-mistral-down' },
  { slug: 'elevenlabs', name: 'ElevenLabs', href: '/is-elevenlabs-down' },
  { slug: 'stability', name: 'Stability AI', href: '/is-stability-ai-down' },
  { slug: 'runway', name: 'Runway', href: '/is-runway-down' },
  { slug: 'luma', name: 'Luma AI', href: '/is-luma-down' },
];

export const metadata: Metadata = {
  title: 'AI Provider Uptime Badges - Embeddable SVG Badges for READMEs',
  description:
    'Embeddable shields.io-style SVG uptime badges for every monitored AI provider. Drop the markdown into your README, docs, or status page to surface live 7-day uptime % for Claude, OpenAI, Gemini, Bedrock, Azure OpenAI, and 15 more providers. Free, no auth, edge-cached.',
  openGraph: {
    type: 'website',
    url: 'https://tensorfeed.ai/badges',
    title: 'AI Provider Uptime Badges - Embeddable SVG Badges for READMEs',
    description:
      'Embeddable shields.io-style SVG uptime badges for every monitored AI provider. Drop into your README to show live uptime %.',
    siteName: 'TensorFeed.ai',
    images: [{ url: '/tensorfeed-logo.png', width: 1024, height: 1024 }],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'AI Provider Uptime Badges - Embeddable SVG Badges',
    description:
      'Drop a live uptime badge into your README for Claude, OpenAI, Gemini, AWS Bedrock, Azure OpenAI, and 15 more providers.',
  },
  alternates: { canonical: 'https://tensorfeed.ai/badges' },
};

export default function BadgesPage() {
  return (
    <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <WebApplicationJsonLd
        name="AI Provider Uptime Badges"
        description="Embeddable SVG uptime badges for every monitored AI provider."
        url="https://tensorfeed.ai/badges"
      />
      <BreadcrumbListJsonLd
        items={[
          { name: 'Home', url: 'https://tensorfeed.ai' },
          { name: 'Status', url: 'https://tensorfeed.ai/status' },
          { name: 'Uptime Badges', url: 'https://tensorfeed.ai/badges' },
        ]}
      />

      {/* Header */}
      <div className="mb-8">
        <div className="flex items-center gap-3 mb-2">
          <Badge className="w-7 h-7 text-accent-primary" />
          <h1 className="text-3xl font-bold text-text-primary">Uptime Badges</h1>
        </div>
        <p className="text-text-secondary text-base leading-relaxed">
          Embeddable SVG uptime badges for every AI provider TensorFeed monitors. Drop one into
          your README, docs site, or status dashboard. Live 7-day uptime %, updated every 2
          minutes, no auth, edge-cached.
        </p>
      </div>

      {/* How to use */}
      <section className="mb-8">
        <div className="bg-bg-secondary border border-border rounded-xl p-6">
          <div className="flex items-center gap-2 mb-4">
            <Code className="w-5 h-5 text-accent-secondary" />
            <h2 className="text-lg font-semibold text-text-primary">How to use</h2>
          </div>
          <p className="text-text-secondary text-sm leading-relaxed mb-4">
            Each badge is a live SVG served from{' '}
            <code className="font-mono text-text-primary text-xs bg-bg-tertiary px-1.5 py-0.5 rounded">
              https://tensorfeed.ai/api/badge/uptime/&#123;slug&#125;
            </code>
            . Markdown:
          </p>
          <pre className="bg-bg-tertiary border border-border rounded-lg p-4 text-xs font-mono text-text-primary overflow-x-auto mb-4">
            {`![Claude uptime](https://tensorfeed.ai/api/badge/uptime/claude)`}
          </pre>
          <p className="text-text-secondary text-sm leading-relaxed mb-4">HTML:</p>
          <pre className="bg-bg-tertiary border border-border rounded-lg p-4 text-xs font-mono text-text-primary overflow-x-auto mb-4">
            {`<img src="https://tensorfeed.ai/api/badge/uptime/claude" alt="Claude uptime"/>`}
          </pre>
          <p className="text-text-secondary text-sm leading-relaxed">
            Custom label via{' '}
            <code className="font-mono text-text-primary text-xs bg-bg-tertiary px-1.5 py-0.5 rounded">
              ?label=
            </code>
            : the badge below shows{' '}
            <code className="font-mono text-text-primary text-xs bg-bg-tertiary px-1.5 py-0.5 rounded">
              /api/badge/uptime/claude?label=anthropic%20SLA
            </code>
            .
          </p>
        </div>
      </section>

      {/* Color thresholds */}
      <section className="mb-8">
        <h2 className="text-lg font-semibold text-text-primary mb-3">Color thresholds</h2>
        <div className="bg-bg-secondary border border-border rounded-xl divide-y divide-border text-sm">
          <div className="flex items-center justify-between px-5 py-3">
            <span className="font-mono text-text-secondary">≥ 99.9%</span>
            <span className="inline-block w-12 h-5 rounded" style={{ background: '#4c1' }} />
          </div>
          <div className="flex items-center justify-between px-5 py-3">
            <span className="font-mono text-text-secondary">≥ 99%</span>
            <span className="inline-block w-12 h-5 rounded" style={{ background: '#97ca00' }} />
          </div>
          <div className="flex items-center justify-between px-5 py-3">
            <span className="font-mono text-text-secondary">≥ 95%</span>
            <span className="inline-block w-12 h-5 rounded" style={{ background: '#dfb317' }} />
          </div>
          <div className="flex items-center justify-between px-5 py-3">
            <span className="font-mono text-text-secondary">≥ 90%</span>
            <span className="inline-block w-12 h-5 rounded" style={{ background: '#fe7d37' }} />
          </div>
          <div className="flex items-center justify-between px-5 py-3">
            <span className="font-mono text-text-secondary">&lt; 90%</span>
            <span className="inline-block w-12 h-5 rounded" style={{ background: '#e05d44' }} />
          </div>
          <div className="flex items-center justify-between px-5 py-3">
            <span className="font-mono text-text-secondary">no data yet</span>
            <span className="inline-block w-12 h-5 rounded" style={{ background: '#9f9f9f' }} />
          </div>
        </div>
      </section>

      {/* Provider list */}
      <section className="mb-10">
        <h2 className="text-lg font-semibold text-text-primary mb-4">All providers</h2>
        <div className="bg-bg-secondary border border-border rounded-xl overflow-hidden divide-y divide-border">
          {PROVIDERS.map((p) => (
            <BadgeCopyRow key={p.slug} slug={p.slug} name={p.name} href={p.href} />
          ))}
        </div>
      </section>

      {/* Cross-link */}
      <div className="mb-10">
        <Link
          href="/leaderboard"
          className="inline-flex items-center gap-2 bg-bg-secondary border border-border rounded-lg px-5 py-3 hover:border-accent-primary transition-colors group"
        >
          <span className="text-sm text-text-secondary group-hover:text-text-primary transition-colors">
            See the live cross-provider uptime leaderboard
          </span>
          <ArrowRight className="w-4 h-4 text-text-muted group-hover:text-accent-primary transition-colors" />
        </Link>
      </div>
    </div>
  );
}
