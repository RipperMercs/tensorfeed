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
}));
