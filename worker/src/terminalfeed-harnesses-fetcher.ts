/**
 * TerminalFeed coding-harness fetcher.
 *
 * Third AFTA federation cross-call (after ai-velocity).
 * Pulls TerminalFeed's /api/harnesses leaderboard (agentic-coding
 * harnesses + benchmarks: SWE-bench Verified, Terminal-Bench, Aider
 * Polyglot, SWE-Lancer) and snapshots it daily to KV so we can compute
 * weekly deltas in the premium derivation.
 *
 * Upstream shape:
 *   GET https://terminalfeed.io/api/harnesses
 *     -> { generatedAt, schemaVersion,
 *          benchmarks: [{
 *            id,
 *            results: [{ id, harness, model, score, reportedAt, sourceUrl }]
 *          }] }
 *
 * Free /api/coding-harnesses/latest serves the current cached snapshot
 * with TF attribution. Free /api/coding-harnesses/dates returns the
 * ordered index of historical snapshot dates. Paid
 * /api/premium/coding-harnesses/weekly-deltas (1 credit) compares
 * current to N-days-ago snapshot, surfacing score deltas, rank churn,
 * entered/exited combinations, and biggest movers per benchmark.
 *
 * Refresh: daily at 25 5 UTC (between BLS 0 5 and FRED 30 5).
 *
 * KV layout:
 *   tf-harnesses:current             latest snapshot
 *   tf-harnesses:daily:{YYYY-MM-DD}  dated copy
 *   tf-harnesses:index               ordered date list (capped at 365)
 *
 * License: TerminalFeed compiles its harness leaderboard from public
 * benchmark sources (sourceUrl on every result). Federation cross-call.
 */

import type { Env } from './types';

const TERMINALFEED_HARNESSES_URL = 'https://terminalfeed.io/api/harnesses';
const POLITE_UA = 'tensorfeed-federation/1.0 (mailto:evan@tensorfeed.ai; +https://tensorfeed.ai)';
const FETCH_TIMEOUT_MS = 12_000;

export const TF_HARNESSES_CURRENT_KEY = 'tf-harnesses:current';
export const TF_HARNESSES_INDEX_KEY = 'tf-harnesses:index';
export const TF_HARNESSES_DAILY_KEY_PREFIX = 'tf-harnesses:daily:';

// ── Upstream shape ─────────────────────────────────────────────────

interface UpstreamHarnessResult {
  id?: string;
  harness?: string;
  model?: string;
  score?: number;
  reportedAt?: string;
  sourceUrl?: string;
}

interface UpstreamBenchmark {
  id?: string;
  results?: UpstreamHarnessResult[];
}

interface UpstreamHarnessesResponse {
  generatedAt?: string;
  schemaVersion?: string | number;
  benchmarks?: UpstreamBenchmark[];
}

// ── Normalized shape ───────────────────────────────────────────────

export interface HarnessResult {
  id: string;
  harness: string;
  model: string;
  score: number;
  reported_at: string;
  source_url: string;
}

export interface BenchmarkSnapshot {
  id: string;
  results: HarnessResult[];
}

export interface HarnessSnapshot {
  capturedAt: string;
  source: 'terminalfeed.io';
  upstream_generated_at: string;
  upstream_schema_version: string;
  source_license: 'Federation cross-call to TerminalFeed (free public endpoint). Underlying benchmark scores carry per-result source_url for verification.';
  benchmark_count: number;
  total_results: number;
  benchmarks: BenchmarkSnapshot[];
}

// ── Normalize ──────────────────────────────────────────────────────

export function normalizeResult(r: UpstreamHarnessResult): HarnessResult | null {
  if (!r.harness || !r.model || typeof r.score !== 'number') return null;
  return {
    id: typeof r.id === 'string' ? r.id : `${r.harness}__${r.model}`,
    harness: r.harness,
    model: r.model,
    score: r.score,
    reported_at: typeof r.reportedAt === 'string' ? r.reportedAt : '',
    source_url: typeof r.sourceUrl === 'string' ? r.sourceUrl : '',
  };
}

export function normalizeBenchmark(b: UpstreamBenchmark): BenchmarkSnapshot | null {
  if (!b.id || typeof b.id !== 'string') return null;
  const results: HarnessResult[] = [];
  for (const r of b.results ?? []) {
    const n = normalizeResult(r);
    if (n) results.push(n);
  }
  // Sort by score desc so rank-1 is at the top.
  results.sort((a, b) => b.score - a.score);
  return { id: b.id, results };
}

// ── Fetch ──────────────────────────────────────────────────────────

async function fetchWithTimeout(url: string, init: RequestInit, ms = FETCH_TIMEOUT_MS): Promise<Response> {
  const controller = new AbortController();
  const id = setTimeout(() => controller.abort(), ms);
  try {
    return await fetch(url, { ...init, signal: controller.signal });
  } finally {
    clearTimeout(id);
  }
}

/**
 * Refresh the TerminalFeed harness snapshot. Called from cron.
 */
export async function refreshHarnessSnapshot(env: Env): Promise<HarnessSnapshot | null> {
  let body: UpstreamHarnessesResponse;
  try {
    const res = await fetchWithTimeout(TERMINALFEED_HARNESSES_URL, {
      headers: { 'User-Agent': POLITE_UA, Accept: 'application/json' },
    });
    if (!res.ok) return null;
    body = (await res.json()) as UpstreamHarnessesResponse;
  } catch {
    return null;
  }

  const benchmarks: BenchmarkSnapshot[] = [];
  let total_results = 0;
  for (const b of body.benchmarks ?? []) {
    const n = normalizeBenchmark(b);
    if (n) {
      benchmarks.push(n);
      total_results += n.results.length;
    }
  }

  if (benchmarks.length === 0) return null;

  const snapshot: HarnessSnapshot = {
    capturedAt: new Date().toISOString(),
    source: 'terminalfeed.io',
    upstream_generated_at: typeof body.generatedAt === 'string' ? body.generatedAt : '',
    upstream_schema_version: body.schemaVersion !== undefined ? String(body.schemaVersion) : '',
    source_license: 'Federation cross-call to TerminalFeed (free public endpoint). Underlying benchmark scores carry per-result source_url for verification.',
    benchmark_count: benchmarks.length,
    total_results,
    benchmarks,
  };

  const dateKey = snapshot.capturedAt.slice(0, 10);
  await env.TENSORFEED_CACHE.put(TF_HARNESSES_CURRENT_KEY, JSON.stringify(snapshot));
  await env.TENSORFEED_CACHE.put(`${TF_HARNESSES_DAILY_KEY_PREFIX}${dateKey}`, JSON.stringify(snapshot));

  const idxRaw = (await env.TENSORFEED_CACHE.get(TF_HARNESSES_INDEX_KEY, 'json')) as string[] | null;
  const dates = idxRaw ?? [];
  if (!dates.includes(dateKey)) {
    dates.push(dateKey);
    dates.sort();
    await env.TENSORFEED_CACHE.put(TF_HARNESSES_INDEX_KEY, JSON.stringify(dates.slice(-365)));
  }
  return snapshot;
}

export async function getHarnessSnapshot(env: Env): Promise<HarnessSnapshot | null> {
  return (await env.TENSORFEED_CACHE.get(TF_HARNESSES_CURRENT_KEY, 'json')) as HarnessSnapshot | null;
}

export async function getHarnessSnapshotAtDate(env: Env, dateKey: string): Promise<HarnessSnapshot | null> {
  return (await env.TENSORFEED_CACHE.get(`${TF_HARNESSES_DAILY_KEY_PREFIX}${dateKey}`, 'json')) as HarnessSnapshot | null;
}

export async function getHarnessDatesIndex(env: Env): Promise<string[]> {
  const idx = (await env.TENSORFEED_CACHE.get(TF_HARNESSES_INDEX_KEY, 'json')) as string[] | null;
  return idx ?? [];
}

/**
 * Resolve the dated snapshot at-or-before the requested days-back offset.
 * Walks the dates index backwards to find the closest snapshot that's
 * at least `daysBack` days older than the current snapshot. Returns null
 * when no such snapshot exists (e.g. early days after deploy).
 */
export async function findPriorSnapshot(
  env: Env,
  current: HarnessSnapshot,
  daysBack: number,
): Promise<HarnessSnapshot | null> {
  const idx = await getHarnessDatesIndex(env);
  if (idx.length === 0) return null;
  const currentMs = new Date(current.capturedAt).getTime();
  const cutoffMs = currentMs - daysBack * 24 * 60 * 60 * 1000;
  // Sort descending so we walk most-recent-first.
  const desc = [...idx].sort((a, b) => b.localeCompare(a));
  for (const date of desc) {
    const ms = new Date(`${date}T00:00:00Z`).getTime();
    if (Number.isFinite(ms) && ms <= cutoffMs) {
      const snap = await getHarnessSnapshotAtDate(env, date);
      if (snap) return snap;
    }
  }
  return null;
}
