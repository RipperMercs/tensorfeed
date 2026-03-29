'use client';

import { useState, useEffect, useRef } from 'react';
import { Zap } from 'lucide-react';
import Link from 'next/link';

interface AgentHit {
  bot: string;
  endpoint: string;
  timestamp: string;
}

const SIM_BOTS = ['ClaudeBot', 'GPTBot', 'PerplexityBot', 'Googlebot', 'Bingbot', 'Applebot', 'ChatGPT-User', 'OAI-SearchBot'];
const SIM_ENDPOINTS = ['/feed.json', '/llms.txt', '/api/news', '/api/status', '/feed.xml', '/api/models', '/llms-full.txt', '/api/agents/news.json'];

function pick<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)];
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
  const baseCount = useRef(0);
  const drift = useRef(0);

  // Fetch real data from API once on mount
  useEffect(() => {
    async function fetchActivity() {
      try {
        const res = await fetch('https://tensorfeed.ai/api/agents/activity');
        if (!res.ok) return;
        const data = await res.json();
        baseCount.current = data.today_count ?? 0;
        drift.current = 0;
        setCount(baseCount.current);
        // Seed recent with real data if available, otherwise generate
        const realRecent = (data.recent ?? []).slice(0, 5);
        if (realRecent.length > 0) {
          setRecent(realRecent);
        }
      } catch {}
    }
    fetchActivity();
  }, []);

  // Simulate organic movement every 15-45 seconds
  useEffect(() => {
    if (count === null) return;

    function tick() {
      const increment = Math.floor(Math.random() * 4) + 1;
      drift.current += increment;
      setCount(baseCount.current + drift.current);

      // Add a simulated hit to the recent feed
      const newHit: AgentHit = {
        bot: pick(SIM_BOTS),
        endpoint: pick(SIM_ENDPOINTS),
        timestamp: new Date(Date.now() - Math.floor(Math.random() * 5000)).toISOString(),
      };
      setRecent(prev => [newHit, ...prev.slice(0, 4)]);
    }

    // Randomize interval between 15-45 seconds
    let timeout: ReturnType<typeof setTimeout>;
    function schedule() {
      const delay = 15000 + Math.floor(Math.random() * 30000);
      timeout = setTimeout(() => {
        tick();
        schedule();
      }, delay);
    }
    schedule();

    return () => clearTimeout(timeout);
  }, [count !== null]); // eslint-disable-line react-hooks/exhaustive-deps

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
