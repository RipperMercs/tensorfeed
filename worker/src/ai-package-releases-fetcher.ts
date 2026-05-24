/**
 * AI-package release-velocity fetcher.
 *
 * For every package in the curated PyPI + npm AI lists, harvests the
 * latest version + release timestamps from the registry's public JSON
 * endpoint. Stores a unified snapshot in KV. Refreshes every 6 hours.
 *
 *   PyPI:  GET https://pypi.org/pypi/{name}/json
 *           -> { info: { version }, releases: { "x.y.z": [{upload_time_iso_8601, ...}], ... } }
 *   npm:   GET https://registry.npmjs.org/{name}
 *           -> { "dist-tags": { latest }, time: { "x.y.z": "2026-05-..." } }
 *
 * Both endpoints are documented public APIs used commercially by
 * snyk, libraries.io, npmtrends, etc. No auth required.
 *
 * Free   /api/packages/releases?ecosystem=&category=&package=&within_days=
 *        Recent normalized records (latest version + last 10 versions per
 *        package).
 * Paid   /api/premium/packages/releases/velocity (1 credit)
 *        Derived velocity rollups, major-bump radar, acceleration signal.
 *
 * Snapshot size: ~80 packages × ~10 recent versions × ~60 bytes ≈ 48KB.
 */

import type { Env } from './types';
import { CURATED_PYPI_PACKAGES } from './pypi-ai-packages';
import { CURATED_PACKAGES as CURATED_NPM_PACKAGES } from './npm-ai-packages';

const POLITE_UA = 'tensorfeed-releases/1.0 (mailto:evan@tensorfeed.ai; +https://tensorfeed.ai)';
const FETCH_TIMEOUT_MS = 12_000;
const RECENT_VERSIONS_KEPT = 10;

export const PKG_RELEASES_CURRENT_KEY = 'pkg-releases:current';
export const PKG_RELEASES_INDEX_KEY = 'pkg-releases:index';
export const PKG_RELEASES_DAILY_KEY_PREFIX = 'pkg-releases:daily:';

export type Ecosystem = 'PyPI' | 'npm';

export interface PackageVersion {
  version: string;
  published_at: string;
}

export interface PackageReleaseRecord {
  package: string;
  ecosystem: Ecosystem;
  category: string;
  description: string;
  homepage: string | null;
  latest_version: string;
  latest_published_at: string;
  versions_recent: PackageVersion[]; // newest first, capped to RECENT_VERSIONS_KEPT
  versions_known_total: number;
  fetched_at: string;
}

export interface PackageReleasesSnapshot {
  capturedAt: string;
  source: 'pypi.org + registry.npmjs.org';
  source_license: 'PyPI and npm registry JSON endpoints are public; package metadata is editorial-redistributable. Per-package licenses vary.';
  package_count: number;
  records: PackageReleaseRecord[];
}

// ── Fetch helpers ──────────────────────────────────────────────────

async function fetchWithTimeout(url: string, init: RequestInit, ms = FETCH_TIMEOUT_MS): Promise<Response> {
  const controller = new AbortController();
  const id = setTimeout(() => controller.abort(), ms);
  try {
    return await fetch(url, { ...init, signal: controller.signal });
  } finally {
    clearTimeout(id);
  }
}

// ── PyPI ───────────────────────────────────────────────────────────

interface PyPIReleaseFile { upload_time_iso_8601?: string; upload_time?: string; }
interface PyPIInfo { version?: string; }
interface PyPIResponse {
  info?: PyPIInfo;
  releases?: Record<string, PyPIReleaseFile[]>;
}

/**
 * Extract the upload timestamp for a PyPI version. Releases is an array
 * of files (wheel + sdist + etc); we take the earliest file's timestamp
 * since they're typically minutes apart.
 */
function pypiVersionTimestamp(files: PyPIReleaseFile[]): string | null {
  let earliest: string | null = null;
  for (const f of files) {
    const ts = f.upload_time_iso_8601 ?? f.upload_time;
    if (!ts) continue;
    if (earliest === null || ts < earliest) earliest = ts;
  }
  return earliest;
}

async function fetchPyPIRelease(pkg: string): Promise<{ latest: string; latestAt: string; versions: PackageVersion[]; total: number } | null> {
  const url = `https://pypi.org/pypi/${encodeURIComponent(pkg)}/json`;
  try {
    const res = await fetchWithTimeout(url, {
      headers: { 'User-Agent': POLITE_UA, Accept: 'application/json' },
    });
    if (!res.ok) return null;
    const body = (await res.json()) as PyPIResponse;
    const latest = body.info?.version;
    const releases = body.releases ?? {};
    if (!latest || typeof latest !== 'string') return null;

    const versions: PackageVersion[] = [];
    for (const [v, files] of Object.entries(releases)) {
      const ts = pypiVersionTimestamp(files);
      if (!ts) continue;
      // PyPI may include yanked versions; we still surface them since
      // a yank is a useful agent signal but tag them via the version
      // string being marked yanked by the registry (out of scope for v1).
      versions.push({ version: v, published_at: ts });
    }
    versions.sort((a, b) => b.published_at.localeCompare(a.published_at));
    const latestRow = versions.find((v) => v.version === latest);
    const latestAt = latestRow?.published_at ?? versions[0]?.published_at ?? '';
    return {
      latest,
      latestAt,
      versions: versions.slice(0, RECENT_VERSIONS_KEPT),
      total: versions.length,
    };
  } catch {
    return null;
  }
}

// ── npm ────────────────────────────────────────────────────────────

interface NpmResponse {
  'dist-tags'?: { latest?: string };
  time?: Record<string, string>;
}

async function fetchNpmRelease(pkg: string): Promise<{ latest: string; latestAt: string; versions: PackageVersion[]; total: number } | null> {
  const url = `https://registry.npmjs.org/${encodeURIComponent(pkg)}`;
  try {
    const res = await fetchWithTimeout(url, {
      headers: { 'User-Agent': POLITE_UA, Accept: 'application/json' },
    });
    if (!res.ok) return null;
    const body = (await res.json()) as NpmResponse;
    const latest = body['dist-tags']?.latest;
    const timeMap = body.time ?? {};
    if (!latest || typeof latest !== 'string') return null;

    const versions: PackageVersion[] = [];
    for (const [v, ts] of Object.entries(timeMap)) {
      // npm time object includes "created" and "modified" keys alongside versions.
      if (v === 'created' || v === 'modified' || typeof ts !== 'string') continue;
      versions.push({ version: v, published_at: ts });
    }
    versions.sort((a, b) => b.published_at.localeCompare(a.published_at));
    const latestRow = versions.find((v) => v.version === latest);
    const latestAt = latestRow?.published_at ?? versions[0]?.published_at ?? '';
    return {
      latest,
      latestAt,
      versions: versions.slice(0, RECENT_VERSIONS_KEPT),
      total: versions.length,
    };
  } catch {
    return null;
  }
}

// ── Top-level refresh ──────────────────────────────────────────────

export async function refreshPackageReleasesSnapshot(env: Env): Promise<PackageReleasesSnapshot> {
  const tasks: Array<{
    pkg: string;
    ecosystem: Ecosystem;
    category: string;
    description: string;
    homepage: string | null;
  }> = [];
  for (const p of CURATED_PYPI_PACKAGES) {
    tasks.push({ pkg: p.name, ecosystem: 'PyPI', category: p.category, description: p.description, homepage: p.homepage ?? null });
  }
  for (const p of CURATED_NPM_PACKAGES) {
    tasks.push({ pkg: p.name, ecosystem: 'npm', category: p.category, description: p.description, homepage: p.homepage ?? null });
  }

  const records: PackageReleaseRecord[] = [];
  const batchSize = 10;
  for (let i = 0; i < tasks.length; i += batchSize) {
    const batch = tasks.slice(i, i + batchSize);
    const results = await Promise.all(
      batch.map(async (t) => {
        const data = t.ecosystem === 'PyPI' ? await fetchPyPIRelease(t.pkg) : await fetchNpmRelease(t.pkg);
        if (!data) return null;
        const rec: PackageReleaseRecord = {
          package: t.pkg,
          ecosystem: t.ecosystem,
          category: t.category,
          description: t.description,
          homepage: t.homepage,
          latest_version: data.latest,
          latest_published_at: data.latestAt,
          versions_recent: data.versions,
          versions_known_total: data.total,
          fetched_at: new Date().toISOString(),
        };
        return rec;
      }),
    );
    for (const r of results) {
      if (r) records.push(r);
    }
  }

  const snapshot: PackageReleasesSnapshot = {
    capturedAt: new Date().toISOString(),
    source: 'pypi.org + registry.npmjs.org',
    source_license: 'PyPI and npm registry JSON endpoints are public; package metadata is editorial-redistributable. Per-package licenses vary.',
    package_count: records.length,
    records,
  };

  const dateKey = snapshot.capturedAt.slice(0, 10);
  await env.TENSORFEED_CACHE.put(PKG_RELEASES_CURRENT_KEY, JSON.stringify(snapshot));
  await env.TENSORFEED_CACHE.put(`${PKG_RELEASES_DAILY_KEY_PREFIX}${dateKey}`, JSON.stringify(snapshot));

  const idxRaw = (await env.TENSORFEED_CACHE.get(PKG_RELEASES_INDEX_KEY, 'json')) as string[] | null;
  const dates = idxRaw ?? [];
  if (!dates.includes(dateKey)) {
    dates.push(dateKey);
    dates.sort();
    await env.TENSORFEED_CACHE.put(PKG_RELEASES_INDEX_KEY, JSON.stringify(dates.slice(-180)));
  }
  return snapshot;
}

export async function getPackageReleasesSnapshot(env: Env): Promise<PackageReleasesSnapshot | null> {
  return (await env.TENSORFEED_CACHE.get(PKG_RELEASES_CURRENT_KEY, 'json')) as PackageReleasesSnapshot | null;
}

// ── Semver helpers (lightweight, no external dep) ──────────────────

export interface SemverParts {
  major: number;
  minor: number;
  patch: number;
  prerelease: string | null;
  valid: boolean;
}

/**
 * Parse a version string into semver-ish parts. Tolerant of "1.2.3rc1",
 * "1.2.3-rc1", "0.27.0.post1", and bare numerics. Returns valid=false
 * for completely unparseable strings.
 */
export function parseSemver(v: string): SemverParts {
  const trimmed = (v ?? '').trim();
  const match = trimmed.match(/^v?(\d+)\.(\d+)(?:\.(\d+))?([.\-+][a-zA-Z0-9.\-+]*)?/);
  if (!match) return { major: 0, minor: 0, patch: 0, prerelease: null, valid: false };
  return {
    major: parseInt(match[1], 10),
    minor: parseInt(match[2], 10),
    patch: match[3] ? parseInt(match[3], 10) : 0,
    prerelease: match[4] ?? null,
    valid: true,
  };
}

export type BumpKind = 'major' | 'minor' | 'patch' | 'prerelease' | 'sideways' | 'unknown';

/**
 * Classify the bump from `from` -> `to`. Pre-1.0 minor bumps are treated
 * as major (semver-style "breaking-change permitted").
 */
export function classifyBump(from: string, to: string): BumpKind {
  const a = parseSemver(from);
  const b = parseSemver(to);
  if (!a.valid || !b.valid) return 'unknown';
  if (b.major > a.major) return 'major';
  if (b.major < a.major) return 'sideways';
  // Pre-1.0 minor bumps are breaking by semver convention.
  if (a.major === 0 && b.minor > a.minor) return 'major';
  if (b.minor > a.minor) return 'minor';
  if (b.minor < a.minor) return 'sideways';
  if (b.patch > a.patch) return 'patch';
  if (b.patch < a.patch) return 'sideways';
  return 'prerelease';
}
