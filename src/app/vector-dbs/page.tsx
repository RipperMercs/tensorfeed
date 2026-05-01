'use client';

import { useEffect, useState, useMemo } from 'react';
import Link from 'next/link';
import { Database, ExternalLink, Check } from 'lucide-react';

interface VectorDB {
  id: string;
  name: string;
  type: 'managed' | 'oss' | 'hybrid';
  hostingOptions: string[];
  freeTier: string | null;
  startingPriceUSDMonth: number | null;
  pricingNote: string;
  hybridSearch: boolean;
  metadataFiltering: boolean;
  multiTenancy: boolean;
  serverless: boolean;
  maxVectorsPaid: string;
  openSource: boolean;
  license: string;
  released: string;
  url: string;
  notes: string;
}

interface Response {
  ok: boolean;
  lastUpdated: string;
  count: number;
  databases: VectorDB[];
}

const TYPE_LABELS: Record<string, string> = {
  managed: 'Managed only',
  oss: 'Open source',
  hybrid: 'Both',
};

const TYPE_COLORS: Record<string, string> = {
  managed: 'bg-purple-500/10 text-purple-400 border-purple-500/20',
  oss: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20',
  hybrid: 'bg-blue-500/10 text-blue-400 border-blue-500/20',
};

function CapBadge({ on, label }: { on: boolean; label: string }) {
  return (
    <span className={`text-xs px-2 py-0.5 rounded border font-medium ${on ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20' : 'bg-bg-tertiary text-text-muted border-border'}`}>
      {on && <Check className="w-3 h-3 inline mr-0.5" />}
      {label}
    </span>
  );
}

export default function VectorDBsPage() {
  const [data, setData] = useState<Response | null>(null);
  const [filter, setFilter] = useState<'all' | 'managed' | 'oss' | 'hybrid'>('all');
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetch('https://tensorfeed.ai/api/vector-dbs')
      .then(res => {
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        return res.json();
      })
      .then((json: Response) => setData(json))
      .catch(e => setError(e instanceof Error ? e.message : 'Failed to load'));
  }, []);

  const filtered = useMemo(() => {
    if (!data) return [];
    let dbs = data.databases;
    if (filter !== 'all') dbs = dbs.filter(d => d.type === filter);
    return dbs;
  }, [data, filter]);

  const PAGE_JSONLD = {
    '@context': 'https://schema.org',
    '@type': 'Dataset',
    name: 'TensorFeed Vector Database Catalog',
    description:
      'Curated catalog of production vector databases for RAG agents with pricing, free tiers, hybrid search support, multi-tenancy, license, and hosting options.',
    url: 'https://tensorfeed.ai/vector-dbs',
    keywords: 'vector database, RAG, Pinecone, Turbopuffer, Qdrant, Weaviate, Milvus, pgvector, LanceDB, vector search',
    creator: { '@type': 'Organization', name: 'TensorFeed.ai', url: 'https://tensorfeed.ai' },
    license: 'https://tensorfeed.ai/terms',
  };

  const FAQ_JSONLD = {
    '@context': 'https://schema.org',
    '@type': 'FAQPage',
    mainEntity: [
      {
        '@type': 'Question',
        name: 'What is the cheapest hosted vector database in 2026?',
        acceptedAnswer: {
          '@type': 'Answer',
          text: 'Turbopuffer is the cheapest at-scale managed vector DB by storing vectors on object storage (S3/GCS) and caching hot data in memory. Pricing is pure usage-based: $0.30 per 1M reads, $0.10 per 1M writes, $0.20 per GB-month. For small workloads pgvector on Supabase or Neon free tiers is effectively free.',
        },
      },
      {
        '@type': 'Question',
        name: 'Which vector database is best for hybrid search (BM25 + vector)?',
        acceptedAnswer: {
          '@type': 'Answer',
          text: 'Vespa is the strongest hybrid retrieval engine in the catalog (steepest learning curve too). Weaviate and Elasticsearch are close runners-up with first-class hybrid scoring (RRF). Qdrant has native sparse-vector support which covers most hybrid use cases. Chroma and most embedded options do not support hybrid search natively.',
        },
      },
      {
        '@type': 'Question',
        name: 'What is the difference between managed, oss, and hybrid in this catalog?',
        acceptedAnswer: {
          '@type': 'Answer',
          text: 'Managed = SaaS only (Pinecone, Turbopuffer). OSS = open source self-host only (pgvector, OpenSearch). Hybrid = both, with feature parity between cloud and self-host (Qdrant, Weaviate, Milvus, Chroma, LanceDB, Vespa). The hybrid category is usually the safest pick if you might need to migrate or run an air-gapped instance.',
        },
      },
      {
        '@type': 'Question',
        name: 'Is pgvector good enough for production RAG?',
        acceptedAnswer: {
          '@type': 'Answer',
          text: 'Yes for small-to-medium workloads (under 10M vectors per index, sub-100ms p99 latency target). Beyond that you start hitting Postgres scaling ceilings: ingestion throughput on large indexes, query latency under high write load, and connection pool contention. Switch to a dedicated vector DB when those become real constraints, not before.',
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
            <Database className="w-7 h-7 text-accent-primary" />
          </div>
          <h1 className="text-3xl sm:text-4xl font-bold text-text-primary">Vector Databases</h1>
        </div>
        <p className="text-text-secondary text-lg max-w-3xl">
          Production vector databases and self-hostable engines with pricing, free tiers, hybrid search, multi-tenancy, license, and hosting options. The RAG infrastructure layer every vector-search agent has to pick from. {data?.lastUpdated && `Updated ${data.lastUpdated}.`}
        </p>
      </div>

      {/* Filter */}
      <div className="flex gap-2 mb-6 flex-wrap">
        {(['all', 'managed', 'hybrid', 'oss'] as const).map(t => (
          <button
            key={t}
            onClick={() => setFilter(t)}
            className={`px-3.5 py-1.5 rounded-full text-sm font-medium transition-colors border ${
              filter === t
                ? 'bg-accent-primary text-white border-accent-primary'
                : 'bg-bg-secondary text-text-secondary border-border hover:border-text-muted'
            }`}
          >
            {t === 'all' ? 'All' : TYPE_LABELS[t]}
          </button>
        ))}
      </div>

      {error && (
        <div className="bg-rose-500/10 border border-rose-500/20 rounded-lg p-4 text-rose-400 text-sm mb-6">
          Error loading data: {error}
        </div>
      )}

      {data && (
        <div className="space-y-3 mb-10">
          {filtered.map(db => (
            <div key={db.id} className="bg-bg-secondary border border-border rounded-lg p-4 hover:border-accent-primary/50 transition-colors">
              <div className="flex items-start justify-between gap-3 flex-wrap mb-2">
                <div className="min-w-0">
                  <a href={db.url} target="_blank" rel="noopener noreferrer" className="font-semibold text-text-primary text-lg hover:text-accent-primary inline-flex items-center gap-1">
                    {db.name} <ExternalLink className="w-3 h-3 text-text-muted" />
                  </a>
                  <div className="text-xs text-text-muted mt-0.5">
                    <span className={`inline-block text-xs px-2 py-0.5 rounded-full border font-medium mr-2 ${TYPE_COLORS[db.type]}`}>
                      {TYPE_LABELS[db.type]}
                    </span>
                    Hosting: {db.hostingOptions.join(', ')} · License: {db.license}
                  </div>
                </div>
                <div className="text-right">
                  <div className="text-xs text-text-muted">Starts at</div>
                  <div className="text-lg font-bold font-mono text-text-primary">
                    {db.startingPriceUSDMonth === 0
                      ? <span className="text-emerald-400">usage-based</span>
                      : db.startingPriceUSDMonth === null
                        ? 'open source'
                        : <>${db.startingPriceUSDMonth}<span className="text-xs text-text-muted">/mo</span></>}
                  </div>
                </div>
              </div>
              <p className="text-sm text-text-secondary leading-relaxed mb-2">{db.notes}</p>
              {db.freeTier && (
                <p className="text-xs text-emerald-400 mb-2">
                  Free tier: {db.freeTier}
                </p>
              )}
              <p className="text-xs text-text-muted italic mb-3">{db.pricingNote}</p>
              <div className="flex items-center gap-1.5 flex-wrap">
                <CapBadge on={db.hybridSearch} label="Hybrid search" />
                <CapBadge on={db.metadataFiltering} label="Metadata filter" />
                <CapBadge on={db.multiTenancy} label="Multi-tenancy" />
                <CapBadge on={db.serverless} label="Serverless" />
                <CapBadge on={db.openSource} label="Open source" />
              </div>
            </div>
          ))}
        </div>
      )}

      <div className="bg-bg-secondary border border-border rounded-lg p-4 text-sm text-text-secondary">
        <p>
          For agents: same data at{' '}
          <Link href="/api-reference/vector-dbs" className="text-accent-primary hover:underline font-mono">/api/vector-dbs</Link>
          . Filter with <code className="font-mono">?type=managed|oss|hybrid</code> or <code className="font-mono">?open_source=true</code>. Free, no auth, cached 10 min.
        </p>
      </div>
    </div>
  );
}
