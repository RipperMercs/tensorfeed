/**
 * Model Intelligence Index (TFII).
 *
 * Single source of truth for "how good is a model, as data". Derives a
 * versioned composite score (0 to 100) per model from the benchmark scores in
 * the `benchmarks` KV blob, discounted for contamination risk and benchmark
 * saturation via BENCHMARK_REGISTRY. The general-weighting composite is the
 * headline TFII; code / reasoning / creative are exposed as subscores.
 *
 * premium-route-verdict.ts imports taskQuality + trustForTask + the weight
 * tables from here so the Index and the router can never disagree. The route
 * verdict adds cost / latency / operational fusion on top; that stays in
 * route-verdict. This module is the quality layer only.
 *
 * Published methodology (see /intelligence) discloses the benchmark inputs,
 * categories, the discount approach, and the version. The exact numeric weights
 * and multipliers below are the implementation; they are not part of the
 * published methodology.
 */
import type { RoutingTask } from './routing';
import { BENCHMARK_REGISTRY, type BenchmarkMeta } from './benchmark-registry';
import { safePut } from './kill-switch';
import type { Env } from './types';

export const METHODOLOGY_VERSION = '1.1';

// Coverage floor: a model scored on fewer than this fraction of the general
// weighting's benchmarks is flagged low_coverage and excluded from the ranking.
const COVERAGE_FLOOR = 0.6;

// ─── Moved verbatim from premium-route-verdict.ts (now the shared home) ───

export const TASKS: RoutingTask[] = ['code', 'reasoning', 'creative', 'general'];

/**
 * Benchmark generations (methodology 1.1).
 *
 * v1 is the 2024 era set nearly every model in the catalog was scored on.
 * v2 is the set 2026 frontier vendors actually publish. They do not measure
 * the same thing at the same difficulty: Frontier-Bench tops out near 43
 * where MMLU-Pro sits in the 80s, so a v2 composite and a v1 composite are
 * not on one scale and must never be subtracted from each other.
 *
 * Equating the two would need a decent overlap of models carrying both.
 * The catalog has two (Claude Fable 5 and Claude Opus 4.8), which is far
 * too thin to calibrate on, so we do not try. A model is scored on the
 * generation it actually covers and ranked only against models on that same
 * generation. This is the rule the harness board applies to Terminal-Bench
 * 2.0 against 2.1, for the same reason.
 *
 * Before 1.1 the weights were v1 only, so every 2026 flagship fell under the
 * coverage floor and published no score at all.
 */
export type BenchmarkGeneration = 'v1' | 'v2';

export const TASK_BENCHMARK_WEIGHTS: Record<RoutingTask, Record<string, number>> = {
  code: { human_eval: 0.4, swe_bench: 0.4, mmlu_pro: 0.2 },
  reasoning: { gpqa_diamond: 0.4, math: 0.4, mmlu_pro: 0.2 },
  creative: { mmlu_pro: 0.5, human_eval: 0.25, math: 0.25 },
  general: { mmlu_pro: 0.25, human_eval: 0.25, gpqa_diamond: 0.15, math: 0.15, swe_bench: 0.2 },
};

/**
 * v2 weights. frontier_code is agentic terminal coding (Frontier-Bench),
 * osworld_2 is computer use, browsecomp is browsing and retrieval, and
 * hle_tools is hard broad reasoning with tool access.
 */
export const TASK_BENCHMARK_WEIGHTS_V2: Record<RoutingTask, Record<string, number>> = {
  code: { frontier_code: 0.6, osworld_2: 0.2, hle_tools: 0.2 },
  reasoning: { hle_tools: 0.5, frontier_code: 0.25, browsecomp: 0.25 },
  creative: { hle_tools: 0.4, browsecomp: 0.4, osworld_2: 0.2 },
  general: { frontier_code: 0.3, hle_tools: 0.3, osworld_2: 0.2, browsecomp: 0.2 },
};

/** Weight table for a generation. Defaults to v1 so existing callers are unaffected. */
export function weightsFor(generation: BenchmarkGeneration = 'v1'): Record<RoutingTask, Record<string, number>> {
  return generation === 'v2' ? TASK_BENCHMARK_WEIGHTS_V2 : TASK_BENCHMARK_WEIGHTS;
}

/** Fraction of a generation's general-weighting benchmarks the model actually carries. */
export function coverageFor(generation: BenchmarkGeneration, scores: Record<string, number>): number {
  const keys = Object.keys(weightsFor(generation).general);
  if (keys.length === 0) return 0;
  const present = keys.filter(k => typeof scores[k] === 'number' && scores[k] > 0);
  return present.length / keys.length;
}

/**
 * Pick the generation a model is scored on: whichever it covers better, with
 * ties going to v2 as the current set. A model under the floor on both is
 * still assigned its better generation so the trust block can explain why it
 * is unscored, but low_coverage stays true and no number is published.
 */
export function pickGeneration(scores: Record<string, number>): BenchmarkGeneration {
  return coverageFor('v2', scores) > coverageFor('v1', scores) ? 'v2' : 'v1';
}

// Maps the underscored benchmark score keys to the hyphenated ids used in
// BENCHMARK_REGISTRY, so contamination and saturation state can be joined to
// each weighted benchmark. A key absent here contributes no trust adjustment.
export const SCORE_KEY_TO_REGISTRY_ID: Record<string, string> = {
  human_eval: 'humaneval',
  swe_bench: 'swe-bench-verified',
  mmlu_pro: 'mmlu-pro',
  gpqa_diamond: 'gpqa-diamond',
  math: 'math',
  // v2. osworld_2 and hle_tools are the current variants of registry entries
  // we already carry, both active and low contamination, so they take the
  // neutral 1.0 multiplier. browsecomp and frontier_code have no registry
  // entry yet and fall through to the same neutral 1.0, which is the right
  // default for a new benchmark that is neither saturated nor contaminated.
  osworld_2: 'osworld',
  hle_tools: 'hle',
};

export const CONTAMINATION_MULTIPLIER: Record<BenchmarkMeta['contaminationRisk'], number> = {
  low: 1.0,
  medium: 0.92,
  high: 0.78,
};

export const STATUS_MULTIPLIER: Record<BenchmarkMeta['status'], number> = {
  active: 1.0,
  saturated: 0.85,
  deprecated: 0.7,
};

/**
 * Base quality for a task: weighted, renormalized average of the task's
 * benchmark scores (each 0..1). Mirrors routing.ts computeQualityForTask.
 */
export function taskQuality(
  task: RoutingTask,
  scores: Record<string, number>,
  generation: BenchmarkGeneration = 'v1',
): number {
  const weights = weightsFor(generation)[task];
  let total = 0;
  let applied = 0;
  for (const [bench, w] of Object.entries(weights)) {
    const score = scores[bench];
    if (typeof score === 'number' && score > 0) {
      total += (score / 100) * w;
      applied += w;
    }
  }
  return applied === 0 ? 0 : total / applied;
}

/**
 * Trust multiplier in (0, 1]: weighted average of contamination x status
 * multipliers over the task's benchmarks that the model actually scored.
 * Also returns the worst contamination tier seen and the flagged list.
 */
export function trustForTask(
  task: RoutingTask,
  scores: Record<string, number>,
  registryById: Map<string, BenchmarkMeta>,
  generation: BenchmarkGeneration = 'v1',
): { multiplier: number; worstContamination: BenchmarkMeta['contaminationRisk'] | null; flagged: string[] } {
  const weights = weightsFor(generation)[task];
  let total = 0;
  let applied = 0;
  let worst: BenchmarkMeta['contaminationRisk'] | null = null;
  const flagged: string[] = [];
  const rank: Record<BenchmarkMeta['contaminationRisk'], number> = { low: 0, medium: 1, high: 2 };
  for (const [bench, w] of Object.entries(weights)) {
    const score = scores[bench];
    if (typeof score !== 'number' || score <= 0) continue;
    const regId = SCORE_KEY_TO_REGISTRY_ID[bench];
    const meta = regId ? registryById.get(regId) : undefined;
    const cMult = meta ? CONTAMINATION_MULTIPLIER[meta.contaminationRisk] : 1.0;
    const sMult = meta ? STATUS_MULTIPLIER[meta.status] : 1.0;
    total += cMult * sMult * w;
    applied += w;
    if (meta) {
      if (worst === null || rank[meta.contaminationRisk] > rank[worst]) worst = meta.contaminationRisk;
      if (meta.contaminationRisk === 'high' || meta.status === 'saturated' || meta.status === 'deprecated') {
        flagged.push(`${meta.name} (${meta.contaminationRisk} contamination, ${meta.status})`);
      }
    }
  }
  return { multiplier: applied === 0 ? 1.0 : total / applied, worstContamination: worst, flagged };
}

// ─── The Intelligence Index ───

export interface ModelIntelligenceCore {
  tfii: number;
  /**
   * Which benchmark generation this score was computed on. Scores are only
   * comparable within a generation; never subtract a v1 tfii from a v2 one.
   */
  generation: BenchmarkGeneration;
  subscores: { code: number; reasoning: number; creative: number; general: number };
  trust: {
    contamination: 'low' | 'medium' | 'high' | 'unknown';
    benchmarks_used: string[];
    coverage: number;
    low_coverage: boolean;
    flagged: string[];
  };
  methodology_version: string;
}

export interface ModelIntelligence extends ModelIntelligenceCore {
  model_id: string;
  name: string;
  provider: string;
  rank: number;
  as_of: string;
}

export interface IntelligenceSnapshot {
  as_of: string;
  methodology_version: string;
  models: ModelIntelligence[];
}

interface BenchmarksData {
  lastUpdated: string;
  benchmarks: { id: string; name: string; description: string; maxScore: number }[];
  models: { model: string; provider: string; released?: string; scores: Record<string, number> }[];
}

export function registryMap(): Map<string, BenchmarkMeta> {
  const m = new Map<string, BenchmarkMeta>();
  for (const r of BENCHMARK_REGISTRY) m.set(r.id, r);
  return m;
}

export function normalizeId(name: string): string {
  return name.toLowerCase().trim().replace(/\s+/g, '-');
}

/** Round a 0..1 quality to a 0..100 score with one decimal. */
function toScore(q: number): number {
  return Math.round(q * 1000) / 10;
}

export function computeModelIntelligence(
  scores: Record<string, number>,
  registryById: Map<string, BenchmarkMeta>,
): ModelIntelligenceCore {
  const generation = pickGeneration(scores);
  const subscores = { code: 0, reasoning: 0, creative: 0, general: 0 };
  for (const t of TASKS) {
    const q = taskQuality(t, scores, generation);
    const trust = trustForTask(t, scores, registryById, generation);
    subscores[t as keyof typeof subscores] = toScore(q * trust.multiplier);
  }
  const generalTrust = trustForTask('general', scores, registryById, generation);
  const generalKeys = Object.keys(weightsFor(generation).general);
  const present = generalKeys.filter(k => typeof scores[k] === 'number' && scores[k] > 0);
  const coverage = generalKeys.length === 0 ? 0 : present.length / generalKeys.length;
  return {
    tfii: subscores.general,
    generation,
    subscores,
    trust: {
      contamination: generalTrust.worstContamination ?? 'unknown',
      benchmarks_used: present,
      coverage: Math.round(coverage * 100) / 100,
      low_coverage: coverage < COVERAGE_FLOOR,
      flagged: generalTrust.flagged,
    },
    methodology_version: METHODOLOGY_VERSION,
  };
}

export function buildIntelligenceSnapshot(data: BenchmarksData, asOf: string): IntelligenceSnapshot {
  const registryById = registryMap();
  const models: ModelIntelligence[] = data.models.map(row => ({
    model_id: normalizeId(row.model),
    name: row.model,
    provider: row.provider,
    rank: 0,
    as_of: asOf,
    ...computeModelIntelligence(row.scores, registryById),
  }));
  // Rank adequately-covered models by tfii desc, WITHIN their generation.
  // A v1 composite and a v2 composite are different measurements, so a single
  // merged ordering would be fiction. Low-coverage models stay rank 0.
  for (const gen of ['v1', 'v2'] as BenchmarkGeneration[]) {
    const ranked = models
      .filter(m => !m.trust.low_coverage && m.generation === gen)
      .sort((a, b) => b.tfii - a.tfii);
    ranked.forEach((m, i) => {
      m.rank = i + 1;
    });
  }
  return { as_of: asOf, methodology_version: METHODOLOGY_VERSION, models };
}

// ─── Free /api/models enrichment ───

interface PricingLike {
  providers: Array<{ models: Array<{ name?: string } & Record<string, unknown>> } & Record<string, unknown>>;
}

/**
 * Attach the TFII to each catalog model. A model under the coverage floor is
 * published with tfii null, never a number. Scoring Claude Opus 5 at 0 because
 * every benchmark it reports postdates the weighted set, or Kimi K3 at 93.5 off
 * one benchmark, reads as a verdict when it is really an absence of data. Null
 * also keeps this endpoint consistent with the /api/intelligence ranking, which
 * already drops low-coverage models instead of scoring them.
 */
export function enrichModelsWithIntelligence<T extends PricingLike>(pricing: T, snapshot: IntelligenceSnapshot): T {
  const byName = new Map(snapshot.models.map(m => [m.name.toLowerCase().trim(), m]));
  return {
    ...pricing,
    providers: pricing.providers.map(p => ({
      ...p,
      models: p.models.map(model => {
        const mi = byName.get((model.name || '').toLowerCase().trim());
        if (!mi) return model;
        return {
          ...model,
          intelligence: {
            tfii: mi.trust.low_coverage ? null : mi.tfii,
            generation: mi.generation,
            low_coverage: mi.trust.low_coverage,
            coverage: mi.trust.coverage,
            benchmarks_used: mi.trust.benchmarks_used,
            methodology_version: mi.methodology_version,
            as_of: mi.as_of,
          },
        };
      }),
    })),
  };
}

// ─── Snapshot capture (cron) + history (premium) ───

const SNAPSHOT_LATEST_KEY = 'intelligence:snapshot:latest';
const SNAPSHOT_INDEX_KEY = 'intelligence:snapshot:index';
const MAX_INDEX_DATES = 400;
function snapshotKey(date: string): string {
  return `intelligence:snapshot:${date}`;
}

/** Compute the index from the latest benchmarks KV and write latest + dated snapshot. */
export async function captureIntelligenceSnapshot(
  env: Env,
  now: string,
): Promise<{ ok: boolean; models?: number; date?: string; error?: string }> {
  const data = (await env.TENSORFEED_CACHE.get('benchmarks', 'json')) as BenchmarksData | null;
  if (!data || !Array.isArray(data.models) || data.models.length === 0) {
    return { ok: false, error: 'benchmarks_unavailable' };
  }
  const snapshot = buildIntelligenceSnapshot(data, now);
  const date = now.slice(0, 10);
  await safePut(env, env.TENSORFEED_CACHE, SNAPSHOT_LATEST_KEY, JSON.stringify(snapshot));
  await safePut(env, env.TENSORFEED_CACHE, snapshotKey(date), JSON.stringify(snapshot));
  const idxRaw = (await env.TENSORFEED_CACHE.get(SNAPSHOT_INDEX_KEY, 'json')) as string[] | null;
  const dates = idxRaw || [];
  if (!dates.includes(date)) {
    dates.unshift(date);
    if (dates.length > MAX_INDEX_DATES) dates.length = MAX_INDEX_DATES;
    await safePut(env, env.TENSORFEED_CACHE, SNAPSHOT_INDEX_KEY, JSON.stringify(dates));
  }
  return { ok: true, models: snapshot.models.length, date };
}

// History caps a query window at 1 year. Intentionally shorter than
// MAX_INDEX_DATES retention so the public window stays bounded.
const MAX_RANGE_DAYS = 365;

/** Resolve a from/to YYYY-MM-DD range with sane defaults and a max window. */
export function resolveDateRange(
  fromRaw: string | null,
  toRaw: string | null,
): { ok: true; from: string; to: string } | { ok: false; error: string } {
  const isDate = (s: string) => /^\d{4}-\d{2}-\d{2}$/.test(s);
  const to = toRaw && isDate(toRaw) ? toRaw : null;
  const from = fromRaw && isDate(fromRaw) ? fromRaw : null;
  if (fromRaw && !from) return { ok: false, error: 'invalid_from' };
  if (toRaw && !to) return { ok: false, error: 'invalid_to' };
  const resolvedTo = to ?? '9999-12-31';
  const resolvedFrom = from ?? '0000-01-01';
  if (resolvedFrom > resolvedTo) return { ok: false, error: 'from_after_to' };
  return { ok: true, from: resolvedFrom, to: resolvedTo };
}

export interface IntelligenceHistory {
  ok: true;
  model: string;
  from: string;
  to: string;
  methodology_version: string;
  points: Array<{ date: string; tfii: number; rank: number }>;
}

/** Assemble a model's TFII time-series from dated snapshots within the range. */
export async function buildIntelligenceHistory(
  env: Env,
  model: string,
  from: string,
  to: string,
): Promise<IntelligenceHistory> {
  const idx = ((await env.TENSORFEED_CACHE.get(SNAPSHOT_INDEX_KEY, 'json')) as string[] | null) || [];
  const target = normalizeId(model);
  const lowerName = model.toLowerCase().trim();
  const inRange = idx
    .filter(d => d >= from && d <= to)
    .sort()
    .slice(-MAX_RANGE_DAYS);
  const points: IntelligenceHistory['points'] = [];
  for (const date of inRange) {
    const snap = (await env.TENSORFEED_CACHE.get(snapshotKey(date), 'json')) as IntelligenceSnapshot | null;
    if (!snap) continue;
    const m = snap.models.find(x => x.model_id === target || x.name.toLowerCase().trim() === lowerName);
    if (m) points.push({ date, tfii: m.tfii, rank: m.rank });
  }
  return { ok: true, model, from, to, methodology_version: METHODOLOGY_VERSION, points };
}
