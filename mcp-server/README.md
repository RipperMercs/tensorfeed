# TensorFeed MCP Server

> **The MCP server has its own repo: https://github.com/RipperMercs/tensorfeed-mcp**
>
> User-facing docs, install instructions, and the full tool reference live there. Star and watch that repo to follow MCP server updates.

This subfolder remains in the main `tensorfeed` repo as the **publishing source** for the npm package (`@tensorfeed/mcp-server`) and the [official MCP registry](https://registry.modelcontextprotocol.io/v0/servers/ai.tensorfeed/mcp-server) entry. Edits to `src/`, `server.json`, `package.json`, etc. happen here and get pushed to the standalone repo on release.

## Publish a new version

From the main tensorfeed repo:

```powershell
# 1. Bump the version in mcp-server/package.json + mcp-server/server.json
# 2. Build + npm publish from the mcp-server/ folder
cd mcp-server
npm run build
npm publish --access public

# 3. Republish to the official MCP registry. The script lives at
#    repo-root/scripts/, not mcp-server/scripts/, so step back up first.
cd ..
.\scripts\mcp-publish.ps1

# 4. Mirror to the standalone repo - automated. The
#    .github/workflows/mirror-mcp-server.yml workflow runs on every
#    push to main that touches mcp-server/. To trigger a manual sync,
#    go to the Actions tab and run "Mirror MCP server to standalone
#    repo" via workflow_dispatch.
```

### Automated mirror setup (one-time)

The mirror workflow needs a personal access token with `contents: write`
permission on `RipperMercs/tensorfeed-mcp`. Set it once:

1. Generate a fine-grained PAT at github.com/settings/personal-access-tokens
   scoped to the standalone repo only, with Repository permissions
   `Contents: Read and write` and `Metadata: Read-only`.
2. Add it to this monorepo as a repository secret named
   `STANDALONE_REPO_TOKEN` (Settings -> Secrets and variables -> Actions).
3. The workflow will pick it up on the next push to main that changes
   `mcp-server/**`, or via the manual "Run workflow" button.

## Quick links

- **User-facing repo (please star):** https://github.com/RipperMercs/tensorfeed-mcp
- **npm package:** https://www.npmjs.com/package/@tensorfeed/mcp-server
- **Official MCP registry:** https://registry.modelcontextprotocol.io/v0/servers/ai.tensorfeed/mcp-server
- **TensorFeed.ai:** https://tensorfeed.ai
- **Premium / payments:** https://tensorfeed.ai/developers/agent-payments
- **AFTA standard:** https://tensorfeed.ai/agent-fair-trade
