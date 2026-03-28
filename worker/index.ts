export interface Env {
  TENSORFEED_NEWS: KVNamespace;
  TENSORFEED_STATUS: KVNamespace;
  TENSORFEED_MODELS: KVNamespace;
  TENSORFEED_CONFIG: KVNamespace;
}

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    const url = new URL(request.url);
    const path = url.pathname;

    const corsHeaders = {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type',
      'Content-Type': 'application/json',
    };

    if (request.method === 'OPTIONS') {
      return new Response(null, { headers: corsHeaders });
    }

    if (path === '/api/health') {
      return Response.json({ status: 'ok', timestamp: new Date().toISOString() }, { headers: corsHeaders });
    }

    if (path === '/api/news' || path === '/api/agents/news') {
      const cached = await env.TENSORFEED_NEWS.get('articles', 'json');
      return Response.json({
        source: 'tensorfeed.ai',
        updated: new Date().toISOString(),
        count: cached ? (cached as unknown[]).length : 0,
        articles: cached || [],
      }, { headers: corsHeaders });
    }

    if (path === '/api/status' || path === '/api/agents/status') {
      const cached = await env.TENSORFEED_STATUS.get('services', 'json');
      return Response.json({
        source: 'tensorfeed.ai',
        checked: new Date().toISOString(),
        services: cached || [],
      }, { headers: corsHeaders });
    }

    if (path === '/api/models' || path === '/api/agents/models') {
      const cached = await env.TENSORFEED_MODELS.get('models', 'json');
      return Response.json({
        source: 'tensorfeed.ai',
        updated: new Date().toISOString(),
        models: cached || [],
      }, { headers: corsHeaders });
    }

    if (path === '/api/agents/pricing') {
      const cached = await env.TENSORFEED_CONFIG.get('pricing', 'json');
      return Response.json({
        source: 'tensorfeed.ai',
        updated: new Date().toISOString(),
        providers: cached || [],
      }, { headers: corsHeaders });
    }

    return Response.json({ error: 'Not found' }, { status: 404, headers: corsHeaders });
  },

  async scheduled(event: ScheduledEvent, env: Env): Promise<void> {
    const cronPattern = event.cron;

    if (cronPattern === '*/10 * * * *') {
      // RSS polling every 10 minutes
      await pollRSSFeeds(env);
    } else if (cronPattern === '* * * * *') {
      // Status page polling every minute
      await pollStatusPages(env);
    } else if (cronPattern === '0 * * * *') {
      // Hourly: GitHub trending, model tracker
      await pollHourlyData(env);
    }
  },
};

async function pollRSSFeeds(env: Env): Promise<void> {
  // TODO: Implement RSS feed polling
  // 1. Fetch each RSS feed from sources.json
  // 2. Parse XML to extract articles
  // 3. Deduplicate by URL hash
  // 4. Store in TENSORFEED_NEWS KV
  console.log('RSS polling triggered');
}

async function pollStatusPages(env: Env): Promise<void> {
  // TODO: Implement status page polling
  // 1. Fetch /api/v2/summary.json from each statuspage.io instance
  // 2. Parse status for each component
  // 3. Store in TENSORFEED_STATUS KV
  console.log('Status polling triggered');
}

async function pollHourlyData(env: Env): Promise<void> {
  // TODO: Implement hourly data polling
  // 1. Fetch GitHub trending repos
  // 2. Fetch latest model releases from HuggingFace
  // 3. Store in TENSORFEED_MODELS KV
  console.log('Hourly polling triggered');
}
