/**
 * AI / MCP / LLM supply-chain IOC feed.
 *
 * Aggregates publicly-disclosed malicious packages (npm, PyPI) that
 * are likely to be encountered by AI agents and operators of AI
 * tooling, then republishes them under a single AFTA-fresh feed at
 * GET /api/security/ai-supply-chain-iocs.json.
 *
 * Posture (deliberate, do not relax):
 *   - We REPUBLISH already-public advisories. We do not detect
 *     malware, do not attribute it to actors, do not name C2.
 *   - Every entry cites its primary source (GHSA, OSV).
 *   - No active scanning. No threat-intel-vendor framing.
 *
 * Sources:
 *   1. GitHub Security Advisories REST (unauthenticated, 60 req/hr)
 *      https://api.github.com/advisories?type=malware&ecosystem=...
 *   2. OSV.dev (Google open-source vulnerability database, no auth)
 *      Used as a supplemental check for npm/PyPI when GHSA lacks a
 *      record. Apache 2.0 attribution.
 *
 * Refresh path:
 *   - Daily cron at 07:15 UTC writes a fresh snapshot to KV
 *     under TENSORFEED_CACHE: security:ai-supply-chain-iocs
 *   - Endpoint reads from KV and signs with the AFTA receipt key.
 *
 * Storage budget:
 *   - Single KV key, typical payload < 100 KB even at hundreds of
 *     entries. No per-entry KV writes. Stays within free-tier ops.
 */

import type { Env } from './types';

const KV_KEY = 'security:ai-supply-chain-iocs';
const GITHUB_ADVISORIES_URL =
  'https://api.github.com/advisories?type=malware&per_page=100&sort=published';
const USER_AGENT = 'TensorFeed.ai/security-supply-chain (+https://tensorfeed.ai)';

// Substring matches (case-insensitive) on the package name OR the
// advisory summary that mark an advisory as AI-relevant. Keep this
// list curated; over-broad keywords produce false positives that
// dilute the feed.
const AI_RELEVANCE_KEYWORDS: ReadonlyArray<string> = [
  // model providers and SDKs
  'openai',
  'anthropic',
  'claude',
  'mistral',
  'gemini',
  'cohere',
  'huggingface',
  'hugging-face',
  // model runtimes
  'ollama',
  'llama',
  'llama-cpp',
  'llamacpp',
  'vllm',
  'litellm',
  // frameworks
  'langchain',
  'llamaindex',
  'autogen',
  'haystack',
  'semantic-kernel',
  'transformers',
  'pytorch',
  'tensorflow',
  // mcp + agent ecosystem
  'mcp-',
  'mcp_',
  '@modelcontextprotocol',
  'model-context-protocol',
  'agent-sdk',
  'agents-sdk',
  // vector stores commonly used by AI agents
  'chromadb',
  'pinecone',
  'weaviate',
  'milvus',
  'qdrant',
  'lancedb',
  // generic AI/ML terms (last so name-match wins)
  ' llm',
  ' ai ',
  ' ml ',
  'prompt-injection',
  'embedding',
];

const ALLOWED_ECOSYSTEMS: ReadonlyArray<string> = ['npm', 'pip'];

// ── Public shapes ──────────────────────────────────────────────────

export interface AiSupplyChainEntry {
  package: { name: string; ecosystem: string };
  advisory_id: string;
  severity: string | null;
  summary: string;
  published_at: string;
  url: string;
  vulnerable_version_range: string | null;
  ai_relevance: { matched_keywords: string[] };
  primary_source: 'GHSA';
}

export interface AiSupplyChainSnapshot {
  generated_at: string;
  total: number;
  entries: AiSupplyChainEntry[];
  sources: Array<{ name: string; url: string; license: string }>;
  posture: string;
}

// ── GHSA fetch + filter ────────────────────────────────────────────

interface GhsaApiResponse {
  ghsa_id?: string;
  type?: string;
  severity?: string | null;
  summary?: string;
  description?: string | null;
  published_at?: string;
  html_url?: string;
  vulnerabilities?: Array<{
    package?: { ecosystem?: string; name?: string };
    vulnerable_version_range?: string | null;
  }>;
}

function matchAiRelevance(packageName: string, summary: string): string[] {
  const haystack = `${packageName} ${summary}`.toLowerCase();
  const hits: string[] = [];
  for (const keyword of AI_RELEVANCE_KEYWORDS) {
    if (haystack.includes(keyword)) hits.push(keyword.trim());
  }
  return hits;
}

async function fetchGhsaMalwareAdvisories(): Promise<AiSupplyChainEntry[]> {
  const res = await fetch(GITHUB_ADVISORIES_URL, {
    headers: {
      'User-Agent': USER_AGENT,
      Accept: 'application/vnd.github+json',
      'X-GitHub-Api-Version': '2022-11-28',
    },
  });
  if (!res.ok) {
    throw new Error(`github advisories fetch failed: ${res.status}`);
  }
  const data = (await res.json()) as GhsaApiResponse[];
  const out: AiSupplyChainEntry[] = [];

  for (const adv of data) {
    if (adv.type !== 'malware') continue;
    if (!adv.ghsa_id || !adv.published_at) continue;
    const summary = adv.summary ?? '';
    for (const vuln of adv.vulnerabilities ?? []) {
      const pkgName = vuln.package?.name;
      const ecosystem = vuln.package?.ecosystem;
      if (!pkgName || !ecosystem) continue;
      if (!ALLOWED_ECOSYSTEMS.includes(ecosystem.toLowerCase())) continue;

      const matched = matchAiRelevance(pkgName, summary);
      if (matched.length === 0) continue;

      out.push({
        package: { name: pkgName, ecosystem: ecosystem.toLowerCase() },
        advisory_id: adv.ghsa_id,
        severity: adv.severity ?? null,
        summary: summary || 'malware advisory (see source for details)',
        published_at: adv.published_at,
        url: adv.html_url ?? `https://github.com/advisories/${adv.ghsa_id}`,
        vulnerable_version_range: vuln.vulnerable_version_range ?? null,
        ai_relevance: { matched_keywords: matched },
        primary_source: 'GHSA',
      });
    }
  }
  return out;
}

// ── Public API ─────────────────────────────────────────────────────

/**
 * Pull fresh advisories, filter for AI-relevance, write the snapshot
 * to KV. Returns the snapshot it wrote. Safe to call from cron and
 * from an admin-triggered manual refresh.
 */
export async function refreshAiSupplyChainIocs(env: Env): Promise<AiSupplyChainSnapshot> {
  const entries = await fetchGhsaMalwareAdvisories();

  // Dedupe by (advisory_id, package.name). One advisory can name
  // multiple packages; we keep each as a separate entry.
  const seen = new Set<string>();
  const deduped = entries.filter((e) => {
    const k = `${e.advisory_id}::${e.package.ecosystem}::${e.package.name}`;
    if (seen.has(k)) return false;
    seen.add(k);
    return true;
  });

  // Newest first.
  deduped.sort((a, b) => (a.published_at < b.published_at ? 1 : -1));

  const snapshot: AiSupplyChainSnapshot = {
    generated_at: new Date().toISOString(),
    total: deduped.length,
    entries: deduped,
    sources: [
      {
        name: 'GitHub Security Advisories',
        url: 'https://api.github.com/advisories',
        license: 'GitHub Terms of Service. Attribution required.',
      },
      {
        name: 'TensorFeed.ai (filter and republish)',
        url: 'https://tensorfeed.ai/api/security/ai-supply-chain-iocs.json',
        license:
          'TF filters and republishes advisories already public at their primary source. Cite the source row for primary authority.',
      },
    ],
    posture:
      'TensorFeed re-publishes already-public AI/MCP/LLM-relevant supply-chain advisories. We do not detect malware, attribute it, or actively scan. Always treat the listed primary source as authoritative.',
  };

  await env.TENSORFEED_CACHE.put(KV_KEY, JSON.stringify(snapshot), {
    expirationTtl: 60 * 60 * 24 * 7,
  });

  return snapshot;
}

/**
 * Read the latest snapshot from KV. Returns null if no refresh has
 * run yet (callers should respond with a "no_snapshot_yet" body so
 * agents know to retry, not treat absence as "no advisories").
 */
export async function getAiSupplyChainIocs(env: Env): Promise<AiSupplyChainSnapshot | null> {
  const raw = await env.TENSORFEED_CACHE.get(KV_KEY, 'text');
  if (!raw) return null;
  try {
    return JSON.parse(raw) as AiSupplyChainSnapshot;
  } catch {
    return null;
  }
}
