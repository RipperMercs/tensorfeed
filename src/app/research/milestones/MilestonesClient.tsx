'use client';

import { useMemo } from 'react';
import { Award } from 'lucide-react';
import ResearchHero from '@/components/research/ResearchHero';
import ResearchSubNav from '@/components/research/ResearchSubNav';
import { useMilestones } from '@/components/research/useResearchData';
import { categoryForSubfield, CategoryKey } from '@/components/research/categories';
import SearchFilterBar, {
  applyQuery,
  useFilterState,
} from '@/components/research/SearchFilterBar';

export default function MilestonesClient() {
  const papers = useMilestones(100);
  const filter = useFilterState('latest');

  // Map subfield_tag → CategoryKey once so the filter can run on the
  // same axis as SearchFilterBar's category checkboxes.
  const taggedPapers = useMemo(() => {
    if (!papers) return null;
    return papers.map((p) => ({ paper: p, catKey: categoryForSubfield(p.subfield_tag).key }));
  }, [papers]);

  const categoryCounts = useMemo(() => {
    if (!taggedPapers) return undefined;
    const counts: Partial<Record<CategoryKey, number>> = {};
    taggedPapers.forEach(({ catKey }) => {
      counts[catKey] = (counts[catKey] ?? 0) + 1;
    });
    return counts;
  }, [taggedPapers]);

  const visible = useMemo(() => {
    if (!taggedPapers) return null;
    let out = taggedPapers;
    if (filter.activeCats.length > 0) {
      out = out.filter((t) => filter.activeCats.includes(t.catKey));
    }
    const filtered = applyQuery(
      out.map((t) => t.paper),
      filter.query,
      ['title', 'milestone_reasoning', 'summary'],
    );
    // Re-attach catKey for downstream rendering and respect the original ordering.
    const lookup = new Map(taggedPapers.map((t) => [t.paper.arxiv_id, t.catKey]));
    return filtered.map((p) => ({ paper: p, catKey: lookup.get(p.arxiv_id) ?? ('application' as CategoryKey) }));
  }, [taggedPapers, filter.activeCats, filter.query]);

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <ResearchHero
        tag="/ RESEARCH / MILESTONES"
        title="AI Milestone Papers"
        subtitle="Papers from the last 30 days of arXiv flagged as milestone candidates by the TensorFeed offline extraction. Each carries the named benchmark plus quantified delta, model release, or novel architecture that triggered the flag. Conservative by design: false positives are worse than false negatives."
      />
      <ResearchSubNav />

      <SearchFilterBar
        query={filter.query}
        onQuery={filter.setQuery}
        sort={filter.sort}
        onSort={filter.setSort}
        activeCats={filter.activeCats}
        onActiveCats={filter.setActiveCats}
        totalCount={papers?.length ?? 0}
        visibleCount={visible?.length ?? 0}
        categoryCounts={categoryCounts}
        placeholder="Search milestone papers, claims, summaries…"
      />

      <div className="mb-6 flex items-center gap-2 text-text-muted">
        <Award className="w-4 h-4 text-accent-primary" />
        <span className="font-mono text-xs">
          {!papers ? 'Loading…' : `${papers.length} flagged candidate${papers.length === 1 ? '' : 's'}`}
        </span>
      </div>

      {!visible ? (
        <div className="grid gap-4 sm:grid-cols-2 animate-pulse">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="bg-bg-secondary border border-border rounded-lg p-5 h-44" />
          ))}
        </div>
      ) : visible.length === 0 ? (
        <p className="text-text-muted font-mono text-sm">
          {filter.query || filter.activeCats.length > 0
            ? 'No milestone papers match the current search or filter.'
            : 'No milestone papers in the current window.'}
        </p>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2">
          {visible.map(({ paper: p }) => {
            const cat = categoryForSubfield(p.subfield_tag);
            return (
              <a
                key={p.arxiv_id}
                href={`https://arxiv.org/abs/${p.arxiv_id}`}
                target="_blank"
                rel="noopener noreferrer"
                className="group block bg-bg-secondary border border-border rounded-lg p-5 hover:border-accent-primary transition-colors"
                style={{ borderTop: `2px solid ${cat.color}` }}
              >
                <div className="flex items-center justify-between gap-3 mb-3 flex-wrap">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span
                      className="text-[10px] font-mono uppercase tracking-wider px-2 py-0.5 rounded border"
                      style={{ background: cat.tint, color: cat.color, borderColor: cat.tint }}
                      title={cat.name}
                    >
                      {p.subfield_tag}
                    </span>
                    <span className="text-[10px] font-mono uppercase tracking-wider px-2 py-0.5 rounded bg-bg-tertiary text-text-muted border border-border">
                      {p.methodology_bucket}
                    </span>
                  </div>
                  <span className="text-[10px] font-mono text-text-muted">{p.date}</span>
                </div>
                <h3 className="text-base font-semibold text-text-primary group-hover:text-accent-primary transition-colors mb-2 leading-snug">
                  {p.title}
                </h3>
                <p className="text-xs text-text-secondary leading-relaxed mb-3">
                  <span className="text-accent-primary font-medium">Milestone reasoning:</span> {p.milestone_reasoning}
                </p>
                {p.summary && (
                  <p className="text-xs text-text-muted leading-relaxed mb-3">{p.summary}</p>
                )}
                {p.affiliations && p.affiliations.length > 0 && (
                  <p className="text-[11px] font-mono text-text-muted truncate">
                    {p.affiliations.slice(0, 4).join(' · ')}
                  </p>
                )}
                <p className="text-[10px] font-mono text-text-muted mt-2">arXiv:{p.arxiv_id}</p>
              </a>
            );
          })}
        </div>
      )}
    </div>
  );
}
