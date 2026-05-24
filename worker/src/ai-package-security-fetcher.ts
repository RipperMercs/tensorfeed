/**
 * AI-package security fetcher.
 *
 * For every package in the curated PyPI + npm AI lists (worker/src/
 * pypi-ai-packages.ts + npm-ai-packages.ts), query OSV.dev for the full
 * vulnerability list affecting that package. Normalize and store as a
 * single KV snapshot.
 *
 * OSV.dev is Google-hosted, no auth, free. Aggregates GHSA + PyPA + RustSec
 * + Go vulndb + Maven + npm + many others, deduped by canonical id.
 * Endpoint: POST https://api.osv.dev/v1/query with
 *   { "package": { "name": "langchain", "ecosystem": "PyPI" } }
 * License: Apache 2.0 for the schema; per-record license varies by upstream.
 *
 * Different lens from the existing /api/security/ghsa/ai-feed (which is
 * GHSA-only, AI-keyword filtered, returns ALL ecosystems). This module is
 * PACKAGE-CENTRIC: for each of OUR curated AI packages, the full security
 * history. Pairs together: agents can ask "what AI advisories landed
 * recently" (keyword-firehose) OR "what's the security history of this
 * specific AI package I depend on" (package-centric).
 *
 * Refresh: daily 05:45 UTC. Sequential per-package calls in batches of 10.
 * Cache: avid-style avid:current pattern under ai-pkg-sec:* prefix.
 *
 * Free   /api/ai-safety/packages/security?package=&ecosystem=
 * Paid   /api/premium/ai-safety/packages/security/radar (1 credit)
 */

import type { Env } from './types';
import { CURATED_PYPI_PACKAGES } from './pypi-ai-packages';
import { CURATED_PACKAGES as CURATED_NPM_PACKAGES } from './npm-ai-packages';

const OSV_QUERY_URL = 'https://api.osv.dev/v1/query';
const POLITE_UA = 'tensorfeed-security/1.0 (mailto:evan@tensorfeed.ai; +https://tensorfeed.ai)';
const FETCH_TIMEOUT_MS = 15_000;

export const AI_PKG_SEC_CURRENT_KEY = 'ai-pkg-sec:current';
export const AI_PKG_SEC_INDEX_KEY = 'ai-pkg-sec:index';
export const AI_PKG_SEC_DAILY_KEY_PREFIX = 'ai-pkg-sec:daily:';

// ── OSV API shapes (loose; tolerate missing fields) ────────────────

interface OsvSeverity {
  type?: string;
  score?: string;
}

interface OsvAffectedRange {
  type?: string;
  events?: Array<{ introduced?: string; fixed?: string; last_affected?: string }>;
}

interface OsvAffected {
  package?: { name?: string; ecosystem?: string };
  ranges?: OsvAffectedRange[];
  versions?: string[];
}

interface OsvReference {
  type?: string;
  url?: string;
}

interface OsvDatabaseSpecific {
  severity?: string;
  github_reviewed?: boolean;
}

interface OsvVuln {
  id?: string;
  aliases?: string[];
  summary?: string;
  details?: string;
  modified?: string;
  published?: string;
  withdrawn?: string;
  severity?: OsvSeverity[];
  affected?: OsvAffected[];
  references?: OsvReference[];
  database_specific?: OsvDatabaseSpecific;
}

interface OsvQueryResponse {
  vulns?: OsvVuln[];
}

// ── Normalized TF shape ────────────────────────────────────────────

export type Ecosystem = 'PyPI' | 'npm';
export type SeverityBand = 'critical' | 'high' | 'medium' | 'low' | 'unknown';

export interface PackageAdvisory {
  id: string;                          // canonical id (GHSA-..., PYSEC-..., or CVE-...)
  aliases: string[];
  summary: string;
  published: string;                   // ISO date
  modified: string;
  withdrawn: string | null;
  severity_band: SeverityBand;
  cvss_score: number | null;
  vulnerable_versions: string[];
  first_patched_version: string | null;
  reference_urls: string[];
}

export interface PackageSecurityRecord {
  package: string;
  ecosystem: Ecosystem;
  category: string;
  description: string;
  homepage: string | null;
  fetched_at: string;
  advisories_count: number;
  open_count: number;                  // non-withdrawn
  withdrawn_count: number;
  latest_advisory_id: string | null;
  latest_published: string | null;
  advisories: PackageAdvisory[];
}

export interface AiPkgSecuritySnapshot {
  capturedAt: string;
  source: 'osv.dev';
  source_license: 'Apache-2.0 (schema); upstream advisories under their own terms';
  package_count: number;
  records: PackageSecurityRecord[];
}

// ── Helpers ────────────────────────────────────────────────────────

function bandFromSeverity(sev?: OsvSeverity[], dbSpecific?: OsvDatabaseSpecific): { band: SeverityBand; score: number | null } {
  // Prefer CVSS_V3 / CVSS_V4 score; fall back to GHSA database_specific.severity string.
  const cvss = sev?.find((s) => s.type === 'CVSS_V4') ?? sev?.find((s) => s.type === 'CVSS_V3') ?? sev?.[0];
  if (cvss?.score) {
    // OSV score format is the full CVSS vector OR a numeric string. Pull the trailing /N.N if present.
    const m = cvss.score.match(/(\d+\.\d+)$/) ?? cvss.score.match(/^(\d+\.\d+)/);
    const num = m ? parseFloat(m[1]) : NaN;
    if (Number.isFinite(num)) {
      let band: SeverityBand;
      if (num >= 9.0) band = 'critical';
      else if (num >= 7.0) band = 'high';
      else if (num >= 4.0) band = 'medium';
      else if (num > 0) band = 'low';
      else band = 'unknown';
      return { band, score: num };
    }
  }
  const ghsaSev = dbSpecific?.severity?.toLowerCase();
  if (ghsaSev === 'critical' || ghsaSev === 'high' || ghsaSev === 'medium' || ghsaSev === 'low') {
    return { band: ghsaSev, score: null };
  }
  return { band: 'unknown', score: null };
}

function extractFirstPatched(affected: OsvAffected[] | undefined): string | null {
  for (const a of affected ?? []) {
    for (const r of a.ranges ?? []) {
      for (const e of r.events ?? []) {
        if (e.fixed) return e.fixed;
      }
    }
  }
  return null;
}

function extractVulnerableVersions(affected: OsvAffected[] | undefined, pkg: string, ecosystem: string): string[] {
  const out = new Set<string>();
  for (const a of affected ?? []) {
    if (a.package?.name?.toLowerCase() !== pkg.toLowerCase()) continue;
    if (a.package?.ecosystem !== ecosystem) continue;
    for (const v of a.versions ?? []) out.add(v);
    for (const r of a.ranges ?? []) {
      const events = r.events ?? [];
      const intro = events.find((e) => e.introduced)?.introduced;
      const fixed = events.find((e) => e.fixed)?.fixed;
      const lastAff = events.find((e) => e.last_affected)?.last_affected;
      if (intro || fixed || lastAff) {
        out.add(`${intro ?? '0'}-${fixed ?? lastAff ?? 'unspecified'}`);
      }
    }
  }
  return Array.from(out);
}

export function normalizeAdvisory(v: OsvVuln, pkg: string, ecosystem: string): PackageAdvisory | null {
  if (!v.id || typeof v.id !== 'string') return null;
  const aliases = (v.aliases ?? []).filter((s): s is string => typeof s === 'string');
  const { band, score } = bandFromSeverity(v.severity, v.database_specific);
  return {
    id: v.id,
    aliases,
    summary: typeof v.summary === 'string' ? v.summary.slice(0, 280) : '',
    published: typeof v.published === 'string' ? v.published : '',
    modified: typeof v.modified === 'string' ? v.modified : '',
    withdrawn: typeof v.withdrawn === 'string' ? v.withdrawn : null,
    severity_band: band,
    cvss_score: score,
    vulnerable_versions: extractVulnerableVersions(v.affected, pkg, ecosystem),
    first_patched_version: extractFirstPatched(v.affected),
    reference_urls: (v.references ?? [])
      .filter((r) => typeof r?.url === 'string')
      .map((r) => r.url as string),
  };
}

// ── OSV fetcher ────────────────────────────────────────────────────

async function fetchWithTimeout(url: string, init: RequestInit, ms = FETCH_TIMEOUT_MS): Promise<Response> {
  const controller = new AbortController();
  const id = setTimeout(() => controller.abort(), ms);
  try {
    return await fetch(url, { ...init, signal: controller.signal });
  } finally {
    clearTimeout(id);
  }
}

async function queryOsvForPackage(pkg: string, ecosystem: Ecosystem): Promise<PackageAdvisory[]> {
  try {
    const res = await fetchWithTimeout(OSV_QUERY_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'User-Agent': POLITE_UA,
        Accept: 'application/json',
      },
      body: JSON.stringify({ package: { name: pkg, ecosystem } }),
    });
    if (!res.ok) return [];
    const body = (await res.json()) as OsvQueryResponse;
    const vulns = body.vulns ?? [];
    const out: PackageAdvisory[] = [];
    for (const v of vulns) {
      const adv = normalizeAdvisory(v, pkg, ecosystem);
      if (adv) out.push(adv);
    }
    // Sort by published desc so the freshest is first.
    out.sort((a, b) => (b.published ?? '').localeCompare(a.published ?? ''));
    return out;
  } catch {
    return [];
  }
}

function buildRecord(
  pkg: string,
  ecosystem: Ecosystem,
  category: string,
  description: string,
  homepage: string | null,
  advisories: PackageAdvisory[],
): PackageSecurityRecord {
  const open = advisories.filter((a) => !a.withdrawn);
  const withdrawn = advisories.filter((a) => a.withdrawn);
  const latest = advisories[0] ?? null;
  return {
    package: pkg,
    ecosystem,
    category,
    description,
    homepage,
    fetched_at: new Date().toISOString(),
    advisories_count: advisories.length,
    open_count: open.length,
    withdrawn_count: withdrawn.length,
    latest_advisory_id: latest?.id ?? null,
    latest_published: latest?.published ?? null,
    advisories,
  };
}

/**
 * Top-level refresh. Walks both curated lists, queries OSV per package
 * in parallel batches of 10, writes the unified snapshot to KV.
 */
export async function refreshAiPackageSecuritySnapshot(env: Env): Promise<AiPkgSecuritySnapshot> {
  const tasks: Array<{ pkg: string; ecosystem: Ecosystem; category: string; description: string; homepage: string | null }> = [];

  for (const p of CURATED_PYPI_PACKAGES) {
    tasks.push({ pkg: p.name, ecosystem: 'PyPI', category: p.category, description: p.description, homepage: p.homepage ?? null });
  }
  for (const p of CURATED_NPM_PACKAGES) {
    tasks.push({ pkg: p.name, ecosystem: 'npm', category: p.category, description: p.description, homepage: p.homepage ?? null });
  }

  const records: PackageSecurityRecord[] = [];
  const batchSize = 10;
  for (let i = 0; i < tasks.length; i += batchSize) {
    const batch = tasks.slice(i, i + batchSize);
    const results = await Promise.all(
      batch.map(async (t) => {
        const advisories = await queryOsvForPackage(t.pkg, t.ecosystem);
        return buildRecord(t.pkg, t.ecosystem, t.category, t.description, t.homepage, advisories);
      }),
    );
    for (const r of results) records.push(r);
  }

  const snapshot: AiPkgSecuritySnapshot = {
    capturedAt: new Date().toISOString(),
    source: 'osv.dev',
    source_license: 'Apache-2.0 (schema); upstream advisories under their own terms',
    package_count: records.length,
    records,
  };

  const dateKey = snapshot.capturedAt.slice(0, 10);
  await env.TENSORFEED_CACHE.put(AI_PKG_SEC_CURRENT_KEY, JSON.stringify(snapshot));
  await env.TENSORFEED_CACHE.put(`${AI_PKG_SEC_DAILY_KEY_PREFIX}${dateKey}`, JSON.stringify(snapshot));

  const idxRaw = (await env.TENSORFEED_CACHE.get(AI_PKG_SEC_INDEX_KEY, 'json')) as string[] | null;
  const dates = idxRaw ?? [];
  if (!dates.includes(dateKey)) {
    dates.push(dateKey);
    dates.sort();
    await env.TENSORFEED_CACHE.put(AI_PKG_SEC_INDEX_KEY, JSON.stringify(dates.slice(-365)));
  }
  return snapshot;
}

export async function getAiPackageSecuritySnapshot(env: Env): Promise<AiPkgSecuritySnapshot | null> {
  return (await env.TENSORFEED_CACHE.get(AI_PKG_SEC_CURRENT_KEY, 'json')) as AiPkgSecuritySnapshot | null;
}
