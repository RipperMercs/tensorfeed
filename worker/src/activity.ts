import { Env } from './types';

/**
 * Agent activity tracking with in-memory batching.
 * Buffers hits in memory and flushes to KV periodically to minimize KV ops.
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
  date: string;
}

// ── In-memory buffer (persists across requests within same isolate) ──

let pendingHits: AgentHit[] = [];
let pendingCount = 0;
let lastFlushTime = 0;

// ── In-memory read cache ────────────────────────────────────────────

let cachedActivity: { data: { today_count: number; last_updated: string; recent: AgentHit[] }; expiresAt: number } | null = null;
const READ_CACHE_TTL = 30_000; // 30 seconds

const TRACKED_PATHS = ['/api/', '/feed.xml', '/feed.json', '/llms.txt', '/llms-full.txt', '/feed/'];
const FLUSH_INTERVAL = 60_000; // 60 seconds
const FLUSH_BATCH_SIZE = 50;

function isTrackedPath(path: string): boolean {
  return TRACKED_PATHS.some(p => path.startsWith(p));
}

function detectBot(userAgent: string): string | null {
  for (const [pattern, name] of BOT_PATTERNS) {
    if (pattern.test(userAgent)) return name;
  }
  return null;
}

/**
 * Track a bot hit. Buffers in memory, only writes to KV when batch is full
 * or enough time has passed. Zero KV operations on most calls.
 */
export async function trackAgentActivity(
  request: Request,
  env: Env,
  path: string
): Promise<void> {
  if (!isTrackedPath(path)) return;

  const ua = request.headers.get('user-agent') || '';
  const bot = detectBot(ua);
  if (!bot) return;

  // Buffer in memory
  pendingHits.push({ bot, endpoint: path, timestamp: new Date().toISOString() });
  pendingCount++;

  // Only flush to KV if batch size reached or time elapsed
  const now = Date.now();
  if (pendingCount >= FLUSH_BATCH_SIZE || (now - lastFlushTime) >= FLUSH_INTERVAL) {
    await flushToKV(env);
  }
}

async function flushToKV(env: Env): Promise<void> {
  if (pendingHits.length === 0 && pendingCount === 0) return;

  const hitsToFlush = pendingHits.splice(0);
  const countToFlush = pendingCount;
  pendingCount = 0;
  lastFlushTime = Date.now();

  try {
    const todayStr = new Date().toISOString().slice(0, 10);

    // Single KV read + write for recent hits
    const recentRaw = await env.TENSORFEED_CACHE.get('agent-activity', 'json') as AgentHit[] | null;
    const recent = [...hitsToFlush, ...(recentRaw || [])].slice(0, 50);
    await env.TENSORFEED_CACHE.put('agent-activity', JSON.stringify(recent));

    // Single KV read + write for counter
    const counterRaw = await env.TENSORFEED_CACHE.get('agent-counter-daily', 'json') as DailyCounter | null;
    let counter = counterRaw || { count: 0, date: todayStr };
    if (counter.date !== todayStr) {
      counter = { count: 0, date: todayStr };
    }
    counter.count += countToFlush;
    await env.TENSORFEED_CACHE.put('agent-counter-daily', JSON.stringify(counter));

    // Invalidate read cache
    cachedActivity = null;
  } catch (e) {
    console.warn('Agent flush error:', e);
  }
}

/**
 * Get agent activity. Caches in memory for 30s to avoid repeated KV reads.
 */
export async function getAgentActivity(env: Env): Promise<{
  today_count: number;
  last_updated: string;
  recent: AgentHit[];
}> {
  const now = Date.now();

  // Return cached if fresh
  if (cachedActivity && now < cachedActivity.expiresAt) {
    return cachedActivity.data;
  }

  // Include any unflushed in-memory hits in the response
  const [recentRaw, counterRaw, seedRaw] = await Promise.all([
    env.TENSORFEED_CACHE.get('agent-activity', 'json') as Promise<AgentHit[] | null>,
    env.TENSORFEED_CACHE.get('agent-counter-daily', 'json') as Promise<DailyCounter | null>,
    env.TENSORFEED_CACHE.get('agent-seed', 'json') as Promise<number | null>,
  ]);

  const kvRecent = recentRaw || [];
  const merged = [...pendingHits, ...kvRecent].slice(0, 50);
  const counter = counterRaw || { count: 0, date: new Date().toISOString().slice(0, 10) };
  const seed = seedRaw || 0;

  const result = {
    today_count: counter.count + pendingCount + seed,
    last_updated: new Date().toISOString(),
    recent: merged,
  };

  cachedActivity = { data: result, expiresAt: now + READ_CACHE_TTL };
  return result;
}
