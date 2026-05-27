/**
 * sec-filings-extraction: ingest, KV layout, raw reads (Phase 3f.3).
 *
 * Sister module to sec-filings-fetcher.ts (free recent-filings endpoints).
 * This file owns the validation + KV schema for the Qwen-extracted
 * AI-relevant filings produced by DataPal CC on the 5090 rig.
 *
 * Pipeline:
 *   1. sec-filings-fetcher.ts pulls EDGAR submissions for 14 AI bellwether
 *      CIKs every 6h, publishes /api/sec/filings/recent.
 *   2. DataPal CC polls /api/sec/filings/recent, fetches primary docs,
 *      runs Qwen 3.6 27B extraction per For_DP_CC_sec-filings-HANDOFF.md
 *      schema (Part 2), writes per-accession JSON to
 *      tensorfeed-work/sec-filings-extraction/For_TFCC/extractions/.
 *   3. TF CC audits the batch in-session, then POSTs to
 *      /api/admin/sec-filings-extraction/ingest with the batch envelope.
 *   4. Premium endpoints (/api/premium/sec/filings/ai-flagged, by-form,
 *      ai-disclosures) read from this KV layout.
 *
 * Schema is engine-fit per [[feedback_engine_fit_extract_verbatim]]:
 * Qwen extracts named fields verbatim; DataPal's normalize.py assigns the
 * trusted enums (relationship_type, vendor, category, change_type) and
 * the ai_relevant / ai_relevance_score signals via deterministic regex +
 * lookup tables. TF CC receives the schema-clean JSON below.
 *
 * Source licensing: SEC EDGAR is US Government public domain (17 USC 105).
 * No attribution required by law; we ship one anyway to make the data
 * provenance unambiguous on agent reads.
 */

import type { Env } from './types';

// ─── KV schema ──────────────────────────────────────────────────────

export const KEY_LATEST = 'sec-filings-extraction:latest';
export const KEY_INDEX = 'sec-filings-extraction:index';
export const KEY_AI_FLAGGED = 'sec-filings-extraction:ai-flagged';
export const KEY_BY_ACCESSION_PREFIX = 'sec-filings-extraction:by-accession:';

/** 730 days. Anything older than 2 years is filtered out at extraction time
 * per the HANDOFF.md "ai_capex narrative goes stale" rule, but the KV TTL
 * provides a backstop in case the upstream filter ever slips. */
export const FILING_TTL_S = 730 * 24 * 60 * 60;

// ─── Attribution ─────────────────────────────────────────────────────

export const SOURCE_LICENSE = 'US Government public domain (17 USC 105)';
export const SOURCE_ATTRIBUTION =
  'SEC EDGAR (data.sec.gov) + Qwen 3.6 27B verbatim extraction + deterministic normalize';

// ─── Enum types (deterministic, assigned post-Qwen by normalize.py) ──

export type RelationshipType =
  | 'customer'
  | 'supplier'
  | 'investment'
  | 'joint_venture'
  | 'licensing'
  | 'unspecified';

export type ChipVendor =
  | 'nvidia'
  | 'amd'
  | 'intel'
  | 'google_tpu'
  | 'aws_trainium'
  | 'microsoft_maia'
  | 'custom'
  | 'other';

export type ProductCategory =
  | 'model'
  | 'platform'
  | 'service'
  | 'agent'
  | 'tool'
  | 'other';

export type WorkforceChangeType =
  | 'hiring'
  | 'layoff'
  | 'team_formation'
  | 'leadership_change'
  | 'org_split';

const VALID_RELATIONSHIP = new Set<string>([
  'customer', 'supplier', 'investment', 'joint_venture', 'licensing', 'unspecified',
]);
const VALID_CHIP_VENDOR = new Set<string>([
  'nvidia', 'amd', 'intel', 'google_tpu', 'aws_trainium', 'microsoft_maia', 'custom', 'other',
]);
const VALID_PRODUCT_CATEGORY = new Set<string>([
  'model', 'platform', 'service', 'agent', 'tool', 'other',
]);
const VALID_WORKFORCE_CHANGE = new Set<string>([
  'hiring', 'layoff', 'team_formation', 'leadership_change', 'org_split',
]);

// ─── Nested mention shapes ──────────────────────────────────────────

export interface CapexMention {
  amount_usd: number | null;
  range_low_usd: number | null;
  range_high_usd: number | null;
  context: string;
  forward_looking: boolean;
}

export interface RevenueMention {
  amount_usd: number | null;
  period: string | null;
  context: string;
  forward_looking: boolean;
}

export interface PartnershipMention {
  partner_name: string;
  relationship_type: RelationshipType;
  context: string;
}

export interface ChipMention {
  vendor: ChipVendor;
  chip_or_product: string | null;
  context: string;
}

export interface NewAiProduct {
  product_name: string;
  category: ProductCategory;
  announcement_summary: string;
}

export interface WorkforceChange {
  change_type: WorkforceChangeType;
  headcount_affected: number | null;
  summary: string;
}

export interface KeyQuote {
  quote: string;
  section: string | null;
}

// ─── Top-level filing shape ──────────────────────────────────────────

export interface FilingExtraction {
  // Provenance (echoed verbatim from /api/sec/filings/recent)
  accession_number: string;
  cik: string;
  ticker: string;
  company_name: string;
  form: string;
  filing_date: string;
  // AI relevance (deterministic post-Qwen via normalize.py)
  ai_relevant: boolean;
  ai_relevance_score: number;
  ai_keyword_hits: string[];
  // Mentions (Qwen-extracted verbatim, normalize.py assigns enums)
  ai_capex_mentions: CapexMention[];
  ai_revenue_mentions: RevenueMention[];
  ai_partnership_mentions: PartnershipMention[];
  ai_chip_mentions: ChipMention[];
  new_ai_products_announced: NewAiProduct[];
  ai_workforce_changes: WorkforceChange[];
  // Verbatim
  key_quotes: KeyQuote[];
  // Self-report
  extracted_by: string;
  extracted_at: string;
}

export interface ExtractionBatch {
  batch_id: string;
  extracted_at: string;
  filings: FilingExtraction[];
}

// ─── Index entry (lightweight, used for discovery without loading the
//     full per-filing record from KV) ───────────────────────────────

export interface IndexEntry {
  accession_number: string;
  cik: string;
  ticker: string;
  form: string;
  filing_date: string;
  ai_relevant: boolean;
  ai_relevance_score: number;
  extracted_at: string;
}

// ─── Validation ─────────────────────────────────────────────────────

export const MAX_FILINGS_PER_BATCH = 200;
export const MAX_CONTEXT_LEN = 1000;

const ACCESSION_RE = /^\d{10}-\d{2}-\d{6}$/;
const CIK_RE = /^\d{10}$/;
const ISO_DATE_RE = /^\d{4}-\d{2}-\d{2}$/;
// Accepts both 'Z' and '+00:00' UTC forms. Python's datetime.utcnow()
// produces 'Z' (post-pyfix) and datetime.now(timezone.utc).isoformat()
// produces '+00:00'; DataPal's rollup uses the latter via Python stdlib
// defaults, so we accept either canonical UTC form. Non-zero offsets
// (e.g. '-08:00') are rejected so a local-timezone slip can't sneak in.
const ISO_TS_RE = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(\.\d+)?(Z|\+00:00)$/;
// TF anti-AI-detection rule: extracted text MUST NOT contain em dashes
// even if SEC filings do (DataPal's normalize.py is responsible for
// stripping these before handoff, but we double-check here as defense
// in depth so a regression doesn't ship em dashes to agent consumers).
const EM_DASH = '—';

export interface ValidationOk<T> {
  ok: true;
  value: T;
}
export interface ValidationErr {
  ok: false;
  error: string;
  detail: string;
  index?: number;
}
export type ValidationResult<T> = ValidationOk<T> | ValidationErr;

function failV(error: string, detail: string, index?: number): ValidationErr {
  return index === undefined ? { ok: false, error, detail } : { ok: false, error, detail, index };
}

function isPlainObject(v: unknown): v is Record<string, unknown> {
  return typeof v === 'object' && v !== null && !Array.isArray(v);
}

function isString(v: unknown): v is string {
  return typeof v === 'string';
}

function isBoolean(v: unknown): v is boolean {
  return typeof v === 'boolean';
}

function isNumber(v: unknown): v is number {
  return typeof v === 'number' && Number.isFinite(v);
}

function isNullableNumber(v: unknown): v is number | null {
  return v === null || isNumber(v);
}

function isNullableString(v: unknown): v is string | null {
  return v === null || isString(v);
}

function hasEmDash(s: string): boolean {
  return s.includes(EM_DASH);
}

function validateContextString(s: unknown, field: string): ValidationResult<string> {
  if (!isString(s)) return failV('bad_field', `${field} must be a string`);
  if (s.length > MAX_CONTEXT_LEN) return failV('field_too_long', `${field} exceeds ${MAX_CONTEXT_LEN} chars`);
  if (hasEmDash(s)) return failV('em_dash_in_context', `${field} contains an em dash; DataPal normalize.py must strip these before handoff`);
  return { ok: true, value: s };
}

function validateStringArray(v: unknown, field: string, maxLen = 500): ValidationResult<string[]> {
  if (!Array.isArray(v)) return failV('bad_field', `${field} must be an array`);
  for (let i = 0; i < v.length; i++) {
    const s = v[i];
    if (!isString(s)) return failV('bad_field', `${field}[${i}] must be a string`);
    if (s.length > maxLen) return failV('field_too_long', `${field}[${i}] exceeds ${maxLen} chars`);
    if (hasEmDash(s)) return failV('em_dash_in_field', `${field}[${i}] contains an em dash`);
  }
  return { ok: true, value: v as string[] };
}

// ─── Per-mention validators ─────────────────────────────────────────

function validateCapex(v: unknown, idx: number): ValidationResult<CapexMention> {
  if (!isPlainObject(v)) return failV('bad_mention', `ai_capex_mentions[${idx}] must be an object`);
  if (!isNullableNumber(v.amount_usd)) return failV('bad_mention', `ai_capex_mentions[${idx}].amount_usd must be number or null`);
  if (!isNullableNumber(v.range_low_usd)) return failV('bad_mention', `ai_capex_mentions[${idx}].range_low_usd must be number or null`);
  if (!isNullableNumber(v.range_high_usd)) return failV('bad_mention', `ai_capex_mentions[${idx}].range_high_usd must be number or null`);
  if (!isBoolean(v.forward_looking)) return failV('bad_mention', `ai_capex_mentions[${idx}].forward_looking must be boolean`);
  const ctxR = validateContextString(v.context, `ai_capex_mentions[${idx}].context`);
  if (!ctxR.ok) return ctxR;
  return { ok: true, value: { amount_usd: v.amount_usd, range_low_usd: v.range_low_usd, range_high_usd: v.range_high_usd, context: ctxR.value, forward_looking: v.forward_looking } };
}

function validateRevenue(v: unknown, idx: number): ValidationResult<RevenueMention> {
  if (!isPlainObject(v)) return failV('bad_mention', `ai_revenue_mentions[${idx}] must be an object`);
  if (!isNullableNumber(v.amount_usd)) return failV('bad_mention', `ai_revenue_mentions[${idx}].amount_usd must be number or null`);
  if (!isNullableString(v.period)) return failV('bad_mention', `ai_revenue_mentions[${idx}].period must be string or null`);
  if (!isBoolean(v.forward_looking)) return failV('bad_mention', `ai_revenue_mentions[${idx}].forward_looking must be boolean`);
  const ctxR = validateContextString(v.context, `ai_revenue_mentions[${idx}].context`);
  if (!ctxR.ok) return ctxR;
  return { ok: true, value: { amount_usd: v.amount_usd, period: v.period, context: ctxR.value, forward_looking: v.forward_looking } };
}

function validatePartnership(v: unknown, idx: number): ValidationResult<PartnershipMention> {
  if (!isPlainObject(v)) return failV('bad_mention', `ai_partnership_mentions[${idx}] must be an object`);
  if (!isString(v.partner_name)) return failV('bad_mention', `ai_partnership_mentions[${idx}].partner_name must be a string`);
  if (v.partner_name.length === 0 || v.partner_name.length > 200) return failV('bad_mention', `ai_partnership_mentions[${idx}].partner_name length must be 1-200`);
  if (hasEmDash(v.partner_name)) return failV('em_dash_in_field', `ai_partnership_mentions[${idx}].partner_name contains an em dash`);
  if (!isString(v.relationship_type) || !VALID_RELATIONSHIP.has(v.relationship_type)) {
    return failV('bad_enum', `ai_partnership_mentions[${idx}].relationship_type must be one of: ${[...VALID_RELATIONSHIP].join(', ')}`);
  }
  const ctxR = validateContextString(v.context, `ai_partnership_mentions[${idx}].context`);
  if (!ctxR.ok) return ctxR;
  return { ok: true, value: { partner_name: v.partner_name, relationship_type: v.relationship_type as RelationshipType, context: ctxR.value } };
}

function validateChip(v: unknown, idx: number): ValidationResult<ChipMention> {
  if (!isPlainObject(v)) return failV('bad_mention', `ai_chip_mentions[${idx}] must be an object`);
  if (!isString(v.vendor) || !VALID_CHIP_VENDOR.has(v.vendor)) {
    return failV('bad_enum', `ai_chip_mentions[${idx}].vendor must be one of: ${[...VALID_CHIP_VENDOR].join(', ')}`);
  }
  if (!isNullableString(v.chip_or_product)) return failV('bad_mention', `ai_chip_mentions[${idx}].chip_or_product must be string or null`);
  const ctxR = validateContextString(v.context, `ai_chip_mentions[${idx}].context`);
  if (!ctxR.ok) return ctxR;
  return { ok: true, value: { vendor: v.vendor as ChipVendor, chip_or_product: v.chip_or_product, context: ctxR.value } };
}

function validateProduct(v: unknown, idx: number): ValidationResult<NewAiProduct> {
  if (!isPlainObject(v)) return failV('bad_mention', `new_ai_products_announced[${idx}] must be an object`);
  if (!isString(v.product_name) || v.product_name.length === 0 || v.product_name.length > 200) {
    return failV('bad_mention', `new_ai_products_announced[${idx}].product_name length must be 1-200`);
  }
  if (hasEmDash(v.product_name)) return failV('em_dash_in_field', `new_ai_products_announced[${idx}].product_name contains an em dash`);
  if (!isString(v.category) || !VALID_PRODUCT_CATEGORY.has(v.category)) {
    return failV('bad_enum', `new_ai_products_announced[${idx}].category must be one of: ${[...VALID_PRODUCT_CATEGORY].join(', ')}`);
  }
  const sumR = validateContextString(v.announcement_summary, `new_ai_products_announced[${idx}].announcement_summary`);
  if (!sumR.ok) return sumR;
  return { ok: true, value: { product_name: v.product_name, category: v.category as ProductCategory, announcement_summary: sumR.value } };
}

function validateWorkforce(v: unknown, idx: number): ValidationResult<WorkforceChange> {
  if (!isPlainObject(v)) return failV('bad_mention', `ai_workforce_changes[${idx}] must be an object`);
  if (!isString(v.change_type) || !VALID_WORKFORCE_CHANGE.has(v.change_type)) {
    return failV('bad_enum', `ai_workforce_changes[${idx}].change_type must be one of: ${[...VALID_WORKFORCE_CHANGE].join(', ')}`);
  }
  if (!isNullableNumber(v.headcount_affected)) return failV('bad_mention', `ai_workforce_changes[${idx}].headcount_affected must be number or null`);
  const sumR = validateContextString(v.summary, `ai_workforce_changes[${idx}].summary`);
  if (!sumR.ok) return sumR;
  return { ok: true, value: { change_type: v.change_type as WorkforceChangeType, headcount_affected: v.headcount_affected, summary: sumR.value } };
}

function validateQuote(v: unknown, idx: number): ValidationResult<KeyQuote> {
  if (!isPlainObject(v)) return failV('bad_mention', `key_quotes[${idx}] must be an object`);
  const qR = validateContextString(v.quote, `key_quotes[${idx}].quote`);
  if (!qR.ok) return qR;
  if (!isNullableString(v.section)) return failV('bad_mention', `key_quotes[${idx}].section must be string or null`);
  return { ok: true, value: { quote: qR.value, section: v.section } };
}

// ─── Per-filing validator ───────────────────────────────────────────

export function validateExtraction(raw: unknown): ValidationResult<FilingExtraction> {
  if (!isPlainObject(raw)) return failV('not_an_object', 'filing must be an object');

  if (!isString(raw.accession_number) || !ACCESSION_RE.test(raw.accession_number)) {
    return failV('bad_accession', 'accession_number must match NNNNNNNNNN-NN-NNNNNN');
  }
  if (!isString(raw.cik) || !CIK_RE.test(raw.cik)) {
    return failV('bad_cik', 'cik must be 10-digit zero-padded string');
  }
  if (!isString(raw.ticker) || raw.ticker.length === 0 || raw.ticker.length > 10) {
    return failV('bad_ticker', 'ticker must be 1-10 chars');
  }
  if (!isString(raw.company_name) || raw.company_name.length === 0 || raw.company_name.length > 200) {
    return failV('bad_company', 'company_name must be 1-200 chars');
  }
  if (!isString(raw.form) || raw.form.length === 0 || raw.form.length > 30) {
    return failV('bad_form', 'form must be 1-30 chars');
  }
  if (!isString(raw.filing_date) || !ISO_DATE_RE.test(raw.filing_date)) {
    return failV('bad_filing_date', 'filing_date must be YYYY-MM-DD');
  }
  if (!isBoolean(raw.ai_relevant)) return failV('bad_field', 'ai_relevant must be boolean');
  if (!isNumber(raw.ai_relevance_score) || raw.ai_relevance_score < 0 || raw.ai_relevance_score > 100) {
    return failV('bad_score', 'ai_relevance_score must be number 0-100');
  }
  const hitsR = validateStringArray(raw.ai_keyword_hits, 'ai_keyword_hits', 100);
  if (!hitsR.ok) return hitsR;

  if (!isString(raw.extracted_by) || raw.extracted_by.length === 0 || raw.extracted_by.length > 100) {
    return failV('bad_extracted_by', 'extracted_by must be 1-100 chars');
  }
  if (!isString(raw.extracted_at) || !ISO_TS_RE.test(raw.extracted_at)) {
    return failV('bad_extracted_at', 'extracted_at must be ISO 8601 UTC');
  }

  // Mention arrays. All must be arrays even when empty (per HANDOFF.md
  // validation rules section). When ai_relevant=false, every array must
  // be empty (DataPal short-circuits the Qwen invocation).
  if (!Array.isArray(raw.ai_capex_mentions)) return failV('bad_field', 'ai_capex_mentions must be an array');
  const capex: CapexMention[] = [];
  for (let i = 0; i < raw.ai_capex_mentions.length; i++) {
    const r = validateCapex(raw.ai_capex_mentions[i], i);
    if (!r.ok) return r;
    capex.push(r.value);
  }

  if (!Array.isArray(raw.ai_revenue_mentions)) return failV('bad_field', 'ai_revenue_mentions must be an array');
  const revenue: RevenueMention[] = [];
  for (let i = 0; i < raw.ai_revenue_mentions.length; i++) {
    const r = validateRevenue(raw.ai_revenue_mentions[i], i);
    if (!r.ok) return r;
    revenue.push(r.value);
  }

  if (!Array.isArray(raw.ai_partnership_mentions)) return failV('bad_field', 'ai_partnership_mentions must be an array');
  const partners: PartnershipMention[] = [];
  for (let i = 0; i < raw.ai_partnership_mentions.length; i++) {
    const r = validatePartnership(raw.ai_partnership_mentions[i], i);
    if (!r.ok) return r;
    partners.push(r.value);
  }

  if (!Array.isArray(raw.ai_chip_mentions)) return failV('bad_field', 'ai_chip_mentions must be an array');
  const chips: ChipMention[] = [];
  for (let i = 0; i < raw.ai_chip_mentions.length; i++) {
    const r = validateChip(raw.ai_chip_mentions[i], i);
    if (!r.ok) return r;
    chips.push(r.value);
  }

  if (!Array.isArray(raw.new_ai_products_announced)) return failV('bad_field', 'new_ai_products_announced must be an array');
  const products: NewAiProduct[] = [];
  for (let i = 0; i < raw.new_ai_products_announced.length; i++) {
    const r = validateProduct(raw.new_ai_products_announced[i], i);
    if (!r.ok) return r;
    products.push(r.value);
  }

  if (!Array.isArray(raw.ai_workforce_changes)) return failV('bad_field', 'ai_workforce_changes must be an array');
  const workforce: WorkforceChange[] = [];
  for (let i = 0; i < raw.ai_workforce_changes.length; i++) {
    const r = validateWorkforce(raw.ai_workforce_changes[i], i);
    if (!r.ok) return r;
    workforce.push(r.value);
  }

  if (!Array.isArray(raw.key_quotes)) return failV('bad_field', 'key_quotes must be an array');
  const quotes: KeyQuote[] = [];
  for (let i = 0; i < raw.key_quotes.length; i++) {
    const r = validateQuote(raw.key_quotes[i], i);
    if (!r.ok) return r;
    quotes.push(r.value);
  }

  return {
    ok: true,
    value: {
      accession_number: raw.accession_number,
      cik: raw.cik,
      ticker: raw.ticker,
      company_name: raw.company_name,
      form: raw.form,
      filing_date: raw.filing_date,
      ai_relevant: raw.ai_relevant,
      ai_relevance_score: raw.ai_relevance_score,
      ai_keyword_hits: hitsR.value,
      ai_capex_mentions: capex,
      ai_revenue_mentions: revenue,
      ai_partnership_mentions: partners,
      ai_chip_mentions: chips,
      new_ai_products_announced: products,
      ai_workforce_changes: workforce,
      key_quotes: quotes,
      extracted_by: raw.extracted_by,
      extracted_at: raw.extracted_at,
    },
  };
}

// ─── Batch validator ────────────────────────────────────────────────

export function validateBatch(raw: unknown): ValidationResult<ExtractionBatch> {
  if (!isPlainObject(raw)) return failV('not_an_object', 'batch must be an object');
  if (!isString(raw.batch_id) || raw.batch_id.length === 0 || raw.batch_id.length > 100) {
    return failV('bad_batch_id', 'batch_id must be 1-100 chars');
  }
  if (!isString(raw.extracted_at) || !ISO_TS_RE.test(raw.extracted_at)) {
    return failV('bad_extracted_at', 'batch.extracted_at must be ISO 8601 UTC');
  }
  if (!Array.isArray(raw.filings)) return failV('bad_filings', 'filings must be an array');
  if (raw.filings.length === 0) return failV('empty_filings', 'filings must be non-empty');
  if (raw.filings.length > MAX_FILINGS_PER_BATCH) {
    return failV('too_many_filings', `filings exceeds max of ${MAX_FILINGS_PER_BATCH}`);
  }

  const seen = new Set<string>();
  const out: FilingExtraction[] = [];
  for (let i = 0; i < raw.filings.length; i++) {
    const r = validateExtraction(raw.filings[i]);
    if (!r.ok) return { ...r, index: i };
    if (seen.has(r.value.accession_number)) {
      return failV('duplicate_accession', `duplicate accession_number ${r.value.accession_number} in batch`, i);
    }
    seen.add(r.value.accession_number);
    out.push(r.value);
  }

  return {
    ok: true,
    value: { batch_id: raw.batch_id, extracted_at: raw.extracted_at, filings: out },
  };
}

// ─── KV writes ──────────────────────────────────────────────────────

export interface IngestResult {
  ok: true;
  batch_id: string;
  filings_written: number;
  ai_flagged_count: number;
  indexed_total: number;
}

/**
 * Write a validated batch to KV. Per-filing record under by-accession,
 * appended to the index, ai-flagged subset rebuilt from the updated
 * index. Idempotent: re-writing the same accession_number replaces the
 * prior record cleanly (Qwen output for the same filing is expected to
 * change as the upstream prompt iterates).
 */
export async function writeBatch(env: Env, batch: ExtractionBatch): Promise<IngestResult> {
  // 1. Write per-accession records in parallel
  await Promise.all(
    batch.filings.map((f) =>
      env.TENSORFEED_NEWS.put(
        `${KEY_BY_ACCESSION_PREFIX}${f.accession_number}`,
        JSON.stringify(f),
        { expirationTtl: FILING_TTL_S },
      ),
    ),
  );

  // 2. Update index: load existing, merge by accession_number, sort by
  //    filing_date desc.
  const existingRaw = await env.TENSORFEED_NEWS.get(KEY_INDEX);
  const existing: IndexEntry[] = existingRaw ? (JSON.parse(existingRaw) as IndexEntry[]) : [];
  const indexMap = new Map<string, IndexEntry>();
  for (const e of existing) indexMap.set(e.accession_number, e);
  for (const f of batch.filings) {
    indexMap.set(f.accession_number, {
      accession_number: f.accession_number,
      cik: f.cik,
      ticker: f.ticker,
      form: f.form,
      filing_date: f.filing_date,
      ai_relevant: f.ai_relevant,
      ai_relevance_score: f.ai_relevance_score,
      extracted_at: f.extracted_at,
    });
  }
  const merged = [...indexMap.values()].sort((a, b) =>
    a.filing_date < b.filing_date ? 1 : a.filing_date > b.filing_date ? -1 : a.accession_number.localeCompare(b.accession_number),
  );
  await env.TENSORFEED_NEWS.put(KEY_INDEX, JSON.stringify(merged));

  // 3. Rebuild AI-flagged subset (full record snapshots so a single KV
  //    read serves the ai-flagged endpoint without N follow-up reads).
  //    Filter to ai_relevant=true, cap at 500 most-recent to bound size.
  const aiFlaggedEntries = merged.filter((e) => e.ai_relevant).slice(0, 500);
  const aiFlaggedFilings = await Promise.all(
    aiFlaggedEntries.map(async (e) => {
      const raw = await env.TENSORFEED_NEWS.get(`${KEY_BY_ACCESSION_PREFIX}${e.accession_number}`);
      return raw ? (JSON.parse(raw) as FilingExtraction) : null;
    }),
  );
  const aiFlaggedClean = aiFlaggedFilings.filter((f): f is FilingExtraction => f !== null);
  await env.TENSORFEED_NEWS.put(
    KEY_AI_FLAGGED,
    JSON.stringify({
      batch_id: batch.batch_id,
      extracted_at: batch.extracted_at,
      filings: aiFlaggedClean,
    }),
  );

  // 4. Latest pointer
  await env.TENSORFEED_NEWS.put(
    KEY_LATEST,
    JSON.stringify({ batch_id: batch.batch_id, extracted_at: batch.extracted_at }),
  );

  return {
    ok: true,
    batch_id: batch.batch_id,
    filings_written: batch.filings.length,
    ai_flagged_count: aiFlaggedClean.length,
    indexed_total: merged.length,
  };
}

// ─── KV reads ───────────────────────────────────────────────────────

export async function getExtraction(env: Env, accession_number: string): Promise<FilingExtraction | null> {
  const raw = await env.TENSORFEED_NEWS.get(`${KEY_BY_ACCESSION_PREFIX}${accession_number}`);
  return raw ? (JSON.parse(raw) as FilingExtraction) : null;
}

export async function getIndex(env: Env): Promise<IndexEntry[]> {
  const raw = await env.TENSORFEED_NEWS.get(KEY_INDEX);
  return raw ? (JSON.parse(raw) as IndexEntry[]) : [];
}

export async function getAiFlagged(env: Env): Promise<{
  batch_id: string;
  extracted_at: string;
  filings: FilingExtraction[];
} | null> {
  const raw = await env.TENSORFEED_NEWS.get(KEY_AI_FLAGGED);
  return raw ? (JSON.parse(raw) as { batch_id: string; extracted_at: string; filings: FilingExtraction[] }) : null;
}

export async function getLatest(env: Env): Promise<{ batch_id: string; extracted_at: string } | null> {
  const raw = await env.TENSORFEED_NEWS.get(KEY_LATEST);
  return raw ? (JSON.parse(raw) as { batch_id: string; extracted_at: string }) : null;
}

// ─── Attribution helper ──────────────────────────────────────────────

export function publicAttribution(): { source_license: string; source_attribution: string } {
  return { source_license: SOURCE_LICENSE, source_attribution: SOURCE_ATTRIBUTION };
}
