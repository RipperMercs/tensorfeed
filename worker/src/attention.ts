/**
 * AI Attention Index
 *
 * Derived per-provider score combining four signals we already collect:
 *   1. News article volume mentioning the provider in the last 24h (high weight)
 *   2. News article volume in the last 7d (medium weight)
 *   3. GitHub trending repos whose name or description matches the provider
 *      (medium weight)
 *   4. Bot/agent traffic to provider-related endpoints (low weight)
 *
 * The score is normalized to 0-100 within the response so the leaderboard
 * is always comparable. Absolute counts per signal are returned alongside
 * for transparency. We do not persist the score; recompute on demand from
 * the existing KV-cached free endpoints to stay inside the KV budget.
 */

export interface ProviderConfig {
  id: string;
  name: string;
  matchTerms: string[];
}

export const TRACKED_PROVIDERS: ProviderConfig[] = [
  { id: 'anthropic', name: 'Anthropic', matchTerms: ['anthropic', 'claude'] },
  { id: 'openai', name: 'OpenAI', matchTerms: ['openai', 'chatgpt', 'gpt-4', 'gpt-5', 'gpt5', 'o1 ', 'o3 ', 'sora', 'codex'] },
  { id: 'google', name: 'Google', matchTerms: ['google ai', 'gemini', 'deepmind', 'bard', 'vertex'] },
  { id: 'meta', name: 'Meta', matchTerms: ['meta ai', 'llama'] },
  { id: 'mistral', name: 'Mistral', matchTerms: ['mistral'] },
  { id: 'cohere', name: 'Cohere', matchTerms: ['cohere', 'command r'] },
  { id: 'deepseek', name: 'DeepSeek', matchTerms: ['deepseek'] },
  { id: 'xai', name: 'xAI', matchTerms: ['xai', 'grok'] },
  { id: 'perplexity', name: 'Perplexity', matchTerms: ['perplexity'] },
  { id: 'nvidia', name: 'NVIDIA', matchTerms: ['nvidia', 'cuda'] },
  { id: 'huggingface', name: 'Hugging Face', matchTerms: ['hugging face', 'huggingface'] },
  { id: 'cursor', name: 'Cursor', matchTerms: ['cursor ', 'anysphere'] },
];

interface NewsArticle {
  id?: string;
  title?: string;
  snippet?: string;
  source?: string;
  sourceDomain?: string;
  publishedAt?: string;
  categories?: string[];
}

interface TrendingRepo {
  full_name?: string;
  name?: string;
  description?: string;
}

interface AgentActivity {
  recent?: { endpoint?: string }[];
  today_count?: number;
}

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

const WEIGHTS = {
  NEWS_24H: 4.0,
  NEWS_7D: 1.0,
  TRENDING_REPO: 2.0,
  AGENT_HIT: 0.05,
};

function matchesAny(haystack: string, terms: string[]): boolean {
  const h = haystack.toLowerCase();
  return terms.some(t => h.includes(t.toLowerCase()));
}

function hoursSince(iso: string | undefined, now: number): number {
  if (!iso) return Infinity;
  const t = Date.parse(iso);
  if (isNaN(t)) return Infinity;
  return (now - t) / 3_600_000;
}

export interface AttentionResponse {
  computed_at: string;
  window: { recent_hours: number; full_hours: number };
  weights: typeof WEIGHTS;
  providers: ProviderSignal[];
}

/**
 * Compute the attention index from the three input streams.
 *
 * @param articles  Latest aggregated news articles (from /api/news cache)
 * @param trending  GitHub trending repos (from /api/trending-repos cache)
 * @param activity  Agent activity (from /api/agents/activity cache)
 */
export function computeAttention(
  articles: NewsArticle[],
  trending: TrendingRepo[],
  activity: AgentActivity | null,
): AttentionResponse {
  const now = Date.now();

  const signals: ProviderSignal[] = TRACKED_PROVIDERS.map(p => {
    const articleMatches = articles.filter(a => {
      const text = `${a.title || ''} ${a.snippet || ''} ${(a.categories || []).join(' ')} ${a.source || ''}`;
      return matchesAny(text, p.matchTerms);
    });
    const news_24h = articleMatches.filter(a => hoursSince(a.publishedAt, now) <= 24).length;
    const news_7d = articleMatches.filter(a => hoursSince(a.publishedAt, now) <= 168).length;

    const trendingMatches = trending.filter(r => {
      const text = `${r.full_name || ''} ${r.name || ''} ${r.description || ''}`;
      return matchesAny(text, p.matchTerms);
    });

    let agent_hits = 0;
    if (activity?.recent) {
      for (const hit of activity.recent) {
        const ep = (hit.endpoint || '').toLowerCase();
        if (matchesAny(ep, p.matchTerms)) agent_hits += 1;
      }
    }

    const raw_score =
      news_24h * WEIGHTS.NEWS_24H +
      news_7d * WEIGHTS.NEWS_7D +
      trendingMatches.length * WEIGHTS.TRENDING_REPO +
      agent_hits * WEIGHTS.AGENT_HIT;

    const top_articles = articleMatches
      .filter(a => hoursSince(a.publishedAt, now) <= 168)
      .sort((a, b) => Date.parse(b.publishedAt || '') - Date.parse(a.publishedAt || ''))
      .slice(0, 3)
      .map(a => ({
        title: (a.title || '').slice(0, 200),
        source: a.source || '',
        published_at: a.publishedAt,
      }));

    return {
      id: p.id,
      name: p.name,
      news_24h,
      news_7d,
      trending_repos: trendingMatches.length,
      agent_hits,
      raw_score,
      attention_score: 0,
      rank: 0,
      top_articles,
    };
  });

  // Normalize to 0-100 and rank
  const maxRaw = Math.max(1, ...signals.map(s => s.raw_score));
  signals.forEach(s => {
    s.attention_score = Math.round((s.raw_score / maxRaw) * 1000) / 10;
  });
  signals.sort((a, b) => b.attention_score - a.attention_score);
  signals.forEach((s, i) => {
    s.rank = i + 1;
  });

  return {
    computed_at: new Date().toISOString(),
    window: { recent_hours: 24, full_hours: 168 },
    weights: WEIGHTS,
    providers: signals,
  };
}
