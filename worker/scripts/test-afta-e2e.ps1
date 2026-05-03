# End-to-end AFTA verifier test.
# Seeds 5 test credits on a passed-in token, runs the verifier, and prints the result.
# Requires: wrangler logged in with workers_kv:write, Node 20+.
#
# Usage: .\test-afta-e2e.ps1 -Token tf_live_xxxxx
# Or set $env:AFTA_TEST_TOKEN and call without args.

param(
  [string]$Token = $env:AFTA_TEST_TOKEN
)

$ErrorActionPreference = "Stop"

if (-not $Token) {
  Write-Host "Provide a tf_live_ token via -Token or AFTA_TEST_TOKEN env var." -ForegroundColor Red
  Write-Host "Tip: list tokens with 'npx wrangler kv key list --binding TENSORFEED_CACHE --remote'." -ForegroundColor Yellow
  exit 1
}
if (-not $Token.StartsWith("tf_live_")) {
  Write-Host "Token must start with tf_live_." -ForegroundColor Red
  exit 1
}

$KvKey = "pay:credits:$Token"
$WorkerDir = "C:\projects\tensorfeed\worker"
$VerifierPath = "C:\projects\afta-cloudflare-worker\examples\receipt-verifier\verify.mjs"
$Endpoint = "https://terminalfeed.io/api/pro/briefing-afta?include=btc"
$JwkUrl = "https://terminalfeed.io/.well-known/terminalfeed-receipt-key.json"

Write-Host "[1/3] Seeding 5 test credits in production KV..." -ForegroundColor Cyan

$nowIso = (Get-Date).ToUniversalTime().ToString("yyyy-MM-ddTHH:mm:ssZ")
$creditsRecord = @{
  balance         = 5
  created         = $nowIso
  last_used       = $nowIso
  agent_ua        = "afta-verifier-test"
  total_purchased = 5
} | ConvertTo-Json -Compress

# Write the JSON to a temp file so we avoid PowerShell quote-escaping hell.
$tempJson = New-TemporaryFile
$creditsRecord | Out-File -FilePath $tempJson -Encoding ascii -NoNewline

Push-Location $WorkerDir
try {
  npx wrangler kv key put --binding TENSORFEED_CACHE --remote $KvKey --path $tempJson
  if ($LASTEXITCODE -ne 0) { throw "wrangler kv put failed" }
} finally {
  Pop-Location
  Remove-Item $tempJson -ErrorAction SilentlyContinue
}

Write-Host ""
Write-Host "[2/3] Running verifier against $Endpoint" -ForegroundColor Cyan
Write-Host ""

node $VerifierPath $Endpoint $Token $JwkUrl

$verifierExit = $LASTEXITCODE

Write-Host ""
Write-Host "[3/3] Verifier exit code: $verifierExit" -ForegroundColor Cyan
if ($verifierExit -eq 0) {
  Write-Host "PASS: AFTA end-to-end works." -ForegroundColor Green
} else {
  Write-Host "FAIL: see verifier output above." -ForegroundColor Red
}
