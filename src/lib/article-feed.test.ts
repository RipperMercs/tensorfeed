import { describe, expect, it } from 'vitest';
import { balanceSources } from './article-feed';
import type { NewsArticle } from './types';

// balanceSources shapes the homepage feed: it caps any single source at
// ~35% (floor, min 10), backfills overflow up to a target of min(len, 100),
// then sorts by publishedAt descending. Its purpose is that one busy source
// (e.g. Hacker News) does not crowd out the rest. Pure and deterministic.

function art(o: Partial<NewsArticle>): NewsArticle {
  return {
    id: 'id',
    title: '',
    url: 'https://example.com',
    source: '',
    sourceIcon: '',
    sourceDomain: 'example.com',
    snippet: '',
    categories: [],
    publishedAt: '2026-06-01T00:00:00Z',
    fetchedAt: '2026-06-01T00:00:00Z',
    ...o,
  };
}

function isSortedDescByDate(arr: NewsArticle[]): boolean {
  for (let i = 1; i < arr.length; i++) {
    if (new Date(arr[i - 1].publishedAt).getTime() < new Date(arr[i].publishedAt).getTime()) {
      return false;
    }
  }
  return true;
}

const JUNE = Date.UTC(2026, 5, 1, 12, 0, 0);
const MAY = Date.UTC(2026, 4, 1, 12, 0, 0);

describe('balanceSources', () => {
  it('returns an empty array for empty input', () => {
    expect(balanceSources([])).toEqual([]);
  });

  it('keeps every article for a small feed (cap is undone by backfill) and sorts by date desc', () => {
    // 15 from source A (over the cap floor of 10) + 5 from B = 20; all kept.
    const arts: NewsArticle[] = [];
    for (let i = 0; i < 15; i++) arts.push(art({ id: `a${i}`, source: 'A', publishedAt: new Date(JUNE - i * 60000).toISOString() }));
    for (let i = 0; i < 5; i++) arts.push(art({ id: `b${i}`, source: 'B', publishedAt: new Date(MAY - i * 60000).toISOString() }));
    const out = balanceSources(arts);
    expect(out).toHaveLength(20);
    expect(out.map(a => a.id).sort()).toEqual(arts.map(a => a.id).sort());
    expect(isSortedDescByDate(out)).toBe(true);
  });

  it('caps a large feed at 100 and preserves minority sources from being crowded out', () => {
    // 140 HN (newer) + 10 Other (older) = 150. A naive top-100-by-date would
    // return 100 HN and zero Other; balanceSources keeps all 10 Other.
    const arts: NewsArticle[] = [];
    for (let i = 0; i < 140; i++) arts.push(art({ id: `hn${i}`, source: 'HN', publishedAt: new Date(JUNE - i * 60000).toISOString() }));
    for (let i = 0; i < 10; i++) arts.push(art({ id: `ot${i}`, source: 'Other', publishedAt: new Date(MAY - i * 60000).toISOString() }));
    const out = balanceSources(arts);
    expect(out).toHaveLength(100); // target = min(150, 100)
    expect(out.filter(a => a.source === 'Other')).toHaveLength(10); // minority fully preserved
    expect(out.filter(a => a.source === 'HN')).toHaveLength(90);
    expect(isSortedDescByDate(out)).toBe(true);
  });
});
