import { describe, it, expect } from 'vitest';
import { withinWindow, selectWeeklyTargets, extractChangedSlugs } from './originals-factcheck';
import type { OriginalArticle } from './originals-directory';

const TODAY = Date.parse('June 15, 2026'); // fixed clock so tests never depend on the real date

describe('withinWindow', () => {
  it('includes an article 5 days old', () => {
    expect(withinWindow('June 10, 2026', TODAY, 14)).toBe(true);
  });
  it('includes the exact 14 day boundary', () => {
    expect(withinWindow('June 1, 2026', TODAY, 14)).toBe(true);
  });
  it('excludes an article 20 days old', () => {
    expect(withinWindow('May 26, 2026', TODAY, 14)).toBe(false);
  });
  it('includes a same day or future dated article', () => {
    expect(withinWindow('June 15, 2026', TODAY, 14)).toBe(true);
    expect(withinWindow('June 20, 2026', TODAY, 14)).toBe(true);
  });
  it('returns false for an unparseable date', () => {
    expect(withinWindow('not a date', TODAY, 14)).toBe(false);
  });
});

describe('selectWeeklyTargets', () => {
  const entries = [
    { slug: 'fresh', title: '', author: '', date: 'June 12, 2026', readTime: '', description: '' },
    { slug: 'old', title: '', author: '', date: 'May 1, 2026', readTime: '', description: '' },
  ] as OriginalArticle[];
  it('keeps only in-window entries', () => {
    expect(selectWeeklyTargets(entries, TODAY, 14).map((e) => e.slug)).toEqual(['fresh']);
  });
});

describe('extractChangedSlugs', () => {
  it('returns originals slugs and ignores other files', () => {
    const changed = [
      'src/app/originals/spacex-ipo-anthropic-colossus-compute/page.tsx',
      'src/app/originals/deepseek-maiden-funding-round-59-billion/page.tsx',
      'src/lib/originals-directory.ts',
      'public/llms.txt',
    ];
    expect(extractChangedSlugs(changed)).toEqual([
      'deepseek-maiden-funding-round-59-billion',
      'spacex-ipo-anthropic-colossus-compute',
    ]);
  });
  it('dedupes and handles backslashes and blank lines', () => {
    const changed = ['src\\app\\originals\\foo\\page.tsx', 'src/app/originals/foo/page.tsx', ''];
    expect(extractChangedSlugs(changed)).toEqual(['foo']);
  });
});
