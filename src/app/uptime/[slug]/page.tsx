import { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { Activity, ArrowRight, Code, Trophy } from 'lucide-react';
import {
  WebApplicationJsonLd,
  FAQPageJsonLd,
  BreadcrumbListJsonLd,
} from '@/components/seo/JsonLd';
import UptimeChart from './UptimeChart';

// Slug catalog mirrors worker/src/badges.ts SLUG_TO_PROVIDER. Keep in sync.
// The canonical slug is the first one for each provider; aliases redirect via
// the worker resolver but each canonical gets its own static page.
interface ProviderConfig {
  slug: string;
  name: string;
  shortName: string;
  isDownHref: string;
  description: string;
}

const PROVIDERS: ProviderConfig[] = [
  {
    slug: 'claude',
    name: 'Claude API',
    shortName: 'Claude',
    isDownHref: '/is-claude-down',
    description: 'Anthropic Claude inference API serving Opus, Sonnet, and Haiku models.',
  },
  {
    slug: 'openai',
    name: 'OpenAI API',
    shortName: 'OpenAI',
    isDownHref: '/is-chatgpt-down',
    description: 'OpenAI inference API powering ChatGPT and the GPT model family.',
  },
  {
    slug: 'gemini',
    name: 'Google Gemini',
    shortName: 'Gemini',
    isDownHref: '/is-gemini-down',
    description: 'Google Vertex Gemini API and Vertex AI Online Prediction inference path.',
  },
  {
    slug: 'groq',
    name: 'Groq',
    shortName: 'Groq',
    isDownHref: '/is-groq-down',
    description: 'Groq LPU-accelerated inference for Llama, Mixtral, Whisper, and Compound models.',
  },
  {
    slug: 'bedrock',
    name: 'AWS Bedrock',
    shortName: 'Bedrock',
    isDownHref: '/is-bedrock-down',
    description: 'AWS Bedrock multi-model inference platform across Claude, Llama, Mistral, Titan, and more.',
  },
  {
    slug: 'azure',
    name: 'Azure OpenAI',
    shortName: 'Azure OpenAI',
    isDownHref: '/is-azure-openai-down',
    description: 'Azure OpenAI Service / AI Foundry / Cognitive Services inference platform.',
  },
  {
    slug: 'deepseek',
    name: 'DeepSeek',
    shortName: 'DeepSeek',
    isDownHref: '/is-deepseek-down',
    description: 'DeepSeek inference API serving DeepSeek-V3.1, R1, and other DeepSeek-hosted models.',
  },
  {
    slug: 'together',
    name: 'Together AI',
    shortName: 'Together',
    isDownHref: '/is-together-down',
    description: 'Together AI multi-model inference (Llama, DeepSeek, Qwen, FLUX, Whisper, embeddings).',
  },
  {
    slug: 'fireworks',
    name: 'Fireworks AI',
    shortName: 'Fireworks',
    isDownHref: '/is-fireworks-down',
    description: 'Fireworks AI inference platform for chat completion and embeddings.',
  },
  {
    slug: 'openrouter',
    name: 'OpenRouter',
    shortName: 'OpenRouter',
    isDownHref: '/is-openrouter-down',
    description: 'OpenRouter routing layer across hundreds of models from dozens of upstream providers.',
  },
  {
    slug: 'perplexity',
    name: 'Perplexity',
    shortName: 'Perplexity',
    isDownHref: '/is-perplexity-down',
    description: 'Perplexity AI search and conversational AI API.',
  },
  {
    slug: 'copilot',
    name: 'GitHub Copilot',
    shortName: 'Copilot',
    isDownHref: '/is-copilot-down',
    description: 'GitHub Copilot AI pair programmer powered by multiple AI model providers.',
  },
  {
    slug: 'huggingface',
    name: 'Hugging Face',
    shortName: 'Hugging Face',
    isDownHref: '/is-huggingface-down',
    description: 'Hugging Face Inference API and Spaces hosting for thousands of open-source models.',
  },
  {
    slug: 'replicate',
    name: 'Replicate',
    shortName: 'Replicate',
    isDownHref: '/is-replicate-down',
    description: 'Replicate API for running open-source models in the cloud.',
  },
  {
    slug: 'cohere',
    name: 'Cohere',
    shortName: 'Cohere',
    isDownHref: '/is-cohere-down',
    description: 'Cohere Command, Embed, and Rerank inference APIs.',
  },
  {
    slug: 'mistral',
    name: 'Mistral',
    shortName: 'Mistral',
    isDownHref: '/is-mistral-down',
    description: 'Mistral AI inference platform for Mistral and Codestral models.',
  },
  {
    slug: 'elevenlabs',
    name: 'ElevenLabs',
    shortName: 'ElevenLabs',
    isDownHref: '/is-elevenlabs-down',
    description: 'ElevenLabs voice AI API: Text to Speech, Speech to Text, Conversations, and RAG.',
  },
  {
    slug: 'stability',
    name: 'Stability AI',
    shortName: 'Stability',
    isDownHref: '/is-stability-ai-down',
    description: 'Stability AI image generation platform: Stable Diffusion, SDXL, Stable Image, Stable Audio.',
  },
  {
    slug: 'runway',
    name: 'Runway',
    shortName: 'Runway',
    isDownHref: '/is-runway-down',
    description: 'Runway ML video generation API for Gen-3, Gen-4, and Act-One models.',
  },
  {
    slug: 'luma',
    name: 'Luma',
    shortName: 'Luma',
    isDownHref: '/is-luma-down',
    description: 'Luma AI Dream Machine video generation API and Luma Agents.',
  },
];

export function generateStaticParams() {
  return PROVIDERS.map((p) => ({ slug: p.slug }));
}

interface SeriesOk {
  ok: true;
  provider: string;
  range: { from: string; to: string; days: number };
  poll_interval_minutes: number;
  series: {
    date: string;
    polls: number;
    operational: number;
    degraded: number;
    down: number;
    unknown: number;
    uptime_pct: number | null;
  }[];
  summary: {
    polls: number;
    operational_polls: number;
    degraded_polls: number;
    down_polls: number;
    unknown_polls: number;
    uptime_pct: number | null;
    downtime_minutes: number;
    hard_down_minutes: number;
    days_with_data: number;
  };
}

interface SeriesErr {
  ok: false;
  error: string;
  message: string;
}

async function fetchSeries(slug: string): Promise<SeriesOk | SeriesErr | null> {
  try {
    const res = await fetch(
      `https://tensorfeed.ai/api/uptime/series?provider=${encodeURIComponent(slug)}&days=7`,
      { next: { revalidate: 300 } },
    );
    if (!res.ok) return null;
    return (await res.json()) as SeriesOk | SeriesErr;
  } catch {
    return null;
  }
}

function findProvider(slug: string): ProviderConfig | undefined {
  return PROVIDERS.find((p) => p.slug === slug);
}

export async function generateMetadata({
  params,
}: {
  params: { slug: string };
}): Promise<Metadata> {
  const provider = findProvider(params.slug);
  if (!provider) return {};
  return {
    title: `${provider.shortName} Uptime - 7-Day Reliability Trend`,
    description: `Live ${provider.name} uptime % over the last 7 days, computed from minute-resolution monitoring at 2-minute polling. ${provider.description} See daily uptime breakdown, total downtime, and current rank on the AI provider leaderboard.`,
    openGraph: {
      type: 'website',
      url: `https://tensorfeed.ai/uptime/${provider.slug}`,
      title: `${provider.shortName} Uptime - 7-Day Reliability Trend`,
      description: `Live ${provider.name} uptime % over the last 7 days, computed from minute-resolution monitoring.`,
      siteName: 'TensorFeed.ai',
      images: [{ url: '/tensorfeed-logo.png', width: 1024, height: 1024 }],
    },
    twitter: {
      card: 'summary_large_image',
      title: `${provider.shortName} Uptime - 7-Day Reliability Trend`,
      description: `Live ${provider.name} uptime % over the last 7 days.`,
    },
    alternates: { canonical: `https://tensorfeed.ai/uptime/${provider.slug}` },
  };
}

export default async function UptimePage({ params }: { params: { slug: string } }) {
  const provider = findProvider(params.slug);
  if (!provider) notFound();

  const initialData = await fetchSeries(provider.slug);
  const badgeUrl = `https://tensorfeed.ai/api/badge/uptime/${provider.slug}`;
  const badgeMarkdown = `![${provider.shortName} uptime](${badgeUrl})`;

  const faqs = [
    {
      question: `How is ${provider.shortName} uptime calculated?`,
      answer: `Every 2 minutes a Cloudflare Worker captures the status of ${provider.name} from its public status feed. Each 24-hour window adds about 720 status samples per provider, 5040 over a 7-day rolling window. Uptime % is (operational_samples + 0.5 * degraded_samples) / decisive_samples * 100, where decisive_samples excludes unknown polls so brief gaps in our capture do not penalize the provider.`,
    },
    {
      question: `Why does degraded count as half?`,
      answer: `Degraded service is not the same as unavailable. Most degraded periods (elevated latency, rate-limit pressure, partial-region issues) still let some traffic succeed. Counting degraded as half operational gives a fair single-number summary instead of treating all non-perfect time as equally bad.`,
    },
    {
      question: `Is the chart real-time?`,
      answer: `It refreshes every 5 minutes on the page and every 2 minutes on the worker. The data underlying each bar is captured from ${provider.shortName}'s public status feed at that 2-minute cadence. Today's bar updates throughout the day as new poll cycles run.`,
    },
    {
      question: `What if today's bar shows no data?`,
      answer: `If the chart shows a gray placeholder for any day, that means counter capture had no decisive samples for that day. New providers (or providers with status feed parser issues that have since been fixed) accumulate data from their first successful poll forward. Past days with no data stay empty by design.`,
    },
    {
      question: `Can I embed this uptime % in my README?`,
      answer: `Yes. Drop this markdown anywhere: ${badgeMarkdown}. The badge auto-updates as new poll data accumulates. See /badges for every provider's badge.`,
    },
    {
      question: `Where do I get historical data beyond 7 days?`,
      answer: `The premium /api/premium/status/leaderboard endpoint extends to a 90-day rolling window and adds incident_count + mttr_minutes (mean time to recover) per provider for SRE/ops/procurement teams. See /developers/agent-payments for the paid tier (1 credit per call).`,
    },
  ];

  return (
    <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <WebApplicationJsonLd
        name={`${provider.shortName} Uptime Tracker`}
        description={`Live ${provider.name} uptime over the last 7 days, computed from minute-resolution monitoring at 2-minute polling.`}
        url={`https://tensorfeed.ai/uptime/${provider.slug}`}
      />
      <BreadcrumbListJsonLd
        items={[
          { name: 'Home', url: 'https://tensorfeed.ai' },
          { name: 'Status', url: 'https://tensorfeed.ai/status' },
          { name: 'Uptime Leaderboard', url: 'https://tensorfeed.ai/leaderboard' },
          {
            name: `${provider.shortName} Uptime`,
            url: `https://tensorfeed.ai/uptime/${provider.slug}`,
          },
        ]}
      />
      <FAQPageJsonLd faqs={faqs} />

      {/* Header */}
      <div className="mb-8">
        <div className="flex items-center gap-3 mb-2 flex-wrap">
          <Activity className="w-7 h-7 text-accent-primary" />
          <h1 className="text-3xl font-bold text-text-primary">{provider.shortName} Uptime</h1>
        </div>
        <p className="text-text-secondary text-base leading-relaxed">{provider.description}</p>
      </div>

      {/* Chart + summary */}
      <UptimeChart slug={provider.slug} initialData={initialData} />

      {/* Embed badge */}
      <section className="mt-10 mb-8">
        <div className="bg-bg-secondary border border-border rounded-xl p-6">
          <div className="flex items-center gap-2 mb-3">
            <Code className="w-5 h-5 text-accent-secondary" />
            <h2 className="text-lg font-semibold text-text-primary">Embed this uptime badge</h2>
          </div>
          <div className="flex items-center gap-4 mb-4 flex-wrap">
            <img src={badgeUrl} alt={`${provider.shortName} uptime`} height={20} loading="lazy" />
            <Link
              href="/badges"
              className="text-sm text-accent-primary hover:underline inline-flex items-center gap-1"
            >
              <span>See all providers</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </Link>
          </div>
          <pre className="bg-bg-tertiary border border-border rounded-lg p-4 text-xs font-mono text-text-primary overflow-x-auto">
            {badgeMarkdown}
          </pre>
        </div>
      </section>

      {/* Cross-links */}
      <section className="mb-10 flex flex-wrap gap-3">
        <Link
          href={provider.isDownHref}
          className="inline-flex items-center gap-2 bg-bg-secondary border border-border rounded-lg px-5 py-3 hover:border-accent-primary transition-colors group"
        >
          <Activity className="w-4 h-4 text-text-muted group-hover:text-accent-primary transition-colors" />
          <span className="text-sm text-text-secondary group-hover:text-text-primary transition-colors">
            Is {provider.shortName} down right now?
          </span>
          <ArrowRight className="w-4 h-4 text-text-muted group-hover:text-accent-primary transition-colors" />
        </Link>
        <Link
          href="/leaderboard"
          className="inline-flex items-center gap-2 bg-bg-secondary border border-border rounded-lg px-5 py-3 hover:border-accent-primary transition-colors group"
        >
          <Trophy className="w-4 h-4 text-text-muted group-hover:text-accent-primary transition-colors" />
          <span className="text-sm text-text-secondary group-hover:text-text-primary transition-colors">
            Cross-provider uptime leaderboard
          </span>
          <ArrowRight className="w-4 h-4 text-text-muted group-hover:text-accent-primary transition-colors" />
        </Link>
      </section>

      {/* FAQ */}
      <section className="mb-10">
        <h2 className="text-xl font-semibold text-text-primary mb-6">Frequently Asked Questions</h2>
        <div className="space-y-4">
          {faqs.map((faq) => (
            <div key={faq.question} className="bg-bg-secondary border border-border rounded-lg p-5">
              <h3 className="text-text-primary font-semibold mb-2">{faq.question}</h3>
              <p className="text-text-secondary text-sm leading-relaxed">{faq.answer}</p>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}
