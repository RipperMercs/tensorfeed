/**
 * TensorFeed Jobs: storage layer.
 *
 * The deferred second half of build step 1 (the validators shipped
 * separately as jobs.ts). This is the prerequisite for the step 3 read
 * endpoints. Still no money path here.
 *
 * Storage choice, a deliberate reversal of the spec's "D1": for v0
 * volume the disciplined choice is the audited KV pattern the ARB store
 * already uses (env.TENSORFEED_CACHE, prefixed keys, safePut so the kill
 * switch governs writes, prefix-list with cursor, nonce-with-TTL). This
 * adds ZERO new infra or bindings and reuses a pattern that has been in
 * production. D1 stays a clean future migration if query or volume needs
 * ever demand it; everything here is behind this module so the backing
 * store is swappable without touching callers.
 *
 * Reads use the resilient text+try/catch pattern, not get(key,'json'),
 * per the ARB lesson: a single malformed record must not bomb a hot
 * read path.
 */

import type { Env } from './types';
import { safePut } from './kill-switch';
import { isExpired, type GigRecord, type GigStatus } from './jobs';
import type {
  SubmissionRecord,
  SubmissionStatus,
} from './jobs-submissions';

export const GIG_KEY_PREFIX = 'jobs:gig:';
export const NONCE_KEY_PREFIX = 'jobs:nonce:';
export const SUBMISSION_KEY_PREFIX = 'jobs:sub:';

// A nonce only has to outlive the signature-validity window. signed_at
// older than MAX_SIGNED_AT_SKEW_SEC (600s) is already rejected by
// jobs.validateSignedAt, so 900s of nonce memory fully covers replay
// while bounding KV footprint.
export const NONCE_TTL_SEC = 900;

// v0 safety bound on a prefix scan. Low-volume board; refuse to walk an
// unbounded number of pages on a read.
const MAX_LIST_PAGES = 20;

export function gigKey(id: string): string {
  return GIG_KEY_PREFIX + id;
}

/**
 * Persist a gig. Returns false if the write did not happen because the
 * KV kill switch is active. Callers MUST treat false as a hard failure
 * and reject the post (fail-closed), never report success on a dropped
 * write.
 */
export async function putGig(env: Env, rec: GigRecord): Promise<boolean> {
  return safePut(
    env,
    env.TENSORFEED_CACHE,
    gigKey(rec.id),
    JSON.stringify(rec),
  );
}

/** Resilient single read. Malformed record reads as absent, logged. */
export async function getGig(
  env: Env,
  id: string,
): Promise<GigRecord | null> {
  const raw = await env.TENSORFEED_CACHE.get(gigKey(id), 'text');
  if (!raw) return null;
  try {
    return JSON.parse(raw) as GigRecord;
  } catch {
    console.log(
      JSON.stringify({
        event: 'jobs_bad_record',
        key: gigKey(id),
        len: raw.length,
        preview: raw.slice(0, 80),
      }),
    );
    return null;
  }
}

export interface ListGigsOpts {
  now: number;
  limit: number;
  /** Defaults to active-only. Pass a status to filter exactly. */
  status?: GigStatus;
  category?: string;
  /** Case-insensitive substring over title + body. */
  q?: string;
}

/**
 * Effective status: an 'active' record past its TTL reads as 'expired'
 * without needing a write. All other stored statuses are authoritative.
 */
export function effectiveStatus(rec: GigRecord, now: number): GigStatus {
  if (rec.status === 'active' && isExpired(rec, now)) return 'expired';
  return rec.status;
}

/**
 * List gigs by prefix scan. Default surface is active + unexpired,
 * newest first, capped at `limit`. Filtering is exact-category and
 * case-insensitive substring only: no structured selection, consistent
 * with the Roommates discipline.
 */
export async function listGigs(
  env: Env,
  opts: ListGigsOpts,
): Promise<GigRecord[]> {
  const wantStatus: GigStatus = opts.status ?? 'active';
  const q = opts.q ? opts.q.trim().toLowerCase() : '';
  const out: GigRecord[] = [];
  let cursor: string | undefined;
  let pages = 0;

  do {
    const page = await env.TENSORFEED_CACHE.list({
      prefix: GIG_KEY_PREFIX,
      cursor,
    });
    pages += 1;
    for (const k of page.keys) {
      const id = k.name.slice(GIG_KEY_PREFIX.length);
      const rec = await getGig(env, id);
      if (!rec) continue;
      if (effectiveStatus(rec, opts.now) !== wantStatus) continue;
      if (opts.category && rec.category !== opts.category) continue;
      if (q) {
        const hay = (rec.title + ' ' + rec.body).toLowerCase();
        if (!hay.includes(q)) continue;
      }
      out.push(rec);
    }
    cursor = page.list_complete ? undefined : page.cursor;
  } while (cursor && pages < MAX_LIST_PAGES);

  out.sort((a, b) => b.created_at - a.created_at);
  return out.slice(0, Math.max(0, opts.limit));
}

/**
 * Reserve a nonce for replay protection. Returns true only if the nonce
 * was unseen AND the reservation write succeeded (kill switch off).
 * Returns false on a seen nonce (replay) or a blocked write (fail
 * closed). KV has no compare-and-set, so a sub-second double-submit
 * race is theoretically possible; the signed_at window plus the x402
 * fee bound that to a non-issue at v0. Documented, not ignored.
 */
export async function reserveNonce(
  env: Env,
  nonce: string,
): Promise<boolean> {
  const key = NONCE_KEY_PREFIX + nonce;
  const seen = await env.TENSORFEED_CACHE.get(key, 'text');
  if (seen) return false;
  return safePut(env, env.TENSORFEED_CACHE, key, '1', {
    expirationTtl: NONCE_TTL_SEC,
  });
}

/**
 * Mutate a gig's status (close, fill, admin removal). Returns false if
 * the gig does not exist or the write was blocked.
 */
export async function setGigStatus(
  env: Env,
  id: string,
  status: GigStatus,
  removedReason: string | null = null,
): Promise<boolean> {
  const rec = await getGig(env, id);
  if (!rec) return false;
  const next: GigRecord = {
    ...rec,
    status,
    removed_reason: status === 'removed' ? removedReason : rec.removed_reason,
  };
  return putGig(env, next);
}

// === Deliverable submissions (M1 of the cold-start gig flywheel) ===
// Same KV discipline as gigs: safePut so the kill switch governs every
// write, resilient text reads so one bad record cannot bomb a list, and
// a bounded prefix scan. No money path here. The nonce replay guard is
// the shared reserveNonce above (one global nonce space).

export function subKey(id: string): string {
  return SUBMISSION_KEY_PREFIX + id;
}

/**
 * Persist a submission. Returns false if the write was blocked by the
 * KV kill switch. Callers MUST treat false as a hard failure and reject
 * the submission (fail-closed), never report success on a dropped write.
 */
export async function putSubmission(
  env: Env,
  rec: SubmissionRecord,
): Promise<boolean> {
  return safePut(
    env,
    env.TENSORFEED_CACHE,
    subKey(rec.id),
    JSON.stringify(rec),
  );
}

/** Resilient single read. Malformed record reads as absent, logged. */
export async function getSubmission(
  env: Env,
  id: string,
): Promise<SubmissionRecord | null> {
  const raw = await env.TENSORFEED_CACHE.get(subKey(id), 'text');
  if (!raw) return null;
  try {
    return JSON.parse(raw) as SubmissionRecord;
  } catch {
    console.log(
      JSON.stringify({
        event: 'jobs_sub_bad_record',
        key: subKey(id),
        len: raw.length,
        preview: raw.slice(0, 80),
      }),
    );
    return null;
  }
}

export interface ListSubmissionsOpts {
  limit: number;
  /** Filter to one gig's submissions. */
  gig_id?: string;
  /** Filter to one status. Defaults to all. */
  status?: SubmissionStatus;
}

/**
 * List submissions by prefix scan, newest first, capped at `limit`.
 * Bounded by MAX_LIST_PAGES like listGigs: this is an admin review
 * surface on a low-volume board, not a hot public path.
 */
export async function listSubmissions(
  env: Env,
  opts: ListSubmissionsOpts,
): Promise<SubmissionRecord[]> {
  const out: SubmissionRecord[] = [];
  let cursor: string | undefined;
  let pages = 0;

  do {
    const page = await env.TENSORFEED_CACHE.list({
      prefix: SUBMISSION_KEY_PREFIX,
      cursor,
    });
    pages += 1;
    for (const k of page.keys) {
      const id = k.name.slice(SUBMISSION_KEY_PREFIX.length);
      const rec = await getSubmission(env, id);
      if (!rec) continue;
      if (opts.gig_id && rec.gig_id !== opts.gig_id) continue;
      if (opts.status && rec.status !== opts.status) continue;
      out.push(rec);
    }
    cursor = page.list_complete ? undefined : page.cursor;
  } while (cursor && pages < MAX_LIST_PAGES);

  out.sort((a, b) => b.created_at - a.created_at);
  return out.slice(0, Math.max(0, opts.limit));
}

/**
 * Record an accept/reject decision. This function ONLY records the
 * decision; it never pays and never ingests. As of M2 the decide route
 * (index.ts) calls jobs-ingest BEFORE this, fail-closed, so an accepted
 * submission's rows are published to /api/feeds/model-pricing. PAYOUT
 * stays manual and per-action, never an autonomous Worker action.
 * Returns false if the submission does not exist, is already decided,
 * or the write was blocked.
 */
export async function setSubmissionDecision(
  env: Env,
  id: string,
  status: Extract<SubmissionStatus, 'accepted' | 'rejected'>,
  note: string,
  nowSec: number,
): Promise<boolean> {
  const rec = await getSubmission(env, id);
  if (!rec) return false;
  if (rec.status !== 'pending') return false;
  const next: SubmissionRecord = {
    ...rec,
    status,
    decided_at: nowSec,
    decision_note: note,
  };
  return putSubmission(env, next);
}
