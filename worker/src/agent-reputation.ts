/**
 * Agent Reputation Bureau: schema + pure metric calculators.
 *
 * v0 Week 1, step 1 of the spec at
 * C:\Users\rippe\Desktop\tensorfeed-agent-rep-bureau-spec.md.
 *
 * This module is deliberately KV-free. Every export is a pure function
 * or a type definition. The I/O layer (read pay:credits / pay:tx /
 * pay:usage and assemble AgentTelemetry inputs, write reputation cards)
 * lives separately in worker/src/agent-reputation-store.ts (step 3).
 *
 * Why pure functions: this is the math the public scoring contract
 * depends on. Easy to unit-test, easy to audit, easy to reason about
 * under concurrent ranking. No env access, no fetch, no Date.now()
 * inside the calculators (callers pass "now" in).
 *
 * Per spec section "Cadence: slow+verify, NOT fast+ship", every
 * calculator below ships with a corresponding test in
 * agent-reputation.test.ts.
 */

// === Trust grade ===
//
// Separate from rank. Lets consumers see "rank 5 agent with grade D"
// and treat appropriately. Boundaries are per spec:
//   A: wallet age >= 90d AND paid_calls >= 100 AND verified claim AND zero flags
//   B: wallet age >= 30d AND paid_calls >= 20 AND zero red flags
//   C: wallet age >= 7d AND verified claim OR paid_calls >= 5
//   D: wallet age < 7d OR no paid calls
//   F: banned OR ofac_clean=false OR multiple sustained flags

export type TrustGrade = 'A' | 'B' | 'C' | 'D' | 'F';

// === Public flag vocabulary ===
//
// Closed set. Adding a new flag is a breaking change to the public
// reputation card contract and must be documented on /developers.

export type ReputationFlag =
  | 'new_wallet'
  | 'spend_spike'
  | 'claim_disputed'
  | 'no_paid_calls'
  | 'low_endpoint_diversity'
  | 'high_error_rate';

// === Composite score weights ===
//
// Per spec: reliability 0.4 + activity 0.3 + spend 0.2 + streak 0.1.
// Tunable, but must always sum to 1. The COMPOSITE_WEIGHTS_FROZEN
// flag is what the v0 launch ships with; if/when we retune, bump the
// `version` field on the reputation meta so consumers know.

export interface CompositeWeights {
  reliability: number;
  activity: number;
  spend: number;
  streak: number;
}

export const COMPOSITE_WEIGHTS_FROZEN: CompositeWeights = {
  reliability: 0.4,
  activity: 0.3,
  spend: 0.2,
  streak: 0.1,
};

/**
 * Paid:free credit weight in the spend dimension. Sybil resistance
 * lever: 100 zero-balance sock puppets each get 100 free-trial calls
 * weighted as 100; one wallet that actually paid for 100 calls weighs
 * 500. Attackers must spend USDC to climb. Per spec section
 * "Heavy spend weighting".
 */
export const PAID_FREE_RATIO = 5;

/** Wallet-age guard. Per spec trust grade D. */
export const NEW_WALLET_AGE_DAYS = 7;

/** Spend-spike flag: current daily spend >= this multiple of rolling-30d avg. */
export const SPEND_SPIKE_MULTIPLIER = 5;

/** Below this many distinct endpoints, flag low_endpoint_diversity. */
export const MIN_ENDPOINT_DIVERSITY = 3;

/** 4xx-error rate above this fraction of total calls flags high_error_rate. */
export const HIGH_ERROR_RATE_THRESHOLD = 0.2;

// === Input shape (what the I/O layer assembles per agent) ===

/**
 * Per-agent telemetry input for the pure metric calculators. Indexed
 * by either token (bearer-only agents) or wallet (operator-claimed
 * agents). The store layer is responsible for joining pay:tx records
 * into a single AgentTelemetry per wallet when an operator claim
 * binds multiple tokens to one EOA.
 *
 * All dates are ISO 8601 UTC strings.
 */
export interface AgentTelemetry {
  /** Token prefix (first 16 chars of tf_live_...) or null for wallet-only. */
  token_prefix: string | null;
  /** EIP-55 checksummed wallet, or null for token-only agents. */
  wallet: string | null;
  /** First time TF saw this agent (UTC ISO). */
  first_seen: string;
  /** Most recent call (UTC ISO). */
  last_active: string;
  /** All UTC dates (YYYY-MM-DD) on which the agent made at least one call. */
  active_dates: string[];
  /** Endpoints called (distinct paths). */
  endpoints_used: string[];
  /** Calls that returned 2xx. */
  successful_calls: number;
  /** Calls that returned 4xx. Counts against the agent. */
  errors_4xx: number;
  /** Calls that returned 5xx. Does NOT count against the agent (system fault). */
  errors_5xx: number;
  /** Calls that consumed credits (paid). */
  paid_calls: number;
  /** Calls that were no-charge (free-trial, AFTA federation-internal, etc). */
  free_trial_calls: number;
  /** AFTA-signed receipts emitted. */
  receipts_signed: number;
  /** Total credits debited across paid_calls. */
  total_credits_spent: number;
  /** Total credits ever purchased (for context, not scoring). */
  total_credits_purchased: number;
  /** Daily-spend ring buffer (YYYY-MM-DD -> credits) for spend-spike detection. */
  daily_spend_30d: Record<string, number>;
}

// === Output shape ===

export interface RankEntry {
  rank: number;
  total: number;
  /** Percentile from 0 to 100. Lower rank number = higher percentile. */
  pct: number;
}

export interface ReputationMetrics {
  total_calls: number;
  successful_calls: number;
  reliability_pct: number;
  total_premium_calls: number;
  total_credits_spent: number;
  receipts_signed: number;
  active_days: number;
  current_streak_days: number;
  longest_streak_days: number;
  unique_endpoints_used: number;
  errors_4xx: number;
  errors_5xx: number;
  free_trial_calls: number;
  paid_calls: number;
  wallet_age_days: number;
}

export interface ReputationRanks {
  reliability: RankEntry;
  spend: RankEntry;
  activity: RankEntry;
  streak: RankEntry;
  composite: RankEntry;
}

export interface ReputationCard {
  ok: true;
  wallet: string | null;
  token_prefix: string | null;
  display_name: string | null;
  operator_url: string | null;
  verified: boolean;
  ofac_clean: boolean;
  banned: boolean;
  ban_reason: string | null;
  trust_grade: TrustGrade;
  flags: ReputationFlag[];
  first_seen: string;
  last_active: string;
  wallet_age_days: number;
  metrics: ReputationMetrics;
  ranks: ReputationRanks;
  attribution: {
    source: string;
    derivation: string;
    license: string;
    compliance: string;
  };
}

export const STANDARD_ATTRIBUTION: ReputationCard['attribution'] = {
  source: 'TensorFeed.ai agent telemetry (MCP tool calls + AFTA receipts + payment events)',
  derivation:
    "Reputation derived from TF's own observable interactions only. No third-party data, no scraping. Operator can claim or contest via signed message.",
  license: 'Public reputation data; aggregate-only; no PII unless operator opts in via claim.',
  compliance:
    'Wallet claims screened via Chainalysis OFAC oracle. Sanctioned wallets are auto-banned.',
};

// === Helpers ===

const MS_PER_DAY = 86_400_000;

/** Date diff in whole UTC days. Returns 0 if `then` is after `now`. */
export function daysBetween(then: string, now: string): number {
  const a = Date.parse(then);
  const b = Date.parse(now);
  if (!Number.isFinite(a) || !Number.isFinite(b)) return 0;
  return Math.max(0, Math.floor((b - a) / MS_PER_DAY));
}

/** Extract YYYY-MM-DD from a UTC ISO string. */
export function utcDate(iso: string): string {
  return iso.slice(0, 10);
}

// === Pure metric calculators ===

/**
 * reliability_pct = successful / (successful + errors_4xx).
 * 5xx errors are system fault and are NOT in the denominator.
 * Returns 100 when there are no qualifying calls (no data => benefit
 * of the doubt; caller decides whether to surface trust_grade D as
 * the corrective signal instead).
 */
export function computeReliabilityPct(successful: number, errors_4xx: number): number {
  const denom = successful + errors_4xx;
  if (denom <= 0) return 100;
  return Math.round((successful / denom) * 1000) / 10;
}

/**
 * Total calls = successful + 4xx + 5xx. 5xx is included in the public
 * "did the agent call us this many times" count even though it's
 * excluded from reliability. Matches the spec's metric definitions.
 */
export function computeTotalCalls(t: AgentTelemetry): number {
  return t.successful_calls + t.errors_4xx + t.errors_5xx;
}

/**
 * Compute current_streak_days and longest_streak_days from a set of
 * UTC dates (YYYY-MM-DD). "Current" is the run ending on today's date;
 * if today isn't in the set, current_streak_days is 0.
 *
 * Empty input returns { current: 0, longest: 0 }.
 */
export function computeStreaks(
  activeDates: string[],
  today: string,
): { current_streak_days: number; longest_streak_days: number } {
  if (activeDates.length === 0) {
    return { current_streak_days: 0, longest_streak_days: 0 };
  }
  const set = new Set(activeDates);
  const sorted = Array.from(set).sort();
  let longest = 1;
  let run = 1;
  for (let i = 1; i < sorted.length; i++) {
    const prev = Date.parse(sorted[i - 1] + 'T00:00:00Z');
    const curr = Date.parse(sorted[i] + 'T00:00:00Z');
    const diffDays = Math.round((curr - prev) / MS_PER_DAY);
    if (diffDays === 1) {
      run += 1;
      if (run > longest) longest = run;
    } else {
      run = 1;
    }
  }
  // Current streak: walk back from today as long as each prior day is in the set.
  let current = 0;
  if (set.has(today)) {
    current = 1;
    let cursor = today;
    // bounded walk; 366 days is plenty for "current streak"
    for (let i = 0; i < 366; i++) {
      const prev = previousUtcDate(cursor);
      if (set.has(prev)) {
        current += 1;
        cursor = prev;
      } else {
        break;
      }
    }
  }
  return { current_streak_days: current, longest_streak_days: longest };
}

function previousUtcDate(d: string): string {
  const t = Date.parse(d + 'T00:00:00Z');
  const prev = new Date(t - MS_PER_DAY);
  return prev.toISOString().slice(0, 10);
}

/**
 * Composite raw score in arbitrary units. Each dimension is normalized
 * to a 0-to-100 sub-score, then combined under COMPOSITE_WEIGHTS_FROZEN
 * (or supplied weights, which MUST sum to 1).
 *
 * Sub-score definitions:
 *   reliability: reliability_pct as-is (already 0-100)
 *   activity:    min(active_days, 30) / 30 * 100  (cap at 30d for v0)
 *   spend:       see computeSpendScore, paid * 5 + free, normalized vs cohort_cap
 *   streak:      min(current_streak_days, 30) / 30 * 100
 *
 * The cohort_cap for spend is the 95th-percentile spend across the
 * cohort; the store layer computes and passes it in. Defaults to
 * max(1, paid_calls + free_trial_calls / PAID_FREE_RATIO) so isolated
 * tests still produce sane numbers.
 */
export function computeCompositeScore(
  metrics: ReputationMetrics,
  cohortSpendCap: number,
  weights: CompositeWeights = COMPOSITE_WEIGHTS_FROZEN,
): number {
  const wsum = weights.reliability + weights.activity + weights.spend + weights.streak;
  if (Math.abs(wsum - 1) > 1e-6) {
    throw new Error(`composite weights must sum to 1 (got ${wsum})`);
  }
  const reliability = clamp01(metrics.reliability_pct / 100);
  const activity = clamp01(Math.min(metrics.active_days, 30) / 30);
  const spend = clamp01(
    computeSpendScore(metrics.paid_calls, metrics.free_trial_calls, cohortSpendCap) / 100,
  );
  const streak = clamp01(Math.min(metrics.current_streak_days, 30) / 30);
  const composite =
    reliability * weights.reliability +
    activity * weights.activity +
    spend * weights.spend +
    streak * weights.streak;
  return Math.round(composite * 10000) / 100; // 0 to 100, two decimals
}

function clamp01(x: number): number {
  if (!Number.isFinite(x)) return 0;
  if (x < 0) return 0;
  if (x > 1) return 1;
  return x;
}

/**
 * Spend sub-score 0..100. Paid calls weighted PAID_FREE_RATIO times
 * free-trial calls (5:1 in v0). cohortSpendCap is the upper anchor:
 * any agent matching or exceeding the cap scores 100. The cap is the
 * 95th-percentile spend across active agents (computed by the store).
 */
export function computeSpendScore(
  paid_calls: number,
  free_trial_calls: number,
  cohortSpendCap: number,
): number {
  const raw = paid_calls * PAID_FREE_RATIO + free_trial_calls;
  if (cohortSpendCap <= 0) return raw > 0 ? 100 : 0;
  return Math.min(100, (raw / cohortSpendCap) * 100);
}

// === Trust grade ===

export interface TrustGradeInput {
  wallet_age_days: number;
  paid_calls: number;
  verified: boolean;
  banned: boolean;
  ofac_clean: boolean;
  flag_count: number;
}

export function computeTrustGrade(input: TrustGradeInput): TrustGrade {
  if (input.banned || !input.ofac_clean) return 'F';
  if (input.flag_count >= 2) return 'F';
  if (input.wallet_age_days >= 90 && input.paid_calls >= 100 && input.verified && input.flag_count === 0) {
    return 'A';
  }
  if (input.wallet_age_days >= 30 && input.paid_calls >= 20 && input.flag_count === 0) return 'B';
  if (input.wallet_age_days >= NEW_WALLET_AGE_DAYS && (input.verified || input.paid_calls >= 5)) return 'C';
  return 'D';
}

// === Flags ===

export interface FlagInput {
  wallet_age_days: number;
  paid_calls: number;
  daily_spend_today: number;
  rolling_30d_avg_spend: number;
  unique_endpoints_used: number;
  errors_4xx: number;
  total_calls: number;
  claim_disputed: boolean;
}

export function computeFlags(input: FlagInput): ReputationFlag[] {
  const flags: ReputationFlag[] = [];
  if (input.wallet_age_days < NEW_WALLET_AGE_DAYS) flags.push('new_wallet');
  if (input.paid_calls === 0) flags.push('no_paid_calls');
  if (
    input.daily_spend_today > 0 &&
    input.rolling_30d_avg_spend > 0 &&
    input.daily_spend_today >= input.rolling_30d_avg_spend * SPEND_SPIKE_MULTIPLIER
  ) {
    flags.push('spend_spike');
  }
  if (input.unique_endpoints_used < MIN_ENDPOINT_DIVERSITY && input.total_calls >= 10) {
    flags.push('low_endpoint_diversity');
  }
  if (
    input.total_calls >= 20 &&
    input.errors_4xx / Math.max(1, input.total_calls) >= HIGH_ERROR_RATE_THRESHOLD
  ) {
    flags.push('high_error_rate');
  }
  if (input.claim_disputed) flags.push('claim_disputed');
  return flags;
}

// === Compute metrics from telemetry ===

export function computeMetrics(t: AgentTelemetry, today: string): ReputationMetrics {
  const total_calls = computeTotalCalls(t);
  const reliability_pct = computeReliabilityPct(t.successful_calls, t.errors_4xx);
  const { current_streak_days, longest_streak_days } = computeStreaks(t.active_dates, today);
  return {
    total_calls,
    successful_calls: t.successful_calls,
    reliability_pct,
    total_premium_calls: t.paid_calls,
    total_credits_spent: t.total_credits_spent,
    receipts_signed: t.receipts_signed,
    active_days: new Set(t.active_dates).size,
    current_streak_days,
    longest_streak_days,
    unique_endpoints_used: new Set(t.endpoints_used).size,
    errors_4xx: t.errors_4xx,
    errors_5xx: t.errors_5xx,
    free_trial_calls: t.free_trial_calls,
    paid_calls: t.paid_calls,
    wallet_age_days: daysBetween(t.first_seen, today + 'T00:00:00Z'),
  };
}

// === Generic ranker ===

export interface RankInput<Id extends string> {
  id: Id;
  score: number;
}

/**
 * Rank a cohort by score (higher score = lower rank number).
 * Ties resolved by id ASC so the result is deterministic. Returns
 * a Map keyed by id with rank, total, and pct (percentile, 100 =
 * best). Total = cohort size, not just the ranked subset.
 */
export function rankCohort<Id extends string>(
  inputs: RankInput<Id>[],
): Map<Id, RankEntry> {
  const sorted = [...inputs].sort((a, b) => {
    if (b.score !== a.score) return b.score - a.score;
    return a.id.localeCompare(b.id);
  });
  const total = sorted.length;
  const result = new Map<Id, RankEntry>();
  sorted.forEach((entry, idx) => {
    const rank = idx + 1;
    const pct = total > 0 ? Math.round(((total - rank) / Math.max(1, total - 1)) * 1000) / 10 : 0;
    result.set(entry.id, { rank, total, pct: total === 1 ? 100 : pct });
  });
  return result;
}

/**
 * Daily-spend rolling average from a YYYY-MM-DD -> credits map.
 * Excludes today; if the map is empty or all-zero, returns 0.
 */
export function rolling30dAvgSpend(daily_spend_30d: Record<string, number>, today: string): number {
  let sum = 0;
  let count = 0;
  for (const [date, credits] of Object.entries(daily_spend_30d)) {
    if (date === today) continue;
    sum += credits;
    count += 1;
  }
  return count > 0 ? sum / count : 0;
}
