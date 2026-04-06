'use client';

import { useState, useEffect } from 'react';
import { Calendar, TrendingUp, AlertTriangle, ExternalLink, Cpu } from 'lucide-react';
interface Article {
  id: string;
  title: string;
  url: string;
  source: string;
  sourceDomain: string;
  snippet: string;
  categories: string[];
  publishedAt: string;
}

interface StatusService {
  name: string;
  status: string;
  provider: string;
}

function timeAgo(dateStr: string): string {
  const seconds = Math.floor((Date.now() - new Date(dateStr).getTime()) / 1000);
  if (seconds < 60) return 'just now';
  if (seconds < 3600) return `${Math.floor(seconds / 60)}m ago`;
  if (seconds < 86400) return `${Math.floor(seconds / 3600)}h ago`;
  return `${Math.floor(seconds / 86400)}d ago`;
}

export default function TodayPage() {
  const [articles, setArticles] = useState<Article[]>([]);
  const [statuses, setStatuses] = useState<StatusService[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchData() {
      try {
        const [newsRes, statusRes] = await Promise.all([
          fetch('https://tensorfeed.ai/api/news?limit=200'),
          fetch('https://tensorfeed.ai/api/status/summary'),
        ]);

        if (newsRes.ok) {
          const newsData = await newsRes.json();
          if (newsData.articles) {
            // Filter to last 24 hours
            const cutoff = Date.now() - 24 * 60 * 60 * 1000;
            const recent = newsData.articles.filter(
              (a: Article) => new Date(a.publishedAt).getTime() > cutoff
            );
            setArticles(recent);
          }
        }

        if (statusRes.ok) {
          const statusData = await statusRes.json();
          if (statusData.services) setStatuses(statusData.services);
        }
      } catch {}
      setLoading(false);
    }
    fetchData();
  }, []);

  // Group articles by category
  const categoryGroups: Record<string, Article[]> = {};
  for (const article of articles) {
    const cat = article.categories[0] || 'General AI';
    if (!categoryGroups[cat]) categoryGroups[cat] = [];
    categoryGroups[cat].push(article);
  }
  const sortedCategories = Object.entries(categoryGroups).sort((a, b) => b[1].length - a[1].length);

  // Source breakdown
  const sourceCounts: Record<string, number> = {};
  for (const article of articles) {
    sourceCounts[article.source] = (sourceCounts[article.source] || 0) + 1;
  }
  const topSources = Object.entries(sourceCounts).sort((a, b) => b[1] - a[1]).slice(0, 6);

  // Status incidents
  const incidents = statuses.filter(s => s.status !== 'operational');

  const todayStr = new Date().toLocaleDateString('en-US', {
    weekday: 'long',
    month: 'long',
    day: 'numeric',
    year: 'numeric',
  });

  if (loading) {
    return (
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="animate-pulse space-y-6">
          <div className="h-8 bg-bg-tertiary rounded w-1/2" />
          <div className="h-4 bg-bg-tertiary rounded w-1/3" />
          <div className="h-32 bg-bg-secondary rounded-lg" />
          <div className="h-32 bg-bg-secondary rounded-lg" />
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      {/* Header */}
      <div className="mb-8">
        <div className="flex items-center gap-3 mb-2">
          <Calendar className="w-7 h-7 text-accent-primary" />
          <h1 className="text-3xl font-bold text-text-primary">Today in AI</h1>
        </div>
        <p className="text-text-secondary text-lg">{todayStr}</p>
      </div>

      {/* Summary Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-8">
        <div className="bg-bg-secondary border border-border rounded-lg p-4 text-center">
          <p className="text-2xl font-bold text-accent-primary">{articles.length}</p>
          <p className="text-xs text-text-muted">Stories today</p>
        </div>
        <div className="bg-bg-secondary border border-border rounded-lg p-4 text-center">
          <p className="text-2xl font-bold text-accent-cyan">{Object.keys(sourceCounts).length}</p>
          <p className="text-xs text-text-muted">Sources reporting</p>
        </div>
        <div className="bg-bg-secondary border border-border rounded-lg p-4 text-center">
          <p className="text-2xl font-bold text-accent-green">{statuses.filter(s => s.status === 'operational').length}</p>
          <p className="text-xs text-text-muted">Services up</p>
        </div>
        <div className="bg-bg-secondary border border-border rounded-lg p-4 text-center">
          <p className={`text-2xl font-bold ${incidents.length > 0 ? 'text-accent-red' : 'text-accent-green'}`}>{incidents.length}</p>
          <p className="text-xs text-text-muted">Incidents</p>
        </div>
      </div>

      {/* Status Incidents */}
      {incidents.length > 0 && (
        <div className="bg-accent-red/10 border border-accent-red/30 rounded-lg p-4 mb-8">
          <div className="flex items-center gap-2 mb-2">
            <AlertTriangle className="w-5 h-5 text-accent-red" />
            <h2 className="text-text-primary font-semibold">Active Incidents</h2>
          </div>
          <ul className="space-y-1">
            {incidents.map(s => (
              <li key={s.name} className="text-sm text-text-secondary flex items-center gap-2">
                <span className={`w-2 h-2 rounded-full shrink-0 ${s.status === 'down' ? 'bg-accent-red' : 'bg-accent-amber'}`} />
                {s.name} ({s.provider}) is {s.status}
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* Top Story */}
      {articles.length > 0 && (
        <section className="mb-8">
          <h2 className="text-lg font-semibold text-text-primary mb-3 flex items-center gap-2">
            <TrendingUp className="w-5 h-5 text-accent-primary" />
            Top Story
          </h2>
          <a
            href={articles[0].url}
            target="_blank"
            rel="noopener noreferrer"
            className="block bg-bg-secondary border-2 border-accent-primary rounded-xl p-5 hover:shadow-glow transition-shadow group"
          >
            <h3 className="text-xl font-semibold text-text-primary group-hover:text-accent-cyan transition-colors mb-2">
              {articles[0].title}
            </h3>
            {articles[0].snippet && !/^(Article URL:|Comments URL:)/m.test(articles[0].snippet) && (
              <p className="text-text-secondary text-sm mb-3">{articles[0].snippet}</p>
            )}
            <div className="flex items-center gap-3 text-xs text-text-muted">
              <span>{articles[0].source}</span>
              <span>{timeAgo(articles[0].publishedAt)}</span>
              <ExternalLink className="w-3 h-3" />
            </div>
          </a>
        </section>
      )}

      {/* By Category */}
      <section className="mb-8">
        <h2 className="text-lg font-semibold text-text-primary mb-4 flex items-center gap-2">
          <Cpu className="w-5 h-5 text-accent-primary" />
          By Category
        </h2>
        <div className="space-y-6">
          {sortedCategories.map(([category, catArticles]) => (
            <div key={category}>
              <div className="flex items-center justify-between mb-2">
                <h3 className="text-sm font-semibold text-text-secondary">{category}</h3>
                <span className="text-xs text-text-muted">{catArticles.length} stories</span>
              </div>
              <div className="space-y-1">
                {catArticles.slice(0, 5).map(article => (
                  <a
                    key={article.id}
                    href={article.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-start gap-2 px-3 py-2 rounded-md hover:bg-bg-secondary transition-colors group"
                  >
                    <span className="text-text-primary text-sm leading-snug flex-1 group-hover:text-accent-cyan transition-colors">
                      {article.title}
                    </span>
                    <span className="text-[10px] text-text-muted shrink-0 mt-0.5">{timeAgo(article.publishedAt)}</span>
                  </a>
                ))}
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* Source Breakdown */}
      <section className="mb-8">
        <h2 className="text-sm font-semibold text-text-muted mb-3">Sources Reporting Today</h2>
        <div className="flex flex-wrap gap-2">
          {topSources.map(([source, count]) => (
            <span key={source} className="text-xs bg-bg-secondary border border-border rounded-full px-3 py-1 text-text-secondary">
              {source} ({count})
            </span>
          ))}
        </div>
      </section>
    </div>
  );
}
