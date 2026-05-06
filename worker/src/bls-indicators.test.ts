/**
 * Pure-logic tests for the BLS indicators module.
 *
 * Network fetcher is not exercised here. Parser, snapshot building,
 * and read-API filters are.
 */

import { describe, it, expect } from 'vitest';
import {
  BLS_SERIES,
  parseSeriesObservations,
  readIndicators,
  isValidCategory,
  BLS_ATTRIBUTION,
  IndicatorsSnapshot,
} from './bls-indicators';
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

describe('BLS_SERIES', () => {
  it('contains at least one indicator per category', () => {
    const cats = new Set(BLS_SERIES.map(s => s.category));
    for (const required of ['inflation', 'employment', 'wages', 'labor-force', 'jolts']) {
      expect(cats.has(required as never)).toBe(true);
    }
  });

  it('uses unique BLS series IDs', () => {
    const ids = BLS_SERIES.map(s => s.id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it('points each entry to a bls.gov source url', () => {
    for (const s of BLS_SERIES) {
      expect(s.source_url).toContain('bls.gov');
    }
  });
});

// ── parseSeriesObservations ────────────────────────────────────────

describe('parseSeriesObservations', () => {
  it('parses well-formed monthly observations and sorts oldest-first', () => {
    const raw = [
      { year: '2026', period: 'M03', periodName: 'March', value: '310.500' },
      { year: '2026', period: 'M02', periodName: 'February', value: '309.800' },
      { year: '2026', period: 'M01', periodName: 'January', value: '309.000' },
    ];
    const out = parseSeriesObservations(raw);
    expect(out).toHaveLength(3);
    expect(out[0].month).toBe(1);
    expect(out[0].value).toBe(309);
    expect(out[2].month).toBe(3);
    expect(out[2].period_label).toBe('Mar 2026');
  });

  it('skips annual M13 and quarterly periods', () => {
    const raw = [
      { year: '2025', period: 'M13', periodName: 'Annual', value: '305.0' },
      { year: '2025', period: 'Q01', periodName: 'Q1', value: '300.0' },
      { year: '2025', period: 'M06', periodName: 'June', value: '302.5' },
    ];
    const out = parseSeriesObservations(raw);
    expect(out).toHaveLength(1);
    expect(out[0].month).toBe(6);
  });

  it('drops malformed rows', () => {
    const raw = [
      { year: '2026', period: 'M01', value: 'not-a-number' },
      { period: 'M01', value: '5.5' },                            // missing year
      { year: '2026', period: 'M14', value: '5.5' },               // bad month
      { year: '2026', period: 'M02', periodName: 'February', value: '5.5' },
    ];
    const out = parseSeriesObservations(raw);
    expect(out).toHaveLength(1);
    expect(out[0].month).toBe(2);
    expect(out[0].value).toBe(5.5);
  });

  it('caps history at 24 months', () => {
    const raw = Array.from({ length: 30 }, (_, i) => ({
      year: '2024',
      period: `M${String((i % 12) + 1).padStart(2, '0')}`,
      periodName: 'Month',
      value: String(i),
    }));
    const out = parseSeriesObservations(raw);
    expect(out).toHaveLength(24);
  });

  it('returns empty array for empty input', () => {
    expect(parseSeriesObservations([])).toEqual([]);
  });
});

// ── readIndicators ─────────────────────────────────────────────────

const SAMPLE_SNAPSHOT: IndicatorsSnapshot = {
  capturedAt: '2026-05-06T05:00:00Z',
  count: 3,
  indicators: [
    {
      series_id: 'CUUR0000SA0',
      name: 'CPI-U All Items',
      category: 'inflation',
      unit: 'index 1982-84=100',
      description: 'CPI headline',
      source_url: 'https://www.bls.gov/cpi/',
      observations: [
        { year: 2026, month: 1, period_label: 'Jan 2026', value: 309 },
        { year: 2026, month: 2, period_label: 'Feb 2026', value: 309.8 },
      ],
      latest: { year: 2026, month: 2, period_label: 'Feb 2026', value: 309.8 },
      prior: { year: 2026, month: 1, period_label: 'Jan 2026', value: 309 },
      delta_absolute: 0.8,
      delta_pct: 0.26,
    },
    {
      series_id: 'LNS14000000',
      name: 'Civilian Unemployment Rate',
      category: 'employment',
      unit: '%',
      description: 'Unemployment rate',
      source_url: 'https://www.bls.gov/cps/',
      observations: [
        { year: 2026, month: 1, period_label: 'Jan 2026', value: 4.0 },
        { year: 2026, month: 2, period_label: 'Feb 2026', value: 4.1 },
      ],
      latest: { year: 2026, month: 2, period_label: 'Feb 2026', value: 4.1 },
      prior: { year: 2026, month: 1, period_label: 'Jan 2026', value: 4.0 },
      delta_absolute: 0.1,
      delta_pct: 2.5,
    },
    {
      series_id: 'JTS000000000000000JOL',
      name: 'JOLTS Job Openings',
      category: 'jolts',
      unit: 'thousands',
      description: 'JOLTS',
      source_url: 'https://www.bls.gov/jlt/',
      observations: [],
      latest: null,
      prior: null,
      delta_absolute: null,
      delta_pct: null,
    },
  ],
  errors: [],
};

describe('readIndicators', () => {
  it('returns null when no snapshot exists', async () => {
    const env = makeEnv({});
    const r = await readIndicators(env);
    expect(r).toBeNull();
  });

  it('returns the full snapshot when no filter', async () => {
    const env = makeEnv({ 'bls-indicators:current': SAMPLE_SNAPSHOT });
    const r = await readIndicators(env);
    expect(r?.count).toBe(3);
  });

  it('filters by category', async () => {
    const env = makeEnv({ 'bls-indicators:current': SAMPLE_SNAPSHOT });
    const r = await readIndicators(env, { category: 'inflation' });
    expect(r?.count).toBe(1);
    expect(r?.indicators[0].name).toContain('CPI');
  });

  it('attaches attribution', async () => {
    const env = makeEnv({ 'bls-indicators:current': SAMPLE_SNAPSHOT });
    const r = await readIndicators(env);
    expect(r?.attribution).toEqual(BLS_ATTRIBUTION);
    expect(r?.attribution.license).toContain('Public domain');
  });

  it('surfaces a note when prior refresh had errors', async () => {
    const withErrors: IndicatorsSnapshot = {
      ...SAMPLE_SNAPSHOT,
      errors: [{ series_id: 'CUUR0000SA0', error: 'HTTP 503' }],
    };
    const env = makeEnv({ 'bls-indicators:current': withErrors });
    const r = await readIndicators(env);
    expect(r?.notes.length).toBe(1);
    expect(r?.notes[0]).toContain('series failed');
  });
});

// ── isValidCategory ─────────────────────────────────────────────────

describe('isValidCategory', () => {
  it('accepts all five valid categories', () => {
    for (const c of ['inflation', 'employment', 'wages', 'labor-force', 'jolts']) {
      expect(isValidCategory(c)).toBe(true);
    }
  });

  it('rejects unknown values', () => {
    expect(isValidCategory('housing')).toBe(false);
    expect(isValidCategory('')).toBe(false);
  });
});
