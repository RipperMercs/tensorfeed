import { describe, it, expect } from 'vitest';
import { buildCapexCycleVerdict } from './premium-capex-cycle-verdict';
import type { CapitalCycleEntry, CurrentAiCycle } from './capital-cycles';

const NOW = new Date('2026-06-07T12:00:00Z');

function row(id: string, capex: number | null, drawdown: number | null = null): CapitalCycleEntry {
  return {
    id,
    name: id,
    era: 'pre_1931',
    period: '1900-1910',
    lead_sector: 'test',
    peak_capex_pct_gdp: capex,
    capex_pct_gdp_basis: 'basis',
    real_capital_raised_usd_b: null,
    physical_unit: 'units',
    physical_value: 100,
    overbuild_ratio: 2,
    peak_to_trough_drawdown_pct: drawdown,
    boom_to_bust_years: 5,
    survival_rate_pct: 40,
    analogy_note: 'note for ' + id,
    sources: [{ name: 's', url: 'https://example.com', license: 'PD' }],
    confidence: 'medium',
  };
}

function current(capex: number | null): CurrentAiCycle {
  return {
    id: 'ai-buildout',
    name: 'AI infrastructure buildout',
    era: 'modern',
    peak_capex_pct_gdp: capex,
    annual_capex_usd_b: 600,
    capex_range_low_pct: 0.8,
    capex_range_high_pct: 2.4,
    physical_unit: 'datacenter MW (disclosed)',
    physical_value: 50000,
    in_progress: true,
    captured_at: '2026-06-04T00:00:00Z',
    basis: 'b',
  };
}

describe('buildCapexCycleVerdict', () => {
  it('rules UNPRECEDENTED when current exceeds every ranked prior', () => {
    const r = buildCapexCycleVerdict([row('a', 1), row('b', 2), row('c', 3)], current(9), '2026-06-07', NOW);
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    expect(r.verdict).toBe('UNPRECEDENTED');
    expect(r.exceeds_all_priors).toBe(true);
    expect(r.current_rank).toBe(1);
    expect(r.ranking[0].is_current).toBe(true);
  });

  it('rules MODERATE when current sits at the bottom', () => {
    const r = buildCapexCycleVerdict([row('a', 1), row('b', 2), row('c', 3)], current(0.5), '2026-06-07', NOW);
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    expect(r.verdict).toBe('MODERATE');
    expect(r.current_rank).toBe(4);
    expect(r.total_ranked).toBe(4);
  });

  it('rules ELEVATED in the middle and picks the nearest analog', () => {
    const set = [row('a', 1), row('b', 2), row('c', 3), row('d', 4), row('e', 5)];
    const r = buildCapexCycleVerdict(set, current(2.1), '2026-06-07', NOW);
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    expect(r.verdict).toBe('ELEVATED');
    expect(r.current_rank).toBe(4);
    expect(r.closest_analog?.cycle_id).toBe('b');
    expect(r.diverges_from?.cycle_id).toBe('e');
  });

  it('excludes null-capex cycles from the ranking and lists them as sentiment outliers', () => {
    const set = [row('a', 1), row('b', 2), row('radio', null, 98)];
    const r = buildCapexCycleVerdict(set, current(1.5), '2026-06-07', NOW);
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    expect(r.ranking.some((x) => x.id === 'radio')).toBe(false);
    expect(r.sentiment_outliers.map((o) => o.cycle_id)).toContain('radio');
    expect(r.sentiment_outliers[0].peak_to_trough_drawdown_pct).toBe(98);
    expect(r.total_ranked).toBe(3); // a, b, current
  });

  it('lists the post-bust dimensions as not_yet_measurable', () => {
    const r = buildCapexCycleVerdict([row('a', 1), row('b', 2)], current(1.5), '2026-06-07', NOW);
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    expect(r.not_yet_measurable).toEqual(
      expect.arrayContaining(['overbuild_ratio', 'peak_to_trough_drawdown_pct', 'boom_to_bust_years', 'survival_rate_pct']),
    );
  });

  it('no-charges when the current cycle is null', () => {
    const r = buildCapexCycleVerdict([row('a', 1)], null, '2026-06-07', NOW);
    expect(r.ok).toBe(false);
    if (r.ok) return;
    expect(r.error).toBe('inputs_unavailable');
  });

  it('no-charges when the current cycle has a null capex share', () => {
    const r = buildCapexCycleVerdict([row('a', 1)], current(null), '2026-06-07', NOW);
    expect(r.ok).toBe(false);
    if (r.ok) return;
    expect(r.error).toBe('inputs_unavailable');
  });

  it('emits no em dashes or double hyphens in any output string', () => {
    const emDash = String.fromCharCode(0x2014);
    const doubleHyphen = '-' + '-';
    const ok = buildCapexCycleVerdict([row('a', 1), row('b', 2), row('radio', null, 98)], current(1.5), '2026-06-07', NOW);
    const empty = buildCapexCycleVerdict([row('a', 1)], null, '2026-06-07', NOW);
    for (const json of [JSON.stringify(ok), JSON.stringify(empty)]) {
      expect(json.includes(emDash)).toBe(false);
      expect(json.includes(doubleHyphen)).toBe(false);
    }
  });
});
