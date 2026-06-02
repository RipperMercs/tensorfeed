import { Metadata } from 'next';
import Link from 'next/link';
import { ArrowRight, TrendingUp, Building2, Cpu, Cloud, Server, Sparkles } from 'lucide-react';
import { DatasetJsonLd, FAQPageJsonLd, ItemListJsonLd } from '@/components/seo/JsonLd';
import { AI_COMPANIES } from '@/data/ai-companies/companies';
import { CATEGORY_LABEL, type AICompanyCategory } from '@/data/ai-companies/types';

const CATEGORY_ICON: Record<AICompanyCategory, React.ComponentType<{ className?: string }>> = {
  silicon: Cpu,
  hyperscaler: Cloud,
  'ai-native': Sparkles,
  infra: Server,
  consumer: Building2,
};

const CATEGORY_ACCENT: Record<AICompanyCategory, string> = {
  silicon: 'text-emerald-400 border-emerald-500/30 bg-emerald-500/10',
  hyperscaler: 'text-sky-400 border-sky-500/30 bg-sky-500/10',
  'ai-native': 'text-violet-400 border-violet-500/30 bg-violet-500/10',
  infra: 'text-amber-400 border-amber-500/30 bg-amber-500/10',
  consumer: 'text-rose-400 border-rose-500/30 bg-rose-500/10',
};

const FAQS = [
  {
    question: 'What is on this page?',
    answer:
      'A curated registry of AI-relevant public companies. The cohort spans silicon (NVDA, AMD, AVGO, TSM, ARM), hyperscalers (MSFT, GOOGL, AMZN, ORCL), AI-native software (PLTR), AI infrastructure integrators (SMCI), and consumer + multi-product operators with material AI exposure (AAPL, META, TSLA). Each company has a dedicated page aggregating recent SEC filings, AI-tagged news mentions, related TensorFeed editorial, and links to primary sources. Editorial curation, redistribution-friendly data only.',
  },
  {
    question: 'Why these companies and not others?',
    answer:
      'The cohort is anchored on the AI bellwether list our SEC filings cron tracks at /api/sec/filings/recent. Inclusion criteria: publicly traded on a US exchange, AI exposure material to the equity story (not "they used Copilot once"), and a clean primary-source trail. Expansion candidates (NET, MDB, SNOW, DDOG, CRWD, CRM, VRT) sit in the queue; each addition costs Worker cron capacity, so the cohort grows deliberately.',
  },
  {
    question: 'Is this trading advice?',
    answer:
      'No. This is structured AI-sector intelligence designed for agents and humans doing their own research. Every datapoint is sourced and linked, no analyst ratings, no price targets, no recommendations. TensorFeed is data infrastructure, not a brokerage.',
  },
  {
    question: 'How fresh is the data on each company page?',
    answer:
      'SEC filings refresh every 6 hours from data.sec.gov (public domain). The news panel pulls live from /api/news on page load. The cohort registry on this index is a hand-curated static list updated when a company joins or leaves the AI bellwether list. The "last filing" timestamps shown on cards reflect the cohort snapshot at the latest build; click into a page for the live filing list.',
  },
  {
    question: 'How does this connect to TensorFeed agent payments?',
    answer:
      'The free /ai-stocks pages are the human view. Agents doing trade research can hit /api/sec/filings/recent?ticker=X (free) for filings, /api/news for headlines, and the forthcoming /api/premium/ai-companies/{ticker} (paid) for a single aggregated JSON envelope per company. The premium endpoint will be x402-priced and registered through the CDP Bazaar so any agentic-trading agent with a Robinhood Agentic Credit Card (or another budget rail) can call it directly.',
  },
  {
    question: 'Why no real-time price quotes?',
    answer:
      'NYSE and NASDAQ quote licensing makes redistribution of live price data prohibitively expensive and contractually risky. TensorFeed only ships data we can redistribute cleanly under permissive licenses (SEC public domain, MIT/CC-BY corpora, our own editorial). For live quotes, your broker is the right surface.',
  },
];

export const metadata: Metadata = {
  title: 'AI Stocks: Public-Company Intelligence Hub | TensorFeed',
  description:
    'AI-sector intelligence for 14 public companies (NVDA, AMD, AVGO, TSM, ARM, MSFT, GOOGL, AMZN, ORCL, PLTR, SMCI, AAPL, META, TSLA). SEC filings, AI-tagged news, funding events, editorial coverage. Free, sourced, agent-readable. Premium per-ticker JSON envelope at /api/premium/ai-companies/{ticker}.',
  alternates: { canonical: 'https://tensorfeed.ai/ai-stocks' },
  openGraph: {
    type: 'website',
    url: 'https://tensorfeed.ai/ai-stocks',
    title: 'TensorFeed AI Stocks Hub',
    description:
      '14 AI-relevant public companies, SEC filings, news, funding, editorial. Built for agents and humans.',
    siteName: 'TensorFeed.ai',
    images: [{ url: '/tensorfeed-logo.png', width: 1024, height: 1024 }],
  },
  twitter: {
    card: 'summary',
    title: 'TensorFeed AI Stocks Hub',
    description: '14 AI-relevant public companies, sourced filings + news + editorial.',
  },
};

export default function AIStocksHub() {
  const grouped = AI_COMPANIES.reduce<Record<AICompanyCategory, typeof AI_COMPANIES[number][]>>(
    (acc, company) => {
      if (!acc[company.category]) acc[company.category] = [];
      acc[company.category].push(company);
      return acc;
    },
    {} as Record<AICompanyCategory, typeof AI_COMPANIES[number][]>
  );

  const categoryOrder: AICompanyCategory[] = [
    'silicon',
    'hyperscaler',
    'ai-native',
    'infra',
    'consumer',
  ];

  return (
    <main className="max-w-6xl mx-auto px-4 sm:px-6 py-10">
      <DatasetJsonLd
        name="TensorFeed AI Stocks Hub"
        description="Curated AI-relevant public-company cohort with SEC filings, news, and editorial coverage."
        url="https://tensorfeed.ai/ai-stocks"
      />
      <ItemListJsonLd
        name="TensorFeed AI Stocks Cohort"
        description="Hand-curated list of AI-relevant public companies tracked by TensorFeed, each linking to a per-company intelligence page."
        url="https://tensorfeed.ai/ai-stocks"
        items={AI_COMPANIES.map((company) => ({
          name: `${company.display_name} (${company.ticker})`,
          url: `/ai-stocks/${company.ticker.toLowerCase()}`,
        }))}
      />
      <FAQPageJsonLd faqs={FAQS} />

      <header className="mb-10">
        <div className="flex items-center gap-2 text-sm text-text-muted mb-4">
          <Link href="/" className="hover:text-accent-primary transition-colors">
            Home
          </Link>
          <span>/</span>
          <span className="text-text-secondary">AI Stocks</span>
        </div>
        <h1 className="text-3xl sm:text-4xl font-bold text-text-primary mb-4 leading-tight">
          AI Stocks: Public-Company Intelligence Hub
        </h1>
        <p className="text-lg text-text-secondary leading-relaxed max-w-3xl">
          14 AI-relevant public companies, hand-curated. Each ticker links to a per-company page
          aggregating recent SEC filings, AI-tagged news mentions, and TensorFeed editorial.
          Built for human readers and AI agents doing pre-trade research. Free, sourced, no quotes
          or recommendations.
        </p>
        <div className="mt-6 flex flex-wrap gap-3 text-sm">
          <Link
            href="/api/sec/filings/recent"
            className="inline-flex items-center gap-1.5 bg-bg-secondary border border-border rounded-md px-3 py-1.5 text-text-secondary hover:border-accent-primary transition-colors"
          >
            <TrendingUp className="w-3.5 h-3.5" />
            /api/sec/filings/recent
          </Link>
          <Link
            href="/funding/portfolio"
            className="inline-flex items-center gap-1.5 bg-bg-secondary border border-border rounded-md px-3 py-1.5 text-text-secondary hover:border-accent-primary transition-colors"
          >
            <ArrowRight className="w-3.5 h-3.5" />
            /funding/portfolio (private)
          </Link>
          <Link
            href="/ai-infrastructure"
            className="inline-flex items-center gap-1.5 bg-bg-secondary border border-border rounded-md px-3 py-1.5 text-text-secondary hover:border-accent-primary transition-colors"
          >
            <Server className="w-3.5 h-3.5" />
            /ai-infrastructure
          </Link>
        </div>
      </header>

      {categoryOrder.map((category) => {
        const companies = grouped[category] ?? [];
        if (companies.length === 0) return null;
        const Icon = CATEGORY_ICON[category];
        return (
          <section key={category} className="mb-12">
            <div className="flex items-center gap-2 mb-4">
              <Icon className="w-5 h-5 text-text-secondary" />
              <h2 className="text-2xl font-semibold text-text-primary">
                {CATEGORY_LABEL[category]}
              </h2>
              <span className="text-sm text-text-muted">({companies.length})</span>
            </div>
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {companies.map((company) => (
                <Link
                  key={company.ticker}
                  href={`/ai-stocks/${company.ticker.toLowerCase()}`}
                  className="block bg-bg-secondary border border-border rounded-lg p-5 hover:border-accent-primary transition-colors"
                >
                  <div className="flex items-center justify-between mb-3">
                    <span className="font-mono text-lg font-semibold text-text-primary">
                      {company.ticker}
                    </span>
                    <span
                      className={`text-xs px-2 py-0.5 rounded-md border ${CATEGORY_ACCENT[category]}`}
                    >
                      {company.exchange}
                    </span>
                  </div>
                  <div className="text-sm text-text-primary font-medium mb-2">
                    {company.display_name}
                  </div>
                  <p className="text-sm text-text-secondary leading-relaxed line-clamp-3">
                    {company.ai_angle}
                  </p>
                </Link>
              ))}
            </div>
          </section>
        );
      })}

      <section className="mt-16 mb-10">
        <h2 className="text-2xl font-semibold text-text-primary mb-6">FAQ</h2>
        <div className="space-y-4">
          {FAQS.map((faq) => (
            <details
              key={faq.question}
              className="bg-bg-secondary border border-border rounded-lg p-5 group"
            >
              <summary className="cursor-pointer text-text-primary font-medium list-none flex items-center justify-between">
                <span>{faq.question}</span>
                <ArrowRight className="w-4 h-4 text-text-muted group-open:rotate-90 transition-transform" />
              </summary>
              <p className="mt-3 text-text-secondary leading-relaxed">{faq.answer}</p>
            </details>
          ))}
        </div>
      </section>
    </main>
  );
}
