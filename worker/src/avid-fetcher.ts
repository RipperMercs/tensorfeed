/**
 * AVID (AI Vulnerability Database) fetcher + normalizer.
 *
 * Pulls recent reports from the avidml/avid-db GitHub repo (MIT, no auth
 * required, but uses GITHUB_TOKEN when present for the higher rate limit).
 * Stores the normalized snapshot in KV. Refreshed daily via cron.
 *
 * Strategy:
 *   1. List the current-year reports/ directory via the Contents API
 *   2. Take the N most-recent filenames (lexical desc == chronological,
 *      since filenames are AVID-YYYY-RNNNN.json)
 *   3. Parallel-fetch each JSON from raw.githubusercontent.com
 *   4. Normalize to TF's flat shape
 *   5. Write avid:current + avid:daily:{YYYY-MM-DD} + bump avid:index
 *
 * Free   /api/ai-safety/incidents/avid           : raw normalized snapshot
 * Paid   /api/premium/ai-safety/incidents/exposure : derived exposure metrics
 *
 * Volume: ~50 recent reports per refresh. AVID has CI publishing on the
 * upstream side; growth in 2026 is fast (700+ new reports/year), so
 * 50 covers roughly the last 3-4 weeks.
 *
 * License: MIT (repo-wide). Attribution shipped on every response.
 */

import type { Env } from './types';

const AVID_REPO = 'avidml/avid-db';
const POLITE_UA = 'tensorfeed-research/1.0 (mailto:evan@tensorfeed.ai; +https://tensorfeed.ai)';
const FETCH_TIMEOUT_MS = 20_000;

export const AVID_CURRENT_KEY = 'avid:current';
export const AVID_INDEX_KEY = 'avid:index';
export const AVID_DAILY_KEY_PREFIX = 'avid:daily:';
export const AVID_FETCH_LIMIT = 50;

// ── Upstream AVID shape (loose; we accept missing fields) ──────────

interface UpstreamAvidEntry {
  data_type?: string;
  data_version?: string;
  metadata?: { report_id?: string };
  affects?: {
    developer?: string[];
    deployer?: string[];
    artifacts?: Array<{ type?: string; name?: string }>;
  };
  problemtype?: {
    classof?: string;
    type?: string;
    description?: { lang?: string; value?: string };
  };
  metrics?: Array<{ scorer?: string; metrics?: string; value?: number }>;
  references?: Array<{ type?: string; label?: string; url?: string }>;
  description?: { lang?: string; value?: string };
  impact?: {
    avid?: {
      vuln_id?: string;
      risk_domain?: string[];
      sep_view?: string[];
      lifecycle_view?: string[];
      taxonomy_version?: string;
    };
  };
  credit?: Array<{ lang?: string; value?: string }>;
  reported_date?: string;
}

// ── Normalized TF shape ────────────────────────────────────────────

export interface AvidArtifact {
  type: string;
  name: string;
}

export interface AvidReference {
  type: string;
  label: string;
  url: string;
}

export interface AvidMetric {
  scorer: string;
  metric: string;
  value: number;
}

export interface AvidEntry {
  report_id: string;
  data_version: string;
  reported_date: string;
  developers: string[];
  deployers: string[];
  artifacts: AvidArtifact[];
  problem_class: string;
  problem_type: string;
  description: string;
  risk_domains: string[];
  sep_view: string[];
  lifecycle_view: string[];
  taxonomy_version: string;
  metrics: AvidMetric[];
  references: AvidReference[];
  credit: string[];
  avid_url: string;
}

export interface AvidSnapshot {
  capturedAt: string;
  source: 'avidml/avid-db';
  source_license: 'MIT';
  fetch_limit: number;
  entries_count: number;
  entries: AvidEntry[];
}

/**
 * Normalize one upstream entry. Defensive against missing fields — the
 * AVID schema has versioned drift across 2022-2026 entries (data_version
 * 0.1 -> 0.3.3) so we never assume any nested field is present.
 */
export function normalizeAvidEntry(raw: UpstreamAvidEntry): AvidEntry | null {
  const reportId = raw.metadata?.report_id;
  if (!reportId || typeof reportId !== 'string') return null;

  const reportedDate = raw.reported_date && typeof raw.reported_date === 'string' ? raw.reported_date : '';
  const desc = raw.description?.value ?? raw.problemtype?.description?.value ?? '';

  const developers = (raw.affects?.developer ?? []).filter((s): s is string => typeof s === 'string');
  const deployers = (raw.affects?.deployer ?? []).filter((s): s is string => typeof s === 'string');

  const artifacts: AvidArtifact[] = (raw.affects?.artifacts ?? [])
    .filter((a) => a && typeof a === 'object')
    .map((a) => ({
      type: typeof a.type === 'string' ? a.type : 'Unknown',
      name: typeof a.name === 'string' ? a.name : 'unknown',
    }));

  const metrics: AvidMetric[] = (raw.metrics ?? [])
    .filter((m) => m && typeof m === 'object')
    .map((m) => ({
      scorer: typeof m.scorer === 'string' ? m.scorer : '',
      metric: typeof m.metrics === 'string' ? m.metrics : '',
      value: typeof m.value === 'number' ? m.value : 0,
    }));

  const references: AvidReference[] = (raw.references ?? [])
    .filter((r) => r && typeof r === 'object' && typeof r.url === 'string')
    .map((r) => ({
      type: typeof r.type === 'string' ? r.type : 'source',
      label: typeof r.label === 'string' ? r.label : '',
      url: r.url as string,
    }));

  const credit = (raw.credit ?? [])
    .map((c) => (c && typeof c === 'object' && typeof c.value === 'string' ? c.value : null))
    .filter((s): s is string => s !== null);

  return {
    report_id: reportId,
    data_version: typeof raw.data_version === 'string' ? raw.data_version : 'unknown',
    reported_date: reportedDate,
    developers,
    deployers,
    artifacts,
    problem_class: typeof raw.problemtype?.classof === 'string' ? raw.problemtype.classof : '',
    problem_type: typeof raw.problemtype?.type === 'string' ? raw.problemtype.type : '',
    description: desc,
    risk_domains: (raw.impact?.avid?.risk_domain ?? []).filter((s): s is string => typeof s === 'string'),
    sep_view: (raw.impact?.avid?.sep_view ?? []).filter((s): s is string => typeof s === 'string'),
    lifecycle_view: (raw.impact?.avid?.lifecycle_view ?? []).filter((s): s is string => typeof s === 'string'),
    taxonomy_version: typeof raw.impact?.avid?.taxonomy_version === 'string' ? raw.impact.avid.taxonomy_version : '',
    metrics,
    references,
    credit,
    avid_url: `https://github.com/${AVID_REPO}/blob/main/reports/${reportId.split('-')[1] ?? new Date().getUTCFullYear()}/${reportId}.json`,
  };
}

// ── GitHub fetch helpers ───────────────────────────────────────────

interface GitHubContentsItem {
  name: string;
  path: string;
  download_url: string | null;
  type: string;
}

function ghHeaders(token: string | undefined): HeadersInit {
  const h: Record<string, string> = {
    'User-Agent': POLITE_UA,
    Accept: 'application/vnd.github+json',
    'X-GitHub-Api-Version': '2022-11-28',
  };
  if (token) h.Authorization = `Bearer ${token}`;
  return h;
}

async function fetchWithTimeout(url: string, init: RequestInit, ms = FETCH_TIMEOUT_MS): Promise<Response> {
  const controller = new AbortController();
  const id = setTimeout(() => controller.abort(), ms);
  try {
    return await fetch(url, { ...init, signal: controller.signal });
  } finally {
    clearTimeout(id);
  }
}

interface AvidEnvKey {
  GITHUB_TOKEN?: string;
}

/**
 * List the current-year AVID reports directory and return the N most-recent
 * download URLs (lexical desc == chronological).
 */
async function listRecentAvidReportUrls(env: Env, limit: number): Promise<string[]> {
  const year = new Date().getUTCFullYear();
  const token = (env as Env & AvidEnvKey).GITHUB_TOKEN;
  const url = `https://api.github.com/repos/${AVID_REPO}/contents/reports/${year}?per_page=100`;
  const res = await fetchWithTimeout(url, { headers: ghHeaders(token) });
  if (!res.ok) {
    // Fall back to last year if current-year dir doesn't exist yet (e.g. Jan).
    const fallbackUrl = `https://api.github.com/repos/${AVID_REPO}/contents/reports/${year - 1}?per_page=100`;
    const fallback = await fetchWithTimeout(fallbackUrl, { headers: ghHeaders(token) });
    if (!fallback.ok) {
      throw new Error(`AVID listing failed: ${res.status} ${res.statusText} (fallback ${fallback.status})`);
    }
    const items = (await fallback.json()) as GitHubContentsItem[];
    return pickRecentJsonUrls(items, limit);
  }
  const items = (await res.json()) as GitHubContentsItem[];
  return pickRecentJsonUrls(items, limit);
}

function pickRecentJsonUrls(items: GitHubContentsItem[], limit: number): string[] {
  return items
    .filter((it) => it.type === 'file' && it.name.endsWith('.json') && it.download_url)
    .sort((a, b) => b.name.localeCompare(a.name))
    .slice(0, limit)
    .map((it) => it.download_url as string);
}

async function fetchOne(url: string): Promise<UpstreamAvidEntry | null> {
  try {
    const res = await fetchWithTimeout(url, { headers: { 'User-Agent': POLITE_UA } });
    if (!res.ok) return null;
    return (await res.json()) as UpstreamAvidEntry;
  } catch {
    return null;
  }
}

/**
 * Refresh the AVID snapshot. Called from cron + manually via the
 * /api/refresh admin endpoint.
 */
export async function refreshAvidSnapshot(env: Env): Promise<AvidSnapshot> {
  const urls = await listRecentAvidReportUrls(env, AVID_FETCH_LIMIT);
  // Parallel batches of 10 to keep the Worker subrequest budget tame.
  const entries: AvidEntry[] = [];
  const batchSize = 10;
  for (let i = 0; i < urls.length; i += batchSize) {
    const batch = urls.slice(i, i + batchSize);
    const results = await Promise.all(batch.map(fetchOne));
    for (const raw of results) {
      if (!raw) continue;
      const normalized = normalizeAvidEntry(raw);
      if (normalized) entries.push(normalized);
    }
  }

  const snapshot: AvidSnapshot = {
    capturedAt: new Date().toISOString(),
    source: 'avidml/avid-db',
    source_license: 'MIT',
    fetch_limit: AVID_FETCH_LIMIT,
    entries_count: entries.length,
    entries,
  };

  const dateKey = snapshot.capturedAt.slice(0, 10);
  await env.TENSORFEED_CACHE.put(AVID_CURRENT_KEY, JSON.stringify(snapshot));
  await env.TENSORFEED_CACHE.put(`${AVID_DAILY_KEY_PREFIX}${dateKey}`, JSON.stringify(snapshot));

  // Update the dates index (small ordered array).
  const idxRaw = await env.TENSORFEED_CACHE.get(AVID_INDEX_KEY, 'json') as string[] | null;
  const dates = idxRaw ?? [];
  if (!dates.includes(dateKey)) {
    dates.push(dateKey);
    dates.sort();
    // Cap to ~365 dates to bound storage.
    const capped = dates.slice(-365);
    await env.TENSORFEED_CACHE.put(AVID_INDEX_KEY, JSON.stringify(capped));
  }

  return snapshot;
}

export async function getAvidSnapshot(env: Env): Promise<AvidSnapshot | null> {
  return (await env.TENSORFEED_CACHE.get(AVID_CURRENT_KEY, 'json')) as AvidSnapshot | null;
}
