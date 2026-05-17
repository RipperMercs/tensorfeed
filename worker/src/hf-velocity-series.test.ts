import { describe, it, expect } from 'vitest';
import {
  resolveRange,
  projectHFVelocitySeries,
  HF_ATTRIBUTION,
  MAX_RANGE_DAYS,
  DEFAULT_RANGE_DAYS,
} from './hf-velocity-series';
import type {
  HFSnapshot,
  HFModelEntry,
  HFDatasetEntry,
  HFSpaceEntry,
} from './hf-trending';

function mItem(id: string, downloads: number): HFModelEntry {
  return {
    id,
    downloads,
    likes: 0,
    pipeline_tag: null,
    tags: [],
    lastModified: null,
    private: false,
    gated: false,
  };
}

function dItem(id: string, downloads: number): HFDatasetEntry {
  return { id, downloads, likes: 0, tags: [], lastModified: null, private: false, gated: false };
}

function sItem(id: string, likes: number): HFSpaceEntry {
  return {
    id,
    author: null,
    sdk: null,
    likes,
    tags: [],
    lastModified: null,
    private: false,
    runtime_stage: null,
    hardware: null,
  };
}

function snap(
  date: string,
  models: HFModelEntry[],
  datasets: HFDatasetEntry[] = [],
  spaces: HFSpaceEntry[] = [],
): HFSnapshot {
  return {
    date,
    capturedAt: `${date}T12:00:00Z`,
    models: { sort: 'downloads', count: models.length, items: models },
    datasets: { sort: 'downloads', count: datasets.length, items: datasets },
    spaces: { sort: 'likes', count: spaces.length, items: spaces },
    summary: { top_pipeline_tags: [], top_namespaces: [], top_space_sdks: [] },
  };
}

const daySpan = (from: string, to: string): number =>
  Math.round(
    (new Date(`${to}T00:00:00Z`).getTime() - new Date(`${from}T00:00:00Z`).getTime()) /
      86_400_000,
  );

describe('resolveRange', () => {
  it('defaults to a trailing DEFAULT_RANGE_DAYS window', () => {
    const r = resolveRange(null, null);
    expect(r.ok).toBe(true);
    expect(r.to).toBe(new Date().toISOString().slice(0, 10));
    expect(daySpan(r.from!, r.to!) + 1).toBe(DEFAULT_RANGE_DAYS);
  });

  it('rejects malformed dates and inverted ranges', () => {
    expect(resolveRange(null, 'nope')).toEqual({ ok: false, error: 'invalid_to_date' });
    expect(resolveRange('bad', '2026-05-10')).toEqual({ ok: false, error: 'invalid_from_date' });
    expect(resolveRange('2026-05-10', '2026-05-01')).toEqual({ ok: false, error: 'from_after_to' });
  });

  it('rejects a range over the max and accepts the boundary', () => {
    expect(resolveRange('2026-01-01', '2026-05-01')).toEqual({
      ok: false,
      error: 'range_exceeds_max_days',
    });
    const r = resolveRange('2026-02-01', '2026-05-01');
    expect(r.ok).toBe(true);
    expect(daySpan(r.from!, r.to!) + 1).toBe(MAX_RANGE_DAYS);
  });
});

describe('projectHFVelocitySeries', () => {
  it('marks every day no-data for an empty range and notes it', () => {
    const r = projectHFVelocitySeries('2026-05-01', '2026-05-02', [
      { date: '2026-05-01', snap: null },
      { date: '2026-05-02', snap: null },
    ]);
    expect(r.points.every((p) => p.has_data === false)).toBe(true);
    expect(r.window.top_model_gainers).toEqual([]);
    expect(r.window.model_count_start).toBeNull();
    expect(r.notes.some((n) => n.includes('No captured snapshots'))).toBe(true);
  });

  it('leaves velocity empty on a single data day and notes it', () => {
    const r = projectHFVelocitySeries('2026-05-01', '2026-05-01', [
      { date: '2026-05-01', snap: snap('2026-05-01', [mItem('a', 100)]) },
    ]);
    expect(r.points[0].has_data).toBe(true);
    expect(r.points[0].top_models_by_download_delta).toEqual([]);
    expect(r.points[0].models_entered).toBeNull();
    expect(r.notes.some((n) => n.includes('Only one day has data'))).toBe(true);
  });

  it('ranks per-day movers and counts top-set churn vs the prior has-data day', () => {
    const d1 = snap(
      '2026-05-01',
      [mItem('a', 100), mItem('b', 50), mItem('c', 10)],
      [dItem('x', 1000)],
      [sItem('s1', 5)],
    );
    const d2 = snap(
      '2026-05-02',
      [mItem('a', 150), mItem('b', 50), mItem('d', 5)], // a +50, b +0, d entered, c exited
      [dItem('x', 1200)],
      [sItem('s1', 9)], // +4 likes
    );
    const r = projectHFVelocitySeries('2026-05-01', '2026-05-02', [
      { date: '2026-05-01', snap: d1 },
      { date: '2026-05-02', snap: d2 },
    ]);
    expect(r.points[0].top_models_by_download_delta).toEqual([]); // first has-data day
    const m = r.points[1].top_models_by_download_delta;
    expect(m[0]).toEqual({ id: 'a', downloads: 150, download_delta: 50 });
    expect(m.some((x) => x.id === 'b' && x.download_delta === 0)).toBe(true);
    expect(m.some((x) => x.id === 'd')).toBe(false); // entered, no prior to diff
    expect(r.points[1].models_entered).toBe(1);
    expect(r.points[1].models_exited).toBe(1);
    expect(r.points[1].top_datasets_by_download_delta[0]).toEqual({
      id: 'x',
      downloads: 1200,
      download_delta: 200,
    });
    expect(r.points[1].top_spaces_by_likes_delta[0]).toEqual({
      id: 's1',
      likes: 9,
      likes_delta: 4,
    });
  });

  it('computes velocity against the prior has-data day, not a gap day', () => {
    const r = projectHFVelocitySeries('2026-05-01', '2026-05-03', [
      { date: '2026-05-01', snap: snap('2026-05-01', [mItem('a', 100)]) },
      { date: '2026-05-02', snap: null },
      { date: '2026-05-03', snap: snap('2026-05-03', [mItem('a', 130)]) },
    ]);
    expect(r.points[1].has_data).toBe(false);
    expect(r.points[2].top_models_by_download_delta[0]).toEqual({
      id: 'a',
      downloads: 130,
      download_delta: 30,
    });
  });

  it('reports window gainers as last minus first has-data day', () => {
    const r = projectHFVelocitySeries('2026-05-01', '2026-05-03', [
      { date: '2026-05-01', snap: snap('2026-05-01', [mItem('a', 100), mItem('b', 200)]) },
      { date: '2026-05-02', snap: snap('2026-05-02', [mItem('a', 100), mItem('b', 200)]) },
      { date: '2026-05-03', snap: snap('2026-05-03', [mItem('a', 160), mItem('b', 205)]) },
    ]);
    expect(r.window.top_model_gainers[0]).toEqual({ id: 'a', downloads: 160, download_delta: 60 });
    expect(r.window.top_model_gainers[1]).toEqual({ id: 'b', downloads: 205, download_delta: 5 });
    expect(r.window.model_count_start).toBe(2);
    expect(r.window.model_count_end).toBe(2);
  });

  it('echoes range, day count, and the attribution block', () => {
    const r = projectHFVelocitySeries('2026-05-01', '2026-05-02', [
      { date: '2026-05-01', snap: snap('2026-05-01', [mItem('a', 1)]) },
      { date: '2026-05-02', snap: snap('2026-05-02', [mItem('a', 2)]) },
    ]);
    expect(r.from).toBe('2026-05-01');
    expect(r.to).toBe('2026-05-02');
    expect(r.days).toBe(2);
    expect(r.attribution).toBe(HF_ATTRIBUTION);
  });
});
