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
  // MCP foundation: protocol-level changes affect every MCP-aware client.
  { signal: 'mcp-org', signal_weight: 8, q: 'org:modelcontextprotocol', per_page: 10 },
  // Microsoft: MCP-relevant subset (skills, mcp catalog, agent-related).
  { signal: 'microsoft-org', signal_weight: 7, q: 'org:microsoft mcp OR agent OR skill', per_page: 10 },
  // HuggingFace: ships agent-relevant tools and reference repos that fit the
  // same data-layer pattern.
  { signal: 'huggingface-org', signal_weight: 7, q: 'org:huggingface', per_page: 10 },
  // LangChain ecosystem: orchestration layer; catches new templates, integrations,
  // and the langgraph extensions agents commonly depend on.
  { signal: 'langchain-org', signal_weight: 6, q: 'org:langchain-ai', per_page: 10 },
  // Other frontier labs combined: Cohere, Mistral, DeepSeek, xAI, Groq. Smaller
  // distribution surfaces individually but collectively meaningful, and any of
  // them shipping their own vertical-repo pattern is a leading indicator.
  { signal: 'frontier-labs', signal_weight: 7, q: 'org:cohere-ai OR org:mistralai OR org:deepseek-ai OR org:xai-org OR org:groq', per_page: 10 },
  // MCP server keyword: broader pool of new MCP servers across the ecosystem.
  { signal: 'mcp-keyword', signal_weight: 5, q: '"mcp server" stars:>=10', per_page: 10 },
  // x402 keyword: agent-payments protocol projects (TF is canonical V2 merchant).
  { signal: 'x402-keyword', signal_weight: 6, q: 'x402 stars:>=5', per_page: 10 },
  // Agent skills catalogs: cross-vendor pattern (anthropics/skills, openai/skills,
  // microsoft/skills all exist; this catches the next one when it lands).
  { signal: 'skill-keyword', signal_weight: 6, q: '"agent skills" OR "claude skills" stars:>=10', per_page: 10 },
  // Vertical reference repo pattern: catches "claude-for-X" / "openai-for-X" /
  // similar new vertical bundles before they show up under their parent org's
  // daily updated list. The pattern that drove today's life-sciences submission.
  { signal: 'vertical-pattern', signal_weight: 8, q: '"claude for" OR "openai for" OR "claude-for-" stars:>=20', per_page: 10 },
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

/**
 * Per-signal MAX cap and MIN quota on the final top-N.
 *
 * MAX prevents one signal saturating the result (e.g. 25 fresh
 * anthropic-org updates would otherwise displace everything else).
 *
 * MIN guarantees every signal that returns at least N>=MIN results
 * gets representation. Without it, lower-weight keyword sweeps
 * (mcp-keyword, x402-keyword, skill-keyword) lose every composite-score
 * tie-break against the high-weight org signals and never surface.
 *
 * 11 signals * MIN(1) = 11 reserved slots minimum + 14 ranked overflow,
 * within FINAL_TOP_N=25.
 */
const PER_SIGNAL_MAX = 5;
const PER_SIGNAL_MIN = 1;

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

  // Group by signal so we can fill MIN-quota first.
  const bySignal = new Map<string, AgentOpportunity[]>();
  for (const o of list) {
    if (!bySignal.has(o.signal)) bySignal.set(o.signal, []);
    bySignal.get(o.signal)!.push(o);
  }

  const result: AgentOpportunity[] = [];
  const usedNames = new Set<string>();

  // Pass 1: MIN quota. Take up to PER_SIGNAL_MIN per signal that has
  // any results. Guarantees every populated signal appears in the
  // output (subject to MIN <= MAX <= FINAL_TOP_N).
  for (const [, sigList] of bySignal) {
    for (let i = 0; i < Math.min(PER_SIGNAL_MIN, sigList.length); i++) {
      const o = sigList[i];
      if (!usedNames.has(o.full_name) && result.length < FINAL_TOP_N) {
        result.push(o);
        usedNames.add(o.full_name);
      }
    }
  }

  // Pass 2: MAX cap. Fill from the top of the global composite-score
  // ranking, respecting both the MAX and the FINAL_TOP_N total.
  const perSignalCount: Record<string, number> = {};
  for (const o of result) {
    perSignalCount[o.signal] = (perSignalCount[o.signal] ?? 0) + 1;
  }
  for (const o of list) {
    if (result.length >= FINAL_TOP_N) break;
    if (usedNames.has(o.full_name)) continue;
    const n = perSignalCount[o.signal] ?? 0;
    if (n < PER_SIGNAL_MAX) {
      result.push(o);
      usedNames.add(o.full_name);
      perSignalCount[o.signal] = n + 1;
    }
  }

  // Pass 3: overflow. If MAX cap kept us under FINAL_TOP_N, fill the
  // remainder from anything not yet used, ignoring the MAX cap.
  if (result.length < FINAL_TOP_N) {
    for (const o of list) {
      if (result.length >= FINAL_TOP_N) break;
      if (!usedNames.has(o.full_name)) {
        result.push(o);
        usedNames.add(o.full_name);
      }
    }
  }

  // Final sort by composite_score so the result is presented top-down
  // even though we built it in three passes.
  result.sort((a, b) => {
    if (b.composite_score !== a.composite_score) return b.composite_score - a.composite_score;
    if (b.stars !== a.stars) return b.stars - a.stars;
    return a.full_name.localeCompare(b.full_name);
  });

  return result;
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

// === Proactive opportunity alerts ===
//
// After each daily scan, diff against yesterday's snapshot. If new repos
// appear that meet the alert threshold, email evan@tensorfeed.ai via
// Resend. Throttled implicitly because the cron is daily; first-run is a
// no-op (no previous snapshot to diff against).

const HIGH_VALUE_SIGNALS = new Set([
  'anthropic-org',
  'openai-org',
  'mcp-org',
  'microsoft-org',
  'huggingface-org',
  'frontier-labs',
  'langchain-org',
  'vertical-pattern',
]);
const KEYWORD_STAR_THRESHOLD = 100;
const ALERT_ITEM_CAP = 25;

function isoDaysAgoUTC(n: number, ref: Date = new Date()): string {
  const d = new Date(ref);
  d.setUTCDate(d.getUTCDate() - n);
  return d.toISOString().slice(0, 10);
}

export function findNewOpportunities(
  current: AgentOpportunity[],
  previous: AgentOpportunity[],
): AgentOpportunity[] {
  const previousNames = new Set(previous.map((o) => o.full_name));
  return current.filter((o) => !previousNames.has(o.full_name));
}

export function filterAlertWorthy(newOpps: AgentOpportunity[]): AgentOpportunity[] {
  return newOpps.filter((o) => {
    if (HIGH_VALUE_SIGNALS.has(o.signal)) return true;
    return o.stars >= KEYWORD_STAR_THRESHOLD;
  });
}

interface AlertEnv {
  RESEND_API_KEY?: string;
  ALERT_EMAIL_TO?: string;
  ALERT_EMAIL_FROM?: string;
}

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function buildAlertEmail(
  opps: AgentOpportunity[],
  date: string,
): { subject: string; html: string; text: string } {
  const subject = `[TF] ${opps.length} new agent ecosystem repo${opps.length === 1 ? '' : 's'} on ${date}`;

  const rows = opps
    .slice(0, ALERT_ITEM_CAP)
    .map((o) => {
      const desc = o.description ? escapeHtml(o.description) : '<em>(no description)</em>';
      const fn = escapeHtml(o.full_name);
      const url = escapeHtml(o.html_url);
      const sig = escapeHtml(o.signal);
      return `<tr>
  <td style="padding:8px 12px;border-bottom:1px solid #1f2937;font-family:ui-monospace,monospace;font-size:13px;"><a href="${url}" style="color:#6366f1;text-decoration:none;">${fn}</a></td>
  <td style="padding:8px 12px;border-bottom:1px solid #1f2937;font-size:12px;color:#9ca3af;">${sig}</td>
  <td style="padding:8px 12px;border-bottom:1px solid #1f2937;font-size:12px;text-align:right;color:#d1d5db;">${o.stars.toLocaleString()}★</td>
  <td style="padding:8px 12px;border-bottom:1px solid #1f2937;font-size:13px;color:#9ca3af;">${desc}</td>
</tr>`;
    })
    .join('\n');

  const html = `<!doctype html>
<html><body style="background:#0a0a0b;color:#e5e7eb;font-family:-apple-system,BlinkMacSystemFont,sans-serif;margin:0;padding:24px;">
<div style="max-width:780px;margin:0 auto;">
<h2 style="margin:0 0 6px 0;color:#fff;">New agent ecosystem opportunities</h2>
<p style="margin:0 0 16px 0;color:#9ca3af;font-size:14px;">${date} · ${opps.length} new repo${opps.length === 1 ? '' : 's'} surfaced by the daily scan${opps.length > ALERT_ITEM_CAP ? ` (top ${ALERT_ITEM_CAP} shown)` : ''}.</p>
<table style="width:100%;border-collapse:collapse;background:#111827;border:1px solid #1f2937;border-radius:8px;overflow:hidden;">
<thead>
<tr style="background:#1f2937;">
<th style="padding:10px 12px;text-align:left;font-size:11px;text-transform:uppercase;letter-spacing:0.05em;color:#9ca3af;">Repo</th>
<th style="padding:10px 12px;text-align:left;font-size:11px;text-transform:uppercase;letter-spacing:0.05em;color:#9ca3af;">Signal</th>
<th style="padding:10px 12px;text-align:right;font-size:11px;text-transform:uppercase;letter-spacing:0.05em;color:#9ca3af;">Stars</th>
<th style="padding:10px 12px;text-align:left;font-size:11px;text-transform:uppercase;letter-spacing:0.05em;color:#9ca3af;">Description</th>
</tr>
</thead>
<tbody>
${rows}
</tbody>
</table>
<p style="margin:16px 0 0 0;color:#6b7280;font-size:12px;">Full snapshot: <a href="https://tensorfeed.ai/api/agents/opportunities" style="color:#6366f1;">/api/agents/opportunities</a> · Cron 13:30 UTC daily.</p>
</div>
</body></html>`;

  const textRows = opps
    .slice(0, ALERT_ITEM_CAP)
    .map((o) => {
      const desc = o.description || '(no description)';
      return `[${o.signal}] ${o.full_name} (${o.stars.toLocaleString()} stars)\n  ${o.html_url}\n  ${desc}`;
    })
    .join('\n\n');
  const text = `New agent ecosystem opportunities · ${date}\n\n${opps.length} new repo${opps.length === 1 ? '' : 's'} surfaced by the daily scan${opps.length > ALERT_ITEM_CAP ? ` (top ${ALERT_ITEM_CAP} shown)` : ''}.\n\n${textRows}\n\nFull snapshot: https://tensorfeed.ai/api/agents/opportunities`;

  return { subject, html, text };
}

async function sendAlertEmail(
  env: AlertEnv,
  payload: { subject: string; html: string; text: string },
): Promise<boolean> {
  if (!env.RESEND_API_KEY) {
    console.warn('opportunity alert skipped: RESEND_API_KEY not set');
    return false;
  }
  const to = env.ALERT_EMAIL_TO || 'evan@tensorfeed.ai';
  const from = env.ALERT_EMAIL_FROM || 'alerts@tensorfeed.ai';
  try {
    const res = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${env.RESEND_API_KEY}`,
      },
      body: JSON.stringify({
        from: `TensorFeed Opportunities <${from}>`,
        to: [to],
        subject: payload.subject,
        html: payload.html,
        text: payload.text,
      }),
      signal: AbortSignal.timeout(10_000),
    });
    if (!res.ok) {
      console.error(`opportunity alert: Resend ${res.status}`);
      return false;
    }
    return true;
  } catch (err) {
    console.error('opportunity alert error:', err);
    return false;
  }
}

export interface AlertResult {
  ok: boolean;
  new_count: number;
  alert_worthy_count: number;
  emailed: boolean;
  reason?: string;
}

export async function checkAndSendOpportunityAlerts(
  env: Env,
  current: AgentOpportunitiesSnapshot,
): Promise<AlertResult> {
  const yesterday = isoDaysAgoUTC(1, new Date(current.capturedAt));
  const previous = await env.TENSORFEED_CACHE.get<AgentOpportunitiesSnapshot>(
    dailyKey(yesterday),
    'json',
  );
  if (!previous) {
    return { ok: true, new_count: 0, alert_worthy_count: 0, emailed: false, reason: 'no_previous_snapshot' };
  }
  const newOpps = findNewOpportunities(current.opportunities, previous.opportunities);
  const alertWorthy = filterAlertWorthy(newOpps);

  if (alertWorthy.length === 0) {
    return { ok: true, new_count: newOpps.length, alert_worthy_count: 0, emailed: false, reason: 'no_alert_worthy' };
  }

  const payload = buildAlertEmail(alertWorthy, current.date);
  const emailed = await sendAlertEmail(env as AlertEnv, payload);

  // Audit-log the alert run regardless of email send result. KV write
  // is single, idempotent per date.
  await env.TENSORFEED_CACHE.put(
    `opps:alert:${current.date}`,
    JSON.stringify({
      date: current.date,
      ranAt: new Date().toISOString(),
      new_count: newOpps.length,
      alert_worthy_count: alertWorthy.length,
      emailed,
      alert_worthy: alertWorthy.slice(0, ALERT_ITEM_CAP).map((o) => ({
        full_name: o.full_name,
        signal: o.signal,
        stars: o.stars,
      })),
    }),
  );

  return { ok: true, new_count: newOpps.length, alert_worthy_count: alertWorthy.length, emailed };
}
