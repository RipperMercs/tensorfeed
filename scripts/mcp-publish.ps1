# Reads the Ed25519 private key from .mcp-key, logs into the official MCP
# registry via DNS, and publishes mcp-server/server.json. Run from anywhere.
#
# The mcp-publisher binary may live in any of:
#   1. PATH (if you've added it permanently)
#   2. mcp-server/.bin/mcp-publisher.exe (cached in-tree, gitignored)
#   3. C:\tools\mcp-publisher\mcp-publisher.exe (where install-mcp-publisher.ps1 puts it)
# This script probes all three so it works whether or not your current shell
# has the install script's session-scoped PATH addition.

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

# Find the publisher binary
function Find-McpPublisher {
    $cmd = Get-Command mcp-publisher -ErrorAction SilentlyContinue
    if ($cmd) { return $cmd.Source }

    $candidates = @(
        (Join-Path $repoRoot "mcp-server\.bin\mcp-publisher.exe"),
        "C:\tools\mcp-publisher\mcp-publisher.exe"
    )
    foreach ($c in $candidates) {
        if (Test-Path $c) { return $c }
    }
    return $null
}

$publisher = Find-McpPublisher
if (-not $publisher) {
    Write-Error "mcp-publisher not found. Install with: .\scripts\install-mcp-publisher.ps1"
    exit 1
}
Write-Host "Using mcp-publisher: $publisher" -ForegroundColor DarkGray

Write-Host "Logging into MCP registry via DNS for tensorfeed.ai..." -ForegroundColor Cyan
& $publisher login dns --domain tensorfeed.ai --private-key $privateKey
if ($LASTEXITCODE -ne 0) { exit $LASTEXITCODE }

Set-Location (Join-Path $repoRoot "mcp-server")

Write-Host ""
Write-Host "Publishing $(Resolve-Path .\server.json)..." -ForegroundColor Cyan
& $publisher publish
