import { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'AI Coding Harnesses Compared: Claude Code vs Cursor vs Codex',
  description:
    'How the major AI coding harnesses (Claude Code, Cursor Agent, Codex CLI, Aider, OpenHands, Devin, Cline, Windsurf, Amp) score on SWE-bench Verified, Terminal-Bench, Aider Polyglot, and SWE-Lancer. The harness gap explained.',
  alternates: { canonical: 'https://tensorfeed.ai/harnesses' },
  openGraph: {
    type: 'website',
    url: 'https://tensorfeed.ai/harnesses',
    title: 'AI Coding Harnesses Compared: Claude Code vs Cursor vs Codex',
    description:
      'How the major AI coding harnesses (Claude Code, Cursor Agent, Codex CLI, Aider, OpenHands, Devin, Cline, Windsurf, Amp) score on SWE-bench Verified, Terminal-Bench, Aider Polyglot, and SWE-Lancer.',
    siteName: 'TensorFeed.ai',
    images: [{ url: '/tensorfeed-logo.png', width: 1024, height: 1024 }],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'AI Coding Harnesses Compared',
    description:
      'How the major AI coding harnesses score on SWE-bench Verified, Terminal-Bench, Aider Polyglot, and SWE-Lancer.',
  },
};

export default function HarnessesLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
