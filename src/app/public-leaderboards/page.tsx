'use client';

import { useEffect, useState, useMemo } from 'react';
import Link from 'next/link';
import { Trophy, ExternalLink, Check } from 'lucide-react';

interface Leaderboard {
  id: string;
  name: string;
  publisher: string;
  scope: string;
  updateCadence: string;
  scoreType: string;
  domain: string;
  live: boolean;
  hasAPI: boolean;
  url: string;
  notes: string;
}

interface Response {
  ok: boolean;
  lastUpdated: string;
  count: number;
  leaderboards: Leaderboard[];
}

const DOMAIN_LABEL: Record<string, string> = {
  general: 'General',
  code: 'Code',
  math: 'Math',
  reasoning: 'Reasoning',
  multimodal: 'Multimodal',
  agent: 'Agent',
  safety: 'Safety',
  voice: 'Voice',
  image: 'Image',
  video: 'Video',
  'long-context': 'Long context',
  'open-models': 'Open models',
};

const DOMAIN_COLORS: Record<string, string> = {
  general: 'bg-blue-500/10 text-blue-400 border-blue-500/20',
  code: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20',
  math: 'bg-purple-500/10 text-purple-400 border-purple-500/20',
  reasoning: 'bg-amber-500/10 text-amber-400 border-amber-500/20',
  multimodal: 'bg-pink-500/10 text-pink-400 border-pink-500/20',
  agent: 'bg-rose-500/10 text-rose-400 border-rose-500/20',
  safety: 'bg-rose-500/10 text-rose-400 border-rose-500/20',
  voice: 'bg-cyan-500/10 text-cyan-400 border-cyan-500/20',
  image: 'bg-pink-500/10 text-pink-400 border-pink-500/20',
  video: 'bg-purple-500/10 text-purple-400 border-purple-500/20',
  'long-context': 'bg-teal-500/10 text-teal-400 border-teal-500/20',
  'open-models': 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20',
};

export default function PublicLeaderboardsPage() {
  const [data, setData] = useState<Response | null>(null);
  const [activeDomain, setActiveDomain] = useState<string>('all');
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetch('https://tensorfeed.ai/api/public-leaderboards')
      .then(res => { if (!res.ok) throw new Error(`HTTP ${res.status}`); return res.json(); })
      .then((json: Response) => setData(json))
      .catch(e => setError(e instanceof Error ? e.message : 'Failed to load'));
  }, []);

  const domains = useMemo(() => {
    if (!data) return [];
    return Array.from(new Set(data.leaderboards.map(l => l.domain)));
  }, [data]);

  const filtered = useMemo(() => {
    if (!data) return [];
    if (activeDomain === 'all') return data.leaderboards;
    return data.leaderboards.filter(l => l.domain === activeDomain);
  }, [data, activeDomain]);

  return (
    <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <div className="mb-6">
        <div className="flex items-center gap-3 mb-3">
          <div className="p-2 rounded-lg bg-accent-primary/10">
            <Trophy className="w-7 h-7 text-accent-primary" />
          </div>
          <h1 className="text-3xl sm:text-4xl font-bold text-text-primary">Public Leaderboards</h1>
        </div>
        <p className="text-text-secondary text-lg max-w-3xl">
          Pointers to every live, public AI model leaderboard. LMSYS Chatbot Arena, Artificial Analysis, HF Open LLM Leaderboard, SWE-bench Verified, Aider Polyglot, LiveCodeBench, BigCodeBench, Terminal-Bench, ARC Prize, MMLU-Pro, HLE, MMMU, Video Arena, Image Arena, TTS Arena, Open ASR, RULER, GAIA, WebArena, OSWorld. Different from <Link href="/benchmark-registry" className="text-accent-primary hover:underline">/benchmark-registry</Link> (the eval suites themselves); this is where to find the live rankings. {data?.lastUpdated && `Updated ${data.lastUpdated}.`}
        </p>
      </div>

      <div className="flex gap-2 mb-6 flex-wrap">
        <button onClick={() => setActiveDomain('all')}
          className={`px-3.5 py-1.5 rounded-full text-sm font-medium transition-colors border ${
            activeDomain === 'all' ? 'bg-accent-primary text-white border-accent-primary' : 'bg-bg-secondary text-text-secondary border-border hover:border-text-muted'
          }`}
        >All</button>
        {domains.map(d => (
          <button key={d} onClick={() => setActiveDomain(d)}
            className={`px-3.5 py-1.5 rounded-full text-sm font-medium transition-colors border ${
              activeDomain === d ? 'bg-accent-primary text-white border-accent-primary' : 'bg-bg-secondary text-text-secondary border-border hover:border-text-muted'
            }`}
          >{DOMAIN_LABEL[d] || d}</button>
        ))}
      </div>

      {error && <div className="bg-rose-500/10 border border-rose-500/20 rounded-lg p-4 text-rose-400 text-sm mb-6">Error: {error}</div>}

      {data && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mb-10">
          {filtered.map(l => (
            <a key={l.id} href={l.url} target="_blank" rel="noopener noreferrer" className="block bg-bg-secondary border border-border rounded-lg p-4 hover:border-accent-primary transition-colors">
              <div className="flex items-start justify-between gap-2 mb-2">
                <div className="min-w-0">
                  <div className="font-semibold text-text-primary inline-flex items-center gap-1">
                    {l.name} <ExternalLink className="w-3 h-3 text-text-muted" />
                  </div>
                  <div className="text-xs text-text-muted mt-0.5">{l.publisher}</div>
                </div>
                <span className={`text-xs px-2 py-0.5 rounded-full border font-medium ${DOMAIN_COLORS[l.domain] || 'bg-bg-tertiary text-text-secondary border-border'}`}>{DOMAIN_LABEL[l.domain] || l.domain}</span>
              </div>
              <p className="text-sm text-text-secondary leading-relaxed mb-2">{l.scope}</p>
              <p className="text-xs text-text-muted mb-2">Score: {l.scoreType} · Updates: {l.updateCadence}</p>
              <p className="text-xs text-text-secondary leading-relaxed mb-2">{l.notes}</p>
              <div className="flex items-center gap-1 flex-wrap">
                {l.live && <span className="text-xs px-2 py-0.5 rounded border bg-emerald-500/10 text-emerald-400 border-emerald-500/20">Live</span>}
                {l.hasAPI && (
                  <span className="text-xs px-2 py-0.5 rounded border bg-emerald-500/10 text-emerald-400 border-emerald-500/20 inline-flex items-center gap-1">
                    <Check className="w-3 h-3" /> API
                  </span>
                )}
              </div>
            </a>
          ))}
        </div>
      )}

      <div className="bg-bg-secondary border border-border rounded-lg p-4 text-sm text-text-secondary">
        <p>For agents: same data at <Link href="/api-reference/public-leaderboards" className="text-accent-primary hover:underline font-mono">/api/public-leaderboards</Link>. Filter with <code className="font-mono">?domain=general|code|math|reasoning|multimodal|agent|voice|image|video|long-context|open-models</code>. Free, cached 10 min.</p>
      </div>
    </div>
  );
}
