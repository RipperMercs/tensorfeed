'use client';

import { useMemo, useState } from 'react';
import ResearchHero from '@/components/research/ResearchHero';
import ResearchSubNav from '@/components/research/ResearchSubNav';
import { useArxivLatest } from '@/components/research/useResearchData';
import { categoryForArxiv } from '@/components/research/categories';

function shortAbstract(s: string | null, max = 280): string {
  if (!s) return '';
  if (s.length <= max) return s;
  return s.slice(0, max - 1).trimEnd() + '…';
}

export default function PapersClient() {
  const papers = useArxivLatest(200);
  const [filter, setFilter] = useState<string | null>(null);

  const categories = useMemo(() => {
    if (!papers) return [];
    const counts = new Map<string, number>();
    papers.forEach((p) => {
      if (p.primaryCategory) counts.set(p.primaryCategory, (counts.get(p.primaryCategory) ?? 0) + 1);
    });
    return Array.from(counts.entries()).sort((a, b) => b[1] - a[1]);
  }, [papers]);

  const visible = useMemo(() => {
    if (!papers) return null;
    return filter ? papers.filter((p) => p.primaryCategory === filter) : papers;
  }, [papers, filter]);

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <ResearchHero
        tag="/ RESEARCH / PAPERS"
        title="Latest AI Research Papers"
        subtitle="Live feed of arXiv submissions across cs.AI, cs.LG, cs.CL, cs.CV, and adjacent AI/ML categories. Captured daily at 11:30 UTC."
      />
      <ResearchSubNav />

      {categories.length > 0 && (
        <div className="mb-6 flex flex-wrap gap-2">
          <button
            onClick={() => setFilter(null)}
            className={`px-3 py-1 text-[11px] font-mono rounded-full border transition-colors ${
              filter === null
                ? 'border-accent-primary text-accent-primary bg-accent-primary/10'
                : 'border-border text-text-muted hover:border-accent-primary hover:text-text-primary'
            }`}
          >
            All ({papers?.length ?? 0})
          </button>
          {categories.map(([cat, count]) => (
            <button
              key={cat}
              onClick={() => setFilter(cat)}
              className={`px-3 py-1 text-[11px] font-mono rounded-full border transition-colors ${
                filter === cat
                  ? 'border-accent-primary text-accent-primary bg-accent-primary/10'
                  : 'border-border text-text-muted hover:border-accent-primary hover:text-text-primary'
              }`}
            >
              {cat} ({count})
            </button>
          ))}
        </div>
      )}

      {!visible ? (
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3 animate-pulse">
          {Array.from({ length: 9 }).map((_, i) => (
            <div key={i} className="bg-bg-secondary border border-border rounded-lg p-5 h-40" />
          ))}
        </div>
      ) : visible.length === 0 ? (
        <p className="text-text-muted font-mono text-sm">No papers in this category right now.</p>
      ) : (
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {visible.map((p) => {
            const cat = categoryForArxiv(p.primaryCategory);
            return (
            <a
              key={p.arxivId}
              href={p.htmlUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="group block bg-bg-secondary border border-border rounded-lg p-4 hover:border-accent-primary transition-colors"
              style={{ borderTop: `2px solid ${cat.color}` }}
            >
              <div className="flex items-center justify-between mb-2">
                {p.primaryCategory && (
                  <span
                    className="text-[10px] font-mono uppercase tracking-wider px-2 py-0.5 rounded border"
                    style={{ background: cat.tint, color: cat.color, borderColor: cat.tint }}
                    title={cat.name}
                  >
                    {p.primaryCategory}
                  </span>
                )}
                <span className="text-[10px] font-mono text-text-muted">{p.arxivId}</span>
              </div>
              <h3 className="text-sm font-semibold text-text-primary group-hover:text-accent-primary transition-colors mb-2 leading-snug">
                {p.title}
              </h3>
              <p className="text-xs text-text-muted leading-relaxed mb-2">
                {shortAbstract(p.abstract, 220)}
              </p>
              <div className="text-[11px] font-mono text-text-muted truncate">
                {p.authors.slice(0, 3).join(', ')}
                {p.authors.length > 3 && ` +${p.authors.length - 3}`}
              </div>
            </a>
            );
          })}
        </div>
      )}
    </div>
  );
}
