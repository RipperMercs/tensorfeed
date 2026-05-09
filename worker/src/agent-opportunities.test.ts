import { describe, it, expect } from 'vitest';
import {
  normalizeRepo,
  dedupAndRank,
  summarize,
  compositeScore,
  type AgentOpportunity,
} from './agent-opportunities';

const NOW = new Date('2026-05-09T18:00:00Z');

function makeRepo(overrides: Partial<{
  full_name: string;
  html_url: string;
  description: string | null;
  stargazers_count: number;
  created_at: string;
  updated_at: string;
  language: string | null;
  topics: string[];
  archived: boolean;
  disabled: boolean;
  fork: boolean;
}> = {}) {
  return {
    full_name: 'anthropics/example',
    html_url: 'https://github.com/anthropics/example',
    description: 'Example repo',
    stargazers_count: 100,
    created_at: '2026-04-01T00:00:00Z',
    updated_at: '2026-05-09T00:00:00Z',
    language: 'TypeScript',
    topics: [],
    archived: false,
    disabled: false,
    fork: false,
    ...overrides,
  };
}

describe('normalizeRepo', () => {
  it('flattens core fields', () => {
    const r = normalizeRepo(makeRepo(), 'anthropic-org', 10, NOW);
    expect(r).not.toBeNull();
    expect(r!.full_name).toBe('anthropics/example');
    expect(r!.html_url).toBe('https://github.com/anthropics/example');
    expect(r!.description).toBe('Example repo');
    expect(r!.stars).toBe(100);
    expect(r!.signal).toBe('anthropic-org');
    expect(r!.signal_weight).toBe(10);
  });

  it('rejects archived, disabled, fork', () => {
    expect(normalizeRepo(makeRepo({ archived: true }), 'x', 1, NOW)).toBeNull();
    expect(normalizeRepo(makeRepo({ disabled: true }), 'x', 1, NOW)).toBeNull();
    expect(normalizeRepo(makeRepo({ fork: true }), 'x', 1, NOW)).toBeNull();
  });

  it('rejects rows missing full_name or html_url', () => {
    expect(normalizeRepo(makeRepo({ full_name: '' }), 'x', 1, NOW)).toBeNull();
    expect(normalizeRepo(makeRepo({ html_url: '' }), 'x', 1, NOW)).toBeNull();
    expect(normalizeRepo(makeRepo({ full_name: 'no-slash' }), 'x', 1, NOW)).toBeNull();
  });

  it('truncates long descriptions to 240 chars', () => {
    const long = 'x'.repeat(500);
    const r = normalizeRepo(makeRepo({ description: long }), 'x', 1, NOW);
    expect(r!.description!.length).toBeLessThanOrEqual(240);
    expect(r!.description!.endsWith('…')).toBe(true);
  });

  it('handles null description', () => {
    const r = normalizeRepo(makeRepo({ description: null }), 'x', 1, NOW);
    expect(r!.description).toBeNull();
  });

  it('caps topics at 12', () => {
    const topics = Array.from({ length: 30 }, (_, i) => `t${i}`);
    const r = normalizeRepo(makeRepo({ topics }), 'x', 1, NOW);
    expect(r!.topics.length).toBe(12);
  });
});

describe('compositeScore', () => {
  it('decays linearly with age over the recent window', () => {
    const today = compositeScore(10, 0, NOW.toISOString(), NOW);
    const fiveAgo = compositeScore(
      10,
      0,
      new Date(NOW.getTime() - 5 * 24 * 60 * 60 * 1000).toISOString(),
      NOW,
    );
    const stale = compositeScore(
      10,
      0,
      new Date(NOW.getTime() - 60 * 24 * 60 * 60 * 1000).toISOString(),
      NOW,
    );
    expect(today).toBeCloseTo(10, 1);
    expect(fiveAgo).toBeCloseTo(8.33, 1);
    expect(stale).toBe(0);
  });

  it('adds log10 of stars+1 to the recency-weighted signal', () => {
    // 0 weight, 99 stars, today => 0 * 1 + log10(100) = 2
    const score = compositeScore(0, 99, NOW.toISOString(), NOW);
    expect(score).toBeCloseTo(2, 1);
  });

  it('a fresh weight-10 with 50 stars beats a stale weight-9 with 50000 stars', () => {
    const fresh = compositeScore(10, 50, NOW.toISOString(), NOW); // ~10 + log10(51) = 11.7
    const stale = compositeScore(
      9,
      50000,
      new Date(NOW.getTime() - 30 * 24 * 60 * 60 * 1000).toISOString(),
      NOW,
    ); // 0 + log10(50001) = 4.7
    expect(fresh).toBeGreaterThan(stale);
  });
});

describe('dedupAndRank', () => {
  it('dedupes by full_name, prefers higher signal_weight', () => {
    const a: AgentOpportunity = {
      full_name: 'foo/bar',
      html_url: 'https://github.com/foo/bar',
      description: null,
      stars: 100,
      created_at: '2026-04-01T00:00:00Z',
      updated_at: '2026-05-09T00:00:00Z',
      language: null,
      topics: [],
      signal: 'mcp-keyword',
      signal_weight: 5,
      composite_score: 7.0,
    };
    const b: AgentOpportunity = { ...a, signal: 'anthropic-org', signal_weight: 10, composite_score: 12.0 };
    const out = dedupAndRank([a, b]);
    expect(out.length).toBe(1);
    expect(out[0].signal).toBe('anthropic-org');
  });

  it('sorts by composite_score desc with stars + updated_at + name as tie-breaks', () => {
    const a: AgentOpportunity = {
      full_name: 'a/a',
      html_url: 'x', description: null, stars: 50, created_at: '', updated_at: '2026-05-01',
      language: null, topics: [], signal: 's', signal_weight: 5, composite_score: 7.0,
    };
    const b: AgentOpportunity = { ...a, full_name: 'b/b', composite_score: 9.0 };
    const c: AgentOpportunity = { ...a, full_name: 'c/c', composite_score: 5.0 };
    const out = dedupAndRank([a, b, c]);
    expect(out.map(o => o.full_name)).toEqual(['b/b', 'a/a', 'c/c']);
  });

  it('caps result at top 25', () => {
    const many = Array.from({ length: 100 }, (_, i) => ({
      full_name: `o/${i}`,
      html_url: `https://github.com/o/${i}`,
      description: null,
      stars: 100 - i,
      created_at: '2026-04-01T00:00:00Z',
      updated_at: '2026-05-09T00:00:00Z',
      language: null,
      topics: [],
      signal: 'mcp-keyword',
      signal_weight: 5,
      composite_score: 100 - i,
    } as AgentOpportunity));
    const out = dedupAndRank(many);
    expect(out.length).toBe(25);
    expect(out[0].composite_score).toBe(100);
    expect(out[24].composite_score).toBe(76);
  });
});

describe('summarize', () => {
  it('counts by_signal and ranks top_orgs', () => {
    const opps: AgentOpportunity[] = [
      { full_name: 'anthropics/a', html_url: '', description: null, stars: 0, created_at: '', updated_at: '', language: null, topics: [], signal: 'anthropic-org', signal_weight: 10, composite_score: 0 },
      { full_name: 'anthropics/b', html_url: '', description: null, stars: 0, created_at: '', updated_at: '', language: null, topics: [], signal: 'anthropic-org', signal_weight: 10, composite_score: 0 },
      { full_name: 'openai/c', html_url: '', description: null, stars: 0, created_at: '', updated_at: '', language: null, topics: [], signal: 'openai-org', signal_weight: 9, composite_score: 0 },
      { full_name: 'foo/d', html_url: '', description: null, stars: 0, created_at: '', updated_at: '', language: null, topics: [], signal: 'mcp-keyword', signal_weight: 5, composite_score: 0 },
    ];
    const s = summarize(opps);
    expect(s.by_signal['anthropic-org']).toBe(2);
    expect(s.by_signal['openai-org']).toBe(1);
    expect(s.by_signal['mcp-keyword']).toBe(1);
    expect(s.top_orgs[0]).toEqual({ org: 'anthropics', count: 2 });
    expect(s.top_orgs[1].count).toBe(1);
  });
});
