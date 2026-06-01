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

export const METHODOLOGY_VERSION = '1.0';

// Coverage floor: a model scored on fewer than this fraction of the general
// weighting's benchmarks is flagged low_coverage and excluded from the ranking.
const COVERAGE_FLOOR = 0.6;

// --- Moved verbatim from premium-route-verdict.ts (now the shared home) ---

export const TASKS: RoutingTask[] = ['code', 'reasoning', 'creative', 'general'];

export const TASK_BENCHMARK_WEIGHTS: Record<RoutingTask, Record<string, number>> = {
  code: { human_eval: 0.4, swe_bench: 0.4, mmlu_pro: 0.2 },
  reasoning: { gpqa_diamond: 0.4, math: 0.4, mmlu_pro: 0.2 },
  creative: { mmlu_pro: 0.5, human_eval: 0.25, math: 0.25 },
  general: { mmlu_pro: 0.25, human_eval: 0.25, gpqa_diamond: 0.15, math: 0.15, swe_bench: 0.2 },
};

// Maps the underscored benchmark score keys to the hyphenated ids used in
// BENCHMARK_REGISTRY, so contamination and saturation state can be joined to
// each weighted benchmark. A key absent here contributes no trust adjustment.
export const SCORE_KEY_TO_REGISTRY_ID: Record<string, string> = {
  human_eval: 'humaneval',
  swe_bench: 'swe-bench-verified',
  mmlu_pro: 'mmlu-pro',
  gpqa_diamond: 'gpqa-diamond',
  math: 'math',
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
export function taskQuality(task: RoutingTask, scores: Record<string, number>): number {
  const weights = TASK_BENCHMARK_WEIGHTS[task];
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
): { multiplier: number; worstContamination: BenchmarkMeta['contaminationRisk'] | null; flagged: string[] } {
  const weights = TASK_BENCHMARK_WEIGHTS[task];
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

// --- The Intelligence Index ---

export interface ModelIntelligenceCore {
  tfii: number;
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
  const subscores = { code: 0, reasoning: 0, creative: 0, general: 0 };
  for (const t of TASKS) {
    const q = taskQuality(t, scores);
    const trust = trustForTask(t, scores, registryById);
    subscores[t as keyof typeof subscores] = toScore(q * trust.multiplier);
  }
  const generalTrust = trustForTask('general', scores, registryById);
  const generalKeys = Object.keys(TASK_BENCHMARK_WEIGHTS.general);
  const present = generalKeys.filter(k => typeof scores[k] === 'number' && scores[k] > 0);
  const coverage = generalKeys.length === 0 ? 0 : present.length / generalKeys.length;
  return {
    tfii: subscores.general,
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
  // Rank adequately-covered models by tfii desc; low-coverage stay rank 0.
  const ranked = models.filter(m => !m.trust.low_coverage).sort((a, b) => b.tfii - a.tfii);
  ranked.forEach((m, i) => {
    m.rank = i + 1;
  });
  return { as_of: asOf, methodology_version: METHODOLOGY_VERSION, models };
}

// --- Free /api/models enrichment ---

interface PricingLike {
  providers: Array<{ models: Array<{ name?: string } & Record<string, unknown>> } & Record<string, unknown>>;
}

export function enrichModelsWithIntelligence<T extends PricingLike>(pricing: T, snapshot: IntelligenceSnapshot): T {
  const byName = new Map(snapshot.models.map(m => [m.name.toLowerCase().trim(), m]));
  return {
    ...pricing,
    providers: pricing.providers.map(p => ({
      ...p,
      models: p.models.map(model => {
        const mi = byName.get((model.name || '').toLowerCase().trim());
        return mi
          ? { ...model, intelligence: { tfii: mi.tfii, methodology_version: mi.methodology_version, as_of: mi.as_of } }
          : model;
      }),
    })),
  };
}

// --- Snapshot capture (cron) + history (premium) ---

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
