import { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'AI Fine-Tuning Provider Comparison: Pricing, Methods, Models',
  description:
    'Where to fine-tune AI models in production: OpenAI, Anthropic, Google Vertex, Mistral, Together, Fireworks, OpenPipe, Predibase, AWS Bedrock, Hugging Face AutoTrain, Replicate, Modal. Pricing per training token, methods, base models. Free.',
  alternates: { canonical: 'https://tensorfeed.ai/fine-tuning' },
  openGraph: {
    type: 'website',
    url: 'https://tensorfeed.ai/fine-tuning',
    title: 'AI Fine-Tuning Provider Comparison',
    description: 'Pricing, methods, base models for every production fine-tuning provider.',
    siteName: 'TensorFeed.ai',
    images: [{ url: '/tensorfeed-logo.png', width: 1024, height: 1024 }],
  },
  twitter: { card: 'summary_large_image', title: 'AI Fine-Tuning Providers' },
};

export default function FineTuningLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
