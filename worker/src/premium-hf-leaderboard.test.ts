import { describe, it, expect } from 'vitest';
import { computeMovers, pickComparisonDate } from './premium-hf-leaderboard';
import type { LeaderboardSnapshot, LeaderboardEntry } from './hf-leaderboard';

function entry(over: Partial<LeaderboardEntry>): LeaderboardEntry {
  return {
    rank: 1, model_id: 'org/m', params_b: 7, precision: 'bfloat16', license: 'apache-2.0',
    base_model: null, type: 'pretrained', average: 50,
    scores: { ifeval: 60, bbh: 50, math_lvl_5: 30, gpqa: 40, musr: 45, mmlu_pro: 55 },
    submitted_at: null, ...over,
  };
}
function snap(date: string, entries: LeaderboardEntry[]): LeaderboardSnapshot {
  return { capturedAt: date, source: 'hf', total_models: entries.length, entries };
}

describe('computeMovers', () => {
  it('detects rank climbers and fallers with average deltas', () => {
    const prev = snap('2026-05-27', [
      entry({ model_id: 'a', rank: 1, average: 50 }),
      entry({ model_id: 'b', rank: 2, average: 48 }),
      entry({ model_id: 'c', rank: 3, average: 40 }),
    ]);
    const latest = snap('2026-06-03', [
      entry({ model_id: 'c', rank: 1, average: 52 }),
      entry({ model_id: 'a', rank: 2, average: 50 }),
      entry({ model_id: 'b', rank: 3, average: 47 }),
    ]);
    const m = computeMovers(prev, latest);
    expect(m.rank_climbers[0]).toMatchObject({ model_id: 'c', from_rank: 3, to_rank: 1, rank_change: 2 });
    expect(m.rank_climbers[0].average_change).toBe(12);
    expect(m.rank_fallers.map((d) => d.model_id).sort()).toEqual(['a', 'b']);
    expect(m.models_compared).toBe(3);
  });

  it('detects entered and exited models', () => {
    const prev = snap('2026-05-27', [entry({ model_id: 'a', rank: 1 }), entry({ model_id: 'old', rank: 2 })]);
    const latest = snap('2026-06-03', [entry({ model_id: 'a', rank: 1 }), entry({ model_id: 'new', rank: 2 })]);
    const m = computeMovers(prev, latest);
    expect(m.entered.map((e) => e.model_id)).toEqual(['new']);
    expect(m.exited.map((e) => e.model_id)).toEqual(['old']);
  });

  it('detects a new per-benchmark leader', () => {
    const hi = { ifeval: 95, bbh: 60, math_lvl_5: 40, gpqa: 50, musr: 55, mmlu_pro: 65 };
    const lo = { ifeval: 90, bbh: 55, math_lvl_5: 35, gpqa: 45, musr: 50, mmlu_pro: 60 };
    const prev = snap('2026-05-27', [entry({ model_id: 'a', average: 70, scores: hi }), entry({ model_id: 'b', average: 65, scores: lo })]);
    const latest = snap('2026-06-03', [
      entry({ model_id: 'b', average: 72, scores: { ifeval: 99, bbh: 70, math_lvl_5: 50, gpqa: 60, musr: 65, mmlu_pro: 75 } }),
      entry({ model_id: 'a', average: 70, scores: hi }),
    ]);
    const m = computeMovers(prev, latest);
    expect(m.new_leaders.find((l) => l.benchmark === 'ifeval')).toMatchObject({ model_id: 'b', prev_leader: 'a' });
  });

  it('detects license changes', () => {
    const prev = snap('2026-05-27', [entry({ model_id: 'a', license: 'apache-2.0' })]);
    const latest = snap('2026-06-03', [entry({ model_id: 'a', license: 'mit' })]);
    const m = computeMovers(prev, latest);
    expect(m.license_changes).toEqual([{ model_id: 'a', from_license: 'apache-2.0', to_license: 'mit' }]);
  });

  it('output has no em dashes or double hyphens', () => {
    const m = computeMovers(snap('2026-05-27', [entry({ model_id: 'a' })]), snap('2026-06-03', [entry({ model_id: 'a' })]));
    const json = JSON.stringify(m);
    expect([...json].some((c) => c.codePointAt(0) === 0x2014)).toBe(false);
    expect(json).not.toMatch(/--/);
  });
});

describe('pickComparisonDate', () => {
  const dates = ['2026-05-20', '2026-05-27', '2026-06-01', '2026-06-03'];
  it('picks the most recent date at least window days before latest', () => {
    expect(pickComparisonDate(dates, '2026-06-03', 7)).toBe('2026-05-27');
  });
  it('falls back to the oldest date when the series is shorter than the window', () => {
    expect(pickComparisonDate(dates, '2026-06-03', 60)).toBe('2026-05-20');
  });
  it('returns null when only the latest date exists', () => {
    expect(pickComparisonDate(['2026-06-03'], '2026-06-03', 7)).toBeNull();
  });
});
