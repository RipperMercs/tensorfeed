'use client';

import { useEffect, useState, useMemo } from 'react';
import Link from 'next/link';
import { Wrench, ExternalLink, Star } from 'lucide-react';

interface Tool {
  id: string;
  name: string;
  vendor: string;
  category: string;
  language: string;
  license: string;
  starsK: number;
  version: string;
  released: string;
  features: string[];
  url: string;
  github: string;
  notes: string;
}

interface Response {
  ok: boolean;
  lastUpdated: string;
  count: number;
  tools: Tool[];
}

const CATEGORY_LABEL: Record<string, string> = {
  runtime: 'Runtime',
  'inference-server': 'Inference server',
  'fine-tuning': 'Fine-tuning',
  ui: 'UI',
  eval: 'Evaluation',
  training: 'Training',
  observability: 'Observability',
  edge: 'Edge / on-device',
};

const CATEGORY_COLORS: Record<string, string> = {
  runtime: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20',
  'inference-server': 'bg-blue-500/10 text-blue-400 border-blue-500/20',
  'fine-tuning': 'bg-purple-500/10 text-purple-400 border-purple-500/20',
  ui: 'bg-pink-500/10 text-pink-400 border-pink-500/20',
  eval: 'bg-amber-500/10 text-amber-400 border-amber-500/20',
  training: 'bg-cyan-500/10 text-cyan-400 border-cyan-500/20',
  observability: 'bg-rose-500/10 text-rose-400 border-rose-500/20',
  edge: 'bg-teal-500/10 text-teal-400 border-teal-500/20',
};

export default function OSSToolsPage() {
  const [data, setData] = useState<Response | null>(null);
  const [activeCategory, setActiveCategory] = useState<string>('all');
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetch('https://tensorfeed.ai/api/oss-tools')
      .then(r => { if (!r.ok) throw new Error(`HTTP ${r.status}`); return r.json(); })
      .then((j: Response) => setData(j))
      .catch(e => setError(e instanceof Error ? e.message : 'Failed to load'));
  }, []);

  const categories = useMemo(() => {
    if (!data) return [];
    return Array.from(new Set(data.tools.map(t => t.category)));
  }, [data]);

  const filtered = useMemo(() => {
    if (!data) return [];
    let rows = data.tools;
    if (activeCategory !== 'all') rows = rows.filter(t => t.category === activeCategory);
    return [...rows].sort((a, b) => b.starsK - a.starsK);
  }, [data, activeCategory]);

  return (
    <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <div className="mb-6">
        <div className="flex items-center gap-3 mb-3">
          <div className="p-2 rounded-lg bg-accent-primary/10"><Wrench className="w-7 h-7 text-accent-primary" /></div>
          <h1 className="text-3xl sm:text-4xl font-bold text-text-primary">Open-Source AI Tools</h1>
        </div>
        <p className="text-text-secondary text-lg max-w-3xl">
          Production open-source AI tools agents and developers actually install: model runtimes (Ollama, LM Studio, llama.cpp, MLX), inference servers (vLLM, SGLang, TGI, TEI), fine-tuning toolkits (Unsloth, Axolotl, TorchTune), UIs (Open WebUI, LibreChat, ComfyUI), evals (lm-eval-harness, Inspect AI). {data?.lastUpdated && `Updated ${data.lastUpdated}.`}
        </p>
      </div>

      <div className="flex gap-2 mb-6 flex-wrap">
        <button onClick={() => setActiveCategory('all')} className={`px-3 py-1 rounded-full text-xs font-medium transition-colors border ${activeCategory === 'all' ? 'bg-accent-primary text-white border-accent-primary' : 'bg-bg-secondary text-text-secondary border-border hover:border-text-muted'}`}>All</button>
        {categories.map(c => (
          <button key={c} onClick={() => setActiveCategory(c)} className={`px-3 py-1 rounded-full text-xs font-medium transition-colors border ${activeCategory === c ? 'bg-accent-primary text-white border-accent-primary' : 'bg-bg-secondary text-text-secondary border-border hover:border-text-muted'}`}>{CATEGORY_LABEL[c] || c}</button>
        ))}
      </div>

      {error && <div className="bg-rose-500/10 border border-rose-500/20 rounded-lg p-4 text-rose-400 text-sm mb-6">Error: {error}</div>}

      {data && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mb-10">
          {filtered.map(t => (
            <div key={t.id} className="bg-bg-secondary border border-border rounded-lg p-4 hover:border-accent-primary/50 transition-colors">
              <div className="flex items-start justify-between gap-2 mb-2">
                <div className="min-w-0">
                  <a href={t.github} target="_blank" rel="noopener noreferrer" className="font-semibold text-text-primary hover:text-accent-primary inline-flex items-center gap-1">
                    {t.name} <ExternalLink className="w-3 h-3 text-text-muted" />
                  </a>
                  <div className="text-xs text-text-muted mt-0.5">{t.vendor} · v{t.version} · {t.license}</div>
                </div>
                <div className="text-right text-xs text-text-secondary flex items-center gap-1">
                  <Star className="w-3 h-3 text-yellow-400" />
                  <span className="font-mono">{t.starsK}k</span>
                </div>
              </div>
              <p className="text-sm text-text-secondary leading-relaxed mb-2">{t.notes}</p>
              <div className="flex items-center gap-1 flex-wrap">
                <span className={`text-xs px-2 py-0.5 rounded-full border font-medium ${CATEGORY_COLORS[t.category]}`}>{CATEGORY_LABEL[t.category]}</span>
                <span className="text-xs bg-bg-tertiary text-text-secondary border border-border px-2 py-0.5 rounded">{t.language}</span>
                {t.features.slice(0, 3).map(f => (
                  <span key={f} className="text-xs bg-bg-tertiary text-text-muted border border-border px-2 py-0.5 rounded">{f}</span>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}

      <div className="bg-bg-secondary border border-border rounded-lg p-4 text-sm text-text-secondary">
        <p>For agents: same data at <Link href="/api-reference/oss-tools" className="text-accent-primary hover:underline font-mono">/api/oss-tools</Link>. Filter with <code className="font-mono">?category=runtime|inference-server|fine-tuning|ui|eval|training|observability|edge</code>. Free, cached 10 min.</p>
      </div>
    </div>
  );
}
