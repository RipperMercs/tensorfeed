'use client';

import { AlertTriangle, Clock } from 'lucide-react';

/**
 * Freshness strip for the research snapshot pages. Driven entirely by the
 * snapshot capturedAt date returned by the API, so it tells the truth about
 * how old the data is instead of a hardcoded cadence claim.
 *
 * Renders nothing until capturedAt is known (matches the graceful-fallback
 * pattern used elsewhere in the research hub). Once the snapshot age exceeds
 * staleAfterDays it switches to an amber warning state so visitors and agents
 * can see the data is behind its intended refresh window.
 */
export default function DataAsOf({
  capturedAt,
  cadenceLabel,
  staleAfterDays,
}: {
  capturedAt: string | null;
  cadenceLabel?: string;
  staleAfterDays?: number;
}) {
  if (!capturedAt) return null;

  const captured = new Date(capturedAt);
  if (Number.isNaN(captured.getTime())) return null;

  const ageDays = Math.max(
    0,
    Math.floor((Date.now() - captured.getTime()) / (1000 * 60 * 60 * 24)),
  );
  const isStale = typeof staleAfterDays === 'number' && ageDays > staleAfterDays;

  const prettyDate = captured.toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });

  if (isStale) {
    return (
      <div
        role="status"
        className="mb-6 flex items-start gap-3 rounded-lg border border-amber-500/40 bg-amber-500/10 px-4 py-3"
      >
        <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-amber-400" aria-hidden="true" />
        <div className="font-mono text-xs leading-relaxed text-amber-200">
          <span className="font-semibold">Snapshot is stale.</span> Data as of {prettyDate} ({ageDays} days old).
          {cadenceLabel ? ` This view is ${cadenceLabel} and is overdue for a refresh.` : ''} Treat the figures below as a historical snapshot, not live data.
        </div>
      </div>
    );
  }

  return (
    <div className="mb-6 flex items-center gap-2 text-text-muted">
      <Clock className="h-4 w-4 text-accent-primary" aria-hidden="true" />
      <span className="font-mono text-xs">
        Data as of {prettyDate} ({ageDays} day{ageDays === 1 ? '' : 's'} old)
        {cadenceLabel ? ` from ${cadenceLabel}` : ''}.
      </span>
    </div>
  );
}
