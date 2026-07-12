/**
 * Signal request classifier. Framework-free, dependency-free, edge-safe.
 * Runs inside the Pages Functions middleware to label every page-side request
 * for the tf_signal Analytics Engine dataset that powers /api/signal/ai-stats.
 *
 * The value here is the intent split: an AI hit is "live" (a bot fetching a page
 * to answer a user's question right now, meaning TensorFeed is being CITED) or
 * "crawl" (indexing or training for later, meaning TensorFeed is being INGESTED).
 * That distinction is what /api/signal/ai-stats surfaces and it is the reason the
 * console exists.
 *
 * This is separate from functions/_bot-detection.ts on purpose: that file feeds
 * the existing /agent-traffic activity buffer and stays byte-for-byte unchanged.
 * This file adds the richer classification without touching that path.
 *
 * Nothing here reads a file or touches Node APIs, so it runs unchanged on Workers.
 */

export interface BotDef {
  token: string; // case-insensitive substring matched against the user-agent
  name: string; // stable key
  label: string; // display label
  vendor: string;
  // "live"  = fetched a page to answer a user's question right now (cited now)
  // "crawl" = indexing or training for later (ingested for later)
  mode?: 'live' | 'crawl';
}

export const AI_BOTS: BotDef[] = [
  { token: 'chatgpt-user', name: 'chatgpt-user', label: 'ChatGPT (live answers)', vendor: 'OpenAI', mode: 'live' },
  { token: 'oai-searchbot', name: 'oai-searchbot', label: 'OpenAI SearchBot', vendor: 'OpenAI', mode: 'crawl' },
  { token: 'gptbot', name: 'gptbot', label: 'GPTBot (training)', vendor: 'OpenAI', mode: 'crawl' },
  { token: 'claude-user', name: 'claude-user', label: 'Claude (live answers)', vendor: 'Anthropic', mode: 'live' },
  { token: 'claude-web', name: 'claude-web', label: 'Claude-Web', vendor: 'Anthropic', mode: 'live' },
  { token: 'claudebot', name: 'claudebot', label: 'ClaudeBot (crawler)', vendor: 'Anthropic', mode: 'crawl' },
  { token: 'anthropic-ai', name: 'anthropic-ai', label: 'anthropic-ai', vendor: 'Anthropic', mode: 'crawl' },
  { token: 'perplexitybot', name: 'perplexitybot', label: 'PerplexityBot', vendor: 'Perplexity', mode: 'crawl' },
  { token: 'perplexity-user', name: 'perplexity-user', label: 'Perplexity (live)', vendor: 'Perplexity', mode: 'live' },
  { token: 'bytespider', name: 'bytespider', label: 'Bytespider', vendor: 'ByteDance', mode: 'crawl' },
  { token: 'amazonbot', name: 'amazonbot', label: 'Amazonbot', vendor: 'Amazon', mode: 'crawl' },
  { token: 'duckassistbot', name: 'duckassistbot', label: 'DuckAssist', vendor: 'DuckDuckGo', mode: 'live' },
  { token: 'meta-externalagent', name: 'meta-ai', label: 'Meta AI', vendor: 'Meta', mode: 'live' },
  { token: 'google-extended', name: 'google-extended', label: 'Google-Extended', vendor: 'Google', mode: 'crawl' },
  { token: 'applebot-extended', name: 'applebot-extended', label: 'Applebot-Extended', vendor: 'Apple', mode: 'crawl' },
  { token: 'cohere-ai', name: 'cohere-ai', label: 'cohere-ai', vendor: 'Cohere', mode: 'crawl' },
  { token: 'ccbot', name: 'ccbot', label: 'CCBot (Common Crawl)', vendor: 'Common Crawl', mode: 'crawl' },
  { token: 'youbot', name: 'youbot', label: 'YouBot', vendor: 'You.com', mode: 'crawl' },
];

// Traditional search crawlers, kept for AI-vs-search context. Checked only AFTER
// the AI list, so "applebot-extended" is classed as AI and plain "applebot" as
// search. Order matters for that one pair.
export const SEARCH_BOTS: BotDef[] = [
  { token: 'googlebot', name: 'googlebot', label: 'Googlebot', vendor: 'Google' },
  { token: 'bingbot', name: 'bingbot', label: 'Bingbot', vendor: 'Microsoft' },
  { token: 'yandexbot', name: 'yandexbot', label: 'YandexBot', vendor: 'Yandex' },
  { token: 'baiduspider', name: 'baiduspider', label: 'Baiduspider', vendor: 'Baidu' },
  { token: 'duckduckbot', name: 'duckduckbot', label: 'DuckDuckBot', vendor: 'DuckDuckGo' },
  { token: 'applebot', name: 'applebot', label: 'Applebot', vendor: 'Apple' },
];

export function classify(uaLower: string, defs: BotDef[]): BotDef | null {
  for (const b of defs) {
    if (uaLower.includes(b.token)) return b;
  }
  return null;
}

// A real page navigation, not a static asset or an internal route.
export function isPageview(pathNoQuery: string): boolean {
  if (
    pathNoQuery.startsWith('/_next') ||
    pathNoQuery.startsWith('/api') ||
    pathNoQuery.startsWith('/space-bg')
  ) {
    return false;
  }
  return !/\.(js|css|png|jpe?g|webp|avif|gif|svg|ico|woff2?|xml|txt|json|map|webmanifest|mp4)$/i.test(
    pathNoQuery,
  );
}

// A 404 worth surfacing: a real page-ish path, not scanner noise (/.env,
// /wp-login.php, *.php, dotfiles, /vendor/, /admin) and not a static asset.
const SCANNER_404 =
  /\.(php|aspx?|asp|jsp|cgi|env|git|ya?ml|ini|bak|sql|sh)$|(^|\/)\.[^/]|wp-|xmlrpc|phpmyadmin|\/vendor\/|\/admin/i;
export function isPageLike404(pathNoQuery: string): boolean {
  return isPageview(pathNoQuery) && !SCANNER_404.test(pathNoQuery);
}

export function refererHost(ref: string): string {
  if (!ref || ref === '-') return '';
  const m = ref.match(/^https?:\/\/([^/]+)/i);
  return m ? m[1].toLowerCase() : '';
}

export function utmSource(pathWithQuery: string): string {
  const m = pathWithQuery.match(/[?&]utm_source=([^&]+)/i);
  if (!m) return '';
  try {
    return decodeURIComponent(m[1]).toLowerCase();
  } catch {
    return m[1].toLowerCase();
  }
}

// Which AI assistant sent a human here (utm tag or referer host).
export function aiReferralSource(host: string, utm: string): string | null {
  if (utm.includes('chatgpt') || host === 'chatgpt.com' || host === 'chat.openai.com') return 'chatgpt';
  if (utm.includes('perplexity') || host.endsWith('perplexity.ai')) return 'perplexity';
  if (host === 'gemini.google.com' || utm.includes('gemini')) return 'gemini';
  if (host === 'claude.ai' || utm.includes('claude')) return 'claude';
  if (host === 'copilot.microsoft.com' || utm.includes('copilot')) return 'copilot';
  return null;
}

// Convenience: classify a whole request into the one row Signal cares about.
// kind is what the middleware writes as the Analytics Engine index/dimension.
export type RequestKind = 'ai' | 'search' | 'human';
export interface ClassifiedRequest {
  kind: RequestKind;
  botName: string; // "" for human
  vendor: string; // "" for human
  mode: 'live' | 'crawl' | ''; // "" unless an AI bot with an intent
  referralSource: string; // "" unless a human arrived from an AI assistant
  isPage: boolean;
  isPageLike404Path: boolean;
}

export function classifyRequest(
  userAgent: string,
  rawPath: string,
  referer: string,
): ClassifiedRequest {
  const uaLower = (userAgent || '').toLowerCase();
  const pathNoQuery = rawPath.split('?')[0];
  const isPage = isPageview(pathNoQuery);
  const isPageLike404Path = isPageLike404(pathNoQuery);

  const ai = classify(uaLower, AI_BOTS);
  if (ai) {
    return {
      kind: 'ai',
      botName: ai.name,
      vendor: ai.vendor,
      mode: ai.mode || '',
      referralSource: '',
      isPage,
      isPageLike404Path,
    };
  }
  const search = classify(uaLower, SEARCH_BOTS);
  if (search) {
    return { kind: 'search', botName: search.name, vendor: search.vendor, mode: '', referralSource: '', isPage, isPageLike404Path };
  }
  const host = refererHost(referer);
  const referralSource = aiReferralSource(host, utmSource(rawPath)) || '';
  return { kind: 'human', botName: '', vendor: '', mode: '', referralSource, isPage, isPageLike404Path };
}
