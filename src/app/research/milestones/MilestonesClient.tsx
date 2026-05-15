'use client';

import { useMemo, useState } from 'react';
import { Award } from 'lucide-react';
import ResearchHero from '@/components/research/ResearchHero';
import ResearchSubNav from '@/components/research/ResearchSubNav';
import { useMilestones } from '@/components/research/useResearchData';

export default function MilestonesClient() {
  const papers = useMilestones(100);
  const [subfield, setSubfield] = useState<string | null>(null);

  const subfields = useMemo(() => {
    if (!papers) return [];
    const counts = new Map<string, number>();
    papers.forEach((p) => {
      if (p.subfield_tag) counts.set(p.subfield_tag, (counts.get(p.subfield_tag) ?? 0) + 1);
    });
    return Array.from(counts.entries()).sort((a, b) => b[1] - a[1]);
  }, [papers]);

  const visible = useMemo(() => {
    if (!papers) return null;
    return subfield ? papers.filter((p) => p.subfield_tag === subfield) : papers;
  }, [papers, subfield]);

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <ResearchHero
        tag="/ RESEARCH / MILESTONES"
        title="AI Milestone Papers"
        subtitle="Papers from the last 30 days of arXiv flagged as milestone candidates by the TensorFeed offline extraction. Each carries the named benchmark plus quantified delta, model release, or novel architecture that triggered the flag. Conservative by design: false positives are worse than false negatives."
      />
      <ResearchSubNav />

      <div className="mb-6 flex items-center gap-2 text-text-muted">
        <Award className="w-4 h-4 text-accent-primary" />
        <span className="font-mono text-xs">
          {!papers ? 'Loading…' : `${papers.length} flagged candidate${papers.length === 1 ? '' : 's'}`}
          {subfield && papers && ` · ${visible?.length} in ${subfield}`}
        </span>
      </div>

      {subfields.length > 0 && (
        <div className="mb-6 flex flex-wrap gap-2">
          <button
            onClick={() => setSubfield(null)}
            className={`px-3 py-1 text-[11px] font-mono rounded-full border transition-colors ${
              subfield === null
                ? 'border-accent-primary text-accent-primary bg-accent-primary/10'
                : 'border-border text-text-muted hover:border-accent-primary hover:text-text-primary'
            }`}
          >
            All
          </button>
          {subfields.map(([tag, count]) => (
            <button
              key={tag}
              onClick={() => setSubfield(tag)}
              className={`px-3 py-1 text-[11px] font-mono rounded-full border transition-colors ${
                subfield === tag
                  ? 'border-accent-primary text-accent-primary bg-accent-primary/10'
                  : 'border-border text-text-muted hover:border-accent-primary hover:text-text-primary'
              }`}
            >
              {tag} ({count})
            </button>
          ))}
        </div>
      )}

      {!visible ? (
        <div className="grid gap-4 sm:grid-cols-2 animate-pulse">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="bg-bg-secondary border border-border rounded-lg p-5 h-44" />
          ))}
        </div>
      ) : visible.length === 0 ? (
        <p className="text-text-muted font-mono text-sm">No milestone papers in this subfield right now.</p>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2">
          {visible.map((p) => (
            <a
              key={p.arxiv_id}
              href={`https://arxiv.org/abs/${p.arxiv_id}`}
              target="_blank"
              rel="noopener noreferrer"
              className="group block bg-bg-secondary border border-border rounded-lg p-5 hover:border-accent-primary transition-colors"
            >
              <div className="flex items-center justify-between gap-3 mb-3 flex-wrap">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="text-[10px] font-mono uppercase tracking-wider px-2 py-0.5 rounded bg-bg-tertiary text-accent-cyan border border-border">
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
          ))}
        </div>
      )}
    </div>
  );
}
