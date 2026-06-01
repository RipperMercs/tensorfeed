'use client';

import { useState } from 'react';
import { ExternalLink, Award } from 'lucide-react';
import ResearchHero from '@/components/research/ResearchHero';
import ResearchSubNav from '@/components/research/ResearchSubNav';
import { useConferenceAcceptances, paperAccent } from '@/components/research/useResearchData';

export default function ConferenceAcceptancesClient() {
  const { papers, venues, capturedAt } = useConferenceAcceptances();
  const [venue, setVenue] = useState<string>('all');
  const filtered = !papers ? null : venue === 'all' ? papers : papers.filter((p) => p.venue_group === venue);

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <ResearchHero
        tag="/ RESEARCH / CONFERENCES"
        title="Top AI Conference Acceptances"
        subtitle="Notable-tier (Oral and Spotlight) accepted papers from current top machine-learning venues (ICLR, NeurIPS, ICML), sourced from OpenReview. The decision tier is the acceptance signal. Each card links to the OpenReview forum for the full paper."
      />
      <ResearchSubNav />

      <div className="mb-6 flex flex-wrap items-center gap-2">
        <span className="font-mono text-xs text-text-muted">
          {!papers ? 'Loading...' : `${filtered?.length ?? 0} papers`}
          {capturedAt ? ` (as of ${capturedAt.slice(0, 10)})` : ''}
        </span>
        {venues.length > 0 && (
          <div className="flex flex-wrap gap-1.5 sm:ml-auto">
            {['all', ...venues].map((v) => (
              <button
                key={v}
                onClick={() => setVenue(v)}
                className={`px-2.5 py-1 rounded-full text-xs font-mono border transition-colors ${
                  venue === v
                    ? 'bg-accent-primary text-white border-accent-primary'
                    : 'bg-bg-secondary text-text-secondary border-border hover:border-text-muted'
                }`}
              >
                {v === 'all' ? 'All venues' : v}
              </button>
            ))}
          </div>
        )}
      </div>

      {!papers ? (
        <div className="grid gap-3 sm:grid-cols-2 animate-pulse">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="bg-bg-secondary border border-border rounded-lg p-5 h-40" />
          ))}
        </div>
      ) : filtered && filtered.length === 0 ? (
        <p className="text-text-muted font-mono text-sm">
          No acceptances loaded yet. The daily OpenReview refresh populates this feed.
        </p>
      ) : (
        <div className="grid gap-3 sm:grid-cols-2">
          {filtered!.map((p, i) => {
            const cat = paperAccent(p.title);
            return (
              <a
                key={`${p.forum_url}-${i}`}
                href={p.forum_url}
                target="_blank"
                rel="noopener noreferrer"
                className="group block bg-bg-secondary border border-border rounded-lg p-5 hover:border-accent-cyan transition-colors"
                style={{ borderTop: `2px solid ${cat.color}` }}
              >
                <div className="flex items-center justify-between mb-2 text-[10px] font-mono text-text-muted">
                  <span>{p.venue_group}</span>
                  <span className="inline-flex items-center gap-1 text-accent-green">
                    <Award className="w-3 h-3" /> {p.tier}
                  </span>
                </div>
                <h3 className="text-base font-semibold text-text-primary group-hover:text-accent-cyan transition-colors mb-2 leading-snug">
                  {p.title}
                </h3>
                {p.authors.length > 0 && (
                  <p className="text-[11px] font-mono text-text-muted truncate mb-2">{p.authors.join(', ')}</p>
                )}
                {p.abstract_snippet && (
                  <p className="text-xs text-text-secondary leading-relaxed mb-2">{p.abstract_snippet}</p>
                )}
                <div className="flex items-center justify-between gap-2 mt-2 text-[10px] font-mono text-text-muted">
                  <span className="truncate">{p.primary_area ?? p.keywords[0] ?? ''}</span>
                  <span className="inline-flex items-center gap-1 flex-shrink-0">
                    OpenReview <ExternalLink className="w-3 h-3" />
                  </span>
                </div>
              </a>
            );
          })}
        </div>
      )}

      <p className="mt-6 text-xs font-mono text-text-muted">
        Source: OpenReview public submission metadata. TensorFeed links and summarizes (clipped abstract); full text and PDFs are not republished. The venue list is curated and refreshed each conference season. Also available as JSON at{' '}
        <a href="/api/research/conference-acceptances" className="text-accent-primary hover:underline">
          /api/research/conference-acceptances
        </a>
        .
      </p>
    </div>
  );
}
