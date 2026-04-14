import { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'AI Model Benchmarks 2026 | TensorFeed.ai',
  description:
    'Compare AI model performance across MMLU-Pro, HumanEval, GPQA Diamond, MATH, and SWE-bench benchmarks for leading models from Anthropic, OpenAI, Google, Meta, and more.',
  openGraph: {
    type: 'website',
    url: 'https://tensorfeed.ai/benchmarks',
    title: 'AI Model Benchmarks 2026 | TensorFeed.ai',
    description:
      'Compare AI model performance across MMLU-Pro, HumanEval, GPQA Diamond, MATH, and SWE-bench benchmarks for leading models from Anthropic, OpenAI, Google, Meta, and more.',
    siteName: 'TensorFeed.ai',
    images: [{ url: '/tensorfeed-logo.png', width: 1024, height: 1024 }],
  },
  twitter: {
    card: 'summary',
    title: 'AI Model Benchmarks 2026 | TensorFeed.ai',
    description:
      'Compare AI model performance across MMLU-Pro, HumanEval, GPQA Diamond, MATH, and SWE-bench benchmarks for leading models from Anthropic, OpenAI, Google, Meta, and more.',
  },
};

export default function BenchmarksLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
