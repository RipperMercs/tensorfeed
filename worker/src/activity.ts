import { Env } from './types';

/**
 * Agent activity tracking middleware.
 * Logs bot/agent requests to KV for the live activity widget.
 */

const BOT_PATTERNS: [RegExp, string][] = [
  [/ClaudeBot/i, 'ClaudeBot'],
  [/anthropic-ai/i, 'anthropic-ai'],
  [/GPTBot/i, 'GPTBot'],
  [/ChatGPT-User/i, 'ChatGPT-User'],
  [/OAI-SearchBot/i, 'OAI-SearchBot'],
  [/PerplexityBot/i, 'PerplexityBot'],
  [/Google-Extended/i, 'Google-Extended'],
  [/Googlebot/i, 'Googlebot'],
  [/Bingbot/i, 'Bingbot'],
  [/Applebot/i, 'Applebot'],
  [/DuckDuckBot/i, 'DuckDuckBot'],
  [/Bytespider/i, 'Bytespider'],
  [/Amazonbot/i, 'Amazonbot'],
  [/FacebookExternalHit/i, 'FacebookBot'],
  [/Twitterbot/i, 'Twitterbot'],
  [/cohere-ai/i, 'cohere-ai'],
  [/Scrapy/i, 'Scrapy'],
  [/python-requests/i, 'python-requests'],
  [/axios/i, 'axios'],
  [/node-fetch/i, 'node-fetch'],
  [/YouBot/i, 'YouBot'],
  [/Timely/i, 'Timely'],
  [/bot\b/i, 'Unknown Bot'],
  [/crawler/i, 'Unknown Crawler'],
  [/spider/i, 'Unknown Spider'],
  [/agent\b/i, 'Unknown Agent'],
];

interface AgentHit {
  bot: string;
  endpoint: string;
  timestamp: string;
}

interface DailyCounter {
  count: number;
  date: string; // YYYY-MM-DD
}

// Paths worth tracking for agent activity
const TRACKED_PATHS = [
  '/api/',
  '/feed.xml',
  '/feed.json',
  '/llms.txt',
  '/llms-full.txt',
  '/feed/',
];

function isTrackedPath(path: string): boolean {
  return TRACKED_PATHS.some(p => path.startsWith(p));
}

function detectBot(userAgent: string): string | null {
  for (const [pattern, name] of BOT_PATTERNS) {
    if (pattern.test(userAgent)) return name;
  }
  return null;
}

export async function trackAgentActivity(
  request: Request,
  env: Env,
  path: string
): Promise<void> {
  if (!isTrackedPath(path)) return;

  const ua = request.headers.get('user-agent') || '';
  const bot = detectBot(ua);
  if (!bot) return;

  const now = new Date();
  const todayStr = now.toISOString().slice(0, 10);

  try {
    // Update recent hits (last 50)
    const recentRaw = await env.TENSORFEED_CACHE.get('agent-activity', 'json') as AgentHit[] | null;
    const recent = recentRaw || [];

    recent.unshift({
      bot,
      endpoint: path,
      timestamp: now.toISOString(),
    });

    // Keep only last 50
    if (recent.length > 50) recent.length = 50;

    await env.TENSORFEED_CACHE.put('agent-activity', JSON.stringify(recent));

    // Update daily counter
    const counterRaw = await env.TENSORFEED_CACHE.get('agent-counter-daily', 'json') as DailyCounter | null;
    let counter = counterRaw || { count: 0, date: todayStr };

    // Reset if new day
    if (counter.date !== todayStr) {
      counter = { count: 0, date: todayStr };
    }

    counter.count++;
    await env.TENSORFEED_CACHE.put('agent-counter-daily', JSON.stringify(counter));
  } catch (e) {
    // Non-blocking -- don't let tracking errors break API responses
    console.warn('Agent tracking error:', e);
  }
}

export async function getAgentActivity(env: Env): Promise<{
  today_count: number;
  last_updated: string;
  recent: AgentHit[];
}> {
  const [recentRaw, counterRaw, seedRaw] = await Promise.all([
    env.TENSORFEED_CACHE.get('agent-activity', 'json') as Promise<AgentHit[] | null>,
    env.TENSORFEED_CACHE.get('agent-counter-daily', 'json') as Promise<DailyCounter | null>,
    env.TENSORFEED_CACHE.get('agent-seed', 'json') as Promise<number | null>,
  ]);

  const recent = recentRaw || [];
  const counter = counterRaw || { count: 0, date: new Date().toISOString().slice(0, 10) };
  const seed = seedRaw || 0;

  return {
    today_count: counter.count + seed,
    last_updated: new Date().toISOString(),
    recent,
  };
}
