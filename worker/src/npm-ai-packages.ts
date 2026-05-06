import { Env } from './types';

/**
 * AI/ML npm package trending.
 *
 * Curated list of npm packages relevant to AI agents, LLM SDKs,
 * inference frameworks, and the agent-tooling ecosystem. We fetch
 * weekly download counts via the documented bulk-downloads endpoint
 * (api.npmjs.org/downloads/point/last-week/{packages}, up to 128 per
 * call), sort by downloads, and expose the leaderboard.
 *
 * Source: npm registry download counts API. Documented at
 * github.com/npm/registry/blob/master/docs/download-counts.md.
 * No commercial redistribution restrictions; used commercially by
 * npmtrends, libraries.io, snyk, and dozens of others.
 *
 * Daily refresh at 03:30 UTC. Rate-limit-friendly (one bulk call).
 */

const NPM_BULK_URL = 'https://api.npmjs.org/downloads/point/last-week/';
const FETCH_TIMEOUT_MS = 15_000;

const CURRENT_KEY = 'npm-ai:current';
const META_KEY = 'npm-ai:meta';

// === Curated package list ============================================
//
// Grouped editorially. Each entry carries a category so the response
// can group by category for agents that want, e.g., "what are the top
// LLM SDKs" rather than the global ranking.

export type PackageCategory =
  | 'llm-sdk'
  | 'agent-framework'
  | 'rag'
  | 'inference'
  | 'evals'
  | 'tooling'
  | 'mcp';

interface CuratedPackage {
  name: string;
  category: PackageCategory;
  description: string;
  homepage?: string;
}

export const CURATED_PACKAGES: CuratedPackage[] = [
  // LLM SDKs (vendor-shipped)
  { name: '@anthropic-ai/sdk', category: 'llm-sdk', description: "Anthropic's official Claude SDK", homepage: 'https://github.com/anthropics/anthropic-sdk-typescript' },
  { name: 'openai', category: 'llm-sdk', description: 'OpenAI Node.js SDK', homepage: 'https://github.com/openai/openai-node' },
  { name: '@google/generative-ai', category: 'llm-sdk', description: 'Google Generative AI SDK', homepage: 'https://github.com/google-gemini/generative-ai-js' },
  { name: '@mistralai/mistralai', category: 'llm-sdk', description: 'Mistral AI Node.js SDK' },
  { name: 'cohere-ai', category: 'llm-sdk', description: 'Cohere Node.js SDK' },
  { name: 'groq-sdk', category: 'llm-sdk', description: 'Groq Cloud SDK' },
  { name: 'together-ai', category: 'llm-sdk', description: 'Together AI Node.js SDK' },

  // Agent frameworks
  { name: 'langchain', category: 'agent-framework', description: 'LangChain core framework', homepage: 'https://js.langchain.com' },
  { name: '@langchain/core', category: 'agent-framework', description: 'LangChain core abstractions' },
  { name: '@langchain/openai', category: 'agent-framework', description: 'LangChain OpenAI integration' },
  { name: '@langchain/anthropic', category: 'agent-framework', description: 'LangChain Anthropic integration' },
  { name: '@langchain/community', category: 'agent-framework', description: 'LangChain community integrations' },
  { name: '@langchain/langgraph', category: 'agent-framework', description: 'LangGraph: stateful multi-actor agent runtimes' },
  { name: 'llamaindex', category: 'agent-framework', description: 'LlamaIndex (formerly GPT Index) for TypeScript' },
  { name: 'ai', category: 'agent-framework', description: 'Vercel AI SDK', homepage: 'https://sdk.vercel.ai' },
  { name: 'crewai', category: 'agent-framework', description: 'CrewAI multi-agent orchestration' },
  { name: '@inkeep/agents-core', category: 'agent-framework', description: 'Inkeep agents core' },
  { name: 'mastra', category: 'agent-framework', description: 'Mastra agent framework' },
  { name: '@mastra/core', category: 'agent-framework', description: 'Mastra core runtime' },

  // RAG / vector
  { name: '@pinecone-database/pinecone', category: 'rag', description: 'Pinecone vector DB SDK' },
  { name: 'chromadb', category: 'rag', description: 'Chroma open-source embedding DB' },
  { name: '@qdrant/js-client-rest', category: 'rag', description: 'Qdrant vector DB SDK' },
  { name: 'weaviate-client', category: 'rag', description: 'Weaviate vector DB client' },

  // Inference / runtime
  { name: 'transformers.js', category: 'inference', description: 'HuggingFace Transformers in the browser' },
  { name: '@huggingface/inference', category: 'inference', description: 'HuggingFace inference client' },
  { name: 'ollama', category: 'inference', description: 'Ollama local LLM client' },
  { name: 'replicate', category: 'inference', description: 'Replicate inference SDK' },

  // MCP (Model Context Protocol)
  { name: '@modelcontextprotocol/sdk', category: 'mcp', description: 'Anthropic-backed MCP TypeScript SDK', homepage: 'https://modelcontextprotocol.io' },
  { name: '@modelcontextprotocol/server-filesystem', category: 'mcp', description: 'Reference filesystem MCP server' },

  // Evals / testing
  { name: 'autoevals', category: 'evals', description: 'Braintrust evaluator library' },
  { name: 'promptfoo', category: 'evals', description: 'LLM eval and red-teaming framework' },

  // Agent tooling
  { name: 'tensorfeed', category: 'tooling', description: 'TensorFeed JS SDK (this project)' },
  { name: 'tiktoken', category: 'tooling', description: 'OpenAI tokenizer (BPE)' },
  { name: 'gpt-tokenizer', category: 'tooling', description: 'GPT tokenizer (pure-JS)' },
  { name: 'js-tiktoken', category: 'tooling', description: 'JS port of tiktoken' },
];

// === Fetcher =========================================================

interface NpmDownloadsResponse {
  downloads: number;
  start: string;
  end: string;
  package: string;
}

interface NpmBulkResponse {
  [pkg: string]: NpmDownloadsResponse | null;
}

/**
 * Fetch weekly downloads for the curated list. npm's bulk endpoint
 * accepts up to 128 comma-separated packages per call. Scoped
 * packages (@org/name) are NOT supported in bulk queries, so we
 * partition: bulk the unscoped packages, individually call the
 * scoped ones. Documented behavior per github.com/npm/registry.
 */
export async function fetchNpmDownloads(): Promise<Map<string, number>> {
  const out = new Map<string, number>();

  const scoped = CURATED_PACKAGES.filter(p => p.name.startsWith('@')).map(p => p.name);
  const unscoped = CURATED_PACKAGES.filter(p => !p.name.startsWith('@')).map(p => p.name);

  // Single bulk call for unscoped (well under the 128 limit)
  if (unscoped.length > 0) {
    const url = NPM_BULK_URL + encodeURIComponent(unscoped.join(','));
    try {
      const res = await fetch(url, {
        headers: {
          'User-Agent': 'tensorfeed-npm-trending/1.0 (+https://tensorfeed.ai)',
          'Accept': 'application/json',
        },
        signal: AbortSignal.timeout(FETCH_TIMEOUT_MS),
        cf: { cacheTtl: 60 } as RequestInitCfProperties,
      });
      if (res.ok) {
        const data = (await res.json()) as NpmBulkResponse;
        for (const [name, body] of Object.entries(data)) {
          if (body && typeof body.downloads === 'number') {
            out.set(name, body.downloads);
          }
        }
      } else {
        console.warn(`npm bulk fetch HTTP ${res.status}`);
      }
    } catch (err) {
      console.warn('npm bulk fetch failed:', err);
    }
  }

  // Per-package calls for scoped names. ~10-15 calls, all to the same
  // origin under 1000-req/hour soft cap, well within api.npmjs.org's
  // documented usage envelope.
  await Promise.all(
    scoped.map(async pkg => {
      const url = `${NPM_BULK_URL}${encodeURIComponent(pkg)}`;
      try {
        const res = await fetch(url, {
          headers: {
            'User-Agent': 'tensorfeed-npm-trending/1.0 (+https://tensorfeed.ai)',
            'Accept': 'application/json',
          },
          signal: AbortSignal.timeout(FETCH_TIMEOUT_MS),
          cf: { cacheTtl: 60 } as RequestInitCfProperties,
        });
        if (!res.ok) return;
        const body = (await res.json()) as NpmDownloadsResponse;
        if (typeof body.downloads === 'number') {
          out.set(pkg, body.downloads);
        }
      } catch (err) {
        console.warn(`npm fetch failed for ${pkg}:`, err);
      }
    }),
  );

  return out;
}

// === Snapshot =======================================================

export interface NpmPackageEntry {
  name: string;
  category: PackageCategory;
  description: string;
  homepage: string | null;
  downloads_last_week: number;
  rank: number;
  rank_in_category: number;
}

export interface NpmTrendingSnapshot {
  capturedAt: string;
  total_packages: number;
  total_downloads_last_week: number;
  packages: NpmPackageEntry[];
}

export function buildSnapshot(downloads: Map<string, number>): NpmTrendingSnapshot {
  const entries: Omit<NpmPackageEntry, 'rank' | 'rank_in_category'>[] = CURATED_PACKAGES.map(p => ({
    name: p.name,
    category: p.category,
    description: p.description,
    homepage: p.homepage ?? null,
    downloads_last_week: downloads.get(p.name) ?? 0,
  }));

  entries.sort((a, b) => b.downloads_last_week - a.downloads_last_week);

  // Global rank
  const ranked: NpmPackageEntry[] = entries.map((e, i) => ({
    ...e,
    rank: i + 1,
    rank_in_category: 0,
  }));

  // Category rank: re-iterate inside each category preserving the
  // global-sorted order
  const categoryCounts = new Map<PackageCategory, number>();
  for (const e of ranked) {
    const c = (categoryCounts.get(e.category) ?? 0) + 1;
    categoryCounts.set(e.category, c);
    e.rank_in_category = c;
  }

  const total = ranked.reduce((sum, e) => sum + e.downloads_last_week, 0);

  return {
    capturedAt: new Date().toISOString(),
    total_packages: ranked.length,
    total_downloads_last_week: total,
    packages: ranked,
  };
}

// === Cron entry =====================================================

export interface RefreshResult {
  ok: boolean;
  total_packages: number;
  total_downloads_last_week: number;
  resolved: number;     // packages that returned a download count
  unresolved: string[]; // packages that did not (api missed, scoped issue, etc.)
}

export async function refreshNpmTrending(env: Env): Promise<RefreshResult> {
  const downloads = await fetchNpmDownloads();
  const snapshot = buildSnapshot(downloads);

  const unresolved = CURATED_PACKAGES.filter(p => !downloads.has(p.name)).map(p => p.name);

  await env.TENSORFEED_CACHE.put(CURRENT_KEY, JSON.stringify(snapshot));
  await env.TENSORFEED_CACHE.put(META_KEY, JSON.stringify({
    capturedAt: snapshot.capturedAt,
    total_packages: snapshot.total_packages,
    total_downloads_last_week: snapshot.total_downloads_last_week,
    resolved: downloads.size,
    unresolved_count: unresolved.length,
  }));

  return {
    ok: downloads.size > 0,
    total_packages: snapshot.total_packages,
    total_downloads_last_week: snapshot.total_downloads_last_week,
    resolved: downloads.size,
    unresolved,
  };
}

// === Read API =======================================================

export interface NpmTrendingAttribution {
  source: string;
  source_url: string;
  policy: string;
}

export const NPM_ATTRIBUTION: NpmTrendingAttribution = {
  source: 'npm registry download counts API',
  source_url: 'https://api.npmjs.org/downloads/point/',
  policy:
    'Download counts retrieved from the documented public npm downloads API. Curated package list is editorial, refreshed manually on redeploy. Rankings recomputed daily.',
};

export interface NpmTrendingResponse {
  ok: true;
  capturedAt: string;
  total_packages: number;
  total_downloads_last_week: number;
  filters: { category?: PackageCategory };
  packages: NpmPackageEntry[];
  attribution: NpmTrendingAttribution;
}

export interface NpmTrendingOptions {
  category?: PackageCategory;
  limit?: number;
}

export async function readNpmTrending(
  env: Env,
  options: NpmTrendingOptions = {},
): Promise<NpmTrendingResponse | null> {
  const snapshot = (await env.TENSORFEED_CACHE.get(CURRENT_KEY, 'json')) as NpmTrendingSnapshot | null;
  if (!snapshot) return null;

  const limit = Math.max(1, Math.min(options.limit ?? snapshot.packages.length, 200));
  let packages = snapshot.packages;
  if (options.category) {
    packages = packages.filter(p => p.category === options.category);
  }

  return {
    ok: true,
    capturedAt: snapshot.capturedAt,
    total_packages: snapshot.packages.length,
    total_downloads_last_week: snapshot.total_downloads_last_week,
    filters: options.category ? { category: options.category } : {},
    packages: packages.slice(0, limit),
    attribution: NPM_ATTRIBUTION,
  };
}

export const VALID_CATEGORIES: PackageCategory[] = [
  'llm-sdk',
  'agent-framework',
  'rag',
  'inference',
  'evals',
  'tooling',
  'mcp',
];

export function isValidCategory(s: string): s is PackageCategory {
  return (VALID_CATEGORIES as string[]).includes(s);
}
