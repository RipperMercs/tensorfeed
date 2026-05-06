/**
 * Pure-logic tests for the AI/ML npm trending module.
 *
 * Network fetch (fetchNpmDownloads) is not exercised here; the
 * snapshot builder, ranking math, category filtering, and read
 * helpers are.
 */

import { describe, it, expect } from 'vitest';
import {
  CURATED_PACKAGES,
  buildSnapshot,
  readNpmTrending,
  isValidCategory,
  NPM_ATTRIBUTION,
  PackageCategory,
} from './npm-ai-packages';
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

// ── Curated list sanity ────────────────────────────────────────────

describe('CURATED_PACKAGES', () => {
  it('uses only valid categories', () => {
    for (const p of CURATED_PACKAGES) {
      expect(isValidCategory(p.category)).toBe(true);
    }
  });

  it('uses unique package names', () => {
    const names = CURATED_PACKAGES.map(p => p.name);
    expect(new Set(names).size).toBe(names.length);
  });

  it('covers every category', () => {
    const cats = new Set(CURATED_PACKAGES.map(p => p.category));
    for (const required of ['llm-sdk', 'agent-framework', 'rag', 'inference', 'evals', 'tooling', 'mcp']) {
      expect(cats.has(required as PackageCategory)).toBe(true);
    }
  });
});

// ── buildSnapshot ───────────────────────────────────────────────────

describe('buildSnapshot', () => {
  it('ranks packages by downloads desc', () => {
    const downloads = new Map<string, number>([
      ['openai', 5_000_000],
      ['langchain', 2_000_000],
      ['@anthropic-ai/sdk', 800_000],
      ['ai', 12_000_000],
    ]);
    const snap = buildSnapshot(downloads);
    expect(snap.packages[0].name).toBe('ai');
    expect(snap.packages[0].rank).toBe(1);
    expect(snap.packages[1].name).toBe('openai');
    expect(snap.packages[1].rank).toBe(2);
  });

  it('assigns 0 downloads to packages missing from the input', () => {
    const downloads = new Map<string, number>([['openai', 1000]]);
    const snap = buildSnapshot(downloads);
    const openai = snap.packages.find(p => p.name === 'openai');
    expect(openai?.downloads_last_week).toBe(1000);
    const others = snap.packages.filter(p => p.name !== 'openai');
    for (const o of others) expect(o.downloads_last_week).toBe(0);
  });

  it('sums total downloads correctly', () => {
    const downloads = new Map<string, number>([
      ['openai', 100],
      ['langchain', 50],
      ['@anthropic-ai/sdk', 25],
    ]);
    const snap = buildSnapshot(downloads);
    expect(snap.total_downloads_last_week).toBe(175);
  });

  it('assigns category rank in each category independently', () => {
    const downloads = new Map<string, number>([
      ['openai', 5_000_000],
      ['@anthropic-ai/sdk', 1_000_000],
      ['langchain', 2_000_000],
      ['@langchain/core', 1_500_000],
    ]);
    const snap = buildSnapshot(downloads);
    const llmSdks = snap.packages.filter(p => p.category === 'llm-sdk').sort((a, b) => a.rank_in_category - b.rank_in_category);
    expect(llmSdks[0].name).toBe('openai');
    expect(llmSdks[0].rank_in_category).toBe(1);
    const frameworks = snap.packages.filter(p => p.category === 'agent-framework').sort((a, b) => a.rank_in_category - b.rank_in_category);
    expect(frameworks[0].name).toBe('langchain');
    expect(frameworks[0].rank_in_category).toBe(1);
  });

  it('contains every curated package in output', () => {
    const snap = buildSnapshot(new Map());
    expect(snap.packages).toHaveLength(CURATED_PACKAGES.length);
  });
});

// ── readNpmTrending ─────────────────────────────────────────────────

describe('readNpmTrending', () => {
  it('returns null when no snapshot exists', async () => {
    const env = makeEnv({});
    const r = await readNpmTrending(env);
    expect(r).toBeNull();
  });

  it('returns the snapshot when present', async () => {
    const downloads = new Map<string, number>([
      ['openai', 5_000_000],
      ['langchain', 2_000_000],
    ]);
    const snap = buildSnapshot(downloads);
    const env = makeEnv({ 'npm-ai:current': snap });
    const r = await readNpmTrending(env);
    expect(r?.ok).toBe(true);
    expect(r?.packages[0].name).toBe('openai');
  });

  it('filters by category', async () => {
    const downloads = new Map<string, number>([
      ['openai', 5_000_000],
      ['langchain', 2_000_000],
    ]);
    const snap = buildSnapshot(downloads);
    const env = makeEnv({ 'npm-ai:current': snap });
    const r = await readNpmTrending(env, { category: 'llm-sdk' });
    expect(r?.packages.every(p => p.category === 'llm-sdk')).toBe(true);
  });

  it('respects limit', async () => {
    const downloads = new Map<string, number>([
      ['openai', 5_000_000],
      ['langchain', 2_000_000],
    ]);
    const snap = buildSnapshot(downloads);
    const env = makeEnv({ 'npm-ai:current': snap });
    const r = await readNpmTrending(env, { limit: 3 });
    expect(r?.packages).toHaveLength(3);
  });

  it('attaches attribution', async () => {
    const snap = buildSnapshot(new Map());
    const env = makeEnv({ 'npm-ai:current': snap });
    const r = await readNpmTrending(env);
    expect(r?.attribution).toEqual(NPM_ATTRIBUTION);
  });
});

// ── isValidCategory ─────────────────────────────────────────────────

describe('isValidCategory', () => {
  it('accepts known categories', () => {
    expect(isValidCategory('llm-sdk')).toBe(true);
    expect(isValidCategory('mcp')).toBe(true);
    expect(isValidCategory('rag')).toBe(true);
  });

  it('rejects unknown categories', () => {
    expect(isValidCategory('not-a-thing')).toBe(false);
    expect(isValidCategory('')).toBe(false);
  });
});
