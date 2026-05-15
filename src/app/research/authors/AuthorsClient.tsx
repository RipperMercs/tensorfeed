'use client';

import { useMemo, useState } from 'react';
import { ExternalLink } from 'lucide-react';
import ResearchHero from '@/components/research/ResearchHero';
import ResearchSubNav from '@/components/research/ResearchSubNav';
import { useAuthors } from '@/components/research/useResearchData';

type SortKey = 'rank' | 'ai_works' | 'h_index' | 'cited_by' | 'ai_share';

export default function AuthorsClient() {
  const authors = useAuthors(100);
  const [sortKey, setSortKey] = useState<SortKey>('rank');

  const sorted = useMemo(() => {
    if (!authors) return null;
    const out = [...authors];
    switch (sortKey) {
      case 'ai_works':
        out.sort((a, b) => b.ai_works_last_year - a.ai_works_last_year);
        break;
      case 'h_index':
        out.sort((a, b) => (b.h_index ?? -1) - (a.h_index ?? -1));
        break;
      case 'cited_by':
        out.sort((a, b) => (b.cited_by_count ?? -1) - (a.cited_by_count ?? -1));
        break;
      case 'ai_share':
        out.sort((a, b) => (b.ai_share_pct ?? -1) - (a.ai_share_pct ?? -1));
        break;
      default:
        out.sort((a, b) => a.rank - b.rank);
    }
    return out;
  }, [authors, sortKey]);

  function SortHeader({ k, label, align = 'right' }: { k: SortKey; label: string; align?: 'left' | 'right' }) {
    return (
      <th
        className={`px-3 py-2.5 font-mono text-[10px] uppercase tracking-wider cursor-pointer hover:text-text-primary transition-colors ${
          align === 'left' ? 'text-left' : 'text-right'
        } ${sortKey === k ? 'text-accent-cyan' : 'text-text-muted'}`}
        onClick={() => setSortKey(k)}
        aria-sort={sortKey === k ? 'descending' : 'none'}
      >
        {label} {sortKey === k && '▼'}
      </th>
    );
  }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <ResearchHero
        tag="/ RESEARCH / AUTHORS"
        title="Top AI Researchers Leaderboard"
        subtitle="Top 100 AI authors ranked by AI publication volume in the trailing 365 days. Source: OpenAlex (CC0). Daily refresh."
      />
      <ResearchSubNav />

      {!sorted ? (
        <div className="bg-bg-secondary border border-border rounded-lg h-96 animate-pulse" />
      ) : sorted.length === 0 ? (
        <p className="text-text-muted font-mono text-sm">Author leaderboard not yet refreshed. Cron runs daily.</p>
      ) : (
        <div className="bg-bg-secondary border border-border rounded-lg overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-bg-tertiary">
              <tr>
                <SortHeader k="rank" label="Rank" align="left" />
                <th className="px-3 py-2.5 text-left font-mono text-[10px] uppercase tracking-wider text-text-muted">Author</th>
                <th className="px-3 py-2.5 text-left font-mono text-[10px] uppercase tracking-wider text-text-muted">Affiliation</th>
                <SortHeader k="ai_works" label="AI works" />
                <SortHeader k="h_index" label="h-index" />
                <SortHeader k="cited_by" label="Citations" />
                <SortHeader k="ai_share" label="AI %" />
                <th className="px-3 py-2.5 text-right font-mono text-[10px] uppercase tracking-wider text-text-muted">Profile</th>
              </tr>
            </thead>
            <tbody>
              {sorted.map((a) => (
                <tr key={a.openalex_id} className="border-t border-border hover:bg-bg-tertiary/50 transition-colors">
                  <td className="px-3 py-3 font-mono text-text-muted text-xs">#{a.rank}</td>
                  <td className="px-3 py-3">
                    <div className="text-text-primary font-medium text-sm">{a.display_name}</div>
                    {a.orcid && (
                      <a
                        href={a.orcid.startsWith('http') ? a.orcid : `https://orcid.org/${a.orcid}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-[10px] font-mono text-text-muted hover:text-accent-cyan"
                      >
                        {a.orcid.replace('https://orcid.org/', '')}
                      </a>
                    )}
                  </td>
                  <td className="px-3 py-3 text-sm text-text-secondary">
                    {a.primary_affiliation.display_name ?? <span className="text-text-muted">—</span>}
                    {a.primary_affiliation.country_code && (
                      <span className="ml-2 text-[10px] font-mono text-text-muted">
                        {a.primary_affiliation.country_code}
                      </span>
                    )}
                  </td>
                  <td className="px-3 py-3 text-right font-mono text-text-primary text-sm tabular-nums">
                    {a.ai_works_last_year}
                  </td>
                  <td className="px-3 py-3 text-right font-mono text-text-secondary text-sm tabular-nums">
                    {a.h_index ?? '—'}
                  </td>
                  <td className="px-3 py-3 text-right font-mono text-text-secondary text-sm tabular-nums">
                    {a.cited_by_count != null ? a.cited_by_count.toLocaleString() : '—'}
                  </td>
                  <td className="px-3 py-3 text-right font-mono text-text-secondary text-sm tabular-nums">
                    {a.ai_share_pct != null ? `${a.ai_share_pct.toFixed(0)}%` : '—'}
                  </td>
                  <td className="px-3 py-3 text-right">
                    <a
                      href={`https://openalex.org/${a.openalex_id}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1 text-xs font-mono text-text-muted hover:text-accent-cyan"
                    >
                      OpenAlex <ExternalLink className="w-3 h-3" />
                    </a>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <p className="mt-6 text-xs font-mono text-text-muted">
        Click any column header to re-sort. Source: OpenAlex (CC0 1.0). TF filters to the AI concept (C154945302) and enriches with affiliation + summary stats.
      </p>
    </div>
  );
}
