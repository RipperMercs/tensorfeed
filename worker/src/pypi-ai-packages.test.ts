import { describe, it, expect } from 'vitest';
import {
  CURATED_PYPI_PACKAGES,
  buildSnapshot,
  readPyPITrending,
  isValidCategory,
  PYPI_ATTRIBUTION,
  PackageCategory,
} from './pypi-ai-packages';
import type { Env } from './types';

function makeKV(initial: Record<string, unknown>) {
  const store = new Map<string, unknown>(Object.entries(initial));
  return {
    get: async (key: string) => store.get(key) ?? null,
    put: async () => undefined,
    delete: async () => undefined,
    list: async () => ({ keys: [] }),
  };
}

function makeEnv(initial: Record<string, unknown> = {}): Env {
  const cache = makeKV(initial);
  return {
    TENSORFEED_NEWS: makeKV({}) as unknown as KVNamespace,
    TENSORFEED_STATUS: makeKV({}) as unknown as KVNamespace,
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

describe('CURATED_PYPI_PACKAGES', () => {
  it('uses unique package names', () => {
    const names = CURATED_PYPI_PACKAGES.map(p => p.name);
    expect(new Set(names).size).toBe(names.length);
  });

  it('uses only valid categories', () => {
    for (const p of CURATED_PYPI_PACKAGES) {
      expect(isValidCategory(p.category)).toBe(true);
    }
  });

  it('covers every category with at least one entry', () => {
    const cats = new Set(CURATED_PYPI_PACKAGES.map(p => p.category));
    for (const required of ['llm-sdk', 'agent-framework', 'rag', 'inference', 'evals', 'observability', 'tooling', 'mcp']) {
      expect(cats.has(required as PackageCategory)).toBe(true);
    }
  });
});

describe('buildSnapshot', () => {
  it('ranks by last_month downloads desc', () => {
    const downloads = new Map([
      ['openai', { last_day: 100, last_week: 700, last_month: 3_000_000 }],
      ['anthropic', { last_day: 80, last_week: 560, last_month: 2_400_000 }],
      ['langchain', { last_day: 200, last_week: 1400, last_month: 6_000_000 }],
    ]);
    const snap = buildSnapshot(downloads);
    expect(snap.packages[0].name).toBe('langchain');
    expect(snap.packages[0].rank).toBe(1);
  });

  it('assigns 0 to packages missing from input', () => {
    const downloads = new Map([['openai', { last_day: 1, last_week: 7, last_month: 30 }]]);
    const snap = buildSnapshot(downloads);
    const openai = snap.packages.find(p => p.name === 'openai');
    expect(openai?.downloads_last_month).toBe(30);
    const others = snap.packages.filter(p => p.name !== 'openai');
    for (const o of others) expect(o.downloads_last_month).toBe(0);
  });

  it('sums total_downloads_last_month correctly', () => {
    const downloads = new Map([
      ['openai', { last_day: 0, last_week: 0, last_month: 100 }],
      ['anthropic', { last_day: 0, last_week: 0, last_month: 50 }],
    ]);
    const snap = buildSnapshot(downloads);
    expect(snap.total_downloads_last_month).toBe(150);
  });

  it('assigns category rank within each category', () => {
    const downloads = new Map([
      ['openai', { last_day: 0, last_week: 0, last_month: 5_000_000 }],
      ['anthropic', { last_day: 0, last_week: 0, last_month: 1_000_000 }],
      ['langchain', { last_day: 0, last_week: 0, last_month: 6_000_000 }],
      ['langchain-core', { last_day: 0, last_week: 0, last_month: 4_000_000 }],
    ]);
    const snap = buildSnapshot(downloads);
    const llmSdks = snap.packages.filter(p => p.category === 'llm-sdk').sort((a, b) => a.rank_in_category - b.rank_in_category);
    expect(llmSdks[0].name).toBe('openai');
    expect(llmSdks[0].rank_in_category).toBe(1);
  });
});

describe('readPyPITrending', () => {
  it('returns null when no snapshot exists', async () => {
    const env = makeEnv({});
    const r = await readPyPITrending(env);
    expect(r).toBeNull();
  });

  it('returns snapshot when present', async () => {
    const downloads = new Map([
      ['openai', { last_day: 0, last_week: 0, last_month: 5_000_000 }],
    ]);
    const snap = buildSnapshot(downloads);
    const env = makeEnv({ 'pypi-ai:current': snap });
    const r = await readPyPITrending(env);
    expect(r?.packages[0].name).toBe('openai');
  });

  it('filters by category', async () => {
    const downloads = new Map([
      ['openai', { last_day: 0, last_week: 0, last_month: 5_000_000 }],
      ['langchain', { last_day: 0, last_week: 0, last_month: 6_000_000 }],
    ]);
    const snap = buildSnapshot(downloads);
    const env = makeEnv({ 'pypi-ai:current': snap });
    const r = await readPyPITrending(env, { category: 'agent-framework' });
    expect(r?.packages.every(p => p.category === 'agent-framework')).toBe(true);
  });

  it('respects limit', async () => {
    const downloads = new Map([
      ['openai', { last_day: 0, last_week: 0, last_month: 5_000_000 }],
    ]);
    const snap = buildSnapshot(downloads);
    const env = makeEnv({ 'pypi-ai:current': snap });
    const r = await readPyPITrending(env, { limit: 3 });
    expect(r?.packages).toHaveLength(3);
  });

  it('attaches attribution', async () => {
    const snap = buildSnapshot(new Map());
    const env = makeEnv({ 'pypi-ai:current': snap });
    const r = await readPyPITrending(env);
    expect(r?.attribution).toEqual(PYPI_ATTRIBUTION);
  });
});

describe('isValidCategory', () => {
  it('accepts known categories', () => {
    expect(isValidCategory('llm-sdk')).toBe(true);
    expect(isValidCategory('observability')).toBe(true);
  });

  it('rejects unknown', () => {
    expect(isValidCategory('xyz')).toBe(false);
    expect(isValidCategory('')).toBe(false);
  });
});
