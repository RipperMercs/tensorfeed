'use client';

import Link from 'next/link';
import Image from 'next/image';
import { ArrowRight, ExternalLink, TrendingUp, Sparkles, Award, Microscope } from 'lucide-react';
import ResearchSubNav from '@/components/research/ResearchSubNav';
import {
  useArxivLatest,
  useMilestones,
  useAuthors,
  useCitationVelocity,
  useEmergingKeywords,
  useInstitutions,
} from '@/components/research/useResearchData';
import {
  categoryForSubfield,
  categoryForSeed,
} from '@/components/research/categories';
import BackgroundParticles from '@/components/research/BackgroundParticles';
import HeroConstellation from '@/components/research/HeroConstellation';
import KnowledgeLandscape from '@/components/research/KnowledgeLandscape';
import AuthorsPanel from '@/components/research/AuthorsPanel';
import InstitutionsPanel from '@/components/research/InstitutionsPanel';
import Firehose from '@/components/research/Firehose';
import { useResearchTweaks } from '@/components/research/useResearchTweaks';

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
          className="inline-flex items-center gap-1 text-sm font-mono text-text-muted hover:text-accent-cyan transition-colors"
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

export default function ResearchHubClient() {
  const arxiv = useArxivLatest(9);
  const milestones = useMilestones(6);
  const authors = useAuthors(10);
  const velocity = useCitationVelocity(6);
  const keywords = useEmergingKeywords(24);
  const institutions = useInstitutions(8);
  const tweaks = useResearchTweaks();

  return (
    <div
      className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 relative"
      style={tweaks.paletteFilter ? { filter: tweaks.paletteFilter } : undefined}
    >
      {/* Background canvas particle field, fixed to viewport, behind all
          content. Decorative. Auto-disabled under prefers-reduced-motion
          or ?bg=off. */}
      {tweaks.bg && <BackgroundParticles count={140} connections={true} flow="drift" />}

      {/*
        Hero with photo background. Cinematic dim atrium library with
        shelves of softly-glowing holographic research papers in pastel
        tints (light blue, gold, lavender, mint, rose, coral). Foreground
        floating papers + faint cyan grid floor. 2400px WebP, ~205KB.
        Generated via nano-banana per spec at Desktop/nano-banana-research
        -hub-hero.md, 2026-05-14.
      */}
      <section className="relative isolate overflow-hidden rounded-xl border border-bg-tertiary mb-10 px-6 sm:px-8 py-12 sm:py-16">
        <Image
          src="/research-hero.webp"
          alt=""
          aria-hidden="true"
          fill
          priority
          sizes="(max-width: 768px) 100vw, 1280px"
          className="object-cover -z-20"
        />
        <div
          aria-hidden="true"
          className="absolute inset-0 -z-10"
          style={{
            background:
              'linear-gradient(to bottom, rgba(2,6,23,0.5) 0%, rgba(2,6,23,0.82) 100%)',
          }}
        />
        <div
          aria-hidden="true"
          className="absolute inset-0 -z-10 opacity-[0.035]"
          style={{
            backgroundImage: [
              'linear-gradient(rgba(255,255,255,0.6) 1px, transparent 1px)',
              'linear-gradient(90deg, rgba(255,255,255,0.6) 1px, transparent 1px)',
            ].join(', '),
            backgroundSize: '48px 48px',
          }}
        />
        {/* Constellation overlay: breathing category-colored nodes drift
            over the photo's dimmed atmosphere. Sits between the gradient
            (-z-10) and the text content. Pointer-events none, mix-blend
            screen so colors brighten the dark backdrop rather than wash
            it out. */}
        <div
          aria-hidden="true"
          className="absolute inset-0 -z-10 pointer-events-none"
          style={{ mixBlendMode: 'screen', opacity: 0.55 }}
        >
          <HeroConstellation motion={tweaks.motion} />
        </div>

        <div className="max-w-4xl">
          <div className="flex items-center gap-3 mb-3">
            <div className="p-2 rounded-lg bg-accent-primary/15 backdrop-blur-sm">
              <Microscope className="w-6 h-6 sm:w-7 sm:h-7 text-accent-primary" />
            </div>
            <span className="inline-flex items-center px-3 py-1 text-[10px] font-mono font-semibold tracking-[0.18em] uppercase rounded border border-white/15 bg-black/30 backdrop-blur-sm text-white/80">
              / RESEARCH
            </span>
          </div>
          <h1 className="text-3xl sm:text-4xl lg:text-5xl font-bold text-white drop-shadow-md tracking-tight mb-3">
            AI Research Hub
          </h1>
          <p className="text-white/85 leading-relaxed drop-shadow text-sm sm:text-base max-w-3xl">
            Live AI research signal pulled from arXiv, OpenAlex, and the TensorFeed extraction pipeline. Milestone papers flagged by an offline pass. Top authors ranked by 365-day output. Papers gaining citations fastest right now. Emerging keyphrases. The daily arXiv firehose.
          </p>
          <p className="text-white/65 leading-relaxed drop-shadow text-xs sm:text-sm mt-3 max-w-3xl">
            Every signal here is also served as a machine-readable API endpoint for AI agents. One product surfaced two ways: a human-readable library + a paid agent feed.
          </p>
        </div>
      </section>
      <ResearchSubNav />

      {/* Milestone papers, highest signal section, leads */}
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
              const cat = categoryForSubfield(p.subfield_tag);
              return (
              <a
                key={p.arxiv_id}
                href={`https://arxiv.org/abs/${p.arxiv_id}`}
                target="_blank"
                rel="noopener noreferrer"
                className="group block bg-bg-secondary border border-border rounded-lg p-5 hover:border-accent-cyan transition-colors"
                style={{ borderTop: `2px solid ${cat.color}`, boxShadow: `0 0 0 0 ${cat.glow}`, transition: 'box-shadow 0.2s, border-color 0.2s' }}
              >
                <div className="flex items-start justify-between gap-3 mb-2">
                  <span
                    className="text-[10px] font-mono uppercase tracking-wider px-2 py-0.5 rounded border border-border"
                    style={{ background: cat.tint, color: cat.color, borderColor: cat.tint }}
                    title={cat.name}
                  >
                    {p.subfield_tag}
                  </span>
                  <span className="text-[10px] font-mono text-text-muted">{p.date}</span>
                </div>
                <h3 className="text-base font-semibold text-text-primary group-hover:text-accent-cyan transition-colors mb-2 leading-snug">
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

      {/* Knowledge landscape: 3×3 cluster grid showing 90 days of papers
          across the 9 visual categories with cross-cluster flow lines on
          their own slow cycle. Decorative + orientational. */}
      <section className="mb-12">
        <KnowledgeLandscape motion={tweaks.motion} />
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
              const cat = categoryForSeed(v.openalex_id);
              return (
              <a
                key={v.openalex_id}
                href={v.landing_page_url ?? (v.doi ? `https://doi.org/${v.doi}` : `https://openalex.org/${v.openalex_id}`)}
                target="_blank"
                rel="noopener noreferrer"
                className="group block bg-bg-secondary border border-border rounded-lg p-4 hover:border-accent-cyan transition-colors"
                style={{ borderTop: `2px solid ${cat.color}` }}
              >
                <div className="flex items-center justify-between mb-2">
                  <span className="text-[10px] font-mono text-text-muted">#{v.rank} · {v.publication_year}</span>
                </div>
                <h3 className="text-sm font-semibold text-text-primary group-hover:text-accent-cyan transition-colors mb-2 leading-snug line-clamp-2">
                  {v.title}
                </h3>
                <div className="flex items-center justify-between text-[11px] font-mono text-text-muted">
                  <span>
                    <span className="text-accent-green tabular-nums">{v.citations_latest_year.toLocaleString()}</span>
                    <span className="ml-1">cites this year</span>
                  </span>
                  {v.venue && <span className="truncate ml-2">{v.venue}</span>}
                </div>
              </a>
              );
            })}
          </div>
        )}
      </section>

      {/* Two-column: Authors + Institutions panels (redesigned with
          category pills + h-index bars + cyan/green works gradient). */}
      <section className="mb-12 grid gap-6 lg:grid-cols-2">
        <AuthorsPanel authors={authors} />
        <InstitutionsPanel institutions={institutions} />
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
                const cat = categoryForSeed(k.keyword);
                return (
                  <a
                    key={k.keyword}
                    href={`https://arxiv.org/search/?query=${encodeURIComponent(k.keyword)}&searchtype=all`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full border transition-colors"
                    style={{
                      fontSize: `${size}rem`,
                      borderColor: cat.tint,
                      background: cat.tint,
                      color: cat.color,
                    }}
                  >
                    <span className="font-mono">{k.keyword}</span>
                    <span className="text-[10px] font-mono opacity-70 tabular-nums">
                      {k.lift.toFixed(1)}×
                    </span>
                  </a>
                );
              })}
            </div>
          </div>
        )}
      </section>

      {/* arXiv Firehose: live streaming log of new papers, color-coded by
          category, newest paper glow-highlighted. Replaces the old
          3-up card grid per facelift spec. */}
      <section className="mb-12">
        <Firehose papers={arxiv} />
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
