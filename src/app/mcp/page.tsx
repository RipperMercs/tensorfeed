import { Metadata } from 'next';
import Link from 'next/link';
import {
  Plug,
  Zap,
  Server,
  Boxes,
  Wrench,
  ArrowRight,
  ExternalLink,
  ShieldCheck,
} from 'lucide-react';
import { FAQPageJsonLd, BreadcrumbListJsonLd } from '@/components/seo/JsonLd';
import RegistrySnapshot from './RegistrySnapshot';

export const metadata: Metadata = {
  title: 'MCP: The Model Context Protocol Hub for AI Agents',
  description:
    'MCP is the open standard for connecting AI agents to tools, data, and APIs. Anthropic published it; OpenAI, Google, Cursor, Cline, and 7,985 third-party servers speak it as of May 2026. Live registry snapshot, the 50-line server pattern, integration recipe, curated server catalog, and the latest MCP news in one place. TensorFeed ships an MCP server.',
  alternates: { canonical: 'https://tensorfeed.ai/mcp' },
  openGraph: {
    type: 'website',
    url: 'https://tensorfeed.ai/mcp',
    title: 'MCP: The Model Context Protocol Hub for AI Agents',
    description:
      'Open standard for connecting agents to tools and APIs. Live registry snapshot, the 50-line pattern, integration recipe, and the latest news.',
    siteName: 'TensorFeed.ai',
    images: [{ url: '/tensorfeed-logo.png', width: 1024, height: 1024 }],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'MCP: The Model Context Protocol Hub',
    description:
      'Open standard connecting AI agents to tools, data, APIs. Live registry, 50-line pattern, integration recipe.',
  },
  keywords: [
    'MCP',
    'Model Context Protocol',
    'MCP server',
    'MCP client',
    'AI agent tools',
    'agent context',
    'agent integration',
    'Claude MCP',
    'OpenAI MCP',
    'Cursor MCP',
    'Cline MCP',
    'MCP registry',
    'MCP servers list',
    'tensorfeed MCP',
    'MCP standard',
  ],
};

const FAQS = [
  {
    question: 'What is MCP (Model Context Protocol)?',
    answer:
      'MCP is an open protocol introduced by Anthropic in late 2024 for connecting AI agents to external tools, data sources, and APIs. It defines a JSON-RPC interface (over stdio or SSE) where an agent client speaks to one or more servers, each exposing a structured set of tools (function calls), resources (read-only data), and prompts (templated requests). The same server works in any compatible client: Claude Desktop, Claude Code, Cursor, Cline, Continue, OpenAI Agents SDK, Google Gemini, and more.',
  },
  {
    question: 'How widely is MCP adopted?',
    answer:
      'As of May 2026, the official registry at registry.modelcontextprotocol.io has 7,985 servers and is adding roughly 270 per day. The Microsoft Build 2025 announcement and broad first-party support across Anthropic, OpenAI, Google, Cursor, Cline, GitHub Copilot, and Microsoft 365 Copilot turned MCP into the default integration layer of the agent stack. Enterprise governance vendors (Palo Alto Portkey acquisition, Datadog, Sentry) entered the layer in early 2026.',
  },
  {
    question: 'What does an MCP server actually do?',
    answer:
      'An MCP server exposes three primitives. Tools: function-call-style endpoints the agent can invoke (e.g., search_news, get_gpu_prices). Resources: read-only artifacts the agent can pull (e.g., a file, a database row, an API response). Prompts: pre-templated request shapes the user can pick from a menu. The server runs as a child process the client launches, communicating over stdio (local) or SSE (remote). The transport is JSON-RPC 2.0 with a small set of method names defined by the spec.',
  },
  {
    question: 'How long does it take to ship an MCP server?',
    answer:
      'A working MCP server is roughly a 50-line file. Pick a transport (stdio for local, SSE for remote), declare your tools and their JSON schemas, implement the handler functions, register the server. The TensorFeed reference at github.com/RipperMercs/tensorfeed-mcp wraps 14 paid HTTP endpoints in tools that any MCP client can invoke. The agent-acquisition leverage of having one is far higher than the engineering cost; most teams overthink the work.',
  },
  {
    question: 'How do I add an MCP server to my client?',
    answer:
      'For Claude Desktop or Claude Code, edit the mcpServers section of your client config (Claude Desktop: claude_desktop_config.json; Claude Code: settings.json) to add the server name and launch command (typically npx @org/server-name). Cursor and Cline have GUI installers that read from the same registry. The official registry at registry.modelcontextprotocol.io has copy-paste install snippets for every published server.',
  },
  {
    question: 'Why should every paid API ship an MCP server?',
    answer:
      'Agent buyers select tools through MCP. Your paid API is invisible to a Claude Desktop user, a Cline user, or a Cursor user unless you have an MCP server on the registry. The agent decides what to call based on what is registered, not based on the existence of your HTTP endpoint. Shipping an MCP server is the agent-acquisition equivalent of being on Google in 2002 vs. having a website nobody can find. The cost is one afternoon. The reach is every client in the ecosystem.',
  },
  {
    question: 'What is the relationship between MCP and x402?',
    answer:
      'They compose. MCP is how agents discover and call tools. x402 is how agents pay for them when the tool is gated. The TensorFeed pattern: the @tensorfeed/mcp-server data MCP wraps the x402-payable HTTP API (tensorfeed.ai/api/premium). Agent calls the MCP tool. Tool consumes a bearer token paid for via USDC on Base over x402. Same loop, different layers. MCP solves discovery and shape; x402 solves settlement. A second TF package, @tensorfeed/x402-base-mcp, closes the trust loop: a read-only Base mainnet reader that lets any agent independently verify an x402 payment receipt on-chain without holding private keys.',
  },
];

const BREADCRUMBS = [
  { name: 'Home', url: 'https://tensorfeed.ai' },
  { name: 'MCP', url: 'https://tensorfeed.ai/mcp' },
];

const RECENT_ARTICLES = [
  {
    slug: 'mcp-97-million-installs',
    title: 'MCP Just Hit 97 Million Installs. The Agent Era Is Here.',
    blurb:
      "Anthropic's Model Context Protocol went from experimental to foundational infrastructure. Every major AI provider now ships MCP support.",
    date: 'Mar 23, 2026',
  },
  {
    slug: 'palo-alto-portkey-mcp-gateway',
    title: 'Palo Alto Just Bought the MCP Gateway. Enterprise Security Has Entered the Agent Stack.',
    blurb:
      "Palo Alto Networks acquired Portkey, plugging an AI gateway and an MCP gateway processing trillions of tokens per month into Prisma AIRS.",
    date: 'May 1, 2026',
  },
  {
    slug: 'mcp-server-fifty-line-file',
    title: 'An MCP Server Is a 50-Line File. Why Every Paid API Should Ship One.',
    blurb:
      "The actual code, what it costs to ship, and why most teams overthink the work. Stop writing the planning doc; write the file.",
    date: 'Apr 27, 2026',
  },
];

const ADOPTERS = [
  {
    name: 'Anthropic',
    note: 'Origin. Claude Desktop, Claude Code, and the Anthropic SDK speak MCP natively.',
  },
  {
    name: 'OpenAI',
    note: 'Responses API and the Agents SDK ship MCP support across GPT-5.5 and beyond.',
  },
  {
    name: 'Google',
    note: 'Gemini and the Vertex AI agent runtime added MCP in early 2026.',
  },
  {
    name: 'Microsoft / GitHub',
    note: 'Microsoft 365 Copilot, GitHub Copilot, and VS Code agent mode all use MCP for tool integration.',
  },
  {
    name: 'Cursor / Cline / Continue',
    note: 'IDE-native agent clients with built-in MCP server browsers.',
  },
  {
    name: 'Palo Alto Portkey',
    note: 'Enterprise MCP gateway processing trillions of tokens per month, acquired by Palo Alto Networks.',
  },
];

export default function MCPHubPage() {
  return (
    <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <FAQPageJsonLd faqs={FAQS} />
      <BreadcrumbListJsonLd items={BREADCRUMBS} />

      {/* Hero */}
      <header className="mb-10">
        <div className="flex items-center gap-3 mb-3">
          <div className="p-2 rounded-lg bg-accent-primary/10">
            <Plug className="w-7 h-7 text-accent-primary" />
          </div>
          <div className="flex items-baseline gap-3">
            <h1 className="text-3xl sm:text-4xl font-bold text-text-primary">MCP</h1>
            <span className="text-sm font-mono uppercase tracking-wider text-text-muted">
              the model context protocol
            </span>
          </div>
        </div>
        <p className="text-text-secondary text-lg max-w-3xl leading-relaxed">
          MCP is the open standard for connecting AI agents to external tools, data sources, and
          APIs. Anthropic published it; OpenAI, Google, Microsoft, and the broader agent ecosystem
          adopted it. As of May 2026, the official registry has nearly 8,000 servers and is adding
          hundreds per day. This page is the canonical hub. What MCP is, how the registry is
          growing, the 50-line pattern for shipping a server, and the latest news in one place.
        </p>

        <div className="mt-5 flex flex-wrap items-center gap-2 text-sm">
          <a
            href="https://modelcontextprotocol.io"
            target="_blank"
            rel="noopener noreferrer"
            className="px-3 py-1.5 rounded bg-bg-tertiary text-accent-primary hover:underline inline-flex items-center gap-1"
          >
            modelcontextprotocol.io <ExternalLink className="w-3 h-3" />
          </a>
          <a
            href="https://registry.modelcontextprotocol.io"
            target="_blank"
            rel="noopener noreferrer"
            className="px-3 py-1.5 rounded bg-bg-tertiary text-accent-primary hover:underline inline-flex items-center gap-1"
          >
            official registry <ExternalLink className="w-3 h-3" />
          </a>
          <Link
            href="/mcp-servers"
            className="px-3 py-1.5 rounded bg-bg-tertiary text-accent-primary hover:underline"
          >
            curated catalog
          </Link>
          <a
            href="https://tensorfeed.ai/api/mcp/registry/snapshot"
            target="_blank"
            rel="noopener noreferrer"
            className="px-3 py-1.5 rounded bg-bg-tertiary text-accent-primary hover:underline font-mono"
          >
            /api/mcp/registry/snapshot
          </a>
        </div>
      </header>

      {/* TF ships an MCP server CTA */}
      <section className="mb-12 bg-gradient-to-br from-accent-primary/10 to-accent-primary/5 border border-accent-primary/20 rounded-xl p-6">
        <div className="flex items-start gap-4">
          <div className="p-2 rounded-lg bg-accent-primary/20 shrink-0">
            <Server className="w-6 h-6 text-accent-primary" />
          </div>
          <div className="flex-1">
            <h2 className="text-xl font-semibold text-text-primary mb-2">
              TensorFeed ships an MCP server
            </h2>
            <p className="text-text-secondary leading-relaxed mb-4">
              <code className="font-mono text-sm bg-bg-tertiary px-1.5 py-0.5 rounded">
                tensorfeed-mcp
              </code>{' '}
              exposes 14 paid TensorFeed tools (live AI status, model pricing, GPU pricing, news
              feeds, routing, more) to any MCP client: Claude Desktop, Claude Code, Cursor, Cline,
              Continue. Reference example of how an MCP server can wrap an x402-payable HTTP API.
              Install in one command.
            </p>
            <div className="bg-bg-tertiary border border-border rounded p-3 mb-4 font-mono text-xs text-text-secondary overflow-x-auto whitespace-pre">
{`// claude_desktop_config.json
{
  "mcpServers": {
    "tensorfeed": {
      "command": "npx",
      "args": ["tensorfeed-mcp"]
    }
  }
}`}
            </div>
            <div className="flex flex-wrap items-center gap-3 text-sm">
              <a
                href="https://github.com/RipperMercs/tensorfeed-mcp"
                target="_blank"
                rel="noopener noreferrer"
                className="px-3 py-1.5 rounded bg-accent-primary text-white hover:bg-accent-primary/90 inline-flex items-center gap-1 font-medium"
              >
                tensorfeed-mcp on GitHub <ExternalLink className="w-3.5 h-3.5" />
              </a>
              <Link
                href="/developers/agent-payments"
                className="px-3 py-1.5 rounded border border-border text-text-secondary hover:border-accent-primary/40 hover:text-accent-primary"
              >
                bearer-token + payments docs
              </Link>
              <Link
                href="/x402"
                className="px-3 py-1.5 rounded border border-border text-text-secondary hover:border-accent-primary/40 hover:text-accent-primary"
              >
                pair with x402
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* Live registry snapshot */}
      <section className="mb-12">
        <h2 className="text-2xl font-semibold text-text-primary mb-4">
          Live: the official MCP registry
        </h2>
        <p className="text-text-secondary leading-relaxed mb-5 max-w-3xl">
          TensorFeed snapshots the official registry at{' '}
          <a
            href="https://registry.modelcontextprotocol.io"
            target="_blank"
            rel="noopener noreferrer"
            className="text-accent-primary hover:underline"
          >
            registry.modelcontextprotocol.io
          </a>{' '}
          daily and exposes the rolled-up summary at the public endpoint below. Total servers,
          daily growth, top namespaces. Pull the JSON for your own agent dashboards.
        </p>
        <RegistrySnapshot />
      </section>

      {/* What MCP does */}
      <section className="mb-12">
        <h2 className="text-2xl font-semibold text-text-primary mb-4">
          What an MCP server actually does
        </h2>
        <p className="text-text-secondary leading-relaxed mb-5 max-w-3xl">
          Three primitives, JSON-RPC over stdio (local) or SSE (remote). That is the whole protocol.
        </p>
        <div className="grid gap-4 sm:grid-cols-3">
          {[
            {
              icon: Wrench,
              title: 'Tools',
              body: 'Function-call-style endpoints the agent can invoke. Each declares a JSON schema for arguments and return type. Agents pick from this menu when deciding what to call.',
            },
            {
              icon: Boxes,
              title: 'Resources',
              body: 'Read-only artifacts the agent can pull. Files, database rows, cached API responses. Surfaced as URIs the agent can dereference.',
            },
            {
              icon: Zap,
              title: 'Prompts',
              body: 'Pre-templated request shapes the user can pick from a menu. The server-side equivalent of a slash-command library.',
            },
          ].map(prim => (
            <div
              key={prim.title}
              className="bg-bg-secondary border border-border rounded-lg p-4"
            >
              <div className="flex items-center gap-2 mb-2">
                <prim.icon className="w-5 h-5 text-accent-primary" />
                <h3 className="font-semibold text-text-primary">{prim.title}</h3>
              </div>
              <p className="text-sm text-text-secondary leading-relaxed">{prim.body}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Adoption */}
      <section className="mb-12">
        <h2 className="text-2xl font-semibold text-text-primary mb-4">
          Who speaks MCP
        </h2>
        <p className="text-text-secondary leading-relaxed mb-5 max-w-3xl">
          MCP is the rare standard with first-party support across every major frontier lab and
          IDE-native agent client. The interop is real, not aspirational.
        </p>
        <div className="grid gap-3 sm:grid-cols-2">
          {ADOPTERS.map(a => (
            <div
              key={a.name}
              className="bg-bg-secondary border border-border rounded-lg p-4"
            >
              <h3 className="font-semibold text-text-primary mb-1">{a.name}</h3>
              <p className="text-sm text-text-secondary leading-relaxed">{a.note}</p>
            </div>
          ))}
        </div>
        <Link
          href="/mcp-servers"
          className="inline-flex items-center gap-1.5 text-sm text-accent-primary hover:underline mt-4 group"
        >
          Curated MCP server catalog
          <ArrowRight className="w-4 h-4 group-hover:translate-x-0.5 transition-transform" />
        </Link>
      </section>

      {/* The 50-line pattern */}
      <section className="mb-12">
        <h2 className="text-2xl font-semibold text-text-primary mb-4">
          The 50-line server pattern
        </h2>
        <p className="text-text-secondary leading-relaxed mb-4 max-w-3xl">
          A useful MCP server is roughly a 50-line file. Pick a transport, declare your tools with
          their JSON schemas, implement the handlers, register the server. The TypeScript skeleton
          looks like this:
        </p>
        <div className="bg-bg-secondary border border-border rounded-lg overflow-hidden">
          <div className="px-4 py-2 border-b border-border bg-bg-tertiary text-xs font-mono uppercase tracking-wide text-text-muted">
            server.ts
          </div>
          <pre className="p-4 text-sm font-mono text-text-secondary overflow-x-auto">
{`import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';

const server = new Server(
  { name: 'my-server', version: '1.0.0' },
  { capabilities: { tools: {} } }
);

server.setRequestHandler('tools/list', async () => ({
  tools: [{
    name: 'get_thing',
    description: 'Returns a thing',
    inputSchema: { type: 'object', properties: { id: { type: 'string' } } },
  }],
}));

server.setRequestHandler('tools/call', async (req) => {
  if (req.params.name === 'get_thing') {
    const data = await fetch(\`https://api.example.com/thing/\${req.params.arguments.id}\`);
    return { content: [{ type: 'text', text: await data.text() }] };
  }
  throw new Error('unknown tool');
});

await server.connect(new StdioServerTransport());`}
          </pre>
        </div>
        <p className="text-text-secondary leading-relaxed mt-4 max-w-3xl text-sm">
          Ship that file, publish to npm, list on the registry, your tool is now callable from every
          MCP client in the ecosystem. Full walkthrough in our{' '}
          <Link
            href="/originals/mcp-server-fifty-line-file"
            className="text-accent-primary hover:underline"
          >
            50-line MCP server piece
          </Link>
          .
        </p>
      </section>

      {/* Recent news */}
      <section className="mb-12">
        <h2 className="text-2xl font-semibold text-text-primary mb-4">
          Recent MCP coverage on TensorFeed
        </h2>
        <div className="grid gap-3">
          {RECENT_ARTICLES.map(a => (
            <Link
              key={a.slug}
              href={`/originals/${a.slug}`}
              className="block bg-bg-secondary border border-border rounded-lg p-4 hover:border-accent-primary/50 transition-colors group"
            >
              <div className="flex items-start justify-between gap-3 mb-1">
                <h3 className="font-semibold text-text-primary group-hover:text-accent-primary transition-colors">
                  {a.title}
                </h3>
                <span className="text-xs text-text-muted font-mono shrink-0">{a.date}</span>
              </div>
              <p className="text-sm text-text-secondary leading-relaxed">{a.blurb}</p>
            </Link>
          ))}
        </div>
      </section>

      {/* MCP + x402 */}
      <section className="mb-12">
        <h2 className="text-2xl font-semibold text-text-primary mb-4">
          MCP + x402: the composable pair
        </h2>
        <p className="text-text-secondary leading-relaxed max-w-3xl">
          MCP and x402 are complementary, not competitive. MCP is how agents discover and call
          tools. x402 is how agents pay for them when the tool is gated. The TensorFeed pattern is a
          worked example: an MCP server (tensorfeed-mcp) wraps an x402-payable HTTP API. The agent
          calls a tool. The tool consumes a bearer token that was paid for in USDC on Base over
          x402. Same loop, different layers. MCP solves discovery and shape; x402 solves
          settlement. The two together are the agent-native API stack.
        </p>
        <Link
          href="/x402"
          className="inline-flex items-center gap-1.5 text-sm text-accent-primary hover:underline mt-3 group"
        >
          The x402 hub
          <ArrowRight className="w-4 h-4 group-hover:translate-x-0.5 transition-transform" />
        </Link>
      </section>

      {/* FAQ */}
      <section className="mb-12">
        <h2 className="text-2xl font-semibold text-text-primary mb-4">FAQ</h2>
        <div className="space-y-4">
          {FAQS.map(faq => (
            <details
              key={faq.question}
              className="bg-bg-secondary border border-border rounded-lg p-4 group"
            >
              <summary className="font-semibold text-text-primary cursor-pointer marker:text-accent-primary">
                {faq.question}
              </summary>
              <p className="mt-3 text-text-secondary leading-relaxed text-sm">{faq.answer}</p>
            </details>
          ))}
        </div>
      </section>

      {/* For agents footer */}
      <section className="mb-12 bg-bg-secondary border border-border rounded-lg p-5">
        <div className="flex items-start gap-3">
          <ShieldCheck className="w-5 h-5 text-accent-primary shrink-0 mt-0.5" />
          <div className="text-sm text-text-secondary leading-relaxed">
            <strong className="text-text-primary">For agents:</strong> registry snapshot at{' '}
            <a
              href="https://tensorfeed.ai/api/mcp/registry/snapshot"
              target="_blank"
              rel="noopener noreferrer"
              className="text-accent-primary hover:underline font-mono"
            >
              /api/mcp/registry/snapshot
            </a>{' '}
            (free, no auth, refreshed daily). Curated server catalog at{' '}
            <a
              href="https://tensorfeed.ai/api/mcp-servers"
              target="_blank"
              rel="noopener noreferrer"
              className="text-accent-primary hover:underline font-mono"
            >
              /api/mcp-servers
            </a>
            . Filter with{' '}
            <code className="font-mono">?capability=...</code> or{' '}
            <code className="font-mono">?first_party=true</code>.
          </div>
        </div>
      </section>

      {/* Further reading */}
      <section>
        <h2 className="text-lg font-semibold text-text-primary mb-3">Further reading</h2>
        <ul className="space-y-1.5 text-sm text-text-secondary list-disc list-inside ml-2">
          <li>
            <a
              href="https://modelcontextprotocol.io"
              target="_blank"
              rel="noopener noreferrer"
              className="text-accent-primary hover:underline"
            >
              modelcontextprotocol.io
            </a>{' '}
            (official spec and docs)
          </li>
          <li>
            <a
              href="https://registry.modelcontextprotocol.io"
              target="_blank"
              rel="noopener noreferrer"
              className="text-accent-primary hover:underline"
            >
              registry.modelcontextprotocol.io
            </a>{' '}
            (official server registry)
          </li>
          <li>
            <a
              href="https://github.com/modelcontextprotocol"
              target="_blank"
              rel="noopener noreferrer"
              className="text-accent-primary hover:underline"
            >
              github.com/modelcontextprotocol
            </a>{' '}
            (reference SDKs in TypeScript and Python)
          </li>
          <li>
            <Link href="/mcp-servers" className="text-accent-primary hover:underline">
              /mcp-servers
            </Link>{' '}
            (TensorFeed&apos;s curated capability-organized catalog)
          </li>
          <li>
            <a
              href="https://github.com/RipperMercs/tensorfeed-mcp"
              target="_blank"
              rel="noopener noreferrer"
              className="text-accent-primary hover:underline"
            >
              github.com/RipperMercs/tensorfeed-mcp
            </a>{' '}
            (TensorFeed&apos;s reference MCP server)
          </li>
          <li>
            <Link href="/x402" className="text-accent-primary hover:underline">
              /x402
            </Link>{' '}
            (the payment layer that pairs with MCP)
          </li>
        </ul>
      </section>
    </div>
  );
}
