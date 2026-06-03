// worker/src/premium-hf-leaderboard.ts
// Premium derivation over the free /api/hf-leaderboard/latest sibling and the
// dated-snapshot series in KV. Computes period-over-period movers on the Open
// LLM Leaderboard v2: rank climbers/fallers, average and per-benchmark score
// deltas, models entered/exited, new per-benchmark leaders, and license changes.
// Pure compute in computeMovers; buildMovers adds the KV series reads.

import type { Env } from './types';
import {
  type LeaderboardSnapshot,
  type LeaderboardEntry,
  type LeaderboardAttribution,
  LEADERBOARD_ATTRIBUTION,
  readDates,
  readSnapshotByDate,
} from './hf-leaderboard';

const ATTR =
  'TensorFeed premium derivation over its own dated snapshots of the Hugging Face Open LLM Leaderboard v2 (CC-BY-SA 4.0). The live board shows only the current state; this diffs two captured days to surface what moved.';

// Benchmarks tracked for new-leader detection: the composite average plus the
// six v2 tasks. Each maps a leaderboard entry to a comparable score.
const BENCHMARKS: Array<{ key: string; get: (e: LeaderboardEntry) => number | null }> = [
  { key: 'average', get: (e) => e.average },
  { key: 'ifeval', get: (e) => e.scores.ifeval },
  { key: 'bbh', get: (e) => e.scores.bbh },
  { key: 'math_lvl_5', get: (e) => e.scores.math_lvl_5 },
  { key: 'gpqa', get: (e) => e.scores.gpqa },
  { key: 'musr', get: (e) => e.scores.musr },
  { key: 'mmlu_pro', get: (e) => e.scores.mmlu_pro },
];

const TOP_N = 15;
const ENTER_EXIT_CAP = 25;

export interface RankDelta {
  model_id: string;
  from_rank: number;
  to_rank: number;
  rank_change: number; // positive = moved up the board (rank number decreased)
  from_average: number | null;
  to_average: number | null;
  average_change: number | null;
}

export interface CohortChange { model_id: string; rank: number; average: number | null }
export interface NewLeader { benchmark: string; model_id: string; score: number; prev_leader: string | null; prev_score: number | null }
export interface LicenseChange { model_id: string; from_license: string | null; to_license: string | null }

export interface MoversComputed {
  rank_climbers: RankDelta[];
  rank_fallers: RankDelta[];
  entered: CohortChange[];
  exited: CohortChange[];
  new_leaders: NewLeader[];
  license_changes: LicenseChange[];
  models_compared: number;
}

function topByBenchmark(entries: LeaderboardEntry[], get: (e: LeaderboardEntry) => number | null): LeaderboardEntry | null {
  let best: LeaderboardEntry | null = null;
  let bestScore = -Infinity;
  for (const e of entries) {
    const s = get(e);
    if (s === null) continue;
    if (s > bestScore) { bestScore = s; best = e; }
  }
  return best;
}

export function computeMovers(prev: LeaderboardSnapshot, latest: LeaderboardSnapshot): MoversComputed {
  const prevByModel = new Map(prev.entries.map((e) => [e.model_id, e]));
  const latestByModel = new Map(latest.entries.map((e) => [e.model_id, e]));

  const deltas: RankDelta[] = [];
  for (const [id, le] of latestByModel) {
    const pe = prevByModel.get(id);
    if (!pe) continue;
    deltas.push({
      model_id: id,
      from_rank: pe.rank,
      to_rank: le.rank,
      rank_change: pe.rank - le.rank,
      from_average: pe.average,
      to_average: le.average,
      average_change: pe.average !== null && le.average !== null ? Math.round((le.average - pe.average) * 1000) / 1000 : null,
    });
  }
  const rank_climbers = deltas.filter((d) => d.rank_change > 0).sort((a, b) => b.rank_change - a.rank_change).slice(0, TOP_N);
  const rank_fallers = deltas.filter((d) => d.rank_change < 0).sort((a, b) => a.rank_change - b.rank_change).slice(0, TOP_N);

  const entered: CohortChange[] = [];
  for (const [id, le] of latestByModel) {
    if (!prevByModel.has(id)) entered.push({ model_id: id, rank: le.rank, average: le.average });
  }
  entered.sort((a, b) => a.rank - b.rank);

  const exited: CohortChange[] = [];
  for (const [id, pe] of prevByModel) {
    if (!latestByModel.has(id)) exited.push({ model_id: id, rank: pe.rank, average: pe.average });
  }
  exited.sort((a, b) => a.rank - b.rank);

  const new_leaders: NewLeader[] = [];
  for (const b of BENCHMARKS) {
    const lTop = topByBenchmark(latest.entries, b.get);
    const pTop = topByBenchmark(prev.entries, b.get);
    if (lTop && (!pTop || pTop.model_id !== lTop.model_id)) {
      new_leaders.push({
        benchmark: b.key,
        model_id: lTop.model_id,
        score: b.get(lTop) as number,
        prev_leader: pTop ? pTop.model_id : null,
        prev_score: pTop ? b.get(pTop) : null,
      });
    }
  }

  const license_changes: LicenseChange[] = [];
  for (const [id, le] of latestByModel) {
    const pe = prevByModel.get(id);
    if (pe && pe.license !== le.license) {
      license_changes.push({ model_id: id, from_license: pe.license, to_license: le.license });
    }
  }

  return {
    rank_climbers,
    rank_fallers,
    entered: entered.slice(0, ENTER_EXIT_CAP),
    exited: exited.slice(0, ENTER_EXIT_CAP),
    new_leaders,
    license_changes,
    models_compared: deltas.length,
  };
}

export interface MoversResponse extends Partial<MoversComputed> {
  ok: true;
  captured_at: string | null;
  from_date: string | null;
  to_date: string | null;
  window_days: number;
  has_data: boolean;
  note?: string;
  source_attribution: string;
  attribution: LeaderboardAttribution;
}

// Pick the comparison date: the most recent captured date at least windowDays
// before the latest. If the series is shorter than the window, fall back to the
// oldest captured date so we still report movers over the available span.
export function pickComparisonDate(dates: string[], latestDate: string, windowDays: number): string | null {
  const cutoff = Date.parse(latestDate) - windowDays * 86400000;
  const onOrBefore = dates.filter((d) => d !== latestDate && Date.parse(d) <= cutoff);
  if (onOrBefore.length) return onOrBefore[onOrBefore.length - 1];
  const older = dates.filter((d) => d !== latestDate);
  return older.length ? older[0] : null;
}

export async function buildMovers(env: Env, windowDays: number): Promise<MoversResponse> {
  const empty = (captured_at: string | null, note: string): MoversResponse => ({
    ok: true, captured_at, from_date: null, to_date: null, window_days: windowDays,
    has_data: false, note, source_attribution: ATTR, attribution: LEADERBOARD_ATTRIBUTION,
  });

  const dates = await readDates(env);
  if (dates.length < 2) {
    return empty(dates[dates.length - 1] ?? null, 'Fewer than two captured snapshots exist yet; movers need a from and a to day. The daily capture runs at 04:45 UTC.');
  }
  const latestDate = dates[dates.length - 1];
  const prevDate = pickComparisonDate(dates, latestDate, windowDays);
  if (!prevDate) return empty(latestDate, 'No comparison snapshot available in the window.');

  const [latest, prev] = await Promise.all([readSnapshotByDate(env, latestDate), readSnapshotByDate(env, prevDate)]);
  if (!latest || !prev) return empty(latestDate, 'A snapshot in the window could not be read.');

  const m = computeMovers(prev, latest);
  return {
    ok: true,
    captured_at: latestDate,
    from_date: prevDate,
    to_date: latestDate,
    window_days: windowDays,
    has_data: true,
    ...m,
    source_attribution: ATTR,
    attribution: LEADERBOARD_ATTRIBUTION,
  };
}
