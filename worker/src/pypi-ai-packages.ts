import { Env } from './types';

/**
 * AI/ML PyPI package trending.
 *
 * Sister to npm-ai-packages.ts. Curated list of PyPI packages relevant
 * to AI agents, LLM SDKs, inference frameworks, and ML tooling. We
 * fetch monthly download counts via pypistats.org's public JSON API
 * once per day per package.
 *
 * Source posture: pypistats.org is an open-source service (PSF-hosted,
 * github.com/pypi/pypistats, BSD 3-clause) that exposes the canonical
 * PyPI download statistics derived from the BigQuery public dataset
 * (linehaul-data). The underlying data is public; the service is
 * documented as community-usable. We cache aggressively (one call per
 * package per day) and surface attribution to the upstream.
 *
 * Daily refresh at 03:45 UTC. Sequential per-package calls to be
 * polite to pypistats.org, which is the smallest piece of upstream
 * infrastructure we touch.
 */

const PYPISTATS_RECENT_URL = 'https://pypistats.org/api/packages/';
const FETCH_TIMEOUT_MS = 12_000;

const CURRENT_KEY = 'pypi-ai:current';
const META_KEY = 'pypi-ai:meta';

// === Curated package list ============================================

export type PackageCategory =
  | 'llm-sdk'
  | 'agent-framework'
  | 'rag'
  | 'inference'
  | 'evals'
  | 'observability'
  | 'tooling'
  | 'mcp';

interface CuratedPackage {
  name: string;
  category: PackageCategory;
  description: string;
  homepage?: string;
}

export const CURATED_PYPI_PACKAGES: CuratedPackage[] = [
  // LLM SDKs
  { name: 'anthropic', category: 'llm-sdk', description: "Anthropic's official Claude SDK", homepage: 'https://github.com/anthropics/anthropic-sdk-python' },
  { name: 'openai', category: 'llm-sdk', description: 'OpenAI Python SDK', homepage: 'https://github.com/openai/openai-python' },
  { name: 'google-generativeai', category: 'llm-sdk', description: 'Google Generative AI Python SDK' },
  { name: 'mistralai', category: 'llm-sdk', description: 'Mistral AI Python SDK' },
  { name: 'cohere', category: 'llm-sdk', description: 'Cohere Python SDK' },
  { name: 'groq', category: 'llm-sdk', description: 'Groq Cloud Python SDK' },
  { name: 'together', category: 'llm-sdk', description: 'Together AI Python SDK' },
  { name: 'replicate', category: 'llm-sdk', description: 'Replicate API client' },

  // Agent frameworks
  { name: 'langchain', category: 'agent-framework', description: 'LangChain framework', homepage: 'https://langchain.com' },
  { name: 'langchain-core', category: 'agent-framework', description: 'LangChain core abstractions' },
  { name: 'langchain-openai', category: 'agent-framework', description: 'LangChain OpenAI integration' },
  { name: 'langchain-anthropic', category: 'agent-framework', description: 'LangChain Anthropic integration' },
  { name: 'langchain-community', category: 'agent-framework', description: 'LangChain community integrations' },
  { name: 'langgraph', category: 'agent-framework', description: 'LangGraph: stateful multi-actor agent runtimes' },
  { name: 'llama-index', category: 'agent-framework', description: 'LlamaIndex (formerly GPT Index)' },
  { name: 'llama-index-core', category: 'agent-framework', description: 'LlamaIndex core' },
  { name: 'crewai', category: 'agent-framework', description: 'CrewAI multi-agent orchestration' },
  { name: 'autogen-agentchat', category: 'agent-framework', description: "Microsoft's AutoGen agent chat framework" },
  { name: 'smolagents', category: 'agent-framework', description: "HuggingFace's smolagents" },
  { name: 'pydantic-ai', category: 'agent-framework', description: 'Pydantic-based agent framework' },

  // RAG / vector
  { name: 'pinecone-client', category: 'rag', description: 'Pinecone vector DB SDK' },
  { name: 'chromadb', category: 'rag', description: 'Chroma open-source embedding DB' },
  { name: 'qdrant-client', category: 'rag', description: 'Qdrant vector DB SDK' },
  { name: 'weaviate-client', category: 'rag', description: 'Weaviate vector DB client' },
  { name: 'faiss-cpu', category: 'rag', description: "Meta's FAISS similarity search" },

  // Inference / runtime
  { name: 'transformers', category: 'inference', description: 'HuggingFace Transformers library' },
  { name: 'diffusers', category: 'inference', description: 'HuggingFace Diffusers library' },
  { name: 'sentence-transformers', category: 'inference', description: 'Sentence-Transformers embedding library' },
  { name: 'vllm', category: 'inference', description: 'High-throughput LLM serving' },
  { name: 'ollama', category: 'inference', description: 'Ollama Python client' },

  // MCP
  { name: 'mcp', category: 'mcp', description: 'Anthropic-backed MCP Python SDK', homepage: 'https://modelcontextprotocol.io' },

  // Evals
  { name: 'deepeval', category: 'evals', description: 'LLM evaluation framework' },
  { name: 'ragas', category: 'evals', description: 'RAG evaluation toolkit' },
  { name: 'promptflow-evals', category: 'evals', description: 'PromptFlow evaluators' },

  // Observability
  { name: 'langfuse', category: 'observability', description: 'Open-source LLM engineering platform' },
  { name: 'langsmith', category: 'observability', description: 'LangChain observability and eval' },
  { name: 'opik', category: "observability", description: "Comet's LLM observability" },

  // Tooling
  { name: 'tiktoken', category: 'tooling', description: 'OpenAI BPE tokenizer' },
  { name: 'tokenizers', category: 'tooling', description: 'HuggingFace fast tokenizers' },
  { name: 'accelerate', category: 'tooling', description: 'HuggingFace Accelerate' },
  { name: 'peft', category: 'tooling', description: 'Parameter-Efficient Fine-Tuning' },
  { name: 'bitsandbytes', category: 'tooling', description: 'Quantization library' },
  { name: 'tensorfeed', category: 'tooling', description: 'TensorFeed Python SDK (this project)' },
];

// === Fetcher =========================================================

interface PyPIStatsRecentResponse {
  data?: {
    last_day?: number;
    last_week?: number;
    last_month?: number;
  };
  package?: string;
  type?: string;
}

interface DownloadCounts {
  last_day: number;
  last_week: number;
  last_month: number;
}

/**
 * Fetch a single package's download counts from pypistats.org.
 * Returns null on any failure (HTTP error, JSON parse, missing data)
 * so the orchestrator can record per-package failures without
 * aborting the whole refresh.
 */
async function fetchPackageStats(pkg: string): Promise<DownloadCounts | null> {
  const url = `${PYPISTATS_RECENT_URL}${encodeURIComponent(pkg)}/recent`;
  try {
    const res = await fetch(url, {
      headers: {
        'User-Agent': 'tensorfeed-pypi-trending/1.0 (mailto:evan@tensorfeed.ai; +https://tensorfeed.ai)',
        'Accept': 'application/json',
      },
      signal: AbortSignal.timeout(FETCH_TIMEOUT_MS),
      cf: { cacheTtl: 60 } as RequestInitCfProperties,
    });
    if (!res.ok) return null;
    const body = (await res.json()) as PyPIStatsRecentResponse;
    if (!body.data) return null;
    return {
      last_day: typeof body.data.last_day === 'number' ? body.data.last_day : 0,
      last_week: typeof body.data.last_week === 'number' ? body.data.last_week : 0,
      last_month: typeof body.data.last_month === 'number' ? body.data.last_month : 0,
    };
  } catch (err) {
    console.warn(`pypi fetch failed for ${pkg}:`, err);
    return null;
  }
}

export async function fetchPyPIDownloads(): Promise<Map<string, DownloadCounts>> {
  const out = new Map<string, DownloadCounts>();
  // Sequential: pypistats.org is small infrastructure; one request at
  // a time with a small breath between is the polite default.
  for (const p of CURATED_PYPI_PACKAGES) {
    const counts = await fetchPackageStats(p.name);
    if (counts) out.set(p.name, counts);
  }
  return out;
}

// === Snapshot =======================================================

export interface PyPIPackageEntry {
  name: string;
  category: PackageCategory;
  description: string;
  homepage: string | null;
  downloads_last_day: number;
  downloads_last_week: number;
  downloads_last_month: number;
  rank: number;
  rank_in_category: number;
}

export interface PyPITrendingSnapshot {
  capturedAt: string;
  total_packages: number;
  total_downloads_last_month: number;
  packages: PyPIPackageEntry[];
}

export function buildSnapshot(downloads: Map<string, DownloadCounts>): PyPITrendingSnapshot {
  const entries = CURATED_PYPI_PACKAGES.map(p => {
    const d = downloads.get(p.name);
    return {
      name: p.name,
      category: p.category,
      description: p.description,
      homepage: p.homepage ?? null,
      downloads_last_day: d?.last_day ?? 0,
      downloads_last_week: d?.last_week ?? 0,
      downloads_last_month: d?.last_month ?? 0,
    };
  });

  entries.sort((a, b) => b.downloads_last_month - a.downloads_last_month);

  const ranked: PyPIPackageEntry[] = entries.map((e, i) => ({
    ...e,
    rank: i + 1,
    rank_in_category: 0,
  }));

  const categoryCounts = new Map<PackageCategory, number>();
  for (const e of ranked) {
    const c = (categoryCounts.get(e.category) ?? 0) + 1;
    categoryCounts.set(e.category, c);
    e.rank_in_category = c;
  }

  const total = ranked.reduce((sum, e) => sum + e.downloads_last_month, 0);

  return {
    capturedAt: new Date().toISOString(),
    total_packages: ranked.length,
    total_downloads_last_month: total,
    packages: ranked,
  };
}

// === Cron entry =====================================================

export interface RefreshResult {
  ok: boolean;
  total_packages: number;
  total_downloads_last_month: number;
  resolved: number;
  unresolved: string[];
}

export async function refreshPyPITrending(env: Env): Promise<RefreshResult> {
  const downloads = await fetchPyPIDownloads();
  const snapshot = buildSnapshot(downloads);

  const unresolved = CURATED_PYPI_PACKAGES.filter(p => !downloads.has(p.name)).map(p => p.name);

  await env.TENSORFEED_CACHE.put(CURRENT_KEY, JSON.stringify(snapshot));
  await env.TENSORFEED_CACHE.put(META_KEY, JSON.stringify({
    capturedAt: snapshot.capturedAt,
    total_packages: snapshot.total_packages,
    total_downloads_last_month: snapshot.total_downloads_last_month,
    resolved: downloads.size,
    unresolved_count: unresolved.length,
  }));

  return {
    ok: downloads.size > 0,
    total_packages: snapshot.total_packages,
    total_downloads_last_month: snapshot.total_downloads_last_month,
    resolved: downloads.size,
    unresolved,
  };
}

// === Read API =======================================================

export interface PyPITrendingAttribution {
  source: string;
  source_url: string;
  upstream: string;
  policy: string;
}

export const PYPI_ATTRIBUTION: PyPITrendingAttribution = {
  source: 'pypistats.org',
  source_url: 'https://pypistats.org',
  upstream: 'PyPI BigQuery public dataset (Linehaul project, Python Software Foundation)',
  policy:
    'Download counts retrieved from the public pypistats.org JSON API, which serves aggregates derived from the PyPI BigQuery public dataset published by the Linehaul project. Underlying data is public. Curated package list is editorial; rankings recomputed daily.',
};

export interface PyPITrendingResponse {
  ok: true;
  capturedAt: string;
  total_packages: number;
  total_downloads_last_month: number;
  filters: { category?: PackageCategory };
  packages: PyPIPackageEntry[];
  attribution: PyPITrendingAttribution;
}

export interface PyPITrendingOptions {
  category?: PackageCategory;
  limit?: number;
}

export const VALID_CATEGORIES: PackageCategory[] = [
  'llm-sdk',
  'agent-framework',
  'rag',
  'inference',
  'evals',
  'observability',
  'tooling',
  'mcp',
];

export function isValidCategory(s: string): s is PackageCategory {
  return (VALID_CATEGORIES as string[]).includes(s);
}

export async function readPyPITrending(
  env: Env,
  options: PyPITrendingOptions = {},
): Promise<PyPITrendingResponse | null> {
  const snapshot = (await env.TENSORFEED_CACHE.get(CURRENT_KEY, 'json')) as PyPITrendingSnapshot | null;
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
    total_downloads_last_month: snapshot.total_downloads_last_month,
    filters: options.category ? { category: options.category } : {},
    packages: packages.slice(0, limit),
    attribution: PYPI_ATTRIBUTION,
  };
}
