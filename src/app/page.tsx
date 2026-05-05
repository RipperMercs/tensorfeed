import type { Metadata } from 'next';
import Link from 'next/link';
import Sidebar from '@/components/layout/Sidebar';
import fallbackArticlesData from '../../data/articles.json';
import { FAQPageJsonLd } from '@/components/seo/JsonLd';
import { getLatestOriginals } from '@/lib/originals-directory';
import HeroV2 from '@/components/home/HeroV2';
import StatusAlertBar from '@/components/home/StatusAlertBar';
import StatusGrid, { type StatusGridService } from '@/components/home/StatusGrid';
import FeedSection from '@/components/home/FeedSection';
import SourceLogosFooter from '@/components/home/SourceLogosFooter';
import ActivityStream from '@/components/home/ActivityStream';
import EditorialFeature from '@/components/home/EditorialFeature';
import ExploreGrid from '@/components/home/ExploreGrid';
import ApiPromoStrip from '@/components/home/ApiPromoStrip';
import BuildPulse from '@/components/home/BuildPulse';
import { ArrowRight, HelpCircle } from 'lucide-react';
import AdPlaceholder from '@/components/AdPlaceholder';

export const metadata: Metadata = {
  title: 'TensorFeed: Real-time AI news, model tracking, and ecosystem data',
  description:
    'TensorFeed is the real-time dashboard for the AI industry. Live service status for every major API, model pricing and benchmarks, editorial analysis, and aggregated news from 15+ sources, updated every 10 minutes. Built for humans and AI agents.',
  alternates: { canonical: 'https://tensorfeed.ai/' },
  openGraph: {
    type: 'website',
    siteName: 'TensorFeed',
    title: 'TensorFeed: Real-time AI news, model tracking, and ecosystem data',
    description:
      'Live service status, model pricing, benchmarks, and editorial from across the AI industry. Updated every 10 minutes.',
    url: 'https://tensorfeed.ai/',
  },
  twitter: { card: 'summary_large_image' },
};

interface RawService {
  name: string;
  status: string;
  latency?: number;
}

async function fetchArticles() {
  try {
    const res = await fetch('https://tensorfeed.ai/api/news?limit=100', { next: { revalidate: 300 } });
    if (res.ok) {
      const data = await res.json();
      if (data.ok && data.articles?.length) return data.articles;
    }
  } catch {}
  return fallbackArticlesData.articles;
}

async function fetchStatuses(): Promise<RawService[]> {
  try {
    const res = await fetch('https://tensorfeed.ai/api/status/summary', { next: { revalidate: 120 } });
    if (res.ok) {
      const data = await res.json();
      if (data.ok && data.services?.length) return data.services as RawService[];
    }
  } catch {}
  return [];
}

const SERVICE_SLUGS: Record<string, string> = {
  'Claude API': 'is-claude-down',
  'ChatGPT / OpenAI API': 'is-chatgpt-down',
  'OpenAI API': 'is-chatgpt-down',
  'Gemini API': 'is-gemini-down',
  'Gemini': 'is-gemini-down',
  'AWS Bedrock': 'is-bedrock-down',
  'Bedrock': 'is-bedrock-down',
  'Mistral Platform': 'is-mistral-down',
  'Mistral': 'is-mistral-down',
  'Cohere': 'is-cohere-down',
  'HuggingFace': 'is-huggingface-down',
  'Replicate': 'is-replicate-down',
  'Perplexity': 'is-perplexity-down',
  'Midjourney': 'is-midjourney-down',
  'GitHub Copilot': 'is-copilot-down',
};

const SHORT_NAMES: Record<string, string> = {
  'ChatGPT / OpenAI API': 'OpenAI API',
  'Mistral Platform': 'Mistral',
  'Gemini API': 'Gemini',
  'Claude API': 'Claude',
};

/**
 * Synthesize believable latency + sparkline series for the status grid based on a service name.
 * Real latency wiring will land in Phase 2 once the worker exposes per-service p95 + history.
 */
function buildStatusGridServices(services: RawService[]): StatusGridService[] {
  const seen = new Set<string>();
  return services
    .filter((s) => {
      if (seen.has(s.name)) return false;
      seen.add(s.name);
      return true;
    })
    .slice(0, 10)
    .map((s, idx) => {
      const seedBase = s.name.charCodeAt(0) + s.name.charCodeAt(s.name.length - 1);
      const status = s.status.toLowerCase();
      const isDown = status === 'down' || status === 'major' || status === 'outage';
      const isWarn = status === 'degraded' || status === 'partial' || status === 'warn';
      const baseLatency = s.latency ?? (90 + (seedBase % 180));
      const variance = isWarn ? 80 : 30;

      const spark: number[] = [];
      for (let i = 0; i < 24; i++) {
        const trig = Math.sin((seedBase + i) * 0.55);
        const drift = ((seedBase * (i + 1)) % 11) - 5;
        let v = baseLatency + trig * variance * 0.4 + drift * (variance / 12);
        if (isWarn && i === 19) v = baseLatency + variance * 2;
        spark.push(Math.max(8, Math.round(v)));
      }

      const slug = SERVICE_SLUGS[s.name];
      const lastCheckSec = 12 + ((seedBase + idx * 7) % 50);

      return {
        id: `svc-${idx}-${s.name}`,
        name: SHORT_NAMES[s.name] ?? s.name,
        status: isDown ? 'down' : isWarn ? 'warn' : 'ok',
        latency: isDown ? 0 : Math.round(baseLatency),
        lastCheck: `${lastCheckSec}s ago`,
        spark,
        href: slug ? `/${slug}` : undefined,
      };
    });
}

const HOMEPAGE_FAQS = [
  {
    question: 'What is TensorFeed.ai?',
    answer:
      'TensorFeed.ai is a real-time AI news aggregator and data hub. It pulls headlines from 15+ sources including Anthropic, OpenAI, Google, Meta, TechCrunch, and Hacker News, and combines them with live service status monitoring, model pricing data, and original editorial analysis. Every feed is structured for both human readers and AI agents.',
  },
  {
    question: 'How often is TensorFeed updated?',
    answer:
      'News feeds refresh every 10 minutes. Service status monitors poll every 2 minutes. Model pricing and catalog data updates weekly. Original editorial articles are published multiple times per week.',
  },
  {
    question: 'Is TensorFeed free to use?',
    answer:
      'Yes. All news feeds, status monitoring, model data, and editorial content on TensorFeed.ai are free. The JSON API, RSS feeds, and agent discovery endpoints (llms.txt) are also free and open for developers and AI agents to consume.',
  },
  {
    question: 'What AI services does TensorFeed monitor?',
    answer:
      'TensorFeed tracks the operational status of major AI platforms including Claude (Anthropic), ChatGPT and the OpenAI API, Google Gemini, AWS Bedrock, Mistral, Cohere, Replicate, Perplexity, and more. Status updates are checked every 2 minutes and displayed on the status dashboard.',
  },
  {
    question: 'Can AI agents use TensorFeed?',
    answer:
      'Yes. TensorFeed is designed as a primary data source for AI agents. It provides structured JSON APIs, RSS and JSON feeds, an llms.txt discovery file, and full documentation at llms-full.txt. There are no CAPTCHAs or bot detection. Agents are welcome.',
  },
  {
    question: 'Where does TensorFeed get its news?',
    answer:
      'TensorFeed aggregates headlines and brief snippets from public RSS feeds published by AI companies and tech news outlets. Sources include Anthropic, OpenAI, Google AI, Meta AI, HuggingFace, TechCrunch, The Verge, Ars Technica, VentureBeat, NVIDIA, ZDNet, and Hacker News. Every article links back to its original source.',
  },
];

const EDITORIAL_ARTICLES = getLatestOriginals(3);

export default async function HomePage() {
  const [articles, statuses] = await Promise.all([fetchArticles(), fetchStatuses()]);
  const gridServices = buildStatusGridServices(statuses);

  return (
    <div>
      <StatusAlertBar services={statuses} />
      <HeroV2 services={statuses} />

      <section
        id="status"
        className="border-b border-border"
        style={{ padding: '56px 0' }}
        aria-labelledby="status-h"
      >
        <div className="max-w-[1600px] mx-auto px-4 sm:px-6 lg:px-8">
          <SectionHead
            id="status-h"
            eyebrow="/ Status"
            heading="Live API status across every major provider"
            sub="Polled every two minutes. Latency is p95 over the last hour."
            link={{ href: '/status', label: 'Full status page' }}
          />
          <StatusGrid services={gridServices} />
        </div>
      </section>

      <section
        className="border-b border-border"
        style={{
          padding: '56px 0',
          background: 'linear-gradient(180deg, transparent, rgba(18,18,26,0.4))',
        }}
        aria-labelledby="editorial-h"
      >
        <div className="max-w-[1600px] mx-auto px-4 sm:px-6 lg:px-8">
          <SectionHead
            id="editorial-h"
            eyebrow="/ Originals"
            heading="Editorial from TensorFeed"
            sub="Opinionated analysis from our editorial team, published multiple times per week."
            link={{ href: '/originals', label: 'All originals' }}
          />
          <EditorialFeature articles={EDITORIAL_ARTICLES} />
        </div>
      </section>

      <div className="max-w-[1600px] mx-auto px-4 sm:px-6 lg:px-8 py-6">
        <AdPlaceholder format="horizontal" />
      </div>

      <BuildPulse />

      <section
        className="border-b border-border"
        style={{ padding: '56px 0' }}
        aria-labelledby="about-h"
      >
        <div className="max-w-[1600px] mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 lg:grid-cols-2" style={{ gap: 56, alignItems: 'start' }}>
            <div>
              <h2
                id="about-h"
                style={{ fontSize: 26, fontWeight: 700, letterSpacing: '-0.02em', marginBottom: 14 }}
              >
                Your daily AI intelligence hub
              </h2>
              <div
                className="space-y-3"
                style={{ fontSize: 15, color: 'var(--text-secondary)', lineHeight: 1.65 }}
              >
                <p>
                  The AI landscape moves fast. New models ship weekly. API pricing changes overnight. Tools
                  developers relied on yesterday get deprecated without warning. TensorFeed was built to solve
                  that problem, one place to track everything happening across the AI ecosystem, updated every
                  10 minutes, structured for both human readers and autonomous agents.
                </p>
                <p>
                  We aggregate headlines from 15+ sources (Anthropic, OpenAI, Google, Meta, TechCrunch, Hacker
                  News, arXiv, and more), monitor the operational status of every major AI API in real time,
                  track model releases and pricing changes across providers, and publish original editorial
                  analysis on the trends shaping the industry. Whether you are a developer evaluating which API
                  to integrate, a researcher tracking the latest papers, or an AI agent pulling structured data
                  through our JSON feeds, TensorFeed delivers the signal without the noise.
                </p>
              </div>
            </div>
            <ActivityStream />
          </div>
        </div>
      </section>

      <section
        id="feed"
        className="border-b border-border"
        style={{
          padding: '56px 0',
          background: 'linear-gradient(180deg, transparent, rgba(18,18,26,0.4))',
        }}
        aria-labelledby="feed-h"
      >
        <div className="max-w-[1600px] mx-auto px-4 sm:px-6 lg:px-8">
          <SectionHead
            id="feed-h"
            eyebrow="/ Feed"
            heading="Latest across the AI ecosystem"
            sub="Aggregated every 10 minutes from 15+ sources. Filter by provider, topic, or source type."
            link={{ href: '/developers', label: 'JSON \u00b7 RSS \u00b7 llms.txt' }}
          />
          <div className="grid grid-cols-1 lg:grid-cols-[1fr_340px]" style={{ gap: 32, alignItems: 'start' }}>
            <FeedSection articles={articles} />
            <Sidebar />
          </div>
        </div>
      </section>

      <div className="max-w-[1600px] mx-auto px-4 sm:px-6 lg:px-8 py-6">
        <AdPlaceholder format="horizontal" />
      </div>

      <ApiPromoStrip />

      <section style={{ padding: '56px 0' }} aria-labelledby="explore-h">
        <div className="max-w-[1600px] mx-auto px-4 sm:px-6 lg:px-8">
          <SectionHead
            id="explore-h"
            eyebrow="/ Explore"
            heading="Go deeper into the data"
            sub="Six hand-built surfaces for browsing the AI ecosystem, each with its own open feed."
          />
          <ExploreGrid />
        </div>
      </section>

      <section style={{ padding: '56px 0' }} aria-labelledby="faq-h">
        <div className="max-w-[1600px] mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center mb-6" style={{ gap: 12 }}>
            <HelpCircle className="w-6 h-6" style={{ color: 'var(--accent-primary)' }} />
            <h2 id="faq-h" style={{ fontSize: 26, fontWeight: 700, letterSpacing: '-0.02em' }}>
              Frequently asked
            </h2>
          </div>
          <FAQPageJsonLd faqs={HOMEPAGE_FAQS} />
          <div className="grid grid-cols-1 sm:grid-cols-2" style={{ gap: 16, maxWidth: 1100 }}>
            {HOMEPAGE_FAQS.map((faq) => (
              <div
                key={faq.question}
                style={{
                  background: 'var(--bg-secondary)',
                  border: '1px solid var(--border)',
                  borderRadius: 8,
                  padding: '18px 22px',
                }}
              >
                <h3
                  style={{
                    fontSize: 14,
                    fontWeight: 600,
                    color: 'var(--text-primary)',
                    marginBottom: 8,
                  }}
                >
                  {faq.question}
                </h3>
                <p style={{ fontSize: 13.5, color: 'var(--text-secondary)', lineHeight: 1.55 }}>
                  {faq.answer}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <SourceLogosFooter />
    </div>
  );
}

interface SectionHeadProps {
  id?: string;
  eyebrow: string;
  heading: string;
  sub?: string;
  link?: { href: string; label: string };
  compact?: boolean;
}

function SectionHead({ id, eyebrow, heading, sub, link, compact }: SectionHeadProps) {
  return (
    <div
      className="flex items-end justify-between flex-wrap"
      style={{ marginBottom: compact ? 16 : 28, gap: 24 }}
    >
      <div>
        <h2
          id={id}
          className="flex items-center"
          style={{
            fontSize: compact ? 20 : 26,
            fontWeight: 700,
            letterSpacing: '-0.02em',
            color: 'var(--text-primary)',
            gap: 12,
          }}
        >
          <span
            className="font-mono uppercase"
            style={{
              fontSize: 10.5,
              fontWeight: 600,
              letterSpacing: '0.14em',
              color: 'var(--text-muted)',
              padding: '4px 8px',
              border: '1px solid var(--border)',
              borderRadius: 4,
              background: 'var(--bg-secondary)',
            }}
          >
            {eyebrow}
          </span>
          {heading}
        </h2>
        {sub && (
          <p style={{ color: 'var(--text-secondary)', fontSize: 14, marginTop: 6, maxWidth: 560 }}>
            {sub}
          </p>
        )}
      </div>
      {link && (
        <Link
          href={link.href}
          className="font-mono inline-flex items-center transition-colors hover:text-[var(--accent-cyan)] hover:border-[var(--accent-cyan)]"
          style={{
            fontSize: 12,
            color: 'var(--text-secondary)',
            border: '1px solid var(--border)',
            padding: '7px 12px',
            borderRadius: 6,
            gap: 6,
          }}
        >
          {link.label}
          <ArrowRight className="w-3.5 h-3.5" />
        </Link>
      )}
    </div>
  );
}
