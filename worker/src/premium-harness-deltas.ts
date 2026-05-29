/**
 * Premium coding-harness weekly deltas.
 *
 * Compares the current TerminalFeed harness snapshot to a prior snapshot
 * (default 7 days back) and surfaces:
 *   - Per-(benchmark, harness, model) score delta
 *   - Rank changes within each benchmark
 *   - Entered combinations (new in current, absent in prior)
 *   - Exited combinations (in prior, absent in current)
 *   - Biggest_gainers and biggest_regressions across all benchmarks
 *   - Per-benchmark current-leader vs prior-leader for the canonical
 *     "who's number one on SWE-bench-verified this week" question
 *
 * The pure builder is exported for testing without env/KV.
 *
 * Cost: 1 credit. Bazaar Wave 10 pilot.
 */

import type {
  HarnessSnapshot,
  HarnessResult,
  BenchmarkSnapshot,
} from './terminalfeed-harnesses-fetcher';

// ─── Filter ────────────────────────────────────────────────────────

export interface DeltasFilter {
  days_back: number;                  // clamped to [1, 90]
  harness: string | null;             // substring case-insensitive
  benchmark: string | null;           // substring case-insensitive
  model: string | null;               // substring case-insensitive
  /** Minimum absolute score change to include in the headline movers. Default 0. */
  min_abs_delta: number;
}

export const DEFAULT_DAYS_BACK = 7;
export const MIN_DAYS_BACK = 1;
export const MAX_DAYS_BACK = 90;

export function parseDaysBack(raw: string | null): number {
  if (raw === null || raw === '') return DEFAULT_DAYS_BACK;
  const n = parseInt(raw, 10);
  if (!Number.isFinite(n)) return DEFAULT_DAYS_BACK;
  if (n < MIN_DAYS_BACK) return MIN_DAYS_BACK;
  if (n > MAX_DAYS_BACK) return MAX_DAYS_BACK;
  return n;
}

export function parseHarness(raw: string | null): string | null {
  if (raw === null) return null;
  const t = raw.trim();
  return t || null;
}

export function parseBenchmark(raw: string | null): string | null {
  if (raw === null) return null;
  const t = raw.trim();
  return t || null;
}

export function parseModelFilter(raw: string | null): string | null {
  if (raw === null) return null;
  const t = raw.trim();
  return t || null;
}

export function parseMinAbsDelta(raw: string | null): number {
  if (raw === null || raw === '') return 0;
  const n = parseFloat(raw);
  if (!Number.isFinite(n)) return 0;
  if (n < 0) return 0;
  if (n > 100) return 100;
  return n;
}

// ─── Row shapes ────────────────────────────────────────────────────

export type ChangeKind = 'unchanged' | 'gained' | 'regressed' | 'entered' | 'exited';

export interface DeltaRow {
  benchmark: string;
  harness: string;
  model: string;
  current_score: number | null;
  prior_score: number | null;
  delta: number | null;
  current_rank: number | null;
  prior_rank: number | null;
  rank_delta: number | null;            // positive = climbed; null when either rank missing
  change_kind: ChangeKind;
}

// ─── Indexing helpers ──────────────────────────────────────────────

function indexBenchmark(b: BenchmarkSnapshot): Map<string, { result: HarnessResult; rank: number }> {
  const out = new Map<string, { result: HarnessResult; rank: number }>();
  // Re-sort defensively (snapshots from the fetcher are already sorted, but
  // hand-built test inputs may not be).
  const sorted = [...b.results].sort((a, b) => b.score - a.score);
  sorted.forEach((r, idx) => {
    const key = `${r.harness}__${r.model}`;
    out.set(key, { result: r, rank: idx + 1 });
  });
  return out;
}

function indexSnapshot(s: HarnessSnapshot): Map<string, Map<string, { result: HarnessResult; rank: number }>> {
  const out = new Map<string, Map<string, { result: HarnessResult; rank: number }>>();
  for (const b of s.benchmarks) {
    out.set(b.id, indexBenchmark(b));
  }
  return out;
}

// ─── Build delta rows ──────────────────────────────────────────────

export function classifyChange(prior: number | null, current: number | null): ChangeKind {
  if (prior === null && current === null) return 'unchanged';
  if (prior === null) return 'entered';
  if (current === null) return 'exited';
  if (current > prior) return 'gained';
  if (current < prior) return 'regressed';
  return 'unchanged';
}

export function buildDeltaRows(
  current: HarnessSnapshot,
  prior: HarnessSnapshot,
): DeltaRow[] {
  const currentIdx = indexSnapshot(current);
  const priorIdx = indexSnapshot(prior);

  const out: DeltaRow[] = [];
  // Iterate across the union of benchmark ids so a benchmark added or
  // removed at the upstream is captured.
  const allBenchmarks = new Set<string>([...currentIdx.keys(), ...priorIdx.keys()]);

  for (const benchmarkId of allBenchmarks) {
    const cur = currentIdx.get(benchmarkId) ?? new Map();
    const pri = priorIdx.get(benchmarkId) ?? new Map();
    const allKeys = new Set<string>([...cur.keys(), ...pri.keys()]);
    for (const key of allKeys) {
      const c = cur.get(key);
      const p = pri.get(key);
      const harness = (c?.result.harness ?? p?.result.harness ?? '') as string;
      const model = (c?.result.model ?? p?.result.model ?? '') as string;
      const current_score = c?.result.score ?? null;
      const prior_score = p?.result.score ?? null;
      const delta =
        current_score !== null && prior_score !== null
          ? Math.round((current_score - prior_score) * 1000) / 1000
          : null;
      const current_rank = c?.rank ?? null;
      const prior_rank = p?.rank ?? null;
      const rank_delta =
        current_rank !== null && prior_rank !== null ? prior_rank - current_rank : null;
      out.push({
        benchmark: benchmarkId,
        harness,
        model,
        current_score,
        prior_score,
        delta,
        current_rank,
        prior_rank,
        rank_delta,
        change_kind: classifyChange(prior_score, current_score),
      });
    }
  }
  return out;
}

// ─── Per-benchmark leader card ─────────────────────────────────────

export interface LeaderCard {
  benchmark: string;
  current_leader: { harness: string; model: string; score: number } | null;
  prior_leader: { harness: string; model: string; score: number } | null;
  leader_changed: boolean;
}

export function buildLeaderCards(current: HarnessSnapshot, prior: HarnessSnapshot): LeaderCard[] {
  const priorByBenchmark = new Map<string, BenchmarkSnapshot>();
  for (const b of prior.benchmarks) priorByBenchmark.set(b.id, b);

  const allBenchmarks = new Set<string>([
    ...current.benchmarks.map((b) => b.id),
    ...prior.benchmarks.map((b) => b.id),
  ]);
  const cards: LeaderCard[] = [];
  for (const id of allBenchmarks) {
    const cBench = current.benchmarks.find((b) => b.id === id);
    const pBench = priorByBenchmark.get(id);
    const cLeaderRow = cBench && cBench.results.length > 0 ? cBench.results[0] : null;
    const pLeaderRow = pBench && pBench.results.length > 0 ? pBench.results[0] : null;
    const cLeader = cLeaderRow
      ? { harness: cLeaderRow.harness, model: cLeaderRow.model, score: cLeaderRow.score }
      : null;
    const pLeader = pLeaderRow
      ? { harness: pLeaderRow.harness, model: pLeaderRow.model, score: pLeaderRow.score }
      : null;
    const leader_changed = (() => {
      if (cLeader === null || pLeader === null) return cLeader !== pLeader;
      return cLeader.harness !== pLeader.harness || cLeader.model !== pLeader.model;
    })();
    cards.push({ benchmark: id, current_leader: cLeader, prior_leader: pLeader, leader_changed });
  }
  cards.sort((a, b) => a.benchmark.localeCompare(b.benchmark));
  return cards;
}

// ─── Top response ──────────────────────────────────────────────────

export interface DeltasResponse {
  ok: true;
  capturedAt: string;
  current_captured_at: string;
  prior_captured_at: string;
  days_between_snapshots: number;
  source: 'terminalfeed.io federation cross-call';
  filter: { days_back: number; harness: string | null; benchmark: string | null; model: string | null; min_abs_delta: number };
  cohort: {
    rows_total: number;
    rows_filtered: number;
    benchmarks_in_window: number;
  };
  rows: DeltaRow[];
  notable_movers: {
    biggest_gainers: DeltaRow[];
    biggest_regressions: DeltaRow[];
    entered: DeltaRow[];
    exited: DeltaRow[];
  };
  leader_cards: LeaderCard[];
  summary: {
    by_change_kind: Record<ChangeKind, number>;
    benchmarks_with_new_leader: number;
  };
  attribution: {
    source: string;
    license: string;
    notes: string;
  };
}

const TOP_N = 5;

export function buildDeltasResponse(
  current: HarnessSnapshot,
  prior: HarnessSnapshot,
  filter: DeltasFilter,
): DeltasResponse {
  const allRows = buildDeltaRows(current, prior);

  const harnessNeedle = filter.harness?.toLowerCase();
  const benchmarkNeedle = filter.benchmark?.toLowerCase();
  const modelNeedle = filter.model?.toLowerCase();

  const filtered = allRows.filter((r) => {
    if (harnessNeedle && !r.harness.toLowerCase().includes(harnessNeedle)) return false;
    if (benchmarkNeedle && !r.benchmark.toLowerCase().includes(benchmarkNeedle)) return false;
    if (modelNeedle && !r.model.toLowerCase().includes(modelNeedle)) return false;
    return true;
  });

  // Headline rows: sort by |delta| desc, then by change_kind priority (entered/exited surface to top of pile).
  const changeKindOrder: Record<ChangeKind, number> = { entered: 4, exited: 3, gained: 2, regressed: 1, unchanged: 0 };
  const headline = [...filtered]
    .filter((r) => {
      const d = r.delta;
      if (d === null) return r.change_kind === 'entered' || r.change_kind === 'exited';
      return Math.abs(d) >= filter.min_abs_delta;
    })
    .sort((a, b) => {
      const ad = Math.abs(a.delta ?? 0);
      const bd = Math.abs(b.delta ?? 0);
      if (bd !== ad) return bd - ad;
      return changeKindOrder[b.change_kind] - changeKindOrder[a.change_kind];
    });

  const biggest_gainers = [...filtered]
    .filter((r) => r.change_kind === 'gained' && r.delta !== null)
    .sort((a, b) => (b.delta ?? 0) - (a.delta ?? 0))
    .slice(0, TOP_N);

  const biggest_regressions = [...filtered]
    .filter((r) => r.change_kind === 'regressed' && r.delta !== null)
    .sort((a, b) => (a.delta ?? 0) - (b.delta ?? 0))
    .slice(0, TOP_N);

  const entered = filtered.filter((r) => r.change_kind === 'entered').slice(0, TOP_N);
  const exited = filtered.filter((r) => r.change_kind === 'exited').slice(0, TOP_N);

  const by_change_kind: Record<ChangeKind, number> = {
    unchanged: 0, gained: 0, regressed: 0, entered: 0, exited: 0,
  };
  for (const r of filtered) by_change_kind[r.change_kind]++;

  const leaderCards = buildLeaderCards(current, prior);
  const benchmarks_with_new_leader = leaderCards.filter((c) => c.leader_changed).length;

  const days_between_snapshots = Math.max(
    1,
    Math.round(
      (new Date(current.capturedAt).getTime() - new Date(prior.capturedAt).getTime()) /
        (24 * 60 * 60 * 1000),
    ),
  );

  return {
    ok: true,
    capturedAt: current.capturedAt,
    current_captured_at: current.capturedAt,
    prior_captured_at: prior.capturedAt,
    days_between_snapshots,
    source: 'terminalfeed.io federation cross-call',
    filter: { days_back: filter.days_back, harness: filter.harness, benchmark: filter.benchmark, model: filter.model, min_abs_delta: filter.min_abs_delta },
    cohort: {
      rows_total: allRows.length,
      rows_filtered: filtered.length,
      benchmarks_in_window: new Set<string>([
        ...current.benchmarks.map((b) => b.id),
        ...prior.benchmarks.map((b) => b.id),
      ]).size,
    },
    rows: headline,
    notable_movers: { biggest_gainers, biggest_regressions, entered, exited },
    leader_cards: leaderCards,
    summary: { by_change_kind, benchmarks_with_new_leader },
    attribution: {
      source: 'TerminalFeed.io (AFTA federation sister site). Upstream: agentic-coding harness benchmark publishers cited per-result via source_url.',
      license: 'Federation cross-call to TerminalFeed free endpoint. Underlying benchmark scores carry per-result source_url for verification.',
      notes: 'TensorFeed captures a daily snapshot of TerminalFeed\'s leaderboard at 05:25 UTC; delta is computed against the snapshot at-or-before days_back days prior. Rows where prior_score is null = newly listed combination; rows where current_score is null = de-listed.',
    },
  };
}
