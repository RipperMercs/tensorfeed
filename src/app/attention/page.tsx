'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { Activity, TrendingUp, RefreshCw } from 'lucide-react';

interface ProviderSignal {
  id: string;
  name: string;
  news_24h: number;
  news_7d: number;
  trending_repos: number;
  agent_hits: number;
  raw_score: number;
  attention_score: number;
  rank: number;
  top_articles: { title: string; source: string; published_at?: string }[];
}

interface AttentionResponse {
  ok: boolean;
  computed_at: string;
  window: { recent_hours: number; full_hours: number };
  weights: Record<string, number>;
  providers: ProviderSignal[];
}

const RANK_STYLES: Record<number, string> = {
  1: 'bg-yellow-500/5 border-l-2 border-l-yellow-400',
  2: 'bg-gray-400/5 border-l-2 border-l-gray-300',
  3: 'bg-amber-600/5 border-l-2 border-l-amber-600',
};

const RANK_TEXT: Record<number, string> = {
  1: 'text-yellow-400',
  2: 'text-gray-300',
  3: 'text-amber-600',
};

function timeAgo(iso?: string): string {
  if (!iso) return '';
  const now = Date.now();
  const t = Date.parse(iso);
  if (isNaN(t)) return '';
  const m = Math.floor((now - t) / 60_000);
  if (m < 1) return 'just now';
  if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h ago`;
  return `${Math.floor(h / 24)}d ago`;
}

export default function AttentionPage() {
  const [data, setData] = useState<AttentionResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  async function load() {
    setLoading(true);
    try {
      const res = await fetch('https://tensorfeed.ai/api/attention');
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const json = (await res.json()) as AttentionResponse;
      setData(json);
      setError(null);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to load');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
    const t = setInterval(load, 60_000);
    return () => clearInterval(t);
  }, []);

  const PAGE_JSONLD = {
    '@context': 'https://schema.org',
    '@type': 'Dataset',
    name: 'TensorFeed AI Attention Index',
    description:
      'Live per-provider attention score derived from news article volume, GitHub trending repos, and agent traffic. Updated every 5 minutes.',
    url: 'https://tensorfeed.ai/attention',
    keywords: 'AI hype index, AI attention, provider sentiment, Anthropic, OpenAI, Google, attention score',
    creator: { '@type': 'Organization', name: 'TensorFeed.ai', url: 'https://tensorfeed.ai' },
    license: 'https://tensorfeed.ai/terms',
  };

  const FAQ_JSONLD = {
    '@context': 'https://schema.org',
    '@type': 'FAQPage',
    mainEntity: [
      {
        '@type': 'Question',
        name: 'What is the AI Attention Index?',
        acceptedAnswer: {
          '@type': 'Answer',
          text: 'A derived 0-100 score per major AI provider that combines four real-time signals we already collect: news article volume mentioning the provider in the last 24h (high weight), 7d (medium weight), GitHub trending repos that match the provider (medium weight), and bot/agent traffic to provider-related endpoints (low weight). The score is normalized within each response so the leaderboard is always comparable.',
        },
      },
      {
        '@type': 'Question',
        name: 'How is the score computed?',
        acceptedAnswer: {
          '@type': 'Answer',
          text: 'Sum of weighted signals: news_24h * 4.0 + news_7d * 1.0 + trending_repos * 2.0 + agent_hits * 0.05. Then normalize so the highest-attention provider in the response is 100.0 and the others scale relative to it. We do not persist the score; we recompute it on every request from the existing free endpoints, cached 5 minutes via Cloudflare Cache API.',
        },
      },
      {
        '@type': 'Question',
        name: 'Is the AI Attention Index available as an API?',
        acceptedAnswer: {
          '@type': 'Answer',
          text: 'Yes. /api/attention returns the same JSON powering this page. Free, no auth, cached 5 minutes. Each provider object includes the raw signal counts so you can apply your own weighting if our defaults do not suit your use case.',
        },
      },
    ],
  };

  return (
    <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(PAGE_JSONLD) }} />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(FAQ_JSONLD) }} />

      <div className="mb-6">
        <div className="flex items-center gap-3 mb-3">
          <div className="p-2 rounded-lg bg-accent-primary/10">
            <Activity className="w-7 h-7 text-accent-primary" />
          </div>
          <h1 className="text-3xl sm:text-4xl font-bold text-text-primary">AI Attention Index</h1>
        </div>
        <p className="text-text-secondary text-lg max-w-3xl">
          Live attention score per AI provider, derived from news volume, GitHub trending, and agent traffic on TensorFeed. Higher score means more mentions, more trending repos, more inbound agent traffic. The signal beneath the noise.
        </p>
      </div>

      {/* Methodology */}
      <details className="mb-6 bg-bg-secondary border border-border rounded-lg p-4">
        <summary className="text-sm font-semibold text-text-primary cursor-pointer">How is this computed?</summary>
        <div className="mt-3 text-sm text-text-secondary space-y-2 leading-relaxed">
          <p>
            We sum four weighted signals per provider, then normalize the highest in the response to 100:
          </p>
          <ul className="list-disc list-inside space-y-1 ml-2">
            <li><span className="font-mono text-text-primary">news_24h * 4.0</span> — articles mentioning the provider in the last 24 hours</li>
            <li><span className="font-mono text-text-primary">news_7d * 1.0</span> — articles in the last 7 days</li>
            <li><span className="font-mono text-text-primary">trending_repos * 2.0</span> — currently trending GitHub repos matching the provider</li>
            <li><span className="font-mono text-text-primary">agent_hits * 0.05</span> — bot/agent hits to provider-related TensorFeed endpoints</li>
          </ul>
          <p>
            We do not persist the score. We recompute on every request from the free endpoints (<code className="font-mono">/api/news</code>, <code className="font-mono">/api/trending-repos</code>, <code className="font-mono">/api/agents/activity</code>) and cache for 5 minutes. Same data is served as JSON at{' '}
            <Link href="/api/attention" className="text-accent-primary hover:underline font-mono">/api/attention</Link>.
          </p>
        </div>
      </details>

      {/* Refresh button */}
      <div className="flex items-center gap-3 mb-4 text-sm">
        <button
          onClick={load}
          disabled={loading}
          className="px-3 py-1.5 text-xs text-text-secondary hover:text-accent-primary border border-border rounded hover:border-accent-primary transition-colors flex items-center gap-1.5 disabled:opacity-50"
        >
          <RefreshCw className={`w-3 h-3 ${loading ? 'animate-spin' : ''}`} />
          {loading ? 'Refreshing' : 'Refresh'}
        </button>
        {data && (
          <span className="text-xs text-text-muted">
            Updated {timeAgo(data.computed_at)}
          </span>
        )}
      </div>

      {error && (
        <div className="bg-rose-500/10 border border-rose-500/20 rounded-lg p-4 text-rose-400 text-sm mb-6">
          Error loading data: {error}
        </div>
      )}

      {/* Leaderboard */}
      {data ? (
        <div className="space-y-3 mb-10">
          {data.providers.map(p => (
            <div
              key={p.id}
              className={`bg-bg-secondary border border-border rounded-lg p-4 ${RANK_STYLES[p.rank] || ''}`}
            >
              <div className="flex items-start justify-between gap-3 flex-wrap">
                <div className="flex items-center gap-3 min-w-0">
                  <span className={`font-bold text-lg ${RANK_TEXT[p.rank] || 'text-text-muted'} font-mono w-8 shrink-0`}>
                    #{p.rank}
                  </span>
                  <div>
                    <div className="font-semibold text-text-primary text-lg">{p.name}</div>
                    <div className="text-xs text-text-muted flex items-center gap-3 mt-0.5 flex-wrap">
                      <span><span className="font-mono text-text-secondary">{p.news_24h}</span> news/24h</span>
                      <span><span className="font-mono text-text-secondary">{p.news_7d}</span> news/7d</span>
                      <span><span className="font-mono text-text-secondary">{p.trending_repos}</span> trending repos</span>
                      <span><span className="font-mono text-text-secondary">{p.agent_hits}</span> agent hits</span>
                    </div>
                  </div>
                </div>
                <div className="text-right">
                  <div className="text-2xl font-bold font-mono text-text-primary">
                    {p.attention_score.toFixed(1)}
                  </div>
                  <div className="text-xs text-text-muted flex items-center gap-1 justify-end">
                    <TrendingUp className="w-3 h-3" />
                    attention
                  </div>
                </div>
              </div>

              {p.top_articles.length > 0 && (
                <div className="mt-3 pt-3 border-t border-border/50 space-y-1">
                  {p.top_articles.map((a, i) => (
                    <div key={i} className="text-xs text-text-secondary truncate">
                      <span className="text-text-muted mr-1">·</span>
                      {a.title}{' '}
                      <span className="text-text-muted">— {a.source}{a.published_at && `, ${timeAgo(a.published_at)}`}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          ))}
        </div>
      ) : (
        !error && <div className="text-text-muted text-sm">Loading...</div>
      )}

      {/* Footer note */}
      <div className="bg-bg-secondary border border-border rounded-lg p-4 text-sm text-text-secondary">
        <p>
          For agents: the same payload is at{' '}
          <Link href="/api-reference/attention" className="text-accent-primary hover:underline font-mono">/api/attention</Link>
          . Free, no auth, cached 5 minutes. Includes raw signal counts so you can apply your own weighting.
        </p>
      </div>
    </div>
  );
}
