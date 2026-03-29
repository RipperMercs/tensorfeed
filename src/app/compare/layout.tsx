import { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Compare AI Models Side by Side | TensorFeed.ai',
  description:
    'Compare Claude vs ChatGPT, GPT-4o vs Gemini, and more. Side-by-side pricing, context windows, and capabilities for all major AI models.',
};

export default function Layout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
