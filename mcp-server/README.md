# TensorFeed MCP Server

A [Model Context Protocol](https://modelcontextprotocol.io) server that gives AI agents access to real-time AI industry data and premium endpoints from [TensorFeed.ai](https://tensorfeed.ai).

## Free Tools

| Tool | Description |
|------|-------------|
| `get_ai_news` | Latest AI news from 15+ sources (filterable by category) |
| `get_ai_status` | Real-time status of Claude, OpenAI, Gemini, Mistral, and more |
| `is_service_down` | Check if a specific AI service is down |
| `get_model_pricing` | Compare pricing across all major AI model providers |
| `get_ai_today` | Summary of top AI stories from the last 24 hours |

## Premium Tools (paid in USDC on Base)

These tools require a `TENSORFEED_TOKEN` env var. Buy credits at [tensorfeed.ai/developers/agent-payments](https://tensorfeed.ai/developers/agent-payments) and pass the returned `tf_live_...` token to your MCP client.

| Tool | Cost | Description |
|------|------|-------------|
| `get_account_balance` | Free | Show credits remaining on the configured token |
| `get_account_usage` | Free | Per-endpoint usage history for the configured token |
| `premium_routing` | 1 credit | Top-N ranked AI model recommendations with full score breakdown |
| `pricing_series` | 1 credit | Daily price points for one model with min/max/delta summary |
| `benchmark_series` | 1 credit | Score evolution for a benchmark on one model |
| `status_uptime` | 1 credit | Daily uptime % for one provider with incident-day list |
| `history_compare` | 1 credit | Diff two daily snapshots: added, removed, changed entries |
| `premium_agents_directory` | 1 credit | Enriched agents catalog with live status, news, traffic, trending_score |
| `news_search` | 1 credit | Full-text news search with date/provider/category filters and relevance scoring |
| `cost_projection` | 1 credit | Project workload cost across 1-10 AI models with 4 time horizons and cheapest-monthly ranking |
| `list_watches` | Free | List active webhook watches owned by the token |
| `create_price_watch` | 1 credit | Register a webhook watch on a model price change |
| `create_status_watch` | 1 credit | Register a webhook watch on a service status transition |
| `delete_watch` | Free | Remove an active watch |

## Setup with Claude Code

Add to your Claude Code MCP config (`~/.claude/claude_desktop_config.json`):

```json
{
  "mcpServers": {
    "tensorfeed": {
      "command": "npx",
      "args": ["-y", "@tensorfeed/mcp-server"]
    }
  }
}
```

To enable premium tools, add the `env` block:

```json
{
  "mcpServers": {
    "tensorfeed": {
      "command": "npx",
      "args": ["-y", "@tensorfeed/mcp-server"],
      "env": {
        "TENSORFEED_TOKEN": "tf_live_..."
      }
    }
  }
}
```

## Setup with Claude Desktop

Add to Claude Desktop settings (same shape as above).

## Run Locally

```bash
npx @tensorfeed/mcp-server
# or with a token for premium endpoints
TENSORFEED_TOKEN=tf_live_... npx @tensorfeed/mcp-server
```

## Example Queries

Free tier:

- "What's happening in AI today?"
- "Is Claude down right now?"
- "Compare pricing between Claude Opus and GPT-4o"
- "Show me the latest AI research papers"
- "What's the status of all AI services?"

Premium tier (with `TENSORFEED_TOKEN` set):

- "Recommend the best AI model for code under $5 per million tokens"
- "Show the price history of Claude Opus 4.7 over the last 30 days"
- "What's Anthropic's uptime this month?"
- "Compare model pricing between April 1 and today"
- "Set up a webhook to my server when Claude goes down"
- "What's my credit balance?"

## Pricing

Premium tools cost 1 credit per call. Credits are 50 per $1 USDC at base rate, with volume discounts at $5 (10%), $30 (25%), and $200 (40%). See [tensorfeed.ai/developers/agent-payments](https://tensorfeed.ai/developers/agent-payments) for the full payment flow and trust attestation.

Refunds: email evan@tensorfeed.ai with the tx hash within 24h of the charge.

## Data Source

All data comes from the [TensorFeed.ai API](https://tensorfeed.ai/developers), which aggregates from 15+ sources including Anthropic, OpenAI, Google AI, TechCrunch, The Verge, arXiv, Hacker News, and more. Updated every 10 minutes.

## License

MIT - Built by [TensorFeed.ai](https://tensorfeed.ai/about)
