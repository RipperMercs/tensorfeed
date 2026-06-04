export const KV_CURSOR = 'substrate-changelog:cursor';
export const KV_RECENT = 'substrate-changelog:recent';
export const KV_MODELS_SNAP = 'substrate-changelog:models:snapshot';
export const KV_DEPRECATIONS_SNAP = 'substrate-changelog:deprecations:snapshot';
export const KV_SPECS_SNAP = 'substrate-changelog:specs:snapshot';
export const KV_FRAMEWORKS_SNAP = 'substrate-changelog:frameworks:snapshot';
export const kvDay = (date: string) => `substrate-changelog:day:${date}`;
export const RECENT_CAP = 200;
export const MAX_HISTORY_DAYS = 366;
export const SPEC_REPOS = {
  mcp: { kind: 'releases' as const, url: 'https://api.github.com/repos/modelcontextprotocol/modelcontextprotocol/releases?per_page=1' },
  x402: { kind: 'tags' as const, url: 'https://api.github.com/repos/coinbase/x402/tags?per_page=20' },
  a2a: { kind: 'releases' as const, url: 'https://api.github.com/repos/a2aproject/A2A/releases?per_page=1' },
};

// Agent frameworks + provider SDKs whose GitHub releases we track as framework_release events.
// Net-new vs /api/packages/releases: GitHub release events + the newer frameworks that feed misses.
export const FRAMEWORK_REPOS: { slug: string; repo: string }[] = [
  { slug: 'langchain', repo: 'langchain-ai/langchain' },
  { slug: 'langgraph', repo: 'langchain-ai/langgraph' },
  { slug: 'llamaindex', repo: 'run-llama/llama_index' },
  { slug: 'autogen', repo: 'microsoft/autogen' },
  { slug: 'crewai', repo: 'crewAIInc/crewAI' },
  { slug: 'pydantic-ai', repo: 'pydantic/pydantic-ai' },
  { slug: 'mastra', repo: 'mastra-ai/mastra' },
  { slug: 'openai-agents-python', repo: 'openai/openai-agents-python' },
  { slug: 'claude-agent-sdk', repo: 'anthropics/claude-agent-sdk-python' },
  { slug: 'vercel-ai', repo: 'vercel/ai' },
  { slug: 'agno', repo: 'agno-agi/agno' },
  { slug: 'smolagents', repo: 'huggingface/smolagents' },
  { slug: 'haystack', repo: 'deepset-ai/haystack' },
  { slug: 'browser-use', repo: 'browser-use/browser-use' },
  { slug: 'pipecat', repo: 'pipecat-ai/pipecat' },
  { slug: 'openai-python', repo: 'openai/openai-python' },
  { slug: 'openai-node', repo: 'openai/openai-node' },
  { slug: 'anthropic-python', repo: 'anthropics/anthropic-sdk-python' },
  { slug: 'anthropic-typescript', repo: 'anthropics/anthropic-sdk-typescript' },
  { slug: 'google-genai-python', repo: 'googleapis/python-genai' },
];
