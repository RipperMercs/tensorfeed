'use client';

import { useEffect, useState, useMemo } from 'react';
import Link from 'next/link';
import { Database, ExternalLink } from 'lucide-react';

interface Dataset {
  id: string;
  name: string;
  publisher: string;
  stage: string;
  contentType: string;
  tokens: string;
  items: string | null;
  license: string;
  languages: string;
  released: string;
  url: string;
  notes: string;
}

interface Response {
  ok: boolean;
  lastUpdated: string;
  count: number;
  datasets: Dataset[];
}

const STAGE_LABEL: Record<string, string> = {
  pretraining: 'Pretraining',
  'instruction-tuning': 'SFT',
  dpo: 'DPO',
  rlhf: 'RLHF',
  'continued-pretraining': 'Continued pretrain',
  multimodal: 'Multimodal',
};

const STAGE_COLORS: Record<string, string> = {
  pretraining: 'bg-blue-500/10 text-blue-400 border-blue-500/20',
  'instruction-tuning': 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20',
  dpo: 'bg-purple-500/10 text-purple-400 border-purple-500/20',
  rlhf: 'bg-rose-500/10 text-rose-400 border-rose-500/20',
  'continued-pretraining': 'bg-cyan-500/10 text-cyan-400 border-cyan-500/20',
  multimodal: 'bg-pink-500/10 text-pink-400 border-pink-500/20',
};

export default function TrainingDatasetsPage() {
  const [data, setData] = useState<Response | null>(null);
  const [activeStage, setActiveStage] = useState<string>('all');
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetch('https://tensorfeed.ai/api/training-datasets')
      .then(res => { if (!res.ok) throw new Error(`HTTP ${res.status}`); return res.json(); })
      .then((json: Response) => setData(json))
      .catch(e => setError(e instanceof Error ? e.message : 'Failed to load'));
  }, []);

  const stages = useMemo(() => {
    if (!data) return [];
    return Array.from(new Set(data.datasets.map(d => d.stage)));
  }, [data]);

  const filtered = useMemo(() => {
    if (!data) return [];
    if (activeStage === 'all') return data.datasets;
    return data.datasets.filter(d => d.stage === activeStage);
  }, [data, activeStage]);

  return (
    <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <div className="mb-6">
        <div className="flex items-center gap-3 mb-3">
          <div className="p-2 rounded-lg bg-accent-primary/10">
            <Database className="w-7 h-7 text-accent-primary" />
          </div>
          <h1 className="text-3xl sm:text-4xl font-bold text-text-primary">Training Datasets</h1>
        </div>
        <p className="text-text-secondary text-lg max-w-3xl">
          AI pretraining corpora, instruction-tuning datasets, DPO preference data, and multimodal data the open-source community uses to train and fine-tune models. Each entry: size, license, languages, content type. {data?.lastUpdated && `Updated ${data.lastUpdated}.`}
        </p>
      </div>

      <div className="flex gap-2 mb-6 flex-wrap">
        <button
          onClick={() => setActiveStage('all')}
          className={`px-3.5 py-1.5 rounded-full text-sm font-medium transition-colors border ${
            activeStage === 'all' ? 'bg-accent-primary text-white border-accent-primary' : 'bg-bg-secondary text-text-secondary border-border hover:border-text-muted'
          }`}
        >
          All
        </button>
        {stages.map(s => (
          <button key={s} onClick={() => setActiveStage(s)}
            className={`px-3.5 py-1.5 rounded-full text-sm font-medium transition-colors border ${
              activeStage === s ? 'bg-accent-primary text-white border-accent-primary' : 'bg-bg-secondary text-text-secondary border-border hover:border-text-muted'
            }`}
          >
            {STAGE_LABEL[s] || s}
          </button>
        ))}
      </div>

      {error && (
        <div className="bg-rose-500/10 border border-rose-500/20 rounded-lg p-4 text-rose-400 text-sm mb-6">Error: {error}</div>
      )}

      {data && (
        <div className="space-y-3 mb-10">
          {filtered.map(d => (
            <div key={d.id} className="bg-bg-secondary border border-border rounded-lg p-4 hover:border-accent-primary/50 transition-colors">
              <div className="flex items-start justify-between gap-3 flex-wrap mb-2">
                <div className="min-w-0">
                  <a href={d.url} target="_blank" rel="noopener noreferrer" className="font-semibold text-text-primary hover:text-accent-primary inline-flex items-center gap-1">
                    {d.name} <ExternalLink className="w-3 h-3 text-text-muted" />
                  </a>
                  <div className="text-xs text-text-muted mt-0.5">
                    {d.publisher} · {d.contentType} · {d.languages} · Released {d.released}
                  </div>
                </div>
                <div className="text-right">
                  <div className="font-mono text-text-primary font-semibold">{d.tokens || d.items || '—'}</div>
                  {d.tokens && d.items && <div className="text-xs text-text-muted">{d.items}</div>}
                </div>
              </div>
              <p className="text-sm text-text-secondary leading-relaxed mb-2">{d.notes}</p>
              <div className="flex items-center gap-1.5 flex-wrap text-xs">
                <span className={`px-2 py-0.5 rounded-full border font-medium ${STAGE_COLORS[d.stage]}`}>{STAGE_LABEL[d.stage]}</span>
                <span className="bg-bg-tertiary text-text-secondary border border-border px-2 py-0.5 rounded">{d.license}</span>
              </div>
            </div>
          ))}
        </div>
      )}

      <div className="bg-bg-secondary border border-border rounded-lg p-4 text-sm text-text-secondary">
        <p>For agents: same data at{' '}<Link href="/api-reference/training-datasets" className="text-accent-primary hover:underline font-mono">/api/training-datasets</Link>. Filter with <code className="font-mono">?stage=pretraining|instruction-tuning|dpo|rlhf|multimodal</code>. Free, no auth, cached 10 min.</p>
      </div>
    </div>
  );
}
