import { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { ArrowLeft, ExternalLink } from 'lucide-react';
import { ArticleJsonLd, FAQPageJsonLd } from '@/components/seo/JsonLd';
import { AI_COMPANIES, findCompanyByTicker, allTickers } from '@/data/ai-companies/companies';
import { CATEGORY_LABEL } from '@/data/ai-companies/types';
import { ORIGINALS } from '@/lib/originals-directory';
import TickerLivePanels from './TickerLivePanels';

export function generateStaticParams() {
  return AI_COMPANIES.map((c) => ({ ticker: c.ticker.toLowerCase() }));
}

interface RouteParams {
  params: { ticker: string };
}

export function generateMetadata({ params }: RouteParams): Metadata {
  const company = findCompanyByTicker(params.ticker);
  if (!company) {
    return {
      title: 'Unknown ticker | TensorFeed',
      description: 'This ticker is not in the TensorFeed AI bellwether cohort.',
    };
  }
  const url = `https://tensorfeed.ai/ai-stocks/${company.ticker.toLowerCase()}`;
  return {
    title: `${company.ticker} (${company.display_name}) AI Intelligence | TensorFeed`,
    description: `${company.display_name} AI exposure: ${company.ai_angle} Recent SEC filings, AI-tagged news mentions, and TensorFeed editorial coverage. Free, sourced, agent-readable.`,
    alternates: { canonical: url },
    openGraph: {
      type: 'website',
      url,
      title: `${company.ticker} AI Intelligence | TensorFeed`,
      description: `${company.display_name}: ${company.ai_angle}`,
      siteName: 'TensorFeed.ai',
      images: [{ url: '/tensorfeed-logo.png', width: 1024, height: 1024 }],
    },
    twitter: {
      card: 'summary',
      title: `${company.ticker} AI Intelligence | TensorFeed`,
      description: `${company.display_name}: ${company.ai_angle}`,
    },
  };
}

export default function TickerPage({ params }: RouteParams) {
  const company = findCompanyByTicker(params.ticker);
  if (!company) {
    notFound();
  }

  const relatedOriginals = ORIGINALS.filter((article) => {
    const haystack = `${article.title} ${article.description}`.toLowerCase();
    return company.news_aliases.some((alias) => haystack.includes(alias.toLowerCase()));
  }).slice(0, 6);

  const faqs = [
    {
      question: `Why is ${company.ticker} in TensorFeed's AI cohort?`,
      answer: company.ai_angle,
    },
    {
      question: `Where does TensorFeed get filings for ${company.ticker}?`,
      answer: `Recent SEC filings come from data.sec.gov/submissions (public domain, 17 USC 105), refreshed every 6 hours. Full list at /api/sec/filings/recent?ticker=${company.ticker} or /api/sec/filings/${company.cik}/recent for the per-company endpoint.`,
    },
    {
      question: `Does TensorFeed publish price quotes or trading recommendations?`,
      answer:
        'No. TensorFeed only redistributes openly licensed data (SEC public domain, MIT/CC-BY corpora, our own editorial). Live quotes require an NYSE or NASDAQ licensing arrangement; your broker is the right surface for execution. We provide context, not advice.',
    },
  ];

  const url = `https://tensorfeed.ai/ai-stocks/${company.ticker.toLowerCase()}`;

  return (
    <main className="max-w-4xl mx-auto px-4 sm:px-6 py-10">
      <ArticleJsonLd
        title={`${company.ticker} (${company.display_name}) AI Intelligence`}
        description={company.ai_angle}
        datePublished={new Date().toISOString().slice(0, 10)}
        author="TensorFeed"
        url={url}
      />
      <FAQPageJsonLd faqs={faqs} />

      <Link
        href="/ai-stocks"
        className="inline-flex items-center gap-1.5 text-sm text-text-muted hover:text-accent-primary transition-colors mb-8"
      >
        <ArrowLeft className="w-4 h-4" />
        Back to AI Stocks
      </Link>

      <header className="mb-10">
        <div className="flex items-baseline gap-4 mb-3 flex-wrap">
          <span className="font-mono text-4xl sm:text-5xl font-bold text-text-primary">
            {company.ticker}
          </span>
          <span className="text-xl text-text-secondary">{company.display_name}</span>
        </div>
        <div className="flex items-center gap-3 text-sm text-text-muted mb-5">
          <span className="px-2 py-0.5 rounded-md bg-bg-tertiary border border-border">
            {company.exchange}
          </span>
          <span>&middot;</span>
          <span>{CATEGORY_LABEL[company.category]}</span>
          <span>&middot;</span>
          <Link
            href={company.website}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1 text-text-secondary hover:text-accent-primary transition-colors"
          >
            {company.website.replace(/^https?:\/\//, '')}
            <ExternalLink className="w-3 h-3" />
          </Link>
        </div>
        <p className="text-lg text-text-secondary leading-relaxed">{company.ai_angle}</p>
      </header>

      <TickerLivePanels ticker={company.ticker} cik={company.cik} aliases={company.news_aliases} />

      {relatedOriginals.length > 0 && (
        <section className="mt-12">
          <h2 className="text-2xl font-semibold text-text-primary mb-4">
            TensorFeed editorial mentioning {company.display_name}
          </h2>
          <div className="grid gap-3">
            {relatedOriginals.map((article) => (
              <Link
                key={article.slug}
                href={`/originals/${article.slug}`}
                className="block bg-bg-secondary border border-border rounded-lg p-4 hover:border-accent-primary transition-colors"
              >
                <div className="text-text-primary font-medium mb-1">{article.title}</div>
                <div className="text-sm text-text-muted">
                  {article.author} &middot; {article.date} &middot; {article.readTime}
                </div>
              </Link>
            ))}
          </div>
        </section>
      )}

      <section className="mt-12 mb-10">
        <h2 className="text-2xl font-semibold text-text-primary mb-4">FAQ</h2>
        <div className="space-y-3">
          {faqs.map((faq) => (
            <details
              key={faq.question}
              className="bg-bg-secondary border border-border rounded-lg p-5"
            >
              <summary className="cursor-pointer text-text-primary font-medium">
                {faq.question}
              </summary>
              <p className="mt-3 text-text-secondary leading-relaxed">{faq.answer}</p>
            </details>
          ))}
        </div>
      </section>

      <footer className="mt-12 pt-6 border-t border-border text-sm text-text-muted">
        TensorFeed.ai is data infrastructure, not a brokerage. This page is for research only; it
        is not investment advice. All data points link to primary sources. SEC filings: public
        domain. News headlines: source-attributed snippets.
      </footer>
    </main>
  );
}
