import { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Voice Model Leaderboards: TTS Arena Elo, ASR WER, Latency',
  description:
    'Live rankings for text-to-speech (TTS Arena Elo) and speech-to-text (Open ASR Leaderboard WER) models. ElevenLabs, Cartesia, Deepgram, Whisper, AssemblyAI, GPT-4o Transcribe, Chirp 2. Free.',
  alternates: { canonical: 'https://tensorfeed.ai/voice-leaderboards' },
  openGraph: {
    type: 'website',
    url: 'https://tensorfeed.ai/voice-leaderboards',
    title: 'Voice Model Leaderboards',
    description: 'TTS Elo + ASR WER live rankings.',
    siteName: 'TensorFeed.ai',
    images: [{ url: '/tensorfeed-logo.png', width: 1024, height: 1024 }],
  },
  twitter: { card: 'summary_large_image', title: 'Voice Model Leaderboards' },
};

export default function VoiceLeaderboardsLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
