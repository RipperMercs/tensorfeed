/**
 * Premium AI-package safety verdict.
 *
 * A single GO / REVIEW / BLOCK ruling on whether an agent should install a
 * given AI/ML package, fusing four TensorFeed security feeds:
 *   1. AI supply-chain IOC feed (known-malicious npm/PyPI packages, GHSA-sourced)
 *   2. The daily OSV per-package advisory snapshot (curated AI/ML list)
 *   3. The GHSA AI-relevant advisory firehose
 *   4. The 6-hourly package-release snapshot (release-cadence context)
 *
 * Coverage honesty (the load-bearing design rule): these feeds cover
 * TensorFeed's tracked AI/ML supply chain, not every package on npm or PyPI.
 * A package present in NONE of the security feeds is OUT OF COVERAGE, which is
 * NOT the same as safe. The handler no-charges that case (AFTA empty_result)
 * rather than returning a false GO. So a GO here means "covered and clean,"
 * never "absent from our lists."
 *
 * Verdict logic (worst signal wins):
 *   BLOCK  : a known-malicious IOC match, OR a GHSA malware-type advisory.
 *   REVIEW : an elevated OSV risk_band (hot or critical), an open critical or
 *            high advisory (OSV or GHSA).
 *   GO     : covered, calm or watch band, no open critical or high advisory.
 *
 * Version handling: the version is echoed and each advisory's vulnerable range
 * plus first_patched_version is surfaced verbatim. v1 keeps the verdict at the
 * package level. Precise semver range-satisfaction gating (does THIS version
 * actually carry the flaw) is a deliberate v1.1 follow-up: getting it wrong in
 * a security verdict is worse than not doing it.
 */

import type {
  AiPkgSecuritySnapshot,
  PackageAdvisory,
  Ecosystem,
} from './ai-package-security-fetcher';
import type { AiSupplyChainSnapshot } from './ai-supply-chain-iocs';
import type { GhsaAiFeedSnapshot } from './ghsa-ai-feed';
import type { PackageReleasesSnapshot } from './ai-package-releases-fetcher';
import { buildRow, type RiskBand } from './premium-ai-package-security';
import { classifyBump } from './ai-package-releases-fetcher';

// ─── Query parsing ─────────────────────────────────────────────────

export type PackageVerdictKind = 'GO' | 'REVIEW' | 'BLOCK';

export interface PackageVerdictQuery {
  package: string;
  ecosystem: Ecosystem;
  version: string | null;
}

export function parseEcosystem(raw: string | null): Ecosystem | null {
  if (raw === null) return null;
  const t = raw.trim().toLowerCase();
  if (t === 'pypi' || t === 'pip') return 'PyPI';
  if (t === 'npm') return 'npm';
  return null;
}

/**
 * True if a feed-reported ecosystem string refers to the same registry as the
 * caller's ecosystem. The feeds disagree on spelling: OSV uses PyPI, the IOC
 * and GHSA feeds use pip for the same registry. Normalize both sides.
 */
export function ecosystemMatches(feedEcosystem: string, query: Ecosystem): boolean {
  const f = feedEcosystem.trim().toLowerCase();
  if (query === 'PyPI') return f === 'pypi' || f === 'pip';
  return f === 'npm';
}

function sameName(a: string, b: string): boolean {
  return a.trim().toLowerCase() === b.trim().toLowerCase();
}

// ─── Result shapes ─────────────────────────────────────────────────

export type ReasonSeverity = 'critical' | 'high' | 'medium' | 'low' | 'info';

export interface VerdictReason {
  signal: 'ioc' | 'osv' | 'ghsa' | 'release';
  severity: ReasonSeverity;
  detail: string;
  source_url: string | null;
}

export interface GhsaMatch {
  advisory_id: string;
  cve_id: string | null;
  type: 'reviewed' | 'unreviewed' | 'malware';
  severity_band: string;
  vulnerable_version_range: string | null;
  first_patched_version: string | null;
  url: string;
}

export interface PackageVerdictResult {
  ok: true;
  verdict_kind: 'package_safety';
  package: string;
  ecosystem: Ecosystem;
  version: string | null;
  verdict: PackageVerdictKind;
  risk_score: number | null;
  risk_band: RiskBand | null;
  reasons: VerdictReason[];
  signals: {
    known_malicious: {
      listed: boolean;
      advisory_id: string | null;
      severity: string | null;
      summary: string | null;
      url: string | null;
    };
    osv: {
      covered: boolean;
      open_count: number;
      critical_count_30d: number;
      high_count_30d: number;
      critical_count_90d: number;
      high_count_90d: number;
      latest_advisory_id: string | null;
      recent_advisories: PackageAdvisory[];
    } | null;
    ghsa: { matched: GhsaMatch[] };
    release: {
      covered: boolean;
      latest_version: string | null;
      latest_published_at: string | null;
      days_since_latest: number | null;
      versions_known_total: number | null;
      latest_bump_kind: string | null;
      is_breaking_recent: boolean;
      new_package: boolean;
    } | null;
  };
  coverage_sources: Array<'ioc' | 'osv' | 'ghsa' | 'release'>;
  recommendation: string;
  captured_at: string;
  sources: Array<{ name: string; url: string; license: string }>;
}

export interface PackageVerdictEmpty {
  ok: false;
  error: 'out_of_coverage';
  package: string;
  ecosystem: Ecosystem;
  version: string | null;
  hint: string;
  coverage_sources: [];
}

export interface VerdictFeeds {
  iocs: AiSupplyChainSnapshot | null;
  security: AiPkgSecuritySnapshot | null;
  ghsa: GhsaAiFeedSnapshot | null;
  releases: PackageReleasesSnapshot | null;
}

const DAY_MS = 24 * 60 * 60 * 1000;
const SEVERITY_ORDER: Record<ReasonSeverity, number> = { critical: 0, high: 1, medium: 2, low: 3, info: 4 };

function daysSince(iso: string | null, now: Date): number | null {
  if (!iso) return null;
  const t = Date.parse(iso);
  if (!Number.isFinite(t)) return null;
  return Math.floor((now.getTime() - t) / DAY_MS);
}

function normalizeSeverity(raw: string | null): ReasonSeverity {
  const s = (raw || '').toLowerCase();
  if (s.includes('critical')) return 'critical';
  if (s.includes('high')) return 'high';
  if (s.includes('medium') || s.includes('moderate')) return 'medium';
  if (s.includes('low')) return 'low';
  return 'info';
}

/** Oldest ISO timestamp among the loaded snapshots; the honest staleness floor. */
function oldestCapturedAt(feeds: VerdictFeeds, fallback: string): string {
  const candidates: string[] = [];
  if (feeds.security) candidates.push(feeds.security.capturedAt);
  if (feeds.iocs) candidates.push(feeds.iocs.generated_at);
  if (feeds.ghsa) candidates.push(feeds.ghsa.generated_at);
  let oldest: string | null = null;
  let oldestMs = Infinity;
  for (const c of candidates) {
    const t = Date.parse(c);
    if (Number.isFinite(t) && t < oldestMs) {
      oldestMs = t;
      oldest = c;
    }
  }
  return oldest ?? fallback;
}

function rank(kind: PackageVerdictKind): number {
  return kind === 'BLOCK' ? 2 : kind === 'REVIEW' ? 1 : 0;
}

function worse(a: PackageVerdictKind, b: PackageVerdictKind): PackageVerdictKind {
  return rank(a) >= rank(b) ? a : b;
}

const SOURCES = [
  { name: 'AI supply-chain IOC feed', url: 'https://tensorfeed.ai/api/security/ai-supply-chain-iocs.json', license: 'GHSA (CC-BY-4.0) republished with attribution' },
  { name: 'OSV.dev advisory snapshot', url: 'https://osv.dev', license: 'Apache-2.0 schema; upstream advisories carry their own terms' },
  { name: 'GHSA AI-relevant advisory firehose', url: 'https://github.com/advisories', license: 'CC-BY-4.0' },
  { name: 'Package release snapshot (PyPI + npm)', url: 'https://tensorfeed.ai/api/packages/releases', license: 'Public registry metadata' },
];

// ─── Builder ───────────────────────────────────────────────────────

export function buildPackageVerdict(
  feeds: VerdictFeeds,
  query: PackageVerdictQuery,
  now: Date,
): PackageVerdictResult | PackageVerdictEmpty {
  const reasons: VerdictReason[] = [];
  const coverage: Array<'ioc' | 'osv' | 'ghsa' | 'release'> = [];
  let verdict: PackageVerdictKind = 'GO';

  // 1. IOC: known-malicious match. Strongest signal, an outright BLOCK.
  let iocSignal: PackageVerdictResult['signals']['known_malicious'] = {
    listed: false,
    advisory_id: null,
    severity: null,
    summary: null,
    url: null,
  };
  if (feeds.iocs) {
    const hit = feeds.iocs.entries.find(
      (e) => sameName(e.package.name, query.package) && ecosystemMatches(e.package.ecosystem, query.ecosystem),
    );
    if (hit) {
      coverage.push('ioc');
      iocSignal = {
        listed: true,
        advisory_id: hit.advisory_id,
        severity: hit.severity,
        summary: hit.summary,
        url: hit.url,
      };
      verdict = worse(verdict, 'BLOCK');
      reasons.push({
        signal: 'ioc',
        severity: 'critical',
        detail: `Listed as a known-malicious package in the AI supply-chain IOC feed (${hit.advisory_id}).`,
        source_url: hit.url,
      });
    }
  }

  // 2. OSV: per-package advisory record over the curated AI/ML list.
  let osvSignal: PackageVerdictResult['signals']['osv'] = null;
  let risk_score: number | null = null;
  let risk_band: RiskBand | null = null;
  if (feeds.security) {
    const record = feeds.security.records.find(
      (r) => sameName(r.package, query.package) && r.ecosystem === query.ecosystem,
    );
    if (record) {
      coverage.push('osv');
      const row = buildRow(record, now);
      risk_score = row.risk_score;
      risk_band = row.risk_band;
      osvSignal = {
        covered: true,
        open_count: row.open_count,
        critical_count_30d: row.critical_count_30d,
        high_count_30d: row.high_count_30d,
        critical_count_90d: row.critical_count_90d,
        high_count_90d: row.high_count_90d,
        latest_advisory_id: row.latest_advisory_id,
        recent_advisories: row.recent_advisories,
      };
      if (row.risk_band === 'critical' || row.risk_band === 'hot') {
        verdict = worse(verdict, 'REVIEW');
        reasons.push({
          signal: 'osv',
          severity: row.risk_band === 'critical' ? 'critical' : 'high',
          detail: `OSV risk_band is ${row.risk_band} (risk_score ${row.risk_score}): ${row.critical_count_90d} critical and ${row.high_count_90d} high advisories in the last 90 days.`,
          source_url: row.latest_advisory_id ? `https://osv.dev/vulnerability/${row.latest_advisory_id}` : null,
        });
      } else if (row.critical_count_90d > 0 || row.high_count_90d > 0) {
        verdict = worse(verdict, 'REVIEW');
        reasons.push({
          signal: 'osv',
          severity: row.critical_count_90d > 0 ? 'critical' : 'high',
          detail: `${row.critical_count_90d} critical and ${row.high_count_90d} high advisories in the last 90 days (risk_band ${row.risk_band}).`,
          source_url: row.latest_advisory_id ? `https://osv.dev/vulnerability/${row.latest_advisory_id}` : null,
        });
      }
    }
  }

  // 3. GHSA: AI-relevant advisory firehose, matched to this package.
  const ghsaMatched: GhsaMatch[] = [];
  if (feeds.ghsa) {
    for (const e of feeds.ghsa.entries) {
      if (!sameName(e.package.name, query.package)) continue;
      if (!ecosystemMatches(e.package.ecosystem, query.ecosystem)) continue;
      ghsaMatched.push({
        advisory_id: e.advisory_id,
        cve_id: e.cve_id,
        type: e.type,
        severity_band: e.severity_band,
        vulnerable_version_range: e.vulnerable_version_range,
        first_patched_version: e.first_patched_version,
        url: e.url,
      });
    }
    if (ghsaMatched.length > 0) {
      coverage.push('ghsa');
      const malware = ghsaMatched.find((m) => m.type === 'malware');
      if (malware) {
        verdict = worse(verdict, 'BLOCK');
        reasons.push({
          signal: 'ghsa',
          severity: 'critical',
          detail: `GHSA classifies this package as malware (${malware.advisory_id}).`,
          source_url: malware.url,
        });
      }
      const critical = ghsaMatched.find((m) => m.type !== 'malware' && normalizeSeverity(m.severity_band) === 'critical');
      const high = ghsaMatched.find((m) => m.type !== 'malware' && normalizeSeverity(m.severity_band) === 'high');
      if (critical) {
        verdict = worse(verdict, 'REVIEW');
        reasons.push({
          signal: 'ghsa',
          severity: 'critical',
          detail: `Open critical GHSA advisory ${critical.advisory_id}${critical.first_patched_version ? ` (first patched in ${critical.first_patched_version})` : ''}.`,
          source_url: critical.url,
        });
      } else if (high) {
        verdict = worse(verdict, 'REVIEW');
        reasons.push({
          signal: 'ghsa',
          severity: 'high',
          detail: `Open high-severity GHSA advisory ${high.advisory_id}${high.first_patched_version ? ` (first patched in ${high.first_patched_version})` : ''}.`,
          source_url: high.url,
        });
      }
    }
  }

  // 4. Release cadence: context only in v1, never flips the verdict band.
  let releaseSignal: PackageVerdictResult['signals']['release'] = null;
  if (feeds.releases) {
    const rec = feeds.releases.records.find(
      (r) => sameName(r.package, query.package) && r.ecosystem === query.ecosystem,
    );
    if (rec) {
      coverage.push('release');
      const days_since_latest = daysSince(rec.latest_published_at, now);
      let latest_bump_kind: string | null = null;
      if (rec.versions_recent.length >= 2) {
        latest_bump_kind = classifyBump(rec.versions_recent[1].version, rec.versions_recent[0].version);
      }
      const is_breaking_recent = latest_bump_kind === 'major' && days_since_latest !== null && days_since_latest <= 30;
      const new_package = rec.versions_known_total <= 2;
      releaseSignal = {
        covered: true,
        latest_version: rec.latest_version,
        latest_published_at: rec.latest_published_at,
        days_since_latest,
        versions_known_total: rec.versions_known_total,
        latest_bump_kind,
        is_breaking_recent,
        new_package,
      };
      if (is_breaking_recent) {
        reasons.push({
          signal: 'release',
          severity: 'info',
          detail: `Latest version ${rec.latest_version} is a breaking major published ${days_since_latest} day(s) ago. Verify your pinned range.`,
          source_url: rec.homepage,
        });
      }
    }
  }

  // Coverage gate: only the security feeds (ioc, osv, ghsa) count as coverage.
  // A release-only presence is not a safety signal, so it cannot stand in for
  // a real verdict. No safety coverage means no-charge, not a false GO.
  const hasSafetyCoverage = iocSignal.listed || osvSignal !== null || ghsaMatched.length > 0;
  if (!hasSafetyCoverage) {
    return {
      ok: false,
      error: 'out_of_coverage',
      package: query.package,
      ecosystem: query.ecosystem,
      version: query.version,
      hint: 'This package is not in any TensorFeed AI/ML security feed (the known-malicious IOC list, the OSV advisory snapshot of curated AI packages, or the GHSA AI-relevant firehose). Out of coverage is not a clean bill of health: verify independently. The verdict covers AI/ML supply-chain packages.',
      coverage_sources: [],
    };
  }

  reasons.sort((a, b) => SEVERITY_ORDER[a.severity] - SEVERITY_ORDER[b.severity]);

  let recommendation: string;
  if (verdict === 'BLOCK') {
    recommendation = `Do not install ${query.package}. It is flagged as known-malicious. Choose a different package or pin to a vetted source.`;
  } else if (verdict === 'REVIEW') {
    recommendation = `Review before installing ${query.package}. There are open advisories; pin to a patched version where a first_patched_version is listed and confirm your range is unaffected.`;
  } else {
    recommendation = `No blocking signals for ${query.package} in TensorFeed AI/ML supply-chain coverage as of ${oldestCapturedAt(feeds, now.toISOString())}. Standard supply-chain diligence still applies.`;
  }

  return {
    ok: true,
    verdict_kind: 'package_safety',
    package: query.package,
    ecosystem: query.ecosystem,
    version: query.version,
    verdict,
    risk_score,
    risk_band,
    reasons,
    signals: {
      known_malicious: iocSignal,
      osv: osvSignal,
      ghsa: { matched: ghsaMatched },
      release: releaseSignal,
    },
    coverage_sources: coverage,
    recommendation,
    captured_at: oldestCapturedAt(feeds, now.toISOString()),
    sources: SOURCES,
  };
}
