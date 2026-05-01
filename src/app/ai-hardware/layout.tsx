import { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'AI Hardware Specs: H100, H200, B200, GB200, MI300X, TPU v5p',
  description:
    'Spec catalog for every major AI accelerator: NVIDIA Hopper / Blackwell, AMD Instinct, Google TPU, AWS Trainium, Apple Silicon, Cerebras WSE-3, Groq LPU. FLOPS, VRAM, bandwidth, NVLink, TDP. Free.',
  alternates: { canonical: 'https://tensorfeed.ai/ai-hardware' },
  openGraph: {
    type: 'website',
    url: 'https://tensorfeed.ai/ai-hardware',
    title: 'AI Hardware Specs',
    description:
      'FLOPS, VRAM, bandwidth, NVLink for every major AI accelerator chip.',
    siteName: 'TensorFeed.ai',
    images: [{ url: '/tensorfeed-logo.png', width: 1024, height: 1024 }],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'AI Hardware Specs',
    description: 'Spec sheet for every major AI accelerator.',
  },
};

export default function AIHardwareLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
