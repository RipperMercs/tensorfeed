import { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Specialized AI Models: Code, Medical, Legal, Finance, Music, 3D',
  description:
    'Production AI models specialized for vertical domains: code (Codestral, DeepSeek Coder, Qwen Coder), medical (Med-Gemini, Meditron), legal (SaulLM), finance (FinGPT), music (Suno, Udio, MusicGen), 3D (TRELLIS, Hunyuan3D), retrieval (ColPali, SPLADE). Free.',
  alternates: { canonical: 'https://tensorfeed.ai/specialized-models' },
  openGraph: {
    type: 'website',
    url: 'https://tensorfeed.ai/specialized-models',
    title: 'Specialized AI Models',
    description: 'Vertical-specialized models for code, medical, legal, finance, music, 3D, retrieval.',
    siteName: 'TensorFeed.ai',
    images: [{ url: '/tensorfeed-logo.png', width: 1024, height: 1024 }],
  },
  twitter: { card: 'summary_large_image', title: 'Specialized AI Models' },
};

export default function SpecializedModelsLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
