import { describe, it, expect } from 'vitest';
import {
  resolveRange,
  projectORSeries,
  MAX_RANGE_DAYS,
  DEFAULT_RANGE_DAYS,
  OPENROUTER_ATTRIBUTION,
} from './or-series';
import type { ORSnapshot, ORModel } from './openrouter-catalog';

function model(id: string, p: number | null, c: number | null): ORModel {
  return {
    id,
    name: id,
    description: null,
    created: null,
    context_length: null,
    modality: null,
    instruct_type: null,
    tokenizer: null,
    pricing: { prompt: p, completion: c, image: null, request: null },
    top_provider: { max_completion_tokens: null, is_moderated: null },
    supported_parameters: [],
  };
}

function snap(
  date: string,
  models: Array<{ id: string; p: number | null; c: number | null }>,
  over: Partial<ORSnapshot['summary']> = {},
): ORSnapshot {
  return {
    date,
    capturedAt: `${date}T14:00:00.000Z`,
    total_models: models.length,
    models: models.map((m) => model(m.id, m.p, m.c)),
    summary: {
      by_namespace: over.by_namespace ?? [{ namespace: 'anthropic', count: models.length }],
      by_modality: over.by_modality ?? {},
      cheapest_input: over.cheapest_input ?? { id: 'x', usd_per_million: 1 },
      cheapest_output: over.cheapest_output ?? { id: 'x', usd_per_million: 2 },
      largest_context: over.largest_context ?? null,
      free_tier_count: over.free_tier_count ?? 0,
    },
  };
}

const daySpan = (from: string, to: string): number =>
  Math.round(
    (new Date(`${to}T00:00:00Z`).getTime() - new Date(`${from}T00:00:00Z`).getTime()) /
      86_400_000,
  );

describe('resolveRange', () => {
  it('defaults to a trailing DEFAULT_RANGE_DAYS window when from/to omitted', () => {
    const r = resolveRange(null, null);
    expect(r.ok).toBe(true);
    expect(r.to).toBe(new Date().toISOString().slice(0, 10));
    expect(daySpan(r.from!, r.to!) + 1).toBe(DEFAULT_RANGE_DAYS);
  });

  it('rejects a malformed to date', () => {
    expect(resolveRange(null, 'nope')).toEqual({ ok: false, error: 'invalid_to_date' });
  });

  it('rejects a malformed from date', () => {
    expect(resolveRange('bad', '2026-05-10')).toEqual({
      ok: false,
      error: 'invalid_from_date',
    });
  });

  it('rejects from after to', () => {
    expect(resolveRange('2026-05-10', '2026-05-01')).toEqual({
      ok: false,
      error: 'from_after_to',
    });
  });

  it('rejects a range exceeding the max', () => {
    expect(resolveRange('2026-01-01', '2026-05-01')).toEqual({
      ok: false,
      error: 'range_exceeds_max_days',
    });
  });

  it('accepts a range exactly at the max boundary', () => {
    const to = '2026-05-01';
    const from = '2026-02-01'; // 89-day span, 90 days inclusive == MAX
    const r = resolveRange(from, to);
    expect(r.ok).toBe(true);
    expect(daySpan(r.from!, r.to!) + 1).toBe(MAX_RANGE_DAYS);
  });

  it('echoes an explicit valid range', () => {
    expect(resolveRange('2026-05-01', '2026-05-10')).toEqual({
      ok: true,
      from: '2026-05-01',
      to: '2026-05-10',
    });
  });
});

describe('projectORSeries', () => {
  it('marks every day no-data for an empty range and notes it', () => {
    const dates = ['2026-05-01', '2026-05-02', '2026-05-03'];
    const r = projectORSeries('2026-05-01', '2026-05-03', dates.map((date) => ({ date, snap: null })));
    expect(r.days).toBe(3);
    expect(r.points.every((p) => p.has_data === false)).toBe(true);
    expect(r.delta_in_window.start_total).toBeNull();
    expect(r.delta_in_window.net).toBeNull();
    expect(r.notes.some((n) => n.includes('No captured snapshots'))).toBe(true);
  });

  it('leaves churn null on a single data day and notes it', () => {
    const r = projectORSeries('2026-05-01', '2026-05-01', [
      { date: '2026-05-01', snap: snap('2026-05-01', [{ id: 'a', p: 1, c: 2 }]) },
    ]);
    expect(r.points[0].has_data).toBe(true);
    expect(r.points[0].added).toBeNull();
    expect(r.points[0].removed).toBeNull();
    expect(r.points[0].price_changes).toBeNull();
    expect(r.notes.some((n) => n.includes('Only one day has data'))).toBe(true);
  });

  it('computes add, remove, and price-change versus the prior has-data day', () => {
    const d1 = snap('2026-05-01', [
      { id: 'a', p: 1, c: 2 },
      { id: 'b', p: 3, c: 4 },
      { id: 'e', p: 7, c: 8 },
    ]);
    const d2 = snap('2026-05-02', [
      { id: 'a', p: 1, c: 2 }, // unchanged
      { id: 'b', p: 3, c: 9 }, // completion changed
      { id: 'd', p: 5, c: 6 }, // added
      // 'e' removed
    ]);
    const r = projectORSeries('2026-05-01', '2026-05-02', [
      { date: '2026-05-01', snap: d1 },
      { date: '2026-05-02', snap: d2 },
    ]);
    expect(r.points[0].added).toBeNull(); // first has-data day
    expect(r.points[1].added).toBe(1);
    expect(r.points[1].removed).toBe(1);
    expect(r.points[1].price_changes).toBe(1);
    expect(r.points[1].added_sample).toContain('d');
    expect(r.points[1].removed_sample).toContain('e');
  });

  it('computes churn against the prior has-data day, not a gap day', () => {
    const a = snap('2026-05-01', [{ id: 'a', p: 1, c: 2 }]);
    const b = snap('2026-05-03', [
      { id: 'a', p: 1, c: 2 },
      { id: 'b', p: 3, c: 4 },
    ]);
    const r = projectORSeries('2026-05-01', '2026-05-03', [
      { date: '2026-05-01', snap: a },
      { date: '2026-05-02', snap: null },
      { date: '2026-05-03', snap: b },
    ]);
    expect(r.points[1].has_data).toBe(false);
    expect(r.points[2].added).toBe(1); // vs 2026-05-01, not the null gap
    expect(r.points[2].removed).toBe(0);
    expect(r.points[2].price_changes).toBe(0);
  });

  it('reports window delta over the first and last has-data day', () => {
    const d1 = snap('2026-05-01', [{ id: 'a', p: 1, c: 2 }], {
      cheapest_input: { id: 'a', usd_per_million: 5 },
      cheapest_output: { id: 'a', usd_per_million: 9 },
    });
    const d2 = snap(
      '2026-05-02',
      [
        { id: 'a', p: 1, c: 2 },
        { id: 'b', p: 3, c: 4 },
      ],
      {
        cheapest_input: { id: 'b', usd_per_million: 3 },
        cheapest_output: { id: 'b', usd_per_million: 7 },
      },
    );
    const r = projectORSeries('2026-05-01', '2026-05-02', [
      { date: '2026-05-01', snap: d1 },
      { date: '2026-05-02', snap: d2 },
    ]);
    expect(r.delta_in_window.start_total).toBe(1);
    expect(r.delta_in_window.end_total).toBe(2);
    expect(r.delta_in_window.net).toBe(1);
    expect(r.delta_in_window.cheapest_input_start).toBe(5);
    expect(r.delta_in_window.cheapest_input_end).toBe(3);
    expect(r.delta_in_window.cheapest_output_start).toBe(9);
    expect(r.delta_in_window.cheapest_output_end).toBe(7);
  });

  it('echoes range, day count, and the static attribution block', () => {
    const r = projectORSeries('2026-05-01', '2026-05-02', [
      { date: '2026-05-01', snap: snap('2026-05-01', [{ id: 'a', p: 1, c: 2 }]) },
      { date: '2026-05-02', snap: snap('2026-05-02', [{ id: 'a', p: 1, c: 2 }]) },
    ]);
    expect(r.from).toBe('2026-05-01');
    expect(r.to).toBe('2026-05-02');
    expect(r.days).toBe(2);
    expect(r.attribution).toBe(OPENROUTER_ATTRIBUTION);
  });
});
