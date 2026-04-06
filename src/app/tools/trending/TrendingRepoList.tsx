'use client';

import { useState, useEffect } from 'react';
import { GitBranch, Star, ExternalLink, GitFork } from 'lucide-react';
interface TrendingRepo {
  name: string;
  description: string;
  language: string;
  stars: number;
  forks: number;
  url: string;
  topics: string[];
  createdAt: string;
}

const LANG_COLORS: Record<string, string> = {
  Python: 'bg-yellow-400',
  TypeScript: 'bg-blue-400',
  JavaScript: 'bg-amber-400',
  Rust: 'bg-orange-500',
  Go: 'bg-cyan-400',
  'C++': 'bg-pink-400',
  Java: 'bg-red-400',
  Jupyter: 'bg-orange-400',
  Shell: 'bg-green-400',
  Ruby: 'bg-red-500',
};

function createdAgo(dateStr: string): string {
  const days = Math.floor((Date.now() - new Date(dateStr).getTime()) / 86400000);
  if (days === 0) return 'Created today';
  if (days === 1) return 'Created yesterday';
  return `Created ${days}d ago`;
}

export default function TrendingRepoList() {
  const [repos, setRepos] = useState<TrendingRepo[]>([]);
  const [loading, setLoading] = useState(true);
  const [filterLang, setFilterLang] = useState<string>('All');

  useEffect(() => {
    async function fetchRepos() {
      try {
        const res = await fetch('https://tensorfeed.ai/api/trending-repos?limit=50');
        if (res.ok) {
          const data = await res.json();
          if (data.ok && data.repos) setRepos(data.repos);
        }
      } catch {}
      setLoading(false);
    }
    fetchRepos();
  }, []);

  const languages = ['All', ...Array.from(new Set(repos.map(r => r.language).filter(Boolean)))];
  const filtered = filterLang === 'All' ? repos : repos.filter(r => r.language === filterLang);

  return (
    <>
      {/* Language filter */}
      <div className="flex flex-wrap gap-2 mb-6">
        {languages.map(lang => (
          <button
            key={lang}
            onClick={() => setFilterLang(lang)}
            className={`px-3 py-1 rounded-full text-xs font-medium transition-colors ${
              filterLang === lang
                ? 'bg-accent-primary text-white'
                : 'bg-bg-secondary text-text-muted border border-border hover:text-text-primary'
            }`}
          >
            {lang}
          </button>
        ))}
      </div>

      {loading && (
        <div className="space-y-3">
          {Array.from({ length: 8 }).map((_, i) => (
            <div key={i} className="bg-bg-secondary rounded-lg border border-border p-5 animate-pulse">
              <div className="h-4 bg-bg-tertiary rounded w-1/3 mb-2" />
              <div className="h-3 bg-bg-tertiary rounded w-2/3 mb-3" />
              <div className="h-3 bg-bg-tertiary rounded w-1/4" />
            </div>
          ))}
        </div>
      )}

      {!loading && filtered.length === 0 && (
        <div className="text-center py-16">
          <GitBranch className="w-10 h-10 text-text-muted mx-auto mb-3" />
          <p className="text-text-muted">No trending repos available yet. Check back soon.</p>
        </div>
      )}

      <div className="space-y-3">
        {filtered.map((repo, idx) => (
          <a
            key={repo.name}
            href={repo.url}
            target="_blank"
            rel="noopener noreferrer"
            className="block bg-bg-secondary border border-border rounded-lg p-5 hover:border-accent-primary transition-colors group"
          >
            <div className="flex items-start gap-3">
              <span className="text-text-muted font-mono text-sm w-6 shrink-0 pt-0.5 text-right">
                {idx + 1}
              </span>
              <div className="flex-1 min-w-0">
                <h2 className="text-accent-primary font-semibold text-sm group-hover:text-accent-cyan transition-colors flex items-center gap-1.5">
                  {repo.name}
                  <ExternalLink className="w-3 h-3 opacity-0 group-hover:opacity-100 transition-opacity" />
                </h2>
                {repo.description && (
                  <p className="text-text-secondary text-xs mt-1 leading-relaxed">{repo.description}</p>
                )}
                <div className="flex flex-wrap items-center gap-3 mt-2 text-xs text-text-muted">
                  {repo.language && (
                    <span className="flex items-center gap-1.5">
                      <span className={`w-2.5 h-2.5 rounded-full ${LANG_COLORS[repo.language] || 'bg-gray-400'}`} />
                      {repo.language}
                    </span>
                  )}
                  <span className="flex items-center gap-1">
                    <Star className="w-3 h-3" />
                    {repo.stars.toLocaleString()}
                  </span>
                  {repo.forks > 0 && (
                    <span className="flex items-center gap-1">
                      <GitFork className="w-3 h-3" />
                      {repo.forks.toLocaleString()}
                    </span>
                  )}
                  {repo.createdAt && (
                    <span>{createdAgo(repo.createdAt)}</span>
                  )}
                </div>
                {repo.topics?.length > 0 && (
                  <div className="flex flex-wrap gap-1.5 mt-2">
                    {repo.topics.slice(0, 5).map(topic => (
                      <span
                        key={topic}
                        className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-bg-tertiary text-accent-cyan"
                      >
                        {topic}
                      </span>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </a>
        ))}
      </div>
    </>
  );
}
