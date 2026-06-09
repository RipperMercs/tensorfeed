/**
 * Shared IndexNow ping. Pushes changed URLs into Bing's live index (and the
 * IndexNow co-op engines). ChatGPT Search retrieves from Bing's index, so
 * freshness here is what makes TensorFeed citable for "is X down" style
 * queries minutes into an outage instead of after the next organic crawl.
 */
import type { Env } from './types';

// Pages whose content reflects live AI service status. Pinged whenever the
// status cron records a real status transition. Question-style per-provider
// pages join this list when they ship.
export const STATUS_CHANGE_URLS = [
  'https://tensorfeed.ai/status',
  'https://tensorfeed.ai/',
];

export interface IndexNowPayload {
  host: string;
  key: string;
  keyLocation: string;
  urlList: string[];
}

export function buildIndexNowPayload(key: string, urls: string[]): IndexNowPayload {
  return {
    host: 'tensorfeed.ai',
    key,
    keyLocation: `https://tensorfeed.ai/${key}.txt`,
    urlList: urls,
  };
}

/**
 * Best-effort ping; never throws. Returns true only when the request was
 * actually sent (key configured, urls non-empty, fetch did not throw).
 */
export async function pingIndexNow(env: { INDEXNOW_KEY?: Env['INDEXNOW_KEY'] }, urls: string[], reason: string): Promise<boolean> {
  if (!env.INDEXNOW_KEY || urls.length === 0) return false;
  try {
    await fetch('https://api.indexnow.org/indexnow', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(buildIndexNowPayload(env.INDEXNOW_KEY, urls)),
      signal: AbortSignal.timeout(5000),
    });
    console.log(`IndexNow pinged (${reason}): ${urls.length} urls`);
    return true;
  } catch (e) {
    console.warn(`IndexNow ping failed (${reason}):`, e);
    return false;
  }
}
