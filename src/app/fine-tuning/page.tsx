'use client';

import { useEffect, useState, useMemo } from 'react';
import Link from 'next/link';
import { Wrench, ExternalLink } from 'lucide-react';

interface Provider {
  id: string;
  name: string;
  vendor: string;
  type: string;
  baseModels: string[];
  methods: string[];
  trainingPricing: string;
  inferencePricing: string;
  freeTier: string | null;
  features: string[];
  url: string;
  notes: string;
}

interface Response {
  ok: boolean;
  lastUpdated: string;
  count: number;
  providers: Provider[];
}

const TYPE_COLORS: Record<string, string> = {
  'first-party': 'bg-blue-500/10 text-blue-400 border-blue-500/20',
  'hosted': 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20',
};

export default function FineTuningPage() {
  const [data, setData] = useState<Response | null>(null);
  const [activeType, setActiveType] = useState<string>('all');
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetch('https://tensorfeed.ai/api/fine-tuning')
      .then(res => { if (!res.ok) throw new Error(`HTTP ${res.status}`); return res.json(); })
      .then((json: Response) => setData(json))
      .catch(e => setError(e instanceof Error ? e.message : 'Failed to load'));
  }, []);

  const filtered = useMemo(() => {
    if (!data) return [];
    if (activeType === 'all') return data.providers;
    return data.providers.filter(p => p.type === activeType);
  }, [data, activeType]);

  return (
    <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <div className="mb-6">
        <div className="flex items-center gap-3 mb-3">
          <div className="p-2 rounded-lg bg-accent-primary/10">
            <Wrench className="w-7 h-7 text-accent-primary" />
          </div>
          <h1 className="text-3xl sm:text-4xl font-bold text-text-primary">Fine-Tuning Providers</h1>
        </div>
        <p className="text-text-secondary text-lg max-w-3xl">
          Where you can fine-tune AI models in production: first-party (OpenAI, Anthropic, Google, Mistral) and third-party hosted (Together, Fireworks, OpenPipe, Predibase, AWS Bedrock, HuggingFace, Replicate, Modal). Pricing per training token, supported methods, base models. {data?.lastUpdated && `Updated ${data.lastUpdated}.`}
        </p>
      </div>

      <div className="flex gap-2 mb-6 flex-wrap">
        {(['all', 'first-party', 'hosted'] as const).map(t => (
          <button key={t} onClick={() => setActiveType(t)}
            className={`px-3.5 py-1.5 rounded-full text-sm font-medium transition-colors border ${
              activeType === t ? 'bg-accent-primary text-white border-accent-primary' : 'bg-bg-secondary text-text-secondary border-border hover:border-text-muted'
            }`}
          >
            {t === 'all' ? 'All' : t === 'first-party' ? 'First-party' : 'Hosted (third-party)'}
          </button>
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
                  <div className="text-xs text-text-muted mt-0.5">
                    {p.vendor} · <span className={`inline-block text-xs px-1.5 py-0.5 rounded-full border font-medium ${TYPE_COLORS[p.type]}`}>{p.type}</span>
                  </div>
                </div>
              </div>
              <p className="text-sm text-text-secondary leading-relaxed mb-3">{p.notes}</p>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs mb-3">
                <div>
                  <div className="text-text-muted uppercase tracking-wide mb-0.5">Training pricing</div>
                  <div className="text-text-primary">{p.trainingPricing}</div>
                </div>
                <div>
                  <div className="text-text-muted uppercase tracking-wide mb-0.5">Inference pricing</div>
                  <div className="text-text-primary">{p.inferencePricing}</div>
                </div>
              </div>
              {p.freeTier && <p className="text-xs text-emerald-400 mb-2">Free tier: {p.freeTier}</p>}
              <div className="flex items-center gap-1 flex-wrap mb-2">
                <span className="text-xs text-text-muted">Methods:</span>
                {p.methods.map(m => (
                  <span key={m} className="text-xs bg-bg-tertiary text-text-secondary border border-border px-2 py-0.5 rounded font-mono">{m}</span>
                ))}
              </div>
              <div className="flex items-center gap-1 flex-wrap">
                <span className="text-xs text-text-muted">Base models:</span>
                {p.baseModels.map(b => (
                  <span key={b} className="text-xs bg-bg-tertiary text-text-secondary border border-border px-2 py-0.5 rounded">{b}</span>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}

      <div className="bg-bg-secondary border border-border rounded-lg p-4 text-sm text-text-secondary">
        <p>For agents: same data at <Link href="/api-reference/fine-tuning" className="text-accent-primary hover:underline font-mono">/api/fine-tuning</Link>. Filter with <code className="font-mono">?type=first-party|hosted</code> or <code className="font-mono">?method=lora|qlora|full|dpo|rlhf</code>. Free, cached 10 min.</p>
      </div>
    </div>
  );
}
