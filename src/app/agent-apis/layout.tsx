import { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Public AI Agent APIs: Search, Scraping, Weather, Finance, More',
  description:
    'Catalog of non-LLM APIs AI agents commonly wire: Tavily, Brave Search, Exa, Firecrawl, Jina Reader, OpenWeather, Polygon, Stripe, Resend, Twilio, E2B. Pricing, free tier, MCP availability. Free.',
  alternates: { canonical: 'https://tensorfeed.ai/agent-apis' },
  openGraph: {
    type: 'website',
    url: 'https://tensorfeed.ai/agent-apis',
    title: 'Public AI Agent APIs',
    description: 'Search, scraping, weather, finance, email, SMS, payments, code execution APIs for AI agents.',
    siteName: 'TensorFeed.ai',
    images: [{ url: '/tensorfeed-logo.png', width: 1024, height: 1024 }],
  },
  twitter: { card: 'summary_large_image', title: 'Public AI Agent APIs', description: 'Non-LLM APIs agents commonly wire.' },
};

export default function AgentApisLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
