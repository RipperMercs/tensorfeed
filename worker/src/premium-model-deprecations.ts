/**
 * Premium model-deprecations timeline.
 *
 * Derives a relative-to-now timeline + migration intelligence over the
 * hand-curated registry in `model-deprecations.ts`. The free endpoint
 * at `/api/model-deprecations` returns the raw registry (capped to the
 * full list, no derived fields). This module powers the paid
 * `/api/premium/model-deprecations/timeline` which adds:
 *
 *   - urgency_band classification (within_7d / within_30d / within_60d /
 *     within_90d / within_180d / within_365d / past / no_date)
 *   - days_until_deprecation, days_until_sunset, days_since_sunset
 *   - migration_chain per entry (resolved hop sequence to the first
 *     replacement that is itself still active)
 *   - by_provider and by_urgency_band summaries
 *   - configurable window centered on now (?within_days=N filters to
 *     entries whose sunset is within N days in either direction)
 *
 * The window-centered design is intentional: with much of the registry
 * being recent past (vendors retired GPT-3.5-turbo-0301, PaLM-2,
 * Claude 2, etc.), an "upcoming only" filter would often be empty.
 * Agents care about "is my model affected and what should I migrate to,"
 * which is answered the same way whether the sunset was 30 days ago or
 * 30 days from now.
 *
 * Cost: 1 credit. Refresh: pure compute over the registry. No data
 * staleness signal applies (the registry updates on redeploy).
 */

import { MODEL_DEPRECATIONS, type ModelDeprecation } from './model-deprecations';

export type UrgencyBand =
  | 'past'
  | 'within_7d'
  | 'within_30d'
  | 'within_60d'
  | 'within_90d'
  | 'within_180d'
  | 'within_365d'
  | 'future'
  | 'no_date';

const DAY_MS = 24 * 60 * 60 * 1000;

/**
 * Days from `now` to ISO date `iso`. Negative = `iso` is in the past.
 * Returns null when `iso` is undefined or unparseable.
 */
export function daysFromNow(iso: string | undefined, now: Date): number | null {
  if (!iso) return null;
  const target = new Date(`${iso}T00:00:00Z`).getTime();
  if (Number.isNaN(target)) return null;
  return Math.floor((target - now.getTime()) / DAY_MS);
}

/**
 * Classify urgency by absolute distance from now to sunsetDate. Past sunsets
 * collapse to 'past' regardless of how recent; null sunset → 'no_date'.
 */
export function classifyUrgency(entry: ModelDeprecation, now: Date): UrgencyBand {
  const days = daysFromNow(entry.sunsetDate, now);
  if (days === null) return 'no_date';
  if (days < 0) return 'past';
  if (days <= 7) return 'within_7d';
  if (days <= 30) return 'within_30d';
  if (days <= 60) return 'within_60d';
  if (days <= 90) return 'within_90d';
  if (days <= 180) return 'within_180d';
  if (days <= 365) return 'within_365d';
  return 'future';
}

export interface TimelineEntry extends ModelDeprecation {
  days_until_deprecation: number | null;
  days_until_sunset: number | null;
  days_since_sunset: number | null;
  urgency_band: UrgencyBand;
  migration_chain: string[];
}

/**
 * Resolve the chain of replacements for a model. Starts at the given
 * model id and follows replacement_id links until either (a) the next
 * replacement is not in the registry (presumed active) or (b) a cycle
 * is detected. Returns the resolved hop sequence INCLUDING the start.
 */
export function resolveMigrationChain(startModelId: string): string[] {
  const chain: string[] = [startModelId];
  const seen = new Set<string>([startModelId]);
  let current = startModelId;
  // 20 hops is more than enough; defends against malformed cycles.
  for (let i = 0; i < 20; i++) {
    const entry = MODEL_DEPRECATIONS.find((m) => m.model === current);
    if (!entry || !entry.replacement) break;
    const next = entry.replacement;
    if (seen.has(next)) break;
    chain.push(next);
    seen.add(next);
    current = next;
  }
  return chain;
}

export function buildTimelineEntry(entry: ModelDeprecation, now: Date): TimelineEntry {
  const dus = daysFromNow(entry.sunsetDate, now);
  return {
    ...entry,
    days_until_deprecation: daysFromNow(entry.deprecationDate, now),
    days_until_sunset: dus,
    days_since_sunset: dus !== null && dus < 0 ? -dus : null,
    urgency_band: classifyUrgency(entry, now),
    migration_chain: resolveMigrationChain(entry.model),
  };
}

// ─── Filter logic ──────────────────────────────────────────────────

export interface TimelineFilter {
  /** Window centered on now in days. null = no window filter. */
  within_days: number | null;
  /** Substring match against `provider`, case-insensitive. null = all. */
  provider: string | null;
}

export const DEFAULT_WITHIN_DAYS: number | null = null; // null = full registry
export const MIN_WITHIN_DAYS = 7;
export const MAX_WITHIN_DAYS = 730;

/**
 * Parse the `within_days` query param. Empty/missing → null (no filter).
 * Out-of-range values clamp to [MIN_WITHIN_DAYS, MAX_WITHIN_DAYS].
 */
export function parseWithinDays(raw: string | null): number | null {
  if (raw === null || raw === '') return null;
  const n = parseInt(raw, 10);
  if (Number.isNaN(n)) return null;
  if (n < MIN_WITHIN_DAYS) return MIN_WITHIN_DAYS;
  if (n > MAX_WITHIN_DAYS) return MAX_WITHIN_DAYS;
  return n;
}

export function parseProvider(raw: string | null): string | null {
  if (raw === null) return null;
  const trimmed = raw.trim();
  if (!trimmed) return null;
  return trimmed;
}

// ─── Response shape ────────────────────────────────────────────────

export interface TimelineResponse {
  ok: true;
  capturedAt: string;
  filter: { within_days: number | null; provider: string | null };
  total_in_registry: number;
  returned_count: number;
  entries: TimelineEntry[];
  summary: {
    by_provider: Record<string, number>;
    by_urgency_band: Record<UrgencyBand, number>;
  };
  attribution: {
    sources: string[];
    license: string;
    notes: string;
  };
}

export function buildTimeline(
  filter: TimelineFilter,
  now: Date,
  registry: ReadonlyArray<ModelDeprecation> = MODEL_DEPRECATIONS,
): TimelineResponse {
  const providerNeedle = filter.provider?.toLowerCase();
  const enriched = registry.map((m) => buildTimelineEntry(m, now));

  const filtered = enriched.filter((e) => {
    if (providerNeedle && !e.provider.toLowerCase().includes(providerNeedle)) return false;
    if (filter.within_days !== null) {
      // Window centered on now. Entries without a sunsetDate are excluded
      // when a window filter is active (the question "is this in window"
      // can't be answered without a date).
      if (e.days_until_sunset === null) return false;
      if (Math.abs(e.days_until_sunset) > filter.within_days) return false;
    }
    return true;
  });

  // Sort: future-soonest first, then most-recent past, then no_date last.
  filtered.sort((a, b) => {
    const ad = a.days_until_sunset;
    const bd = b.days_until_sunset;
    if (ad === null && bd === null) return 0;
    if (ad === null) return 1;
    if (bd === null) return -1;
    // Both numeric: future (positive, ascending) before past (negative, descending toward more recent).
    if (ad >= 0 && bd < 0) return -1;
    if (ad < 0 && bd >= 0) return 1;
    if (ad >= 0 && bd >= 0) return ad - bd;        // both future: soonest first
    return bd - ad;                                // both past: most-recent first
  });

  const by_provider: Record<string, number> = {};
  const by_urgency_band: Record<UrgencyBand, number> = {
    past: 0,
    within_7d: 0,
    within_30d: 0,
    within_60d: 0,
    within_90d: 0,
    within_180d: 0,
    within_365d: 0,
    future: 0,
    no_date: 0,
  };
  for (const e of filtered) {
    by_provider[e.provider] = (by_provider[e.provider] ?? 0) + 1;
    by_urgency_band[e.urgency_band]++;
  }

  return {
    ok: true,
    capturedAt: now.toISOString(),
    filter: { within_days: filter.within_days, provider: filter.provider },
    total_in_registry: registry.length,
    returned_count: filtered.length,
    entries: filtered,
    summary: { by_provider, by_urgency_band },
    attribution: {
      sources: [
        'https://platform.openai.com/docs/deprecations',
        'https://docs.anthropic.com/en/docs/about-claude/model-deprecations',
        'https://ai.google.dev/gemini-api/docs/changelog',
        'https://docs.cohere.com/docs/deprecations',
      ],
      license:
        'Provider deprecation pages are public. The unified normalization across providers, the urgency_band classification, and the migration_chain derivation is TensorFeed editorial work.',
      notes:
        'Registry refreshed on redeploy. New entries land via PR to worker/src/model-deprecations.ts when providers publish new deprecation notices.',
    },
  };
}
