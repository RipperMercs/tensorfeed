'use client';

import { useEffect, useState, useMemo } from 'react';
import Link from 'next/link';
import { ShieldAlert, ExternalLink } from 'lucide-react';

type Category =
  | 'entity-list'
  | 'compute-threshold'
  | 'license-policy'
  | 'due-diligence'
  | 'model-weights'
  | 'other';

type DocType = 'Rule' | 'Notice' | 'Proposed Rule';

interface ExportEvent {
  id: string;
  title: string;
  doc_type: DocType;
  category: Category;
  abstract: string;
  publication_date: string;
  source_url: string;
  agency: 'BIS';
}

interface ExportControlsResponse {
  ok: boolean;
  captured_at: string | null;
  source: string;
  license: string;
  total: number;
  by_category: Partial<Record<Category, number>>;
  recent: ExportEvent[];
  note?: string;
}

const CATEGORY_LABELS: Record<Category, string> = {
  'entity-list': 'Entity List',
  'compute-threshold': 'Compute thresholds',
  'license-policy': 'License policy',
  'due-diligence': 'Due diligence',
  'model-weights': 'Model weights',
  other: 'Other',
};

const CATEGORY_COLORS: Record<Category, string> = {
  'entity-list': 'bg-rose-500/10 text-rose-400 border-rose-500/20',
  'compute-threshold': 'bg-blue-500/10 text-blue-400 border-blue-500/20',
  'license-policy': 'bg-amber-500/10 text-amber-400 border-amber-500/20',
  'due-diligence': 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20',
  'model-weights': 'bg-purple-500/10 text-purple-400 border-purple-500/20',
  other: 'bg-bg-tertiary text-text-secondary border-border',
};

const CATEGORY_ORDER: Category[] = [
  'entity-list',
  'compute-threshold',
  'license-policy',
  'due-diligence',
  'model-weights',
  'other',
];

function categoryLabel(c: Category): string {
  return CATEGORY_LABELS[c] ?? c;
}

function categoryColor(c: Category): string {
  return CATEGORY_COLORS[c] ?? 'bg-bg-tertiary text-text-secondary border-border';
}

function formatDate(s: string): string {
  const d = new Date(s + 'T00:00:00.000Z');
  if (Number.isNaN(d.getTime())) return s;
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric', timeZone: 'UTC' });
}

export default function ExportControlsView() {
  const [data, setData] = useState<ExportControlsResponse | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [activeCategory, setActiveCategory] = useState<string>('all');

  useEffect(() => {
    fetch('https://tensorfeed.ai/api/export-controls/ai')
      .then(r => { if (!r.ok) throw new Error(`HTTP ${r.status}`); return r.json(); })
      .then((j: ExportControlsResponse) => setData(j))
      .catch(e => setError(e instanceof Error ? e.message : 'Failed to load'));
  }, []);

  const presentCategories = useMemo<Category[]>(() => {
    if (!data) return [];
    return CATEGORY_ORDER.filter(c => (data.by_category[c] ?? 0) > 0);
  }, [data]);

  const filtered = useMemo(() => {
    if (!data) return [];
    let rows = data.recent;
    if (activeCategory !== 'all') rows = rows.filter(e => e.category === activeCategory);
    return rows;
  }, [data, activeCategory]);

  const hasEvents = Boolean(data && data.total > 0);

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <div className="mb-8">
        <div className="flex items-center gap-3 mb-3">
          <div className="p-2 rounded-lg bg-accent-primary/10"><ShieldAlert className="w-7 h-7 text-accent-primary" /></div>
          <h1 className="text-3xl sm:text-4xl font-bold text-text-primary">AI Export Controls</h1>
        </div>
        <p className="text-text-secondary text-lg max-w-3xl">
          A classified, forward-only timeline of US Bureau of Industry and Security (BIS) export-control actions on AI chips, advanced computing, and model weights: Entity List changes, advanced-computing license and threshold rules, and due-diligence measures, sourced from the Federal Register. The compliance floor under every chip and weight that crosses a border, in one feed. {data?.captured_at && `Updated ${formatDate(data.captured_at.slice(0, 10))}.`}
        </p>
      </div>

      {/* CATEGORY CHIP ROW */}
      {hasEvents && presentCategories.length > 0 && (
        <section aria-labelledby="summary-heading" className="mb-8">
          <h2 id="summary-heading" className="sr-only">Actions by category</h2>
          <p className="text-text-secondary mb-3">
            <span className="font-mono font-semibold text-text-primary">{data!.total.toLocaleString()}</span> export-control {data!.total === 1 ? 'action' : 'actions'} tracked, all from BIS.
          </p>
          <div className="flex flex-wrap gap-2">
            {presentCategories.map(c => (
              <span key={c} className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full border text-xs font-medium ${categoryColor(c)}`}>
                <span>{categoryLabel(c)}</span>
                <span className="font-mono">{(data!.by_category[c] ?? 0).toLocaleString()}</span>
              </span>
            ))}
          </div>
        </section>
      )}

      {/* FILTER PILLS */}
      {hasEvents && presentCategories.length > 0 && (
        <div className="flex gap-2 mb-6 flex-wrap" role="group" aria-label="Filter actions by category">
          <button
            type="button"
            onClick={() => setActiveCategory('all')}
            aria-pressed={activeCategory === 'all'}
            className={`px-3 py-1 rounded-full text-xs font-medium transition-colors border ${activeCategory === 'all' ? 'bg-accent-primary text-white border-accent-primary' : 'bg-bg-secondary text-text-secondary border-border hover:border-text-muted'}`}
          >All</button>
          {presentCategories.map(c => (
            <button
              key={c}
              type="button"
              onClick={() => setActiveCategory(c)}
              aria-pressed={activeCategory === c}
              className={`px-3 py-1 rounded-full text-xs font-medium transition-colors border ${activeCategory === c ? 'bg-accent-primary text-white border-accent-primary' : 'bg-bg-secondary text-text-secondary border-border hover:border-text-muted'}`}
            >{categoryLabel(c)}</button>
          ))}
        </div>
      )}

      {/* STATES */}
      {error && (
        <div className="bg-rose-500/10 border border-rose-500/20 rounded-lg p-4 text-rose-400 text-sm mb-6">Error loading export-control actions: {error}</div>
      )}

      {!data && !error && (
        <div className="text-text-muted text-sm">Loading export-control actions...</div>
      )}

      {/* HONEST COLD EMPTY STATE (loaded, total 0, no error) */}
      {data && data.total === 0 && !error && (
        <div className="bg-bg-secondary border border-border rounded-lg p-5 text-sm text-text-secondary leading-relaxed">
          No export-control actions captured yet. The daily Federal Register sync backfills the BIS AI and compute docket on its first run, then this timeline fills in forward-only as new rules, notices, and proposed rules publish.
        </div>
      )}

      {/* EVENT TIMELINE */}
      {hasEvents && (
        <section aria-labelledby="timeline-heading" className="mb-10">
          <h2 id="timeline-heading" className="sr-only">Export-control action timeline</h2>
          <div className="space-y-3">
            {filtered.map(e => (
              <article key={e.id} className="bg-bg-secondary border border-border rounded-lg p-4 hover:border-accent-primary/50 transition-colors">
                <div className="flex items-start justify-between gap-3 flex-wrap mb-1.5">
                  <div className="min-w-0">
                    <span className={`inline-block text-[11px] px-1.5 py-0.5 rounded-full border font-medium ${categoryColor(e.category)}`}>{categoryLabel(e.category)}</span>
                    <span className="ml-2 text-[11px] px-1.5 py-0.5 rounded-full border border-border bg-bg-tertiary text-text-secondary font-medium">{e.doc_type}</span>
                    <span className="ml-2 font-semibold text-text-primary">
                      <a href={e.source_url} target="_blank" rel="noopener noreferrer" className="hover:text-accent-primary inline-flex items-center gap-1">
                        {e.title} <ExternalLink className="w-3 h-3 text-text-muted" />
                      </a>
                    </span>
                  </div>
                  <span className="text-xs font-mono text-text-muted shrink-0">{formatDate(e.publication_date)}</span>
                </div>
                {e.abstract && <p className="text-sm text-text-secondary leading-relaxed line-clamp-3">{e.abstract}</p>}
                <div className="text-xs text-text-muted mt-1.5">Agency: {e.agency}</div>
              </article>
            ))}
          </div>
        </section>
      )}

      <div className="bg-bg-secondary border border-border rounded-lg p-4 text-sm text-text-secondary space-y-2">
        <p>
          For agents: same data at <Link href="/api-reference" className="text-accent-primary hover:underline font-mono">/api/export-controls/ai</Link> (premium history at <span className="text-accent-primary font-mono">/api/premium/export-controls/ai/history</span>). Forward-only, sourced from the Federal Register (public domain, US Government work).
        </p>
        <p>
          Tracking the broader statute and regulation landscape across jurisdictions? <Link href="/ai-policy" className="text-accent-primary hover:underline font-medium">AI Policy Registry &rarr;</Link>
        </p>
      </div>
    </div>
  );
}
