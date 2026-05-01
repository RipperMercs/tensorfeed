import { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'AI Agent Framework Catalog: LangChain, LlamaIndex, AutoGen',
  description:
    'Live catalog of every production AI agent framework: LangChain, LangGraph, LlamaIndex, AutoGen, CrewAI, Pydantic AI, Mastra, OpenAI Agents SDK, Claude Agent SDK, Vercel AI SDK, browser-use, Pipecat. Free, no auth.',
  alternates: { canonical: 'https://tensorfeed.ai/frameworks' },
  openGraph: {
    type: 'website',
    url: 'https://tensorfeed.ai/frameworks',
    title: 'AI Agent Framework Catalog',
    description:
      'Languages, license, install volume, GitHub stars, features for every production AI agent framework.',
    siteName: 'TensorFeed.ai',
    images: [{ url: '/tensorfeed-logo.png', width: 1024, height: 1024 }],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'AI Agent Framework Catalog',
    description: 'Every production agent framework with version, install volume, features.',
  },
};

export default function FrameworksLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
