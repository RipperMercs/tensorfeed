import Link from 'next/link';
import { ArrowRight, Code2 } from 'lucide-react';

/**
 * "You can embed this" callout for the bottom of /status. Anyone on the
 * status page is exactly the person who would put a live AI status
 * board on their own site, so this is the highest-intent placement to
 * funnel TF's own traffic into the embed flywheel. Self-contained,
 * design-token styled, one component so the touch to status/page.tsx
 * stays a single line (low collision with parallel work on that page).
 */
export default function EmbedCallout() {
  return (
    <section
      aria-labelledby="embed-callout-heading"
      className="mt-10 rounded-xl border border-bg-tertiary p-6 sm:p-8 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-5"
      style={{ background: 'var(--bg-secondary)' }}
    >
      <div className="flex items-start gap-4">
        <div className="p-2 rounded-lg bg-accent-primary/15 shrink-0">
          <Code2 className="w-6 h-6 text-accent-primary" />
        </div>
        <div>
          <h2 id="embed-callout-heading" className="text-lg font-bold text-text-primary mb-1">
            Put this live status board on your own site
          </h2>
          <p className="text-sm text-text-secondary leading-relaxed max-w-xl">
            The exact data you are looking at, free and embeddable. One line of HTML, no API key,
            no tracking. Or install the zero-dependency component:{' '}
            <code className="text-text-primary">npm i @tensorfeed/status-widget</code>.
          </p>
        </div>
      </div>
      <Link
        href="/embed?utm_source=status&utm_medium=callout"
        className="inline-flex items-center gap-2 px-5 py-2.5 rounded-lg font-medium text-sm whitespace-nowrap text-white self-start sm:self-auto"
        style={{ background: 'var(--accent-primary)' }}
      >
        Embed the widget <ArrowRight className="w-4 h-4" />
      </Link>
    </section>
  );
}
