import Link from 'next/link';
import { SISTER_SITES, STATUS_DOTS } from '@/lib/constants';
import { Activity, Rss, TrendingUp, Globe } from 'lucide-react';
import AgentActivity from '@/components/AgentActivity';
import NewsletterSignup from '@/components/NewsletterSignup';

const TRENDING_TOPICS = [
  '#Claude4',
  '#GPT5',
  '#OpenSource',
  '#Reasoning',
  '#AIAgents',
  '#Llama4',
  '#Multimodal',
  '#Safety',
];

import sourcesData from '../../../data/sources.json';

const LIVE_SOURCES = sourcesData.sources.map(s => s.name).slice(0, 6);

async function fetchStatusSummary() {
  try {
    const res = await fetch('https://tensorfeed.ai/api/status/summary', { next: { revalidate: 120 } });
    if (res.ok) {
      const data = await res.json();
      if (data.ok && data.services?.length) return data.services.slice(0, 5);
    }
  } catch {}
  return [];
}

export default async function Sidebar() {
  const topStatuses = await fetchStatusSummary();

  return (
    <aside className="space-y-4">
      {/* Status Quick Widget */}
      <div className="bg-bg-secondary rounded-lg border border-border p-4">
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-sm font-semibold text-text-primary flex items-center gap-1.5">
            <Activity className="w-4 h-4 text-accent-primary" />
            AI Service Status
          </h3>
          <Link
            href="/status"
            className="text-xs text-accent-primary hover:text-accent-cyan transition-colors"
          >
            View all
          </Link>
        </div>
        <ul className="space-y-2">
          {topStatuses.map((service: { name: string; status: string }) => (
            <li key={service.name} className="flex items-center gap-2">
              <span
                className={`w-2 h-2 rounded-full shrink-0 ${STATUS_DOTS[service.status] || STATUS_DOTS.unknown}`}
              />
              <span className="text-xs text-text-secondary truncate">
                {service.name}
              </span>
              <span className="text-[10px] text-text-muted ml-auto capitalize shrink-0">
                {service.status}
              </span>
            </li>
          ))}
          {topStatuses.length === 0 && (
            <li className="text-xs text-text-muted">Loading status...</li>
          )}
        </ul>
      </div>

      {/* Agent Activity Widget */}
      <AgentActivity />

      {/* Sources Widget */}
      <div className="bg-bg-secondary rounded-lg border border-border p-4">
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-sm font-semibold text-text-primary flex items-center gap-1.5">
            <Rss className="w-4 h-4 text-accent-primary" />
            Sources
          </h3>
          <span className="text-[10px] text-text-muted font-mono">
            {sourcesData.sources.length} active feeds
          </span>
        </div>
        <ul className="space-y-1.5">
          {LIVE_SOURCES.map((name) => (
            <li key={name} className="text-xs text-text-secondary">
              {name}
            </li>
          ))}
        </ul>
        <Link
          href="/about"
          className="block mt-3 text-xs text-accent-primary hover:text-accent-cyan transition-colors"
        >
          View all sources
        </Link>
      </div>

      {/* Trending Topics Widget */}
      <div className="bg-bg-secondary rounded-lg border border-border p-4">
        <h3 className="text-sm font-semibold text-text-primary flex items-center gap-1.5 mb-3">
          <TrendingUp className="w-4 h-4 text-accent-primary" />
          Trending Topics
        </h3>
        <div className="flex flex-wrap gap-2">
          {TRENDING_TOPICS.map((topic) => (
            <span
              key={topic}
              className="text-xs font-mono px-2 py-1 rounded bg-bg-tertiary text-accent-cyan hover:text-accent-primary cursor-pointer transition-colors"
            >
              {topic}
            </span>
          ))}
        </div>
      </div>

      {/* Sister Sites Widget */}
      <div className="bg-bg-secondary rounded-lg border border-border p-4">
        <h3 className="text-sm font-semibold text-text-primary flex items-center gap-1.5 mb-3">
          <Globe className="w-4 h-4 text-accent-primary" />
          Sister Sites
        </h3>
        <ul className="space-y-2.5">
          {SISTER_SITES.map((site) => (
            <li key={site.url}>
              <a
                href={site.url}
                target="_blank"
                rel="noopener noreferrer"
                className="block group"
              >
                <span className="text-sm text-accent-primary group-hover:text-accent-cyan transition-colors">
                  {site.icon} {site.name}
                </span>
                <span className="block text-xs text-text-muted mt-0.5">
                  {site.description}
                </span>
              </a>
            </li>
          ))}
        </ul>
      </div>

      {/* Newsletter Signup */}
      <NewsletterSignup variant="sidebar" />
    </aside>
  );
}
