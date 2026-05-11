/**
 * OpenFDA ingest.
 *
 * The FDA's openFDA platform exposes 100M+ regulatory records across
 * drugs, devices, food, and animal/veterinary products. License: CC0
 * 1.0 Universal Dedication; commercial redistribution explicitly
 * permitted with no attribution requirement (the FDA waived all
 * copyright interests to the extent allowed by law).
 *
 * Architecture: pure lazy-proxy with KV cache. OpenFDA enforces
 * 240 req/min and 1000/day unauthenticated (120K/day with a free key).
 * We cache query results in KV with a 24h TTL to amortize repeat
 * lookups across agents querying the same drug, device, or recall.
 *
 * Five category sub-endpoints exposed (chosen for highest agent
 * demand from healthcare copilots and compliance bots):
 *   drug/events      adverse-event reports (~10M records)
 *   drug/labels      structured drug labels (~150K records)
 *   drug/recalls     drug enforcement reports / recalls
 *   food/recalls     food enforcement reports / recalls
 *   device/events    medical-device adverse events
 *
 * Each accepts the standard OpenFDA query params:
 *   search   field:value lucene-style search expression
 *   limit    1 to 100
 *   skip     pagination offset
 *   sort     field:asc|desc
 *
 * The premium aggregate endpoint exposes openFDA's `count` parameter
 * which returns histogram buckets across any indexed field. Used to
 * answer "what are the top N adverse reactions for this drug" or
 * "which devices generated the most events in 2025" in one call
 * instead of N follow-up queries.
 */

import type { Env } from './types';
import { readEdgeCacheJSON, writeEdgeCacheJSON } from './edge-cache';
import { sha256CacheKey } from './cache-key';

const FDA_BASE = 'https://api.fda.gov';

const TTL_QUERY = 24 * 60 * 60;

const ATTRIBUTION = {
  source: 'OpenFDA',
  source_url: 'https://open.fda.gov/',
  publisher: 'US Food and Drug Administration',
  license: 'CC0 1.0 Universal Dedication (FDA waiver of all copyright interests)',
  redistribution: 'commercial-permitted',
  notice:
    'OpenFDA data is in the public domain. Do not use openFDA results for direct medical care decisions. Adverse-event reports are unvalidated and may include duplicates or incomplete information. Refer to the FDA disclaimer at https://open.fda.gov/about/.',
};

export const FDA_CATEGORIES: Record<string, { upstream: string; description: string }> = {
  'drug/events': {
    upstream: '/drug/event.json',
    description:
      'Drug adverse event reports submitted to the FAERS database. Includes patient demographics, drug names, reaction terms, and outcome classifications.',
  },
  'drug/labels': {
    upstream: '/drug/label.json',
    description:
      'Structured product labeling for prescription and OTC drugs (SPL format). Includes indications, dosage, warnings, contraindications, adverse reactions, and pharmacology.',
  },
  'drug/recalls': {
    upstream: '/drug/enforcement.json',
    description:
      'Drug enforcement reports (recalls) including classification, reason, distribution, and product description.',
  },
  'food/recalls': {
    upstream: '/food/enforcement.json',
    description:
      'Food enforcement reports (recalls) covering products distributed in the US.',
  },
  'device/events': {
    upstream: '/device/event.json',
    description:
      'Medical device adverse event reports submitted to the MAUDE database. Includes device identifiers, problem codes, and event narratives.',
  },
};

const SEARCH_RE = /^[A-Za-z0-9_:.\-+@/(),"\s\[\]*]{1,1000}$/;
const SORT_RE = /^[A-Za-z0-9_.]{1,80}:(asc|desc)$/;
const FIELD_RE = /^[A-Za-z0-9_.]{1,80}$/;

export interface FDAQuery {
  category: string;
  search: string | null;
  limit: number;
  skip: number;
  sort: string | null;
}

export interface FDAResult {
  ok: boolean;
  source: 'cache' | 'live';
  fetched_at: string;
  query: FDAQuery;
  data: unknown | null;
  attribution: typeof ATTRIBUTION;
  error?: string;
  http_status?: number;
}

export interface FDAAggregateQuery {
  category: string;
  count_by: string;
  search: string | null;
  limit: number;
}

export interface ParseResultOk<T> {
  ok: true;
  query: T;
}

export interface ParseError {
  ok: false;
  error: string;
  hint: string;
}

export function isFDACategory(c: string): c is keyof typeof FDA_CATEGORIES {
  // Use hasOwnProperty.call to avoid the prototype-chain trap: `c in
  // FDA_CATEGORIES` evaluates true for `__proto__`, `toString`, etc.,
  // which would then propagate as a category string and crash the
  // worker downstream when FDA_TRANSFORMERS[c] resolves to a non-
  // callable prototype value.
  return Object.prototype.hasOwnProperty.call(FDA_CATEGORIES, c);
}

export function parseFDAQuery(
  category: string,
  url: URL,
): ParseResultOk<FDAQuery> | ParseError {
  if (!isFDACategory(category)) {
    return {
      ok: false,
      error: 'unknown_category',
      hint: `category must be one of: ${Object.keys(FDA_CATEGORIES).join(', ')}`,
    };
  }
  const search = url.searchParams.get('search');
  if (search && !SEARCH_RE.test(search)) {
    return {
      ok: false,
      error: 'invalid_search',
      hint: 'search expression contains disallowed characters; use openFDA lucene-style syntax (field:value+AND+field:value)',
    };
  }
  const requestedLimit = parseInt(url.searchParams.get('limit') ?? '10', 10);
  const limit = Math.max(1, Math.min(Number.isFinite(requestedLimit) ? requestedLimit : 10, 100));
  const requestedSkip = parseInt(url.searchParams.get('skip') ?? '0', 10);
  const skip = Math.max(0, Math.min(Number.isFinite(requestedSkip) ? requestedSkip : 0, 25000));
  const sort = url.searchParams.get('sort');
  if (sort && !SORT_RE.test(sort)) {
    return {
      ok: false,
      error: 'invalid_sort',
      hint: 'sort must be field:asc or field:desc (e.g. receivedate:desc)',
    };
  }
  return { ok: true, query: { category, search, limit, skip, sort } };
}

export function parseFDAAggregateQuery(
  url: URL,
): ParseResultOk<FDAAggregateQuery> | ParseError {
  const category = url.searchParams.get('category');
  if (!category || !isFDACategory(category)) {
    return {
      ok: false,
      error: 'invalid_category',
      hint: `pass ?category=<one of: ${Object.keys(FDA_CATEGORIES).join(', ')}>`,
    };
  }
  const count_by = url.searchParams.get('count_by');
  if (!count_by) {
    return {
      ok: false,
      error: 'count_by_required',
      hint: 'pass ?count_by=<field-name> (e.g. patient.drug.medicinalproduct.exact for top drugs by event count)',
    };
  }
  if (!FIELD_RE.test(count_by)) {
    return {
      ok: false,
      error: 'invalid_count_by',
      hint: 'count_by must be a valid openFDA field path (e.g. patient.reaction.reactionmeddrapt.exact)',
    };
  }
  const search = url.searchParams.get('search');
  if (search && !SEARCH_RE.test(search)) {
    return {
      ok: false,
      error: 'invalid_search',
      hint: 'search expression contains disallowed characters',
    };
  }
  const requestedLimit = parseInt(url.searchParams.get('limit') ?? '20', 10);
  const limit = Math.max(1, Math.min(Number.isFinite(requestedLimit) ? requestedLimit : 20, 1000));
  return { ok: true, query: { category, count_by, search, limit } };
}

function buildFDAUrl(q: FDAQuery): string {
  const params = new URLSearchParams();
  if (q.search) params.set('search', q.search);
  params.set('limit', String(q.limit));
  if (q.skip > 0) params.set('skip', String(q.skip));
  if (q.sort) params.set('sort', q.sort);
  return `${FDA_BASE}${FDA_CATEGORIES[q.category].upstream}?${params.toString()}`;
}

function buildAggregateUrl(q: FDAAggregateQuery): string {
  const params = new URLSearchParams();
  if (q.search) params.set('search', q.search);
  params.set('count', q.count_by);
  params.set('limit', String(q.limit));
  return `${FDA_BASE}${FDA_CATEGORIES[q.category].upstream}?${params.toString()}`;
}

async function cacheKeyForQuery(q: FDAQuery): Promise<string> {
  const parts = [q.category, q.search ?? '', q.limit, q.skip, q.sort ?? ''].join('|');
  return `fda:q:${await sha256CacheKey(parts)}`;
}

async function cacheKeyForAggregate(q: FDAAggregateQuery): Promise<string> {
  const parts = [q.category, q.count_by, q.search ?? '', q.limit].join('|');
  return `fda:agg:${await sha256CacheKey(parts)}`;
}

async function fetchFDA(url: string): Promise<{
  ok: boolean;
  status: number;
  body: unknown | null;
  error?: string;
}> {
  let resp: Response;
  try {
    resp = await fetch(url, {
      headers: {
        'User-Agent': 'TensorFeed/1.0 (https://tensorfeed.ai)',
        Accept: 'application/json',
      },
      signal: AbortSignal.timeout(20000),
    });
  } catch (e) {
    return {
      ok: false,
      status: 0,
      body: null,
      error: `fda_fetch_failed: ${e instanceof Error ? e.message : String(e)}`,
    };
  }
  if (resp.status === 429) {
    return { ok: false, status: 429, body: null, error: 'fda_upstream_rate_limited' };
  }
  if (resp.status === 404) {
    // openFDA returns 404 with NOT_FOUND for empty search results, which
    // is not really an error: it means the search matched nothing. Try
    // to surface the body so the agent sees the standard meta envelope.
    try {
      const body = await resp.json();
      return { ok: true, status: 404, body };
    } catch {
      return { ok: true, status: 404, body: { results: [] } };
    }
  }
  if (!resp.ok) {
    return { ok: false, status: resp.status, body: null, error: `fda_http_${resp.status}` };
  }
  try {
    const body = await resp.json();
    return { ok: true, status: 200, body };
  } catch {
    return { ok: false, status: 200, body: null, error: 'fda_invalid_json' };
  }
}

export async function fetchFDAQuery(env: Env, q: FDAQuery): Promise<FDAResult> {
  const fetched_at = new Date().toISOString();
  const key = await cacheKeyForQuery(q);

  const cached = await readEdgeCacheJSON<unknown>(key);
  if (cached) {
    return {
      ok: true,
      source: 'cache',
      fetched_at,
      query: q,
      data: cached,
      attribution: ATTRIBUTION,
    };
  }

  const result = await fetchFDA(buildFDAUrl(q));
  if (!result.ok) {
    return {
      ok: false,
      source: 'live',
      fetched_at,
      query: q,
      data: null,
      attribution: ATTRIBUTION,
      error: result.error,
      http_status: result.status,
    };
  }

  await writeEdgeCacheJSON(key, result.body, TTL_QUERY);

  return {
    ok: true,
    source: 'live',
    fetched_at,
    query: q,
    data: result.body,
    attribution: ATTRIBUTION,
  };
}

export interface FDAAggregateResult {
  ok: boolean;
  source: 'cache' | 'live';
  fetched_at: string;
  query: FDAAggregateQuery;
  data: unknown | null;
  attribution: typeof ATTRIBUTION;
  error?: string;
  http_status?: number;
}

export async function fetchFDAAggregate(
  env: Env,
  q: FDAAggregateQuery,
): Promise<FDAAggregateResult> {
  const fetched_at = new Date().toISOString();
  const key = await cacheKeyForAggregate(q);

  const cached = await readEdgeCacheJSON<unknown>(key);
  if (cached) {
    return {
      ok: true,
      source: 'cache',
      fetched_at,
      query: q,
      data: cached,
      attribution: ATTRIBUTION,
    };
  }

  const result = await fetchFDA(buildAggregateUrl(q));
  if (!result.ok) {
    return {
      ok: false,
      source: 'live',
      fetched_at,
      query: q,
      data: null,
      attribution: ATTRIBUTION,
      error: result.error,
      http_status: result.status,
    };
  }

  await writeEdgeCacheJSON(key, result.body, TTL_QUERY);

  return {
    ok: true,
    source: 'live',
    fetched_at,
    query: q,
    data: result.body,
    attribution: ATTRIBUTION,
  };
}

export const FDA_ATTRIBUTION = ATTRIBUTION;
