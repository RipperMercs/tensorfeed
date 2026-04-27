import { Metadata } from 'next';
import Link from 'next/link';
import { Bot } from 'lucide-react';
import AgentTrafficClient from './AgentTrafficClient';
import JsonLd, { DatasetJsonLd, FAQPageJsonLd } from '@/components/seo/JsonLd';

export const metadata: Metadata = {
  title: 'Live AI Bot Traffic on TensorFeed: GPTBot, ClaudeBot, PerplexityBot Stats',
  description:
    'Real-time dashboard of AI agent and crawler traffic hitting TensorFeed.ai. See which bots (GPTBot, ClaudeBot, PerplexityBot, Googlebot, Bytespider, and more) are pulling AI industry data, what endpoints they prefer, and how much traffic they generate. Free, public, refreshed every 30 seconds.',
  alternates: { canonical: 'https://tensorfeed.ai/agent-traffic' },
  openGraph: {
    type: 'website',
    url: 'https://tensorfeed.ai/agent-traffic',
    title: 'Live AI Bot Traffic on TensorFeed',
    description:
      'Real-time AI crawler traffic: GPTBot, ClaudeBot, PerplexityBot, Googlebot, Bytespider, and more.',
    siteName: 'TensorFeed.ai',
    images: [{ url: '/tensorfeed-logo.png', width: 1024, height: 1024 }],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Live AI Bot Traffic on TensorFeed',
    description:
      'Real-time AI crawler traffic: GPTBot, ClaudeBot, PerplexityBot, Googlebot, Bytespider, and more.',
  },
  keywords: [
    'GPTBot stats',
    'ClaudeBot crawl rate',
    'PerplexityBot traffic',
    'AI bot traffic',
    'AI crawler dashboard',
    'AI agent traffic',
    'Bytespider stats',
    'Google-Extended crawler',
    'OAI-SearchBot',
    'AI scraper traffic',
    'tensorfeed agent activity',
  ],
};

const FAQS = [
  {
    question: 'Which AI bots does TensorFeed track?',
    answer:
      'We track 25+ user-agent patterns including ClaudeBot and anthropic-ai (Anthropic), GPTBot, ChatGPT-User, and OAI-SearchBot (OpenAI), PerplexityBot, Google-Extended and Googlebot, Bingbot, Applebot, DuckDuckBot, Bytespider (TikTok / Doubao), Amazonbot, FacebookBot, Twitterbot, cohere-ai, YouBot, plus generic patterns for Scrapy, python-requests, axios, node-fetch, and any UA matching bot/crawler/spider/agent.',
  },
  {
    question: 'How is bot traffic detected?',
    answer:
      'Pure user-agent string matching at the Cloudflare Worker layer. We do not fingerprint, rate-limit, or block any of these bots. Hits are buffered in memory and flushed to KV in batches to stay inside the 100k operations/day budget on the Cloudflare free tier.',
  },
  {
    question: 'How often does the dashboard refresh?',
    answer:
      'The page polls /api/agents/activity every 30 seconds. The endpoint itself caches its KV reads in worker memory for 30 seconds, so the freshest visible state lags real-time hits by up to a minute.',
  },
  {
    question: 'How far back does this data go?',
    answer:
      'The live view shows the most recent 50 bot hits and the running daily counter. Historical daily counts are also captured into our public history snapshot system at /api/history once per day, so multi-day trends become available as the archive accumulates.',
  },
  {
    question: 'Why does TensorFeed publish this?',
    answer:
      'Two reasons. First, most sites hide bot traffic; we built TensorFeed for AI agents, so making the agent footprint visible is on-brand. Second, agent traffic patterns themselves are useful data: which crawler indexes which surface, which endpoints attract the most agent attention, and how that distribution shifts over time.',
  },
  {
    question: 'Can I get this data programmatically?',
    answer:
      'Yes. GET https://tensorfeed.ai/api/agents/activity returns JSON with today_count, last_updated, and the recent hits array. No auth, no rate limit. Both SDKs (pip install tensorfeed, npm install tensorfeed) expose it via tf.agents_activity() / client.agents.activity().',
  },
];

export default function AgentTrafficPage() {
  const breadcrumb = {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: [
      { '@type': 'ListItem', position: 1, name: 'Home', item: 'https://tensorfeed.ai' },
      { '@type': 'ListItem', position: 2, name: 'For AI agents', item: 'https://tensorfeed.ai/for-ai-agents' },
      { '@type': 'ListItem', position: 3, name: 'Agent traffic', item: 'https://tensorfeed.ai/agent-traffic' },
    ],
  };

  return (
    <article className="max-w-4xl mx-auto px-4 sm:px-6 py-10">
      <DatasetJsonLd
        name="TensorFeed AI Bot Traffic"
        description="Real-time and daily aggregate counts of AI agent and crawler hits against TensorFeed.ai endpoints, broken down by user-agent string. Updated continuously."
        url="https://tensorfeed.ai/agent-traffic"
      />
      <FAQPageJsonLd faqs={FAQS} />
      <JsonLd data={breadcrumb} />

      <header className="mb-8">
        <div className="flex items-center gap-3 mb-3">
          <Bot className="w-6 h-6 text-accent-primary" />
          <h1 className="text-3xl sm:text-4xl font-bold text-text-primary">Live AI bot traffic</h1>
        </div>
        <p className="text-text-secondary text-lg">
          Which AI agents and crawlers are pulling data from TensorFeed right now. Most sites hide
          this; we publish it because TensorFeed.ai was built for AI agents.
        </p>
      </header>

      <AgentTrafficClient />

      <section className="mt-10">
        <h2 className="text-text-primary font-semibold text-xl mb-3">FAQ</h2>
        <div className="space-y-3">
          {FAQS.map((f, i) => (
            <div key={i} className="bg-bg-secondary border border-border rounded-xl p-5">
              <h3 className="text-text-primary font-semibold mb-2 text-sm">{f.question}</h3>
              <p className="text-text-secondary text-sm">{f.answer}</p>
            </div>
          ))}
        </div>
      </section>

      <section className="mt-10">
        <h2 className="text-text-primary font-semibold text-xl mb-3">Related</h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <Link
            href="/for-ai-agents"
            className="block bg-bg-secondary border border-border rounded-xl p-4 hover:border-accent-primary transition"
          >
            <h3 className="text-text-primary font-semibold text-sm mb-1">/for-ai-agents</h3>
            <p className="text-text-muted text-xs">
              Discovery, MCP, x402 payments, SDKs. The full agent-first overview.
            </p>
          </Link>
          <Link
            href="/api-reference"
            className="block bg-bg-secondary border border-border rounded-xl p-4 hover:border-accent-primary transition"
          >
            <h3 className="text-text-primary font-semibold text-sm mb-1">/api-reference</h3>
            <p className="text-text-muted text-xs">
              Per-endpoint reference. Free + premium, with code samples and JSON-LD.
            </p>
          </Link>
          <Link
            href="/originals/publishing-bot-traffic"
            className="block bg-bg-secondary border border-border rounded-xl p-4 hover:border-accent-primary transition"
          >
            <h3 className="text-text-primary font-semibold text-sm mb-1">
              Why we publish this dashboard
            </h3>
            <p className="text-text-muted text-xs">
              The editorial argument: most sites hide bot traffic. We count and publish.
            </p>
          </Link>
          <Link
            href="/api/history"
            className="block bg-bg-secondary border border-border rounded-xl p-4 hover:border-accent-primary transition"
          >
            <h3 className="text-text-primary font-semibold text-sm mb-1">/api/history</h3>
            <p className="text-text-muted text-xs">
              Daily snapshots of agent-activity, pricing, models, benchmarks, and status.
            </p>
          </Link>
        </div>
      </section>
    </article>
  );
}
