'use client';

import { useEffect, useState, useMemo } from 'react';
import Link from 'next/link';
import { Store, ExternalLink, Check } from 'lucide-react';

interface Marketplace {
  id: string;
  name: string;
  vendor: string;
  category: string;
  itemCount: string;
  monetization: string;
  publishingModel: 'open' | 'curated' | 'invite-only';
  hasAPI: boolean;
  notableItems: string[];
  url: string;
  notes: string;
}

interface Response {
  ok: boolean;
  lastUpdated: string;
  count: number;
  marketplaces: Marketplace[];
}

const CATEGORY_LABEL: Record<string, string> = {
  gpts: 'GPTs',
  agents: 'Agents',
  skills: 'Skills',
  models: 'Models',
  spaces: 'Demo spaces',
  mcp: 'MCP servers',
  workflows: 'Workflows',
  plugins: 'Plugins',
};

const CATEGORY_COLORS: Record<string, string> = {
  gpts: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20',
  agents: 'bg-purple-500/10 text-purple-400 border-purple-500/20',
  skills: 'bg-blue-500/10 text-blue-400 border-blue-500/20',
  models: 'bg-amber-500/10 text-amber-400 border-amber-500/20',
  spaces: 'bg-cyan-500/10 text-cyan-400 border-cyan-500/20',
  mcp: 'bg-rose-500/10 text-rose-400 border-rose-500/20',
  workflows: 'bg-pink-500/10 text-pink-400 border-pink-500/20',
  plugins: 'bg-teal-500/10 text-teal-400 border-teal-500/20',
};

export default function MarketplacesPage() {
  const [data, setData] = useState<Response | null>(null);
  const [activeCategory, setActiveCategory] = useState<string>('all');
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetch('https://tensorfeed.ai/api/marketplaces')
      .then(res => { if (!res.ok) throw new Error(`HTTP ${res.status}`); return res.json(); })
      .then((json: Response) => setData(json))
      .catch(e => setError(e instanceof Error ? e.message : 'Failed to load'));
  }, []);

  const categories = useMemo(() => {
    if (!data) return [];
    return Array.from(new Set(data.marketplaces.map(m => m.category)));
  }, [data]);

  const filtered = useMemo(() => {
    if (!data) return [];
    if (activeCategory === 'all') return data.marketplaces;
    return data.marketplaces.filter(m => m.category === activeCategory);
  }, [data, activeCategory]);

  return (
    <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <div className="mb-6">
        <div className="flex items-center gap-3 mb-3">
          <div className="p-2 rounded-lg bg-accent-primary/10">
            <Store className="w-7 h-7 text-accent-primary" />
          </div>
          <h1 className="text-3xl sm:text-4xl font-bold text-text-primary">AI Marketplaces</h1>
        </div>
        <p className="text-text-secondary text-lg max-w-3xl">
          Where humans and agents browse, install, and monetize AI products. GPTs (OpenAI), Skills (Claude), Models + Spaces (Hugging Face), Replicate, MCP Registry, CrewAI Marketplace, Apify Store, Replit, Vercel, Glama. Each entry: item count, monetization model, publishing model, API discoverability. {data?.lastUpdated && `Updated ${data.lastUpdated}.`}
        </p>
      </div>

      <div className="flex gap-2 mb-6 flex-wrap">
        <button onClick={() => setActiveCategory('all')}
          className={`px-3.5 py-1.5 rounded-full text-sm font-medium transition-colors border ${
            activeCategory === 'all' ? 'bg-accent-primary text-white border-accent-primary' : 'bg-bg-secondary text-text-secondary border-border hover:border-text-muted'
          }`}
        >All</button>
        {categories.map(c => (
          <button key={c} onClick={() => setActiveCategory(c)}
            className={`px-3.5 py-1.5 rounded-full text-sm font-medium transition-colors border ${
              activeCategory === c ? 'bg-accent-primary text-white border-accent-primary' : 'bg-bg-secondary text-text-secondary border-border hover:border-text-muted'
            }`}
          >{CATEGORY_LABEL[c] || c}</button>
        ))}
      </div>

      {error && <div className="bg-rose-500/10 border border-rose-500/20 rounded-lg p-4 text-rose-400 text-sm mb-6">Error: {error}</div>}

      {data && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mb-10">
          {filtered.map(m => (
            <a key={m.id} href={m.url} target="_blank" rel="noopener noreferrer" className="block bg-bg-secondary border border-border rounded-lg p-4 hover:border-accent-primary transition-colors">
              <div className="flex items-start justify-between gap-2 mb-2">
                <div className="min-w-0">
                  <div className="font-semibold text-text-primary inline-flex items-center gap-1">
                    {m.name} <ExternalLink className="w-3 h-3 text-text-muted" />
                  </div>
                  <div className="text-xs text-text-muted mt-0.5">{m.vendor}</div>
                </div>
                <span className={`text-xs px-2 py-0.5 rounded-full border font-medium ${CATEGORY_COLORS[m.category]}`}>{CATEGORY_LABEL[m.category]}</span>
              </div>
              <p className="text-sm text-text-secondary leading-relaxed mb-3">{m.notes}</p>
              <div className="grid grid-cols-2 gap-2 text-xs mb-3">
                <div>
                  <div className="text-text-muted uppercase tracking-wide mb-0.5">Item count</div>
                  <div className="font-mono text-text-primary">{m.itemCount}</div>
                </div>
                <div>
                  <div className="text-text-muted uppercase tracking-wide mb-0.5">Publishing</div>
                  <div className="text-text-secondary">{m.publishingModel}</div>
                </div>
              </div>
              <p className="text-xs text-text-muted italic mb-2">{m.monetization}</p>
              <div className="flex items-center gap-1 flex-wrap">
                {m.hasAPI && (
                  <span className="text-xs px-2 py-0.5 rounded border bg-emerald-500/10 text-emerald-400 border-emerald-500/20 inline-flex items-center gap-1">
                    <Check className="w-3 h-3" /> API
                  </span>
                )}
                {m.notableItems.slice(0, 4).map(item => (
                  <span key={item} className="text-xs bg-bg-tertiary text-text-secondary border border-border px-2 py-0.5 rounded">{item}</span>
                ))}
              </div>
            </a>
          ))}
        </div>
      )}

      <div className="bg-bg-secondary border border-border rounded-lg p-4 text-sm text-text-secondary">
        <p>For agents: same data at <Link href="/api-reference/marketplaces" className="text-accent-primary hover:underline font-mono">/api/marketplaces</Link>. Filter with <code className="font-mono">?category=gpts|agents|skills|models|spaces|mcp|workflows|plugins</code>. Free, cached 10 min.</p>
      </div>
    </div>
  );
}
