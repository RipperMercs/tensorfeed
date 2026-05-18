/**
 * Premium security cross-source corroboration.
 *
 * Serves GET /api/premium/security/corroborated?package=<name>.
 *
 * The defensible angle: one affected package's entire corroborated
 * advisory set in a single paid call. For each GHSA advisory naming the
 * package, the agent gets the deterministic product-vs-OSV corroboration
 * verdict (never-false-confirm), plus KEV/EPSS/SSVC/OSV enrichment joined
 * ONLY by a verbatim-verified CVE id, plus the verbatim version/severity
 * context, each in an explicit provenance bucket. The agent does not have
 * to stitch GHSA + OSV + NVD + KEV + EPSS itself, and does not have to
 * re-check what we already deterministically corroborated.
 *
 * Honesty boundary (carried in meta.claim, surfaced verbatim): we
 * corroborate the advisory's affected package against authoritative OSV
 * and we enrich by verbatim-verified CVE id. We do NOT verify the
 * advisory's exploitation or severity claims; GHSA prose does not make
 * them and the model never judges. Quarantined (extraction_suspect)
 * records are never in the dataset.
 *
 * Data: bundled security-xsource dataset (see data-security-xsource.ts).
 * Zero KV, zero upstream calls at request time. The extraction, the
 * deterministic corroboration, and the verbatim-CVE guard are all done
 * offline on the air-gapped rig.
 *
 * Param-required: the handler does nothing without ?package=, so this
 * path MUST be strict-premium (see strict-premium-endpoints.ts) or an
 * anonymous catalog crawler is granted a free-trial slot and then gets a
 * 400 it reads as a broken paid route, instead of the canonical 402.
 *
 * Cost: 1 credit ($0.02), matching the existing /api/premium/security/*
 * convention. Repricing is intentionally a separate future decision.
 */

import {
  getSecurityXsource,
  SecurityXsourcePayload,
  SxAdvisoryCard,
} from './data-security-xsource';

export interface SecurityXsourceResult {
  ok: true;
  package_query: string;
  matched_package: string;
  claim: string;
  provenance_legend: Record<string, string>;
  dataset_meta: SecurityXsourcePayload['meta'];
  advisory_count: number;
  advisories: SxAdvisoryCard[];
}

export interface SecurityXsourceError {
  ok: false;
  error: string;
  hint?: string;
  available_package_sample?: string[];
}

/**
 * Normalize a package string for tolerant matching: lowercase, drop
 * everything that is not a letter or digit. So "Apache Commons Text",
 * "apache-commons-text", "org.apache.commons:commons-text" collapse so
 * a loose caller token can prefix/substring match a canonical key. This
 * is display-side convenience only; it is NOT the corroboration matcher
 * (that is the offline OSV-only never-false-confirm matcher; this never
 * changes a verdict, it only resolves which package the caller meant).
 */
function normKey(s: string): string {
  return s.toLowerCase().replace(/[^a-z0-9]/g, '');
}

/**
 * Resolve a loose ?package= value to a canonical package key in the
 * dataset. Exact normalized match wins; otherwise the caller token is
 * tried as a prefix of, then a substring of, a canonical key. On
 * multiple hits the shortest canonical key wins, ties broken
 * alphabetically, so the result is deterministic across calls.
 */
export function resolvePackage(query: string, keys: string[]): string | null {
  const q = normKey(query);
  if (!q) return null;

  const normed = keys.map((k) => ({ k, n: normKey(k) }));

  const exact = normed.find((e) => e.n === q);
  if (exact) return exact.k;

  const prefix = normed
    .filter((e) => e.n.startsWith(q))
    .sort((a, b) => a.n.length - b.n.length || a.k.localeCompare(b.k));
  if (prefix.length > 0) return prefix[0].k;

  const sub = normed
    .filter((e) => e.n.includes(q))
    .sort((a, b) => a.n.length - b.n.length || a.k.localeCompare(b.k));
  if (sub.length > 0) return sub[0].k;

  return null;
}

export function computeSecurityXsource(
  packageQuery: string | null,
): SecurityXsourceResult | SecurityXsourceError {
  if (!packageQuery || !packageQuery.trim()) {
    return {
      ok: false,
      error: 'missing_package',
      hint:
        'Pass ?package=<name>. Loose matching is supported (e.g. package=commons-text resolves to "Apache Commons Text"). Returns every corroborated GHSA advisory naming that package in one call.',
    };
  }

  const data = getSecurityXsource();
  const keys = Object.keys(data.packages);
  const matched = resolvePackage(packageQuery, keys);

  if (!matched) {
    const sample = keys
      .map((k) => ({ k, c: data.packages[k].advisories.length }))
      .sort((a, b) => b.c - a.c || a.k.localeCompare(b.k))
      .slice(0, 12)
      .map((e) => data.packages[e.k].package_display);
    return {
      ok: false,
      error: 'package_not_found',
      hint: `No package in the security-xsource dataset matched "${packageQuery}". This is a corroborated GHSA slice (${data.meta.advisories_total} advisories across ${data.meta.packages_total} packages), not the full advisory database.`,
      available_package_sample: sample,
    };
  }

  const pkg = data.packages[matched];
  return {
    ok: true,
    package_query: packageQuery,
    matched_package: pkg.package_display,
    claim: data.meta.claim,
    provenance_legend: data.meta.provenance_legend,
    dataset_meta: data.meta,
    advisory_count: pkg.advisories.length,
    advisories: pkg.advisories,
  };
}
