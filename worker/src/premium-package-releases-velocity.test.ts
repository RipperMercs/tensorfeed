import { describe, it, expect } from 'vitest';
import {
  parseEcosystem,
  parseCategory,
  parsePackage,
  parseMinReleases7d,
  buildVelocityRow,
  buildVelocity,
  DEFAULT_MIN_RELEASES_7D,
} from './premium-package-releases-velocity';
import type {
  PackageReleasesSnapshot,
  PackageReleaseRecord,
  PackageVersion,
} from './ai-package-releases-fetcher';

// Shared reference clock. UTC midnight to keep day math exact.
const REFERENCE_NOW = new Date('2026-05-24T00:00:00Z');

// ── helpers ────────────────────────────────────────────────────────

function daysAgoIso(days: number, base: Date = REFERENCE_NOW): string {
  const t = base.getTime() - days * 24 * 60 * 60 * 1000;
  return new Date(t).toISOString();
}

function makeVersion(version: string, daysAgo: number): PackageVersion {
  return { version, published_at: daysAgoIso(daysAgo) };
}

function makeRecord(
  partial: Partial<PackageReleaseRecord> & { package: string; ecosystem: 'PyPI' | 'npm' },
): PackageReleaseRecord {
  const versions_recent = partial.versions_recent ?? [];
  const latest = versions_recent[0];
  return {
    package: partial.package,
    ecosystem: partial.ecosystem,
    category: partial.category ?? 'agents',
    description: partial.description ?? 'An example AI package',
    homepage: partial.homepage ?? 'https://example.com',
    latest_version: partial.latest_version ?? latest?.version ?? '0.0.0',
    latest_published_at: partial.latest_published_at ?? latest?.published_at ?? '',
    versions_recent,
    versions_known_total: partial.versions_known_total ?? versions_recent.length,
    fetched_at: partial.fetched_at ?? REFERENCE_NOW.toISOString(),
  };
}

function makeSnapshot(
  records: PackageReleaseRecord[],
  capturedAt = '2026-05-24T00:00:00.000Z',
): PackageReleasesSnapshot {
  return {
    capturedAt,
    source: 'pypi.org + registry.npmjs.org',
    source_license:
      'PyPI and npm registry JSON endpoints are public; package metadata is editorial-redistributable. Per-package licenses vary.',
    package_count: records.length,
    records,
  };
}

// ── parseEcosystem ─────────────────────────────────────────────────

describe('parseEcosystem', () => {
  it('returns null on null input', () => {
    expect(parseEcosystem(null)).toBeNull();
  });

  it('returns null on garbage input', () => {
    expect(parseEcosystem('something-else')).toBeNull();
  });

  it('returns null on maven', () => {
    expect(parseEcosystem('maven')).toBeNull();
  });

  it('parses pypi lowercase to canonical PyPI', () => {
    expect(parseEcosystem('pypi')).toBe('PyPI');
  });

  it('parses canonical-case PyPI to PyPI', () => {
    expect(parseEcosystem('PyPI')).toBe('PyPI');
  });

  it('parses npm lowercase to npm', () => {
    expect(parseEcosystem('npm')).toBe('npm');
  });

  it('parses NPM uppercase to npm', () => {
    expect(parseEcosystem('NPM')).toBe('npm');
  });
});

// ── parseCategory ──────────────────────────────────────────────────

describe('parseCategory', () => {
  it('returns null on null input', () => {
    expect(parseCategory(null)).toBeNull();
  });

  it('returns null on empty string', () => {
    expect(parseCategory('')).toBeNull();
  });

  it('returns null on whitespace-only input', () => {
    expect(parseCategory('   ')).toBeNull();
  });

  it('trims surrounding whitespace', () => {
    expect(parseCategory('  agents  ')).toBe('agents');
  });
});

// ── parsePackage ───────────────────────────────────────────────────

describe('parsePackage', () => {
  it('returns null on null input', () => {
    expect(parsePackage(null)).toBeNull();
  });

  it('returns null on empty string', () => {
    expect(parsePackage('')).toBeNull();
  });

  it('returns null on whitespace-only input', () => {
    expect(parsePackage('   ')).toBeNull();
  });

  it('trims surrounding whitespace', () => {
    expect(parsePackage('  langchain  ')).toBe('langchain');
  });
});

// ── parseMinReleases7d ─────────────────────────────────────────────

describe('parseMinReleases7d', () => {
  it('returns default (1) on null input', () => {
    expect(parseMinReleases7d(null)).toBe(DEFAULT_MIN_RELEASES_7D);
    expect(DEFAULT_MIN_RELEASES_7D).toBe(1);
  });

  it('returns default on empty string', () => {
    expect(parseMinReleases7d('')).toBe(DEFAULT_MIN_RELEASES_7D);
  });

  it('returns default on non-numeric input', () => {
    expect(parseMinReleases7d('not-a-number')).toBe(DEFAULT_MIN_RELEASES_7D);
  });

  it('parses integer', () => {
    expect(parseMinReleases7d('5')).toBe(5);
  });

  it('clamps negative to 0', () => {
    expect(parseMinReleases7d('-3')).toBe(0);
  });

  it('clamps above 100 to 100', () => {
    expect(parseMinReleases7d('250')).toBe(100);
  });

  it('accepts boundary 0', () => {
    expect(parseMinReleases7d('0')).toBe(0);
  });

  it('accepts boundary 100', () => {
    expect(parseMinReleases7d('100')).toBe(100);
  });
});

// ── buildVelocityRow ───────────────────────────────────────────────

describe('buildVelocityRow', () => {
  it('counts releases in 24h / 7d / 30d windows correctly', () => {
    // Versions at 0.5d, 3d, 10d, 40d ago
    const record = makeRecord({
      package: 'p',
      ecosystem: 'PyPI',
      latest_version: '1.4.0',
      latest_published_at: daysAgoIso(0.5),
      versions_recent: [
        { version: '1.4.0', published_at: daysAgoIso(0.5) },
        { version: '1.3.0', published_at: daysAgoIso(3) },
        { version: '1.2.0', published_at: daysAgoIso(10) },
        { version: '1.1.0', published_at: daysAgoIso(40) },
      ],
    });
    const row = buildVelocityRow(record, REFERENCE_NOW);
    expect(row.releases_24h).toBe(1); // 0.5d
    expect(row.releases_7d).toBe(2); // 0.5d, 3d
    expect(row.releases_30d).toBe(3); // 0.5d, 3d, 10d
  });

  it('days_since_latest computed from latest_published_at', () => {
    const record = makeRecord({
      package: 'p',
      ecosystem: 'PyPI',
      latest_version: '1.0.0',
      latest_published_at: daysAgoIso(12),
      versions_recent: [{ version: '1.0.0', published_at: daysAgoIso(12) }],
    });
    const row = buildVelocityRow(record, REFERENCE_NOW);
    expect(row.days_since_latest).toBe(12);
  });

  it('latest_bump_kind is "unknown" when there is only 1 version', () => {
    const record = makeRecord({
      package: 'p',
      ecosystem: 'PyPI',
      latest_version: '1.0.0',
      latest_published_at: daysAgoIso(5),
      versions_recent: [{ version: '1.0.0', published_at: daysAgoIso(5) }],
    });
    const row = buildVelocityRow(record, REFERENCE_NOW);
    expect(row.latest_bump_kind).toBe('unknown');
    expect(row.previous_version).toBeNull();
  });

  it('classifies latest_bump_kind correctly when 2+ versions: major bump', () => {
    const record = makeRecord({
      package: 'p',
      ecosystem: 'PyPI',
      latest_version: '2.0.0',
      latest_published_at: daysAgoIso(2),
      versions_recent: [
        { version: '2.0.0', published_at: daysAgoIso(2) },
        { version: '1.5.0', published_at: daysAgoIso(20) },
      ],
    });
    const row = buildVelocityRow(record, REFERENCE_NOW);
    expect(row.latest_bump_kind).toBe('major');
    expect(row.previous_version).toBe('1.5.0');
  });

  it('classifies minor bump correctly', () => {
    const record = makeRecord({
      package: 'p',
      ecosystem: 'PyPI',
      latest_version: '1.3.0',
      latest_published_at: daysAgoIso(2),
      versions_recent: [
        { version: '1.3.0', published_at: daysAgoIso(2) },
        { version: '1.2.0', published_at: daysAgoIso(20) },
      ],
    });
    const row = buildVelocityRow(record, REFERENCE_NOW);
    expect(row.latest_bump_kind).toBe('minor');
    expect(row.previous_version).toBe('1.2.0');
  });

  it('is_breaking_recent: true when major bump AND within 30 days', () => {
    const record = makeRecord({
      package: 'p',
      ecosystem: 'PyPI',
      latest_version: '2.0.0',
      latest_published_at: daysAgoIso(5),
      versions_recent: [
        { version: '2.0.0', published_at: daysAgoIso(5) },
        { version: '1.5.0', published_at: daysAgoIso(40) },
      ],
    });
    const row = buildVelocityRow(record, REFERENCE_NOW);
    expect(row.is_breaking_recent).toBe(true);
  });

  it('is_breaking_recent: false when major bump but older than 30 days', () => {
    const record = makeRecord({
      package: 'p',
      ecosystem: 'PyPI',
      latest_version: '2.0.0',
      latest_published_at: daysAgoIso(60),
      versions_recent: [
        { version: '2.0.0', published_at: daysAgoIso(60) },
        { version: '1.5.0', published_at: daysAgoIso(120) },
      ],
    });
    const row = buildVelocityRow(record, REFERENCE_NOW);
    expect(row.is_breaking_recent).toBe(false);
  });

  it('is_breaking_recent: false when minor bump regardless of recency', () => {
    const record = makeRecord({
      package: 'p',
      ecosystem: 'PyPI',
      latest_version: '1.3.0',
      latest_published_at: daysAgoIso(1),
      versions_recent: [
        { version: '1.3.0', published_at: daysAgoIso(1) },
        { version: '1.2.0', published_at: daysAgoIso(20) },
      ],
    });
    const row = buildVelocityRow(record, REFERENCE_NOW);
    expect(row.is_breaking_recent).toBe(false);
  });

  it('empty versions_recent: all release counts 0, latest_bump_kind unknown', () => {
    const record = makeRecord({
      package: 'p',
      ecosystem: 'PyPI',
      latest_version: '1.0.0',
      latest_published_at: '',
      versions_recent: [],
    });
    const row = buildVelocityRow(record, REFERENCE_NOW);
    expect(row.releases_24h).toBe(0);
    expect(row.releases_7d).toBe(0);
    expect(row.releases_30d).toBe(0);
    expect(row.latest_bump_kind).toBe('unknown');
    expect(row.previous_version).toBeNull();
  });

  it('echoes package metadata into the row', () => {
    const record = makeRecord({
      package: 'langchain',
      ecosystem: 'PyPI',
      category: 'agents',
      homepage: 'https://github.com/langchain-ai/langchain',
      latest_version: '0.3.5',
      latest_published_at: daysAgoIso(3),
      versions_recent: [{ version: '0.3.5', published_at: daysAgoIso(3) }],
      versions_known_total: 250,
    });
    const row = buildVelocityRow(record, REFERENCE_NOW);
    expect(row.package).toBe('langchain');
    expect(row.ecosystem).toBe('PyPI');
    expect(row.category).toBe('agents');
    expect(row.homepage).toBe('https://github.com/langchain-ai/langchain');
    expect(row.latest_version).toBe('0.3.5');
    expect(row.versions_known_total).toBe(250);
  });

  it('pre-1.0 minor bump is classified as major and triggers is_breaking_recent', () => {
    const record = makeRecord({
      package: 'p',
      ecosystem: 'PyPI',
      latest_version: '0.2.0',
      latest_published_at: daysAgoIso(3),
      versions_recent: [
        { version: '0.2.0', published_at: daysAgoIso(3) },
        { version: '0.1.0', published_at: daysAgoIso(40) },
      ],
    });
    const row = buildVelocityRow(record, REFERENCE_NOW);
    expect(row.latest_bump_kind).toBe('major');
    expect(row.is_breaking_recent).toBe(true);
  });
});

// ── buildVelocity: empty / smoke ───────────────────────────────────

describe('buildVelocity: empty snapshot', () => {
  it('empty snapshot returns empty rows, zero summary, ok=true', () => {
    const snapshot = makeSnapshot([]);
    const r = buildVelocity(
      snapshot,
      { ecosystem: null, category: null, package: null, min_releases_7d: DEFAULT_MIN_RELEASES_7D },
      REFERENCE_NOW,
    );
    expect(r.ok).toBe(true);
    expect(r.rows).toEqual([]);
    expect(r.packages_in_snapshot).toBe(0);
    expect(r.summary.by_ecosystem).toEqual({ PyPI: 0, npm: 0 });
    expect(r.summary.by_category).toEqual({});
    expect(r.summary.by_bump_kind).toEqual({
      major: 0,
      minor: 0,
      patch: 0,
      prerelease: 0,
      sideways: 0,
      unknown: 0,
    });
    expect(r.summary.total_releases_7d).toBe(0);
    expect(r.summary.total_releases_30d).toBe(0);
    expect(r.summary.breaking_changes_30d).toBe(0);
    expect(r.notable_movers.recent_major_bumps).toEqual([]);
    expect(r.notable_movers.most_releases_7d).toEqual([]);
    expect(r.notable_movers.fastest_cadence_30d).toEqual([]);
  });
});

// ── buildVelocity: filters ─────────────────────────────────────────

describe('buildVelocity: ecosystem filter', () => {
  it('ecosystem=PyPI filters to PyPI-only', () => {
    const pyRec = makeRecord({
      package: 'pypkg',
      ecosystem: 'PyPI',
      latest_version: '1.0.0',
      latest_published_at: daysAgoIso(3),
      versions_recent: [{ version: '1.0.0', published_at: daysAgoIso(3) }],
    });
    const npmRec = makeRecord({
      package: 'npmpkg',
      ecosystem: 'npm',
      latest_version: '1.0.0',
      latest_published_at: daysAgoIso(3),
      versions_recent: [{ version: '1.0.0', published_at: daysAgoIso(3) }],
    });
    const snapshot = makeSnapshot([pyRec, npmRec]);
    const r = buildVelocity(
      snapshot,
      { ecosystem: 'PyPI', category: null, package: null, min_releases_7d: 0 },
      REFERENCE_NOW,
    );
    expect(r.rows.map((row) => row.package)).toEqual(['pypkg']);
    expect(r.summary.by_ecosystem.PyPI).toBe(1);
    expect(r.summary.by_ecosystem.npm).toBe(0);
  });

  it('ecosystem=npm filters to npm-only', () => {
    const pyRec = makeRecord({
      package: 'pypkg',
      ecosystem: 'PyPI',
      latest_version: '1.0.0',
      latest_published_at: daysAgoIso(3),
      versions_recent: [{ version: '1.0.0', published_at: daysAgoIso(3) }],
    });
    const npmRec = makeRecord({
      package: 'npmpkg',
      ecosystem: 'npm',
      latest_version: '1.0.0',
      latest_published_at: daysAgoIso(3),
      versions_recent: [{ version: '1.0.0', published_at: daysAgoIso(3) }],
    });
    const snapshot = makeSnapshot([pyRec, npmRec]);
    const r = buildVelocity(
      snapshot,
      { ecosystem: 'npm', category: null, package: null, min_releases_7d: 0 },
      REFERENCE_NOW,
    );
    expect(r.rows.map((row) => row.package)).toEqual(['npmpkg']);
  });
});

describe('buildVelocity: category filter', () => {
  it('category substring match (case-insensitive)', () => {
    const a = makeRecord({
      package: 'agentpkg',
      ecosystem: 'PyPI',
      category: 'Agents',
      latest_version: '1.0.0',
      latest_published_at: daysAgoIso(3),
      versions_recent: [{ version: '1.0.0', published_at: daysAgoIso(3) }],
    });
    const b = makeRecord({
      package: 'vectorpkg',
      ecosystem: 'PyPI',
      category: 'vector-stores',
      latest_version: '1.0.0',
      latest_published_at: daysAgoIso(3),
      versions_recent: [{ version: '1.0.0', published_at: daysAgoIso(3) }],
    });
    const snapshot = makeSnapshot([a, b]);
    const r = buildVelocity(
      snapshot,
      { ecosystem: null, category: 'AGENT', package: null, min_releases_7d: 0 },
      REFERENCE_NOW,
    );
    expect(r.rows.map((row) => row.package)).toEqual(['agentpkg']);
  });
});

describe('buildVelocity: package filter', () => {
  it('package substring match (case-insensitive)', () => {
    const a = makeRecord({
      package: 'langchain',
      ecosystem: 'PyPI',
      latest_version: '1.0.0',
      latest_published_at: daysAgoIso(3),
      versions_recent: [{ version: '1.0.0', published_at: daysAgoIso(3) }],
    });
    const b = makeRecord({
      package: 'llama-index',
      ecosystem: 'PyPI',
      latest_version: '1.0.0',
      latest_published_at: daysAgoIso(3),
      versions_recent: [{ version: '1.0.0', published_at: daysAgoIso(3) }],
    });
    const snapshot = makeSnapshot([a, b]);
    const r = buildVelocity(
      snapshot,
      { ecosystem: null, category: null, package: 'LANG', min_releases_7d: 0 },
      REFERENCE_NOW,
    );
    expect(r.rows.map((row) => row.package)).toEqual(['langchain']);
  });
});

describe('buildVelocity: min_releases_7d filter', () => {
  it('only rows with releases_7d >= threshold in headline rows', () => {
    // Active: 2 releases in last 7 days.
    const active = makeRecord({
      package: 'active',
      ecosystem: 'PyPI',
      latest_version: '1.2.0',
      latest_published_at: daysAgoIso(1),
      versions_recent: [
        { version: '1.2.0', published_at: daysAgoIso(1) },
        { version: '1.1.0', published_at: daysAgoIso(4) },
      ],
    });
    // Quiet: latest is 60 days ago.
    const quiet = makeRecord({
      package: 'quiet',
      ecosystem: 'PyPI',
      latest_version: '1.0.0',
      latest_published_at: daysAgoIso(60),
      versions_recent: [{ version: '1.0.0', published_at: daysAgoIso(60) }],
    });
    const snapshot = makeSnapshot([active, quiet]);
    const r = buildVelocity(
      snapshot,
      { ecosystem: null, category: null, package: null, min_releases_7d: 1 },
      REFERENCE_NOW,
    );
    expect(r.rows.map((row) => row.package)).toEqual(['active']);
  });

  it('notable_movers + summary still use full filtered set even if rows is narrowed', () => {
    const active = makeRecord({
      package: 'active',
      ecosystem: 'PyPI',
      latest_version: '1.2.0',
      latest_published_at: daysAgoIso(1),
      versions_recent: [
        { version: '1.2.0', published_at: daysAgoIso(1) },
        { version: '1.1.0', published_at: daysAgoIso(4) },
      ],
    });
    const quiet = makeRecord({
      package: 'quiet',
      ecosystem: 'PyPI',
      latest_version: '1.0.0',
      latest_published_at: daysAgoIso(60),
      versions_recent: [{ version: '1.0.0', published_at: daysAgoIso(60) }],
    });
    const snapshot = makeSnapshot([active, quiet]);
    const r = buildVelocity(
      snapshot,
      { ecosystem: null, category: null, package: null, min_releases_7d: 5 },
      REFERENCE_NOW,
    );
    // No row passes min_releases_7d=5 → headline empty.
    expect(r.rows).toEqual([]);
    // But notable_movers + summary still see both.
    expect(r.packages_in_snapshot).toBe(2);
    expect(r.notable_movers.most_releases_7d.length).toBe(2);
    expect(r.summary.by_ecosystem.PyPI).toBe(2);
  });
});

// ── buildVelocity: sorting ─────────────────────────────────────────

describe('buildVelocity: rows sorting', () => {
  it('rows sorted by releases_7d desc, then releases_30d desc, then package name asc', () => {
    // a: 3 in 7d, 3 in 30d
    const a = makeRecord({
      package: 'a',
      ecosystem: 'PyPI',
      latest_version: '1.2.0',
      latest_published_at: daysAgoIso(1),
      versions_recent: [
        { version: '1.2.0', published_at: daysAgoIso(1) },
        { version: '1.1.0', published_at: daysAgoIso(3) },
        { version: '1.0.0', published_at: daysAgoIso(6) },
      ],
    });
    // b: 1 in 7d, 1 in 30d
    const b = makeRecord({
      package: 'b',
      ecosystem: 'PyPI',
      latest_version: '1.0.0',
      latest_published_at: daysAgoIso(5),
      versions_recent: [{ version: '1.0.0', published_at: daysAgoIso(5) }],
    });
    // c: 1 in 7d, 2 in 30d (tied with b on 7d, beats on 30d)
    const c = makeRecord({
      package: 'c',
      ecosystem: 'PyPI',
      latest_version: '1.1.0',
      latest_published_at: daysAgoIso(5),
      versions_recent: [
        { version: '1.1.0', published_at: daysAgoIso(5) },
        { version: '1.0.0', published_at: daysAgoIso(20) },
      ],
    });
    // d: 1 in 7d, 1 in 30d, alphabetically after b
    const d = makeRecord({
      package: 'd',
      ecosystem: 'PyPI',
      latest_version: '1.0.0',
      latest_published_at: daysAgoIso(5),
      versions_recent: [{ version: '1.0.0', published_at: daysAgoIso(5) }],
    });
    const snapshot = makeSnapshot([b, d, c, a]);
    const r = buildVelocity(
      snapshot,
      { ecosystem: null, category: null, package: null, min_releases_7d: 0 },
      REFERENCE_NOW,
    );
    expect(r.rows.map((row) => row.package)).toEqual(['a', 'c', 'b', 'd']);
  });
});

// ── buildVelocity: notable_movers ──────────────────────────────────

describe('buildVelocity: notable_movers.recent_major_bumps', () => {
  it('contains only is_breaking_recent rows, sorted by days_since_latest asc', () => {
    // Major bump 10d ago
    const m10 = makeRecord({
      package: 'm10',
      ecosystem: 'PyPI',
      latest_version: '2.0.0',
      latest_published_at: daysAgoIso(10),
      versions_recent: [
        { version: '2.0.0', published_at: daysAgoIso(10) },
        { version: '1.5.0', published_at: daysAgoIso(40) },
      ],
    });
    // Major bump 2d ago
    const m2 = makeRecord({
      package: 'm2',
      ecosystem: 'PyPI',
      latest_version: '3.0.0',
      latest_published_at: daysAgoIso(2),
      versions_recent: [
        { version: '3.0.0', published_at: daysAgoIso(2) },
        { version: '2.5.0', published_at: daysAgoIso(40) },
      ],
    });
    // Minor bump (not breaking)
    const min = makeRecord({
      package: 'minor',
      ecosystem: 'PyPI',
      latest_version: '1.3.0',
      latest_published_at: daysAgoIso(1),
      versions_recent: [
        { version: '1.3.0', published_at: daysAgoIso(1) },
        { version: '1.2.0', published_at: daysAgoIso(20) },
      ],
    });
    // Major bump but >30d (not recent)
    const old = makeRecord({
      package: 'old',
      ecosystem: 'PyPI',
      latest_version: '2.0.0',
      latest_published_at: daysAgoIso(60),
      versions_recent: [
        { version: '2.0.0', published_at: daysAgoIso(60) },
        { version: '1.0.0', published_at: daysAgoIso(120) },
      ],
    });
    const snapshot = makeSnapshot([m10, m2, min, old]);
    const r = buildVelocity(
      snapshot,
      { ecosystem: null, category: null, package: null, min_releases_7d: 0 },
      REFERENCE_NOW,
    );
    expect(r.notable_movers.recent_major_bumps.map((row) => row.package)).toEqual(['m2', 'm10']);
  });
});

describe('buildVelocity: notable_movers.most_releases_7d', () => {
  it('returns top 5 by releases_7d desc', () => {
    const records: PackageReleaseRecord[] = [];
    // 7 packages, each with N releases in last 7d (varying)
    const releaseCounts = [1, 3, 2, 5, 4, 1, 6];
    for (let i = 0; i < releaseCounts.length; i++) {
      const versions: PackageVersion[] = [];
      for (let j = 0; j < releaseCounts[i]; j++) {
        versions.push({ version: `1.0.${j}`, published_at: daysAgoIso(j) });
      }
      versions.reverse(); // newest first
      records.push(
        makeRecord({
          package: `p${i}`,
          ecosystem: 'PyPI',
          latest_version: versions[0].version,
          latest_published_at: versions[0].published_at,
          versions_recent: versions,
        }),
      );
    }
    const snapshot = makeSnapshot(records);
    const r = buildVelocity(
      snapshot,
      { ecosystem: null, category: null, package: null, min_releases_7d: 0 },
      REFERENCE_NOW,
    );
    expect(r.notable_movers.most_releases_7d.length).toBe(5);
    // top is p6 (6 releases)
    expect(r.notable_movers.most_releases_7d[0].package).toBe('p6');
    expect(r.notable_movers.most_releases_7d[0].releases_7d).toBe(6);
    // sorted desc
    const counts = r.notable_movers.most_releases_7d.map((row) => row.releases_7d);
    for (let i = 0; i < counts.length - 1; i++) {
      expect(counts[i]).toBeGreaterThanOrEqual(counts[i + 1]);
    }
  });
});

describe('buildVelocity: notable_movers.fastest_cadence_30d', () => {
  it('returns top 5 by releases_30d desc', () => {
    const records: PackageReleaseRecord[] = [];
    // 7 packages, each with N releases in last 30d
    const cadence = [1, 4, 2, 7, 3, 5, 6];
    for (let i = 0; i < cadence.length; i++) {
      const versions: PackageVersion[] = [];
      for (let j = 0; j < cadence[i]; j++) {
        // spread releases between 0 and 25 days ago
        const daysAgo = Math.min(25, j * 3);
        versions.push({ version: `1.0.${j}`, published_at: daysAgoIso(daysAgo) });
      }
      // sort newest first
      versions.sort((a, b) => b.published_at.localeCompare(a.published_at));
      records.push(
        makeRecord({
          package: `p${i}`,
          ecosystem: 'PyPI',
          latest_version: versions[0].version,
          latest_published_at: versions[0].published_at,
          versions_recent: versions,
        }),
      );
    }
    const snapshot = makeSnapshot(records);
    const r = buildVelocity(
      snapshot,
      { ecosystem: null, category: null, package: null, min_releases_7d: 0 },
      REFERENCE_NOW,
    );
    expect(r.notable_movers.fastest_cadence_30d.length).toBe(5);
    // top is p3 (7 releases in 30d)
    expect(r.notable_movers.fastest_cadence_30d[0].package).toBe('p3');
    // sorted desc
    const counts = r.notable_movers.fastest_cadence_30d.map((row) => row.releases_30d);
    for (let i = 0; i < counts.length - 1; i++) {
      expect(counts[i]).toBeGreaterThanOrEqual(counts[i + 1]);
    }
  });
});

// ── buildVelocity: summary ─────────────────────────────────────────

describe('buildVelocity: summary', () => {
  it('by_ecosystem counts PyPI + npm rows', () => {
    const py1 = makeRecord({
      package: 'py1',
      ecosystem: 'PyPI',
      latest_version: '1.0.0',
      latest_published_at: daysAgoIso(5),
      versions_recent: [{ version: '1.0.0', published_at: daysAgoIso(5) }],
    });
    const py2 = makeRecord({
      package: 'py2',
      ecosystem: 'PyPI',
      latest_version: '1.0.0',
      latest_published_at: daysAgoIso(5),
      versions_recent: [{ version: '1.0.0', published_at: daysAgoIso(5) }],
    });
    const np1 = makeRecord({
      package: 'np1',
      ecosystem: 'npm',
      latest_version: '1.0.0',
      latest_published_at: daysAgoIso(5),
      versions_recent: [{ version: '1.0.0', published_at: daysAgoIso(5) }],
    });
    const snapshot = makeSnapshot([py1, py2, np1]);
    const r = buildVelocity(
      snapshot,
      { ecosystem: null, category: null, package: null, min_releases_7d: 0 },
      REFERENCE_NOW,
    );
    expect(r.summary.by_ecosystem).toEqual({ PyPI: 2, npm: 1 });
  });

  it('by_category counts per distinct category', () => {
    const agentsA = makeRecord({
      package: 'a1',
      ecosystem: 'PyPI',
      category: 'agents',
      latest_version: '1.0.0',
      latest_published_at: daysAgoIso(5),
      versions_recent: [{ version: '1.0.0', published_at: daysAgoIso(5) }],
    });
    const agentsB = makeRecord({
      package: 'a2',
      ecosystem: 'PyPI',
      category: 'agents',
      latest_version: '1.0.0',
      latest_published_at: daysAgoIso(5),
      versions_recent: [{ version: '1.0.0', published_at: daysAgoIso(5) }],
    });
    const vector = makeRecord({
      package: 'v1',
      ecosystem: 'PyPI',
      category: 'vector-stores',
      latest_version: '1.0.0',
      latest_published_at: daysAgoIso(5),
      versions_recent: [{ version: '1.0.0', published_at: daysAgoIso(5) }],
    });
    const snapshot = makeSnapshot([agentsA, agentsB, vector]);
    const r = buildVelocity(
      snapshot,
      { ecosystem: null, category: null, package: null, min_releases_7d: 0 },
      REFERENCE_NOW,
    );
    expect(r.summary.by_category).toEqual({ agents: 2, 'vector-stores': 1 });
  });

  it('by_bump_kind counts per BumpKind across rows', () => {
    // major
    const majorRec = makeRecord({
      package: 'maj',
      ecosystem: 'PyPI',
      latest_version: '2.0.0',
      latest_published_at: daysAgoIso(5),
      versions_recent: [
        { version: '2.0.0', published_at: daysAgoIso(5) },
        { version: '1.5.0', published_at: daysAgoIso(40) },
      ],
    });
    // minor
    const minorRec = makeRecord({
      package: 'min',
      ecosystem: 'PyPI',
      latest_version: '1.3.0',
      latest_published_at: daysAgoIso(5),
      versions_recent: [
        { version: '1.3.0', published_at: daysAgoIso(5) },
        { version: '1.2.0', published_at: daysAgoIso(40) },
      ],
    });
    // patch
    const patchRec = makeRecord({
      package: 'pat',
      ecosystem: 'PyPI',
      latest_version: '1.2.4',
      latest_published_at: daysAgoIso(5),
      versions_recent: [
        { version: '1.2.4', published_at: daysAgoIso(5) },
        { version: '1.2.3', published_at: daysAgoIso(40) },
      ],
    });
    // unknown (single version)
    const unkRec = makeRecord({
      package: 'unk',
      ecosystem: 'PyPI',
      latest_version: '1.0.0',
      latest_published_at: daysAgoIso(5),
      versions_recent: [{ version: '1.0.0', published_at: daysAgoIso(5) }],
    });
    const snapshot = makeSnapshot([majorRec, minorRec, patchRec, unkRec]);
    const r = buildVelocity(
      snapshot,
      { ecosystem: null, category: null, package: null, min_releases_7d: 0 },
      REFERENCE_NOW,
    );
    expect(r.summary.by_bump_kind.major).toBe(1);
    expect(r.summary.by_bump_kind.minor).toBe(1);
    expect(r.summary.by_bump_kind.patch).toBe(1);
    expect(r.summary.by_bump_kind.unknown).toBe(1);
    expect(r.summary.by_bump_kind.prerelease).toBe(0);
    expect(r.summary.by_bump_kind.sideways).toBe(0);
  });

  it('total_releases_7d sums releases_7d across filtered set', () => {
    const a = makeRecord({
      package: 'a',
      ecosystem: 'PyPI',
      latest_version: '1.1.0',
      latest_published_at: daysAgoIso(1),
      versions_recent: [
        { version: '1.1.0', published_at: daysAgoIso(1) },
        { version: '1.0.0', published_at: daysAgoIso(4) },
      ],
    });
    const b = makeRecord({
      package: 'b',
      ecosystem: 'PyPI',
      latest_version: '1.0.0',
      latest_published_at: daysAgoIso(3),
      versions_recent: [{ version: '1.0.0', published_at: daysAgoIso(3) }],
    });
    const snapshot = makeSnapshot([a, b]);
    const r = buildVelocity(
      snapshot,
      { ecosystem: null, category: null, package: null, min_releases_7d: 0 },
      REFERENCE_NOW,
    );
    expect(r.summary.total_releases_7d).toBe(3);
  });

  it('total_releases_30d sums releases_30d across filtered set', () => {
    const a = makeRecord({
      package: 'a',
      ecosystem: 'PyPI',
      latest_version: '1.2.0',
      latest_published_at: daysAgoIso(1),
      versions_recent: [
        { version: '1.2.0', published_at: daysAgoIso(1) },
        { version: '1.1.0', published_at: daysAgoIso(10) },
        { version: '1.0.0', published_at: daysAgoIso(20) },
      ],
    });
    const b = makeRecord({
      package: 'b',
      ecosystem: 'PyPI',
      latest_version: '1.0.0',
      latest_published_at: daysAgoIso(15),
      versions_recent: [{ version: '1.0.0', published_at: daysAgoIso(15) }],
    });
    const snapshot = makeSnapshot([a, b]);
    const r = buildVelocity(
      snapshot,
      { ecosystem: null, category: null, package: null, min_releases_7d: 0 },
      REFERENCE_NOW,
    );
    expect(r.summary.total_releases_30d).toBe(4);
  });

  it('breaking_changes_30d counts is_breaking_recent rows', () => {
    const breaking = makeRecord({
      package: 'breaking',
      ecosystem: 'PyPI',
      latest_version: '2.0.0',
      latest_published_at: daysAgoIso(3),
      versions_recent: [
        { version: '2.0.0', published_at: daysAgoIso(3) },
        { version: '1.5.0', published_at: daysAgoIso(40) },
      ],
    });
    const safe = makeRecord({
      package: 'safe',
      ecosystem: 'PyPI',
      latest_version: '1.3.0',
      latest_published_at: daysAgoIso(3),
      versions_recent: [
        { version: '1.3.0', published_at: daysAgoIso(3) },
        { version: '1.2.0', published_at: daysAgoIso(40) },
      ],
    });
    const oldBreaking = makeRecord({
      package: 'oldbreak',
      ecosystem: 'PyPI',
      latest_version: '2.0.0',
      latest_published_at: daysAgoIso(60),
      versions_recent: [
        { version: '2.0.0', published_at: daysAgoIso(60) },
        { version: '1.0.0', published_at: daysAgoIso(120) },
      ],
    });
    const snapshot = makeSnapshot([breaking, safe, oldBreaking]);
    const r = buildVelocity(
      snapshot,
      { ecosystem: null, category: null, package: null, min_releases_7d: 0 },
      REFERENCE_NOW,
    );
    expect(r.summary.breaking_changes_30d).toBe(1);
  });
});

// ── buildVelocity: response shape ──────────────────────────────────

describe('buildVelocity: response shape', () => {
  it('echoes filter back in the response', () => {
    const snapshot = makeSnapshot([]);
    const r = buildVelocity(
      snapshot,
      { ecosystem: 'PyPI', category: 'agents', package: 'langchain', min_releases_7d: 3 },
      REFERENCE_NOW,
    );
    expect(r.filter).toEqual({
      ecosystem: 'PyPI',
      category: 'agents',
      package: 'langchain',
      min_releases_7d: 3,
    });
  });

  it('preserves snapshot_captured_at from input snapshot', () => {
    const snapshot = makeSnapshot([], '2026-01-15T12:34:56.000Z');
    const r = buildVelocity(
      snapshot,
      { ecosystem: null, category: null, package: null, min_releases_7d: 0 },
      REFERENCE_NOW,
    );
    expect(r.snapshot_captured_at).toBe('2026-01-15T12:34:56.000Z');
  });

  it('capturedAt is the ISO string of now', () => {
    const snapshot = makeSnapshot([]);
    const r = buildVelocity(
      snapshot,
      { ecosystem: null, category: null, package: null, min_releases_7d: 0 },
      REFERENCE_NOW,
    );
    expect(r.capturedAt).toBe(REFERENCE_NOW.toISOString());
  });

  it('attribution.source mentions pypi + npm', () => {
    const snapshot = makeSnapshot([]);
    const r = buildVelocity(
      snapshot,
      { ecosystem: null, category: null, package: null, min_releases_7d: 0 },
      REFERENCE_NOW,
    );
    expect(r.attribution.source.toLowerCase()).toContain('pypi');
    expect(r.attribution.source.toLowerCase()).toContain('npm');
  });
});
