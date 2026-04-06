'use client';

import { useState, useMemo } from 'react';
import { BarChart3 } from 'lucide-react';
import benchmarkData from '@/../data/benchmarks.json';
interface BenchmarkDef {
  id: string;
  name: string;
  description: string;
  maxScore: number;
}

interface ModelEntry {
  model: string;
  provider: string;
  released: string;
  scores: Record<string, number>;
}

const PROVIDER_COLORS: Record<string, string> = {
  Anthropic: 'bg-indigo-500/10 text-indigo-400 border-indigo-500/20',
  OpenAI: 'bg-green-500/10 text-green-400 border-green-500/20',
  Google: 'bg-blue-500/10 text-blue-400 border-blue-500/20',
  Meta: 'bg-blue-600/10 text-blue-300 border-blue-600/20',
  Mistral: 'bg-orange-500/10 text-orange-400 border-orange-500/20',
  DeepSeek: 'bg-teal-500/10 text-teal-400 border-teal-500/20',
};

const RANK_STYLES: Record<number, string> = {
  1: 'text-yellow-400',
  2: 'text-gray-300',
  3: 'text-amber-600',
};

const RANK_ROW_STYLES: Record<number, string> = {
  1: 'bg-yellow-500/5 border-l-2 border-l-yellow-400',
  2: 'bg-gray-400/5 border-l-2 border-l-gray-300',
  3: 'bg-amber-600/5 border-l-2 border-l-amber-600',
};

type SortKey = 'rank' | 'model' | 'provider' | 'score' | 'released';
type SortDir = 'asc' | 'desc';

export default function BenchmarksPage() {
  const benchmarks = benchmarkData.benchmarks as BenchmarkDef[];
  const models = benchmarkData.models as ModelEntry[];

  const [activeBenchmark, setActiveBenchmark] = useState(benchmarks[0].id);
  const [sortKey, setSortKey] = useState<SortKey>('score');
  const [sortDir, setSortDir] = useState<SortDir>('desc');

  const activeDef = benchmarks.find((b) => b.id === activeBenchmark)!;

  const ranked = useMemo(() => {
    const withScore = models
      .map((m) => ({
        ...m,
        score: m.scores[activeBenchmark] ?? 0,
      }))
      .sort((a, b) => b.score - a.score)
      .map((m, i) => ({ ...m, rank: i + 1 }));

    // Apply user sort
    const sorted = [...withScore].sort((a, b) => {
      let cmp = 0;
      switch (sortKey) {
        case 'rank':
        case 'score':
          cmp = a.score - b.score;
          break;
        case 'model':
          cmp = a.model.localeCompare(b.model);
          break;
        case 'provider':
          cmp = a.provider.localeCompare(b.provider);
          break;
        case 'released':
          cmp = a.released.localeCompare(b.released);
          break;
      }
      return sortDir === 'asc' ? cmp : -cmp;
    });

    return sorted;
  }, [models, activeBenchmark, sortKey, sortDir]);

  function handleSort(key: SortKey) {
    if (sortKey === key) {
      setSortDir((d) => (d === 'asc' ? 'desc' : 'asc'));
    } else {
      setSortKey(key);
      setSortDir(key === 'model' || key === 'provider' ? 'asc' : 'desc');
    }
  }

  function SortIndicator({ col }: { col: SortKey }) {
    if (sortKey !== col) return null;
    return <span className="ml-1 text-accent-primary">{sortDir === 'asc' ? '\u2191' : '\u2193'}</span>;
  }

  return (
    <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      {/* Header */}
      <div className="mb-10">
        <div className="flex items-center gap-3 mb-3">
          <div className="p-2 rounded-lg bg-accent-primary/10">
            <BarChart3 className="w-7 h-7 text-accent-primary" />
          </div>
          <h1 className="text-3xl sm:text-4xl font-bold text-text-primary">AI Benchmarks</h1>
        </div>
        <p className="text-text-secondary text-lg max-w-2xl">
          Compare leading AI models across standardized benchmarks. Last updated {benchmarkData.lastUpdated}.
        </p>
      </div>

      {/* Benchmark Tabs */}
      <div className="flex flex-wrap gap-2 mb-8">
        {benchmarks.map((b) => (
          <button
            key={b.id}
            onClick={() => {
              setActiveBenchmark(b.id);
              setSortKey('score');
              setSortDir('desc');
            }}
            className={`px-3.5 py-1.5 rounded-full text-sm font-medium transition-colors border ${
              activeBenchmark === b.id
                ? 'bg-accent-primary text-white border-accent-primary'
                : 'bg-bg-secondary text-text-secondary border-border hover:border-text-muted'
            }`}
          >
            {b.name}
          </button>
        ))}
      </div>

      {/* Benchmark Description */}
      <div className="bg-bg-secondary border border-border rounded-lg p-4 mb-6">
        <p className="text-sm text-text-secondary">
          <span className="font-semibold text-text-primary">{activeDef.name}</span> — {activeDef.description}.
          Max score: {activeDef.maxScore}.
        </p>
      </div>

      {/* Table */}
      <div className="overflow-x-auto">
        <table className="w-full text-left">
          <thead>
            <tr className="border-b border-border text-xs uppercase tracking-wide text-text-muted">
              <th className="py-3 px-3 cursor-pointer hover:text-text-primary" onClick={() => handleSort('rank')}>
                Rank<SortIndicator col="rank" />
              </th>
              <th className="py-3 px-3 cursor-pointer hover:text-text-primary" onClick={() => handleSort('model')}>
                Model<SortIndicator col="model" />
              </th>
              <th className="py-3 px-3 cursor-pointer hover:text-text-primary" onClick={() => handleSort('provider')}>
                Provider<SortIndicator col="provider" />
              </th>
              <th className="py-3 px-3 cursor-pointer hover:text-text-primary" onClick={() => handleSort('score')}>
                Score<SortIndicator col="score" />
              </th>
              <th className="py-3 px-3 cursor-pointer hover:text-text-primary" onClick={() => handleSort('released')}>
                Released<SortIndicator col="released" />
              </th>
            </tr>
          </thead>
          <tbody>
            {ranked.map((m) => (
              <tr
                key={m.model}
                className={`border-b border-border/50 hover:bg-bg-tertiary/50 transition-colors ${
                  RANK_ROW_STYLES[m.rank] || ''
                }`}
              >
                <td className="py-3 px-3">
                  <span className={`font-bold ${RANK_STYLES[m.rank] || 'text-text-muted'}`}>
                    #{m.rank}
                  </span>
                </td>
                <td className="py-3 px-3">
                  <span className="font-semibold text-text-primary">{m.model}</span>
                </td>
                <td className="py-3 px-3">
                  <span
                    className={`text-xs px-2 py-0.5 rounded-full border font-medium ${
                      PROVIDER_COLORS[m.provider] || 'bg-bg-tertiary text-text-secondary border-border'
                    }`}
                  >
                    {m.provider}
                  </span>
                </td>
                <td className="py-3 px-3">
                  <span className="font-mono text-text-primary font-semibold">{m.score.toFixed(1)}</span>
                  <span className="text-text-muted text-xs ml-1">/ {activeDef.maxScore}</span>
                </td>
                <td className="py-3 px-3 text-sm text-text-muted">{m.released}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
