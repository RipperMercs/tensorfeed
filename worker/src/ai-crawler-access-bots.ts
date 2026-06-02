// worker/src/ai-crawler-access-bots.ts
// Canonical list of AI bot user-agent tokens we evaluate against each site's
// robots.txt. Tokens are matched case-insensitively against User-agent lines.

export const TRACKED_BOTS = [
  'GPTBot',
  'OAI-SearchBot',
  'ChatGPT-User',
  'ClaudeBot',
  'Claude-SearchBot',
  'Claude-User',
  'PerplexityBot',
  'CCBot',
  'Google-Extended',
  'Bytespider',
  'Amazonbot',
  'Applebot-Extended',
  'Meta-ExternalAgent',
  'cohere-ai',
] as const;

export type TrackedBot = (typeof TRACKED_BOTS)[number];
