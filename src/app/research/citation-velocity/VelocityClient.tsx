'use client';

import { ExternalLink, TrendingUp } from 'lucide-react';
import ResearchHero from '@/components/research/ResearchHero';
import ResearchSubNav from '@/components/research/ResearchSubNav';
import { useCitationVelocity } from '@/components/research/useResearchData';
import { categoryForSeed } from '@/components/research/categories';

export default function VelocityClient() {
  const papers = useCitationVelocity(100);

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <ResearchHero
        tag="/ RESEARCH / CITATION VELOCITY"
        title="AI Citation Velocity Leaders"
        subtitle='Top 100 AI papers from the last 2 years ranked by the share of total citations that arrived in the most recent calendar year. Answers "what is being cited fastest right now" rather than "what has been cited the most overall." Source: OpenAlex (CC0).'
      />
      <ResearchSubNav />

      <div className="mb-6 flex items-center gap-2 text-text-muted">
        <TrendingUp className="w-4 h-4 text-accent-primary" />
        <span className="font-mono text-xs">
          {!papers ? 'Loading…' : `${papers.length} papers ranked`}
        </span>
      </div>

      {!papers ? (
        <div className="grid gap-3 sm:grid-cols-2 animate-pulse">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="bg-bg-secondary border border-border rounded-lg p-5 h-40" />
          ))}
        </div>
      ) : papers.length === 0 ? (
        <p className="text-text-muted font-mono text-sm">Citation velocity snapshot not yet refreshed. Cron runs daily.</p>
      ) : (
        <div className="grid gap-3 sm:grid-cols-2">
          {papers.map((v) => {
            const cat = categoryForSeed(v.openalex_id);
            return (
            <a
              key={v.openalex_id}
              href={v.landing_page_url ?? (v.doi ? `https://doi.org/${v.doi}` : `https://openalex.org/${v.openalex_id}`)}
              target="_blank"
              rel="noopener noreferrer"
              className="group block bg-bg-secondary border border-border rounded-lg p-5 hover:border-accent-primary transition-colors"
              style={{ borderTop: `2px solid ${cat.color}` }}
            >
              <div className="flex items-center justify-between mb-2">
                <span className="text-[10px] font-mono text-text-muted">
                  #{v.rank} · {v.publication_year}
                </span>
                <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-accent-green/10 text-accent-green border border-accent-green/20">
                  {Math.round(v.citations_latest_year_share * 100)}% in latest year
                </span>
              </div>
              <h3 className="text-base font-semibold text-text-primary group-hover:text-accent-primary transition-colors mb-3 leading-snug">
                {v.title}
              </h3>
              <div className="grid grid-cols-2 gap-2 mb-3 text-[11px] font-mono">
                <div>
                  <div className="text-text-muted">Total citations</div>
                  <div className="text-text-primary tabular-nums">{v.cited_by_count.toLocaleString()}</div>
                </div>
                <div>
                  <div className="text-text-muted">Latest year</div>
                  <div className="text-text-primary tabular-nums">{v.citations_latest_year.toLocaleString()}</div>
                </div>
              </div>
              {v.first_three_authors && v.first_three_authors.length > 0 && (
                <p className="text-[11px] font-mono text-text-muted truncate mb-1">
                  {v.first_three_authors.map((a) => a.display_name).join(', ')}
                </p>
              )}
              <div className="flex items-center justify-between gap-2 mt-2 text-[10px] font-mono text-text-muted">
                <span className="truncate">{v.venue ?? 'No venue'}</span>
                <span className="inline-flex items-center gap-1">
                  Open <ExternalLink className="w-3 h-3" />
                </span>
              </div>
            </a>
            );
          })}
        </div>
      )}

      <p className="mt-6 text-xs font-mono text-text-muted">
        Velocity = (citations in most recent calendar year) ÷ (total citations). Source: OpenAlex (CC0 1.0). TF filters to the AI concept (C154945302), publication year within last 2, total citations ≥ 3.
      </p>
    </div>
  );
}
