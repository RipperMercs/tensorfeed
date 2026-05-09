import { Env } from './types';

/**
 * Daily snapshot of new GitHub repos that represent submission/distribution
 * opportunities for TensorFeed: Anthropic/OpenAI/Microsoft/ModelContextProtocol
 * org repos created or updated recently, plus broader keyword sweeps for MCP
 * servers, x402-related projects, and agent skill catalogs.
 *
 * The pattern that drove this feature: on 2026-05-08 we discovered
 * anthropics/financial-services manually, submitted a TF MCP connector PR,
 * and got real visibility. On 2026-05-09 the same pattern repeated for
 * anthropics/life-sciences and anthropics/skills. That's three high-leverage
 * submissions in 24 hours from one ad-hoc scan. Daily snapshotting turns
 * that ad-hoc scan into recurring infrastructure.
 *
 * Sources via GitHub Search API (/search/repositories): seven fan-out
 * queries. Each query is sorted by `updated` (most-recent first) so we
 * surface what changed today, not historical popularity. Dedup by
 * full_name across the fanout, classify by signal, sort by composite
 * score (signal_weight * recency_factor + log10(stars)).
 *
 * Free tier of GitHub Search API: 10 req/min unauthenticated, 30 req/min
 * authenticated. We use the existing GITHUB_TOKEN secret when present
 * (also used by hot-issues.ts and trending-repos polling).
 *
 * KV layout (TENSORFEED_CACHE):
 *   opps:latest               -> AgentOpportunitiesSnapshot
 *   opps:daily:{YYYY-MM-DD}   -> AgentOpportunitiesSnapshot (compounds, future premium)
 *   opps:index                -> string[] of dates
 */

const SEARCH_BASE = 'https://api.github.com/search/repositories';

interface QuerySpec {
  signal: string;
  signal_weight: number;
  q: string;
  per_page: number;
}

const QUERIES: QuerySpec[] = [
  // Anthropic org: highest leverage. New repos here drive vertical-marketplace
  // submissions (financial-services, life-sciences, skills, knowledge-work-plugins).
  { signal: 'anthropic-org', signal_weight: 10, q: 'org:anthropics', per_page: 10 },
  // OpenAI: same vertical-marketplace pattern (openai/skills for Codex).
  { signal: 'openai-org', signal_weight: 9, q: 'org:openai', per_page: 10 },
  // Microsoft: MCP-relevant subset (skills, mcp catalog, agent-related).
  { signal: 'microsoft-org', signal_weight: 7, q: 'org:microsoft mcp OR agent OR skill', per_page: 10 },
  // MCP foundation: protocol-level changes affect every MCP-aware client.
  { signal: 'mcp-org', signal_weight: 8, q: 'org:modelcontextprotocol', per_page: 10 },
  // MCP server keyword: broader pool of new MCP servers across the ecosystem.
  { signal: 'mcp-keyword', signal_weight: 5, q: '"mcp server" stars:>=10', per_page: 10 },
  // x402 keyword: agent-payments protocol projects (TF is canonical V2 merchant).
  { signal: 'x402-keyword', signal_weight: 6, q: 'x402 stars:>=5', per_page: 10 },
  // Agent skills catalogs: cross-vendor pattern (anthropics/skills, openai/skills,
  // microsoft/skills all exist; this catches the next one when it lands).
  { signal: 'skill-keyword', signal_weight: 6, q: '"agent skills" OR "claude skills" stars:>=10', per_page: 10 },
];

const RECENT_WINDOW_DAYS = 30;
const FINAL_TOP_N = 25;
const QUERY_DELAY_MS = 1100;
const DESC_CAP = 240;

const LATEST_KEY = 'opps:latest';
const DAILY_PREFIX = 'opps:daily:';
const INDEX_KEY = 'opps:index';
const MAX_INDEX_DATES = 365 * 3;

export interface AgentOpportunity {
  full_name: string;
  html_url: string;
  description: string | null;
  stars: number;
  created_at: string;
  updated_at: string;
  language: string | null;
  topics: string[];
  signal: string;
  signal_weight: number;
  composite_score: number;
}

export interface AgentOpportunitiesSnapshot {
  date: string;
  capturedAt: string;
  total_opportunities: number;
  signals_queried: string[];
  raw_count: number;
  recent_window_days: number;
  opportunities: AgentOpportunity[];
  summary: {
    by_signal: Record<string, number>;
    top_orgs: Array<{ org: string; count: number }>;
  };
}

const todayUTC = (): string => new Date().toISOString().slice(0, 10);
const dailyKey = (date: string): string => `${DAILY_PREFIX}${date}`;

function clampStr(s: string, max: number): string {
  if (s.length <= max) return s;
  return s.slice(0, max - 1) + '…';
}

function orgFromFullName(full_name: string): string {
  const slash = full_name.indexOf('/');
  return slash > 0 ? full_name.slice(0, slash) : full_name;
}

interface RawRepoItem {
  full_name?: string;
  html_url?: string;
  description?: string | null;
  stargazers_count?: number;
  created_at?: string;
  updated_at?: string;
  language?: string | null;
  topics?: string[];
  archived?: boolean;
  disabled?: boolean;
  fork?: boolean;
}

interface RawSearchPage {
  total_count?: number;
  items?: RawRepoItem[];
}

/**
 * Recency factor: 1.0 for updated today, decays linearly to 0.0 at the
 * recent-window boundary. Items updated outside the window get a floor
 * of 0 so older repos don't compete on stars alone.
 */
function recencyFactor(updated_at: string, now: Date = new Date()): number {
  const t = Date.parse(updated_at);
  if (!Number.isFinite(t)) return 0;
  const ageMs = now.getTime() - t;
  const ageDays = ageMs / (24 * 60 * 60 * 1000);
  if (ageDays < 0) return 1; // future-dated, treat as fresh
  if (ageDays >= RECENT_WINDOW_DAYS) return 0;
  return 1 - ageDays / RECENT_WINDOW_DAYS;
}

export function compositeScore(
  signal_weight: number,
  stars: number,
  updated_at: string,
  now: Date = new Date(),
): number {
  // signal weight scaled by recency, plus a log-stars term so a
  // brand-new 50-star repo can beat a 30-day-stale 50,000-star one.
  const recency = recencyFactor(updated_at, now);
  const starsTerm = stars > 0 ? Math.log10(stars + 1) : 0;
  return Math.round((signal_weight * recency + starsTerm) * 100) / 100;
}

export function normalizeRepo(
  item: RawRepoItem,
  signal: string,
  signal_weight: number,
  now: Date = new Date(),
): AgentOpportunity | null {
  if (item.archived || item.disabled || item.fork) return null;
  const full_name = item.full_name?.trim();
  if (!full_name || !full_name.includes('/')) return null;
  const html_url = item.html_url?.trim();
  if (!html_url) return null;
  const description = item.description ? clampStr(item.description.trim(), DESC_CAP) : null;
  const stars = typeof item.stargazers_count === 'number' ? item.stargazers_count : 0;
  const updated_at = item.updated_at || '';
  const created_at = item.created_at || '';
  const topics = Array.isArray(item.topics) ? item.topics.slice(0, 12) : [];
  return {
    full_name,
    html_url,
    description,
    stars,
    created_at,
    updated_at,
    language: item.language ?? null,
    topics,
    signal,
    signal_weight,
    composite_score: compositeScore(signal_weight, stars, updated_at, now),
  };
}

export function dedupAndRank(opps: AgentOpportunity[]): AgentOpportunity[] {
  // Dedup by full_name; on collision keep the higher-weight signal,
  // then higher composite_score as tie-break.
  const byName = new Map<string, AgentOpportunity>();
  for (const o of opps) {
    const existing = byName.get(o.full_name);
    if (
      !existing ||
      o.signal_weight > existing.signal_weight ||
      (o.signal_weight === existing.signal_weight && o.composite_score > existing.composite_score)
    ) {
      byName.set(o.full_name, o);
    }
  }
  const list = Array.from(byName.values());
  list.sort((a, b) => {
    if (b.composite_score !== a.composite_score) return b.composite_score - a.composite_score;
    if (b.stars !== a.stars) return b.stars - a.stars;
    if (a.updated_at !== b.updated_at) return b.updated_at.localeCompare(a.updated_at);
    return a.full_name.localeCompare(b.full_name);
  });
  return list.slice(0, FINAL_TOP_N);
}

export function summarize(opps: AgentOpportunity[]): AgentOpportunitiesSnapshot['summary'] {
  const bySignal: Record<string, number> = {};
  const byOrg = new Map<string, number>();
  for (const o of opps) {
    bySignal[o.signal] = (bySignal[o.signal] || 0) + 1;
    const org = orgFromFullName(o.full_name);
    if (org) byOrg.set(org, (byOrg.get(org) || 0) + 1);
  }
  const top_orgs = Array.from(byOrg.entries())
    .map(([org, count]) => ({ org, count }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 10);
  return { by_signal: bySignal, top_orgs };
}

const sleep = (ms: number): Promise<void> => new Promise(r => setTimeout(r, ms));

async function fetchOneQuery(
  spec: QuerySpec,
  token: string | undefined,
  now: Date = new Date(),
): Promise<AgentOpportunity[]> {
  const url = new URL(SEARCH_BASE);
  url.searchParams.set('q', spec.q);
  url.searchParams.set('sort', 'updated');
  url.searchParams.set('order', 'desc');
  url.searchParams.set('per_page', String(spec.per_page));

  const headers: Record<string, string> = {
    Accept: 'application/vnd.github+json',
    'User-Agent': 'tensorfeed-agent-opportunities/1.0 (+https://tensorfeed.ai)',
    'X-GitHub-Api-Version': '2022-11-28',
  };
  if (token) headers['Authorization'] = `Bearer ${token}`;

  const res = await fetch(url.toString(), {
    headers,
    signal: AbortSignal.timeout(15000),
  });
  if (!res.ok) {
    throw new Error(`github search returned HTTP ${res.status} for signal "${spec.signal}"`);
  }
  const data = (await res.json()) as RawSearchPage;
  if (!Array.isArray(data.items)) return [];
  const out: AgentOpportunity[] = [];
  for (const item of data.items) {
    const norm = normalizeRepo(item, spec.signal, spec.signal_weight, now);
    if (norm) out.push(norm);
  }
  return out;
}

async function ensureDateInIndex(env: Env, date: string): Promise<void> {
  const list = (await env.TENSORFEED_CACHE.get<string[]>(INDEX_KEY, 'json')) ?? [];
  if (list.includes(date)) return;
  list.push(date);
  list.sort();
  while (list.length > MAX_INDEX_DATES) list.shift();
  await env.TENSORFEED_CACHE.put(INDEX_KEY, JSON.stringify(list));
}

export interface CaptureResult {
  ok: boolean;
  date: string;
  total_opportunities?: number;
  raw_count?: number;
  error?: string;
}

export async function captureAgentOpportunities(env: Env): Promise<CaptureResult> {
  const date = todayUTC();
  const now = new Date();
  const token = env.GITHUB_TOKEN || undefined;

  let raw: AgentOpportunity[] = [];
  for (let i = 0; i < QUERIES.length; i++) {
    if (i > 0) await sleep(QUERY_DELAY_MS);
    try {
      const batch = await fetchOneQuery(QUERIES[i], token, now);
      raw = raw.concat(batch);
    } catch (e) {
      console.warn(`agent-opportunities: query "${QUERIES[i].signal}" failed -`, e);
      // Don't abort the whole run on one failed query; keep what we got.
    }
  }

  const opportunities = dedupAndRank(raw);
  const summary = summarize(opportunities);

  const snapshot: AgentOpportunitiesSnapshot = {
    date,
    capturedAt: now.toISOString(),
    total_opportunities: opportunities.length,
    signals_queried: QUERIES.map(q => q.signal),
    raw_count: raw.length,
    recent_window_days: RECENT_WINDOW_DAYS,
    opportunities,
    summary,
  };

  // Single-batch write to stay within the KV daily-ops budget.
  await Promise.all([
    env.TENSORFEED_CACHE.put(LATEST_KEY, JSON.stringify(snapshot)),
    env.TENSORFEED_CACHE.put(dailyKey(date), JSON.stringify(snapshot)),
    ensureDateInIndex(env, date),
  ]);

  return {
    ok: true,
    date,
    total_opportunities: snapshot.total_opportunities,
    raw_count: snapshot.raw_count,
  };
}

export async function getLatestSnapshot(env: Env): Promise<AgentOpportunitiesSnapshot | null> {
  return (await env.TENSORFEED_CACHE.get<AgentOpportunitiesSnapshot>(LATEST_KEY, 'json')) ?? null;
}

export async function listSnapshotDates(env: Env): Promise<string[]> {
  return (await env.TENSORFEED_CACHE.get<string[]>(INDEX_KEY, 'json')) ?? [];
}

export async function getSnapshotForDate(
  env: Env,
  date: string,
): Promise<AgentOpportunitiesSnapshot | null> {
  return (await env.TENSORFEED_CACHE.get<AgentOpportunitiesSnapshot>(dailyKey(date), 'json')) ?? null;
}
