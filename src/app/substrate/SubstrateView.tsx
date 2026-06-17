'use client';

import { useEffect, useState, useMemo } from 'react';
import Link from 'next/link';
import { GitCommitVertical, ExternalLink } from 'lucide-react';

type SubstrateEventType =
  | 'model_added'
  | 'model_removed'
  | 'model_repriced'
  | 'model_deprecated'
  | 'spec_version'
  | 'framework_release'
  | 'protocol_milestone';

interface SubstrateEvent {
  id: string;
  type: SubstrateEventType;
  at: string;
  subject: string;
  provider: string | null;
  detail: string;
  version: string | null;
  source_url: string | null;
}

interface CurrentSpecs {
  mcp: string | null;
  x402: string | null;
  a2a: string | null;
  sources: { mcp: string | null; x402: string | null; a2a: string | null };
}

interface RecentResponse {
  ok: boolean;
  count: number;
  events: SubstrateEvent[];
  current_specs: CurrentSpecs | null;
  captured_at: string | null;
  attribution: string;
  license: string;
}

const TYPE_LABELS: Record<SubstrateEventType, string> = {
  model_added: 'Model added',
  model_removed: 'Model removed',
  model_repriced: 'Model repriced',
  model_deprecated: 'Model deprecated',
  spec_version: 'Spec version',
  framework_release: 'Framework release',
  protocol_milestone: 'Protocol milestone',
};

const TYPE_COLORS: Record<SubstrateEventType, string> = {
  model_added: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20',
  model_removed: 'bg-rose-500/10 text-rose-400 border-rose-500/20',
  model_repriced: 'bg-amber-500/10 text-amber-400 border-amber-500/20',
  model_deprecated: 'bg-orange-500/10 text-orange-400 border-orange-500/20',
  spec_version: 'bg-blue-500/10 text-blue-400 border-blue-500/20',
  framework_release: 'bg-purple-500/10 text-purple-400 border-purple-500/20',
  protocol_milestone: 'bg-cyan-500/10 text-cyan-400 border-cyan-500/20',
};

function typeLabel(t: SubstrateEventType): string {
  return TYPE_LABELS[t] ?? t;
}

function typeColor(t: SubstrateEventType): string {
  return TYPE_COLORS[t] ?? 'bg-bg-tertiary text-text-secondary border-border';
}

function formatDate(s: string): string {
  const d = new Date(s + 'T00:00:00.000Z');
  if (Number.isNaN(d.getTime())) return s;
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric', timeZone: 'UTC' });
}

const SPEC_ROWS: { key: 'mcp' | 'x402' | 'a2a'; label: string }[] = [
  { key: 'mcp', label: 'MCP' },
  { key: 'x402', label: 'x402' },
  { key: 'a2a', label: 'A2A' },
];

export default function SubstrateView() {
  const [data, setData] = useState<RecentResponse | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [activeType, setActiveType] = useState<string>('all');

  useEffect(() => {
    fetch('https://tensorfeed.ai/api/substrate-changelog/recent?limit=100')
      .then(r => { if (!r.ok) throw new Error(`HTTP ${r.status}`); return r.json(); })
      .then((j: RecentResponse) => setData(j))
      .catch(e => setError(e instanceof Error ? e.message : 'Failed to load'));
  }, []);

  const types = useMemo(() => {
    if (!data) return [];
    return Array.from(new Set(data.events.map(e => e.type)));
  }, [data]);

  const filtered = useMemo(() => {
    if (!data) return [];
    let rows = data.events;
    if (activeType !== 'all') rows = rows.filter(e => e.type === activeType);
    return [...rows].sort((a, b) => b.at.localeCompare(a.at));
  }, [data, activeType]);

  const specs = data?.current_specs ?? null;
  const hasSpecs = Boolean(specs && (specs.mcp || specs.x402 || specs.a2a));

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <div className="mb-8">
        <div className="flex items-center gap-3 mb-3">
          <div className="p-2 rounded-lg bg-accent-primary/10"><GitCommitVertical className="w-7 h-7 text-accent-primary" /></div>
          <h1 className="text-3xl sm:text-4xl font-bold text-text-primary">AI Substrate Changelog</h1>
        </div>
        <p className="text-text-secondary text-lg max-w-3xl">
          A forward-only timeline of changes to the substrate AI agents build on: model lifecycle (added, removed, repriced, deprecated), agent-protocol spec versions (MCP, x402, A2A), agent-framework releases, and agent-commerce milestones (payment-protocol governance and the rails that turn publishers into agent-paying merchants). The moving floor under every agent, in one feed. {data?.captured_at && `Updated ${formatDate(data.captured_at.slice(0, 10))}.`}
        </p>
      </div>

      {/* CURRENT SPEC STRIP */}
      {hasSpecs && specs && (
        <section aria-labelledby="specs-heading" className="mb-10">
          <h2 id="specs-heading" className="text-sm font-semibold text-text-muted uppercase tracking-wide mb-3">Current protocol spec versions</h2>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            {SPEC_ROWS.map(({ key, label }) => {
              const version = specs[key];
              const src = specs.sources[key];
              return (
                <div key={key} className="bg-bg-secondary border border-border rounded-lg p-4">
                  <div className="flex items-center justify-between gap-2 mb-1">
                    <span className="text-xs font-semibold text-text-muted uppercase tracking-wide">{label}</span>
                    {src && (
                      <a href={src} target="_blank" rel="noopener noreferrer" aria-label={`${label} spec source`} className="text-text-muted hover:text-accent-primary">
                        <ExternalLink className="w-3.5 h-3.5" />
                      </a>
                    )}
                  </div>
                  <div className="font-mono text-lg font-bold text-text-primary">{version ?? 'unknown'}</div>
                </div>
              );
            })}
          </div>
        </section>
      )}

      {/* FILTER PILLS */}
      {data && data.events.length > 0 && (
        <div className="flex gap-2 mb-6 flex-wrap" role="group" aria-label="Filter events by type">
          <button onClick={() => setActiveType('all')} className={`px-3 py-1 rounded-full text-xs font-medium transition-colors border ${activeType === 'all' ? 'bg-accent-primary text-white border-accent-primary' : 'bg-bg-secondary text-text-secondary border-border hover:border-text-muted'}`}>All</button>
          {types.map(t => (
            <button key={t} onClick={() => setActiveType(t)} className={`px-3 py-1 rounded-full text-xs font-medium transition-colors border ${activeType === t ? 'bg-accent-primary text-white border-accent-primary' : 'bg-bg-secondary text-text-secondary border-border hover:border-text-muted'}`}>{typeLabel(t)}</button>
          ))}
        </div>
      )}

      {/* STATES */}
      {error && (
        <div className="bg-rose-500/10 border border-rose-500/20 rounded-lg p-4 text-rose-400 text-sm mb-6">Error loading the changelog: {error}</div>
      )}

      {!data && !error && (
        <div className="text-text-muted text-sm">Loading substrate events...</div>
      )}

      {data && data.events.length === 0 && !error && (
        <div className="bg-bg-secondary border border-border rounded-lg p-5 text-sm text-text-secondary leading-relaxed">
          This feed is forward-only and began on June 4, 2026, so the timeline fills in as models, protocol specs, and frameworks change. The current spec versions above are the live baseline; diff events accrue here as the substrate moves.
        </div>
      )}

      {/* EVENT TIMELINE */}
      {data && data.events.length > 0 && (
        <section aria-labelledby="timeline-heading" className="mb-10">
          <h2 id="timeline-heading" className="sr-only">Event timeline</h2>
          <div className="space-y-3">
            {filtered.map(e => (
              <article key={e.id} className="bg-bg-secondary border border-border rounded-lg p-4 hover:border-accent-primary/50 transition-colors">
                <div className="flex items-start justify-between gap-3 flex-wrap mb-1.5">
                  <div className="min-w-0">
                    <span className={`inline-block text-[11px] px-1.5 py-0.5 rounded-full border font-medium ${typeColor(e.type)}`}>{typeLabel(e.type)}</span>
                    <span className="ml-2 font-semibold text-text-primary">
                      {e.source_url ? (
                        <a href={e.source_url} target="_blank" rel="noopener noreferrer" className="hover:text-accent-primary inline-flex items-center gap-1">
                          {e.subject} <ExternalLink className="w-3 h-3 text-text-muted" />
                        </a>
                      ) : (
                        e.subject
                      )}
                    </span>
                    {e.version && <span className="ml-2 font-mono text-sm text-accent-primary">{e.version}</span>}
                  </div>
                  <span className="text-xs font-mono text-text-muted shrink-0">{formatDate(e.at)}</span>
                </div>
                <p className="text-sm text-text-secondary leading-relaxed">{e.detail}</p>
                {e.provider && <div className="text-xs text-text-muted mt-1.5">Provider: {e.provider}</div>}
              </article>
            ))}
          </div>
        </section>
      )}

      <div className="bg-bg-secondary border border-border rounded-lg p-4 text-sm text-text-secondary">
        <p>For agents: same data at <Link href="/api-reference" className="text-accent-primary hover:underline font-mono">/api/substrate-changelog/recent</Link>. Filter with <code className="font-mono">?event_type=...</code>. Free, forward-only, refreshed daily.</p>
      </div>
    </div>
  );
}
