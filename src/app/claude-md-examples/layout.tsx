import { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'CLAUDE.md Examples: Ready-to-Use Templates for Every Stack | TensorFeed.ai',
  description:
    'Copy-paste CLAUDE.md examples for Next.js, Python, React Native, Cloudflare Workers, and more. Real-world templates you can use today.',
  openGraph: {
    title: 'CLAUDE.md Examples: Ready-to-Use Templates for Every Stack | TensorFeed.ai',
    description:
      'Copy-paste CLAUDE.md examples for Next.js, Python, React Native, Cloudflare Workers, and more. Real-world templates you can use today.',
    url: 'https://tensorfeed.ai/claude-md-examples',
  },
  alternates: {
    canonical: 'https://tensorfeed.ai/claude-md-examples',
  },
};

export default function ClaudeMdExamplesLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
