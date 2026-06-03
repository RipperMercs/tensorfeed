import { describe, expect, it } from 'vitest';
import { filterByChip, chipCounts, CHIPS } from './feed-chips';
import type { ChipKey } from './feed-chips';
import type { NewsArticle } from './types';

// filterByChip and chipCounts drive the homepage news-feed brand chips and
// their per-chip counts. The matching is dense (per-provider brand regexes plus
// source and category fallbacks) and regression-prone, so a silent regex change
// would mis-filter or mis-count the user-facing feed with nothing to catch it.
// Pure and deterministic.

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

// One article per provider chip, each constructed to match only its own chip.
// Brand matches come from the title even though the source is a third party.
const anthropic = art({ id: 'a', title: 'Claude Opus 4 released', source: 'The Verge' });
const openai = art({ id: 'o', title: 'OpenAI ships GPT-5', source: 'TechCrunch' });
const google = art({ id: 'g', title: 'Gemini 2 launch', source: 'TechCrunch' });
const meta = art({ id: 'm', title: 'Meta AI releases Llama 4', source: 'TechCrunch' });
const research = art({ id: 'r', title: 'New arxiv paper on benchmarks', source: 'arXiv', categories: ['research'] });
const hardware = art({ id: 'h', title: 'NVIDIA Blackwell B200', source: 'TechCrunch' });
const hackernews = art({ id: 'hn', title: 'Show HN: my project', source: 'Hacker News' });
// Two articles that should match NO chip.
const offTopic = art({ id: 'x', title: 'Weather forecast Tuesday', snippet: 'sunny', source: 'Local News', categories: ['weather'] });
const metadataGuard = art({ id: 'md', title: 'New metadata standards', source: 'Standards Org' });

const ARTICLES = [anthropic, openai, google, meta, research, hardware, hackernews, offTopic, metadataGuard];

const EXPECTED: Record<Exclude<ChipKey, 'all'>, NewsArticle> = {
  anthropic,
  openai,
  google,
  meta,
  research,
  hardware,
  hackernews,
};

describe('feed-chips filterByChip', () => {
  it('all returns the full array unchanged', () => {
    expect(filterByChip(ARTICLES, 'all')).toEqual(ARTICLES);
  });

  it('matches each provider via its own article, exactly one each', () => {
    for (const key of Object.keys(EXPECTED) as Array<Exclude<ChipKey, 'all'>>) {
      const got = filterByChip(ARTICLES, key).map(a => a.id);
      expect(got, `chip ${key}`).toEqual([EXPECTED[key].id]);
    }
  });

  it('does not match meta on the word "metadata" (word-boundary guard); the metadata-only article matches no chip', () => {
    for (const def of CHIPS) {
      if (def.key === 'all') continue;
      expect(filterByChip(ARTICLES, def.key).map(a => a.id), `chip ${def.key}`).not.toContain('md');
    }
  });
});

describe('feed-chips chipCounts', () => {
  it('all equals total and every chip count equals its filter length', () => {
    const counts = chipCounts(ARTICLES);
    expect(counts.all).toBe(ARTICLES.length);
    for (const def of CHIPS) {
      if (def.key === 'all') continue;
      expect(counts[def.key], `count ${def.key}`).toBe(filterByChip(ARTICLES, def.key).length);
    }
  });

  it('counts exactly one article per provider for the fixture', () => {
    const counts = chipCounts(ARTICLES);
    expect(counts.anthropic).toBe(1);
    expect(counts.openai).toBe(1);
    expect(counts.google).toBe(1);
    expect(counts.meta).toBe(1);
    expect(counts.research).toBe(1);
    expect(counts.hardware).toBe(1);
    expect(counts.hackernews).toBe(1);
  });
});
