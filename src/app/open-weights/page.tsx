'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { Cpu, ExternalLink } from 'lucide-react';

interface Quant {
  id: string;
  name: string;
  vramGB: number;
  quality: number;
  recommendedGpu: string;
  notes: string;
}

interface OpenWeightModel {
  id: string;
  name: string;
  family: string;
  activeParamsB: number | null;
  totalParamsB: number;
  contextWindow: number;
  released: string;
  license: string;
  hfUrl: string;
  url: string;
  capabilities: string[];
  notes: string;
  quantizations: Quant[];
}

interface Response {
  ok: boolean;
  lastUpdated: string;
  count: number;
  models: OpenWeightModel[];
}

const FAMILY_COLORS: Record<string, string> = {
  Meta: 'bg-blue-600/10 text-blue-300 border-blue-600/20',
  DeepSeek: 'bg-teal-500/10 text-teal-400 border-teal-500/20',
  Mistral: 'bg-orange-500/10 text-orange-400 border-orange-500/20',
  Alibaba: 'bg-rose-500/10 text-rose-400 border-rose-500/20',
  Google: 'bg-blue-500/10 text-blue-400 border-blue-500/20',
  Microsoft: 'bg-purple-500/10 text-purple-400 border-purple-500/20',
};

function formatContext(n: number): string {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(0)}M`;
  if (n >= 1000) return `${(n / 1000).toFixed(0)}k`;
  return String(n);
}

export default function OpenWeightsPage() {
  const [data, setData] = useState<Response | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetch('https://tensorfeed.ai/api/open-weights')
      .then(res => {
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        return res.json();
      })
      .then((json: Response) => setData(json))
      .catch(e => setError(e instanceof Error ? e.message : 'Failed to load'));
  }, []);

  return (
    <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <div className="mb-6">
        <div className="flex items-center gap-3 mb-3">
          <div className="p-2 rounded-lg bg-accent-primary/10">
            <Cpu className="w-7 h-7 text-accent-primary" />
          </div>
          <h1 className="text-3xl sm:text-4xl font-bold text-text-primary">Open-Weights Deployment</h1>
        </div>
        <p className="text-text-secondary text-lg max-w-3xl">
          What you actually need to self-host the major open-weights models. VRAM per quantization (FP16, FP8, AWQ INT4, GGUF Q4_K_M), recommended GPU class, license, capabilities. The &ldquo;I want to run this myself&rdquo; companion to <Link href="/inference-providers" className="text-accent-primary hover:underline">/inference-providers</Link> (hosted pricing). {data?.lastUpdated && `Updated ${data.lastUpdated}.`}
        </p>
      </div>

      {error && (
        <div className="bg-rose-500/10 border border-rose-500/20 rounded-lg p-4 text-rose-400 text-sm mb-6">
          Error loading data: {error}
        </div>
      )}

      {data?.models.map(m => (
        <section key={m.id} className="mb-6 bg-bg-secondary border border-border rounded-lg p-4">
          <div className="flex items-start justify-between gap-3 flex-wrap mb-3">
            <div className="min-w-0">
              <a href={m.hfUrl} target="_blank" rel="noopener noreferrer" className="text-xl font-semibold text-text-primary hover:text-accent-primary inline-flex items-center gap-1">
                {m.name} <ExternalLink className="w-3 h-3 text-text-muted" />
              </a>
              <div className="flex items-center gap-2 mt-1 flex-wrap text-xs">
                <span className={`px-2 py-0.5 rounded-full border font-medium ${FAMILY_COLORS[m.family] || 'bg-bg-tertiary text-text-secondary border-border'}`}>
                  {m.family}
                </span>
                <span className="text-text-muted">
                  {m.activeParamsB ? `${m.activeParamsB}B active / ${m.totalParamsB}B total` : `${m.totalParamsB}B params`}
                </span>
                <span className="text-text-muted">{formatContext(m.contextWindow)} context</span>
                <span className="text-text-muted">{m.license}</span>
                <span className="text-text-muted">Released {m.released}</span>
              </div>
            </div>
            <div className="flex items-center gap-1 flex-wrap">
              {m.capabilities.map(c => (
                <span key={c} className="text-xs bg-bg-tertiary text-text-secondary border border-border px-2 py-0.5 rounded">
                  {c}
                </span>
              ))}
            </div>
          </div>
          <p className="text-sm text-text-secondary leading-relaxed mb-4">{m.notes}</p>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead>
                <tr className="border-b border-border text-xs uppercase tracking-wide text-text-muted">
                  <th className="py-2 px-2">Quantization</th>
                  <th className="py-2 px-2 text-right">VRAM</th>
                  <th className="py-2 px-2 text-right">Quality</th>
                  <th className="py-2 px-2">Recommended GPU</th>
                  <th className="py-2 px-2">Notes</th>
                </tr>
              </thead>
              <tbody>
                {m.quantizations.map(q => (
                  <tr key={q.id} className="border-b border-border/50">
                    <td className="py-2 px-2 font-mono text-text-primary">{q.name}</td>
                    <td className="py-2 px-2 text-right font-mono text-text-secondary">{q.vramGB} GB</td>
                    <td className="py-2 px-2 text-right font-mono">
                      <span className={q.quality >= 99 ? 'text-emerald-400' : q.quality >= 95 ? 'text-text-primary' : 'text-amber-400'}>
                        {q.quality}%
                      </span>
                    </td>
                    <td className="py-2 px-2 text-text-secondary">{q.recommendedGpu}</td>
                    <td className="py-2 px-2 text-text-muted text-xs">{q.notes}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      ))}

      <div className="bg-bg-secondary border border-border rounded-lg p-4 text-sm text-text-secondary">
        <p>
          For agents: same data at{' '}
          <Link href="/api-reference/open-weights" className="text-accent-primary hover:underline font-mono">/api/open-weights</Link>
          . Filter with <code className="font-mono">?family=Meta|DeepSeek|Alibaba|Mistral|Google|Microsoft</code>. Free, no auth, cached 10 min.
        </p>
      </div>
    </div>
  );
}
