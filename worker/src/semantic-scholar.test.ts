import { describe, it, expect } from 'vitest';
import { mergeEnrichments, applyEnrichments, normDoi } from './semantic-scholar';

describe('normDoi', () => {
  it('strips the doi.org prefix (OpenAlex returns full URLs)', () => {
    expect(normDoi('https://doi.org/10.1/A')).toBe('10.1/A');
    expect(normDoi('http://dx.doi.org/10.2/b')).toBe('10.2/b');
    expect(normDoi('10.3/c')).toBe('10.3/c');
    expect(normDoi(null)).toBe('');
    expect(normDoi(undefined)).toBe('');
  });
});

describe('mergeEnrichments', () => {
  it('zips S2 results to DOIs by order and skips nulls', () => {
    const dois = ['10.1/A', '10.2/b'];
    const results = [
      { influentialCitationCount: 5, citationCount: 10, fieldsOfStudy: ['Computer Science'], tldr: { text: 'A summary.' }, url: 'https://s2/a' },
      null,
    ];
    const map = mergeEnrichments(dois, results);
    expect(Object.keys(map)).toEqual(['10.1/a']); // lowercased, null skipped
    expect(map['10.1/a']).toEqual({
      influential_citation_count: 5,
      s2_citation_count: 10,
      fields_of_study: ['Computer Science'],
      tldr: 'A summary.',
      s2_url: 'https://s2/a',
    });
  });
  it('tolerates missing fields', () => {
    const map = mergeEnrichments(['10.3/c'], [{}]);
    expect(map['10.3/c']).toEqual({
      influential_citation_count: null,
      s2_citation_count: null,
      fields_of_study: [],
      tldr: null,
      s2_url: null,
    });
  });
});

describe('applyEnrichments', () => {
  it('attaches enrichment to papers by DOI (case-insensitive) and counts hits', () => {
    const papers = [
      { doi: 'https://doi.org/10.1/A', cited_by_count: 1 }, // full URL normalizes to 10.1/a and matches
      { doi: null, cited_by_count: 2 },
      { doi: '10.9/missing', cited_by_count: 3 },
    ];
    const map = { '10.1/a': { influential_citation_count: 7, s2_citation_count: 9, fields_of_study: [], tldr: null, s2_url: null } };
    const n = applyEnrichments(papers, map);
    expect(n).toBe(1);
    expect((papers[0] as { s2?: unknown }).s2).toEqual(map['10.1/a']);
    expect((papers[1] as { s2?: unknown }).s2).toBeUndefined();
    expect((papers[2] as { s2?: unknown }).s2).toBeUndefined();
  });
});
