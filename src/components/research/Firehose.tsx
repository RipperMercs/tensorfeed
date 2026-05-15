'use client';

import Link from 'next/link';
import { Activity } from 'lucide-react';
import { ArxivPaper } from './useResearchData';
import { categoryForArxiv } from './categories';

/**
 * arXiv Firehose redesign per facelift spec. Replaces the 3-up card grid
 * with a streaming log layout: each paper is one row colored by category
 * with time / category short / title / authors columns. The newest row
 * gets a glow accent + a tiny green "first" indicator so the eye lands
 * on the most recent paper first.
 *
 * Header carries the live indicator + papers-per-hour rate derived from
 * the snapshot's actual publishedAt timestamps. No setInterval fudging.
 */

interface Props {
  papers: ArxivPaper[] | null;
  href?: string;
}

function formatTime(iso: string | null | undefined): string {
  if (!iso) return '—';
  try {
    const d = new Date(iso);
    if (isNaN(d.getTime())) return '—';
    const hh = String(d.getUTCHours()).padStart(2, '0');
    const mm = String(d.getUTCMinutes()).padStart(2, '0');
    return `${hh}:${mm}`;
  } catch {
    return '—';
  }
}

function rateFromPapers(papers: ArxivPaper[]): number {
  if (papers.length < 2) return papers.length;
  // Estimate papers-per-hour from the timestamps actually present.
  const stamps = papers
    .map((p) => new Date(p.publishedAt).getTime())
    .filter((t) => !isNaN(t))
    .sort((a, b) => b - a);
  if (stamps.length < 2) return stamps.length;
  const spanMs = stamps[0] - stamps[stamps.length - 1];
  if (spanMs <= 0) return stamps.length;
  const hours = spanMs / 3600_000;
  return Math.max(1, Math.round(stamps.length / Math.max(hours, 0.1)));
}

export default function Firehose({ papers, href = '/research/papers' }: Props) {
  if (!papers) {
    return (
      <div className="bg-bg-secondary border border-border rounded-lg p-5 animate-pulse h-80" />
    );
  }
  const rate = rateFromPapers(papers);
  return (
    <section
      aria-labelledby="tf-firehose-h"
      className="bg-bg-secondary border border-border rounded-lg overflow-hidden"
    >
      <header className="flex items-center justify-between gap-3 px-4 py-3 border-b border-border">
        <h3 id="tf-firehose-h" className="flex items-center gap-2 text-sm font-semibold text-text-primary">
          <span
            className="inline-flex items-center justify-center w-6 h-6 rounded border"
            style={{
              background: 'rgba(16,185,129,0.12)',
              color: '#6ee7b7',
              borderColor: 'rgba(16,185,129,0.25)',
            }}
            aria-hidden="true"
          >
            <Activity className="w-3.5 h-3.5" />
          </span>
          Daily arXiv Firehose
          <span className="ml-2 inline-flex items-center gap-1.5">
            <span
              aria-hidden="true"
              className="inline-block w-1.5 h-1.5 rounded-full bg-accent-green animate-pulse"
              style={{ boxShadow: '0 0 8px rgba(16,185,129,0.7)' }}
            />
            <span className="text-[10px] font-mono uppercase tracking-[0.14em] text-accent-green">
              Streaming
            </span>
          </span>
        </h3>
        <div className="flex items-center gap-3">
          <span className="text-[11px] font-mono text-text-muted">
            <strong className="text-text-primary tabular-nums">{rate}</strong>
            <span className="ml-1">/ hour</span>
          </span>
          <Link
            href={href}
            className="text-xs font-mono text-text-muted hover:text-accent-primary transition-colors"
          >
            View all →
          </Link>
        </div>
      </header>
      <div role="log" aria-live="polite" className="divide-y divide-border">
        {papers.map((p, i) => {
          const cat = categoryForArxiv(p.primaryCategory);
          const isFirst = i === 0;
          return (
            <a
              key={p.arxivId}
              href={p.htmlUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="group flex items-baseline gap-3 px-4 py-2.5 hover:bg-bg-tertiary/40 transition-colors"
              style={{
                borderLeft: `2px solid ${cat.color}`,
                background: isFirst ? cat.tint : undefined,
                boxShadow: isFirst ? `inset 0 0 0 1px ${cat.glow}` : undefined,
              }}
            >
              <span className="font-mono text-[10px] tabular-nums text-text-muted w-12 shrink-0">
                {formatTime(p.publishedAt)}
              </span>
              <span
                className="font-mono text-[10px] uppercase tracking-[0.1em] px-1.5 py-0.5 rounded border shrink-0 w-[80px] text-center"
                style={{ background: cat.tint, color: cat.color, borderColor: cat.tint }}
                title={cat.name}
              >
                {cat.short}
              </span>
              <span className="text-sm text-text-primary group-hover:text-accent-primary transition-colors flex-1 truncate">
                {p.title}
              </span>
              <span className="font-mono text-[10px] text-text-muted truncate max-w-[180px] shrink-0 hidden md:inline">
                {p.authors.slice(0, 2).join(', ')}
                {p.authors.length > 2 && ` +${p.authors.length - 2}`}
              </span>
            </a>
          );
        })}
      </div>
      <footer className="px-4 py-2 text-[10px] font-mono text-text-muted border-t border-border">
        Every paper submission from cs.AI, cs.LG, cs.CL, cs.CV and adjacent. Color-coded by visual category.
      </footer>
    </section>
  );
}
