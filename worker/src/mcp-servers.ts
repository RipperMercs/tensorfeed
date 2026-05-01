/**
 * MCP server catalog.
 *
 * Curated list of production MCP servers organized by capability so
 * agents can find a server by what it does (file-system, search, web,
 * GitHub, Slack, database, browser) rather than by name.
 *
 * Different from /api/mcp/registry/snapshot (which is the daily count
 * snapshot from the official MCP registry). This is the editorial
 * "starter pack": the 30 MCP servers most agents end up wiring in.
 *
 * Editorial; refreshed on redeploy.
 *
 * Served at /api/mcp-servers (free, cached 600s).
 */

export type MCPCapability =
  | 'filesystem'
  | 'web-search'
  | 'web-fetch'
  | 'browser'
  | 'github'
  | 'gitlab'
  | 'database'
  | 'slack'
  | 'gmail'
  | 'gcal'
  | 'gdrive'
  | 'notion'
  | 'linear'
  | 'memory'
  | 'shell'
  | 'puppeteer'
  | 'aws'
  | 'cloudflare'
  | 'vercel'
  | 'sentry'
  | 'datadog'
  | 'observability'
  | 'fetch-payment'
  | 'voice'
  | 'image'
  | 'analytics';

export interface MCPServer {
  id: string;
  name: string;
  vendor: string;
  capabilities: MCPCapability[];
  /** Transport: stdio, http, sse. */
  transports: ('stdio' | 'http' | 'sse')[];
  /** First-party (the company that owns the underlying service ships it) vs community. */
  firstParty: boolean;
  language: 'python' | 'typescript' | 'go' | 'rust' | 'multi';
  license: string;
  /** Install command (npm package or pip package). */
  install: string;
  url: string;
  /** Editorial notes on what to use this for. */
  notes: string;
}

export const MCP_SERVER_CATALOG: MCPServer[] = [
  // ── Reference / built-in ────────────────────────────────
  {
    id: 'filesystem',
    name: 'Filesystem',
    vendor: 'Anthropic',
    capabilities: ['filesystem'],
    transports: ['stdio'],
    firstParty: true,
    language: 'typescript',
    license: 'MIT',
    install: 'npx -y @modelcontextprotocol/server-filesystem /path/to/dir',
    url: 'https://github.com/modelcontextprotocol/servers/tree/main/src/filesystem',
    notes: 'Read/write/list files in a sandboxed directory. The most-installed MCP server. Default for any agent that needs local file access.',
  },
  {
    id: 'fetch',
    name: 'Fetch',
    vendor: 'Anthropic',
    capabilities: ['web-fetch'],
    transports: ['stdio'],
    firstParty: true,
    language: 'python',
    license: 'MIT',
    install: 'pip install mcp-server-fetch',
    url: 'https://github.com/modelcontextprotocol/servers/tree/main/src/fetch',
    notes: 'Convert URLs to markdown for LLM consumption. Lightweight web reader; pair with Brave or Tavily for search.',
  },
  {
    id: 'memory',
    name: 'Memory',
    vendor: 'Anthropic',
    capabilities: ['memory'],
    transports: ['stdio'],
    firstParty: true,
    language: 'typescript',
    license: 'MIT',
    install: 'npx -y @modelcontextprotocol/server-memory',
    url: 'https://github.com/modelcontextprotocol/servers/tree/main/src/memory',
    notes: 'Knowledge graph persisted across sessions. The reference long-term-memory implementation; many agents fork this as their starting point.',
  },
  {
    id: 'sequential-thinking',
    name: 'Sequential Thinking',
    vendor: 'Anthropic',
    capabilities: ['memory'],
    transports: ['stdio'],
    firstParty: true,
    language: 'typescript',
    license: 'MIT',
    install: 'npx -y @modelcontextprotocol/server-sequential-thinking',
    url: 'https://github.com/modelcontextprotocol/servers/tree/main/src/sequentialthinking',
    notes: 'Structured chain-of-thought tool. Surprisingly useful as a poke for models that under-plan.',
  },

  // ── Search ────────────────────────────────────────────
  {
    id: 'brave-search',
    name: 'Brave Search',
    vendor: 'Brave',
    capabilities: ['web-search'],
    transports: ['stdio'],
    firstParty: true,
    language: 'typescript',
    license: 'MIT',
    install: 'npx -y @modelcontextprotocol/server-brave-search',
    url: 'https://github.com/modelcontextprotocol/servers/tree/main/src/brave-search',
    notes: 'Web search via Brave Search API. 2k free queries/month. Cheaper than Google CSE for agent workloads.',
  },
  {
    id: 'tavily',
    name: 'Tavily',
    vendor: 'Tavily',
    capabilities: ['web-search'],
    transports: ['stdio', 'http'],
    firstParty: true,
    language: 'typescript',
    license: 'MIT',
    install: 'npx -y @tavily/mcp',
    url: 'https://github.com/tavily-ai/tavily-mcp',
    notes: 'AI-optimized web search. Returns structured snippets and full-page extraction. Standard search MCP for research agents.',
  },
  {
    id: 'exa',
    name: 'Exa',
    vendor: 'Exa Labs',
    capabilities: ['web-search'],
    transports: ['stdio'],
    firstParty: true,
    language: 'typescript',
    license: 'MIT',
    install: 'npx -y exa-mcp-server',
    url: 'https://github.com/exa-labs/exa-mcp-server',
    notes: 'Embedding-based search. Better than keyword for "find me content like X" queries.',
  },

  // ── Browser automation ──────────────────────────────────
  {
    id: 'playwright',
    name: 'Playwright MCP',
    vendor: 'Microsoft',
    capabilities: ['browser', 'puppeteer'],
    transports: ['stdio'],
    firstParty: true,
    language: 'typescript',
    license: 'Apache-2.0',
    install: 'npx -y @playwright/mcp',
    url: 'https://github.com/microsoft/playwright-mcp',
    notes: 'Microsoft\'s official Playwright MCP. Accessibility-tree based, not screenshot. Faster and more reliable than vision-based browser agents.',
  },
  {
    id: 'browser-use-mcp',
    name: 'Browser Use MCP',
    vendor: 'Browser Use',
    capabilities: ['browser'],
    transports: ['stdio'],
    firstParty: true,
    language: 'python',
    license: 'MIT',
    install: 'pip install browser-use-mcp',
    url: 'https://github.com/browser-use/browser-use-mcp',
    notes: 'Wraps the browser-use library. Vision-based browser agent with strong WebArena performance.',
  },
  {
    id: 'puppeteer',
    name: 'Puppeteer',
    vendor: 'Anthropic',
    capabilities: ['browser', 'puppeteer'],
    transports: ['stdio'],
    firstParty: true,
    language: 'typescript',
    license: 'MIT',
    install: 'npx -y @modelcontextprotocol/server-puppeteer',
    url: 'https://github.com/modelcontextprotocol/servers/tree/main/src/puppeteer',
    notes: 'Reference Puppeteer MCP. Headless Chrome with screenshot + click + form-fill. Older than Playwright MCP but well-tested.',
  },

  // ── GitHub / GitLab ─────────────────────────────────────
  {
    id: 'github',
    name: 'GitHub',
    vendor: 'GitHub',
    capabilities: ['github'],
    transports: ['stdio', 'http'],
    firstParty: true,
    language: 'typescript',
    license: 'MIT',
    install: 'npx -y @github/github-mcp-server',
    url: 'https://github.com/github/github-mcp-server',
    notes: 'GitHub\'s official MCP. Issues, PRs, files, search, actions. The most-installed third-party MCP after the Anthropic reference servers.',
  },
  {
    id: 'gitlab',
    name: 'GitLab',
    vendor: 'GitLab',
    capabilities: ['gitlab'],
    transports: ['stdio'],
    firstParty: true,
    language: 'typescript',
    license: 'MIT',
    install: 'npx -y @modelcontextprotocol/server-gitlab',
    url: 'https://github.com/modelcontextprotocol/servers/tree/main/src/gitlab',
    notes: 'GitLab API access. Issues, MRs, pipelines.',
  },

  // ── Productivity / SaaS ────────────────────────────────
  {
    id: 'slack',
    name: 'Slack',
    vendor: 'Anthropic',
    capabilities: ['slack'],
    transports: ['stdio'],
    firstParty: true,
    language: 'typescript',
    license: 'MIT',
    install: 'npx -y @modelcontextprotocol/server-slack',
    url: 'https://github.com/modelcontextprotocol/servers/tree/main/src/slack',
    notes: 'Read channels, post messages, search. Bot-token auth.',
  },
  {
    id: 'gmail',
    name: 'Gmail',
    vendor: 'Google',
    capabilities: ['gmail'],
    transports: ['stdio', 'http'],
    firstParty: false,
    language: 'typescript',
    license: 'MIT',
    install: 'npx -y @gongrzhe/server-gmail-autoauth-mcp',
    url: 'https://github.com/GongRzhe/Gmail-MCP-Server',
    notes: 'Read and send Gmail. OAuth flow built in. Most-deployed Gmail MCP.',
  },
  {
    id: 'notion',
    name: 'Notion',
    vendor: 'Notion',
    capabilities: ['notion'],
    transports: ['stdio', 'http'],
    firstParty: true,
    language: 'typescript',
    license: 'MIT',
    install: 'npx -y @notionhq/notion-mcp-server',
    url: 'https://github.com/makenotion/notion-mcp-server',
    notes: 'Notion\'s official MCP. Pages, databases, search. Use for any agent working with Notion as a knowledge base.',
  },
  {
    id: 'linear',
    name: 'Linear',
    vendor: 'Linear',
    capabilities: ['linear'],
    transports: ['stdio', 'http'],
    firstParty: true,
    language: 'typescript',
    license: 'MIT',
    install: 'npx -y @linear/mcp-server',
    url: 'https://github.com/linear/linear-mcp-server',
    notes: 'Linear\'s official MCP. Issues, projects, comments. Workflow-grade integration for engineering agents.',
  },
  {
    id: 'gdrive',
    name: 'Google Drive',
    vendor: 'Anthropic',
    capabilities: ['gdrive'],
    transports: ['stdio'],
    firstParty: true,
    language: 'typescript',
    license: 'MIT',
    install: 'npx -y @modelcontextprotocol/server-gdrive',
    url: 'https://github.com/modelcontextprotocol/servers/tree/main/src/gdrive',
    notes: 'Read Google Drive files. OAuth required.',
  },
  {
    id: 'gcal',
    name: 'Google Calendar',
    vendor: 'community',
    capabilities: ['gcal'],
    transports: ['stdio'],
    firstParty: false,
    language: 'typescript',
    license: 'MIT',
    install: 'npx -y @cocal/google-calendar-mcp',
    url: 'https://github.com/nspady/google-calendar-mcp',
    notes: 'Read/create calendar events. Most-installed community Gcal MCP.',
  },

  // ── Databases ──────────────────────────────────────────
  {
    id: 'postgres',
    name: 'PostgreSQL',
    vendor: 'Anthropic',
    capabilities: ['database'],
    transports: ['stdio'],
    firstParty: true,
    language: 'typescript',
    license: 'MIT',
    install: 'npx -y @modelcontextprotocol/server-postgres postgres://user:pass@host:5432/db',
    url: 'https://github.com/modelcontextprotocol/servers/tree/main/src/postgres',
    notes: 'Read-only Postgres queries. Schema introspection + ad-hoc SQL. Defaults safe (read-only).',
  },
  {
    id: 'sqlite',
    name: 'SQLite',
    vendor: 'Anthropic',
    capabilities: ['database'],
    transports: ['stdio'],
    firstParty: true,
    language: 'typescript',
    license: 'MIT',
    install: 'npx -y @modelcontextprotocol/server-sqlite path/to/db.sqlite',
    url: 'https://github.com/modelcontextprotocol/servers/tree/main/src/sqlite',
    notes: 'Local SQLite access. Useful for agent dev, data exploration, lightweight memory.',
  },
  {
    id: 'supabase',
    name: 'Supabase',
    vendor: 'Supabase',
    capabilities: ['database'],
    transports: ['stdio'],
    firstParty: true,
    language: 'typescript',
    license: 'Apache-2.0',
    install: 'npx -y @supabase/mcp-server-supabase',
    url: 'https://github.com/supabase-community/supabase-mcp',
    notes: 'Supabase\'s official MCP. SQL, storage, auth. Project management for agents that own a Supabase project.',
  },

  // ── Cloud ──────────────────────────────────────────────
  {
    id: 'aws',
    name: 'AWS',
    vendor: 'AWS',
    capabilities: ['aws'],
    transports: ['stdio'],
    firstParty: true,
    language: 'python',
    license: 'Apache-2.0',
    install: 'pipx install awslabs.aws-mcp-server',
    url: 'https://github.com/awslabs/mcp',
    notes: 'AWS Labs official MCP collection. Covers core AWS services + Bedrock + DynamoDB + S3.',
  },
  {
    id: 'cloudflare',
    name: 'Cloudflare',
    vendor: 'Cloudflare',
    capabilities: ['cloudflare'],
    transports: ['stdio', 'http'],
    firstParty: true,
    language: 'typescript',
    license: 'MIT',
    install: 'npx -y @cloudflare/mcp-server-cloudflare',
    url: 'https://github.com/cloudflare/mcp-server-cloudflare',
    notes: 'Cloudflare\'s official MCP. Workers, KV, R2, D1, Pages. Manage account from agent.',
  },
  {
    id: 'vercel',
    name: 'Vercel',
    vendor: 'community',
    capabilities: ['vercel'],
    transports: ['stdio'],
    firstParty: false,
    language: 'typescript',
    license: 'MIT',
    install: 'npx -y vercel-mcp',
    url: 'https://github.com/Quegenx/vercel-mcp-server',
    notes: 'Deploy, list, inspect Vercel projects. Most-installed community Vercel MCP.',
  },

  // ── Observability ──────────────────────────────────────
  {
    id: 'sentry',
    name: 'Sentry',
    vendor: 'Sentry',
    capabilities: ['sentry', 'observability'],
    transports: ['stdio', 'http'],
    firstParty: true,
    language: 'python',
    license: 'BUSL-1.1',
    install: 'uvx mcp-server-sentry',
    url: 'https://github.com/getsentry/sentry-mcp',
    notes: 'Read Sentry issues + events. Useful for agent-driven incident triage.',
  },
  {
    id: 'datadog',
    name: 'Datadog',
    vendor: 'community',
    capabilities: ['datadog', 'observability'],
    transports: ['stdio'],
    firstParty: false,
    language: 'typescript',
    license: 'MIT',
    install: 'npx -y datadog-mcp',
    url: 'https://github.com/datadog-mcp/datadog-mcp',
    notes: 'Query Datadog metrics, logs, monitors. Read-only by default. Pairs with Sentry for full observability access.',
  },

  // ── Misc / niche ──────────────────────────────────────
  {
    id: 'shell',
    name: 'Shell',
    vendor: 'community',
    capabilities: ['shell'],
    transports: ['stdio'],
    firstParty: false,
    language: 'typescript',
    license: 'MIT',
    install: 'npx -y mcp-shell-server',
    url: 'https://github.com/tumf/mcp-shell-server',
    notes: 'Run shell commands from MCP. Default-deny safelist; explicit per-command approval. Use with care.',
  },
  {
    id: 'tensorfeed',
    name: 'TensorFeed',
    vendor: 'TensorFeed.ai',
    capabilities: ['analytics', 'web-search'],
    transports: ['stdio'],
    firstParty: true,
    language: 'typescript',
    license: 'MIT',
    install: 'npx -y @tensorfeed/mcp-server',
    url: 'https://github.com/RipperMercs/tensorfeed/tree/main/mcp-server',
    notes: 'AI ecosystem data tools: news, status, models, benchmarks, harnesses, attention index, embeddings, vector DBs, frameworks, usage rankings. Free tier; paid premium tools require a USDC credit token.',
  },
  {
    id: 'stripe',
    name: 'Stripe',
    vendor: 'Stripe',
    capabilities: ['fetch-payment'],
    transports: ['stdio'],
    firstParty: true,
    language: 'typescript',
    license: 'MIT',
    install: 'npx -y @stripe/mcp',
    url: 'https://github.com/stripe/agent-toolkit',
    notes: 'Stripe\'s official MCP. Customers, subscriptions, products. Restricted-key auth recommended.',
  },
  {
    id: 'elevenlabs',
    name: 'ElevenLabs',
    vendor: 'ElevenLabs',
    capabilities: ['voice'],
    transports: ['stdio'],
    firstParty: true,
    language: 'python',
    license: 'MIT',
    install: 'pip install elevenlabs-mcp',
    url: 'https://github.com/elevenlabs/elevenlabs-mcp',
    notes: 'Generate speech, manage voices, cloning. Useful for agents that need to synthesize audio output.',
  },
];

export const MCP_SERVERS_LAST_UPDATED = '2026-04-30';
