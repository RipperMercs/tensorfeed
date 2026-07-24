import { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Open-Weights Model Deployment Specs: VRAM, GPU, Quantization',
  description:
    'How to self-host NVIDIA Nemotron 3, Kimi K3, GLM-5.2, LongCat-2.0, MiniMax M3, DeepSeek V4, Command A+, and Llama 4: VRAM per quantization (FP16, FP8, AWQ, GGUF), recommended GPU, license, capabilities. Free, no auth.',
  alternates: { canonical: 'https://tensorfeed.ai/open-weights' },
  openGraph: {
    type: 'website',
    url: 'https://tensorfeed.ai/open-weights',
    title: 'Open-Weights Model Deployment Specs',
    description:
      'VRAM, GPU class, and quantization options for self-hosting Kimi K3, GLM-5.2, LongCat-2.0, DeepSeek V4, and Llama 4.',
    siteName: 'TensorFeed.ai',
    images: [{ url: '/tensorfeed-logo.png', width: 1024, height: 1024 }],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Open-Weights Model Deployment Specs',
    description: 'Quantization + VRAM for every major open-weights model.',
  },
};

export default function OpenWeightsLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
