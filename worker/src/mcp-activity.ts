/**
 * MCP activity dashboard data source.
 *
 * Powers the public /mcp/activity page + the /api/mcp/activity JSON
 * endpoint. Two signal sources:
 *
 *  1. npm download stats (primary signal) — covers stdio agents who
 *     install via `npx -y @tensorfeed/...`. This is the dominant
 *     install path for Claude Desktop / Claude Code / Cline users.
 *     Fetched from api.npmjs.org with 1-hour cache.
 *
 *  2. Hosted /api/mcp tool calls (secondary signal) — covers clients
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
 * dispatch. Read-modify-write on a daily KV key; racy across isolates
 * but acceptable for an aggregate counter.
 *
 * Cost: 2 KV ops per tool call (one read + one write). At TF's
 * current hosted-endpoint volume this is well under the Workers Paid
 * free bundle. The kill switch protects against runaway cost.
 */
export async function recordHostedToolCall(
  env: Env,
  toolName: string,
  tier: 'free' | 'premium' | 'unknown',
  outcome: 'ok' | 'validation_error' | string,
): Promise<void> {
  try {
    const date = new Date().toISOString().slice(0, 10);
    const key = HOSTED_COUNTER_KEY(date);
    const raw = await env.TENSORFEED_CACHE.get(key);
    let day: HostedDayCounts;
    if (raw) {
      try {
        const parsed = JSON.parse(raw);
        if (parsed && typeof parsed === 'object' && parsed.tools && typeof parsed.total === 'number') {
          day = parsed as HostedDayCounts;
        } else {
          day = EMPTY_DAY();
        }
      } catch {
        day = EMPTY_DAY();
      }
    } else {
      day = EMPTY_DAY();
    }
    if (!day.tools[toolName]) {
      day.tools[toolName] = { free: 0, premium: 0, errors: 0 };
    }
    const tt = day.tools[toolName]!;
    if (tier === 'premium') tt.premium += 1;
    else tt.free += 1;
    if (outcome !== 'ok') tt.errors += 1;
    day.total += 1;
    await safePut(env, env.TENSORFEED_CACHE, key, JSON.stringify(day), {
      expirationTtl: HOSTED_COUNTER_KEEP_DAYS * 24 * 60 * 60,
    });
  } catch {
    // Best-effort counter; never break the calling request path
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

  // Hosted endpoint daily series (last 30 days)
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
    if (i === 0) todayTotal = day.total;
    for (const [tool, t] of Object.entries(day.tools)) {
      const acc = toolTotals.get(tool) ?? { count: 0, premium: 0, free: 0 };
      acc.count += t.free + t.premium;
      acc.premium += t.premium;
      acc.free += t.free;
      toolTotals.set(tool, acc);
    }
  }
  // Last-7d top tools
  const last7Days = new Set(Array.from({ length: 7 }, (_, i) => dateMinus(i)));
  const topTools7d: Array<{ tool: string; count: number; tier: 'free' | 'premium' | 'unknown' }> = [];
  for (const [tool, acc] of toolTotals.entries()) {
    const tier: 'free' | 'premium' | 'unknown' = acc.premium > acc.free ? 'premium' : acc.free > 0 ? 'free' : 'unknown';
    topTools7d.push({ tool, count: acc.count, tier });
  }
  topTools7d.sort((a, b) => b.count - a.count);

  return {
    generated_at: new Date().toISOString(),
    packages,
    hosted_endpoint: {
      note:
        'Counts here cover the streamable-http hosted endpoint at https://tensorfeed.ai/api/mcp. The majority of MCP usage is stdio (npx-installed) which runs entirely on the agent operator\'s machine and produces no traffic here; npm download counts above are the better install signal.',
      today_total: todayTotal,
      last_7d_total: last7dTotal,
      last_30d_total: last30dTotal,
      top_tools_7d: topTools7d.slice(0, 10),
      daily_series_30d: dailySeries.reverse(),
    },
    attribution:
      'Source: api.npmjs.org for download counts (cached 1h); TF Worker KV counters for hosted endpoint tool calls (best-effort, may undercount on isolate races).',
    next_steps: {
      agent_install: 'npx -y @tensorfeed/x402-base-mcp',
      verify_signature: 'npm audit signatures @tensorfeed/x402-base-mcp',
      mcp_registry: 'https://registry.modelcontextprotocol.io/v0/servers/ai.tensorfeed/x402-base-mcp',
    },
  };
}
