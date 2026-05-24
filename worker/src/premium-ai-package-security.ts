/**
 * Premium AI-package security radar.
 *
 * Derived risk + breaking-change analytics over the daily OSV snapshot at
 * `ai-pkg-sec:current` (worker/src/ai-package-security-fetcher.ts). For
 * every curated AI package, computes a composite risk_score, classifies
 * each into a risk_band (calm / watch / hot / critical), and surfaces the
 * recent (last 90d) advisories alongside notable_movers across the cohort.
 *
 * Risk score components (per package, 0-100):
 *   - critical_count_30d * 25
 *   - high_count_30d * 12
 *   - critical_count_90d * 6
 *   - high_count_90d * 3
 *   - open_count_total clamped at 20
 *   - +5 if any advisory in the last 7d
 * Saturated to 100. Tuned conservatively: a single high-severity advisory
 * in the last 30 days lands a package on watch (12); a critical inside
 * 30d lands it on hot (25); two criticals in 30d lands it critical (50+).
 *
 * Free /api/ai-safety/packages/security returns raw per-package records;
 * this endpoint is the agent-decision-ready aggregation: "which AI deps
 * should I be worried about right now."
 */

import type {
  AiPkgSecuritySnapshot,
  PackageSecurityRecord,
  PackageAdvisory,
  SeverityBand,
  Ecosystem,
} from './ai-package-security-fetcher';

// ─── Filter ────────────────────────────────────────────────────────

export interface RadarFilter {
  ecosystem: Ecosystem | null;          // 'PyPI' | 'npm' | null = both
  category: string | null;              // substring match against curated category
  min_risk_score: number;               // hide packages below this score in headline rows
  package: string | null;               // substring match against package name
}

export const DEFAULT_MIN_RISK_SCORE = 10;

export function parseEcosystem(raw: string | null): Ecosystem | null {
  if (raw === null) return null;
  const t = raw.trim().toLowerCase();
  if (t === 'pypi') return 'PyPI';
  if (t === 'npm') return 'npm';
  return null;
}

export function parseCategory(raw: string | null): string | null {
  if (raw === null) return null;
  const t = raw.trim();
  return t || null;
}

export function parsePackage(raw: string | null): string | null {
  if (raw === null) return null;
  const t = raw.trim();
  return t || null;
}

export function parseMinRiskScore(raw: string | null): number {
  if (raw === null || raw === '') return DEFAULT_MIN_RISK_SCORE;
  const n = parseFloat(raw);
  if (!Number.isFinite(n)) return DEFAULT_MIN_RISK_SCORE;
  if (n < 0) return 0;
  if (n > 100) return 100;
  return n;
}

// ─── Per-package row ───────────────────────────────────────────────

export type RiskBand = 'calm' | 'watch' | 'hot' | 'critical';

export interface PackageRadarRow {
  package: string;
  ecosystem: Ecosystem;
  category: string;
  homepage: string | null;
  open_count: number;
  critical_count_30d: number;
  high_count_30d: number;
  critical_count_90d: number;
  high_count_90d: number;
  latest_advisory_id: string | null;
  latest_published: string | null;
  days_since_latest: number | null;
  risk_score: number;
  risk_band: RiskBand;
  recent_advisories: PackageAdvisory[]; // last 90d, max 5
}

const DAY_MS = 24 * 60 * 60 * 1000;

function daysSince(iso: string | null, now: Date): number | null {
  if (!iso) return null;
  const t = new Date(iso).getTime();
  if (Number.isNaN(t)) return null;
  return Math.floor((now.getTime() - t) / DAY_MS);
}

function classifyBand(score: number): RiskBand {
  if (score >= 50) return 'critical';
  if (score >= 25) return 'hot';
  if (score >= 10) return 'watch';
  return 'calm';
}

function severityToWeight(b: SeverityBand): { is_critical: boolean; is_high: boolean } {
  return {
    is_critical: b === 'critical',
    is_high: b === 'high',
  };
}

export function buildRow(record: PackageSecurityRecord, now: Date): PackageRadarRow {
  let critical_30 = 0;
  let high_30 = 0;
  let critical_90 = 0;
  let high_90 = 0;
  const recent: PackageAdvisory[] = [];
  let any7d = false;

  for (const a of record.advisories) {
    if (a.withdrawn) continue;
    const days = daysSince(a.published, now);
    if (days === null) continue;
    const w = severityToWeight(a.severity_band);
    if (days <= 30) {
      if (w.is_critical) critical_30++;
      if (w.is_high) high_30++;
    }
    if (days <= 90) {
      if (w.is_critical) critical_90++;
      if (w.is_high) high_90++;
      recent.push(a);
    }
    if (days <= 7) any7d = true;
  }

  let score =
    critical_30 * 25 +
    high_30 * 12 +
    critical_90 * 6 +
    high_90 * 3 +
    Math.min(record.open_count, 20);
  if (any7d) score += 5;
  if (score > 100) score = 100;

  return {
    package: record.package,
    ecosystem: record.ecosystem,
    category: record.category,
    homepage: record.homepage,
    open_count: record.open_count,
    critical_count_30d: critical_30,
    high_count_30d: high_30,
    critical_count_90d: critical_90,
    high_count_90d: high_90,
    latest_advisory_id: record.latest_advisory_id,
    latest_published: record.latest_published,
    days_since_latest: daysSince(record.latest_published, now),
    risk_score: Math.round(score * 10) / 10,
    risk_band: classifyBand(score),
    recent_advisories: recent.slice(0, 5),
  };
}

// ─── Response ──────────────────────────────────────────────────────

export interface RadarResponse {
  ok: true;
  capturedAt: string;
  snapshot_captured_at: string;
  source: 'osv.dev';
  filter: { ecosystem: Ecosystem | null; category: string | null; min_risk_score: number; package: string | null };
  packages_in_snapshot: number;
  rows: PackageRadarRow[];
  notable_movers: {
    by_critical_30d: PackageRadarRow[];
    by_risk_score: PackageRadarRow[];
    new_in_last_7d: PackageRadarRow[];
  };
  summary: {
    by_band: Record<RiskBand, number>;
    by_ecosystem: Record<Ecosystem, number>;
    total_open_advisories: number;
  };
  attribution: {
    source: string;
    license: string;
    notes: string;
  };
}

export function buildRadar(
  snapshot: AiPkgSecuritySnapshot,
  filter: RadarFilter,
  now: Date,
): RadarResponse {
  const ecoNeedle = filter.ecosystem;
  const catNeedle = filter.category?.toLowerCase();
  const pkgNeedle = filter.package?.toLowerCase();

  const allRows = snapshot.records.map((r) => buildRow(r, now));

  const filtered = allRows.filter((row) => {
    if (ecoNeedle && row.ecosystem !== ecoNeedle) return false;
    if (catNeedle && !row.category.toLowerCase().includes(catNeedle)) return false;
    if (pkgNeedle && !row.package.toLowerCase().includes(pkgNeedle)) return false;
    return true;
  });

  const headline = filtered
    .filter((r) => r.risk_score >= filter.min_risk_score)
    .sort((a, b) => b.risk_score - a.risk_score);

  // Notable movers (top 5 each). Use filtered set so the rollups respect
  // the ecosystem/category filter; package filter typically yields too few
  // for movers to be useful but still respected.
  const by_critical_30d = [...filtered]
    .filter((r) => r.critical_count_30d > 0)
    .sort((a, b) => b.critical_count_30d - a.critical_count_30d || b.risk_score - a.risk_score)
    .slice(0, 5);

  const by_risk_score = [...filtered]
    .sort((a, b) => b.risk_score - a.risk_score)
    .slice(0, 5);

  const new_in_last_7d = [...filtered]
    .filter((r) => r.days_since_latest !== null && r.days_since_latest <= 7)
    .sort((a, b) => (a.days_since_latest ?? 0) - (b.days_since_latest ?? 0))
    .slice(0, 5);

  const by_band: Record<RiskBand, number> = { calm: 0, watch: 0, hot: 0, critical: 0 };
  const by_ecosystem: Record<Ecosystem, number> = { PyPI: 0, npm: 0 };
  let total_open = 0;
  for (const r of filtered) {
    by_band[r.risk_band]++;
    by_ecosystem[r.ecosystem]++;
    total_open += r.open_count;
  }

  return {
    ok: true,
    capturedAt: now.toISOString(),
    snapshot_captured_at: snapshot.capturedAt,
    source: 'osv.dev',
    filter: { ecosystem: filter.ecosystem, category: filter.category, min_risk_score: filter.min_risk_score, package: filter.package },
    packages_in_snapshot: filtered.length,
    rows: headline,
    notable_movers: { by_critical_30d, by_risk_score, new_in_last_7d },
    summary: { by_band, by_ecosystem, total_open_advisories: total_open },
    attribution: {
      source: 'OSV.dev (Google-hosted aggregator of GHSA + PyPA + RustSec + Go vulndb + Maven + npm + others)',
      license: 'Apache-2.0 for the OSV schema. Upstream advisory records carry their own per-source terms (GHSA is CC-BY-4.0, PyPA is public domain, etc).',
      notes: 'TensorFeed queries OSV per package in the curated AI list daily at 05:45 UTC. Risk_score is editorial weighting (critical_30d * 25 + high_30d * 12 + critical_90d * 6 + high_90d * 3 + min(open_count, 20) + 5 if any in last 7d, saturated to 100). Bands: calm <10, watch 10-25, hot 25-50, critical 50+.',
    },
  };
}
