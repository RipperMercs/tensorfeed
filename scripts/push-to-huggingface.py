"""
Daily push of TensorFeed AI ecosystem snapshots to Hugging Face Hub.

Pulls live data from the public TensorFeed API and uploads dated JSONL
files to a Hugging Face dataset repo. Each file is one record per line.
Schema is documented in the dataset README.

Required env:
  HF_TOKEN          Hugging Face write token (https://hf.co/settings/tokens)
  HF_DATASET_REPO   e.g. tensorfeed/ai-ecosystem-daily

Optional env:
  TENSORFEED_BASE   default https://tensorfeed.ai
"""

from __future__ import annotations

import json
import os
import sys
import tempfile
from datetime import datetime, timezone
from pathlib import Path
from typing import Any

import requests
from huggingface_hub import HfApi, upload_folder


BASE = os.environ.get("TENSORFEED_BASE", "https://tensorfeed.ai").rstrip("/")
TOKEN = os.environ.get("HF_TOKEN")
REPO = os.environ.get("HF_DATASET_REPO", "tensorfeed/ai-ecosystem-daily")

if not TOKEN:
    print("ERROR: HF_TOKEN not set", file=sys.stderr)
    sys.exit(1)


# Each tuple: (filename stem, endpoint path, optional unwrap key)
# unwrap_key tells us which top-level field on the response holds the
# array we want to flatten into JSONL. None means write the whole body
# as a single JSON record.
FEEDS: list[tuple[str, str, str | None]] = [
    ("news", "/api/news?limit=200", "articles"),
    ("models", "/api/models", None),
    ("pricing", "/api/agents/pricing", None),
    ("status", "/api/status", "services"),
    ("benchmarks", "/api/benchmarks", None),
    ("agents-directory", "/api/agents/directory", "agents"),
    ("agents-activity", "/api/agents/activity", "recent"),
    ("podcasts", "/api/podcasts", None),
    ("trending-repos", "/api/trending-repos", None),
    ("mcp-registry", "/api/mcp/registry/snapshot", None),
    ("probe", "/api/probe/latest", None),
    ("gpu-pricing", "/api/gpu/pricing", None),
    ("afta-adopters", "/api/afta/adopters", None),
]


def fetch(path: str) -> dict[str, Any]:
    url = f"{BASE}{path}"
    r = requests.get(url, headers={"User-Agent": "TensorFeed-HF-Snapshotter/1.0"}, timeout=30)
    r.raise_for_status()
    return r.json()


def to_jsonl(payload: dict[str, Any], unwrap: str | None) -> str:
    """Convert an API payload into JSONL. Each line is a JSON object."""
    if unwrap and isinstance(payload.get(unwrap), list):
        records = payload[unwrap]
    else:
        records = [payload]
    return "\n".join(json.dumps(r, separators=(",", ":"), ensure_ascii=False) for r in records) + "\n"


def main() -> int:
    today = datetime.now(timezone.utc).strftime("%Y-%m-%d")
    captured_at = datetime.now(timezone.utc).isoformat()

    with tempfile.TemporaryDirectory() as tmpdir:
        out_dir = Path(tmpdir) / today
        out_dir.mkdir()

        manifest: dict[str, Any] = {
            "date": today,
            "captured_at": captured_at,
            "source": BASE,
            "feeds": {},
        }

        for stem, path, unwrap in FEEDS:
            try:
                payload = fetch(path)
            except Exception as exc:
                print(f"  skip {stem}: {exc}", file=sys.stderr)
                manifest["feeds"][stem] = {"status": "error", "error": str(exc)}
                continue

            jsonl = to_jsonl(payload, unwrap)
            file_path = out_dir / f"{stem}.jsonl"
            file_path.write_text(jsonl, encoding="utf-8")
            manifest["feeds"][stem] = {
                "status": "ok",
                "endpoint": path,
                "records": jsonl.count("\n"),
                "bytes": len(jsonl.encode("utf-8")),
            }
            print(f"  wrote {stem}.jsonl ({manifest['feeds'][stem]['records']} records)")

        (out_dir / "manifest.json").write_text(
            json.dumps(manifest, indent=2, ensure_ascii=False),
            encoding="utf-8",
        )

        api = HfApi(token=TOKEN)
        api.create_repo(repo_id=REPO, repo_type="dataset", exist_ok=True, private=False)

        commit_msg = f"Daily snapshot {today}"
        upload_folder(
            folder_path=str(out_dir),
            path_in_repo=today,
            repo_id=REPO,
            repo_type="dataset",
            commit_message=commit_msg,
            token=TOKEN,
        )
        print(f"Pushed {today} snapshot to https://huggingface.co/datasets/{REPO}")

    return 0


if __name__ == "__main__":
    sys.exit(main())
