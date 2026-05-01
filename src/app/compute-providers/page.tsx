'use client';

import { useEffect, useState, useMemo } from 'react';
import Link from 'next/link';
import { Server, ExternalLink, Check } from 'lucide-react';

interface Provider {
  id: string;
  name: string;
  vendor: string;
  type: string;
  gpus: string[];
  pricingModel: string;
  startingPrice: string;
  onDemand: boolean;
  spotPricing: boolean;
  regions: string;
  aiServices: string[];
  bestFor: string;
  url: string;
  notes: string;
}

interface Response {
  ok: boolean;
  lastUpdated: string;
  count: number;
  providers: Provider[];
}

const TYPE_LABEL: Record<string, string> = {
  'gpu-cloud': 'GPU cloud',
  hyperscaler: 'Hyperscaler',
  'ai-serverless': 'AI serverless',
  marketplace: 'Marketplace',
  specialized: 'Specialized silicon',
};

const TYPE_COLORS: Record<string, string> = {
  'gpu-cloud': 'bg-blue-500/10 text-blue-400 border-blue-500/20',
  hyperscaler: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20',
  'ai-serverless': 'bg-purple-500/10 text-purple-400 border-purple-500/20',
  marketplace: 'bg-amber-500/10 text-amber-400 border-amber-500/20',
  specialized: 'bg-rose-500/10 text-rose-400 border-rose-500/20',
};

export default function ComputeProvidersPage() {
  const [data, setData] = useState<Response | null>(null);
  const [activeType, setActiveType] = useState<string>('all');
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetch('https://tensorfeed.ai/api/compute-providers')
      .then(r => { if (!r.ok) throw new Error(`HTTP ${r.status}`); return r.json(); })
      .then((j: Response) => setData(j))
      .catch(e => setError(e instanceof Error ? e.message : 'Failed to load'));
  }, []);

  const types = useMemo(() => {
    if (!data) return [];
    return Array.from(new Set(data.providers.map(p => p.type)));
  }, [data]);

  const filtered = useMemo(() => {
    if (!data) return [];
    if (activeType === 'all') return data.providers;
    return data.providers.filter(p => p.type === activeType);
  }, [data, activeType]);

  return (
    <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <div className="mb-6">
        <div className="flex items-center gap-3 mb-3">
          <div className="p-2 rounded-lg bg-accent-primary/10"><Server className="w-7 h-7 text-accent-primary" /></div>
          <h1 className="text-3xl sm:text-4xl font-bold text-text-primary">AI Compute Providers</h1>
        </div>
        <p className="text-text-secondary text-lg max-w-3xl">
          Full-service AI compute platforms: GPU clouds (Lambda, CoreWeave, Crusoe, Nebius), hyperscalers (AWS, Azure, GCP, Oracle), AI-native serverless (Modal, Replicate, Beam), marketplaces (Vast.ai, RunPod), and specialized silicon (Cerebras, SambaNova). Companion to <Link href="/gpu-pricing" className="text-accent-primary hover:underline">/gpu-pricing</Link> (live cheapest hourly rates) and <Link href="/inference-providers" className="text-accent-primary hover:underline">/inference-providers</Link> (per-token hosted-model pricing). {data?.lastUpdated && `Updated ${data.lastUpdated}.`}
        </p>
      </div>

      <div className="flex gap-2 mb-6 flex-wrap">
        <button onClick={() => setActiveType('all')} className={`px-3 py-1 rounded-full text-xs font-medium transition-colors border ${activeType === 'all' ? 'bg-accent-primary text-white border-accent-primary' : 'bg-bg-secondary text-text-secondary border-border hover:border-text-muted'}`}>All</button>
        {types.map(t => (
          <button key={t} onClick={() => setActiveType(t)} className={`px-3 py-1 rounded-full text-xs font-medium transition-colors border ${activeType === t ? 'bg-accent-primary text-white border-accent-primary' : 'bg-bg-secondary text-text-secondary border-border hover:border-text-muted'}`}>{TYPE_LABEL[t] || t}</button>
        ))}
      </div>

      {error && <div className="bg-rose-500/10 border border-rose-500/20 rounded-lg p-4 text-rose-400 text-sm mb-6">Error: {error}</div>}

      {data && (
        <div className="space-y-3 mb-10">
          {filtered.map(p => (
            <div key={p.id} className="bg-bg-secondary border border-border rounded-lg p-4 hover:border-accent-primary/50 transition-colors">
              <div className="flex items-start justify-between gap-3 flex-wrap mb-2">
                <div className="min-w-0">
                  <a href={p.url} target="_blank" rel="noopener noreferrer" className="font-semibold text-text-primary text-lg hover:text-accent-primary inline-flex items-center gap-1">
                    {p.name} <ExternalLink className="w-3 h-3 text-text-muted" />
                  </a>
                  <div className="text-xs text-text-muted mt-0.5"><span className={`inline-block text-xs px-2 py-0.5 rounded-full border font-medium mr-1 ${TYPE_COLORS[p.type]}`}>{TYPE_LABEL[p.type]}</span>{p.regions}</div>
                </div>
                <div className="text-right text-sm">
                  <div className="text-text-primary font-mono">{p.startingPrice}</div>
                  <div className="text-xs text-text-muted">starting</div>
                </div>
              </div>
              <p className="text-sm text-text-secondary leading-relaxed mb-2">{p.notes}</p>
              <p className="text-xs text-text-muted italic mb-2">{p.bestFor}</p>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs mb-2">
                <div>
                  <div className="text-text-muted uppercase tracking-wide mb-0.5">Pricing model</div>
                  <div className="text-text-secondary">{p.pricingModel}</div>
                </div>
                <div>
                  <div className="text-text-muted uppercase tracking-wide mb-0.5">GPUs</div>
                  <div className="text-text-secondary">{p.gpus.join(', ')}</div>
                </div>
              </div>
              <div className="flex items-center gap-1 flex-wrap">
                {p.onDemand && <span className="text-xs px-2 py-0.5 rounded border bg-emerald-500/10 text-emerald-400 border-emerald-500/20 inline-flex items-center gap-1"><Check className="w-3 h-3" />On-demand</span>}
                {p.spotPricing && <span className="text-xs px-2 py-0.5 rounded border bg-emerald-500/10 text-emerald-400 border-emerald-500/20 inline-flex items-center gap-1"><Check className="w-3 h-3" />Spot</span>}
                {p.aiServices.slice(0, 4).map(s => (
                  <span key={s} className="text-xs bg-bg-tertiary text-text-muted border border-border px-2 py-0.5 rounded">{s}</span>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}

      <div className="bg-bg-secondary border border-border rounded-lg p-4 text-sm text-text-secondary">
        <p>For agents: same data at <Link href="/api-reference/compute-providers" className="text-accent-primary hover:underline font-mono">/api/compute-providers</Link>. Filter with <code className="font-mono">?type=gpu-cloud|hyperscaler|ai-serverless|marketplace|specialized</code>. Free, cached 10 min.</p>
      </div>
    </div>
  );
}
