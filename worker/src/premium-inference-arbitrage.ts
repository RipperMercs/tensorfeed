/**
 * Premium inference-provider arbitrage analytics.
 *
 * Derived metrics over the curated `inference-providers.ts` matrix: for
 * every model, surfaces the cross-provider price spread (cheapest vs
 * median vs most-expensive) and the absolute savings_pct an agent leaves
 * on the table by picking the wrong host. Plus per-provider rollups
 * (how often cheapest, how often top-TPS, value score) and cross-cutting
 * arbitrage highlights (largest spread, fastest-cheap pair).
 *
 * Free `/api/inference-providers` and `/api/inference-providers/cheapest`
 * already serve the raw matrix + a single-model cheapest lookup. This
 * endpoint is the "where to migrate workloads + which provider is best
 * by what metric" question, answered across the whole matrix in one
 * paid call.
 *
 * Served at `/api/premium/inference-providers/arbitrage`. 1 credit.
 * Pure compute over the registry (NULL_SLA freshness).
 *
 * Free-tier offers (inputPrice + outputPrice both 0) are tracked but
 * excluded from the cheapest-paid statistics; they appear in a separate
 * `free_tier_offers` array so agents can see prototyping options
 * without polluting the price-spread math.
 */

import {
  INFERENCE_MATRIX,
  TRACKED_PROVIDERS,
  type ModelMatrix,
  type ProviderOffer,
} from './inference-providers';
import type { Env } from './types';
import { safePut } from './kill-switch';

// ─── Filter shape ──────────────────────────────────────────────────

export interface ArbitrageFilter {
  /** Substring (case-insensitive) match against `family` (Meta, DeepSeek, Mistral, Alibaba, Microsoft, ...). null = all. */
  family: string | null;
  /** Minimum savings_pct to include a model in the headline `top_arbitrage` array. Default 20. Clamped to [0, 100]. */
  min_savings_pct: number;
}

export const DEFAULT_MIN_SAVINGS_PCT = 20;

export function parseFamily(raw: string | null): string | null {
  if (raw === null) return null;
  const trimmed = raw.trim();
  if (!trimmed) return null;
  return trimmed;
}

export function parseMinSavingsPct(raw: string | null): number {
  if (raw === null || raw === '') return DEFAULT_MIN_SAVINGS_PCT;
  const n = parseFloat(raw);
  if (!Number.isFinite(n)) return DEFAULT_MIN_SAVINGS_PCT;
  if (n < 0) return 0;
  if (n > 100) return 100;
  return n;
}

// ─── Per-model arbitrage row ───────────────────────────────────────

export interface ModelArbitrageRow {
  modelId: string;
  modelName: string;
  family: string;
  paramsB: number | null;
  offer_count_paid: number;
  free_tier_offers: Array<{ provider: string; url: string; note: string }>;
  cheapest_paid: { provider: string; blendedPrice: number } | null;
  most_expensive_paid: { provider: string; blendedPrice: number } | null;
  median_paid_blended: number | null;
  spread_usd: number | null;
  savings_pct: number | null;
  fastest_tps: { provider: string; outputTPS: number } | null;
  /** Recommended pick when an agent wants the lowest blended price AND has any TPS preference. */
  cheapest_with_tps: { provider: string; blendedPrice: number; outputTPS: number } | null;
}

function median(nums: number[]): number | null {
  if (nums.length === 0) return null;
  const sorted = [...nums].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  if (sorted.length % 2 === 0) {
    return (sorted[mid - 1] + sorted[mid]) / 2;
  }
  return sorted[mid];
}

export function buildModelArbitrageRow(m: ModelMatrix): ModelArbitrageRow {
  const paid: ProviderOffer[] = [];
  const free: ProviderOffer[] = [];
  for (const o of m.offers) {
    if (o.inputPrice === 0 && o.outputPrice === 0) free.push(o);
    else paid.push(o);
  }

  let cheapest_paid: ModelArbitrageRow['cheapest_paid'] = null;
  let most_expensive_paid: ModelArbitrageRow['most_expensive_paid'] = null;
  let spread_usd: number | null = null;
  let savings_pct: number | null = null;
  let median_paid_blended: number | null = null;

  if (paid.length > 0) {
    const sortedPaid = [...paid].sort((a, b) => a.blendedPrice - b.blendedPrice);
    cheapest_paid = { provider: sortedPaid[0].provider, blendedPrice: sortedPaid[0].blendedPrice };
    most_expensive_paid = {
      provider: sortedPaid[sortedPaid.length - 1].provider,
      blendedPrice: sortedPaid[sortedPaid.length - 1].blendedPrice,
    };
    spread_usd = most_expensive_paid.blendedPrice - cheapest_paid.blendedPrice;
    if (most_expensive_paid.blendedPrice > 0) {
      savings_pct = Math.round((spread_usd / most_expensive_paid.blendedPrice) * 10000) / 100;
    }
    median_paid_blended = median(paid.map((p) => p.blendedPrice));
  }

  // TPS only counts on paid offers (free tier rate-limits make TPS misleading).
  const tpsOffers = paid.filter((o) => o.outputTPS !== null && o.outputTPS > 0) as Array<
    ProviderOffer & { outputTPS: number }
  >;
  const fastest_tps =
    tpsOffers.length > 0
      ? (() => {
          const top = tpsOffers.reduce((acc, o) => (o.outputTPS > acc.outputTPS ? o : acc), tpsOffers[0]);
          return { provider: top.provider, outputTPS: top.outputTPS };
        })()
      : null;

  // Cheapest with measurable TPS: the cheapest paid offer that ALSO reports TPS.
  const cheapest_with_tps =
    tpsOffers.length > 0
      ? (() => {
          const sortedByPrice = [...tpsOffers].sort((a, b) => a.blendedPrice - b.blendedPrice);
          return {
            provider: sortedByPrice[0].provider,
            blendedPrice: sortedByPrice[0].blendedPrice,
            outputTPS: sortedByPrice[0].outputTPS,
          };
        })()
      : null;

  return {
    modelId: m.modelId,
    modelName: m.modelName,
    family: m.family,
    paramsB: m.paramsB,
    offer_count_paid: paid.length,
    free_tier_offers: free.map((f) => ({ provider: f.provider, url: f.url, note: f.note })),
    cheapest_paid,
    most_expensive_paid,
    median_paid_blended,
    spread_usd,
    savings_pct,
    fastest_tps,
    cheapest_with_tps,
  };
}

// ─── Provider rollup ───────────────────────────────────────────────

export interface ProviderRollup {
  provider: string;
  appearances_paid: number;
  cheapest_count: number;
  top_tps_count: number;
  free_tier_count: number;
  /**
   * Heuristic value score: cheapest_count + 0.5 * top_tps_count, normalized
   * to the provider with the highest raw score. 0 to 100. Tie-broken by
   * appearances_paid.
   */
  value_score: number;
}

export function buildProviderRollups(rows: ModelArbitrageRow[]): ProviderRollup[] {
  const byProvider = new Map<
    string,
    Omit<ProviderRollup, 'value_score'>
  >();
  // Seed every tracked provider so zero-appearance providers still surface.
  for (const p of TRACKED_PROVIDERS) {
    byProvider.set(p, {
      provider: p,
      appearances_paid: 0,
      cheapest_count: 0,
      top_tps_count: 0,
      free_tier_count: 0,
    });
  }
  for (const row of rows) {
    if (row.cheapest_paid) {
      const r = byProvider.get(row.cheapest_paid.provider);
      if (r) r.cheapest_count++;
    }
    if (row.fastest_tps) {
      const r = byProvider.get(row.fastest_tps.provider);
      if (r) r.top_tps_count++;
    }
    for (const free of row.free_tier_offers) {
      const r = byProvider.get(free.provider);
      if (r) r.free_tier_count++;
    }
  }
  // Count paid appearances directly from the matrix to avoid double-counting
  // through the row builder (cheapest/most-expensive could coincide on 1-offer models).
  for (const m of INFERENCE_MATRIX) {
    for (const o of m.offers) {
      if (o.inputPrice === 0 && o.outputPrice === 0) continue;
      const r = byProvider.get(o.provider);
      if (r) r.appearances_paid++;
    }
  }
  // Compute raw, then normalize to 0-100.
  const raw = Array.from(byProvider.values()).map((r) => ({
    ...r,
    raw: r.cheapest_count + 0.5 * r.top_tps_count,
  }));
  const maxRaw = raw.reduce((acc, r) => (r.raw > acc ? r.raw : acc), 0);
  const rollups: ProviderRollup[] = raw.map((r) => ({
    provider: r.provider,
    appearances_paid: r.appearances_paid,
    cheapest_count: r.cheapest_count,
    top_tps_count: r.top_tps_count,
    free_tier_count: r.free_tier_count,
    value_score:
      maxRaw > 0
        ? Math.round((r.raw / maxRaw) * 100)
        : 0,
  }));
  // Sort by value_score desc, then appearances_paid desc, then provider name asc.
  rollups.sort((a, b) => {
    if (b.value_score !== a.value_score) return b.value_score - a.value_score;
    if (b.appearances_paid !== a.appearances_paid) return b.appearances_paid - a.appearances_paid;
    return a.provider.localeCompare(b.provider);
  });
  return rollups;
}

// ─── Top response ──────────────────────────────────────────────────

export interface ArbitrageResponse {
  ok: true;
  capturedAt: string;
  filter: { family: string | null; min_savings_pct: number };
  matrix_last_updated: string;
  models_in_matrix: number;
  tracked_providers: string[];
  models: ModelArbitrageRow[];
  /** Models above the min_savings_pct threshold, sorted by savings_pct desc. */
  top_arbitrage: ModelArbitrageRow[];
  provider_rollup: ProviderRollup[];
  attribution: {
    source: string;
    license: string;
    notes: string;
  };
}

export function buildArbitrage(
  filter: ArbitrageFilter,
  now: Date,
  matrixOverride?: ReadonlyArray<ModelMatrix>,
  lastUpdatedOverride?: string,
): ArbitrageResponse {
  // Lazy import to keep cycles tame in tests.
  const matrix = matrixOverride ?? INFERENCE_MATRIX;
  const familyNeedle = filter.family?.toLowerCase();

  const filtered = matrix.filter(
    (m) => !familyNeedle || m.family.toLowerCase().includes(familyNeedle),
  );

  const rows = filtered.map(buildModelArbitrageRow);

  const top_arbitrage = rows
    .filter((r) => r.savings_pct !== null && r.savings_pct >= filter.min_savings_pct)
    .sort((a, b) => (b.savings_pct ?? 0) - (a.savings_pct ?? 0));

  // Provider rollup uses ALL rows (not just top_arbitrage) but respects the
  // family filter so a "?family=Meta" call gets Meta-only provider rankings.
  const provider_rollup = buildProviderRollups(rows);

  // Default lastUpdated to the import-time const. Tests can override.
  const matrix_last_updated = lastUpdatedOverride ?? (matrixOverride ? '' : 'see INFERENCE_LAST_UPDATED');

  return {
    ok: true,
    capturedAt: now.toISOString(),
    filter: { family: filter.family, min_savings_pct: filter.min_savings_pct },
    matrix_last_updated,
    models_in_matrix: rows.length,
    tracked_providers: [...TRACKED_PROVIDERS],
    models: rows,
    top_arbitrage,
    provider_rollup,
    attribution: {
      source: 'TensorFeed.ai inference-providers matrix',
      license:
        'Provider published pricing pages are referenced inline (each ProviderOffer.url). The unified cross-provider matrix and derived savings_pct / value_score classification is TensorFeed editorial work.',
      notes:
        'Matrix curated by hand; updates land via PR to worker/src/inference-providers.ts. Free-tier offers (rate-limited prototyping access on providers like GitHub Models) are excluded from cheapest/spread math and surfaced under each model\'s free_tier_offers array.',
    },
  };
}

// ─── Free taste (leak-guarded preview) ──────────────────────────────
//
// Discovery sibling of /api/premium/inference-providers/arbitrage. Reveals the
// single largest cross-provider price spread by MAGNITUDE (model, savings_pct,
// spread) and how many models clear the threshold, so an agent can see there is
// money on the table. The actionable answer (which provider is cheapest /
// fastest per model, the full table, the provider value-score rollup) stays
// paid. Pure: no I/O.

export interface ArbitragePreview {
  ok: true;
  preview: true;
  capturedAt: string;
  matrix_last_updated: string;
  models_in_matrix: number;
  providers_tracked: number;
  top_opportunity: {
    modelName: string;
    family: string;
    savings_pct: number;
    spread_usd: number;
    offer_count_paid: number;
  } | null;
  opportunities_above_threshold: number;
  min_savings_pct: number;
  attribution: ArbitrageResponse['attribution'];
  unlock: {
    full: string;
    note: string;
    withheld: string[];
  };
}

export function previewArbitrage(result: ArbitrageResponse): ArbitragePreview {
  const top = result.top_arbitrage[0] ?? null;
  const top_opportunity =
    top && top.savings_pct !== null && top.spread_usd !== null
      ? {
          modelName: top.modelName,
          family: top.family,
          savings_pct: top.savings_pct,
          spread_usd: top.spread_usd,
          offer_count_paid: top.offer_count_paid,
        }
      : null;
  return {
    ok: true,
    preview: true,
    capturedAt: result.capturedAt,
    matrix_last_updated: result.matrix_last_updated,
    models_in_matrix: result.models_in_matrix,
    providers_tracked: result.tracked_providers.length,
    top_opportunity,
    opportunities_above_threshold: result.top_arbitrage.length,
    min_savings_pct: result.filter.min_savings_pct,
    attribution: result.attribution,
    unlock: {
      full: '/api/premium/inference-providers/arbitrage',
      note: 'Free preview: the single largest price spread by magnitude and how many models clear the savings threshold. The paid call (1 credit, $0.02) returns the full per-model arbitrage table (which provider is cheapest, most expensive, and fastest, plus the cheapest-with-TPS pick for every model), the per-provider value-score rollup, and the migration picks. Optional ?family= and ?min_savings_pct=.',
      withheld: [
        'which provider is cheapest, most expensive, and fastest for each model',
        'the full per-model arbitrage table with spreads and median prices',
        'the per-provider value-score rollup and rankings',
        'every arbitrage opportunity beyond the single headline magnitude',
      ],
    },
  };
}

/**
 * IP-based daily rate limit for the free /api/preview/inference-providers/arbitrage
 * taste. Distinct KV key; mirrors the other preview limiters.
 */
export async function checkArbitragePreviewRateLimit(
  env: Env,
  ip: string,
  max = 10,
): Promise<{ allowed: boolean; remaining: number; limit: number }> {
  const date = new Date().toISOString().slice(0, 10);
  const key = `rate:arbitrage-preview:${date}:${ip}`;
  const current = (await env.TENSORFEED_CACHE.get(key, 'json')) as { count: number } | null;
  const count = current?.count ?? 0;
  if (count >= max) return { allowed: false, remaining: 0, limit: max };
  await safePut(env, env.TENSORFEED_CACHE, key, JSON.stringify({ count: count + 1 }), { expirationTtl: 60 * 60 * 48 });
  return { allowed: true, remaining: max - count - 1, limit: max };
}
