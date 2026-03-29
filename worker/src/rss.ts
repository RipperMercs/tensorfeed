import { Article, Env } from './types';
import { RSS_SOURCES } from './sources';

// Keywords that must appear in title or description for non-AI-focused sources
const AI_KEYWORDS = /\b(ai|a\.i\.|artificial intelligence|machine learning|deep learning|neural net|llm|large language model|language model|gpt|chatgpt|openai|anthropic|claude|gemini|deepmind|meta ai|mistral|cohere|hugging\s?face|transformer|diffusion model|generative ai|gen\s?ai|computer vision|natural language|nlp|chatbot|copilot|ai agent|ai model|robotics|automation|deepseek|llama|stable diffusion|midjourney|dall-e|sora|grok|perplexity)\b/i;

// Titles matching these patterns are consumer/deal spam, not AI content (even if they mention "AI")
const SPAM_TITLE_PATTERNS = /\b(best .* deals|amazon .* sale|costco .* deal|walmart .* deal|iphone .* deal|spring sale|black friday|cyber monday|prime day|best .* under \$|price drop|clearance|coupon|promo code|gift guide|buying guide|kitchen .* splurge|earbuds|headphones deal|robocall|robo.?call|smart speaker deal|smart home deal)\b/i;

// Sources whose feeds are already AI-focused and don't need keyword filtering
const AI_FOCUSED_SOURCES = new Set([
  'google-ai', 'huggingface', 'nvidia-ai', 'arxiv-ai',
]);

function isAIRelated(title: string, description: string): boolean {
  // Reject consumer/deals spam even if they mention AI peripherally
  if (SPAM_TITLE_PATTERNS.test(title)) return false;
  return AI_KEYWORDS.test(title) || AI_KEYWORDS.test(description);
}

function hashString(str: string): string {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash |= 0;
  }
  return Math.abs(hash).toString(36);
}

function decodeEntities(text: string): string {
  return text
    // Numeric decimal entities (&#8217; etc)
    .replace(/&#(\d+);/g, (_, code) => String.fromCharCode(parseInt(code, 10)))
    // Numeric hex entities (&#x2019; etc)
    .replace(/&#x([0-9a-fA-F]+);/g, (_, code) => String.fromCharCode(parseInt(code, 16)))
    // Named entities
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&#x27;/g, "'")
    .replace(/&apos;/g, "'")
    .replace(/&mdash;/g, ' - ')
    .replace(/&ndash;/g, '-')
    .replace(/&hellip;/g, '...')
    .replace(/&lsquo;/g, "'")
    .replace(/&rsquo;/g, "'")
    .replace(/&ldquo;/g, '"')
    .replace(/&rdquo;/g, '"');
}

function stripHtml(html: string): string {
  return decodeEntities(
    html.replace(/<[^>]*>/g, '')
  )
    .replace(/\s+/g, ' ')
    .trim();
}

function truncate(text: string, maxLength: number): string {
  if (text.length <= maxLength) return text;
  return text.substring(0, maxLength).replace(/\s+\S*$/, '') + '...';
}

function extractFromXml(xml: string, tag: string): string {
  // Try with CDATA first
  const cdataRegex = new RegExp(`<${tag}[^>]*>\\s*<!\\[CDATA\\[([\\s\\S]*?)\\]\\]>\\s*</${tag}>`, 'i');
  const cdataMatch = xml.match(cdataRegex);
  if (cdataMatch) return cdataMatch[1].trim();

  // Regular tag content
  const regex = new RegExp(`<${tag}[^>]*>([\\s\\S]*?)</${tag}>`, 'i');
  const match = xml.match(regex);
  return match ? match[1].trim() : '';
}

function extractAttribute(xml: string, tag: string, attr: string): string {
  const regex = new RegExp(`<${tag}[^>]*${attr}="([^"]*)"`, 'i');
  const match = xml.match(regex);
  return match ? match[1] : '';
}

function parseRSSItems(xml: string): { title: string; link: string; description: string; pubDate: string }[] {
  const items: { title: string; link: string; description: string; pubDate: string }[] = [];

  // Handle both RSS <item> and Atom <entry>
  const isAtom = xml.includes('<feed') && xml.includes('xmlns="http://www.w3.org/2005/Atom"');

  if (isAtom) {
    const entries = xml.split(/<entry>/i).slice(1);
    for (const entry of entries) {
      const title = stripHtml(extractFromXml(entry, 'title'));
      const link = extractAttribute(entry, 'link', 'href') || extractFromXml(entry, 'link');
      const description = extractFromXml(entry, 'summary') || extractFromXml(entry, 'content');
      const pubDate = extractFromXml(entry, 'published') || extractFromXml(entry, 'updated');
      if (title && link) {
        items.push({ title, link, description, pubDate });
      }
    }
  } else {
    const rssItems = xml.split(/<item>/i).slice(1);
    for (const item of rssItems) {
      const title = stripHtml(extractFromXml(item, 'title'));
      const link = extractFromXml(item, 'link') || extractFromXml(item, 'guid');
      const description = extractFromXml(item, 'description') || extractFromXml(item, 'content:encoded');
      const pubDate = extractFromXml(item, 'pubDate') || extractFromXml(item, 'dc:date');
      if (title && link) {
        items.push({ title, link, description, pubDate });
      }
    }
  }

  return items;
}

async function fetchFeed(source: typeof RSS_SOURCES[number]): Promise<Article[]> {
  try {
    const response = await fetch(source.url, {
      headers: { 'User-Agent': 'TensorFeed/1.0 (https://tensorfeed.ai)' },
      signal: AbortSignal.timeout(10000),
    });

    if (!response.ok) {
      console.warn(`${source.name}: HTTP ${response.status}`);
      return [];
    }

    const xml = await response.text();
    const items = parseRSSItems(xml);
    const now = new Date().toISOString();
    const needsFilter = !AI_FOCUSED_SOURCES.has(source.id);

    const articles: Article[] = [];
    for (const item of items) {
      if (articles.length >= 15) break;

      const cleanDescription = stripHtml(item.description);

      // Filter non-AI content from general tech sources
      if (needsFilter && !isAIRelated(item.title, cleanDescription)) {
        continue;
      }

      // Ensure every article has a snippet (fix empty HN descriptions)
      let snippet = truncate(cleanDescription, 250);
      if (!snippet && source.id === 'hackernews-ai') {
        snippet = `Hacker News discussion: ${item.title}`;
      } else if (!snippet) {
        snippet = `${item.title} (via ${source.name})`;
      }

      articles.push({
        id: hashString(item.link),
        title: item.title,
        url: item.link,
        source: source.name,
        sourceDomain: source.domain,
        snippet,
        categories: source.categories,
        publishedAt: item.pubDate ? new Date(item.pubDate).toISOString() : now,
        fetchedAt: now,
      });
    }

    return articles;
  } catch (error) {
    console.warn(`${source.name}: fetch failed -`, error);
    return [];
  }
}

export async function pollRSSFeeds(env: Env): Promise<void> {
  console.log(`RSS poll starting - ${RSS_SOURCES.filter(s => s.active).length} sources`);

  const activeSources = RSS_SOURCES.filter(s => s.active);
  const results = await Promise.allSettled(activeSources.map(fetchFeed));

  const allArticles: Article[] = [];
  let successCount = 0;

  for (const result of results) {
    if (result.status === 'fulfilled' && result.value.length > 0) {
      allArticles.push(...result.value);
      successCount++;
    }
  }

  // Deduplicate by URL
  const seen = new Set<string>();
  const deduped = allArticles.filter(article => {
    if (seen.has(article.url)) return false;
    seen.add(article.url);
    return true;
  });

  // Sort by date, newest first
  deduped.sort((a, b) => new Date(b.publishedAt).getTime() - new Date(a.publishedAt).getTime());

  // Keep top 200 articles
  const final = deduped.slice(0, 200);

  // Store in KV
  await env.TENSORFEED_NEWS.put('articles', JSON.stringify(final), {
    metadata: { count: final.length, sources: successCount, updatedAt: new Date().toISOString() },
  });

  // Also store a lightweight "latest" version with just the 50 most recent
  await env.TENSORFEED_NEWS.put('articles:latest', JSON.stringify(final.slice(0, 50)));

  // Store metadata separately for quick reads
  await env.TENSORFEED_NEWS.put('meta', JSON.stringify({
    totalArticles: final.length,
    sourcesPolled: activeSources.length,
    sourcesSucceeded: successCount,
    lastUpdated: new Date().toISOString(),
  }));

  // Ping IndexNow if we got new articles (notify search engines of fresh content)
  if (final.length > 0 && env.INDEXNOW_KEY) {
    try {
      await fetch('https://api.indexnow.org/indexnow', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          host: 'tensorfeed.ai',
          key: env.INDEXNOW_KEY,
          keyLocation: `https://tensorfeed.ai/${env.INDEXNOW_KEY}.txt`,
          urlList: [
            'https://tensorfeed.ai/',
            'https://tensorfeed.ai/status',
            'https://tensorfeed.ai/models',
            'https://tensorfeed.ai/live',
          ],
        }),
        signal: AbortSignal.timeout(5000),
      });
    } catch (e) {
      console.warn('IndexNow ping failed:', e);
    }
  }

  console.log(`RSS poll complete - ${final.length} articles from ${successCount}/${activeSources.length} sources`);
}
