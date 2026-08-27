import { describe, it, expect } from 'vitest';
import { readFileSync, existsSync } from 'node:fs';
import { resolve } from 'node:path';
import { newestFlagship } from './data-freshness';

/**
 * Commit-time guard for the failure that turned the daily drift audit red on
 * 2026-08-27.
 *
 * data-freshness.ts marks the `benchmarks` dataset stale on EITHER of two arms:
 * age against its SLA, or coverage ("leaderboard predates <newest catalog
 * flagship>"). Adding a flagship-tier model to data/pricing.json therefore
 * turns the audit red the moment it deploys, silently, until data/benchmarks.json
 * gains a matching row. That is exactly what happened when Qwen3.8 2.4T-A95B was
 * added to the catalog with no benchmark row: age was fine at 1 day against a
 * 14d SLA, and the coverage arm stayed red for a day.
 *
 * Nothing caught it at commit time, because the two files are edited by hand and
 * no test related them. This does.
 *
 * It imports the REAL newestFlagship from data-freshness.ts rather than
 * reimplementing the rule, so the gate cannot drift from the audit it protects.
 */

interface PricingModel { id?: string; name?: string; released?: string; tier?: string }
interface Pricing { providers?: { models?: PricingModel[] }[] }
interface Benchmarks { models?: { model?: string }[] }

function load<T>(file: string): T {
  // Worker tests run from worker/; fall back across candidate roots so the
  // lookup survives a different cwd.
  for (const rel of [`../data/${file}`, `data/${file}`, `../../data/${file}`]) {
    const abs = resolve(process.cwd(), rel);
    if (existsSync(abs)) return JSON.parse(readFileSync(abs, 'utf8')) as T;
  }
  throw new Error(`data/${file} not found from cwd ${process.cwd()}`);
}

/**
 * Flagship-tier catalog models that have no benchmark row and predate this
 * guard. They do not block a commit, but nothing may be ADDED here: a new
 * uncovered flagship fails the suite. If one of these gains a row, the test
 * fails too, so the list cannot quietly rot into a permanent exemption.
 */
const KNOWN_UNCOVERED_FLAGSHIPS = [
  'Command R+',      // 2024-04, Cohere, no published scores on the tracked set
  'Grok 4.3',        // 2026-04, superseded by 4.5 and 4.6, both of which are covered
  'Qwen3.7-Max',     // 2026-05, superseded by Qwen3.8-Max, which is covered
];

// Same canonicalization data-freshness.ts uses, so "Claude Opus 4.8" matches a
// board entry like "Claude Opus 4.8 Thinking".
const canon = (s: string) => s.toLowerCase().replace(/[\s._-]+/g, ' ').trim();

const pricing = load<Pricing>('pricing.json');
const benchmarks = load<Benchmarks>('benchmarks.json');

const coveredNames = new Set(
  (benchmarks.models ?? []).map(m => canon(m.model ?? '')).filter(Boolean),
);
const isCovered = (name: string) => {
  const c = canon(name);
  return [...coveredNames].some(x => x === c || x.startsWith(`${c} `));
};

const flagships = (pricing.providers ?? [])
  .flatMap(p => p.models ?? [])
  .filter(m => m.tier === 'flagship' && m.name);

describe('benchmark coverage of the model catalog', () => {
  it('covers the newest catalog flagship, the exact condition the drift audit checks', () => {
    const flagship = newestFlagship(pricing);
    expect(flagship, 'pricing.json has no flagship-tier model with a released date').not.toBeNull();
    expect(
      isCovered(flagship!.name),
      `data/benchmarks.json has no row for "${flagship!.name}" (${flagship!.released}), the newest ` +
        'flagship in data/pricing.json. The daily drift audit will report the benchmarks dataset ' +
        'stale with "leaderboard predates ' + flagship!.name + '" as soon as this deploys. Add a row ' +
        'with whatever scores are actually published for it, or leave the model out of pricing.json.',
    ).toBe(true);
  });

  it('adds no new uncovered flagship beyond the documented pre-existing set', () => {
    const uncovered = flagships
      .map(m => m.name!)
      .filter(n => !isCovered(n))
      .filter(n => !KNOWN_UNCOVERED_FLAGSHIPS.includes(n))
      .sort();
    expect(
      uncovered,
      `flagship-tier models in data/pricing.json with no data/benchmarks.json row: ${uncovered.join(', ')}. ` +
        'Add a benchmark row, or if no scores are published yet, add the name to ' +
        'KNOWN_UNCOVERED_FLAGSHIPS in this file with a one-line reason.',
    ).toEqual([]);
  });

  it('keeps the exemption list honest by failing on entries that are now covered', () => {
    const nowCovered = KNOWN_UNCOVERED_FLAGSHIPS.filter(isCovered).sort();
    expect(
      nowCovered,
      `these are listed in KNOWN_UNCOVERED_FLAGSHIPS but now HAVE a benchmark row: ${nowCovered.join(', ')}. ` +
        'Remove them from the list so it keeps reflecting real debt.',
    ).toEqual([]);
  });

  it('lists only real flagship models in the exemption set', () => {
    const names = new Set(flagships.map(m => canon(m.name!)));
    const stale = KNOWN_UNCOVERED_FLAGSHIPS.filter(n => !names.has(canon(n))).sort();
    expect(
      stale,
      `these are in KNOWN_UNCOVERED_FLAGSHIPS but are no longer flagship-tier models in ` +
        `data/pricing.json: ${stale.join(', ')}. Remove them.`,
    ).toEqual([]);
  });
});
