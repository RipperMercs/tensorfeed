'use client';

import { Sparkles, ExternalLink, TrendingUp } from 'lucide-react';
import ResearchHero from '@/components/research/ResearchHero';
import ResearchSubNav from '@/components/research/ResearchSubNav';
import { useEmergingKeywords } from '@/components/research/useResearchData';
import { categoryForSeed } from '@/components/research/categories';

export default function TopicsClient() {
  const keywords = useEmergingKeywords(100);

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <ResearchHero
        tag="/ RESEARCH / EMERGING TOPICS"
        title="Emerging AI Research Topics"
        subtitle="Top multi-word keyphrases across recent arXiv AI abstracts ranked by recent-vs-baseline lift. Captures emerging research terminology before it shows up in citation counts. Refreshed weekly from the TensorFeed offline extraction."
      />
      <ResearchSubNav />

      <div className="mb-6 flex items-center gap-2 text-text-muted">
        <Sparkles className="w-4 h-4 text-accent-primary" />
        <span className="font-mono text-xs">
          {!keywords ? 'Loading…' : `${keywords.length} keyphrases ranked by lift`}
        </span>
      </div>

      {!keywords ? (
        <div className="h-96 bg-bg-secondary border border-border rounded-lg animate-pulse" />
      ) : keywords.length === 0 ? (
        <p className="text-text-muted font-mono text-sm">Emerging keywords snapshot not yet refreshed.</p>
      ) : (
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {keywords.map((k) => {
            const cat = categoryForSeed(k.keyword);
            return (
            <div
              key={k.keyword}
              className="bg-bg-secondary border border-border rounded-lg p-4 hover:border-accent-cyan transition-colors"
              style={{ borderTop: `2px solid ${cat.color}` }}
            >
              <div className="flex items-center justify-between mb-2 gap-2">
                <span className="text-sm font-mono font-semibold text-text-primary truncate" style={{ color: cat.color }}>
                  {k.keyword}
                </span>
                <span
                  className="inline-flex items-center gap-1 text-[10px] font-mono px-2 py-0.5 rounded border tabular-nums shrink-0"
                  style={{ background: cat.tint, color: cat.color, borderColor: cat.tint }}
                >
                  <TrendingUp className="w-2.5 h-2.5" />
                  {k.lift.toFixed(1)}×
                </span>
              </div>
              <div className="flex items-center justify-between text-[11px] font-mono text-text-muted tabular-nums mb-2">
                <span>{k.recent_count} recent (30d)</span>
                <span>{k.baseline_count} baseline (90d)</span>
              </div>
              {k.example_arxiv_ids && k.example_arxiv_ids.length > 0 && (
                <div className="pt-2 border-t border-border flex flex-wrap gap-1.5">
                  {k.example_arxiv_ids.slice(0, 5).map((id) => (
                    <a
                      key={id}
                      href={`https://arxiv.org/abs/${id}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-[10px] font-mono text-text-muted hover:text-accent-cyan transition-colors"
                    >
                      {id}
                    </a>
                  ))}
                </div>
              )}
              <a
                href={`https://arxiv.org/search/?query=${encodeURIComponent(k.keyword)}&searchtype=all`}
                target="_blank"
                rel="noopener noreferrer"
                className="mt-2 pt-2 border-t border-border inline-flex items-center gap-1 text-[10px] font-mono hover:underline"
                style={{ color: cat.color }}
              >
                Search arXiv <ExternalLink className="w-3 h-3" />
              </a>
            </div>
            );
          })}
        </div>
      )}

      <p className="mt-6 text-xs font-mono text-text-muted">
        Lift = (recent-window frequency) ÷ (smoothed baseline frequency). Higher lift means the term is appearing more often than its prior background rate. Click a keyword to see example papers.
      </p>
    </div>
  );
}
