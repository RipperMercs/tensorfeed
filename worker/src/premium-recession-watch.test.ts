import { describe, it, expect } from 'vitest';
import {
  classifyYieldCurveSignal,
  computeSahm,
  classifySahmSignal,
  classifyComposite,
  computeRecessionWatch,
  RECESSION_WATCH_ATTRIBUTION,
} from './premium-recession-watch';
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

// ── Yield curve ────────────────────────────────────────────────────

describe('classifyYieldCurveSignal', () => {
  it('returns unknown for null spread', () => {
    const r = classifyYieldCurveSignal(null);
    expect(r.level).toBe('unknown');
    expect(r.spread_10y_2y).toBeNull();
  });
  it('returns red for deeply inverted', () => {
    const r = classifyYieldCurveSignal(-0.5);
    expect(r.level).toBe('red');
    expect(r.explanation.toLowerCase()).toContain('inverted');
  });
  it('returns yellow for mildly inverted', () => {
    expect(classifyYieldCurveSignal(-0.1).level).toBe('yellow');
  });
  it('returns yellow for flat', () => {
    expect(classifyYieldCurveSignal(0.2).level).toBe('yellow');
  });
  it('returns green for normal', () => {
    expect(classifyYieldCurveSignal(1).level).toBe('green');
    expect(classifyYieldCurveSignal(2).level).toBe('green');
  });
});

// ── Sahm rule ──────────────────────────────────────────────────────

function unempEntry(values: number[]): { series_id: string; observations: { year: number; month: number; period_label: string; value: number }[]; latest: { year: number; month: number; period_label: string; value: number } | null } {
  const obs = values.map((v, i) => {
    const year = 2025 + Math.floor(i / 12);
    const month = (i % 12) + 1;
    return { year, month, period_label: `${month}-${year}`, value: v };
  });
  return {
    series_id: 'LNS14000000',
    observations: obs,
    latest: obs[obs.length - 1] ?? null,
  };
}

describe('computeSahm', () => {
  it('returns nulls when fewer than 14 observations', () => {
    const r = computeSahm(unempEntry([3.5, 3.6, 3.7]));
    expect(r.sahm).toBeNull();
    expect(r.three_mo_avg).toBeNull();
  });

  it('computes Sahm correctly when unemployment is rising', () => {
    // 14 obs: 12 months of 3.5, then 2 months ramping to 4.0.
    const series = [
      3.5, 3.5, 3.5, 3.5, 3.5, 3.5, 3.5, 3.5, 3.5, 3.5, 3.5, 3.5,
      3.7, 4.0, // last 3-mo avg = (3.5+3.7+4.0)/3 = 3.733
    ];
    const r = computeSahm(unempEntry(series));
    expect(r.three_mo_avg).toBeCloseTo(3.73, 2);
    expect(r.twelve_mo_low).toBeCloseTo(3.5, 2);
    expect(r.sahm).toBeCloseTo(0.23, 2);
  });

  it('returns null when entry is null', () => {
    const r = computeSahm(null);
    expect(r.sahm).toBeNull();
  });

  it('includes the two most-recent trailing windows in the 12-month low', () => {
    // The corrected loop must start the first trailing window at index len-2
    // (one month before current), not len-4. Construct a series whose true
    // 12-month low sits in one of the two windows the old off-by-two loop
    // skipped, so the bug would have over-counted twelve_mo_low and
    // under-reported the Sahm value.
    // len = 16. Current 3-mo window = indices 13..15.
    // The low 3.0 appears at index 13, which only the window ending at
    // index 14 (indices 12..14) or 13 (11..13) can capture. The buggy loop
    // started at endIdx = len-4 = 12 (window 10..12), missing index 13.
    const series = [
      4.0, 4.0, 4.0, 4.0, 4.0, 4.0, 4.0, 4.0, 4.0, 4.0, 4.0, 4.0,
      4.0, 3.0, 4.5, 5.0,
    ];
    const r = computeSahm(unempEntry(series));
    // Current 3-mo avg = (4.0 + 3.0 + 4.5... wait current = idx 13,14,15)
    // = (3.0 + 4.5 + 5.0) / 3 = 4.1667
    expect(r.three_mo_avg).toBeCloseTo(4.17, 2);
    // First trailing window ends at index 14 (indices 12..14) = (4.0+3.0+4.5)/3 = 3.8333,
    // next ends at 13 (indices 11..13) = (4.0+4.0+3.0)/3 = 3.6667 -> the true low.
    expect(r.twelve_mo_low).toBeCloseTo(3.67, 2);
    expect(r.sahm).toBeCloseTo(0.5, 2);
  });

  it('produces 12 trailing windows that stop at index len-13', () => {
    // len = 25. The 12 trailing windows end at indices len-2 (23) down to
    // len-13 (12); the oldest index any of them reads is 12-2 = 10. A dip
    // at index 9 is therefore out of span and must not lower the low, while
    // a dip at index 12 is in span and must lower it.
    const base = new Array(25).fill(5.0);
    base[9] = 1.0; // out of the trailing span (oldest covered index is 10)
    const rOut = computeSahm(unempEntry(base));
    expect(rOut.twelve_mo_low).toBeCloseTo(5.0, 2);

    const base2 = new Array(25).fill(5.0);
    base2[12] = 1.0; // index len-13: read by the oldest trailing window
    const rIn = computeSahm(unempEntry(base2));
    expect(rIn.twelve_mo_low).toBeLessThan(5.0);
  });
});

describe('classifySahmSignal', () => {
  it('returns unknown when entry is null', () => {
    expect(classifySahmSignal(null).level).toBe('unknown');
  });

  it('returns red when sahm exceeds 0.5pp', () => {
    // Build a series that triggers Sahm: 12 months at 3.5, then 3.5/4.5/5.0
    const series = [
      3.5, 3.5, 3.5, 3.5, 3.5, 3.5, 3.5, 3.5, 3.5, 3.5, 3.5, 3.5,
      3.5, 4.5, 5.0,
    ];
    const r = classifySahmSignal(unempEntry(series));
    expect(r.level).toBe('red');
  });

  it('returns yellow when sahm is between 0.3 and 0.5', () => {
    const series = [
      3.5, 3.5, 3.5, 3.5, 3.5, 3.5, 3.5, 3.5, 3.5, 3.5, 3.5, 3.5,
      3.7, 4.0, 4.0, // 3-mo avg = 3.9, low = 3.5, sahm = 0.4
    ];
    const r = classifySahmSignal(unempEntry(series));
    expect(r.level).toBe('yellow');
  });

  it('returns green when sahm is well below threshold', () => {
    const series = [
      3.5, 3.5, 3.5, 3.5, 3.5, 3.5, 3.5, 3.5, 3.5, 3.5, 3.5, 3.5,
      3.5, 3.5, 3.5,
    ];
    const r = classifySahmSignal(unempEntry(series));
    expect(r.level).toBe('green');
    expect(r.sahm_value).toBeCloseTo(0, 2);
  });
});

// ── Composite ──────────────────────────────────────────────────────

describe('classifyComposite', () => {
  it('returns red when either signal is red', () => {
    expect(classifyComposite('red', 'green').level).toBe('red');
    expect(classifyComposite('green', 'red').level).toBe('red');
  });
  it('returns green only when both are green', () => {
    expect(classifyComposite('green', 'green').level).toBe('green');
  });
  it('returns yellow for mixed warm signals', () => {
    expect(classifyComposite('yellow', 'green').level).toBe('yellow');
    expect(classifyComposite('yellow', 'yellow').level).toBe('yellow');
  });
  it('returns unknown when both are unknown', () => {
    const r = classifyComposite('unknown', 'unknown');
    expect(r.level).toBe('unknown');
  });
  it('computes a score between 0 and 100', () => {
    expect(classifyComposite('green', 'green').score).toBe(0);
    expect(classifyComposite('red', 'red').score).toBe(100);
    expect(classifyComposite('yellow', 'yellow').score).toBe(50);
    expect(classifyComposite('green', 'yellow').score).toBe(25);
  });
});

// ── computeRecessionWatch ──────────────────────────────────────────

describe('computeRecessionWatch', () => {
  it('returns no_snapshots_yet when both upstreams empty', async () => {
    const env = makeEnv({});
    const r = await computeRecessionWatch(env);
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.error).toBe('no_snapshots_yet');
  });

  it('returns ok with both snapshots present', async () => {
    const blsSnap = {
      capturedAt: '2026-05-06T05:00:00Z',
      indicators: [unempEntry([
        3.5, 3.5, 3.5, 3.5, 3.5, 3.5, 3.5, 3.5, 3.5, 3.5, 3.5, 3.5,
        3.5, 3.5, 3.5,
      ])],
    };
    const fredSnap = {
      capturedAt: '2026-05-06T05:30:00Z',
      indicators: [{
        series_id: 'T10Y2Y',
        observations: [{ date: '2026-05-05', value: 0.32 }],
        latest: { date: '2026-05-05', value: 0.32 },
      }],
    };
    const env = makeEnv({
      'bls-indicators:current': blsSnap,
      'fred-indicators:current': fredSnap,
    });
    const r = await computeRecessionWatch(env);
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    expect(r.yield_curve.level).toBe('yellow'); // flat curve at 0.32
    expect(r.sahm_rule.level).toBe('green');
    expect(r.composite.level).toBe('yellow'); // mixed
    expect(r.brief.length).toBeGreaterThan(20);
  });

  it('reports notes when one upstream is missing', async () => {
    const blsSnap = {
      capturedAt: '2026-05-06T05:00:00Z',
      indicators: [unempEntry([
        3.5, 3.5, 3.5, 3.5, 3.5, 3.5, 3.5, 3.5, 3.5, 3.5, 3.5, 3.5,
        3.5, 3.5, 3.5,
      ])],
    };
    const env = makeEnv({ 'bls-indicators:current': blsSnap });
    const r = await computeRecessionWatch(env);
    if (!r.ok) return;
    expect(r.notes.some(n => n.includes('FRED'))).toBe(true);
    expect(r.yield_curve.level).toBe('unknown');
    expect(r.sahm_rule.level).toBe('green');
  });

  it('attaches attribution', async () => {
    const blsSnap = {
      capturedAt: '2026-05-06T05:00:00Z',
      indicators: [unempEntry([3.5])],
    };
    const env = makeEnv({ 'bls-indicators:current': blsSnap });
    const r = await computeRecessionWatch(env);
    if (!r.ok) return;
    expect(r.attribution).toEqual(RECESSION_WATCH_ATTRIBUTION);
    expect(r.attribution.notes.toLowerCase()).toContain('sahm');
  });
});
