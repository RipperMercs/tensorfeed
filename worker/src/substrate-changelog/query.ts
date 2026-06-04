import type { Env } from '../types';
import { KV_CURSOR, KV_RECENT, KV_SPECS_SNAP, kvDay, MAX_HISTORY_DAYS } from './constants';
import type { SubstrateEvent, SubstrateEventType, SpecSnapshot } from './types';

// Shared agent-facing provenance for every substrate-changelog response. Both
// the free recent feed and the premium history describe the same derivation
// (TF's curated model catalog + deprecation registry, plus the public MCP /
// x402 / A2A spec repos), so attribution and license are uniform across the
// family for agent-contract consistency.
const CHANGELOG_ATTRIBUTION =
  'TensorFeed substrate changelog derived from its model catalog, deprecation registry, and the public MCP, x402, and A2A spec repositories';
const CHANGELOG_LICENSE = 'CC BY 4.0';

interface ChangelogCursor {
  last_run_at?: string;
  last_ok_at?: string;
}

// captured_at on every response is the feed's real freshness: the cursor's
// last_run_at, NOT the request clock. captureSubstrateChangelog advances
// last_run_at on every run (including a no-event run, since the snapshots and
// cursor are always written), so it marks the last moment the feed could have
// changed. Returns null when the feed has never run (cold cursor); the freshness
// layer treats a null captured_at as "fresh, metadata missing" rather than
// punishing billing.
async function readCursorCapturedAt(env: Env): Promise<string | null> {
  const c = (await env.TENSORFEED_CACHE.get(KV_CURSOR, 'json')) as ChangelogCursor | null;
  return c?.last_run_at ?? null;
}

// Public-facing current spec versions, stripped of the internal `sources` shape
// so the recent feed surfaces { mcp, x402, a2a } plus their source urls in one
// flat block.
export interface CurrentSpecs {
  mcp: string | null;
  x402: string | null;
  a2a: string | null;
  sources: { mcp: string | null; x402: string | null; a2a: string | null };
}

export interface RecentChangelogResult {
  count: number;
  events: SubstrateEvent[];
  current_specs: CurrentSpecs | null;
  captured_at: string | null;
  attribution: string;
  license: string;
}

export async function getRecentChangelog(env: Env, limit: number): Promise<RecentChangelogResult> {
  const clampedLimit = Math.min(Math.max(limit, 1), 50);
  const [raw, specs, capturedAt] = await Promise.all([
    env.TENSORFEED_CACHE.get(KV_RECENT, 'json') as Promise<SubstrateEvent[] | null>,
    env.TENSORFEED_CACHE.get(KV_SPECS_SNAP, 'json') as Promise<SpecSnapshot | null>,
    readCursorCapturedAt(env),
  ]);
  const events = (raw ?? []).slice(0, clampedLimit);
  return {
    count: events.length,
    events,
    current_specs: specs
      ? { mcp: specs.mcp, x402: specs.x402, a2a: specs.a2a, sources: specs.sources }
      : null,
    captured_at: capturedAt,
    attribution: CHANGELOG_ATTRIBUTION,
    license: CHANGELOG_LICENSE,
  };
}

// Inclusive YYYY-MM-DD enumeration, mirroring x402-index datesBetween: one KV
// read per day, so the caller must validateRange first to bound the fan-out.
export function datesBetween(from: string, to: string): string[] {
  const out: string[] = [];
  const start = new Date(from + 'T00:00:00.000Z');
  const end = new Date(to + 'T00:00:00.000Z');
  for (let d = new Date(start); d.getTime() <= end.getTime(); d.setUTCDate(d.getUTCDate() + 1)) {
    out.push(d.toISOString().slice(0, 10));
  }
  return out;
}

const RANGE_DATE_RE = /^\d{4}-\d{2}-\d{2}$/;

export interface RangeValidation {
  ok: boolean;
  error?: string;
  hint?: string;
  days?: number;
}

/**
 * Validate a from/to YYYY-MM-DD window before any per-day KV fan-out: both
 * well-formed real calendar dates, from on or before to, and the inclusive span
 * within maxDays. Returns a structured failure the handler turns into a
 * no-charge premiumValidationFailure, so a crafted wide range cannot burn the
 * KV budget. Mirrors x402-index/query.ts validateRange.
 */
export function validateRange(from: string, to: string, maxDays = MAX_HISTORY_DAYS): RangeValidation {
  if (!RANGE_DATE_RE.test(from) || !RANGE_DATE_RE.test(to)) {
    return { ok: false, error: 'invalid_date_format', hint: 'from and to must be YYYY-MM-DD.' };
  }
  const start = new Date(from + 'T00:00:00.000Z').getTime();
  const end = new Date(to + 'T00:00:00.000Z').getTime();
  if (!Number.isFinite(start) || !Number.isFinite(end)) {
    return { ok: false, error: 'invalid_date', hint: 'from and to must be real calendar dates in YYYY-MM-DD.' };
  }
  // Reject calendar-overflow dates (2026-02-30, 2026-04-31) that V8 silently
  // rolls over to the next month instead of rejecting; otherwise datesBetween
  // would start from a date the caller never asked for.
  if (new Date(start).toISOString().slice(0, 10) !== from || new Date(end).toISOString().slice(0, 10) !== to) {
    return { ok: false, error: 'invalid_date', hint: 'from and to must be real calendar dates in YYYY-MM-DD.' };
  }
  if (start > end) {
    return { ok: false, error: 'inverted_range', hint: 'from must be on or before to.' };
  }
  const days = Math.floor((end - start) / 86400000) + 1;
  if (days > maxDays) {
    return { ok: false, error: 'range_too_large', hint: `Window spans ${days} days; the max is ${maxDays}. Narrow the from/to range.`, days };
  }
  return { ok: true, days };
}

interface DayRollup {
  date: string;
  events: SubstrateEvent[];
}

export interface ChangelogHistoryResult {
  window: { from: string; to: string };
  count: number;
  events: SubstrateEvent[];
  event_type: SubstrateEventType | null;
  // has_data is true iff at least one day in the window has a stored rollup.
  // captureSubstrateChangelog only writes a day rollup when events land, so
  // rollup-presence is the clean boundary between "no events recorded in this
  // window" (no-charge empty_result) and a real measured result (billable).
  has_data: boolean;
  captured_at: string | null;
  attribution: string;
  license: string;
}

export async function getChangelogHistory(
  env: Env,
  from: string,
  to: string,
  eventType?: SubstrateEventType,
): Promise<ChangelogHistoryResult> {
  const dates = datesBetween(from, to);
  const [perDay, capturedAt] = await Promise.all([
    Promise.all(dates.map((d) => env.TENSORFEED_CACHE.get(kvDay(d), 'json') as Promise<DayRollup | null>)),
    readCursorCapturedAt(env),
  ]);

  let hasData = false;
  const events: SubstrateEvent[] = [];
  for (const rollup of perDay) {
    if (!rollup) continue;
    hasData = true;
    for (const e of rollup.events) {
      if (eventType && e.type !== eventType) continue;
      events.push(e);
    }
  }

  return {
    window: { from, to },
    count: events.length,
    events,
    event_type: eventType ?? null,
    has_data: hasData,
    captured_at: capturedAt,
    attribution: CHANGELOG_ATTRIBUTION,
    license: CHANGELOG_LICENSE,
  };
}
