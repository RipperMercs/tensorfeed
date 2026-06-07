import { describe, it, expect } from 'vitest';
import {
  CAPITAL_CYCLES,
  CAPITAL_CYCLES_LAST_UPDATED,
  GDP_DENOMINATOR,
  AI_CURRENT,
  deriveCurrentAiCycle,
  filterCapitalCycles,
} from './capital-cycles';

describe('CAPITAL_CYCLES registry', () => {
  it('has exactly six rows with unique ids', () => {
    expect(CAPITAL_CYCLES.length).toBe(6);
    expect(new Set(CAPITAL_CYCLES.map((c) => c.id)).size).toBe(6);
  });

  it('records at least one source per row with an http url', () => {
    for (const c of CAPITAL_CYCLES) {
      expect(c.sources.length).toBeGreaterThan(0);
      expect(c.sources[0].url.startsWith('http')).toBe(true);
    }
  });

  it('tags eras as pre_1931 or modern and includes at least one modern', () => {
    for (const c of CAPITAL_CYCLES) expect(['pre_1931', 'modern']).toContain(c.era);
    expect(CAPITAL_CYCLES.some((c) => c.era === 'modern')).toBe(true);
  });

  it('has a non-null peak_capex_pct_gdp for at least four cycles (the ranked axis)', () => {
    const ranked = CAPITAL_CYCLES.filter((c) => c.peak_capex_pct_gdp !== null);
    expect(ranked.length).toBeGreaterThanOrEqual(4);
  });

  it('marks radio-1929 as a null-capex equities outlier', () => {
    const radio = CAPITAL_CYCLES.find((c) => c.id === 'radio-1929');
    expect(radio).toBeDefined();
    expect(radio?.peak_capex_pct_gdp).toBeNull();
  });

  it('has a positive GDP denominator and a positive AI current capex, both sourced', () => {
    expect(GDP_DENOMINATOR.value_usd_t).toBeGreaterThan(0);
    expect(GDP_DENOMINATOR.source_url.startsWith('http')).toBe(true);
    expect(AI_CURRENT.annual_capex_usd_b).toBeGreaterThan(0);
    expect(AI_CURRENT.source_urls.length).toBeGreaterThan(0);
  });

  it('emits no em dashes or double hyphens anywhere in the registry', () => {
    const emDash = String.fromCharCode(0x2014);
    const doubleHyphen = '-' + '-';
    const json = JSON.stringify({ CAPITAL_CYCLES, GDP_DENOMINATOR, AI_CURRENT, CAPITAL_CYCLES_LAST_UPDATED });
    expect(json.includes(emDash)).toBe(false);
    expect(json.includes(doubleHyphen)).toBe(false);
  });
});

describe('deriveCurrentAiCycle', () => {
  it('computes capex as percent of GDP from the AI constant', () => {
    const cur = deriveCurrentAiCycle(
      { annual_capex_usd_b: 600, as_of: '2026', basis: 'b', range_low_pct: 0.8, range_high_pct: 2.4, source_urls: ['https://x'] },
      50000,
      31.8,
      '2026-06-04T00:00:00Z',
    );
    expect(cur).not.toBeNull();
    if (!cur) return;
    // 600 / (31.8 * 1000) * 100 = 1.8867... -> ~1.887
    expect(cur.peak_capex_pct_gdp).toBeCloseTo(1.887, 2);
    expect(cur.annual_capex_usd_b).toBe(600);
    expect(cur.physical_value).toBe(50000);
    expect(cur.capex_range_low_pct).toBe(0.8);
    expect(cur.in_progress).toBe(true);
  });

  it('returns null when the AI annual capex is zero (no rankable signal)', () => {
    const cur = deriveCurrentAiCycle(
      { annual_capex_usd_b: 0, as_of: '2026', basis: 'b', range_low_pct: 0, range_high_pct: 0, source_urls: ['https://x'] },
      50000,
      31.8,
      '2026-06-04T00:00:00Z',
    );
    expect(cur).toBeNull();
  });
});

describe('filterCapitalCycles', () => {
  it('filters by era and does not mutate the input', () => {
    const before = CAPITAL_CYCLES.length;
    const modern = filterCapitalCycles(CAPITAL_CYCLES, { era: 'modern' });
    expect(modern.every((c) => c.era === 'modern')).toBe(true);
    expect(CAPITAL_CYCLES.length).toBe(before);
  });
});
