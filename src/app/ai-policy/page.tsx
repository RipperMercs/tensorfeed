'use client';

import { useEffect, useState, useMemo } from 'react';
import Link from 'next/link';
import { Scale, ExternalLink } from 'lucide-react';

type PolicyStatus = 'active' | 'phased' | 'pending' | 'rescinded' | 'vetoed' | 'proposed';
type Jurisdiction = 'US-Federal' | 'US-State' | 'EU' | 'UK' | 'China' | 'International';

interface PolicyEntry {
  id: string;
  title: string;
  jurisdiction: Jurisdiction;
  type: string;
  status: PolicyStatus;
  enacted_date: string;
  effective_date: string | null;
  summary: string;
  source_url: string;
  citations: string[];
  scope: string[];
}

interface RegistryResponse {
  ok: boolean;
  count: number;
  last_updated: string;
  policies: PolicyEntry[];
}

const STATUS_COLORS: Record<PolicyStatus, string> = {
  active: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20',
  phased: 'bg-sky-500/10 text-sky-400 border-sky-500/20',
  pending: 'bg-amber-500/10 text-amber-400 border-amber-500/20',
  proposed: 'bg-blue-500/10 text-blue-400 border-blue-500/20',
  vetoed: 'bg-rose-500/10 text-rose-400 border-rose-500/20',
  rescinded: 'bg-text-muted/10 text-text-muted border-border',
};

const STATUS_FILTERS: Array<'all' | PolicyStatus> = [
  'all', 'active', 'phased', 'pending', 'proposed', 'vetoed', 'rescinded',
];

function hostOf(u: string): string {
  try {
    return new URL(u).hostname.replace(/^www\./, '');
  } catch {
    return u;
  }
}

export default function AIPolicyPage() {
  const [data, setData] = useState<RegistryResponse | null>(null);
  const [activeStatus, setActiveStatus] = useState<'all' | PolicyStatus>('all');
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetch('https://tensorfeed.ai/api/policy/ai/registry')
      .then(r => { if (!r.ok) throw new Error(`HTTP ${r.status}`); return r.json(); })
      .then((j: RegistryResponse) => setData(j))
      .catch(e => setError(e instanceof Error ? e.message : 'Failed to load'));
  }, []);

  const filtered = useMemo(() => {
    if (!data) return [];
    if (activeStatus === 'all') return data.policies;
    return data.policies.filter(p => p.status === activeStatus);
  }, [data, activeStatus]);

  return (
    <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <div className="mb-6">
        <div className="flex items-center gap-3 mb-3">
          <div className="p-2 rounded-lg bg-accent-primary/10"><Scale className="w-7 h-7 text-accent-primary" /></div>
          <h1 className="text-3xl sm:text-4xl font-bold text-text-primary">AI Policy Tracker</h1>
        </div>
        <p className="text-text-secondary text-lg max-w-3xl">
          Significant AI policy actions across jurisdictions: US (federal and state), EU, UK, China, plus international frameworks and declarations. Executive orders, statutes, regulations, guidance, and frontier-model safety laws. Each entry: jurisdiction, type, status, key dates, scope tags, and a link to the canonical government source. {data?.last_updated && `Updated ${data.last_updated}.`}
        </p>
      </div>

      <div className="flex gap-2 mb-6 flex-wrap">
        {STATUS_FILTERS.map(s => (
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
                  <a href={item.source_url} target="_blank" rel="noopener noreferrer" className="font-semibold text-text-primary text-lg hover:text-accent-primary inline-flex items-center gap-1">
                    {item.title} <ExternalLink className="w-3 h-3 text-text-muted" />
                  </a>
                  <div className="text-xs text-text-muted mt-0.5">
                    {item.jurisdiction} · {item.type} · Enacted {item.enacted_date}
                    {item.effective_date && item.effective_date !== item.enacted_date && ` · Effective ${item.effective_date}`}
                  </div>
                </div>
                <span className={`text-xs px-2 py-0.5 rounded-full border font-medium ${STATUS_COLORS[item.status]}`}>{item.status}</span>
              </div>
              <p className="text-sm text-text-secondary leading-relaxed mb-3">{item.summary}</p>
              {item.scope.length > 0 && (
                <div className="flex flex-wrap gap-1.5 mb-3">
                  {item.scope.map(tag => (
                    <span key={tag} className="text-xs px-2 py-0.5 rounded-full border border-border bg-bg-primary text-text-secondary font-mono">{tag}</span>
                  ))}
                </div>
              )}
              {item.citations.length > 0 && (
                <div className="border-t border-border/50 pt-2">
                  <div className="text-xs text-text-muted uppercase tracking-wide mb-1">Citations</div>
                  <ul className="space-y-1">
                    {item.citations.map(c => (
                      <li key={c}>
                        <a href={c} target="_blank" rel="noopener noreferrer" className="text-xs text-accent-primary hover:underline inline-flex items-center gap-1 break-all">
                          {hostOf(c)} <ExternalLink className="w-3 h-3 text-text-muted shrink-0" />
                        </a>
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      <div className="bg-bg-secondary border border-border rounded-lg p-4 text-sm text-text-secondary">
        <p>For agents: same data at <Link href="/api-reference/ai-policy" className="text-accent-primary hover:underline font-mono">/api/policy/ai/registry</Link>. Filter with <code className="font-mono">?status=active|phased|pending|proposed|vetoed|rescinded</code>, <code className="font-mono">?jurisdiction=US-Federal|US-State|EU|UK|China|International</code>, <code className="font-mono">?type=</code>, or <code className="font-mono">?scope=</code>. Free, no auth.</p>
      </div>
    </div>
  );
}
