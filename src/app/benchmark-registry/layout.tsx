import { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'AI Benchmark Registry: 25+ Evaluation Suites Compared',
  description:
    'Meta-catalog of every major AI benchmark with current SOTA holder per benchmark: MMLU-Pro, GPQA, HLE, ARC-AGI-2, AIME 2025, SWE-bench Verified, Aider Polyglot, Terminal-Bench, MMMU-Pro, Tau-Bench, GAIA, OSWorld, BFCL, RULER, and more. Each entry has frontier score + model + date + citation. Free.',
  alternates: { canonical: 'https://tensorfeed.ai/benchmark-registry' },
  openGraph: {
    type: 'website',
    url: 'https://tensorfeed.ai/benchmark-registry',
    title: 'AI Benchmark Registry',
    description:
      'Every major AI benchmark with category, status, contamination risk, frontier score, current SOTA holder, and leaderboard URL.',
    siteName: 'TensorFeed.ai',
    images: [{ url: '/tensorfeed-logo.png', width: 1024, height: 1024 }],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'AI Benchmark Registry',
    description: 'Meta-catalog of every major AI benchmark.',
  },
};

export default function BenchmarkRegistryLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
