'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { Swords, ExternalLink, Flame, Trophy, Rocket } from 'lucide-react';
import { ArticleJsonLd, FAQPageJsonLd } from '@/components/seo/JsonLd';
import { NewsArticle } from '@/lib/types';
import fallbackPricing from '@/../data/pricing.json';
import fallbackBenchmarks from '@/../data/benchmarks.json';

interface ModelEntry {
  id: string;
  name: string;
  provider: string;
  inputPrice: number;
  outputPrice: number;
  contextWindow: number;
  released: string;
  capabilities: string[];
}

interface BenchmarkRow {
  model: string;
  provider: string;
  released: string;
  scores: Record<string, number>;
}

interface BenchmarksData {
  lastUpdated: string;
  benchmarks: { id: string; name: string; description: string; maxScore: number }[];
  models: BenchmarkRow[];
}

interface PricingShape {
  lastUpdated: string;
  providers: Array<{
    id: string;
    name: string;
    models: Array<{
      id: string;
      name: string;
      inputPrice: number;
      outputPrice: number;
      contextWindow: number;
      released: string;
      capabilities: string[];
    }>;
  }>;
}

const PROVIDER_COLORS: Record<string, string> = {
  Anthropic: 'bg-indigo-500/10 text-indigo-400 border-indigo-500/30',
  OpenAI: 'bg-green-500/10 text-green-400 border-green-500/30',
  Google: 'bg-blue-500/10 text-blue-400 border-blue-500/30',
  Meta: 'bg-blue-600/10 text-blue-300 border-blue-600/30',
  Mistral: 'bg-orange-500/10 text-orange-400 border-orange-500/30',
  DeepSeek: 'bg-teal-500/10 text-teal-400 border-teal-500/30',
  xAI: 'bg-gray-500/10 text-gray-300 border-gray-500/30',
  Cohere: 'bg-pink-500/10 text-pink-400 border-pink-500/30',
};

function flattenPricing(data: PricingShape): ModelEntry[] {
  const rows: ModelEntry[] = [];
  for (const p of data.providers) {
    for (const m of p.models) {
      rows.push({ ...m, provider: p.name });
    }
  }
  return rows;
}

const MODEL_NEWS_KEYWORDS = [
  'gpt',
  'claude',
  'gemini',
  'grok',
  'llama',
  'mistral',
  'deepseek',
  'command r',
  'frontier',
  'release',
  'launch',
  'open weight',
];

function matchesModelNews(article: NewsArticle): boolean {
  const haystack = `${article.title} ${article.snippet}`.toLowerCase();
  return MODEL_NEWS_KEYWORDS.some((kw) => haystack.includes(kw));
}

function parseReleaseDate(released: string): Date | null {
  if (!released) return null;
  const parts = released.split('-');
  if (parts.length < 2) return null;
  const year = parseInt(parts[0], 10);
  const month = parseInt(parts[1], 10);
  if (Number.isNaN(year) || Number.isNaN(month)) return null;
  return new Date(year, month - 1, 1);
}

function formatReleased(released: string): string {
  const d = parseReleaseDate(released);
  if (!d) return released;
  return d.toLocaleDateString('en-US', { month: 'short', year: 'numeric' });
}

function formatContext(n: number): string {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1).replace(/\.0$/, '')}M`;
  if (n >= 1_000) return `${Math.round(n / 1_000)}K`;
  return n.toString();
}

function formatDate(iso: string): string {
  try {
    return new Date(iso).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    });
  } catch {
    return iso;
  }
}

const RUMORED: Array<{ name: string; provider: string; status: string; notes: string }> = [
  {
    name: 'Claude Mythos',
    provider: 'Anthropic',
    status: 'Private preview',
    notes: 'In closed preview with 40 launch partners. Pitched as a step change in long horizon agentic reasoning. No public release date.',
  },
  {
    name: 'GPT-5.5',
    provider: 'OpenAI',
    status: 'Rumored Q2 2026',
    notes: 'Multiple leaks describe a unified model that folds in reasoning, voice, and tool use by default. Training reportedly completed in late 2025.',
  },
  {
    name: 'Gemini 3.5',
    provider: 'Google',
    status: 'Expected 2026',
    notes: 'Google has signaled the next Gemini generation at upcoming I/O. Focus areas are deep research agents, video understanding, and multi step tool use.',
  },
  {
    name: 'Grok 4',
    provider: 'xAI',
    status: 'Announced',
    notes: "xAI has publicly targeted a next generation Grok trained on the Memphis cluster. Elon Musk has framed it as 'smarter than any human.'",
  },
  {
    name: 'Llama 5',
    provider: 'Meta',
    status: 'Rumored late 2026',
    notes: 'Meta has not confirmed timing, but internal comments suggest the next open weight Llama release will push past Llama 4 Maverick on reasoning.',
  },
];

const FAQS = [
  {
    question: 'Which AI model is the best in 2026?',
    answer:
      'There is no single best model. Claude Opus 4.7 leads on coding and agentic benchmarks and ships with a 1M context window. OpenAI o1 and o3 lead on math reasoning. Gemini 2.5 Pro leads on price-per-token at long context. The right answer depends on the workload. See our benchmark leaderboard for category winners.',
  },
  {
    question: 'Who is winning the frontier AI race?',
    answer:
      'As of April 2026, Anthropic, OpenAI, and Google DeepMind are effectively tied at the top of the frontier, with each lab leading on specific categories. xAI has closed a lot of ground with Grok 3. Meta leads the open weight race with Llama 4. Deepseek has continued to punch above its weight on efficiency.',
  },
  {
    question: 'How often do new frontier models ship?',
    answer:
      'Frontier releases now land every four to eight weeks on average. Anthropic, OpenAI, and Google each ship a major update every quarter, interspersed with point releases. Open weight launches from Meta, Mistral, and DeepSeek add to the cadence.',
  },
  {
    question: 'What is a frontier model?',
    answer:
      'A frontier model is one of the most capable AI systems publicly available at a given moment, typically defined by benchmark performance, compute used during training, and agentic capability. The frontier moves constantly as new releases ship.',
  },
  {
    question: 'Which frontier model is cheapest?',
    answer:
      'Among frontier tier models, Claude Haiku 4.5, Gemini Flash, and GPT-4o mini consistently offer the best price per token. For open weights, Llama 4 and DeepSeek V3 are close to free when you self host.',
  },
];

export default function ModelWarsPage() {
  const pricing = fallbackPricing as unknown as PricingShape;
  const benchmarksFallback = fallbackBenchmarks as unknown as BenchmarksData;

  const [models, setModels] = useState<ModelEntry[]>(() => flattenPricing(pricing));
  const [bench, setBench] = useState<BenchmarksData>(benchmarksFallback);
  const [articles, setArticles] = useState<NewsArticle[]>([]);
  const [loading, setLoading] = useState(true);
  const [lastUpdated, setLastUpdated] = useState<string>(pricing.lastUpdated);

  useEffect(() => {
    async function load() {
      const newsPromise = fetch('https://tensorfeed.ai/api/news?limit=200')
        .then((r) => (r.ok ? r.json() : null))
        .catch(() => null);
      const benchPromise = fetch('https://tensorfeed.ai/api/benchmarks')
        .then((r) => (r.ok ? r.json() : null))
        .catch(() => null);

      const [newsData, benchData] = await Promise.all([newsPromise, benchPromise]);

      if (newsData?.articles && Array.isArray(newsData.articles)) {
        const filtered = (newsData.articles as NewsArticle[])
          .filter((a) => a.source !== 'arXiv cs.AI')
          .filter(matchesModelNews)
          .slice(0, 12);
        setArticles(filtered);
      }

      if (benchData?.ok && benchData.benchmarks?.length && benchData.models?.length) {
        setBench({
          lastUpdated: benchData.lastUpdated || benchmarksFallback.lastUpdated,
          benchmarks: benchData.benchmarks,
          models: benchData.models,
        });
      }

      setLoading(false);
      setLastUpdated(
        new Date().toLocaleDateString('en-US', {
          month: 'short',
          day: 'numeric',
          year: 'numeric',
        }),
      );
    }
    load();
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // Build a leaderboard by averaging benchmark scores
  const leaderboard = useMemo(() => {
    const benchScores = new Map<string, { score: number; row: BenchmarkRow }>();
    for (const m of bench.models) {
      const vals = Object.values(m.scores);
      if (!vals.length) continue;
      const avg = vals.reduce((a, b) => a + b, 0) / vals.length;
      benchScores.set(m.model, { score: avg, row: m });
    }

    const enriched = models.map((m) => {
      const b = benchScores.get(m.name);
      return {
        ...m,
        overall: b ? b.score : 0,
      };
    });

    return enriched
      .filter((m) => m.overall > 0)
      .sort((a, b) => b.overall - a.overall);
  }, [models, bench]);

  const recentReleases = useMemo(() => {
    const now = new Date();
    const cutoff = new Date(now.getFullYear(), now.getMonth() - 3, 1);
    return models
      .map((m) => ({ ...m, releasedDate: parseReleaseDate(m.released) }))
      .filter((m) => m.releasedDate && m.releasedDate >= cutoff)
      .sort((a, b) => (b.releasedDate!.getTime() - a.releasedDate!.getTime()));
  }, [models]);

  // Winners by category
  const winners = useMemo(() => {
    function topBy(benchId: string) {
      const sorted = [...bench.models].sort(
        (a, b) => (b.scores[benchId] ?? 0) - (a.scores[benchId] ?? 0),
      );
      return sorted[0];
    }
    const topCode = topBy('swe_bench');
    const topReason = topBy('gpqa_diamond');
    const topMath = topBy('math');

    const bestContext = [...models].sort((a, b) => b.contextWindow - a.contextWindow)[0];

    const bestValue = [...models]
      .filter((m) => m.inputPrice > 0)
      .sort((a, b) => a.inputPrice + a.outputPrice - (b.inputPrice + b.outputPrice))[0];

    const openSourceProviders = new Set(['Meta', 'Mistral', 'DeepSeek']);
    const bestOpen = [...models]
      .filter((m) => openSourceProviders.has(m.provider))
      .sort((a, b) => {
        const aScore =
          bench.models.find((bm) => bm.model === a.name)?.scores.mmlu_pro ?? 0;
        const bScore =
          bench.models.find((bm) => bm.model === b.name)?.scores.mmlu_pro ?? 0;
        return bScore - aScore;
      })[0];

    return { topCode, topReason, topMath, bestContext, bestValue, bestOpen };
  }, [models, bench]);

  const winnerCards = [
    {
      label: 'Best at Coding',
      metric: 'SWE-bench',
      model: winners.topCode?.model,
      provider: winners.topCode?.provider,
      score: winners.topCode ? `${winners.topCode.scores.swe_bench?.toFixed(1)} / 100` : '',
    },
    {
      label: 'Best at Reasoning',
      metric: 'GPQA Diamond',
      model: winners.topReason?.model,
      provider: winners.topReason?.provider,
      score: winners.topReason
        ? `${winners.topReason.scores.gpqa_diamond?.toFixed(1)} / 100`
        : '',
    },
    {
      label: 'Best at Math',
      metric: 'MATH benchmark',
      model: winners.topMath?.model,
      provider: winners.topMath?.provider,
      score: winners.topMath ? `${winners.topMath.scores.math?.toFixed(1)} / 100` : '',
    },
    {
      label: 'Best Long Context',
      metric: 'Context window',
      model: winners.bestContext?.name,
      provider: winners.bestContext?.provider,
      score: winners.bestContext ? `${formatContext(winners.bestContext.contextWindow)} tokens` : '',
    },
    {
      label: 'Best Value',
      metric: 'Lowest blended price',
      model: winners.bestValue?.name,
      provider: winners.bestValue?.provider,
      score: winners.bestValue
        ? `$${winners.bestValue.inputPrice.toFixed(2)} in / $${winners.bestValue.outputPrice.toFixed(2)} out per 1M`
        : '',
    },
    {
      label: 'Best Open Source',
      metric: 'Top open weight',
      model: winners.bestOpen?.name,
      provider: winners.bestOpen?.provider,
      score: 'Open weights available',
    },
  ];

  return (
    <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <ArticleJsonLd
        title="Frontier AI Model Wars: Tracking the Race Between Claude, GPT, Gemini, and More"
        description="Real-time tracking of the frontier AI model race between Anthropic, OpenAI, Google, and every lab pushing the edge."
        datePublished="2026-04-12"
        dateModified="2026-04-12"
      />

      <p className="text-text-muted text-sm mb-4">Last Updated: April 2026</p>

      {/* Hero */}
      <div className="mb-8">
        <div className="flex items-center gap-3 mb-3">
          <div className="p-2 rounded-lg bg-accent-primary/10">
            <Swords className="w-7 h-7 text-accent-primary" />
          </div>
          <h1 className="text-3xl sm:text-4xl font-bold text-text-primary">
            The Frontier Model Wars
          </h1>
        </div>
        <p className="text-lg text-text-secondary leading-relaxed mb-6">
          Real-time tracking of the race between Anthropic, OpenAI, Google, and every lab pushing
          the edge.
        </p>

        <div className="grid grid-cols-3 gap-3 mb-6">
          <div className="bg-bg-secondary border border-border rounded-lg p-4 text-center">
            <div className="text-2xl font-bold text-accent-primary">{models.length}</div>
            <div className="text-xs text-text-muted mt-1">Active models</div>
          </div>
          <div className="bg-bg-secondary border border-border rounded-lg p-4 text-center">
            <div className="text-2xl font-bold text-accent-primary">
              {bench.benchmarks.length * bench.models.length}
            </div>
            <div className="text-xs text-text-muted mt-1">Benchmark scores</div>
          </div>
          <div className="bg-bg-secondary border border-border rounded-lg p-4 text-center">
            <div className="text-sm font-semibold text-text-primary">
              {loading ? '...' : lastUpdated}
            </div>
            <div className="text-xs text-text-muted mt-1">Last update</div>
          </div>
        </div>
      </div>

      {/* Intro editorial */}
      <section className="mb-10">
        <p className="text-text-secondary leading-relaxed mb-4">
          Every frontier AI lab is running the same race. Scale up compute, scale up data, push
          a model through pre-training, run an increasingly elaborate post-training pipeline,
          stamp a release candidate, and ship. The top of the pack has never been more
          crowded. Anthropic, OpenAI, and Google DeepMind trade the overall lead every few
          weeks. xAI has closed more ground than most people expected. Meta is running the open
          weight strategy and winning it. DeepSeek keeps proving that efficiency is a category
          of its own.
        </p>
        <p className="text-text-secondary leading-relaxed mb-4">
          This page is where we track the state of that race in public. The leaderboard updates
          daily from our benchmark pipeline. The recent releases section pulls straight from the
          pricing database and filters to anything shipped in the last ninety days. The winners
          by category read off the latest benchmark scores and pricing data. The news feed at
          the bottom filters the full TensorFeed stream for model release coverage only.
        </p>
      </section>

      {/* Leaderboard */}
      <section id="leaderboard" className="mb-12">
        <div className="flex items-center gap-2 mb-4">
          <Trophy className="w-5 h-5 text-accent-primary" />
          <h2 className="text-2xl font-bold text-text-primary">Current Frontier Leaderboard</h2>
        </div>
        <p className="text-text-secondary leading-relaxed mb-6">
          Ranked by average score across MMLU-Pro, HumanEval, GPQA Diamond, MATH, and SWE-bench.
          Models without complete benchmark coverage are omitted.
        </p>
        <div className="overflow-x-auto">
          <table className="w-full border border-border rounded-lg overflow-hidden text-sm">
            <thead className="bg-bg-tertiary">
              <tr>
                <th className="text-left p-3 text-text-primary font-semibold">Rank</th>
                <th className="text-left p-3 text-text-primary font-semibold">Model</th>
                <th className="text-left p-3 text-text-primary font-semibold">Provider</th>
                <th className="text-left p-3 text-text-primary font-semibold">Released</th>
                <th className="text-left p-3 text-text-primary font-semibold">Avg Score</th>
                <th className="text-left p-3 text-text-primary font-semibold">Pricing (in / out, per 1M)</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {leaderboard.slice(0, 15).map((m, i) => (
                <tr key={m.id} className="bg-bg-secondary">
                  <td className="p-3 text-text-muted font-mono">#{i + 1}</td>
                  <td className="p-3 text-text-primary font-semibold">{m.name}</td>
                  <td className="p-3">
                    <span
                      className={`text-xs px-2 py-0.5 rounded-full border font-medium ${
                        PROVIDER_COLORS[m.provider] || 'bg-bg-tertiary text-text-secondary border-border'
                      }`}
                    >
                      {m.provider}
                    </span>
                  </td>
                  <td className="p-3 text-text-muted">{formatReleased(m.released)}</td>
                  <td className="p-3 text-accent-primary font-mono">{m.overall.toFixed(1)}</td>
                  <td className="p-3 text-text-secondary font-mono text-xs">
                    ${m.inputPrice.toFixed(2)} / ${m.outputPrice.toFixed(2)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <p className="text-text-muted text-sm mt-3">
          Want to drill into a specific benchmark? See the full{' '}
          <Link href="/benchmarks" className="text-accent-primary hover:underline">benchmarks page</Link>.
        </p>
      </section>

      {/* Head to head */}
      <section id="head-to-head" className="mb-12">
        <h2 className="text-2xl font-bold text-text-primary mb-4">Head to Head Matchups</h2>
        <p className="text-text-secondary leading-relaxed mb-6">
          The three most searched frontier matchups, at a glance. Each card pulls live scores
          from the benchmark database.
        </p>
        <div className="grid gap-4 md:grid-cols-3">
          {['Claude Opus 4.7', 'GPT-4.5', 'Gemini 2.5 Pro'].map((name) => {
            const row = bench.models.find((m) => m.model === name);
            if (!row) return null;
            const avg =
              Object.values(row.scores).reduce((a, b) => a + b, 0) /
              Object.values(row.scores).length;
            return (
              <div key={name} className="bg-bg-secondary border border-border rounded-lg p-4">
                <div className="flex items-center justify-between mb-3">
                  <h3 className="text-text-primary font-semibold">{name}</h3>
                  <span
                    className={`text-xs px-2 py-0.5 rounded-full border font-medium ${
                      PROVIDER_COLORS[row.provider] || 'bg-bg-tertiary text-text-secondary border-border'
                    }`}
                  >
                    {row.provider}
                  </span>
                </div>
                <div className="text-3xl font-bold text-accent-primary mb-1">
                  {avg.toFixed(1)}
                </div>
                <div className="text-xs text-text-muted mb-3">Average across 5 benchmarks</div>
                <div className="space-y-1 text-xs">
                  {Object.entries(row.scores).map(([bid, score]) => {
                    const def = bench.benchmarks.find((b) => b.id === bid);
                    return (
                      <div key={bid} className="flex justify-between">
                        <span className="text-text-muted">{def?.name || bid}</span>
                        <span className="font-mono text-text-secondary">{score.toFixed(1)}</span>
                      </div>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </div>
        <p className="text-text-muted text-sm mt-3">
          Build your own matchup on the{' '}
          <Link href="/compare" className="text-accent-primary hover:underline">compare tool</Link>.
        </p>
      </section>

      {/* Recent releases timeline */}
      <section id="recent" className="mb-12">
        <div className="flex items-center gap-2 mb-4">
          <Rocket className="w-5 h-5 text-accent-primary" />
          <h2 className="text-2xl font-bold text-text-primary">Recent Releases (Last 90 Days)</h2>
        </div>
        <p className="text-text-secondary leading-relaxed mb-6">
          Every frontier model released in the last quarter, newest first. Auto-updated from
          the model database.
        </p>
        {recentReleases.length === 0 ? (
          <div className="bg-bg-secondary border border-border rounded-lg p-6 text-center text-text-muted">
            No releases in the last 90 days yet. Check back soon.
          </div>
        ) : (
          <div className="space-y-3">
            {recentReleases.map((m) => (
              <div
                key={m.id}
                className="bg-bg-secondary border border-border rounded-lg p-4 flex items-center justify-between gap-3"
              >
                <div className="flex items-center gap-3 min-w-0">
                  <span className="text-xs font-mono uppercase tracking-wider text-text-muted w-20 shrink-0">
                    {formatReleased(m.released)}
                  </span>
                  <span className="text-text-primary font-semibold truncate">{m.name}</span>
                </div>
                <span
                  className={`text-xs px-2 py-0.5 rounded-full border font-medium shrink-0 ${
                    PROVIDER_COLORS[m.provider] || 'bg-bg-tertiary text-text-secondary border-border'
                  }`}
                >
                  {m.provider}
                </span>
              </div>
            ))}
          </div>
        )}
      </section>

      {/* Winners */}
      <section id="winners" className="mb-12">
        <div className="flex items-center gap-2 mb-4">
          <Flame className="w-5 h-5 text-accent-primary" />
          <h2 className="text-2xl font-bold text-text-primary">Who Is Winning at What?</h2>
        </div>
        <p className="text-text-secondary leading-relaxed mb-6">
          Category leaders pulled live from the benchmark and pricing databases. Scores update
          daily.
        </p>
        <div className="grid gap-4 md:grid-cols-2">
          {winnerCards.map((w) => (
            <div key={w.label} className="bg-bg-secondary border border-border rounded-lg p-4">
              <div className="text-xs font-mono uppercase tracking-wider text-accent-primary mb-1">
                {w.label}
              </div>
              <div className="text-lg font-semibold text-text-primary">
                {w.model || 'No data'}
              </div>
              <div className="text-sm text-text-muted mt-1">
                {w.provider} &middot; {w.metric}
              </div>
              <div className="text-sm text-text-secondary font-mono mt-2">{w.score}</div>
            </div>
          ))}
        </div>
      </section>

      {/* Incoming */}
      <section id="incoming" className="mb-12">
        <h2 className="text-2xl font-bold text-text-primary mb-4">Incoming Models</h2>
        <p className="text-text-secondary leading-relaxed mb-6">
          What the rumor mill says is coming next. Treat everything here as unofficial unless
          linked directly to a lab announcement.
        </p>
        <div className="space-y-3">
          {RUMORED.map((r) => (
            <div key={r.name} className="bg-bg-secondary border border-border rounded-lg p-4">
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-2">
                  <span className="text-text-primary font-semibold">{r.name}</span>
                  <span
                    className={`text-xs px-2 py-0.5 rounded-full border font-medium ${
                      PROVIDER_COLORS[r.provider] || 'bg-bg-tertiary text-text-secondary border-border'
                    }`}
                  >
                    {r.provider}
                  </span>
                </div>
                <span className="text-xs font-mono text-accent-primary">{r.status}</span>
              </div>
              <p className="text-text-secondary text-sm leading-relaxed">{r.notes}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Provider spotlights */}
      <section id="spotlights" className="mb-12">
        <h2 className="text-2xl font-bold text-text-primary mb-4">Provider Spotlights</h2>
        <p className="text-text-secondary leading-relaxed mb-6">
          Each frontier lab is running a different strategy. Understanding the strategic
          posture helps predict the next move.
        </p>
        <div className="space-y-5">
          <div className="bg-bg-secondary border border-border rounded-lg p-5">
            <h3 className="text-lg font-semibold text-text-primary mb-2">Anthropic</h3>
            <p className="text-text-secondary leading-relaxed text-sm">
              Anthropic has leaned hard into agentic coding as the wedge. Claude has become the
              default model for serious developer tools, which creates a revenue base that
              funds frontier training. The company pairs this with the most aggressive public
              stance on safety of any major lab. Responsible scaling commitments, detailed model
              cards, and constitutional AI research are all part of a single story: if you
              believe the most capable models are coming soon, your commercial strategy should
              be inseparable from your safety strategy.
            </p>
          </div>
          <div className="bg-bg-secondary border border-border rounded-lg p-5">
            <h3 className="text-lg font-semibold text-text-primary mb-2">OpenAI</h3>
            <p className="text-text-secondary leading-relaxed text-sm">
              OpenAI still owns the largest consumer surface area in AI. ChatGPT is the default
              chatbot for a huge fraction of the market, which creates data, revenue, and
              distribution. The o-series reasoning models were the first public bet on test
              time compute as a primary capability lever, and the results shifted how every
              other lab thinks about reasoning. Expect continued emphasis on multimodal, voice,
              and vertical integration through Operator, Sora, and Codex.
            </p>
          </div>
          <div className="bg-bg-secondary border border-border rounded-lg p-5">
            <h3 className="text-lg font-semibold text-text-primary mb-2">Google DeepMind</h3>
            <p className="text-text-secondary leading-relaxed text-sm">
              Google has structural advantages no one else has. Custom TPU infrastructure, a
              search index, YouTube, and decades of research depth at DeepMind. Gemini has
              closed most of the capability gap and owns the long context and multimodal
              categories. The real leverage is distribution: Gemini is shipping into every
              Google surface, from Search to Workspace to Android. Every Google user becomes a
              Gemini user by default.
            </p>
          </div>
          <div className="bg-bg-secondary border border-border rounded-lg p-5">
            <h3 className="text-lg font-semibold text-text-primary mb-2">xAI</h3>
            <p className="text-text-secondary leading-relaxed text-sm">
              xAI has compressed an enormous amount of capability into a short timeline. The
              Memphis training cluster came online with unusual speed, and Grok 3 closed most
              of the gap to the frontier. Distribution through X gives xAI a feedback loop that
              other labs do not have. The open question is how long the pace can be sustained.
            </p>
          </div>
          <div className="bg-bg-secondary border border-border rounded-lg p-5">
            <h3 className="text-lg font-semibold text-text-primary mb-2">Meta</h3>
            <p className="text-text-secondary leading-relaxed text-sm">
              Meta is the single biggest reason open weight models exist at the frontier. The
              Llama family has forced every other lab to compete on value, not just capability.
              Mark Zuckerberg has framed open weights as a strategic asset, not a charity move,
              and the Llama 4 family proved that open weight models can be competitive on real
              benchmarks.
            </p>
          </div>
        </div>
      </section>

      {/* News */}
      <section id="news" className="mb-12">
        <h2 className="text-2xl font-bold text-text-primary mb-4">Latest Model Wars News</h2>
        <p className="text-text-secondary leading-relaxed mb-6">
          Live stream of model release and frontier capability coverage. Filtered from the
          full TensorFeed news feed.
        </p>
        {loading ? (
          <div className="space-y-3">
            {[0, 1, 2, 3].map((i) => (
              <div key={i} className="bg-bg-secondary border border-border rounded-lg p-4 animate-pulse">
                <div className="h-4 bg-bg-tertiary rounded w-3/4 mb-2" />
                <div className="h-3 bg-bg-tertiary rounded w-1/2" />
              </div>
            ))}
          </div>
        ) : articles.length === 0 ? (
          <div className="bg-bg-secondary border border-border rounded-lg p-6 text-center text-text-muted">
            No matching model articles in the current feed window. Browse the{' '}
            <Link href="/" className="text-accent-primary hover:underline">full feed</Link>.
          </div>
        ) : (
          <div className="space-y-3">
            {articles.map((a) => (
              <a
                key={a.id}
                href={a.url}
                target="_blank"
                rel="noopener noreferrer"
                className="block bg-bg-secondary border border-border rounded-lg p-4 hover:border-accent-primary/40 transition-colors"
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="flex-1 min-w-0">
                    <h3 className="text-text-primary font-semibold mb-1 leading-snug">
                      {a.title}
                    </h3>
                    {a.snippet && (
                      <p className="text-text-secondary text-sm leading-relaxed line-clamp-2">
                        {a.snippet}
                      </p>
                    )}
                    <div className="flex items-center gap-2 mt-2 text-xs text-text-muted">
                      <span>{a.source}</span>
                      <span>&middot;</span>
                      <span>{formatDate(a.publishedAt)}</span>
                    </div>
                  </div>
                  <ExternalLink className="w-4 h-4 text-text-muted shrink-0 mt-1" />
                </div>
              </a>
            ))}
          </div>
        )}
      </section>

      {/* FAQ */}
      <section id="faq" className="mb-12">
        <h2 className="text-2xl font-bold text-text-primary mb-6">Frequently Asked Questions</h2>
        <div className="space-y-4">
          {FAQS.map((f) => (
            <div key={f.question} className="bg-bg-secondary border border-border rounded-lg p-5">
              <h3 className="text-lg font-semibold text-text-primary mb-2">{f.question}</h3>
              <p className="text-text-secondary leading-relaxed">{f.answer}</p>
            </div>
          ))}
        </div>
      </section>

      <FAQPageJsonLd faqs={FAQS} />

      {/* CTA */}
      <section className="bg-bg-secondary border border-border rounded-lg p-6 mb-10">
        <h2 className="text-xl font-bold text-text-primary mb-2">Related Hubs</h2>
        <p className="text-text-secondary mb-4">Keep tracking the frontier from every angle.</p>
        <div className="flex flex-wrap gap-3">
          <Link href="/agi-asi" className="px-3 py-1.5 rounded-full border border-border text-sm text-text-primary hover:border-accent-primary/40">
            AGI &amp; ASI
          </Link>
          <Link href="/benchmarks" className="px-3 py-1.5 rounded-full border border-border text-sm text-text-primary hover:border-accent-primary/40">
            Benchmarks
          </Link>
          <Link href="/compare" className="px-3 py-1.5 rounded-full border border-border text-sm text-text-primary hover:border-accent-primary/40">
            Compare Models
          </Link>
          <Link href="/models" className="px-3 py-1.5 rounded-full border border-border text-sm text-text-primary hover:border-accent-primary/40">
            Model Tracker
          </Link>
          <Link href="/originals" className="px-3 py-1.5 rounded-full border border-border text-sm text-text-primary hover:border-accent-primary/40">
            Originals
          </Link>
        </div>
      </section>

      <div className="text-center">
        <Link href="/" className="text-accent-primary hover:underline text-sm">
          &larr; Back to Feed
        </Link>
      </div>
    </div>
  );
}
