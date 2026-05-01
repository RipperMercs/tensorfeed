'use client';

import { useEffect, useState, useMemo } from 'react';
import Link from 'next/link';
import { Shield, ExternalLink, FileText } from 'lucide-react';

interface DocLink {
  type: string;
  title: string;
  publisher: string;
  published: string;
  url: string;
  summary: string;
}

interface Card {
  id: string;
  model: string;
  lab: string;
  released: string;
  documents: DocLink[];
  url: string;
}

interface SafetyDoc {
  id: string;
  title: string;
  publisher: string;
  published: string;
  url: string;
  summary: string;
  type: string;
}

interface Response {
  ok: boolean;
  lastUpdated: string;
  modelCount: number;
  modelCards: Card[];
  crossModelSafetyDocs: SafetyDoc[];
}

const TYPE_LABEL: Record<string, string> = {
  'system-card': 'System card',
  'model-card': 'Model card',
  'safety-eval': 'Safety eval',
  'red-team-report': 'Red team',
  'incident-report': 'Incident',
  'preparedness-framework': 'Preparedness',
  'autonomy-eval': 'Autonomy eval',
  framework: 'Framework',
  'incident-database': 'Incident DB',
  standard: 'Standard',
  'evaluation-suite': 'Eval suite',
};

const TYPE_COLORS: Record<string, string> = {
  'system-card': 'bg-blue-500/10 text-blue-400 border-blue-500/20',
  'model-card': 'bg-cyan-500/10 text-cyan-400 border-cyan-500/20',
  'safety-eval': 'bg-purple-500/10 text-purple-400 border-purple-500/20',
  'red-team-report': 'bg-rose-500/10 text-rose-400 border-rose-500/20',
  'preparedness-framework': 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20',
  'autonomy-eval': 'bg-amber-500/10 text-amber-400 border-amber-500/20',
  framework: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20',
  'incident-database': 'bg-rose-500/10 text-rose-400 border-rose-500/20',
  standard: 'bg-blue-500/10 text-blue-400 border-blue-500/20',
  'evaluation-suite': 'bg-purple-500/10 text-purple-400 border-purple-500/20',
};

export default function ModelCardsPage() {
  const [data, setData] = useState<Response | null>(null);
  const [activeLab, setActiveLab] = useState<string>('all');
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetch('https://tensorfeed.ai/api/model-cards')
      .then(res => { if (!res.ok) throw new Error(`HTTP ${res.status}`); return res.json(); })
      .then((json: Response) => setData(json))
      .catch(e => setError(e instanceof Error ? e.message : 'Failed to load'));
  }, []);

  const labs = useMemo(() => {
    if (!data) return [];
    return Array.from(new Set(data.modelCards.map(c => c.lab)));
  }, [data]);

  const filteredCards = useMemo(() => {
    if (!data) return [];
    if (activeLab === 'all') return data.modelCards;
    return data.modelCards.filter(c => c.lab === activeLab);
  }, [data, activeLab]);

  return (
    <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <div className="mb-6">
        <div className="flex items-center gap-3 mb-3">
          <div className="p-2 rounded-lg bg-accent-primary/10">
            <Shield className="w-7 h-7 text-accent-primary" />
          </div>
          <h1 className="text-3xl sm:text-4xl font-bold text-text-primary">Model Cards & Safety</h1>
        </div>
        <p className="text-text-secondary text-lg max-w-3xl">
          Published system cards, model cards, safety evaluations, and independent red-team reports for frontier AI models. Plus the cross-model frameworks (Anthropic RSP, OpenAI Preparedness, DeepMind Frontier Safety) and incident databases. The "what does the lab and third-party evaluators publicly say about this model" surface. {data?.lastUpdated && `Updated ${data.lastUpdated}.`}
        </p>
      </div>

      {error && <div className="bg-rose-500/10 border border-rose-500/20 rounded-lg p-4 text-rose-400 text-sm mb-6">Error: {error}</div>}

      {/* Lab filter */}
      <div className="flex gap-2 mb-6 flex-wrap">
        <button onClick={() => setActiveLab('all')}
          className={`px-3.5 py-1.5 rounded-full text-sm font-medium transition-colors border ${
            activeLab === 'all' ? 'bg-accent-primary text-white border-accent-primary' : 'bg-bg-secondary text-text-secondary border-border hover:border-text-muted'
          }`}
        >All labs</button>
        {labs.map(l => (
          <button key={l} onClick={() => setActiveLab(l)}
            className={`px-3.5 py-1.5 rounded-full text-sm font-medium transition-colors border ${
              activeLab === l ? 'bg-accent-primary text-white border-accent-primary' : 'bg-bg-secondary text-text-secondary border-border hover:border-text-muted'
            }`}
          >{l}</button>
        ))}
      </div>

      {/* Model-specific cards */}
      <h2 className="text-xl font-semibold text-text-primary mb-3">Per-Model Documents</h2>
      {data && (
        <div className="space-y-3 mb-10">
          {filteredCards.map(c => (
            <div key={c.id} className="bg-bg-secondary border border-border rounded-lg p-4">
              <div className="flex items-center justify-between gap-3 flex-wrap mb-3">
                <div>
                  <a href={c.url} target="_blank" rel="noopener noreferrer" className="font-semibold text-text-primary text-lg hover:text-accent-primary inline-flex items-center gap-1">
                    {c.model} <ExternalLink className="w-3 h-3 text-text-muted" />
                  </a>
                  <div className="text-xs text-text-muted mt-0.5">{c.lab} · Released {c.released}</div>
                </div>
              </div>
              <div className="space-y-2">
                {c.documents.map((d, i) => (
                  <a key={i} href={d.url} target="_blank" rel="noopener noreferrer" className="block bg-bg-tertiary border border-border rounded p-3 hover:border-accent-primary transition-colors">
                    <div className="flex items-start justify-between gap-2 flex-wrap">
                      <div className="min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className={`text-xs px-2 py-0.5 rounded-full border font-medium ${TYPE_COLORS[d.type] || 'bg-bg-secondary text-text-secondary border-border'}`}>
                            {TYPE_LABEL[d.type] || d.type}
                          </span>
                          <span className="font-medium text-text-primary text-sm">{d.title}</span>
                          <ExternalLink className="w-3 h-3 text-text-muted" />
                        </div>
                        <div className="text-xs text-text-muted mt-1">{d.publisher} · {d.published}</div>
                      </div>
                    </div>
                    <p className="text-xs text-text-secondary mt-2">{d.summary}</p>
                  </a>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Cross-model safety docs */}
      {data && data.crossModelSafetyDocs.length > 0 && (
        <>
          <h2 className="text-xl font-semibold text-text-primary mb-3">Cross-Model Frameworks & Incident Databases</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mb-10">
            {data.crossModelSafetyDocs.map(d => (
              <a key={d.id} href={d.url} target="_blank" rel="noopener noreferrer" className="block bg-bg-secondary border border-border rounded-lg p-4 hover:border-accent-primary transition-colors">
                <div className="flex items-start justify-between gap-2 flex-wrap mb-2">
                  <div className="min-w-0">
                    <div className="flex items-center gap-1.5 mb-1 flex-wrap">
                      <FileText className="w-4 h-4 text-accent-primary shrink-0" />
                      <span className="font-medium text-text-primary text-sm">{d.title}</span>
                      <ExternalLink className="w-3 h-3 text-text-muted shrink-0" />
                    </div>
                    <div className="text-xs text-text-muted">{d.publisher} · {d.published}</div>
                  </div>
                  <span className={`text-xs px-2 py-0.5 rounded-full border font-medium ${TYPE_COLORS[d.type] || 'bg-bg-secondary text-text-secondary border-border'}`}>
                    {TYPE_LABEL[d.type] || d.type}
                  </span>
                </div>
                <p className="text-xs text-text-secondary leading-relaxed">{d.summary}</p>
              </a>
            ))}
          </div>
        </>
      )}

      <div className="bg-bg-secondary border border-border rounded-lg p-4 text-sm text-text-secondary">
        <p>For agents: same data at <Link href="/api-reference/model-cards" className="text-accent-primary hover:underline font-mono">/api/model-cards</Link>. Filter with <code className="font-mono">?lab=Anthropic|OpenAI|Google|Meta|DeepSeek</code>. Free, cached 10 min.</p>
      </div>
    </div>
  );
}
