'use client';

import { useEffect, useState } from 'react';
import { CheckCircle2, XCircle, AlertCircle, Loader2, Clock, ExternalLink } from 'lucide-react';

type Outcome = 'ok' | 'manifest_malformed' | 'unreachable' | 'timeout' | 'http_error';

interface StatusCheckResult {
  domain: string;
  checked_at: string;
  outcome: Outcome;
  latency_ms: number;
  http_status?: number;
  x402_version?: number | null;
  accepts_count?: number;
  reason?: string;
}

interface PublisherStatusRecord {
  domain: string;
  current: StatusCheckResult;
  series: StatusCheckResult[];
  uptime_pct_24h: number;
  uptime_pct_7d: number;
}

interface Snapshot {
  generated_at: string;
  publishers: PublisherStatusRecord[];
  totals: { monitored: number; ok: number; degraded: number };
}

function outcomeMeta(outcome: Outcome): { label: string; color: string; icon: typeof CheckCircle2 } {
  switch (outcome) {
    case 'ok':
      return { label: 'OK', color: 'text-green-500 bg-green-500/10 border-green-500/30', icon: CheckCircle2 };
    case 'manifest_malformed':
      return { label: 'Malformed manifest', color: 'text-yellow-500 bg-yellow-500/10 border-yellow-500/30', icon: AlertCircle };
    case 'unreachable':
      return { label: 'Unreachable', color: 'text-red-500 bg-red-500/10 border-red-500/30', icon: XCircle };
    case 'timeout':
      return { label: 'Timeout', color: 'text-red-500 bg-red-500/10 border-red-500/30', icon: XCircle };
    case 'http_error':
      return { label: 'HTTP error', color: 'text-red-500 bg-red-500/10 border-red-500/30', icon: XCircle };
    default:
      return { label: 'Unknown', color: 'text-text-muted bg-bg-secondary border-border-primary', icon: AlertCircle };
  }
}

function StatusSparkline({ series }: { series: StatusCheckResult[] }) {
  const recent = series.slice(-48);
  if (recent.length === 0) {
    return <span className="text-xs text-text-muted">no history</span>;
  }
  const tickWidth = 3;
  const gap = 1;
  const height = 18;
  const width = recent.length * (tickWidth + gap) - gap;
  return (
    <svg
      width={width}
      height={height}
      role="img"
      aria-label={`${recent.length} recent status checks`}
      style={{ display: 'block' }}
    >
      {recent.map((r, i) => {
        const ok = r.outcome === 'ok';
        const malformed = r.outcome === 'manifest_malformed';
        const color = ok ? '#22C55E' : malformed ? '#EAB308' : '#EF4444';
        return (
          <rect
            key={`${r.checked_at}-${i}`}
            x={i * (tickWidth + gap)}
            y={2}
            width={tickWidth}
            height={height - 4}
            rx={0.5}
            fill={color}
            opacity={0.85}
          >
            <title>
              {r.checked_at}: {r.outcome} ({r.latency_ms}ms)
            </title>
          </rect>
        );
      })}
    </svg>
  );
}

function formatRelativeTime(iso: string): string {
  const then = new Date(iso).getTime();
  const now = Date.now();
  const diffSec = Math.floor((now - then) / 1000);
  if (diffSec < 60) return `${diffSec}s ago`;
  if (diffSec < 3600) return `${Math.floor(diffSec / 60)}m ago`;
  if (diffSec < 86400) return `${Math.floor(diffSec / 3600)}h ago`;
  return `${Math.floor(diffSec / 86400)}d ago`;
}

export default function HealthClient() {
  const [data, setData] = useState<Snapshot | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    async function load() {
      try {
        const res = await fetch('/api/x402/status', { cache: 'no-store' });
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const json = (await res.json()) as Snapshot;
        if (!cancelled) setData(json);
      } catch (e) {
        if (!cancelled) setError(e instanceof Error ? e.message : String(e));
      }
    }
    load();
    return () => {
      cancelled = true;
    };
  }, []);

  if (error) {
    return (
      <div className="bg-red-500/10 border border-red-500/30 rounded p-4 text-red-400">
        <div className="flex items-start gap-2">
          <AlertCircle className="w-5 h-5 mt-0.5 flex-shrink-0" />
          <div>
            <div className="font-medium">Could not load status snapshot</div>
            <div className="text-sm mt-1">{error}</div>
          </div>
        </div>
      </div>
    );
  }

  if (!data) {
    return (
      <div className="flex items-center justify-center py-20 text-text-muted">
        <Loader2 className="w-5 h-5 animate-spin mr-2" />
        Loading status...
      </div>
    );
  }

  if (data.publishers.length === 0) {
    return (
      <div className="bg-bg-secondary border border-border-primary rounded p-8 text-center text-text-muted">
        <AlertCircle className="w-8 h-8 mx-auto mb-3 opacity-50" />
        <div className="font-medium text-text-primary mb-1">No status data yet</div>
        <div className="text-sm">
          The hourly status cron runs at :27 each hour. First snapshot lands within an hour of
          the page going live. Check back soon.
        </div>
      </div>
    );
  }

  const pctTotal = data.totals.monitored;
  const pctOk = pctTotal === 0 ? 0 : Math.round((data.totals.ok / pctTotal) * 100);

  return (
    <div className="space-y-6">
      {/* Topline */}
      <section className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <div className="bg-bg-secondary border border-border-primary rounded p-4">
          <div className="text-2xl font-bold text-text-primary">{data.totals.monitored}</div>
          <div className="text-xs text-text-muted uppercase tracking-wide">Monitored</div>
        </div>
        <div className="bg-bg-secondary border border-border-primary rounded p-4">
          <div className="text-2xl font-bold text-green-500">{data.totals.ok}</div>
          <div className="text-xs text-text-muted uppercase tracking-wide">OK now</div>
        </div>
        <div className="bg-bg-secondary border border-border-primary rounded p-4">
          <div className="text-2xl font-bold text-yellow-500">{data.totals.degraded}</div>
          <div className="text-xs text-text-muted uppercase tracking-wide">Degraded</div>
        </div>
        <div className="bg-bg-secondary border border-border-primary rounded p-4">
          <div className="text-2xl font-bold text-text-primary">{pctOk}%</div>
          <div className="text-xs text-text-muted uppercase tracking-wide">Currently up</div>
        </div>
      </section>

      <section className="text-xs text-text-muted flex items-center gap-1">
        <Clock className="w-3 h-3" />
        Last refreshed {formatRelativeTime(data.generated_at)} ·{' '}
        <a
          href="/api/x402/status"
          target="_blank"
          rel="noopener noreferrer"
          className="text-accent-primary hover:underline"
        >
          raw JSON
        </a>
      </section>

      {/* Per-publisher list */}
      <section className="space-y-2">
        {data.publishers.map((p) => {
          const meta = outcomeMeta(p.current.outcome);
          const Icon = meta.icon;
          return (
            <div
              key={p.domain}
              className="bg-bg-secondary border border-border-primary rounded p-4"
            >
              <div className="flex items-start gap-3 flex-wrap">
                <Icon className={`w-5 h-5 mt-0.5 flex-shrink-0 ${meta.color.split(' ')[0]}`} />
                <div className="flex-1 min-w-0">
                  <div className="flex items-baseline gap-3 flex-wrap">
                    <a
                      href={`https://${p.domain}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="font-mono text-text-primary hover:text-accent-primary text-sm font-medium"
                    >
                      {p.domain}
                    </a>
                    <span className={`px-2 py-0.5 rounded border text-xs ${meta.color}`}>{meta.label}</span>
                    <span className="text-xs text-text-muted">
                      {p.current.latency_ms}ms · checked {formatRelativeTime(p.current.checked_at)}
                    </span>
                  </div>
                  {p.current.reason ? (
                    <div className="text-xs text-text-muted mt-1">{p.current.reason}</div>
                  ) : null}
                  <div className="flex items-center gap-4 mt-2 text-xs flex-wrap">
                    <span className="text-text-muted">
                      24h uptime:{' '}
                      <span className="text-text-primary font-medium">{p.uptime_pct_24h}%</span>
                    </span>
                    <span className="text-text-muted">
                      7d uptime:{' '}
                      <span className="text-text-primary font-medium">{p.uptime_pct_7d}%</span>
                    </span>
                    <a
                      href={`/verify?domain=${encodeURIComponent(p.domain)}`}
                      className="text-accent-primary hover:underline inline-flex items-center gap-1"
                    >
                      AFTA scorecard <ExternalLink className="w-3 h-3" />
                    </a>
                  </div>
                  <div className="mt-2 flex items-center gap-2">
                    <StatusSparkline series={p.series} />
                    <span className="text-[10px] text-text-muted uppercase tracking-wide">
                      last {Math.min(48, p.series.length)} checks
                    </span>
                  </div>
                </div>
              </div>
            </div>
          );
        })}
      </section>
    </div>
  );
}
