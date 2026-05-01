'use client';

import { useEffect, useState, useMemo } from 'react';
import Link from 'next/link';
import { Boxes, ExternalLink, Star } from 'lucide-react';

interface Framework {
  id: string;
  name: string;
  vendor: string;
  languages: string[];
  version: string;
  released: string;
  license: string;
  githubStarsK: number;
  weeklyInstallsK: number | null;
  category: string;
  features: string[];
  url: string;
  github: string;
  notes: string;
}

interface Response {
  ok: boolean;
  lastUpdated: string;
  count: number;
  frameworks: Framework[];
}

const CATEGORY_LABEL: Record<string, string> = {
  'agent-orchestration': 'Agent orchestration',
  'rag': 'RAG',
  'multi-agent': 'Multi-agent',
  'sdk': 'SDK',
  'workflow': 'Workflow',
  'voice-agent': 'Voice agent',
  'browser-agent': 'Browser agent',
};

const CATEGORY_COLORS: Record<string, string> = {
  'agent-orchestration': 'bg-blue-500/10 text-blue-400 border-blue-500/20',
  'rag': 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20',
  'multi-agent': 'bg-purple-500/10 text-purple-400 border-purple-500/20',
  'sdk': 'bg-amber-500/10 text-amber-400 border-amber-500/20',
  'workflow': 'bg-cyan-500/10 text-cyan-400 border-cyan-500/20',
  'voice-agent': 'bg-pink-500/10 text-pink-400 border-pink-500/20',
  'browser-agent': 'bg-rose-500/10 text-rose-400 border-rose-500/20',
};

const LANG_LABEL: Record<string, string> = {
  python: 'Python', typescript: 'TS', javascript: 'JS', multi: 'Multi',
};

export default function FrameworksPage() {
  const [data, setData] = useState<Response | null>(null);
  const [activeCategory, setActiveCategory] = useState<string>('all');
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetch('https://tensorfeed.ai/api/frameworks')
      .then(res => {
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        return res.json();
      })
      .then((json: Response) => setData(json))
      .catch(e => setError(e instanceof Error ? e.message : 'Failed to load'));
  }, []);

  const categories = useMemo(() => {
    if (!data) return [];
    return Array.from(new Set(data.frameworks.map(f => f.category)));
  }, [data]);

  const filtered = useMemo(() => {
    if (!data) return [];
    let rows = data.frameworks;
    if (activeCategory !== 'all') rows = rows.filter(f => f.category === activeCategory);
    return [...rows].sort((a, b) => b.githubStarsK - a.githubStarsK);
  }, [data, activeCategory]);

  return (
    <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <div className="mb-6">
        <div className="flex items-center gap-3 mb-3">
          <div className="p-2 rounded-lg bg-accent-primary/10">
            <Boxes className="w-7 h-7 text-accent-primary" />
          </div>
          <h1 className="text-3xl sm:text-4xl font-bold text-text-primary">Agent Frameworks</h1>
        </div>
        <p className="text-text-secondary text-lg max-w-3xl">
          Production AI agent frameworks and SDKs with language, license, GitHub stars, weekly install volume, version, and feature flags. The framework layer agents are built on. {data?.lastUpdated && `Updated ${data.lastUpdated}.`}
        </p>
      </div>

      {/* Category filter */}
      <div className="flex gap-2 mb-6 flex-wrap">
        <button
          onClick={() => setActiveCategory('all')}
          className={`px-3.5 py-1.5 rounded-full text-sm font-medium transition-colors border ${
            activeCategory === 'all'
              ? 'bg-accent-primary text-white border-accent-primary'
              : 'bg-bg-secondary text-text-secondary border-border hover:border-text-muted'
          }`}
        >
          All
        </button>
        {categories.map(c => (
          <button
            key={c}
            onClick={() => setActiveCategory(c)}
            className={`px-3.5 py-1.5 rounded-full text-sm font-medium transition-colors border ${
              activeCategory === c
                ? 'bg-accent-primary text-white border-accent-primary'
                : 'bg-bg-secondary text-text-secondary border-border hover:border-text-muted'
            }`}
          >
            {CATEGORY_LABEL[c] || c}
          </button>
        ))}
      </div>

      {error && (
        <div className="bg-rose-500/10 border border-rose-500/20 rounded-lg p-4 text-rose-400 text-sm mb-6">
          Error loading data: {error}
        </div>
      )}

      {data && (
        <div className="space-y-3 mb-10">
          {filtered.map(f => (
            <div key={f.id} className="bg-bg-secondary border border-border rounded-lg p-4 hover:border-accent-primary/50 transition-colors">
              <div className="flex items-start justify-between gap-3 flex-wrap mb-2">
                <div className="min-w-0">
                  <a href={f.url} target="_blank" rel="noopener noreferrer" className="font-semibold text-text-primary text-lg hover:text-accent-primary inline-flex items-center gap-1">
                    {f.name} <ExternalLink className="w-3 h-3 text-text-muted" />
                  </a>
                  <div className="text-xs text-text-muted mt-0.5">
                    {f.vendor} · v{f.version} · {f.license} · Released {f.released}
                  </div>
                </div>
                <div className="text-right text-sm text-text-secondary">
                  <div className="flex items-center gap-1 justify-end">
                    <Star className="w-3.5 h-3.5 text-yellow-400" />
                    <span className="font-mono">{f.githubStarsK}k</span>
                  </div>
                  {f.weeklyInstallsK !== null && (
                    <div className="text-xs text-text-muted font-mono mt-0.5">{f.weeklyInstallsK}k/week</div>
                  )}
                </div>
              </div>
              <p className="text-sm text-text-secondary leading-relaxed mb-2">{f.notes}</p>
              <div className="flex items-center gap-1.5 flex-wrap">
                <span className={`text-xs px-2 py-0.5 rounded-full border font-medium ${CATEGORY_COLORS[f.category]}`}>
                  {CATEGORY_LABEL[f.category]}
                </span>
                {f.languages.map(l => (
                  <span key={l} className="text-xs bg-bg-tertiary text-text-secondary border border-border px-2 py-0.5 rounded">
                    {LANG_LABEL[l] || l}
                  </span>
                ))}
                {f.features.slice(0, 5).map(feat => (
                  <span key={feat} className="text-xs bg-bg-tertiary text-text-muted border border-border px-2 py-0.5 rounded">
                    {feat}
                  </span>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}

      <div className="bg-bg-secondary border border-border rounded-lg p-4 text-sm text-text-secondary">
        <p>
          Looking for the official TensorFeed integrations with these frameworks? See{' '}
          <Link href="/developers/frameworks" className="text-accent-primary hover:underline">/developers/frameworks</Link>{' '}
          for drop-in tools and document loaders. JSON catalog at{' '}
          <Link href="/api-reference/frameworks" className="text-accent-primary hover:underline font-mono">/api/frameworks</Link>.
        </p>
      </div>
    </div>
  );
}
