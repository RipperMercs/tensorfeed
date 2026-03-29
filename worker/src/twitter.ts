import { Env, Article } from './types';

/**
 * X/Twitter auto-posting module.
 * Posts top AI news stories to @tensorfeed via the X API v2.
 * Uses OAuth 1.0a (HMAC-SHA1) for authentication.
 */

// ── OAuth 1.0a signing ──────────────────────────────────────────────

function percentEncode(str: string): string {
  return encodeURIComponent(str)
    .replace(/!/g, '%21')
    .replace(/\*/g, '%2A')
    .replace(/'/g, '%27')
    .replace(/\(/g, '%28')
    .replace(/\)/g, '%29');
}

async function hmacSha1(key: string, data: string): Promise<string> {
  const encoder = new TextEncoder();
  const cryptoKey = await crypto.subtle.importKey(
    'raw',
    encoder.encode(key),
    { name: 'HMAC', hash: 'SHA-1' },
    false,
    ['sign']
  );
  const signature = await crypto.subtle.sign('HMAC', cryptoKey, encoder.encode(data));
  return btoa(String.fromCharCode(...new Uint8Array(signature)));
}

function generateNonce(): string {
  const array = new Uint8Array(16);
  crypto.getRandomValues(array);
  return Array.from(array, b => b.toString(16).padStart(2, '0')).join('');
}

async function buildOAuthHeader(
  method: string,
  url: string,
  env: Env
): Promise<string> {
  const timestamp = Math.floor(Date.now() / 1000).toString();
  const nonce = generateNonce();

  const params: Record<string, string> = {
    oauth_consumer_key: env.X_API_KEY,
    oauth_nonce: nonce,
    oauth_signature_method: 'HMAC-SHA1',
    oauth_timestamp: timestamp,
    oauth_token: env.X_ACCESS_TOKEN,
    oauth_version: '1.0',
  };

  // Build signature base string
  const paramString = Object.keys(params)
    .sort()
    .map(k => `${percentEncode(k)}=${percentEncode(params[k])}`)
    .join('&');

  const baseString = `${method}&${percentEncode(url)}&${percentEncode(paramString)}`;
  const signingKey = `${percentEncode(env.X_API_SECRET)}&${percentEncode(env.X_ACCESS_SECRET)}`;

  const signature = await hmacSha1(signingKey, baseString);
  params.oauth_signature = signature;

  const header = Object.keys(params)
    .sort()
    .map(k => `${percentEncode(k)}="${percentEncode(params[k])}"`)
    .join(', ');

  return `OAuth ${header}`;
}

// ── Post a tweet ────────────────────────────────────────────────────

async function postTweet(text: string, env: Env): Promise<boolean> {
  const url = 'https://api.x.com/2/tweets';

  try {
    const authHeader = await buildOAuthHeader('POST', url, env);

    const res = await fetch(url, {
      method: 'POST',
      headers: {
        Authorization: authHeader,
        'Content-Type': 'application/json',
        'User-Agent': 'TensorFeed/1.0',
      },
      body: JSON.stringify({ text }),
    });

    if (!res.ok) {
      const errBody = await res.text();
      console.warn(`Tweet failed (${res.status}): ${errBody}`);
      return false;
    }

    console.log('Tweet posted successfully');
    return true;
  } catch (e) {
    console.warn('Tweet error:', e);
    return false;
  }
}

// ── Format article into a tweet ─────────────────────────────────────

function formatTweet(article: Article): string {
  const title = article.title;
  const url = article.url;
  const source = article.source.replace(' AI', '').replace(' Blog', '');

  // Keep under 280 chars
  const suffix = `\n\nvia ${source}\n${url}\n\n#AI #AINews`;
  const maxTitle = 280 - suffix.length;

  const trimmedTitle = title.length > maxTitle
    ? title.substring(0, maxTitle - 3).replace(/\s+\S*$/, '') + '...'
    : title;

  return `${trimmedTitle}${suffix}`;
}

// ── Main: pick top stories and post ─────────────────────────────────

export async function postTopStories(env: Env): Promise<void> {
  if (!env.X_API_KEY || !env.X_ACCESS_TOKEN) {
    console.log('X API keys not configured, skipping tweet');
    return;
  }

  try {
    // Get articles from KV
    const articles = await env.TENSORFEED_NEWS.get('articles', 'json') as Article[] | null;
    if (!articles || articles.length === 0) {
      console.log('No articles to tweet');
      return;
    }

    // Get previously posted URLs to avoid duplicates
    const postedRaw = await env.TENSORFEED_CACHE.get('posted-tweets', 'json') as string[] | null;
    const posted = new Set(postedRaw || []);

    // Filter to unposted articles, prefer diverse sources
    const unposted = articles.filter(a => !posted.has(a.url));
    if (unposted.length === 0) {
      console.log('All recent articles already posted');
      return;
    }

    // Pick up to 3 articles from different sources
    const toPost: Article[] = [];
    const usedSources = new Set<string>();

    for (const article of unposted) {
      if (toPost.length >= 3) break;
      if (usedSources.has(article.source)) continue;
      toPost.push(article);
      usedSources.add(article.source);
    }

    // Post each one
    for (const article of toPost) {
      const tweet = formatTweet(article);
      const success = await postTweet(tweet, env);
      if (success) {
        posted.add(article.url);
      }
      // Small delay between tweets
      await new Promise(r => setTimeout(r, 2000));
    }

    // Save posted URLs (keep last 500 to avoid unbounded growth)
    const allPosted = [...posted].slice(-500);
    await env.TENSORFEED_CACHE.put('posted-tweets', JSON.stringify(allPosted));

    console.log(`Posted ${toPost.length} tweets`);
  } catch (e) {
    console.warn('Auto-post error:', e);
  }
}
