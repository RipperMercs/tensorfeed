import { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'CLAUDE.md File: The Complete Guide With Examples & Templates',
  description:
    'What a CLAUDE.md file is, where to put it, how long it should be, and copy-paste templates to start with. Plus the difference between CLAUDE.md and AGENTS.md, and how to ship one in fifteen minutes.',
  openGraph: {
    title: 'CLAUDE.md File: The Complete Guide With Examples & Templates',
    description:
      'What a CLAUDE.md file is, where to put it, how long it should be, and copy-paste templates to start with. Plus the difference between CLAUDE.md and AGENTS.md, and how to ship one in fifteen minutes.',
    url: 'https://tensorfeed.ai/claude-md-guide',
  },
  alternates: {
    canonical: 'https://tensorfeed.ai/claude-md-guide',
  },
};

export default function Layout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
