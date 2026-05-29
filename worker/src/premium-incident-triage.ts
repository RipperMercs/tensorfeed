/**
 * Premium incident-triage filter + rollup.
 *
 * Derives a filtered + ranked view over the daily Haiku-triaged
 * incident snapshot at `incident-triage:current`. The free endpoint
 * returns the latest 25 cards. This premium endpoint serves the full
 * cohort + filters + rollups:
 *
 *   - Filter by provider (substring case-insensitive)
 *   - Filter by impact_classification (exact match)
 *   - Filter by recommended_action (exact match)
 *   - Filter by capability (a card matches when its affected_capabilities
 *     array contains the requested capability)
 *   - Filter ongoing_only (boolean) to show open incidents only
 *
 * Sort priority: impact_classification desc (critical > major > minor >
 * informational), recommended_action desc (escalate > failover_now >
 * retry_later > monitor > no_action), then started_at desc.
 *
 * Cost: 1 credit. Bazaar Wave 12 pilot.
 */

import type {
  IncidentTriageSnapshot,
  IncidentTriageCard,
  ImpactClassification,
  RecommendedAction,
  AffectedCapability,
} from './incident-triage-generator';

// ─── Filter ────────────────────────────────────────────────────────

export interface TriageFilter {
  provider: string | null;
  impact: ImpactClassification | null;
  recommended_action: RecommendedAction | null;
  capability: AffectedCapability | null;
  ongoing_only: boolean;
}

const IMPACT_LEVELS_LOWER: ReadonlyArray<ImpactClassification> = ['informational', 'minor', 'major', 'critical'];
const RECOMMENDED_ACTIONS_LOWER: ReadonlyArray<RecommendedAction> = ['no_action', 'monitor', 'retry_later', 'failover_now', 'escalate'];
const AFFECTED_CAPABILITIES_LOWER: ReadonlyArray<AffectedCapability> = [
  'inference', 'training', 'embeddings', 'console', 'billing', 'fine-tuning', 'api-keys', 'tooling',
];

const IMPACT_ORDER: Record<ImpactClassification, number> = {
  informational: 0, minor: 1, major: 2, critical: 3,
};
const ACTION_ORDER: Record<RecommendedAction, number> = {
  no_action: 0, monitor: 1, retry_later: 2, failover_now: 3, escalate: 4,
};

export function parseProvider(raw: string | null): string | null {
  if (raw === null) return null;
  const t = raw.trim();
  return t || null;
}

export function parseImpact(raw: string | null): ImpactClassification | null {
  if (raw === null) return null;
  const t = raw.trim().toLowerCase();
  return (IMPACT_LEVELS_LOWER as ReadonlyArray<string>).includes(t) ? (t as ImpactClassification) : null;
}

export function parseRecommendedAction(raw: string | null): RecommendedAction | null {
  if (raw === null) return null;
  const t = raw.trim().toLowerCase();
  return (RECOMMENDED_ACTIONS_LOWER as ReadonlyArray<string>).includes(t) ? (t as RecommendedAction) : null;
}

export function parseCapability(raw: string | null): AffectedCapability | null {
  if (raw === null) return null;
  const t = raw.trim().toLowerCase();
  return (AFFECTED_CAPABILITIES_LOWER as ReadonlyArray<string>).includes(t) ? (t as AffectedCapability) : null;
}

export function parseOngoingOnly(raw: string | null): boolean {
  if (raw === null) return false;
  const v = raw.trim().toLowerCase();
  return v === '1' || v === 'true' || v === 'yes';
}

// ─── Response ──────────────────────────────────────────────────────

export interface TriageResponse {
  ok: true;
  capturedAt: string;
  snapshot_captured_at: string;
  source: 'tensorfeed.ai status incidents + Claude Haiku 4.5';
  filter: {
    provider: string | null;
    impact: ImpactClassification | null;
    recommended_action: RecommendedAction | null;
    capability: AffectedCapability | null;
    ongoing_only: boolean;
  };
  cohort: {
    incidents_considered: number;
    cards_in_snapshot: number;
    cards_filtered: number;
    ongoing_in_filtered: number;
  };
  cards: IncidentTriageCard[];
  summary: {
    by_provider: Record<string, number>;
    by_impact: Record<ImpactClassification, number>;
    by_recommended_action: Record<RecommendedAction, number>;
    by_capability: Record<AffectedCapability, number>;
    cards_with_failover_action: number;
  };
  attribution: {
    source: string;
    license: string;
    notes: string;
  };
}

export function buildTriageResponse(
  snapshot: IncidentTriageSnapshot,
  filter: TriageFilter,
): TriageResponse {
  const providerNeedle = filter.provider?.toLowerCase();

  const filtered = snapshot.cards.filter((c) => {
    if (providerNeedle && !c.provider.toLowerCase().includes(providerNeedle)) return false;
    if (filter.impact && c.impact_classification !== filter.impact) return false;
    if (filter.recommended_action && c.recommended_action !== filter.recommended_action) return false;
    if (filter.capability && !c.affected_capabilities.includes(filter.capability)) return false;
    if (filter.ongoing_only && !c.ongoing) return false;
    return true;
  });

  filtered.sort((a, b) => {
    const i = IMPACT_ORDER[b.impact_classification] - IMPACT_ORDER[a.impact_classification];
    if (i !== 0) return i;
    const r = ACTION_ORDER[b.recommended_action] - ACTION_ORDER[a.recommended_action];
    if (r !== 0) return r;
    return (b.started_at || '').localeCompare(a.started_at || '');
  });

  const by_provider: Record<string, number> = {};
  const by_impact: Record<ImpactClassification, number> = {
    informational: 0, minor: 0, major: 0, critical: 0,
  };
  const by_recommended_action: Record<RecommendedAction, number> = {
    no_action: 0, monitor: 0, retry_later: 0, failover_now: 0, escalate: 0,
  };
  const by_capability: Record<AffectedCapability, number> = {
    inference: 0, training: 0, embeddings: 0, console: 0, billing: 0,
    'fine-tuning': 0, 'api-keys': 0, tooling: 0,
  };
  let cards_with_failover_action = 0;
  let ongoing_in_filtered = 0;

  for (const c of filtered) {
    by_provider[c.provider] = (by_provider[c.provider] ?? 0) + 1;
    by_impact[c.impact_classification]++;
    by_recommended_action[c.recommended_action]++;
    for (const cap of c.affected_capabilities) by_capability[cap]++;
    if (c.recommended_action === 'failover_now' || c.recommended_action === 'escalate') cards_with_failover_action++;
    if (c.ongoing) ongoing_in_filtered++;
  }

  return {
    ok: true,
    capturedAt: snapshot.capturedAt,
    snapshot_captured_at: snapshot.capturedAt,
    source: 'tensorfeed.ai status incidents + Claude Haiku 4.5',
    filter,
    cohort: {
      incidents_considered: snapshot.incidents_considered,
      cards_in_snapshot: snapshot.cards.length,
      cards_filtered: filtered.length,
      ongoing_in_filtered,
    },
    cards: filtered,
    summary: {
      by_provider,
      by_impact,
      by_recommended_action,
      by_capability,
      cards_with_failover_action,
    },
    attribution: {
      source: 'TensorFeed.ai status polling + Claude Haiku 4.5 (Anthropic). Each card cites the originating incident_id; the underlying status page is the authoritative source.',
      license: 'Derivative agent-facing summary over public provider status pages. We never republish full incident-update text; cards are conservative classifications for agent decision support.',
      notes: 'Triage cards are regenerated every 2 hours at :15 UTC. Per-incident KV cache (24h TTL) means re-runs reuse Haiku output. Sort priority: impact desc > recommended_action desc > started_at desc.',
    },
  };
}
