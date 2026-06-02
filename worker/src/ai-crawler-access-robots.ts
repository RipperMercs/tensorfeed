// worker/src/ai-crawler-access-robots.ts
import type { BotVerdict } from './ai-crawler-access-feed';

export interface RobotsGroup {
  agents: string[];
  rules: Array<{ type: 'allow' | 'disallow'; path: string }>;
}

export function parseRobotsTxt(text: string): RobotsGroup[] {
  const groups: RobotsGroup[] = [];
  let current: RobotsGroup | null = null;
  let lastLineWasAgent = false;

  for (const rawLine of text.split(/\r?\n/)) {
    const line = rawLine.replace(/#.*$/, '').trim();
    if (!line) continue;
    const idx = line.indexOf(':');
    if (idx === -1) continue;
    const field = line.slice(0, idx).trim().toLowerCase();
    const value = line.slice(idx + 1).trim();

    if (field === 'user-agent') {
      if (!current || !lastLineWasAgent) {
        current = { agents: [], rules: [] };
        groups.push(current);
      }
      current.agents.push(value.toLowerCase());
      lastLineWasAgent = true;
      continue;
    }
    lastLineWasAgent = false;
    if (!current) continue;
    if (field === 'allow') current.rules.push({ type: 'allow', path: value });
    else if (field === 'disallow') current.rules.push({ type: 'disallow', path: value });
    // crawl-delay, sitemap, host, etc. are ignored for access intent
  }
  return groups;
}

export function verdictForBot(groups: RobotsGroup[], bot: string): BotVerdict {
  const token = bot.toLowerCase();
  const exact = groups.find((g) => g.agents.includes(token));
  const wild = groups.find((g) => g.agents.includes('*'));
  const group = exact ?? wild;
  if (!group) return 'allowed';

  // Root access: longest matching rule for "/" wins; tie goes to Allow.
  let rootDisallow = false;
  let rootAllow = false;
  let hasSubpathDisallow = false;
  for (const r of group.rules) {
    if (r.path === '/') {
      if (r.type === 'disallow') rootDisallow = true;
      else rootAllow = true;
    } else if (r.type === 'disallow' && r.path.length > 0) {
      hasSubpathDisallow = true;
    }
  }
  if (rootDisallow && !rootAllow) return 'blocked';
  if (hasSubpathDisallow) return 'partial';
  return 'allowed';
}
