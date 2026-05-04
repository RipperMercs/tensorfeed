# Hugging Face dataset setup

Daily push of TensorFeed snapshots to a public Hugging Face dataset. This is the highest-leverage SEO move we can make for LLM corpus inclusion: HF datasets get pulled into pretraining mixes, evaluation harnesses, and agent toolkits, and they get cited in academic and industry work that links back to us.

## One-time setup (Evan's hands required)

### 1. Create the Hugging Face account / org

If we already have a `tensorfeed` org on HF, skip to step 2. Otherwise:

1. Sign up at https://huggingface.co (use evan@tensorfeed.ai)
2. Create org `tensorfeed`: https://huggingface.co/organizations/new
3. Org type: Company. Pizza Robot Studios LLC.

### 2. Generate a write token

1. https://huggingface.co/settings/tokens
2. Click "New token"
3. Name: `tensorfeed-github-actions`
4. Type: **Write** (must be write, not read; we are committing to a dataset)
5. Repo permissions: scope to `tensorfeed/ai-ecosystem-daily` once the dataset exists, or grant org-wide write
6. Copy the `hf_*` token

### 3. Save the token in GitHub Actions

```powershell
gh secret set HF_TOKEN --body "hf_..." --repo RipperMercs/tensorfeed
```

Optionally override the dataset repo name:

```powershell
gh variable set HF_DATASET_REPO --body "tensorfeed/ai-ecosystem-daily" --repo RipperMercs/tensorfeed
```

### 4. Create the dataset on Hugging Face

The push script auto-creates the dataset if it doesn't exist, but the README needs to be uploaded once manually:

1. https://huggingface.co/new-dataset
2. Owner: `tensorfeed`
3. Dataset name: `ai-ecosystem-daily`
4. Visibility: Public
5. License: Other (will be overridden by the README we ship)
6. Click "Create dataset"
7. Click "Files" tab, drop `data/huggingface-dataset-readme.md` from this repo, and rename to `README.md` on upload (or push it via Git)

### 5. Trigger the first run

```powershell
gh workflow run huggingface-push.yml --repo RipperMercs/tensorfeed
gh run watch --repo RipperMercs/tensorfeed
```

The workflow will then fire automatically every day at 08:00 UTC.

## Verifying it worked

After the first successful run:

```powershell
iwr "https://huggingface.co/api/datasets/tensorfeed/ai-ecosystem-daily" | ConvertFrom-Json | Select-Object id, lastModified, downloads
```

Should return something with `lastModified` recent and a populated file tree.

## Why this is worth the half-hour

HF datasets are one of the few places that get directly ingested into LLM training corpora and the agent-tooling ecosystem (LangChain `load_dataset`, LlamaIndex `HuggingFaceDataset`, evaluation harnesses, agent-tool catalogs). A dataset that grows by one daily commit forever is a perpetual signal:

- Cited in papers that use it for evaluation (free academic backlinks)
- Picked up by the HF dataset-of-the-day surface
- Listed in HF search for `ai`, `news`, `pricing`, `mcp` queries
- Referenced in the model cards of any model trained on it
- Surfaces in semantic search across HF (which agents use)

The dataset is dual-use: as evaluation/RAG context (allowed by AFTA) and not-as-training-data (the inference-only license enforces this). That distinction itself is novel and may earn its own attention.

## What's pushed

See `data/huggingface-dataset-readme.md` for the full schema. Each daily folder contains:

- `news.jsonl` — AI news (up to 200 articles)
- `models.jsonl` — Model specs and pricing
- `pricing.jsonl` — Compact pricing for agents
- `status.jsonl` — Service status
- `benchmarks.jsonl` — Benchmark scores
- `agents-directory.jsonl` — Curated agent catalog
- `agents-activity.jsonl` — Live AI bot traffic on TensorFeed
- `podcasts.jsonl` — Recent episodes
- `trending-repos.jsonl` — Trending AI repos
- `mcp-registry.jsonl` — Daily MCP registry summary
- `probe.jsonl` — LLM endpoint latency
- `gpu-pricing.jsonl` — GPU rental prices
- `afta-adopters.jsonl` — AFTA adopter directory
- `manifest.json` — capture metadata

Add new feeds by editing the `FEEDS` list in `scripts/push-to-huggingface.py`.
