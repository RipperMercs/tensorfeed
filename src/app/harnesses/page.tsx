'use client';

import { useState, useMemo, useEffect } from 'react';
import { Wrench, ExternalLink } from 'lucide-react';
import Link from 'next/link';
import fallbackData from '@/../data/harnesses.json';
import { HARNESS_DIRECTORY } from '@/lib/harness-directory';

interface BenchmarkDef {
  id: string;
  name: string;
  description: string;
  maxScore: number;
  unit: string;
  sourceUrl: string;
}

interface HarnessDef {
  id: string;
  name: string;
  vendor: string;
  type: string;
  openSource: boolean;
  url: string;
  modelLockIn: string;
  summary: string;
}

interface ResultEntry {
  harness: string;
  model: string;
  scores: Record<string, number | null>;
}

interface HarnessesData {
  lastUpdated: string;
  note: string;
  benchmarks: BenchmarkDef[];
  harnesses: HarnessDef[];
  results: ResultEntry[];
}

const TYPE_BADGES: Record<string, string> = {
  cli: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20',
  ide: 'bg-blue-500/10 text-blue-400 border-blue-500/20',
  'agent-platform': 'bg-purple-500/10 text-purple-400 border-purple-500/20',
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

export default function HarnessesPage() {
  const [data, setData] = useState<HarnessesData>(fallbackData as HarnessesData);

  useEffect(() => {
    fetch('https://tensorfeed.ai/api/harnesses')
      .then(res => {
        if (!res.ok) throw new Error('API error');
        return res.json();
      })
      .then((apiData: { ok?: boolean; benchmarks?: BenchmarkDef[]; harnesses?: HarnessDef[]; results?: ResultEntry[]; lastUpdated?: string; note?: string }) => {
        if (apiData.ok && apiData.benchmarks?.length && apiData.harnesses?.length && apiData.results?.length) {
          setData({
            lastUpdated: apiData.lastUpdated || data.lastUpdated,
            note: apiData.note || data.note,
            benchmarks: apiData.benchmarks,
            harnesses: apiData.harnesses,
            results: apiData.results,
          });
        }
      })
      .catch(() => { /* keep fallback */ });
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const { benchmarks, harnesses, results } = data;
  const [activeBenchmark, setActiveBenchmark] = useState(benchmarks[0].id);

  const activeDef = benchmarks.find(b => b.id === activeBenchmark)!;

  const ranked = useMemo(() => {
    const scored = results
      .filter(r => typeof r.scores[activeBenchmark] === 'number' && Number.isFinite(r.scores[activeBenchmark]!))
      .map(r => {
        const harness = harnesses.find(h => h.id === r.harness);
        return {
          harness: harness?.name || r.harness,
          harnessSlug: r.harness,
          vendor: harness?.vendor || 'Unknown',
          type: harness?.type || 'cli',
          openSource: harness?.openSource ?? false,
          model: r.model,
          score: r.scores[activeBenchmark]!,
        };
      })
      .sort((a, b) => b.score - a.score);

    return scored.map((r, i) => ({ ...r, rank: i + 1 }));
  }, [results, harnesses, activeBenchmark]);

  // Build the full matrix: harness x model rows, benchmark columns.
  const matrix = useMemo(() => {
    return results.map(r => {
      const h = harnesses.find(x => x.id === r.harness);
      return {
        harness: h?.name || r.harness,
        harnessSlug: r.harness,
        vendor: h?.vendor || 'Unknown',
        model: r.model,
        scores: r.scores,
      };
    });
  }, [results, harnesses]);

  const PAGE_JSONLD = {
    '@context': 'https://schema.org',
    '@type': 'Dataset',
    name: 'TensorFeed AI Coding Harness Leaderboard',
    description:
      'Cross-harness benchmark scores for the major agentic-coding harnesses (Claude Code, Cursor Agent, Codex CLI, Aider, OpenHands, Devin, Cline, Windsurf, Amp, Continue, Roo Code) on SWE-bench Verified, Terminal-Bench, Aider Polyglot, and SWE-Lancer.',
    url: 'https://tensorfeed.ai/harnesses',
    keywords: 'AI coding agent, SWE-bench, Terminal-Bench, Aider Polyglot, Claude Code, Cursor, Codex CLI, Devin, OpenHands',
    creator: { '@type': 'Organization', name: 'TensorFeed.ai', url: 'https://tensorfeed.ai' },
    dateModified: data.lastUpdated,
    license: 'https://tensorfeed.ai/terms',
  };

  const FAQ_JSONLD = {
    '@context': 'https://schema.org',
    '@type': 'FAQPage',
    mainEntity: [
      {
        '@type': 'Question',
        name: 'What is an AI coding harness?',
        acceptedAnswer: {
          '@type': 'Answer',
          text: 'A coding harness is the agent scaffolding around a base LLM: the tool-use loop, file-edit primitives, shell sandbox, planning logic, retrieval, and approval gating. The same model can score very differently on the same benchmark depending on which harness wraps it. Claude Code, Cursor Agent, Codex CLI, Aider, OpenHands, and Devin are all harnesses; Claude Sonnet 4.6 and GPT-5.5 are the base models they wrap.',
        },
      },
      {
        '@type': 'Question',
        name: 'Why does the harness matter as much as the model?',
        acceptedAnswer: {
          '@type': 'Answer',
          text: 'Because most of what a coding agent does is not raw token generation, it is tool use: deciding when to read a file, run a test, search the codebase, or stop and ask. A weaker model in a strong harness routinely beats a stronger model in a weak harness on agentic benchmarks. The 2025-2026 SWE-bench Verified leaderboard shows the same model varying by 5-15 percentage points purely from harness choice.',
        },
      },
      {
        '@type': 'Question',
        name: 'Which harness leads SWE-bench Verified?',
        acceptedAnswer: {
          '@type': 'Answer',
          text: 'As of the latest snapshot on this page, Claude Code paired with Claude Opus 4.7 leads SWE-bench Verified, followed closely by Codex CLI on GPT-5.5 and Amp on Claude Sonnet 4.6. The full ranked table updates as we ingest new vendor-published scores.',
        },
      },
      {
        '@type': 'Question',
        name: 'Are these scores TensorFeed measurements or vendor self-reports?',
        acceptedAnswer: {
          '@type': 'Answer',
          text: 'Vendor self-reports. Each row is the harness vendor\'s best published score for the named base model on the named benchmark, with a link to the upstream report. TensorFeed aggregates and renormalizes; we do not re-run the benchmarks ourselves. The exception is our LLM Probe data (provider latency and availability) which we measure at /api/probe/latest.',
        },
      },
    ],
  };

  return (
    <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(PAGE_JSONLD) }} />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(FAQ_JSONLD) }} />

      {/* Header */}
      <div className="mb-8">
        <div className="flex items-center gap-3 mb-3">
          <div className="p-2 rounded-lg bg-accent-primary/10">
            <Wrench className="w-7 h-7 text-accent-primary" />
          </div>
          <h1 className="text-3xl sm:text-4xl font-bold text-text-primary">AI Coding Harnesses</h1>
        </div>
        <p className="text-text-secondary text-lg max-w-3xl">
          The same model can score 15 points apart on the same benchmark depending on which agent harness wraps it. This page tracks how the major coding harnesses (Claude Code, Cursor, Codex CLI, Aider, OpenHands, Devin, Cline, Windsurf, Amp, Continue, Roo Code) perform across SWE-bench Verified, Terminal-Bench, Aider Polyglot, and SWE-Lancer. Last updated {data.lastUpdated}.
        </p>
      </div>

      {/* Editorial intro */}
      <div className="max-w-4xl mb-10 text-text-secondary leading-relaxed space-y-4">
        <p>
          Most of the AI coding conversation in 2026 is about harnesses, not models. Claude Sonnet 4.6 in Claude Code scores ~71% on SWE-bench Verified. The same Sonnet 4.6 in Continue scores ~52%. The model is identical. The harness is doing the work: tool-use loop, retrieval, planning, the order it reads files in, when it decides to stop and run tests, how it backs off after a failed edit. The harness gap is real and it is the load-bearing thing in most production agent setups.
        </p>
        <p>
          The matrix below collects the best vendor-published score for each harness × base-model combination across four benchmarks. Tabs above the table switch which benchmark drives the ranked leaderboard view. The full matrix is below that, and each harness name links to a detail page with the harness architecture, model story, and pricing model.
        </p>
        <p className="text-sm text-text-muted italic">{data.note}</p>
      </div>

      {/* Benchmark tabs */}
      <div className="flex flex-wrap gap-2 mb-6">
        {benchmarks.map(b => (
          <button
            key={b.id}
            onClick={() => setActiveBenchmark(b.id)}
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

      {/* Active benchmark description */}
      <div className="bg-bg-secondary border border-border rounded-lg p-4 mb-6">
        <div className="flex items-start justify-between gap-3 flex-wrap">
          <div className="flex-1 min-w-0">
            <p className="text-sm text-text-secondary">
              <span className="font-semibold text-text-primary">{activeDef.name}</span>: {activeDef.description}
            </p>
            <p className="text-xs text-text-muted mt-1">Scoring unit: {activeDef.unit}. Max: {activeDef.maxScore}.</p>
          </div>
          <a
            href={activeDef.sourceUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="text-xs text-accent-primary hover:underline flex items-center gap-1 whitespace-nowrap"
          >
            Upstream <ExternalLink className="w-3 h-3" />
          </a>
        </div>
      </div>

      {/* Ranked leaderboard for active benchmark */}
      <h2 className="text-xl font-semibold text-text-primary mb-3">{activeDef.name} Leaderboard</h2>
      {ranked.length === 0 ? (
        <div className="bg-bg-secondary border border-border rounded-lg p-6 mb-10 text-text-muted text-sm">
          No published scores yet for this benchmark.
        </div>
      ) : (
        <div className="overflow-x-auto mb-10">
          <table className="w-full text-left">
            <thead>
              <tr className="border-b border-border text-xs uppercase tracking-wide text-text-muted">
                <th className="py-3 px-3">Rank</th>
                <th className="py-3 px-3">Harness</th>
                <th className="py-3 px-3">Base Model</th>
                <th className="py-3 px-3">Vendor</th>
                <th className="py-3 px-3">Type</th>
                <th className="py-3 px-3">Score</th>
              </tr>
            </thead>
            <tbody>
              {ranked.map(r => (
                <tr
                  key={`${r.harnessSlug}-${r.model}`}
                  className={`border-b border-border/50 hover:bg-bg-tertiary/50 transition-colors ${
                    RANK_ROW_STYLES[r.rank] || ''
                  }`}
                >
                  <td className="py-3 px-3">
                    <span className={`font-bold ${RANK_STYLES[r.rank] || 'text-text-muted'}`}>#{r.rank}</span>
                  </td>
                  <td className="py-3 px-3">
                    <Link href={`/harnesses/${r.harnessSlug}`} className="font-semibold text-text-primary hover:text-accent-primary">
                      {r.harness}
                    </Link>
                    {r.openSource && <span className="ml-2 text-xs text-emerald-400 font-mono">OSS</span>}
                  </td>
                  <td className="py-3 px-3 text-text-secondary text-sm">{r.model}</td>
                  <td className="py-3 px-3 text-text-secondary text-sm">{r.vendor}</td>
                  <td className="py-3 px-3">
                    <span className={`text-xs px-2 py-0.5 rounded-full border font-medium ${TYPE_BADGES[r.type] || 'bg-bg-tertiary text-text-secondary border-border'}`}>
                      {r.type}
                    </span>
                  </td>
                  <td className="py-3 px-3">
                    <span className="font-mono text-text-primary font-semibold">{r.score.toFixed(1)}</span>
                    <span className="text-text-muted text-xs ml-1">/ {activeDef.maxScore}</span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Full cross-benchmark matrix */}
      <h2 className="text-xl font-semibold text-text-primary mb-3">Full Matrix</h2>
      <p className="text-sm text-text-muted mb-4">
        Every harness × base-model combination across every tracked benchmark. Empty cells mean the vendor has not published a score on that benchmark for that model in that harness.
      </p>
      <div className="overflow-x-auto mb-10">
        <table className="w-full text-left text-sm">
          <thead>
            <tr className="border-b border-border text-xs uppercase tracking-wide text-text-muted">
              <th className="py-3 px-3">Harness</th>
              <th className="py-3 px-3">Base Model</th>
              {benchmarks.map(b => (
                <th key={b.id} className="py-3 px-3 text-right">{b.name}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {matrix.map(row => (
              <tr
                key={`${row.harnessSlug}-${row.model}`}
                className="border-b border-border/50 hover:bg-bg-tertiary/50 transition-colors"
              >
                <td className="py-3 px-3">
                  <Link href={`/harnesses/${row.harnessSlug}`} className="font-medium text-text-primary hover:text-accent-primary">
                    {row.harness}
                  </Link>
                </td>
                <td className="py-3 px-3 text-text-secondary">{row.model}</td>
                {benchmarks.map(b => {
                  const v = row.scores[b.id];
                  return (
                    <td key={b.id} className="py-3 px-3 text-right font-mono">
                      {typeof v === 'number' && Number.isFinite(v) ? (
                        <span className="text-text-primary">{v.toFixed(1)}</span>
                      ) : (
                        <span className="text-text-muted">—</span>
                      )}
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Harness directory cards */}
      <h2 className="text-xl font-semibold text-text-primary mb-3">Harness Directory</h2>
      <p className="text-sm text-text-muted mb-4">Every harness in the matrix above, with a link to the detail page.</p>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-12">
        {HARNESS_DIRECTORY.map(h => {
          const def = harnesses.find(x => x.id === h.slug);
          return (
            <Link
              key={h.slug}
              href={`/harnesses/${h.slug}`}
              className="block bg-bg-secondary border border-border rounded-lg p-4 hover:border-accent-primary transition-colors"
            >
              <div className="flex items-start justify-between gap-3 mb-2">
                <div>
                  <div className="font-semibold text-text-primary">{h.displayName}</div>
                  <div className="text-xs text-text-muted">{h.vendor}</div>
                </div>
                {def && (
                  <span className={`text-xs px-2 py-0.5 rounded-full border font-medium ${TYPE_BADGES[def.type] || 'bg-bg-tertiary text-text-secondary border-border'}`}>
                    {def.type}
                  </span>
                )}
              </div>
              <p className="text-sm text-text-secondary leading-relaxed">{def?.summary}</p>
              <div className="text-xs text-text-muted mt-2">
                {def?.openSource ? <span className="text-emerald-400 font-mono mr-2">OSS</span> : null}
                {def?.modelLockIn}
              </div>
            </Link>
          );
        })}
      </div>

      {/* API note */}
      <div className="bg-bg-secondary border border-border rounded-lg p-4">
        <p className="text-sm text-text-secondary">
          <span className="font-semibold text-text-primary">For agents:</span> the same data is served as JSON at{' '}
          <Link href="/api-reference/harnesses" className="text-accent-primary hover:underline font-mono">/api/harnesses</Link>
          . Free, no auth, cached 5 minutes.
        </p>
      </div>
    </div>
  );
}
