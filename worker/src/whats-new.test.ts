/**
 * Pure-logic unit tests for the premium whats-new aggregator.
 */

import { describe, it, expect } from 'vitest';
import { computeWhatsNew, previewWhatsNew, type WhatsNewResult } from './whats-new';
import { NEWS_ATTRIBUTION } from './news-search';
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
  pricing?: unknown;
  pricingHistorySnapshots?: Record<string, unknown>;
  services?: unknown;
  incidents?: unknown;
  articles?: unknown;
}): Env {
  return {
    TENSORFEED_NEWS: makeKV(opts.articles !== undefined ? { articles: opts.articles } : {}) as unknown as KVNamespace,
    TENSORFEED_STATUS: makeKV({
      ...(opts.services !== undefined ? { services: opts.services } : {}),
      ...(opts.incidents !== undefined ? { incidents: opts.incidents } : {}),
    }) as unknown as KVNamespace,
    TENSORFEED_CACHE: makeKV({
      ...(opts.pricing !== undefined ? { models: opts.pricing } : {}),
      ...(opts.pricingHistorySnapshots ?? {}),
    }) as unknown as KVNamespace,
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

function todayUTC(): string {
  return new Date().toISOString().slice(0, 10);
}

function addDays(dateStr: string, n: number): string {
  const d = new Date(`${dateStr}T00:00:00Z`);
  d.setUTCDate(d.getUTCDate() + n);
  return d.toISOString().slice(0, 10);
}

function pricingSnapshot(
  date: string,
  models: { id: string; name: string; provider: string; inputPrice: number; outputPrice: number; tier?: string }[],
) {
  const byProvider = new Map<string, { id: string; name: string; models: { id: string; name: string; inputPrice: number; outputPrice: number; tier?: string }[] }>();
  for (const m of models) {
    const existing = byProvider.get(m.provider) || { id: m.provider.toLowerCase(), name: m.provider, models: [] };
    existing.models.push({ id: m.id, name: m.name, inputPrice: m.inputPrice, outputPrice: m.outputPrice, tier: m.tier });
    byProvider.set(m.provider, existing);
  }
  return {
    date,
    type: 'models',
    capturedAt: `${date}T07:00:00.000Z`,
    data: { providers: Array.from(byProvider.values()) },
  };
}

describe('computeWhatsNew: pricing diff', () => {
  it('reports no pricing changes when before === after', async () => {
    const today = todayUTC();
    const yesterday = addDays(today, -1);
    const sameModels = [{ id: 'op', name: 'Opus 4.7', provider: 'Anthropic', inputPrice: 15, outputPrice: 75 }];
    const env = makeEnv({
      pricingHistorySnapshots: {
        [`history:${yesterday}:models`]: pricingSnapshot(yesterday, sameModels),
        [`history:${today}:models`]: pricingSnapshot(today, sameModels),
      },
    });
    const r = await computeWhatsNew(env);
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    expect(r.summary.total_pricing_changes).toBe(0);
    expect(r.summary.new_models).toBe(0);
    expect(r.summary.removed_models).toBe(0);
  });

  it('reports input and output price changes separately', async () => {
    const today = todayUTC();
    const yesterday = addDays(today, -1);
    const env = makeEnv({
      pricingHistorySnapshots: {
        [`history:${yesterday}:models`]: pricingSnapshot(yesterday, [
          { id: 'op', name: 'Opus 4.7', provider: 'Anthropic', inputPrice: 15, outputPrice: 75 },
        ]),
        [`history:${today}:models`]: pricingSnapshot(today, [
          { id: 'op', name: 'Opus 4.7', provider: 'Anthropic', inputPrice: 12, outputPrice: 60 },
        ]),
      },
    });
    const r = await computeWhatsNew(env);
    if (!r.ok) return;
    expect(r.pricing.changes).toHaveLength(2);
    const inputChange = r.pricing.changes.find(c => c.field === 'inputPrice');
    expect(inputChange?.from).toBe(15);
    expect(inputChange?.to).toBe(12);
    expect(inputChange?.delta_pct).toBeCloseTo(-20, 4);
  });

  it('detects new models added in the window', async () => {
    const today = todayUTC();
    const yesterday = addDays(today, -1);
    const env = makeEnv({
      pricingHistorySnapshots: {
        [`history:${yesterday}:models`]: pricingSnapshot(yesterday, [
          { id: 'op-46', name: 'Opus 4.6', provider: 'Anthropic', inputPrice: 18, outputPrice: 90 },
        ]),
        [`history:${today}:models`]: pricingSnapshot(today, [
          { id: 'op-46', name: 'Opus 4.6', provider: 'Anthropic', inputPrice: 18, outputPrice: 90 },
          { id: 'op-47', name: 'Opus 4.7', provider: 'Anthropic', inputPrice: 15, outputPrice: 75, tier: 'flagship' },
        ]),
      },
    });
    const r = await computeWhatsNew(env);
    if (!r.ok) return;
    expect(r.pricing.new_models).toHaveLength(1);
    expect(r.pricing.new_models[0].model).toBe('Opus 4.7');
    expect(r.pricing.new_models[0].tier).toBe('flagship');
  });

  it('detects removed models', async () => {
    const today = todayUTC();
    const yesterday = addDays(today, -1);
    const env = makeEnv({
      pricingHistorySnapshots: {
        [`history:${yesterday}:models`]: pricingSnapshot(yesterday, [
          { id: 'old', name: 'Old Model', provider: 'Anthropic', inputPrice: 5, outputPrice: 20 },
        ]),
        [`history:${today}:models`]: pricingSnapshot(today, []),
      },
    });
    const r = await computeWhatsNew(env);
    if (!r.ok) return;
    expect(r.pricing.removed_models).toHaveLength(1);
    expect(r.pricing.removed_models[0].model).toBe('Old Model');
  });
});

describe('computeWhatsNew: status incidents', () => {
  it('includes incidents that started in the window', async () => {
    const env = makeEnv({
      services: [
        { name: 'Anthropic', provider: 'anthropic', status: 'operational' },
      ],
      incidents: [
        {
          id: 'i1', service: 'Anthropic', provider: 'anthropic', severity: 'major',
          title: 'API outage', startedAt: new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString(),
          resolvedAt: new Date(Date.now() - 30 * 60 * 1000).toISOString(),
          durationMinutes: 90,
        },
        {
          id: 'i2', service: 'OpenAI', provider: 'openai', severity: 'minor',
          title: 'Old incident', startedAt: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString(),
          resolvedAt: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000 + 60_000).toISOString(),
          durationMinutes: 1,
        },
      ],
    });
    const r = await computeWhatsNew(env);
    if (!r.ok) return;
    expect(r.summary.incidents).toBe(1);
    expect(r.status.incidents[0].title).toBe('API outage');
    expect(r.status.incidents[0].duration_minutes).toBe(90);
  });

  it('counts current service states', async () => {
    const env = makeEnv({
      services: [
        { name: 'A', provider: 'a', status: 'operational' },
        { name: 'B', provider: 'b', status: 'degraded' },
        { name: 'C', provider: 'c', status: 'down' },
        { name: 'D', provider: 'd', status: 'operational' },
      ],
    });
    const r = await computeWhatsNew(env);
    if (!r.ok) return;
    expect(r.status.currently_operational).toBe(2);
    expect(r.status.currently_degraded).toBe(1);
    expect(r.status.currently_down).toBe(1);
    expect(r.status.currently_unknown).toBe(0);
  });
});

describe('computeWhatsNew: news window', () => {
  it('includes only articles within the window, newest first', async () => {
    const now = Date.now();
    const env = makeEnv({
      articles: [
        { id: '1', title: 'Just now', url: 'https://x/1', source: 'X', sourceDomain: 'x.com', snippet: '', categories: [], publishedAt: new Date(now - 60 * 60 * 1000).toISOString() },
        { id: '2', title: 'Last week', url: 'https://x/2', source: 'X', sourceDomain: 'x.com', snippet: '', categories: [], publishedAt: new Date(now - 7 * 24 * 60 * 60 * 1000).toISOString() },
        { id: '3', title: 'Half day ago', url: 'https://x/3', source: 'X', sourceDomain: 'x.com', snippet: '', categories: [], publishedAt: new Date(now - 12 * 60 * 60 * 1000).toISOString() },
      ],
    });
    const r = await computeWhatsNew(env, { days: 1 });
    if (!r.ok) return;
    expect(r.news).toHaveLength(2);
    expect(r.news[0].title).toBe('Just now');
    expect(r.news[1].title).toBe('Half day ago');
  });

  it('respects news_limit', async () => {
    const now = Date.now();
    const env = makeEnv({
      articles: Array.from({ length: 30 }, (_, i) => ({
        id: String(i),
        title: `Article ${i}`,
        url: `https://x/${i}`,
        source: 'X',
        sourceDomain: 'x.com',
        snippet: '',
        categories: [],
        publishedAt: new Date(now - i * 60 * 1000).toISOString(),
      })),
    });
    const r = await computeWhatsNew(env, { days: 1, newsLimit: 5 });
    if (!r.ok) return;
    expect(r.news).toHaveLength(5);
  });
});

describe('computeWhatsNew: window validation', () => {
  it('clamps days to [1, 7]', async () => {
    const env = makeEnv({});
    const tooLow = await computeWhatsNew(env, { days: 0 });
    if (!tooLow.ok) return;
    expect(tooLow.window.days).toBe(1);

    const tooHigh = await computeWhatsNew(env, { days: 30 });
    if (!tooHigh.ok) return;
    expect(tooHigh.window.days).toBe(7);
  });

  it('clamps news_limit to [1, 25]', async () => {
    const env = makeEnv({
      articles: Array.from({ length: 50 }, (_, i) => ({
        id: String(i), title: `a${i}`, url: 'https://x', source: 'X', sourceDomain: 'x', snippet: '', categories: [], publishedAt: new Date().toISOString(),
      })),
    });
    const r = await computeWhatsNew(env, { newsLimit: 999 });
    if (!r.ok) return;
    expect(r.news.length).toBeLessThanOrEqual(25);
  });
});

describe('computeWhatsNew: sub-daily window (minutes mode)', () => {
  it('filters news to a 60-min window when minutes=60', async () => {
    const now = Date.now();
    const env = makeEnv({
      articles: [
        { id: '1', title: '30 min ago', url: 'https://x/1', source: 'X', sourceDomain: 'x.com', snippet: '', categories: [], publishedAt: new Date(now - 30 * 60 * 1000).toISOString() },
        { id: '2', title: '90 min ago', url: 'https://x/2', source: 'X', sourceDomain: 'x.com', snippet: '', categories: [], publishedAt: new Date(now - 90 * 60 * 1000).toISOString() },
        { id: '3', title: '5 hours ago', url: 'https://x/3', source: 'X', sourceDomain: 'x.com', snippet: '', categories: [], publishedAt: new Date(now - 5 * 60 * 60 * 1000).toISOString() },
      ],
    });
    const r = await computeWhatsNew(env, { minutes: 60 });
    if (!r.ok) return;
    expect(r.news).toHaveLength(1);
    expect(r.news[0].title).toBe('30 min ago');
    expect(r.window.minutes).toBe(60);
  });

  it('omits pricing diff in sub-daily mode and notes why', async () => {
    const env = makeEnv({
      pricing: { providers: [{ id: 'a', name: 'A', models: [{ id: 'm1', name: 'M1', inputPrice: 1, outputPrice: 2 }] }] },
    });
    const r = await computeWhatsNew(env, { minutes: 60 });
    if (!r.ok) return;
    expect(r.pricing.changes).toEqual([]);
    expect(r.pricing.new_models).toEqual([]);
    expect(r.pricing.removed_models).toEqual([]);
    expect(r.notes.some(n => n.toLowerCase().includes('sub-daily'))).toBe(true);
  });

  it('clamps minutes to [5, 1440]', async () => {
    const env = makeEnv({});
    const tooLow = await computeWhatsNew(env, { minutes: 1 });   // falls through to days mode
    if (!tooLow.ok) return;
    expect(tooLow.window.minutes).toBeUndefined();   // sub-daily skipped, days mode applies
    expect(tooLow.window.days).toBe(1);

    const tooHigh = await computeWhatsNew(env, { minutes: 9999 });
    if (!tooHigh.ok) return;
    expect(tooHigh.window.minutes).toBeUndefined();   // out of range, falls back to days mode
    expect(tooHigh.window.days).toBe(1);
  });

  it('filters status incidents to the minutes window', async () => {
    const now = Date.now();
    const env = makeEnv({
      incidents: [
        { id: '1', service: 'API', provider: 'openai', severity: 'minor', title: '30 min ago', startedAt: new Date(now - 30 * 60 * 1000).toISOString(), resolvedAt: null, durationMinutes: null },
        { id: '2', service: 'API', provider: 'anthropic', severity: 'major', title: '4 hours ago', startedAt: new Date(now - 4 * 60 * 60 * 1000).toISOString(), resolvedAt: null, durationMinutes: null },
      ],
    });
    const r = await computeWhatsNew(env, { minutes: 60 });
    if (!r.ok) return;
    expect(r.status.incidents).toHaveLength(1);
    expect(r.status.incidents[0].title).toBe('30 min ago');
  });
});

describe('computeWhatsNew: emit notes', () => {
  it('notes when there is no historical pricing snapshot', async () => {
    const env = makeEnv({});
    const r = await computeWhatsNew(env);
    if (!r.ok) return;
    expect(r.notes.some(n => n.includes('No pricing snapshot'))).toBe(true);
  });
});

describe('computeWhatsNew: capturedAt (staleness no-charge basis)', () => {
  it('surfaces the freshest real data-capture time across sources', async () => {
    const today = todayUTC();
    const yesterday = addDays(today, -1);
    const env = makeEnv({
      pricingHistorySnapshots: {
        // pricingSnapshot stamps capturedAt = `${today}T07:00:00.000Z`
        [`history:${yesterday}:models`]: pricingSnapshot(yesterday, [
          { id: 'op', name: 'Opus 4.7', provider: 'Anthropic', inputPrice: 15, outputPrice: 75 },
        ]),
        [`history:${today}:models`]: pricingSnapshot(today, [
          { id: 'op', name: 'Opus 4.7', provider: 'Anthropic', inputPrice: 15, outputPrice: 75 },
        ]),
      },
      services: [
        // Later than the 07:00 pricing snapshot, so this is the freshest.
        { name: 'Anthropic', provider: 'anthropic', status: 'operational', lastChecked: `${today}T07:55:00.000Z` },
      ],
    });
    const r = await computeWhatsNew(env);
    if (!r.ok) return;
    expect(r.capturedAt).toBe(`${today}T07:55:00.000Z`);
    // Must NOT be build/request time (computed_at), which would defeat the SLA.
    expect(r.capturedAt).not.toBe(r.computed_at);
  });

  it('falls back to null when no source surfaces a timestamp', async () => {
    const env = makeEnv({});
    const r = await computeWhatsNew(env);
    if (!r.ok) return;
    expect(r.capturedAt).toBeNull();
  });
});

// === FREE PREVIEW SHAPE (the /api/preview/whats-new taste) ===
// The preview is the free discovery sibling of the paid morning brief. It
// must show enough to be compelling (live counts + the top 3 headline
// TITLES) while withholding the product (every pricing delta, incident
// detail, and headline link/snippet). Leaking those would give the paid
// brief away for free, so the leak guards below are load-bearing.

function fixtureResult(newsTitles: string[]): WhatsNewResult {
  return {
    ok: true,
    window: { from: '2026-06-23T00:00:00.000Z', to: '2026-06-24T00:00:00.000Z', days: 1 },
    computed_at: '2026-06-24T08:00:00.000Z',
    capturedAt: '2026-06-24T07:55:00.000Z',
    summary: {
      total_pricing_changes: 2,
      new_models: 1,
      removed_models: 0,
      incidents: 1,
      news_articles: newsTitles.length,
    },
    pricing: {
      changes: [
        { model: 'Claude Opus 4.7', provider: 'anthropic', field: 'inputPrice', from: 15, to: 14, delta_pct: -6.6667 },
      ],
      new_models: [
        { model: 'Sonnet 4.7', provider: 'anthropic', input_per_1m: 3, output_per_1m: 15, tier: 'mid' },
      ],
      removed_models: [],
    },
    status: {
      incidents: [
        {
          service: 'API',
          provider: 'openai',
          severity: 'minor',
          title: 'SECRET incident title',
          started_at: '2026-06-23T18:00:00.000Z',
          resolved_at: '2026-06-23T19:30:00.000Z',
          duration_minutes: 90,
        },
      ],
      currently_operational: 12,
      currently_degraded: 1,
      currently_down: 0,
      currently_unknown: 0,
    },
    news: newsTitles.map((title, i) => ({
      title,
      url: `https://secret.example/article/${i}`,
      source: 'Example',
      source_domain: 'secret.example',
      published_at: '2026-06-23T20:00:00.000Z',
      snippet: `SECRET snippet ${i}`,
      categories: ['ai'],
    })),
    news_attribution: NEWS_ATTRIBUTION,
    data_freshness: { pricing: null, status: null, incidents_count: 1, news_total_corpus: 100 },
    notes: [],
  };
}

describe('previewWhatsNew (free taste)', () => {
  it('passes through live counts and the window, flagged as a preview', () => {
    const full = fixtureResult(['H1', 'H2', 'H3', 'H4', 'H5']);
    const p = previewWhatsNew(full);
    expect(p.ok).toBe(true);
    expect(p.preview).toBe(true);
    expect(p.summary).toEqual(full.summary);
    expect(p.window).toEqual(full.window);
    expect(p.computed_at).toBe(full.computed_at);
    expect(p.unlock.full_brief).toBe('/api/premium/whats-new');
    expect(p.unlock.pro_brief).toBe('/api/premium/whats-new/pro');
  });

  it('exposes at most the top 3 headline TITLES, in order, as plain strings', () => {
    const p = previewWhatsNew(fixtureResult(['H1', 'H2', 'H3', 'H4', 'H5']));
    expect(p.top_headlines).toEqual(['H1', 'H2', 'H3']);
    for (const h of p.top_headlines) expect(typeof h).toBe('string');
  });

  it('returns fewer titles when fewer headlines exist (no padding)', () => {
    expect(previewWhatsNew(fixtureResult(['only one'])).top_headlines).toEqual(['only one']);
    expect(previewWhatsNew(fixtureResult([])).top_headlines).toEqual([]);
  });

  it('LEAK GUARD: withholds pricing deltas, incident detail, and headline links/snippets', () => {
    const p = previewWhatsNew(fixtureResult(['H1', 'H2', 'H3', 'H4']));
    const bag = p as unknown as Record<string, unknown>;
    // The full payload blocks must be absent entirely.
    expect(bag.pricing).toBeUndefined();
    expect(bag.status).toBeUndefined();
    expect(bag.news).toBeUndefined();
    // Nothing sensitive may survive serialization: no incident titles, no
    // headline URLs, no snippets, no pricing numbers beyond the public counts.
    const serialized = JSON.stringify(p);
    expect(serialized).not.toContain('SECRET incident title');
    expect(serialized).not.toContain('SECRET snippet');
    expect(serialized).not.toContain('secret.example');
    expect(serialized).not.toContain('H4'); // the 4th headline is past the top-3 cap
  });
});
