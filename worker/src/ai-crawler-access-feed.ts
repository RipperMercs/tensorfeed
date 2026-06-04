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
  agent?: { hasX402: boolean; hasAgentJson: boolean; hasOpenapi: boolean };
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
export const MAX_REDIRECT_HOPS = 4;

// SSRF guard for the crawler. The seed list is curated and Cloudflare Workers
// fetch already refuses RFC1918 / link-local egress, but a compromised seed
// could 30x-redirect a crawl, so fetchText revalidates every hop against this
// allow-by-shape check: the target must be https and its host must not be a
// loopback / private / link-local / reserved IP literal. We do not DNS-resolve
// (Workers cannot cheaply), so a hostname that resolves to a private IP is left
// to the platform's own egress restrictions; this blocks the literal-IP shapes
// and the https-to-http downgrade. new URL() normalizes integer / hex / octal
// IPv4 obfuscation (e.g. https://2130706433) to dotted-quad before we test it.
export function isSafeCrawlTarget(rawUrl: string): boolean {
  let u: URL;
  try {
    u = new URL(rawUrl);
  } catch {
    return false;
  }
  if (u.protocol !== 'https:') return false;

  const rawHost = u.hostname.toLowerCase();
  // IPv6 literals arrive bracketed (e.g. [::1]); a domain name never contains
  // a colon. Detect the bracketed form so the IPv6 prefix checks below never
  // fire on a hostname like fcbarcelona.com or fd-example.com.
  const isIpv6 = rawHost.startsWith('[') && rawHost.endsWith(']');
  // Strip trailing dot(s): "localhost." / "foo.localhost." is the FQDN-root
  // form and resolves identically to the dotless name, but would otherwise
  // slip past the exact-string / endsWith name guards below. (WHATWG already
  // strips the trailing dot from IP-shaped hosts, so this only matters for the
  // name path; on IPv6 it is a no-op.)
  const host = (isIpv6 ? rawHost.slice(1, -1) : rawHost).replace(/\.+$/, '');
  if (!host) return false;

  if (isIpv6) {
    if (host === '::1' || host === '::') return false;          // loopback / unspecified
    if (host.startsWith('fe80:')) return false;                 // link-local
    if (host.startsWith('fc') || host.startsWith('fd')) return false; // fc00::/7 unique-local
    if (host.startsWith('::ffff:')) return false;               // IPv4-mapped
    return true;
  }

  if (host === 'localhost' || host.endsWith('.localhost')) return false;
  const v4 = host.match(/^(\d{1,3})\.(\d{1,3})\.(\d{1,3})\.(\d{1,3})$/);
  if (v4) {
    const a = Number(v4[1]);
    const b = Number(v4[2]);
    if (a === 0) return false;                          // 0.0.0.0/8
    if (a === 10) return false;                         // 10.0.0.0/8 private
    if (a === 127) return false;                        // loopback
    if (a === 169 && b === 254) return false;           // link-local incl. 169.254.169.254 metadata
    if (a === 172 && b >= 16 && b <= 31) return false;  // 172.16.0.0/12 private
    if (a === 192 && b === 168) return false;           // 192.168.0.0/16 private
    if (a === 100 && b >= 64 && b <= 127) return false; // 100.64.0.0/10 CGNAT
    if (a >= 224) return false;                          // 224.0.0.0/4 multicast + 240/4 reserved
  }
  return true;
}

// Fetch a crawl surface, following redirects MANUALLY so each hop is
// revalidated by isSafeCrawlTarget before it is requested. Returns no body on
// an unsafe hop, a non-2xx, too many hops, or any error. Legit https
// apex-to-www and path redirects pass through; an https-to-http downgrade or a
// redirect to a private-IP literal is dropped.
async function fetchText(domain: string, file: string): Promise<{ status: number | null; body: string | null }> {
  let target = `https://${domain}/${file}`;
  try {
    for (let hop = 0; hop <= MAX_REDIRECT_HOPS; hop += 1) {
      if (!isSafeCrawlTarget(target)) return { status: null, body: null };
      const res = await fetch(target, {
        headers: { 'User-Agent': CRAWLER_UA },
        signal: AbortSignal.timeout(FETCH_TIMEOUT_MS),
        redirect: 'manual',
      });
      if (res.status >= 300 && res.status < 400) {
        const loc = res.headers.get('location');
        if (!loc) return { status: res.status, body: null };
        target = new URL(loc, target).toString(); // resolve relative redirects
        continue;
      }
      if (!res.ok) return { status: res.status, body: null };
      return { status: res.status, body: await res.text() };
    }
    return { status: null, body: null }; // exceeded MAX_REDIRECT_HOPS
  } catch {
    return { status: null, body: null };
  }
}

// Map a robots.txt fetch result to per-bot verdicts. A 2xx body is parsed. A
// 404 or 410 means there is no robots.txt, which per RFC 9309 means crawlers
// may access anything (allowed). Anything else (5xx, 403, timeout, network
// error) is unknown: we could not read a stated policy, and a 403 is ambiguous
// (often edge bot-blocking), so we do not claim allowed.
export function verdictsFromRobots(status: number | null, body: string | null): Record<string, BotVerdict> {
  const bots: Record<string, BotVerdict> = {};
  if (body !== null) {
    const groups = parseRobotsTxt(body);
    for (const bot of TRACKED_BOTS) bots[bot] = verdictForBot(groups, bot);
  } else if (status === 404 || status === 410) {
    for (const bot of TRACKED_BOTS) bots[bot] = 'allowed';
  } else {
    for (const bot of TRACKED_BOTS) bots[bot] = 'unknown';
  }
  return bots;
}

// Validate that a fetched surface is really the expected format, not a soft-404.
// Many sites return 200 with an HTML page for any path, so a bare "2xx with a
// body" check falsely registers every surface. JSON surfaces must parse to an
// object or array; text surfaces (llms.txt, ai.txt) must not be HTML or XML.
export function looksLikeJson(body: string | null): boolean {
  if (body === null) return false;
  const t = body.trim();
  if (!t || (t[0] !== '{' && t[0] !== '[')) return false;
  try {
    const v = JSON.parse(t);
    return typeof v === 'object' && v !== null;
  } catch {
    return false;
  }
}

export function looksLikeText(body: string | null): boolean {
  if (body === null) return false;
  const t = body.trim();
  if (!t) return false;
  return !t.startsWith('<');
}

export async function crawlSite(domain: string, sector: string, at: string): Promise<DomainRecord> {
  const [robots, llms, ai, x402, agentJson, openapi1, openapi2] = await Promise.all([
    fetchText(domain, 'robots.txt'),
    fetchText(domain, 'llms.txt'),
    fetchText(domain, 'ai.txt'),
    fetchText(domain, '.well-known/x402.json'),
    fetchText(domain, '.well-known/agent.json'),
    fetchText(domain, 'openapi.json'),
    fetchText(domain, '.well-known/openapi.json'),
  ]);
  const bots = verdictsFromRobots(robots.status, robots.body);
  const hasLlmsTxt = looksLikeText(llms.body);
  return {
    domain,
    sector,
    checkedAt: at,
    robotsStatus: robots.status,
    bots,
    hasLlmsTxt,
    hasAiTxt: looksLikeText(ai.body),
    llmsTxtBytes: hasLlmsTxt && llms.body !== null ? llms.body.length : null,
    agent: {
      hasX402: looksLikeJson(x402.body),
      hasAgentJson: looksLikeJson(agentJson.body),
      hasOpenapi: looksLikeJson(openapi1.body) || looksLikeJson(openapi2.body),
    },
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
