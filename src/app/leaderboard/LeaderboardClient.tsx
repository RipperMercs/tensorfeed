'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { Clock, RefreshCw } from 'lucide-react';
import type { LeaderboardEntry, LeaderboardOk, LeaderboardErr } from './page';

interface Props {
  initialData: LeaderboardOk | LeaderboardErr | null;
}

// Maps provider names to their dedicated /is-X-down detail pages.
// Names match what the worker emits in STATUS_PAGES (worker/src/sources.ts).
const SERVICE_HREFS: Record<string, string> = {
  'Claude API': '/is-claude-down',
  'OpenAI API': '/is-chatgpt-down',
  'Google Gemini': '/is-gemini-down',
  'GitHub Copilot': '/is-copilot-down',
  Perplexity: '/is-perplexity-down',
  Groq: '/is-groq-down',
  'Hugging Face': '/is-huggingface-down',
  Replicate: '/is-replicate-down',
  Cohere: '/is-cohere-down',
  Mistral: '/is-mistral-down',
  'AWS Bedrock': '/is-bedrock-down',
  'Azure OpenAI': '/is-azure-openai-down',
};

const POLL_INTERVAL_MS = 5 * 60 * 1000; // 5 min, matches worker /api cache TTL

function uptimeColorClass(pct: number): { dot: string; text: string } {
  if (pct >= 99.9) return { dot: 'bg-accent-green', text: 'text-accent-green' };
  if (pct >= 99) return { dot: 'bg-accent-amber', text: 'text-accent-amber' };
  if (pct >= 95) return { dot: 'bg-orange-400', text: 'text-orange-400' };
  return { dot: 'bg-accent-red', text: 'text-accent-red' };
}

function rankBadgeClass(rank: number): string {
  if (rank === 1) return 'bg-accent-green/15 text-accent-green border-accent-green/30';
  if (rank === 2) return 'bg-accent-secondary/15 text-accent-secondary border-accent-secondary/30';
  if (rank === 3) return 'bg-accent-amber/15 text-accent-amber border-accent-amber/30';
  return 'bg-bg-tertiary text-text-secondary border-border';
}

function formatDuration(minutes: number): string {
  if (minutes === 0) return '0';
  if (minutes < 60) return `${minutes}m`;
  const hours = Math.floor(minutes / 60);
  const mins = minutes % 60;
  if (hours < 24) return mins > 0 ? `${hours}h ${mins}m` : `${hours}h`;
  const days = Math.floor(hours / 24);
  const remHours = hours % 24;
  return remHours > 0 ? `${days}d ${remHours}h` : `${days}d`;
}

function formatNumber(n: number): string {
  return n.toLocaleString('en-US');
}

function timeAgo(iso?: string): string {
  if (!iso) return 'just now';
  const diffMs = Date.now() - new Date(iso).getTime();
  const seconds = Math.round(diffMs / 1000);
  if (seconds < 60) return `${seconds}s ago`;
  const minutes = Math.round(seconds / 60);
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.round(minutes / 60);
  return `${hours}h ago`;
}

export default function LeaderboardClient({ initialData }: Props) {
  const [data, setData] = useState<LeaderboardOk | LeaderboardErr | null>(initialData);
  const [refreshing, setRefreshing] = useState(false);

  useEffect(() => {
    let cancelled = false;
    const fetchOnce = async () => {
      try {
        setRefreshing(true);
        const res = await fetch('/api/status/leaderboard?days=7', { cache: 'no-store' });
        if (!res.ok) return;
        const fresh = (await res.json()) as LeaderboardOk | LeaderboardErr;
        if (!cancelled) setData(fresh);
      } catch {
        // Silent: keep last-known-good state until next poll.
      } finally {
        if (!cancelled) setRefreshing(false);
      }
    };
    // First refresh fires immediately so build-time data clears even if it's old.
    fetchOnce();
    const t = setInterval(fetchOnce, POLL_INTERVAL_MS);
    return () => {
      cancelled = true;
      clearInterval(t);
    };
  }, []);

  if (!data) {
    return (
      <div className="bg-bg-secondary border border-border rounded-xl p-8 text-center">
        <p className="text-text-secondary">
          Leaderboard temporarily unavailable. Please refresh in a moment.
        </p>
      </div>
    );
  }

  if (!data.ok) {
    return (
      <div className="bg-bg-secondary border border-border rounded-xl p-8">
        <h2 className="text-lg font-semibold text-text-primary mb-2">
          Leaderboard data is accumulating
        </h2>
        <p className="text-text-secondary text-sm leading-relaxed">
          {data.message}
        </p>
        <p className="text-text-muted text-xs mt-3">
          Check back in a few hours. This page automatically refreshes every 5 minutes.
        </p>
      </div>
    );
  }

  const entries = data.entries;
  const top = entries[0];

  return (
    <>
      {/* Stats summary */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-3 mb-6">
        <div className="bg-bg-secondary border border-border rounded-xl p-5">
          <div className="text-xs text-text-muted font-mono uppercase tracking-wider mb-1.5">
            Window
          </div>
          <div className="text-text-primary font-semibold text-base">
            {data.range.from} to {data.range.to}
          </div>
          <div className="text-xs text-text-muted mt-1">
            {data.range.days} day{data.range.days === 1 ? '' : 's'},{' '}
            {data.poll_interval_minutes}-minute polls
          </div>
        </div>
        <div className="bg-bg-secondary border border-border rounded-xl p-5">
          <div className="text-xs text-text-muted font-mono uppercase tracking-wider mb-1.5">
            Top performer
          </div>
          <div className="text-text-primary font-semibold text-base">
            {top ? top.provider : 'No data'}
          </div>
          <div className="text-xs text-text-muted mt-1">
            {top ? `${top.uptime_pct}% uptime` : 'Awaiting first poll cycle'}
          </div>
        </div>
        <div className="bg-bg-secondary border border-border rounded-xl p-5">
          <div className="text-xs text-text-muted font-mono uppercase tracking-wider mb-1.5">
            Updated
          </div>
          <div className="text-text-primary font-semibold text-base inline-flex items-center gap-2">
            <Clock className="w-4 h-4 text-text-muted" />
            {timeAgo(data.generated_at)}
            {refreshing && <RefreshCw className="w-3.5 h-3.5 text-text-muted animate-spin" />}
          </div>
          <div className="text-xs text-text-muted mt-1">
            {data.entry_count} provider{data.entry_count === 1 ? '' : 's'} ranked
          </div>
        </div>
      </div>

      {/* Leaderboard table */}
      <div className="bg-bg-secondary border border-border rounded-xl overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border bg-bg-tertiary/40">
                <th className="text-left font-mono text-xs uppercase tracking-wider text-text-muted px-4 py-3 w-16">
                  Rank
                </th>
                <th className="text-left font-mono text-xs uppercase tracking-wider text-text-muted px-4 py-3">
                  Provider
                </th>
                <th className="text-right font-mono text-xs uppercase tracking-wider text-text-muted px-4 py-3 w-32">
                  Uptime
                </th>
                <th className="text-right font-mono text-xs uppercase tracking-wider text-text-muted px-4 py-3 w-32 hidden sm:table-cell">
                  Downtime
                </th>
                <th className="text-right font-mono text-xs uppercase tracking-wider text-text-muted px-4 py-3 w-32 hidden md:table-cell">
                  Hard down
                </th>
                <th className="text-right font-mono text-xs uppercase tracking-wider text-text-muted px-4 py-3 w-24 hidden lg:table-cell">
                  Polls
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {entries.map((e: LeaderboardEntry) => {
                const colors = uptimeColorClass(e.uptime_pct);
                const href = SERVICE_HREFS[e.provider];
                return (
                  <tr key={e.provider} className="hover:bg-bg-tertiary/30 transition-colors">
                    <td className="px-4 py-3.5">
                      <span
                        className={`inline-flex items-center justify-center w-8 h-7 rounded border text-xs font-mono font-semibold ${rankBadgeClass(e.rank)}`}
                      >
                        #{e.rank}
                      </span>
                    </td>
                    <td className="px-4 py-3.5">
                      {href ? (
                        <Link
                          href={href}
                          className="text-text-primary font-medium hover:text-accent-primary transition-colors"
                        >
                          {e.provider}
                        </Link>
                      ) : (
                        <span className="text-text-primary font-medium">{e.provider}</span>
                      )}
                    </td>
                    <td className="px-4 py-3.5 text-right">
                      <div className="inline-flex items-center gap-2 justify-end">
                        <span className={`inline-block w-2 h-2 rounded-full ${colors.dot}`} />
                        <span className={`font-mono font-semibold ${colors.text}`}>
                          {e.uptime_pct.toFixed(2)}%
                        </span>
                      </div>
                    </td>
                    <td className="px-4 py-3.5 text-right font-mono text-text-secondary hidden sm:table-cell">
                      {formatDuration(e.downtime_minutes)}
                    </td>
                    <td className="px-4 py-3.5 text-right font-mono text-text-secondary hidden md:table-cell">
                      {formatDuration(e.hard_down_minutes)}
                    </td>
                    <td className="px-4 py-3.5 text-right font-mono text-text-muted hidden lg:table-cell">
                      {formatNumber(e.polls)}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </>
  );
}
