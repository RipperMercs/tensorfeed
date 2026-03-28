import Parser from 'rss-parser';
import { NewsArticle } from './types';
import sourcesData from '../../data/sources.json';

const parser = new Parser({
  timeout: 10000,
  headers: {
    'User-Agent': 'TensorFeed/1.0 (https://tensorfeed.ai)',
  },
});

function generateId(url: string): string {
  // Simple hash from URL
  let hash = 0;
  for (let i = 0; i < url.length; i++) {
    const char = url.charCodeAt(i);
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
    .replace(/\s+/g, ' ')
    .trim();
}

function truncate(text: string, maxLength: number): string {
  if (text.length <= maxLength) return text;
  return text.substring(0, maxLength).replace(/\s+\S*$/, '') + '...';
}

function cleanHNSnippet(snippet: string, url: string): string {
  // HN RSS includes "Article URL: ... Comments URL: ... Points: X # Comments: Y"
  // Extract just the article URL domain or return empty for a cleaner look
  let cleaned = snippet
    .replace(/Article URL:\s*https?:\/\/[^\s]+/gi, '')
    .replace(/Comments URL:\s*https?:\/\/[^\s]+/gi, '')
    .replace(/Points:\s*\d+/gi, '')
    .replace(/#\s*Comments:\s*\d+/gi, '')
    .replace(/\s+/g, ' ')
    .trim();
  if (!cleaned || cleaned.length < 20) {
    // If nothing useful remains, return empty
    return '';
  }
  return cleaned;
}

export async function fetchAllFeeds(): Promise<NewsArticle[]> {
  const sources = sourcesData.sources.filter(s => s.active);
  const allArticles: NewsArticle[] = [];

  const feedPromises = sources.map(async (source) => {
    try {
      const feed = await parser.parseURL(source.url);
      const articles: NewsArticle[] = (feed.items || []).slice(0, 10).map((item) => {
        let snippet = item.contentSnippet || item.content || item.summary || '';
        snippet = stripHtml(snippet);
        // Clean up HN-style raw metadata snippets
        if (source.id === 'hackernews-ai') {
          snippet = cleanHNSnippet(snippet, item.link || '');
        }
        // For HN items, use the actual article URL not the HN comments URL
        let articleUrl = item.link || '';
        if (source.id === 'hackernews-ai') {
          // HN RSS description often contains the actual article URL
          const rawContent = item.content || item.summary || '';
          const urlMatch = rawContent.match(/Article URL:\s*(https?:\/\/[^\s<"]+)/i);
          if (urlMatch) articleUrl = urlMatch[1];
        }
        return {
          id: generateId(articleUrl || item.guid || item.title || ''),
          title: item.title?.trim() || 'Untitled',
          url: articleUrl,
          source: source.name,
          sourceIcon: source.icon,
          sourceDomain: source.id === 'hackernews-ai' ? new URL(articleUrl).hostname.replace('www.', '') : source.domain,
          snippet: truncate(snippet, 250),
          categories: source.categories,
          publishedAt: item.isoDate || item.pubDate || new Date().toISOString(),
          fetchedAt: new Date().toISOString(),
        };
      });
      return articles;
    } catch (error) {
      console.warn(`Failed to fetch ${source.name} (${source.url}):`, error);
      return [];
    }
  });

  const results = await Promise.allSettled(feedPromises);
  for (const result of results) {
    if (result.status === 'fulfilled') {
      allArticles.push(...result.value);
    }
  }

  // Sort by published date, newest first
  allArticles.sort((a, b) => new Date(b.publishedAt).getTime() - new Date(a.publishedAt).getTime());

  // Deduplicate by URL
  const seen = new Set<string>();
  const deduped = allArticles.filter(article => {
    if (seen.has(article.url)) return false;
    seen.add(article.url);
    return true;
  });

  return deduped;
}
