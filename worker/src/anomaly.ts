import { Env } from './types';

/**
 * Per-token spend anomaly detection.
 *
 * The circuit breaker (worker/src/circuit-breaker.ts) catches
 * fast-and-obvious abuse: 100+ varied requests in a single minute
 * trips a 5-minute cooldown. The daily spend cap (worker/src/spend-cap.ts)
 * caps a token's max credits per UTC day when the owner opts in. This
 * module fills the gap between them: passive, baseline-relative
 * detection that flags tokens whose hourly burn rate is unusual
 * compared to their own recent history. Catches a leaked token
 * pacing under the burn-rate breaker and outside the daily cap (or
 * with no cap configured).
 *
 * Approach
 * --------
 * Every successful credit debit increments the token's current-hour
 * bucket in a rolling 7-day buffer (168 hourly entries). On each
 * write, if the current bucket exceeds a multiplier * baseline-median
 * AND a credit floor, an anomaly event is appended to a global
 * ring buffer. We dedupe on (token, hour) so a single anomalous hour
 * fires exactly one event.
 *
 * Two thresholds:
 *   - WARNING:   current >= 5x baseline median, AND >= 20 credits
 *   - CRITICAL:  current >= 10x baseline median, AND >= 50 credits
 *
 * Both require >= 24h of buffer data for a baseline; brand-new
 * tokens are exempt until they accumulate history.
 *
 * KV layout (TENSORFEED_CACHE):
 *   pay:hourly:{token}       -> HourlyBuffer (cap 168 entries, no TTL)
 *   pay:anomaly:events       -> AnomalyEvent[] ring buffer (cap 200, no TTL)
 *
 * Surfaced via admin endpoint `/api/admin/anomalies?key=<ADMIN_KEY>`.
 *
 * Privacy: events log a non-secret 16-char prefix of the token, never
 * the full bearer.
 */

const MAX_BUCKETS = 168; // 7 days * 24 hours
const MIN_BUCKETS_FOR_BASELINE = 24; // require 24h of history before flagging
const EVENTS_CAP = 200;

const HOURLY_KEY_PREFIX = 'pay:hourly:';
const EVENTS_KEY = 'pay:anomaly:events';

const WARNING_MULTIPLIER = 5;
const WARNING_FLOOR_CREDITS = 20;
const CRITICAL_MULTIPLIER = 10;
const CRITICAL_FLOOR_CREDITS = 50;

export type AnomalySeverity = 'warning' | 'critical';

export interface HourlyBucket {
  hour: string;       // ISO 8601 hour boundary, e.g. "2026-05-04T14:00:00.000Z"
  credits: number;
  calls: number;
}

export interface HourlyBuffer {
  buckets: HourlyBucket[];      // sorted oldest -> newest
  last_flagged_hour?: string;   // ISO hour string of the most recent flag, dedup guard
}

export interface AnomalyEvent {
  detected_at: string;          // ISO 8601 timestamp
  token_short: string;          // first 16 chars of bearer + ellipsis
  hour: string;                 // ISO hour boundary
  severity: AnomalySeverity;
  current_credits: number;
  baseline_median: number;
  multiplier_observed: number;  // current / max(baseline, 1)
  buckets_in_baseline: number;
}

const hourlyKey = (token: string): string => `${HOURLY_KEY_PREFIX}${token}`;

export function currentHourISO(now: Date = new Date()): string {
  const h = new Date(Date.UTC(
    now.getUTCFullYear(),
    now.getUTCMonth(),
    now.getUTCDate(),
    now.getUTCHours(),
    0, 0, 0,
  ));
  return h.toISOString();
}

export function tokenShort(token: string): string {
  return token.slice(0, 16) + '...';
}

/**
 * Pure: insert a new debit into the hourly buffer (or merge into the
 * current hour bucket). Trims to MAX_BUCKETS, oldest first. Does not
 * compute anomaly status - that is a separate function so the hot
 * path can decide independently of the buffer mutation.
 */
export function applyDebit(
  buffer: HourlyBuffer,
  credits: number,
  now: Date = new Date(),
): HourlyBuffer {
  const hour = currentHourISO(now);
  const buckets = [...buffer.buckets];
  const last = buckets[buckets.length - 1];
  if (last && last.hour === hour) {
    last.credits += credits;
    last.calls += 1;
  } else {
    buckets.push({ hour, credits, calls: 1 });
  }
  if (buckets.length > MAX_BUCKETS) {
    buckets.splice(0, buckets.length - MAX_BUCKETS);
  }
  return { ...buffer, buckets };
}

function median(values: number[]): number {
  if (values.length === 0) return 0;
  const sorted = [...values].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  if (sorted.length % 2 === 0) {
    return (sorted[mid - 1] + sorted[mid]) / 2;
  }
  return sorted[mid];
}

export interface AnomalyAssessment {
  flagged: boolean;
  severity: AnomalySeverity | null;
  current_credits: number;
  baseline_median: number;
  multiplier_observed: number;
  buckets_in_baseline: number;
  reason: 'no_baseline' | 'within_baseline' | 'warning' | 'critical';
}

/**
 * Pure: compare the latest bucket against the median of all earlier
 * buckets. Returns flagged=true only when both the multiplier and the
 * absolute floor are met. Tokens with insufficient history (<24h)
 * return reason=no_baseline.
 */
export function assess(buffer: HourlyBuffer, now: Date = new Date()): AnomalyAssessment {
  const buckets = buffer.buckets;
  const hour = currentHourISO(now);
  const current = buckets[buckets.length - 1];
  const currentCredits = current?.hour === hour ? current.credits : 0;

  // Buckets BEFORE the current hour form the baseline.
  const earlier = buckets.filter(b => b.hour !== hour);
  if (earlier.length < MIN_BUCKETS_FOR_BASELINE) {
    return {
      flagged: false,
      severity: null,
      current_credits: currentCredits,
      baseline_median: 0,
      multiplier_observed: 0,
      buckets_in_baseline: earlier.length,
      reason: 'no_baseline',
    };
  }

  const baselineMedian = median(earlier.map(b => b.credits));
  const denom = Math.max(baselineMedian, 1);
  const multiplier = currentCredits / denom;

  if (currentCredits >= CRITICAL_FLOOR_CREDITS && multiplier >= CRITICAL_MULTIPLIER) {
    return {
      flagged: true,
      severity: 'critical',
      current_credits: currentCredits,
      baseline_median: baselineMedian,
      multiplier_observed: multiplier,
      buckets_in_baseline: earlier.length,
      reason: 'critical',
    };
  }
  if (currentCredits >= WARNING_FLOOR_CREDITS && multiplier >= WARNING_MULTIPLIER) {
    return {
      flagged: true,
      severity: 'warning',
      current_credits: currentCredits,
      baseline_median: baselineMedian,
      multiplier_observed: multiplier,
      buckets_in_baseline: earlier.length,
      reason: 'warning',
    };
  }
  return {
    flagged: false,
    severity: null,
    current_credits: currentCredits,
    baseline_median: baselineMedian,
    multiplier_observed: multiplier,
    buckets_in_baseline: earlier.length,
    reason: 'within_baseline',
  };
}

// ── KV layer ────────────────────────────────────────────────────────

async function readBuffer(env: Env, token: string): Promise<HourlyBuffer> {
  const raw = (await env.TENSORFEED_CACHE.get(hourlyKey(token), 'json')) as HourlyBuffer | null;
  return raw && Array.isArray(raw.buckets) ? raw : { buckets: [] };
}

async function writeBuffer(env: Env, token: string, buffer: HourlyBuffer): Promise<void> {
  await env.TENSORFEED_CACHE.put(hourlyKey(token), JSON.stringify(buffer));
}

async function readEvents(env: Env): Promise<AnomalyEvent[]> {
  const raw = (await env.TENSORFEED_CACHE.get(EVENTS_KEY, 'json')) as AnomalyEvent[] | null;
  return Array.isArray(raw) ? raw : [];
}

async function appendEvent(env: Env, event: AnomalyEvent): Promise<void> {
  const events = await readEvents(env);
  events.push(event);
  if (events.length > EVENTS_CAP) {
    events.splice(0, events.length - EVENTS_CAP);
  }
  await env.TENSORFEED_CACHE.put(EVENTS_KEY, JSON.stringify(events));
}

/**
 * Hot-path entry: called from commitPayment after a successful debit.
 * Reads the buffer, applies the debit, runs the assessment, and if
 * flagged AND not already flagged this hour, appends an event. Always
 * persists the updated buffer. Errors propagate to the caller, which
 * wraps in try/catch so anomaly machinery can never fail a request.
 */
export async function recordAndAssess(
  env: Env,
  token: string,
  credits: number,
  now: Date = new Date(),
): Promise<AnomalyAssessment> {
  if (credits <= 0) {
    return {
      flagged: false,
      severity: null,
      current_credits: 0,
      baseline_median: 0,
      multiplier_observed: 0,
      buckets_in_baseline: 0,
      reason: 'within_baseline',
    };
  }
  const before = await readBuffer(env, token);
  const after = applyDebit(before, credits, now);
  const result = assess(after, now);
  const hour = currentHourISO(now);

  if (result.flagged && after.last_flagged_hour !== hour) {
    after.last_flagged_hour = hour;
    await appendEvent(env, {
      detected_at: now.toISOString(),
      token_short: tokenShort(token),
      hour,
      severity: result.severity!,
      current_credits: result.current_credits,
      baseline_median: result.baseline_median,
      multiplier_observed: Number(result.multiplier_observed.toFixed(2)),
      buckets_in_baseline: result.buckets_in_baseline,
    });
  }

  await writeBuffer(env, token, after);
  return result;
}

export async function listAnomalyEvents(env: Env): Promise<AnomalyEvent[]> {
  return readEvents(env);
}

export const ANOMALY_LIMITS = {
  MAX_BUCKETS,
  MIN_BUCKETS_FOR_BASELINE,
  EVENTS_CAP,
  WARNING_MULTIPLIER,
  WARNING_FLOOR_CREDITS,
  CRITICAL_MULTIPLIER,
  CRITICAL_FLOOR_CREDITS,
};
