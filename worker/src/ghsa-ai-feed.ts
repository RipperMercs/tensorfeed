/**
 * GitHub Security Advisories: AI-filtered firehose.
 *
 * Broader companion to the narrower /api/security/ai-supply-chain-iocs
 * feed. Where that endpoint only surfaces npm/pip MALWARE advisories,
 * this one covers all GHSA types (reviewed vulnerabilities, unreviewed,
 * malware) across all ecosystems (npm, pip, RubyGems, Maven, Go,
 * Composer, NuGet, Rust, Pub, Erlang, GitHub Actions, Swift), filtered
 * to the same AI keyword list.
 *
 * Use case: a security agent that wants the firehose of AI-relevant
 * security advisories, not just supply-chain malware. Examples:
 *   - LangChain RCE in a Java app → Maven advisory, not malware
 *   - vLLM auth bypass → pip advisory, type "reviewed"
 *   - Ollama path-traversal → Go advisory
 * The narrow IOC feed misses all of these because they're not malware.
 *
 * Posture (same as the narrow IOC feed, deliberate, do not relax):
 *   - We REPUBLISH already-public advisories. Filter + derive, do not
 *     detect or attribute.
 *   - Every entry cites its primary source (GHSA ID + URL).
 *   - No active scanning. No threat-intel-vendor framing.
 *
 * Pricing: premium endpoint at /api/premium/security/ghsa/ai-feed,
 * Tier 1 (1 credit, $0.02). The free IOC feed stays free as a narrow
 * defensive signal; the premium firehose adds breadth + derived
 * severity_band + age_days + ai_relevance.confidence per entry.
 *
 * Refresh:
 *   - Daily (or 6-hourly) cron writes a single KV snapshot.
 *   - KV key: security:ghsa-ai-feed (single key, < 200KB typical).
 */

import type { Env } from './types';
import { AI_RELEVANCE_KEYWORDS, matchAiRelevance } from './ai-supply-chain-iocs';

const KV_KEY = 'security:ghsa-ai-feed';
// No `type=malware` filter; we want all advisories. `per_page=100` is
// GitHub's max. Recent advisories sorted first so the latest signal is
// at the top of the response.
const GITHUB_ADVISORIES_URL =
  'https://api.github.com/advisories?per_page=100&sort=published&direction=desc';
const USER_AGENT = 'TensorFeed.ai/security-ghsa-ai-feed (+https://tensorfeed.ai)';

// ── Public shapes ──────────────────────────────────────────────────

export type SeverityBand = 'critical' | 'high' | 'medium' | 'low' | 'unknown';
export type AdvisoryType = 'reviewed' | 'unreviewed' | 'malware';
export type AiRelevanceConfidence = 'high' | 'medium' | 'low';

export interface GhsaAiAdvisoryEntry {
  advisory_id: string;          // GHSA-xxxx-xxxx-xxxx
  cve_id: string | null;        // CVE-YYYY-NNNNN if linked
  type: AdvisoryType;
  severity_band: SeverityBand;
  package: { name: string; ecosystem: string };
  vulnerable_version_range: string | null;
  first_patched_version: string | null;
  summary: string;              // truncated to 280 chars
  published_at: string;
  age_days: number;
  cwes: string[];               // CWE IDs only (e.g. CWE-79)
  references_count: number;
  url: string;                  // GHSA html_url
  ai_relevance: {
    matched_keywords: string[];
    confidence: AiRelevanceConfidence;
  };
}

export interface GhsaAiFeedSnapshot {
  generated_at: string;
  total: number;
  by_severity: Record<SeverityBand, number>;
  by_ecosystem: Record<string, number>;
  by_type: Record<AdvisoryType, number>;
  entries: GhsaAiAdvisoryEntry[];
  sources: Array<{ name: string; url: string; license: string }>;
  posture: string;
}

// ── GHSA API shape ─────────────────────────────────────────────────

interface GhsaApiResponse {
  ghsa_id?: string;
  cve_id?: string | null;
  type?: string;
  severity?: string | null;
  summary?: string;
  description?: string | null;
  published_at?: string;
  html_url?: string;
  cwes?: Array<{ cwe_id?: string; name?: string }>;
  references?: string[];
  vulnerabilities?: Array<{
    package?: { ecosystem?: string; name?: string };
    vulnerable_version_range?: string | null;
    first_patched_version?: string | null;
  }>;
}

// ── Derive helpers ─────────────────────────────────────────────────

function normalizeSeverity(s: string | null | undefined): SeverityBand {
  if (!s) return 'unknown';
  const lower = s.toLowerCase();
  if (lower === 'critical' || lower === 'high' || lower === 'medium' || lower === 'low') {
    return lower;
  }
  return 'unknown';
}

function normalizeType(t: string | undefined): AdvisoryType {
  if (t === 'malware') return 'malware';
  if (t === 'reviewed') return 'reviewed';
  return 'unreviewed';
}

function ageInDays(iso: string, now: number = Date.now()): number {
  const t = new Date(iso).getTime();
  if (!Number.isFinite(t)) return -1;
  return Math.max(0, Math.floor((now - t) / 86400_000));
}

function truncate(s: string, max: number): string {
  if (!s) return '';
  if (s.length <= max) return s;
  return s.slice(0, max - 3) + '...';
}

/**
 * Confidence tiering for the AI-relevance match. The matcher returns
 * any hit on the keyword list; this layer downgrades single weak hits
 * to "low" so agents that want only high-confidence signal can filter.
 *
 *   high   = 2+ keyword hits, OR 1 hit that is a model-provider name
 *            (openai, anthropic, claude, mistral, gemini, cohere) or
 *            a framework name (langchain, llamaindex, etc.)
 *   medium = 1 hit on a runtime / ecosystem term (mcp-, agent-, llama,
 *            ollama, vllm)
 *   low    = 1 hit on a generic term (' ai ', ' llm', ' ml ', etc.)
 */
const HIGH_CONFIDENCE_KEYWORDS = new Set([
  'openai', 'anthropic', 'claude', 'mistral', 'gemini', 'cohere',
  'huggingface', 'hugging-face', 'langchain', 'llamaindex', 'autogen',
  'haystack', 'semantic-kernel', '@modelcontextprotocol', 'model-context-protocol',
  '@uipath/',
]);

function classifyConfidence(matched: string[]): AiRelevanceConfidence {
  if (matched.length === 0) return 'low';
  if (matched.length >= 2) return 'high';
  const sole = matched[0];
  if (HIGH_CONFIDENCE_KEYWORDS.has(sole)) return 'high';
  // Single hit, weak keyword: 'low'
  if (sole === 'ai' || sole === 'llm' || sole === 'ml') return 'low';
  return 'medium';
}

// ── GHSA fetch + filter ────────────────────────────────────────────

async function fetchGhsaAdvisories(env: Env): Promise<GhsaAiAdvisoryEntry[]> {
  // Same auth path as the narrow IOC feed: GitHub rate-limits Cloudflare
  // egress IPs aggressively without auth. Reuse GITHUB_TOKEN.
  const headers: Record<string, string> = {
    'User-Agent': USER_AGENT,
    Accept: 'application/vnd.github+json',
    'X-GitHub-Api-Version': '2022-11-28',
  };
  if (env.GITHUB_TOKEN) {
    headers.Authorization = `Bearer ${env.GITHUB_TOKEN}`;
  }
  const res = await fetch(GITHUB_ADVISORIES_URL, { headers, signal: AbortSignal.timeout(30_000) });
  if (!res.ok) {
    throw new Error(`github advisories fetch failed: ${res.status}`);
  }
  const data = (await res.json()) as GhsaApiResponse[];
  const out: GhsaAiAdvisoryEntry[] = [];
  const now = Date.now();

  for (const adv of data) {
    if (!adv.ghsa_id || !adv.published_at) continue;

    // We don't filter on type at the top level; all advisory types are
    // potential signal. The downstream `by_type` aggregate lets callers
    // filter client-side.
    const advType = normalizeType(adv.type);
    const severityBand = normalizeSeverity(adv.severity);
    const summary = adv.summary ?? '';
    const description = adv.description ?? '';
    const cwes = (adv.cwes ?? [])
      .map((c) => c.cwe_id ?? '')
      .filter((s) => s.length > 0);

    for (const vuln of adv.vulnerabilities ?? []) {
      const pkgName = vuln.package?.name;
      const ecosystem = vuln.package?.ecosystem;
      if (!pkgName || !ecosystem) continue;

      // Match against package name + summary + description so we catch
      // AI relevance in any field, not just package names. This is what
      // makes the firehose broader than the narrow IOC feed.
      const matched = matchAiRelevance(pkgName, `${summary} ${description}`);
      if (matched.length === 0) continue;

      out.push({
        advisory_id: adv.ghsa_id,
        cve_id: adv.cve_id ?? null,
        type: advType,
        severity_band: severityBand,
        package: { name: pkgName, ecosystem: ecosystem.toLowerCase() },
        vulnerable_version_range: vuln.vulnerable_version_range ?? null,
        first_patched_version: vuln.first_patched_version ?? null,
        summary: truncate(summary || 'GHSA advisory (see source for details)', 280),
        published_at: adv.published_at,
        age_days: ageInDays(adv.published_at, now),
        cwes,
        references_count: (adv.references ?? []).length,
        url: adv.html_url ?? `https://github.com/advisories/${adv.ghsa_id}`,
        ai_relevance: {
          matched_keywords: matched,
          confidence: classifyConfidence(matched),
        },
      });
    }
  }
  return out;
}

// ── Public API ─────────────────────────────────────────────────────

/**
 * Pull fresh GHSA advisories, filter for AI-relevance, derive enrichment
 * fields, write the snapshot to KV. Same admin/cron entry point pattern
 * as refreshAiSupplyChainIocs.
 */
export async function refreshGhsaAiFeed(env: Env): Promise<GhsaAiFeedSnapshot> {
  const entries = await fetchGhsaAdvisories(env);

  // Dedupe by (advisory_id, package). One advisory can name multiple
  // packages; we keep each as a separate entry but skip exact dupes.
  const seen = new Set<string>();
  const deduped = entries.filter((e) => {
    const k = `${e.advisory_id}::${e.package.ecosystem}::${e.package.name}`;
    if (seen.has(k)) return false;
    seen.add(k);
    return true;
  });

  // Newest first.
  deduped.sort((a, b) => (a.published_at < b.published_at ? 1 : -1));

  // Aggregates.
  const bySeverity: Record<SeverityBand, number> = {
    critical: 0, high: 0, medium: 0, low: 0, unknown: 0,
  };
  const byEcosystem: Record<string, number> = {};
  const byType: Record<AdvisoryType, number> = { reviewed: 0, unreviewed: 0, malware: 0 };
  for (const e of deduped) {
    bySeverity[e.severity_band] += 1;
    byEcosystem[e.package.ecosystem] = (byEcosystem[e.package.ecosystem] ?? 0) + 1;
    byType[e.type] += 1;
  }

  const snapshot: GhsaAiFeedSnapshot = {
    generated_at: new Date().toISOString(),
    total: deduped.length,
    by_severity: bySeverity,
    by_ecosystem: byEcosystem,
    by_type: byType,
    entries: deduped,
    sources: [
      {
        name: 'GitHub Security Advisories',
        url: 'https://api.github.com/advisories',
        license: 'GitHub Terms of Service. Attribution required.',
      },
      {
        name: 'TensorFeed.ai (filter, derive, republish)',
        url: 'https://tensorfeed.ai/api/premium/security/ghsa/ai-feed',
        license:
          'TF filters and re-shapes advisories already public at their primary source. Cite the source row for primary authority.',
      },
    ],
    posture:
      'TensorFeed republishes already-public AI-relevant security advisories from GitHub Security Advisories. We do not detect vulnerabilities, attribute them, or actively scan. Always treat the listed primary source as authoritative. AI-relevance is a substring match against a curated keyword list, not a guarantee of impact.',
  };

  await env.TENSORFEED_CACHE.put(KV_KEY, JSON.stringify(snapshot), {
    expirationTtl: 60 * 60 * 24 * 7,
  });

  return snapshot;
}

/**
 * Read the latest snapshot from KV. Returns null if no refresh has
 * run yet. Endpoint handler should respond with no_snapshot_yet so
 * callers know to retry, not interpret absence as "no advisories".
 */
export async function getGhsaAiFeed(env: Env): Promise<GhsaAiFeedSnapshot | null> {
  const raw = await env.TENSORFEED_CACHE.get(KV_KEY, 'text');
  if (!raw) return null;
  try {
    return JSON.parse(raw) as GhsaAiFeedSnapshot;
  } catch {
    return null;
  }
}

// Re-export the keyword list so call sites can introspect what's
// considered AI-relevant (e.g. for documentation pages or for the
// /api/meta surface).
export { AI_RELEVANCE_KEYWORDS };
