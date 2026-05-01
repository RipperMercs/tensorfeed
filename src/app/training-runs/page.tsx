'use client';

import { useEffect, useState, useMemo } from 'react';
import Link from 'next/link';
import { DollarSign, ExternalLink } from 'lucide-react';

interface Run {
  id: string;
  model: string;
  publisher: string;
  released: string;
  activeParamsB: number | null;
  totalParamsB: number;
  trainingTokens: string;
  hardware: string;
  hardwareCount: number | null;
  computeHours: string | null;
  estimatedCostMillionUSD: number | null;
  costSource: 'disclosed' | 'estimated';
  duration: string;
  openWeights: boolean;
  url: string;
  notes: string;
}

interface Response {
  ok: boolean;
  lastUpdated: string;
  count: number;
  runs: Run[];
}

export default function TrainingRunsPage() {
  const [data, setData] = useState<Response | null>(null);
  const [openOnly, setOpenOnly] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetch('https://tensorfeed.ai/api/training-runs')
      .then(res => { if (!res.ok) throw new Error(`HTTP ${res.status}`); return res.json(); })
      .then((json: Response) => setData(json))
      .catch(e => setError(e instanceof Error ? e.message : 'Failed to load'));
  }, []);

  const filtered = useMemo(() => {
    if (!data) return [];
    let rows = data.runs;
    if (openOnly) rows = rows.filter(r => r.openWeights);
    return [...rows].sort((a, b) => (b.estimatedCostMillionUSD ?? -1) - (a.estimatedCostMillionUSD ?? -1));
  }, [data, openOnly]);

  return (
    <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <div className="mb-6">
        <div className="flex items-center gap-3 mb-3">
          <div className="p-2 rounded-lg bg-accent-primary/10">
            <DollarSign className="w-7 h-7 text-accent-primary" />
          </div>
          <h1 className="text-3xl sm:text-4xl font-bold text-text-primary">Training Run Economics</h1>
        </div>
        <p className="text-text-secondary text-lg max-w-3xl">
          What AI training runs actually cost. Disclosed and estimated parameter count, training tokens, GPU hours, hardware, and dollar cost for every notable frontier and open-weights run. Disclosed numbers come from papers and model cards; estimated numbers are reverse-engineered from public hints. {data?.lastUpdated && `Updated ${data.lastUpdated}.`}
        </p>
      </div>

      <div className="flex items-center gap-2 mb-6">
        <label className="text-sm text-text-secondary flex items-center gap-1.5 cursor-pointer">
          <input type="checkbox" checked={openOnly} onChange={(e) => setOpenOnly(e.target.checked)} className="rounded" />
          Open-weights only
        </label>
      </div>

      {error && <div className="bg-rose-500/10 border border-rose-500/20 rounded-lg p-4 text-rose-400 text-sm mb-6">Error: {error}</div>}

      {data && (
        <div className="space-y-3 mb-10">
          {filtered.map(r => (
            <div key={r.id} className="bg-bg-secondary border border-border rounded-lg p-4 hover:border-accent-primary/50 transition-colors">
              <div className="flex items-start justify-between gap-3 flex-wrap mb-2">
                <div className="min-w-0">
                  <a href={r.url} target="_blank" rel="noopener noreferrer" className="font-semibold text-text-primary hover:text-accent-primary inline-flex items-center gap-1">
                    {r.model} <ExternalLink className="w-3 h-3 text-text-muted" />
                  </a>
                  <div className="text-xs text-text-muted mt-0.5">
                    {r.publisher} · Released {r.released} · {r.openWeights ? 'open weights' : 'closed'}
                  </div>
                </div>
                <div className="text-right">
                  <div className="text-2xl font-bold font-mono text-text-primary">
                    {r.estimatedCostMillionUSD !== null ? `$${r.estimatedCostMillionUSD}M` : '—'}
                  </div>
                  <div className="text-xs text-text-muted">{r.costSource}</div>
                </div>
              </div>
              <p className="text-sm text-text-secondary leading-relaxed mb-2">{r.notes}</p>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs">
                <div>
                  <div className="text-text-muted uppercase tracking-wide">Params</div>
                  <div className="font-mono text-text-primary">
                    {r.activeParamsB ? `${r.activeParamsB}B / ${r.totalParamsB}B` : (r.totalParamsB ? `${r.totalParamsB}B` : '—')}
                  </div>
                </div>
                <div>
                  <div className="text-text-muted uppercase tracking-wide">Training tokens</div>
                  <div className="font-mono text-text-secondary">{r.trainingTokens}</div>
                </div>
                <div>
                  <div className="text-text-muted uppercase tracking-wide">Hardware</div>
                  <div className="text-text-secondary">{r.hardware}{r.hardwareCount && ` × ${r.hardwareCount.toLocaleString()}`}</div>
                </div>
                <div>
                  <div className="text-text-muted uppercase tracking-wide">Compute</div>
                  <div className="font-mono text-text-secondary">{r.computeHours || '—'}</div>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      <div className="bg-bg-secondary border border-border rounded-lg p-4 text-sm text-text-secondary">
        <p>For agents: same data at{' '}<Link href="/api-reference/training-runs" className="text-accent-primary hover:underline font-mono">/api/training-runs</Link>. Filter with <code className="font-mono">?publisher=...</code> or <code className="font-mono">?open_weights=true</code>. Free, cached 10 min.</p>
      </div>
    </div>
  );
}
