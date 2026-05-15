import { Microscope } from 'lucide-react';

/**
 * Shared hero block for /research and its sub-pages. Consistent visual
 * identity across the hub: header tag chip, big title, accent-lined subtitle.
 */
export default function ResearchHero({
  tag = '/ RESEARCH',
  title,
  subtitle,
}: {
  tag?: string;
  title: string;
  subtitle?: string;
}) {
  return (
    <header className="mb-10">
      <div className="flex items-center gap-3 mb-3">
        <Microscope className="w-7 h-7 text-accent-primary" />
        <span
          className="inline-flex items-center gap-2 px-3 py-1 text-[10px] font-mono font-semibold tracking-[0.18em] uppercase rounded border border-border bg-bg-secondary text-text-muted"
        >
          {tag}
        </span>
      </div>
      <h1 className="text-3xl sm:text-4xl font-bold text-text-primary tracking-tight mb-2">
        {title}
      </h1>
      {subtitle && (
        <p className="text-text-secondary text-base sm:text-lg max-w-3xl">{subtitle}</p>
      )}
    </header>
  );
}
