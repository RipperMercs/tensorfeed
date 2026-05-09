'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { Radar, ExternalLink, Star } from 'lucide-react';

interface Opportunity {
  full_name: string;
  html_url: string;
  description: string | null;
  stars: number;
  updated_at: string;
  signal: string;
  composite_score: number;
}

interface OpportunitiesResponse {
  ok?: boolean;
  date?: string;
  capturedAt?: string;
  total_opportunities?: number;
  opportunities?: Opportunity[];
}

const SIGNAL_LABEL: Record<string, string> = {
  'anthropic-org': 'Anthropic',
  'openai-org': 'OpenAI',
  'microsoft-org': 'Microsoft',
  'mcp-org': 'MCP',
  'mcp-keyword': 'MCP server',
  'x402-keyword': 'x402',
  'skill-keyword': 'Agent skill',
};

const SIGNAL_COLOR: Record<string, string> = {
  'anthropic-org': 'bg-orange-500/15 text-orange-300 border-orange-500/30',
  'openai-org': 'bg-emerald-500/15 text-emerald-300 border-emerald-500/30',
  'microsoft-org': 'bg-blue-500/15 text-blue-300 border-blue-500/30',
  'mcp-org': 'bg-violet-500/15 text-violet-300 border-violet-500/30',
  'mcp-keyword': 'bg-violet-500/10 text-violet-300/80 border-violet-500/20',
  'x402-keyword': 'bg-cyan-500/15 text-cyan-300 border-cyan-500/30',
  'skill-keyword': 'bg-amber-500/15 text-amber-300 border-amber-500/30',
};

function formatStars(n: number): string {
  if (n >= 1000) return `${(n / 1000).toFixed(n >= 10000 ? 0 : 1)}K`;
  return String(n);
}

function timeAgo(iso: string): string {
  const sec = Math.floor((Date.now() - new Date(iso).getTime()) / 1000);
  if (sec < 60) return 'just now';
  if (sec < 3600) return `${Math.floor(sec / 60)}m ago`;
  if (sec < 86400) return `${Math.floor(sec / 3600)}h ago`;
  return `${Math.floor(sec / 86400)}d ago`;
}

export default function AgentOpportunitiesWidget() {
  const [data, setData] = useState<OpportunitiesResponse | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    const fetchOnce = async () => {
      try {
        const res = await fetch('https://tensorfeed.ai/api/agents/opportunities');
        if (!res.ok) {
          if (!cancelled) setLoading(false);
          return;
        }
        const json = (await res.json()) as OpportunitiesResponse;
        if (!cancelled) {
          setData(json);
          setLoading(false);
        }
      } catch {
        if (!cancelled) setLoading(false);
      }
    };
    fetchOnce();
    const interval = setInterval(fetchOnce, 5 * 60 * 1000);
    return () => {
      cancelled = true;
      clearInterval(interval);
    };
  }, []);

  const top = (data?.opportunities ?? []).slice(0, 6);

  return (
    <section
      className="border-b border-border"
      style={{ padding: '40px 0' }}
      aria-labelledby="opps-h"
    >
      <div className="max-w-[1600px] mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-end justify-between mb-5 flex-wrap gap-3">
          <div>
            <p className="text-xs font-mono uppercase tracking-wider text-text-muted mb-1.5">
              / Agent Opportunities
            </p>
            <h2
              id="opps-h"
              className="text-2xl sm:text-3xl font-bold text-text-primary leading-tight"
            >
              <Radar className="inline w-6 h-6 mr-2 text-accent-primary" />
              New across the agent ecosystem today
            </h2>
            <p className="text-text-secondary text-sm mt-1.5 max-w-2xl">
              Daily 13:30 UTC scan of new submission/distribution opportunities (Anthropic, OpenAI, Microsoft, MCP foundation orgs + MCP/x402/skills keyword sweeps), scored by signal weight × recency × log10(stars).
            </p>
          </div>
          <Link
            href="/api/agents/opportunities"
            className="inline-flex items-center gap-1 text-sm text-accent-primary hover:underline whitespace-nowrap"
          >
            JSON feed <ExternalLink className="w-3 h-3" />
          </Link>
        </div>

        {loading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
            {[0, 1, 2, 3, 4, 5].map((i) => (
              <div
                key={i}
                className="bg-bg-secondary border border-border rounded-lg p-4 h-32 animate-pulse"
              />
            ))}
          </div>
        ) : top.length === 0 ? (
          <p className="text-text-muted text-sm">
            Snapshot not yet available (cron pending). First run lands at 13:30 UTC.
          </p>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
            {top.map((o) => {
              const label = SIGNAL_LABEL[o.signal] ?? o.signal;
              const color = SIGNAL_COLOR[o.signal] ?? 'bg-bg-tertiary text-text-secondary border-border';
              return (
                <a
                  key={o.full_name}
                  href={o.html_url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="bg-bg-secondary border border-border rounded-lg p-4 hover:border-accent-primary transition-colors group flex flex-col"
                >
                  <div className="flex items-center justify-between gap-2 mb-2">
                    <span
                      className={`text-[10px] font-medium px-2 py-0.5 rounded-full border ${color} uppercase tracking-wider`}
                    >
                      {label}
                    </span>
                    <span className="flex items-center gap-1 text-xs text-text-muted">
                      <Star className="w-3 h-3" />
                      {formatStars(o.stars)}
                    </span>
                  </div>
                  <p className="text-text-primary font-mono text-sm mb-1.5 group-hover:text-accent-primary transition-colors break-all">
                    {o.full_name}
                  </p>
                  {o.description && (
                    <p className="text-text-muted text-xs line-clamp-2 leading-snug flex-1">
                      {o.description}
                    </p>
                  )}
                  <p className="text-text-muted text-[10px] mt-2 font-mono">
                    updated {timeAgo(o.updated_at)}
                  </p>
                </a>
              );
            })}
          </div>
        )}

        {data && data.total_opportunities !== undefined && data.total_opportunities > 6 && (
          <p className="text-text-muted text-xs mt-3 text-center">
            Showing top 6 of {data.total_opportunities} ranked opportunities. Full list at{' '}
            <Link href="/api/agents/opportunities" className="text-accent-primary hover:underline">
              /api/agents/opportunities
            </Link>
            .
          </p>
        )}
      </div>
    </section>
  );
}
