import { describe, it, expect } from 'vitest';
import { parseRateString, computeDutyUsd } from './tariff-rates';

describe('parseRateString', () => {
  it('parses Free as a zero ad valorem rate', () => {
    const r = parseRateString('Free');
    expect(r.kind).toBe('free');
    expect(r.advalorem_pct).toBe(0);
  });

  it('parses a plain ad valorem percentage', () => {
    const r = parseRateString('6.8%');
    expect(r.kind).toBe('advalorem');
    expect(r.advalorem_pct).toBe(6.8);
    expect(r.specific).toEqual([]);
  });

  it('parses a cents-per-unit specific rate (cents to dollars)', () => {
    const r = parseRateString('2.5¢/kg');
    expect(r.kind).toBe('specific');
    expect(r.specific).toEqual([{ amount_usd: 0.025, per_unit: 'kg' }]);
    expect(r.advalorem_pct).toBeNull();
  });

  it('parses a dollars-per-unit specific rate', () => {
    const r = parseRateString('$1.50/liter');
    expect(r.kind).toBe('specific');
    expect(r.specific).toEqual([{ amount_usd: 1.5, per_unit: 'liter' }]);
  });

  it('parses a compound rate (specific plus ad valorem)', () => {
    const r = parseRateString('4.4¢/kg + 6%');
    expect(r.kind).toBe('compound');
    expect(r.specific).toEqual([{ amount_usd: 0.044, per_unit: 'kg' }]);
    expect(r.advalorem_pct).toBe(6);
  });

  it('parses a Chapter 99 add-on expressed relative to the base subheading', () => {
    const r = parseRateString('The duty provided in the applicable subheading + 7.5%');
    expect(r.kind).toBe('addon');
    expect(r.addon_pct).toBe(7.5);
  });

  it('returns unparseable for empty or unrecognized text', () => {
    expect(parseRateString('').kind).toBe('unparseable');
    expect(parseRateString('see chapter notes').kind).toBe('unparseable');
  });
});

describe('computeDutyUsd', () => {
  it('is zero for a Free rate', () => {
    expect(computeDutyUsd(parseRateString('Free'), { valueUsd: 1000 })).toBe(0);
  });

  it('computes ad valorem duty as a percentage of customs value', () => {
    expect(computeDutyUsd(parseRateString('6.8%'), { valueUsd: 1000 })).toBeCloseTo(68, 6);
  });

  it('computes specific duty from quantity and matching unit', () => {
    const r = parseRateString('2.5¢/kg');
    expect(computeDutyUsd(r, { valueUsd: 1000, quantity: 100, unit: 'kg' })).toBeCloseTo(2.5, 6);
  });

  it('computes compound duty as specific plus ad valorem', () => {
    const r = parseRateString('4.4¢/kg + 6%');
    expect(computeDutyUsd(r, { valueUsd: 1000, quantity: 100, unit: 'kg' })).toBeCloseTo(64.4, 6);
  });

  it('computes an add-on as a percentage of customs value', () => {
    const r = parseRateString('The duty provided in the applicable subheading + 7.5%');
    expect(computeDutyUsd(r, { valueUsd: 1000 })).toBeCloseTo(75, 6);
  });

  it('returns null for a specific rate when quantity is missing (cannot be computed)', () => {
    const r = parseRateString('2.5¢/kg');
    expect(computeDutyUsd(r, { valueUsd: 1000 })).toBeNull();
  });

  it('returns null for an unparseable rate', () => {
    expect(computeDutyUsd(parseRateString('see chapter notes'), { valueUsd: 1000 })).toBeNull();
  });
});
