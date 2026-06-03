/**
 * MCP activity dashboard data source.
 *
 * Powers the public /mcp/activity page + the /api/mcp/activity JSON
 * endpoint. Two signal sources:
 *
 *  1. npm download stats (primary signal) covers stdio agents who
 *     install via `npx -y @tensorfeed/...`. This is the dominant
 *     install path for Claude Desktop / Claude Code / Cline users.
 *     Fetched from api.npmjs.org with 1-hour cache.
 *
 *  2. Hosted /api/mcp tool calls (secondary signal) covers clients
 *     using the streamable-http transport (claude.ai, x402scan, etc).
 *     Counted in KV via recordHostedToolCall() called from mcp-http
 *     dispatchers. Best-effort: races between isolates may lose a
 *     few counts per minute, which is acceptable for an aggregate
 *     trend display.
 */

import type { Env } from './types';
import { safePut } from './kill-switch';

const NPM_PACKAGES = ['@tensorfeed/mcp-server', '@tensorfeed/x402-base-mcp'] as const;

const NPM_API_CACHE_KEY = (period: string, pkg: string) => `mcp:activity:npm:${period}:${pkg}`;
const NPM_API_CACHE_TTL_SECONDS = 60 * 60; // 1 hour

const HOSTED_COUNTER_KEY = (date: string) => `mcp:activity:counts:${date}`;
const HOSTED_COUNTER_KEEP_DAYS = 30;

export interface MCPActivitySnapshot {
  generated_at: string;
  packages: Array<{
    name: string;
    npm_url: string;
    downloads: {
      last_day: number | null;
      last_week: number | null;
      last_month: number | null;
    };
  }>;
  hosted_endpoint: {
    note: string;
    today_total: number;
    last_7d_total: number;
    last_30d_total: number;
    top_tools_7d: Array<{ tool: string; count: number; tier: 'free' | 'premium' | 'unknown' }>;
    daily_series_30d: Array<{ date: string; count: number }>;
  };
  attribution: string;
  next_steps: { agent_install: string; verify_signature: string; mcp_registry: string };
}

interface HostedDayCounts {
  // toolName -> {free, premium, errors}
  tools: Record<string, { free: number; premium: number; errors: number }>;
  total: number;
}

const EMPTY_DAY = (): HostedDayCounts => ({ tools: {}, total: 0 });

/**
 * Record a single hosted-endpoint tool call. Called from mcp-http
 * dispatch. Storage (2026-05-12 onward): Workers Analytics Engine.
 *
 * Migrated off the prior 2-KV-op-per-call read-modify-write counter
 * because that pattern scales linearly with MCP traffic growth and
 * would exhaust the KV bundle under any traction. AE is free with
 * Workers Paid (25M datapoints/mo) and purpose-built for per-event
 * telemetry; aggregations are computed at read time via the SQL API.
 *
 * Read back by buildHostedFromAE (getActivitySnapshot) via the SQL API,
 * grouping by index1 (tool) with SUM(_sample_interval) for exact counts.
 * npm download stats remain the dominant signal anyway, since stdio
 * (npx-installed) agents are the majority install path and never hit
 * the hosted endpoint.
 */
export async function recordHostedToolCall(
  env: Env,
  toolName: string,
  tier: 'free' | 'premium' | 'unknown',
  outcome: 'ok' | 'validation_error' | string,
): Promise<void> {
  if (!env.MCP_TOOL_CALLS_AE) return;
  try {
    env.MCP_TOOL_CALLS_AE.writeDataPoint({
      // index1 is the sampling key: tool name lets the aggregator group
      // by tool with sampling. Max 96 bytes.
      indexes: [toolName.slice(0, 96)],
      blobs: [
        tier,
        outcome.slice(0, 64),
        // YYYY-MM-DD for day-grain queries that need bucket alignment.
        new Date().toISOString().slice(0, 10),
      ],
      doubles: [
        // Epoch ms for finer-grain bucketing.
        Date.now(),
      ],
    });
  } catch {
    // Best-effort telemetry; never break the calling request path.
  }
}

interface NpmPointResponse {
  downloads?: number;
  start?: string;
  end?: string;
  package?: string;
}

async function fetchNpmDownloads(
  env: Env,
  period: 'last-day' | 'last-week' | 'last-month',
  pkg: string,
): Promise<number | null> {
  const cacheKey = NPM_API_CACHE_KEY(period, pkg);
  try {
    const cached = await env.TENSORFEED_CACHE.get(cacheKey);
    if (cached) {
      const parsed = JSON.parse(cached);
      if (typeof parsed?.downloads === 'number') return parsed.downloads;
    }
  } catch {
    // Fall through to fresh fetch
  }

  try {
    const url = `https://api.npmjs.org/downloads/point/${period}/${encodeURIComponent(pkg)}`;
    const res = await fetch(url, {
      headers: { 'user-agent': 'tensorfeed-mcp-activity/1.0' },
      signal: AbortSignal.timeout(8000),
    });
    if (!res.ok) return null;
    const data = (await res.json()) as NpmPointResponse;
    if (typeof data.downloads !== 'number') return null;
    await safePut(env, env.TENSORFEED_CACHE, cacheKey, JSON.stringify(data), {
      expirationTtl: NPM_API_CACHE_TTL_SECONDS,
    });
    return data.downloads;
  } catch {
    return null;
  }
}

async function readDayCounts(env: Env, date: string): Promise<HostedDayCounts> {
  try {
    const raw = await env.TENSORFEED_CACHE.get(HOSTED_COUNTER_KEY(date));
    if (!raw) return EMPTY_DAY();
    const parsed = JSON.parse(raw);
    if (parsed && typeof parsed === 'object' && parsed.tools && typeof parsed.total === 'number') {
      return parsed as HostedDayCounts;
    }
  } catch {
    // fall through
  }
  return EMPTY_DAY();
}

function dateMinus(days: number): string {
  const d = new Date();
  d.setUTCDate(d.getUTCDate() - days);
  return d.toISOString().slice(0, 10);
}

// Shared note describing what the hosted-endpoint counts represent.
const HOSTED_NOTE =
  'Counts here cover the streamable-http hosted endpoint at https://tensorfeed.ai/api/mcp. The majority of MCP usage is stdio (npx-installed) which runs entirely on the agent operator\'s machine and produces no traffic here; npm download counts above are the better install signal.';

type AeRow = Record<string, unknown>;

// Run one Analytics Engine SQL statement. Returns the data rows, or null when
// no CF token/account is configured or the request fails. Never throws.
async function runAeSql(env: Env, sql: string): Promise<AeRow[] | null> {
  if (!env.CF_ANALYTICS_TOKEN || !env.CF_ACCOUNT_ID) return null;
  try {
    const resp = await fetch(
      `https://api.cloudflare.com/client/v4/accounts/${env.CF_ACCOUNT_ID}/analytics_engine/sql`,
      {
        method: 'POST',
        headers: { Authorization: `Bearer ${env.CF_ANALYTICS_TOKEN}`, 'Content-Type': 'text/plain' },
        body: sql,
      },
    );
    if (!resp.ok) return null;
    const json = (await resp.json()) as { data?: AeRow[] };
    return json.data ?? null;
  } catch {
    return null;
  }
}

// Pure: the N most recent UTC date strings (YYYY-MM-DD), today first, derived
// from a given today string so aggregation is deterministic and testable.
export function lastNDatesUtc(today: string, n: number): string[] {
  const base = new Date(`${today}T00:00:00Z`).getTime();
  return Array.from({ length: n }, (_, i) => new Date(base - i * 86400000).toISOString().slice(0, 10));
}

// Pure: shape AE rows (per-tool calls grouped by tool+tier over 7d, daily
// totals over 30d) into the hosted_endpoint block. Counts arrive already
// sample-interval-weighted from the SQL SUM(_sample_interval).
export function aggregateHostedFromAeRows(
  toolRows: AeRow[],
  dayRows: AeRow[],
  today: string,
): MCPActivitySnapshot['hosted_endpoint'] {
  const toolAcc = new Map<string, { free: number; premium: number }>();
  for (const r of toolRows) {
    const tool = String(r.tool ?? '');
    if (!tool) continue;
    const calls = Number(r.calls) || 0;
    const acc = toolAcc.get(tool) ?? { free: 0, premium: 0 };
    if (String(r.tier ?? '') === 'premium') acc.premium += calls;
    else acc.free += calls;
    toolAcc.set(tool, acc);
  }
  const top_tools_7d = Array.from(toolAcc.entries())
    .map(([tool, a]) => ({
      tool,
      count: a.free + a.premium,
      tier: (a.premium > a.free ? 'premium' : a.free > 0 ? 'free' : 'unknown') as 'free' | 'premium' | 'unknown',
    }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 10);

  const dayMap = new Map<string, number>();
  for (const r of dayRows) {
    const day = String(r.day ?? '');
    if (day) dayMap.set(day, Number(r.calls) || 0);
  }
  const dates = lastNDatesUtc(today, HOSTED_COUNTER_KEEP_DAYS); // today-first
  let last30dTotal = 0;
  let last7dTotal = 0;
  for (let i = 0; i < dates.length; i++) {
    const c = dayMap.get(dates[i]) ?? 0;
    last30dTotal += c;
    if (i < 7) last7dTotal += c;
  }
  const daily_series_30d = dates.map((date) => ({ date, count: dayMap.get(date) ?? 0 })).reverse();

  return {
    note: HOSTED_NOTE,
    today_total: dayMap.get(today) ?? 0,
    last_7d_total: last7dTotal,
    last_30d_total: last30dTotal,
    top_tools_7d,
    daily_series_30d,
  };
}

// Read hosted-endpoint counts from Analytics Engine. Returns null (caller
// falls back to legacy KV) only when AE is unconfigured/unreachable; an empty
// dataset returns a zeroed-but-valid block (AE is the source of truth).
async function buildHostedFromAE(env: Env, today: string): Promise<MCPActivitySnapshot['hosted_endpoint'] | null> {
  // Two reads. The tool breakdown is a rolling 7x24h window on the AE built-in
  // timestamp; the daily series buckets on blob3 (the writer's UTC date) and
  // queries 31 days so the oldest of the 30 rendered buckets is fully covered
  // (rows outside the 30-date set are simply never read from the day map).
  // The per-tool 7d window and last_7d_total use different time bases, so their
  // sums are not expected to reconcile exactly; that is fine for a trend view.
  const [toolRows, dayRows] = await Promise.all([
    runAeSql(
      env,
      "SELECT index1 AS tool, blob1 AS tier, SUM(_sample_interval) AS calls FROM tf_mcp_tool_calls WHERE timestamp > NOW() - INTERVAL '7' DAY GROUP BY tool, tier ORDER BY calls DESC LIMIT 200",
    ),
    runAeSql(
      env,
      "SELECT blob3 AS day, SUM(_sample_interval) AS calls FROM tf_mcp_tool_calls WHERE timestamp > NOW() - INTERVAL '31' DAY GROUP BY day ORDER BY day",
    ),
  ]);
  // If EITHER leg failed (a single-leg AE 429/500 is the common transient),
  // treat it as a full AE miss and defer to KV. A half-zeroed AE block would be
  // self-contradicting: populated top_tools_7d beside all-zero totals, or the
  // reverse. All-or-nothing keeps the snapshot internally honest.
  if (toolRows === null || dayRows === null) return null;
  return aggregateHostedFromAeRows(toolRows, dayRows, today);
}

// Legacy fallback: read hosted-endpoint counts from the KV daily counters.
// recordHostedToolCall stopped writing these on 2026-05-12, so in production
// this returns zeros; it exists only for envs with no CF analytics token.
async function buildHostedFromKV(env: Env, today: string): Promise<MCPActivitySnapshot['hosted_endpoint']> {
  const dailySeries: Array<{ date: string; count: number }> = [];
  const toolTotals = new Map<string, { count: number; premium: number; free: number }>();
  let last7dTotal = 0;
  let last30dTotal = 0;
  let todayTotal = 0;
  for (let i = 0; i < HOSTED_COUNTER_KEEP_DAYS; i++) {
    const date = dateMinus(i);
    const day = await readDayCounts(env, date);
    dailySeries.push({ date, count: day.total });
    last30dTotal += day.total;
    if (i < 7) last7dTotal += day.total;
    if (date === today) todayTotal = day.total;
    for (const [tool, t] of Object.entries(day.tools)) {
      const acc = toolTotals.get(tool) ?? { count: 0, premium: 0, free: 0 };
      acc.count += t.free + t.premium;
      acc.premium += t.premium;
      acc.free += t.free;
      toolTotals.set(tool, acc);
    }
  }
  const top_tools_7d = Array.from(toolTotals.entries())
    .map(([tool, acc]) => ({
      tool,
      count: acc.count,
      tier: (acc.premium > acc.free ? 'premium' : acc.free > 0 ? 'free' : 'unknown') as 'free' | 'premium' | 'unknown',
    }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 10);
  return {
    note: HOSTED_NOTE,
    today_total: todayTotal,
    last_7d_total: last7dTotal,
    last_30d_total: last30dTotal,
    top_tools_7d,
    daily_series_30d: dailySeries.reverse(),
  };
}

export async function getActivitySnapshot(env: Env): Promise<MCPActivitySnapshot> {
  const today = new Date().toISOString().slice(0, 10);

  // Parallel npm fetches: 3 periods x 2 packages = 6 calls
  const npmResults = await Promise.all(
    NPM_PACKAGES.flatMap((pkg) =>
      (['last-day', 'last-week', 'last-month'] as const).map(async (period) => ({
        pkg,
        period,
        count: await fetchNpmDownloads(env, period, pkg),
      })),
    ),
  );

  const packages = NPM_PACKAGES.map((pkg) => {
    const lookup = (period: string) => npmResults.find((r) => r.pkg === pkg && r.period === period)?.count ?? null;
    return {
      name: pkg,
      npm_url: `https://www.npmjs.com/package/${pkg}`,
      downloads: {
        last_day: lookup('last-day'),
        last_week: lookup('last-week'),
        last_month: lookup('last-month'),
      },
    };
  });

  // Hosted-endpoint counts: read from Analytics Engine (the real source since
  // 2026-05-12). Fall back to the legacy KV daily counters only when AE is not
  // configured or unreachable (e.g. a local/test env with no CF token).
  const aeHosted = await buildHostedFromAE(env, today);
  const hosted_endpoint = aeHosted ?? (await buildHostedFromKV(env, today));
  const hostedSource = aeHosted
    ? 'Workers Analytics Engine (tf_mcp_tool_calls), aggregated at read time via the SQL API with sample-interval weighting'
    : 'legacy KV daily aggregates (Analytics Engine unavailable)';

  return {
    generated_at: new Date().toISOString(),
    packages,
    hosted_endpoint,
    attribution: `Source: api.npmjs.org for download counts (cached 1h). Hosted-endpoint tool calls from ${hostedSource}.`,
    next_steps: {
      agent_install: 'npx -y @tensorfeed/x402-base-mcp',
      verify_signature: 'npm audit signatures @tensorfeed/x402-base-mcp',
      mcp_registry: 'https://registry.modelcontextprotocol.io/v0/servers/ai.tensorfeed/x402-base-mcp',
    },
  };
}
