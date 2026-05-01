'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { TrendingUp, TrendingDown, Minus, Sparkles, BarChart2, ExternalLink } from 'lucide-react';

interface Ranking {
  rank: number;
  model: string;
  provider: string;
  openrouterId: string;
  tokensB7d: number;
  trend: 'up' | 'down' | 'flat' | 'new';
  sharePct: number;
  notes: string;
  url: string;
}

interface Response {
  ok: boolean;
  upstream: string;
  window: string;
  lastUpdated: string;
  rankings: Ranking[];
}

const TREND_META: Record<Ranking['trend'], { icon: typeof TrendingUp; color: string; label: string }> = {
  up: { icon: TrendingUp, color: 'text-emerald-400', label: 'Up' },
  down: { icon: TrendingDown, color: 'text-rose-400', label: 'Down' },
  flat: { icon: Minus, color: 'text-text-muted', label: 'Flat' },
  new: { icon: Sparkles, color: 'text-amber-400', label: 'New' },
};

const RANK_TEXT: Record<number, string> = {
  1: 'text-yellow-400',
  2: 'text-gray-300',
  3: 'text-amber-600',
};

export default function UsageRankingsPage() {
  const [data, setData] = useState<Response | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetch('https://tensorfeed.ai/api/usage-rankings')
      .then(res => {
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        return res.json();
      })
      .then((json: Response) => setData(json))
      .catch(e => setError(e instanceof Error ? e.message : 'Failed to load'));
  }, []);

  const FAQ_JSONLD = {
    '@context': 'https://schema.org',
    '@type': 'FAQPage',
    mainEntity: [
      {
        '@type': 'Question',
        name: 'Where does the usage data come from?',
        acceptedAnswer: {
          '@type': 'Answer',
          text: 'OpenRouter\'s public rankings page. OpenRouter is a model-agnostic aggregator that routes hundreds of millions of tokens per day across every major frontier and open-weight model, so its rankings are the closest public proxy for "what model is the market actually picking." We snapshot weekly and republish in machine-readable form.',
        },
      },
      {
        '@type': 'Question',
        name: 'How is this different from /benchmarks or /attention?',
        acceptedAnswer: {
          '@type': 'Answer',
          text: 'Benchmarks measure synthetic capability. Attention measures news mentions. Usage rankings measure real production traffic. The three are complementary and often disagree: a model can win benchmarks but lose usage if it is too expensive, or trail benchmarks but win usage if it is cheap and reliable.',
        },
      },
      {
        '@type': 'Question',
        name: 'Why does Claude Sonnet 4.6 lead?',
        acceptedAnswer: {
          '@type': 'Answer',
          text: 'It is the default base model in Claude Code, Cursor Agent (when users pick Anthropic), Cline, Roo Code, and Amp, plus a heavy presence in custom LangGraph and OpenAI Agents SDK setups via OpenRouter. Strong agentic post-training and a forgiving price-per-quality ratio make it the de facto coding-agent default.',
        },
      },
    ],
  };

  return (
    <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(FAQ_JSONLD) }} />

      <div className="mb-6">
        <div className="flex items-center gap-3 mb-3">
          <div className="p-2 rounded-lg bg-accent-primary/10">
            <BarChart2 className="w-7 h-7 text-accent-primary" />
          </div>
          <h1 className="text-3xl sm:text-4xl font-bold text-text-primary">AI Usage Rankings</h1>
        </div>
        <p className="text-text-secondary text-lg max-w-3xl">
          What AI models are actually being used in production. Sourced from OpenRouter, the model-agnostic aggregator handling hundreds of millions of tokens per day. The market signal beneath the leaderboard noise. {data?.lastUpdated && `Updated ${data.lastUpdated}, rolling 7-day window.`}
        </p>
      </div>

      {error && (
        <div className="bg-rose-500/10 border border-rose-500/20 rounded-lg p-4 text-rose-400 text-sm mb-6">
          Error loading data: {error}
        </div>
      )}

      {data && (
        <div className="space-y-2 mb-10">
          {data.rankings.map(r => {
            const TrendIcon = TREND_META[r.trend].icon;
            return (
              <div key={r.openrouterId} className="bg-bg-secondary border border-border rounded-lg p-3 hover:border-accent-primary/50 transition-colors">
                <div className="flex items-center gap-3 flex-wrap">
                  <span className={`font-bold text-lg ${RANK_TEXT[r.rank] || 'text-text-muted'} font-mono w-8 shrink-0 text-right`}>
                    #{r.rank}
                  </span>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <a href={r.url} target="_blank" rel="noopener noreferrer" className="font-semibold text-text-primary hover:text-accent-primary inline-flex items-center gap-1">
                        {r.model} <ExternalLink className="w-3 h-3 text-text-muted" />
                      </a>
                      <span className="text-xs text-text-muted">{r.provider}</span>
                    </div>
                    <div className="text-xs text-text-secondary mt-0.5">{r.notes}</div>
                  </div>
                  <div className="text-right">
                    <div className="font-mono text-text-primary font-semibold">{r.tokensB7d}B</div>
                    <div className="text-xs text-text-muted">7d tokens</div>
                  </div>
                  <div className="text-right w-16">
                    <div className="font-mono text-text-primary text-sm">{r.sharePct}%</div>
                    <div className="text-xs text-text-muted">share</div>
                  </div>
                  <div className={`flex items-center gap-1 text-xs ${TREND_META[r.trend].color} w-12`}>
                    <TrendIcon className="w-3 h-3" />
                    {TREND_META[r.trend].label}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      <div className="bg-bg-secondary border border-border rounded-lg p-4 text-sm text-text-secondary">
        <p>
          For agents: same data at{' '}
          <Link href="/api-reference/usage-rankings" className="text-accent-primary hover:underline font-mono">/api/usage-rankings</Link>
          . Free, no auth, cached 30 min.
        </p>
        <p className="text-xs text-text-muted mt-2">
          Source: {data?.upstream || 'OpenRouter public rankings'}. We aggregate; we do not measure traffic ourselves.
        </p>
      </div>
    </div>
  );
}
