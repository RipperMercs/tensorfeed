/**
 * The verdict ledger: a dated, append-only record of the decisions TensorFeed
 * actually made.
 *
 * WHY THIS EXISTS
 * ---------------
 * TensorFeed sells decisions (route-verdict, arbitrage, the *-verdict family)
 * but kept no record of the decisions it made. time-machine.ts replays INPUTS
 * across seven domains and persists no OUTPUTS, and history.ts states the
 * never-backfillable rule for inputs while nothing applied it to outputs.
 *
 * That matters because the answer is not recoverable after the fact. The
 * scoring constants are compiled in (METHODOLOGY_VERSION, BENCHMARK_REGISTRY,
 * USAGE_RANKINGS, TASK_BENCHMARK_WEIGHTS), so replaying today's binary against
 * June's inputs does NOT reproduce June's answer. Public data is copyable in a
 * week; a year of dated, signed correctness is not. This is the one asset here
 * with a hard time lock: a D+90 hit rate in November requires writes that
 * happened in August.
 *
 * WRITTEN FROM A FIXED PANEL, NEVER FROM SERVED TRAFFIC
 * ----------------------------------------------------
 * RouteVerdictOptions carries continuous budget / minQuality / maxLatencyP95Ms
 * params, so keying records off live request parameters would scale write
 * volume with caller count and put an unbounded write path in front of a
 * 100k/day KV budget. A fixed canonical panel means the daily write count is
 * set by PANEL SIZE and stays flat under a traffic wave.
 *
 * Phase A (this module) records what was decided. Phase B, later, joins each
 * record forward against the input series that arrived after it (D+7, D+30,
 * D+90) to label it held, reversed, or unresolved. Nothing here is readable by
 * agents yet, deliberately: the clock is the asset, not the API.
 */

import type { Env } from './types';
import { contentDigest } from './constant-digest';
import { USAGE_RANKINGS } from './usage-rankings';
import { BENCHMARK_REGISTRY } from './benchmark-registry';
import { TASK_BENCHMARK_WEIGHTS, TASK_BENCHMARK_WEIGHTS_V2 } from './model-intelligence';
import { computeRouteVerdict } from './premium-route-verdict';
import type { RoutingTask } from './routing';

const KEY_PREFIX = 'verdict:';

/** The minimal, scoreable shape of one decision. Deliberately NOT the payload. */
export interface VerdictCore {
  /** The thing that was chosen. null means the question could not be answered today. */
  decision: string | null;
  /** What it beat, in order. Lets a later scorer see how close the call was. */
  alternatives: string[];
  /** A few scalars worth scoring against later. Keep small. */
  detail: Record<string, unknown>;
  /** Freshness anchors of the inputs this was computed from; hashed into inputs_digest. */
  inputs: Record<string, string | null>;
}

export interface PanelQuestion {
  /** Stable forever. Changing an id breaks the time series it identifies. */
  id: string;
  endpoint: string;
  verdict_class: string;
  compute(env: Env): Promise<VerdictCore | null>;
  /**
   * Is a decision made in the past still VALID today, independent of whether
   * it is still the top pick? Optional.
   *
   * This is what separates "the world moved on" from "we were wrong". A model
   * that got deprecated or sunsetted invalidates the call that recommended it;
   * a model that merely got beaten by a newer one does not. Without this a
   * question can only ever report `superseded`, which is the conservative
   * answer because it does not claim the verdict was wrong.
   */
  statusOf?(
    env: Env,
    decision: string,
  ): Promise<{ invalidated: boolean; reason: string; evidence: Record<string, unknown> }>;
}

export interface VerdictRecord {
  question_id: string;
  endpoint: string;
  verdict_class: string;
  date: string;
  captured_at: string;
  decision: string | null;
  alternatives: string[];
  detail: Record<string, unknown>;
  inputs: Record<string, string | null>;
  inputs_digest: string;
  methodology_digest: string;
  panel_digest: string;
}

export function verdictKey(date: string, questionId: string): string {
  return `${KEY_PREFIX}${date}:${questionId}`;
}

export function verdictIndexKey(date: string): string {
  return `${KEY_PREFIX}index:${date}`;
}

/**
 * Digest of the scoring constants' VALUES.
 *
 * Not the METHODOLOGY_VERSION string: weights can change without a version
 * bump, and a version string would make two differently-scored days look
 * identical. See constant-digest.ts and the sibling guard tests that stop
 * these arrays drifting away from their published LAST_UPDATED dates.
 */
export function methodologyDigest(): string {
  return contentDigest({
    usage_rankings: USAGE_RANKINGS,
    benchmark_registry: BENCHMARK_REGISTRY,
    task_weights: TASK_BENCHMARK_WEIGHTS,
    task_weights_v2: TASK_BENCHMARK_WEIGHTS_V2,
  });
}

/**
 * Digest of the question set itself. If the panel changes, the series has a
 * discontinuity, and a later scorer needs to be able to see that rather than
 * silently comparing across a redefinition.
 */
export function panelDigest(panel: PanelQuestion[]): string {
  return contentDigest(
    panel.map((q) => ({ id: q.id, endpoint: q.endpoint, verdict_class: q.verdict_class })),
  );
}

/**
 * Compute every panel question and write one dated record each.
 *
 * One question failing never stops the panel: a partial day of history is
 * worth far more than none, and the failure is reported for the cron log.
 */
export async function captureVerdictPanel(
  env: Env,
  nowIso: string,
  panel: PanelQuestion[] = VERDICT_PANEL,
): Promise<{ date: string; written: number; skipped: string[]; errors: string[] }> {
  const date = nowIso.slice(0, 10);
  const methodology = methodologyDigest();
  const panelDig = panelDigest(panel);

  const written: string[] = [];
  const skipped: string[] = [];
  const errors: string[] = [];

  for (const q of panel) {
    let core: VerdictCore | null;
    try {
      core = await q.compute(env);
    } catch (e) {
      errors.push(`${q.id}: ${e instanceof Error ? e.message : String(e)}`);
      continue;
    }

    // A question that cannot answer today records nothing. A null decision
    // would pollute the series with a non-answer that scores as a miss.
    if (!core || core.decision === null) {
      skipped.push(q.id);
      continue;
    }

    const record: VerdictRecord = {
      question_id: q.id,
      endpoint: q.endpoint,
      verdict_class: q.verdict_class,
      date,
      captured_at: nowIso,
      decision: core.decision,
      alternatives: core.alternatives,
      detail: core.detail,
      inputs: core.inputs,
      inputs_digest: contentDigest(core.inputs),
      methodology_digest: methodology,
      panel_digest: panelDig,
    };

    try {
      await env.TENSORFEED_CACHE.put(verdictKey(date, q.id), JSON.stringify(record));
      written.push(q.id);
    } catch (e) {
      errors.push(`${q.id}: write failed: ${e instanceof Error ? e.message : String(e)}`);
    }
  }

  // Single write, full list. An incrementally-appended index would be a
  // read-modify-write on one shared key, which is exactly what corrupted the
  // pay rollup under concurrent settles.
  await env.TENSORFEED_CACHE.put(
    verdictIndexKey(date),
    JSON.stringify({
      date,
      captured_at: nowIso,
      question_ids: written,
      skipped,
      errors,
      methodology_digest: methodology,
      panel_digest: panelDig,
    }),
  );

  return { date, written: written.length, skipped, errors };
}

export interface VerdictDayIndex {
  date: string;
  captured_at: string;
  question_ids: string[];
  skipped: string[];
  errors: string[];
  methodology_digest: string;
  panel_digest: string;
}

/**
 * Read back one day of the ledger.
 *
 * A write-only store is one you cannot verify, and "the put succeeded" is not
 * the same claim as "the record is there and readable". That distinction cost
 * this repo a real DR gap once already, so the ledger ships with an inspection
 * path from day one. Admin-gated at the route layer; nothing here is public.
 *
 * Driven off the index rather than a KV prefix list, so a record named by the
 * index but absent from KV is REPORTED rather than silently omitted.
 */
export async function readVerdictDay(
  env: Env,
  date: string,
): Promise<{ date: string; index: VerdictDayIndex | null; records: VerdictRecord[]; missing: string[] }> {
  const index = (await env.TENSORFEED_CACHE.get(verdictIndexKey(date), 'json')) as VerdictDayIndex | null;
  if (!index) return { date, index: null, records: [], missing: [] };

  const records: VerdictRecord[] = [];
  const missing: string[] = [];
  for (const id of index.question_ids) {
    const rec = (await env.TENSORFEED_CACHE.get(verdictKey(date, id), 'json')) as VerdictRecord | null;
    if (rec) records.push(rec);
    else missing.push(id);
  }
  return { date, index, records, missing };
}

// === phase B: forward scoring ===

/**
 * held       the same decision still stands today
 * superseded a different answer today, but the original is still valid. The
 *            world moved; the call was not wrong when it was made.
 * reversed   the original decision was INVALIDATED (deprecated, sunsetted).
 *            This is the one that means the call aged badly.
 * unresolved today cannot answer, or the question left the panel
 *
 * The held/superseded split is deliberate and load-bearing. Collapsing them
 * into one "miss" bucket would make TensorFeed look wrong every time a
 * competitor shipped a better model, which is not what a hit rate should mean.
 */
export type VerdictOutcomeLabel = 'held' | 'superseded' | 'reversed' | 'unresolved';

export interface VerdictOutcome {
  question_id: string;
  origin_date: string;
  horizon_days: number;
  scored_at: string;
  original_decision: string;
  current_decision: string | null;
  label: VerdictOutcomeLabel;
  reason: string;
  evidence: Record<string, unknown>;
  /**
   * True when OUR scoring constants or question set moved between the call and
   * this scoring. A reversal under a changed methodology is not the world
   * proving the verdict wrong, and any published hit rate has to be able to
   * exclude those rather than quietly bank them.
   */
  methodology_changed: boolean;
  panel_changed: boolean;
}

export function verdictOutcomeKey(originDate: string, horizonDays: number, questionId: string): string {
  return `${KEY_PREFIX}outcome:${originDate}:d${horizonDays}:${questionId}`;
}

function shiftDate(dateIso: string, days: number): string {
  return new Date(Date.parse(`${dateIso.slice(0, 10)}T00:00:00Z`) - days * 86400000)
    .toISOString()
    .slice(0, 10);
}

/**
 * Walk each horizon back from today, and score the verdicts made that day
 * against what is true now.
 *
 * Today's answer is computed ONCE per question and reused across every
 * horizon, so adding horizons costs reads, not recomputes.
 */
export async function scoreVerdictHorizons(
  env: Env,
  nowIso: string,
  horizons: number[] = [7, 30, 90],
  panel: PanelQuestion[] = VERDICT_PANEL,
): Promise<{
  scored_at: string;
  scored: number;
  horizons: Array<{ horizon_days: number; origin_date: string; scored: number; labels: Record<string, number> }>;
}> {
  const panelById = new Map(panel.map((q) => [q.id, q]));
  const methodologyNow = methodologyDigest();
  const panelNow = panelDigest(panel);

  // question_id -> today's decision, computed lazily and at most once.
  const todayCache = new Map<string, string | null>();
  async function todayDecision(q: PanelQuestion): Promise<string | null> {
    if (todayCache.has(q.id)) return todayCache.get(q.id)!;
    let decision: string | null = null;
    try {
      const core = await q.compute(env);
      decision = core?.decision ?? null;
    } catch {
      decision = null;
    }
    todayCache.set(q.id, decision);
    return decision;
  }

  let total = 0;
  const perHorizon: Array<{
    horizon_days: number;
    origin_date: string;
    scored: number;
    labels: Record<string, number>;
  }> = [];

  for (const horizon of horizons) {
    const originDate = shiftDate(nowIso, horizon);
    const day = await readVerdictDay(env, originDate);
    const labels: Record<string, number> = {};
    let scored = 0;

    for (const rec of day.records) {
      if (!rec.decision) continue;
      const q = panelById.get(rec.question_id);

      let label: VerdictOutcomeLabel;
      let reason: string;
      let evidence: Record<string, unknown> = {};
      let current: string | null = null;

      if (!q) {
        // The question left the panel. That says nothing about whether the
        // call was right, so it must not count as a miss.
        label = 'unresolved';
        reason = 'question retired from the panel';
      } else {
        current = await todayDecision(q);
        if (current === null) {
          label = 'unresolved';
          reason = 'today produced no answer for this question';
        } else if (current === rec.decision) {
          label = 'held';
          reason = 'same decision today';
        } else if (q.statusOf) {
          const status = await q.statusOf(env, rec.decision);
          evidence = status.evidence;
          if (status.invalidated) {
            label = 'reversed';
            reason = `original decision invalidated: ${status.reason}`;
          } else {
            label = 'superseded';
            reason = `a different answer leads today, original still valid: ${status.reason}`;
          }
        } else {
          // No validity check available, so we cannot claim it was wrong.
          label = 'superseded';
          reason = 'a different answer leads today; validity of the original is unchecked';
        }
      }

      const outcome: VerdictOutcome = {
        question_id: rec.question_id,
        origin_date: originDate,
        horizon_days: horizon,
        scored_at: nowIso,
        original_decision: rec.decision,
        current_decision: current,
        label,
        reason,
        evidence,
        methodology_changed: rec.methodology_digest !== methodologyNow,
        panel_changed: rec.panel_digest !== panelNow,
      };

      await env.TENSORFEED_CACHE.put(
        verdictOutcomeKey(originDate, horizon, rec.question_id),
        JSON.stringify(outcome),
      );
      labels[label] = (labels[label] ?? 0) + 1;
      scored++;
      total++;
    }

    perHorizon.push({ horizon_days: horizon, origin_date: originDate, scored, labels });
  }

  return { scored_at: nowIso, scored: total, horizons: perHorizon };
}

// === the canonical panel ===

const ROUTING_TASKS: RoutingTask[] = ['code', 'reasoning', 'creative', 'general'];

/**
 * Fixed question set. Add questions deliberately and never renumber or rename
 * an existing id; panel_digest records that the set changed so a scorer can
 * see the discontinuity.
 *
 * Bare task questions only, with no budget or latency filters, because those
 * are the continuous caller-supplied dimensions whose whole purpose here is to
 * stay out of the write key.
 */
export const VERDICT_PANEL: PanelQuestion[] = ROUTING_TASKS.map((task) => ({
  id: `route-verdict:task=${task}`,
  endpoint: '/api/premium/route-verdict',
  verdict_class: 'model_choice',
  async compute(env: Env): Promise<VerdictCore | null> {
    const result = await computeRouteVerdict(env, { task });
    if (!result.verdict) return null;
    return {
      // model.id is the canonical provider-side id, which is what a later
      // scorer can match against pricing, deprecation and usage series.
      // model.name is a display string and drifts.
      decision: result.verdict.model.id,
      alternatives: result.runners_up.map((r) => r.model.id),
      detail: {
        provider: result.verdict.model.provider,
        composite_score: result.verdict.composite_score,
        blended_price: result.verdict.pricing.blended,
        quality_generation: result.verdict.quality.generation,
        candidates_considered: result.candidates_considered,
        usage_corroborated: result.trust.usage_corroborated,
        benchmark_contamination: result.trust.benchmark_contamination,
      },
      inputs: {
        captured_at: result.capturedAt,
        pricing: result.data_freshness.pricing,
        benchmarks: result.data_freshness.benchmarks,
      },
    };
  },
  /**
   * Narrow the verdict to the previously-chosen model with excludeDeprecated
   * off, which returns that one model carrying its CURRENT deprecation state.
   *
   * Deliberately reuses computeRouteVerdict rather than matching against
   * MODEL_DEPRECATIONS here: route-verdict's matcher normalises ids against
   * modelDisplay too, and a second copy of that logic would drift from the
   * one that actually gates the product.
   */
  async statusOf(env: Env, decision: string) {
    const narrowed = await computeRouteVerdict(env, {
      task,
      model: decision,
      excludeDeprecated: false,
      requireOperational: false,
    });
    const c = narrowed.verdict;
    if (!c) {
      // The model is gone from the priced catalog entirely, which is a
      // stronger form of invalidation than a deprecation flag.
      return {
        invalidated: true,
        reason: 'no longer present in the priced model catalog',
        evidence: { model: decision, found: false },
      };
    }
    const dep = c.deprecation;
    const invalidated = dep.flagged && (dep.status === 'deprecated' || dep.status === 'sunsetted');
    return {
      invalidated,
      reason: invalidated ? `${dep.status}${dep.sunset_date ? ` (sunset ${dep.sunset_date})` : ''}` : 'operational',
      evidence: {
        model: decision,
        deprecation_status: dep.status,
        sunset_date: dep.sunset_date,
        blended_price: c.pricing.blended,
      },
    };
  },
}));
