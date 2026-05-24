import { describe, it, expect } from 'vitest';
import {
  parseDaysBack,
  parseHarness,
  parseBenchmark,
  parseModelFilter,
  parseMinAbsDelta,
  classifyChange,
  buildDeltaRows,
  buildLeaderCards,
  buildDeltasResponse,
  DEFAULT_DAYS_BACK,
} from './premium-harness-deltas';
import type {
  HarnessSnapshot,
  HarnessResult,
  BenchmarkSnapshot,
} from './terminalfeed-harnesses-fetcher';

// ── factories ──────────────────────────────────────────────────────

function makeResult(partial: Partial<HarnessResult> & { harness: string; model: string; score: number }): HarnessResult {
  return {
    id: partial.id ?? `${partial.harness}__${partial.model}`,
    harness: partial.harness,
    model: partial.model,
    score: partial.score,
    reported_at: partial.reported_at ?? '',
    source_url: partial.source_url ?? '',
  };
}

function makeBenchmark(id: string, results: HarnessResult[]): BenchmarkSnapshot {
  return { id, results };
}

function makeSnapshot(
  benchmarks: BenchmarkSnapshot[],
  capturedAt = '2026-05-24T00:00:00.000Z',
): HarnessSnapshot {
  const total = benchmarks.reduce((acc, b) => acc + b.results.length, 0);
  return {
    capturedAt,
    source: 'terminalfeed.io',
    upstream_generated_at: capturedAt,
    upstream_schema_version: '1',
    source_license:
      'Federation cross-call to TerminalFeed (free public endpoint). Underlying benchmark scores carry per-result source_url for verification.',
    benchmark_count: benchmarks.length,
    total_results: total,
    benchmarks,
  };
}

const DEFAULT_FILTER = {
  days_back: 7,
  harness: null,
  benchmark: null,
  model: null,
  min_abs_delta: 0,
};

// ── parseDaysBack ──────────────────────────────────────────────────

describe('parseDaysBack', () => {
  it('returns DEFAULT_DAYS_BACK on null', () => {
    expect(parseDaysBack(null)).toBe(DEFAULT_DAYS_BACK);
    expect(DEFAULT_DAYS_BACK).toBe(7);
  });

  it('returns DEFAULT_DAYS_BACK on empty string', () => {
    expect(parseDaysBack('')).toBe(DEFAULT_DAYS_BACK);
  });

  it('returns DEFAULT_DAYS_BACK on non-numeric input', () => {
    expect(parseDaysBack('abc')).toBe(DEFAULT_DAYS_BACK);
  });

  it('parses ints', () => {
    expect(parseDaysBack('14')).toBe(14);
  });

  it('clamps below 1 to 1', () => {
    expect(parseDaysBack('0')).toBe(1);
    expect(parseDaysBack('-5')).toBe(1);
  });

  it('clamps above 90 to 90', () => {
    expect(parseDaysBack('365')).toBe(90);
  });

  it('accepts boundary 1', () => {
    expect(parseDaysBack('1')).toBe(1);
  });

  it('accepts boundary 90', () => {
    expect(parseDaysBack('90')).toBe(90);
  });
});

// ── parseHarness / parseBenchmark / parseModelFilter ───────────────

describe('parseHarness', () => {
  it('returns null on null', () => {
    expect(parseHarness(null)).toBeNull();
  });

  it('returns null on whitespace', () => {
    expect(parseHarness('   ')).toBeNull();
  });

  it('returns null on empty string', () => {
    expect(parseHarness('')).toBeNull();
  });

  it('trims surrounding whitespace', () => {
    expect(parseHarness('  aider  ')).toBe('aider');
  });
});

describe('parseBenchmark', () => {
  it('returns null on null', () => {
    expect(parseBenchmark(null)).toBeNull();
  });

  it('returns null on whitespace', () => {
    expect(parseBenchmark('   ')).toBeNull();
  });

  it('trims surrounding whitespace', () => {
    expect(parseBenchmark('  swe-bench  ')).toBe('swe-bench');
  });
});

describe('parseModelFilter', () => {
  it('returns null on null', () => {
    expect(parseModelFilter(null)).toBeNull();
  });

  it('returns null on whitespace', () => {
    expect(parseModelFilter('   ')).toBeNull();
  });

  it('trims surrounding whitespace', () => {
    expect(parseModelFilter('  gpt-5  ')).toBe('gpt-5');
  });
});

// ── parseMinAbsDelta ───────────────────────────────────────────────

describe('parseMinAbsDelta', () => {
  it('returns 0 on null', () => {
    expect(parseMinAbsDelta(null)).toBe(0);
  });

  it('returns 0 on empty string', () => {
    expect(parseMinAbsDelta('')).toBe(0);
  });

  it('returns 0 on non-numeric input', () => {
    expect(parseMinAbsDelta('abc')).toBe(0);
  });

  it('parses floats', () => {
    expect(parseMinAbsDelta('2.5')).toBe(2.5);
  });

  it('clamps negative values to 0', () => {
    expect(parseMinAbsDelta('-5')).toBe(0);
  });

  it('clamps above 100 to 100', () => {
    expect(parseMinAbsDelta('500')).toBe(100);
  });

  it('accepts boundary 0', () => {
    expect(parseMinAbsDelta('0')).toBe(0);
  });

  it('accepts boundary 100', () => {
    expect(parseMinAbsDelta('100')).toBe(100);
  });
});

// ── classifyChange ─────────────────────────────────────────────────

describe('classifyChange', () => {
  it('null/null -> unchanged', () => {
    expect(classifyChange(null, null)).toBe('unchanged');
  });

  it('null/5 -> entered', () => {
    expect(classifyChange(null, 5)).toBe('entered');
  });

  it('5/null -> exited', () => {
    expect(classifyChange(5, null)).toBe('exited');
  });

  it('5/7 -> gained', () => {
    expect(classifyChange(5, 7)).toBe('gained');
  });

  it('7/5 -> regressed', () => {
    expect(classifyChange(7, 5)).toBe('regressed');
  });

  it('5/5 -> unchanged', () => {
    expect(classifyChange(5, 5)).toBe('unchanged');
  });
});

// ── buildDeltaRows ─────────────────────────────────────────────────

describe('buildDeltaRows', () => {
  it('empty inputs return empty array', () => {
    const rows = buildDeltaRows(makeSnapshot([]), makeSnapshot([]));
    expect(rows).toEqual([]);
  });

  it('matching (benchmark, harness, model) row gets correct delta rounded to 3 decimals', () => {
    const current = makeSnapshot([
      makeBenchmark('swe-bench', [makeResult({ harness: 'aider', model: 'gpt-5', score: 0.7123456 })]),
    ]);
    const prior = makeSnapshot([
      makeBenchmark('swe-bench', [makeResult({ harness: 'aider', model: 'gpt-5', score: 0.5 })]),
    ]);
    const rows = buildDeltaRows(current, prior);
    expect(rows.length).toBe(1);
    expect(rows[0].delta).toBe(0.212);
  });

  it('delta = current_score - prior_score', () => {
    const current = makeSnapshot([
      makeBenchmark('swe-bench', [makeResult({ harness: 'a', model: 'm', score: 0.8 })]),
    ]);
    const prior = makeSnapshot([
      makeBenchmark('swe-bench', [makeResult({ harness: 'a', model: 'm', score: 0.5 })]),
    ]);
    const rows = buildDeltaRows(current, prior);
    expect(rows[0].delta).toBe(0.3);
    expect(rows[0].change_kind).toBe('gained');
  });

  it('rank_delta = prior_rank - current_rank (positive = climbed)', () => {
    // Current: aider/gpt-5 = 0.9 (rank 1), aider/claude = 0.7 (rank 2)
    // Prior:   aider/gpt-5 = 0.5 (rank 2), aider/claude = 0.6 (rank 1)
    const current = makeSnapshot([
      makeBenchmark('swe-bench', [
        makeResult({ harness: 'aider', model: 'gpt-5', score: 0.9 }),
        makeResult({ harness: 'aider', model: 'claude', score: 0.7 }),
      ]),
    ]);
    const prior = makeSnapshot([
      makeBenchmark('swe-bench', [
        makeResult({ harness: 'aider', model: 'gpt-5', score: 0.5 }),
        makeResult({ harness: 'aider', model: 'claude', score: 0.6 }),
      ]),
    ]);
    const rows = buildDeltaRows(current, prior);
    const gpt5 = rows.find((r) => r.model === 'gpt-5')!;
    expect(gpt5.current_rank).toBe(1);
    expect(gpt5.prior_rank).toBe(2);
    expect(gpt5.rank_delta).toBe(1);
  });

  it('row only in current -> entered, prior_score=null, delta=null, rank_delta=null', () => {
    const current = makeSnapshot([
      makeBenchmark('swe-bench', [makeResult({ harness: 'aider', model: 'gpt-5', score: 0.7 })]),
    ]);
    const prior = makeSnapshot([makeBenchmark('swe-bench', [])]);
    const rows = buildDeltaRows(current, prior);
    expect(rows.length).toBe(1);
    expect(rows[0].change_kind).toBe('entered');
    expect(rows[0].prior_score).toBeNull();
    expect(rows[0].delta).toBeNull();
    expect(rows[0].rank_delta).toBeNull();
    expect(rows[0].current_score).toBe(0.7);
  });

  it('row only in prior -> exited, current_score=null, delta=null, rank_delta=null', () => {
    const current = makeSnapshot([makeBenchmark('swe-bench', [])]);
    const prior = makeSnapshot([
      makeBenchmark('swe-bench', [makeResult({ harness: 'aider', model: 'gpt-5', score: 0.7 })]),
    ]);
    const rows = buildDeltaRows(current, prior);
    expect(rows.length).toBe(1);
    expect(rows[0].change_kind).toBe('exited');
    expect(rows[0].current_score).toBeNull();
    expect(rows[0].delta).toBeNull();
    expect(rows[0].rank_delta).toBeNull();
    expect(rows[0].prior_score).toBe(0.7);
  });

  it('benchmark added at upstream -> all its rows are entered', () => {
    const current = makeSnapshot([
      makeBenchmark('new-bench', [
        makeResult({ harness: 'aider', model: 'gpt-5', score: 0.6 }),
        makeResult({ harness: 'codex', model: 'claude', score: 0.4 }),
      ]),
    ]);
    const prior = makeSnapshot([]);
    const rows = buildDeltaRows(current, prior);
    expect(rows.length).toBe(2);
    expect(rows.every((r) => r.change_kind === 'entered')).toBe(true);
  });

  it('benchmark removed -> all its rows are exited', () => {
    const current = makeSnapshot([]);
    const prior = makeSnapshot([
      makeBenchmark('old-bench', [
        makeResult({ harness: 'aider', model: 'gpt-5', score: 0.6 }),
        makeResult({ harness: 'codex', model: 'claude', score: 0.4 }),
      ]),
    ]);
    const rows = buildDeltaRows(current, prior);
    expect(rows.length).toBe(2);
    expect(rows.every((r) => r.change_kind === 'exited')).toBe(true);
  });

  it('rank computed by sorting results by score desc (rank 1 = highest)', () => {
    // Provide deliberately unsorted input
    const current = makeSnapshot([
      makeBenchmark('swe-bench', [
        makeResult({ harness: 'a', model: 'low', score: 0.2 }),
        makeResult({ harness: 'a', model: 'high', score: 0.9 }),
        makeResult({ harness: 'a', model: 'mid', score: 0.5 }),
      ]),
    ]);
    const prior = makeSnapshot([
      makeBenchmark('swe-bench', [
        makeResult({ harness: 'a', model: 'low', score: 0.2 }),
        makeResult({ harness: 'a', model: 'high', score: 0.9 }),
        makeResult({ harness: 'a', model: 'mid', score: 0.5 }),
      ]),
    ]);
    const rows = buildDeltaRows(current, prior);
    expect(rows.find((r) => r.model === 'high')!.current_rank).toBe(1);
    expect(rows.find((r) => r.model === 'mid')!.current_rank).toBe(2);
    expect(rows.find((r) => r.model === 'low')!.current_rank).toBe(3);
  });

  it('two rows tied on score get adjacent ranks in source-array order', () => {
    const current = makeSnapshot([
      makeBenchmark('swe-bench', [
        makeResult({ harness: 'a', model: 'one', score: 0.5 }),
        makeResult({ harness: 'a', model: 'two', score: 0.5 }),
      ]),
    ]);
    const prior = makeSnapshot([
      makeBenchmark('swe-bench', [
        makeResult({ harness: 'a', model: 'one', score: 0.5 }),
        makeResult({ harness: 'a', model: 'two', score: 0.5 }),
      ]),
    ]);
    const rows = buildDeltaRows(current, prior);
    const ranks = rows.map((r) => r.current_rank).sort();
    expect(ranks).toEqual([1, 2]);
  });
});

// ── buildLeaderCards ───────────────────────────────────────────────

describe('buildLeaderCards', () => {
  it('returns one card per benchmark (union of current + prior)', () => {
    const current = makeSnapshot([
      makeBenchmark('swe-bench', [makeResult({ harness: 'aider', model: 'gpt-5', score: 0.9 })]),
      makeBenchmark('terminal-bench', [makeResult({ harness: 'codex', model: 'claude', score: 0.7 })]),
    ]);
    const prior = makeSnapshot([
      makeBenchmark('terminal-bench', [makeResult({ harness: 'codex', model: 'claude', score: 0.6 })]),
      makeBenchmark('aider-polyglot', [makeResult({ harness: 'aider', model: 'gpt-5', score: 0.5 })]),
    ]);
    const cards = buildLeaderCards(current, prior);
    expect(cards.map((c) => c.benchmark).sort()).toEqual(['aider-polyglot', 'swe-bench', 'terminal-bench']);
  });

  it('leader_changed=false when same (harness, model) leads in both', () => {
    const current = makeSnapshot([
      makeBenchmark('swe-bench', [makeResult({ harness: 'aider', model: 'gpt-5', score: 0.9 })]),
    ]);
    const prior = makeSnapshot([
      makeBenchmark('swe-bench', [makeResult({ harness: 'aider', model: 'gpt-5', score: 0.7 })]),
    ]);
    const cards = buildLeaderCards(current, prior);
    expect(cards[0].leader_changed).toBe(false);
  });

  it('leader_changed=true when different leader', () => {
    const current = makeSnapshot([
      makeBenchmark('swe-bench', [makeResult({ harness: 'aider', model: 'gpt-5', score: 0.9 })]),
    ]);
    const prior = makeSnapshot([
      makeBenchmark('swe-bench', [makeResult({ harness: 'codex', model: 'claude', score: 0.7 })]),
    ]);
    const cards = buildLeaderCards(current, prior);
    expect(cards[0].leader_changed).toBe(true);
  });

  it('leader_changed=true when prior has leader but current is empty', () => {
    const current = makeSnapshot([makeBenchmark('swe-bench', [])]);
    const prior = makeSnapshot([
      makeBenchmark('swe-bench', [makeResult({ harness: 'aider', model: 'gpt-5', score: 0.7 })]),
    ]);
    const cards = buildLeaderCards(current, prior);
    expect(cards[0].leader_changed).toBe(true);
    expect(cards[0].current_leader).toBeNull();
  });

  it('leader_changed=true when benchmark missing from current entirely', () => {
    const current = makeSnapshot([]);
    const prior = makeSnapshot([
      makeBenchmark('swe-bench', [makeResult({ harness: 'aider', model: 'gpt-5', score: 0.7 })]),
    ]);
    const cards = buildLeaderCards(current, prior);
    expect(cards[0].leader_changed).toBe(true);
    expect(cards[0].current_leader).toBeNull();
    expect(cards[0].prior_leader).not.toBeNull();
  });

  it('current_leader = top-scoring row from current benchmark', () => {
    const current = makeSnapshot([
      makeBenchmark('swe-bench', [
        makeResult({ harness: 'aider', model: 'gpt-5', score: 0.9 }),
        makeResult({ harness: 'aider', model: 'claude', score: 0.5 }),
      ]),
    ]);
    const prior = makeSnapshot([
      makeBenchmark('swe-bench', [
        makeResult({ harness: 'aider', model: 'gpt-5', score: 0.9 }),
      ]),
    ]);
    const cards = buildLeaderCards(current, prior);
    expect(cards[0].current_leader).toEqual({ harness: 'aider', model: 'gpt-5', score: 0.9 });
  });

  it('current_leader is null when benchmark is empty', () => {
    const current = makeSnapshot([makeBenchmark('swe-bench', [])]);
    const prior = makeSnapshot([makeBenchmark('swe-bench', [])]);
    const cards = buildLeaderCards(current, prior);
    expect(cards[0].current_leader).toBeNull();
    expect(cards[0].prior_leader).toBeNull();
    expect(cards[0].leader_changed).toBe(false);
  });

  it('sorted by benchmark id asc', () => {
    const current = makeSnapshot([
      makeBenchmark('z-bench', [makeResult({ harness: 'h', model: 'm', score: 0.1 })]),
      makeBenchmark('a-bench', [makeResult({ harness: 'h', model: 'm', score: 0.1 })]),
      makeBenchmark('m-bench', [makeResult({ harness: 'h', model: 'm', score: 0.1 })]),
    ]);
    const prior = makeSnapshot([]);
    const cards = buildLeaderCards(current, prior);
    expect(cards.map((c) => c.benchmark)).toEqual(['a-bench', 'm-bench', 'z-bench']);
  });
});

// ── buildDeltasResponse: scaffolding ───────────────────────────────

describe('buildDeltasResponse: scaffolding', () => {
  it('ok=true and capturedAt is set', () => {
    const r = buildDeltasResponse(makeSnapshot([]), makeSnapshot([]), DEFAULT_FILTER);
    expect(r.ok).toBe(true);
    expect(typeof r.capturedAt).toBe('string');
    expect(r.capturedAt.length).toBeGreaterThan(0);
  });

  it('current_captured_at and prior_captured_at are echoed', () => {
    const current = makeSnapshot([], '2026-05-24T00:00:00.000Z');
    const prior = makeSnapshot([], '2026-05-17T00:00:00.000Z');
    const r = buildDeltasResponse(current, prior, DEFAULT_FILTER);
    expect(r.current_captured_at).toBe('2026-05-24T00:00:00.000Z');
    expect(r.prior_captured_at).toBe('2026-05-17T00:00:00.000Z');
  });

  it('filter is echoed back', () => {
    const filter = {
      days_back: 14,
      harness: 'aider',
      benchmark: 'swe-bench',
      model: 'gpt-5',
      min_abs_delta: 0.05,
    };
    const r = buildDeltasResponse(makeSnapshot([]), makeSnapshot([]), filter);
    expect(r.filter).toEqual(filter);
  });

  it('source field present', () => {
    const r = buildDeltasResponse(makeSnapshot([]), makeSnapshot([]), DEFAULT_FILTER);
    expect(r.source).toBe('terminalfeed.io federation cross-call');
  });
});

// ── buildDeltasResponse: days_between_snapshots ────────────────────

describe('buildDeltasResponse: days_between_snapshots', () => {
  it('computed correctly (7 day gap)', () => {
    const current = makeSnapshot([], '2026-05-24T00:00:00.000Z');
    const prior = makeSnapshot([], '2026-05-17T00:00:00.000Z');
    const r = buildDeltasResponse(current, prior, DEFAULT_FILTER);
    expect(r.days_between_snapshots).toBe(7);
  });

  it('at least 1 even when same day', () => {
    const current = makeSnapshot([], '2026-05-24T00:00:00.000Z');
    const prior = makeSnapshot([], '2026-05-24T00:00:00.000Z');
    const r = buildDeltasResponse(current, prior, DEFAULT_FILTER);
    expect(r.days_between_snapshots).toBe(1);
  });

  it('rounds to nearest day', () => {
    const current = makeSnapshot([], '2026-05-24T12:00:00.000Z');
    const prior = makeSnapshot([], '2026-05-21T00:00:00.000Z');
    const r = buildDeltasResponse(current, prior, DEFAULT_FILTER);
    // ~3.5 days -> rounds to 4
    expect(r.days_between_snapshots).toBe(4);
  });
});

// ── buildDeltasResponse: filters ───────────────────────────────────

describe('buildDeltasResponse: harness substring filter (case-insensitive)', () => {
  it('keeps rows whose harness contains needle case-insensitively', () => {
    const current = makeSnapshot([
      makeBenchmark('swe-bench', [
        makeResult({ harness: 'Aider', model: 'gpt-5', score: 0.7 }),
        makeResult({ harness: 'Codex', model: 'claude', score: 0.6 }),
      ]),
    ]);
    const prior = makeSnapshot([
      makeBenchmark('swe-bench', [
        makeResult({ harness: 'Aider', model: 'gpt-5', score: 0.5 }),
        makeResult({ harness: 'Codex', model: 'claude', score: 0.4 }),
      ]),
    ]);
    const r = buildDeltasResponse(current, prior, { ...DEFAULT_FILTER, harness: 'aid' });
    expect(r.cohort.rows_filtered).toBe(1);
    expect(r.rows.every((row) => row.harness.toLowerCase().includes('aid'))).toBe(true);
  });
});

describe('buildDeltasResponse: benchmark substring filter (case-insensitive)', () => {
  it('keeps rows whose benchmark contains needle case-insensitively', () => {
    const current = makeSnapshot([
      makeBenchmark('SWE-bench', [makeResult({ harness: 'a', model: 'm', score: 0.7 })]),
      makeBenchmark('Terminal-Bench', [makeResult({ harness: 'a', model: 'm', score: 0.6 })]),
    ]);
    const prior = makeSnapshot([
      makeBenchmark('SWE-bench', [makeResult({ harness: 'a', model: 'm', score: 0.5 })]),
      makeBenchmark('Terminal-Bench', [makeResult({ harness: 'a', model: 'm', score: 0.4 })]),
    ]);
    const r = buildDeltasResponse(current, prior, { ...DEFAULT_FILTER, benchmark: 'terminal' });
    expect(r.cohort.rows_filtered).toBe(1);
  });
});

describe('buildDeltasResponse: model substring filter (case-insensitive)', () => {
  it('keeps rows whose model contains needle case-insensitively', () => {
    const current = makeSnapshot([
      makeBenchmark('swe-bench', [
        makeResult({ harness: 'a', model: 'GPT-5', score: 0.7 }),
        makeResult({ harness: 'a', model: 'Claude-Opus', score: 0.6 }),
      ]),
    ]);
    const prior = makeSnapshot([
      makeBenchmark('swe-bench', [
        makeResult({ harness: 'a', model: 'GPT-5', score: 0.5 }),
        makeResult({ harness: 'a', model: 'Claude-Opus', score: 0.4 }),
      ]),
    ]);
    const r = buildDeltasResponse(current, prior, { ...DEFAULT_FILTER, model: 'gpt' });
    expect(r.cohort.rows_filtered).toBe(1);
  });
});

// ── buildDeltasResponse: min_abs_delta ─────────────────────────────

describe('buildDeltasResponse: min_abs_delta', () => {
  it('excludes gained rows below threshold', () => {
    const current = makeSnapshot([
      makeBenchmark('swe-bench', [
        makeResult({ harness: 'a', model: 'big', score: 0.9 }),
        makeResult({ harness: 'a', model: 'small', score: 0.51 }),
      ]),
    ]);
    const prior = makeSnapshot([
      makeBenchmark('swe-bench', [
        makeResult({ harness: 'a', model: 'big', score: 0.5 }),
        makeResult({ harness: 'a', model: 'small', score: 0.5 }),
      ]),
    ]);
    const r = buildDeltasResponse(current, prior, { ...DEFAULT_FILTER, min_abs_delta: 0.1 });
    // big gained by 0.4 (passes), small gained by 0.01 (excluded)
    expect(r.rows.map((row) => row.model)).toEqual(['big']);
  });

  it('excludes regressed rows below threshold', () => {
    const current = makeSnapshot([
      makeBenchmark('swe-bench', [
        makeResult({ harness: 'a', model: 'big', score: 0.1 }),
        makeResult({ harness: 'a', model: 'small', score: 0.49 }),
      ]),
    ]);
    const prior = makeSnapshot([
      makeBenchmark('swe-bench', [
        makeResult({ harness: 'a', model: 'big', score: 0.9 }),
        makeResult({ harness: 'a', model: 'small', score: 0.5 }),
      ]),
    ]);
    const r = buildDeltasResponse(current, prior, { ...DEFAULT_FILTER, min_abs_delta: 0.1 });
    // big dropped 0.8 (passes), small dropped 0.01 (excluded)
    expect(r.rows.map((row) => row.model)).toEqual(['big']);
  });

  it('excludes unchanged rows when threshold > 0', () => {
    const current = makeSnapshot([
      makeBenchmark('swe-bench', [makeResult({ harness: 'a', model: 'flat', score: 0.5 })]),
    ]);
    const prior = makeSnapshot([
      makeBenchmark('swe-bench', [makeResult({ harness: 'a', model: 'flat', score: 0.5 })]),
    ]);
    const r = buildDeltasResponse(current, prior, { ...DEFAULT_FILTER, min_abs_delta: 0.01 });
    expect(r.rows.length).toBe(0);
  });

  it('entered rows always pass (their delta is null)', () => {
    const current = makeSnapshot([
      makeBenchmark('swe-bench', [makeResult({ harness: 'a', model: 'new', score: 0.5 })]),
    ]);
    const prior = makeSnapshot([makeBenchmark('swe-bench', [])]);
    const r = buildDeltasResponse(current, prior, { ...DEFAULT_FILTER, min_abs_delta: 100 });
    expect(r.rows.length).toBe(1);
    expect(r.rows[0].change_kind).toBe('entered');
  });

  it('exited rows always pass (their delta is null)', () => {
    const current = makeSnapshot([makeBenchmark('swe-bench', [])]);
    const prior = makeSnapshot([
      makeBenchmark('swe-bench', [makeResult({ harness: 'a', model: 'old', score: 0.5 })]),
    ]);
    const r = buildDeltasResponse(current, prior, { ...DEFAULT_FILTER, min_abs_delta: 100 });
    expect(r.rows.length).toBe(1);
    expect(r.rows[0].change_kind).toBe('exited');
  });
});

// ── buildDeltasResponse: row sorting ───────────────────────────────

describe('buildDeltasResponse: row sort order', () => {
  it('rows sorted by |delta| desc', () => {
    const current = makeSnapshot([
      makeBenchmark('swe-bench', [
        makeResult({ harness: 'a', model: 'big', score: 0.9 }),
        makeResult({ harness: 'a', model: 'small', score: 0.55 }),
        makeResult({ harness: 'a', model: 'mid', score: 0.75 }),
      ]),
    ]);
    const prior = makeSnapshot([
      makeBenchmark('swe-bench', [
        makeResult({ harness: 'a', model: 'big', score: 0.5 }),
        makeResult({ harness: 'a', model: 'small', score: 0.5 }),
        makeResult({ harness: 'a', model: 'mid', score: 0.5 }),
      ]),
    ]);
    const r = buildDeltasResponse(current, prior, DEFAULT_FILTER);
    expect(r.rows.map((row) => row.model)).toEqual(['big', 'mid', 'small']);
  });

  it('ties broken: entered > exited > gained > regressed > unchanged', () => {
    // Build entered and exited rows (delta is null -> |delta| treated as 0)
    // and an unchanged row so they tie on |delta|.
    const current = makeSnapshot([
      makeBenchmark('swe-bench', [
        makeResult({ harness: 'a', model: 'entered', score: 0.5 }),
        makeResult({ harness: 'a', model: 'unchanged', score: 0.5 }),
      ]),
    ]);
    const prior = makeSnapshot([
      makeBenchmark('swe-bench', [
        makeResult({ harness: 'a', model: 'exited', score: 0.5 }),
        makeResult({ harness: 'a', model: 'unchanged', score: 0.5 }),
      ]),
    ]);
    const r = buildDeltasResponse(current, prior, DEFAULT_FILTER);
    const kinds = r.rows.map((row) => row.change_kind);
    // entered should come before exited which should come before unchanged
    expect(kinds.indexOf('entered')).toBeLessThan(kinds.indexOf('exited'));
    expect(kinds.indexOf('exited')).toBeLessThan(kinds.indexOf('unchanged'));
  });
});

// ── buildDeltasResponse: notable_movers ────────────────────────────

describe('buildDeltasResponse: notable_movers.biggest_gainers', () => {
  it('top-5 by delta desc among gained rows', () => {
    const current = makeSnapshot([
      makeBenchmark('b', [
        makeResult({ harness: 'a', model: 'm1', score: 0.9 }),
        makeResult({ harness: 'a', model: 'm2', score: 0.8 }),
        makeResult({ harness: 'a', model: 'm3', score: 0.7 }),
        makeResult({ harness: 'a', model: 'm4', score: 0.65 }),
        makeResult({ harness: 'a', model: 'm5', score: 0.6 }),
        makeResult({ harness: 'a', model: 'm6', score: 0.55 }),
      ]),
    ]);
    const prior = makeSnapshot([
      makeBenchmark('b', [
        makeResult({ harness: 'a', model: 'm1', score: 0.1 }),
        makeResult({ harness: 'a', model: 'm2', score: 0.1 }),
        makeResult({ harness: 'a', model: 'm3', score: 0.1 }),
        makeResult({ harness: 'a', model: 'm4', score: 0.1 }),
        makeResult({ harness: 'a', model: 'm5', score: 0.1 }),
        makeResult({ harness: 'a', model: 'm6', score: 0.1 }),
      ]),
    ]);
    const r = buildDeltasResponse(current, prior, DEFAULT_FILTER);
    expect(r.notable_movers.biggest_gainers.length).toBe(5);
    expect(r.notable_movers.biggest_gainers[0].model).toBe('m1');
    expect(r.notable_movers.biggest_gainers[4].model).toBe('m5');
  });

  it('excludes entered rows from biggest_gainers', () => {
    const current = makeSnapshot([
      makeBenchmark('b', [makeResult({ harness: 'a', model: 'new', score: 0.9 })]),
    ]);
    const prior = makeSnapshot([makeBenchmark('b', [])]);
    const r = buildDeltasResponse(current, prior, DEFAULT_FILTER);
    expect(r.notable_movers.biggest_gainers.length).toBe(0);
  });
});

describe('buildDeltasResponse: notable_movers.biggest_regressions', () => {
  it('top-5 by delta asc (most negative first) among regressed rows', () => {
    const current = makeSnapshot([
      makeBenchmark('b', [
        makeResult({ harness: 'a', model: 'm1', score: 0.1 }),
        makeResult({ harness: 'a', model: 'm2', score: 0.2 }),
        makeResult({ harness: 'a', model: 'm3', score: 0.3 }),
        makeResult({ harness: 'a', model: 'm4', score: 0.35 }),
        makeResult({ harness: 'a', model: 'm5', score: 0.4 }),
        makeResult({ harness: 'a', model: 'm6', score: 0.45 }),
      ]),
    ]);
    const prior = makeSnapshot([
      makeBenchmark('b', [
        makeResult({ harness: 'a', model: 'm1', score: 0.9 }),
        makeResult({ harness: 'a', model: 'm2', score: 0.9 }),
        makeResult({ harness: 'a', model: 'm3', score: 0.9 }),
        makeResult({ harness: 'a', model: 'm4', score: 0.9 }),
        makeResult({ harness: 'a', model: 'm5', score: 0.9 }),
        makeResult({ harness: 'a', model: 'm6', score: 0.9 }),
      ]),
    ]);
    const r = buildDeltasResponse(current, prior, DEFAULT_FILTER);
    expect(r.notable_movers.biggest_regressions.length).toBe(5);
    expect(r.notable_movers.biggest_regressions[0].model).toBe('m1');
  });
});

describe('buildDeltasResponse: notable_movers.entered and exited', () => {
  it('up to 5 from entered rows', () => {
    const current = makeSnapshot([
      makeBenchmark('b', [
        makeResult({ harness: 'a', model: 'n1', score: 0.1 }),
        makeResult({ harness: 'a', model: 'n2', score: 0.2 }),
        makeResult({ harness: 'a', model: 'n3', score: 0.3 }),
        makeResult({ harness: 'a', model: 'n4', score: 0.4 }),
        makeResult({ harness: 'a', model: 'n5', score: 0.5 }),
        makeResult({ harness: 'a', model: 'n6', score: 0.6 }),
      ]),
    ]);
    const prior = makeSnapshot([makeBenchmark('b', [])]);
    const r = buildDeltasResponse(current, prior, DEFAULT_FILTER);
    expect(r.notable_movers.entered.length).toBe(5);
  });

  it('up to 5 from exited rows', () => {
    const current = makeSnapshot([makeBenchmark('b', [])]);
    const prior = makeSnapshot([
      makeBenchmark('b', [
        makeResult({ harness: 'a', model: 'o1', score: 0.1 }),
        makeResult({ harness: 'a', model: 'o2', score: 0.2 }),
        makeResult({ harness: 'a', model: 'o3', score: 0.3 }),
        makeResult({ harness: 'a', model: 'o4', score: 0.4 }),
        makeResult({ harness: 'a', model: 'o5', score: 0.5 }),
        makeResult({ harness: 'a', model: 'o6', score: 0.6 }),
      ]),
    ]);
    const r = buildDeltasResponse(current, prior, DEFAULT_FILTER);
    expect(r.notable_movers.exited.length).toBe(5);
  });

  it('entered/exited fewer than 5 returns however many exist', () => {
    const current = makeSnapshot([
      makeBenchmark('b', [makeResult({ harness: 'a', model: 'only', score: 0.1 })]),
    ]);
    const prior = makeSnapshot([makeBenchmark('b', [])]);
    const r = buildDeltasResponse(current, prior, DEFAULT_FILTER);
    expect(r.notable_movers.entered.length).toBe(1);
  });
});

// ── buildDeltasResponse: summary ───────────────────────────────────

describe('buildDeltasResponse: summary.by_change_kind', () => {
  it('has all 5 keys initialized to 0 when no rows', () => {
    const r = buildDeltasResponse(makeSnapshot([]), makeSnapshot([]), DEFAULT_FILTER);
    expect(r.summary.by_change_kind).toEqual({
      unchanged: 0,
      gained: 0,
      regressed: 0,
      entered: 0,
      exited: 0,
    });
  });

  it('counts correctly across rows', () => {
    const current = makeSnapshot([
      makeBenchmark('b', [
        makeResult({ harness: 'a', model: 'g', score: 0.9 }),    // gained
        makeResult({ harness: 'a', model: 'r', score: 0.1 }),    // regressed
        makeResult({ harness: 'a', model: 'u', score: 0.5 }),    // unchanged
        makeResult({ harness: 'a', model: 'e', score: 0.5 }),    // entered
      ]),
    ]);
    const prior = makeSnapshot([
      makeBenchmark('b', [
        makeResult({ harness: 'a', model: 'g', score: 0.5 }),
        makeResult({ harness: 'a', model: 'r', score: 0.9 }),
        makeResult({ harness: 'a', model: 'u', score: 0.5 }),
        makeResult({ harness: 'a', model: 'x', score: 0.5 }),    // exited
      ]),
    ]);
    const r = buildDeltasResponse(current, prior, DEFAULT_FILTER);
    expect(r.summary.by_change_kind.gained).toBe(1);
    expect(r.summary.by_change_kind.regressed).toBe(1);
    expect(r.summary.by_change_kind.unchanged).toBe(1);
    expect(r.summary.by_change_kind.entered).toBe(1);
    expect(r.summary.by_change_kind.exited).toBe(1);
  });
});

describe('buildDeltasResponse: summary.benchmarks_with_new_leader', () => {
  it('counts leader_cards where leader_changed=true', () => {
    const current = makeSnapshot([
      makeBenchmark('bench1', [makeResult({ harness: 'aider', model: 'gpt-5', score: 0.9 })]),
      makeBenchmark('bench2', [makeResult({ harness: 'codex', model: 'claude', score: 0.8 })]),
      makeBenchmark('bench3', [makeResult({ harness: 'aider', model: 'gpt-5', score: 0.7 })]),
    ]);
    const prior = makeSnapshot([
      makeBenchmark('bench1', [makeResult({ harness: 'old', model: 'oldm', score: 0.5 })]),  // changed
      makeBenchmark('bench2', [makeResult({ harness: 'codex', model: 'claude', score: 0.6 })]),  // same
      makeBenchmark('bench3', [makeResult({ harness: 'old2', model: 'oldm2', score: 0.5 })]),  // changed
    ]);
    const r = buildDeltasResponse(current, prior, DEFAULT_FILTER);
    expect(r.summary.benchmarks_with_new_leader).toBe(2);
  });
});

// ── buildDeltasResponse: cohort ────────────────────────────────────

describe('buildDeltasResponse: cohort', () => {
  it('rows_total = full unfiltered count', () => {
    const current = makeSnapshot([
      makeBenchmark('b', [
        makeResult({ harness: 'aider', model: 'gpt-5', score: 0.9 }),
        makeResult({ harness: 'codex', model: 'claude', score: 0.8 }),
      ]),
    ]);
    const prior = makeSnapshot([
      makeBenchmark('b', [
        makeResult({ harness: 'aider', model: 'gpt-5', score: 0.5 }),
        makeResult({ harness: 'codex', model: 'claude', score: 0.4 }),
      ]),
    ]);
    const r = buildDeltasResponse(current, prior, { ...DEFAULT_FILTER, harness: 'aider' });
    expect(r.cohort.rows_total).toBe(2);
  });

  it('rows_filtered = filtered count', () => {
    const current = makeSnapshot([
      makeBenchmark('b', [
        makeResult({ harness: 'aider', model: 'gpt-5', score: 0.9 }),
        makeResult({ harness: 'codex', model: 'claude', score: 0.8 }),
      ]),
    ]);
    const prior = makeSnapshot([
      makeBenchmark('b', [
        makeResult({ harness: 'aider', model: 'gpt-5', score: 0.5 }),
        makeResult({ harness: 'codex', model: 'claude', score: 0.4 }),
      ]),
    ]);
    const r = buildDeltasResponse(current, prior, { ...DEFAULT_FILTER, harness: 'aider' });
    expect(r.cohort.rows_filtered).toBe(1);
  });

  it('benchmarks_in_window = union size', () => {
    const current = makeSnapshot([
      makeBenchmark('only-in-current', []),
      makeBenchmark('in-both', []),
    ]);
    const prior = makeSnapshot([
      makeBenchmark('only-in-prior', []),
      makeBenchmark('in-both', []),
    ]);
    const r = buildDeltasResponse(current, prior, DEFAULT_FILTER);
    expect(r.cohort.benchmarks_in_window).toBe(3);
  });
});

// ── buildDeltasResponse: leader_cards ──────────────────────────────

describe('buildDeltasResponse: leader_cards', () => {
  it('leader_cards array present', () => {
    const current = makeSnapshot([
      makeBenchmark('b', [makeResult({ harness: 'aider', model: 'gpt-5', score: 0.9 })]),
    ]);
    const prior = makeSnapshot([
      makeBenchmark('b', [makeResult({ harness: 'aider', model: 'gpt-5', score: 0.7 })]),
    ]);
    const r = buildDeltasResponse(current, prior, DEFAULT_FILTER);
    expect(Array.isArray(r.leader_cards)).toBe(true);
    expect(r.leader_cards.length).toBe(1);
  });
});

// ── buildDeltasResponse: attribution ───────────────────────────────

describe('buildDeltasResponse: attribution', () => {
  it('attribution.source mentions TerminalFeed', () => {
    const r = buildDeltasResponse(makeSnapshot([]), makeSnapshot([]), DEFAULT_FILTER);
    expect(r.attribution.source).toContain('TerminalFeed');
  });

  it('attribution.notes mentions delta', () => {
    const r = buildDeltasResponse(makeSnapshot([]), makeSnapshot([]), DEFAULT_FILTER);
    expect(r.attribution.notes.toLowerCase()).toContain('delta');
  });

  it('attribution.notes mentions newly listed', () => {
    const r = buildDeltasResponse(makeSnapshot([]), makeSnapshot([]), DEFAULT_FILTER);
    expect(r.attribution.notes.toLowerCase()).toContain('newly listed');
  });

  it('attribution.license present and non-empty', () => {
    const r = buildDeltasResponse(makeSnapshot([]), makeSnapshot([]), DEFAULT_FILTER);
    expect(r.attribution.license.length).toBeGreaterThan(0);
  });
});
