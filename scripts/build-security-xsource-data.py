"""
Build the bundled security-xsource premium dataset module.

Reads a corroborate.py output (corroboration.jsonl + corroborate_summary.json
from a delivered backfill bundle on the bridge), drops the excluded /
extraction_suspect records (they are quarantined, never served), groups the
trusted set by normalized affected-product, attaches explicit per-field
provenance buckets, and emits worker/src/data-security-xsource.ts as a
base64 parse-once module (mirrors data-cve-kev-2026.ts).

Provenance buckets, per the TF CC Lead ruling (2026-05-17):
- corroborated_claim    : the advisory's verbatim affected_products + the
                          deterministic product-vs-OSV verdict + overall.
- deterministic_enrichment : KEV / EPSS / SSVC + OSV packages, joined ONLY
                          by a verbatim-verified CVE id. NOT a claim the
                          advisory made.
- verbatim_context      : version ranges / fixed / severity / exploited,
                          copied verbatim from the advisory. NOT
                          corroborated, NOT a guarantee.

Honest claim, carried in meta verbatim: "affected package corroborated
against authoritative OSV plus deterministic KEV/EPSS/CVSS/SSVC enrichment
by verbatim-verified CVE id." We do NOT verify the advisory's exploitation
or severity claims; GHSA prose does not make them.

Usage:
    python scripts/build-security-xsource-data.py <bundle_dir>
    python scripts/build-security-xsource-data.py --empty   # valid empty module

<bundle_dir> must contain corroboration.jsonl (+ optionally
corroborate_summary.json). Raw bundles stay on the bridge / local work
dirs and are NEVER committed; only the generated .ts is.
Regenerate on every new backfill. Do NOT hand-edit the generated file.
"""

import argparse
import base64
import datetime
import json
import re
import sys
from pathlib import Path

REPO = Path(__file__).resolve().parent.parent
OUT = REPO / "worker" / "src" / "data-security-xsource.ts"

HONEST_CLAIM = (
    "Affected package corroborated against authoritative OSV, plus "
    "deterministic KEV/EPSS/CVSS/SSVC enrichment joined by a "
    "verbatim-verified CVE id. We do NOT verify the advisory's "
    "exploitation or severity claims; GHSA prose does not make them."
)


def norm_key(s: str) -> str:
    return re.sub(r"[^a-z0-9]", "", (s or "").lower())


def card(rec: dict) -> dict:
    ex = rec.get("extracted") or {}
    pc = rec.get("per_claim") or {}
    au = rec.get("authoritative") or {}
    return {
        "source_url": rec.get("source_url"),
        "overall": rec.get("overall"),
        "corroborated_claim": {
            "affected_products": ex.get("affected_products") or [],
            "product_corroboration": pc.get("affected_products"),
        },
        "deterministic_enrichment": {
            "cves_verbatim_verified": au.get("cves_checked") or [],
            "kev_listed": au.get("kev_present"),
            "epss_percentile": au.get("epss_percentile"),
            "ssvc": au.get("ssvc"),
            "osv_packages": au.get("osv_products") or [],
        },
        "verbatim_context": {
            "affected_version_ranges": ex.get("affected_version_ranges") or [],
            "fixed_versions": ex.get("fixed_versions") or [],
            "severity_label": ex.get("severity_label"),
            "exploited_in_wild": ex.get("exploited_in_wild"),
        },
    }


def build_payload(bundle_dir: Path | None) -> dict:
    records: list = []
    summary: dict = {}
    if bundle_dir is not None:
        jl = bundle_dir / "corroboration.jsonl"
        if not jl.exists():
            sys.exit(f"no corroboration.jsonl in {bundle_dir}")
        for line in jl.read_text(encoding="utf-8").splitlines():
            line = line.strip()
            if line:
                records.append(json.loads(line))
        sf = bundle_dir / "corroborate_summary.json"
        if sf.exists():
            summary = json.loads(sf.read_text(encoding="utf-8"))

    trusted = [
        r for r in records
        if r.get("overall") != "excluded" and not r.get("extraction_suspect")
    ]

    packages: dict = {}
    for r in trusted:
        c = card(r)
        prods = (r.get("extracted") or {}).get("affected_products") or []
        for p in prods:
            k = norm_key(p)
            if not k:
                continue
            if k not in packages:
                packages[k] = {"package_display": p, "advisories": []}
            packages[k]["advisories"].append(c)

    # Honest accounting: this endpoint is only reachable by ?package=, so
    # the served set is the trusted records that name >= 1 product (the
    # ones actually grouped into `packages`). Records that named no
    # product (all 'unverifiable') are NOT package-addressable; counting
    # them in advisories_total would overstate what a caller can retrieve.
    addressable = [
        r for r in trusted
        if (r.get("extracted") or {}).get("affected_products")
    ]
    by_overall: dict = {}
    for r in addressable:
        by_overall[r.get("overall")] = by_overall.get(r.get("overall"), 0) + 1

    return {
        "meta": {
            "dataset": "security-xsource",
            "tier": "premium",
            "claim": HONEST_CLAIM,
            "provenance_legend": {
                "corroborated_claim": "advisory's verbatim affected_products + deterministic product-vs-OSV verdict (never-false-confirm)",
                "deterministic_enrichment": "KEV/EPSS/SSVC/OSV joined ONLY by a verbatim-verified CVE id; not an advisory claim",
                "verbatim_context": "version/severity/exploited copied verbatim from the advisory; not corroborated, not a guarantee",
            },
            "generated_at": datetime.datetime.now(datetime.timezone.utc).strftime("%Y-%m-%dT%H:%M:%SZ"),
            "advisories_total": len(addressable),
            "packages_total": len(packages),
            "by_overall": by_overall,
            "trusted_corpus_total": len(trusted),
            "not_package_addressable": len(trusted) - len(addressable),
            "note": (
                "advisories_total / by_overall describe the package-addressable "
                "served set (advisories naming >= 1 product). "
                f"{len(trusted) - len(addressable)} additional trusted advisories "
                "named no product and are unverifiable, so they are not retrievable "
                "by ?package= and are intentionally excluded from these counts. "
                "Quarantined (extraction_suspect / excluded) records are never bundled."
            ),
            "excluded_quarantined": sum(
                1 for r in records
                if r.get("overall") == "excluded" or r.get("extraction_suspect")
            ),
            "source_summary": summary,
            "attribution": {
                "advisory_source": "GitHub Security Advisories (GHSA)",
                "corroboration_sources": "OSV.dev, CISA KEV, FIRST EPSS, NVD, CISA Vulnrichment (public)",
                "redistribution": "derived metadata + corroboration verdicts; advisory prose not republished",
            },
        },
        "packages": packages,
    }


TEMPLATE = '''/**
 * Bundled security-xsource premium dataset (zero-KV, parse-once).
 *
 * GENERATED by scripts/build-security-xsource-data.py from a delivered
 * backfill bundle's corroboration.jsonl. Do NOT hand-edit the payload.
 * Excluded / extraction_suspect records are quarantined upstream and are
 * never bundled here.
 *
 * Each advisory carries three explicit provenance buckets
 * (corroborated_claim / deterministic_enrichment / verbatim_context) per
 * the TF CC Lead ruling 2026-05-17. The honest claim is in meta.claim and
 * MUST be surfaced verbatim wherever this data is presented; never frame
 * it as "we verify the advisory's exploitation or severity claims".
 *
 * Storage: parse-once base64 JSON constant per the research storage
 * strategy. Zero KV operations. Refreshed on redeploy when a new backfill
 * is bundled. Regenerate, do not edit.
 */

const PAYLOAD_B64 =
  '%PAYLOAD%';

export interface SxAdvisoryCard {
  source_url: string;
  overall: 'corroborated' | 'novel' | 'unverifiable';
  corroborated_claim: {
    affected_products: string[];
    product_corroboration: string | null;
  };
  deterministic_enrichment: {
    cves_verbatim_verified: string[];
    kev_listed: boolean | null;
    epss_percentile: number | null;
    ssvc: string | null;
    osv_packages: string[];
  };
  verbatim_context: {
    affected_version_ranges: string[];
    fixed_versions: string[];
    severity_label: string | null;
    exploited_in_wild: string | null;
  };
}

export interface SxPackage {
  package_display: string;
  advisories: SxAdvisoryCard[];
}

export interface SecurityXsourcePayload {
  meta: {
    dataset: string;
    tier: string;
    claim: string;
    provenance_legend: Record<string, string>;
    generated_at: string;
    advisories_total: number;
    packages_total: number;
    by_overall: Record<string, number>;
    trusted_corpus_total: number;
    not_package_addressable: number;
    note: string;
    excluded_quarantined: number;
    source_summary: Record<string, unknown>;
    attribution: Record<string, string>;
  };
  packages: Record<string, SxPackage>;
}

let _cache: SecurityXsourcePayload | null = null;

/** Parse-once accessor. Decodes the bundled payload on first call. */
export function getSecurityXsource(): SecurityXsourcePayload {
  if (_cache) return _cache;
  const json =
    typeof atob === 'function'
      ? atob(PAYLOAD_B64)
      : Buffer.from(PAYLOAD_B64, 'base64').toString('utf-8');
  _cache = JSON.parse(json) as SecurityXsourcePayload;
  return _cache;
}
'''


def main() -> None:
    ap = argparse.ArgumentParser()
    ap.add_argument("bundle_dir", nargs="?", help="dir with corroboration.jsonl")
    ap.add_argument("--empty", action="store_true", help="emit a valid empty module")
    args = ap.parse_args()

    if not args.empty and not args.bundle_dir:
        ap.error("pass <bundle_dir> or --empty")

    payload = build_payload(None if args.empty else Path(args.bundle_dir))
    b64 = base64.b64encode(
        json.dumps(payload, ensure_ascii=False, separators=(",", ":")).encode("utf-8")
    ).decode("ascii")
    OUT.write_text(TEMPLATE.replace("%PAYLOAD%", b64), encoding="utf-8")
    m = payload["meta"]
    print(
        f"wrote {OUT}  advisories={m['advisories_total']} "
        f"packages={m['packages_total']} quarantined={m['excluded_quarantined']} "
        f"({len(b64)} b64 chars)"
    )


if __name__ == "__main__":
    main()
