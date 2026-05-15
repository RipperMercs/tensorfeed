'use client';

import Link from 'next/link';
import { AuthorRow } from './useResearchData';
import { categoryForSeed } from './categories';

/**
 * Authors leaderboard panel per facelift spec. Replaces the old vanilla
 * table with:
 *   - panel head: icon + title + "365d" sublabel + "View all" link
 *   - rank cell with mono badge styling
 *   - name + primary affiliation + 1-2 category pills (derived from
 *     openalex_id seed since the API row doesn't carry category tagging)
 *   - right-aligned AI works count + h-index horizontal bar with the
 *     numeric value alongside
 */

interface Props {
  authors: AuthorRow[] | null;
  href?: string;
}

export default function AuthorsPanel({ authors, href = '/research/authors' }: Props) {
  if (!authors) {
    return (
      <div className="bg-bg-secondary border border-border rounded-lg p-5 animate-pulse h-80" />
    );
  }
  const maxH = Math.max(1, ...authors.map((a) => a.h_index ?? 0));
  return (
    <section
      aria-labelledby="tf-authors-h"
      className="bg-bg-secondary border border-border rounded-lg overflow-hidden"
    >
      <header className="flex items-center justify-between gap-3 px-4 py-3 border-b border-border">
        <h3 id="tf-authors-h" className="flex items-center gap-2 text-sm font-semibold text-text-primary">
          <span
            className="inline-flex items-center justify-center w-6 h-6 rounded border"
            style={{
              background: 'rgba(99,102,241,0.12)',
              color: '#a5b4fc',
              borderColor: 'rgba(99,102,241,0.25)',
            }}
            aria-hidden="true"
          >
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2">
              <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" />
              <circle cx="9" cy="7" r="4" />
              <path d="M22 21v-2a4 4 0 0 0-3-3.87" />
              <path d="M16 3.13a4 4 0 0 1 0 7.75" />
            </svg>
          </span>
          Top AI Authors
          <span className="text-[11px] font-mono text-text-muted tracking-[0.05em] ml-0.5">365d</span>
        </h3>
        <Link
          href={href}
          className="text-xs font-mono text-text-muted hover:text-accent-primary transition-colors"
        >
          View all →
        </Link>
      </header>
      <table className="w-full text-sm">
        <thead className="bg-bg-tertiary/40 text-text-muted">
          <tr>
            <th className="px-3 py-2 text-left font-mono text-[10px] uppercase tracking-wider w-8">#</th>
            <th className="px-3 py-2 text-left font-mono text-[10px] uppercase tracking-wider">Author</th>
            <th className="px-3 py-2 text-right font-mono text-[10px] uppercase tracking-wider">AI Works</th>
            <th className="px-3 py-2 text-right font-mono text-[10px] uppercase tracking-wider w-[120px]">H-index</th>
          </tr>
        </thead>
        <tbody>
          {authors.map((a) => {
            const cat = categoryForSeed(a.openalex_id);
            const h = a.h_index ?? 0;
            const fillPct = Math.max(2, (h / maxH) * 100);
            return (
              <tr key={a.openalex_id} className="border-t border-border hover:bg-bg-tertiary/40 transition-colors">
                <td className="px-3 py-2 font-mono text-text-muted text-xs tabular-nums align-top pt-3">{a.rank}</td>
                <td className="px-3 py-2 align-top">
                  <div className="text-text-primary font-medium text-sm">{a.display_name}</div>
                  {a.primary_affiliation.display_name && (
                    <div className="text-[10px] font-mono text-text-muted truncate max-w-[220px] mt-0.5">
                      {a.primary_affiliation.display_name}
                    </div>
                  )}
                  <div className="mt-1.5">
                    <span
                      className="inline-block text-[9px] font-mono uppercase tracking-[0.1em] px-1.5 py-0.5 rounded border"
                      style={{ background: cat.tint, color: cat.color, borderColor: cat.tint }}
                    >
                      {cat.short}
                    </span>
                  </div>
                </td>
                <td className="px-3 py-2 text-right font-mono text-text-primary text-sm tabular-nums align-top pt-3">
                  {a.ai_works_last_year.toLocaleString()}
                </td>
                <td className="px-3 py-2 align-top pt-3">
                  {h > 0 ? (
                    <div className="flex items-center gap-2 justify-end">
                      <div className="flex-1 h-1.5 bg-bg-tertiary rounded-full overflow-hidden max-w-[60px]">
                        <div
                          className="h-full rounded-full"
                          style={{
                            width: `${fillPct}%`,
                            background: 'linear-gradient(90deg, #6366f1, #06b6d4)',
                            boxShadow: '0 0 6px rgba(99,102,241,0.4)',
                          }}
                        />
                      </div>
                      <span className="font-mono text-text-secondary text-xs tabular-nums w-8 text-right">{h}</span>
                    </div>
                  ) : (
                    <span className="font-mono text-text-muted text-xs">—</span>
                  )}
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </section>
  );
}
