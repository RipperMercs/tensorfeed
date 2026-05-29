/**
 * sec-guidance-delta: ingest, KV layout, raw reads (Filing Guidance-Delta).
 *
 * Sister module to sec-filings-extraction.ts (AI-relevant filing mentions).
 * This file owns the validation + KV schema for the periodic-filing
 * same-form delta product: a structured diff of guidance language between
 * a current periodic filing and its prior comparable filing (10-K vs prior
 * 10-K, 10-Q vs prior 10-Q), produced by DataPal CC on the 5090 rig.
 *
 * Pipeline:
 *   1. sec-filings-fetcher.ts pulls EDGAR submissions for the AI bellwether
 *      CIKs every 6h, publishes /api/sec/filings/recent.
 *   2. DataPal CC pairs each new periodic filing with its prior comparable
 *      filing, fetches both primary docs, and runs Phi-4 verbatim
 *      extraction per For_DP_CC_guidance_delta_contract.md schema. Phi-4
 *      extracts the verbatim guidance topics and text; DataPal's
 *      normalize.py assigns the trusted enums (category, change_type,
 *      direction, materiality) via deterministic regex + lookup tables.
 *   3. TF CC audits the batch in-session, then POSTs to
 *      /api/admin/sec-guidance-delta/ingest with the batch envelope.
 *   4. Premium endpoints (a later phase) read from this KV layout.
 *
 * Schema is engine-fit per [[feedback_engine_fit_extract_verbatim]]:
 * Phi-4 extracts named fields verbatim; DataPal's normalize.py assigns the
 * trusted enums (category, change_type, direction, materiality). TF CC
 * receives the schema-clean JSON below.
 *
 * Source licensing: SEC EDGAR is US Government public domain (17 USC 105).
 * No attribution required by law; we ship one anyway to make the data
 * provenance unambiguous on agent reads.
 */

import type { Env } from './types';
import { safePut } from './kill-switch';
import { getCompanyFilingsSnapshot } from './sec-filings-fetcher';

// ─── KV schema ──────────────────────────────────────────────────────

export const KEY_LATEST = 'sec-guidance-delta:latest';
export const KEY_INDEX = 'sec-guidance-delta:index';
export const KEY_MATERIAL = 'sec-guidance-delta:material';
export const KEY_BY_ACCESSION_PREFIX = 'sec-guidance-delta:by-accession:';

/** 730 days. The KV TTL provides a backstop for guidance deltas; anything
 * older than two years has limited forward-looking value, but the TTL also
 * bounds total KV footprint in case the upstream cohort grows. */
export const FILING_TTL_S = 730 * 24 * 60 * 60;

// ─── Attribution ─────────────────────────────────────────────────────

export const SOURCE_LICENSE = 'US Government public domain (17 USC 105)';
export const SOURCE_ATTRIBUTION =
  'SEC EDGAR (data.sec.gov) + Phi-4 verbatim extraction + deterministic normalize';

// ─── Enum types (deterministic, assigned post-Phi-4 by normalize.py) ──

export type GuidanceCategory =
  | 'revenue_guidance'
  | 'margin_guidance'
  | 'capex_guidance'
  | 'eps_guidance'
  | 'segment_outlook'
  | 'risk_factor'
  | 'liquidity'
  | 'strategic'
  | 'other';

export type ChangeType =
  | 'raised'
  | 'lowered'
  | 'reaffirmed'
  | 'initiated'
  | 'withdrawn'
  | 'widened'
  | 'narrowed'
  | 'added'
  | 'removed'
  | 'reworded'
  | 'other';

export type Direction = 'up' | 'down' | 'neutral' | 'unclear';

export type Materiality = 'material' | 'minor' | 'boilerplate';

const VALID_CATEGORY = new Set<string>([
  'revenue_guidance', 'margin_guidance', 'capex_guidance', 'eps_guidance',
  'segment_outlook', 'risk_factor', 'liquidity', 'strategic', 'other',
]);
const VALID_CHANGE_TYPE = new Set<string>([
  'raised', 'lowered', 'reaffirmed', 'initiated', 'withdrawn', 'widened',
  'narrowed', 'added', 'removed', 'reworded', 'other',
]);
const VALID_DIRECTION = new Set<string>([
  'up', 'down', 'neutral', 'unclear',
]);
const VALID_MATERIALITY = new Set<string>([
  'material', 'minor', 'boilerplate',
]);

// ─── Nested change shape ─────────────────────────────────────────────

export interface GuidanceChange {
  topic: string;
  prior_text: string;
  current_text: string;
  prior_value: string | null;
  current_value: string | null;
  section: string | null;
  category: GuidanceCategory;
  change_type: ChangeType;
  direction: Direction;
  materiality: Materiality;
}

// ─── Top-level delta shape ───────────────────────────────────────────

export interface GuidanceDelta {
  // Provenance (echoed verbatim from /api/sec/filings/recent)
  accession_number: string;
  prior_accession_number: string;
  cik: string;
  ticker: string;
  company_name: string;
  form: string;
  filing_date: string;
  prior_filing_date: string;
  // Changes (Phi-4-extracted verbatim, normalize.py assigns enums).
  // Empty array is valid: it means no material guidance change was found
  // between the current filing and its prior comparable filing.
  changes: GuidanceChange[];
  // Self-report
  extracted_by: string;
  extracted_at: string;
}

export interface GuidanceDeltaBatch {
  batch_id: string;
  extracted_at: string;
  deltas: GuidanceDelta[];
}

// ─── Index entry (lightweight, used for discovery without loading the
//     full per-delta record from KV) ──────────────────────────────────

export interface IndexEntry {
  accession_number: string;
  prior_accession_number: string;
  cik: string;
  ticker: string;
  form: string;
  filing_date: string;
  material_count: number;
  change_count: number;
  extracted_at: string;
}

// ─── Validation ─────────────────────────────────────────────────────

export const MAX_DELTAS_PER_BATCH = 200;
export const MAX_CHANGES_PER_DELTA = 500;

// Per-field length caps. prior_text and current_text are the verbatim
// guidance language and run long; the value, topic, and section fields are
// short tokens normalize.py pulls from the surrounding text.
export const MAX_TEXT_LEN = 1000;
export const MAX_TOPIC_LEN = 200;
export const MAX_SECTION_LEN = 200;
export const MAX_VALUE_LEN = 120;

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

function validateContextString(s: unknown, field: string, maxLen = MAX_TEXT_LEN): ValidationResult<string> {
  if (!isString(s)) return failV('bad_field', `${field} must be a string`);
  if (s.length > maxLen) return failV('field_too_long', `${field} exceeds ${maxLen} chars`);
  if (hasEmDash(s)) return failV('em_dash_in_context', `${field} contains an em dash; DataPal normalize.py must strip these before handoff`);
  return { ok: true, value: s };
}

/** Validates a nullable short token (prior_value, current_value, section).
 * null is accepted; when present it must be a string within maxLen and free
 * of em dashes. */
function validateNullableToken(v: unknown, field: string, maxLen: number): ValidationResult<string | null> {
  if (v === null) return { ok: true, value: null };
  if (!isString(v)) return failV('bad_field', `${field} must be string or null`);
  if (v.length > maxLen) return failV('field_too_long', `${field} exceeds ${maxLen} chars`);
  if (hasEmDash(v)) return failV('em_dash_in_field', `${field} contains an em dash`);
  return { ok: true, value: v };
}

// ─── Per-change validator ───────────────────────────────────────────

function validateChange(v: unknown, idx: number): ValidationResult<GuidanceChange> {
  if (!isPlainObject(v)) return failV('bad_change', `changes[${idx}] must be an object`);

  // topic: verbatim, 1..200 chars, non-empty, no em dash.
  if (!isString(v.topic) || v.topic.length === 0 || v.topic.length > MAX_TOPIC_LEN) {
    return failV('bad_change', `changes[${idx}].topic length must be 1-${MAX_TOPIC_LEN}`);
  }
  if (hasEmDash(v.topic)) return failV('em_dash_in_field', `changes[${idx}].topic contains an em dash`);

  // prior_text / current_text: verbatim, 0..1000 chars (empty string is
  // valid for initiated/added and removed/withdrawn changes), no em dash.
  const priorTextR = validateContextString(v.prior_text, `changes[${idx}].prior_text`, MAX_TEXT_LEN);
  if (!priorTextR.ok) return priorTextR;
  const currentTextR = validateContextString(v.current_text, `changes[${idx}].current_text`, MAX_TEXT_LEN);
  if (!currentTextR.ok) return currentTextR;

  // prior_value / current_value: nullable short tokens, <= 120 chars.
  const priorValueR = validateNullableToken(v.prior_value, `changes[${idx}].prior_value`, MAX_VALUE_LEN);
  if (!priorValueR.ok) return priorValueR;
  const currentValueR = validateNullableToken(v.current_value, `changes[${idx}].current_value`, MAX_VALUE_LEN);
  if (!currentValueR.ok) return currentValueR;

  // section: nullable short token, <= 200 chars.
  const sectionR = validateNullableToken(v.section, `changes[${idx}].section`, MAX_SECTION_LEN);
  if (!sectionR.ok) return sectionR;

  // Enums (deterministic, assigned by normalize.py).
  if (!isString(v.category) || !VALID_CATEGORY.has(v.category)) {
    return failV('bad_enum', `changes[${idx}].category must be one of: ${[...VALID_CATEGORY].join(', ')}`);
  }
  if (!isString(v.change_type) || !VALID_CHANGE_TYPE.has(v.change_type)) {
    return failV('bad_enum', `changes[${idx}].change_type must be one of: ${[...VALID_CHANGE_TYPE].join(', ')}`);
  }
  if (!isString(v.direction) || !VALID_DIRECTION.has(v.direction)) {
    return failV('bad_enum', `changes[${idx}].direction must be one of: ${[...VALID_DIRECTION].join(', ')}`);
  }
  if (!isString(v.materiality) || !VALID_MATERIALITY.has(v.materiality)) {
    return failV('bad_enum', `changes[${idx}].materiality must be one of: ${[...VALID_MATERIALITY].join(', ')}`);
  }

  return {
    ok: true,
    value: {
      topic: v.topic,
      prior_text: priorTextR.value,
      current_text: currentTextR.value,
      prior_value: priorValueR.value,
      current_value: currentValueR.value,
      section: sectionR.value,
      category: v.category as GuidanceCategory,
      change_type: v.change_type as ChangeType,
      direction: v.direction as Direction,
      materiality: v.materiality as Materiality,
    },
  };
}

// ─── Per-delta validator ────────────────────────────────────────────

export function validateDelta(raw: unknown): ValidationResult<GuidanceDelta> {
  if (!isPlainObject(raw)) return failV('not_an_object', 'delta must be an object');

  if (!isString(raw.accession_number) || !ACCESSION_RE.test(raw.accession_number)) {
    return failV('bad_accession', 'accession_number must match NNNNNNNNNN-NN-NNNNNN');
  }
  if (!isString(raw.prior_accession_number) || !ACCESSION_RE.test(raw.prior_accession_number)) {
    return failV('bad_prior_accession', 'prior_accession_number must match NNNNNNNNNN-NN-NNNNNN');
  }
  if (raw.prior_accession_number === raw.accession_number) {
    return failV('prior_equals_current', 'prior_accession_number must differ from accession_number');
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
  if (!isString(raw.prior_filing_date) || !ISO_DATE_RE.test(raw.prior_filing_date)) {
    return failV('bad_prior_filing_date', 'prior_filing_date must be YYYY-MM-DD');
  }
  if (!isString(raw.extracted_by) || raw.extracted_by.length === 0 || raw.extracted_by.length > 100) {
    return failV('bad_extracted_by', 'extracted_by must be 1-100 chars');
  }
  if (!isString(raw.extracted_at) || !ISO_TS_RE.test(raw.extracted_at)) {
    return failV('bad_extracted_at', 'extracted_at must be ISO 8601 UTC');
  }

  // changes: array, 0..500. Empty array is valid (no material change found).
  if (!Array.isArray(raw.changes)) return failV('bad_field', 'changes must be an array');
  if (raw.changes.length > MAX_CHANGES_PER_DELTA) {
    return failV('too_many_changes', `changes exceeds max of ${MAX_CHANGES_PER_DELTA}`);
  }
  const changes: GuidanceChange[] = [];
  for (let i = 0; i < raw.changes.length; i++) {
    const r = validateChange(raw.changes[i], i);
    if (!r.ok) return r;
    changes.push(r.value);
  }

  return {
    ok: true,
    value: {
      accession_number: raw.accession_number,
      prior_accession_number: raw.prior_accession_number,
      cik: raw.cik,
      ticker: raw.ticker,
      company_name: raw.company_name,
      form: raw.form,
      filing_date: raw.filing_date,
      prior_filing_date: raw.prior_filing_date,
      changes,
      extracted_by: raw.extracted_by,
      extracted_at: raw.extracted_at,
    },
  };
}

// ─── Batch validator ────────────────────────────────────────────────

export function validateBatch(raw: unknown): ValidationResult<GuidanceDeltaBatch> {
  if (!isPlainObject(raw)) return failV('not_an_object', 'batch must be an object');
  if (!isString(raw.batch_id) || raw.batch_id.length === 0 || raw.batch_id.length > 100) {
    return failV('bad_batch_id', 'batch_id must be 1-100 chars');
  }
  if (!isString(raw.extracted_at) || !ISO_TS_RE.test(raw.extracted_at)) {
    return failV('bad_extracted_at', 'batch.extracted_at must be ISO 8601 UTC');
  }
  if (!Array.isArray(raw.deltas)) return failV('bad_deltas', 'deltas must be an array');
  if (raw.deltas.length === 0) return failV('empty_deltas', 'deltas must be non-empty');
  if (raw.deltas.length > MAX_DELTAS_PER_BATCH) {
    return failV('too_many_deltas', `deltas exceeds max of ${MAX_DELTAS_PER_BATCH}`);
  }

  const seen = new Set<string>();
  const out: GuidanceDelta[] = [];
  for (let i = 0; i < raw.deltas.length; i++) {
    const r = validateDelta(raw.deltas[i]);
    if (!r.ok) return { ...r, index: i };
    if (seen.has(r.value.accession_number)) {
      return failV('duplicate_accession', `duplicate accession_number ${r.value.accession_number} in batch`, i);
    }
    seen.add(r.value.accession_number);
    out.push(r.value);
  }

  return {
    ok: true,
    value: { batch_id: raw.batch_id, extracted_at: raw.extracted_at, deltas: out },
  };
}

// ─── KV writes ──────────────────────────────────────────────────────

function materialCount(d: GuidanceDelta): number {
  return d.changes.filter((c) => c.materiality === 'material').length;
}

export interface IngestResult {
  ok: true;
  batch_id: string;
  deltas_written: number;
  material_count: number;
  indexed_total: number;
}

/**
 * Write a validated batch to KV. Per-delta record under by-accession,
 * appended to the index, material subset rebuilt from the updated index.
 * Idempotent: re-writing the same accession_number replaces the prior
 * record cleanly (Phi-4 output for the same filing is expected to change
 * as the upstream prompt iterates).
 */
export async function writeBatch(env: Env, batch: GuidanceDeltaBatch): Promise<IngestResult> {
  // 1. Write per-accession records in parallel
  await Promise.all(
    batch.deltas.map((d) =>
      env.TENSORFEED_NEWS.put(
        `${KEY_BY_ACCESSION_PREFIX}${d.accession_number}`,
        JSON.stringify(d),
        { expirationTtl: FILING_TTL_S },
      ),
    ),
  );

  // 2. Update index: load existing, merge by accession_number, sort by
  //    filing_date desc (tiebreak accession_number).
  const existingRaw = await env.TENSORFEED_NEWS.get(KEY_INDEX);
  const existing: IndexEntry[] = existingRaw ? (JSON.parse(existingRaw) as IndexEntry[]) : [];
  const indexMap = new Map<string, IndexEntry>();
  for (const e of existing) indexMap.set(e.accession_number, e);
  for (const d of batch.deltas) {
    indexMap.set(d.accession_number, {
      accession_number: d.accession_number,
      prior_accession_number: d.prior_accession_number,
      cik: d.cik,
      ticker: d.ticker,
      form: d.form,
      filing_date: d.filing_date,
      material_count: materialCount(d),
      change_count: d.changes.length,
      extracted_at: d.extracted_at,
    });
  }
  const merged = [...indexMap.values()].sort((a, b) =>
    a.filing_date < b.filing_date ? 1 : a.filing_date > b.filing_date ? -1 : a.accession_number.localeCompare(b.accession_number),
  );
  await env.TENSORFEED_NEWS.put(KEY_INDEX, JSON.stringify(merged));

  // 3. Rebuild material subset (full record snapshots so a single KV read
  //    serves the material endpoint without N follow-up reads). Filter to
  //    entries with at least one material change, cap at 500 most-recent to
  //    bound size.
  const materialEntries = merged.filter((e) => e.material_count > 0).slice(0, 500);
  const materialDeltas = await Promise.all(
    materialEntries.map(async (e) => {
      const raw = await env.TENSORFEED_NEWS.get(`${KEY_BY_ACCESSION_PREFIX}${e.accession_number}`);
      return raw ? (JSON.parse(raw) as GuidanceDelta) : null;
    }),
  );
  const materialClean = materialDeltas.filter((d): d is GuidanceDelta => d !== null);
  await env.TENSORFEED_NEWS.put(
    KEY_MATERIAL,
    JSON.stringify({
      batch_id: batch.batch_id,
      extracted_at: batch.extracted_at,
      deltas: materialClean,
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
    deltas_written: batch.deltas.length,
    material_count: batch.deltas.filter((d) => materialCount(d) > 0).length,
    indexed_total: merged.length,
  };
}

// ─── KV reads ───────────────────────────────────────────────────────

export async function getGuidanceDelta(env: Env, accession_number: string): Promise<GuidanceDelta | null> {
  const raw = await env.TENSORFEED_NEWS.get(`${KEY_BY_ACCESSION_PREFIX}${accession_number}`);
  return raw ? (JSON.parse(raw) as GuidanceDelta) : null;
}

export async function getIndex(env: Env): Promise<IndexEntry[]> {
  const raw = await env.TENSORFEED_NEWS.get(KEY_INDEX);
  return raw ? (JSON.parse(raw) as IndexEntry[]) : [];
}

export async function getMaterial(env: Env): Promise<{
  batch_id: string;
  extracted_at: string;
  deltas: GuidanceDelta[];
} | null> {
  const raw = await env.TENSORFEED_NEWS.get(KEY_MATERIAL);
  return raw ? (JSON.parse(raw) as { batch_id: string; extracted_at: string; deltas: GuidanceDelta[] }) : null;
}

export async function getLatest(env: Env): Promise<{ batch_id: string; extracted_at: string } | null> {
  const raw = await env.TENSORFEED_NEWS.get(KEY_LATEST);
  return raw ? (JSON.parse(raw) as { batch_id: string; extracted_at: string }) : null;
}

// ─── Attribution helper ──────────────────────────────────────────────

export function publicAttribution(): { source_license: string; source_attribution: string } {
  return { source_license: SOURCE_LICENSE, source_attribution: SOURCE_ATTRIBUTION };
}

// ─── Read-side derivation (premium + preview endpoints) ──────────────
//
// The premium endpoint sells the verbatim quotes plus an AFTA-signed
// receipt; the free preview sells the materiality_summary plus the
// per-change enum profile WITHOUT the quotes. Both share the summary
// computation below so the two responses cannot drift.

export interface MaterialitySummary {
  total_changes: number;
  by_materiality: Record<string, number>;
  by_category: Record<string, number>;
  by_change_type: Record<string, number>;
  by_direction: Record<string, number>;
  // One-line deterministic headline. F1 safety: it NEVER asserts a
  // risk-factor added/removed count, because that signal is unreliable
  // under the v1 Phi-4 section-narrowing path (the prior and current
  // Risk Factors sections are narrowed independently, so a sentence
  // narrowed out of the prior reads as a spurious add). Those are dropped
  // at the source for v1; the exclusion here is defense in depth.
  headline: string;
}

function changeTypeVerb(ct: ChangeType): string {
  switch (ct) {
    case 'raised':
      return 'raised';
    case 'lowered':
      return 'lowered';
    case 'reaffirmed':
      return 'reaffirmed';
    case 'initiated':
      return 'initiated';
    case 'withdrawn':
      return 'withdrawn';
    case 'widened':
      return 'widened';
    case 'narrowed':
      return 'narrowed';
    case 'added':
      return 'added';
    case 'removed':
      return 'removed';
    case 'reworded':
      return 'reworded';
    default:
      return 'changed';
  }
}

export function buildMaterialitySummary(delta: GuidanceDelta): MaterialitySummary {
  const byMateriality: Record<string, number> = { material: 0, minor: 0, boilerplate: 0 };
  const byCategory: Record<string, number> = {};
  const byChangeType: Record<string, number> = {};
  const byDirection: Record<string, number> = { up: 0, down: 0, neutral: 0, unclear: 0 };
  for (const c of delta.changes) {
    byMateriality[c.materiality] = (byMateriality[c.materiality] ?? 0) + 1;
    byCategory[c.category] = (byCategory[c.category] ?? 0) + 1;
    byChangeType[c.change_type] = (byChangeType[c.change_type] ?? 0) + 1;
    byDirection[c.direction] = (byDirection[c.direction] ?? 0) + 1;
  }

  // Headline phrases come from MATERIAL changes only, excluding risk-factor
  // added/removed (the F1-unreliable signal). Capped at 3 so the headline
  // stays one line.
  const headlineMaterial = delta.changes.filter(
    (c) =>
      c.materiality === 'material' &&
      !(c.category === 'risk_factor' && (c.change_type === 'added' || c.change_type === 'removed')),
  );
  const phrases = headlineMaterial.slice(0, 3).map((c) => `${c.topic} ${changeTypeVerb(c.change_type)}`);

  // Reworded risk language IS reliable, so a count of it is honest.
  const rewordedRisk = delta.changes.filter(
    (c) => c.category === 'risk_factor' && c.change_type === 'reworded',
  ).length;
  if (rewordedRisk > 0) {
    phrases.push(`${rewordedRisk} risk factor ${rewordedRisk === 1 ? 'wording' : 'wordings'} revised`);
  }

  const headline =
    phrases.length > 0
      ? phrases.join('; ')
      : `No material guidance change found versus the prior ${delta.form} (${delta.prior_accession_number}).`;

  return {
    total_changes: delta.changes.length,
    by_materiality: byMateriality,
    by_category: byCategory,
    by_change_type: byChangeType,
    by_direction: byDirection,
    headline,
  };
}

export interface SupersessionInfo {
  superseded: boolean;
  checked: boolean;
  latest_same_form_accession: string | null;
  latest_same_form_filing_date: string | null;
}

/**
 * Input-keyed freshness check. A delta is current until a newer same-form
 * filing supersedes it. This reads the SEC filings snapshot (the same feed
 * /api/sec/filings/{cik}/recent serves) for the CIK and looks for a newer
 * same-form filing than the delta's accession. If one exists, the served
 * delta is behind EDGAR and the premium handler no-charges. When the
 * snapshot is unavailable, we cannot prove supersession, so we report
 * checked: false and treat the delta as current (do not punish billing for
 * missing metadata, matching checkStaleness's conservative default).
 */
export async function checkGuidanceDeltaSupersession(
  env: Env,
  delta: GuidanceDelta,
): Promise<SupersessionInfo> {
  const snap = await getCompanyFilingsSnapshot(env, delta.cik);
  if (!snap || !Array.isArray(snap.filings)) {
    return { superseded: false, checked: false, latest_same_form_accession: null, latest_same_form_filing_date: null };
  }
  const sameForm = snap.filings.filter((f) => f.form === delta.form);
  if (sameForm.length === 0) {
    return { superseded: false, checked: true, latest_same_form_accession: null, latest_same_form_filing_date: null };
  }
  let latest = sameForm[0];
  for (const f of sameForm) {
    if (f.filing_date > latest.filing_date) latest = f;
  }
  const superseded =
    latest.accession_number !== delta.accession_number && latest.filing_date > delta.filing_date;
  return {
    superseded,
    checked: true,
    latest_same_form_accession: latest.accession_number,
    latest_same_form_filing_date: latest.filing_date,
  };
}

/**
 * Resolve the latest same-form delta for a ticker. The index is sorted by
 * filing_date desc, so the first matching entry is the most recent. Returns
 * null when no delta has been ingested for that (ticker, form) pair yet.
 */
export async function resolveLatestDelta(
  env: Env,
  ticker: string,
  form: string,
): Promise<GuidanceDelta | null> {
  const wantTicker = ticker.trim().toUpperCase();
  const wantForm = form.trim().toUpperCase();
  const index = await getIndex(env);
  const entry = index.find(
    (e) => e.ticker.toUpperCase() === wantTicker && e.form.toUpperCase() === wantForm,
  );
  if (!entry) return null;
  return getGuidanceDelta(env, entry.accession_number);
}

export interface GuidanceDeltaFreshness {
  model: 'input_keyed';
  superseded: boolean;
  superseded_note: string;
  latest_same_form_accession: string | null;
  latest_same_form_filing_date: string | null;
}

export interface GuidanceDeltaResponse {
  ok: true;
  ticker: string;
  company_name: string;
  cik: string;
  form: string;
  accession_number: string;
  prior_accession_number: string;
  filing_date: string;
  prior_filing_date: string;
  materiality_summary: MaterialitySummary;
  changes: GuidanceChange[];
  freshness: GuidanceDeltaFreshness;
  capturedAt: string;
  extracted_by: string;
  source_license: string;
  source_attribution: string;
}

/** Build the full premium response: provenance, the verbatim changes, the
 * deterministic materiality_summary, the input-keyed freshness block, and
 * the capturedAt (= the delta's extracted_at, surfaced for the receipt). */
export function buildGuidanceDeltaResponse(
  delta: GuidanceDelta,
  supersession: SupersessionInfo,
): GuidanceDeltaResponse {
  const attribution = publicAttribution();
  return {
    ok: true,
    ticker: delta.ticker,
    company_name: delta.company_name,
    cik: delta.cik,
    form: delta.form,
    accession_number: delta.accession_number,
    prior_accession_number: delta.prior_accession_number,
    filing_date: delta.filing_date,
    prior_filing_date: delta.prior_filing_date,
    materiality_summary: buildMaterialitySummary(delta),
    changes: delta.changes,
    freshness: {
      model: 'input_keyed',
      superseded: supersession.superseded,
      superseded_note: supersession.superseded
        ? `A newer ${delta.form} (${supersession.latest_same_form_accession}, filed ${supersession.latest_same_form_filing_date}) exists on EDGAR and has not been processed yet, so this delta is behind the latest filing. This call is no-charge.`
        : 'This delta reflects the latest same-form filing TensorFeed has processed.',
      latest_same_form_accession: supersession.latest_same_form_accession,
      latest_same_form_filing_date: supersession.latest_same_form_filing_date,
    },
    capturedAt: delta.extracted_at,
    extracted_by: delta.extracted_by,
    source_license: attribution.source_license,
    source_attribution: attribution.source_attribution,
  };
}

export interface GuidanceDeltaPreviewChange {
  category: GuidanceCategory;
  change_type: ChangeType;
  direction: Direction;
  materiality: Materiality;
}

export interface GuidanceDeltaPreview {
  ok: true;
  preview: true;
  ticker: string;
  company_name: string;
  cik: string;
  form: string;
  accession_number: string;
  prior_accession_number: string;
  filing_date: string;
  prior_filing_date: string;
  materiality_summary: MaterialitySummary;
  changes: GuidanceDeltaPreviewChange[];
  freshness: GuidanceDeltaFreshness;
  capturedAt: string;
}

/** Redact the full response for the free preview: keep the summary and the
 * per-change enum profile, drop the verbatim prior_text / current_text /
 * prior_value / current_value / section (those quotes are the paid evidence). */
export function redactGuidanceDeltaForPreview(full: GuidanceDeltaResponse): GuidanceDeltaPreview {
  return {
    ok: true,
    preview: true,
    ticker: full.ticker,
    company_name: full.company_name,
    cik: full.cik,
    form: full.form,
    accession_number: full.accession_number,
    prior_accession_number: full.prior_accession_number,
    filing_date: full.filing_date,
    prior_filing_date: full.prior_filing_date,
    materiality_summary: full.materiality_summary,
    changes: full.changes.map((c) => ({
      category: c.category,
      change_type: c.change_type,
      direction: c.direction,
      materiality: c.materiality,
    })),
    freshness: full.freshness,
    capturedAt: full.capturedAt,
  };
}

/**
 * Per-IP daily rate limit for the free preview. Distinct KV key from the
 * other previews so they do not share a budget. 1 read plus (0 or 1) writes
 * per call; the write is skipped under the kill switch via safePut.
 */
export async function checkGuidanceDeltaPreviewRateLimit(
  env: Env,
  ip: string,
  max = 10,
): Promise<{ allowed: boolean; remaining: number; limit: number }> {
  const date = new Date().toISOString().slice(0, 10);
  const key = `rate:guidance-delta-preview:${date}:${ip}`;
  const current = (await env.TENSORFEED_CACHE.get(key, 'json')) as { count: number } | null;
  const count = current?.count ?? 0;
  if (count >= max) return { allowed: false, remaining: 0, limit: max };
  await safePut(env, env.TENSORFEED_CACHE, key, JSON.stringify({ count: count + 1 }), { expirationTtl: 60 * 60 * 48 });
  return { allowed: true, remaining: max - count - 1, limit: max };
}
