# MCP registry submissions

Status snapshot for surfacing `@tensorfeed/mcp-server` in every major MCP registry, plus the steps that still need Evan's hands.

## Status snapshot (2026-05-03)

| Registry | Status | Notes |
|---|---|---|
| Official MCP Registry (`registry.modelcontextprotocol.io`) | Live, v1.9.1 | Local server.json is at v1.11.0. Republish with `mcp-publisher publish` to surface the latest. |
| PulseMCP | Auto-ingests from official | Daily ingest, weekly process. No action needed once official is updated. |
| Smithery | Not eligible as-is | Smithery requires streamable HTTPS transport. Our server is stdio (npx-based). To list, build an HTTP transport variant or accept a manual MCPB upload. Skip for now. |
| mcp.so | Manual submission | Visit `https://mcp.so/submit` from a browser. Likely Cloudflare-bot-blocked from automated tools. |
| Glama.ai | Manual submission | Visit `https://glama.ai/mcp/servers` and look for submit. Some registries auto-pull from official; check first. |
| awesome-mcp-servers (GitHub) | PR | Submit a PR adding tensorfeed to `https://github.com/punkpeye/awesome-mcp-servers`. |

## Republish the official registry to v1.11.0

The mcp-publisher CLI needs DNS authentication on `tensorfeed.ai`. Evan should already have a valid credential in `~/.mcp-publisher` from the v1.9.1 publish. If not, the DNS TXT challenge can be added on Cloudflare DNS for `tensorfeed.ai`.

```powershell
cd C:\projects\tensorfeed\mcp-server
npm run build
npx mcp-publisher@latest validate
npx mcp-publisher@latest login dns --domain tensorfeed.ai   # only if not already authed
npx mcp-publisher@latest publish
```

After publishing, verify with:

```powershell
iwr "https://registry.modelcontextprotocol.io/v0/servers?search=tensorfeed" | Select-Object -ExpandProperty Content | ConvertFrom-Json | ForEach-Object { $_.servers } | Select-Object name, version
```

## Manual submissions

### mcp.so
1. Visit `https://mcp.so/submit` in a browser
2. Pick "MCP Server"
3. Repository URL: `https://github.com/RipperMercs/tensorfeed/tree/main/mcp-server`
4. npm package: `@tensorfeed/mcp-server`
5. Description: copy from `mcp-server/server.json` (`description` field)

### Glama.ai
1. Visit `https://glama.ai/mcp/servers` in a browser
2. Look for "Submit" or "Add server" link
3. Same metadata as mcp.so

### PulseMCP (only if not auto-ingested after a week)
1. Visit `https://www.pulsemcp.com/submit`
2. Submit the GitHub repo URL with subfolder pointer

### awesome-mcp-servers (PR)
1. Fork `https://github.com/punkpeye/awesome-mcp-servers`
2. Add an entry under the appropriate category (likely "News" or "Data"):

```markdown
- [TensorFeed](https://github.com/RipperMercs/tensorfeed/tree/main/mcp-server) ![NPM Version](https://img.shields.io/npm/v/%40tensorfeed%2Fmcp-server) - Real-time AI news, model pricing, and machine-payable premium tools (USDC on Base). AFTA-certified.
```

3. PR title: `Add TensorFeed MCP server`
4. PR body: link to the official registry listing as proof of validity

## Why this still matters when we're already in the official registry

Even though most secondary registries promise to ingest from the official registry, in practice:
- They lag by days or weeks
- Their search/discovery surfaces don't always re-index
- Some are GitHub-driven (awesome-* lists), which the official registry doesn't feed
- Direct submissions get featured-listing or category-page placement that auto-ingest doesn't

The official registry is necessary but not sufficient.
