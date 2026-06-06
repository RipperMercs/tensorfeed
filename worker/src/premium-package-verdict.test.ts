import { describe, it, expect } from 'vitest';
import {
  buildPackageVerdict,
  parseEcosystem,
  ecosystemMatches,
  type VerdictFeeds,
} from './premium-package-verdict';
import type {
  AiPkgSecuritySnapshot,
  PackageSecurityRecord,
  PackageAdvisory,
} from './ai-package-security-fetcher';
import type { AiSupplyChainSnapshot, AiSupplyChainEntry } from './ai-supply-chain-iocs';
import type { GhsaAiFeedSnapshot, GhsaAiAdvisoryEntry } from './ghsa-ai-feed';
import type { PackageReleasesSnapshot, PackageReleaseRecord } from './ai-package-releases-fetcher';

const NOW = new Date('2026-06-06T12:00:00Z');

// ── Mock factories ─────────────────────────────────────────────────

function advisory(overrides: Partial<PackageAdvisory> = {}): PackageAdvisory {
  return {
    id: 'GHSA-aaaa-bbbb-cccc',
    aliases: [],
    summary: 'test advisory',
    published: '2026-06-01T00:00:00Z',
    modified: '2026-06-01T00:00:00Z',
    withdrawn: null,
    severity_band: 'high',
    cvss_score: 7.5,
    vulnerable_versions: ['<1.0.0'],
    first_patched_version: '1.0.0',
    reference_urls: [],
    ...overrides,
  };
}

function securityRecord(overrides: Partial<PackageSecurityRecord> = {}): PackageSecurityRecord {
  return {
    package: 'langchain',
    ecosystem: 'PyPI',
    category: 'agent-framework',
    description: '',
    homepage: null,
    fetched_at: '2026-06-06T05:45:00Z',
    advisories_count: 0,
    open_count: 0,
    withdrawn_count: 0,
    latest_advisory_id: null,
    latest_published: null,
    advisories: [],
    ...overrides,
  };
}

function securitySnapshot(records: PackageSecurityRecord[]): AiPkgSecuritySnapshot {
  return {
    capturedAt: '2026-06-06T05:45:00Z',
    source: 'osv.dev',
    source_license: 'Apache-2.0 (schema); upstream advisories under their own terms',
    package_count: records.length,
    records,
  };
}

function iocEntry(name: string, ecosystem = 'pip'): AiSupplyChainEntry {
  return {
    package: { name, ecosystem },
    advisory_id: 'GHSA-mal0-mal0-mal0',
    severity: 'critical',
    summary: 'malicious package',
    published_at: '2026-06-01',
    url: 'https://github.com/advisories/GHSA-mal0-mal0-mal0',
    vulnerable_version_range: null,
    ai_relevance: { matched_keywords: [] },
    primary_source: 'GHSA',
  };
}

function iocSnapshot(entries: AiSupplyChainEntry[]): AiSupplyChainSnapshot {
  return { generated_at: '2026-06-06T07:15:00Z', total: entries.length, entries, sources: [], posture: '' };
}

function ghsaEntry(overrides: Partial<GhsaAiAdvisoryEntry> = {}): GhsaAiAdvisoryEntry {
  return {
    advisory_id: 'GHSA-ghsa-ghsa-ghsa',
    cve_id: null,
    type: 'reviewed',
    severity_band: 'high',
    package: { name: 'langchain', ecosystem: 'pip' },
    vulnerable_version_range: '<1.0.0',
    first_patched_version: '1.0.0',
    summary: 'advisory summary',
    published_at: '2026-06-01',
    age_days: 5,
    cwes: [],
    references_count: 0,
    url: 'https://github.com/advisories/GHSA-ghsa-ghsa-ghsa',
    ai_relevance: { matched_keywords: [], confidence: 'high' },
    ...overrides,
  };
}

function ghsaSnapshot(entries: GhsaAiAdvisoryEntry[]): GhsaAiFeedSnapshot {
  return {
    generated_at: '2026-06-06T06:00:00Z',
    total: entries.length,
    by_severity: { critical: 0, high: 0, medium: 0, low: 0, unknown: 0 },
    by_ecosystem: {},
    by_type: { reviewed: 0, unreviewed: 0, malware: 0 },
    entries,
    sources: [],
    posture: '',
  };
}

function releaseRecord(overrides: Partial<PackageReleaseRecord> = {}): PackageReleaseRecord {
  return {
    package: 'randompkg',
    ecosystem: 'PyPI',
    category: '',
    description: '',
    homepage: null,
    latest_version: '1.0.0',
    latest_published_at: '2026-06-01T00:00:00Z',
    versions_recent: [],
    versions_known_total: 5,
    fetched_at: '2026-06-06T00:00:00Z',
    ...overrides,
  };
}

function releasesSnapshot(records: PackageReleaseRecord[]): PackageReleasesSnapshot {
  return {
    capturedAt: '2026-06-06T00:00:00Z',
    source: 'pypi.org + registry.npmjs.org',
    source_license:
      'PyPI and npm registry JSON endpoints are public; package metadata is editorial-redistributable. Per-package licenses vary.',
    package_count: records.length,
    records,
  };
}

const EMPTY: VerdictFeeds = { iocs: null, security: null, ghsa: null, releases: null };

// ── parsing helpers ────────────────────────────────────────────────

describe('parseEcosystem', () => {
  it('maps pypi and pip to PyPI', () => {
    expect(parseEcosystem('PyPI')).toBe('PyPI');
    expect(parseEcosystem('pypi')).toBe('PyPI');
    expect(parseEcosystem('pip')).toBe('PyPI');
  });
  it('maps npm to npm', () => {
    expect(parseEcosystem('npm')).toBe('npm');
    expect(parseEcosystem('NPM')).toBe('npm');
  });
  it('rejects unknown and null', () => {
    expect(parseEcosystem('cargo')).toBeNull();
    expect(parseEcosystem(null)).toBeNull();
  });
});

describe('ecosystemMatches', () => {
  it('treats pip and PyPI as the same registry', () => {
    expect(ecosystemMatches('pip', 'PyPI')).toBe(true);
    expect(ecosystemMatches('PyPI', 'PyPI')).toBe(true);
    expect(ecosystemMatches('npm', 'PyPI')).toBe(false);
  });
  it('matches npm only to npm', () => {
    expect(ecosystemMatches('npm', 'npm')).toBe(true);
    expect(ecosystemMatches('pip', 'npm')).toBe(false);
  });
});

// ── verdict logic ──────────────────────────────────────────────────

describe('/api/premium/security/package-verdict', () => {
  it('BLOCKs a known-malicious package from the IOC feed', () => {
    const feeds: VerdictFeeds = { ...EMPTY, iocs: iocSnapshot([iocEntry('evilpkg', 'pip')]) };
    const r = buildPackageVerdict(feeds, { package: 'evilpkg', ecosystem: 'PyPI', version: null }, NOW);
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    expect(r.verdict).toBe('BLOCK');
    expect(r.signals.known_malicious.listed).toBe(true);
    expect(r.coverage_sources).toContain('ioc');
  });

  it('BLOCKs a GHSA malware-typed advisory', () => {
    const feeds: VerdictFeeds = {
      ...EMPTY,
      ghsa: ghsaSnapshot([ghsaEntry({ type: 'malware', severity_band: 'critical', package: { name: 'badpkg', ecosystem: 'npm' } })]),
    };
    const r = buildPackageVerdict(feeds, { package: 'badpkg', ecosystem: 'npm', version: null }, NOW);
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    expect(r.verdict).toBe('BLOCK');
  });

  it('REVIEWs an OSV record in the hot/critical band', () => {
    const rec = securityRecord({
      open_count: 1,
      advisories: [advisory({ severity_band: 'critical', published: '2026-06-01T00:00:00Z' })],
      latest_advisory_id: 'GHSA-aaaa-bbbb-cccc',
      latest_published: '2026-06-01T00:00:00Z',
    });
    const feeds: VerdictFeeds = { ...EMPTY, security: securitySnapshot([rec]) };
    const r = buildPackageVerdict(feeds, { package: 'langchain', ecosystem: 'PyPI', version: null }, NOW);
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    expect(r.verdict).toBe('REVIEW');
    expect(r.risk_score).not.toBeNull();
    expect(r.risk_score! >= 25).toBe(true);
    expect(['hot', 'critical']).toContain(r.risk_band);
  });

  it('REVIEWs an open critical GHSA advisory that is not malware', () => {
    const feeds: VerdictFeeds = {
      ...EMPTY,
      ghsa: ghsaSnapshot([ghsaEntry({ type: 'reviewed', severity_band: 'critical' })]),
    };
    const r = buildPackageVerdict(feeds, { package: 'langchain', ecosystem: 'PyPI', version: null }, NOW);
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    expect(r.verdict).toBe('REVIEW');
    expect(r.signals.ghsa.matched.length).toBe(1);
  });

  it('returns GO for a covered, clean package', () => {
    const feeds: VerdictFeeds = {
      iocs: iocSnapshot([]),
      security: securitySnapshot([securityRecord()]),
      ghsa: ghsaSnapshot([]),
      releases: null,
    };
    const r = buildPackageVerdict(feeds, { package: 'langchain', ecosystem: 'PyPI', version: null }, NOW);
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    expect(r.verdict).toBe('GO');
    expect(r.risk_band).toBe('calm');
    expect(r.coverage_sources).toContain('osv');
  });

  it('no-charges (out_of_coverage) when the package is in no security feed, even if releases knows it', () => {
    const feeds: VerdictFeeds = {
      iocs: iocSnapshot([]),
      security: securitySnapshot([]),
      ghsa: ghsaSnapshot([]),
      releases: releasesSnapshot([releaseRecord({ package: 'randompkg', ecosystem: 'PyPI' })]),
    };
    const r = buildPackageVerdict(feeds, { package: 'randompkg', ecosystem: 'PyPI', version: null }, NOW);
    expect(r.ok).toBe(false);
    if (r.ok) return;
    expect(r.error).toBe('out_of_coverage');
    expect(r.coverage_sources).toEqual([]);
  });

  it('reports the oldest contributing snapshot as captured_at', () => {
    const feeds: VerdictFeeds = {
      iocs: iocSnapshot([]),
      security: securitySnapshot([securityRecord()]),
      ghsa: ghsaSnapshot([]),
      releases: null,
    };
    const r = buildPackageVerdict(feeds, { package: 'langchain', ecosystem: 'PyPI', version: null }, NOW);
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    // security 05:45, ioc 07:15, ghsa 06:00 -> oldest is the OSV snapshot.
    expect(r.captured_at).toBe('2026-06-06T05:45:00Z');
  });

  it('emits no em dashes or double hyphens in any output string', () => {
    const emDash = String.fromCharCode(0x2014);
    const doubleHyphen = '-' + '-';
    const block = buildPackageVerdict({ ...EMPTY, iocs: iocSnapshot([iocEntry('evilpkg', 'pip')]) }, { package: 'evilpkg', ecosystem: 'PyPI', version: null }, NOW);
    const empty = buildPackageVerdict(
      { iocs: iocSnapshot([]), security: securitySnapshot([]), ghsa: ghsaSnapshot([]), releases: null },
      { package: 'nope', ecosystem: 'npm', version: null },
      NOW,
    );
    for (const json of [JSON.stringify(block), JSON.stringify(empty)]) {
      expect(json.includes(emDash)).toBe(false);
      expect(json.includes(doubleHyphen)).toBe(false);
    }
  });
});
