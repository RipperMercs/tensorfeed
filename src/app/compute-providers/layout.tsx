import { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'AI Compute Provider Comparison: Lambda, CoreWeave, Crusoe, AWS',
  description:
    'AI compute platforms compared: Lambda, CoreWeave, Crusoe, Nebius, RunPod, Vast.ai, Paperspace, AWS, Azure, GCP, Oracle, Modal, Replicate, Beam, Cerebras, SambaNova, Fireworks. GPUs offered, pricing model, regions, AI services. Free.',
  alternates: { canonical: 'https://tensorfeed.ai/compute-providers' },
  openGraph: { type: 'website', url: 'https://tensorfeed.ai/compute-providers', title: 'AI Compute Provider Comparison', description: 'GPU clouds, hyperscalers, AI-native serverless, marketplaces.', siteName: 'TensorFeed.ai', images: [{ url: '/tensorfeed-logo.png', width: 1024, height: 1024 }] },
  twitter: { card: 'summary_large_image', title: 'AI Compute Provider Comparison' },
};

export default function ComputeProvidersLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
