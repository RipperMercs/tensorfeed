import { Env } from './types';

/**
 * Premium PyPI package momentum.
 *
 * Sister to /api/packages/pypi/ai-trending (the free leaderboard).
 * The free tier returns ranked downloads. This premium endpoint adds
 * a momentum layer per package: is the package accelerating, steady,
 * or decelerating? Ranked by momentum signal, with category
 * breakdowns and a notable-movers extraction.
 *
 * Why PyPI works today: pypistats.org returns last_day + last_week +
 * last_month in a single response. last_week and last_month are
 * overlapping trailing windows, so comparing last_week against the
 * weekly average over the PRIOR three weeks ((last_month - last_week)
 * / 3) yields a de-overlapped momentum ratio computable from a single
 * snapshot, no historical accumulation required.
 *
 * Why npm is deferred to a follow-up: the npm downloads endpoint
 * only returns last_week. True WoW requires either a second
 * date-range call per package (~40 extra upstream calls per refresh,
 * impolite) or a multi-day snapshot history (which we'll have once
 * the daily cron has run for a week). Both paths land later.
 *
 * Cost: 1 credit per call. Compute that justifies the gate:
 *   - momentum_ratio per package (last_week vs weekly avg over the prior 3 weeks)
 *   - velocity_ratio per package (today annualized vs last_week pace)
 *   - momentum direction classification (accelerating / steady / decelerating)
 *   - notable-movers extraction (top 5 accelerating, top 5 decelerating)
 *   - by-category aggregate counts of momentum direction
 */

// ── Source snapshot shape (mirrors what pypi-ai-packages.ts writes) ──

interface PyPIPackageEntry {
  name: string;
  category: string;
  description: string;
  homepage: string | null;
  downloads_last_day: number;
  downloads_last_week: number;
  downloads_last_month: number;
  rank: number;
  rank_in_category: number;
}

interface PyPISnapshot {
  capturedAt: string;
  total_packages: number;
  total_downloads_last_month: number;
  packages: PyPIPackageEntry[];
}

const SOURCE_KEY = 'pypi-ai:current';

// ── Public types ────────────────────────────────────────────────────

export type MomentumDirection = 'accelerating' | 'steady' | 'decelerating' | 'insufficient_data';

export interface PackageMomentumEntry {
  name: string;
  category: string;
  description: string;
  homepage: string | null;
  downloads_last_day: number;
  downloads_last_week: number;
  downloads_last_month: number;
  weekly_avg_in_last_month: number;  // de-overlapped: (last_month - last_week) / 3
  momentum_ratio: number | null;     // last_week / ((last_month - last_week) / 3)
  velocity_ratio: number | null;     // (last_day * 7) / last_week
  direction: MomentumDirection;
  rank_by_momentum: number;
}

export interface PackagesMomentumAttribution {
  source: string;
  source_url: string;
  upstream: string;
  derivation: string;
}

export const PACKAGES_MOMENTUM_ATTRIBUTION: PackagesMomentumAttribution = {
  source: 'pypistats.org',
  source_url: 'https://pypistats.org',
  upstream: 'PyPI BigQuery public dataset (Linehaul project, Python Software Foundation)',
  derivation:
    'Momentum and velocity ratios computed from pypistats.org last_day / last_week / last_month per package. last_week and last_month are overlapping trailing windows, so the momentum baseline de-overlaps to the prior three weeks ((last_month - last_week) / 3) rather than last_month / 4. The free /api/packages/pypi/ai-trending endpoint serves the underlying ranks; this endpoint adds the momentum layer (acceleration vs deceleration vs steady) and notable-movers extraction.',
};

export interface PackagesMomentumResult {
  ok: true;
  ecosystem: 'pypi';
  computed_at: string;
  source_captured_at: string;
  total_packages: number;
  totals_by_direction: {
    accelerating: number;
    steady: number;
    decelerating: number;
    insufficient_data: number;
  };
  by_category: Record<string, {
    accelerating: number;
    steady: number;
    decelerating: number;
    insufficient_data: number;
  }>;
  notable_movers: {
    top_accelerating: PackageMomentumEntry[];
    top_decelerating: PackageMomentumEntry[];
  };
  packages: PackageMomentumEntry[];
  attribution: PackagesMomentumAttribution;
  notes: string[];
}

export interface PackagesMomentumError {
  ok: false;
  error: string;
  hint?: string;
}

// ── Math ────────────────────────────────────────────────────────────

function round4(n: number): number {
  return Math.round(n * 10000) / 10000;
}

/**
 * Momentum ratio: last_week downloads divided by the average week over
 * the PRIOR three weeks. pypistats last_week and last_month are
 * overlapping trailing windows (7d and 30d), so last_week is a subset of
 * last_month; using last_month / 4 as the baseline would fold the
 * measured week into its own comparison and compress every ratio toward
 * 1.0 (audit 2026-05-31 #8). The de-overlapped baseline is the prior
 * three weeks: (last_month - last_week) / 3. Values:
 *   1.0  = last week matched the prior 3-week weekly pace (steady)
 *   1.2  = last week was 20% above the prior 3-week pace (accelerating)
 *   0.8  = last week was 20% below the prior 3-week pace (decelerating)
 * Returns null when there is no prior-3-week signal, i.e. when
 * (last_month - last_week) <= 0.
 */
export function momentumRatio(lastWeek: number, lastMonth: number): number | null {
  const priorThreeWeeks = lastMonth - lastWeek;
  if (priorThreeWeeks <= 0) return null;
  const weeklyAvg = priorThreeWeeks / 3;
  if (weeklyAvg === 0) return null;
  return round4(lastWeek / weeklyAvg);
}

/**
 * Velocity ratio: today's pace annualized to weekly vs last_week
 * actual. Values:
 *   1.0  = today's pace continues last week's pace
 *   1.3  = today is running 30% hotter than last week
 *   0.7  = today is running 30% colder
 * Returns null when last_week is 0.
 */
export function velocityRatio(lastDay: number, lastWeek: number): number | null {
  if (lastWeek <= 0) return null;
  return round4((lastDay * 7) / lastWeek);
}

const ACCELERATE_THRESHOLD = 1.05;
const DECELERATE_THRESHOLD = 0.95;

export function classifyDirection(ratio: number | null): MomentumDirection {
  if (ratio === null) return 'insufficient_data';
  if (ratio > ACCELERATE_THRESHOLD) return 'accelerating';
  if (ratio < DECELERATE_THRESHOLD) return 'decelerating';
  return 'steady';
}

// ── Builder ─────────────────────────────────────────────────────────

function buildEntries(snapshot: PyPISnapshot): PackageMomentumEntry[] {
  const entries = snapshot.packages.map(p => {
    // De-overlapped weekly baseline: the prior 3 weeks within last_month
    // (audit 2026-05-31 #8), not last_month / 4 which double-counts the
    // measured week. 0 when there is no prior-3-week signal.
    const priorThreeWeeks = p.downloads_last_month - p.downloads_last_week;
    const weeklyAvg = priorThreeWeeks > 0 ? round4(priorThreeWeeks / 3) : 0;
    const ratio = momentumRatio(p.downloads_last_week, p.downloads_last_month);
    const velocity = velocityRatio(p.downloads_last_day, p.downloads_last_week);
    return {
      name: p.name,
      category: p.category,
      description: p.description,
      homepage: p.homepage,
      downloads_last_day: p.downloads_last_day,
      downloads_last_week: p.downloads_last_week,
      downloads_last_month: p.downloads_last_month,
      weekly_avg_in_last_month: weeklyAvg,
      momentum_ratio: ratio,
      velocity_ratio: velocity,
      direction: classifyDirection(ratio),
      rank_by_momentum: 0,
    };
  });

  // Rank by momentum (descending). Insufficient_data goes to the bottom.
  entries.sort((a, b) => {
    const aRank = a.momentum_ratio ?? -Infinity;
    const bRank = b.momentum_ratio ?? -Infinity;
    return bRank - aRank;
  });
  entries.forEach((e, i) => { e.rank_by_momentum = i + 1; });
  return entries;
}

// ── Read API ────────────────────────────────────────────────────────

export async function computePackagesMomentum(env: Env): Promise<PackagesMomentumResult | PackagesMomentumError> {
  const snapshot = (await env.TENSORFEED_CACHE.get(SOURCE_KEY, 'json')) as PyPISnapshot | null;
  if (!snapshot) {
    return {
      ok: false,
      error: 'no_snapshot_yet',
      hint:
        'PyPI trending refresh runs daily at 03:45 UTC. After deploy the first snapshot may take up to 24 hours; once present, this endpoint computes momentum from a single snapshot (no historical accumulation needed).',
    };
  }

  const entries = buildEntries(snapshot);

  // Totals
  const totals = { accelerating: 0, steady: 0, decelerating: 0, insufficient_data: 0 };
  for (const e of entries) totals[e.direction] += 1;

  // By-category
  const byCategory: Record<string, { accelerating: number; steady: number; decelerating: number; insufficient_data: number }> = {};
  for (const e of entries) {
    if (!byCategory[e.category]) {
      byCategory[e.category] = { accelerating: 0, steady: 0, decelerating: 0, insufficient_data: 0 };
    }
    byCategory[e.category][e.direction] += 1;
  }

  // Notable movers
  const accelerating = entries.filter(e => e.direction === 'accelerating');
  const decelerating = entries.filter(e => e.direction === 'decelerating');
  // Decelerating is sorted ascending (worst momentum first when reversed)
  const decelSorted = decelerating.slice().sort((a, b) => (a.momentum_ratio ?? Infinity) - (b.momentum_ratio ?? Infinity));

  const notes: string[] = [];
  if (totals.insufficient_data > 0) {
    notes.push(`${totals.insufficient_data} package(s) had no last-month downloads in the snapshot; momentum could not be computed.`);
  }
  notes.push('npm momentum is deferred until rolling snapshot history accumulates (target: 7 days post-deploy).');

  return {
    ok: true,
    ecosystem: 'pypi',
    computed_at: new Date().toISOString(),
    source_captured_at: snapshot.capturedAt,
    total_packages: entries.length,
    totals_by_direction: totals,
    by_category: byCategory,
    notable_movers: {
      top_accelerating: accelerating.slice(0, 5),
      top_decelerating: decelSorted.slice(0, 5),
    },
    packages: entries,
    attribution: PACKAGES_MOMENTUM_ATTRIBUTION,
    notes,
  };
}
