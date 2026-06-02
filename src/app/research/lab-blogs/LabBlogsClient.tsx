'use client';

import { useState } from 'react';
import { ExternalLink, Rss } from 'lucide-react';
import ResearchHero from '@/components/research/ResearchHero';
import ResearchSubNav from '@/components/research/ResearchSubNav';
import { useResearchBlogs, paperAccent } from '@/components/research/useResearchData';

export default function LabBlogsClient() {
  const { posts, sources, capturedAt } = useResearchBlogs();
  const [src, setSrc] = useState<string>('all');
  const filtered = !posts ? null : src === 'all' ? posts : posts.filter((p) => p.source === src);

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <ResearchHero
        tag="/ RESEARCH / LAB BLOGS"
        title="AI Research Blogs"
        subtitle="Recent posts from the major AI lab and academic research blogs (Google DeepMind, Google Research, Berkeley BAIR, MIT News AI, Hugging Face), aggregated. Each card links to the original post."
      />
      <ResearchSubNav />

      <div className="mb-6 flex flex-wrap items-center gap-2">
        <span className="font-mono text-xs text-text-muted">
          {!posts ? 'Loading...' : `${filtered?.length ?? 0} posts`}
          {capturedAt ? ` (as of ${capturedAt.slice(0, 10)})` : ''}
        </span>
        {sources.length > 0 && (
          <div className="flex flex-wrap gap-1.5 sm:ml-auto">
            {['all', ...sources].map((s) => (
              <button
                key={s}
                onClick={() => setSrc(s)}
                className={`px-2.5 py-1 rounded-full text-xs font-mono border transition-colors ${
                  src === s
                    ? 'bg-accent-primary text-white border-accent-primary'
                    : 'bg-bg-secondary text-text-secondary border-border hover:border-text-muted'
                }`}
              >
                {s === 'all' ? 'All sources' : s}
              </button>
            ))}
          </div>
        )}
      </div>

      {!posts ? (
        <div className="grid gap-3 sm:grid-cols-2 animate-pulse">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="bg-bg-secondary border border-border rounded-lg p-5 h-32" />
          ))}
        </div>
      ) : filtered && filtered.length === 0 ? (
        <p className="text-text-muted font-mono text-sm">No posts loaded yet. The daily refresh populates this feed.</p>
      ) : (
        <div className="grid gap-3 sm:grid-cols-2">
          {filtered!.map((p, i) => {
            const cat = paperAccent(p.source);
            return (
              <a
                key={`${p.url}-${i}`}
                href={p.url}
                target="_blank"
                rel="noopener noreferrer"
                className="group block bg-bg-secondary border border-border rounded-lg p-5 hover:border-accent-cyan transition-colors"
                style={{ borderTop: `2px solid ${cat.color}` }}
              >
                <div className="flex items-center justify-between mb-2 text-[10px] font-mono text-text-muted">
                  <span className="inline-flex items-center gap-1">
                    <Rss className="w-3 h-3" /> {p.source}
                  </span>
                  {p.published_at && <span>{p.published_at.slice(0, 10)}</span>}
                </div>
                <h3 className="text-base font-semibold text-text-primary group-hover:text-accent-cyan transition-colors mb-2 leading-snug">
                  {p.title}
                </h3>
                {p.snippet && <p className="text-xs text-text-secondary leading-relaxed mb-2">{p.snippet}</p>}
                <div className="flex items-center justify-end gap-1 mt-2 text-[10px] font-mono text-text-muted">
                  Read <ExternalLink className="w-3 h-3" />
                </div>
              </a>
            );
          })}
        </div>
      )}

      <p className="mt-6 text-xs font-mono text-text-muted">
        Aggregated public RSS and Atom feeds from AI lab and academic research blogs. TensorFeed shows the title and a short snippet with a link to the source; full posts are not republished. Refreshed daily. Also available as JSON at{' '}
        <a href="/api/research/lab-blogs" className="text-accent-primary hover:underline">
          /api/research/lab-blogs
        </a>
        .
      </p>
    </div>
  );
}
