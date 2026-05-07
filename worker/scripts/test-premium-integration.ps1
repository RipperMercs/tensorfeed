# Premium endpoints integration-test runner.
#
# Generates a tf_live_ test token, seeds 50 credits in production KV via
# wrangler, runs the integration test script, then cleans the test token.
#
# Usage: .\test-premium-integration.ps1 [-Base https://tensorfeed.ai]
#
# Requires: wrangler logged in with workers_kv:write, Node 20+.

param(
  [string]$Base = "https://tensorfeed.ai"
)

$ErrorActionPreference = "Stop"

# ── 1. Generate a test token ──────────────────────────────────────

$bytes = New-Object byte[] 16
[System.Security.Cryptography.RNGCryptoServiceProvider]::Create().GetBytes($bytes)
$hex = ($bytes | ForEach-Object { $_.ToString("x2") }) -join ''
$Token = "tf_live_$hex"
$KvKey = "pay:credits:$Token"

Write-Host ""
Write-Host "TensorFeed premium integration test runner" -ForegroundColor Cyan
Write-Host "  base : $Base"
Write-Host "  token: $($Token.Substring(0,14))...$($Token.Substring($Token.Length - 6))"
Write-Host ""

# ── 2. Seed 50 credits ────────────────────────────────────────────

Write-Host "[1/3] Seeding 50 test credits..." -ForegroundColor Cyan

$nowIso = (Get-Date).ToUniversalTime().ToString("yyyy-MM-ddTHH:mm:ssZ")
$creditsRecord = @{
  balance         = 50
  created         = $nowIso
  last_used       = $nowIso
  agent_ua        = "premium-integration-test"
  total_purchased = 50
} | ConvertTo-Json -Compress

$tempJson = New-TemporaryFile
$creditsRecord | Out-File -FilePath $tempJson -Encoding ascii -NoNewline

$WorkerDir = Split-Path -Parent $PSScriptRoot
Push-Location $WorkerDir
try {
  npx wrangler kv key put --binding TENSORFEED_CACHE --remote $KvKey --path $tempJson | Out-Host
  if ($LASTEXITCODE -ne 0) { throw "wrangler kv put failed" }
} finally {
  Pop-Location
  Remove-Item $tempJson -ErrorAction SilentlyContinue
}

# ── 3. Run the tests ─────────────────────────────────────────────

Write-Host ""
Write-Host "[2/3] Running integration tests..." -ForegroundColor Cyan
Write-Host ""

$ScriptPath = Join-Path $PSScriptRoot "test-premium-integration.mjs"
node $ScriptPath $Token $Base
$testExit = $LASTEXITCODE

# ── 4. Clean up ──────────────────────────────────────────────────

Write-Host ""
Write-Host "[3/3] Cleaning up test token..." -ForegroundColor Cyan

Push-Location $WorkerDir
try {
  npx wrangler kv key delete --binding TENSORFEED_CACHE --remote $KvKey | Out-Host
  if ($LASTEXITCODE -ne 0) {
    Write-Host "Warning: failed to delete test token KV key. Manual cleanup may be needed: $KvKey" -ForegroundColor Yellow
  }
} finally {
  Pop-Location
}

Write-Host ""
if ($testExit -eq 0) {
  Write-Host "Overall: PASS" -ForegroundColor Green
} else {
  Write-Host "Overall: FAIL, see test output above" -ForegroundColor Red
}
exit $testExit
