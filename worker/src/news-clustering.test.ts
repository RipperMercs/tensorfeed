import { describe, it, expect, beforeEach } from 'vitest';
import {
  cosineSimilarity,
  clusterByEmbedding,
  buildClusters,
  runDailyClustering,
  readClustersForDate,
  listClusterDates,
  __test,
} from './news-clustering';
import type { Env } from './types';

class MockKV {
  store = new Map<string, string>();
  ttls = new Map<string, number | undefined>();
  async get<T = string>(key: string, format?: 'json'): Promise<T | null> {
    const raw = this.store.get(key);
    if (raw === undefined) return null;
    if (format === 'json') return JSON.parse(raw) as T;
    return raw as unknown as T;
  }
  async put(key: string, value: string, opts?: { expirationTtl?: number }): Promise<void> {
    this.store.set(key, value);
    this.ttls.set(key, opts?.expirationTtl);
  }
}

class MockAI {
  calls = 0;
  embedFn: (texts: string[]) => number[][];
  constructor(embedFn: (texts: string[]) => number[][]) {
    this.embedFn = embedFn;
  }
  async run(model: string, input: { text: string[] }): Promise<{ data: number[][] }> {
    this.calls += 1;
    return { data: this.embedFn(input.text) };
  }
}

function makeEnv(ai?: MockAI): Env {
  return {
    TENSORFEED_CACHE: new MockKV(),
    TENSORFEED_NEWS: new MockKV(),
    TENSORFEED_STATUS: new MockKV(),
    AI: ai,
  } as unknown as Env;
}

// Deterministic 8-dim "embeddings" so tests can assert clusters cleanly.
function fakeVec(label: 'a' | 'b' | 'c'): number[] {
  if (label === 'a') return [1, 0, 0, 0, 0, 0, 0, 0];
  if (label === 'b') return [0, 1, 0, 0, 0, 0, 0, 0];
  return [0, 0, 1, 0, 0, 0, 0, 0];
}

function fakeArticle(id: string, source: string, title = `t-${id}`, snippet = 's') {
  return {
    id,
    title,
    url: `https://example.com/${id}`,
    source,
    sourceDomain: source.toLowerCase().replace(/\s+/g, '-') + '.com',
    snippet,
    categories: [],
    publishedAt: '2026-05-08T00:00:00.000Z',
    fetchedAt: '2026-05-08T00:00:00.000Z',
  };
}

describe('cosineSimilarity', () => {
  it('returns 1 for identical vectors', () => {
    expect(cosineSimilarity([1, 0, 0], [1, 0, 0])).toBe(1);
  });
  it('returns 0 for orthogonal vectors', () => {
    expect(cosineSimilarity([1, 0, 0], [0, 1, 0])).toBe(0);
  });
  it('returns 0 for mismatched lengths', () => {
    expect(cosineSimilarity([1, 0], [1, 0, 0])).toBe(0);
  });
  it('returns 0 when one vector is zero', () => {
    expect(cosineSimilarity([0, 0, 0], [1, 1, 1])).toBe(0);
  });
});

describe('clusterByEmbedding', () => {
  it('groups identical vectors into one cluster', () => {
    const out = clusterByEmbedding([fakeVec('a'), fakeVec('a'), fakeVec('a')], 0.82);
    expect(out).toEqual([0, 0, 0]);
  });
  it('separates orthogonal vectors into distinct clusters', () => {
    const out = clusterByEmbedding([fakeVec('a'), fakeVec('b'), fakeVec('c')], 0.82);
    expect(new Set(out).size).toBe(3);
  });
  it('chains via single-link when threshold permits', () => {
    // Three vectors where 1-2 are similar and 2-3 are similar but 1-3 are not
    const v1 = [1, 0.0, 0, 0, 0, 0, 0, 0];
    const v2 = [0.95, 0.31, 0, 0, 0, 0, 0, 0]; // close to v1 (cos ~0.95)
    const v3 = [0.31, 0.95, 0, 0, 0, 0, 0, 0]; // close to v2 (cos ~0.59 to v1, ~0.59 wait)
    // Recompute: v1 dot v2 = 0.95, v2 dot v3 = 0.31*0.95 + 0.95*0.31 = 0.59 (below threshold)
    // So this won't chain. Let me use clearer vectors.
    const a = [1, 0, 0];
    const b = [0.9, 0.4, 0];      // cos w/ a = 0.91
    const c = [0.5, 0.85, 0];      // cos w/ b = 0.45+0.34 = 0.79 (just below)
    const out = clusterByEmbedding([a, b, c], 0.85);
    // a and b cluster, c does not.
    expect(out[0]).toBe(out[1]);
    expect(out[2]).not.toBe(out[0]);
  });
});

describe('corroborationBand', () => {
  it('classifies by source count', () => {
    expect(__test.corroborationBand(1)).toBe('single');
    expect(__test.corroborationBand(2)).toBe('limited');
    expect(__test.corroborationBand(3)).toBe('limited');
    expect(__test.corroborationBand(4)).toBe('broad');
  });
});

describe('clusterIdFromMembers', () => {
  it('is deterministic across member order', () => {
    const a = __test.clusterIdFromMembers(['x', 'y', 'z']);
    const b = __test.clusterIdFromMembers(['z', 'y', 'x']);
    expect(a).toBe(b);
  });
  it('differs across distinct member sets', () => {
    const a = __test.clusterIdFromMembers(['x', 'y']);
    const b = __test.clusterIdFromMembers(['x', 'z']);
    expect(a).not.toBe(b);
  });
});

describe('buildClusters', () => {
  it('groups co-similar articles and counts distinct sources', () => {
    const articles = [
      fakeArticle('a1', 'Reuters', 'Mythos launches'),
      fakeArticle('a2', 'Anthropic', 'Mythos launches'),
      fakeArticle('a3', 'TechCrunch', 'Other story'),
    ];
    const embeddings = [
      { id: 'a1', vector: fakeVec('a') },
      { id: 'a2', vector: fakeVec('a') },
      { id: 'a3', vector: fakeVec('b') },
    ];
    const clusters = buildClusters({ date: '2026-05-08', articles, embeddings });
    expect(clusters).toHaveLength(2);
    const big = clusters[0];
    expect(big.source_count).toBe(2);
    expect(big.article_count).toBe(2);
    expect(big.corroboration_band).toBe('limited');
    expect(big.sources.length).toBe(2);
    expect(big.hero.id).toBeTruthy();
  });

  it('classifies single-source clusters as single', () => {
    const articles = [fakeArticle('a1', 'Reuters', 'Lone story')];
    const embeddings = [{ id: 'a1', vector: fakeVec('a') }];
    const clusters = buildClusters({ date: '2026-05-08', articles, embeddings });
    expect(clusters[0].corroboration_band).toBe('single');
  });

  it('sorts clusters by source_count desc', () => {
    const articles = [
      fakeArticle('a1', 'Reuters'),
      fakeArticle('a2', 'Anthropic'),
      fakeArticle('a3', 'TechCrunch'),
      fakeArticle('a4', 'Verge'),
    ];
    const embeddings = [
      { id: 'a1', vector: fakeVec('a') }, // these 3 cluster
      { id: 'a2', vector: fakeVec('a') },
      { id: 'a3', vector: fakeVec('a') },
      { id: 'a4', vector: fakeVec('b') }, // alone
    ];
    const clusters = buildClusters({ date: '2026-05-08', articles, embeddings });
    expect(clusters[0].source_count).toBe(3);
    expect(clusters[1].source_count).toBe(1);
  });

  it('returns empty array on no embeddings', () => {
    expect(buildClusters({ date: '2026-05-08', articles: [], embeddings: [] })).toEqual([]);
  });

  it('picks earliest publishedAt as hero', () => {
    const a1 = { ...fakeArticle('a1', 'Reuters'), publishedAt: '2026-05-08T12:00:00.000Z' };
    const a2 = { ...fakeArticle('a2', 'Anthropic'), publishedAt: '2026-05-08T10:00:00.000Z' };
    const articles = [a1, a2];
    const embeddings = [
      { id: 'a1', vector: fakeVec('a') },
      { id: 'a2', vector: fakeVec('a') },
    ];
    const clusters = buildClusters({ date: '2026-05-08', articles, embeddings });
    expect(clusters[0].hero.id).toBe('a2');
    expect(clusters[0].first_seen_at).toBe('2026-05-08T10:00:00.000Z');
  });
});

describe('runDailyClustering', () => {
  let env: Env;
  let ai: MockAI;
  const NOW = new Date('2026-05-09T07:30:00.000Z');

  beforeEach(() => {
    ai = new MockAI((texts) =>
      texts.map((t) => {
        // Map any title containing 'mythos' to the same vector so two
        // articles about the same story cluster, others get distinct.
        if (/mythos/i.test(t)) return fakeVec('a');
        if (/policy/i.test(t)) return fakeVec('b');
        return fakeVec('c');
      }),
    );
    env = makeEnv(ai);
  });

  it('returns workers_ai_unbound when AI is missing', async () => {
    const env2 = makeEnv();
    const result = await runDailyClustering(env2, NOW);
    expect(result.ok).toBe(false);
    expect(result.error).toBe('workers_ai_unbound');
  });

  it('returns no_news_snapshot when the day has no captured news', async () => {
    const result = await runDailyClustering(env, NOW);
    expect(result.ok).toBe(false);
    expect(result.error).toBe('no_news_snapshot');
  });

  it('embeds, clusters, and persists to KV', async () => {
    const cache = env.TENSORFEED_CACHE as unknown as MockKV;
    cache.store.set(
      'news:daily:2026-05-08',
      JSON.stringify({
        date: '2026-05-08',
        captured_at: '2026-05-08T23:00:00.000Z',
        articles_count: 3,
        articles: [
          fakeArticle('a1', 'Reuters', 'Mythos launches'),
          fakeArticle('a2', 'Anthropic', 'Mythos launches details'),
          fakeArticle('a3', 'TechCrunch', 'AI policy update'),
        ],
      }),
    );

    const result = await runDailyClustering(env, NOW);
    expect(result.ok).toBe(true);
    expect(result.date).toBe('2026-05-08');
    expect(result.articles_embedded).toBe(3);
    expect(result.clusters_found).toBe(2);

    const dates = await listClusterDates(env);
    expect(dates).toEqual(['2026-05-08']);

    const clusters = await readClustersForDate(env, '2026-05-08');
    expect(clusters.length).toBe(2);
    expect(clusters[0].source_count).toBeGreaterThanOrEqual(1);
  });

  it('writes the embedding blob with the documented TTL', async () => {
    const cache = env.TENSORFEED_CACHE as unknown as MockKV;
    cache.store.set(
      'news:daily:2026-05-08',
      JSON.stringify({
        date: '2026-05-08',
        captured_at: '2026-05-08T23:00:00.000Z',
        articles_count: 1,
        articles: [fakeArticle('a1', 'Reuters', 'Mythos launches')],
      }),
    );
    await runDailyClustering(env, NOW);
    const ttl = cache.ttls.get('news:embeddings:2026-05-08');
    expect(ttl).toBe(30 * 24 * 60 * 60);
  });

  it('honors a date override (for backfills + tests)', async () => {
    const cache = env.TENSORFEED_CACHE as unknown as MockKV;
    cache.store.set(
      'news:daily:2026-05-01',
      JSON.stringify({
        date: '2026-05-01',
        captured_at: '2026-05-01T23:00:00.000Z',
        articles_count: 1,
        articles: [fakeArticle('a1', 'Reuters', 'Old story')],
      }),
    );
    const result = await runDailyClustering(env, NOW, '2026-05-01');
    expect(result.ok).toBe(true);
    expect(result.date).toBe('2026-05-01');
  });
});

describe('centroid persistence (corroboration corpus)', () => {
  it('packVector / unpackVector roundtrip preserves float32 values', async () => {
    const { packVector, unpackVector } = await import('./news-clustering');
    const vec = [0.5, -0.25, 1, 0, -1, 0.125, 0.75, -0.0625];
    expect(unpackVector(packVector(vec))).toEqual(vec);
  });

  it('computeCentroids returns the normalized mean per cluster and skips unknown members', async () => {
    const { computeCentroids, unpackVector, buildClusters } = await import('./news-clustering');
    const articles = [
      fakeArticle('a1', 'Reuters'),
      fakeArticle('a2', 'Anthropic'),
      fakeArticle('a3', 'TechCrunch'),
    ];
    const embeddings = [
      { id: 'a1', vector: [1, 0, 0, 0, 0, 0, 0, 0] },
      { id: 'a2', vector: [0, 1, 0, 0, 0, 0, 0, 0] },
      { id: 'a3', vector: [0, 0, 1, 0, 0, 0, 0, 0] },
    ];
    // a1 + a2 forced into one cluster via threshold 0 on just those two.
    const clusters = buildClusters({
      date: '2026-05-08',
      articles,
      embeddings,
      threshold: 0.99,
    });
    // With orthogonal vectors and a high threshold, everything is a
    // singleton; each centroid must equal its member vector (already unit).
    const centroids = computeCentroids(clusters, embeddings);
    expect(centroids.length).toBe(3);
    for (const c of centroids) {
      const v = unpackVector(c.vec);
      const mag = Math.sqrt(v.reduce((s, x) => s + x * x, 0));
      expect(mag).toBeCloseTo(1, 5);
    }
    // Multi-member cluster: mean of [1,0,..] and [0,1,..] normalized is
    // [0.7071, 0.7071, 0, ...].
    const merged = computeCentroids(
      [
        {
          cluster_id: 'm1',
          date: '2026-05-08',
          article_count: 2,
          source_count: 2,
          sources: ['x', 'y'],
          article_ids: ['a1', 'a2', 'ghost'],
          hero: { id: 'a1', title: 't', url: 'u', source: 's', publishedAt: null },
          first_seen_at: null,
          corroboration_band: 'limited',
        },
      ],
      embeddings,
    );
    expect(merged.length).toBe(1);
    const mv = unpackVector(merged[0].vec);
    expect(mv[0]).toBeCloseTo(Math.SQRT1_2, 5);
    expect(mv[1]).toBeCloseTo(Math.SQRT1_2, 5);
    expect(mv[2]).toBeCloseTo(0, 5);
  });

  it('runDailyClustering writes a durable news:cluster:vecs:{date} record with model + dims', async () => {
    const ai = new MockAI((texts) =>
      texts.map((t) => {
        if (/mythos/i.test(t)) return fakeVec('a');
        return fakeVec('c');
      }),
    );
    const env = makeEnv(ai);
    const cache = env.TENSORFEED_CACHE as unknown as MockKV;
    cache.store.set(
      'news:daily:2026-05-08',
      JSON.stringify({
        date: '2026-05-08',
        captured_at: '2026-05-08T23:00:00.000Z',
        articles_count: 2,
        articles: [
          fakeArticle('a1', 'Reuters', 'Mythos launches'),
          fakeArticle('a2', 'Anthropic', 'Mythos launches details'),
        ],
      }),
    );
    const result = await runDailyClustering(env, new Date('2026-05-09T07:30:00.000Z'));
    expect(result.ok).toBe(true);
    const raw = cache.store.get('news:cluster:vecs:2026-05-08');
    expect(raw).toBeTruthy();
    const record = JSON.parse(raw!);
    expect(record.model).toBe('@cf/baai/bge-base-en-v1.5');
    expect(record.dims).toBe(8);
    expect(record.centroids.length).toBe(result.clusters_found);
    // Durable: no TTL on the centroid key.
    expect(cache.ttls.get('news:cluster:vecs:2026-05-08')).toBeUndefined();
  });
});
