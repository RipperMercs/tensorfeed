/**
 * Shared IndexNow ping. Pushes changed URLs into Bing's live index (and the
 * IndexNow co-op engines). ChatGPT Search retrieves from Bing's index, so
 * freshness here is what makes TensorFeed citable for "is X down" style
 * queries minutes into an outage instead of after the next organic crawl.
 */
import type { Env } from './types';

// Pages whose content reflects live AI service status. Pinged whenever the
// status cron records a real status transition.
export const STATUS_CHANGE_URLS = [
  'https://tensorfeed.ai/status',
  'https://tensorfeed.ai/',
];

// Per-provider question pages (the established top-level /is-X-down set).
// Keyed by the provider string the status poller emits, so a flip pings the
// exact page an answer engine would cite for "is X down". Must stay in sync
// with the src/app/is-*-down page set on the site side.
export const PROVIDER_QUESTION_URLS: Record<string, string> = {
  'Anthropic': 'https://tensorfeed.ai/is-claude-down',
  'OpenAI': 'https://tensorfeed.ai/is-chatgpt-down',
  'Google': 'https://tensorfeed.ai/is-gemini-down',
  'GitHub': 'https://tensorfeed.ai/is-copilot-down',
  'Perplexity AI': 'https://tensorfeed.ai/is-perplexity-down',
  'DeepSeek': 'https://tensorfeed.ai/is-deepseek-down',
  'Midjourney': 'https://tensorfeed.ai/is-midjourney-down',
  'Hugging Face': 'https://tensorfeed.ai/is-huggingface-down',
  'Microsoft Azure': 'https://tensorfeed.ai/is-azure-openai-down',
  'AWS': 'https://tensorfeed.ai/is-bedrock-down',
  'Cohere': 'https://tensorfeed.ai/is-cohere-down',
  'ElevenLabs': 'https://tensorfeed.ai/is-elevenlabs-down',
  'Fireworks AI': 'https://tensorfeed.ai/is-fireworks-down',
  'Groq': 'https://tensorfeed.ai/is-groq-down',
  'Luma AI': 'https://tensorfeed.ai/is-luma-down',
  'Mistral AI': 'https://tensorfeed.ai/is-mistral-down',
  'OpenRouter': 'https://tensorfeed.ai/is-openrouter-down',
  'Replicate': 'https://tensorfeed.ai/is-replicate-down',
  'Runway': 'https://tensorfeed.ai/is-runway-down',
  'Stability AI': 'https://tensorfeed.ai/is-stability-ai-down',
  'Together AI': 'https://tensorfeed.ai/is-together-down',
};

// The full url list for a set of flipped providers: the always-pinged status
// surfaces plus each flipped provider's question page (deduped, order stable).
export function statusFlipUrlList(providers: string[]): string[] {
  const urls = [...STATUS_CHANGE_URLS];
  for (const p of providers) {
    const q = PROVIDER_QUESTION_URLS[p];
    if (q && !urls.includes(q)) urls.push(q);
  }
  return urls;
}

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
