'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { Mic, AudioLines, ExternalLink, TrendingUp, TrendingDown, Minus, Sparkles } from 'lucide-react';

interface TTSEntry {
  rank: number;
  model: string;
  provider: string;
  elo: number;
  trend: 'up' | 'down' | 'flat' | 'new';
  openWeights: boolean;
  notes: string;
}

interface STTEntry {
  rank: number;
  model: string;
  provider: string;
  englishWER: number;
  multilingualWER: number | null;
  rtf: number | null;
  openWeights: boolean;
  notes: string;
}

interface Response {
  ok: boolean;
  lastUpdated: string;
  ttsArena: { source: string; sourceUrl: string; window: string; rankings: TTSEntry[] };
  asrLeaderboard: { source: string; sourceUrl: string; benchmark: string; rankings: STTEntry[] };
}

const TREND: Record<string, { Icon: typeof TrendingUp; color: string }> = {
  up: { Icon: TrendingUp, color: 'text-emerald-400' },
  down: { Icon: TrendingDown, color: 'text-rose-400' },
  flat: { Icon: Minus, color: 'text-text-muted' },
  new: { Icon: Sparkles, color: 'text-amber-400' },
};

const RANK_TEXT: Record<number, string> = {
  1: 'text-yellow-400',
  2: 'text-gray-300',
  3: 'text-amber-600',
};

export default function VoiceLeaderboardsPage() {
  const [data, setData] = useState<Response | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetch('https://tensorfeed.ai/api/voice-leaderboards')
      .then(res => { if (!res.ok) throw new Error(`HTTP ${res.status}`); return res.json(); })
      .then((json: Response) => setData(json))
      .catch(e => setError(e instanceof Error ? e.message : 'Failed to load'));
  }, []);

  return (
    <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <div className="mb-6">
        <div className="flex items-center gap-3 mb-3">
          <div className="p-2 rounded-lg bg-accent-primary/10">
            <AudioLines className="w-7 h-7 text-accent-primary" />
          </div>
          <h1 className="text-3xl sm:text-4xl font-bold text-text-primary">Voice Leaderboards</h1>
        </div>
        <p className="text-text-secondary text-lg max-w-3xl">
          Live rankings for text-to-speech (TTS Arena Elo from human pairwise votes) and speech-to-text (Open ASR Leaderboard WER on LibriSpeech + Common Voice + AMI + GigaSpeech). Companion to <Link href="/multimodal" className="text-accent-primary hover:underline">/multimodal</Link> which is the pricing + spec catalog. {data?.lastUpdated && `Updated ${data.lastUpdated}.`}
        </p>
      </div>

      {error && <div className="bg-rose-500/10 border border-rose-500/20 rounded-lg p-4 text-rose-400 text-sm mb-6">Error: {error}</div>}

      {data && (
        <>
          {/* TTS */}
          <section className="mb-10">
            <div className="flex items-center justify-between mb-4 flex-wrap gap-2">
              <h2 className="text-xl font-semibold text-text-primary flex items-center gap-2">
                <AudioLines className="w-5 h-5 text-accent-primary" /> Text to Speech (TTS Arena)
              </h2>
              <a href={data.ttsArena.sourceUrl} target="_blank" rel="noopener noreferrer" className="text-xs text-accent-primary hover:underline inline-flex items-center gap-1">
                {data.ttsArena.source} <ExternalLink className="w-3 h-3" />
              </a>
            </div>
            <div className="space-y-2">
              {data.ttsArena.rankings.map(r => {
                const TrendIcon = TREND[r.trend].Icon;
                return (
                  <div key={`tts-${r.rank}`} className="bg-bg-secondary border border-border rounded-lg p-3 hover:border-accent-primary/50 transition-colors">
                    <div className="flex items-center gap-3 flex-wrap">
                      <span className={`font-bold text-lg ${RANK_TEXT[r.rank] || 'text-text-muted'} font-mono w-8 shrink-0 text-right`}>#{r.rank}</span>
                      <div className="flex-1 min-w-0">
                        <div className="font-semibold text-text-primary">{r.model}</div>
                        <div className="text-xs text-text-secondary mt-0.5">{r.notes}</div>
                      </div>
                      <div className="text-xs text-text-muted">{r.provider}</div>
                      <div className="text-right w-20">
                        <div className="font-mono text-text-primary font-semibold">{r.elo}</div>
                        <div className="text-xs text-text-muted">Elo</div>
                      </div>
                      <div className={`flex items-center gap-1 text-xs ${TREND[r.trend].color} w-12`}>
                        <TrendIcon className="w-3 h-3" />
                        {r.trend}
                      </div>
                      {r.openWeights && <span className="text-xs text-emerald-400 font-mono">OSS</span>}
                    </div>
                  </div>
                );
              })}
            </div>
          </section>

          {/* STT */}
          <section className="mb-10">
            <div className="flex items-center justify-between mb-4 flex-wrap gap-2">
              <h2 className="text-xl font-semibold text-text-primary flex items-center gap-2">
                <Mic className="w-5 h-5 text-accent-primary" /> Speech to Text (Open ASR Leaderboard)
              </h2>
              <a href={data.asrLeaderboard.sourceUrl} target="_blank" rel="noopener noreferrer" className="text-xs text-accent-primary hover:underline inline-flex items-center gap-1">
                {data.asrLeaderboard.source} <ExternalLink className="w-3 h-3" />
              </a>
            </div>
            <p className="text-xs text-text-muted mb-3">{data.asrLeaderboard.benchmark} · lower WER is better</p>
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm">
                <thead>
                  <tr className="border-b border-border text-xs uppercase tracking-wide text-text-muted">
                    <th className="py-2 px-2">Rank</th>
                    <th className="py-2 px-2">Model</th>
                    <th className="py-2 px-2">Provider</th>
                    <th className="py-2 px-2 text-right">English WER</th>
                    <th className="py-2 px-2 text-right">Multilingual WER</th>
                    <th className="py-2 px-2 text-right">RTF</th>
                    <th className="py-2 px-2"></th>
                  </tr>
                </thead>
                <tbody>
                  {data.asrLeaderboard.rankings.map(r => (
                    <tr key={`stt-${r.rank}`} className="border-b border-border/50 hover:bg-bg-tertiary/50 align-top">
                      <td className="py-2 px-2"><span className={`font-bold ${RANK_TEXT[r.rank] || 'text-text-muted'} font-mono`}>#{r.rank}</span></td>
                      <td className="py-2 px-2">
                        <div className="font-semibold text-text-primary">{r.model}</div>
                        <div className="text-xs text-text-muted">{r.notes}</div>
                      </td>
                      <td className="py-2 px-2 text-text-secondary text-xs">{r.provider}</td>
                      <td className="py-2 px-2 text-right font-mono text-text-primary">{r.englishWER.toFixed(1)}%</td>
                      <td className="py-2 px-2 text-right font-mono text-text-secondary">{r.multilingualWER ? `${r.multilingualWER.toFixed(1)}%` : '—'}</td>
                      <td className="py-2 px-2 text-right font-mono text-text-secondary">{r.rtf !== null ? r.rtf.toFixed(2) : '—'}</td>
                      <td className="py-2 px-2">{r.openWeights && <span className="text-xs text-emerald-400 font-mono">OSS</span>}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>
        </>
      )}

      <div className="bg-bg-secondary border border-border rounded-lg p-4 text-sm text-text-secondary">
        <p>For agents: same data at <Link href="/api-reference/voice-leaderboards" className="text-accent-primary hover:underline font-mono">/api/voice-leaderboards</Link>. Free, cached 30 min.</p>
      </div>
    </div>
  );
}
