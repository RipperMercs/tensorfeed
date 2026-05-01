import { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Inference Provider Pricing: Llama, DeepSeek, Mixtral, Qwen',
  description:
    'Same open-weight model, different price across Together, Fireworks, Groq, DeepInfra, OpenRouter, Replicate, Anyscale. Llama 4, DeepSeek V4, Mixtral, Qwen 2.5 with $/1M token, output TPS, context window. Free, no auth.',
  alternates: { canonical: 'https://tensorfeed.ai/inference-providers' },
  openGraph: {
    type: 'website',
    url: 'https://tensorfeed.ai/inference-providers',
    title: 'Inference Provider Pricing Matrix',
    description:
      'Cheapest hosted inference for Llama 4, DeepSeek V4, Mixtral, Qwen 2.5 across Together, Fireworks, Groq, DeepInfra, OpenRouter, Replicate, Anyscale.',
    siteName: 'TensorFeed.ai',
    images: [{ url: '/tensorfeed-logo.png', width: 1024, height: 1024 }],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Inference Provider Pricing Matrix',
    description: 'Same model, different price across 8 hosted providers. Cheapest path for open-weight models.',
  },
};

export default function InferenceProvidersLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
