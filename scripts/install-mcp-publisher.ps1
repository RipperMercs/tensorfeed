# Installs the mcp-publisher CLI to C:\tools\mcp-publisher and adds it to the
# current session PATH. Idempotent. Re-run any time to upgrade.

$ErrorActionPreference = "Stop"

$version = "v1.7.6"
$dir = "C:\tools\mcp-publisher"
$file = "mcp-publisher_windows_amd64.tar.gz"

New-Item -ItemType Directory -Force -Path $dir | Out-Null
Set-Location $dir

Write-Host "Downloading mcp-publisher $version..."
gh release download $version `
  --repo modelcontextprotocol/registry `
  --pattern $file `
  --clobber

Write-Host "Extracting..."
tar -xzf $file

$env:PATH = "$dir;$env:PATH"

Write-Host ""
Write-Host "Installed:" -ForegroundColor Green
Get-Command mcp-publisher | Select-Object Source

Write-Host ""
Write-Host "Next: cd C:\projects\tensorfeed\mcp-server; mcp-publisher publish" -ForegroundColor Cyan
