import { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'AI Image, Video, TTS, STT Models Compared',
  description:
    'Live catalog of every production multimodal AI model: Sora, Veo 3, Kling, FLUX, DALL-E 3, ElevenLabs, Cartesia, Deepgram, Whisper. Pricing in modality-native units. Free, no auth.',
  alternates: { canonical: 'https://tensorfeed.ai/multimodal' },
  openGraph: {
    type: 'website',
    url: 'https://tensorfeed.ai/multimodal',
    title: 'AI Image, Video, TTS, STT Models Compared',
    description:
      'Pricing per image, per second of video, per 1k characters, per minute of audio for every production multimodal model. Free.',
    siteName: 'TensorFeed.ai',
    images: [{ url: '/tensorfeed-logo.png', width: 1024, height: 1024 }],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'AI Image, Video, TTS, STT Models',
    description: 'Multimodal catalog with modality-native pricing. Free.',
  },
};

export default function MultimodalLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
