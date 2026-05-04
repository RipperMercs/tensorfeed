import { describe, it, expect } from 'vitest';
import { normalizePaper, dedupAndRank, summarize } from './papers';

describe('normalizePaper', () => {
  it('returns null when paperId or title missing', () => {
    expect(normalizePaper({ title: 'X' })).toBeNull();
    expect(normalizePaper({ paperId: '1' })).toBeNull();
    expect(normalizePaper({})).toBeNull();
  });

  it('extracts core fields', () => {
    const p = normalizePaper({
      paperId: 'abc',
      title: 'Attention Is All You Need',
      abstract: 'A new architecture',
      authors: [{ name: 'Vaswani' }, { name: 'Shazeer' }],
      year: 2017,
      venue: 'NeurIPS',
      citationCount: 100000,
      url: 'https://example.com/p',
      publicationDate: '2017-06-12',
      externalIds: { ArXiv: '1706.03762', DOI: '10.x/y' },
      fieldsOfStudy: ['Computer Science'],
    });
    expect(p).not.toBeNull();
    expect(p!.paperId).toBe('abc');
    expect(p!.title).toBe('Attention Is All You Need');
    expect(p!.authors).toEqual(['Vaswani', 'Shazeer']);
    expect(p!.year).toBe(2017);
    expect(p!.venue).toBe('NeurIPS');
    expect(p!.citationCount).toBe(100000);
    expect(p!.arxivId).toBe('1706.03762');
    expect(p!.doi).toBe('10.x/y');
    expect(p!.fieldsOfStudy).toEqual(['Computer Science']);
  });

  it('caps long titles and abstracts', () => {
    const longTitle = 'a'.repeat(500);
    const longAbstract = 'b'.repeat(2000);
    const p = normalizePaper({ paperId: 'x', title: longTitle, abstract: longAbstract });
    expect(p!.title.length).toBeLessThanOrEqual(300);
    expect(p!.abstract!.length).toBeLessThanOrEqual(800);
    expect(p!.title.endsWith('…')).toBe(true);
    expect(p!.abstract!.endsWith('…')).toBe(true);
  });

  it('coerces missing optional fields to safe defaults', () => {
    const p = normalizePaper({ paperId: 'x', title: 'T' });
    expect(p!.abstract).toBeNull();
    expect(p!.authors).toEqual([]);
    expect(p!.year).toBeNull();
    expect(p!.venue).toBeNull();
    expect(p!.citationCount).toBe(0);
    expect(p!.arxivId).toBeNull();
    expect(p!.doi).toBeNull();
    expect(p!.fieldsOfStudy).toEqual([]);
  });

  it('caps authors list to 8', () => {
    const authors = Array.from({ length: 20 }, (_, i) => ({ name: `Author ${i}` }));
    const p = normalizePaper({ paperId: 'x', title: 'T', authors });
    expect(p!.authors).toHaveLength(8);
  });
});

describe('dedupAndRank', () => {
  it('dedups by paperId, keeping the higher citation count entry', () => {
    const list = dedupAndRank([
      { paperId: 'a', title: 'A', citationCount: 10 },
      { paperId: 'a', title: 'A', citationCount: 50 },
      { paperId: 'b', title: 'B', citationCount: 5 },
    ]);
    expect(list).toHaveLength(2);
    expect(list[0].paperId).toBe('a');
    expect(list[0].citationCount).toBe(50);
  });

  it('sorts by citation count descending', () => {
    const list = dedupAndRank([
      { paperId: '1', title: 'low', citationCount: 1 },
      { paperId: '2', title: 'high', citationCount: 100 },
      { paperId: '3', title: 'mid', citationCount: 10 },
    ]);
    expect(list.map(p => p.paperId)).toEqual(['2', '3', '1']);
  });

  it('breaks citation ties by year descending', () => {
    const list = dedupAndRank([
      { paperId: '1', title: 'old', citationCount: 5, year: 2020 },
      { paperId: '2', title: 'new', citationCount: 5, year: 2026 },
    ]);
    expect(list[0].paperId).toBe('2');
  });

  it('drops entries missing paperId or title', () => {
    const list = dedupAndRank([
      { title: 'no id', citationCount: 100 },
      { paperId: 'x' },
      { paperId: 'y', title: 'kept', citationCount: 1 },
    ]);
    expect(list).toHaveLength(1);
    expect(list[0].paperId).toBe('y');
  });
});

describe('summarize', () => {
  it('counts papers by year, venue, and author', () => {
    const s = summarize([
      { paperId: '1', title: 'A', abstract: null, authors: ['Alice', 'Bob'], year: 2025, venue: 'NeurIPS', citationCount: 10, url: null, publicationDate: null, arxivId: null, doi: null, fieldsOfStudy: [] },
      { paperId: '2', title: 'B', abstract: null, authors: ['Alice'], year: 2025, venue: 'ICLR', citationCount: 5, url: null, publicationDate: null, arxivId: null, doi: null, fieldsOfStudy: [] },
      { paperId: '3', title: 'C', abstract: null, authors: ['Bob'], year: 2024, venue: 'NeurIPS', citationCount: 3, url: null, publicationDate: null, arxivId: null, doi: null, fieldsOfStudy: [] },
    ]);
    expect(s.by_year).toEqual({ '2025': 2, '2024': 1 });
    expect(s.top_venues[0]).toEqual({ venue: 'NeurIPS', count: 2 });
    expect(s.top_authors[0]).toEqual({ author: 'Alice', count: 2 });
  });

  it('handles papers with no year or venue', () => {
    const s = summarize([
      { paperId: '1', title: 'A', abstract: null, authors: [], year: null, venue: null, citationCount: 0, url: null, publicationDate: null, arxivId: null, doi: null, fieldsOfStudy: [] },
    ]);
    expect(s.by_year).toEqual({});
    expect(s.top_venues).toEqual([]);
    expect(s.top_authors).toEqual([]);
  });
});
