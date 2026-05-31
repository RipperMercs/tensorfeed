/**
 * Pure-logic unit tests for premium enriched agents directory.
 *
 * KV is stubbed in-memory. Covers provider-to-service matching, news
 * matching, agent traffic attribution by bot signature, flagship pricing
 * lookup, trending score weighting, filters, and sort orders.
 */

import { describe, it, expect } from 'vitest';
import { getEnrichedDirectory, computeTrendingScore } from './agents-enriched';
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

function makeEnv(opts: {
  directory?: unknown;
  services?: unknown;
  articles?: unknown;
  pricing?: unknown;
}): Env {
  const cache = makeKV({
    ...(opts.directory !== undefined ? { 'agents-directory': opts.directory } : {}),
    ...(opts.pricing !== undefined ? { models: opts.pricing } : {}),
  });
  const status = makeKV(opts.services !== undefined ? { services: opts.services } : {});
  const news = makeKV(opts.articles !== undefined ? { articles: opts.articles } : {});

  return {
    TENSORFEED_NEWS: news as unknown as KVNamespace,
    TENSORFEED_STATUS: status as unknown as KVNamespace,
    TENSORFEED_CACHE: cache as unknown as KVNamespace,
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

// ── Sample fixtures ─────────────────────────────────────────────────

const DIRECTORY = {
  lastUpdated: '2026-04-27',
  agents: [
    {
      id: 'claude-code',
      name: 'Claude Code',
      provider: 'Anthropic',
      category: 'coding',
      description: 'Agentic CLI for code',
      url: 'https://docs.anthropic.com/en/docs/claude-code',
      capabilities: ['coding', 'tool-use'],
      openSource: false,
    },
    {
      id: 'continue-dev',
      name: 'Continue',
      provider: 'Continue Dev',
      category: 'coding',
      description: 'Open source coding assistant',
      url: 'https://continue.dev',
      capabilities: ['coding'],
      openSource: true,
    },
    {
      id: 'chatgpt',
      name: 'ChatGPT',
      provider: 'OpenAI',
      category: 'general',
      description: 'General assistant',
      url: 'https://chat.openai.com',
      capabilities: ['general'],
      openSource: false,
    },
  ],
};

const SERVICES = [
  { name: 'Anthropic', provider: 'anthropic', status: 'operational', statusPageUrl: 'https://status.anthropic.com', lastChecked: '2026-04-27T18:00:00Z' },
  { name: 'OpenAI', provider: 'openai', status: 'degraded', statusPageUrl: 'https://status.openai.com', lastChecked: '2026-04-27T18:00:00Z' },
];

const ARTICLES = [
  { id: '1', title: 'Anthropic ships Opus 4.7', url: 'https://x', source: 'Anthropic Blog', sourceDomain: 'anthropic.com', snippet: '', publishedAt: '2026-04-27T12:00:00Z' },
  { id: '2', title: 'OpenAI releases GPT-5.5', url: 'https://y', source: 'OpenAI Blog', sourceDomain: 'openai.com', snippet: '', publishedAt: '2026-04-26T12:00:00Z' },
  { id: '3', title: 'Hacker News thread on Anthropic SDK', url: 'https://z', source: 'Hacker News', sourceDomain: 'news.ycombinator.com', snippet: '', publishedAt: '2026-04-25T12:00:00Z' },
];

const PRICING = {
  providers: [
    { id: 'anthropic', name: 'Anthropic', models: [
      { id: 'opus-4-7', name: 'Claude Opus 4.7', inputPrice: 15, outputPrice: 75, tier: 'flagship' },
    ] },
    { id: 'openai', name: 'OpenAI', models: [
      { id: 'gpt-5-5', name: 'GPT-5.5', inputPrice: 10, outputPrice: 30, tier: 'flagship' },
    ] },
  ],
};

// ── computeTrendingScore ────────────────────────────────────────────

describe('computeTrendingScore', () => {
  it('weights news mentions, agent activity, and live status', () => {
    // 5 news = 15, 0 traffic, operational = +10, total 25
    expect(computeTrendingScore(5, 0, 'operational')).toBe(25);
    // 0 news, 30 traffic, operational = 30 + 10
    expect(computeTrendingScore(0, 30, 'operational')).toBe(40);
    // News and traffic capped
    expect(computeTrendingScore(50, 100, 'operational')).toBe(100);
    // Down service docks status boost
    expect(computeTrendingScore(0, 0, 'down')).toBe(0);
  });
});

// ── getEnrichedDirectory ─────────────────────────────────────────────

describe('getEnrichedDirectory', () => {
  it('joins directory with status, news, and pricing', async () => {
    const env = makeEnv({
      directory: DIRECTORY,
      services: SERVICES,
      articles: ARTICLES,
      pricing: PRICING,
    });
    const result = await getEnrichedDirectory(env);
    expect(result.ok).toBe(true);
    expect(result.total).toBe(3);
    const claude = result.agents.find(a => a.id === 'claude-code')!;
    expect(claude.live_status).toBe('operational');
    expect(claude.recent_news_count).toBeGreaterThan(0);
    expect(claude.flagship_pricing?.model).toBe('Claude Opus 4.7');
    expect(claude.flagship_pricing?.blended).toBe(45);
  });

  it('marks providers without a status match as unknown', async () => {
    const env = makeEnv({
      directory: DIRECTORY,
      services: SERVICES,
      articles: [],
      pricing: PRICING,
    });
    const result = await getEnrichedDirectory(env);
    const continueAgent = result.agents.find(a => a.id === 'continue-dev')!;
    expect(continueAgent.live_status).toBe('unknown');
    expect(continueAgent.flagship_pricing).toBeNull();
  });

  it('respects the category filter', async () => {
    const env = makeEnv({
      directory: DIRECTORY,
      services: SERVICES,
      articles: ARTICLES,
      pricing: PRICING,
    });
    const result = await getEnrichedDirectory(env, { category: 'coding' });
    expect(result.returned).toBe(2);
    expect(result.agents.every(a => a.category === 'coding')).toBe(true);
  });

  it('respects open_source filter', async () => {
    const env = makeEnv({
      directory: DIRECTORY,
      services: SERVICES,
      articles: ARTICLES,
      pricing: PRICING,
    });
    const onlyOss = await getEnrichedDirectory(env, { open_source: true });
    expect(onlyOss.agents).toHaveLength(1);
    expect(onlyOss.agents[0].id).toBe('continue-dev');

    const closedSource = await getEnrichedDirectory(env, { open_source: false });
    expect(closedSource.agents.every(a => a.openSource !== true)).toBe(true);
  });

  it('respects status filter', async () => {
    const env = makeEnv({
      directory: DIRECTORY,
      services: SERVICES,
      articles: ARTICLES,
      pricing: PRICING,
    });
    const result = await getEnrichedDirectory(env, { status: 'degraded' });
    expect(result.agents).toHaveLength(1);
    expect(result.agents[0].id).toBe('chatgpt');
  });

  it('alphabetical sort orders by name', async () => {
    const env = makeEnv({
      directory: DIRECTORY,
      services: SERVICES,
      articles: [],
      pricing: PRICING,
    });
    const result = await getEnrichedDirectory(env, { sort: 'alphabetical' });
    expect(result.agents.map(a => a.name)).toEqual(['ChatGPT', 'Claude Code', 'Continue']);
  });

  it('price_low sort puts cheapest flagship first', async () => {
    const env = makeEnv({
      directory: DIRECTORY,
      services: SERVICES,
      articles: [],
      pricing: PRICING,
    });
    const result = await getEnrichedDirectory(env, { sort: 'price_low' });
    // GPT-5.5 blended 20 < Opus 45 < Continue (no flagship, ranks last)
    expect(result.agents[0].id).toBe('chatgpt');
    expect(result.agents[1].id).toBe('claude-code');
    expect(result.agents[2].id).toBe('continue-dev');
  });

  it('news_count sort ranks providers with most coverage first', async () => {
    const heavyNews = [
      ...ARTICLES,
      { id: '4', title: 'Anthropic ToS update', url: 'https://a', source: 'TechCrunch', sourceDomain: 'techcrunch.com', snippet: '', publishedAt: '2026-04-24T12:00:00Z' },
      { id: '5', title: 'Anthropic Claude tops benchmarks', url: 'https://b', source: 'The Verge', sourceDomain: 'theverge.com', snippet: '', publishedAt: '2026-04-23T12:00:00Z' },
    ];
    const env = makeEnv({
      directory: DIRECTORY,
      services: SERVICES,
      articles: heavyNews,
      pricing: PRICING,
    });
    const result = await getEnrichedDirectory(env, { sort: 'news_count' });
    expect(result.agents[0].provider).toBe('Anthropic');
  });

  it('caps result at limit (default 50)', async () => {
    const env = makeEnv({
      directory: DIRECTORY,
      services: SERVICES,
      articles: [],
      pricing: PRICING,
    });
    const result = await getEnrichedDirectory(env, { limit: 1 });
    expect(result.returned).toBe(1);
    expect(result.total).toBe(3);
  });

  it('returns empty agents list when directory is empty', async () => {
    const env = makeEnv({
      directory: { agents: [] },
      services: [],
      articles: [],
      pricing: { providers: [] },
    });
    const result = await getEnrichedDirectory(env);
    expect(result.total).toBe(0);
    expect(result.agents).toHaveLength(0);
  });

  it('surfaces the real directory ingest time in data_freshness.directory (staleness no-charge basis)', async () => {
    // The handler bills staleness against result.data_freshness.directory
    // (the real upstream lastUpdated), NOT the top-level computed_at build
    // time. Pin that the source lastUpdated reaches data_freshness.directory.
    const env = makeEnv({
      directory: DIRECTORY,
      services: SERVICES,
      articles: ARTICLES,
      pricing: PRICING,
    });
    const result = await getEnrichedDirectory(env);
    expect(result.data_freshness.directory).toBe('2026-04-27');
    // computed_at is build time and must not be what staleness bills against.
    expect(result.data_freshness.directory).not.toBe(result.computed_at);
  });
});
