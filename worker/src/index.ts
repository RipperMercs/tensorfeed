import { Env, Article } from './types';
import { pollRSSFeeds } from './rss';
import { pollStatusPages } from './status';

const CORS_HEADERS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type',
};

function jsonResponse(data: unknown, status = 200): Response {
  return new Response(JSON.stringify(data), {
    status,
    headers: { ...CORS_HEADERS, 'Content-Type': 'application/json', 'Cache-Control': 'public, max-age=60' },
  });
}

function xmlResponse(xml: string): Response {
  return new Response(xml, {
    headers: { ...CORS_HEADERS, 'Content-Type': 'application/rss+xml; charset=utf-8', 'Cache-Control': 'public, max-age=300' },
  });
}

function escapeXml(str: string): string {
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
}

function articlesToRSS(articles: Article[], title: string, feedUrl: string): string {
  const items = articles.map(a => `    <item>
      <title>${escapeXml(a.title)}</title>
      <link>${escapeXml(a.url)}</link>
      <description>${escapeXml(a.snippet)}</description>
      <pubDate>${new Date(a.publishedAt).toUTCString()}</pubDate>
      <guid isPermaLink="true">${escapeXml(a.url)}</guid>
      <source url="https://${escapeXml(a.sourceDomain)}">${escapeXml(a.source)}</source>
${a.categories.map(c => `      <category>${escapeXml(c)}</category>`).join('\n')}
    </item>`).join('\n');

  return `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0" xmlns:atom="http://www.w3.org/2005/Atom">
  <channel>
    <title>${escapeXml(title)}</title>
    <link>https://tensorfeed.ai</link>
    <description>AI news, model tracking, and real-time AI ecosystem data for humans and agents.</description>
    <language>en-us</language>
    <lastBuildDate>${new Date().toUTCString()}</lastBuildDate>
    <atom:link href="${escapeXml(feedUrl)}" rel="self" type="application/rss+xml"/>
    <ttl>10</ttl>
${items}
  </channel>
</rss>`;
}

function articlesToJsonFeed(articles: Article[]): object {
  return {
    version: 'https://jsonfeed.org/version/1.1',
    title: 'TensorFeed.ai',
    home_page_url: 'https://tensorfeed.ai',
    feed_url: 'https://tensorfeed.ai/api/feed.json',
    description: 'AI news, model tracking, and real-time AI ecosystem data for humans and agents.',
    items: articles.map(a => ({
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

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    const url = new URL(request.url);
    const path = url.pathname;

    if (request.method === 'OPTIONS') {
      return new Response(null, { headers: CORS_HEADERS });
    }

    // Health check
    if (path === '/api/health') {
      const newsMeta = await env.TENSORFEED_NEWS.get('meta', 'json') as Record<string, unknown> | null;
      return jsonResponse({
        ok: true,
        timestamp: new Date().toISOString(),
        news: newsMeta || { totalArticles: 0, lastUpdated: 'never' },
      });
    }

    // === NEWS ENDPOINTS ===

    if (path === '/api/news' || path === '/api/agents/news') {
      const category = url.searchParams.get('category');
      const limit = Math.min(parseInt(url.searchParams.get('limit') || '50'), 200);

      let articles = await env.TENSORFEED_NEWS.get('articles', 'json') as Article[] | null;
      if (!articles) articles = [];

      if (category && category !== 'All') {
        articles = articles.filter(a =>
          a.categories.some(c => c.toLowerCase().includes(category.toLowerCase()))
        );
      }

      return jsonResponse({
        ok: true,
        source: 'tensorfeed.ai',
        updated: new Date().toISOString(),
        count: Math.min(articles.length, limit),
        articles: articles.slice(0, limit),
      });
    }

    // RSS feed
    if (path === '/api/feed.xml' || path === '/api/feed/all.xml') {
      const articles = await env.TENSORFEED_NEWS.get('articles', 'json') as Article[] | null;
      return xmlResponse(articlesToRSS(articles || [], 'TensorFeed.ai', 'https://tensorfeed.ai/api/feed.xml'));
    }

    // Category RSS feeds
    if (path.startsWith('/api/feed/') && path.endsWith('.xml')) {
      const category = path.replace('/api/feed/', '').replace('.xml', '');
      const articles = await env.TENSORFEED_NEWS.get('articles', 'json') as Article[] | null;
      if (!articles) return xmlResponse(articlesToRSS([], `TensorFeed.ai - ${category}`, `https://tensorfeed.ai${path}`));

      const categoryMap: Record<string, string[]> = {
        research: ['Research'],
        tools: ['Tools & Dev'],
        opensource: ['Open Source'],
        hardware: ['Hardware/Chips'],
        policy: ['Policy & Safety'],
        community: ['Community'],
      };

      const filterCats = categoryMap[category.toLowerCase()] || [category];
      const filtered = articles.filter(a =>
        a.categories.some(c => filterCats.some(fc => c.toLowerCase().includes(fc.toLowerCase())))
      );

      return xmlResponse(articlesToRSS(filtered, `TensorFeed.ai - ${category}`, `https://tensorfeed.ai${path}`));
    }

    // JSON Feed
    if (path === '/api/feed.json') {
      const articles = await env.TENSORFEED_NEWS.get('articles', 'json') as Article[] | null;
      return jsonResponse(articlesToJsonFeed(articles || []));
    }

    // === STATUS ENDPOINTS ===

    if (path === '/api/status' || path === '/api/agents/status') {
      const services = await env.TENSORFEED_STATUS.get('services', 'json');
      return jsonResponse({
        ok: true,
        source: 'tensorfeed.ai',
        checked: new Date().toISOString(),
        services: services || [],
      });
    }

    if (path === '/api/status/summary') {
      const summary = await env.TENSORFEED_STATUS.get('summary', 'json');
      return jsonResponse({
        ok: true,
        source: 'tensorfeed.ai',
        services: summary || [],
      });
    }

    // === PRICING ENDPOINT ===

    if (path === '/api/agents/pricing' || path === '/api/pricing') {
      const cached = await env.TENSORFEED_CACHE.get('pricing', 'json');
      return jsonResponse({
        ok: true,
        source: 'tensorfeed.ai',
        updated: new Date().toISOString(),
        providers: cached || [],
      });
    }

    // === META ENDPOINT ===

    if (path === '/api/meta') {
      const newsMeta = await env.TENSORFEED_NEWS.get('meta', 'json');
      return jsonResponse({
        ok: true,
        site: 'tensorfeed.ai',
        description: 'AI news, model tracking, and real-time AI ecosystem data.',
        feeds: {
          rss: '/api/feed.xml',
          json: '/api/feed.json',
          research: '/api/feed/research.xml',
          tools: '/api/feed/tools.xml',
        },
        api: {
          news: '/api/agents/news',
          status: '/api/agents/status',
          pricing: '/api/agents/pricing',
          health: '/api/health',
        },
        news: newsMeta,
      });
    }

    // === FORCE REFRESH (protected) ===

    if (path === '/api/refresh' && url.searchParams.get('key') === env.ENVIRONMENT) {
      await Promise.all([pollRSSFeeds(env), pollStatusPages(env)]);
      return jsonResponse({ ok: true, message: 'Refreshed all feeds and status' });
    }

    return jsonResponse({ error: 'Not found', endpoints: ['/api/health', '/api/news', '/api/status', '/api/feed.xml', '/api/feed.json', '/api/meta'] }, 404);
  },

  async scheduled(event: ScheduledEvent, env: Env): Promise<void> {
    const cron = event.cron;

    if (cron === '*/10 * * * *') {
      await pollRSSFeeds(env);
    } else if (cron === '*/2 * * * *') {
      await pollStatusPages(env);
    } else if (cron === '0 * * * *') {
      // Hourly: refresh all
      await pollRSSFeeds(env);
      await pollStatusPages(env);
    }
  },
};
