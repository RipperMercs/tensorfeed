'use client';

import { useEffect, useState, useMemo } from 'react';
import Link from 'next/link';
import { Boxes, ExternalLink } from 'lucide-react';

interface Model {
  id: string;
  name: string;
  publisher: string;
  domain: string;
  params: string;
  pricing: string;
  openWeights: boolean;
  license: string;
  released: string;
  benchmark: string | null;
  capabilities: string[];
  url: string;
  notes: string;
}

interface Response {
  ok: boolean;
  lastUpdated: string;
  count: number;
  models: Model[];
}

const DOMAIN_LABEL: Record<string, string> = {
  code: 'Code',
  medical: 'Medical',
  legal: 'Legal',
  finance: 'Finance',
  music: 'Music / Audio',
  '3d': '3D',
  retrieval: 'Retrieval',
  science: 'Science',
};

const DOMAIN_COLORS: Record<string, string> = {
  code: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20',
  medical: 'bg-rose-500/10 text-rose-400 border-rose-500/20',
  legal: 'bg-amber-500/10 text-amber-400 border-amber-500/20',
  finance: 'bg-blue-500/10 text-blue-400 border-blue-500/20',
  music: 'bg-pink-500/10 text-pink-400 border-pink-500/20',
  '3d': 'bg-purple-500/10 text-purple-400 border-purple-500/20',
  retrieval: 'bg-cyan-500/10 text-cyan-400 border-cyan-500/20',
  science: 'bg-teal-500/10 text-teal-400 border-teal-500/20',
};

export default function SpecializedModelsPage() {
  const [data, setData] = useState<Response | null>(null);
  const [activeDomain, setActiveDomain] = useState<string>('all');
  const [openOnly, setOpenOnly] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetch('https://tensorfeed.ai/api/specialized-models')
      .then(res => { if (!res.ok) throw new Error(`HTTP ${res.status}`); return res.json(); })
      .then((json: Response) => setData(json))
      .catch(e => setError(e instanceof Error ? e.message : 'Failed to load'));
  }, []);

  const domains = useMemo(() => {
    if (!data) return [];
    return Array.from(new Set(data.models.map(m => m.domain)));
  }, [data]);

  const filtered = useMemo(() => {
    if (!data) return [];
    let rows = data.models;
    if (activeDomain !== 'all') rows = rows.filter(m => m.domain === activeDomain);
    if (openOnly) rows = rows.filter(m => m.openWeights);
    return rows;
  }, [data, activeDomain, openOnly]);

  return (
    <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <div className="mb-6">
        <div className="flex items-center gap-3 mb-3">
          <div className="p-2 rounded-lg bg-accent-primary/10">
            <Boxes className="w-7 h-7 text-accent-primary" />
          </div>
          <h1 className="text-3xl sm:text-4xl font-bold text-text-primary">Specialized Models</h1>
        </div>
        <p className="text-text-secondary text-lg max-w-3xl">
          Production AI models built for a vertical domain. Code (Codestral, DeepSeek Coder, Qwen Coder, StarCoder 2), medical (Med-Gemini, Meditron, BioMistral), legal (SaulLM), finance (FinGPT, BloombergGPT), music (Suno, Udio, MusicGen, Stable Audio), 3D (TRELLIS, Hunyuan3D), retrieval (ColPali, SPLADE). The "I need a model good at X" surface beyond the general-chat catalog. {data?.lastUpdated && `Updated ${data.lastUpdated}.`}
        </p>
      </div>

      <div className="flex gap-2 mb-3 flex-wrap items-center">
        <span className="text-xs text-text-muted uppercase tracking-wide">Domain:</span>
        <button onClick={() => setActiveDomain('all')}
          className={`px-3 py-1 rounded-full text-xs font-medium transition-colors border ${
            activeDomain === 'all' ? 'bg-accent-primary text-white border-accent-primary' : 'bg-bg-secondary text-text-secondary border-border hover:border-text-muted'
          }`}
        >All</button>
        {domains.map(d => (
          <button key={d} onClick={() => setActiveDomain(d)}
            className={`px-3 py-1 rounded-full text-xs font-medium transition-colors border ${
              activeDomain === d ? 'bg-accent-primary text-white border-accent-primary' : 'bg-bg-secondary text-text-secondary border-border hover:border-text-muted'
            }`}
          >{DOMAIN_LABEL[d] || d}</button>
        ))}
      </div>
      <div className="flex items-center gap-2 mb-6">
        <label className="text-xs text-text-secondary flex items-center gap-1.5 cursor-pointer">
          <input type="checkbox" checked={openOnly} onChange={(e) => setOpenOnly(e.target.checked)} className="rounded" />
          Open weights only
        </label>
      </div>

      {error && <div className="bg-rose-500/10 border border-rose-500/20 rounded-lg p-4 text-rose-400 text-sm mb-6">Error: {error}</div>}

      {data && (
        <div className="space-y-3 mb-10">
          {filtered.map(m => (
            <div key={m.id} className="bg-bg-secondary border border-border rounded-lg p-4 hover:border-accent-primary/50 transition-colors">
              <div className="flex items-start justify-between gap-3 flex-wrap mb-2">
                <div className="min-w-0">
                  <a href={m.url} target="_blank" rel="noopener noreferrer" className="font-semibold text-text-primary text-lg hover:text-accent-primary inline-flex items-center gap-1">
                    {m.name} <ExternalLink className="w-3 h-3 text-text-muted" />
                  </a>
                  <div className="text-xs text-text-muted mt-0.5">
                    {m.publisher} · {m.params} · {m.license} · Released {m.released}
                  </div>
                </div>
                <span className={`text-xs px-2 py-0.5 rounded-full border font-medium ${DOMAIN_COLORS[m.domain]}`}>{DOMAIN_LABEL[m.domain]}</span>
              </div>
              <p className="text-sm text-text-secondary leading-relaxed mb-2">{m.notes}</p>
              {m.benchmark && <p className="text-xs text-text-muted mb-2"><span className="text-text-secondary">Benchmark:</span> {m.benchmark}</p>}
              <p className="text-xs text-text-muted italic mb-2">{m.pricing}</p>
              <div className="flex items-center gap-1 flex-wrap">
                {m.openWeights && <span className="text-xs px-2 py-0.5 rounded border bg-emerald-500/10 text-emerald-400 border-emerald-500/20">open weights</span>}
                {m.capabilities.slice(0, 5).map(c => (
                  <span key={c} className="text-xs bg-bg-tertiary text-text-secondary border border-border px-2 py-0.5 rounded">{c}</span>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}

      <div className="bg-bg-secondary border border-border rounded-lg p-4 text-sm text-text-secondary">
        <p>For agents: same data at <Link href="/api-reference/specialized-models" className="text-accent-primary hover:underline font-mono">/api/specialized-models</Link>. Filter with <code className="font-mono">?domain=code|medical|legal|finance|music|3d|retrieval</code> or <code className="font-mono">?open_weights=true</code>. Free, cached 10 min.</p>
      </div>
    </div>
  );
}
