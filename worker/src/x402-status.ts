/**
 * x402 publisher status / SLA monitor.
 *
 * Hourly cron walks the list of known x402 publishers, fetches their
 * /.well-known/x402.json manifest, and records:
 *   - whether the manifest is reachable
 *   - whether it parses as canonical Coinbase V2 shape
 *   - fetch latency
 *   - timestamp of the check
 *
 * Results are stored in KV per-publisher with a rolling 7-day series
 * so the public dashboard can show "live now" plus "uptime over last
 * N days" for each publisher.
 *
 * Source of publishers: the editorial x402-adopters catalog
 * (/api/x402-adopters) which we already maintain. Future versions can
 * fold in the live x402-registry crawl too.
 *
 * Why this exists: TF is one of the few neutral parties in the x402
 * ecosystem who can run reliable status monitoring (we don't compete
 * with the publishers, we just observe). The dashboard becomes the
 * citation source for "which x402 publishers are reliable" questions
 * from agent operators, builders, and the press.
 */

import type { Env } from './types';
import { safePut } from './kill-switch';

const STATUS_PREFIX = 'x402-status:';
const STATUS_CURRENT = (domain: string) => `${STATUS_PREFIX}current:${domain}`;
const STATUS_SERIES = (domain: string) => `${STATUS_PREFIX}series:${domain}`;
const STATUS_INDEX = `${STATUS_PREFIX}index`;
const FETCH_TIMEOUT_MS = 8_000;
const SERIES_KEEP_DAYS = 7;
const SERIES_MAX_POINTS = 7 * 24 + 12; // hourly checks for a week plus buffer
const TTL_DAYS = 14;

export type StatusOutcome = 'ok' | 'manifest_malformed' | 'unreachable' | 'timeout' | 'http_error';

export interface StatusCheckResult {
  domain: string;
  checked_at: string;
  outcome: StatusOutcome;
  latency_ms: number;
  http_status?: number;
  x402_version?: number | null;
  accepts_count?: number;
  reason?: string;
}

export interface PublisherStatusRecord {
  domain: string;
  current: StatusCheckResult;
  series: StatusCheckResult[];
  uptime_pct_24h: number;
  uptime_pct_7d: number;
}

interface AdopterEntry {
  org?: string;
  domain?: string;
  endpoint?: string;
}

interface AdoptersResponse {
  adopters?: AdopterEntry[];
}

function deriveDomain(entry: AdopterEntry): string | null {
  const candidate = entry.domain || entry.endpoint || '';
  if (!candidate) return null;
  try {
    const url = new URL(candidate.startsWith('http') ? candidate : `https://${candidate}`);
    return url.hostname.toLowerCase();
  } catch {
    return null;
  }
}

/**
 * Probe one publisher's x402 manifest. Returns a structured check
 * result; never throws.
 */
async function checkPublisher(domain: string): Promise<StatusCheckResult> {
  const start = Date.now();
  const url = `https://${domain}/.well-known/x402.json`;
  try {
    const res = await fetch(url, {
      method: 'GET',
      headers: {
        Accept: 'application/json',
        'User-Agent': 'tensorfeed-x402-monitor/1.0',
      },
      signal: AbortSignal.timeout(FETCH_TIMEOUT_MS),
      redirect: 'manual',
    });
    const latency = Date.now() - start;
    if (!res.ok) {
      return {
        domain,
        checked_at: new Date().toISOString(),
        outcome: 'http_error',
        latency_ms: latency,
        http_status: res.status,
        reason: `HTTP ${res.status}`,
      };
    }
    let parsed: unknown;
    try {
      parsed = await res.json();
    } catch {
      return {
        domain,
        checked_at: new Date().toISOString(),
        outcome: 'manifest_malformed',
        latency_ms: latency,
        http_status: res.status,
        reason: 'response is not valid JSON',
      };
    }
    const obj = parsed as Record<string, unknown> | undefined;
    const x402Version = typeof obj?.x402Version === 'number' ? (obj.x402Version as number) : null;
    const acceptsRaw = obj?.accepts;
    const acceptsCount = Array.isArray(acceptsRaw) ? acceptsRaw.length : 0;
    if (x402Version !== 2 || acceptsCount === 0) {
      return {
        domain,
        checked_at: new Date().toISOString(),
        outcome: 'manifest_malformed',
        latency_ms: latency,
        http_status: res.status,
        x402_version: x402Version,
        accepts_count: acceptsCount,
        reason: 'manifest missing x402Version:2 or accepts[] array',
      };
    }
    return {
      domain,
      checked_at: new Date().toISOString(),
      outcome: 'ok',
      latency_ms: latency,
      http_status: res.status,
      x402_version: x402Version,
      accepts_count: acceptsCount,
    };
  } catch (e) {
    const latency = Date.now() - start;
    const msg = e instanceof Error ? e.message : String(e);
    if (msg.includes('TimeoutError') || msg.includes('timed out')) {
      return {
        domain,
        checked_at: new Date().toISOString(),
        outcome: 'timeout',
        latency_ms: latency,
        reason: `fetch timed out after ${FETCH_TIMEOUT_MS}ms`,
      };
    }
    return {
      domain,
      checked_at: new Date().toISOString(),
      outcome: 'unreachable',
      latency_ms: latency,
      reason: msg.slice(0, 200),
    };
  }
}

async function readSeries(env: Env, domain: string): Promise<StatusCheckResult[]> {
  try {
    const raw = await env.TENSORFEED_CACHE.get(STATUS_SERIES(domain));
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    if (Array.isArray(parsed)) return parsed.filter((p) => p && typeof p === 'object') as StatusCheckResult[];
  } catch {
    /* ignore */
  }
  return [];
}

function uptimePct(series: StatusCheckResult[], windowMs: number): number {
  const cutoff = Date.now() - windowMs;
  let total = 0;
  let ok = 0;
  for (const r of series) {
    const ts = Date.parse(r.checked_at);
    if (!Number.isFinite(ts) || ts < cutoff) continue;
    total += 1;
    if (r.outcome === 'ok') ok += 1;
  }
  if (total === 0) return 0;
  return Math.round((ok / total) * 1000) / 10; // one decimal place
}

/**
 * Cron handler. Fetches the editorial adopters catalog, probes each
 * one in parallel (bounded), and writes results. Best-effort; one
 * slow publisher should not stall the others.
 */
export async function runX402StatusCheck(env: Env, origin: string = 'https://tensorfeed.ai'): Promise<{
  checked: number;
  ok: number;
  failed: number;
}> {
  let adopters: AdopterEntry[] = [];
  try {
    const res = await fetch(`${origin}/api/x402-adopters`, {
      headers: { Accept: 'application/json' },
      signal: AbortSignal.timeout(10_000),
    });
    if (res.ok) {
      const data = (await res.json()) as AdoptersResponse;
      if (Array.isArray(data.adopters)) adopters = data.adopters;
    }
  } catch {
    /* fall through with empty list */
  }

  const domains = new Set<string>();
  for (const a of adopters) {
    const d = deriveDomain(a);
    if (d) domains.add(d);
  }
  // Always include the federation members + TF itself even if the editorial
  // catalog drift removes them. Belt and suspenders.
  domains.add('tensorfeed.ai');
  domains.add('terminalfeed.io');

  const domainList = Array.from(domains).sort();
  const indexEntries: string[] = [];
  let okCount = 0;
  let failCount = 0;

  // Concurrency cap: 6 parallel probes is plenty since each probe is
  // bounded by FETCH_TIMEOUT_MS and most return in <500ms.
  const CONCURRENCY = 6;
  let i = 0;
  async function worker() {
    while (true) {
      const idx = i++;
      if (idx >= domainList.length) return;
      const domain = domainList[idx]!;
      const result = await checkPublisher(domain);
      indexEntries.push(domain);
      if (result.outcome === 'ok') okCount += 1;
      else failCount += 1;

      // Append to series, trim to last SERIES_MAX_POINTS
      const series = await readSeries(env, domain);
      series.push(result);
      const trimmed = series.slice(-SERIES_MAX_POINTS);
      const ttl = TTL_DAYS * 24 * 60 * 60;
      await safePut(env, env.TENSORFEED_CACHE, STATUS_CURRENT(domain), JSON.stringify(result), {
        expirationTtl: ttl,
      });
      await safePut(env, env.TENSORFEED_CACHE, STATUS_SERIES(domain), JSON.stringify(trimmed), {
        expirationTtl: ttl,
      });
    }
  }
  await Promise.all(Array.from({ length: CONCURRENCY }, () => worker()));

  // Write the index so the public endpoint can enumerate without
  // depending on KV.list (cheaper).
  await safePut(env, env.TENSORFEED_CACHE, STATUS_INDEX, JSON.stringify(indexEntries.sort()));

  return { checked: domainList.length, ok: okCount, failed: failCount };
}

/**
 * Public read handler. Returns current status + uptime stats for every
 * monitored publisher.
 */
export async function getStatusSnapshot(env: Env): Promise<{
  generated_at: string;
  publishers: PublisherStatusRecord[];
  totals: { monitored: number; ok: number; degraded: number };
}> {
  let domains: string[] = [];
  try {
    const raw = await env.TENSORFEED_CACHE.get(STATUS_INDEX);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed)) domains = parsed.filter((d) => typeof d === 'string') as string[];
    }
  } catch {
    /* ignore */
  }

  const publishers: PublisherStatusRecord[] = [];
  let okTotal = 0;
  let degradedTotal = 0;

  await Promise.all(
    domains.map(async (domain) => {
      const series = await readSeries(env, domain);
      let current: StatusCheckResult | null = null;
      try {
        const raw = await env.TENSORFEED_CACHE.get(STATUS_CURRENT(domain));
        if (raw) current = JSON.parse(raw) as StatusCheckResult;
      } catch {
        /* ignore */
      }
      if (!current && series.length > 0) current = series[series.length - 1]!;
      if (!current) return;
      const u24 = uptimePct(series, 24 * 60 * 60 * 1000);
      const u7d = uptimePct(series, 7 * 24 * 60 * 60 * 1000);
      publishers.push({ domain, current, series, uptime_pct_24h: u24, uptime_pct_7d: u7d });
      if (current.outcome === 'ok') okTotal += 1;
      else degradedTotal += 1;
    }),
  );

  publishers.sort((a, b) => a.domain.localeCompare(b.domain));

  return {
    generated_at: new Date().toISOString(),
    publishers,
    totals: { monitored: publishers.length, ok: okTotal, degraded: degradedTotal },
  };
}
