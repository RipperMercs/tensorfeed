# TensorFeed MCP Server

> **The MCP server has its own repo: https://github.com/RipperMercs/tensorfeed-mcp**
>
> User-facing docs, install instructions, and the full tool reference live there. Star and watch that repo to follow MCP server updates.

This subfolder remains in the main `tensorfeed` repo as the **publishing source** for the npm package (`@tensorfeed/mcp-server`) and the [official MCP registry](https://registry.modelcontextprotocol.io/v0/servers/ai.tensorfeed/mcp-server) entry. Edits to `src/`, `server.json`, `package.json`, etc. happen here and get pushed to the standalone repo on release.

## Featured: Route Verdict

The single best model to use right now, as one signed call. `route_verdict` fuses live pricing, contamination-discounted benchmark capability, real production usage, measured p95 latency probes, live incident state, and deprecation flags into one ranked decision, with an AFTA-signed receipt over the exact inputs. Instead of stitching together pricing pages, benchmark leaderboards, status dashboards, and your own latency tests, you get a current, defensible routing answer in one request.

### Zero install, no key, one command (works today)

```bash
curl -s -A "tensorfeed-cc-quickstart" "https://tensorfeed.ai/api/preview/route-verdict?task=code"
```

Swap `task` for `reasoning`, `creative`, or `general`, or pass `?model=<id-or-name>` to score a specific model. The free preview is 10 calls per day per IP, no token. Abridged real response:

```json
{
  "ok": true,
  "preview": true,
  "query": { "task": "code", "model": null },
  "verdict": {
    "rank": 1,
    "model": { "name": "Gemini 2.5 Pro", "provider": "google" },
    "pricing": { "blended": 5.625, "unit": "per 1M tokens" },
    "quality": { "trust_discounted": 0.6498 },
    "latency": { "measured_p95_ms": 1223, "source": "measured_probe" },
    "operational": { "ok": true, "status": "operational" },
    "composite_score": 0.8449,
    "why": "code quality 0.6498 after trust discount; corroborated by real usage (rank 5, 6.5% share, flat); measured p95 1223 ms; operational; blended $5.625 / 1M"
  },
  "rate_limit": { "limit": 10, "remaining": 9, "scope": "per IP per UTC day" },
  "upgrade": {
    "premium_endpoint": "/api/premium/route-verdict",
    "adds": ["runners_up", "AFTA-signed receipt", "filter params", "no rate limit"]
  }
}
```

### The agent path (MCP)

With `@tensorfeed/mcp-server` installed, an agent gets two tools. Call the free one for the pick, then the paid one when it needs to defend the choice:

```text
# Free taste: the top pick + reasoning, no token (10/IP/day)
route_verdict_preview({ task: "code" })

# 1 credit: ranked runners-up, constraint filters, AFTA-signed receipt
route_verdict({ task: "code", max_latency_p95_ms: 1500, budget: 8, min_quality: 0.6 })
```

`route_verdict` adds the ranked runners-up, the constraint filters (`max_latency_p95_ms`, `budget`, `min_quality`, `require_operational`, `exclude_deprecated`), and the AFTA-signed receipt the agent can audit later. Credits come from [tensorfeed.ai/developers/agent-payments](https://tensorfeed.ai/developers/agent-payments).

### Why it matters

Models, prices, and latency move week to week. `route_verdict` is one signed call an agent can act on now and later prove why it routed the way it did, without rebuilding the comparison from scratch each time.

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
