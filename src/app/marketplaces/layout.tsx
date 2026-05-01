import { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'AI Marketplaces: GPT Store, Claude Skills, HF Spaces, Replicate',
  description:
    'Catalog of AI agent and model marketplaces: OpenAI GPT Store, Claude Skills, Hugging Face Spaces + Models, Replicate, MCP Registry, CrewAI Marketplace, Apify Store, Replit Templates, Vercel AI Marketplace, Glama MCP. Free.',
  alternates: { canonical: 'https://tensorfeed.ai/marketplaces' },
  openGraph: {
    type: 'website',
    url: 'https://tensorfeed.ai/marketplaces',
    title: 'AI Marketplaces',
    description: 'Where humans and agents browse + install AI agents, models, skills, MCPs.',
    siteName: 'TensorFeed.ai',
    images: [{ url: '/tensorfeed-logo.png', width: 1024, height: 1024 }],
  },
  twitter: { card: 'summary_large_image', title: 'AI Marketplaces' },
};

export default function MarketplacesLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
