'use client';

import { useEffect, useState, useMemo } from 'react';
import Link from 'next/link';
import { CreditCard, ExternalLink } from 'lucide-react';

interface Adopter {
  id: string;
  name: string;
  org: string;
  category: string;
  status: string;
  networks: string[];
  tokens: string[];
  x402Methods: string[];
  endpointUrl: string | null;
  websiteUrl: string;
  repoUrl: string | null;
  docsUrl: string | null;
  lastVerified: string;
  notes: string;
}

interface ApiResponse {
  ok: boolean;
  spec_url: string;
  lastUpdated: string;
  count: number;
  adopters: Adopter[];
}

const CATEGORY_LABEL: Record<string, string> = {
  publisher: 'Publisher',
  sdk: 'SDK',
  gateway: 'Gateway',
  reference: 'Reference',
  spec: 'Spec',
};

const CATEGORY_COLORS: Record<string, string> = {
  publisher: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20',
  sdk: 'bg-blue-500/10 text-blue-400 border-blue-500/20',
  gateway: 'bg-purple-500/10 text-purple-400 border-purple-500/20',
  reference: 'bg-amber-500/10 text-amber-400 border-amber-500/20',
  spec: 'bg-slate-500/10 text-slate-400 border-slate-500/20',
};

const STATUS_COLORS: Record<string, string> = {
  live: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20',
  beta: 'bg-blue-500/10 text-blue-400 border-blue-500/20',
  announced: 'bg-amber-500/10 text-amber-400 border-amber-500/20',
  'reference-impl': 'bg-purple-500/10 text-purple-400 border-purple-500/20',
  sdk: 'bg-blue-500/10 text-blue-400 border-blue-500/20',
  gateway: 'bg-purple-500/10 text-purple-400 border-purple-500/20',
  spec: 'bg-slate-500/10 text-slate-400 border-slate-500/20',
};

const CATEGORY_ORDER = ['spec', 'publisher', 'gateway', 'sdk', 'reference'];

export default function X402AdoptersPage() {
  const [data, setData] = useState<ApiResponse | null>(null);
  const [activeCategory, setActiveCategory] = useState<string>('all');
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetch('https://tensorfeed.ai/api/x402-adopters')
      .then(res => { if (!res.ok) throw new Error(`HTTP ${res.status}`); return res.json(); })
      .then((json: ApiResponse) => setData(json))
      .catch(e => setError(e instanceof Error ? e.message : 'Failed to load'));
  }, []);

  const categories = useMemo(() => {
    if (!data) return [];
    const present = new Set(data.adopters.map(a => a.category));
    return CATEGORY_ORDER.filter(c => present.has(c));
  }, [data]);

  const filtered = useMemo(() => {
    if (!data) return [];
    if (activeCategory === 'all') return data.adopters;
    return data.adopters.filter(a => a.category === activeCategory);
  }, [data, activeCategory]);

  return (
    <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <div className="mb-6">
        <div className="flex items-center gap-3 mb-3">
          <div className="p-2 rounded-lg bg-accent-primary/10">
            <CreditCard className="w-7 h-7 text-accent-primary" />
          </div>
          <h1 className="text-3xl sm:text-4xl font-bold text-text-primary">x402 Adopters</h1>
        </div>
        <p className="text-text-secondary text-lg max-w-3xl">
          Curated catalog of who actually speaks the x402 HTTP-payment protocol today. The universe is intentionally small: live production publishers, canonical SDKs, deployable gateways, and reference implementations. Submit additions via{' '}
          <a href="https://github.com/RipperMercs/tensorfeed/issues" target="_blank" rel="noopener noreferrer" className="text-accent-primary hover:underline">GitHub issues</a>{' '}
          with a verifiable link. {data?.lastUpdated && `Updated ${data.lastUpdated}.`}
        </p>
      </div>

      <div className="flex gap-2 mb-6 flex-wrap items-center">
        <span className="text-xs text-text-muted uppercase tracking-wide">Category:</span>
        <button
          onClick={() => setActiveCategory('all')}
          className={`px-3 py-1 rounded-full text-xs font-medium transition-colors border ${
            activeCategory === 'all' ? 'bg-accent-primary text-white border-accent-primary' : 'bg-bg-secondary text-text-secondary border-border hover:border-text-muted'
          }`}
        >All</button>
        {categories.map(c => (
          <button key={c} onClick={() => setActiveCategory(c)}
            className={`px-3 py-1 rounded-full text-xs font-medium transition-colors border ${
              activeCategory === c ? 'bg-accent-primary text-white border-accent-primary' : 'bg-bg-secondary text-text-secondary border-border hover:border-text-muted'
            }`}
          >{CATEGORY_LABEL[c] || c}</button>
        ))}
      </div>

      {error && (
        <div className="bg-rose-500/10 border border-rose-500/20 rounded-lg p-4 text-rose-400 text-sm mb-6">Error: {error}</div>
      )}

      {data && (
        <div className="space-y-3 mb-10">
          {filtered.map(a => (
            <article key={a.id} className="bg-bg-secondary border border-border rounded-lg p-4 hover:border-accent-primary/50 transition-colors">
              <div className="flex items-start justify-between gap-3 flex-wrap mb-2">
                <div className="min-w-0">
                  <h2 className="font-semibold text-text-primary text-lg">{a.name}</h2>
                  <div className="text-xs text-text-muted mt-0.5">
                    {a.org} · verified {a.lastVerified}
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <span className={`text-xs px-2 py-0.5 rounded-full border font-medium ${CATEGORY_COLORS[a.category] || ''}`}>
                    {CATEGORY_LABEL[a.category] || a.category}
                  </span>
                  <span className={`text-xs px-2 py-0.5 rounded-full border font-medium ${STATUS_COLORS[a.status] || ''}`}>
                    {a.status}
                  </span>
                </div>
              </div>
              <p className="text-sm text-text-secondary leading-relaxed mb-3">{a.notes}</p>
              <div className="flex items-center gap-1.5 flex-wrap text-xs">
                {a.networks.map(n => (
                  <span key={n} className="bg-bg-tertiary text-text-secondary border border-border px-2 py-0.5 rounded">
                    {n}
                  </span>
                ))}
                {a.tokens.map(t => (
                  <span key={t} className="bg-bg-tertiary text-text-secondary border border-border px-2 py-0.5 rounded">
                    {t}
                  </span>
                ))}
                {a.x402Methods.map(m => (
                  <span key={m} className="bg-bg-tertiary text-text-secondary border border-border px-2 py-0.5 rounded font-mono">
                    method: {m}
                  </span>
                ))}
                <a href={a.websiteUrl} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1 px-2 py-0.5 rounded border border-border bg-bg-tertiary text-text-secondary hover:text-accent-primary hover:border-accent-primary/40">
                  site <ExternalLink className="w-2.5 h-2.5" />
                </a>
                {a.repoUrl && (
                  <a href={a.repoUrl} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1 px-2 py-0.5 rounded border border-border bg-bg-tertiary text-text-secondary hover:text-accent-primary hover:border-accent-primary/40">
                    repo <ExternalLink className="w-2.5 h-2.5" />
                  </a>
                )}
                {a.docsUrl && (
                  <a href={a.docsUrl} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1 px-2 py-0.5 rounded border border-border bg-bg-tertiary text-text-secondary hover:text-accent-primary hover:border-accent-primary/40">
                    docs <ExternalLink className="w-2.5 h-2.5" />
                  </a>
                )}
                {a.endpointUrl && (
                  <a href={a.endpointUrl} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1 px-2 py-0.5 rounded border border-border bg-bg-tertiary text-text-secondary hover:text-accent-primary hover:border-accent-primary/40">
                    endpoint <ExternalLink className="w-2.5 h-2.5" />
                  </a>
                )}
              </div>
            </article>
          ))}
        </div>
      )}

      <div className="bg-bg-secondary border border-border rounded-lg p-4 text-sm text-text-secondary">
        <p>For agents: same data at{' '}
          <Link href="/api-reference/x402-adopters" className="text-accent-primary hover:underline font-mono">/api/x402-adopters</Link>. Filter with <code className="font-mono">?category=publisher|sdk|gateway|reference|spec</code> or <code className="font-mono">?status=live|announced|sdk|gateway</code>. Free, no auth, cached 10 min. Spec at <a href="https://x402.org" target="_blank" rel="noopener noreferrer" className="text-accent-primary hover:underline">x402.org</a>.
        </p>
      </div>

      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify({
            '@context': 'https://schema.org',
            '@type': 'CollectionPage',
            name: 'x402 Adopters Tracker',
            url: 'https://tensorfeed.ai/x402-adopters',
            description:
              'Curated catalog of publishers, SDKs, gateways, and references speaking the x402 HTTP-payment protocol.',
            isPartOf: { '@type': 'WebSite', name: 'TensorFeed', url: 'https://tensorfeed.ai' },
          }),
        }}
      />
    </div>
  );
}
