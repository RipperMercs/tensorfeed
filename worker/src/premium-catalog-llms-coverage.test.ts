/**
 * llms.txt coverage drift guard.
 *
 * public/llms.txt is the hand-authored, richly-described agent-discovery
 * surface (an LLM reads it to learn what TensorFeed serves). It is deliberately
 * NOT generated: its value is the curated per-endpoint descriptions. But that
 * also lets it silently drift behind the catalog, which it had (15 payable
 * endpoints undocumented as of 2026-06-12).
 *
 * This guard asserts every PREMIUM_CATALOG path is mentioned in llms.txt, so a
 * new premium endpoint cannot ship without a hand-written entry. It does NOT
 * dictate the wording: it only requires the path to appear, leaving the
 * description to a human in the file's established voice.
 *
 * If this fails, add an entry for the listed path to public/llms.txt (match the
 * surrounding "- [Premium ...](url): 1 credit, AFTA-signed. ..." format).
 */

import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import { describe, it, expect } from 'vitest';
import { PREMIUM_CATALOG } from './premium-catalog';

const HERE = dirname(fileURLToPath(import.meta.url));
const LLMS_PATH = join(HERE, '..', '..', 'public', 'llms.txt');

// A catalog path is documented when llms.txt contains it, treating each {param}
// segment as a wildcard so a concrete example, or the {param} token itself, both
// satisfy it. A middle param (status/{provider}/incidents/triage) still requires
// the per-provider form, not just the base path, because the segment must be
// present for the regex to match.
function isDocumented(llms: string, path: string): boolean {
  const pattern = path
    .split('/')
    .map((seg) =>
      /^\{[^}]+\}$/.test(seg) ? '[^/\\s)\\]]+' : seg.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'),
    )
    .join('/');
  return new RegExp(pattern).test(llms);
}

describe('llms.txt documents every premium endpoint', () => {
  const llms = readFileSync(LLMS_PATH, 'utf8');

  it('every PREMIUM_CATALOG path appears in public/llms.txt', () => {
    const undocumented = PREMIUM_CATALOG.filter((e) => !isDocumented(llms, e.path)).map(
      (e) => e.path,
    );
    expect(
      undocumented,
      `These payable endpoints are not documented in public/llms.txt, the agent-discovery ` +
        `surface. Add an entry for each in the established voice ` +
        `("- [Premium ...](https://tensorfeed.ai<path>): 1 credit, AFTA-signed. ..."):\n  ${undocumented.join('\n  ')}`,
    ).toEqual([]);
  });
});
