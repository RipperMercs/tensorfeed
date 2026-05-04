import { describe, it, expect } from 'vitest';
import { parseArxivIdFromUrl, parseEntry, parseFeed, dedupAndSort, summarize, ArxivPaper } from './arxiv';

describe('parseArxivIdFromUrl', () => {
  it('extracts the bare arxiv id', () => {
    expect(parseArxivIdFromUrl('http://arxiv.org/abs/2401.12345')).toEqual({ arxivId: '2401.12345', version: null });
  });

  it('extracts the version suffix when present', () => {
    expect(parseArxivIdFromUrl('http://arxiv.org/abs/2401.12345v3')).toEqual({ arxivId: '2401.12345', version: 'v3' });
  });

  it('handles old-style ids', () => {
    const r = parseArxivIdFromUrl('http://arxiv.org/abs/cs/0701001v2');
    expect(r?.arxivId).toBe('cs/0701001');
    expect(r?.version).toBe('v2');
  });

  it('returns null for non-arxiv urls', () => {
    expect(parseArxivIdFromUrl('https://example.com/abs/x')).toBeNull();
  });
});

const SAMPLE_ENTRY = `
<entry>
  <id>http://arxiv.org/abs/2401.12345v2</id>
  <updated>2026-04-15T00:00:00Z</updated>
  <published>2026-04-10T00:00:00Z</published>
  <title>
    A Sample Paper Title with
    line breaks
  </title>
  <summary>An abstract describing the paper. It has &amp; ampersands and &lt;tags&gt;.</summary>
  <author><name>Alice Smith</name></author>
  <author><name>Bob Jones</name></author>
  <link href="http://arxiv.org/abs/2401.12345v2" rel="alternate" type="text/html"/>
  <link href="http://arxiv.org/pdf/2401.12345v2" rel="related" type="application/pdf"/>
  <arxiv:primary_category xmlns:arxiv="http://arxiv.org/schemas/atom" term="cs.AI" scheme="http://arxiv.org/schemas/atom"/>
  <category term="cs.AI" scheme="http://arxiv.org/schemas/atom"/>
  <category term="cs.LG" scheme="http://arxiv.org/schemas/atom"/>
  <arxiv:doi xmlns:arxiv="http://arxiv.org/schemas/atom">10.1234/foo.bar</arxiv:doi>
</entry>
`;

describe('parseEntry', () => {
  it('extracts all core fields from a representative entry', () => {
    const p = parseEntry(SAMPLE_ENTRY);
    expect(p).not.toBeNull();
    expect(p!.arxivId).toBe('2401.12345');
    expect(p!.version).toBe('v2');
    expect(p!.title).toBe('A Sample Paper Title with line breaks');
    expect(p!.abstract).toContain('& ampersands');
    expect(p!.abstract).toContain('<tags>');
    expect(p!.authors).toEqual(['Alice Smith', 'Bob Jones']);
    expect(p!.primaryCategory).toBe('cs.AI');
    expect(p!.categories).toEqual(expect.arrayContaining(['cs.AI', 'cs.LG']));
    expect(p!.publishedAt).toBe('2026-04-10T00:00:00Z');
    expect(p!.updatedAt).toBe('2026-04-15T00:00:00Z');
    expect(p!.pdfUrl).toBe('http://arxiv.org/pdf/2401.12345v2');
    expect(p!.htmlUrl).toBe('http://arxiv.org/abs/2401.12345v2');
    expect(p!.doi).toBe('10.1234/foo.bar');
  });

  it('returns null on missing id', () => {
    const p = parseEntry('<entry><title>x</title></entry>');
    expect(p).toBeNull();
  });

  it('returns null on missing title', () => {
    const p = parseEntry('<entry><id>http://arxiv.org/abs/2401.1</id></entry>');
    expect(p).toBeNull();
  });

  it('falls back to constructed pdf url when no related link present', () => {
    const xml = `<entry>
      <id>http://arxiv.org/abs/2401.99999</id>
      <title>x</title>
      <published>2026-01-01T00:00:00Z</published>
      <updated>2026-01-01T00:00:00Z</updated>
    </entry>`;
    const p = parseEntry(xml);
    expect(p!.pdfUrl).toBe('https://arxiv.org/pdf/2401.99999.pdf');
  });
});

describe('parseFeed', () => {
  it('returns [] for input without entries', () => {
    expect(parseFeed('<feed></feed>')).toEqual([]);
    expect(parseFeed('')).toEqual([]);
  });

  it('parses multiple entries', () => {
    const feed = `<feed>${SAMPLE_ENTRY}${SAMPLE_ENTRY.replace('2401.12345', '2401.99999').replace('v2', 'v1')}</feed>`;
    const list = parseFeed(feed);
    expect(list).toHaveLength(2);
    expect(list.map(p => p.arxivId).sort()).toEqual(['2401.12345', '2401.99999']);
  });
});

const samplePaper = (over: Partial<ArxivPaper>): ArxivPaper => ({
  arxivId: '2401.0001',
  version: null,
  title: 'T',
  abstract: null,
  authors: [],
  primaryCategory: 'cs.AI',
  categories: [],
  publishedAt: '2026-01-01T00:00:00Z',
  updatedAt: '2026-01-01T00:00:00Z',
  htmlUrl: '',
  pdfUrl: '',
  doi: null,
  ...over,
});

describe('dedupAndSort', () => {
  it('keeps one entry per arxivId, preferring the newer updatedAt', () => {
    const list = dedupAndSort([
      samplePaper({ arxivId: '1', updatedAt: '2026-01-01T00:00:00Z' }),
      samplePaper({ arxivId: '1', updatedAt: '2026-04-01T00:00:00Z' }),
      samplePaper({ arxivId: '2' }),
    ]);
    expect(list).toHaveLength(2);
    expect(list.find(p => p.arxivId === '1')!.updatedAt).toBe('2026-04-01T00:00:00Z');
  });

  it('sorts by publishedAt descending', () => {
    const list = dedupAndSort([
      samplePaper({ arxivId: 'old', publishedAt: '2025-01-01T00:00:00Z' }),
      samplePaper({ arxivId: 'new', publishedAt: '2026-04-01T00:00:00Z' }),
      samplePaper({ arxivId: 'mid', publishedAt: '2025-08-01T00:00:00Z' }),
    ]);
    expect(list.map(p => p.arxivId)).toEqual(['new', 'mid', 'old']);
  });
});

describe('summarize', () => {
  it('counts papers by primary category and author', () => {
    const s = summarize([
      samplePaper({ arxivId: '1', primaryCategory: 'cs.AI', authors: ['Alice'] }),
      samplePaper({ arxivId: '2', primaryCategory: 'cs.AI', authors: ['Alice', 'Bob'] }),
      samplePaper({ arxivId: '3', primaryCategory: 'cs.LG', authors: ['Bob'] }),
    ]);
    expect(s.by_primary_category).toEqual({ 'cs.AI': 2, 'cs.LG': 1 });
    expect(s.top_authors[0]).toEqual({ author: 'Alice', count: 2 });
  });
});
