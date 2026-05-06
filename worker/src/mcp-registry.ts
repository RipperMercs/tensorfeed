import { Env } from './types';

/**
 * Daily telemetry of the official MCP server registry.
 *
 * The registry at https://registry.modelcontextprotocol.io/ is paginated
 * (cursor-based). We paginate the full list once per day, dedup by name
 * keeping only `isLatest=true` entries, and store both the full list and a
 * summary under the `mcp-reg:` prefix in TENSORFEED_CACHE.
 *
 * The dataset compounds. Day 1 is a snapshot, day 90 is a 90-day series of
 * registry growth, churn, and per-server health. No backfill is possible.
 *
 * Free `/api/mcp/registry/snapshot` exposes today's summary plus 1-day
 * deltas. Premium `/api/premium/mcp/registry/series` exposes the dated
 * summaries over a 90-day window for 1 credit per call.
 */

const REGISTRY_URL = 'https://registry.modelcontextprotocol.io/v0/servers';
const PAGE_LIMIT = 100; // hard cap on registry side: ?limit=500 returns HTTP 422
const MAX_PAGES = 500; // 500 * 100 = 50k versioned entries headroom (registry was 20k+ on 2026-04-29)

const SUMMARY_PREFIX = 'mcp-reg:summary:';
const SERVERS_PREFIX = 'mcp-reg:servers:';
const INDEX_KEY = 'mcp-reg:index';
const MAX_INDEX_DATES = 365 * 3; // 3 years of dates

export const MAX_RANGE_DAYS = 90;
export const DEFAULT_RANGE_DAYS = 30;

export interface RegistryServer {
  name: string;                       // canonical id, e.g. "ai.tensorfeed/mcp-server"
  title?: string;
  description?: string;
  version?: string;
  repository_url?: string | null;
  repository_source?: string | null;
  remote_count: number;
  status: string;                     // "active" | "deprecated" | "deleted" etc.
  publishedAt: string;                // ISO 8601
  updatedAt: string;
  statusChangedAt: string;
}

export interface RegistrySummary {
  date: string;                       // YYYY-MM-DD UTC
  capturedAt: string;                 // ISO 8601
  total_servers: number;              // unique names with isLatest=true
  total_versions: number;             // raw API count incl. older versions
  by_status: Record<string, number>;
  top_namespaces: Array<{ namespace: string; count: number }>;
  new_today: { count: number; names: string[] };       // first-seen today vs yesterday
  reactivated_today: { count: number; names: string[] };
  deprecated_today: { count: number; names: string[] };
  delta_vs_yesterday: { added: number; removed: number; net: number } | null;
  pages_fetched: number;
  fetch_truncated: boolean;
}

const todayUTC = (): string => new Date().toISOString().slice(0, 10);
const summaryKey = (date: string): string => `${SUMMARY_PREFIX}${date}`;
const serversKey = (date: string): string => `${SERVERS_PREFIX}${date}`;

function addDays(dateStr: string, n: number): string {
  const d = new Date(`${dateStr}T00:00:00Z`);
  d.setUTCDate(d.getUTCDate() + n);
  return d.toISOString().slice(0, 10);
}

function daysBetween(from: string, to: string): number {
  const a = new Date(`${from}T00:00:00Z`).getTime();
  const b = new Date(`${to}T00:00:00Z`).getTime();
  return Math.round((b - a) / (1000 * 60 * 60 * 24));
}

function namespaceOf(name: string): string {
  // "ai.tensorfeed/mcp-server" -> "ai.tensorfeed"
  // "io.github.foo/bar" -> "io.github.foo"
  const slash = name.indexOf('/');
  return slash === -1 ? name : name.slice(0, slash);
}

// === Pure transform: paginated raw API JSON -> deduped server list + summary ===

interface RawRegistryEntry {
  server?: {
    name?: string;
    title?: string;
    description?: string;
    version?: string;
    repository?: { url?: string; source?: string };
    remotes?: Array<{ url?: string; type?: string }>;
  };
  _meta?: {
    'io.modelcontextprotocol.registry/official'?: {
      status?: string;
      statusChangedAt?: string;
      publishedAt?: string;
      updatedAt?: string;
      isLatest?: boolean;
    };
  };
}

interface RawRegistryPage {
  servers?: RawRegistryEntry[];
  metadata?: { nextCursor?: string; count?: number };
}

export function dedupLatest(entries: RawRegistryEntry[]): RegistryServer[] {
  // Keep one record per server.name. Prefer isLatest=true; otherwise keep the
  // entry with the most recent updatedAt. Servers without a name are dropped.
  const byName = new Map<string, { entry: RawRegistryEntry; isLatest: boolean; updatedAt: string }>();
  for (const e of entries) {
    const name = e.server?.name;
    if (!name) continue;
    const meta = e._meta?.['io.modelcontextprotocol.registry/official'] || {};
    const isLatest = meta.isLatest === true;
    const updatedAt = meta.updatedAt || meta.publishedAt || '';
    const existing = byName.get(name);
    if (!existing) {
      byName.set(name, { entry: e, isLatest, updatedAt });
      continue;
    }
    // Latest beats non-latest; among ties, newer updatedAt wins.
    if (isLatest && !existing.isLatest) {
      byName.set(name, { entry: e, isLatest, updatedAt });
    } else if (isLatest === existing.isLatest && updatedAt > existing.updatedAt) {
      byName.set(name, { entry: e, isLatest, updatedAt });
    }
  }
  const out: RegistryServer[] = [];
  for (const { entry } of byName.values()) {
    const meta = entry._meta?.['io.modelcontextprotocol.registry/official'] || {};
    out.push({
      name: entry.server!.name!,
      title: entry.server?.title,
      description: entry.server?.description,
      version: entry.server?.version,
      repository_url: entry.server?.repository?.url || null,
      repository_source: entry.server?.repository?.source || null,
      remote_count: Array.isArray(entry.server?.remotes) ? entry.server!.remotes!.length : 0,
      status: meta.status || 'unknown',
      publishedAt: meta.publishedAt || '',
      updatedAt: meta.updatedAt || meta.publishedAt || '',
      statusChangedAt: meta.statusChangedAt || meta.publishedAt || '',
    });
  }
  // Stable sort by name
  out.sort((a, b) => (a.name < b.name ? -1 : a.name > b.name ? 1 : 0));
  return out;
}

export interface SummarizeOpts {
  date: string;
  capturedAt: string;
  pagesFetched: number;
  fetchTruncated: boolean;
  rawTotalVersions: number;
  yesterdayServers: RegistryServer[] | null;
  yesterdaySummary: RegistrySummary | null;
}

export function summarize(latestServers: RegistryServer[], opts: SummarizeOpts): RegistrySummary {
  const byStatus: Record<string, number> = {};
  const byNamespace: Map<string, number> = new Map();

  for (const s of latestServers) {
    byStatus[s.status] = (byStatus[s.status] || 0) + 1;
    const ns = namespaceOf(s.name);
    byNamespace.set(ns, (byNamespace.get(ns) || 0) + 1);
  }

  const top_namespaces = Array.from(byNamespace.entries())
    .map(([namespace, count]) => ({ namespace, count }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 20);

  let new_today: { count: number; names: string[] } = { count: 0, names: [] };
  let reactivated_today: { count: number; names: string[] } = { count: 0, names: [] };
  let deprecated_today: { count: number; names: string[] } = { count: 0, names: [] };
  let delta: RegistrySummary['delta_vs_yesterday'] = null;

  if (opts.yesterdayServers) {
    const yMap = new Map(opts.yesterdayServers.map(s => [s.name, s]));
    const tMap = new Map(latestServers.map(s => [s.name, s]));

    const newNames: string[] = [];
    for (const s of latestServers) {
      if (!yMap.has(s.name)) newNames.push(s.name);
    }
    new_today = { count: newNames.length, names: newNames.slice(0, 50) };

    const removedNames: string[] = [];
    for (const s of opts.yesterdayServers) {
      if (!tMap.has(s.name)) removedNames.push(s.name);
    }

    const reactivated: string[] = [];
    const deprecated: string[] = [];
    for (const s of latestServers) {
      const prev = yMap.get(s.name);
      if (!prev) continue;
      if (prev.status !== 'active' && s.status === 'active') reactivated.push(s.name);
      if (prev.status === 'active' && s.status !== 'active') deprecated.push(s.name);
    }
    reactivated_today = { count: reactivated.length, names: reactivated.slice(0, 50) };
    deprecated_today = { count: deprecated.length, names: deprecated.slice(0, 50) };

    delta = {
      added: newNames.length,
      removed: removedNames.length,
      net: latestServers.length - opts.yesterdayServers.length,
    };
  }

  return {
    date: opts.date,
    capturedAt: opts.capturedAt,
    total_servers: latestServers.length,
    total_versions: opts.rawTotalVersions,
    by_status: byStatus,
    top_namespaces,
    new_today,
    reactivated_today,
    deprecated_today,
    delta_vs_yesterday: delta,
    pages_fetched: opts.pagesFetched,
    fetch_truncated: opts.fetchTruncated,
  };
}

// === Fetcher ===

async function fetchAllPages(): Promise<{ entries: RawRegistryEntry[]; pages: number; truncated: boolean }> {
  const entries: RawRegistryEntry[] = [];
  let cursor: string | undefined = undefined;
  let pages = 0;
  let truncated = false;

  for (let i = 0; i < MAX_PAGES; i++) {
    const url = new URL(REGISTRY_URL);
    url.searchParams.set('limit', String(PAGE_LIMIT));
    if (cursor) url.searchParams.set('cursor', cursor);

    let res: Response;
    try {
      res = await fetch(url.toString(), {
        headers: { Accept: 'application/json', 'User-Agent': 'tensorfeed-mcp-registry-tracker/1.0 (+https://tensorfeed.ai)' },
        signal: AbortSignal.timeout(15000),
      });
    } catch (err) {
      throw new Error(`registry fetch failed: ${(err as Error).message}`);
    }
    if (!res.ok) {
      throw new Error(`registry returned HTTP ${res.status}`);
    }
    const data = (await res.json()) as RawRegistryPage;
    pages++;
    if (Array.isArray(data.servers)) entries.push(...data.servers);
    cursor = data.metadata?.nextCursor;
    if (!cursor) break;
  }

  if (cursor) truncated = true;
  return { entries, pages, truncated };
}

// === KV index ===

async function readIndex(env: Env): Promise<string[]> {
  const raw = await env.TENSORFEED_CACHE.get(INDEX_KEY, 'json') as string[] | null;
  return raw || [];
}

async function pushIndexDate(env: Env, date: string): Promise<void> {
  const dates = await readIndex(env);
  if (!dates.includes(date)) {
    dates.unshift(date);
    if (dates.length > MAX_INDEX_DATES) dates.length = MAX_INDEX_DATES;
    await env.TENSORFEED_CACHE.put(INDEX_KEY, JSON.stringify(dates));
  }
}

// === Public API ===

export interface CaptureResult {
  ok: boolean;
  date: string;
  total_servers?: number;
  pages_fetched?: number;
  fetch_truncated?: boolean;
  error?: string;
}

export async function captureRegistrySnapshot(env: Env): Promise<CaptureResult> {
  const date = todayUTC();
  const capturedAt = new Date().toISOString();

  let fetched: { entries: RawRegistryEntry[]; pages: number; truncated: boolean };
  try {
    fetched = await fetchAllPages();
  } catch (err) {
    return { ok: false, date, error: (err as Error).message };
  }

  const latest = dedupLatest(fetched.entries);

  // Read yesterday's snapshot for delta computation. Falls back to most recent prior date.
  const dates = await readIndex(env);
  const priorDate = dates.find(d => d < date) || null;
  const yesterdayServers = priorDate
    ? ((await env.TENSORFEED_CACHE.get(serversKey(priorDate), 'json')) as RegistryServer[] | null)
    : null;
  const yesterdaySummary = priorDate
    ? ((await env.TENSORFEED_CACHE.get(summaryKey(priorDate), 'json')) as RegistrySummary | null)
    : null;

  const summary = summarize(latest, {
    date,
    capturedAt,
    pagesFetched: fetched.pages,
    fetchTruncated: fetched.truncated,
    rawTotalVersions: fetched.entries.length,
    yesterdayServers,
    yesterdaySummary,
  });

  await Promise.all([
    env.TENSORFEED_CACHE.put(serversKey(date), JSON.stringify(latest)),
    env.TENSORFEED_CACHE.put(summaryKey(date), JSON.stringify(summary)),
  ]);
  await pushIndexDate(env, date);

  return {
    ok: true,
    date,
    total_servers: summary.total_servers,
    pages_fetched: summary.pages_fetched,
    fetch_truncated: summary.fetch_truncated,
  };
}

/**
 * Read the most recent stored summary. If none exists yet (e.g. cron has not
 * run since deploy), runs a one-time live capture so the free endpoint never
 * returns empty on cold start.
 */
export async function getLatestSummary(env: Env): Promise<RegistrySummary | null> {
  const dates = await readIndex(env);
  if (dates.length > 0) {
    const summary = (await env.TENSORFEED_CACHE.get(summaryKey(dates[0]), 'json')) as RegistrySummary | null;
    if (summary) return summary;
  }
  // Cold-start bootstrap.
  const result = await captureRegistrySnapshot(env);
  if (!result.ok) return null;
  return (await env.TENSORFEED_CACHE.get(summaryKey(result.date), 'json')) as RegistrySummary | null;
}

export async function getSummaryByDate(env: Env, date: string): Promise<RegistrySummary | null> {
  return (await env.TENSORFEED_CACHE.get(summaryKey(date), 'json')) as RegistrySummary | null;
}

export async function listIndexedDates(env: Env): Promise<string[]> {
  return readIndex(env);
}

// === Range queries for premium endpoint ===

export interface RangeResolution {
  ok: boolean;
  error?: string;
  from?: string;
  to?: string;
}

const ISO_DATE = /^\d{4}-\d{2}-\d{2}$/;

export function resolveRange(rawFrom: string | null, rawTo: string | null): RangeResolution {
  const today = todayUTC();
  const to = rawTo?.trim() || today;
  if (!ISO_DATE.test(to)) return { ok: false, error: 'invalid_to_date' };

  let from = rawFrom?.trim();
  if (!from) {
    from = addDays(to, -(DEFAULT_RANGE_DAYS - 1));
  } else if (!ISO_DATE.test(from)) {
    return { ok: false, error: 'invalid_from_date' };
  }
  if (from > to) return { ok: false, error: 'from_after_to' };
  const span = daysBetween(from, to);
  if (span + 1 > MAX_RANGE_DAYS) return { ok: false, error: 'range_exceeds_max_days' };

  return { ok: true, from, to };
}

export interface SeriesPoint {
  date: string;
  total_servers: number | null;
  total_versions: number | null;
  active_count: number | null;
  added: number | null;
  removed: number | null;
  net: number | null;
  has_data: boolean;
}

export interface MCPAttribution {
  source: string;
  source_url: string;
  license: string;
  license_url: string;
}

export const MCP_REGISTRY_ATTRIBUTION: MCPAttribution = {
  source: 'modelcontextprotocol/registry',
  source_url: 'https://registry.modelcontextprotocol.io/',
  license: 'Apache-2.0 / MIT',
  license_url: 'https://github.com/modelcontextprotocol/registry/blob/main/LICENSE',
};

export interface SeriesResult {
  from: string;
  to: string;
  days: number;
  points: SeriesPoint[];
  delta_in_window: { start_total: number | null; end_total: number | null; net: number | null };
  attribution: MCPAttribution;
  notes: string[];
}

export async function getSeries(env: Env, from: string, to: string): Promise<SeriesResult> {
  const dates: string[] = [];
  const span = daysBetween(from, to);
  for (let i = 0; i <= span; i++) dates.push(addDays(from, i));

  const summaries = await Promise.all(
    dates.map(d => env.TENSORFEED_CACHE.get(summaryKey(d), 'json') as Promise<RegistrySummary | null>),
  );

  const points: SeriesPoint[] = dates.map((date, i) => {
    const s = summaries[i];
    if (!s) {
      return {
        date,
        total_servers: null,
        total_versions: null,
        active_count: null,
        added: null,
        removed: null,
        net: null,
        has_data: false,
      };
    }
    return {
      date,
      total_servers: s.total_servers,
      total_versions: s.total_versions,
      active_count: s.by_status.active ?? null,
      added: s.delta_vs_yesterday?.added ?? null,
      removed: s.delta_vs_yesterday?.removed ?? null,
      net: s.delta_vs_yesterday?.net ?? null,
      has_data: true,
    };
  });

  const withData = points.filter(p => p.has_data);
  const startTotal = withData[0]?.total_servers ?? null;
  const endTotal = withData[withData.length - 1]?.total_servers ?? null;
  const net = startTotal !== null && endTotal !== null ? endTotal - startTotal : null;

  const notes: string[] = [];
  const missingDays = points.length - withData.length;
  if (missingDays > 0) notes.push(`${missingDays} day(s) in range have no captured snapshot yet`);

  return {
    from,
    to,
    days: points.length,
    points,
    delta_in_window: { start_total: startTotal, end_total: endTotal, net },
    attribution: MCP_REGISTRY_ATTRIBUTION,
    notes,
  };
}
