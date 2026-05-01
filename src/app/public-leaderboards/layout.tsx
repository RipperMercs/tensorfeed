import { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'AI Leaderboards Aggregator: LMSYS, Open LLM, Aider, SWE-bench',
  description:
    'Pointers to every live AI model leaderboard: LMSYS Chatbot Arena, Artificial Analysis, HF Open LLM Leaderboard, SWE-bench Verified, Aider Polyglot, LiveCodeBench, ARC Prize, MMMU, Video Arena, TTS Arena, GAIA, WebArena, OSWorld. Free.',
  alternates: { canonical: 'https://tensorfeed.ai/public-leaderboards' },
  openGraph: {
    type: 'website',
    url: 'https://tensorfeed.ai/public-leaderboards',
    title: 'AI Leaderboards Aggregator',
    description: 'Where to find every live public AI model ranking.',
    siteName: 'TensorFeed.ai',
    images: [{ url: '/tensorfeed-logo.png', width: 1024, height: 1024 }],
  },
  twitter: { card: 'summary_large_image', title: 'AI Leaderboards Aggregator' },
};

export default function PublicLeaderboardsLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
