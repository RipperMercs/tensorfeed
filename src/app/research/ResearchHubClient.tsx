'use client';

import Link from 'next/link';
import { ArrowRight, ExternalLink, TrendingUp, FileText, Users, Sparkles, Building2, Award } from 'lucide-react';
import ResearchHero from '@/components/research/ResearchHero';
import ResearchSubNav from '@/components/research/ResearchSubNav';
import {
  useArxivLatest,
  useMilestones,
  useAuthors,
  useCitationVelocity,
  useEmergingKeywords,
  useInstitutions,
  paperAccent,
} from '@/components/research/useResearchData';

function SectionHeader({
  icon: Icon,
  title,
  href,
  ctaLabel = 'View all',
}: {
  icon: React.ComponentType<{ className?: string }>;
  title: string;
  href?: string;
  ctaLabel?: string;
}) {
  return (
    <div className="flex items-center justify-between mb-4">
      <div className="flex items-center gap-2">
        <Icon className="w-5 h-5 text-accent-primary" />
        <h2 className="text-xl font-semibold text-text-primary">{title}</h2>
      </div>
      {href && (
        <Link
          href={href}
          className="inline-flex items-center gap-1 text-sm font-mono text-text-muted hover:text-accent-primary transition-colors"
        >
          {ctaLabel} <ArrowRight className="w-3.5 h-3.5" />
        </Link>
      )}
    </div>
  );
}

function SkeletonGrid({ count = 6 }: { count?: number }) {
  return (
    <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3 animate-pulse">
      {Array.from({ length: count }).map((_, i) => (
        <div key={i} className="bg-bg-secondary border border-border rounded-lg p-5 h-32" />
      ))}
    </div>
  );
}

function shortAbstract(s: string | null, max = 200): string {
  if (!s) return '';
  if (s.length <= max) return s;
  return s.slice(0, max - 1).trimEnd() + '…';
}

export default function ResearchHubClient() {
  const arxiv = useArxivLatest(9);
  const milestones = useMilestones(6);
  const authors = useAuthors(10);
  const velocity = useCitationVelocity(6);
  const keywords = useEmergingKeywords(24);
  const institutions = useInstitutions(8);

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <ResearchHero
        title="AI Research Hub"
        subtitle="Live AI research signal: milestone papers, top authors, citation velocity, emerging topics, and the daily arXiv firehose. Pulled from the TensorFeed extraction pipeline."
      />
      <ResearchSubNav />

      {/* Milestone papers — highest signal section, leads */}
      <section className="mb-12">
        <SectionHeader icon={Award} title="Milestone Papers (Last 30 Days)" href="/research/milestones" />
        {!milestones ? (
          <SkeletonGrid count={6} />
        ) : milestones.length === 0 ? (
          <p className="text-text-muted text-sm font-mono">
            No milestone candidates flagged in the current window. Refreshed weekly from the offline extraction pipeline.
          </p>
        ) : (
          <div className="grid gap-4 sm:grid-cols-2">
            {milestones.map((p) => {
              const accent = paperAccent(p.subfield_tag || p.arxiv_id);
              return (
              <a
                key={p.arxiv_id}
                href={`https://arxiv.org/abs/${p.arxiv_id}`}
                target="_blank"
                rel="noopener noreferrer"
                className="group block bg-bg-secondary border border-border rounded-lg p-5 hover:border-accent-primary transition-colors"
                style={{ borderTop: `2px solid ${accent.color}` }}
              >
                <div className="flex items-start justify-between gap-3 mb-2">
                  <span
                    className="text-[10px] font-mono uppercase tracking-wider px-2 py-0.5 rounded border border-border"
                    style={{ background: accent.bgTint, color: accent.color }}
                  >
                    {p.subfield_tag}
                  </span>
                  <span className="text-[10px] font-mono text-text-muted">{p.date}</span>
                </div>
                <h3 className="text-base font-semibold text-text-primary group-hover:text-accent-primary transition-colors mb-2 leading-snug">
                  {p.title}
                </h3>
                <p className="text-xs text-text-muted leading-relaxed mb-2">
                  <span className="text-text-secondary font-medium">Why flagged:</span> {p.milestone_reasoning}
                </p>
                {p.affiliations && p.affiliations.length > 0 && (
                  <p className="text-[11px] font-mono text-text-muted truncate">
                    {p.affiliations.slice(0, 3).join(' · ')}
                  </p>
                )}
              </a>
              );
            })}
          </div>
        )}
      </section>

      {/* Citation velocity */}
      <section className="mb-12">
        <SectionHeader
          icon={TrendingUp}
          title="Citation Velocity Leaders"
          href="/research/citation-velocity"
        />
        {!velocity ? (
          <SkeletonGrid count={6} />
        ) : (
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {velocity.map((v) => {
              const accent = paperAccent(v.openalex_id);
              return (
              <a
                key={v.openalex_id}
                href={v.landing_page_url ?? (v.doi ? `https://doi.org/${v.doi}` : `https://openalex.org/${v.openalex_id}`)}
                target="_blank"
                rel="noopener noreferrer"
                className="group block bg-bg-secondary border border-border rounded-lg p-4 hover:border-accent-primary transition-colors"
                style={{ borderTop: `2px solid ${accent.color}` }}
              >
                <div className="flex items-center justify-between mb-2">
                  <span className="text-[10px] font-mono text-text-muted">#{v.rank} · {v.publication_year}</span>
                  <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-accent-green/10 text-accent-green border border-accent-green/20">
                    {Math.round(v.citations_latest_year_share * 100)}% latest year
                  </span>
                </div>
                <h3 className="text-sm font-semibold text-text-primary group-hover:text-accent-primary transition-colors mb-2 leading-snug line-clamp-2">
                  {v.title}
                </h3>
                <div className="flex items-center justify-between text-[11px] font-mono text-text-muted">
                  <span>{v.cited_by_count.toLocaleString()} total cites</span>
                  {v.venue && <span className="truncate ml-2">{v.venue}</span>}
                </div>
              </a>
              );
            })}
          </div>
        )}
      </section>

      {/* Two-column: Authors + Institutions */}
      <section className="mb-12 grid gap-8 lg:grid-cols-2">
        <div>
          <SectionHeader icon={Users} title="Top AI Authors (365d)" href="/research/authors" />
          {!authors ? (
            <SkeletonGrid count={4} />
          ) : (
            <div className="bg-bg-secondary border border-border rounded-lg overflow-hidden">
              <table className="w-full text-sm">
                <thead className="bg-bg-tertiary text-text-muted">
                  <tr>
                    <th className="px-3 py-2 text-left font-mono text-[10px] uppercase tracking-wider">#</th>
                    <th className="px-3 py-2 text-left font-mono text-[10px] uppercase tracking-wider">Author</th>
                    <th className="px-3 py-2 text-right font-mono text-[10px] uppercase tracking-wider">AI works</th>
                    <th className="px-3 py-2 text-right font-mono text-[10px] uppercase tracking-wider">h-idx</th>
                  </tr>
                </thead>
                <tbody>
                  {authors.map((a) => (
                    <tr key={a.openalex_id} className="border-t border-border hover:bg-bg-tertiary/50 transition-colors">
                      <td className="px-3 py-2 font-mono text-text-muted text-xs">{a.rank}</td>
                      <td className="px-3 py-2">
                        <div className="text-text-primary font-medium text-sm">{a.display_name}</div>
                        {a.primary_affiliation.display_name && (
                          <div className="text-[10px] font-mono text-text-muted truncate max-w-[200px]">
                            {a.primary_affiliation.display_name}
                          </div>
                        )}
                      </td>
                      <td className="px-3 py-2 text-right font-mono text-text-primary text-sm tabular-nums">{a.ai_works_last_year}</td>
                      <td className="px-3 py-2 text-right font-mono text-text-muted text-xs tabular-nums">
                        {a.h_index ?? '—'}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
        <div>
          <SectionHeader icon={Building2} title="Top Institutions (365d)" href="/research/institutions" />
          {!institutions ? (
            <SkeletonGrid count={4} />
          ) : (
            <div className="bg-bg-secondary border border-border rounded-lg overflow-hidden">
              <table className="w-full text-sm">
                <thead className="bg-bg-tertiary text-text-muted">
                  <tr>
                    <th className="px-3 py-2 text-left font-mono text-[10px] uppercase tracking-wider">#</th>
                    <th className="px-3 py-2 text-left font-mono text-[10px] uppercase tracking-wider">Institution</th>
                    <th className="px-3 py-2 text-right font-mono text-[10px] uppercase tracking-wider">AI works</th>
                  </tr>
                </thead>
                <tbody>
                  {institutions.map((i) => (
                    <tr key={i.openalex_id} className="border-t border-border hover:bg-bg-tertiary/50 transition-colors">
                      <td className="px-3 py-2 font-mono text-text-muted text-xs">{i.rank}</td>
                      <td className="px-3 py-2">
                        <div className="text-text-primary font-medium text-sm">{i.display_name}</div>
                        <div className="text-[10px] font-mono text-text-muted">
                          {[i.country_code, i.type].filter(Boolean).join(' · ')}
                        </div>
                      </td>
                      <td className="px-3 py-2 text-right font-mono text-text-primary text-sm tabular-nums">
                        {i.ai_works_last_year.toLocaleString()}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </section>

      {/* Emerging keywords cloud */}
      <section className="mb-12">
        <SectionHeader icon={Sparkles} title="Emerging Keywords" href="/research/topics" ctaLabel="Browse all topics" />
        {!keywords ? (
          <div className="h-32 bg-bg-secondary border border-border rounded-lg animate-pulse" />
        ) : (
          <div className="bg-bg-secondary border border-border rounded-lg p-5">
            <div className="flex flex-wrap gap-2">
              {keywords.map((k) => {
                const size = Math.min(2, 0.8 + Math.log10(k.lift));
                return (
                  <a
                    key={k.keyword}
                    href={`https://arxiv.org/search/?query=${encodeURIComponent(k.keyword)}&searchtype=all`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full border border-border bg-bg-tertiary hover:border-accent-primary hover:text-accent-primary transition-colors"
                    style={{ fontSize: `${size}rem` }}
                  >
                    <span className="font-mono text-text-primary">{k.keyword}</span>
                    <span className="text-[10px] font-mono text-text-muted tabular-nums">
                      {k.lift.toFixed(1)}×
                    </span>
                  </a>
                );
              })}
            </div>
          </div>
        )}
      </section>

      {/* Latest arXiv */}
      <section className="mb-12">
        <SectionHeader icon={FileText} title="Latest arXiv (Last 24h)" href="/research/papers" ctaLabel="Browse all papers" />
        {!arxiv ? (
          <SkeletonGrid count={6} />
        ) : (
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {arxiv.map((p) => {
              const accent = paperAccent(p.primaryCategory || p.arxivId);
              return (
              <a
                key={p.arxivId}
                href={p.htmlUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="group block bg-bg-secondary border border-border rounded-lg p-4 hover:border-accent-primary transition-colors"
                style={{ borderTop: `2px solid ${accent.color}` }}
              >
                <div className="flex items-center justify-between mb-2">
                  {p.primaryCategory && (
                    <span
                      className="text-[10px] font-mono uppercase tracking-wider px-2 py-0.5 rounded border border-border"
                      style={{ background: accent.bgTint, color: accent.color }}
                    >
                      {p.primaryCategory}
                    </span>
                  )}
                  <span className="text-[10px] font-mono text-text-muted">{p.arxivId}</span>
                </div>
                <h3 className="text-sm font-semibold text-text-primary group-hover:text-accent-primary transition-colors mb-2 leading-snug line-clamp-2">
                  {p.title}
                </h3>
                <p className="text-xs text-text-muted leading-relaxed line-clamp-3">
                  {shortAbstract(p.abstract, 220)}
                </p>
                <div className="mt-2 text-[11px] font-mono text-text-muted truncate">
                  {p.authors.slice(0, 3).join(', ')}
                  {p.authors.length > 3 && ` +${p.authors.length - 3}`}
                </div>
              </a>
              );
            })}
          </div>
        )}
      </section>

      <section className="border-t border-border pt-8 mb-4">
        <div className="bg-bg-secondary border border-border rounded-lg p-6">
          <h3 className="text-lg font-semibold text-text-primary mb-2 flex items-center gap-2">
            <ExternalLink className="w-4 h-4 text-accent-primary" />
            This data, agent-ready
          </h3>
          <p className="text-sm text-text-secondary mb-3">
            Every section above is also served as a machine-readable API endpoint for AI agents. One paid call, structured payload, ready for direct ingestion.
          </p>
          <Link
            href="/developers/agent-payments"
            className="inline-flex items-center gap-1 text-sm font-mono text-accent-primary hover:underline"
          >
            View the research API catalog <ArrowRight className="w-3.5 h-3.5" />
          </Link>
        </div>
      </section>
    </div>
  );
}
