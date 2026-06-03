import { describe, expect, it } from 'vitest';
import { computeAttention, TRACKED_PROVIDERS } from './attention';

// computeAttention is the pure scoring core behind /api/attention and
// /api/attention/history. It publishes every provider's attention_score and
// rank, so a silent regression in the weight math, the maxRaw guard, the
// normalization rounding, or the sort/rank would change published numbers with
// nothing to catch it. Only computed_at depends on the clock; the score, the
// normalization, and the ranking are deterministic for fixed inputs.
//
// Weights (from attention.ts): NEWS_24H 4, NEWS_7D 1, TRENDING_REPO 2,
// AGENT_HIT 0.05. news_7d counts everything within 168h, so a recent article
// counts in BOTH news_24h and news_7d.

function hoursAgo(h: number): string {
  return new Date(Date.now() - h * 3_600_000).toISOString();
}

describe('computeAttention', () => {
  it('empty inputs: every provider present, all scores 0, no NaN (maxRaw guard)', () => {
    const res = computeAttention([], [], null);
    expect(res.providers).toHaveLength(TRACKED_PROVIDERS.length);
    for (const p of res.providers) {
      expect(p.raw_score).toBe(0);
      expect(p.attention_score).toBe(0); // Math.max(1, ...) prevents 0/0 = NaN
      expect(Number.isFinite(p.attention_score)).toBe(true);
      expect(p.news_24h).toBe(0);
      expect(p.news_7d).toBe(0);
      expect(p.trending_repos).toBe(0);
      expect(p.agent_hits).toBe(0);
    }
    expect(res.window).toEqual({ recent_hours: 24, full_hours: 168 });
  });

  it('weights a recent article and normalizes the top provider to exactly 100', () => {
    // One Anthropic article 2h ago: counts in news_24h and news_7d.
    // raw = 1*4 + 1*1 = 5, the only nonzero signal, so it is the max.
    const articles = [{ title: 'Claude Opus ships', publishedAt: hoursAgo(2) }];
    const res = computeAttention(articles, [], null);
    const anthropic = res.providers.find(p => p.id === 'anthropic')!;
    expect(anthropic.news_24h).toBe(1);
    expect(anthropic.news_7d).toBe(1);
    expect(anthropic.raw_score).toBe(5);
    expect(anthropic.attention_score).toBe(100);
    expect(anthropic.rank).toBe(1);
    const openai = res.providers.find(p => p.id === 'openai')!;
    expect(openai.raw_score).toBe(0);
    expect(openai.attention_score).toBe(0);
  });

  it('ranks 1-based by attention_score descending with proportional normalization', () => {
    // Anthropic: 2 recent articles (raw = 2*4 + 2*1 = 10).
    // OpenAI: 1 recent article (raw = 1*4 + 1*1 = 5).
    const articles = [
      { title: 'Claude news one', publishedAt: hoursAgo(1) },
      { title: 'Anthropic news two', publishedAt: hoursAgo(3) },
      { title: 'OpenAI ChatGPT update', publishedAt: hoursAgo(2) },
    ];
    const res = computeAttention(articles, [], null);
    const anthropic = res.providers.find(p => p.id === 'anthropic')!;
    const openai = res.providers.find(p => p.id === 'openai')!;
    expect(anthropic.raw_score).toBe(10);
    expect(openai.raw_score).toBe(5);
    expect(anthropic.attention_score).toBe(100); // top
    expect(openai.attention_score).toBe(50); // 5/10 -> 50.0
    expect(anthropic.rank).toBe(1);
    expect(openai.rank).toBe(2);
    expect(res.providers[0].rank).toBe(1);
    // ranks are exactly 1..N, one per provider
    const ranks = res.providers.map(p => p.rank).sort((a, b) => a - b);
    expect(ranks).toEqual(res.providers.map((_, i) => i + 1));
  });

  it('matches case-insensitively across title, snippet, categories, source; counts repos and agent hits', () => {
    const articles = [
      { title: 'GEMINI 2 launch', publishedAt: hoursAgo(2) }, // via title
      { snippet: 'powered by Gemini', publishedAt: hoursAgo(2) }, // via snippet
      { title: 'roundup', categories: ['DeepMind'], publishedAt: hoursAgo(2) }, // via categories
      { title: 'roundup2', source: 'Google AI Blog', publishedAt: hoursAgo(2) }, // via source
    ];
    const trending = [{ full_name: 'google/gemma', description: 'Gemini sibling' }];
    const activity = { recent: [{ endpoint: '/api/x-gemini' }, { endpoint: '/no-match' }] };
    const res = computeAttention(articles, trending, activity);
    const google = res.providers.find(p => p.id === 'google')!;
    expect(google.news_24h).toBe(4);
    expect(google.news_7d).toBe(4);
    expect(google.trending_repos).toBe(1);
    expect(google.agent_hits).toBe(1);
    // raw = 4*4 + 4*1 + 1*2 + 1*0.05 = 22.05
    expect(google.raw_score).toBeCloseTo(22.05, 5);
  });
});
