import { Metadata } from 'next';
import Link from 'next/link';
import { Activity, ArrowRight, Code2, Zap, Bot, Puzzle } from 'lucide-react';
import {
  WebApplicationJsonLd,
  BreadcrumbListJsonLd,
  FAQPageJsonLd,
} from '@/components/seo/JsonLd';
import EmbedShowcase from './EmbedShowcase';

export const metadata: Metadata = {
  title: 'Embed Live AI Status on Your Site - Free Widget | TensorFeed',
  description:
    'Drop a live AI status monitor into any site with one line of HTML. A sci-fi Live Monitor console with real-time operational state and p95 latency for every major AI provider and service TensorFeed monitors. Free, no API key, light-blue bridge accent, live refresh.',
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
      'One line of HTML for a sci-fi live AI status monitor. Free, no key, light-blue bridge accent.',
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
      'The widget is a sci-fi Live Monitor console. The default accent is blue: a light-blue bridge spine against green status indicators, which keeps contrast and reads as a sci-fi array. Set ?accent=auto to turn the whole accent green when every system is nominal (the design alternative), or ?accent=green to force green always. Status colors (green nominal, yellow degraded, orange downgraded, red critical, grey offline) are constant across accents. Slow the refresh with ?poll=<seconds>. Use the controls on this page to preview and copy the matching snippet.',
  },
  {
    question: 'Which AI providers does the widget cover?',
    answer:
      'Claude, OpenAI, Google Gemini, Mistral, Cohere, AWS Bedrock, Azure OpenAI, Hugging Face, Replicate, Groq, Perplexity, and GitHub Copilot. Operational status is shown for all of them; measured p95 latency is shown for the providers TensorFeed actively probes, and the others show their real status with no invented number.',
  },
  {
    question: 'Is there a browser extension?',
    answer:
      'Yes. TensorFeed AI Status is live on the Chrome Web Store: a one-click install that puts the same Live Monitor in a toolbar popup, plus a passive badge that quietly turns amber or red the moment a provider degrades. It only requests the alarms permission and host access to tensorfeed.ai, with no content scripts and no telemetry. Install at https://chrome.google.com/webstore/detail/pdmcjopgilbnggocemjjncpcenpmglde. Firefox build is next.',
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
          more, in a sci-fi Live Monitor console with a light-blue bridge accent. Free, no API
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

      {/* npm component */}
      <section className="mb-12">
        <h2 className="text-xl font-bold text-text-primary mb-3">Prefer a component?</h2>
        <p className="text-sm text-text-secondary mb-4 max-w-3xl">
          For anything with a build step, install the zero-dependency, SSR-safe package. It is a
          framework-agnostic web component plus a helper for React, MIT licensed.
        </p>
        <pre
          className="rounded-lg border border-border overflow-x-auto px-4 py-3 text-[12.5px] leading-relaxed font-mono text-text-secondary"
          style={{ background: 'var(--bg-secondary)' }}
        >
          <code>{`npm install @tensorfeed/status-widget

import '@tensorfeed/status-widget';
<tensorfeed-status accent="blue" poll="30"></tensorfeed-status>`}</code>
        </pre>
        <p className="text-xs text-text-muted mt-2">
          On npm:{' '}
          <a
            href="https://www.npmjs.com/package/@tensorfeed/status-widget"
            className="text-accent-cyan hover:underline"
            target="_blank"
            rel="noopener noreferrer"
          >
            @tensorfeed/status-widget
          </a>
          . React users can skip the element and use the{' '}
          <code>tensorfeedStatusSrc()</code> helper directly.
        </p>
      </section>

      {/* Browser extension */}
      <section className="mb-12">
        <h2 className="text-xl font-bold text-text-primary mb-3">
          Prefer it in your toolbar?
        </h2>
        <p className="text-sm text-text-secondary mb-4 max-w-3xl">
          The same Live Monitor ships as a Chrome extension: one-click install,
          a popup with full provider status and p95 latency, and a passive
          badge that turns amber or red the moment something degrades. Host
          access scoped to tensorfeed.ai only, no content scripts, no
          telemetry.
        </p>
        <div className="flex flex-wrap gap-3">
          <a
            href="https://chrome.google.com/webstore/detail/pdmcjopgilbnggocemjjncpcenpmglde"
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-2 px-5 py-2.5 rounded-lg font-medium text-sm whitespace-nowrap text-white"
            style={{ background: 'var(--accent-primary)' }}
          >
            <Puzzle className="w-4 h-4" />
            Install on Chrome Web Store
            <ArrowRight className="w-4 h-4" />
          </a>
          <Link
            href="/originals/ai-status-extension-live"
            className="inline-flex items-center gap-2 px-5 py-2.5 rounded-lg font-medium text-sm whitespace-nowrap border border-border text-text-secondary hover:text-accent-primary hover:border-accent-primary transition-colors"
          >
            Read the launch note
          </Link>
        </div>
        <p className="text-xs text-text-muted mt-2">
          Firefox build is next, same codebase.
        </p>
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
