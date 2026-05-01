'use client';

import { useEffect, useState, useMemo } from 'react';
import Link from 'next/link';
import { Plug, ExternalLink, Check } from 'lucide-react';

interface Api {
  id: string;
  name: string;
  vendor: string;
  category: string;
  pricing: string;
  freeTier: string | null;
  hasMCP: boolean;
  capabilities: string[];
  url: string;
  notes: string;
}

interface Response {
  ok: boolean;
  lastUpdated: string;
  count: number;
  apis: Api[];
}

const CATEGORY_LABEL: Record<string, string> = {
  search: 'Web search',
  'web-scraping': 'Web scraping',
  weather: 'Weather',
  finance: 'Finance',
  maps: 'Maps & location',
  email: 'Email',
  sms: 'SMS',
  payments: 'Payments',
  'code-execution': 'Code execution',
  'file-conversion': 'File conversion',
  ocr: 'OCR / parsing',
  analytics: 'Analytics',
  social: 'Social',
};

export default function AgentApisPage() {
  const [data, setData] = useState<Response | null>(null);
  const [activeCategory, setActiveCategory] = useState<string>('all');
  const [mcpOnly, setMcpOnly] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetch('https://tensorfeed.ai/api/agent-apis')
      .then(res => { if (!res.ok) throw new Error(`HTTP ${res.status}`); return res.json(); })
      .then((json: Response) => setData(json))
      .catch(e => setError(e instanceof Error ? e.message : 'Failed to load'));
  }, []);

  const categories = useMemo(() => {
    if (!data) return [];
    return Array.from(new Set(data.apis.map(a => a.category)));
  }, [data]);

  const filtered = useMemo(() => {
    if (!data) return [];
    let rows = data.apis;
    if (activeCategory !== 'all') rows = rows.filter(a => a.category === activeCategory);
    if (mcpOnly) rows = rows.filter(a => a.hasMCP);
    return rows;
  }, [data, activeCategory, mcpOnly]);

  return (
    <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <div className="mb-6">
        <div className="flex items-center gap-3 mb-3">
          <div className="p-2 rounded-lg bg-accent-primary/10">
            <Plug className="w-7 h-7 text-accent-primary" />
          </div>
          <h1 className="text-3xl sm:text-4xl font-bold text-text-primary">Agent APIs</h1>
        </div>
        <p className="text-text-secondary text-lg max-w-3xl">
          The non-LLM APIs AI agents wire in for everything that is not text generation: web search, scraping, weather, finance, maps, email, SMS, payments, code execution, OCR. Each entry has pricing, free tier, and whether an MCP server exists. {data?.lastUpdated && `Updated ${data.lastUpdated}.`}
        </p>
      </div>

      <div className="flex gap-2 mb-3 flex-wrap items-center">
        <span className="text-xs text-text-muted uppercase tracking-wide">Category:</span>
        <button onClick={() => setActiveCategory('all')}
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
      <div className="flex items-center gap-2 mb-6">
        <label className="text-xs text-text-secondary flex items-center gap-1.5 cursor-pointer">
          <input type="checkbox" checked={mcpOnly} onChange={(e) => setMcpOnly(e.target.checked)} className="rounded" />
          MCP server available
        </label>
      </div>

      {error && <div className="bg-rose-500/10 border border-rose-500/20 rounded-lg p-4 text-rose-400 text-sm mb-6">Error: {error}</div>}

      {data && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mb-10">
          {filtered.map(a => (
            <div key={a.id} className="bg-bg-secondary border border-border rounded-lg p-4 hover:border-accent-primary/50 transition-colors">
              <div className="flex items-start justify-between gap-2 mb-2">
                <div className="min-w-0">
                  <a href={a.url} target="_blank" rel="noopener noreferrer" className="font-semibold text-text-primary hover:text-accent-primary inline-flex items-center gap-1">
                    {a.name} <ExternalLink className="w-3 h-3 text-text-muted" />
                  </a>
                  <div className="text-xs text-text-muted mt-0.5">{a.vendor} · {CATEGORY_LABEL[a.category]}</div>
                </div>
                {a.hasMCP && (
                  <span className="text-xs px-2 py-0.5 rounded border bg-emerald-500/10 text-emerald-400 border-emerald-500/20 inline-flex items-center gap-1">
                    <Check className="w-3 h-3" /> MCP
                  </span>
                )}
              </div>
              <p className="text-sm text-text-secondary leading-relaxed mb-2">{a.notes}</p>
              {a.freeTier && <p className="text-xs text-emerald-400 mb-1">Free tier: {a.freeTier}</p>}
              <p className="text-xs text-text-muted italic mb-2">{a.pricing}</p>
              <div className="flex items-center gap-1 flex-wrap">
                {a.capabilities.map(c => (
                  <span key={c} className="text-xs bg-bg-tertiary text-text-secondary border border-border px-2 py-0.5 rounded">{c}</span>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}

      <div className="bg-bg-secondary border border-border rounded-lg p-4 text-sm text-text-secondary">
        <p>For agents: same data at{' '}<Link href="/api-reference/agent-apis" className="text-accent-primary hover:underline font-mono">/api/agent-apis</Link>. Filter with <code className="font-mono">?category=search|web-scraping|weather|...</code> or <code className="font-mono">?has_mcp=true</code>. Free, cached 10 min.</p>
      </div>
    </div>
  );
}
