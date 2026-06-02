import { describe, it, expect } from 'vitest';
import { readFileSync, existsSync } from 'node:fs';
import { resolve } from 'node:path';
import { BASELINE_BENCHMARKS } from './catalog';

/**
 * Guard against the dual-source drift that froze /api/benchmarks (and the TFII
 * intelligence index + /models that read it) at an old model set.
 *
 * data/benchmarks.json is the canonical editorial source. BASELINE_BENCHMARKS
 * is the worker mirror that seeds the benchmarks KV. They are maintained by
 * hand, and on 2026-05-24 the canonical file gained three flagship models
 * (GPT-5.5, DeepSeek V4 Pro, DeepSeek V4 Flash) while the worker mirror was not
 * re-synced, so the API served April data for weeks. This test fails the moment
 * the two diverge, forcing a re-sync on any benchmark data edit.
 */
function loadCanonical(): unknown {
  // Tests run from the worker/ dir (cd worker && npm test); fall back to a few
  // candidate relative paths so the lookup is robust to the cwd.
  for (const rel of ['../data/benchmarks.json', 'data/benchmarks.json', '../../data/benchmarks.json']) {
    const abs = resolve(process.cwd(), rel);
    if (existsSync(abs)) return JSON.parse(readFileSync(abs, 'utf8'));
  }
  throw new Error(`data/benchmarks.json not found from cwd ${process.cwd()}`);
}

describe('BASELINE_BENCHMARKS stays in sync with data/benchmarks.json', () => {
  it('mirrors the canonical benchmark data exactly (models, scores, order, date)', () => {
    expect(BASELINE_BENCHMARKS).toEqual(loadCanonical());
  });
});
