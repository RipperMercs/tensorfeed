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
    description: 'Aggregated GPU rental pricing across cloud GPU marketplaces (Vast.ai + RunPod when key configured). Cheapest on-demand and spot price per canonical GPU class (H200, H100, A100, RTX 4090, MI300X, etc), normalized from heterogeneous provider naming. Refreshed every 4 hours. Daily snapshot powers the premium /api/premium/gpu/pricing/series endpoint.',
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
    description: 'Top 30 most-downloaded models and top 30 most-downloaded datasets on Hugging Face. Captured daily at 12:00 UTC against the public HF API (no auth). Each model entry includes id, downloads, likes, pipeline_tag, tags, lastModified, private, and gated. Once we have multiple days of snapshots, day-over-day download deltas become a real "trending" signal. Pairs with the existing TensorFeed HF dataset (tensorfeed/ai-ecosystem-daily) which we publish back into the HF community.',
    cache: 'Cache for 10 minutes',
    example: `{
  "ok": true,
  "snapshot": {
    "date": "2026-05-04",
    "capturedAt": "2026-05-04T12:00:00Z",
    "models": {
      "sort": "downloads",
      "count": 30,
      "items": [
        { "id": "sentence-transformers/all-MiniLM-L6-v2",
          "downloads": 12000000, "likes": 1800,
          "pipeline_tag": "sentence-similarity",
          "tags": ["sentence-transformers"], "lastModified": "..." }
      ]
    },
    "datasets": { "sort": "downloads", "count": 30, "items": [...] },
    "summary": {
      "top_pipeline_tags": [{ "tag": "text-generation", "count": 12 }],
      "top_namespaces": [{ "namespace": "meta-llama", "count": 4 }]
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
                <div className="flex items-center gap-3 mb-1">
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
          <p className="text-text-primary font-semibold mb-2">
            Built by Ripper
          </p>
          <p className="text-text-muted text-sm mb-4">
            The team behind TensorFeed.ai and TerminalFeed.io.
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
