'use client';

import { useEffect, useState, useMemo } from 'react';
import Link from 'next/link';
import { Zap, ExternalLink, Check, Clock, HelpCircle } from 'lucide-react';

interface Entry {
  id: string;
  name: string;
  vendor: string;
  category: string;
  status: 'live' | 'pending' | 'unknown';
  role: string;
  defaultMonthlyCap: number;
  notes: string;
  url: string;
}

interface Summary {
  total_named_partners: number;
  catalog_size: number;
  live: number;
  pending: number;
  unknown: number;
  unnamed_launch_partners: number;
}

interface Response {
  ok: boolean;
  protocol: string;
  protocol_launched: string;
  lastUpdated: string;
  summary: Summary;
  count: number;
  providers: Entry[];
}

const CATEGORY_LABEL: Record<string, string> = {
  hosting: 'Hosting',
  'cdn-edge': 'CDN / edge',
  database: 'Database',
  auth: 'Auth',
  observability: 'Observability',
  'background-jobs': 'Background jobs',
  'ai-infrastructure': 'AI infrastructure',
  email: 'Email',
};

const STATUS_ORDER: Array<'live' | 'pending' | 'unknown'> = ['live', 'pending', 'unknown'];
const STATUS_LABEL: Record<string, string> = {
  live: 'Live',
  pending: 'Not yet',
  unknown: 'Unconfirmed',
};

function StatusBadge({ status }: { status: Entry['status'] }) {
  if (status === 'live') {
    return (
      <span className="text-xs px-2 py-0.5 rounded border bg-emerald-500/10 text-emerald-400 border-emerald-500/20 inline-flex items-center gap-1 shrink-0">
        <Check className="w-3 h-3" /> Live
      </span>
    );
  }
  if (status === 'pending') {
    return (
      <span className="text-xs px-2 py-0.5 rounded border bg-amber-500/10 text-amber-400 border-amber-500/20 inline-flex items-center gap-1 shrink-0">
        <Clock className="w-3 h-3" /> Not yet
      </span>
    );
  }
  return (
    <span className="text-xs px-2 py-0.5 rounded border bg-bg-tertiary text-text-muted border-border inline-flex items-center gap-1 shrink-0">
      <HelpCircle className="w-3 h-3" /> Unconfirmed
    </span>
  );
}

export default function AgentProvisioningPage() {
  const [data, setData] = useState<Response | null>(null);
  const [activeStatus, setActiveStatus] = useState<string>('all');
  const [activeCategory, setActiveCategory] = useState<string>('all');
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetch('https://tensorfeed.ai/api/agent-provisioning')
      .then(res => { if (!res.ok) throw new Error(`HTTP ${res.status}`); return res.json(); })
      .then((json: Response) => setData(json))
      .catch(e => setError(e instanceof Error ? e.message : 'Failed to load'));
  }, []);

  const categories = useMemo(() => {
    if (!data) return [];
    return Array.from(new Set(data.providers.map(p => p.category)));
  }, [data]);

  const filtered = useMemo(() => {
    if (!data) return [];
    let rows = data.providers;
    if (activeStatus !== 'all') rows = rows.filter(p => p.status === activeStatus);
    if (activeCategory !== 'all') rows = rows.filter(p => p.category === activeCategory);
    return rows;
  }, [data, activeStatus, activeCategory]);

  return (
    <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <div className="mb-6">
        <div className="flex items-center gap-3 mb-3">
          <div className="p-2 rounded-lg bg-accent-primary/10">
            <Zap className="w-7 h-7 text-accent-primary" />
          </div>
          <h1 className="text-3xl sm:text-4xl font-bold text-text-primary">Agent Provisioning Support</h1>
        </div>
        <p className="text-text-secondary text-lg max-w-3xl">
          On April 30, 2026 Cloudflare and Stripe shipped an open protocol that lets AI agents create accounts, register domains, start paid subscriptions, and deploy to production across 32 launch partners. This page tracks who shipped support, who has not, and who agents will route around. {data?.lastUpdated && `Updated ${data.lastUpdated}.`}
        </p>
      </div>

      {data && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-8">
          <div className="bg-bg-secondary border border-border rounded-lg p-4">
            <div className="text-xs text-text-muted uppercase tracking-wide mb-1">Named partners</div>
            <div className="text-2xl font-semibold text-text-primary">{data.summary.total_named_partners}</div>
            <div className="text-xs text-text-muted">on launch list</div>
          </div>
          <div className="bg-bg-secondary border border-border rounded-lg p-4">
            <div className="text-xs text-text-muted uppercase tracking-wide mb-1">Live</div>
            <div className="text-2xl font-semibold text-emerald-400">{data.summary.live}</div>
            <div className="text-xs text-text-muted">named in spec</div>
          </div>
          <div className="bg-bg-secondary border border-border rounded-lg p-4">
            <div className="text-xs text-text-muted uppercase tracking-wide mb-1">Not yet</div>
            <div className="text-2xl font-semibold text-amber-400">{data.summary.pending}</div>
            <div className="text-xs text-text-muted">conspicuously absent</div>
          </div>
          <div className="bg-bg-secondary border border-border rounded-lg p-4">
            <div className="text-xs text-text-muted uppercase tracking-wide mb-1">Unconfirmed</div>
            <div className="text-2xl font-semibold text-text-secondary">{data.summary.unknown}</div>
            <div className="text-xs text-text-muted">likely on the list</div>
          </div>
        </div>
      )}

      <div className="flex gap-2 mb-3 flex-wrap items-center">
        <span className="text-xs text-text-muted uppercase tracking-wide">Status:</span>
        <button onClick={() => setActiveStatus('all')}
          className={`px-3 py-1 rounded-full text-xs font-medium transition-colors border ${
            activeStatus === 'all' ? 'bg-accent-primary text-white border-accent-primary' : 'bg-bg-secondary text-text-secondary border-border hover:border-text-muted'
          }`}
        >All</button>
        {STATUS_ORDER.map(s => (
          <button key={s} onClick={() => setActiveStatus(s)}
            className={`px-3 py-1 rounded-full text-xs font-medium transition-colors border ${
              activeStatus === s ? 'bg-accent-primary text-white border-accent-primary' : 'bg-bg-secondary text-text-secondary border-border hover:border-text-muted'
            }`}
          >{STATUS_LABEL[s]}</button>
        ))}
      </div>

      <div className="flex gap-2 mb-6 flex-wrap items-center">
        <span className="text-xs text-text-muted uppercase tracking-wide">Category:</span>
        <button onClick={() => setActiveCategory('all')}
          className={`px-3 py-1 rounded-full text-xs font-medium transition-colors border ${
            activeCategory === 'all' ? 'bg-accent-primary text-white border-accent-primary' : 'bg-bg-secondary text-text-secondary border-border hover:border-text-muted'
          }`}
        >All</button>
        {categories.map(c => (
          <button key={c} onClick={() => setActiveCategory(c)}
            className={`px-3 py-1 rounded-full text-xs font-medium transition-colors border ${
              activeCategory === c ? 'bg-accent-primary text-white border-accent-primary' : 'bg-bg-secondary text-text-secondary border-border hover:border-text-muted'
            }`}
          >{CATEGORY_LABEL[c] || c}</button>
        ))}
      </div>

      {error && <div className="bg-rose-500/10 border border-rose-500/20 rounded-lg p-4 text-rose-400 text-sm mb-6">Error: {error}</div>}

      {data && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mb-10">
          {filtered.map(p => (
            <div key={p.id} className="bg-bg-secondary border border-border rounded-lg p-4 hover:border-accent-primary/50 transition-colors">
              <div className="flex items-start justify-between gap-2 mb-2">
                <div className="min-w-0">
                  <a href={p.url} target="_blank" rel="noopener noreferrer" className="font-semibold text-text-primary hover:text-accent-primary inline-flex items-center gap-1">
                    {p.name} <ExternalLink className="w-3 h-3 text-text-muted" />
                  </a>
                  <div className="text-xs text-text-muted mt-0.5">{p.vendor} &middot; {CATEGORY_LABEL[p.category] || p.category}</div>
                </div>
                <StatusBadge status={p.status} />
              </div>
              <p className="text-sm text-text-secondary leading-relaxed mb-2">{p.role}</p>
              <p className="text-xs text-text-muted leading-relaxed mb-2">{p.notes}</p>
              <div className="text-xs text-text-muted italic">Default cap: ${p.defaultMonthlyCap}/mo per agent</div>
            </div>
          ))}
        </div>
      )}

      <div className="bg-bg-secondary border border-border rounded-lg p-4 text-sm text-text-secondary mb-3">
        <p>
          For agents: same data at{' '}
          <a href="https://tensorfeed.ai/api/agent-provisioning" target="_blank" rel="noopener noreferrer" className="text-accent-primary hover:underline font-mono">/api/agent-provisioning</a>
          . Filter with{' '}
          <code className="font-mono">?status=live|pending|unknown</code> or{' '}
          <code className="font-mono">?category=hosting|database|auth|...</code>
          . Free, cached 10 min.
        </p>
      </div>
      <div className="text-sm text-text-secondary">
        <p>
          Background:{' '}
          <Link href="/originals/cloudflare-stripe-agent-provisioning-protocol" className="text-accent-primary hover:underline">
            Agents Just Got the Keys to Production. The Cloudflare-Stripe Protocol Is Live.
          </Link>
        </p>
      </div>
    </div>
  );
}
