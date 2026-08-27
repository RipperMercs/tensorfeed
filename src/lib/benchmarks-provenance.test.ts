import { describe, expect, it } from 'vitest';
import benchmarksJson from '../../data/benchmarks.json';

/**
 * data/benchmarks.json carries a per-cell `provenance` map recording who
 * produced each score: the model's own vendor, or an independent evaluator
 * that ran the model itself. The two are not interchangeable (observed gaps on
 * the same model and benchmark reach 10.9 points), so the field is only useful
 * if it stays strictly true.
 *
 * The failure this guards against is provenance drifting away from the scores
 * it describes: a cell keyed to a benchmark that no longer exists, provenance
 * left behind after its score was removed, or a citation that is not a URL.
 * A missing key is always legal and means "not recorded"; an inaccurate key is
 * not.
 */

interface ScoreProvenance {
  type: string;
  by: string;
  url: string;
}
interface ModelRow {
  model: string;
  scores: Record<string, number>;
  provenance?: Record<string, ScoreProvenance>;
}

const data = benchmarksJson as unknown as {
  benchmarks: { id: string }[];
  models: ModelRow[];
  provenanceNotes?: Record<string, unknown>;
};

const BENCHMARK_IDS = new Set(data.benchmarks.map(b => b.id));
const ALLOWED_TYPES = new Set(['vendor', 'independent']);

const withProvenance = data.models.filter(m => m.provenance);

describe('benchmarks.json score provenance', () => {
  it('documents the field so consumers can interpret a missing key', () => {
    expect(data.provenanceNotes, 'provenanceNotes block is missing').toBeDefined();
    expect(data.provenanceNotes?.absent, 'provenanceNotes must explain an absent key').toBeTruthy();
  });

  it('keys every provenance entry to a benchmark that exists', () => {
    const bad: string[] = [];
    for (const m of withProvenance) {
      for (const id of Object.keys(m.provenance!)) {
        if (!BENCHMARK_IDS.has(id)) bad.push(`${m.model}.${id}`);
      }
    }
    expect(bad, `provenance for unknown benchmark id(s): ${bad.join(', ')}`).toEqual([]);
  });

  it('never records provenance for a cell that has no score', () => {
    const orphans: string[] = [];
    for (const m of withProvenance) {
      for (const id of Object.keys(m.provenance!)) {
        if (typeof m.scores[id] !== 'number') orphans.push(`${m.model}.${id}`);
      }
    }
    expect(orphans, `provenance without a matching score: ${orphans.join(', ')}`).toEqual([]);
  });

  it('uses only the two defined provenance types', () => {
    const bad: string[] = [];
    for (const m of withProvenance) {
      for (const [id, p] of Object.entries(m.provenance!)) {
        if (!ALLOWED_TYPES.has(p.type)) bad.push(`${m.model}.${id}=${p.type}`);
      }
    }
    expect(bad, `unrecognized provenance type(s): ${bad.join(', ')}`).toEqual([]);
  });

  it('carries a named source and an http(s) citation on every entry', () => {
    const bad: string[] = [];
    for (const m of withProvenance) {
      for (const [id, p] of Object.entries(m.provenance!)) {
        if (!p.by || !p.by.trim()) bad.push(`${m.model}.${id} missing "by"`);
        if (!/^https?:\/\/\S+$/.test(p.url ?? '')) bad.push(`${m.model}.${id} bad url`);
      }
    }
    expect(bad, bad.join(', ')).toEqual([]);
  });
});
