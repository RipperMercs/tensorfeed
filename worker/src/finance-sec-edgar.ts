/**
 * SEC EDGAR full-text search + submissions ingest.
 *
 * EDGAR exposes two complementary APIs we proxy here:
 *
 *   1. Full-text search via efts.sec.gov/LATEST/search-index. Lucene-
 *      style q= parameter, optional form-type filter, optional date
 *      range. Returns hits across the entire EDGAR corpus of public
 *      filings since the early 1990s. The killer query for finance
 *      agents.
 *
 *   2. Submissions API at data.sec.gov/submissions/CIK{cik}.json.
 *      Returns recent filings for one company plus historical
 *      paginated archives, addresses, exchanges, EIN, SIC codes, and
 *      tickers.
 *
 * License: SEC EDGAR data is in the public domain via 17 USC §105
 * (US Government work). Commercial redistribution explicitly
 * permitted. SEC requires a User-Agent header identifying the caller
 * for fair-access tracking; we send TensorFeed's contact info.
 *
 * Architecture: pure lazy-proxy with KV cache, same pattern as
 * everything else we ship. Search results cache for 1 hour (full-text
 * search is computationally expensive on SEC's side and queries are
 * highly cacheable for popular search strings). Submissions cache for
 * 6 hours (recent filings update intra-day).
 */

import type { Env } from './types';
import { readEdgeCacheJSON, writeEdgeCacheJSON } from './edge-cache';
import { sha256CacheKey } from './cache-key';

const EDGAR_SEARCH = 'https://efts.sec.gov/LATEST/search-index';
const EDGAR_SUBMISSIONS = 'https://data.sec.gov/submissions';
// SEC requires a contact-identifying User-Agent on every request:
// https://www.sec.gov/oit/announcement/new-rate-control-limits
const SEC_UA = 'TensorFeed.ai contact@tensorfeed.ai';

const TTL_SEARCH = 60 * 60;
const TTL_SUBMISSIONS = 6 * 60 * 60;

const ATTRIBUTION = {
  source: 'SEC EDGAR',
  source_url: 'https://www.sec.gov/edgar.shtml',
  publisher: 'US Securities and Exchange Commission',
  license: 'US Government public domain (17 USC §105)',
  redistribution: 'commercial-permitted',
  notice:
    'EDGAR filings are public regulatory disclosures. The content of any individual filing is the responsibility of the filer; SEC publication does not constitute endorsement. Do not use EDGAR data for direct investment decisions without independent verification. Filings before 1993 may not be in EDGAR; use the SEC public reading room for older records.',
};

// Lucene-style search query: alphanumeric, common punctuation, quotes,
// boolean operators. Reject anything that looks like an injection.
const SEARCH_Q_RE = /^[A-Za-z0-9_.,;:!?'"()\[\]{}\-+@*&|/\s]{1,500}$/;
const FORMS_RE = /^[A-Z0-9,/-]{1,200}$/;
const ISO_DATE_RE = /^\d{4}-\d{2}-\d{2}$/;
const CIK_RE = /^\d{1,10}$/;
const CIK_PREFIXED_RE = /^CIK\d{10}$/i;

export function normalizeCIK(input: string): string | null {
  if (!input) return null;
  const trimmed = input.trim();
  if (CIK_PREFIXED_RE.test(trimmed)) {
    return trimmed.toUpperCase().slice(3);
  }
  if (CIK_RE.test(trimmed)) {
    return trimmed.padStart(10, '0');
  }
  return null;
}

export interface EdgarSearchQuery {
  q: string;
  forms: string | null;
  startdt: string | null;
  enddt: string | null;
  limit: number;
  page: number;
}

export interface EdgarSearchResult {
  ok: boolean;
  source: 'cache' | 'live';
  fetched_at: string;
  query: EdgarSearchQuery;
  data: unknown | null;
  attribution: typeof ATTRIBUTION;
  error?: string;
  http_status?: number;
}

export interface ParseOk<T> {
  ok: true;
  query: T;
}
export interface ParseErr {
  ok: false;
  error: string;
  hint: string;
}

export function parseEdgarSearchQuery(url: URL): ParseOk<EdgarSearchQuery> | ParseErr {
  const q = url.searchParams.get('q');
  if (!q) {
    return {
      ok: false,
      error: 'q_required',
      hint: 'pass ?q=<lucene-style query>, e.g. ?q=%22artificial+intelligence%22',
    };
  }
  if (!SEARCH_Q_RE.test(q)) {
    return {
      ok: false,
      error: 'invalid_q',
      hint: 'q contains disallowed characters; alphanumeric and standard punctuation only',
    };
  }
  const forms = url.searchParams.get('forms');
  if (forms && !FORMS_RE.test(forms)) {
    return {
      ok: false,
      error: 'invalid_forms',
      hint: 'forms must be a comma-separated list of form types (e.g. 10-K,10-Q,8-K)',
    };
  }
  const startdt = url.searchParams.get('startdt') ?? url.searchParams.get('from');
  if (startdt && !ISO_DATE_RE.test(startdt)) {
    return { ok: false, error: 'invalid_startdt', hint: 'startdt must be YYYY-MM-DD' };
  }
  const enddt = url.searchParams.get('enddt') ?? url.searchParams.get('to');
  if (enddt && !ISO_DATE_RE.test(enddt)) {
    return { ok: false, error: 'invalid_enddt', hint: 'enddt must be YYYY-MM-DD' };
  }
  const requestedLimit = parseInt(url.searchParams.get('limit') ?? '10', 10);
  const limit = Math.max(1, Math.min(Number.isFinite(requestedLimit) ? requestedLimit : 10, 50));
  const requestedPage = parseInt(url.searchParams.get('page') ?? '1', 10);
  const page = Math.max(1, Math.min(Number.isFinite(requestedPage) ? requestedPage : 1, 100));
  return { ok: true, query: { q, forms, startdt, enddt, limit, page } };
}

function buildSearchUrl(q: EdgarSearchQuery): string {
  const params = new URLSearchParams();
  params.set('q', q.q);
  if (q.forms) params.set('forms', q.forms);
  if (q.startdt) {
    params.set('dateRange', 'custom');
    params.set('startdt', q.startdt);
  }
  if (q.enddt) {
    params.set('enddt', q.enddt);
  }
  if (q.page > 1) {
    // EDGAR search pagination uses `from` as a 0-indexed offset
    params.set('from', String((q.page - 1) * q.limit));
  }
  return `${EDGAR_SEARCH}?${params.toString()}`;
}

export async function searchEdgar(env: Env, q: EdgarSearchQuery): Promise<EdgarSearchResult> {
  const fetched_at = new Date().toISOString();
  const cacheKey = `edgar:search:${await sha256CacheKey(
    [q.q, q.forms ?? '', q.startdt ?? '', q.enddt ?? '', q.limit, q.page].join('|'),
  )}`;

  const cached = await readEdgeCacheJSON<unknown>(cacheKey);
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

  let resp: Response;
  try {
    resp = await fetch(buildSearchUrl(q), {
      headers: { 'User-Agent': SEC_UA, Accept: 'application/json' },
      signal: AbortSignal.timeout(20000),
    });
  } catch (e) {
    return {
      ok: false,
      source: 'live',
      fetched_at,
      query: q,
      data: null,
      attribution: ATTRIBUTION,
      error: `edgar_fetch_failed: ${e instanceof Error ? e.message : String(e)}`,
    };
  }

  if (resp.status === 429) {
    return {
      ok: false,
      source: 'live',
      fetched_at,
      query: q,
      data: null,
      attribution: ATTRIBUTION,
      error: 'edgar_upstream_rate_limited',
      http_status: 429,
    };
  }
  if (!resp.ok) {
    return {
      ok: false,
      source: 'live',
      fetched_at,
      query: q,
      data: null,
      attribution: ATTRIBUTION,
      error: `edgar_http_${resp.status}`,
      http_status: resp.status,
    };
  }

  let payload: unknown;
  try {
    payload = await resp.json();
  } catch {
    return {
      ok: false,
      source: 'live',
      fetched_at,
      query: q,
      data: null,
      attribution: ATTRIBUTION,
      error: 'edgar_invalid_json',
    };
  }

  await writeEdgeCacheJSON(cacheKey, payload, TTL_SEARCH);

  return {
    ok: true,
    source: 'live',
    fetched_at,
    query: q,
    data: payload,
    attribution: ATTRIBUTION,
  };
}

export interface EdgarSubmissionsResult {
  ok: boolean;
  cik: string;
  source: 'cache' | 'live' | 'not_found';
  fetched_at: string;
  data: unknown | null;
  attribution: typeof ATTRIBUTION;
  error?: string;
}

export async function fetchEdgarSubmissions(env: Env, cikInput: string): Promise<EdgarSubmissionsResult> {
  const fetched_at = new Date().toISOString();
  const cik = normalizeCIK(cikInput);
  if (!cik) {
    return {
      ok: false,
      cik: cikInput,
      source: 'not_found',
      fetched_at,
      data: null,
      attribution: ATTRIBUTION,
      error: 'invalid_cik',
    };
  }

  const cacheKey = `edgar:submissions:${cik}`;
  const cached = await readEdgeCacheJSON<unknown>(cacheKey);
  if (cached) {
    return { ok: true, cik, source: 'cache', fetched_at, data: cached, attribution: ATTRIBUTION };
  }

  let resp: Response;
  try {
    resp = await fetch(`${EDGAR_SUBMISSIONS}/CIK${cik}.json`, {
      headers: { 'User-Agent': SEC_UA, Accept: 'application/json' },
      signal: AbortSignal.timeout(15000),
    });
  } catch (e) {
    return {
      ok: false,
      cik,
      source: 'not_found',
      fetched_at,
      data: null,
      attribution: ATTRIBUTION,
      error: `edgar_fetch_failed: ${e instanceof Error ? e.message : String(e)}`,
    };
  }

  if (resp.status === 404) {
    return {
      ok: false,
      cik,
      source: 'not_found',
      fetched_at,
      data: null,
      attribution: ATTRIBUTION,
      error: 'cik_not_found',
    };
  }
  if (!resp.ok) {
    return {
      ok: false,
      cik,
      source: 'not_found',
      fetched_at,
      data: null,
      attribution: ATTRIBUTION,
      error: `edgar_http_${resp.status}`,
    };
  }

  let payload: unknown;
  try {
    payload = await resp.json();
  } catch {
    return {
      ok: false,
      cik,
      source: 'not_found',
      fetched_at,
      data: null,
      attribution: ATTRIBUTION,
      error: 'edgar_invalid_json',
    };
  }

  await writeEdgeCacheJSON(cacheKey, payload, TTL_SUBMISSIONS);

  return { ok: true, cik, source: 'live', fetched_at, data: payload, attribution: ATTRIBUTION };
}

export const EDGAR_ATTRIBUTION = ATTRIBUTION;
