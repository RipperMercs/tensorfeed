/**
 * Premium sec-filings derivations.
 *
 * Reads from the KV layout written by sec-filings-extraction.ts. Two
 * cohort endpoints + one single-filing lookup. Pure builders (env-free
 * arguments) so the unit tests can exercise them without KV mocks; the
 * KV-aware wrappers are thin shells around the builders.
 *
 * Engine-fit note: every enum reaches us already normalized by DataPal's
 * normalize.py. We do not re-classify anything here. If the upstream
 * pipeline ever drifts, the validator in sec-filings-extraction.ts
 * rejects the batch at ingest before this module sees it.
 */

import type { Env } from './types';
import {
  type FilingExtraction,
  type IndexEntry,
  getAiFlagged,
  getIndex,
  getExtraction,
  publicAttribution,
} from './sec-filings-extraction';

// ─── ai-flagged (cohort) ────────────────────────────────────────────

export interface AiFlaggedFilter {
  ticker: string | null;       // case-insensitive exact-match
  form: string | null;          // case-insensitive exact-match (e.g. "10-K", "8-K")
  since: string | null;         // YYYY-MM-DD, inclusive lower bound on filing_date
  min_score: number | null;     // 0-100, inclusive lower bound on ai_relevance_score
}

export interface AiFlaggedResponse {
  batch_id: string | null;
  extracted_at: string | null;
  filter: AiFlaggedFilter;
  cohort: {
    total_in_snapshot: number;
    total_after_filter: number;
  };
  filings: FilingExtraction[];
  source_license: string;
  source_attribution: string;
}

export function parseTickerFilter(raw: string | null): string | null {
  if (raw === null) return null;
  const t = raw.trim();
  return t.length === 0 || t.length > 10 ? null : t.toUpperCase();
}

export function parseFormFilter(raw: string | null): string | null {
  if (raw === null) return null;
  const t = raw.trim();
  return t.length === 0 || t.length > 30 ? null : t.toUpperCase();
}

export function parseSinceFilter(raw: string | null): string | null {
  if (raw === null) return null;
  const t = raw.trim();
  return /^\d{4}-\d{2}-\d{2}$/.test(t) ? t : null;
}

export function parseMinScoreFilter(raw: string | null): number | null {
  if (raw === null) return null;
  const n = parseInt(raw, 10);
  return Number.isFinite(n) && n >= 0 && n <= 100 ? n : null;
}

/**
 * Pure builder. Takes a pre-loaded ai-flagged snapshot and filter object,
 * returns the response. Sorts by filing_date desc then ai_relevance_score
 * desc as a tiebreaker.
 */
export function buildAiFlaggedResponse(
  snapshot: { batch_id: string; extracted_at: string; filings: FilingExtraction[] } | null,
  filter: AiFlaggedFilter,
): AiFlaggedResponse {
  if (!snapshot) {
    return {
      batch_id: null,
      extracted_at: null,
      filter,
      cohort: { total_in_snapshot: 0, total_after_filter: 0 },
      filings: [],
      ...publicAttribution(),
    };
  }

  // Defensive normalization: the parsers already uppercase, but the
  // builder is exported and the unit tests exercise it directly with
  // raw filter values, so uppercase here too rather than trust the
  // caller. Same pattern in buildByFormResponse.
  const tickerUpper = filter.ticker ? filter.ticker.toUpperCase() : null;
  const formUpper = filter.form ? filter.form.toUpperCase() : null;
  const filtered = snapshot.filings.filter((f) => {
    if (tickerUpper && f.ticker.toUpperCase() !== tickerUpper) return false;
    if (formUpper && f.form.toUpperCase() !== formUpper) return false;
    if (filter.since && f.filing_date < filter.since) return false;
    if (filter.min_score !== null && f.ai_relevance_score < filter.min_score) return false;
    return true;
  });

  filtered.sort((a, b) => {
    if (a.filing_date !== b.filing_date) return a.filing_date < b.filing_date ? 1 : -1;
    return b.ai_relevance_score - a.ai_relevance_score;
  });

  return {
    batch_id: snapshot.batch_id,
    extracted_at: snapshot.extracted_at,
    filter,
    cohort: {
      total_in_snapshot: snapshot.filings.length,
      total_after_filter: filtered.length,
    },
    filings: filtered,
    ...publicAttribution(),
  };
}

/**
 * KV-aware wrapper. Loads the ai-flagged snapshot, calls the builder.
 */
export async function getAiFlaggedResponse(
  env: Env,
  filter: AiFlaggedFilter,
): Promise<AiFlaggedResponse> {
  const snapshot = await getAiFlagged(env);
  return buildAiFlaggedResponse(snapshot, filter);
}

// ─── by-form (rollup) ───────────────────────────────────────────────

export interface ByFormFormStats {
  form: string;
  total_filings: number;
  ai_relevant_count: number;
  avg_ai_relevance_score: number;
  total_capex_mentions: number;
  total_revenue_mentions: number;
  total_partnership_mentions: number;
  total_chip_mentions: number;
  top_filings: FilingExtraction[];   // top 3 by ai_relevance_score
}

export interface ByFormResponse {
  batch_id: string | null;
  extracted_at: string | null;
  filter: { ticker: string | null; form: string | null };
  by_form: ByFormFormStats[];
  source_license: string;
  source_attribution: string;
}

/**
 * Pure builder. Takes the full AI-flagged snapshot + optional ticker /
 * form filters, returns per-form-type rollup with top filings per form.
 *
 * Returns one ByFormFormStats per distinct form value in the snapshot
 * after filtering. Forms sorted by total_filings desc then form asc.
 */
export function buildByFormResponse(
  snapshot: { batch_id: string; extracted_at: string; filings: FilingExtraction[] } | null,
  filter: { ticker: string | null; form: string | null },
): ByFormResponse {
  if (!snapshot) {
    return {
      batch_id: null,
      extracted_at: null,
      filter,
      by_form: [],
      ...publicAttribution(),
    };
  }

  const tickerUpper = filter.ticker ? filter.ticker.toUpperCase() : null;
  const formUpper = filter.form ? filter.form.toUpperCase() : null;
  const filtered = snapshot.filings.filter((f) => {
    if (tickerUpper && f.ticker.toUpperCase() !== tickerUpper) return false;
    if (formUpper && f.form.toUpperCase() !== formUpper) return false;
    return true;
  });

  // Group by form. Form values are case-sensitive in SEC ("10-K" vs
  // "10-k" never both appear in practice, but we case-fold to be safe).
  const byForm = new Map<string, FilingExtraction[]>();
  for (const f of filtered) {
    const key = f.form.toUpperCase();
    const arr = byForm.get(key) ?? [];
    arr.push(f);
    byForm.set(key, arr);
  }

  const stats: ByFormFormStats[] = [];
  for (const [form, filings] of byForm.entries()) {
    const aiRelevant = filings.filter((f) => f.ai_relevant);
    const totalScore = filings.reduce((s, f) => s + f.ai_relevance_score, 0);
    const avgScore = filings.length === 0 ? 0 : Math.round((totalScore / filings.length) * 100) / 100;
    const totalCapex = filings.reduce((s, f) => s + f.ai_capex_mentions.length, 0);
    const totalRevenue = filings.reduce((s, f) => s + f.ai_revenue_mentions.length, 0);
    const totalPartners = filings.reduce((s, f) => s + f.ai_partnership_mentions.length, 0);
    const totalChips = filings.reduce((s, f) => s + f.ai_chip_mentions.length, 0);
    const topFilings = [...aiRelevant]
      .sort((a, b) => b.ai_relevance_score - a.ai_relevance_score)
      .slice(0, 3);
    stats.push({
      form,
      total_filings: filings.length,
      ai_relevant_count: aiRelevant.length,
      avg_ai_relevance_score: avgScore,
      total_capex_mentions: totalCapex,
      total_revenue_mentions: totalRevenue,
      total_partnership_mentions: totalPartners,
      total_chip_mentions: totalChips,
      top_filings: topFilings,
    });
  }

  stats.sort((a, b) => (b.total_filings - a.total_filings) || a.form.localeCompare(b.form));

  return {
    batch_id: snapshot.batch_id,
    extracted_at: snapshot.extracted_at,
    filter,
    by_form: stats,
    ...publicAttribution(),
  };
}

export async function getByFormResponse(
  env: Env,
  filter: { ticker: string | null; form: string | null },
): Promise<ByFormResponse> {
  const snapshot = await getAiFlagged(env);
  return buildByFormResponse(snapshot, filter);
}

// ─── ai-disclosures (single-filing dossier) ─────────────────────────

export interface SingleFilingResponse {
  accession_number: string;
  found: boolean;
  filing: FilingExtraction | null;
  source_license: string;
  source_attribution: string;
}

export async function lookupFiling(env: Env, accession_number: string): Promise<SingleFilingResponse> {
  const normalized = accession_number.trim();
  const filing = await getExtraction(env, normalized);
  return {
    accession_number: normalized,
    found: filing !== null,
    filing,
    ...publicAttribution(),
  };
}

// ─── Free /api/sec/filings/extraction-index (lightweight discovery) ──

export interface IndexResponse {
  total: number;
  ai_relevant_count: number;
  entries: IndexEntry[];
  source_license: string;
  source_attribution: string;
}

export const INDEX_MAX_LIMIT = 100;

/**
 * Free index endpoint. Returns lightweight metadata for discovery
 * (accession, form, ticker, filing_date, ai_relevant flag). Agents use
 * this to decide which premium ai-disclosures lookups are worth the
 * credit. Capped at INDEX_MAX_LIMIT entries; full cohort lives behind
 * the premium ai-flagged endpoint.
 */
export function buildIndexResponse(
  index: IndexEntry[],
  rawLimit: number,
  rawOffset: number,
): IndexResponse {
  const limit = Math.max(1, Math.min(INDEX_MAX_LIMIT, Math.floor(rawLimit) || 25));
  const offset = Math.max(0, Math.floor(rawOffset) || 0);
  const aiRelevant = index.filter((e) => e.ai_relevant).length;
  return {
    total: index.length,
    ai_relevant_count: aiRelevant,
    entries: index.slice(offset, offset + limit),
    ...publicAttribution(),
  };
}

export async function getIndexResponse(
  env: Env,
  rawLimit: number,
  rawOffset: number,
): Promise<IndexResponse> {
  const index = await getIndex(env);
  return buildIndexResponse(index, rawLimit, rawOffset);
}
