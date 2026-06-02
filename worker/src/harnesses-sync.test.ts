import { describe, it, expect } from 'vitest';
import { readFileSync, existsSync } from 'node:fs';
import { resolve } from 'node:path';
import { HARNESSES_DATA } from './harnesses';

/**
 * Mirror-drift guard for the harness board (see catalog-benchmarks-sync). The
 * comment on HARNESSES_DATA states its shape mirrors data/harnesses.json so the
 * static page and the API agree; the TerminalFeed federation overlay is applied
 * separately at request time, not baked into this constant. So the base
 * constant must equal the canonical file exactly, or the page and the API base
 * diverge.
 */
function loadCanonical(): unknown {
  for (const rel of ['../data/harnesses.json', 'data/harnesses.json', '../../data/harnesses.json']) {
    const abs = resolve(process.cwd(), rel);
    if (existsSync(abs)) return JSON.parse(readFileSync(abs, 'utf8'));
  }
  throw new Error(`data/harnesses.json not found from cwd ${process.cwd()}`);
}

describe('HARNESSES_DATA stays in sync with data/harnesses.json', () => {
  it('mirrors the canonical harness data exactly', () => {
    expect(HARNESSES_DATA).toEqual(loadCanonical());
  });
});
