import { describe, it, expect } from 'vitest';
import {
  momentumRatio,
  velocityRatio,
  classifyDirection,
  computePackagesMomentum,
  PACKAGES_MOMENTUM_ATTRIBUTION,
} from './premium-packages-momentum';
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

// ── Math helpers ───────────────────────────────────────────────────

describe('momentumRatio', () => {
  it('returns 1 when last_week equals weekly avg', () => {
    expect(momentumRatio(100, 400)).toBe(1);
  });
  it('returns above 1 when last_week is hotter', () => {
    expect(momentumRatio(150, 400)).toBe(1.5);
  });
  it('returns below 1 when last_week is colder', () => {
    expect(momentumRatio(50, 400)).toBe(0.5);
  });
  it('returns null when last_month is zero', () => {
    expect(momentumRatio(100, 0)).toBeNull();
    expect(momentumRatio(100, -1)).toBeNull();
  });
});

describe('velocityRatio', () => {
  it('returns 1 when day pace matches week pace', () => {
    expect(velocityRatio(10, 70)).toBe(1);
  });
  it('returns above 1 when today is hotter', () => {
    expect(velocityRatio(20, 70)).toBeCloseTo(2, 4);
  });
  it('returns below 1 when today is colder', () => {
    expect(velocityRatio(5, 70)).toBe(0.5);
  });
  it('returns null when last_week is zero', () => {
    expect(velocityRatio(10, 0)).toBeNull();
  });
});

describe('classifyDirection', () => {
  it('returns accelerating above 1.05', () => {
    expect(classifyDirection(1.06)).toBe('accelerating');
    expect(classifyDirection(2)).toBe('accelerating');
  });
  it('returns decelerating below 0.95', () => {
    expect(classifyDirection(0.94)).toBe('decelerating');
    expect(classifyDirection(0.5)).toBe('decelerating');
  });
  it('returns steady in the band', () => {
    expect(classifyDirection(1)).toBe('steady');
    expect(classifyDirection(1.05)).toBe('steady');
    expect(classifyDirection(0.95)).toBe('steady');
  });
  it('returns insufficient_data for null', () => {
    expect(classifyDirection(null)).toBe('insufficient_data');
  });
});

// ── computePackagesMomentum ────────────────────────────────────────

const SAMPLE_SNAPSHOT = {
  capturedAt: '2026-05-06T03:45:00Z',
  total_packages: 5,
  total_downloads_last_month: 1_650_000,
  packages: [
    {
      name: 'openai',
      category: 'llm-sdk',
      description: 'OpenAI Python SDK',
      homepage: null,
      downloads_last_day: 50_000,
      downloads_last_week: 350_000,         // weekly avg = 1M / 4 = 250K -> ratio 1.4 (accelerating)
      downloads_last_month: 1_000_000,
      rank: 1,
      rank_in_category: 1,
    },
    {
      name: 'anthropic',
      category: 'llm-sdk',
      description: 'Anthropic Python SDK',
      homepage: null,
      downloads_last_day: 10_000,
      downloads_last_week: 75_000,          // weekly avg = 100K / 4 = 25K -> 3.0
      downloads_last_month: 100_000,
      rank: 4,
      rank_in_category: 2,
    },
    {
      name: 'langchain',
      category: 'agent-framework',
      description: 'LangChain',
      homepage: null,
      downloads_last_day: 30_000,
      downloads_last_week: 100_000,         // weekly avg = 400K / 4 = 100K -> 1.0 (steady)
      downloads_last_month: 400_000,
      rank: 2,
      rank_in_category: 1,
    },
    {
      name: 'crewai',
      category: 'agent-framework',
      description: 'CrewAI',
      homepage: null,
      downloads_last_day: 5_000,
      downloads_last_week: 30_000,          // weekly avg = 150K / 4 = 37.5K -> 0.8 (decelerating)
      downloads_last_month: 150_000,
      rank: 3,
      rank_in_category: 2,
    },
    {
      name: 'somethingnew',
      category: 'tooling',
      description: 'New package',
      homepage: null,
      downloads_last_day: 0,
      downloads_last_week: 0,
      downloads_last_month: 0,                // insufficient
      rank: 5,
      rank_in_category: 1,
    },
  ],
};

describe('computePackagesMomentum', () => {
  it('returns no_snapshot_yet when KV is empty', async () => {
    const env = makeEnv({});
    const r = await computePackagesMomentum(env);
    expect(r.ok).toBe(false);
    if (!r.ok) {
      expect(r.error).toBe('no_snapshot_yet');
      expect(r.hint).toBeDefined();
    }
  });

  it('returns ok with full computation when snapshot is present', async () => {
    const env = makeEnv({ 'pypi-ai:current': SAMPLE_SNAPSHOT });
    const r = await computePackagesMomentum(env);
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    expect(r.total_packages).toBe(5);
    expect(r.totals_by_direction.accelerating).toBe(2);  // openai, anthropic
    expect(r.totals_by_direction.steady).toBe(1);        // langchain
    expect(r.totals_by_direction.decelerating).toBe(1);  // crewai
    expect(r.totals_by_direction.insufficient_data).toBe(1);
  });

  it('ranks by momentum descending', async () => {
    const env = makeEnv({ 'pypi-ai:current': SAMPLE_SNAPSHOT });
    const r = await computePackagesMomentum(env);
    if (!r.ok) return;
    expect(r.packages[0].name).toBe('anthropic');  // ratio 3.0
    expect(r.packages[1].name).toBe('openai');     // ratio 1.4
    expect(r.packages[r.packages.length - 1].name).toBe('somethingnew'); // null ratio at bottom
  });

  it('builds notable_movers correctly', async () => {
    const env = makeEnv({ 'pypi-ai:current': SAMPLE_SNAPSHOT });
    const r = await computePackagesMomentum(env);
    if (!r.ok) return;
    expect(r.notable_movers.top_accelerating[0].name).toBe('anthropic');
    expect(r.notable_movers.top_accelerating).toHaveLength(2);
    expect(r.notable_movers.top_decelerating[0].name).toBe('crewai');
  });

  it('aggregates by_category', async () => {
    const env = makeEnv({ 'pypi-ai:current': SAMPLE_SNAPSHOT });
    const r = await computePackagesMomentum(env);
    if (!r.ok) return;
    expect(r.by_category['llm-sdk'].accelerating).toBe(2);
    expect(r.by_category['agent-framework'].steady).toBe(1);
    expect(r.by_category['agent-framework'].decelerating).toBe(1);
    expect(r.by_category['tooling'].insufficient_data).toBe(1);
  });

  it('attaches attribution and surfaces npm-deferred note', async () => {
    const env = makeEnv({ 'pypi-ai:current': SAMPLE_SNAPSHOT });
    const r = await computePackagesMomentum(env);
    if (!r.ok) return;
    expect(r.attribution).toEqual(PACKAGES_MOMENTUM_ATTRIBUTION);
    expect(r.notes.some(n => n.includes('npm momentum is deferred'))).toBe(true);
  });

  it('preserves source_captured_at from upstream snapshot', async () => {
    const env = makeEnv({ 'pypi-ai:current': SAMPLE_SNAPSHOT });
    const r = await computePackagesMomentum(env);
    if (!r.ok) return;
    expect(r.source_captured_at).toBe('2026-05-06T03:45:00Z');
  });
});
