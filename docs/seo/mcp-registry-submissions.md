# MCP registry submissions

Status snapshot for surfacing `@tensorfeed/mcp-server` in every major MCP registry, plus the steps that still need Evan's hands.

## Status snapshot (2026-05-03)

| Registry | Status | Notes |
|---|---|---|
| Official MCP Registry (`registry.modelcontextprotocol.io`) | ✅ Live, v1.11.0 | Republished 2026-05-03 from server.json via mcp-publisher CLI. New Ed25519 key in DNS at tensorfeed.ai (replaces the v1.9.1-era key). |
| punkpeye/awesome-mcp-servers | ✅ Live | Already listed at the time of this audit, with an embedded Glama badge. No action. |
| Glama.ai | ✅ Live | https://glama.ai/mcp/servers/RipperMercs/tensorfeed. Auto-pulled, likely from the official registry. |
| PulseMCP | ⏳ Auto-ingests from official | Daily ingest, weekly process. No action needed; should surface within a week of the v1.11.0 publish. |
| Smithery | ⏳ Not eligible as-is | Smithery requires streamable HTTPS transport. Our server is stdio (npx-based). To list, build an HTTP transport variant or accept a manual MCPB upload. Skip for now. |
| mcp.so | ⏳ Manual submission | Only outstanding action. Visit `https://mcp.so/submit` in a browser; metadata in the manual-submissions section below. |

## Republish the official registry (when bumping the version)

Two scripts handle the entire flow:

```powershell
# One-time install of the publisher binary (or to upgrade)
.\scripts\install-mcp-publisher.ps1

# Login + publish in one shot. Reads .mcp-key for the Ed25519 hex key.
.\scripts\mcp-publish.ps1
```

Pre-flight to avoid the most common failure modes:

- The `description` field in `mcp-server/server.json` must be <= 100 chars (registry validation).
- The package version in `mcp-server/package.json` must be already published to npm (the registry verifies the npm tarball exists). Bump and `npm publish --access public` from `mcp-server/` first.
- The Ed25519 public key in DNS at `tensorfeed.ai` (TXT record, content `v=MCPv1; k=ed25519; p=<base64>`) must match the private key in `.mcp-key`. If you regenerate the key with `python scripts/generate-mcp-key.py`, you must also update the Cloudflare TXT record before login will succeed.

Verify after publishing:

```powershell
iwr "https://registry.modelcontextprotocol.io/v0/servers?search=tensorfeed" | ConvertFrom-Json | ForEach-Object { $_.servers } | ForEach-Object { "$($_.server.name) $($_.server.version)" }
```

## Manual submissions

### mcp.so (the only outstanding action)
1. Visit `https://mcp.so/submit` in a browser (Cloudflare bot-blocks automated tools)
2. Pick "MCP Server"
3. Repository URL: `https://github.com/RipperMercs/tensorfeed/tree/main/mcp-server`
4. npm package: `@tensorfeed/mcp-server`
5. Description: copy from `mcp-server/server.json` (`description` field)

### PulseMCP (only if not auto-ingested two weeks after publish)
1. Visit `https://www.pulsemcp.com/submit`
2. Submit the GitHub repo URL with subfolder pointer

## Why secondary registries still matter

Even though most of them promise to ingest from the official registry, in practice:
- They lag by days or weeks
- Their search/discovery surfaces don't always re-index after upstream changes
- Direct submissions get featured-listing or category-page placement that auto-ingest does not
