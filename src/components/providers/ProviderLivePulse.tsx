'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { Newspaper, GitBranch, Activity, ExternalLink, RefreshCw } from 'lucide-react';

interface ProviderConfig {
  slug: string;
  name: string;
  // Substrings to match against /api/news article source/title for the news feed
  newsMatchers: string[];
  // GitHub org names (lowercased) that the provider publishes from. Pulled out
  // of /api/agents/opportunities by signal + full_name prefix.
  githubOrgs: string[];
  // Match against /api/status entries (case-insensitive substring on name)
  statusMatchers: string[];
}

const CONFIG: Record<string, ProviderConfig> = {
  anthropic: {
    slug: 'anthropic',
    name: 'Anthropic',
    newsMatchers: ['anthropic', 'claude'],
    githubOrgs: ['anthropics'],
    statusMatchers: ['anthropic', 'claude'],
  },
  openai: {
    slug: 'openai',
    name: 'OpenAI',
    newsMatchers: ['openai', 'chatgpt', 'gpt-'],
    githubOrgs: ['openai'],
    statusMatchers: ['openai', 'chatgpt'],
  },
  google: {
    slug: 'google',
    name: 'Google',
    newsMatchers: ['google', 'gemini', 'deepmind'],
    githubOrgs: ['google', 'google-deepmind', 'googleapis'],
    statusMatchers: ['google', 'gemini'],
  },
  meta: {
    slug: 'meta',
    name: 'Meta',
    newsMatchers: ['meta', 'llama'],
    githubOrgs: ['meta-llama', 'facebookresearch'],
    statusMatchers: ['meta'],
  },
  mistral: {
    slug: 'mistral',
    name: 'Mistral',
    newsMatchers: ['mistral'],
    githubOrgs: ['mistralai'],
    statusMatchers: ['mistral'],
  },
  cohere: {
    slug: 'cohere',
    name: 'Cohere',
    newsMatchers: ['cohere'],
    githubOrgs: ['cohere-ai'],
    statusMatchers: ['cohere'],
  },
  deepseek: {
    slug: 'deepseek',
    name: 'DeepSeek',
    newsMatchers: ['deepseek'],
    githubOrgs: ['deepseek-ai'],
    statusMatchers: ['deepseek'],
  },
};

interface NewsArticle {
  title: string;
  url: string;
  source: string;
  publishedAt: string;
  snippet?: string;
}

interface Opportunity {
  full_name: string;
  html_url: string;
  description: string | null;
  stars: number;
  updated_at: string;
  signal: string;
  topics: string[];
}

interface StatusEntry {
  name: string;
  status: string;
  provider?: string;
  updatedAt?: string;
}

function timeAgo(iso: string): string {
  const sec = Math.floor((Date.now() - new Date(iso).getTime()) / 1000);
  if (sec < 60) return 'just now';
  if (sec < 3600) return `${Math.floor(sec / 60)}m ago`;
  if (sec < 86400) return `${Math.floor(sec / 3600)}h ago`;
  return `${Math.floor(sec / 86400)}d ago`;
}

function matchesAny(haystack: string, needles: string[]): boolean {
  const h = haystack.toLowerCase();
  return needles.some((n) => h.includes(n.toLowerCase()));
}

interface ProviderLivePulseProps {
  slug: string;
}

export default function ProviderLivePulse({ slug }: ProviderLivePulseProps) {
  const cfg = CONFIG[slug];
  const [news, setNews] = useState<NewsArticle[] | null>(null);
  const [opps, setOpps] = useState<Opportunity[] | null>(null);
  const [status, setStatus] = useState<StatusEntry[] | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!cfg) return;
    let cancelled = false;
    const fetchAll = async () => {
      setLoading(true);
      try {
        const [newsRes, oppsRes, statusRes] = await Promise.all([
          fetch('https://tensorfeed.ai/api/news?limit=100').then((r) => r.json()),
          fetch('https://tensorfeed.ai/api/agents/opportunities').then((r) => r.json()),
          fetch('https://tensorfeed.ai/api/status').then((r) => r.json()),
        ]);
        if (cancelled) return;

        const articles: NewsArticle[] = Array.isArray(newsRes?.articles) ? newsRes.articles : [];
        const filteredNews = articles
          .filter((a) => {
            const haystack = `${a.title || ''} ${a.source || ''} ${a.snippet || ''}`;
            return matchesAny(haystack, cfg.newsMatchers);
          })
          .slice(0, 6);
        setNews(filteredNews);

        const oppsList: Opportunity[] = Array.isArray(oppsRes?.opportunities)
          ? oppsRes.opportunities
          : [];
        const filteredOpps = oppsList
          .filter((o) => {
            const org = o.full_name.split('/')[0]?.toLowerCase() || '';
            return cfg.githubOrgs.includes(org);
          })
          .slice(0, 5);
        setOpps(filteredOpps);

        const statusList: StatusEntry[] = Array.isArray(statusRes?.providers)
          ? statusRes.providers
          : Array.isArray(statusRes?.services)
            ? statusRes.services
            : [];
        const filteredStatus = statusList
          .filter((s) => matchesAny(`${s.name || ''} ${s.provider || ''}`, cfg.statusMatchers))
          .slice(0, 4);
        setStatus(filteredStatus);
      } catch {
        // Best effort; live data is supplementary, never block the page
      } finally {
        if (!cancelled) setLoading(false);
      }
    };
    fetchAll();
    const interval = setInterval(fetchAll, 5 * 60 * 1000); // 5-min refresh
    return () => {
      cancelled = true;
      clearInterval(interval);
    };
  }, [cfg]);

  if (!cfg) return null;

  return (
    <section className="mb-10 grid grid-cols-1 lg:grid-cols-3 gap-4">
      {/* Live status */}
      <div className="bg-bg-secondary border border-border rounded-xl p-5">
        <div className="flex items-center gap-2 mb-3">
          <Activity className="w-4 h-4 text-accent-primary" />
          <h3 className="text-sm font-semibold text-text-primary">Service status</h3>
          {loading && <RefreshCw className="w-3 h-3 text-text-muted animate-spin" />}
        </div>
        {status && status.length > 0 ? (
          <ul className="space-y-2">
            {status.map((s) => {
              const ok = s.status === 'operational' || s.status === 'up';
              const dot = ok ? 'bg-accent-green' : 'bg-accent-red';
              return (
                <li key={s.name} className="flex items-center justify-between text-sm">
                  <span className="text-text-secondary truncate">{s.name}</span>
                  <span className="flex items-center gap-1.5 shrink-0">
                    <span className={`w-2 h-2 rounded-full ${dot}`} />
                    <span className="text-xs text-text-muted">{s.status}</span>
                  </span>
                </li>
              );
            })}
          </ul>
        ) : (
          <p className="text-text-muted text-sm">{loading ? 'Loading…' : 'No tracked services.'}</p>
        )}
      </div>

      {/* Latest news */}
      <div className="bg-bg-secondary border border-border rounded-xl p-5">
        <div className="flex items-center gap-2 mb-3">
          <Newspaper className="w-4 h-4 text-accent-primary" />
          <h3 className="text-sm font-semibold text-text-primary">Latest news</h3>
          {loading && <RefreshCw className="w-3 h-3 text-text-muted animate-spin" />}
        </div>
        {news && news.length > 0 ? (
          <ul className="space-y-2.5">
            {news.slice(0, 5).map((a) => (
              <li key={a.url}>
                <a
                  href={a.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="group block text-sm"
                >
                  <span className="text-text-primary group-hover:text-accent-primary transition-colors line-clamp-2 leading-snug">
                    {a.title}
                  </span>
                  <span className="text-text-muted text-xs mt-0.5">
                    {a.source} · {timeAgo(a.publishedAt)}
                  </span>
                </a>
              </li>
            ))}
          </ul>
        ) : (
          <p className="text-text-muted text-sm">{loading ? 'Loading…' : 'No recent matches.'}</p>
        )}
        <Link
          href="/news"
          className="inline-flex items-center gap-1 text-xs text-accent-primary hover:underline mt-3"
        >
          All news <ExternalLink className="w-3 h-3" />
        </Link>
      </div>

      {/* Recent GitHub activity */}
      <div className="bg-bg-secondary border border-border rounded-xl p-5">
        <div className="flex items-center gap-2 mb-3">
          <GitBranch className="w-4 h-4 text-accent-primary" />
          <h3 className="text-sm font-semibold text-text-primary">Recent GitHub activity</h3>
          {loading && <RefreshCw className="w-3 h-3 text-text-muted animate-spin" />}
        </div>
        {opps && opps.length > 0 ? (
          <ul className="space-y-2.5">
            {opps.map((o) => (
              <li key={o.full_name}>
                <a
                  href={o.html_url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="group block text-sm"
                >
                  <span className="text-text-primary group-hover:text-accent-primary transition-colors font-mono text-xs leading-snug">
                    {o.full_name}
                  </span>
                  {o.description && (
                    <span className="text-text-muted text-xs mt-0.5 line-clamp-2 block">
                      {o.description}
                    </span>
                  )}
                  <span className="text-text-muted text-xs mt-0.5">
                    {o.stars.toLocaleString()} stars · updated {timeAgo(o.updated_at)}
                  </span>
                </a>
              </li>
            ))}
          </ul>
        ) : (
          <p className="text-text-muted text-sm">
            {loading ? 'Loading…' : 'No recent activity in tracked orgs.'}
          </p>
        )}
        <p className="text-text-muted text-xs mt-3">
          From{' '}
          <Link href="/api/agents/opportunities" className="text-accent-primary hover:underline">
            /api/agents/opportunities
          </Link>
          , refreshed daily 13:30 UTC.
        </p>
      </div>
    </section>
  );
}
