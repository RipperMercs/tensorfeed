import { Metadata } from 'next';
import { BreadcrumbListJsonLd } from '@/components/seo/JsonLd';
import ActivityClient from './ActivityClient';

export const metadata: Metadata = {
  title: 'TensorFeed MCP Activity — Live Install + Tool Call Counts',
  description:
    "Live install counts for @tensorfeed/mcp-server and @tensorfeed/x402-base-mcp pulled from npm, plus hosted endpoint tool-call telemetry from TensorFeed's /api/mcp surface. Updated every 5 minutes. Free, no auth, agent-friendly. Powered by the same MCP infrastructure the data describes.",
  alternates: { canonical: 'https://tensorfeed.ai/mcp/activity' },
  openGraph: {
    type: 'website',
    url: 'https://tensorfeed.ai/mcp/activity',
    title: 'TensorFeed MCP Activity — Live Install + Tool Call Counts',
    description:
      'Live npm install counts + hosted tool-call telemetry for the TensorFeed MCP servers. Updated every 5 minutes.',
    siteName: 'TensorFeed.ai',
    images: [{ url: '/tensorfeed-logo.png', width: 1024, height: 1024 }],
  },
  twitter: {
    card: 'summary',
    title: 'TensorFeed MCP Activity',
    description: 'Live install + tool-call telemetry for TensorFeed MCP servers.',
  },
  keywords: [
    'mcp activity',
    'tensorfeed mcp dashboard',
    'x402 mcp downloads',
    'mcp tool calls',
    'agent payments telemetry',
  ],
};

const BREADCRUMBS = [
  { name: 'Home', url: 'https://tensorfeed.ai' },
  { name: 'MCP Hub', url: 'https://tensorfeed.ai/mcp' },
  { name: 'Activity', url: 'https://tensorfeed.ai/mcp/activity' },
];

export default function McpActivityPage() {
  return (
    <>
      <BreadcrumbListJsonLd items={BREADCRUMBS} />
      <main className="max-w-5xl mx-auto px-4 sm:px-6 py-10">
        <header className="mb-8">
          <h1 className="text-3xl sm:text-4xl font-bold text-text-primary mb-3 leading-tight">
            TensorFeed MCP Activity
          </h1>
          <p className="text-text-secondary text-lg leading-relaxed">
            Live install counts for the two TensorFeed Model Context Protocol packages on npm, plus
            hosted endpoint tool-call telemetry from <code>https://tensorfeed.ai/api/mcp</code>.
            Cached 5 min at the edge. The data is also available as JSON at{' '}
            <a
              href="/api/mcp/activity"
              className="text-accent-primary hover:underline font-mono text-sm"
            >
              /api/mcp/activity
            </a>
            .
          </p>
        </header>

        <ActivityClient />

        <section className="mt-14 border-t border-border-primary pt-8 space-y-4 text-sm text-text-secondary">
          <h2 className="text-xl font-semibold text-text-primary">Notes on the data</h2>
          <p>
            <strong>npm download counts</strong> are the primary install signal. They cover every
            agent that installs via <code>npx -y @tensorfeed/...</code>, which is the dominant path
            for Claude Desktop, Claude Code, Cursor, Cline, and Continue users. npm reports
            yesterday-and-earlier; today&apos;s number is always blank until npm finishes its
            aggregation roughly 24 hours later.
          </p>
          <p>
            <strong>Hosted endpoint tool calls</strong> only count requests to the streamable-HTTP
            transport at <code>https://tensorfeed.ai/api/mcp</code>. Most MCP traffic does not
            touch this surface because stdio-installed servers run entirely on the agent
            operator&apos;s machine. Numbers here are accurate up to small isolate-race losses;
            the recorder is best-effort by design.
          </p>
          <p>
            Want to verify a specific tool call landed in our counter? The{' '}
            <a href="/api/mcp/activity" className="text-accent-primary hover:underline">
              /api/mcp/activity
            </a>{' '}
            JSON is the source of truth; the dashboard renders the same object.
          </p>
        </section>

        <section className="mt-10 grid grid-cols-1 sm:grid-cols-2 gap-4 text-sm">
          <a
            href="https://www.npmjs.com/package/@tensorfeed/mcp-server"
            className="block bg-bg-secondary border border-border-primary rounded p-4 hover:border-accent-primary/50 transition-colors"
          >
            <div className="font-medium text-text-primary mb-1">@tensorfeed/mcp-server</div>
            <div className="text-text-muted">
              The data MCP. News, model pricing, service status, MCP registry growth, plus paid
              premium endpoints over x402. <code>npx -y @tensorfeed/mcp-server</code>
            </div>
          </a>
          <a
            href="https://www.npmjs.com/package/@tensorfeed/x402-base-mcp"
            className="block bg-bg-secondary border border-border-primary rounded p-4 hover:border-accent-primary/50 transition-colors"
          >
            <div className="font-medium text-text-primary mb-1">@tensorfeed/x402-base-mcp</div>
            <div className="text-text-muted">
              The verifier MCP. Read-only Base mainnet chain reader for x402 settlement
              verification + AFTA federation helpers. <code>npx -y @tensorfeed/x402-base-mcp</code>
            </div>
          </a>
        </section>
      </main>
    </>
  );
}
