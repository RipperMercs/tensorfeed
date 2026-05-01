import { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'AI Training Run Compute Economics: GPT-5.5, Llama 4, DeepSeek',
  description:
    'How much do frontier AI training runs cost? Disclosed and estimated parameter count, training tokens, GPU hours, hardware, and cost in USD millions for GPT-5.5, Claude Opus 4.7, Llama 4 Maverick, DeepSeek V4 Pro, and more.',
  alternates: { canonical: 'https://tensorfeed.ai/training-runs' },
  openGraph: {
    type: 'website',
    url: 'https://tensorfeed.ai/training-runs',
    title: 'AI Training Run Compute Economics',
    description: 'Disclosed and estimated training cost for every notable AI run.',
    siteName: 'TensorFeed.ai',
    images: [{ url: '/tensorfeed-logo.png', width: 1024, height: 1024 }],
  },
  twitter: { card: 'summary_large_image', title: 'AI Training Run Compute Economics' },
};

export default function TrainingRunsLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
