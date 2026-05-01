/**
 * Voice / speech model leaderboards.
 *
 * Live ranking data for text-to-speech (TTS) and speech-to-text (STT)
 * models, sourced from public leaderboards: TTS Arena (Elo), Open ASR
 * Leaderboard (WER), MTEB Audio. Companion to /multimodal which is the
 * pricing + spec catalog.
 *
 * Editorial weekly snapshot for now; weekly refresh routine pulls
 * upstream.
 *
 * Served at /api/voice-leaderboards (free, cached 1800s).
 */

export interface TTSEntry {
  rank: number;
  model: string;
  provider: string;
  /** Elo score on TTS Arena. */
  elo: number;
  /** Trend vs prior snapshot. */
  trend: 'up' | 'down' | 'flat' | 'new';
  openWeights: boolean;
  notes: string;
}

export interface STTEntry {
  rank: number;
  model: string;
  provider: string;
  /** Word Error Rate (English, lower is better). */
  englishWER: number;
  /** WER averaged across multilingual benchmark. */
  multilingualWER: number | null;
  /** Real-time factor (smaller is faster). */
  rtf: number | null;
  openWeights: boolean;
  notes: string;
}

export interface VoiceLeaderboardData {
  lastUpdated: string;
  ttsArena: {
    source: string;
    sourceUrl: string;
    window: string;
    rankings: TTSEntry[];
  };
  asrLeaderboard: {
    source: string;
    sourceUrl: string;
    benchmark: string;
    rankings: STTEntry[];
  };
}

export const VOICE_LEADERBOARDS: VoiceLeaderboardData = {
  lastUpdated: '2026-04-30',
  ttsArena: {
    source: 'TTS Arena (Hugging Face)',
    sourceUrl: 'https://huggingface.co/spaces/TTS-AGI/TTS-Arena',
    window: 'aggregated public votes',
    rankings: [
      { rank: 1,  model: 'Eleven v3 (alpha)',      provider: 'ElevenLabs', elo: 1287, trend: 'up',   openWeights: false, notes: 'Most expressive; supports audio tags ([whisper], [laughs]). Default for premium voice agents.' },
      { rank: 2,  model: 'Cartesia Sonic 2',       provider: 'Cartesia',   elo: 1264, trend: 'up',   openWeights: false, notes: 'Mamba architecture. Sub-90ms TTFB; fastest in production.' },
      { rank: 3,  model: 'Eleven Multilingual v2',  provider: 'ElevenLabs', elo: 1248, trend: 'flat', openWeights: false, notes: 'Older ElevenLabs flagship; still strong on cloning quality.' },
      { rank: 4,  model: 'Hailuo 02 Voice',         provider: 'MiniMax',    elo: 1232, trend: 'up',   openWeights: false, notes: 'Chinese-language strongest; rapidly improving on English.' },
      { rank: 5,  model: 'OpenAI TTS-1-HD',         provider: 'OpenAI',     elo: 1218, trend: 'flat', openWeights: false, notes: 'Cheap and reliable. 6 fixed voices, no cloning.' },
      { rank: 6,  model: 'Deepgram Aura-2',         provider: 'Deepgram',   elo: 1205, trend: 'flat', openWeights: false, notes: 'Sub-200ms TTFB. Strong real-time integration with Deepgram Nova STT.' },
      { rank: 7,  model: 'PlayHT Dialog 1.0',       provider: 'PlayHT',     elo: 1192, trend: 'down', openWeights: false, notes: 'Conversational TTS; turn-taking aware.' },
      { rank: 8,  model: 'Kokoro TTS',              provider: 'community',  elo: 1178, trend: 'up',   openWeights: true,  notes: '82M params, Apache-2.0, runs on CPU. Surprisingly competitive at the small-model tier.' },
      { rank: 9,  model: 'Google Cloud TTS Studio', provider: 'Google',     elo: 1163, trend: 'flat', openWeights: false, notes: 'Google studio voices. Strong on enterprise SLA.' },
      { rank: 10, model: 'Fish Audio S1',           provider: 'Fish Audio', elo: 1141, trend: 'down', openWeights: true,  notes: 'Open-weights TTS with cloning. Apache-2.0.' },
    ],
  },
  asrLeaderboard: {
    source: 'Open ASR Leaderboard + vendor-published WER',
    sourceUrl: 'https://huggingface.co/spaces/hf-audio/open_asr_leaderboard',
    benchmark: 'Open ASR Leaderboard (LibriSpeech + Common Voice + AMI + GigaSpeech)',
    rankings: [
      { rank: 1,  model: 'AssemblyAI Universal-2',     provider: 'AssemblyAI', englishWER: 5.6, multilingualWER: 7.8, rtf: 0.04,  openWeights: false, notes: 'Best aggregated WER. Strong on long-form (calls, podcasts).' },
      { rank: 2,  model: 'GPT-4o Transcribe',           provider: 'OpenAI',     englishWER: 6.7, multilingualWER: 8.1, rtf: 0.06,  openWeights: false, notes: 'Replaced whisper-1 as OpenAI flagship STT. Lower hallucination than Whisper.' },
      { rank: 3,  model: 'Deepgram Nova-3',             provider: 'Deepgram',   englishWER: 6.84, multilingualWER: 9.2, rtf: 0.02, openWeights: false, notes: 'Fastest production STT. 36 languages; strong code-switching.' },
      { rank: 4,  model: 'Whisper Large v3',            provider: 'OpenAI',     englishWER: 7.4, multilingualWER: 10.5, rtf: 0.18, openWeights: true,  notes: 'Apache-2.0 open weights. Cheapest production STT when hosted on Groq (~$0.0007/min).' },
      { rank: 5,  model: 'Whisper Large v3 Turbo',      provider: 'OpenAI (community)', englishWER: 7.8, multilingualWER: 11.1, rtf: 0.05, openWeights: true, notes: 'Community-distilled Whisper Turbo. 6x faster than base v3 with similar WER on English.' },
      { rank: 6,  model: 'NVIDIA Parakeet TDT 1.1B',    provider: 'NVIDIA',     englishWER: 7.1, multilingualWER: null, rtf: 0.06, openWeights: true,  notes: 'Open Apache-2.0. English-only. Strong WER for an open model.' },
      { rank: 7,  model: 'Google Chirp 2',              provider: 'Google',     englishWER: 8.2, multilingualWER: 9.0, rtf: 0.10,  openWeights: false, notes: 'Strongest multilingual coverage (125+ languages). Higher price reflects enterprise SLAs.' },
      { rank: 8,  model: 'IBM Watson Speech',           provider: 'IBM',        englishWER: 9.1, multilingualWER: 11.3, rtf: 0.12, openWeights: false, notes: 'Mature enterprise STT; lags in benchmark WER but strong domain customization.' },
    ],
  },
};
