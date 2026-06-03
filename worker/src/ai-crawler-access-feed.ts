// worker/src/ai-crawler-access-feed.ts
// Shared types, pure merge/stats/flip logic, and R2/KV storage helpers for the
// AI Crawler Access Map. The network crawl engine is added in a later task.

import type { Env } from './types';
import { TRACKED_BOTS } from './ai-crawler-access-bots';
import { SEED_DOMAINS } from './ai-crawler-access-seeds';
import { parseRobotsTxt, verdictForBot } from './ai-crawler-access-robots';

export type BotVerdict = 'allowed' | 'blocked' | 'partial' | 'unknown';

export interface DomainRecord {
  domain: string;
  sector: string;
  checkedAt: string;                 // ISO, real fetch time for THIS domain
  robotsStatus: number | null;       // HTTP status of robots.txt, null on fetch failure
  bots: Record<string, BotVerdict>;  // keyed by bot name from TRACKED_BOTS
  hasLlmsTxt: boolean;
  hasAiTxt: boolean;
  llmsTxtBytes: number | null;
  notes?: string;
}

export interface SectorRollup { domains: number; llmsTxt: number; }

export interface SnapshotStats {
  domainsWithData: number;                  // count of byDomain entries
  botBlockedPct: Record<string, number>;    // % blocked among KNOWN verdicts (excludes unknown)
  botAllowedPct: Record<string, number>;    // % allowed among KNOWN verdicts
  llmsTxtAdoptionPct: number;               // % of domainsWithData with hasLlmsTxt
  aiTxtAdoptionPct: number;
  bySector: Record<string, SectorRollup>;
}

export interface Snapshot {
  dataCapturedAt: string;            // oldest checkedAt across byDomain (honest floor)
  generatedAt: string;               // when this snapshot object was assembled
  botCount: number;                  // TRACKED_BOTS.length
  byDomain: Record<string, DomainRecord>;
  stats: SnapshotStats;              // precomputed at write time
}

export interface FlipLogEntry {
  domain: string;
  field: string;                     // a bot name, or 'llms.txt', or 'ai.txt'
  from: string;                      // prior verdict / 'absent' / 'present'
  to: string;
  at: string;                        // ISO, the run time the flip was observed
}

export function computeStats(byDomain: Record<string, DomainRecord>, botCount: number): SnapshotStats {
  const records = Object.values(byDomain);
  const domainsWithData = records.length;
  const botBlockedPct: Record<string, number> = {};
  const botAllowedPct: Record<string, number> = {};
  for (const bot of TRACKED_BOTS) {
    let known = 0, blocked = 0, allowed = 0;
    for (const r of records) {
      const v = r.bots[bot];
      if (v === undefined || v === 'unknown') continue;
      known++;
      if (v === 'blocked') blocked++;
      if (v === 'allowed') allowed++;
    }
    botBlockedPct[bot] = known ? Math.round((blocked / known) * 100) : 0;
    botAllowedPct[bot] = known ? Math.round((allowed / known) * 100) : 0;
  }
  const llmsCount = records.filter((r) => r.hasLlmsTxt).length;
  const aiCount = records.filter((r) => r.hasAiTxt).length;
  const bySector: Record<string, SectorRollup> = {};
  for (const r of records) {
    const s = (bySector[r.sector] ??= { domains: 0, llmsTxt: 0 });
    s.domains++;
    if (r.hasLlmsTxt) s.llmsTxt++;
  }
  return {
    domainsWithData,
    botBlockedPct,
    botAllowedPct,
    llmsTxtAdoptionPct: domainsWithData ? Math.round((llmsCount / domainsWithData) * 100) : 0,
    aiTxtAdoptionPct: domainsWithData ? Math.round((aiCount / domainsWithData) * 100) : 0,
    bySector,
  };
}

export function detectFlips(prev: DomainRecord | undefined, next: DomainRecord, at: string): FlipLogEntry[] {
  if (!prev) return [];
  const flips: FlipLogEntry[] = [];
  for (const bot of TRACKED_BOTS) {
    const a = prev.bots[bot], b = next.bots[bot];
    if (a !== undefined && b !== undefined && a !== b) {
      flips.push({ domain: next.domain, field: bot, from: a, to: b, at });
    }
  }
  if (prev.hasLlmsTxt !== next.hasLlmsTxt) {
    flips.push({ domain: next.domain, field: 'llms.txt', from: prev.hasLlmsTxt ? 'present' : 'absent', to: next.hasLlmsTxt ? 'present' : 'absent', at });
  }
  if (prev.hasAiTxt !== next.hasAiTxt) {
    flips.push({ domain: next.domain, field: 'ai.txt', from: prev.hasAiTxt ? 'present' : 'absent', to: next.hasAiTxt ? 'present' : 'absent', at });
  }
  return flips;
}

export function oldestCheckedAt(byDomain: Record<string, DomainRecord>): string {
  const times = Object.values(byDomain).map((r) => r.checkedAt).sort();
  return times[0] ?? '';
}

// storage helpers (mirror worker/src/snapshots.ts)
const SNAPSHOT_KEY = 'ai-crawler-access/snapshot.json';
const FLIPS_KEY = 'ai-crawler-access/flips.json';
const FLIPS_CAP = 5000;
const CURSOR_KEY = 'ai-crawler-access:cursor';

export async function readSnapshot(env: Env): Promise<Snapshot | null> {
  if (!env.SNAPSHOTS_R2) return null;
  const obj = await env.SNAPSHOTS_R2.get(SNAPSHOT_KEY);
  if (!obj) return null;
  return JSON.parse(await obj.text()) as Snapshot;
}

export async function writeSnapshot(env: Env, snap: Snapshot): Promise<void> {
  if (!env.SNAPSHOTS_R2) {
    console.warn('ai-crawler-access: SNAPSHOTS_R2 binding missing, skipping snapshot write');
    return;
  }
  await env.SNAPSHOTS_R2.put(SNAPSHOT_KEY, JSON.stringify(snap), {
    httpMetadata: { contentType: 'application/json' },
  });
}

export async function readFlips(env: Env): Promise<FlipLogEntry[]> {
  if (!env.SNAPSHOTS_R2) return [];
  const obj = await env.SNAPSHOTS_R2.get(FLIPS_KEY);
  if (!obj) return [];
  return JSON.parse(await obj.text()) as FlipLogEntry[];
}

export async function appendFlips(env: Env, add: FlipLogEntry[]): Promise<void> {
  if (!add.length) return;
  if (!env.SNAPSHOTS_R2) {
    console.warn('ai-crawler-access: SNAPSHOTS_R2 binding missing, skipping flip-log write');
    return;
  }
  const existing = await readFlips(env);
  const merged = existing.concat(add).slice(-FLIPS_CAP);
  await env.SNAPSHOTS_R2.put(FLIPS_KEY, JSON.stringify(merged), {
    httpMetadata: { contentType: 'application/json' },
  });
}

export async function readCursor(env: Env): Promise<number> {
  const c = (await env.TENSORFEED_CACHE.get(CURSOR_KEY, 'json')) as { index: number } | null;
  return c?.index ?? 0;
}

export async function writeCursor(env: Env, index: number, ts: string): Promise<void> {
  await env.TENSORFEED_CACHE.put(CURSOR_KEY, JSON.stringify({ index, ts }));
}

// crawl engine (rolling daily refresh of ~1/7 of the seed universe)
const FETCH_TIMEOUT_MS = 5000;
const CONCURRENCY = 8;
const CRAWLER_UA = 'tensorfeed-crawler-access/1.0 (+https://tensorfeed.ai/ai-crawler-access)';

async function fetchText(domain: string, file: string): Promise<{ status: number | null; body: string | null }> {
  try {
    const res = await fetch(`https://${domain}/${file}`, {
      headers: { 'User-Agent': CRAWLER_UA },
      signal: AbortSignal.timeout(FETCH_TIMEOUT_MS),
      redirect: 'follow',
    });
    if (!res.ok) return { status: res.status, body: null };
    return { status: res.status, body: await res.text() };
  } catch {
    return { status: null, body: null };
  }
}

export async function crawlSite(domain: string, sector: string, at: string): Promise<DomainRecord> {
  const [robots, llms, ai] = await Promise.all([
    fetchText(domain, 'robots.txt'),
    fetchText(domain, 'llms.txt'),
    fetchText(domain, 'ai.txt'),
  ]);
  const bots: Record<string, BotVerdict> = {};
  if (robots.body !== null) {
    const groups = parseRobotsTxt(robots.body);
    for (const bot of TRACKED_BOTS) bots[bot] = verdictForBot(groups, bot);
  } else {
    for (const bot of TRACKED_BOTS) bots[bot] = 'unknown';
  }
  return {
    domain,
    sector,
    checkedAt: at,
    robotsStatus: robots.status,
    bots,
    hasLlmsTxt: llms.body !== null && llms.body.trim().length > 0,
    hasAiTxt: ai.body !== null && ai.body.trim().length > 0,
    llmsTxtBytes: llms.body !== null ? llms.body.length : null,
  };
}

async function crawlDomain(seed: { domain: string; sector: string }, at: string): Promise<DomainRecord> {
  return crawlSite(seed.domain, seed.sector, at);
}

export async function captureAiCrawlerAccessMap(
  env: Env,
): Promise<{ crawled: number; flips: number; domains: number; captured_at: string }> {
  const at = new Date().toISOString();
  const total = SEED_DOMAINS.length;
  const batchSize = Math.ceil(total / 7);
  const start = (await readCursor(env)) % total;

  const slice: typeof SEED_DOMAINS = [];
  for (let i = 0; i < batchSize; i++) slice.push(SEED_DOMAINS[(start + i) % total]);

  // bounded concurrency crawl
  const crawled: DomainRecord[] = [];
  for (let i = 0; i < slice.length; i += CONCURRENCY) {
    const chunk = slice.slice(i, i + CONCURRENCY);
    const recs = await Promise.all(chunk.map((s) => crawlDomain(s, at)));
    crawled.push(...recs);
  }

  // merge into the existing snapshot
  const prev = await readSnapshot(env);
  const byDomain: Record<string, DomainRecord> = { ...(prev?.byDomain ?? {}) };
  const flips: FlipLogEntry[] = [];
  for (const rec of crawled) {
    flips.push(...detectFlips(byDomain[rec.domain], rec, at));
    byDomain[rec.domain] = rec;
  }

  const snapshot: Snapshot = {
    dataCapturedAt: oldestCheckedAt(byDomain),
    generatedAt: at,
    botCount: TRACKED_BOTS.length,
    byDomain,
    stats: computeStats(byDomain, TRACKED_BOTS.length),
  };

  await writeSnapshot(env, snapshot);
  await appendFlips(env, flips);
  await writeCursor(env, (start + batchSize) % total, at);
  console.log(`ai-crawler-access: crawled ${crawled.length}, flips ${flips.length}, domains ${Object.keys(byDomain).length}`);
  return {
    crawled: crawled.length,
    flips: flips.length,
    domains: Object.keys(byDomain).length,
    captured_at: snapshot.dataCapturedAt,
  };
}
