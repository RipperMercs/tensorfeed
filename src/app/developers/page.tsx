import { Metadata } from 'next';
import { Code, Zap, Bot, FileText, Globe, ExternalLink } from 'lucide-react';
import { WebApplicationJsonLd } from '@/components/seo/JsonLd';

export const metadata: Metadata = {
  title: 'Developer Docs & API | TensorFeed.ai',
  description:
    'Free, no-auth JSON API for AI news, service status, model pricing, and agent data. CORS enabled, no API key needed. Documentation and code examples for JavaScript and Python.',
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
            Built by Pizza Robot Studios
          </p>
          <p className="text-text-muted text-sm mb-4">
            The team behind TensorFeed.ai, TerminalFeed.io, and VR.org.
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
            <span className="text-text-muted">|</span>
            <a
              href="https://vr.org"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1 text-accent-primary hover:underline text-sm"
            >
              VR.org
              <ExternalLink className="w-3 h-3" />
            </a>
          </div>
        </div>
      </section>
    </div>
  );
}
