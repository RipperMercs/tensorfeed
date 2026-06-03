import { describe, expect, it } from 'vitest';
import { getAllModelSlugs } from './model-directory';
import { getAllComparisonSlugs } from './comparison-directory';
import { getAllProviderSlugs } from './provider-directory';
import { getAllHarnessSlugs } from './harness-directory';
import { getAllBenchmarkSlugs } from './benchmark-directory';
import { getAllApiRefSlugs } from './api-reference-directory';

// These getters generate the DYNAMIC sitemap routes (/models/{slug},
// /compare/{slug}, /providers/{slug}, /harnesses/{slug}, /benchmarks/{slug},
// /api-reference/{slug}). sitemap-integrity.test.ts resolves only the LITERAL
// sitemap routes and deliberately skips the interpolated ones, so these slugs
// are otherwise unguarded. A duplicate slug collides two pages and emits a
// duplicate sitemap entry; a slug with whitespace, a slash, or uppercase breaks
// the URL or the case-sensitive route. The originals index had exactly a
// duplicate-slug bug, so this is a real class.

const DIRECTORIES: { name: string; slugs: string[] }[] = [
  { name: 'models', slugs: getAllModelSlugs() },
  { name: 'comparisons', slugs: getAllComparisonSlugs() },
  { name: 'providers', slugs: getAllProviderSlugs() },
  { name: 'harnesses', slugs: getAllHarnessSlugs() },
  { name: 'benchmarks', slugs: getAllBenchmarkSlugs() },
  { name: 'apiReference', slugs: getAllApiRefSlugs() },
];

// Lowercase alphanumerics plus dot, hyphen, underscore. Covers model slugs
// (claude-opus-4-8), benchmark slugs (swe_bench), and plain ones (news).
const SLUG_RE = /^[a-z0-9._-]+$/;

describe.each(DIRECTORIES)('directory slug integrity: $name', ({ name, slugs }) => {
  it('returns a non-empty slug list', () => {
    expect(slugs.length, `${name} produced no slugs`).toBeGreaterThan(0);
  });

  it('has no duplicate slugs', () => {
    const dupes = slugs.filter((s, i) => slugs.indexOf(s) !== i).sort();
    expect(dupes, `duplicate ${name} slugs: ${dupes.join(', ')}`).toEqual([]);
  });

  it('emits only URL-safe slugs', () => {
    const bad = slugs.filter(s => !SLUG_RE.test(s)).sort();
    expect(bad, `malformed ${name} slugs: ${bad.join(', ')}`).toEqual([]);
  });
});
