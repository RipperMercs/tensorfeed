/**
 * x402 Registry: live index of x402-compatible publishers.
 *
 * Why this exists
 * ---------------
 * Curated awesome-lists are stale within weeks. The x402 spec already
 * defines a discovery manifest at `/.well-known/x402`. The Registry crawls
 * a seed list of domains, fetches each manifest, validates the canonical
 * fields, and exposes a normalized snapshot at `/api/x402-registry/snapshot`
 * plus a web view at `/x402-registry`.
 *
 * Each domain's status (ok / not_found / fetch_error / invalid_json /
 * invalid_schema / http_error) is preserved in the snapshot so consumers
 * can see what's actually live versus what's claimed.
 *
 * What this is NOT
 * ----------------
 * - Not a curated marketing list. Inclusion criterion is "publishes a
 *   valid /.well-known/x402"; it is not a TensorFeed endorsement of the
 *   publisher.
 * - Not a payment verification service. We surface payment.wallet and
 *   accepts.network as the publisher declared them. Agents must still
 *   verify on-chain before sending funds (cross-checking with
 *   publisher.validation.publishedAt locations is the standard pattern).
 * - Not an MCP server registry. That's already at /api/mcp/registry/snapshot.
 *
 * Storage layout (TENSORFEED_CACHE):
 * - `x402-reg:latest`            current snapshot served by the free endpoint
 * - `x402-reg:daily:{YYYY-MM-DD}` dated copy for future premium series
 * - `x402-reg:index`             ordered list of dates with snapshots
 *
 * Cron cadence: daily. Cheap and on the right side of the freshness/
 * politeness tradeoff for crawling arbitrary third-party manifests.
 */

import { Env } from './types';
import { sanitizeTitle, sanitizeSnippet } from './sanitize';

// ── Constants ───────────────────────────────────────────────────────

const LATEST_KEY = 'x402-reg:latest';
const INDEX_KEY = 'x402-reg:index';
const dailyKey = (date: string) => `x402-reg:daily:${date}`;

const FETCH_TIMEOUT_MS = 15000;
const USER_AGENT = 'TensorFeedX402Registry/1.0 (+https://tensorfeed.ai/x402-registry)';

/**
 * Seed list of domains to crawl. AFTA federation members start; manually
 * add more domains as they're discovered to publish /.well-known/x402.
 *
 * `federation_member: true` is a TF-asserted flag, not a manifest field.
 * It only appears on domains that are part of the AFTA federation by
 * mutual agreement (currently TensorFeed + TerminalFeed).
 */
interface SeedEntry {
  domain: string;
  federation_member: boolean;
  notes?: string;
}

const SEED_DOMAINS: SeedEntry[] = [
  { domain: 'tensorfeed.ai', federation_member: true },
  { domain: 'terminalfeed.io', federation_member: true },
];

export const X402_REGISTRY_ATTRIBUTION = {
  source: 'TensorFeed x402 Registry',
  source_url: 'https://tensorfeed.ai/x402-registry',
  license:
    'TF-aggregated registry of x402 publishers. Underlying manifests are owned by their publishers and served at /.well-known/x402. TF surfaces a normalized view; inclusion is not an endorsement and agents should still verify wallet addresses on-chain and against publisher.validation.publishedAt before sending funds.',
  source_url_per_entry: 'https://{domain}/.well-known/x402',
  refresh_cadence: 'daily',
};

// ── Types ───────────────────────────────────────────────────────────

export type EntryStatus = 'ok' | 'not_found' | 'fetch_error' | 'invalid_json' | 'invalid_schema' | 'http_error';

export interface AcceptsSummary {
  scheme: string;
  network: string;
  asset_symbol: string;
  count: number;
}

export interface RegistryEntry {
  domain: string;
  manifest_url: string;
  fetched_at: string;
  status: EntryStatus;
  http_status?: number;
  error?: string;
  // Asserted by TF (not from the manifest)
  federation_member: boolean;
  // Extracted summary (present when status === 'ok')
  x402_version?: number;
  publisher_name?: string;
  publisher_description?: string;
  publisher_url?: string;
  docs_url?: string;
  llms_txt_url?: string;
  agent_fair_trade_declared?: boolean;
  paid_endpoints_count?: number;
  free_endpoints_count?: number;
  payment_wallet?: string;
  payment_asset_symbol?: string;
  accepts_summary?: AcceptsSummary[];
}

export interface RegistrySnapshot {
  fetched_at: string;
  total: number;
  ok_count: number;
  error_count: number;
  federation_count: number;
  by_network: Record<string, number>;
  entries: RegistryEntry[];
  attribution: typeof X402_REGISTRY_ATTRIBUTION;
}

// ── Crawl ───────────────────────────────────────────────────────────

async function fetchManifest(domain: string): Promise<{
  status: EntryStatus;
  http_status?: number;
  error?: string;
  body?: unknown;
}> {
  const url = `https://${domain}/.well-known/x402`;
  let resp: Response;
  try {
    resp = await fetch(url, {
      headers: { 'User-Agent': USER_AGENT, Accept: 'application/json' },
      signal: AbortSignal.timeout(FETCH_TIMEOUT_MS),
      redirect: 'follow',
    });
  } catch (e) {
    return { status: 'fetch_error', error: e instanceof Error ? e.message : String(e) };
  }
  if (resp.status === 404) {
    return { status: 'not_found', http_status: 404 };
  }
  if (!resp.ok) {
    return { status: 'http_error', http_status: resp.status };
  }
  let body: unknown;
  try {
    body = await resp.json();
  } catch {
    return { status: 'invalid_json', http_status: resp.status };
  }
  return { status: 'ok', http_status: resp.status, body };
}

// Mostly lenient schema check: we want to surface the fields we care about,
// and an absent payment block is a soft signal (the publisher might have
// items without a top-level payment summary). We require x402Version + at
// least one of (items, freeEndpoints, payment) to count as a valid manifest.
function isPlausibleX402Manifest(m: unknown): m is Record<string, unknown> {
  if (!m || typeof m !== 'object') return false;
  const v = (m as Record<string, unknown>).x402Version;
  if (typeof v !== 'number') return false;
  const hasItems = Array.isArray((m as Record<string, unknown>).items);
  const hasFree = Array.isArray((m as Record<string, unknown>).freeEndpoints);
  const hasPayment = typeof (m as Record<string, unknown>).payment === 'object';
  return hasItems || hasFree || hasPayment;
}

function summarizeAccepts(items: unknown[]): AcceptsSummary[] {
  const seen = new Map<string, AcceptsSummary>();
  for (const item of items) {
    if (!item || typeof item !== 'object') continue;
    const accepts = (item as Record<string, unknown>).accepts;
    if (!Array.isArray(accepts)) continue;
    for (const a of accepts) {
      if (!a || typeof a !== 'object') continue;
      const ao = a as Record<string, unknown>;
      const scheme = typeof ao.scheme === 'string' ? ao.scheme : 'unknown';
      const network = typeof ao.network === 'string' ? ao.network : 'unknown';
      const extra = ao.extra as Record<string, unknown> | undefined;
      const asset_symbol =
        typeof extra?.name === 'string' && extra.name === 'USD Coin' ? 'USDC' :
        typeof ao.assetSymbol === 'string' ? ao.assetSymbol : 'unknown';
      const key = `${scheme}|${network}|${asset_symbol}`;
      const cur = seen.get(key);
      if (cur) {
        cur.count += 1;
      } else {
        seen.set(key, { scheme, network, asset_symbol, count: 1 });
      }
    }
  }
  return [...seen.values()].sort((a, b) => b.count - a.count);
}

function normalizeEntry(seed: SeedEntry, fetched_at: string, raw: Awaited<ReturnType<typeof fetchManifest>>): RegistryEntry {
  const base: RegistryEntry = {
    domain: seed.domain,
    manifest_url: `https://${seed.domain}/.well-known/x402`,
    fetched_at,
    status: raw.status,
    federation_member: seed.federation_member,
  };
  if (raw.http_status != null) base.http_status = raw.http_status;
  if (raw.error) base.error = raw.error;

  if (raw.status !== 'ok' || !raw.body) return base;

  if (!isPlausibleX402Manifest(raw.body)) {
    return { ...base, status: 'invalid_schema' };
  }
  const m = raw.body as Record<string, unknown>;

  const publisher = (m.publisher as Record<string, unknown>) || {};
  const payment = (m.payment as Record<string, unknown>) || {};
  const items = Array.isArray(m.items) ? (m.items as unknown[]) : [];
  const free = Array.isArray(m.freeEndpoints) ? (m.freeEndpoints as unknown[]) : [];

  const publisher_name = typeof publisher.name === 'string' ? sanitizeTitle(publisher.name) : undefined;
  const publisher_description = typeof publisher.description === 'string' ? sanitizeSnippet(publisher.description) : undefined;
  const publisher_url = typeof publisher.url === 'string' ? publisher.url : undefined;
  const docs_url = typeof publisher.docs === 'string' ? publisher.docs : undefined;
  const llms_txt_url = typeof publisher.llmsTxt === 'string' ? publisher.llmsTxt : undefined;
  const agent_fair_trade_declared = typeof publisher.agent_fair_trade === 'string' && publisher.agent_fair_trade.length > 0;
  const payment_wallet = typeof payment.wallet === 'string' ? payment.wallet : undefined;
  const payment_asset_symbol = typeof payment.assetSymbol === 'string' ? payment.assetSymbol : undefined;

  return {
    ...base,
    x402_version: typeof m.x402Version === 'number' ? m.x402Version : undefined,
    publisher_name,
    publisher_description,
    publisher_url,
    docs_url,
    llms_txt_url,
    agent_fair_trade_declared,
    paid_endpoints_count: items.length,
    free_endpoints_count: free.length,
    payment_wallet,
    payment_asset_symbol,
    accepts_summary: summarizeAccepts(items),
  };
}

// ── Refresh ─────────────────────────────────────────────────────────

export interface RefreshOptions {
  /** Delay between sequential seed-domain fetches (politeness). Default 800ms. */
  crawlDelayMs?: number;
}

export async function refreshX402Registry(env: Env, opts: RefreshOptions = {}): Promise<RegistrySnapshot> {
  const fetched_at = new Date().toISOString();
  const entries: RegistryEntry[] = [];
  const delayMs = opts.crawlDelayMs ?? 800;

  // Crawl seeds sequentially with a small delay; we are hitting third-party
  // sites and shouldn't fan-out aggressively. ~1 req/sec is the right
  // politeness ceiling for a daily crawl of a tiny seed list.
  for (const seed of SEED_DOMAINS) {
    const raw = await fetchManifest(seed.domain);
    entries.push(normalizeEntry(seed, fetched_at, raw));
    if (delayMs > 0) {
      await new Promise((r) => setTimeout(r, delayMs));
    }
  }

  const ok_count = entries.filter((e) => e.status === 'ok').length;
  const federation_count = entries.filter((e) => e.federation_member && e.status === 'ok').length;
  const by_network: Record<string, number> = {};
  for (const e of entries) {
    for (const a of e.accepts_summary || []) {
      by_network[a.network] = (by_network[a.network] || 0) + 1;
    }
  }

  const snapshot: RegistrySnapshot = {
    fetched_at,
    total: entries.length,
    ok_count,
    error_count: entries.length - ok_count,
    federation_count,
    by_network,
    entries,
    attribution: X402_REGISTRY_ATTRIBUTION,
  };

  // Store
  const date = fetched_at.slice(0, 10);
  await env.TENSORFEED_CACHE.put(LATEST_KEY, JSON.stringify(snapshot));
  await env.TENSORFEED_CACHE.put(dailyKey(date), JSON.stringify(snapshot));
  // Maintain the dates index, dedupe + sort
  const existing = await env.TENSORFEED_CACHE.get<string[]>(INDEX_KEY, 'json');
  const dates = new Set(existing || []);
  dates.add(date);
  await env.TENSORFEED_CACHE.put(INDEX_KEY, JSON.stringify([...dates].sort()));

  return snapshot;
}

// ── Read paths ──────────────────────────────────────────────────────

export async function getLatestX402Registry(env: Env): Promise<RegistrySnapshot | null> {
  return (await env.TENSORFEED_CACHE.get<RegistrySnapshot>(LATEST_KEY, 'json')) ?? null;
}
