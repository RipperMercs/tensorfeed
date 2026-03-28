import { Article, Env } from './types';
import { RSS_SOURCES } from './sources';

function hashString(str: string): string {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash |= 0;
  }
  return Math.abs(hash).toString(36);
}

function stripHtml(html: string): string {
  return html
    .replace(/<[^>]*>/g, '')
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&#x27;/g, "'")
    .replace(/&apos;/g, "'")
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

    return items.slice(0, 15).map((item) => ({
      id: hashString(item.link),
      title: item.title,
      url: item.link,
      source: source.name,
      sourceDomain: source.domain,
      snippet: truncate(stripHtml(item.description), 250),
      categories: source.categories,
      publishedAt: item.pubDate ? new Date(item.pubDate).toISOString() : now,
      fetchedAt: now,
    }));
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

  console.log(`RSS poll complete - ${final.length} articles from ${successCount}/${activeSources.length} sources`);
}
