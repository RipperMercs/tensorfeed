import { Metadata } from 'next';
import Link from 'next/link';
import { Activity, ArrowRight, Code2, Zap, Bot } from 'lucide-react';
import {
  WebApplicationJsonLd,
  BreadcrumbListJsonLd,
  FAQPageJsonLd,
} from '@/components/seo/JsonLd';
import EmbedShowcase from './EmbedShowcase';

export const metadata: Metadata = {
  title: 'Embed Live AI Status on Your Site - Free Widget | TensorFeed',
  description:
    'Drop a live AI status monitor into any site with one line of HTML. A sci-fi Live Monitor console with real-time operational state and p95 latency for major AI providers and services. Free, no API key, auto blue or all-clear-green accent, live refresh.',
  openGraph: {
    type: 'website',
    url: 'https://tensorfeed.ai/embed',
    title: 'Embed Live AI Status on Your Site - Free Widget',
    description:
      'One line of HTML for a live AI provider status board: operational state plus p95 latency for Claude, OpenAI, Gemini, and more. Free, no key, themeable.',
    siteName: 'TensorFeed.ai',
    images: [{ url: '/tensorfeed-logo.png', width: 1024, height: 1024 }],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Embed Live AI Status on Your Site - Free Widget',
    description:
      'One line of HTML for a sci-fi live AI status monitor. Free, no key, auto blue/green accent.',
  },
  alternates: { canonical: 'https://tensorfeed.ai/embed' },
};

const FAQS: { question: string; answer: string }[] = [
  {
    question: 'Is the AI status widget free?',
    answer:
      'Yes. The widget is free to embed on any site with no API key, no signup, and no rate limit on the embed. It reads the same public endpoints the TensorFeed status dashboard uses. If you want the raw data programmatically, the developer API and MCP server are documented at tensorfeed.ai/developers.',
  },
  {
    question: 'How often does the widget update?',
    answer:
      'Operational status is refreshed every roughly two minutes from /api/status/summary. The latency figure is the p95 response time over the last 24 hours from /api/probe/latest. The widget re-polls every 120 seconds so embedded copies stay current without hammering the edge.',
  },
  {
    question: 'Can I match the widget to my site theme?',
    answer:
      'The widget is a sci-fi Live Monitor console. It has two accent modes set via ?accent=: blue (bridge cyan) and green (all-clear). The default is auto, which shows green when every system is nominal and blue the moment anything degrades, so the warning colors never compete with green. Status colors (yellow degraded, orange downgraded, red critical, grey offline) are constant. You can also slow the refresh with ?poll=<seconds>. Use the controls on this page to preview and copy the matching snippet.',
  },
  {
    question: 'Which AI providers does the widget cover?',
    answer:
      'Claude, OpenAI, Google Gemini, Mistral, Cohere, AWS Bedrock, Azure OpenAI, Hugging Face, Replicate, Groq, Perplexity, and GitHub Copilot. Operational status is shown for all of them; measured p95 latency is shown for the providers TensorFeed actively probes, and the others show their real status with no invented number.',
  },
  {
    question: 'I only want a small badge for my README. What should I use?',
    answer:
      'Use the shields.io-style SVG uptime badges at tensorfeed.ai/badges instead. Those are a single line of markdown per provider, ideal for a README or docs page. The widget on this page is the full visual board for a website or status section.',
  },
  {
    question: 'Can AI agents consume this status data directly?',
    answer:
      'Yes. The widget is a human-facing view of machine-first feeds. Agents can call /api/status/summary and /api/probe/latest directly, or use the TensorFeed MCP server. Everything is documented at tensorfeed.ai/developers.',
  },
];

export default function EmbedPage() {
  return (
    <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <WebApplicationJsonLd
        name="TensorFeed AI Provider Status Widget"
        description="Free embeddable widget showing real-time operational status and p95 latency for major AI providers."
        url="https://tensorfeed.ai/embed"
      />
      <BreadcrumbListJsonLd
        items={[
          { name: 'Home', url: 'https://tensorfeed.ai' },
          { name: 'Status', url: 'https://tensorfeed.ai/status' },
          { name: 'Embed', url: 'https://tensorfeed.ai/embed' },
        ]}
      />
      <FAQPageJsonLd faqs={FAQS} />

      {/* Hero */}
      <section className="mb-10">
        <div className="flex items-center gap-3 mb-3">
          <div className="p-2 rounded-lg bg-accent-primary/15">
            <Activity className="w-7 h-7 text-accent-primary" />
          </div>
          <h1 className="text-3xl sm:text-4xl font-bold text-text-primary">
            Embed live AI status on your site
          </h1>
        </div>
        <p className="text-text-secondary leading-relaxed max-w-3xl text-sm sm:text-base">
          One line of HTML puts a live AI provider status board on your site: real-time
          operational state plus p95 latency for Claude, OpenAI, Gemini, Mistral, Cohere, and
          more, in a sci-fi Live Monitor console with an auto blue/green accent. Free, no API
          key, no tracking. It is the same live data behind the TensorFeed{' '}
          <Link href="/status" className="text-accent-cyan hover:underline">
            status dashboard
          </Link>
          , surfaced for your pages.
        </p>
      </section>

      {/* Interactive showcase */}
      <section className="mb-12">
        <EmbedShowcase />
      </section>

      {/* What powers it */}
      <section className="mb-12">
        <h2 className="text-xl font-bold text-text-primary mb-4">What powers it</h2>
        <div className="grid sm:grid-cols-3 gap-4">
          <div className="rounded-lg border border-border p-5" style={{ background: 'var(--bg-secondary)' }}>
            <Zap className="w-5 h-5 text-accent-primary mb-2" />
            <h3 className="font-semibold text-text-primary mb-1 text-sm">Live, honest data</h3>
            <p className="text-sm text-text-secondary leading-relaxed">
              Status from{' '}
              <a href="https://tensorfeed.ai/api/status/summary" className="text-accent-cyan hover:underline" target="_blank" rel="noopener noreferrer">
                /api/status/summary
              </a>
              , p95 latency over 24h from{' '}
              <a href="https://tensorfeed.ai/api/probe/latest" className="text-accent-cyan hover:underline" target="_blank" rel="noopener noreferrer">
                /api/probe/latest
              </a>
              . No fabricated numbers.
            </p>
          </div>
          <div className="rounded-lg border border-border p-5" style={{ background: 'var(--bg-secondary)' }}>
            <Code2 className="w-5 h-5 text-accent-primary mb-2" />
            <h3 className="font-semibold text-text-primary mb-1 text-sm">Just the data?</h3>
            <p className="text-sm text-text-secondary leading-relaxed">
              The widget is a view on machine-first feeds. Hit the JSON directly or use the MCP
              server. See the{' '}
              <Link href="/developers" className="text-accent-cyan hover:underline">
                developer docs
              </Link>
              .
            </p>
          </div>
          <div className="rounded-lg border border-border p-5" style={{ background: 'var(--bg-secondary)' }}>
            <Bot className="w-5 h-5 text-accent-primary mb-2" />
            <h3 className="font-semibold text-text-primary mb-1 text-sm">Just a README badge?</h3>
            <p className="text-sm text-text-secondary leading-relaxed">
              Use the shields.io-style{' '}
              <Link href="/badges" className="text-accent-cyan hover:underline">
                uptime badges
              </Link>
              : one line of markdown per provider for docs and READMEs.
            </p>
          </div>
        </div>
      </section>

      {/* FAQ */}
      <section className="mb-12">
        <h2 className="text-xl font-bold text-text-primary mb-4">Embed FAQ</h2>
        <div className="space-y-3">
          {FAQS.map((f) => (
            <details
              key={f.question}
              className="rounded-lg border border-border px-5 py-4"
              style={{ background: 'var(--bg-secondary)' }}
            >
              <summary className="cursor-pointer font-semibold text-text-primary text-sm select-none">
                {f.question}
              </summary>
              <p className="text-sm text-text-secondary leading-relaxed mt-3">{f.answer}</p>
            </details>
          ))}
        </div>
      </section>

      {/* CTA */}
      <section
        className="rounded-xl border border-bg-tertiary p-6 sm:p-8 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4"
        style={{ background: 'var(--bg-secondary)' }}
      >
        <div>
          <h2 className="text-lg font-bold text-text-primary mb-1">
            Build on the live AI ecosystem feed
          </h2>
          <p className="text-sm text-text-secondary">
            Status is one feed. News, model pricing, benchmarks, CVE timelines, funding, and more
            ship as open API and MCP tools for agents.
          </p>
        </div>
        <Link
          href="/developers"
          className="inline-flex items-center gap-2 px-5 py-2.5 rounded-lg font-medium text-sm whitespace-nowrap text-white"
          style={{ background: 'var(--accent-primary)' }}
        >
          Explore the API <ArrowRight className="w-4 h-4" />
        </Link>
      </section>
    </div>
  );
}
