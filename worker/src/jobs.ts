/**
 * TensorFeed Jobs: pure validators + types for the backend gig board.
 *
 * Build step 1 of tensorfeed-jobs-api-endpoint-spec.md. Deliberately
 * storage-free, money-free, env-free. Every export is a pure function or
 * a type. Storage (D1), the x402 settle, EIP-191 recovery, and OFAC
 * screening live in later steps and separate modules.
 *
 * Mirrors the agent-reputation.ts discipline: callers pass "now", no
 * Date.now() inside, every export covered by jobs.test.ts.
 *
 * The field allowlist (validateFieldAllowlist) is the load-bearing rule.
 * It is what keeps the passive-conduit posture intact: a poster can only
 * submit free-text and a neutral category, never a structured field that
 * could encode unlawful selection criteria.
 */

import { canonicalJSON } from './receipts';
import { SKILLS_TAG_VOCAB } from './agent-claim-verify';

export type GigStatus =
  | 'active'
  | 'filled'
  | 'closed'
  | 'expired'
  | 'removed';

/** The exact object a poster canonicalizes and signs (EIP-191). */
export interface GigSignedPayload {
  title: string;
  body: string;
  category: string;
  budget_note: string;
  poster_x402: string;
  poster_addr: string;
  nonce: string;
  signed_at: number;
}

/** The wire submission: the signed payload plus its signature. */
export interface GigSubmission extends GigSignedPayload {
  signature: string;
}

/** The persisted record. */
export interface GigRecord extends GigSubmission {
  id: string;
  status: GigStatus;
  signed_message: string;
  created_at: number;
  expires_at: number;
  removed_reason: string | null;
}

export type Validated<T> =
  | { ok: true; value: T }
  | { ok: false; error: string };

// Exact allowed keys on a submission. Anything else is rejected. This is
// the Roommates discipline expressed in code.
export const ALLOWED_SUBMISSION_FIELDS: ReadonlySet<string> = new Set([
  'title',
  'body',
  'category',
  'budget_note',
  'poster_x402',
  'poster_addr',
  'nonce',
  'signed_at',
  'signature',
]);

export const MAX_TITLE_LEN = 140;
export const MAX_BODY_LEN = 4000;
export const MAX_BUDGET_NOTE_LEN = 200;
export const MAX_NONCE_LEN = 128;
export const GIG_TTL_DAYS = 30;
export const MAX_SIGNED_AT_SKEW_SEC = 600; // 10 min, matches the claim flow
export const FUTURE_GRACE_SEC = 60;

const ADDR_RE = /^0x[0-9a-fA-F]{40}$/;

/**
 * Reject any key not in the allowlist. Run this BEFORE anything else, on
 * the raw parsed body. Extra fields are a hard fail, not a silent strip,
 * so a poster cannot smuggle a structured selection field past us.
 */
export function validateFieldAllowlist(
  raw: Record<string, unknown>,
): Validated<true> {
  for (const key of Object.keys(raw)) {
    if (!ALLOWED_SUBMISSION_FIELDS.has(key)) {
      return { ok: false, error: `field_not_allowed:${key}` };
    }
  }
  return { ok: true, value: true };
}

function isNonEmptyString(v: unknown): v is string {
  return typeof v === 'string' && v.trim().length > 0;
}

/**
 * Full submission validation. Returns a normalized GigSubmission or a
 * typed error string. `vocab` defaults to the shared ARB skill vocab so
 * the gig category taxonomy is never forked.
 */
export function validateGigSubmission(
  raw: Record<string, unknown>,
  vocab: ReadonlySet<string> = SKILLS_TAG_VOCAB,
): Validated<GigSubmission> {
  const allow = validateFieldAllowlist(raw);
  if (!allow.ok) return allow;

  if (!isNonEmptyString(raw.title)) return { ok: false, error: 'title_required' };
  if ((raw.title as string).length > MAX_TITLE_LEN) {
    return { ok: false, error: 'title_too_long' };
  }
  if (!isNonEmptyString(raw.body)) return { ok: false, error: 'body_required' };
  if ((raw.body as string).length > MAX_BODY_LEN) {
    return { ok: false, error: 'body_too_long' };
  }
  if (!isNonEmptyString(raw.category)) {
    return { ok: false, error: 'category_required' };
  }
  if (!vocab.has(raw.category as string)) {
    return { ok: false, error: 'category_not_in_vocab' };
  }
  const budget_note = raw.budget_note === undefined ? '' : raw.budget_note;
  if (typeof budget_note !== 'string') {
    return { ok: false, error: 'budget_note_type' };
  }
  if (budget_note.length > MAX_BUDGET_NOTE_LEN) {
    return { ok: false, error: 'budget_note_too_long' };
  }
  if (!isNonEmptyString(raw.poster_x402) || !/^https:\/\//.test(raw.poster_x402 as string)) {
    return { ok: false, error: 'poster_x402_invalid' };
  }
  if (!isNonEmptyString(raw.poster_addr) || !ADDR_RE.test(raw.poster_addr as string)) {
    return { ok: false, error: 'poster_addr_invalid' };
  }
  if (!isNonEmptyString(raw.nonce) || (raw.nonce as string).length > MAX_NONCE_LEN) {
    return { ok: false, error: 'nonce_invalid' };
  }
  if (
    typeof raw.signed_at !== 'number' ||
    !Number.isFinite(raw.signed_at) ||
    !Number.isInteger(raw.signed_at)
  ) {
    return { ok: false, error: 'signed_at_invalid' };
  }
  if (!isNonEmptyString(raw.signature)) {
    return { ok: false, error: 'signature_required' };
  }

  return {
    ok: true,
    value: {
      title: (raw.title as string).trim(),
      body: (raw.body as string).trim(),
      category: raw.category as string,
      budget_note: budget_note.trim(),
      poster_x402: (raw.poster_x402 as string).trim(),
      poster_addr: (raw.poster_addr as string).trim(),
      nonce: (raw.nonce as string).trim(),
      signed_at: raw.signed_at as number,
      signature: (raw.signature as string).trim(),
    },
  };
}

/**
 * The exact string the poster signs and TF retains. Uses the shared
 * canonicalJSON so both sides derive a byte-identical message regardless
 * of key order.
 */
export function buildSignedMessage(payload: GigSignedPayload): string {
  return canonicalJSON({
    title: payload.title,
    body: payload.body,
    category: payload.category,
    budget_note: payload.budget_note,
    poster_x402: payload.poster_x402,
    poster_addr: payload.poster_addr,
    nonce: payload.nonce,
    signed_at: payload.signed_at,
  });
}

/**
 * Replay / skew guard. Reject signatures dated meaningfully in the future
 * or older than the skew window. Nonce uniqueness is a stateful check in
 * the store layer; this is the time half only.
 */
export function validateSignedAt(
  nowSec: number,
  signedAt: number,
  maxSkewSec: number = MAX_SIGNED_AT_SKEW_SEC,
): Validated<true> {
  if (signedAt > nowSec + FUTURE_GRACE_SEC) {
    return { ok: false, error: 'signed_at_future' };
  }
  if (signedAt < nowSec - maxSkewSec) {
    return { ok: false, error: 'signed_at_stale' };
  }
  return { ok: true, value: true };
}

/**
 * Build the persisted record from a validated submission. Pure: id is
 * supplied by the caller so this stays deterministic under test.
 */
export function assembleGigRecord(
  sub: GigSubmission,
  nowSec: number,
  id: string,
): GigRecord {
  return {
    ...sub,
    id,
    status: 'active',
    signed_message: buildSignedMessage(sub),
    created_at: nowSec,
    expires_at: nowSec + GIG_TTL_DAYS * 86_400,
    removed_reason: null,
  };
}

/** Whether a record has passed its TTL and should read as expired. */
export function isExpired(record: GigRecord, nowSec: number): boolean {
  return nowSec >= record.expires_at;
}

/**
 * The public projection served by the read endpoints. Deliberately omits
 * signature, signed_message, nonce, and removed_reason: those are
 * internal audit artifacts, not part of the public listing contract.
 * status is the effective status (an aged-out active gig reads expired).
 */
export interface PublicGig {
  id: string;
  status: GigStatus;
  title: string;
  body: string;
  category: string;
  budget_note: string;
  poster_addr: string;
  poster_x402: string;
  created_at: number;
  expires_at: number;
}

export function toPublicGig(rec: GigRecord, nowSec: number): PublicGig {
  return {
    id: rec.id,
    status:
      rec.status === 'active' && isExpired(rec, nowSec)
        ? 'expired'
        : rec.status,
    title: rec.title,
    body: rec.body,
    category: rec.category,
    budget_note: rec.budget_note,
    poster_addr: rec.poster_addr,
    poster_x402: rec.poster_x402,
    created_at: rec.created_at,
    expires_at: rec.expires_at,
  };
}
