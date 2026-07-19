/**
 * Time Machine: point-in-time replay of the AI stack
 * (specs/moat-wave-20.md Feature B).
 *
 * TensorFeed has captured dated daily snapshots since late April 2026:
 * model pricing, model catalogs, benchmarks, provider status, the news
 * corpus with clusters, GPU pricing, and KEV additions. Those dated
 * keys are unforkable: a competitor starting today starts at day zero.
 * This module monetizes that corpus directly: "what did X look like on
 * date D" in one call.
 *
 * Pure read layer. No new writes, no new crons; every domain maps onto
 * key families that already exist and already have date indexes:
 *
 *   pricing | models | benchmarks | status  -> history:{date}:{type} via
 *                                              readHistory / history:index
 *   news                                    -> news:daily:{date} +
 *                                              news:cluster:index:{date}
 *   gpu                                     -> gpu:daily:{date} / gpu:index
 *   kev                                     -> kev:added:{date} / kev:added:index
 *
 * Historical dates are immutable, so the premium routes ride behind the
 * Cache API at the route layer and repeated reads of popular dates cost
 * near-zero KV. A missing date is an AFTA empty_result no-charge whose
 * error body carries the domain's real coverage range: a failed call is
 * a sales pitch for the range that exists.
 */

import type { Env } from './types';
import { readHistory, listHistory, type HistoryType } from './history';
import { readNewsDaily } from './news-history';
import { readClustersForDate } from './news-clustering';
import { readKEVAddedOnDate, listKEVAddedDates } from './security-kev';
import { listIndexedDates as listGpuDates } from './gpu-pricing';

export const TIME_MACHINE_DOMAINS = [
  'pricing',
  'models',
  'benchmarks',
  'status',
  'news',
  'gpu',
  'kev',
] as const;

export type TimeMachineDomain = (typeof TIME_MACHINE_DOMAINS)[number];

export function isTimeMachineDomain(s: string): s is TimeMachineDomain {
  return (TIME_MACHINE_DOMAINS as readonly string[]).includes(s);
}

export interface DomainCoverage {
  from: string | null;
  to: string | null;
  days: number;
}

export interface TimeMachineCoverage {
  ok: true;
  domains: Record<TimeMachineDomain, DomainCoverage>;
  note: string;
}

export interface DomainReadHit {
  ok: true;
  domain: TimeMachineDomain;
  as_of: string;
  captured_at: string | null;
  snapshot: unknown;
}

export interface DomainReadMiss {
  ok: false;
  domain: TimeMachineDomain;
  as_of: string;
  coverage: DomainCoverage;
}

export type DomainRead = DomainReadHit | DomainReadMiss;

const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;

export function isValidTimeMachineDate(date: string, now: Date = new Date()): boolean {
  if (!DATE_RE.test(date)) return false;
  const parsed = Date.parse(`${date}T00:00:00Z`);
  if (Number.isNaN(parsed)) return false;
  // Reject future dates; today is allowed (some crons have already run).
  return date <= now.toISOString().slice(0, 10);
}

function coverageFromDates(dates: string[]): DomainCoverage {
  const valid = dates.filter((d) => DATE_RE.test(d));
  if (valid.length === 0) return { from: null, to: null, days: 0 };
  let min = valid[0];
  let max = valid[0];
  for (const d of valid) {
    if (d < min) min = d;
    if (d > max) max = d;
  }
  return { from: min, to: max, days: valid.length };
}

async function historyDates(env: Env): Promise<string[]> {
  const listing = await listHistory(env);
  return listing.dates;
}

async function newsDates(env: Env): Promise<string[]> {
  return (await env.TENSORFEED_CACHE.get<string[]>('news:daily:index', 'json')) ?? [];
}

/**
 * Per-domain coverage. The four history-backed domains share one index
 * (they are captured by the same cron), so this costs 4 KV reads total,
 * and the route caches the result for an hour.
 */
export async function getTimeMachineCoverage(env: Env): Promise<TimeMachineCoverage> {
  const [history, news, gpu, kev] = await Promise.all([
    historyDates(env),
    newsDates(env),
    listGpuDates(env),
    listKEVAddedDates(env),
  ]);
  const historyCoverage = coverageFromDates(history);
  return {
    ok: true,
    domains: {
      pricing: historyCoverage,
      models: historyCoverage,
      benchmarks: historyCoverage,
      status: historyCoverage,
      news: coverageFromDates(news),
      gpu: coverageFromDates(gpu),
      kev: coverageFromDates(kev),
    },
    note: 'Daily capture running since 2026-04. Coverage only grows; historical dates are immutable. Missing dates inside a range mean that day\'s capture did not run or was unhealthy.',
  };
}

async function coverageForDomain(env: Env, domain: TimeMachineDomain): Promise<DomainCoverage> {
  switch (domain) {
    case 'pricing':
    case 'models':
    case 'benchmarks':
    case 'status':
      return coverageFromDates(await historyDates(env));
    case 'news':
      return coverageFromDates(await newsDates(env));
    case 'gpu':
      return coverageFromDates(await listGpuDates(env));
    case 'kev':
      return coverageFromDates(await listKEVAddedDates(env));
  }
}

function extractCapturedAt(payload: unknown): string | null {
  if (payload && typeof payload === 'object') {
    const p = payload as Record<string, unknown>;
    if (typeof p.capturedAt === 'string') return p.capturedAt;
    if (typeof p.captured_at === 'string') return p.captured_at;
  }
  return null;
}

/**
 * Read one domain's snapshot for one date. A miss returns the domain's
 * live coverage so the caller (and the paying agent) sees what range
 * DOES exist. KEV nuance: a date inside coverage with zero added CVEs
 * is a legitimate answer ("nothing was added that day"), not a miss;
 * dates outside the index are misses.
 */
export async function readTimeMachineDomain(
  env: Env,
  domain: TimeMachineDomain,
  date: string,
): Promise<DomainRead> {
  switch (domain) {
    case 'pricing':
    case 'models':
    case 'benchmarks':
    case 'status': {
      const snap = await readHistory(env, date, domain as HistoryType);
      if (!snap) {
        return { ok: false, domain, as_of: date, coverage: await coverageForDomain(env, domain) };
      }
      return {
        ok: true,
        domain,
        as_of: date,
        captured_at: extractCapturedAt(snap),
        snapshot: snap,
      };
    }
    case 'news': {
      const snap = await readNewsDaily(env, date);
      if (!snap) {
        return { ok: false, domain, as_of: date, coverage: await coverageForDomain(env, domain) };
      }
      const clusters = await readClustersForDate(env, date);
      return {
        ok: true,
        domain,
        as_of: date,
        captured_at: extractCapturedAt(snap),
        snapshot: { ...snap, clusters },
      };
    }
    case 'gpu': {
      const snap = await env.TENSORFEED_CACHE.get(`gpu:daily:${date}`, 'json');
      if (!snap) {
        return { ok: false, domain, as_of: date, coverage: await coverageForDomain(env, domain) };
      }
      return {
        ok: true,
        domain,
        as_of: date,
        captured_at: extractCapturedAt(snap),
        snapshot: snap,
      };
    }
    case 'kev': {
      const dates = await listKEVAddedDates(env);
      if (!dates.includes(date)) {
        return { ok: false, domain, as_of: date, coverage: coverageFromDates(dates) };
      }
      const entries = await readKEVAddedOnDate(env, date);
      return {
        ok: true,
        domain,
        as_of: date,
        captured_at: `${date}T23:59:59Z`,
        snapshot: { date, added_count: entries.length, entries },
      };
    }
  }
}

export interface TimeMachineAllResult {
  as_of: string;
  resolved: number;
  partial: boolean;
  domains: Partial<Record<TimeMachineDomain, unknown>>;
  missing: { domain: TimeMachineDomain; coverage: DomainCoverage }[];
  captured_at: string | null;
}

/**
 * The composite envelope: every domain for one date in one call. The
 * route charges only when at least MIN_DOMAINS_FOR_CHARGE domains
 * resolve; below that the whole call is an empty_result no-charge.
 * captured_at for the receipt is the LATEST per-domain capture time,
 * i.e. the envelope is "as fresh as its freshest member" for audit
 * purposes; per-domain times ride inside each snapshot.
 */
export const MIN_DOMAINS_FOR_CHARGE = 3;

export async function readTimeMachineAll(env: Env, date: string): Promise<TimeMachineAllResult> {
  const reads = await Promise.all(
    TIME_MACHINE_DOMAINS.map((d) => readTimeMachineDomain(env, d, date)),
  );
  const domains: Partial<Record<TimeMachineDomain, unknown>> = {};
  const missing: { domain: TimeMachineDomain; coverage: DomainCoverage }[] = [];
  let capturedAt: string | null = null;
  for (const r of reads) {
    if (r.ok) {
      domains[r.domain] = r.snapshot;
      if (r.captured_at && (!capturedAt || r.captured_at > capturedAt)) {
        capturedAt = r.captured_at;
      }
    } else {
      missing.push({ domain: r.domain, coverage: r.coverage });
    }
  }
  const resolved = Object.keys(domains).length;
  return {
    as_of: date,
    resolved,
    partial: missing.length > 0,
    domains,
    missing,
    captured_at: capturedAt,
  };
}
