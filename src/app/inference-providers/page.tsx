'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { Server, ExternalLink, Award } from 'lucide-react';

interface ProviderOffer {
  provider: string;
  providerModelId: string;
  inputPrice: number;
  outputPrice: number;
  blendedPrice: number;
  contextWindow: number;
  outputTPS: number | null;
  features: string[];
  url: string;
  note: string;
}

interface ModelMatrix {
  modelId: string;
  modelName: string;
  family: string;
  paramsB: number | null;
  license: string;
  openWeights: boolean;
  offers: ProviderOffer[];
}

interface MatrixResponse {
  ok: boolean;
  lastUpdated: string;
  tracked_providers: string[];
  count: number;
  models: ModelMatrix[];
}

const FAMILY_COLORS: Record<string, string> = {
  Meta: 'bg-blue-600/10 text-blue-300 border-blue-600/20',
  DeepSeek: 'bg-teal-500/10 text-teal-400 border-teal-500/20',
  Mistral: 'bg-orange-500/10 text-orange-400 border-orange-500/20',
  Alibaba: 'bg-rose-500/10 text-rose-400 border-rose-500/20',
};

const PROVIDER_COLORS: Record<string, string> = {
  'Together AI': 'bg-purple-500/10 text-purple-400 border-purple-500/20',
  Fireworks: 'bg-orange-500/10 text-orange-400 border-orange-500/20',
  DeepInfra: 'bg-cyan-500/10 text-cyan-400 border-cyan-500/20',
  Groq: 'bg-rose-500/10 text-rose-400 border-rose-500/20',
  OpenRouter: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20',
  Replicate: 'bg-pink-500/10 text-pink-400 border-pink-500/20',
  Anyscale: 'bg-amber-500/10 text-amber-400 border-amber-500/20',
  DeepSeek: 'bg-teal-500/10 text-teal-400 border-teal-500/20',
};

function formatTPS(tps: number | null): string {
  if (tps === null) return '—';
  return `${tps} t/s`;
}

function formatContext(n: number): string {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(0)}M`;
  if (n >= 1000) return `${(n / 1000).toFixed(0)}k`;
  return String(n);
}

export default function InferenceProvidersPage() {
  const [data, setData] = useState<MatrixResponse | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetch('https://tensorfeed.ai/api/inference-providers')
      .then(res => {
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        return res.json();
      })
      .then((json: MatrixResponse) => setData(json))
      .catch(e => setError(e instanceof Error ? e.message : 'Failed to load'));
  }, []);

  const PAGE_JSONLD = {
    '@context': 'https://schema.org',
    '@type': 'Dataset',
    name: 'TensorFeed Inference Provider Pricing Matrix',
    description:
      'Cross-provider pricing matrix for open-weight models across Together, Fireworks, Groq, DeepInfra, OpenRouter, Replicate, Anyscale, and first-party APIs (DeepSeek). Includes per-model output TPS, context window, and feature flags.',
    url: 'https://tensorfeed.ai/inference-providers',
    keywords: 'inference pricing, Together AI, Fireworks, Groq, DeepInfra, OpenRouter, Llama 4, DeepSeek V4, Mixtral, Qwen',
    creator: { '@type': 'Organization', name: 'TensorFeed.ai', url: 'https://tensorfeed.ai' },
    license: 'https://tensorfeed.ai/terms',
  };

  const FAQ_JSONLD = {
    '@context': 'https://schema.org',
    '@type': 'FAQPage',
    mainEntity: [
      {
        '@type': 'Question',
        name: 'Why does the same model cost different amounts at different providers?',
        acceptedAnswer: {
          '@type': 'Answer',
          text: 'Each inference provider runs its own GPU fleet, quantization strategy, and batching policy. Together and Fireworks tend to anchor on FP8 Turbo variants for speed; DeepInfra optimizes for raw cost; Groq runs custom LPU silicon for very high throughput. The price spread on a single model can be 3-10x for the same nominal weights.',
        },
      },
      {
        '@type': 'Question',
        name: 'Which inference provider is cheapest for Llama 4 Scout?',
        acceptedAnswer: {
          '@type': 'Answer',
          text: 'As of the current snapshot, DeepInfra at a blended $0.355 per 1M tokens. Together AI and Groq tie at $0.385. The cheapest path can be queried programmatically at /api/inference-providers/cheapest?model=llama-4-scout.',
        },
      },
      {
        '@type': 'Question',
        name: 'Which inference provider is fastest?',
        acceptedAnswer: {
          '@type': 'Answer',
          text: 'Groq, by a wide margin. Their custom LPU silicon serves Llama 4 Scout at ~950 output tokens per second versus Together at ~195 TPS and DeepInfra at ~170 TPS. The trade-off is a 128k context cap on Groq versus the 1M+ ceiling at Together and Fireworks.',
        },
      },
      {
        '@type': 'Question',
        name: 'Should I use OpenRouter or pick a specific provider?',
        acceptedAnswer: {
          '@type': 'Answer',
          text: 'OpenRouter is an aggregator that routes your call to whichever underlying provider is cheapest or available, so for a single workload it usually matches the cheapest direct provider price. Pick a specific provider when you need a guaranteed feature flag (function calling on Together vs json mode on Fireworks varies) or specific latency profile (Groq for TPS, DeepInfra for cost).',
        },
      },
    ],
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(PAGE_JSONLD) }} />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(FAQ_JSONLD) }} />

      <div className="mb-6">
        <div className="flex items-center gap-3 mb-3">
          <div className="p-2 rounded-lg bg-accent-primary/10">
            <Server className="w-7 h-7 text-accent-primary" />
          </div>
          <h1 className="text-3xl sm:text-4xl font-bold text-text-primary">Inference Provider Pricing</h1>
        </div>
        <p className="text-text-secondary text-lg max-w-3xl">
          Same open-weight model, different price across Together, Fireworks, Groq, DeepInfra, OpenRouter, Replicate, Anyscale, and first-party APIs. The price spread on a single model can be 3-10x for the same nominal weights. {data?.lastUpdated && `Updated ${data.lastUpdated}.`}
        </p>
      </div>

      <div className="max-w-4xl mb-8 text-text-secondary leading-relaxed space-y-3">
        <p>
          Each inference provider runs its own GPU fleet, quantization strategy, and batching policy. Together and Fireworks anchor on FP8 Turbo variants for speed. DeepInfra optimizes for raw cost. Groq runs custom LPU silicon for very high throughput at a context-window cost. OpenRouter routes across the others. The matrix below sorts every offer cheapest first per model, with the lowest-blended-price row marked.
        </p>
      </div>

      {error && (
        <div className="bg-rose-500/10 border border-rose-500/20 rounded-lg p-4 text-rose-400 text-sm mb-6">
          Error loading data: {error}
        </div>
      )}

      {data?.models.map(m => {
        const offers = [...m.offers].sort((a, b) => a.blendedPrice - b.blendedPrice);
        const cheapest = offers[0];
        return (
          <section key={m.modelId} className="mb-8 bg-bg-secondary border border-border rounded-lg p-4">
            <div className="flex items-start justify-between gap-3 flex-wrap mb-3">
              <div>
                <h2 className="text-xl font-semibold text-text-primary">{m.modelName}</h2>
                <div className="flex items-center gap-2 mt-1 flex-wrap">
                  <span className={`text-xs px-2 py-0.5 rounded-full border font-medium ${FAMILY_COLORS[m.family] || 'bg-bg-tertiary text-text-secondary border-border'}`}>
                    {m.family}
                  </span>
                  <span className="text-xs text-text-muted">{m.paramsB ? `${m.paramsB}B params` : ''}</span>
                  <span className="text-xs text-text-muted">{m.license}</span>
                </div>
              </div>
              <div className="text-right">
                <div className="text-xs text-text-muted">Cheapest blended</div>
                <div className="text-lg font-bold text-emerald-400 font-mono">${cheapest.blendedPrice.toFixed(3)}</div>
                <div className="text-xs text-text-muted">@ {cheapest.provider}</div>
              </div>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm">
                <thead>
                  <tr className="border-b border-border text-xs uppercase tracking-wide text-text-muted">
                    <th className="py-2 px-2">Provider</th>
                    <th className="py-2 px-2 text-right">Input $/1M</th>
                    <th className="py-2 px-2 text-right">Output $/1M</th>
                    <th className="py-2 px-2 text-right">Blended</th>
                    <th className="py-2 px-2 text-right">Output TPS</th>
                    <th className="py-2 px-2 text-right">Context</th>
                    <th className="py-2 px-2">Features</th>
                    <th className="py-2 px-2"></th>
                  </tr>
                </thead>
                <tbody>
                  {offers.map((o, i) => (
                    <tr key={o.provider} className={`border-b border-border/50 hover:bg-bg-tertiary/50 transition-colors ${i === 0 ? 'bg-emerald-500/5' : ''}`}>
                      <td className="py-2 px-2">
                        <span className={`text-xs px-2 py-0.5 rounded-full border font-medium ${PROVIDER_COLORS[o.provider] || 'bg-bg-tertiary text-text-secondary border-border'}`}>
                          {o.provider}
                        </span>
                        {i === 0 && <Award className="w-3 h-3 text-emerald-400 inline ml-1" />}
                      </td>
                      <td className="py-2 px-2 text-right font-mono text-text-primary">${o.inputPrice.toFixed(2)}</td>
                      <td className="py-2 px-2 text-right font-mono text-text-primary">${o.outputPrice.toFixed(2)}</td>
                      <td className="py-2 px-2 text-right font-mono text-text-primary">${o.blendedPrice.toFixed(3)}</td>
                      <td className="py-2 px-2 text-right font-mono text-text-secondary">{formatTPS(o.outputTPS)}</td>
                      <td className="py-2 px-2 text-right font-mono text-text-secondary">{formatContext(o.contextWindow)}</td>
                      <td className="py-2 px-2 text-xs text-text-muted">{o.features.join(', ')}</td>
                      <td className="py-2 px-2 text-right">
                        <a href={o.url} target="_blank" rel="noopener noreferrer" className="text-text-muted hover:text-accent-primary inline-flex items-center gap-0.5">
                          docs <ExternalLink className="w-3 h-3" />
                        </a>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>
        );
      })}

      {/* API note */}
      <div className="bg-bg-secondary border border-border rounded-lg p-4 text-sm text-text-secondary">
        <p>
          For agents: full matrix at{' '}
          <Link href="/api-reference/inference-providers" className="text-accent-primary hover:underline font-mono">/api/inference-providers</Link>
          . Cheapest path for one model at{' '}
          <Link href="/api-reference/inference-providers-cheapest" className="text-accent-primary hover:underline font-mono">/api/inference-providers/cheapest?model=&lt;id&gt;</Link>
          . Free, no auth, cached 10 min.
        </p>
      </div>
    </div>
  );
}
