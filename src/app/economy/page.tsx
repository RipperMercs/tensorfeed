import { Metadata } from 'next';
import { LineChart } from 'lucide-react';
import { DatasetJsonLd, FAQPageJsonLd } from '@/components/seo/JsonLd';
import IndicatorsWidget from '@/components/economy/IndicatorsWidget';

export const metadata: Metadata = {
  title: 'Macro Economic Indicators API | TensorFeed Economy',
  description:
    'Free API for US macro economic indicators. CPI, unemployment, payrolls, JOLTS via BLS plus federal funds rate, treasuries, GDP, M2, mortgage rate, USD index, oil via FRED. Public-domain government data, agent-friendly JSON.',
  alternates: { canonical: 'https://tensorfeed.ai/economy' },
  openGraph: {
    type: 'website',
    url: 'https://tensorfeed.ai/economy',
    title: 'TensorFeed Economy: Macro Indicators for Agents',
    description:
      'BLS + FRED public-domain economic indicators in one agent-friendly JSON API. Daily refresh, structured attribution.',
    siteName: 'TensorFeed.ai',
    images: [{ url: '/tensorfeed-logo.png', width: 1024, height: 1024 }],
  },
  twitter: {
    card: 'summary',
    title: 'TensorFeed Economy API',
    description: 'BLS + FRED macro indicators. Public domain. Free JSON for agents.',
  },
};

const FAQS = [
  {
    question: 'Where does the data come from?',
    answer:
      'BLS series are pulled daily from the Bureau of Labor Statistics public V1 API; FRED series are pulled daily from the Federal Reserve Bank of St. Louis FRED API. Both are US government data and in the public domain. Citation is requested but not legally required; we ship attribution on every response anyway.',
  },
  {
    question: 'How often is the data refreshed?',
    answer:
      'Daily. BLS at 05:00 UTC, FRED at 05:30 UTC. The underlying series have their own native cadences (monthly for most BLS, daily/weekly/monthly/quarterly for FRED), and we keep the most recent observations on each (24 monthly observations for BLS, up to 90 observations for FRED).',
  },
  {
    question: 'Why these specific series?',
    answer:
      'Editorial choice. BLS owns labor + prices + jobs (CPI, core CPI, PPI, unemployment, payrolls, hourly earnings, weekly hours, labor force participation, JOLTS openings, JOLTS hires). FRED owns rates + money + commodities + dollar (effective fed funds, 10Y/2Y treasuries plus the 10Y-2Y spread, GDP, M2, 30Y mortgage, trade-weighted USD index, WTI crude). Together that covers the macro signal matrix most US-focused agents care about.',
  },
  {
    question: 'Can I use this commercially?',
    answer:
      'Yes. Both BLS and FRED data are US government work and free for commercial use, including redistribution. The TensorFeed snapshot is a curated subset of public-domain series with month-over-month delta computed; the curation is editorial and the underlying series links back to its canonical government page.',
  },
];

export default function EconomyPage() {
  return (
    <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <DatasetJsonLd
        name="TensorFeed Macro Economic Indicators"
        description="US macro economic indicators (BLS + FRED, public-domain government data) in one agent-friendly JSON API."
        url="https://tensorfeed.ai/economy"
      />
      <FAQPageJsonLd faqs={FAQS} />

      <div className="mb-10">
        <div className="flex items-center gap-3 mb-3">
          <div className="p-2 rounded-lg bg-accent-primary/10">
            <LineChart className="w-7 h-7 text-accent-primary" />
          </div>
          <h1 className="text-3xl sm:text-4xl font-bold text-text-primary">Economy</h1>
        </div>
        <p className="text-text-secondary text-lg max-w-2xl mb-4">
          US macro indicators for agents. BLS and FRED in one place, public-domain, free JSON.
        </p>
        <div className="text-text-secondary leading-relaxed max-w-3xl space-y-3 text-sm">
          <p>
            Two of the cleanest free data sources in the US ecosystem are BLS and FRED. Both are
            US government work, both are in the public domain, both have stable documented APIs.
            What they have not had is a single agent-shaped JSON surface that joins them.
          </p>
          <p>
            This page surfaces a curated 20-series matrix updated daily: BLS owns labor and
            prices, FRED owns rates and money. Each tile links to the canonical series page on
            the source agency for verification.
          </p>
        </div>
      </div>

      <section className="mb-12">
        <div className="flex items-baseline justify-between mb-4">
          <h2 className="text-2xl font-bold text-text-primary">Bureau of Labor Statistics</h2>
          <span className="text-xs text-text-tertiary font-mono">refreshed 05:00 UTC</span>
        </div>
        <p className="text-sm text-text-secondary mb-5">
          Labor market, prices, productivity. Curated 10-series set with month-over-month delta.
        </p>
        <IndicatorsWidget
          endpoint="/api/economy/bls/indicators"
          emptyMessage="BLS snapshot not yet captured. Daily refresh runs at 05:00 UTC."
        />
      </section>

      <section className="mb-12">
        <div className="flex items-baseline justify-between mb-4">
          <h2 className="text-2xl font-bold text-text-primary">Federal Reserve Economic Data</h2>
          <span className="text-xs text-text-tertiary font-mono">refreshed 05:30 UTC</span>
        </div>
        <p className="text-sm text-text-secondary mb-5">
          Rates, yield curve, money supply, FX, commodities. Mixed native frequencies (daily,
          weekly, monthly, quarterly).
        </p>
        <IndicatorsWidget
          endpoint="/api/economy/fred/indicators"
          emptyMessage="FRED snapshot unavailable. Endpoint requires a free FRED_API_KEY Worker secret; daily refresh runs at 05:30 UTC."
        />
      </section>

      <div className="border border-bg-tertiary rounded-lg p-5 bg-bg-secondary/50 mb-10">
        <h2 className="text-lg font-semibold text-text-primary mb-3">Free agent endpoints</h2>
        <ul className="space-y-2 text-sm">
          <li>
            <code className="bg-bg-tertiary px-2 py-0.5 rounded text-accent-primary">/api/economy/bls/indicators</code>
            <span className="text-text-secondary ml-2 block mt-1">
              BLS curated set with 24-month history per series. Filter:{' '}
              <code className="bg-bg-tertiary px-1 rounded">?category=inflation|employment|wages|labor-force|jolts</code>.
            </span>
          </li>
          <li>
            <code className="bg-bg-tertiary px-2 py-0.5 rounded text-accent-primary">/api/economy/fred/indicators</code>
            <span className="text-text-secondary ml-2 block mt-1">
              FRED curated set with up to 90 observations per series at native frequency. Filter:{' '}
              <code className="bg-bg-tertiary px-1 rounded">?category=rates|gdp|money|housing|fx|commodities</code>.
            </span>
          </li>
        </ul>
      </div>

      <div className="border-t border-bg-tertiary pt-6">
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
