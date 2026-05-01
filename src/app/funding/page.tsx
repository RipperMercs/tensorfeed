'use client';

import { useEffect, useState, useMemo } from 'react';
import Link from 'next/link';
import { DollarSign, ExternalLink } from 'lucide-react';

interface Round {
  id: string;
  company: string;
  category: string;
  stage: string;
  amountM: number;
  valuationB: number | null;
  announcedDate: string;
  leadInvestors: string[];
  notableInvestors: string[];
  description: string;
  url: string;
  sourceUrl: string;
}

interface Response {
  ok: boolean;
  lastUpdated: string;
  count: number;
  rounds: Round[];
}

const CATEGORY_COLORS: Record<string, string> = {
  'frontier-lab': 'bg-purple-500/10 text-purple-400 border-purple-500/20',
  inference: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20',
  agent: 'bg-blue-500/10 text-blue-400 border-blue-500/20',
  coding: 'bg-cyan-500/10 text-cyan-400 border-cyan-500/20',
  infra: 'bg-amber-500/10 text-amber-400 border-amber-500/20',
  enterprise: 'bg-rose-500/10 text-rose-400 border-rose-500/20',
  voice: 'bg-pink-500/10 text-pink-400 border-pink-500/20',
  creative: 'bg-pink-500/10 text-pink-400 border-pink-500/20',
  video: 'bg-purple-500/10 text-purple-400 border-purple-500/20',
};

function formatAmount(m: number): string {
  if (m >= 1000) return `$${(m / 1000).toFixed(1)}B`;
  return `$${m}M`;
}

export default function FundingPage() {
  const [data, setData] = useState<Response | null>(null);
  const [activeCategory, setActiveCategory] = useState<string>('all');
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetch('https://tensorfeed.ai/api/funding')
      .then(r => { if (!r.ok) throw new Error(`HTTP ${r.status}`); return r.json(); })
      .then((j: Response) => setData(j))
      .catch(e => setError(e instanceof Error ? e.message : 'Failed to load'));
  }, []);

  const categories = useMemo(() => {
    if (!data) return [];
    return Array.from(new Set(data.rounds.map(r => r.category)));
  }, [data]);

  const filtered = useMemo(() => {
    if (!data) return [];
    let rows = data.rounds;
    if (activeCategory !== 'all') rows = rows.filter(r => r.category === activeCategory);
    return [...rows].sort((a, b) => b.announcedDate.localeCompare(a.announcedDate));
  }, [data, activeCategory]);

  return (
    <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <div className="mb-6">
        <div className="flex items-center gap-3 mb-3">
          <div className="p-2 rounded-lg bg-accent-primary/10"><DollarSign className="w-7 h-7 text-accent-primary" /></div>
          <h1 className="text-3xl sm:text-4xl font-bold text-text-primary">AI Funding Rounds</h1>
        </div>
        <p className="text-text-secondary text-lg max-w-3xl">
          Notable AI startup financing rounds with structured fields: date, stage, amount, post-money valuation, lead and notable investors. The machine-readable layer beneath the news. {data?.lastUpdated && `Updated ${data.lastUpdated}.`}
        </p>
      </div>

      <div className="flex gap-2 mb-6 flex-wrap">
        <button onClick={() => setActiveCategory('all')} className={`px-3 py-1 rounded-full text-xs font-medium transition-colors border ${activeCategory === 'all' ? 'bg-accent-primary text-white border-accent-primary' : 'bg-bg-secondary text-text-secondary border-border hover:border-text-muted'}`}>All</button>
        {categories.map(c => (
          <button key={c} onClick={() => setActiveCategory(c)} className={`px-3 py-1 rounded-full text-xs font-medium transition-colors border ${activeCategory === c ? 'bg-accent-primary text-white border-accent-primary' : 'bg-bg-secondary text-text-secondary border-border hover:border-text-muted'}`}>{c}</button>
        ))}
      </div>

      {error && <div className="bg-rose-500/10 border border-rose-500/20 rounded-lg p-4 text-rose-400 text-sm mb-6">Error: {error}</div>}

      {data && (
        <div className="space-y-3 mb-10">
          {filtered.map(r => (
            <div key={r.id} className="bg-bg-secondary border border-border rounded-lg p-4 hover:border-accent-primary/50 transition-colors">
              <div className="flex items-start justify-between gap-3 flex-wrap mb-2">
                <div className="min-w-0">
                  <a href={r.url} target="_blank" rel="noopener noreferrer" className="font-semibold text-text-primary text-lg hover:text-accent-primary inline-flex items-center gap-1">
                    {r.company} <ExternalLink className="w-3 h-3 text-text-muted" />
                  </a>
                  <div className="text-xs text-text-muted mt-0.5">{r.announcedDate} · <span className="font-mono">{r.stage}</span> · <span className={`inline-block text-xs px-1.5 py-0.5 rounded-full border font-medium ${CATEGORY_COLORS[r.category] || 'bg-bg-tertiary text-text-secondary border-border'}`}>{r.category}</span></div>
                </div>
                <div className="text-right">
                  <div className="text-xl font-bold font-mono text-text-primary">{formatAmount(r.amountM)}</div>
                  {r.valuationB !== null && <div className="text-xs text-text-muted">at ${r.valuationB}B post</div>}
                </div>
              </div>
              <p className="text-sm text-text-secondary leading-relaxed mb-2">{r.description}</p>
              <div className="text-xs text-text-secondary">
                <span className="text-text-muted">Lead:</span> {r.leadInvestors.join(', ')}
                {r.notableInvestors.length > 0 && <> · <span className="text-text-muted">Also:</span> {r.notableInvestors.slice(0, 3).join(', ')}</>}
              </div>
            </div>
          ))}
        </div>
      )}

      <div className="bg-bg-secondary border border-border rounded-lg p-4 text-sm text-text-secondary">
        <p>For agents: same data at <Link href="/api-reference/funding" className="text-accent-primary hover:underline font-mono">/api/funding</Link>. Filter with <code className="font-mono">?category=...</code> or <code className="font-mono">?stage=...</code>. Free, cached 10 min.</p>
      </div>
    </div>
  );
}
