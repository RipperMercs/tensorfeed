import { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Frontier AI Model Wars: Tracking the Race Between Claude, GPT, Gemini, and More | TensorFeed.ai',
  description:
    'Real-time tracking of the frontier AI model race between Anthropic, OpenAI, Google, xAI, Meta, and every lab pushing the edge. Live leaderboard, 90 day release timeline, and category winners across coding, reasoning, math, and long context.',
  openGraph: {
    title: 'The Frontier AI Model Wars',
    description:
      'Real-time tracking of who is winning the frontier AI race across Claude, GPT, Gemini, Grok, and Llama.',
    url: 'https://tensorfeed.ai/model-wars',
    type: 'article',
  },
  alternates: {
    canonical: 'https://tensorfeed.ai/model-wars',
  },
};

export default function ModelWarsLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
