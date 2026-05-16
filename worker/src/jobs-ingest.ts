/**
 * TensorFeed Jobs: M2 ingest half of the recursive data flywheel.
 *
 * M1 (jobs-submissions.ts + jobs-store.ts) is the intake half: an agent
 * submits cited fact rows against a TF-funded gig and an admin records
 * an accept/reject decision. M1's boundary was "the decision is recorded
 * and nothing else happens to the data."
 *
 * M2 closes the loop: when an admin ACCEPTS a submission, its validated
 * PricingRows are published into a provenance-tagged, append-only feed
 * that TF serves. That turns "we judged this data good" into "this data
 * is a queryable TF product," which is the north star (a gig manufactures
 * a free data feed).
 *
 * DELIBERATE SCOPE, inheriting every M1 constraint:
 *   - No Worker SSRF. This module never fetches source_url or anything
 *     else. It only ever persists rows that were validated at intake and
 *     adjudicated out-of-band by a human admin.
 *   - No money path. Payout stays manual and per-action, exactly as M1.
 *     Auto-ingest-on-accept is still "per-action explicit" because a
 *     human admin explicitly accepts each submission; the accept IS the
 *     gate.
 *   - Provenance-distinct, not canonical-touching. This is an
 *     agent-sourced observations feed with its own KV namespace. It does
 *     NOT mutate TF's canonical model/pricing dataset. Promotion into
 *     canonical, if ever, is a later milestone, not M2.
 *   - Same KV discipline as jobs-store.ts: safePut so the kill switch
 *     governs writes, resilient text+try/catch reads so one bad record
 *     cannot bomb the feed, a bounded prefix scan.
 *   - Idempotent. The ingest record is keyed by submission id, so the
 *     same accepted submission always writes the same record. A retry
 *     after a partial decide converges instead of duplicating.
 */

import type { Env } from './types';
import { safePut } from './kill-switch';
import type { PricingRow, SubmissionRecord } from './jobs-submissions';

export const INGEST_KEY_PREFIX = 'gigfeed:pricing:sub:';

// Same v0 bound as jobs-store's MAX_LIST_PAGES. Low-volume feed; refuse
// to walk an unbounded number of KV list pages on a read. Kept local so
// this module's backing store stays swappable without cross-coupling.
const MAX_INGEST_LIST_PAGES = 20;

/**
 * One accepted submission's contribution to the feed. Keyed by
 * submission id. rows are the exact validated PricingRows (each already
 * carries its own primary-source source_url); the wrapper adds the
 * provenance an agent or auditor needs to trust and trace a row.
 */
export interface IngestRecord {
  submission_id: string;
  gig_id: string;
  submitter_addr: string;
  accepted_at: number; // unix seconds, the admin accept time
  rows: PricingRow[];
}

/** A single feed row: the pricing fact plus its provenance, flattened. */
export interface FeedObservation extends PricingRow {
  submission_id: string;
  gig_id: string;
  submitter_addr: string;
  accepted_at: number;
}

export interface FeedSummary {
  total_observations: number;
  distinct_models: number;
  distinct_vendors: number;
  latest_accepted_at: number | null;
}

export interface ModelPricingFeed {
  /** Append-only, newest accepted first. */
  observations: FeedObservation[];
  /** Most recent observation per (model, vendor). */
  latest: FeedObservation[];
  summary: FeedSummary;
}

export interface FeedProjectionOpts {
  /** Cap on returned observations after sort. */
  limit?: number;
  /** Case-insensitive exact match filters. */
  model?: string;
  vendor?: string;
}

export function ingestKey(submissionId: string): string {
  return INGEST_KEY_PREFIX + submissionId;
}

/**
 * Pure: build the ingest record from an accepted submission. id and
 * acceptedAt are caller-supplied so this stays deterministic under test,
 * the same discipline as assembleSubmissionRecord.
 */
export function assembleIngestRecord(
  rec: SubmissionRecord,
  acceptedAtSec: number,
): IngestRecord {
  return {
    submission_id: rec.id,
    gig_id: rec.gig_id,
    submitter_addr: rec.submitter_addr,
    accepted_at: acceptedAtSec,
    // Copy the rows so a later mutation of rec cannot reach into the
    // persisted feed record.
    rows: rec.rows.map((r) => ({ ...r, modalities: r.modalities.slice() })),
  };
}

/**
 * Persist an accepted submission's rows into the feed. Returns false if
 * the write was blocked by the KV kill switch. Callers MUST treat false
 * as a hard failure and refuse to mark the submission accepted
 * (fail-closed), so the feed and the decision never disagree.
 * Idempotent: keyed by submission id.
 */
export async function ingestAcceptedSubmission(
  env: Env,
  rec: SubmissionRecord,
  acceptedAtSec: number,
): Promise<boolean> {
  const ing = assembleIngestRecord(rec, acceptedAtSec);
  return safePut(
    env,
    env.TENSORFEED_CACHE,
    ingestKey(ing.submission_id),
    JSON.stringify(ing),
  );
}

/** Resilient single read. Malformed record reads as absent, logged. */
export async function getIngest(
  env: Env,
  submissionId: string,
): Promise<IngestRecord | null> {
  const raw = await env.TENSORFEED_CACHE.get(ingestKey(submissionId), 'text');
  if (!raw) return null;
  try {
    return JSON.parse(raw) as IngestRecord;
  } catch {
    console.log(
      JSON.stringify({
        event: 'gigfeed_bad_record',
        key: ingestKey(submissionId),
        len: raw.length,
        preview: raw.slice(0, 80),
      }),
    );
    return null;
  }
}

/**
 * Scan every ingest record by prefix. Bounded by MAX_INGEST_LIST_PAGES
 * like jobs-store's listSubmissions: an append-only low-volume feed, not
 * a hot per-request hot path (the read endpoint should sit behind the
 * normal edge cache).
 */
export async function listIngest(env: Env): Promise<IngestRecord[]> {
  const out: IngestRecord[] = [];
  let cursor: string | undefined;
  let pages = 0;

  do {
    const page = await env.TENSORFEED_CACHE.list({
      prefix: INGEST_KEY_PREFIX,
      cursor,
    });
    pages += 1;
    for (const k of page.keys) {
      const id = k.name.slice(INGEST_KEY_PREFIX.length);
      const rec = await getIngest(env, id);
      if (!rec) continue;
      out.push(rec);
    }
    cursor = page.list_complete ? undefined : page.cursor;
  } while (cursor && pages < MAX_INGEST_LIST_PAGES);

  return out;
}

// Exact, case-insensitive (model, vendor) identity. The intake
// validators store clean, non-mutated strings, so an exact normalized
// compare is unambiguous and cannot accidentally merge two vendors.
function latestKey(model: string, vendor: string): string {
  return model.toLowerCase() + '␟' + vendor.toLowerCase();
}

/**
 * Pure: flatten ingest records to a sorted observations feed plus a
 * latest-per-(model,vendor) view and a summary. No env, no IO, fully
 * unit-testable.
 *
 * Ordering: observations newest first by accepted_at, tie-broken by
 * effective_date, both descending, so the most recently adjudicated and
 * most recently effective fact is first. `latest` picks, per
 * (model,vendor), the row with the newest effective_date, tie-broken by
 * newest accepted_at.
 */
export function projectModelPricingFeed(
  records: ReadonlyArray<IngestRecord>,
  opts: FeedProjectionOpts = {},
): ModelPricingFeed {
  const wantModel = opts.model ? opts.model.toLowerCase() : null;
  const wantVendor = opts.vendor ? opts.vendor.toLowerCase() : null;

  const flat: FeedObservation[] = [];
  for (const rec of records) {
    for (const row of rec.rows) {
      if (wantModel && row.model.toLowerCase() !== wantModel) continue;
      if (wantVendor && row.vendor.toLowerCase() !== wantVendor) continue;
      flat.push({
        ...row,
        modalities: row.modalities.slice(),
        submission_id: rec.submission_id,
        gig_id: rec.gig_id,
        submitter_addr: rec.submitter_addr,
        accepted_at: rec.accepted_at,
      });
    }
  }

  flat.sort((a, b) => {
    if (b.accepted_at !== a.accepted_at) return b.accepted_at - a.accepted_at;
    return b.effective_date < a.effective_date
      ? -1
      : b.effective_date > a.effective_date
        ? 1
        : 0;
  });

  const latestMap = new Map<string, FeedObservation>();
  for (const o of flat) {
    const key = latestKey(o.model, o.vendor);
    const cur = latestMap.get(key);
    if (
      !cur ||
      o.effective_date > cur.effective_date ||
      (o.effective_date === cur.effective_date &&
        o.accepted_at > cur.accepted_at)
    ) {
      latestMap.set(key, o);
    }
  }
  const latest = [...latestMap.values()].sort((a, b) => {
    if (b.accepted_at !== a.accepted_at) return b.accepted_at - a.accepted_at;
    return b.effective_date < a.effective_date
      ? -1
      : b.effective_date > a.effective_date
        ? 1
        : 0;
  });

  const summary: FeedSummary = {
    total_observations: flat.length,
    distinct_models: new Set(flat.map((o) => o.model.toLowerCase())).size,
    distinct_vendors: new Set(flat.map((o) => o.vendor.toLowerCase())).size,
    latest_accepted_at: flat.length
      ? flat.reduce((m, o) => (o.accepted_at > m ? o.accepted_at : m), 0)
      : null,
  };

  const limit =
    opts.limit !== undefined && Number.isFinite(opts.limit)
      ? Math.max(0, Math.floor(opts.limit))
      : flat.length;

  return {
    observations: flat.slice(0, limit),
    latest,
    summary,
  };
}
