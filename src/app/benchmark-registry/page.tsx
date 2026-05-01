'use client';

import { useEffect, useState, useMemo } from 'react';
import Link from 'next/link';
import { ClipboardList, ExternalLink, AlertTriangle } from 'lucide-react';

interface Benchmark {
  id: string;
  name: string;
  category: string;
  description: string;
  released: string;
  size: string;
  scoreRange: string;
  frontierScore: string;
  status: 'active' | 'saturated' | 'deprecated';
  contaminationRisk: 'low' | 'medium' | 'high';
  maintainer: string;
  paperUrl: string | null;
  repoUrl: string | null;
  leaderboardUrl: string | null;
  whoCares: string;
}

interface Response {
  ok: boolean;
  lastUpdated: string;
  count: number;
  benchmarks: Benchmark[];
}

const CATEGORY_LABEL: Record<string, string> = {
  knowledge: 'Knowledge / Reasoning',
  math: 'Math',
  code: 'Code',
  multimodal: 'Multimodal',
  agents: 'Agents / Tool use',
  'long-context': 'Long context',
  safety: 'Safety',
};

const CATEGORY_COLORS: Record<string, string> = {
  knowledge: 'bg-blue-500/10 text-blue-400 border-blue-500/20',
  math: 'bg-purple-500/10 text-purple-400 border-purple-500/20',
  code: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20',
  multimodal: 'bg-pink-500/10 text-pink-400 border-pink-500/20',
  agents: 'bg-amber-500/10 text-amber-400 border-amber-500/20',
  'long-context': 'bg-cyan-500/10 text-cyan-400 border-cyan-500/20',
  safety: 'bg-rose-500/10 text-rose-400 border-rose-500/20',
};

const STATUS_COLORS: Record<string, string> = {
  active: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20',
  saturated: 'bg-amber-500/10 text-amber-400 border-amber-500/20',
  deprecated: 'bg-rose-500/10 text-rose-400 border-rose-500/20',
};

const RISK_COLORS: Record<string, string> = {
  low: 'text-emerald-400',
  medium: 'text-amber-400',
  high: 'text-rose-400',
};

export default function BenchmarkRegistryPage() {
  const [data, setData] = useState<Response | null>(null);
  const [activeCategory, setActiveCategory] = useState<string>('all');
  const [activeStatus, setActiveStatus] = useState<string>('all');
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetch('https://tensorfeed.ai/api/benchmark-registry')
      .then(res => {
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        return res.json();
      })
      .then((json: Response) => setData(json))
      .catch(e => setError(e instanceof Error ? e.message : 'Failed to load'));
  }, []);

  const categories = useMemo(() => {
    if (!data) return [];
    return Array.from(new Set(data.benchmarks.map(b => b.category)));
  }, [data]);

  const filtered = useMemo(() => {
    if (!data) return [];
    let rows = data.benchmarks;
    if (activeCategory !== 'all') rows = rows.filter(b => b.category === activeCategory);
    if (activeStatus !== 'all') rows = rows.filter(b => b.status === activeStatus);
    return rows;
  }, [data, activeCategory, activeStatus]);

  return (
    <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <div className="mb-6">
        <div className="flex items-center gap-3 mb-3">
          <div className="p-2 rounded-lg bg-accent-primary/10">
            <ClipboardList className="w-7 h-7 text-accent-primary" />
          </div>
          <h1 className="text-3xl sm:text-4xl font-bold text-text-primary">Benchmark Registry</h1>
        </div>
        <p className="text-text-secondary text-lg max-w-3xl">
          Meta-catalog of AI evaluation benchmarks: knowledge, math, code, multimodal, agents, long-context. Each entry has size, score range, current frontier, status (active vs saturated), contamination risk, and links to paper, repo, and leaderboard. {data?.lastUpdated && `Updated ${data.lastUpdated}.`}
        </p>
      </div>

      <div className="max-w-4xl mb-8 text-text-secondary text-sm leading-relaxed">
        <p>
          Different from <Link href="/benchmarks" className="text-accent-primary hover:underline">/benchmarks</Link> (which has model x score data for the 5 we ingest) and <Link href="/harnesses" className="text-accent-primary hover:underline">/harnesses</Link> (which has harness x score data for 4 agentic benchmarks). This is the broader registry of which benchmarks exist, what they test, and where to find current numbers.
        </p>
      </div>

      {/* Filters */}
      <div className="flex gap-2 mb-3 flex-wrap items-center">
        <span className="text-xs text-text-muted uppercase tracking-wide">Category:</span>
        <button
          onClick={() => setActiveCategory('all')}
          className={`px-3 py-1 rounded-full text-xs font-medium transition-colors border ${
            activeCategory === 'all' ? 'bg-accent-primary text-white border-accent-primary' : 'bg-bg-secondary text-text-secondary border-border hover:border-text-muted'
          }`}
        >
          All
        </button>
        {categories.map(c => (
          <button
            key={c}
            onClick={() => setActiveCategory(c)}
            className={`px-3 py-1 rounded-full text-xs font-medium transition-colors border ${
              activeCategory === c ? 'bg-accent-primary text-white border-accent-primary' : 'bg-bg-secondary text-text-secondary border-border hover:border-text-muted'
            }`}
          >
            {CATEGORY_LABEL[c] || c}
          </button>
        ))}
      </div>
      <div className="flex gap-2 mb-6 flex-wrap items-center">
        <span className="text-xs text-text-muted uppercase tracking-wide">Status:</span>
        {['all', 'active', 'saturated', 'deprecated'].map(s => (
          <button
            key={s}
            onClick={() => setActiveStatus(s)}
            className={`px-3 py-1 rounded-full text-xs font-medium transition-colors border ${
              activeStatus === s ? 'bg-accent-primary text-white border-accent-primary' : 'bg-bg-secondary text-text-secondary border-border hover:border-text-muted'
            }`}
          >
            {s === 'all' ? 'All' : s.charAt(0).toUpperCase() + s.slice(1)}
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
          {filtered.map(b => (
            <div key={b.id} className="bg-bg-secondary border border-border rounded-lg p-4 hover:border-accent-primary/50 transition-colors">
              <div className="flex items-start justify-between gap-3 flex-wrap mb-2">
                <div className="min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <h3 className="font-semibold text-text-primary text-lg">{b.name}</h3>
                    <span className={`text-xs px-2 py-0.5 rounded-full border font-medium ${CATEGORY_COLORS[b.category]}`}>
                      {CATEGORY_LABEL[b.category]}
                    </span>
                    <span className={`text-xs px-2 py-0.5 rounded-full border font-medium ${STATUS_COLORS[b.status]}`}>
                      {b.status}
                    </span>
                  </div>
                  <div className="text-xs text-text-muted mt-0.5">
                    {b.maintainer} · Released {b.released} · {b.size}
                  </div>
                </div>
                <div className="text-right text-sm">
                  <div className="text-xs text-text-muted">Frontier</div>
                  <div className="font-mono text-text-primary font-semibold">{b.frontierScore}</div>
                </div>
              </div>
              <p className="text-sm text-text-secondary leading-relaxed mb-2">{b.description}</p>
              <p className="text-xs text-text-muted italic mb-2">Who cares: {b.whoCares}</p>
              <div className="flex items-center gap-3 flex-wrap text-xs">
                <span className={`flex items-center gap-1 ${RISK_COLORS[b.contaminationRisk]}`}>
                  <AlertTriangle className="w-3 h-3" />
                  {b.contaminationRisk} contamination risk
                </span>
                {b.paperUrl && <a href={b.paperUrl} target="_blank" rel="noopener noreferrer" className="text-accent-primary hover:underline inline-flex items-center gap-0.5">paper <ExternalLink className="w-3 h-3" /></a>}
                {b.repoUrl && <a href={b.repoUrl} target="_blank" rel="noopener noreferrer" className="text-accent-primary hover:underline inline-flex items-center gap-0.5">repo <ExternalLink className="w-3 h-3" /></a>}
                {b.leaderboardUrl && <a href={b.leaderboardUrl} target="_blank" rel="noopener noreferrer" className="text-accent-primary hover:underline inline-flex items-center gap-0.5">leaderboard <ExternalLink className="w-3 h-3" /></a>}
              </div>
            </div>
          ))}
        </div>
      )}

      <div className="bg-bg-secondary border border-border rounded-lg p-4 text-sm text-text-secondary">
        <p>
          For agents: same data at{' '}
          <Link href="/api-reference/benchmark-registry" className="text-accent-primary hover:underline font-mono">/api/benchmark-registry</Link>
          . Filter with <code className="font-mono">?category=knowledge|math|code|...</code> or <code className="font-mono">?status=active|saturated</code>. Free, no auth, cached 10 min.
        </p>
      </div>
    </div>
  );
}
