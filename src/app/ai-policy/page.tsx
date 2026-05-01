'use client';

import { useEffect, useState, useMemo } from 'react';
import Link from 'next/link';
import { Scale, ExternalLink } from 'lucide-react';

interface Milestone { date: string; event: string }
interface PolicyItem {
  id: string;
  name: string;
  jurisdiction: string;
  status: 'active' | 'pending' | 'proposed' | 'stalled' | 'repealed';
  type: string;
  enactedDate: string | null;
  milestones: Milestone[];
  scope: string;
  summary: string;
  lead: string;
  penalties: string;
  url: string;
}

interface Response {
  ok: boolean;
  lastUpdated: string;
  count: number;
  items: PolicyItem[];
}

const STATUS_COLORS: Record<string, string> = {
  active: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20',
  pending: 'bg-amber-500/10 text-amber-400 border-amber-500/20',
  proposed: 'bg-blue-500/10 text-blue-400 border-blue-500/20',
  stalled: 'bg-text-muted/10 text-text-muted border-border',
  repealed: 'bg-rose-500/10 text-rose-400 border-rose-500/20',
};

export default function AIPolicyPage() {
  const [data, setData] = useState<Response | null>(null);
  const [activeStatus, setActiveStatus] = useState<string>('all');
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetch('https://tensorfeed.ai/api/ai-policy')
      .then(r => { if (!r.ok) throw new Error(`HTTP ${r.status}`); return r.json(); })
      .then((j: Response) => setData(j))
      .catch(e => setError(e instanceof Error ? e.message : 'Failed to load'));
  }, []);

  const filtered = useMemo(() => {
    if (!data) return [];
    if (activeStatus === 'all') return data.items;
    return data.items.filter(i => i.status === activeStatus);
  }, [data, activeStatus]);

  return (
    <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <div className="mb-6">
        <div className="flex items-center gap-3 mb-3">
          <div className="p-2 rounded-lg bg-accent-primary/10"><Scale className="w-7 h-7 text-accent-primary" /></div>
          <h1 className="text-3xl sm:text-4xl font-bold text-text-primary">AI Policy Tracker</h1>
        </div>
        <p className="text-text-secondary text-lg max-w-3xl">
          Active and pending AI regulations, frameworks, and standards across jurisdictions: EU, US (federal + state), UK, China, Korea, plus international standards (NIST AI RMF, ISO 42001). Each entry: status, milestones, scope, penalties. {data?.lastUpdated && `Updated ${data.lastUpdated}.`}
        </p>
      </div>

      <div className="flex gap-2 mb-6 flex-wrap">
        {['all', 'active', 'pending', 'proposed', 'repealed'].map(s => (
          <button key={s} onClick={() => setActiveStatus(s)} className={`px-3 py-1 rounded-full text-xs font-medium transition-colors border ${activeStatus === s ? 'bg-accent-primary text-white border-accent-primary' : 'bg-bg-secondary text-text-secondary border-border hover:border-text-muted'}`}>
            {s.charAt(0).toUpperCase() + s.slice(1)}
          </button>
        ))}
      </div>

      {error && <div className="bg-rose-500/10 border border-rose-500/20 rounded-lg p-4 text-rose-400 text-sm mb-6">Error: {error}</div>}

      {data && (
        <div className="space-y-4 mb-10">
          {filtered.map(item => (
            <div key={item.id} className="bg-bg-secondary border border-border rounded-lg p-4">
              <div className="flex items-start justify-between gap-3 flex-wrap mb-2">
                <div className="min-w-0">
                  <a href={item.url} target="_blank" rel="noopener noreferrer" className="font-semibold text-text-primary text-lg hover:text-accent-primary inline-flex items-center gap-1">
                    {item.name} <ExternalLink className="w-3 h-3 text-text-muted" />
                  </a>
                  <div className="text-xs text-text-muted mt-0.5">{item.jurisdiction} · {item.type}{item.enactedDate && ` · Enacted ${item.enactedDate}`}</div>
                </div>
                <span className={`text-xs px-2 py-0.5 rounded-full border font-medium ${STATUS_COLORS[item.status]}`}>{item.status}</span>
              </div>
              <p className="text-sm text-text-secondary leading-relaxed mb-3">{item.summary}</p>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs mb-3">
                <div>
                  <div className="text-text-muted uppercase tracking-wide mb-0.5">Scope</div>
                  <div className="text-text-primary">{item.scope}</div>
                </div>
                <div>
                  <div className="text-text-muted uppercase tracking-wide mb-0.5">Lead / Enforcer</div>
                  <div className="text-text-primary">{item.lead}</div>
                </div>
              </div>
              <div className="text-xs text-text-secondary mb-2"><span className="text-text-muted">Penalties:</span> {item.penalties}</div>
              {item.milestones.length > 0 && (
                <div className="border-t border-border/50 pt-2">
                  <div className="text-xs text-text-muted uppercase tracking-wide mb-1">Milestones</div>
                  <ul className="space-y-1">
                    {item.milestones.map((m, i) => (
                      <li key={i} className="text-xs text-text-secondary"><span className="font-mono text-text-primary">{m.date}</span> · {m.event}</li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      <div className="bg-bg-secondary border border-border rounded-lg p-4 text-sm text-text-secondary">
        <p>For agents: same data at <Link href="/api-reference/ai-policy" className="text-accent-primary hover:underline font-mono">/api/ai-policy</Link>. Filter with <code className="font-mono">?status=active|pending|proposed</code> or <code className="font-mono">?jurisdiction=EU|US|UK|China</code>. Free, cached 10 min.</p>
      </div>
    </div>
  );
}
