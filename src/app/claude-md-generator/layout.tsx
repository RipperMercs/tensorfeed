import { Metadata } from 'next';

export const metadata: Metadata = {
  title:
    'CLAUDE.md Generator: Build Your AI Coding Config in Seconds | TensorFeed.ai',
  description:
    'Generate a custom CLAUDE.md file for your project. Select your stack, preferences, and coding style to create the perfect Claude Code configuration.',
  openGraph: {
    title: 'CLAUDE.md Generator: Build Your AI Coding Config in Seconds',
    description:
      'Generate a custom CLAUDE.md file for your project. Select your stack, preferences, and coding style to create the perfect Claude Code configuration.',
    url: 'https://tensorfeed.ai/claude-md-generator',
  },
  alternates: {
    canonical: 'https://tensorfeed.ai/claude-md-generator',
  },
};

export default function Layout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
