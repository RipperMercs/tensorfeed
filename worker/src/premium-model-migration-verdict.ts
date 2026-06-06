/**
 * Premium model migration verdict.
 *
 * For one model an agent depends on: should it migrate, to what, and what does
 * the move cost. A single-input decision over three sources:
 *   1. The model-deprecation registry (is it sunsetting, by when, replaced by what).
 *   2. Pricing (the blended-cost delta from the current model to the successor).
 *   3. The TFII intelligence snapshot (the capability delta).
 *
 * Verdict: MIGRATE_NOW (sunsetted or within 30 days), MIGRATE_SOON (deprecated
 * with a later sunset), or NO_ACTION (the model is current and not in the
 * deprecation registry). A NO_ACTION result for a recognized current model is a
 * real, charged answer (the agent paid to confirm it does not need to move).
 *
 * Relationship to /api/premium/model-deprecations/timeline: the timeline is the
 * full calendar; this is the per-model decision with the cost and capability
 * deltas of the actual move attached, plus optional deadline reconciliation.
 */

import type { TimelineEntry } from './premium-model-deprecations';
import type { PricingDataLite } from './premium-models-frontier';
import type { IntelligenceSnapshot } from './model-intelligence';

export type MigrationVerdictKind = 'MIGRATE_NOW' | 'MIGRATE_SOON' | 'NO_ACTION';

function normalize(s: string): string {
  return s.toLowerCase().replace(/[^a-z0-9]/g, '');
}

function round2(n: number): number {
  return Math.round(n * 100) / 100;
}

interface PriceInfo {
  blended: number;
  provider: string;
  name: string;
}

export interface MigrationModelRef {
  id: string;
  name: string;
  provider: string | null;
  cost_blended_per_1m: number | null;
  capability_tfii: number | null;
}

export interface MigrationVerdictResult {
  ok: true;
  verdict_kind: 'model_migration';
  verdict: MigrationVerdictKind;
  model: MigrationModelRef;
  deprecation: { status: string; sunset_date: string | null; days_until_sunset: number | null; urgency_band: string } | null;
  successor: MigrationModelRef | null;
  deltas: { cost_blended_per_1m: number | null; cost_pct: number | null; capability_tfii: number | null } | null;
  drop_in: { same_provider: boolean; note: string } | null;
  migration_chain: string[];
  deadline: { date: string; days_from_now: number; sunset_before_deadline: boolean | null } | null;
  recommendation: string;
  sources: Array<{ name: string; url: string; license: string }>;
  notes: string[];
}

export interface MigrationVerdictEmpty {
  ok: false;
  error: 'model_not_recognized';
  model: string;
  hint: string;
}

const SOURCES = [
  { name: 'TensorFeed model-deprecation registry', url: 'https://tensorfeed.ai/api/model-deprecations', license: 'TensorFeed editorial registry over public provider deprecation notices.' },
  { name: 'TensorFeed model pricing', url: 'https://tensorfeed.ai/api/models', license: 'Editorial compilation of public provider pricing; per-provider terms apply.' },
  { name: 'TensorFeed Intelligence Index (TFII)', url: 'https://tensorfeed.ai/api/premium/model-intelligence', license: 'TensorFeed editorial scoring over public benchmark results.' },
];

function buildPriceMap(pricing: PricingDataLite): Map<string, PriceInfo> {
  const m = new Map<string, PriceInfo>();
  for (const provider of pricing.providers ?? []) {
    for (const model of provider.models ?? []) {
      const info: PriceInfo = { blended: (model.inputPrice + model.outputPrice) / 2, provider: provider.name ?? 'unknown', name: model.name };
      m.set(normalize(model.id), info);
      m.set(normalize(model.name), info);
    }
  }
  return m;
}

function buildCapMap(intelligence: IntelligenceSnapshot | null): Map<string, { tfii: number; name: string; provider: string }> {
  const m = new Map<string, { tfii: number; name: string; provider: string }>();
  for (const im of intelligence?.models ?? []) {
    const info = { tfii: im.tfii, name: im.name, provider: im.provider };
    m.set(normalize(im.model_id), info);
    m.set(normalize(im.name), info);
  }
  return m;
}

function refFor(id: string, priceMap: Map<string, PriceInfo>, capMap: Map<string, { tfii: number; name: string; provider: string }>): MigrationModelRef {
  const key = normalize(id);
  const price = priceMap.get(key);
  const cap = capMap.get(key);
  return {
    id,
    name: cap?.name ?? price?.name ?? id,
    provider: cap?.provider ?? price?.provider ?? null,
    cost_blended_per_1m: price ? round2(price.blended) : null,
    capability_tfii: cap ? cap.tfii : null,
  };
}

export interface MigrationSources {
  deprecations: TimelineEntry[];
  pricing: PricingDataLite;
  intelligence: IntelligenceSnapshot | null;
}

export function buildMigrationVerdict(
  model: string,
  deadline: string | null,
  sources: MigrationSources,
  now: Date,
): MigrationVerdictResult | MigrationVerdictEmpty {
  const key = normalize(model);
  const priceMap = buildPriceMap(sources.pricing);
  const capMap = buildCapMap(sources.intelligence);
  const dep = sources.deprecations.find(
    (e) => normalize(e.model) === key || (e.modelDisplay ? normalize(e.modelDisplay) === key : false) || normalize(e.id) === key,
  );

  const currentRef = refFor(model, priceMap, capMap);
  const recognized = !!dep || currentRef.cost_blended_per_1m != null || currentRef.capability_tfii != null;
  if (!recognized) {
    return {
      ok: false,
      error: 'model_not_recognized',
      model,
      hint: 'This model is not in the TensorFeed deprecation registry, pricing catalog, or intelligence snapshot. Pass a tracked model id (see /api/models or /api/model-deprecations).',
    };
  }

  const deadlineBlock = (() => {
    if (!deadline) return null;
    const t = Date.parse(deadline);
    if (!Number.isFinite(t)) return null;
    const days_from_now = Math.floor((t - now.getTime()) / 86400000);
    return { date: deadline, days_from_now, sunset_before_deadline: null as boolean | null };
  })();

  // Healthy current model: no entry in the deprecation registry.
  if (!dep) {
    return {
      ok: true,
      verdict_kind: 'model_migration',
      verdict: 'NO_ACTION',
      model: currentRef,
      deprecation: null,
      successor: null,
      deltas: null,
      drop_in: null,
      migration_chain: [],
      deadline: deadlineBlock,
      recommendation: `${currentRef.name} is a current model with no deprecation on record. No migration is required; re-check before any long-lived commitment.`,
      sources: SOURCES,
      notes: ['NO_ACTION means the model is not in the deprecation registry, not a guarantee it will never be deprecated.'],
    };
  }

  const successorId = dep.replacement ?? (dep.migration_chain.length > 0 ? dep.migration_chain[dep.migration_chain.length - 1] : null);
  const successorRef = successorId ? refFor(successorId, priceMap, capMap) : null;

  let deltas: MigrationVerdictResult['deltas'] = null;
  if (successorRef) {
    const costDelta =
      successorRef.cost_blended_per_1m != null && currentRef.cost_blended_per_1m != null
        ? round2(successorRef.cost_blended_per_1m - currentRef.cost_blended_per_1m)
        : null;
    const costPct =
      costDelta != null && currentRef.cost_blended_per_1m != null && currentRef.cost_blended_per_1m > 0
        ? Math.round((costDelta / currentRef.cost_blended_per_1m) * 1000) / 10
        : null;
    const capDelta =
      successorRef.capability_tfii != null && currentRef.capability_tfii != null
        ? successorRef.capability_tfii - currentRef.capability_tfii
        : null;
    deltas = { cost_blended_per_1m: costDelta, cost_pct: costPct, capability_tfii: capDelta };
  }

  let drop_in: MigrationVerdictResult['drop_in'] = null;
  if (successorRef) {
    const same = currentRef.provider != null && successorRef.provider != null && currentRef.provider === successorRef.provider;
    drop_in = {
      same_provider: same,
      note: same
        ? 'Same provider, so the migration is likely an id swap with minor parameter changes.'
        : 'Different provider, so expect SDK, auth, and parameter changes, not a drop-in swap.',
    };
  }

  const daysUntilSunset = dep.days_until_sunset;
  let verdict: MigrationVerdictKind = 'MIGRATE_SOON';
  if (dep.status === 'sunsetted' || (daysUntilSunset != null && daysUntilSunset <= 30)) verdict = 'MIGRATE_NOW';

  if (deadlineBlock && daysUntilSunset != null) {
    deadlineBlock.sunset_before_deadline = daysUntilSunset < deadlineBlock.days_from_now;
  }

  const successorName = successorRef?.name ?? 'a supported model (none named in the registry)';
  let recommendation = `${currentRef.name} is ${dep.status}${dep.sunsetDate ? `, sunset ${dep.sunsetDate}` : ''}${daysUntilSunset != null ? ` (${daysUntilSunset} days)` : ''}. Migrate to ${successorName}.`;
  if (deltas) {
    const costPhrase =
      deltas.cost_blended_per_1m == null
        ? 'cost delta unavailable'
        : deltas.cost_blended_per_1m === 0
          ? 'same blended cost'
          : deltas.cost_blended_per_1m < 0
            ? `${Math.abs(deltas.cost_blended_per_1m)} per 1M cheaper`
            : `${deltas.cost_blended_per_1m} per 1M pricier`;
    const capPhrase =
      deltas.capability_tfii == null
        ? 'capability delta unavailable'
        : deltas.capability_tfii >= 0
          ? `TFII up ${deltas.capability_tfii}`
          : `TFII down ${Math.abs(deltas.capability_tfii)}`;
    recommendation += ` The successor is ${costPhrase}, ${capPhrase}.`;
  }
  if (deadlineBlock?.sunset_before_deadline) {
    recommendation += ` Sunset lands before your stated deadline; pull the migration forward.`;
  }

  return {
    ok: true,
    verdict_kind: 'model_migration',
    verdict,
    model: currentRef,
    deprecation: { status: dep.status, sunset_date: dep.sunsetDate ?? null, days_until_sunset: daysUntilSunset, urgency_band: dep.urgency_band },
    successor: successorRef,
    deltas,
    drop_in,
    migration_chain: dep.migration_chain,
    deadline: deadlineBlock,
    recommendation,
    sources: SOURCES,
    notes: [
      'Cost and capability deltas are null when the successor is not yet in the pricing catalog or intelligence snapshot; the migration target still holds.',
      'Capability is the TFII headline, contamination and saturation discounted.',
    ],
  };
}
