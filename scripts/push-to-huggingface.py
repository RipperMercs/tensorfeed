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
from huggingface_hub import HfApi, upload_file, upload_folder


BASE = os.environ.get("TENSORFEED_BASE", "https://tensorfeed.ai").rstrip("/")
TOKEN = os.environ.get("HF_TOKEN")
REPO = os.environ.get("HF_DATASET_REPO", "tensorfeed/ai-ecosystem-daily")
README_SOURCE = Path(__file__).parent.parent / "data" / "huggingface-dataset-readme.md"

if not TOKEN:
    print("ERROR: HF_TOKEN not set", file=sys.stderr)
    sys.exit(1)


# Each tuple: (filename stem, endpoint path, optional unwrap key)
# unwrap_key tells us which top-level field on the response holds the
# array we want to flatten into JSONL. None means write the whole body
# as a single JSON record. The `models` feed has a nested provider[].models[]
# shape and is flattened with a custom path inside `to_jsonl`.
FEEDS: list[tuple[str, str, str | None]] = [
    # Tier 1: high-velocity feeds (news, pricing, status)
    ("news", "/api/news?limit=200", "articles"),
    ("models", "/api/models", None),
    ("pricing", "/api/agents/pricing", None),
    ("status", "/api/status", "services"),
    ("benchmarks", "/api/benchmarks", "benchmarks"),
    # Tier 2: directories the data community wants
    ("agents-directory", "/api/agents/directory", "agents"),
    ("agents-activity", "/api/agents/activity", "recent"),
    ("podcasts", "/api/podcasts", "episodes"),
    ("trending-repos", "/api/trending-repos", "repos"),
    # Tier 3: registries + telemetry
    ("mcp-registry", "/api/mcp/registry/snapshot", None),
    ("probe", "/api/probe/latest", None),
    ("gpu-pricing", "/api/gpu/pricing", None),
    ("afta-adopters", "/api/afta/adopters", "adopters"),
    # Tier 4: structured catalogs (added 2026-05-03; high signal for LLM training)
    ("ai-hardware", "/api/ai-hardware", "hardware"),
    ("open-weights", "/api/open-weights", "models"),
    ("inference-providers", "/api/inference-providers", "models"),
    ("training-runs", "/api/training-runs", "runs"),
    ("marketplaces", "/api/marketplaces", "marketplaces"),
    ("specialized-models", "/api/specialized-models", "models"),
    ("fine-tuning", "/api/fine-tuning", "providers"),
    ("oss-tools", "/api/oss-tools", "tools"),
    ("agent-apis", "/api/agent-apis", "apis"),
    ("voice-leaderboards", "/api/voice-leaderboards", None),
    # Tier 5: deep catalogs (added 2026-05-03 evening; rounds out coverage)
    ("embeddings", "/api/embeddings", "models"),
    ("multimodal", "/api/multimodal", "models"),
    ("vector-dbs", "/api/vector-dbs", "databases"),
    ("frameworks", "/api/frameworks", "frameworks"),
    ("benchmark-registry", "/api/benchmark-registry", "benchmarks"),
    ("public-leaderboards", "/api/public-leaderboards", "leaderboards"),
    ("conferences", "/api/conferences", "conferences"),
    ("funding", "/api/funding", "rounds"),
    ("model-cards", "/api/model-cards", "modelCards"),
    ("ai-policy", "/api/ai-policy", "items"),
    ("compute-providers", "/api/compute-providers", "providers"),
    ("usage-rankings", "/api/usage-rankings", "rankings"),
    ("agent-provisioning", "/api/agent-provisioning", "providers"),
    # Tier 6: rounds out free-endpoint coverage (added 2026-05-03 late evening)
    ("training-datasets", "/api/training-datasets", "datasets"),
    ("mcp-servers", "/api/mcp-servers", "servers"),
    ("attention", "/api/attention", "providers"),
    ("incidents", "/api/incidents", "incidents"),
    ("harnesses", "/api/harnesses", "benchmarks"),
    # Tier 7: new domain coverage (added 2026-05-03)
    ("embodied-ai", "/api/embodied-ai", "entries"),
    # Tier 8: legal / regulatory tracking (added 2026-05-04)
    ("ai-lawsuits", "/api/ai-lawsuits", "lawsuits"),
    # Tier 9: agent-payment ecosystem (added 2026-05-04)
    ("x402-adopters", "/api/x402-adopters", "adopters"),
]


def fetch(path: str) -> dict[str, Any]:
    url = f"{BASE}{path}"
    r = requests.get(url, headers={"User-Agent": "TensorFeed-HF-Snapshotter/1.0"}, timeout=30)
    r.raise_for_status()
    return r.json()


def to_jsonl(payload: dict[str, Any], unwrap: str | None, stem: str) -> str:
    """Convert an API payload into JSONL. Each line is a JSON object."""
    if stem == "models":
        records: list[Any] = []
        for provider in payload.get("providers", []):
            provider_name = provider.get("provider") or provider.get("name")
            for model in provider.get("models", []):
                records.append({"provider": provider_name, **model})
    elif unwrap and isinstance(payload.get(unwrap), list):
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

            jsonl = to_jsonl(payload, unwrap, stem)
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

        if README_SOURCE.exists():
            upload_file(
                path_or_fileobj=str(README_SOURCE),
                path_in_repo="README.md",
                repo_id=REPO,
                repo_type="dataset",
                commit_message="Update dataset card",
                token=TOKEN,
            )
            print(f"  pushed README.md")

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
