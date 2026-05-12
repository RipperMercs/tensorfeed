# Restore from KV Backup

## When to use this

Use this runbook when KV data has been lost or corrupted. Common scenarios:

- Accidental `wrangler kv namespace delete ...`
- Stolen Cloudflare credentials → attacker drops namespaces
- Cloudflare-side incident
- Suspected silent corruption (e.g. a bad cron rewrites the wrong key prefix)

The backup system writes a full KV dump to R2 every Sunday at 06:00 UTC, and ad-hoc on `POST /api/admin/backup/run?key=<ADMIN_KEY>`. Each backup ships with a `manifest.json` containing per-namespace key counts and sha256 hashes of the uncompressed JSONL so you can verify integrity before restoring.

## What gets backed up

Per `worker/src/backup.ts`:

- `TENSORFEED_NEWS` — news snapshots, RSS poll history, source health
- `TENSORFEED_STATUS` — service status snapshots
- `TENSORFEED_CACHE` — credits, payments, watches, anomaly events, all hot caches
- `OFAC_AUDIT_LOG` — sanctions block audit trail

Workers-internal secrets (`wrangler secret put`-managed) are NOT backed up here. Receipt-signing keys, API keys, the ADMIN_KEY itself — those live in the credentials folder per `[[reference_credential_files]]` and are operator-managed.

## Restore procedure

### Step 1 — Identify the dump you want

```powershell
# List recent backup dates from R2
$ADMIN_KEY = '<from credentials folder>'
Invoke-RestMethod "https://tensorfeed.ai/api/admin/backup/list?key=$ADMIN_KEY" | ConvertTo-Json -Depth 4
```

Pick the date you want to restore from. Typically the most recent Sunday backup, or an ad-hoc one if you triggered one before the incident.

### Step 2 — Pull the manifest to verify integrity

```powershell
$DATE = '2026-05-12'
Invoke-RestMethod "https://tensorfeed.ai/api/admin/backup/manifest?key=$ADMIN_KEY&date=$DATE" | ConvertTo-Json -Depth 4
```

Inspect:

- `namespaces[].key_count` — sane numbers? (Production should have thousands of keys per namespace, not zero.)
- `namespaces[].sha256_hex` — write these down. You'll verify after decompression.
- `namespaces[].error` — any non-empty error means that namespace failed to back up. Pick a different date if you need a clean copy.

### Step 3 — Download the dumps locally

Get presigned R2 URLs (the `/url` endpoint hands out 1-hour-valid signed download URLs):

```powershell
$NAMESPACES = @('TENSORFEED_NEWS', 'TENSORFEED_STATUS', 'TENSORFEED_CACHE', 'OFAC_AUDIT_LOG')
foreach ($NS in $NAMESPACES) {
  # Fetch presigned URL (TODO: this endpoint variant not yet shipped, use wrangler r2 object get as a fallback)
  npx wrangler r2 object get "tensorfeed-backups/$DATE/$NS.jsonl.gz" --file "./restore/$NS.jsonl.gz"
}
```

For the v1 of this system, use `wrangler r2 object get` directly until the presigned-URL admin endpoint ships (planned for Layer 2 work).

### Step 4 — Verify sha256

```powershell
foreach ($NS in $NAMESPACES) {
  # Decompress, sha256, compare to manifest
  $UNCOMPRESSED = "./restore/$NS.jsonl"
  & 'C:\Program Files\Git\usr\bin\gunzip.exe' -kc "./restore/$NS.jsonl.gz" > $UNCOMPRESSED
  $HASH = (Get-FileHash $UNCOMPRESSED -Algorithm SHA256).Hash.ToLower()
  Write-Host "$NS local hash: $HASH"
  # Compare to manifest.namespaces[].sha256_hex from Step 2
}
```

If a hash mismatches the manifest, the dump was corrupted in transit. Re-download.

### Step 5 — Choose restore granularity

**Surgical restore** (a few specific keys lost):

```powershell
# Pull a single key from the JSONL
$KEY = 'pay:credits:tf_live_abc123'
Get-Content "./restore/TENSORFEED_CACHE.jsonl" | ForEach-Object {
  $rec = $_ | ConvertFrom-Json
  if ($rec.k -eq $KEY) {
    Write-Host "Found. Restoring..."
    npx wrangler kv key put $KEY $rec.v --namespace-id 4de30d8becd24b3bba9556b98bad8e69
  }
}
```

**Full namespace restore** (catastrophic, namespace was dropped):

```powershell
# 1. Recreate the KV namespace if it was deleted
npx wrangler kv namespace create TENSORFEED_CACHE
# (Copy the new namespace ID into worker/wrangler.toml [[kv_namespaces]] block, then redeploy.)

# 2. Bulk restore from JSONL
# wrangler kv:bulk put accepts a JSON file shaped like [{"key": "k", "value": "v"}, ...]
# Convert from our JSONL:
$TARGET = './restore/TENSORFEED_CACHE.bulk.json'
'[' | Out-File -Encoding utf8 $TARGET
$first = $true
Get-Content "./restore/TENSORFEED_CACHE.jsonl" | ForEach-Object {
  $rec = $_ | ConvertFrom-Json
  $entry = @{ key = $rec.k; value = $rec.v } | ConvertTo-Json -Compress
  if (-not $first) { ',' | Out-File -Append -Encoding utf8 $TARGET }
  $entry | Out-File -Append -Encoding utf8 $TARGET
  $first = $false
}
']' | Out-File -Append -Encoding utf8 $TARGET

# 3. Push to KV
npx wrangler kv bulk put $TARGET --namespace-id 4de30d8becd24b3bba9556b98bad8e69
```

### Step 6 — Validate post-restore

Run the premium API audit to confirm all paid endpoints still gate correctly:

```powershell
node worker/scripts/premium-audit.mjs
```

Should print `Pass: 44 / Fail: 0`. If anything fails, check the specific endpoint against the dump — values may be stored under a different key prefix than expected.

### Step 7 — Rotate

If the restore was triggered by suspected credential compromise:

1. Rotate `ADMIN_KEY` via `wrangler secret put ADMIN_KEY`
2. Rotate the Ed25519 receipt-signing key per the AFTA federation rotation procedure (separate runbook in the credentials folder)
3. Audit recent payment ledger entries for unauthorized credit mints
4. File an incident summary per `_studio/SECURITY_INCIDENT.md`

## What's NOT in this runbook

- **Restoring source code** — already on GitHub. `git clone https://github.com/RipperMercs/tensorfeed.git` and run `wrangler deploy` from `worker/`.
- **Restoring secrets** — `wrangler secret put` for each. The values themselves live in the operator credentials folder, NOT in the R2 backup.
- **Restoring the R2 bucket itself** — if R2 itself is lost, you need Layer 2 (cross-provider mirror) or Layer 3 (operator local pull). Not yet shipped.

## Testing this runbook

Don't wait for an incident. Run a test restore against a throwaway KV namespace every quarter:

1. Trigger `POST /api/admin/backup/run` to create a fresh backup
2. Create a temporary KV namespace via `wrangler kv namespace create TF_TEST_RESTORE`
3. Run Steps 3-5 above against the test namespace
4. Compare key counts + spot-check 20 random keys
5. Delete the test namespace

If a quarterly test would have caught a regression in the backup module, that's the system working.
