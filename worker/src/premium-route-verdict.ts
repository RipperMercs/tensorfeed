/**
 * Premium Route Verdict.
 *
 * One signed routing decision for an AI agent: "for this task (or this
 * model), what is the best model to use right now." It is the decision
 * layer on top of the same data spine the free routing preview uses,
 * but it replaces routing.ts's placeholder latency with REAL measured
 * p95 from the active probes, adds production-usage corroboration,
 * discounts benchmark scores by contamination and saturation, gates on
 * LIVE incident-triage operational state, and flags deprecating models.
 *
 * Why an agent pays for this instead of computing it: the answer fuses
 * five public sources nobody joins (model pricing, benchmark scores,
 * benchmark trust state, measured latency probes, live incident triage),
 * returns a single verdict it can act on without running the join or the
 * reasoning itself, and ships an AFTA-signed receipt over the verdict so
 * the routing decision is cryptographically attestable.
 *
 * Free sibling: /api/route-verdict (top verdict only, rate-limited,
 * unsigned) so an agent can evaluate the shape before paying.
 * Premium: /api/premium/route-verdict (full verdict plus runners-up,
 * trust block, signed receipt). 1 credit. Strict-premium (param-required).
 *
 * SCOPE (v1): first-party model routing across the providers TensorFeed
 * can quality-score and operationally probe. Cross-host open-weight
 * arbitrage (Together vs Fireworks vs DeepInfra and friends) is served
 * by /api/premium/inference-providers/arbitrage and lands in route-verdict
 * v2 once host-level latency probes exist. Measured latency and live
 * operational state cover the labs the probes hit; for any candidate
 * outside that set the verdict reports latency_source and
 * operational_source as the honest fallback rather than overclaiming.
 *
 * Freshness: the response carries capturedAt set to the operational
 * signal anchor (probe computed_at, else the status lastChecked). The
 * 30-minute SLA in freshness.ts means a stale operational layer triggers
 * a no-charge, so an agent only pays when the live part of the verdict
 * is current. The daily quality and price snapshots do not gate billing.
 */

import type { Env } from './types';
import { safePut } from './kill-switch';
import type { RoutingTask } from './routing';
import { getLatestSummary, type LatestSummary } from './probe';
import {
  getIncidentTriageSnapshot,
  type IncidentTriageSnapshot,
} from './incident-triage-generator';
import {
  USAGE_RANKINGS,
  USAGE_RANKINGS_LAST_UPDATED,
  type UsageRanking,
} from './usage-rankings';
import {
  BENCHMARK_REGISTRY,
  BENCHMARK_REGISTRY_LAST_UPDATED,
  type BenchmarkMeta,
} from './benchmark-registry';
import { MODEL_DEPRECATIONS, type ModelDeprecation } from './model-deprecations';

// ─── Local shapes for the two KV blobs and the status list ─────────
// Declared locally to keep this module free of cross-imports into
// catalog.ts / routing.ts internals. Field names mirror the canonical
// shapes those modules write and read.

interface ModelEntry {
  id: string;
  name: string;
  inputPrice: number; // USD / 1M input tokens
  outputPrice: number; // USD / 1M output tokens
  contextWindow: number;
  capabilities?: string[];
  openSource?: boolean;
  tier?: string;
}

interface ProviderEntry {
  id: string;
  name: string; // lowercase short name: anthropic / openai / google / ...
  models: ModelEntry[];
}

interface PricingData {
  lastUpdated?: string;
  providers: ProviderEntry[];
}

interface BenchmarkModelEntry {
  model: string; // display name, e.g. "Claude Sonnet 4.6"
  provider: string; // lowercase short name
  scores: Record<string, number>; // underscored keys: human_eval, swe_bench, ...
}

interface BenchmarksData {
  lastUpdated?: string;
  models: BenchmarkModelEntry[];
}

interface ServiceStatus {
  name: string;
  provider: string; // lowercase short name
  status: 'operational' | 'degraded' | 'down' | 'unknown';
  lastChecked?: string;
}

// ─── Task weighting (mirrors routing.ts TASK_BENCHMARK_WEIGHTS) ────
// Kept local because route-verdict applies a contamination discount on
// top of the raw score, which is a different computation from the free
// routing preview. The benchmark keys here are the underscored score
// keys stored in the benchmarks KV.

const TASKS: RoutingTask[] = ['code', 'reasoning', 'creative', 'general'];

const TASK_BENCHMARK_WEIGHTS: Record<RoutingTask, Record<string, number>> = {
  code: { human_eval: 0.4, swe_bench: 0.4, mmlu_pro: 0.2 },
  reasoning: { gpqa_diamond: 0.4, math: 0.4, mmlu_pro: 0.2 },
  creative: { mmlu_pro: 0.5, human_eval: 0.25, math: 0.25 },
  general: { mmlu_pro: 0.25, human_eval: 0.25, gpqa_diamond: 0.15, math: 0.15, swe_bench: 0.2 },
};

// Maps the underscored benchmark score keys to the hyphenated ids used
// in BENCHMARK_REGISTRY, so contamination and saturation state can be
// joined to each weighted benchmark. A key absent from this map simply
// contributes no trust adjustment (treated as neutral).
const SCORE_KEY_TO_REGISTRY_ID: Record<string, string> = {
  human_eval: 'humaneval',
  swe_bench: 'swe-bench-verified',
  mmlu_pro: 'mmlu-pro',
  gpqa_diamond: 'gpqa-diamond',
  math: 'math',
};

const CONTAMINATION_MULTIPLIER: Record<BenchmarkMeta['contaminationRisk'], number> = {
  low: 1.0,
  medium: 0.92,
  high: 0.78,
};

const STATUS_MULTIPLIER: Record<BenchmarkMeta['status'], number> = {
  active: 1.0,
  saturated: 0.85,
  deprecated: 0.7,
};

// Composite weighting. Capability-first: quality leads, and cost,
// latency, and operational state break ties among the strong models that
// clear the capability floor below.
const COMPOSITE_WEIGHTS = {
  quality: 0.5,
  cost: 0.2,
  latency: 0.15,
  operational: 0.15,
};

// Capability floor (capability-first). The verdict and runners-up are
// chosen ONLY from candidates whose trust-discounted quality is within
// this ratio of the best candidate's. A "best for code" query therefore
// never returns a model far below the frontier just because it is cheap
// and fast; cost and latency only break ties among the strongest models.
// Models below the floor are reported in the notes but excluded from the
// ranking.
const CAPABILITY_FLOOR_RATIO = 0.9;

const OPERATIONAL_SCORE: Record<string, number> = {
  operational: 1.0,
  degraded: 0.5,
  down: 0.0,
  failover_now: 0.0,
  unknown: 0.7, // neutral: do not punish a provider we cannot observe
};

const USAGE_CORROBORATION_BONUS = 0.05;

// ─── Public option + response shapes ───────────────────────────────

export interface RouteVerdictOptions {
  task?: RoutingTask;
  model?: string; // canonical id or display name; narrows to one model
  maxLatencyP95Ms?: number; // drop candidates whose MEASURED p95 exceeds this
  requireOperational?: boolean; // default true: drop candidates known down / failover_now
  excludeDeprecated?: boolean; // default true: drop matched deprecated / sunsetted models
}

export type LatencySource = 'measured_probe' | 'unknown';
export type OperationalSource = 'live_status' | 'unknown';

export interface VerdictCandidate {
  rank: number;
  model: { id: string; name: string; provider: string; openSource: boolean; contextWindow: number };
  pricing: { input: number; output: number; blended: number; currency: 'USD'; unit: 'per 1M tokens' };
  quality: { task_score: number; trust_discounted: number; contamination_note: string | null };
  usage: { corroborated: boolean; rank: number | null; share_pct: number | null; trend: UsageRanking['trend'] | null };
  latency: { measured_p95_ms: number | null; source: LatencySource };
  operational: { ok: boolean | null; status: ServiceStatus['status'] | 'failover_now'; source: OperationalSource };
  deprecation: { flagged: boolean; status: ModelDeprecation['status'] | null; sunset_date: string | null };
  composite_score: number;
  why: string;
}

export interface RouteVerdictResult {
  ok: true;
  query: { task: RoutingTask | null; model: string | null };
  capturedAt: string | null;
  verdict: VerdictCandidate | null;
  runners_up: VerdictCandidate[];
  trust: {
    usage_corroborated: boolean;
    benchmark_contamination: 'low' | 'medium' | 'high' | 'mixed' | 'unknown';
    operational_layer: 'live' | 'partial' | 'unavailable';
    latency_layer: 'measured' | 'partial' | 'unavailable';
  };
  filters_applied: {
    max_latency_p95_ms: number | null;
    require_operational: boolean;
    exclude_deprecated: boolean;
  };
  candidates_considered: number;
  data_freshness: {
    pricing: string | null;
    benchmarks: string | null;
    probe: string | null;
    status: string | null;
    usage_rankings: string;
    benchmark_registry: string;
  };
  claim: string;
  notes: string[];
  attribution: { sources: string[]; license: string };
}

// ─── Pure inputs bundle (handler loads, pure fn computes) ──────────

export interface RouteVerdictInputs {
  pricing: PricingData | null;
  benchmarks: BenchmarksData | null;
  services: ServiceStatus[] | null;
  probe: LatestSummary | null;
  triage: IncidentTriageSnapshot | null;
  usage: ReadonlyArray<UsageRanking>;
  benchmarkRegistry: ReadonlyArray<BenchmarkMeta>;
  deprecations: ReadonlyArray<ModelDeprecation>;
}

// ─── Helpers ───────────────────────────────────────────────────────

function round4(n: number): number {
  return parseFloat(n.toFixed(4));
}

/** Normalize a model name for fuzzy cross-source matching. */
function normName(s: string): string {
  return s.toLowerCase().replace(/[^a-z0-9]/g, '');
}

/**
 * Base quality for a task: weighted, renormalized average of the task's
 * benchmark scores (each 0..1). Mirrors routing.ts computeQualityForTask.
 */
function taskQuality(task: RoutingTask, scores: Record<string, number>): number {
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
 * Also returns the worst contamination tier seen for the note.
 */
function trustForTask(
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

// ─── The pure verdict builder ──────────────────────────────────────

interface ScratchCandidate {
  id: string;
  name: string;
  provider: string;
  openSource: boolean;
  contextWindow: number;
  inputPrice: number;
  outputPrice: number;
  blended: number;
  baseQuality: number;
  discountedQuality: number;
  contaminationNote: string | null;
  usage: VerdictCandidate['usage'];
  measuredP95: number | null;
  latencySource: LatencySource;
  operationalOk: boolean | null;
  operationalStatus: ServiceStatus['status'] | 'failover_now';
  operationalSource: OperationalSource;
  deprecation: VerdictCandidate['deprecation'];
}

export function buildRouteVerdict(
  inputs: RouteVerdictInputs,
  options: RouteVerdictOptions,
  now: Date,
): RouteVerdictResult {
  const task: RoutingTask = options.task && TASKS.includes(options.task) ? options.task : 'general';
  const requireOperational = options.requireOperational !== false; // default true
  const excludeDeprecated = options.excludeDeprecated !== false; // default true
  const maxLatency =
    typeof options.maxLatencyP95Ms === 'number' && Number.isFinite(options.maxLatencyP95Ms) && options.maxLatencyP95Ms > 0
      ? options.maxLatencyP95Ms
      : null;
  const modelNeedle = options.model ? normName(options.model) : null;

  const pricing = inputs.pricing ?? { providers: [] };
  const benchmarks = inputs.benchmarks ?? { models: [] };
  const services = inputs.services ?? [];

  // Index helpers.
  const benchByName = new Map<string, BenchmarkModelEntry>();
  for (const b of benchmarks.models) benchByName.set(normName(b.model), b);

  const registryById = new Map<string, BenchmarkMeta>();
  for (const r of inputs.benchmarkRegistry) registryById.set(r.id, r);

  const usageByName = new Map<string, UsageRanking>();
  for (const u of inputs.usage) usageByName.set(normName(u.model), u);

  // Measured latency per provider (lowercase short name) from the probe
  // latest summary. total.p95 is the measured end-to-end p95.
  const p95ByProvider = new Map<string, number | null>();
  let probeAnchor: string | null = null;
  if (inputs.probe) {
    probeAnchor = inputs.probe.computed_at ?? null;
    for (const agg of inputs.probe.providers) {
      p95ByProvider.set(agg.provider.toLowerCase(), agg.total?.p95 ?? null);
    }
  }

  // Provider operational state. Status and triage joins use FUZZY
  // provider-name matching (mirrors routing.ts statusForProvider) because
  // the status feed and the model catalog do not always spell a provider
  // identically (e.g. "mistral" in the catalog vs "Mistral AI" in status).
  // Exact-only matching left real providers showing operational: unknown.
  let statusAnchor: string | null = null;
  for (const s of services) {
    if (s.lastChecked && (statusAnchor === null || s.lastChecked < statusAnchor)) statusAnchor = s.lastChecked;
  }
  function providerMatch(a: string, b: string): boolean {
    return a === b || a.includes(b) || b.includes(a);
  }
  function findService(providerKey: string): ServiceStatus | null {
    for (const s of services) {
      if (providerMatch(s.provider.toLowerCase(), providerKey)) return s;
    }
    return null;
  }
  function isFailover(providerKey: string): boolean {
    if (!inputs.triage) return false;
    for (const card of inputs.triage.cards) {
      if (
        card.ongoing &&
        card.recommended_action === 'failover_now' &&
        providerMatch(card.provider.toLowerCase(), providerKey)
      ) {
        return true;
      }
    }
    return false;
  }

  // Deprecation lookup: best-effort match by model id or display name.
  function deprecationFor(modelId: string, modelName: string): VerdictCandidate['deprecation'] {
    const idN = normName(modelId);
    const nameN = normName(modelName);
    for (const d of inputs.deprecations) {
      const dm = normName(d.model);
      const dd = d.modelDisplay ? normName(d.modelDisplay) : '';
      if (dm === idN || dm === nameN || (dd && (dd === idN || dd === nameN))) {
        return { flagged: true, status: d.status, sunset_date: d.sunsetDate ?? null };
      }
    }
    return { flagged: false, status: null, sunset_date: null };
  }

  // Build the scratch candidate set: every priced model that has a
  // benchmark score for the task. Mirrors routing.ts candidate logic.
  const scratch: ScratchCandidate[] = [];
  for (const provider of pricing.providers) {
    const providerKey = provider.name.toLowerCase();
    for (const model of provider.models) {
      if (modelNeedle && normName(model.id) !== modelNeedle && normName(model.name) !== modelNeedle) continue;
      const bench = benchByName.get(normName(model.name));
      if (!bench) continue;
      const baseQuality = taskQuality(task, bench.scores);
      if (baseQuality === 0) continue;

      const trust = trustForTask(task, bench.scores, registryById);
      const discountedQuality = baseQuality * trust.multiplier;
      const contaminationNote = trust.flagged.length > 0 ? trust.flagged.join('; ') : null;

      const u = usageByName.get(normName(model.name));
      const usage: VerdictCandidate['usage'] = u
        ? { corroborated: true, rank: u.rank, share_pct: u.sharePct, trend: u.trend }
        : { corroborated: false, rank: null, share_pct: null, trend: null };

      const measuredP95 = p95ByProvider.has(providerKey) ? p95ByProvider.get(providerKey) ?? null : null;
      const latencySource: LatencySource = measuredP95 !== null ? 'measured_probe' : 'unknown';

      let operationalStatus: ScratchCandidate['operationalStatus'];
      let operationalOk: boolean | null;
      let operationalSource: OperationalSource;
      const svc = findService(providerKey);
      if (isFailover(providerKey)) {
        operationalStatus = 'failover_now';
        operationalOk = false;
        operationalSource = 'live_status';
      } else if (svc) {
        operationalStatus = svc.status;
        operationalOk = svc.status === 'operational' ? true : svc.status === 'unknown' ? null : false;
        operationalSource = svc.status === 'unknown' ? 'unknown' : 'live_status';
      } else {
        operationalStatus = 'unknown';
        operationalOk = null;
        operationalSource = 'unknown';
      }

      scratch.push({
        id: model.id,
        name: model.name,
        provider: providerKey,
        openSource: model.openSource ?? false,
        contextWindow: model.contextWindow,
        inputPrice: model.inputPrice,
        outputPrice: model.outputPrice,
        blended: (model.inputPrice + model.outputPrice) / 2,
        baseQuality,
        discountedQuality,
        contaminationNote,
        usage,
        measuredP95,
        latencySource,
        operationalOk,
        operationalStatus,
        operationalSource,
        deprecation: deprecationFor(model.id, model.name),
      });
    }
  }

  const notes: string[] = [];

  // Apply gates.
  let filtered = scratch;
  if (excludeDeprecated) {
    filtered = filtered.filter(
      (c) => !(c.deprecation.flagged && (c.deprecation.status === 'deprecated' || c.deprecation.status === 'sunsetted')),
    );
  }
  if (requireOperational) {
    // Drop only candidates we KNOW are not operational. Unknown stays
    // (we do not punish a provider we cannot observe), and the note
    // records that the operational gate could not fully apply.
    filtered = filtered.filter((c) => c.operationalOk !== false);
  }
  if (maxLatency !== null) {
    filtered = filtered.filter((c) => c.measuredP95 === null || c.measuredP95 <= maxLatency);
  }

  // Capability floor (capability-first): keep only candidates within
  // CAPABILITY_FLOOR_RATIO of the best trust-discounted quality. Cost,
  // latency, and operational state then break ties AMONG these strong
  // models, so a materially weaker model never wins on price alone.
  let belowFloorCount = 0;
  let eligible = filtered;
  if (filtered.length > 0) {
    const maxQ = Math.max(...filtered.map((c) => c.discountedQuality));
    const floor = maxQ * CAPABILITY_FLOOR_RATIO;
    const passed = filtered.filter((c) => c.discountedQuality >= floor);
    belowFloorCount = filtered.length - passed.length;
    eligible = passed;
  }

  // Normalize cost and latency across the eligible capability-tier set.
  const prices = eligible.map((c) => c.blended);
  const minPrice = prices.length ? Math.min(...prices) : 0;
  const maxPrice = prices.length ? Math.max(...prices) : 0;
  const priceRange = maxPrice - minPrice;

  const measured = eligible.map((c) => c.measuredP95).filter((v): v is number => v !== null);
  const minLat = measured.length ? Math.min(...measured) : 0;
  const maxLat = measured.length ? Math.max(...measured) : 0;
  const latRange = maxLat - minLat;

  const scored = eligible.map((c) => {
    const cost = priceRange === 0 ? 1.0 : 1 - (c.blended - minPrice) / priceRange;
    const latency =
      c.measuredP95 === null ? 0.6 : latRange === 0 ? 1.0 : 1 - (c.measuredP95 - minLat) / latRange;
    const opKey = c.operationalStatus === 'failover_now' ? 'failover_now' : c.operationalStatus;
    const operational = OPERATIONAL_SCORE[opKey] ?? 0.7;
    let composite =
      COMPOSITE_WEIGHTS.quality * c.discountedQuality +
      COMPOSITE_WEIGHTS.cost * cost +
      COMPOSITE_WEIGHTS.latency * latency +
      COMPOSITE_WEIGHTS.operational * operational;
    if (c.usage.corroborated) composite += USAGE_CORROBORATION_BONUS;
    return { c, cost, latency, operational, composite };
  });

  scored.sort((a, b) => b.composite - a.composite);

  function toVerdict(s: (typeof scored)[number], rank: number): VerdictCandidate {
    const c = s.c;
    const reasons: string[] = [];
    reasons.push(`${task} quality ${round4(c.discountedQuality)} after trust discount`);
    if (c.usage.corroborated) reasons.push(`corroborated by real usage (rank ${c.usage.rank}, ${c.usage.share_pct}% share, ${c.usage.trend})`);
    if (c.measuredP95 !== null) reasons.push(`measured p95 ${c.measuredP95} ms`);
    else reasons.push('latency not measured for this provider');
    if (c.operationalOk === true) reasons.push('operational');
    else if (c.operationalOk === false) reasons.push(`not operational (${c.operationalStatus})`);
    else reasons.push('operational state unknown');
    reasons.push(`blended $${round4(c.blended)} / 1M`);
    return {
      rank,
      model: { id: c.id, name: c.name, provider: c.provider, openSource: c.openSource, contextWindow: c.contextWindow },
      pricing: { input: c.inputPrice, output: c.outputPrice, blended: round4(c.blended), currency: 'USD', unit: 'per 1M tokens' },
      quality: { task_score: round4(c.baseQuality), trust_discounted: round4(c.discountedQuality), contamination_note: c.contaminationNote },
      usage: c.usage,
      latency: { measured_p95_ms: c.measuredP95, source: c.latencySource },
      operational: { ok: c.operationalOk, status: c.operationalStatus, source: c.operationalSource },
      deprecation: c.deprecation,
      composite_score: round4(s.composite),
      why: reasons.join('; '),
    };
  }

  const verdict = scored.length > 0 ? toVerdict(scored[0], 1) : null;
  const runners_up = scored.slice(1, 4).map((s, i) => toVerdict(s, i + 2));

  // Trust + layer summaries (over the eligible capability-tier set, the
  // candidates the verdict actually ranks).
  const anyMeasured = eligible.some((c) => c.measuredP95 !== null);
  const allMeasured = eligible.length > 0 && eligible.every((c) => c.measuredP95 !== null);
  const anyOperational = eligible.some((c) => c.operationalSource === 'live_status');
  const allOperational = eligible.length > 0 && eligible.every((c) => c.operationalSource === 'live_status');

  let contaminationSummary: RouteVerdictResult['trust']['benchmark_contamination'] = 'unknown';
  if (verdict) {
    const worst = eligible.length ? eligible.map((c) => c.contaminationNote).some((n) => n !== null) : false;
    contaminationSummary = worst ? 'mixed' : 'low';
  }

  if (!anyMeasured) notes.push('No measured latency available in this window; latency scored neutral for all candidates.');
  else if (!allMeasured) notes.push('Measured latency covers a subset of candidates (the probed first-party labs); others scored neutral and flagged latency_source unknown.');
  if (!anyOperational) notes.push('No live operational state available; operational gate could not be applied.');
  if (requireOperational && filtered.length < scratch.length) notes.push('require_operational dropped candidates known to be down or in failover.');
  if (belowFloorCount > 0) {
    notes.push(
      `${belowFloorCount} candidate(s) below the capability floor (more than 10 percent under the top trust-discounted quality) were excluded from the verdict. Cost and latency only break ties among the strongest models.`,
    );
  }
  notes.push('Measured latency is TensorFeed probe-vantage end-to-end p95, not the calling agent geographic region.');
  notes.push('This is a ranking over public signals, not a provider SLA guarantee.');

  return {
    ok: true,
    query: { task: options.task && TASKS.includes(options.task) ? options.task : modelNeedle ? null : task, model: options.model ?? null },
    capturedAt: probeAnchor ?? statusAnchor ?? null,
    verdict,
    runners_up,
    trust: {
      usage_corroborated: verdict?.usage.corroborated ?? false,
      benchmark_contamination: contaminationSummary,
      operational_layer: allOperational ? 'live' : anyOperational ? 'partial' : 'unavailable',
      latency_layer: allMeasured ? 'measured' : anyMeasured ? 'partial' : 'unavailable',
    },
    filters_applied: {
      max_latency_p95_ms: maxLatency,
      require_operational: requireOperational,
      exclude_deprecated: excludeDeprecated,
    },
    candidates_considered: scratch.length,
    data_freshness: {
      pricing: pricing.lastUpdated ?? null,
      benchmarks: benchmarks.lastUpdated ?? null,
      probe: probeAnchor,
      status: statusAnchor,
      usage_rankings: USAGE_RANKINGS_LAST_UPDATED,
      benchmark_registry: BENCHMARK_REGISTRY_LAST_UPDATED,
    },
    claim:
      'TensorFeed ranks live AI model choices by fusing pricing, benchmark capability discounted for contamination, real production usage, measured latency, and live operational status. The verdict is a ranking over public signals with an AFTA-signed receipt over the inputs, not a guarantee of any provider SLA.',
    notes,
    attribution: {
      sources: [
        'TensorFeed model pricing catalog',
        'TensorFeed benchmark scores + benchmark registry',
        'TensorFeed active latency probes',
        'TensorFeed status + Haiku incident triage',
        'OpenRouter public usage rankings',
        'Provider model deprecation notices',
      ],
      license:
        'Underlying pricing, benchmark, usage, and status data are public or TensorFeed-measured. The cross-source fusion, contamination-discounted quality, and the route verdict are TensorFeed editorial work.',
    },
  };
}

// ─── Loader: read live data and compute ────────────────────────────

export async function computeRouteVerdict(env: Env, options: RouteVerdictOptions): Promise<RouteVerdictResult> {
  const [pricing, benchmarks, services, probe, triage] = await Promise.all([
    env.TENSORFEED_CACHE.get('models', 'json') as Promise<PricingData | null>,
    env.TENSORFEED_CACHE.get('benchmarks', 'json') as Promise<BenchmarksData | null>,
    env.TENSORFEED_STATUS.get('services', 'json') as Promise<ServiceStatus[] | null>,
    getLatestSummary(env),
    getIncidentTriageSnapshot(env),
  ]);

  return buildRouteVerdict(
    {
      pricing,
      benchmarks,
      services,
      probe,
      triage,
      usage: USAGE_RANKINGS,
      benchmarkRegistry: BENCHMARK_REGISTRY,
      deprecations: MODEL_DEPRECATIONS,
    },
    options,
    new Date(),
  );
}

/**
 * IP-based daily rate limit for the free /api/preview/route-verdict
 * preview. Mirrors checkRoutingPreviewRateLimit in routing.ts with a
 * distinct KV key so the two previews do not share a budget. 1 read plus
 * (0 or 1) writes per call; the write is skipped under the kill switch.
 */
export async function checkRouteVerdictPreviewRateLimit(
  env: Env,
  ip: string,
  max = 10,
): Promise<{ allowed: boolean; remaining: number; limit: number }> {
  const date = new Date().toISOString().slice(0, 10);
  const key = `rate:route-verdict-preview:${date}:${ip}`;
  const current = (await env.TENSORFEED_CACHE.get(key, 'json')) as { count: number } | null;
  const count = current?.count ?? 0;
  if (count >= max) return { allowed: false, remaining: 0, limit: max };
  await safePut(env, env.TENSORFEED_CACHE, key, JSON.stringify({ count: count + 1 }), { expirationTtl: 60 * 60 * 48 });
  return { allowed: true, remaining: max - count - 1, limit: max };
}
