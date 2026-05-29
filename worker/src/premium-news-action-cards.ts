/**
 * Premium news-action-cards filter + rollup.
 *
 * Derives a filtered + ranked view over the daily Haiku-generated action
 * card snapshot at `action-cards:current` (worker/src/
 * action-cards-generator.ts). The free endpoint returns the latest 25
 * cards. This premium endpoint serves the full cohort + filters +
 * cohort rollups:
 *
 *   - Filter by capability tag (model / pricing / safety / framework /
 *     infrastructure / tooling / policy / ecosystem)
 *   - Filter by minimum impact (cost or security): below_threshold cards
 *     drop from headline rows
 *   - Filter by urgency
 *   - Optional substring filter on title / source
 *
 * Cards sort by an editorial priority: urgency desc, then security_impact
 * desc, then cost_impact desc, then publication date desc.
 *
 * Cost: 1 credit. Bazaar Wave 11 pilot.
 */

import type {
  ActionCardsSnapshot,
  ActionCard,
  CapabilityTag,
  ImpactLevel,
  UrgencyLevel,
} from './action-cards-generator';

// ─── Filter ────────────────────────────────────────────────────────

export interface CardsFilter {
  capability: CapabilityTag | null;
  min_cost_impact: ImpactLevel;
  min_security_impact: ImpactLevel;
  urgency: UrgencyLevel | null;
  query: string | null;        // substring match on title or source
}

const CAPABILITY_TAGS_LOWER: ReadonlyArray<CapabilityTag> = [
  'pricing', 'model', 'safety', 'framework', 'infrastructure', 'tooling', 'policy', 'ecosystem',
];
const IMPACT_LEVELS_LOWER: ReadonlyArray<ImpactLevel> = ['none', 'low', 'medium', 'high'];
const URGENCY_LEVELS_LOWER: ReadonlyArray<UrgencyLevel> = ['immediate', 'this_week', 'fyi'];

const IMPACT_ORDER: Record<ImpactLevel, number> = { none: 0, low: 1, medium: 2, high: 3 };
const URGENCY_ORDER: Record<UrgencyLevel, number> = { fyi: 0, this_week: 1, immediate: 2 };

export function parseCapability(raw: string | null): CapabilityTag | null {
  if (raw === null) return null;
  const t = raw.trim().toLowerCase();
  return (CAPABILITY_TAGS_LOWER as ReadonlyArray<string>).includes(t) ? (t as CapabilityTag) : null;
}

export function parseImpact(raw: string | null): ImpactLevel {
  if (raw === null || raw === '') return 'none';
  const t = raw.trim().toLowerCase();
  return (IMPACT_LEVELS_LOWER as ReadonlyArray<string>).includes(t) ? (t as ImpactLevel) : 'none';
}

export function parseUrgency(raw: string | null): UrgencyLevel | null {
  if (raw === null) return null;
  const t = raw.trim().toLowerCase();
  return (URGENCY_LEVELS_LOWER as ReadonlyArray<string>).includes(t) ? (t as UrgencyLevel) : null;
}

export function parseQuery(raw: string | null): string | null {
  if (raw === null) return null;
  const t = raw.trim();
  return t || null;
}

// ─── Response ──────────────────────────────────────────────────────

export interface CardsResponse {
  ok: true;
  capturedAt: string;
  snapshot_captured_at: string;
  source: 'tensorfeed.ai news + Claude Haiku 4.5';
  filter: { capability: CapabilityTag | null; min_cost_impact: ImpactLevel; min_security_impact: ImpactLevel; urgency: UrgencyLevel | null; query: string | null };
  cohort: { articles_considered: number; cards_in_snapshot: number; cards_filtered: number };
  cards: ActionCard[];
  summary: {
    by_capability: Record<CapabilityTag, number>;
    by_urgency: Record<UrgencyLevel, number>;
    by_cost_impact: Record<ImpactLevel, number>;
    by_security_impact: Record<ImpactLevel, number>;
    cards_with_migration_recommendation: number;
  };
  attribution: {
    source: string;
    license: string;
    notes: string;
  };
}

export function buildCardsResponse(
  snapshot: ActionCardsSnapshot,
  filter: CardsFilter,
): CardsResponse {
  const queryNeedle = filter.query?.toLowerCase();
  const minCost = IMPACT_ORDER[filter.min_cost_impact];
  const minSec = IMPACT_ORDER[filter.min_security_impact];

  const filtered = snapshot.cards.filter((c) => {
    if (filter.capability && c.affected_capability !== filter.capability) return false;
    if (filter.urgency && c.urgency !== filter.urgency) return false;
    if (IMPACT_ORDER[c.cost_impact] < minCost) return false;
    if (IMPACT_ORDER[c.security_impact] < minSec) return false;
    if (queryNeedle) {
      const hay = `${c.article_title} ${c.article_source}`.toLowerCase();
      if (!hay.includes(queryNeedle)) return false;
    }
    return true;
  });

  filtered.sort((a, b) => {
    const u = URGENCY_ORDER[b.urgency] - URGENCY_ORDER[a.urgency];
    if (u !== 0) return u;
    const s = IMPACT_ORDER[b.security_impact] - IMPACT_ORDER[a.security_impact];
    if (s !== 0) return s;
    const c = IMPACT_ORDER[b.cost_impact] - IMPACT_ORDER[a.cost_impact];
    if (c !== 0) return c;
    return (b.article_published_at || '').localeCompare(a.article_published_at || '');
  });

  const by_capability: Record<CapabilityTag, number> = {
    pricing: 0, model: 0, safety: 0, framework: 0, infrastructure: 0, tooling: 0, policy: 0, ecosystem: 0,
  };
  const by_urgency: Record<UrgencyLevel, number> = { immediate: 0, this_week: 0, fyi: 0 };
  const by_cost_impact: Record<ImpactLevel, number> = { none: 0, low: 0, medium: 0, high: 0 };
  const by_security_impact: Record<ImpactLevel, number> = { none: 0, low: 0, medium: 0, high: 0 };
  let cards_with_migration_recommendation = 0;

  for (const c of filtered) {
    by_capability[c.affected_capability]++;
    by_urgency[c.urgency]++;
    by_cost_impact[c.cost_impact]++;
    by_security_impact[c.security_impact]++;
    if (c.migration_recommendation) cards_with_migration_recommendation++;
  }

  return {
    ok: true,
    capturedAt: snapshot.capturedAt,
    snapshot_captured_at: snapshot.capturedAt,
    source: 'tensorfeed.ai news + Claude Haiku 4.5',
    filter,
    cohort: {
      articles_considered: snapshot.articles_considered,
      cards_in_snapshot: snapshot.cards.length,
      cards_filtered: filtered.length,
    },
    cards: filtered,
    summary: {
      by_capability,
      by_urgency,
      by_cost_impact,
      by_security_impact,
      cards_with_migration_recommendation,
    },
    attribution: {
      source: 'TensorFeed.ai news feed transformed by Claude Haiku 4.5 (Anthropic). Each card cites the underlying article via article_url.',
      license: 'Derivative agent-facing summary. Underlying news articles remain the property of their respective publishers; we link back via article_url and never republish the full article body.',
      notes: 'Haiku produces structured cards once per article per 7-day window (per-article KV cache); cohort is rebuilt daily at 08:00 UTC. Sort priority: urgency desc, security_impact desc, cost_impact desc, published desc. capability + urgency exact-match filters; impact filters are "at-or-above" threshold.',
    },
  };
}
