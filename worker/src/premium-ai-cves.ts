/**
 * Premium ai-cves derivations.
 *
 * Three endpoints derive over the ai-cves KV layout written by
 * ai-cves-feed.ts. Two read the pre-built ai-flagged subset; one
 * resolves a single CVE via the cve-index.
 *
 * All public outputs OMIT quote_spans (pending DP CC's normalize.py
 * span-cleaning patch in job #78). Once that lands and TF can trust
 * the field, restore via toPublicPaperWithSpans.
 */

import type { Env } from './types';
import { safePut } from './kill-switch';
import {
  type AiCvesPaper,
  type AiCvesBatch,
  type AiCategory,
  type PublicPaper,
  getAiFlagged,
  getCveIndex,
  getBatch,
  toPublicPaper,
  publicAttribution,
} from './ai-cves-feed';

// ─── Severity ranking ───────────────────────────────────────────────

/**
 * Maps severity_label substring to a numeric rank for sortability.
 * 4 = critical, 3 = high, 2 = medium, 1 = low, 0 = unstated/unknown.
 * Substring match so "critical", "Critical", "CVSS 9.8 critical" all
 * land at 4. Order matters: check most-severe first.
 */
export function severityRank(label: string): number {
  const l = label.toLowerCase();
  if (l.includes('critical')) return 4;
  if (l.includes('high')) return 3;
  if (l.includes('medium') || l.includes('moderate')) return 2;
  if (l.includes('low')) return 1;
  return 0;
}

// ─── ai-stack-cves (the flagship) ───────────────────────────────────

export interface AiStackCvePaper extends PublicPaper {
  tf_ai_category: AiCategory;
  severity_rank: number;
}

export interface AiStackCvesResponse {
  batch_id: string | null;
  extracted_at: string | null;
  total: number;
  papers: AiStackCvePaper[];
  source_license: string;
  source_attribution: string;
}

/**
 * Read the pre-built ai-flagged subset, attach severity_rank, sort:
 * 1. exploited_in_wild=stated_yes first
 * 2. then by severity_rank desc
 * 3. then by source_url asc (deterministic tie-break)
 */
export async function getAiStackCves(env: Env): Promise<AiStackCvesResponse> {
  const flagged = await getAiFlagged(env);
  if (!flagged) {
    return {
      batch_id: null,
      extracted_at: null,
      total: 0,
      papers: [],
      ...publicAttribution(),
    };
  }

  const papers: AiStackCvePaper[] = flagged.papers.map((p) => ({
    ...toPublicPaper(p),
    tf_ai_category: p.tf_ai_category,
    severity_rank: severityRank(p.severity_label),
  }));

  papers.sort((a, b) => {
    const aExp = a.exploited_in_wild === 'stated_yes' ? 1 : 0;
    const bExp = b.exploited_in_wild === 'stated_yes' ? 1 : 0;
    if (aExp !== bExp) return bExp - aExp;
    if (a.severity_rank !== b.severity_rank) return b.severity_rank - a.severity_rank;
    return a.source_url.localeCompare(b.source_url);
  });

  return {
    batch_id: flagged.batch_id,
    extracted_at: flagged.extracted_at,
    total: papers.length,
    papers,
    ...publicAttribution(),
  };
}

// ─── ai-stack-cves free preview (the /api/preview/ai-cves/ai-stack-cves taste) ───

export interface AiStackCvesPreview {
  ok: true;
  preview: true;
  batch_id: string | null;
  extracted_at: string | null;
  total: number;
  exploited_in_wild_count: number;
  by_severity: Record<string, number>;
  by_category: Record<string, number>;
  top_cve: {
    cve_ids: string[];
    affected_products: string[];
    tf_ai_category: AiCategory;
    severity_label: string;
    exploited_in_wild: PublicPaper['exploited_in_wild'];
  } | null;
  source_license: string;
  source_attribution: string;
  unlock: {
    full_endpoint: string;
    free_alternatives: string[];
    note: string;
    withheld: string[];
  };
}

const SEVERITY_BUCKETS = ['unstated', 'low', 'medium', 'high', 'critical'];

/**
 * Shape the AI-stack CVE feed down to the free discovery taste.
 *
 * Reveals the scale and shape (total, exploited-in-wild count, severity and
 * AI-stack-category breakdowns) plus the single top CVE's headline, so an
 * agent can see whether the filtered feed is worth unlocking. The full
 * filtered papers list and the per-CVE remediation detail (affected version
 * ranges, fixed versions, advisory source URLs) stay paid. Pure function.
 */
export function previewAiStackCves(result: AiStackCvesResponse): AiStackCvesPreview {
  const by_severity: Record<string, number> = { critical: 0, high: 0, medium: 0, low: 0, unstated: 0 };
  const by_category: Record<string, number> = {};
  let exploited = 0;
  for (const p of result.papers) {
    const bucket = SEVERITY_BUCKETS[p.severity_rank] ?? 'unstated';
    by_severity[bucket] += 1;
    by_category[p.tf_ai_category] = (by_category[p.tf_ai_category] ?? 0) + 1;
    if (p.exploited_in_wild === 'stated_yes') exploited += 1;
  }
  const top = result.papers[0];
  return {
    ok: true,
    preview: true,
    batch_id: result.batch_id,
    extracted_at: result.extracted_at,
    total: result.total,
    exploited_in_wild_count: exploited,
    by_severity,
    by_category,
    top_cve: top
      ? {
          cve_ids: top.cve_ids,
          affected_products: top.affected_products,
          tf_ai_category: top.tf_ai_category,
          severity_label: top.severity_label,
          exploited_in_wild: top.exploited_in_wild,
        }
      : null,
    source_license: result.source_license,
    source_attribution: result.source_attribution,
    unlock: {
      full_endpoint: '/api/premium/ai-cves/ai-stack-cves',
      free_alternatives: ['/api/ai-cves/latest', '/api/ai-cves/feed', '/api/ai-cves/stats'],
      note: 'Free preview: counts only (total, exploited-in-wild, by severity, by AI-stack category) plus the single top CVE headline. The full AI-stack-filtered list (every CVE with affected version ranges, fixed versions, and advisory source links) is 1 credit ($0.02) at /api/premium/ai-cves/ai-stack-cves. Raw unfiltered batches are free at /api/ai-cves/latest and /api/ai-cves/feed.',
      withheld: [
        'the full AI-stack-filtered papers list',
        'per-CVE affected version ranges, fixed versions, and advisory source URLs',
      ],
    },
  };
}

/**
 * IP-based daily rate limit for the free /api/preview/ai-cves/ai-stack-cves
 * taste. Mirrors checkWhatsNewPreviewRateLimit with a distinct KV key. 1 read
 * plus (0 or 1) writes per call; the write is skipped under the kill switch.
 */
export async function checkAiStackCvesPreviewRateLimit(
  env: Env,
  ip: string,
  max = 10,
): Promise<{ allowed: boolean; remaining: number; limit: number }> {
  const date = new Date().toISOString().slice(0, 10);
  const key = `rate:ai-stack-cves-preview:${date}:${ip}`;
  const current = (await env.TENSORFEED_CACHE.get(key, 'json')) as { count: number } | null;
  const count = current?.count ?? 0;
  if (count >= max) return { allowed: false, remaining: 0, limit: max };
  await safePut(env, env.TENSORFEED_CACHE, key, JSON.stringify({ count: count + 1 }), { expirationTtl: 60 * 60 * 48 });
  return { allowed: true, remaining: max - count - 1, limit: max };
}

// ─── exploited-in-wild ──────────────────────────────────────────────

export interface ExploitedInWildPaper extends PublicPaper {
  severity_rank: number;
}

export interface ExploitedInWildResponse {
  batch_id: string | null;
  extracted_at: string | null;
  total: number;
  papers: ExploitedInWildPaper[];
  source_license: string;
  source_attribution: string;
}

/**
 * Filter the latest full batch to exploited_in_wild == stated_yes,
 * attach severity_rank, sort by severity desc then source_url asc.
 * No pagination: these are typically rare per batch (~1-2% of papers).
 */
export async function getExploitedInWild(
  env: Env,
  fullBatch: AiCvesPaper[] | null,
): Promise<ExploitedInWildResponse> {
  if (!fullBatch) {
    return {
      batch_id: null,
      extracted_at: null,
      total: 0,
      papers: [],
      ...publicAttribution(),
    };
  }
  // Caller resolves the batch (so this function is testable without KV).
  return buildExploitedInWild(null, null, fullBatch);
}

function buildExploitedInWild(
  batchId: string | null,
  extractedAt: string | null,
  papers: AiCvesPaper[],
): ExploitedInWildResponse {
  const filtered: ExploitedInWildPaper[] = papers
    .filter((p) => p.exploited_in_wild === 'stated_yes')
    .map((p) => ({ ...toPublicPaper(p), severity_rank: severityRank(p.severity_label) }));

  filtered.sort((a, b) => {
    if (a.severity_rank !== b.severity_rank) return b.severity_rank - a.severity_rank;
    return a.source_url.localeCompare(b.source_url);
  });

  return {
    batch_id: batchId,
    extracted_at: extractedAt,
    total: filtered.length,
    papers: filtered,
    ...publicAttribution(),
  };
}

/**
 * Reads from KV, applies the filter, returns the response. The pure
 * builder above is exposed for tests.
 */
export async function getExploitedInWildFromKv(env: Env): Promise<ExploitedInWildResponse> {
  const flagged = await getAiFlagged(env);
  // We deliberately scan the AI-flagged subset (always small) for the
  // exploited filter rather than the full batch. Anything actively
  // exploited in the AI stack is the highest-value subset; non-AI
  // exploitation moves through TF's separate /api/security/* surfaces.
  if (!flagged) {
    return {
      batch_id: null,
      extracted_at: null,
      total: 0,
      papers: [],
      ...publicAttribution(),
    };
  }
  return buildExploitedInWild(flagged.batch_id, flagged.extracted_at, flagged.papers);
}

// ─── CVE lookup (single-CVE strict-premium) ─────────────────────────

export interface CveLookupResponse {
  cve_id: string;
  found: boolean;
  paper: PublicPaper | null;
  batch_id: string | null;
  /**
   * The DP CC extraction time of the batch this CVE resolved from (ISO 8601),
   * or null when not found. This is the real underlying-data capture time the
   * 10-day staleness SLA bills against, NOT a response timestamp.
   */
  extracted_at: string | null;
  source_license: string;
  source_attribution: string;
}

/**
 * Resolve a CVE id through the persistent index. Returns the paper
 * with quote_spans omitted, or found=false if the index has no entry.
 * Normalizes CVE id to uppercase for lookup.
 */
export async function lookupCve(env: Env, cveId: string): Promise<CveLookupResponse> {
  const normalized = cveId.trim().toUpperCase();
  const empty: CveLookupResponse = {
    cve_id: normalized,
    found: false,
    paper: null,
    batch_id: null,
    extracted_at: null,
    ...publicAttribution(),
  };

  const idx = await getCveIndex(env);
  if (!idx || !idx[normalized]) return empty;

  const entry = idx[normalized];
  const batch = await getBatch(env, entry.batch_id);
  if (!batch || entry.paper_index >= batch.papers.length) return empty;

  return {
    cve_id: normalized,
    found: true,
    paper: toPublicPaper(batch.papers[entry.paper_index]),
    batch_id: entry.batch_id,
    // The resolved batch's extraction time = the real data-capture time the
    // 10-day staleness SLA bills against (surfaced for the receipt + 7th-arg).
    extracted_at: batch.extracted_at,
    ...publicAttribution(),
  };
}

// ─── CVE batch lookup (strict-premium, comma-separated ids) ─────────

export interface CveBatchResponse {
  total_requested: number;
  total_found: number;
  results: CveLookupResponse[];
  source_license: string;
  source_attribution: string;
}

export const CVE_BATCH_MAX_IDS = 10;

export type ParseBatchIdsResult =
  | { ok: true; ids: string[] }
  | { ok: false; error: string; hint: string };

/**
 * Parses the `ids` query param. Returns up to CVE_BATCH_MAX_IDS canonical
 * CVE ids, or a structured error. Each id must match CVE-YYYY-NNNNN
 * (case-insensitive on input; the response normalizes to uppercase).
 */
export function parseBatchIdsParam(raw: string | null): ParseBatchIdsResult {
  if (!raw || !raw.trim()) {
    return {
      ok: false,
      error: 'missing_ids',
      hint: `Pass ids=CVE-YYYY-NNNNN,CVE-YYYY-NNNNN (comma-separated). Up to ${CVE_BATCH_MAX_IDS} CVE ids per call.`,
    };
  }
  const ids = raw.split(',').map((s) => s.trim()).filter(Boolean);
  if (ids.length === 0) {
    return {
      ok: false,
      error: 'missing_ids',
      hint: `Pass ids=CVE-YYYY-NNNNN,CVE-YYYY-NNNNN (comma-separated). Up to ${CVE_BATCH_MAX_IDS} CVE ids per call.`,
    };
  }
  if (ids.length > CVE_BATCH_MAX_IDS) {
    return {
      ok: false,
      error: 'too_many_ids',
      hint: `Max ${CVE_BATCH_MAX_IDS} CVE ids per call. Got ${ids.length}.`,
    };
  }
  for (const id of ids) {
    if (!/^CVE-\d{4}-\d{4,7}$/i.test(id)) {
      return {
        ok: false,
        error: 'invalid_cve_id',
        hint: `Each id must match CVE-YYYY-NNNNN. Got ${JSON.stringify(id)}.`,
      };
    }
  }
  return { ok: true, ids };
}

/**
 * Pure builder for testability. Takes already-loaded index + batch
 * map; assembles per-id results. Normalizes ids to uppercase.
 */
export function buildBatchResponse(
  ids: string[],
  index: Record<string, { batch_id: string; paper_index: number }> | null,
  batchesById: Record<string, AiCvesBatch | null>,
): CveBatchResponse {
  const normalized = ids.map((id) => id.trim().toUpperCase());
  const results: CveLookupResponse[] = normalized.map((id) => {
    const empty: CveLookupResponse = {
      cve_id: id,
      found: false,
      paper: null,
      batch_id: null,
      extracted_at: null,
      ...publicAttribution(),
    };
    if (!index || !index[id]) return empty;
    const entry = index[id];
    const batch = batchesById[entry.batch_id];
    if (!batch || entry.paper_index >= batch.papers.length) return empty;
    return {
      cve_id: id,
      found: true,
      paper: toPublicPaper(batch.papers[entry.paper_index]),
      batch_id: entry.batch_id,
      extracted_at: batch.extracted_at,
      ...publicAttribution(),
    };
  });
  return {
    total_requested: ids.length,
    total_found: results.filter((r) => r.found).length,
    results,
    ...publicAttribution(),
  };
}

/**
 * KV-aware batch lookup. Reads the index once, then dedupes batch
 * reads by batch_id so worst case is 1 index read + N unique-batch
 * reads (typically 1 since most IDs land in the latest batch).
 */
export async function lookupCvesBatch(env: Env, ids: string[]): Promise<CveBatchResponse> {
  const normalized = ids.map((id) => id.trim().toUpperCase());
  const idx = await getCveIndex(env);
  const uniqueBatchIds = new Set<string>();
  if (idx) {
    for (const id of normalized) {
      const entry = idx[id];
      if (entry) uniqueBatchIds.add(entry.batch_id);
    }
  }
  const batchesById: Record<string, AiCvesBatch | null> = {};
  await Promise.all(
    Array.from(uniqueBatchIds).map(async (bid) => {
      batchesById[bid] = await getBatch(env, bid);
    }),
  );
  return buildBatchResponse(ids, idx, batchesById);
}

// ─── Free /api/ai-cves/* helpers ────────────────────────────────────

export interface LatestResponse {
  batch_id: string | null;
  extracted_at: string | null;
  window_start: string | null;
  window_end: string | null;
  total_papers: number;
  ai_flagged_count: number;
  papers: PublicPaper[];
  source_license: string;
  source_attribution: string;
}

/**
 * Free `/api/ai-cves/latest`. Returns metadata + first 25 papers (no
 * pagination at this endpoint; use /feed for paginated bulk).
 */
export function buildLatestResponse(
  batch: { batch_id: string; extracted_at: string; window_start: string; window_end: string; papers: AiCvesPaper[] } | null,
  aiFlaggedCount: number,
): LatestResponse {
  if (!batch) {
    return {
      batch_id: null,
      extracted_at: null,
      window_start: null,
      window_end: null,
      total_papers: 0,
      ai_flagged_count: 0,
      papers: [],
      ...publicAttribution(),
    };
  }
  return {
    batch_id: batch.batch_id,
    extracted_at: batch.extracted_at,
    window_start: batch.window_start,
    window_end: batch.window_end,
    total_papers: batch.papers.length,
    ai_flagged_count: aiFlaggedCount,
    papers: batch.papers.slice(0, 25).map(toPublicPaper),
    ...publicAttribution(),
  };
}

export interface FeedResponse {
  batch_id: string | null;
  total: number;
  limit: number;
  offset: number;
  papers: PublicPaper[];
  source_license: string;
  source_attribution: string;
}

export const FEED_MAX_LIMIT = 50;

/**
 * Free `/api/ai-cves/feed?limit=N&offset=N`. limit capped at 50.
 */
export function buildFeedResponse(
  batch: { batch_id: string; papers: AiCvesPaper[] } | null,
  rawLimit: number,
  rawOffset: number,
): FeedResponse {
  const limit = Math.max(1, Math.min(FEED_MAX_LIMIT, Math.floor(rawLimit) || 25));
  const offset = Math.max(0, Math.floor(rawOffset) || 0);
  if (!batch) {
    return {
      batch_id: null,
      total: 0,
      limit,
      offset,
      papers: [],
      ...publicAttribution(),
    };
  }
  return {
    batch_id: batch.batch_id,
    total: batch.papers.length,
    limit,
    offset,
    papers: batch.papers.slice(offset, offset + limit).map(toPublicPaper),
    ...publicAttribution(),
  };
}

export interface StatsResponse {
  batch_id: string | null;
  by_severity: Record<string, number>;
  by_exploitation: Record<'stated_yes' | 'stated_no' | 'unstated', number>;
  top_vendors: Array<{ vendor: string; count: number }>;
  total_papers: number;
  source_license: string;
  source_attribution: string;
}

const TOP_VENDORS_LIMIT = 10;

/**
 * Free `/api/ai-cves/stats`. Aggregate counts.
 */
export function buildStatsResponse(
  batch: { batch_id: string; papers: AiCvesPaper[] } | null,
): StatsResponse {
  const base: StatsResponse = {
    batch_id: batch?.batch_id ?? null,
    by_severity: { critical: 0, high: 0, medium: 0, low: 0, unstated: 0 },
    by_exploitation: { stated_yes: 0, stated_no: 0, unstated: 0 },
    top_vendors: [],
    total_papers: batch?.papers.length ?? 0,
    ...publicAttribution(),
  };
  if (!batch) return base;

  // Vendor counts are bucketed case-insensitively (key = lowercased
  // vendor) so "openclaw" and "OpenClaw" land in the same bin; we
  // remember the FIRST original-cased spelling we saw for display so
  // the response carries the natural spelling, not the lowercase form.
  const vendorCounts: Record<string, { display: string; count: number }> = {};
  for (const p of batch.papers) {
    const rank = severityRank(p.severity_label);
    const bucket = ['unstated', 'low', 'medium', 'high', 'critical'][rank];
    base.by_severity[bucket] += 1;
    base.by_exploitation[p.exploited_in_wild] += 1;
    // Vendor extraction: first token of each affected_product, capped
    // at 32 chars so we don't have huge keys from full product names.
    for (const product of p.affected_products) {
      const display = product.split(/\s+/)[0]?.slice(0, 32) || '';
      if (!display) continue;
      const key = display.toLowerCase();
      const existing = vendorCounts[key];
      if (existing) existing.count += 1;
      else vendorCounts[key] = { display, count: 1 };
    }
  }

  base.top_vendors = Object.values(vendorCounts)
    .map(({ display, count }) => ({ vendor: display, count }))
    .sort((a, b) => b.count - a.count || a.vendor.localeCompare(b.vendor))
    .slice(0, TOP_VENDORS_LIMIT);

  return base;
}
