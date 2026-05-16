/**
 * TensorFeed Jobs: deliverable submission validators + types.
 *
 * M1 of tensorfeed-cold-start-gigs-SPEC.md (local spec). The intake half
 * of the recursive data flywheel: an agent submits a batch of fact rows
 * with primary-source citations against a TF-funded gig. Like jobs.ts
 * this is deliberately storage-free, money-free, env-free. Every export
 * is a pure function or a type, every export covered by
 * jobs-submissions.test.ts, callers pass `now` (here via the shared
 * jobs.validateSignedAt, deliberately NOT forked).
 *
 * The field allowlist is the same Roommates discipline jobs.ts uses:
 * the submitter can only supply the deliverable shape, never smuggle a
 * structured field past us.
 *
 * SIGNATURE INTEGRITY: signed fields are validated STRICTLY and NEVER
 * mutated (no trim, no sort, no de-dupe of any value that is part of the
 * signed payload). The persisted signed_message is canonicalJSON of the
 * exact validated values, so it is byte-identical to what the submitter
 * signed. canonicalJSON sorts object keys at every depth and preserves
 * array order, so the rows array signs deterministically. The only
 * normalization is trimming `signature` itself, which is not part of
 * the signed payload.
 *
 * SSRF: source_url is validated as a well-formed https URL and STORED.
 * It is NEVER fetched inside the Worker. Verification fetches happen
 * out-of-band on the operator side. Do not add a Worker fetch of any
 * submitter-supplied URL.
 */

import { canonicalJSON } from './receipts';
import { validateSignedAt, type Validated } from './jobs';

// Re-exported so callers (and the handler) get the replay/skew guard
// from one place. Never fork the signed_at window.
export { validateSignedAt };
export type { Validated };

export type SubmissionStatus = 'pending' | 'accepted' | 'rejected';

/** A single fact row: AI model pricing + specs, the M1 first feed. */
export interface PricingRow {
  model: string;
  vendor: string;
  input_per_1m: number;
  output_per_1m: number;
  context_window: number;
  modalities: string[];
  effective_date: string; // ISO YYYY-MM-DD
  source_url: string; // https, vendor primary source
}

/** The exact object a submitter canonicalizes and signs (EIP-191). */
export interface SubmissionSignedPayload {
  gig_id: string;
  submitter_addr: string;
  rows: PricingRow[];
  notes: string;
  nonce: string;
  signed_at: number;
}

/** The wire submission: the signed payload plus its signature. */
export interface SubmissionWire extends SubmissionSignedPayload {
  signature: string;
}

/** The persisted record. */
export interface SubmissionRecord extends SubmissionWire {
  id: string;
  status: SubmissionStatus;
  signed_message: string;
  created_at: number;
  decided_at: number | null;
  decision_note: string | null;
}

/**
 * The public projection (audit artifacts omitted), mirroring
 * jobs.toPublicGig discipline: signature, signed_message, and nonce are
 * internal and never part of any listing contract.
 */
export interface PublicSubmission {
  id: string;
  gig_id: string;
  submitter_addr: string;
  rows: PricingRow[];
  notes: string;
  status: SubmissionStatus;
  created_at: number;
  decided_at: number | null;
  decision_note: string | null;
}

// Exact allowed keys. Anything else is a hard fail, not a silent strip.
export const ALLOWED_DELIVERABLE_FIELDS: ReadonlySet<string> = new Set([
  'gig_id',
  'submitter_addr',
  'rows',
  'notes',
  'nonce',
  'signed_at',
  'signature',
]);

export const ALLOWED_ROW_FIELDS: ReadonlySet<string> = new Set([
  'model',
  'vendor',
  'input_per_1m',
  'output_per_1m',
  'context_window',
  'modalities',
  'effective_date',
  'source_url',
]);

export const MODALITY_VOCAB: ReadonlySet<string> = new Set([
  'text',
  'image',
  'audio',
  'video',
  'code',
]);

export const MAX_ROWS = 25;
export const MAX_NOTES_LEN = 1000;
export const MAX_NONCE_LEN = 128;
export const MAX_STR_FIELD_LEN = 200;
export const MAX_URL_LEN = 600;
export const MAX_GIG_ID_LEN = 80;

const ADDR_RE = /^0x[0-9a-fA-F]{40}$/;
const ISO_DATE_RE = /^\d{4}-\d{2}-\d{2}$/;
const HTTPS_RE = /^https:\/\/[^\s<>"]+$/;

function isString(v: unknown): v is string {
  return typeof v === 'string';
}

/** A signed string field: non-empty and already trimmed (strict). */
function isCleanString(v: unknown, max: number): v is string {
  return (
    typeof v === 'string' &&
    v.length > 0 &&
    v.length <= max &&
    v.trim() === v
  );
}

function isFiniteNumber(v: unknown): v is number {
  return typeof v === 'number' && Number.isFinite(v);
}

/**
 * Reject any key not in `allow`. Run BEFORE anything else, on the raw
 * parsed object. Extra fields are a hard fail so a submitter cannot
 * smuggle a structured field past us.
 */
export function validateFieldAllowlist(
  raw: Record<string, unknown>,
  allow: ReadonlySet<string>,
): Validated<true> {
  for (const key of Object.keys(raw)) {
    if (!allow.has(key)) {
      return { ok: false, error: `field_not_allowed:${key}` };
    }
  }
  return { ok: true, value: true };
}

/**
 * Strict, non-mutating row validation. Returns the row UNCHANGED on
 * success so the signed bytes are unambiguous. Whitespace-padded
 * strings, duplicate modalities, and non-https URLs are rejected, not
 * normalized.
 */
export function validatePricingRow(raw: unknown): Validated<PricingRow> {
  if (typeof raw !== 'object' || raw === null || Array.isArray(raw)) {
    return { ok: false, error: 'row_not_object' };
  }
  const r = raw as Record<string, unknown>;
  const allow = validateFieldAllowlist(r, ALLOWED_ROW_FIELDS);
  if (!allow.ok) return allow;

  if (!isCleanString(r.model, MAX_STR_FIELD_LEN)) {
    return { ok: false, error: 'row_model_invalid' };
  }
  if (!isCleanString(r.vendor, MAX_STR_FIELD_LEN)) {
    return { ok: false, error: 'row_vendor_invalid' };
  }
  if (!isFiniteNumber(r.input_per_1m) || r.input_per_1m < 0) {
    return { ok: false, error: 'row_input_per_1m_invalid' };
  }
  if (!isFiniteNumber(r.output_per_1m) || r.output_per_1m < 0) {
    return { ok: false, error: 'row_output_per_1m_invalid' };
  }
  if (
    !isFiniteNumber(r.context_window) ||
    !Number.isInteger(r.context_window) ||
    r.context_window <= 0
  ) {
    return { ok: false, error: 'row_context_window_invalid' };
  }
  if (
    !Array.isArray(r.modalities) ||
    r.modalities.length === 0 ||
    r.modalities.length > MODALITY_VOCAB.size ||
    !r.modalities.every((m) => typeof m === 'string' && MODALITY_VOCAB.has(m))
  ) {
    return { ok: false, error: 'row_modalities_invalid' };
  }
  // Reject duplicates rather than silently de-dupe: the array is signed
  // as-is, so its contents must be unambiguous on submission.
  if (new Set(r.modalities as string[]).size !== r.modalities.length) {
    return { ok: false, error: 'row_modalities_duplicate' };
  }
  if (
    typeof r.effective_date !== 'string' ||
    !ISO_DATE_RE.test(r.effective_date) ||
    Number.isNaN(Date.parse(r.effective_date))
  ) {
    return { ok: false, error: 'row_effective_date_invalid' };
  }
  if (
    typeof r.source_url !== 'string' ||
    r.source_url.length > MAX_URL_LEN ||
    r.source_url.trim() !== r.source_url ||
    !HTTPS_RE.test(r.source_url)
  ) {
    return { ok: false, error: 'row_source_url_invalid' };
  }

  // Returned unchanged. No mutation of any signed value.
  return {
    ok: true,
    value: {
      model: r.model as string,
      vendor: r.vendor as string,
      input_per_1m: r.input_per_1m,
      output_per_1m: r.output_per_1m,
      context_window: r.context_window,
      modalities: (r.modalities as string[]).slice(),
      effective_date: r.effective_date,
      source_url: r.source_url,
    },
  };
}

/**
 * Full deliverable validation. Strict and non-mutating on every signed
 * field. `signature` (not part of the signed payload) is the only
 * value trimmed.
 */
export function validateDeliverable(
  raw: Record<string, unknown>,
): Validated<SubmissionWire> {
  const allow = validateFieldAllowlist(raw, ALLOWED_DELIVERABLE_FIELDS);
  if (!allow.ok) return allow;

  if (!isCleanString(raw.gig_id, MAX_GIG_ID_LEN)) {
    return { ok: false, error: 'gig_id_invalid' };
  }
  if (
    !isCleanString(raw.submitter_addr, 42) ||
    !ADDR_RE.test(raw.submitter_addr as string)
  ) {
    return { ok: false, error: 'submitter_addr_invalid' };
  }
  if (!Array.isArray(raw.rows) || raw.rows.length === 0) {
    return { ok: false, error: 'rows_required' };
  }
  if (raw.rows.length > MAX_ROWS) {
    return { ok: false, error: 'rows_too_many' };
  }
  const rows: PricingRow[] = [];
  for (let i = 0; i < raw.rows.length; i++) {
    const rv = validatePricingRow(raw.rows[i]);
    if (!rv.ok) return { ok: false, error: `row_${i}:${rv.error}` };
    rows.push(rv.value);
  }
  // notes is optional but, if present, is signed, so it must be a clean
  // string. Empty string is allowed (and is the canonical absent form).
  const notes = raw.notes === undefined ? '' : raw.notes;
  if (!isString(notes) || notes.length > MAX_NOTES_LEN || notes.trim() !== notes) {
    return { ok: false, error: 'notes_invalid' };
  }
  if (!isCleanString(raw.nonce, MAX_NONCE_LEN)) {
    return { ok: false, error: 'nonce_invalid' };
  }
  if (
    typeof raw.signed_at !== 'number' ||
    !Number.isFinite(raw.signed_at) ||
    !Number.isInteger(raw.signed_at)
  ) {
    return { ok: false, error: 'signed_at_invalid' };
  }
  if (typeof raw.signature !== 'string' || raw.signature.trim().length === 0) {
    return { ok: false, error: 'signature_required' };
  }

  return {
    ok: true,
    value: {
      gig_id: raw.gig_id as string,
      submitter_addr: raw.submitter_addr as string,
      rows,
      notes,
      nonce: raw.nonce as string,
      signed_at: raw.signed_at,
      signature: raw.signature.trim(),
    },
  };
}

/**
 * The exact string the submitter signs and TF retains. Uses the shared
 * canonicalJSON so both sides derive a byte-identical message
 * regardless of key order, and it recurses the rows array
 * deterministically (canonicalJSON sorts object keys at every depth and
 * preserves array order).
 */
export function buildSubmissionMessage(p: SubmissionSignedPayload): string {
  return canonicalJSON({
    gig_id: p.gig_id,
    submitter_addr: p.submitter_addr,
    rows: p.rows,
    notes: p.notes,
    nonce: p.nonce,
    signed_at: p.signed_at,
  });
}

/**
 * Build the persisted record from a validated submission. Pure: id and
 * now are supplied by the caller so this stays deterministic under test.
 */
export function assembleSubmissionRecord(
  sub: SubmissionWire,
  nowSec: number,
  id: string,
): SubmissionRecord {
  return {
    ...sub,
    id,
    status: 'pending',
    signed_message: buildSubmissionMessage(sub),
    created_at: nowSec,
    decided_at: null,
    decision_note: null,
  };
}

export function toPublicSubmission(rec: SubmissionRecord): PublicSubmission {
  return {
    id: rec.id,
    gig_id: rec.gig_id,
    submitter_addr: rec.submitter_addr,
    rows: rec.rows,
    notes: rec.notes,
    status: rec.status,
    created_at: rec.created_at,
    decided_at: rec.decided_at,
    decision_note: rec.decision_note,
  };
}
