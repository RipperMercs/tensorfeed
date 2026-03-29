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

  useEffect(() => {
    let mounted = true;

    async function fetchActivity() {
      try {
        const res = await fetch('https://tensorfeed.ai/api/agents/activity');
        if (!res.ok) return;
        const data = await res.json();
        if (!mounted) return;
        setCount(data.today_count ?? 0);
        setRecent((data.recent ?? []).slice(0, 5));
      } catch {}
    }

    fetchActivity();
    const interval = setInterval(fetchActivity, 10000);
    return () => { mounted = false; clearInterval(interval); };
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

      {count !== null && (
        <p className="text-text-secondary text-sm mb-3">
          <span className="text-text-primary font-semibold">{count.toLocaleString()}</span> agent requests today
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
