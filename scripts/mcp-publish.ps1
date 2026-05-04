# Reads the Ed25519 private key from .mcp-key, logs into the official MCP
# registry via DNS, and publishes mcp-server/server.json. Run from anywhere.

$ErrorActionPreference = "Stop"

$repoRoot = Split-Path -Parent $PSScriptRoot
$keyFile = Join-Path $repoRoot ".mcp-key"

if (-not (Test-Path $keyFile)) {
    Write-Error ".mcp-key not found at $keyFile. Run: python scripts\generate-mcp-key.py"
    exit 1
}

$line = Get-Content $keyFile | Where-Object { $_ -match "^PRIVATE_KEY_HEX=" } | Select-Object -First 1
if (-not $line) {
    Write-Error "PRIVATE_KEY_HEX line missing from .mcp-key"
    exit 1
}
$privateKey = $line -replace "^PRIVATE_KEY_HEX=", ""

Write-Host "Logging into MCP registry via DNS for tensorfeed.ai..." -ForegroundColor Cyan
mcp-publisher login dns --domain tensorfeed.ai --private-key $privateKey
if ($LASTEXITCODE -ne 0) { exit $LASTEXITCODE }

Set-Location (Join-Path $repoRoot "mcp-server")

Write-Host ""
Write-Host "Publishing $(Resolve-Path .\server.json)..." -ForegroundColor Cyan
mcp-publisher publish
