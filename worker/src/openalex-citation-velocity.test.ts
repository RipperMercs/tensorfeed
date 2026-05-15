import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import {
  buildVelocitySnapshot,
  getOpenAlexAICitationVelocity,
  refreshOpenAlexAICitationVelocity,
} from './openalex-citation-velocity';

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

describe('openalex-citation-velocity: buildVelocitySnapshot', () => {
  it('ranks papers by latest-year citation share', () => {
    const works = [
      {
        id: 'https://openalex.org/W1',
        display_name: 'Fast riser',
        publication_year: 2025,
        cited_by_count: 100,
        counts_by_year: [
          { year: 2024, cited_by_count: 10 },
          { year: 2025, cited_by_count: 90 },   // 90% in latest year
        ],
        authorships: [],
      },
      {
        id: 'W2',
        display_name: 'Slow burn',
        publication_year: 2024,
        cited_by_count: 200,
        counts_by_year: [
          { year: 2023, cited_by_count: 50 },
          { year: 2024, cited_by_count: 100 },
          { year: 2025, cited_by_count: 50 },   // 25% in latest year
        ],
        authorships: [],
      },
      {
        id: 'W3',
        display_name: 'Super hot',
        publication_year: 2025,
        cited_by_count: 50,
        counts_by_year: [
          { year: 2025, cited_by_count: 50 },   // 100% in latest year
        ],
        authorships: [],
      },
    ];
    const snap = buildVelocitySnapshot(works);
    expect(snap.papers).toHaveLength(3);
    // W3 has share=1.0, W1 has share=0.9, W2 has share=0.25
    expect(snap.papers[0].openalex_id).toBe('W3');
    expect(snap.papers[1].openalex_id).toBe('W1');
    expect(snap.papers[2].openalex_id).toBe('W2');
    expect(snap.papers[0].citations_latest_year_share).toBe(1);
    expect(snap.papers[1].citations_latest_year_share).toBe(0.9);
    expect(snap.papers[2].citations_latest_year_share).toBe(0.25);
  });

  it('filters out papers below the citation minimum', () => {
    const works = [
      {
        id: 'W1', display_name: 'Below min', publication_year: 2025, cited_by_count: 2,
        counts_by_year: [{ year: 2025, cited_by_count: 2 }], authorships: [],
      },
      {
        id: 'W2', display_name: 'At min', publication_year: 2025, cited_by_count: 3,
        counts_by_year: [{ year: 2025, cited_by_count: 3 }], authorships: [],
      },
    ];
    const snap = buildVelocitySnapshot(works);
    expect(snap.papers).toHaveLength(1);
    expect(snap.papers[0].openalex_id).toBe('W2');
  });

  it('extracts first three authors and primary affiliation', () => {
    const works = [
      {
        id: 'W1',
        display_name: 'Paper',
        publication_year: 2025,
        cited_by_count: 10,
        counts_by_year: [{ year: 2025, cited_by_count: 10 }],
        authorships: [
          { author: { id: 'https://openalex.org/A1', display_name: 'First' }, institutions: [{ id: 'I1', display_name: 'Lab' }] },
          { author: { id: 'A2', display_name: 'Second' } },
          { author: { id: 'A3', display_name: 'Third' } },
          { author: { id: 'A4', display_name: 'Fourth (dropped)' } },
        ],
      },
    ];
    const snap = buildVelocitySnapshot(works);
    expect(snap.papers[0].first_three_authors).toHaveLength(3);
    expect(snap.papers[0].first_three_authors.map(a => a.display_name)).toEqual(['First', 'Second', 'Third']);
    expect(snap.papers[0].primary_affiliation.display_name).toBe('Lab');
  });

  it('handles works with zero counts_by_year entries', () => {
    const works = [
      {
        id: 'W1', display_name: 'No counts', publication_year: 2025,
        cited_by_count: 10, counts_by_year: [], authorships: [],
      },
    ];
    const snap = buildVelocitySnapshot(works);
    expect(snap.papers).toHaveLength(1);
    expect(snap.papers[0].citations_latest_year).toBe(0);
    expect(snap.papers[0].citations_latest_year_share).toBe(0);
  });
});

describe('refreshOpenAlexAICitationVelocity', () => {
  beforeEach(() => { vi.stubGlobal('fetch', vi.fn()); });
  afterEach(() => { vi.unstubAllGlobals(); });

  it('persists a snapshot on success', async () => {
    (fetch as any).mockResolvedValueOnce(new Response(JSON.stringify({
      results: [
        {
          id: 'W1', display_name: 'A', publication_year: 2025, cited_by_count: 100,
          counts_by_year: [{ year: 2025, cited_by_count: 60 }], authorships: [],
        },
      ],
    }), { status: 200 }));
    const { kv } = makeKv();
    const env = { TENSORFEED_CACHE: kv } as any;
    const r = await refreshOpenAlexAICitationVelocity(env);
    expect(r.ok).toBe(true);
    expect(r.count).toBe(1);
  });

  it('returns ok:false on HTTP failure', async () => {
    (fetch as any).mockResolvedValueOnce(new Response('rate limit', { status: 429 }));
    const { kv } = makeKv();
    const env = { TENSORFEED_CACHE: kv } as any;
    const r = await refreshOpenAlexAICitationVelocity(env);
    expect(r.ok).toBe(false);
    expect(r.error).toContain('429');
  });
});

describe('getOpenAlexAICitationVelocity', () => {
  it('returns null when no snapshot', async () => {
    const { kv } = makeKv();
    const env = { TENSORFEED_CACHE: kv } as any;
    expect(await getOpenAlexAICitationVelocity(env)).toBeNull();
  });
});
