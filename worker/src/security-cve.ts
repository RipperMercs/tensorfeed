/**
 * MITRE CVE List ingest.
 *
 * Two integration surfaces:
 *
 *   1. Single-CVE lookup via MITRE's CVE Services API:
 *      https://cveawg.mitre.org/api/cve/{CVE-YYYY-NNNNN}
 *      No auth required. Returns the canonical CVE Record v5.2 JSON.
 *      We cache responses in KV for 7 days; cache hits are read-only and
 *      cheap, cache misses are a single subrequest plus a single KV write.
 *
 *   2. "Recent CVEs" list via the cvelistV5 GitHub repo's commit history:
 *      https://api.github.com/repos/CVEProject/cvelistV5/commits
 *      Authenticated via GITHUB_TOKEN (5000 req/h). Daily cron walks
 *      commits in the last 24h, extracts added/modified CVE-* file paths,
 *      derives CVE IDs, writes a `cve:recent` ring + a dated index
 *      `cve:by-date:{YYYY-MM-DD}`. Both compound into the premium range
 *      query.
 *
 * License posture (from EXAMPLE CANONICAL CORPORA in TF_INGEST_PRIORITY.md):
 *   MITRE CVE Terms of Use explicitly permit commercial redistribution
 *   of CVE records. We attach the standard attribution block to every
 *   response so downstream agents see the source.
 *
 * KV layout (all in TENSORFEED_CACHE):
 *   cve:record:{CVE-ID}            full v5.2 record, 7-day TTL
 *   cve:recent                     ring buffer of last 200 CVE IDs (no TTL)
 *   cve:by-date:{YYYY-MM-DD}       array of CVE IDs published that UTC day
 *   cve:by-date:index              ordered date list (no TTL, capped 730d)
 *   cve:meta                       last cron run metadata (no TTL)
 */

import type { Env } from './types';

const MITRE_CVE_BASE = 'https://cveawg.mitre.org/api/cve';
const GITHUB_API_BASE = 'https://api.github.com/repos/CVEProject/cvelistV5';

const CVE_RECORD_KEY = (id: string) => `cve:record:${id}`;
const CVE_RECORD_TTL = 7 * 24 * 60 * 60;
const CVE_RECENT_KEY = 'cve:recent';
const CVE_RECENT_CAP = 200;
const CVE_BY_DATE_KEY = (date: string) => `cve:by-date:${date}`;
const CVE_BY_DATE_INDEX = 'cve:by-date:index';
const CVE_META_KEY = 'cve:meta';
const INDEX_CAP_DAYS = 730;

const CVE_ID_RE = /^CVE-\d{4}-\d{4,7}$/i;
const CVE_FILE_RE = /cves\/\d{4}\/\d+x?x?x?x?\/(CVE-\d{4}-\d{4,7})\.json$/i;

const ATTRIBUTION = {
  source: 'MITRE CVE List',
  source_url: 'https://www.cve.org',
  license: 'MITRE CVE Terms of Use',
  redistribution: 'commercial-permitted',
  notice:
    'Use of CVE Record data is subject to MITRE CVE Terms of Use. https://www.cve.org/Legal/TermsOfUse',
};

export interface CVEFetchResult {
  ok: boolean;
  cveId: string;
  source: 'cache' | 'live' | 'not_found';
  record: unknown | null;
  fetched_at: string;
  attribution: typeof ATTRIBUTION;
  error?: string;
}

/**
 * Normalize a user-supplied CVE id to the canonical UPPERCASE form.
 * Accepts inputs like 'cve-2024-3094', 'CVE-2024-3094'.
 */
export function normalizeCVEId(input: string): string | null {
  if (!input) return null;
  const trimmed = input.trim().toUpperCase();
  if (!CVE_ID_RE.test(trimmed)) return null;
  return trimmed;
}

export async function fetchCVE(env: Env, cveId: string): Promise<CVEFetchResult> {
  const fetched_at = new Date().toISOString();
  const id = normalizeCVEId(cveId);
  if (!id) {
    return {
      ok: false,
      cveId,
      source: 'not_found',
      record: null,
      fetched_at,
      attribution: ATTRIBUTION,
      error: 'invalid_cve_id',
    };
  }

  const cached = await env.TENSORFEED_CACHE.get<unknown>(CVE_RECORD_KEY(id), 'json');
  if (cached) {
    return { ok: true, cveId: id, source: 'cache', record: cached, fetched_at, attribution: ATTRIBUTION };
  }

  let resp: Response;
  try {
    resp = await fetch(`${MITRE_CVE_BASE}/${id}`, {
      headers: { 'User-Agent': 'TensorFeed/1.0 (https://tensorfeed.ai)' },
      signal: AbortSignal.timeout(10000),
    });
  } catch (e) {
    return {
      ok: false,
      cveId: id,
      source: 'not_found',
      record: null,
      fetched_at,
      attribution: ATTRIBUTION,
      error: `mitre_fetch_failed: ${e instanceof Error ? e.message : String(e)}`,
    };
  }

  if (resp.status === 404) {
    return {
      ok: false,
      cveId: id,
      source: 'not_found',
      record: null,
      fetched_at,
      attribution: ATTRIBUTION,
      error: 'cve_not_found',
    };
  }
  if (!resp.ok) {
    return {
      ok: false,
      cveId: id,
      source: 'not_found',
      record: null,
      fetched_at,
      attribution: ATTRIBUTION,
      error: `mitre_http_${resp.status}`,
    };
  }

  let record: unknown;
  try {
    record = await resp.json();
  } catch (e) {
    return {
      ok: false,
      cveId: id,
      source: 'not_found',
      record: null,
      fetched_at,
      attribution: ATTRIBUTION,
      error: 'mitre_invalid_json',
    };
  }

  await env.TENSORFEED_CACHE.put(CVE_RECORD_KEY(id), JSON.stringify(record), {
    expirationTtl: CVE_RECORD_TTL,
  });

  return { ok: true, cveId: id, source: 'live', record, fetched_at, attribution: ATTRIBUTION };
}

export interface CVEListEntry {
  cveId: string;
  added_at: string;
  github_path: string;
}

export interface RecentCaptureResult {
  ok: boolean;
  newly_seen: number;
  scanned_commits: number;
  duration_ms: number;
  error?: string;
}

interface GitHubCommitFile {
  filename?: string;
  status?: string;
}

interface GitHubCommit {
  sha: string;
  commit: { committer?: { date?: string } };
  files?: GitHubCommitFile[];
}

/**
 * Walk recent commits on the cvelistV5 main branch and harvest CVE IDs
 * from added/modified file paths. Idempotent across runs because we
 * upsert into a deduped ring + a deduped per-date set.
 *
 * Authenticated via GITHUB_TOKEN (5000 req/h). One commits-list call
 * plus one per-commit detail call per commit. Cap the scan at 50 commits
 * per cron run to bound subrequest count.
 */
export async function captureRecentCVEs(
  env: Env,
  now: Date = new Date(),
): Promise<RecentCaptureResult> {
  const startedAt = Date.now();
  const since = new Date(now.getTime() - 36 * 60 * 60 * 1000).toISOString();
  const headers: Record<string, string> = {
    'User-Agent': 'TensorFeed/1.0 (https://tensorfeed.ai)',
    Accept: 'application/vnd.github+json',
    'X-GitHub-Api-Version': '2022-11-28',
  };
  if (env.GITHUB_TOKEN) headers.Authorization = `Bearer ${env.GITHUB_TOKEN}`;

  let listResp: Response;
  try {
    listResp = await fetch(
      `${GITHUB_API_BASE}/commits?per_page=50&since=${encodeURIComponent(since)}`,
      { headers, signal: AbortSignal.timeout(15000) },
    );
  } catch (e) {
    return {
      ok: false,
      newly_seen: 0,
      scanned_commits: 0,
      duration_ms: Date.now() - startedAt,
      error: `commits_list_failed: ${e instanceof Error ? e.message : String(e)}`,
    };
  }
  if (!listResp.ok) {
    return {
      ok: false,
      newly_seen: 0,
      scanned_commits: 0,
      duration_ms: Date.now() - startedAt,
      error: `commits_list_http_${listResp.status}`,
    };
  }

  const commits = (await listResp.json()) as GitHubCommit[];
  let scanned = 0;
  const seenIds = new Set<string>();
  const byDate = new Map<string, Set<string>>();

  for (const c of commits) {
    if (scanned >= 50) break;
    scanned += 1;
    let detailResp: Response;
    try {
      detailResp = await fetch(`${GITHUB_API_BASE}/commits/${c.sha}`, {
        headers,
        signal: AbortSignal.timeout(15000),
      });
    } catch {
      continue;
    }
    if (!detailResp.ok) continue;
    const detail = (await detailResp.json()) as GitHubCommit;
    const commitDate = detail.commit?.committer?.date ?? c.commit?.committer?.date ?? now.toISOString();
    const dayKey = commitDate.slice(0, 10);
    for (const f of detail.files ?? []) {
      if (!f.filename || (f.status !== 'added' && f.status !== 'modified')) continue;
      const m = f.filename.match(CVE_FILE_RE);
      if (!m) continue;
      const id = m[1].toUpperCase();
      seenIds.add(id);
      let bucket = byDate.get(dayKey);
      if (!bucket) {
        bucket = new Set();
        byDate.set(dayKey, bucket);
      }
      bucket.add(id);
    }
  }

  if (seenIds.size === 0) {
    await env.TENSORFEED_CACHE.put(
      CVE_META_KEY,
      JSON.stringify({ last_run: now.toISOString(), newly_seen: 0, scanned_commits: scanned }),
    );
    return {
      ok: true,
      newly_seen: 0,
      scanned_commits: scanned,
      duration_ms: Date.now() - startedAt,
    };
  }

  const existingRecent = (await env.TENSORFEED_CACHE.get<string[]>(CVE_RECENT_KEY, 'json')) ?? [];
  const recentSet = new Set(existingRecent);
  for (const id of seenIds) recentSet.add(id);
  const recent = Array.from(recentSet);
  recent.sort((a, b) => b.localeCompare(a));
  const cappedRecent = recent.slice(0, CVE_RECENT_CAP);
  await env.TENSORFEED_CACHE.put(CVE_RECENT_KEY, JSON.stringify(cappedRecent));

  const indexList =
    (await env.TENSORFEED_CACHE.get<string[]>(CVE_BY_DATE_INDEX, 'json')) ?? [];
  const indexSet = new Set(indexList);
  for (const [date, ids] of byDate.entries()) {
    const existing = (await env.TENSORFEED_CACHE.get<string[]>(CVE_BY_DATE_KEY(date), 'json')) ?? [];
    const combined = new Set(existing);
    for (const id of ids) combined.add(id);
    const merged = Array.from(combined).sort();
    await env.TENSORFEED_CACHE.put(CVE_BY_DATE_KEY(date), JSON.stringify(merged));
    indexSet.add(date);
  }
  const indexArr = Array.from(indexSet).sort();
  while (indexArr.length > INDEX_CAP_DAYS) indexArr.shift();
  await env.TENSORFEED_CACHE.put(CVE_BY_DATE_INDEX, JSON.stringify(indexArr));

  await env.TENSORFEED_CACHE.put(
    CVE_META_KEY,
    JSON.stringify({
      last_run: now.toISOString(),
      newly_seen: seenIds.size,
      scanned_commits: scanned,
    }),
  );

  return {
    ok: true,
    newly_seen: seenIds.size,
    scanned_commits: scanned,
    duration_ms: Date.now() - startedAt,
  };
}

export async function readRecentCVEs(
  env: Env,
  limit = 50,
): Promise<{ ids: string[]; meta: unknown | null }> {
  const ids = (await env.TENSORFEED_CACHE.get<string[]>(CVE_RECENT_KEY, 'json')) ?? [];
  const meta = await env.TENSORFEED_CACHE.get<unknown>(CVE_META_KEY, 'json');
  return { ids: ids.slice(0, Math.max(1, Math.min(limit, 200))), meta };
}

export async function readCVEsByDate(
  env: Env,
  date: string,
): Promise<string[]> {
  return (await env.TENSORFEED_CACHE.get<string[]>(CVE_BY_DATE_KEY(date), 'json')) ?? [];
}

export async function listCVEDates(env: Env): Promise<string[]> {
  return (await env.TENSORFEED_CACHE.get<string[]>(CVE_BY_DATE_INDEX, 'json')) ?? [];
}

export const CVE_ATTRIBUTION = ATTRIBUTION;
