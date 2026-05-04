'use client';

import { useEffect, useState, useMemo } from 'react';
import Link from 'next/link';
import { Cpu, ExternalLink, FileText, Code as CodeIcon, Play } from 'lucide-react';

interface Entry {
  id: string;
  name: string;
  org: string;
  category: string;
  parameters: string | null;
  released: string;
  license: string;
  paperUrl: string | null;
  codeUrl: string | null;
  demoUrl: string | null;
  notes: string;
}

interface ApiResponse {
  ok: boolean;
  lastUpdated: string;
  count: number;
  entries: Entry[];
}

const CATEGORY_LABEL: Record<string, string> = {
  foundation_model: 'Foundation model',
  humanoid: 'Humanoid',
  dataset: 'Dataset',
  simulator: 'Simulator',
};

const CATEGORY_COLORS: Record<string, string> = {
  foundation_model: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20',
  humanoid: 'bg-blue-500/10 text-blue-400 border-blue-500/20',
  dataset: 'bg-purple-500/10 text-purple-400 border-purple-500/20',
  simulator: 'bg-amber-500/10 text-amber-400 border-amber-500/20',
};

const CATEGORY_ORDER = ['foundation_model', 'humanoid', 'dataset', 'simulator'];

export default function EmbodiedAIPage() {
  const [data, setData] = useState<ApiResponse | null>(null);
  const [activeCategory, setActiveCategory] = useState<string>('all');
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetch('https://tensorfeed.ai/api/embodied-ai')
      .then(res => { if (!res.ok) throw new Error(`HTTP ${res.status}`); return res.json(); })
      .then((json: ApiResponse) => setData(json))
      .catch(e => setError(e instanceof Error ? e.message : 'Failed to load'));
  }, []);

  const categories = useMemo(() => {
    if (!data) return [];
    const present = new Set(data.entries.map(e => e.category));
    return CATEGORY_ORDER.filter(c => present.has(c));
  }, [data]);

  const filtered = useMemo(() => {
    if (!data) return [];
    if (activeCategory === 'all') return data.entries;
    return data.entries.filter(e => e.category === activeCategory);
  }, [data, activeCategory]);

  return (
    <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <div className="mb-6">
        <div className="flex items-center gap-3 mb-3">
          <div className="p-2 rounded-lg bg-accent-primary/10">
            <Cpu className="w-7 h-7 text-accent-primary" />
          </div>
          <h1 className="text-3xl sm:text-4xl font-bold text-text-primary">Embodied AI</h1>
        </div>
        <p className="text-text-secondary text-lg max-w-3xl">
          Vision-language-action foundation models, humanoid platforms, real-world and sim training datasets, and physics simulators driving the embodied AI wave. Each entry: org, parameters where applicable, license, release date, paper, code, demo. {data?.lastUpdated && `Updated ${data.lastUpdated}.`}
        </p>
      </div>

      <div className="flex gap-2 mb-6 flex-wrap">
        <button
          onClick={() => setActiveCategory('all')}
          className={`px-3.5 py-1.5 rounded-full text-sm font-medium transition-colors border ${
            activeCategory === 'all' ? 'bg-accent-primary text-white border-accent-primary' : 'bg-bg-secondary text-text-secondary border-border hover:border-text-muted'
          }`}
        >
          All
        </button>
        {categories.map(c => (
          <button
            key={c}
            onClick={() => setActiveCategory(c)}
            className={`px-3.5 py-1.5 rounded-full text-sm font-medium transition-colors border ${
              activeCategory === c ? 'bg-accent-primary text-white border-accent-primary' : 'bg-bg-secondary text-text-secondary border-border hover:border-text-muted'
            }`}
          >
            {CATEGORY_LABEL[c] || c}
          </button>
        ))}
      </div>

      {error && (
        <div className="bg-rose-500/10 border border-rose-500/20 rounded-lg p-4 text-rose-400 text-sm mb-6">Error: {error}</div>
      )}

      {data && (
        <div className="space-y-3 mb-10">
          {filtered.map(e => (
            <article key={e.id} className="bg-bg-secondary border border-border rounded-lg p-4 hover:border-accent-primary/50 transition-colors">
              <div className="flex items-start justify-between gap-3 flex-wrap mb-2">
                <div className="min-w-0">
                  <h2 className="font-semibold text-text-primary text-lg">{e.name}</h2>
                  <div className="text-xs text-text-muted mt-0.5">
                    {e.org} · Released {e.released}
                  </div>
                </div>
                {e.parameters && (
                  <div className="text-right">
                    <div className="font-mono text-text-primary font-semibold">{e.parameters}</div>
                    <div className="text-xs text-text-muted">params</div>
                  </div>
                )}
              </div>
              <p className="text-sm text-text-secondary leading-relaxed mb-3">{e.notes}</p>
              <div className="flex items-center gap-1.5 flex-wrap text-xs">
                <span className={`px-2 py-0.5 rounded-full border font-medium ${CATEGORY_COLORS[e.category]}`}>{CATEGORY_LABEL[e.category]}</span>
                <span className="bg-bg-tertiary text-text-secondary border border-border px-2 py-0.5 rounded">{e.license}</span>
                {e.paperUrl && (
                  <a href={e.paperUrl} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1 px-2 py-0.5 rounded border border-border bg-bg-tertiary text-text-secondary hover:text-accent-primary hover:border-accent-primary/40">
                    <FileText className="w-3 h-3" /> Paper <ExternalLink className="w-2.5 h-2.5" />
                  </a>
                )}
                {e.codeUrl && (
                  <a href={e.codeUrl} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1 px-2 py-0.5 rounded border border-border bg-bg-tertiary text-text-secondary hover:text-accent-primary hover:border-accent-primary/40">
                    <CodeIcon className="w-3 h-3" /> Code <ExternalLink className="w-2.5 h-2.5" />
                  </a>
                )}
                {e.demoUrl && (
                  <a href={e.demoUrl} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1 px-2 py-0.5 rounded border border-border bg-bg-tertiary text-text-secondary hover:text-accent-primary hover:border-accent-primary/40">
                    <Play className="w-3 h-3" /> Demo <ExternalLink className="w-2.5 h-2.5" />
                  </a>
                )}
              </div>
            </article>
          ))}
        </div>
      )}

      <div className="bg-bg-secondary border border-border rounded-lg p-4 text-sm text-text-secondary">
        <p>For agents: same data at{' '}<Link href="/api-reference/embodied-ai" className="text-accent-primary hover:underline font-mono">/api/embodied-ai</Link>. Filter with <code className="font-mono">?category=foundation_model|humanoid|dataset|simulator</code>. Free, no auth, cached 10 min. Daily snapshot in the{' '}<Link href="/datasets" className="text-accent-primary hover:underline">Hugging Face dataset</Link>.</p>
      </div>

      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify({
            '@context': 'https://schema.org',
            '@type': 'CollectionPage',
            name: 'Embodied AI Catalog',
            url: 'https://tensorfeed.ai/embodied-ai',
            description:
              'Vision-language-action foundation models, humanoid platforms, robot training datasets, and physics simulators.',
            isPartOf: {
              '@type': 'WebSite',
              name: 'TensorFeed',
              url: 'https://tensorfeed.ai',
            },
          }),
        }}
      />
    </div>
  );
}
