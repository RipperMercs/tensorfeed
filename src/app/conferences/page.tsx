'use client';

import { useEffect, useState, useMemo } from 'react';
import Link from 'next/link';
import { Calendar, ExternalLink, MapPin } from 'lucide-react';

interface Conference {
  id: string;
  name: string;
  category: string;
  startDate: string;
  endDate: string;
  city: string;
  country: string;
  format: string;
  paperDeadline: string | null;
  registrationOpen: boolean;
  themes: string[];
  url: string;
  notes: string;
}

interface Response {
  ok: boolean;
  lastUpdated: string;
  count: number;
  conferences: Conference[];
}

const CATEGORY_COLORS: Record<string, string> = {
  research: 'bg-blue-500/10 text-blue-400 border-blue-500/20',
  industry: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20',
  developer: 'bg-amber-500/10 text-amber-400 border-amber-500/20',
  community: 'bg-pink-500/10 text-pink-400 border-pink-500/20',
};

function formatDateRange(start: string, end: string): string {
  if (start === end) return new Date(start).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
  const s = new Date(start);
  const e = new Date(end);
  if (s.getFullYear() === e.getFullYear() && s.getMonth() === e.getMonth()) {
    return `${s.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })} - ${e.toLocaleDateString('en-US', { day: 'numeric', year: 'numeric' })}`;
  }
  return `${s.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })} - ${e.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}`;
}

export default function ConferencesPage() {
  const [data, setData] = useState<Response | null>(null);
  const [activeCategory, setActiveCategory] = useState<string>('all');
  const [upcomingOnly, setUpcomingOnly] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetch('https://tensorfeed.ai/api/conferences')
      .then(r => { if (!r.ok) throw new Error(`HTTP ${r.status}`); return r.json(); })
      .then((j: Response) => setData(j))
      .catch(e => setError(e instanceof Error ? e.message : 'Failed to load'));
  }, []);

  const categories = useMemo(() => {
    if (!data) return [];
    return Array.from(new Set(data.conferences.map(c => c.category)));
  }, [data]);

  const filtered = useMemo(() => {
    if (!data) return [];
    let rows = data.conferences;
    const today = new Date().toISOString().slice(0, 10);
    if (upcomingOnly) rows = rows.filter(c => c.endDate >= today);
    if (activeCategory !== 'all') rows = rows.filter(c => c.category === activeCategory);
    return [...rows].sort((a, b) => a.startDate.localeCompare(b.startDate));
  }, [data, activeCategory, upcomingOnly]);

  return (
    <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <div className="mb-6">
        <div className="flex items-center gap-3 mb-3">
          <div className="p-2 rounded-lg bg-accent-primary/10"><Calendar className="w-7 h-7 text-accent-primary" /></div>
          <h1 className="text-3xl sm:text-4xl font-bold text-text-primary">AI Conferences</h1>
        </div>
        <p className="text-text-secondary text-lg max-w-3xl">
          AI research and industry events: NeurIPS, ICLR, ICML, COLM, CVPR, AAAI, ACL, EMNLP, plus Google I/O, AWS re:Invent, NVIDIA GTC, OpenAI DevDay, Anthropic Builder Day. Dates, locations, paper submission deadlines. {data?.lastUpdated && `Updated ${data.lastUpdated}.`}
        </p>
      </div>

      <div className="flex gap-2 mb-3 flex-wrap items-center">
        <button onClick={() => setActiveCategory('all')} className={`px-3 py-1 rounded-full text-xs font-medium transition-colors border ${activeCategory === 'all' ? 'bg-accent-primary text-white border-accent-primary' : 'bg-bg-secondary text-text-secondary border-border hover:border-text-muted'}`}>All</button>
        {categories.map(c => (
          <button key={c} onClick={() => setActiveCategory(c)} className={`px-3 py-1 rounded-full text-xs font-medium transition-colors border ${activeCategory === c ? 'bg-accent-primary text-white border-accent-primary' : 'bg-bg-secondary text-text-secondary border-border hover:border-text-muted'}`}>{c}</button>
        ))}
      </div>
      <div className="flex items-center gap-2 mb-6">
        <label className="text-xs text-text-secondary flex items-center gap-1.5 cursor-pointer">
          <input type="checkbox" checked={upcomingOnly} onChange={(e) => setUpcomingOnly(e.target.checked)} className="rounded" />
          Upcoming only
        </label>
      </div>

      {error && <div className="bg-rose-500/10 border border-rose-500/20 rounded-lg p-4 text-rose-400 text-sm mb-6">Error: {error}</div>}

      {data && (
        <div className="space-y-3 mb-10">
          {filtered.map(c => (
            <div key={c.id} className="bg-bg-secondary border border-border rounded-lg p-4 hover:border-accent-primary/50 transition-colors">
              <div className="flex items-start justify-between gap-3 flex-wrap mb-2">
                <div className="min-w-0">
                  <a href={c.url} target="_blank" rel="noopener noreferrer" className="font-semibold text-text-primary text-lg hover:text-accent-primary inline-flex items-center gap-1">
                    {c.name} <ExternalLink className="w-3 h-3 text-text-muted" />
                  </a>
                  <div className="text-xs text-text-muted mt-0.5 flex items-center gap-2 flex-wrap">
                    <MapPin className="w-3 h-3" />{c.city}, {c.country} · {c.format}
                  </div>
                </div>
                <div className="text-right">
                  <div className="font-mono text-text-primary text-sm">{formatDateRange(c.startDate, c.endDate)}</div>
                  <span className={`text-xs px-2 py-0.5 rounded-full border font-medium inline-block mt-1 ${CATEGORY_COLORS[c.category]}`}>{c.category}</span>
                </div>
              </div>
              <p className="text-sm text-text-secondary leading-relaxed mb-2">{c.notes}</p>
              <div className="flex items-center gap-2 flex-wrap text-xs">
                {c.paperDeadline && <span className="text-text-secondary"><span className="text-text-muted">Paper deadline:</span> <span className="font-mono">{c.paperDeadline}</span></span>}
                {c.registrationOpen && <span className="text-emerald-400">Registration open</span>}
                {c.themes.map(t => (
                  <span key={t} className="bg-bg-tertiary text-text-muted border border-border px-2 py-0.5 rounded">{t}</span>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}

      <div className="bg-bg-secondary border border-border rounded-lg p-4 text-sm text-text-secondary">
        <p>For agents: same data at <Link href="/api-reference/conferences" className="text-accent-primary hover:underline font-mono">/api/conferences</Link>. Filter with <code className="font-mono">?category=research|industry|developer&upcoming=true</code>. Free, cached 10 min.</p>
      </div>
    </div>
  );
}
