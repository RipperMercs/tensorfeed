'use client';

import { useEffect, useState } from 'react';
import { ExternalLink } from 'lucide-react';

interface SportsArticle {
  id: string;
  title: string;
  url: string;
  source: string;
  source_domain: string;
  snippet: string;
  publishedAt: string;
}

interface NewsResponse {
  ok: true;
  count: number;
  articles: SportsArticle[];
}

const REFRESH_INTERVAL_MS = 60 * 1000;

function relativeTime(iso: string): string {
  const t = Date.parse(iso);
  if (Number.isNaN(t)) return '';
  const diff = Date.now() - t;
  const minutes = Math.floor(diff / 60_000);
  if (minutes < 1) return 'just now';
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  if (days < 7) return `${days}d ago`;
  const weeks = Math.floor(days / 7);
  return `${weeks}w ago`;
}

export default function NFLNewsWidget() {
  const [articles, setArticles] = useState<SportsArticle[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    async function load() {
      try {
        const res = await fetch('/api/sports/nfl/news?limit=15');
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const data = (await res.json()) as NewsResponse;
        if (!cancelled) {
          setArticles(data.articles);
          setError(null);
        }
      } catch (e) {
        if (!cancelled) {
          setError(e instanceof Error ? e.message : 'failed to load');
        }
      }
    }
    load();
    const id = setInterval(load, REFRESH_INTERVAL_MS);
    return () => {
      cancelled = true;
      clearInterval(id);
    };
  }, []);

  if (error && !articles) {
    return (
      <div className="text-sm text-text-secondary py-4">
        News feed unavailable. <span className="text-text-tertiary">({error})</span>
      </div>
    );
  }

  if (!articles) {
    return (
      <div className="space-y-3">
        {Array.from({ length: 5 }).map((_, i) => (
          <div key={i} className="animate-pulse">
            <div className="h-4 bg-bg-tertiary rounded w-3/4 mb-1" />
            <div className="h-3 bg-bg-tertiary rounded w-1/2" />
          </div>
        ))}
      </div>
    );
  }

  if (articles.length === 0) {
    return (
      <div className="text-sm text-text-secondary py-4">
        No NFL articles yet. The hourly cron may not have fired since deploy.
      </div>
    );
  }

  return (
    <ul className="space-y-3">
      {articles.map(a => (
        <li key={a.id} className="border-b border-bg-tertiary pb-3 last:border-b-0">
          <a
            href={a.url}
            target="_blank"
            rel="noopener noreferrer"
            className="group flex items-start gap-2"
          >
            <ExternalLink className="w-3.5 h-3.5 text-text-tertiary mt-1 flex-shrink-0 group-hover:text-accent-primary" />
            <div className="flex-1 min-w-0">
              <div className="font-medium text-text-primary group-hover:text-accent-primary leading-snug">
                {a.title}
              </div>
              {a.snippet && (
                <div className="text-sm text-text-secondary mt-1 leading-relaxed line-clamp-2">
                  {a.snippet}
                </div>
              )}
              <div className="text-xs text-text-tertiary mt-1">
                {a.source} <span className="mx-1">&middot;</span> {relativeTime(a.publishedAt)}
              </div>
            </div>
          </a>
        </li>
      ))}
    </ul>
  );
}
