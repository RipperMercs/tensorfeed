import { Metadata } from 'next';
import Link from 'next/link';
import { Code, Zap, Bot, FileText, Globe, ExternalLink, Wallet, ArrowRight, Handshake } from 'lucide-react';
import { WebApplicationJsonLd } from '@/components/seo/JsonLd';

export const metadata: Metadata = {
  title: 'Developer Docs & API',
  description:
    'Free, no-auth JSON API for AI news, service status, model pricing, and agent data. CORS enabled, no API key needed. Documentation and code examples for JavaScript and Python.',
  openGraph: {
    type: 'website',
    url: 'https://tensorfeed.ai/developers',
    title: 'Developer Docs & API',
    description:
      'Free, no-auth JSON API for AI news, service status, model pricing, and agent data. CORS enabled, no API key needed. Documentation and code examples for JavaScript and Python.',
    siteName: 'TensorFeed.ai',
    images: [{ url: '/tensorfeed-logo.png', width: 1024, height: 1024 }],
  },
  twitter: {
    card: 'summary',
    title: 'Developer Docs & API',
    description:
      'Free, no-auth JSON API for AI news, service status, model pricing, and agent data. CORS enabled, no API key needed. Documentation and code examples for JavaScript and Python.',
  },
};

interface Endpoint {
  method: string;
  path: string;
  description: string;
  params?: string;
  cache: string;
  example: string;
}

const ENDPOINTS: Endpoint[] = [
  {
    method: 'GET',
    path: '/api/news',
    description: 'AI news articles from all major sources. Filter by category or limit results.',
    params: '?category=OpenAI&limit=10',
    cache: 'Cache for 5 minutes',
    example: `{
  "ok": true,
  "articles": [
    {
      "title": "GPT-4.5 Now Available in API",
      "source": "OpenAI Blog",
      "url": "https://openai.com/...",
      "category": "OpenAI",
      "publishedAt": "2026-03-28T12:00:00Z"
    }
  ]
}`,
  },
  {
    method: 'GET',
    path: '/api/status',
    description: 'Real-time operational status for all major AI services including Claude, OpenAI, Gemini, and more.',
    cache: 'Cache for 2 minutes',
    example: `{
  "ok": true,
  "services": [
    {
      "name": "Claude API",
      "provider": "Anthropic",
      "status": "operational",
      "components": [
        { "name": "API", "status": "operational" },
        { "name": "Console", "status": "operational" }
      ],
      "lastChecked": "2026-03-28T12:00:00Z"
    }
  ]
}`,
  },
  {
    method: 'GET',
    path: '/api/status/summary',
    description: 'Quick summary of all service statuses. Lighter payload for dashboards and monitoring.',
    cache: 'Cache for 2 minutes',
    example: `{
  "ok": true,
  "summary": {
    "total": 8,
    "operational": 7,
    "degraded": 1,
    "down": 0
  }
}`,
  },
  {
    method: 'GET',
    path: '/api/status/leaderboard',
    description:
      'Cross-provider uptime ranking computed from minute-resolution counters (one sample every 2 minutes per provider, ~720 samples per provider per day). Returns providers ranked by uptime % DESC with downtime_minutes, hard_down_minutes, and per-bucket poll counts. Free tier capped at 7 days; the paid /api/premium/status/leaderboard extends to 90 days and adds incident_count + mttr_minutes per provider.',
    cache: 'Cache for 5 minutes',
    example: `// Query: ?days=7
{
  "ok": true,
  "range": { "from": "2026-04-28", "to": "2026-05-04", "days": 7 },
  "generated_at": "2026-05-04T21:00:00Z",
  "entry_count": 10,
  "poll_interval_minutes": 2,
  "entries": [
    {
      "provider": "Claude API",
      "rank": 1,
      "uptime_pct": 99.9802,
      "polls": 5040,
      "operational_polls": 5038,
      "degraded_polls": 2,
      "down_polls": 0,
      "unknown_polls": 0,
      "downtime_minutes": 4,
      "hard_down_minutes": 0
    }
  ]
}`,
  },
  {
    method: 'GET',
    path: '/api/models',
    description: 'AI model pricing and specifications across all major providers. Input/output costs per 1M tokens, context windows.',
    cache: 'Cache for 1 hour',
    example: `{
  "ok": true,
  "lastUpdated": "2026-03-28",
  "providers": [
    {
      "name": "Anthropic",
      "models": [
        {
          "id": "claude-opus-4-6",
          "name": "Claude Opus 4.6",
          "inputPrice": 15.00,
          "outputPrice": 75.00,
          "contextWindow": 200000
        }
      ]
    }
  ]
}`,
  },
  {
    method: 'GET',
    path: '/api/agents/directory',
    description: 'Directory of AI agents and autonomous systems with descriptions, categories, and links.',
    cache: 'Cache for 15 minutes',
    example: `{
  "ok": true,
  "agents": [
    {
      "name": "Devin",
      "category": "Coding",
      "description": "Autonomous software engineer...",
      "url": "https://devin.ai"
    }
  ]
}`,
  },
  {
    method: 'GET',
    path: '/api/agents/activity',
    description: 'Agent traffic metrics and activity data showing how AI agents interact with TensorFeed.',
    cache: 'Cache for 5 minutes',
    example: `{
  "ok": true,
  "metrics": {
    "totalRequests": 12450,
    "uniqueAgents": 38,
    "topEndpoints": ["/api/news", "/api/status"]
  }
}`,
  },
  {
    method: 'GET',
    path: '/api/stats',
    description:
      'Lifetime count of successful, credit-debited premium API calls served, each returning a signed AFTA receipt when the receipt key is provisioned. Counts paid agent calls only: it excludes free endpoints and crawler/bot traffic, so it cannot be inflated the way raw bot counts can. Free, no auth.',
    cache: 'Cache for 60 seconds',
    example: `{
  "ok": true,
  "premium_calls_served": 1342,
  "each_call_returns_signed_afta_receipt": true,
  "total_credits_charged": 1810,
  "first_at": "2026-04-27T00:00:00.000Z",
  "last_at": "2026-05-17T16:44:09.512Z",
  "headline": "1342 verifiable paid agent API calls served, each returning a signed AFTA receipt"
}`,
  },
  {
    method: 'GET',
    path: '/api/health',
    description: 'Simple health check endpoint. Returns 200 if the service is running.',
    cache: 'No cache needed',
    example: `{
  "ok": true,
  "status": "healthy",
  "timestamp": "2026-03-28T12:00:00Z"
}`,
  },
  {
    method: 'GET',
    path: '/api/meta',
    description: 'Endpoint discovery. Lists all available API routes, descriptions, and formats.',
    cache: 'Cache for 1 hour',
    example: `{
  "ok": true,
  "endpoints": [
    { "path": "/api/news", "method": "GET", "description": "AI news articles" },
    { "path": "/api/status", "method": "GET", "description": "Service status" }
  ]
}`,
  },
  {
    method: 'GET',
    path: '/feed.xml',
    description: 'RSS 2.0 feed of the latest AI news articles. Compatible with all standard feed readers.',
    cache: 'Cache for 5 minutes',
    example: `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0">
  <channel>
    <title>TensorFeed.ai</title>
    <item>
      <title>GPT-4.5 Now Available</title>
      <link>https://openai.com/...</link>
    </item>
  </channel>
</rss>`,
  },
  {
    method: 'GET',
    path: '/feed.json',
    description: 'JSON Feed 1.1 format. Same content as the RSS feed but in JSON for easier parsing.',
    cache: 'Cache for 5 minutes',
    example: `{
  "version": "https://jsonfeed.org/version/1.1",
  "title": "TensorFeed.ai",
  "items": [
    {
      "id": "...",
      "title": "GPT-4.5 Now Available",
      "url": "https://openai.com/..."
    }
  ]
}`,
  },
  {
    method: 'GET',
    path: '/api/gpu/pricing',
    description: 'Aggregated GPU rental pricing across cloud GPU marketplaces (RunPod when key configured + Lambda Labs public-pricing snapshot; CoreWeave, hyperscalers planned). Cheapest on-demand and spot price per canonical GPU class (H200, H100, A100, RTX 4090, MI300X, etc), normalized from heterogeneous provider naming. Refreshed every 4 hours. Daily snapshot powers the free /api/gpu/pricing/series endpoint.',
    cache: 'Cache for 10 minutes',
    example: `{
  "ok": true,
  "snapshot": {
    "capturedAt": "2026-04-29T18:15:00Z",
    "providers": ["vast", "runpod"],
    "by_canonical": [
      {
        "canonical": "H100", "vram_gb": 80,
        "provider_count": 2, "total_offers": 47,
        "cheapest_on_demand": { "provider": "runpod", "usd_hr": 1.99, "gpu_raw": "H100 80GB SXM5" },
        "cheapest_spot": { "provider": "vast", "usd_hr": 1.45, "gpu_raw": "H100" }
      }
    ]
  }
}`,
  },
  {
    method: 'GET',
    path: '/api/gpu/pricing/cheapest',
    description: 'Top 3 cheapest current GPU offers for one canonical GPU class. Designed as the agent-friendly entry point: an agent picking a GPU does not need the full snapshot, just where to rent this right now and for how much.',
    params: '?gpu=H100&type=on_demand|spot',
    cache: 'Cache for 5 minutes',
    example: `{
  "ok": true,
  "gpu": "H100", "vram_gb": 80, "type": "on_demand",
  "results": [
    { "provider": "runpod", "usd_hr": 1.99, "gpu_raw": "H100 80GB SXM5", "available_count": 2, "region": null },
    { "provider": "vast", "usd_hr": 2.10, "gpu_raw": "H100 PCIe", "available_count": 1, "region": "US-East" }
  ]
}`,
  },
  {
    method: 'GET',
    path: '/api/papers/ai-trending',
    description: 'Daily curated AI/ML research papers, sourced from Semantic Scholar and ranked by citation count. Five fan-out queries (large language model, transformer, RLHF, AI agents, diffusion model) merged and deduped by paperId. Each paper carries title, abstract, authors, year, venue, citation count, arxivId, doi, and fieldsOfStudy. Refreshed daily at 11:00 UTC.',
    cache: 'Cache for 10 minutes',
    example: `{
  "ok": true,
  "snapshot": {
    "date": "2026-05-04",
    "capturedAt": "2026-05-04T11:00:00Z",
    "total_papers": 30,
    "papers": [
      {
        "paperId": "...",
        "title": "Attention Is All You Need",
        "abstract": "...",
        "authors": ["Vaswani", "Shazeer"],
        "year": 2017,
        "venue": "NeurIPS",
        "citationCount": 100000,
        "arxivId": "1706.03762",
        "doi": "10.x/y",
        "url": "https://...",
        "fieldsOfStudy": ["Computer Science"]
      }
    ],
    "summary": {
      "by_year": { "2025": 12, "2024": 9 },
      "top_venues": [{ "venue": "NeurIPS", "count": 4 }],
      "top_authors": [{ "author": "...", "count": 2 }]
    }
  }
}`,
  },
  {
    method: 'GET',
    path: '/api/today',
    description: 'Composite "AI ecosystem today" brief. Single edge-cached endpoint that fans out across every daily TensorFeed feed (news, 3 paper feeds, HF models/datasets/Spaces, hot GitHub issues, Reddit threads, OpenRouter catalog summary, provider status) and returns a structured response. Saves a client from orchestrating 9 separate calls. Optional ?sections=news,papers,hf,community,inference,status filter and ?limit=1-10 (default 3 items per subsection).',
    cache: 'Cache for 5 minutes',
    example: `{
  "ok": true,
  "generated_at": "2026-05-04T15:00:00.000Z",
  "sections_included": ["news","papers","hf","community","inference","status"],
  "limit_per_section": 3,
  "news": { "available": true, "captured_at": "...", "data": { "items": [...] } },
  "papers": { "available": true, "data": { "ai_trending": {...}, "arxiv_recent": {...}, "hf_daily": {...} } },
  "hf": { "available": true, "data": { "models": [...], "datasets": [...], "spaces": [...] } },
  "community": { "available": true, "data": { "github_issues": [...], "reddit": [...] } },
  "inference": { "available": true, "data": { "total_models": 240, "cheapest_input": {...}, "free_tier_count": 8, ... } },
  "status": { "available": true, "data": { "all_operational": true, "service_count": 14, "issues": [] } }
}`,
  },
  {
    method: 'GET',
    path: '/api/papers/hf-daily',
    description: 'Hugging Face\'s editor-curated daily AI/ML papers feed, layered with community upvotes and discussion counts. Different signal from /api/papers/arxiv-recent (firehose of recent submissions) and /api/papers/ai-trending (citation-ranked all-time): this is editor picks of-the-day with HF community engagement on top. Each paper carries paperId, title (sanitized at capture time), summary, authors, upvotes, num_comments, hf_url, arxiv_url (when arxiv-style), github_repo, github_stars, ai_keywords. Refreshed daily at 14:15 UTC.',
    cache: 'Cache for 10 minutes',
    example: `{
  "ok": true,
  "snapshot": {
    "date": "2026-05-04",
    "capturedAt": "2026-05-04T14:30:00Z",
    "total_papers": 30,
    "papers": [
      {
        "paperId": "2401.12345",
        "title": "...",
        "summary": "...",
        "authors": ["Alice", "Bob"],
        "upvotes": 142,
        "num_comments": 12,
        "hf_url": "https://huggingface.co/papers/2401.12345",
        "arxiv_url": "https://arxiv.org/abs/2401.12345",
        "github_repo": "https://github.com/foo/bar",
        "github_stars": 1500,
        "ai_keywords": ["llm","reasoning"]
      }
    ],
    "summary": {
      "by_keyword": [{ "keyword": "llm", "count": 12 }],
      "most_upvoted": { "paperId": "...", "title": "...", "upvotes": 280 },
      "most_discussed": { "paperId": "...", "title": "...", "comments": 45 }
    }
  }
}`,
  },
  {
    method: 'GET',
    path: '/api/papers/arxiv-recent',
    description: 'Most recent arXiv submissions in cs.AI / cs.LG / cs.CL / cs.CV. Single call to the arXiv Atom API, parsed, deduped by arxivId, sorted by publication date. Each entry carries title, abstract, authors, primary category, all categories, publishedAt, updatedAt, htmlUrl, pdfUrl, and doi. Refreshed daily at 11:30 UTC. Pairs with /api/papers/ai-trending: arxiv-recent is the firehose of brand-new submissions, ai-trending is the citation-ranked top of the field.',
    cache: 'Cache for 10 minutes',
    example: `{
  "ok": true,
  "snapshot": {
    "date": "2026-05-04",
    "capturedAt": "2026-05-04T11:30:00Z",
    "total_papers": 50,
    "categories_queried": ["cs.AI", "cs.LG", "cs.CL", "cs.CV"],
    "papers": [
      {
        "arxivId": "2401.12345",
        "version": "v2",
        "title": "...",
        "abstract": "...",
        "authors": ["Alice", "Bob"],
        "primaryCategory": "cs.AI",
        "publishedAt": "2026-05-04T09:00:00Z",
        "htmlUrl": "https://arxiv.org/abs/2401.12345v2",
        "pdfUrl": "https://arxiv.org/pdf/2401.12345v2"
      }
    ]
  }
}`,
  },
  {
    method: 'GET',
    path: '/api/hf/trending',
    description: 'Top Hugging Face models, datasets, and Spaces (the three asset classes). Models and datasets ranked by downloads (top 30 each); Spaces ranked by likes (top 30, since downloads is meaningless for hosted apps). Captured daily at 12:00 UTC against the public HF API (no auth). Once we have multiple days of snapshots, day-over-day deltas become a real "trending" signal. Pairs with the existing TensorFeed HF dataset (tensorfeed/ai-ecosystem-daily) which we publish back into the HF community.',
    cache: 'Cache for 10 minutes',
    example: `{
  "ok": true,
  "snapshot": {
    "date": "2026-05-04",
    "capturedAt": "2026-05-04T12:00:00Z",
    "models": {
      "sort": "downloads", "count": 30,
      "items": [
        { "id": "sentence-transformers/all-MiniLM-L6-v2",
          "downloads": 12000000, "likes": 1800,
          "pipeline_tag": "sentence-similarity",
          "tags": ["sentence-transformers"], "lastModified": "..." }
      ]
    },
    "datasets": { "sort": "downloads", "count": 30, "items": [...] },
    "spaces": {
      "sort": "likes", "count": 30,
      "items": [
        { "id": "huggingface-projects/llama-3-8b-demo",
          "author": "huggingface-projects", "sdk": "gradio",
          "likes": 4200, "tags": ["chat","llm"],
          "runtime_stage": "RUNNING", "hardware": "a10g-large" }
      ]
    },
    "summary": {
      "top_pipeline_tags": [{ "tag": "text-generation", "count": 12 }],
      "top_namespaces": [{ "namespace": "meta-llama", "count": 4 }],
      "top_space_sdks": [{ "sdk": "gradio", "count": 21 }]
    }
  }
}`,
  },
  {
    method: 'GET',
    path: '/api/issues/hot',
    description: 'Currently-hot GitHub issues across the AI ecosystem, ranked by comment count. Five fan-out keyword-phrase searches ("large language model", "AI agent", transformer, "machine learning", LLM) filtered to is:issue is:open archived:false with comments>=10 and activity within the last 7 days. Deduped by URL, top 30 returned. Refreshed daily at 12:30 UTC. Companion to /api/trending-repos: that one shows which AI repos are gaining stars; this one shows where the active conversations are.',
    cache: 'Cache for 10 minutes',
    example: `{
  "ok": true,
  "snapshot": {
    "date": "2026-05-04",
    "capturedAt": "2026-05-04T12:30:00Z",
    "total_issues": 30,
    "topics_queried": ["llm", "ai-agents", "large-language-models", "machine-learning", "transformer"],
    "recent_window_days": 7,
    "comments_threshold": 10,
    "issues": [
      {
        "url": "https://github.com/foo/bar/issues/42",
        "repo": "foo/bar",
        "number": 42,
        "title": "...",
        "author": "alice",
        "state": "open",
        "comments": 87,
        "reactions_total": 42,
        "labels": ["bug", "help wanted"],
        "created_at": "2026-04-30T09:00:00Z",
        "updated_at": "2026-05-04T11:15:00Z",
        "matched_topic": "llm"
      }
    ],
    "summary": {
      "by_topic": { "llm": 12, "ai-agents": 6 },
      "top_repos": [{ "repo": "foo/bar", "count": 3 }]
    }
  }
}`,
  },
  {
    method: 'GET',
    path: '/api/openrouter/models',
    description: 'Daily snapshot of OpenRouter\'s normalized cross-provider model catalog. 200+ models across 50+ inference providers (Anthropic, OpenAI, Google, Meta, Mistral, DeepSeek, Together, Fireworks, Groq, etc) with comparable per-token pricing (prompt, completion, image, request), context window, modality (e.g. text+image->text), instruct_type, tokenizer, top provider metadata (max_completion_tokens, is_moderated), and supported_parameters. Snapshot summary surfaces by_namespace, by_modality, cheapest_input/output (excluding free tier), largest_context, and free_tier_count. Pairs with /api/models: curated frontier-lab catalog there, OSS-on-cloud long tail here. Refreshed daily at 14:00 UTC.',
    cache: 'Cache for 10 minutes',
    example: `{
  "ok": true,
  "snapshot": {
    "date": "2026-05-04",
    "capturedAt": "2026-05-04T14:00:00Z",
    "total_models": 240,
    "models": [
      {
        "id": "anthropic/claude-3.5-sonnet",
        "name": "Claude 3.5 Sonnet",
        "context_length": 200000,
        "modality": "text+image->text",
        "instruct_type": "claude",
        "pricing": { "prompt": 0.000003, "completion": 0.000015, "image": 0.0048, "request": 0 },
        "top_provider": { "max_completion_tokens": 8192, "is_moderated": true },
        "supported_parameters": ["temperature", "top_p", "tools"]
      }
    ],
    "summary": {
      "by_namespace": [{ "namespace": "anthropic", "count": 4 }, { "namespace": "openai", "count": 12 }],
      "by_modality": { "text->text": 180, "text+image->text": 35 },
      "cheapest_input": { "id": "...", "usd_per_million": 0.07 },
      "cheapest_output": { "id": "...", "usd_per_million": 0.21 },
      "largest_context": { "id": "...", "tokens": 2000000 },
      "free_tier_count": 8
    }
  }
}`,
  },
  {
    method: 'GET',
    path: '/api/reddit/trending',
    description: 'Currently-hot threads in 7 AI-relevant subreddits (LocalLLaMA, MachineLearning, ClaudeAI, OpenAI, singularity, artificial, AI_Agents). Each subreddit polled via the public Reddit JSON endpoint, stickied and NSFW posts filtered, deduped by post id, top 30 by score. Refreshed daily at 13:00 UTC. Companion to /api/issues/hot: GitHub developer conversation vs Reddit community conversation. Titles pass through TensorFeed prompt-injection sanitization at capture time.',
    cache: 'Cache for 10 minutes',
    example: `{
  "ok": true,
  "snapshot": {
    "date": "2026-05-04",
    "capturedAt": "2026-05-04T13:00:00Z",
    "total_posts": 30,
    "subreddits_queried": ["LocalLLaMA","MachineLearning","ClaudeAI","OpenAI","singularity","artificial","AI_Agents"],
    "posts": [
      {
        "id": "t3_abc123",
        "subreddit": "LocalLLaMA",
        "title": "...",
        "author": "someone",
        "score": 1500,
        "upvote_ratio": 0.94,
        "num_comments": 230,
        "permalink": "https://reddit.com/r/LocalLLaMA/comments/abc123/...",
        "url": "https://huggingface.co/...",
        "created_utc": 1714824000,
        "flair": "New Model",
        "is_self": false,
        "is_video": false
      }
    ],
    "summary": {
      "by_subreddit": { "LocalLLaMA": 11, "MachineLearning": 6 },
      "top_authors": [{ "author": "someone", "count": 2 }]
    }
  }
}`,
  },
  {
    method: 'GET',
    path: '/api/agents/news.json',
    description: 'Alias for /api/news. Agent-friendly URL for news data.',
    cache: 'Cache for 5 minutes',
    example: `{ "ok": true, "articles": [...] }`,
  },
  {
    method: 'GET',
    path: '/api/agents/status.json',
    description: 'Alias for /api/status. Agent-friendly URL for status data.',
    cache: 'Cache for 2 minutes',
    example: `{ "ok": true, "services": [...] }`,
  },
  {
    method: 'GET',
    path: '/api/agents/pricing.json',
    description: 'Alias for /api/models. Agent-friendly URL for pricing data.',
    cache: 'Cache for 1 hour',
    example: `{ "ok": true, "providers": [...] }`,
  },
  {
    method: 'GET',
    path: '/api/history/news',
    description:
      'Daily archive of TensorFeed deduped news articles for one UTC date. Free tier capped at 25 articles per day. Each daily snapshot is captured by every hourly RSS poll, so the value at lookup is the last poll before the day ended (or the most recent poll for today). Full untruncated archive and date ranges live behind the premium /api/premium/history/news/full endpoint.',
    cache: 'Cache for 24 hours',
    example: `// Query: ?date=2026-05-08&limit=10
{
  "ok": true,
  "tier": "free",
  "date": "2026-05-08",
  "captured_at": "2026-05-08T14:00:11Z",
  "articles_count": 187,
  "articles_returned": 10,
  "articles": [{ "title": "...", "url": "...", "source": "..." }]
}`,
  },
  {
    method: 'GET',
    path: '/api/history/news/sources',
    description:
      'Per-source RSS poll reliability rollup for one UTC date. Each entry carries polls (total polls in the UTC day), polls_ok, polls_empty, polls_error, articles_total, reliability_pct, last_status, and last_error. Free, no auth. Sorted by reliability_pct descending. Multi-day series at the premium /api/premium/history/news/source-health endpoint.',
    cache: 'Cache for 1 hour',
    example: `// Query: ?date=2026-05-08
{
  "ok": true,
  "tier": "free",
  "date": "2026-05-08",
  "total_polls": 14,
  "sources_count": 12,
  "sources": [
    { "id": "anthropic", "name": "Anthropic Blog", "polls": 14, "polls_ok": 14, "polls_empty": 0, "polls_error": 0, "articles_total": 18, "reliability_pct": 100, "last_status": "ok" }
  ]
}`,
  },
  {
    method: 'GET',
    path: '/api/history/news/dates',
    description:
      'Ordered list of UTC dates with a daily news snapshot available. Free, no auth. Useful for paging the archive backward from today.',
    cache: 'Cache for 1 hour',
    example: `{ "ok": true, "tier": "free", "count": 3, "dates": ["2026-05-06", "2026-05-07", "2026-05-08"] }`,
  },
  {
    method: 'GET',
    path: '/api/history/news/sources/dates',
    description:
      'Ordered list of UTC dates with a source-health rollup available. Free, no auth.',
    cache: 'Cache for 1 hour',
    example: `{ "ok": true, "tier": "free", "count": 3, "dates": ["2026-05-06", "2026-05-07", "2026-05-08"] }`,
  },
  {
    method: 'GET',
    path: '/api/security/cve/{CVE-id}',
    description:
      'Single CVE Record v5.2 lookup, lazy-fetched from MITRE\'s open CVE Services API and cached 7 days. Path id is canonical CVE-YYYY-NNNNN form (case insensitive on input). License: MITRE CVE Terms of Use, commercial redistribution explicitly permitted; the response includes the standard attribution block.',
    cache: 'Cache for 1 hour',
    example: `// GET /api/security/cve/CVE-2024-3094
{
  "ok": true,
  "cve_id": "CVE-2024-3094",
  "source": "cache",
  "fetched_at": "2026-05-08T19:00:00Z",
  "record": {
    "dataType": "CVE_RECORD",
    "dataVersion": "5.2",
    "cveMetadata": { "cveId": "CVE-2024-3094", "state": "PUBLISHED", "datePublished": "2024-03-29T16:51:12Z" },
    "containers": { "cna": { "title": "xz: malicious code in distributed source" } }
  },
  "attribution": {
    "source": "MITRE CVE List",
    "source_url": "https://www.cve.org",
    "license": "MITRE CVE Terms of Use",
    "redistribution": "commercial-permitted"
  }
}`,
  },
  {
    method: 'GET',
    path: '/api/security/cve/recent',
    description:
      'Ring buffer of CVE IDs added or modified in the cvelistV5 GitHub repo over roughly the last 24 hours. Daily cron walks commit history and dedupes. Pair with /api/security/cve/{id} for the per-record body.',
    cache: 'Cache for 5 minutes',
    example: `// Query: ?limit=10
{
  "ok": true,
  "tier": "free",
  "count": 10,
  "cve_ids": ["CVE-2026-2042", "CVE-2026-2041", "CVE-2026-2040", "..."],
  "last_capture": { "last_run": "2026-05-08T04:30:11Z", "newly_seen": 187, "scanned_commits": 42 }
}`,
  },
  {
    method: 'GET',
    path: '/api/security/cve/by-date/{YYYY-MM-DD}',
    description:
      'CVE IDs added or modified in cvelistV5 commits on one UTC day. Free, no auth. The data moat compounds with each daily run; older dates predate this endpoint.',
    cache: 'Cache for 24 hours',
    example: `// GET /api/security/cve/by-date/2026-05-08
{
  "ok": true,
  "tier": "free",
  "date": "2026-05-08",
  "count": 187,
  "cve_ids": ["CVE-2026-1942", "CVE-2026-1943", "CVE-2026-1944", "..."]
}`,
  },
  {
    method: 'GET',
    path: '/api/security/cve/dates',
    description:
      'Ordered list of UTC dates with CVE-by-date data captured. Free, no auth. Useful for paging the archive backward from today.',
    cache: 'Cache for 1 hour',
    example: `{ "ok": true, "tier": "free", "count": 1, "dates": ["2026-05-08"] }`,
  },
  {
    method: 'GET',
    path: '/api/security/kev',
    description:
      'CISA Known Exploited Vulnerabilities catalog (top 50 most recent). Each entry carries cveID, vendorProject, product, vulnerabilityName, dateAdded, shortDescription, requiredAction, dueDate, knownRansomwareCampaignUse, notes, and CWE list. Refreshed daily at 06:30 UTC. License: US Government public domain.',
    cache: 'Cache for 30 minutes',
    example: `{
  "ok": true,
  "tier": "free",
  "catalog_version": "2026.05.08",
  "date_released": "2026-05-08T17:31:07Z",
  "total_entries": 1590,
  "returned": 50,
  "most_recent": [
    {
      "cveID": "CVE-2026-42208",
      "vendorProject": "BerriAI",
      "product": "LiteLLM",
      "vulnerabilityName": "BerriAI LiteLLM SQL Injection",
      "dateAdded": "2026-05-08",
      "knownRansomwareCampaignUse": "Unknown",
      "cwes": ["CWE-89"]
    }
  ]
}`,
  },
  {
    method: 'GET',
    path: '/api/security/kev/{CVE-id}',
    description:
      'Single KEV entry by CVE ID. Returns 404 if the CVE is not on the KEV catalog (which is the common case; only ~1500 of ~270K CVEs are on KEV). Pair with /api/security/cve/{id} for the underlying CVE Record.',
    cache: 'Cache for 1 hour',
    example: `// GET /api/security/kev/CVE-2026-42208
{
  "ok": true,
  "cve_id": "CVE-2026-42208",
  "entry": {
    "cveID": "CVE-2026-42208",
    "vendorProject": "BerriAI",
    "product": "LiteLLM",
    "dateAdded": "2026-05-08",
    "dueDate": "2026-05-11"
  }
}`,
  },
  {
    method: 'GET',
    path: '/api/security/kev/added/{YYYY-MM-DD}',
    description:
      'KEV entries with dateAdded == one UTC day. Free, no auth. The data moat compounds with each daily run.',
    cache: 'Cache for 24 hours',
    example: `// GET /api/security/kev/added/2026-05-08
{ "ok": true, "tier": "free", "date": "2026-05-08", "count": 3, "entries": [...] }`,
  },
  {
    method: 'GET',
    path: '/api/security/kev/dates',
    description:
      'Ordered list of UTC dates with KEV-added entries captured. Free, no auth.',
    cache: 'Cache for 1 hour',
    example: `{ "ok": true, "tier": "free", "count": 1, "dates": ["2026-05-08"] }`,
  },
  {
    method: 'GET',
    path: '/api/security/epss/{CVE-id}',
    description:
      'EPSS (Exploit Prediction Scoring System) score for one CVE. Returns the daily probability (0 to 1) that the CVE will be exploited in the next 30 days plus a percentile rank within the EPSS corpus. Lazy-fetched from FIRST.org\'s API and cached 24 hours. License: FIRST.org\'s published policy permits free use, commercial redistribution permitted.',
    cache: 'Cache for 1 hour',
    example: `// GET /api/security/epss/CVE-2024-3094
{
  "ok": true,
  "tier": "free",
  "cve_id": "CVE-2024-3094",
  "source": "live",
  "score": { "cve": "CVE-2024-3094", "epss": "0.850580000", "percentile": "0.993590000", "date": "2026-05-08" }
}`,
  },
  {
    method: 'GET',
    path: '/api/security/epss/top',
    description:
      'Top-N highest-EPSS CVEs as of the current daily snapshot. Free, no auth. Premium /api/premium/security/epss/top adds historical date filtering.',
    cache: 'Cache for 30 minutes',
    example: `// Query: ?limit=3
{
  "ok": true,
  "tier": "free",
  "count": 3,
  "top": [
    { "cve": "CVE-2023-23752", "epss": "0.945200000", "percentile": "1.000000000", "date": "2026-05-08" },
    { "cve": "CVE-2017-8917",  "epss": "0.945130000", "percentile": "1.000000000", "date": "2026-05-08" },
    { "cve": "CVE-2018-7600",  "epss": "0.944890000", "percentile": "1.000000000", "date": "2026-05-08" }
  ]
}`,
  },
  {
    method: 'GET',
    path: '/api/climate/power/daily',
    description:
      'NASA POWER global meteorological and solar energy data for one point, daily resolution. 40+ years of history at 0.5-degree spatial resolution, sourced from MERRA2 reanalysis. Range capped at 365 days. License: NASA POWER open access, US Government public domain (17 USC 105).',
    cache: 'Cache for 24 hours',
    example: `// Query: ?latitude=34.0522&longitude=-118.2437&parameters=T2M,PRECTOTCORR&start=20260101&end=20260105
{
  "ok": true,
  "tier": "free",
  "source": "live",
  "query": { "latitude": 34.0522, "longitude": -118.2437, "parameters": ["T2M", "PRECTOTCORR"], "start": "20260101", "end": "20260105", "community": "AG", "temporal": "daily" },
  "data": {
    "type": "Feature",
    "geometry": { "type": "Point", "coordinates": [-118.244, 34.052, 395.0] },
    "properties": { "parameter": { "T2M": { "20260101": 13.57, "20260102": 14.07 }, "PRECTOTCORR": { "20260101": 21.84, "20260102": 5.71 } } },
    "header": { "sources": ["MERRA2"] },
    "parameters": { "T2M": { "units": "C", "longname": "Temperature at 2 Meters" } }
  }
}`,
  },
  {
    method: 'GET',
    path: '/api/climate/power/parameters',
    description:
      'Curated catalog of the most-requested NASA POWER parameter codes with units, longnames, and recommended community (AG=agriculture, RE=renewable energy, SB=sustainable buildings). NASA exposes 100+ parameters; this catalog covers the common cases. Pass any documented code to /api/climate/power/daily even if not in this list.',
    cache: 'Cache for 24 hours',
    example: `{
  "ok": true,
  "tier": "free",
  "count": 16,
  "parameters": [
    { "code": "T2M", "units": "C", "longname": "Temperature at 2 Meters", "community": "AG" },
    { "code": "ALLSKY_SFC_SW_DWN", "units": "kWh/m^2/day", "longname": "All Sky Surface Shortwave Downward Irradiance", "community": "RE" }
  ]
}`,
  },
  {
    method: 'GET',
    path: '/api/health/fda/categories',
    description:
      'Directory of supported openFDA categories with descriptions and per-endpoint TF paths. Free, no auth. License: CC0 1.0 Universal Dedication; the FDA has waived all copyright interests, commercial redistribution permitted with no attribution requirement.',
    cache: 'Cache for 24 hours',
    example: `{
  "ok": true,
  "tier": "free",
  "count": 5,
  "categories": [
    { "category": "drug/events", "tf_endpoint": "/api/health/fda/drug/events", "description": "FAERS adverse event reports..." }
  ]
}`,
  },
  {
    method: 'GET',
    path: '/api/health/fda/{category}',
    description:
      'OpenFDA query proxy. Category is one of: drug/events (FAERS adverse events, ~10M records), drug/labels (structured drug labels), drug/recalls (drug enforcement reports), food/recalls (food enforcement reports), device/events (MAUDE device adverse events). Lucene-style search via ?search=field:value+AND+field:value, plus ?limit=1-100, ?skip=, ?sort=field:asc|desc.',
    cache: 'Cache for 1 hour',
    example: `// GET /api/health/fda/drug/events?search=patient.drug.medicinalproduct:aspirin&limit=5
{
  "ok": true,
  "tier": "free",
  "source": "live",
  "data": {
    "meta": { "last_updated": "2026-04-28", "results": { "skip": 0, "limit": 5, "total": 609465 } },
    "results": [
      { "safetyreportid": "10003304", "primarysourcecountry": "US", "patient": { "drug": [{ "medicinalproduct": "ASPIRIN" }] } }
    ]
  }
}`,
  },
  {
    method: 'GET',
    path: '/api/economy/eia/categories',
    description:
      'Curated catalog of high-demand EIA Open Data routes with descriptions, default frequencies, and example facet filters. Free, no auth. License: US Government public domain.',
    cache: 'Cache for 24 hours',
    example: `{
  "ok": true,
  "tier": "free",
  "count": 6,
  "routes": [
    { "route": "petroleum/pri/spt", "description": "Crude oil spot prices (WTI Cushing, Brent). Daily.", "default_frequency": "daily" },
    { "route": "electricity/retail-sales", "description": "Retail electricity sales by state and sector.", "default_frequency": "monthly" }
  ]
}`,
  },
  {
    method: 'GET',
    path: '/api/economy/eia/series',
    description:
      'EIA Open Data time-series proxy. Curated route allowlist covering petroleum spot prices, retail gasoline, natural gas, electricity retail sales, electricity generation by fuel, and total US energy. License: US Government public domain (17 USC 105). Requires the operator to set the EIA_API_KEY worker secret.',
    cache: 'Cache for 1 hour',
    example: `// GET /api/economy/eia/series?route=petroleum/pri/spt&frequency=daily&length=5
{
  "ok": true,
  "tier": "free",
  "source": "live",
  "data": {
    "response": {
      "frequency": "daily",
      "total": 12345,
      "data": [
        { "period": "2026-05-08", "value": 78.42 },
        { "period": "2026-05-07", "value": 78.19 }
      ]
    }
  }
}`,
  },
  {
    method: 'GET',
    path: '/api/ai-cves/latest',
    description:
      'Most-recent AI-stack CVE batch metadata plus the first 25 papers. Each paper carries cve_ids, affected_products, affected_version_ranges, fixed_versions, exploited_in_wild (stated_yes / stated_no / unstated), severity_label, and source_url. License: CC BY 4.0 (GitHub Security Advisories) with vendor advisories for non-GHSA rows; attribution shipped on every response.',
    cache: 'Cache for 6 hours',
    example: `{
  "batch_id": "20260525-001634",
  "extracted_at": "2026-05-25T07:23:58+00:00",
  "window_start": "2025-01-01",
  "window_end": "2026-01-01",
  "total_papers": 387,
  "ai_flagged_count": 10,
  "papers": [
    {
      "cve_ids": ["CVE-2026-44580"],
      "affected_products": ["Next.js"],
      "fixed_versions": ["v15.5.16", "v16.2.5"],
      "exploited_in_wild": "stated_yes",
      "severity_label": "high",
      "source_url": "https://github.com/advisories/GHSA-gx5p-jg67-6x7h"
    }
  ],
  "source_license": "CC BY 4.0",
  "source_attribution": "GitHub Advisory Database (github.com/advisories) + vendor advisories"
}`,
  },
  {
    method: 'GET',
    path: '/api/ai-cves/feed',
    description:
      'Paginated raw papers from the most-recent AI-stack CVE batch. limit is capped at 50 (the premium /api/premium/ai-cves/ai-stack-cves returns the full AI-stack-filtered + categorized cohort in one call). License: CC BY 4.0.',
    params: '?limit=25&offset=0',
    cache: 'Cache for 6 hours',
    example: `{
  "batch_id": "20260525-001634",
  "total": 387,
  "limit": 25,
  "offset": 0,
  "papers": [ /* same shape as /api/ai-cves/latest */ ],
  "source_license": "CC BY 4.0",
  "source_attribution": "GitHub Advisory Database (github.com/advisories) + vendor advisories"
}`,
  },
  {
    method: 'GET',
    path: '/api/ai-cves/stats',
    description:
      'Aggregate counts across the most-recent AI-stack CVE batch: by_severity (critical, high, medium, low, unstated), by_exploitation (stated_yes, stated_no, unstated), top_vendors (top 10 by frequency, case-folded). License: CC BY 4.0.',
    cache: 'Cache for 6 hours',
    example: `{
  "batch_id": "20260525-001634",
  "total_papers": 387,
  "by_severity": { "critical": 2, "high": 11, "medium": 13, "low": 3, "unstated": 358 },
  "by_exploitation": { "stated_yes": 3, "stated_no": 0, "unstated": 384 },
  "top_vendors": [
    { "vendor": "OpenClaw", "count": 40 },
    { "vendor": "AVideo", "count": 11 }
  ],
  "source_license": "CC BY 4.0",
  "source_attribution": "GitHub Advisory Database (github.com/advisories) + vendor advisories"
}`,
  },
  {
    method: 'GET',
    path: '/api/premium/ai-cves/ai-stack-cves',
    description:
      'AI-stack CVE intelligence (1 credit). Filters the latest batch to papers whose affected_products match the curated AI_STACK_VENDORS list (7 categories: inference-stack, agent-framework, training-stack, vector-db, model-gateway, mcp-tool, other-ai). Each paper carries tf_ai_category + severity_rank, sorted with exploited_in_wild stated_yes first, then severity desc, then source_url asc. Strict-premium-gated; anonymous probes see x402 402 challenge, not 400.',
    cache: 'Cache for 1 hour',
    example: `{
  "batch_id": "20260525-001634",
  "total": 10,
  "papers": [
    {
      "cve_ids": ["CVE-2026-44580"],
      "affected_products": ["Next.js"],
      "fixed_versions": ["v15.5.16", "v16.2.5"],
      "exploited_in_wild": "stated_yes",
      "severity_label": "high",
      "source_url": "https://github.com/advisories/GHSA-gx5p-jg67-6x7h",
      "tf_ai_category": "agent-framework",
      "severity_rank": 3
    }
  ],
  "source_license": "CC BY 4.0",
  "source_attribution": "GitHub Advisory Database (github.com/advisories) + vendor advisories"
}`,
  },
  {
    method: 'GET',
    path: '/api/premium/ai-cves/exploited-in-wild',
    description:
      'Live-threat subset (1 credit). Filters the AI-flagged batch to papers with exploited_in_wild = stated_yes, sorted by severity_rank desc. The "what is actively being weaponized in the AI stack right now" signal. Strict-premium-gated.',
    cache: 'Cache for 1 hour',
    example: `{
  "batch_id": "20260525-001634",
  "total": 3,
  "papers": [ /* same shape, severity_rank attached */ ],
  "source_license": "CC BY 4.0",
  "source_attribution": "GitHub Advisory Database (github.com/advisories) + vendor advisories"
}`,
  },
  {
    method: 'GET',
    path: '/api/premium/ai-cves/cve',
    description:
      'Single-CVE resolve against the persistent index (1 credit). Pass id=CVE-YYYY-NNNNN, get the structured paper with all fields. Param-required; strict-premium-gated so anonymous probes see 402 not 400. Index spans the rolling 90-day batch retention window.',
    params: '?id=CVE-2026-44580',
    cache: 'Cache for 1 hour',
    example: `{
  "cve_id": "CVE-2026-44580",
  "found": true,
  "batch_id": "20260525-001634",
  "paper": {
    "cve_ids": ["CVE-2026-44580"],
    "affected_products": ["Next.js"],
    "fixed_versions": ["v15.5.16", "v16.2.5"],
    "exploited_in_wild": "stated_yes",
    "severity_label": "high",
    "source_url": "https://github.com/advisories/GHSA-gx5p-jg67-6x7h"
  },
  "source_license": "CC BY 4.0",
  "source_attribution": "GitHub Advisory Database (github.com/advisories) + vendor advisories"
}`,
  },
  {
    method: 'GET',
    path: '/api/x402-index/summary',
    description:
      'Ecosystem-level x402 USDC settlement rollup on Base mainnet across the AI agent payments economy. Returns volume_usdc, count, unique_publishers, and change_vs_prior_window for one window (24h | 7d | 30d, default 24h). Forward-only index from 2026-05-28 onward, indexer cron every 5 minutes with a 30-block reorg safety margin (~6 minute worst-case freshness, 10 minute SLA). Source: Base mainnet USDC Transfer events filtered to wallets self-published in publisher /.well-known/x402.json manifests. License: CC BY 4.0 (TensorFeed editorial layer over public on-chain data).',
    params: '?window=24h|7d|30d',
    cache: 'Cache for 60 seconds',
    example: `// Query: ?window=7d
{
  "ok": true,
  "window": "7d",
  "captured_at": "2026-05-27T18:00:00Z",
  "volume_usdc": "412.840000",
  "count": 1873,
  "unique_publishers": 6,
  "change_vs_prior_window": {
    "volume_pct": 18.42,
    "count_pct": 11.07
  }
}`,
  },
  {
    method: 'GET',
    path: '/api/x402-index/publishers',
    description:
      'Canonical list of x402-compliant publishers TensorFeed is currently indexing, auto-discovered from /.well-known/x402.json crawls. Daily manifest refresh at 06:35 UTC. Each entry: domain, pay_to_wallets, first_seen, last_crawled, last_event_at, last_crawl_error. Use this to enumerate which publishers can be queried via the premium per-publisher endpoint at /api/premium/x402-index/publisher/{domain}. License: CC BY 4.0.',
    cache: 'Cache for 5 minutes',
    example: `{
  "ok": true,
  "captured_at": "2026-05-27T18:00:00Z",
  "count": 6,
  "publishers": [
    {
      "domain": "tensorfeed.ai",
      "manifest_url": "https://tensorfeed.ai/.well-known/x402.json",
      "pay_to_wallets": ["0x549c82e6bfc54bdae9a2073744cbc2af5d1fc6d1"],
      "first_seen": "2026-05-28T00:00:00Z",
      "last_crawled": "2026-05-27T06:35:00Z",
      "last_event_at": "2026-05-27T17:58:14Z",
      "last_crawl_error": null
    }
  ]
}`,
  },
  {
    method: 'GET',
    path: '/api/x402-index/leaderboard',
    description:
      'Top publishers by x402 USDC settlement volume across the window (24h | 7d | 30d). Each leader: rank, domain, volume_usdc, count, share_pct of the sliced total. Limit clamped 1 to 25 (default 10). Aggregated from per-day top_publishers within each DailyRollup. License: CC BY 4.0.',
    params: '?window=24h|7d|30d&limit=1-25',
    cache: 'Cache for 60 seconds',
    example: `// Query: ?window=7d&limit=5
{
  "ok": true,
  "window": "7d",
  "captured_at": "2026-05-27T18:00:00Z",
  "leaders": [
    {
      "rank": 1,
      "domain": "tensorfeed.ai",
      "volume_usdc": "287.420000",
      "count": 1342,
      "share_pct": 69.61
    },
    {
      "rank": 2,
      "domain": "terminalfeed.io",
      "volume_usdc": "84.180000",
      "count": 421,
      "share_pct": 20.39
    }
  ]
}`,
  },
  {
    method: 'GET',
    path: '/api/x402-index/recent',
    description:
      'Most recent x402 USDC settlement events newest-first. Each event: tx_hash, block, ts, from_address, to_address, amount_usdc, publisher_domain, base_explorer_url (basescan.org). Limit clamped 1 to 50 (default 20). Backed by a 100-entry KV ring buffer updated on every indexer cron tick (every 5 min). License: CC BY 4.0.',
    params: '?limit=1-50',
    cache: 'Cache for 30 seconds',
    example: `// Query: ?limit=2
{
  "ok": true,
  "captured_at": "2026-05-27T18:00:00Z",
  "count": 2,
  "events": [
    {
      "tx_hash": "0xabc123...",
      "block": 23048517,
      "ts": "2026-05-27T17:58:14Z",
      "from_address": "0xagent...",
      "to_address": "0x549c82e6bfc54bdae9a2073744cbc2af5d1fc6d1",
      "amount_usdc": "0.020000",
      "publisher_domain": "tensorfeed.ai",
      "asset": "USDC",
      "chain": "base",
      "base_explorer_url": "https://basescan.org/tx/0xabc123..."
    }
  ]
}`,
  },
];

const JS_EXAMPLE = `// Fetch latest AI news
const res = await fetch('https://tensorfeed.ai/api/news?limit=5');
const data = await res.json();

data.articles.forEach(article => {
  console.log(article.title, article.source);
});`;

const PYTHON_EXAMPLE = `import requests

# Check AI service status
res = requests.get('https://tensorfeed.ai/api/status')
data = res.json()

for service in data['services']:
    print(f"{service['name']}: {service['status']}")`;

export default function DevelopersPage() {
  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <WebApplicationJsonLd
        name="TensorFeed Developer API Documentation"
        description="Free, no-auth JSON API for AI news, service status, model pricing, and agent data."
        url="https://tensorfeed.ai/developers"
      />

      {/* Hero */}
      <div className="mb-10">
        <div className="flex items-center gap-3 mb-3">
          <div className="p-2 rounded-lg bg-accent-primary/10">
            <Code className="w-7 h-7 text-accent-primary" />
          </div>
          <h1 className="text-3xl sm:text-4xl font-bold text-text-primary">TensorFeed API</h1>
        </div>
        <p className="text-text-secondary text-lg max-w-2xl">
          Free, no-auth JSON API for AI news, status, and model data.
        </p>
      </div>

      {/* AFTA Callout */}
      <Link
        href="/agent-fair-trade"
        className="block mb-10 group"
        aria-label="Learn about the Agent Fair-Trade Agreement"
      >
        <div className="bg-gradient-to-r from-accent-primary/10 via-accent-cyan/10 to-accent-primary/10 border border-accent-primary/30 rounded-xl p-5 sm:p-6 hover:border-accent-primary/60 transition-colors">
          <div className="flex items-start sm:items-center gap-4 flex-col sm:flex-row">
            <div className="p-2.5 rounded-lg bg-accent-primary/15 shrink-0">
              <Handshake className="w-6 h-6 text-accent-primary" />
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 mb-1 flex-wrap">
                <h2 className="text-text-primary font-semibold text-base sm:text-lg">
                  This API is Agent Fair-Trade certified.
                </h2>
                <span className="text-[10px] px-2 py-0.5 rounded-full bg-accent-primary/15 text-accent-primary font-mono uppercase tracking-wide">
                  AFTA
                </span>
              </div>
              <p className="text-text-secondary text-sm">
                Open pricing, code-enforced no-charge on 5xx, breaker, schema fail, or stale data. Ed25519-signed receipts on every paid call. Read the full standard and machine-readable manifest at <code className="font-mono text-xs text-accent-primary">/.well-known/agent-fair-trade.json</code>.
              </p>
            </div>
            <div className="flex items-center gap-1.5 text-accent-primary text-sm font-medium shrink-0 group-hover:gap-2.5 transition-all">
              Read the standard
              <ArrowRight className="w-4 h-4" />
            </div>
          </div>
        </div>
      </Link>

      {/* Rate Limits */}
      <div className="bg-bg-secondary border border-border rounded-xl p-5 mb-10">
        <div className="flex items-center gap-2 mb-3">
          <Zap className="w-5 h-5 text-accent-amber" />
          <h2 className="text-lg font-semibold text-text-primary">Rate Limits</h2>
        </div>
        <p className="text-text-secondary text-sm leading-relaxed">
          No API key needed. CORS enabled. Cache responses appropriately. All endpoints return JSON
          unless otherwise noted. Base URL:{' '}
          <code className="text-accent-primary bg-bg-tertiary px-1.5 py-0.5 rounded text-xs font-mono">
            https://tensorfeed.ai
          </code>
        </p>
      </div>

      {/* Premium Tier Callout */}
      <section className="mb-10">
        <Link
          href="/developers/agent-payments"
          className="block bg-gradient-to-br from-accent-primary/10 via-bg-secondary to-accent-cyan/10 border border-accent-primary/30 rounded-xl p-5 hover:border-accent-primary transition-colors group"
        >
          <div className="flex items-start gap-3">
            <div className="p-2 rounded-lg bg-accent-primary/20 shrink-0">
              <Wallet className="w-5 h-5 text-accent-primary" />
            </div>
            <div className="flex-1">
              <div className="flex items-center gap-2 mb-1">
                <h2 className="text-lg font-semibold text-text-primary group-hover:text-accent-primary transition-colors">
                  Premium Agent API (paid, USDC on Base)
                </h2>
                <ArrowRight className="w-4 h-4 text-accent-primary opacity-0 group-hover:opacity-100 transition-opacity" />
              </div>
              <p className="text-text-secondary text-sm">
                Pay-per-call premium tier for ranked model routing recommendations and
                computed intelligence. USDC on Base, no accounts, no API keys, no traditional
                processors. See the full payment flow, endpoints, and SDK examples.
              </p>
            </div>
          </div>
        </Link>
      </section>

      {/* Quick links: playground + frameworks + openapi */}
      <section className="mb-10 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
        <Link
          href="/playground"
          className="block bg-bg-secondary border border-border rounded-xl p-4 hover:border-accent-primary transition-colors"
        >
          <div className="font-semibold text-text-primary mb-1">API Playground</div>
          <p className="text-sm text-text-secondary">
            Run live queries against every free endpoint in your browser. No login, no key. See the JSON, copy the curl.
          </p>
        </Link>
        <Link
          href="/developers/frameworks"
          className="block bg-bg-secondary border border-border rounded-xl p-4 hover:border-accent-primary transition-colors"
        >
          <div className="font-semibold text-text-primary mb-1">LangChain, LlamaIndex, CrewAI</div>
          <p className="text-sm text-text-secondary">
            Drop-in tools and document loaders for the three major Python agent frameworks. <code className="font-mono text-xs text-accent-primary">pip install tensorfeed[langchain]</code>.
          </p>
        </Link>
        <a
          href="/openapi.yaml"
          className="block bg-bg-secondary border border-border rounded-xl p-4 hover:border-accent-primary transition-colors"
        >
          <div className="font-semibold text-text-primary mb-1 flex items-center gap-1.5">
            OpenAPI 3.1 Spec
            <ExternalLink className="w-3.5 h-3.5 text-text-muted" />
          </div>
          <p className="text-sm text-text-secondary">
            Full machine-readable spec at <code className="font-mono text-xs text-accent-primary">/openapi.yaml</code> and <code className="font-mono text-xs text-accent-primary">/openapi.json</code>. Drop into Swagger UI, Postman, or any code generator.
          </p>
        </a>
        <a
          href="/postman-collection.json"
          className="block bg-bg-secondary border border-border rounded-xl p-4 hover:border-accent-primary transition-colors"
        >
          <div className="font-semibold text-text-primary mb-1 flex items-center gap-1.5">
            Postman Collection
            <ExternalLink className="w-3.5 h-3.5 text-text-muted" />
          </div>
          <p className="text-sm text-text-secondary">
            Pre-built collection (33 requests, 20 folders) at <code className="font-mono text-xs text-accent-primary">/postman-collection.json</code>. Import directly into Postman or any tool that speaks Collection v2.1.
          </p>
        </a>
        <a
          href="https://huggingface.co/datasets/tensorfeed/ai-ecosystem-daily"
          target="_blank"
          rel="noopener noreferrer"
          className="block bg-bg-secondary border border-border rounded-xl p-4 hover:border-accent-primary transition-colors"
        >
          <div className="font-semibold text-text-primary mb-1 flex items-center gap-1.5">
            HF Dataset
            <ExternalLink className="w-3.5 h-3.5 text-text-muted" />
          </div>
          <p className="text-sm text-text-secondary">
            Daily JSONL mirror at <code className="font-mono text-xs text-accent-primary">tensorfeed/ai-ecosystem-daily</code>. 44 feeds, inference-only license. <code className="font-mono text-xs text-accent-primary">load_dataset(repo, &quot;news&quot;)</code>.
          </p>
        </a>
      </section>

      {/* Endpoints */}
      <section className="mb-14">
        <h2 className="text-2xl font-semibold text-text-primary mb-6">Endpoints</h2>
        <div className="space-y-6">
          {ENDPOINTS.map((ep) => (
            <div
              key={ep.path}
              className="bg-bg-secondary border border-border rounded-xl overflow-hidden"
            >
              <div className="px-5 py-4 border-b border-border">
                <div className="flex flex-wrap items-center gap-3 mb-1">
                  <span className="text-xs font-bold text-accent-green bg-accent-green/10 px-2 py-0.5 rounded">
                    {ep.method}
                  </span>
                  <code className="text-sm font-mono text-text-primary">{ep.path}</code>
                  {ep.params && (
                    <code className="text-xs font-mono text-text-muted">{ep.params}</code>
                  )}
                </div>
                <p className="text-text-secondary text-sm mt-1">{ep.description}</p>
                <p className="text-text-muted text-xs mt-1">{ep.cache}</p>
              </div>
              <div className="px-5 py-3 bg-bg-tertiary/50">
                <p className="text-xs text-text-muted mb-1.5">Example response</p>
                <pre className="text-xs font-mono text-text-secondary overflow-x-auto whitespace-pre leading-relaxed">
                  {ep.example}
                </pre>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* For AI Agents */}
      <section className="mb-14">
        <div className="bg-gradient-to-br from-accent-primary/10 via-bg-secondary to-accent-cyan/10 border border-accent-primary/30 rounded-xl p-6">
          <div className="flex items-center gap-2 mb-4">
            <Bot className="w-6 h-6 text-accent-primary" />
            <h2 className="text-xl font-semibold text-text-primary">For AI Agents</h2>
          </div>
          <p className="text-text-secondary leading-relaxed mb-5">
            TensorFeed is built as a primary data source for AI agents. No CAPTCHAs, no bot
            detection, no authentication. Agents are first-class citizens here.
          </p>
          <div className="space-y-3 mb-5">
            <div className="flex items-start gap-3">
              <FileText className="w-4 h-4 text-accent-primary mt-0.5 shrink-0" />
              <div>
                <a href="/llms.txt" className="text-accent-primary hover:underline text-sm font-medium">
                  /llms.txt
                </a>
                <p className="text-text-muted text-xs">Concise site overview for LLM context windows</p>
              </div>
            </div>
            <div className="flex items-start gap-3">
              <FileText className="w-4 h-4 text-accent-primary mt-0.5 shrink-0" />
              <div>
                <a href="/llms-full.txt" className="text-accent-primary hover:underline text-sm font-medium">
                  /llms-full.txt
                </a>
                <p className="text-text-muted text-xs">Full documentation bundle with all page content</p>
              </div>
            </div>
            <div className="flex items-start gap-3">
              <FileText className="w-4 h-4 text-accent-primary mt-0.5 shrink-0" />
              <div>
                <span className="text-text-primary text-sm font-medium">.md page variants</span>
                <p className="text-text-muted text-xs">
                  Append <code className="bg-bg-tertiary px-1 py-0.5 rounded text-xs">.md</code> to
                  any page URL to get a Markdown version (e.g., /about.md, /status.md)
                </p>
              </div>
            </div>
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <a
              href="/llms.txt"
              className="flex items-center gap-2 bg-bg-primary/60 border border-border rounded-lg px-3 py-2.5 hover:border-accent-primary transition-colors group"
            >
              <FileText className="w-4 h-4 text-accent-primary shrink-0" />
              <span className="text-sm text-text-secondary group-hover:text-text-primary transition-colors">llms.txt</span>
            </a>
            <a
              href="/feed.json"
              className="flex items-center gap-2 bg-bg-primary/60 border border-border rounded-lg px-3 py-2.5 hover:border-accent-primary transition-colors group"
            >
              <Code className="w-4 h-4 text-accent-primary shrink-0" />
              <span className="text-sm text-text-secondary group-hover:text-text-primary transition-colors">JSON Feed</span>
            </a>
            <a
              href="/api/meta"
              className="flex items-center gap-2 bg-bg-primary/60 border border-border rounded-lg px-3 py-2.5 hover:border-accent-primary transition-colors group"
            >
              <Zap className="w-4 h-4 text-accent-primary shrink-0" />
              <span className="text-sm text-text-secondary group-hover:text-text-primary transition-colors">API Meta</span>
            </a>
            <a
              href="/feed.xml"
              className="flex items-center gap-2 bg-bg-primary/60 border border-border rounded-lg px-3 py-2.5 hover:border-accent-primary transition-colors group"
            >
              <Globe className="w-4 h-4 text-accent-primary shrink-0" />
              <span className="text-sm text-text-secondary group-hover:text-text-primary transition-colors">RSS Feed</span>
            </a>
          </div>
        </div>
      </section>

      {/* Code Examples */}
      <section className="mb-14">
        <h2 className="text-2xl font-semibold text-text-primary mb-6">Code Examples</h2>
        <div className="space-y-6">
          <div className="bg-bg-secondary border border-border rounded-xl overflow-hidden">
            <div className="px-5 py-3 border-b border-border flex items-center gap-2">
              <span className="text-xs font-bold text-accent-amber bg-accent-amber/10 px-2 py-0.5 rounded">
                JavaScript
              </span>
              <span className="text-text-muted text-xs">fetch</span>
            </div>
            <div className="px-5 py-4 bg-bg-tertiary/50">
              <pre className="text-sm font-mono text-text-secondary overflow-x-auto whitespace-pre leading-relaxed">
                {JS_EXAMPLE}
              </pre>
            </div>
          </div>

          <div className="bg-bg-secondary border border-border rounded-xl overflow-hidden">
            <div className="px-5 py-3 border-b border-border flex items-center gap-2">
              <span className="text-xs font-bold text-accent-cyan bg-accent-cyan/10 px-2 py-0.5 rounded">
                Python
              </span>
              <span className="text-text-muted text-xs">requests</span>
            </div>
            <div className="px-5 py-4 bg-bg-tertiary/50">
              <pre className="text-sm font-mono text-text-secondary overflow-x-auto whitespace-pre leading-relaxed">
                {PYTHON_EXAMPLE}
              </pre>
            </div>
          </div>
        </div>
      </section>

      {/* Footer */}
      <section className="mb-10">
        <div className="bg-bg-secondary border border-border rounded-xl p-6 text-center">
          <p className="text-text-muted text-sm mb-4">
            TensorFeed.ai and TerminalFeed.io share an AFTA federation and a single bearer token.
          </p>
          <div className="flex items-center justify-center gap-4">
            <a
              href="https://tensorfeed.ai"
              className="text-accent-primary hover:underline text-sm"
            >
              TensorFeed.ai
            </a>
            <span className="text-text-muted">|</span>
            <a
              href="https://terminalfeed.io"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1 text-accent-primary hover:underline text-sm"
            >
              TerminalFeed.io
              <ExternalLink className="w-3 h-3" />
            </a>
          </div>
        </div>
      </section>
    </div>
  );
}
