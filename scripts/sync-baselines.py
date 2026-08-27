"""
Regenerate BASELINE_PRICING and BASELINE_BENCHMARKS in worker/src/catalog.ts
from the canonical data/pricing.json and data/benchmarks.json.

Those two constants are the worker mirror that seeds the models KV. They are
guarded by worker/src/catalog-pricing-sync.test.ts (membership + order +
lastUpdated) and worker/src/catalog-benchmarks-sync.test.ts (deep equality),
so editing either JSON file without re-running this script fails the suite.

Design notes:
  * Fields are emitted generically in JSON key order, so optional keys such as
    openSource and license pass through instead of being silently dropped.
  * Numbers are parsed as Decimal so "5.00" survives as 5.00 rather than
    collapsing to 5, which keeps the diff limited to real edits.

Usage:
    python scripts/sync-baselines.py            # rewrite catalog.ts
    python scripts/sync-baselines.py --check    # report drift, write nothing
"""

import io
import json
import os
import sys
from decimal import Decimal

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
CATALOG = os.path.join(ROOT, "worker", "src", "catalog.ts")


def load(path):
    with open(path, encoding="utf-8") as f:
        return json.load(f, parse_float=Decimal)


def val(v):
    """Emit any JSON scalar / list as a TS literal."""
    if isinstance(v, bool):
        return "true" if v else "false"
    if v is None:
        return "null"
    if isinstance(v, (int, Decimal)):
        return str(v)
    if isinstance(v, str):
        if "'" not in v and "\\" not in v:
            return "'" + v + "'"
        return json.dumps(v)
    if isinstance(v, list):
        return "[" + ", ".join(val(i) for i in v) + "]"
    if isinstance(v, dict):
        return "{ " + ", ".join(k + ": " + val(x) for k, x in v.items()) + " }"
    raise TypeError("unsupported value: " + repr(v))


def obj_inline(d):
    """Render a dict as a single-line TS object literal, all keys preserved."""
    return "{ " + ", ".join(k + ": " + val(v) for k, v in d.items()) + " }"


def gen_benchmarks(data):
    out = io.StringIO()
    out.write("export const BASELINE_BENCHMARKS: BenchmarksData = {\n")
    out.write("  lastUpdated: " + val(data["lastUpdated"]) + ",\n")
    out.write("  benchmarks: [\n")
    for b in data["benchmarks"]:
        out.write("    " + obj_inline(b) + ",\n")
    out.write("  ],\n")
    out.write("  models: [\n")
    for m in data["models"]:
        out.write("    " + obj_inline(m) + ",\n")
    out.write("  ],\n")
    out.write("};")
    return out.getvalue()


def gen_pricing(data):
    out = io.StringIO()
    out.write("export const BASELINE_PRICING: PricingData = {\n")
    out.write("  lastUpdated: " + val(data["lastUpdated"]) + ",\n")
    out.write("  providers: [\n")
    for p in data["providers"]:
        head = {k: v for k, v in p.items() if k != "models"}
        out.write("    {\n")
        out.write("      " + ", ".join(k + ": " + val(v) for k, v in head.items()) + ",\n")
        out.write("      models: [\n")
        for m in p["models"]:
            out.write("        " + obj_inline(m) + ",\n")
        out.write("      ],\n")
        out.write("    },\n")
    out.write("  ],\n")
    out.write("};")
    return out.getvalue()


def replace_block(src, start_marker, new_block):
    """Replace from start_marker through the terminating '};' line."""
    i = src.index(start_marker)
    j = src.index("\n};", i) + len("\n};")
    return src[:i] + new_block + src[j:]


def main():
    check = "--check" in sys.argv
    pricing = load(os.path.join(ROOT, "data", "pricing.json"))
    benchmarks = load(os.path.join(ROOT, "data", "benchmarks.json"))

    with open(CATALOG, encoding="utf-8", newline="") as f:
        src = f.read()

    crlf = "\r\n" in src
    flat = src.replace("\r\n", "\n")

    updated = replace_block(
        flat, "export const BASELINE_PRICING: PricingData = {", gen_pricing(pricing)
    )
    updated = replace_block(
        updated,
        "export const BASELINE_BENCHMARKS: BenchmarksData = {",
        gen_benchmarks(benchmarks),
    )
    if crlf:
        updated = updated.replace("\n", "\r\n")

    if check:
        print("IDENTICAL" if updated == src else "WOULD_CHANGE")
        return

    if updated != src:
        with open(CATALOG, "w", encoding="utf-8", newline="") as f:
            f.write(updated)
        print("catalog.ts baselines regenerated")
    else:
        print("catalog.ts already in sync")


if __name__ == "__main__":
    main()
