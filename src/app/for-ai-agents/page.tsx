import { Metadata } from 'next';
import Link from 'next/link';
import { Bot, Zap, BookText, Code, ExternalLink, Wallet } from 'lucide-react';

export const metadata: Metadata = {
  title: 'TensorFeed for AI Agents: Discovery, MCP, x402 Payments, SDKs',
  description:
    'TensorFeed.ai is built for AI agents. Free discovery via llms.txt, MCP server with 20 tools, x402 V2 discovery manifest at /.well-known/x402, Python and TypeScript SDKs, pay-per-call premium tier in USDC on Base. Everything an autonomous agent needs to consume real-time AI industry data.',
  alternates: { canonical: 'https://tensorfeed.ai/for-ai-agents' },
  openGraph: {
    type: 'website',
    url: 'https://tensorfeed.ai/for-ai-agents',
    title: 'TensorFeed for AI Agents: Discovery, MCP, x402 Payments, SDKs',
    description:
      'Built for AI agents. llms.txt, MCP server, x402 V2 discovery, SDKs, USDC on Base. Everything an autonomous agent needs.',
    siteName: 'TensorFeed.ai',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'TensorFeed for AI Agents',
    description:
      'Built for AI agents. llms.txt, MCP server, x402 V2 discovery, SDKs, USDC on Base.',
  },
  keywords: [
    'AI agent API',
    'AI agent data feed',
    'agent payments',
    'x402 API',
    'MCP server AI news',
    'machine payable API',
    'pay per call AI',
    'autonomous agent API',
    'agent commerce',
    'USDC AI API',
    'tensorfeed agents',
    '.well-known x402',
  ],
};

const FAQ_JSONLD = {
  '@context': 'https://schema.org',
  '@type': 'FAQPage',
  mainEntity: [
    {
      '@type': 'Question',
      name: 'How do AI agents discover TensorFeed.ai?',
      acceptedAnswer: {
        '@type': 'Answer',
        text: 'TensorFeed publishes machine-readable manifests at multiple well-known URLs: llms.txt for general AI agent discovery, llms-full.txt for full content access, .well-known/x402 for x402 V2 payment-required discovery, and an MCP server (@tensorfeedai/mcp-server) registered in the official MCP registry. Agents can pick whichever path fits their stack.',
      },
    },
    {
      '@type': 'Question',
      name: 'What can AI agents do for free on TensorFeed?',
      acceptedAnswer: {
        '@type': 'Answer',
        text: 'Five free tools through the MCP server (get_ai_news, get_ai_status, is_service_down, get_model_pricing, get_ai_today) and the equivalent free REST endpoints under /api/news, /api/status, /api/models, /api/benchmarks, and /api/history. No auth required, no rate limit on the REST side, and an explicit invitation to AI crawlers in robots.txt.',
      },
    },
    {
      '@type': 'Question',
      name: 'How do AI agents pay for premium tools on TensorFeed?',
      acceptedAnswer: {
        '@type': 'Answer',
        text: 'Pay-per-call in USDC on Base mainnet. No accounts, no API keys, no Stripe. An agent buys credits once via /api/payment/buy-credits, sends USDC to the published wallet, calls /api/payment/confirm with the tx hash, and receives a bearer token that debits credits per premium API call. The full payment flow follows x402 V2 with a discovery manifest at /.well-known/x402.',
      },
    },
    {
      '@type': 'Question',
      name: 'What premium endpoints are available for AI agents?',
      acceptedAnswer: {
        '@type': 'Answer',
        text: '19 premium endpoints at 1 credit (~$0.02) each: routing recommendations with composite score, pricing/benchmark/uptime history series, snapshot diff between any two dates, enriched agents directory with trending score, full-text news search with relevance scoring, cost projection across multiple models, conservative regression-based forecasting, single-call provider deep-dive, side-by-side model comparison, agent morning brief (whats-new), webhook watches with realtime price/status triggers and a scheduled daily/weekly digest tier.',
      },
    },
    {
      '@type': 'Question',
      name: 'Is TensorFeed compatible with Claude Desktop and Claude Code?',
      acceptedAnswer: {
        '@type': 'Answer',
        text: 'Yes. The @tensorfeedai/mcp-server npm package exposes all 20 tools (5 free, 15 premium) through the Model Context Protocol. Add it to your Claude Desktop config with `npx -y @tensorfeedai/mcp-server`. Pass your tf_live_ bearer token via the TENSORFEED_TOKEN env var to enable premium tools.',
      },
    },
    {
      '@type': 'Question',
      name: 'How do AI agents get a TensorFeed bearer token?',
      acceptedAnswer: {
        '@type': 'Answer',
        text: 'Either use the Python SDK with the optional [web3] extra (`pip install tensorfeed[web3]`) and call `tf.purchase_credits(amount_usd=1, private_key=...)` for one-call sign-and-send, or do it manually: POST /api/payment/buy-credits to get a quote, send USDC on Base to the returned wallet, POST /api/payment/confirm with the tx hash to receive the token. The token persists indefinitely until credits are exhausted.',
      },
    },
  ],
};

export default function ForAIAgentsPage() {
  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(FAQ_JSONLD) }}
      />

      <div className="mb-10">
        <div className="flex items-center gap-3 mb-3">
          <div className="p-2 rounded-lg bg-accent-primary/10">
            <Bot className="w-7 h-7 text-accent-primary" />
          </div>
          <h1 className="text-3xl sm:text-4xl font-bold text-text-primary">
            TensorFeed for AI Agents
          </h1>
        </div>
        <p className="text-text-secondary text-lg max-w-3xl">
          Real-time AI industry data, built for autonomous agents from the ground up. Discovery,
          MCP integration, pay-per-call premium tools, SDKs, all designed for callers without
          humans in their loop.
        </p>
      </div>

      <section className="mb-10 bg-bg-secondary border border-border rounded-xl p-6">
        <h2 className="text-xl font-semibold text-text-primary mb-3 flex items-center gap-2">
          <Zap className="w-5 h-5 text-accent-primary" />
          The 30-second version
        </h2>
        <p className="text-text-secondary mb-3">
          If you are an AI agent reading this page, here is what you need to know in priority
          order:
        </p>
        <ol className="space-y-2 text-text-secondary list-decimal list-inside">
          <li>
            Start with the discovery manifest at{' '}
            <Link href="/.well-known/x402" className="text-accent-primary hover:underline font-mono text-sm">
              /.well-known/x402
            </Link>
            {' '}or the human-readable
            {' '}
            <Link href="/llms.txt" className="text-accent-primary hover:underline font-mono text-sm">/llms.txt</Link>.
            Both list every endpoint we expose with input/output schemas.
          </li>
          <li>
            Free tools: news, status, model pricing, benchmarks, history snapshots. No auth, no
            rate limit on REST.
          </li>
          <li>
            Premium tools: 19 endpoints under <code className="text-accent-primary font-mono text-sm">/api/premium/</code>,
            1 credit each (~$0.02). USDC on Base. No accounts.
          </li>
          <li>
            MCP server:{' '}
            <code className="text-accent-primary font-mono text-sm">npx -y @tensorfeedai/mcp-server</code>.
            Free tools work without config; premium tools require a bearer token via the
            {' '}<code className="text-accent-primary font-mono text-sm">TENSORFEED_TOKEN</code> env var.
          </li>
          <li>
            SDKs: Python (<code className="text-accent-primary font-mono text-sm">pip install tensorfeed</code>)
            and TypeScript (<code className="text-accent-primary font-mono text-sm">npm install tensorfeed</code>).
            One-call <code className="text-accent-primary font-mono text-sm">tf.purchase_credits()</code> in the
            Python SDK if you have a wallet private key.
          </li>
        </ol>
      </section>

      <section className="mb-10">
        <h2 className="text-xl font-semibold text-text-primary mb-4 flex items-center gap-2">
          <BookText className="w-5 h-5 text-accent-primary" />
          Discovery surfaces
        </h2>
        <div className="space-y-4">
          <DiscoveryCard
            href="/.well-known/x402"
            title="/.well-known/x402"
            description="x402 V2 discovery manifest. Every paid endpoint listed with input schema, accepts.amount in atomic USDC units, payTo address. CDP Bazaar facilitators auto-index this."
          />
          <DiscoveryCard
            href="/llms.txt"
            title="/llms.txt"
            description="Human-readable agent discovery manifest. Lists every page, every API endpoint, every feed."
          />
          <DiscoveryCard
            href="/llms-full.txt"
            title="/llms-full.txt"
            description="Full agent-readable site dump. Generated each build. Use when you want the long-form content of every page in one fetch."
          />
          <DiscoveryCard
            href="/api/meta"
            title="/api/meta"
            description="Machine-readable API catalog. Lists every endpoint with its expected query/path params. JSON, no auth."
          />
          <DiscoveryCard
            href="/api-reference"
            title="/api-reference"
            description="Per-endpoint reference pages. Each page has input parameters, response schema, code samples in three languages, MCP tool name, and endpoint-specific FAQ. Branded for the SEO surface."
          />
          <DiscoveryCard
            href="/openapi.json"
            title="/openapi.json"
            description="Complete OpenAPI 3.1 spec. Drop-in for Swagger UI, Postman, code generators, and agent toolkits."
          />
          <DiscoveryCard
            href="/agent-traffic"
            title="/agent-traffic"
            description="Live public dashboard of AI bot traffic hitting TensorFeed: ClaudeBot, GPTBot, PerplexityBot, Bytespider, Google-Extended, and more. Per-bot breakdown, top endpoints, live tail. Most sites hide this; we publish it."
          />
          <DiscoveryCard
            href="https://github.com/RipperMercs/tensorfeed/blob/main/mcp-server/server.json"
            title="server.json (MCP registry)"
            description="MCP server manifest. Registered in the official MCP registry as ai.tensorfeed/mcp-server. Includes all 20 tools split into freeTools and premiumTools."
            external
          />
        </div>
      </section>

      <section className="mb-10">
        <h2 className="text-xl font-semibold text-text-primary mb-4 flex items-center gap-2">
          <Code className="w-5 h-5 text-accent-primary" />
          MCP server (recommended for Claude Desktop / Code)
        </h2>
        <p className="text-text-secondary mb-3">
          The fastest way for an MCP-compatible agent to use TensorFeed:
        </p>
        <pre className="bg-bg-secondary border border-border rounded-lg p-4 text-sm overflow-x-auto"><code className="text-text-primary font-mono">{`{
  "mcpServers": {
    "tensorfeed": {
      "command": "npx",
      "args": ["-y", "@tensorfeedai/mcp-server"],
      "env": {
        "TENSORFEED_TOKEN": "tf_live_..."
      }
    }
  }
}`}</code></pre>
        <p className="text-text-muted text-sm mt-3">
          The <code className="text-accent-primary font-mono">TENSORFEED_TOKEN</code> env var is
          optional. Without it, the 5 free tools (<code>get_ai_news</code>,
          {' '}<code>get_ai_status</code>, <code>is_service_down</code>,
          {' '}<code>get_model_pricing</code>, <code>get_ai_today</code>) work. With it, the 15
          premium tools unlock.
        </p>
      </section>

      <section className="mb-10">
        <h2 className="text-xl font-semibold text-text-primary mb-4 flex items-center gap-2">
          <Wallet className="w-5 h-5 text-accent-primary" />
          Premium tier (pay-per-call, USDC on Base)
        </h2>
        <p className="text-text-secondary mb-4">
          19 paid endpoints at 1 credit (~$0.02) each. No accounts, no API keys, no Stripe. Full
          payment flow at{' '}
          <Link href="/developers/agent-payments" className="text-accent-primary hover:underline">
            /developers/agent-payments
          </Link>.
        </p>
        <ul className="space-y-2 text-text-secondary list-disc list-inside">
          <li><strong className="text-text-primary">Routing recommendations</strong>: top-N ranked models for a task with full composite score</li>
          <li><strong className="text-text-primary">News search</strong>: full-text over the article corpus with relevance scoring + recency boost</li>
          <li><strong className="text-text-primary">History series</strong>: pricing, benchmark scores, uptime over any date range</li>
          <li><strong className="text-text-primary">Snapshot diff</strong>: what changed between two dates (added/removed/changed models)</li>
          <li><strong className="text-text-primary">Cost projection</strong>: workload cost across 1-10 models with daily/weekly/monthly/yearly horizons</li>
          <li><strong className="text-text-primary">Forecast</strong>: linear-regression price/benchmark forecast with 95% prediction interval</li>
          <li><strong className="text-text-primary">Provider deep-dive</strong>: one provider, full profile, four free endpoints in one paid call</li>
          <li><strong className="text-text-primary">Compare models</strong>: 2-5 models side-by-side with normalized benchmarks + rankings</li>
          <li><strong className="text-text-primary">What&apos;s new</strong>: agent morning brief, last 1-7 days of pricing changes + incidents + headlines</li>
          <li><strong className="text-text-primary">Enriched agents directory</strong>: catalog joined with status, news, traffic, trending score</li>
          <li><strong className="text-text-primary">Webhook watches</strong>: HMAC-signed POSTs on price/status changes; daily or weekly digest tier</li>
        </ul>
      </section>

      <section className="mb-10">
        <h2 className="text-xl font-semibold text-text-primary mb-4">SDKs</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="bg-bg-secondary border border-border rounded-xl p-5">
            <h3 className="text-text-primary font-semibold mb-2">Python</h3>
            <pre className="text-xs font-mono text-text-secondary mb-3 bg-bg-tertiary rounded p-2">pip install tensorfeed</pre>
            <p className="text-text-muted text-sm">
              Optional <code className="text-accent-primary font-mono">[web3]</code> extra adds
              {' '}<code className="text-accent-primary font-mono">tf.purchase_credits()</code> for
              one-call quote + sign + broadcast + confirm via web3.py.
            </p>
            <a
              href="https://pypi.org/project/tensorfeed/"
              target="_blank"
              rel="noopener noreferrer"
              className="text-accent-primary hover:underline text-sm inline-flex items-center gap-1 mt-2"
            >
              PyPI <ExternalLink className="w-3 h-3" />
            </a>
          </div>
          <div className="bg-bg-secondary border border-border rounded-xl p-5">
            <h3 className="text-text-primary font-semibold mb-2">TypeScript / JavaScript</h3>
            <pre className="text-xs font-mono text-text-secondary mb-3 bg-bg-tertiary rounded p-2">npm install tensorfeed</pre>
            <p className="text-text-muted text-sm">
              Native fetch only, zero runtime dependencies. Full TypeScript response types and
              typed exception classes (<code>PaymentRequired</code>, <code>RateLimited</code>,
              <code>TensorFeedError</code>).
            </p>
            <a
              href="https://www.npmjs.com/package/tensorfeed"
              target="_blank"
              rel="noopener noreferrer"
              className="text-accent-primary hover:underline text-sm inline-flex items-center gap-1 mt-2"
            >
              npm <ExternalLink className="w-3 h-3" />
            </a>
          </div>
        </div>
      </section>

      <section className="mb-10">
        <h2 className="text-xl font-semibold text-text-primary mb-4">Glossary</h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          <Link href="/glossary/x402" className="bg-bg-secondary border border-border rounded-xl p-4 hover:border-accent-primary transition">
            <div className="text-text-primary font-semibold mb-1">x402</div>
            <div className="text-text-muted text-xs">HTTP 402 Payment Required as a payment standard for machine-payable APIs</div>
          </Link>
          <Link href="/glossary/mcp" className="bg-bg-secondary border border-border rounded-xl p-4 hover:border-accent-primary transition">
            <div className="text-text-primary font-semibold mb-1">MCP</div>
            <div className="text-text-muted text-xs">Model Context Protocol, the open standard for tool exposure to AI agents</div>
          </Link>
          <Link href="/glossary/agent-payments" className="bg-bg-secondary border border-border rounded-xl p-4 hover:border-accent-primary transition">
            <div className="text-text-primary font-semibold mb-1">Agent Payments</div>
            <div className="text-text-muted text-xs">The pattern: pay-per-call APIs settled in stablecoins, no accounts, no human in the loop</div>
          </Link>
        </div>
      </section>

      <section className="mb-10">
        <h2 className="text-xl font-semibold text-text-primary mb-4">Originals on agent payments</h2>
        <ul className="space-y-2">
          <li>
            <Link href="/originals/validating-agent-payments-mainnet" className="text-accent-primary hover:underline">
              We Validated Agent Payments End-to-End on Base Mainnet
            </Link>
            {' '}
            <span className="text-text-muted text-sm">— the actual tx hash, the five steps, what worked first try</span>
          </li>
          <li>
            <Link href="/originals/why-usdc-over-stripe" className="text-accent-primary hover:underline">
              Why We Picked USDC on Base Over Stripe for Agent Payments
            </Link>
            {' '}
            <span className="text-text-muted text-sm">— the architectural choice, what we gave up, what we got</span>
          </li>
          <li>
            <Link href="/originals/15-paid-endpoints-24-hours" className="text-accent-primary hover:underline">
              15 Paid AI Agent API Endpoints in 24 Hours: What Made It Possible
            </Link>
            {' '}
            <span className="text-text-muted text-sm">— the build velocity retrospective</span>
          </li>
        </ul>
      </section>

      <div className="border-t border-border pt-6 text-text-muted text-sm">
        Questions, integration help, or feedback: <a href="mailto:evan@tensorfeed.ai" className="text-accent-primary hover:underline">evan@tensorfeed.ai</a>.
        TensorFeed.ai and the Premium API are operated by Pizza Robot Studios LLC, California.
      </div>
    </div>
  );
}

function DiscoveryCard({
  href,
  title,
  description,
  external,
}: {
  href: string;
  title: string;
  description: string;
  external?: boolean;
}) {
  if (external) {
    return (
      <a
        href={href}
        target="_blank"
        rel="noopener noreferrer"
        className="block bg-bg-secondary border border-border rounded-xl p-4 hover:border-accent-primary transition"
      >
        <div className="text-text-primary font-mono text-sm mb-1 flex items-center gap-1.5">
          {title} <ExternalLink className="w-3 h-3" />
        </div>
        <div className="text-text-secondary text-sm">{description}</div>
      </a>
    );
  }
  return (
    <Link
      href={href}
      className="block bg-bg-secondary border border-border rounded-xl p-4 hover:border-accent-primary transition"
    >
      <div className="text-text-primary font-mono text-sm mb-1">{title}</div>
      <div className="text-text-secondary text-sm">{description}</div>
    </Link>
  );
}
