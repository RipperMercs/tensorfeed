'use client';

import Link from 'next/link';
import { InstitutionRow } from './useResearchData';
import { categoryForSeed } from './categories';

/**
 * Institutions leaderboard panel per facelift spec. Mirror of
 * AuthorsPanel structure with a cyan-tinted icon and a single AI-works
 * bar in place of the h-index bar.
 */

interface Props {
  institutions: InstitutionRow[] | null;
  href?: string;
}

export default function InstitutionsPanel({ institutions, href = '/research/institutions' }: Props) {
  if (!institutions) {
    return (
      <div className="bg-bg-secondary border border-border rounded-lg p-5 animate-pulse h-80" />
    );
  }
  const maxW = Math.max(1, ...institutions.map((i) => i.ai_works_last_year));
  return (
    <section
      aria-labelledby="tf-institutions-h"
      className="bg-bg-secondary border border-border rounded-lg overflow-hidden"
    >
      <header className="flex items-center justify-between gap-3 px-4 py-3 border-b border-border">
        <h3 id="tf-institutions-h" className="flex items-center gap-2 text-sm font-semibold text-text-primary">
          <span
            className="inline-flex items-center justify-center w-6 h-6 rounded border"
            style={{
              background: 'rgba(6,182,212,0.12)',
              color: '#67e8f9',
              borderColor: 'rgba(6,182,212,0.25)',
            }}
            aria-hidden="true"
          >
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2">
              <path d="M3 21h18M5 21V8l7-4 7 4v13M9 12h2M13 12h2M9 16h2M13 16h2" />
            </svg>
          </span>
          Top Institutions
          <span className="text-[11px] font-mono text-text-muted tracking-[0.05em] ml-0.5">365d</span>
        </h3>
        <Link
          href={href}
          className="text-xs font-mono text-text-muted hover:text-accent-cyan transition-colors"
        >
          View all →
        </Link>
      </header>
      <table className="w-full text-sm">
        <thead className="bg-bg-tertiary/40 text-text-muted">
          <tr>
            <th className="px-3 py-2 text-left font-mono text-[10px] uppercase tracking-wider w-8">#</th>
            <th className="px-3 py-2 text-left font-mono text-[10px] uppercase tracking-wider">Institution</th>
            <th className="px-3 py-2 text-right font-mono text-[10px] uppercase tracking-wider w-[160px]">AI Works</th>
          </tr>
        </thead>
        <tbody>
          {institutions.map((inst) => {
            const cat = categoryForSeed(inst.openalex_id);
            const fillPct = Math.max(8, (inst.ai_works_last_year / maxW) * 100);
            return (
              <tr key={inst.openalex_id} className="border-t border-border hover:bg-bg-tertiary/40 transition-colors">
                <td className="px-3 py-2 font-mono text-text-muted text-xs tabular-nums align-top pt-3">{inst.rank}</td>
                <td className="px-3 py-2 align-top">
                  <div className="text-text-primary font-medium text-sm">{inst.display_name}</div>
                  <div className="text-[10px] font-mono text-text-muted mt-0.5">
                    {[inst.country_code, inst.type].filter(Boolean).join(' · ') || '—'}
                  </div>
                  <div className="mt-1.5">
                    <span
                      className="inline-block text-[9px] font-mono uppercase tracking-[0.1em] px-1.5 py-0.5 rounded border"
                      style={{ background: cat.tint, color: cat.color, borderColor: cat.tint }}
                    >
                      {cat.short}
                    </span>
                  </div>
                </td>
                <td className="px-3 py-2 align-top pt-3">
                  <div className="flex items-center gap-2 justify-end">
                    <div className="flex-1 h-1.5 bg-bg-tertiary rounded-full overflow-hidden max-w-[70px]">
                      <div
                        className="h-full rounded-full"
                        style={{
                          width: `${fillPct}%`,
                          background: 'linear-gradient(90deg, #06b6d4, #10b981)',
                          boxShadow: '0 0 6px rgba(6,182,212,0.4)',
                        }}
                      />
                    </div>
                    <span className="font-mono text-text-primary text-xs tabular-nums w-14 text-right">
                      {inst.ai_works_last_year.toLocaleString()}
                    </span>
                  </div>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </section>
  );
}
