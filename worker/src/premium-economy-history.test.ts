import { describe, it, expect } from 'vitest';
import {
  computeYoYSeries,
  computeMovingAverages,
  computeTrend3Obs,
  isValidSource,
  isValidSeriesId,
  getEconomySeriesHistory,
  NormalizedObservation,
} from './premium-economy-history';
import type { Env } from './types';

function makeKV(initial: Record<string, unknown>) {
  const store = new Map<string, unknown>(Object.entries(initial));
  return {
    get: async (key: string) => store.get(key) ?? null,
    put: async (key: string, value: string) => {
      store.set(key, JSON.parse(value));
    },
    delete: async () => undefined,
    list: async () => ({ keys: [] }),
  };
}

function makeEnv(initial: Record<string, unknown> = {}, fredKey?: string): Env {
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
    ...(fredKey ? { FRED_API_KEY: fredKey } : {}),
  };
}

function obs(date: string, value: number): NormalizedObservation {
  return { date, period_label: date, value, yoy_pct: null, ma_3: null, ma_12: null };
}

// ── Validation ─────────────────────────────────────────────────────

describe('isValidSource', () => {
  it('accepts bls and fred', () => {
    expect(isValidSource('bls')).toBe(true);
    expect(isValidSource('fred')).toBe(true);
  });
  it('rejects everything else', () => {
    expect(isValidSource('cps')).toBe(false);
    expect(isValidSource('')).toBe(false);
  });
});

describe('isValidSeriesId', () => {
  it('accepts standard BLS-style IDs', () => {
    expect(isValidSeriesId('CUUR0000SA0')).toBe(true);
    expect(isValidSeriesId('LNS14000000')).toBe(true);
    expect(isValidSeriesId('JTS000000000000000JOL')).toBe(true);
  });
  it('accepts standard FRED IDs', () => {
    expect(isValidSeriesId('DFF')).toBe(true);
    expect(isValidSeriesId('GDP')).toBe(true);
    expect(isValidSeriesId('T10Y2Y')).toBe(true);
    expect(isValidSeriesId('MORTGAGE30US')).toBe(true);
  });
  it('rejects malformed values', () => {
    expect(isValidSeriesId('A')).toBe(false);
    expect(isValidSeriesId('drop table series;')).toBe(false);
    expect(isValidSeriesId('series with spaces')).toBe(false);
    expect(isValidSeriesId('')).toBe(false);
  });
});

// ── computeYoYSeries ───────────────────────────────────────────────

describe('computeYoYSeries', () => {
  it('computes YoY for monthly series with 13+ months', () => {
    const series = [
      obs('2024-01-01', 100),
      obs('2024-06-01', 102),
      obs('2025-01-01', 105),
      obs('2025-06-01', 110),
    ];
    const out = computeYoYSeries(series);
    // 2025-01 vs 2024-01: (105 - 100) / 100 = 5%
    expect(out[2].yoy_pct).toBe(5);
    // 2025-06 vs 2024-06: (110 - 102) / 102 ≈ 7.84%
    expect(out[3].yoy_pct).toBeCloseTo(7.84, 1);
  });

  it('returns null for observations without a year-prior comparison', () => {
    const series = [obs('2025-01-01', 100), obs('2025-06-01', 102)];
    const out = computeYoYSeries(series);
    expect(out[0].yoy_pct).toBeNull();
    expect(out[1].yoy_pct).toBeNull();
  });

  it('handles empty input', () => {
    expect(computeYoYSeries([])).toEqual([]);
  });

  it('skips when prior value is zero', () => {
    const series = [obs('2024-01-01', 0), obs('2025-01-01', 5)];
    const out = computeYoYSeries(series);
    expect(out[1].yoy_pct).toBeNull();
  });
});

// ── computeMovingAverages ──────────────────────────────────────────

describe('computeMovingAverages', () => {
  it('computes 3-period MA correctly', () => {
    const series = [obs('1', 1), obs('2', 2), obs('3', 3), obs('4', 4), obs('5', 5)];
    const out = computeMovingAverages(series, [3]);
    expect(out[0].ma_3).toBeNull();
    expect(out[1].ma_3).toBeNull();
    expect(out[2].ma_3).toBe(2);  // (1+2+3)/3
    expect(out[3].ma_3).toBe(3);  // (2+3+4)/3
    expect(out[4].ma_3).toBe(4);  // (3+4+5)/3
  });

  it('computes 12-period MA only when enough data', () => {
    const series = Array.from({ length: 14 }, (_, i) => obs(String(i + 1), i + 1));
    const out = computeMovingAverages(series, [12]);
    expect(out[10].ma_12).toBeNull();
    expect(out[11].ma_12).toBe(6.5); // (1+2+...+12)/12 = 78/12 = 6.5
    expect(out[13].ma_12).toBe(8.5); // (3+4+...+14)/12
  });

  it('handles empty input', () => {
    expect(computeMovingAverages([], [3, 12])).toEqual([]);
  });
});

// ── computeTrend3Obs ───────────────────────────────────────────────

describe('computeTrend3Obs', () => {
  it('returns up when most-recent 3 trend up', () => {
    expect(computeTrend3Obs([obs('1', 1), obs('2', 5), obs('3', 9)])).toBe('up');
  });

  it('returns down when most-recent 3 trend down', () => {
    expect(computeTrend3Obs([obs('1', 9), obs('2', 5), obs('3', 1)])).toBe('down');
  });

  it('returns flat when first and last are within 0.5% of total range', () => {
    const series = [obs('1', 100), obs('2', 200), obs('3', 100.4)];
    expect(computeTrend3Obs(series)).toBe('flat');
  });

  it('returns unknown when fewer than 3 observations', () => {
    expect(computeTrend3Obs([])).toBe('unknown');
    expect(computeTrend3Obs([obs('1', 1), obs('2', 2)])).toBe('unknown');
  });
});

// ── getEconomySeriesHistory (cached path only; live fetch not exercised) ──

describe('getEconomySeriesHistory: validation', () => {
  it('rejects invalid series ID', async () => {
    const env = makeEnv();
    const r = await getEconomySeriesHistory(env, 'bls', 'drop tables;');
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.error).toBe('invalid_series_id');
  });

  it('rejects FRED request when key unset', async () => {
    const env = makeEnv();
    const r = await getEconomySeriesHistory(env, 'fred', 'GDP');
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.error).toBe('fred_key_unset');
  });
});

describe('getEconomySeriesHistory: cached path', () => {
  it('serves from KV cache without upstream fetch', async () => {
    const cached = {
      observations: [
        obs('2024-01-01', 100),
        obs('2024-02-01', 101),
        obs('2024-03-01', 102),
        obs('2025-01-01', 105),
      ],
      capturedAt: '2026-05-06T18:00:00Z',
    };
    const env = makeEnv({ 'premium-econ-history:bls:CUUR0000SA0': cached });
    const r = await getEconomySeriesHistory(env, 'bls', 'CUUR0000SA0');
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    expect(r.observations_count).toBe(4);
    expect(r.observations[3].yoy_pct).toBe(5); // 2025-01 vs 2024-01
    expect(r.observations[2].ma_3).toBe(101);  // (100+101+102)/3
    expect(r.summary.min?.value).toBe(100);
    expect(r.summary.max?.value).toBe(105);
  });

  it('uppercases series id for cache lookups', async () => {
    const cached = {
      observations: [obs('2024-01-01', 100)],
      capturedAt: '2026-05-06T18:00:00Z',
    };
    const env = makeEnv({ 'premium-econ-history:bls:CUUR0000SA0': cached });
    const r = await getEconomySeriesHistory(env, 'bls', 'cuur0000sa0');
    expect(r.ok).toBe(true);
    if (r.ok) expect(r.series_id).toBe('CUUR0000SA0');
  });

  it('attaches attribution with derivation note', async () => {
    const cached = {
      observations: [obs('2024-01-01', 100)],
      capturedAt: '2026-05-06T18:00:00Z',
    };
    const env = makeEnv({ 'premium-econ-history:bls:DFF': cached });
    const r = await getEconomySeriesHistory(env, 'bls', 'DFF');
    expect(r.ok).toBe(true);
    if (r.ok) {
      expect(r.attribution.derivation.toLowerCase()).toContain('moving averages');
      expect(r.attribution.license).toContain('Public domain');
    }
  });

  it('FRED attribution carries the FRED-specific note', async () => {
    const cached = {
      observations: [obs('2024-01-01', 4.33)],
      capturedAt: '2026-05-06T18:00:00Z',
    };
    const env = makeEnv({ 'premium-econ-history:fred:DFF': cached }, 'TEST_KEY');
    const r = await getEconomySeriesHistory(env, 'fred', 'DFF');
    expect(r.ok).toBe(true);
    if (r.ok) {
      expect(r.attribution.source).toContain('FRED');
      expect(r.attribution.source_url).toContain('fred.stlouisfed.org');
    }
  });
});
