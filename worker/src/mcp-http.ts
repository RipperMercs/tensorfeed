/**
 * HTTP MCP server.
 *
 * Implements the Model Context Protocol over JSON-RPC 2.0 / HTTP for
 * the TensorFeed Worker. Companion to the existing stdio-based MCP
 * server published at @tensorfeed/mcp-server on npm; the stdio server
 * stays the canonical client-side install, this HTTP version is the
 * canonical server-hosted entrypoint that fits the
 * `type: "http"` MCP-server pattern that Anthropic's vertical agent
 * repos (claude-for-financial-services et al) and other MCP marketplaces
 * standardize on.
 *
 * V1 scope: a curated 12-tool set covering the financial-services
 * use case (SEC EDGAR + EIA economic data + SEC company tickers)
 * plus the broader security/news/models surface for general
 * discoverability. All tools are free in V1; premium tools land in
 * V2 once the HTTP transport itself is shaken out in production.
 *
 * Spec reference: MCP 2024-11-05 (Streamable HTTP transport).
 * https://modelcontextprotocol.io/specification/2024-11-05/basic/transports
 *
 * Endpoint: POST /api/mcp with JSON-RPC 2.0 envelope.
 * Methods supported:
 *   - initialize             handshake; returns server info + capabilities
 *   - notifications/initialized  no-op acknowledgment
 *   - tools/list             returns the V1 tool catalog
 *   - tools/call             dispatches by name
 *   - ping                   liveness probe
 */

import type { Env } from './types';
import { recordHostedToolCall } from './mcp-activity';
import { fetchCVE } from './security-cve';
import { readKEVCurrent, summarizeKEVForFreeTier } from './security-kev';
import { fetchEPSSCurrent } from './security-epss';
import { fetchOSVForPackage, fetchOSVById } from './security-osv';
import { getAiSupplyChainIocs } from './ai-supply-chain-iocs';
import {
  getReputationCardByToken,
  getReputationCardByWallet,
} from './agent-reputation-store';
import { getClientIP, peekFreeTrialQuota, FREE_TRIAL_DEFAULTS } from './rate-limit';
import { submitWantlistItem, WANTLIST_DEFAULTS } from './wantlist';
import {
  createFreeWatch,
  FREE_FIRE_CAP,
  FREE_PER_IP_WATCH_CAP,
  FREE_WATCH_TTL_SECONDS,
} from './watches';
import {
  parseEdgarSearchQuery,
  searchEdgar,
  fetchEdgarSubmissions,
  type EdgarSearchQuery,
} from './finance-sec-edgar';
import {
  fetchEIASeries,
  isEIARoute,
  EIA_ROUTES,
  parseEIAQuery,
} from './economy-eia';
import {
  fetchUSGSEarthquakes,
  USGS_VALID_MAGNITUDES,
  USGS_VALID_PERIODS,
} from './climate-usgs-earthquakes';
import {
  parseNWSAlertsQuery,
  fetchNWSAlerts,
  NWS_VALID_SEVERITIES,
  NWS_VALID_URGENCIES,
  NWS_VALID_STATUSES,
} from './climate-nws-alerts';
import { getLatestSnapshot as getPapersLatest } from './papers';
import { getLatestSnapshot as getArxivLatest } from './arxiv';
import { getLatestSnapshot as getHFDailyPapersLatest } from './hf-daily-papers';
import { readSECTicker } from './sec-tickers';
import { parseOsvPackageQuery } from './security-osv';
import { parseFDAQuery, fetchFDAQuery, FDA_CATEGORIES } from './health-fda';

const PROTOCOL_VERSION = '2024-11-05';
const SERVER_NAME = 'tensorfeed';
const SERVER_VERSION = '1.0.0';

// JSON-RPC 2.0 standard error codes
const ERR_PARSE = -32700;
const ERR_INVALID_REQUEST = -32600;
const ERR_METHOD_NOT_FOUND = -32601;
const ERR_INVALID_PARAMS = -32602;
const ERR_INTERNAL = -32603;

interface JsonRpcRequest {
  jsonrpc: '2.0';
  id?: string | number | null;
  method: string;
  params?: unknown;
}

interface JsonRpcSuccess {
  jsonrpc: '2.0';
  id: string | number | null;
  result: unknown;
}

interface JsonRpcError {
  jsonrpc: '2.0';
  id: string | number | null;
  error: { code: number; message: string; data?: unknown };
}

type JsonRpcResponse = JsonRpcSuccess | JsonRpcError;

interface McpToolDef {
  name: string;
  description: string;
  inputSchema: Record<string, unknown>;
  // Async handler returning the raw result data (will be serialized into
  // MCP content[] before being returned).
  // Third arg is the dispatch context (env + bearerToken + ip);
  // pre-existing handlers may ignore it. IP-keyed tools read ctx.ip.
  handler: (env: Env, args: Record<string, unknown>, ctx?: { ip: string; bearerToken: string | null }) => Promise<unknown>;
  tier: 'free' | 'premium';
}

// ── Helpers ─────────────────────────────────────────────────────────

function rpcSuccess(id: string | number | null, result: unknown): JsonRpcSuccess {
  return { jsonrpc: '2.0', id, result };
}

function rpcError(
  id: string | number | null,
  code: number,
  message: string,
  data?: unknown,
): JsonRpcError {
  return { jsonrpc: '2.0', id, error: { code, message, ...(data !== undefined ? { data } : {}) } };
}

function mcpContent(payload: unknown): { content: Array<{ type: 'text'; text: string }> } {
  const text =
    typeof payload === 'string' ? payload : JSON.stringify(payload, null, 2);
  return { content: [{ type: 'text', text }] };
}

function getStringArg(args: Record<string, unknown>, key: string): string | null {
  const v = args[key];
  return typeof v === 'string' ? v : null;
}

function getNumberArg(args: Record<string, unknown>, key: string): number | null {
  const v = args[key];
  if (typeof v === 'number' && Number.isFinite(v)) return v;
  if (typeof v === 'string') {
    const n = parseFloat(v);
    return Number.isFinite(n) ? n : null;
  }
  return null;
}

// ── Tool catalog ────────────────────────────────────────────────────

const TOOLS: McpToolDef[] = [
  // ─── News + AI ecosystem ──────────────────────────────────────────
  {
    name: 'get_news_articles',
    description:
      'Get the latest AI news articles aggregated from 12+ sources (Anthropic, OpenAI, Google, HuggingFace, TechCrunch, The Verge, Hacker News, etc). Polled every 10 min, deduplicated, sanitized for prompt injection. Returns up to 200 articles with title, snippet, source, and publishedAt.',
    inputSchema: {
      type: 'object',
      properties: {
        limit: { type: 'number', description: 'Max articles to return (1-200)', default: 25 },
        category: {
          type: 'string',
          description: 'Optional category filter (e.g. models, business, research)',
        },
      },
    },
    tier: 'free',
    handler: async (env, args) => {
      const limit = Math.max(1, Math.min(getNumberArg(args, 'limit') ?? 25, 200));
      const articles = (await env.TENSORFEED_NEWS.get<unknown>('articles', 'json')) ?? [];
      const list = Array.isArray(articles) ? articles : [];
      const category = getStringArg(args, 'category')?.toLowerCase();
      let filtered = list;
      if (category) {
        filtered = list.filter(
          (a) =>
            Array.isArray((a as { categories?: unknown[] }).categories) &&
            ((a as { categories: unknown[] }).categories as unknown[])
              .map((c) => String(c).toLowerCase())
              .includes(category),
        );
      }
      return {
        ok: true,
        count: Math.min(filtered.length, limit),
        articles: filtered.slice(0, limit),
      };
    },
  },
  {
    name: 'get_status_summary',
    description:
      'Get the live operational status of every major AI service tracked by TensorFeed (Claude, ChatGPT, Gemini, Perplexity, Cohere, Mistral, HuggingFace, Replicate, Midjourney, etc). Polled every 2 min. Returns operational | degraded | down per service plus the most recent incident.',
    inputSchema: { type: 'object', properties: {} },
    tier: 'free',
    handler: async (env) => {
      const summary = await env.TENSORFEED_STATUS.get<unknown>('summary', 'json');
      return summary ?? { ok: false, error: 'no_status_data_yet' };
    },
  },
  {
    name: 'get_models',
    description:
      'Get the model pricing and specs catalog across providers (Anthropic, OpenAI, Google, Meta, Mistral, Cohere, etc). Includes per-token pricing, context windows, capabilities, deprecation flags. Refreshed daily.',
    inputSchema: { type: 'object', properties: {} },
    tier: 'free',
    handler: async (env) => {
      const data = await env.TENSORFEED_CACHE.get<unknown>('catalog:models', 'json');
      return data ?? { ok: false, error: 'no_models_data_yet' };
    },
  },

  // ─── Security data trio ───────────────────────────────────────────
  {
    name: 'get_cve_record',
    description:
      'Look up a single CVE Record v5.2 from the MITRE CVE List by ID (e.g. CVE-2024-3094). Lazy-fetched and cached 7 days. License: MITRE CVE Terms of Use, commercial redistribution permitted; the response includes the standard attribution block.',
    inputSchema: {
      type: 'object',
      properties: {
        cve_id: {
          type: 'string',
          description: 'CVE identifier in CVE-YYYY-NNNNN form, case-insensitive',
        },
      },
      required: ['cve_id'],
    },
    tier: 'free',
    handler: async (env, args) => {
      const id = getStringArg(args, 'cve_id');
      if (!id) throw new ValidationError('cve_id is required');
      const result = await fetchCVE(env, id);
      return result;
    },
  },
  {
    name: 'get_kev_catalog',
    description:
      'Get the CISA Known Exploited Vulnerabilities (KEV) catalog. Returns the most recent N entries plus catalog metadata. Refreshed daily at 06:30 UTC. License: US Government public domain. ~1500 actively-exploited CVEs.',
    inputSchema: {
      type: 'object',
      properties: {
        limit: { type: 'number', description: 'Top-N most-recent entries (1-50)', default: 25 },
      },
    },
    tier: 'free',
    handler: async (env, args) => {
      const limit = Math.max(1, Math.min(getNumberArg(args, 'limit') ?? 25, 50));
      const catalog = await readKEVCurrent(env);
      if (!catalog) {
        return { ok: false, error: 'kev_not_yet_captured' };
      }
      return summarizeKEVForFreeTier(catalog, limit);
    },
  },
  {
    name: 'get_epss_score',
    description:
      'Get the EPSS (Exploit Prediction Scoring System) probability for one CVE, sourced from FIRST.org. Returns the daily probability (0-1) that the CVE will be exploited in the next 30 days plus a percentile rank. License: FIRST.org free-for-any-use.',
    inputSchema: {
      type: 'object',
      properties: {
        cve_id: { type: 'string', description: 'CVE identifier in CVE-YYYY-NNNNN form' },
      },
      required: ['cve_id'],
    },
    tier: 'free',
    handler: async (env, args) => {
      const id = getStringArg(args, 'cve_id');
      if (!id) throw new ValidationError('cve_id is required');
      return await fetchEPSSCurrent(env, id);
    },
  },
  {
    name: 'get_osv_advisory_for_package',
    description:
      'Cross-ecosystem vulnerability advisory lookup via OSV.dev. Given an ecosystem (PyPI, npm, Go, crates.io, Maven, NuGet, RubyGems, Packagist, etc) and a package name (optional version), returns advisories affecting that package. License: Apache 2.0.',
    inputSchema: {
      type: 'object',
      properties: {
        ecosystem: {
          type: 'string',
          description: 'OSV ecosystem identifier (PyPI, npm, Go, crates.io, etc)',
        },
        name: { type: 'string', description: 'Package name' },
        version: { type: 'string', description: 'Optional package version' },
      },
      required: ['ecosystem', 'name'],
    },
    tier: 'free',
    handler: async (env, args) => {
      // Reuse the REST endpoint's parser so the same regex validators
      // (ECOSYSTEM_RE, PKG_NAME_RE, VERSION_RE) apply to MCP traffic.
      const url = new URL('https://tensorfeed.ai/api/security/osv/package');
      const ecosystem = getStringArg(args, 'ecosystem');
      const name = getStringArg(args, 'name');
      const version = getStringArg(args, 'version');
      if (ecosystem !== null) url.searchParams.set('ecosystem', ecosystem);
      if (name !== null) url.searchParams.set('name', name);
      if (version !== null) url.searchParams.set('version', version);
      const parsed = parseOsvPackageQuery(url);
      if (!parsed.ok) throw new ValidationError(`${parsed.error}: ${parsed.hint}`);
      return await fetchOSVForPackage(env, parsed.query);
    },
  },
  {
    name: 'get_osv_advisory_by_id',
    description:
      'Look up a single OSV.dev advisory by ID. Accepts GHSA / CVE / PYSEC / RUSTSEC / GO / OSV / DSA / ALPINE / DEBIAN / UBUNTU and other documented identifier prefixes. License: Apache 2.0.',
    inputSchema: {
      type: 'object',
      properties: {
        id: {
          type: 'string',
          description: 'Advisory ID, e.g. GHSA-r75f-5x8p-qvmc or CVE-2024-3094',
        },
      },
      required: ['id'],
    },
    tier: 'free',
    handler: async (env, args) => {
      const id = getStringArg(args, 'id');
      if (!id) throw new ValidationError('id is required');
      return await fetchOSVById(env, id);
    },
  },
  {
    name: 'check_ai_supply_chain_risk',
    description:
      'Check the TensorFeed AI/MCP/LLM supply-chain IOC feed. Returns publicly-disclosed malicious npm/PyPI packages whose name or summary signals relevance to AI agent operators. With no args, returns the whole snapshot (typically a small number of entries). With "package_name", returns only entries matching that name (substring, case-insensitive) so an agent can ask "is X risky right now?" before installing. Each entry cites its GHSA primary source. Posture: TF republishes already-public advisories; the listed primary source is authoritative.',
    inputSchema: {
      type: 'object',
      properties: {
        package_name: {
          type: 'string',
          description:
            'Optional case-insensitive substring of the package name (e.g. "mistralai" or "@mistralai/mistralai-gcp"). If omitted, returns all current entries.',
        },
        ecosystem: {
          type: 'string',
          description: 'Optional ecosystem filter: "npm" or "pip"',
        },
      },
    },
    tier: 'free',
    handler: async (env, args) => {
      const snapshot = await getAiSupplyChainIocs(env);
      if (!snapshot) {
        return {
          ok: false,
          error: 'no_snapshot_yet',
          message: 'The AI supply-chain IOC feed has not been populated yet. Try again after the next 07:15 UTC cron.',
        };
      }
      const pkgFilter = getStringArg(args, 'package_name');
      const ecoFilter = getStringArg(args, 'ecosystem');
      let entries = snapshot.entries;
      if (pkgFilter) {
        const needle = pkgFilter.toLowerCase();
        entries = entries.filter((e) => e.package.name.toLowerCase().includes(needle));
      }
      if (ecoFilter) {
        const eco = ecoFilter.toLowerCase();
        entries = entries.filter((e) => e.package.ecosystem.toLowerCase() === eco);
      }
      return {
        ok: true,
        generated_at: snapshot.generated_at,
        total: entries.length,
        entries,
        sources: snapshot.sources,
        posture: snapshot.posture,
      };
    },
  },

  // ─── Agent Reputation Bureau ──────────────────────────────────────
  {
    name: 'check_agent_reputation',
    description:
      'Look up an agent\'s public reputation card from the TensorFeed Agent Reputation Bureau. Takes a wallet (0x + 40 hex) OR a token_prefix (first 16 chars of a tf_live_ bearer). Returns the full ReputationCard: composite + sub-metric ranks (reliability, spend, activity, streak), trust grade A through F, public flags (new_wallet, spend_spike, claim_disputed, etc), wallet age, first_seen, last_active, ofac_clean, banned + ban_reason if applicable. Cards rebuild daily at 04:50 UTC from TF\'s own observable telemetry. Returns ok=false with status=not_found for unknown identities so callers can distinguish "we have no record" from "we have a record showing zero activity". Useful for: marketplaces routing work to high-grade agents, peer agents deciding to trust another agent, ops dashboards monitoring an agent\'s standing, or operators inspecting their own reputation before claiming a wallet.',
    inputSchema: {
      type: 'object',
      properties: {
        wallet: {
          type: 'string',
          description: 'EIP-55 or lowercased EOA wallet address (0x + 40 hex). Mutually exclusive with token_prefix.',
        },
        token_prefix: {
          type: 'string',
          description: 'First 16 chars of a tf_live_ bearer token (e.g. "tf_live_18e54f47"). Mutually exclusive with wallet.',
        },
      },
    },
    tier: 'free',
    handler: async (env, args) => {
      const wallet = getStringArg(args, 'wallet')?.trim();
      const token_prefix = getStringArg(args, 'token_prefix')?.trim();
      if (!wallet && !token_prefix) {
        return {
          ok: false,
          status: 'invalid_arguments',
          message: 'Pass either wallet (0x + 40 hex) or token_prefix (first 16 chars of a tf_live_ bearer).',
        };
      }
      if (wallet && token_prefix) {
        return {
          ok: false,
          status: 'invalid_arguments',
          message: 'Pass wallet OR token_prefix, not both. The bureau indexes both surfaces; pick one for the lookup.',
        };
      }
      if (wallet) {
        if (!/^0x[0-9a-fA-F]{40}$/.test(wallet)) {
          return { ok: false, status: 'invalid_wallet', message: 'wallet must be 0x + 40 hex chars.' };
        }
        const card = await getReputationCardByWallet(env, wallet);
        if (!card) {
          return {
            ok: false,
            status: 'not_found',
            wallet,
            hint: 'No reputation record indexed for this wallet. Cards rebuild daily at 04:50 UTC; new wallets appear after their first TF interaction lands in a rebuild.',
          };
        }
        return card;
      }
      // token_prefix branch
      if (!/^tf_live_[0-9a-fA-F]+$/.test(token_prefix!) || token_prefix!.length < 9 || token_prefix!.length > 16) {
        return {
          ok: false,
          status: 'invalid_token_prefix',
          message: 'token_prefix must match tf_live_[hex]{1,8} and be 9-16 chars long (the first 16 chars of a tf_live_ bearer).',
        };
      }
      const card = await getReputationCardByToken(env, token_prefix!);
      if (!card) {
        return {
          ok: false,
          status: 'not_found',
          token_prefix,
          hint: 'No reputation record indexed for this token prefix.',
        };
      }
      return card;
    },
  },

  // ─── Agent self-service: free trial + wantlist + free watches ───
  {
    name: 'check_free_tier_status',
    description:
      'Check the caller IP\'s free premium-API trial quota. TensorFeed gives 100 free /api/premium/* calls per IP per 24h rolling window with no auth required. This tool returns used_today, remaining, and resets_at without consuming a quota slot. Use it before deciding whether to make a paid call versus waiting for the trial reset. No arguments.',
    inputSchema: { type: 'object', properties: {} },
    tier: 'free',
    handler: async (_env, _args, ctx) => {
      const ip = ctx?.ip ?? 'anonymous';
      const peek = peekFreeTrialQuota(ip);
      return {
        ok: true,
        ip,
        free_trial: {
          calls_per_ip_per_day: peek.limit,
          window: '24h rolling per IP',
          auth_required: false,
          used_today: peek.used,
          remaining: peek.remaining,
          resets_at: peek.resetAt,
          retry_in_seconds_when_exhausted: peek.resetSeconds,
          applies_to: '/api/premium/* (every premium endpoint)',
          upgrade_when_ready: '/api/payment/buy-credits',
        },
      };
    },
  },
  {
    name: 'submit_wantlist_item',
    description:
      'Submit a wantlist entry telling TensorFeed what data you wish was served. Aggregated patterns inform TF\'s pipeline priorities. Anonymous by default, no PII collected, items expire after 30 days. Per-IP rate limit 5 submissions per 24h. Signal collector, not a contract.',
    inputSchema: {
      type: 'object',
      properties: {
        topic: { type: 'string', description: 'Short label for the data category, e.g. "real estate records" or "crypto on-chain treasury"' },
        request_type: {
          type: 'string',
          enum: ['data_source', 'endpoint', 'tool', 'mcp', 'integration', 'other'],
          description: 'What kind of thing you want. Defaults to "other" if omitted.',
        },
        description: { type: 'string', description: '1 to 2 sentences explaining the use case. Max 500 chars.' },
        contact_optional: { type: 'string', description: 'Optional contact for follow-up. Leave blank to stay anonymous.' },
      },
      required: ['topic', 'description'],
    },
    tier: 'free',
    handler: async (env, args, ctx) => {
      const ip = ctx?.ip ?? 'anonymous';
      const out = await submitWantlistItem(env, ip, args as Record<string, unknown>);
      if (out.ok && out.notify_promise) {
        // Best-effort fire-and-forget. The MCP dispatch does not have
        // ctx.waitUntil access here, so we attach a no-op catch and
        // detach. The Resend POST will run during the worker's
        // remaining wall time after the JSON-RPC response is built.
        out.notify_promise.catch((err) => console.error('wantlist notify error:', err));
        const { notify_promise: _np, ...rest } = out;
        return rest;
      }
      return out;
    },
  },
  {
    name: 'register_free_watch',
    description:
      'Register a free webhook subscription. TensorFeed POSTs HMAC-signed deliveries to your callback_url when the watch spec fires (price drop, status change, leaderboard rank shift, macro indicator threshold crossing, etc). 5 watches per IP, 25 fires per watch, 30-day TTL. Same delivery infrastructure as paid /api/premium/watches. If you omit secret, TensorFeed generates one and returns it; you cannot retrieve it again later. Same IP for management; manage via the REST endpoints under /api/watches/free/{id}.',
    inputSchema: {
      type: 'object',
      properties: {
        spec: {
          type: 'object',
          description: 'Watch spec. Examples: { type: "price", model: "opus-4-7", field: "blended", op: "lt", threshold: 50 }; { type: "status", provider: "openai", op: "becomes", value: "down" }; { type: "leaderboard_rank", provider: "anthropic", op: "drops_below", threshold: 3 }; { type: "macro_indicator", source: "fred", series_id: "T10Y2Y", metric: "value", op: "crosses", threshold: 0 }; { type: "digest", cadence: "daily" }.',
        },
        callback_url: { type: 'string', description: 'HTTPS URL to receive POST deliveries. Must NOT be private/localhost (SSRF guarded).' },
        secret: { type: 'string', description: 'Optional shared secret for HMAC-SHA256 signing. If omitted, TensorFeed generates a 32-hex secret and returns it once.' },
        fire_cap: { type: 'number', description: 'Optional cap on total fires for this watch. Capped at 25 for free tier; smaller values honored.' },
      },
      required: ['spec', 'callback_url'],
    },
    tier: 'free',
    handler: async (env, args, ctx) => {
      const ip = ctx?.ip ?? 'anonymous';
      const callerSecret = typeof args.secret === 'string' && args.secret.length > 0 ? (args.secret as string) : undefined;
      const fireCap = typeof args.fire_cap === 'number' ? (args.fire_cap as number) : undefined;
      const callbackUrl = typeof args.callback_url === 'string' ? (args.callback_url as string) : '';
      const result = await createFreeWatch(env, ip, {
        spec: args.spec as never,
        callback_url: callbackUrl,
        ...(callerSecret ? { secret: callerSecret } : {}),
        ...(fireCap !== undefined ? { fire_cap: fireCap } : {}),
      });
      if (!result.ok) return result;
      return {
        ok: true,
        watch: result.watch,
        tier: 'free',
        caps: {
          per_ip: FREE_PER_IP_WATCH_CAP,
          fires_per_watch: FREE_FIRE_CAP,
          ttl_seconds: FREE_WATCH_TTL_SECONDS,
        },
        ...(callerSecret
          ? {}
          : {
              generated_secret: result.watch.secret,
              secret_note: 'Auto-generated. Store this; it will not be returned again. Use it to verify the X-TensorFeed-Signature header (HMAC-SHA256) on inbound webhook POSTs.',
            }),
        management_note: 'GET and DELETE on this watch require the same IP that registered it. Hit /api/watches/free/{id} via REST. IP rotation = lose access; just recreate.',
      };
    },
  },

  // ─── Finance: SEC EDGAR + EIA ─────────────────────────────────────
  {
    name: 'search_sec_edgar',
    description:
      'Lucene-style full-text search across the entire SEC EDGAR public-filings corpus since the 1990s. Forms include 10-K (annual), 10-Q (quarterly), 8-K (current event), DEF 14A (proxy), S-1 (IPO), 13F (institutional holdings), and ~70+ others. License: US Government public domain. The killer endpoint for finance and equity-research agents.',
    inputSchema: {
      type: 'object',
      properties: {
        q: { type: 'string', description: 'Search query (Lucene syntax supported)' },
        forms: {
          type: 'string',
          description: 'Comma-separated form types (e.g. "10-K,10-Q,8-K")',
        },
        startdt: { type: 'string', description: 'Start date YYYY-MM-DD' },
        enddt: { type: 'string', description: 'End date YYYY-MM-DD' },
        limit: { type: 'number', description: 'Max hits (1-50)', default: 10 },
      },
      required: ['q'],
    },
    tier: 'free',
    handler: async (env, args) => {
      // Reuse the same parser the REST endpoint uses so validation
      // (regex on q, forms, dates) is identical across both surfaces.
      // Build a synthetic URL so parseEdgarSearchQuery can pull from
      // searchParams.
      const url = new URL('https://tensorfeed.ai/api/sec/edgar/search');
      const q = getStringArg(args, 'q');
      const forms = getStringArg(args, 'forms');
      const startdt = getStringArg(args, 'startdt');
      const enddt = getStringArg(args, 'enddt');
      const limit = getNumberArg(args, 'limit');
      if (q !== null) url.searchParams.set('q', q);
      if (forms !== null) url.searchParams.set('forms', forms);
      if (startdt !== null) url.searchParams.set('startdt', startdt);
      if (enddt !== null) url.searchParams.set('enddt', enddt);
      if (limit !== null) url.searchParams.set('limit', String(limit));
      const parsed = parseEdgarSearchQuery(url);
      if (!parsed.ok) throw new ValidationError(`${parsed.error}: ${parsed.hint}`);
      return await searchEdgar(env, parsed.query);
    },
  },
  {
    name: 'get_sec_submissions',
    description:
      'Get entity metadata + recent filings for one company by CIK. Accepts canonical zero-padded CIK ("0000320193"), bare numeric ("320193"), or "CIK0000320193" prefixed. Returns full company profile (name, tickers, exchanges, EIN, SIC, addresses) plus the most-recent ~1000 filings. License: US Government public domain.',
    inputSchema: {
      type: 'object',
      properties: {
        cik: { type: 'string', description: 'CIK in any zero-padding form, or CIK-prefixed' },
      },
      required: ['cik'],
    },
    tier: 'free',
    handler: async (env, args) => {
      const cik = getStringArg(args, 'cik');
      if (!cik) throw new ValidationError('cik is required');
      return await fetchEdgarSubmissions(env, cik);
    },
  },
  {
    name: 'lookup_sec_company_ticker',
    description:
      'Resolve a stock ticker symbol (e.g. AAPL, MSFT, NVDA) or numeric CIK to the canonical SEC entity record. Returns ticker, CIK, company name, and exchange. Pair with get_sec_submissions to retrieve filings. License: US Government public domain.',
    inputSchema: {
      type: 'object',
      properties: {
        ticker_or_cik: {
          type: 'string',
          description: 'Ticker symbol (case-insensitive) or numeric CIK',
        },
      },
      required: ['ticker_or_cik'],
    },
    tier: 'free',
    handler: async (env, args) => {
      const term = getStringArg(args, 'ticker_or_cik');
      if (!term) throw new ValidationError('ticker_or_cik is required');
      // Direct function call rather than worker-self-fetch (Cloudflare
      // workers can't reliably loop back through their own public URL).
      return await readSECTicker(env, term);
    },
  },
  // ─── FDA regulatory + safety (life-sciences focus) ────────────────
  {
    name: 'query_fda_drug_events',
    description:
      'Query the FDA FAERS adverse event reports database. Returns drug-event records with patient demographics, drug names, reaction terms (MedDRA-coded), outcomes, and seriousness flags. Uses openFDA Lucene-style search syntax (e.g. "patient.drug.medicinalproduct:aspirin"). License: openFDA CC0 1.0 Universal Dedication, FDA waiver of all copyright; commercial redistribution permitted.',
    inputSchema: {
      type: 'object',
      properties: {
        search: { type: 'string', description: 'openFDA Lucene-style search expression. Examples: patient.drug.medicinalproduct:aspirin, patient.reaction.reactionmeddrapt:headache+AND+receivedate:[20240101+TO+20251231]' },
        limit: { type: 'number', description: 'Max records to return (1-100)', default: 10 },
        skip: { type: 'number', description: 'Pagination offset (0-25000)', default: 0 },
        sort: { type: 'string', description: 'Sort by field (e.g. receivedate:desc)' },
      },
    },
    tier: 'free',
    handler: async (env, args) => {
      const url = new URL('https://tensorfeed.ai/api/health/fda/drug/events');
      const search = getStringArg(args, 'search');
      const sort = getStringArg(args, 'sort');
      const limit = getNumberArg(args, 'limit');
      const skip = getNumberArg(args, 'skip');
      if (search !== null) url.searchParams.set('search', search);
      if (sort !== null) url.searchParams.set('sort', sort);
      if (limit !== null) url.searchParams.set('limit', String(limit));
      if (skip !== null) url.searchParams.set('skip', String(skip));
      const parsed = parseFDAQuery('drug/events', url);
      if (!parsed.ok) return { ok: false, error: parsed.error, hint: parsed.hint };
      return await fetchFDAQuery(env, parsed.query);
    },
  },
  {
    name: 'query_fda_drug_labels',
    description:
      'Query the FDA structured product labeling (SPL) database for prescription and OTC drugs. Returns indications, dosage, warnings, contraindications, adverse reactions, and pharmacology sections. License: openFDA CC0 1.0; commercial redistribution permitted.',
    inputSchema: {
      type: 'object',
      properties: {
        search: { type: 'string', description: 'openFDA Lucene-style search expression. Examples: openfda.brand_name:tylenol, openfda.generic_name:metformin' },
        limit: { type: 'number', description: 'Max records to return (1-100)', default: 10 },
        skip: { type: 'number', description: 'Pagination offset (0-25000)', default: 0 },
        sort: { type: 'string', description: 'Sort by field' },
      },
    },
    tier: 'free',
    handler: async (env, args) => {
      const url = new URL('https://tensorfeed.ai/api/health/fda/drug/labels');
      const search = getStringArg(args, 'search');
      const sort = getStringArg(args, 'sort');
      const limit = getNumberArg(args, 'limit');
      const skip = getNumberArg(args, 'skip');
      if (search !== null) url.searchParams.set('search', search);
      if (sort !== null) url.searchParams.set('sort', sort);
      if (limit !== null) url.searchParams.set('limit', String(limit));
      if (skip !== null) url.searchParams.set('skip', String(skip));
      const parsed = parseFDAQuery('drug/labels', url);
      if (!parsed.ok) return { ok: false, error: parsed.error, hint: parsed.hint };
      return await fetchFDAQuery(env, parsed.query);
    },
  },
  {
    name: 'query_fda_drug_recalls',
    description:
      'Query the FDA drug enforcement (recall) database. Returns recall classification (Class I/II/III), reason, distribution, product description, and voluntary/mandatory flag. License: openFDA CC0 1.0; commercial redistribution permitted.',
    inputSchema: {
      type: 'object',
      properties: {
        search: { type: 'string', description: 'openFDA Lucene-style search expression. Examples: classification:"Class+I", reason_for_recall:contamination' },
        limit: { type: 'number', description: 'Max records to return (1-100)', default: 10 },
        skip: { type: 'number', description: 'Pagination offset (0-25000)', default: 0 },
        sort: { type: 'string', description: 'Sort by field (e.g. report_date:desc)' },
      },
    },
    tier: 'free',
    handler: async (env, args) => {
      const url = new URL('https://tensorfeed.ai/api/health/fda/drug/recalls');
      const search = getStringArg(args, 'search');
      const sort = getStringArg(args, 'sort');
      const limit = getNumberArg(args, 'limit');
      const skip = getNumberArg(args, 'skip');
      if (search !== null) url.searchParams.set('search', search);
      if (sort !== null) url.searchParams.set('sort', sort);
      if (limit !== null) url.searchParams.set('limit', String(limit));
      if (skip !== null) url.searchParams.set('skip', String(skip));
      const parsed = parseFDAQuery('drug/recalls', url);
      if (!parsed.ok) return { ok: false, error: parsed.error, hint: parsed.hint };
      return await fetchFDAQuery(env, parsed.query);
    },
  },
  {
    name: 'query_fda_food_recalls',
    description:
      'Query the FDA food enforcement (recall) database covering food products distributed in the US. Same shape as drug recalls. License: openFDA CC0 1.0; commercial redistribution permitted.',
    inputSchema: {
      type: 'object',
      properties: {
        search: { type: 'string', description: 'openFDA Lucene-style search expression. Examples: reason_for_recall:listeria, classification:"Class+I"' },
        limit: { type: 'number', description: 'Max records to return (1-100)', default: 10 },
        skip: { type: 'number', description: 'Pagination offset (0-25000)', default: 0 },
        sort: { type: 'string', description: 'Sort by field (e.g. report_date:desc)' },
      },
    },
    tier: 'free',
    handler: async (env, args) => {
      const url = new URL('https://tensorfeed.ai/api/health/fda/food/recalls');
      const search = getStringArg(args, 'search');
      const sort = getStringArg(args, 'sort');
      const limit = getNumberArg(args, 'limit');
      const skip = getNumberArg(args, 'skip');
      if (search !== null) url.searchParams.set('search', search);
      if (sort !== null) url.searchParams.set('sort', sort);
      if (limit !== null) url.searchParams.set('limit', String(limit));
      if (skip !== null) url.searchParams.set('skip', String(skip));
      const parsed = parseFDAQuery('food/recalls', url);
      if (!parsed.ok) return { ok: false, error: parsed.error, hint: parsed.hint };
      return await fetchFDAQuery(env, parsed.query);
    },
  },
  {
    name: 'query_fda_device_events',
    description:
      'Query the FDA MAUDE medical device adverse event reports database. Returns device identifiers, problem codes, event narratives, patient outcomes. Useful for safety signal detection on FDA-cleared devices. License: openFDA CC0 1.0; commercial redistribution permitted.',
    inputSchema: {
      type: 'object',
      properties: {
        search: { type: 'string', description: 'openFDA Lucene-style search expression. Examples: device.brand_name:medtronic, device.generic_name:pacemaker' },
        limit: { type: 'number', description: 'Max records to return (1-100)', default: 10 },
        skip: { type: 'number', description: 'Pagination offset (0-25000)', default: 0 },
        sort: { type: 'string', description: 'Sort by field' },
      },
    },
    tier: 'free',
    handler: async (env, args) => {
      const url = new URL('https://tensorfeed.ai/api/health/fda/device/events');
      const search = getStringArg(args, 'search');
      const sort = getStringArg(args, 'sort');
      const limit = getNumberArg(args, 'limit');
      const skip = getNumberArg(args, 'skip');
      if (search !== null) url.searchParams.set('search', search);
      if (sort !== null) url.searchParams.set('sort', sort);
      if (limit !== null) url.searchParams.set('limit', String(limit));
      if (skip !== null) url.searchParams.set('skip', String(skip));
      const parsed = parseFDAQuery('device/events', url);
      if (!parsed.ok) return { ok: false, error: parsed.error, hint: parsed.hint };
      return await fetchFDAQuery(env, parsed.query);
    },
  },
  {
    name: 'get_eia_series',
    description:
      'Get a US Energy Information Administration time-series. Curated routes: petroleum/pri/spt (WTI/Brent crude spot prices), petroleum/pri/gnd (US retail gasoline), natural-gas/pri/sum (Henry Hub + retail nat gas), electricity/retail-sales (by state and sector), electricity/electric-power-operational-data (net generation by fuel), total-energy. License: US Government public domain.',
    inputSchema: {
      type: 'object',
      properties: {
        route: {
          type: 'string',
          description: `One of: ${Object.keys(EIA_ROUTES).join(', ')}`,
        },
        start: { type: 'string', description: 'Start date YYYY-MM-DD' },
        end: { type: 'string', description: 'End date YYYY-MM-DD' },
        length: { type: 'number', description: 'Max records (1-5000)', default: 100 },
      },
      required: ['route'],
    },
    tier: 'free',
    handler: async (env, args) => {
      // Reuse the REST endpoint's parser so date/frequency/facet
      // validation matches across both surfaces.
      const url = new URL('https://tensorfeed.ai/api/economy/eia/series');
      const route = getStringArg(args, 'route');
      const start = getStringArg(args, 'start');
      const end = getStringArg(args, 'end');
      const length = getNumberArg(args, 'length');
      if (route !== null) url.searchParams.set('route', route);
      if (start !== null) url.searchParams.set('start', start);
      if (end !== null) url.searchParams.set('end', end);
      if (length !== null) url.searchParams.set('length', String(length));
      const parsed = parseEIAQuery(url);
      if (!parsed.ok) {
        return { ok: false, error: parsed.error, hint: parsed.hint };
      }
      return await fetchEIASeries(env, parsed.query);
    },
  },

  // ─── AI Research: arXiv recent submissions ─────────────────────────
  {
    name: 'get_arxiv_recent',
    description:
      "Get the 50 most recent arXiv submissions in cs.AI / cs.LG / cs.CL / cs.CV, sorted by submission date. Each entry carries arxivId (no version suffix), version, title, abstract, authors, primary category, all categories, publishedAt, updatedAt, htmlUrl, pdfUrl, and doi. Refreshed daily at 11:30 UTC. The firehose pair to get_ai_trending_papers (which ranks by citation count). License: arXiv permits use of metadata; the standard attribution block ships on every response.",
    inputSchema: {
      type: 'object',
      properties: {
        limit: {
          type: 'number',
          description: 'Max papers to return (1-50). Default 25.',
          default: 25,
        },
      },
    },
    tier: 'free',
    handler: async (env, args) => {
      const limit = Math.max(1, Math.min(50, getNumberArg(args, 'limit') ?? 25));
      const snap = await getArxivLatest(env);
      if (!snap) return { ok: false, error: 'arxiv_unavailable' };
      const papers = Array.isArray((snap as { papers?: unknown[] }).papers)
        ? ((snap as { papers: unknown[] }).papers as unknown[])
        : [];
      return {
        ok: true,
        snapshot_date: (snap as { capturedAt?: string }).capturedAt ?? null,
        count: Math.min(papers.length, limit),
        papers: papers.slice(0, limit),
      };
    },
  },

  // ─── AI Research: AI trending papers (Semantic Scholar) ────────────
  {
    name: 'get_ai_trending_papers',
    description:
      "Get the daily curated AI/ML trending papers from Semantic Scholar, ranked by citation count. Five fan-out queries (large language model, transformer, RLHF, AI agents, diffusion model), deduped by paperId, top 30 returned. Each entry carries paperId, title, abstract, authors, year, venue, citationCount, arxivId, doi, and fieldsOfStudy. Refreshed daily at 11:00 UTC. Citation-ranked counterpart to get_arxiv_recent (firehose by submission date). License: Semantic Scholar API permits use; the standard attribution block ships on every response.",
    inputSchema: {
      type: 'object',
      properties: {
        limit: {
          type: 'number',
          description: 'Max papers to return (1-30). Default 15.',
          default: 15,
        },
      },
    },
    tier: 'free',
    handler: async (env, args) => {
      const limit = Math.max(1, Math.min(30, getNumberArg(args, 'limit') ?? 15));
      const snap = await getPapersLatest(env);
      if (!snap) return { ok: false, error: 'papers_unavailable' };
      const papers = Array.isArray((snap as { papers?: unknown[] }).papers)
        ? ((snap as { papers: unknown[] }).papers as unknown[])
        : [];
      return {
        ok: true,
        snapshot_date: (snap as { capturedAt?: string }).capturedAt ?? null,
        count: Math.min(papers.length, limit),
        papers: papers.slice(0, limit),
      };
    },
  },

  // ─── AI Research: Hugging Face daily papers ────────────────────────
  {
    name: 'get_hf_daily_papers',
    description:
      "Get Hugging Face's editor-curated daily AI/ML papers feed with community upvotes and discussion counts. Each entry carries paperId, title (sanitized), summary, authors, publishedAt, submittedAt, upvotes, num_comments, thumbnail, hf_url, arxiv_url (when arxiv-style), github_repo, github_stars, ai_keywords. Different signal from get_arxiv_recent (firehose) and get_ai_trending_papers (citation-ranked). Refreshed daily at 14:15 UTC.",
    inputSchema: {
      type: 'object',
      properties: {
        limit: {
          type: 'number',
          description: 'Max papers to return (1-50). Default 20.',
          default: 20,
        },
      },
    },
    tier: 'free',
    handler: async (env, args) => {
      const limit = Math.max(1, Math.min(50, getNumberArg(args, 'limit') ?? 20));
      const snap = await getHFDailyPapersLatest(env);
      if (!snap) return { ok: false, error: 'hf_daily_papers_unavailable' };
      const papers = Array.isArray((snap as { papers?: unknown[] }).papers)
        ? ((snap as { papers: unknown[] }).papers as unknown[])
        : [];
      return {
        ok: true,
        snapshot_date: (snap as { capturedAt?: string }).capturedAt ?? null,
        count: Math.min(papers.length, limit),
        papers: papers.slice(0, limit),
      };
    },
  },

  // ─── Climate: NWS Active Weather Alerts ────────────────────────────
  {
    name: 'get_weather_alerts',
    description:
      "Get active US weather alerts from the National Weather Service. US-only coverage. Filter by 2-letter state code (area), exact event name (e.g. 'Tornado Warning', 'Heat Advisory'), severity (Extreme | Severe | Moderate | Minor | Unknown), urgency (Immediate | Expected | Future | Past | Unknown), and status (actual | exercise | system | test | draft). Returns a flattened alerts list with id, event, severity, urgency, headline, description, areaDesc, sent/effective/expires/ends, sender_name, web URL. Refreshed in real time upstream; cached 60s. License: US Government public domain (17 USC §105).",
    inputSchema: {
      type: 'object',
      properties: {
        area: {
          type: 'string',
          description: '2-letter US state or territory code (CA, TX, PR, etc). Optional.',
        },
        event: {
          type: 'string',
          description: 'Exact NWS event name (e.g. "Tornado Warning", "Heat Advisory"). Optional.',
        },
        severity: {
          type: 'string',
          description: `One of: ${NWS_VALID_SEVERITIES.join(', ')}. Optional.`,
        },
        urgency: {
          type: 'string',
          description: `One of: ${NWS_VALID_URGENCIES.join(', ')}. Optional.`,
        },
        status: {
          type: 'string',
          description: `One of: ${NWS_VALID_STATUSES.join(', ')}. Optional.`,
        },
        limit: {
          type: 'number',
          description: 'Max alerts to return (1-500). Default 50.',
          default: 50,
        },
      },
    },
    tier: 'free',
    handler: async (env, args) => {
      const areaRaw = getStringArg(args, 'area');
      const eventRaw = getStringArg(args, 'event');
      const severityRaw = getStringArg(args, 'severity');
      const urgencyRaw = getStringArg(args, 'urgency');
      const statusRaw = getStringArg(args, 'status');
      const limitInput = getNumberArg(args, 'limit') ?? 50;
      const limit = Math.max(1, Math.min(500, Math.round(limitInput)));

      const url = new URL('https://tensorfeed.ai/api/climate/weather-alerts');
      if (areaRaw) url.searchParams.set('area', areaRaw);
      if (eventRaw) url.searchParams.set('event', eventRaw);
      if (severityRaw) url.searchParams.set('severity', severityRaw);
      if (urgencyRaw) url.searchParams.set('urgency', urgencyRaw);
      if (statusRaw) url.searchParams.set('status', statusRaw);
      url.searchParams.set('limit', String(limit));

      const parsed = parseNWSAlertsQuery(url);
      if (!parsed.ok || !parsed.query) {
        throw new ValidationError(`${parsed.error}: ${parsed.hint}`);
      }
      return await fetchNWSAlerts(env, parsed.query);
    },
  },

  // ─── Climate: USGS Earthquakes ─────────────────────────────────────
  {
    name: 'get_recent_earthquakes',
    description:
      "Get recent earthquakes from the US Geological Survey's pre-built summary feeds. Choose a magnitude bucket (significant | 4.5 | 2.5 | 1.0 | all) and a time window (hour | day | week | month). Returns a flattened list with id, magnitude, place, time (ISO 8601), depth_km, longitude, latitude, tsunami flag, USGS detail URL. Upstream feeds refresh every minute. License: US Government public domain (17 USC §105).",
    inputSchema: {
      type: 'object',
      properties: {
        magnitude: {
          type: 'string',
          description: `Magnitude bucket. One of: ${USGS_VALID_MAGNITUDES.join(', ')}. Default 4.5.`,
          default: '4.5',
        },
        period: {
          type: 'string',
          description: `Time window. One of: ${USGS_VALID_PERIODS.join(', ')}. Default day.`,
          default: 'day',
        },
        limit: {
          type: 'number',
          description: 'Max earthquakes to return (1-500). Default 50.',
          default: 50,
        },
      },
    },
    tier: 'free',
    handler: async (env, args) => {
      const magRaw = getStringArg(args, 'magnitude') ?? '4.5';
      const periodRaw = getStringArg(args, 'period') ?? 'day';
      if (!USGS_VALID_MAGNITUDES.includes(magRaw)) {
        throw new ValidationError(
          `magnitude must be one of: ${USGS_VALID_MAGNITUDES.join(', ')}`,
        );
      }
      if (!USGS_VALID_PERIODS.includes(periodRaw)) {
        throw new ValidationError(
          `period must be one of: ${USGS_VALID_PERIODS.join(', ')}`,
        );
      }
      const limitInput = getNumberArg(args, 'limit') ?? 50;
      const limit = Math.max(1, Math.min(500, Math.round(limitInput)));
      return await fetchUSGSEarthquakes(env, { magnitude: magRaw, period: periodRaw, limit });
    },
  },

  // ─── Agent ecosystem opportunities ────────────────────────────────
  {
    name: 'get_agent_opportunities',
    description:
      "Get TensorFeed's daily scan of new repositories across the AI agent ecosystem (Anthropic, OpenAI, Microsoft, ModelContextProtocol, HuggingFace, LangChain, frontier labs) plus recent MCP/x402/skills keyword sweeps. Each opportunity includes the GitHub repo path, description, stars, last update, the source signal, and a composite score (signal weight × log10(stars+1) × recency decay). Refreshed daily at 13:30 UTC. Useful for surfacing distribution targets, integration ideas, or just a daily digest of what's launching across the agent space. License: GitHub data via the public Search API; output is TensorFeed's curated ranking.",
    inputSchema: {
      type: 'object',
      properties: {
        limit: {
          type: 'number',
          description: 'Max opportunities to return (1-25)',
          default: 10,
        },
        signal: {
          type: 'string',
          description:
            'Optional filter to one signal source. One of: anthropic-org, openai-org, microsoft-org, mcp-org, huggingface-org, langchain-org, frontier-labs, mcp-keyword, x402-keyword, skill-keyword, vertical-pattern.',
        },
      },
    },
    tier: 'free',
    handler: async (env, args) => {
      const limit = Math.max(1, Math.min(getNumberArg(args, 'limit') ?? 10, 25));
      const signal = getStringArg(args, 'signal');
      const snapshot = await env.TENSORFEED_CACHE.get<unknown>('opps:latest', 'json');
      if (!snapshot || typeof snapshot !== 'object') {
        return { ok: false, error: 'opportunities_not_yet_captured' };
      }
      const snap = snapshot as {
        date?: string;
        capturedAt?: string;
        opportunities?: Array<{ signal?: string }>;
        summary?: unknown;
      };
      const all = Array.isArray(snap.opportunities) ? snap.opportunities : [];
      const filtered = signal ? all.filter((o) => o.signal === signal) : all;
      return {
        ok: true,
        date: snap.date ?? null,
        capturedAt: snap.capturedAt ?? null,
        signal_filter: signal ?? null,
        total_in_snapshot: all.length,
        returned: Math.min(filtered.length, limit),
        summary: snap.summary ?? null,
        opportunities: filtered.slice(0, limit),
        attribution:
          'TensorFeed daily agent-ecosystem scan. Source data: GitHub public Search API. License: TensorFeed-curated ranking; underlying repo metadata is GitHub-API-permitted.',
      };
    },
  },
];

// ── Method handlers ─────────────────────────────────────────────────

interface DispatchContext {
  env: Env;
  bearerToken: string | null;
  /** Caller's IP, populated by getClientIP(request) at dispatch.
   * Used by IP-keyed tools (free watches, wantlist, free-tier status)
   * so they can hit the same per-IP storage as the REST endpoints. */
  ip: string;
}

async function handleInitialize(): Promise<unknown> {
  return {
    protocolVersion: PROTOCOL_VERSION,
    capabilities: {
      tools: {},
    },
    serverInfo: {
      name: SERVER_NAME,
      version: SERVER_VERSION,
    },
    instructions:
      'TensorFeed.ai MCP server. Hosted HTTP transport at https://tensorfeed.ai/api/mcp. ' +
      'Free tier (23 tools): AI news, model pricing, AI service status, MITRE CVE / CISA KEV / EPSS / OSV.dev, ' +
      'SEC EDGAR search + submissions + ticker lookup, openFDA (drug events, drug labels, drug recalls, food recalls, device events), ' +
      'EIA Open Data series, USGS recent earthquakes, NWS US weather alerts, AI papers (arXiv recent + AI trending + HF daily), ' +
      'and the daily agent-ecosystem opportunities scan. ' +
      'Premium tools require an Authorization: Bearer tf_live_... token; buy credits at https://tensorfeed.ai/developers/agent-payments. ' +
      'License posture: most data is US Government public domain; commercial redistribution permitted; attribution preserved on every response.',
  };
}

async function handleToolsList(): Promise<unknown> {
  return {
    tools: TOOLS.map((t) => ({
      name: t.name,
      description: t.description,
      inputSchema: t.inputSchema,
    })),
  };
}

async function handleToolCall(
  ctx: DispatchContext,
  params: unknown,
): Promise<{ result?: unknown; error?: { code: number; message: string } }> {
  if (!params || typeof params !== 'object') {
    return { error: { code: ERR_INVALID_PARAMS, message: 'tools/call requires params object' } };
  }
  const p = params as { name?: unknown; arguments?: unknown };
  const name = typeof p.name === 'string' ? p.name : null;
  if (!name) {
    return { error: { code: ERR_INVALID_PARAMS, message: 'tools/call requires params.name string' } };
  }
  const tool = TOOLS.find((t) => t.name === name);
  if (!tool) {
    return { error: { code: ERR_METHOD_NOT_FOUND, message: `unknown tool: ${name}` } };
  }
  const args = (p.arguments ?? {}) as Record<string, unknown>;
  if (typeof args !== 'object') {
    return { error: { code: ERR_INVALID_PARAMS, message: 'tools/call params.arguments must be an object' } };
  }
  if (tool.tier === 'premium' && !ctx.bearerToken) {
    return mcpToolError(
      'authentication_required: this tool requires an Authorization: Bearer tf_live_... header. Buy credits at https://tensorfeed.ai/developers/agent-payments.',
    );
  }
  const startMs = Date.now();
  const tierForCounter: 'free' | 'premium' | 'unknown' = tool.tier === 'premium' ? 'premium' : 'free';
  try {
    // Pass the dispatch ctx as a third arg; existing tools that
    // only declare (env, args) ignore it. New IP-keyed tools (free
    // watches, wantlist, free-tier status) read ctx.ip from here.
    const data = await tool.handler(ctx.env, args, ctx);
    // eslint-disable-next-line no-console
    console.log('mcp_tool_call', JSON.stringify({
      tool: tool.name,
      tier: tool.tier,
      authed: Boolean(ctx.bearerToken),
      duration_ms: Date.now() - startMs,
      outcome: 'ok',
    }));
    await recordHostedToolCall(ctx.env, tool.name, tierForCounter, 'ok');
    return { result: mcpContent(data) };
  } catch (e) {
    if (e instanceof ValidationError) {
      // eslint-disable-next-line no-console
      console.log('mcp_tool_call', JSON.stringify({
        tool: tool.name,
        tier: tool.tier,
        authed: Boolean(ctx.bearerToken),
        duration_ms: Date.now() - startMs,
        outcome: 'validation_error',
      }));
      await recordHostedToolCall(ctx.env, tool.name, tierForCounter, 'validation_error');
      return mcpToolError(`validation_error: ${e.message}`);
    }
    const tag = newErrorTag();
    const bucket = classifyException(e);
    console.error(`mcp-http tool_error tag=${tag} tool=${tool.name} bucket=${bucket}:`, e);
    // eslint-disable-next-line no-console
    console.log('mcp_tool_call', JSON.stringify({
      tool: tool.name,
      tier: tool.tier,
      authed: Boolean(ctx.bearerToken),
      duration_ms: Date.now() - startMs,
      outcome: `tool_error:${bucket}`,
    }));
    await recordHostedToolCall(ctx.env, tool.name, tierForCounter, `tool_error:${bucket}`);
    return mcpToolError(`tool_error:${bucket} ref=${tag}`);
  }
}

function mcpToolError(message: string): { result: unknown } {
  return {
    result: { content: [{ type: 'text', text: message }], isError: true },
  };
}

/**
 * Distinguishes intentional validation errors raised by tool handlers
 * (caller passed bad input — message is safe to surface verbatim) from
 * unexpected runtime exceptions (KV errors, upstream timeouts, JSON
 * parse failures — message may contain implementation detail). Tool
 * handlers `throw new ValidationError(...)` for the safe path; the
 * catch surface checks instanceof and routes accordingly.
 */
class ValidationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'ValidationError';
  }
}

// Short, opaque correlation ID for error responses. Logged server-side
// alongside the full exception via console.error so an operator with
// wrangler tail access can correlate a client-visible error code back
// to the actual exception, without leaking internal details (paths,
// stack frames, KV namespace IDs, secret tokens) to the client.
function newErrorTag(): string {
  const bytes = new Uint8Array(6);
  crypto.getRandomValues(bytes);
  return Array.from(bytes, (b) => b.toString(16).padStart(2, '0')).join('');
}

// Bucket common upstream/runtime exceptions into a stable, opaque
// machine-classifiable string. Anything unrecognized maps to
// 'internal_error'. We never echo the exception's .message back to
// the client; clients get the bucket plus the correlation tag.
function classifyException(e: unknown): string {
  if (e instanceof Error) {
    const m = e.message ?? '';
    if (e.name === 'TimeoutError' || /timeout|timed out|aborted/i.test(m)) return 'upstream_timeout';
    if (/network|fetch failed|ECONNRESET|ENOTFOUND|EAI_AGAIN/i.test(m)) return 'upstream_unreachable';
    if (/json|unexpected token/i.test(m)) return 'upstream_invalid_json';
    if (/Authorization|TENSORFEED_TOKEN|bearer|credits/i.test(m)) return 'auth_or_credits';
  }
  return 'internal_error';
}

// ── Public entry point ──────────────────────────────────────────────

export async function handleMcpHttpRequest(request: Request, env: Env): Promise<Response> {
  if (request.method === 'GET') {
    // Minimal discovery surface for clients that probe via GET
    return new Response(
      JSON.stringify({
        name: SERVER_NAME,
        version: SERVER_VERSION,
        protocolVersion: PROTOCOL_VERSION,
        endpoint: 'https://tensorfeed.ai/api/mcp',
        method: 'POST',
        contentType: 'application/json',
        body: 'JSON-RPC 2.0 envelope per MCP spec',
        spec: 'https://modelcontextprotocol.io/specification/2024-11-05/basic/transports',
        tools_count: TOOLS.length,
      }),
      { status: 200, headers: { 'Content-Type': 'application/json' } },
    );
  }
  if (request.method !== 'POST') {
    return new Response('method_not_allowed', { status: 405 });
  }

  let body: JsonRpcRequest;
  try {
    body = (await request.json()) as JsonRpcRequest;
  } catch {
    return rpcResponse(rpcError(null, ERR_PARSE, 'parse_error: invalid JSON'));
  }
  if (!body || typeof body !== 'object' || body.jsonrpc !== '2.0' || typeof body.method !== 'string') {
    return rpcResponse(rpcError(body?.id ?? null, ERR_INVALID_REQUEST, 'invalid_request'));
  }

  const id = body.id ?? null;
  const auth = request.headers.get('Authorization') ?? '';
  const bearerToken = auth.startsWith('Bearer ') ? auth.slice(7) : null;
  const ctx: DispatchContext = { env, bearerToken, ip: getClientIP(request) };

  try {
    switch (body.method) {
      case 'initialize':
        return rpcResponse(rpcSuccess(id, await handleInitialize()));
      case 'notifications/initialized':
        // Notifications expect no response per JSON-RPC; return 202 Accepted with empty body
        return new Response(null, { status: 202 });
      case 'ping':
        return rpcResponse(rpcSuccess(id, {}));
      case 'tools/list':
        return rpcResponse(rpcSuccess(id, await handleToolsList()));
      case 'tools/call': {
        const out = await handleToolCall(ctx, body.params);
        if (out.error) return rpcResponse(rpcError(id, out.error.code, out.error.message));
        return rpcResponse(rpcSuccess(id, out.result));
      }
      default:
        return rpcResponse(rpcError(id, ERR_METHOD_NOT_FOUND, `method_not_found: ${body.method}`));
    }
  } catch (e) {
    const tag = newErrorTag();
    const bucket = classifyException(e);
    console.error(`mcp-http rpc_error tag=${tag} method=${body.method} bucket=${bucket}:`, e);
    return rpcResponse(
      rpcError(id, ERR_INTERNAL, `${bucket} ref=${tag}`),
    );
  }
}

function rpcResponse(payload: JsonRpcResponse): Response {
  return new Response(JSON.stringify(payload), {
    status: 200,
    headers: {
      'Content-Type': 'application/json',
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'POST, GET, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization, MCP-Session-ID',
    },
  });
}

export const MCP_TOOLS_COUNT = TOOLS.length;
export { TOOLS as MCP_HTTP_TOOLS };
