'use client';

import { useState, useMemo, useEffect } from 'react';
import { BarChart3, GitCompare, ArrowRight } from 'lucide-react';
import Link from 'next/link';
import Image from 'next/image';
import fallbackData from '@/../data/benchmarks.json';

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

interface BenchmarksData {
  lastUpdated: string;
  benchmarks: BenchmarkDef[];
  models: ModelEntry[];
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
  const [data, setData] = useState<BenchmarksData>(fallbackData as BenchmarksData);

  useEffect(() => {
    fetch('https://tensorfeed.ai/api/benchmarks')
      .then(res => {
        if (!res.ok) throw new Error('API error');
        return res.json();
      })
      .then((apiData: { ok?: boolean; benchmarks?: BenchmarkDef[]; models?: ModelEntry[]; lastUpdated?: string }) => {
        if (apiData.ok && apiData.benchmarks?.length && apiData.models?.length) {
          setData({
            lastUpdated: apiData.lastUpdated || data.lastUpdated,
            benchmarks: apiData.benchmarks,
            models: apiData.models,
          });
        }
      })
      .catch(() => { /* keep fallback */ });
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const benchmarks = data.benchmarks as BenchmarkDef[];
  const models = data.models as ModelEntry[];

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
      {/*
        Hero with photo background. Long-exposure racetrack with multi-
        colored light trails evokes model competition + ranked
        performance lanes. 2400px WebP, ~141KB.
      */}
      <section className="relative isolate overflow-hidden rounded-xl border border-bg-tertiary mb-10 px-6 sm:px-8 py-12 sm:py-20">
        <Image
          src="/benchmarks-hero.webp"
          alt=""
          aria-hidden="true"
          fill
          priority
          sizes="(max-width: 768px) 100vw, 1024px"
          className="object-cover -z-20"
        />
        <div
          aria-hidden="true"
          className="absolute inset-0 -z-10"
          style={{
            background:
              'linear-gradient(to bottom, rgba(2,6,23,0.65) 0%, rgba(2,6,23,0.78) 100%)',
          }}
        />
        <div
          aria-hidden="true"
          className="absolute inset-0 -z-10 opacity-[0.04]"
          style={{
            backgroundImage: [
              'linear-gradient(rgba(255,255,255,0.6) 1px, transparent 1px)',
              'linear-gradient(90deg, rgba(255,255,255,0.6) 1px, transparent 1px)',
            ].join(', '),
            backgroundSize: '48px 48px',
          }}
        />

        <div className="flex items-center gap-3 mb-3">
          <div className="p-2 rounded-lg bg-accent-primary/15 backdrop-blur-sm">
            <BarChart3 className="w-7 h-7 text-accent-primary" />
          </div>
          <h1 className="text-3xl sm:text-4xl font-bold text-white drop-shadow-md">AI Benchmarks</h1>
        </div>
        <p className="text-text-secondary text-lg max-w-2xl drop-shadow">
          Compare leading AI models across standardized benchmarks. Last updated {data.lastUpdated}.
        </p>
      </section>

      {/* Per-benchmark leaderboard quick links */}
      <div className="mb-8 grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-2">
        {[
          { slug: 'swe_bench', name: 'SWE-bench' },
          { slug: 'mmlu_pro', name: 'MMLU-Pro' },
          { slug: 'human_eval', name: 'HumanEval' },
          { slug: 'gpqa_diamond', name: 'GPQA Diamond' },
          { slug: 'math', name: 'MATH' },
        ].map(b => (
          <Link
            key={b.slug}
            href={`/benchmarks/${b.slug}`}
            className="bg-bg-secondary border border-border rounded-lg px-3 py-2 text-sm text-text-secondary hover:border-accent-primary hover:text-accent-primary transition text-center"
          >
            {b.name} leaderboard →
          </Link>
        ))}
      </div>

      {/* Compare CTA: side-by-side model comparison entry point. Previously
          lived as its own top-nav slot; folded here so /research could take
          that slot. /compare itself is unchanged, just promoted from here. */}
      <Link
        href="/compare"
        className="group block mb-10 bg-bg-secondary border border-border rounded-xl p-5 hover:border-accent-primary transition-colors"
      >
        <div className="flex items-center gap-4">
          <div className="p-3 rounded-lg bg-accent-primary/10 shrink-0">
            <GitCompare className="w-6 h-6 text-accent-primary" />
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center justify-between gap-3 flex-wrap">
              <h2 className="text-lg font-semibold text-text-primary group-hover:text-accent-primary transition-colors">
                Compare specific models, side-by-side
              </h2>
              <ArrowRight className="w-5 h-5 text-text-muted group-hover:text-accent-primary transition-colors shrink-0" />
            </div>
            <p className="text-sm text-text-secondary mt-1">
              Pick any 2 to 5 models to put head-to-head across benchmarks, pricing, and context windows. Popular pairs: Claude Opus vs GPT-5.5, Gemini 3 vs Llama 4, open-source vs frontier.
            </p>
          </div>
        </div>
      </Link>

      {/* Editorial Intro */}
      <div className="max-w-4xl mb-10 text-text-secondary leading-relaxed space-y-4">
        <p>
          How do you know if Claude is smarter than GPT-4? How does the new Llama 4 stack up against Gemini 2.5? Benchmarks provide the answer. These standardized tests measure specific AI capabilities across diverse domains and let us compare models objectively. They&apos;re imperfect (benchmarks are often gamed), but they&apos;re the only shared language we have for understanding AI progress.
        </p>
        <p>
          MMLU measures broad knowledge across multiple choice questions across chemistry, history, law, and 50+ other domains. A score of 92 percent means the model answers 92 out of 100 random questions correctly across all topics. MMLU is the closest we have to a general intelligence test for AI. HumanEval tests code generation: the model writes functions to solve programming problems that humans created. GPQA (Graduate-Level Google-Proof Questions) is deliberately hard, asking obscure questions that require deep expertise. MATH benchmarks raw mathematical reasoning. SWE-bench tests software engineering tasks: given a failing test and a codebase, can the model write code to fix it?
        </p>
        <p>
          No single benchmark captures everything. A model that excels at MMLU might struggle with code. Benchmarks have been leaked and learned during training. And real-world performance depends on your specific task, how you prompt, and how you integrate the model into your system. Use this data to narrow the field of candidates. Then test the finalists on your actual workloads. We&apos;ve also collected this data in our <Link href="/compare" className="text-accent-primary hover:underline">model comparison tool</Link> for side-by-side analysis.
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
          <span className="font-semibold text-text-primary">{activeDef.name}</span>: {activeDef.description}.
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
