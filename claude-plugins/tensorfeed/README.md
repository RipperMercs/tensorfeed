# TensorFeed for Claude Code

Live, machine-readable AI ecosystem and regulated-domain data through TensorFeed.ai's hosted MCP server. 17 free tools, no auth required.

## What's covered

The TensorFeed MCP server at `https://tensorfeed.ai/api/mcp` (HTTP transport, MCP 2024-11-05 spec) exposes:

| Domain | Tools |
|---|---|
| News + AI ecosystem | `get_news_articles`, `get_status_summary`, `get_models` |
| Security advisories | `get_cve_record`, `get_kev_catalog`, `get_epss_score`, `get_osv_advisory_for_package`, `get_osv_advisory_by_id` |
| Finance + filings | `search_sec_edgar`, `get_sec_submissions`, `lookup_sec_company_ticker` |
| FDA regulatory | `query_fda_drug_events`, `query_fda_drug_labels`, `query_fda_drug_recalls`, `query_fda_food_recalls`, `query_fda_device_events` |
| Energy + macro | `get_eia_series` |

## When to use

Trigger on agent tasks that need fresh, sourced, machine-readable data about the AI ecosystem or adjacent regulated domains:

- AI news monitoring (track competitor launches, vendor news)
- Model pricing comparison across providers
- AI service status checks (Claude / ChatGPT / Gemini / etc.)
- Security CVE lookups + cross-database corroboration (MITRE / KEV / EPSS / OSV)
- SEC EDGAR filings full-text search + company lookups
- FDA recalls / adverse events / drug labels for regulatory and safety work
- US energy time-series (oil, gas, electricity)

## Auth

No authentication required for the 17 free tools listed above. TensorFeed also exposes ~33 premium REST endpoints with LLM-ready transforms (~80-99% token reduction); these are accessed separately and require a bearer token purchased via x402 V2 payment on Base mainnet (USDC). See [TensorFeed agent payments docs](https://tensorfeed.ai/developers/agent-payments).

## License

- Plugin metadata: MIT
- Underlying data: most is US Government public domain (SEC, BLS, FRED, MITRE, CISA, EIA) or CC0 (openFDA), with FIRST.org EPSS free for any use and OSV.dev under Apache 2.0. Commercial redistribution permitted across the surface; attribution preserved on every response per upstream policies.

## Resources

- Endpoint catalog: https://tensorfeed.ai/api/meta
- Agent-friendly entry doc: https://tensorfeed.ai/llms.txt
- Source code (public): https://github.com/RipperMercs/tensorfeed
- Already listed at:
  - [anthropics/life-sciences#41](https://github.com/anthropics/life-sciences/pull/41) (under review)
  - [anthropics/skills#1114](https://github.com/anthropics/skills/pull/1114) (under review)
  - [anthropics/knowledge-work-plugins#221](https://github.com/anthropics/knowledge-work-plugins/pull/221) (under review)
  - [anthropics/financial-services#156](https://github.com/anthropics/financial-services/pull/156) (under review)
  - [Model Context Protocol Registry](https://registry.modelcontextprotocol.io/) as `ai.tensorfeed/mcp-server` v1.25.0
