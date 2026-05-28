'use client';

import { useEffect, useRef, useState } from 'react';
import { Activity, TrendingDown, TrendingUp, Trophy, Users } from 'lucide-react';

// ---- API response shapes (mirrors worker/src/x402-index/query.ts) ----

interface SummaryResponse {
  ok: boolean;
  window: string;
  captured_at: string;
  volume_usdc: string;
  count: number;
  unique_publishers: number;
  change_vs_prior_window: {
    volume_pct: number;
    count_pct: number;
  };
}

interface LeaderboardEntry {
  rank: number;
  domain: string;
  volume_usdc: string;
  count: number;
  share_pct: number;
}

interface LeaderboardResponse {
  ok: boolean;
  window: string;
  captured_at: string;
  leaders: LeaderboardEntry[];
}

// ---- Helpers ----

function formatUsdc(raw: string): string {
  const [whole, frac = ''] = raw.split('.');
  const withCommas = whole.replace(/\B(?=(\d{3})+(?!\d))/g, ',');
  return frac ? `${withCommas}.${frac}` : withCommas;
}

function formatPct(pct: number): string {
  const sign = pct >= 0 ? '+' : '';
  return `${sign}${pct.toFixed(1)}%`;
}

function ChangeBadge({ pct }: { pct: number }) {
  const isUp = pct >= 0;
  const Icon = isUp ? TrendingUp : TrendingDown;
  const color = isUp ? 'text-emerald-400' : 'text-red-400';
  return (
    <span className={`inline-flex items-center gap-0.5 text-xs font-mono ${color}`}>
      <Icon className="w-3 h-3" />
      {formatPct(pct)}
    </span>
  );
}

// ---- Skeleton ----

function TickerSkeleton() {
  return (
    <div className="space-y-4">
      <div className="grid gap-3 sm:grid-cols-3">
        {[0, 1, 2].map(i => (
          <div key={i} className="bg-bg-secondary border border-border rounded-lg p-4 animate-pulse h-24" />
        ))}
      </div>
      <div className="bg-bg-secondary border border-border rounded-lg p-4 animate-pulse h-40" />
    </div>
  );
}

// ---- Empty state ----

function EmptyState() {
  return (
    <div className="bg-bg-secondary border border-border rounded-lg p-5 text-sm text-text-muted leading-relaxed">
      Indexer warming up. First settlement events typically appear within about 5 to 10 minutes of
      the daily publisher manifest refresh at 06:35 UTC.
    </div>
  );
}

// ---- Main component ----

export default function X402IndexTicker() {
  const [summary, setSummary] = useState<SummaryResponse | null>(null);
  const [leaderboard, setLeaderboard] = useState<LeaderboardResponse | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const fetchData = () => {
    setError(null);
    Promise.all([
      fetch('https://tensorfeed.ai/api/x402-index/summary?window=24h').then(res => {
        if (!res.ok) throw new Error(`summary HTTP ${res.status}`);
        return res.json() as Promise<SummaryResponse>;
      }),
      fetch('https://tensorfeed.ai/api/x402-index/leaderboard?window=24h&limit=5').then(res => {
        if (!res.ok) throw new Error(`leaderboard HTTP ${res.status}`);
        return res.json() as Promise<LeaderboardResponse>;
      }),
    ])
      .then(([s, l]) => {
        setSummary(s);
        setLeaderboard(l);
        setLoading(false);
      })
      .catch(e => {
        setError(e instanceof Error ? e.message : 'Failed to load');
        setLoading(false);
      });
  };

  useEffect(() => {
    fetchData();
    intervalRef.current = setInterval(fetchData, 60_000);
    return () => {
      if (intervalRef.current !== null) clearInterval(intervalRef.current);
    };
    // fetchData is stable (no deps); eslint-disable-next-line covers the lint warning
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  if (loading) return <TickerSkeleton />;

  if (error) {
    return (
      <div className="bg-bg-secondary border border-border rounded-lg p-4 text-sm text-text-muted flex items-center gap-3">
        <span>Could not load index data: {error}</span>
        <button
          onClick={() => { setLoading(true); fetchData(); }}
          className="px-3 py-1 rounded border border-border text-text-secondary hover:border-accent-primary/40 hover:text-accent-primary text-xs"
        >
          Retry
        </button>
      </div>
    );
  }

  if (!summary || !leaderboard) return null;

  const isEmpty = summary.count === 0;

  return (
    <div className="space-y-4">
      {isEmpty ? (
        <EmptyState />
      ) : (
        <div className="grid gap-3 sm:grid-cols-3">
          {/* Volume (24h) */}
          <div className="bg-bg-secondary border border-border rounded-lg p-4">
            <div className="flex items-center gap-2 mb-2">
              <TrendingUp className="w-4 h-4 text-accent-primary shrink-0" />
              <span className="text-xs font-mono uppercase tracking-wide text-text-muted">
                Volume (24h)
              </span>
            </div>
            <div className="text-xl font-bold text-text-primary font-mono leading-tight">
              {formatUsdc(summary.volume_usdc)}
            </div>
            <div className="text-xs text-text-muted mt-0.5 mb-2">USDC</div>
            <ChangeBadge pct={summary.change_vs_prior_window.volume_pct} />
          </div>

          {/* Settlements (24h) */}
          <div className="bg-bg-secondary border border-border rounded-lg p-4">
            <div className="flex items-center gap-2 mb-2">
              <Activity className="w-4 h-4 text-accent-primary shrink-0" />
              <span className="text-xs font-mono uppercase tracking-wide text-text-muted">
                Settlements (24h)
              </span>
            </div>
            <div className="text-xl font-bold text-text-primary font-mono leading-tight">
              {summary.count.toLocaleString()}
            </div>
            <div className="text-xs text-text-muted mt-0.5 mb-2">events</div>
            <ChangeBadge pct={summary.change_vs_prior_window.count_pct} />
          </div>

          {/* Unique publishers (24h) */}
          <div className="bg-bg-secondary border border-border rounded-lg p-4">
            <div className="flex items-center gap-2 mb-2">
              <Users className="w-4 h-4 text-accent-primary shrink-0" />
              <span className="text-xs font-mono uppercase tracking-wide text-text-muted">
                Publishers (24h)
              </span>
            </div>
            <div className="text-xl font-bold text-text-primary font-mono leading-tight">
              {summary.unique_publishers.toLocaleString()}
            </div>
            <div className="text-xs text-text-muted mt-0.5">unique</div>
          </div>
        </div>
      )}

      {/* Leaderboard */}
      <div className="bg-bg-secondary border border-border rounded-lg overflow-hidden">
        <div className="px-4 py-3 border-b border-border bg-bg-tertiary flex items-center gap-2">
          <Trophy className="w-4 h-4 text-accent-primary" />
          <span className="text-xs font-mono uppercase tracking-wide text-text-muted">
            Top publishers (24h)
          </span>
        </div>
        {isEmpty || leaderboard.leaders.length === 0 ? (
          <div className="px-4 py-4 text-sm text-text-muted">
            No publishers ranked yet. Check back after the next index refresh.
          </div>
        ) : (
          <div className="divide-y divide-border">
            {leaderboard.leaders.map(entry => (
              <div
                key={entry.domain}
                className="flex items-center gap-3 px-4 py-3 hover:bg-bg-tertiary/50 transition-colors"
              >
                <span className="text-xs font-mono text-accent-primary w-5 shrink-0 text-right">
                  {entry.rank}
                </span>
                <span className="flex-1 text-sm text-text-primary font-mono truncate min-w-0">
                  {entry.domain}
                </span>
                <span className="text-xs text-text-muted font-mono shrink-0">
                  {entry.count.toLocaleString()} txn
                </span>
                <span className="text-xs font-mono text-text-secondary shrink-0">
                  {formatUsdc(entry.volume_usdc)} USDC
                </span>
                <span className="text-xs font-mono text-text-muted shrink-0 w-12 text-right">
                  {entry.share_pct.toFixed(1)}%
                </span>
              </div>
            ))}
          </div>
        )}
      </div>

      <div className="text-xs text-text-muted font-mono">
        Refreshes every 60s. Index cron every 5 min; publisher manifest refresh 06:35 UTC.
        {summary.captured_at && (
          <> Last fetched at {new Date(summary.captured_at).toUTCString()}.</>
        )}
      </div>
    </div>
  );
}
