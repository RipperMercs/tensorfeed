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
import { fetchCVE } from './security-cve';
import { readKEVCurrent, summarizeKEVForFreeTier } from './security-kev';
import { fetchEPSSCurrent } from './security-epss';
import { fetchOSVForPackage, fetchOSVById } from './security-osv';
import {
  parseEdgarSearchQuery,
  searchEdgar,
  fetchEdgarSubmissions,
  type EdgarSearchQuery,
} from './finance-sec-edgar';
import { fetchEIASeries, isEIARoute, EIA_ROUTES } from './economy-eia';
import { readSECTicker } from './sec-tickers';

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
  handler: (env: Env, args: Record<string, unknown>) => Promise<unknown>;
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
      if (!id) throw new Error('cve_id is required');
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
      if (!id) throw new Error('cve_id is required');
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
      const ecosystem = getStringArg(args, 'ecosystem');
      const name = getStringArg(args, 'name');
      const version = getStringArg(args, 'version');
      if (!ecosystem || !name) throw new Error('ecosystem and name are required');
      return await fetchOSVForPackage(env, { ecosystem, name, version });
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
      if (!id) throw new Error('id is required');
      return await fetchOSVById(env, id);
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
      const q = getStringArg(args, 'q');
      if (!q) throw new Error('q is required');
      const query: EdgarSearchQuery = {
        q,
        forms: getStringArg(args, 'forms'),
        startdt: getStringArg(args, 'startdt'),
        enddt: getStringArg(args, 'enddt'),
        limit: Math.max(1, Math.min(getNumberArg(args, 'limit') ?? 10, 50)),
        page: 1,
      };
      return await searchEdgar(env, query);
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
      if (!cik) throw new Error('cik is required');
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
      if (!term) throw new Error('ticker_or_cik is required');
      // Direct function call rather than worker-self-fetch (Cloudflare
      // workers can't reliably loop back through their own public URL).
      return await readSECTicker(env, term);
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
      const route = getStringArg(args, 'route');
      if (!route || !isEIARoute(route)) {
        return {
          ok: false,
          error: 'invalid_route',
          hint: `route must be one of: ${Object.keys(EIA_ROUTES).join(', ')}`,
        };
      }
      const length = Math.max(1, Math.min(getNumberArg(args, 'length') ?? 100, 5000));
      return await fetchEIASeries(env, {
        route,
        frequency: EIA_ROUTES[route].default_frequency,
        start: getStringArg(args, 'start'),
        end: getStringArg(args, 'end'),
        length,
        offset: 0,
        facets: {},
        data_columns: ['value'],
      });
    },
  },
];

// ── Method handlers ─────────────────────────────────────────────────

interface DispatchContext {
  env: Env;
  bearerToken: string | null;
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
      'Free tier: AI news, model pricing, AI service status, MITRE CVE / CISA KEV / EPSS / OSV.dev / SEC EDGAR / EIA Open Data / NASA POWER. ' +
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
  try {
    const data = await tool.handler(ctx.env, args);
    return { result: mcpContent(data) };
  } catch (e) {
    return mcpToolError(`tool_error: ${e instanceof Error ? e.message : String(e)}`);
  }
}

function mcpToolError(message: string): { result: unknown } {
  return {
    result: { content: [{ type: 'text', text: message }], isError: true },
  };
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
  const ctx: DispatchContext = { env, bearerToken };

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
    return rpcResponse(
      rpcError(id, ERR_INTERNAL, `internal_error: ${e instanceof Error ? e.message : String(e)}`),
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
