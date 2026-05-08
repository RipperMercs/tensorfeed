'use client';

import { useEffect, useState } from 'react';
import { ArrowRight, TrendingUp } from 'lucide-react';

interface SnapshotData {
  ok: boolean;
  summary: {
    date: string;
    capturedAt: string;
    total_servers: number;
    total_versions: number;
    by_status: { active: number; deprecated: number };
    top_namespaces: { namespace: string; count: number }[];
    new_today: { count: number; names: string[] };
    delta_vs_yesterday: { added: number; removed: number; net: number };
  };
}

export default function RegistrySnapshot() {
  const [data, setData] = useState<SnapshotData | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetch('https://tensorfeed.ai/api/mcp/registry/snapshot')
      .then(res => {
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        return res.json();
      })
      .then((json: SnapshotData) => setData(json))
      .catch(e => setError(e instanceof Error ? e.message : 'Failed to load'));
  }, []);

  if (error) {
    return (
      <div className="bg-bg-secondary border border-border rounded-lg p-4 text-sm text-text-muted">
        Live registry snapshot unavailable. Check{' '}
        <a
          href="https://tensorfeed.ai/api/mcp/registry/snapshot"
          target="_blank"
          rel="noopener noreferrer"
          className="text-accent-primary hover:underline"
        >
          /api/mcp/registry/snapshot
        </a>{' '}
        directly.
      </div>
    );
  }

  if (!data) {
    return (
      <div className="grid gap-3 sm:grid-cols-3">
        {[0, 1, 2].map(i => (
          <div key={i} className="bg-bg-secondary border border-border rounded-lg p-5 animate-pulse h-24" />
        ))}
      </div>
    );
  }

  const { summary } = data;
  const fmt = (n: number) => n.toLocaleString('en-US');

  return (
    <div className="space-y-5">
      <div className="text-xs text-text-muted font-mono">
        snapshot {summary.date}, captured {new Date(summary.capturedAt).toUTCString()}
      </div>
      <div className="grid gap-3 sm:grid-cols-3">
        <div className="bg-bg-secondary border border-border rounded-lg p-5">
          <div className="text-xs uppercase tracking-wider text-text-muted mb-1">
            Total servers
          </div>
          <div className="text-3xl font-bold text-text-primary font-mono">
            {fmt(summary.total_servers)}
          </div>
          <div className="text-xs text-text-muted mt-1">
            {fmt(summary.by_status.active)} active, {fmt(summary.by_status.deprecated)} deprecated
          </div>
        </div>
        <div className="bg-bg-secondary border border-border rounded-lg p-5">
          <div className="text-xs uppercase tracking-wider text-text-muted mb-1">
            New today
          </div>
          <div className="text-3xl font-bold text-emerald-400 font-mono inline-flex items-center gap-2">
            +{fmt(summary.new_today.count)}
            <TrendingUp className="w-5 h-5" />
          </div>
          <div className="text-xs text-text-muted mt-1">
            net {summary.delta_vs_yesterday.net >= 0 ? '+' : ''}
            {fmt(summary.delta_vs_yesterday.net)} vs yesterday
          </div>
        </div>
        <div className="bg-bg-secondary border border-border rounded-lg p-5">
          <div className="text-xs uppercase tracking-wider text-text-muted mb-1">
            Total versions
          </div>
          <div className="text-3xl font-bold text-text-primary font-mono">
            {fmt(summary.total_versions)}
          </div>
          <div className="text-xs text-text-muted mt-1">
            published across all servers
          </div>
        </div>
      </div>

      <div className="bg-bg-secondary border border-border rounded-lg p-5">
        <div className="text-xs uppercase tracking-wider text-text-muted mb-3">
          Top namespaces by server count
        </div>
        <div className="grid gap-2 sm:grid-cols-2">
          {summary.top_namespaces.slice(0, 8).map(ns => (
            <div key={ns.namespace} className="flex items-center justify-between text-sm">
              <span className="font-mono text-text-secondary truncate">{ns.namespace}</span>
              <span className="font-mono text-text-primary tabular-nums shrink-0 ml-3">
                {fmt(ns.count)}
              </span>
            </div>
          ))}
        </div>
      </div>

      <a
        href="https://tensorfeed.ai/api/mcp/registry/snapshot"
        target="_blank"
        rel="noopener noreferrer"
        className="inline-flex items-center gap-1.5 text-sm text-accent-primary hover:underline group"
      >
        Full snapshot API
        <ArrowRight className="w-4 h-4 group-hover:translate-x-0.5 transition-transform" />
      </a>
    </div>
  );
}
