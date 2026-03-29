import { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'AI API Cost Calculator | TensorFeed.ai',
  description:
    'Calculate your monthly AI API costs across all providers. Compare Claude, GPT-4o, Gemini, Llama, and Mistral pricing based on your usage.',
};

export default function Layout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
