import { Metadata } from 'next';
import Link from 'next/link';
import { Database, Mail, ArrowRight, FileText } from 'lucide-react';
import { BreadcrumbListJsonLd } from '@/components/seo/JsonLd';

// Source of truth: worker/src/data-licensing.ts. Live JSON at
// /api/data-licensing.

export const metadata: Metadata = {
  title: 'Institutional Data Licensing for AI Ecosystem Data',
  description:
    'Bulk data licensing for hedge funds, AI research firms, training-data buyers, news aggregators. Six datasets: AI news corpus, model pricing history, benchmark history, service status history, anonymized agent traffic, MCP ecosystem telemetry. Enterprise commercial license, USDC or wire.',
  alternates: { canonical: 'https://tensorfeed.ai/data-licensing' },
  openGraph: {
    type: 'website',
    url: 'https://tensorfeed.ai/data-licensing',
    title: 'TensorFeed Institutional Data Licensing',
    description:
      'Bulk AI ecosystem datasets for hedge funds, AI research firms, training-data buyers. USDC or wire.',
    siteName: 'TensorFeed.ai',
    images: [{ url: '/tensorfeed-logo.png', width: 1024, height: 1024 }],
  },
  twitter: {
    card: 'summary',
    title: 'TensorFeed Institutional Data Licensing',
    description: 'Bulk AI ecosystem datasets, enterprise commercial license.',
  },
};

const DATASETS = [
  {
    id: 'ai_news_corpus',
    name: 'AI News Corpus',
    refresh: 'Daily',
    priceUsd: 500,
    audience: 'NLP researchers, hedge fund AI desks, news aggregators',
    description:
      'Full text + categorization of AI news articles ingested across 15+ sources, deduplicated, enriched with source domain, publish timestamp, and category labels.',
    scale: '~200-400 articles/day, ~100K articles since launch',
    formats: 'jsonl, parquet',
  },
  {
    id: 'model_pricing_history',
    name: 'AI Model Pricing History',
    refresh: 'Daily',
    priceUsd: 750,
    audience: 'Quant desks, AI procurement teams, model-routing infrastructure',
    description:
      'Daily snapshots of input/output/blended pricing per model across providers, normalized to per-1M-token rates, with provider metadata and pricing-tier classification.',
    scale: '~150 models tracked daily, multi-month history',
    formats: 'jsonl, csv, parquet',
  },
  {
    id: 'benchmark_history',
    name: 'Benchmark Score History',
    refresh: 'Weekly',
    priceUsd: 750,
    audience: 'AI research firms, model evaluation companies, leaderboard aggregators',
    description:
      'Daily benchmark scores (SWE-Bench, MMLU-Pro, GPQA Diamond, MATH, HumanEval, etc.) per model, with provenance and union-of-keys normalization.',
    scale: '~150 models × 5+ benchmarks',
    formats: 'jsonl, csv, parquet',
  },
  {
    id: 'service_status_history',
    name: 'AI Service Status History',
    refresh: 'Daily',
    priceUsd: 500,
    audience: 'SLA monitoring vendors, AI infrastructure teams, agent reliability platforms',
    description:
      'Per-provider status timeline: operational/degraded/down classification per check interval, incident events, derived uptime percentages.',
    scale: '20+ providers polled every 2 min',
    formats: 'jsonl, parquet',
  },
  {
    id: 'agent_traffic_anonymized',
    name: 'Agent Traffic (Anonymized)',
    refresh: 'Weekly',
    priceUsd: 1500,
    audience: 'AI agent platform companies, infrastructure providers, market research',
    description:
      'Aggregated agent traffic patterns on TensorFeed: User-Agent fingerprints, request volumes per category, time-of-day distributions, geographic distributions. Wallets and tokens excluded; pure traffic-shape product.',
    scale: 'TF live agent traffic, growing',
    formats: 'jsonl, parquet',
  },
  {
    id: 'mcp_ecosystem_telemetry',
    name: 'MCP Ecosystem Telemetry',
    refresh: 'Daily',
    priceUsd: 500,
    audience: 'MCP infrastructure vendors, agent platform researchers, ecosystem analysts',
    description:
      'Daily snapshots of the official Model Context Protocol server registry: total servers, active/deprecated, daily added/removed, by-category counts.',
    scale: 'Full MCP registry, daily since 2026',
    formats: 'jsonl, csv',
  },
];

const BREADCRUMBS = [
  { name: 'Home', url: 'https://tensorfeed.ai' },
  { name: 'Data Licensing', url: 'https://tensorfeed.ai/data-licensing' },
];

export default function DataLicensingPage() {
  return (
    <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <BreadcrumbListJsonLd items={BREADCRUMBS} />

      <header className="mb-10">
        <div className="flex items-center gap-3 mb-3">
          <div className="p-2 rounded-lg bg-accent-primary/10">
            <Database className="w-7 h-7 text-accent-primary" />
          </div>
          <h1 className="text-3xl sm:text-4xl font-bold text-text-primary">
            Institutional Data Licensing
          </h1>
        </div>
        <p className="text-text-secondary text-lg max-w-3xl leading-relaxed">
          Bulk data products for buyers that don&apos;t fit the per-call agent model: hedge
          funds tracking AI ecosystem signals, AI research firms with proprietary models,
          training-data buyers, news aggregators, MCP infrastructure vendors. Six datasets
          in v1, scoped against your actual needs at intake.
        </p>
        <div className="mt-5 flex flex-wrap items-center gap-2 text-sm">
          <Link
            href="/api/data-licensing"
            className="px-3 py-1.5 rounded bg-bg-tertiary text-accent-primary hover:underline font-mono"
          >
            /api/data-licensing
          </Link>
          <Link
            href="/api/payment/info"
            className="px-3 py-1.5 rounded bg-bg-tertiary text-accent-primary hover:underline"
          >
            payment surfaces
          </Link>
        </div>
      </header>

      <section className="mb-10 bg-gradient-to-br from-accent-primary/10 to-accent-primary/5 border border-accent-primary/20 rounded-xl p-6">
        <div className="flex items-start gap-3">
          <FileText className="w-5 h-5 text-accent-primary shrink-0 mt-0.5" />
          <div className="text-sm text-text-secondary leading-relaxed">
            <strong className="text-text-primary">License type:</strong> enterprise
            commercial license, distinct from the inference-only license on the per-call
            premium API. Bulk redistribution within the licensed buyer&apos;s organization
            is permitted; resale to third parties or public republication requires a separate
            agreement.
          </div>
        </div>
      </section>

      <section className="mb-10">
        <h2 className="text-2xl font-semibold text-text-primary mb-4">Available datasets</h2>
        <div className="grid gap-4">
          {DATASETS.map(d => (
            <div
              key={d.id}
              className="bg-bg-secondary border border-border rounded-lg p-5"
            >
              <div className="flex items-baseline justify-between gap-3 mb-2 flex-wrap">
                <h3 className="text-lg font-semibold text-text-primary">{d.name}</h3>
                <div className="text-sm text-text-muted font-mono shrink-0">
                  ${d.priceUsd.toLocaleString()} starting · refresh: {d.refresh}
                </div>
              </div>
              <p className="text-sm text-text-secondary leading-relaxed mb-3">
                {d.description}
              </p>
              <div className="grid gap-1.5 text-xs text-text-muted sm:grid-cols-3">
                <div>
                  <span className="font-mono uppercase tracking-wide">Audience</span>
                  <div className="mt-0.5 text-text-secondary">{d.audience}</div>
                </div>
                <div>
                  <span className="font-mono uppercase tracking-wide">Scale</span>
                  <div className="mt-0.5 text-text-secondary">{d.scale}</div>
                </div>
                <div>
                  <span className="font-mono uppercase tracking-wide">Formats</span>
                  <div className="mt-0.5 text-text-secondary font-mono">{d.formats}</div>
                </div>
              </div>
            </div>
          ))}
        </div>
      </section>

      <section className="mb-10">
        <h2 className="text-2xl font-semibold text-text-primary mb-4">Process</h2>
        <ol className="space-y-3 max-w-3xl">
          {[
            'Email contact@tensorfeed.ai with the dataset id(s), your buyer organization, and the date window or recurrence cadence.',
            'We confirm scope, finalize pricing (suggested entries are starting points; bundles, recurring deliveries, and custom date ranges are negotiable), and send a per-customer signed delivery URL.',
            'You pay via USDC on Base (lowest friction), USDC over x402, or wire transfer. Delivery URL becomes active on confirmed payment.',
            'For recurring deliveries, we set up a per-customer cron + per-customer S3 prefix.',
          ].map((step, i) => (
            <li key={i} className="flex gap-3 text-text-secondary leading-relaxed">
              <span className="font-mono text-accent-primary shrink-0">{i + 1}.</span>
              <span>{step}</span>
            </li>
          ))}
        </ol>
      </section>

      <section className="bg-bg-secondary border border-border rounded-lg p-5 mb-8">
        <div className="flex items-start gap-3">
          <Mail className="w-5 h-5 text-accent-primary shrink-0 mt-0.5" />
          <div className="text-sm text-text-secondary leading-relaxed">
            <strong className="text-text-primary">Custom dataset?</strong> If TensorFeed
            tracks data you want and it&apos;s not on this list, ask. Most adjacent slices
            are derivable from data already in the system.
            <Link
              href="mailto:contact@tensorfeed.ai?subject=Custom%20dataset%20inquiry"
              className="ml-1 text-accent-primary hover:underline"
            >
              Email contact@tensorfeed.ai
            </Link>
            .
          </div>
        </div>
      </section>

      <section className="text-sm text-text-muted">
        <Link
          href="/services"
          className="inline-flex items-center gap-1.5 text-accent-primary hover:underline"
        >
          Need integration work alongside the data feed? See /services{' '}
          <ArrowRight className="w-4 h-4" />
        </Link>
      </section>
    </div>
  );
}
