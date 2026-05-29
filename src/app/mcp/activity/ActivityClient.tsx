'use client';

import { useEffect, useState } from 'react';
import { Loader2, Package, Activity, Clock, AlertCircle } from 'lucide-react';

interface PackageStats {
  name: string;
  npm_url: string;
  downloads: {
    last_day: number | null;
    last_week: number | null;
    last_month: number | null;
  };
}

interface HostedEndpointStats {
  note: string;
  today_total: number;
  last_7d_total: number;
  last_30d_total: number;
  top_tools_7d: Array<{ tool: string; count: number; tier: 'free' | 'premium' | 'unknown' }>;
  daily_series_30d: Array<{ date: string; count: number }>;
}

interface Snapshot {
  generated_at: string;
  packages: PackageStats[];
  hosted_endpoint: HostedEndpointStats;
  attribution: string;
}

function formatNumber(n: number | null): string {
  if (n === null || n === undefined) return '-';
  if (n >= 1_000_000) return (n / 1_000_000).toFixed(1).replace(/\.0$/, '') + 'M';
  if (n >= 1_000) return (n / 1_000).toFixed(1).replace(/\.0$/, '') + 'k';
  return n.toLocaleString();
}

function formatRelativeTime(iso: string): string {
  const then = new Date(iso).getTime();
  const now = Date.now();
  const diffSec = Math.floor((now - then) / 1000);
  if (diffSec < 60) return `${diffSec}s ago`;
  if (diffSec < 3600) return `${Math.floor(diffSec / 60)} min ago`;
  if (diffSec < 86400) return `${Math.floor(diffSec / 3600)} hr ago`;
  return `${Math.floor(diffSec / 86400)} d ago`;
}

export default function ActivityClient() {
  const [data, setData] = useState<Snapshot | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    async function load() {
      try {
        const res = await fetch('/api/mcp/activity', { cache: 'no-store' });
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
            <div className="font-medium">Could not load activity snapshot</div>
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
        Loading activity...
      </div>
    );
  }

  const maxDaily = Math.max(1, ...data.hosted_endpoint.daily_series_30d.map((d) => d.count));

  return (
    <div className="space-y-8">
      <section>
        <div className="flex items-baseline justify-between mb-3">
          <h2 className="text-xl font-semibold text-text-primary flex items-center gap-2">
            <Package className="w-5 h-5" /> npm install counts
          </h2>
          <span className="text-xs text-text-muted">
            <Clock className="w-3 h-3 inline mr-1" />
            {formatRelativeTime(data.generated_at)}
          </span>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
          {data.packages.map((pkg) => (
            <div
              key={pkg.name}
              className="bg-bg-secondary border border-border-primary rounded p-5"
            >
              <a
                href={pkg.npm_url}
                target="_blank"
                rel="noopener noreferrer"
                className="font-mono text-sm text-accent-primary hover:underline"
              >
                {pkg.name}
              </a>
              <div className="grid grid-cols-3 gap-3 mt-3">
                <div>
                  <div className="text-2xl font-bold text-text-primary">
                    {formatNumber(pkg.downloads.last_day)}
                  </div>
                  <div className="text-xs text-text-muted uppercase tracking-wide">Last day</div>
                </div>
                <div>
                  <div className="text-2xl font-bold text-text-primary">
                    {formatNumber(pkg.downloads.last_week)}
                  </div>
                  <div className="text-xs text-text-muted uppercase tracking-wide">Last week</div>
                </div>
                <div>
                  <div className="text-2xl font-bold text-text-primary">
                    {formatNumber(pkg.downloads.last_month)}
                  </div>
                  <div className="text-xs text-text-muted uppercase tracking-wide">Last month</div>
                </div>
              </div>
            </div>
          ))}
        </div>
      </section>

      <section>
        <h2 className="text-xl font-semibold text-text-primary mb-3 flex items-center gap-2">
          <Activity className="w-5 h-5" /> Hosted endpoint tool calls
          <span className="text-xs text-text-muted font-normal ml-2">
            (streamable-HTTP at /api/mcp only)
          </span>
        </h2>

        <div className="grid grid-cols-3 gap-3 mb-4">
          <div className="bg-bg-secondary border border-border-primary rounded p-4">
            <div className="text-2xl font-bold text-text-primary">
              {formatNumber(data.hosted_endpoint.today_total)}
            </div>
            <div className="text-xs text-text-muted uppercase tracking-wide">Today</div>
          </div>
          <div className="bg-bg-secondary border border-border-primary rounded p-4">
            <div className="text-2xl font-bold text-text-primary">
              {formatNumber(data.hosted_endpoint.last_7d_total)}
            </div>
            <div className="text-xs text-text-muted uppercase tracking-wide">Last 7d</div>
          </div>
          <div className="bg-bg-secondary border border-border-primary rounded p-4">
            <div className="text-2xl font-bold text-text-primary">
              {formatNumber(data.hosted_endpoint.last_30d_total)}
            </div>
            <div className="text-xs text-text-muted uppercase tracking-wide">Last 30d</div>
          </div>
        </div>

        {data.hosted_endpoint.last_30d_total > 0 ? (
          <div className="bg-bg-secondary border border-border-primary rounded p-4 mb-4">
            <div className="text-xs text-text-muted uppercase tracking-wide mb-3">
              Daily calls (last 30d)
            </div>
            <div className="flex items-end gap-0.5 h-32">
              {data.hosted_endpoint.daily_series_30d.map((d, i) => {
                const h = Math.max(2, Math.round((d.count / maxDaily) * 120));
                return (
                  <div
                    key={d.date}
                    title={`${d.date}: ${d.count}`}
                    className="flex-1 bg-accent-primary/40 hover:bg-accent-primary rounded-t origin-bottom"
                    style={{
                      height: `${h}px`,
                      animation: `tf-bar-grow 600ms cubic-bezier(.2,.7,.3,1) ${i * 18}ms backwards`,
                      transition: 'background-color 200ms',
                    }}
                  />
                );
              })}
            </div>
            <style>{`@keyframes tf-bar-grow { from { transform: scaleY(0); opacity: 0; } to { transform: scaleY(1); opacity: 1; } }`}</style>
          </div>
        ) : (
          <div className="bg-bg-secondary border border-border-primary rounded p-6 mb-4 text-center text-text-muted">
            No hosted-endpoint tool calls recorded yet. Most TensorFeed MCP traffic comes from
            stdio-installed agents on the operator&apos;s own machine and does not appear here.
            Install counts on npm are the primary signal.
          </div>
        )}

        {data.hosted_endpoint.top_tools_7d.length > 0 ? (
          <div className="bg-bg-secondary border border-border-primary rounded p-4">
            <div className="text-xs text-text-muted uppercase tracking-wide mb-3">
              Top tools (last 7d)
            </div>
            <div className="space-y-1">
              {data.hosted_endpoint.top_tools_7d.map((t) => (
                <div key={t.tool} className="flex items-center justify-between text-sm">
                  <span className="font-mono text-text-primary">{t.tool}</span>
                  <span className="text-text-secondary">
                    {formatNumber(t.count)}{' '}
                    <span className="text-xs text-text-muted">({t.tier})</span>
                  </span>
                </div>
              ))}
            </div>
          </div>
        ) : null}

        <p className="text-xs text-text-muted mt-3 leading-relaxed">{data.hosted_endpoint.note}</p>
      </section>

      <section className="pt-4 border-t border-border-primary text-xs text-text-muted">
        {data.attribution}
      </section>
    </div>
  );
}
