'use client';

import { useEffect, useState, useMemo } from 'react';
import Link from 'next/link';
import { Image as ImageIcon, ExternalLink, Video, Mic, AudioLines } from 'lucide-react';

type Modality = 'image' | 'video' | 'tts' | 'stt';

interface MultimodalModel {
  id: string;
  name: string;
  provider: string;
  modality: Modality;
  pricingUnit: string;
  pricingAmount: number | null;
  pricingNote: string;
  released: string;
  apiAvailable: boolean;
  url: string;
  notes: string;
  maxOutput: string;
  features: string[];
}

interface MultimodalResponse {
  ok: boolean;
  lastUpdated: string;
  count: number;
  models: MultimodalModel[];
}

const MODALITY_META: Record<Modality, { label: string; icon: typeof ImageIcon; unit: string }> = {
  image: { label: 'Image generation', icon: ImageIcon, unit: 'per image' },
  video: { label: 'Video generation', icon: Video, unit: 'per second' },
  tts: { label: 'Text to speech', icon: AudioLines, unit: 'per 1k chars' },
  stt: { label: 'Speech to text', icon: Mic, unit: 'per minute' },
};

function formatPrice(m: MultimodalModel): string {
  if (m.pricingAmount === null || m.pricingAmount === 0) {
    if (m.pricingUnit === 'per_subscription_month') return 'Subscription only';
    if (m.pricingAmount === 0) return 'Free / open weights';
    return '—';
  }
  const v = m.pricingAmount;
  if (v < 0.01) return `$${v.toFixed(4)}`;
  if (v < 1) return `$${v.toFixed(3)}`;
  return `$${v.toFixed(2)}`;
}

export default function MultimodalPage() {
  const [data, setData] = useState<MultimodalResponse | null>(null);
  const [activeModality, setActiveModality] = useState<Modality>('image');
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetch('https://tensorfeed.ai/api/multimodal')
      .then(res => {
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        return res.json();
      })
      .then((json: MultimodalResponse) => setData(json))
      .catch(e => setError(e instanceof Error ? e.message : 'Failed to load'));
  }, []);

  const filtered = useMemo(() => {
    if (!data) return [];
    return data.models
      .filter(m => m.modality === activeModality)
      .sort((a, b) => {
        if (a.pricingAmount === null && b.pricingAmount === null) return a.name.localeCompare(b.name);
        if (a.pricingAmount === null) return 1;
        if (b.pricingAmount === null) return -1;
        return a.pricingAmount - b.pricingAmount;
      });
  }, [data, activeModality]);

  const PAGE_JSONLD = {
    '@context': 'https://schema.org',
    '@type': 'Dataset',
    name: 'TensorFeed Multimodal AI Model Catalog',
    description:
      'Curated catalog of production image generation, video generation, text-to-speech, and speech-to-text models with pricing in modality-native units.',
    url: 'https://tensorfeed.ai/multimodal',
    keywords: 'AI image generation, video generation, text to speech, speech to text, Sora, FLUX, ElevenLabs, Whisper, Deepgram',
    creator: { '@type': 'Organization', name: 'TensorFeed.ai', url: 'https://tensorfeed.ai' },
    license: 'https://tensorfeed.ai/terms',
  };

  const FAQ_JSONLD = {
    '@context': 'https://schema.org',
    '@type': 'FAQPage',
    mainEntity: [
      {
        '@type': 'Question',
        name: 'What is the cheapest AI image generation API?',
        acceptedAnswer: {
          '@type': 'Answer',
          text: 'FLUX 1 Schnell at $0.003 per image via Replicate or Together. Open-weights and Apache-licensed, so it is also free to self-host on a GPU. For higher fidelity, FLUX 1.1 Pro at $0.04 is the next tier; FLUX 1.1 Pro Ultra at $0.06 is the top of the line.',
        },
      },
      {
        '@type': 'Question',
        name: 'What is the cheapest production speech-to-text in 2026?',
        acceptedAnswer: {
          '@type': 'Answer',
          text: 'Whisper Large v3 hosted on Groq at roughly $0.0007 per minute is the cheapest production STT. The model is open-weights Apache-2.0; Groq runs it on custom LPU silicon at the lowest production price in the catalog. Deepgram Nova-3 at $0.0043/min is the cheapest non-Whisper option with state-of-the-art latency.',
        },
      },
      {
        '@type': 'Question',
        name: 'Which video model leads the leaderboards?',
        acceptedAnswer: {
          '@type': 'Answer',
          text: 'As of late April 2026, Alibaba\'s HappyHorse 1.0 leads the Artificial Analysis Video Arena by 115 Elo. Sora 2 (OpenAI) and Veo 3 (Google) follow. Veo 3 is the only major model with native synchronized audio generation; the others require a separate TTS pass.',
        },
      },
      {
        '@type': 'Question',
        name: 'Which TTS has the lowest latency for real-time voice agents?',
        acceptedAnswer: {
          '@type': 'Answer',
          text: 'Cartesia Sonic 2 at sub-90ms time-to-first-byte. Built on the Mamba architecture rather than transformers. About 90% cheaper than ElevenLabs at comparable quality for non-celebrity voice cloning. Deepgram Aura-2 is the closest competitor at sub-200ms TTFB.',
        },
      },
    ],
  };

  return (
    <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(PAGE_JSONLD) }} />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(FAQ_JSONLD) }} />

      <div className="mb-6">
        <div className="flex items-center gap-3 mb-3">
          <div className="p-2 rounded-lg bg-accent-primary/10">
            <ImageIcon className="w-7 h-7 text-accent-primary" />
          </div>
          <h1 className="text-3xl sm:text-4xl font-bold text-text-primary">Multimodal Models</h1>
        </div>
        <p className="text-text-secondary text-lg max-w-3xl">
          Image generation, video generation, text-to-speech, and speech-to-text catalog. Pricing in modality-native units (per image, per second, per 1k characters, per minute). {data?.lastUpdated && `Updated ${data.lastUpdated}.`}
        </p>
      </div>

      {/* Modality tabs */}
      <div className="flex gap-2 mb-6 flex-wrap">
        {(Object.keys(MODALITY_META) as Modality[]).map(mod => {
          const Icon = MODALITY_META[mod].icon;
          return (
            <button
              key={mod}
              onClick={() => setActiveModality(mod)}
              className={`px-3.5 py-1.5 rounded-full text-sm font-medium transition-colors border flex items-center gap-1.5 ${
                activeModality === mod
                  ? 'bg-accent-primary text-white border-accent-primary'
                  : 'bg-bg-secondary text-text-secondary border-border hover:border-text-muted'
              }`}
            >
              <Icon className="w-3.5 h-3.5" />
              {MODALITY_META[mod].label}
            </button>
          );
        })}
      </div>

      {error && (
        <div className="bg-rose-500/10 border border-rose-500/20 rounded-lg p-4 text-rose-400 text-sm mb-6">
          Error loading data: {error}
        </div>
      )}

      {data && (
        <div className="space-y-3 mb-10">
          {filtered.map(m => (
            <div key={m.id} className="bg-bg-secondary border border-border rounded-lg p-4 hover:border-accent-primary/50 transition-colors">
              <div className="flex items-start justify-between gap-3 flex-wrap mb-2">
                <div className="min-w-0">
                  <a href={m.url} target="_blank" rel="noopener noreferrer" className="font-semibold text-text-primary hover:text-accent-primary inline-flex items-center gap-1">
                    {m.name} <ExternalLink className="w-3 h-3 text-text-muted" />
                  </a>
                  <div className="text-xs text-text-muted mt-0.5">
                    {m.provider} · Released {m.released} · {m.apiAvailable ? 'API available' : 'No public API'}
                  </div>
                </div>
                <div className="text-right">
                  <div className="text-lg font-bold font-mono text-text-primary">{formatPrice(m)}</div>
                  <div className="text-xs text-text-muted">{MODALITY_META[m.modality].unit}</div>
                </div>
              </div>
              <p className="text-sm text-text-secondary leading-relaxed mb-2">{m.notes}</p>
              <div className="text-xs text-text-muted mb-2 italic">{m.pricingNote}</div>
              <div className="flex items-center gap-3 flex-wrap text-xs">
                <span className="text-text-secondary"><span className="text-text-muted">max:</span> {m.maxOutput}</span>
                {m.features.map(f => (
                  <span key={f} className="bg-bg-tertiary text-text-secondary px-2 py-0.5 rounded border border-border">
                    {f}
                  </span>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}

      <div className="bg-bg-secondary border border-border rounded-lg p-4 text-sm text-text-secondary">
        <p>
          For agents: same data at{' '}
          <Link href="/api-reference/multimodal" className="text-accent-primary hover:underline font-mono">/api/multimodal</Link>
          . Filter with <code className="font-mono">?modality=image|video|tts|stt</code>. Free, no auth, cached 10 min.
        </p>
      </div>
    </div>
  );
}
