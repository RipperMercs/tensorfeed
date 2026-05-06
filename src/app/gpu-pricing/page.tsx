import { Metadata } from 'next';
import { Server } from 'lucide-react';
import { DatasetJsonLd, FAQPageJsonLd } from '@/components/seo/JsonLd';
import GpuPricingTable from '@/components/gpu-pricing/GpuPricingTable';

export const metadata: Metadata = {
  title: 'GPU Rental Pricing Tracker, Live Comparison Across Marketplaces',
  description:
    'Live GPU rental pricing across cloud GPU marketplaces. Compare cheapest H100, H200, A100, RTX 4090, and MI300X rates from Vast.ai and RunPod. Refreshed every 4 hours.',
  alternates: { canonical: 'https://tensorfeed.ai/gpu-pricing' },
  openGraph: {
    type: 'website',
    url: 'https://tensorfeed.ai/gpu-pricing',
    title: 'GPU Rental Pricing Tracker',
    description:
      'Live GPU rental pricing across cloud GPU marketplaces. H100, H200, A100, RTX 4090, MI300X.',
    siteName: 'TensorFeed.ai',
    images: [{ url: '/tensorfeed-logo.png', width: 1024, height: 1024 }],
  },
  twitter: {
    card: 'summary',
    title: 'GPU Rental Pricing Tracker',
    description:
      'Live GPU rental pricing across cloud GPU marketplaces, refreshed every 4 hours.',
  },
};

const FAQS = [
  {
    question: 'Where does TensorFeed get GPU pricing data?',
    answer:
      'Phase 1 sources are Vast.ai (public marketplace API) and RunPod (GraphQL API). Lambda Labs, CoreWeave, Azure, and AWS are planned for phase 2.',
  },
  {
    question: 'How often is the data refreshed?',
    answer:
      'Every 4 hours. A daily snapshot is also captured at 12:45 UTC for the historical price series exposed via the premium API.',
  },
  {
    question: 'What is the difference between on-demand and spot pricing?',
    answer:
      'On-demand is the uninterruptible hourly rate. Spot (or interruptible / bid) is a lower rate where the provider can reclaim the machine on short notice. Spot is great for fault-tolerant batch jobs, not for serving production traffic.',
  },
  {
    question: 'Can I get a programmatic feed?',
    answer:
      'Yes. /api/gpu/pricing returns the full snapshot. /api/gpu/pricing/cheapest?gpu=H100 returns the top 3 cheapest right now. /api/gpu/pricing/series returns the daily historical price series for a canonical GPU. All three are free, no auth required.',
  },
];

export default function GpuPricingPage() {
  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <DatasetJsonLd
        name="TensorFeed GPU Rental Pricing"
        description="Live GPU rental pricing aggregated across cloud GPU marketplaces, refreshed every 4 hours, with daily historical snapshots."
        url="https://tensorfeed.ai/gpu-pricing"
      />
      <FAQPageJsonLd faqs={FAQS} />

      <div className="mb-8">
        <div className="flex items-center gap-3 mb-3">
          <div className="p-2 rounded-lg bg-accent-primary/10">
            <Server className="w-7 h-7 text-accent-primary" />
          </div>
          <h1 className="text-3xl sm:text-4xl font-bold text-text-primary">GPU Rental Pricing</h1>
        </div>
        <p className="text-text-secondary text-lg max-w-2xl mb-4">
          Live cheapest hourly rates across the cloud GPU marketplaces. Refreshed every 4 hours.
        </p>
        <div className="text-text-secondary leading-relaxed max-w-3xl space-y-3 text-sm">
          <p>
            GPU prices move. A100s that cost $4 an hour on a hyperscaler can be $0.80 on a marketplace
            in the same week, and the cheapest provider for an H100 today might be the most expensive
            tomorrow. This page aggregates current per-GPU hourly rates across marketplace providers,
            normalizes their heterogeneous GPU naming into a canonical taxonomy, and surfaces the
            cheapest on-demand and spot price for each GPU class.
          </p>
          <p>
            Sources: RunPod (when an API key is configured) plus a manual snapshot of Lambda Labs
            on-demand pricing from lambda.ai/pricing. CoreWeave public pricing, Azure NC/ND, and AWS
            on-demand are planned next, contingent on per-source ToS review. The data is captured
            daily into a historical snapshot. The 30 to 90 day price series is exposed via{' '}
            <code className="bg-bg-tertiary px-1.5 py-0.5 rounded text-accent-primary text-xs">
              /api/gpu/pricing/series
            </code>
            , free and agent-friendly.
          </p>
        </div>
      </div>

      <GpuPricingTable />

      <div className="mt-10 border border-bg-tertiary rounded-lg p-5 bg-bg-secondary/50">
        <h2 className="text-lg font-semibold text-text-primary mb-2">Free agent endpoints</h2>
        <ul className="space-y-2 text-sm">
          <li>
            <code className="bg-bg-tertiary px-2 py-0.5 rounded text-accent-primary">/api/gpu/pricing</code>
            <span className="text-text-secondary ml-2">Full current snapshot</span>
          </li>
          <li>
            <code className="bg-bg-tertiary px-2 py-0.5 rounded text-accent-primary">/api/gpu/pricing/cheapest?gpu=H100&type=on_demand</code>
            <span className="text-text-secondary ml-2">Top 3 cheapest right now</span>
          </li>
          <li>
            <code className="bg-bg-tertiary px-2 py-0.5 rounded text-accent-primary">/api/gpu/pricing/series?gpu=H100&from=&to=</code>
            <span className="text-text-secondary ml-2 block mt-1">Daily price series, up to 90 days. Backfill is impossible; every day matters.</span>
          </li>
        </ul>
      </div>

      <div className="mt-10 border-t border-bg-tertiary pt-6">
        <h2 className="text-xl font-semibold text-text-primary mb-4">Frequently asked questions</h2>
        <dl className="space-y-4 text-sm">
          {FAQS.map(faq => (
            <div key={faq.question}>
              <dt className="font-semibold text-text-primary mb-1">{faq.question}</dt>
              <dd className="text-text-secondary leading-relaxed">{faq.answer}</dd>
            </div>
          ))}
        </dl>
      </div>
    </div>
  );
}
