import { Env } from './types';
import { HFSnapshot, dailyKey as hfDailyKey } from './hf-trending';

/**
 * Premium download-velocity series over the daily Hugging Face snapshots.
 *
 * hf-trending.ts captures hf:daily:{date} once per day: the top 30
 * models and datasets by cumulative downloads, plus the top 30 Spaces by
 * likes. HF's API exposes only cumulative totals and a live top list, so
 * day-over-day velocity (who is gaining downloads fastest) is not
 * recoverable after the fact. This module is the paid read over that
 * compounding record.
 *
 * Honest scope, grounded in HFSnapshot: velocity is computed only for
 * assets present in the daily top-30 on both the prior captured day and
 * the current one. Assets entering or leaving the tracked top set are
 * reported as entered/exited counts, not as spurious infinite velocity.
 * Models and datasets use download deltas; Spaces use likes deltas
 * (Spaces are hosted apps, not downloadable).
 *
 * Mirrors or-series.ts and x402-reg-series.ts discipline: a pure
 * projection (no env, fully unit-testable) plus a thin env-bound reader.
 */

export const MAX_RANGE_DAYS = 90;
export const DEFAULT_RANGE_DAYS = 30;

const ISO_DATE = /^\d{4}-\d{2}-\d{2}$/;
const todayUTC = (): string => new Date().toISOString().slice(0, 10);

function addDays(dateStr: string, n: number): string {
  const d = new Date(`${dateStr}T00:00:00Z`);
  d.setUTCDate(d.getUTCDate() + n);
  return d.toISOString().slice(0, 10);
}

function daysBetween(from: string, to: string): number {
  const a = new Date(`${from}T00:00:00Z`).getTime();
  const b = new Date(`${to}T00:00:00Z`).getTime();
  return Math.round((b - a) / (1000 * 60 * 60 * 24));
}

export interface RangeResolution {
  ok: boolean;
  error?: string;
  from?: string;
  to?: string;
}

/**
 * Same contract as or-series.resolveRange: optional from/to, default a
 * trailing DEFAULT_RANGE_DAYS window ending today, hard cap at
 * MAX_RANGE_DAYS. Optional params so the route stays non-strict-premium.
 */
export function resolveRange(rawFrom: string | null, rawTo: string | null): RangeResolution {
  const today = todayUTC();
  const to = rawTo?.trim() || today;
  if (!ISO_DATE.test(to)) return { ok: false, error: 'invalid_to_date' };

  let from = rawFrom?.trim();
  if (!from) {
    from = addDays(to, -(DEFAULT_RANGE_DAYS - 1));
  } else if (!ISO_DATE.test(from)) {
    return { ok: false, error: 'invalid_from_date' };
  }
  if (from > to) return { ok: false, error: 'from_after_to' };
  const span = daysBetween(from, to);
  if (span + 1 > MAX_RANGE_DAYS) return { ok: false, error: 'range_exceeds_max_days' };

  return { ok: true, from, to };
}

export interface HFMover {
  id: string;
  downloads: number;
  download_delta: number;
}

export interface HFSpaceMover {
  id: string;
  likes: number;
  likes_delta: number;
}

export interface HFVelocityPoint {
  date: string;
  model_count: number | null;
  dataset_count: number | null;
  space_count: number | null;
  /** Top-set churn versus the prior has-data day. */
  models_entered: number | null;
  models_exited: number | null;
  datasets_entered: number | null;
  datasets_exited: number | null;
  /** Movers among ids present both the prior has-data day and today. */
  top_models_by_download_delta: HFMover[];
  top_datasets_by_download_delta: HFMover[];
  top_spaces_by_likes_delta: HFSpaceMover[];
  has_data: boolean;
}

export interface HFVelocityResult {
  from: string;
  to: string;
  days: number;
  points: HFVelocityPoint[];
  /** Gainers across the whole window: last minus first has-data day. */
  window: {
    top_model_gainers: HFMover[];
    top_dataset_gainers: HFMover[];
    model_count_start: number | null;
    model_count_end: number | null;
  };
  attribution: typeof HF_ATTRIBUTION;
  notes: string[];
}

export const HF_ATTRIBUTION = {
  source: 'Hugging Face',
  source_url: 'https://huggingface.co/api/models',
  license:
    'Public Hugging Face listing data (models, datasets, Spaces). Owned by Hugging Face and the respective repository owners.',
  note: 'HF exposes only cumulative totals and a live top list. This day-over-day velocity over the daily top-30 capture is TensorFeed-computed and cannot be backfilled.',
};

const MOVERS_CAP = 10;

function downloadMap(items: ReadonlyArray<{ id: string; downloads: number }>): Map<string, number> {
  const m = new Map<string, number>();
  for (const it of items) m.set(it.id, it.downloads);
  return m;
}

function likeMap(items: ReadonlyArray<{ id: string; likes: number }>): Map<string, number> {
  const m = new Map<string, number>();
  for (const it of items) m.set(it.id, it.likes);
  return m;
}

function topDownloadMovers(
  cur: Map<string, number>,
  prev: Map<string, number>,
  cap: number,
): HFMover[] {
  const movers: HFMover[] = [];
  for (const [id, downloads] of cur) {
    const p = prev.get(id);
    if (p === undefined) continue; // entered the top set; no prior to diff
    movers.push({ id, downloads, download_delta: downloads - p });
  }
  movers.sort((a, b) => b.download_delta - a.download_delta);
  return movers.slice(0, cap);
}

function topLikeMovers(
  cur: Map<string, number>,
  prev: Map<string, number>,
  cap: number,
): HFSpaceMover[] {
  const movers: HFSpaceMover[] = [];
  for (const [id, likes] of cur) {
    const p = prev.get(id);
    if (p === undefined) continue;
    movers.push({ id, likes, likes_delta: likes - p });
  }
  movers.sort((a, b) => b.likes_delta - a.likes_delta);
  return movers.slice(0, cap);
}

function countDelta(cur: Map<string, number>, prev: Map<string, number>): { entered: number; exited: number } {
  let entered = 0;
  let exited = 0;
  for (const id of cur.keys()) if (!prev.has(id)) entered++;
  for (const id of prev.keys()) if (!cur.has(id)) exited++;
  return { entered, exited };
}

/**
 * Pure: project an ordered list of (date, snapshot|null) into a velocity
 * series. Input MUST be chronologically ascending. Per-day deltas and
 * churn are computed against the most recent PRIOR day that has data, so
 * a missing day in the middle does not fabricate velocity.
 */
export function projectHFVelocitySeries(
  from: string,
  to: string,
  byDate: ReadonlyArray<{ date: string; snap: HFSnapshot | null }>,
): HFVelocityResult {
  let prevModels: Map<string, number> | null = null;
  let prevDatasets: Map<string, number> | null = null;
  let prevSpaces: Map<string, number> | null = null;

  let firstModels: Map<string, number> | null = null;
  let firstDatasets: Map<string, number> | null = null;
  let firstModelCount: number | null = null;
  let lastModels: Map<string, number> | null = null;
  let lastDatasets: Map<string, number> | null = null;
  let lastModelCount: number | null = null;

  const points: HFVelocityPoint[] = byDate.map(({ date, snap }) => {
    if (!snap) {
      return {
        date,
        model_count: null,
        dataset_count: null,
        space_count: null,
        models_entered: null,
        models_exited: null,
        datasets_entered: null,
        datasets_exited: null,
        top_models_by_download_delta: [],
        top_datasets_by_download_delta: [],
        top_spaces_by_likes_delta: [],
        has_data: false,
      };
    }

    const curModels = downloadMap(snap.models.items);
    const curDatasets = downloadMap(snap.datasets.items);
    const curSpaces = likeMap(snap.spaces.items);

    let modelsEntered: number | null = null;
    let modelsExited: number | null = null;
    let datasetsEntered: number | null = null;
    let datasetsExited: number | null = null;
    let topModels: HFMover[] = [];
    let topDatasets: HFMover[] = [];
    let topSpaces: HFSpaceMover[] = [];

    if (prevModels && prevDatasets && prevSpaces) {
      const md = countDelta(curModels, prevModels);
      modelsEntered = md.entered;
      modelsExited = md.exited;
      const dd = countDelta(curDatasets, prevDatasets);
      datasetsEntered = dd.entered;
      datasetsExited = dd.exited;
      topModels = topDownloadMovers(curModels, prevModels, MOVERS_CAP);
      topDatasets = topDownloadMovers(curDatasets, prevDatasets, MOVERS_CAP);
      topSpaces = topLikeMovers(curSpaces, prevSpaces, MOVERS_CAP);
    }

    if (firstModels === null) {
      firstModels = curModels;
      firstDatasets = curDatasets;
      firstModelCount = snap.models.count;
    }
    lastModels = curModels;
    lastDatasets = curDatasets;
    lastModelCount = snap.models.count;

    prevModels = curModels;
    prevDatasets = curDatasets;
    prevSpaces = curSpaces;

    return {
      date,
      model_count: snap.models.count,
      dataset_count: snap.datasets.count,
      space_count: snap.spaces.count,
      models_entered: modelsEntered,
      models_exited: modelsExited,
      datasets_entered: datasetsEntered,
      datasets_exited: datasetsExited,
      top_models_by_download_delta: topModels,
      top_datasets_by_download_delta: topDatasets,
      top_spaces_by_likes_delta: topSpaces,
      has_data: true,
    };
  });

  function windowGainers(
    first: Map<string, number> | null,
    last: Map<string, number> | null,
  ): HFMover[] {
    if (!first || !last) return [];
    const out: HFMover[] = [];
    for (const [id, end] of last) {
      const start = first.get(id);
      if (start === undefined) continue;
      out.push({ id, downloads: end, download_delta: end - start });
    }
    out.sort((a, b) => b.download_delta - a.download_delta);
    return out.slice(0, MOVERS_CAP);
  }

  const hasDataCount = points.filter((p) => p.has_data).length;
  const notes: string[] = [];
  const missing = points.length - hasDataCount;
  if (missing > 0) notes.push(`${missing} day(s) in range have no captured snapshot yet`);
  if (hasDataCount === 1) {
    notes.push('Only one day has data; velocity needs at least two captured days.');
  }
  if (hasDataCount === 0) {
    notes.push('No captured snapshots in this range yet. hf:daily is captured on the 12:00 UTC cron.');
  }

  return {
    from,
    to,
    days: points.length,
    points,
    window: {
      top_model_gainers: windowGainers(firstModels, lastModels),
      top_dataset_gainers: windowGainers(firstDatasets, lastDatasets),
      model_count_start: firstModelCount,
      model_count_end: lastModelCount,
    },
    attribution: HF_ATTRIBUTION,
    notes,
  };
}

/**
 * Thin env-bound reader. Reads hf:daily:{date} for each date in range
 * (missing day reads as null) then defers all logic to the pure
 * projector.
 */
export async function getHFVelocitySeries(
  env: Env,
  from: string,
  to: string,
): Promise<HFVelocityResult> {
  const dates: string[] = [];
  const span = daysBetween(from, to);
  for (let i = 0; i <= span; i++) dates.push(addDays(from, i));

  const snaps = await Promise.all(
    dates.map(
      (d) => env.TENSORFEED_CACHE.get(hfDailyKey(d), 'json') as Promise<HFSnapshot | null>,
    ),
  );

  return projectHFVelocitySeries(
    from,
    to,
    dates.map((date, i) => ({ date, snap: snaps[i] })),
  );
}
