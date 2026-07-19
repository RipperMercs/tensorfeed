/**
 * News-History Phase B: cross-source clustering and verification.
 *
 * Phase A (commit 242a1fd) captured the foundation: hourly RSS poll
 * results stashed under news:daily:{YYYY-MM-DD}, plus per-source health
 * counters under news:source-health:{date}. This module adds the
 * verification product on top of that foundation.
 *
 * Pipeline (runs once per UTC day on the 07:30 cron):
 *   1. Read yesterday's news:daily:{date} snapshot.
 *   2. Embed each article (title + snippet) via Workers AI
 *      @cf/baai/bge-base-en-v1.5. 768-dim float32. Batched at 50/call.
 *   3. Compute pairwise cosine similarity, threshold 0.82, single-link
 *      cluster.
 *   4. For each cluster, count distinct sources, pick a hero article
 *      (most-trusted source, falling back to first-seen), classify
 *      corroboration band (single / limited / broad).
 *   5. Write news:cluster:{date}:{cid} + index entries.
 *
 * Why embeddings over Jaccard / shingle overlap: agents asking "is
 * this story corroborated" need to catch rephrasing across sources
 * (Reuters vs Anthropic blog vs HN headline) which is exactly where
 * surface-similarity fails. Embedding-based clustering catches it.
 * See PHASE_B_ARCHITECTURE.md (local-only) for the full trade-off
 * write-up.
 */

import type { Env } from './types';
import type { NewsDailySnapshot } from './news-history';
import { sanitizeTitle, sanitizeSnippet } from './sanitize';

// Exported so query-time consumers (the planned corroboration endpoint)
// embed with the SAME model the corpus was built with. A model change
// invalidates every stored centroid; bump in lockstep or not at all.
export const EMBED_MODEL = '@cf/baai/bge-base-en-v1.5';
const EMBED_BATCH_SIZE = 50;
const CLUSTER_THRESHOLD = 0.82;
const MAX_ARTICLES_PER_DAY = 200;

const NEWS_DAILY_KEY = (date: string) => `news:daily:${date}`;
const NEWS_EMBED_KEY = (date: string) => `news:embeddings:${date}`;
const NEWS_CLUSTER_KEY = (date: string, cid: string) => `news:cluster:${date}:${cid}`;
const NEWS_CLUSTER_INDEX_DATE = (date: string) => `news:cluster:index:${date}`;
const NEWS_CLUSTER_DATES = 'news:cluster:dates';
export const NEWS_CLUSTER_VECS_KEY = (date: string) => `news:cluster:vecs:${date}`;
const EMBED_TTL = 30 * 24 * 60 * 60;
const INDEX_CAP_DAYS = 730;

export interface ArticleEmbedding {
  id: string;
  vector: number[];
}

export interface ClusterEntry {
  cluster_id: string;
  date: string;
  article_count: number;
  source_count: number;
  sources: string[];
  article_ids: string[];
  hero: {
    id: string;
    title: string;
    url: string;
    source: string;
    publishedAt: string | null;
  };
  first_seen_at: string | null;
  corroboration_band: 'single' | 'limited' | 'broad';
}

export interface ClusterRunResult {
  ok: boolean;
  date: string;
  articles_embedded: number;
  clusters_found: number;
  duration_ms: number;
  error?: string;
}

function previousUtcDate(now: Date): string {
  const d = new Date(now.getTime() - 24 * 60 * 60 * 1000);
  return d.toISOString().slice(0, 10);
}

function articleEmbedText(article: { title?: string; snippet?: string }): string {
  const title = (article.title ?? '').trim();
  const snippet = (article.snippet ?? '').trim();
  if (title && snippet) return `${title}\n\n${snippet}`;
  return title || snippet || '';
}

export function cosineSimilarity(a: number[], b: number[]): number {
  if (a.length !== b.length) return 0;
  let dot = 0;
  let aMag = 0;
  let bMag = 0;
  for (let i = 0; i < a.length; i += 1) {
    dot += a[i] * b[i];
    aMag += a[i] * a[i];
    bMag += b[i] * b[i];
  }
  const denom = Math.sqrt(aMag) * Math.sqrt(bMag);
  if (denom === 0) return 0;
  return dot / denom;
}

/**
 * Single-link clustering with cosine threshold. Returns an array of
 * cluster index assignments parallel to the input array (so the
 * caller can hydrate against their article list directly).
 */
export function clusterByEmbedding(embeddings: number[][], threshold: number): number[] {
  const n = embeddings.length;
  const parent = Array.from({ length: n }, (_, i) => i);
  const find = (i: number): number => {
    while (parent[i] !== i) {
      parent[i] = parent[parent[i]];
      i = parent[i];
    }
    return i;
  };
  const union = (i: number, j: number): void => {
    const ri = find(i);
    const rj = find(j);
    if (ri !== rj) parent[ri] = rj;
  };
  for (let i = 0; i < n; i += 1) {
    for (let j = i + 1; j < n; j += 1) {
      if (cosineSimilarity(embeddings[i], embeddings[j]) >= threshold) {
        union(i, j);
      }
    }
  }
  const out: number[] = new Array(n);
  for (let i = 0; i < n; i += 1) out[i] = find(i);
  // Renumber so cluster IDs are dense 0..k-1
  const remap = new Map<number, number>();
  for (let i = 0; i < n; i += 1) {
    if (!remap.has(out[i])) remap.set(out[i], remap.size);
    out[i] = remap.get(out[i])!;
  }
  return out;
}

// === Durable cluster centroids ===
//
// The per-article embeddings above (news:embeddings:{date}) expire after
// 30 days and weigh ~1MB/day as JSON, which makes them the wrong corpus
// for a query-time similarity check. Centroids fix both problems: one
// L2-normalized 768-dim vector per cluster, packed as base64 float32,
// written once per day under news:cluster:vecs:{date} with NO TTL.
// ~40 clusters x ~4KB is ~160KB/day, far under the 25MB KV value cap,
// and one extra KV write per cron run. Normalizing at write time means
// query-time similarity against a normalized probe is a plain dot
// product. This is the accumulation half of the corroboration product
// (specs/moat-wave-20.md C.3); the corpus can only cover dates from
// this ship date forward, which is why it lands ahead of the endpoint.

export interface ClusterCentroid {
  cid: string;
  vec: string; // base64 little-endian float32, L2-normalized
}

export interface ClusterCentroidsRecord {
  date: string;
  dims: number;
  model: string;
  centroids: ClusterCentroid[];
}

export function packVector(vec: number[]): string {
  const f32 = new Float32Array(vec);
  const bytes = new Uint8Array(f32.buffer);
  let bin = '';
  const CHUNK = 8192;
  for (let i = 0; i < bytes.length; i += CHUNK) {
    bin += String.fromCharCode(...bytes.subarray(i, i + CHUNK));
  }
  return btoa(bin);
}

export function unpackVector(b64: string): number[] {
  const bin = atob(b64);
  const bytes = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i += 1) bytes[i] = bin.charCodeAt(i);
  return Array.from(new Float32Array(bytes.buffer));
}

/**
 * Pure function: mean of each cluster's member vectors, L2-normalized.
 * Members without an embedding are skipped; a cluster whose members all
 * lack embeddings is dropped (cannot happen in practice because cluster
 * membership is derived FROM the embeddings, but the guard keeps this
 * function total).
 */
export function computeCentroids(
  clusters: ClusterEntry[],
  embeddings: ArticleEmbedding[],
): ClusterCentroid[] {
  const vecById = new Map(embeddings.map((e) => [e.id, e.vector]));
  const out: ClusterCentroid[] = [];
  for (const cluster of clusters) {
    const members = cluster.article_ids
      .map((id) => vecById.get(id))
      .filter((v): v is number[] => Array.isArray(v) && v.length > 0);
    if (members.length === 0) continue;
    const dims = members[0].length;
    const sum = new Array<number>(dims).fill(0);
    for (const v of members) {
      for (let i = 0; i < dims; i += 1) sum[i] += v[i];
    }
    let mag = 0;
    for (let i = 0; i < dims; i += 1) {
      sum[i] /= members.length;
      mag += sum[i] * sum[i];
    }
    mag = Math.sqrt(mag);
    if (mag === 0) continue;
    for (let i = 0; i < dims; i += 1) sum[i] /= mag;
    out.push({ cid: cluster.cluster_id, vec: packVector(sum) });
  }
  return out;
}

export async function readCentroidsForDate(
  env: Env,
  date: string,
): Promise<ClusterCentroidsRecord | null> {
  return env.TENSORFEED_CACHE.get<ClusterCentroidsRecord>(NEWS_CLUSTER_VECS_KEY(date), 'json');
}

interface ArticleLite {
  id: string;
  title: string;
  url: string;
  source: string;
  sourceDomain?: string;
  snippet: string;
  publishedAt?: string;
}

/**
 * Batch-embed an array of articles via Workers AI. Returns parallel
 * arrays of ids + vectors. Articles that fail to embed (empty text,
 * upstream error) are dropped from the output, callers should align
 * by position.
 */
async function embedArticles(
  env: Env,
  articles: ArticleLite[],
): Promise<ArticleEmbedding[]> {
  if (!env.AI) throw new Error('workers_ai_unbound');
  const out: ArticleEmbedding[] = [];
  for (let i = 0; i < articles.length; i += EMBED_BATCH_SIZE) {
    const batch = articles.slice(i, i + EMBED_BATCH_SIZE);
    const texts = batch.map(articleEmbedText);
    if (texts.every((t) => t.length === 0)) continue;
    let resp: { data: number[][] };
    try {
      resp = await env.AI.run(EMBED_MODEL, { text: texts });
    } catch (e) {
      console.warn('embed batch failed:', e);
      continue;
    }
    if (!resp.data || resp.data.length !== batch.length) continue;
    for (let j = 0; j < batch.length; j += 1) {
      const vector = resp.data[j];
      if (!Array.isArray(vector) || vector.length === 0) continue;
      out.push({ id: batch[j].id, vector });
    }
  }
  return out;
}

function clusterIdFromMembers(memberIds: string[]): string {
  const sorted = [...memberIds].sort();
  let hash = 2166136261;
  for (let i = 0; i < sorted.length; i += 1) {
    const s = sorted[i];
    for (let k = 0; k < s.length; k += 1) {
      hash ^= s.charCodeAt(k);
      hash = Math.imul(hash, 16777619);
    }
  }
  return (hash >>> 0).toString(36);
}

function corroborationBand(sourceCount: number): 'single' | 'limited' | 'broad' {
  if (sourceCount <= 1) return 'single';
  if (sourceCount <= 3) return 'limited';
  return 'broad';
}

export interface BuildClustersInput {
  date: string;
  articles: ArticleLite[];
  embeddings: ArticleEmbedding[];
  threshold?: number;
}

/**
 * Pure function: given articles + their embeddings, return cluster
 * entries. Separated from the I/O orchestrator so we can unit-test
 * the clustering logic without touching KV or Workers AI.
 */
export function buildClusters(input: BuildClustersInput): ClusterEntry[] {
  const { date, articles, embeddings, threshold = CLUSTER_THRESHOLD } = input;
  if (embeddings.length === 0) return [];

  const idToArticle = new Map(articles.map((a) => [a.id, a]));
  const orderedIds = embeddings.map((e) => e.id);
  const orderedVectors = embeddings.map((e) => e.vector);

  const assignments = clusterByEmbedding(orderedVectors, threshold);
  const groups = new Map<number, string[]>();
  for (let i = 0; i < orderedIds.length; i += 1) {
    const cid = assignments[i];
    if (!groups.has(cid)) groups.set(cid, []);
    groups.get(cid)!.push(orderedIds[i]);
  }

  const clusters: ClusterEntry[] = [];
  for (const memberIds of groups.values()) {
    const members = memberIds
      .map((id) => idToArticle.get(id))
      .filter((a): a is ArticleLite => Boolean(a));
    if (members.length === 0) continue;

    const sources = Array.from(
      new Set(members.map((m) => m.sourceDomain ?? m.source).filter(Boolean)),
    );

    members.sort((a, b) => {
      const aTime = a.publishedAt ? Date.parse(a.publishedAt) : Number.POSITIVE_INFINITY;
      const bTime = b.publishedAt ? Date.parse(b.publishedAt) : Number.POSITIVE_INFINITY;
      return aTime - bTime;
    });
    const hero = members[0];
    const cluster_id = clusterIdFromMembers(memberIds);

    // Sanitize hero title before persisting. The cluster surface is
    // agent-facing, and the source articles in news:daily are HTML-stripped
    // but not role-confusion-sanitized (sanitize.ts is applied at /api/news
    // read time, not at write time to news:daily). Apply the same
    // sanitization here so cluster consumers get the same protection
    // /api/news consumers get. Catches role-confusion tokens, bidi
    // spoofing chars, and length-caps from one of our 12 sources that
    // accepts arbitrary user submissions (Hacker News specifically).
    clusters.push({
      cluster_id,
      date,
      article_count: members.length,
      source_count: sources.length,
      sources,
      article_ids: members.map((m) => m.id),
      hero: {
        id: hero.id,
        title: sanitizeTitle(hero.title),
        url: hero.url,
        source: hero.source,
        publishedAt: hero.publishedAt ?? null,
      },
      first_seen_at: hero.publishedAt ?? null,
      corroboration_band: corroborationBand(sources.length),
    });
  }

  // Sort by source_count desc, then article_count desc, then hero
  // publishedAt desc. The first cluster in the array is the most
  // corroborated story of the day.
  clusters.sort((a, b) => {
    if (a.source_count !== b.source_count) return b.source_count - a.source_count;
    if (a.article_count !== b.article_count) return b.article_count - a.article_count;
    const aTime = a.first_seen_at ? Date.parse(a.first_seen_at) : 0;
    const bTime = b.first_seen_at ? Date.parse(b.first_seen_at) : 0;
    return bTime - aTime;
  });

  return clusters;
}

async function ensureDateInIndex(env: Env, key: string, date: string): Promise<void> {
  const list = (await env.TENSORFEED_CACHE.get<string[]>(key, 'json')) ?? [];
  if (list.includes(date)) return;
  list.push(date);
  list.sort();
  while (list.length > INDEX_CAP_DAYS) list.shift();
  await env.TENSORFEED_CACHE.put(key, JSON.stringify(list));
}

export async function runDailyClustering(
  env: Env,
  now: Date = new Date(),
  dateOverride?: string,
  thresholdOverride?: number,
): Promise<ClusterRunResult> {
  const startedAt = Date.now();
  const date = dateOverride ?? previousUtcDate(now);

  if (!env.AI) {
    return {
      ok: false,
      date,
      articles_embedded: 0,
      clusters_found: 0,
      duration_ms: Date.now() - startedAt,
      error: 'workers_ai_unbound',
    };
  }

  const snapshot = await env.TENSORFEED_CACHE.get<NewsDailySnapshot>(NEWS_DAILY_KEY(date), 'json');
  if (!snapshot || !Array.isArray(snapshot.articles) || snapshot.articles.length === 0) {
    return {
      ok: false,
      date,
      articles_embedded: 0,
      clusters_found: 0,
      duration_ms: Date.now() - startedAt,
      error: 'no_news_snapshot',
    };
  }

  const articles: ArticleLite[] = snapshot.articles
    .slice(0, MAX_ARTICLES_PER_DAY)
    .map((a) => ({
      id: String(a.id),
      title: a.title ?? '',
      url: a.url ?? '',
      source: a.source ?? '',
      sourceDomain: a.sourceDomain,
      snippet: a.snippet ?? '',
      publishedAt: a.publishedAt,
    }))
    .filter((a) => a.id && articleEmbedText(a).length > 0);

  let embeddings: ArticleEmbedding[];
  try {
    embeddings = await embedArticles(env, articles);
  } catch (e) {
    return {
      ok: false,
      date,
      articles_embedded: 0,
      clusters_found: 0,
      duration_ms: Date.now() - startedAt,
      error: `embed_failed: ${e instanceof Error ? e.message : String(e)}`,
    };
  }

  if (embeddings.length === 0) {
    return {
      ok: false,
      date,
      articles_embedded: 0,
      clusters_found: 0,
      duration_ms: Date.now() - startedAt,
      error: 'no_embeddings_returned',
    };
  }

  await env.TENSORFEED_CACHE.put(NEWS_EMBED_KEY(date), JSON.stringify(embeddings), {
    expirationTtl: EMBED_TTL,
  });

  const clusters = buildClusters({ date, articles, embeddings, threshold: thresholdOverride });

  for (const cluster of clusters) {
    await env.TENSORFEED_CACHE.put(
      NEWS_CLUSTER_KEY(date, cluster.cluster_id),
      JSON.stringify(cluster),
    );
  }
  await env.TENSORFEED_CACHE.put(
    NEWS_CLUSTER_INDEX_DATE(date),
    JSON.stringify(clusters.map((c) => c.cluster_id)),
  );
  await ensureDateInIndex(env, NEWS_CLUSTER_DATES, date);

  // Durable centroids for the corroboration corpus. Best-effort: a
  // failure here must not fail the clustering run the free cluster
  // surfaces depend on.
  try {
    const centroids = computeCentroids(clusters, embeddings);
    if (centroids.length > 0) {
      const record: ClusterCentroidsRecord = {
        date,
        dims: embeddings[0].vector.length,
        model: EMBED_MODEL,
        centroids,
      };
      await env.TENSORFEED_CACHE.put(NEWS_CLUSTER_VECS_KEY(date), JSON.stringify(record));
    }
  } catch (e) {
    console.error('centroid persistence failed:', e);
  }

  return {
    ok: true,
    date,
    articles_embedded: embeddings.length,
    clusters_found: clusters.length,
    duration_ms: Date.now() - startedAt,
  };
}

export async function readClustersForDate(env: Env, date: string): Promise<ClusterEntry[]> {
  const ids = (await env.TENSORFEED_CACHE.get<string[]>(NEWS_CLUSTER_INDEX_DATE(date), 'json')) ?? [];
  if (ids.length === 0) return [];
  const entries = await Promise.all(
    ids.map((cid) => env.TENSORFEED_CACHE.get<ClusterEntry>(NEWS_CLUSTER_KEY(date, cid), 'json')),
  );
  return entries.filter((e): e is ClusterEntry => Boolean(e));
}

export async function listClusterDates(env: Env): Promise<string[]> {
  return (await env.TENSORFEED_CACHE.get<string[]>(NEWS_CLUSTER_DATES, 'json')) ?? [];
}

export const __test = {
  cosineSimilarity,
  corroborationBand,
  clusterIdFromMembers,
  previousUtcDate,
};
