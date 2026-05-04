import { describe, it, expect } from 'vitest';
import { buildTodayBrief, resolveSections, resolveLimit, TodayInputs } from './today-brief';
import { Article, ServiceStatus } from './types';

const newsArticle = (over: Partial<Article> = {}): Article => ({
  id: 'a',
  title: 'Some headline',
  url: 'https://example.com/a',
  source: 'TestSource',
  sourceDomain: 'example.com',
  snippet: 's',
  categories: [],
  publishedAt: '2026-05-04T10:00:00Z',
  fetchedAt: '2026-05-04T11:00:00Z',
  ...over,
});

const emptyInputs: TodayInputs = {
  news: null,
  papersAITrending: null,
  papersArxivRecent: null,
  papersHFDaily: null,
  hfTrending: null,
  hotIssues: null,
  redditTrending: null,
  openrouter: null,
  status: null,
};

describe('resolveSections', () => {
  it('returns all sections when input undefined', () => {
    expect(resolveSections(undefined)).toEqual(['news', 'papers', 'hf', 'community', 'inference', 'status']);
  });

  it('parses comma-separated string', () => {
    expect(resolveSections('news,papers')).toEqual(['news', 'papers']);
  });

  it('drops invalid section names but keeps valid ones', () => {
    expect(resolveSections('news,bogus,hf')).toEqual(['news', 'hf']);
  });

  it('falls back to all sections when nothing valid was supplied', () => {
    expect(resolveSections('only-bogus,more-bogus')).toEqual(['news', 'papers', 'hf', 'community', 'inference', 'status']);
  });

  it('accepts an array directly', () => {
    expect(resolveSections(['news', 'status'])).toEqual(['news', 'status']);
  });
});

describe('resolveLimit', () => {
  it('returns default when input undefined', () => {
    expect(resolveLimit(undefined)).toBe(3);
  });

  it('parses string numbers', () => {
    expect(resolveLimit('5')).toBe(5);
  });

  it('caps at 10', () => {
    expect(resolveLimit(50)).toBe(10);
  });

  it('floors at default for non-numeric or <1', () => {
    expect(resolveLimit('not-a-number')).toBe(3);
    expect(resolveLimit(0)).toBe(3);
    expect(resolveLimit(-2)).toBe(3);
  });
});

describe('buildTodayBrief', () => {
  it('returns all-empty sections when inputs are all null', () => {
    const brief = buildTodayBrief(emptyInputs);
    expect(brief.ok).toBe(true);
    expect(brief.news.available).toBe(false);
    expect(brief.papers.available).toBe(false);
    expect(brief.hf.available).toBe(false);
    expect(brief.community.available).toBe(false);
    expect(brief.inference.available).toBe(false);
    expect(brief.status.available).toBe(false);
  });

  it('omits sections not in the requested list', () => {
    const inputs: TodayInputs = {
      ...emptyInputs,
      news: [newsArticle()],
      status: [{ name: 'Anthropic', provider: 'Anthropic', status: 'operational', statusPageUrl: '', components: [], lastChecked: '' }],
    };
    const brief = buildTodayBrief(inputs, { sections: ['news'] });
    expect(brief.news.available).toBe(true);
    expect(brief.status.available).toBe(false);
    expect(brief.sections_included).toEqual(['news']);
  });

  it('respects limit_per_section', () => {
    const inputs: TodayInputs = {
      ...emptyInputs,
      news: Array.from({ length: 10 }, (_, i) => newsArticle({ id: String(i), title: `Article ${i}` })),
    };
    const brief = buildTodayBrief(inputs, { limit_per_section: 4 });
    expect(brief.news.data!.items).toHaveLength(4);
    expect(brief.limit_per_section).toBe(4);
  });

  it('flags all_operational true when no service has issues', () => {
    const inputs: TodayInputs = {
      ...emptyInputs,
      status: [
        { name: 'Anthropic', provider: 'Anthropic', status: 'operational', statusPageUrl: '', components: [], lastChecked: '' },
        { name: 'OpenAI', provider: 'OpenAI', status: 'operational', statusPageUrl: '', components: [], lastChecked: '' },
      ],
    };
    const brief = buildTodayBrief(inputs);
    expect(brief.status.available).toBe(true);
    expect(brief.status.data!.all_operational).toBe(true);
    expect(brief.status.data!.issues).toEqual([]);
    expect(brief.status.data!.service_count).toBe(2);
  });

  it('reports degraded providers in status.issues', () => {
    const services: ServiceStatus[] = [
      { name: 'Anthropic', provider: 'Anthropic', status: 'operational', statusPageUrl: '', components: [], lastChecked: '' },
      { name: 'Replicate', provider: 'Replicate', status: 'degraded', statusPageUrl: '', components: [], lastChecked: '' },
    ];
    const brief = buildTodayBrief({ ...emptyInputs, status: services });
    expect(brief.status.data!.all_operational).toBe(false);
    expect(brief.status.data!.issues).toHaveLength(1);
    expect(brief.status.data!.issues[0].name).toBe('Replicate');
  });

  it('handles partial papers (one of three feeds available)', () => {
    const inputs: TodayInputs = {
      ...emptyInputs,
      papersAITrending: {
        date: '2026-05-04',
        capturedAt: '2026-05-04T11:00:00Z',
        total_papers: 1,
        queries: [],
        raw_count: 1,
        papers: [{ paperId: 'p1', title: 'A', abstract: null, authors: ['Alice'], year: 2025, venue: 'NeurIPS', citationCount: 100, url: null, publicationDate: null, arxivId: null, doi: null, fieldsOfStudy: [] }],
        summary: { by_year: {}, top_venues: [], top_authors: [] },
      },
    };
    const brief = buildTodayBrief(inputs);
    expect(brief.papers.available).toBe(true);
    expect(brief.papers.data!.ai_trending.available).toBe(true);
    expect(brief.papers.data!.arxiv_recent.available).toBe(false);
    expect(brief.papers.data!.hf_daily.available).toBe(false);
  });

  it('always includes a generated_at timestamp', () => {
    const brief = buildTodayBrief(emptyInputs);
    expect(brief.generated_at).toMatch(/^\d{4}-\d{2}-\d{2}T/);
  });
});
