'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { ExternalLink, FileText, Newspaper, Loader2 } from 'lucide-react';

interface SecFiling {
  accession_number: string;
  form: string;
  filing_date: string;
  report_date: string | null;
  primary_doc_description: string;
  primary_doc_url: string;
  index_url: string;
}

interface NewsArticle {
  id: string;
  title: string;
  url: string;
  source: string;
  snippet?: string;
  publishedAt: string;
}

interface TickerLivePanelsProps {
  ticker: string;
  cik: string;
  aliases: ReadonlyArray<string>;
}

export default function TickerLivePanels({ ticker, cik, aliases }: TickerLivePanelsProps) {
  const [filings, setFilings] = useState<SecFiling[] | null>(null);
  const [filingsError, setFilingsError] = useState<string | null>(null);
  const [news, setNews] = useState<NewsArticle[] | null>(null);
  const [newsError, setNewsError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    fetch(`/api/sec/filings/${cik}/recent`)
      .then(async (r) => {
        if (!r.ok) throw new Error(`HTTP ${r.status}`);
        return r.json();
      })
      .then((data) => {
        if (cancelled) return;
        const items: SecFiling[] = Array.isArray(data?.filings) ? data.filings.slice(0, 10) : [];
        setFilings(items);
      })
      .catch((err) => {
        if (cancelled) return;
        setFilingsError(err instanceof Error ? err.message : 'unknown error');
      });
    return () => {
      cancelled = true;
    };
  }, [cik]);

  useEffect(() => {
    let cancelled = false;
    fetch('/api/news?limit=100')
      .then(async (r) => {
        if (!r.ok) throw new Error(`HTTP ${r.status}`);
        return r.json();
      })
      .then((data) => {
        if (cancelled) return;
        const articles: NewsArticle[] = Array.isArray(data?.articles) ? data.articles : [];
        const lowerAliases = aliases.map((a) => a.toLowerCase());
        const matched = articles.filter((article) => {
          const haystack = `${article.title} ${article.snippet ?? ''}`.toLowerCase();
          return lowerAliases.some((alias) => haystack.includes(alias));
        });
        setNews(matched.slice(0, 10));
      })
      .catch((err) => {
        if (cancelled) return;
        setNewsError(err instanceof Error ? err.message : 'unknown error');
      });
    return () => {
      cancelled = true;
    };
  }, [aliases]);

  return (
    <div className="grid gap-6 md:grid-cols-2">
      <section className="bg-bg-secondary border border-border rounded-lg p-5">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <FileText className="w-5 h-5 text-text-secondary" />
            <h2 className="text-lg font-semibold text-text-primary">Recent SEC filings</h2>
          </div>
          <Link
            href={`/api/sec/filings/recent?ticker=${ticker}`}
            className="text-xs text-text-muted hover:text-accent-primary transition-colors"
          >
            JSON
          </Link>
        </div>
        {filings === null && filingsError === null && (
          <div className="flex items-center gap-2 text-sm text-text-muted">
            <Loader2 className="w-4 h-4 animate-spin" />
            Loading filings
          </div>
        )}
        {filingsError !== null && (
          <p className="text-sm text-text-muted">
            Could not load filings ({filingsError}). Try the{' '}
            <Link
              href={`/api/sec/filings/${cik}/recent`}
              className="text-accent-primary hover:underline"
            >
              raw endpoint
            </Link>
            .
          </p>
        )}
        {filings !== null && filings.length === 0 && (
          <p className="text-sm text-text-muted">No recent filings in the snapshot.</p>
        )}
        {filings !== null && filings.length > 0 && (
          <ul className="space-y-3">
            {filings.map((filing) => (
              <li
                key={filing.accession_number}
                className="border-b border-border pb-3 last:border-b-0 last:pb-0"
              >
                <div className="flex items-center gap-2 mb-1">
                  <span className="font-mono text-xs px-1.5 py-0.5 rounded bg-bg-tertiary text-text-primary">
                    {filing.form}
                  </span>
                  <time className="text-xs text-text-muted">{filing.filing_date}</time>
                </div>
                <Link
                  href={filing.primary_doc_url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-sm text-text-secondary hover:text-accent-primary transition-colors inline-flex items-center gap-1"
                >
                  {filing.primary_doc_description || filing.form}
                  <ExternalLink className="w-3 h-3" />
                </Link>
              </li>
            ))}
          </ul>
        )}
      </section>

      <section className="bg-bg-secondary border border-border rounded-lg p-5">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <Newspaper className="w-5 h-5 text-text-secondary" />
            <h2 className="text-lg font-semibold text-text-primary">AI news mentions</h2>
          </div>
          <Link
            href="/api/news"
            className="text-xs text-text-muted hover:text-accent-primary transition-colors"
          >
            JSON
          </Link>
        </div>
        {news === null && newsError === null && (
          <div className="flex items-center gap-2 text-sm text-text-muted">
            <Loader2 className="w-4 h-4 animate-spin" />
            Scanning news feed
          </div>
        )}
        {newsError !== null && (
          <p className="text-sm text-text-muted">Could not load news ({newsError}).</p>
        )}
        {news !== null && news.length === 0 && (
          <p className="text-sm text-text-muted">
            No recent mentions in the last 100 headlines. The full feed is at{' '}
            <Link href="/api/news" className="text-accent-primary hover:underline">
              /api/news
            </Link>
            .
          </p>
        )}
        {news !== null && news.length > 0 && (
          <ul className="space-y-3">
            {news.map((article) => (
              <li
                key={article.id}
                className="border-b border-border pb-3 last:border-b-0 last:pb-0"
              >
                <Link
                  href={article.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-sm text-text-primary hover:text-accent-primary transition-colors block mb-1"
                >
                  {article.title}
                </Link>
                <div className="text-xs text-text-muted">
                  {article.source} &middot;{' '}
                  <time>{new Date(article.publishedAt).toISOString().slice(0, 10)}</time>
                </div>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
