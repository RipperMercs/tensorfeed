/**
 * AI agent marketplace catalog.
 *
 * Where humans (and increasingly other agents) browse and install AI
 * agents, GPTs, Claude Skills, MCP servers, fine-tuned models, and
 * specialized tools. Different from /api/agents/directory (curated
 * agent products) and /api/mcp-servers (curated MCP catalog). This is
 * the meta-catalog of marketplaces themselves.
 *
 * Editorial; refreshed on redeploy.
 *
 * Served at /api/marketplaces (free, cached 600s).
 */

export interface Marketplace {
  id: string;
  name: string;
  vendor: string;
  /** What you find here. */
  category: 'gpts' | 'agents' | 'skills' | 'models' | 'spaces' | 'mcp' | 'workflows' | 'plugins';
  /** Approximate item count, formatted (e.g. "3M+", "1k+"). */
  itemCount: string;
  /** How users / publishers interact: free, paid-per-use, subscription, revenue-share. */
  monetization: string;
  /** Whether the marketplace is open (anyone can publish) or curated. */
  publishingModel: 'open' | 'curated' | 'invite-only';
  /** Whether agents can programmatically discover items (API). */
  hasAPI: boolean;
  /** Notable categories of items found here. */
  notableItems: string[];
  url: string;
  notes: string;
}

export const MARKETPLACE_CATALOG: Marketplace[] = [
  {
    id: 'gpt-store',
    name: 'GPT Store',
    vendor: 'OpenAI',
    category: 'gpts',
    itemCount: '3M+',
    monetization: 'Revenue share for top creators (US-only); free for users with ChatGPT Plus',
    publishingModel: 'open',
    hasAPI: false,
    notableItems: ['Custom GPTs', 'Education', 'Productivity', 'Research', 'Programming'],
    url: 'https://chatgpt.com/gpts',
    notes: 'OpenAI\'s GPT marketplace. 3M+ GPTs published; revenue-share program for top US creators. No public API for discovery (browser-only).',
  },
  {
    id: 'claude-skills',
    name: 'Claude Skills',
    vendor: 'Anthropic',
    category: 'skills',
    itemCount: '500+',
    monetization: 'Free for users with Claude.ai paid plan; no marketplace fees',
    publishingModel: 'curated',
    hasAPI: true,
    notableItems: ['Excel automation', 'PDF processing', 'Code review', 'Data analysis'],
    url: 'https://claude.ai/skills',
    notes: 'Anthropic\'s official skill marketplace for Claude. Skills are bundled prompt + tool sets that extend Claude\'s capabilities. Curated; growing fast.',
  },
  {
    id: 'huggingface-spaces',
    name: 'Hugging Face Spaces',
    vendor: 'Hugging Face',
    category: 'spaces',
    itemCount: '500k+',
    monetization: 'Free; ZeroGPU for community demos; HF Pro for private Spaces',
    publishingModel: 'open',
    hasAPI: true,
    notableItems: ['Model demos', 'Eval leaderboards', 'Gradio apps', 'Fine-tune trainers'],
    url: 'https://huggingface.co/spaces',
    notes: 'The largest open AI demo marketplace. Most models on HF have an associated Space showcasing capability. API-discoverable; powers many embedded model demos.',
  },
  {
    id: 'huggingface-models',
    name: 'Hugging Face Models',
    vendor: 'Hugging Face',
    category: 'models',
    itemCount: '1.5M+',
    monetization: 'Free hosting; HF Inference Endpoints + Pro for compute',
    publishingModel: 'open',
    hasAPI: true,
    notableItems: ['Fine-tunes', 'Open weights', 'Quantized variants', 'LoRA adapters'],
    url: 'https://huggingface.co/models',
    notes: 'The de facto open AI model registry. Anyone can publish; the central hub the entire open-source ML community indexes against. API-discoverable.',
  },
  {
    id: 'replicate',
    name: 'Replicate',
    vendor: 'Replicate',
    category: 'models',
    itemCount: '40k+',
    monetization: 'Pay-per-second of GPU; revenue share for model owners',
    publishingModel: 'open',
    hasAPI: true,
    notableItems: ['Image generation', 'Video models', 'Voice / TTS', 'LoRA fine-tunes'],
    url: 'https://replicate.com',
    notes: 'API-first model marketplace. Per-second GPU billing. Strongest visual / generative model selection (FLUX, SDXL, Veo derivatives, Suno-likes).',
  },
  {
    id: 'mcp-registry',
    name: 'MCP Server Registry',
    vendor: 'Model Context Protocol',
    category: 'mcp',
    itemCount: '12k+',
    monetization: 'Free; open standard',
    publishingModel: 'open',
    hasAPI: true,
    notableItems: ['Filesystem servers', 'Search', 'Browser', 'Database', 'SaaS integrations'],
    url: 'https://registry.modelcontextprotocol.io',
    notes: 'Official MCP registry. Open submission; growing rapidly. TensorFeed snapshots daily; live count and growth at /api/mcp/registry/snapshot.',
  },
  {
    id: 'crew-ai-marketplace',
    name: 'CrewAI Marketplace',
    vendor: 'crewAI Inc.',
    category: 'agents',
    itemCount: '500+',
    monetization: 'Pay-per-execution for some crews; free crews available',
    publishingModel: 'open',
    hasAPI: false,
    notableItems: ['Marketing crews', 'Research crews', 'Sales crews', 'Engineering crews'],
    url: 'https://www.crewai.com',
    notes: 'Marketplace of pre-built CrewAI agent crews. Browse by use-case; install with one command. The strongest framework-native agent marketplace in 2026.',
  },
  {
    id: 'apify-store',
    name: 'Apify Store',
    vendor: 'Apify',
    category: 'agents',
    itemCount: '4500+',
    monetization: 'Pay-per-run; revenue share for actor authors',
    publishingModel: 'open',
    hasAPI: true,
    notableItems: ['Web scrapers', 'Data extraction', 'Browser automation', 'Site-specific actors'],
    url: 'https://apify.com/store',
    notes: 'Marketplace of pre-built scraping / automation actors. The strongest pre-built solution for "I need to scrape X named site" without writing code.',
  },
  {
    id: 'replit-agents',
    name: 'Replit Agent Templates',
    vendor: 'Replit',
    category: 'workflows',
    itemCount: '~200',
    monetization: 'Free templates; bundled with Replit subscription',
    publishingModel: 'curated',
    hasAPI: false,
    notableItems: ['Full-stack apps', 'AI-generated UIs', 'Agent workflows', 'Saas starters'],
    url: 'https://replit.com/agent',
    notes: 'Curated agent-built templates. Replit Agent generates full-stack applications; templates are pre-vetted starting points.',
  },
  {
    id: 'vercel-marketplace',
    name: 'Vercel AI Marketplace',
    vendor: 'Vercel',
    category: 'plugins',
    itemCount: '~50',
    monetization: 'Bundled with Vercel deployments; some integrations charge separately',
    publishingModel: 'curated',
    hasAPI: false,
    notableItems: ['AI SDK templates', 'Vector store integrations', 'Model providers', 'Auth + email'],
    url: 'https://vercel.com/marketplace/ai',
    notes: 'Curated integration marketplace for Vercel AI SDK projects. Smaller than HF Spaces but TS-first and tightly integrated with Next.js stacks.',
  },
  {
    id: 'agent-zero',
    name: 'Agent.ai',
    vendor: 'HubSpot (Dharmesh Shah)',
    category: 'agents',
    itemCount: '1k+',
    monetization: 'Free directory; some agents paid',
    publishingModel: 'open',
    hasAPI: false,
    notableItems: ['Marketing automation', 'Sales enablement', 'Lead generation', 'Customer support'],
    url: 'https://agent.ai',
    notes: 'Cross-platform AI agent directory built by Dharmesh Shah. Discovers agents across many platforms; growing community of indie agent builders.',
  },
  {
    id: 'glama-mcp',
    name: 'Glama MCP Marketplace',
    vendor: 'Glama',
    category: 'mcp',
    itemCount: '6k+',
    monetization: 'Free directory + paid hosted MCP servers',
    publishingModel: 'open',
    hasAPI: true,
    notableItems: ['MCP servers', 'Hosted MCP runtime', 'Server analytics'],
    url: 'https://glama.ai/mcp/servers',
    notes: 'Third-party MCP server marketplace. Hosts servers on Glama infra so users do not need to run them locally. Useful for browser-based agents that cannot run stdio servers.',
  },
];

export const MARKETPLACES_LAST_UPDATED = '2026-04-30';
