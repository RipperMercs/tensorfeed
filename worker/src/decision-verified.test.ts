import { describe, expect, it } from 'vitest';
import {
  buildSourceBreakdown,
  matchScore,
  parseLookupQuery,
  parseSearchQuery,
  sourceDiversityScore,
  tierFromSourceCount,
  timeSpanFromTimestamps,
  verifyCluster,
} from './decision-verified';
import type { ClusterEntry } from './news-clustering';

function makeCluster(overrides: Partial<ClusterEntry> = {}): ClusterEntry {
  return {
    cluster_id: 'cid-abc',
    date: '2026-05-12',
    article_count: 4,
    source_count: 3,
    sources: ['Reuters', 'AP', 'Bloomberg'],
    article_ids: ['a1', 'a2', 'a3', 'a4'],
    hero: {
      id: 'a1',
      title: 'OpenAI ships Daybreak with cyber tier',
      url: 'https://example.com/a1',
      source: 'Reuters',
      publishedAt: '2026-05-12T10:00:00Z',
    },
    first_seen_at: '2026-05-12T10:00:00Z',
    corroboration_band: 'limited',
    ...overrides,
  };
}

describe('tierFromSourceCount', () => {
  it('returns single for 0 or 1 sources', () => {
    expect(tierFromSourceCount(0)).toBe('single');
    expect(tierFromSourceCount(1)).toBe('single');
  });
  it('returns limited for 2 to 3', () => {
    expect(tierFromSourceCount(2)).toBe('limited');
    expect(tierFromSourceCount(3)).toBe('limited');
  });
  it('returns moderately-corroborated for 4 to 7', () => {
    expect(tierFromSourceCount(4)).toBe('moderately-corroborated');
    expect(tierFromSourceCount(7)).toBe('moderately-corroborated');
  });
  it('returns broadly-verified for 8 to 15', () => {
    expect(tierFromSourceCount(8)).toBe('broadly-verified');
    expect(tierFromSourceCount(15)).toBe('broadly-verified');
  });
  it('returns widely-reported for 16+', () => {
    expect(tierFromSourceCount(16)).toBe('widely-reported');
    expect(tierFromSourceCount(100)).toBe('widely-reported');
  });
});

describe('sourceDiversityScore', () => {
  it('returns 1.0 when every article is a distinct source', () => {
    expect(sourceDiversityScore(5, 5)).toBe(1);
  });
  it('returns 0.5 when half the articles are wire reprints', () => {
    expect(sourceDiversityScore(5, 10)).toBe(0.5);
  });
  it('returns 0 when article count is 0', () => {
    expect(sourceDiversityScore(3, 0)).toBe(0);
  });
  it('caps at 1.0 if distinctSources somehow exceeds articleCount', () => {
    expect(sourceDiversityScore(10, 3)).toBe(1);
  });
});

describe('timeSpanFromTimestamps', () => {
  it('returns null span for empty input', () => {
    expect(timeSpanFromTimestamps([])).toEqual({
      first_seen_at: null,
      last_seen_at: null,
      span_hours: null,
    });
  });
  it('returns null span_hours when only one timestamp', () => {
    const out = timeSpanFromTimestamps(['2026-05-12T10:00:00Z']);
    expect(out.first_seen_at).toBe('2026-05-12T10:00:00.000Z');
    expect(out.last_seen_at).toBe('2026-05-12T10:00:00.000Z');
    expect(out.span_hours).toBeNull();
  });
  it('computes span_hours across multiple timestamps', () => {
    const out = timeSpanFromTimestamps([
      '2026-05-12T10:00:00Z',
      '2026-05-12T13:30:00Z',
      null,
      '2026-05-12T12:00:00Z',
    ]);
    expect(out.first_seen_at).toBe('2026-05-12T10:00:00.000Z');
    expect(out.last_seen_at).toBe('2026-05-12T13:30:00.000Z');
    expect(out.span_hours).toBe(3.5);
  });
});

describe('buildSourceBreakdown', () => {
  it('groups by source, counts, and surfaces earliest per source', () => {
    const out = buildSourceBreakdown([
      { id: '1', title: 't', url: '', source: 'AP', publishedAt: '2026-05-12T10:00:00Z' },
      { id: '2', title: 't', url: '', source: 'AP', publishedAt: '2026-05-12T11:00:00Z' },
      { id: '3', title: 't', url: '', source: 'Reuters', publishedAt: '2026-05-12T09:00:00Z' },
    ]);
    expect(out).toHaveLength(2);
    expect(out[0]).toMatchObject({ source: 'AP', article_count: 2, first_published: '2026-05-12T10:00:00.000Z' });
    expect(out[1]).toMatchObject({ source: 'Reuters', article_count: 1, first_published: '2026-05-12T09:00:00.000Z' });
  });
  it('treats missing source as "unknown"', () => {
    const out = buildSourceBreakdown([
      { id: '1', title: 't', url: '', source: '', publishedAt: null },
    ]);
    expect(out[0].source).toBe('unknown');
  });
});

describe('matchScore', () => {
  it('returns 1.0 for direct substring match', () => {
    expect(matchScore('Daybreak', 'OpenAI ships Daybreak with cyber tier')).toBe(1);
  });
  it('falls back to Jaccard for token overlap', () => {
    const s = matchScore('openai gpt 5 launch', 'OpenAI launches GPT-5 today');
    // Tokens: { openai, gpt, launch } vs { openai, launches, gpt } overlap = {openai, gpt}
    // Intersect 2, union 4, score 0.5
    expect(s).toBeGreaterThanOrEqual(0.4);
    expect(s).toBeLessThanOrEqual(0.6);
  });
  it('returns 0 for completely unrelated text', () => {
    expect(matchScore('OpenAI GPT', 'recipes for sourdough')).toBe(0);
  });
  it('returns 0 for empty input', () => {
    expect(matchScore('', 'anything')).toBe(0);
    expect(matchScore('something', '')).toBe(0);
  });
});

describe('verifyCluster', () => {
  it('builds a complete VerificationResult from a 3-source cluster', () => {
    const out = verifyCluster(makeCluster());
    expect(out.cluster_id).toBe('cid-abc');
    expect(out.verification.tier).toBe('limited');
    expect(out.verification.source_count).toBe(3);
    expect(out.verification.article_count).toBe(4);
    expect(out.verification.source_diversity_score).toBeCloseTo(0.75, 5);
    expect(out.sources.length).toBe(3);
    // Article counts distributed across 3 sources for 4 articles: 2+1+1
    expect(out.sources.reduce((sum, s) => sum + s.article_count, 0)).toBe(4);
    expect(out.articles.length).toBe(4);
    expect(out.articles[0].id).toBe('a1');
  });
  it('upgrades the tier label as source_count rises', () => {
    const big = verifyCluster(makeCluster({ source_count: 12, article_count: 20 }));
    expect(big.verification.tier).toBe('broadly-verified');
  });
});

describe('parseLookupQuery', () => {
  it('accepts a valid query', () => {
    const url = new URL('https://tf/?cluster_id=abc123&date=2026-05-12');
    const out = parseLookupQuery(url);
    expect(out.ok).toBe(true);
    if (out.ok) {
      expect(out.query.cluster_id).toBe('abc123');
      expect(out.query.date).toBe('2026-05-12');
    }
  });
  it('rejects missing params', () => {
    expect(parseLookupQuery(new URL('https://tf/?cluster_id=abc')).ok).toBe(false);
    expect(parseLookupQuery(new URL('https://tf/?date=2026-05-12')).ok).toBe(false);
  });
  it('rejects malformed date', () => {
    const out = parseLookupQuery(new URL('https://tf/?cluster_id=abc&date=2026-13-99'));
    expect(out.ok).toBe(false);
  });
});

describe('parseSearchQuery', () => {
  it('accepts a valid query and defaults limit + min_sources + lookback', () => {
    const url = new URL('https://tf/?q=daybreak%20openai');
    const out = parseSearchQuery(url);
    expect(out.ok).toBe(true);
    if (out.ok) {
      expect(out.query.q).toBe('daybreak openai');
      expect(out.query.min_sources).toBe(2);
      expect(out.query.limit).toBe(25);
      expect(out.query.since).toMatch(/^\d{4}-\d{2}-\d{2}$/);
    }
  });
  it('rejects short q', () => {
    expect(parseSearchQuery(new URL('https://tf/?q=ai')).ok).toBe(false);
  });
  it('rejects invalid since', () => {
    expect(parseSearchQuery(new URL('https://tf/?q=valid%20text&since=BOGUS')).ok).toBe(false);
  });
  it('rejects min_sources out of range', () => {
    expect(parseSearchQuery(new URL('https://tf/?q=valid%20text&min_sources=999')).ok).toBe(false);
    expect(parseSearchQuery(new URL('https://tf/?q=valid%20text&min_sources=0')).ok).toBe(false);
  });
  it('rejects limit out of range', () => {
    expect(parseSearchQuery(new URL('https://tf/?q=valid%20text&limit=999')).ok).toBe(false);
  });
  it('rejects since > until', () => {
    expect(
      parseSearchQuery(new URL('https://tf/?q=valid%20text&since=2026-05-12&until=2026-05-01')).ok,
    ).toBe(false);
  });
});
