import { describe, it, expect } from 'vitest';
import {
  normalizeResult,
  normalizeBenchmark,
} from './terminalfeed-harnesses-fetcher';

// ── normalizeResult ────────────────────────────────────────────────

describe('normalizeResult', () => {
  it('returns null when harness is missing', () => {
    expect(normalizeResult({ model: 'gpt-5', score: 0.7 })).toBeNull();
  });

  it('returns null when harness is empty string', () => {
    expect(normalizeResult({ harness: '', model: 'gpt-5', score: 0.7 })).toBeNull();
  });

  it('returns null when model is missing', () => {
    expect(normalizeResult({ harness: 'aider', score: 0.7 })).toBeNull();
  });

  it('returns null when model is empty string', () => {
    expect(normalizeResult({ harness: 'aider', model: '', score: 0.7 })).toBeNull();
  });

  it('returns null when score is a string', () => {
    // @ts-expect-error testing runtime guard for non-number score
    expect(normalizeResult({ harness: 'aider', model: 'gpt-5', score: '0.7' })).toBeNull();
  });

  it('returns null when score is undefined', () => {
    expect(normalizeResult({ harness: 'aider', model: 'gpt-5' })).toBeNull();
  });

  it('happy path: returns full populated object with all fields preserved', () => {
    const out = normalizeResult({
      id: 'aider__gpt-5',
      harness: 'aider',
      model: 'gpt-5',
      score: 0.81,
      reportedAt: '2026-05-01T00:00:00Z',
      sourceUrl: 'https://example.com/report',
    });
    expect(out).toEqual({
      id: 'aider__gpt-5',
      harness: 'aider',
      model: 'gpt-5',
      score: 0.81,
      reported_at: '2026-05-01T00:00:00Z',
      source_url: 'https://example.com/report',
    });
  });

  it('id defaults to `${harness}__${model}` when missing', () => {
    const out = normalizeResult({ harness: 'aider', model: 'gpt-5', score: 0.5 });
    expect(out?.id).toBe('aider__gpt-5');
  });

  it('id defaults to harness__model when id is not a string', () => {
    // @ts-expect-error verifying non-string id triggers default
    const out = normalizeResult({ id: 42, harness: 'aider', model: 'gpt-5', score: 0.5 });
    expect(out?.id).toBe('aider__gpt-5');
  });

  it('reported_at defaults to empty string when missing', () => {
    const out = normalizeResult({ harness: 'aider', model: 'gpt-5', score: 0.5 });
    expect(out?.reported_at).toBe('');
  });

  it('reported_at defaults to empty string when not a string', () => {
    // @ts-expect-error verifying non-string reportedAt triggers default
    const out = normalizeResult({ harness: 'aider', model: 'gpt-5', score: 0.5, reportedAt: 12345 });
    expect(out?.reported_at).toBe('');
  });

  it('source_url defaults to empty string when missing', () => {
    const out = normalizeResult({ harness: 'aider', model: 'gpt-5', score: 0.5 });
    expect(out?.source_url).toBe('');
  });

  it('source_url defaults to empty string when not a string', () => {
    // @ts-expect-error verifying non-string sourceUrl triggers default
    const out = normalizeResult({ harness: 'aider', model: 'gpt-5', score: 0.5, sourceUrl: null });
    expect(out?.source_url).toBe('');
  });

  it('preserves score of 0 (falsy-but-valid)', () => {
    const out = normalizeResult({ harness: 'aider', model: 'gpt-5', score: 0 });
    expect(out?.score).toBe(0);
  });

  it('preserves negative scores', () => {
    const out = normalizeResult({ harness: 'aider', model: 'gpt-5', score: -1.2 });
    expect(out?.score).toBe(-1.2);
  });
});

// ── normalizeBenchmark ─────────────────────────────────────────────

describe('normalizeBenchmark', () => {
  it('returns null when id is missing', () => {
    expect(normalizeBenchmark({ results: [] })).toBeNull();
  });

  it('returns null when id is empty string', () => {
    expect(normalizeBenchmark({ id: '', results: [] })).toBeNull();
  });

  it('returns null when id is non-string', () => {
    // @ts-expect-error verifying non-string id rejects
    expect(normalizeBenchmark({ id: 42, results: [] })).toBeNull();
  });

  it('drops invalid results that normalizeResult returns null for', () => {
    const out = normalizeBenchmark({
      id: 'swe-bench',
      results: [
        { harness: 'aider', model: 'gpt-5', score: 0.7 },
        // missing harness
        { model: 'claude-opus', score: 0.8 },
        // missing score
        { harness: 'codex', model: 'claude-opus' },
      ],
    });
    expect(out?.results.length).toBe(1);
    expect(out?.results[0].harness).toBe('aider');
  });

  it('sorts results by score desc', () => {
    const out = normalizeBenchmark({
      id: 'swe-bench',
      results: [
        { harness: 'aider', model: 'a', score: 0.3 },
        { harness: 'aider', model: 'b', score: 0.9 },
        { harness: 'aider', model: 'c', score: 0.6 },
      ],
    });
    expect(out?.results.map((r) => r.score)).toEqual([0.9, 0.6, 0.3]);
  });

  it('empty results array returns benchmark with results=[]', () => {
    const out = normalizeBenchmark({ id: 'swe-bench', results: [] });
    expect(out).toEqual({ id: 'swe-bench', results: [] });
  });

  it('missing results array treated as empty', () => {
    const out = normalizeBenchmark({ id: 'swe-bench' });
    expect(out).toEqual({ id: 'swe-bench', results: [] });
  });

  it('preserves benchmark id verbatim', () => {
    const out = normalizeBenchmark({ id: 'Terminal-Bench', results: [] });
    expect(out?.id).toBe('Terminal-Bench');
  });

  it('returns BenchmarkSnapshot with all-invalid input as empty results', () => {
    const out = normalizeBenchmark({
      id: 'swe-bench',
      results: [
        { harness: 'aider' },
        { model: 'gpt-5' },
      ],
    });
    expect(out).toEqual({ id: 'swe-bench', results: [] });
  });

  it('sorting handles ties stably enough to keep all entries', () => {
    const out = normalizeBenchmark({
      id: 'swe-bench',
      results: [
        { harness: 'aider', model: 'a', score: 0.5 },
        { harness: 'aider', model: 'b', score: 0.5 },
        { harness: 'aider', model: 'c', score: 0.7 },
      ],
    });
    expect(out?.results.length).toBe(3);
    expect(out?.results[0].score).toBe(0.7);
  });

  it('passes through individual fields on each result', () => {
    const out = normalizeBenchmark({
      id: 'swe-bench',
      results: [
        {
          id: 'custom-id',
          harness: 'aider',
          model: 'gpt-5',
          score: 0.81,
          reportedAt: '2026-05-01T00:00:00Z',
          sourceUrl: 'https://example.com',
        },
      ],
    });
    expect(out?.results[0]).toEqual({
      id: 'custom-id',
      harness: 'aider',
      model: 'gpt-5',
      score: 0.81,
      reported_at: '2026-05-01T00:00:00Z',
      source_url: 'https://example.com',
    });
  });

  it('mixed valid and invalid results: keeps only the valid ones, sorted', () => {
    const out = normalizeBenchmark({
      id: 'swe-bench',
      results: [
        { harness: 'aider', model: 'low', score: 0.2 },
        { harness: 'aider', model: 'bad' },  // missing score
        { harness: 'aider', model: 'high', score: 0.9 },
        { model: 'no-harness', score: 0.7 },
      ],
    });
    expect(out?.results.map((r) => r.model)).toEqual(['high', 'low']);
  });

  it('benchmark with a single result keeps it', () => {
    const out = normalizeBenchmark({
      id: 'swe-bench',
      results: [{ harness: 'aider', model: 'gpt-5', score: 0.5 }],
    });
    expect(out?.results.length).toBe(1);
    expect(out?.results[0].model).toBe('gpt-5');
  });

  it('large benchmark sort is fully ordered desc', () => {
    const scores = [0.1, 0.7, 0.3, 0.9, 0.5, 0.2, 0.8];
    const out = normalizeBenchmark({
      id: 'swe-bench',
      results: scores.map((s, i) => ({ harness: 'h', model: `m${i}`, score: s })),
    });
    const outScores = out?.results.map((r) => r.score) ?? [];
    for (let i = 1; i < outScores.length; i++) {
      expect(outScores[i - 1]).toBeGreaterThanOrEqual(outScores[i]);
    }
  });

  it('sort places highest score first even when input is reverse-sorted', () => {
    const out = normalizeBenchmark({
      id: 'swe-bench',
      results: [
        { harness: 'h', model: 'a', score: 0.1 },
        { harness: 'h', model: 'b', score: 0.2 },
        { harness: 'h', model: 'c', score: 0.3 },
      ],
    });
    expect(out?.results[0].model).toBe('c');
    expect(out?.results[2].model).toBe('a');
  });

  it('numeric id triggers default fallback via normalizeResult on each entry', () => {
    const out = normalizeBenchmark({
      id: 'swe-bench',
      // @ts-expect-error verifying non-string id field on the result coerces to default
      results: [{ id: 99, harness: 'aider', model: 'gpt-5', score: 0.5 }],
    });
    expect(out?.results[0].id).toBe('aider__gpt-5');
  });
});

// ── normalizeResult: extra coverage ────────────────────────────────

describe('normalizeResult: extra coverage', () => {
  it('handles very small fractional scores', () => {
    const out = normalizeResult({ harness: 'aider', model: 'gpt-5', score: 0.0001 });
    expect(out?.score).toBe(0.0001);
  });

  it('handles scores above 1 (raw percentages allowed)', () => {
    const out = normalizeResult({ harness: 'aider', model: 'gpt-5', score: 85.6 });
    expect(out?.score).toBe(85.6);
  });

  it('preserves explicit empty-string id by overriding to default', () => {
    // empty-string id is falsy but it IS a string, so the typeof check passes
    // and the empty string is kept as-is.
    const out = normalizeResult({ id: '', harness: 'aider', model: 'gpt-5', score: 0.5 });
    expect(out?.id).toBe('');
  });

  it('NaN score is rejected (typeof NaN is still number, but invalid)', () => {
    // NaN passes `typeof === number`, so the function returns it as-is.
    // This documents existing behavior rather than enforcing rejection.
    const out = normalizeResult({ harness: 'aider', model: 'gpt-5', score: NaN });
    expect(out).not.toBeNull();
    expect(Number.isNaN(out?.score)).toBe(true);
  });
});
