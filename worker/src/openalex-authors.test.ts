import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import {
  buildSnapshot,
  getOpenAlexAIAuthors,
  refreshOpenAlexAIAuthors,
} from './openalex-authors';

function makeKv(): { kv: any; store: Map<string, string> } {
  const store = new Map<string, string>();
  const kv = {
    async get(key: string) {
      return store.get(key) ?? null;
    },
    async put(key: string, value: string) {
      store.set(key, value);
    },
  };
  return { kv, store };
}

describe('openalex-authors: buildSnapshot', () => {
  it('joins aggregates with details and derives ai_share_pct', () => {
    const aggregates = [
      { openalex_id: 'A1', ai_works_last_year: 50 },
      { openalex_id: 'A2', ai_works_last_year: 30 },
    ];
    const details = new Map([
      ['A1', {
        id: 'https://openalex.org/A1',
        display_name: 'Alice Doe',
        orcid: 'https://orcid.org/0000-0001',
        affiliations: [{ institution: { id: 'I1', display_name: 'MIT', country_code: 'US' }, years: [2024, 2025] }],
        summary_stats: { h_index: 50, i10_index: 200 },
        works_count: 200,
        cited_by_count: 12000,
      }],
      ['A2', {
        id: 'A2',
        display_name: 'Bob Roe',
        affiliations: [{ institution: { id: 'I2', display_name: 'Stanford', country_code: 'US' }, years: [2025] }],
        works_count: 60,
        cited_by_count: 800,
      }],
    ]);
    const snap = buildSnapshot(aggregates, details);
    expect(snap.authors).toHaveLength(2);
    expect(snap.authors[0].display_name).toBe('Alice Doe');
    expect(snap.authors[0].ai_share_pct).toBe(25);   // 50/200 = 25%
    expect(snap.authors[0].h_index).toBe(50);
    expect(snap.authors[0].primary_affiliation.display_name).toBe('MIT');
    expect(snap.authors[0].orcid).toBe('https://orcid.org/0000-0001');
    expect(snap.authors[1].ai_share_pct).toBe(50);   // 30/60 = 50%
  });

  it('falls back to first affiliation when years data is missing', () => {
    const aggregates = [{ openalex_id: 'A1', ai_works_last_year: 10 }];
    const details = new Map([
      ['A1', {
        id: 'A1',
        display_name: 'X',
        affiliations: [
          { institution: { id: 'I1', display_name: 'Lab One', country_code: 'US' } },
          { institution: { id: 'I2', display_name: 'Lab Two', country_code: 'GB' } },
        ],
      }],
    ]);
    const snap = buildSnapshot(aggregates, details);
    expect(snap.authors[0].primary_affiliation.display_name).toBe('Lab One');
  });

  it('omits authors without details and notes the gap', () => {
    const aggregates = [
      { openalex_id: 'A1', ai_works_last_year: 50 },
      { openalex_id: 'A2', ai_works_last_year: 30 },
    ];
    const details = new Map([
      ['A1', { id: 'A1', display_name: 'Only One' }],
    ]);
    const snap = buildSnapshot(aggregates, details);
    expect(snap.authors).toHaveLength(1);
    expect(snap.notes.some(n => n.includes('omitted'))).toBe(true);
  });

  it('returns null ai_share_pct when total works is zero or missing', () => {
    const aggregates = [{ openalex_id: 'A1', ai_works_last_year: 5 }];
    const details = new Map([['A1', { id: 'A1', display_name: 'X' }]]);   // no works_count
    const snap = buildSnapshot(aggregates, details);
    expect(snap.authors[0].ai_share_pct).toBeNull();
  });
});

describe('refreshOpenAlexAIAuthors', () => {
  beforeEach(() => { vi.stubGlobal('fetch', vi.fn()); });
  afterEach(() => { vi.unstubAllGlobals(); });

  it('persists a snapshot when both fetches succeed', async () => {
    (fetch as any)
      .mockResolvedValueOnce(new Response(JSON.stringify({
        group_by: [
          { key: 'https://openalex.org/A1', count: 30 },
          { key: 'A2', count: 25 },
        ],
      }), { status: 200 }))
      .mockResolvedValueOnce(new Response(JSON.stringify({
        results: [
          { id: 'https://openalex.org/A1', display_name: 'A1 Name', works_count: 100, cited_by_count: 500, summary_stats: { h_index: 20 } },
          { id: 'A2', display_name: 'A2 Name', works_count: 50, cited_by_count: 200 },
        ],
      }), { status: 200 }));
    const { kv } = makeKv();
    const env = { TENSORFEED_CACHE: kv } as any;
    const result = await refreshOpenAlexAIAuthors(env);
    expect(result.ok).toBe(true);
    expect(result.count).toBe(2);
  });

  it('returns ok:false when group_by has no entries', async () => {
    (fetch as any).mockResolvedValueOnce(new Response(JSON.stringify({ group_by: [] }), { status: 200 }));
    const { kv } = makeKv();
    const env = { TENSORFEED_CACHE: kv } as any;
    const result = await refreshOpenAlexAIAuthors(env);
    expect(result.ok).toBe(false);
    expect(result.error).toContain('0 groups');
  });
});

describe('getOpenAlexAIAuthors', () => {
  it('returns null when no snapshot in KV', async () => {
    const { kv } = makeKv();
    const env = { TENSORFEED_CACHE: kv } as any;
    expect(await getOpenAlexAIAuthors(env)).toBeNull();
  });
});
