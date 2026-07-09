/**
 * Premium Stack Safety Verdict.
 *
 * The deploy-gate decision two agent classes (coding + security) asked
 * for: give it a list of package@version from your AI stack, get one
 * GO / HOLD / BLOCK gate per package plus an overall verdict, fusing
 * TensorFeed's ingested AI-CVE batch (GHSA + vendor advisories) with the
 * CISA KEV catalog for exploitation status. One signed call replaces the
 * fan-out an agent would otherwise run (per-package advisory lookup, then
 * per-CVE KEV cross-check, then the gate logic).
 *
 * Free sibling: /api/preview/stack-safety-verdict (gate + per-package
 * verdict only, no CVE evidence, capped + rate-limited).
 * Premium: /api/premium/stack-safety-verdict (full matched-CVE evidence +
 * ranges + fixes + an AFTA-signed receipt). 1 credit, strict-premium.
 *
 * HONESTY (never-false-confirm): affected_version_ranges are heterogeneous
 * advisory strings, so v1 does NOT parse your pinned version against them.
 * Verdicts are therefore conservative:
 *   - BLOCK only when an exploited CVE for the package has no fix listed.
 *   - HOLD whenever a known CVE applies (the agent must verify its pinned
 *     version against the surfaced ranges + fixes).
 *   - PASS when no AI-stack CVE matches the package name (NOT a full
 *     vulnerability scan, just the AI-stack batch).
 *   - UNKNOWN when the package is outside TF's curated AI-stack cohort, so
 *     we cannot assess it. Disclosed plainly.
 * v2 adds precise cross-ecosystem version-range intersection and EPSS
 * (EPSS is lazy per-CVE upstream, so it is kept out of the hot paid path).
 *
 * Brand: AI-stack security only. A general lockfile gate belongs on a
 * sister site.
 */

import type { Env } from './types';
import { safePut } from './kill-switch';
import {
  getAiFlagged,
  classifyProduct,
  publicAttribution,
  type AiCvesPaper,
  type AiCategory,
  type ExploitedInWild,
} from './ai-cves-feed';
import { readKEVCurrent } from './security-kev';

export const STACK_MAX_PACKAGES = 10;

export type StackVerdict = 'PASS' | 'HOLD' | 'BLOCK' | 'UNKNOWN';

const NAME_RE = /^[A-Za-z0-9._/@-]{1,128}$/;
const VERSION_RE = /^[A-Za-z0-9.+_-]{1,64}$/;

export interface PackageInput {
  name: string;
  version: string | null;
  /** GHSA-vocabulary ecosystem implied by the input surface ('pip' from
   * requirements/poetry lockfiles, 'npm' from package.json/package-lock).
   * Absent on the ?packages= query form, where the surface says nothing. */
  ecosystem?: string;
}

export type ParsePackagesResult =
  | { ok: true; packages: PackageInput[] }
  | { ok: false; error: string; hint: string };

/**
 * Parse `?packages=langchain@0.3.27,vllm@0.6.0`. Version is optional and
 * split on the LAST '@' so scoped npm names (@scope/pkg@1.2) parse right.
 */
export function parsePackagesParam(raw: string | null): ParsePackagesResult {
  const hint = `Pass packages=name@version,name@version (comma-separated, version optional). Up to ${STACK_MAX_PACKAGES} packages per call. Example: packages=langchain@0.3.27,vllm@0.6.0`;
  if (!raw || !raw.trim()) return { ok: false, error: 'missing_packages', hint };
  const parts = raw.split(',').map((s) => s.trim()).filter(Boolean);
  if (parts.length === 0) return { ok: false, error: 'missing_packages', hint };
  if (parts.length > STACK_MAX_PACKAGES) {
    return { ok: false, error: 'too_many_packages', hint: `Max ${STACK_MAX_PACKAGES} packages per call. Got ${parts.length}.` };
  }
  const packages: PackageInput[] = [];
  for (const part of parts) {
    const at = part.lastIndexOf('@');
    let name: string;
    let version: string | null;
    if (at > 0) {
      name = part.slice(0, at);
      version = part.slice(at + 1);
    } else {
      name = part;
      version = null;
    }
    if (!NAME_RE.test(name)) {
      return { ok: false, error: 'invalid_package_name', hint: `Package name ${JSON.stringify(name)} is not a valid name.` };
    }
    if (version !== null && version !== '' && !VERSION_RE.test(version)) {
      return { ok: false, error: 'invalid_version', hint: `Version ${JSON.stringify(version)} is not a valid version string.` };
    }
    packages.push({ name, version: version || null });
  }
  return { ok: true, packages };
}

// ─── Verdict shapes ─────────────────────────────────────────────────

export interface MatchedCve {
  cve_id: string;
  on_kev: boolean;
  exploited_in_wild: ExploitedInWild;
  severity_label: string;
  affected_version_ranges: string[];
  fixed_versions: string[];
  source_url: string;
}

export interface PackageVerdict {
  package: string;
  version: string | null;
  verdict: StackVerdict;
  in_cohort: boolean;
  exploited: boolean;
  fix_available: boolean;
  category: AiCategory | null;
  matched_cves: MatchedCve[];
  reason: string;
}

export interface StackSafetyResult {
  ok: true;
  gate: StackVerdict;
  // capturedAt drives premiumResponse's freshness no-charge (it reads
  // capturedAt, NOT extracted_at). extracted_at is the descriptive alias.
  capturedAt: string | null;
  extracted_at: string | null;
  counts: { block: number; hold: number; pass: number; unknown: number };
  packages: PackageVerdict[];
  claim: string;
  notes: string[];
  source_license: string;
  source_attribution: string;
}

type FlaggedPaper = AiCvesPaper & { tf_ai_category: AiCategory };

const GATE_SEVERITY: Record<StackVerdict, number> = { BLOCK: 3, HOLD: 2, UNKNOWN: 1, PASS: 0 };

const CLAIM =
  'Stack Safety Verdict matches each package name against TensorFeed\'s ingested AI-stack CVE batch (GHSA plus vendor advisories) and joins the CISA KEV catalog for exploitation status. It does NOT parse your pinned version against affected ranges in v1, so verdicts are conservative: BLOCK only when an exploited CVE has no fix; HOLD whenever a known CVE applies and you must verify your version against the surfaced ranges and fixes; PASS when no AI-stack CVE matches the package name (this is the AI-stack batch, not a full vulnerability scan); UNKNOWN when the package is outside the curated AI-stack cohort. AFTA-signed over the inputs.';

/**
 * Normalize a package identifier to a comparable token: lowercased, scope
 * prefix dropped (@langchain/core becomes langchain/core), and the common
 * separators (hyphen, underscore, dot, whitespace) folded to a single dash
 * so torch_vision, torch-vision and "torch vision" compare equal while
 * staying distinct from torch. Empty / falsy inputs return ''.
 */
function normalizePackageToken(raw: string): string {
  let s = raw.toLowerCase().trim();
  if (s.startsWith('@')) s = s.slice(1);
  s = s.replace(/[\s_.]+/g, '-').replace(/-+/g, '-').replace(/^-|-$/g, '');
  return s;
}

/**
 * Split a free-form advisory affected_product string into candidate
 * package tokens. Advisory strings are heterogeneous (GHSA names, vendor
 * product blurbs), so we both keep the whole string as one normalized
 * token (covers "xz-utils", "llama-index") and split on whitespace and
 * common package-name delimiters to recover the package token out of a
 * longer phrase (covers "PyTorch Lightning", "vLLM server"). Slashes are
 * preserved inside a token so scoped names like langchain/core survive.
 */
function affectedProductTokens(product: string): Set<string> {
  const tokens = new Set<string>();
  const whole = normalizePackageToken(product);
  if (whole) tokens.add(whole);
  for (const piece of product.split(/[\s,;/()\[\]]+/)) {
    const t = normalizePackageToken(piece);
    if (t) tokens.add(t);
  }
  return tokens;
}

/**
 * A paper affects a package only on a normalized EXACT-token match: the
 * package name (normalized) must equal the whole normalized affected_product
 * OR one of its split package tokens. This replaces the old naive substring
 * test so "torch" no longer matches "pytorch-lightning" and a 2-char name
 * like "ai" no longer matches arbitrary advisories, while true same-name
 * matches (case and hyphen/underscore insensitive) still fire.
 */
function paperAffects(paper: AiCvesPaper, normalizedName: string): boolean {
  if (!normalizedName) return false;
  for (const prod of paper.affected_products) {
    if (affectedProductTokens(prod).has(normalizedName)) return true;
  }
  return false;
}

/**
 * Ecosystem gate on top of the name match. Excludes a paper ONLY when both
 * sides state an ecosystem and they disagree (pip 'onnx' must not match an
 * npm-only 'onnx' advisory). Missing data on either side falls back to
 * name-only matching, the exact pre-field behavior, so batches ingested
 * before DP CC's ecosystem sidecar keep matching unchanged.
 */
function ecosystemsCompatible(paperEcosystems: string[] | undefined, pkgEcosystem: string | undefined): boolean {
  if (!pkgEcosystem || !paperEcosystems || paperEcosystems.length === 0) return true;
  return paperEcosystems.includes(pkgEcosystem);
}

/**
 * Pure verdict builder. `papers` is the AI-flagged batch subset (or null
 * when no batch is available). `kevCveIds` is the uppercased set of CVE
 * ids currently on the CISA KEV catalog.
 */
export function buildStackSafetyVerdict(
  papers: FlaggedPaper[] | null,
  packages: PackageInput[],
  kevCveIds: ReadonlySet<string>,
  extractedAt: string | null,
): StackSafetyResult {
  const notes: string[] = [];
  const hasBatch = papers !== null;
  if (!hasBatch) {
    notes.push('The AI-CVE batch is currently unavailable, so every package is reported UNKNOWN. Retry later.');
  }

  const out: PackageVerdict[] = packages.map((pkg) => {
    const normalizedName = normalizePackageToken(pkg.name);
    const category = classifyProduct(pkg.name);
    const inCohort = category !== null;

    if (!hasBatch) {
      return {
        package: pkg.name,
        version: pkg.version,
        verdict: 'UNKNOWN',
        in_cohort: inCohort,
        exploited: false,
        fix_available: false,
        category,
        matched_cves: [],
        reason: 'AI-CVE batch unavailable; cannot assess.',
      };
    }

    const matched = papers!.filter(
      (p) => paperAffects(p, normalizedName) && ecosystemsCompatible(p.ecosystems, pkg.ecosystem),
    );
    const matched_cves: MatchedCve[] = [];
    let exploited = false;
    let fixAvailable = false;
    for (const p of matched) {
      if (p.fixed_versions.length > 0) fixAvailable = true;
      const paperExploited = p.exploited_in_wild === 'stated_yes';
      for (const cve of p.cve_ids) {
        const onKev = kevCveIds.has(cve.toUpperCase());
        if (onKev || paperExploited) exploited = true;
        matched_cves.push({
          cve_id: cve,
          on_kev: onKev,
          exploited_in_wild: p.exploited_in_wild,
          severity_label: p.severity_label,
          affected_version_ranges: p.affected_version_ranges,
          fixed_versions: p.fixed_versions,
          source_url: p.source_url,
        });
      }
    }

    let verdict: StackVerdict;
    let reason: string;
    if (matched.length === 0) {
      if (inCohort) {
        verdict = 'PASS';
        reason = 'No AI-stack CVE matched this package name. Not a full vulnerability scan.';
      } else {
        verdict = 'UNKNOWN';
        reason = 'Package is outside TensorFeed\'s curated AI-stack cohort; not assessed.';
      }
    } else if (exploited && !fixAvailable) {
      verdict = 'BLOCK';
      reason = 'An exploited CVE affects this package and no fixed version is listed.';
    } else if (exploited) {
      verdict = 'HOLD';
      reason = 'An exploited CVE affects this package, but a fix exists. Verify your pinned version against the fixed_versions and affected_version_ranges before shipping.';
    } else {
      verdict = 'HOLD';
      reason = 'A known CVE applies to this package (not confirmed exploited). Verify your pinned version against the surfaced ranges and fixes.';
    }

    return {
      package: pkg.name,
      version: pkg.version,
      verdict,
      in_cohort: inCohort,
      exploited,
      fix_available: fixAvailable,
      category,
      matched_cves,
      reason,
    };
  });

  const counts = { block: 0, hold: 0, pass: 0, unknown: 0 };
  let gate: StackVerdict = 'PASS';
  for (const p of out) {
    if (p.verdict === 'BLOCK') counts.block++;
    else if (p.verdict === 'HOLD') counts.hold++;
    else if (p.verdict === 'PASS') counts.pass++;
    else counts.unknown++;
    if (GATE_SEVERITY[p.verdict] > GATE_SEVERITY[gate]) gate = p.verdict;
  }

  notes.push('Coverage is the AI-stack CVE batch (GHSA plus vendor advisories) joined to CISA KEV. EPSS and precise version-range intersection land in v2.');

  return {
    ok: true,
    gate,
    capturedAt: extractedAt,
    extracted_at: extractedAt,
    counts,
    packages: out,
    claim: CLAIM,
    notes,
    ...publicAttribution(),
  };
}

/** Loader: read the AI-flagged batch + KEV catalog, build the verdict. */
export async function computeStackSafetyVerdict(env: Env, packages: PackageInput[]): Promise<StackSafetyResult> {
  const [flagged, kev] = await Promise.all([getAiFlagged(env), readKEVCurrent(env)]);
  const kevCveIds = new Set<string>();
  if (kev) {
    for (const v of kev.vulnerabilities) {
      if (v.cveID) kevCveIds.add(v.cveID.toUpperCase());
    }
  }
  return buildStackSafetyVerdict(
    flagged ? flagged.papers : null,
    packages,
    kevCveIds,
    flagged ? flagged.extracted_at : null,
  );
}

/**
 * IP-based daily rate limit for the free /api/preview/stack-safety-verdict
 * preview. Distinct KV key from the route-verdict preview limiter.
 */
export async function checkStackSafetyPreviewRateLimit(
  env: Env,
  ip: string,
  max = 10,
): Promise<{ allowed: boolean; remaining: number; limit: number }> {
  const date = new Date().toISOString().slice(0, 10);
  const key = `rate:stack-safety-preview:${date}:${ip}`;
  const current = (await env.TENSORFEED_CACHE.get(key, 'json')) as { count: number } | null;
  const count = current?.count ?? 0;
  if (count >= max) return { allowed: false, remaining: 0, limit: max };
  await safePut(env, env.TENSORFEED_CACHE, key, JSON.stringify({ count: count + 1 }), { expirationTtl: 60 * 60 * 48 });
  return { allowed: true, remaining: max - count - 1, limit: max };
}
