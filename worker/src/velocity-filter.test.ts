import { describe, it, expect } from 'vitest';
import {
  filterVelocityPapers,
  PREDATORY_VELOCITY_VENUES,
  type CitationVelocityEntry,
} from './openalex-citation-velocity';

function entry(over: Partial<CitationVelocityEntry>): CitationVelocityEntry {
  return {
    rank: 0,
    openalex_id: 'W1',
    title: 'paper',
    publication_year: 2025,
    cited_by_count: 100,
    citations_latest_year: 50,
    citations_latest_year_share: 0.5,
    doi: null,
    venue: 'Nature',
    landing_page_url: null,
    first_three_authors: [],
    primary_affiliation: { openalex_id: null, display_name: null },
    ...over,
  };
}

describe('filterVelocityPapers', () => {
  const YEAR = 2026;

  it('drops a known predatory venue (IJISRT) even with an organic-looking share', () => {
    const papers = [
      entry({ venue: PREDATORY_VELOCITY_VENUES[0], citations_latest_year_share: 0.4 }),
      entry({ venue: 'Nature' }),
    ];
    expect(filterVelocityPapers(papers, YEAR).map((p) => p.venue)).toEqual(['Nature']);
  });

  it('drops the citation-farm signature: an older paper, ~1.0 share, large total', () => {
    const papers = [
      entry({ venue: 'Some Journal', publication_year: 2024, citations_latest_year_share: 0.99, cited_by_count: 958 }),
      entry({ venue: 'Nature' }),
    ];
    const out = filterVelocityPapers(papers, YEAR);
    expect(out).toHaveLength(1);
    expect(out[0].venue).toBe('Nature');
  });

  it('keeps a brand-new current-year paper at share 1.0 (organic when age is 0)', () => {
    const p = entry({ publication_year: 2026, citations_latest_year_share: 1.0, cited_by_count: 200 });
    expect(filterVelocityPapers([p], YEAR)).toHaveLength(1);
  });

  it('keeps a high-share paper below the citation-count threshold (not a farm)', () => {
    const p = entry({ publication_year: 2024, citations_latest_year_share: 0.99, cited_by_count: 60 });
    expect(filterVelocityPapers([p], YEAR)).toHaveLength(1);
  });

  it('keeps legitimate hot papers (share around 0.56)', () => {
    const p = entry({ publication_year: 2025, citations_latest_year_share: 0.5646, cited_by_count: 503 });
    expect(filterVelocityPapers([p], YEAR)).toHaveLength(1);
  });

  it('re-ranks the survivors contiguously from 1', () => {
    const papers = [
      entry({ rank: 1, venue: PREDATORY_VELOCITY_VENUES[0], citations_latest_year_share: 0.4 }),
      entry({ rank: 2, venue: 'Nature' }),
      entry({ rank: 3, venue: 'Science' }),
    ];
    expect(filterVelocityPapers(papers, YEAR).map((p) => p.rank)).toEqual([1, 2]);
  });
});
