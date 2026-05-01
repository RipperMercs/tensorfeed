import { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'MCP Server Catalog: Filesystem, GitHub, Slack, Browser, More',
  description:
    'Curated catalog of production MCP servers organized by capability. Filesystem, web search, browser, GitHub, Slack, Notion, databases, AWS, Cloudflare, Sentry. Install commands and license. Free.',
  alternates: { canonical: 'https://tensorfeed.ai/mcp-servers' },
  openGraph: {
    type: 'website',
    url: 'https://tensorfeed.ai/mcp-servers',
    title: 'MCP Server Catalog',
    description:
      'Production MCP servers organized by capability. Install commands and license for each.',
    siteName: 'TensorFeed.ai',
    images: [{ url: '/tensorfeed-logo.png', width: 1024, height: 1024 }],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'MCP Server Catalog',
    description: 'Curated MCP servers organized by capability.',
  },
};

export default function MCPServersLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
