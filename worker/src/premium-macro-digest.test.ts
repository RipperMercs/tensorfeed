import { describe, it, expect } from 'vitest';
import {
  computeMacroDigest,
  classifyYieldCurve,
  classifyInflation,
  classifyEmployment,
  MACRO_DIGEST_ATTRIBUTION,
} from './premium-macro-digest';
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

// ── Regime classifiers ─────────────────────────────────────────────

describe('classifyYieldCurve', () => {
  it('returns inverted when spread is negative', () => {
    expect(classifyYieldCurve(-0.1)).toBe('inverted');
    expect(classifyYieldCurve(-0.5)).toBe('inverted');
  });
  it('returns flat when spread is small positive', () => {
    expect(classifyYieldCurve(0.0)).toBe('flat');
    expect(classifyYieldCurve(0.4)).toBe('flat');
  });
  it('returns normal in the middle band', () => {
    expect(classifyYieldCurve(0.5)).toBe('normal');
    expect(classifyYieldCurve(1.0)).toBe('normal');
    expect(classifyYieldCurve(1.5)).toBe('normal');
  });
  it('returns steep when spread exceeds 1.5', () => {
    expect(classifyYieldCurve(1.6)).toBe('steep');
    expect(classifyYieldCurve(2.5)).toBe('steep');
  });
  it('returns unknown for null', () => {
    expect(classifyYieldCurve(null)).toBe('unknown');
  });
});

describe('classifyInflation', () => {
  it('returns hot when CPI YoY > 4', () => {
    expect(classifyInflation(5)).toBe('hot');
  });
  it('returns above-target between 2.5 and 4', () => {
    expect(classifyInflation(3)).toBe('above-target');
    expect(classifyInflation(4)).toBe('above-target');
  });
  it('returns steady around 2', () => {
    expect(classifyInflation(2)).toBe('steady');
    expect(classifyInflation(2.5)).toBe('steady');
    expect(classifyInflation(1.5)).toBe('steady');
  });
  it('returns cooling below 1.5', () => {
    expect(classifyInflation(1.4)).toBe('cooling');
    expect(classifyInflation(0.5)).toBe('cooling');
  });
  it('returns unknown for null', () => {
    expect(classifyInflation(null)).toBe('unknown');
  });
});

describe('classifyEmployment', () => {
  it('returns tight when unemployment is sub-4 with no rise', () => {
    expect(classifyEmployment(-0.1, 3.7)).toBe('tight');
    expect(classifyEmployment(0, 3.9)).toBe('tight');
  });
  it('returns loosening when unemployment rises 0.2pp+', () => {
    expect(classifyEmployment(0.2, 4.1)).toBe('loosening');
    expect(classifyEmployment(0.5, 4.5)).toBe('loosening');
  });
  it('returns softening for 0.1pp rise', () => {
    expect(classifyEmployment(0.1, 4.1)).toBe('softening');
  });
  it('returns steady otherwise', () => {
    expect(classifyEmployment(0, 4.2)).toBe('steady');
  });
  it('returns unknown when unemployment level is null', () => {
    expect(classifyEmployment(0, null)).toBe('unknown');
  });
});

// ── computeMacroDigest ─────────────────────────────────────────────

const SAMPLE_BLS = {
  capturedAt: '2026-05-06T05:00:00Z',
  count: 6,
  indicators: [
    {
      series_id: 'CUUR0000SA0',
      name: 'CPI-U All Items',
      category: 'inflation',
      unit: 'index 1982-84=100',
      observations: [
        { year: 2025, month: 5, period_label: 'May 2025', value: 305.0 },
        { year: 2026, month: 4, period_label: 'Apr 2026', value: 312.0 },
        { year: 2026, month: 5, period_label: 'May 2026', value: 313.0 },
      ],
      latest: { year: 2026, month: 5, period_label: 'May 2026', value: 313.0 },
      prior: { year: 2026, month: 4, period_label: 'Apr 2026', value: 312.0 },
      delta_absolute: 1.0,
      delta_pct: 0.32,
    },
    {
      series_id: 'CUUR0000SA0L1E',
      name: 'CPI-U Core',
      category: 'inflation',
      unit: 'index 1982-84=100',
      observations: [
        { year: 2025, month: 5, period_label: 'May 2025', value: 320.0 },
        { year: 2026, month: 5, period_label: 'May 2026', value: 330.0 },
      ],
      latest: { year: 2026, month: 5, period_label: 'May 2026', value: 330.0 },
      prior: { year: 2026, month: 4, period_label: 'Apr 2026', value: 329.0 },
      delta_absolute: 1.0,
      delta_pct: 0.30,
    },
    {
      series_id: 'LNS14000000',
      name: 'Civilian Unemployment Rate',
      category: 'employment',
      unit: '%',
      observations: [
        { year: 2026, month: 4, period_label: 'Apr 2026', value: 4.0 },
        { year: 2026, month: 5, period_label: 'May 2026', value: 4.1 },
      ],
      latest: { year: 2026, month: 5, period_label: 'May 2026', value: 4.1 },
      prior: { year: 2026, month: 4, period_label: 'Apr 2026', value: 4.0 },
      delta_absolute: 0.1,
      delta_pct: 2.5,
    },
    {
      series_id: 'CES0000000001',
      name: 'Total Nonfarm Employment',
      category: 'employment',
      unit: 'thousands',
      observations: [],
      latest: { year: 2026, month: 5, period_label: 'May 2026', value: 158000 },
      prior: { year: 2026, month: 4, period_label: 'Apr 2026', value: 157825 },
      delta_absolute: 175,
      delta_pct: 0.11,
    },
  ],
};

const SAMPLE_FRED = {
  capturedAt: '2026-05-06T05:30:00Z',
  count: 4,
  indicators: [
    {
      series_id: 'DFF',
      name: 'Effective Federal Funds Rate',
      category: 'rates',
      frequency: 'daily',
      unit: '%',
      observations: [{ date: '2026-05-05', value: 4.33 }],
      latest: { date: '2026-05-05', value: 4.33 },
      prior: { date: '2026-05-04', value: 4.33 },
      delta_absolute: 0,
      delta_pct: 0,
    },
    {
      series_id: 'DGS10',
      name: '10-Year Treasury',
      category: 'rates',
      frequency: 'daily',
      unit: '%',
      observations: [{ date: '2026-05-05', value: 4.42 }],
      latest: { date: '2026-05-05', value: 4.42 },
      prior: { date: '2026-05-04', value: 4.40 },
      delta_absolute: 0.02,
      delta_pct: 0.45,
    },
    {
      series_id: 'DGS2',
      name: '2-Year Treasury',
      category: 'rates',
      frequency: 'daily',
      unit: '%',
      observations: [{ date: '2026-05-05', value: 4.10 }],
      latest: { date: '2026-05-05', value: 4.10 },
      prior: { date: '2026-05-04', value: 4.08 },
      delta_absolute: 0.02,
      delta_pct: 0.49,
    },
    {
      series_id: 'T10Y2Y',
      name: '10Y-2Y Spread',
      category: 'rates',
      frequency: 'daily',
      unit: 'percentage points',
      observations: [{ date: '2026-05-05', value: 0.32 }],
      latest: { date: '2026-05-05', value: 0.32 },
      prior: { date: '2026-05-04', value: 0.32 },
      delta_absolute: 0,
      delta_pct: 0,
    },
  ],
};

describe('computeMacroDigest', () => {
  it('returns no_snapshots_yet error when both KV slots are empty', async () => {
    const env = makeEnv({});
    const r = await computeMacroDigest(env);
    expect(r.ok).toBe(false);
    if (!r.ok) {
      expect(r.error).toBe('no_snapshots_yet');
      expect(r.hint).toBeDefined();
    }
  });

  it('returns ok with notes when only one snapshot is present', async () => {
    const env = makeEnv({ 'bls-indicators:current': SAMPLE_BLS });
    const r = await computeMacroDigest(env);
    expect(r.ok).toBe(true);
    if (r.ok) {
      expect(r.notes.some(n => n.includes('FRED'))).toBe(true);
      expect(r.inflation.cpi_yoy_pct).not.toBeNull();
    }
  });

  it('builds all sections when both snapshots are present', async () => {
    const env = makeEnv({
      'bls-indicators:current': SAMPLE_BLS,
      'fred-indicators:current': SAMPLE_FRED,
    });
    const r = await computeMacroDigest(env);
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    expect(r.rates.fed_funds_rate).toBe(4.33);
    expect(r.rates.yield_spread_10y_2y).toBe(0.32);
    expect(r.rates.yield_curve_regime).toBe('flat');
    expect(r.inflation.cpi_yoy_pct).toBeCloseTo(2.62, 1);
    expect(r.employment.unemployment_rate).toBe(4.1);
    expect(r.employment.regime).toBe('softening');
    expect(r.brief.length).toBeGreaterThan(20);
  });

  it('attaches attribution', async () => {
    const env = makeEnv({
      'bls-indicators:current': SAMPLE_BLS,
      'fred-indicators:current': SAMPLE_FRED,
    });
    const r = await computeMacroDigest(env);
    expect(r.ok).toBe(true);
    if (r.ok) {
      expect(r.attribution).toEqual(MACRO_DIGEST_ATTRIBUTION);
      expect(r.attribution.sources).toHaveLength(2);
    }
  });

  it('surfaces data_freshness for both sources', async () => {
    const env = makeEnv({
      'bls-indicators:current': SAMPLE_BLS,
      'fred-indicators:current': SAMPLE_FRED,
    });
    const r = await computeMacroDigest(env);
    if (!r.ok) return;
    expect(r.data_freshness.bls_captured_at).toBe('2026-05-06T05:00:00Z');
    expect(r.data_freshness.fred_captured_at).toBe('2026-05-06T05:30:00Z');
    expect(r.data_freshness.bls_indicator_count).toBe(6);
  });

  it('produces sensible headlines for each section', async () => {
    const env = makeEnv({
      'bls-indicators:current': SAMPLE_BLS,
      'fred-indicators:current': SAMPLE_FRED,
    });
    const r = await computeMacroDigest(env);
    if (!r.ok) return;
    expect(r.rates.headline).toContain('Fed funds');
    expect(r.inflation.headline.toLowerCase()).toContain('cpi');
    expect(r.employment.headline.toLowerCase()).toContain('unemployment');
  });
});
