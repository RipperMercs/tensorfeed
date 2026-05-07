'use client';

import { useEffect, useState } from 'react';
import { ExternalLink } from 'lucide-react';

interface PolicyEntry {
  id: string;
  title: string;
  jurisdiction: string;
  type: string;
  status: string;
  enacted_date: string;
  effective_date: string | null;
  summary: string;
  source_url: string;
  citations: string[];
  scope: string[];
}

interface ApiResponse {
  ok: true;
  count: number;
  policies: PolicyEntry[];
}

const JURISDICTIONS: Array<{ id: string; label: string }> = [
  { id: '', label: 'All jurisdictions' },
  { id: 'US-Federal', label: 'US Federal' },
  { id: 'US-State', label: 'US State' },
  { id: 'EU', label: 'EU' },
  { id: 'UK', label: 'UK' },
  { id: 'China', label: 'China' },
  { id: 'International', label: 'International' },
];

const STATUSES: Array<{ id: string; label: string }> = [
  { id: '', label: 'Any status' },
  { id: 'active', label: 'Active' },
  { id: 'phased', label: 'Phased' },
  { id: 'pending', label: 'Pending' },
  { id: 'rescinded', label: 'Rescinded' },
  { id: 'vetoed', label: 'Vetoed' },
];

function statusTone(status: string): string {
  switch (status) {
    case 'active': return 'bg-green-500/10 text-green-400 border-green-500/20';
    case 'phased': return 'bg-blue-500/10 text-blue-400 border-blue-500/20';
    case 'pending': return 'bg-amber-500/10 text-amber-400 border-amber-500/20';
    case 'rescinded': return 'bg-red-500/10 text-red-400 border-red-500/20';
    case 'vetoed': return 'bg-red-500/10 text-red-400 border-red-500/20';
    default: return 'bg-bg-tertiary text-text-tertiary border-bg-tertiary';
  }
}

export default function PolicyRegistryWidget() {
  const [data, setData] = useState<ApiResponse | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [jurisdiction, setJurisdiction] = useState<string>('');
  const [status, setStatus] = useState<string>('');

  useEffect(() => {
    let cancelled = false;
    async function load() {
      try {
        setLoading(true);
        const params = new URLSearchParams();
        if (jurisdiction) params.set('jurisdiction', jurisdiction);
        if (status) params.set('status', status);
        const url = params.toString()
          ? `/api/policy/ai/registry?${params.toString()}`
          : '/api/policy/ai/registry';
        const res = await fetch(url);
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const body = (await res.json()) as ApiResponse;
        if (!cancelled) {
          setData(body);
          setError(null);
        }
      } catch (e) {
        if (!cancelled) setError(e instanceof Error ? e.message : 'failed to load');
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    load();
    return () => {
      cancelled = true;
    };
  }, [jurisdiction, status]);

  return (
    <div>
      <div className="flex flex-wrap gap-3 mb-5">
        <select
          value={jurisdiction}
          onChange={e => setJurisdiction(e.target.value)}
          className="text-sm bg-bg-secondary border border-bg-tertiary rounded px-3 py-1.5 text-text-primary"
        >
          {JURISDICTIONS.map(j => (
            <option key={j.id} value={j.id}>{j.label}</option>
          ))}
        </select>
        <select
          value={status}
          onChange={e => setStatus(e.target.value)}
          className="text-sm bg-bg-secondary border border-bg-tertiary rounded px-3 py-1.5 text-text-primary"
        >
          {STATUSES.map(s => (
            <option key={s.id} value={s.id}>{s.label}</option>
          ))}
        </select>
      </div>

      {loading && (
        <div className="space-y-3">
          {Array.from({ length: 5 }).map((_, i) => (
            <div key={i} className="h-24 bg-bg-tertiary rounded animate-pulse" />
          ))}
        </div>
      )}

      {error && !data && (
        <div className="text-sm text-text-secondary py-4">
          Registry unavailable. <span className="text-text-tertiary text-xs">({error})</span>
        </div>
      )}

      {data && data.policies.length === 0 && (
        <div className="text-sm text-text-secondary py-4">No entries match the current filter.</div>
      )}

      {data && data.policies.length > 0 && (
        <div className="space-y-3">
          {data.policies.map(p => (
            <article
              key={p.id}
              className="border border-bg-tertiary rounded-lg p-4 bg-bg-secondary/50"
            >
              <div className="flex items-start justify-between gap-3 mb-2">
                <div className="flex-1 min-w-0">
                  <h3 className="text-base font-semibold text-text-primary leading-snug">
                    <a
                      href={p.source_url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="hover:text-accent-primary inline-flex items-start gap-1.5"
                    >
                      <span>{p.title}</span>
                      <ExternalLink className="w-3.5 h-3.5 text-text-tertiary mt-1 flex-shrink-0" />
                    </a>
                  </h3>
                  <div className="flex flex-wrap items-center gap-2 mt-2 text-xs">
                    <span className="text-text-tertiary font-mono">{p.jurisdiction}</span>
                    <span className="text-text-tertiary">&middot;</span>
                    <span className="text-text-tertiary">{p.type}</span>
                    <span className="text-text-tertiary">&middot;</span>
                    <span className="text-text-tertiary font-mono">enacted {p.enacted_date}</span>
                    {p.effective_date && p.effective_date !== p.enacted_date && (
                      <>
                        <span className="text-text-tertiary">&middot;</span>
                        <span className="text-text-tertiary font-mono">effective {p.effective_date}</span>
                      </>
                    )}
                  </div>
                </div>
                <span className={`text-xs px-2 py-0.5 rounded border font-mono uppercase ${statusTone(p.status)}`}>
                  {p.status}
                </span>
              </div>
              <p className="text-sm text-text-secondary leading-relaxed">{p.summary}</p>
              {p.scope.length > 0 && (
                <div className="flex flex-wrap gap-1.5 mt-3">
                  {p.scope.map(s => (
                    <span key={s} className="text-xs px-2 py-0.5 rounded bg-bg-tertiary text-text-tertiary font-mono">
                      {s}
                    </span>
                  ))}
                </div>
              )}
            </article>
          ))}
        </div>
      )}
    </div>
  );
}
