/**
 * Pure-logic unit tests for the premium news search module.
 *
 * KV stubbed in-memory. Covers tokenization, scoring, filters,
 * date-range validation, no-query browse mode, and edge cases.
 */

import { describe, it, expect } from 'vitest';
import { searchNews } from './news-search';
import type { Env } from './types';

interface MockKV {
  get: (key: string, type?: string) => Promise<unknown>;
  put: () => Promise<void>;
  delete: () => Promise<void>;
  list: () => Promise<{ keys: { name: string }[] }>;
}

function makeKV(initial: Record<string, unknown>): MockKV {
  const store = new Map<string, unknown>(Object.entries(initial));
  return {
    get: async (key: string) => store.get(key) ?? null,
    put: async () => undefined,
    delete: async () => undefined,
    list: async () => ({ keys: [] }),
  };
}

function makeEnv(articles: unknown[]): Env {
  const news = makeKV({ articles });
  return {
    TENSORFEED_NEWS: news as unknown as KVNamespace,
    TENSORFEED_STATUS: makeKV({}) as unknown as KVNamespace,
    TENSORFEED_CACHE: makeKV({}) as unknown as KVNamespace,
    ENVIRONMENT: 'test',
    SITE_URL: 'https://tensorfeed.ai',
    INDEXNOW_KEY: '',
    X_API_KEY: '',
    X_API_SECRET: '',
    X_ACCESS_TOKEN: '',
    X_ACCESS_SECRET: '',
    GITHUB_TOKEN: '',
    RESEND_API_KEY: '',
    ALERT_EMAIL_TO: '',
    ALERT_EMAIL_FROM: '',
    PAYMENT_WALLET: '0x0',
    PAYMENT_ENABLED: 'true',
  };
}

const SAMPLE = [
  {
    id: '1',
    title: 'Anthropic ships Claude Opus 4.7 with 1M context',
    url: 'https://anthropic.com/opus-4-7',
    source: 'Anthropic Blog',
    sourceDomain: 'anthropic.com',
    snippet: 'New flagship model with extended context window and improved reasoning.',
    categories: ['Anthropic', 'Models'],
    publishedAt: '2026-04-27T12:00:00Z',
    fetchedAt: '2026-04-27T12:30:00Z',
  },
  {
    id: '2',
    title: 'OpenAI announces GPT-5.5 pricing',
    url: 'https://openai.com/gpt-5-5',
    source: 'OpenAI Blog',
    sourceDomain: 'openai.com',
    snippet: 'Cheaper inputs and improved tool-use performance.',
    categories: ['OpenAI', 'Pricing'],
    publishedAt: '2026-04-25T12:00:00Z',
    fetchedAt: '2026-04-25T12:30:00Z',
  },
  {
    id: '3',
    title: 'Hacker News debate on agentic payment rails',
    url: 'https://news.ycombinator.com/item?id=999',
    source: 'Hacker News',
    sourceDomain: 'news.ycombinator.com',
    snippet: 'Discussion of x402, USDC, and AI agent payments.',
    categories: ['Community'],
    publishedAt: '2026-04-20T12:00:00Z',
    fetchedAt: '2026-04-20T12:30:00Z',
  },
  {
    id: '4',
    title: 'Anthropic publishes responsible scaling policy update',
    url: 'https://anthropic.com/rsp',
    source: 'Anthropic Blog',
    sourceDomain: 'anthropic.com',
    snippet: 'New thresholds for AI safety evaluations.',
    categories: ['Anthropic', 'Policy & Safety'],
    publishedAt: '2026-03-15T12:00:00Z',
    fetchedAt: '2026-03-15T12:30:00Z',
  },
];

describe('searchNews: query mode', () => {
  it('finds articles matching a single term and ranks by relevance', async () => {
    const env = makeEnv(SAMPLE);
    const r = await searchNews(env, { q: 'opus' });
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    expect(r.matched).toBe(1);
    expect(r.results[0].title).toContain('Opus');
    expect(r.results[0].matched_terms).toContain('opus');
  });

  it('finds articles matching multiple terms across title and snippet', async () => {
    const env = makeEnv(SAMPLE);
    const r = await searchNews(env, { q: 'agent payment' });
    if (!r.ok) return;
    expect(r.matched).toBeGreaterThan(0);
    expect(r.results[0].title).toContain('agentic payment');
  });

  it('strips stop words and short tokens from the query', async () => {
    const env = makeEnv(SAMPLE);
    const r = await searchNews(env, { q: 'the and of opus' });
    if (!r.ok) return;
    expect(r.matched).toBe(1);
    expect(r.results[0].matched_terms).toEqual(['opus']);
  });

  it('returns empty results when no terms match', async () => {
    const env = makeEnv(SAMPLE);
    const r = await searchNews(env, { q: 'unicorn quantum elephant' });
    if (!r.ok) return;
    expect(r.matched).toBe(0);
    expect(r.results).toHaveLength(0);
  });

  it('boosts more recent articles when relevance is otherwise equal', async () => {
    const env = makeEnv(SAMPLE);
    // Both Anthropic articles have "anthropic" in source. The newer one (Opus 4.7)
    // should rank above the older (RSP update) due to recency boost.
    const r = await searchNews(env, { q: 'anthropic' });
    if (!r.ok) return;
    expect(r.results[0].published_at > r.results[1].published_at).toBe(true);
  });
});

describe('searchNews: filters', () => {
  it('filters by date range (inclusive)', async () => {
    const env = makeEnv(SAMPLE);
    const r = await searchNews(env, { from: '2026-04-01', to: '2026-04-30' });
    if (!r.ok) return;
    expect(r.matched).toBe(3); // excludes the March 15 article
    for (const a of r.results) {
      expect(a.published_at >= '2026-04-01').toBe(true);
      expect(a.published_at <= '2026-04-30T23:59:59Z').toBe(true);
    }
  });

  it('filters by provider (matches source name and domain)', async () => {
    const env = makeEnv(SAMPLE);
    const r = await searchNews(env, { provider: 'anthropic' });
    if (!r.ok) return;
    expect(r.matched).toBe(2);
    expect(r.results.every(a => a.source_domain === 'anthropic.com')).toBe(true);
  });

  it('filters by category (substring match)', async () => {
    const env = makeEnv(SAMPLE);
    const r = await searchNews(env, { category: 'Pricing' });
    if (!r.ok) return;
    expect(r.matched).toBe(1);
    expect(r.results[0].categories).toContain('Pricing');
  });

  it('combines query + provider + date filters', async () => {
    const env = makeEnv(SAMPLE);
    const r = await searchNews(env, {
      q: 'opus',
      provider: 'anthropic',
      from: '2026-04-01',
      to: '2026-04-30',
    });
    if (!r.ok) return;
    expect(r.matched).toBe(1);
  });
});

describe('searchNews: no-query browse mode', () => {
  it('returns articles in publishedAt desc when no query is given', async () => {
    const env = makeEnv(SAMPLE);
    const r = await searchNews(env, {});
    if (!r.ok) return;
    expect(r.results.map(a => a.published_at)).toEqual([
      '2026-04-27T12:00:00Z',
      '2026-04-25T12:00:00Z',
      '2026-04-20T12:00:00Z',
      '2026-03-15T12:00:00Z',
    ]);
    expect(r.results[0].relevance).toBe(1);
    expect(r.results[0].matched_terms).toEqual([]);
  });

  it('respects limit', async () => {
    const env = makeEnv(SAMPLE);
    const r = await searchNews(env, { limit: 2 });
    if (!r.ok) return;
    expect(r.returned).toBe(2);
    expect(r.matched).toBe(4);
  });

  it('caps limit at 100', async () => {
    const env = makeEnv(SAMPLE);
    const r = await searchNews(env, { limit: 999 });
    if (!r.ok) return;
    expect(r.returned).toBe(SAMPLE.length);
  });
});

describe('searchNews: validation', () => {
  it('rejects malformed from-date', async () => {
    const env = makeEnv(SAMPLE);
    const r = await searchNews(env, { from: 'yesterday' });
    expect(r.ok).toBe(false);
    if (r.ok) return;
    expect(r.error).toBe('invalid_from_date_format');
  });

  it('rejects from > to', async () => {
    const env = makeEnv(SAMPLE);
    const r = await searchNews(env, { from: '2026-04-30', to: '2026-04-01' });
    expect(r.ok).toBe(false);
    if (r.ok) return;
    expect(r.error).toBe('from_after_to');
  });

  it('handles empty corpus gracefully', async () => {
    const env = makeEnv([]);
    const r = await searchNews(env, { q: 'opus' });
    if (!r.ok) return;
    expect(r.total_corpus).toBe(0);
    expect(r.matched).toBe(0);
    expect(r.results).toHaveLength(0);
  });
});
