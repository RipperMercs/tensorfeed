import { Metadata } from 'next';
import Link from 'next/link';
import { ArrowLeft } from 'lucide-react';

export const metadata: Metadata = {
  title: 'What is MCP? Model Context Protocol Explained | TensorFeed',
  description:
    'MCP is the open standard for exposing tools, resources, and prompts to AI agents. Built by Anthropic and adopted by Claude Desktop, Claude Code, and other agentic applications. The plug-and-play layer between LLMs and external systems.',
  alternates: { canonical: 'https://tensorfeed.ai/glossary/mcp' },
  openGraph: {
    title: 'What is MCP? Model Context Protocol Explained',
    description: 'The open standard for tool exposure to AI agents. Built by Anthropic, adopted across the agentic ecosystem.',
    url: 'https://tensorfeed.ai/glossary/mcp',
  },
  keywords: ['MCP', 'Model Context Protocol', 'Claude Desktop tools', 'AI agent tools', 'MCP server', 'agentic infrastructure', 'Anthropic'],
};

const FAQ_JSONLD = {
  '@context': 'https://schema.org',
  '@type': 'FAQPage',
  mainEntity: [
    {
      '@type': 'Question',
      name: 'What is MCP (Model Context Protocol)?',
      acceptedAnswer: { '@type': 'Answer', text: 'MCP is an open protocol introduced by Anthropic in late 2024 for connecting AI assistants and agents to external systems (data sources, APIs, files, tools). It defines a standardized way for an LLM-powered application like Claude Desktop to discover and call tools provided by an MCP server, exchange resources, and request user input via prompts.' },
    },
    {
      '@type': 'Question',
      name: 'How does an MCP server work?',
      acceptedAnswer: { '@type': 'Answer', text: 'An MCP server is a process (typically a Node script, but any language with the SDK works) that exposes one or more tools via stdio, SSE, or HTTP transport. Each tool has a name, a description (which the LLM reads), and a JSON Schema input. The MCP client (Claude Desktop, Claude Code) connects to the server, lists available tools, and can call them on behalf of the model. The server returns structured content the model uses in its response.' },
    },
    {
      '@type': 'Question',
      name: 'What is the official MCP registry?',
      acceptedAnswer: { '@type': 'Answer', text: 'The official MCP registry at registry.modelcontextprotocol.io is a centralized directory of community MCP servers. Servers declare metadata via a server.json manifest and publish via the mcp-publisher CLI. Once published, MCP clients can discover the server programmatically, and humans can browse the registry web UI to find tools.' },
    },
    {
      '@type': 'Question',
      name: 'How do I add the TensorFeed MCP server to Claude Desktop?',
      acceptedAnswer: { '@type': 'Answer', text: 'Add this to your Claude Desktop config (`%APPDATA%\\Claude\\claude_desktop_config.json` on Windows, `~/Library/Application Support/Claude/claude_desktop_config.json` on macOS): { "mcpServers": { "tensorfeed": { "command": "npx", "args": ["-y", "@tensorfeedai/mcp-server"], "env": { "TENSORFEED_TOKEN": "tf_live_..." } } } }. The TENSORFEED_TOKEN is optional; without it the 5 free tools work, with it the 15 premium tools unlock.' },
    },
  ],
};

export default function MCPGlossaryPage() {
  return (
    <article className="max-w-3xl mx-auto px-4 sm:px-6 py-10">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(FAQ_JSONLD) }}
      />
      <Link
        href="/for-ai-agents"
        className="inline-flex items-center gap-1.5 text-sm text-text-muted hover:text-accent-primary transition-colors mb-8"
      >
        <ArrowLeft className="w-4 h-4" />
        Back to AI agents
      </Link>

      <header className="mb-8">
        <h1 className="text-3xl sm:text-4xl font-bold text-text-primary mb-3">MCP (Model Context Protocol)</h1>
        <p className="text-lg text-text-secondary">
          The open standard for exposing tools, resources, and prompts to AI agents. Built by
          Anthropic and adopted by Claude Desktop, Claude Code, and a growing ecosystem of
          agentic applications.
        </p>
      </header>

      <div className="prose-custom space-y-6 text-text-secondary leading-relaxed">
        <h2 className="text-2xl font-semibold text-text-primary pt-2">Origin</h2>
        <p>
          MCP was introduced by Anthropic in late 2024 to solve a recurring problem: every LLM
          application was reinventing tool exposure. Plugins for OpenAI, Functions for Anthropic,
          custom adapters for everything else. MCP defines one protocol so an LLM-powered app
          like Claude Desktop can speak to any compliant server, and any developer can write one
          server that works across compatible clients.
        </p>

        <h2 className="text-2xl font-semibold text-text-primary pt-2">The model</h2>
        <p>An MCP server exposes three primitives:</p>
        <ul className="space-y-2 list-disc list-inside ml-4">
          <li><strong className="text-text-primary">Tools:</strong> callable functions the LLM can invoke (with JSON Schema inputs)</li>
          <li><strong className="text-text-primary">Resources:</strong> structured content the LLM can read (files, API payloads, DB rows)</li>
          <li><strong className="text-text-primary">Prompts:</strong> reusable templates the user can invoke</li>
        </ul>
        <p>
          The client (Claude Desktop, Claude Code, etc.) connects to the server via stdio, SSE,
          or streamable HTTP. The model reads the tool descriptions, picks ones to call, and the
          server returns structured content the model uses in its reply.
        </p>

        <h2 className="text-2xl font-semibold text-text-primary pt-2">Discovery</h2>
        <p>
          The official MCP registry at{' '}
          <a href="https://registry.modelcontextprotocol.io" target="_blank" rel="noopener noreferrer" className="text-accent-primary hover:underline">
            registry.modelcontextprotocol.io
          </a>{' '}
          is a centralized directory of community servers. Servers declare metadata via a{' '}
          <code className="text-accent-primary font-mono">server.json</code> manifest and publish via the
          {' '}<code className="text-accent-primary font-mono">mcp-publisher</code> CLI. There&apos;s also a
          robust ecosystem of curated lists (punkpeye/awesome-mcp-servers, wong2/awesome-mcp-servers,
          and many others on GitHub).
        </p>

        <h2 className="text-2xl font-semibold text-text-primary pt-2">TensorFeed&apos;s MCP server</h2>
        <p>
          TensorFeed publishes <code className="text-accent-primary font-mono">@tensorfeedai/mcp-server</code>{' '}
          with 20 tools (5 free, 15 premium). Free tools cover real-time AI news, service status,
          model pricing, benchmarks, and a today summary. Premium tools cover routing
          recommendations, news search, history series, cost projection, forecasting, provider
          deep-dive, model comparison, the agent morning brief, and webhook watch management.
        </p>

        <pre className="bg-bg-secondary border border-border rounded-lg p-4 text-sm overflow-x-auto"><code className="text-text-primary font-mono">{`{
  "mcpServers": {
    "tensorfeed": {
      "command": "npx",
      "args": ["-y", "@tensorfeedai/mcp-server"],
      "env": { "TENSORFEED_TOKEN": "tf_live_..." }
    }
  }
}`}</code></pre>

        <p>
          Without the token, only free tools work. With the token, premium tools unlock. The
          server is registered in the official MCP registry as <code className="text-accent-primary font-mono">ai.tensorfeed/mcp-server</code>.
        </p>

        <h2 className="text-2xl font-semibold text-text-primary pt-2">Why MCP matters for agent payments</h2>
        <p>
          MCP standardizes how an agent discovers and calls tools. When you combine that with
          {' '}<Link href="/glossary/x402" className="text-accent-primary hover:underline">x402</Link>{' '}
          (which standardizes how a tool gets paid), you get a complete machine-to-machine
          commerce layer. The agent finds a tool via MCP, the tool returns 402, the agent pays
          on-chain, the tool serves the data. No human in any step.
        </p>

        <h2 className="text-2xl font-semibold text-text-primary pt-2">Further reading</h2>
        <ul className="space-y-1 list-disc list-inside ml-4">
          <li><a href="https://modelcontextprotocol.io" target="_blank" rel="noopener noreferrer" className="text-accent-primary hover:underline">modelcontextprotocol.io</a> — official spec</li>
          <li><a href="https://github.com/modelcontextprotocol/servers" target="_blank" rel="noopener noreferrer" className="text-accent-primary hover:underline">github.com/modelcontextprotocol/servers</a> — community servers list</li>
          <li><a href="https://github.com/RipperMercs/tensorfeed/tree/main/mcp-server" target="_blank" rel="noopener noreferrer" className="text-accent-primary hover:underline">TensorFeed MCP server source</a></li>
          <li><Link href="/for-ai-agents" className="text-accent-primary hover:underline">TensorFeed for AI agents</Link> — discovery surfaces and integration paths</li>
        </ul>
      </div>
    </article>
  );
}
