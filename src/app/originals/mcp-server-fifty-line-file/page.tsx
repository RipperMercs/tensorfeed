import { Metadata } from 'next';
import Link from 'next/link';
import { ArrowLeft, Clock } from 'lucide-react';
import { ArticleJsonLd } from '@/components/seo/JsonLd';
import ShareBar from '@/components/originals/ShareBar';

export const metadata: Metadata = {
  alternates: { canonical: 'https://tensorfeed.ai/originals/mcp-server-fifty-line-file' },
  title: 'An MCP Server Is a 50-Line File. Why Every Paid API Should Ship One.',
  description:
    'The Model Context Protocol server you would build for your API is a 50-line file. The agent-acquisition leverage of having one is enormous. Here is the actual code, what it costs to ship, and why most teams overthink the work.',
  openGraph: {
    title: 'An MCP Server Is a 50-Line File. Why Every Paid API Should Ship One.',
    description: 'The MCP server for your API is a 50-line file. The agent-acquisition leverage is enormous. Here is the actual code.',
    type: 'article',
    publishedTime: '2026-04-27T23:30:00Z',
    authors: ['Adrian Vale'],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'An MCP Server Is a 50-Line File. Why Every Paid API Should Ship One.',
    description: 'The MCP server for your API is a 50-line file. Here is what fits in those 50 lines and why the leverage is enormous.',
  },
};

export default function MCP50LineFilePage() {
  return (
    <article className="max-w-3xl mx-auto px-4 sm:px-6 py-10">
      <ArticleJsonLd
        title="An MCP Server Is a 50-Line File. Why Every Paid API Should Ship One."
        description="The Model Context Protocol server you would build for your API is a 50-line file. The agent-acquisition leverage of having one is enormous."
        datePublished="2026-04-27"
      />

      <Link
        href="/originals"
        className="inline-flex items-center gap-1.5 text-sm text-text-muted hover:text-accent-primary transition-colors mb-8"
      >
        <ArrowLeft className="w-4 h-4" />
        Back to Originals
      </Link>

      <header className="mb-10">
        <h1 className="text-3xl sm:text-4xl font-bold text-text-primary mb-4 leading-tight">
          An MCP Server Is a 50-Line File. Why Every Paid API Should Ship One.
        </h1>
        <div className="flex items-center gap-3 text-sm text-text-muted">
          <span className="text-text-secondary font-medium">Adrian Vale</span>
          <span>&middot;</span>
          <time dateTime="2026-04-27">April 27, 2026</time>
          <span>&middot;</span>
          <span className="flex items-center gap-1">
            <Clock className="w-3.5 h-3.5" />
            6 min read
          </span>
        </div>
      </header>

      <ShareBar
        path="/originals/mcp-server-fifty-line-file"
        title="An MCP Server Is a 50-Line File. Why Every Paid API Should Ship One."
      />
      <div className="prose-custom space-y-6 text-lg text-text-primary leading-relaxed">
        <p className="text-lg text-text-primary leading-relaxed">
          Every conversation I have with an API team about adding a Model Context Protocol server
          starts the same way. They have heard MCP is a thing. They are not sure how much it costs
          to support. They imagine a sprawling integration that touches their auth, their billing,
          their observability stack. They quote me three weeks of engineering time. Then I show
          them the actual file and they go quiet for a minute.
        </p>

        <p>
          The minimum-viable MCP server for an existing paid API is roughly 50 lines of TypeScript.
          You can write it in an afternoon and ship it the same day. The leverage is enormous: every
          Claude Desktop and Claude Code user becomes a one-config-edit away from your API. Most
          teams overthink this work, and almost everyone underestimates how much it pays back.
        </p>

        <h2 className="text-2xl font-semibold text-text-primary pt-4">The actual file</h2>

        <p>
          Here is the entire MCP server for a hypothetical news API. It exposes one tool that
          returns the latest articles. Production-ready, no shortcuts.
        </p>

        <pre className="bg-bg-secondary border border-border rounded-lg p-4 text-sm overflow-x-auto"><code className="text-text-primary font-mono">{`#!/usr/bin/env node
import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import { z } from 'zod';

const API_BASE = 'https://example.com/api';

async function fetchJSON(path: string): Promise<unknown> {
  const res = await fetch(\`\${API_BASE}\${path}\`, {
    headers: { 'User-Agent': 'Example-MCP/1.0' },
  });
  if (!res.ok) throw new Error(\`API error: \${res.status}\`);
  return res.json();
}

const server = new McpServer({ name: 'example', version: '1.0.0' });

server.tool(
  'get_latest_news',
  'Get the latest news articles from Example.com.',
  {
    category: z.string().optional().describe('Filter by category'),
    limit: z.number().min(1).max(50).optional().describe('How many to return'),
  },
  async ({ category, limit }) => {
    const params = new URLSearchParams();
    if (category) params.set('category', category);
    if (limit) params.set('limit', String(limit));
    const data = await fetchJSON(\`/news?\${params}\`) as {
      articles: { title: string; url: string; published: string }[];
    };
    const text = data.articles
      .map((a, i) => \`\${i + 1}. \${a.title} (\${a.published})\\n   \${a.url}\`)
      .join('\\n\\n');
    return { content: [{ type: 'text' as const, text: text || 'No articles.' }] };
  }
);

const transport = new StdioServerTransport();
await server.connect(transport);
console.error('Example MCP server running on stdio');`}</code></pre>

        <p>
          That is it. 38 lines counting blanks. Add a <code className="text-accent-primary font-mono">package.json</code>{' '}
          with the SDK dependency, a <code className="text-accent-primary font-mono">tsconfig.json</code>{' '}
          with strict mode and ES2022, and one shell command to publish. The whole project is
          under 100 lines of human-written code.
        </p>

        <h2 className="text-2xl font-semibold text-text-primary pt-4">What is in those 50 lines</h2>

        <ol className="space-y-2 list-decimal list-inside ml-4">
          <li><strong className="text-text-primary">A fetch helper</strong> for your API. Reuse the one you already have.</li>
          <li><strong className="text-text-primary">Server initialization</strong> with a name and a version. One constructor call.</li>
          <li><strong className="text-text-primary">One tool registration per endpoint you want to expose</strong>. Each is a <code className="text-accent-primary font-mono">server.tool()</code> call with a name, description, Zod schema for inputs, and an async handler.</li>
          <li><strong className="text-text-primary">stdio transport</strong>. The MCP SDK speaks stdio out of the box. No HTTP server, no port management, no auth proxy. Claude Desktop spawns the process when needed.</li>
        </ol>

        <p>
          Notice what is NOT in those 50 lines: an HTTP framework, a database client, an
          observability harness, a config loader, a secrets manager. The MCP server is a thin
          wrapper around your existing API. It does not need its own everything.
        </p>

        <h2 className="text-2xl font-semibold text-text-primary pt-4">Why teams overthink it</h2>

        <p>
          The two patterns I see again and again:
        </p>

        <p>
          <strong className="text-text-primary">Building a parallel API.</strong> Teams treat the
          MCP server as a place to re-implement business logic. They start adding caching,
          deduplication, custom error messages, retry logic. That logic already exists in their
          HTTP API. The MCP server should call the HTTP API and pass through. If you find yourself
          writing logic in the MCP server that does not exist in your main API, you are probably
          working on the wrong layer.
        </p>

        <p>
          <strong className="text-text-primary">Modeling auth as a first-class concern.</strong>{' '}
          MCP servers run as the user&apos;s local process. Authentication is whatever your HTTP
          API already does. If your API uses bearer tokens, the user passes the token via an
          environment variable in their MCP client config. The server reads
          <code className="text-accent-primary font-mono mx-1">process.env.YOUR_TOKEN</code> and attaches
          it to outbound requests. There is no signup flow, no OAuth dance, no token rotation
          inside the MCP server. The user already has a token (because they already have your
          API).
        </p>

        <p>
          Teams that get stuck on auth tend to be teams that do not yet have a clean way for
          users to authenticate to their HTTP API. Fix that first. The MCP server is downstream.
        </p>

        <h2 className="text-2xl font-semibold text-text-primary pt-4">The actual cost</h2>

        <p>
          For a working example, the <Link href="/originals/15-paid-endpoints-24-hours" className="text-accent-primary hover:underline">
          TensorFeed MCP server</Link> exposes 22 tools (5 free + 17 premium) across an entire
          paid API surface. The whole thing fits in roughly 700 lines of TypeScript counting
          all the boilerplate, error formatting, and the env-var auth handler. Eight hours total
          of engineering time to write, test, and publish to npm. The premium-tools half added
          another evening because it shares the same fetch helper and just changes the URL path
          per tool.
        </p>

        <p>
          The cost of NOT shipping one is harder to measure but very real. Any potential user who
          interacts with your product through an MCP-compatible client (Claude Desktop, Claude
          Code, several MCP IDE extensions, the official MCP registry) cannot use your API without
          one. That number is small today and will be much larger in 12 months. Right now the MCP
          servers most often called from Claude Desktop are filesystem, GitHub, Slack, and a
          rotating cast of community tools. There is no entry on the list for &quot;weather&quot; or
          &quot;model pricing&quot; or &quot;AI news&quot; until a service ships one.
        </p>

        <h2 className="text-2xl font-semibold text-text-primary pt-4">Three additional moves that are also small</h2>

        <p>
          Once the basic server is published to npm, three more moves cost an hour each and
          compound the leverage:
        </p>

        <p>
          <strong className="text-text-primary">Author a server.json manifest.</strong> The
          official MCP registry accepts a manifest that declares your server&apos;s name,
          version, transport, environment variables, and metadata. Publish via the
          <code className="text-accent-primary font-mono mx-1">mcp-publisher</code> CLI and you appear
          in registry.modelcontextprotocol.io as a discoverable entry. This is fifteen lines of
          JSON.
        </p>

        <p>
          <strong className="text-text-primary">Submit to two awesome lists.</strong> Open a PR to
          <code className="text-accent-primary font-mono mx-1">punkpeye/awesome-mcp-servers</code> and
          <code className="text-accent-primary font-mono mx-1">wong2/awesome-mcp-servers</code> with
          your entry. Both maintainers actively merge. The combined audience is in the tens of
          thousands of MCP-aware developers.
        </p>

        <p>
          <strong className="text-text-primary">Document it on your developer site.</strong>{' '}
          Three sentences and a JSON code block showing the Claude Desktop config. That is enough
          for any user to install. They do not need a tutorial; they need to know your server
          exists and what env vars to set.
        </p>

        <p>
          Total elapsed time from &quot;we should look at MCP&quot; to &quot;we are in the registry, in two
          awesome lists, and documented&quot; is one engineer-day. Not a sprint. Not a quarter. A day.
        </p>

        <h2 className="text-2xl font-semibold text-text-primary pt-4">Why the leverage is enormous</h2>

        <p>
          The thing that took me a while to internalize: an MCP server is a distribution channel,
          not a product. Once it exists, every Claude Desktop user is a single config edit away
          from your API. Every Claude Code user is the same. Every emerging MCP-compatible IDE,
          agent framework, and notebook environment becomes a customer surface for free. You did
          not have to integrate with each one. They integrate with you because MCP is the
          standard.
        </p>

        <p>
          We are early in this. Most paid APIs do not have MCP servers yet. The ones that do are
          getting a disproportionate amount of agent traffic because there are very few options.
          The window where you can be one of the first MCP servers in your category is now and
          probably closes within twelve months as more teams catch on.
        </p>

        <h2 className="text-2xl font-semibold text-text-primary pt-4">The one-paragraph version</h2>

        <p>
          Write the 50-line file. Publish it to npm under <code className="text-accent-primary font-mono">@your-org/mcp-server</code>.
          Add a <code className="text-accent-primary font-mono">server.json</code> and publish to
          registry.modelcontextprotocol.io. Open PRs to two awesome lists. Add three sentences to
          your docs. Total cost: a day. Total upside: every MCP-aware developer in the world is
          now one config edit from your API.
        </p>

        <p>
          If you want a complete reference implementation to crib from, the
          <a className="text-accent-primary hover:underline mx-1" href="https://github.com/RipperMercs/tensorfeed/tree/main/mcp-server" target="_blank" rel="noopener noreferrer">TensorFeed MCP server source</a>
          is on GitHub and the
          <a className="text-accent-primary hover:underline mx-1" href="https://github.com/RipperMercs/tensorfeed/blob/main/mcp-server/server.json" target="_blank" rel="noopener noreferrer">server.json manifest</a>
          is alongside it. Fork it, change the API base URL, change the tool definitions, and
          you have your own working server in an hour.
        </p>

        <p>
          Stop writing the planning doc. Write the file.
        </p>
      </div>
    </article>
  );
}
