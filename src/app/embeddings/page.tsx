'use client';

import { useEffect, useState, useMemo } from 'react';
import Link from 'next/link';
import { Network, ExternalLink } from 'lucide-react';

interface EmbeddingModel {
  id: string;
  name: string;
  provider: string;
  type: 'embedding' | 'reranker';
  dimensions: number | null;
  maxInputTokens: number;
  pricePer1MTokens: number | null;
  pricingNote: string;
  openSource: boolean;
  license: string;
  released: string;
  notes: string;
  multilingual: boolean;
  url: string;
  mtebAvg: number | null;
}

interface EmbeddingsResponse {
  ok: boolean;
  lastUpdated: string;
  count: number;
  models: EmbeddingModel[];
}

const PROVIDER_COLORS: Record<string, string> = {
  OpenAI: 'bg-green-500/10 text-green-400 border-green-500/20',
  'Voyage AI': 'bg-purple-500/10 text-purple-400 border-purple-500/20',
  Cohere: 'bg-pink-500/10 text-pink-400 border-pink-500/20',
  Google: 'bg-blue-500/10 text-blue-400 border-blue-500/20',
  Mistral: 'bg-orange-500/10 text-orange-400 border-orange-500/20',
  'Jina AI': 'bg-cyan-500/10 text-cyan-400 border-cyan-500/20',
  'Nomic AI': 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20',
  Mixedbread: 'bg-amber-500/10 text-amber-400 border-amber-500/20',
  BAAI: 'bg-teal-500/10 text-teal-400 border-teal-500/20',
};

type SortKey = 'price' | 'dimensions' | 'context' | 'mteb' | 'name';

export default function EmbeddingsPage() {
  const [data, setData] = useState<EmbeddingsResponse | null>(null);
  const [activeType, setActiveType] = useState<'all' | 'embedding' | 'reranker'>('embedding');
  const [sortKey, setSortKey] = useState<SortKey>('mteb');
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetch('https://tensorfeed.ai/api/embeddings')
      .then(res => {
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        return res.json();
      })
      .then((json: EmbeddingsResponse) => setData(json))
      .catch(e => setError(e instanceof Error ? e.message : 'Failed to load'));
  }, []);

  const filtered = useMemo(() => {
    if (!data) return [];
    let rows = data.models;
    if (activeType !== 'all') rows = rows.filter(m => m.type === activeType);
    return [...rows].sort((a, b) => {
      switch (sortKey) {
        case 'price':
          return (a.pricePer1MTokens ?? -1) - (b.pricePer1MTokens ?? -1);
        case 'dimensions':
          return (b.dimensions ?? 0) - (a.dimensions ?? 0);
        case 'context':
          return b.maxInputTokens - a.maxInputTokens;
        case 'mteb':
          return (b.mtebAvg ?? -1) - (a.mtebAvg ?? -1);
        case 'name':
          return a.name.localeCompare(b.name);
      }
    });
  }, [data, activeType, sortKey]);

  const PAGE_JSONLD = {
    '@context': 'https://schema.org',
    '@type': 'Dataset',
    name: 'TensorFeed AI Embedding Model Catalog',
    description:
      'Curated list of production embedding and reranker models with pricing, dimensions, max input tokens, MTEB score, and licensing.',
    url: 'https://tensorfeed.ai/embeddings',
    keywords: 'AI embeddings, RAG, vector embeddings, MTEB, OpenAI embeddings, Voyage AI, Cohere, reranker',
    creator: { '@type': 'Organization', name: 'TensorFeed.ai', url: 'https://tensorfeed.ai' },
    license: 'https://tensorfeed.ai/terms',
  };

  const FAQ_JSONLD = {
    '@context': 'https://schema.org',
    '@type': 'FAQPage',
    mainEntity: [
      {
        '@type': 'Question',
        name: 'What is the cheapest production embedding model in 2026?',
        acceptedAnswer: {
          '@type': 'Answer',
          text: 'OpenAI text-embedding-3-small and Voyage voyage-3-lite tie at $0.02 per 1M input tokens, with Jina jina-embeddings-v3 also at $0.02 (and Apache-licensed for self-hosting). For workloads where storage cost dominates, voyage-3-lite\'s 512-dim output is half the storage of the OpenAI 1536-dim default.',
        },
      },
      {
        '@type': 'Question',
        name: 'Which embedding model has the longest input context?',
        acceptedAnswer: {
          '@type': 'Answer',
          text: 'Voyage AI models (voyage-3, voyage-3-large, voyage-code-3) ship 32k input tokens, the longest in the catalog. OpenAI text-embedding-3 supports 8191. Cohere embed-v3 caps at 512 tokens, the shortest among hosted providers.',
        },
      },
      {
        '@type': 'Question',
        name: 'What is a reranker and when do I need one?',
        acceptedAnswer: {
          '@type': 'Answer',
          text: 'A reranker is a second-stage RAG model that takes a query plus N candidate documents from your initial vector retrieval and re-scores them in pairwise fashion. Rerankers materially improve precision when your initial retriever returns a noisy top-K. Cohere rerank-v3.5 and Voyage rerank-2 are the production defaults; jina-reranker-v2 is the open-weights option.',
        },
      },
      {
        '@type': 'Question',
        name: 'Can I self-host the open-weights embedding models?',
        acceptedAnswer: {
          '@type': 'Answer',
          text: 'Yes. Jina embeddings v3, Nomic Embed v1.5, mxbai-embed-large, and BGE-M3 are all open-weights and can be served via vLLM, Ollama, or text-embeddings-inference. The license column distinguishes Apache-2.0, MIT, and CC-BY-NC-4.0 (Jina is non-commercial; the rest are commercially usable).',
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
            <Network className="w-7 h-7 text-accent-primary" />
          </div>
          <h1 className="text-3xl sm:text-4xl font-bold text-text-primary">Embedding Models</h1>
        </div>
        <p className="text-text-secondary text-lg max-w-3xl">
          Every production embedding and reranker model with pricing, dimensions, max input tokens, MTEB score, and licensing. The catalog every RAG agent needs and nobody else publishes in machine-readable form. {data?.lastUpdated && `Updated ${data.lastUpdated}.`}
        </p>
      </div>

      {/* Editorial intro */}
      <div className="max-w-4xl mb-8 text-text-secondary leading-relaxed space-y-3">
        <p>
          Embeddings are the bottleneck nobody talks about. The model is whatever; the embedding is forever. If you switch from OpenAI 3-small to Voyage 3, you re-embed your entire corpus. So the choice deserves more than a five-minute scan, and the data deserves to be machine-readable.
        </p>
      </div>

      {/* Type filter + sort */}
      <div className="flex items-center gap-4 mb-6 flex-wrap">
        <div className="flex gap-2">
          {[
            { key: 'embedding', label: 'Embeddings' },
            { key: 'reranker', label: 'Rerankers' },
            { key: 'all', label: 'All' },
          ].map(t => (
            <button
              key={t.key}
              onClick={() => setActiveType(t.key as 'all' | 'embedding' | 'reranker')}
              className={`px-3.5 py-1.5 rounded-full text-sm font-medium transition-colors border ${
                activeType === t.key
                  ? 'bg-accent-primary text-white border-accent-primary'
                  : 'bg-bg-secondary text-text-secondary border-border hover:border-text-muted'
              }`}
            >
              {t.label}
            </button>
          ))}
        </div>
        <div className="flex items-center gap-2 text-sm">
          <span className="text-text-muted">Sort:</span>
          <select
            value={sortKey}
            onChange={(e) => setSortKey(e.target.value as SortKey)}
            className="bg-bg-secondary border border-border rounded px-2 py-1 text-sm text-text-primary"
          >
            <option value="mteb">MTEB score</option>
            <option value="price">Price (low to high)</option>
            <option value="context">Max input tokens</option>
            <option value="dimensions">Dimensions</option>
            <option value="name">Name</option>
          </select>
        </div>
      </div>

      {error && (
        <div className="bg-rose-500/10 border border-rose-500/20 rounded-lg p-4 text-rose-400 text-sm mb-6">
          Error loading data: {error}
        </div>
      )}

      {/* Table */}
      {data && (
        <div className="overflow-x-auto mb-10">
          <table className="w-full text-left text-sm">
            <thead>
              <tr className="border-b border-border text-xs uppercase tracking-wide text-text-muted">
                <th className="py-3 px-3">Model</th>
                <th className="py-3 px-3">Provider</th>
                <th className="py-3 px-3 text-right">Dimensions</th>
                <th className="py-3 px-3 text-right">Max input</th>
                <th className="py-3 px-3 text-right">$/1M tokens</th>
                <th className="py-3 px-3 text-right">MTEB avg</th>
                <th className="py-3 px-3">License</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map(m => (
                <tr key={m.id} className="border-b border-border/50 hover:bg-bg-tertiary/50 transition-colors align-top">
                  <td className="py-3 px-3">
                    <a href={m.url} target="_blank" rel="noopener noreferrer" className="font-semibold text-text-primary hover:text-accent-primary inline-flex items-center gap-1">
                      {m.name} <ExternalLink className="w-3 h-3 text-text-muted" />
                    </a>
                    <div className="text-xs text-text-muted mt-0.5">{m.notes}</div>
                  </td>
                  <td className="py-3 px-3">
                    <span className={`text-xs px-2 py-0.5 rounded-full border font-medium ${PROVIDER_COLORS[m.provider] || 'bg-bg-tertiary text-text-secondary border-border'}`}>
                      {m.provider}
                    </span>
                  </td>
                  <td className="py-3 px-3 text-right font-mono text-text-primary">
                    {m.dimensions ?? <span className="text-text-muted">—</span>}
                  </td>
                  <td className="py-3 px-3 text-right font-mono text-text-secondary">
                    {m.maxInputTokens.toLocaleString()}
                  </td>
                  <td className="py-3 px-3 text-right font-mono">
                    {m.pricePer1MTokens === null ? (
                      <span className="text-emerald-400">open</span>
                    ) : m.pricePer1MTokens === 0 ? (
                      <span className="text-text-muted">per-search</span>
                    ) : (
                      <span className="text-text-primary">${m.pricePer1MTokens.toFixed(2)}</span>
                    )}
                  </td>
                  <td className="py-3 px-3 text-right font-mono">
                    {m.mtebAvg !== null ? <span className="text-text-primary">{m.mtebAvg.toFixed(1)}</span> : <span className="text-text-muted">—</span>}
                  </td>
                  <td className="py-3 px-3 text-xs text-text-secondary">
                    {m.openSource && <span className="text-emerald-400 mr-1 font-mono">OSS</span>}
                    {m.license}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* API note */}
      <div className="bg-bg-secondary border border-border rounded-lg p-4 text-sm text-text-secondary">
        <p>
          For agents: same data at{' '}
          <Link href="/api-reference/embeddings" className="text-accent-primary hover:underline font-mono">/api/embeddings</Link>
          . Filter by <code className="font-mono">?type=embedding</code> or <code className="font-mono">?type=reranker</code>. Free, no auth, cached 10 min.
        </p>
      </div>
    </div>
  );
}
