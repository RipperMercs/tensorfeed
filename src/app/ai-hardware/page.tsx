'use client';

import { useEffect, useState, useMemo } from 'react';
import Link from 'next/link';
import { Microchip, ExternalLink } from 'lucide-react';

interface Hardware {
  id: string;
  name: string;
  manufacturer: string;
  family: string;
  process: string;
  released: string;
  memoryGB: number;
  memoryBandwidthTBs: number;
  fp16TFLOPS: number;
  fp8TFLOPS: number | null;
  fp4TFLOPS: number | null;
  tdpWatts: number;
  interconnect: string;
  listPriceUSD: number | null;
  availability: string;
  notes: string;
  url: string;
}

interface Response {
  ok: boolean;
  lastUpdated: string;
  count: number;
  hardware: Hardware[];
}

const MANUFACTURER_COLORS: Record<string, string> = {
  NVIDIA: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20',
  AMD: 'bg-rose-500/10 text-rose-400 border-rose-500/20',
  Google: 'bg-blue-500/10 text-blue-400 border-blue-500/20',
  AWS: 'bg-amber-500/10 text-amber-400 border-amber-500/20',
  Apple: 'bg-gray-500/10 text-gray-300 border-gray-500/20',
  Cerebras: 'bg-purple-500/10 text-purple-400 border-purple-500/20',
  Groq: 'bg-pink-500/10 text-pink-400 border-pink-500/20',
};

export default function AIHardwarePage() {
  const [data, setData] = useState<Response | null>(null);
  const [activeManufacturer, setActiveManufacturer] = useState<string>('all');
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetch('https://tensorfeed.ai/api/ai-hardware')
      .then(res => {
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        return res.json();
      })
      .then((json: Response) => setData(json))
      .catch(e => setError(e instanceof Error ? e.message : 'Failed to load'));
  }, []);

  const manufacturers = useMemo(() => {
    if (!data) return [];
    return Array.from(new Set(data.hardware.map(h => h.manufacturer)));
  }, [data]);

  const filtered = useMemo(() => {
    if (!data) return [];
    let rows = data.hardware;
    if (activeManufacturer !== 'all') rows = rows.filter(h => h.manufacturer === activeManufacturer);
    return [...rows].sort((a, b) => b.fp16TFLOPS - a.fp16TFLOPS);
  }, [data, activeManufacturer]);

  return (
    <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <div className="mb-6">
        <div className="flex items-center gap-3 mb-3">
          <div className="p-2 rounded-lg bg-accent-primary/10">
            <Microchip className="w-7 h-7 text-accent-primary" />
          </div>
          <h1 className="text-3xl sm:text-4xl font-bold text-text-primary">AI Hardware Specs</h1>
        </div>
        <p className="text-text-secondary text-lg max-w-3xl">
          The chips behind every AI workload. NVIDIA Blackwell + Hopper, AMD Instinct, Google TPU, AWS Trainium / Inferentia, Apple Silicon, Cerebras WSE-3, Groq LPU. FLOPS, VRAM, memory bandwidth, interconnect, TDP. Companion to <Link href="/gpu-pricing" className="text-accent-primary hover:underline">/gpu-pricing</Link> (rental rates). {data?.lastUpdated && `Updated ${data.lastUpdated}.`}
        </p>
      </div>

      <div className="flex gap-2 mb-6 flex-wrap">
        <button
          onClick={() => setActiveManufacturer('all')}
          className={`px-3.5 py-1.5 rounded-full text-sm font-medium transition-colors border ${
            activeManufacturer === 'all'
              ? 'bg-accent-primary text-white border-accent-primary'
              : 'bg-bg-secondary text-text-secondary border-border hover:border-text-muted'
          }`}
        >
          All
        </button>
        {manufacturers.map(m => (
          <button
            key={m}
            onClick={() => setActiveManufacturer(m)}
            className={`px-3.5 py-1.5 rounded-full text-sm font-medium transition-colors border ${
              activeManufacturer === m
                ? 'bg-accent-primary text-white border-accent-primary'
                : 'bg-bg-secondary text-text-secondary border-border hover:border-text-muted'
            }`}
          >
            {m}
          </button>
        ))}
      </div>

      {error && (
        <div className="bg-rose-500/10 border border-rose-500/20 rounded-lg p-4 text-rose-400 text-sm mb-6">
          Error loading data: {error}
        </div>
      )}

      {data && (
        <div className="overflow-x-auto mb-10">
          <table className="w-full text-left text-sm">
            <thead>
              <tr className="border-b border-border text-xs uppercase tracking-wide text-text-muted">
                <th className="py-3 px-3">Chip</th>
                <th className="py-3 px-3">Mfr</th>
                <th className="py-3 px-3 text-right">VRAM</th>
                <th className="py-3 px-3 text-right">BW</th>
                <th className="py-3 px-3 text-right">FP16 TFLOPS</th>
                <th className="py-3 px-3 text-right">FP8 TFLOPS</th>
                <th className="py-3 px-3 text-right">FP4 TFLOPS</th>
                <th className="py-3 px-3 text-right">TDP</th>
                <th className="py-3 px-3">Interconnect</th>
                <th className="py-3 px-3"></th>
              </tr>
            </thead>
            <tbody>
              {filtered.map(h => (
                <tr key={h.id} className="border-b border-border/50 hover:bg-bg-tertiary/50 align-top">
                  <td className="py-3 px-3">
                    <div className="font-semibold text-text-primary">{h.name}</div>
                    <div className="text-xs text-text-muted mt-0.5">{h.family} · {h.process} · {h.released}</div>
                  </td>
                  <td className="py-3 px-3">
                    <span className={`text-xs px-2 py-0.5 rounded-full border font-medium ${MANUFACTURER_COLORS[h.manufacturer] || 'bg-bg-tertiary text-text-secondary border-border'}`}>
                      {h.manufacturer}
                    </span>
                  </td>
                  <td className="py-3 px-3 text-right font-mono text-text-primary">{h.memoryGB} GB</td>
                  <td className="py-3 px-3 text-right font-mono text-text-secondary">{h.memoryBandwidthTBs.toFixed(1)} TB/s</td>
                  <td className="py-3 px-3 text-right font-mono text-text-primary">{h.fp16TFLOPS.toLocaleString()}</td>
                  <td className="py-3 px-3 text-right font-mono text-text-secondary">{h.fp8TFLOPS ? h.fp8TFLOPS.toLocaleString() : '—'}</td>
                  <td className="py-3 px-3 text-right font-mono text-text-secondary">{h.fp4TFLOPS ? h.fp4TFLOPS.toLocaleString() : '—'}</td>
                  <td className="py-3 px-3 text-right font-mono text-text-secondary">{h.tdpWatts ? `${h.tdpWatts}W` : '—'}</td>
                  <td className="py-3 px-3 text-xs text-text-muted">{h.interconnect}</td>
                  <td className="py-3 px-3 text-right">
                    <a href={h.url} target="_blank" rel="noopener noreferrer" className="text-text-muted hover:text-accent-primary inline-flex items-center gap-0.5">
                      docs <ExternalLink className="w-3 h-3" />
                    </a>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <div className="bg-bg-secondary border border-border rounded-lg p-4 text-sm text-text-secondary">
        <p>
          For agents: same data at{' '}
          <Link href="/api-reference/ai-hardware" className="text-accent-primary hover:underline font-mono">/api/ai-hardware</Link>
          . Filter with <code className="font-mono">?manufacturer=NVIDIA|AMD|Google|AWS|Apple|Cerebras|Groq</code>. Free, no auth, cached 10 min.
        </p>
      </div>
    </div>
  );
}
