# publish-to-mcp-registry.ps1
#
# After CI publishes the npm package (publish-npm.yml), this script registers
# the new version with the canonical MCP Registry under domain auth for
# ai.tensorfeed/*. Idempotent: safe to re-run; the registry rejects duplicate
# version submissions for the same name.
#
# Run from the mcp-server/ directory after npm has published the new version:
#   cd C:\projects\tensorfeed\mcp-server
#   powershell -ExecutionPolicy Bypass -File scripts\publish-to-mcp-registry.ps1
#
# Prereqs:
#   - Domain auth login state established (one-time): from this dir, run
#     ./.bin/mcp-publisher.exe login dns
#     ...and follow the DNS TXT challenge prompts. Login state persists in
#     the local mcp-publisher config until rotated.
#   - npm version on registry.npmjs.org matches server.json version (the
#     registry validates this on publish; mismatch = 422).

$ErrorActionPreference = 'Stop'
$here = Split-Path -Parent $PSScriptRoot
Set-Location $here

$publisher = Join-Path $here '.bin\mcp-publisher.exe'
if (-not (Test-Path $publisher)) {
  throw "mcp-publisher.exe not found at $publisher. Re-install per docs."
}

$server = Get-Content (Join-Path $here 'server.json') -Raw | ConvertFrom-Json
Write-Host "Publishing $($server.name) v$($server.version)" -ForegroundColor Cyan
Write-Host "  remotes: $(if ($server.remotes) { $server.remotes[0].url } else { 'none' })"
Write-Host "  packages: $(if ($server.packages) { $server.packages[0].identifier + '@' + $server.packages[0].version } else { 'none' })"
Write-Host ""

# Verify npm version exists before attempting publish
$npmName = $server.packages[0].identifier
$npmVer = $server.packages[0].version
Write-Host "Verifying $npmName@$npmVer is on npm..."
$npmCheck = npm view "$npmName@$npmVer" version 2>&1
if ($LASTEXITCODE -ne 0 -or [string]::IsNullOrWhiteSpace($npmCheck)) {
  Write-Host "WARN: npm view did not find $npmName@$npmVer." -ForegroundColor Yellow
  Write-Host "      The MCP Registry validates against npm and will 422 if the version isn't published yet."
  Write-Host "      Wait for the publish-npm workflow to finish, then retry."
  $resp = Read-Host "Continue anyway? (y/N)"
  if ($resp -ne 'y' -and $resp -ne 'Y') { exit 1 }
}

Write-Host ""
Write-Host "Publishing to https://registry.modelcontextprotocol.io ..." -ForegroundColor Cyan
& $publisher publish

Write-Host ""
Write-Host "Verify with:" -ForegroundColor Green
Write-Host "  irm 'https://registry.modelcontextprotocol.io/v0/servers?search=tensorfeed' | % servers | ? { `$_.server.version -eq '$($server.version)' }"
