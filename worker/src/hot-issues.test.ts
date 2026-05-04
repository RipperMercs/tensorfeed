import { describe, it, expect } from 'vitest';
import { normalizeIssue, dedupAndRank, summarize, HotIssue } from './hot-issues';

describe('normalizeIssue', () => {
  it('extracts core fields from a representative search hit', () => {
    const issue = normalizeIssue(
      {
        url: 'https://api.github.com/repos/foo/bar/issues/42',
        html_url: 'https://github.com/foo/bar/issues/42',
        repository_url: 'https://api.github.com/repos/foo/bar',
        number: 42,
        title: 'Tokenizer behavior on edge case',
        user: { login: 'alice' },
        state: 'open',
        comments: 25,
        reactions: { total_count: 18 },
        labels: ['bug', { name: 'help wanted' }],
        created_at: '2026-04-30T12:00:00Z',
        updated_at: '2026-05-04T12:00:00Z',
      },
      'llm',
    );
    expect(issue).not.toBeNull();
    expect(issue!.url).toBe('https://github.com/foo/bar/issues/42');
    expect(issue!.repo).toBe('foo/bar');
    expect(issue!.number).toBe(42);
    expect(issue!.author).toBe('alice');
    expect(issue!.state).toBe('open');
    expect(issue!.comments).toBe(25);
    expect(issue!.reactions_total).toBe(18);
    expect(issue!.labels).toEqual(['bug', 'help wanted']);
    expect(issue!.matched_topic).toBe('llm');
  });

  it('returns null when html_url is missing', () => {
    const issue = normalizeIssue({ title: 'no url' }, 'llm');
    expect(issue).toBeNull();
  });

  it('returns null when title is missing', () => {
    const issue = normalizeIssue({ html_url: 'https://github.com/foo/bar/issues/1' }, 'llm');
    expect(issue).toBeNull();
  });

  it('skips pull-request hits even though our query already filters them out', () => {
    const issue = normalizeIssue(
      {
        html_url: 'https://github.com/foo/bar/pull/1',
        title: 'A PR',
        pull_request: { url: 'https://api.github.com/repos/foo/bar/pulls/1' },
      },
      'llm',
    );
    expect(issue).toBeNull();
  });

  it('caps long titles', () => {
    const long = 'a'.repeat(500);
    const issue = normalizeIssue(
      { html_url: 'https://github.com/x/y/issues/1', title: long, repository_url: 'https://api.github.com/repos/x/y' },
      'llm',
    );
    expect(issue!.title.length).toBeLessThanOrEqual(300);
    expect(issue!.title.endsWith('…')).toBe(true);
  });

  it('handles missing optional fields with safe defaults', () => {
    const issue = normalizeIssue(
      {
        html_url: 'https://github.com/x/y/issues/1',
        title: 'minimal',
        repository_url: 'https://api.github.com/repos/x/y',
      },
      'llm',
    );
    expect(issue!.author).toBeNull();
    expect(issue!.comments).toBe(0);
    expect(issue!.reactions_total).toBe(0);
    expect(issue!.labels).toEqual([]);
    expect(issue!.state).toBe('open');
  });

  it('caps labels list to 8', () => {
    const labels = Array.from({ length: 20 }, (_, i) => `label-${i}`);
    const issue = normalizeIssue(
      {
        html_url: 'https://github.com/x/y/issues/1',
        title: 't',
        labels,
        repository_url: 'https://api.github.com/repos/x/y',
      },
      'llm',
    );
    expect(issue!.labels).toHaveLength(8);
  });
});

const sample = (over: Partial<HotIssue>): HotIssue => ({
  url: 'https://github.com/foo/bar/issues/1',
  api_url: '',
  repo: 'foo/bar',
  number: 1,
  title: 't',
  author: 'a',
  state: 'open',
  comments: 0,
  reactions_total: 0,
  labels: [],
  created_at: '2026-04-01T00:00:00Z',
  updated_at: '2026-05-01T00:00:00Z',
  matched_topic: 'llm',
  ...over,
});

describe('dedupAndRank', () => {
  it('dedups by url and keeps the higher-comment record', () => {
    const list = dedupAndRank([
      sample({ url: 'https://x/1', comments: 5 }),
      sample({ url: 'https://x/1', comments: 50 }),
      sample({ url: 'https://x/2', comments: 10 }),
    ]);
    expect(list).toHaveLength(2);
    expect(list.find(i => i.url === 'https://x/1')!.comments).toBe(50);
  });

  it('sorts by comments desc, then reactions, then updated_at desc', () => {
    const list = dedupAndRank([
      sample({ url: 'a', comments: 10, reactions_total: 5, updated_at: '2026-01-01T00:00:00Z' }),
      sample({ url: 'b', comments: 20, reactions_total: 0 }),
      sample({ url: 'c', comments: 10, reactions_total: 50, updated_at: '2026-04-01T00:00:00Z' }),
      sample({ url: 'd', comments: 10, reactions_total: 5, updated_at: '2026-04-01T00:00:00Z' }),
    ]);
    expect(list.map(i => i.url)).toEqual(['b', 'c', 'd', 'a']);
  });
});

describe('summarize', () => {
  it('counts hits per topic and per repo', () => {
    const s = summarize([
      sample({ url: 'a', repo: 'foo/bar', matched_topic: 'llm' }),
      sample({ url: 'b', repo: 'foo/bar', matched_topic: 'llm' }),
      sample({ url: 'c', repo: 'baz/qux', matched_topic: 'transformer' }),
    ]);
    expect(s.by_topic).toEqual({ llm: 2, transformer: 1 });
    expect(s.top_repos[0]).toEqual({ repo: 'foo/bar', count: 2 });
    expect(s.top_repos).toContainEqual({ repo: 'baz/qux', count: 1 });
  });

  it('handles empty input', () => {
    const s = summarize([]);
    expect(s.by_topic).toEqual({});
    expect(s.top_repos).toEqual([]);
  });
});
