import { fetchAllFeeds } from '../src/lib/rss';
import * as fs from 'fs';
import * as path from 'path';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface Article {
  id: string;
  title: string;
  url: string;
  source: string;
  sourceDomain: string;
  snippet: string;
  categories: string[];
  publishedAt: string;
  fetchedAt: string;
  sourceIcon?: string;
}

// ---------------------------------------------------------------------------
// XML helpers
// ---------------------------------------------------------------------------

function escapeXml(str: string): string {
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
}

function toRfc2822(iso: string): string {
  return new Date(iso).toUTCString();
}

// ---------------------------------------------------------------------------
// RSS 2.0 generation
// ---------------------------------------------------------------------------

function buildRssItem(article: Article): string {
  const categories = article.categories
    .map((c) => `        <category>${escapeXml(c)}</category>`)
    .join('\n');

  return `    <item>
      <title>${escapeXml(article.title)}</title>
      <link>${escapeXml(article.url)}</link>
      <description>${escapeXml(article.snippet)}</description>
      <pubDate>${toRfc2822(article.publishedAt)}</pubDate>
      <guid isPermaLink="true">${escapeXml(article.url)}</guid>
      <source url="https://${escapeXml(article.sourceDomain)}">${escapeXml(article.source)}</source>
${categories}
    </item>`;
}

function buildRssFeed(
  articles: Article[],
  selfUrl: string,
  title = 'TensorFeed.ai',
  description = 'AI news, model tracking, and real-time AI ecosystem data for humans and agents.',
): string {
  const lastBuildDate = toRfc2822(new Date().toISOString());
  const items = articles.map(buildRssItem).join('\n');

  return `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0" xmlns:atom="http://www.w3.org/2005/Atom">
  <channel>
    <title>${escapeXml(title)}</title>
    <link>https://tensorfeed.ai</link>
    <description>${escapeXml(description)}</description>
    <language>en-us</language>
    <lastBuildDate>${lastBuildDate}</lastBuildDate>
    <atom:link href="${escapeXml(selfUrl)}" rel="self" type="application/rss+xml"/>
${items}
  </channel>
</rss>
`;
}

// ---------------------------------------------------------------------------
// JSON Feed 1.1 generation
// ---------------------------------------------------------------------------

interface JsonFeedItem {
  id: string;
  url: string;
  title: string;
  content_text: string;
  date_published: string;
  authors: { name: string }[];
  tags: string[];
}

interface JsonFeed {
  version: string;
  title: string;
  home_page_url: string;
  feed_url: string;
  description: string;
  items: JsonFeedItem[];
}

function buildJsonFeed(articles: Article[]): JsonFeed {
  return {
    version: 'https://jsonfeed.org/version/1.1',
    title: 'TensorFeed.ai',
    home_page_url: 'https://tensorfeed.ai',
    feed_url: 'https://tensorfeed.ai/feed.json',
    description:
      'AI news, model tracking, and real-time AI ecosystem data for humans and agents.',
    items: articles.map((a) => ({
      id: a.url,
      url: a.url,
      title: a.title,
      content_text: a.snippet,
      date_published: a.publishedAt,
      authors: [{ name: a.source }],
      tags: a.categories,
    })),
  };
}

// ---------------------------------------------------------------------------
// Agent API helpers
// ---------------------------------------------------------------------------

function buildAgentNews(articles: Article[]) {
  return {
    ok: true,
    count: articles.length,
    articles: articles.map((a) => ({
      id: a.id,
      title: a.title,
      url: a.url,
      source: a.source,
      sourceDomain: a.sourceDomain,
      snippet: a.snippet,
      categories: a.categories,
      publishedAt: a.publishedAt,
      fetchedAt: a.fetchedAt,
    })),
    fetchedAt: new Date().toISOString(),
  };
}

// ---------------------------------------------------------------------------
// File writing helper
// ---------------------------------------------------------------------------

function writeFile(filePath: string, content: string) {
  const dir = path.dirname(filePath);
  fs.mkdirSync(dir, { recursive: true });
  fs.writeFileSync(filePath, content, 'utf-8');
  console.log(`  Wrote ${filePath}`);
}

// ---------------------------------------------------------------------------
// Category filters
// ---------------------------------------------------------------------------

function filterByCategory(articles: Article[], category: string): Article[] {
  return articles.filter((a) =>
    a.categories.some((c) => c.toLowerCase() === category.toLowerCase()),
  );
}

// ---------------------------------------------------------------------------
// Main
// ---------------------------------------------------------------------------

async function main() {
  const root = path.resolve(__dirname, '..');
  const publicDir = path.join(root, 'public');
  const dataDir = path.join(root, 'data');

  // 1. Fetch articles from live RSS feeds
  console.log('Fetching RSS feeds...');
  const articles: Article[] = await fetchAllFeeds();
  console.log(`Fetched ${articles.length} articles from live RSS feeds`);

  // Write raw data
  const outputPath = path.join(dataDir, 'articles.json');
  fs.mkdirSync(dataDir, { recursive: true });
  fs.writeFileSync(
    outputPath,
    JSON.stringify({ articles, fetchedAt: new Date().toISOString() }, null, 2),
  );
  console.log(`Wrote articles to ${outputPath}`);

  // 2. Generate RSS & JSON feeds
  console.log('\nGenerating feed files...');

  // All articles - RSS
  writeFile(
    path.join(publicDir, 'feed.xml'),
    buildRssFeed(articles, 'https://tensorfeed.ai/feed.xml'),
  );

  // All articles - JSON Feed
  writeFile(
    path.join(publicDir, 'feed.json'),
    JSON.stringify(buildJsonFeed(articles), null, 2),
  );

  // Category feeds
  const researchArticles = filterByCategory(articles, 'Research');
  writeFile(
    path.join(publicDir, 'feed', 'research.xml'),
    buildRssFeed(
      researchArticles,
      'https://tensorfeed.ai/feed/research.xml',
      'TensorFeed.ai - Research',
      'AI research papers, breakthroughs, and academic findings.',
    ),
  );

  const toolsArticles = filterByCategory(articles, 'Tools & Dev');
  writeFile(
    path.join(publicDir, 'feed', 'tools.xml'),
    buildRssFeed(
      toolsArticles,
      'https://tensorfeed.ai/feed/tools.xml',
      'TensorFeed.ai - Tools & Dev',
      'Developer tools, SDKs, and AI engineering news.',
    ),
  );

  // 3. Generate static agent API JSON files
  console.log('\nGenerating agent API files...');

  const agentApiDir = path.join(publicDir, 'api', 'agents');
  fs.mkdirSync(agentApiDir, { recursive: true });

  // news.json
  writeFile(
    path.join(agentApiDir, 'news.json'),
    JSON.stringify(buildAgentNews(articles), null, 2),
  );

  // status.json - fetch from live worker API
  try {
    const statusRes = await fetch('https://tensorfeed.ai/api/status');
    const statusData = statusRes.ok ? await statusRes.json() : { ok: true, services: [], fetchedAt: new Date().toISOString() };
    writeFile(path.join(agentApiDir, 'status.json'), JSON.stringify(statusData, null, 2));
  } catch {
    writeFile(path.join(agentApiDir, 'status.json'), JSON.stringify({ ok: true, services: [], fetchedAt: new Date().toISOString() }, null, 2));
  }

  // pricing.json - copy from data/pricing.json
  const pricingRaw = fs.readFileSync(
    path.join(dataDir, 'pricing.json'),
    'utf-8',
  );
  const pricingData = JSON.parse(pricingRaw);
  writeFile(
    path.join(agentApiDir, 'pricing.json'),
    JSON.stringify({ ok: true, ...pricingData }, null, 2),
  );

  console.log('\nDone. All feeds and API files generated.');
}

main().catch(console.error);
