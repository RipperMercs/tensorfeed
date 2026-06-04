export const KV_CURSOR = 'substrate-changelog:cursor';
export const KV_RECENT = 'substrate-changelog:recent';
export const KV_MODELS_SNAP = 'substrate-changelog:models:snapshot';
export const KV_DEPRECATIONS_SNAP = 'substrate-changelog:deprecations:snapshot';
export const KV_SPECS_SNAP = 'substrate-changelog:specs:snapshot';
export const kvDay = (date: string) => `substrate-changelog:day:${date}`;
export const RECENT_CAP = 200;
export const MAX_HISTORY_DAYS = 366;
export const SPEC_REPOS = {
  mcp: { kind: 'releases' as const, url: 'https://api.github.com/repos/modelcontextprotocol/modelcontextprotocol/releases?per_page=1' },
  x402: { kind: 'tags' as const, url: 'https://api.github.com/repos/coinbase/x402/tags?per_page=20' },
  a2a: { kind: 'releases' as const, url: 'https://api.github.com/repos/a2aproject/A2A/releases?per_page=1' },
};
