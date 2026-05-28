/**
 * Premium Benchmark Trust Verdict.
 *
 * The research/eval agent's white-space: before an agent cites or routes
 * on "Model X scores 92 on benchmark Y," is that benchmark still a
 * trustworthy signal of capability, or is it saturated, contaminated, or
 * near its ceiling so a high score is a floor, not a differentiator?
 *
 * Pure, deterministic compute over data TensorFeed already holds:
 *   - benchmark-registry.ts: per-benchmark contaminationRisk + status
 *     (active/saturated/deprecated) + frontierScore + scoreRange, all
 *     editorial-but-static, refreshed on redeploy.
 *   - the daily `benchmarks` KV: per-model scores, used to compute frontier
 *     compression (how bunched the top scores are = saturated in practice)
 *     for the five benchmarks we ingest model scores on.
 *
 * Engine-fit: no model judges anything at request time. The trust score is
 * a deterministic product of the registry flags, a best-effort ceiling
 * proximity, and the computed compression. Unparseable inputs never
 * penalize (they fall to a neutral factor), so the verdict never
 * false-discounts a benchmark it could not measure.
 *
 * Free sibling: /api/preview/benchmark-trust-verdict (the trust band +
 * score only). Premium: full signals + recommendation + an AFTA-signed
 * receipt. 1 credit, strict-premium.
 */

import type { Env } from './types';
import { safePut } from './kill-switch';
import { BENCHMARK_REGISTRY, BENCHMARK_REGISTRY_LAST_UPDATED, type BenchmarkMeta } from './benchmark-registry';

// ─── Local shape for the `benchmarks` KV blob ──────────────────────

interface BenchmarkModelEntry {
  model: string;
  provider: string;
  scores: Record<string, number>; // underscored keys: human_eval, swe_bench, ...
}
interface BenchmarksData {
  lastUpdated?: string;
  models: BenchmarkModelEntry[];
}

// Registry id -> the underscored score key in the `benchmarks` KV, for the
// benchmarks we ingest per-model scores on. Absent = no compression signal.
const REGISTRY_ID_TO_SCORE_KEY: Record<string, string> = {
  humaneval: 'human_eval',
  'swe-bench-verified': 'swe_bench',
  'mmlu-pro': 'mmlu_pro',
  'gpqa-diamond': 'gpqa_diamond',
  math: 'math',
};

const CONTAMINATION_FACTOR: Record<BenchmarkMeta['contaminationRisk'], number> = {
  low: 1.0,
  medium: 0.7,
  high: 0.4,
};
const STATUS_FACTOR: Record<BenchmarkMeta['status'], number> = {
  active: 1.0,
  saturated: 0.5,
  deprecated: 0.2,
};

export type TrustBand = 'reliable' | 'use_with_caution' | 'saturated' | 'contaminated' | 'deprecated';
export type CeilingProximity = 'headroom' | 'high' | 'at_ceiling' | 'unknown';
export type Compression = 'discriminating' | 'moderate' | 'compressed' | 'unknown';

export interface BenchmarkTrustVerdict {
  id: string;
  name: string;
  category: BenchmarkMeta['category'];
  status: BenchmarkMeta['status'];
  contamination_risk: BenchmarkMeta['contaminationRisk'];
  frontier_score: string;
  score_range: string;
  trust_band: TrustBand;
  trust_score: number; // 0..100
  signals: {
    ceiling_proximity: CeilingProximity;
    frontier_compression: Compression;
    top_score_spread: number | null; // points between the top scores, when model scores exist
    models_scored: number; // how many models have a score on this benchmark
  };
  recommendation: string;
  leaderboard_url: string | null;
}

export interface BenchmarkTrustOptions {
  benchmark?: string | null; // registry id or name
  category?: string | null;
}

export interface BenchmarkTrustResult {
  ok: true;
  capturedAt: string | null;
  filter: { benchmark: string | null; category: string | null };
  count: number;
  verdicts: BenchmarkTrustVerdict[];
  claim: string;
  source_license: string;
  source_attribution: string;
}

// ─── Parsing helpers (best-effort, neutral on failure) ─────────────

/** First number in a string, or null. "~28/30" -> 28, "~92%" -> 92. */
function firstNumber(s: string): number | null {
  const m = s.match(/-?\d+(?:\.\d+)?/);
  return m ? parseFloat(m[0]) : null;
}

/** Range max from a scoreRange like "0-100% accuracy" -> 100, "0-30 correct" -> 30. */
function rangeMax(s: string): number | null {
  const nums = (s.match(/\d+(?:\.\d+)?/g) ?? []).map(parseFloat);
  if (nums.length >= 2) return nums[1];
  if (nums.length === 1) return nums[0];
  return null;
}

function ceilingProximity(frontierScore: string, scoreRange: string): { proximity: CeilingProximity; factor: number } {
  const fs = firstNumber(frontierScore);
  const max = rangeMax(scoreRange);
  if (fs === null || max === null || max <= 0) return { proximity: 'unknown', factor: 1.0 };
  const ratio = fs / max;
  if (ratio >= 0.9) return { proximity: 'at_ceiling', factor: 0.6 };
  if (ratio >= 0.75) return { proximity: 'high', factor: 0.85 };
  return { proximity: 'headroom', factor: 1.0 };
}

function frontierCompression(scores: number[]): { compression: Compression; factor: number; spread: number | null } {
  const valid = scores.filter((n) => typeof n === 'number' && n > 0).sort((a, b) => b - a);
  if (valid.length < 3) return { compression: 'unknown', factor: 1.0, spread: null };
  const top = valid.slice(0, 5);
  const spread = top[0] - top[top.length - 1];
  if (spread < 3) return { compression: 'compressed', factor: 0.7, spread };
  if (spread < 8) return { compression: 'moderate', factor: 0.9, spread };
  return { compression: 'discriminating', factor: 1.0, spread };
}

function round1(n: number): number {
  return Math.round(n * 10) / 10;
}

// ─── The pure verdict builder ──────────────────────────────────────

export function buildBenchmarkTrust(
  registry: ReadonlyArray<BenchmarkMeta>,
  benchmarks: BenchmarksData | null,
  options: BenchmarkTrustOptions,
): BenchmarkTrustResult {
  const benchNeedle = options.benchmark ? options.benchmark.toLowerCase().trim() : null;
  const catNeedle = options.category ? options.category.toLowerCase().trim() : null;

  // Per-benchmark score arrays from the `benchmarks` KV, keyed by score key.
  const scoresByKey = new Map<string, number[]>();
  if (benchmarks) {
    for (const m of benchmarks.models) {
      for (const [k, v] of Object.entries(m.scores)) {
        if (typeof v === 'number') {
          const arr = scoresByKey.get(k) ?? [];
          arr.push(v);
          scoresByKey.set(k, arr);
        }
      }
    }
  }

  // Best active, low-contamination alternative per category, for the
  // "use this instead" recommendation.
  function bestAlternative(category: BenchmarkMeta['category'], excludeId: string): string | null {
    const candidates = registry.filter(
      (b) => b.category === category && b.id !== excludeId && b.status === 'active' && b.contaminationRisk === 'low',
    );
    return candidates.length > 0 ? candidates[0].name : null;
  }

  const filtered = registry.filter((b) => {
    if (benchNeedle && b.id.toLowerCase() !== benchNeedle && b.name.toLowerCase() !== benchNeedle) return false;
    if (catNeedle && b.category.toLowerCase() !== catNeedle) return false;
    return true;
  });

  const verdicts: BenchmarkTrustVerdict[] = filtered.map((b) => {
    const cFactor = CONTAMINATION_FACTOR[b.contaminationRisk];
    const sFactor = STATUS_FACTOR[b.status];
    const ceiling = ceilingProximity(b.frontierScore, b.scoreRange);

    const scoreKey = REGISTRY_ID_TO_SCORE_KEY[b.id];
    const scores = scoreKey ? scoresByKey.get(scoreKey) ?? [] : [];
    const comp = frontierCompression(scores);

    const trustScore = Math.max(0, Math.min(100, round1(100 * cFactor * sFactor * ceiling.factor * comp.factor)));

    let band: TrustBand;
    if (b.status === 'deprecated') band = 'deprecated';
    else if (b.contaminationRisk === 'high') band = 'contaminated';
    else if (b.status === 'saturated' || ceiling.proximity === 'at_ceiling' || comp.compression === 'compressed') band = 'saturated';
    else if (trustScore >= 80) band = 'reliable';
    else band = 'use_with_caution';

    const alt = bestAlternative(b.category, b.id);
    const reasons: string[] = [];
    if (b.contaminationRisk === 'high') reasons.push('high training-contamination risk');
    else if (b.contaminationRisk === 'medium') reasons.push('medium contamination risk');
    if (b.status === 'saturated') reasons.push('marked saturated');
    if (b.status === 'deprecated') reasons.push('deprecated');
    if (ceiling.proximity === 'at_ceiling') reasons.push('frontier score is near the ceiling');
    if (comp.compression === 'compressed') reasons.push(`top scores are bunched within ${comp.spread} points`);

    let recommendation: string;
    if (band === 'reliable') {
      recommendation = `Trustworthy current signal for ${b.category}. Treat scores at face value. Check ${b.leaderboardUrl ? 'the leaderboard' : 'the source'} for freshness.`;
    } else {
      const why = reasons.length > 0 ? reasons.join(', ') : 'limited discriminating power';
      const instead = alt ? ` Prefer ${alt} for current ${b.category} signal.` : '';
      recommendation = `Down-weight scores on this benchmark (${why}). A high score is closer to a capability floor than a differentiator.${instead}`;
    }

    return {
      id: b.id,
      name: b.name,
      category: b.category,
      status: b.status,
      contamination_risk: b.contaminationRisk,
      frontier_score: b.frontierScore,
      score_range: b.scoreRange,
      trust_band: band,
      trust_score: trustScore,
      signals: {
        ceiling_proximity: ceiling.proximity,
        frontier_compression: comp.compression,
        top_score_spread: comp.spread,
        models_scored: scores.length,
      },
      recommendation,
      leaderboard_url: b.leaderboardUrl,
    };
  });

  // Sort: least trustworthy first (the actionable down-weights), then by name.
  verdicts.sort((a, b) => (a.trust_score - b.trust_score) || a.name.localeCompare(b.name));

  return {
    ok: true,
    capturedAt: benchmarks?.lastUpdated ?? null,
    filter: { benchmark: options.benchmark ?? null, category: options.category ?? null },
    count: verdicts.length,
    verdicts,
    claim:
      'TensorFeed scores how trustworthy each AI benchmark is as a current capability signal, fusing its contamination risk and saturation status with the live spread of the top model scores (frontier compression). The verdict is a deterministic ranking over public benchmark metadata, not a re-run of any benchmark; treat the linked leaderboard as the freshness authority.',
    source_license: 'Benchmark metadata is editorial over public leaderboards and papers; the trust scoring and frontier-compression computation is TensorFeed editorial work.',
    source_attribution: 'TensorFeed benchmark registry + TensorFeed benchmark scores',
  };
}

// ─── Loader ────────────────────────────────────────────────────────

export async function computeBenchmarkTrust(env: Env, options: BenchmarkTrustOptions): Promise<BenchmarkTrustResult> {
  const benchmarks = (await env.TENSORFEED_CACHE.get('benchmarks', 'json')) as BenchmarksData | null;
  return buildBenchmarkTrust(BENCHMARK_REGISTRY, benchmarks, options);
}

export { BENCHMARK_REGISTRY_LAST_UPDATED };

/** IP-based daily rate limit for the free /api/preview/benchmark-trust-verdict preview. */
export async function checkBenchmarkTrustPreviewRateLimit(
  env: Env,
  ip: string,
  max = 10,
): Promise<{ allowed: boolean; remaining: number; limit: number }> {
  const date = new Date().toISOString().slice(0, 10);
  const key = `rate:benchmark-trust-preview:${date}:${ip}`;
  const current = (await env.TENSORFEED_CACHE.get(key, 'json')) as { count: number } | null;
  const count = current?.count ?? 0;
  if (count >= max) return { allowed: false, remaining: 0, limit: max };
  await safePut(env, env.TENSORFEED_CACHE, key, JSON.stringify({ count: count + 1 }), { expirationTtl: 60 * 60 * 48 });
  return { allowed: true, remaining: max - count - 1, limit: max };
}
