import { POLICY_REGISTRY, PolicyEntry, PolicyAttribution, POLICY_ATTRIBUTION } from './ai-policy-registry';

/**
 * Premium AI policy timeline.
 *
 * Forward + backward calendar of AI policy effective dates. Pure
 * compute on top of the free /api/policy/ai/registry editorial
 * catalog: groups entries by effective_date, classifies relative to
 * "now" (past, today, upcoming, far-future), surfaces the next 3
 * milestones an agent should know about, and computes a windowed
 * view (default 12 months: 6 back, 6 forward).
 *
 * Cost: 1 credit per call. The compute that justifies the gate:
 *   - Date relative-to-now classification
 *   - Forward-looking next-N-milestones extraction
 *   - Window filtering with sensible defaults
 *   - Per-entry days-until / days-since calculation
 *   - Aggregate counts by jurisdiction for the windowed range
 *
 * Free-tier raw access at /api/policy/ai/registry. This endpoint adds
 * the temporal layer.
 */

// ── Types ───────────────────────────────────────────────────────────

export type RelativePosition = 'past' | 'today' | 'upcoming' | 'far-future' | 'no-date';

export interface TimelineEntry {
  id: string;
  title: string;
  jurisdiction: string;
  type: string;
  status: string;
  enacted_date: string;
  effective_date: string | null;
  /** ISO date used for sorting (effective_date if set, else enacted_date). */
  pivot_date: string;
  /** Position relative to "now" anchor. */
  relative_position: RelativePosition;
  /** Negative = days in the past, positive = days in the future. Null when no effective_date. */
  days_until_effective: number | null;
  summary: string;
  source_url: string;
  scope: string[];
}

export interface PolicyTimelineAttribution extends PolicyAttribution {
  derivation: string;
}

export interface PolicyTimelineResult {
  ok: true;
  computed_at: string;
  window: {
    from: string;
    to: string;
    days_back: number;
    days_forward: number;
  };
  totals: {
    in_window: number;
    past: number;
    today: number;
    upcoming: number;
    far_future: number;
    no_date: number;
  };
  by_jurisdiction: Record<string, number>;
  next_milestones: TimelineEntry[];
  entries: TimelineEntry[];
  attribution: PolicyTimelineAttribution;
}

export interface PolicyTimelineError {
  ok: false;
  error: string;
  hint?: string;
}

export interface PolicyTimelineOptions {
  /** Window size, days back from "now". 0-1825 (5 years). Default 180. */
  daysBack?: number;
  /** Window size, days forward from "now". 0-1825 (5 years). Default 180. */
  daysForward?: number;
  /** Optional jurisdiction filter, same valid values as the underlying registry. */
  jurisdiction?: string;
}

// ── Helpers ─────────────────────────────────────────────────────────

function isoToday(now: Date = new Date()): string {
  return now.toISOString().slice(0, 10);
}

function addDays(iso: string, days: number): string {
  const d = new Date(`${iso}T00:00:00Z`);
  d.setUTCDate(d.getUTCDate() + days);
  return d.toISOString().slice(0, 10);
}

function daysBetween(fromIso: string, toIso: string): number {
  const a = new Date(`${fromIso}T00:00:00Z`).getTime();
  const b = new Date(`${toIso}T00:00:00Z`).getTime();
  return Math.round((b - a) / (1000 * 60 * 60 * 24));
}

const ISO_DATE = /^\d{4}-\d{2}-\d{2}$/;

export function classifyPosition(
  effectiveDate: string | null,
  todayIso: string,
  farFutureThresholdDays: number = 365 * 2,
): RelativePosition {
  if (!effectiveDate) return 'no-date';
  const days = daysBetween(todayIso, effectiveDate);
  if (days === 0) return 'today';
  if (days < 0) return 'past';
  if (days > farFutureThresholdDays) return 'far-future';
  return 'upcoming';
}

function pivotDate(p: PolicyEntry): string {
  return p.effective_date ?? p.enacted_date;
}

function buildTimelineEntry(p: PolicyEntry, todayIso: string): TimelineEntry {
  const pivot = pivotDate(p);
  const daysUntil = p.effective_date ? daysBetween(todayIso, p.effective_date) : null;
  return {
    id: p.id,
    title: p.title,
    jurisdiction: p.jurisdiction,
    type: p.type,
    status: p.status,
    enacted_date: p.enacted_date,
    effective_date: p.effective_date,
    pivot_date: pivot,
    relative_position: classifyPosition(p.effective_date, todayIso),
    days_until_effective: daysUntil,
    summary: p.summary,
    source_url: p.source_url,
    scope: p.scope,
  };
}

// ── Top-level entry ────────────────────────────────────────────────

export function computePolicyTimeline(
  options: PolicyTimelineOptions = {},
  now: Date = new Date(),
): PolicyTimelineResult | PolicyTimelineError {
  const daysBack = Math.max(0, Math.min(options.daysBack ?? 180, 365 * 5));
  const daysForward = Math.max(0, Math.min(options.daysForward ?? 180, 365 * 5));
  const todayIso = isoToday(now);
  const fromIso = addDays(todayIso, -daysBack);
  const toIso = addDays(todayIso, daysForward);

  const jurisdictionFilter = options.jurisdiction;

  // Validate jurisdiction filter if provided. We accept it via the
  // registry's own validation contract by checking against actual
  // jurisdictions in the data.
  if (jurisdictionFilter) {
    const knownJurisdictions = new Set(POLICY_REGISTRY.map(p => p.jurisdiction));
    if (!knownJurisdictions.has(jurisdictionFilter as PolicyEntry['jurisdiction'])) {
      return {
        ok: false,
        error: 'invalid_jurisdiction',
        hint: `Known values: ${Array.from(knownJurisdictions).sort().join(', ')}`,
      };
    }
  }

  const allEntries = POLICY_REGISTRY
    .filter(p => !jurisdictionFilter || p.jurisdiction === jurisdictionFilter)
    .map(p => buildTimelineEntry(p, todayIso));

  // Window filter: include if the pivot date falls in [fromIso, toIso]
  // OR the entry has no effective_date (always include for context, since
  // many proposed/vetoed entries lack a meaningful date and dropping them
  // hides relevant policy context).
  const inWindow = allEntries.filter(e => {
    if (!e.effective_date) return true;
    return e.effective_date >= fromIso && e.effective_date <= toIso;
  });

  // Sort: upcoming first (smallest positive days_until), then today,
  // then past (most-recent first), then no-date (preserve relative order).
  inWindow.sort((a, b) => {
    const order: Record<RelativePosition, number> = {
      'today': 0,
      'upcoming': 1,
      'past': 2,
      'far-future': 3,
      'no-date': 4,
    };
    const r = order[a.relative_position] - order[b.relative_position];
    if (r !== 0) return r;
    if (a.relative_position === 'upcoming' || a.relative_position === 'far-future') {
      return (a.days_until_effective ?? 0) - (b.days_until_effective ?? 0);
    }
    if (a.relative_position === 'past') {
      return (b.days_until_effective ?? 0) - (a.days_until_effective ?? 0);
    }
    return 0;
  });

  // Aggregates
  const totals = {
    in_window: inWindow.length,
    past: inWindow.filter(e => e.relative_position === 'past').length,
    today: inWindow.filter(e => e.relative_position === 'today').length,
    upcoming: inWindow.filter(e => e.relative_position === 'upcoming').length,
    far_future: inWindow.filter(e => e.relative_position === 'far-future').length,
    no_date: inWindow.filter(e => e.relative_position === 'no-date').length,
  };

  const by_jurisdiction: Record<string, number> = {};
  for (const e of inWindow) {
    by_jurisdiction[e.jurisdiction] = (by_jurisdiction[e.jurisdiction] ?? 0) + 1;
  }

  // Next milestones: top 3 upcoming entries sorted by closest effective_date
  const nextMilestones = inWindow
    .filter(e => e.relative_position === 'upcoming')
    .slice(0, 3);

  return {
    ok: true,
    computed_at: now.toISOString(),
    window: {
      from: fromIso,
      to: toIso,
      days_back: daysBack,
      days_forward: daysForward,
    },
    totals,
    by_jurisdiction,
    next_milestones: nextMilestones,
    entries: inWindow,
    attribution: {
      ...POLICY_ATTRIBUTION,
      derivation:
        'Temporal layer over the free /api/policy/ai/registry catalog: relative-to-now classification (past / today / upcoming / far-future), days-until-effective per entry, windowed view, and next-3-milestones extraction. Compute is the gate; raw registry remains free.',
    },
  };
}

// ── Param parser used by the route handler ─────────────────────────

export interface ParsedParams {
  daysBack?: number;
  daysForward?: number;
  jurisdiction?: string;
  error?: string;
}

export function parseTimelineParams(searchParams: URLSearchParams): ParsedParams {
  const out: ParsedParams = {};
  const dbStr = searchParams.get('days_back');
  const dfStr = searchParams.get('days_forward');
  const j = searchParams.get('jurisdiction');

  if (dbStr !== null) {
    const n = parseInt(dbStr, 10);
    if (!Number.isFinite(n) || n < 0) {
      return { error: 'invalid_days_back' };
    }
    out.daysBack = n;
  }
  if (dfStr !== null) {
    const n = parseInt(dfStr, 10);
    if (!Number.isFinite(n) || n < 0) {
      return { error: 'invalid_days_forward' };
    }
    out.daysForward = n;
  }
  if (j) out.jurisdiction = j;

  // Validate window cap (also enforced inside computePolicyTimeline,
  // but a clean 400 is friendlier than a clipped silent value).
  if (out.daysBack !== undefined && out.daysBack > 365 * 5) {
    return { error: 'days_back_exceeds_max' };
  }
  if (out.daysForward !== undefined && out.daysForward > 365 * 5) {
    return { error: 'days_forward_exceeds_max' };
  }

  // ISO date sanity is not needed since we accept integers, but use the
  // ISO regex defensively in case future params get added.
  void ISO_DATE;

  return out;
}
