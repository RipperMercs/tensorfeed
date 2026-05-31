'use client';

import { useState, useEffect } from 'react';
import { Zap } from 'lucide-react';
import Link from 'next/link';

interface AgentHit {
  bot: string;
  endpoint: string;
  timestamp: string;
}

function timeAgo(timestamp: string): string {
  const seconds = Math.floor((Date.now() - new Date(timestamp).getTime()) / 1000);
  if (seconds < 60) return `${seconds}s ago`;
  if (seconds < 3600) return `${Math.floor(seconds / 60)}m ago`;
  return `${Math.floor(seconds / 3600)}h ago`;
}

export default function AgentActivity() {
  const [count, setCount] = useState<number | null>(null);
  const [recent, setRecent] = useState<AgentHit[]>([]);
  const [responsesServed, setResponsesServed] = useState<number | null>(null);
  const [receiptsActive, setReceiptsActive] = useState(false);

  // Fetch real data and refresh every 30 seconds. The two endpoints are
  // polled independently so one failing never blanks the other.
  useEffect(() => {
    async function fetchActivity() {
      try {
        const res = await fetch('https://tensorfeed.ai/api/agents/activity');
        if (!res.ok) return;
        const data = await res.json();
        setCount(data.today_count ?? 0);
        setRecent((data.recent ?? []).slice(0, 5));
      } catch {}
    }
    async function fetchStats() {
      try {
        const res = await fetch('https://tensorfeed.ai/api/stats');
        if (!res.ok) return;
        const data = await res.json();
        // premium_responses_served counts every served premium response
        // (including free-trial-served calls and TF's own testing), so it is
        // labeled as responses served, not external paid demand. Fall back to
        // the legacy key for resilience if the alias is ever absent.
        setResponsesServed(data.premium_responses_served ?? data.premium_calls_served ?? 0);
        setReceiptsActive(Boolean(data.each_call_returns_signed_afta_receipt));
      } catch {}
    }
    fetchActivity();
    fetchStats();
    const interval = setInterval(() => {
      fetchActivity();
      fetchStats();
    }, 30_000);
    return () => clearInterval(interval);
  }, []);

  return (
    <div className="bg-bg-secondary rounded-lg border border-border p-4">
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-sm font-semibold text-text-primary flex items-center gap-1.5">
          <Zap className="w-4 h-4 text-accent-amber" />
          Agent Activity
        </h3>
        <span className="flex items-center gap-1.5">
          <span className="relative flex h-2 w-2">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-accent-green opacity-75" />
            <span className="relative inline-flex rounded-full h-2 w-2 bg-accent-green" />
          </span>
          <span className="text-[10px] font-medium text-accent-green uppercase">Live</span>
        </span>
      </div>

      {responsesServed !== null && (
        <p className="text-text-secondary text-sm mb-1">
          <span className="text-text-primary font-semibold">{responsesServed.toLocaleString()}</span> premium responses served
          {receiptsActive && ', each with a signed AFTA receipt'}
        </p>
      )}

      {count !== null && (
        <p className="text-text-secondary text-sm mb-3">
          <span className="text-text-primary font-semibold">{count.toLocaleString()}</span> agent requests today (all bots, includes crawlers)
        </p>
      )}

      {recent.length > 0 && (
        <ul className="space-y-1.5">
          {recent.map((hit, i) => (
            <li key={i} className="flex items-center justify-between">
              <span className="text-xs text-text-secondary truncate">{hit.bot}</span>
              <span className="text-[10px] text-text-muted font-mono shrink-0 ml-2">
                {timeAgo(hit.timestamp)}
              </span>
            </li>
          ))}
        </ul>
      )}

      {count === null && (
        <p className="text-xs text-text-muted">Loading activity...</p>
      )}

      <Link
        href="/live"
        className="block mt-3 text-xs text-accent-primary hover:text-accent-cyan transition-colors"
      >
        View full activity
      </Link>
    </div>
  );
}
