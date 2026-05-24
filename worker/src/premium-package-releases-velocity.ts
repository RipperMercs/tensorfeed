/**
 * Premium AI-package release velocity.
 *
 * Derived metrics over the 6-hourly package-releases snapshot at
 * `pkg-releases:current` (worker/src/ai-package-releases-fetcher.ts).
 * For every curated AI package, computes recent release counts in 24h /
 * 7d / 30d windows, classifies the most-recent bump (major / minor /
 * patch / prerelease), and surfaces notable_movers across the cohort:
 * recent_major_bumps, most_releases_30d, breaking_change_radar.
 *
 * Free /api/packages/releases returns the raw snapshot.
 * This endpoint is the agent-decision-ready "what AI deps just changed,
 * is it a breaking change, and how active is this package."
 */

import type {
  PackageReleasesSnapshot,
  PackageReleaseRecord,
  Ecosystem,
} from './ai-package-releases-fetcher';
import { classifyBump, type BumpKind } from './ai-package-releases-fetcher';

// ─── Filter ────────────────────────────────────────────────────────

export interface VelocityFilter {
  ecosystem: Ecosystem | null;
  category: string | null;
  package: string | null;
  /** Minimum releases-in-window to include in the headline `rows`. Default 1. */
  min_releases_7d: number;
}

export const DEFAULT_MIN_RELEASES_7D = 1;

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

export function parseMinReleases7d(raw: string | null): number {
  if (raw === null || raw === '') return DEFAULT_MIN_RELEASES_7D;
  const n = parseInt(raw, 10);
  if (!Number.isFinite(n)) return DEFAULT_MIN_RELEASES_7D;
  if (n < 0) return 0;
  if (n > 100) return 100;
  return n;
}

// ─── Per-package velocity row ──────────────────────────────────────

const DAY_MS = 24 * 60 * 60 * 1000;

function daysSince(iso: string, now: Date): number | null {
  if (!iso) return null;
  const t = new Date(iso).getTime();
  if (Number.isNaN(t)) return null;
  return Math.floor((now.getTime() - t) / DAY_MS);
}

export interface PackageVelocityRow {
  package: string;
  ecosystem: Ecosystem;
  category: string;
  homepage: string | null;
  latest_version: string;
  latest_published_at: string;
  days_since_latest: number | null;
  releases_24h: number;
  releases_7d: number;
  releases_30d: number;
  versions_known_total: number;
  /** Bump kind of latest version vs the second-most-recent. */
  latest_bump_kind: BumpKind;
  /** Prior version that latest replaced (for context). */
  previous_version: string | null;
  is_breaking_recent: boolean; // latest_bump_kind == 'major' AND latest within 30 days
}

export function buildVelocityRow(record: PackageReleaseRecord, now: Date): PackageVelocityRow {
  const versions = record.versions_recent;
  let releases_24h = 0;
  let releases_7d = 0;
  let releases_30d = 0;
  for (const v of versions) {
    const d = daysSince(v.published_at, now);
    if (d === null) continue;
    if (d <= 1) releases_24h++;
    if (d <= 7) releases_7d++;
    if (d <= 30) releases_30d++;
  }
  const previous = versions[1] ?? null;
  const latest_bump_kind: BumpKind = previous ? classifyBump(previous.version, record.latest_version) : 'unknown';
  const days_since_latest = daysSince(record.latest_published_at, now);
  const is_breaking_recent = latest_bump_kind === 'major' && days_since_latest !== null && days_since_latest <= 30;
  return {
    package: record.package,
    ecosystem: record.ecosystem,
    category: record.category,
    homepage: record.homepage,
    latest_version: record.latest_version,
    latest_published_at: record.latest_published_at,
    days_since_latest,
    releases_24h,
    releases_7d,
    releases_30d,
    versions_known_total: record.versions_known_total,
    latest_bump_kind,
    previous_version: previous ? previous.version : null,
    is_breaking_recent,
  };
}

// ─── Response ──────────────────────────────────────────────────────

export interface VelocityResponse {
  ok: true;
  capturedAt: string;
  snapshot_captured_at: string;
  filter: { ecosystem: Ecosystem | null; category: string | null; package: string | null; min_releases_7d: number };
  packages_in_snapshot: number;
  rows: PackageVelocityRow[];
  notable_movers: {
    recent_major_bumps: PackageVelocityRow[];     // is_breaking_recent==true, sorted by days_since_latest asc
    most_releases_7d: PackageVelocityRow[];       // top 5 by releases_7d desc
    fastest_cadence_30d: PackageVelocityRow[];    // top 5 by releases_30d desc
  };
  summary: {
    by_ecosystem: Record<Ecosystem, number>;
    by_category: Record<string, number>;
    by_bump_kind: Record<BumpKind, number>;
    total_releases_7d: number;
    total_releases_30d: number;
    breaking_changes_30d: number;
  };
  attribution: {
    source: string;
    license: string;
    notes: string;
  };
}

export function buildVelocity(
  snapshot: PackageReleasesSnapshot,
  filter: VelocityFilter,
  now: Date,
): VelocityResponse {
  const ecoNeedle = filter.ecosystem;
  const catNeedle = filter.category?.toLowerCase();
  const pkgNeedle = filter.package?.toLowerCase();

  const allRows = snapshot.records.map((r) => buildVelocityRow(r, now));

  const filtered = allRows.filter((row) => {
    if (ecoNeedle && row.ecosystem !== ecoNeedle) return false;
    if (catNeedle && !row.category.toLowerCase().includes(catNeedle)) return false;
    if (pkgNeedle && !row.package.toLowerCase().includes(pkgNeedle)) return false;
    return true;
  });

  const headline = filtered
    .filter((r) => r.releases_7d >= filter.min_releases_7d)
    .sort((a, b) => b.releases_7d - a.releases_7d || b.releases_30d - a.releases_30d || a.package.localeCompare(b.package));

  const recent_major_bumps = [...filtered]
    .filter((r) => r.is_breaking_recent)
    .sort((a, b) => (a.days_since_latest ?? 0) - (b.days_since_latest ?? 0));

  const most_releases_7d = [...filtered]
    .sort((a, b) => b.releases_7d - a.releases_7d || b.releases_30d - a.releases_30d)
    .slice(0, 5);

  const fastest_cadence_30d = [...filtered]
    .sort((a, b) => b.releases_30d - a.releases_30d || b.releases_7d - a.releases_7d)
    .slice(0, 5);

  const by_ecosystem: Record<Ecosystem, number> = { PyPI: 0, npm: 0 };
  const by_category: Record<string, number> = {};
  const by_bump_kind: Record<BumpKind, number> = {
    major: 0, minor: 0, patch: 0, prerelease: 0, sideways: 0, unknown: 0,
  };
  let total_releases_7d = 0;
  let total_releases_30d = 0;
  let breaking_changes_30d = 0;
  for (const r of filtered) {
    by_ecosystem[r.ecosystem]++;
    by_category[r.category] = (by_category[r.category] ?? 0) + 1;
    by_bump_kind[r.latest_bump_kind]++;
    total_releases_7d += r.releases_7d;
    total_releases_30d += r.releases_30d;
    if (r.is_breaking_recent) breaking_changes_30d++;
  }

  return {
    ok: true,
    capturedAt: now.toISOString(),
    snapshot_captured_at: snapshot.capturedAt,
    filter: { ecosystem: filter.ecosystem, category: filter.category, package: filter.package, min_releases_7d: filter.min_releases_7d },
    packages_in_snapshot: filtered.length,
    rows: headline,
    notable_movers: { recent_major_bumps, most_releases_7d, fastest_cadence_30d },
    summary: {
      by_ecosystem,
      by_category,
      by_bump_kind,
      total_releases_7d,
      total_releases_30d,
      breaking_changes_30d,
    },
    attribution: {
      source: 'pypi.org and registry.npmjs.org public JSON endpoints',
      license: 'Registry metadata is public and used commercially by Snyk, libraries.io, npmtrends, etc. Per-package licenses vary; we surface the homepage so agents can verify directly.',
      notes: 'TensorFeed polls every 6 hours. Bump classification: pre-1.0 minor bumps count as "major" per semver convention. Breaking-change radar fires on any major bump within 30 days.',
    },
  };
}
