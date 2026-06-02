import { describe, it, expect } from 'vitest';
import { readFileSync, existsSync } from 'node:fs';
import { resolve } from 'node:path';
import { BASELINE_AGENTS } from './catalog';

/**
 * Third instance of the mirror-drift guard (see catalog-benchmarks-sync and
 * catalog-pricing-sync). BASELINE_AGENTS seeds the agents-directory KV and is
 * meant to mirror data/agents-directory.json. Agents are seed-only (no runtime
 * merge), so the invariant is exact equality: any provider/agent added to the
 * canonical file must be reflected in the worker baseline or /agents serves a
 * narrower directory than the site's own data.
 */
function loadCanonical(): unknown {
  for (const rel of ['../data/agents-directory.json', 'data/agents-directory.json', '../../data/agents-directory.json']) {
    const abs = resolve(process.cwd(), rel);
    if (existsSync(abs)) return JSON.parse(readFileSync(abs, 'utf8'));
  }
  throw new Error(`data/agents-directory.json not found from cwd ${process.cwd()}`);
}

describe('BASELINE_AGENTS stays in sync with data/agents-directory.json', () => {
  it('mirrors the canonical agents directory exactly', () => {
    expect(BASELINE_AGENTS).toEqual(loadCanonical());
  });
});
