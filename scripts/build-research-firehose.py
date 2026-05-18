"""
Build the ai-research FREE firehose static feed from a DataPal batch.

Reads the YAML chunks of an Evan-authorized ai-research firehose batch and
emits a single static JSON feed at public/api/research/firehose.json.

This feed ships ONLY under the non-negotiable labeling contract (see the
batch LABELING.md and the TF CC Lead RUN-AUTHORIZATION 2026-05-17). The
contract is embedded verbatim in the feed's _meta block so any agent that
reads the feed reads the caveat with it. ai-research single-source
classification hit a proven model ceiling and quality iteration is CLOSED;
this is a raw, fast, unverified feed that claims nothing it cannot prove.
There is no quality gate by design. subfield_tag and the milestone fields
are heuristic, NOT authoritative, and are never queryable as truth.

Usage:
    python scripts/build-research-firehose.py <chunks_dir>
    python scripts/build-research-firehose.py <chunks_dir> --out public/api/research/firehose.json

Re-run with a new batch's chunks dir to regenerate. Raw chunks are NOT
committed; only this generated feed and this generator are.
"""

import argparse
import datetime
import json
import sys
from pathlib import Path

try:
    import yaml
except ImportError:
    sys.exit("Missing dependency. Install with: pip install pyyaml")

REPO = Path(__file__).resolve().parent.parent

VERBATIM_CAVEAT = (
    "Heuristic tags from a fast local model. subfield_tag and "
    "is_milestone_candidate are best-effort and NOT authoritative. "
    "Not verified TensorFeed data."
)

TRUSTED_FIELDS = [
    "arxiv_id", "date", "title", "authors", "arxiv_categories",
    "keywords", "summary_one_sentence",
]
UNTRUSTED_FIELDS = [
    "subfield_tag", "methodology_bucket", "is_milestone_candidate",
    "milestone_reasoning", "milestone_evidence", "confidence",
    "affiliations_normalized", "affiliation_types",
]


def load_papers(chunks_dir: Path) -> list:
    papers: list = []
    files = sorted(chunks_dir.glob("chunk_*.yaml"))
    if not files:
        sys.exit(f"no chunk_*.yaml found in {chunks_dir}")
    for f in files:
        try:
            d = yaml.safe_load(f.read_text(encoding="utf-8")) or {}
        except Exception as e:  # noqa: BLE001 - report and skip a bad chunk
            print(f"  WARNING: unparseable {f.name}: {e}", file=sys.stderr)
            continue
        papers.extend(d.get("papers") or [])
    return papers


def main() -> None:
    p = argparse.ArgumentParser()
    p.add_argument("chunks_dir", help="dir of chunk_*.yaml from the firehose batch")
    p.add_argument("--out", default=str(REPO / "public" / "api" / "research" / "firehose.json"))
    args = p.parse_args()

    chunks_dir = Path(args.chunks_dir)
    if not chunks_dir.is_dir():
        sys.exit(f"not a directory: {chunks_dir}")

    papers = load_papers(chunks_dir)
    out_path = Path(args.out)
    out_path.parent.mkdir(parents=True, exist_ok=True)

    feed = {
        "_meta": {
            "feed": "ai-research-firehose",
            "tier": "free",
            "premium": False,
            "caveat": VERBATIM_CAVEAT,
            "framing": "recent arXiv AI/ML, raw, fast, unverified",
            "queryable": False,
            "contract": {
                "free_only_no_premium_ever": True,
                "subfield_milestone_never_authoritative_or_queryable": True,
                "honest_or_absent": True,
                "trusted_fields_verbatim_extraction": TRUSTED_FIELDS,
                "untrusted_fields_heuristic_not_authoritative": UNTRUSTED_FIELDS,
            },
            "why": (
                "ai-research single-source classification hit a proven model "
                "ceiling; quality iteration is closed. The verbatim "
                "bibliographic extraction is sound. This ships as a raw, "
                "clearly-unverified, free feed only."
            ),
            "generated": datetime.date.today().isoformat(),
            "record_count": len(papers),
            "source": "arXiv AI/ML (cs.AI, cs.LG, cs.CL, cs.CV, cs.RO, cs.NE, cs.IR, stat.ML)",
        },
        "papers": papers,
    }

    out_path.write_text(
        json.dumps(feed, ensure_ascii=False, indent=2, default=str) + "\n",
        encoding="utf-8",
    )
    size_kb = out_path.stat().st_size / 1024
    print(f"wrote {out_path} ({len(papers)} records, {size_kb:.0f} KB)")


if __name__ == "__main__":
    main()
