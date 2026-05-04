import { describe, it, expect } from 'vitest';
import { evaluateSpendCap, validateSpendCap, dailySpentKey, nextUTCMidnight } from './spend-cap';

describe('evaluateSpendCap', () => {
  it('allows everything when cap is null', () => {
    const r = evaluateSpendCap(null, 100, 50);
    expect(r.allowed).toBe(true);
    expect(r.daily_cap).toBeNull();
    expect(r.remaining).toBeNull();
    expect(r.would_exceed_by).toBe(0);
  });

  it('allows everything when cap is undefined', () => {
    const r = evaluateSpendCap(undefined, 100, 50);
    expect(r.allowed).toBe(true);
    expect(r.daily_cap).toBeNull();
  });

  it('treats cap<=0 as "no cap" rather than "always block"', () => {
    expect(evaluateSpendCap(0, 100, 1).allowed).toBe(true);
    expect(evaluateSpendCap(-5, 100, 1).allowed).toBe(true);
  });

  it('allows when projected stays within cap', () => {
    const r = evaluateSpendCap(100, 50, 25);
    expect(r.allowed).toBe(true);
    expect(r.remaining).toBe(50);
    expect(r.would_exceed_by).toBe(0);
  });

  it('allows exactly at the cap boundary', () => {
    const r = evaluateSpendCap(100, 50, 50);
    expect(r.allowed).toBe(true);
    expect(r.would_exceed_by).toBe(0);
  });

  it('blocks when projected exceeds cap', () => {
    const r = evaluateSpendCap(100, 80, 25);
    expect(r.allowed).toBe(false);
    expect(r.would_exceed_by).toBe(5);
    expect(r.remaining).toBe(20);
  });

  it('blocks correctly when already at or over cap', () => {
    const atCap = evaluateSpendCap(100, 100, 1);
    expect(atCap.allowed).toBe(false);
    expect(atCap.would_exceed_by).toBe(1);
    expect(atCap.remaining).toBe(0);

    const overCap = evaluateSpendCap(100, 105, 1);
    expect(overCap.allowed).toBe(false);
    expect(overCap.would_exceed_by).toBe(6);
    expect(overCap.remaining).toBe(0);
  });

  it('handles negative pendingCost as zero', () => {
    const r = evaluateSpendCap(100, 50, -10);
    expect(r.allowed).toBe(true);
    expect(r.would_exceed_by).toBe(0);
  });

  it('always reports a reset_at timestamp', () => {
    const r = evaluateSpendCap(100, 0, 0);
    expect(r.reset_at).toMatch(/^\d{4}-\d{2}-\d{2}T00:00:00\.000Z$/);
  });
});

describe('validateSpendCap', () => {
  it('accepts null as "clear cap"', () => {
    const r = validateSpendCap(null);
    expect(r.ok).toBe(true);
    expect(r.value).toBeNull();
  });

  it('treats 0 as "clear cap"', () => {
    const r = validateSpendCap(0);
    expect(r.ok).toBe(true);
    expect(r.value).toBeNull();
  });

  it('accepts positive integers in range', () => {
    expect(validateSpendCap(1)).toEqual({ ok: true, value: 1 });
    expect(validateSpendCap(100)).toEqual({ ok: true, value: 100 });
    expect(validateSpendCap(1_000_000)).toEqual({ ok: true, value: 1_000_000 });
  });

  it('rejects non-numbers', () => {
    expect(validateSpendCap('100').ok).toBe(false);
    expect(validateSpendCap('100').error).toBe('cap_must_be_number_or_null');
    expect(validateSpendCap(true).ok).toBe(false);
    expect(validateSpendCap({}).ok).toBe(false);
    expect(validateSpendCap(undefined).ok).toBe(false);
  });

  it('rejects non-finite numbers', () => {
    expect(validateSpendCap(Infinity).ok).toBe(false);
    expect(validateSpendCap(NaN).ok).toBe(false);
  });

  it('rejects floats', () => {
    expect(validateSpendCap(50.5).ok).toBe(false);
    expect(validateSpendCap(50.5).error).toBe('cap_must_be_integer');
  });

  it('rejects out-of-range values', () => {
    expect(validateSpendCap(-1).ok).toBe(false);
    expect(validateSpendCap(1_000_001).ok).toBe(false);
  });
});

describe('dailySpentKey', () => {
  it('combines token and date with the pay:spend prefix', () => {
    expect(dailySpentKey('tf_live_abc', '2026-05-04')).toBe('pay:spend:tf_live_abc:2026-05-04');
  });
});

describe('nextUTCMidnight', () => {
  it('returns ISO string at next 00:00:00 UTC', () => {
    const r = nextUTCMidnight(new Date('2026-05-04T15:30:00Z'));
    expect(r).toBe('2026-05-05T00:00:00.000Z');
  });

  it('rolls over month boundaries', () => {
    const r = nextUTCMidnight(new Date('2026-05-31T23:59:59Z'));
    expect(r).toBe('2026-06-01T00:00:00.000Z');
  });

  it('rolls over year boundaries', () => {
    const r = nextUTCMidnight(new Date('2026-12-31T12:00:00Z'));
    expect(r).toBe('2027-01-01T00:00:00.000Z');
  });
});
