import { describe, it, expect } from 'vitest';
import {
  parseEcosystem,
  parseCategory,
  parsePackage,
  parseMinRiskScore,
  buildRow,
  buildRadar,
  DEFAULT_MIN_RISK_SCORE,
} from './premium-ai-package-security';
import type {
  AiPkgSecuritySnapshot,
  PackageSecurityRecord,
  PackageAdvisory,
} from './ai-package-security-fetcher';

// Shared reference clock. UTC midnight to keep day math exact.
const REFERENCE_NOW = new Date('2026-05-24T00:00:00Z');

// ── helpers ────────────────────────────────────────────────────────

function daysAgoIso(days: number, base: Date = REFERENCE_NOW): string {
  const t = base.getTime() - days * 24 * 60 * 60 * 1000;
  return new Date(t).toISOString();
}

function makeAdvisory(partial: Partial<PackageAdvisory> = {}): PackageAdvisory {
  return {
    id: 'GHSA-default-0000',
    aliases: [],
    summary: '',
    published: daysAgoIso(10),
    modified: daysAgoIso(10),
    withdrawn: null,
    severity_band: 'unknown',
    cvss_score: null,
    vulnerable_versions: [],
    first_patched_version: null,
    reference_urls: [],
    ...partial,
  };
}

function makePackageRecord(partial: Partial<PackageSecurityRecord> = {}): PackageSecurityRecord {
  const advisories = partial.advisories ?? [];
  const open = advisories.filter((a) => !a.withdrawn);
  const withdrawn = advisories.filter((a) => a.withdrawn);
  const latest = advisories[0] ?? null;
  return {
    package: 'examplepkg',
    ecosystem: 'PyPI',
    category: 'agents',
    description: 'An example AI package',
    homepage: 'https://example.com',
    fetched_at: REFERENCE_NOW.toISOString(),
    advisories_count: advisories.length,
    open_count: open.length,
    withdrawn_count: withdrawn.length,
    latest_advisory_id: latest?.id ?? null,
    latest_published: latest?.published ?? null,
    ...partial,
    advisories,
  };
}

function makeSnapshot(records: PackageSecurityRecord[], capturedAt = '2026-05-24T00:00:00.000Z'): AiPkgSecuritySnapshot {
  return {
    capturedAt,
    source: 'osv.dev',
    source_license: 'Apache-2.0 (schema); upstream advisories under their own terms',
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
    expect(parseEcosystem('xxx')).toBeNull();
  });

  it('returns null on maven', () => {
    expect(parseEcosystem('maven')).toBeNull();
  });

  it('parses pypi lowercase to canonical PyPI', () => {
    expect(parseEcosystem('pypi')).toBe('PyPI');
  });

  it('parses PyPI (canonical case) to PyPI', () => {
    expect(parseEcosystem('PyPI')).toBe('PyPI');
  });

  it('parses PYPI uppercase to PyPI', () => {
    expect(parseEcosystem('PYPI')).toBe('PyPI');
  });

  it('parses npm lowercase to npm', () => {
    expect(parseEcosystem('npm')).toBe('npm');
  });

  it('parses NPM uppercase to npm', () => {
    expect(parseEcosystem('NPM')).toBe('npm');
  });

  it('trims surrounding whitespace', () => {
    expect(parseEcosystem('  pypi  ')).toBe('PyPI');
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

  it('returns value verbatim when already trimmed', () => {
    expect(parseCategory('vector-stores')).toBe('vector-stores');
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

  it('returns value verbatim when already trimmed', () => {
    expect(parsePackage('langchain')).toBe('langchain');
  });
});

// ── parseMinRiskScore ──────────────────────────────────────────────

describe('parseMinRiskScore', () => {
  it('returns default (10) on null input', () => {
    expect(parseMinRiskScore(null)).toBe(DEFAULT_MIN_RISK_SCORE);
    expect(DEFAULT_MIN_RISK_SCORE).toBe(10);
  });

  it('returns default on empty string', () => {
    expect(parseMinRiskScore('')).toBe(DEFAULT_MIN_RISK_SCORE);
  });

  it('returns default on non-numeric input', () => {
    expect(parseMinRiskScore('not-a-number')).toBe(DEFAULT_MIN_RISK_SCORE);
  });

  it('parses float verbatim', () => {
    expect(parseMinRiskScore('25.5')).toBe(25.5);
  });

  it('parses integer', () => {
    expect(parseMinRiskScore('50')).toBe(50);
  });

  it('clamps negative to 0', () => {
    expect(parseMinRiskScore('-5')).toBe(0);
  });

  it('clamps above 100 to 100', () => {
    expect(parseMinRiskScore('150')).toBe(100);
  });

  it('accepts boundary 0', () => {
    expect(parseMinRiskScore('0')).toBe(0);
  });

  it('accepts boundary 100', () => {
    expect(parseMinRiskScore('100')).toBe(100);
  });
});

// ── buildRow ───────────────────────────────────────────────────────

describe('buildRow', () => {
  it('empty advisories: risk_score 0, band calm, all counts 0', () => {
    const record = makePackageRecord({ advisories: [] });
    const row = buildRow(record, REFERENCE_NOW);
    expect(row.risk_score).toBe(0);
    expect(row.risk_band).toBe('calm');
    expect(row.critical_count_30d).toBe(0);
    expect(row.high_count_30d).toBe(0);
    expect(row.critical_count_90d).toBe(0);
    expect(row.high_count_90d).toBe(0);
    expect(row.open_count).toBe(0);
    expect(row.recent_advisories).toEqual([]);
  });

  it('single critical advisory 5 days ago: critical in 30d + 90d, any7d bonus, hot band', () => {
    const adv = makeAdvisory({ id: 'A1', severity_band: 'critical', published: daysAgoIso(5) });
    const record = makePackageRecord({ advisories: [adv] });
    const row = buildRow(record, REFERENCE_NOW);
    // critical_30=1, critical_90=1, open_count=1, any7d=true
    // score = 25 + 6 + 1 + 5 = 37
    expect(row.critical_count_30d).toBe(1);
    expect(row.critical_count_90d).toBe(1);
    expect(row.risk_score).toBe(37);
    expect(row.risk_band).toBe('hot');
  });

  it('single high advisory 10 days ago: high in 30d + 90d, no any7d, watch band', () => {
    const adv = makeAdvisory({ id: 'A1', severity_band: 'high', published: daysAgoIso(10) });
    const record = makePackageRecord({ advisories: [adv] });
    const row = buildRow(record, REFERENCE_NOW);
    // high_30=1, high_90=1, open_count=1, any7d=false
    // score = 12 + 3 + 1 = 16
    expect(row.high_count_30d).toBe(1);
    expect(row.high_count_90d).toBe(1);
    expect(row.risk_score).toBe(16);
    expect(row.risk_band).toBe('watch');
  });

  it('single critical advisory 60 days ago: critical_90 only, calm band', () => {
    const adv = makeAdvisory({ id: 'A1', severity_band: 'critical', published: daysAgoIso(60) });
    const record = makePackageRecord({ advisories: [adv] });
    const row = buildRow(record, REFERENCE_NOW);
    // critical_30=0, critical_90=1, open_count=1, any7d=false
    // score = 6 + 1 = 7
    expect(row.critical_count_30d).toBe(0);
    expect(row.critical_count_90d).toBe(1);
    expect(row.risk_score).toBe(7);
    expect(row.risk_band).toBe('calm');
  });

  it('withdrawn advisories are skipped from all counts', () => {
    const advWithdrawn = makeAdvisory({
      id: 'A1',
      severity_band: 'critical',
      published: daysAgoIso(5),
      withdrawn: daysAgoIso(2),
    });
    const record = makePackageRecord({ advisories: [advWithdrawn] });
    const row = buildRow(record, REFERENCE_NOW);
    expect(row.critical_count_30d).toBe(0);
    expect(row.critical_count_90d).toBe(0);
    expect(row.risk_score).toBe(0);
    expect(row.risk_band).toBe('calm');
  });

  it('days_since_latest computed from latest_published', () => {
    const adv = makeAdvisory({ id: 'A1', severity_band: 'high', published: daysAgoIso(15) });
    const record = makePackageRecord({ advisories: [adv] });
    const row = buildRow(record, REFERENCE_NOW);
    expect(row.days_since_latest).toBe(15);
  });

  it('days_since_latest is null when latest_published is null', () => {
    const record = makePackageRecord({
      advisories: [],
      latest_published: null,
      latest_advisory_id: null,
    });
    const row = buildRow(record, REFERENCE_NOW);
    expect(row.days_since_latest).toBeNull();
  });

  it('recent_advisories contains only last-90d entries', () => {
    const recent = makeAdvisory({ id: 'recent', severity_band: 'medium', published: daysAgoIso(20) });
    const old = makeAdvisory({ id: 'old', severity_band: 'medium', published: daysAgoIso(120) });
    const record = makePackageRecord({ advisories: [recent, old] });
    const row = buildRow(record, REFERENCE_NOW);
    expect(row.recent_advisories.map((a) => a.id)).toEqual(['recent']);
  });

  it('recent_advisories is capped at 5', () => {
    const advisories: PackageAdvisory[] = [];
    for (let i = 0; i < 8; i++) {
      advisories.push(
        makeAdvisory({ id: `A${i}`, severity_band: 'medium', published: daysAgoIso(20 + i) }),
      );
    }
    const record = makePackageRecord({ advisories });
    const row = buildRow(record, REFERENCE_NOW);
    expect(row.recent_advisories.length).toBe(5);
  });

  it('score saturates to 100 with very high counts', () => {
    const advisories: PackageAdvisory[] = [];
    for (let i = 0; i < 10; i++) {
      advisories.push(
        makeAdvisory({ id: `A${i}`, severity_band: 'critical', published: daysAgoIso(3) }),
      );
    }
    const record = makePackageRecord({ advisories });
    const row = buildRow(record, REFERENCE_NOW);
    // Raw score would be 10*25 + 10*6 + 10 + 5 = 250+60+10+5 = 325, clamped 100
    expect(row.risk_score).toBe(100);
    expect(row.risk_band).toBe('critical');
  });

  it('any_7d bonus: +5 only when there is an advisory <=7 days old', () => {
    const within7 = makeAdvisory({ id: 'A1', severity_band: 'low', published: daysAgoIso(5) });
    const outside7 = makeAdvisory({ id: 'A2', severity_band: 'low', published: daysAgoIso(20) });
    const recordIn = makePackageRecord({ advisories: [within7] });
    const recordOut = makePackageRecord({ advisories: [outside7] });
    const rowIn = buildRow(recordIn, REFERENCE_NOW);
    const rowOut = buildRow(recordOut, REFERENCE_NOW);
    // Low severity contributes 0 to crit/high counts. score = open(1) + 5 vs open(1).
    expect(rowIn.risk_score).toBe(6);
    expect(rowOut.risk_score).toBe(1);
  });

  it('band thresholds: <10 calm', () => {
    const adv = makeAdvisory({ id: 'A1', severity_band: 'low', published: daysAgoIso(20) });
    const record = makePackageRecord({ advisories: [adv] });
    const row = buildRow(record, REFERENCE_NOW);
    // score = 1 (open_count only)
    expect(row.risk_band).toBe('calm');
  });

  it('band thresholds: 10-24 watch', () => {
    // 1 high in 30d: 12 + 3 + 1 = 16. watch.
    const adv = makeAdvisory({ id: 'A1', severity_band: 'high', published: daysAgoIso(15) });
    const record = makePackageRecord({ advisories: [adv] });
    const row = buildRow(record, REFERENCE_NOW);
    expect(row.risk_band).toBe('watch');
  });

  it('band thresholds: 25-49 hot', () => {
    // 1 critical in 30d + any7d: 25 + 6 + 1 + 5 = 37. hot.
    const adv = makeAdvisory({ id: 'A1', severity_band: 'critical', published: daysAgoIso(5) });
    const record = makePackageRecord({ advisories: [adv] });
    const row = buildRow(record, REFERENCE_NOW);
    expect(row.risk_band).toBe('hot');
  });

  it('band thresholds: 50+ critical', () => {
    // 2 criticals in 30d: 2*25 + 2*6 + 2 = 50+12+2 = 64. critical.
    const a1 = makeAdvisory({ id: 'A1', severity_band: 'critical', published: daysAgoIso(15) });
    const a2 = makeAdvisory({ id: 'A2', severity_band: 'critical', published: daysAgoIso(20) });
    const record = makePackageRecord({ advisories: [a1, a2] });
    const row = buildRow(record, REFERENCE_NOW);
    expect(row.risk_band).toBe('critical');
  });

  it('echoes package metadata in the row', () => {
    const adv = makeAdvisory({ id: 'A1', severity_band: 'high', published: daysAgoIso(10) });
    const record = makePackageRecord({
      package: 'langchain',
      ecosystem: 'PyPI',
      category: 'agents',
      homepage: 'https://github.com/langchain-ai/langchain',
      advisories: [adv],
    });
    const row = buildRow(record, REFERENCE_NOW);
    expect(row.package).toBe('langchain');
    expect(row.ecosystem).toBe('PyPI');
    expect(row.category).toBe('agents');
    expect(row.homepage).toBe('https://github.com/langchain-ai/langchain');
    expect(row.latest_advisory_id).toBe('A1');
  });
});

// ── buildRadar ─────────────────────────────────────────────────────

describe('buildRadar: empty snapshot', () => {
  it('empty snapshot: rows empty, summary all zeros, ok=true', () => {
    const snapshot = makeSnapshot([]);
    const r = buildRadar(
      snapshot,
      { ecosystem: null, category: null, package: null, min_risk_score: DEFAULT_MIN_RISK_SCORE },
      REFERENCE_NOW,
    );
    expect(r.ok).toBe(true);
    expect(r.rows).toEqual([]);
    expect(r.summary.by_band).toEqual({ calm: 0, watch: 0, hot: 0, critical: 0 });
    expect(r.summary.by_ecosystem).toEqual({ PyPI: 0, npm: 0 });
    expect(r.summary.total_open_advisories).toBe(0);
    expect(r.notable_movers.by_critical_30d).toEqual([]);
    expect(r.notable_movers.by_risk_score).toEqual([]);
    expect(r.notable_movers.new_in_last_7d).toEqual([]);
  });
});

describe('buildRadar: ecosystem filter', () => {
  it('ecosystem=PyPI filters to PyPI-only', () => {
    const pyRec = makePackageRecord({
      package: 'pypkg',
      ecosystem: 'PyPI',
      advisories: [makeAdvisory({ id: 'P1', severity_band: 'high', published: daysAgoIso(10) })],
    });
    const npmRec = makePackageRecord({
      package: 'npmpkg',
      ecosystem: 'npm',
      advisories: [makeAdvisory({ id: 'N1', severity_band: 'high', published: daysAgoIso(10) })],
    });
    const snapshot = makeSnapshot([pyRec, npmRec]);
    const r = buildRadar(
      snapshot,
      { ecosystem: 'PyPI', category: null, package: null, min_risk_score: 0 },
      REFERENCE_NOW,
    );
    expect(r.rows.map((row) => row.package)).toEqual(['pypkg']);
    expect(r.summary.by_ecosystem.PyPI).toBe(1);
    expect(r.summary.by_ecosystem.npm).toBe(0);
  });

  it('ecosystem=null returns both', () => {
    const pyRec = makePackageRecord({ package: 'pypkg', ecosystem: 'PyPI', advisories: [] });
    const npmRec = makePackageRecord({ package: 'npmpkg', ecosystem: 'npm', advisories: [] });
    const snapshot = makeSnapshot([pyRec, npmRec]);
    const r = buildRadar(
      snapshot,
      { ecosystem: null, category: null, package: null, min_risk_score: 0 },
      REFERENCE_NOW,
    );
    expect(r.rows.length).toBe(2);
    expect(r.summary.by_ecosystem.PyPI).toBe(1);
    expect(r.summary.by_ecosystem.npm).toBe(1);
  });
});

describe('buildRadar: category filter', () => {
  it('category substring match (case-insensitive)', () => {
    const a = makePackageRecord({ package: 'agentpkg', ecosystem: 'PyPI', category: 'Agents', advisories: [] });
    const b = makePackageRecord({ package: 'vectorpkg', ecosystem: 'PyPI', category: 'vector-stores', advisories: [] });
    const snapshot = makeSnapshot([a, b]);
    const r = buildRadar(
      snapshot,
      { ecosystem: null, category: 'AGENT', package: null, min_risk_score: 0 },
      REFERENCE_NOW,
    );
    expect(r.rows.map((row) => row.package)).toEqual(['agentpkg']);
  });
});

describe('buildRadar: package filter', () => {
  it('package substring match (case-insensitive)', () => {
    const a = makePackageRecord({ package: 'langchain', ecosystem: 'PyPI', advisories: [] });
    const b = makePackageRecord({ package: 'llama-index', ecosystem: 'PyPI', advisories: [] });
    const snapshot = makeSnapshot([a, b]);
    const r = buildRadar(
      snapshot,
      { ecosystem: null, category: null, package: 'LANG', min_risk_score: 0 },
      REFERENCE_NOW,
    );
    expect(r.rows.map((row) => row.package)).toEqual(['langchain']);
  });
});

describe('buildRadar: min_risk_score filter', () => {
  it('only rows at or above the threshold are included in rows[]', () => {
    // High-score pkg: critical in 30d (37). Low-score pkg: low in 30d (~1).
    const high = makePackageRecord({
      package: 'highpkg',
      advisories: [makeAdvisory({ id: 'H1', severity_band: 'critical', published: daysAgoIso(5) })],
    });
    const low = makePackageRecord({
      package: 'lowpkg',
      advisories: [makeAdvisory({ id: 'L1', severity_band: 'low', published: daysAgoIso(20) })],
    });
    const snapshot = makeSnapshot([high, low]);
    const r = buildRadar(
      snapshot,
      { ecosystem: null, category: null, package: null, min_risk_score: 25 },
      REFERENCE_NOW,
    );
    expect(r.rows.map((row) => row.package)).toEqual(['highpkg']);
  });

  it('notable_movers + summary still include packages below min_risk_score (filter only narrows rows[])', () => {
    const high = makePackageRecord({
      package: 'highpkg',
      advisories: [makeAdvisory({ id: 'H1', severity_band: 'critical', published: daysAgoIso(5) })],
    });
    const low = makePackageRecord({
      package: 'lowpkg',
      advisories: [makeAdvisory({ id: 'L1', severity_band: 'low', published: daysAgoIso(20) })],
    });
    const snapshot = makeSnapshot([high, low]);
    const r = buildRadar(
      snapshot,
      { ecosystem: null, category: null, package: null, min_risk_score: 25 },
      REFERENCE_NOW,
    );
    // rows: only highpkg (above threshold)
    expect(r.rows.length).toBe(1);
    // summary still counts both (the ecosystem-filtered set)
    expect(r.summary.by_band.calm + r.summary.by_band.watch + r.summary.by_band.hot + r.summary.by_band.critical).toBe(2);
    expect(r.packages_in_snapshot).toBe(2);
    // notable_movers.by_risk_score top-5 includes both
    expect(r.notable_movers.by_risk_score.map((row) => row.package).sort()).toEqual(['highpkg', 'lowpkg']);
  });
});

describe('buildRadar: rows sorting', () => {
  it('rows sorted by risk_score desc', () => {
    const lowScore = makePackageRecord({
      package: 'lowscore',
      advisories: [makeAdvisory({ id: 'A', severity_band: 'high', published: daysAgoIso(10) })],
    }); // score ~16
    const highScore = makePackageRecord({
      package: 'highscore',
      advisories: [makeAdvisory({ id: 'B', severity_band: 'critical', published: daysAgoIso(5) })],
    }); // score ~37
    const snapshot = makeSnapshot([lowScore, highScore]);
    const r = buildRadar(
      snapshot,
      { ecosystem: null, category: null, package: null, min_risk_score: 0 },
      REFERENCE_NOW,
    );
    expect(r.rows.map((row) => row.package)).toEqual(['highscore', 'lowscore']);
    expect(r.rows[0].risk_score).toBeGreaterThan(r.rows[1].risk_score);
  });
});

describe('buildRadar: notable_movers', () => {
  it('by_critical_30d: only packages with critical_count_30d > 0, sorted desc, max 5', () => {
    const records: PackageSecurityRecord[] = [];
    // 6 packages with varying critical counts in 30d
    const critCounts = [3, 1, 5, 2, 4, 1];
    for (let i = 0; i < critCounts.length; i++) {
      const advisories: PackageAdvisory[] = [];
      for (let j = 0; j < critCounts[i]; j++) {
        advisories.push(makeAdvisory({ id: `P${i}-A${j}`, severity_band: 'critical', published: daysAgoIso(15) }));
      }
      records.push(makePackageRecord({ package: `pkg${i}`, advisories }));
    }
    // Add one with no critical
    records.push(makePackageRecord({
      package: 'nocrit',
      advisories: [makeAdvisory({ id: 'N1', severity_band: 'high', published: daysAgoIso(10) })],
    }));
    const snapshot = makeSnapshot(records);
    const r = buildRadar(
      snapshot,
      { ecosystem: null, category: null, package: null, min_risk_score: 0 },
      REFERENCE_NOW,
    );
    expect(r.notable_movers.by_critical_30d.length).toBe(5);
    // top should be pkg2 (5 criticals)
    expect(r.notable_movers.by_critical_30d[0].package).toBe('pkg2');
    expect(r.notable_movers.by_critical_30d[0].critical_count_30d).toBe(5);
    // All must have critical > 0
    for (const row of r.notable_movers.by_critical_30d) {
      expect(row.critical_count_30d).toBeGreaterThan(0);
    }
    // nocrit must not appear
    expect(r.notable_movers.by_critical_30d.map((row) => row.package)).not.toContain('nocrit');
  });

  it('by_risk_score: top 5 by score regardless of threshold', () => {
    const records: PackageSecurityRecord[] = [];
    for (let i = 0; i < 7; i++) {
      const advisories: PackageAdvisory[] = [];
      for (let j = 0; j <= i; j++) {
        advisories.push(makeAdvisory({ id: `P${i}-A${j}`, severity_band: 'high', published: daysAgoIso(15) }));
      }
      records.push(makePackageRecord({ package: `pkg${i}`, advisories }));
    }
    const snapshot = makeSnapshot(records);
    const r = buildRadar(
      snapshot,
      { ecosystem: null, category: null, package: null, min_risk_score: 999 },
      REFERENCE_NOW,
    );
    expect(r.notable_movers.by_risk_score.length).toBe(5);
    // Sorted desc
    const scores = r.notable_movers.by_risk_score.map((row) => row.risk_score);
    for (let i = 0; i < scores.length - 1; i++) {
      expect(scores[i]).toBeGreaterThanOrEqual(scores[i + 1]);
    }
  });

  it('new_in_last_7d: packages with days_since_latest <= 7, sorted asc, max 5', () => {
    const records: PackageSecurityRecord[] = [];
    // 3 packages with latest within 7d
    records.push(makePackageRecord({
      package: 'p3d',
      advisories: [makeAdvisory({ id: 'A', severity_band: 'high', published: daysAgoIso(3) })],
    }));
    records.push(makePackageRecord({
      package: 'p1d',
      advisories: [makeAdvisory({ id: 'B', severity_band: 'high', published: daysAgoIso(1) })],
    }));
    records.push(makePackageRecord({
      package: 'p5d',
      advisories: [makeAdvisory({ id: 'C', severity_band: 'high', published: daysAgoIso(5) })],
    }));
    // older
    records.push(makePackageRecord({
      package: 'pold',
      advisories: [makeAdvisory({ id: 'D', severity_band: 'high', published: daysAgoIso(20) })],
    }));
    const snapshot = makeSnapshot(records);
    const r = buildRadar(
      snapshot,
      { ecosystem: null, category: null, package: null, min_risk_score: 0 },
      REFERENCE_NOW,
    );
    expect(r.notable_movers.new_in_last_7d.map((row) => row.package)).toEqual(['p1d', 'p3d', 'p5d']);
  });

  it('new_in_last_7d: caps at 5', () => {
    const records: PackageSecurityRecord[] = [];
    for (let i = 0; i < 8; i++) {
      records.push(makePackageRecord({
        package: `p${i}`,
        advisories: [makeAdvisory({ id: `A${i}`, severity_band: 'high', published: daysAgoIso(i) })],
      }));
    }
    const snapshot = makeSnapshot(records);
    const r = buildRadar(
      snapshot,
      { ecosystem: null, category: null, package: null, min_risk_score: 0 },
      REFERENCE_NOW,
    );
    expect(r.notable_movers.new_in_last_7d.length).toBe(5);
  });
});

describe('buildRadar: summary', () => {
  it('by_band has all four keys with correct counts', () => {
    const calmRec = makePackageRecord({ package: 'calm', advisories: [] });
    const watchRec = makePackageRecord({
      package: 'watch',
      advisories: [makeAdvisory({ id: 'A1', severity_band: 'high', published: daysAgoIso(15) })],
    });
    const hotRec = makePackageRecord({
      package: 'hot',
      advisories: [makeAdvisory({ id: 'A2', severity_band: 'critical', published: daysAgoIso(5) })],
    });
    const critRec = makePackageRecord({
      package: 'crit',
      advisories: [
        makeAdvisory({ id: 'A3', severity_band: 'critical', published: daysAgoIso(15) }),
        makeAdvisory({ id: 'A4', severity_band: 'critical', published: daysAgoIso(20) }),
      ],
    });
    const snapshot = makeSnapshot([calmRec, watchRec, hotRec, critRec]);
    const r = buildRadar(
      snapshot,
      { ecosystem: null, category: null, package: null, min_risk_score: 0 },
      REFERENCE_NOW,
    );
    expect(r.summary.by_band).toEqual({ calm: 1, watch: 1, hot: 1, critical: 1 });
  });

  it('by_ecosystem has PyPI + npm keys with correct counts', () => {
    const pyA = makePackageRecord({ package: 'pa', ecosystem: 'PyPI', advisories: [] });
    const pyB = makePackageRecord({ package: 'pb', ecosystem: 'PyPI', advisories: [] });
    const npmA = makePackageRecord({ package: 'na', ecosystem: 'npm', advisories: [] });
    const snapshot = makeSnapshot([pyA, pyB, npmA]);
    const r = buildRadar(
      snapshot,
      { ecosystem: null, category: null, package: null, min_risk_score: 0 },
      REFERENCE_NOW,
    );
    expect(r.summary.by_ecosystem).toEqual({ PyPI: 2, npm: 1 });
  });

  it('total_open_advisories sums open_count across filtered set', () => {
    const a = makePackageRecord({
      package: 'a',
      advisories: [
        makeAdvisory({ id: 'A1', severity_band: 'high', published: daysAgoIso(10) }),
        makeAdvisory({ id: 'A2', severity_band: 'high', published: daysAgoIso(20) }),
      ],
    });
    const b = makePackageRecord({
      package: 'b',
      advisories: [makeAdvisory({ id: 'B1', severity_band: 'high', published: daysAgoIso(10) })],
    });
    const snapshot = makeSnapshot([a, b]);
    const r = buildRadar(
      snapshot,
      { ecosystem: null, category: null, package: null, min_risk_score: 0 },
      REFERENCE_NOW,
    );
    expect(r.summary.total_open_advisories).toBe(3);
  });

  it('total_open_advisories respects ecosystem filter', () => {
    const pyRec = makePackageRecord({
      package: 'py',
      ecosystem: 'PyPI',
      advisories: [makeAdvisory({ id: 'P1', severity_band: 'high', published: daysAgoIso(10) })],
    });
    const npmRec = makePackageRecord({
      package: 'np',
      ecosystem: 'npm',
      advisories: [makeAdvisory({ id: 'N1', severity_band: 'high', published: daysAgoIso(10) })],
    });
    const snapshot = makeSnapshot([pyRec, npmRec]);
    const r = buildRadar(
      snapshot,
      { ecosystem: 'PyPI', category: null, package: null, min_risk_score: 0 },
      REFERENCE_NOW,
    );
    expect(r.summary.total_open_advisories).toBe(1);
  });
});

describe('buildRadar: response shape', () => {
  it('echoes filter back in the response', () => {
    const snapshot = makeSnapshot([]);
    const r = buildRadar(
      snapshot,
      { ecosystem: 'PyPI', category: 'agents', package: 'langchain', min_risk_score: 25 },
      REFERENCE_NOW,
    );
    expect(r.filter).toEqual({
      ecosystem: 'PyPI',
      category: 'agents',
      package: 'langchain',
      min_risk_score: 25,
    });
  });

  it('preserves snapshot_captured_at from input snapshot', () => {
    const snapshot = makeSnapshot([], '2026-01-15T12:34:56.000Z');
    const r = buildRadar(
      snapshot,
      { ecosystem: null, category: null, package: null, min_risk_score: 0 },
      REFERENCE_NOW,
    );
    expect(r.snapshot_captured_at).toBe('2026-01-15T12:34:56.000Z');
  });

  it('capturedAt is the ISO string of now', () => {
    const snapshot = makeSnapshot([]);
    const r = buildRadar(
      snapshot,
      { ecosystem: null, category: null, package: null, min_risk_score: 0 },
      REFERENCE_NOW,
    );
    expect(r.capturedAt).toBe(REFERENCE_NOW.toISOString());
  });

  it('source field is osv.dev', () => {
    const snapshot = makeSnapshot([]);
    const r = buildRadar(
      snapshot,
      { ecosystem: null, category: null, package: null, min_risk_score: 0 },
      REFERENCE_NOW,
    );
    expect(r.source).toBe('osv.dev');
  });

  it('attribution.source mentions OSV', () => {
    const snapshot = makeSnapshot([]);
    const r = buildRadar(
      snapshot,
      { ecosystem: null, category: null, package: null, min_risk_score: 0 },
      REFERENCE_NOW,
    );
    expect(r.attribution.source).toMatch(/OSV/i);
  });

  it('attribution.notes describes the risk_score formula', () => {
    const snapshot = makeSnapshot([]);
    const r = buildRadar(
      snapshot,
      { ecosystem: null, category: null, package: null, min_risk_score: 0 },
      REFERENCE_NOW,
    );
    expect(r.attribution.notes.toLowerCase()).toContain('risk_score');
  });

  it('attribution.license is a non-empty string', () => {
    const snapshot = makeSnapshot([]);
    const r = buildRadar(
      snapshot,
      { ecosystem: null, category: null, package: null, min_risk_score: 0 },
      REFERENCE_NOW,
    );
    expect(typeof r.attribution.license).toBe('string');
    expect(r.attribution.license.length).toBeGreaterThan(0);
  });
});
